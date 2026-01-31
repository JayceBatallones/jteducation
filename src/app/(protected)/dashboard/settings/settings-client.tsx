"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import type { Profile } from "@/types/database";

interface NotificationPrefs {
  email_reminders: boolean;
  reminder_24h: boolean;
  reminder_1h: boolean;
}

interface SettingsClientProps {
  profile: Profile | null;
  notifications: NotificationPrefs | null;
  updateProfile: (formData: FormData) => Promise<void>;
  updateNotifications: (formData: FormData) => Promise<void>;
}

export function SettingsClient({
  profile,
  notifications,
  updateProfile,
  updateNotifications,
}: SettingsClientProps) {
  const [profileLoading, setProfileLoading] = useState(false);
  const [notifLoading, setNotifLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const handleProfileSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setProfileLoading(true);
    setMessage(null);
    try {
      await updateProfile(new FormData(e.currentTarget));
      setMessage("Profile updated");
    } catch {
      setMessage("Failed to update profile");
    }
    setProfileLoading(false);
  };

  const handleNotifSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setNotifLoading(true);
    setMessage(null);
    try {
      await updateNotifications(new FormData(e.currentTarget));
      setMessage("Notifications updated");
    } catch {
      setMessage("Failed to update notifications");
    }
    setNotifLoading(false);
  };

  const timezones = [
    "Australia/Melbourne",
    "Australia/Sydney",
    "Australia/Brisbane",
    "Australia/Perth",
    "Australia/Adelaide",
    "Pacific/Auckland",
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Settings</h1>
        <p className="text-muted-foreground">Manage your account preferences</p>
      </div>

      {message && (
        <div className="p-3 bg-primary/10 text-primary rounded-lg text-sm">
          {message}
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Profile</CardTitle>
          <CardDescription>Update your personal information</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleProfileSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                value={profile?.email || ""}
                disabled
                className="bg-muted"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="full_name">Full Name</Label>
              <Input
                id="full_name"
                name="full_name"
                defaultValue={profile?.full_name || ""}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="timezone">Timezone</Label>
              <select
                id="timezone"
                name="timezone"
                defaultValue={profile?.timezone || "Australia/Melbourne"}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                {timezones.map((tz) => (
                  <option key={tz} value={tz}>
                    {tz}
                  </option>
                ))}
              </select>
            </div>
            <Button type="submit" disabled={profileLoading}>
              {profileLoading ? "Saving..." : "Save Profile"}
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Notifications</CardTitle>
          <CardDescription>Configure email reminders</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleNotifSubmit} className="space-y-4">
            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                id="email_reminders"
                name="email_reminders"
                defaultChecked={notifications?.email_reminders ?? true}
                className="h-4 w-4"
              />
              <Label htmlFor="email_reminders">Enable email reminders</Label>
            </div>
            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                id="reminder_24h"
                name="reminder_24h"
                defaultChecked={notifications?.reminder_24h ?? true}
                className="h-4 w-4"
              />
              <Label htmlFor="reminder_24h">24-hour reminder</Label>
            </div>
            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                id="reminder_1h"
                name="reminder_1h"
                defaultChecked={notifications?.reminder_1h ?? true}
                className="h-4 w-4"
              />
              <Label htmlFor="reminder_1h">1-hour reminder</Label>
            </div>
            <Button type="submit" disabled={notifLoading}>
              {notifLoading ? "Saving..." : "Save Notifications"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
