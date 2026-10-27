CREATE TABLE IF NOT EXISTS public.sprungbrett_progress (
  account_key text PRIMARY KEY CHECK (account_key ~ '^[a-f0-9]{64}$'),
  revision integer NOT NULL CHECK (revision > 0),
  progress jsonb NOT NULL CHECK (jsonb_typeof(progress) = 'object'),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (octet_length(progress::text) <= 1000000)
);

REVOKE ALL ON TABLE public.sprungbrett_progress FROM PUBLIC;
ALTER TABLE public.sprungbrett_progress ENABLE ROW LEVEL SECURITY;