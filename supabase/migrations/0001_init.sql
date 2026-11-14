-- TRADING MOHAMED FLOOR — esquema inicial (preparado, ainda NÃO aplicado).
-- Aplicar no Supabase (SQL Editor) quando o projeto for criado (ver docs/SETUP_CONTAS.md).
-- Cada registro pertence a um usuário; Row Level Security impede que um usuário veja dados de outro.

create table if not exists public.plans (
  id text primary key,
  name text not null,
  monthly_analyses integer,          -- null = sem limite
  price_cents integer not null default 0,
  active boolean not null default true
);

create table if not exists public.user_plans (
  user_id uuid primary key references auth.users (id) on delete cascade,
  plan_id text not null references public.plans (id),
  started_at timestamptz not null default now()
);

create table if not exists public.usage_counters (
  user_id uuid not null references auth.users (id) on delete cascade,
  period text not null,              -- ex.: 2026-11
  analyses integer not null default 0,
  primary key (user_id, period)
);

-- Expirações e payouts: vazios até o usuário informar o que a plataforma mostra.
create table if not exists public.asset_settings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  asset text not null,
  expirations text[] not null default '{}',
  payout_pct numeric check (payout_pct is null or payout_pct > 0),
  updated_at timestamptz not null default now(),
  unique (user_id, asset)
);

create table if not exists public.analyses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  model text not null,
  asset text,
  timeframe text,
  reading jsonb not null,
  signal text not null check (signal in ('COMPRA', 'VENDA', 'NEUTRO')),
  decision jsonb not null,
  elapsed_ms integer
);

create table if not exists public.simulations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  analysis_id uuid references public.analyses (id) on delete set null,
  created_at timestamptz not null default now(),
  asset text not null,
  direction text not null check (direction in ('COMPRA', 'VENDA')),
  expiration text not null,
  payout_pct numeric not null check (payout_pct > 0),
  stake numeric not null check (stake > 0),
  outcome text not null default 'pendente' check (outcome in ('pendente', 'acerto', 'erro', 'empate'))
);

create table if not exists public.api_usage (
  id bigint generated always as identity primary key,
  user_id uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  model text not null,
  input_tokens integer,
  output_tokens integer
);

create table if not exists public.audit_log (
  id bigint generated always as identity primary key,
  user_id uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  action text not null,
  detail jsonb
);

alter table public.plans enable row level security;
alter table public.user_plans enable row level security;
alter table public.usage_counters enable row level security;
alter table public.asset_settings enable row level security;
alter table public.analyses enable row level security;
alter table public.simulations enable row level security;
alter table public.api_usage enable row level security;
alter table public.audit_log enable row level security;

create policy "planos visíveis" on public.plans for select using (active);
create policy "meu plano" on public.user_plans for select using (auth.uid() = user_id);
create policy "meu uso" on public.usage_counters for select using (auth.uid() = user_id);
create policy "meus ativos" on public.asset_settings for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "minhas análises" on public.analyses for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "minhas simulações" on public.simulations for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
-- api_usage e audit_log: só o servidor (service_role) escreve e lê.

create index if not exists analyses_user_created on public.analyses (user_id, created_at desc);
create index if not exists simulations_user_created on public.simulations (user_id, created_at desc);

-- Plano gratuito inicial, sem limite definido ainda (decisão pendente do dono do projeto).
insert into public.plans (id, name, monthly_analyses, price_cents) values ('gratuito', 'Gratuito', null, 0)
on conflict (id) do nothing;
