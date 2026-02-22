import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

export const getPendingReassignments = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db
      .query("reassignments")
      .withIndex("by_status", (q) => q.eq("status", "pending"))
      .collect();
  },
});

export const getReassignmentHistory = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("reassignments").order("desc").take(50);
  },
});

export const getReassignmentsByTask = query({
  args: { taskId: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("reassignments")
      .withIndex("by_taskId", (q) => q.eq("taskId", args.taskId))
      .collect();
  },
});

export const createReassignment = mutation({
  args: {
    taskId: v.string(),
    fromUserId: v.string(),
    toUserId: v.string(),
    managerId: v.string(),
    handoffDoc: v.string(),
    reasoning: v.string(),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("reassignments", {
      ...args,
      status: "pending",
    });
  },
});

export const approveReassignment = mutation({
  args: {
    id: v.id("reassignments"),
    overrideToUserId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const reassignment = await ctx.db.get(args.id);
    if (!reassignment) throw new Error("Reassignment not found");

    const toUserId = args.overrideToUserId ?? reassignment.toUserId;

    // Use filter query to get a native Id from the stored string,
    // avoiding the unreliable `as Id<"tasks">` cast on a v.string() field.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const task = await ctx.db
      .query("tasks")
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .filter((q: any) => q.eq(q.field("_id"), reassignment.taskId))
      .first();

    if (!task) throw new Error("Task not found: " + reassignment.taskId);

    await ctx.db.patch(task._id, {
      assigneeId: toUserId,
      handoffDoc: reassignment.handoffDoc,
      isAtRisk: false,
    });

    await ctx.db.patch(args.id, {
      status: "approved",
      toUserId,
      approvedAt: Date.now(),
    });
  },
});

export const rejectReassignment = mutation({
  args: { id: v.id("reassignments") },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.id, { status: "rejected" });
  },
});

export const revertReassignment = mutation({
  args: { id: v.id("reassignments") },
  handler: async (ctx, args) => {
    const reassignment = await ctx.db.get(args.id);
    if (!reassignment) return;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const task = await ctx.db
      .query("tasks")
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .filter((q: any) => q.eq(q.field("_id"), reassignment.taskId))
      .first();
    if (task) {
      await ctx.db.patch(task._id, { assigneeId: reassignment.fromUserId });
    }
    await ctx.db.delete(args.id);
  },
});
