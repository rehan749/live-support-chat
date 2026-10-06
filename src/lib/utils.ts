import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function timeAgo(timestamp: string | number): string {
  const now = Date.now();
  const t = typeof timestamp === "string" ? new Date(timestamp).getTime() : timestamp;
  const diff = Math.max(0, Math.floor((now - t) / 1000));
  if (diff < 60) return "Now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h`;
  return `${Math.floor(diff / 86400)}d`;
}

export function formatTime(timestamp: string | number): string {
  const t = typeof timestamp === "string" ? new Date(timestamp) : new Date(timestamp);
  return t.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

export function initials(name: string): string {
  if (!name) return "U";
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((x) => x[0])
    .join("")
    .toUpperCase();
}
