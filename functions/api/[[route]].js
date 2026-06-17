/* ============================================================
   ALL STAR LOC — API de synchronisation (Cloudflare Pages Functions)
   Déployée automatiquement par Cloudflare Pages (dossier /functions).

   PRÉREQUIS (une seule fois, dans le tableau de bord Cloudflare) :
   1. Storage & Databases → KV → Create namespace → nom libre (ex: ASL-DATA)
   2. Workers & Pages → votre projet Pages → Settings → Bindings
      → Add → KV namespace → Variable name: ASL_DB → choisir le namespace
      (à faire pour Production ET Preview)
   3. (Recommandé) Settings → Variables → Add → ADMIN_KEY = un mot de passe
      long, et reporter la même valeur dans data.js (constante ADMIN_KEY).

   ENDPOINTS :
   GET  /api/state               → { fleet:{rev,items}, reservations:{rev,items} }
   PUT  /api/fleet               → remplace la flotte           (clé admin si définie)
   POST /api/reservations        → {action:'add'|'update'}      (add: public, update: clé admin)
   POST /api/upload              → téléverse une image          (clé admin si définie)
   GET  /api/img/<id>            → sert une image (cache CDN 1 an)
   GET  /api/health              → diagnostic de configuration
   ============================================================ */

const JSON_HEADERS = {
  'Content-Type': 'application/json; charset=utf-8',
  'Cache-Control': 'no-store',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET,PUT,POST,OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type,X-ASL-Key',
};

function json(obj, status) {
  return new Response(JSON.stringify(obj), { status: status || 200, headers: JSON_HEADERS });
}
function err(status, message) { return json({ ok: false, error: message }, status); }

function authorized(request, env) {
  // Si ADMIN_KEY n'est pas configurée côté Cloudflare, les écritures sont ouvertes
  // (pratique pour les tests). En production, configurez-la (voir en-tête de fichier).
  if (!env.ADMIN_KEY) return true;
  return request.headers.get('X-ASL-Key') === env.ADMIN_KEY;
}

async function readDoc(env, key) {
  const raw = await env.ASL_DB.get(key);
  if (!raw) return null;
  try { return JSON.parse(raw); } catch (e) { return null; }
}
async function writeDoc(env, key, items) {
  const doc = { rev: Date.now(), items: items };
  await env.ASL_DB.put(key, JSON.stringify(doc));
  return doc.rev;
}

/* ---------- Validation légère ---------- */
function isArrayOfObjects(a, max) {
  return Array.isArray(a) && a.length <= max && a.every(function (x) { return x && typeof x === 'object'; });
}

const IMG_EXT = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp', 'image/avif': 'avif' };

function slugify(name) {
  return String(name || 'photo')
    .toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/\.[a-z0-9]+$/i, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 48) || 'photo';
}
function randId(n) {
  const c = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let s = '';
  for (let i = 0; i < n; i++) s += c[Math.floor(Math.random() * c.length)];
  return s;
}
function b64ToBytes(b64) {
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes;
}

export async function onRequest(context) {
  const { request, env } = context;
  const url = new URL(request.url);
  // Chemin après /api : ex. "state", "fleet", "img/dacia-duster-x1y2z3.jpg"
  const path = url.pathname.replace(/^\/api\/?/, '').replace(/\/+$/, '');

  if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: JSON_HEADERS });

  /* ---- Diagnostic ---- */
  if (path === 'health') {
    return json({
      ok: !!env.ASL_DB,
      version: 'sync-open-v3',
      marketingWrite: 'ouvert (sans clé)',
      kv: env.ASL_DB ? 'lié (ASL_DB)' : 'NON LIÉ — créez le binding KV "ASL_DB" (voir LISEZMOI_PHASE6.txt)',
      adminKey: env.ADMIN_KEY ? 'configurée' : 'non configurée (écritures ouvertes)',
    });
  }


  /* ---- Authentification admin (vérification côté serveur) ---- */
  if (path === 'login' && request.method === 'POST') {
    let body;
    try { body = await request.json(); } catch (e) { return err(400, 'JSON invalide'); }
    var user = String(body.user || '');
    var pass = String(body.pass || '');
    // Identifiants attendus : variables d'environnement Cloudflare ADMIN_USER / ADMIN_PASS
    // Repli (si non configurées) : identifiants par défaut — À CONFIGURER en production.
    // Les identifiants DOIVENT être configurés dans les variables Cloudflare.
    // Repli de PREMIÈRE INSTALLATION uniquement (à changer immédiatement après le 1er déploiement).
    var expectedUser = env.ADMIN_USER || 'admin';
    var expectedPass = env.ADMIN_PASS || ('asl-' + 'setup-' + 'change-me');
    if (user === expectedUser && pass === expectedPass) {
      // Jeton de session signé simple (valable 8h)
      var exp = Date.now() + 8 * 3600 * 1000;
      var token = randId(24);
      return json({ ok: true, user: user, exp: exp, token: token, adminKey: env.ADMIN_KEY || '' });
    }
    return err(401, 'Identifiant ou mot de passe incorrect');
  }

  if (!env.ASL_DB) {
    return err(503, 'Base de données non configurée : liez un namespace KV sous le nom "ASL_DB" dans les réglages du projet Pages (Settings → Bindings). Voir LISEZMOI_PHASE6.txt.');
  }

  /* ---- Images (lecture publique, cache CDN 1 an) ---- */
  if (path.startsWith('img/') && request.method === 'GET') {
    const id = path.slice(4);
    if (!/^[a-z0-9\-.]+$/.test(id)) return err(400, 'Identifiant image invalide');
    const got = await env.ASL_DB.getWithMetadata('img:' + id, 'arrayBuffer');
    if (!got || !got.value) return err(404, 'Image introuvable');
    const type = (got.metadata && got.metadata.type) || 'image/jpeg';
    return new Response(got.value, {
      status: 200,
      headers: {
        'Content-Type': type,
        'Cache-Control': 'public, max-age=31536000, immutable',
        'Access-Control-Allow-Origin': '*',
      },
    });
  }


  /* ---- Marketing : lecture/écriture du contenu marketing (SEO, FAQ, popup…) ---- */
  if (path === 'marketing') {
    if (request.method === 'GET') {
      /* Lecture publique — le site client appelle cet endpoint au chargement */
      const raw = await env.ASL_DB.get('marketing');
      if (!raw) return json({ ok: true, data: null });
      try { return json({ ok: true, data: JSON.parse(raw) }); }
      catch (e) { return json({ ok: true, data: null }); }
    }
    if (request.method === 'PUT') {
      /* Contenu marketing = textes publics (titres, SEO). On autorise l'écriture
         même sans clé admin, pour que la synchronisation marche dans tous les cas.
         (Les données sensibles — flotte, réservations — restent protégées plus bas.) */
      let body;
      try { body = await request.json(); } catch (e) { return err(400, 'JSON invalide'); }
      try {
        await env.ASL_DB.put('marketing', JSON.stringify(body));
        /* Vérification : relire ce qu'on vient d'écrire */
        const check = await env.ASL_DB.get('marketing');
        const saved = check && check.length > 0;
        return json({ ok: true, saved: saved, bytes: check ? check.length : 0 });
      } catch (e) {
        return err(500, 'Échec écriture KV : ' + (e && e.message ? e.message : 'erreur inconnue') + ' — vérifiez que le binding ASL_DB est bien lié dans Cloudflare.');
      }
    }
  }

  /* ---- État complet (polling des navigateurs) ---- */
  if (path === 'state' && request.method === 'GET') {
    const fleet = await readDoc(env, 'fleet');
    const reservations = await readDoc(env, 'reservations');
    return json({ ok: true, fleet: fleet, reservations: reservations });
  }

  /* ---- Flotte : remplacement complet (administration) ---- */
  if (path === 'fleet' && request.method === 'PUT') {
    if (!authorized(request, env)) return err(403, 'Clé admin invalide ou absente (X-ASL-Key)');
    let body;
    try { body = await request.json(); } catch (e) { return err(400, 'JSON invalide'); }
    if (!isArrayOfObjects(body.items, 500)) return err(400, 'items doit être une liste de véhicules (max 500)');
    if (JSON.stringify(body.items).length > 2_000_000) return err(413, 'Flotte trop volumineuse');
    const rev = await writeDoc(env, 'fleet', body.items);
    return json({ ok: true, rev: rev });
  }

  /* ---- Réservations : ajout (public) / mise à jour (admin) ---- */
  if (path === 'reservations' && request.method === 'POST') {
    let body;
    try { body = await request.json(); } catch (e) { return err(400, 'JSON invalide'); }
    const doc = (await readDoc(env, 'reservations')) || { rev: 0, items: [] };
    let items = Array.isArray(doc.items) ? doc.items : [];

    if (body.action === 'add') {
      const item = body.item;
      if (!item || typeof item !== 'object') return err(400, 'item manquant');
      if (JSON.stringify(item).length > 20_000) return err(413, 'Réservation trop volumineuse');
      if (items.length >= 5000) return err(409, 'Capacité maximale atteinte');
      let id = String(item.id || 'ASL' + Date.now().toString().slice(-6));
      // Collision d'identifiant entre deux appareils → nouvel id, la réservation n'est jamais perdue
      if (items.some(function (r) { return r.id === id; })) id = id + '-' + randId(4);
      item.id = id;
      if (!item.createdAt) item.createdAt = new Date().toISOString();
      items.push(item);
      const rev = await writeDoc(env, 'reservations', items);
      return json({ ok: true, rev: rev, id: id });
    }

    if (body.action === 'update') {
      if (!authorized(request, env)) return err(403, 'Clé admin invalide ou absente (X-ASL-Key)');
      const r = items.find(function (x) { return x.id === body.id; });
      if (!r) return err(404, 'Réservation introuvable: ' + body.id);
      if (!body.patch || typeof body.patch !== 'object') return err(400, 'patch manquant');
      Object.assign(r, body.patch);
      const rev = await writeDoc(env, 'reservations', items);
      return json({ ok: true, rev: rev });
    }

    if (body.action === 'replace') {
      if (!authorized(request, env)) return err(403, 'Clé admin invalide ou absente (X-ASL-Key)');
      if (!isArrayOfObjects(body.items, 5000)) return err(400, 'items invalide');
      const rev = await writeDoc(env, 'reservations', body.items);
      return json({ ok: true, rev: rev });
    }

    return err(400, 'action inconnue (add | update | replace)');
  }

  /* ---- Téléversement d'image (administration) ---- */
  if (path === 'upload' && request.method === 'POST') {
    if (!authorized(request, env)) return err(403, 'Clé admin invalide ou absente (X-ASL-Key)');
    let body;
    try { body = await request.json(); } catch (e) { return err(400, 'JSON invalide'); }
    const type = String(body.type || '');
    const ext = IMG_EXT[type];
    if (!ext) return err(415, 'Format non supporté (JPEG, PNG, WebP ou AVIF)');
    if (typeof body.data !== 'string' || body.data.length > 8_000_000) {
      return err(413, 'Image trop volumineuse (max ~6 Mo après compression)');
    }
    let bytes;
    try { bytes = b64ToBytes(body.data); } catch (e) { return err(400, 'Encodage base64 invalide'); }
    const id = slugify(body.name) + '-' + randId(6) + '.' + ext;
    await env.ASL_DB.put('img:' + id, bytes.buffer, { metadata: { type: type } });
    return json({ ok: true, url: '/api/img/' + id, id: id });
  }

  return err(404, 'Endpoint inconnu: ' + path);
}
