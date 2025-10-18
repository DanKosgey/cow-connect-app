-- Migration: 20251015001300_create_forum_tables.sql
-- Description: Create forum tables for community discussions

BEGIN;

-- Forum posts table
CREATE TABLE IF NOT EXISTS public.forum_posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  content text NOT NULL,
  author_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  likes integer DEFAULT 0,
  comments integer DEFAULT 0
);

-- Forum comments table
CREATE TABLE IF NOT EXISTS public.forum_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id uuid NOT NULL REFERENCES public.forum_posts(id) ON DELETE CASCADE,
  content text NOT NULL,
  author_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  likes integer DEFAULT 0
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_forum_posts_author ON public.forum_posts (author_id);
CREATE INDEX IF NOT EXISTS idx_forum_posts_created_at ON public.forum_posts (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_forum_comments_post ON public.forum_comments (post_id);
CREATE INDEX IF NOT EXISTS idx_forum_comments_author ON public.forum_comments (author_id);
CREATE INDEX IF NOT EXISTS idx_forum_comments_created_at ON public.forum_comments (created_at ASC);

-- Enable RLS (Row Level Security)
ALTER TABLE public.forum_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.forum_comments ENABLE ROW LEVEL SECURITY;

-- Forum posts policies using safe approach
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policy pol
    JOIN pg_class pc ON pc.oid = pol.polrelid
    WHERE pol.polname = 'Users can view all forum posts' 
    AND pc.relname = 'forum_posts'
  ) THEN
    CREATE POLICY "Users can view all forum posts" ON public.forum_posts
      FOR SELECT USING (true);
  END IF;
END $$;

DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policy pol
    JOIN pg_class pc ON pc.oid = pol.polrelid
    WHERE pol.polname = 'Users can create their own forum posts' 
    AND pc.relname = 'forum_posts'
  ) THEN
    CREATE POLICY "Users can create their own forum posts" ON public.forum_posts
      FOR INSERT WITH CHECK (auth.uid() = author_id);
  END IF;
END $$;

DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policy pol
    JOIN pg_class pc ON pc.oid = pol.polrelid
    WHERE pol.polname = 'Users can update their own forum posts' 
    AND pc.relname = 'forum_posts'
  ) THEN
    CREATE POLICY "Users can update their own forum posts" ON public.forum_posts
      FOR UPDATE USING (auth.uid() = author_id);
  END IF;
END $$;

DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policy pol
    JOIN pg_class pc ON pc.oid = pol.polrelid
    WHERE pol.polname = 'Users can delete their own forum posts' 
    AND pc.relname = 'forum_posts'
  ) THEN
    CREATE POLICY "Users can delete their own forum posts" ON public.forum_posts
      FOR DELETE USING (auth.uid() = author_id);
  END IF;
END $$;

-- Forum comments policies using safe approach
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policy pol
    JOIN pg_class pc ON pc.oid = pol.polrelid
    WHERE pol.polname = 'Users can view all forum comments' 
    AND pc.relname = 'forum_comments'
  ) THEN
    CREATE POLICY "Users can view all forum comments" ON public.forum_comments
      FOR SELECT USING (true);
  END IF;
END $$;

DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policy pol
    JOIN pg_class pc ON pc.oid = pol.polrelid
    WHERE pol.polname = 'Users can create their own forum comments' 
    AND pc.relname = 'forum_comments'
  ) THEN
    CREATE POLICY "Users can create their own forum comments" ON public.forum_comments
      FOR INSERT WITH CHECK (auth.uid() = author_id);
  END IF;
END $$;

DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policy pol
    JOIN pg_class pc ON pc.oid = pol.polrelid
    WHERE pol.polname = 'Users can update their own forum comments' 
    AND pc.relname = 'forum_comments'
  ) THEN
    CREATE POLICY "Users can update their own forum comments" ON public.forum_comments
      FOR UPDATE USING (auth.uid() = author_id);
  END IF;
END $$;

DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policy pol
    JOIN pg_class pc ON pc.oid = pol.polrelid
    WHERE pol.polname = 'Users can delete their own forum comments' 
    AND pc.relname = 'forum_comments'
  ) THEN
    CREATE POLICY "Users can delete their own forum comments" ON public.forum_comments
      FOR DELETE USING (auth.uid() = author_id);
  END IF;
END $$;

-- Grant permissions
GRANT ALL ON public.forum_posts TO authenticated;
GRANT ALL ON public.forum_comments TO authenticated;

COMMIT;