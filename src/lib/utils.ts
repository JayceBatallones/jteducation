import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Feature flags
export const FEATURE_FLAGS = {
  ENABLE_CONSULTS: process.env.NEXT_PUBLIC_ENABLE_CONSULTS === "true",
  ENABLE_RESCHEDULE: process.env.NEXT_PUBLIC_ENABLE_RESCHEDULE === "true",
};

// When2Meet grid constants
export const DAYS_OF_WEEK = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
];

// Time slots from 6am to 10pm (30-minute intervals)
export const TIME_SLOTS: string[] = [];
for (let hour = 6; hour <= 22; hour++) {
  TIME_SLOTS.push(`${hour.toString().padStart(2, "0")}:00`);
  if (hour < 22) {
    TIME_SLOTS.push(`${hour.toString().padStart(2, "0")}:30`);
  }
}

export function getTimeLabel(slot: string): string {
  const [hours, minutes] = slot.split(":").map(Number);
  const period = hours >= 12 ? "PM" : "AM";
  const displayHours = hours % 12 || 12;
  return `${displayHours}:${minutes.toString().padStart(2, "0")} ${period}`;
}

export function getTimeSlotCount(grid?: boolean[][]): number {
  if (!grid) {
    // Return total possible slots per day (6am to 10pm in 30-min intervals)
    return TIME_SLOTS.length;
  }
  return grid.reduce((total, day) => total + day.filter(Boolean).length, 0);
}

// Cohort color palette
export const COHORT_COLORS = [
  "#FF6B6B",
  "#4ECDC4",
  "#45B7D1",
  "#FFA07A",
  "#98D8C8",
  "#F7DC6F",
  "#BB8FCE",
  "#85C1E2",
  "#F8B88B",
  "#ABEBC6",
];

export function getCohortColor(index: number): string {
  return COHORT_COLORS[index % COHORT_COLORS.length];
}
