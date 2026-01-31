export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type UserRole = "parent" | "student" | "tutor" | "admin";
export type UserStatus = "pending_customer" | "customer" | "inactive_customer";
export type EventType = "content" | "applied" | "drop-in" | "consult";
export type AttendanceStatus = "attending" | "not_attending" | null;

export interface AvailabilityGrid {
  weekly_grid: boolean[][];
  consult_available_grid?: boolean[][];
  date_overrides?: Record<string, boolean[][]>;
}

export interface RecurrencePattern {
  day: string;
  time: string;
  freq: "weekly" | "biweekly" | "monthly";
}

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          email: string;
          full_name: string | null;
          timezone: string;
          role: UserRole;
          status: UserStatus;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          email: string;
          full_name?: string | null;
          timezone?: string;
          role: UserRole;
          status?: UserStatus;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          email?: string;
          full_name?: string | null;
          timezone?: string;
          role?: UserRole;
          status?: UserStatus;
          updated_at?: string;
        };
      };
      programs: {
        Row: {
          id: string;
          name: string;
          description: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          description?: string | null;
          created_at?: string;
        };
        Update: {
          name?: string;
          description?: string | null;
        };
      };
      cohorts: {
        Row: {
          id: string;
          program_id: string;
          name: string;
          color: string;
          capacity: number;
          stable_meet_link: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          program_id: string;
          name: string;
          color: string;
          capacity: number;
          stable_meet_link?: string | null;
          created_at?: string;
        };
        Update: {
          program_id?: string;
          name?: string;
          color?: string;
          capacity?: number;
          stable_meet_link?: string | null;
        };
      };
      cohort_tutors: {
        Row: {
          cohort_id: string;
          tutor_id: string;
          created_at: string;
        };
        Insert: {
          cohort_id: string;
          tutor_id: string;
          created_at?: string;
        };
        Update: {
          cohort_id?: string;
          tutor_id?: string;
        };
      };
      cohort_students: {
        Row: {
          cohort_id: string;
          student_id: string;
          enrolled_at: string;
        };
        Insert: {
          cohort_id: string;
          student_id: string;
          enrolled_at?: string;
        };
        Update: {
          cohort_id?: string;
          student_id?: string;
        };
      };
      events: {
        Row: {
          id: string;
          cohort_id: string | null;
          program_id: string | null;
          title: string;
          description: string | null;
          start_time: string;
          end_time: string;
          event_type: EventType;
          is_required: boolean;
          capacity: number | null;
          recurrence_pattern: RecurrencePattern | null;
          recurrence_end_date: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          cohort_id?: string | null;
          program_id?: string | null;
          title: string;
          description?: string | null;
          start_time: string;
          end_time: string;
          event_type: EventType;
          is_required?: boolean;
          capacity?: number | null;
          recurrence_pattern?: RecurrencePattern | null;
          recurrence_end_date?: string | null;
          created_at?: string;
        };
        Update: {
          cohort_id?: string | null;
          program_id?: string | null;
          title?: string;
          description?: string | null;
          start_time?: string;
          end_time?: string;
          event_type?: EventType;
          is_required?: boolean;
          capacity?: number | null;
          recurrence_pattern?: RecurrencePattern | null;
          recurrence_end_date?: string | null;
        };
      };
      event_bookings: {
        Row: {
          id: string;
          user_id: string;
          event_id: string;
          booked_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          event_id: string;
          booked_at?: string;
        };
        Update: {
          user_id?: string;
          event_id?: string;
        };
      };
      attendance: {
        Row: {
          id: string;
          user_id: string;
          event_id: string;
          status: AttendanceStatus;
          marked_by: string | null;
          marked_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          event_id: string;
          status?: AttendanceStatus;
          marked_by?: string | null;
          marked_at?: string | null;
          created_at?: string;
        };
        Update: {
          status?: AttendanceStatus;
          marked_by?: string | null;
          marked_at?: string | null;
        };
      };
      parent_student_links: {
        Row: {
          id: string;
          parent_id: string;
          student_id: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          parent_id: string;
          student_id: string;
          created_at?: string;
        };
        Update: {
          parent_id?: string;
          student_id?: string;
        };
      };
      user_status_history: {
        Row: {
          id: string;
          user_id: string;
          old_status: UserStatus | null;
          new_status: UserStatus;
          changed_by: string | null;
          reason: string | null;
          changed_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          old_status?: UserStatus | null;
          new_status: UserStatus;
          changed_by?: string | null;
          reason?: string | null;
          changed_at?: string;
        };
        Update: never;
      };
      user_plan: {
        Row: {
          id: string;
          user_id: string;
          plan_name: string;
          max_hours: number;
          booked_hours: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          plan_name: string;
          max_hours: number;
          booked_hours?: number;
          created_at?: string;
        };
        Update: {
          plan_name?: string;
          max_hours?: number;
          booked_hours?: number;
        };
      };
      user_availability: {
        Row: {
          id: string;
          user_id: string;
          availability: AvailabilityGrid;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          availability: AvailabilityGrid;
          updated_at?: string;
        };
        Update: {
          availability?: AvailabilityGrid;
          updated_at?: string;
        };
      };
      cohort_waitlist: {
        Row: {
          id: string;
          user_id: string;
          cohort_id: string;
          waitlisted_at: string;
          notes: string | null;
        };
        Insert: {
          id?: string;
          user_id: string;
          cohort_id: string;
          waitlisted_at?: string;
          notes?: string | null;
        };
        Update: {
          notes?: string | null;
        };
      };
      reschedule_requests: {
        Row: {
          id: string;
          user_id: string;
          event_id: string;
          requested_at: string;
          notes: string | null;
          status: "pending" | "approved" | "denied";
        };
        Insert: {
          id?: string;
          user_id: string;
          event_id: string;
          requested_at?: string;
          notes?: string | null;
          status?: "pending" | "approved" | "denied";
        };
        Update: {
          notes?: string | null;
          status?: "pending" | "approved" | "denied";
        };
      };
      consult_slots: {
        Row: {
          id: string;
          tutor_id: string;
          start_time: string;
          end_time: string;
          is_booked: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          tutor_id: string;
          start_time: string;
          end_time: string;
          is_booked?: boolean;
          created_at?: string;
        };
        Update: {
          is_booked?: boolean;
        };
      };
      not_attending_tokens: {
        Row: {
          id: string;
          user_id: string;
          event_id: string;
          created_at: string;
          expires_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          event_id: string;
          created_at?: string;
          expires_at: string;
        };
        Update: never;
      };
      notification_preferences: {
        Row: {
          id: string;
          user_id: string;
          email_reminders: boolean;
          reminder_24h: boolean;
          reminder_1h: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          email_reminders?: boolean;
          reminder_24h?: boolean;
          reminder_1h?: boolean;
          created_at?: string;
        };
        Update: {
          email_reminders?: boolean;
          reminder_24h?: boolean;
          reminder_1h?: boolean;
        };
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: {
      user_role: UserRole;
      user_status: UserStatus;
      event_type: EventType;
      attendance_status: "attending" | "not_attending";
    };
  };
}

// Helper types for common queries
export type Profile = Database["public"]["Tables"]["profiles"]["Row"];
export type Program = Database["public"]["Tables"]["programs"]["Row"];
export type Cohort = Database["public"]["Tables"]["cohorts"]["Row"];
export type Event = Database["public"]["Tables"]["events"]["Row"];
export type EventBooking = Database["public"]["Tables"]["event_bookings"]["Row"];
export type Attendance = Database["public"]["Tables"]["attendance"]["Row"];
export type ParentStudentLink = Database["public"]["Tables"]["parent_student_links"]["Row"];
export type UserAvailability = Database["public"]["Tables"]["user_availability"]["Row"];

// Extended types with relations
export type CohortWithProgram = Cohort & {
  programs: Program;
};

export type EventWithCohort = Event & {
  cohorts: Cohort | null;
  programs: Program | null;
};

export type ProfileWithLinks = Profile & {
  parent_student_links?: ParentStudentLink[];
};
