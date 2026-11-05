# Armadio

Webapp personale per catalogare i miei vestiti e comporre outfit.
Un solo utente, pensata per il telefono e installabile sulla schermata Home.

- **Frontend**: Vite + JavaScript senza framework, pubblicato su GitHub Pages da GitHub Actions a ogni push su `main`.
- **Backend**: un progetto Supabase dedicato, piano gratuito (Postgres, Storage, Auth). Nessun server proprio.
- **Stile**: soft UI leggera solo sui comandi (ricerca, chip, pulsanti, tab bar); foto e contenuti piatti.
  Gesso `#F2F2F1`, corallo `#D2413A` come unico accento, font Inter. Token in `src/stile/tokens.css`.
- La proposta iniziale (schizzo, token, schema) è in `docs/proposta.html`.

## Passi manuali, una volta sola

0. **Crea il repo su GitHub**: `alv-bsp/virtual-wardrobe`, pubblico, vuoto (senza README né .gitignore).
   Poi, dalla cartella del progetto: `git push -u origin main` (il remote `origin` è già impostato).
1. **Crea il progetto Supabase** (piano Free, regione Central EU / Frankfurt). Alla creazione lascia
   **spento** "Automatically expose new tables": lo schema concede i permessi da solo, tabella per tabella.
2. **SQL Editor** → incolla ed esegui `supabase/schema.sql`, poi `supabase/voci.sql`.
3. **Authentication → Users → Add user → Create new user**: la tua email e una password, con
   **Auto Confirm User** attivo.
4. **Authentication → Sign In / Providers**: spegni **Allow new users to sign up**. Lascia attivo solo
   il login con email e password (niente magic link: su iPhone si aprirebbe in Safari, fuori dall'app).
5. **Authentication → URL Configuration**: Site URL `https://alv-bsp.github.io/virtual-wardrobe/` e
   lo stesso indirizzo in Redirect URLs.
6. **Project Settings → API Keys**: copia il Project URL e la **publishable key** (`sb_publishable_…`).
   La secret key non va mai copiata da nessuna parte: né nel repo, né in GitHub.
7. **GitHub → repo → Settings → Secrets and variables → Actions → Variables** (tab Variables, non Secrets):
   - `SUPABASE_URL` = Project URL
   - `SUPABASE_PUBLISHABLE_KEY` = publishable key
8. **GitHub → Settings → Pages** → Source: **GitHub Actions**.
9. `git push`. In **Actions** parte "Deploy su Pages"; quando è verde l'app è su
   `https://alv-bsp.github.io/virtual-wardrobe/`. Lancia anche una volta a mano "Keep-alive Supabase"
   (Run workflow) per controllare che risponda `"pong"`.
10. **Sull'iPhone**: apri l'indirizzo in Safari → Condividi → Aggiungi alla schermata Home, poi accedi
    dall'icona. Il login resta salvato sul telefono.

Dopo il login, il pulsante Account in alto a destra mostra quante voci delle liste sono state lette:
se sono 37, schema, permessi e liste sono a posto.

## Sviluppo in locale

```bash
cd ~/Developer/personal/virtual-wardrobe
npm install
cp .env.example .env.local   # e inserisci URL e publishable key
npm run dev                  # http://localhost:5173
```

Per provarla sull'iPhone nella stessa rete: `npm run dev -- --host` e apri l'indirizzo che stampa.

## Sicurezza

L'indirizzo di Pages è pubblico e la chiave publishable finisce nel bundle: la protezione dei dati sta tutta in Supabase.

- Login solo con email e password, registrazioni chiuse.
- RLS attiva su tutte le tabelle. `capi`, `outfit` e `outfit_capi` sono visibili e modificabili solo dal
  proprietario (`user_id = auth.uid()`); un collegamento outfit–capo è valido solo se outfit e capo sono tuoi.
  `voci` (le liste) si legge solo dopo il login e non si modifica dall'app.
- Chi non ha fatto login non ha nessun permesso sulle tabelle: può solo chiamare `ping()`, che non legge dati.
- Bucket `foto` privato, massimo 1 MB a file, solo WebP e JPEG, ogni file nella cartella del proprio `user_id`.
  Le immagini si leggono solo con signed URL.
- `vite.config.js` ferma la build se al posto della publishable arriva una chiave secret o service_role.

## Limiti del piano gratuito

- **Pausa dopo 7 giorni di inattività.** `.github/workflows/keepalive.yml` chiama `ping()` lunedì, mercoledì
  e venerdì.
- **Il repo è pubblico, quindi GitHub disattiva i workflow schedulati dopo 60 giorni senza attività nel repo**
  (nessun commit). GitHub manda un'email prima di farlo. Per riattivarlo: Actions → Keep-alive Supabase →
  Enable workflow. Basta anche un commit qualsiasi per azzerare il conteggio. Se il keep-alive resta spento
  e il progetto va in pausa, si riattiva dal pannello di Supabase con Restore.
- **Storage 1 GB.** Le foto vengono ridimensionate e compresse nel browser prima del caricamento
  (circa 1200 px sul lato lungo, più una miniatura): circa 3.500 capi prima di riempirlo.

## Come è fatta

```
index.html               shell della pagina
vite.config.js           base relativa './', controllo della chiave
public/                  manifest e icone
src/main.js              avvio, sessione, router, azioni
src/config.js            URL e chiave dalle variabili d'ambiente
src/supabase.js          client Supabase
src/stato.js             stato in memoria
src/dati.js              lettura dei dati dopo il login
src/accesso.js           login e logout
src/router.js            routing a hash: #/armadio, #/outfit, #/capo/…, #/outfit/…
src/viste/               una vista per sezione, più accesso e account
src/ui/                  template HTML con escape, icone, toast e fogli
src/stile/               token, base e componenti
supabase/schema.sql      tabelle, trigger, grant, RLS, bucket, ping()
supabase/voci.sql        categorie, colori, stagioni, occasioni (si può rieseguire)
```

### Modificare le liste

Categorie, colori, stagioni e occasioni stanno nella tabella `voci`. Si cambiano modificando `supabase/voci.sql`
e rieseguendolo, oppure dal Table Editor di Supabase. Rinominare = cambiare `nome`. Per togliere una voce senza
rompere i capi che la usano: `attiva = false`. Per toglierla del tutto, anche dai capi che la usano, serve un file in
`supabase/modifiche/` da eseguire una volta (esempio: `2026-11-03-togli-lavoro.sql`). Lo `slug` non va cambiato dopo averlo usato.

## Decisioni

- **Foto in JPEG su iPhone.** Safari non sa produrre WebP da canvas: si usa WebP dove il browser lo supporta,
  JPEG altrove, con lo stesso peso.
- **Liste in una tabella condivisa** (`voci`), l'unica senza `user_id`: sono dati di riferimento. Per il
  multiutente basterà aggiungere la colonna e la policy.
- **Nome del capo facoltativo**: senza nome si mostra "Categoria · Colore".
- **Stagioni e occasioni multiple** anche per gli outfit, come per i capi.
- **Movimento** (`src/stile/movimento.css`, `src/ui/tocco.js`, `src/ui/morph.js`). Quello che tocchi affonda da rilievo
  a incasso e torna su con un piccolo rimbalzo; le selezioni si incassano con una transizione; la barra in basso è fatta di
  tasti fisici (la sezione attiva resta premuta, l'altra torna su) più il tasto corallo dell'azione principale
  (Aggiungi, Genera in Outfit); le pagine scorrono avanti e indietro (View Transitions, Safari 18+); fogli che salgono e
  scendono, foto in dissolvenza. Per far partire le transizioni il DOM si aggiorna senza ricrearlo (morph). Con
  "Riduci movimento" attivo su iPhone restano solo i cambi di stato. Niente sfumature sopra i contenuti: le barre in basso sono agganciate al fondo, con un filo netto in alto.
- **Niente service worker**: l'offline non è richiesto, e così non c'è una cache da invalidare a ogni rilascio.
- **Niente colore d'errore separato**: l'accento è già corallo; le azioni distruttive sono pulsanti neutri con
  conferma.
- **Dati in memoria**: dopo il login si carica tutto; filtri, ricerca e generatore girano nel browser.
- **Generatore di outfit a regole, non AI** (`src/outfit.js`). Un capo per strato: giacca, maglia, sopra, sotto,
  scarpe, accessori; lo strato si ricava dalla categoria. Sopra, sotto e scarpe ci sono sempre; giacca e maglia
  dipendono dalla stagione più fredda scelta (sempre in inverno, mai in estate, a volte nelle mezze stagioni);
  gli accessori li aggiungi tu. Usa solo capi nell'armadio, adatti a stagione e occasione (un capo senza stagioni
  o occasioni va bene sempre). Colori: i neutri stanno con tutto, al massimo un colore acceso per outfit.
  I capi usati in meno outfit escono più spesso, e non ripropone combinazioni già viste o salvate.

## Tappe

- [x] 1. Scaffold, login, deploy
- [x] 2. Capi con foto: griglia con filtri e ricerca, aggiunta da fotocamera o galleria, scheda, modifica, eliminazione
- [x] 3. Outfit: compositore con Genera, blocchi e scelta per strato, elenco con preferiti, outfit nella scheda del capo
- [ ] 4. Cosa manca: tolta per ora (5 novembre 2026), la sezione non serve. Il conteggio di quante volte
  ogni capo compare negli outfit resta, e serve al generatore.
- [ ] 5. Rifinitura UI e installazione su Home

## Licenze

Inter: SIL Open Font License 1.1 (`src/assets/OFL-Inter.txt`). Icone: Lucide, licenza ISC.
