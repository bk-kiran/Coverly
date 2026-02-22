import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { ConvexHttpClient } from "convex/browser";
import { api } from "../../../../../convex/_generated/api";
import {
  SuggestReassignmentRequest,
  SuggestReassignmentResponse,
  ReassignmentSuggestion,
} from "@/types";
import { computeWorkloadScore } from "@/lib/workload";

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Convex documents expose _id; our local types use id. Handle both.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function getId(obj: any): string {
  return obj._id ?? obj.id ?? "";
}

export async function POST(req: NextRequest) {
  try {
    const { tasksAtRisk, availableMembers, allTasks }: SuggestReassignmentRequest =
      await req.json();

    // Fetch comments for each at-risk task
    const tasksWithComments = await Promise.all(
      tasksAtRisk.map(async (task) => {
        const comments = await convex.query(api.taskComments.getCommentsByTask, {
          taskId: getId(task),
        });
        return {
          ...task,
          comments: comments.map((c) => `${c.userName}: ${c.content}`),
        };
      })
    );

    // Compute workload for each available member
    const memberWorkloads = availableMembers.map((member) => {
      const memberId = getId(member);
      const memberTasks = allTasks.filter((t) => t.assigneeId === memberId);
      const score = computeWorkloadScore(memberTasks);
      const openTaskCount = memberTasks.filter((t) => t.status !== "done").length;
      return { member, memberId, score, openTaskCount };
    });

    const memberProfiles = memberWorkloads
      .map(
        ({ member, memberId, score, openTaskCount }) =>
          `- ${member.name} (ID: ${memberId})
  Workload Score: ${score}/100${score > 80 ? " ⚠️ OVERLOADED — do not assign" : ""}
  Open Tasks: ${openTaskCount}
  Skills: ${member.skillTags.length > 0 ? member.skillTags.join(", ") : "none listed"}`
      )
      .join("\n");

    const taskDetails = tasksWithComments
      .map(
        (task) =>
          `- Task ID: ${getId(task)}
  Title: ${task.title}
  Description: ${task.description}
  Priority: ${task.priority}
  Status: ${task.status}
  Deadline: ${task.deadline}
  Project: ${task.projectTag}
  Skill Required: ${task.skillRequired ?? "none"}
  Notes: ${task.notes ?? "none"}
  Comments from owner:
${task.comments.length > 0 ? task.comments.map((c) => `    • ${c}`).join("\n") : "    (none)"}`
      )
      .join("\n");

    const prompt = `You are an expert team manager AI for a tool called Coverly. Your job is to suggest smart task reassignments when team members become unavailable.

## Available Team Members
${memberProfiles}

## At-Risk Tasks Requiring Reassignment
${taskDetails}

## Assignment Rules
1. NEVER suggest a member with a workload score above 80 — they are overloaded and must be skipped
2. Prefer members whose skill tags match the task's required skill
3. Treat higher priority tasks (critical > high > medium > low) and closer deadlines as more urgent
4. When skills are equal, prefer the member with the lowest workload score
5. If no ideal match exists, pick the least overloaded eligible member and note the skill gap in reasoning

## Handoff Document
Write a 3-5 sentence handoff doc per task that covers:
- What the task is and its goal
- Current status and what has been done so far
- Key context or decisions the new assignee needs to know
- The deadline and how urgent it is
- Any known blockers or risks

Each task may have comments from the original owner providing context. Use these comments to make the handoff doc more specific and useful. Quote relevant comments directly in the handoff doc.

## Response Format
Return a JSON object with a "suggestions" key containing an array. Each item in the array must have exactly these fields:
{
  "taskId": "<string>",
  "suggestedAssigneeId": "<string>",
  "reasoning": "<string — 1-2 sentences explaining why this person was chosen>",
  "handoffDoc": "<string — 3-5 sentences>",
  "confidenceScore": <number 0-100>
}

Example shape: { "suggestions": [ { "taskId": "...", ... } ] }`;

    const completion = await client.chat.completions.create({
      model: "gpt-4o",
      messages: [{ role: "user", content: prompt }],
      max_tokens: 2048,
      response_format: { type: "json_object" },
    });

    const text = completion.choices[0].message.content ?? "";
    const parsed = JSON.parse(text) as {
      suggestions: Array<{
        taskId: string;
        suggestedAssigneeId: string;
        reasoning: string;
        handoffDoc: string;
        confidenceScore: number;
      }>;
    };
    const raw = parsed.suggestions ?? [];

    // Enrich each suggestion with the full task and full assignee objects
    const suggestions: ReassignmentSuggestion[] = raw.flatMap((item) => {
      const task = tasksAtRisk.find((t) => getId(t) === item.taskId);
      const suggestedAssignee = availableMembers.find(
        (m) => getId(m) === item.suggestedAssigneeId
      );
      if (!task || !suggestedAssignee) return [];
      return [{ ...item, task, suggestedAssignee }];
    });

    const response: SuggestReassignmentResponse = { suggestions };
    return NextResponse.json(response);
  } catch (err) {
    console.error("[ai/suggest] error:", err);
    return NextResponse.json(
      { error: "Failed to generate reassignment suggestions" },
      { status: 500 }
    );
  }
}
