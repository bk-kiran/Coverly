import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import {
  SuggestReassignmentRequest,
  SuggestReassignmentResponse,
  ReassignmentSuggestion,
} from "@/types";
import { computeWorkloadScore } from "@/lib/workload";

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

export async function POST(req: NextRequest) {
  try {
    const { tasksAtRisk, availableMembers, allTasks }: SuggestReassignmentRequest =
      await req.json();

    // Compute workload for each available member
    const memberWorkloads = availableMembers.map((member) => {
      const memberTasks = allTasks.filter((t) => t.assigneeId === member.id);
      const score = computeWorkloadScore(memberTasks);
      const openTaskCount = memberTasks.filter((t) => t.status !== "done").length;
      return { member, score, openTaskCount };
    });

    const memberProfiles = memberWorkloads
      .map(
        ({ member, score, openTaskCount }) =>
          `- ${member.name} (ID: ${member.id})
  Workload Score: ${score}/100${score > 80 ? " ⚠️ OVERLOADED — do not assign" : ""}
  Open Tasks: ${openTaskCount}
  Skills: ${member.skillTags.length > 0 ? member.skillTags.join(", ") : "none listed"}`
      )
      .join("\n");

    const taskDetails = tasksAtRisk
      .map(
        (task) =>
          `- Task ID: ${task.id}
  Title: ${task.title}
  Description: ${task.description}
  Priority: ${task.priority}
  Status: ${task.status}
  Deadline: ${task.deadline}
  Project: ${task.projectTag}
  Skill Required: ${task.skillRequired ?? "none"}
  Notes: ${task.notes ?? "none"}`
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

## Response Format
Return a JSON array ONLY. No explanation, no markdown code fences, no other text — just the raw JSON array.
Each object must have exactly these fields:
{
  "taskId": "<string>",
  "suggestedAssigneeId": "<string>",
  "reasoning": "<string — 1-2 sentences explaining why this person was chosen>",
  "handoffDoc": "<string — 3-5 sentences>",
  "confidenceScore": <number 0-100>
}`;

    const message = await anthropic.messages.create({
      model: "claude-opus-4-6",
      max_tokens: 2048,
      messages: [{ role: "user", content: prompt }],
    });

    const content = message.content[0];
    if (content.type !== "text") {
      return NextResponse.json(
        { error: "Unexpected response format from AI" },
        { status: 500 }
      );
    }

    const raw: Array<{
      taskId: string;
      suggestedAssigneeId: string;
      reasoning: string;
      handoffDoc: string;
      confidenceScore: number;
    }> = JSON.parse(content.text);

    // Enrich each suggestion with the full task and full assignee objects
    const suggestions: ReassignmentSuggestion[] = raw.flatMap((item) => {
      const task = tasksAtRisk.find((t) => t.id === item.taskId);
      const suggestedAssignee = availableMembers.find(
        (m) => m.id === item.suggestedAssigneeId
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
