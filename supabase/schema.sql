-- ============================================================
-- Casa Nuova — schema database
-- Da incollare UNA VOLTA nell'SQL Editor di Supabase e premere RUN.
-- ============================================================

create extension if not exists "pgcrypto";

-- ---------- Capitolato ----------
create table if not exists capitolato_items (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  status text not null default 'previsto' check (status in ('previsto','in_posa','fatto')),
  note text not null default '',
  sort int not null default 0
);

-- ---------- Sopralluoghi e foto ----------
create table if not exists visits (
  id uuid primary key default gen_random_uuid(),
  date date not null default current_date,
  title text not null,
  notes text not null default '',
  drone boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists photos (
  id uuid primary key default gen_random_uuid(),
  visit_id uuid references visits(id) on delete cascade,
  capitolato_item_id uuid references capitolato_items(id) on delete set null,
  design_kind text,                -- se valorizzato: foto della sezione Design (moodboard/render/...)
  storage_path text not null,
  thumb_path text not null,
  caption text not null default '',
  sort int not null default 0,
  created_at timestamptz not null default now()
);

-- ---------- Avanzamento palazzine ----------
create table if not exists buildings (
  code text primary key,
  percent int not null default 0 check (percent between 0 and 100),
  note text not null default '',
  updated_at timestamptz not null default now()
);

-- ---------- Impostazioni (riga unica) ----------
create table if not exists settings (
  id int primary key default 1 check (id = 1),
  floors_done int,                 -- SOLO inserimento manuale, verificato a vista
  floors_total int,
  floors_verified_on date,
  floors_note text not null default '',
  delivery_date date not null default '2027-12-01'
);

-- ---------- Checklist per stanza ----------
create table if not exists rooms (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  sort int not null default 0
);

create table if not exists checklist_items (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references rooms(id) on delete cascade,
  code text not null default 'ok' check (code in ('ok','manca','desiderio','domanda','tecnico')),
  text text not null,
  note text not null default '',
  done boolean not null default false,
  sort int not null default 0,
  created_at timestamptz not null default now()
);

-- ---------- Spese, documenti, acquisti ----------
create table if not exists expenses (
  id uuid primary key default gen_random_uuid(),
  label text not null,
  amount numeric(12,2),
  date date,
  status text not null default 'pagata' check (status in ('pagata','da_pagare','prevista')),
  note text not null default '',
  created_at timestamptz not null default now()
);

create table if not exists documents (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  category text not null default 'altro' check (category in ('contratto','capitolato','planimetria','preventivo','fattura','garanzia','altro')),
  storage_path text,
  note text not null default '',
  amount numeric(12,2),
  warranty_until date,
  created_at timestamptz not null default now()
);

-- ---------- Design ----------
create table if not exists design_items (
  id uuid primary key default gen_random_uuid(),
  kind text not null default 'moodboard' check (kind in ('moodboard','render','pezzo','finitura','gres')),
  title text not null,
  subtitle text not null default '',
  status text not null default '',
  image_path text,
  thumb_path text,
  sort int not null default 0,
  created_at timestamptz not null default now()
);

-- ---------- Note per il geometra ----------
create table if not exists geometra_notes (
  id uuid primary key default gen_random_uuid(),
  text text not null,
  done boolean not null default false,
  created_at timestamptz not null default now()
);

-- ============================================================
-- Sicurezza: tutto chiuso, accesso solo all'utente loggato
-- ============================================================
do $$
declare t text;
begin
  foreach t in array array['capitolato_items','visits','photos','buildings','settings','rooms',
                           'checklist_items','expenses','documents','design_items','geometra_notes']
  loop
    execute format('alter table %I enable row level security', t);
    execute format('drop policy if exists "autenticato tutto" on %I', t);
    execute format('create policy "autenticato tutto" on %I for all to authenticated using (true) with check (true)', t);
  end loop;
end $$;

-- Storage: i bucket media e documents solo all'utente loggato
drop policy if exists "autenticato storage" on storage.objects;
create policy "autenticato storage" on storage.objects for all to authenticated
  using (bucket_id in ('media','documents'))
  with check (bucket_id in ('media','documents'));

-- ============================================================
-- Dati iniziali
-- ============================================================
insert into settings (id) values (1) on conflict do nothing;

insert into buildings (code, percent, note) values
  ('A', 0, ''), ('B', 0, ''), ('C', 0, ''), ('D', 0, ''), ('T', 0, ''), ('E', 0, '')
on conflict do nothing;

insert into rooms (name, sort)
select * from (values
  ('Ingresso', 1), ('Corridoio / Disimpegno', 2), ('Cucina / Living', 3), ('Sala pranzo', 4),
  ('Soggiorno', 5), ('Studio', 6), ('Camera da letto', 7), ('Bagno', 8),
  ('Terrazzo', 9), ('Cantina', 10), ('Box', 11)
) as v(name, sort)
where not exists (select 1 from rooms);

insert into capitolato_items (name, sort)
select * from (values
  ('Riscaldamento radiante PE-Xa', 1),
  ('Pompa di calore', 2),
  ('VMC con recupero di calore', 3),
  ('Serramenti in alluminio', 4),
  ('Pavimento in gres', 5)
) as v(name, sort)
where not exists (select 1 from capitolato_items);
