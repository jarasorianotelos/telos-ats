

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;


CREATE EXTENSION IF NOT EXISTS "pgsodium";






COMMENT ON SCHEMA "public" IS 'standard public schema';



CREATE EXTENSION IF NOT EXISTS "pg_graphql" WITH SCHEMA "graphql";






CREATE EXTENSION IF NOT EXISTS "pg_stat_statements" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "pgjwt" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "supabase_vault" WITH SCHEMA "vault";






CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA "extensions";






CREATE OR REPLACE FUNCTION "public"."handle_joborder_applicant_status_change"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
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
$$;


ALTER FUNCTION "public"."handle_joborder_applicant_status_change"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."handle_new_user"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
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
$$;


ALTER FUNCTION "public"."handle_new_user"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."log_table_change"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  action_type TEXT;
  details_json JSONB;
BEGIN
  -- Determine action type
  IF TG_OP = 'INSERT' THEN
    action_type := 'created';
    details_json := to_jsonb(NEW);
  ELSIF TG_OP = 'UPDATE' THEN
    action_type := 'updated';
    details_json := jsonb_build_object(
      'old', to_jsonb(OLD),
      'new', to_jsonb(NEW),
      'changes', (SELECT jsonb_object_agg(key, value) FROM jsonb_each(to_jsonb(NEW)) 
                 WHERE to_jsonb(NEW) -> key IS DISTINCT FROM to_jsonb(OLD) -> key)
    );
  ELSIF TG_OP = 'DELETE' THEN
    action_type := 'deleted';
    details_json := to_jsonb(OLD);
  END IF;

  -- Insert log entry
  INSERT INTO public.system_logs (
    user_id,
    action,
    entity_type,
    entity_id,
    details
  ) VALUES (
    COALESCE(auth.uid(), '00000000-0000-0000-0000-000000000000'::uuid),
    action_type,
    TG_TABLE_NAME,
    CASE 
      WHEN TG_OP = 'DELETE' THEN OLD.id
      ELSE NEW.id
    END,
    details_json
  );

  RETURN NULL;
END;
$$;


ALTER FUNCTION "public"."log_table_change"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_commission_status"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
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
$$;


ALTER FUNCTION "public"."update_commission_status"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."verify_password"("input_password" "text", "hashed_password" "text") RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  -- pgcrypto is built-in to Supabase, so we can use it to verify the password
  RETURN crypt(input_password, hashed_password) = hashed_password;
END;
$$;


ALTER FUNCTION "public"."verify_password"("input_password" "text", "hashed_password" "text") OWNER TO "postgres";

SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "public"."applicants" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "author_id" "uuid" NOT NULL,
    "first_name" "text" NOT NULL,
    "last_name" "text" NOT NULL,
    "email" "text" NOT NULL,
    "phone" "text",
    "location" "text",
    "cv_link" "text",
    "created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updated_at" timestamp with time zone,
    "deleted_at" timestamp with time zone,
    "linkedin_profile" character varying
);


ALTER TABLE "public"."applicants" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."clients" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "author_id" "uuid" NOT NULL,
    "first_name" "text" NOT NULL,
    "last_name" "text" NOT NULL,
    "position" "text" NOT NULL,
    "email" "text" NOT NULL,
    "phone" "text",
    "location" "text",
    "company" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updated_at" timestamp with time zone,
    "deleted_at" timestamp with time zone
);


ALTER TABLE "public"."clients" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."joborder" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "job_title" "text" NOT NULL,
    "client_id" "uuid" NOT NULL,
    "author_id" "uuid" NOT NULL,
    "status" "text" DEFAULT ''::"text" NOT NULL,
    "job_description" "text",
    "schedule" "text",
    "client_budget" "text",
    "created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updated_at" timestamp with time zone,
    "priority" "text" DEFAULT '"Low''''::text'::"text",
    "archived" boolean DEFAULT false,
    "sourcing_preference" "jsonb",
    "deleted_at" timestamp without time zone
);


ALTER TABLE "public"."joborder" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."joborder_applicant" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "joborder_id" "uuid" NOT NULL,
    "applicant_id" "uuid" NOT NULL,
    "client_id" "uuid" NOT NULL,
    "author_id" "uuid" NOT NULL,
    "application_stage" "text" DEFAULT '''''Sourced''''::text''::text'::"text" NOT NULL,
    "application_status" "text" DEFAULT 'Pending'::"text" NOT NULL,
    "interview_notes" "text",
    "asking_salary" numeric,
    "client_feedback" "text",
    "created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updated_at" timestamp with time zone,
    "candidate_start_date" "date",
    "deleted_at" timestamp without time zone
);


ALTER TABLE "public"."joborder_applicant" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."joborder_commission" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "joborder_applicant_id" "uuid",
    "current_commission" numeric(10,2) DEFAULT 0.00,
    "commission_details" "jsonb",
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()),
    "updated_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()),
    "deleted_at" timestamp with time zone,
    "received_commission" numeric DEFAULT 0.00,
    "status" "text"
);


ALTER TABLE "public"."joborder_commission" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."joborder_favorites" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "joborder_id" "uuid",
    "user_id" "uuid",
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL
);


ALTER TABLE "public"."joborder_favorites" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."log_access_control" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "password_hash" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updated_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE "public"."log_access_control" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."pipeline_card_applicants" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "card_id" "uuid" NOT NULL,
    "applicant_id" "uuid" NOT NULL,
    "added_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "author_id" "uuid"
);


ALTER TABLE "public"."pipeline_card_applicants" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."pipeline_cards" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "title" "text" NOT NULL,
    "author_id" "uuid" NOT NULL,
    "created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updated_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE "public"."pipeline_cards" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."system_logs" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid",
    "action" "text" NOT NULL,
    "entity_type" "text" NOT NULL,
    "entity_id" "uuid",
    "details" "jsonb",
    "created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE "public"."system_logs" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."users" (
    "id" "uuid" DEFAULT "auth"."uid"() NOT NULL,
    "first_name" "text" NOT NULL,
    "last_name" "text" NOT NULL,
    "email" "text" NOT NULL,
    "password" "text",
    "username" "text" NOT NULL,
    "role" "text" DEFAULT ''::"text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updated_at" timestamp with time zone,
    "deleted_at" timestamp with time zone,
    CONSTRAINT "users_role_check" CHECK (("role" = ANY (ARRAY['recruiter'::"text", 'administrator'::"text"])))
);


ALTER TABLE "public"."users" OWNER TO "postgres";


ALTER TABLE ONLY "public"."applicants"
    ADD CONSTRAINT "applicants_email_key" UNIQUE ("email");



ALTER TABLE ONLY "public"."applicants"
    ADD CONSTRAINT "applicants_linkedin_url_key" UNIQUE ("linkedin_profile");



ALTER TABLE ONLY "public"."applicants"
    ADD CONSTRAINT "applicants_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."clients"
    ADD CONSTRAINT "clients_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."joborder_applicant"
    ADD CONSTRAINT "joborder_applicant_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."joborder_commission"
    ADD CONSTRAINT "joborder_commission_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."joborder_favorites"
    ADD CONSTRAINT "joborder_favorite_joborder_id_user_id_key" UNIQUE ("joborder_id", "user_id");



ALTER TABLE ONLY "public"."joborder_favorites"
    ADD CONSTRAINT "joborder_favorite_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."joborder"
    ADD CONSTRAINT "joborder_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."log_access_control"
    ADD CONSTRAINT "log_access_control_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."pipeline_card_applicants"
    ADD CONSTRAINT "pipeline_card_applicants_card_id_applicant_id_key" UNIQUE ("card_id", "applicant_id");



ALTER TABLE ONLY "public"."pipeline_card_applicants"
    ADD CONSTRAINT "pipeline_card_applicants_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."pipeline_cards"
    ADD CONSTRAINT "pipeline_cards_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."system_logs"
    ADD CONSTRAINT "system_logs_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."users"
    ADD CONSTRAINT "users_email_key" UNIQUE ("email");



ALTER TABLE ONLY "public"."users"
    ADD CONSTRAINT "users_pkey" PRIMARY KEY ("id");





CREATE INDEX "idx_applicants_email" ON "public"."applicants" USING "btree" ("email");



CREATE INDEX "idx_clients_email" ON "public"."clients" USING "btree" ("email");



CREATE INDEX "idx_joborder_applicant_applicant_id" ON "public"."joborder_applicant" USING "btree" ("applicant_id");



CREATE INDEX "idx_joborder_applicant_application_stage" ON "public"."joborder_applicant" USING "btree" ("application_stage");



CREATE INDEX "idx_joborder_applicant_application_status" ON "public"."joborder_applicant" USING "btree" ("application_status");



CREATE INDEX "idx_joborder_applicant_joborder_id" ON "public"."joborder_applicant" USING "btree" ("joborder_id");



CREATE INDEX "idx_joborder_client_id" ON "public"."joborder" USING "btree" ("client_id");



CREATE INDEX "idx_joborder_status" ON "public"."joborder" USING "btree" ("status");



CREATE INDEX "idx_users_email" ON "public"."users" USING "btree" ("email");



CREATE INDEX "idx_users_id" ON "public"."users" USING "btree" ("id");



CREATE OR REPLACE TRIGGER "joborder_applicant_status_change" AFTER UPDATE ON "public"."joborder_applicant" FOR EACH ROW EXECUTE FUNCTION "public"."handle_joborder_applicant_status_change"();



CREATE OR REPLACE TRIGGER "log_applicants_changes" AFTER INSERT OR DELETE OR UPDATE ON "public"."applicants" FOR EACH ROW EXECUTE FUNCTION "public"."log_table_change"();



CREATE OR REPLACE TRIGGER "log_clients_changes" AFTER INSERT OR DELETE OR UPDATE ON "public"."clients" FOR EACH ROW EXECUTE FUNCTION "public"."log_table_change"();



CREATE OR REPLACE TRIGGER "log_joborder_applicant_changes" AFTER INSERT OR DELETE OR UPDATE ON "public"."joborder_applicant" FOR EACH ROW EXECUTE FUNCTION "public"."log_table_change"();



CREATE OR REPLACE TRIGGER "log_joborder_changes" AFTER INSERT OR DELETE OR UPDATE ON "public"."joborder" FOR EACH ROW EXECUTE FUNCTION "public"."log_table_change"();



CREATE OR REPLACE TRIGGER "log_joborder_commission_changes" AFTER INSERT OR DELETE OR UPDATE ON "public"."joborder_commission" FOR EACH ROW EXECUTE FUNCTION "public"."log_table_change"();



CREATE OR REPLACE TRIGGER "log_users_changes" AFTER INSERT OR DELETE OR UPDATE ON "public"."users" FOR EACH ROW EXECUTE FUNCTION "public"."log_table_change"();



CREATE OR REPLACE TRIGGER "update_commission_status_trigger" BEFORE INSERT OR UPDATE OF "received_commission", "current_commission" ON "public"."joborder_commission" FOR EACH ROW EXECUTE FUNCTION "public"."update_commission_status"();



ALTER TABLE ONLY "public"."applicants"
    ADD CONSTRAINT "applicants_author_id_fkey" FOREIGN KEY ("author_id") REFERENCES "public"."users"("id");



ALTER TABLE ONLY "public"."clients"
    ADD CONSTRAINT "clients_author_id_fkey" FOREIGN KEY ("author_id") REFERENCES "public"."users"("id");



ALTER TABLE ONLY "public"."joborder_applicant"
    ADD CONSTRAINT "joborder_applicant_applicant_id_fkey" FOREIGN KEY ("applicant_id") REFERENCES "public"."applicants"("id");



ALTER TABLE ONLY "public"."joborder_applicant"
    ADD CONSTRAINT "joborder_applicant_author_id_fkey" FOREIGN KEY ("author_id") REFERENCES "public"."users"("id");



ALTER TABLE ONLY "public"."joborder_applicant"
    ADD CONSTRAINT "joborder_applicant_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id");



ALTER TABLE ONLY "public"."joborder_applicant"
    ADD CONSTRAINT "joborder_applicant_joborder_id_fkey" FOREIGN KEY ("joborder_id") REFERENCES "public"."joborder"("id");



ALTER TABLE ONLY "public"."joborder"
    ADD CONSTRAINT "joborder_author_id_fkey" FOREIGN KEY ("author_id") REFERENCES "public"."users"("id");



ALTER TABLE ONLY "public"."joborder"
    ADD CONSTRAINT "joborder_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id");



ALTER TABLE ONLY "public"."joborder_commission"
    ADD CONSTRAINT "joborder_commission_joborder_applicant_id_fkey" FOREIGN KEY ("joborder_applicant_id") REFERENCES "public"."joborder_applicant"("id");



ALTER TABLE ONLY "public"."joborder_favorites"
    ADD CONSTRAINT "joborder_favorite_joborder_id_fkey" FOREIGN KEY ("joborder_id") REFERENCES "public"."joborder"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."joborder_favorites"
    ADD CONSTRAINT "joborder_favorite_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."pipeline_card_applicants"
    ADD CONSTRAINT "pipeline_card_applicants_applicant_id_fkey" FOREIGN KEY ("applicant_id") REFERENCES "public"."applicants"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."pipeline_card_applicants"
    ADD CONSTRAINT "pipeline_card_applicants_author_id_fkey" FOREIGN KEY ("author_id") REFERENCES "public"."users"("id");



ALTER TABLE ONLY "public"."pipeline_card_applicants"
    ADD CONSTRAINT "pipeline_card_applicants_card_id_fkey" FOREIGN KEY ("card_id") REFERENCES "public"."pipeline_cards"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."pipeline_cards"
    ADD CONSTRAINT "pipeline_cards_author_id_fkey" FOREIGN KEY ("author_id") REFERENCES "public"."users"("id");



ALTER TABLE ONLY "public"."system_logs"
    ADD CONSTRAINT "system_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id");



CREATE POLICY "Allow admins to view log_access_control" ON "public"."log_access_control" FOR SELECT TO "authenticated" USING (("auth"."uid"() IN ( SELECT "users"."id"
   FROM "auth"."users"
  WHERE (("users"."raw_user_meta_data" ->> 'role'::"text") = 'administrator'::"text"))));



CREATE POLICY "Allow null user_ids in system_logs" ON "public"."system_logs" USING ((("user_id" IS NULL) OR ("auth"."uid"() = "user_id")));



CREATE POLICY "Allow users to create job orders" ON "public"."joborder" FOR INSERT TO "authenticated" WITH CHECK (("auth"."uid"() = "author_id"));



CREATE POLICY "Allow users to update job orders" ON "public"."joborder" FOR UPDATE TO "authenticated" USING ((("auth"."uid"() = "author_id") OR ("auth"."uid"() IN ( SELECT "users"."id"
   FROM "public"."users"
  WHERE ("users"."role" = 'administrator'::"text")))));



CREATE POLICY "Allow users to view job orders" ON "public"."joborder" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "Delete" ON "public"."joborder" FOR DELETE TO "authenticated" USING (("auth"."uid"() = "author_id"));



CREATE POLICY "Enable delete for authenticated users" ON "public"."joborder_commission" FOR DELETE USING (("auth"."role"() = 'authenticated'::"text"));



CREATE POLICY "Enable delete for authenticated users" ON "public"."pipeline_card_applicants" FOR DELETE TO "authenticated" USING (("auth"."uid"() = "author_id"));



CREATE POLICY "Enable delete for users based on user_id" ON "public"."joborder" FOR DELETE USING ((( SELECT "auth"."uid"() AS "uid") = "author_id"));



CREATE POLICY "Enable delete for users based on user_id" ON "public"."joborder_applicant" FOR DELETE USING ((( SELECT "auth"."uid"() AS "uid") = "author_id"));



CREATE POLICY "Enable insert for authenticated users" ON "public"."joborder_commission" FOR INSERT WITH CHECK (("auth"."role"() = 'authenticated'::"text"));



CREATE POLICY "Enable insert for authenticated users" ON "public"."pipeline_card_applicants" FOR INSERT TO "authenticated" WITH CHECK (("auth"."uid"() = "author_id"));



CREATE POLICY "Enable insert for authenticated users only" ON "public"."joborder_applicant" FOR INSERT TO "authenticated" WITH CHECK (true);



CREATE POLICY "Enable read access for all users" ON "public"."joborder_applicant" FOR SELECT USING (true);



CREATE POLICY "Enable read access for authenticated users" ON "public"."joborder_commission" FOR SELECT USING (("auth"."role"() = 'authenticated'::"text"));



CREATE POLICY "Enable read access for authenticated users" ON "public"."pipeline_card_applicants" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "Enable update for authenticated users" ON "public"."joborder_commission" FOR UPDATE USING (("auth"."role"() = 'authenticated'::"text"));



CREATE POLICY "Select" ON "public"."system_logs" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "UPDATE" ON "public"."joborder_applicant" FOR UPDATE USING ((( SELECT "auth"."uid"() AS "uid") = "author_id")) WITH CHECK ((( SELECT "auth"."uid"() AS "uid") = "author_id"));



CREATE POLICY "Users can add their own applicants to cards" ON "public"."pipeline_card_applicants" FOR INSERT WITH CHECK (((EXISTS ( SELECT 1
   FROM "public"."pipeline_cards"
  WHERE (("pipeline_cards"."id" = "pipeline_card_applicants"."card_id") AND ("pipeline_cards"."author_id" = "auth"."uid"())))) AND (EXISTS ( SELECT 1
   FROM "public"."applicants"
  WHERE (("applicants"."id" = "pipeline_card_applicants"."applicant_id") AND ("applicants"."author_id" = "auth"."uid"()))))));



CREATE POLICY "Users can create their own pipeline cards" ON "public"."pipeline_cards" FOR INSERT WITH CHECK (("auth"."uid"() = "author_id"));



CREATE POLICY "Users can delete their own favorites" ON "public"."joborder_favorites" FOR DELETE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can delete their own pipeline cards" ON "public"."pipeline_cards" FOR DELETE USING (("auth"."uid"() = "author_id"));



CREATE POLICY "Users can insert their own favorites" ON "public"."joborder_favorites" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can remove their own applicants from cards" ON "public"."pipeline_card_applicants" FOR DELETE USING ((EXISTS ( SELECT 1
   FROM "public"."pipeline_cards"
  WHERE (("pipeline_cards"."id" = "pipeline_card_applicants"."card_id") AND ("pipeline_cards"."author_id" = "auth"."uid"())))));



CREATE POLICY "Users can update their own pipeline cards" ON "public"."pipeline_cards" FOR UPDATE USING (("auth"."uid"() = "author_id"));



CREATE POLICY "Users can view their own applicants in cards" ON "public"."pipeline_card_applicants" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."pipeline_cards"
  WHERE (("pipeline_cards"."id" = "pipeline_card_applicants"."card_id") AND ("pipeline_cards"."author_id" = "auth"."uid"())))));



CREATE POLICY "Users can view their own favorites" ON "public"."joborder_favorites" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can view their own pipeline cards" ON "public"."pipeline_cards" FOR SELECT USING (("auth"."uid"() = "author_id"));



ALTER TABLE "public"."joborder" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."joborder_applicant" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."joborder_commission" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."joborder_favorites" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."log_access_control" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."pipeline_card_applicants" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."pipeline_cards" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."system_logs" ENABLE ROW LEVEL SECURITY;



ALTER PUBLICATION "supabase_realtime" OWNER TO "postgres";



GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";



GRANT ALL ON FUNCTION "public"."handle_joborder_applicant_status_change"() TO "anon";
GRANT ALL ON FUNCTION "public"."handle_joborder_applicant_status_change"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."handle_joborder_applicant_status_change"() TO "service_role";



GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "anon";
GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "service_role";



GRANT ALL ON FUNCTION "public"."log_table_change"() TO "anon";
GRANT ALL ON FUNCTION "public"."log_table_change"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."log_table_change"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_commission_status"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_commission_status"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_commission_status"() TO "service_role";



GRANT ALL ON FUNCTION "public"."verify_password"("input_password" "text", "hashed_password" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."verify_password"("input_password" "text", "hashed_password" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."verify_password"("input_password" "text", "hashed_password" "text") TO "service_role";





GRANT ALL ON TABLE "public"."applicants" TO "anon";
GRANT ALL ON TABLE "public"."applicants" TO "authenticated";
GRANT ALL ON TABLE "public"."applicants" TO "service_role";



GRANT ALL ON TABLE "public"."clients" TO "anon";
GRANT ALL ON TABLE "public"."clients" TO "authenticated";
GRANT ALL ON TABLE "public"."clients" TO "service_role";



GRANT ALL ON TABLE "public"."joborder" TO "anon";
GRANT ALL ON TABLE "public"."joborder" TO "authenticated";
GRANT ALL ON TABLE "public"."joborder" TO "service_role";



GRANT ALL ON TABLE "public"."joborder_applicant" TO "anon";
GRANT ALL ON TABLE "public"."joborder_applicant" TO "authenticated";
GRANT ALL ON TABLE "public"."joborder_applicant" TO "service_role";



GRANT ALL ON TABLE "public"."joborder_commission" TO "anon";
GRANT ALL ON TABLE "public"."joborder_commission" TO "authenticated";
GRANT ALL ON TABLE "public"."joborder_commission" TO "service_role";



GRANT ALL ON TABLE "public"."joborder_favorites" TO "anon";
GRANT ALL ON TABLE "public"."joborder_favorites" TO "authenticated";
GRANT ALL ON TABLE "public"."joborder_favorites" TO "service_role";



GRANT ALL ON TABLE "public"."log_access_control" TO "anon";
GRANT ALL ON TABLE "public"."log_access_control" TO "authenticated";
GRANT ALL ON TABLE "public"."log_access_control" TO "service_role";


GRANT ALL ON TABLE "public"."pipeline_card_applicants" TO "anon";
GRANT ALL ON TABLE "public"."pipeline_card_applicants" TO "authenticated";
GRANT ALL ON TABLE "public"."pipeline_card_applicants" TO "service_role";


GRANT ALL ON TABLE "public"."pipeline_cards" TO "anon";
GRANT ALL ON TABLE "public"."pipeline_cards" TO "authenticated";
GRANT ALL ON TABLE "public"."pipeline_cards" TO "service_role";


GRANT ALL ON TABLE "public"."system_logs" TO "anon";
GRANT ALL ON TABLE "public"."system_logs" TO "authenticated";
GRANT ALL ON TABLE "public"."system_logs" TO "service_role";


GRANT ALL ON TABLE "public"."users" TO "anon";
GRANT ALL ON TABLE "public"."users" TO "authenticated";
GRANT ALL ON TABLE "public"."users" TO "service_role";


ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES  TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES  TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES  TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES  TO "service_role";


ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS  TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS  TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS  TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS  TO "service_role";


ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES  TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES  TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES  TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES  TO "service_role";


RESET ALL;
