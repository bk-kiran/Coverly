import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

export const getCommentsByTask = query({
  args: { taskId: v.string() },
  handler: async (ctx, { taskId }) => {
    const comments = await ctx.db
      .query("taskComments")
      .withIndex("by_task", (q) => q.eq("taskId", taskId))
      .order("asc")
      .collect();

    return await Promise.all(
      comments.map(async (comment) => {
        const user = await ctx.db
          .query("users")
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          .filter((q: any) => q.eq(q.field("_id"), comment.userId))
          .first();
        return {
          ...comment,
          userName: user?.name ?? "Unknown",
          userAvatar: user?.avatarUrl,
        };
      })
    );
  },
});

export const addComment = mutation({
  args: {
    taskId: v.string(),
    userId: v.string(),
    content: v.string(),
  },
  handler: async (ctx, { taskId, userId, content }) => {
    const user = await ctx.db
      .query("users")
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .filter((q: any) => q.eq(q.field("_id"), userId))
      .first();

    const userName = user?.name ?? "Unknown";

    const commentId = await ctx.db.insert("taskComments", {
      taskId,
      userId,
      content,
      createdAt: Date.now(),
    });

    // Append comment to task notes so AI handoff doc picks it up
    const task = await ctx.db
      .query("tasks")
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .filter((q: any) => q.eq(q.field("_id"), taskId))
      .first();

    if (task) {
      const existingNotes = task.notes ?? "";
      const appendedNotes =
        existingNotes +
        (existingNotes ? "\n" : "") +
        `[Comment from ${userName}]: ${content}`;
      await ctx.db.patch(task._id, { notes: appendedNotes });
    }

    return commentId;
  },
});

export const deleteComment = mutation({
  args: { commentId: v.id("taskComments") },
  handler: async (ctx, { commentId }) => {
    await ctx.db.delete(commentId);
  },
});
