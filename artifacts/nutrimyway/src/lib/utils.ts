import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function getProgressColorClass(current: number, target: number, defaultClass: string): string {
  if (target === 0) return defaultClass;
  const ratio = current / target;
  if (ratio >= 1) return "text-red-500 bg-red-500 stroke-red-500";
  if (ratio >= 0.8) return "text-orange-500 bg-orange-500 stroke-orange-500";
  return defaultClass;
}
