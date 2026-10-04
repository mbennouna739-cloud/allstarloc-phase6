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

  // ★ CORRECTIF (rotation d'écran qui fait apparaître la barre latérale
  //   Desktop) — CAUSE EXACTE : cette détection se basait uniquement sur
  //   la largeur de la fenêtre (window.innerWidth). En paysage sur
  //   téléphone, cette largeur dépasse souvent 768px — l'app croyait donc
  //   être sur un Desktop et basculait vers sa mise en page à la moindre
  //   rotation. Corrigé pour se baser sur le TYPE d'appareil (écran
  //   tactile à pointeur "grossier", jamais vrai sur un ordinateur même
  //   fenêtre réduite) ET sur le plus PETIT des deux côtés de l'écran —
  //   qui reste le même qu'on soit en portrait ou en paysage — au lieu de
  //   la largeur seule qui, elle, change radicalement selon l'orientation.
  function isMobile() {
    var isTouchPrimary = !!(window.matchMedia && window.matchMedia('(pointer: coarse)').matches);
    var w = window.innerWidth, h = window.innerHeight;
    // ★ CORRECTIF CRITIQUE (barre latérale Desktop disparue / page blanche)
    //   — CAUSE EXACTE : la version précédente réutilisait le seuil 768px
    //   à la fois pour la largeur ET pour la hauteur. Or 768px de HAUTEUR
    //   est une résolution d'ordinateur portable très répandue (1366×768).
    //   Un Desktop équipé d'un écran tactile (courant sur beaucoup de
    //   portables) à cette hauteur d'écran se retrouvait donc classé à
    //   tort comme "mobile", masquant toute la barre latérale.
    //   - Largeur ≤768px : seuil D'ORIGINE, inchangé, sans condition de
    //     tactile — c'est le comportement qui fonctionnait déjà avant le
    //     correctif de rotation et qui n'a jamais posé de problème.
    //   - Paysage sur téléphone (largeur >768px) : nécessite désormais un
    //     seuil de HAUTEUR bien plus bas (500px, jamais atteint par un
    //     écran d'ordinateur même petit) ET un pointeur tactile — un vrai
    //     Desktop ne peut plus jamais tomber dans ce cas.
    if (w <= 768) return true;
    return isTouchPrimary && h <= 500;
  }
  window.isMobile = isMobile;
  function money(n) { n = Math.round(Number(n) || 0); return n.toLocaleString('fr-FR').replace(/\u202f/g, ' ') + ' MAD'; }
  function esc(s) { return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }
  function todayISO() {
    // ★ CORRECTIF FUSEAU HORAIRE (voir data.js localDateISO / todayStr desktop
    //   pour le détail) : ne plus passer par toISOString() (UTC).
    if (typeof ASLDB !== 'undefined' && ASLDB.localDateISO) return ASLDB.localDateISO();
    var d = new Date();
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  }
  function plusDaysISO(n) {
    // ★ CORRECTIF (doublon/contradiction "Retour aujourd'hui" / "Retour
    //   demain") — CAUSE EXACTE : cette fonction utilisait toISOString()
    //   (fuseau UTC) alors que todayISO() utilise désormais l'heure LOCALE
    //   (ASLDB.localDateISO). Dans un fuseau en avance sur UTC, les deux
    //   pouvaient renvoyer LA MÊME date de chaîne, faisant apparaître le
    //   même retour à la fois dans "aujourd'hui" et "demain". Utilise
    //   désormais la même base locale que todayISO(), sans jamais passer
    //   par toISOString().
    var d = new Date(); d.setHours(0, 0, 0, 0); d.setDate(d.getDate() + n);
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  }

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
    history: '<path d="M3 3v5h5"/><path d="M3.05 13A9 9 0 1 0 6 5.3L3 8"/><path d="M12 7v5l4 2"/>',
    refresh: '<path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"/><path d="M21 3v5h-5"/><path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16"/><path d="M8 16H3v5"/>',
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
    // ★ SOURCE UNIQUE : le total encaissé et le reste dû proviennent
    //   désormais de la même fonction que Desktop (ASLDB.computeCashTotals),
    //   au lieu d'un calcul réimplémenté ici — garantit un montant de
    //   Caisse strictement identique sur les deux versions.
    var ct = ASLDB.computeCashTotals ? ASLDB.computeCashTotals() : null;
    var enc = 0, rest = 0;
    if (ct) { enc = ct.encaisse; rest = ct.reste; }
    else {
      reservations().forEach(function (r) {
        if (r.status === 'cancelled') return;
        enc += Number(r.paid) || 0;
        rest += Math.max(0, (Number(r.amount) || 0) - (Number(r.paid) || 0));
      });
    }
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
    // ★ CORRECTIF (LOT 44) : entretien lu PAR IMMATRICULATION (même clé que
    //   l'onglet Entretien) — le compteur restait à 0 avec l'ancienne clé.
    f.forEach(function (c) {
      var units = (typeof ASLDB !== 'undefined' && ASLDB.normalizeUnits) ? ASLDB.normalizeUnits(c) : [{ plate: c.plate || '' }];
      units.forEach(function (u) {
        var m = MAINT[String(c.id) + '::' + (u.plate || '_')] || MAINT[String(c.id)] || {};
        if (m.vt_next) { var dv = Math.round((new Date(m.vt_next) - todayMs) / 86400000); if (dv <= 7) vt++; }
        if (m.reminder_next && new Date(m.reminder_next).getTime() <= todayMs + 86400000) vid++;
      });
    });
    // ★ CORRECTIF (item 1/3/6, parité Mobile/Desktop) : phase réelle
    //   calculée sur date+heure+fuseau réels via ASLDB.computePhase, au lieu
    //   des anciennes comparaisons de chaînes de date qui retardaient d'un
    //   jour le passage "Réservé" → "Loué" (bug de fuseau horaire, voir
    //   todayISO ci-dessus) et ignoraient totalement l'heure.
    function phase(x) { return (typeof ASLDB !== 'undefined' && ASLDB.computePhase) ? ASLDB.computePhase(x) : x.status; }
    return {
      available: f.reduce(function (n, c) {
        var ma = (typeof ASLDB !== 'undefined' && ASLDB.modelAvailability) ? ASLDB.modelAvailability(c) : null;
        return n + (ma ? ma.available : (c.status === 'available' ? 1 : 0));
      }, 0),
      // ★ SOURCE UNIQUE (Mission) : tous ces compteurs appellent désormais
      //   littéralement les mêmes fonctions que Desktop et que les listes
      //   Mobile — plus aucune réimplémentation locale, donc plus aucune
      //   divergence possible entre compteur, liste, Desktop et Mobile.
      rented: (ASLDB.selectRented ? ASLDB.selectRented().length : r.filter(function (x) { return phase(x) === 'active'; }).length),
      reserved: (ASLDB.selectReserved ? ASLDB.selectReserved().length : r.filter(function (x) { return phase(x) === 'reserved'; }).length),
      returnsToday: (ASLDB.selectReturnsOn ? ASLDB.selectReturnsOn(ts).length : 0),
      late: (ASLDB.selectLate ? ASLDB.selectLate().length : r.filter(function (x) { return phase(x) === 'late'; }).length),
      unpaid: (ASLDB.selectUnpaid ? ASLDB.selectUnpaid().length : r.filter(function (x) { return x.status !== 'cancelled' && (Number(x.amount) || 0) > (Number(x.paid) || 0); }).length),
      entrants: (ASLDB.selectEntrantsOn ? ASLDB.selectEntrantsOn(ts).length : 0),
      sortants: (ASLDB.selectSortantsOn ? ASLDB.selectSortantsOn(ts).length : 0),
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
    // ★ CORRECTIF (stabilité de toutes les pages Mobile — ex. "Retour
    //   aujourd'hui", "Véhicules loués") — CAUSE : chaque rafraîchissement
    //   (notamment le minuteur automatique toutes les 30 s) reconstruit
    //   entièrement le contenu affiché, ce qui pouvait faire sauter le
    //   défilement en haut de la page pendant la lecture d'une liste. La
    //   position de défilement est désormais mémorisée juste avant, puis
    //   restaurée immédiatement après — sur TOUTES les pages, sans rien
    //   changer à leur contenu ni à leur fonctionnement.
    var scrollHost = document.getElementById('asl-mobile-app');
    var savedScroll = scrollHost ? scrollHost.scrollTop : 0;
    _renderScreenInner(screen);
    if (scrollHost && savedScroll > 0) { scrollHost.scrollTop = savedScroll; }
  }
  function _renderScreenInner(screen) {
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
    else if (screen === 'lld') renderLLDM();
    else if (screen === 'unpaid') renderUnpaidM();
    else if (screen === 'revenue') renderRevenueM();
    else if (screen === 'caisse') renderCaisse();
    else if (screen === 'notifications') renderNotifications();
    else if (screen === 'history') renderHistoryM();
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
      + '<span class="ma-notif-chev">' + ic('arrowLeft') + '</span></div>'; // flèche « ouvrir » (retournée en CSS)
  }

  /* ============ VÉHICULES ============
     ★ Chaque fiche de la flotte est un MODÈLE (ex. « Clio 5 ») qui peut
     posséder plusieurs UNITÉS physiques (couleur + immatriculation +
     statut propres à chacune) via ASLDB.normalizeUnits. Le back-office
     desktop affiche/compte une carte par UNITÉ (fleetUnitStats) : la liste
     mobile fait maintenant exactement pareil, pour ne plus afficher
     13 modèles là où il y a 23 véhicules physiques réels. */
  var vehFilter = 'all';
  window.maVehFilter = function (f) { vehFilter = f; renderVehicles(); };

  // Aplatit la flotte (modèles) en une liste d'unités individuelles.
  function fleetUnits() {
    var out = [];
    fleet().forEach(function (c) {
      var units = (typeof ASLDB !== 'undefined' && ASLDB.normalizeUnits) ? ASLDB.normalizeUnits(c) : null;
      if (!units || !units.length) units = [{ plate: c.plate || '', color: '', status: c.status || 'available' }];
      units.forEach(function (u, i) {
        out.push({
          carId: c.id, name: c.name, category: c.category, priceMAD: c.priceMAD, price: c.price,
          fuel: c.fuel, transmission: c.transmission, photo: c.photo || c.image || c.img || '',
          unitIndex: i, plate: u.plate || c.plate || '', color: u.color || '', status: u.status || 'available'
        });
      });
    });
    return out;
  }

  function renderVehicles() {
    var host = document.getElementById('ma-vehicles');
    if (!host) return;
    var all = fleetUnits();
    var chips = [['all', 'Tous'], ['available', 'Disponibles'], ['rented', 'Loués'], ['reserved', 'Réservés']];
    var list = all.filter(function (u) {
      if (vehFilter === 'all') return true;
      if (vehFilter === 'rented') return u.status === 'rented' || u.status === 'active';
      return u.status === vehFilter;
    });
    host.innerHTML =
      '<div class="ma-chips">' + chips.map(function (ch) {
        return '<button class="ma-chip ' + (vehFilter === ch[0] ? 'active' : '') + '" onclick="maVehFilter(\'' + ch[0] + '\')">' + ch[1] + '</button>';
      }).join('') + '</div>'
      + (list.length ? list.map(vehCard).join('') : '<div class="ma-empty">Aucun véhicule dans cette catégorie.</div>');
  }
  function vehCard(u) {
    // ★ Statuts strictement identiques au back-office desktop (AVAIL_LABELS,
    //   admin/index.html) : mêmes libellés, même code couleur, afin que la
    //   version mobile reproduise à 100 % le comportement desktop.
    var statusMap = {
      available: ['green', 'Disponible'],
      reserved: ['blue', 'Réservé'],
      rented: ['blue', 'Loué'],
      active: ['blue', 'Loué'],
      maintenance: ['yellow', 'Maintenance'],
      offroad: ['red', 'Hors service'],
      lld: ['purple', 'Location longue durée']
    };
    var st = statusMap[u.status] || ['gray', u.status || '—'];
    var imgHtml = u.photo ? '<img class="ma-card-photo" src="' + esc(u.photo) + '" alt="" loading="lazy">' : '<div class="ma-card-photo"></div>';
    var carIdArg = (typeof u.carId === 'number' ? u.carId : "'" + String(u.carId) + "'");
    var subLine = esc(u.plate || '—') + (u.color ? ' · ' + esc(u.color) : '') + (u.category ? ' · ' + esc(u.category) : '');
    return '<div class="ma-card">'
      + '<div class="ma-card-top">' + imgHtml
      + '<div class="ma-card-info"><div class="ma-card-name">' + esc(u.name || 'Véhicule') + '</div>'
      + '<div class="ma-card-sub">' + subLine + '</div></div>'
      + '<span class="ma-badge ' + st[0] + '">' + st[1] + '</span></div>'
      + '<div class="ma-card-meta"><div class="ma-meta">Prix/jour<b>' + money(u.priceMAD || u.price || 0) + '</b></div>'
      + '<div class="ma-meta">Carburant<b>' + esc(u.fuel || '—') + '</b></div>'
      + '<div class="ma-meta">Boîte<b>' + esc(u.transmission || '—') + '</b></div></div>'
      + '<div class="ma-actions">'
      + '<button class="ma-act-btn" onclick="maViewVehicle(' + carIdArg + ')">' + ic('eye') + 'Fiche</button>'
      + '<button class="ma-act-btn" onclick="maEditVehicle(' + carIdArg + ')">' + ic('edit') + 'Modifier</button>'
      + '<button class="ma-act-btn" onclick="maChangeStatus(' + carIdArg + ',\'' + esc(u.plate || '') + '\')">' + ic('swap') + 'Statut</button>'
      + '<button class="ma-act-btn" onclick="maVehiclePhoto(' + carIdArg + ')">' + ic('camera') + 'Photo</button>'
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
  /* Changer le statut : feuille tactile, écrit via ASLDB.setUnitStatusByPlate
     ★ Cible désormais l'UNITÉ précise (identifiée par sa plaque), pas tout le
     modèle : changer le statut d'une Clio 5 Bleue ne doit plus affecter la
     Clio 5 Grise/Blanche/Noire du même modèle. */
  window.maChangeStatus = function (id, plate) {
    var f = fleet();
    var car = f.filter(function (c) { return String(c.id) === String(id); })[0];
    if (!car) return;
    var units = (typeof ASLDB !== 'undefined' && ASLDB.normalizeUnits) ? ASLDB.normalizeUnits(car) : [{ plate: car.plate || '', color: '', status: car.status || 'available' }];
    var unit = (plate ? units.filter(function (u) { return u.plate === plate; })[0] : null) || units[0];
    var opts = [
      ['available', 'Disponible', 'green'],
      ['reserved', 'Réservé', 'blue'],
      ['rented', 'Loué', 'blue'],
      ['maintenance', 'Maintenance', 'yellow'],
      ['offroad', 'Hors service', 'red']
    ];
    var idArg = (typeof car.id === 'number' ? car.id : "'" + String(car.id) + "'");
    var plateArg = "'" + esc(unit.plate || '') + "'";
    openSheet(
      '<div class="ma-sheet-title">' + esc(car.name || 'Véhicule') + '</div>'
      + '<div class="ma-sheet-sub">' + esc(unit.plate || '—') + (unit.color ? ' · ' + esc(unit.color) : '') + ' — changer le statut</div>'
      + opts.map(function (o) {
        var activeNow = (unit.status === o[0]) || (o[0] === 'rented' && unit.status === 'active');
        return '<button class="ma-sheet-opt' + (activeNow ? ' active' : '') + '" onclick="maSetStatus(' + idArg + ',' + plateArg + ',\'' + o[0] + '\')">'
          + '<span class="ma-dot-status ' + o[2] + '"></span>' + o[1]
          + (activeNow ? '<span class="ma-sheet-chk">' + ic('check') + '</span>' : '') + '</button>';
      }).join('')
    );
  };
  window.maSetStatus = function (id, plate, status) {
    try {
      if (ASLDB && ASLDB.setUnitStatusByPlate) ASLDB.setUnitStatusByPlate(id, plate, status);
      else if (ASLDB && ASLDB.updateVehicle) ASLDB.updateVehicle(id, { status: status }); // repli ancien modèle mono-unité
    } catch (e) {}
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

  /* ============ HISTORIQUE — conçu MOBILE D'ABORD (pas un clone du
     Desktop) ============
     - Recherche en haut, grande, immédiate.
     - Véhicules suggérés en chips défilables horizontalement au toucher.
     - Filtre de date déporté dans une feuille inférieure (raccourcis
       "Aujourd'hui / Cette semaine / Ce mois / Personnalisé"), plutôt que
       deux champs de date qui encombrent l'écran en permanence.
     - Résultats groupés par mois, en timeline verticale — bien plus
       naturel à parcourir au pouce qu'un tableau condensé en cartes.
     Utilise EXACTEMENT la même fonction de calcul que Desktop
     (computeHistoryResults, définie dans admin-lot5.js) : la recherche et
     le filtrage donnent toujours le même résultat des deux côtés — seule
     la présentation change, pensée spécifiquement pour le tactile. */
  var _histDateFrom = '', _histDateTo = '';
  function renderHistoryM() {
    var host = document.getElementById('ma-history');
    if (!host) return;
    host.innerHTML =
      '<div class="ma-hist-searchrow">'
      + '<div class="ma-search-wrap ma-hist-search-bar">' + ic('search') + '<input id="ma-hist-search" class="ma-search" placeholder="Contrat, client, véhicule…" value="' + esc((typeof historyVehicleLabel === 'function') ? historyVehicleLabel(window._histSelectedVehicle || '') : (window._histSelectedVehicle || '')) + '" oninput="renderHistoryListM()"></div>'
      + '<button class="ma-hist-filter-btn' + ((_histDateFrom || _histDateTo) ? ' active' : '') + '" aria-label="Filtrer par date" onclick="maOpenHistDateSheet()">' + ic('calendar') + '</button>'
      + '</div>'
      + '<div id="ma-hist-chips" class="ma-hist-chipsrow"></div>'
      + '<div id="ma-hist-title" class="ma-hist-title"></div>'
      + '<div id="ma-hist-list"></div>';
    renderHistoryListM();
  }
  window.renderHistoryListM = function () {
    var q = (document.getElementById('ma-hist-search') || {}).value || '';
    var r = computeHistoryResults(q, window._histSelectedVehicle || '', _histDateFrom, _histDateTo);

    var chipsEl = document.getElementById('ma-hist-chips');
    if (chipsEl) {
      chipsEl.classList.toggle('ma-hist-sugg', !!(r.q && !r.selectedVehicle));
      if (r.q && !r.selectedVehicle) {
        var names = (typeof historyVehicleSuggestions === 'function') ? historyVehicleSuggestions(r.q) : [];
        // ★ Demande 1 : une suggestion par voiture, avec sa plaque (et sa couleur).
        chipsEl.innerHTML = names.length ? names.map(function (n) {
          return '<button class="ma-chip" data-vk="' + esc(n.key) + '" onclick="maSelectHistoryVehicle(this.dataset.vk)">' + ic('car') + ' ' + esc(n.label) + '</button>';
        }).join('') : '';
      } else if (r.selectedVehicle) {
        chipsEl.innerHTML = '<button class="ma-chip active" onclick="maResetHistoryFilters()">' + ic('car') + ' ' + esc(historyVehicleLabel(r.selectedVehicle)) + '  ✕</button>';
      } else {
        chipsEl.innerHTML = '';
      }
    }
    var titleEl = document.getElementById('ma-hist-title');
    if (titleEl) {
      var dateLabel = (_histDateFrom || _histDateTo) ? ' · ' + (_histDateFrom ? fmtD(_histDateFrom) : '…') + ' → ' + (_histDateTo ? fmtD(_histDateTo) : '…') : '';
      titleEl.textContent = (r.selectedVehicle ? historyVehicleLabel(r.selectedVehicle) : (r.q ? 'Résultats' : 'Tous les contrats')) + ' (' + r.list.length + ')' + dateLabel;
    }

    var listEl = document.getElementById('ma-hist-list');
    if (!listEl) return;
    if (!r.list.length) {
      listEl.innerHTML = '<div class="ma-hist-empty">' + ic('history') + '<div style="margin-top:10px;font-weight:700;">Aucun contrat trouvé</div>'
        + '<div style="margin-top:4px;font-size:12.5px;color:#8a909a;">Essayez un autre nom de véhicule, de client, ou changez la période.</div></div>';
      return;
    }
    // ★ Regroupement par mois — timeline naturelle au pouce, plutôt qu'une
    //   longue liste plate comme sur Desktop (adapté à chaque support).
    var groups = [];
    var groupMap = {};
    var MONTHS = ['janvier','février','mars','avril','mai','juin','juillet','août','septembre','octobre','novembre','décembre'];
    r.list.forEach(function (x) {
      var d = x.startDate || x.endDate || '';
      var key = d ? d.slice(0, 7) : '—';
      if (!groupMap[key]) {
        var label = '—';
        if (d) { var parts = d.split('-'); label = MONTHS[parseInt(parts[1], 10) - 1] + ' ' + parts[0]; }
        groupMap[key] = { label: label, items: [] };
        groups.push(groupMap[key]);
      }
      groupMap[key].items.push(x);
    });
    listEl.innerHTML = groups.map(function (g) {
      return '<div class="ma-hist-month">' + esc(g.label) + '</div>'
        + g.items.map(function (x) {
            var idStr = "'" + String(x.id || '') + "'";
            var days = x.days ? x.days + ' j' : '';
            return '<div class="ma-hist-card" onclick="maViewRes(' + idStr + ')">'
              + '<div class="ma-hist-card-ico">' + ic('key') + '</div>'
              + '<div class="ma-hist-card-body">'
              + '<div class="ma-hist-card-top"><span class="ma-hist-client">' + esc(x.client || '') + '</span>' + (days ? '<span class="ma-hist-days">' + days + '</span>' : '') + '</div>'
              + '<div class="ma-hist-car">' + esc(aslVehLabel(x)) + '</div>'
              + '<div class="ma-hist-bottom"><span class="ma-hist-dates">' + fmtD(x.startDate) + ' → ' + fmtD(x.endDate) + '</span><span class="ma-hist-ref">' + esc(x.contractRef || x.id || '') + '</span></div>'
              + '</div></div>';
          }).join('');
    }).join('');
  };
  function fmtD(iso) {
    if (!iso) return '—';
    var p = iso.split('-'); if (p.length !== 3) return iso;
    var MONTHS_SHORT = ['jan','fév','mar','avr','mai','juin','juil','août','sep','oct','nov','déc'];
    return parseInt(p[2], 10) + ' ' + MONTHS_SHORT[parseInt(p[1], 10) - 1];
  }
  window.maResetHistoryFilters = function () {
    window._histSelectedVehicle = '';
    _histDateFrom = ''; _histDateTo = '';
    renderHistoryM();
  };
  window.maSelectHistoryVehicle = function (key) {
    window._histSelectedVehicle = key;
    var s = document.getElementById('ma-hist-search'); if (s) s.value = historyVehicleLabel(key);
    renderHistoryListM();
  };
  /* Feuille inférieure de filtre par date — raccourcis + période
     personnalisée, pattern mobile natif plutôt que des champs toujours
     visibles à l'écran. */
  window.maOpenHistDateSheet = function () {
    var today = todayISO();
    function daysAgoISO(n) { var d = new Date(); d.setDate(d.getDate() - n); return (typeof ASLDB !== 'undefined' && ASLDB.localDateISO) ? ASLDB.localDateISO(d) : d.toISOString().slice(0, 10); }
    function monthStartISO() { var d = new Date(); d.setDate(1); return (typeof ASLDB !== 'undefined' && ASLDB.localDateISO) ? ASLDB.localDateISO(d) : d.toISOString().slice(0, 10); }
    openSheet(
      '<div class="ma-sheet-title">Filtrer par date</div>'
      + '<div class="ma-actions" style="flex-wrap:wrap;">'
      + '<button class="ma-act-btn" onclick="maApplyHistPreset(\'' + today + '\',\'' + today + '\')">Aujourd\'hui</button>'
      + '<button class="ma-act-btn" onclick="maApplyHistPreset(\'' + daysAgoISO(7) + '\',\'' + today + '\')">7 derniers jours</button>'
      + '<button class="ma-act-btn" onclick="maApplyHistPreset(\'' + monthStartISO() + '\',\'' + today + '\')">Ce mois-ci</button>'
      + '</div>'
      + '<div class="ma-sheet-section">Période personnalisée</div>'
      + '<div class="form-row">'
      + '<div class="form-group"><label class="form-label">Du</label><input type="date" class="form-input" id="ma-hist-date-from" value="' + esc(_histDateFrom) + '"></div>'
      + '<div class="form-group"><label class="form-label">Au</label><input type="date" class="form-input" id="ma-hist-date-to" value="' + esc(_histDateTo) + '"></div>'
      + '</div>'
      + '<button class="ma-act-btn ok" style="margin-top:10px;" onclick="maApplyHistCustom()">Appliquer</button>'
      + (_histDateFrom || _histDateTo ? '<button class="ma-act-btn" style="margin-top:8px;color:var(--red,#C41E3A);" onclick="maApplyHistPreset(\'\',\'\')">✕ Retirer le filtre de date</button>' : '')
    );
  };
  window.maApplyHistPreset = function (from, to) {
    _histDateFrom = from; _histDateTo = to;
    closeSheet();
    renderHistoryListM();
    var btn = document.querySelector('.ma-hist-filter-btn');
    if (btn) btn.classList.toggle('active', !!(from || to));
  };
  window.maApplyHistCustom = function () {
    _histDateFrom = (document.getElementById('ma-hist-date-from') || {}).value || '';
    _histDateTo = (document.getElementById('ma-hist-date-to') || {}).value || '';
    closeSheet();
    renderHistoryListM();
    var btn = document.querySelector('.ma-hist-filter-btn');
    if (btn) btn.classList.toggle('active', !!(_histDateFrom || _histDateTo));
  };

  /* ============ RÉSERVATIONS ============ */
  function renderReservations() {
    var host = document.getElementById('ma-reservations');
    if (!host) return;
    // ★ CORRECTIF (item 3, parité Desktop) : phase réelle plutôt que statut
    //   brut — dès qu'une réservation démarre réellement (devient "louée"),
    //   elle disparaît automatiquement de cette liste.
    var list = (ASLDB.selectReserved ? ASLDB.selectReserved() : [])
      .sort(function (a, b) { return (b.createdAt || '').localeCompare(a.createdAt || ''); });
    host.innerHTML = list.length ? list.map(function (r) { return resCard(r, 'reservation'); }).join('') : '<div class="ma-empty">Aucune réservation en cours.</div>';
  }

  /* ============ LOCATIONS ============ */
  function renderRentals() {
    var host = document.getElementById('ma-rentals');
    if (!host) return;
    // ★ CORRECTIF (lenteur/lag de la recherche) — CAUSE EXACTE : l'ancienne
    //   version reconstruisait TOUT le bloc (champ de recherche INCLUS) à
    //   chaque frappe. Le champ était donc détruit et recréé à chaque
    //   caractère tapé, perdant le focus et la position du curseur —
    //   d'où l'impression que "ça prend du temps" pour taper "Kia" en
    //   entier. Le champ de recherche est désormais construit UNE SEULE
    //   fois ; seule la liste de résultats en dessous se met à jour à
    //   chaque frappe, sans jamais toucher au champ lui-même.
    host.innerHTML = '<div class="ma-search-wrap">' + ic('search') + '<input type="search" id="ma-rentals-search" class="ma-search" placeholder="Rechercher (véhicule, plaque, client)…" oninput="renderRentalsList()"></div><div id="ma-rentals-list"></div>';
    renderRentalsList();
  }
  function renderRentalsList() {
    var listHost = document.getElementById('ma-rentals-list');
    if (!listHost) return;
    // ★ CORRECTIF (item 1/6, parité Desktop) : phase réelle (date+heure+
    //   fuseau réels) au lieu de la comparaison de chaînes de date qui
    //   retardait d'un jour le passage "Réservé" → "Loué".
    // ★ SOURCE UNIQUE : identique au compteur et à Desktop (bug corrigé :
    //   cette liste incluait aussi les véhicules EN RETARD, contrairement à
    //   son propre compteur et à Desktop — d'où liste ≠ compteur et
    //   Mobile ≠ Desktop).
    var list = ASLDB.selectRented ? ASLDB.selectRented() : reservations().filter(function (r) { return ASLDB.computePhase(r) === 'active'; });
    var q = ((document.getElementById('ma-rentals-search') || {}).value || '').toLowerCase().trim();
    var filtered = q ? list.filter(function (r) {
      return ((r.car || '') + ' ' + (r.assignedPlate || '') + ' ' + (r.client || '')).toLowerCase().indexOf(q) >= 0;
    }) : list;
    listHost.innerHTML = filtered.length ? filtered.map(function (r) { return resCard(r, 'rental'); }).join('') : '<div class="ma-empty">' + (q ? 'Aucun résultat pour cette recherche.' : 'Aucune location en cours aujourd\'hui.') + '</div>';
  }
  window.renderRentalsList = renderRentalsList;

  function resCard(r, kind) {
    var reste = Math.max(0, (Number(r.amount) || 0) - (Number(r.paid) || 0));
    var payBadge = reste > 0 ? '<span class="ma-badge red">Reste ' + money(reste) + '</span>' : '<span class="ma-badge green">Payé</span>';
    var idStr = "'" + String(r.id || '') + "'";

    if (kind === 'rental') {
      // LOUÉS : on met en valeur le nom de la voiture, le client en dessous.
      // Pas de badge de statut. Fiche (popup) + Prolonger + Retour.
      var plate = aslVehPlateColor(r); // ★ Demande 6 : plaque · couleur
      return '<div class="ma-card">'
        + '<div class="ma-card-top"><div class="ma-card-ico-box blue">' + ic('key') + '</div>'
        // ★ Badge LLD (cohérent avec Desktop)
        + '<div class="ma-card-info"><div class="ma-card-name">' + esc(r.car || 'Véhicule') + (r.type === 'lld' ? ' <span style="font-size:9.5px;font-weight:700;color:#8b5cf6;background:rgba(139,92,246,.12);border-radius:6px;padding:2px 6px;">📅 LLD</span>' : '') + '</div>'
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
        + '<button class="ma-act-btn danger" onclick="maCancelRental(' + idStr + ')">' + ic('x') + 'Annuler</button>'
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
      + '<div class="ma-card-sub">' + esc(aslVehLabel(r)) + ' · ' + esc(r.contractRef || r.id || '') + '</div></div>'
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
  window.maRentalFiche = function (id, mode) {
    var r = (ASLDB.getReservations() || []).filter(function (x) { return x.id === id; })[0];
    if (!r) return;
    var reste = Math.max(0, (Number(r.amount) || 0) - (Number(r.paid) || 0));
    var plate = aslVehPlateColor(r); // ★ Demande 6 : plaque · couleur
    function row(label, val, color) {
      return '<div class="ma-fiche-row"><span class="ma-fiche-lbl">' + label + '</span><span class="ma-fiche-val"' + (color ? ' style="color:' + color + ';"' : '') + '>' + val + '</span></div>';
    }
    // ★ Boutons Confirmer le retour / Prolonger restaurés dans "Retour
    //   aujourd'hui" (demande explicite) — même comportement que "En
    //   retard" : Prolonger garde le véhicule loué, Confirmer le libère et
    //   recalcule dates/prix.
    var actionsHTML =
      '<div class="ma-actions" style="margin-top:16px;">'
      + '<button class="ma-act-btn" onclick="maCloseSheet();maExtend(\'' + r.id + '\')">' + ic('plus') + 'Prolonger</button>'
      + '<button class="ma-act-btn ok" onclick="maCloseSheet();maReturnVehicle(\'' + r.id + '\')">' + ic('returns') + 'Confirmer retour</button>'
      + '</div>';
    // ★ CORRECTIF CRITIQUE (« tout modifiable ») — Cette fiche mobile était
    //   entièrement en lecture seule : ni téléphone, ni dates, ni véhicule,
    //   ni prix modifiables — exactement le problème signalé. Plutôt que de
    //   dupliquer toute cette logique (et risquer de la faire diverger de
    //   Desktop), le bouton "Modifier tout" ouvre la VRAIE fiche éditable
    //   déjà utilisée par Desktop (mêmes champs, mêmes fonctions, mêmes
    //   sauvegardes) — garantit une édition strictement identique partout.
    var editBtn = '<div class="ma-actions" style="margin-top:10px;">'
      + '<button class="ma-act-btn" style="background:#1a1a2e;color:#fff;border:none;" onclick="maEditRental(\'' + r.id + '\',\'' + (mode||'rented') + '\')">' + ic('edit') + ' Modifier tout (client, téléphone, véhicule, dates, prix…)</button>'
      + '</div>';
    openSheet(
      '<div class="ma-sheet-title">' + esc(r.car || 'Location') + (r.type === 'lld' ? ' <span style="font-size:11px;font-weight:700;color:#8b5cf6;background:rgba(139,92,246,.12);border-radius:6px;padding:2px 7px;vertical-align:middle;">LLD</span>' : '') + '</div>'
      + '<div style="font-size:13px;color:#6b7280;margin:-6px 0 14px;">' + esc(plate || '') + '</div>'
      + row('Client', esc(r.client || '—'))
      + (r.phone ? row('Téléphone', '<a href="tel:' + esc(r.phone) + '" style="color:#2563eb;text-decoration:none;">' + esc(r.phone) + '</a>') : '')
      + row('Contrat', esc(r.contractRef || r.id || '—'))
      + row('Départ', fmtDateT(r.startDate, r.startTime, '10:00'))
      + row('Retour', fmtDateT(r.endDate, r.endTime, '18:00'))
      + row('Durée', (r.days || 0) + ' jours')
      + row('Total', money(r.amount || 0))
      + row('Payé', money(r.paid || 0), '#16a34a')
      + row('Reste à payer', money(reste), reste > 0 ? '#C41E3A' : '#16a34a')
      + editBtn
      + actionsHTML
      + (r.phone ? '<a class="ma-act-btn" style="margin-top:8px;text-decoration:none;background:#25D366;color:#fff;border:none;" href="https://wa.me/' + esc(r.phone.replace(/[^0-9]/g, '')) + '" target="_blank">' + ic('phone') + 'WhatsApp</a>' : '')
    );
  };
  /* ★ Ouvre la vraie fiche éditable (identique à Desktop) pour cette
     location/réservation — tous les champs y sont modifiables. */
  window.maEditRental = function (id, mode) {
    maCloseSheet();
    enterDesktopView();
    var r = (ASLDB.getReservations() || []).filter(function (x) { return x.id === id; })[0];
    var isLLD = r && r.type === 'lld';
    if (isLLD && typeof window.viewLLDContract === 'function') {
      if (typeof window.showPage === 'function') window.showPage('lld', null);
      setTimeout(function () { window.viewLLDContract(id); }, 120);
    } else if (typeof window.viewRental === 'function') {
      if (typeof window.showPage === 'function') window.showPage('rentals', null);
      setTimeout(function () { window.viewRental(id, mode); }, 120);
    }
    maShowBackToApp();
  };
  /* Actions réservations / locations — réutilisent les fonctions desktop */
  window.maViewRes = function (id) {
    enterDesktopView();
    if (typeof window.showPage === 'function') window.showPage('reservations', null);
    setTimeout(function () {
      if (typeof window.viewRes === 'function') { window.viewRes(id); return; }
      if (typeof window.viewRental === 'function') window.viewRental(id);
    }, 120);
    maShowBackToApp();
  };
  window.maViewRental = function (id, mode) { maRentalFiche(id, mode); };
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
  /* ★ Annuler / clôturer anticipativement une location EN COURS (délègue à
     la même fonction que Desktop — enregistre la date/heure réelle de
     restitution, libère le véhicule). Distincte de maCancelRes (qui annule
     une réservation pas encore démarrée). */
  window.maCancelRental = function (id) { if (typeof window.cancelRental === 'function') window.cancelRental(id); refreshSoon(); };
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
    var chips = [['today', "Aujourd'hui"], ['tomorrow', 'Demain'], ['date', 'Date choisie']];
    var head = '<div class="ma-chips">' + chips.map(function (ch) {
      return '<button class="ma-chip ' + (returnsFilter === ch[0] ? 'active' : '') + '" onclick="maReturnsFilter(\'' + ch[0] + '\')">' + ch[1] + '</button>';
    }).join('') + '</div>'
      + (returnsFilter === 'date' ? '<input type="date" id="ma-returns-date" class="ma-date" value="' + esc(returnsDate) + '" onchange="maReturnsDate(this.value)">' : '')
      // ★ Point 7 : recherche rapide (client / véhicule / immatriculation).
      // ★ CORRECTIF (stabilité/scroll) : le champ de recherche est
      //   désormais séparé de la liste — taper n'importe quoi ne
      //   reconstruit plus jamais tout l'écran, uniquement la liste
      //   de résultats en dessous.
      + '<div class="search-bar" style="margin:10px 0;"><span style="display:flex;align-items:center;"><svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg></span>'
      + '<input id="ma-returns-search" placeholder="Rechercher…" value="' + esc(window._maReturnsSearch || '') + '" oninput="maReturnsSearch(this.value)"></div>'
      + '<div id="ma-returns-list"></div>';
    host.innerHTML = head;
    renderReturnsList();
  }
  function renderReturnsList() {
    var listHost = document.getElementById('ma-returns-list');
    if (!listHost) return;
    var target = returnsFilter === 'today' ? todayISO() : returnsFilter === 'tomorrow' ? plusDaysISO(1) : returnsDate;
    var q = (window._maReturnsSearch || '').trim().toLowerCase();
    // ★ SOURCE UNIQUE : même fonction que le compteur et que Desktop.
    var list = (ASLDB.selectReturnsOn ? ASLDB.selectReturnsOn(target) : [])
      .sort(function (a, b) { return (a.endTime || '').localeCompare(b.endTime || ''); });
    if (q) {
      list = list.filter(function (r) {
        var fc = fleet().filter(function (c) { return c.name === r.car || c.id === r.carId; })[0];
        var plate = (r.assignedPlate || (fc && fc.plate) || '').toLowerCase();
        return (r.client || '').toLowerCase().indexOf(q) >= 0 ||
               (r.car || '').toLowerCase().indexOf(q) >= 0 ||
               plate.indexOf(q) >= 0;
      });
    }
    listHost.innerHTML = list.length ? list.map(function (r) {
      var idStr = "'" + String(r.id || '') + "'";
      var reste = Math.max(0, (Number(r.amount) || 0) - (Number(r.paid) || 0));
      return '<div class="ma-card ma-return-card" onclick="maViewRental(' + idStr + ',\'returns\')">'
        + '<div class="ma-card-top"><div class="ma-card-ico-box red">' + ic('returns') + '</div>'
        + '<div class="ma-card-info"><div class="ma-card-name">' + esc(r.car || 'Véhicule') + '</div>'
        + '<div class="ma-card-sub">' + (aslVehPlateColor(r) ? esc(aslVehPlateColor(r)) + ' · ' : '') + esc(r.client || '') + (r.endTime ? ' · retour ' + esc(r.endTime) : '') + '</div></div>'
        + (reste > 0 ? '<span class="ma-badge red">Reste ' + money(reste) + '</span>' : '<span class="ma-badge green">Payé</span>') + '</div>'
        + '<div class="ma-return-foot"><span>' + ic('eye') + ' Ouvrir la fiche</span><span class="ma-return-date">' + fmtDateT(r.endDate, r.endTime, '18:00') + '</span></div>'
        + '</div>';
    }).join('') : '<div class="ma-empty">' + (q ? 'Aucun résultat pour cette recherche.' : 'Aucun retour prévu pour cette date.') + '</div>';
  }

  /* ★ Point 7 — recherche rapide mobile, avec restauration du focus/curseur
     après le re-rendu complet de la liste (comme sur Desktop). */
  window.maReturnsSearch = function (q) {
    window._maReturnsSearch = q;
    renderReturnsList();
    var input = document.getElementById('ma-returns-search');
    if (input) {
      input.focus();
      var pos = q.length;
      try { input.setSelectionRange(pos, pos); } catch (e) {}
    }
  };

  /* ============ DISPONIBLES (vue mobile native) ============ */
  function renderAvailableM() {
    var host = document.getElementById('ma-available');
    if (!host) return;
    var ts = todayISO();
    var res = reservations();
    // ★ Une carte par UNITÉ physique disponible (pas par modèle) : un modèle
    //   « Clio 5 » avec 3 unités libres doit produire 3 cartes distinctes,
    //   chacune avec sa propre plaque/couleur — même logique que renderVehicles.
    // ★ CORRECTIF (cohérence compteur/liste, cf. Desktop) — cette liste
    //   filtrait sur l'ancien indicateur manuel stocké (unit.status), un
    //   système indépendant du compteur qui, lui, calcule la disponibilité
    //   RÉELLE à partir des réservations. Désormais même source unique
    //   (ASLDB.unitsAvailableNow) que le compteur et que la liste Desktop.
    var rows = [];
    fleet().forEach(function (c) {
      if (c.status === 'lld') return;
      var av = (typeof ASLDB !== 'undefined' && ASLDB.unitsAvailableNow) ? ASLDB.unitsAvailableNow(c) : { freeUnits: [] };
      // ★ LOT 46 (point 1) : réservations sans voiture attribuée affichées UNE
      //   fois au-dessus du modèle ; celles liées à une plaque, sous cette
      //   voiture seulement (même règle que le desktop).
      var up = (typeof aslUpcomingByModel === 'function') ? aslUpcomingByModel(c, res, ts) : { pool: [], byPlate: {} };
      if (av.freeUnits.length && up.pool.length) rows.push({ header: true, car: c, pool: up.pool });
      av.freeUnits.forEach(function (u) {
        rows.push({ car: c, unit: u, fut: (up.byPlate[u.plate] || [])[0] || null });
      });
    });
    host.innerHTML = rows.length ? rows.map(function (row) {
      var c = row.car, u = row.unit;
      if (row.header) {
        return '<div class="ma-card-note orange" style="margin:14px 0 8px;border-radius:12px;padding:10px 12px;display:block;">'
          + '<div style="font-weight:800;color:#101216;margin-bottom:2px;">' + esc(c.name || 'Véhicule') + '</div>'
          + ic('calendar') + ' ' + esc(aslPoolText(row.pool, function (r, k) { return k === 'start' ? fmtDMT(r.startDate, r.startTime, '10:00') : fmtDMT(r.endDate, r.endTime, '18:00'); }))
          + '</div>';
      }
      var fut = row.fut;
      var subLine = esc(u.plate || '—') + (u.color ? ' · ' + esc(u.color) : '');
      return '<div class="ma-card">'
        + '<div class="ma-card-top"><div class="ma-card-ico-box green">' + ic('car') + '</div>'
        + '<div class="ma-card-info"><div class="ma-card-name">' + esc(c.name || 'Véhicule') + '</div>'
        + '<div class="ma-card-sub">' + subLine + '</div></div>'
        + '<span class="ma-badge green">Disponible</span></div>'
        + (fut ? '<div class="ma-card-note orange">' + ic('calendar') + ' Réservée du ' + fmtDMT(fut.startDate, fut.startTime, '10:00') + ' au ' + fmtDMT(fut.endDate, fut.endTime, '18:00') + '</div>' : '')
        + '</div>';
    }).join('') : '<div class="ma-empty">Aucun véhicule disponible en ce moment.</div>';
  }

  /* ============ RÉSERVÉS (vue mobile, identique à Disponibles) ============ */
  function renderReservedM() {
    var host = document.getElementById('ma-reserved');
    if (!host) return;
    // ★ CORRECTIF (cohérence Desktop/Mobile, point 1) : cette liste utilisait
    //   encore l'ancienne comparaison de chaînes de date (ignorant l'heure
    //   et le fuseau) au lieu de ASLDB.computePhase() — même correction que
    //   pour "En retard". Actions ajoutées : confirmer la prise en charge
    //   (devient une location active) et ouvrir la fiche, comme sur Desktop.
    var ts = todayISO();
    var list = (ASLDB.selectReserved ? ASLDB.selectReserved() : []).sort(function (a, b) { return String(a.startDate || '').localeCompare(String(b.startDate || '')); });
    host.innerHTML = list.length ? list.map(function (r) {
      // Immatriculation depuis la flotte
      var plate = aslVehPlateColor(r); // ★ Demande 6 : plaque · couleur
      var idStr = "'" + String(r.id || '') + "'";
      return '<div class="ma-card">'
        + '<div class="ma-card-top"><div class="ma-card-ico-box purple">' + ic('calendar') + '</div>'
        + '<div class="ma-card-info"><div class="ma-card-name">' + esc(r.car || 'Véhicule') + '</div>'
        + '<div class="ma-card-sub">' + esc(plate || '—') + '</div></div>'
        + '<span class="ma-badge purple">Réservé</span></div>'
        + '<div class="ma-card-note blue">' + ic('calendar') + ' Réservée du ' + fmtDMT(r.startDate, r.startTime, '10:00') + ' au ' + fmtDMT(r.endDate, r.endTime, '18:00') + '</div>'
        + '<div class="ma-card-note">' + ic('user') + ' ' + esc(r.client || r.finalClient || 'Client') + '</div>'
        + '<div class="ma-actions">'
        + '<button class="ma-act-btn" onclick="maViewRes(' + idStr + ')">' + ic('eye') + 'Fiche</button>'
        + '<button class="ma-act-btn ok" onclick="maConfirmPickup(' + idStr + ')">' + ic('check') + 'Prise en charge</button>'
        + '</div>'
        + '</div>';
    }).join('') : '<div class="ma-empty">Aucun véhicule réservé.</div>';
  }
  /* ★ Point 1 (Option 2) — Même comportement que Desktop : réutilise la
     fonction partagée confirmPickup() pour ne jamais dupliquer la logique. */
  window.maConfirmPickup = function (id) {
    if (typeof window.confirmPickup === 'function') window.confirmPickup(id);
    refreshSoon();
  };

  /* ============ ACTIVITÉS DU JOUR (dynamique) ============ */
  function renderActivitesM() {
    var host = document.getElementById('ma-activites');
    if (!host) return;
    var ts = todayISO();
    var r = reservations();
    var MAINT = {}; try { MAINT = JSON.parse(localStorage.getItem('asl_maint_v1') || '{}'); } catch (e) {}
    var todayMs = new Date(ts).getTime();

    // ★ SOURCE UNIQUE (bug corrigé) : cette liste de détail n'excluait pas
    //   les retours déjà confirmés, contrairement à son propre compteur —
    //   d'où un détail incohérent avec le chiffre affiché. Les deux
    //   appellent désormais la même fonction.
    var entrants = ASLDB.selectEntrantsOn ? ASLDB.selectEntrantsOn(ts) : [];
    var sortants = ASLDB.selectSortantsOn ? ASLDB.selectSortantsOn(ts) : [];
    // Visites techniques proches + vidanges dues
    var f = fleet();
    var vts = [], vids = [];
    // ★ CORRECTIF (LOT 44) — l'entretien est enregistré PAR IMMATRICULATION
    //   (clé « idModèle::plaque ») depuis la mise à jour de l'onglet
    //   Entretien ; cet écran lisait encore l'ancienne clé (id seul), qui
    //   n'existe plus : les deux blocs restaient toujours vides. Lecture
    //   par voiture, avec repli sur l'ancienne clé (même logique que les
    //   notifications).
    f.forEach(function (c) {
      var units = (typeof ASLDB !== 'undefined' && ASLDB.normalizeUnits) ? ASLDB.normalizeUnits(c) : [{ plate: c.plate || '', color: '' }];
      units.forEach(function (u) {
        var m = MAINT[String(c.id) + '::' + (u.plate || '_')] || MAINT[String(c.id)] || {};
        if (m.vt_next) { var dv = Math.round((new Date(m.vt_next) - todayMs) / 86400000); if (dv <= 7) vts.push({ car: c, plate: u.plate || '', color: u.color || '', m: m, dv: dv }); }
        if (m.reminder_next && new Date(m.reminder_next).getTime() <= todayMs + 86400000) vids.push({ car: c, plate: u.plate || '', color: u.color || '', m: m });
      });
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
          + '<div class="ma-card-sub">' + esc(v.plate) + (v.color ? ' · ' + esc(v.color) : '') + '</div></div>'
          + '<span class="ma-badge ' + (v.dv < 0 ? 'red' : 'orange') + '">' + (v.dv < 0 ? 'En retard' : 'Dans ' + v.dv + 'j') + '</span></div>'
          + '<div class="ma-card-note">' + ic('calendar') + ' Visite technique : ' + esc(v.m.vt_next) + '</div></div>';
      })
      + block('Vidanges', 'wrench', 'orange', vids, function (v) {
        var kmTxt = v.m.km_vidange_next ? Number(v.m.km_vidange_next).toLocaleString('fr-FR') + ' km' : '—';
        return '<div class="ma-card"><div class="ma-card-top"><div class="ma-card-ico-box orange">' + ic('wrench') + '</div>'
          + '<div class="ma-card-info"><div class="ma-card-name">' + esc(v.car.name) + '</div>'
          + '<div class="ma-card-sub">' + esc(v.plate) + (v.color ? ' · ' + esc(v.color) : '') + '</div></div>'
          + '<span class="ma-badge orange">À vérifier</span></div>'
          + '<div class="ma-card-note">' + ic('wrench') + ' Prochaine vidange : ' + kmTxt + '</div></div>';
      });
  }
  function resMiniCard(x, kind) {
    var plate = aslVehPlateColor(x); // ★ Demande 6 : plaque · couleur
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
    // ★ CORRECTIF (cohérence Desktop/Mobile) : cette liste utilisait encore
    //   l'ancienne comparaison de chaînes de date (ignorant l'heure et le
    //   fuseau), contrairement au reste de ce fichier et à Desktop — elle
    //   pouvait donc afficher un retard un jour trop tôt ou trop tard.
    //   Alignée sur ASLDB.computePhase(), la même source de vérité partout.
    var list = (ASLDB.selectLate ? ASLDB.selectLate() : []).sort(function (a, b) { return (a.endDate || '').localeCompare(b.endDate || ''); });
    host.innerHTML = list.length ? list.map(function (r) {
      var idStr = "'" + String(r.id || '') + "'";
      var days = Math.max(0, Math.round((new Date(ts) - new Date(r.endDate)) / 86400000));
      return '<div class="ma-card">'
        + '<div class="ma-card-top"><div class="ma-card-ico-box red">' + ic('alert') + '</div>'
        + '<div class="ma-card-info"><div class="ma-card-name">' + esc(r.car || 'Véhicule') + '</div>'
        + '<div class="ma-card-sub">' + (aslVehPlateColor(r) ? esc(aslVehPlateColor(r)) + ' · ' : '') + esc(r.client || '') + ' · retour prévu ' + fmtDateT(r.endDate, r.endTime, '18:00') + '</div></div>'
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
    // ★ CORRECTIF (point 2) — Même remplacement que sur Desktop : répartition
    //   par personne ayant réellement encaissé (champ "Encaissé par"),
    //   jamais l'utilisateur connecté, à la place des revenus
    //   semaine/mois/année. Seul ce résumé du Dashboard change — l'onglet
    //   complet "Caisse" reste identique.
    var byPerson = { Mohamed: 0, Younes: 0, Khalil: 0 };
    var dueGlobal = 0;
    reservations().forEach(function (r) {
      if (r.status === 'cancelled') return;
      var amount = Number(r.amount) || 0;
      var paid = Number(r.paid) || 0;
      dueGlobal += Math.max(0, amount - paid);
      if (paid > 0 && byPerson.hasOwnProperty(r.collectedBy)) byPerson[r.collectedBy] += paid;
    });
    var nonAttr = 0;
    reservations().forEach(function (r) {
      if (r.status === 'cancelled') return;
      var paid = Number(r.paid) || 0;
      if (paid > 0 && !byPerson.hasOwnProperty(r.collectedBy)) nonAttr += paid;
    });
    var totalEnc = byPerson.Mohamed + byPerson.Younes + byPerson.Khalil + nonAttr;
    function pCard(name, val, color) {
      return '<div class="ma-cash-card" style="border-color:' + color + ';cursor:pointer;" onclick="maCollectorDetail(\'' + name + '\')">'
        + '<div class="ma-cash-lbl">Encaissé par ' + name + ' ›</div>'
        + '<div class="ma-cash-num" style="color:' + color + ';">' + money(val) + '</div></div>';
    }
    host.innerHTML =
      '<div class="ma-cash-card" style="border-color:#16a34a;margin-bottom:14px;"><div class="ma-cash-lbl">Total encaissé (agence)</div>'
      + '<div class="ma-cash-num" style="color:#16a34a;font-size:26px;">' + money(totalEnc) + '</div></div>'
      + pCard('Mohamed', byPerson.Mohamed, '#16a34a')
      + pCard('Younes', byPerson.Younes, '#3b82f6')
      + pCard('Khalil', byPerson.Khalil, '#8b5cf6')
      + (nonAttr > 0 ? pCard('Non attribué', nonAttr, '#9ca3af') : '')
      + cashLine('Reste à encaisser', dueGlobal, (dueGlobal > 0 ? '#C41E3A' : '#16a34a'), 'Total de tous les impayés')
      + '<div id="ma-collector-detail"></div>';
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
      if (active) map[key].current = aslVehLabel(r);
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
      + (c.current ? '<span class="ma-badge blue ma-badge-wrap">' + esc(c.current) + '</span>' : '') + '</div>'
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
        + '<div><div class="ma-hist-car">' + esc(aslVehLabel(r)) + '</div>'
        + '<div class="ma-hist-dates">' + fmtDMT(r.startDate, r.startTime, '10:00') + ' → ' + fmtDMT(r.endDate, r.endTime, '18:00') + '</div></div>'
        + (reste > 0 ? '<span class="ma-badge red">Reste ' + money(reste) + '</span>' : '<span class="ma-badge green">Payé</span>')
        + '</button>';
    }).join('');
    // ★ Demande 2 : documents d'identité du client (mêmes données que la
    //   fiche desktop). Toucher une image l'ouvre en grand.
    var docsHtml = '';
    try {
      if (typeof aslGatherCustomerDocs === 'function' && typeof _custId === 'function' && c.items.length) {
        var k0 = _custId(c.items[0].email, c.items[0].client);
        var gd = aslGatherCustomerDocs(k0, c.items, { names: [name], phone: phone });
        var docRow = function (label, list) {
          var thumbs = list.map(function (en) {
            var encRef = encodeURIComponent(en.ref);
            return en.url.indexOf('application/pdf') >= 0
              ? '<button class="ma-doc-thumb ma-doc-pdf" onclick="previewCustDocRef(\'' + encRef + '\')">PDF</button>'
              : '<img class="ma-doc-thumb"' + (typeof aslDocImgAttrs === 'function' ? aslDocImgAttrs(en.url) : ' src="' + en.url + '"') + ' alt="' + esc(label) + '" onclick="previewCustDocRef(\'' + encRef + '\')">';
          }).join('');
          return '<div class="ma-doc-row"><div class="ma-doc-label">' + esc(label) + '</div>'
            + (thumbs ? '<div class="ma-doc-thumbs">' + thumbs + '</div>' : '<div class="ma-doc-empty">Aucun document</div>') + '</div>';
        };
        docsHtml = '<div class="ma-sheet-section">Documents d\'identité</div>'
          + docRow('Permis de conduire', gd.permis)
          + docRow(gd.identiteType || 'CIN / Passeport', gd.identite);
      }
    } catch (eDocs) { docsHtml = ''; }
    openSheet(
      '<div class="ma-sheet-title">' + esc(name) + '</div>'
      + '<div class="ma-sheet-sub">' + esc(phone || 'Pas de téléphone') + ' · Payé ' + money(c.paid) + ' · Reste ' + money(c.rest) + '</div>'
      + (c.phone ? '<a class="ma-action" style="text-decoration:none;" href="tel:' + esc(c.phone) + '">' + ic('phone') + ' Appeler le client</a>' : '')
      + docsHtml
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
    var list = (ASLDB.selectUnpaid ? ASLDB.selectUnpaid() : []).sort(function (a, b) { return (b.endDate || '').localeCompare(a.endDate || ''); });
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
          + '<div class="ma-card-sub">' + esc(aslVehLabel(r)) + ' · ' + esc(r.contractRef || r.id || '') + '</div></div>'
          + '<span class="ma-badge red">' + money(reste) + '</span></div>'
          + '<div class="ma-card-meta"><div class="ma-meta">Total<b>' + money(r.amount || 0) + '</b></div>'
          + '<div class="ma-meta">Payé<b style="color:#16a34a;">' + money(r.paid || 0) + '</b></div>'
          + '<div class="ma-meta">Retour<b' + (late ? ' style="color:#C41E3A;"' : '') + '>' + fmtDateT(r.endDate, r.endTime, '18:00') + (late ? ' (retard)' : '') + '</b></div></div>'
          + '<div style="display:flex;gap:8px;margin-top:10px;">'
          + '<button class="ma-act-btn" onclick="maViewRes(\'' + r.id + '\')">Voir la fiche</button>'
          + '<button class="ma-act-btn ok" onclick="maPayUnpaid(\'' + r.id + '\')">Encaisser</button>'
          + '<button class="ma-act-btn" onclick="maDiscountUnpaid(\'' + r.id + '\')">Remise</button>'
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
    // ★ LOT 46 : le versement est INSCRIT AU JOURNAL (comme sur desktop), à
    //   la suite des versements existants — y compris un montant déjà reçu
    //   hors journal, conservé en « Versement antérieur ». Encaisseur : celui
    //   du dossier (même attribution qu'avant dans la Caisse).
    var patch;
    if (typeof aslPaymentJournal === 'function') {
      var journal = aslJournalClean(aslPaymentJournal(r));
      journal.push({ date: todayISO(), amount: Math.round(amount * 100) / 100, mode: r.paymentMode || 'Espèces', collectedBy: r.collectedBy || '', comment: 'Encaissé depuis le mobile' });
      var newPaidJ = aslJournalSum(journal);
      patch = { payments: journal, paid: newPaidJ, paymentStatus: newPaidJ >= (Number(r.amount) || 0) ? 'Paiement complet' : 'Paiement partiel' };
    } else {
      var newPaid = (Number(r.paid) || 0) + amount;
      patch = { paid: newPaid, paymentStatus: newPaid >= (Number(r.amount) || 0) ? 'paid' : 'partial' };
    }
    try { ASLDB.updateReservation(resId, patch); } catch (e) {}
    if (typeof showToast === 'function') showToast('Paiement de ' + money(amount) + ' enregistré ✓');
    renderUnpaidM();
  };

  /* ★ Demande 5 — Remise sur un impayé (même logique que le desktop :
     aslApplyDiscount, déduite du reste dû et tracée dans le dossier). */
  window.maDiscountUnpaid = function (resId) {
    var r = (ASLDB.getReservations() || []).filter(function (x) { return x.id === resId; })[0];
    if (!r) return;
    var reste = Math.max(0, (Number(r.amount) || 0) - (Number(r.paid) || 0));
    var ds = (typeof aslDiscountSum === 'function') ? aslDiscountSum(r) : 0;
    openSheet(
      '<div class="ma-sheet-title">Remise</div>'
      + '<div class="ma-sheet-sub">' + esc(r.client || 'Client') + ' · ' + esc(aslVehLabel(r)) + '</div>'
      + '<div class="ma-card-meta" style="margin-bottom:12px;"><div class="ma-meta">Reste dû<b style="color:#C41E3A;">' + money(reste) + '</b></div>'
      + (ds > 0 ? '<div class="ma-meta">Remises déjà accordées<b style="color:#16a34a;">−' + money(ds) + '</b></div>' : '') + '</div>'
      + '<div class="form-group"><label class="form-label">Montant de la remise (MAD)</label><input class="form-input" type="number" inputmode="decimal" min="0" step="any" id="ma-disc-amount" placeholder="Max ' + Math.round(reste) + '"></div>'
      + '<div class="form-group"><label class="form-label">Motif (facultatif)</label><input class="form-input" id="ma-disc-note" placeholder="Ex : arrangement avec le client"></div>'
      + '<button class="ma-act-btn ok" style="margin-top:6px;width:100%;" onclick="maApplyDiscount(\'' + r.id + '\')">Appliquer la remise</button>'
      + '<div style="font-size:12px;color:#8a909a;margin-top:10px;">La remise est déduite du reste dû. Si le reste tombe à 0, le dossier est soldé.</div>'
    );
  };
  window.maApplyDiscount = function (resId) {
    if (typeof aslApplyDiscount !== 'function') return;
    var a = document.getElementById('ma-disc-amount'), n = document.getElementById('ma-disc-note');
    if (aslApplyDiscount(resId, a ? a.value : 0, n ? n.value : '')) { closeSheet(); renderUnpaidM(); }
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
      var plate = aslVehPlateColor(r); // ★ Demande 6 : plaque · couleur
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
        + '<div class="ma-card-sub">' + esc(aslVehLabel(r)) + ' · ' + fmtDMT(r.startDate, r.startTime, '10:00') + ' → ' + fmtDMT(r.endDate, r.endTime, '18:00') + '</div></div>'
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

  /* ============ LOCATION LONGUE DURÉE (mobile) ============ */
  /* ★ CORRECTIF RACINE (LLD fantôme sur mobile) — Cause exacte : cet écran
     lisait encore l'ANCIEN magasin ASLLLD (clé asl_lld_v1), alors que
     Desktop a été migré vers les réservations type:'lld'. Deux sources de
     données différentes pour le même écran : d'où un contrat visible
     uniquement sur mobile, impossible à supprimer depuis Desktop.
     Mobile lit désormais EXACTEMENT la même source que Desktop. */
  function lldList() {
    try { return (ASLDB.getReservations() || []).filter(function (r) { return r.type === 'lld' && r.status !== 'cancelled'; }); }
    catch (e) { return []; }
  }
  function lldTotals(c) {
    var paid = (c.payments || []).reduce(function (s, p) { return s + (Number(p.amount) || 0); }, 0);
    var due = Number(c.amount) || 0;
    return { due: due, paid: paid, rest: Math.max(0, due - paid) };
  }
  function renderLLDM() {
    var host = document.getElementById('ma-lld');
    if (!host) return;
    var head = '<button class="ma-action" onclick="maNewLLD()">' + ic('plus') + ' Nouveau contrat LLD</button>'
      + '<input type="search" id="ma-lld-search" class="ma-search" placeholder="Rechercher (client, véhicule)…" oninput="maRenderLLDList()">';
    host.innerHTML = head + '<div id="ma-lld-list"></div>';
    maRenderLLDList();
  }
  window.maRenderLLDList = function () {
    var box = document.getElementById('ma-lld-list');
    if (!box) return;
    var q = ((document.getElementById('ma-lld-search') || {}).value || '').toLowerCase().trim();
    var list = lldList();
    if (q) list = list.filter(function (c) { return ((c.client || '') + ' ' + (c.car || '')).toLowerCase().indexOf(q) >= 0; });
    if (!list.length) { box.innerHTML = '<div class="ma-empty">Aucun contrat de location longue durée.</div>'; return; }
    box.innerHTML = list.map(function (c) {
      var t = lldTotals(c);
      return '<div class="ma-card" onclick="maLLDFiche(\'' + c.id + '\')">'
        + '<div class="ma-card-top"><div class="ma-card-ico-box purple">' + ic('calendar') + '</div>'
        + '<div class="ma-card-info"><div class="ma-card-name">' + esc(c.client || 'Client') + '</div>'
        + '<div class="ma-card-sub">' + esc(aslVehLabel(c)) + '</div></div>'
        + '<span class="ma-badge ' + (t.rest > 0 ? 'red' : 'green') + '">' + (t.rest > 0 ? money(t.rest) : 'Soldé') + '</span></div>'
        + '<div class="ma-card-meta">'
        + '<div class="ma-meta">Début<b>' + esc(c.startDate || '—') + '</b></div>'
        + '<div class="ma-meta">Durée<b>' + (c.days || 0) + ' j</b></div>'
        + '<div class="ma-meta">Total<b>' + money(t.due) + '</b></div>'
        + '<div class="ma-meta">Reste<b style="color:' + (t.rest > 0 ? '#C41E3A' : '#16a34a') + ';">' + money(t.rest) + '</b></div></div>'
        + '</div>';
    }).join('');
  };
  window.maNewLLD = function () {
    enterDesktopView();
    if (typeof window.showPage === 'function') window.showPage('lld', null);
    setTimeout(function () { if (typeof window._buildNewLocationModal === 'function') window._buildNewLocationModal(true); }, 120);
    maShowBackToApp();
  };
  /* Fiche LLD mobile : historique de versements LIBRES, identique à Desktop. */
  window.maLLDFiche = function (id) {
    var c = lldList().filter(function (x) { return String(x.id) === String(id); })[0];
    if (!c) return;
    var t = lldTotals(c);
    function row(label, val, color) {
      return '<div class="ma-fiche-row"><span class="ma-fiche-lbl">' + label + '</span><span class="ma-fiche-val"' + (color ? ' style="color:' + color + ';"' : '') + '>' + val + '</span></div>';
    }
    var pays = (c.payments || []).slice().sort(function (a, b) { return String(a.date || '').localeCompare(String(b.date || '')); });
    var paysHtml = pays.length ? pays.map(function (pmt) {
      return '<div class="ma-card" style="margin-bottom:8px;"><div class="ma-card-top">'
        + '<div class="ma-card-info"><div class="ma-card-name" style="font-size:14px;">' + money(pmt.amount) + '</div>'
        + '<div class="ma-card-sub">' + esc(pmt.date || '—') + ' · ' + esc(pmt.mode || '—') + ' · ' + esc(pmt.collectedBy || 'non renseigné') + '</div></div>'
        + '</div></div>';
    }).join('') : '<div class="ma-empty" style="padding:14px;">Aucun versement enregistré.</div>';
    openSheet(
      '<div class="ma-sheet-title">' + esc(c.client || 'Contrat LLD') + '</div>'
      + '<div style="font-size:13px;color:#6b7280;margin:-6px 0 14px;">' + esc(aslVehLabel(c)) + '</div>'
      + row('Période', esc(c.startDate || '—') + ' → ' + esc(c.endDate || '—'))
      + row('Durée', (c.days || 0) + ' jours')
      + row('Montant total', money(t.due))
      + row('Total reçu', money(t.paid), '#16a34a')
      + row('Reste à payer', money(t.rest), t.rest > 0 ? '#C41E3A' : '#16a34a')
      + '<div style="font-weight:700;margin:16px 0 8px;">Historique des paiements</div>'
      + paysHtml
      + '<div class="ma-actions" style="margin-top:12px;"><button class="ma-act-btn ok" onclick="maLLDPay(\'' + c.id + '\')">' + ic('plus') + 'Ajouter un versement</button></div>'
    );
  };
  /* Ajout d'un versement LIBRE — délègue à la fonction partagée avec
     Desktop pour ne jamais dupliquer la logique (donc jamais diverger). */
  window.maLLDPay = function (id) {
    if (typeof window.addLLDPaymentEntry === 'function') {
      window.addLLDPaymentEntry(id);
      maCloseSheet();
      setTimeout(function () { maRenderLLDList(); }, 150);
      return;
    }
    if (typeof showToast === 'function') showToast('Module LLD indisponible.');
  };

  /* ★ Détail des encaissements d'une personne (identique à Desktop). */
  window.maCollectorDetail = function (name) {
    var box = document.getElementById('ma-collector-detail');
    if (!box) return;
    var names = ['Mohamed', 'Younes', 'Khalil'];
    // ★ CORRECTIF (paiements partiels par plusieurs personnes) — même
    //   correctif que Desktop : une ligne PAR VERSEMENT quand le détail
    //   existe (r.payments[]), pour que chaque personne ne voie que sa
    //   propre part d'un dossier réglé en plusieurs fois.
    var lines = [];
    reservations().forEach(function (r) {
      if (r.status === 'cancelled') return;
      if (Array.isArray(r.payments) && r.payments.length) {
        r.payments.forEach(function (p) {
          var amt = Number(p.amount) || 0;
          if (amt <= 0) return;
          var who = p.collectedBy || '';
          var matches = (name === 'Non attribué') ? names.indexOf(who) < 0 : who === name;
          if (matches) lines.push({ r: r, amount: amt, date: p.date || '' });
        });
      } else {
        var paid = Number(r.paid) || 0;
        if (paid <= 0) return;
        var who2 = r.collectedBy || '';
        var matches2 = (name === 'Non attribué') ? names.indexOf(who2) < 0 : who2 === name;
        if (matches2) lines.push({ r: r, amount: paid, date: '' });
      }
    });
    var total = lines.reduce(function (s2, l) { return s2 + l.amount; }, 0);
    box.innerHTML = '<div style="margin-top:14px;">'
      + '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">'
      + '<b style="font-size:14px;">Détail — ' + esc(name) + ' (' + lines.length + ')</b>'
      + '<button class="ma-act-btn" style="padding:4px 10px;" onclick="document.getElementById(\'ma-collector-detail\').innerHTML=\'\'">Fermer</button></div>'
      + (lines.length ? lines.map(function (l) {
          var r = l.r;
          var resteImpaye = Math.max(0, (Number(r.amount) || 0) - (Number(r.paid) || 0));
          return '<div class="ma-card" style="margin-bottom:8px;"><div class="ma-card-top">'
            + '<div class="ma-card-info"><div class="ma-card-name" style="font-size:14px;">' + esc(r.contractRef || r.id) + (l.date ? ' <span style="font-weight:400;color:#8a909a;">— ' + esc(l.date) + '</span>' : '') + '</div>'
            + '<div class="ma-card-sub">' + esc(r.client || '') + ' · ' + esc(aslVehLabel(r)) + '</div>'
            + '<div class="ma-card-sub" style="margin-top:2px;">' + (r.days || 0) + ' jour(s)' + (resteImpaye > 0 ? ' · <span style="color:#C41E3A;font-weight:700;">reste ' + money(resteImpaye) + ' (dossier)</span>' : ' · <span style="color:#16a34a;">dossier soldé</span>') + '</div></div>'
            + '<span class="ma-badge green">' + money(l.amount) + '</span></div></div>';
        }).join('') : '<div class="ma-empty">Aucun encaissement.</div>')
      + '<div class="ma-cash-card" style="border-color:#16a34a;"><div class="ma-cash-lbl">Total</div>'
      + '<div class="ma-cash-num" style="color:#16a34a;">' + money(total) + '</div></div></div>';
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
    // ★ Point 2 : mêmes fonctions PARTAGÉES que Desktop (ASLDB.select*) —
    //   plus aucune divergence possible entre les deux versions.
    (ASLDB.selectReturnsOn ? ASLDB.selectReturnsOn(ts) : r.filter(function (x) { return (x.endDate || '').slice(0, 10) === ts && x.status !== 'cancelled' && x.status !== 'completed'; }))
      .forEach(function (x) { add('returns', 'orange', 'Retour aujourd\'hui', aslVehLabel(x) + ' — ' + (x.client || ''), x.id); });
    var tmStr = plusDaysISO(1);
    (ASLDB.selectReturnsOn ? ASLDB.selectReturnsOn(tmStr) : r.filter(function (x) { return (x.endDate || '').slice(0, 10) === tmStr && x.status !== 'cancelled' && x.status !== 'completed'; }))
      .forEach(function (x) { add('calendarClock', 'blue', 'Retour demain', aslVehLabel(x) + ' — ' + (x.client || ''), x.id); });
    (ASLDB.selectLate ? ASLDB.selectLate() : r.filter(function (x) { return (x.endDate || '') < ts && (x.status === 'active' || x.status === 'confirmed'); }))
      .forEach(function (x) { add('alert', 'red', 'Véhicule en retard', aslVehLabel(x) + ' — ' + (x.client || '') + ' (prévu le ' + (x.endDate || '') + ')', x.id); });
    (ASLDB.selectUnpaid ? ASLDB.selectUnpaid() : r.filter(function (x) { return x.status !== 'cancelled' && (Number(x.amount) || 0) > (Number(x.paid) || 0); }))
      .forEach(function (x) { var reste = (Number(x.amount) || 0) - (Number(x.paid) || 0); add('card', 'red', 'Impayé : ' + money(reste), (x.client || '') + ' — ' + aslVehLabel(x), x.id); });
    var cutoff = Date.now() - 48 * 3600 * 1000;
    r.filter(function (x) { return x.createdAt && new Date(x.createdAt).getTime() > cutoff && x.status === 'pending'; })
      .forEach(function (x) { add('sparkle', 'green', 'Nouvelle réservation', (x.client || '') + ' — ' + aslVehLabel(x) + (x.source === 'online' ? ' (site web)' : ''), x.id); });
    r.filter(function (x) { return x.createdAt && new Date(x.createdAt).getTime() > cutoff && (x.status === 'active' || x.status === 'confirmed'); })
      .forEach(function (x) { add('key', 'teal', 'Nouvelle location', (x.client || '') + ' — ' + aslVehLabel(x), x.id); });
    r.filter(function (x) { return x.createdAt && new Date(x.createdAt).getTime() > cutoff && (Number(x.paid) || 0) > 0 && (Number(x.paid) || 0) >= (Number(x.amount) || 0); })
      .forEach(function (x) { add('checkCircle', 'green', 'Paiement reçu', (x.client || '') + ' — ' + money(x.paid), x.id); });

    /* Rappels de vérification vidange (tous les 20 jours) — une notification
       PAR IMMATRICULATION, cohérent avec le suivi d'entretien par plaque. */
    var MAINT = {};
    try { MAINT = JSON.parse(localStorage.getItem('asl_maint_v1') || '{}'); } catch (e) {}
    var fl = fleet();
    var todayMs = (function () { var d = new Date(); d.setHours(0, 0, 0, 0); return d.getTime(); })();
    var seenReminder = {};
    fl.forEach(function (c) {
      var units = (typeof ASLDB !== 'undefined' && ASLDB.normalizeUnits) ? ASLDB.normalizeUnits(c) : [{ plate: c.plate || '' }];
      units.forEach(function (u) {
        var key = String(c.id) + '::' + (u.plate || '_');
        var m = MAINT[key] || MAINT[String(c.id)] || {}; // compat pendant la migration
        if (!m.reminder_next || seenReminder[key]) return;
        if (new Date(m.reminder_next).getTime() <= todayMs + 86400000) {
          seenReminder[key] = true;
          var kmTxt = m.km_vidange_next ? Number(m.km_vidange_next).toLocaleString('fr-FR') + ' km' : '—';
          var lbl = (c.name || '') + (u.plate ? ' (' + u.plate + (u.color ? ' · ' + u.color : '') + ')' : '');
          notifs.push({ icon: 'wrench', tone: 'orange', title: 'Vérifier le km de ' + lbl, sub: 'Prochaine vidange prévue à ' + kmTxt, id: '', maint: true });
        }
      });
    });

    if (host) {
      host.innerHTML = notifs.length ? notifs.map(function (n) {
        var clk = n.maint ? 'maExitToPage(\'maintenance\')' : 'maViewRes(\'' + String(n.id || '') + '\')';
        return '<div class="ma-notif" onclick="' + clk + '"><div class="ma-notif-ico ' + n.tone + '">' + ic(n.icon) + '</div>'
          + '<div class="ma-notif-body"><div class="ma-notif-title">' + esc(n.title) + '</div><div class="ma-notif-sub">' + esc(n.sub) + '</div></div>'
          + '<span class="ma-notif-chev">' + ic('arrowLeft') + '</span></div>'; // flèche « ouvrir » (retournée en CSS)
      }).join('') : '<div class="ma-empty">' + ic('checkCircle') + '<div style="margin-top:8px;">Aucune notification. Tout est à jour.</div></div>';
    }
    var dot = document.querySelector('.ma-tab[data-screen="notifications"] .ma-tab-dot');
    if (dot) { if (notifs.length) { dot.textContent = notifs.length > 99 ? '99+' : notifs.length; dot.style.display = 'flex'; } else dot.style.display = 'none'; }
    var hdot = document.getElementById('ma-head-dot');
    if (hdot) hdot.style.display = notifs.length ? 'block' : 'none';
  }

  /* ============ "PLUS" : modules mobiles autorisés ============ */
  window.maOpenMore = function () {
    // ★ LOT 52 : menu réorganisé — Créer / Gestion (permissions inchangées).
    var create = [
      { ico: 'key', label: 'Nouvelle location', sub: 'Client, voiture, paiement en 3 étapes', act: 'maNewLocation()', perm: 'rentals|reservations', cls: ' dark' },
      { ico: 'calendar', label: 'Nouvelle réservation', act: 'maNewReservation()', perm: 'reservations' },
      { ico: 'receipt', label: 'Ajouter une charge', sub: 'Carburant, AdBlue, vidange…', act: 'maAddCharge()', perm: 'caisse' },
      { ico: 'handshake', label: 'Nouvelle sous-location', sub: 'Accord avec un partenaire', act: 'closeSheet();maNewSublease()', perm: 'sublease' }
    ];
    var manage = [
      { ico: 'history', label: 'Historique', act: "maMore('history')", perm: null },
      { ico: 'users', label: 'Clients', act: "maMore('clients')", perm: null },
      { ico: 'handshake', label: 'Sous-location', act: "maMore('sublease')", perm: 'sublease' },
      { ico: 'calendar', label: 'Location longue durée', act: "maMore('lld')", perm: 'sublease' },
      { ico: 'wrench', label: 'Entretien', sub: 'Visites techniques et vidanges', act: "maExitToPage('maintenance')", perm: 'maintenance' },
      { ico: 'scale', label: 'Rendement', sub: 'Jours loués et bénéfice par voiture', act: "maExitToPage('rendement')", perm: 'caisse' }
    ];
    function allowed(it) { return !it.perm || it.perm.split('|').some(function (p) { return can(p); }); }
    function row(it) { return '<button class="ma-sheet-item" onclick="' + it.act + '"><span class="ma-sheet-ico">' + ic(it.ico) + '</span><span style="flex:1;text-align:left;"><span style="display:block;">' + it.label + '</span>' + (it.sub ? '<span style="display:block;font-size:12.5px;font-weight:500;color:#646B78;">' + it.sub + '</span>' : '') + '</span></button>'; }
    var c = create.filter(allowed), m = manage.filter(allowed);
    openSheet(
      '<div class="ma-sheet-title">Plus</div>'
      + (c.length ? '<div class="ma-sheet-section">Créer</div>' + c.map(row).join('') : '')
      + '<div class="ma-sheet-section">Gestion</div>' + m.map(row).join('')
      + '<button class="ma-sheet-item danger" onclick="maLogout()"><span class="ma-sheet-ico">' + ic('logout') + '</span>Se déconnecter</button>'
    );
  };
  /* Ajouter une charge depuis le mobile : même fenêtre que l'ordinateur
     (adaptée au téléphone par son style). */
  window.maAddCharge = function () { closeSheet(); if (typeof window.openChargeModal === 'function') window.openChargeModal(); };
  /* ======================================================================
     ★ LOT 52 — NOUVELLE LOCATION / RÉSERVATION EN 3 ÉTAPES (mobile)
     Étape 1 : client (recherche dans la base, ou nouveau client)
     Étape 2 : dates + voitures libres (même règle de disponibilité)
     Étape 3 : prix, acompte, mode, encaissé par, lieu → Enregistrer
     SÉCURITÉ DES DONNÉES : l'assistant ne sauvegarde RIEN lui-même. Il
     remplit le formulaire existant (pop-up ordinateur, masqué) et lance SON
     enregistrement : validations, contrôle de conflit, journal des
     versements, documents, synchronisation = strictement identiques.
     Repli : en cas de souci, le formulaire classique reste utilisable.
     ====================================================================== */
  var WZ = null;
  function wzNew(kind, doc) {
    var t = todayISO();
    return { kind: kind || 'location', doc: doc || 'direct', subleaseId: '', step: 1, q: '', client: null, isNew: false,
      nf: { first: '', last: '', phone: '' },
      start: t, startTime: '10:00', end: '', endTime: '10:00', unit: null,
      ppu: '', total: '', totalEdited: false, paid: '', mode: 'Espèces', by: '', pickup: '', notes: '' };
  }
  function wzDays() {
    if (!WZ.start || !WZ.end) return 0;
    var a = new Date(WZ.start + 'T' + (WZ.startTime || '10:00')), b = new Date(WZ.end + 'T' + (WZ.endTime || '10:00'));
    var h = (b - a) / 3600000;
    return h > 0 ? Math.max(1, Math.ceil(h / 24 - 0.0001)) : 0;
  }
  function wzClientsList() {
    var dir = (typeof aslCustomerDirectory === 'function') ? aslCustomerDirectory() : [];
    var q = (WZ.q || '').trim().toLowerCase(), qd = q.replace(/\D/g, '');
    if (!q) return dir.slice(0, 5);
    return dir.filter(function (c) {
      return (c.display + ' ' + (c.email || '')).toLowerCase().indexOf(q) >= 0 || (qd.length >= 3 && String(c.phone || '').replace(/\D/g, '').indexOf(qd) >= 0);
    }).slice(0, 8);
  }
  /* Voitures : un modèle est « complet » si checkAvailability le refuse ;
     une voiture précise est « occupée » si un dossier qui lui est attribué
     chevauche les dates. */
  function wzUnits() {
    var out = [];
    var s = WZ.start, e = WZ.end, st = WZ.startTime, et = WZ.endTime;
    var a = new Date(s + 'T' + (st || '10:00')), b = new Date((e || s) + 'T' + (et || '10:00'));
    var res = (ASLDB.getReservations && ASLDB.getReservations()) || [];
    fleet().forEach(function (c) {
      if (c.status === 'lld') return;
      var units = (ASLDB.normalizeUnits ? ASLDB.normalizeUnits(c) : []) || [];
      if (!units.length) units = [{ plate: c.plate || '', color: c.color || '' }];
      var model = (e && ASLDB.checkAvailability) ? ASLDB.checkAvailability(c, s, e, st, et) : { available: true };
      units.forEach(function (u) {
        var us = (u && u.status) || 'available';
        var out1 = { carId: c.id, model: c.name || '', plate: u.plate || '', color: u.color || '', ref: c.priceMAD || Math.round((c.priceEUR || 0) * 10.8) || '' };
        if (us === 'maintenance' || us === 'offroad' || us === 'lld') { out1.state = 'off'; out1.why = 'Indisponible'; }
        else if (!model.available) { out1.state = 'off'; out1.why = 'Modèle complet'; }
        else {
          var busy = res.filter(function (r) {
            if (!r || r.status === 'cancelled' || r.status === 'completed' || String(r.carId) !== String(c.id) || !u.plate || r.assignedPlate !== u.plate) return false;
            var rs = new Date(String(r.startDate).slice(0, 10) + 'T' + (r.startTime || '10:00')), re = new Date(String(r.endDate || r.startDate).slice(0, 10) + 'T' + (r.endTime || '10:00'));
            return rs < b && re > a;
          })[0];
          if (busy) { out1.state = 'off'; out1.why = 'Occupée → ' + String(busy.endDate || '').slice(8, 10) + '/' + String(busy.endDate || '').slice(5, 7); }
          else out1.state = 'free';
        }
        out.push(out1);
      });
    });
    out.sort(function (x, y) { return (x.state === y.state ? 0 : (x.state === 'free' ? -1 : 1)) || (x.model + x.plate).localeCompare(y.model + y.plate, 'fr'); });
    return out;
  }
  function wzSeg(field, a, b, va, vb) {
    return '<div class="wz-seg"><button type="button" class="' + (WZ[field] === va ? 'on' : '') + '" onclick="maWz(\'' + field + '\',\'' + va + '\')">' + a + '</button><button type="button" class="' + (WZ[field] === vb ? 'on' : '') + '" onclick="maWz(\'' + field + '\',\'' + vb + '\')">' + b + '</button></div>';
  }
  function wzChips(field, list) {
    return '<div class="wz-chips">' + list.map(function (v) { return '<button type="button" class="' + (WZ[field] === v ? 'on' : '') + '" onclick="maWz(\'' + field + '\',\'' + esc(v) + '\')">' + esc(v) + '</button>'; }).join('') + '</div>';
  }
  function wzInput(field, label, type, ph, extra) {
    return '<label class="wz-field"><span>' + label + '</span><input type="' + (type || 'text') + '" value="' + esc(WZ[field] == null ? '' : WZ[field]) + '" placeholder="' + esc(ph || '') + '" ' + (extra || '') + ' oninput="maWzIn(\'' + field + '\',this.value)"></label>';
  }
  function wzRender(keepFocus) {
    var host = document.getElementById('ma-wiz'); if (!host) return;
    var kindLbl = WZ.kind === 'location' ? 'Nouvelle location' : 'Nouvelle réservation';
    var labels = ['Client', 'Voiture et dates', 'Paiement'];
    var clientName = WZ.client ? WZ.client.display : ((WZ.nf.first + ' ' + WZ.nf.last).trim());
    var head = '<div class="wz-top">'
      + '<button type="button" class="wz-icon" aria-label="' + (WZ.step === 1 ? 'Fermer' : 'Étape précédente') + '" onclick="' + (WZ.step === 1 ? 'maWzClose()' : 'maWzStep(-1)') + '">' + ic(WZ.step === 1 ? 'x' : 'arrowLeft') + '</button>'
      + '<div class="wz-ttl"><b>' + kindLbl + '</b>' + (WZ.step > 1 && clientName ? '<small>' + esc(clientName) + (WZ.step > 2 && WZ.unit ? ' · ' + esc(WZ.unit.model) : '') + '</small>' : '') + '</div></div>'
      + '<div class="wz-steps"><div>' + [1, 2, 3].map(function (i) { return '<i class="' + (i <= WZ.step ? 'on' : '') + '"></i>'; }).join('') + '</div><span>Étape ' + WZ.step + ' sur 3 · ' + labels[WZ.step - 1] + '</span></div>';
    var body = '', btn = '', ok = true;
    if (WZ.step === 1) {
      var subOpts = (WZ.doc === 'sublease' && window.ASLSublease && ASLSublease.options) ? ASLSublease.options(WZ.subleaseId) : '';
      body = wzSeg('kind', 'Location', 'Réservation', 'location', 'reservation')
        + wzSeg('doc', 'Client direct', 'Sous-location', 'direct', 'sublease')
        + (WZ.doc === 'sublease' ? '<label class="wz-field"><span>Sous-location</span><select onchange="maWzIn(\'subleaseId\',this.value)">' + subOpts + '</select></label><div class="wz-note">Le client ci-dessous est le client final de cette sous-location.</div>' : '');
      if (!WZ.isNew) {
        var list = wzClientsList();
        body += '<label class="wz-search">' + ic('search') + '<input id="wz-q" type="search" value="' + esc(WZ.q) + '" placeholder="Nom ou téléphone du client" autocomplete="off" oninput="maWzQ(this.value)"></label>'
          + '<div class="wz-sec">' + (WZ.q ? 'Clients trouvés' : 'Clients récents') + '</div>'
          + (list.length ? list.map(function (c) {
              var on = WZ.client && WZ.client.key === c.key;
              return '<button type="button" class="wz-row' + (on ? ' on' : '') + '" data-k="' + esc(encodeURIComponent(c.key)) + '" onclick="maWzPick(this.dataset.k)"><span class="wz-ava">' + esc((c.display || '?').charAt(0).toUpperCase()) + '</span><span class="wz-rt"><b>' + esc(c.display) + '</b><small>' + esc((c.phone || 'Pas de téléphone') + ' · ' + c.count + ' dossier' + (c.count > 1 ? 's' : '')) + '</small></span>' + (on ? '<span class="wz-check">' + ic('check') + '</span>' : '') + '</button>';
            }).join('') : '<div class="wz-note">Aucun client trouvé.</div>')
          + '<button type="button" class="wz-dashed" onclick="maWz(\'isNew\',\'1\')">' + ic('plus') + ' Nouveau client</button>';
        if (WZ.client) {
          var c0 = WZ.client;
          var docs = '';
          try { if (typeof aslGatherCustomerDocs === 'function') { var gd = aslGatherCustomerDocs(c0.key, (ASLDB.getReservations() || []).filter(function (r) { return typeof _custId === 'function' && _custId(r.email, r.client) === c0.key; }), { names: [c0.display], phone: c0.phone }); docs = (gd.permis.length ? 'Permis ✓' : 'Permis manquant') + ' · ' + (gd.identite.length ? 'CIN ✓' : 'CIN manquante'); } } catch (e0) {}
          body += '<div class="wz-card"><div class="wz-sec" style="margin:0 0 6px;">Rempli automatiquement</div>'
            + '<div class="wz-kv"><span>Téléphone</span><b>' + esc(c0.phone || '—') + '</b></div>'
            + (c0.profession ? '<div class="wz-kv"><span>Profession</span><b>' + esc(c0.profession) + '</b></div>' : '')
            + (c0.nationality ? '<div class="wz-kv"><span>Nationalité</span><b>' + esc(c0.nationality) + '</b></div>' : '')
            + (docs ? '<div class="wz-kv"><span>Documents</span><b>' + esc(docs) + '</b></div>' : '') + '</div>';
        }
        ok = !!WZ.client;
      } else {
        body += '<div class="wz-sec">Nouveau client</div>' + wzInput('nf.first', 'Prénom', 'text', 'Prénom') + wzInput('nf.last', 'Nom', 'text', 'Nom') + wzInput('nf.phone', 'Téléphone / WhatsApp', 'tel', '+212 6…', 'inputmode="tel"')
          + '<button type="button" class="wz-dashed" onclick="maWz(\'isNew\',\'\')">' + ic('search') + ' Choisir un client existant</button>';
        ok = !!WZ.nf.first.trim();
      }
      if (WZ.doc === 'sublease' && !WZ.subleaseId) ok = false;
      btn = 'Continuer';
    } else if (WZ.step === 2) {
      var days = wzDays();
      body = '<div class="wz-two">'
        + '<label class="wz-field"><span>Départ</span><input type="date" value="' + esc(WZ.start) + '" onchange="maWz(\'start\',this.value)"><input type="time" value="' + esc(WZ.startTime) + '" onchange="maWz(\'startTime\',this.value)"></label>'
        + '<label class="wz-field"><span>Retour</span><input type="date" value="' + esc(WZ.end) + '" min="' + esc(WZ.start) + '" onchange="maWz(\'end\',this.value)"><input type="time" value="' + esc(WZ.endTime) + '" onchange="maWz(\'endTime\',this.value)"></label></div>'
        + '<div class="wz-days">' + (days ? days + ' jour' + (days > 1 ? 's' : '') : 'Choisissez la date de retour') + '</div>';
      if (WZ.end && days) {
        var us = wzUnits();
        var free = us.filter(function (u) { return u.state === 'free'; }), off = us.filter(function (u) { return u.state !== 'free'; });
        var row = function (u) {
          var on = WZ.unit && String(WZ.unit.carId) === String(u.carId) && WZ.unit.plate === u.plate;
          var dis = u.state !== 'free';
          return '<button type="button" class="wz-row' + (on ? ' on' : '') + (dis ? ' off' : '') + '" ' + (dis ? 'disabled' : '') + ' data-c="' + esc(u.carId) + '" data-p="' + esc(u.plate) + '" onclick="maWzUnit(this.dataset.c,this.dataset.p)">'
            + '<span class="wz-ava car">' + ic('car') + '</span><span class="wz-rt"><b>' + esc(u.model) + '</b><small>' + esc((u.plate || 'sans plaque') + (u.color ? ' · ' + u.color : '') + (u.ref ? ' · réf. ' + u.ref + ' MAD/j' : '')) + '</small></span>'
            + (on ? '<span class="wz-check">' + ic('check') + '</span>' : (dis ? '<span class="wz-pill off">' + esc(u.why) + '</span>' : '<span class="wz-pill ok">Libre</span>')) + '</button>';
        };
        if (WZ.kind === 'reservation') {
          // ★ Réservation : aucune plaque n'est bloquée (règle du logiciel) —
          //   on choisit un MODÈLE ; la voiture est attribuée à la prise en charge.
          var models = {}, mOrder = [];
          us.forEach(function (u) { var k = String(u.carId); if (!models[k]) { models[k] = { carId: u.carId, model: u.model, ref: u.ref, free: [], n: 0 }; mOrder.push(k); } models[k].n++; if (u.state === 'free') models[k].free.push(u); });
          var mrow = function (k) {
            var m = models[k], on = WZ.unit && String(WZ.unit.carId) === String(m.carId), dis = !m.free.length;
            return '<button type="button" class="wz-row' + (on ? ' on' : '') + (dis ? ' off' : '') + '" ' + (dis ? 'disabled' : '') + ' data-c="' + esc(m.carId) + '" data-p="' + esc(dis ? '' : m.free[0].plate) + '" onclick="maWzUnit(this.dataset.c,this.dataset.p)">'
              + '<span class="wz-ava car">' + ic('car') + '</span><span class="wz-rt"><b>' + esc(m.model) + '</b><small>' + (m.ref ? 'réf. ' + m.ref + ' MAD/j · ' : '') + 'voiture attribuée à la prise en charge</small></span>'
              + (on ? '<span class="wz-check">' + ic('check') + '</span>' : (dis ? '<span class="wz-pill off">Complet</span>' : '<span class="wz-pill ok">' + m.free.length + ' libre' + (m.free.length > 1 ? 's' : '') + '</span>')) + '</button>';
          };
          var okM = mOrder.filter(function (k) { return models[k].free.length; }), koM = mOrder.filter(function (k) { return !models[k].free.length; });
          body += '<div class="wz-sec">Modèles disponibles · ' + okM.length + '</div>' + (okM.length ? okM.map(mrow).join('') : '<div class="wz-note">Aucun modèle libre sur ces dates.</div>')
            + (koM.length ? '<div class="wz-sec">Complets</div>' + koM.map(mrow).join('') : '');
        } else {
        body += '<div class="wz-sec">Voitures libres sur ces dates · ' + free.length + '</div>' + (free.length ? free.map(row).join('') : '<div class="wz-note">Aucune voiture libre sur ces dates.</div>')
          + (off.length ? '<div class="wz-sec">Indisponibles</div>' + off.map(row).join('') : '');
        }
      }
      ok = !!(WZ.end && days && WZ.unit);
      btn = WZ.unit ? 'Continuer · ' + esc(WZ.unit.model) : 'Continuer';
    } else {
      var d3 = wzDays(), ppu = parseFloat(WZ.ppu) || 0;
      if (!WZ.totalEdited) WZ.total = ppu ? String(Math.round(ppu * d3 * 100) / 100) : '';
      var total = parseFloat(WZ.total) || 0, paid = parseFloat(WZ.paid) || 0;
      body = '<div class="wz-card"><div class="wz-kv"><span>Client</span><b>' + esc(clientName) + '</b></div><div class="wz-kv"><span>Voiture</span><b>' + esc(WZ.kind === 'reservation' ? WZ.unit.model + ' · attribuée à la prise en charge' : WZ.unit.model + ' · ' + (WZ.unit.plate || '') + (WZ.unit.color ? ' · ' + WZ.unit.color : '')) + '</b></div><div class="wz-kv"><span>Dates</span><b>' + esc(WZ.start.split('-').reverse().slice(0, 2).join('/') + ' ' + WZ.startTime + ' → ' + WZ.end.split('-').reverse().slice(0, 2).join('/') + ' ' + WZ.endTime) + '</b></div><div class="wz-kv"><span>Durée</span><b>' + d3 + ' jour' + (d3 > 1 ? 's' : '') + '</b></div></div>'
        + '<div class="wz-two">' + wzInput('ppu', 'Prix / jour (MAD)', 'number', WZ.unit.ref ? 'Réf. ' + WZ.unit.ref : '0', 'inputmode="decimal" id="wz-ppu"') + wzInput('paid', 'Acompte reçu (MAD)', 'number', '0', 'inputmode="decimal" id="wz-paid"') + '</div>'
        + '<div class="wz-card"><div class="wz-kv big"><span>Total</span><b id="wz-total">' + money(total) + '</b></div><div class="wz-kv"><span>Reste à payer</span><b id="wz-rest" style="color:#C41E3A;">' + money(Math.max(0, total - paid)) + '</b></div>'
        + '<button type="button" class="wz-link" onclick="maWzTotal()">Modifier le total</button></div>'
        + '<div class="wz-sec">Mode de paiement</div>' + wzChips('mode', ['Espèces', 'Carte bancaire', 'Virement', 'Chèque'])
        + '<div class="wz-sec">Encaissé par</div>' + wzChips('by', ['Mohamed', 'Younes', 'Khalil'])
        + wzInput('pickup', 'Lieu de prise en charge', 'text', 'Ex : Aéroport Marrakech (RAK)')
        + wzInput('notes', 'Notes (facultatif)', 'text', '');
      ok = ppu > 0 && (paid <= 0 || !!WZ.by);
      btn = WZ.kind === 'location' ? 'Enregistrer la location' : 'Enregistrer la réservation';
    }
    var hint = '';
    if (!ok) hint = WZ.step === 1 ? (WZ.doc === 'sublease' && !WZ.subleaseId ? 'Choisissez la sous-location' : (WZ.isNew ? 'Saisissez au moins le prénom' : 'Choisissez un client')) : WZ.step === 2 ? (!WZ.end ? 'Choisissez la date de retour' : (WZ.kind === 'reservation' ? 'Choisissez un modèle' : 'Choisissez une voiture')) : ((parseFloat(WZ.ppu) || 0) <= 0 ? 'Saisissez le prix par jour' : 'Indiquez qui a encaissé l\'acompte');
    host.innerHTML = '<div class="wz-box" role="dialog" aria-modal="true" aria-label="' + kindLbl + '">' + head + '<div class="wz-body" id="wz-body">' + body + '</div>'
      + '<div class="wz-foot">' + (hint ? '<div class="wz-hint">' + esc(hint) + '</div>' : '') + '<button type="button" class="wz-main" ' + (ok ? '' : 'disabled') + ' onclick="' + (WZ.step < 3 ? 'maWzStep(1)' : 'maWzSave()') + '">' + btn + '</button></div></div>';
    if (keepFocus) { var el = document.getElementById(keepFocus); if (el) { el.focus(); try { var l = el.value.length; el.setSelectionRange(l, l); } catch (e1) {} } }
  }
  function wzOpen(kind, doc) {
    closeSheet();
    WZ = wzNew(kind, doc);
    var host = document.getElementById('ma-wiz');
    if (!host) { host = document.createElement('div'); host.id = 'ma-wiz'; document.body.appendChild(host); }
    host.style.display = 'block';
    document.body.classList.add('ma-locked');
    wzRender();
  }
  window.maWzClose = function () {
    var h = document.getElementById('ma-wiz'); if (h) { h.style.display = 'none'; h.innerHTML = ''; }
    document.body.classList.remove('ma-locked'); WZ = null;
  };
  window.maWz = function (field, val) {
    if (!WZ) return;
    if (field === 'isNew') { WZ.isNew = !!val; if (WZ.isNew) WZ.client = null; }
    else { WZ[field] = val; }
    if (field === 'start' && WZ.end && WZ.end < val) WZ.end = '';
    if (field === 'start' || field === 'end' || field === 'startTime' || field === 'endTime') { WZ.unit = null; WZ.totalEdited = false; }
    if (field === 'doc' && val === 'direct') WZ.subleaseId = '';
    wzRender();
  };
  window.maWzIn = function (field, val) {
    if (!WZ) return;
    if (field.indexOf('nf.') === 0) WZ.nf[field.slice(3)] = val; else WZ[field] = val;
    if (field === 'subleaseId') { wzRender(); return; }
    if (WZ.step === 3 && (field === 'ppu' || field === 'paid' || field === 'total')) {
      // mise à jour des montants sans reconstruire l'écran (le clavier reste ouvert)
      var d3 = wzDays(), ppu = parseFloat(WZ.ppu) || 0;
      if (!WZ.totalEdited) WZ.total = ppu ? String(Math.round(ppu * d3 * 100) / 100) : '';
      var total = parseFloat(WZ.total) || 0, paid = parseFloat(WZ.paid) || 0;
      var t = document.getElementById('wz-total'), r = document.getElementById('wz-rest');
      if (t) t.textContent = money(total); if (r) r.textContent = money(Math.max(0, total - paid));
      var okNow = ppu > 0 && (paid <= 0 || !!WZ.by);
      var b = document.querySelector('#ma-wiz .wz-main'); if (b) b.disabled = !okNow;
      var hEl = document.querySelector('#ma-wiz .wz-hint');
      if (okNow && hEl) hEl.remove();
      return;
    }
    if (WZ.step === 1) {
      var okNew = WZ.isNew && !!WZ.nf.first.trim() && !(WZ.doc === 'sublease' && !WZ.subleaseId);
      var b1 = document.querySelector('#ma-wiz .wz-main'); if (b1 && WZ.isNew) b1.disabled = !okNew;
      var h1 = document.querySelector('#ma-wiz .wz-hint'); if (h1 && okNew) h1.remove();
    }
  };
  window.maWzQ = function (v) { if (!WZ) return; WZ.q = v; wzRender('wz-q'); };
  window.maWzPick = function (encKey) {
    var key = decodeURIComponent(encKey);
    var c = ((typeof aslCustomerDirectory === 'function') ? aslCustomerDirectory() : []).filter(function (x) { return x.key === key; })[0];
    if (!c) return; WZ.client = c; wzRender();
  };
  window.maWzUnit = function (carId, plate) {
    var u = wzUnits().filter(function (x) { return String(x.carId) === String(carId) && x.plate === plate && x.state === 'free'; })[0];
    if (!u) return; WZ.unit = u; WZ.totalEdited = false; wzRender();
  };
  window.maWzTotal = function () {
    var v = prompt('Total du contrat (MAD) :', WZ.total || '');
    if (v === null) return;
    var n = parseFloat(String(v).replace(',', '.'));
    if (!(n >= 0)) return;
    WZ.total = String(n); WZ.totalEdited = true; wzRender();
  };
  window.maWzStep = function (d) {
    if (!WZ) return;
    WZ.step = Math.min(3, Math.max(1, WZ.step + d));
    var b = document.getElementById('wz-body'); if (b) b.scrollTop = 0;
    wzRender();
  };

  /* ---------- Enregistrement : formulaire existant + SON enregistrement ---------- */
  function wzSet(id, v, fire) {
    var el = document.getElementById(id); if (!el) return false;
    el.value = v == null ? '' : v;
    if (fire !== false) { try { el.dispatchEvent(new Event('input', { bubbles: true })); el.dispatchEvent(new Event('change', { bubbles: true })); } catch (e) {} }
    return true;
  }
  function wzSelectUnit(selId, unit) {
    var sel = document.getElementById(selId); if (!sel) return false;
    for (var i = 0; i < sel.options.length; i++) {
      var o = sel.options[i];
      if (String(o.value) === String(unit.carId) && (o.getAttribute('data-plate') || '') === (unit.plate || '')) { sel.selectedIndex = i; try { sel.dispatchEvent(new Event('change', { bubbles: true })); } catch (e) {} return true; }
    }
    return false;
  }
  window.maWzSave = function () {
    if (!WZ || !WZ.unit) return;
    var P = WZ.kind === 'location' ? 'nl' : 'nr';
    var c = WZ.client;
    var first = c ? c.first : WZ.nf.first.trim(), last = c ? c.last : WZ.nf.last.trim(), phone = c ? (c.phone || '') : WZ.nf.phone.trim();
    var before = ((ASLDB.getReservations && ASLDB.getReservations()) || []).length;
    try { if (typeof draftClear === 'function') draftClear(P); } catch (e0) {}
    document.body.classList.add('ma-bridging');
    window.openModal(WZ.kind === 'location' ? 'new-location' : 'new-reservation');
    var S = WZ;
    setTimeout(function () {
      var ok = true;
      wzSet(P + '-doctype', S.doc);
      try { if (P === 'nl' && typeof nlToggleSublease === 'function') nlToggleSublease(); if (P === 'nr' && typeof nrToggleSublease === 'function') nrToggleSublease(); } catch (e1) {}
      if (S.doc === 'sublease') wzSet(P + '-sublease', S.subleaseId);
      wzSet(P === 'nl' ? 'nl-fn' : 'nr-firstname', first);
      wzSet(P === 'nl' ? 'nl-ln' : 'nr-lastname', last);
      wzSet(P + '-phone', phone);
      wzSet(P + '-profession', c ? (c.profession || '') : '');
      if (P === 'nl') wzSet('nl-nat', c ? (c.nationality || '') : '');
      // client existant : rattachement à la même fiche (même mécanisme que le pop-up)
      wzSet(P + '-cust-key', c ? c.key : '', false); wzSet(P + '-cust-email', c ? (c.email || '') : '', false); wzSet(P + '-cust-nat', c ? (c.nationality || '') : '', false);
      ok = wzSelectUnit(P + '-car', S.unit) && ok;
      wzSet(P + '-start', S.start); wzSet(P + '-start-time', S.startTime);
      wzSet(P + '-end', S.end); wzSet(P + '-end-time', S.endTime);
      wzSet(P + '-days', String(wzDays()));
      wzSet(P + '-ppu', S.ppu);
      wzSet(P + '-total', S.total, false);
      wzSet(P + '-paid', S.paid || '');
      wzSet(P + '-mode', S.mode);
      wzSet(P + '-collected-by', S.by);
      wzSet(P + '-pickup', S.pickup);
      wzSet(P + '-notes', S.notes);
      wzSet(P + '-total', S.total, false); // le total voulu, après les recalculs automatiques
      if (!ok) {
        document.body.classList.remove('ma-bridging');
        alert('La voiture choisie n\'a pas été trouvée dans le formulaire. Réessayez.');
        try { window.closeModal(); } catch (e2) {}
        return;
      }
      try {
        if (P === 'nl') { if (typeof _saveNewLocation === 'function') _saveNewLocation(); }
        else { var btnS = document.getElementById('modal-save'); if (btnS && btnS.onclick) btnS.onclick(); }
      } catch (e3) { console.error(e3); }
      setTimeout(function () {
        document.body.classList.remove('ma-bridging');
        var after = ((ASLDB.getReservations && ASLDB.getReservations()) || []).length;
        if (after > before) {
          try { var ov = document.getElementById('modal-overlay'); if (ov && ov.classList.contains('open')) window.closeModal(); } catch (e4) {}
          try { if (typeof draftClear === 'function') draftClear(P); } catch (e5) {}
          maWzClose();
          if (typeof showToast === 'function') showToast((P === 'nl' ? 'Location' : 'Réservation') + ' enregistrée ✓');
          try { maGo(P === 'nl' ? 'rentals' : 'reservations'); } catch (e6) {}
        } else {
          // non enregistré (champ refusé, conflit non confirmé…) : on referme le
          // formulaire masqué, l'assistant reste ouvert pour corriger.
          try { window.closeModal(); } catch (e7) {}
          try { if (typeof draftClear === 'function') draftClear(P); } catch (e8) {}
        }
      }, 250);
    }, 160);
  };

  window.maNewReservation = function () { wzOpen('reservation', 'direct'); };
  window.maNewLocation = function () { wzOpen('location', 'direct'); };

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
      + '<div class="ma-head-txt"><h1 id="ma-title">Tableau de bord</h1><div class="ma-greet">Bonjour ' + esc(greet) + '</div><div id="ma-clock" style="font-size:11.5px;color:rgba(255,255,255,.65);font-weight:600;margin-top:2px;">—</div></div>'
      // ★ Bouton "Resynchroniser" (Mobile) — équivalent exact du bouton
      //   Desktop : relit toutes les données depuis la base (lecture
      //   seule, aucune donnée locale n'est écrasée par autre chose que ce
      //   qui existe réellement côté serveur) pour que Mobile affiche
      //   strictement la même chose que Desktop en un clic.
      + '<button class="ma-head-btn" id="ma-resync-btn" aria-label="Resynchroniser" title="Resynchroniser depuis le serveur" onclick="maResyncData()">' + ic('refresh') + '</button>'
      + '<button class="ma-head-btn" aria-label="Notifications" onclick="maToggleNotifications()">' + ic('bell') + '<span class="ma-dot" id="ma-head-dot" style="display:none;"></span></button></div>'
      + screen('dashboard') + screen('vehicles') + screen('available') + screen('reserved') + screen('activites') + screen('reservations') + screen('rentals')
      + screen('returns') + screen('late') + screen('clients') + screen('sublease') + screen('lld') + screen('unpaid') + screen('revenue') + screen('caisse') + screen('notifications') + screen('history');
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

    var titles = { dashboard: 'Tableau de bord', vehicles: 'Véhicules', available: 'Disponibles', reserved: 'Véhicules réservés', activites: 'Activités du jour', reservations: 'Réservations', rentals: 'Véhicules loués', returns: "Retours aujourd'hui", late: 'En retard', clients: 'Clients', sublease: 'Sous-location', lld: 'Location longue durée', unpaid: 'Impayés', revenue: 'Revenus', caisse: 'Paiements & Caisse', notifications: 'Notifications' };
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

  /* ★ "Resynchroniser" (Mobile) — équivalent exact de resyncData() côté
     Desktop : relit toutes les données depuis le serveur (lecture seule)
     et recalcule tout ce qui est affiché, pour repartir sur une base
     strictement identique à Desktop, en cas de doute sur la synchro. */
  window.maResyncData = async function () {
    var btn = document.getElementById('ma-resync-btn');
    if (btn) { btn.classList.add('ma-spin'); btn.disabled = true; }
    try {
      if (typeof ASLDB === 'undefined' || !ASLDB.resyncAll) throw new Error('Module de synchronisation indisponible.');
      await ASLDB.resyncAll();
      try { renderScreen(current); } catch (e) {}
      try { renderNotifications(); } catch (e) {}
      if (typeof showToast === 'function') showToast('Resynchronisation terminée avec succès.');
      else alert('Resynchronisation terminée avec succès.');
    } catch (e) {
      console.error('maResyncData:', e);
      if (typeof showToast === 'function') showToast('Erreur lors de la resynchronisation.');
      else alert('Erreur lors de la resynchronisation.');
    } finally {
      if (btn) { btn.classList.remove('ma-spin'); btn.disabled = false; }
    }
  };

  function start() {
    if (!isMobile()) return;
    buildShell();
    window.maGo('dashboard');
    try {
      if (typeof ASLDB !== 'undefined' && ASLDB.onChange) {
        ASLDB.onChange(function () {
          if (!isMobile()) return;
          // ★ CORRECTIF (rafraîchissement automatique) : Desktop rafraîchit
          //   systématiquement Dashboard/Badges/Locations à chaque changement,
          //   quel que soit l'écran affiché. Mobile ne rafraîchissait QUE
          //   l'écran actuellement visible — un changement survenu pendant que
          //   l'utilisateur consultait un autre écran (ou le même écran avant
          //   l'arrivée des données) restait invisible jusqu'à une navigation
          //   manuelle ou un rafraîchissement de page. On aligne maintenant le
          //   comportement : l'écran courant ET les indicateurs globaux
          //   (badges, notifications) sont toujours recalculés immédiatement.
          setTimeout(function () {
            try { renderScreen(current); } catch (e) {}
            try { renderNotifications(); } catch (e) {}
          }, 50);
        });
      }
    } catch (e) {}
    /* ★ Forcer une synchro immédiate au démarrage du mobile pour garantir
       que les données restaurées sur desktop sont reçues sans attendre le poll. */
    try { if (typeof ASLDB !== 'undefined' && ASLDB.syncNow) ASLDB.syncNow(); } catch (e) {}
    setTimeout(function () { renderNotifications(); window.maGo('dashboard'); }, 200);
    /* ★ Second passage à 2s pour attraper les données misc (charges, sous-loc, LLD)
       qui arrivent après la première synchro des réservations. */
    setTimeout(function () {
      try { if (typeof ASLDB !== 'undefined' && ASLDB.syncNow) ASLDB.syncNow(); } catch (e) {}
      if (isMobile()) renderScreen(current);
    }, 2000);
    /* ★ CORRECTIF — Même cause que côté Desktop : un dossier qui passe de
       "Réservé" à "Loué" (ou "Loué" à "En retard") uniquement parce que
       l'heure réelle a dépassé sa date de départ/retour n'entraîne AUCUNE
       écriture de données — rien ne déclenche donc de rafraîchissement.
       Ce minuteur recalcule l'écran courant toutes les 30 secondes pour
       que ces transitions purement temporelles restent toujours à jour. */
    setInterval(function () {
      if (!isMobile()) return;
      try { renderScreen(current); } catch (e) {}
    }, 30000);
    /* ★ Affichage de la date/heure en direct, sobre et professionnel. */
    (function () {
      var DAYS = ['dimanche','lundi','mardi','mercredi','jeudi','vendredi','samedi'];
      var MONTHS = ['janvier','février','mars','avril','mai','juin','juillet','août','septembre','octobre','novembre','décembre'];
      function tick() {
        var el = document.getElementById('ma-clock');
        if (!el) return;
        var d = new Date();
        var txt = DAYS[d.getDay()] + ' ' + d.getDate() + ' ' + MONTHS[d.getMonth()] + ' — '
          + String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0');
        el.textContent = txt.charAt(0).toUpperCase() + txt.slice(1);
      }
      tick();
      setInterval(tick, 1000 * 30);
    })();
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
