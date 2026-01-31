import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { ProgramsClient } from "./programs-client";

async function createProgram(formData: FormData) {
  "use server";

  const supabase = await createClient();
  const name = formData.get("name") as string;
  const description = formData.get("description") as string;

  const { error } = await supabase.from("programs").insert({
    name,
    description: description || null,
  });

  if (error) throw new Error(error.message);
  revalidatePath("/admin/programs");
}

async function deleteProgram(id: string) {
  "use server";

  const supabase = await createClient();
  const { error } = await supabase.from("programs").delete().eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/admin/programs");
}

export default async function ProgramsPage() {
  const supabase = await createClient();

  const { data: programs } = await supabase
    .from("programs")
    .select("*, cohorts(count)")
    .order("name");

  return (
    <ProgramsClient
      programs={programs || []}
      createProgram={createProgram}
      deleteProgram={deleteProgram}
    />
  );
}
