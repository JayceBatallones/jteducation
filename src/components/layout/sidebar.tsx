"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn, FEATURE_FLAGS } from "@/lib/utils";
import {
  LayoutDashboard,
  Users,
  Calendar,
  BookOpen,
  Settings,
  GraduationCap,
  Clock,
  ClipboardCheck,
  ListTodo,
  CalendarClock,
  BarChart3,
  UserCog,
  MessageSquare,
} from "lucide-react";

interface SidebarLink {
  href: string;
  label: string;
  icon: React.ReactNode;
}

interface SidebarProps {
  links: SidebarLink[];
}

export function Sidebar({ links }: SidebarProps) {
  const pathname = usePathname();

  return (
    <aside className="fixed left-0 top-14 z-30 h-[calc(100vh-3.5rem)] w-64 border-r bg-background">
      <nav className="flex flex-col gap-2 p-4">
        {links.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className={cn(
              "flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors",
              pathname === link.href || pathname.startsWith(link.href + "/")
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
            )}
          >
            {link.icon}
            {link.label}
          </Link>
        ))}
      </nav>
    </aside>
  );
}

// Helper to build links based on feature flags
function buildAdminLinks(): SidebarLink[] {
  const links: SidebarLink[] = [
    { href: "/admin", label: "Dashboard", icon: <LayoutDashboard className="h-4 w-4" /> },
    { href: "/admin/reports", label: "Reports", icon: <BarChart3 className="h-4 w-4" /> },
    { href: "/admin/users", label: "Users", icon: <Users className="h-4 w-4" /> },
    { href: "/admin/status", label: "Status Mgmt", icon: <UserCog className="h-4 w-4" /> },
    { href: "/admin/waitlist", label: "Waitlist", icon: <ListTodo className="h-4 w-4" /> },
  ];

  // Only show reschedules if feature flag is enabled
  if (FEATURE_FLAGS.ENABLE_RESCHEDULE) {
    links.push({ href: "/admin/reschedules", label: "Reschedules", icon: <CalendarClock className="h-4 w-4" /> });
  }

  links.push(
    { href: "/admin/programs", label: "Programs", icon: <BookOpen className="h-4 w-4" /> },
    { href: "/admin/cohorts", label: "Cohorts", icon: <GraduationCap className="h-4 w-4" /> },
    { href: "/admin/events", label: "Events", icon: <Calendar className="h-4 w-4" /> },
    { href: "/admin/attendance", label: "Attendance", icon: <ClipboardCheck className="h-4 w-4" /> }
  );

  return links;
}

function buildTutorLinks(): SidebarLink[] {
  const links: SidebarLink[] = [
    { href: "/tutor", label: "Dashboard", icon: <LayoutDashboard className="h-4 w-4" /> },
    { href: "/tutor/availability", label: "Availability", icon: <Clock className="h-4 w-4" /> },
    { href: "/tutor/events", label: "My Events", icon: <Calendar className="h-4 w-4" /> },
  ];

  // Only show reschedules if feature flag is enabled
  if (FEATURE_FLAGS.ENABLE_RESCHEDULE) {
    links.push({ href: "/tutor/reschedules", label: "Reschedules", icon: <CalendarClock className="h-4 w-4" /> });
  }

  links.push({ href: "/tutor/attendance", label: "Attendance", icon: <ClipboardCheck className="h-4 w-4" /> });

  return links;
}

function buildStudentLinks(): SidebarLink[] {
  const links: SidebarLink[] = [
    { href: "/dashboard", label: "Dashboard", icon: <LayoutDashboard className="h-4 w-4" /> },
    { href: "/dashboard/schedule", label: "Schedule", icon: <Calendar className="h-4 w-4" /> },
    { href: "/dashboard/events", label: "Applied Events", icon: <BookOpen className="h-4 w-4" /> },
    { href: "/dashboard/availability", label: "Availability", icon: <Clock className="h-4 w-4" /> },
  ];

  // Only show consults if feature flag is enabled
  if (FEATURE_FLAGS.ENABLE_CONSULTS) {
    links.push({ href: "/dashboard/consults", label: "Consults", icon: <MessageSquare className="h-4 w-4" /> });
  }

  // Only show reschedule if feature flag is enabled
  if (FEATURE_FLAGS.ENABLE_RESCHEDULE) {
    links.push({ href: "/dashboard/reschedule", label: "Reschedule", icon: <CalendarClock className="h-4 w-4" /> });
  }

  links.push({ href: "/dashboard/settings", label: "Settings", icon: <Settings className="h-4 w-4" /> });

  return links;
}

// Predefined link sets for different roles - built dynamically based on feature flags
export const adminLinks: SidebarLink[] = buildAdminLinks();
export const tutorLinks: SidebarLink[] = buildTutorLinks();
export const studentLinks: SidebarLink[] = buildStudentLinks();

// Parents see the same links as students (they manage their linked student's account)
export const parentLinks: SidebarLink[] = buildStudentLinks();
