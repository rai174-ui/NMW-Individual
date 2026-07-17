import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function getProgressColorClass(current: number, target: number, defaultClass: string): string {
  if (target === 0) return defaultClass;
  const ratio = current / target;
  if (ratio >= 1) return defaultClass.includes("stroke") ? "stroke-red-500" : "text-white bg-red-500 px-1.5 rounded";
  if (ratio >= 0.8) return defaultClass.includes("stroke") ? "stroke-orange-500" : "text-white bg-orange-500 px-1.5 rounded";
  return defaultClass;
}
