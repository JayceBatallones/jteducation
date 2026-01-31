import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Cohort colors - sequential palette
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
] as const;

export function getCohortColor(index: number): string {
  return COHORT_COLORS[index % COHORT_COLORS.length];
}

// Time slot utilities for when2meet grid
export const TIME_SLOTS = {
  START_HOUR: 6, // 6am
  END_HOUR: 22, // 10pm
  SLOT_MINUTES: 30,
} as const;

export function getTimeSlotCount(): number {
  return ((TIME_SLOTS.END_HOUR - TIME_SLOTS.START_HOUR) * 60) / TIME_SLOTS.SLOT_MINUTES;
}

export function getTimeLabel(slotIndex: number): string {
  const totalMinutes = TIME_SLOTS.START_HOUR * 60 + slotIndex * TIME_SLOTS.SLOT_MINUTES;
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  const period = hours >= 12 ? "PM" : "AM";
  const displayHours = hours > 12 ? hours - 12 : hours === 0 ? 12 : hours;
  return `${displayHours}:${minutes.toString().padStart(2, "0")} ${period}`;
}

export const DAYS_OF_WEEK = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
] as const;

// Feature flags
export const FEATURE_FLAGS = {
  ENABLE_CONSULTS: process.env.NEXT_PUBLIC_ENABLE_CONSULTS === "true",
  ENABLE_RESCHEDULE: process.env.NEXT_PUBLIC_ENABLE_RESCHEDULE === "true",
} as const;
