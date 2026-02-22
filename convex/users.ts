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
    const userOrgId = (user?.activeOrgId ?? user?.orgId) as string | undefined;
    if (!userOrgId) {
      return await ctx.db
        .query("users")
        .filter((q) => q.eq(q.field("role"), "member"))
        .collect();
    }
    const orgIds: string[] = [userOrgId];
    const org = await ctx.db
      .query("orgs")
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .filter((q: any) => q.eq(q.field("_id"), userOrgId))
      .first();
    if (org?.parentOrgId) orgIds.push(org.parentOrgId as string);
    const allMembers = await ctx.db
      .query("users")
      .filter((q) => q.eq(q.field("role"), "member"))
      .collect();
    return allMembers.filter((m) => {
      const memberOrgId = (m.activeOrgId ?? m.orgId) as string | undefined;
      return memberOrgId && orgIds.includes(memberOrgId);
    });
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
      orgIds: [],
    });
  },
});

export const switchOrg = mutation({
  args: { orgId: v.string() },
  handler: async (ctx, { orgId }) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");
    const user = await ctx.db
      .query("users")
      .withIndex("by_clerkId", (q) => q.eq("clerkId", identity.subject))
      .first();
    if (!user) throw new Error("User not found");

    // Check if user is a member OR a manager of this org
    const org = await ctx.db
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .query("orgs")
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .filter((q: any) => q.eq(q.field("_id"), orgId))
      .first();
    if (!org) throw new Error("Org not found");

    const isMember = (user.orgIds ?? []).includes(orgId);
    const isManager = (org.managerId as string) === (user._id as string);

    if (!isMember && !isManager) {
      throw new Error("Not a member of this org");
    }

    // If manager but not yet in orgIds, add it now
    if (!isMember && isManager) {
      await ctx.db.patch(user._id, {
        orgIds: [...(user.orgIds ?? []), orgId],
        activeOrgId: orgId,
      });
      return;
    }

    await ctx.db.patch(user._id, { activeOrgId: orgId });
  },
});

export const updateMemberRole = mutation({
  args: {
    targetUserId: v.string(),
    newRole: v.union(v.literal("manager"), v.literal("member")),
  },
  handler: async (ctx, { targetUserId, newRole }) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");
    const caller = await ctx.db
      .query("users")
      .withIndex("by_clerkId", (q) => q.eq("clerkId", identity.subject))
      .first();
    if (!caller || caller.role !== "manager") throw new Error("Only managers can change roles");
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await ctx.db.patch(targetUserId as any, { role: newRole });
  },
});

export const updateWorkloadScore = mutation({
  args: { id: v.id("users"), workloadScore: v.number() },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.id, { workloadScore: args.workloadScore });
  },
});
