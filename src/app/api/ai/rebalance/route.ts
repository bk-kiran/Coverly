import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function POST(req: NextRequest) {
  try {
    const { members, tasks, availability } = await req.json();
    const today = new Date().toISOString().slice(0, 10);

    const prompt = `You are a workload optimization AI for a team management tool called Coverly.
Today is ${today}.

Here is the current team data:
Members: ${JSON.stringify(members, null, 2)}
Tasks: ${JSON.stringify(tasks, null, 2)}
Availability: ${JSON.stringify(availability, null, 2)}

Analyze the team's workload distribution and suggest task reassignments to improve balance.
Focus on:
- Moving tasks from overloaded members (workloadScore > 70) to underloaded ones
- Avoiding members who are OOO based on availability data
- Matching skills when possible (skillRequired vs skillTags)
- Only suggesting moves for incomplete tasks (status !== "done")
- Keeping the number of suggestions reasonable (2-5 max)

Return a JSON object with exactly:
{
  "summary": "<2-3 sentence paragraph describing the current imbalance and what you're fixing>",
  "suggestions": [
    {
      "taskId": "<task _id string>",
      "taskTitle": "<task title>",
      "fromMemberId": "<current assignee _id>",
      "fromMemberName": "<current assignee name>",
      "toMemberId": "<suggested new assignee _id>",
      "toMemberName": "<suggested new assignee name>",
      "reasoning": "<1 sentence explanation>"
    }
  ],
  "expectedOutcome": "<1-2 sentences describing what workload balance will look like after these changes>"
}

If the workload is already well-balanced, still suggest 1-2 proactive moves to keep it that way.`;

    const completion = await client.chat.completions.create({
      model: "gpt-4o",
      messages: [{ role: "user", content: prompt }],
      max_tokens: 2048,
      response_format: { type: "json_object" },
    });

    const text = completion.choices[0].message.content ?? "{}";
    const data = JSON.parse(text);

    return NextResponse.json(data);
  } catch (err) {
    console.error("[ai/rebalance] error:", err);
    return NextResponse.json(
      { error: "Failed to generate rebalance suggestions" },
      { status: 500 }
    );
  }
}
