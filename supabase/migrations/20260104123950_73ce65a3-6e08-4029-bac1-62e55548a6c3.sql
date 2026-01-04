-- Create app_role enum
CREATE TYPE public.app_role AS ENUM ('admin', 'moderator', 'user');

-- Create profiles table
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create user_roles table (for admin/moderator/user roles)
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role app_role NOT NULL DEFAULT 'user',
  UNIQUE (user_id, role)
);

-- Create learning_pathways table
CREATE TABLE public.learning_pathways (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  image_url TEXT,
  display_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create programs table
CREATE TABLE public.programs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pathway_id UUID REFERENCES public.learning_pathways(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  description TEXT,
  thumbnail_url TEXT,
  duration TEXT,
  level TEXT,
  is_active BOOLEAN DEFAULT true,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create lessons table
CREATE TABLE public.lessons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  program_id UUID NOT NULL REFERENCES public.programs(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  content JSONB,
  video_url TEXT,
  duration TEXT,
  display_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
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
  UNIQUE (user_id, program_id)
);

-- Create lesson_progress table
CREATE TABLE public.lesson_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  lesson_id UUID NOT NULL REFERENCES public.lessons(id) ON DELETE CASCADE,
  completed BOOLEAN DEFAULT false,
  progress_percentage INTEGER DEFAULT 0,
  last_position INTEGER DEFAULT 0,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, lesson_id)
);

-- Create assessments table
CREATE TABLE public.assessments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  program_id UUID REFERENCES public.programs(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  passing_score INTEGER DEFAULT 70,
  time_limit_minutes INTEGER,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create assessment_questions table
CREATE TABLE public.assessment_questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  assessment_id UUID NOT NULL REFERENCES public.assessments(id) ON DELETE CASCADE,
  question TEXT NOT NULL,
  question_type TEXT DEFAULT 'multiple_choice',
  options JSONB,
  correct_answer TEXT,
  points INTEGER DEFAULT 1,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create assessment_attempts table
CREATE TABLE public.assessment_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  assessment_id UUID NOT NULL REFERENCES public.assessments(id) ON DELETE CASCADE,
  score INTEGER,
  passed BOOLEAN,
  answers JSONB,
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ
);

-- Create certificates table
CREATE TABLE public.certificates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  program_id UUID NOT NULL REFERENCES public.programs(id) ON DELETE CASCADE,
  issued_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  certificate_number TEXT UNIQUE,
  UNIQUE (user_id, program_id)
);

-- Create invites table (for admin invites)
CREATE TABLE public.invites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL,
  token TEXT NOT NULL UNIQUE,
  program_id UUID REFERENCES public.programs(id) ON DELETE CASCADE,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  used_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create leaderboard table
CREATE TABLE public.leaderboard (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  total_points INTEGER DEFAULT 0,
  lessons_completed INTEGER DEFAULT 0,
  programs_completed INTEGER DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.learning_pathways ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.programs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lessons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.enrollments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lesson_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assessments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assessment_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assessment_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.certificates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invites ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leaderboard ENABLE ROW LEVEL SECURITY;

-- Create has_role function (security definer to avoid RLS recursion)
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- Create update_updated_at function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create handle_new_user function (creates profile on signup)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name)
  VALUES (NEW.id, NEW.raw_user_meta_data ->> 'full_name');
  
  -- Also create a default user role
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'user');
  
  -- Initialize leaderboard entry
  INSERT INTO public.leaderboard (user_id)
  VALUES (NEW.id);
  
  RETURN NEW;
END;
$$;

-- Create trigger for new user signup
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Create updated_at triggers
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_learning_pathways_updated_at
  BEFORE UPDATE ON public.learning_pathways
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_programs_updated_at
  BEFORE UPDATE ON public.programs
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_lessons_updated_at
  BEFORE UPDATE ON public.lessons
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_lesson_progress_updated_at
  BEFORE UPDATE ON public.lesson_progress
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_assessments_updated_at
  BEFORE UPDATE ON public.assessments
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_leaderboard_updated_at
  BEFORE UPDATE ON public.leaderboard
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- RLS Policies

-- Profiles: users can view all, update own
CREATE POLICY "Profiles are viewable by everyone" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);

-- User roles: only readable, managed by triggers/admins
CREATE POLICY "Users can view own roles" ON public.user_roles FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Admins can view all roles" ON public.user_roles FOR SELECT USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can manage roles" ON public.user_roles FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- Learning pathways: public read, admin write
CREATE POLICY "Pathways are viewable by everyone" ON public.learning_pathways FOR SELECT USING (true);
CREATE POLICY "Admins can manage pathways" ON public.learning_pathways FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- Programs: public read, admin write
CREATE POLICY "Programs are viewable by everyone" ON public.programs FOR SELECT USING (true);
CREATE POLICY "Admins can manage programs" ON public.programs FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- Lessons: public read, admin write
CREATE POLICY "Lessons are viewable by everyone" ON public.lessons FOR SELECT USING (true);
CREATE POLICY "Admins can manage lessons" ON public.lessons FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- Enrollments: users manage own, admins see all
CREATE POLICY "Users can view own enrollments" ON public.enrollments FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can enroll themselves" ON public.enrollments FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can unenroll themselves" ON public.enrollments FOR DELETE USING (auth.uid() = user_id);
CREATE POLICY "Admins can view all enrollments" ON public.enrollments FOR SELECT USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can manage enrollments" ON public.enrollments FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- Lesson progress: users manage own
CREATE POLICY "Users can view own progress" ON public.lesson_progress FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can update own progress" ON public.lesson_progress FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can modify own progress" ON public.lesson_progress FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Admins can view all progress" ON public.lesson_progress FOR SELECT USING (public.has_role(auth.uid(), 'admin'));

-- Assessments: public read, admin write
CREATE POLICY "Assessments are viewable by everyone" ON public.assessments FOR SELECT USING (true);
CREATE POLICY "Admins can manage assessments" ON public.assessments FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- Assessment questions: public read, admin write
CREATE POLICY "Questions are viewable by everyone" ON public.assessment_questions FOR SELECT USING (true);
CREATE POLICY "Admins can manage questions" ON public.assessment_questions FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- Assessment attempts: users manage own
CREATE POLICY "Users can view own attempts" ON public.assessment_attempts FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create attempts" ON public.assessment_attempts FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own attempts" ON public.assessment_attempts FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Admins can view all attempts" ON public.assessment_attempts FOR SELECT USING (public.has_role(auth.uid(), 'admin'));

-- Certificates: users view own, admins manage
CREATE POLICY "Users can view own certificates" ON public.certificates FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Admins can manage certificates" ON public.certificates FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- Invites: admins only
CREATE POLICY "Admins can view invites" ON public.invites FOR SELECT USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can manage invites" ON public.invites FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- Leaderboard: public read
CREATE POLICY "Leaderboard is viewable by everyone" ON public.leaderboard FOR SELECT USING (true);
CREATE POLICY "Users can update own leaderboard" ON public.leaderboard FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Admins can manage leaderboard" ON public.leaderboard FOR ALL USING (public.has_role(auth.uid(), 'admin'));