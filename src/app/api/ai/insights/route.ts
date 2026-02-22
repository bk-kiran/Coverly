import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function POST(req: NextRequest) {
  try {
    const { teamData } = await req.json();

    const prompt = `
You are an AI team workload optimizer for a task management platform called Coverly.

Here is the current team data:
${JSON.stringify(teamData, null, 2)}

Your job is to ALWAYS provide helpful suggestions, even when everything looks healthy.
Never say there is nothing to suggest.

Analyze the team and return 3-5 suggestions in the following categories:

1. **Workload Balancing** — Even if no one is overloaded, suggest if tasks could be more evenly spread
2. **Upcoming Risk** — Look ahead at deadlines and availability over the next 2 weeks and flag anything that COULD become a problem
3. **Efficiency Tips** — Based on skill tags, suggest if someone is better suited for a task than their current assignee
4. **Capacity Opportunities** — If someone has low load, suggest they could take on more or be pre-assigned to upcoming work
5. **Calendar Conflicts** — If someone has meetings and deadlines on the same day, flag it proactively

Return your response as a JSON object with a "suggestions" key containing an array like this:
{
  "suggestions": [
    {
      "type": "workload" | "risk" | "efficiency" | "capacity" | "calendar",
      "priority": "high" | "medium" | "low",
      "title": "Short title",
      "description": "Plain English explanation of the suggestion",
      "affectedMembers": ["name1", "name2"],
      "action": "Optional suggested action the manager can take"
    }
  ]
}

Always return at least 3 suggestions. Be proactive and specific — reference actual task names, deadlines, and team member names from the data above.
`;

    const completion = await client.chat.completions.create({
      model: "gpt-4o",
      messages: [{ role: "user", content: prompt }],
      max_tokens: 2048,
      response_format: { type: "json_object" },
    });

    const text = completion.choices[0].message.content ?? "{}";
    const parsed = JSON.parse(text);
    const suggestions = parsed.suggestions ?? [];

    return NextResponse.json({ suggestions });
  } catch (err) {
    console.error("[ai/insights] error:", err);
    return NextResponse.json(
      { error: "Failed to generate insights" },
      { status: 500 }
    );
  }
}
