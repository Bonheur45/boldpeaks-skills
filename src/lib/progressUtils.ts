import { supabase } from "@/integrations/supabase/client";

export async function markLessonCompleted(params: { userId: string; lessonId: string }) {
  const { userId, lessonId } = params;
  const now = new Date().toISOString();

  const { data: existing, error: existingError } = await supabase
    .from("lesson_progress")
    .select("id")
    .eq("user_id", userId)
    .eq("lesson_id", lessonId)
    .limit(1)
    .maybeSingle();

  if (existingError) throw existingError;

  if (existing?.id) {
    const { error } = await supabase
      .from("lesson_progress")
      .update({
        completed: true,
        completed_at: now,
        progress_percentage: 100,
        updated_at: now,
      })
      .eq("id", existing.id);

    if (error) throw error;
    return;
  }

  const { error } = await supabase.from("lesson_progress").insert({
    user_id: userId,
    lesson_id: lessonId,
    completed: true,
    completed_at: now,
    progress_percentage: 100,
  });

  if (error) throw error;
}
