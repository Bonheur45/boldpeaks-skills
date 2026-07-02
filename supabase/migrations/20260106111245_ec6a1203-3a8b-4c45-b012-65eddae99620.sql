-- Fix views to use SECURITY INVOKER instead of SECURITY DEFINER

-- Recreate assessment_questions_student view with SECURITY INVOKER
DROP VIEW IF EXISTS public.assessment_questions_student;
CREATE VIEW public.assessment_questions_student 
WITH (security_invoker = true)
AS
SELECT 
  id,
  assessment_id,
  question,
  question_text,
  question_type,
  options,
  points,
  display_order,
  sort_order,
  created_at
FROM public.assessment_questions;

-- Grant access to the view
GRANT SELECT ON public.assessment_questions_student TO authenticated;
GRANT SELECT ON public.assessment_questions_student TO anon;

-- Recreate content_blocks_student view with SECURITY INVOKER
DROP VIEW IF EXISTS public.content_blocks_student;
CREATE VIEW public.content_blocks_student 
WITH (security_invoker = true)
AS
SELECT 
  id,
  lesson_id,
  block_type,
  public.strip_quiz_answers(content, block_type) as content,
  sort_order,
  created_at,
  updated_at
FROM public.content_blocks;

-- Grant access to the view
GRANT SELECT ON public.content_blocks_student TO authenticated;
GRANT SELECT ON public.content_blocks_student TO anon;

-- Fix the strip_quiz_answers function search path
CREATE OR REPLACE FUNCTION public.strip_quiz_answers(content jsonb, block_type text)
RETURNS jsonb
LANGUAGE plpgsql
IMMUTABLE
SET search_path = public
AS $$
DECLARE
  result jsonb;
  questions jsonb;
  question jsonb;
  new_questions jsonb := '[]'::jsonb;
  i int;
BEGIN
  IF block_type != 'quiz' THEN
    RETURN content;
  END IF;
  
  IF content ? 'questions' THEN
    questions := content->'questions';
    FOR i IN 0..jsonb_array_length(questions)-1 LOOP
      question := questions->i;
      question := question - 'correctOptionId';
      new_questions := new_questions || jsonb_build_array(question);
    END LOOP;
    result := jsonb_set(content, '{questions}', new_questions);
  ELSE
    result := content;
  END IF;
  
  RETURN result;
END;
$$;

-- Add RLS policies for the base tables to allow reading through views
-- Assessment questions: allow authenticated users to SELECT (answers are hidden via view)
CREATE POLICY "Authenticated users can view questions"
ON public.assessment_questions
FOR SELECT
TO authenticated
USING (true);

-- Content blocks: allow authenticated users to SELECT (answers stripped via view)
CREATE POLICY "Authenticated users can view content blocks"
ON public.content_blocks
FOR SELECT
TO authenticated
USING (true);