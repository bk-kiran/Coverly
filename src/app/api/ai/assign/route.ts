import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function POST(req: NextRequest) {
  try {
    const { task, teamMembers, allTasks, allAvailability } = await req.json();

    const today = new Date().toISOString().slice(0, 10);

    // Build set of member IDs who are OOO today
    const oooIds = new Set<string>();
    for (const avail of allAvailability ?? []) {
      if (
        avail.type === "ooo" &&
        avail.startDate <= today &&
        avail.endDate >= today
      ) {
        oooIds.add(avail.userId as string);
      }
    }

    // Compute each member's live task count for context
    const memberProfiles = (teamMembers ?? []).map(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (m: any) => ({
        id: m._id,
        name: m.name,
        skills: m.skillTags ?? [],
        workloadScore: m.workloadScore ?? 0,
        weeklyCapacity: m.weeklyCapacity ?? null,
        isAvailable: !oooIds.has(m._id as string),
        openTaskCount: (allTasks ?? []).filter(
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (t: any) => t.assigneeId === m._id && t.status !== "done"
        ).length,
      })
    );

    const prompt = `You are a smart task assignment AI for a team management tool called Coverly.

Given this new task:
${JSON.stringify(task, null, 2)}

And these team members with their current workload and availability:
${JSON.stringify(memberProfiles, null, 2)}

Suggest the BEST person to assign this task to.
Consider: skill match, workload score (lower is better), availability, and weekly capacity.
Never suggest someone who is OOO (isAvailable: false) unless they are the only option.

Also suggest:
- A realistic deadline if none provided (based on priority + workload). Today is ${today}.
- The appropriate priority if not set.

Return a JSON object with exactly these fields:
{
  "suggestedAssigneeId": "<string — member id from the list above>",
  "assigneeReasoning": "<string — 1-2 sentences explaining why this person was chosen>",
  "suggestedDeadline": "<string YYYY-MM-DD — realistic deadline>",
  "suggestedPriority": "<low|medium|high|critical>",
  "confidenceScore": <number 0-100>
}`;

    const completion = await client.chat.completions.create({
      model: "gpt-4o",
      messages: [{ role: "user", content: prompt }],
      max_tokens: 512,
      response_format: { type: "json_object" },
    });

    const text = completion.choices[0].message.content ?? "{}";
    const data = JSON.parse(text);

    return NextResponse.json(data);
  } catch (err) {
    console.error("[ai/assign] error:", err);
    return NextResponse.json(
      { error: "Failed to generate assignment suggestion" },
      { status: 500 }
    );
  }
}
