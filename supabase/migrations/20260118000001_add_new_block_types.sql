DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'content_block_type' AND pg_type.typnamespace = 'public'::regnamespace) THEN
    CREATE TYPE public.content_block_type AS ENUM (
      'rich_text',
      'video',
      'instruction',
      'assessment',
      'quiz',
      'image',
      'hero',
      'callout',
      'reflection',
      'activity',
      'summary',
      'image_grid'
    );
  ELSE
    BEGIN
      ALTER TYPE public.content_block_type ADD VALUE IF NOT EXISTS 'image';
    EXCEPTION WHEN duplicate_object THEN NULL;
    END;
    BEGIN
      ALTER TYPE public.content_block_type ADD VALUE IF NOT EXISTS 'hero';
    EXCEPTION WHEN duplicate_object THEN NULL;
    END;
    BEGIN
      ALTER TYPE public.content_block_type ADD VALUE IF NOT EXISTS 'callout';
    EXCEPTION WHEN duplicate_object THEN NULL;
    END;
    BEGIN
      ALTER TYPE public.content_block_type ADD VALUE IF NOT EXISTS 'reflection';
    EXCEPTION WHEN duplicate_object THEN NULL;
    END;
    BEGIN
      ALTER TYPE public.content_block_type ADD VALUE IF NOT EXISTS 'activity';
    EXCEPTION WHEN duplicate_object THEN NULL;
    END;
    BEGIN
      ALTER TYPE public.content_block_type ADD VALUE IF NOT EXISTS 'summary';
    EXCEPTION WHEN duplicate_object THEN NULL;
    END;
    BEGIN
      ALTER TYPE public.content_block_type ADD VALUE IF NOT EXISTS 'image_grid';
    EXCEPTION WHEN duplicate_object THEN NULL;
    END;
    BEGIN
      ALTER TYPE public.content_block_type ADD VALUE IF NOT EXISTS 'quiz';
    EXCEPTION WHEN duplicate_object THEN NULL;
    END;
  END IF;
END
$$;
