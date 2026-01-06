-- Fix the update_leaderboard_on_progress function to use correct unique constraint
CREATE OR REPLACE FUNCTION public.update_leaderboard_on_progress()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_lessons_count integer;
  v_assessment_score integer;
  v_total_points integer;
  v_program_id uuid;
BEGIN
  -- Get the program_id from the lesson
  SELECT program_id INTO v_program_id
  FROM public.lessons
  WHERE id = COALESCE(NEW.lesson_id, OLD.lesson_id);

  -- Count completed lessons for this user in this program
  SELECT COUNT(*) INTO v_lessons_count
  FROM public.lesson_progress lp
  JOIN public.lessons l ON l.id = lp.lesson_id
  WHERE lp.user_id = COALESCE(NEW.user_id, OLD.user_id)
    AND l.program_id = v_program_id
    AND lp.completed_at IS NOT NULL;
  
  -- Sum assessment scores for this user in this program
  SELECT COALESCE(SUM(s.score), 0) INTO v_assessment_score
  FROM public.assessment_submissions s
  JOIN public.assessments a ON a.id = s.assessment_id
  WHERE s.user_id = COALESCE(NEW.user_id, OLD.user_id)
    AND a.program_id = v_program_id
    AND s.score IS NOT NULL;
  
  -- Calculate total points (10 per lesson + assessment scores)
  v_total_points := (v_lessons_count * 10) + v_assessment_score;
  
  -- Update or insert leaderboard entry for this program
  INSERT INTO public.leaderboard (user_id, program_id, lessons_completed, total_points, updated_at)
  VALUES (COALESCE(NEW.user_id, OLD.user_id), v_program_id, v_lessons_count, v_total_points, now())
  ON CONFLICT (user_id, program_id) 
  DO UPDATE SET 
    lessons_completed = v_lessons_count,
    total_points = v_total_points,
    updated_at = now();
  
  RETURN COALESCE(NEW, OLD);
END;
$function$;

-- Fix the update_leaderboard_on_assessment function as well
CREATE OR REPLACE FUNCTION public.update_leaderboard_on_assessment()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_lessons_count integer;
  v_assessment_score integer;
  v_total_points integer;
  v_program_id uuid;
BEGIN
  -- Get the program_id from the assessment
  SELECT program_id INTO v_program_id
  FROM public.assessments
  WHERE id = COALESCE(NEW.assessment_id, OLD.assessment_id);

  -- Count completed lessons for this user in this program
  SELECT COUNT(*) INTO v_lessons_count
  FROM public.lesson_progress lp
  JOIN public.lessons l ON l.id = lp.lesson_id
  WHERE lp.user_id = COALESCE(NEW.user_id, OLD.user_id)
    AND l.program_id = v_program_id
    AND lp.completed_at IS NOT NULL;
  
  -- Sum assessment scores for this user in this program
  SELECT COALESCE(SUM(s.score), 0) INTO v_assessment_score
  FROM public.assessment_submissions s
  JOIN public.assessments a ON a.id = s.assessment_id
  WHERE s.user_id = COALESCE(NEW.user_id, OLD.user_id)
    AND a.program_id = v_program_id
    AND s.score IS NOT NULL;
  
  -- Calculate total points (10 per lesson + assessment scores)
  v_total_points := (v_lessons_count * 10) + v_assessment_score;
  
  -- Update or insert leaderboard entry for this program
  INSERT INTO public.leaderboard (user_id, program_id, lessons_completed, total_points, updated_at)
  VALUES (COALESCE(NEW.user_id, OLD.user_id), v_program_id, v_lessons_count, v_total_points, now())
  ON CONFLICT (user_id, program_id) 
  DO UPDATE SET 
    lessons_completed = v_lessons_count,
    total_points = v_total_points,
    updated_at = now();
  
  RETURN COALESCE(NEW, OLD);
END;
$function$;