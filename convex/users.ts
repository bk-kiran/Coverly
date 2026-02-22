import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

export const getMe = query({
  args: { clerkId: v.optional(v.string()) },
  handler: async (ctx, { clerkId }) => {
    if (!clerkId) return null;
    return await ctx.db
      .query("users")
      .withIndex("by_clerkId", (q) => q.eq("clerkId", clerkId))
      .first();
  },
});

export const getAllUsers = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("users").collect();
  },
});

export const getUserById = query({
  args: { id: v.id("users") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id);
  },
});

export const getTeamMembers = query({
  args: { clerkId: v.optional(v.string()) },
  handler: async (ctx, { clerkId }) => {
    if (!clerkId) {
      return await ctx.db
        .query("users")
        .filter((q) => q.eq(q.field("role"), "member"))
        .collect();
    }
    const user = await ctx.db
      .query("users")
      .withIndex("by_clerkId", (q) => q.eq("clerkId", clerkId))
      .first();
    if (!user?.orgId) {
      return await ctx.db
        .query("users")
        .filter((q) => q.eq(q.field("role"), "member"))
        .collect();
    }
    const orgIds: string[] = [user.orgId];
    const org = await ctx.db
      .query("orgs")
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .filter((q: any) => q.eq(q.field("_id"), user.orgId))
      .first();
    if (org?.parentOrgId) orgIds.push(org.parentOrgId);
    const allMembers = await ctx.db
      .query("users")
      .filter((q) => q.eq(q.field("role"), "member"))
      .collect();
    return allMembers.filter((m) => m.orgId && orgIds.includes(m.orgId));
  },
});

export const upsertUser = mutation({
  args: {
    clerkId: v.string(),
    name: v.string(),
    email: v.string(),
    role: v.union(v.literal("manager"), v.literal("member")),
    skillTags: v.array(v.string()),
    avatarUrl: v.optional(v.string()),
    department: v.optional(v.string()),
    timezone: v.optional(v.string()),
    weeklyCapacity: v.optional(v.number()),
    currentFocus: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("users")
      .withIndex("by_clerkId", (q) => q.eq("clerkId", args.clerkId))
      .unique();

    if (existing) {
      await ctx.db.patch(existing._id, {
        name: args.name,
        email: args.email,
        role: args.role,
        skillTags: args.skillTags,
        avatarUrl: args.avatarUrl,
        department: args.department,
        timezone: args.timezone,
        weeklyCapacity: args.weeklyCapacity,
        currentFocus: args.currentFocus,
      });
      return existing._id;
    }

    return await ctx.db.insert("users", {
      ...args,
      workloadScore: 0,
    });
  },
});

export const updateWorkloadScore = mutation({
  args: { id: v.id("users"), workloadScore: v.number() },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.id, { workloadScore: args.workloadScore });
  },
});
