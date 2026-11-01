-- Armadio · liste predefinite
-- Si può rieseguire: aggiorna nomi, ordine e colori senza duplicare.
-- Per togliere una voce senza rompere i capi che la usano: attiva = false.

insert into public.voci (lista, slug, nome, ordine, hex) values
  ('categoria', 'giacche',      'Giacche e cappotti', 1,  null),
  ('categoria', 'maglieria',    'Maglieria',          2,  null),
  ('categoria', 'felpe',        'Felpe',              3,  null),
  ('categoria', 'camicie',      'Camicie',            4,  null),
  ('categoria', 'tshirt',       'T-shirt e polo',     5,  null),
  ('categoria', 'pantaloni',    'Pantaloni',          6,  null),
  ('categoria', 'jeans',        'Jeans',              7,  null),
  ('categoria', 'pantaloncini', 'Pantaloncini',       8,  null),
  ('categoria', 'sport',        'Sport',              9,  null),
  ('categoria', 'scarpe',       'Scarpe',             10, null),
  ('categoria', 'accessori',    'Accessori',          11, null),

  ('colore', 'nero',        'Nero',        1,  '#1f1f1f'),
  ('colore', 'grigio',      'Grigio',      2,  '#8e8e8e'),
  ('colore', 'bianco',      'Bianco',      3,  '#f7f7f5'),
  ('colore', 'panna',       'Panna',       4,  '#efe6d2'),
  ('colore', 'beige',       'Beige',       5,  '#d8c3a0'),
  ('colore', 'cammello',    'Cammello',    6,  '#b8875a'),
  ('colore', 'marrone',     'Marrone',     7,  '#6b4a32'),
  ('colore', 'blu-navy',    'Blu navy',    8,  '#1f2a44'),
  ('colore', 'blu',         'Blu',         9,  '#2f5da8'),
  ('colore', 'azzurro',     'Azzurro',     10, '#9cc3e6'),
  ('colore', 'verde-oliva', 'Verde oliva', 11, '#6b6b3a'),
  ('colore', 'verde',       'Verde',       12, '#2f7a4b'),
  ('colore', 'bordeaux',    'Bordeaux',    13, '#6e1f2b'),
  ('colore', 'rosso',       'Rosso',       14, '#c0392b'),
  ('colore', 'rosa',        'Rosa',        15, '#e8a6b4'),
  ('colore', 'giallo',      'Giallo',      16, '#e8c547'),
  ('colore', 'arancione',   'Arancione',   17, '#e07b39'),
  ('colore', 'fantasia',    'Fantasia',    18, null),

  ('stagione', 'primavera', 'Primavera', 1, null),
  ('stagione', 'estate',    'Estate',    2, null),
  ('stagione', 'autunno',   'Autunno',   3, null),
  ('stagione', 'inverno',   'Inverno',   4, null),

  ('occasione', 'tempo-libero', 'Tempo libero', 1, null),
  ('occasione', 'lavoro',       'Lavoro',       2, null),
  ('occasione', 'elegante',     'Elegante',     3, null),
  ('occasione', 'sport',        'Sport',        4, null),
  ('occasione', 'casa',         'Casa',         5, null)
on conflict (lista, slug) do update
  set nome = excluded.nome, ordine = excluded.ordine, hex = excluded.hex;
