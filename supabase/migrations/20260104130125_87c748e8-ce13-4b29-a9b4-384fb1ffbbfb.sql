-- Add compatibility columns expected by the current frontend
ALTER TABLE public.enrollments
ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'active';

ALTER TABLE public.learning_pathways
ADD COLUMN IF NOT EXISTS cover_image text,
ADD COLUMN IF NOT EXISTS is_published boolean NOT NULL DEFAULT true,
ADD COLUMN IF NOT EXISTS sort_order integer NOT NULL DEFAULT 0;

UPDATE public.learning_pathways
SET cover_image = COALESCE(cover_image, image_url),
    is_published = COALESCE(is_published, is_active, true),
    sort_order = COALESCE(sort_order, display_order, 0);

ALTER TABLE public.programs
ADD COLUMN IF NOT EXISTS cover_image text,
ADD COLUMN IF NOT EXISTS learning_pathway_id uuid,
ADD COLUMN IF NOT EXISTS is_published boolean NOT NULL DEFAULT true,
ADD COLUMN IF NOT EXISTS sort_order integer NOT NULL DEFAULT 0;

UPDATE public.programs
SET cover_image = COALESCE(cover_image, thumbnail_url),
    learning_pathway_id = COALESCE(learning_pathway_id, pathway_id),
    is_published = COALESCE(is_published, is_active, true),
    sort_order = COALESCE(sort_order, display_order, 0);

ALTER TABLE public.lessons
ADD COLUMN IF NOT EXISTS grouping_id uuid,
ADD COLUMN IF NOT EXISTS is_published boolean NOT NULL DEFAULT true,
ADD COLUMN IF NOT EXISTS sort_order integer NOT NULL DEFAULT 0;

UPDATE public.lessons
SET is_published = COALESCE(is_published, is_active, true),
    sort_order = COALESCE(sort_order, display_order, 0);

ALTER TABLE public.assessments
ADD COLUMN IF NOT EXISTS lesson_id uuid,
ADD COLUMN IF NOT EXISTS time_limit integer,
ADD COLUMN IF NOT EXISTS is_published boolean NOT NULL DEFAULT true;

UPDATE public.assessments
SET time_limit = COALESCE(time_limit, time_limit_minutes);

ALTER TABLE public.assessment_questions
ADD COLUMN IF NOT EXISTS question_text text,
ADD COLUMN IF NOT EXISTS sort_order integer NOT NULL DEFAULT 0;

UPDATE public.assessment_questions
SET question_text = COALESCE(question_text, question),
    sort_order = COALESCE(sort_order, display_order, 0);

-- Course structure tables used by Program/Lesson UI
CREATE TABLE IF NOT EXISTS public.groupings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  program_id uuid NOT NULL,
  title text NOT NULL,
  description text,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.content_blocks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lesson_id uuid NOT NULL,
  block_type text NOT NULL,
  content jsonb,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Assessment grading workflow used by AdminAssessments + AdminDashboard
CREATE TABLE IF NOT EXISTS public.assessment_submissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  assessment_id uuid NOT NULL,
  user_id uuid NOT NULL,
  answers jsonb,
  score integer,
  max_score integer,
  is_graded boolean NOT NULL DEFAULT false,
  admin_feedback text,
  submitted_at timestamptz NOT NULL DEFAULT now(),
  graded_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Add foreign keys needed for embedded selects (PostgREST)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'enrollments_program_id_fkey') THEN
    ALTER TABLE public.enrollments
      ADD CONSTRAINT enrollments_program_id_fkey
      FOREIGN KEY (program_id) REFERENCES public.programs(id) ON DELETE CASCADE;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'lessons_program_id_fkey') THEN
    ALTER TABLE public.lessons
      ADD CONSTRAINT lessons_program_id_fkey
      FOREIGN KEY (program_id) REFERENCES public.programs(id) ON DELETE CASCADE;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'programs_learning_pathway_id_fkey') THEN
    ALTER TABLE public.programs
      ADD CONSTRAINT programs_learning_pathway_id_fkey
      FOREIGN KEY (learning_pathway_id) REFERENCES public.learning_pathways(id) ON DELETE SET NULL;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'groupings_program_id_fkey') THEN
    ALTER TABLE public.groupings
      ADD CONSTRAINT groupings_program_id_fkey
      FOREIGN KEY (program_id) REFERENCES public.programs(id) ON DELETE CASCADE;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'lessons_grouping_id_fkey') THEN
    ALTER TABLE public.lessons
      ADD CONSTRAINT lessons_grouping_id_fkey
      FOREIGN KEY (grouping_id) REFERENCES public.groupings(id) ON DELETE SET NULL;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'content_blocks_lesson_id_fkey') THEN
    ALTER TABLE public.content_blocks
      ADD CONSTRAINT content_blocks_lesson_id_fkey
      FOREIGN KEY (lesson_id) REFERENCES public.lessons(id) ON DELETE CASCADE;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'assessment_questions_assessment_id_fkey') THEN
    ALTER TABLE public.assessment_questions
      ADD CONSTRAINT assessment_questions_assessment_id_fkey
      FOREIGN KEY (assessment_id) REFERENCES public.assessments(id) ON DELETE CASCADE;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'assessment_attempts_assessment_id_fkey') THEN
    ALTER TABLE public.assessment_attempts
      ADD CONSTRAINT assessment_attempts_assessment_id_fkey
      FOREIGN KEY (assessment_id) REFERENCES public.assessments(id) ON DELETE CASCADE;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'assessments_lesson_id_fkey') THEN
    ALTER TABLE public.assessments
      ADD CONSTRAINT assessments_lesson_id_fkey
      FOREIGN KEY (lesson_id) REFERENCES public.lessons(id) ON DELETE SET NULL;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'assessment_submissions_assessment_id_fkey') THEN
    ALTER TABLE public.assessment_submissions
      ADD CONSTRAINT assessment_submissions_assessment_id_fkey
      FOREIGN KEY (assessment_id) REFERENCES public.assessments(id) ON DELETE CASCADE;
  END IF;
END $$;

-- Enable RLS + policies
ALTER TABLE public.groupings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.content_blocks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assessment_submissions ENABLE ROW LEVEL SECURITY;

-- Groupings: public read, admin manage
DROP POLICY IF EXISTS "Groupings are viewable by everyone" ON public.groupings;
CREATE POLICY "Groupings are viewable by everyone"
ON public.groupings
FOR SELECT
USING (true);

DROP POLICY IF EXISTS "Admins can manage groupings" ON public.groupings;
CREATE POLICY "Admins can manage groupings"
ON public.groupings
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

-- Content blocks: public read, admin manage
DROP POLICY IF EXISTS "Content blocks are viewable by everyone" ON public.content_blocks;
CREATE POLICY "Content blocks are viewable by everyone"
ON public.content_blocks
FOR SELECT
USING (true);

DROP POLICY IF EXISTS "Admins can manage content blocks" ON public.content_blocks;
CREATE POLICY "Admins can manage content blocks"
ON public.content_blocks
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

-- Assessment submissions: user-owned + admin
DROP POLICY IF EXISTS "Users can create own submissions" ON public.assessment_submissions;
CREATE POLICY "Users can create own submissions"
ON public.assessment_submissions
FOR INSERT
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can view own submissions" ON public.assessment_submissions;
CREATE POLICY "Users can view own submissions"
ON public.assessment_submissions
FOR SELECT
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own ungraded submissions" ON public.assessment_submissions;
CREATE POLICY "Users can update own ungraded submissions"
ON public.assessment_submissions
FOR UPDATE
USING (auth.uid() = user_id AND is_graded = false);

DROP POLICY IF EXISTS "Admins can manage submissions" ON public.assessment_submissions;
CREATE POLICY "Admins can manage submissions"
ON public.assessment_submissions
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

-- Updated_at triggers for new tables
DROP TRIGGER IF EXISTS update_groupings_updated_at ON public.groupings;
CREATE TRIGGER update_groupings_updated_at
BEFORE UPDATE ON public.groupings
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_content_blocks_updated_at ON public.content_blocks;
CREATE TRIGGER update_content_blocks_updated_at
BEFORE UPDATE ON public.content_blocks
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_assessment_submissions_updated_at ON public.assessment_submissions;
CREATE TRIGGER update_assessment_submissions_updated_at
BEFORE UPDATE ON public.assessment_submissions
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
