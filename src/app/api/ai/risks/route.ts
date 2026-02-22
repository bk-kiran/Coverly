import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function POST(req: NextRequest) {
  try {
    const { tasks, members, availability } = await req.json();
    const today = new Date().toISOString().slice(0, 10);

    const prompt = `Analyze this team's tasks and identify risks that need attention. Today is ${today}.

Tasks: ${JSON.stringify(tasks)}
Members: ${JSON.stringify(members)}
Availability: ${JSON.stringify(availability)}

Identify risks like:
- Tasks due within 7 days where assignee has workloadScore > 70
- Tasks due within 7 days where assignee is OOO (availability type="ooo" overlaps with due date)
- Members with 3+ critical priority tasks assigned
- Tasks with status "blocked" (any blocked task is a risk)
- Tasks still "todo" with deadline within 3 days

Only return real risks with clear evidence from the data. Do not fabricate risks.
Return 0 risks if the team looks healthy. Return at most 5 risks.

Return JSON:
{
  "risks": [{
    "type": "ooo_conflict" | "overloaded" | "deadline_risk" | "blocked" | "no_activity",
    "severity": "critical" | "high" | "medium",
    "taskId": "<the task _id string>",
    "taskTitle": "<task title>",
    "memberId": "<assignee _id string>",
    "memberName": "<assignee name>",
    "description": "<concise 1-sentence description of the specific risk>",
    "suggestedAction": "<what the manager should do to resolve this>"
  }]
}`;

    const completion = await client.chat.completions.create({
      model: "gpt-4o",
      messages: [{ role: "user", content: prompt }],
      max_tokens: 1024,
      response_format: { type: "json_object" },
    });

    const text = completion.choices[0].message.content ?? "{}";
    const parsed = JSON.parse(text);

    return NextResponse.json({ risks: parsed.risks ?? [] });
  } catch (err) {
    console.error("[ai/risks] error:", err);
    return NextResponse.json({ risks: [] });
  }
}
