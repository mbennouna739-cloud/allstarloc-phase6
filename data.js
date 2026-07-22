/* ============================================================
   ALL STAR LOC — SOURCE DE DONNÉES UNIQUE (v2 — Production)
   Partagée entre le site client (index.html) et l'admin (admin/index.html)

   NOUVEAU : les véhicules et réservations sont synchronisés avec un
   serveur central (API /api — Cloudflare Pages Functions + KV).
   → Une voiture ajoutée depuis l'admin apparaît sur TOUS les appareils,
     tous les navigateurs, l'URL Cloudflare et le futur domaine officiel.

   Le localStorage du navigateur ne sert plus que de :
   - cache instantané (affichage immédiat, zéro attente)
   - mode hors-ligne / mode local (file://, coupure réseau, API absente)
   Les écritures faites hors-ligne sont mises en file et renvoyées
   automatiquement dès que le serveur redevient joignable.

   L'API publique ASLDB est STRICTEMENT IDENTIQUE à la v1 :
   aucun changement requis dans index.html ni admin/index.html.
   ============================================================ */
(function (global) {
  'use strict';

  /* ================= CONFIGURATION =================
     REMOTE_URL : adresse de l'API de synchronisation.
       - '/api'  → Cloudflare Pages Functions livrées dans /functions (recommandé)
       - ''      → désactive totalement la synchro (mode local pur)
       - URL complète possible si l'API est hébergée ailleurs (CORS géré)
     ADMIN_KEY : si vous définissez la variable d'environnement ADMIN_KEY
       côté Cloudflare (recommandé en production), reportez la MÊME valeur
       ici pour autoriser les écritures de l'administration.
     POLL_MS : fréquence de vérification des nouveautés serveur (ms).      */
  const REMOTE_URL = '/api';
  // La clé admin n'est PLUS codée en dur : elle est récupérée depuis la session
  // déposée lors de la connexion (login serveur). Repli sur '' si absente.
  const ADMIN_KEY = (function(){
    try { return localStorage.getItem('asl_admin_key') || ''; } catch(e) { return ''; }
  })();
  const POLL_MS    = 8000;
  /* ================================================= */

  const KEY_FLEET   = 'asl_fleet_v1';
  const KEY_RES     = 'asl_reservations_v1';
  const KEY_REV_F   = 'asl_rev_fleet_v1';
  const KEY_REV_R   = 'asl_rev_res_v1';
  const KEY_PEND_F  = 'asl_pending_fleet_v1';   // '1' si la flotte locale doit être renvoyée
  const KEY_PEND_RA = 'asl_pending_res_add_v1'; // réservations créées hors-ligne
  const KEY_PEND_RU = 'asl_pending_res_upd_v1'; // mises à jour de réservations hors-ligne
  const KEY_RESET_SEEN = 'asl_reservations_reset_seen_v1'; // dernier resetAt serveur connu par CET appareil
  // ★ CORRECTIF : vidage des réservations (clôture de période) en attente de
  //   confirmation par le serveur. Avant ce correctif, l'appel réseau qui vide
  //   les réservations côté serveur était envoyé UNE SEULE FOIS, sans relance :
  //   en cas d'échec (clé admin locale périmée, coupure réseau, redémarrage à
  //   froid du Worker...), l'échec était avalé silencieusement. L'appareil qui
  //   avait cliqué gardait un tableau de bord vide (son propre cache local
  //   avait été vidé directement), mais le serveur — donc TOUS LES AUTRES
  //   appareils (mobile compris) — continuait de renvoyer l'ancienne liste
  //   complète de réservations indéfiniment. Ce marqueur rend l'opération
  //   persistante et automatiquement retentée à chaque cycle de synchro
  //   (comme KEY_PEND_F et les données "misc"), jusqu'à confirmation réelle
  //   par le serveur.
  const KEY_PEND_RESET = 'asl_pending_reservations_reset_v1';
  const RATE_MAD    = 10.8; // 1 EUR = 10.8 MAD (utilisé pour les conversions)

  /* ---------- Flotte initiale (premier démarrage uniquement) ---------- */
  const DEFAULT_FLEET = [
    { id:1,  name:'Kia Picanto',           category:'citadine',   priceEUR:25, priceMAD:250, plate:'ABC-123-MK', status:'available',   fuel:'Diesel',  transmission:'Automatique', seats:5, badge:'Mini-Urbaine', featured:false, services:['Clim','Radio','GPS'],            img:'https://images.unsplash.com/photo-1549317661-bd32c8ce0db2?w=600&q=80' },
    { id:2,  name:'Hyundai Grand i10',     category:'citadine',   priceEUR:30, priceMAD:300, plate:'DEF-456-MK', status:'reserved',    fuel:'Essence', transmission:'Automatique', seats:5, badge:'Économique',   featured:false, services:['Clim','Radio','USB'],            img:'https://images.unsplash.com/photo-1552519507-da3b142c6e3d?w=600&q=80' },
    { id:3,  name:'Fiat 500',              category:'citadine',   priceEUR:30, priceMAD:300, plate:'GHI-789-MK', status:'available',   fuel:'Essence', transmission:'Automatique', seats:5, badge:'Citadine',     featured:false, services:['Clim','Bluetooth','Style'],      img:'https://images.unsplash.com/photo-1541899481282-d53bffe3c35d?w=600&q=80' },
    { id:4,  name:'Peugeot 208',           category:'citadine',   priceEUR:30, priceMAD:300, plate:'JKL-012-MK', status:'available',   fuel:'Diesel',  transmission:'Automatique', seats:5, badge:'Moderne',      featured:false, services:['Clim','GPS','USB'],              img:'https://images.unsplash.com/photo-1555215695-3004980ad54e?w=600&q=80' },
    { id:5,  name:'Opel Corsa',            category:'economique', priceEUR:30, priceMAD:300, plate:'MNO-345-MK', status:'maintenance', fuel:'Diesel',  transmission:'Automatique', seats:5, badge:'Économique',   featured:false, services:['Clim','Radio','Bluetooth'],      img:'https://images.unsplash.com/photo-1580273916550-e323be2ae537?w=600&q=80' },
    { id:6,  name:'Renault Clio 5',        category:'economique', priceEUR:30, priceMAD:300, plate:'PQR-678-MK', status:'available',   fuel:'Diesel',  transmission:'Manuelle',    seats:5, badge:'Compacte',     featured:false, services:['Clim','GPS','Radio'],            img:'https://images.unsplash.com/photo-1503376780353-7e6692767b70?w=600&q=80' },
    { id:7,  name:'Peugeot 301',           category:'familiale',  priceEUR:28, priceMAD:280, plate:'STU-901-MK', status:'available',   fuel:'Diesel',  transmission:'Manuelle',    seats:5, badge:'Familiale',    featured:false, services:['Clim','Grand Coffre','Confort'], img:'https://images.unsplash.com/photo-1558981806-ec527fa84c39?w=600&q=80' },
    { id:8,  name:'Citroën C-Élysée',      category:'familiale',  priceEUR:30, priceMAD:300, plate:'VWX-234-MK', status:'available',   fuel:'Diesel',  transmission:'Manuelle',    seats:5, badge:'Spacieuse',    featured:false, services:['Clim','Grand Coffre','Confort'], img:'https://images.unsplash.com/photo-1606664515524-ed2f786a0bd6?w=600&q=80' },
    { id:9,  name:'Dacia Sandero Stepway', category:'economique', priceEUR:30, priceMAD:300, plate:'YZA-567-MK', status:'available',   fuel:'Diesel',  transmission:'Manuelle',    seats:5, badge:'Polyvalente',  featured:false, services:['Clim','Hauteur','Coffre'],       img:'https://images.unsplash.com/photo-1544636331-e26879cd4d9b?w=600&q=80' },
    { id:10, name:'Dacia Duster',          category:'suv',        priceEUR:40, priceMAD:400, plate:'BCD-890-MK', status:'available',   fuel:'Diesel',  transmission:'Manuelle',    seats:5, badge:'SUV',          featured:true,  services:['4x4','Clim','GPS','Grand Coffre'], img:'https://images.unsplash.com/photo-1519641471654-76ce0107ad1b?w=600&q=80' },
    { id:11, name:'Kia Sportage',          category:'suv',        priceEUR:70, priceMAD:700, plate:'EFG-123-MK', status:'available',   fuel:'Diesel',  transmission:'Automatique', seats:5, badge:'Premium SUV',  featured:true,  services:['SUV Premium','Auto','GPS','Cuir'], img:'https://images.unsplash.com/photo-1617469767280-f8b69f46b1b0?w=600&q=80' },
  ];

  /* ---------- Lecture / écriture bas niveau (cache local) ---------- */
  function read(key, fallback) {
    try {
      const raw = localStorage.getItem(key);
      if (raw === null) return fallback;
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : fallback;
    } catch (e) { return fallback; }
  }
  function write(key, value) {
    try { localStorage.setItem(key, JSON.stringify(value)); return true; }
    catch (e) { console.error('ASLDB write error', e); return false; }
  }
  function readNum(key) { const v = parseInt(localStorage.getItem(key) || '0', 10); return isNaN(v) ? 0 : v; }
  function writeNum(key, v) { try { localStorage.setItem(key, String(v)); } catch (e) {} }
  function readJSON(key, fb) { try { const r = localStorage.getItem(key); return r === null ? fb : JSON.parse(r); } catch (e) { return fb; } }

  /* ---------- Initialisation (seed local au premier démarrage) ---------- */
  function init() {
    if (localStorage.getItem(KEY_FLEET) === null) write(KEY_FLEET, DEFAULT_FLEET);
    if (localStorage.getItem(KEY_RES)   === null) write(KEY_RES, []);
  }

  /* ---------- Écouteurs de changements (mêmes onglets + autres onglets) ---------- */
  const listeners = [];
  function emit(key) { listeners.forEach(function (cb) { try { cb(key); } catch (e) {} }); }
  function onChange(callback) {
    listeners.push(callback);
    // Autres onglets du même navigateur (mécanisme historique conservé)
    window.addEventListener('storage', function (e) {
      if (e.key === KEY_FLEET || e.key === KEY_RES) callback(e.key);
    });
  }

  /* ============================================================
     SYNCHRONISATION SERVEUR
     ============================================================ */
  let online = false;          // dernier état connu de l'API
  const remoteEnabled = !!REMOTE_URL && typeof fetch === 'function' &&
    !(typeof location !== 'undefined' && location.protocol === 'file:' && REMOTE_URL.charAt(0) === '/');

  function apiUrl(path) { return REMOTE_URL.replace(/\/$/, '') + path; }
  function headers(withKey) {
    const h = { 'Content-Type': 'application/json' };
    if (withKey && ADMIN_KEY) h['X-ASL-Key'] = ADMIN_KEY;
    return h;
  }

  async function apiFetch(path, opts) {
    const res = await fetch(apiUrl(path), Object.assign({ cache: 'no-store' }, opts || {}));
    if (!res.ok) {
      const txt = await res.text().catch(function () { return ''; });
      const err = new Error('API ' + res.status + ' ' + txt.slice(0, 200));
      err.status = res.status;
      throw err;
    }
    return res.json();
  }

  // Durée maximale pendant laquelle un écriture locale de la flotte, non
  // encore confirmée par le serveur, peut bloquer la réception d'une donnée
  // serveur plus récente (ex. restauration de la base de données par
  // l'administrateur). Passé ce délai, on considère l'écriture locale comme
  // abandonnée (appareil resté hors-ligne, session expirée, etc.) : la
  // valeur serveur devient prioritaire, exactement comme sur les autres
  // appareils. Ceci évite qu'un mobile (ou tout autre appareil) reste bloqué
  // indéfiniment sur un ancien état de la flotte après une restauration.
  const PEND_F_MAX_AGE_MS = 2 * 60 * 1000; // 2 minutes

  function fleetPendingIsStale() {
    const raw = localStorage.getItem(KEY_PEND_F);
    if (!raw) return false;
    const ts = parseInt(raw, 10);
    // Compat : anciennes valeurs '1' sans horodatage → considérées comme immédiatement obsolètes.
    if (!ts) return true;
    return (Date.now() - ts) > PEND_F_MAX_AGE_MS;
  }

  /* ----- PULL : récupère l'état serveur et met à jour le cache ----- */
  async function pullState() {
    const data = await apiFetch('/state', { method: 'GET' });
    let changed = false;

    // Flotte
    if (data.fleet && Array.isArray(data.fleet.items)) {
      const pendingRaw = localStorage.getItem(KEY_PEND_F);
      const blockedByPending = pendingRaw && !fleetPendingIsStale();
      if (pendingRaw && fleetPendingIsStale()) {
        // Écriture locale abandonnée (trop ancienne) : on ne bloque plus le pull.
        try { localStorage.removeItem(KEY_PEND_F); } catch (e) {}
      }
      if (!blockedByPending && data.fleet.rev > readNum(KEY_REV_F)) {
        write(KEY_FLEET, data.fleet.items);
        writeNum(KEY_REV_F, data.fleet.rev);
        changed = true; emit(KEY_FLEET);
      }
    } else if (data.fleet === null || data.fleet === undefined) {
      // Serveur vide (tout premier déploiement) → on y envoie la flotte locale
      markFleetDirty();
    }

    // Réservations (le serveur fait foi ; on ré-applique les écritures locales en attente)
    if (data.reservations && Array.isArray(data.reservations.items)) {
      // ★ Détection d'une réinitialisation serveur (clôture de période lancée
      //   depuis N'IMPORTE QUEL appareil). Si le marqueur resetAt renvoyé par
      //   le serveur est plus récent que le dernier connu sur CET appareil,
      //   on jette la file d'attente locale (ajouts/mises à jour non confirmés)
      //   au lieu de la rejouer : sans ça, un mobile ayant une écriture en
      //   attente (ex. mise à jour de statut refusée faute de clé admin, ou
      //   simple coupure réseau) continuait de renvoyer/réafficher indéfiniment
      //   d'anciennes réservations même après une remise à zéro complète.
      const serverResetAt = Number(data.reservations.resetAt) || 0;
      const lastKnownResetAt = readNum(KEY_RESET_SEEN);
      if (serverResetAt && serverResetAt > lastKnownResetAt) {
        if (lastKnownResetAt > 0) {
          // Pas le tout premier chargement : c'est un VRAI reset survenu
          // depuis notre dernier passage → on purge nos écritures en attente.
          try { localStorage.removeItem(KEY_PEND_RA); } catch (e) {}
          try { localStorage.removeItem(KEY_PEND_RU); } catch (e) {}
        }
        writeNum(KEY_RESET_SEEN, serverResetAt);
      }

      if (data.reservations.rev > readNum(KEY_REV_R)) {
        let items = data.reservations.items.slice();
        readJSON(KEY_PEND_RA, []).forEach(function (p) {
          if (!items.some(function (r) { return r.id === p.id; })) items.push(p);
        });
        readJSON(KEY_PEND_RU, []).forEach(function (u) {
          const r = items.find(function (x) { return x.id === u.id; });
          if (r) Object.assign(r, u.patch);
        });
        write(KEY_RES, items);
        writeNum(KEY_REV_R, data.reservations.rev);
        changed = true; emit(KEY_RES);
      }
    }
    return changed;
  }

  /* ----- PUSH : renvoie au serveur les écritures en attente ----- */
  async function flushPending() {
    // 1) Flotte complète (administration)
    if (localStorage.getItem(KEY_PEND_F)) {
      const out = await apiFetch('/fleet', {
        method: 'PUT', headers: headers(true),
        body: JSON.stringify({ items: read(KEY_FLEET, []) })
      });
      writeNum(KEY_REV_F, out.rev || Date.now());
      try { localStorage.removeItem(KEY_PEND_F); } catch (e) {}
    }
    // 2) Réservations créées hors-ligne / non confirmées par le serveur
    const adds = readJSON(KEY_PEND_RA, []);
    while (adds.length) {
      const item = adds[0];
      const out = await apiFetch('/reservations', {
        method: 'POST', headers: headers(false),
        body: JSON.stringify({ action: 'add', item: item })
      });
      // Le serveur peut ré-attribuer un id en cas de collision
      if (out.id && out.id !== item.id) {
        const list = read(KEY_RES, []);
        const r = list.find(function (x) { return x.id === item.id; });
        if (r) { r.id = out.id; write(KEY_RES, list); emit(KEY_RES); }
      }
      if (out.rev) writeNum(KEY_REV_R, out.rev);
      adds.shift();
      write(KEY_PEND_RA, adds);
    }
    // 3) Mises à jour de réservations (administration)
    const upds = readJSON(KEY_PEND_RU, []);
    while (upds.length) {
      const u = upds[0];
      try {
        const out = await apiFetch('/reservations', {
          method: 'POST', headers: headers(true),
          body: JSON.stringify({ action: 'update', id: u.id, patch: u.patch })
        });
        if (out.rev) writeNum(KEY_REV_R, out.rev);
      } catch (eUpd) {
        // ★ Clé admin absente/refusée (ex. appareil employé sans droits) ou
        //   réservation introuvable (déjà purgée par une réinitialisation) :
        //   cette mise à jour ne pourra JAMAIS aboutir depuis cet appareil.
        //   Sans ce garde-fou, elle restait bloquée en tête de file et était
        //   retentée indéfiniment à chaque cycle, tout en étant réappliquée
        //   localement par pullState() — ce qui faisait diverger l'appareil
        //   du reste du parc (ex. mobile affichant une location « fantôme »).
        if (eUpd && (eUpd.status === 401 || eUpd.status === 403 || eUpd.status === 404)) {
          upds.shift();
          write(KEY_PEND_RU, upds);
          continue;
        }
        throw eUpd; // erreur réseau/temporaire : on réessaiera au prochain cycle
      }
      upds.shift();
      write(KEY_PEND_RU, upds);
    }
    // 4) ★ CORRECTIF : vidage des réservations (clôture de période) resté en
    //    attente d'une confirmation serveur — relance automatique tant que
    //    KEY_PEND_RESET est présent (voir pushReservationsReset / closePeriod
    //    pour le détail du bug corrigé : avant, cette étape n'existait pas et
    //    un échec réseau/auth lors de la clôture perdait le vidage pour de
    //    bon côté serveur, sans que rien ne le relance ni ne le signale).
    if (localStorage.getItem(KEY_PEND_RESET)) {
      await pushReservationsReset();
    }
  }

  /* ----- Cycle complet : push des écritures puis pull des nouveautés -----
     File de cycles chaînés : si une synchro est en cours, l'appel planifie
     UN cycle supplémentaire juste après et retourne une promesse qui se
     résout à la fin de CE cycle — toute écriture mise en file avant l'appel
     est donc garantie envoyée quand la promesse se résout. */
  let authError = false; // clé admin refusée par le serveur
  let syncChain = Promise.resolve(false);
  let cyclePlanned = false;
  /* ----- Synchro des données auxiliaires (sous-locations, charges,
     entretien, documents) entre tous les appareils. Chaque clé locale
     est miroir d'un document serveur ; on pousse si on a modifié
     localement (marqueur _dirty), sinon on tire la version serveur. ----- */
  var MISC_MAP = {
    subleases: 'asl_subleases_v1',
    charges: 'asl_charges_v1',
    maint: 'asl_maint_v1',
    docs: 'asl_cust_docs_v1',
    lld: 'asl_lld_v1',
    customfeatures: 'asl_custom_features_v1',
    archives: 'asl_archives_v1'
  };
  function miscDirtyKey(name) { return 'asl_misc_dirty_' + name; }
  function miscRevKey(name) { return 'asl_misc_rev_' + name; }
  function markMiscDirty(name) {
    try { localStorage.setItem(miscDirtyKey(name), '1'); } catch (e) {}
  }
  /* Exposé : appelé par les modules quand ils écrivent une clé auxiliaire. */
  function noteLocalChange(localKey) {
    Object.keys(MISC_MAP).forEach(function (name) {
      if (MISC_MAP[name] === localKey) markMiscDirty(name);
    });
  }
  async function syncMisc() {
    if (!remoteEnabled) return;
    for (var name in MISC_MAP) {
      if (!MISC_MAP.hasOwnProperty(name)) continue;
      var localKey = MISC_MAP[name];
      var dirty = localStorage.getItem(miscDirtyKey(name));
      try {
        if (dirty) {
          // Pousser la version locale
          var value = readJSON(localKey, null);
          if (value !== null) {
            try {
              var res = await apiFetch('/misc', {
                method: 'PUT', headers: headers(true),
                body: JSON.stringify({ name: name, value: value })
              });
              if (res && res.rev != null) writeNum(miscRevKey(name), res.rev);
              try { localStorage.removeItem(miscDirtyKey(name)); } catch (e) {}
            } catch (ePush) {
              // Pas de clé admin (employé) : on ne peut pas pousser. On abandonne
              // le marqueur et on récupère plutôt la version serveur pour rester à jour.
              if (ePush && (ePush.status === 401 || ePush.status === 403)) {
                try { localStorage.removeItem(miscDirtyKey(name)); } catch (e) {}
                var pulled = await apiFetch('/misc?name=' + name, { method: 'GET' });
                if (pulled && pulled.doc && typeof pulled.doc.rev === 'number' && pulled.doc.rev > readNum(miscRevKey(name))) {
                  write(localKey, pulled.doc.value);
                  writeNum(miscRevKey(name), pulled.doc.rev);
                  emit(localKey);
                }
              }
            }
          }
        } else {
          // Tirer la version serveur si plus récente
          var got = await apiFetch('/misc?name=' + name, { method: 'GET' });
          if (got && got.doc && typeof got.doc.rev === 'number' && got.doc.rev > readNum(miscRevKey(name))) {
            write(localKey, got.doc.value);
            writeNum(miscRevKey(name), got.doc.rev);
            emit(localKey);
          }
        }
      } catch (e) { /* hors-ligne : on réessaiera */ }
    }
  }

  function syncNow() {
    if (!remoteEnabled) return Promise.resolve(online);
    if (cyclePlanned) return syncChain;
    cyclePlanned = true;
    syncChain = syncChain.then(function () {
      cyclePlanned = false;
      return doSync();
    }).catch(function () {
      cyclePlanned = false;
      return online;
    });
    return syncChain;
  }
  async function doSync() {
    let pushFailed = false;
    try {
      try {
        await flushPending();
        authError = false;
      } catch (e) {
        pushFailed = true;
        if (e && (e.status === 401 || e.status === 403)) {
          authError = true;
          // Clé admin invalide/absente sur CET appareil : il ne peut de toute façon
          // pas écrire la flotte. On lève immédiatement le drapeau local plutôt que
          // d'attendre son expiration, afin que le pull juste après adopte sans délai
          // la version serveur (ex. mobile après une restauration de la base par
          // l'administrateur depuis un autre appareil).
          if (localStorage.getItem(KEY_PEND_F)) {
            try { localStorage.removeItem(KEY_PEND_F); } catch (x) {}
          }
        }
      }
      await pullState();
      try { await syncMisc(); } catch (e) {}
      // Si le pull vient de demander un seed (serveur vide), on l'envoie tout de suite
      if (!pushFailed && localStorage.getItem(KEY_PEND_F)) {
        try { await flushPending(); }
        catch (e) {
          if (e && (e.status === 401 || e.status === 403)) {
            authError = true;
            try { localStorage.removeItem(KEY_PEND_F); } catch (x) {}
          }
        }
      }
      setOnline(true);
    } catch (e) {
      setOnline(false);
    } finally {
      updateBadge();
    }
    return online;
  }

  function queueResAdd(res)        { const q = readJSON(KEY_PEND_RA, []); q.push(res); write(KEY_PEND_RA, q); }
  function queueResUpdate(id, patch) {
    const q = readJSON(KEY_PEND_RU, []);
    const existing = q.find(function (u) { return u.id === id; });
    if (existing) Object.assign(existing.patch, patch); else q.push({ id: id, patch: patch });
    write(KEY_PEND_RU, q);
  }
  function markFleetDirty() { try { localStorage.setItem(KEY_PEND_F, String(Date.now())); } catch (e) {} }

  /* ---------- Indicateur de synchronisation (administration uniquement) ---------- */
  function setOnline(v) {
    if (online === v) { updateBadge(); return; }
    online = v;
    updateBadge();
  }
  function syncStatus() { return remoteEnabled ? (online ? 'online' : 'offline') : 'local'; }
  function updateBadge() {
    const b = (typeof document !== 'undefined') && document.getElementById('asl-sync-badge');
    if (!b) return;
    const st = syncStatus();
    const msg = authError ? 'Clé admin invalide — vérifiez ADMIN_KEY (data.js & Cloudflare)'
      : st === 'online' ? 'Synchronisé (serveur)'
      : st === 'offline' ? 'Hors ligne — données locales, renvoi auto'
      : 'Mode local';
    const c2 = authError ? '#ef4444' : (st === 'online' ? '#22c55e' : st === 'offline' ? '#f59e0b' : '#9a9a9a');
    const dot2 = '<span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:' + c2 + ';"></span>';
    b.innerHTML = dot2 + ' ' + msg;
  }
  function mountBadge() {
    if (typeof document === 'undefined' || !document.body) return;
    // Visible uniquement dans l'administration
    if (!/\/admin\//.test(location.pathname) && !/admin\/index/.test(location.pathname)) return;
    if (document.getElementById('asl-sync-badge')) return;
    const b = document.createElement('div');
    b.id = 'asl-sync-badge';
    b.style.cssText = 'position:fixed;left:14px;bottom:14px;z-index:9999;display:flex;align-items:center;gap:7px;' +
      'background:rgba(20,20,20,0.92);border:1px solid rgba(255,255,255,0.12);color:rgba(255,255,255,0.8);' +
      'font:600 11px/1 Outfit,sans-serif;padding:8px 12px;border-radius:99px;pointer-events:none;';
    document.body.appendChild(b);
    updateBadge();
  }

  /* ---------- Téléversement d'images (administration) ----------
     Redimensionne et compresse l'image dans le navigateur (max 1280 px,
     JPEG ~82%) puis l'envoie à l'API. Retourne l'URL à enregistrer dans
     le champ img du véhicule (ex: /api/img/dacia-duster-a1b2c3.jpg). */
  function downscaleImage(file, maxW, quality) {
    return new Promise(function (resolve) {
      try {
        if (typeof document === 'undefined' || !file.type || file.type.indexOf('image/') !== 0) return resolve(file);
        const url = URL.createObjectURL(file);
        const img = new Image();
        img.onload = function () {
          try {
            const scale = Math.min(1, maxW / img.naturalWidth);
            const w = Math.max(1, Math.round(img.naturalWidth * scale));
            const h = Math.max(1, Math.round(img.naturalHeight * scale));
            const canvas = document.createElement('canvas');
            canvas.width = w; canvas.height = h;
            canvas.getContext('2d').drawImage(img, 0, 0, w, h);
            URL.revokeObjectURL(url);
            canvas.toBlob(function (blob) { resolve(blob || file); }, 'image/jpeg', quality);
          } catch (e) { resolve(file); }
        };
        img.onerror = function () { URL.revokeObjectURL(url); resolve(file); };
        img.src = url;
      } catch (e) { resolve(file); }
    });
  }
  function blobToBase64(blob) {
    return new Promise(function (resolve, reject) {
      const r = new FileReader();
      r.onload = function () { resolve(String(r.result).split(',')[1] || ''); };
      r.onerror = function () { reject(new Error('Lecture du fichier impossible')); };
      r.readAsDataURL(blob);
    });
  }
  async function uploadImage(file) {
    if (!remoteEnabled) throw new Error("Téléversement indisponible en mode local : déployez le site sur Cloudflare Pages (ou utilisez le champ URL).");
    const blob = await downscaleImage(file, 1600, 0.92);
    const data = await blobToBase64(blob);
    const out = await apiFetch('/upload', {
      method: 'POST',
      headers: headers(true),
      body: JSON.stringify({ name: file.name || 'photo', type: blob.type || file.type || 'image/jpeg', data: data }),
    });
    return out.url;
  }

  /* ============================================================
     API PUBLIQUE (inchangée — lectures synchrones sur le cache,
     écritures locales immédiates + envoi serveur en arrière-plan)
     ============================================================ */

  /* ---------- API Flotte ---------- */
  function getFleet() { return read(KEY_FLEET, DEFAULT_FLEET.slice()); }
  function saveFleet(fleet) {
    const ok = write(KEY_FLEET, fleet);
    markFleetDirty(); syncNow();
    return ok;
  }

  function addVehicle(v) {
    const fleet = getFleet();
    v.id = Date.now(); // identifiant unique, jamais réutilisé après suppression
    fleet.push(v);
    saveFleet(fleet);
    return v;
  }

  function updateVehicle(id, patch) {
    const fleet = getFleet();
    const car = fleet.find(function (c) { return c.id === id; });
    if (!car) return null;
    Object.assign(car, patch);
    saveFleet(fleet);
    return car;
  }

  function deleteVehicle(id) {
    const fleet = getFleet().filter(function (c) { return c.id !== id; });
    return saveFleet(fleet);
  }

  /* ---------- API Réservations ---------- */
  function getReservations() {
    // Les plus récentes en premier
    return read(KEY_RES, []).sort(function (a, b) { return (b.createdAt || '').localeCompare(a.createdAt || ''); });
  }
  function saveReservations(list) { return write(KEY_RES, list); }

  /* ============================================================
     MOTEUR CENTRAL DE DISPONIBILITÉ & CONFLITS
     Source unique utilisée par le site ET le back-office pour
     garantir qu'un véhicule n'est jamais attribué à deux clients
     sur une période incompatible.
     ============================================================ */

  /* Marge de sécurité (heures) après le retour prévu : contrôle +
     préparation du véhicule + absorption d'un éventuel retard. */
  const AVAIL_MARGIN_H = 3;

  /* Convertit date ISO (YYYY-MM-DD) + heure (HH:MM) en objet Date.
     Heure par défaut 12:00 si absente. */
  function _toDateTime(dateISO, timeStr, defTime) {
    if (!dateISO) return null;
    var d = String(dateISO).slice(0, 10);
    var tm = (timeStr && /^\d{1,2}:\d{2}$/.test(timeStr)) ? timeStr : (defTime || '12:00');
    var p = tm.split(':');
    var dt = new Date(d + 'T00:00:00');
    dt.setHours(parseInt(p[0] || '12', 10), parseInt(p[1] || '0', 10), 0, 0);
    return dt;
  }

  /* Fin d'occupation réelle d'une réservation = retour prévu + marge. */
  function _occupiedUntil(r) {
    var end = _toDateTime(r.endDate, r.endTime, '12:00');
    if (!end) return null;
    var withMargin = new Date(end.getTime());
    withMargin.setHours(withMargin.getHours() + AVAIL_MARGIN_H);
    return { end: end, withMargin: withMargin };
  }

  /* Deux intervalles datetime se chevauchent-ils ? */
  function _dtOverlap(aStart, aEnd, bStart, bEnd) {
    return aStart < bEnd && bStart < aEnd;
  }

  /* Réservations actives (confirmées/en cours/en attente) pour un véhicule donné. */
  function _resForCar(car) {
    var unitIds = (car && car.unitIds) || [car && car.id];
    var name = car && car.name;
    return read(KEY_RES, []).filter(function (r) {
      if (!r.startDate || !r.endDate) return false;
      if (r.status === 'cancelled' || r.status === 'completed') return false;
      return (r.car === name) || (unitIds.indexOf(r.carId) >= 0);
    });
  }

  /* ★ FONCTION CENTRALE : vérifie la disponibilité d'un véhicule
     pour une période donnée, en tenant compte des réservations
     existantes, locations en cours, retours prévus et marge.

     Paramètres : car, startISO, endISO, startTime, endTime,
                  opts = { excludeId } pour ignorer une résa (édition).
     Retour : {
       available: bool,
       conflicts: [résa en conflit direct],
       tightReturns: [résa qui revient juste avant, dans la marge],
       nextFrom: Date|null  (prochaine dispo si indisponible)
     }
  */
  function checkAvailability(car, startISO, endISO, startTime, endTime, opts) {
    opts = opts || {};
    var out = { available: true, conflicts: [], tightReturns: [], nextFrom: null };
    if (!car || !startISO || !endISO) return out;

    var reqStart = _toDateTime(startISO, startTime, '10:00');
    var reqEnd = _toDateTime(endISO, endTime, '10:00');
    if (!reqStart || !reqEnd) return out;

    // ★ Nombre d'unités RÉELLEMENT louables. Si le véhicule possède des unités
    //   détaillées, on s'appuie dessus (une unité en maintenance / hors service /
    //   LLD ne compte pas dans le stock disponible). Sinon, repli sur car.stock.
    //   Le système « raisonne sur le nombre d'unités disponibles » : tant qu'il
    //   reste au moins une unité libre sur la période, le véhicule reste réservable.
    var stock;
    if (Array.isArray(car.units) && car.units.length) {
      stock = car.units.filter(function (u) {
        var s = (u && u.status) || 'available';
        return s !== 'maintenance' && s !== 'offroad' && s !== 'lld';
      }).length;
    } else {
      stock = Math.max(1, car.stock || (car.unitIds ? car.unitIds.length : 1) || 1);
    }
    var list = _resForCar(car).filter(function (r) { return r.id !== opts.excludeId; });

    var overlapCount = 0;
    list.forEach(function (r) {
      var occ = _occupiedUntil(r);
      if (!occ) return;
      var rStart = _toDateTime(r.startDate, r.startTime, '10:00');

      /* Conflit DUR : la période demandée chevauche la réservation
         elle-même (sans compter la marge). */
      if (_dtOverlap(reqStart, reqEnd, rStart, occ.end)) {
        overlapCount++;
        out.conflicts.push(r);
        return;
      }
      /* Conflit SOUPLE : la nouvelle réservation démarre APRÈS le
         retour prévu mais dans la fenêtre de marge (≤ marge) → le
         véhicule doit revenir juste avant. Alerte informative
         (anticipation d'un éventuel retard). */
      if (reqStart >= occ.end && reqStart <= occ.withMargin) {
        out.tightReturns.push({
          res: r,
          returnAt: occ.end,
          safeFrom: occ.withMargin
        });
      }
    });

    if (overlapCount >= stock) {
      out.available = false;
      /* Calcule la prochaine disponibilité (retour le plus tardif + marge) */
      var latest = null;
      out.conflicts.forEach(function (r) {
        var occ = _occupiedUntil(r);
        if (occ && (!latest || occ.withMargin > latest)) latest = occ.withMargin;
      });
      out.nextFrom = latest;
    }
    return out;
  }

  /* Vérifie un conflit AVANT d'enregistrer une réservation (manuelle
     ou site). Renvoie le même objet que checkAvailability. */
  function checkReservationConflict(resObj, opts) {
    var fleet = read(KEY_FLEET, []);
    var car = fleet.find(function (c) {
      return c.id === resObj.carId || c.name === resObj.car;
    });
    if (!car) return { available: true, conflicts: [], tightReturns: [], nextFrom: null };
    return checkAvailability(
      car, resObj.startDate, resObj.endDate,
      resObj.startTime, resObj.endTime, opts
    );
  }

  function addReservation(res) {
    const list = read(KEY_RES, []);
    if (!res.id) res.id = 'ASL' + Date.now().toString().slice(-6);
    if (!res.createdAt) res.createdAt = new Date().toISOString();
    list.push(res);
    saveReservations(list);
    queueResAdd(res); syncNow();
    return res;
  }

  function updateReservation(id, patch) {
    const list = read(KEY_RES, []);
    const r = list.find(function (x) { return x.id === id; });
    if (!r) return null;
    Object.assign(r, patch);
    saveReservations(list);
    queueResUpdate(id, patch); syncNow();
    return r;
  }

  /* ============================================================
     CLÔTURE DE PÉRIODE AVEC ARCHIVAGE
     Déplace toutes les données opérationnelles vers les archives
     (consultables), vide les compteurs actifs, et préserve les
     éléments permanents (véhicules, tarifs, paramètres, FAQ, blog,
     marketing, entretien). Tout reste restaurable.
     ============================================================ */
  const KEY_ARCHIVES = 'asl_archives_v1';   // liste des clôtures
  const KEY_CHARGES  = 'asl_charges_v1';     // charges (module Caisse)

  function getArchives() { return readJSON(KEY_ARCHIVES, []) || []; }

  function closePeriod(label) {
    const now = new Date();
    const reservations = read(KEY_RES, []);
    let charges = [];
    try { charges = JSON.parse(localStorage.getItem(KEY_CHARGES) || '[]'); } catch (e) { charges = []; }

    // Snapshot complet de la période en cours
    const snapshot = {
      id: 'ARCH' + Date.now(),
      label: label || ('Période clôturée le ' + now.toLocaleDateString('fr-FR')),
      closedAt: now.toISOString(),
      reservations: reservations,     // toutes les réservations/locations/paiements
      charges: charges,               // toutes les charges
      stats: {
        totalReservations: reservations.length,
        encaisse: reservations.reduce(function (s, r) { return s + (Number(r.paid) || 0); }, 0),
        charges: charges.reduce(function (s, c) { return c.status === 'pending' ? s : s + (Number(c.amount) || 0); }, 0)
      }
    };

    // Enregistrer dans les archives
    const archives = getArchives();
    archives.unshift(snapshot);
    try { localStorage.setItem(KEY_ARCHIVES, JSON.stringify(archives)); } catch (e) {}
    // Synchroniser les archives vers le serveur (tous appareils)
    noteLocalChange(KEY_ARCHIVES);

    // Vider les données opérationnelles actives
    saveReservations([]);                       // réservations / locations / paiements → 0
    try { localStorage.setItem(KEY_CHARGES, '[]'); } catch (e) {}  // charges → 0
    // Synchroniser les charges vidées vers le serveur
    noteLocalChange(KEY_CHARGES);
    // ★ Purge immédiate, sur CET appareil, de toute écriture de réservation
    //   encore en attente d'envoi (ajout/mise à jour) : une réinitialisation
    //   doit annuler tout ce qui concerne la période qu'on vient de clôturer,
    //   sinon cette file pourrait renvoyer d'anciennes données au serveur
    //   juste après l'avoir vidé.
    try { localStorage.removeItem(KEY_PEND_RA); } catch (e) {}
    try { localStorage.removeItem(KEY_PEND_RU); } catch (e) {}

    // Tous les véhicules redeviennent disponibles (élément permanent, jamais supprimé).
    // ★ On libère AUSSI chaque unité du stock : sans cela, une unité restée
    //   'reserved'/'active' après la clôture continuait d'être comptée comme
    //   occupée → un modèle « Stock 2 » n'affichait qu'1 unité disponible.
    //   On préserve volontairement les unités mises en maintenance / hors
    //   service / location longue durée par l'administration.
    const fleet = read(KEY_FLEET, []);
    fleet.forEach(function (c) {
      if (Array.isArray(c.units)) {
        c.units.forEach(function (u) {
          if (!u) return;
          var s = u.status || 'available';
          if (s !== 'maintenance' && s !== 'offroad' && s !== 'lld') u.status = 'available';
        });
      }
      if (c.status === 'rented' || c.status === 'active' || c.status === 'reserved') c.status = 'available';
    });
    write(KEY_FLEET, fleet);

    // ★ PROPAGATION GLOBALE : pousser l'état vidé au serveur pour que TOUS les
    //   appareils (mobiles, autres salariés, site client) voient la
    //   réinitialisation. Sans cela, le serveur gardait les anciennes
    //   réservations et les renvoyait au prochain pull (mobile non réinitialisé).
    markFleetDirty();                 // force le push de la flotte (unités remises à dispo)
    // ★ CORRECTIF : on pose D'ABORD le marqueur persistant (avant même la
    //   tentative réseau). Si l'onglet se ferme ou si l'appel échoue, la
    //   demande de vidage n'est PAS perdue : elle sera automatiquement
    //   retentée à chaque cycle de synchro par pushReservationsReset(),
    //   exactement comme la flotte (KEY_PEND_F) et les données "misc".
    try { localStorage.setItem(KEY_PEND_RESET, String(Date.now())); } catch (e) {}
    pushReservationsReset(); // tentative immédiate (best-effort, non bloquante)

    emit(KEY_RES); emit(KEY_FLEET); syncNow();
    return snapshot;
  }

  /* ★ CORRECTIF — Pousse (ou repousse) au serveur le vidage complet des
     réservations tant que KEY_PEND_RESET est présent. Appelée immédiatement
     après une clôture de période, ET à chaque cycle de synchro (doSync) tant
     que le serveur n'a pas confirmé — contrairement à l'ancien code qui ne
     tentait l'opération qu'une seule fois et avalait silencieusement l'échec. */
  async function pushReservationsReset() {
    if (!remoteEnabled) return;
    if (!localStorage.getItem(KEY_PEND_RESET)) return;
    try {
      const out = await apiFetch('/reservations', {
        method: 'POST', headers: headers(true),
        body: JSON.stringify({ action: 'replace', items: [] })
      });
      if (out && out.rev) writeNum(KEY_REV_R, out.rev);
      if (out && out.resetAt) writeNum(KEY_RESET_SEEN, out.resetAt);
      try { localStorage.removeItem(KEY_PEND_RESET); } catch (e) {}
      authError = false;
      updateBadge();
    } catch (e) {
      // Échec (auth, réseau, KV momentanément indisponible...) : le marqueur
      // KEY_PEND_RESET reste posé, il sera retenté au prochain cycle. Si la
      // cause est une clé admin invalide, on le signale immédiatement via le
      // badge de synchro existant (au lieu d'avaler l'erreur en silence).
      if (e && (e.status === 401 || e.status === 403)) {
        authError = true;
        updateBadge();
      }
    }
  }

  /* Restaure une période archivée : réinjecte ses réservations et charges
     dans les données actives (fusion, sans doublon par id).
     ★ MULTI-APPAREILS : pousse immédiatement vers le serveur pour que
       mobile et autres appareils reçoivent la restauration au prochain poll. */
  async function restoreArchive(archiveId) {
    const archives = getArchives();
    const arch = archives.find(function (a) { return a.id === archiveId; });
    if (!arch) return false;

    // Réservations : fusion sans doublon
    const current = read(KEY_RES, []);
    const ids = current.map(function (r) { return r.id; });
    (arch.reservations || []).forEach(function (r) {
      if (ids.indexOf(r.id) < 0) current.push(r);
    });
    saveReservations(current);

    // ★ PUSH immédiat et ATTENDU des réservations restaurées vers le serveur.
    // On attend la réponse avant d'appeler syncNow() pour éviter que pullState()
    // ne parte avant que le serveur ait le bon rev et n'écrase la restauration.
    if (remoteEnabled) {
      try {
        const out = await apiFetch('/reservations', {
          method: 'POST', headers: headers(true),
          body: JSON.stringify({ action: 'replace', items: current })
        });
        if (out && out.rev) writeNum(KEY_REV_R, out.rev);
      } catch (e) { /* hors-ligne : le pull suivant sera cohérent */ }
    }

    // Charges : fusion sans doublon
    let charges = [];
    try { charges = JSON.parse(localStorage.getItem(KEY_CHARGES) || '[]'); } catch (e) { charges = []; }
    const cIds = charges.map(function (c) { return c.id; });
    (arch.charges || []).forEach(function (c) {
      if (cIds.indexOf(c.id) < 0) charges.push(c);
    });
    try { localStorage.setItem(KEY_CHARGES, JSON.stringify(charges)); } catch (e) {}
    // ★ Synchroniser les charges restaurées vers le serveur → tous appareils (mobile compris)
    noteLocalChange(KEY_CHARGES);

    emit(KEY_RES); syncNow();
    return true;
  }

  function deleteArchive(archiveId) {
    const archives = getArchives().filter(function (a) { return a.id !== archiveId; });
    try { localStorage.setItem(KEY_ARCHIVES, JSON.stringify(archives)); } catch (e) {}
    return true;
  }

  /* ============================================================
     ★ REFONTE — SAUVEGARDE COMPLÈTE / RESTAURATION EXACTE / RESET TEST
     ------------------------------------------------------------
     Trois opérations clairement séparées, qui ne se substituent PAS à
     closePeriod()/restoreArchive() (clôture métier récurrente / réintégration
     d'une période archivée dans l'actif) mais couvrent des besoins différents :

     1. exportFullBackup()  : instantané EXHAUSTIF de tout l'état KV serveur
        (flotte, réservations, employés, marketing/FAQ/blog, sous-locations,
        charges, entretien, documents, LLD, fonctionnalités custom, archives).
     2. restoreFullBackup() : REMPLACE intégralement chaque document par celui
        de la sauvegarde fournie (jamais de fusion), puis purge la totalité
        du cache local de CET appareil avant de retirer l'état serveur — afin
        qu'aucune donnée locale précédente ne puisse se mélanger au résultat.
     3. resetTestData()     : vide UNIQUEMENT les données opérationnelles de
        test (réservations, charges/paiements) — jamais la flotte, les
        tarifs, les employés ni la configuration — après avoir pris une
        sauvegarde complète automatique (filet de sécurité téléchargeable).
        Contrairement à closePeriod(), n'archive pas commercialement (pas de
        nom de période, n'entre pas dans la liste des archives métier).
     ============================================================ */

  /* ---------- 1. Sauvegarde complète (export) ---------- */
  async function exportFullBackup() {
    if (!remoteEnabled) throw new Error('Synchronisation serveur désactivée (mode local) — sauvegarde impossible.');
    const out = await apiFetch('/backup/export', { method: 'GET', headers: headers(true) });
    if (!out || !out.backup) throw new Error('Réponse serveur invalide.');
    return out.backup; // { version, exportedAt, data: { top:{...}, misc:{...} } }
  }

  /* ---------- Purge totale du cache local (appelée après restauration) ---------- */
  function hardResetLocalCache() {
    const keys = [
      KEY_FLEET, KEY_RES, KEY_REV_F, KEY_REV_R,
      KEY_PEND_F, KEY_PEND_RA, KEY_PEND_RU, KEY_PEND_RESET, KEY_RESET_SEEN,
      KEY_CHARGES, KEY_ARCHIVES
    ];
    keys.forEach(function (k) { try { localStorage.removeItem(k); } catch (e) {} });
    Object.keys(MISC_MAP).forEach(function (name) {
      try { localStorage.removeItem(MISC_MAP[name]); } catch (e) {}
      try { localStorage.removeItem(miscDirtyKey(name)); } catch (e) {}
      try { localStorage.removeItem(miscRevKey(name)); } catch (e) {}
    });
  }

  /* ---------- 2. Restauration EXACTE (remplace, jamais de fusion) ---------- */
  async function restoreFullBackup(backup) {
    if (!remoteEnabled) throw new Error('Synchronisation serveur désactivée (mode local) — restauration impossible.');
    if (!backup || !backup.data) throw new Error('Fichier de sauvegarde invalide.');
    const out = await apiFetch('/backup/restore', {
      method: 'POST', headers: headers(true),
      body: JSON.stringify({ backup: backup })
    });
    // ★ Purge locale AVANT tout nouveau tirage serveur : cet appareil ne doit
    //   garder AUCUNE trace (cache, file d'attente, marqueurs de rev) de son
    //   état précédent, pour bannir tout mélange avec les données restaurées.
    hardResetLocalCache();
    await pullState();
    try { await syncMisc(); } catch (e) {}
    emit(KEY_FLEET); emit(KEY_RES);
    return out; // { ok, result: { applied, errors, appliedAt } }
  }

  /* ---------- 3. Réinitialisation des données de TEST uniquement ----------
     Vide reservations + charges (donc tous les compteurs qui en dérivent :
     loués, en retard, impayés, caisse), remet la flotte disponible — sans
     jamais toucher aux tarifs, aux employés ni à la configuration du site.
     Prend automatiquement une sauvegarde complète juste avant, en filet de
     sécurité (retournée à l'appelant pour proposer le téléchargement). */
  async function resetTestData() {
    let safetyBackup = null;
    try { safetyBackup = await exportFullBackup(); } catch (e) { /* hors-ligne : on continue quand même */ }

    saveReservations([]);
    try { localStorage.setItem(KEY_CHARGES, '[]'); } catch (e) {}
    noteLocalChange(KEY_CHARGES);
    try { localStorage.removeItem(KEY_PEND_RA); } catch (e) {}
    try { localStorage.removeItem(KEY_PEND_RU); } catch (e) {}

    // Flotte : redevient disponible (jamais supprimée) — même logique que closePeriod().
    const fleet = read(KEY_FLEET, []);
    fleet.forEach(function (c) {
      if (Array.isArray(c.units)) {
        c.units.forEach(function (u) {
          if (!u) return;
          const s = u.status || 'available';
          if (s !== 'maintenance' && s !== 'offroad' && s !== 'lld') u.status = 'available';
        });
      }
      if (c.status === 'rented' || c.status === 'active' || c.status === 'reserved') c.status = 'available';
    });
    write(KEY_FLEET, fleet);
    markFleetDirty();

    // Vidage des réservations, propagé et retenté jusqu'à confirmation serveur
    // (même mécanisme robuste que closePeriod — voir pushReservationsReset).
    try { localStorage.setItem(KEY_PEND_RESET, String(Date.now())); } catch (e) {}
    pushReservationsReset();

    emit(KEY_RES); emit(KEY_FLEET); syncNow();
    return { safetyBackup: safetyBackup };
  }

  /* ---------- Démarrage ---------- */
  init();

  if (remoteEnabled && typeof window !== 'undefined') {
    // Première synchro immédiate, puis vérification périodique + au retour sur l'onglet
    syncNow();
    setInterval(syncNow, POLL_MS);
    window.addEventListener('focus', syncNow);
    document.addEventListener('visibilitychange', function () { if (!document.hidden) syncNow(); });
    window.addEventListener('online', syncNow);
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', mountBadge);
    else mountBadge();
  } else if (typeof window !== 'undefined') {
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', mountBadge);
    else mountBadge();
  }

  /* ---------- Gestion des unités de stock ----------
     Chaque modèle (1 fiche) possède N unités physiques.
     unit = { plate, color, status }  (status: available|reserved|active|maintenance|offroad)
     Rétrocompatible : si pas de units[], on les dérive de plate + stock. */
  function normalizeUnits(car) {
    if (!car) return [];
    var stock = Math.max(1, parseInt(car.stock) || (Array.isArray(car.units) ? car.units.length : 1) || 1);
    var units = Array.isArray(car.units) ? car.units.slice() : [];
    // Compléter ou tronquer pour coller au stock
    if (units.length < stock) {
      for (var i = units.length; i < stock; i++) {
        units.push({
          plate: (i === 0 && car.plate) ? car.plate : '',
          color: '',
          status: (i === 0 && car.status) ? car.status : 'available'
        });
      }
    } else if (units.length > stock) {
      units = units.slice(0, stock);
    }
    return units;
  }

  // Renvoie l'état "agrégé" d'un modèle à partir de ses unités
  function modelAvailability(car) {
    var units = normalizeUnits(car);
    var availableCount = units.filter(function (u) { return (u.status || 'available') === 'available'; }).length;
    return {
      total: units.length,
      available: availableCount,
      isAvailable: availableCount > 0
    };
  }

  // Attribue automatiquement une unité disponible (lors d'une confirmation de réservation).
  // Renvoie l'unité attribuée {plate,color,index} ou null si plus rien de dispo.
  function assignUnit(carId, newStatus) {
    var fleet = getFleet();
    var car = fleet.find(function (c) { return c.id === carId; });
    if (!car) return null;
    car.units = normalizeUnits(car);
    var idx = car.units.findIndex(function (u) { return (u.status || 'available') === 'available'; });
    if (idx === -1) return null;
    car.units[idx].status = newStatus || 'reserved';
    // Statut agrégé de la fiche
    car.status = modelAvailability(car).isAvailable ? 'available' : 'reserved';
    saveFleet(fleet);
    return { plate: car.units[idx].plate, color: car.units[idx].color, index: idx };
  }

  // Libère une unité (retour véhicule) en la repassant disponible.
  function releaseUnit(carId, plate) {
    var fleet = getFleet();
    var car = fleet.find(function (c) { return c.id === carId; });
    if (!car) return null;
    car.units = normalizeUnits(car);
    var idx = plate
      ? car.units.findIndex(function (u) { return u.plate === plate && (u.status || '') !== 'available'; })
      : car.units.findIndex(function (u) { return (u.status || '') !== 'available'; });
    if (idx === -1) return null;
    car.units[idx].status = 'available';
    car.status = modelAvailability(car).isAvailable ? 'available' : car.status;
    saveFleet(fleet);
    return car.units[idx];
  }

  // Met le statut d'une unité précise identifiée par sa plaque.
  function setUnitStatusByPlate(carId, plate, newStatus) {
    var fleet = getFleet();
    var car = fleet.find(function (c) { return c.id === carId; });
    if (!car) return null;
    car.units = normalizeUnits(car);
    var idx = car.units.findIndex(function (u) { return u.plate === plate; });
    if (idx === -1) {
      // pas trouvée : on prend la première disponible
      idx = car.units.findIndex(function (u) { return (u.status || 'available') === 'available'; });
    }
    if (idx === -1) return null;
    car.units[idx].status = newStatus || 'active';
    car.status = modelAvailability(car).isAvailable ? 'available' : 'reserved';
    saveFleet(fleet);
    return car.units[idx];
  }

  /* ============================================================
     TARIFS — SOURCE UNIQUE DE VÉRITÉ DU PRIX/JOUR
     Priorité : tarif saisonnier (mois + durée) → tranche par durée
     → prix standard du véhicule. N'altère JAMAIS l'existant : si
     aucune règle saisonnière ne correspond, on retombe exactement
     sur l'ancien comportement (tranches par durée puis prix de base).
     ============================================================ */

  // Normalise les tranches "par durée" existantes (tableau ou ancien format objet {t1..t5}).
  function normalizeDurationTiers(raw) {
    if (!raw) return [];
    if (Array.isArray(raw)) {
      return raw
        .filter(function (b) { return b && Number(b.price) > 0; })
        .map(function (b) {
          return { min: Number(b.min) || 1, max: (Number(b.max) > 0 ? Number(b.max) : 9999), price: Number(b.price) || 0 };
        });
    }
    var MAP = [[1, 3, 't1'], [4, 7, 't2'], [8, 14, 't3'], [15, 20, 't4'], [21, 9999, 't5']];
    return MAP.map(function (m) { return { min: m[0], max: m[1], price: Number(raw[m[2]] || 0) }; })
              .filter(function (b) { return b.price > 0; });
  }

  // Tranche par durée applicable (avec repli sur la dernière tranche dont min ≤ jours).
  function durationBracket(tiers, days) {
    var d = Math.max(1, days || 1);
    var sorted = tiers.slice().sort(function (a, b) { return a.min - b.min; });
    var best = null;
    for (var i = 0; i < sorted.length; i++) {
      var b = sorted[i];
      if (d >= b.min && d <= b.max) return b;
      if (d >= b.min) best = b;
    }
    return best;
  }

  // Normalise les tarifs saisonniers d'un véhicule.
  // règle = { month:1..12, minDays, maxDays, pricePerDay, active }
  function normalizeSeasonalTiers(raw) {
    if (!Array.isArray(raw)) return [];
    return raw
      .filter(function (r) { return r && Number(r.pricePerDay) > 0 && Number(r.month) >= 1 && Number(r.month) <= 12; })
      .map(function (r) {
        return {
          month: Number(r.month),
          minDays: Math.max(1, Number(r.minDays) || 1),
          maxDays: (Number(r.maxDays) > 0 ? Number(r.maxDays) : 9999),
          pricePerDay: Number(r.pricePerDay) || 0,
          active: r.active !== false
        };
      });
  }

  // Mois (1..12) d'une date ISO 'YYYY-MM-DD'. 0 si invalide/absente.
  function monthOfISO(iso) {
    if (!iso || typeof iso !== 'string' || iso.length < 7) return 0;
    var m = parseInt(iso.slice(5, 7), 10);
    return (m >= 1 && m <= 12) ? m : 0;
  }

  // Tarif saisonnier applicable pour (véhicule, durée, date de départ), sinon null.
  function seasonalRate(car, days, startISO) {
    var month = monthOfISO(startISO);
    if (!month) return null;
    var rules = normalizeSeasonalTiers(car && car.seasonalTiers);
    if (!rules.length) return null;
    var d = Math.max(1, days || 1);
    var matches = rules.filter(function (r) {
      return r.active && r.month === month && d >= r.minDays && d <= r.maxDays;
    });
    if (!matches.length) return null;
    // La tranche la plus spécifique (plus petit intervalle de jours) l'emporte.
    matches.sort(function (a, b) { return (a.maxDays - a.minDays) - (b.maxDays - b.minDays); });
    return matches[0].pricePerDay;
  }

  // Prix de base du véhicule (compatible côté client {price} ET admin {priceMAD}).
  function basePrice(car) {
    if (!car) return 0;
    return Number(car.price) || Number(car.priceMAD) || Math.round((Number(car.priceEUR) || 0) * RATE_MAD) || 0;
  }

  // ★ SOURCE UNIQUE : prix journalier applicable partout (site, back-office, prolongations).
  //   startISO facultatif : sans date, le tarif saisonnier est ignoré (repli durée/standard).
  function dailyRate(car, days, startISO) {
    if (!car) return 0;
    var s = seasonalRate(car, days, startISO);
    if (s != null) return s;
    var tiers = normalizeDurationTiers(car.tiers);
    if (tiers.length) {
      var b = durationBracket(tiers, days);
      if (b) return b.price;
    }
    return basePrice(car);
  }

  global.ASLDB = {
    RATE_MAD,
    getFleet, saveFleet, addVehicle, updateVehicle, deleteVehicle,
    getReservations, addReservation, updateReservation,
    closePeriod, getArchives, restoreArchive, deleteArchive,
    // ★ Sauvegarde complète / restauration exacte / reset des données de test
    exportFullBackup, restoreFullBackup, resetTestData,
    onChange,
    // Gestion des unités de stock (couleur + immatriculation par unité)
    normalizeUnits, modelAvailability, assignUnit, releaseUnit, setUnitStatusByPlate,
    // Nouveaux utilitaires de synchronisation et d'images
    syncNow, syncStatus, uploadImage, noteLocalChange,
    // ★ Tarification (source unique) : saison → durée → standard
    dailyRate, seasonalRate, normalizeSeasonalTiers, normalizeDurationTiers, monthOfISO,
    // ★ Moteur central de disponibilité & conflits (site + back-office)
    checkAvailability, checkReservationConflict, AVAIL_MARGIN_H,
  };
})(window);
