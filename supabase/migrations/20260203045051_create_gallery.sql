-- Create gallery_images table
CREATE TABLE IF NOT EXISTS public.gallery_images (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    file_path text NOT NULL,
    url text NOT NULL,
    label text,
    created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.gallery_images ENABLE ROW LEVEL SECURITY;

-- Public read access (anyone can view gallery)
CREATE POLICY "Public can view gallery images"
    ON public.gallery_images
    FOR SELECT
    USING (true);

-- Authenticated users can insert (admin upload)
CREATE POLICY "Authenticated users can insert gallery images"
    ON public.gallery_images
    FOR INSERT
    TO authenticated
    WITH CHECK (true);

-- Authenticated users can delete (admin delete)
CREATE POLICY "Authenticated users can delete gallery images"
    ON public.gallery_images
    FOR DELETE
    TO authenticated
    USING (true);

-- Create gallery storage bucket (public)
INSERT INTO storage.buckets (id, name, public)
VALUES ('gallery', 'gallery', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies: public read
CREATE POLICY "Public can read gallery files"
    ON storage.objects
    FOR SELECT
    USING (bucket_id = 'gallery');

-- Storage policies: authenticated upload
CREATE POLICY "Authenticated can upload gallery files"
    ON storage.objects
    FOR INSERT
    TO authenticated
    WITH CHECK (bucket_id = 'gallery');

-- Storage policies: authenticated delete
CREATE POLICY "Authenticated can delete gallery files"
    ON storage.objects
    FOR DELETE
    TO authenticated
    USING (bucket_id = 'gallery');
