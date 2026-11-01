import { createClient } from "@supabase/supabase-js";
import { SUPABASE_URL, SUPABASE_KEY, configurato } from "./config.js";

// Sessione salvata sul dispositivo (localStorage): il login si fa una volta per telefono.
// detectSessionInUrl spento: niente magic link, e l'hash dell'URL serve al router.
export const sb = configurato
  ? createClient(SUPABASE_URL, SUPABASE_KEY, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: false,
        storageKey: "armadio-auth",
      },
    })
  : null;
