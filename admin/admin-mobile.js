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
    gauge: '<path d="M12 14v-4"/><path d="M5.6 18.4a8 8 0 1 1 12.8 0"/><circle cx="12" cy="14" r="1.6"/>',
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
    // Ouvrir l'écran Impayés (ou le quitter) repart toujours de la liste.
    if (MU) { MU.client = null; var hu = document.getElementById('ma-unpaid'); if (hu) hu.innerHTML = ''; }
    if (HF) { HF.id = null; HF.stack = []; HF.ret = null; var mv = document.getElementById('mh-viewer'); if (mv) mv.remove(); }
    // Sous-location / Longue durée : repartent de la liste, sauf retour
    // depuis une fiche ouverte à partir de ces écrans (SL.keep / LL.keep).
    if (SL) { if (SL.keep) SL.keep = false; else { SL.view = 'list'; SL.id = null; SL.form = null; SL.tab = ''; } var hs = document.getElementById('ma-sublease'); if (hs) hs.innerHTML = ''; }
    if (CS) { if (CS.keep) CS.keep = false; else { CS.view = 'sum'; CS.who = ''; CS.mode = 'month'; CS.ym = ''; } var hc = document.getElementById('ma-caisse'); if (hc) hc.innerHTML = ''; }
    if (MT) { if (MT.keep) MT.keep = false; else { MT.view = 'month'; MT.key = null; MT.f = null; MT.ym = ''; } var hm = document.getElementById('ma-maintenance'); if (hm) hm.innerHTML = ''; }
    if (VH) { if (VH.keep) VH.keep = false; else { VH.view = 'list'; VH.id = null; VH.e = null; } var hv = document.getElementById('ma-vehicles'); if (hv) hv.innerHTML = ''; }
    if (LL) { if (LL.keep) LL.keep = false; else { LL.view = 'list'; LL.id = null; LL.e = null; } var hl = document.getElementById('ma-lld'); if (hl) hl.innerHTML = ''; }
    var cf = document.getElementById('ma-confirm'); if (cf) cf.remove();
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
  /* Flèche retour de l'en-tête : la fiche d'un impayé revient à la liste. */
  window.maHeadBack = function () {
    if (current === 'unpaid' && MU.client) { maUnpaidBack(); return; }
    if (current === 'history' && HF.id) { maHistBack(); return; }
    if (current === 'sublease' && SL.view !== 'list') { maSlBack(); return; }
    if (current === 'lld' && LL.view !== 'list') { maLLBack(); return; }
    if (current === 'vehicles' && VH.view !== 'list') { maVhBack(); return; }
    if (current === 'maintenance' && MT.view !== 'month') { maMaintBack(); return; }
    if (current === 'caisse' && CS.view !== 'sum') { maCsBack(); return; }
    window.maGo('dashboard');
  };
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
    else if (screen === 'maintenance') renderMaintM();
    else if (screen === 'unpaid') renderUnpaidM();
    else if (screen === 'revenue') { maOpenCaisseMonth(); return; } // ancien écran « Revenus » regroupé dans la Caisse
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
      { num: money(csMonthTotal()), lbl: 'Encaissé ce mois', cls: 'teal', ico: 'wallet', act: "maDash('revenue')", small: true }
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
    else if (type === 'revenue') maOpenCaisseMonth(); // même montant, détail du mois en cours
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

  /* ======================================================================
     ★ VÉHICULES — ma flotte, 100 % mobile (aperçu validé)
     Liste unique (plus de filtres Disponible / Loué / Réservé), une carte
     par modèle avec ses voitures (plaque, couleur, statut), fiche du
     véhicule et écran de modification dans l'application.
     Données : exactement la flotte de l'ordinateur (ASLDB.getFleet /
     updateVehicle, unités normalisées). Les champs « marketing » du site
     (description, texte ALT, URL photo, affichage caution) ne sont pas
     affichés ici mais restent intacts : l'enregistrement ne les modifie pas.
     ====================================================================== */
  var VH = { view: 'list', id: null, q: '', e: null, keep: false };
  window.maVehFilter = function () { renderVehicles(); }; // ancien filtre (compatibilité)
  var VH_ST = {
    available: ['ok', 'Disponible', '#16A34A'], reserved: ['res', 'Réservée', '#6D28D9'], rented: ['rent', 'Louée', '#1D4ED8'], active: ['rent', 'Louée', '#1D4ED8'],
    maintenance: ['mnt', 'Maintenance', '#D97706'], offroad: ['off', 'Hors service', '#C41E3A'], lld: ['res', 'Longue durée', '#6D28D9']
  };
  var VH_UNIT_OPTS = [['available', 'Disponible'], ['reserved', 'Réservée'], ['active', 'Louée'], ['maintenance', 'Maintenance'], ['offroad', 'Hors service']];
  var VH_CAT = [['citadine', 'Citadine'], ['economique', 'Économique'], ['familiale', 'Familiale'], ['suv', 'SUV']];
  var VH_FEAT = [['ac', 'Climatisation'], ['bluetooth', 'Bluetooth'], ['gps', 'GPS'], ['camera', 'Caméra de recul'], ['insurance', 'Assurance incluse'], ['airport', 'Livraison aéroport']];
  function vhSt(s) { return VH_ST[s] || ['na', s || '—', '#9AA0AA']; }
  function vhCar(id) { return fleet().filter(function (c) { return String(c.id) === String(id); })[0] || null; }
  function vhUnits(c) {
    var u = (typeof ASLDB !== 'undefined' && ASLDB.normalizeUnits) ? ASLDB.normalizeUnits(c) : null;
    if (!u || !u.length) u = [{ plate: c.plate || '', color: '', status: c.status || 'available' }];
    return u.map(function (x) { return { plate: x.plate || '', color: x.color || '', status: x.status || 'available' }; });
  }
  function vhPhoto(c) { return c.photo || c.image || c.img || ''; }
  function vhCatLbl(v) { var x = VH_CAT.filter(function (k) { return k[0] === v; })[0]; return x ? x[1] : (v || ''); }
  function vhPrice(c) { return Number(c.priceMAD) || Number(c.price) || Math.round((Number(c.priceEUR) || 0) * 10.8) || 0; }
  function vhCustomList() { try { return JSON.parse(localStorage.getItem('asl_custom_features_v1') || '[]') || []; } catch (e) { return []; } }
  function vhImg(src, cls) {
    return src ? '<img class="' + (cls || '') + '" src="' + esc(src) + '" alt="" loading="lazy" onerror="this.style.display=\'none\'">' : ic('car');
  }
  function vhBack(show) { var b = document.getElementById('ma-head-back'); if (b) b.style.display = show ? 'flex' : 'none'; }

  function renderVehicles() {
    var host = document.getElementById('ma-vehicles');
    if (!host) return;
    if (VH.view !== 'list') {
      var c = vhCar(VH.id);
      if (c) { vhBack(true); if (VH.view === 'edit') vhRenderEdit(host, c); else vhRenderFiche(host, c); return; }
      VH.view = 'list'; VH.id = null; VH.e = null; host.innerHTML = '';
    }
    // Liste = écran principal de l'onglet : pas de retour vers le tableau de bord.
    vhBack(false);
    maSetTitle('Véhicules');
    var g = document.querySelector('.ma-greet'); if (g) g.style.display = 'none';
    if (!document.getElementById('ma-vh-q')) {
      host.innerHTML = '<div id="ma-vh-sum"></div>'
        + '<label class="mu-search">' + ic('search') + '<span class="mu-sr">Rechercher un véhicule</span>'
        + '<input id="ma-vh-q" type="search" value="' + esc(VH.q) + '" placeholder="Modèle, plaque, couleur…" autocomplete="off" oninput="maVhQ(this.value)">'
        + '<button type="button" class="mu-clear" id="ma-vh-clear" aria-label="Effacer la recherche" onclick="maVhQ(\'\',1)"' + (VH.q ? '' : ' style="display:none;"') + '>' + ic('x') + '</button></label>'
        + '<div id="ma-vh-list"></div>';
    }
    vhRenderList();
  }
  function vhRenderList() {
    var box = document.getElementById('ma-vh-list'), sum = document.getElementById('ma-vh-sum');
    if (!box) return;
    var cars = fleet();
    var cnt = {}, nU = 0;
    cars.forEach(function (c) { vhUnits(c).forEach(function (u) { nU++; var k = (u.status === 'rented') ? 'active' : u.status; cnt[k] = (cnt[k] || 0) + 1; }); });
    if (sum) sum.innerHTML = '<div class="vh-sum"><b>' + nU + ' véhicule' + (nU > 1 ? 's' : '') + '</b><span>' + cars.length + ' modèle' + (cars.length > 1 ? 's' : '') + '</span></div>'
      + '<div class="vh-dots">' + [['available', 'disponible', 'disponibles'], ['active', 'loué', 'loués'], ['reserved', 'réservé', 'réservés'], ['maintenance', 'maintenance', 'maintenance'], ['offroad', 'hors service', 'hors service'], ['lld', 'longue durée', 'longue durée']].filter(function (x) { return cnt[x[0]]; }).map(function (x) {
        var n = cnt[x[0]], lbl = n > 1 ? x[2] : x[1];
        return '<span><i style="background:' + vhSt(x[0])[2] + '"></i>' + n + ' ' + lbl + '</span>';
      }).join('') + '</div>';
    var q = VH.q.trim().toLowerCase();
    var shown = cars.filter(function (c) {
      if (!q) return true;
      return [c.name, vhCatLbl(c.category), c.fuel, c.transmission].concat(vhUnits(c).map(function (u) { return u.plate + ' ' + u.color; })).join(' ').toLowerCase().indexOf(q) >= 0;
    });
    if (!cars.length) { box.innerHTML = '<div class="mu-none"><b>Aucun véhicule</b><div>La flotte est vide.</div></div>'; return; }
    box.innerHTML = (q ? '<div class="mu-sec">' + shown.length + ' résultat' + (shown.length > 1 ? 's' : '') + '</div>' : '')
      + (shown.length ? shown.map(function (c) {
        var units = vhUnits(c);
        if (q) { var hit = units.filter(function (u) { return (u.plate + ' ' + u.color).toLowerCase().indexOf(q) >= 0; }); if (hit.length && String(c.name || '').toLowerCase().indexOf(q) < 0) units = hit; }
        return '<button type="button" class="vh-card" data-id="' + esc(String(c.id)) + '" onclick="maVhOpen(this.dataset.id)">'
          + '<span class="vh-top"><span class="vh-ph">' + vhImg(vhPhoto(c)) + '</span>'
          + '<span class="vh-info"><b>' + esc(c.name || 'Véhicule') + '</b><small>' + esc([vhCatLbl(c.category), c.transmission, c.fuel].filter(Boolean).join(' · ')) + '</small>'
          + '<span class="vh-price">' + money(vhPrice(c)) + ' <em>/ jour</em></span></span>' + ic('arrowLeft', 'mu-chev') + '</span>'
          + '<span class="vh-units">' + units.map(function (u) {
            var s = vhSt(u.status);
            return '<span class="vh-unit"><span class="vh-plate">' + esc(u.plate || 'Sans plaque') + '</span><span class="vh-col">' + esc(u.color || '') + '</span><span class="vh-pill ' + s[0] + '">' + s[1] + '</span></span>';
          }).join('') + '</span></button>';
      }).join('') : '<div class="mu-none"><b>Aucun véhicule trouvé</b><div>Aucun véhicule ne correspond à « ' + esc(VH.q.trim()) + ' ».</div></div>');
    try { if (typeof aslDocHydrate === 'function') aslDocHydrate(box); } catch (e) {}
  }
  window.maVhQ = function (v, clear) {
    VH.q = v || '';
    var c = document.getElementById('ma-vh-clear'); if (c) c.style.display = VH.q ? '' : 'none';
    if (clear) { var i = document.getElementById('ma-vh-q'); if (i) { i.value = ''; i.focus(); } }
    vhRenderList();
  };
  window.maVhOpen = function (id) {
    var host = document.getElementById('ma-vehicles'); if (host) host.innerHTML = '';
    VH.view = 'fiche'; VH.id = id; VH.e = null;
    renderVehicles(); maTop();
  };
  window.maVhBack = function () {
    var host = document.getElementById('ma-vehicles'); if (host) host.innerHTML = '';
    if (VH.view === 'edit') { VH.view = 'fiche'; VH.e = null; }
    else { VH.view = 'list'; VH.id = null; }
    renderVehicles(); maTop();
  };
  // Anciens points d'entrée : ouvrent désormais la fiche / la modification mobiles.
  window.maViewVehicle = function (id) { closeSheet(); VH.keep = true; VH.view = 'fiche'; VH.id = id; VH.e = null; maGo('vehicles'); };
  window.maEditVehicle = function (id) { closeSheet(); VH.keep = true; VH.view = 'fiche'; VH.id = id; VH.e = null; maGo('vehicles'); maVhEdit(id); };

  function vhRenderFiche(host, c) {
    maSetTitle(c.name || 'Véhicule');
    var units = vhUnits(c), f = c.features || {}, cf = c.customFeatures || {};
    var idA = esc(String(c.id));
    var kv = function (l, v) { return '<div class="mh-when"><small>' + l + '</small><b>' + esc(v == null || v === '' ? '—' : String(v)) + '</b></div>'; };
    var feats = VH_FEAT.map(function (x) { return [x[1], !!f[x[0]]]; }).concat(vhCustomList().map(function (x) { return [x.name, !!cf[x.id]]; }));
    host.innerHTML = '<div class="vh-hero">' + (vhPhoto(c) ? '<img src="' + esc(vhPhoto(c)) + '" alt="" onerror="this.style.display=\'none\'">' : ic('car'))
      + '<button type="button" class="vh-chg" onclick="maVehiclePhoto(' + (typeof c.id === 'number' ? c.id : '\'' + idA + '\'') + ')">' + ic('camera') + ' Changer la photo</button></div>'
      + '<div class="mh-card"><div class="vh-title"><h2>' + esc(c.name || 'Véhicule') + '</h2><div class="vh-tags">' + (c.category ? '<span>' + esc(vhCatLbl(c.category)) + '</span>' : '') + '<span>' + units.length + ' unité' + (units.length > 1 ? 's' : '') + '</span></div></div>'
      + '<div class="vh-big"><b>' + money(vhPrice(c)) + '</b><span>/ jour · prix « à partir de »</span></div>'
      + '<div class="mh-2">' + kv('Caution', c.deposit ? money(c.deposit) : '—') + kv('Stock', units.length + ' voiture' + (units.length > 1 ? 's' : '')) + '</div></div>'
      + '<div class="mu-sec">Unités · ' + units.length + '</div>'
      + '<div class="mh-card vh-ulist">' + units.map(function (u) {
        var s = vhSt(u.status);
        return '<div class="vh-uc"><div class="vh-unit"><span class="vh-plate">' + esc(u.plate || 'Sans plaque') + '</span><span class="vh-col">' + esc(u.color || '') + '</span><span class="vh-pill ' + s[0] + '">' + s[1] + '</span></div>'
          + '<button type="button" class="sl-btn vh-stbtn" data-id="' + idA + '" data-p="' + esc(u.plate || '') + '" onclick="maChangeStatus(this.dataset.id,this.dataset.p)">' + ic('swap') + ' Changer le statut</button></div>';
      }).join('') + '</div>'
      + '<div class="mu-sec">Caractéristiques</div>'
      + '<div class="mh-card"><div class="mh-2">' + kv('Boîte', c.transmission) + kv('Carburant', c.fuel) + kv('Places', c.seats || 5) + kv('Portes', c.doors) + kv('Coffre', c.trunk) + kv('Consommation', c.consumption) + '</div>'
      + '<div class="mh-row vh-extra"><span>Autres options</span><b>' + esc(c.extras || '—') + '</b></div></div>'
      + '<div class="mu-sec">Équipements</div>'
      + '<div class="mh-card"><div class="vh-feats">' + feats.map(function (x) { return '<span class="vh-feat ' + (x[1] ? 'y' : 'n') + '">' + ic(x[1] ? 'check' : 'x') + esc(x[0]) + '</span>'; }).join('') + '</div></div>'
      + '<button type="button" class="mu-go vh-editbtn" onclick="maVhEdit(\'' + idA + '\')">' + ic('edit') + ' Modifier le véhicule</button>';
  }

  /* ---- Modification ---- */
  window.maVhEdit = function (id) {
    var c = vhCar(id); if (!c) return;
    var f = c.features || {}, cf = c.customFeatures || {};
    VH.e = { name: c.name || '', category: c.category || 'economique', priceMAD: String(vhPrice(c) || ''), deposit: c.deposit ? String(c.deposit) : '',
      units: vhUnits(c), transmission: (c.transmission === 'Auto' ? 'Automatique' : (c.transmission || 'Manuelle')), fuel: c.fuel || 'Diesel',
      seats: Number(c.seats) || 5, doors: Number(c.doors) || 5, trunk: c.trunk || '', consumption: c.consumption || '', extras: c.extras || '',
      features: { ac: !!f.ac, bluetooth: !!f.bluetooth, gps: !!f.gps, camera: !!f.camera, insurance: !!f.insurance, airport: !!f.airport },
      custom: (function () { var o = {}; vhCustomList().forEach(function (x) { o[x.id] = !!cf[x.id]; }); return o; })() };
    VH.view = 'edit'; VH.id = c.id;
    var host = document.getElementById('ma-vehicles'); if (host) { host.innerHTML = ''; vhRenderEdit(host, c, true); }
    vhBack(true); maTop();
  };
  function vhRenderEdit(host, c, force) {
    maSetTitle('Modifier le véhicule');
    if (!VH.e) { VH.view = 'fiche'; vhRenderFiche(host, c); return; }
    if (!force && document.getElementById('vh-edit')) return; // saisie en cours : on ne reconstruit pas
    var e = VH.e;
    var inp = function (k, label, type, ph, unit, extra) {
      return '<label class="sl-field"><span>' + label + '</span>' + (unit ? '<span class="vh-inu">' : '') + '<input type="' + type + '" value="' + esc(e[k]) + '" placeholder="' + esc(ph || '') + '" ' + (extra || '') + ' oninput="maVhE(\'' + k + '\',this.value)">' + (unit ? '<em>' + unit + '</em></span>' : '') + '</label>';
    };
    var chips = function (k, opts) { return '<div class="mu-chips wrap">' + opts.map(function (o) { return '<button type="button" class="mu-chip' + (e[k] === o[0] ? ' on' : '') + '" onclick="maVhSet(\'' + k + '\',\'' + o[0] + '\')">' + o[1] + '</button>'; }).join('') + '</div>'; };
    var seg = function (k, opts) { return '<div class="sl-seg">' + opts.map(function (o) { return '<button type="button" class="' + (e[k] === o ? 'on' : '') + '" onclick="maVhSet(\'' + k + '\',\'' + o + '\')">' + o + '</button>'; }).join('') + '</div>'; };
    var stp = function (k, label, min, max) { return '<div class="sl-field"><span>' + label + '</span><div class="vh-stp"><button type="button" aria-label="Moins" onclick="maVhStep(\'' + k + '\',-1,' + min + ',' + max + ')">−</button><b>' + e[k] + '</b><button type="button" aria-label="Plus" onclick="maVhStep(\'' + k + '\',1,' + min + ',' + max + ')">+</button></div></div>'; };
    var sw = function (on, call, label, sub) { return '<button type="button" class="vh-tg" onclick="' + call + '"><span>' + esc(label) + (sub ? ' <small>· ' + sub + '</small>' : '') + '</span><i class="vh-sw' + (on ? ' on' : '') + '"></i></button>'; };
    var ok = !!String(e.name || '').trim();
    host.innerHTML = '<div id="vh-edit" class="vh-edit">'
      + '<div class="mu-sec">Identité</div><div class="mh-card">'
      + inp('name', 'Marque et modèle', 'text', 'Ex : Renault Clio 5', '', 'autocomplete="off"')
      + '<div class="sl-field"><span>Catégorie</span>' + chips('category', VH_CAT) + '</div></div>'
      + '<div class="mu-sec">Prix et caution</div><div class="mh-card">'
      + inp('priceMAD', 'Prix « à partir de »', 'number', '0', 'MAD / jour', 'inputmode="decimal"')
      + '<div class="mu-jn">Prix indicatif. Le prix réel suit les dates, la durée et les tranches saisonnières.</div>'
      + inp('deposit', 'Caution', 'number', 'Ex : 3000', 'MAD', 'inputmode="decimal"') + '</div>'
      + '<div class="mu-sec">Unités du stock</div><div class="mh-card">'
      + '<div class="sl-field"><span>Nombre de voitures de ce modèle</span><div class="vh-stp"><button type="button" aria-label="Moins" onclick="maVhStock(-1)">−</button><b>' + e.units.length + '</b><button type="button" aria-label="Plus" onclick="maVhStock(1)">+</button></div></div>'
      + e.units.map(function (u, i) {
        return '<div class="vh-ued"><b>' + (e.units.length > 1 ? 'Unité ' + (i + 1) : 'Voiture') + '</b>'
          + '<div class="mu-2"><label class="sl-field"><span>Immatriculation</span><input type="text" value="' + esc(u.plate) + '" placeholder="AA-123456" autocapitalize="characters" oninput="maVhU(' + i + ',\'plate\',this.value)"></label>'
          + '<label class="sl-field"><span>Couleur</span><input type="text" value="' + esc(u.color) + '" placeholder="Ex : Blanc" oninput="maVhU(' + i + ',\'color\',this.value)"></label></div>'
          + '<div class="vh-sch">' + VH_UNIT_OPTS.map(function (o) { var on = (u.status === o[0]) || (o[0] === 'active' && u.status === 'rented'); return '<button type="button" class="' + (on ? 'on' : '') + '" onclick="maVhU(' + i + ',\'status\',\'' + o[0] + '\',1)">' + o[1] + '</button>'; }).join('') + '</div></div>';
      }).join('') + '</div>'
      + '<div class="mu-sec">Caractéristiques</div><div class="mh-card">'
      + '<div class="sl-field"><span>Boîte de vitesses</span>' + seg('transmission', ['Automatique', 'Manuelle']) + '</div>'
      + '<div class="sl-field"><span>Carburant</span>' + seg('fuel', ['Diesel', 'Essence', 'Hybride']) + '</div>'
      + '<div class="mu-2">' + stp('seats', 'Places', 2, 9) + stp('doors', 'Portes', 2, 5) + '</div>'
      + '<div class="mu-2">' + inp('trunk', 'Coffre', 'text', 'ex : 380 L') + inp('consumption', 'Consommation', 'text', 'ex : 5,5 L/100km') + '</div>'
      + inp('extras', 'Autres options', 'text', 'ex : Sièges bébé, 4x4…') + '</div>'
      + '<div class="mu-sec">Équipements</div><div class="mh-card vh-tgs">'
      + VH_FEAT.map(function (x) { return sw(e.features[x[0]], "maVhFeat('" + x[0] + "')", x[1]); }).join('')
      + vhCustomList().map(function (x) { return sw(e.custom[x.id], "maVhCustom('" + esc(x.id) + "')", x.name, 'personnalisé'); }).join('') + '</div>'
      + '<div class="mu-hint sl-need"' + (ok ? ' style="display:none;"' : '') + '>Saisissez la marque et le modèle</div>'
      + '<button type="button" class="mu-go sl-save"' + (ok ? '' : ' disabled') + ' onclick="maVhSave()">Enregistrer les modifications</button>'
      + '</div>';
  }
  function vhReEdit() { var c = vhCar(VH.id), host = document.getElementById('ma-vehicles'); if (c && host) vhRenderEdit(host, c, true); }
  window.maVhE = function (k, v) {
    if (!VH.e) return; VH.e[k] = v;
    if (k === 'name') { var ok = !!String(v || '').trim(); document.querySelectorAll('#vh-edit .sl-save').forEach(function (b) { b.disabled = !ok; }); document.querySelectorAll('#vh-edit .sl-need').forEach(function (h) { h.style.display = ok ? 'none' : ''; }); }
  };
  window.maVhSet = function (k, v) { if (!VH.e) return; VH.e[k] = v; vhReEdit(); };
  window.maVhStep = function (k, d, min, max) { if (!VH.e) return; VH.e[k] = Math.max(min, Math.min(max, (Number(VH.e[k]) || min) + d)); vhReEdit(); };
  window.maVhStock = function (d) {
    if (!VH.e) return; var u = VH.e.units;
    if (d > 0 && u.length < 99) u.push({ plate: '', color: '', status: 'available' });
    if (d < 0 && u.length > 1) u.pop();
    vhReEdit();
  };
  window.maVhU = function (i, k, v, rerender) { if (!VH.e || !VH.e.units[i]) return; VH.e.units[i][k] = v; if (rerender) vhReEdit(); };
  window.maVhFeat = function (k) { if (!VH.e) return; VH.e.features[k] = !VH.e.features[k]; vhReEdit(); };
  window.maVhCustom = function (k) { if (!VH.e) return; VH.e.custom[k] = !VH.e.custom[k]; vhReEdit(); };
  /* Enregistrement : mêmes champs et même règle que l'ordinateur (editCar),
     sans toucher aux champs non affichés ici (photo, description, ALT…). */
  window.maVhSave = function () {
    var c = vhCar(VH.id), e = VH.e; if (!c || !e) return;
    var name = String(e.name || '').trim(); if (!name) return;
    var units = e.units.map(function (u) { return { plate: String(u.plate || '').trim(), color: String(u.color || '').trim(), status: u.status || 'available' }; });
    var agg = units.some(function (u) { return u.status === 'available'; }) ? 'available' : (units.length ? units[0].status : (c.status || 'available'));
    var pm = parseInt(e.priceMAD, 10);
    var cfOut = {}; var old = c.customFeatures || {}; for (var k0 in old) cfOut[k0] = old[k0]; for (var k1 in e.custom) cfOut[k1] = !!e.custom[k1];
    var patch = {
      name: name, category: e.category,
      priceMAD: pm > 0 ? pm : c.priceMAD, priceEUR: pm > 0 ? Math.round(pm / ((ASLDB && ASLDB.RATE_MAD) || 10.8)) : c.priceEUR,
      plate: (units[0] && units[0].plate) ? units[0].plate : (c.plate || ''), units: units, stock: units.length || 1,
      transmission: e.transmission, fuel: e.fuel, seats: Number(e.seats) || 5, doors: Number(e.doors) || null,
      trunk: String(e.trunk || ''), consumption: String(e.consumption || ''), deposit: parseInt(e.deposit, 10) || null, extras: String(e.extras || ''),
      features: { ac: !!e.features.ac, bluetooth: !!e.features.bluetooth, gps: !!e.features.gps, camera: !!e.features.camera, insurance: !!e.features.insurance, airport: !!e.features.airport },
      customFeatures: cfOut, status: agg
    };
    try { ASLDB.updateVehicle(c.id, patch); } catch (err) { console.error(err); return; }
    try { if (typeof reloadData === 'function') reloadData(); } catch (e1) {}
    try { if (typeof renderFleetPage === 'function') renderFleetPage(); if (typeof renderAvailability === 'function') renderAvailability(); } catch (e2) {}
    if (typeof showToast === 'function') showToast('Véhicule mis à jour ✓');
    VH.e = null; VH.view = 'fiche';
    var host = document.getElementById('ma-vehicles'); if (host) host.innerHTML = '';
    renderVehicles(); maTop();
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
    host.innerHTML = '<div id="ma-hist-main"' + (HF.id ? ' style="display:none;"' : '') + '>'
      + '<div class="ma-hist-searchrow">'
      + '<div class="ma-search-wrap ma-hist-search-bar">' + ic('search') + '<input id="ma-hist-search" class="ma-search" placeholder="Contrat, client, véhicule…" value="' + esc((typeof historyVehicleLabel === 'function') ? historyVehicleLabel(window._histSelectedVehicle || '') : (window._histSelectedVehicle || '')) + '" oninput="renderHistoryListM()"></div>'
      + '<button class="ma-hist-filter-btn' + ((_histDateFrom || _histDateTo) ? ' active' : '') + '" aria-label="Filtrer par date" onclick="maOpenHistDateSheet()">' + ic('calendar') + '</button>'
      + '</div>'
      + '<div id="ma-hist-chips" class="ma-hist-chipsrow"></div>'
      + '<div id="ma-hist-title" class="ma-hist-title"></div>'
      + '<div id="ma-hist-list"></div></div>'
      + '<div id="ma-hist-fiche"' + (HF.id ? '' : ' style="display:none;"') + '></div>';
    renderHistoryListM();
    if (HF.id) mhRenderFiche(); // rafraîchissement automatique : la fiche ouverte reste affichée
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
            return '<div class="ma-hist-card" role="button" tabindex="0" onclick="maHistFiche(' + idStr + ')">'
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
  /* ============ HISTORIQUE → FICHE LOCATION (100 % mobile) ============
     Consultation dans l'application (plus de formulaire ordinateur) :
     location, client, documents (permis / pièce d'identité) avec absence
     clairement signalée, paiement, infos, autres locations du client.
     Mêmes données que l'ordinateur (réservations, fiche client, documents). */
  var HF = { id: null, stack: [], scroll: 0, ret: null };
  function mhFind(id) { return (ASLDB.getReservations() || []).filter(function (x) { return String(x.id) === String(id); })[0]; }
  function mhKey(r) { return (typeof _custId === 'function') ? _custId(r.email, r.client) : ('name:' + String(r.client || '').trim().toLowerCase()); }
  function mhDM(iso) { iso = String(iso || ''); return iso.length >= 10 ? iso.slice(8, 10) + '/' + iso.slice(5, 7) : (iso || '—'); }
  window.maHistFiche = function (id) {
    var app = document.getElementById('asl-mobile-app');
    if (!HF.id) HF.scroll = app ? app.scrollTop : 0;   // position dans l'historique, retrouvée au retour
    else HF.stack.push(HF.id);                          // fiche ouverte depuis « Autres locations »
    HF.id = id;
    var main = document.getElementById('ma-hist-main'), fiche = document.getElementById('ma-hist-fiche');
    if (main) main.style.display = 'none';
    if (fiche) fiche.style.display = '';
    mhRenderFiche();
    if (app) app.scrollTop = 0;
  };
  window.maHistBack = function () {
    if (HF.stack.length) { HF.id = HF.stack.pop(); mhRenderFiche(); var a0 = document.getElementById('asl-mobile-app'); if (a0) a0.scrollTop = 0; return; }
    if (HF.ret === 'sublease') { HF.ret = null; SL.keep = true; window.maGo('sublease'); return; }
    if (HF.ret === 'caisse') { HF.ret = null; CS.keep = true; window.maGo('caisse'); return; }
    HF.id = null;
    var main = document.getElementById('ma-hist-main'), fiche = document.getElementById('ma-hist-fiche');
    if (fiche) { fiche.style.display = 'none'; fiche.innerHTML = ''; }
    if (main) main.style.display = '';
    var t = document.getElementById('ma-title'); if (t) t.textContent = 'Historique';
    var app = document.getElementById('asl-mobile-app'); if (app) app.scrollTop = HF.scroll || 0;
  };
  function mhRenderFiche() {
    var host = document.getElementById('ma-hist-fiche');
    var r = HF.id ? mhFind(HF.id) : null;
    if (!host) return;
    if (!r) { HF.stack = []; maHistBack(); return; }
    var t = document.getElementById('ma-title'); if (t) t.textContent = r.client || 'Fiche location';
    var key = mhKey(r);
    var all = ASLDB.getReservations() || [];
    var same = all.filter(function (x) { return x && x.status !== 'cancelled' && mhKey(x) === key; });
    var cust = ((typeof aslCustomerDirectory === 'function') ? aslCustomerDirectory() : []).filter(function (c) { return c.key === key; })[0] || {};
    var phone = cust.phone || r.phone || '', email = cust.email || r.email || '';
    var nat = cust.nationality || (r.nationality && r.nationality !== 'N/A' ? r.nationality : '');
    var job = cust.profession || r.profession || '';
    var name = r.client || cust.display || 'Client';
    // Statut de la location
    var ph = ASLDB.computePhase ? ASLDB.computePhase(r) : '';
    var st = r.status === 'cancelled' ? ['na', 'Annulé'] : ph === 'completed' ? (r.earlyOrCancelled ? ['early', 'Retour anticipé'] : ['done', 'Terminé'])
      : ph === 'late' ? ['late', 'Retour dépassé'] : ph === 'active' ? ['act', 'En cours'] : ph === 'reserved' ? ['res', 'Réservé'] : ['na', '—'];
    var plateColor = (typeof aslVehPlateColor === 'function') ? aslVehPlateColor(r) : (r.assignedPlate || '');
    var sl = (typeof subLeaseNameFor === 'function') ? String(subLeaseNameFor(r) || '').replace(/<[^>]*>/g, '') : '';
    var dropoff = r.dropoff || r.pickup || '';
    // Documents du client (même source que la fiche Clients)
    var gd = { permis: [], identite: [], identiteType: '' };
    try {
      if (typeof aslGatherCustomerDocs === 'function') gd = aslGatherCustomerDocs(key, same, { names: [name], phone: phone, email: email }) || gd;
    } catch (e0) {}
    var idLabel = /pass/i.test(gd.identiteType || '') ? 'Passeport' : "Carte d'identité (CIN)";
    HF.docs = { permis: (gd.permis || []).map(function (d) { return d.url; }), identite: (gd.identite || []).map(function (d) { return d.url; }) };
    var DOCS = [['permis', 'Permis de conduire', 'pm'], ['identite', idLabel, 'id']];
    var missing = DOCS.filter(function (d) { return !HF.docs[d[0]].length; });
    var tiles = DOCS.map(function (d) {
      var list = HF.docs[d[0]];
      if (!list.length) return '<div class="mh-doc miss"><span class="mh-doc-alert">' + ic('alert') + '</span><b>' + esc(d[1]) + '</b><span class="mh-miss">Manquant</span><small>À demander au client</small></div>';
      return '<button type="button" class="mh-doc" onclick="maHistDoc(\'' + d[0] + '\',0)" aria-label="Voir ' + esc(d[1]) + '">'
        + '<span class="mh-doc-img"><img alt=""' + (typeof aslDocImgAttrs === 'function' ? aslDocImgAttrs(list[0]) : ' src="' + esc(list[0]) + '"') + '>' + (list.length > 1 ? '<em>' + list.length + ' pages</em>' : '') + '</span>'
        + '<b>' + esc(d[1]) + '</b><span class="mh-ok">✓ Enregistré · Voir</span></button>';
    }).join('');
    var digits = String(phone).replace(/\D/g, '');
    var first = String(name).trim().split(/\s+/)[0] || '';
    var askTxt = encodeURIComponent('Bonjour ' + first + ', pour compléter votre dossier All Star Loc, merci de nous envoyer une photo de votre ' + missing.map(function (d) { return d[0] === 'permis' ? 'permis de conduire' : (d[1] === 'Passeport' ? 'passeport' : "carte d'identité (recto et verso)"); }).join(' et de votre ') + '. Merci !');
    // Paiement
    var disc = (typeof aslDiscountSum === 'function') ? aslDiscountSum(r) : 0;
    var total = (Number(r.amount) || 0), paid = Number(r.paid) || 0, rest = Math.max(0, total - paid);
    var journal = (typeof aslPaymentJournal === 'function') ? aslPaymentJournal(r) : [];
    journal.sort(function (a, b) { return String(a.date || '').localeCompare(String(b.date || '')); });
    var payLines = journal.map(function (p) { return '<div class="mh-jl"><i class="g"></i><span>' + esc(mhDM(p.date) + ' · ' + (p.mode || p.comment || 'Versement') + (p.collectedBy ? ' · ' + p.collectedBy : '')) + '</span><b class="ok">+' + money(p.amount) + '</b></div>'; })
      .concat((r.discounts || []).map(function (d) { return '<div class="mh-jl"><i class="o"></i><span>' + esc('Remise' + (d.note ? ' · ' + d.note : '')) + '</span><b class="disc">−' + money(d.amount) + '</b></div>'; }));
    // Infos complémentaires
    var ORIGIN = { online: 'Site Web', manual: 'Réservation manuelle', phone: 'Téléphone', whatsapp: 'WhatsApp', partner: 'Partenaire', gbp: 'Google Business Profile', facebook: 'Facebook', instagram: 'Instagram' };
    var more = [];
    if (r.source) more.push(['Origine du client', ORIGIN[r.source] || r.source]);
    if (r.flight) more.push(['Vol', r.flight]);
    if (r.notes) more.push(['Notes', r.notes]);
    // Autres locations du client
    var others = same.filter(function (x) { return String(x.id) !== String(r.id); }).sort(function (a, b) { return String(b.startDate || '').localeCompare(String(a.startDate || '')); }).slice(0, 10);
    var rows = [['Téléphone', phone || '—']];
    if (email) rows.push(['Email', email]);
    rows.push(['Nationalité', nat || '—']);
    if (job) rows.push(['Profession', job]);

    host.innerHTML =
      (sl ? '<div class="mu-slbox"><small>Sous-location</small><b>' + esc(sl) + '</b></div>' : '')
      + '<div class="mh-card">'
      + '<div class="mh-top"><span class="mh-car">' + ic('car') + '</span><span class="mh-who"><b>' + esc(r.car || 'Véhicule') + '</b><small>' + esc((plateColor ? plateColor + ' · ' : '') + 'Contrat ' + (r.contractRef || r.id || '')) + '</small></span><span class="mh-pill ' + st[0] + '">' + st[1] + '</span></div>'
      + '<div class="mh-2"><div class="mh-when"><small>Départ</small><b>' + esc(fmtDateT(r.startDate, r.startTime, '10:00')) + '</b><span>' + esc(r.pickup || '—') + '</span></div>'
      + '<div class="mh-when"><small>Retour</small><b>' + esc(fmtDateT(r.endDate, r.endTime, '10:00')) + '</b><span>' + esc(dropoff || '—') + '</span></div></div>'
      + '<div class="mh-dur"><span>Durée : ' + (r.days || 0) + ' jour' + ((r.days || 0) > 1 ? 's' : '') + '</span>' + (r.earlyOrCancelled && r.plannedEndDate ? '<span class="mh-early">Retour prévu le ' + esc(mhDM(r.plannedEndDate)) + '</span>' : '') + '</div>'
      + '</div>'
      + '<div class="mu-sec">Client</div>'
      + '<div class="mh-card">'
      + '<div class="mh-top"><span class="mu-ava">' + esc(name.charAt(0).toUpperCase()) + '</span><span class="mh-who"><b>' + esc(name) + '</b><small>' + same.length + ' location' + (same.length > 1 ? 's' : '') + ' chez All Star Loc</small></span></div>'
      + (digits ? '<div class="mu-2"><a class="mu-call" href="tel:' + esc(String(phone).replace(/[^+0-9]/g, '')) + '">' + ic('phone') + ' Appeler</a><a class="mu-wa" href="https://wa.me/' + esc(digits) + '" target="_blank" rel="noopener">' + ic('phone') + ' WhatsApp</a></div>' : '')
      + '<div class="mh-rows">' + rows.map(function (x) { return '<div class="mh-row"><span>' + esc(x[0]) + '</span><b>' + esc(x[1]) + '</b></div>'; }).join('') + '</div>'
      + '</div>'
      + '<div class="mh-sechead"><span class="mu-sec">Documents du client</span><span class="mh-pill ' + (missing.length ? 'late' : 'done') + '">' + (missing.length ? missing.length + ' manquant' + (missing.length > 1 ? 's' : '') : '✓ Complet') + '</span></div>'
      + '<div class="mh-docs">' + tiles + '</div>'
      + (missing.length && digits ? '<a class="mh-ask" href="https://wa.me/' + esc(digits) + '?text=' + askTxt + '" target="_blank" rel="noopener">' + ic('phone') + ' Demander le document par WhatsApp</a>' : '')
      + '<div class="mu-sec">Paiement</div>'
      + '<div class="mh-card"><div class="mu-3"><div><small>Total</small><b>' + money(total + disc) + '</b></div><div><small>Payé</small><b class="ok">' + money(paid) + '</b></div><div><small>Reste</small><b class="' + (rest > 0 ? 'red' : 'ok') + '">' + money(rest) + '</b></div></div>'
      + (payLines.length ? '<div class="mh-jls">' + payLines.join('') + '</div>' : '<div class="mu-jn">Aucun versement enregistré.</div>') + '</div>'
      + (more.length ? '<div class="mu-sec">Infos complémentaires</div><div class="mh-card"><div class="mh-rows">' + more.map(function (x) { return '<div class="mh-row"><span>' + esc(x[0]) + '</span><b>' + esc(x[1]) + '</b></div>'; }).join('') + '</div></div>' : '')
      + (others.length ? '<div class="mu-sec">Autres locations de ' + esc(first) + ' · ' + others.length + '</div>'
        + others.map(function (o) {
          return '<button type="button" class="mh-other" onclick="maHistFiche(\'' + esc(String(o.id)) + '\')"><span class="mh-who"><b>' + esc(fmtD(o.startDate) + ' → ' + fmtD(o.endDate)) + '</b><small>' + esc((o.car || '') + ' · Contrat ' + (o.contractRef || o.id || '') + (o.days ? ' · ' + o.days + ' j' : '')) + '</small></span>' + ic('arrowLeft', 'mu-chev') + '</button>';
        }).join('') : '');
    try { if (typeof aslDocHydrate === 'function') aslDocHydrate(host); } catch (e1) {}
  }
  /* Document en plein écran (recto / verso) */
  window.maHistDoc = function (type, idx) {
    var list = (HF.docs && HF.docs[type]) || [];
    if (!list.length) return;
    idx = Math.max(0, Math.min(list.length - 1, idx || 0));
    var old = document.getElementById('mh-viewer'); if (old) old.remove();
    var v = document.createElement('div'); v.id = 'mh-viewer'; v.className = 'mh-viewer';
    var lbl = type === 'permis' ? 'Permis de conduire' : "Pièce d'identité";
    v.innerHTML = '<div class="mh-vtop"><button type="button" aria-label="Fermer le document" onclick="document.getElementById(\'mh-viewer\').remove()">' + ic('x') + '</button><div><b>' + lbl + '</b><small>' + esc((document.getElementById('ma-title') || {}).textContent || '') + '</small></div></div>'
      + '<div class="mh-vimg"><img alt="' + lbl + '"' + (typeof aslDocImgAttrs === 'function' ? aslDocImgAttrs(list[idx]) : ' src="' + esc(list[idx]) + '"') + '></div>'
      + (list.length > 1 ? '<div class="mh-vnav"><button type="button" aria-label="Page précédente"' + (idx ? '' : ' disabled') + ' onclick="maHistDoc(\'' + type + '\',' + (idx - 1) + ')">' + ic('arrowLeft') + '</button><span>' + (idx === 0 ? 'Recto' : idx === 1 ? 'Verso' : 'Page') + ' · ' + (idx + 1) + ' / ' + list.length + '</span><button type="button" aria-label="Page suivante"' + (idx < list.length - 1 ? '' : ' disabled') + ' onclick="maHistDoc(\'' + type + '\',' + (idx + 1) + ')">' + ic('arrowLeft', 'mu-chev') + '</button></div>' : '');
    document.body.appendChild(v);
    try { if (typeof aslDocHydrate === 'function') aslDocHydrate(v); } catch (e) {}
  };
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
    var r = (ASLDB.getReservations() || []).filter(function (x) { return x.id === id; })[0];
    // Contrat longue durée : fiche dans l'application (plus de pop-up ordinateur)
    if (r && r.type === 'lld') { maOpenLLD(id); return; }
    if (!r) return;
    // ★ « Modifier tout » : l'assistant mobile « Nouvelle location » en mode
    //   modification (prérempli), sans pop-up ordinateur.
    closeSheet();
    WZ = wzFromRes(r); WZ.edit.mode = mode || 'rented';
    var host = document.getElementById('ma-wiz');
    if (!host) { host = document.createElement('div'); host.id = 'ma-wiz'; document.body.appendChild(host); }
    host.style.display = 'block';
    document.body.classList.add('ma-locked');
    wzRender();
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

  /* ============ IMPAYÉS — liste par client + fiche, 100 % mobile ============
     ★ Refonte (prototype validé) : recherche, regroupement par client, fiche
     client DANS l'application (plus aucun passage par l'interface ordinateur),
     encaissement avec mode + « encaissé par ». Données : exactement les mêmes
     que l'ordinateur (ASLDB.selectUnpaid, journal des versements, remises). */
  var MU = { client: null, q: '', filter: 'all' };
  window.maOpenUnpaid = function () { MU.client = null; maGo('unpaid'); };
  function muKey(r) { return (typeof _custId === 'function') ? _custId(r.email, r.client) : ('name:' + String(r.client || '').trim().toLowerCase()); }
  function muDue(r) { return Math.max(0, (Number(r.amount) || 0) - (Number(r.paid) || 0)); }
  function muDisc(r) { return (typeof aslDiscountSum === 'function') ? aslDiscountSum(r) : ((r.discounts || []).reduce(function (s, d) { return s + (Number(d && d.amount) || 0); }, 0)); }
  function muLate(r) { var ph = ASLDB.computePhase ? ASLDB.computePhase(r) : ''; return ph === 'late'; }
  function muDM(iso) { iso = String(iso || ''); return iso.length >= 10 ? iso.slice(8, 10) + '/' + iso.slice(5, 7) : (iso || '—'); }
  /* Clients ayant un reste à payer, avec leurs dossiers impayés. */
  function muGroups() {
    var map = {}, order = [];
    (ASLDB.selectUnpaid ? ASLDB.selectUnpaid() : []).forEach(function (r) {
      var k = muKey(r);
      if (!map[k]) { map[k] = { key: k, name: r.client || 'Client', phone: '', sublease: '', res: [], due: 0, total: 0, paid: 0, disc: 0, late: false, last: '' }; order.push(k); }
      var g = map[k];
      g.res.push(r);
      var d = muDisc(r);
      g.due += muDue(r); g.paid += Number(r.paid) || 0; g.disc += d; g.total += (Number(r.amount) || 0) + d;
      if (muLate(r)) g.late = true;
      if ((r.startDate || '') >= g.last) { g.last = r.startDate || ''; if (r.phone) g.phone = r.phone; if (r.client) g.name = r.client; }
      if (!g.phone && r.phone) g.phone = r.phone;
      var sl = (typeof subLeaseNameFor === 'function') ? subLeaseNameFor(r) : '';
      if (sl && !g.sublease) g.sublease = String(sl).replace(/<[^>]*>/g, '');
    });
    return order.map(function (k) { return map[k]; });
  }
  function muMatch(g, q) {
    if (!q) return true;
    var ql = q.toLowerCase(), qd = ql.replace(/\D/g, '');
    var hay = (g.name + ' ' + g.sublease + ' ' + g.res.map(function (r) { return [r.contractRef, r.id, r.car, r.assignedPlate, (typeof aslVehLabel === 'function' ? aslVehLabel(r) : '')].join(' '); }).join(' ')).toLowerCase();
    return hay.indexOf(ql) >= 0 || (qd.length >= 3 && muPhoneForms(g.phone).indexOf(qd) >= 0);
  }
  /* Téléphone cherchable au format international (212 6…) ET local (06…). */
  function muPhoneForms(p) { var d = String(p || '').replace(/\D/g, ''); if (d.indexOf('00') === 0) d = d.slice(2); return d + ' ' + (d.indexOf('212') === 0 ? '0' + d.slice(3) : d); }
  function muPct(paidPlusDisc, total) { return total > 0 ? Math.min(100, Math.round(paidPlusDisc / total * 100)) : 0; }

  function renderUnpaidM() {
    var host = document.getElementById('ma-unpaid');
    if (!host) return;
    var groups = muGroups();
    if (MU.client) {
      var g = groups.filter(function (x) { return x.key === MU.client; })[0];
      if (g) { muRenderDetail(host, g); return; }
      MU.client = null; // client soldé entre-temps → retour à la liste
      var t0 = document.getElementById('ma-title'); if (t0) t0.textContent = 'Impayés';
    }
    // Liste : le champ de recherche est conservé tel quel (le clavier reste ouvert)
    if (!document.getElementById('ma-unp-q')) {
      host.innerHTML = '<div id="ma-unp-sum"></div>'
        + '<label class="mu-search">' + ic('search') + '<span class="mu-sr">Rechercher un client</span>'
        + '<input id="ma-unp-q" type="search" value="' + esc(MU.q) + '" placeholder="Nom, téléphone, contrat, plaque…" autocomplete="off" oninput="maUnpaidQ(this.value)">'
        + '<button type="button" class="mu-clear" id="ma-unp-clear" aria-label="Effacer la recherche" onclick="maUnpaidQ(\'\',1)"' + (MU.q ? '' : ' style="display:none;"') + '>' + ic('x') + '</button></label>'
        + '<div class="mu-chips" id="ma-unp-chips"></div>'
        + '<div id="ma-unp-list"></div>';
    }
    muRenderList(groups);
  }
  function muRenderList(groups) {
    groups = groups || muGroups();
    var sumEl = document.getElementById('ma-unp-sum'), list = document.getElementById('ma-unp-list'), chips = document.getElementById('ma-unp-chips');
    if (!list) return;
    var grand = groups.reduce(function (s, g) { return s + g.due; }, 0);
    var nDos = groups.reduce(function (s, g) { return s + g.res.length; }, 0);
    var nLate = groups.filter(function (g) { return g.late; }).length;
    if (sumEl) sumEl.innerHTML = '<div class="mu-total"><div class="mu-lbl">Total à encaisser</div><div class="mu-big">' + money(grand) + '</div>'
      + '<div class="mu-line">' + nDos + ' dossier' + (nDos > 1 ? 's' : '') + ' · ' + groups.length + ' client' + (groups.length > 1 ? 's' : '') + ' · ' + nLate + ' en retard</div></div>';
    if (chips) chips.innerHTML = [['all', 'Tous · ' + groups.length], ['late', 'Retour dépassé · ' + nLate]].map(function (c) {
      return '<button type="button" class="mu-chip' + (MU.filter === c[0] ? ' on' : '') + '" onclick="maUnpaidFilter(\'' + c[0] + '\')">' + c[1] + '</button>';
    }).join('');
    if (!groups.length) { list.innerHTML = '<div class="ma-empty">✓ Aucun impayé. Tout est encaissé.</div>'; return; }
    var shown = groups.filter(function (g) { return (MU.filter !== 'late' || g.late) && muMatch(g, MU.q.trim()); })
      .sort(function (a, b) { return (b.late - a.late) || (b.due - a.due); });
    var label = MU.q.trim() ? shown.length + ' résultat' + (shown.length > 1 ? 's' : '') : (MU.filter === 'late' ? 'Retour dépassé' : 'Clients à relancer');
    list.innerHTML = '<div class="mu-sec">' + esc(label) + '</div>'
      + (shown.length ? shown.map(function (g) {
        var n = g.res.length;
        return '<button type="button" class="mu-client" data-k="' + esc(encodeURIComponent(g.key)) + '" onclick="maUnpaidOpen(this.dataset.k)">'
          + '<span class="mu-row"><span class="mu-ava">' + esc((g.name || '?').charAt(0).toUpperCase()) + '</span>'
          + '<span class="mu-who">' + (g.sublease ? '<span class="mu-sl">' + esc(g.sublease) + '</span>' : '') + '<b>' + esc(g.name) + '</b><small>' + esc((g.phone || 'Pas de téléphone') + ' · ' + n + ' dossier' + (n > 1 ? 's' : '')) + '</small></span>'
          + '<span class="mu-due"><b>' + money(g.due) + '</b><small>à encaisser</small></span>' + ic('arrowLeft', 'mu-chev') + '</span>'
          + '<span class="mu-bar"><i style="width:' + muPct(g.paid + g.disc, g.total) + '%"></i></span>'
          + '<span class="mu-row2"><small>Payé ' + money(g.paid) + ' sur ' + money(g.total) + (g.disc ? ' · remise ' + money(g.disc) : '') + '</small>' + (g.late ? '<span class="mu-pill late">Retour dépassé</span>' : '') + '</span>'
          + '</button>';
      }).join('') : '<div class="mu-none"><b>Aucun impayé trouvé</b><div>' + (MU.q.trim() ? 'Aucun client ne correspond à « ' + esc(MU.q.trim()) + ' ».' : 'Aucun dossier dans ce filtre.') + '</div></div>');
  }
  window.maUnpaidQ = function (v, clear) {
    MU.q = v || '';
    var c = document.getElementById('ma-unp-clear'); if (c) c.style.display = MU.q ? '' : 'none';
    if (clear) { var i = document.getElementById('ma-unp-q'); if (i) { i.value = ''; i.focus(); } }
    muRenderList();
  };
  window.maUnpaidFilter = function (f) { MU.filter = f; muRenderList(); };
  window.maUnpaidOpen = function (enc) {
    MU.client = decodeURIComponent(enc);
    var app = document.getElementById('asl-mobile-app'); if (app) app.scrollTop = 0;
    renderUnpaidM();
  };
  /* Retour de la fiche vers la liste (flèche de l'en-tête) */
  window.maUnpaidBack = function () {
    MU.client = null;
    var t = document.getElementById('ma-title'); if (t) t.textContent = 'Impayés';
    var host = document.getElementById('ma-unpaid'); if (host) host.innerHTML = '';
    renderUnpaidM();
    var app = document.getElementById('asl-mobile-app'); if (app) app.scrollTop = 0;
  };

  function muRenderDetail(host, g) {
    var t = document.getElementById('ma-title'); if (t) t.textContent = g.name;
    var phoneD = String(g.phone || '').replace(/\D/g, '');
    var res = g.res.slice().sort(function (a, b) { return (muLate(b) - muLate(a)) || String(b.startDate || '').localeCompare(String(a.startDate || '')); });
    var html = (g.sublease ? '<div class="mu-slbox"><small>Sous-location</small><b>' + esc(g.sublease) + '</b></div>' : '')
      + '<div class="mu-hero"><div class="mu-lbl">Reste à encaisser</div><div class="mu-big">' + money(g.due) + '</div>'
      + '<span class="mu-bar big"><i style="width:' + muPct(g.paid + g.disc, g.total) + '%"></i></span>'
      + '<div class="mu-3"><div><small>Total</small><b>' + money(g.total) + '</b></div><div><small>Payé</small><b class="ok">' + money(g.paid) + '</b></div><div><small>Remises</small><b>' + (g.disc ? '−' + money(g.disc) : '0 MAD') + '</b></div></div>'
      + (phoneD ? '<div class="mu-2"><a class="mu-call" href="tel:' + esc(g.phone.replace(/[^+0-9]/g, '')) + '">' + ic('phone') + ' Appeler</a><a class="mu-wa" href="https://wa.me/' + esc(phoneD) + '" target="_blank" rel="noopener">' + ic('phone') + ' WhatsApp</a></div><div class="mu-ph">' + esc(g.phone) + '</div>' : '<div class="mu-ph">Pas de téléphone enregistré</div>')
      + '</div>'
      + '<div class="mu-sec">Dossiers impayés · ' + res.length + '</div>'
      + res.map(function (r) {
        var disc = muDisc(r), due = muDue(r), late = muLate(r);
        var ph = ASLDB.computePhase ? ASLDB.computePhase(r) : '';
        var pill = late ? ['late', 'Retour dépassé'] : ph === 'active' ? ['act', 'En cours'] : ph === 'reserved' ? ['res', 'Réservé'] : ph === 'completed' ? ['done', 'Véhicule rendu'] : ['done', r.type === 'lld' ? 'Longue durée' : 'Dossier'];
        var journal = (typeof aslPaymentJournal === 'function') ? aslPaymentJournal(r) : [];
        journal.sort(function (a, b) { return String(a.date || '').localeCompare(String(b.date || '')); });
        var lines = journal.map(function (p) {
          return '<div class="mu-jl"><i class="g"></i><span>' + esc(muDM(p.date) + ' · ' + (p.mode || '—') + (p.collectedBy ? ' · ' + p.collectedBy : '') + (p.comment ? ' · ' + p.comment : '')) + '</span><b class="ok">+' + money(p.amount) + '</b></div>';
        }).concat((r.discounts || []).map(function (d) {
          return '<div class="mu-jl"><i class="o"></i><span>' + esc('Remise' + (d.note ? ' · ' + d.note : '') + (d.date ? ' · ' + muDM(d.date) : '')) + '</span><b class="disc">−' + money(d.amount) + '</b></div>';
        }));
        var veh = (typeof aslVehLabel === 'function') ? aslVehLabel(r) : (r.car || '');
        return '<div class="mu-dos">'
          + '<div class="mu-dh"><span class="mu-car">' + ic('car') + '</span><span class="mu-who"><b>' + esc(veh) + '</b><small>' + esc('Contrat ' + (r.contractRef || r.id || '') + ' · du ' + muDM(r.startDate) + ' au ' + muDM(r.endDate)) + '</small></span><span class="mu-pill ' + pill[0] + '">' + pill[1] + '</span></div>'
          + '<div class="mu-3 soft"><div><small>Total</small><b>' + money((Number(r.amount) || 0) + disc) + '</b></div><div><small>Payé</small><b class="ok">' + money(Number(r.paid) || 0) + '</b></div><div><small>Reste</small><b class="red">' + money(due) + '</b></div></div>'
          + '<div class="mu-jt">Versements &amp; remises · ' + lines.length + '</div>'
          + (lines.length ? lines.join('') : '<div class="mu-jn">Aucun versement pour l\'instant.</div>')
          + (due > 0 ? '<div class="mu-acts"><button type="button" class="mu-pay" onclick="maPayUnpaid(\'' + esc(String(r.id)) + '\')">Encaisser</button><button type="button" class="mu-disc" onclick="maDiscountUnpaid(\'' + esc(String(r.id)) + '\')">Remise</button></div>' : '<div class="mu-paid">Dossier soldé ✓</div>')
          + '</div>';
      }).join('');
    host.innerHTML = html;
  }

  /* ---- Encaisser : feuille mobile (montant, mode, encaissé par) ---- */
  var MP = null;
  function mpChips(field, list) {
    return '<div class="mu-chips wrap">' + list.map(function (v) { return '<button type="button" class="mu-chip' + (MP[field] === v ? ' on' : '') + '" data-v="' + esc(v) + '" onclick="maPaySet(\'' + field + '\',this.dataset.v)">' + esc(v) + '</button>'; }).join('') + '</div>';
  }
  function mpRender() {
    var box = document.getElementById('mu-paysheet'); if (!box || !MP) return;
    var amt = parseFloat(String(MP.amount).replace(',', '.')) || 0, ok = amt > 0 && !!MP.by;
    box.querySelector('.mu-modes').innerHTML = mpChips('mode', ['Espèces', 'Carte bancaire', 'Virement', 'Chèque']);
    box.querySelector('.mu-people').innerHTML = mpChips('by', ['Mohamed', 'Younes', 'Khalil']);
    var hint = box.querySelector('.mu-hint'); hint.textContent = ok ? '' : (amt <= 0 ? 'Saisissez le montant reçu' : 'Indiquez qui a encaissé'); hint.style.display = ok ? 'none' : '';
    var b = box.querySelector('.mu-go'); b.disabled = !ok; b.textContent = 'Enregistrer ' + money(Math.min(amt, MP.due));
  }
  /* Feuille d'encaissement partagée (Impayés, Sous-location, Longue durée).
     opts.title, opts.dueLabel, opts.quick [{label, amount}], opts.dated
     (date + commentaire), opts.lld (mode/encaissé par mémorisés comme sur
     l'ordinateur), opts.after (rafraîchissement de l'écran appelant). */
  function mpOpen(r, opts) {
    opts = opts || {};
    var due = (opts.due != null) ? opts.due : muDue(r);
    MP = { id: r.id, due: due, amount: String(opts.amount != null ? opts.amount : Math.round(due * 100) / 100), mode: r.paymentMode && ['Espèces', 'Carte bancaire', 'Virement', 'Chèque'].indexOf(r.paymentMode) >= 0 ? r.paymentMode : 'Espèces', by: '',
      date: todayISO(), comment: '', dated: !!opts.dated, lld: !!opts.lld, after: opts.after || null };
    var quick = (opts.quick || []).concat([{ label: 'Tout le reste · ' + money(due), amount: due }]);
    MP.quick = quick;
    openSheet('<div id="mu-paysheet">'
      + '<div class="ma-sheet-title">' + esc(opts.title || 'Encaisser un versement') + '</div>'
      + '<div class="ma-sheet-sub">' + esc(opts.who || ((r.client || 'Client') + ' · ' + ((typeof aslVehLabel === 'function') ? aslVehLabel(r) : (r.car || '')) + ' · ' + (r.contractRef || r.id || ''))) + '</div>'
      + '<div class="mu-duebox"><span>' + esc(opts.dueLabel || 'Reste dû') + '</span><b>' + money(due) + '</b></div>'
      + '<label class="mu-amt"><span>Montant reçu (MAD)</span><span class="mu-amtin"><input id="mu-pay-amt" type="number" inputmode="decimal" min="0" step="any" value="' + esc(MP.amount) + '" oninput="maPaySet(\'amount\',this.value,1)"><em>MAD</em></span></label>'
      + '<div class="mu-chips wrap">' + quick.map(function (q, i) { return '<button type="button" class="mu-all" onclick="maPayQuick(' + i + ')">' + esc(q.label) + '</button>'; }).join('') + '</div>'
      + (MP.dated ? '<label class="mu-dateline"><span>Date du versement</span><input type="date" id="mu-pay-date" value="' + esc(MP.date) + '" oninput="maPaySet(\'date\',this.value,1)"></label>' : '')
      + '<div class="mu-sec">Mode de paiement</div><div class="mu-modes"></div>'
      + '<div class="mu-sec">Encaissé par</div><div class="mu-people"></div>'
      + (MP.dated ? '<input class="mu-txt mu-cmt" id="mu-pay-cmt" placeholder="Commentaire (facultatif)" oninput="maPaySet(\'comment\',this.value,1)">' : '')
      + '<div class="mu-hint"></div>'
      + '<button type="button" class="mu-go" onclick="maPayConfirm()">Enregistrer</button></div>');
    mpRender();
  }
  window.maPayUnpaid = function (resId) {
    var r = (ASLDB.getReservations() || []).filter(function (x) { return String(x.id) === String(resId); })[0];
    if (!r) return;
    mpOpen(r, { after: renderUnpaidM });
  };
  window.maPaySet = function (field, v, typing) { if (!MP) return; MP[field] = v; mpRender(); if (!typing) return; };
  window.maPayAll = function () { if (!MP) return; MP.amount = String(Math.round(MP.due * 100) / 100); var i = document.getElementById('mu-pay-amt'); if (i) i.value = MP.amount; mpRender(); };
  window.maPayQuick = function (i) { if (!MP || !MP.quick || !MP.quick[i]) return; MP.amount = String(Math.round(Math.min(MP.quick[i].amount, MP.due) * 100) / 100); var el = document.getElementById('mu-pay-amt'); if (el) el.value = MP.amount; mpRender(); };
  window.maPayConfirm = function () {
    if (!MP) return;
    var r = (ASLDB.getReservations() || []).filter(function (x) { return String(x.id) === String(MP.id); })[0];
    if (!r) return;
    var reste = muDue(r);
    var amount = parseFloat(String(MP.amount).replace(',', '.')) || 0;
    if (amount <= 0 || !MP.by) return;
    if (amount > reste) amount = reste;
    // Même enregistrement que l'ordinateur : versement ajouté au journal,
    // avec son mode et la personne qui a encaissé.
    var patch;
    var pDate = (MP.dated && MP.date) ? MP.date : todayISO();
    var pCmt = MP.dated ? String(MP.comment || '').trim() : 'Encaissé depuis le mobile';
    if (typeof aslPaymentJournal === 'function') {
      var journal = aslJournalClean(aslPaymentJournal(r));
      journal.push({ date: pDate, amount: Math.round(amount * 100) / 100, mode: MP.mode, collectedBy: MP.by, comment: pCmt });
      var newPaidJ = aslJournalSum(journal);
      patch = { payments: journal, paid: newPaidJ, paymentStatus: newPaidJ >= (Number(r.amount) || 0) ? 'Paiement complet' : 'Paiement partiel' };
    } else {
      var newPaid = (Number(r.paid) || 0) + amount;
      patch = { paid: newPaid, paymentStatus: newPaid >= (Number(r.amount) || 0) ? 'Paiement complet' : 'Paiement partiel' };
    }
    // Longue durée : comme l'ordinateur (addLLDPaymentEntry), le dernier mode
    // et la personne qui a encaissé sont aussi mémorisés sur le contrat.
    if (MP.lld) { patch.paymentMode = MP.mode; patch.collectedBy = MP.by; }
    try { ASLDB.updateReservation(r.id, patch); } catch (e) {}
    var after = MP.after;
    MP = null; closeSheet();
    try { if (typeof reloadData === 'function') reloadData(); } catch (e2) {}
    if (typeof showToast === 'function') showToast('Versement de ' + money(amount) + ' enregistré ✓');
    if (typeof after === 'function') after(); else renderUnpaidM();
  };

  /* ★ Remise sur un impayé (même logique que le desktop :
     aslApplyDiscount, déduite du reste dû et tracée dans le dossier). */
  window.maDiscountUnpaid = function (resId) {
    var r = (ASLDB.getReservations() || []).filter(function (x) { return String(x.id) === String(resId); })[0];
    if (!r) return;
    var reste = muDue(r);
    var ds = muDisc(r);
    openSheet(
      '<div class="ma-sheet-title">Accorder une remise</div>'
      + '<div class="ma-sheet-sub">' + esc((r.client || 'Client') + ' · ' + ((typeof aslVehLabel === 'function') ? aslVehLabel(r) : (r.car || ''))) + '</div>'
      + '<div class="mu-duebox"><span>Reste dû</span><b>' + money(reste) + '</b></div>'
      + (ds > 0 ? '<div class="mu-jn" style="margin-bottom:10px;">Remises déjà accordées : −' + money(ds) + '</div>' : '')
      + '<label class="mu-amt"><span>Montant de la remise (MAD)</span><span class="mu-amtin"><input type="number" inputmode="decimal" min="0" step="any" id="ma-disc-amount" placeholder="Max ' + Math.round(reste) + '"><em>MAD</em></span></label>'
      + '<label class="mu-amt"><span>Motif (facultatif)</span><input class="mu-txt" id="ma-disc-note" placeholder="Ex : arrangement avec le client"></label>'
      + '<div class="mu-jn" style="margin:2px 0 12px;">La remise est déduite du reste dû. Si le reste tombe à 0, le dossier est soldé.</div>'
      + '<button type="button" class="mu-go" onclick="maApplyDiscount(\'' + esc(String(r.id)) + '\')">Appliquer la remise</button>'
    );
  };
  window.maApplyDiscount = function (resId) {
    if (typeof aslApplyDiscount !== 'function') return;
    var a = document.getElementById('ma-disc-amount'), n = document.getElementById('ma-disc-note');
    if (aslApplyDiscount(resId, a ? a.value : 0, n ? n.value : '')) { closeSheet(); renderUnpaidM(); }
  };

  /* ======================================================================
     ★ SOUS-LOCATION — partenaires, 100 % dans l'application (prototype validé)
     Liste des partenaires (somme due, recherche), fiche partenaire (onglets
     Impayés / En cours / Toutes, encaissement, fiche location), création et
     modification d'un partenaire, « Nouvelle location avec ce partenaire ».
     Données : exactement celles de l'ordinateur (ASLSublease + réservations
     portant subleaseId / finalClient, journal des versements).
     ====================================================================== */
  var SL = { view: 'list', id: null, tab: '', q: '', form: null, keep: false };
  function maSetTitle(t) { var el = document.getElementById('ma-title'); if (el) el.textContent = t; }
  function maTop() { var app = document.getElementById('asl-mobile-app'); if (app) app.scrollTop = 0; }
  function slPhase(r) { return ASLDB.computePhase ? ASLDB.computePhase(r) : ''; }
  function slStats(s) {
    var list = ASLSublease.linkedRes(s.id), st = ASLSublease.stats(s.id);
    st.active = list.filter(function (r) { var ph = slPhase(r); return ph === 'active' || ph === 'late'; }).length;
    st.unpaid = list.filter(function (r) { return muDue(r) > 0; }).length;
    return st;
  }
  function slDigits(p) { var d = String(p || '').replace(/\D/g, ''); if (d.indexOf('00') === 0) d = d.slice(2); if (d.indexOf('0') === 0 && d.length === 10) d = '212' + d.slice(1); return d; }
  function slFormHTML(f, ctx) {
    var inp = function (k, label, type, ph, extra) { return '<label class="sl-field"><span>' + label + '</span><input type="' + type + '" value="' + esc(f[k] || '') + '" placeholder="' + esc(ph) + '" ' + (extra || '') + ' oninput="maSlF(\'' + k + '\',this.value)"></label>'; };
    return '<div class="sl-form" id="sl-form-' + ctx + '">'
      + inp('name', 'Nom du partenaire *', 'text', 'Ex : Atlas Cars, Karim Transport…', 'autocomplete="off"')
      + inp('phone', 'Téléphone', 'tel', '+212 6…', 'inputmode="tel"')
      + '<label class="sl-check"><input type="checkbox"' + (f.same ? ' checked' : '') + ' onchange="maSlF(\'same\',this.checked?1:0,1)"><span>WhatsApp : même numéro</span></label>'
      + (f.same ? '' : inp('whatsapp', 'WhatsApp', 'tel', '+212 6…', 'inputmode="tel"'))
      + inp('address', 'Adresse (facultatif)', 'text', 'Ville, quartier…')
      + '<label class="sl-field"><span>Notes internes (facultatif)</span><textarea rows="3" placeholder="Conditions, commission, contact…" oninput="maSlF(\'notes\',this.value)">' + esc(f.notes || '') + '</textarea></label>'
      + '</div>';
  }
  function slFormTarget() { return (WZ && WZ.pf) ? WZ.pf : SL.form; }
  window.maSlF = function (k, v, rerender) {
    var f = slFormTarget(); if (!f) return;
    f[k] = (k === 'same') ? !!Number(v) : v;
    if (rerender) { if (WZ && WZ.pf) wzRender(); else { var host = document.getElementById('ma-sublease'); if (host) { host.innerHTML = ''; slRenderForm(host, true); } } return; }
    var ok = !!String(f.name || '').trim();
    document.querySelectorAll('.sl-save').forEach(function (b) { b.disabled = !ok; });
    document.querySelectorAll('.sl-need').forEach(function (h) { h.style.display = ok ? 'none' : ''; });
  };
  /* Enregistre le partenaire (création ou modification) — même module que l'ordinateur. */
  function slSaveForm(f) {
    var data = { name: String(f.name || '').trim(), phone: String(f.phone || '').trim(), whatsapp: f.same ? String(f.phone || '').trim() : String(f.whatsapp || '').trim(), address: String(f.address || '').trim(), notes: String(f.notes || '').trim() };
    if (!data.name) return null;
    if (f.id) return ASLSublease.update(f.id, data);
    var res = ASLSublease.create(data);
    return res && res.sub ? res.sub : null;
  }
  function slNewForm(s) {
    if (!s) return { id: null, name: '', phone: '', same: true, whatsapp: '', address: '', notes: '' };
    var same = !s.whatsapp || slDigits(s.whatsapp) === slDigits(s.phone);
    return { id: s.id, name: s.name || '', phone: s.phone || '', same: same, whatsapp: same ? '' : (s.whatsapp || ''), address: s.address || '', notes: s.notes || '' };
  }

  function renderSubleaseM() {
    var host = document.getElementById('ma-sublease');
    if (!host || typeof ASLSublease === 'undefined') return;
    if (SL.view === 'form') { slRenderForm(host); return; }
    if (SL.view === 'detail') {
      var s = ASLSublease.get(SL.id);
      if (s) { slRenderDetail(host, s); return; }
      SL.view = 'list'; SL.id = null; host.innerHTML = '';
    }
    maSetTitle('Sous-location');
    // Liste : le champ de recherche est conservé (le clavier reste ouvert)
    if (!document.getElementById('ma-sl-q')) {
      host.innerHTML = '<div id="ma-sl-sum"></div>'
        + '<label class="mu-search">' + ic('search') + '<span class="mu-sr">Rechercher un partenaire</span>'
        + '<input id="ma-sl-q" type="search" value="' + esc(SL.q) + '" placeholder="Rechercher un partenaire…" autocomplete="off" oninput="maSlQ(this.value)">'
        + '<button type="button" class="mu-clear" id="ma-sl-clear" aria-label="Effacer la recherche" onclick="maSlQ(\'\',1)"' + (SL.q ? '' : ' style="display:none;"') + '>' + ic('x') + '</button></label>'
        + '<button type="button" class="sl-dashed" onclick="maSlForm()">' + ic('plus') + ' Nouveau partenaire</button>'
        + '<div id="ma-sl-list"></div>';
    }
    slRenderList();
  }
  function slRenderList() {
    var box = document.getElementById('ma-sl-list'), sum = document.getElementById('ma-sl-sum');
    if (!box) return;
    var rows = ASLSublease.list().map(function (s) { return { s: s, st: slStats(s) }; });
    var due = rows.reduce(function (a, x) { return a + x.st.rest; }, 0), act = rows.reduce(function (a, x) { return a + x.st.active; }, 0);
    if (sum) sum.innerHTML = '<div class="mu-total"><div class="mu-lbl">Dû par les partenaires</div><div class="mu-big">' + money(due) + '</div>'
      + '<div class="mu-line">' + rows.length + ' partenaire' + (rows.length > 1 ? 's' : '') + ' · ' + act + ' location' + (act > 1 ? 's' : '') + ' en cours</div></div>';
    var q = SL.q.trim().toLowerCase(), qd = q.replace(/\D/g, '');
    var shown = rows.filter(function (x) {
      if (!q) return true;
      var s = x.s;
      return ((s.name || '') + ' ' + (s.address || '') + ' ' + (s.notes || '')).toLowerCase().indexOf(q) >= 0
        || (qd.length >= 3 && (muPhoneForms(s.phone) + ' ' + muPhoneForms(s.whatsapp)).indexOf(qd) >= 0);
    }).sort(function (a, b) { return (b.st.rest - a.st.rest) || String(a.s.name).localeCompare(String(b.s.name), 'fr'); });
    if (!rows.length) { box.innerHTML = '<div class="mu-none"><b>Aucun partenaire</b><div>Ajoutez votre premier partenaire de sous-location.</div></div>'; return; }
    box.innerHTML = '<div class="mu-sec">' + (q ? shown.length + ' résultat' + (shown.length > 1 ? 's' : '') : 'Partenaires') + '</div>'
      + (shown.length ? shown.map(function (x) {
        var s = x.s, st = x.st;
        return '<button type="button" class="mu-client sl-card" data-id="' + esc(s.id) + '" onclick="maSlOpen(this.dataset.id)">'
          + '<span class="mu-row"><span class="mu-ava sl">' + esc((s.name || '?').charAt(0).toUpperCase()) + '</span>'
          + '<span class="mu-who"><b>' + esc(s.name) + '</b><small>' + esc((st.active ? st.active + ' en cours · ' : '') + st.count + ' location' + (st.count > 1 ? 's' : '')) + '</small></span>'
          + '<span class="mu-due' + (st.rest > 0 ? '' : ' ok') + '"><b>' + (st.rest > 0 ? money(st.rest) : 'À jour') + '</b><small>' + (st.rest > 0 ? 'à encaisser' : 'rien à encaisser') + '</small></span>' + ic('arrowLeft', 'mu-chev') + '</span>'
          + '</button>';
      }).join('') : '<div class="mu-none"><b>Aucun partenaire trouvé</b><div>Aucun partenaire ne correspond à « ' + esc(SL.q.trim()) + ' ».</div></div>');
  }
  window.maSlQ = function (v, clear) {
    SL.q = v || '';
    var c = document.getElementById('ma-sl-clear'); if (c) c.style.display = SL.q ? '' : 'none';
    if (clear) { var i = document.getElementById('ma-sl-q'); if (i) { i.value = ''; i.focus(); } }
    slRenderList();
  };
  window.maSlOpen = function (id) {
    var host = document.getElementById('ma-sublease'); if (host) host.innerHTML = '';
    SL.view = 'detail'; SL.id = id; SL.tab = '';
    renderSubleaseM(); maTop();
  };
  window.maSlBack = function () {
    var host = document.getElementById('ma-sublease'); if (host) host.innerHTML = '';
    if (SL.view === 'form' && SL.form && SL.form.id) { SL.view = 'detail'; SL.form = null; }
    else { SL.view = 'list'; SL.id = null; SL.form = null; }
    renderSubleaseM(); maTop();
  };
  window.maSlTab = function (t) { SL.tab = t; var s = ASLSublease.get(SL.id); var host = document.getElementById('ma-sublease'); if (s && host) slRenderDetail(host, s); };

  function slRenderDetail(host, s) {
    maSetTitle(s.name || 'Partenaire');
    var st = slStats(s);
    var phone = s.phone || s.whatsapp || '', tel = String(s.phone || '').replace(/[^+0-9]/g, ''), wa = slDigits(s.whatsapp || s.phone);
    var all = ASLSublease.linkedRes(s.id);
    var isAct = function (r) { var ph = slPhase(r); return ph === 'active' || ph === 'late'; };
    var cnt = { unpaid: all.filter(function (r) { return muDue(r) > 0; }).length, active: all.filter(isAct).length, all: all.length };
    var tab = SL.tab || (cnt.unpaid ? 'unpaid' : 'all');
    var list = all.filter(function (r) { return tab === 'all' || (tab === 'unpaid' ? muDue(r) > 0 : isAct(r)); })
      .sort(function (a, b) { return (muDue(b) > 0) - (muDue(a) > 0) || String(b.startDate || '').localeCompare(String(a.startDate || '')); });
    var html = '<div class="mu-hero">'
      + '<div><div class="mu-lbl">Restant dû</div><div class="mu-big' + (st.rest > 0 ? '' : ' ok') + '">' + (st.rest > 0 ? money(st.rest) : 'À jour ✓') + '</div></div>'
      + '<div class="mu-3"><div><small>Facturé</small><b>' + money(st.total) + '</b></div><div><small>Payé</small><b class="ok">' + money(st.paid) + '</b></div><div><small>Locations</small><b>' + st.count + '</b></div></div>'
      + (tel || wa ? '<div class="mu-2">' + (tel ? '<a class="mu-call" href="tel:' + esc(tel) + '">' + ic('phone') + ' Appeler</a>' : '<span></span>') + (wa ? '<a class="mu-wa" href="https://wa.me/' + esc(wa) + '" target="_blank" rel="noopener">' + ic('phone') + ' WhatsApp</a>' : '') + '</div><div class="mu-ph">' + esc(phone) + (s.address ? ' · ' + esc(s.address) : '') + '</div>' : '<div class="mu-ph">Pas de téléphone enregistré</div>')
      + (s.notes ? '<div class="sl-notes">' + esc(s.notes) + '</div>' : '')
      + '<button type="button" class="mu-go sl-newrent" data-id="' + esc(s.id) + '" onclick="maSlNewRental(this.dataset.id)">' + ic('plus') + ' Nouvelle location avec ce partenaire</button>'
      + '<button type="button" class="sl-link" data-id="' + esc(s.id) + '" onclick="maSlForm(this.dataset.id)">Modifier les coordonnées</button>'
      + '</div>'
      + '<div class="sl-seg">' + [['unpaid', 'Impayés'], ['active', 'En cours'], ['all', 'Toutes']].map(function (t) {
        return '<button type="button" class="' + (tab === t[0] ? 'on' : '') + '" onclick="maSlTab(\'' + t[0] + '\')">' + t[1] + ' · ' + cnt[t[0]] + '</button>';
      }).join('') + '</div>'
      + (list.length ? list.map(function (r) {
        var ph = slPhase(r), due = muDue(r);
        var pill = ph === 'late' ? ['late', 'Retour dépassé'] : ph === 'active' ? ['act', 'En cours'] : ph === 'reserved' ? ['res', 'Réservé'] : ['done', 'Terminée'];
        var veh = (typeof aslVehLabel === 'function') ? aslVehLabel(r) : (r.car || '');
        var idS = esc(String(r.id));
        return '<div class="mu-dos sl-rent">'
          + '<button type="button" class="sl-rhead" onclick="maSlView(\'' + idS + '\')"><span class="mu-who"><span class="mu-sl">Client final</span><b>' + esc(r.finalClient || r.client || 'Client') + '</b><small>' + esc(veh + ' · ' + muDM(r.startDate) + ' → ' + muDM(r.endDate)) + '</small></span><span class="mu-pill ' + pill[0] + '">' + pill[1] + '</span></button>'
          + '<div class="mu-3 soft"><div><small>Total</small><b>' + money(r.amount || 0) + '</b></div><div><small>Payé</small><b class="ok">' + money(r.paid || 0) + '</b></div><div><small>Reste</small><b class="' + (due > 0 ? 'red' : 'ok') + '">' + money(due) + '</b></div></div>'
          + '<div class="mu-2"><button type="button" class="sl-btn" onclick="maSlView(\'' + idS + '\')">Voir la fiche</button>'
          + (due > 0 ? '<button type="button" class="mu-pay" onclick="maSlPay(\'' + idS + '\')">Encaisser</button>' : '<div class="mu-paid">Soldé ✓</div>') + '</div>'
          + '</div>';
      }).join('') : '<div class="mu-none">' + (tab === 'unpaid' ? 'Aucun impayé : ce partenaire est à jour.' : tab === 'active' ? 'Aucune location en cours.' : 'Aucune location pour ce partenaire.') + '</div>');
    host.innerHTML = html;
  }
  /* Fiche location : la même que dans l'Historique ; la flèche ramène ici. */
  window.maSlView = function (resId) {
    SL.keep = true;
    maGo('history');
    HF.ret = 'sublease';
    maHistFiche(resId);
  };
  window.maSlPay = function (resId) {
    var r = (ASLDB.getReservations() || []).filter(function (x) { return String(x.id) === String(resId); })[0];
    if (!r) return;
    var s = ASLSublease.get(r.subleaseId);
    mpOpen(r, { who: (s ? s.name + ' · ' : '') + (r.finalClient || r.client || '') + ' · ' + ((typeof aslVehLabel === 'function') ? aslVehLabel(r) : (r.car || '')), after: renderSubleaseM });
  };
  window.maSlNewRental = function (id) { wzOpen('location', 'sublease', { subleaseId: id }); };
  window.maSlForm = function (id) {
    var s = id ? ASLSublease.get(id) : null;
    SL.form = slNewForm(s); SL.view = 'form'; if (s) SL.id = s.id;
    var host = document.getElementById('ma-sublease'); if (host) { host.innerHTML = ''; slRenderForm(host, true); }
    maTop();
  };
  // Ancien nom (menu, autres écrans) : ouvre désormais le formulaire dans l'application.
  window.maNewSublease = function () { closeSheet(); SL.keep = true; SL.view = 'form'; SL.form = slNewForm(null); maGo('sublease'); };
  function slRenderForm(host, force) {
    if (!SL.form) { SL.view = 'list'; renderSubleaseM(); return; }
    maSetTitle(SL.form.id ? 'Modifier le partenaire' : 'Nouveau partenaire');
    if (!force && document.getElementById('sl-form-screen')) return; // saisie en cours : on ne reconstruit pas
    var ok = !!String(SL.form.name || '').trim();
    host.innerHTML = slFormHTML(SL.form, 'screen')
      + '<div class="mu-hint sl-need"' + (ok ? ' style="display:none;"' : '') + '>Saisissez au moins le nom</div>'
      + '<button type="button" class="mu-go sl-save"' + (ok ? '' : ' disabled') + ' onclick="maSlSave()">' + (SL.form.id ? 'Enregistrer les modifications' : 'Enregistrer le partenaire') + '</button>';
  }
  window.maSlSave = function () {
    var f = SL.form; if (!f) return;
    var saved = slSaveForm(f);
    if (!saved) return;
    if (typeof showToast === 'function') showToast(f.id ? 'Partenaire mis à jour ✓' : 'Partenaire créé ✓');
    try { if (typeof renderSubleases === 'function') renderSubleases(); } catch (e) {}
    SL.form = null; SL.view = 'detail'; SL.id = saved.id; SL.tab = f.id ? SL.tab : 'all';
    var host = document.getElementById('ma-sublease'); if (host) host.innerHTML = '';
    renderSubleaseM(); maTop();
  };

  /* ======================================================================
     ★ LOCATION LONGUE DURÉE — 100 % dans l'application (prototype validé)
     Liste des contrats, fiche (reste à payer, attendu à ce jour, durée,
     véhicule, client, documents, versements), ajout / suppression d'un
     versement, modification / prolongation / clôture / suppression, et
     création en 4 étapes. Mêmes données que l'ordinateur : réservations
     type:'lld' et journal des versements (aslPaymentJournal).
     Échéance au choix : par mois, par 15 jours ou montant total libre.
     ====================================================================== */
  var LL = { view: 'list', id: null, q: '', filter: 'all', e: null, keep: false };
  function lldList() {
    try { return (ASLDB.getReservations() || []).filter(function (r) { return r.type === 'lld' && r.status !== 'cancelled'; }); }
    catch (e) { return []; }
  }
  function llFind(id) { return lldList().filter(function (x) { return String(x.id) === String(id); })[0]; }
  function llD(iso) { return new Date(String(iso || '').slice(0, 10) + 'T00:00:00'); }
  function llDays(a, b) { return Math.round((llD(b) - llD(a)) / 86400000); }
  function llISO(d) { return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); }
  function llAddMonths(iso, n) { var d = llD(iso), day = d.getDate(); d.setDate(1); d.setMonth(d.getMonth() + n); var last = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate(); d.setDate(Math.min(day, last)); return llISO(d); }
  function llAddDays(iso, n) { var d = llD(iso); d.setDate(d.getDate() + n); return llISO(d); }
  /* Nombre de mois entamés entre deux dates (calendrier réel). */
  function llMonthsBetween(a, b) { var n = 0; while (n < 600 && llAddMonths(a, n + 1) <= b) n++; return n + (llAddMonths(a, n) < b ? 1 : 0); }
  var LL_PER = { month: ['Par mois', 'mois', 'mensualité'], '15d': ['Par 15 jours', '15 jours', 'échéance'], total: ['Montant total', 'total', 'versement'] };
  /* Échéancier d'un contrat : période, nombre d'échéances, montant par échéance. */
  function llPlan(c) {
    var start = c.startDate || todayISO(), end = c.endDate || start;
    var span = Math.max(1, llDays(start, end)), months = Math.max(1, llMonthsBetween(start, end));
    var p = LL_PER[c.lldPeriod] ? c.lldPeriod : 'month';
    var total = Number(c.amount) || 0;
    var n = p === '15d' ? Math.max(1, Math.ceil(span / 15)) : p === 'month' ? months : 1;
    var rate = Number(c.lldRate) > 0 ? Number(c.lldRate) : (p === 'total' ? total : total / n);
    return { p: p, n: n, rate: rate, span: span, months: months, monthly: p === '15d' ? rate * 2 : (p === 'month' ? rate : total / months) };
  }
  function llCalc(c) {
    var journal = (typeof aslPaymentJournal === 'function') ? aslPaymentJournal(c) : (c.payments || []).map(function (p, i) { var q = Object.assign({}, p); q._i = i; return q; });
    var paid = journal.reduce(function (s, p) { return s + (Number(p.amount) || 0); }, 0);
    var total = Number(c.amount) || 0, rest = Math.max(0, total - paid);
    var pl = llPlan(c), t = todayISO(), start = c.startDate || t, end = c.endDate || start;
    var closed = c.status === 'completed';
    var done = Math.max(0, Math.min(pl.span, llDays(start, t)));
    var left = closed ? 0 : Math.max(0, llDays(t, end));
    var started = t >= start;
    var monthNo = started ? Math.min(pl.months, llMonthsBetween(start, t < end ? llAddDays(t, 1) : end)) : 0;
    var no = !started ? 0 : pl.p === '15d' ? Math.min(pl.n, Math.floor(done / 15) + 1) : pl.p === 'month' ? Math.max(1, monthNo) : 0;
    var expected = closed ? total : (pl.p === 'total' ? 0 : Math.min(total, no * pl.rate));
    var late = Math.max(0, Math.round((expected - paid) * 100) / 100);
    return { journal: journal, paid: paid, total: total, rest: rest, plan: pl, closed: closed, left: left, no: no, monthNo: Math.max(started ? 1 : 0, monthNo),
      expected: expected, late: late, timePct: Math.round(done / pl.span * 100), payPct: total > 0 ? Math.round(Math.min(1, paid / total) * 100) : 0 };
  }
  function llFD(iso) { var M = ['janv.', 'févr.', 'mars', 'avr.', 'mai', 'juin', 'juil.', 'août', 'sept.', 'oct.', 'nov.', 'déc.']; if (!iso) return '—'; var d = llD(iso); return d.getDate() + ' ' + M[d.getMonth()] + ' ' + d.getFullYear(); }
  function llTimeLine(c, k) {
    if (k.closed) return 'Contrat clôturé';
    if (!k.no && !k.monthNo) return 'Commence le ' + llFD(c.startDate);
    return k.plan.p === '15d' ? 'Échéance ' + k.no + ' sur ' + k.plan.n : 'Mois ' + k.monthNo + ' sur ' + k.plan.months;
  }

  function renderLLDM() {
    var host = document.getElementById('ma-lld');
    if (!host) return;
    if (LL.view === 'fiche' || LL.view === 'edit') {
      var c = llFind(LL.id);
      if (c) { if (LL.view === 'edit') llRenderEdit(host, c); else llRenderFiche(host, c); return; }
      LL.view = 'list'; LL.id = null; host.innerHTML = '';
    }
    maSetTitle('Location longue durée');
    if (!document.getElementById('ma-ll-q')) {
      host.innerHTML = '<div id="ma-ll-sum"></div>'
        + '<button type="button" class="mu-go ll-new" onclick="maNewLLD()">' + ic('plus') + ' Nouveau contrat longue durée</button>'
        + '<label class="mu-search">' + ic('search') + '<span class="mu-sr">Rechercher un contrat</span>'
        + '<input id="ma-ll-q" type="search" value="' + esc(LL.q) + '" placeholder="Client, voiture, plaque, contrat…" autocomplete="off" oninput="maLLQ(this.value)">'
        + '<button type="button" class="mu-clear" id="ma-ll-clear" aria-label="Effacer la recherche" onclick="maLLQ(\'\',1)"' + (LL.q ? '' : ' style="display:none;"') + '>' + ic('x') + '</button></label>'
        + '<div class="mu-chips wrap" id="ma-ll-chips"></div>'
        + '<div id="ma-ll-list"></div>';
    }
    llRenderList();
  }
  function llRenderList() {
    var box = document.getElementById('ma-ll-list'); if (!box) return;
    var all = lldList().map(function (c) { return { c: c, k: llCalc(c) }; });
    var open = all.filter(function (x) { return !x.k.closed; });
    var nLate = open.filter(function (x) { return x.k.late > 0; }).length, nSoon = open.filter(function (x) { return x.k.left <= 45; }).length;
    var sum = document.getElementById('ma-ll-sum');
    if (sum) sum.innerHTML = '<div class="mu-total"><div class="mu-lbl">Reste à encaisser</div><div class="mu-big">' + money(all.reduce(function (s, x) { return s + x.k.rest; }, 0)) + '</div>'
      + '<div class="mu-line">' + open.length + ' contrat' + (open.length > 1 ? 's' : '') + ' actif' + (open.length > 1 ? 's' : '') + ' · ' + nLate + ' en retard de paiement</div></div>';
    var chips = document.getElementById('ma-ll-chips');
    if (chips) chips.innerHTML = [['all', 'Tous · ' + all.length], ['late', 'Retard de paiement · ' + nLate], ['soon', 'Se terminent bientôt · ' + nSoon]].map(function (c) {
      return '<button type="button" class="mu-chip' + (LL.filter === c[0] ? ' on' : '') + '" onclick="maLLFilter(\'' + c[0] + '\')">' + c[1] + '</button>';
    }).join('');
    if (!all.length) { box.innerHTML = '<div class="mu-none"><b>Aucun contrat de location longue durée</b><div>Touchez « Nouveau contrat longue durée » pour commencer.</div></div>'; return; }
    var q = LL.q.trim().toLowerCase(), qd = q.replace(/\D/g, '');
    var shown = all.filter(function (x) {
      if (LL.filter === 'late' && !(x.k.late > 0 && !x.k.closed)) return false;
      if (LL.filter === 'soon' && (x.k.closed || x.k.left > 45)) return false;
      if (!q) return true;
      var c = x.c, sl = (typeof subLeaseNameFor === 'function') ? String(subLeaseNameFor(c) || '').replace(/<[^>]*>/g, '') : '';
      return [c.client, c.car, c.assignedPlate, c.contractRef, c.id, sl, (typeof aslVehLabel === 'function' ? aslVehLabel(c) : '')].join(' ').toLowerCase().indexOf(q) >= 0
        || (qd.length >= 3 && muPhoneForms(c.phone).indexOf(qd) >= 0);
    }).sort(function (a, b) { return (a.k.closed - b.k.closed) || ((b.k.late > 0) - (a.k.late > 0)) || (a.k.left - b.k.left); });
    box.innerHTML = (q ? '<div class="mu-sec">' + shown.length + ' résultat' + (shown.length > 1 ? 's' : '') + '</div>' : '')
      + (shown.length ? shown.map(function (x) {
        var c = x.c, k = x.k;
        var p = k.closed ? ['done', 'Clôturé'] : k.late > 0 ? ['late', 'Retard ' + money(k.late)] : k.rest > 0 ? ['ok', 'À jour'] : ['ok', 'Soldé'];
        return '<button type="button" class="mu-client ll-card" data-id="' + esc(String(c.id)) + '" onclick="maLLOpen(this.dataset.id)">'
          + '<span class="mu-row"><span class="ll-ico">' + ic('calendar') + '</span><span class="mu-who"><b>' + esc(c.client || 'Client') + '</b><small>' + esc((typeof aslVehLabel === 'function') ? aslVehLabel(c) : (c.car || '')) + '</small></span><span class="mu-pill ' + p[0] + '">' + esc(p[1]) + '</span></span>'
          + '<span class="mu-row2"><small>' + esc(llTimeLine(c, k)) + '</small><small>' + (k.closed ? 'Fin ' + esc(muDM(c.endDate)) : 'Fin ' + esc(muDM(c.endDate)) + ' · ' + k.left + ' j') + '</small></span>'
          + '<span class="mu-bar ll"><i style="width:' + (k.closed ? 100 : k.timePct) + '%"></i></span>'
          + '<span class="mu-row2"><small>Payé ' + money(k.paid).replace(' MAD', '') + ' / ' + money(k.total) + '</small><b class="' + (k.rest > 0 ? 'red' : 'ok') + '">' + (k.rest > 0 ? 'Reste ' + money(k.rest) : 'Soldé ✓') + '</b></span>'
          + '<span class="mu-bar"><i style="width:' + k.payPct + '%"></i></span>'
          + '</button>';
      }).join('') : '<div class="mu-none"><b>Aucun contrat trouvé</b><div>' + (q ? 'Aucun contrat ne correspond à « ' + esc(LL.q.trim()) + ' ».' : 'Aucun contrat dans ce filtre.') + '</div></div>');
  }
  window.maRenderLLDList = function () { llRenderList(); };
  window.maLLQ = function (v, clear) {
    LL.q = v || '';
    var c = document.getElementById('ma-ll-clear'); if (c) c.style.display = LL.q ? '' : 'none';
    if (clear) { var i = document.getElementById('ma-ll-q'); if (i) { i.value = ''; i.focus(); } }
    llRenderList();
  };
  window.maLLFilter = function (f) { LL.filter = f; llRenderList(); };
  window.maLLOpen = function (id) {
    var host = document.getElementById('ma-lld'); if (host) host.innerHTML = '';
    LL.view = 'fiche'; LL.id = id; LL.e = null;
    renderLLDM(); maTop();
  };
  /* Ouvre la fiche d'un contrat depuis n'importe quel écran. */
  window.maOpenLLD = function (id) { closeSheet(); LL.keep = true; LL.view = 'fiche'; LL.id = id; LL.e = null; maGo('lld'); };
  window.maLLDFiche = window.maOpenLLD;
  window.maLLBack = function () {
    var host = document.getElementById('ma-lld'); if (host) host.innerHTML = '';
    if (LL.view === 'edit') { LL.view = 'fiche'; LL.e = null; }
    else { LL.view = 'list'; LL.id = null; }
    renderLLDM(); maTop();
  };

  function llRenderFiche(host, c) {
    maSetTitle(c.client || 'Contrat LLD');
    var k = llCalc(c), pl = k.plan;
    var sl = (typeof subLeaseNameFor === 'function') ? String(subLeaseNameFor(c) || '').replace(/<[^>]*>/g, '') : '';
    var phone = c.phone || '', tel = String(phone).replace(/[^+0-9]/g, ''), wa = slDigits(phone);
    var plate = (typeof aslVehPlateColor === 'function') ? aslVehPlateColor(c) : (c.assignedPlate || '');
    var expect = k.closed
      ? (k.rest > 0 ? ['warn', 'Contrat clôturé — reste à encaisser : ' + money(k.rest)] : ['ok', 'Contrat clôturé et entièrement payé ✓'])
      : pl.p === 'total' ? (k.rest > 0 ? ['info', 'Paiement libre : pas d\'échéance fixe'] : ['ok', 'Contrat entièrement payé ✓'])
      : k.late > 0 ? ['warn', 'Attendu à ce jour : ' + money(k.expected) + ' — en retard de ' + money(k.late)]
      : (k.rest > 0 ? ['ok', 'À jour : les ' + (pl.p === '15d' ? 'échéances' : 'mensualités') + ' échues sont payées ✓'] : ['ok', 'Contrat entièrement payé ✓']);
    // Documents du client (même source que la fiche Clients / l'Historique)
    var key = mhKey(c), same = (ASLDB.getReservations() || []).filter(function (x) { return x && x.status !== 'cancelled' && mhKey(x) === key; });
    var gd = { permis: [], identite: [], identiteType: '' };
    try { if (typeof aslGatherCustomerDocs === 'function') gd = aslGatherCustomerDocs(key, same, { names: [c.client], phone: phone, email: c.email || '' }) || gd; } catch (e0) {}
    var idLabel = /pass/i.test(gd.identiteType || '') ? 'Passeport' : "Carte d'identité (CIN)";
    HF.docs = { permis: (gd.permis || []).map(function (d) { return d.url; }), identite: (gd.identite || []).map(function (d) { return d.url; }) };
    var DOCS = [['permis', 'Permis de conduire'], ['identite', idLabel]];
    var missing = DOCS.filter(function (d) { return !HF.docs[d[0]].length; });
    var tiles = DOCS.map(function (d) {
      var list = HF.docs[d[0]];
      if (!list.length) return '<div class="mh-doc miss"><span class="mh-doc-alert">' + ic('alert') + '</span><b>' + esc(d[1]) + '</b><span class="mh-miss">Manquant</span><small>À demander au client</small></div>';
      return '<button type="button" class="mh-doc" onclick="maHistDoc(\'' + d[0] + '\',0)" aria-label="Voir ' + esc(d[1]) + '"><span class="mh-doc-img"><img alt=""' + (typeof aslDocImgAttrs === 'function' ? aslDocImgAttrs(list[0]) : ' src="' + esc(list[0]) + '"') + '>' + (list.length > 1 ? '<em>' + list.length + ' pages</em>' : '') + '</span><b>' + esc(d[1]) + '</b><span class="mh-ok">✓ Enregistré · Voir</span></button>';
    }).join('');
    var pays = k.journal.slice().sort(function (a, b) { return String(b.date || '').localeCompare(String(a.date || '')); });
    var idS = esc(String(c.id));
    host.innerHTML = (sl ? '<div class="mu-slbox"><small>Sous-location</small><b>' + esc(sl) + '</b></div>' : '')
      + '<div class="mu-hero">'
      + '<div><div class="mu-lbl">Reste à payer</div><div class="mu-big' + (k.rest > 0 ? '' : ' ok') + '">' + (k.rest > 0 ? money(k.rest) : 'Soldé ✓') + '</div></div>'
      + '<div class="mu-3"><div><small>Total contrat</small><b>' + money(k.total) + '</b></div><div><small>Payé</small><b class="ok">' + money(k.paid) + '</b></div><div><small>' + (pl.p === '15d' ? 'Par 15 jours' : pl.p === 'month' ? 'Par mois' : 'Soit par mois') + '</small><b>' + money(pl.p === 'total' ? pl.monthly : pl.rate) + '</b></div></div>'
      + '<div class="ll-expect ' + expect[0] + '">' + esc(expect[1]) + '</div>'
      + (k.rest > 0 ? '<button type="button" class="mu-go" onclick="maLLPay(\'' + idS + '\')">' + ic('plus') + ' Ajouter un versement</button>' : '')
      + '</div>'
      + '<div class="mu-sec">Durée du contrat</div>'
      + '<div class="mh-card"><div class="mh-2"><div class="mh-when"><small>Début</small><b>' + esc(llFD(c.startDate)) + '</b></div><div class="mh-when"><small>Fin</small><b>' + esc(llFD(c.endDate)) + '</b>' + (c.earlyOrCancelled && c.plannedEndDate ? '<span>Prévue le ' + esc(muDM(c.plannedEndDate)) + '</span>' : '') + '</div></div>'
      + '<span class="mu-bar big ll"><i style="width:' + (k.closed ? 100 : k.timePct) + '%"></i></span>'
      + '<div class="mh-dur"><span>' + esc(llTimeLine(c, k)) + '</span><span>' + (k.closed ? '' : k.left + ' jour' + (k.left > 1 ? 's' : '') + ' restant' + (k.left > 1 ? 's' : '')) + '</span></div></div>'
      + '<div class="mu-sec">Véhicule et client</div>'
      + '<div class="mh-card"><div class="mh-top"><span class="mh-car">' + ic('car') + '</span><span class="mh-who"><b>' + esc(c.car || 'Véhicule') + '</b><small>' + esc((plate ? plate + ' · ' : '') + 'Contrat ' + (c.contractRef || c.id || '')) + '</small></span></div>'
      + '<div class="mh-top ll-cl"><span class="mu-ava">' + esc(String(c.client || '?').charAt(0).toUpperCase()) + '</span><span class="mh-who"><b>' + esc(c.client || 'Client') + '</b><small>' + esc(phone || 'Pas de téléphone') + '</small></span></div>'
      + (tel || wa ? '<div class="mu-2">' + (tel ? '<a class="mu-call" href="tel:' + esc(tel) + '">' + ic('phone') + ' Appeler</a>' : '<span></span>') + (wa ? '<a class="mu-wa" href="https://wa.me/' + esc(wa) + '" target="_blank" rel="noopener">' + ic('phone') + ' WhatsApp</a>' : '') + '</div>' : '')
      + '</div>'
      + '<div class="mh-sechead"><span class="mu-sec">Documents du client</span><span class="mh-pill ' + (missing.length ? 'late' : 'done') + '">' + (missing.length ? missing.length + ' manquant' + (missing.length > 1 ? 's' : '') : '✓ Complet') + '</span></div>'
      + '<div class="mh-docs">' + tiles + '</div>'
      + '<div class="mu-sec">Versements · ' + pays.length + '</div>'
      + '<div class="mh-card ll-pays">' + (pays.length ? pays.map(function (p) {
        return '<div class="ll-pay"><i></i><span><b>+' + money(p.amount) + '</b><small>' + esc(llFD(p.date) + ' · ' + (p.mode || '—') + (p.collectedBy ? ' · ' + p.collectedBy : '') + (p.comment ? ' · ' + p.comment : '')) + '</small></span>'
          + '<button type="button" aria-label="Supprimer ce versement" onclick="maLLDelPay(\'' + idS + '\',' + p._i + ')">' + ic('x') + '</button></div>';
      }).join('') : '<div class="mu-jn">Aucun versement enregistré.</div>') + '</div>'
      + '<button type="button" class="sl-btn ll-editbtn" onclick="maLLEdit(\'' + idS + '\')">' + (k.closed ? 'Modifier ou supprimer le contrat' : 'Modifier, prolonger ou clôturer le contrat') + '</button>';
    try { if (typeof aslDocHydrate === 'function') aslDocHydrate(host); } catch (e1) {}
  }
  window.maLLPay = function (id) {
    var c = llFind(id); if (!c) return;
    var k = llCalc(c), pl = k.plan;
    var quick = pl.p === 'total' ? [] : [{ label: '1 ' + LL_PER[pl.p][2] + ' · ' + money(Math.min(pl.rate, k.rest)), amount: pl.rate }];
    if (k.late > 0 && Math.abs(k.late - pl.rate) > 0.5 && k.late < k.rest) quick.push({ label: 'Le retard · ' + money(k.late), amount: k.late });
    mpOpen(c, { title: 'Ajouter un versement', dueLabel: 'Reste à payer', due: k.rest, amount: Math.round(Math.min(k.rest, pl.p === 'total' ? k.rest : pl.rate) * 100) / 100, quick: quick, dated: true, lld: true,
      who: (c.client || 'Client') + ' · ' + (c.car || '') + ' · ' + (c.contractRef || c.id || ''), after: renderLLDM });
  };
  /* Supprime un versement précis (erreur de saisie) — même logique que l'ordinateur. */
  window.maLLDelPay = function (id, idx) {
    var c = llFind(id); if (!c) return;
    var journal = (typeof aslPaymentJournal === 'function') ? aslPaymentJournal(c) : [];
    var p = journal.filter(function (x) { return x._i === idx; })[0];
    if (!p) return;
    maConfirm('Supprimer ce versement ?', money(p.amount) + ' du ' + llFD(p.date) + ' — le montant sera de nouveau dû.', 'Supprimer', function () {
      var c2 = llFind(id); if (!c2) return;
      var jl = aslPaymentJournal(c2);
      var pos = -1; jl.forEach(function (x, i) { if (x._i === idx) pos = i; });
      if (pos < 0) return;
      jl.splice(pos, 1);
      var payments = (typeof aslJournalClean === 'function') ? aslJournalClean(jl) : jl;
      var newPaid = payments.reduce(function (s, x) { return s + (Number(x.amount) || 0); }, 0);
      ASLDB.updateReservation(c2.id, { payments: payments, paid: newPaid, paymentStatus: newPaid <= 0 ? 'Non payé' : (newPaid >= (Number(c2.amount) || 0) ? 'Paiement complet' : 'Paiement partiel') });
      try { if (typeof reloadData === 'function') reloadData(); } catch (e) {}
      if (typeof showToast === 'function') showToast('Versement supprimé ✓');
      renderLLDM();
    });
  };

  /* ---- Modifier / prolonger / clôturer / supprimer ---- */
  window.maLLEdit = function (id) {
    var c = llFind(id); if (!c) return;
    LL.e = { phone: c.phone || '', start: c.startDate || '', end: c.endDate || '', total: String(Number(c.amount) || 0), added: '' };
    LL.view = 'edit'; LL.id = c.id;
    var host = document.getElementById('ma-lld'); if (host) { host.innerHTML = ''; llRenderEdit(host, c, true); }
    maTop();
  };
  function llRenderEdit(host, c, force) {
    maSetTitle('Modifier le contrat');
    if (!LL.e) { LL.view = 'fiche'; llRenderFiche(host, c); return; }
    if (!force && document.getElementById('ll-edit')) return; // saisie en cours
    var e = LL.e, k = llCalc(c), pl = k.plan;
    var ext = pl.p === '15d' ? [['15d', '+ 15 jours'], ['1', '+ 1 mois'], ['3', '+ 3 mois']] : [['1', '+ 1 mois'], ['3', '+ 3 mois'], ['6', '+ 6 mois']];
    var fld = function (k2, label, type, extra) { return '<label class="sl-field"><span>' + label + '</span><input type="' + type + '" value="' + esc(e[k2]) + '" ' + (extra || '') + ' oninput="maLLE(\'' + k2 + '\',this.value)"></label>'; };
    host.innerHTML = '<div id="ll-edit" class="sl-form">'
      + '<div class="ll-edhead"><b>' + esc(c.client || '') + '</b><small>' + esc((c.car || '') + ' · Contrat ' + (c.contractRef || c.id || '')) + '</small></div>'
      + fld('phone', 'Téléphone du client', 'tel', 'inputmode="tel"')
      + '<div class="mu-2">' + fld('start', 'Début', 'date') + fld('end', 'Fin', 'date') + '</div>'
      + (k.closed ? '' : '<div class="mu-sec">Prolonger</div><div class="mu-chips wrap">' + ext.map(function (x) { return '<button type="button" class="mu-chip" onclick="maLLExtend(\'' + x[0] + '\')">' + x[1] + '</button>'; }).join('') + '</div>'
        + '<div class="mu-jn">La date de fin recule et le montant total augmente d\'autant ' + (pl.p === '15d' ? 'd\'échéances de 15 jours' : 'de mensualités') + '.</div>')
      + fld('total', 'Montant total du contrat (MAD)', 'number', 'inputmode="decimal" class="ll-big"')
      + '<div class="ll-info" id="ll-info">' + esc(llEditInfo(c)) + '</div>'
      + '<div class="mu-sec">Fin du contrat</div>'
      + (k.closed ? '' : '<button type="button" class="ll-close" onclick="maLLClose(\'' + esc(String(c.id)) + '\')">Clôturer le contrat — véhicule rendu</button>')
      + '<button type="button" class="ll-del" onclick="maLLDelete(\'' + esc(String(c.id)) + '\')">Supprimer le contrat (erreur de saisie)</button>'
      + '<button type="button" class="mu-go" onclick="maLLSave()">Enregistrer les modifications</button>'
      + '</div>';
  }
  function llEditInfo(c) {
    var e = LL.e, k = llCalc(c), pl = k.plan;
    return (e.added ? 'Prolongé de ' + e.added + ' → fin le ' + llFD(e.end) : 'Fin le ' + llFD(e.end)) + ' · ' + (pl.p === 'total' ? 'paiement libre' : LL_PER[pl.p][2] + ' ' + money(pl.rate));
  }
  window.maLLE = function (k2, v) {
    if (!LL.e) return; LL.e[k2] = v;
    var c = llFind(LL.id), info = document.getElementById('ll-info');
    if (c && info && (k2 === 'end' || k2 === 'start')) info.textContent = llEditInfo(c);
  };
  window.maLLExtend = function (n) {
    var c = llFind(LL.id); if (!c || !LL.e) return;
    var pl = llCalc(c).plan, e = LL.e, base = e.end || c.endDate, addTotal;
    if (n === '15d') { e.end = llAddDays(base, 15); addTotal = pl.rate; }
    else {
      var m = parseInt(n, 10);
      var newEnd = llAddMonths(base, m);
      addTotal = pl.p === '15d' ? pl.rate * m * 2 : pl.p === 'month' ? pl.rate * m : pl.monthly * m;
      e.end = newEnd;
    }
    e.total = String(Math.round(((parseFloat(e.total) || 0) + addTotal) * 100) / 100);
    // Libellé « Prolongé de … » depuis la fin d'origine du contrat
    var from = c.endDate, tot = Math.max(0, llDays(from, e.end)), mm = 0;
    while (mm < 120 && llAddMonths(from, mm + 1) <= e.end) mm++;
    var restD = llDays(llAddMonths(from, mm), e.end);
    e.added = mm ? mm + ' mois' + (restD ? ' et ' + restD + ' jours' : '') : tot + ' jours';
    var host = document.getElementById('ma-lld'); if (host) llRenderEdit(host, c, true);
  };
  window.maLLSave = function () {
    var c = llFind(LL.id), e = LL.e; if (!c || !e) return;
    if (!e.start || !e.end || e.end <= e.start) { if (typeof showToast === 'function') showToast('Vérifiez les dates (la fin doit être après le début)'); return; }
    var amount = parseFloat(String(e.total).replace(',', '.'));
    if (isNaN(amount) || amount < 0) amount = Number(c.amount) || 0;
    var paid = llCalc(c).paid;
    var patch = { phone: String(e.phone || '').trim(), startDate: e.start, endDate: e.end, days: Math.max(1, llDays(e.start, e.end)), amount: amount,
      paymentStatus: paid <= 0 ? 'Non payé' : (paid >= amount ? 'Paiement complet' : 'Paiement partiel') };
    ASLDB.updateReservation(c.id, patch);
    try { if (typeof reloadData === 'function') reloadData(); } catch (e1) {}
    if (typeof showToast === 'function') showToast('Contrat mis à jour ✓');
    LL.e = null; LL.view = 'fiche';
    var host = document.getElementById('ma-lld'); if (host) host.innerHTML = '';
    renderLLDM(); maTop();
  };
  window.maLLClose = function (id) {
    maConfirm('Clôturer le contrat ?', 'Le véhicule redevient disponible à la location. Le reste à payer reste suivi dans Impayés.', 'Clôturer', function () {
      var c = llFind(id); if (!c) return;
      try { if (c.carId != null && c.assignedPlate && typeof ASLDB.releaseUnit === 'function') ASLDB.releaseUnit(c.carId, c.assignedPlate); } catch (e0) {}
      var now = new Date(), t = todayISO();
      var patch = { status: 'completed' };
      if (c.endDate && t < c.endDate) {
        patch.endDate = t; patch.endTime = (ASLDB.localTimeHM ? ASLDB.localTimeHM(now) : String(now.getHours()).padStart(2, '0') + ':' + String(now.getMinutes()).padStart(2, '0'));
        patch.plannedEndDate = c.plannedEndDate || c.endDate; patch.plannedEndTime = c.plannedEndTime || c.endTime || ''; patch.earlyOrCancelled = true;
        patch.days = Math.max(1, llDays(c.startDate, t));
      }
      ASLDB.updateReservation(c.id, patch);
      try { if (typeof reloadData === 'function') reloadData(); } catch (e1) {}
      if (typeof showToast === 'function') showToast('Contrat clôturé — véhicule disponible ✓');
      LL.e = null; LL.view = 'fiche';
      var host = document.getElementById('ma-lld'); if (host) host.innerHTML = '';
      renderLLDM(); maTop();
    });
  };
  window.maLLDelete = function (id) {
    maConfirm('Supprimer le contrat ?', 'À utiliser seulement pour une erreur de saisie : le contrat et ses versements disparaissent, le véhicule redevient disponible.', 'Supprimer', function () {
      var c = llFind(id); if (!c) return;
      try { if (c.status !== 'completed' && c.carId != null && c.assignedPlate && typeof ASLDB.releaseUnit === 'function') ASLDB.releaseUnit(c.carId, c.assignedPlate); } catch (e0) {}
      if (ASLDB.deleteReservation) ASLDB.deleteReservation(c.id);
      try { if (typeof reloadData === 'function') reloadData(); } catch (e1) {}
      if (typeof showToast === 'function') showToast('Contrat supprimé — véhicule de nouveau disponible ✓');
      LL.e = null; LL.view = 'list'; LL.id = null;
      var host = document.getElementById('ma-lld'); if (host) host.innerHTML = '';
      renderLLDM(); maTop();
    });
  };
  window.maNewLLD = function () { closeSheet(); wzOpen('lld', 'direct'); };
  window.maLLDPay = function (id) { window.maLLPay(id); };

  /* Fenêtre de confirmation dans l'application (remplace confirm()). */
  window.maConfirm = maConfirm;
  function maConfirm(title, text, okLabel, fn) {
    var old = document.getElementById('ma-confirm'); if (old) old.remove();
    var d = document.createElement('div'); d.id = 'ma-confirm'; d.className = 'ma-confirm';
    d.innerHTML = '<div class="ma-confirm-box" role="alertdialog" aria-modal="true"><b>' + esc(title) + '</b><span>' + esc(text) + '</span>'
      + '<div class="mu-2"><button type="button" class="sl-btn" data-a="0">Annuler</button><button type="button" class="mu-pay" data-a="1">' + esc(okLabel || 'Confirmer') + '</button></div></div>';
    d.onclick = function (ev) {
      var a = ev.target && ev.target.getAttribute && ev.target.getAttribute('data-a');
      if (ev.target === d || a === '0') { d.remove(); return; }
      if (a === '1') { d.remove(); try { fn(); } catch (e) { console.error(e); } }
    };
    document.body.appendChild(d);
  }

  /* ======================================================================
     ★ ENTRETIEN — 100 % mobile (aperçu validé)
     Vue par mois : visites techniques (date connue) et vidanges à vérifier
     (suivi au kilométrage, AUCUNE date de vidange inventée : seul le rappel
     de contrôle du compteur, déjà calculé par le logiciel, est affiché).
     Fiche par voiture (par immatriculation) : date de visite technique,
     kilométrage de référence, kilométrage de la prochaine vidange, notes.
     Données et règle d'enregistrement : exactement celles de l'ordinateur
     (asl_maint_v1, clé modèle::plaque, rappel tous les 20 jours).
     ====================================================================== */
  var MT = { view: 'month', ym: '', key: null, f: null, keep: false };
  var MT_MONTHS = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'];
  var MT_MS = ['janv.', 'févr.', 'mars', 'avr.', 'mai', 'juin', 'juil.', 'août', 'sept.', 'oct.', 'nov.', 'déc.'];
  function mtKey(carId, plate) { return (typeof window.maintKey === 'function') ? window.maintKey(carId, plate) : String(carId) + '::' + (plate || '_'); }
  function mtRead() { try { return JSON.parse(localStorage.getItem('asl_maint_v1') || '{}') || {}; } catch (e) { return {}; } }
  function mtUnits() {
    var out = [];
    fleet().forEach(function (c) {
      var units = (typeof ASLDB !== 'undefined' && ASLDB.normalizeUnits) ? ASLDB.normalizeUnits(c) : null;
      if (!units || !units.length) units = [{ plate: c.plate || '', color: '' }];
      units.forEach(function (u) { out.push({ car: c, plate: u.plate || '', color: u.color || '', key: mtKey(c.id, u.plate || '') }); });
    });
    return out;
  }
  function mtToday() { var d = new Date(); d.setHours(0, 0, 0, 0); return d; }
  function mtDiff(iso) { if (!iso) return null; var d = new Date(String(iso).slice(0, 10) + 'T00:00:00'); if (isNaN(d)) return null; return Math.round((d - mtToday()) / 86400000); }
  function mtFD(iso) { if (!iso) return '—'; var d = new Date(String(iso).slice(0, 10) + 'T00:00:00'); return d.getDate() + ' ' + MT_MONTHS[d.getMonth()] + ' ' + d.getFullYear(); }
  function mtFDs(iso) { var d = new Date(String(iso).slice(0, 10) + 'T00:00:00'); return d.getDate() + ' ' + MT_MS[d.getMonth()]; }
  function mtKm(n) { return Number(n).toLocaleString('fr-FR').replace(/ /g, ' ') + ' km'; }
  function mtCurYM() { var d = new Date(); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0'); }
  function mtWhen(dd) {
    if (dd == null) return ['na', '—'];
    if (dd < 0) return ['off', 'En retard de ' + Math.abs(dd) + ' j'];
    if (dd === 0) return ['off', 'Aujourd\'hui'];
    return [dd <= 7 ? 'mnt' : 'ok', 'Dans ' + dd + ' j'];
  }
  function mtLbl(u) { return (u.plate || 'Sans plaque') + (u.color ? ' · ' + u.color : ''); }

  function renderMaintM() {
    var host = document.getElementById('ma-maintenance');
    if (!host) return;
    if (!MT.ym) MT.ym = mtCurYM();
    if (MT.view === 'fiche') {
      var u = mtUnits().filter(function (x) { return x.key === MT.key; })[0];
      if (u) { mtRenderFiche(host, u); return; }
      MT.view = 'month'; MT.key = null; MT.f = null; host.innerHTML = '';
    }
    maSetTitle('Entretien');
    var MAINT = mtRead(), units = mtUnits(), ym = MT.ym, isCur = ym === mtCurYM(), todayMs = mtToday().getTime();
    var y = +ym.slice(0, 4), mo = +ym.slice(5, 7);
    // Visites techniques : date connue
    var vts = units.map(function (u) { return { u: u, m: MAINT[u.key] || {} }; })
      .filter(function (x) { return x.m.vt_next && String(x.m.vt_next).slice(0, 7) === ym; })
      .sort(function (a, b) { return String(a.m.vt_next).localeCompare(String(b.m.vt_next)); });
    // Vidanges : suivi au kilométrage (rappel de contrôle du compteur dans ce mois, ou en retard si mois en cours)
    var vids = [];
    units.forEach(function (u) {
      var m = MAINT[u.key] || {};
      var hasKm = !!(m.km_vidange_next || m.km_current);
      if (!hasKm) { if (isCur) vids.push({ u: u, m: m, todo: true }); return; }
      if (!m.km_vidange_next || !m.reminder_next) return;
      var rIso = String(m.reminder_next).slice(0, 10);
      var due = new Date(rIso + 'T00:00:00').getTime() <= todayMs;
      if (rIso.slice(0, 7) === ym || (isCur && due)) vids.push({ u: u, m: m, due: due, rIso: rIso });
    });
    vids.sort(function (a, b) { return (b.due ? 1 : 0) - (a.due ? 1 : 0) || (a.todo ? 1 : 0) - (b.todo ? 1 : 0) || String(a.rIso || '').localeCompare(String(b.rIso || '')); });
    var nVid = vids.filter(function (x) { return !x.todo; }).length, nTodo = vids.length - nVid;
    var row = function (x, inner, right) { return '<button type="button" class="mt-ev" data-k="' + esc(x.u.key) + '" onclick="maMaintOpen(this.dataset.k)">' + inner + (right || '') + '</button>'; };
    var gauge = '<span class="mt-kbox">' + ic('gauge') + '</span>';
    var html = '<div class="mt-mon"><button type="button" aria-label="Mois précédent" onclick="maMaintMonth(-1)">‹</button><div><b>' + esc(MT_MONTHS[mo - 1].charAt(0).toUpperCase() + MT_MONTHS[mo - 1].slice(1) + ' ' + y) + '</b><small>'
      + vts.length + ' visite' + (vts.length > 1 ? 's' : '') + ' technique' + (vts.length > 1 ? 's' : '') + ' · ' + nVid + ' vidange' + (nVid > 1 ? 's' : '') + ' à vérifier</small></div>'
      + '<button type="button" aria-label="Mois suivant" onclick="maMaintMonth(1)">›</button></div>'
      + (isCur ? '' : '<button type="button" class="sl-link mt-today" onclick="maMaintMonth(0)">Revenir au mois en cours</button>')
      + '<div class="mt-shead"><span class="mu-sec">Visites techniques</span><span class="mt-badge vt">Date connue</span></div>'
      + (vts.length ? vts.map(function (x) {
        var w = mtWhen(mtDiff(x.m.vt_next)), d = new Date(String(x.m.vt_next).slice(0, 10) + 'T00:00:00');
        return row(x, '<span class="mt-dbox"><b>' + d.getDate() + '</b><small>' + MT_MS[d.getMonth()] + '</small></span><span class="mt-t"><b>' + esc(x.u.car.name || '') + '</b><small>' + esc(mtLbl(x.u)) + '</small></span>', '<span class="vh-pill ' + w[0] + '">' + w[1] + '</span>');
      }).join('') : '<div class="mt-none">Aucune visite technique ce mois-ci.</div>')
      + '<div class="mt-shead"><span class="mu-sec">Vidanges à vérifier</span><span class="mt-badge km">Suivi au kilométrage</span></div>'
      + '<div class="mt-note">Pas de date fixe : la vidange dépend du compteur. Relevez le kilométrage de ces voitures' + (isCur ? ' ce mois-ci.' : ' en ' + MT_MONTHS[mo - 1] + '.') + '</div>'
      + (vids.length ? vids.map(function (x) {
        if (x.todo) return row(x, '<span class="mt-kbox na">' + ic('gauge') + '</span><span class="mt-t"><b>' + esc(x.u.car.name || '') + '</b><small>' + esc(mtLbl(x.u)) + '</small><span class="mt-km mt-muted">Kilométrage non renseigné</span></span>', '<span class="vh-pill na">À compléter</span>');
        var m = x.m, rest = (m.km_vidange_next && m.km_current) ? m.km_vidange_next - m.km_current : null;
        return row(x, gauge + '<span class="mt-t"><b>' + esc(x.u.car.name || '') + '</b><small>' + esc(mtLbl(x.u)) + '</small>'
          + '<span class="mt-km">Vidange à ' + mtKm(m.km_vidange_next) + (m.km_current ? ' · relevé ' + mtKm(m.km_current) : '') + '</span>'
          + '<span class="mt-km' + (rest != null && rest <= 1000 ? ' mt-red' : '') + '">' + (rest != null ? (rest > 0 ? 'Reste ≈ ' + mtKm(rest) : 'Kilométrage de vidange atteint') : 'Dernier relevé non renseigné') + (x.due ? '' : ' · contrôle du compteur le ' + mtFDs(x.rIso)) + '</span></span>',
          x.due ? '<span class="vh-pill off">À vérifier</span>' : '');
      }).join('') : '<div class="mt-none">Aucune vidange à vérifier ce mois-ci.</div>')
      + (nTodo ? '' : '')
      + '<div class="mu-sec">Toute la flotte · ' + units.length + ' voiture' + (units.length > 1 ? 's' : '') + '</div>'
      + units.map(function (u) {
        var m = MAINT[u.key] || {}, dd = mtDiff(m.vt_next);
        var vt = m.vt_next ? '<span class="' + (dd < 0 || dd <= 7 ? (dd < 0 ? 'mt-red' : 'mt-amber') : 'mt-green') + '">VT ' + esc(String(m.vt_next).slice(8, 10) + '/' + String(m.vt_next).slice(5, 7) + '/' + String(m.vt_next).slice(0, 4)) + '</span>' : '<span class="mt-muted">VT non renseignée</span>';
        var vid = m.km_vidange_next ? '<span>Vidange ' + mtKm(m.km_vidange_next) + '</span>' : '<span class="mt-muted">Vidange non renseignée</span>';
        return '<button type="button" class="mt-frow" data-k="' + esc(u.key) + '" onclick="maMaintOpen(this.dataset.k)"><span class="mt-t"><b>' + esc(u.car.name || '') + '</b><small>' + esc(mtLbl(u)) + '</small></span><span class="mt-mini">' + vt + vid + '</span>' + ic('arrowLeft', 'mu-chev') + '</button>';
      }).join('');
    host.innerHTML = html;
  }
  window.maMaintMonth = function (d) {
    if (!d) MT.ym = mtCurYM();
    else { var y = +MT.ym.slice(0, 4), m = +MT.ym.slice(5, 7) - 1 + d; y += Math.floor(m / 12); m = ((m % 12) + 12) % 12; MT.ym = y + '-' + String(m + 1).padStart(2, '0'); }
    renderMaintM();
  };
  window.maMaintOpen = function (key) {
    var m = mtRead()[key] || {};
    MT.f = { vt: m.vt_next || '', km: m.km_current != null ? String(m.km_current) : '', next: m.km_vidange_next != null ? String(m.km_vidange_next) : '', notes: m.notes || '' };
    MT.view = 'fiche'; MT.key = key;
    var host = document.getElementById('ma-maintenance'); if (host) host.innerHTML = '';
    renderMaintM(); maTop();
  };
  /* Ouvre la fiche entretien d'une voiture depuis un autre écran (notifications…). */
  window.maOpenMaint = function (carId, plate) { closeSheet(); MT.keep = true; MT.view = 'month'; maGo('maintenance'); if (carId != null) maMaintOpen(mtKey(carId, plate)); };
  window.maMaintBack = function () {
    MT.view = 'month'; MT.key = null; MT.f = null;
    var host = document.getElementById('ma-maintenance'); if (host) host.innerHTML = '';
    renderMaintM(); maTop();
  };
  function mtRenderFiche(host, u, force) {
    maSetTitle(u.car.name || 'Entretien');
    if (!MT.f) { var m0 = mtRead()[u.key] || {}; MT.f = { vt: m0.vt_next || '', km: m0.km_current != null ? String(m0.km_current) : '', next: m0.km_vidange_next != null ? String(m0.km_vidange_next) : '', notes: m0.notes || '' }; }
    if (!force && document.getElementById('mt-fiche')) return; // saisie en cours : on ne reconstruit pas
    var f = MT.f, m = mtRead()[u.key] || {};
    var dd = mtDiff(f.vt), w = mtWhen(dd);
    var ref = parseInt(f.km, 10);
    host.innerHTML = '<div id="mt-fiche" class="mt-fiche">'
      + '<div class="mt-sub">' + esc(mtLbl(u)) + '</div>'
      + '<div class="mh-card"><div class="mt-ctitle"><span class="vt">' + ic('calendar') + '</span><b>Visite technique</b></div>'
      + '<div class="mt-big" id="mt-vt-big">' + (f.vt ? '<b>' + esc(mtFD(f.vt)) + '</b><span class="mt-' + (w[0] === 'off' ? 'red' : w[0] === 'mnt' ? 'amber' : 'green') + '">' + esc(w[1].toLowerCase()) + '</span>' : '<b class="mt-muted">Aucune date</b>') + '</div>'
      + '<label class="sl-field"><span>Date de la prochaine visite</span><input type="date" id="mt-vt" value="' + esc(f.vt) + '" onchange="maMaintF(\'vt\',this.value,1)"></label>'
      + '<div class="mu-chips wrap"><button type="button" class="mu-chip" onclick="maMaintVT(6)">+ 6 mois</button><button type="button" class="mu-chip" onclick="maMaintVT(12)">+ 1 an</button>' + (f.vt ? '<button type="button" class="mu-chip" onclick="maMaintF(\'vt\',\'\',1)">Effacer</button>' : '') + '</div>'
      + '<div class="mu-jn">« + 6 mois » et « + 1 an » partent de la date affichée (ou d\'aujourd\'hui si elle est vide).</div></div>'
      + '<div class="mh-card"><div class="mt-ctitle"><span class="km">' + ic('gauge') + '</span><b>Vidange · suivi au kilométrage</b></div>'
      + '<label class="sl-field"><span>Kilométrage de référence (dernier relevé)</span><span class="vh-inu"><input type="number" inputmode="numeric" id="mt-km" value="' + esc(f.km) + '" placeholder="ex : 42 500" oninput="maMaintF(\'km\',this.value)"><em>km</em></span></label>'
      + '<label class="sl-field"><span>Kilométrage prévu pour la prochaine vidange</span><span class="vh-inu"><input type="number" inputmode="numeric" id="mt-next" value="' + esc(f.next) + '" placeholder="ex : 52 500" oninput="maMaintF(\'next\',this.value)"><em>km</em></span></label>'
      + '<div class="mu-chips wrap">' + [5000, 7500, 10000, 15000].map(function (n) { return '<button type="button" class="mu-chip mt-kmchip' + (ref > 0 && parseInt(f.next, 10) === ref + n ? ' on' : '') + '"' + (ref > 0 ? '' : ' disabled') + ' onclick="maMaintNext(' + n + ')">+ ' + n.toLocaleString('fr-FR').replace(/ /g, ' ') + '</button>'; }).join('') + '</div>'
      + '<div class="mu-jn">' + (ref > 0 ? 'Raccourcis calculés à partir du kilométrage de référence.' : 'Saisissez le kilométrage de référence pour utiliser les raccourcis.') + '</div>'
      + '<div class="mt-kmrow" id="mt-rest">' + mtRestHTML() + '</div>'
      + '<div class="mt-note">Pas de date de vidange : un rappel de contrôle du compteur est créé tous les 20 jours' + (m.reminder_next ? ' (prochain : ' + esc(mtFDs(m.reminder_next)) + ')' : '') + '.</div></div>'
      + '<div class="mh-card"><label class="sl-field"><span>Notes d\'entretien</span><textarea rows="3" placeholder="Observations, réparations…" oninput="maMaintF(\'notes\',this.value)">' + esc(f.notes) + '</textarea></label></div>'
      + (m.updated ? '<div class="mu-jn mt-center">Dernière mise à jour : ' + esc(mtFD(String(m.updated).slice(0, 10))) + '</div>' : '')
      + '<button type="button" class="mu-go" onclick="maMaintSave()">Enregistrer</button>'
      + '</div>';
  }
  function mtRestHTML() {
    var a = parseInt(MT.f.km, 10), b = parseInt(MT.f.next, 10);
    if (!(a > 0) || !(b > 0)) return '<span>Reste avant la vidange</span><b class="mt-muted">—</b>';
    var r = b - a;
    return '<span>Reste avant la vidange</span><b' + (r <= 1000 ? ' class="mt-red"' : '') + '>' + (r > 0 ? '≈ ' + mtKm(r) : 'Atteint') + '</b>';
  }
  function mtReFiche() { var u = mtUnits().filter(function (x) { return x.key === MT.key; })[0], host = document.getElementById('ma-maintenance'); if (u && host) mtRenderFiche(host, u, true); }
  window.maMaintF = function (k, v, rerender) {
    if (!MT.f) return; MT.f[k] = v;
    if (rerender) { mtReFiche(); return; }
    if (k === 'km' || k === 'next') { var el = document.getElementById('mt-rest'); if (el) el.innerHTML = mtRestHTML(); }
    if (k === 'km') { var okRef = parseInt(v, 10) > 0; document.querySelectorAll('#mt-fiche .mt-kmchip').forEach(function (b) { b.disabled = !okRef; }); }
  };
  window.maMaintVT = function (months) {
    if (!MT.f) return;
    var base = MT.f.vt || todayISO();
    MT.f.vt = (typeof llAddMonths === 'function') ? llAddMonths(base, months) : base;
    mtReFiche();
  };
  window.maMaintNext = function (n) {
    if (!MT.f) return; var a = parseInt(MT.f.km, 10); if (!(a > 0)) return;
    MT.f.next = String(a + n); mtReFiche();
  };
  /* Enregistrement : même règle que l'ordinateur (saveMaintRecord). */
  window.maMaintSave = function () {
    var u = mtUnits().filter(function (x) { return x.key === MT.key; })[0], f = MT.f;
    if (!u || !f) return;
    var MAINT = mtRead(), prev = MAINT[u.key] || {};
    var kmNext = parseInt(f.next, 10) || null;
    var now = new Date();
    var kmChanged = (kmNext !== (prev.km_vidange_next || null));
    var reminderBase = (kmChanged || !prev.reminder_set) ? now.getTime() : (prev.reminder_set || now.getTime());
    MAINT[u.key] = {
      carId: u.car.id, plate: u.plate || '',
      km_current: parseInt(f.km, 10) || null,
      km_vidange_next: kmNext,
      vt_next: f.vt || '',
      notes: f.notes || '',
      reminder_set: kmChanged ? now.getTime() : reminderBase,
      reminder_next: new Date(reminderBase + 20 * 86400000).toISOString(),
      updated: now.toISOString()
    };
    try { localStorage.setItem('asl_maint_v1', JSON.stringify(MAINT)); } catch (e) {}
    try { if (typeof ASLDB !== 'undefined' && ASLDB.noteLocalChange) ASLDB.noteLocalChange('asl_maint_v1'); } catch (e) {}
    try { if (typeof ASLDB !== 'undefined' && ASLDB.syncNow) ASLDB.syncNow(); } catch (e) {}
    try { if (typeof renderMaintenance === 'function') renderMaintenance(); } catch (e) {}
    try { if (typeof updateBadges === 'function') updateBadges(); } catch (e) {}
    if (typeof showToast === 'function') showToast('Entretien enregistré ✓');
    // Retour à la vue du mois de la visite technique (ou au mois affiché)
    MT.f = null; MT.view = 'month'; MT.key = null;
    var host = document.getElementById('ma-maintenance'); if (host) host.innerHTML = '';
    renderMaintM(); maTop();
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

  /* ======================================================================
     ★ CAISSE — un seul écran (aperçu validé), remplace « Revenus »,
     « Encaissements réels » et le Grand Livre ouvert en version ordinateur.
     Période au choix (un mois avec son année, ou depuis le début) appliquée
     à TOUS les montants et à TOUTES les listes en même temps.
     Encaissé = paiements REÇUS pendant la période, à la date de chaque
     versement (journal des versements — mêmes données que l'ordinateur).
     Reste à encaisser = locations de la période (mois) ou de l'ensemble.
     ====================================================================== */
  var CS = { view: 'sum', mode: 'month', ym: '', who: '', keep: false };
  var CS_PEOPLE = ['Mohamed', 'Younes', 'Khalil'];
  var CS_COL = { Mohamed: ['#15803D', 'rgba(22,163,74,.12)'], Younes: ['#1D4ED8', 'rgba(29,78,216,.12)'], Khalil: ['#6D28D9', 'rgba(109,40,217,.12)'], na: ['#646B78', '#ECEDF0'] };
  var CS_M = ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin', 'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'];
  var CS_MS = ['janv.', 'févr.', 'mars', 'avr.', 'mai', 'juin', 'juil.', 'août', 'sept.', 'oct.', 'nov.', 'déc.'];
  function csCurYM() { return todayISO().slice(0, 7); }
  function csLabel() { if (CS.mode === 'all') return 'Depuis le début'; var y = CS.ym.slice(0, 4), m = +CS.ym.slice(5, 7); return CS_M[m - 1] + ' ' + y; }
  function csIn(d) { d = String(d || '').slice(0, 10); if (CS.mode === 'all') return !d || d <= todayISO(); return d.slice(0, 7) === CS.ym; }
  /* Paiements reçus (un par versement) sur la période */
  function csPayments() {
    var out = [];
    reservations().forEach(function (r) {
      if (!r || r.status === 'cancelled') return;
      var j = (typeof aslPaymentJournal === 'function') ? aslPaymentJournal(r) : ((Number(r.paid) || 0) > 0 ? [{ date: String(r.createdAt || r.startDate || '').slice(0, 10), amount: Number(r.paid) || 0, mode: r.paymentMode || '', collectedBy: r.collectedBy || '', comment: '' }] : []);
      j.forEach(function (p) {
        var amt = Number(p.amount) || 0; if (amt <= 0) return;
        var d = String(p.date || r.createdAt || r.startDate || '').slice(0, 10);
        if (!csIn(d)) return;
        var who = CS_PEOPLE.indexOf(p.collectedBy) >= 0 ? p.collectedBy : 'na';
        out.push({ r: r, date: d, amount: amt, mode: p.mode || '', who: who, comment: p.comment || '' });
      });
    });
    out.sort(function (a, b) { return b.date.localeCompare(a.date) || b.amount - a.amount; });
    return out;
  }
  function csRest() {
    return reservations().filter(function (r) {
      if (!r || r.status === 'cancelled') return false;
      if (Math.max(0, (Number(r.amount) || 0) - (Number(r.paid) || 0)) <= 0) return false;
      return CS.mode === 'all' ? true : String(r.startDate || '').slice(0, 7) === CS.ym;
    }).sort(function (a, b) { return String(b.startDate || '').localeCompare(String(a.startDate || '')); });
  }
  function csCharges() {
    var list = []; try { list = JSON.parse(localStorage.getItem('asl_charges_v1') || '[]') || []; } catch (e) {}
    return list.filter(function (c) { return c && c.status !== 'pending' && csIn(c.date); })
      .sort(function (a, b) { return String(b.date || '').localeCompare(String(a.date || '')); });
  }
  function csWhoLabel(w) { return w === 'na' ? 'Non attribué' : w === 'all' ? 'Tous les paiements' : w; }
  function csDayBox(d) { var x = new Date(String(d).slice(0, 10) + 'T00:00:00'); return isNaN(x) ? '<span class="cs-d"><b>—</b></span>' : '<span class="cs-d"><b>' + String(x.getDate()).padStart(2, '0') + '</b><small>' + CS_MS[x.getMonth()] + (CS.mode === 'all' ? ' ' + String(x.getFullYear()).slice(2) : '') + '</small></span>'; }
  function csN(n, one, many) { return n + ' ' + (n > 1 ? many : one); }
  /* Encaissé ce mois (carte du tableau de bord) : même calcul que la Caisse. */
  function csMonthTotal() {
    var save = { mode: CS.mode, ym: CS.ym }; CS.mode = 'month'; CS.ym = csCurYM();
    var t = csPayments().reduce(function (s, p) { return s + p.amount; }, 0);
    CS.mode = save.mode; CS.ym = save.ym; return t;
  }
  window.maOpenCaisseMonth = function () { CS.keep = true; CS.view = 'sum'; CS.mode = 'month'; CS.ym = csCurYM(); maGo('caisse'); };

  function renderCaisse() {
    var host = document.getElementById('ma-caisse');
    if (!host) return;
    if (!CS.ym) CS.ym = csCurYM();
    var b = document.getElementById('ma-head-back'); if (b) b.style.display = CS.view === 'sum' ? 'none' : 'flex';
    if (CS.view === 'list') { csRenderList(host); return; }
    maSetTitle('Caisse');
    var pays = csPayments(), tot = 0, by = { Mohamed: [0, 0], Younes: [0, 0], Khalil: [0, 0], na: [0, 0] };
    pays.forEach(function (p) { tot += p.amount; by[p.who][0] += p.amount; by[p.who][1]++; });
    var rest = csRest(), restSum = rest.reduce(function (s, r) { return s + Math.max(0, (Number(r.amount) || 0) - (Number(r.paid) || 0)); }, 0);
    var ch = csCharges(), chSum = ch.reduce(function (s, c) { return s + (Number(c.amount) || 0); }, 0);
    var person = function (w) {
      var c = CS_COL[w], v = by[w], pct = tot > 0 ? Math.round(v[0] / tot * 100) : 0;
      return '<button type="button" class="cs-p" onclick="maCsOpen(\'' + w + '\')"><span class="cs-av" style="background:' + c[1] + ';color:' + c[0] + '">' + (w === 'na' ? '?' : w.charAt(0)) + '</span>'
        + '<span class="cs-pt"><b>' + csWhoLabel(w) + '</b><small>' + (v[1] ? csN(v[1], 'paiement', 'paiements') : 'Aucun paiement') + (w === 'na' && v[1] ? ' sans personne' : '') + '</small><span class="cs-share"><i style="width:' + pct + '%;background:' + c[0] + '"></i></span></span>'
        + '<span class="cs-amt">' + money(v[0]).replace(' MAD', '') + '</span>' + ic('arrowLeft', 'mu-chev') + '</button>';
    };
    host.innerHTML = '<button type="button" class="cs-per" onclick="maCsPeriod()">' + ic('calendar') + '<span><small>Période</small><b>' + esc(csLabel()) + '</b></span><em>Changer ▾</em></button>'
      + '<button type="button" class="cs-tot" onclick="maCsOpen(\'all\')"><span><small>Total encaissé par l\'agence</small><b>' + money(tot) + '</b><span>' + (pays.length ? csN(pays.length, 'paiement', 'paiements') + ' · voir la liste' : 'Aucun paiement sur cette période') + '</span></span>' + ic('arrowLeft', 'mu-chev') + '</button>'
      + '<div class="mu-sec">Encaissé par</div>'
      + CS_PEOPLE.map(person).join('') + person('na')
      + '<div class="mu-sec">À encaisser</div>'
      + '<button type="button" class="cs-rest" onclick="maCsOpen(\'rest\')"><span class="cs-pt"><b>Reste à encaisser</b><small>' + (CS.mode === 'all' ? 'Tous les dossiers' : 'Locations de ' + esc(csLabel().toLowerCase())) + ' · ' + csN(rest.length, 'dossier', 'dossiers') + '</small></span><span class="cs-amt red">' + money(restSum).replace(' MAD', '') + '</span>' + ic('arrowLeft', 'mu-chev') + '</button>'
      + '<div class="mu-sec">Charges et solde · ' + esc(csLabel().toLowerCase()) + '</div>'
      + '<div class="mu-2"><button type="button" class="cs-k" onclick="maCsOpen(\'charges\')"><small>Charges payées</small><b class="red">' + money(chSum).replace(' MAD', '') + '</b><span>' + csN(ch.length, 'charge', 'charges') + ' ›</span></button>'
      + '<div class="cs-k"><small>Solde</small><b>' + money(tot - chSum).replace(' MAD', '') + '</b><span>encaissé − charges</span></div></div>'
      + '<button type="button" class="cs-p" onclick="maCsOpen(\'moves\')"><span class="cs-av sq">' + ic('ledger') + '</span><span class="cs-pt"><b>Tous les mouvements</b><small>Entrées et sorties, jour par jour (grand livre)</small></span>' + ic('arrowLeft', 'mu-chev') + '</button>';
  }

  /* ---- Listes ---- */
  window.maCsOpen = function (w) { CS.view = 'list'; CS.who = w; var h = document.getElementById('ma-caisse'); if (h) h.innerHTML = ''; renderCaisse(); maTop(); };
  window.maCsBack = function () { CS.view = 'sum'; CS.who = ''; var h = document.getElementById('ma-caisse'); if (h) h.innerHTML = ''; renderCaisse(); maTop(); };
  function csPayRow(p) {
    var r = p.r, rest = Math.max(0, (Number(r.amount) || 0) - (Number(r.paid) || 0));
    var veh = (typeof aslVehLabel === 'function') ? aslVehLabel(r) : (r.car || '');
    var kind = p.comment || '';
    return '<button type="button" class="cs-pay" data-id="' + esc(String(r.id)) + '" onclick="maCsRes(this.dataset.id)">' + csDayBox(p.date)
      + '<span class="cs-x"><b>' + esc(r.client || 'Client') + '</b><small>' + esc((r.contractRef || r.id || '') + ' · ' + veh) + '</small>'
      + '<small>' + (p.mode ? '<span class="cs-tag">' + esc(p.mode) + '</span>' : '') + (kind ? '<span class="cs-tag">' + esc(kind) + '</span>' : '') + (CS.who === 'all' ? '<span class="cs-tag ' + p.who + '">' + esc(csWhoLabel(p.who)) + '</span>' : '') + (r.type === 'lld' ? '<span class="cs-tag">Longue durée</span>' : '') + '</small>'
      + '<small class="' + (rest > 0 ? 'mt-red' : 'mt-green') + '">' + (rest > 0 ? 'Reste sur le dossier : ' + money(rest) : 'Dossier soldé') + '</small></span>'
      + '<span class="cs-a">+' + money(p.amount).replace(' MAD', '') + '</span></button>';
  }
  function csRenderList(host) {
    var w = CS.who, html = '', title = '', total = 0, count = 0, body = '';
    var chips = function () {
      return '<div class="mu-chips wrap">' + CS_PEOPLE.concat(['na', 'all']).map(function (k) { return '<button type="button" class="mu-chip' + (w === k ? ' on' : '') + '" onclick="maCsOpen(\'' + k + '\')">' + (k === 'all' ? 'Tous' : csWhoLabel(k)) + '</button>'; }).join('') + '</div>';
    };
    if (w === 'rest') {
      var rest = csRest(); title = 'Reste à encaisser';
      total = rest.reduce(function (s, r) { return s + Math.max(0, (Number(r.amount) || 0) - (Number(r.paid) || 0)); }, 0); count = rest.length;
      body = rest.map(function (r) {
        var due = Math.max(0, (Number(r.amount) || 0) - (Number(r.paid) || 0));
        return '<button type="button" class="cs-pay" data-id="' + esc(String(r.id)) + '" onclick="maCsRes(this.dataset.id)">' + csDayBox(r.startDate)
          + '<span class="cs-x"><b>' + esc(r.client || 'Client') + '</b><small>' + esc((r.contractRef || r.id || '') + ' · ' + ((typeof aslVehLabel === 'function') ? aslVehLabel(r) : (r.car || ''))) + '</small>'
          + '<small>Total ' + money(r.amount || 0) + ' · payé ' + money(r.paid || 0) + '</small></span><span class="cs-a red">' + money(due).replace(' MAD', '') + '</span></button>';
      }).join('');
      html = '<div class="cs-tot red static"><span><small>' + esc(CS.mode === 'all' ? 'Tous les dossiers' : 'Locations de ' + csLabel().toLowerCase()) + '</small><b>' + money(total) + '</b><span>' + csN(count, 'dossier', 'dossiers') + '</span></span></div>'
        + (count ? '<button type="button" class="sl-link" onclick="maGo(\'unpaid\')">Encaisser ou accorder une remise → Impayés</button>' : '');
    } else if (w === 'charges') {
      var ch = csCharges(); title = 'Charges payées';
      total = ch.reduce(function (s, c) { return s + (Number(c.amount) || 0); }, 0); count = ch.length;
      body = ch.map(function (c) {
        var veh = (typeof window.aslChargeVehicleText === 'function') ? window.aslChargeVehicleText(c) : (c.vehicle || ''); if (veh === '—') veh = '';
        return '<div class="cs-pay">' + csDayBox(c.date) + '<span class="cs-x"><b>' + esc(c.category || 'Charge') + '</b>' + (c.description ? '<small>' + esc(c.description) + '</small>' : '') + (veh ? '<small>' + esc(veh) + '</small>' : '')
          + '<small>' + (c.payMode ? '<span class="cs-tag">' + esc(c.payMode) + '</span>' : '') + (c.paidBy ? '<span class="cs-tag">Payé par ' + esc(c.paidBy) + '</span>' : '') + '</small></span><span class="cs-a red">−' + money(c.amount || 0).replace(' MAD', '') + '</span></div>';
      }).join('');
      html = '<div class="cs-tot red static"><span><small>Total · ' + esc(csLabel()) + '</small><b>' + money(total) + '</b><span>' + csN(count, 'charge', 'charges') + '</span></span></div>';
    } else if (w === 'moves') {
      title = 'Tous les mouvements';
      var mv = csPayments().map(function (p) { return { d: p.date, p: p }; }).concat(csCharges().map(function (c) { return { d: String(c.date || '').slice(0, 10), c: c }; }))
        .sort(function (a, b) { return b.d.localeCompare(a.d); });
      var tin = 0, tout = 0; mv.forEach(function (m) { if (m.p) tin += m.p.amount; else tout += Number(m.c.amount) || 0; });
      count = mv.length;
      body = mv.map(function (m) {
        if (m.p) return csPayRow(m.p).replace('<button type="button" class="cs-pay"', '<button type="button" class="cs-pay in"');
        var c = m.c, veh = (typeof window.aslChargeVehicleText === 'function') ? window.aslChargeVehicleText(c) : (c.vehicle || ''); if (veh === '—') veh = '';
        return '<div class="cs-pay out">' + csDayBox(c.date) + '<span class="cs-x"><b>' + esc(c.category || 'Charge') + '</b><small>' + esc([c.description, veh].filter(Boolean).join(' · ') || 'Charge') + '</small><small>' + (c.paidBy ? '<span class="cs-tag">Payé par ' + esc(c.paidBy) + '</span>' : '') + (c.payMode ? '<span class="cs-tag">' + esc(c.payMode) + '</span>' : '') + '</small></span><span class="cs-a red">−' + money(c.amount || 0).replace(' MAD', '') + '</span></div>';
      }).join('');
      html = '<div class="mu-3 cs-3"><div><small>Entrées</small><b class="ok">' + money(tin) + '</b></div><div><small>Sorties</small><b class="red">' + money(tout) + '</b></div><div><small>Solde</small><b>' + money(tin - tout) + '</b></div></div>';
    } else {
      var pays = csPayments().filter(function (p) { return w === 'all' || p.who === w; });
      title = w === 'all' ? 'Total encaissé' : (w === 'na' ? 'Non attribué' : w);
      total = pays.reduce(function (s, p) { return s + p.amount; }, 0); count = pays.length;
      body = pays.map(csPayRow).join('');
      html = '<div class="cs-tot static"><span><small>' + (w === 'all' ? 'Total encaissé' : w === 'na' ? 'Non attribué' : 'Encaissé par ' + w) + ' · ' + esc(csLabel()) + '</small><b>' + money(total) + '</b><span>' + csN(count, 'paiement', 'paiements') + (w === 'na' ? ' sans personne attribuée' : '') + '</span></span></div>' + chips();
    }
    maSetTitle(title);
    host.innerHTML = '<button type="button" class="cs-per small" onclick="maCsPeriod()">' + ic('calendar') + '<span><small>Période</small><b>' + esc(csLabel()) + '</b></span><em>Changer ▾</em></button>'
      + html + '<div class="mu-sec">' + (w === 'rest' ? 'Dossiers' : w === 'charges' ? 'Charges' : w === 'moves' ? 'Entrées et sorties' : 'Paiements') + '</div>'
      + (count ? body : '<div class="mt-none">Rien sur cette période.</div>')
      + (count && w !== 'charges' ? '<div class="mu-jn mt-center">Touchez une ligne pour ouvrir la fiche de la location.</div>' : '');
  }
  /* Fiche de la location (la même que l'Historique) ; le retour ramène ici. */
  window.maCsRes = function (id) { CS.keep = true; maGo('history'); HF.ret = 'caisse'; maHistFiche(id); };

  /* ---- Choix de la période ---- */
  var CSP = null;
  window.maCsPeriod = function () {
    CSP = { y: +(CS.ym || csCurYM()).slice(0, 4), ym: CS.mode === 'all' ? '' : CS.ym, all: CS.mode === 'all' };
    csRenderPeriod(true);
  };
  function csRenderPeriod(open) {
    var cur = csCurYM(), html = '<div id="cs-period"><div class="ma-sheet-title">Choisir la période</div>'
      + '<button type="button" class="cs-all' + (CSP.all ? ' on' : '') + '" onclick="maCsPick(\'all\')"><b>Depuis le début jusqu\'à aujourd\'hui</b><small>Tous les paiements enregistrés</small></button>'
      + '<div class="mt-mon cs-year"><button type="button" aria-label="Année précédente" onclick="maCsYear(-1)">‹</button><div><b>' + CSP.y + '</b></div><button type="button" aria-label="Année suivante" onclick="maCsYear(1)"' + (CSP.y >= +cur.slice(0, 4) ? ' disabled' : '') + '>›</button></div>'
      + '<div class="cs-months">' + CS_MS.map(function (m, i) {
        var ym = CSP.y + '-' + String(i + 1).padStart(2, '0'), fut = ym > cur;
        return '<button type="button" class="' + (!CSP.all && CSP.ym === ym ? 'on' : '') + (fut ? ' fut' : '') + '"' + (fut ? ' disabled' : '') + ' onclick="maCsPick(\'' + ym + '\')">' + m.charAt(0).toUpperCase() + m.slice(1) + '</button>';
      }).join('') + '</div>'
      + '<button type="button" class="mu-go" onclick="maCsApply()">' + (CSP.all ? 'Afficher depuis le début' : 'Afficher ' + (CSP.ym ? CS_M[+CSP.ym.slice(5, 7) - 1].toLowerCase() + ' ' + CSP.ym.slice(0, 4) : '')) + '</button></div>';
    if (open) openSheet(html); else { var b = document.getElementById('cs-period'); if (b) b.outerHTML = html; }
  }
  window.maCsYear = function (d) { if (!CSP) return; CSP.y += d; csRenderPeriod(); };
  window.maCsPick = function (v) { if (!CSP) return; if (v === 'all') { CSP.all = true; } else { CSP.all = false; CSP.ym = v; } csRenderPeriod(); };
  window.maCsApply = function () {
    if (!CSP) return;
    if (CSP.all) CS.mode = 'all'; else if (CSP.ym) { CS.mode = 'month'; CS.ym = CSP.ym; }
    CSP = null; closeSheet();
    var h = document.getElementById('ma-caisse'); if (h) h.innerHTML = '';
    renderCaisse();
  };

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
          notifs.push({ icon: 'wrench', tone: 'orange', title: 'Vérifier le km de ' + lbl, sub: 'Prochaine vidange prévue à ' + kmTxt, id: '', maint: true, carId: c.id, plate: u.plate || '' });
        }
      });
    });

    // ★ Notifications masquées d'un glissement (comme sur iPhone) : chaque
    //   notification a une clé (type + dossier + texte) ; une fois glissée,
    //   elle ne revient que si son contenu change (nouvelle date, nouveau
    //   montant…). Mémorisé sur ce téléphone, rien n'est modifié dans les données.
    var hidden = ntRead();
    notifs.forEach(function (n) { n.key = ntKey(n); });
    var shown = notifs.filter(function (n) { return !hidden[n.key]; });
    var nHidden = notifs.length - shown.length;
    if (host) {
      host.innerHTML = shown.length ? '<div class="nt-head"><span>' + shown.length + ' notification' + (shown.length > 1 ? 's' : '') + ' · glissez pour retirer</span><button type="button" onclick="maNotifClearAll()">Tout effacer</button></div>'
        + shown.map(function (n) {
        var clk = n.maint ? 'maOpenMaint(' + (typeof n.carId === 'number' ? n.carId : '\'' + esc(String(n.carId)) + '\'') + ',\'' + esc(n.plate || '') + '\')' : 'maNotifOpen(\'' + esc(String(n.id || '')) + '\')';
        return '<div class="nt-wrap" data-k="' + esc(n.key) + '"><div class="nt-bg"><span>' + ic('x') + ' Retirer</span><span>Retirer ' + ic('x') + '</span></div>'
          + '<div class="ma-notif" data-clk="' + esc(clk) + '"><div class="ma-notif-ico ' + n.tone + '">' + ic(n.icon) + '</div>'
          + '<div class="ma-notif-body"><div class="ma-notif-title">' + esc(n.title) + '</div><div class="ma-notif-sub">' + esc(n.sub) + '</div></div>'
          + '<span class="ma-notif-chev">' + ic('arrowLeft') + '</span></div></div>'; // flèche « ouvrir » (retournée en CSS)
      }).join('') : '<div class="ma-empty">' + ic('checkCircle') + '<div style="margin-top:8px;">Aucune notification. Tout est à jour.</div></div>';
      if (nHidden) host.innerHTML += '<button type="button" class="nt-restore" onclick="maNotifRestore()">Réafficher les notifications retirées (' + nHidden + ')</button>';
      ntBind(host);
    }
    ntBadge(shown.length);
  }
  function ntBadge(n) {
    var dot = document.querySelector('.ma-tab[data-screen="notifications"] .ma-tab-dot');
    if (dot) { if (n) { dot.textContent = n > 99 ? '99+' : n; dot.style.display = 'flex'; } else dot.style.display = 'none'; }
    var hdot = document.getElementById('ma-head-dot');
    if (hdot) hdot.style.display = n ? 'block' : 'none';
  }
  var NT_KEY = 'asl_notif_dismissed_v1';
  function ntKey(n) { return [n.icon, n.title, n.sub, n.id || ''].join('|'); }
  function ntRead() {
    var o = {}; try { o = JSON.parse(localStorage.getItem(NT_KEY) || '{}') || {}; } catch (e) {}
    var lim = Date.now() - 45 * 86400000, changed = false;
    Object.keys(o).forEach(function (k) { if (!(o[k] > lim)) { delete o[k]; changed = true; } }); // ménage : 45 jours
    if (changed) ntWrite(o);
    return o;
  }
  function ntWrite(o) { try { localStorage.setItem(NT_KEY, JSON.stringify(o)); } catch (e) {} }
  function ntDismiss(wrap, dir) {
    if (!wrap || wrap._gone) return; wrap._gone = true;
    var card = wrap.querySelector('.ma-notif');
    var o = ntRead(); o[wrap.getAttribute('data-k')] = Date.now(); ntWrite(o);
    if (card) { card.style.transition = 'transform .22s ease'; card.style.transform = 'translateX(' + (dir < 0 ? '-' : '') + '110%)'; }
    wrap.style.height = wrap.offsetHeight + 'px';
    setTimeout(function () { wrap.style.transition = 'height .2s ease, margin .2s ease, opacity .2s'; wrap.style.height = '0px'; wrap.style.marginBottom = '0px'; wrap.style.opacity = '0'; }, 200);
    setTimeout(function () { try { renderNotifications(); } catch (e) {} }, 430);
  }
  /* Glisser vers la gauche ou la droite pour retirer ; toucher pour ouvrir. */
  function ntBind(host) {
    host.querySelectorAll('.nt-wrap').forEach(function (wrap) {
      var card = wrap.querySelector('.ma-notif'); if (!card) return;
      var x0 = 0, y0 = 0, dx = 0, drag = false, lock = null, moved = false;
      function start(x, y) { x0 = x; y0 = y; dx = 0; drag = true; lock = null; moved = false; card.style.transition = 'none'; }
      function move(x, y, ev) {
        if (!drag) return;
        var mx = x - x0, my = y - y0;
        if (lock === null && (Math.abs(mx) > 8 || Math.abs(my) > 8)) lock = Math.abs(mx) > Math.abs(my) ? 'x' : 'y';
        if (lock !== 'x') return;
        if (ev && ev.cancelable) ev.preventDefault();
        moved = true; dx = mx;
        card.style.transform = 'translateX(' + dx + 'px)';
        wrap.classList.toggle('nt-left', dx < 0); wrap.classList.toggle('nt-right', dx > 0);
      }
      function end() {
        if (!drag) return; drag = false;
        var w = card.offsetWidth || 300;
        if (lock === 'x' && Math.abs(dx) > w * 0.35) { ntDismiss(wrap, dx); return; }
        card.style.transition = 'transform .2s ease'; card.style.transform = 'translateX(0)';
        setTimeout(function () { if (!wrap._gone) wrap.classList.remove('nt-left', 'nt-right'); }, 220);
      }
      card.addEventListener('touchstart', function (e) { var t = e.touches[0]; start(t.clientX, t.clientY); }, { passive: true });
      card.addEventListener('touchmove', function (e) { var t = e.touches[0]; move(t.clientX, t.clientY, e); }, { passive: false });
      card.addEventListener('touchend', end);
      card.addEventListener('touchcancel', end);
      card.addEventListener('mousedown', function (e) { start(e.clientX, e.clientY); });
      card.addEventListener('mousemove', function (e) { move(e.clientX, e.clientY); });
      card.addEventListener('mouseup', end);
      card.addEventListener('mouseleave', end);
      card.addEventListener('click', function () {
        if (moved || wrap._gone) { moved = false; return; }
        try { (new Function(card.getAttribute('data-clk')))(); } catch (e) {}
      });
    });
  }
  window.maNotifClearAll = function () {
    var o = ntRead();
    document.querySelectorAll('#ma-notifications .nt-wrap').forEach(function (w) { o[w.getAttribute('data-k')] = Date.now(); });
    ntWrite(o); renderNotifications();
    if (typeof showToast === 'function') showToast('Notifications retirées');
  };
  window.maNotifRestore = function () { ntWrite({}); renderNotifications(); };
  /* Ouvrir une notification de location : la fiche mobile (plus d'écran ordinateur). */
  window.maNotifOpen = function (id) {
    var r = (ASLDB.getReservations() || []).filter(function (x) { return String(x.id) === String(id); })[0];
    if (!r) return;
    if (r.type === 'lld') { maOpenLLD(r.id); return; }
    maRentalFiche(r.id, 'rented');
  };

  /* ============ "PLUS" : modules mobiles autorisés ============ */
  window.maOpenMore = function () {
    // ★ LOT 52 : menu réorganisé — Créer / Gestion (permissions inchangées).
    var create = [
      { ico: 'key', label: 'Nouvelle location', sub: 'Client direct ou via un partenaire', act: 'maNewLocation()', perm: 'rentals|reservations', cls: ' dark' },
      { ico: 'receipt', label: 'Ajouter une charge', sub: 'Carburant, AdBlue, vidange…', act: 'maAddCharge()', perm: 'caisse' }
    ];
    var manage = [
      { ico: 'history', label: 'Historique', act: "maMore('history')", perm: null },
      { ico: 'users', label: 'Clients', act: "maMore('clients')", perm: null },
      { ico: 'handshake', label: 'Sous-location', sub: 'Partenaires · sommes dues · encaissements', act: "maMore('sublease')", perm: 'sublease' },
      { ico: 'calendar', label: 'Location longue durée', sub: 'Contrats · versements · échéances', act: "maMore('lld')", perm: 'sublease' },
      { ico: 'wrench', label: 'Entretien', sub: 'Visites techniques et vidanges', act: "maMore('maintenance')", perm: 'maintenance' }
      // « Rendement » retiré du menu mobile : la page n'est pas branchée (écran vide) —
      // en attente de la version mobile validée.
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
  function wzNew(kind, doc, extra) {
    var t = todayISO();
    var isL = kind === 'lld';
    extra = extra || {};
    return { kind: kind || 'location', doc: doc || 'direct', subleaseId: extra.subleaseId || '', step: 1, q: '', client: null, isNew: false, pf: null,
      // Longue durée : durée en mois (0 = date de fin libre), échéance et montant
      months: 0, period: 'month', amt: '', steps: isL ? 4 : 3,
      nf: { first: '', last: '', phone: '' },
      start: t, startTime: '10:00', end: '', endTime: '10:00', unit: null, vq: '',
      ppu: '', total: '', totalEdited: false, paid: '', mode: 'Espèces', by: '', pickup: '', notes: '',
      // ★ N° de contrat (pré-rempli comme sur l'ordinateur, modifiable) + documents ajoutés ici
      contract: (typeof suggestContractRef === 'function') ? suggestContractRef(isL ? 'LLD' : 'LOC') : '',
      docs: { permis: [], identite: [] } };
  }
  /* ★ Modifier une location existante : même assistant, prérempli. */
  function wzFromRes(r) {
    var W = wzNew('location', r.subleaseId ? 'sublease' : 'direct', { subleaseId: r.subleaseId || '' });
    var name = String(r.finalClient || r.client || '').trim(), sp = name.split(/\s+/);
    var key = (typeof _custId === 'function') ? _custId(r.email, r.client) : ('name:' + name.toLowerCase());
    var dir = ((typeof aslCustomerDirectory === 'function') ? aslCustomerDirectory() : []).filter(function (c) { return c.key === key; })[0];
    W.edit = { id: r.id, email: r.email || '', origCarId: r.carId, origPlate: r.assignedPlate || '' };
    W.client = dir || { key: key, display: name, phone: r.phone || '', email: r.email || '', first: sp[0] || '', last: sp.slice(1).join(' ') };
    W.nf = { first: sp[0] || '', last: sp.slice(1).join(' '), phone: r.phone || '', profession: r.profession || '', nat: (r.nationality && r.nationality !== 'N/A') ? r.nationality : '' };
    W.start = String(r.startDate || '').slice(0, 10); W.startTime = r.startTime || '10:00';
    W.end = String(r.endDate || '').slice(0, 10); W.endTime = r.endTime || '10:00';
    W.unit = r.carId != null ? { carId: r.carId, plate: r.assignedPlate || '', model: r.car || '', color: r.assignedColor || '', ref: '', state: 'free', info: '' } : null;
    var days = Number(r.days) || 1;
    W.ppu = String(Number(r.pricePerDay) || (Math.round((Number(r.amount) || 0) / Math.max(1, days) * 100) / 100) || '');
    W.total = String(Number(r.amount) || 0); W.totalEdited = true;
    W.paid = ''; W.mode = r.paymentMode && ['Espèces', 'Carte bancaire', 'Virement', 'Chèque'].indexOf(r.paymentMode) >= 0 ? r.paymentMode : 'Espèces'; W.by = '';
    W.pickup = r.pickup || ''; W.notes = r.notes || ''; W.contract = r.contractRef || '';
    return W;
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
  /* ★ Voitures — statut RÉEL, sans se fier à la date de retour prévue :
     - « Loué actuellement » : une location est en cours sur cette voiture et
       son retour n'a PAS été confirmé dans le back-office (même si la date de
       retour prévue est passée ou précède les dates choisies : le client peut
       prolonger). Même règle que l'ordinateur (ASLDB.unitBusyAt).
     - « Réservé » : libre aujourd'hui, mais un dossier à venir chevauche les
       dates choisies (information ; la sélection reste possible).
     - « Disponible » : libre.
     - « Indisponible » : maintenance / hors service / longue durée (inchangé).
     Comme sur l'ordinateur, toute voiture (sauf indisponible) est sélectionnable ;
     le contrôle de conflit s'applique au moment d'enregistrer. */
  function wzDM(iso) { iso = String(iso || ''); return iso.length >= 10 ? iso.slice(8, 10) + '/' + iso.slice(5, 7) : ''; }
  function wzUnits() {
    var out = [];
    var s = WZ.start, e = WZ.end, st = WZ.startTime, et = WZ.endTime;
    var a = new Date(s + 'T' + (st || '10:00')), b = new Date((e || s) + 'T' + (et || '10:00'));
    var selfId = WZ.edit ? String(WZ.edit.id) : null;
    // En modification, la location elle-même ne doit pas rendre sa voiture « occupée ».
    var res = ((ASLDB.getReservations && ASLDB.getReservations()) || []).filter(function (r) { return !selfId || String(r.id) !== selfId; });
    var now = new Date();
    fleet().forEach(function (c) {
      if (c.status === 'lld') return;
      var units = (ASLDB.normalizeUnits ? ASLDB.normalizeUnits(c) : []) || [];
      if (!units.length) units = [{ plate: c.plate || '', color: c.color || '' }];
      var model = (e && ASLDB.checkAvailability) ? ASLDB.checkAvailability(c, s, e, st, et, selfId ? { excludeId: selfId } : undefined) : { available: true };
      units.forEach(function (u) {
        var us = (u && u.status) || 'available';
        var out1 = { carId: c.id, model: c.name || '', plate: u.plate || '', color: u.color || '', ref: c.priceMAD || Math.round((c.priceEUR || 0) * 10.8) || '', info: '' };
        if (us === 'maintenance' || us === 'offroad' || us === 'lld') { out1.state = 'off'; out1.why = 'Indisponible'; out.push(out1); return; }
        // 1) Loué actuellement : location en cours, retour non confirmé
        var cur = u.plate ? res.filter(function (r) {
          if (!r || r.status === 'cancelled' || r.status === 'completed' || String(r.carId) !== String(c.id) || r.assignedPlate !== u.plate) return false;
          var ph = ASLDB.computePhase ? ASLDB.computePhase(r, now) : '';
          return ph === 'active' || ph === 'late';
        })[0] : null;
        var busyNow = cur || (selfId
          ? (u.plate ? res.some(function (r) { return r && r.status !== 'cancelled' && r.status !== 'completed' && String(r.carId) === String(c.id) && r.assignedPlate === u.plate && r.source === 'online'; }) : false)
          : (u.plate && ASLDB.unitBusyAt ? ASLDB.unitBusyAt(c.id, u.plate, now) : false));
        if (busyNow) {
          out1.state = 'rented'; out1.why = 'Loué actuellement';
          if (cur) {
            var late = ASLDB.computePhase && ASLDB.computePhase(cur, now) === 'late';
            out1.info = (cur.client ? cur.client + ' · ' : '') + (late ? 'retour prévu le ' + wzDM(cur.endDate) + ', non confirmé' : 'retour prévu le ' + wzDM(cur.endDate));
          }
          out.push(out1); return;
        }
        // 2) Réservé sur les dates choisies (dossier à venir sur cette voiture)
        var fut = res.filter(function (r) {
          if (!r || r.status === 'cancelled' || r.status === 'completed' || String(r.carId) !== String(c.id) || !u.plate || r.assignedPlate !== u.plate) return false;
          var rs = new Date(String(r.startDate).slice(0, 10) + 'T' + (r.startTime || '10:00')), re = new Date(String(r.endDate || r.startDate).slice(0, 10) + 'T' + (r.endTime || '10:00'));
          return rs < b && re > a;
        })[0];
        if (fut) { out1.state = 'reserved'; out1.why = 'Réservé'; out1.info = (fut.client ? fut.client + ' · ' : '') + 'du ' + wzDM(fut.startDate) + ' au ' + wzDM(fut.endDate); }
        else if (!model.available) { out1.state = 'reserved'; out1.why = 'Réservé'; out1.info = 'modèle complet sur ces dates'; }
        else out1.state = 'free';
        out.push(out1);
      });
    });
    var rank = { free: 0, reserved: 1, rented: 2, off: 3 };
    out.sort(function (x, y) { return (rank[x.state] - rank[y.state]) || (x.model + x.plate).localeCompare(y.model + y.plate, 'fr'); });
    return out;
  }
  /* ★ Documents du client (permis / CIN) : ceux déjà en base + ceux ajoutés ici */
  function wzExistingDocs() {
    if (!WZ.client) return { permis: [], identite: [] };
    if (WZ._docsKey === WZ.client.key && WZ._docsCache) return WZ._docsCache;
    var gd = { permis: [], identite: [] };
    try {
      if (typeof aslGatherCustomerDocs === 'function') {
        var c0 = WZ.client;
        gd = aslGatherCustomerDocs(c0.key, (ASLDB.getReservations() || []).filter(function (r) { return typeof _custId === 'function' && _custId(r.email, r.client) === c0.key; }), { names: [c0.display], phone: c0.phone, email: c0.email }) || gd;
      }
    } catch (e0) {}
    WZ._docsKey = WZ.client.key; WZ._docsCache = gd;
    return gd;
  }
  function wzDocSlot(type, label) {
    var ex = (wzExistingDocs()[type] || []), nw = WZ.docs[type] || [];
    var has = ex.length + nw.length > 0;
    var thumbs = ex.map(function (d) {
      return '<button type="button" class="wz-doc-th" onclick="maWzDocView(this)" data-src="' + esc(d.url) + '"><img alt=""' + (typeof aslDocImgAttrs === 'function' ? aslDocImgAttrs(d.url) : ' src="' + esc(d.url) + '"') + '><em>En base</em></button>';
    }).join('') + nw.map(function (u, i) {
      return '<span class="wz-doc-th new"><button type="button" class="wz-doc-img" onclick="maWzDocView(this)" data-src="' + esc(u) + '"><img alt="" src="' + u + '"></button><em>Nouveau</em><button type="button" class="wz-doc-del" aria-label="Retirer" onclick="maWzDocDel(\'' + type + '\',' + i + ')">' + ic('x') + '</button></span>';
    }).join('');
    return '<div class="wz-doc' + (has ? '' : ' miss') + '">'
      + '<div class="wz-doc-h"><b>' + label + '</b><span class="wz-pill ' + (has ? 'ok' : 'miss') + '">' + (has ? '✓ ' + (ex.length && !nw.length ? 'Déjà enregistré' : 'Ajouté') : 'Manquant') + '</span></div>'
      + (has ? '<div class="wz-doc-ths">' + thumbs + '</div>' : '<div class="wz-doc-empty">' + ic('alert') + ' Aucun document enregistré — à demander au client</div>')
      + '<div class="wz-doc-act">'
      + '<button type="button" onclick="maWzDocClip(\'' + type + '\')">' + ic('file') + ' Coller</button>'
      + '<label>' + ic('image') + ' Galerie<input type="file" accept="image/*" multiple onchange="maWzDocFiles(this,\'' + type + '\')"></label></div>'
      + '<div class="wz-doc-paste" contenteditable="true" inputmode="none" spellcheck="false" onpaste="maWzDocPaste(event,\'' + type + '\')" oninput="this.textContent=\'\'" onkeydown="if(!(event.ctrlKey||event.metaKey))event.preventDefault()" aria-label="Zone de collage ' + label + '"></div>'
      + '</div>';
  }
  function wzDocsBlock() {
    return '<div class="wz-sec">Documents du client</div>'
      + wzDocSlot('permis', 'Permis de conduire')
      + wzDocSlot('identite', 'Carte nationale (CIN)')
      + '<div class="wz-note">Copiez l\'image dans votre galerie ou WhatsApp, puis touchez « Coller » (ou appui long sur la zone en pointillés → Coller).</div>';
  }
  function wzSeg(field, a, b, va, vb) {
    return '<div class="wz-seg"><button type="button" class="' + (WZ[field] === va ? 'on' : '') + '" onclick="maWz(\'' + field + '\',\'' + va + '\')">' + a + '</button><button type="button" class="' + (WZ[field] === vb ? 'on' : '') + '" onclick="maWz(\'' + field + '\',\'' + vb + '\')">' + b + '</button></div>';
  }
  function wzChips(field, list) {
    return '<div class="wz-chips">' + list.map(function (v) { return '<button type="button" class="' + (WZ[field] === v ? 'on' : '') + '" onclick="maWz(\'' + field + '\',\'' + esc(v) + '\')">' + esc(v) + '</button>'; }).join('') + '</div>';
  }
  function wzInput(field, label, type, ph, extra) {
    var val = field.indexOf('nf.') === 0 ? WZ.nf[field.slice(3)] : WZ[field];
    return '<label class="wz-field"><span>' + label + '</span><input type="' + (type || 'text') + '" value="' + esc(val == null ? '' : val) + '" placeholder="' + esc(ph || '') + '" ' + (extra || '') + ' oninput="maWzIn(\'' + field + '\',this.value)"></label>';
  }
  function wzRender(keepFocus) {
    var host = document.getElementById('ma-wiz'); if (!host) return;
    var isL = WZ.kind === 'lld';
    var kindLbl = isL ? 'Nouveau contrat longue durée' : (WZ.edit ? 'Modifier la location' : 'Nouvelle location');
    var labels = isL ? ['Client', 'Véhicule et durée', 'Montant et 1er versement', 'Récapitulatif'] : ['Client', 'Voiture et dates', 'Paiement'];
    var NS = WZ.steps;
    var partner = (WZ.doc === 'sublease' && WZ.subleaseId && window.ASLSublease) ? ASLSublease.get(WZ.subleaseId) : null;
    if (WZ.pf) return wzRenderPartnerForm(host, kindLbl);
    var clientName = WZ.client ? WZ.client.display : ((WZ.nf.first + ' ' + WZ.nf.last).trim());
    var head = '<div class="wz-top">'
      + '<button type="button" class="wz-icon" aria-label="' + (WZ.step === 1 ? 'Fermer' : 'Étape précédente') + '" onclick="' + (WZ.step === 1 ? 'maWzClose()' : 'maWzStep(-1)') + '">' + ic(WZ.step === 1 ? 'x' : 'arrowLeft') + '</button>'
      + '<div class="wz-ttl"><b>' + kindLbl + '</b>' + (WZ.step > 1 && clientName ? '<small>' + esc(clientName) + (WZ.step > 2 && WZ.unit ? ' · ' + esc(WZ.unit.model) : '') + '</small>' : (partner ? '<small>Via ' + esc(partner.name) + '</small>' : '')) + '</div></div>'
      + '<div class="wz-steps"><div>' + [1, 2, 3, 4].slice(0, NS).map(function (i) { return '<i class="' + (i <= WZ.step ? 'on' : '') + '"></i>'; }).join('') + '</div><span>Étape ' + WZ.step + ' sur ' + NS + ' · ' + labels[WZ.step - 1] + '</span></div>';
    var body = '', btn = '', ok = true;
    if (WZ.step === 1) {
      // ★ Une seule entrée « Nouvelle location » : le logiciel classe déjà
      //   automatiquement en « Réservé » quand le départ est prévu plus tard.
      // ★ Sous-location : choix du partenaire en cartes (+ création sur place).
      body = wzSeg('doc', 'Client direct', 'Sous-location', 'direct', 'sublease')
        + (WZ.doc === 'sublease' ? wzPartnersHTML() : '');
      if (WZ.doc === 'sublease') body += '<div class="wz-sec">Client final</div>';
      if (WZ.edit && !WZ.editPick) {
        body += (WZ.doc === 'sublease' ? '' : '<div class="wz-sec">Client de cette location</div>')
          + '<div class="wz-two">' + wzInput('nf.first', 'Prénom', 'text', 'Prénom', 'id="wz-nf-first"') + wzInput('nf.last', 'Nom', 'text', 'Nom') + '</div>'
          + wzInput('nf.phone', 'Téléphone / WhatsApp', 'tel', '+212 6…', 'inputmode="tel"')
          + '<div class="wz-two">' + wzInput('nf.profession', 'Profession', 'text', 'Ex : Ingénieur') + wzInput('nf.nat', 'Nationalité', 'text', 'Ex : Marocaine') + '</div>'
          + '<button type="button" class="wz-dashed" onclick="maWzEditPick(1)">' + ic('search') + ' Choisir un autre client</button>'
          + wzDocsBlock();
        ok = !!String(WZ.nf.first || '').trim();
      } else if (WZ.edit && WZ.editPick) {
        var listE = wzClientsList();
        body += '<label class="wz-search">' + ic('search') + '<input id="wz-q" type="search" value="' + esc(WZ.q) + '" placeholder="Nom ou téléphone du client" autocomplete="off" oninput="maWzQ(this.value)"></label>'
          + '<div class="wz-sec">' + (WZ.q ? 'Clients trouvés' : 'Clients récents') + '</div>'
          + (listE.length ? listE.map(function (c) {
              return '<button type="button" class="wz-row" data-k="' + esc(encodeURIComponent(c.key)) + '" onclick="maWzPick(this.dataset.k)"><span class="wz-ava">' + esc((c.display || '?').charAt(0).toUpperCase()) + '</span><span class="wz-rt"><b>' + esc(c.display) + '</b><small>' + esc((c.phone || 'Pas de téléphone') + ' · ' + c.count + ' dossier' + (c.count > 1 ? 's' : '')) + '</small></span></button>';
            }).join('') : '<div class="wz-note">Aucun client trouvé.</div>')
          + '<button type="button" class="wz-dashed" onclick="maWzEditPick(0)">' + ic('arrowLeft') + ' Garder le client actuel</button>';
        ok = false;
      } else if (!WZ.isNew) {
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
          body += '<div class="wz-card"><div class="wz-sec" style="margin:0 0 6px;">Rempli automatiquement</div>'
            + '<div class="wz-kv"><span>Téléphone</span><b>' + esc(c0.phone || '—') + '</b></div>'
            + (c0.profession ? '<div class="wz-kv"><span>Profession</span><b>' + esc(c0.profession) + '</b></div>' : '')
            + (c0.nationality ? '<div class="wz-kv"><span>Nationalité</span><b>' + esc(c0.nationality) + '</b></div>' : '') + '</div>'
            + wzDocsBlock();
        }
        ok = !!WZ.client;
      } else {
        body += '<div class="wz-sec">Nouveau client</div>' + wzInput('nf.first', 'Prénom', 'text', 'Prénom') + wzInput('nf.last', 'Nom', 'text', 'Nom') + wzInput('nf.phone', 'Téléphone / WhatsApp', 'tel', '+212 6…', 'inputmode="tel"')
          + '<button type="button" class="wz-dashed" onclick="maWz(\'isNew\',\'\')">' + ic('search') + ' Choisir un client existant</button>'
          + wzDocsBlock();
        ok = !!WZ.nf.first.trim();
      }
      if (WZ.doc === 'sublease') body += '<div class="wz-note">Le client final est la personne qui conduit la voiture ; le partenaire paie la location.</div>';
      if (WZ.doc === 'sublease' && !WZ.subleaseId) ok = false;
      btn = 'Continuer';
    } else if (isL) {
      var lr = wzLLDStep();
      body = lr.body; ok = lr.ok; btn = lr.btn;
    } else if (WZ.step === 2) {
      var days = wzDays();
      body = '<div class="wz-two">'
        + '<label class="wz-field"><span>Départ</span><input type="date" value="' + esc(WZ.start) + '" onchange="maWz(\'start\',this.value)"><input type="time" value="' + esc(WZ.startTime) + '" onchange="maWz(\'startTime\',this.value)"></label>'
        + '<label class="wz-field"><span>Retour</span><input type="date" value="' + esc(WZ.end) + '" min="' + esc(WZ.start) + '" onchange="maWz(\'end\',this.value)"><input type="time" value="' + esc(WZ.endTime) + '" onchange="maWz(\'endTime\',this.value)"></label></div>'
        + '<div class="wz-days">' + (days ? days + ' jour' + (days > 1 ? 's' : '') : 'Choisissez la date de retour') + '</div>';
      if (WZ.end && days) body += wzCarsHTML();
      ok = !!(WZ.end && days && WZ.unit);
      btn = WZ.unit ? 'Continuer · ' + esc(WZ.unit.model) : 'Continuer';
    } else {
      var d3 = wzDays(), ppu = parseFloat(WZ.ppu) || 0;
      if (!WZ.totalEdited) WZ.total = ppu ? String(Math.round(ppu * d3 * 100) / 100) : '';
      var total = parseFloat(WZ.total) || 0, paid = parseFloat(WZ.paid) || 0;
      body = '<div class="wz-card"><div class="wz-kv"><span>Client</span><b>' + esc(clientName) + '</b></div><div class="wz-kv"><span>Voiture</span><b>' + esc(WZ.kind === 'reservation' ? WZ.unit.model + ' · attribuée à la prise en charge' : WZ.unit.model + ' · ' + (WZ.unit.plate || '') + (WZ.unit.color ? ' · ' + WZ.unit.color : '')) + '</b></div><div class="wz-kv"><span>Dates</span><b>' + esc(WZ.start.split('-').reverse().slice(0, 2).join('/') + ' ' + WZ.startTime + ' → ' + WZ.end.split('-').reverse().slice(0, 2).join('/') + ' ' + WZ.endTime) + '</b></div><div class="wz-kv"><span>Durée</span><b>' + d3 + ' jour' + (d3 > 1 ? 's' : '') + '</b></div></div>'
        + (WZ.unit.state === 'rented' ? '<div class="wz-warn">' + ic('alert') + '<span>Cette voiture est <b>louée actuellement</b> (retour non confirmé)' + (WZ.unit.info ? ' — ' + esc(WZ.unit.info) : '') + '.</span></div>' : '')
        + wzInput('contract', 'Numéro de contrat', 'text', 'Ex : LOC-2026-001', 'id="wz-contract" autocomplete="off" autocapitalize="characters"')
        + '<div class="wz-two">' + wzInput('ppu', 'Prix / jour (MAD)', 'number', WZ.unit.ref ? 'Réf. ' + WZ.unit.ref : '0', 'inputmode="decimal" id="wz-ppu"') + wzInput('paid', WZ.edit ? 'Nouveau versement (MAD)' : 'Acompte reçu (MAD)', 'number', '0', 'inputmode="decimal" id="wz-paid"') + '</div>'
        + (WZ.edit ? '<div class="wz-note">Déjà payé : <b>' + money(wzEditPaid()) + '</b>' + (wzEditCount() ? ' (' + wzEditCount() + ' versement' + (wzEditCount() > 1 ? 's' : '') + ', conservés)' : '') + '. Laissez « Nouveau versement » vide si le client n\'a rien payé de plus.</div>' : '')
        + '<div class="wz-card"><div class="wz-kv big"><span>Total</span><b id="wz-total">' + money(total) + '</b></div><div class="wz-kv"><span>Reste à payer</span><b id="wz-rest" style="color:#C41E3A;">' + money(Math.max(0, total - paid - (WZ.edit ? wzEditPaid() : 0))) + '</b></div>'
        + '<button type="button" class="wz-link" onclick="maWzTotal()">Modifier le total</button></div>'
        + '<div class="wz-sec">Mode de paiement</div>' + wzChips('mode', ['Espèces', 'Carte bancaire', 'Virement', 'Chèque'])
        + '<div class="wz-sec">Encaissé par</div>' + wzChips('by', ['Mohamed', 'Younes', 'Khalil'])
        + wzInput('pickup', 'Lieu de prise en charge', 'text', 'Ex : Aéroport Marrakech (RAK)')
        + wzInput('notes', 'Notes (facultatif)', 'text', '');
      ok = wzStep3Ok();
      btn = WZ.edit ? 'Enregistrer les modifications' : 'Enregistrer la location';
    }
    var hint = '';
    if (!ok) hint = WZ.step === 1 ? (WZ.doc === 'sublease' && !WZ.subleaseId ? 'Choisissez le partenaire' : (WZ.edit ? (WZ.editPick ? 'Choisissez un client ou gardez le client actuel' : 'Saisissez au moins le prénom') : (WZ.isNew ? 'Saisissez au moins le prénom' : 'Choisissez un client'))) : isL ? wzLLDHint() : WZ.step === 2 ? (!WZ.end ? 'Choisissez la date de retour' : 'Choisissez une voiture') : wzStep3Hint();
    var prevBody = document.getElementById('wz-body');
    var keepScroll = (prevBody && WZ._lastStep === WZ.step) ? prevBody.scrollTop : 0;
    WZ._lastStep = WZ.step;
    host.innerHTML = '<div class="wz-box" role="dialog" aria-modal="true" aria-label="' + kindLbl + '">' + head + '<div class="wz-body" id="wz-body">' + body + '</div>'
      + '<div class="wz-foot">' + (hint ? '<div class="wz-hint">' + esc(hint) + '</div>' : '') + '<button type="button" class="wz-main" ' + (ok ? '' : 'disabled') + ' onclick="' + (WZ.step < NS ? 'maWzStep(1)' : 'maWzSave()') + '">' + btn + '</button></div></div>';
    var nb = document.getElementById('wz-body'); if (nb && keepScroll) nb.scrollTop = keepScroll;
    try { if (typeof aslDocHydrate === 'function') aslDocHydrate(host); } catch (eh) {}
    if (keepFocus) { var el = document.getElementById(keepFocus); if (el) { el.focus(); try { var l = el.value.length; el.setSelectionRange(l, l); } catch (e1) {} } }
  }
  /* Liste des voitures (statuts réels) — commune à la location et à la longue durée. */
  function wzCarsHTML() {
    var body = '';
    var us = wzUnits();
    var vq = (WZ.vq || '').trim().toLowerCase();
    if (vq) us = us.filter(function (u) { return (u.model + ' ' + u.plate + ' ' + u.color).toLowerCase().indexOf(vq) >= 0; });
    var PILL = { free: ['ok', 'Disponible'], reserved: ['off', 'Réservé'], rented: ['rent', 'Loué actuellement'], off: ['na', 'Indisponible'] };
    var row = function (u) {
      var on = WZ.unit && String(WZ.unit.carId) === String(u.carId) && WZ.unit.plate === u.plate;
      var dis = u.state === 'off';
      var pl = PILL[u.state] || PILL.free;
      return '<button type="button" class="wz-row' + (on ? ' on' : '') + (dis ? ' off' : '') + (u.state === 'rented' ? ' rent' : '') + '" ' + (dis ? 'disabled' : '') + ' data-c="' + esc(u.carId) + '" data-p="' + esc(u.plate) + '" onclick="maWzUnit(this.dataset.c,this.dataset.p)">'
        + '<span class="wz-ava car">' + ic('car') + '</span><span class="wz-rt"><b>' + esc(u.model) + '</b><small>' + esc((u.plate || 'sans plaque') + (u.color ? ' · ' + u.color : '') + (u.ref ? ' · réf. ' + u.ref + ' MAD/j' : '')) + '</small>'
        + (u.info ? '<small class="wz-info">' + esc(u.info) + '</small>' : '') + '</span>'
        + (on ? '<span class="wz-check">' + ic('check') + '</span>' : '<span class="wz-pill ' + pl[0] + '">' + pl[1] + '</span>') + '</button>';
    };
    var grp = function (st) { return us.filter(function (u) { return u.state === st; }); };
    var free = grp('free'), resv = grp('reserved'), rent = grp('rented'), off = grp('off');
    body += '<label class="wz-search">' + ic('search') + '<input id="wz-vq" type="search" value="' + esc(WZ.vq) + '" placeholder="Rechercher une voiture (nom, plaque…)" autocomplete="off" oninput="maWzVQ(this.value)"></label>';
    if (vq && !us.length) body += '<div class="wz-note">Aucune voiture ne correspond à « ' + esc(WZ.vq) + ' ».</div>';
    body += (free.length || !vq ? '<div class="wz-sec">Disponibles · ' + free.length + '</div>' + (free.length ? free.map(row).join('') : '<div class="wz-note">Aucune voiture disponible.</div>') : '')
      + (rent.length ? '<div class="wz-sec">Loués actuellement · ' + rent.length + '</div>' + rent.map(row).join('') : '')
      + (resv.length ? '<div class="wz-sec">Réservés sur ces dates · ' + resv.length + '</div>' + resv.map(row).join('') : '')
      + (off.length ? '<div class="wz-sec">Indisponibles</div>' + off.map(row).join('') : '');
    return body;
  }
  function wzStep3Ok() {
    var ppu = parseFloat(WZ.ppu) || 0, paid = parseFloat(WZ.paid) || 0;
    return ppu > 0 && (paid <= 0 || !!WZ.by) && !!String(WZ.contract || '').trim();
  }
  /* Bouton + message de l'étape 3 mis à jour sans reconstruire l'écran
     (le clavier reste ouvert) ; le message réapparaît s'il redevient utile. */
  function wzFoot3() {
    var okNow = wzStep3Ok();
    var b = document.querySelector('#ma-wiz .wz-main'); if (b) b.disabled = !okNow;
    var foot = document.querySelector('#ma-wiz .wz-foot'); if (!foot) return;
    var hEl = foot.querySelector('.wz-hint');
    if (okNow) { if (hEl) hEl.remove(); return; }
    if (!hEl) { hEl = document.createElement('div'); hEl.className = 'wz-hint'; foot.insertBefore(hEl, foot.firstChild); }
    hEl.textContent = wzStep3Hint();
  }
  function wzStep3Hint() {
    if (!String(WZ.contract || '').trim()) return 'Saisissez le numéro de contrat';
    if ((parseFloat(WZ.ppu) || 0) <= 0) return 'Saisissez le prix par jour';
    return 'Indiquez qui a encaissé l\'acompte';
  }
  function wzOpen(kind, doc, extra) {
    closeSheet();
    WZ = wzNew(kind, doc, extra);
    var host = document.getElementById('ma-wiz');
    if (!host) { host = document.createElement('div'); host.id = 'ma-wiz'; document.body.appendChild(host); }
    host.style.display = 'block';
    document.body.classList.add('ma-locked');
    wzRender();
  }
  window.maWzClose = function () {
    var ed = WZ && WZ.edit ? WZ.edit : null;
    var h = document.getElementById('ma-wiz'); if (h) { h.style.display = 'none'; h.innerHTML = ''; }
    document.body.classList.remove('ma-locked'); WZ = null;
    // Modification annulée : retour à la fiche du véhicule loué, rien n'est enregistré.
    if (ed) { try { renderScreen(current); } catch (e0) {} try { maRentalFiche(ed.id, ed.mode); } catch (e1) {} }
  };
  window.maWzEditPick = function (on) { if (!WZ || !WZ.edit) return; WZ.editPick = !!on; WZ.q = ''; wzRender(); };
  function wzEditRes() { return WZ && WZ.edit ? (ASLDB.getReservations() || []).filter(function (x) { return String(x.id) === String(WZ.edit.id); })[0] : null; }
  function wzEditPaid() { var r = wzEditRes(); if (!r) return 0; return (typeof aslPaymentJournal === 'function') ? aslJournalSum(aslPaymentJournal(r)) : (Number(r.paid) || 0); }
  function wzEditCount() { var r = wzEditRes(); return r && typeof aslPaymentJournal === 'function' ? aslPaymentJournal(r).length : 0; }
  window.maWz = function (field, val) {
    if (!WZ) return;
    if (field === 'isNew') { WZ.isNew = !!val; if (WZ.isNew) WZ.client = null; }
    else { WZ[field] = val; }
    if (field === 'start' && WZ.end && WZ.end < val) WZ.end = '';
    if (field === 'start' || field === 'end' || field === 'startTime' || field === 'endTime') { if (!WZ.edit) WZ.unit = null; WZ.totalEdited = false; }
    if (field === 'doc' && val === 'direct') WZ.subleaseId = '';
    if (field === 'start' && WZ.kind === 'lld' && WZ.months) WZ.end = llAddMonths(val, WZ.months);
    wzRender();
  };
  window.maWzIn = function (field, val) {
    if (!WZ) return;
    if (field.indexOf('nf.') === 0) WZ.nf[field.slice(3)] = val; else WZ[field] = val;
    if (field === 'subleaseId') { wzRender(); return; }
    if (WZ.kind === 'lld' && WZ.step === 3) { wzLLDLive(); return; }
    if (WZ.step === 3 && field === 'contract') {
      wzFoot3();
      return;
    }
    if (WZ.edit && WZ.step === 3 && field === 'ppu') WZ.totalEdited = false;
    if (WZ.step === 3 && (field === 'ppu' || field === 'paid' || field === 'total')) {
      // mise à jour des montants sans reconstruire l'écran (le clavier reste ouvert)
      var d3 = wzDays(), ppu = parseFloat(WZ.ppu) || 0;
      if (!WZ.totalEdited) WZ.total = ppu ? String(Math.round(ppu * d3 * 100) / 100) : '';
      var total = parseFloat(WZ.total) || 0, paid = parseFloat(WZ.paid) || 0;
      var t = document.getElementById('wz-total'), r = document.getElementById('wz-rest');
      if (t) t.textContent = money(total); if (r) r.textContent = money(Math.max(0, total - paid - (WZ.edit ? wzEditPaid() : 0)));
      wzFoot3();
      return;
    }
    if (WZ.step === 1 && WZ.edit) {
      var okE = !!String(WZ.nf.first || '').trim();
      var bE = document.querySelector('#ma-wiz .wz-main'); if (bE) bE.disabled = !okE;
      var hE = document.querySelector('#ma-wiz .wz-hint'); if (hE && okE) hE.remove();
      return;
    }
    if (WZ.step === 1) {
      var okNew = WZ.isNew && !!WZ.nf.first.trim() && !(WZ.doc === 'sublease' && !WZ.subleaseId);
      if (WZ.isNew && !okNew) { var bx = document.querySelector('#ma-wiz .wz-main'); if (bx) bx.disabled = true; }
      var b1 = document.querySelector('#ma-wiz .wz-main'); if (b1 && WZ.isNew) b1.disabled = !okNew;
      var h1 = document.querySelector('#ma-wiz .wz-hint'); if (h1 && okNew) h1.remove();
    }
  };
  window.maWzQ = function (v) { if (!WZ) return; WZ.q = v; wzRender('wz-q'); };
  window.maWzPick = function (encKey) {
    var key = decodeURIComponent(encKey);
    var c = ((typeof aslCustomerDirectory === 'function') ? aslCustomerDirectory() : []).filter(function (x) { return x.key === key; })[0];
    if (!c) return; WZ.client = c;
    if (WZ.edit) { WZ.editPick = false; WZ.q = ''; WZ.edit.email = c.email || ''; WZ.edit.clientChanged = true; WZ.nf = { first: c.first || String(c.display || '').split(/\s+/)[0] || '', last: c.last || String(c.display || '').split(/\s+/).slice(1).join(' '), phone: c.phone || '', profession: c.profession || '', nat: c.nationality || '' }; WZ._docsKey = null; }
    wzRender();
  };
  window.maWzUnit = function (carId, plate) {
    // ★ Comme sur l'ordinateur : toute voiture (sauf « Indisponible ») peut être choisie.
    var u = wzUnits().filter(function (x) { return String(x.carId) === String(carId) && x.plate === plate && x.state !== 'off'; })[0];
    if (!u) return; WZ.unit = u; WZ.totalEdited = false; wzRender();
  };
  window.maWzVQ = function (v) { if (!WZ) return; WZ.vq = v; wzRender('wz-vq'); };


  /* ---------- Sous-location : partenaires en cartes + création sur place ---------- */
  function wzPartnersHTML() {
    var list = (window.ASLSublease ? ASLSublease.list() : []).map(function (s) { return { s: s, st: ASLSublease.stats(s.id) }; })
      .sort(function (a, b) { return (a.s.id === WZ.subleaseId ? -1 : b.s.id === WZ.subleaseId ? 1 : 0) || String(a.s.name).localeCompare(String(b.s.name), 'fr'); });
    return '<div class="wz-sec">Partenaire</div>'
      + (list.length ? list.map(function (x) {
        var on = x.s.id === WZ.subleaseId;
        return '<button type="button" class="wz-row' + (on ? ' on' : '') + '" data-id="' + esc(x.s.id) + '" onclick="maWzPartner(this.dataset.id)"><span class="wz-ava sl">' + esc((x.s.name || '?').charAt(0).toUpperCase()) + '</span><span class="wz-rt"><b>' + esc(x.s.name) + '</b><small>' + esc(x.st.rest > 0 ? 'Reste dû ' + money(x.st.rest) : 'À jour') + '</small></span>' + (on ? '<span class="wz-check">' + ic('check') + '</span>' : '') + '</button>';
      }).join('') : '<div class="wz-note">Aucun partenaire enregistré.</div>')
      + '<button type="button" class="wz-dashed" onclick="maWzNewPartner()">' + ic('plus') + ' Nouveau partenaire</button>';
  }
  window.maWzPartner = function (id) { if (!WZ) return; WZ.subleaseId = id; wzRender(); };
  window.maWzNewPartner = function () { if (!WZ) return; WZ.pf = slNewForm(null); wzRender(); };
  window.maWzPartnerCancel = function () { if (!WZ) return; WZ.pf = null; wzRender(); };
  window.maWzPartnerSave = function () {
    if (!WZ || !WZ.pf) return;
    var saved = slSaveForm(WZ.pf);
    if (!saved) return;
    WZ.pf = null; WZ.subleaseId = saved.id; WZ.doc = 'sublease';
    try { if (typeof renderSubleases === 'function') renderSubleases(); } catch (e) {}
    if (typeof showToast === 'function') showToast('Partenaire créé et sélectionné ✓');
    wzRender();
  };
  function wzRenderPartnerForm(host, kindLbl) {
    var ok = !!String(WZ.pf.name || '').trim();
    host.innerHTML = '<div class="wz-box" role="dialog" aria-modal="true" aria-label="Nouveau partenaire">'
      + '<div class="wz-top"><button type="button" class="wz-icon" aria-label="Retour" onclick="maWzPartnerCancel()">' + ic('arrowLeft') + '</button><div class="wz-ttl"><b>Nouveau partenaire</b><small>' + esc(kindLbl) + ' · sous-location</small></div></div>'
      + '<div class="wz-body" id="wz-body">' + slFormHTML(WZ.pf, 'wiz') + '</div>'
      + '<div class="wz-foot"><div class="wz-hint sl-need"' + (ok ? ' style="display:none;"' : '') + '>Saisissez au moins le nom</div><button type="button" class="wz-main sl-save"' + (ok ? '' : ' disabled') + ' onclick="maWzPartnerSave()">Enregistrer le partenaire</button></div></div>';
  }

  /* ---------- Longue durée : étapes 2 à 4 ---------- */
  function wzLLDCalc() {
    var span = (WZ.start && WZ.end && WZ.end > WZ.start) ? llDays(WZ.start, WZ.end) : 0;
    var months = span ? Math.max(1, llMonthsBetween(WZ.start, WZ.end)) : 0;
    var n = !span ? 0 : WZ.period === '15d' ? Math.max(1, Math.ceil(span / 15)) : WZ.period === 'month' ? months : 1;
    var amt = parseFloat(String(WZ.amt).replace(',', '.')) || 0;
    var total = WZ.period === 'total' ? amt : Math.round(amt * n * 100) / 100;
    var first = parseFloat(String(WZ.paid).replace(',', '.')) || 0;
    return { span: span, months: months, n: n, amt: amt, total: total, first: first, monthly: months ? total / months : 0 };
  }
  function wzLLDOk(step) {
    var k = wzLLDCalc();
    if (step === 2) return !!(k.span && WZ.unit);
    if (step === 3) return k.total > 0 && !!String(WZ.contract || '').trim() && (k.first <= 0 || !!WZ.by);
    return true;
  }
  function wzLLDHint() {
    var k = wzLLDCalc();
    if (WZ.step === 2) return !k.span ? 'Choisissez la durée' : 'Choisissez le véhicule';
    if (WZ.step === 3) return k.total <= 0 ? 'Saisissez le montant' : !String(WZ.contract || '').trim() ? 'Saisissez le numéro de contrat' : 'Indiquez qui a encaissé le 1er versement';
    return '';
  }
  function wzLLDSummary(k) {
    var per = WZ.period === '15d' ? 'par 15 jours' : 'par mois';
    return '<div class="wz-kv big"><span>Montant total</span><b id="wz-ll-total">' + money(k.total) + '</b></div>'
      + '<div class="wz-kv"><span id="wz-ll-perlbl">' + (WZ.period === 'total' ? 'Soit par mois' : k.n + ' échéance' + (k.n > 1 ? 's' : '') + ' ' + per) + '</span><b id="wz-ll-per">' + (WZ.period === 'total' ? money(k.monthly) : money(k.amt)) + '</b></div>'
      + '<div class="wz-kv"><span>Reste après 1er versement</span><b id="wz-ll-rest" style="color:#C41E3A;">' + money(Math.max(0, k.total - k.first)) + '</b></div>';
  }
  function wzLLDStep() {
    var k = wzLLDCalc(), body = '';
    if (WZ.step === 2) {
      body = '<label class="wz-field"><span>Date de début</span><input type="date" value="' + esc(WZ.start) + '" onchange="maWz(\'start\',this.value)"></label>'
        + '<div class="wz-sec">Durée</div><div class="wz-chips">' + [1, 3, 6, 12, 24].map(function (m) { return '<button type="button" class="' + (WZ.months === m ? 'on' : '') + '" onclick="maWzMonths(' + m + ')">' + m + ' mois</button>'; }).join('') + '</div>'
        + '<label class="wz-field"><span>Fin du contrat' + (WZ.months ? '' : ' (date libre)') + '</span><input type="date" value="' + esc(WZ.end) + '" min="' + esc(WZ.start) + '" onchange="maWzEnd(this.value)"></label>'
        + '<div class="wz-days">' + (k.span ? 'Du ' + esc(llFD(WZ.start)) + ' au ' + esc(llFD(WZ.end)) + ' · ' + k.span + ' jours' : 'Choisissez la durée ou la date de fin') + '</div>';
      if (k.span) body += '<div class="wz-sec">Véhicule</div>' + wzCarsHTML();
      return { body: body, ok: wzLLDOk(2), btn: WZ.unit ? 'Continuer · ' + esc(WZ.unit.model) : 'Continuer' };
    }
    if (WZ.step === 3) {
      var lbl = WZ.period === 'month' ? 'Montant par mois (MAD)' : WZ.period === '15d' ? 'Montant par 15 jours (MAD)' : 'Montant total du contrat (MAD)';
      body = '<div class="wz-seg three">' + [['month', 'Par mois'], ['15d', 'Par 15 jours'], ['total', 'Total']].map(function (x) { return '<button type="button" class="' + (WZ.period === x[0] ? 'on' : '') + '" onclick="maWz(\'period\',\'' + x[0] + '\')">' + x[1] + '</button>'; }).join('') + '</div>'
        + '<div class="wz-note">Choisissez comment le client paie : chaque mois, tous les 15 jours, ou un montant global versé librement.</div>'
        + '<label class="wz-field wz-amt"><span>' + lbl + '</span><input type="number" inputmode="decimal" id="wz-ll-amt" value="' + esc(WZ.amt) + '" placeholder="0" oninput="maWzIn(\'amt\',this.value)"></label>'
        + '<div class="wz-card" id="wz-ll-sum">' + wzLLDSummary(k) + '</div>'
        + wzInput('contract', 'Numéro de contrat', 'text', 'Ex : LLD-2026-001', 'id="wz-contract" autocomplete="off" autocapitalize="characters"')
        + '<div class="wz-sec">Premier versement (facultatif)</div>'
        + wzInput('paid', 'Montant reçu aujourd\'hui (MAD)', 'number', '0', 'inputmode="decimal" id="wz-paid"')
        + '<div class="wz-sec">Mode de paiement</div>' + wzChips('mode', ['Espèces', 'Carte bancaire', 'Virement', 'Chèque'])
        + '<div class="wz-sec">Encaissé par</div>' + wzChips('by', ['Mohamed', 'Younes', 'Khalil'])
        + wzInput('pickup', 'Lieu de remise du véhicule', 'text', 'Ex : Agence Guéliz')
        + wzInput('notes', 'Notes (facultatif)', 'text', '');
      return { body: body, ok: wzLLDOk(3), btn: 'Continuer' };
    }
    // Étape 4 : récapitulatif
    var c0 = WZ.client, name = c0 ? c0.display : (WZ.nf.first + ' ' + WZ.nf.last).trim();
    var partner = (WZ.doc === 'sublease' && WZ.subleaseId && window.ASLSublease) ? ASLSublease.get(WZ.subleaseId) : null;
    var u = WZ.unit || {};
    var per = WZ.period === 'month' ? money(k.amt) + ' / mois' : WZ.period === '15d' ? money(k.amt) + ' / 15 jours' : 'paiement libre';
    var card = function (t, main, sub, step) { return '<div class="wz-card wz-recap"><div class="wz-rh"><span>' + t + '</span><button type="button" class="wz-link" onclick="maWzGoto(' + step + ')">Modifier</button></div><b>' + esc(main) + '</b>' + (sub ? '<small>' + esc(sub) + '</small>' : '') + '</div>'; };
    body = card('Client', name || '—', partner ? 'Via ' + partner.name + ' (sous-location)' : 'Client direct', 1)
      + card('Véhicule', (u.model || '—') + (u.plate ? ' · ' + u.plate : '') + (u.color ? ' · ' + u.color : ''), u.state === 'rented' ? 'Attention : louée actuellement (retour non confirmé)' : (u.state === 'reserved' ? 'Attention : réservée sur ces dates' : 'Disponible'), 2)
      + card('Durée', (WZ.months ? WZ.months + ' mois' : k.span + ' jours'), 'Du ' + llFD(WZ.start) + ' au ' + llFD(WZ.end), 2)
      + card('Montant', money(k.total) + ' · ' + per, (k.first > 0 ? '1er versement ' + money(k.first) + ' · ' + WZ.mode + ' · ' + WZ.by + ' → reste ' + money(Math.max(0, k.total - k.first)) : 'Aucun versement à la création') + ' · Contrat ' + WZ.contract, 3)
      + '<div class="wz-note">Le véhicule sera bloqué (loué) pendant toute la durée du contrat.</div>';
    return { body: body, ok: true, btn: 'Créer le contrat' };
  }
  /* Mise à jour des montants sans reconstruire l'écran (le clavier reste ouvert). */
  function wzLLDLive() {
    var box = document.getElementById('wz-ll-sum'); if (box) box.innerHTML = wzLLDSummary(wzLLDCalc());
    var ok = wzLLDOk(3), b = document.querySelector('#ma-wiz .wz-main'); if (b) b.disabled = !ok;
    var foot = document.querySelector('#ma-wiz .wz-foot'); if (!foot) return;
    var h = foot.querySelector('.wz-hint');
    if (ok) { if (h) h.remove(); return; }
    if (!h) { h = document.createElement('div'); h.className = 'wz-hint'; foot.insertBefore(h, foot.firstChild); }
    h.textContent = wzLLDHint();
  }
  window.maWzMonths = function (m) { if (!WZ) return; WZ.months = m; WZ.end = llAddMonths(WZ.start, m); WZ.unit = null; wzRender(); };
  window.maWzEnd = function (v) { if (!WZ) return; WZ.end = v; WZ.months = 0; if (v) { for (var m = 1; m <= 60; m++) { if (llAddMonths(WZ.start, m) === v) { WZ.months = m; break; } } } WZ.unit = null; wzRender(); };
  window.maWzGoto = function (step) { if (!WZ) return; WZ.step = step; var b = document.getElementById('wz-body'); if (b) b.scrollTop = 0; wzRender(); };

  /* ---------- Documents : coller / galerie / aperçu ---------- */
  function wzAddDocFile(type, file) {
    if (!WZ || !file || !/^image\//.test(file.type || '')) return Promise.resolve();
    if (file.size > 20 * 1024 * 1024) { alert('Image trop volumineuse (max 20 Mo).'); return Promise.resolve(); }
    var p = (typeof _compressImageFile === 'function') ? _compressImageFile(file, 1200, 0.7) : new Promise(function (res) { var r = new FileReader(); r.onload = function (e) { res(e.target.result); }; r.onerror = function () { res(null); }; r.readAsDataURL(file); });
    return p.then(function (url) { if (url && WZ) { WZ.docs[type].push(url); wzRender(); } });
  }
  window.maWzDocPaste = function (ev, type) {
    var items = (ev.clipboardData && ev.clipboardData.items) || [], found = false;
    for (var k = 0; k < items.length; k++) {
      if (items[k].type && items[k].type.indexOf('image') === 0) { var f = items[k].getAsFile(); if (f) { found = true; wzAddDocFile(type, f); } }
    }
    ev.preventDefault();
    if (!found && typeof showToast === 'function') showToast('Aucune image dans le presse-papiers');
  };
  window.maWzDocClip = function (type) {
    if (!navigator.clipboard || !navigator.clipboard.read) {
      if (typeof showToast === 'function') showToast('Appui long sur la zone en pointillés, puis « Coller »');
      return;
    }
    navigator.clipboard.read().then(function (list) {
      var jobs = [];
      list.forEach(function (it) {
        var t = (it.types || []).filter(function (x) { return x.indexOf('image/') === 0; })[0];
        if (t) jobs.push(it.getType(t).then(function (blob) { return wzAddDocFile(type, new File([blob], 'document.' + (t.split('/')[1] || 'png'), { type: t })); }));
      });
      if (!jobs.length && typeof showToast === 'function') showToast('Aucune image copiée — copiez d\'abord l\'image');
      return Promise.all(jobs);
    }).catch(function () {
      if (typeof showToast === 'function') showToast('Collage refusé — appui long sur la zone en pointillés, puis « Coller »');
    });
  };
  window.maWzDocFiles = function (input, type) {
    var files = Array.prototype.slice.call((input && input.files) || []);
    files.reduce(function (pr, f) { return pr.then(function () { return wzAddDocFile(type, f); }); }, Promise.resolve());
    if (input) input.value = '';
  };
  window.maWzDocDel = function (type, i) { if (!WZ) return; WZ.docs[type].splice(i, 1); wzRender(); };
  window.maWzDocView = function (btn) {
    var src = btn && btn.getAttribute('data-src'); if (!src) return;
    var v = document.createElement('div'); v.className = 'wz-viewer'; v.onclick = function () { v.remove(); };
    v.innerHTML = '<img alt="Document"><button type="button" aria-label="Fermer">' + ic('x') + '</button>';
    var img = v.querySelector('img');
    if (typeof aslDocIsRef === 'function' && aslDocIsRef(src) && typeof aslDocResolve === 'function') aslDocResolve(src).then(function (u) { img.src = u; }).catch(function () {});
    else img.src = src;
    (document.getElementById('ma-wiz') || document.body).appendChild(v);
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
    WZ.step = Math.min(WZ.steps || 3, Math.max(1, WZ.step + d));
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
    if (WZ.kind === 'lld') { wzSaveLLD(); return; }
    if (WZ.edit) { wzSaveEdit(); return; }
    var P = 'nl'; // ★ une seule entrée « Nouvelle location » (réservation = départ futur, automatique)
    var c = WZ.client;
    var first = c ? c.first : WZ.nf.first.trim(), last = c ? c.last : WZ.nf.last.trim(), phone = c ? (c.phone || '') : WZ.nf.phone.trim();
    var before = ((ASLDB.getReservations && ASLDB.getReservations()) || []).length;
    try { if (typeof draftClear === 'function') draftClear(P); } catch (e0) {}
    document.body.classList.add('ma-bridging');
    window.openModal('new-location');
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
      wzSet('nl-ref', String(S.contract || '').trim());
      // Documents ajoutés dans l'assistant → même champ que l'ordinateur (collectDocs → fiche client)
      [['nl-doc-permis', S.docs.permis], ['nl-doc-identity', S.docs.identite]].forEach(function (d) {
        var inp = document.getElementById(d[0]);
        if (inp && d[1] && d[1].length) inp.dataset.dataurls = JSON.stringify(d[1]);
      });
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



  /* ---------- Modification d'une location existante : mise à jour directe ----------
     Même règle que la fiche de l'ordinateur (saveRentalChanges) : la même
     réservation est mise à jour (aucune nouvelle location, aucun nouveau
     client), changement de voiture = ancienne unité libérée / nouvelle
     occupée, contrôle de conflit sur les nouvelles dates. Les versements
     déjà enregistrés sont conservés ; un nouveau versement s'ajoute au journal. */
  function wzSaveEdit(force) {
    var S = WZ, r = wzEditRes();
    if (!S || !r || !S.unit) return;
    if (!wzStep3Ok()) return;
    var days = wzDays() || Number(r.days) || 1;
    var total = parseFloat(S.total); if (isNaN(total)) total = Number(r.amount) || 0;
    var ppu = parseFloat(S.ppu) || 0;
    var carChanged = String(S.unit.carId) !== String(r.carId) || (S.unit.plate || '') !== (r.assignedPlate || '');
    var datesChanged = S.start !== String(r.startDate || '').slice(0, 10) || S.end !== String(r.endDate || '').slice(0, 10) || S.startTime !== (r.startTime || '10:00') || S.endTime !== (r.endTime || '10:00');
    var car = fleet().filter(function (c) { return String(c.id) === String(S.unit.carId); })[0];
    if (!force && (carChanged || datesChanged) && car && ASLDB.checkAvailability) {
      var chk = ASLDB.checkAvailability(car, S.start, S.end, S.startTime, S.endTime, { excludeId: r.id });
      if (!chk.available) {
        maConfirm('Conflit détecté', 'Ce véhicule est déjà réservé ou loué sur cette période. Enregistrer quand même ?', 'Enregistrer', function () { wzSaveEdit(true); });
        return;
      }
    }
    var name = (String(S.nf.first || '').trim() + ' ' + String(S.nf.last || '').trim()).trim();
    var patch = {
      client: name, phone: String(S.nf.phone || '').trim(), profession: String(S.nf.profession || '').trim(),
      nationality: String(S.nf.nat || '').trim() || r.nationality || 'N/A',
      contractRef: String(S.contract || '').trim(), pricePerDay: ppu, amount: total,
      startDate: S.start, startTime: S.startTime, endDate: S.end, endTime: S.endTime, days: days,
      pickup: S.pickup || '', notes: S.notes || '',
      subleaseId: S.doc === 'sublease' ? S.subleaseId : '', finalClient: S.doc === 'sublease' ? name : ''
    };
    if (S.edit.clientChanged) patch.email = S.edit.email || '';
    if (carChanged) {
      try { if (r.carId != null && r.assignedPlate && ASLDB.releaseUnit) ASLDB.releaseUnit(r.carId, r.assignedPlate); } catch (e1) {}
      try {
        if (ASLDB.setUnitStatusByPlate && S.unit.plate) ASLDB.setUnitStatusByPlate(S.unit.carId, S.unit.plate, 'active');
        else if (ASLDB.assignUnit) ASLDB.assignUnit(S.unit.carId, 'active');
      } catch (e2) {}
      patch.carId = car ? car.id : S.unit.carId; patch.car = car ? car.name : (S.unit.model || r.car || '');
      patch.assignedPlate = S.unit.plate || ''; patch.assignedColor = S.unit.color || '';
    }
    // Paiement : versements existants conservés, nouveau versement ajouté au journal
    var add = parseFloat(String(S.paid || '').replace(',', '.')) || 0;
    var journal = (typeof aslPaymentJournal === 'function') ? aslJournalClean(aslPaymentJournal(r)) : null;
    if (add > 0 && journal) {
      journal.push({ date: todayISO(), amount: Math.round(add * 100) / 100, mode: S.mode, collectedBy: S.by, comment: 'Encaissé depuis le mobile' });
      patch.payments = journal; patch.paid = aslJournalSum(journal); patch.paymentMode = S.mode; patch.collectedBy = S.by;
    } else if (add > 0) {
      patch.paid = (Number(r.paid) || 0) + add; patch.paymentMode = S.mode; patch.collectedBy = S.by;
    }
    var paidNow = patch.paid != null ? patch.paid : (Number(r.paid) || 0);
    patch.paymentStatus = paidNow <= 0 ? 'Non payé' : (paidNow >= total ? 'Paiement complet' : 'Paiement partiel');
    try { ASLDB.updateReservation(r.id, patch); } catch (e3) { console.error(e3); return; }
    // Documents ajoutés ici → fiche du même client (aucun doublon)
    try {
      if ((S.docs.permis.length || S.docs.identite.length) && typeof saveCustomerDocs === 'function') {
        saveCustomerDocs(patch.email != null ? patch.email : (r.email || ''), name, { permis: S.docs.permis.length ? S.docs.permis : undefined, identite: S.docs.identite.length ? S.docs.identite : undefined });
      }
    } catch (e4) {}
    try { if (typeof reloadData === 'function') reloadData(); } catch (e5) {}
    var ed = S.edit;
    var h = document.getElementById('ma-wiz'); if (h) { h.style.display = 'none'; h.innerHTML = ''; }
    document.body.classList.remove('ma-locked'); WZ = null;
    if (typeof showToast === 'function') showToast('Location mise à jour ✓');
    try { renderScreen(current); } catch (e6) {}
    try { maRentalFiche(ed.id, ed.mode); } catch (e7) {}
  }

  /* ---------- Longue durée : enregistrement par le formulaire LLD existant ----------
     Même principe que la location : l'assistant remplit le pop-up « Nouvelle
     location longue durée » de l'ordinateur (masqué) et lance SON
     enregistrement (type 'lld', 1er versement au journal, documents, synchro).
     Le prix/jour exigé par ce formulaire est déduit du montant total.
     L'échéance choisie (mois / 15 jours / total) est ensuite notée sur le contrat. */
  function wzSaveLLD() {
    var S = WZ, k = wzLLDCalc();
    if (!wzLLDOk(3) || !k.span) return;
    var c = S.client;
    var first = c ? c.first : S.nf.first.trim(), last = c ? c.last : S.nf.last.trim(), phone = c ? (c.phone || '') : S.nf.phone.trim();
    var beforeIds = {}; ((ASLDB.getReservations && ASLDB.getReservations()) || []).forEach(function (r) { beforeIds[r.id] = 1; });
    try { if (typeof draftClear === 'function') draftClear('nl'); } catch (e0) {}
    if (typeof window._buildNewLocationModal !== 'function') { alert('Module Longue durée indisponible.'); return; }
    document.body.classList.add('ma-bridging');
    window._buildNewLocationModal(true);
    setTimeout(function () {
      var days = Math.max(1, Math.round((new Date(S.end) - new Date(S.start)) / 86400000));
      wzSet('nl-doctype', S.doc);
      try { if (typeof nlToggleSublease === 'function') nlToggleSublease(); } catch (e1) {}
      if (S.doc === 'sublease') wzSet('nl-sublease', S.subleaseId);
      wzSet('nl-fn', first); wzSet('nl-ln', last); wzSet('nl-phone', phone);
      wzSet('nl-profession', c ? (c.profession || '') : ''); wzSet('nl-nat', c ? (c.nationality || '') : '');
      wzSet('nl-cust-key', c ? c.key : '', false); wzSet('nl-cust-email', c ? (c.email || '') : '', false); wzSet('nl-cust-nat', c ? (c.nationality || '') : '', false);
      var ok = wzSelectUnit('nl-car', S.unit);
      wzSet('nl-start', S.start); wzSet('nl-start-time', S.startTime || '10:00');
      wzSet('nl-end', S.end); wzSet('nl-end-time', S.endTime || '10:00');
      wzSet('nl-days', String(days));
      wzSet('nl-ppu', String(Math.round(k.total / days * 100) / 100));
      wzSet('nl-paid', k.first > 0 ? String(k.first) : '0');
      wzSet('nl-mode', S.mode); wzSet('nl-collected-by', S.by);
      wzSet('nl-pickup', S.pickup); wzSet('nl-notes', S.notes);
      wzSet('nl-ref', String(S.contract || '').trim());
      [['nl-doc-permis', S.docs.permis], ['nl-doc-identity', S.docs.identite]].forEach(function (d) {
        var inp = document.getElementById(d[0]);
        if (inp && d[1] && d[1].length) inp.dataset.dataurls = JSON.stringify(d[1]);
      });
      var tEl = document.getElementById('nl-total'); if (tEl) tEl.dataset.manual = '1';
      wzSet('nl-total', String(k.total), false);
      if (!ok) {
        document.body.classList.remove('ma-bridging');
        alert('Le véhicule choisi n\'a pas été trouvé dans le formulaire. Réessayez.');
        try { window.closeModal(); } catch (e2) {}
        return;
      }
      try { if (typeof _saveNewLocation === 'function') _saveNewLocation(); } catch (e3) { console.error(e3); }
      setTimeout(function () {
        document.body.classList.remove('ma-bridging');
        var created = ((ASLDB.getReservations && ASLDB.getReservations()) || []).filter(function (r) { return !beforeIds[r.id] && r.type === 'lld'; })[0];
        if (created) {
          try { ASLDB.updateReservation(created.id, { lldPeriod: S.period, lldRate: S.period === 'total' ? k.total : k.amt }); } catch (e4) {}
          try { var ov = document.getElementById('modal-overlay'); if (ov && ov.classList.contains('open')) window.closeModal(); } catch (e5) {}
          try { if (typeof draftClear === 'function') draftClear('nl'); } catch (e6) {}
          maWzClose();
          if (typeof showToast === 'function') showToast('Contrat longue durée créé ✓');
          try { maOpenLLD(created.id); } catch (e7) {}
        } else {
          try { window.closeModal(); } catch (e8) {}
          try { if (typeof draftClear === 'function') draftClear('nl'); } catch (e9) {}
        }
      }, 250);
    }, 160);
  }

  // ★ « Nouvelle réservation » supprimée : même parcours que « Nouvelle location »
  //   (le départ futur classe automatiquement le dossier en « Réservé »).
  window.maNewReservation = function () { wzOpen('location', 'direct'); };
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
      + '<button class="ma-head-back" id="ma-head-back" aria-label="Retour" onclick="maHeadBack()" style="display:none;">' + ic('arrowLeft') + '</button>'
      + '<img class="ma-head-logo" src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAIwAAAAqCAYAAABhhbPNAAAZR0lEQVR4nN18eXxUVZb/99y3VFUqtSQhK4FsBIeEkSVItBEDraLjgIMwCaI2Di7MtG237dJKt0sRR7sB+zeI9nS3u2P/ZvozyU9bx7HBsW1Jqz/FARwbAtKNQFIVEpKQBchS9d67Z/6o9yBkIQmb6Pl8Tl6q6i7n3nvuuWe7DzjHwIBgQHkPUN8DVC4riyOgVKFcsYspANSysjIVwDG0P9MZJIdCoZAoLy9XysrKBvR3rrDMfpaXHxv/MQiFQuIkdb/2EF9sGmTNzyQbDAP2IgxYnPMMCOd0VkYG54wgLq9S6PUbrb1rnrg/4eChEqi6gGVIq6U5wqqi6qkZY40k/9ase763esE1V98aaTzolVJKAJSamupvaWnp9Hg8YvHixf9+//33H7Rpl6MkgwAIABYRwe1246677pq4ZcuWCe3t7WMsywrGYjEWQhAACCEAAHEyBn4+FbAsCwCgKAosy4KiKBBCcE9PDyZMmHD0t7/97StExACkpmm4/fbbp+7cubO0oaFBF0JA0zREo1HKysrq2bRp08tEZJwyMecrcFWVAgCN1dXfOZo/hQ+JJO7QUrlTHcOH9XRud2VwFwV4b/nNB5hZzc/JaVYUhTVNY0VR2Plf0zQuLCj8laqqwOhFMjl/X3755YIr517+07Fjx34aCARibrebVVVlVVVZUZRjz/7Y93unfN86fT8PVb9/GdXGgM/Pc+fOvZ2IEAqF1EgkkjJ58uRqn89n6bp+rL6maSyE4HHjxkWZ2Q8AzHzeSaJTBodZDjPPPvDN+dFG6Ea9SI41wG9E4DfqEDDqKdjbCb9RV3HTm4rfj/ycnK0ADAC99tPBaKLXy4sXL/4rABjszB8CBAAwc8Ls2bMfT0lJ6VCEwgActPr1cy6xR1EUvqT0kuc1TYNNZ3DatGmfOJKmX/kYACM7O7uBmX12+a8HwzAzMSCYWa2/5TsfNQs/14uAGaYAO7if/FwHv9GppXH9Lbc/AwKyM7LeR3whTQBsTxwTkQlAjs3M3M3MCYjrISedLFtfQU1NTd6kSZP+W9M0py2DiCzEF4S/DLT75/z8/F3MPAa21Lz00kuX2nRGiUj2qyMB8Lhx4w5+/RgmFFKZmZp++eKajtQcrkeCERZBDlOA62wMU4DD8Bmd3gz+IlT5FAAUFkz4AH0Yph8aiqLwpZdeupaIhpMyAgBt3Lgxedy4cZ/a9WP9F+HLQJsGM+APRG+99dYLAaCkpERjZpo4ceIbAKS9QQar9/VjGOcoOnTgwDUNJZdZYajmfpEk6ynA9RTgOiXJqhNBGaYA1yPRPJQ0jnc/sup2EgJTL7zwIxyXKExElrMbEZcIls/n6/nud79bZHcnhiBDuN1uFBUVvSmEYCKK4ewywWjKGx6Xm2ddPOtOIkJJSYkGgJiZxo8fv80Z9yB9SACcnZ39pTDMUBN9WsDMhIoKZuaEw3c98ITY+omQIpFIWkQAiMFuq1uoMkaSCAwJK8ELJPsaSAj4EhM1uymy2xPMLBCfNCIiPnLkiPvtt9/+hf39gAmzJY+85pprFu/fv3++lNJgZq1/uTM87hGVIyKLADV7bPbrWz7d8jNmVrdu3WoCgMvl4tOxws42nBWG2bRqlUKaJiOrn3gqceM7RQapFgECRLBIwlIFRRdeV8/Tph1W2ABBQvgS2DvzEkWaJloOHQoDADNbihDIz83/74KCgi22ucuI6y5WXV3dZWVlZTcBsPofTdXV1czMytatW3/U3d3NRDTkWG3JYJ4jjDEzsrKyWn/x7C/vjEajFAqFnCMS9riHnWMiOi/9NKMG5yiKvP/+gua/KOF66OZ+EeR6+LleSZKNSLD2zpzTyszFe+f99cEIdI7Ay3WFU4/U7q3NAYCC/Pz/C4AJ1CNI8MwZM9Yzsyc5Ofko4me7RNyyscaMGdP02muvpQAQjoLrPO+4446pfr/fOcaGPSZ0XWeXy3XsOdj/DjrfDYb9f+9bR9d1TkpK4hUrViwBBlh6pOs6srOzhzyS7HFzUlLSbmY+597eM9ohh0LCPoqywvMW/tz8fIdkkUAkJYgIJE2ZmJyuyKXXPXF0+6eZgV1fpB2FJlWYgjPSSeQVGQDgdrkcn4mQLFEfjpQHg8G7srOzf3a4o/MBS0rTpt1qa2tLf/TRR59QFOWWyspKBQAqKysFALl169Zv9vT0APFJHjBWImJmppSUFGvChAnPeb3eLQBISslCCEgpUVBQkNXU1NTa1dUVA050vA0GTr3+YFkWVFVlIqKcnJwjL774YhUAUV1dbZ3KXEej0aiiKOap1D1v4L2yMhWqgro7732t3ZXCdcJn1ou4JVQnkqwWJMjw3Gv2MTPVPfjwq4dcY2QjBaMH4OK9Vy2s+4I5QABKSkp+jfgOMwDIxMREa9my24pXrFgR8Pt8hxGXGI7UMH0+Hy9btuyyPlaTKoRAcXHxS3YZA4Mrj5bf7zdWrlx5o+MDOYcw2HEyYgmTmJi4fSimPZtwxiQMV1UpVFFh1r34q793/+jR67qi3aYQLpWZIQkQ0pB6+ji1e8FVPwFA1sefTolFj5CpusllKoBLrytwuzoJABF1EJFzllvRaFTdsWPbldu2bXty8uQpv6mt3b6M+ZiUoSNHjqCmpuafpZTTbEaAZVl04YUX5gK2ltxPL2BmC4CanJz81tq1a/9VSqmXlZUNEA01NTUoKys7U9MEAEhLS+OTSZYR6jBnlKaRwhlhGGYWRGQdYp4cvfTKdbKpzpJKokLSsreRkAkw1LaZU/fm3v29V1r+8Iep3sZIQS+YIUGacEFLTW6FaYIAtLe3tzoMQ0Rkmiba2trKqqqqnt62bdvPGxrCN7W3tymI7zgBwGpoaJg8a9ase4QQa6WUmq7rVl5e3knpFkIgFovtlFIKAFxTUzOoiK+pqTkT0zRi+LKYYSRw2lYSM1N1fAe7em7++xf1//+xxxQekLTiJjEUCGmwMT7P9Hz/23cTUa/xWe1SLdwKBaqlSgYpKiN5zGFY8Q0eDAaFbbmAiAQzozcavay8vFxbvXr15pyc8f9iWwmWU8Y0Tblnz55Hn3/++UIAphACLs3V7tjlg5BOUkqoqlrm9XodJVqx50Q5S6iWl5crX2VH2+mb1dXVokJVrf0//adHE9/ccFEPswnQscOVBRiwlOjkCw7j08/S9t77yM3W799fEj3SBil0RUJC8ehEGSmNQFwxyc/P3+x2u+Mum/jkckd7e/LfLlq08sYbb1w6ZcqUDrfb7ZjXYGYiIm5ubnatX79+PTMr0WiUhMAOIcRQAl4BIJubmy8uKSl5lJlVXdctTdOkpmnWmUYhhAXArK6utuzNoDjWXH8YqT/ny4DT4nRbb7Fad+yY2V2+/GPetZ1J8RBJeWK7RCBVg1d3wSAgdvQIAIYUgqXVJeniWdaYt98o8wYCHyMee9IK8gs+27tv70QQMcWdc3C5XBCqCtMwYJrmYNaIlZCQoMybN2/J66+/XnXDDTcseuONN17t6upypMegw3DpLspMT9+VPCYlYklJiqKcsRUjIhZCoLe3tyUQCEQyMzM3P/DAA++Xlpa22haXwPE0DdJ1nVNTU7c1NDRMIyJpOyb7ggQgfD7fjp6enr80za+IoeSI1XbmYHjBki+a4ZL1apLVN7DYFyMIcgQBM4JEY6/wyzoR5Hrym+3eDN73yOPrgbiVZWe9YcE1C25yu1z940km4hbPYNaDY1XI7Ozsug8++MC3ffv2cePGjWtEPP9l0DroY3mcbVQUhb1eL2dmZjbPmDHjqQ0bNuTalo7DFKTrOsaOHTusleTz+bbbaR7nPzAzvVdWpjJzQsODD/+6w5PK9eQzh2KWvlhPAa4TAd4vgjICTYYvu7qFmdP6dUHMrI4fP/5zDBGEc7B//IYIpqKoPGfO5c8JITB16tSVduR3gGndrx2LiMyzhTiennAsAj8+e1zLt264YZFQBMoQTz/9ejJMKKQCQPi/Nn6/s2AKR+AyIiJpWGYJU4AjFOB6EeD9lGAeCo7n8BPrfggA//HMMwnLli0bGwqF/AAUIQQuv/zym+3FHpJh+iMRJAAzKSlFrly58hJmTpo4cWIEAAshRtzO2UTb9DcAcFIwyNdff/0/2JaR+rVjGOdMPcI8uWnOX3U0QDXrlSTZV4LUD8c4StBqhMvad/n8cAdzEgNUUVGxMDk5uWfOnDn/aKdCKsysZGZm7kZcyoz42HDKTp8+fSczu394332zMtLSY/ZvxiijymeTcSwAVnIwyfzB3XfPBeJ62vnMMKOykpiZbH+62rLstvWuDz4MSOHFACX3ZG0QgSyD3WMyhVax8CdBonYBcFNTU87hw4fd4XBYt60ETVEUa/z48as1TSMehelgM7VVW1s7ae7cK25Zu27dhzcsvf7GrMzMLmZWmdmyj6ARt3k2wPZfcVtHu/Lr6up1zKxaluUEFr/6wFVVChQF4Wee+emhMbm8Hz4jIpJHdBTVwx9/ihSrER65/7qldczsCdnOw+nTp68molhhYeGLtiKoIq7LuDMyMuowSikDO28mIyOj/aWXXsolIjz11FMzCwoK3vF6vf3LndU0zBHQbbhcLp47d+63mJmys7M/w3kqYUYMThT6wPZtFzVe+A2OwGWGRbKMYOTMEhZBDsNrHcyaxJHXf3sLABQBuqqqmDJlyjuKonBeXt57juXgWEzf+MY37hmJ4toficgUQvDkyZP/1Zlcj8eDhQsX/k1eXt6rqampbV6vl3VdHzShe7gE7v7fD0jwtv/HccYcilYTgMzNzX3X6/UiMzPzf3CeMsyIRB+HQgKVlQCzv/7aJZs9b75ZGBMehrSOJagM57tkZkAIy8OGcmTBte/nvfFvZdUVFaKiuloyM+bPn39Da2trnt/vD7/77rv/IqUkOzSAffv2BWbNmrX7wIEDqXaEeTRHqeX1epXy8vKrX3755f9C3B9jqqqKt956K+3ZZ5+d0NjYmO92u8d2dnaSYRiDXidxvjvZ94P8RqZp6l1dXQvr6+unWpbFGGTOnaj5mDFjjra0tOSlp6f/Z3Nzc+lX1g/D5eUKdA1196x8/rA3g+vIZ0ZEkCMIcITiz7CDQ0kaEeQGuM2W/CnctOGdK4DjUmsYUIQQmD179ip7t47K0nF8M3l5eX9i5kQAii25zlmol5ndEydOfFMQMWFIF4H0+/y8bt26qWlpae/jPJUww+7U90IhlaqrraY33vqHxP/YcGtnV4cpSFWYGUwAI/6M3xCLbx4GBri3GbASSFO6Ly2tSb/6it9XlZcrKC+XAPDBBx/4LrvssmczMzN/kZeXt/buu+/22NUIAEsp6fHHH//npKSkDgBiNMqqrVjKcDhcePHFF/9ACGHV1NQwAIuZ6Wxfk50wYYKLiHrnzZu3PjHBa8/WoCClZaGxsTGdmYcVG8wMwzDOuXJ8UhZ1otDMnBO5YuH/kXtqJSt+heSJkXkiAnjgVDhHChNByF7qKrxAuu5dsZKIJIdCoqKiQgCwNm7cmL1jx47b29raEAgEIKV8CcCuUChElZWVEoAyd+7clkmTJv28vb39R5ZlOakNIwVhmqb15z//+Yc/XrWqamXokdrQIyEBgIuKirioqIgBYNOmTbxq1aozugibNm3C2LFjVWY+SIpwjqRBjyZmhhk1PU6KhgOO0dR3E6qKKlRVZcQzDU+ZvlWrVp0w5srKSg6FQgNos9dhaGBmqgIUSvQivPzbG9uUgXeKjjnj7KsjQyq7FDA69RSO3PrtKihK/IgD4Ci1S5YsudznTTQB9Ph8PvO2226bDRxPX7SDdLR27dqMYDDYiRMTqEZzNPH0qdM2M7MbZymfeSiYMWPG94dR3C2fN5EffvjhualpqZv60kxEfe9mSQAyKSmpq6qqasK5HANwsl1aXS0qFMWKrP2nh72r1lx1xLIsEpoSH9tx6JPoNPAzEZgEK7JXHM6ZcNT1k8qH8MIvCPaOdqC5uTndMAwA4Fgshh07drj6/m5zt3jooYeaLrjgglc6OzvvtMX2iKWMrTyauz7/fOa11167DMCza9asKZw+fbrb6O4mX2Ii/c/OnS2ZmZn+urq6Izk5Ob709HRXV1fXCe3YdA4Lmqahp6dHNjQ0HH711Vev/fjjj1cZhsEYTHeKS2gBQXJaUVG9IpQT0v/6zq8dmZedHR0Jqx4O/fuDDz54V0lJSbPX602IxWLs9D0crZqmwbIsuXv37tbc3Nzg4cOHYykpKZ4tW7a0lpaWpjn3y3t6euSePXus++67709EZA464U4UuqVuz4zeRbdUdjcfsKB4BEZx/SGu4xAEm9LrCiidFQt+l5aR/qeq8nKFKistIJ6YREQwTXO6EELRNd2jaRoCgcAFAH7X3Nx8TDSGQiFUVlbSzTff/PRjjz22oqOjQ0M/0T6Y6O4LBIie3h75ySefPMbM/2/27NmLnlz/5GozZkRVRVV6ent7VU3VDcMwNE3TVFUVg2TqDTvuPnRwNBo1e3t7PbFYbMDm6kMXM0Ber7f5uuuvj3znnnv0YfoQDPCu3bum71+37n2Px9OrqqrqtD3cPPRtKhqNRnVd1y3LslRVVXt7e3vdbrfHdh6almXpkydPfvu+++5biMFefsDMFIqnGAQjf3PDria4uU4NWOEhjp2T+V7qlCTZCLd1oHROV5S5mAHi0AlmIhERli9ffumMadOunzJ5SkVpaen1ixYtKjw+lyeAomkaiouLX7ZF9Aniva/oHgqJyFRVladMmfICMwfSUtMOYng/yemiOUz7BpGQubn5v/L5fCgsLKzF0FbSAIvpLKEEwCkpKW1r1qy5ADh+G+MEZmE7Iyzy2JpX273pHB4kCj2UznIiBjlMiWZbQibv/cHDPwaAqpFfnh8UHJ3mjjvuKPb7/c4ijFaXYQBmIBDgp59+ev7yby2f70tIdGJM8kzjCOkzExK8vHTpTQuEECgsLPyNXW9ELoQzTa8THE1MTOSlS5cu7Dv3J8B7dhT64O/e/rv2idM5At0Ij9D1P9DvErCa4JFfzJzTyMwJHJdag1kGonzx4u9dPHPmIxdddNHK0tLSB+fMmfPXtlgdTDEVuq5j4sSJr41mUvtNsAVA5ubk/tnr9SI/N/c/6fhlttEy32khxW9G8IQJE95znHSzZ8/+gW0BGYRzHyglIkNVVZ43b97zmqYdM05OgCrbicbMf3Fg3nW9B6CaYSVZniKzcJh8ZmsgmyPrnn4EwDHLqA8QAGzZsiWQkZERUxSFdU1jVVW5oKDgnT7xpBPAzokVN910U6nP5ztlsUxEpn2p/8GDBw9ODQQCPQBMGuVF/dNhGjtPhlNTU7tXr149yRnjCy+8UJSWmhoDYIpz/OIAh6b8/PzNzKxjsDdk9DmKPHUrvvPRIZHIESVoRigQ9+aOIF50DBHksEi2DiJB7r9yfpiZg4zQAOninIcPPfTQpIA/0Iv4WxV6ABhZWVnv2l7MIS/ZM7NeXFz8h76DHOXESABWSkqK2dTUdGFp6SUrNU1nnILEOsW+DQDs9/t7Fi5cOK9P5p2iKAouuuiiVXqfV36cKmOOsp4EYKWlpR158sknJwNDHEVV5eUKiHDwmefXtaflc51INCJqCkdEEkdEkCMiyPVKX0yKowjKeiUo45+d31I4TH6zNTmP96//2beOtd8PHEJWrFhxdcDndwKFJhFxRkbGZ7o+tKHg1F20aNFcj8fDAAzYuSWjQYq/zUFOmlS8gZld2dnZexA/w43RtjVMP06KqJN5x4qicG5ubjgUCs23h+XMESG+IVzTpk2rcsXTVB1GNu225Gj6HkW5mMfj4fLy8ltpqFepOPGc1t/XLG69YIY8CBj18MgI3ByGm8NwDYE6H4CHI33KRODiBnjMVmi859olXzCzZzDpAhx32pWWlv6dIOHsOAvxXbeXmR1fzFCeV8HMoqCg4BOc5o5XVY1XrFix4s477/ymfRvhrKHL5eK0tLSOqVOnrtm8eXOGraudsDDOfDGzevW8eY+mp6e32TrNWUUhBM+aNes3Ho8HGMLHpaKiQjKzf9+99z9JsS7L/MuLFY+qkjzm/ifbr0R9I0UAAT1Hu2PkUjVN14ml7XeRUIzERPZce+W9RNTD5eVKf1c3ANTU1LCiKMjKyipJTkkmKaUKxKO9KSkp6R9++GEKgAN2eIAHoZ2IyLriqqsqO9o6fhmLRU0QOeGsk/og4q89IDsWBslSio8++uj2P/7xjzM3bNjwQktLyzxmNpn5hIUcyo8yZD92ea/Xi4SEhCN+v//zlJSUDcuXL3972bJlkdLSUsC+iNevHtsOOpOIHnnppZeeeeWVVxYePHjw8t7u7kIikdHc0tIteXC/2CnQycyM9PT0pueee+6OoqIispPMBpYF4lLmSEHBxKOTJnUndpke0+/S0dUFaACgxfc+gPg/thPSq6PbOtquG6pHdQs3uuxCXg29zGaW27/TuS80FJ0AeM2aNVlENKa3t5d7enocCs1p06btrqioGNFFdd7H7tqu2tN6qcrOnTs91dXVR6uqqiQAHYCsra09I3Gl4uJiADB0Xec+3leFmeVJ5gfo89ZPAFBVFYZhaACCADpra2vPBHkoLi5muy8n4d6Jd5074HP37pKvUjqjUlZWpg51gW0o6PNe4bOekjHcrcz/BZneKYX2DneFAAAAAElFTkSuQmCC" alt="All Star Loc">'
      + '<div class="ma-head-txt"><h1 id="ma-title">Tableau de bord</h1><div class="ma-greet">Bonjour ' + esc(greet) + '</div><div id="ma-clock" style="font-size:11.5px;color:rgba(255,255,255,.65);font-weight:600;margin-top:2px;">—</div></div>'
      // ★ Bouton "Resynchroniser" (Mobile) — équivalent exact du bouton
      //   Desktop : relit toutes les données depuis la base (lecture
      //   seule, aucune donnée locale n'est écrasée par autre chose que ce
      //   qui existe réellement côté serveur) pour que Mobile affiche
      //   strictement la même chose que Desktop en un clic.
      + '<button class="ma-head-btn" id="ma-resync-btn" aria-label="Resynchroniser" title="Resynchroniser depuis le serveur" onclick="maResyncData()">' + ic('refresh') + '</button>'
      + '<button class="ma-head-btn" aria-label="Notifications" onclick="maToggleNotifications()">' + ic('bell') + '<span class="ma-dot" id="ma-head-dot" style="display:none;"></span></button></div>'
      + screen('dashboard') + screen('vehicles') + screen('available') + screen('reserved') + screen('activites') + screen('reservations') + screen('rentals')
      + screen('returns') + screen('late') + screen('clients') + screen('sublease') + screen('lld') + screen('maintenance') + screen('unpaid') + screen('revenue') + screen('caisse') + screen('notifications') + screen('history');
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

    var titles = { history: 'Historique', dashboard: 'Tableau de bord', vehicles: 'Véhicules', available: 'Disponibles', reserved: 'Véhicules réservés', activites: 'Activités du jour', reservations: 'Réservations', rentals: 'Véhicules loués', returns: "Retours aujourd'hui", late: 'En retard', clients: 'Clients', sublease: 'Sous-location', lld: 'Location longue durée', maintenance: 'Entretien', unpaid: 'Impayés', revenue: 'Caisse', caisse: 'Caisse', notifications: 'Notifications' };
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
