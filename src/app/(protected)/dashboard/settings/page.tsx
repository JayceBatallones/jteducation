import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { SettingsClient } from "./settings-client";

async function updateProfile(formData: FormData) {
  "use server";

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) throw new Error("Not authenticated");

  const fullName = formData.get("full_name") as string;
  const timezone = formData.get("timezone") as string;

  const { error } = await supabase
    .from("profiles")
    .update({ full_name: fullName, timezone })
    .eq("id", user.id);

  if (error) throw new Error(error.message);
  revalidatePath("/dashboard/settings");
}

async function updateNotifications(formData: FormData) {
  "use server";

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) throw new Error("Not authenticated");

  const emailReminders = formData.get("email_reminders") === "on";
  const reminder24h = formData.get("reminder_24h") === "on";
  const reminder1h = formData.get("reminder_1h") === "on";

  // Upsert notification preferences
  const { error } = await supabase.from("notification_preferences").upsert({
    user_id: user.id,
    email_reminders: emailReminders,
    reminder_24h: reminder24h,
    reminder_1h: reminder1h,
  });

  if (error) throw new Error(error.message);
  revalidatePath("/dashboard/settings");
}

export default async function SettingsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const [{ data: profile }, { data: notifications }] = await Promise.all([
    supabase.from("profiles").select("*").eq("id", user.id).single(),
    supabase
      .from("notification_preferences")
      .select("*")
      .eq("user_id", user.id)
      .single(),
  ]);

  return (
    <SettingsClient
      profile={profile}
      notifications={notifications}
      updateProfile={updateProfile}
      updateNotifications={updateNotifications}
    />
  );
}
