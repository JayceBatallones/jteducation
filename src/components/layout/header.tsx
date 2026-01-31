"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";
import { LogOut, User } from "lucide-react";
import type { Profile } from "@/types/database";

interface HeaderProps {
  user: Profile | null;
}

export function Header({ user }: HeaderProps) {
  const router = useRouter();
  const supabase = createClient();

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  };

  const roleColors: Record<string, string> = {
    admin: "bg-red-100 text-red-800",
    tutor: "bg-blue-100 text-blue-800",
    parent: "bg-green-100 text-green-800",
    student: "bg-purple-100 text-purple-800",
  };

  return (
    <header className="fixed top-0 z-40 w-full border-b bg-background">
      <div className="flex h-14 items-center justify-between px-4">
        <div className="flex items-center gap-4">
          <Link href="/" className="font-bold text-lg">
            JT Education
          </Link>
        </div>

        <div className="flex items-center gap-4">
          {user && (
            <>
              <div className="flex items-center gap-2">
                <span
                  className={`px-2 py-1 rounded-full text-xs font-medium ${
                    roleColors[user.role] || "bg-gray-100 text-gray-800"
                  }`}
                >
                  {user.role}
                </span>
                <span className="text-sm text-muted-foreground">
                  {user.full_name || user.email}
                </span>
              </div>
              <Button variant="ghost" size="icon" onClick={handleSignOut}>
                <LogOut className="h-4 w-4" />
              </Button>
            </>
          )}
          {!user && (
            <Link href="/login">
              <Button variant="outline" size="sm">
                <User className="h-4 w-4 mr-2" />
                Sign In
              </Button>
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
