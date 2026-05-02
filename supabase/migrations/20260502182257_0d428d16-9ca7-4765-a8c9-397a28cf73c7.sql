
-- Roles enum & table
CREATE TYPE public.app_role AS ENUM ('admin', 'faculty');

CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  department TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);

-- has_role security definer
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN
LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, name, email, department)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
    NEW.email,
    NEW.raw_user_meta_data->>'department'
  );
  -- default role: faculty
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, COALESCE((NEW.raw_user_meta_data->>'role')::public.app_role, 'faculty'));
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- updated_at trigger
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;

CREATE TRIGGER profiles_updated BEFORE UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Subjects
CREATE TABLE public.subjects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subject_code TEXT NOT NULL UNIQUE,
  subject_name TEXT NOT NULL,
  semester INT NOT NULL,
  department TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Faculty <-> Subjects assignment
CREATE TABLE public.faculty_subjects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  faculty_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  subject_id UUID NOT NULL REFERENCES public.subjects(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (faculty_id, subject_id)
);

-- Students
CREATE TABLE public.students (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  register_no TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  department TEXT,
  semester INT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Answer sheets
CREATE TYPE public.sheet_status AS ENUM ('uploaded','assigned','in_progress','submitted');

CREATE TABLE public.answer_sheets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  register_no TEXT NOT NULL,
  student_name TEXT,
  subject_id UUID REFERENCES public.subjects(id) ON DELETE SET NULL,
  subject_code TEXT NOT NULL,
  subject_name TEXT NOT NULL,
  exam_date DATE NOT NULL,
  semester INT NOT NULL,
  file_path TEXT NOT NULL,
  file_type TEXT NOT NULL,
  assigned_faculty UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  status public.sheet_status NOT NULL DEFAULT 'uploaded',
  uploaded_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TRIGGER sheets_updated BEFORE UPDATE ON public.answer_sheets
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Evaluations
CREATE TYPE public.eval_status AS ENUM ('draft','submitted');

CREATE TABLE public.evaluations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sheet_id UUID NOT NULL UNIQUE REFERENCES public.answer_sheets(id) ON DELETE CASCADE,
  faculty_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  total_marks NUMERIC(6,2) NOT NULL DEFAULT 0,
  max_marks NUMERIC(6,2) NOT NULL DEFAULT 100,
  status public.eval_status NOT NULL DEFAULT 'draft',
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  submitted_at TIMESTAMPTZ,
  time_taken_seconds INT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TRIGGER eval_updated BEFORE UPDATE ON public.evaluations
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Lock submitted evaluations
CREATE OR REPLACE FUNCTION public.lock_submitted_eval()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF OLD.status = 'submitted' AND NEW.status = 'submitted' THEN
    RAISE EXCEPTION 'Evaluation is locked after submission';
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER eval_lock BEFORE UPDATE ON public.evaluations
FOR EACH ROW WHEN (OLD.status = 'submitted') EXECUTE FUNCTION public.lock_submitted_eval();

-- Question marks
CREATE TABLE public.question_marks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  evaluation_id UUID NOT NULL REFERENCES public.evaluations(id) ON DELETE CASCADE,
  question_no TEXT NOT NULL,
  max_marks NUMERIC(5,2) NOT NULL,
  obtained_marks NUMERIC(5,2) NOT NULL DEFAULT 0,
  section TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (obtained_marks <= max_marks AND obtained_marks >= 0)
);

-- Annotations
CREATE TABLE public.annotations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  evaluation_id UUID NOT NULL REFERENCES public.evaluations(id) ON DELETE CASCADE,
  page_no INT NOT NULL DEFAULT 1,
  data JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Audit logs
CREATE TABLE public.audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  entity TEXT,
  entity_id UUID,
  details JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subjects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.faculty_subjects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.answer_sheets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.evaluations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.question_marks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.annotations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Users can view own profile" ON public.profiles FOR SELECT TO authenticated USING (id = auth.uid());
CREATE POLICY "Admins can view all profiles" ON public.profiles FOR SELECT TO authenticated USING (public.has_role(auth.uid(),'admin'));
CREATE POLICY "Users update own profile" ON public.profiles FOR UPDATE TO authenticated USING (id = auth.uid());
CREATE POLICY "Admins update profiles" ON public.profiles FOR UPDATE TO authenticated USING (public.has_role(auth.uid(),'admin'));
CREATE POLICY "Admins delete profiles" ON public.profiles FOR DELETE TO authenticated USING (public.has_role(auth.uid(),'admin'));

-- User roles policies
CREATE POLICY "Users view own roles" ON public.user_roles FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Admins view all roles" ON public.user_roles FOR SELECT TO authenticated USING (public.has_role(auth.uid(),'admin'));
CREATE POLICY "Admins manage roles" ON public.user_roles FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

-- Subjects policies
CREATE POLICY "Authenticated read subjects" ON public.subjects FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins manage subjects" ON public.subjects FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

-- Faculty subjects
CREATE POLICY "Faculty view own subjects" ON public.faculty_subjects FOR SELECT TO authenticated USING (faculty_id = auth.uid() OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "Admins manage faculty subjects" ON public.faculty_subjects FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

-- Students
CREATE POLICY "Authenticated read students" ON public.students FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins manage students" ON public.students FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

-- Answer sheets
CREATE POLICY "Admins manage sheets" ON public.answer_sheets FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE POLICY "Faculty view assigned sheets" ON public.answer_sheets FOR SELECT TO authenticated USING (assigned_faculty = auth.uid());
CREATE POLICY "Faculty update own sheet status" ON public.answer_sheets FOR UPDATE TO authenticated USING (assigned_faculty = auth.uid());

-- Evaluations
CREATE POLICY "Admins view all evaluations" ON public.evaluations FOR SELECT TO authenticated USING (public.has_role(auth.uid(),'admin'));
CREATE POLICY "Faculty view own evaluations" ON public.evaluations FOR SELECT TO authenticated USING (faculty_id = auth.uid());
CREATE POLICY "Faculty insert own evaluations" ON public.evaluations FOR INSERT TO authenticated WITH CHECK (faculty_id = auth.uid());
CREATE POLICY "Faculty update own draft evaluations" ON public.evaluations FOR UPDATE TO authenticated USING (faculty_id = auth.uid());
CREATE POLICY "Admins manage evaluations" ON public.evaluations FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

-- Question marks
CREATE POLICY "View question marks" ON public.question_marks FOR SELECT TO authenticated
USING (
  EXISTS (SELECT 1 FROM public.evaluations e WHERE e.id = evaluation_id AND (e.faculty_id = auth.uid() OR public.has_role(auth.uid(),'admin')))
);
CREATE POLICY "Faculty manage own question marks" ON public.question_marks FOR ALL TO authenticated
USING (
  EXISTS (SELECT 1 FROM public.evaluations e WHERE e.id = evaluation_id AND e.faculty_id = auth.uid() AND e.status = 'draft')
)
WITH CHECK (
  EXISTS (SELECT 1 FROM public.evaluations e WHERE e.id = evaluation_id AND e.faculty_id = auth.uid() AND e.status = 'draft')
);

-- Annotations
CREATE POLICY "View annotations" ON public.annotations FOR SELECT TO authenticated
USING (
  EXISTS (SELECT 1 FROM public.evaluations e WHERE e.id = evaluation_id AND (e.faculty_id = auth.uid() OR public.has_role(auth.uid(),'admin')))
);
CREATE POLICY "Faculty manage own annotations" ON public.annotations FOR ALL TO authenticated
USING (
  EXISTS (SELECT 1 FROM public.evaluations e WHERE e.id = evaluation_id AND e.faculty_id = auth.uid() AND e.status = 'draft')
)
WITH CHECK (
  EXISTS (SELECT 1 FROM public.evaluations e WHERE e.id = evaluation_id AND e.faculty_id = auth.uid() AND e.status = 'draft')
);

-- Audit logs
CREATE POLICY "Admins view audit" ON public.audit_logs FOR SELECT TO authenticated USING (public.has_role(auth.uid(),'admin'));
CREATE POLICY "Authenticated insert audit" ON public.audit_logs FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());

-- Storage bucket for answer sheets (private)
INSERT INTO storage.buckets (id, name, public) VALUES ('answer-sheets','answer-sheets', false);

CREATE POLICY "Admins upload sheets" ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'answer-sheets' AND public.has_role(auth.uid(),'admin'));

CREATE POLICY "Admins read sheets" ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'answer-sheets' AND public.has_role(auth.uid(),'admin'));

CREATE POLICY "Faculty read assigned sheet files" ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'answer-sheets'
  AND EXISTS (
    SELECT 1 FROM public.answer_sheets s
    WHERE s.file_path = storage.objects.name AND s.assigned_faculty = auth.uid()
  )
);

CREATE POLICY "Admins delete sheets" ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'answer-sheets' AND public.has_role(auth.uid(),'admin'));
