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
  args: {},
  handler: async (ctx) => {
    return await ctx.db
      .query("users")
      .filter((q) => q.eq(q.field("role"), "member"))
      .collect();
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
  },
  handler: async (ctx, args) => {
    console.log("upsertUser called with:", args);

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
      });
      console.log("upsertUser result: patched existing", existing._id);
      return existing._id;
    }

    const newId = await ctx.db.insert("users", {
      ...args,
      workloadScore: 0,
    });
    console.log("upsertUser result: inserted new user", newId);
    return newId;
  },
});

export const updateWorkloadScore = mutation({
  args: { id: v.id("users"), workloadScore: v.number() },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.id, { workloadScore: args.workloadScore });
  },
});
