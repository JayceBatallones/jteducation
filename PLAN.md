# Tutoring Booking Platform Plan

## Tech Stack
- **Frontend**: Next.js (App Router), React, TypeScript, Tailwind CSS
- **Backend**: Supabase (PostgreSQL, Auth, Edge Functions, Realtime)
- **Auth**: Supabase Auth with JWT; custom claims for roles (parent, student, tutor, admin)
- **Database**: PostgreSQL with Row Level Security (RLS)
- **Payments**: Stripe; webhooks via Supabase Edge Functions
- **Calendar/Meet**: Google Calendar API + Meet API via service account
- **Email**: Supabase Auth emails + Resend (for transactional/reminders)
- **Deployment**: Vercel (Next.js) + Supabase Cloud

## Tech Decisions
- **Component library**: shadcn/ui (Tailwind-based, customizable)
- **Form handling**: react-hook-form + zod validation
- **Date/time**: date-fns (TZ-aware)
- **Calendar component**: react-big-calendar
- **State management**: React Context only (no Zustand; keep it simple)
- **API layer**: Next.js Server Actions + Supabase client (@supabase/ssr helpers)
- **Real-time**: Defer to Phase 2 (not needed for MVP)
- **Feature flags**: Environment variables (simple; 2-3 flags only)
- **Color palette**: Sequential from predefined set (10-15 distinct colors)

### Onboarding & Placement
- Single onboarding form: collect parent+student info together, timezone (browser auto-detect, default AEST in Supabase), program (JMSS-Y10/JMSS-Y11), program interest, plan selection, when2meet-style availability (general grid + date overrides), consent checkbox (contact, mailing list, recording, progress data). Fields: student motivation for JMSS, teaching preference, general free days, days with recurring commitments, open notes.
- On submit: create parent + linked student accounts from the one form; both start `pending_customer`.
- Stripe payment required before placement; payment failure keeps `pending_customer` for 14 days then auto-moves to `inactive_customer` with notices at days 1/3/7/14.
- Payment success: auto-place into a cohort that matches availability and capacity via matching algorithm; if none, waitlist (admin may open new cohort; enrollment allowed up to 4 weeks from cohort start). Capacity blocks placement when full.
- **Cohort enrollment**: auto-enroll in Content class (creates bookings + pre-populates attendance as NULL); student **later selects** which Applied classes to attend via dashboard (post-onboarding).
- Placement modal (cohort name/color, schedule, start date, stable Meet link, capacity note, plan summary) → confirm → status `customer` (logged), Content event auto-enrollment (capacity-checked; blocks other cohorts).

## Dashboard Experience (post-onboarding)
- Upcoming classes with cohort color/icon, Meet link, "Attending" / "Not attending" buttons (not attending keeps roster fixed).
- **Applied event selection** (Phase 1 onward): browse available Applied events for enrolled cohort, select/deselect to create/remove bookings (creates booking + pre-populates attendance as NULL).
- Class schedule view (calendar/list): shows Content (auto-enrolled), Applied (manually selected), drop-ins (auto-enrolled for all program students, attendance optional).
- Edit weekly availability and upcoming overrides (when2meet-style grid + date overrides; Phase 2+).
- Consult bookings (hidden until Phase 2): book/cancel within rules.
- Reschedule requests (hidden until Phase 2): submit request, tutor/admin moves event.

## Scheduling & Booking
- Tutors: recurring availability + overrides; non-bookable blocks (marking/content/interview prep); meetings can include multiple tutors/admins.
- Admins: create recurring class events (1–3h) per cohort with stable Meet links; consult slots are 1:1 (≥30m) with per-booking Meet links.
- Capacity/conflict checks enforced; cohort enrollment blocks other cohorts; soft plan checks (warn/allow).

## Calendar & Meet (Service Account)
- Service-account-owned Google Calendar; events created/updated there; attendees added by email receive invites to personal calendars.
- Cohort events reuse stable Meet link; consults generate per-booking links.
- Supabase is source of truth; Google invite is a mirror; reconciliation job + backoff on errors; TZ-safe and DST-aware; ICS fallback optional.

## Payments / Plans
- Stripe payment confirmation gates cohort placement.
- Payment failures: stay `pending_customer`, auto-expire to `inactive_customer` after 14 days with notices at days 1/3/7/14.
- Track plan selection and entitlements; soft guardrails now; parent is payer; later enforcement via Stripe.

## Status & Audit
- Status enums: `pending_customer` (awaiting payment), `customer` (active, paid), `inactive_customer` (payment expired, churned, or admin-deactivated).
- `pending_customer` auto-expires to `inactive_customer` after 14 days without payment (notices at days 1/3/7/14; implemented Phase 3).
- Separate status table + history: user_id, old_status, new_status, changed_at, changed_by, reason.
- Status changes only via admin/service logic; timestamps logged.

## Admin Ops
- Full tutor capabilities plus: manage programs/cohorts/events, capacities, moves/reschedules, statuses, payments/placement, reports (attendance/utilization), approve reschedule requests.

## Data Model Highlights
- **programs** (e.g., JMSS-Y10, JMSS-Y11); **cohorts** (e.g., JMSS-Y10-1; belongs to program; has color from sequential palette, capacity, stable Meet link auto-generated via Google API).
- **cohort_tutors** (junction table: cohort_id, tutor_id; many-to-many relationship).
- **events** (e.g., JMSS-Y10-1 Content [required], JMSS-Y10-1 Applied 1 [optional], JMSS-Y10-1 Applied 2 [optional]; multiple per cohort):
  - Columns: cohort_id OR program_id (for drop-ins), title, start_time, end_time, event_type [content|applied|drop-in|consult], is_required [boolean], capacity, recurrence_pattern [JSON: {day: 'monday', time: '17:00', freq: 'weekly'}], recurrence_end_date
  - **Content events**: auto-enrollment when student assigned to cohort
  - **Applied events**: student manually selects which to attend
- **Cohort start date**: derived as MIN(events.start_time) for that cohort (affects 4-week enrollment window).
- **Drop-in classes**: program-level events (e.g., JMSS-Y10 drop-in); unlimited capacity by default with optional limit. **Auto-enrollment**: when drop-in event created, system auto-creates `event_bookings` for ALL students in that program; attendance pre-populated as NULL. **Not mandatory**: students can choose to attend or not; tutor marks who attended.
- **event_bookings** (user_id, event_id, booked_at; auto-created for Content events on cohort enrollment, drop-ins on event creation; manually created for Applied/consults only).
- **attendance** (user_id, event_id, status [NULL|attending|not_attending], marked_by, marked_at):
  - **Content/Applied/Drop-in events**: pre-populated as NULL on booking creation; tutor marks attending/not_attending (NULL = did not attend).
- **parent_student_links** (auto-created during onboarding); **plans**; **user_plan** (includes booked_hours vs plan limit; warn at 90%); **notification_preferences**.
- **user_availability** (user_id, JSONB: {weekly_grid: boolean[][], consult_available_grid: boolean[][], date_overrides: {}}):
  - `weekly_grid`: general availability (30min slots, 6am-10pm, 7 days)
  - `consult_available_grid`: tutor-only; marks which times are available for consult bookings
  - System generates `consult_slots` records from `consult_available_grid`
- **consult_slots** (id, tutor_id, start_time, end_time, is_booked; auto-generated from tutor's `consult_available_grid`, bookable by students).
- **user_status_history** (audit log; user_id, old_status, new_status, changed_at, changed_by, reason).
- **cohort_waitlist** (user, cohort, waitlisted_at, notes); **reschedule_requests** (user_id, event_id, requested_at, notes).
- **not_attending_tokens** (UUID, user_id, event_id, created_at, expires_at).
- **User roles**: strictly one role per account (parent, student, tutor, or admin); no multi-role accounts.
- **Removed tables**: `recurring_events` (merged into events), `user_status` (merged into profiles.status), `tutor_time_blocks` (use events with type='consult_availability').

## RLS Highlights
- **Parents**: manage finances/payments for linked students; otherwise same permissions as students (edit availability, view schedule, manage bookings/attendance).
- **Students**: edit own availability, view own events, manage own bookings/attendance; **cannot** manage finances/payments.
- **Tutors**: own availability/consults/time blocks (visible to tutors + admins only); their events; attendance marking; **can move events to reschedule students**.
- **Admins**: service-role/admin policies for full CRUD/overrides; **can place students over cohort capacity limits**; **can move events to reschedule students**.
- **One role per account**: no multi-role support; each user has exactly one role.

## Phase 1: Core Foundation (MVP)
**Goal:** Minimal working system for cohort placement and attendance tracking.

**Scope:**
- **Next.js setup**: App Router, TypeScript, Tailwind, shadcn/ui components.
- **Supabase setup**: Project, database schema, auth config, RLS policies.
- **Auth/roles**: Supabase Auth with custom JWT claims (`role: parent | student | tutor | admin`); auth helpers for Server Components/Actions.
- **Database schema**:
  - `profiles` (extends Supabase auth.users; timezone [default 'Australia/Melbourne'], role [enum: parent|student|tutor|admin], status [enum: pending_customer|customer|inactive_customer], created_at)
  - `programs`, `cohorts` (program_id, name, color [from sequential palette: #FF6B6B, #4ECDC4, #45B7D1, #FFA07A, #98D8C8, #F7DC6F, #BB8FCE, #85C1E2, #F8B88B, #ABEBC6], capacity, stable_meet_link [auto-generated via Google Meet API])
  - `cohort_tutors` (cohort_id, tutor_id; junction table)
  - `events` (cohort_id OR program_id for drop-ins, title, start_time, end_time, event_type [enum: content|applied|drop-in|consult], is_required [boolean; TRUE for content], capacity, recurrence_pattern [JSONB: {day, time, freq}], recurrence_end_date)
  - `event_bookings` (user_id, event_id, booked_at; auto-created for content events on cohort enrollment)
  - `attendance` (user_id, event_id, status [NULL|attending|not_attending], marked_by, marked_at; pre-populated NULL on booking)
  - `parent_student_links`, `user_status_history` (audit only), `user_plan`, `user_availability` (JSONB: {weekly_grid: boolean[][], date_overrides: {}})
  - `cohort_waitlist`, `reschedule_requests`, `not_attending_tokens`, `consult_slots`, `notification_preferences`
- **RLS policies** (using @supabase/ssr helpers):
  - Parents: SELECT/UPDATE on linked students' data (except payments); INSERT/UPDATE on own payments
  - Students: SELECT/UPDATE own data (no payment access)
  - Tutors: SELECT/UPDATE own availability (via `user_availability`); INSERT/UPDATE attendance for their assigned events (via `cohort_tutors`); UPDATE events (move times)
  - Admins: full access via service role key in Server Actions
  - One role per user (stored in `profiles.role`)
- **Admin UI** (protected route `/admin`):
  - Manual account creation form: create parent + **one linked student** with react-hook-form + zod (**Phase 1 limit; multi-student noted for future**)
  - Program/cohort/event management (CRUD with Server Actions)
  - **Cohort creation**: auto-generate stable Meet link via Google Meet API; assign color from sequential palette
  - Event creation: day-of-week picker, time input, duration, timezone select, recurrence end date; mark as content (required) or applied (optional)
  - **Manual placement**: admin selects cohort from dropdown (no auto-matching in Phase 1); auto-creates bookings + pre-populates attendance (NULL) for Content events only; student selects Applied events later in dashboard
  - **Drop-in event creation**: when admin creates drop-in event (program-level), system auto-creates bookings + pre-populates attendance (NULL) for ALL students in that program
  - Attendance view/override (for all event types; all pre-populated)
- **Student/Parent dashboard** (`/dashboard`):
  - **Applied event selection**: view available Applied events for enrolled cohort, select/deselect (Server Action creates/deletes `event_bookings` + pre-populates attendance)
  - Upcoming events (Content + selected Applied + drop-ins) fetched via Supabase client; **drop-ins auto-enrolled** (all program students)
  - Schedule view (list/calendar using react-big-calendar); **times displayed in user's timezone only**
  - "Attending"/"Not attending" toggle (updates `attendance` table via Server Action; works for all event types with bookings)
- **Tutor UI** (`/tutor`):
  - **Availability input**: when2meet-style grid (30min slots, 6am-10pm); stored in `user_availability.weekly_grid` JSONB
  - **Consult availability**: same grid component, separate toggle mode to mark times as "available for consults"; stored in `user_availability.consult_available_grid` JSONB; system auto-generates `consult_slots` records
  - **Attendance marking** for assigned events (via `cohort_tutors` relationship):
    - View full roster (all students with pre-populated attendance records as NULL)
    - Mark who attended: NULL → attending (students not marked remain NULL = did not attend)
    - Works for Content, Applied, and drop-in events (all pre-populated)
  - Event management: move events to different times (UPDATE events.start_time/end_time via Server Action)
- **Feature flags**: environment variables (NEXT_PUBLIC_ENABLE_CONSULTS=false, NEXT_PUBLIC_ENABLE_RESCHEDULE=false); hide UI in Phase 1.
- **Capacity checks**: PostgreSQL constraints + application logic in Server Actions; admins can override.
- **Booking window**: consults bookable up to **4 weeks** in advance.

**Payment:** Manual (admin verifies externally, flips status in admin UI).

**Out of scope:** Automated onboarding, Stripe, Google Calendar sync, consults (UI hidden; slots table exists).

**Deliverable:** Working Next.js app with Supabase backend; admins create programs/cohorts/events in UI; tutors set availability with when2meet grid; students/parents see schedule in their TZ; tutors mark attendance + move events.

**Initial setup:** No seed data; admins create JMSS-Y10, JMSS-Y11 programs via UI.

**Tech tasks:**
- Set up Supabase RLS policies, database migrations
- Build auth middleware for role-based route protection (@supabase/ssr)
- **When2meet grid component** (30min slots, drag selection; toggle mode for consult availability; used by tutors + students in Phase 1/2)
- Create reusable shadcn/ui components (DataTable, react-big-calendar, Forms)
- Server Actions for mutations (createAccount, assignCohort, selectAppliedEvent, markAttendance, moveEvent, createDropInEvent, etc.)
- **Drop-in auto-enrollment**: trigger or Server Action to auto-create bookings + attendance for all program students when drop-in event created
- Google Meet API integration (auto-generate stable links for cohorts)
- Sequential color palette implementation (10 predefined colors)
- **Consult slots generation**: background job or trigger to generate `consult_slots` from tutor's `consult_available_grid`

---

## Phase 2: Self-Service Onboarding & Scheduling
**Goal:** Automated onboarding and full scheduling features.

**Scope:**
- **Onboarding flow** (`/onboarding`):
  - Multi-step form (react-hook-form + zod): parent info → **one student** info → program/plan → availability → consent
  - Parent email + student email → Server Action creates both Supabase Auth users, profiles, `parent_student_link` row
  - Both start as `pending_customer` status
  - **Timezone**: browser auto-detect (Intl.DateTimeFormat().resolvedOptions().timeZone); fallback to 'Australia/Melbourne' (AEST)
  - **When2meet-style availability grid** (reuse component from Phase 1 tutor UI):
    - Component: 7-day weekly grid (**30min slots**, 6am-10pm = 32 slots/day × 7 days = 224 slots); click/drag to select
    - Store as JSONB in `user_availability` table: `{weekly_grid: boolean[][], date_overrides: {date: boolean[][]}}`
    - Date overrides for specific days (e.g., "not available Dec 25")
  - Redirect to Stripe Checkout (manual link for now; webhook in Phase 4)
  - **Payment retry flow**: if user already exists as `pending_customer`, onboarding form redirects to payment page only (no re-entry of data)
- **Auto-placement algorithm** (**PostgreSQL function**; new in Phase 2):
  - Input: user_id (with availability grid), program_id, timezone
  - Query cohorts with capacity, matching program
  - Score each cohort: overlap % between user grid and cohort event times (converted to user TZ)
  - Place in highest-scoring cohort with capacity; if tie, choose least-full cohort
  - If no match (overlap < threshold), add to `cohort_waitlist`
  - **4-week window**: check `MIN(events.start_time WHERE cohort_id = X) - now() <= 28 days` for auto-placement (cohort start = first event date)
  - **Enrollment**: auto-create bookings + attendance records (NULL status) for Content events only; students select Applied events post-onboarding via dashboard
- **Placement modal**: Next.js dialog (shadcn/ui Dialog) showing cohort details; confirm via Server Action
- **Waitlist UI** (admin):
  - View waitlisted users, manually assign to cohort
  - Open new cohort wizard
- **Availability editing** (`/dashboard/availability`):
  - Reuse when2meet grid component
  - Update `user_availability` JSONB via Server Action
- **Consult booking** (`/dashboard/consults`):
  - View available consult slots (query `consult_slots` auto-generated from tutors' `consult_available_grid`)
  - Book/cancel (Server Actions with validation); **cancel allowed up to 24hrs before consult**; booking creates `event_bookings` + pre-populates attendance
  - Generate per-booking Meet link (defer to Phase 3 or stub for now)
- **Reschedule requests** (`/dashboard/reschedule`):
  - User submits reschedule request (insert `reschedule_requests` row with event_id, notes)
  - **Tutors/admins handle rescheduling**: view requests in `/tutor/reschedules` or `/admin/reschedules`, move event to different time via drag-drop or time picker
  - **Only tutors/admins can move events**; students cannot self-reschedule
- **Soft plan checks**: Server Action warns at **90%** of plan hours; allow override.
- **Realtime updates** (new in Phase 2): Supabase Realtime subscriptions for waitlist/booking updates (live dashboard).

**Deliverable:** Public onboarding flow; users auto-placed or waitlisted; availability editing; consult/reschedule flows live.

**Tech tasks:**
- Reuse when2meet grid component from Phase 1 (already built for tutors; add for students)
- **Auto-placement PostgreSQL function** (PL/pgSQL or SQL with scoring logic; overlap % only, tie-breaker = least full cohort)
- Stripe Checkout integration (manual flow; Sessions API); payment retry page
- JSONB queries for availability matching in PostgreSQL function
- Supabase Realtime subscriptions for waitlist/booking updates
- Applied event selection UI in dashboard (students select/deselect Applied events post-onboarding)

---

## Phase 3: Admin Operations & Calendar Integration
**Goal:** Full admin tooling and automated calendar/Meet sync.

**Scope:**
- **Admin dashboard enhancements** (`/admin`):
  - Reports: attendance % by cohort, utilization (booked/capacity), capacity heatmap
  - Reschedule queue: view pending `reschedule_requests`, move event to new time (drag-drop or time picker)
  - Status management: bulk actions (e.g., deactivate inactive users)
  - Data tables with filtering/sorting (shadcn/ui Table + TanStack Table)
- **Google Calendar sync** (Supabase Edge Function, **pg_cron** scheduled):
  - **Service account**: use existing `tutors@jaycetutoring.com` (Google Workspace, Calendar API, Meet API scopes)
  - On event create/update in Supabase: upsert Google Calendar event, add attendees by email
  - **Stable Meet links**: cohort events reuse `cohorts.stable_meet_link` (set once, never changes)
  - **Per-booking Meet links**: consult bookings generate new Meet link via API
  - Store `google_event_id` in `events` table for reconciliation
  - **Reconciliation job** (runs **hourly via pg_cron**):
    - Query Supabase events with `google_event_id`
    - Fetch from Google Calendar API
    - If missing in Google: recreate; if diverged (attendees, time): **update Google to match Supabase** (Supabase = source of truth)
    - Exponential backoff on API errors
  - **TZ/DST handling**: store times in UTC; convert to user TZ for display (user sees their TZ only)
- **Email system** (**Resend** via Supabase Edge Functions):
  - Booking confirmation: on placement, send email with cohort details, Meet link
  - Reminders: **pg_cron job** checks events starting in 24h/1h, sends emails to attendees
  - "Not attending" link: **UUID token** in `not_attending_tokens` table → Server Action validates token, updates `attendance` (status = `not_attending`), doesn't remove from Google Calendar (keeps roster fixed)
  - **Payment failure handling**: **pg_cron job** checks `pending_customer` users; send **email-only notices** at days 1/3/7/14 via Resend; flip to `inactive_customer` on day 14
- **Email templates**: React Email components, rendered server-side

**Deliverable:** Admins have reports/approval tools; Google Calendar auto-syncs; emails sent for bookings/reminders/failures.

**Tech tasks:**
- Google service account `tutors@jaycetutoring.com` setup, OAuth2, Calendar/Meet API integration
- Supabase Edge Functions for calendar sync (create, update, reconcile)
- **Supabase pg_cron jobs**: hourly reconciliation, 24h/1h reminders, daily payment expiry check
- Resend integration (API key in env, React Email templates)
- `not_attending_tokens` table with UUID generation (crypto.randomUUID)

---

## Phase 4: Payments & Polish
**Goal:** Stripe integration, payment-gated placement, final production readiness.

**Scope:**
- **Stripe webhook** (Supabase Edge Function at `/functions/stripe-webhook`):
  - Listen for `checkout.session.completed` event
  - Verify signature, extract customer email + metadata (user_id, program)
  - Update user status `pending_customer` → `customer`
  - Trigger auto-placement algorithm (call existing Phase 2 logic)
  - Send placement confirmation email
- **Payment flow**:
  - Onboarding form → Server Action creates Stripe Checkout Session with user_id in metadata
  - Redirect to Stripe-hosted checkout
  - Success URL: `/onboarding/success?session_id=xxx` → poll for placement status
  - Cancel URL: `/onboarding` (stays `pending_customer`, can retry)
- **Plan entitlement**:
  - Track hours booked vs plan limit in `user_plan` table
  - **Soft guardrails only**: warn if approaching limit; **defer hard enforcement post-launch**
- **Polish**:
  - Error boundaries (Next.js error.tsx)
  - Loading states (Suspense, skeleton components from shadcn/ui)
  - Mobile: responsive Tailwind breakpoints, touch-friendly when2meet grid
  - Accessibility: ARIA labels, keyboard navigation, focus management
  - Dark mode (Tailwind dark:, toggle in header)
- **QA**:
  - End-to-end tests (Playwright): onboarding flow, payment, placement, booking, attendance
  - Unit tests (Vitest): Server Actions, availability matching algorithm
  - Manual testing: cross-browser, mobile devices
- **Deploy**:
  - Vercel production deployment (env vars for Supabase, Stripe, Google, Resend)
  - Supabase production project (migrations, RLS enabled)
  - Domain + SSL, analytics (Vercel Analytics or Plausible)

**Deliverable:** Fully automated payment-to-placement; production-ready, accessible, tested app.

**Tech tasks:**
- Stripe webhook Edge Function with signature verification
- Playwright E2E test suite
- Production deployment checklist (env vars, migrations, DNS)

**Deferred to post-launch:**
- Capacity hold during checkout
- Hard plan entitlement enforcement
- ICS file download fallback

---

## Phased Deployment Strategy
- **Phase 1:** Internal use only (admins manually place paid customers).
- **Phase 2:** Limited pilot (select parents/students onboard; payment auto-places or waitlists, admin opens cohorts as needed).
- **Phase 3:** Open to broader cohort (calendar sync + reminders reduce admin overhead).
- **Phase 4:** Full public launch (payment-gated, self-service).

## Unresolved Questions (by Phase)

**Phase 1:**
- ✓ All major decisions confirmed
- ✓ State management: React Context only
- ✓ Realtime: defer to Phase 2
- ✓ Date library: date-fns
- ✓ Calendar: react-big-calendar
- ✓ Feature flags: env vars
- ✓ Colors: sequential palette (10 predefined colors)
- ✓ Supabase: @supabase/ssr helpers
- ✓ Timezone: browser auto-detect, default AEST
- ✓ Parent creates one student (multi-student future consideration)
- ✓ Tutors use when2meet in Phase 1
- ✓ Cohort enrollment: auto-enroll Content, manually select Applied
- ✓ Attendance: pre-populate NULL, tutor marks
- ✓ Meet links: auto-generate via Google API
- ✓ Recurrence: simple JSON (no separate table)

**Phase 2:**
- ✓ All decisions confirmed
- ✓ Soft plan warning: 90% threshold
- ✓ Booking window: 4 weeks in advance
- ✓ Realtime: added in Phase 2
- ✓ Auto-placement scoring: overlap % only, tie-breaker = least full cohort (simple approach)
- ✓ Applied event selection: post-onboarding in dashboard (students can add/remove anytime)
- ✓ Consult slots: auto-generated from `consult_available_grid` JSONB
- ✓ Drop-ins: auto-enrolled for all program students, attendance pre-populated (NULL), not mandatory

**Phase 3:**
- ✓ All major decisions confirmed
- Email content: branding, fields (Meet link, cohort color/icon, "not attending" link, reschedule note).
- React Email templates: design/copy needed (deferred to Phase 3 start).

**Phase 4:**
- ✓ All major decisions confirmed
- Stripe flow: product/plan SKUs, one-time vs subscription, webhook contract (deferred to Phase 4 start).

**Future Considerations (post-launch):**
- Parent creates multiple students in one form
- Capacity hold during Stripe checkout
- Hard plan entitlement enforcement
- ICS file download fallback
