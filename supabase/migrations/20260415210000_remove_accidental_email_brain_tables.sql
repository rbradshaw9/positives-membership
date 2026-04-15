-- Remove TCFA/Smartlead/MailWizz email-brain schema that was applied to this
-- project by mistake. Positives now uses ActiveCampaign + Postmark for member
-- lifecycle email, and these tables are not used by the app.
--
-- This migration intentionally refuses to run if any target table contains
-- rows, so we do not silently destroy useful production data.

DO $$
DECLARE
  table_names text[] := ARRAY[
    'contacts',
    'contact_sources',
    'contact_identities',
    'events',
    'scores',
    'suppression_entries',
    'routing_actions',
    'sync_jobs',
    'smartlead_campaigns',
    'smartlead_email_accounts',
    'mailwizz_campaigns'
  ];
  table_name text;
  has_rows boolean;
  tables_with_rows text[] := ARRAY[]::text[];
BEGIN
  FOREACH table_name IN ARRAY table_names LOOP
    IF to_regclass(format('public.%I', table_name)) IS NOT NULL THEN
      EXECUTE format('SELECT EXISTS (SELECT 1 FROM public.%I LIMIT 1)', table_name)
        INTO has_rows;

      IF has_rows THEN
        tables_with_rows := array_append(tables_with_rows, table_name);
      END IF;
    END IF;
  END LOOP;

  IF cardinality(tables_with_rows) > 0 THEN
    RAISE EXCEPTION
      'Refusing to drop retired email-brain tables with data: %',
      array_to_string(tables_with_rows, ', ');
  END IF;
END $$;

DROP VIEW IF EXISTS public.admin_contact_overview;

DROP TABLE IF EXISTS public.mailwizz_campaigns;
DROP TABLE IF EXISTS public.smartlead_email_accounts;
DROP TABLE IF EXISTS public.smartlead_campaigns;
DROP TABLE IF EXISTS public.sync_jobs;
DROP TABLE IF EXISTS public.routing_actions;
DROP TABLE IF EXISTS public.suppression_entries;
DROP TABLE IF EXISTS public.scores;
DROP TABLE IF EXISTS public.events;
DROP TABLE IF EXISTS public.contact_identities;
DROP TABLE IF EXISTS public.contact_sources;
DROP TABLE IF EXISTS public.contacts;

DROP FUNCTION IF EXISTS public.touch_updated_at();

DROP TYPE IF EXISTS public.sync_job_status;
DROP TYPE IF EXISTS public.sync_provider;
DROP TYPE IF EXISTS public.routing_action_status;
DROP TYPE IF EXISTS public.routing_action_type;
DROP TYPE IF EXISTS public.suppression_reason;
DROP TYPE IF EXISTS public.event_type;
DROP TYPE IF EXISTS public.external_system;
DROP TYPE IF EXISTS public.contact_state;
DROP TYPE IF EXISTS public.source_owner;
