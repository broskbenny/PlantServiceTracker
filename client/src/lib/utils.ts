import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import { format, parseISO, addDays as dateAddDays, isWithinInterval as dateIsWithinInterval } from "date-fns";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(date: Date | string, formatString: string = "PPP"): string {
  return format(new Date(date), formatString);
}

export function getCompletionPercentage(completed: number, total: number): number {
  if (total === 0) return 0;
  return Math.round((completed / total) * 100);
}

export function getStatusColor(status: string): string {
  switch (status) {
    case "completed":
      return "bg-success text-white";
    case "in_progress":
      return "bg-info text-white";
    case "assigned":
      return "bg-secondary text-white";
    default:
      return "bg-neutral-200 text-white";
  }
}

export function getStatusText(status: string): string {
  switch (status) {
    case "completed":
      return "Completed";
    case "in_progress":
      return "In Progress";
    case "assigned":
      return "Assigned";
    case "pending":
      return "Pending";
    default:
      return status;
  }
}

export function truncateText(text: string, maxLength: number = 100): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength) + '...';
}

// Date helper functions
export function addDays(date: Date, days: number): Date {
  return dateAddDays(date, days);
}

export function startOfDay(date: Date): Date {
  const result = new Date(date);
  result.setHours(0, 0, 0, 0);
  return result;
}

export function isSameDay(date1: Date, date2: Date): boolean {
  return date1.getFullYear() === date2.getFullYear() &&
    date1.getMonth() === date2.getMonth() &&
    date1.getDate() === date2.getDate();
}

export function isWithinInterval(date: Date, interval: { start: Date, end: Date }): boolean {
  return dateIsWithinInterval(date, interval);
}

export function endOfWeek(date: Date): Date {
  const result = new Date(date);
  const day = result.getDay();
  const diff = day === 0 ? 0 : 7 - day; // sunday is 0, saturday is 6
  result.setDate(result.getDate() + diff);
  result.setHours(23, 59, 59, 999);
  return result;
}

export function addWeeks(date: Date, weeks: number): Date {
  return addDays(date, weeks * 7);
}

export function endOfMonth(date: Date): Date {
  const result = new Date(date);
  result.setMonth(result.getMonth() + 1);
  result.setDate(0);
  result.setHours(23, 59, 59, 999);
  return result;
}

export function addMonths(date: Date, months: number): Date {
  const result = new Date(date);
  result.setMonth(result.getMonth() + months);
  return result;
}
