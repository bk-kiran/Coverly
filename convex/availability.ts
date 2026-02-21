import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

export const getAvailabilityByUser = query({
  args: { userId: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("availability")
      .withIndex("by_userId", (q) => q.eq("userId", args.userId))
      .collect();
  },
});

export const getAllAvailability = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("availability").collect();
  },
});

export const getAvailabilityInRange = query({
  args: { startDate: v.string(), endDate: v.string() },
  handler: async (ctx, args) => {
    const all = await ctx.db.query("availability").collect();
    return all.filter(
      (a) => a.startDate <= args.endDate && a.endDate >= args.startDate
    );
  },
});

export const setAvailability = mutation({
  args: {
    userId: v.string(),
    type: v.union(
      v.literal("ooo"),
      v.literal("partial"),
      v.literal("at_capacity")
    ),
    startDate: v.string(),
    endDate: v.string(),
    note: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("availability")
      .withIndex("by_userId", (q) => q.eq("userId", args.userId))
      .collect();

    const overlapping = existing.filter(
      (a) => a.startDate <= args.endDate && a.endDate >= args.startDate
    );
    await Promise.all(overlapping.map((a) => ctx.db.delete(a._id)));

    return await ctx.db.insert("availability", args);
  },
});

export const removeAvailability = mutation({
  args: { id: v.id("availability") },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.id);
  },
});

export const getUserStatusOnDate = query({
  args: { userId: v.string(), date: v.string() },
  handler: async (ctx, args) => {
    const entries = await ctx.db
      .query("availability")
      .withIndex("by_userId", (q) => q.eq("userId", args.userId))
      .collect();

    const active = entries.find(
      (a) => a.startDate <= args.date && a.endDate >= args.date
    );

    return active ? active.type : "available";
  },
});
