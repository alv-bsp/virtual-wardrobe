-- 3 novembre 2026 · tolta l'occasione "Lavoro"
-- Da eseguire una volta nel SQL Editor. Prima la toglie dai capi e dagli outfit che la usano, poi dalla lista.
-- Si può rieseguire senza effetti.

update public.capi   set occasioni = array_remove(occasioni, 'lavoro') where 'lavoro' = any (occasioni);
update public.outfit set occasioni = array_remove(occasioni, 'lavoro') where 'lavoro' = any (occasioni);
delete from public.voci where lista = 'occasione' and slug = 'lavoro';
