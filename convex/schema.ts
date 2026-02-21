import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  users: defineTable({
    clerkId: v.string(),
    name: v.string(),
    email: v.string(),
    role: v.union(v.literal("manager"), v.literal("member")),
    skillTags: v.array(v.string()),
    workloadScore: v.number(),
    avatarUrl: v.optional(v.string()),
    teamId: v.optional(v.string()),
  })
    .index("by_clerkId", ["clerkId"])
    .index("by_teamId", ["teamId"]),

  availability: defineTable({
    userId: v.string(),
    type: v.union(
      v.literal("ooo"),
      v.literal("partial"),
      v.literal("at_capacity")
    ),
    startDate: v.string(),
    endDate: v.string(),
    note: v.optional(v.string()),
  }).index("by_userId", ["userId"]),

  tasks: defineTable({
    title: v.string(),
    description: v.string(),
    assigneeId: v.string(),
    createdById: v.string(),
    priority: v.union(
      v.literal("low"),
      v.literal("medium"),
      v.literal("high"),
      v.literal("critical")
    ),
    status: v.union(
      v.literal("todo"),
      v.literal("in_progress"),
      v.literal("blocked"),
      v.literal("done")
    ),
    deadline: v.string(),
    projectTag: v.string(),
    skillRequired: v.optional(v.string()),
    notes: v.optional(v.string()),
    handoffDoc: v.optional(v.string()),
    isAtRisk: v.boolean(),
  })
    .index("by_assigneeId", ["assigneeId"])
    .index("by_projectTag", ["projectTag"])
    .index("by_status", ["status"])
    .index("by_isAtRisk", ["isAtRisk"]),

  reassignments: defineTable({
    taskId: v.string(),
    fromUserId: v.string(),
    toUserId: v.string(),
    managerId: v.string(),
    status: v.union(
      v.literal("pending"),
      v.literal("approved"),
      v.literal("rejected")
    ),
    handoffDoc: v.string(),
    reasoning: v.string(),
    approvedAt: v.optional(v.number()),
  })
    .index("by_taskId", ["taskId"])
    .index("by_status", ["status"])
    .index("by_managerId", ["managerId"]),
});
