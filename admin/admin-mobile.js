/* ============================================================
   ALL STAR LOC — Application mobile back-office (logique)
   Barre de navigation basse + écrans en cartes. Lit ASLDB (mêmes
   données que le desktop) et réutilise les fiches existantes
   (viewRes, etc.). Modules : Tableau de bord, Véhicules,
   Réservations, Locations, Clients, Caisse, Notifications, +Plus.
   Respecte les permissions employés (ASL_HAS_PERM).
   ============================================================ */
(function () {
  'use strict';

  function isMobile() { return window.innerWidth <= 768; }
  function money(n) { n = Math.round(Number(n) || 0); return n.toLocaleString('fr-FR').replace(/\u202f/g, ' ') + ' MAD'; }
  function esc(s) { return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }
  function todayISO() { var d = new Date(); d.setHours(0, 0, 0, 0); return d.toISOString().slice(0, 10); }

  function fleet() { try { return (ASLDB.getFleet && ASLDB.getFleet()) || []; } catch (e) { return []; } }
  function reservations() { try { return (ASLDB.getReservations && ASLDB.getReservations()) || []; } catch (e) { return []; } }
  function charges() { try { return JSON.parse(localStorage.getItem('asl_charges_v1') || '[]'); } catch (e) { return []; } }

  function can(perm) {
    if (typeof window.ASL_HAS_PERM === 'function') return window.ASL_HAS_PERM(perm);
    return true;
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
  window.maGo = function (screen) {
    current = screen;
    document.querySelectorAll('.ma-screen').forEach(function (s) { s.classList.toggle('active', s.id === 'ma-' + screen); });
    document.querySelectorAll('.ma-tab').forEach(function (t) { t.classList.toggle('active', t.getAttribute('data-screen') === screen); });
    var app = document.getElementById('asl-mobile-app');
    if (app) app.scrollTop = 0;
    renderScreen(screen);
  };

  function renderScreen(screen) {
    if (screen === 'dashboard') renderDash();
    else if (screen === 'vehicles') renderVehicles();
    else if (screen === 'reservations') renderReservations();
    else if (screen === 'rentals') renderRentals();
    else if (screen === 'clients') renderClients();
    else if (screen === 'caisse') renderCaisse();
    else if (screen === 'notifications') renderNotifications();
  }

  /* ============ TABLEAU DE BORD ============ */
  function renderDash() {
    var c = counts(), t = totals();
    var cards = [
      { num: c.available, lbl: 'Véhicules disponibles', cls: 'green', ico: '🚗', act: "maGo('vehicles')" },
      { num: c.rented, lbl: 'Véhicules loués', cls: 'blue', ico: '🔑', act: "maGo('rentals')" },
      { num: c.pending, lbl: 'Réservations en attente', cls: 'orange', ico: '⏳', act: "maGo('reservations')" },
      { num: c.returnsToday, lbl: "Retours aujourd'hui", cls: 'red', ico: '↩️', act: "maOpenReturns()" },
      { num: money(t.enc), lbl: 'Encaissements réels', cls: 'teal', ico: '💰', act: "maGo('caisse')", small: true },
      { num: money(t.rest), lbl: 'Montants à encaisser', cls: 'purple', ico: '📊', act: "maGo('caisse')", small: true }
    ];
    var host = document.getElementById('ma-dashboard');
    if (!host) return;
    host.innerHTML =
      '<div class="ma-stats">' + cards.map(function (k) {
        return '<div class="ma-stat" onclick="' + k.act + '">'
          + '<div class="ma-stat-ico ' + k.cls + '">' + k.ico + '</div>'
          + '<div class="ma-stat-num ' + k.cls + '"' + (k.small ? ' style="font-size:18px;"' : '') + '>' + k.num + '</div>'
          + '<div class="ma-stat-lbl">' + k.lbl + '</div></div>';
      }).join('') + '</div>'
      + (c.late || c.unpaid ? '<div class="ma-section-title">À surveiller</div>' : '')
      + (c.late ? alertRow('🔴', c.late + ' retard(s)', 'Véhicules non rendus à temps', "maGo('notifications')") : '')
      + (c.unpaid ? alertRow('💳', c.unpaid + ' impayé(s)', 'Dossiers avec reste à payer', "maGo('notifications')") : '');
  }
  function alertRow(ico, title, sub, act) {
    return '<div class="ma-notif" onclick="' + act + '"><div class="ma-notif-ico" style="background:rgba(196,30,58,.12);">' + ico + '</div>'
      + '<div class="ma-notif-body"><div class="ma-notif-title">' + title + '</div><div class="ma-notif-sub">' + sub + '</div></div></div>';
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
    var photo = c.photo || c.image || '';
    var imgHtml = photo ? '<img class="ma-card-photo" src="' + esc(photo) + '" alt="">' : '<div class="ma-card-photo"></div>';
    return '<div class="ma-card">'
      + '<div class="ma-card-top">' + imgHtml
      + '<div class="ma-card-info"><div class="ma-card-name">' + esc(c.name || 'Véhicule') + '</div>'
      + '<div class="ma-card-sub">' + esc(c.plate || c.immat || '—') + ' · ' + esc(c.category || '') + '</div></div>'
      + '<span class="ma-badge ' + st[0] + '">' + st[1] + '</span></div>'
      + '<div class="ma-card-meta"><div class="ma-meta">Prix/jour<b>' + money(c.priceMAD || c.price || 0) + '</b></div>'
      + '<div class="ma-meta">Carburant<b>' + esc(c.fuel || '—') + '</b></div>'
      + '<div class="ma-meta">Boîte<b>' + esc(c.transmission || '—') + '</b></div></div>'
      + '<button class="ma-card-btn ghost" onclick="maViewVehicle(' + (typeof c.id === 'number' ? c.id : "'" + c.id + "'") + ')">Voir la fiche</button>'
      + '</div>';
  }
  window.maViewVehicle = function (id) {
    // Réutilise la fiche véhicule desktop si dispo, sinon va à la page flotte
    if (typeof window.viewVehicle === 'function') { window.viewVehicle(id); return; }
    if (typeof window.editVehicle === 'function') { window.editVehicle(id); return; }
    if (typeof window.showPage === 'function') window.showPage('fleet', null);
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
    return '<div class="ma-card">'
      + '<div class="ma-card-top"><div class="ma-card-ava">' + esc((r.client || '?').charAt(0).toUpperCase()) + '</div>'
      + '<div class="ma-card-info"><div class="ma-card-name">' + esc(r.client || 'Client') + '</div>'
      + '<div class="ma-card-sub">' + esc(r.car || '') + ' · ' + esc(r.contractRef || r.id || '') + '</div></div>'
      + '<span class="ma-badge ' + st[0] + '">' + st[1] + '</span></div>'
      + '<div class="ma-card-meta">'
      + '<div class="ma-meta">Départ<b>' + esc(r.startDate || '—') + (r.startTime ? ' ' + r.startTime : '') + '</b></div>'
      + '<div class="ma-meta">Retour<b>' + esc(r.endDate || '—') + (r.endTime ? ' ' + r.endTime : '') + '</b></div>'
      + '<div class="ma-meta">Total<b>' + money(r.amount || 0) + '</b></div></div>'
      + '<div style="margin-top:10px;">' + payBadge + '</div>'
      + '<button class="ma-card-btn" onclick="maViewRes(\'' + (r.id || '') + '\')">Ouvrir la fiche</button>'
      + '</div>';
  }
  window.maViewRes = function (id) {
    if (typeof window.viewRes === 'function') { window.viewRes(id); return; }
    if (typeof window.viewRental === 'function') { window.viewRental(id); return; }
  };

  /* ============ CLIENTS ============ */
  function renderClients() {
    var host = document.getElementById('ma-clients');
    if (!host) return;
    var ts = todayISO();
    // Construire la liste clients depuis les réservations
    var map = {};
    reservations().forEach(function (r) {
      if (r.status === 'cancelled') return;
      var key = (r.client || '') + '|' + (r.phone || '');
      if (!map[key]) map[key] = { name: r.client || 'Client', phone: r.phone || '', current: '', paid: 0, rest: 0 };
      map[key].paid += Number(r.paid) || 0;
      map[key].rest += Math.max(0, (Number(r.amount) || 0) - (Number(r.paid) || 0));
      var active = (r.status === 'active' || r.status === 'confirmed') && (r.startDate || '') <= ts && (r.endDate || '') >= ts;
      if (active) map[key].current = r.car || '';
    });
    var clients = Object.keys(map).map(function (k) { return map[k]; }).filter(function (c) { return c.name; });
    var q = (document.getElementById('ma-client-search') || {}).value || '';
    if (q) { q = q.toLowerCase(); clients = clients.filter(function (c) { return (c.name + ' ' + c.phone).toLowerCase().indexOf(q) >= 0; }); }
    var listHtml = clients.length ? clients.map(clientCard).join('') : '<div class="ma-empty">Aucun client.</div>';
    if (!document.getElementById('ma-client-search')) {
      host.innerHTML = '<input type="search" id="ma-client-search" class="ma-search" placeholder="🔍 Rechercher un client…" oninput="maRenderClients()"><div id="ma-clients-list">' + listHtml + '</div>';
    } else {
      document.getElementById('ma-clients-list').innerHTML = listHtml;
    }
  }
  window.maRenderClients = renderClients;
  function clientCard(c) {
    return '<div class="ma-card">'
      + '<div class="ma-card-top"><div class="ma-card-ava">' + esc(c.name.charAt(0).toUpperCase()) + '</div>'
      + '<div class="ma-card-info"><div class="ma-card-name">' + esc(c.name) + '</div>'
      + '<div class="ma-card-sub">' + esc(c.phone || 'Pas de téléphone') + '</div></div>'
      + (c.current ? '<span class="ma-badge blue">' + esc(c.current) + '</span>' : '') + '</div>'
      + '<div class="ma-card-meta"><div class="ma-meta">Payé<b>' + money(c.paid) + '</b></div>'
      + '<div class="ma-meta">Reste à payer<b style="color:' + (c.rest > 0 ? '#C41E3A' : '#16a34a') + ';">' + money(c.rest) + '</b></div></div>'
      + (c.phone ? '<a class="ma-card-btn" style="text-decoration:none;display:block;" href="tel:' + esc(c.phone) + '">📞 Appeler</a>' : '')
      + '</div>';
  }

  /* ============ CAISSE (simplifiée) ============ */
  function renderCaisse() {
    var host = document.getElementById('ma-caisse');
    if (!host) return;
    var t = totals();
    host.innerHTML =
      '<div class="ma-cash-card" style="border-color:#16a34a;"><div class="ma-cash-lbl">💰 Encaissements réels</div><div class="ma-cash-num" style="color:#16a34a;">' + money(t.enc) + '</div></div>'
      + '<div class="ma-cash-card" style="border-color:#dc2626;"><div class="ma-cash-lbl">🧾 Charges</div><div class="ma-cash-num" style="color:#dc2626;">' + money(t.chg) + '</div></div>'
      + '<div class="ma-cash-card" style="border-color:#101216;"><div class="ma-cash-lbl">⚖️ Solde réel</div><div class="ma-cash-num" style="color:#101216;">' + money(t.soldeReel) + '</div></div>'
      + '<div class="ma-cash-card" style="border-color:#d97706;cursor:pointer;" onclick="maGo(\'notifications\')"><div class="ma-cash-lbl">⏳ Montants à encaisser</div><div class="ma-cash-num" style="color:#d97706;">' + money(t.rest) + '</div></div>'
      + '<button class="ma-action dark" onclick="maOpenLedger()">📒 Voir le Grand Livre</button>';
  }
  window.maOpenLedger = function () {
    // Bascule vers la vue desktop Caisse > Rapports (adaptée), via showPage
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
    b.textContent = '← Retour à l\'application';
    b.style.cssText = 'position:fixed;bottom:16px;left:50%;transform:translateX(-50%);z-index:9999;background:#101216;color:#fff;border:none;padding:12px 22px;border-radius:50px;font-weight:700;font-size:14px;box-shadow:0 6px 20px rgba(0,0,0,.25);cursor:pointer;';
    b.onclick = function () {
      document.body.classList.remove('ma-desktop-view');
      b.remove();
    };
    document.body.appendChild(b);
  }

  /* ============ NOTIFICATIONS ============ */
  function renderNotifications() {
    var host = document.getElementById('ma-notifications');
    if (!host) return;
    var r = reservations(), ts = todayISO();
    var notifs = [];
    // Retours aujourd'hui
    r.filter(function (x) { return (x.endDate || '').slice(0, 10) === ts && x.status !== 'cancelled' && x.status !== 'completed'; })
      .forEach(function (x) { notifs.push({ ico: '↩️', bg: 'rgba(217,119,6,.12)', title: 'Retour aujourd\'hui', sub: (x.car || '') + ' — ' + (x.client || ''), act: "maViewRes('" + x.id + "')" }); });
    // Retards
    r.filter(function (x) { return (x.endDate || '') < ts && (x.status === 'active' || x.status === 'confirmed'); })
      .forEach(function (x) { notifs.push({ ico: '🔴', bg: 'rgba(196,30,58,.12)', title: 'Retard de retour', sub: (x.car || '') + ' — ' + (x.client || '') + ' (prévu le ' + (x.endDate || '') + ')', act: "maViewRes('" + x.id + "')" }); });
    // Impayés
    r.filter(function (x) { return x.status !== 'cancelled' && (Number(x.amount) || 0) > (Number(x.paid) || 0); })
      .forEach(function (x) { var reste = (Number(x.amount) || 0) - (Number(x.paid) || 0); notifs.push({ ico: '💳', bg: 'rgba(196,30,58,.12)', title: 'Impayé : ' + money(reste), sub: (x.client || '') + ' — ' + (x.car || ''), act: "maViewRes('" + x.id + "')" }); });
    // Échéances (retours demain)
    var tm = new Date(); tm.setDate(tm.getDate() + 1); var tmStr = tm.toISOString().slice(0, 10);
    r.filter(function (x) { return (x.endDate || '').slice(0, 10) === tmStr && x.status !== 'cancelled' && x.status !== 'completed'; })
      .forEach(function (x) { notifs.push({ ico: '📅', bg: 'rgba(37,99,235,.12)', title: 'Échéance demain', sub: (x.car || '') + ' — ' + (x.client || ''), act: "maViewRes('" + x.id + "')" }); });
    // Nouvelles réservations (récentes < 48h)
    var cutoff = Date.now() - 48 * 3600 * 1000;
    r.filter(function (x) { return x.createdAt && new Date(x.createdAt).getTime() > cutoff; })
      .forEach(function (x) { notifs.push({ ico: '🆕', bg: 'rgba(22,163,74,.12)', title: 'Nouvelle réservation', sub: (x.client || '') + ' — ' + (x.car || '') + (x.source === 'online' ? ' (site web)' : ''), act: "maViewRes('" + x.id + "')" }); });

    host.innerHTML = notifs.length ? notifs.map(function (n) {
      return '<div class="ma-notif" onclick="' + n.act + '"><div class="ma-notif-ico" style="background:' + n.bg + ';">' + n.ico + '</div>'
        + '<div class="ma-notif-body"><div class="ma-notif-title">' + esc(n.title) + '</div><div class="ma-notif-sub">' + esc(n.sub) + '</div></div></div>';
    }).join('') : '<div class="ma-empty">✓ Aucune notification. Tout est à jour.</div>';

    // Pastille sur l'onglet
    var dot = document.querySelector('.ma-tab[data-screen="notifications"] .ma-tab-dot');
    if (dot) { if (notifs.length) { dot.textContent = notifs.length > 99 ? '99+' : notifs.length; dot.style.display = 'flex'; } else dot.style.display = 'none'; }
  }

  /* ============ RETOURS (depuis carte dashboard) ============ */
  window.maOpenReturns = function () {
    window._returnsFilter = null;
    if (typeof window.openDashDrawer === 'function') { window.openDashDrawer('returns'); }
    else maGo('notifications');
  };

  /* ============ "PLUS" : paramètres essentiels ============ */
  window.maOpenMore = function () {
    var sheet = document.createElement('div');
    sheet.className = 'ma-sheet';
    sheet.onclick = function (e) { if (e.target === sheet) sheet.remove(); };
    var items = [];
    items.push({ ico: '🔧', label: 'Entretien des véhicules', act: "maExitTo('maintenance')", perm: 'maintenance' });
    items.push({ ico: '💳', label: 'Paiements', act: "maExitTo('payments')", perm: 'payments' });
    items.push({ ico: '⚙️', label: 'Paramètres', act: "maExitTo('settings')", perm: 'settings' });
    items.push({ ico: '🖥️', label: 'Voir la version complète (desktop)', act: 'maFullDesktop()', perm: null });
    items.push({ ico: '🚪', label: 'Se déconnecter', act: 'maLogout()', perm: null });
    var visible = items.filter(function (it) { return !it.perm || can(it.perm); });
    sheet.innerHTML = '<div class="ma-sheet-inner"><div class="ma-sheet-handle"></div>'
      + visible.map(function (it) { return '<div class="ma-sheet-item" onclick="' + it.act + '"><span class="ma-sheet-ico">' + it.ico + '</span>' + it.label + '</div>'; }).join('')
      + '</div>';
    document.body.appendChild(sheet);
    window._maSheet = sheet;
  };
  function closeSheet() { if (window._maSheet) { window._maSheet.remove(); window._maSheet = null; } }
  window.maExitTo = function (page) {
    closeSheet();
    document.body.classList.add('ma-desktop-view');
    if (typeof window.showPage === 'function') window.showPage(page, null);
    maShowBackToApp();
  };
  window.maFullDesktop = function () {
    closeSheet();
    document.body.classList.add('ma-desktop-view');
    maShowBackToApp();
  };
  window.maLogout = function () {
    closeSheet();
    if (typeof window.logout === 'function') { window.logout(); return; }
    try { localStorage.removeItem('asl_admin_session'); } catch (e) {}
    window.location.replace('login.html');
  };

  /* ============ INIT ============ */
  function buildShell() {
    if (document.getElementById('asl-mobile-app')) return;

    var greet = (window.ASL_ADMIN_USER ? window.ASL_ADMIN_USER : 'Admin');

    var app = document.createElement('div');
    app.id = 'asl-mobile-app';
    app.innerHTML =
      '<div class="ma-head"><div style="flex:1;"><h1 id="ma-title">Tableau de bord</h1><div class="ma-greet">Bonjour ' + esc(greet) + ' 👋</div></div>'
      + '<button class="ma-head-btn" onclick="maGo(\'notifications\')"><svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="#101216" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/></svg><span class="ma-dot" id="ma-head-dot" style="display:none;"></span></button></div>'
      + screen('dashboard', 'Tableau de bord')
      + screen('vehicles', 'Véhicules')
      + screen('reservations', 'Réservations')
      + screen('rentals', 'Locations')
      + screen('clients', 'Clients')
      + screen('caisse', 'Caisse')
      + screen('notifications', 'Notifications');
    document.body.appendChild(app);

    var tabsAll = [
      ['dashboard', 'Accueil', '<rect width="7" height="9" x="3" y="3" rx="1"/><rect width="7" height="5" x="14" y="3" rx="1"/><rect width="7" height="9" x="14" y="12" rx="1"/><rect width="7" height="5" x="3" y="16" rx="1"/>', 'dashboard'],
      ['vehicles', 'Véhicules', '<path d="m21 8-2 2-1.5-3.7A2 2 0 0 0 15.6 5H8.4a2 2 0 0 0-1.9 1.3L5 10 3 8"/><rect width="18" height="8" x="3" y="10" rx="2"/><path d="M7 18v2M17 18v2"/>', 'fleet'],
      ['reservations', 'Résa.', '<rect width="18" height="18" x="3" y="4" rx="2"/><path d="M3 10h18M8 2v4M16 2v4"/>', 'reservations'],
      ['caisse', 'Caisse', '<rect width="20" height="14" x="2" y="5" rx="2"/><line x1="2" x2="22" y1="10" y2="10"/>', 'caisse'],
      ['notifications', 'Alertes', '<path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/>', null],
      ['__more', 'Plus', '<circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/><circle cx="5" cy="12" r="1"/>', null]
    ];
    var tabs = tabsAll.filter(function (t) { return !t[3] || can(t[3]); });
    var bar = document.createElement('div');
    bar.id = 'asl-mobile-tabbar';
    bar.innerHTML = tabs.map(function (t) {
      var onclick = t[0] === '__more' ? 'maOpenMore()' : "maGo('" + t[0] + "')";
      var dot = t[0] === 'notifications' ? '<span class="ma-tab-dot" style="display:none;"></span>' : '';
      return '<button class="ma-tab' + (t[0] === 'dashboard' ? ' active' : '') + '" data-screen="' + t[0] + '" onclick="' + onclick + '">'
        + '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">' + t[2] + '</svg>'
        + '<span>' + t[1] + '</span>' + dot + '</button>';
    }).join('');
    document.body.appendChild(bar);

    // Mettre à jour le titre quand on navigue
    var titles = { dashboard: 'Tableau de bord', vehicles: 'Véhicules', reservations: 'Réservations', rentals: 'Locations', clients: 'Clients', caisse: 'Caisse', notifications: 'Notifications' };
    var origGo = window.maGo;
    window.maGo = function (s) {
      var titleEl = document.getElementById('ma-title');
      if (titleEl && titles[s]) titleEl.textContent = titles[s];
      // Clients/Locations n'ont pas d'onglet direct : on garde l'onglet courant cohérent
      origGo(s);
    };

    // Tab "rentals" et "clients" accessibles via cartes dashboard ; on les expose
    // aussi en sous-navigation depuis le tableau de bord.
  }

  function screen(id, title) {
    return '<div class="ma-screen' + (id === 'dashboard' ? ' active' : '') + '" id="ma-' + id + '"></div>';
  }

  function start() {
    if (!isMobile()) return;
    buildShell();
    window.maGo('dashboard');
    // Rafraîchissement temps réel
    try { if (typeof ASLDB !== 'undefined' && ASLDB.onChange) ASLDB.onChange(function () { if (isMobile()) renderScreen(current); }); } catch (e) {}
    // Mettre à jour la pastille notifications au démarrage
    setTimeout(function () { renderNotifications(); window.maGo('dashboard'); }, 200);
  }

  if (document.readyState !== 'loading') start();
  else document.addEventListener('DOMContentLoaded', start);
})();
