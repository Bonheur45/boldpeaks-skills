-- Create learning_pathways table
CREATE TABLE public.learning_pathways (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT,
    cover_image TEXT,
    is_published BOOLEAN DEFAULT false,
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.learning_pathways ENABLE ROW LEVEL SECURITY;

-- RLS policies for learning_pathways
CREATE POLICY "Admins can manage learning pathways"
ON public.learning_pathways
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Anyone can view published learning pathways"
ON public.learning_pathways
FOR SELECT
USING (is_published = true);

-- Add learning_pathway_id to programs (nullable initially for migration, we'll make it required after)
ALTER TABLE public.programs
ADD COLUMN learning_pathway_id UUID REFERENCES public.learning_pathways(id) ON DELETE CASCADE;

-- Add sort_order for ordering programs within a pathway
ALTER TABLE public.programs
ADD COLUMN sort_order INTEGER DEFAULT 0;

-- Create trigger for updated_at on learning_pathways
CREATE TRIGGER update_learning_pathways_updated_at
BEFORE UPDATE ON public.learning_pathways
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create index for better query performance
CREATE INDEX idx_programs_learning_pathway_id ON public.programs(learning_pathway_id);