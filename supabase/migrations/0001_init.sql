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

-- Regras de risco e lista de observação de cada usuário (valores iniciais das skills).
create table if not exists public.user_settings (
  user_id uuid primary key references auth.users (id) on delete cascade,
  watchlist text[] not null default '{}',
  rules jsonb not null,
  updated_at timestamptz not null default now()
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

create table if not exists public.paper_trades (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  ny_date date not null,
  symbol text not null,
  setup text not null,
  qty integer not null check (qty > 0),
  entry numeric not null check (entry > 0),
  stop numeric not null check (stop > 0 and stop < entry),
  target numeric not null check (target > entry),
  max_loss numeric not null,
  status text not null default 'aberta' check (status in ('aberta', 'fechada')),
  exit_price numeric,
  exit_at timestamptz,
  exit_reason text
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
alter table public.user_settings enable row level security;
alter table public.analyses enable row level security;
alter table public.paper_trades enable row level security;
alter table public.api_usage enable row level security;
alter table public.audit_log enable row level security;

create policy "planos visíveis" on public.plans for select using (active);
create policy "meu plano" on public.user_plans for select using (auth.uid() = user_id);
create policy "meu uso" on public.usage_counters for select using (auth.uid() = user_id);
create policy "meus ajustes" on public.user_settings for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "minhas análises" on public.analyses for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "meus trades paper" on public.paper_trades for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
-- api_usage e audit_log: só o servidor (service_role) escreve e lê.

create index if not exists analyses_user_created on public.analyses (user_id, created_at desc);
create index if not exists paper_trades_user_created on public.paper_trades (user_id, created_at desc);

-- Plano gratuito inicial, sem limite definido ainda (decisão pendente do dono do projeto).
insert into public.plans (id, name, monthly_analyses, price_cents) values ('gratuito', 'Gratuito', null, 0)
on conflict (id) do nothing;
