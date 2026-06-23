/* ============================================================
   ALL STAR LOC — GESTION DES UTILISATEURS & PERMISSIONS
   L'administrateur principal crée des accès employés, définit
   identifiant + mot de passe, et coche les sections autorisées.
   Les employés ne voient que leurs menus ; l'accès direct à une
   section non autorisée est bloqué ("Accès non autorisé").
   Stockage : asl_users_v1 (synchronisé via le même mécanisme).
   ============================================================ */
(function () {
  'use strict';

  var USERS_KEY = 'asl_users_v1';
  var SESSION_KEY = 'asl_admin_session';

  /* Sections gérables (clé interne → libellé + à quel menu/page elle
     correspond). La clé "perm" est ce qui est stocké dans user.perms. */
  var SECTIONS = [
    { perm: 'dashboard',    label: 'Tableau de bord',   page: 'dashboard' },
    { perm: 'fleet',        label: 'Véhicules',         page: 'fleet' },
    { perm: 'reservations', label: 'Réservations',      page: 'reservations' },
    { perm: 'rentals',      label: 'Locations',         page: 'rentals' },
    { perm: 'customers',    label: 'Clients',           page: 'customers' },
    { perm: 'sublease',     label: 'Sous-location',     page: 'sublease' },
    { perm: 'payments',     label: 'Paiements',         page: 'payments' },
    { perm: 'unpaid',       label: 'Impayés',           page: null },        // via dashboard/paiements
    { perm: 'caisse',       label: 'Caisse',            page: 'caisse' },
    { perm: 'charges',      label: 'Charges',           page: null },        // sous-onglet Caisse
    { perm: 'reports',      label: 'Rapports',          page: null },        // sous-onglet Caisse
    { perm: 'maintenance',  label: 'Entretiens',        page: 'maintenance' },
    { perm: 'archives',     label: 'Archives',          page: null },        // dans Paramètres
    { perm: 'marketing',    label: 'Marketing Digital', page: 'marketing' },
    { perm: 'blog',         label: 'Blog',              page: null },        // dans Marketing
    { perm: 'faq',          label: 'FAQ',               page: null },        // dans Marketing
    { perm: 'legal',        label: 'Pages légales',     page: null },        // dans Marketing
    { perm: 'reviews',      label: 'Avis clients',      page: null },        // dans Marketing
    { perm: 'settings',     label: 'Paramètres',        page: 'settings' }
  ];

  /* Correspondance page (showPage id) → permission requise. */
  var PAGE_PERM = {
    dashboard: 'dashboard', fleet: 'fleet', maintenance: 'maintenance',
    reservations: 'reservations', rentals: 'rentals', customers: 'customers',
    sublease: 'sublease',
    payments: 'payments', caisse: 'caisse', settings: 'settings',
    options: 'fleet', bookopt: 'fleet'   // assurances/options rattachées aux véhicules
  };

  function rd(key, def) {
    try { var v = JSON.parse(localStorage.getItem(key)); return v == null ? def : v; } catch (e) { return def; }
  }
  function wr(key, val) {
    try { localStorage.setItem(key, JSON.stringify(val)); } catch (e) {}
  }

  function getUsers() { return rd(USERS_KEY, []); }
  function saveUsers(list) { wr(USERS_KEY, list); }

  /* ---- Synchronisation serveur (KV) — comptes employés multi-appareils ----
     Le cache local sert l'affichage immédiat ; le KV est la source partagée.
     Toutes les écritures sont aussi poussées vers /api/users (clé admin). */
  function adminKey() { try { return localStorage.getItem('asl_admin_key') || ''; } catch (e) { return ''; } }
  function usersApi(method, body) {
    return fetch('/api/users', {
      method: method,
      headers: { 'Content-Type': 'application/json', 'X-ASL-Key': adminKey() },
      cache: 'no-store',
      body: body ? JSON.stringify(body) : undefined
    }).then(function (r) {
      return r.json().then(function (d) {
        if (!r.ok || !d || d.ok === false) throw new Error((d && d.error) || ('HTTP ' + r.status));
        return d;
      });
    });
  }
  /* Pousse une action (add | update | remove | replace) vers le serveur.
     Silencieux : en cas d'absence de réseau, le cache local reste valable
     et sera renvoyé au prochain pullUsers/replace. */
  function pushUser(action, payload) {
    try { usersApi('POST', Object.assign({ action: action }, payload || {})).catch(function () {}); } catch (e) {}
  }
  /* Récupère la liste serveur et met à jour le cache local.
     - migre les comptes locaux vers le KV si le serveur est encore vide ;
     - conserve les empreintes locales (le GET serveur ne les renvoie pas). */
  function pullUsers() {
    try {
      usersApi('GET').then(function (d) {
        if (!d || !Array.isArray(d.users)) return;
        var local = getUsers();
        if (d.users.length === 0 && local.length > 0) { pushUser('replace', { items: local }); return; }
        var byId = {}; local.forEach(function (u) { byId[u.id] = u; });
        var merged = d.users.map(function (su) {
          var lu = byId[su.id];
          if (lu && lu.passHash && !su.passHash) return Object.assign({}, su, { passHash: lu.passHash });
          return su;
        });
        wr(USERS_KEY, merged);
        if (typeof window.renderUsers === 'function') { try { window.renderUsers(); } catch (e) {} }
      }).catch(function () {});
    } catch (e) {}
  }

  function getSession() {
    try { return JSON.parse(localStorage.getItem(SESSION_KEY) || 'null'); } catch (e) { return null; }
  }

  /* L'utilisateur courant est-il l'admin principal ?
     (session sans "employee" = admin serveur principal) */
  function isMainAdmin() {
    var s = getSession();
    if (!s) return false;
    return !s.employee; // les employés ont session.employee = true
  }

  /* Permissions de l'utilisateur courant. Admin principal = tout. */
  function currentPerms() {
    if (isMainAdmin()) {
      var all = {};
      SECTIONS.forEach(function (s) { all[s.perm] = true; });
      return all;
    }
    var s = getSession();
    return (s && s.perms) || {};
  }

  function hasPerm(perm) {
    if (!perm) return true;
    if (isMainAdmin()) return true;
    return currentPerms()[perm] === true;
  }

  /* ---- HACHAGE simple du mot de passe (évite le clair en stockage).
     Note : sécurité côté client ; pour une sécurité forte, prévoir une
     vérification serveur. Ici on protège l'affichage en clair. ---- */
  function hashPass(pass) {
    var h = 5381;
    var str = 'asl::' + pass;
    for (var i = 0; i < str.length; i++) { h = ((h << 5) + h) + str.charCodeAt(i); h = h & 0xffffffff; }
    return 'h' + (h >>> 0).toString(16);
  }

  /* ============ API publique (utilisée par l'UI et le login) ============ */
  window.ASLUsers = {
    SECTIONS: SECTIONS,
    PAGE_PERM: PAGE_PERM,
    list: getUsers,
    isMainAdmin: isMainAdmin,
    currentPerms: currentPerms,
    hasPerm: hasPerm,
    hashPass: hashPass,
    refresh: pullUsers,

    /* Tente d'authentifier un employé. Renvoie l'objet user si OK, sinon null. */
    authEmployee: function (username, password) {
      var u = getUsers().filter(function (x) {
        return x.username && x.username.toLowerCase() === String(username || '').toLowerCase();
      })[0];
      if (!u) return null;
      if (u.active === false) return { blocked: true };
      if (u.passHash !== hashPass(password)) return null;
      return u;
    },

    create: function (data) {
      var list = getUsers();
      if (list.some(function (x) { return x.username.toLowerCase() === data.username.toLowerCase(); })) {
        return { error: 'Cet identifiant existe déjà.' };
      }
      var user = {
        id: 'usr' + Date.now(),
        name: data.name || data.username,
        username: data.username,
        passHash: hashPass(data.password),
        perms: data.perms || {},
        active: true,
        createdAt: new Date().toISOString()
      };
      list.push(user);
      saveUsers(list);
      pushUser('add', { item: user });
      return { user: user };
    },

    update: function (id, patch) {
      var list = getUsers();
      var u = list.filter(function (x) { return x.id === id; })[0];
      if (!u) return null;
      if (patch.name != null) u.name = patch.name;
      if (patch.username != null) u.username = patch.username;
      if (patch.password) u.passHash = hashPass(patch.password);
      if (patch.perms) u.perms = patch.perms;
      if (patch.active != null) u.active = patch.active;
      saveUsers(list);
      pushUser('update', { id: id, patch: { name: u.name, username: u.username, passHash: u.passHash, perms: u.perms, active: u.active } });
      return u;
    },

    remove: function (id) {
      saveUsers(getUsers().filter(function (x) { return x.id !== id; }));
      pushUser('remove', { id: id });
    },

    toggleActive: function (id) {
      var list = getUsers();
      var u = list.filter(function (x) { return x.id === id; })[0];
      if (u) { u.active = !u.active; saveUsers(list); pushUser('update', { id: id, patch: { active: u.active } }); }
      return u;
    }
  };

  /* Synchronisation initiale depuis le serveur (comptes employés multi-appareils).
     Ne s'exécute que si l'utilisateur est connecté (clé admin présente). */
  function initialPull() { if (adminKey()) pullUsers(); }
  try {
    if (typeof document !== 'undefined') {
      if (document.readyState !== 'loading') setTimeout(initialPull, 600);
      else document.addEventListener('DOMContentLoaded', function () { setTimeout(initialPull, 600); });
    }
  } catch (e) {}
})();
