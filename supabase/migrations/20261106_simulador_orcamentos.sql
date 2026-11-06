-- Simulador de IA + Orçamentos (esquadrias e vidraçarias)

-- Dados da vidraçaria, usados no PDF -------------------------------------
create table public.business_profiles (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  company_name text,
  logo_path text,
  phone text,
  email text,
  instagram text,
  address text,
  cnpj text,
  warranty text not null default '12 meses de garantia na instalação e nas ferragens',
  lead_time text not null default '15 dias úteis após a medição técnica',
  validity_days int not null default 7 check (validity_days between 1 and 90),
  pix_discount_pct numeric(5,2) not null default 5 check (pix_discount_pct between 0 and 50),
  max_installments int not null default 10 check (max_installments between 1 and 24),
  differentials text not null default E'Medição técnica no local\nInstalação com equipe própria\nAcabamento e limpeza ao final da obra',
  updated_at timestamptz not null default now()
);

-- Simulações de IA --------------------------------------------------------
create table public.simulations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  project_type text not null,
  options jsonb not null default '{}'::jsonb,
  details text check (char_length(details) <= 1000),
  before_path text not null,
  after_path text,
  status text not null default 'processing' check (status in ('processing','done','error')),
  error text,
  model text,
  created_at timestamptz not null default now()
);
create index simulations_user_idx on public.simulations(user_id, created_at desc);

-- Orçamentos --------------------------------------------------------------
create table public.quotes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  number int not null,
  status text not null default 'rascunho' check (status in ('rascunho','enviado','aprovado','recusado')),
  client_name text not null,
  client_phone text,
  client_email text,
  client_address text,
  title text,
  items jsonb not null default '[]'::jsonb,
  payment jsonb not null default '{}'::jsonb,
  discount numeric(12,2) not null default 0 check (discount >= 0),
  notes text,
  valid_until date,
  simulation_ids uuid[] not null default '{}',
  total numeric(12,2) not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, number)
);
create index quotes_user_idx on public.quotes(user_id, created_at desc);

create or replace function public.set_quote_number()
returns trigger language plpgsql set search_path = '' as $$
begin
  perform pg_advisory_xact_lock(hashtext(new.user_id::text));
  select coalesce(max(q.number), 0) + 1 into new.number from public.quotes q where q.user_id = new.user_id;
  return new;
end; $$;
create trigger quotes_number before insert on public.quotes for each row execute function public.set_quote_number();
create trigger quotes_touch before update on public.quotes for each row execute function public.touch_updated_at();
create trigger business_touch before update on public.business_profiles for each row execute function public.touch_updated_at();

-- Só o dono vê: esses dados são dos clientes da vidraçaria ------------------
alter table public.business_profiles enable row level security;
alter table public.simulations enable row level security;
alter table public.quotes enable row level security;

create policy business_all on public.business_profiles for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

-- Simulações são gravadas apenas pela função de IA (ela controla a cota).
create policy simulations_select on public.simulations for select to authenticated
  using (user_id = (select auth.uid()));
create policy simulations_delete on public.simulations for delete to authenticated
  using (user_id = (select auth.uid()));

create policy quotes_all on public.quotes for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

-- Armazenamento privado: cada usuário só acessa a própria pasta ------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('project-images', 'project-images', false, 10485760, array['image/jpeg','image/png','image/webp']);

create policy project_images_select on storage.objects for select to authenticated
  using (bucket_id = 'project-images' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy project_images_insert on storage.objects for insert to authenticated
  with check (bucket_id = 'project-images' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy project_images_update on storage.objects for update to authenticated
  using (bucket_id = 'project-images' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy project_images_delete on storage.objects for delete to authenticated
  using (bucket_id = 'project-images' and (storage.foldername(name))[1] = (select auth.uid())::text);
