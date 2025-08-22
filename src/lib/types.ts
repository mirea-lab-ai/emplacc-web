export type TaskStatus = "idle" | "in_progress" | "done";

export type Task = {
  id: string;
  title: string;
  subtitle: string;
  status: TaskStatus;
};

export function cn(...classes: (string | false | null | undefined)[]) {
  return classes.filter(Boolean).join(" ");
}
