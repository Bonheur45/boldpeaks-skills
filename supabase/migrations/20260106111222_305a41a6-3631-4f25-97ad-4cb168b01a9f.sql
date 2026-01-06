-- Fix Security Issue 1: assessment_questions - Hide correct answers from students

-- Drop the overly permissive policy
DROP POLICY IF EXISTS "Questions are viewable by everyone" ON public.assessment_questions;

-- Create a view that hides correct_answer for non-admin users
CREATE OR REPLACE VIEW public.assessment_questions_student AS
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

-- Create a function to grade assessment answers (server-side validation)
CREATE OR REPLACE FUNCTION public.grade_assessment_answer(
  p_question_id uuid,
  p_user_answer text
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_correct_answer text;
BEGIN
  SELECT correct_answer INTO v_correct_answer
  FROM public.assessment_questions
  WHERE id = p_question_id;
  
  RETURN v_user_answer = v_correct_answer;
END;
$$;

-- Fix Security Issue 2: content_blocks - Hide quiz answers from students

-- Drop the overly permissive policy
DROP POLICY IF EXISTS "Content blocks are viewable by everyone" ON public.content_blocks;

-- Create a function to strip correctOptionId from quiz content
CREATE OR REPLACE FUNCTION public.strip_quiz_answers(content jsonb, block_type text)
RETURNS jsonb
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  result jsonb;
  questions jsonb;
  question jsonb;
  new_questions jsonb := '[]'::jsonb;
  i int;
BEGIN
  -- If not a quiz block, return content as-is
  IF block_type != 'quiz' THEN
    RETURN content;
  END IF;
  
  -- If content has questions array, strip correctOptionId from each
  IF content ? 'questions' THEN
    questions := content->'questions';
    FOR i IN 0..jsonb_array_length(questions)-1 LOOP
      question := questions->i;
      -- Remove correctOptionId from each question
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

-- Create a secure view for content blocks that strips quiz answers
CREATE OR REPLACE VIEW public.content_blocks_student AS
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

-- Create a function to validate quiz answers (server-side)
CREATE OR REPLACE FUNCTION public.validate_quiz_answer(
  p_block_id uuid,
  p_question_id text,
  p_selected_option_id text
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_content jsonb;
  v_questions jsonb;
  v_question jsonb;
  v_correct_option_id text;
  i int;
BEGIN
  SELECT content INTO v_content
  FROM public.content_blocks
  WHERE id = p_block_id AND block_type = 'quiz';
  
  IF v_content IS NULL THEN
    RETURN false;
  END IF;
  
  v_questions := v_content->'questions';
  
  FOR i IN 0..jsonb_array_length(v_questions)-1 LOOP
    v_question := v_questions->i;
    IF (v_question->>'id') = p_question_id THEN
      v_correct_option_id := v_question->>'correctOptionId';
      RETURN p_selected_option_id = v_correct_option_id;
    END IF;
  END LOOP;
  
  RETURN false;
END;
$$;