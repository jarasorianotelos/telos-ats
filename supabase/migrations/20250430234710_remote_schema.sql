drop policy "Users can create their own applicants" on "public"."applicants";

drop policy "Users can view their own applicants" on "public"."applicants";

alter table "public"."applicants" alter column "cv_link" set default 'https://wnywlwahimhlfnxmwhsu.supabase.co/storage/v1/object/public/resumes//blank-resume-template-clean.pdf'::text;

alter table "public"."joborder" add column "updates" text;

set check_function_bodies = off;

CREATE OR REPLACE FUNCTION public.handle_joborder_applicant_status_change()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
  -- Check if the status changed to 'Hired'
  IF NEW.application_stage = 'Hired' AND (OLD.application_stage IS NULL OR OLD.application_stage != 'Hired') THEN
    -- Insert into joborder_commission table
    INSERT INTO public.joborder_commission (
      joborder_applicant_id,
      current_commission,
      received_commission,
      commission_details,
      status,
      created_at,
      updated_at
    )
    VALUES (
      NEW.id,  -- This is the joborder_applicant.id
      0.00,    -- Default current_commission
      0.00,    -- Default received_commissio
      NULL,    -- commission_details
      NULL,    -- status
      CURRENT_TIMESTAMP,
      CURRENT_TIMESTAMP
    );
  END IF;
  RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
  INSERT INTO public.users (
    id,
    first_name,
    last_name,
    email,
    username,
    role,
    created_at
  )
  VALUES (
    new.id,
    COALESCE(new.raw_user_meta_data->>'first_name', ''),
    COALESCE(new.raw_user_meta_data->>'last_name', ''),
    new.email,
    COALESCE(new.raw_user_meta_data->>'username', ''),
    COALESCE(new.raw_user_meta_data->>'role', 'recruiter'),
    CURRENT_TIMESTAMP
  );
  RETURN new;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.update_commission_status()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
  -- Update status based on received_commission and current_commission
  IF NEW.current_commission = 0 THEN
    NEW.status := 'pending';
  ELSIF NEW.received_commission >= NEW.current_commission THEN
    NEW.status := 'completed';
  ELSE
    NEW.status := 'pending';
  END IF;
  
  RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.verify_password(input_password text, hashed_password text)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
  -- pgcrypto is built-in to Supabase, so we can use it to verify the password
  RETURN crypt(input_password, hashed_password) = hashed_password;
END;
$function$
;

create policy "Enable read access for all users"
on "public"."system_logs"
as permissive
for select
to public
using (true);


create policy "Users can create their own applicants"
on "public"."applicants"
as permissive
for insert
to public
with check (true);


create policy "Users can view their own applicants"
on "public"."applicants"
as permissive
for select
to public
using (true);



