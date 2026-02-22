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
    department: v.optional(v.string()),
    timezone: v.optional(v.string()),
    weeklyCapacity: v.optional(v.number()),
    currentFocus: v.optional(v.string()),
    orgId: v.optional(v.string()),            // legacy field — tolerated but not used
    orgIds: v.optional(v.array(v.string())), // all orgs this user belongs to
    activeOrgId: v.optional(v.string()),     // currently active org
    managedOrgId: v.optional(v.string()),
  })
    .index("by_clerkId", ["clerkId"])
    .index("by_teamId", ["teamId"]),

  orgs: defineTable({
    name: v.string(),
    managerId: v.string(),
    inviteCode: v.string(),
    department: v.optional(v.string()),
    parentOrgId: v.optional(v.string()),
    createdAt: v.number(),
  })
    .index("by_manager", ["managerId"])
    .index("by_invite_code", ["inviteCode"])
    .index("by_parent", ["parentOrgId"]),

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
    completionStatus: v.optional(v.union(
      v.literal("pending_approval"),
      v.literal("approved"),
      v.literal("needs_improvement")
    )),
    completionNote: v.optional(v.string()),
    completionRequestedAt: v.optional(v.number()),
    completionApprovedAt: v.optional(v.number()),
    completedByManager: v.optional(v.boolean()),
  })
    .index("by_assigneeId", ["assigneeId"])
    .index("by_projectTag", ["projectTag"])
    .index("by_status", ["status"])
    .index("by_isAtRisk", ["isAtRisk"]),

  taskComments: defineTable({
    taskId: v.string(),
    userId: v.string(),
    content: v.string(),
    createdAt: v.number(),
  })
    .index("by_task", ["taskId"])
    .index("by_user", ["userId"]),

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
