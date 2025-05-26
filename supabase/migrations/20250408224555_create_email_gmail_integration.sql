-- Create a table to store Gmail integration tokens
CREATE TABLE IF NOT EXISTS public.gmail_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  access_token TEXT,
  refresh_token TEXT,
  expiry_date TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS on gmail_tokens table
ALTER TABLE public.gmail_tokens ENABLE ROW LEVEL SECURITY;

-- Add RLS policy to only allow users to access their own tokens
CREATE POLICY "Users can only access their own Gmail tokens"
  ON public.gmail_tokens
  FOR ALL
  USING (auth.uid() = user_id);

-- Create a table to store email threads
CREATE TABLE IF NOT EXISTS public.email_threads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  applicant_id UUID REFERENCES public.applicants(id) NOT NULL,
  thread_id TEXT NOT NULL,
  subject TEXT,
  last_updated TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS on email_threads table
ALTER TABLE public.email_threads ENABLE ROW LEVEL SECURITY;

-- Add RLS policy to only allow users to access their own email threads
CREATE POLICY "Users can only access their own email threads"
  ON public.email_threads
  FOR ALL
  USING (auth.uid() = user_id);

-- Create a table to store individual emails in threads
CREATE TABLE IF NOT EXISTS public.emails (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  thread_id UUID REFERENCES public.email_threads(id) NOT NULL,
  message_id TEXT NOT NULL,
  from_email TEXT NOT NULL,
  from_name TEXT,
  to_email TEXT NOT NULL,
  to_name TEXT,
  subject TEXT,
  body_html TEXT,
  body_text TEXT,
  received_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS on emails table
ALTER TABLE public.emails ENABLE ROW LEVEL SECURITY;

-- Add RLS policy to only allow users to access emails in their threads
CREATE POLICY "Users can only access emails in their threads"
  ON public.emails
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.email_threads
      WHERE email_threads.id = emails.thread_id
      AND email_threads.user_id = auth.uid()
    )
  );

-- Add a column to track if an applicant has email threads
ALTER TABLE public.applicants ADD COLUMN IF NOT EXISTS has_emails BOOLEAN DEFAULT FALSE;

-- Enable RLS on applicants table
ALTER TABLE public.applicants ENABLE ROW LEVEL SECURITY;

-- Add RLS policy to allow users to view their own applicants
CREATE POLICY "Users can view their own applicants"
  ON public.applicants
  FOR SELECT
  USING (auth.uid() = author_id);

-- Add RLS policy to allow users to create their own applicants
CREATE POLICY "Users can create their own applicants"
  ON public.applicants
  FOR INSERT
  WITH CHECK (auth.uid() = author_id);

-- Add RLS policy to allow users to update their own applicants
CREATE POLICY "Users can update their own applicants"
  ON public.applicants
  FOR UPDATE
  USING (auth.uid() = author_id)
  WITH CHECK (auth.uid() = author_id);

-- Add RLS policy to allow users to delete their own applicants
CREATE POLICY "Users can delete their own applicants"
  ON public.applicants
  FOR DELETE
  USING (auth.uid() = author_id);