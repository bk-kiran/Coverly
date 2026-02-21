import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { Id } from "./_generated/dataModel";

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

    await ctx.db.patch(reassignment.taskId as Id<"tasks">, {
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
