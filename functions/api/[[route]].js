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
   POST /api/reservations        → {action:'add'|'update'|'replace'} (add: public, update/replace: clé admin)
   POST /api/upload              → téléverse une image          (clé admin si définie)
   GET  /api/img/<id>            → sert une image (cache CDN 1 an)
   GET  /api/share/planning?code= → calendriers retours + entretien (lien privé, lecture seule)
   POST /api/share/planning      → gérer ce lien (clé admin)
   GET  /api/share/view?code=    → page du calendrier partagé (HTML)
   POST /api/doc                 → dépose un document client PRIVÉ (clé admin)
   GET  /api/doc/<id>            → lit un document client PRIVÉ (clé admin)
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

/* Liste unique des noms "misc" valides — utilisée par /api/misc, pour
   n'avoir qu'un seul endroit à modifier si un nouveau type de donnée
   auxiliaire est ajouté un jour. */
const MISC_NAMES = ['subleases', 'charges', 'maint', 'docs', 'users', 'lld', 'customfeatures', 'archives', 'custprofiles'];

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

/* Réservations : variante qui préserve/positionne le marqueur resetAt.
   resetAt permet à TOUS les appareils de détecter qu'une réinitialisation
   (clôture de période) a eu lieu côté serveur, même si leur file d'attente
   locale contient encore des écritures non confirmées — sans ce marqueur,
   un appareil (mobile) pouvait renvoyer indéfiniment de vieilles réservations
   après une remise à zéro faite depuis un autre appareil (desktop). */
async function writeReservationsDoc(env, items, resetAt) {
  const doc = { rev: Date.now(), items: items };
  if (resetAt) doc.resetAt = resetAt;
  await env.ASL_DB.put('reservations', JSON.stringify(doc));
  return doc;
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
/* ★ LOT 50 — Page « Calendriers partagés » (copie exacte de planning.html),
   servie par GET /api/share/view. */
const PLANNING_PAGE_HTML = "<!DOCTYPE html>\n<html lang=\"fr\">\n<head>\n<meta charset=\"UTF-8\">\n<meta name=\"viewport\" content=\"width=device-width, initial-scale=1, viewport-fit=cover\">\n<meta name=\"robots\" content=\"noindex, nofollow\">\n<meta name=\"referrer\" content=\"no-referrer\">\n<meta name=\"apple-mobile-web-app-capable\" content=\"yes\">\n<meta name=\"mobile-web-app-capable\" content=\"yes\">\n<meta name=\"apple-mobile-web-app-title\" content=\"Planning ASL\">\n<meta name=\"theme-color\" content=\"#C41E3A\">\n<title>Calendriers — All Star Loc</title>\n<link rel=\"icon\" type=\"image/png\" href=\"data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACAAAAAgCAYAAABzenr0AAAFGUlEQVR4nLWXW48UVRDHf3VOd+/srIBscJcdCLqAgFFMEIgCChIURVC5uwJCTHz3S5j4CXzw3Xff/QpGMEYTL6gR2GXvCzv3yznlQ3fPzuzOzowxVHKSntPnVP2r6l9VPUIHGd22Uzvt/1+ZmfxLVu+1bTwpw92ANB/6Nd6KOL0gsrLRrwcpCAEYzY33bdy3GgZQRVUTIIIxpvm7J4ipvyXoEzACOCACbBKHBgphSGgtiOAaDaq1GtbavkFIP94LUEMZFcvX4RYyCBuCgM/n/mHo/Gm++vILvHrK5QoXLk0wNfWQKIr6AmGUOKTdlgBFlHdNlgMywIhYxgioiFIqlhgb28q2XI7du3Zy8eKH5ItFjLU99Spgeh9RHMoGhHN2kAIeBzxWxyMLi3OzeO9xzqGqXJu4yqaNG2g06omP3XWbXvaNQlGV12SAlySihBIBZfWUjLC89JhqpYK1Fu89e/c8z8kTx8nnC1jT2z/TT/5VlfN2iEAERTEIefWUjKG4nOfR42UAvPcA3Lg+gSbPPTnQy3gFZZcJOWEzFNRjECzwSB01K1RKJZaWlmJlSQmefvsUL+zbR7lcRmRN82sH0IMglFR5z2bZIpZGcikG4KkLVKtVFhYWmwqdc2QyGS5fvkChDzJ2TVIdZZMI52yWimqcDsCIMK+OhkCjUWdmbg7SdyYO6scTVxge3ky9XutivgsJrUJRPcdMhn0moow282WABXWoCuo8MzOz8QtVjDF47xl/7lneOnWSQr6ANfa/k1ABUbhoh5qet8q8eoS4/c7OzrbfTRrQrU+us2rerZGOAFLy7TURx+wgRfXYlvcOeKgN6uqp1uvcvz8Z30sIl7biN0+8wf79L1IqlZqp6QCgc17K6jkXZNkspkm+FFxdFaPKDhuya/w5rDVtACAmYxRFTFy9lACQNXZAkS1bd7RFN514EcK3mTF2SEAVbQ+kCNV6HTP8NLnvvsE+vZGBMGyZy3FPMMbwYHKKV48ep1qtJmXaIwUGKKjnuM2w24SUVxtPZABhUITs4CADUbQ2tMbgnGP7thzvvP0Wy8sFjLFrz62OiipYFS7Yp5qDqJNoEinfR8e7dfM6gQ1Qr92rwABlPC/akCM2Q1F911ap0HXkpmR8/dhRDhx4mWKpmHChzWYLIVAqqnxgh9goBrdKoQcGxfCTq/B+fZorc3c5fvZDDhw8wvc/3InPrIqIcw5rLdc+vkqlXEmqoZXwiQhQB0bFciYYoqS6xnsFAmDKO372NX6vl/nl19/48fYd7t27lwBoj4i1cd4vX7pALjdGrVZrq5bmLBAgr56TQZadJqSyDvkMsIAjQsiIIZvNEmQyzM3Pt8BcERHBOcfoyAhnz57h8XIeY1eoZ1rJFxGTz9G9f817h1fi5T3eeaanZ7rciOXmjWsMRBHeaSsJ48ZTxPOyiThkB8hrnEffYTlgThtI0wePMTA9PYP3HlWNQbWsNAqHDx3k8KFXKBTyzcZkYKW7fRRuYItYIoTBDiuLEAKL6mhSScFYw/z8PMYYwjDEGLNmWWsJAstnn31KrVZrVkOwMPtANo9s11FjGZeQ265KfZ38Q/xJPqOOMCGSqhIGIQ8mp/jj7p+kDq0WVQUR9uzeTS6XI5/P82jhYaxleGS7pj2qnw+pTg1KVRFjOk7OFFT6LQHgvGdx9sFKPWx+ZpvGB9dT0apqfWjrdc90P43E0tzkyl+zVIYTEE9aFhPjawA8aSCthlP5Fy1ovp57ATNiAAAAAElFTkSuQmCC\">\n<link rel=\"apple-touch-icon\" href=\"data:image/png;base64,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\">\n<link href=\"https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;600;700;800&display=swap\" rel=\"stylesheet\">\n<!--\n  ALL STAR LOC — LOTS 48-49 · Calendriers partagés (lecture seule) :\n  retours + échéances d'entretien (visites techniques, vidanges).\n  Page autonome : ne charge AUCUN script du back-office ni data.js.\n  Lit uniquement /api/share/planning?code=… (données minimales), et se\n  met à jour toute seule (toutes les 60 s + au retour sur la page).\n  Même règle de calcul que le logiciel : dossier non annulé, non terminé,\n  rangé au jour de sa date de retour.\n-->\n<style>\n:root{--red:#C41E3A;--dark:#F4F5F7;--dark2:#FFFFFF;--border:rgba(18,22,30,0.16);--text:#101216;--text2:rgba(16,18,22,0.84);--text3:rgba(16,18,22,0.70);--font:'Outfit',system-ui,-apple-system,'Segoe UI',sans-serif}\n*{box-sizing:border-box;margin:0;padding:0}\nhtml,body{background:var(--dark);color:var(--text);font-family:var(--font)}\nbody{padding:calc(env(safe-area-inset-top,0px) + 18px) 18px calc(env(safe-area-inset-bottom,0px) + 24px)}\n.wrap{max-width:1280px;margin:0 auto}\n.top{display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:14px;flex-wrap:wrap}\n.brand{display:flex;align-items:center;gap:12px}\n.brand img{height:30px;width:auto}\n.brand .name{font-weight:800;font-size:15px}\n.brand .sub{font-size:12px;color:var(--text3)}\n.today-date{font-size:15px;font-weight:800;color:var(--text);text-align:center;flex:1}\n.today-date small{display:block;font-size:11px;font-weight:600;color:var(--text3);text-transform:none}\n.live{display:flex;align-items:center;gap:7px;font-size:12px;color:var(--text3);font-weight:600}\n.live i{width:8px;height:8px;border-radius:50%;background:#16a34a;box-shadow:0 0 0 3px rgba(22,163,74,.18)}\n.live.off i{background:#d97706;box-shadow:0 0 0 3px rgba(217,119,6,.18)}\n.box{background:var(--dark2);border:1px solid var(--border);border-radius:16px;padding:18px 20px 20px}\n.head{display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap;margin-bottom:14px}\n.title{display:flex;align-items:center;gap:8px;font-weight:800;font-size:16px}\n.title svg{color:var(--red)}\n.title span{font-weight:600;font-size:13px;color:var(--text3)}\n.ctrls{display:flex;align-items:center;gap:8px}\n.nav{width:38px;height:38px;border-radius:10px;border:1px solid var(--border);background:var(--dark2);color:var(--text);font-size:20px;font-weight:700;cursor:pointer;line-height:1;font-family:inherit}\n.nav:hover{border-color:var(--red);color:var(--red)}\n.month{min-width:150px;text-align:center;font-weight:800;font-size:15px}\n.today-btn{height:38px;padding:0 12px;border-radius:10px;border:1px solid var(--border);background:var(--dark2);font-family:inherit;font-weight:600;font-size:13px;cursor:pointer;color:var(--text)}\n.grid{display:grid;grid-template-columns:repeat(7,minmax(0,1fr));gap:5px}\n.dow{font-size:11px;font-weight:700;color:var(--text3);text-transform:uppercase;letter-spacing:.4px;padding:2px 6px}\n.cell{min-height:96px;border:1px solid var(--border);border-radius:9px;padding:6px;display:flex;flex-direction:column;gap:5px;min-width:0}\n.out{border-style:dashed;opacity:.35}\n.past{background:rgba(18,22,30,.025)}\n.today{border-color:var(--red);box-shadow:inset 0 0 0 1px var(--red)}\n.num{display:flex;justify-content:space-between;align-items:baseline;gap:4px;font-size:12.5px;font-weight:700;color:var(--text2)}\n.today .num span{color:var(--red)}\n.num em{font-style:normal;font-size:10.5px;font-weight:700;color:#b45309}\n.ev{display:flex;flex-direction:column;border-radius:7px;padding:5px 7px;background:rgba(217,119,6,.10);min-width:0}\n.ev span{display:block;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}\n.ev .t{display:flex;justify-content:space-between;gap:6px;font-size:12px}\n.ev .t b{overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-weight:700}\n.ev .t i{font-style:normal;font-weight:700;color:#92400e;flex-shrink:0}\n.ev .s{font-size:11px;color:var(--text2)}\n.list{display:none}\n.day{padding:12px 0 4px;border-top:1px solid var(--border)}\n.day:first-child{border-top:none}\n.dayh{display:flex;justify-content:space-between;align-items:center;font-size:14px;font-weight:800;margin-bottom:8px;text-transform:capitalize}\n.dayh em{font-style:normal;font-size:12.5px;font-weight:700;color:#b45309;text-transform:none}\n.day.is-today .dayh span{color:var(--red)}\n.card{background:rgba(217,119,6,.08);border:1px solid rgba(217,119,6,.22);border-radius:12px;padding:10px 12px;margin-bottom:8px}\n.card .t{display:flex;justify-content:space-between;gap:10px;font-size:15px;font-weight:700}\n.card .t i{font-style:normal;color:#92400e}\n.card .s{font-size:13px;color:var(--text2);margin-top:2px}\n.empty{padding:20px 0;text-align:center;color:var(--text3);font-size:14px}\n.msg{max-width:440px;margin:60px auto;text-align:center;background:var(--dark2);border:1px solid var(--border);border-radius:16px;padding:28px 24px}\n.msg h1{font-size:18px;margin-bottom:8px}\n.msg p{color:var(--text3);font-size:14px;line-height:1.5}\n.foot{text-align:center;font-size:12px;color:var(--text3);margin-top:12px}\n.tabs{display:flex;gap:4px;padding:4px;background:var(--dark2);border:1px solid var(--border);border-radius:12px;margin-bottom:12px;width:max-content;max-width:100%}\n.tabs button{border:none;background:transparent;font-family:inherit;font-size:14px;font-weight:600;color:var(--text3);padding:8px 16px;border-radius:9px;cursor:pointer}\n.tabs button.on{background:var(--red);color:#fff}\n.ev.vt{background:rgba(196,30,58,.10)}\n.ev.vid{background:rgba(37,99,235,.10)}\n.ev .k{font-size:9.5px;font-weight:800;text-transform:uppercase;letter-spacing:.3px}\n.ev.vt .k{color:#9B1830}.ev.vid .k{color:#1D4ED8}\n.card.vt{background:rgba(196,30,58,.07);border-color:rgba(196,30,58,.22)}\n.card.vid{background:rgba(37,99,235,.07);border-color:rgba(37,99,235,.22)}\n.card .k{font-size:11px;font-weight:800;text-transform:uppercase;letter-spacing:.3px;margin-bottom:2px}\n.card.vt .k{color:#9B1830}.card.vid .k{color:#1D4ED8}\n/* ★ LOT 49 — Téléphone : toujours le calendrier EN GRILLE (comme dans le\n   logiciel). Il se lit le mieux téléphone tenu à l'horizontale. */\n.list{display:none}\n/* Téléphone à l'horizontale : grille compacte, tout tient à l'écran. */\n@media (max-height:520px) and (orientation:landscape), (max-width:600px){\n  body{padding:calc(env(safe-area-inset-top,0px) + 8px) calc(env(safe-area-inset-right,0px) + 10px) 10px calc(env(safe-area-inset-left,0px) + 10px)}\n  .top{margin-bottom:6px}\n  .brand img{height:20px}.brand .name{font-size:13px}.brand .sub{display:none}\n  .today-date{font-size:13px}.today-date small{display:none}\n  .tabs{padding:3px;margin-bottom:6px}.tabs button{padding:5px 12px;font-size:12.5px}\n  .top{flex-wrap:nowrap}\n  .box{padding:8px 10px 10px;border-radius:12px}\n  .head{margin-bottom:6px;flex-wrap:nowrap}\n  .title{font-size:13px}.title span{font-size:11px}\n  .nav,.today-btn{height:30px}.nav{width:30px;font-size:17px}.today-btn{font-size:12px;padding:0 9px}\n  .month{min-width:110px;font-size:13px}\n  .grid{gap:3px}\n  .dow{font-size:9.5px;padding:0 3px}\n  .cell{min-height:58px;padding:3px;gap:3px;border-radius:6px}\n  .num{font-size:10.5px}.num em{font-size:9px}\n  .ev{padding:3px 4px;border-radius:5px}\n  .ev .t{font-size:10px;flex-wrap:wrap;column-gap:4px;row-gap:0}.ev .s{font-size:9px}.ev .k{font-size:8px}\n  .ev .t b{white-space:normal;overflow:visible;text-overflow:clip;line-height:1.2}\n  .ev span{white-space:normal;overflow:visible;text-overflow:clip;line-height:1.2}\n  .foot{display:none}\n}\n</style>\n</head>\n<body>\n<div class=\"wrap\" id=\"app\">\n  <div class=\"msg\"><p>Chargement du calendrier…</p></div>\n</div>\n<script>\n(function () {\n  'use strict';\n  var MONTHS = ['Janvier','Février','Mars','Avril','Mai','Juin','Juillet','Août','Septembre','Octobre','Novembre','Décembre'];\n  var DOW = ['dimanche','lundi','mardi','mercredi','jeudi','vendredi','samedi'];\n  var code = new URLSearchParams(location.search).get('code') || '';\n  var data = null, lastOk = null, failed = false;\n  var view = (location.hash === '#entretien') ? 'maint' : 'returns'; // ★ LOT 49 : onglet affiché\n  var now = new Date();\n  var ym = now.getFullYear() + '-' + String(now.getMonth() + 1).padStart(2, '0');\n  function esc(s) { return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/\"/g, '&quot;'); }\n  function iso(d) { return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); }\n  /* Plaque · couleur : même règle que le logiciel (aslVehPlateColor). */\n  function plateColor(r) {\n    var car = (data.fleet || []).filter(function (c) { return String(c.id) === String(r.carId); })[0]\n           || (data.fleet || []).filter(function (c) { return c.name === r.car; })[0];\n    var units = (car && car.units) || [];\n    var plate = r.plate, color = r.color;\n    if (plate) {\n      if (!color) { var u = units.filter(function (x) { return x.plate === plate; })[0]; if (u) color = u.color; }\n    } else if (units.length === 1 && units[0].plate) {\n      plate = units[0].plate; color = color || units[0].color;\n    } else if (r.status === 'confirmed' || r.status === 'pending') {\n      return 'Plaque attribuée à la prise en charge';\n    }\n    return plate ? plate + (color ? ' · ' + color : '') : (color || '');\n  }\n  function returnsOn(d) {\n    return (data.returns || []).filter(function (r) { return r.endDate === d; })\n      .sort(function (a, b) { return String(a.endTime || '').localeCompare(String(b.endTime || '')); });\n  }\n  function shift(delta) {\n    var y = parseInt(ym.slice(0, 4), 10), m = parseInt(ym.slice(5, 7), 10) + delta;\n    if (m < 1) { m = 12; y--; } if (m > 12) { m = 1; y++; }\n    ym = y + '-' + String(m).padStart(2, '0'); render();\n  }\n  window.__aslShift = shift;\n  window.__aslView = function (v) { view = v; try { history.replaceState(null, '', v === 'maint' ? '#entretien' : '#retours'); } catch (e) {} render(); };\n  /* ★ LOT 49 — Échéances d'entretien d'un jour (VT + vérification vidange). */\n  function maintOn(d) {\n    var out = [];\n    (data.maint || []).forEach(function (m) {\n      var sub = (m.plate || '') + (m.color ? ' · ' + m.color : '');\n      if (m.vt === d) out.push({ kind: 'vt', label: 'Visite technique', car: m.car, sub: sub });\n      if (m.vidange === d) out.push({ kind: 'vid', label: 'Vérification vidange' + (m.kmVidange ? ' (' + Number(m.kmVidange).toLocaleString('fr-FR') + ' km)' : ''), car: m.car, sub: sub });\n    });\n    return out;\n  }\n  window.__aslToday = function () { var n = new Date(); ym = n.getFullYear() + '-' + String(n.getMonth() + 1).padStart(2, '0'); render(); };\n  function message(title, text) {\n    document.getElementById('app').innerHTML = '<div class=\"msg\"><h1>' + esc(title) + '</h1><p>' + esc(text) + '</p></div>';\n  }\n  function render() {\n    if (!data) return;\n    var today = iso(new Date());\n    var y = parseInt(ym.slice(0, 4), 10), mo = parseInt(ym.slice(5, 7), 10);\n    var daysIn = new Date(y, mo, 0).getDate();\n    var lead = (new Date(y, mo - 1, 1).getDay() + 6) % 7;\n    var total = 0, grid = '', list = '', nVt = 0, nVid = 0;\n    ['Lun','Mar','Mer','Jeu','Ven','Sam','Dim'].forEach(function (d) { grid += '<div class=\"dow\">' + d + '</div>'; });\n    for (var i = 0; i < lead; i++) grid += '<div class=\"cell out\"></div>';\n    for (var day = 1; day <= daysIn; day++) {\n      var d = ym + '-' + String(day).padStart(2, '0');\n      if (view === 'maint') {\n        var ms = maintOn(d); total += ms.length;\n        ms.forEach(function (e) { if (e.kind === 'vt') nVt++; else nVid++; });\n        grid += '<div class=\"cell' + (d === today ? ' today' : '') + (d < today ? ' past' : '') + '\"><div class=\"num\"><span>' + day + '</span></div>'\n          + ms.map(function (e) {\n              return '<div class=\"ev ' + e.kind + '\"><span class=\"k\">' + esc(e.label) + '</span><span class=\"t\"><b>' + esc(e.car) + '</b></span>' + (e.sub ? '<span class=\"s\">' + esc(e.sub) + '</span>' : '') + '</div>';\n            }).join('') + '</div>';\n        if (ms.length) {\n          var dtm = new Date(y, mo - 1, day);\n          list += '<div class=\"day' + (d === today ? ' is-today' : '') + '\"><div class=\"dayh\"><span>' + DOW[dtm.getDay()] + ' ' + day + ' ' + MONTHS[mo - 1].toLowerCase() + (d === today ? ' · aujourd\\'hui' : '') + '</span></div>'\n            + ms.map(function (e) {\n                return '<div class=\"card ' + e.kind + '\"><div class=\"k\">' + esc(e.label) + '</div><div class=\"t\"><span>' + esc(e.car) + '</span></div>' + (e.sub ? '<div class=\"s\">' + esc(e.sub) + '</div>' : '') + '</div>';\n              }).join('') + '</div>';\n        }\n        continue;\n      }\n      var rs = returnsOn(d); total += rs.length;\n      grid += '<div class=\"cell' + (d === today ? ' today' : '') + (d < today ? ' past' : '') + '\"><div class=\"num\"><span>' + day + '</span>'\n        + (rs.length ? '<em>' + rs.length + ' retour' + (rs.length > 1 ? 's' : '') + '</em>' : '') + '</div>'\n        + rs.map(function (r) {\n            var pc = plateColor(r);\n            return '<div class=\"ev\"><span class=\"t\"><b>' + esc(r.car || 'Véhicule') + '</b>' + (r.endTime ? '<i>' + esc(r.endTime) + '</i>' : '') + '</span>'\n              + (pc ? '<span class=\"s\">' + esc(pc) + '</span>' : '')\n              + '<span class=\"s\">' + esc(r.client || '') + '</span>'\n              + (r.place ? '<span class=\"s\">' + esc(r.place) + '</span>' : '') + '</div>';\n          }).join('') + '</div>';\n      if (rs.length) {\n        var dt = new Date(y, mo - 1, day);\n        list += '<div class=\"day' + (d === today ? ' is-today' : '') + '\"><div class=\"dayh\"><span>' + DOW[dt.getDay()] + ' ' + day + ' ' + MONTHS[mo - 1].toLowerCase() + (d === today ? ' · aujourd\\'hui' : '') + '</span><em>' + rs.length + ' retour' + (rs.length > 1 ? 's' : '') + '</em></div>'\n          + rs.map(function (r) {\n              var pc = plateColor(r);\n              return '<div class=\"card\"><div class=\"t\"><span>' + esc(r.car || 'Véhicule') + '</span>' + (r.endTime ? '<i>' + esc(r.endTime) + '</i>' : '') + '</div>'\n                + (pc ? '<div class=\"s\">' + esc(pc) + '</div>' : '')\n                + '<div class=\"s\">' + esc(r.client || '') + '</div>'\n                + (r.place ? '<div class=\"s\">' + esc(r.place) + '</div>' : '') + '</div>';\n            }).join('') + '</div>';\n      }\n    }\n    var trail = (7 - ((lead + daysIn) % 7)) % 7;\n    for (var j = 0; j < trail; j++) grid += '<div class=\"cell out\"></div>';\n    var isCurrent = ym === today.slice(0, 7);\n    var upd = lastOk ? lastOk.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }) : '';\n    document.getElementById('app').innerHTML =\n      '<div class=\"top\"><div class=\"brand\"><img src=\"/assets/logo-asl-admin.png\" alt=\"All Star Loc\" onerror=\"this.style.display=\\'none\\'\"><div><div class=\"name\">All Star Loc</div><div class=\"sub\">Calendriers · retours et entretien</div></div></div>'\n      + '<div class=\"today-date\"><small>Aujourd\\'hui</small>' + DOW[new Date().getDay()].charAt(0).toUpperCase() + DOW[new Date().getDay()].slice(1) + ' ' + new Date().getDate() + ' ' + MONTHS[new Date().getMonth()].toLowerCase() + ' ' + new Date().getFullYear() + '</div>'\n      + '<div class=\"live' + (failed ? ' off' : '') + '\"><i></i>' + (failed ? 'Connexion perdue — nouvelle tentative…' : 'À jour' + (upd ? ' · ' + upd : '')) + '</div></div>'\n      + '<div class=\"tabs\"><button class=\"' + (view === 'returns' ? 'on' : '') + '\" onclick=\"__aslView(\\'returns\\')\">Retours</button><button class=\"' + (view === 'maint' ? 'on' : '') + '\" onclick=\"__aslView(\\'maint\\')\">Entretien</button></div>'\n      + '<div class=\"box\"><div class=\"head\">'\n      + '<div class=\"title\"><svg viewBox=\"0 0 24 24\" width=\"18\" height=\"18\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.8\" stroke-linecap=\"round\" stroke-linejoin=\"round\" aria-hidden=\"true\"><rect x=\"3\" y=\"4\" width=\"18\" height=\"18\" rx=\"2\"/><path d=\"M16 2v4M8 2v4M3 10h18\"/></svg>'\n      + (view === 'maint'\n          ? 'Échéances d\\'entretien <span>· ' + nVt + ' visite' + (nVt > 1 ? 's' : '') + ' technique' + (nVt > 1 ? 's' : '') + ' · ' + nVid + ' vidange' + (nVid > 1 ? 's' : '') + '</span>'\n          : 'Calendrier des retours <span>· ' + total + ' retour' + (total > 1 ? 's' : '') + ' prévu' + (total > 1 ? 's' : '') + '</span>')\n      + '</div>'\n      + '<div class=\"ctrls\"><button class=\"nav\" onclick=\"__aslShift(-1)\" aria-label=\"Mois précédent\">‹</button><div class=\"month\">' + MONTHS[mo - 1] + ' ' + y + '</div><button class=\"nav\" onclick=\"__aslShift(1)\" aria-label=\"Mois suivant\">›</button>'\n      + (isCurrent ? '' : '<button class=\"today-btn\" onclick=\"__aslToday()\">Ce mois-ci</button>') + '</div></div>'\n      + '<div class=\"grid\">' + grid + '</div>'\n      + '<div class=\"list\">' + (list || '<div class=\"empty\">' + (view === 'maint' ? 'Aucune visite technique ni vidange ce mois-ci.' : 'Aucun retour prévu ce mois-ci.') + '</div>') + '</div>'\n      + '</div><div class=\"foot\">Mis à jour automatiquement</div>';\n  }\n  function load() {\n    if (!code) { message('Lien incomplet', 'Ce lien ne contient pas de code. Demandez le lien complet.'); return; }\n    fetch('/api/share/planning?code=' + encodeURIComponent(code), { cache: 'no-store' })\n      .then(function (res) {\n        if (res.status === 404) { data = null; message('Lien désactivé', 'Ce lien n\\'est plus actif. Demandez un nouveau lien.'); return null; }\n        if (!res.ok) throw new Error('HTTP ' + res.status);\n        return res.json();\n      })\n      .then(function (j) {\n        if (!j) return;\n        data = j; lastOk = new Date(); failed = false; render();\n      })\n      .catch(function () { failed = true; if (data) render(); else message('Connexion impossible', 'Vérifiez la connexion internet. Nouvelle tentative automatique…'); });\n  }\n  load();\n  setInterval(load, 60000);\n  document.addEventListener('visibilitychange', function () { if (document.visibilityState === 'visible') load(); });\n  window.addEventListener('focus', load);\n})();\n</script>\n</body>\n</html>\n";

/* ★ LOT 44 — Documents clients privés : formats acceptés + identifiant
   aléatoire cryptographique (32 caractères). */
const DOC_TYPES = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp', 'application/pdf': 'pdf' };
function docId() {
  const c = 'abcdefghijklmnopqrstuvwxyz0123456789';
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  let s = 'd';
  for (let i = 0; i < bytes.length; i++) s += c[bytes[i] % c.length];
  return s;
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
/* Hachage du mot de passe — STRICTEMENT identique à admin-users.js (client),
   pour vérifier la connexion d'un employé côté serveur. */
function hashPass(pass) {
  var h = 5381;
  var str = 'asl::' + String(pass == null ? '' : pass);
  for (var i = 0; i < str.length; i++) { h = ((h << 5) + h) + str.charCodeAt(i); h = h & 0xffffffff; }
  return 'h' + (h >>> 0).toString(16);
}

export async function onRequest(context) {
  const { request, env } = context;
  const url = new URL(request.url);
  // Chemin après /api : ex. "state", "fleet", "img/dacia-duster-x1y2z3.jpg"
  const path = url.pathname.replace(/^\/api\/?/, '').replace(/\/+$/, '');

  if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: JSON_HEADERS });

  /* ---- Diagnostic ---- */
  /* ---- Traduction serveur (évite les blocages CORS du navigateur) ---- */
  if (path === 'translate' && request.method === 'POST') {
    let body;
    try { body = await request.json(); } catch (e) { return err(400, 'JSON invalide'); }
    const text = String(body.text || '');
    const targets = ['en', 'es', 'ar'];
    const out = { fr: text };
    if (!text.trim()) return json({ ok: true, translations: out });
    for (const lang of targets) {
      out[lang] = text; // repli par défaut = texte FR
      try {
        const url = 'https://api.mymemory.translated.net/get?q=' + encodeURIComponent(text) + '&langpair=fr|' + lang;
        const r = await fetch(url);
        if (r.ok) {
          const d = await r.json();
          if (d && d.responseData && d.responseData.translatedText) {
            out[lang] = d.responseData.translatedText;
          }
        }
      } catch (e) { /* garde le repli FR */ }
    }
    return json({ ok: true, translations: out });
  }

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
    // Comptes EMPLOYÉS (stockés en KV par l'administration) :
    // connexion possible depuis N'IMPORTE QUEL navigateur / appareil.
    if (env.ASL_DB) {
      try {
        const udoc = await readDoc(env, 'users');
        const users = (udoc && Array.isArray(udoc.items)) ? udoc.items : [];
        const emp = users.find(function (x) { return x.username && x.username.toLowerCase() === user.toLowerCase(); });
        if (emp) {
          if (emp.active === false) return err(403, 'Compte désactivé. Contactez l\'administrateur.');
          if (emp.passHash === hashPass(pass)) {
            return json({
              ok: true, employee: true,
              user: emp.name || emp.username, username: emp.username, userId: emp.id,
              perms: emp.perms || {},
              exp: Date.now() + 8 * 3600 * 1000, token: randId(24),
              adminKey: env.ADMIN_KEY || ''
            });
          }
        }
      } catch (e) { /* tombera en 401 ci-dessous */ }
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

  /* ---- Utilisateurs / accès employés (administration, multi-appareils) ----
     Stockés dans le KV (clé "users"). Lecture/écriture réservées à l'admin
     (clé X-ASL-Key). Les empreintes de mot de passe ne sont JAMAIS renvoyées
     par GET. La connexion employé (vérifiée plus haut dans /login) lit cette
     même clé KV : un compte créé ici fonctionne sur tout appareil. */
  if (path === 'users') {
    if (request.method === 'GET') {
      if (!authorized(request, env)) return err(403, 'Clé admin invalide ou absente (X-ASL-Key)');
      const doc = (await readDoc(env, 'users')) || { rev: 0, items: [] };
      const items = Array.isArray(doc.items) ? doc.items : [];
      const safe = items.map(function (u) {
        return { id: u.id, name: u.name, username: u.username, perms: u.perms || {}, active: u.active !== false, createdAt: u.createdAt };
      });
      return json({ ok: true, users: safe, rev: doc.rev });
    }
    if (request.method === 'POST') {
      if (!authorized(request, env)) return err(403, 'Clé admin invalide ou absente (X-ASL-Key)');
      let body;
      try { body = await request.json(); } catch (e) { return err(400, 'JSON invalide'); }
      const doc = (await readDoc(env, 'users')) || { rev: 0, items: [] };
      let items = Array.isArray(doc.items) ? doc.items : [];

      if (body.action === 'add') {
        const item = body.item;
        if (!item || typeof item !== 'object' || !item.username) return err(400, 'item invalide');
        if (items.some(function (u) { return (u.username || '').toLowerCase() === String(item.username).toLowerCase(); })) return err(409, 'Cet identifiant existe déjà.');
        if (!item.id) item.id = 'usr' + Date.now() + randId(3);
        if (item.active == null) item.active = true;
        if (!item.createdAt) item.createdAt = new Date().toISOString();
        items.push(item);
        const rev = await writeDoc(env, 'users', items);
        return json({ ok: true, rev: rev, id: item.id });
      }
      if (body.action === 'update') {
        const u = items.find(function (x) { return x.id === body.id; });
        if (!u) return err(404, 'Utilisateur introuvable');
        if (!body.patch || typeof body.patch !== 'object') return err(400, 'patch manquant');
        if (body.patch.username && items.some(function (x) { return x.id !== body.id && (x.username || '').toLowerCase() === String(body.patch.username).toLowerCase(); })) return err(409, 'Cet identifiant existe déjà.');
        Object.assign(u, body.patch);
        const rev = await writeDoc(env, 'users', items);
        return json({ ok: true, rev: rev });
      }
      if (body.action === 'remove') {
        items = items.filter(function (x) { return x.id !== body.id; });
        const rev = await writeDoc(env, 'users', items);
        return json({ ok: true, rev: rev });
      }
      if (body.action === 'replace') {
        if (!isArrayOfObjects(body.items, 500)) return err(400, 'items invalide (max 500)');
        const rev = await writeDoc(env, 'users', body.items);
        return json({ ok: true, rev: rev });
      }
      return err(400, 'action inconnue (add | update | remove | replace)');
    }
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
      /* ============================================================
         ★ CORRECTIF (régression Mission 2 — cause exacte trouvée) :
         une version précédente ajoutait ici une boucle "écrire puis relire
         immédiatement pour vérifier", dans le but d'éviter les pertes lors
         d'écritures concurrentes. Cloudflare KV est cependant à cohérence
         EVENTUELLE au niveau mondial : une lecture menée juste après une
         écriture peut atterrir sur un autre nœud edge qui ne voit pas
         encore cette écriture. La vérification échouait alors à tort,
         déclenchant une nouvelle tentative complète (nouvelle lecture +
         nouvelle écriture + nouvelle vérification) — sur CHAQUE opération,
         même sans aucun conflit réel. Résultat : usage KV multiplié
         inutilement (cohérent avec l'alerte de quota reçue), et un risque
         de voir cette suite d'écritures redondantes elle-même entrer en
         collision avec d'autres appareils, aggravant la désynchronisation
         au lieu de la corriger. Retour à un simple "lire → ajouter →
         écrire" — le comportement qui fonctionnait correctement avant. Le
         risque résiduel (deux écritures strictement simultanées depuis
         deux appareils différents) est réel mais rare en usage normal, et
         largement préférable à la regression provoquée par le correctif
         précédent. ============================================================ */
      let items2 = Array.isArray(doc.items) ? doc.items.slice() : [];
      if (items2.length >= 5000) return err(409, 'Capacité maximale atteinte');
      /* ============================================================
         ★ CORRECTIF (cause exacte de "2 voitures réservées pour 1 seule
         réservation") : lorsque la RÉPONSE réseau d'un ajout se perdait
         (ex. coupure mobile) alors que le serveur avait déjà bien
         enregistré la réservation, le client — ne recevant aucune
         confirmation — réessayait automatiquement le MÊME envoi (même
         item.id, généré côté client). Sans protection ici, ce deuxième
         envoi recevait un id ALÉATOIRE différent et créait un second
         enregistrement complet pour la même réservation : deux dossiers,
         donc deux voitures "prises" pour une seule réservation réelle.
         Désormais, si un enregistrement avec cet id EXACT existe déjà, on
         reconnaît qu'il s'agit d'une répétition du même ajout : on ne crée
         rien de plus, on renvoie simplement le succès avec l'id existant. */
      var clientId = item.id ? String(item.id) : '';
      if (clientId) {
        var already = items2.find(function (r) { return r.id === clientId; });
        if (already) {
          return json({ ok: true, rev: doc.rev, id: clientId });
        }
      }
      let id = clientId || ('ASL' + Date.now().toString().slice(-6));
      if (items2.some(function (r) { return r.id === id; })) id = id + '-' + randId(4);
      item.id = id;
      if (!item.createdAt) item.createdAt = new Date().toISOString();
      items2.push(item);
      const out = await writeReservationsDoc(env, items2, doc.resetAt);
      return json({ ok: true, rev: out.rev, id: id });
    }

    if (body.action === 'update') {
      if (!authorized(request, env)) return err(403, 'Clé admin invalide ou absente (X-ASL-Key)');
      if (!body.patch || typeof body.patch !== 'object') return err(400, 'patch manquant');
      // ★ CORRECTIF DÉFENSIF (régression Mission 2) : même limite que "add" —
      //   sans elle, une mise à jour trop volumineuse (ex. pièce jointe mal
      //   embarquée par erreur, historique de versements LLD très long)
      //   pouvait rester bloquée indéfiniment côté client (aucune limite
      //   ici auparavant), sans jamais aboutir ni jamais être signalée.
      if (JSON.stringify(body.patch).length > 20_000) return err(413, 'Modification trop volumineuse (max 20 Ko) — vérifiez qu\'aucune image n\'est embarquée directement.');
      // ★ Même correctif que "add" ci-dessus : simple lecture → écriture,
      //   sans relecture de vérification (incompatible avec la cohérence
      //   éventuelle de KV — voir le commentaire détaillé plus haut).
      let items3 = Array.isArray(doc.items) ? doc.items.slice() : [];
      const r = items3.find(function (x) { return x.id === body.id; });
      if (!r) return err(404, 'Réservation introuvable: ' + body.id);
      Object.assign(r, body.patch);
      const out2 = await writeReservationsDoc(env, items3, doc.resetAt);
      return json({ ok: true, rev: out2.rev });
    }

    if (body.action === 'delete') {
      if (!authorized(request, env)) return err(403, 'Clé admin invalide ou absente (X-ASL-Key)');
      if (!body.id) return err(400, 'id manquant');
      // ★ Point 1 — suppression DÉFINITIVE (distincte d'une annulation, qui
      //   garde le dossier marqué "cancelled" pour l'historique/la
      //   comptabilité). Même correctif que add/update ci-dessus : simple
      //   lecture → suppression → écriture, sans relecture de vérification.
      let items4 = Array.isArray(doc.items) ? doc.items.slice() : [];
      items4 = items4.filter(function (x) { return x.id !== body.id; });
      const out3 = await writeReservationsDoc(env, items4, doc.resetAt);
      return json({ ok: true, rev: out3.rev });
    }

    if (body.action === 'replace') {
      if (!authorized(request, env)) return err(403, 'Clé admin invalide ou absente (X-ASL-Key)');
      if (!isArrayOfObjects(body.items, 5000)) return err(400, 'items invalide');
      // ★ Nouveau marqueur resetAt : signale à TOUS les appareils (mobile compris)
      //   qu'une réinitialisation vient d'avoir lieu, afin qu'ils jettent leurs
      //   écritures locales en attente au lieu de les renvoyer/réafficher.
      const out = await writeReservationsDoc(env, body.items, Date.now());
      return json({ ok: true, rev: out.rev, resetAt: out.resetAt });
    }

    return err(400, 'action inconnue (add | update | delete | replace)');
  }

  /* ---- Données auxiliaires synchronisées (sous-locations, charges,
         entretien, documents) : GET (lecture) / PUT (admin).
         name ∈ { subleases, charges, maint, docs } ---- */
  if (path === 'misc' && request.method === 'GET') {
    const name = url.searchParams.get('name') || '';
    if (MISC_NAMES.indexOf(name) < 0) return err(400, 'name invalide');
    const raw = await env.ASL_DB.get('misc_' + name);
    let doc = null;
    if (raw) {
      try {
        const parsed = JSON.parse(raw);
        // Compat : ancien format {rev, items} OU nouveau {rev, value}
        doc = { rev: parsed.rev || 0, value: (parsed.value !== undefined ? parsed.value : parsed.items) };
      } catch (e) { doc = null; }
    }
    return json({ ok: true, name: name, doc: doc });
  }
  if (path === 'misc' && request.method === 'PUT') {
    if (!authorized(request, env)) return err(403, 'Clé admin invalide ou absente (X-ASL-Key)');
    let body;
    try { body = await request.json(); } catch (e) { return err(400, 'JSON invalide'); }
    const allowed = MISC_NAMES;
    if (allowed.indexOf(body.name) < 0) return err(400, 'name invalide');
    if (JSON.stringify(body.value || '').length > 4_000_000) return err(413, 'Données trop volumineuses');
    const rev = Date.now();
    await env.ASL_DB.put('misc_' + body.name, JSON.stringify({ rev: rev, value: body.value }));
    return json({ ok: true, rev: rev });
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

  /* ---- ★ LOT 44 — Documents clients PRIVÉS (CIN, permis, passeport) ----
     Chaque image est stockée SÉPARÉMENT (clé KV « doc:<id> »), au lieu
     d'être embarquée dans le bloc « docs » (limité à 4 Mo au total, et
     lisible sans authentification). Lecture ET écriture exigent la clé
     admin, transmise à tout utilisateur connecté (admin et employés).
     Endpoints ajoutés uniquement : aucun endpoint existant n'est modifié. */
  if (path === 'doc' && request.method === 'POST') {
    if (!authorized(request, env)) return err(403, 'Clé admin invalide ou absente (X-ASL-Key)');
    let body;
    try { body = await request.json(); } catch (e) { return err(400, 'JSON invalide'); }
    const type = String(body.type || '');
    if (!DOC_TYPES[type]) return err(415, 'Format non supporté (JPEG, PNG, WebP ou PDF)');
    if (typeof body.data !== 'string' || !body.data.length || body.data.length > 8_000_000) {
      return err(413, 'Document trop volumineux (max ~6 Mo)');
    }
    let bytes;
    try { bytes = b64ToBytes(body.data); } catch (e) { return err(400, 'Encodage base64 invalide'); }
    const id = docId();
    await env.ASL_DB.put('doc:' + id, bytes.buffer, { metadata: { type: type } });
    return json({ ok: true, id: id, type: type });
  }
  if (path.startsWith('doc/') && request.method === 'GET') {
    if (!authorized(request, env)) return err(403, 'Clé admin invalide ou absente (X-ASL-Key)');
    const id = path.slice(4);
    if (!/^[a-z0-9]{8,64}$/.test(id)) return err(400, 'Identifiant document invalide');
    const got = await env.ASL_DB.getWithMetadata('doc:' + id, 'arrayBuffer');
    if (!got || !got.value) return err(404, 'Document introuvable');
    const type = (got.metadata && got.metadata.type) || 'image/jpeg';
    return new Response(got.value, {
      status: 200,
      headers: {
        'Content-Type': type,
        'Cache-Control': 'private, no-store',
        'X-Content-Type-Options': 'nosniff',
        'Access-Control-Allow-Origin': '*',
      },
    });
  }

  /* ---- ★ LOT 48 — LIEN PRIVÉ « Calendrier des retours » (lecture seule) ----
     GET  /api/share/planning?code=…  → données MINIMALES du calendrier des
          retours (voiture, plaque, couleur, client, date, heure, lieu). Ni
          téléphone, ni montant, ni document. Le code (32 caractères aléatoires)
          est la seule clé : un mauvais code, ou un lien désactivé → 404.
     POST /api/share/planning (clé admin) → { action: 'status' | 'enable' |
          'regenerate' | 'disable' } pour gérer le lien depuis le back-office.
     Endpoints AJOUTÉS uniquement ; clé KV dédiée « share_planning ». */
  if (path === 'share/planning' && request.method === 'GET') {
    const cfg = await readDoc(env, 'share_planning');
    const code = String(url.searchParams.get('code') || '');
    if (!cfg || !cfg.enabled || !cfg.code || code.length < 20 || code !== cfg.code) {
      return new Response(JSON.stringify({ ok: false, error: 'Lien invalide ou désactivé' }), { status: 404, headers: Object.assign({}, JSON_HEADERS, { 'Cache-Control': 'no-store' }) });
    }
    const fleetDoc = await readDoc(env, 'fleet');
    const resDoc = await readDoc(env, 'reservations');
    const fleet = ((fleetDoc && fleetDoc.items) || []).map(function (c) {
      const units = Array.isArray(c.units) && c.units.length ? c.units : (c.plate ? [{ plate: c.plate, color: c.color || '' }] : []);
      return { id: c.id, name: c.name || '', units: units.map(function (u) { return { plate: u.plate || '', color: u.color || '' }; }) };
    });
    // Même règle que le logiciel (ASLDB.selectReturnsOn) : dossier non annulé,
    // non terminé ; la date de retour décide du jour.
    const today = new Date();
    const from = new Date(today.getTime() - 62 * 86400000).toISOString().slice(0, 10);
    const to = new Date(today.getTime() + 400 * 86400000).toISOString().slice(0, 10);
    const returns = ((resDoc && resDoc.items) || []).filter(function (r) {
      if (!r || r.status === 'cancelled' || r.status === 'completed') return false;
      const d = String(r.endDate || '').slice(0, 10);
      return d && d >= from && d <= to;
    }).map(function (r) {
      return {
        car: r.car || '', carId: r.carId == null ? '' : r.carId,
        plate: r.assignedPlate || '', color: r.assignedColor || '',
        client: r.client || '', status: r.status || '',
        endDate: String(r.endDate || '').slice(0, 10), endTime: r.endTime || '',
        place: String(r.dropoff || r.returnLocation || r.pickup || '').trim()
      };
    });
    // ★ LOT 49 — Échéances d'entretien (même lecture que le logiciel : clé
    //   « idModèle::plaque », repli sur l'ancienne clé « idModèle »). Seulement
    //   les dates et le km de prochaine vidange — pas les notes.
    let maintMap = {};
    try { const mraw = await env.ASL_DB.get('misc_maint'); if (mraw) maintMap = (JSON.parse(mraw) || {}).value || {}; } catch (e) { maintMap = {}; }
    const maint = [];
    fleet.forEach(function (c) {
      const units = c.units.length ? c.units : [{ plate: '', color: '' }];
      units.forEach(function (u) {
        const m = maintMap[String(c.id) + '::' + (u.plate || '_')] || maintMap[String(c.id)] || null;
        if (!m) return;
        const vt = String(m.vt_next || '').slice(0, 10);
        const rem = String(m.reminder_next || '').slice(0, 10);
        if (!vt && !rem) return;
        maint.push({ car: c.name, plate: u.plate || '', color: u.color || '', vt: vt, vidange: rem, kmVidange: m.km_vidange_next || '' });
      });
    });
    return new Response(JSON.stringify({ ok: true, fleet: fleet, returns: returns, maint: maint, rev: (resDoc && resDoc.rev) || 0 }), {
      status: 200, headers: Object.assign({}, JSON_HEADERS, { 'Cache-Control': 'no-store', 'X-Robots-Tag': 'noindex' })
    });
  }
  /* ★ LOT 50 — La PAGE du calendrier partagé est servie par le serveur
     lui-même (GET /api/share/view?code=…). Ainsi elle fonctionne même si le
     fichier planning.html n'a pas été mis en ligne : seul ce fichier serveur,
     déjà déployé, est nécessaire. Contenu identique à planning.html. */
  if (path === 'share/view' && request.method === 'GET') {
    return new Response(PLANNING_PAGE_HTML, {
      status: 200,
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'Cache-Control': 'no-cache, must-revalidate',
        'X-Robots-Tag': 'noindex, nofollow',
        'Referrer-Policy': 'no-referrer',
      },
    });
  }
  if (path === 'share/planning' && request.method === 'POST') {
    if (!authorized(request, env)) return err(403, 'Clé admin invalide ou absente (X-ASL-Key)');
    let body = {};
    try { body = await request.json(); } catch (e) {}
    const action = String(body.action || 'status');
    let cfg = (await readDoc(env, 'share_planning')) || { enabled: false, code: '' };
    if (action === 'enable') {
      if (!cfg.code) cfg.code = docId().slice(1);
      cfg.enabled = true;
    } else if (action === 'regenerate') {
      cfg.code = docId().slice(1); cfg.enabled = true;
    } else if (action === 'disable') {
      cfg.enabled = false;
    } else if (action !== 'status') {
      return err(400, 'Action inconnue');
    }
    if (action !== 'status') { cfg.updated = new Date().toISOString(); await env.ASL_DB.put('share_planning', JSON.stringify(cfg)); }
    return json({ ok: true, enabled: !!cfg.enabled, code: cfg.enabled ? cfg.code : '' });
  }

  return err(404, 'Endpoint inconnu: ' + path);
}
