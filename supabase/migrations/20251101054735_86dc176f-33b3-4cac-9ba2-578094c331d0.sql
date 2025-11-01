-- Add RLS policies for admin to view all profiles, institutions, and investors

-- Admin can view all profiles
CREATE POLICY "Admins can view all profiles" ON public.profiles
FOR SELECT USING (has_role(auth.uid(), 'admin'));

-- Admin can update all profiles
CREATE POLICY "Admins can update all profiles" ON public.profiles
FOR UPDATE USING (has_role(auth.uid(), 'admin'));

-- Admin can view all institutions
CREATE POLICY "Admins can view all institutions" ON public.institutions
FOR SELECT USING (has_role(auth.uid(), 'admin'));

-- Admin can update all institutions
CREATE POLICY "Admins can update all institutions" ON public.institutions
FOR UPDATE USING (has_role(auth.uid(), 'admin'));

-- Admin can view all investors
CREATE POLICY "Admins can view all investors" ON public.investors
FOR SELECT USING (has_role(auth.uid(), 'admin'));

-- Admin can update all investors
CREATE POLICY "Admins can update all investors" ON public.investors
FOR UPDATE USING (has_role(auth.uid(), 'admin'));