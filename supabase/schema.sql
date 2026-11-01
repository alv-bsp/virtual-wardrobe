-- Armadio · schema v1
-- Da eseguire una volta nel SQL Editor del progetto Supabase dedicato, prima di voci.sql.
-- Dal 30/10/2026 le tabelle nuove non sono esposte alle API senza GRANT esplicito: i grant sono qui sotto.

-- ─── Liste predefinite ──────────────────────────────────────────────
-- Categorie, colori, stagioni e occasioni. Dati di riferimento, non tuoi dati:
-- l'app le legge e basta, si modificano da voci.sql o dal Table Editor.
create table public.voci (
  lista   text not null check (lista in ('categoria', 'colore', 'stagione', 'occasione')),
  slug    text not null check (slug ~ '^[a-z0-9-]+$'),
  nome    text not null,
  ordine  smallint not null default 0,
  hex     text check (hex ~ '^#[0-9a-f]{6}$'),     -- solo per i colori
  attiva  boolean not null default true,           -- false = non più proposta, i capi esistenti la tengono
  primary key (lista, slug)
);

-- ─── Capi ───────────────────────────────────────────────────────────
create table public.capi (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid not null default auth.uid() references auth.users (id) on delete cascade,
  nome             text check (char_length(nome) <= 80),   -- facoltativo: senza nome si mostra "Categoria · Colore"
  categoria        text not null,
  colore           text not null,
  colori_secondari text[] not null default '{}',
  stagioni         text[] not null default '{}',
  occasioni        text[] not null default '{}',
  marca            text check (char_length(marca) <= 60),
  stato            text not null default 'armadio' check (stato in ('armadio', 'wishlist', 'dismettere')),
  note             text check (char_length(note) <= 2000),
  foto             text,   -- percorso nel bucket: <user_id>/<capo_id>/<versione>.<webp|jpg>
  miniatura        text,   -- stesso schema, file -mini
  creato_il        timestamptz not null default now(),
  modificato_il    timestamptz not null default now()
);
create index capi_user_idx on public.capi (user_id);

-- ─── Outfit ─────────────────────────────────────────────────────────
create table public.outfit (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null default auth.uid() references auth.users (id) on delete cascade,
  nome          text check (char_length(nome) <= 80),
  stagioni      text[] not null default '{}',   -- più valori, come per i capi
  occasioni     text[] not null default '{}',
  note          text check (char_length(note) <= 2000),
  preferito     boolean not null default false,
  creato_il     timestamptz not null default now(),
  modificato_il timestamptz not null default now()
);
create index outfit_user_idx on public.outfit (user_id);

create table public.outfit_capi (
  outfit_id uuid not null references public.outfit (id) on delete cascade,
  capo_id   uuid not null references public.capi (id) on delete cascade,
  user_id   uuid not null default auth.uid() references auth.users (id) on delete cascade,
  primary key (outfit_id, capo_id)
);
create index outfit_capi_capo_idx on public.outfit_capi (capo_id);   -- "in quali outfit compare"

-- ─── Controllo delle voci + data di modifica ────────────────────────
-- Ogni categoria, colore, stagione e occasione salvata deve esistere in voci.
create function public.prima_di_salvare() returns trigger
language plpgsql set search_path = '' as $$
declare
  da_controllare jsonb;
  sconosciute    text;
begin
  if tg_table_name = 'capi' then
    da_controllare := jsonb_build_object(
      'categoria', jsonb_build_array(new.categoria),
      'colore',    to_jsonb(array[new.colore] || new.colori_secondari),
      'stagione',  to_jsonb(new.stagioni),
      'occasione', to_jsonb(new.occasioni));
  else
    da_controllare := jsonb_build_object(
      'stagione',  to_jsonb(new.stagioni),
      'occasione', to_jsonb(new.occasioni));
  end if;

  select string_agg(l.key || ' "' || s.slug || '"', ', ') into sconosciute
  from jsonb_each(da_controllare) as l
  cross join lateral jsonb_array_elements_text(l.value) as s(slug)
  where not exists (select 1 from public.voci v where v.lista = l.key and v.slug = s.slug);

  if sconosciute is not null then
    raise exception 'Voci non previste: %', sconosciute using errcode = 'check_violation';
  end if;

  new.modificato_il := now();
  return new;
end $$;
revoke execute on function public.prima_di_salvare() from public, anon, authenticated;

create trigger capi_prima_di_salvare before insert or update on public.capi
  for each row execute function public.prima_di_salvare();
create trigger outfit_prima_di_salvare before insert or update on public.outfit
  for each row execute function public.prima_di_salvare();

-- ─── Permessi (grant) ───────────────────────────────────────────────
-- Prima si toglie tutto, poi si concede il minimo. anon (chi non ha fatto login) non vede nessuna tabella.
revoke all on public.voci, public.capi, public.outfit, public.outfit_capi from anon, authenticated;
grant select                         on public.voci        to authenticated;
grant select, insert, update, delete on public.capi        to authenticated;
grant select, insert, update, delete on public.outfit      to authenticated;
grant select, insert, delete         on public.outfit_capi to authenticated;

-- ─── Row Level Security ─────────────────────────────────────────────
alter table public.voci        enable row level security;
alter table public.capi        enable row level security;
alter table public.outfit      enable row level security;
alter table public.outfit_capi enable row level security;

create policy "voci: lettura dopo il login" on public.voci
  for select to authenticated using (true);

create policy "capi: solo i miei" on public.capi
  for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

create policy "outfit: solo i miei" on public.outfit
  for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

-- Il collegamento deve essere mio, e miei devono essere anche l'outfit e il capo che collega.
create policy "outfit_capi: solo i miei" on public.outfit_capi
  for all to authenticated
  using (user_id = (select auth.uid()))
  with check (
    user_id = (select auth.uid())
    and exists (select 1 from public.outfit o where o.id = outfit_id and o.user_id = (select auth.uid()))
    and exists (select 1 from public.capi c where c.id = capo_id and c.user_id = (select auth.uid()))
  );

-- ─── Foto: bucket privato ───────────────────────────────────────────
-- Ogni file sta sotto una cartella col mio user_id. Lettura solo con signed URL.
-- Niente policy di update: una foto nuova è un file nuovo, la vecchia si cancella.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('foto', 'foto', false, 1048576, array['image/webp', 'image/jpeg'])
on conflict (id) do nothing;

create policy "foto: leggo i miei file" on storage.objects
  for select to authenticated
  using (bucket_id = 'foto' and (storage.foldername(name))[1] = (select auth.uid())::text);

create policy "foto: carico nella mia cartella" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'foto' and (storage.foldername(name))[1] = (select auth.uid())::text);

create policy "foto: cancello i miei file" on storage.objects
  for delete to authenticated
  using (bucket_id = 'foto' and (storage.foldername(name))[1] = (select auth.uid())::text);

-- ─── ping() per il keep-alive ───────────────────────────────────────
-- Chiamata dal workflow GitHub ogni 2-3 giorni, senza login. Non legge dati.
create function public.ping() returns text
language sql stable set search_path = '' as $$ select 'pong'::text $$;
revoke execute on function public.ping() from public;
grant execute on function public.ping() to anon, authenticated;
