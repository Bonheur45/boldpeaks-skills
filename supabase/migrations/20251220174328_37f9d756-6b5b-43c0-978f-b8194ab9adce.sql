-- Add 'quiz' to the content_block_type enum and expand question_type
ALTER TYPE content_block_type ADD VALUE IF NOT EXISTS 'quiz';

-- Add 'true_false' and 'essay' to question_type enum for completeness
ALTER TYPE question_type ADD VALUE IF NOT EXISTS 'true_false';
ALTER TYPE question_type ADD VALUE IF NOT EXISTS 'essay';