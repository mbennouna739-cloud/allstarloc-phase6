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
    bell: '<path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/>',
    users: '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>',
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
    wrench: '<path d="M14.7 6.3a4 4 0 0 0-5.4 5.3L3 18l3 3 6.4-6.3a4 4 0 0 0 5.3-5.4l-2.5 2.5-2.1-2.1Z"/>',
    search: '<circle cx="11" cy="11" r="7"/><path d="m21 21-4.3-4.3"/>',
    sparkle: '<path d="M12 3v3M12 18v3M3 12h3M18 12h3M5.6 5.6l2.1 2.1M16.3 16.3l2.1 2.1M18.4 5.6l-2.1 2.1M7.7 16.3l-2.1 2.1"/>'
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
    return {
      available: f.filter(function (c) { return c.status === 'available'; }).length,
      rented: f.filter(function (c) { return c.status === 'rented' || c.status === 'active'; }).length,
      pending: r.filter(function (x) { return x.status === 'pending'; }).length,
      returnsToday: r.filter(function (x) { return (x.endDate || '').slice(0, 10) === ts && x.status !== 'cancelled' && x.status !== 'completed'; }).length,
      late: r.filter(function (x) { return (x.endDate || '') < ts && (x.status === 'active' || x.status === 'confirmed'); }).length,
      unpaid: r.filter(function (x) { return x.status !== 'cancelled' && (Number(x.amount) || 0) > (Number(x.paid) || 0); }).length
    };
  }

  /* ============ NAVIGATION ============ */
  var current = 'dashboard';
  function rawGo(screen) {
    current = screen;
    document.querySelectorAll('.ma-screen').forEach(function (s) { s.classList.toggle('active', s.id === 'ma-' + screen); });
    document.querySelectorAll('.ma-tab').forEach(function (t) { t.classList.toggle('active', t.getAttribute('data-screen') === screen); });
    var app = document.getElementById('asl-mobile-app');
    if (app) app.scrollTop = 0;
    renderScreen(screen);
  }
  window.maGo = rawGo;

  function renderScreen(screen) {
    if (screen === 'dashboard') renderDash();
    else if (screen === 'vehicles') renderVehicles();
    else if (screen === 'reservations') renderReservations();
    else if (screen === 'rentals') renderRentals();
    else if (screen === 'returns') renderReturns();
    else if (screen === 'clients') renderClients();
    else if (screen === 'caisse') renderCaisse();
    else if (screen === 'notifications') renderNotifications();
  }

  /* ============ TABLEAU DE BORD ============ */
  function renderDash() {
    var c = counts(), t = totals();
    var cards = [
      { num: c.available, lbl: 'Véhicules disponibles', cls: 'green', ico: 'car', act: "maGo('vehicles')" },
      { num: c.rented, lbl: 'Véhicules loués', cls: 'blue', ico: 'key', act: "maGo('rentals')" },
      { num: c.pending, lbl: 'Réservations en attente', cls: 'orange', ico: 'clock', act: "maGo('reservations')" },
      { num: c.returnsToday, lbl: 'Retours prévus', cls: 'red', ico: 'returns', act: "maGo('returns')" },
      { num: money(t.enc), lbl: 'Encaissements réels', cls: 'teal', ico: 'wallet', act: "maGo('caisse')", small: true },
      { num: money(t.rest), lbl: 'Montants à encaisser', cls: 'purple', ico: 'hourglass', act: "maGo('caisse')", small: true }
    ];
    var host = document.getElementById('ma-dashboard');
    if (!host) return;
    host.innerHTML =
      '<div class="ma-stats">' + cards.map(function (k) {
        return '<button type="button" class="ma-stat" onclick="' + k.act + '">'
          + '<div class="ma-stat-ico ' + k.cls + '">' + ic(k.ico) + '</div>'
          + '<div class="ma-stat-num ' + k.cls + '"' + (k.small ? ' style="font-size:18px;"' : '') + '>' + k.num + '</div>'
          + '<div class="ma-stat-lbl">' + k.lbl + '</div></button>';
      }).join('') + '</div>'
      + (c.late || c.unpaid ? '<div class="ma-section-title">À surveiller</div>' : '')
      + (c.late ? alertRow('alert', c.late + ' retard(s)', 'Véhicules non rendus à temps', "maGo('returns')", 'red') : '')
      + (c.unpaid ? alertRow('card', c.unpaid + ' impayé(s)', 'Dossiers avec reste à payer', "maGo('notifications')", 'orange') : '');
  }
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
      + '</div></div>';
  }
  window.maViewVehicle = function (id) {
    if (typeof window.viewVehicle === 'function') { window.viewVehicle(id); return; }
    maEditVehicle(id);
  };
  window.maEditVehicle = function (id) {
    if (typeof window.editVehicle === 'function') { window.editVehicle(id); return; }
    maExitToPage('fleet');
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
    var stMap = { pending: ['orange', 'En attente'], confirmed: ['blue', 'Confirmée'], active: ['green', 'En cours'], reserved: ['orange', 'Réservée'], completed: ['gray', 'Terminée'], cancelled: ['red', 'Annulée'] };
    var st = stMap[r.status] || ['gray', r.status || '—'];
    var payBadge = reste > 0 ? '<span class="ma-badge red">Reste ' + money(reste) + '</span>' : '<span class="ma-badge green">Payé</span>';
    var idStr = "'" + String(r.id || '') + "'";
    var actions;
    if (kind === 'rental') {
      actions = '<div class="ma-actions">'
        + '<button class="ma-act-btn" onclick="maViewRental(' + idStr + ')">' + ic('eye') + 'Fiche</button>'
        + '<button class="ma-act-btn" onclick="maReturnVehicle(' + idStr + ')">' + ic('returns') + 'Retour</button>'
        + '<button class="ma-act-btn" onclick="maExtend(' + idStr + ')">' + ic('plus') + 'Prolonger</button>'
        + '</div>';
    } else {
      var validable = r.status === 'pending' || r.status === 'reserved';
      actions = '<div class="ma-actions">'
        + '<button class="ma-act-btn" onclick="maViewRes(' + idStr + ')">' + ic('eye') + 'Voir</button>'
        + (validable ? '<button class="ma-act-btn ok" onclick="maConfirmRes(' + idStr + ')">' + ic('check') + 'Valider</button>' : '')
        + (validable ? '<button class="ma-act-btn danger" onclick="maCancelRes(' + idStr + ')">' + ic('x') + 'Refuser</button>' : '')
        + '<button class="ma-act-btn" onclick="maViewRes(' + idStr + ')">' + ic('edit') + 'Modifier</button>'
        + '</div>';
    }
    return '<div class="ma-card">'
      + '<div class="ma-card-top"><div class="ma-card-ava">' + esc((r.client || '?').charAt(0).toUpperCase()) + '</div>'
      + '<div class="ma-card-info"><div class="ma-card-name">' + esc(r.client || 'Client') + '</div>'
      + '<div class="ma-card-sub">' + esc(r.car || '') + ' · ' + esc(r.contractRef || r.id || '') + '</div></div>'
      + '<span class="ma-badge ' + st[0] + '">' + st[1] + '</span></div>'
      + '<div class="ma-card-meta">'
      + '<div class="ma-meta">Départ<b>' + esc(r.startDate || '—') + (r.startTime ? ' ' + r.startTime : '') + '</b></div>'
      + '<div class="ma-meta">Retour<b>' + esc(r.endDate || '—') + (r.endTime ? ' ' + r.endTime : '') + '</b></div>'
      + '<div class="ma-meta">Total<b>' + money(r.amount || 0) + '</b></div></div>'
      + '<div class="ma-pay-line">' + payBadge + '</div>'
      + actions + '</div>';
  }
  /* Actions réservations / locations — réutilisent les fonctions desktop */
  window.maViewRes = function (id) {
    if (typeof window.viewRes === 'function') { window.viewRes(id); return; }
    if (typeof window.viewRental === 'function') window.viewRental(id);
  };
  window.maViewRental = function (id) {
    if (typeof window.viewRental === 'function') { window.viewRental(id); return; }
    if (typeof window.viewRes === 'function') window.viewRes(id);
  };
  window.maConfirmRes = function (id) { if (typeof window.confirmRes === 'function') window.confirmRes(id); refreshSoon(); };
  window.maCancelRes = function (id) { if (typeof window.cancelRes === 'function') window.cancelRes(id); refreshSoon(); };
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
        + '<div class="ma-return-foot"><span>' + ic('eye') + ' Ouvrir la fiche</span><span class="ma-return-date">' + esc(r.endDate || '') + '</span></div>'
        + '</div>';
    }).join('') : '<div class="ma-empty">Aucun retour prévu pour cette date.</div>';
    host.innerHTML = head + body;
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
        + '<div class="ma-hist-dates">' + esc(r.startDate || '') + ' → ' + esc(r.endDate || '') + '</div></div>'
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
    if (typeof window.showPage === 'function') {
      document.body.classList.add('ma-desktop-view');
      window.showPage('caisse', null);
      if (typeof window.caisseTab === 'function') setTimeout(function () { window.caisseTab('rapports'); }, 100);
      maShowBackToApp();
    }
  };
  function maShowBackToApp() {
    if (document.getElementById('ma-back-to-app')) return;
    var b = document.createElement('button');
    b.id = 'ma-back-to-app';
    b.innerHTML = '&#8592; Retour à l\'application';
    b.onclick = function () { document.body.classList.remove('ma-desktop-view'); b.remove(); };
    document.body.appendChild(b);
  }
  window.maExitToPage = function (page) {
    document.body.classList.add('ma-desktop-view');
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

    if (host) {
      host.innerHTML = notifs.length ? notifs.map(function (n) {
        return '<div class="ma-notif" onclick="maViewRes(\'' + String(n.id || '') + '\')"><div class="ma-notif-ico ' + n.tone + '">' + ic(n.icon) + '</div>'
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
      { ico: 'returns', label: 'Retours prévus', act: "maMore('returns')", perm: null },
      { ico: 'users', label: 'Clients', act: "maMore('clients')", perm: null },
      { ico: 'wallet', label: 'Paiements & Caisse', act: "maMore('caisse')", perm: 'caisse' }
    ];
    var visible = items.filter(function (it) { return !it.perm || can(it.perm); });
    openSheet(
      '<div class="ma-sheet-title">Plus</div>'
      + visible.map(function (it) { return '<button class="ma-sheet-item" onclick="' + it.act + '"><span class="ma-sheet-ico">' + ic(it.ico) + '</span>' + it.label + '</button>'; }).join('')
      + '<button class="ma-sheet-item danger" onclick="maLogout()"><span class="ma-sheet-ico">' + ic('logout') + '</span>Se déconnecter</button>'
    );
  };
  window.maMore = function (screen) { closeSheet(); maGo(screen); };
  window.maLogout = function () {
    closeSheet();
    if (typeof window.logout === 'function') { window.logout(); return; }
    try { localStorage.removeItem('asl_admin_session'); } catch (e) {}
    window.location.replace('login.html');
  };

  /* ============ FEUILLE GÉNÉRIQUE (bottom-sheet) ============ */
  function openSheet(innerHtml) {
    closeSheet();
    var sheet = document.createElement('div');
    sheet.className = 'ma-sheet';
    sheet.onclick = function (e) { if (e.target === sheet) closeSheet(); };
    sheet.innerHTML = '<div class="ma-sheet-inner"><div class="ma-sheet-handle"></div><button class="ma-sheet-close" aria-label="Fermer" onclick="closeSheet()">' + ic('x') + '</button>' + innerHtml + '</div>';
    document.body.appendChild(sheet);
    window._maSheet = sheet;
  }
  function closeSheet() { if (window._maSheet) { window._maSheet.remove(); window._maSheet = null; } }
  window.closeSheet = closeSheet;

  /* ============ INIT / SHELL ============ */
  function buildShell() {
    if (document.getElementById('asl-mobile-app')) return;
    var greet = (window.ASL_ADMIN_USER ? window.ASL_ADMIN_USER : 'Admin');

    var app = document.createElement('div');
    app.id = 'asl-mobile-app';
    app.innerHTML =
      '<div class="ma-head"><div class="ma-head-txt"><h1 id="ma-title">Tableau de bord</h1><div class="ma-greet">Bonjour ' + esc(greet) + '</div></div>'
      + '<button class="ma-head-btn" aria-label="Notifications" onclick="maGo(\'notifications\')">' + ic('bell') + '<span class="ma-dot" id="ma-head-dot" style="display:none;"></span></button></div>'
      + screen('dashboard') + screen('vehicles') + screen('reservations') + screen('rentals')
      + screen('returns') + screen('clients') + screen('caisse') + screen('notifications');
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

    var titles = { dashboard: 'Tableau de bord', vehicles: 'Véhicules', reservations: 'Réservations', rentals: 'Locations', returns: 'Retours prévus', clients: 'Clients', caisse: 'Paiements & Caisse', notifications: 'Notifications' };
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
  }

  if (document.readyState !== 'loading') start();
  else document.addEventListener('DOMContentLoaded', start);
})();
