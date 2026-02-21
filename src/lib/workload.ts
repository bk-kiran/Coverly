import { Task, TaskPriority } from "@/types";

const PRIORITY_WEIGHTS: Record<TaskPriority, number> = {
  critical: 40,
  high: 20,
  medium: 10,
  low: 5,
};

function getDeadlineMultiplier(deadline: string): number {
  const now = Date.now();
  const daysUntil = (new Date(deadline).getTime() - now) / (1000 * 60 * 60 * 24);

  if (daysUntil <= 1) return 3;
  if (daysUntil <= 3) return 2;
  if (daysUntil <= 7) return 1.5;
  return 1;
}

export function computeWorkloadScore(tasks: Task[]): number {
  const openTasks = tasks.filter((t) => t.status !== "done");
  if (openTasks.length === 0) return 0;

  const raw = openTasks.reduce((sum, task) => {
    const weight = PRIORITY_WEIGHTS[task.priority];
    const multiplier = getDeadlineMultiplier(task.deadline);
    return sum + weight * multiplier;
  }, 0);

  return Math.round(Math.min(raw, 200) / 2);
}

export function isOverloaded(score: number): boolean {
  return score > 80;
}

export function getWorkloadLabel(score: number): string {
  if (score <= 30) return "Light";
  if (score <= 60) return "Moderate";
  if (score <= 80) return "Heavy";
  return "Overloaded";
}

export function getWorkloadColor(score: number): string {
  if (score <= 30) return "text-emerald-500";
  if (score <= 60) return "text-yellow-500";
  if (score <= 80) return "text-orange-500";
  return "text-red-500";
}
