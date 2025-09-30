-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create enum for user roles
CREATE TYPE public.app_role AS ENUM ('admin', 'staff', 'farmer');

-- Create profiles table
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  phone TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create user_roles table
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, role)
);

-- Create farmers table
CREATE TABLE public.farmers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  national_id TEXT UNIQUE,
  address TEXT,
  farm_location TEXT,
  kyc_status TEXT DEFAULT 'pending' CHECK (kyc_status IN ('pending', 'approved', 'rejected')),
  kyc_documents JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create staff table
CREATE TABLE public.staff (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  employee_id TEXT UNIQUE,
  department TEXT,
  assigned_route TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create collections table
CREATE TABLE public.collections (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  farmer_id UUID REFERENCES public.farmers(id) ON DELETE CASCADE NOT NULL,
  staff_id UUID REFERENCES public.staff(id) ON DELETE CASCADE NOT NULL,
  liters DECIMAL(10, 2) NOT NULL,
  quality_grade TEXT CHECK (quality_grade IN ('A', 'B', 'C')),
  gps_latitude DECIMAL(10, 8),
  gps_longitude DECIMAL(11, 8),
  validation_code TEXT,
  collection_date TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create payments table
CREATE TABLE public.payments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  farmer_id UUID REFERENCES public.farmers(id) ON DELETE CASCADE NOT NULL,
  amount DECIMAL(10, 2) NOT NULL,
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  payment_method TEXT,
  transaction_id TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  paid_at TIMESTAMPTZ
);

-- Enable Row Level Security
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.farmers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.staff ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.collections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

-- Create security definer function to check roles
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- Profiles policies
CREATE POLICY "Users can view their own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

CREATE POLICY "Admins can view all profiles"
  ON public.profiles FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'));

-- User roles policies
CREATE POLICY "Users can view their own roles"
  ON public.user_roles FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can manage all roles"
  ON public.user_roles FOR ALL
  USING (public.has_role(auth.uid(), 'admin'));

-- Farmers policies
CREATE POLICY "Farmers can view their own data"
  ON public.farmers FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Farmers can update their own data"
  ON public.farmers FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Staff and admins can view all farmers"
  ON public.farmers FOR SELECT
  USING (
    public.has_role(auth.uid(), 'admin') OR
    public.has_role(auth.uid(), 'staff')
  );

CREATE POLICY "Admins can manage farmers"
  ON public.farmers FOR ALL
  USING (public.has_role(auth.uid(), 'admin'));

-- Staff policies
CREATE POLICY "Staff can view their own data"
  ON public.staff FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can manage all staff"
  ON public.staff FOR ALL
  USING (public.has_role(auth.uid(), 'admin'));

-- Collections policies
CREATE POLICY "Farmers can view their own collections"
  ON public.collections FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.farmers
      WHERE farmers.id = collections.farmer_id
      AND farmers.user_id = auth.uid()
    )
  );

CREATE POLICY "Staff can view and create collections"
  ON public.collections FOR SELECT
  USING (
    public.has_role(auth.uid(), 'staff') OR
    public.has_role(auth.uid(), 'admin')
  );

CREATE POLICY "Staff can insert collections"
  ON public.collections FOR INSERT
  WITH CHECK (
    public.has_role(auth.uid(), 'staff') OR
    public.has_role(auth.uid(), 'admin')
  );

CREATE POLICY "Admins can manage all collections"
  ON public.collections FOR ALL
  USING (public.has_role(auth.uid(), 'admin'));

-- Payments policies
CREATE POLICY "Farmers can view their own payments"
  ON public.payments FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.farmers
      WHERE farmers.id = payments.farmer_id
      AND farmers.user_id = auth.uid()
    )
  );

CREATE POLICY "Admins can manage all payments"
  ON public.payments FOR ALL
  USING (public.has_role(auth.uid(), 'admin'));

-- Create function to handle new user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, phone)
  VALUES (
    NEW.id,
    NEW.raw_user_meta_data->>'full_name',
    NEW.raw_user_meta_data->>'phone'
  );
  RETURN NEW;
END;
$$;

-- Create trigger for new user signup
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- Add updated_at triggers
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_farmers_updated_at
  BEFORE UPDATE ON public.farmers
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_staff_updated_at
  BEFORE UPDATE ON public.staff
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();