/* ============================================================
   ALL STAR LOC — Point d'entrée du Worker (déploiement Cloudflare Workers)

   Rôle :
   - Toute requête /api/*  → API de synchronisation (logique déjà écrite
     dans functions/api/[[route]].js, réutilisée telle quelle par import).
   - Tout le reste         → fichiers statiques du site (binding ASSETS).

   Remarque : avec les assets statiques Workers, les requêtes qui
   correspondent à un fichier existant sont servies directement par
   Cloudflare sans exécuter ce Worker (rapide et gratuit). Ce code ne
   s'exécute donc que pour /api/* et les chemins inexistants.
   ============================================================ */
import { onRequest } from "../functions/api/[[route]].js";

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    if (url.pathname === "/api" || url.pathname.startsWith("/api/")) {
      return onRequest({ request, env, ctx, params: {} });
    }
    // Chemin non-API inconnu → on laisse la gestion des assets répondre (404 propre)
    return env.ASSETS.fetch(request);
  },
};
