/* ============================================================
   ALL STAR LOC — Application mobile back-office (logique)
   ------------------------------------------------------------
   Application de gestion d'exploitation pensée mobile-first.
   N'altère PAS le desktop : superpose une interface dédiée sous
   768px et réutilise les fonctions existantes (viewRes, confirmRes,
   cancelRes, viewRental, prolongerLocation, terminerLocation,
   ASLDB.updateVehicle, showPage…).

   Modules mobiles : Tableau de bord · Véhicules · Réservations ·
   Locations · Retours · Clients · Caisse/Paiements · Notifications ·
   Déconnexion. Tout le reste demeure réservé au PC.

   Icônes : jeu d'icônes linéaires professionnelles (style Lucide),
   inlinées en SVG — aucune dépendance externe, aucun emoji.
   Respecte les permissions employés (ASL_HAS_PERM).
   ============================================================ */
(function () {
  'use strict';

  function isMobile() { return window.innerWidth <= 768; }
  function money(n) { n = Math.round(Number(n) || 0); return n.toLocaleString('fr-FR').replace(/\u202f/g, ' ') + ' MAD'; }
  function esc(s) { return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }
  function todayISO() { var d = new Date(); d.setHours(0, 0, 0, 0); return d.toISOString().slice(0, 10); }
  function plusDaysISO(n) { var d = new Date(); d.setHours(0, 0, 0, 0); d.setDate(d.getDate() + n); return d.toISOString().slice(0, 10); }

  function fleet() { try { return (ASLDB.getFleet && ASLDB.getFleet()) || []; } catch (e) { return []; } }
  function reservations() { try { return (ASLDB.getReservations && ASLDB.getReservations()) || []; } catch (e) { return []; } }
  function charges() { try { return JSON.parse(localStorage.getItem('asl_charges_v1') || '[]'); } catch (e) { return []; } }

  function can(perm) {
    if (typeof window.ASL_HAS_PERM === 'function') return window.ASL_HAS_PERM(perm);
    return true;
  }

  /* ============================================================
     ICÔNES — jeu linéaire professionnel (style Lucide), 24×24,
     stroke=currentColor. Aucune image, aucun emoji.
     ============================================================ */
  var ICONS = {
    grid: '<rect width="7" height="9" x="3" y="3" rx="1"/><rect width="7" height="5" x="14" y="3" rx="1"/><rect width="7" height="9" x="14" y="12" rx="1"/><rect width="7" height="5" x="3" y="16" rx="1"/>',
    car: '<path d="M19 17h2l.64-2.54a6 6 0 0 0-1.4-5.01l-1.07-1.21A2 2 0 0 0 17.66 7H6.34a2 2 0 0 0-1.51.69L3.76 8.9a6 6 0 0 0-1.4 5.01L3 17h2"/><circle cx="7" cy="17" r="2"/><path d="M9 17h6"/><circle cx="17" cy="17" r="2"/>',
    key: '<path d="M2.59 17.41A2 2 0 0 0 2 18.83V21a1 1 0 0 0 1 1h3a1 1 0 0 0 1-1v-1a1 1 0 0 1 1-1h1a1 1 0 0 0 1-1v-1a1 1 0 0 1 1-1h.17a2 2 0 0 0 1.42-.59l.82-.82a6.5 6.5 0 1 0-4-4z"/><circle cx="16.5" cy="7.5" r=".75" fill="currentColor" stroke="none"/>',
    clock: '<circle cx="12" cy="12" r="9"/><polyline points="12 7 12 12 15.5 14"/>',
    returns: '<path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/>',
    wallet: '<path d="M21 12V7H5a2 2 0 0 1 0-4h14v4"/><path d="M3 5v14a2 2 0 0 0 2 2h16v-5"/><path d="M18 12a2 2 0 0 0 0 4h4v-4Z"/>',
    hourglass: '<path d="M5 22h14M5 2h14"/><path d="M17 22v-4.17a2 2 0 0 0-.59-1.41L12 12l-4.41 4.41A2 2 0 0 0 7 17.83V22"/><path d="M7 2v4.17a2 2 0 0 0 .59 1.41L12 12l4.41-4.41A2 2 0 0 0 17 6.17V2"/>',
    alert: '<path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><path d="M12 9v4"/><path d="M12 17h.01"/>',
    card: '<rect width="20" height="14" x="2" y="5" rx="2"/><line x1="2" x2="22" y1="10" y2="10"/>',
    arrowLeft: '<path d="M19 12H5"/><path d="m12 19-7-7 7-7"/>',
    bell: '<path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/>',
    users: '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>',
    handshake: '<path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3"/><circle cx="12" cy="12" r="3"/>',
    phone: '<path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.13.96.36 1.9.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.91.34 1.85.57 2.81.7A2 2 0 0 1 22 16.92Z"/>',
    file: '<path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"/><path d="M14 2v5h5"/><line x1="9" x2="15" y1="13" y2="13"/><line x1="9" x2="15" y1="17" y2="17"/>',
    logout: '<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" x2="9" y1="12" y2="12"/>',
    check: '<path d="M20 6 9 17l-5-5"/>',
    checkCircle: '<path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/>',
    x: '<path d="M18 6 6 18M6 6l12 12"/>',
    calendar: '<rect width="18" height="18" x="3" y="4" rx="2"/><path d="M3 10h18M8 2v4M16 2v4"/>',
    calendarClock: '<path d="M21 7.5V6a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2h6"/><path d="M3 10h18M16 2v4M8 2v4"/><circle cx="18" cy="16" r="4"/><path d="M18 14.5V16l1 1"/>',
    more: '<circle cx="12" cy="12" r="1.6" fill="currentColor" stroke="none"/><circle cx="19" cy="12" r="1.6" fill="currentColor" stroke="none"/><circle cx="5" cy="12" r="1.6" fill="currentColor" stroke="none"/>',
    ledger: '<path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>',
    receipt: '<path d="M4 2v20l2-1.5L8 22l2-1.5L12 22l2-1.5L16 22l2-1.5L20 22V2l-2 1.5L16 2l-2 1.5L12 2l-2 1.5L8 2 6 3.5 4 2Z"/><path d="M8 7.5h8M8 11h8M8 14.5h5"/>',
    scale: '<path d="M12 3v18M8 21h8"/><path d="m5 7 7-3 7 3"/><path d="M5 7 2.5 13a3 3 0 0 0 5 0Z"/><path d="M19 7l-2.5 6a3 3 0 0 0 5 0Z"/>',
    eye: '<path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/>',
    edit: '<path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.12 2.12 0 0 1 3 3L12 15l-4 1 1-4Z"/>',
    swap: '<path d="m17 2 4 4-4 4"/><path d="M3 11v-1a4 4 0 0 1 4-4h14"/><path d="m7 22-4-4 4-4"/><path d="M21 13v1a4 4 0 0 1-4 4H3"/>',
    plus: '<path d="M5 12h14M12 5v14"/>',
    user: '<path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>',
    shield: '<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10"/>',
    wrench: '<path d="M14.7 6.3a4 4 0 0 0-5.4 5.3L3 18l3 3 6.4-6.3a4 4 0 0 0 5.3-5.4l-2.5 2.5-2.1-2.1Z"/>',
    search: '<circle cx="11" cy="11" r="7"/><path d="m21 21-4.3-4.3"/>',
    sparkle: '<path d="M12 3v3M12 18v3M3 12h3M18 12h3M5.6 5.6l2.1 2.1M16.3 16.3l2.1 2.1M18.4 5.6l-2.1 2.1M7.7 16.3l-2.1 2.1"/>',
    camera: '<path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3Z"/><circle cx="12" cy="13" r="3.2"/>',
    image: '<rect width="18" height="18" x="3" y="3" rx="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.1-3.1a2 2 0 0 0-2.8 0L6 21"/>'
  };
  function ic(name, cls) {
    return '<svg class="ma-ic' + (cls ? ' ' + cls : '') + '" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + (ICONS[name] || '') + '</svg>';
  }

  /* ---------- Calculs financiers (mêmes règles que la Caisse) ---------- */
  function totals() {
    var enc = 0, rest = 0;
    reservations().forEach(function (r) {
      if (r.status === 'cancelled') return;
      enc += Number(r.paid) || 0;
      rest += Math.max(0, (Number(r.amount) || 0) - (Number(r.paid) || 0));
    });
    var chg = 0;
    charges().forEach(function (c) { if (c.status !== 'pending') chg += Number(c.amount) || 0; });
    return { enc: enc, rest: rest, chg: chg, soldeReel: enc - chg, soldeEstime: enc + rest - chg };
  }

  /* ---------- Comptes pour le tableau de bord ---------- */
  function counts() {
    var f = fleet(), r = reservations(), ts = todayISO();
    var MAINT = {}; try { MAINT = JSON.parse(localStorage.getItem('asl_maint_v1') || '{}'); } catch (e) {}
    var todayMs = new Date(ts).getTime();
    // Visites techniques proches (≤ 7 j) + vidanges dues (rappel atteint)
    var vt = 0, vid = 0;
    f.forEach(function (c) {
      var m = MAINT[String(c.id)] || {};
      if (m.vt_next) { var dv = Math.round((new Date(m.vt_next) - todayMs) / 86400000); if (dv <= 7) vt++; }
      if (m.reminder_next && new Date(m.reminder_next).getTime() <= todayMs + 86400000) vid++;
    });
    return {
      available: f.filter(function (c) { return c.status === 'available'; }).length,
      // Loués = réservations actives/confirmées en cours aujourd'hui (logique desktop)
      rented: r.filter(function (x) { return (x.status === 'active' || x.status === 'confirmed') && (x.startDate || '') <= ts && (x.endDate || '') >= ts; }).length,
      // Réservés = réservations futures non encore commencées (à venir)
      reserved: r.filter(function (x) { return (x.status === 'confirmed' || x.status === 'reserved' || x.status === 'pending') && (x.startDate || '') > ts; }).length,
      returnsToday: r.filter(function (x) { return (x.endDate || '').slice(0, 10) === ts && x.status !== 'cancelled'; }).length,
      late: r.filter(function (x) { return (x.endDate || '') < ts && (x.status === 'active' || x.status === 'confirmed'); }).length,
      unpaid: r.filter(function (x) { return x.status !== 'cancelled' && (Number(x.amount) || 0) > (Number(x.paid) || 0); }).length,
      // Activités du jour
      entrants: r.filter(function (x) { return (x.endDate || '').slice(0, 10) === ts && x.status !== 'cancelled'; }).length,
      sortants: r.filter(function (x) { return (x.startDate || '').slice(0, 10) === ts && x.status !== 'cancelled'; }).length,
      vt: vt,
      vidanges: vid
    };
  }

  /* ============ NAVIGATION ============ */
  var current = 'dashboard';
  function rawGo(screen) {
    current = screen;
    document.querySelectorAll('.ma-screen').forEach(function (s) { s.classList.toggle('active', s.id === 'ma-' + screen); });
    document.querySelectorAll('.ma-tab').forEach(function (t) { t.classList.toggle('active', t.getAttribute('data-screen') === screen); });
    // Bouton retour : visible sur les sous-écrans, masqué sur le tableau de bord
    var back = document.getElementById('ma-head-back');
    var logo = document.querySelector('.ma-head-logo');
    var greet = document.querySelector('.ma-greet');
    var isHome = (screen === 'dashboard');
    if (back) back.style.display = isHome ? 'none' : 'flex';
    if (logo) logo.style.display = isHome ? '' : 'none';
    if (greet) greet.style.display = isHome ? '' : 'none';
    var app = document.getElementById('asl-mobile-app');
    if (app) app.scrollTop = 0;
    renderScreen(screen);
  }
  window.maGo = rawGo;
  /* Cloche Notifications : ouvre les notifications ; si on est déjà dessus,
     retour à l'accueil. Comportement stable à chaque clic. */
  window.maToggleNotifications = function () {
    if (current === 'notifications') window.maGo('dashboard');
    else window.maGo('notifications');
  };

  function renderScreen(screen) {
    if (screen === 'dashboard') renderDash();
    else if (screen === 'vehicles') renderVehicles();
    else if (screen === 'available') renderAvailableM();
    else if (screen === 'reserved') renderReservedM();
    else if (screen === 'activites') renderActivitesM();
    else if (screen === 'reservations') renderReservations();
    else if (screen === 'rentals') renderRentals();
    else if (screen === 'returns') renderReturns();
    else if (screen === 'late') renderLateM();
    else if (screen === 'clients') renderClients();
    else if (screen === 'sublease') renderSubleaseM();
    else if (screen === 'unpaid') renderUnpaidM();
    else if (screen === 'revenue') renderRevenueM();
    else if (screen === 'caisse') renderCaisse();
    else if (screen === 'notifications') renderNotifications();
  }

  /* ============ TABLEAU DE BORD ============ */
  function renderDash() {
    var c = counts();
    var rev = computeRev();
    var cards = [
      { num: c.available, lbl: 'Disponibles', cls: 'green', ico: 'car', act: "maDash('available')" },
      { num: c.rented, lbl: 'Loués', cls: 'blue', ico: 'key', act: "maDash('rented')" },
      { num: c.returnsToday, lbl: "Retours aujourd'hui", cls: 'orange', ico: 'returns', act: "maDash('returns')" },
      { num: c.late, lbl: 'En retard', cls: 'red', ico: 'alert', act: "maDash('late')" },
      { num: c.reserved, lbl: 'Réservés', cls: 'purple', ico: 'calendar', act: "maDash('reserved')" },
      { num: money(rev.month), lbl: 'Revenus du mois', cls: 'teal', ico: 'wallet', act: "maDash('revenue')", small: true }
    ];
    var host = document.getElementById('ma-dashboard');
    if (!host) return;
    var activites = c.entrants + c.sortants + c.vt + c.vidanges;
    host.innerHTML =
      '<div class="ma-stats">' + cards.map(function (k) {
        return '<button type="button" class="ma-stat" onclick="' + k.act + '">'
          + '<div class="ma-stat-ico ' + k.cls + '">' + ic(k.ico) + '</div>'
          + '<div class="ma-stat-num ' + k.cls + '"' + (k.small ? ' style="font-size:17px;"' : '') + '>' + k.num + '</div>'
          + '<div class="ma-stat-lbl">' + k.lbl + '</div></button>';
      }).join('') + '</div>'
      + '<div class="ma-section-title">À surveiller</div>'
      + alertRow('returns', "Activités du jour", c.entrants + ' entrant(s) · ' + c.sortants + ' sortant(s) · ' + c.vt + ' VT · ' + c.vidanges + ' vidange(s)', "maDash('activites')", 'blue')
      + alertRow('card', c.unpaid + ' impayé(s)', 'Dossiers avec reste à payer', "maDash('unpaid')", 'orange');
  }

  /* Revenus : réutilise la logique desktop si disponible, sinon recalcule
     exactement de la même façon (paiements réellement encaissés). */
  function computeRev() {
    try { if (typeof window.computeRevenues === 'function') return window.computeRevenues(); } catch (e) {}
    var r = reservations(), now = new Date();
    function pad(n) { return String(n).padStart(2, '0'); }
    var day = now.getDay(); var diffToMon = (day === 0 ? 6 : day - 1);
    var monday = new Date(now); monday.setDate(now.getDate() - diffToMon); monday.setHours(0, 0, 0, 0);
    var sunday = new Date(monday); sunday.setDate(monday.getDate() + 6);
    var wf = monday.getFullYear() + '-' + pad(monday.getMonth() + 1) + '-' + pad(monday.getDate());
    var wt = sunday.getFullYear() + '-' + pad(sunday.getMonth() + 1) + '-' + pad(sunday.getDate());
    var mf = now.getFullYear() + '-' + pad(now.getMonth() + 1) + '-01';
    var mt = now.getFullYear() + '-' + pad(now.getMonth() + 1) + '-31';
    var yf = now.getFullYear() + '-01-01', yt = now.getFullYear() + '-12-31';
    function between(from, to) {
      var s = 0;
      r.forEach(function (x) {
        if (x.status === 'cancelled') return;
        var paid = Number(x.paid) || 0; if (paid <= 0) return;
        var d = (x.startDate || x.createdAt || '').slice(0, 10);
        if (d >= from && d <= to) s += paid;
      });
      return s;
    }
    var due = 0;
    r.forEach(function (x) { if (x.status !== 'cancelled') due += Math.max(0, (Number(x.amount) || 0) - (Number(x.paid) || 0)); });
    return { week: between(wf, wt), month: between(mf, mt), year: between(yf, yt), dueGlobal: due };
  }

  /* Cartes du tableau de bord → vraies vues mobiles en cartes (jamais les
     panneaux desktop). Le retour ramène toujours au dashboard. */
  window.maDash = function (type) {
    if (type === 'available') maGo('available');
    else if (type === 'rented') maGo('rentals');
    else if (type === 'returns') maGo('returns');
    else if (type === 'late') maGo('late');
    else if (type === 'reserved') maGo('reserved');
    else if (type === 'activites') maGo('activites');
    else if (type === 'unpaid') maGo('unpaid');
    else if (type === 'revenue') maGo('revenue');
  };
  function alertRow(icon, title, sub, act, tone) {
    return '<div class="ma-notif" onclick="' + act + '"><div class="ma-notif-ico ' + (tone || 'red') + '">' + ic(icon) + '</div>'
      + '<div class="ma-notif-body"><div class="ma-notif-title">' + title + '</div><div class="ma-notif-sub">' + sub + '</div></div>'
      + '<span class="ma-notif-chev">' + ic('returns') + '</span></div>';
  }

  /* ============ VÉHICULES ============ */
  var vehFilter = 'all';
  window.maVehFilter = function (f) { vehFilter = f; renderVehicles(); };
  function renderVehicles() {
    var host = document.getElementById('ma-vehicles');
    if (!host) return;
    var f = fleet();
    var chips = [['all', 'Tous'], ['available', 'Disponibles'], ['rented', 'Loués'], ['reserved', 'Réservés']];
    var list = f.filter(function (c) {
      if (vehFilter === 'all') return true;
      if (vehFilter === 'rented') return c.status === 'rented' || c.status === 'active';
      return c.status === vehFilter;
    });
    host.innerHTML =
      '<div class="ma-chips">' + chips.map(function (ch) {
        return '<button class="ma-chip ' + (vehFilter === ch[0] ? 'active' : '') + '" onclick="maVehFilter(\'' + ch[0] + '\')">' + ch[1] + '</button>';
      }).join('') + '</div>'
      + (list.length ? list.map(vehCard).join('') : '<div class="ma-empty">Aucun véhicule dans cette catégorie.</div>');
  }
  function vehCard(c) {
    var statusMap = { available: ['green', 'Disponible'], rented: ['blue', 'Loué'], active: ['blue', 'Loué'], reserved: ['orange', 'Réservé'], maintenance: ['gray', 'Entretien'] };
    var st = statusMap[c.status] || ['gray', c.status || '—'];
    var photo = c.photo || c.image || c.img || '';
    var imgHtml = photo ? '<img class="ma-card-photo" src="' + esc(photo) + '" alt="" loading="lazy">' : '<div class="ma-card-photo"></div>';
    var idArg = (typeof c.id === 'number' ? c.id : "'" + String(c.id) + "'");
    return '<div class="ma-card">'
      + '<div class="ma-card-top">' + imgHtml
      + '<div class="ma-card-info"><div class="ma-card-name">' + esc(c.name || 'Véhicule') + '</div>'
      + '<div class="ma-card-sub">' + esc(c.plate || c.immat || '—') + ' · ' + esc(c.category || '') + '</div></div>'
      + '<span class="ma-badge ' + st[0] + '">' + st[1] + '</span></div>'
      + '<div class="ma-card-meta"><div class="ma-meta">Prix/jour<b>' + money(c.priceMAD || c.price || 0) + '</b></div>'
      + '<div class="ma-meta">Carburant<b>' + esc(c.fuel || '—') + '</b></div>'
      + '<div class="ma-meta">Boîte<b>' + esc(c.transmission || '—') + '</b></div></div>'
      + '<div class="ma-actions">'
      + '<button class="ma-act-btn" onclick="maViewVehicle(' + idArg + ')">' + ic('eye') + 'Fiche</button>'
      + '<button class="ma-act-btn" onclick="maEditVehicle(' + idArg + ')">' + ic('edit') + 'Modifier</button>'
      + '<button class="ma-act-btn" onclick="maChangeStatus(' + idArg + ')">' + ic('swap') + 'Statut</button>'
      + '<button class="ma-act-btn" onclick="maVehiclePhoto(' + idArg + ')">' + ic('camera') + 'Photo</button>'
      + '</div></div>';
  }
  window.maViewVehicle = function (id) {
    maEditVehicle(id);
  };
  window.maEditVehicle = function (id) {
    enterDesktopView();
    if (typeof window.showPage === 'function') window.showPage('fleet', null);
    setTimeout(function () {
      if (typeof window.editCar === 'function') { try { window.editCar(typeof id === 'string' ? id : Number(id)); } catch (e) {} }
    }, 100);
    maShowBackToApp();
  };
  /* Changer le statut : feuille tactile, écrit via ASLDB.updateVehicle */
  window.maChangeStatus = function (id) {
    var f = fleet();
    var car = f.filter(function (c) { return String(c.id) === String(id); })[0];
    if (!car) return;
    var opts = [
      ['available', 'Disponible', 'green'],
      ['reserved', 'Réservé', 'orange'],
      ['rented', 'Loué', 'blue'],
      ['maintenance', 'Entretien', 'gray']
    ];
    openSheet(
      '<div class="ma-sheet-title">' + esc(car.name || 'Véhicule') + '</div>'
      + '<div class="ma-sheet-sub">' + esc(car.plate || car.immat || '') + ' — changer le statut</div>'
      + opts.map(function (o) {
        var activeNow = (car.status === o[0]) || (o[0] === 'rented' && car.status === 'active');
        return '<button class="ma-sheet-opt' + (activeNow ? ' active' : '') + '" onclick="maSetStatus(' + (typeof car.id === 'number' ? car.id : "'" + String(car.id) + "'") + ',\'' + o[0] + '\')">'
          + '<span class="ma-dot-status ' + o[2] + '"></span>' + o[1]
          + (activeNow ? '<span class="ma-sheet-chk">' + ic('check') + '</span>' : '') + '</button>';
      }).join('')
    );
  };
  window.maSetStatus = function (id, status) {
    try { if (ASLDB && ASLDB.updateVehicle) ASLDB.updateVehicle(id, { status: status }); } catch (e) {}
    closeSheet();
    if (typeof window.showToast === 'function') window.showToast('Statut mis à jour ✓');
    renderVehicles();
  };

  /* ---- Photo véhicule (mobile natif) ----
     accept="image/*" sans capture → le système propose « Galerie / Photothèque »
     ET « Appareil photo » (iPhone Safari + Android Chrome). Aperçu avant
     enregistrement, compression via ASLDB.uploadImage, puis mise à jour du
     véhicule (synchronisée KV → back-office + site client). */
  window.maVehiclePhoto = function (id) {
    var input = document.getElementById('ma-veh-photo-input');
    if (!input) {
      input = document.createElement('input');
      input.type = 'file'; input.accept = 'image/*'; input.id = 'ma-veh-photo-input';
      input.style.display = 'none';
      document.body.appendChild(input);
    }
    input.value = '';
    input.onchange = function () {
      var file = input.files && input.files[0];
      if (file) maPhotoPreview(id, file);
    };
    input.click();
  };
  function maPhotoPreview(id, file) {
    var reader = new FileReader();
    reader.onload = function () {
      var idArg = (typeof id === 'number' ? id : "'" + String(id) + "'");
      openSheet(
        '<div class="ma-sheet-title">Photo du véhicule</div>'
        + '<div class="ma-sheet-sub">Traitement auto (recadrage + fond). Vérifiez l\'aperçu.</div>'
        + '<div class="ma-photo-preview"><img src="' + reader.result + '" alt=""></div>'
        + '<div style="display:flex;align-items:center;gap:8px;margin:10px 0;flex-wrap:wrap;">'
        + '<label style="font-size:13px;color:#6b7280;font-weight:600;">Fond :</label>'
        + '<select id="ma-photo-bg" class="form-input" style="width:auto;flex:1;min-height:44px;font-size:16px;">'
        + '<option value="white">Blanc (défaut)</option><option value="black">Noir</option>'
        + '<option value="transparent">Transparent</option></select></div>'
        + '<button class="ma-action" id="ma-photo-save">' + ic('check') + ' Enregistrer la photo</button>'
        + '<button class="ma-act-btn ma-photo-retake" onclick="maVehiclePhoto(' + idArg + ')">' + ic('camera') + ' Reprendre / changer</button>'
      );
      var btn = document.getElementById('ma-photo-save');
      if (btn) btn.onclick = function () { maPhotoSave(id, file, btn); };
    };
    reader.readAsDataURL(file);
  }
  function maPhotoSave(id, file, btn) {
    if (btn) { btn.disabled = true; btn.innerHTML = ic('clock') + ' Traitement…'; }
    function finish(url) {
      try { if (ASLDB && ASLDB.updateVehicle) ASLDB.updateVehicle(id, { img: url, image: url, photo: url }); } catch (e) {}
      closeSheet();
      if (typeof window.showToast === 'function') window.showToast('Photo mise à jour ✓');
      renderVehicles();
    }
    function fail(msg) {
      if (btn) { btn.disabled = false; btn.innerHTML = ic('check') + ' Enregistrer la photo'; }
      alert(msg || 'Échec de l\'envoi de la photo. Réessayez.');
    }
    function doUpload(toUpload) {
      try {
        if (ASLDB && typeof ASLDB.uploadImage === 'function') {
          if (btn) btn.innerHTML = ic('clock') + ' Envoi en cours…';
          ASLDB.uploadImage(toUpload).then(finish).catch(function (err) { fail(err && err.message ? err.message : null); });
        } else {
          fail('Téléversement indisponible. Déployez le site sur Cloudflare pour activer les photos.');
        }
      } catch (e) { fail(e && e.message ? e.message : null); }
    }
    // Traitement automatique puis envoi ; en cas d'échec → image d'origine.
    var bgEl = document.getElementById('ma-photo-bg');
    var bg = bgEl ? bgEl.value : 'white';
    if (window.ASLPhoto && typeof window.ASLPhoto.process === 'function') {
      window.ASLPhoto.process(file, { background: bg }).then(function (processed) {
        if (!processed) { doUpload(file); return; }
        fetch(processed).then(function (r) { return r.blob(); }).then(function (blob) {
          var nf = new File([blob], (file.name || 'photo').replace(/\.[^.]+$/, '') + (bg === 'transparent' ? '.png' : '.jpg'), { type: blob.type || 'image/jpeg' });
          doUpload(nf);
        }).catch(function () { doUpload(file); });
      }).catch(function () { doUpload(file); });
    } else {
      doUpload(file);
    }
  }

  /* ============ RÉSERVATIONS ============ */
  function renderReservations() {
    var host = document.getElementById('ma-reservations');
    if (!host) return;
    var list = reservations().filter(function (r) { return r.status === 'pending' || r.status === 'confirmed' || r.status === 'reserved'; })
      .sort(function (a, b) { return (b.createdAt || '').localeCompare(a.createdAt || ''); });
    host.innerHTML = list.length ? list.map(function (r) { return resCard(r, 'reservation'); }).join('') : '<div class="ma-empty">Aucune réservation en cours.</div>';
  }

  /* ============ LOCATIONS ============ */
  function renderRentals() {
    var host = document.getElementById('ma-rentals');
    if (!host) return;
    var ts = todayISO();
    var list = reservations().filter(function (r) { return (r.status === 'active' || r.status === 'confirmed') && (r.startDate || '') <= ts && (r.endDate || '') >= ts; });
    host.innerHTML = list.length ? list.map(function (r) { return resCard(r, 'rental'); }).join('') : '<div class="ma-empty">Aucune location en cours aujourd\'hui.</div>';
  }

  function resCard(r, kind) {
    var reste = Math.max(0, (Number(r.amount) || 0) - (Number(r.paid) || 0));
    var payBadge = reste > 0 ? '<span class="ma-badge red">Reste ' + money(reste) + '</span>' : '<span class="ma-badge green">Payé</span>';
    var idStr = "'" + String(r.id || '') + "'";

    if (kind === 'rental') {
      // LOUÉS : on met en valeur le nom de la voiture, le client en dessous.
      // Pas de badge de statut. Fiche (popup) + Prolonger + Retour.
      var plate = r.assignedPlate || (function () { try { var c = fleet().filter(function (z) { return z.name === r.car || z.id === r.carId; })[0]; return c ? (c.plate || '') : ''; } catch (e) { return ''; } })();
      return '<div class="ma-card">'
        + '<div class="ma-card-top"><div class="ma-card-ico-box blue">' + ic('key') + '</div>'
        + '<div class="ma-card-info"><div class="ma-card-name">' + esc(r.car || 'Véhicule') + '</div>'
        + '<div class="ma-card-sub">' + esc(r.client || 'Client') + (plate ? ' · ' + esc(plate) : '') + '</div></div>'
        + payBadge + '</div>'
        + '<div class="ma-card-meta">'
        + '<div class="ma-meta">Départ<b>' + fmtDateT(r.startDate, r.startTime, '10:00') + '</b></div>'
        + '<div class="ma-meta">Retour<b>' + fmtDateT(r.endDate, r.endTime, '18:00') + '</b></div>'
        + '<div class="ma-meta">Total<b>' + money(r.amount || 0) + '</b></div>'
        + '<div class="ma-meta">Reste<b style="color:' + (reste > 0 ? '#C41E3A' : '#16a34a') + ';">' + money(reste) + '</b></div></div>'
        + '<div class="ma-actions">'
        + '<button class="ma-act-btn" onclick="maRentalFiche(' + idStr + ')">' + ic('eye') + 'Fiche</button>'
        + '<button class="ma-act-btn" onclick="maExtend(' + idStr + ')">' + ic('plus') + 'Prolonger</button>'
        + '<button class="ma-act-btn ok" onclick="maReturnVehicle(' + idStr + ')">' + ic('returns') + 'Retour</button>'
        + '</div></div>';
    }

    var stMap = { pending: ['orange', 'En attente'], confirmed: ['blue', 'Confirmée'], active: ['green', 'En cours'], reserved: ['orange', 'Réservée'], completed: ['gray', 'Terminée'], cancelled: ['red', 'Annulée'] };
    var st = stMap[r.status] || ['gray', r.status || '—'];
    var validable = r.status === 'pending' || r.status === 'reserved';
    var cancellable = r.status !== 'cancelled' && r.status !== 'completed';
    var actions = '<div class="ma-actions">'
      + '<button class="ma-act-btn" onclick="maViewRes(' + idStr + ')">' + ic('eye') + 'Voir</button>'
      + (validable ? '<button class="ma-act-btn ok" onclick="maConfirmRes(' + idStr + ')">' + ic('check') + 'Valider</button>' : '')
      + '<button class="ma-act-btn" onclick="maViewRes(' + idStr + ')">' + ic('edit') + 'Modifier</button>'
      + (cancellable ? '<button class="ma-act-btn danger" onclick="maCancelRes(' + idStr + ')">' + ic('x') + 'Annuler</button>' : '')
      + '</div>';
    return '<div class="ma-card">'
      + '<div class="ma-card-top"><div class="ma-card-ava">' + esc((r.client || '?').charAt(0).toUpperCase()) + '</div>'
      + '<div class="ma-card-info"><div class="ma-card-name">' + esc(r.client || 'Client') + '</div>'
      + '<div class="ma-card-sub">' + esc(r.car || '') + ' · ' + esc(r.contractRef || r.id || '') + '</div></div>'
      + '<span class="ma-badge ' + st[0] + '">' + st[1] + '</span></div>'
      + '<div class="ma-card-meta">'
      + '<div class="ma-meta">Départ<b>' + fmtDateT(r.startDate, r.startTime, '10:00') + '</b></div>'
      + '<div class="ma-meta">Retour<b>' + fmtDateT(r.endDate, r.endTime, '18:00') + '</b></div>'
      + '<div class="ma-meta">Total<b>' + money(r.amount || 0) + '</b></div></div>'
      + '<div class="ma-pay-line">' + payBadge + '</div>'
      + actions + '</div>';
  }

  /* Fiche location en POPUP mobile propre (centrée, stable, scroll vertical,
     bouton fermer = croix, aucun bouton caché). */
  window.maRentalFiche = function (id) {
    var r = (ASLDB.getReservations() || []).filter(function (x) { return x.id === id; })[0];
    if (!r) return;
    var reste = Math.max(0, (Number(r.amount) || 0) - (Number(r.paid) || 0));
    var plate = r.assignedPlate || (function () { try { var c = fleet().filter(function (z) { return z.name === r.car || z.id === r.carId; })[0]; return c ? (c.plate || '') : ''; } catch (e) { return ''; } })();
    function row(label, val, color) {
      return '<div class="ma-fiche-row"><span class="ma-fiche-lbl">' + label + '</span><span class="ma-fiche-val"' + (color ? ' style="color:' + color + ';"' : '') + '>' + val + '</span></div>';
    }
    openSheet(
      '<div class="ma-sheet-title">' + esc(r.car || 'Location') + '</div>'
      + '<div style="font-size:13px;color:#6b7280;margin:-6px 0 14px;">' + esc(plate || '') + '</div>'
      + row('Client', esc(r.client || '—'))
      + (r.phone ? row('Téléphone', '<a href="tel:' + esc(r.phone) + '" style="color:#2563eb;text-decoration:none;">' + esc(r.phone) + '</a>') : '')
      + row('Contrat', esc(r.contractRef || r.id || '—'))
      + row('Départ', fmtDateT(r.startDate, r.startTime, '10:00'))
      + row('Retour', fmtDateT(r.endDate, r.endTime, '18:00'))
      + row('Total', money(r.amount || 0))
      + row('Payé', money(r.paid || 0), '#16a34a')
      + row('Reste à payer', money(reste), reste > 0 ? '#C41E3A' : '#16a34a')
      + '<div class="ma-actions" style="margin-top:16px;">'
      + '<button class="ma-act-btn" onclick="maCloseSheet();maExtend(\'' + r.id + '\')">' + ic('plus') + 'Prolonger</button>'
      + '<button class="ma-act-btn ok" onclick="maCloseSheet();maReturnVehicle(\'' + r.id + '\')">' + ic('returns') + 'Confirmer retour</button>'
      + '</div>'
      + (r.phone ? '<a class="ma-act-btn" style="margin-top:8px;text-decoration:none;background:#25D366;color:#fff;border:none;" href="https://wa.me/' + esc(r.phone.replace(/[^0-9]/g, '')) + '" target="_blank">' + ic('phone') + 'WhatsApp</a>' : '')
    );
  };
  /* Actions réservations / locations — réutilisent les fonctions desktop */
  window.maViewRes = function (id) {
    if (typeof window.viewRes === 'function') { window.viewRes(id); return; }
    if (typeof window.viewRental === 'function') window.viewRental(id);
  };
  window.maViewRental = function (id) { maRentalFiche(id); };
  window.maConfirmRes = function (id) { if (typeof window.confirmRes === 'function') window.confirmRes(id); refreshSoon(); };
  window.maCancelRes = function (id) {
    var r = (ASLDB.getReservations() || []).filter(function (x) { return x.id === id; })[0];
    var who = r ? (r.client || '') + (r.car ? ' — ' + r.car : '') : '';
    if (!confirm('Êtes-vous sûr de vouloir annuler cette réservation ?\n' + who + '\n\nLe véhicule redeviendra disponible.')) return;
    // Annulation + libération du véhicule (même logique que desktop)
    try {
      if (r && r.carId != null && r.assignedPlate && typeof ASLDB.releaseUnit === 'function') ASLDB.releaseUnit(r.carId, r.assignedPlate);
      ASLDB.updateReservation(id, { status: 'cancelled' });
    } catch (e) {}
    if (typeof showToast === 'function') showToast('Réservation annulée ✓');
    try { if (typeof reloadData === 'function') reloadData(); } catch (e) {}
    renderScreen(current);
    refreshSoon();
  };
  window.maReturnVehicle = function (id) { if (typeof window.terminerLocation === 'function') window.terminerLocation(id); refreshSoon(); };
  window.maExtend = function (id) {
    if (typeof window.prolongerLocation === 'function') { window.prolongerLocation(id); return; }
    if (typeof window.prolongerReservation === 'function') window.prolongerReservation(id);
  };
  function refreshSoon() { setTimeout(function () { if (isMobile()) renderScreen(current); }, 250); }

  /* ============ RETOURS (écran dédié, filtres) ============ */
  var returnsFilter = 'today';
  var returnsDate = todayISO();
  window.maReturnsFilter = function (f) {
    returnsFilter = f;
    if (f === 'date') { var inp = document.getElementById('ma-returns-date'); if (inp && inp.value) returnsDate = inp.value; }
    renderReturns();
  };
  window.maReturnsDate = function (v) { returnsDate = v; returnsFilter = 'date'; renderReturns(); };
  function renderReturns() {
    var host = document.getElementById('ma-returns');
    if (!host) return;
    var target = returnsFilter === 'today' ? todayISO() : returnsFilter === 'tomorrow' ? plusDaysISO(1) : returnsDate;
    var list = reservations().filter(function (r) {
      return (r.endDate || '').slice(0, 10) === target && r.status !== 'cancelled' && r.status !== 'completed';
    }).sort(function (a, b) { return (a.endTime || '').localeCompare(b.endTime || ''); });
    var chips = [['today', "Aujourd'hui"], ['tomorrow', 'Demain'], ['date', 'Date choisie']];
    var head = '<div class="ma-chips">' + chips.map(function (ch) {
      return '<button class="ma-chip ' + (returnsFilter === ch[0] ? 'active' : '') + '" onclick="maReturnsFilter(\'' + ch[0] + '\')">' + ch[1] + '</button>';
    }).join('') + '</div>'
      + (returnsFilter === 'date' ? '<input type="date" id="ma-returns-date" class="ma-date" value="' + esc(returnsDate) + '" onchange="maReturnsDate(this.value)">' : '');
    var body = list.length ? list.map(function (r) {
      var idStr = "'" + String(r.id || '') + "'";
      var reste = Math.max(0, (Number(r.amount) || 0) - (Number(r.paid) || 0));
      return '<div class="ma-card ma-return-card" onclick="maViewRental(' + idStr + ')">'
        + '<div class="ma-card-top"><div class="ma-card-ico-box red">' + ic('returns') + '</div>'
        + '<div class="ma-card-info"><div class="ma-card-name">' + esc(r.car || 'Véhicule') + '</div>'
        + '<div class="ma-card-sub">' + esc(r.client || '') + (r.endTime ? ' · retour ' + esc(r.endTime) : '') + '</div></div>'
        + (reste > 0 ? '<span class="ma-badge red">Reste ' + money(reste) + '</span>' : '<span class="ma-badge green">Payé</span>') + '</div>'
        + '<div class="ma-return-foot"><span>' + ic('eye') + ' Ouvrir la fiche</span><span class="ma-return-date">' + fmtDateT(r.endDate, r.endTime, '18:00') + '</span></div>'
        + '</div>';
    }).join('') : '<div class="ma-empty">Aucun retour prévu pour cette date.</div>';
    host.innerHTML = head + body;
  }

  /* ============ DISPONIBLES (vue mobile native) ============ */
  function renderAvailableM() {
    var host = document.getElementById('ma-available');
    if (!host) return;
    var ts = todayISO();
    var f = fleet().filter(function (c) { return c.status === 'available'; });
    var res = reservations();
    host.innerHTML = f.length ? f.map(function (c) {
      // Réservation future éventuelle (libre aujourd'hui mais réservé plus tard)
      var fut = res.filter(function (r) {
        if (r.status === 'cancelled' || r.status === 'completed') return false;
        if (!(r.car === c.name || r.carId === c.id || r.assignedPlate === c.plate)) return false;
        return (r.startDate || '') > ts;
      }).sort(function (a, b) { return String(a.startDate || '').localeCompare(String(b.startDate || '')); })[0];
      return '<div class="ma-card">'
        + '<div class="ma-card-top"><div class="ma-card-ico-box green">' + ic('car') + '</div>'
        + '<div class="ma-card-info"><div class="ma-card-name">' + esc(c.name || 'Véhicule') + '</div>'
        + '<div class="ma-card-sub">' + esc(c.plate || '—') + '</div></div>'
        + '<span class="ma-badge green">Disponible</span></div>'
        + (fut ? '<div class="ma-card-note orange">' + ic('calendar') + ' Réservée du ' + fmtDMT(fut.startDate, fut.startTime, '10:00') + ' au ' + fmtDMT(fut.endDate, fut.endTime, '18:00') + '</div>' : '')
        + '</div>';
    }).join('') : '<div class="ma-empty">Aucun véhicule disponible en ce moment.</div>';
  }

  /* ============ RÉSERVÉS (vue mobile, identique à Disponibles) ============ */
  function renderReservedM() {
    var host = document.getElementById('ma-reserved');
    if (!host) return;
    var ts = todayISO();
    // Réservations futures (à venir), pas encore commencées
    var list = reservations().filter(function (r) {
      return (r.status === 'confirmed' || r.status === 'reserved' || r.status === 'pending') && (r.startDate || '') > ts;
    }).sort(function (a, b) { return String(a.startDate || '').localeCompare(String(b.startDate || '')); });
    host.innerHTML = list.length ? list.map(function (r) {
      // Immatriculation depuis la flotte
      var plate = r.assignedPlate || (function () { try { var c = fleet().filter(function (x) { return x.name === r.car || x.id === r.carId; })[0]; return c ? (c.plate || '') : ''; } catch (e) { return ''; } })();
      return '<div class="ma-card">'
        + '<div class="ma-card-top"><div class="ma-card-ico-box purple">' + ic('calendar') + '</div>'
        + '<div class="ma-card-info"><div class="ma-card-name">' + esc(r.car || 'Véhicule') + '</div>'
        + '<div class="ma-card-sub">' + esc(plate || '—') + '</div></div>'
        + '<span class="ma-badge purple">Réservé</span></div>'
        + '<div class="ma-card-note blue">' + ic('calendar') + ' Réservée du ' + fmtDMT(r.startDate, r.startTime, '10:00') + ' au ' + fmtDMT(r.endDate, r.endTime, '18:00') + '</div>'
        + '<div class="ma-card-note">' + ic('user') + ' ' + esc(r.client || r.finalClient || 'Client') + '</div>'
        + '</div>';
    }).join('') : '<div class="ma-empty">Aucun véhicule réservé.</div>';
  }

  /* ============ ACTIVITÉS DU JOUR (dynamique) ============ */
  function renderActivitesM() {
    var host = document.getElementById('ma-activites');
    if (!host) return;
    var ts = todayISO();
    var r = reservations();
    var MAINT = {}; try { MAINT = JSON.parse(localStorage.getItem('asl_maint_v1') || '{}'); } catch (e) {}
    var todayMs = new Date(ts).getTime();

    // Véhicules entrants (retours du jour)
    var entrants = r.filter(function (x) { return (x.endDate || '').slice(0, 10) === ts && x.status !== 'cancelled'; });
    // Véhicules sortants (départs du jour)
    var sortants = r.filter(function (x) { return (x.startDate || '').slice(0, 10) === ts && x.status !== 'cancelled'; });
    // Visites techniques proches + vidanges dues
    var f = fleet();
    var vts = [], vids = [];
    f.forEach(function (c) {
      var m = MAINT[String(c.id)] || {};
      if (m.vt_next) { var dv = Math.round((new Date(m.vt_next) - todayMs) / 86400000); if (dv <= 7) vts.push({ car: c, m: m, dv: dv }); }
      if (m.reminder_next && new Date(m.reminder_next).getTime() <= todayMs + 86400000) vids.push({ car: c, m: m });
    });

    function block(title, icon, tone, items, render) {
      return '<div class="ma-section-title">' + title + ' (' + items.length + ')</div>'
        + (items.length ? items.map(render).join('') : '<div class="ma-empty" style="padding:18px;">Aucun pour aujourd\'hui.</div>');
    }

    host.innerHTML =
      block('Véhicules sortants', 'key', 'blue', sortants, function (x) {
        return resMiniCard(x, 'sortant');
      })
      + block('Véhicules entrants', 'returns', 'orange', entrants, function (x) {
        return resMiniCard(x, 'entrant');
      })
      + block('Visites techniques', 'shield', 'purple', vts, function (v) {
        return '<div class="ma-card"><div class="ma-card-top"><div class="ma-card-ico-box purple">' + ic('shield') + '</div>'
          + '<div class="ma-card-info"><div class="ma-card-name">' + esc(v.car.name) + '</div>'
          + '<div class="ma-card-sub">' + esc(v.car.plate || '') + '</div></div>'
          + '<span class="ma-badge ' + (v.dv < 0 ? 'red' : 'orange') + '">' + (v.dv < 0 ? 'En retard' : 'Dans ' + v.dv + 'j') + '</span></div>'
          + '<div class="ma-card-note">' + ic('calendar') + ' Visite technique : ' + esc(v.m.vt_next) + '</div></div>';
      })
      + block('Vidanges', 'wrench', 'orange', vids, function (v) {
        var kmTxt = v.m.km_vidange_next ? Number(v.m.km_vidange_next).toLocaleString('fr-FR') + ' km' : '—';
        return '<div class="ma-card"><div class="ma-card-top"><div class="ma-card-ico-box orange">' + ic('wrench') + '</div>'
          + '<div class="ma-card-info"><div class="ma-card-name">' + esc(v.car.name) + '</div>'
          + '<div class="ma-card-sub">' + esc(v.car.plate || '') + '</div></div>'
          + '<span class="ma-badge orange">À vérifier</span></div>'
          + '<div class="ma-card-note">' + ic('wrench') + ' Prochaine vidange : ' + kmTxt + '</div></div>';
      });
  }
  function resMiniCard(x, kind) {
    var plate = x.assignedPlate || (function () { try { var c = fleet().filter(function (z) { return z.name === x.car || z.id === x.carId; })[0]; return c ? (c.plate || '') : ''; } catch (e) { return ''; } })();
    var idStr = "'" + String(x.id || '') + "'";
    return '<div class="ma-card"><div class="ma-card-top"><div class="ma-card-ico-box ' + (kind === 'sortant' ? 'blue' : 'orange') + '">' + ic(kind === 'sortant' ? 'key' : 'returns') + '</div>'
      + '<div class="ma-card-info"><div class="ma-card-name">' + esc(x.car || 'Véhicule') + '</div>'
      + '<div class="ma-card-sub">' + esc(x.client || '') + (plate ? ' · ' + esc(plate) : '') + '</div></div>'
      + '<span class="ma-badge ' + (kind === 'sortant' ? 'blue' : 'orange') + '">' + (kind === 'sortant' ? 'Départ' : 'Retour') + '</span></div>'
      + '<div class="ma-actions"><button class="ma-act-btn" onclick="maViewRental(' + idStr + ')">' + ic('eye') + 'Fiche</button></div></div>';
  }

  /* ============ EN RETARD (vue mobile native) ============ */
  function renderLateM() {
    var host = document.getElementById('ma-late');
    if (!host) return;
    var ts = todayISO();
    // Vrai retard : date de retour STRICTEMENT dépassée ET location non clôturée
    var list = reservations().filter(function (r) {
      return (r.endDate || '') < ts && (r.status === 'active' || r.status === 'confirmed');
    }).sort(function (a, b) { return (a.endDate || '').localeCompare(b.endDate || ''); });
    host.innerHTML = list.length ? list.map(function (r) {
      var idStr = "'" + String(r.id || '') + "'";
      var days = Math.max(0, Math.round((new Date(ts) - new Date(r.endDate)) / 86400000));
      return '<div class="ma-card">'
        + '<div class="ma-card-top"><div class="ma-card-ico-box red">' + ic('alert') + '</div>'
        + '<div class="ma-card-info"><div class="ma-card-name">' + esc(r.car || 'Véhicule') + '</div>'
        + '<div class="ma-card-sub">' + esc(r.client || '') + ' · retour prévu ' + fmtDateT(r.endDate, r.endTime, '18:00') + '</div></div>'
        + '<span class="ma-badge red">' + days + ' j</span></div>'
        + '<div class="ma-actions">'
        + '<button class="ma-act-btn" onclick="maViewRental(' + idStr + ')">' + ic('eye') + 'Fiche</button>'
        + '<button class="ma-act-btn ok" onclick="maLateConfirm(' + idStr + ')">' + ic('check') + 'Confirmer retour</button>'
        + '<button class="ma-act-btn" onclick="maExtend(' + idStr + ')">' + ic('plus') + 'Prolonger</button>'
        + '</div></div>';
    }).join('') : '<div class="ma-empty">' + ic('checkCircle') + '<div style="margin-top:8px;">Aucun retard — tout est à l\'heure.</div></div>';
  }
  /* Confirmer le retour depuis l'écran En retard : clôture, libère le
     véhicule, l'alerte disparaît et tout se recalcule/synchronise. */
  window.maLateConfirm = function (id) {
    var r = (ASLDB.getReservations() || []).filter(function (x) { return x.id === id; })[0];
    if (!r) return;
    if (!confirm('Confirmer le retour de ' + (r.car || '') + ' (' + (r.client || '') + ') ?\n\nLe véhicule sera libéré.')) return;
    try {
      if (r.carId != null && r.assignedPlate && typeof ASLDB.releaseUnit === 'function') ASLDB.releaseUnit(r.carId, r.assignedPlate);
      ASLDB.updateReservation(id, { status: 'completed' });
    } catch (e) {}
    if (typeof showToast === 'function') showToast('Retour confirmé — véhicule libéré ✓');
    try { if (typeof reloadData === 'function') reloadData(); } catch (e) {}
    renderLateM();
  };

  /* ============ REVENUS (vue mobile native) ============ */
  function renderRevenueM() {
    var host = document.getElementById('ma-revenue');
    if (!host) return;
    var rev = computeRev();
    host.innerHTML =
      cashLine('Revenus de la semaine', rev.week, '#16a34a', 'Du lundi au dimanche en cours')
      + cashLine('Revenus du mois', rev.month, '#16a34a', 'Mois calendaire en cours')
      + cashLine("Revenus de l'année", rev.year, '#16a34a', 'Année ' + new Date().getFullYear())
      + cashLine('Reste à encaisser', rev.dueGlobal, (rev.dueGlobal > 0 ? '#C41E3A' : '#16a34a'), 'Somme de tous les soldes dus');
  }
  function cashLine(label, val, color, note) {
    return '<div class="ma-cash-card" style="border-left-color:' + color + ';">'
      + '<div><div class="ma-cash-lbl">' + label + '</div>'
      + '<div class="ma-cash-num" style="color:' + color + ';">' + money(val) + '</div>'
      + (note ? '<div class="ma-cash-note">' + note + '</div>' : '') + '</div></div>';
  }
  function fmtDM(d) {
    if (!d) return '';
    var p = String(d).slice(0, 10).split('-');
    return p.length === 3 ? (p[2] + '/' + p[1]) : d;
  }
  /* Heure : on prend l'heure stockée si présente, sinon valeur par défaut
     métier (départ 10:00, retour 18:00) pour ne JAMAIS afficher une date
     seule. N'altère aucune donnée, c'est uniquement de l'affichage. */
  function timeOr(t, def) {
    var s = (t == null ? '' : String(t)).trim();
    return s ? s : (def || '');
  }
  /* Date complète JJ/MM/AAAA + heure. */
  function fmtDateT(d, t, def) {
    if (!d) return '—';
    var p = String(d).slice(0, 10).split('-');
    var date = p.length === 3 ? (p[2] + '/' + p[1] + '/' + p[0]) : String(d);
    var h = timeOr(t, def);
    return h ? (date + ' à ' + h) : date;
  }
  /* Date courte JJ/MM + heure (pour les notes compactes « Réservée du… »). */
  function fmtDMT(d, t, def) {
    if (!d) return '';
    var dm = fmtDM(d);
    var h = timeOr(t, def);
    return h ? (dm + ' à ' + h) : dm;
  }

  /* ============ CLIENTS ============ */
  function buildClients() {
    var ts = todayISO(), map = {};
    reservations().forEach(function (r) {
      if (r.status === 'cancelled') return;
      var key = (r.client || '') + '|' + (r.phone || '');
      if (!map[key]) map[key] = { name: r.client || 'Client', phone: r.phone || '', current: '', paid: 0, rest: 0, items: [] };
      map[key].paid += Number(r.paid) || 0;
      map[key].rest += Math.max(0, (Number(r.amount) || 0) - (Number(r.paid) || 0));
      map[key].items.push(r);
      var active = (r.status === 'active' || r.status === 'confirmed') && (r.startDate || '') <= ts && (r.endDate || '') >= ts;
      if (active) map[key].current = r.car || '';
    });
    return Object.keys(map).map(function (k) { return map[k]; }).filter(function (c) { return c.name; });
  }
  function renderClients() {
    var host = document.getElementById('ma-clients');
    if (!host) return;
    var clients = buildClients();
    var q = (document.getElementById('ma-client-search') || {}).value || '';
    if (q) { q = q.toLowerCase(); clients = clients.filter(function (c) { return (c.name + ' ' + c.phone).toLowerCase().indexOf(q) >= 0; }); }
    var listHtml = clients.length ? clients.map(clientCard).join('') : '<div class="ma-empty">Aucun client.</div>';
    if (!document.getElementById('ma-client-search')) {
      host.innerHTML = '<div class="ma-search-wrap">' + ic('search') + '<input type="search" id="ma-client-search" class="ma-search" placeholder="Rechercher un client…" oninput="maRenderClients()"></div><div id="ma-clients-list">' + listHtml + '</div>';
    } else {
      document.getElementById('ma-clients-list').innerHTML = listHtml;
    }
  }
  window.maRenderClients = renderClients;
  function clientCard(c) {
    var nameAttr = encodeURIComponent(c.name + '|' + c.phone);
    return '<div class="ma-card">'
      + '<div class="ma-card-top"><div class="ma-card-ava">' + esc(c.name.charAt(0).toUpperCase()) + '</div>'
      + '<div class="ma-card-info"><div class="ma-card-name">' + esc(c.name) + '</div>'
      + '<div class="ma-card-sub">' + esc(c.phone || 'Pas de téléphone') + '</div></div>'
      + (c.current ? '<span class="ma-badge blue">' + esc(c.current) + '</span>' : '') + '</div>'
      + '<div class="ma-card-meta"><div class="ma-meta">Payé<b>' + money(c.paid) + '</b></div>'
      + '<div class="ma-meta">Reste à payer<b style="color:' + (c.rest > 0 ? '#C41E3A' : '#16a34a') + ';">' + money(c.rest) + '</b></div></div>'
      + '<div class="ma-actions">'
      + (c.phone ? '<a class="ma-act-btn" href="tel:' + esc(c.phone) + '">' + ic('phone') + 'Appeler</a>' : '')
      + '<button class="ma-act-btn" onclick="maClientDetail(\'' + nameAttr + '\')">' + ic('file') + 'Historique</button>'
      + '<button class="ma-act-btn" onclick="maClientDetail(\'' + nameAttr + '\')">' + ic('wallet') + 'Paiements</button>'
      + '</div></div>';
  }
  window.maClientDetail = function (token) {
    var parts = decodeURIComponent(token).split('|');
    var name = parts[0], phone = parts[1] || '';
    var c = buildClients().filter(function (x) { return x.name === name && (x.phone || '') === phone; })[0];
    if (!c) return;
    var rows = c.items.sort(function (a, b) { return (b.startDate || '').localeCompare(a.startDate || ''); }).map(function (r) {
      var reste = Math.max(0, (Number(r.amount) || 0) - (Number(r.paid) || 0));
      return '<button class="ma-hist-row" onclick="closeSheet();maViewRes(\'' + String(r.id || '') + '\')">'
        + '<div><div class="ma-hist-car">' + esc(r.car || '—') + '</div>'
        + '<div class="ma-hist-dates">' + fmtDMT(r.startDate, r.startTime, '10:00') + ' → ' + fmtDMT(r.endDate, r.endTime, '18:00') + '</div></div>'
        + (reste > 0 ? '<span class="ma-badge red">Reste ' + money(reste) + '</span>' : '<span class="ma-badge green">Payé</span>')
        + '</button>';
    }).join('');
    openSheet(
      '<div class="ma-sheet-title">' + esc(name) + '</div>'
      + '<div class="ma-sheet-sub">' + esc(phone || 'Pas de téléphone') + ' · Payé ' + money(c.paid) + ' · Reste ' + money(c.rest) + '</div>'
      + (c.phone ? '<a class="ma-action" style="text-decoration:none;" href="tel:' + esc(c.phone) + '">' + ic('phone') + ' Appeler le client</a>' : '')
      + '<div class="ma-sheet-section">Historique des dossiers</div>'
      + (rows || '<div class="ma-empty" style="padding:18px;">Aucun dossier.</div>')
    );
  };

  /* ============ IMPAYÉS (liste complète) ============ */
  window.maOpenUnpaid = function () { maGo('unpaid'); };
  function renderUnpaidM() {
    var host = document.getElementById('ma-unpaid');
    if (!host) return;
    var ts = todayISO();
    var list = reservations().filter(function (r) {
      return r.status !== 'cancelled' && (Number(r.amount) || 0) > (Number(r.paid) || 0);
    }).sort(function (a, b) { return (b.endDate || '').localeCompare(a.endDate || ''); });
    var total = list.reduce(function (s, r) { return s + ((Number(r.amount) || 0) - (Number(r.paid) || 0)); }, 0);
    if (!list.length) { host.innerHTML = '<div class="ma-empty">✓ Aucun impayé. Tout est encaissé.</div>'; return; }
    host.innerHTML =
      '<div class="ma-cash-card" style="border-color:#C41E3A;margin-bottom:14px;"><div class="ma-cash-lbl">Total à encaisser</div><div class="ma-cash-num" style="color:#C41E3A;">' + money(total) + '</div></div>'
      + list.map(function (r) {
        var reste = (Number(r.amount) || 0) - (Number(r.paid) || 0);
        var late = (r.endDate || '') < ts && (r.status === 'active' || r.status === 'confirmed');
        return '<div class="ma-card">'
          + '<div class="ma-card-top"><div class="ma-card-ava">' + esc((r.client || '?').charAt(0).toUpperCase()) + '</div>'
          + '<div class="ma-card-info"><div class="ma-card-name">' + esc(r.client || 'Client') + '</div>'
          + '<div class="ma-card-sub">' + esc(r.car || '') + ' · ' + esc(r.contractRef || r.id || '') + '</div></div>'
          + '<span class="ma-badge red">' + money(reste) + '</span></div>'
          + '<div class="ma-card-meta"><div class="ma-meta">Total<b>' + money(r.amount || 0) + '</b></div>'
          + '<div class="ma-meta">Payé<b style="color:#16a34a;">' + money(r.paid || 0) + '</b></div>'
          + '<div class="ma-meta">Retour<b' + (late ? ' style="color:#C41E3A;"' : '') + '>' + fmtDateT(r.endDate, r.endTime, '18:00') + (late ? ' (retard)' : '') + '</b></div></div>'
          + '<div style="display:flex;gap:8px;margin-top:10px;">'
          + '<button class="ma-act-btn" onclick="maViewRes(\'' + r.id + '\')">Voir la fiche</button>'
          + '<button class="ma-act-btn ok" onclick="maPayUnpaid(\'' + r.id + '\')">Encaisser</button>'
          + '</div></div>';
      }).join('');
  }
  window.maPayUnpaid = function (resId) {
    var r = (ASLDB.getReservations() || []).filter(function (x) { return x.id === resId; })[0];
    if (!r) return;
    var reste = Math.max(0, (Number(r.amount) || 0) - (Number(r.paid) || 0));
    var amountStr = prompt('Montant encaissé (reste ' + money(reste) + ') :', String(Math.round(reste)));
    if (amountStr === null) return;
    var amount = parseFloat(amountStr) || 0;
    if (amount <= 0) { alert('Montant invalide.'); return; }
    if (amount > reste) amount = reste;
    var newPaid = (Number(r.paid) || 0) + amount;
    try { ASLDB.updateReservation(resId, { paid: newPaid, paymentStatus: newPaid >= (Number(r.amount) || 0) ? 'paid' : 'partial' }); } catch (e) {}
    if (typeof showToast === 'function') showToast('Paiement de ' + money(amount) + ' enregistré ✓');
    renderUnpaidM();
  };

  /* ============ SOUS-LOCATION (mobile) ============ */
  function renderSubleaseM() {
    var host = document.getElementById('ma-sublease');
    if (!host || typeof ASLSublease === 'undefined') return;
    var list = ASLSublease.list();
    var head = '<button class="ma-action" onclick="maNewSublease()">' + ic('plus') + ' Nouvelle sous-location</button>'
      + '<input type="search" id="ma-sub-search" class="ma-search" placeholder="Rechercher…" oninput="maRenderSubleaseList()">';
    host.innerHTML = head + '<div id="ma-sub-list"></div>';
    maRenderSubleaseList();
  }
  window.maRenderSubleaseList = function () {
    var box = document.getElementById('ma-sub-list');
    if (!box) return;
    var q = ((document.getElementById('ma-sub-search') || {}).value || '').toLowerCase().trim();
    var list = ASLSublease.list();
    if (q) list = list.filter(function (s) { return ((s.name || '') + ' ' + (s.phone || '')).toLowerCase().indexOf(q) >= 0; });
    if (!list.length) { box.innerHTML = '<div class="ma-empty">Aucune sous-location.</div>'; return; }
    box.innerHTML = list.map(function (s) {
      var st = ASLSublease.stats(s.id);
      return '<div class="ma-card" onclick="maSubleaseFiche(\'' + s.id + '\')">'
        + '<div class="ma-card-top"><div class="ma-card-ava">' + esc((s.name || '?').charAt(0).toUpperCase()) + '</div>'
        + '<div class="ma-card-info"><div class="ma-card-name">' + esc(s.name) + '</div>'
        + '<div class="ma-card-sub">' + esc(s.phone || 'Pas de téléphone') + ' · ' + st.count + ' location(s)</div></div>'
        + '<span class="ma-badge ' + (st.rest > 0 ? 'red' : 'green') + '">' + money(st.rest) + '</span></div>'
        + '<div class="ma-card-meta"><div class="ma-meta">Facturé<b>' + money(st.total) + '</b></div>'
        + '<div class="ma-meta">Payé<b style="color:#16a34a;">' + money(st.paid) + '</b></div>'
        + '<div class="ma-meta">Restant<b style="color:' + (st.rest > 0 ? '#C41E3A' : '#16a34a') + ';">' + money(st.rest) + '</b></div></div>'
        + '</div>';
    }).join('');
  };

  window.maNewSublease = function () {
    if (typeof openSubleaseModal === 'function') {
      openSubleaseModal(null, function () { maRenderSubleaseList(); });
    }
  };

  window.maSubleaseFiche = function (id) {
    var sub = ASLSublease.get(id);
    if (!sub) return;
    var st = ASLSublease.stats(id);
    var rows = ASLSublease.linkedRes(id);
    var rowsHtml = rows.length ? rows.map(function (r) {
      var reste = Math.max(0, (Number(r.amount) || 0) - (Number(r.paid) || 0));
      var plate = r.assignedPlate || (function () { try { var f = ASLDB.getFleet().filter(function (c) { return c.name === r.car || c.id === r.carId; })[0]; return f ? (f.plate || '') : ''; } catch (e) { return ''; } })();
      return '<div class="ma-card">'
        + '<div class="ma-card-top"><div class="ma-card-info"><div class="ma-card-name">' + esc(r.finalClient || r.client || 'Client') + '</div>'
        + '<div class="ma-card-sub">' + esc(r.car || '') + (plate ? ' · ' + esc(plate) : '') + '</div></div>'
        + '<span class="ma-badge ' + (reste > 0 ? 'red' : 'green') + '">' + (reste > 0 ? money(reste) : 'Soldé') + '</span></div>'
        + '<div class="ma-card-meta"><div class="ma-meta">Dates<b>' + fmtDMT(r.startDate, r.startTime, '10:00') + ' → ' + fmtDMT(r.endDate, r.endTime, '18:00') + '</b></div>'
        + '<div class="ma-meta">Total<b>' + money(r.amount || 0) + '</b></div>'
        + '<div class="ma-meta">Payé<b style="color:#16a34a;">' + money(r.paid || 0) + '</b></div></div>'
        + '<div style="display:flex;gap:8px;margin-top:10px;">'
        + '<button class="ma-act-btn" onclick="maCloseSheet();maViewRes(\'' + r.id + '\')">Voir</button>'
        + (reste > 0 ? '<button class="ma-act-btn ok" onclick="maSubPay(\'' + id + '\',\'' + r.id + '\')">Marquer payé</button>' : '')
        + '</div></div>';
    }).join('') : '<div class="ma-empty">Aucune location liée.</div>';

    openSheet(
      '<div class="ma-sheet-title">' + esc(sub.name) + '</div>'
      + '<div style="display:flex;gap:14px;flex-wrap:wrap;font-size:13px;color:#556;margin-bottom:14px;">'
      + (sub.phone ? '<a href="tel:' + esc(sub.phone) + '" style="color:#2563eb;text-decoration:none;">📞 ' + esc(sub.phone) + '</a>' : '')
      + (sub.whatsapp ? '<a href="https://wa.me/' + esc(sub.whatsapp.replace(/[^0-9]/g, '')) + '" target="_blank" style="color:#16a34a;text-decoration:none;">💬 WhatsApp</a>' : '')
      + '</div>'
      + (sub.notes ? '<div style="background:#f5f6f8;border-radius:10px;padding:11px;font-size:12.5px;color:#556;margin-bottom:14px;">📝 ' + esc(sub.notes) + '</div>' : '')
      + '<div class="ma-stats" style="margin-bottom:8px;">'
      + '<div class="ma-stat" style="cursor:default;"><div class="ma-stat-num" style="font-size:20px;">' + st.count + '</div><div class="ma-stat-lbl">Locations</div></div>'
      + '<div class="ma-stat" style="cursor:default;"><div class="ma-stat-num green" style="font-size:18px;">' + money(st.paid) + '</div><div class="ma-stat-lbl">Payé</div></div>'
      + '<div class="ma-stat" style="cursor:default;"><div class="ma-stat-num" style="font-size:18px;">' + money(st.total) + '</div><div class="ma-stat-lbl">Facturé</div></div>'
      + '<div class="ma-stat" onclick="maSubUnpaid(\'' + id + '\')"><div class="ma-stat-num red" style="font-size:18px;">' + money(st.rest) + '</div><div class="ma-stat-lbl">Restant dû →</div></div>'
      + '</div>'
      + '<div class="ma-sheet-section">Historique</div>'
      + rowsHtml
    );
  };

  window.maSubUnpaid = function (id) {
    var sub = ASLSublease.get(id);
    if (!sub) return;
    var unpaid = ASLSublease.linkedRes(id).filter(function (r) { return (Number(r.amount) || 0) > (Number(r.paid) || 0); });
    var total = unpaid.reduce(function (s, r) { return s + ((Number(r.amount) || 0) - (Number(r.paid) || 0)); }, 0);
    var rows = unpaid.length ? unpaid.map(function (r) {
      var reste = (Number(r.amount) || 0) - (Number(r.paid) || 0);
      return '<div class="ma-card">'
        + '<div class="ma-card-top"><div class="ma-card-info"><div class="ma-card-name">' + esc(r.finalClient || r.client || 'Client') + '</div>'
        + '<div class="ma-card-sub">' + esc(r.car || '') + ' · ' + fmtDMT(r.startDate, r.startTime, '10:00') + ' → ' + fmtDMT(r.endDate, r.endTime, '18:00') + '</div></div>'
        + '<span class="ma-badge red">' + money(reste) + '</span></div>'
        + '<div class="ma-card-meta"><div class="ma-meta">Total<b>' + money(r.amount || 0) + '</b></div>'
        + '<div class="ma-meta">Payé<b style="color:#16a34a;">' + money(r.paid || 0) + '</b></div></div>'
        + '<div style="display:flex;gap:8px;margin-top:10px;">'
        + '<button class="ma-act-btn" onclick="maCloseSheet();maViewRes(\'' + r.id + '\')">Voir location</button>'
        + '<button class="ma-act-btn ok" onclick="maSubPay(\'' + id + '\',\'' + r.id + '\')">Marquer payé</button>'
        + '</div></div>';
    }).join('') : '<div class="ma-empty">✓ Aucun impayé.</div>';
    openSheet(
      '<div class="ma-sheet-title">Impayés — ' + esc(sub.name) + '</div>'
      + '<div style="font-size:14px;font-weight:800;color:#C41E3A;margin-bottom:14px;">Total impayé : ' + money(total) + '</div>'
      + rows
    );
  };

  window.maSubPay = function (subId, resId) {
    var r = (ASLDB.getReservations() || []).filter(function (x) { return x.id === resId; })[0];
    if (!r) return;
    var reste = Math.max(0, (Number(r.amount) || 0) - (Number(r.paid) || 0));
    var amountStr = prompt('Montant encaissé (reste ' + money(reste) + ') :', String(Math.round(reste)));
    if (amountStr === null) return;
    var amount = parseFloat(amountStr) || 0;
    if (amount <= 0) { alert('Montant invalide.'); return; }
    if (amount > reste) amount = reste;
    var newPaid = (Number(r.paid) || 0) + amount;
    try { ASLDB.updateReservation(resId, { paid: newPaid, paymentStatus: newPaid >= (Number(r.amount) || 0) ? 'paid' : 'partial' }); } catch (e) {}
    if (typeof showToast === 'function') showToast('Paiement de ' + money(amount) + ' enregistré ✓');
    maCloseSheet();
    maSubleaseFiche(subId);
    maRenderSubleaseList();
  };

  /* ============ CAISSE / PAIEMENTS (simplifiée) ============ */
  function renderCaisse() {
    var host = document.getElementById('ma-caisse');
    if (!host) return;
    var t = totals();
    host.innerHTML =
      cashCard('wallet', 'Encaissements réels', t.enc, '#16a34a')
      + cashCard('receipt', 'Charges', t.chg, '#dc2626')
      + cashCard('scale', 'Solde réel', t.soldeReel, '#101216')
      + '<div class="ma-cash-card" style="border-left-color:#d97706;cursor:pointer;" onclick="maGo(\'notifications\')">'
      + '<div class="ma-cash-ico" style="color:#d97706;">' + ic('hourglass') + '</div>'
      + '<div><div class="ma-cash-lbl">Montants à encaisser</div><div class="ma-cash-num" style="color:#d97706;">' + money(t.rest) + '</div></div></div>'
      + '<button class="ma-action dark" onclick="maOpenLedger()">' + ic('ledger') + ' Grand Livre (consultation)</button>';
  }
  function cashCard(icon, label, val, color) {
    return '<div class="ma-cash-card" style="border-left-color:' + color + ';">'
      + '<div class="ma-cash-ico" style="color:' + color + ';">' + ic(icon) + '</div>'
      + '<div><div class="ma-cash-lbl">' + label + '</div><div class="ma-cash-num" style="color:' + color + ';">' + money(val) + '</div></div></div>';
  }
  window.maOpenLedger = function () {
    if (typeof window.showPage !== 'function') return;
    enterDesktopView();
    // showPage('caisse') déclenche déjà renderCaisse via le dispatch desktop.
    window.showPage('caisse', null);
    // On bascule ensuite sur l'onglet Rapports (Grand Livre), une seule fois.
    setTimeout(function () {
      try { if (typeof window.caisseTab === 'function') window.caisseTab('rapports'); } catch (e) {}
    }, 150);
    maShowBackToApp();
  };
  function enterDesktopView() {
    document.body.classList.remove('ma-locked', 'ma-modal-open');
    closeSheet();
    document.body.classList.add('ma-desktop-view');
  }
  function maShowBackToApp() {
    if (document.getElementById('ma-back-to-app')) return;
    var b = document.createElement('button');
    b.id = 'ma-back-to-app';
    b.innerHTML = '&#8592; Retour au tableau de bord';
    b.onclick = function () {
      document.body.classList.remove('ma-desktop-view', 'ma-locked', 'ma-modal-open');
      b.remove();
      // Réinitialise l'onglet Caisse à « Résumé » pour qu'il soit toujours
      // sain au prochain accès (évite les boutons bloqués après Grand Livre).
      try { if (typeof window.caisseTab === 'function') window.caisseTab('resume'); } catch (e) {}
      // Règle simple : toute vue desktop ponctuelle revient au tableau de bord.
      try { window.maGo('dashboard'); } catch (e) {}
    };
    document.body.appendChild(b);
  }
  window.maExitToPage = function (page) {
    enterDesktopView();
    if (typeof window.showPage === 'function') window.showPage(page, null);
    maShowBackToApp();
  };

  /* ============ NOTIFICATIONS ============ */
  function renderNotifications() {
    var host = document.getElementById('ma-notifications');
    var r = reservations(), ts = todayISO();
    var notifs = [];
    function add(icon, tone, title, sub, id) { notifs.push({ icon: icon, tone: tone, title: title, sub: sub, id: id }); }
    r.filter(function (x) { return (x.endDate || '').slice(0, 10) === ts && x.status !== 'cancelled' && x.status !== 'completed'; })
      .forEach(function (x) { add('returns', 'orange', 'Retour aujourd\'hui', (x.car || '') + ' — ' + (x.client || ''), x.id); });
    var tmStr = plusDaysISO(1);
    r.filter(function (x) { return (x.endDate || '').slice(0, 10) === tmStr && x.status !== 'cancelled' && x.status !== 'completed'; })
      .forEach(function (x) { add('calendarClock', 'blue', 'Retour demain', (x.car || '') + ' — ' + (x.client || ''), x.id); });
    r.filter(function (x) { return (x.endDate || '') < ts && (x.status === 'active' || x.status === 'confirmed'); })
      .forEach(function (x) { add('alert', 'red', 'Véhicule en retard', (x.car || '') + ' — ' + (x.client || '') + ' (prévu le ' + (x.endDate || '') + ')', x.id); });
    r.filter(function (x) { return x.status !== 'cancelled' && (Number(x.amount) || 0) > (Number(x.paid) || 0); })
      .forEach(function (x) { var reste = (Number(x.amount) || 0) - (Number(x.paid) || 0); add('card', 'red', 'Impayé : ' + money(reste), (x.client || '') + ' — ' + (x.car || ''), x.id); });
    var cutoff = Date.now() - 48 * 3600 * 1000;
    r.filter(function (x) { return x.createdAt && new Date(x.createdAt).getTime() > cutoff && x.status === 'pending'; })
      .forEach(function (x) { add('sparkle', 'green', 'Nouvelle réservation', (x.client || '') + ' — ' + (x.car || '') + (x.source === 'online' ? ' (site web)' : ''), x.id); });
    r.filter(function (x) { return x.createdAt && new Date(x.createdAt).getTime() > cutoff && (x.status === 'active' || x.status === 'confirmed'); })
      .forEach(function (x) { add('key', 'teal', 'Nouvelle location', (x.client || '') + ' — ' + (x.car || ''), x.id); });
    r.filter(function (x) { return x.createdAt && new Date(x.createdAt).getTime() > cutoff && (Number(x.paid) || 0) > 0 && (Number(x.paid) || 0) >= (Number(x.amount) || 0); })
      .forEach(function (x) { add('checkCircle', 'green', 'Paiement reçu', (x.client || '') + ' — ' + money(x.paid), x.id); });

    /* Rappels de vérification vidange (tous les 20 jours) */
    var MAINT = {};
    try { MAINT = JSON.parse(localStorage.getItem('asl_maint_v1') || '{}'); } catch (e) {}
    var fl = fleet();
    var todayMs = (function () { var d = new Date(); d.setHours(0, 0, 0, 0); return d.getTime(); })();
    fl.forEach(function (c) {
      var m = MAINT[String(c.id)] || {};
      if (m.reminder_next && new Date(m.reminder_next).getTime() <= todayMs + 86400000) {
        var kmTxt = m.km_vidange_next ? Number(m.km_vidange_next).toLocaleString('fr-FR') + ' km' : '—';
        notifs.push({ icon: 'wrench', tone: 'orange', title: 'Vérifier le km de ' + (c.name || ''), sub: 'Prochaine vidange prévue à ' + kmTxt, id: '', maint: true });
      }
    });

    if (host) {
      host.innerHTML = notifs.length ? notifs.map(function (n) {
        var clk = n.maint ? 'maExitToPage(\'maintenance\')' : 'maViewRes(\'' + String(n.id || '') + '\')';
        return '<div class="ma-notif" onclick="' + clk + '"><div class="ma-notif-ico ' + n.tone + '">' + ic(n.icon) + '</div>'
          + '<div class="ma-notif-body"><div class="ma-notif-title">' + esc(n.title) + '</div><div class="ma-notif-sub">' + esc(n.sub) + '</div></div>'
          + '<span class="ma-notif-chev">' + ic('returns') + '</span></div>';
      }).join('') : '<div class="ma-empty">' + ic('checkCircle') + '<div style="margin-top:8px;">Aucune notification. Tout est à jour.</div></div>';
    }
    var dot = document.querySelector('.ma-tab[data-screen="notifications"] .ma-tab-dot');
    if (dot) { if (notifs.length) { dot.textContent = notifs.length > 99 ? '99+' : notifs.length; dot.style.display = 'flex'; } else dot.style.display = 'none'; }
    var hdot = document.getElementById('ma-head-dot');
    if (hdot) hdot.style.display = notifs.length ? 'block' : 'none';
  }

  /* ============ "PLUS" : modules mobiles autorisés ============ */
  window.maOpenMore = function () {
    var items = [
      { ico: 'key', label: 'Locations en cours', act: "maMore('rentals')", perm: null },
      { ico: 'handshake', label: 'Sous-location', act: "maMore('sublease')", perm: 'sublease' },
      { ico: 'users', label: 'Clients', act: "maMore('clients')", perm: null }
    ];
    var visible = items.filter(function (it) { return !it.perm || can(it.perm); });
    var canCreate = can('reservations') || can('rentals');
    openSheet(
      '<div class="ma-sheet-title">Plus</div>'
      + (canCreate
          ? '<div class="ma-sheet-section">Créer</div>'
            + (can('reservations') ? '<button class="ma-action" onclick="maNewReservation()">' + ic('calendar') + ' Nouvelle réservation</button>' : '')
            + (can('rentals') || can('reservations') ? '<button class="ma-action dark" onclick="maNewLocation()">' + ic('key') + ' Nouvelle location</button>' : '')
          : '')
      + '<div class="ma-sheet-section">Accès</div>'
      + visible.map(function (it) { return '<button class="ma-sheet-item" onclick="' + it.act + '"><span class="ma-sheet-ico">' + ic(it.ico) + '</span>' + it.label + '</button>'; }).join('')
      + '<button class="ma-sheet-item danger" onclick="maLogout()"><span class="ma-sheet-ico">' + ic('logout') + '</span>Se déconnecter</button>'
    );
  };
  /* Réservation / location manuelles : réutilisent EXACTEMENT la logique
     desktop (openModal). Le formulaire s'affiche au-dessus de l'app mobile,
     adapté tactile par le CSS (champs empilés, 16px, gros boutons). */
  window.maNewReservation = function () {
    closeSheet();
    if (typeof window.openModal === 'function') window.openModal('new-reservation');
  };
  window.maNewLocation = function () {
    closeSheet();
    if (typeof window.openModal === 'function') window.openModal('new-location');
  };
  window.maMore = function (screen) { closeSheet(); maGo(screen); };
  window.maLogout = function () {
    closeSheet();
    if (typeof window.logout === 'function') { window.logout(); return; }
    try { localStorage.removeItem('asl_admin_session'); } catch (e) {}
    window.location.replace('login.html');
  };

  /* ============ FEUILLE GÉNÉRIQUE (bottom-sheet) ============ */
  function lockScroll() {
    var app = document.getElementById('asl-mobile-app');
    if (app) { window._maScrollY = app.scrollTop; }
    document.body.classList.add('ma-locked');
  }
  function unlockScroll() {
    document.body.classList.remove('ma-locked');
  }
  function openSheet(innerHtml) {
    closeSheet();
    var sheet = document.createElement('div');
    sheet.className = 'ma-sheet';
    sheet.onclick = function (e) { if (e.target === sheet) closeSheet(); };
    sheet.innerHTML = '<div class="ma-sheet-inner"><div class="ma-sheet-handle"></div><button class="ma-sheet-close" aria-label="Fermer" onclick="closeSheet()">' + ic('x') + '</button><div class="ma-sheet-scroll">' + innerHtml + '</div></div>';
    document.body.appendChild(sheet);
    window._maSheet = sheet;
    lockScroll();
  }
  function closeSheet() {
    if (window._maSheet) { window._maSheet.remove(); window._maSheet = null; unlockScroll(); }
  }
  window.maCloseSheet = closeSheet;
  window.closeSheet = closeSheet;

  /* ============ INIT / SHELL ============ */
  function buildShell() {
    if (document.getElementById('asl-mobile-app')) return;
    var greet = (window.ASL_ADMIN_USER ? window.ASL_ADMIN_USER : 'Admin');

    var app = document.createElement('div');
    app.id = 'asl-mobile-app';
    app.innerHTML =
      '<div class="ma-head">'
      + '<button class="ma-head-back" id="ma-head-back" aria-label="Retour" onclick="window.maGo(\'dashboard\')" style="display:none;">' + ic('arrowLeft') + '</button>'
      + '<img class="ma-head-logo" src="data:image/png;base64,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" alt="All Star Loc">'
      + '<div class="ma-head-txt"><h1 id="ma-title">Tableau de bord</h1><div class="ma-greet">Bonjour ' + esc(greet) + '</div></div>'
      + '<button class="ma-head-btn" aria-label="Notifications" onclick="maToggleNotifications()">' + ic('bell') + '<span class="ma-dot" id="ma-head-dot" style="display:none;"></span></button></div>'
      + screen('dashboard') + screen('vehicles') + screen('available') + screen('reserved') + screen('activites') + screen('reservations') + screen('rentals')
      + screen('returns') + screen('late') + screen('clients') + screen('sublease') + screen('unpaid') + screen('revenue') + screen('caisse') + screen('notifications');
    document.body.appendChild(app);

    var tabsAll = [
      ['dashboard', 'Accueil', 'grid', 'dashboard'],
      ['vehicles', 'Véhicules', 'car', 'fleet'],
      ['reservations', 'Réservations', 'calendar', 'reservations'],
      ['caisse', 'Caisse', 'wallet', 'caisse'],
      ['__more', 'Plus', 'more', null]
    ];
    var tabs = tabsAll.filter(function (t) { return !t[3] || can(t[3]); });
    var bar = document.createElement('div');
    bar.id = 'asl-mobile-tabbar';
    bar.innerHTML = tabs.map(function (t) {
      var onclick = t[0] === '__more' ? 'maOpenMore()' : "maGo('" + t[0] + "')";
      return '<button class="ma-tab' + (t[0] === 'dashboard' ? ' active' : '') + '" data-screen="' + t[0] + '" onclick="' + onclick + '">'
        + ic(t[2]) + '<span>' + t[1] + '</span></button>';
    }).join('');
    document.body.appendChild(bar);

    var titles = { dashboard: 'Tableau de bord', vehicles: 'Véhicules', available: 'Disponibles', reserved: 'Véhicules réservés', activites: 'Activités du jour', reservations: 'Réservations', rentals: 'Véhicules loués', returns: "Retours aujourd'hui", late: 'En retard', clients: 'Clients', sublease: 'Sous-location', unpaid: 'Impayés', revenue: 'Revenus', caisse: 'Paiements & Caisse', notifications: 'Notifications' };
    window.maGo = function (s) {
      var titleEl = document.getElementById('ma-title');
      if (titleEl && titles[s]) titleEl.textContent = titles[s];
      rawGo(s);
    };
  }

  function screen(id) {
    return '<div class="ma-screen' + (id === 'dashboard' ? ' active' : '') + '" id="ma-' + id + '"></div>';
  }

  /* ============================================================
     SYNCHRONISATION — sans badge fixe sur mobile.
     Le badge desktop (#asl-sync-badge) est masqué par CSS en mobile.
     On ne signale QUE les erreurs réelles, via une bannière discrète.
     ============================================================ */
  function watchSync() {
    var badge = document.getElementById('asl-sync-badge');
    if (!badge) { setTimeout(watchSync, 1000); return; }
    function evaluate() {
      if (!isMobile()) { hideSyncError(); return; }
      var txt = (badge.textContent || '').toLowerCase();
      // « erreur réelle » = clé admin invalide / problème d'authentification serveur.
      var realError = txt.indexOf('invalide') >= 0 || txt.indexOf('erreur') >= 0;
      if (realError) showSyncError(badge.textContent.trim()); else hideSyncError();
    }
    try { new MutationObserver(evaluate).observe(badge, { childList: true, subtree: true, characterData: true }); } catch (e) {}
    evaluate();
  }
  function showSyncError(msg) {
    var b = document.getElementById('ma-sync-error');
    if (!b) {
      b = document.createElement('div');
      b.id = 'ma-sync-error';
      b.innerHTML = '<span class="ma-sync-error-ic">' + ic('alert') + '</span><span class="ma-sync-error-msg"></span>'
        + '<button class="ma-sync-error-x" aria-label="Fermer" onclick="this.parentNode.style.display=\'none\'">' + ic('x') + '</button>';
      document.body.appendChild(b);
    }
    b.querySelector('.ma-sync-error-msg').textContent = msg || 'Erreur de synchronisation';
    b.style.display = 'flex';
  }
  function hideSyncError() { var b = document.getElementById('ma-sync-error'); if (b) b.style.display = 'none'; }

  function start() {
    if (!isMobile()) return;
    buildShell();
    window.maGo('dashboard');
    try { if (typeof ASLDB !== 'undefined' && ASLDB.onChange) ASLDB.onChange(function () { if (isMobile()) renderScreen(current); }); } catch (e) {}
    setTimeout(function () { renderNotifications(); window.maGo('dashboard'); }, 200);
    watchSync();
    hookModalLock();
  }

  /* Verrou de défilement quand la modale desktop (réservation/location)
     est ouverte sur mobile : l'arrière-plan ne bouge plus. */
  function hookModalLock() {
    if (typeof window.openModal === 'function' && !window._maModalHooked) {
      var origOpen = window.openModal;
      window.openModal = function () { var r = origOpen.apply(this, arguments); if (isMobile()) document.body.classList.add('ma-modal-open'); return r; };
      window._maModalHooked = true;
    }
    if (typeof window.closeModal === 'function' && !window._maCloseHooked) {
      var origClose = window.closeModal;
      window.closeModal = function () { document.body.classList.remove('ma-modal-open'); return origClose.apply(this, arguments); };
      window._maCloseHooked = true;
    }
  }

  if (document.readyState !== 'loading') start();
  else document.addEventListener('DOMContentLoaded', start);
})();
