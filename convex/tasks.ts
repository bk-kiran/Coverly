import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

export const getAllTasks = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("tasks").collect();
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
  args: {},
  handler: async (ctx) => {
    return await ctx.db
      .query("tasks")
      .withIndex("by_isAtRisk", (q) => q.eq("isAtRisk", true))
      .filter((q) => q.neq(q.field("status"), "done"))
      .collect();
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
