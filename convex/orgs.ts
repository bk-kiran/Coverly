import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

// ─── helpers ────────────────────────────────────────────────────────────────

function randomInviteCode(): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  return Array.from({ length: 6 }, () =>
    chars[Math.floor(Math.random() * chars.length)]
  ).join("");
}

async function requireCurrentUser(ctx: any) {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) throw new Error("Not authenticated");
  const user = await ctx.db
    .query("users")
    .withIndex("by_clerkId", (q: any) => q.eq("clerkId", identity.subject))
    .first();
  if (!user) throw new Error("User not found");
  return user;
}

// ─── queries ─────────────────────────────────────────────────────────────────

export const getMyOrg = query({
  args: {},
  handler: async (ctx) => {
    const user = await requireCurrentUser(ctx);
    if (!user.orgId) return null;
    return await ctx.db
      .query("orgs")
      .filter((q: any) => q.eq(q.field("_id"), user.orgId))
      .first();
  },
});

export const getMyManagedOrg = query({
  args: {},
  handler: async (ctx) => {
    const user = await requireCurrentUser(ctx);
    return await ctx.db
      .query("orgs")
      .withIndex("by_manager", (q: any) => q.eq("managerId", user._id as string))
      .first();
  },
});

export const getSubOrgs = query({
  args: { parentOrgId: v.string() },
  handler: async (ctx, { parentOrgId }) => {
    return await ctx.db
      .query("orgs")
      .withIndex("by_parent", (q: any) => q.eq("parentOrgId", parentOrgId))
      .collect();
  },
});

export const getOrgByInviteCode = query({
  args: { inviteCode: v.string() },
  handler: async (ctx, { inviteCode }) => {
    return await ctx.db
      .query("orgs")
      .withIndex("by_invite_code", (q: any) => q.eq("inviteCode", inviteCode))
      .first();
  },
});

export const getAllOrgsInTree = query({
  args: { rootOrgId: v.string() },
  handler: async (ctx, { rootOrgId }) => {
    const root = await ctx.db
      .query("orgs")
      .filter((q: any) => q.eq(q.field("_id"), rootOrgId))
      .first();
    if (!root) return [];
    const subOrgs = await ctx.db
      .query("orgs")
      .withIndex("by_parent", (q: any) => q.eq("parentOrgId", rootOrgId))
      .collect();
    return [root, ...subOrgs];
  },
});

export const getOrgMembers = query({
  args: { orgId: v.string() },
  handler: async (ctx, { orgId }) => {
    return await ctx.db
      .query("users")
      .withIndex("by_orgId", (q: any) => q.eq("orgId", orgId))
      .collect();
  },
});

// ─── mutations ───────────────────────────────────────────────────────────────

export const createOrg = mutation({
  args: {
    name: v.string(),
    department: v.optional(v.string()),
    parentOrgId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await requireCurrentUser(ctx);
    const inviteCode = randomInviteCode();

    const orgId = await ctx.db.insert("orgs", {
      name: args.name,
      managerId: user._id as string,
      inviteCode,
      department: args.department,
      parentOrgId: args.parentOrgId,
      createdAt: Date.now(),
    });

    await ctx.db.patch(user._id, {
      orgId: orgId as string,
      managedOrgId: orgId as string,
      role: "manager",
    });

    return { orgId, inviteCode };
  },
});

export const createSubOrg = mutation({
  args: {
    name: v.string(),
    department: v.optional(v.string()),
    parentOrgId: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await requireCurrentUser(ctx);

    const parentOrg = await ctx.db
      .query("orgs")
      .filter((q: any) => q.eq(q.field("_id"), args.parentOrgId))
      .first();

    if (!parentOrg || (parentOrg.managerId as string) !== (user._id as string)) {
      throw new Error("Only the parent org manager can create sub-orgs");
    }

    const inviteCode = randomInviteCode();

    const subOrgId = await ctx.db.insert("orgs", {
      name: args.name,
      managerId: user._id as string,
      inviteCode,
      department: args.department,
      parentOrgId: args.parentOrgId,
      createdAt: Date.now(),
    });

    return { subOrgId, inviteCode };
  },
});

export const joinOrg = mutation({
  args: { inviteCode: v.string() },
  handler: async (ctx, { inviteCode }) => {
    const user = await requireCurrentUser(ctx);

    const org = await ctx.db
      .query("orgs")
      .withIndex("by_invite_code", (q: any) => q.eq("inviteCode", inviteCode))
      .first();

    if (!org) throw new Error("Invalid invite code");

    await ctx.db.patch(user._id, {
      orgId: org._id as string,
      role: "member",
    });

    return org;
  },
});
