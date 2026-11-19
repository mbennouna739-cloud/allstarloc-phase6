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
    const res = await env.ASSETS.fetch(request);
    if (res.status !== 404 || request.method !== "GET" && request.method !== "HEAD") return res;

    /* ★ Adresses propres pour Google : /about, /contact, /faq, /cgv, /nos-vehicules…
       (et /article-<slug>) servent les pages rangées dans /pages/, sans redirection.
       Ce sont les adresses déclarées dans le sitemap et les balises « canonical ». */
    const m = /^\/([a-z0-9-]+)(\.html|\/)?$/i.exec(url.pathname);
    const n = /^\/([a-z0-9-]+\.(?:css|js))$/i.exec(url.pathname);
    let target = null;
    if (m) target = /^article-[a-z0-9-]+$/i.test(m[1]) && m[2] !== ".html" ? "/pages/article" : "/pages/" + m[1];
    else if (n) target = "/pages/" + n[1];
    if (target) {
      for (const t of [target, target + ".html"]) {
        const u = new URL(t + url.search, url);
        const r = await env.ASSETS.fetch(new Request(u.toString(), { method: request.method, headers: request.headers }));
        if (r.status === 200) return r;
      }
    }
    return res;
  },
};
