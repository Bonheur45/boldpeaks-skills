-- Create enum for user roles
CREATE TYPE public.app_role AS ENUM ('admin', 'student');

-- Create enum for content block types
CREATE TYPE public.content_block_type AS ENUM ('rich_text', 'video', 'instruction', 'assessment');

-- Create enum for question types
CREATE TYPE public.question_type AS ENUM ('multiple_choice', 'short_answer');

-- Create profiles table
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create user_roles table (separate for security)
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, role)
);

-- Create admin_invites table
CREATE TABLE public.admin_invites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL,
  invite_code TEXT NOT NULL UNIQUE,
  invited_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  used_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '7 days'),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create programs table
CREATE TABLE public.programs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  cover_image_url TEXT,
  is_published BOOLEAN NOT NULL DEFAULT false,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create groupings table (flexible week/day/session labels)
CREATE TABLE public.groupings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  program_id UUID NOT NULL REFERENCES public.programs(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create lessons table
CREATE TABLE public.lessons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  program_id UUID NOT NULL REFERENCES public.programs(id) ON DELETE CASCADE,
  grouping_id UUID REFERENCES public.groupings(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  description TEXT,
  lesson_type TEXT NOT NULL DEFAULT 'mixed',
  is_published BOOLEAN NOT NULL DEFAULT false,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create content_blocks table
CREATE TABLE public.content_blocks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lesson_id UUID NOT NULL REFERENCES public.lessons(id) ON DELETE CASCADE,
  block_type content_block_type NOT NULL,
  content JSONB NOT NULL DEFAULT '{}',
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create assessments table
CREATE TABLE public.assessments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lesson_id UUID NOT NULL REFERENCES public.lessons(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  max_score INTEGER NOT NULL DEFAULT 100,
  passing_score INTEGER NOT NULL DEFAULT 70,
  is_manual_scoring BOOLEAN NOT NULL DEFAULT false,
  time_limit_minutes INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create assessment_questions table
CREATE TABLE public.assessment_questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  assessment_id UUID NOT NULL REFERENCES public.assessments(id) ON DELETE CASCADE,
  question_type question_type NOT NULL,
  question_text TEXT NOT NULL,
  options JSONB,
  correct_answer TEXT,
  points INTEGER NOT NULL DEFAULT 1,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create enrollments table
CREATE TABLE public.enrollments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  program_id UUID NOT NULL REFERENCES public.programs(id) ON DELETE CASCADE,
  enrolled_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ,
  is_active BOOLEAN NOT NULL DEFAULT true,
  UNIQUE(user_id, program_id)
);

-- Create lesson_progress table
CREATE TABLE public.lesson_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  lesson_id UUID NOT NULL REFERENCES public.lessons(id) ON DELETE CASCADE,
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ,
  progress_percentage INTEGER NOT NULL DEFAULT 0,
  UNIQUE(user_id, lesson_id)
);

-- Create assessment_submissions table
CREATE TABLE public.assessment_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  assessment_id UUID NOT NULL REFERENCES public.assessments(id) ON DELETE CASCADE,
  answers JSONB NOT NULL DEFAULT '{}',
  score INTEGER,
  max_score INTEGER,
  is_graded BOOLEAN NOT NULL DEFAULT false,
  admin_feedback TEXT,
  submitted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  graded_at TIMESTAMPTZ
);

-- Create weekly_rankings table
CREATE TABLE public.weekly_rankings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  program_id UUID NOT NULL REFERENCES public.programs(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  week_start DATE NOT NULL,
  week_end DATE NOT NULL,
  total_score INTEGER NOT NULL DEFAULT 0,
  lessons_completed INTEGER NOT NULL DEFAULT 0,
  rank_position INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(program_id, user_id, week_start)
);

-- Create ranking_config table
CREATE TABLE public.ranking_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  program_id UUID NOT NULL REFERENCES public.programs(id) ON DELETE CASCADE UNIQUE,
  score_weight NUMERIC NOT NULL DEFAULT 0.7,
  completion_weight NUMERIC NOT NULL DEFAULT 0.3,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create certificates table
CREATE TABLE public.certificates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  program_id UUID NOT NULL REFERENCES public.programs(id) ON DELETE CASCADE,
  certificate_number TEXT NOT NULL UNIQUE,
  issued_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, program_id)
);

-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_invites ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.programs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.groupings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lessons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.content_blocks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assessments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assessment_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.enrollments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lesson_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assessment_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.weekly_rankings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ranking_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.certificates ENABLE ROW LEVEL SECURITY;

-- Security definer function to check roles (prevents RLS recursion)
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- Function to check if user is admin
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.has_role(auth.uid(), 'admin')
$$;

-- Profiles policies
CREATE POLICY "Users can view all profiles" ON public.profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id);
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);

-- User roles policies (only admins can manage)
CREATE POLICY "Admins can view all roles" ON public.user_roles FOR SELECT TO authenticated USING (public.is_admin());
CREATE POLICY "Admins can insert roles" ON public.user_roles FOR INSERT TO authenticated WITH CHECK (public.is_admin());
CREATE POLICY "Admins can delete roles" ON public.user_roles FOR DELETE TO authenticated USING (public.is_admin());
CREATE POLICY "Users can view own role" ON public.user_roles FOR SELECT TO authenticated USING (user_id = auth.uid());

-- Admin invites policies
CREATE POLICY "Admins can view invites" ON public.admin_invites FOR SELECT TO authenticated USING (public.is_admin());
CREATE POLICY "Admins can create invites" ON public.admin_invites FOR INSERT TO authenticated WITH CHECK (public.is_admin());
CREATE POLICY "Admins can update invites" ON public.admin_invites FOR UPDATE TO authenticated USING (public.is_admin());

-- Programs policies
CREATE POLICY "Anyone can view published programs" ON public.programs FOR SELECT USING (is_published = true);
CREATE POLICY "Admins can view all programs" ON public.programs FOR SELECT TO authenticated USING (public.is_admin());
CREATE POLICY "Admins can insert programs" ON public.programs FOR INSERT TO authenticated WITH CHECK (public.is_admin());
CREATE POLICY "Admins can update programs" ON public.programs FOR UPDATE TO authenticated USING (public.is_admin());
CREATE POLICY "Admins can delete programs" ON public.programs FOR DELETE TO authenticated USING (public.is_admin());

-- Groupings policies
CREATE POLICY "Anyone can view groupings of published programs" ON public.groupings FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.programs WHERE id = program_id AND is_published = true)
);
CREATE POLICY "Admins can manage groupings" ON public.groupings FOR ALL TO authenticated USING (public.is_admin());

-- Lessons policies
CREATE POLICY "Enrolled users can view published lessons" ON public.lessons FOR SELECT TO authenticated USING (
  is_published = true AND EXISTS (
    SELECT 1 FROM public.enrollments WHERE user_id = auth.uid() AND program_id = lessons.program_id AND is_active = true
  )
);
CREATE POLICY "Admins can manage lessons" ON public.lessons FOR ALL TO authenticated USING (public.is_admin());

-- Content blocks policies
CREATE POLICY "Enrolled users can view content of published lessons" ON public.content_blocks FOR SELECT TO authenticated USING (
  EXISTS (
    SELECT 1 FROM public.lessons l
    JOIN public.enrollments e ON e.program_id = l.program_id
    WHERE l.id = lesson_id AND l.is_published = true AND e.user_id = auth.uid() AND e.is_active = true
  )
);
CREATE POLICY "Admins can manage content blocks" ON public.content_blocks FOR ALL TO authenticated USING (public.is_admin());

-- Assessments policies
CREATE POLICY "Enrolled users can view assessments" ON public.assessments FOR SELECT TO authenticated USING (
  EXISTS (
    SELECT 1 FROM public.lessons l
    JOIN public.enrollments e ON e.program_id = l.program_id
    WHERE l.id = lesson_id AND l.is_published = true AND e.user_id = auth.uid() AND e.is_active = true
  )
);
CREATE POLICY "Admins can manage assessments" ON public.assessments FOR ALL TO authenticated USING (public.is_admin());

-- Assessment questions policies
CREATE POLICY "Enrolled users can view questions" ON public.assessment_questions FOR SELECT TO authenticated USING (
  EXISTS (
    SELECT 1 FROM public.assessments a
    JOIN public.lessons l ON l.id = a.lesson_id
    JOIN public.enrollments e ON e.program_id = l.program_id
    WHERE a.id = assessment_id AND l.is_published = true AND e.user_id = auth.uid() AND e.is_active = true
  )
);
CREATE POLICY "Admins can manage questions" ON public.assessment_questions FOR ALL TO authenticated USING (public.is_admin());

-- Enrollments policies
CREATE POLICY "Users can view own enrollments" ON public.enrollments FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Users can enroll themselves" ON public.enrollments FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "Admins can view all enrollments" ON public.enrollments FOR SELECT TO authenticated USING (public.is_admin());
CREATE POLICY "Admins can manage enrollments" ON public.enrollments FOR ALL TO authenticated USING (public.is_admin());

-- Lesson progress policies
CREATE POLICY "Users can view own progress" ON public.lesson_progress FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Users can manage own progress" ON public.lesson_progress FOR ALL TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Admins can view all progress" ON public.lesson_progress FOR SELECT TO authenticated USING (public.is_admin());

-- Assessment submissions policies
CREATE POLICY "Users can view own submissions" ON public.assessment_submissions FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Users can insert own submissions" ON public.assessment_submissions FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "Admins can view all submissions" ON public.assessment_submissions FOR SELECT TO authenticated USING (public.is_admin());
CREATE POLICY "Admins can update submissions" ON public.assessment_submissions FOR UPDATE TO authenticated USING (public.is_admin());

-- Weekly rankings policies
CREATE POLICY "Users can view rankings in enrolled programs" ON public.weekly_rankings FOR SELECT TO authenticated USING (
  EXISTS (SELECT 1 FROM public.enrollments WHERE user_id = auth.uid() AND program_id = weekly_rankings.program_id)
);
CREATE POLICY "Admins can manage rankings" ON public.weekly_rankings FOR ALL TO authenticated USING (public.is_admin());

-- Ranking config policies
CREATE POLICY "Anyone can view ranking config" ON public.ranking_config FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can manage ranking config" ON public.ranking_config FOR ALL TO authenticated USING (public.is_admin());

-- Certificates policies
CREATE POLICY "Users can view own certificates" ON public.certificates FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Admins can manage certificates" ON public.certificates FOR ALL TO authenticated USING (public.is_admin());

-- Trigger to create profile on user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data ->> 'full_name', NEW.raw_user_meta_data ->> 'name', '')
  );
  
  -- Assign student role by default
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'student');
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- Add updated_at triggers
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_programs_updated_at BEFORE UPDATE ON public.programs FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_groupings_updated_at BEFORE UPDATE ON public.groupings FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_lessons_updated_at BEFORE UPDATE ON public.lessons FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_content_blocks_updated_at BEFORE UPDATE ON public.content_blocks FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_assessments_updated_at BEFORE UPDATE ON public.assessments FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_assessment_questions_updated_at BEFORE UPDATE ON public.assessment_questions FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_weekly_rankings_updated_at BEFORE UPDATE ON public.weekly_rankings FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_ranking_config_updated_at BEFORE UPDATE ON public.ranking_config FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Function to generate certificate number
CREATE OR REPLACE FUNCTION public.generate_certificate_number()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.certificate_number = 'BP-' || to_char(NEW.issued_at, 'YYYY') || '-' || LPAD(nextval('certificate_seq')::text, 6, '0');
  RETURN NEW;
END;
$$;

CREATE SEQUENCE IF NOT EXISTS certificate_seq START 1;

CREATE TRIGGER generate_cert_number BEFORE INSERT ON public.certificates FOR EACH ROW EXECUTE FUNCTION public.generate_certificate_number();