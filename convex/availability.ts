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
  args: { clerkId: v.optional(v.string()) },
  handler: async (ctx, { clerkId }) => {
    const all = await ctx.db.query("availability").collect();
    if (!clerkId) return all;
    const memberIds = await getOrgMemberIds(ctx, clerkId);
    if (memberIds.size === 0) return all;
    return all.filter((a) => memberIds.has(a.userId as string));
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
