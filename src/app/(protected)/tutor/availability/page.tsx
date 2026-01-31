import { createClient } from "@/lib/supabase/server";
import { AvailabilityForm } from "@/components/availability/availability-form";
import { revalidatePath } from "next/cache";
import type { AvailabilityGrid } from "@/types/database";

async function saveAvailability(userId: string, availability: AvailabilityGrid) {
  "use server";

  const supabase = await createClient();

  const { error } = await supabase
    .from("user_availability")
    .upsert({
      user_id: userId,
      availability,
      updated_at: new Date().toISOString(),
    }, {
      onConflict: "user_id",
    });

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/tutor/availability");
}

export default async function TutorAvailabilityPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return null;

  // Get existing availability
  const { data: availability } = await supabase
    .from("user_availability")
    .select("availability")
    .eq("user_id", user.id)
    .single();

  const handleSave = async (value: AvailabilityGrid) => {
    "use server";
    await saveAvailability(user.id, value);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Set Your Availability</h1>
        <p className="text-muted-foreground">
          Mark your weekly availability. This helps us schedule classes and
          allows students to book consults.
        </p>
      </div>

      <AvailabilityForm
        initialValue={availability?.availability as AvailabilityGrid | undefined}
        onSave={handleSave}
        showConsultAvailability
      />
    </div>
  );
}
