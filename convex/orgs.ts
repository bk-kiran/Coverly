import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { Id } from "./_generated/dataModel";

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

async function requireManagedOrg(ctx: any, orgId: string) {
  const user = await requireCurrentUser(ctx);
  if (user.role !== "manager") {
    throw new Error("Only team managers can manage organizations");
  }

  const org = await ctx.db
    .query("orgs")
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .filter((q: any) => q.eq(q.field("_id"), orgId))
    .first();

  if (!org) throw new Error("Organization not found");
  if ((org.managerId as string) !== (user._id as string)) {
    throw new Error("Only this organization's manager can manage it");
  }

  return { user, org };
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
      await Promise.all(memberOrgIds.map((id) => ctx.db.get(id as Id<"orgs">)))
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

export const renameOrg = mutation({
  args: {
    orgId: v.string(),
    name: v.string(),
    department: v.optional(v.string()),
  },
  handler: async (ctx, { orgId, name, department }) => {
    const trimmedName = name.trim();
    if (!trimmedName) throw new Error("Organization name is required");

    const { org } = await requireManagedOrg(ctx, orgId);
    await ctx.db.patch(org._id, {
      name: trimmedName,
      department: department?.trim() || undefined,
    });
  },
});

export const deleteOrg = mutation({
  args: { orgId: v.string() },
  handler: async (ctx, { orgId }) => {
    const { org } = await requireManagedOrg(ctx, orgId);

    const childOrgs = await ctx.db
      .query("orgs")
      .withIndex("by_parent", (q: any) => q.eq("parentOrgId", orgId))
      .collect();
    if (childOrgs.length > 0) {
      throw new Error("Delete sub-orgs first before deleting this organization");
    }

    const users = await ctx.db.query("users").collect();
    for (const member of users) {
      const existingOrgIds: string[] = member.orgIds ?? [];
      const nextOrgIds = existingOrgIds.filter((id) => id !== orgId);
      const inOrgIds = nextOrgIds.length !== existingOrgIds.length;
      const activeMatches = (member.activeOrgId as string | undefined) === orgId;
      const legacyMatches = (member.orgId as string | undefined) === orgId;
      const managedMatches = (member.managedOrgId as string | undefined) === orgId;

      if (!inOrgIds && !activeMatches && !legacyMatches && !managedMatches) continue;

      await ctx.db.patch(member._id, {
        orgIds: nextOrgIds,
        activeOrgId: activeMatches ? nextOrgIds[0] : member.activeOrgId,
        orgId: legacyMatches ? nextOrgIds[0] : member.orgId,
        managedOrgId: managedMatches ? undefined : member.managedOrgId,
      });
    }

    await ctx.db.delete(org._id);
  },
});
