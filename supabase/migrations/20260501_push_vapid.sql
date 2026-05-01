-- Migration: extend push_subscriptions for VAPID-based Web Push
-- Run in Supabase SQL Editor

-- Ensure table exists (no-op if already there)
create table if not exists push_subscriptions (
  user_id uuid primary key references auth.users(id) on delete cascade,
  subscription jsonb,
  updated_at timestamptz default now()
);

-- Add tracking column for AQI alert deduplication
alter table push_subscriptions
  add column if not exists last_aqi_notif_level int default 0;

-- Ensure profiles table has location + threshold columns
alter table profiles
  add column if not exists lat double precision,
  add column if not exists lng double precision,
  add column if not exists aqi_alert_threshold int default 100;

-- Index for fast lookups
create index if not exists push_subs_user_idx on push_subscriptions(user_id);

-- RLS: users can only read/write their own subscription
alter table push_subscriptions enable row level security;

drop policy if exists "own subscription" on push_subscriptions;
create policy "own subscription" on push_subscriptions
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
