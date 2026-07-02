
-- Function to update leaderboard when lesson progress changes
CREATE OR REPLACE FUNCTION public.update_leaderboard_on_progress()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_lessons_count integer;
  v_assessment_score integer;
  v_total_points integer;
BEGIN
  -- Count completed lessons for this user
  SELECT COUNT(*) INTO v_lessons_count
  FROM public.lesson_progress
  WHERE user_id = COALESCE(NEW.user_id, OLD.user_id)
    AND completed_at IS NOT NULL;
  
  -- Sum assessment scores for this user
  SELECT COALESCE(SUM(score), 0) INTO v_assessment_score
  FROM public.assessment_submissions
  WHERE user_id = COALESCE(NEW.user_id, OLD.user_id)
    AND score IS NOT NULL;
  
  -- Calculate total points (10 per lesson + assessment scores)
  v_total_points := (v_lessons_count * 10) + v_assessment_score;
  
  -- Update or insert leaderboard entry
  INSERT INTO public.leaderboard (user_id, lessons_completed, total_points, updated_at)
  VALUES (COALESCE(NEW.user_id, OLD.user_id), v_lessons_count, v_total_points, now())
  ON CONFLICT (user_id) 
  DO UPDATE SET 
    lessons_completed = v_lessons_count,
    total_points = v_total_points,
    updated_at = now();
  
  RETURN COALESCE(NEW, OLD);
END;
$$;

-- Function to update leaderboard when assessment submission changes
CREATE OR REPLACE FUNCTION public.update_leaderboard_on_assessment()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_lessons_count integer;
  v_assessment_score integer;
  v_total_points integer;
BEGIN
  -- Count completed lessons for this user
  SELECT COUNT(*) INTO v_lessons_count
  FROM public.lesson_progress
  WHERE user_id = COALESCE(NEW.user_id, OLD.user_id)
    AND completed_at IS NOT NULL;
  
  -- Sum assessment scores for this user
  SELECT COALESCE(SUM(score), 0) INTO v_assessment_score
  FROM public.assessment_submissions
  WHERE user_id = COALESCE(NEW.user_id, OLD.user_id)
    AND score IS NOT NULL;
  
  -- Calculate total points (10 per lesson + assessment scores)
  v_total_points := (v_lessons_count * 10) + v_assessment_score;
  
  -- Update or insert leaderboard entry
  INSERT INTO public.leaderboard (user_id, lessons_completed, total_points, updated_at)
  VALUES (COALESCE(NEW.user_id, OLD.user_id), v_lessons_count, v_total_points, now())
  ON CONFLICT (user_id) 
  DO UPDATE SET 
    lessons_completed = v_lessons_count,
    total_points = v_total_points,
    updated_at = now();
  
  RETURN COALESCE(NEW, OLD);
END;
$$;

-- Create triggers
DROP TRIGGER IF EXISTS on_lesson_progress_change ON public.lesson_progress;
CREATE TRIGGER on_lesson_progress_change
  AFTER INSERT OR UPDATE OR DELETE ON public.lesson_progress
  FOR EACH ROW
  EXECUTE FUNCTION public.update_leaderboard_on_progress();

DROP TRIGGER IF EXISTS on_assessment_submission_change ON public.assessment_submissions;
CREATE TRIGGER on_assessment_submission_change
  AFTER INSERT OR UPDATE ON public.assessment_submissions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_leaderboard_on_assessment();

-- Add program_id to leaderboard for program-specific rankings
ALTER TABLE public.leaderboard ADD COLUMN IF NOT EXISTS program_id uuid REFERENCES public.programs(id);

-- Create unique constraint for user per program
ALTER TABLE public.leaderboard DROP CONSTRAINT IF EXISTS leaderboard_user_id_key;
ALTER TABLE public.leaderboard ADD CONSTRAINT leaderboard_user_program_unique UNIQUE (user_id, program_id);
