import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { AvailabilityClient } from "./availability-client";
import { getTimeSlotCount } from "@/lib/utils";

async function saveAvailability(weeklyGrid: boolean[][]) {
  "use server";

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Not authenticated" };
  }

  // Upsert availability
  const { error } = await supabase
    .from("user_availability")
    .upsert({
      user_id: user.id,
      weekly_grid: weeklyGrid,
      updated_at: new Date().toISOString(),
    }, {
      onConflict: "user_id",
    });

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/dashboard/availability");
  return {};
}

export default async function AvailabilityPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return null;

  // Get current availability
  const { data: availability } = await supabase
    .from("user_availability")
    .select("weekly_grid")
    .eq("user_id", user.id)
    .single();

  const slotCount = getTimeSlotCount();
  const initialGrid = availability?.weekly_grid as boolean[][] ||
    Array(7).fill(null).map(() => Array(slotCount).fill(false));

  return (
    <AvailabilityClient
      initialGrid={initialGrid}
      saveAvailability={saveAvailability}
    />
  );
}
