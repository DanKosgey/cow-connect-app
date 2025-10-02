-- Add rate tracking table
CREATE TABLE IF NOT EXISTS public.milk_rates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  rate_per_liter NUMERIC NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  is_active BOOLEAN DEFAULT true
);

-- Add rate_per_liter to collections
ALTER TABLE public.collections 
ADD COLUMN IF NOT EXISTS rate_per_liter NUMERIC;

-- Create farmer analytics summary table
CREATE TABLE IF NOT EXISTS public.farmer_analytics (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  farmer_id UUID NOT NULL REFERENCES public.farmers(id) ON DELETE CASCADE,
  total_collections INTEGER DEFAULT 0,
  total_liters NUMERIC DEFAULT 0,
  avg_quality_score NUMERIC DEFAULT 0,
  last_collection_date TIMESTAMP WITH TIME ZONE,
  current_month_liters NUMERIC DEFAULT 0,
  current_month_earnings NUMERIC DEFAULT 0,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(farmer_id)
);

-- Enable RLS on new tables
ALTER TABLE public.milk_rates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.farmer_analytics ENABLE ROW LEVEL SECURITY;

-- RLS Policies for milk_rates (read-only for all authenticated users)
CREATE POLICY "Anyone can view milk rates"
ON public.milk_rates FOR SELECT
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Admins can manage milk rates"
ON public.milk_rates FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

-- RLS Policies for farmer_analytics
CREATE POLICY "Farmers can view their own analytics"
ON public.farmer_analytics FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.farmers
    WHERE farmers.id = farmer_analytics.farmer_id
    AND farmers.user_id = auth.uid()
  )
);

CREATE POLICY "Staff and admins can view all analytics"
ON public.farmer_analytics FOR SELECT
USING (
  has_role(auth.uid(), 'admin'::app_role) OR 
  has_role(auth.uid(), 'staff'::app_role)
);

CREATE POLICY "Admins can manage analytics"
ON public.farmer_analytics FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

-- Function to get current milk rate
CREATE OR REPLACE FUNCTION public.get_current_milk_rate()
RETURNS NUMERIC
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT rate_per_liter 
  FROM public.milk_rates
  WHERE is_active = true
  AND start_date <= CURRENT_DATE
  AND (end_date IS NULL OR end_date >= CURRENT_DATE)
  ORDER BY start_date DESC
  LIMIT 1;
$$;

-- Function to update farmer analytics
CREATE OR REPLACE FUNCTION public.update_farmer_analytics()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.farmer_analytics (
    farmer_id,
    total_collections,
    total_liters,
    avg_quality_score,
    last_collection_date,
    current_month_liters,
    current_month_earnings
  )
  VALUES (
    NEW.farmer_id,
    1,
    NEW.liters,
    COALESCE(CAST(NEW.quality_grade AS NUMERIC), 0),
    NEW.collection_date,
    NEW.liters,
    NEW.liters * COALESCE(NEW.rate_per_liter, 0)
  )
  ON CONFLICT (farmer_id)
  DO UPDATE SET
    total_collections = farmer_analytics.total_collections + 1,
    total_liters = farmer_analytics.total_liters + NEW.liters,
    avg_quality_score = (
      (farmer_analytics.avg_quality_score * farmer_analytics.total_collections + COALESCE(CAST(NEW.quality_grade AS NUMERIC), 0)) 
      / (farmer_analytics.total_collections + 1)
    ),
    last_collection_date = NEW.collection_date,
    current_month_liters = CASE 
      WHEN DATE_TRUNC('month', farmer_analytics.last_collection_date) = DATE_TRUNC('month', NEW.collection_date)
      THEN farmer_analytics.current_month_liters + NEW.liters
      ELSE NEW.liters
    END,
    current_month_earnings = CASE
      WHEN DATE_TRUNC('month', farmer_analytics.last_collection_date) = DATE_TRUNC('month', NEW.collection_date)
      THEN farmer_analytics.current_month_earnings + (NEW.liters * COALESCE(NEW.rate_per_liter, 0))
      ELSE (NEW.liters * COALESCE(NEW.rate_per_liter, 0))
    END,
    updated_at = now();
  
  RETURN NEW;
END;
$$;

-- Trigger to update analytics after collection insert
DROP TRIGGER IF EXISTS trigger_update_farmer_analytics ON public.collections;
CREATE TRIGGER trigger_update_farmer_analytics
AFTER INSERT ON public.collections
FOR EACH ROW
EXECUTE FUNCTION public.update_farmer_analytics();

-- Insert default milk rate if none exists
INSERT INTO public.milk_rates (rate_per_liter, start_date, is_active)
SELECT 20.00, CURRENT_DATE, true
WHERE NOT EXISTS (SELECT 1 FROM public.milk_rates WHERE is_active = true);