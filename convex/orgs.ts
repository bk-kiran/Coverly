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

async function tryGetCurrentUser(ctx: any) {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) return null;
  return await ctx.db
    .query("users")
    .withIndex("by_clerkId", (q: any) => q.eq("clerkId", identity.subject))
    .first();
}

// ─── queries ─────────────────────────────────────────────────────────────────

export const getMyOrg = query({
  args: {},
  handler: async (ctx) => {
    const user = await tryGetCurrentUser(ctx);
    const resolvedOrgId = user?.activeOrgId ?? user?.orgId;
    if (!resolvedOrgId) return null;
    return await ctx.db
      .query("orgs")
      .filter((q: any) => q.eq(q.field("_id"), resolvedOrgId))
      .first();
  },
});

export const getMyManagedOrg = query({
  args: {},
  handler: async (ctx) => {
    const user = await tryGetCurrentUser(ctx);
    if (!user) return null;
    return await ctx.db
      .query("orgs")
      .withIndex("by_manager", (q: any) => q.eq("managerId", user._id as string))
      .first();
  },
});

/** All orgs this user belongs to or manages, each annotated with isActive. */
export const getMyOrgs = query({
  args: {},
  handler: async (ctx) => {
    const user = await tryGetCurrentUser(ctx);
    if (!user) return [];

    const memberOrgIds: string[] = user.orgIds ?? [];

    // Orgs user manages (includes sub-orgs they created, even if not in orgIds)
    const managedOrgs = await ctx.db
      .query("orgs")
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .withIndex("by_manager", (q: any) => q.eq("managerId", user._id as string))
      .collect();

    // Member orgs fetched individually
    const memberOrgs = (
      await Promise.all(memberOrgIds.map((id) => ctx.db.get(id as any)))
    ).filter((o): o is NonNullable<typeof o> => o !== null);

    // Merge and deduplicate
    const seen = new Set<string>();
    const result: Array<typeof memberOrgs[number] & { isActive: boolean }> = [];
    for (const o of [...memberOrgs, ...managedOrgs]) {
      const id = o._id as string;
      if (seen.has(id)) continue;
      seen.add(id);
      const activeId = (user.activeOrgId ?? user.orgId) as string | undefined;
      result.push({ ...o, isActive: id === activeId });
    }
    return result;
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
    const all = await ctx.db.query("users").collect();
    return all.filter((u) => (u.activeOrgId ?? u.orgId) === orgId);
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

    const orgIdStr = orgId as string;
    const existingOrgIds: string[] = user.orgIds ?? [];

    await ctx.db.patch(user._id, {
      orgIds: existingOrgIds.includes(orgIdStr)
        ? existingOrgIds
        : [...existingOrgIds, orgIdStr],
      activeOrgId: orgIdStr,
      managedOrgId: orgIdStr,
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

    // Add the new sub-org to the manager's orgIds so it appears in getMyOrgs
    const subOrgIdStr = subOrgId as string;
    const existingOrgIds: string[] = user.orgIds ?? [];
    if (!existingOrgIds.includes(subOrgIdStr)) {
      await ctx.db.patch(user._id, {
        orgIds: [...existingOrgIds, subOrgIdStr],
      });
    }

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

    const orgIdStr = org._id as string;
    const existingOrgIds: string[] = user.orgIds ?? [];
    const newOrgIds = existingOrgIds.includes(orgIdStr)
      ? existingOrgIds
      : [...existingOrgIds, orgIdStr];

    await ctx.db.patch(user._id, {
      orgIds: newOrgIds,
      activeOrgId: orgIdStr,
      role: "member",
    });

    return org;
  },
});

/** Switch the caller's active org to any org they already belong to. */
export const switchOrg = mutation({
  args: { orgId: v.string() },
  handler: async (ctx, { orgId }) => {
    const user = await requireCurrentUser(ctx);
    const orgIds: string[] = user.orgIds ?? [];
    if (!orgIds.includes(orgId)) throw new Error("Not a member of this org");
    await ctx.db.patch(user._id, { activeOrgId: orgId });
  },
});
