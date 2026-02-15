
-- Create donation_requests table for institutions to request sanitary products
CREATE TABLE public.donation_requests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  institution_id UUID NOT NULL REFERENCES public.institutions(id),
  investor_id UUID NOT NULL REFERENCES public.investors(id),
  product_type TEXT NOT NULL,
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  urgency TEXT NOT NULL DEFAULT 'normal',
  message TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.donation_requests ENABLE ROW LEVEL SECURITY;

-- Institutions can create requests
CREATE POLICY "Institutions can create donation requests"
ON public.donation_requests
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.institutions inst
    WHERE inst.id = donation_requests.institution_id
    AND inst.user_id = auth.uid()
  )
);

-- Institutions can view their own requests
CREATE POLICY "Institutions can view their requests"
ON public.donation_requests
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.institutions inst
    WHERE inst.id = donation_requests.institution_id
    AND inst.user_id = auth.uid()
  )
);

-- Investors can view requests directed to them
CREATE POLICY "Investors can view their requests"
ON public.donation_requests
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.investors inv
    WHERE inv.id = donation_requests.investor_id
    AND inv.user_id = auth.uid()
  )
);

-- Investors can update request status
CREATE POLICY "Investors can update request status"
ON public.donation_requests
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.investors inv
    WHERE inv.id = donation_requests.investor_id
    AND inv.user_id = auth.uid()
  )
);

-- Admins can view all requests
CREATE POLICY "Admins can view all donation requests"
ON public.donation_requests
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

-- Admins can update all requests
CREATE POLICY "Admins can update all donation requests"
ON public.donation_requests
FOR UPDATE
USING (has_role(auth.uid(), 'admin'::app_role));

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.donation_requests;

-- Trigger for updated_at
CREATE TRIGGER update_donation_requests_updated_at
BEFORE UPDATE ON public.donation_requests
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
