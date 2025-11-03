-- Create donations table
CREATE TABLE IF NOT EXISTS public.donations (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  investor_id uuid NOT NULL REFERENCES public.investors(id) ON DELETE CASCADE,
  institution_id uuid NOT NULL REFERENCES public.institutions(id) ON DELETE CASCADE,
  amount numeric NOT NULL CHECK (amount > 0),
  currency text NOT NULL DEFAULT 'USD',
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'cancelled', 'failed')),
  donation_date timestamp with time zone NOT NULL DEFAULT now(),
  message text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.donations ENABLE ROW LEVEL SECURITY;

-- Admins can view all donations
CREATE POLICY "Admins can view all donations"
ON public.donations
FOR SELECT
USING (has_role(auth.uid(), 'admin'));

-- Admins can update all donations
CREATE POLICY "Admins can update all donations"
ON public.donations
FOR UPDATE
USING (has_role(auth.uid(), 'admin'));

-- Admins can insert donations
CREATE POLICY "Admins can insert donations"
ON public.donations
FOR INSERT
WITH CHECK (has_role(auth.uid(), 'admin'));

-- Admins can delete donations
CREATE POLICY "Admins can delete donations"
ON public.donations
FOR DELETE
USING (has_role(auth.uid(), 'admin'));

-- Investors can view their own donations
CREATE POLICY "Investors can view their own donations"
ON public.donations
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.investors inv
    WHERE inv.id = donations.investor_id
    AND inv.user_id = auth.uid()
  )
);

-- Institutions can view donations to them
CREATE POLICY "Institutions can view their donations"
ON public.donations
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.institutions inst
    WHERE inst.id = donations.institution_id
    AND inst.user_id = auth.uid()
  )
);

-- Investors can create donations
CREATE POLICY "Investors can create donations"
ON public.donations
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.investors inv
    WHERE inv.id = donations.investor_id
    AND inv.user_id = auth.uid()
  )
);

-- Create trigger for updated_at
CREATE TRIGGER update_donations_updated_at
BEFORE UPDATE ON public.donations
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();