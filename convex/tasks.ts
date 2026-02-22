import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function getOrgMemberIds(ctx: any, clerkId: string): Promise<Set<string>> {
  const user = await ctx.db
    .query("users")
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .withIndex("by_clerkId", (q: any) => q.eq("clerkId", clerkId))
    .first();
  if (!user?.orgId) return new Set<string>();
  const orgIds: string[] = [user.orgId as string];
  const org = await ctx.db
    .query("orgs")
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .filter((q: any) => q.eq(q.field("_id"), user.orgId))
    .first();
  if (org?.parentOrgId) orgIds.push(org.parentOrgId as string);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const allUsers: any[] = await ctx.db.query("users").collect();
  return new Set<string>(
    allUsers
      .filter((u) => u.orgId && orgIds.includes(u.orgId as string))
      .map((u) => u._id as string)
  );
}

export const getAllTasks = query({
  args: { clerkId: v.optional(v.string()) },
  handler: async (ctx, { clerkId }) => {
    const tasks = await ctx.db.query("tasks").collect();
    if (!clerkId) return tasks;
    const memberIds = await getOrgMemberIds(ctx, clerkId);
    if (memberIds.size === 0) return tasks;
    return tasks.filter((t) => memberIds.has(t.assigneeId as string));
  },
});

export const getTasksByAssignee = query({
  args: { assigneeId: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("tasks")
      .withIndex("by_assigneeId", (q) => q.eq("assigneeId", args.assigneeId))
      .collect();
  },
});

export const getAtRiskTasks = query({
  args: { clerkId: v.optional(v.string()) },
  handler: async (ctx, { clerkId }) => {
    const atRisk = await ctx.db
      .query("tasks")
      .withIndex("by_isAtRisk", (q) => q.eq("isAtRisk", true))
      .filter((q) => q.neq(q.field("status"), "done"))
      .collect();
    if (!clerkId) return atRisk;
    const memberIds = await getOrgMemberIds(ctx, clerkId);
    if (memberIds.size === 0) return atRisk;
    return atRisk.filter((t) => memberIds.has(t.assigneeId as string));
  },
});

export const createTask = mutation({
  args: {
    title: v.string(),
    description: v.string(),
    assigneeId: v.string(),
    createdById: v.string(),
    priority: v.union(
      v.literal("low"),
      v.literal("medium"),
      v.literal("high"),
      v.literal("critical")
    ),
    status: v.union(
      v.literal("todo"),
      v.literal("in_progress"),
      v.literal("blocked"),
      v.literal("done")
    ),
    deadline: v.string(),
    projectTag: v.string(),
    skillRequired: v.optional(v.string()),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("tasks", {
      ...args,
      isAtRisk: false,
    });
  },
});

export const updateTask = mutation({
  args: {
    id: v.id("tasks"),
    assigneeId: v.optional(v.string()),
    status: v.optional(
      v.union(
        v.literal("todo"),
        v.literal("in_progress"),
        v.literal("blocked"),
        v.literal("done")
      )
    ),
    notes: v.optional(v.string()),
    handoffDoc: v.optional(v.string()),
    isAtRisk: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const { id, ...fields } = args;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const updates: Record<string, any> = {};
    if (fields.assigneeId !== undefined) updates.assigneeId = fields.assigneeId;
    if (fields.status !== undefined) updates.status = fields.status;
    if (fields.notes !== undefined) updates.notes = fields.notes;
    if (fields.handoffDoc !== undefined) updates.handoffDoc = fields.handoffDoc;
    if (fields.isAtRisk !== undefined) updates.isAtRisk = fields.isAtRisk;
    await ctx.db.patch(id, updates);
  },
});

export const markTasksAtRisk = mutation({
  args: { assigneeId: v.string() },
  handler: async (ctx, args) => {
    const tasks = await ctx.db
      .query("tasks")
      .withIndex("by_assigneeId", (q) => q.eq("assigneeId", args.assigneeId))
      .filter((q) => q.neq(q.field("status"), "done"))
      .collect();
    await Promise.all(
      tasks.map((task) => ctx.db.patch(task._id, { isAtRisk: true }))
    );
  },
});

export const deleteTask = mutation({
  args: { id: v.id("tasks") },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.id);
  },
});
