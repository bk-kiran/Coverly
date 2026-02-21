export type UserRole = "manager" | "member";

export type SkillTag =
  | "frontend"
  | "backend"
  | "design"
  | "data"
  | "client-comms"
  | "devops"
  | "mobile"
  | "ai-ml"
  | "project-management"
  | "qa";

export type AvailabilityType = "ooo" | "partial" | "at_capacity";

export type TaskPriority = "low" | "medium" | "high" | "critical";

export type TaskStatus = "todo" | "in_progress" | "blocked" | "done";

export type ReassignmentStatus = "pending" | "approved" | "rejected";

export type DayStatus = "available" | "partial" | "ooo" | "at_capacity";

export interface User {
  id: string;
  clerkId: string;
  name: string;
  email: string;
  role: UserRole;
  skillTags: SkillTag[];
  workloadScore: number; // 0-100
  avatarUrl?: string;
  teamId?: string;
}

export interface Availability {
  id: string;
  userId: string;
  type: AvailabilityType;
  startDate: string; // ISO string
  endDate: string; // ISO string
  note?: string;
}

export interface Task {
  id: string;
  title: string;
  description: string;
  assigneeId: string;
  createdById: string;
  priority: TaskPriority;
  status: TaskStatus;
  deadline: string; // ISO string
  projectTag: string;
  skillRequired?: SkillTag;
  notes?: string;
  handoffDoc?: string;
  isAtRisk: boolean;
}

export interface ReassignmentSuggestion {
  taskId: string;
  task: Task;
  suggestedAssigneeId: string;
  suggestedAssignee: User;
  reasoning: string;
  handoffDoc: string;
  confidenceScore: number; // 0-100
}

export interface Reassignment {
  id: string;
  taskId: string;
  fromUserId: string;
  toUserId: string;
  managerId: string;
  status: ReassignmentStatus;
  handoffDoc: string;
  reasoning: string;
  approvedAt?: string; // ISO string
}

export interface WorkloadInfo {
  userId: string;
  score: number;
  taskCount: number;
  criticalTaskCount: number;
  isOverloaded: boolean;
}

export interface SuggestReassignmentRequest {
  tasksAtRisk: Task[];
  availableMembers: User[];
  allTasks: Task[];
}

export interface SuggestReassignmentResponse {
  suggestions: ReassignmentSuggestion[];
}
