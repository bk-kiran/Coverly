import { mutation } from "./_generated/server";

function daysFromToday(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
}

export const seedDemoData = mutation({
  args: {},
  handler: async (ctx) => {
    // ── Clear all existing data ──────────────────────────────────────────────
    const [allUsers, allTasks, allAvailability, allReassignments] =
      await Promise.all([
        ctx.db.query("users").collect(),
        ctx.db.query("tasks").collect(),
        ctx.db.query("availability").collect(),
        ctx.db.query("reassignments").collect(),
      ]);

    await Promise.all([
      ...allUsers.map((d) => ctx.db.delete(d._id)),
      ...allTasks.map((d) => ctx.db.delete(d._id)),
      ...allAvailability.map((d) => ctx.db.delete(d._id)),
      ...allReassignments.map((d) => ctx.db.delete(d._id)),
    ]);

    // ── Users ────────────────────────────────────────────────────────────────
    const sarahId = await ctx.db.insert("users", {
      clerkId: "demo_sarah",
      name: "Sarah Chen",
      email: "sarah@company.com",
      role: "manager",
      skillTags: ["project-management"],
      workloadScore: 40,
    });

    const alexId = await ctx.db.insert("users", {
      clerkId: "demo_alex",
      name: "Alex Rivera",
      email: "alex@company.com",
      role: "member",
      skillTags: ["frontend", "design"],
      workloadScore: 35,
    });

    const jamieId = await ctx.db.insert("users", {
      clerkId: "demo_jamie",
      name: "Jamie Park",
      email: "jamie@company.com",
      role: "member",
      skillTags: ["backend", "devops"],
      workloadScore: 72,
    });

    const morganId = await ctx.db.insert("users", {
      clerkId: "demo_morgan",
      name: "Morgan Liu",
      email: "morgan@company.com",
      role: "member",
      skillTags: ["data", "ai-ml"],
      workloadScore: 20,
    });

    const taylorId = await ctx.db.insert("users", {
      clerkId: "demo_taylor",
      name: "Taylor Smith",
      email: "taylor@company.com",
      role: "member",
      skillTags: ["frontend", "qa"],
      workloadScore: 88,
    });

    // ── Tasks ────────────────────────────────────────────────────────────────
    const task1Id = await ctx.db.insert("tasks", {
      title: "Fix payment gateway timeout bug",
      description:
        "The payment gateway is timing out under high load. This is blocking production revenue and must be resolved immediately.",
      assigneeId: jamieId,
      createdById: sarahId,
      priority: "critical",
      status: "in_progress",
      deadline: daysFromToday(5),
      projectTag: "Platform",
      skillRequired: "backend",
      isAtRisk: true,
      notes: "Check the Stripe webhook logs first. Issue is in the retry logic.",
    });

    const task2Id = await ctx.db.insert("tasks", {
      title: "Deploy staging environment update",
      description:
        "Update the staging environment with the latest infrastructure changes before the upcoming release window.",
      assigneeId: jamieId,
      createdById: sarahId,
      priority: "high",
      status: "todo",
      deadline: daysFromToday(7),
      projectTag: "Infrastructure",
      skillRequired: "devops",
      isAtRisk: true,
      notes: "Terraform configs are in /infra/staging. Run plan before apply.",
    });

    const task3Id = await ctx.db.insert("tasks", {
      title: "Redesign onboarding flow",
      description:
        "Revamp the new user onboarding experience to improve activation rates based on the latest UX research findings.",
      assigneeId: alexId,
      createdById: sarahId,
      priority: "medium",
      status: "in_progress",
      deadline: daysFromToday(12),
      projectTag: "Product",
      skillRequired: "frontend",
      isAtRisk: false,
    });

    const task4Id = await ctx.db.insert("tasks", {
      title: "Q1 data pipeline audit",
      description:
        "Audit all Q1 data pipelines to ensure data quality, completeness, and alignment with the new schema standards.",
      assigneeId: morganId,
      createdById: sarahId,
      priority: "low",
      status: "todo",
      deadline: daysFromToday(18),
      projectTag: "Data",
      skillRequired: "data",
      isAtRisk: false,
    });

    const task5Id = await ctx.db.insert("tasks", {
      title: "Write API integration tests",
      description:
        "Write comprehensive integration tests for the new API endpoints introduced in the v2 release.",
      assigneeId: taylorId,
      createdById: sarahId,
      priority: "medium",
      status: "todo",
      deadline: daysFromToday(8),
      projectTag: "Platform",
      skillRequired: "qa",
      isAtRisk: false,
    });

    // ── Availability ─────────────────────────────────────────────────────────
    const availabilityId = await ctx.db.insert("availability", {
      userId: jamieId,
      type: "ooo",
      startDate: daysFromToday(0),
      endDate: daysFromToday(7),
      note: "Family vacation",
    });

    // ── Return ───────────────────────────────────────────────────────────────
    return {
      message: "Demo data seeded!",
      users: { sarahId, alexId, jamieId, morganId, taylorId },
      tasks: { task1Id, task2Id, task3Id, task4Id, task5Id },
      availabilityId,
    };
  },
});
