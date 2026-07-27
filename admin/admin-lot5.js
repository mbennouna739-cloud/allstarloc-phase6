/* ============================================================
   ALL STAR LOC — LOT 5 FINAL
   admin-lot5.js  — Nouveaux modules + fonctions remplacées
   Chargé APRÈS le script inline → remplace/étend les fonctions.
   Aucun template literal dans les innerHTML dynamiques.
   ============================================================ */

/* ==================== UTILITAIRES ==================== */

function fmtMAD(n) {
  return (Number(n) || 0).toLocaleString('fr-FR') + ' MAD';
}

function showToast(msg) {
  var t = document.getElementById('_asl5t');
  if (!t) {
    t = document.createElement('div');
    t.id = '_asl5t';
    t.style.cssText = [
      'position:fixed', 'bottom:22px', 'right:22px', 'z-index:99999',
      'background:#16a34a', 'color:#fff', 'border-radius:12px',
      'padding:13px 22px', 'font-size:14px', 'font-weight:700',
      'font-family:inherit', 'box-shadow:0 6px 24px rgba(22,163,74,.35)',
      'display:flex', 'align-items:center', 'gap:10px',
      'transition:all .3s', 'max-width:380px',
      'opacity:0', 'transform:translateY(20px)', 'pointer-events:none'
    ].join(';');
    document.body.appendChild(t);
  }
  t.innerHTML = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg><span>' + (msg || 'Enregistré et synchronisé ✓') + '</span>';
  t.style.opacity = '1';
  t.style.transform = 'translateY(0)';
  clearTimeout(t._h);
  t._h = setTimeout(function () { t.style.opacity = '0'; t.style.transform = 'translateY(20px)'; }, 4000);
}

function aslFleet() {
  try { return (typeof ASLDB !== 'undefined' && ASLDB.getFleet) ? ASLDB.getFleet() : (typeof FLEET !== 'undefined' ? FLEET : []); } catch(e) { return []; }
}
function aslRes() {
  try { return (typeof ASLDB !== 'undefined' && ASLDB.getReservations) ? ASLDB.getReservations() : (typeof RESERVATIONS !== 'undefined' ? RESERVATIONS : []); } catch(e) { return []; }
}
function todayStr() {
  // ★ CORRECTIF FUSEAU HORAIRE : l'ancien code faisait
  //   `new Date().toISOString().slice(0,10)`, qui convertit en UTC et
  //   décale "aujourd'hui" d'un jour en arrière dans tout fuseau en avance
  //   sur UTC (Maroc, Europe...) — retardant d'une journée le passage
  //   "Réservé" → "Loué" et faussant "retours aujourd'hui"/"en retard".
  if (typeof ASLDB !== 'undefined' && ASLDB.localDateISO) return ASLDB.localDateISO();
  var d = new Date();
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
}
function statusBadge(code) {
  var map = { pending:{l:'En attente',c:'badge-yellow'}, confirmed:{l:'Confirmée',c:'badge-blue'}, active:{l:'En cours',c:'badge-green'}, completed:{l:'Terminée',c:'badge-gray'}, cancelled:{l:'Annulée',c:'badge-red'} };
  var s = map[code] || {l: code || '', c: 'badge-gray'};
  return '<span class="badge ' + s.c + '">● ' + s.l + '</span>';
}

/* ==================== BADGES ==================== */

function updateBadges() {
  try {
    var res = aslRes();
    // ★ CORRECTIF (item 3) : le badge de la barre latérale doit correspondre
    //   exactement à ce qu'affiche par défaut la page "Réservations" (phase
    //   réelle 'reserved' — date+heure+fuseau), pas seulement au statut brut
    //   'pending'. Sans ce correctif, le badge pouvait indiquer 0 alors que
    //   la page listait des réservations (incohérence signalée).
    function phaseOf(r) { return (typeof ASLDB !== 'undefined' && ASLDB.computePhase) ? ASLDB.computePhase(r) : r.status; }
    var pending = res.filter(function(r) { return phaseOf(r) === 'reserved'; }).length;
    var el = document.getElementById('badge-res');
    if (el) el.textContent = pending;

    var active = res.filter(function(r) { return phaseOf(r) === 'active'; }).length;
    el = document.getElementById('badge-rentals');
    if (el) { el.textContent = active; el.style.display = active ? '' : 'none'; }

    var MAINT = {};
    try { MAINT = JSON.parse(localStorage.getItem('asl_maint_v1') || '{}'); } catch(e) {}
    var today = new Date(); today.setHours(0,0,0,0);
    var mc = 0;
    Object.keys(MAINT).forEach(function(id) {
      var m = MAINT[id] || {};
      // Rappel vidange dû (20j) + visite technique proche
      if (m.reminder_next) {
        var dr = Math.round((new Date(m.reminder_next) - today) / 86400000);
        if (dr <= 0) mc++;
      }
      if (m.vt_next) {
        var dv = Math.round((new Date(m.vt_next) - today) / 86400000);
        if (dv <= 7) mc++;
      }
    });
    el = document.getElementById('badge-maint');
    if (el) { el.textContent = mc; el.style.display = mc ? '' : 'none'; }
  } catch(e) {}
}

/* ==================== DASHBOARD (remplace l'ancienne version) ==================== */

/* Prochaine réservation future d'un véhicule disponible aujourd'hui
   (utilisé pour afficher « Réservée du .. au .. »). */
function nextFutureReservation(car, res, ts) {
  var future = res.filter(function(r) {
    if (r.status === 'cancelled' || r.status === 'completed') return false;
    if (!(r.car === car.name || r.carId === car.id || r.assignedPlate === car.plate)) return false;
    return (r.startDate || '') > ts; // commence après aujourd'hui
  }).sort(function(a, b) { return String(a.startDate||'').localeCompare(String(b.startDate||'')); });
  return future[0] || null;
}
function fmtD(d) {
  if (!d) return '';
  var p = String(d).slice(0,10).split('-');
  return p.length === 3 ? (p[2] + '/' + p[1]) : d;
}

/* ★ CORRECTIF (points 5-7) — Nom de la sous-location liée à une réservation
   (r.subleaseId), à afficher en tout premier dans les pop-up concernées. */
function subLeaseNameFor(r) {
  try {
    if (!r || !r.subleaseId || typeof ASLSublease === 'undefined' || !ASLSublease.get) return '';
    var s = ASLSublease.get(r.subleaseId);
    return s ? s.name : '';
  } catch (e) { return ''; }
}

/* ============================================================
   ★ CORRECTIF (point 8) — Conservation automatique des brouillons de
   pop-up (Nouvelle réservation / Nouvelle location / LLD).
   Le formulaire est sauvegardé en continu pendant la saisie (localStorage),
   restauré automatiquement à la réouverture, et n'est effacé QUE lors d'une
   annulation volontaire ou d'un enregistrement réussi — jamais lors d'une
   simple fermeture accidentelle du pop-up.
   ============================================================ */
function _draftKey(formId) { return 'asl_draft_' + formId + '_v1'; }

function draftSave(formId, fieldIds) {
  var data = {};
  var hasContent = false;
  fieldIds.forEach(function (id) {
    var el = document.getElementById(id);
    if (el && el.value) { data[id] = el.value; hasContent = true; }
  });
  try {
    if (hasContent) localStorage.setItem(_draftKey(formId), JSON.stringify(data));
    else localStorage.removeItem(_draftKey(formId)); // formulaire vidé manuellement = plus rien à conserver
  } catch (e) {}
}

function draftRestore(formId, fieldIds) {
  var restored = false;
  try {
    var raw = localStorage.getItem(_draftKey(formId));
    if (!raw) return false;
    var data = JSON.parse(raw);
    fieldIds.forEach(function (id) {
      var el = document.getElementById(id);
      if (el && data[id] != null && data[id] !== '') { el.value = data[id]; restored = true; }
    });
  } catch (e) {}
  return restored;
}

function draftClear(formId) {
  try { localStorage.removeItem(_draftKey(formId)); } catch (e) {}
}

/* Attache la sauvegarde automatique du brouillon à TOUS les champs d'un
   formulaire (délégation d'événement sur le conteneur) — appelé une fois
   à l'ouverture de chaque pop-up concerné. */
function draftWatch(formId, containerEl, fieldIds) {
  if (!containerEl || containerEl.dataset.draftWatching) return;
  containerEl.dataset.draftWatching = '1';
  var debounce = null;
  ['input', 'change'].forEach(function (evt) {
    containerEl.addEventListener(evt, function () {
      clearTimeout(debounce);
      debounce = setTimeout(function () { draftSave(formId, fieldIds); }, 250);
    });
  });
}

function renderDashboard() {
  try {
    var fleet = aslFleet();
    var res = aslRes();
    var ts = todayStr();
    var now = new Date();
    // ★ CORRECTIF : phase réelle (reserved/active/late) calculée via
    //   ASLDB.computePhase — date + heure + fuseau local réels — au lieu de
    //   comparer uniquement des chaînes de date (qui retardait "Loué" d'un
    //   jour et ne tenait jamais compte de l'heure de départ/retour).
    function phase(r) { return (typeof ASLDB !== 'undefined' && ASLDB.computePhase) ? ASLDB.computePhase(r, now) : r.status; }

    // Compter les UNITÉS réellement disponibles (un modèle « Stock 2 »
    // compte pour 2). On utilise modelAvailability si présent, sinon repli.
    function _avUnits(c) {
      try {
        if (typeof ASLDB !== 'undefined' && ASLDB.modelAvailability) return ASLDB.modelAvailability(c).available;
      } catch (e) {}
      return (c.status === 'available') ? Math.max(1, parseInt(c.stock) || 1) : 0;
    }
    var availUnitsTotal = fleet.reduce(function (s, c) { return s + _avUnits(c); }, 0);
    var avail    = fleet.filter(function(c) { return c.status === 'available'; });
    var rented   = res.filter(function(r) { return phase(r) === 'active'; });
    var reserved = res.filter(function(r) { return phase(r) === 'reserved'; });
    var returns  = res.filter(function(r) { return (r.endDate||'').slice(0,10) === ts && r.status !== 'cancelled' && r.status !== 'completed'; });
    var late     = res.filter(function(r) { return phase(r) === 'late'; });
    var unpaid   = res.filter(function(r) { if (r.status === 'cancelled') return false; return (Number(r.amount)||0) > (Number(r.paid)||0); });

    function setV(id, val, col) {
      var el = document.getElementById(id);
      if (el) { el.textContent = val; if (col) el.style.color = col; }
    }
    setV('dash-available', availUnitsTotal, availUnitsTotal ? '#22c55e'    : '');
    setV('dash-rented',    rented.length,  rented.length  ? '#3b82f6'    : '');
    setV('dash-reserved',  reserved.length, reserved.length ? '#8b5cf6'  : '');
    setV('dash-returns',   returns.length, returns.length ? '#f59e0b'    : '');
    setV('dash-late',      late.length,    late.length    ? 'var(--red)' : '');
    setV('dash-unpaid',    unpaid.length,  unpaid.length  ? '#ef4444'    : '');

    var tbody = document.getElementById('dashboard-reservations');
    if (tbody) {
      // ★ CORRECTIF (point 2) : une réservation annulée ne doit plus
      //   apparaître dans l'activité récente du Dashboard.
      var recent = res.filter(function(r) { return r.status !== 'cancelled'; }).sort(function(a,b) {
        return String(b.createdAt||b.startDate||'').localeCompare(String(a.createdAt||a.startDate||''));
      }).slice(0,7);
      if (!recent.length) {
        tbody.innerHTML = '<tr><td colspan="8" style="text-align:center;padding:32px;color:var(--text3);">Aucune réservation — les réservations du site client apparaîtront ici automatiquement.</td></tr>';
      } else {
        // ★ Item 2 : provenance du client (Site Web / Réservation manuelle / ...)
        var ORIGIN_LABELS_DASH = {
          online: 'Site Web', manual: 'Réservation manuelle', phone: 'Téléphone',
          whatsapp: 'WhatsApp', partner: 'Partenaire', gbp: 'Google Business Profile',
          facebook: 'Facebook', instagram: 'Instagram'
        };
        tbody.innerHTML = recent.map(function(r) {
          var originLabel = ORIGIN_LABELS_DASH[r.source] || r.source || '—';
          return '<tr>' +
            '<td><strong>' + (r.contractRef || r.id || '') + '</strong></td>' +
            '<td>' + (r.client || '') + '</td>' +
            '<td style="font-size:12px;color:var(--text2);">' + (r.car || '') + '</td>' +
            '<td style="font-size:12px;">' + (r.startDate||'') + (r.endDate ? ' → '+r.endDate : '') + '</td>' +
            '<td><span class="badge badge-gray" style="font-size:11px;">' + originLabel + '</span></td>' +
            '<td><strong>' + (r.amount||0) + ' MAD</strong></td>' +
            '<td>' + statusBadge(r.status) + '</td>' +
            '<td><button class="btn-sm ghost" data-rid="' + r.id + '" onclick="viewRes(this.dataset.rid)">&#128065;</button></td>' +
            '</tr>';
        }).join('');
      }
    }
    updateBadges();
  } catch(e) { console.error('renderDashboard:', e); }
}

/* ==================== DASHBOARD DRAWER ==================== */

/* Filtres du panneau "Retours prévus" : aujourd'hui / demain / date choisie. */
function setReturnsFilter(mode) {
  var ts = todayStr();
  window._returnsFilter = { mode: mode, date: (window._returnsFilter && window._returnsFilter.date) || ts };
  openDashDrawer('returns');
}
function setReturnsDate(d) {
  window._returnsFilter = { mode: 'date', date: d };
  openDashDrawer('returns');
}
/* ★ Point 7 — Recherche rapide dans les retours. Le tiroir se reconstruit
   entièrement à chaque frappe (comme les autres filtres) ; on restaure donc
   le focus et la position du curseur du champ de recherche juste après,
   pour ne jamais interrompre la saisie. */
function setReturnsSearch(q) {
  window._returnsSearchQuery = q;
  openDashDrawer('returns');
  var input = document.getElementById('returns-search');
  if (input) {
    input.focus();
    var pos = q.length;
    try { input.setSelectionRange(pos, pos); } catch (e) {}
  }
}

function openDashDrawer(type) {
  var fleet = aslFleet();
  var res = aslRes();
  var ts = todayStr();
  var today = new Date(); today.setHours(0,0,0,0);
  var title = '', rows = [];

  if (type === 'available') {
    title = '🟢 Véhicules disponibles';
    fleet.filter(function(c) { return c.status === 'available'; }).forEach(function(c) {
      var units = [];
      try { if (typeof ASLDB !== 'undefined' && ASLDB.normalizeUnits) units = ASLDB.normalizeUnits(c); } catch(e) {}
      if (!units || !units.length) units = [{ plate: c.plate||'', color: c.color||'', status: c.status||'available' }];
      var availUnits = units.filter(function(u) { return !u.status || u.status === 'available'; });
      availUnits.forEach(function(u) {
        var plateLabel = u.plate || '';
        if (u.color) plateLabel += (plateLabel ? ' — ' : '') + u.color;
        var future = nextFutureReservation(c, res, ts);
        rows.push(
          '<div style="display:flex;justify-content:space-between;align-items:center;padding:12px 0;border-bottom:1px solid var(--border);gap:10px;">'
          + '<div style="min-width:0;">'
          + '<div style="font-weight:700;">' + c.name + '</div>'
          + '<div style="font-size:12px;color:var(--text3);">' + (plateLabel||'') + (plateLabel && c.fuel ? ' · ' : '') + (c.fuel||'') + (c.transmission ? ' · ' + c.transmission : '') + '</div>'
          + (future ? '<div style="font-size:12px;color:#d97706;margin-top:2px;">Réservée du ' + fmtD(future.startDate) + ' au ' + fmtD(future.endDate) + '</div>' : '')
          + '</div>'
          + '<div style="text-align:right;flex-shrink:0;"><span class="badge badge-green">● Disponible</span></div>'
          + '</div>'
        );
      });
    });
    if (!rows.length) rows.push('<div style="color:var(--text3);text-align:center;padding:30px;">Aucun véhicule disponible en ce moment</div>');

  } else if (type === 'rented') {
    title = '🔵 Véhicules loués actuellement';
    // ★ CORRECTIF : phase réelle (date+heure+fuseau), plus l'ancien filtre
    //   "date seule" qui retardait d'un jour le passage en "Loué".
    res.filter(function(r) { return (typeof ASLDB !== 'undefined' && ASLDB.computePhase) ? ASLDB.computePhase(r) === 'active' : ((r.status==='active'||r.status==='confirmed') && (r.startDate||'')<=ts && (r.endDate||'')>=ts); }).forEach(function(r) {
      var plateColor = '';
      if (r.assignedPlate) {
        plateColor = r.assignedPlate + (r.assignedColor ? ' — ' + r.assignedColor : '');
      } else {
        var fc2 = fleet.filter(function(c){ return c.name===r.car || c.id===r.carId; })[0];
        if (fc2) plateColor = (fc2.plate||'') + (fc2.color ? ' — ' + fc2.color : '');
      }
      // ★ Vue rapide (item 7) : uniquement la DATE+HEURE DE RETOUR, sans la
      //   date de départ ni les autres détails (disponibles dans la fiche).
      rows.push(
        '<div style="display:flex;justify-content:space-between;align-items:center;padding:12px 0;border-bottom:1px solid var(--border);gap:10px;">'
        + '<div style="min-width:0;">'
        + (subLeaseNameFor(r) ? '<div style="font-size:10.5px;color:#8b5cf6;font-weight:700;text-transform:uppercase;letter-spacing:.3px;">' + subLeaseNameFor(r) + '</div>' : '')
        + '<div style="font-weight:700;">' + (r.car||'') + '</div>'
        + (plateColor ? '<div style="font-size:12px;color:var(--text3);">🚗 ' + plateColor + '</div>' : '')
        + '<div style="font-size:13px;margin-top:2px;">Retour :<br><strong>' + fmtD(r.endDate||'') + (r.endTime ? ' à ' + r.endTime : '') + '</strong></div>'
        + '</div>'
        + '<div style="flex-shrink:0;"><button class="btn-sm ghost" data-rid="' + r.id + '" onclick="setDashReturnContext(\'rented\');closeDashDrawer();viewRental(this.dataset.rid,\'rented\')">Fiche →</button></div>'
        + '</div>'
      );
    });
    if (!rows.length) rows.push('<div style="color:var(--text3);text-align:center;padding:30px;">Aucune location active à ce jour</div>');

  } else if (type === 'reserved') {
    title = '🟣 Véhicules réservés';
    // ★ Vue rapide (item 7) : uniquement la DATE+HEURE DE DÉPART.
    res.filter(function(r) { return (typeof ASLDB !== 'undefined' && ASLDB.computePhase) ? ASLDB.computePhase(r) === 'reserved' : ((r.status==='confirmed'||r.status==='reserved'||r.status==='pending') && (r.startDate||'')>ts); }).forEach(function(r) {
      var plateColor = '';
      if (r.assignedPlate) {
        plateColor = r.assignedPlate + (r.assignedColor ? ' — ' + r.assignedColor : '');
      } else {
        var fc3 = fleet.filter(function(c){ return c.name===r.car || c.id===r.carId; })[0];
        if (fc3) plateColor = (fc3.plate||'') + (fc3.color ? ' — ' + fc3.color : '');
      }
      rows.push(
        '<div style="display:flex;justify-content:space-between;align-items:center;padding:12px 0;border-bottom:1px solid var(--border);gap:10px;">'
        + '<div style="min-width:0;">'
        + (subLeaseNameFor(r) ? '<div style="font-size:10.5px;color:#8b5cf6;font-weight:700;text-transform:uppercase;letter-spacing:.3px;">' + subLeaseNameFor(r) + '</div>' : '')
        + '<div style="font-weight:700;">' + (r.car||'') + '</div>'
        + (plateColor ? '<div style="font-size:12px;color:var(--text3);">🚗 ' + plateColor + '</div>' : '')
        + '<div style="font-size:13px;margin-top:2px;">Départ :<br><strong>' + fmtD(r.startDate||'') + (r.startTime ? ' à ' + r.startTime : '') + '</strong></div>'
        + '</div>'
        + '<div style="flex-shrink:0;"><button class="btn-sm primary" data-rid="' + r.id + '" onclick="setDashReturnContext(\'reserved\');closeDashDrawer();viewRes(this.dataset.rid)">Fiche →</button></div>'
        + '</div>'
      );
    });
    if (!rows.length) rows.push('<div style="color:var(--text3);text-align:center;padding:30px;">Aucune réservation en attente de départ</div>');

  } else if (type === 'returns') {
    title = '🟡 Retours prévus';
    // Filtres : aujourd'hui (défaut) / demain / date choisie
    var rf = window._returnsFilter || { mode: 'today', date: ts };
    var targetDate = ts;
    if (rf.mode === 'tomorrow') {
      var tm = new Date(today.getTime() + 86400000);
      targetDate = (typeof ASLDB !== 'undefined' && ASLDB.localDateISO) ? ASLDB.localDateISO(tm) : tm.toISOString().slice(0, 10);
    } else if (rf.mode === 'date' && rf.date) {
      targetDate = rf.date;
    }
    // Barre de filtres
    rows.push(
      '<div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:14px;align-items:center;">' +
      '<button class="btn-sm ' + (rf.mode==='today'?'primary':'ghost') + '" onclick="setReturnsFilter(\'today\')">Aujourd\'hui</button>' +
      '<button class="btn-sm ' + (rf.mode==='tomorrow'?'primary':'ghost') + '" onclick="setReturnsFilter(\'tomorrow\')">Demain</button>' +
      '<button class="btn-sm ' + (rf.mode==='date'?'primary':'ghost') + '" onclick="setReturnsFilter(\'date\')">Date choisie</button>' +
      (rf.mode==='date' ? '<input type="date" value="' + (rf.date||ts) + '" onchange="setReturnsDate(this.value)" style="padding:6px 8px;border:1px solid var(--border);border-radius:7px;font-size:13px;">' : '') +
      '</div>'
    );
    // ★ Point 7 : recherche rapide (nom client / modèle / immatriculation),
    //   filtrage instantané à la frappe.
    rows.push(
      '<div class="search-bar" style="margin-bottom:12px;"><span style="display:flex;align-items:center;"><svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg></span>' +
      '<input id="returns-search" placeholder="Rechercher : client, véhicule, immatriculation…" value="' + ((window._returnsSearchQuery||'').replace(/"/g,'&quot;')) + '" oninput="setReturnsSearch(this.value)"></div>'
    );
    var searchQ = (window._returnsSearchQuery || '').trim().toLowerCase();
    var matches = res.filter(function(r) { return (r.endDate||'').slice(0,10)===targetDate && r.status!=='cancelled' && r.status!=='completed'; });
    if (searchQ) {
      matches = matches.filter(function(r) {
        var fc2 = fleet.filter(function(c){ return c.name===r.car || c.id===r.carId; })[0];
        var plateSearch = (r.assignedPlate || (fc2 && fc2.plate) || '').toLowerCase();
        return (r.client||'').toLowerCase().indexOf(searchQ) >= 0 ||
               (r.car||'').toLowerCase().indexOf(searchQ) >= 0 ||
               plateSearch.indexOf(searchQ) >= 0;
      });
    }
    matches.forEach(function(r) {
      // Récupérer l'immatriculation depuis la flotte
      var plate = '';
      var fc = fleet.filter(function(c){ return c.name===r.car || c.id===r.carId; })[0];
      if (fc) plate = fc.plate || '';
      if (r.assignedPlate) plate = r.assignedPlate;
      var retColor = (r.assignedColor || (fc && fc.color) || '');
      var plateWithColor = plate + (retColor ? ' — ' + retColor : '');
      rows.push(
        '<div style="display:flex;justify-content:space-between;align-items:center;padding:12px 0;border-bottom:1px solid var(--border);gap:10px;">' +
        '<div style="min-width:0;"><div style="font-weight:700;">' + (r.car||'') + '</div>' +
        '<div style="font-size:12px;color:var(--text3);">' + (plateWithColor ? '🚗 ' + plateWithColor + ' · ' : '') + (r.client||'') + '</div>' +
        '<div style="font-size:12px;">Retour prévu : <strong>' + (r.endDate||'') + '</strong>' + (r.endTime ? ' à <strong>' + r.endTime + '</strong>' : '') + '</div></div>' +
        '<div style="flex-shrink:0;"><button class="btn-sm primary" data-rid="' + r.id + '" onclick="setDashReturnContext(\'returns\', window._returnsFilter);closeDashDrawer();viewRental(this.dataset.rid,\'returns\')">Fiche →</button></div>' +
        '</div>'
      );
    });
    if (!matches.length) rows.push('<div style="color:#22c55e;text-align:center;padding:30px;">✓ ' + (searchQ ? 'Aucun résultat pour « ' + String(searchQ).replace(/</g,'&lt;').replace(/>/g,'&gt;') + ' »' : 'Aucun retour prévu pour cette date') + '</div>');

  } else if (type === 'late') {
    title = '🔴 Retards (date et heure de retour dépassées)';
    // ★ CORRECTIF : phase réelle (date+heure+fuseau) — un véhicule n'est en
    //   retard QUE si l'heure de retour est réellement dépassée et que le
    //   retour n'a pas été confirmé.
    res.filter(function(r) { return (typeof ASLDB !== 'undefined' && ASLDB.computePhase) ? ASLDB.computePhase(r) === 'late' : ((r.endDate||'')<ts && (r.status==='active'||r.status==='confirmed')); }).forEach(function(r) {
      var end = new Date((r.endDate||'') + 'T' + (r.endTime || '12:00'));
      var diffMs = new Date() - end;
      var diff = Math.max(0, Math.round(diffMs / 3600000));
      var diffLabel = diff >= 24 ? (Math.floor(diff/24) + ' j ' + (diff%24) + ' h') : (diff + ' h');
      rows.push(
        '<div style="padding:12px 0;border-bottom:1px solid var(--border);">' +
        '<div style="display:flex;justify-content:space-between;align-items:flex-start;gap:10px;">' +
        '<div style="min-width:0;">' +
        '<div style="font-weight:700;color:var(--red);">' + (r.car||'') + ' — ' + diffLabel + ' de retard</div>' +
        '<div style="font-size:12px;color:var(--text3);">' + (r.client||'') + ' — devait revenir le ' + fmtD(r.endDate||'') + (r.endTime ? ' à ' + r.endTime : '') + '</div>' +
        '</div>' +
        // ★ Point 4 : "En retard" devient l'endroit principal pour gérer un
        //   retour — la fiche ouvre désormais Confirmer le retour + Prolonger.
        '<div style="flex-shrink:0;"><button class="btn-sm primary" data-rid="' + r.id + '" onclick="setDashReturnContext(\'late\');closeDashDrawer();viewRental(this.dataset.rid,\'late\')">Fiche →</button></div>' +
        '</div>' +
        (r.phone ? '<a href="tel:'+r.phone+'" class="btn-sm ghost" style="text-decoration:none;margin-top:6px;display:inline-block;">📞 Appeler</a>' : '') +
        '</div>'
      );
    });
    if (!rows.length) rows.push('<div style="color:#22c55e;text-align:center;padding:30px;">✓ Aucun retard — tout est à l\'heure</div>');

  } else if (type === 'unpaid') {
    title = '💳 Dossiers avec impayés';
    res.filter(function(r) { if(r.status==='cancelled') return false; return (Number(r.amount)||0)>(Number(r.paid)||0); }).forEach(function(r) {
      var reste = (Number(r.amount)||0) - (Number(r.paid)||0);
      var slName = subLeaseNameFor(r);
      rows.push(
        '<div style="display:flex;justify-content:space-between;align-items:center;padding:12px 0;border-bottom:1px solid var(--border);">' +
        '<div>' + (slName ? '<div style="font-size:10.5px;color:#8b5cf6;font-weight:700;text-transform:uppercase;letter-spacing:.3px;">' + slName + '</div>' : '') +
        '<div style="font-weight:700;">' + (r.client||'') + '</div>' +
        '<div style="font-size:12px;color:var(--text3);">' + (r.car||'') + ' · ' + (r.contractRef||r.id) + '</div></div>' +
        '<div style="text-align:right;"><strong style="color:#ef4444;">' + fmtMAD(reste) + ' restant</strong><br>' +
        '<button class="btn-sm ghost" data-rid="' + r.id + '" onclick="setDashReturnContext(\'unpaid\');closeDashDrawer();viewUnpaidFiche(this.dataset.rid)">Voir →</button></div>' +
        '</div>'
      );
    });
    if (!rows.length) rows.push('<div style="color:#22c55e;text-align:center;padding:30px;">✓ Aucun impayé — tous les dossiers sont soldés</div>');
  }

  var bg = document.getElementById('dash-drawer-bg');
  var dr = document.getElementById('dash-drawer');
  var ti = document.getElementById('dash-drawer-title');
  var bo = document.getElementById('dash-drawer-body');
  if (!dr) return;
  ti.textContent = title;
  bo.innerHTML = rows.join('');
  bg.style.display = 'block';
  dr.style.display = 'flex';
  dr.style.transform = 'translateX(0)';
}

function closeDashDrawer() {
  var bg = document.getElementById('dash-drawer-bg');
  var dr = document.getElementById('dash-drawer');
  if (bg) bg.style.display = 'none';
  if (dr) { dr.style.transform = 'translateX(100%)'; setTimeout(function(){ dr.style.display = 'none'; dr.style.transform = ''; }, 280); }
}

/* ==================== ENTRETIEN VEHICULES ==================== */

var _maintCarId = null;

function renderMaintenance() {
  try {
    var fleet = aslFleet();
    var MAINT = {};
    try { MAINT = JSON.parse(localStorage.getItem('asl_maint_v1') || '{}'); } catch(e) {}
    var today = new Date(); today.setHours(0,0,0,0);

    function diffD(dateStr) {
      if (!dateStr) return null;
      var d = new Date(dateStr); if (isNaN(d)) return null;
      return Math.round((d - today) / 86400000);
    }
    function dateCell(dateStr) {
      if (!dateStr) return '<span style="color:var(--text3);">—</span>';
      var dd = diffD(dateStr);
      var cls = dd < 0 ? 'badge-red' : dd <= 7 ? 'badge-yellow' : 'badge-green';
      var txt = dd < 0 ? Math.abs(dd)+'j retard' : dd === 0 ? 'Aujourd\'hui' : dd+'j';
      return '<span class="badge ' + cls + '">● ' + txt + '</span><br><span style="font-size:11px;color:var(--text3);">' + dateStr + '</span>';
    }

    /* Barre alertes : rappels de vérification vidange dus (tous les 20 jours) */
    var alerts = [];
    fleet.forEach(function(c) {
      var m = MAINT[String(c.id)] || {};
      if (m.reminder_next) {
        var dd = diffD(m.reminder_next.slice(0,10));
        if (dd !== null && dd <= 0) alerts.push({ car: c.name, km: m.km_vidange_next });
      }
    });
    var bar = document.getElementById('maint-alerts-bar');
    if (bar) {
      if (alerts.length) {
        var atxt = alerts.map(function(a) {
          return '<span style="color:#d97706;font-weight:600;">' + a.car + ' — vérifier le km' + (a.km ? ' (vidange prévue à ' + Number(a.km).toLocaleString('fr-FR') + ' km)' : '') + '</span>';
        }).join(' &nbsp;·&nbsp; ');
        bar.innerHTML = '<div style="background:rgba(245,158,11,.1);border:1px solid rgba(245,158,11,.3);border-radius:10px;padding:10px 16px;font-size:13px;">' +
          '<strong style="color:#d97706;">⚠ ' + alerts.length + ' vérification(s) de vidange à faire :</strong> ' + atxt + '</div>';
      } else {
        bar.innerHTML = '<div style="background:rgba(22,163,74,.07);border:1px solid rgba(22,163,74,.2);border-radius:10px;padding:10px 16px;font-size:13px;color:#22c55e;font-weight:600;">✓ Aucune vérification de vidange à faire pour le moment</div>';
      }
    }

    var tbody = document.getElementById('maintenance-table');
    if (!tbody) return;
    tbody.innerHTML = fleet.map(function(c) {
      var m = MAINT[String(c.id)] || {};
      var kmNext = m.km_vidange_next ? Number(m.km_vidange_next).toLocaleString('fr-FR') + ' km' : '<span style="color:var(--text3);">—</span>';
      var maj = m.updated ? new Date(m.updated).toLocaleDateString('fr-FR') : '<span style="color:var(--text3);">—</span>';
      var rappelCell = '<span style="color:var(--text3);">—</span>';
      if (m.reminder_next) {
        var dd = diffD(m.reminder_next.slice(0,10));
        var cls = dd <= 0 ? 'badge-red' : dd <= 3 ? 'badge-yellow' : 'badge-green';
        var txt = dd < 0 ? 'À vérifier (' + Math.abs(dd) + 'j)' : dd === 0 ? 'À vérifier auj.' : 'Dans ' + dd + 'j';
        rappelCell = '<span class="badge ' + cls + '">● ' + txt + '</span><br><span style="font-size:11px;color:var(--text3);">' + m.reminder_next.slice(0,10) + '</span>';
      }
      return '<tr>' +
        '<td><strong>' + c.name + '</strong></td>' +
        '<td style="font-size:12px;color:var(--text3);">' + (c.plate||'—') + '</td>' +
        '<td>' + kmNext + '</td>' +
        '<td style="font-size:12px;">' + maj + '</td>' +
        '<td>' + rappelCell + '</td>' +
        '<td><button class="btn-sm primary" data-cid="' + c.id + '" onclick="openMaintModal(parseInt(this.dataset.cid))">Modifier</button></td>' +
        '</tr>';
    }).join('');
    updateBadges();
  } catch(e) { console.error('renderMaintenance:', e); }
}

function openMaintModal(carId) {
  _maintCarId = carId || null;
  var fleet = aslFleet();
  var MAINT = {};
  try { MAINT = JSON.parse(localStorage.getItem('asl_maint_v1') || '{}'); } catch(e) {}
  var car = carId ? fleet.find(function(c) { return c.id === carId; }) : null;
  var m = carId ? (MAINT[String(carId)] || {}) : {};

  var titleEl = document.getElementById('maint-modal-title');
  var bodyEl = document.getElementById('maint-modal-body');
  if (!bodyEl) return;
  if (titleEl) titleEl.textContent = car ? 'Entretien — ' + car.name : 'Mettre à jour l\'entretien';

  var carSel = '';
  if (!carId) {
    carSel = '<div class="form-group"><label class="form-label">Véhicule</label><select class="form-select" id="maint-car-sel">' +
      fleet.map(function(c) { return '<option value="' + c.id + '">' + c.name + ' (' + (c.plate||'') + ')</option>'; }).join('') +
      '</select></div>';
  }
  bodyEl.innerHTML = carSel +
    '<div class="form-group"><label class="form-label">Kilométrage actuel (info)</label><input class="form-input" type="number" id="maint-km" placeholder="ex : 42500" value="' + (m.km_current||'') + '"></div>' +
    '<div class="form-group"><label class="form-label">Kilométrage de la prochaine vidange</label><input class="form-input" type="number" id="maint-km-next" placeholder="ex : 90000" value="' + (m.km_vidange_next||'') + '"><div style="font-size:11px;color:var(--text3);margin-top:4px;">Après l\'enregistrement, un rappel de vérification est créé automatiquement tous les 20 jours.</div></div>' +
    '<div class="form-group"><label class="form-label">Date prochaine visite technique (facultatif)</label><input type="date" class="form-input" id="maint-vt" value="' + (m.vt_next||'') + '"></div>' +
    '<div class="form-group"><label class="form-label">Notes d\'entretien</label><textarea class="form-input form-textarea" rows="3" id="maint-notes" placeholder="Observations, réparations...">' + (m.notes||'') + '</textarea></div>';

  document.getElementById('maint-overlay').style.display = 'block';
  document.getElementById('maint-modal').style.display = 'block';
}

function closeMaintModal() {
  var o = document.getElementById('maint-overlay');
  var m = document.getElementById('maint-modal');
  if (o) o.style.display = 'none';
  if (m) m.style.display = 'none';
}

function saveMaintRecord() {
  var MAINT = {};
  try { MAINT = JSON.parse(localStorage.getItem('asl_maint_v1') || '{}'); } catch(e) {}
  var id = _maintCarId;
  if (!id) {
    var sel = document.getElementById('maint-car-sel');
    if (sel) id = parseInt(sel.value);
  }
  if (!id) { alert('Sélectionnez un véhicule'); return; }
  var prev = MAINT[String(id)] || {};
  var kmNext = parseInt(document.getElementById('maint-km-next') && document.getElementById('maint-km-next').value) || null;
  var now = new Date();
  /* Rappel tous les 20 jours : si le km de prochaine vidange change (ou
     première saisie), le compteur de 20 jours repart à zéro. */
  var kmChanged = (kmNext !== (prev.km_vidange_next || null));
  var reminderBase = (kmChanged || !prev.reminder_set) ? now.getTime() : (prev.reminder_set || now.getTime());
  var nextReminder = new Date(reminderBase + 20 * 86400000);

  MAINT[String(id)] = {
    km_current: parseInt(document.getElementById('maint-km') && document.getElementById('maint-km').value) || null,
    km_vidange_next: kmNext,
    vt_next:      (document.getElementById('maint-vt')      && document.getElementById('maint-vt').value)      || '',
    notes:        (document.getElementById('maint-notes')   && document.getElementById('maint-notes').value)   || '',
    reminder_set: kmChanged ? now.getTime() : reminderBase,       // date de base du compteur 20j
    reminder_next: nextReminder.toISOString(),                    // prochaine vérification
    updated: now.toISOString()
  };
  try { localStorage.setItem('asl_maint_v1', JSON.stringify(MAINT)); } catch(e) {}
  try { if (typeof ASLDB !== 'undefined' && ASLDB.noteLocalChange) ASLDB.noteLocalChange('asl_maint_v1'); } catch(e) {}
  try { if (typeof ASLDB !== 'undefined' && ASLDB.syncNow) ASLDB.syncNow(); } catch(e) {}
  closeMaintModal();
  renderMaintenance();
  renderDashboard();
  if (typeof updateBadges === 'function') updateBadges();
  showToast('Entretien enregistré ✓ Rappel de vérification créé.');
}

/* ==================== LOCATIONS EN COURS ==================== */

function renderRentals() {
  try {
    var res = aslRes();
    var filter = (document.getElementById('rentals-filter') && document.getElementById('rentals-filter').value) || 'active';
    var q = ((document.getElementById('rentals-search') && document.getElementById('rentals-search').value) || '').toLowerCase().trim();
    var ts = todayStr();
    function phaseOf(r) { return (typeof ASLDB !== 'undefined' && ASLDB.computePhase) ? ASLDB.computePhase(r) : r.status; }
    var rows;
    if (filter === 'active') {
      // ★ CORRECTIF : phase réelle — une réservation 'confirmed' mais pas
      //   encore démarrée (départ futur) n'est PAS une location "en cours" ;
      //   elle reste sur la page Réservations tant qu'elle n'a pas démarré.
      rows = res.filter(function(r) { return phaseOf(r) === 'active' || phaseOf(r) === 'late'; });
    } else if (filter === 'completed') {
      rows = res.filter(function(r) { return r.status === 'completed'; });
    } else {
      rows = res.filter(function(r) { return r.status !== 'cancelled'; });
    }
    if (q) {
      rows = rows.filter(function(r) {
        return ((r.contractRef||r.id||'') + ' ' + (r.client||'') + ' ' + (r.car||'')).toLowerCase().indexOf(q) >= 0;
      });
    }
    rows.sort(function(a,b) { return String(b.startDate||'').localeCompare(String(a.startDate||'')); });

    var tbody = document.getElementById('rentals-table');
    if (!tbody) return;
    if (!rows.length) {
      tbody.innerHTML = '<tr><td colspan="11" style="text-align:center;padding:30px;color:var(--text3);">Aucune location' + (filter==='active' ? ' en cours' : '') + '.</td></tr>';
      updateBadges(); return;
    }
    tbody.innerHTML = rows.map(function(r) {
      var total = Number(r.amount)||0, paid = Number(r.paid)||0, reste = Math.max(0, total-paid);
      var isLate = phaseOf(r) === 'late';
      var payBadge = reste > 0
        ? '<span class="badge badge-red">● ' + fmtMAD(reste) + ' restant</span>'
        : '<span class="badge badge-green">● Soldé</span>';
      var manualTag = (r.source==='manual'||r.type==='location') ? ' <span style="font-size:10px;background:rgba(0,0,0,.08);padding:2px 6px;border-radius:4px;margin-left:4px;">Manuel</span>' : '';
      // ★ Item 4B : simple tableau récapitulatif (comme un export Excel) —
      //   plus aucune action ici (ni Fiche, ni Fin) : ces actions sont gérées
      //   exclusivement depuis le Dashboard (Véhicules loués / Retours),
      //   pour éliminer toute redondance entre Dashboard et sidebar (item 5).
      return '<tr' + (isLate ? ' style="background:rgba(196,30,58,.04);"' : '') + '>' +
        '<td><strong>' + (r.contractRef||r.id||'') + '</strong>' + manualTag + '</td>' +
        '<td><div style="font-weight:600;">' + (r.client||'—') + '</div><div style="font-size:11px;color:var(--text3);">' + (r.phone||'') + '</div></td>' +
        '<td style="font-size:13px;">' + (r.car||'—') + (r.assignedPlate ? '<div style="font-size:11px;color:var(--text3);margin-top:1px;">🚗 ' + r.assignedPlate + (r.assignedColor ? ' — ' + r.assignedColor : '') + '</div>' : '') + '</td>' +
        '<td style="font-size:12px;">' + (r.startDate||'') + '</td>' +
        '<td style="font-size:12px;color:var(--text2);">' + (r.startTime||'—') + '</td>' +
        '<td style="font-size:12px;' + (isLate ? 'color:var(--red);font-weight:700;' : '') + '">' + (r.endDate||'') + (isLate ? ' ⚠' : '') + '</td>' +
        '<td style="font-size:12px;color:var(--text2);' + (isLate ? 'color:var(--red);font-weight:700;' : '') + '">' + (r.endTime||'—') + '</td>' +
        '<td style="text-align:center;">' + (r.days||'—') + '</td>' +
        '<td><strong>' + fmtMAD(total) + '</strong></td>' +
        '<td>' + payBadge + '</td>' +
        '<td>' + statusBadge(r.status) + '</td>' +
        '</tr>';
    }).join('');
    updateBadges();
  } catch(e) { console.error('renderRentals:', e); }
}

/* ---- Drawer détail location ---- */

function viewRental(id, mode) {
  // ★ mode 'rented'  (défaut) : ouvert depuis "Véhicules loués" — Annuler la
  //   location uniquement (item 1A).
  //   mode 'returns' : ouvert depuis "Retours aujourd'hui/demain/date
  //   sélectionnée" — Confirmer le retour + Prolonger uniquement, jamais
  //   d'annulation (item 1C). Titre adapté au contexte (ce n'est pas une
  //   réservation, mais une location déjà en cours qui revient).
  mode = mode || 'rented';
  var res = aslRes();
  var r = res.find(function(x) { return String(x.id) === String(id); });
  if (!r) return;
  var total = Number(r.amount)||0, paid = Number(r.paid)||0, reste = Math.max(0,total-paid);

  var titleEl = document.getElementById('rental-drawer-title');
  var bodyEl  = document.getElementById('rental-drawer-body');
  var footEl  = document.getElementById('rental-drawer-footer');
  var bg = document.getElementById('rental-drawer-bg');
  var dr = document.getElementById('rental-drawer');
  if (!dr) return;

  if (titleEl) titleEl.textContent = (mode === 'returns' ? 'Retour — ' : mode === 'late' ? 'En retard — ' : 'Location ') + (r.contractRef||r.id);

  // ★ Point 4 (refonte retours/retards) :
  //   - "Retours aujourd'hui" (mode='returns') devient une consultation
  //     PURE : plus de bouton "Confirmer le retour" ici.
  //   - "En retard" (mode='late') devient l'endroit principal pour gérer
  //     un retour : Confirmer le retour + Prolonger, exactement les deux
  //     actions demandées, rien d'autre.
  var actionsHTML = (mode === 'late')
    ? ('<button class="topbar-btn primary" data-rid="' + r.id + '" onclick="terminerLocation(this.dataset.rid)">✅ Confirmer le retour</button>' +
       '<button class="topbar-btn secondary" data-rid="' + r.id + '" onclick="prolongerLocation(this.dataset.rid)">📅 Prolonger</button>')
    : (mode === 'returns')
    ? '' // consultation uniquement — aucune action de retour ici
    // ★ Retour anticipé : depuis la fiche normale d'une location en cours
    //   (ni en retard, ni dans "Retours aujourd'hui"), on peut modifier la
    //   date/heure de retour ci-dessus (déjà éditable) PUIS confirmer
    //   directement le retour — sans attendre la date prévue ni passer par
    //   la liste des retards.
    : ('<button class="topbar-btn primary" data-rid="' + r.id + '" onclick="terminerLocation(this.dataset.rid)">✅ Confirmer le retour</button>' +
       '<button class="topbar-btn secondary" style="color:var(--red);border-color:var(--red);" data-rid="' + r.id + '" onclick="cancelRental(this.dataset.rid)">❌ Annuler la location</button>');
  // ★ Point 1 : suppression définitive toujours disponible, quel que soit le statut.
  actionsHTML += '<button class="topbar-btn secondary" style="color:var(--text3);" data-rid="' + r.id + '" onclick="deleteReservationPermanently(this.dataset.rid)">🗑 Supprimer définitivement</button>';

  if (bodyEl) bodyEl.innerHTML =
    // ★ Point 5 : nom de la sous-location affiché en tout premier si applicable.
    (function() {
      var slName = subLeaseNameFor(r);
      return slName ? '<div style="background:rgba(139,92,246,.08);border:1px solid rgba(139,92,246,.25);border-radius:10px;padding:10px 14px;margin-bottom:12px;"><div style="font-size:11px;color:#8b5cf6;font-weight:700;text-transform:uppercase;letter-spacing:.4px;">Sous-location</div><div style="font-weight:800;font-size:15px;">' + slName + '</div></div>' : '';
    })() +
    '<div class="form-group"><label class="form-label">N° Contrat</label>' +
    '<input class="form-input" id="rd-ref" value="' + (r.contractRef||r.id||'') + '" style="font-weight:700;">' +
    '<div style="font-size:11px;color:var(--text3);margin-top:3px;">Modifiable — synchronisé Paiements, Clients, Tableau de bord</div></div>' +

    '<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:12px;">' +
    _infoCell('Client', '<strong>' + (r.client||'') + '</strong>') +
    _infoCell('Téléphone', r.phone||'—') +
    _infoCell('Véhicule', r.car||'—') +
    _infoCell('Durée', (r.days||'—') + ' jours') +
    '</div>' +

    // ★ CORRECTIF (item 2) : dates ET heures de départ/retour désormais
    //   modifiables directement depuis cette fiche, sans recréer la location.
    '<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:12px;">' +
    '<div class="form-group"><label class="form-label">Date départ</label><input type="date" class="form-input" id="rd-start-date" value="' + (r.startDate||'') + '"></div>' +
    '<div class="form-group"><label class="form-label">Heure départ</label><input type="time" class="form-input" id="rd-start-time" value="' + (r.startTime||'10:00') + '"></div>' +
    '<div class="form-group"><label class="form-label">Date retour</label><input type="date" class="form-input" id="rd-end-date" value="' + (r.endDate||'') + '"></div>' +
    '<div class="form-group"><label class="form-label">Heure retour</label><input type="time" class="form-input" id="rd-end-time" value="' + (r.endTime||'10:00') + '"></div>' +
    '</div>' +

    '<div style="font-size:22px;font-weight:800;color:var(--red);margin-bottom:14px;" id="rd-total-display">' + fmtMAD(total) + '</div>' +

    '<div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:16px;">' +
    actionsHTML +
    '</div>' +

    '<div style="background:rgba(18,22,30,.04);border-radius:10px;padding:14px;">' +
    '<div style="font-weight:700;margin-bottom:10px;color:var(--red);">Paiement</div>' +
    // ★ CORRECTIF (point 9) : prix/jour et montant total désormais modifiables
    //   même après enregistrement — aucune donnée financière n'est figée.
    //   Le total se recalcule automatiquement (prix × jours) mais reste lui
    //   aussi modifiable directement (ex. remise ponctuelle sur le total).
    '<div class="form-row">' +
    '<div class="form-group"><label class="form-label">Prix / jour (MAD)</label>' +
    '<input class="form-input" type="number" id="rd-ppu" value="' + (r.pricePerDay || Math.round(total/Math.max(1,r.days||1))) + '" oninput="rdRecalcTotal(' + (r.days||1) + ')"></div>' +
    '<div class="form-group"><label class="form-label">Total (MAD)</label>' +
    '<input class="form-input" type="number" id="rd-total" value="' + total + '" oninput="rdPayCalc(parseFloat(this.value)||0)"></div>' +
    '</div>' +
    '<div class="form-row">' +
    '<div class="form-group"><label class="form-label">Montant reçu (MAD)</label>' +
    '<input class="form-input" type="number" id="rd-paid" value="' + paid + '" oninput="rdPayCalc(parseFloat(document.getElementById(\'rd-total\').value)||' + total + ')"></div>' +
    '<div class="form-group"><label class="form-label">Mode de paiement</label>' +
    '<select class="form-select" id="rd-mode">' +
    ['Espèces','Carte bancaire','Virement','Chèque','Autre'].map(function(m) {
      return '<option' + (r.paymentMode===m?' selected':'') + '>' + m + '</option>';
    }).join('') +
    '</select></div></div>' +
    '<div class="form-group"><label class="form-label">Encaissé par</label>' +
    '<select class="form-select" id="rd-collected-by">' +
    '<option value=""' + (!r.collectedBy?' selected':'') + '>— Non renseigné —</option>' +
    ['Mohamed','Younes','Khalid'].map(function(m) {
      return '<option' + (r.collectedBy===m?' selected':'') + '>' + m + '</option>';
    }).join('') +
    '</select></div>' +
    '<div id="rd-rest" style="font-weight:700;font-size:13px;margin-top:6px;"></div>' +
    '</div>' +

    // ★ CORRECTIF (item 2) : consulter/ajouter/remplacer directement le permis
    //   et la CIN/passeport depuis cette fiche — mêmes documents que la fiche
    //   client (Base clients), pas une copie séparée.
    (function() {
      if (typeof _docBlock !== 'function' || typeof _loadCustDocs !== 'function' || typeof _custId !== 'function') return '';
      var custKey = _custId(r.email, r.client);
      var docs = _loadCustDocs();
      var d = docs[custKey] || {};
      return '<div style="margin-top:16px;">' +
        '<div style="font-weight:700;margin-bottom:10px;color:var(--red);">Documents</div>' +
        _docBlock(custKey, 'permis', 'Permis de conduire', d.permis) +
        _docBlock(custKey, 'identite', 'Carte d\'identité (CIN) ou Passeport', d.identite, d.identiteType) +
        '</div>';
    })();

  if (footEl) footEl.innerHTML =
    (r.phone ? '<a href="tel:' + r.phone + '" class="topbar-btn secondary" style="text-decoration:none;flex:1;text-align:center;">📞 Appeler</a>' : '') +
    (r.phone ? '<a href="https://wa.me/' + r.phone.replace(/[^0-9]/g,'') + '" target="_blank" class="topbar-btn primary" style="text-decoration:none;flex:1;text-align:center;">WhatsApp</a>' : '') +
    '<button class="topbar-btn primary" style="flex:2;" data-rid="' + r.id + '" data-total="' + total + '" onclick="saveRentalChanges(this.dataset.rid, Number(this.dataset.total))">Enregistrer ✓</button>';

  bg.style.display = 'block';
  dr.style.display = 'flex';
  dr.style.transform = 'translateX(0)';

  setTimeout(function() { rdPayCalc(total); }, 50);
}

function _infoCell(label, val) {
  return '<div style="background:rgba(18,22,30,.03);border-radius:8px;padding:10px;">' +
    '<div style="font-size:11px;color:var(--text3);margin-bottom:2px;">' + label + '</div>' +
    '<div style="font-size:13px;font-weight:600;">' + val + '</div></div>';
}

/* ★ CORRECTIF (point 9) — Recalcule le Total (MAD) quand le prix/jour change,
   puis met à jour l'affichage payé/reste. Le Total reste lui-même
   directement modifiable (remise ponctuelle) via son propre champ. */
function rdRecalcTotal(days) {
  var ppuEl = document.getElementById('rd-ppu');
  var totalEl = document.getElementById('rd-total');
  if (!ppuEl || !totalEl) return;
  var ppu = parseFloat(ppuEl.value) || 0;
  totalEl.value = ppu * (days || 1);
  rdPayCalc(parseFloat(totalEl.value) || 0);
}

function rdPayCalc(total) {
  var paidEl = document.getElementById('rd-paid');
  var restEl = document.getElementById('rd-rest');
  var totalDisplay = document.getElementById('rd-total-display');
  if (totalDisplay) totalDisplay.textContent = fmtMAD(total);
  if (!paidEl || !restEl) return;
  var paid = parseFloat(paidEl.value) || 0;
  var reste = Math.max(0, total - paid);
  var statut, col;
  if (paid <= 0)                         { statut = 'Non payé';          col = 'var(--red)'; }
  else if (paid >= total && total > 0)   { statut = 'Paiement complet';  col = '#22c55e'; }
  else                                   { statut = 'Paiement partiel';  col = '#d97706'; }
  restEl.innerHTML = 'Reste : <span style="color:' + col + ';font-weight:800;">' + fmtMAD(reste) + '</span> &nbsp;·&nbsp; <span style="color:' + col + ';">' + statut + '</span>';
}

function saveRentalChanges(id, totalFallback) {
  // ★ CORRECTIF (point 9) : le total et le prix/jour sont désormais lus en
  //   direct depuis les champs (potentiellement modifiés par l'utilisateur),
  //   jamais figés à la valeur d'ouverture de la fiche.
  var newTotal = parseFloat((document.getElementById('rd-total') && document.getElementById('rd-total').value)) ;
  if (isNaN(newTotal)) newTotal = totalFallback;
  var newPpu = parseFloat((document.getElementById('rd-ppu') && document.getElementById('rd-ppu').value) || 0);
  var newPaid = parseFloat((document.getElementById('rd-paid') && document.getElementById('rd-paid').value) || 0);
  var newRef  = (document.getElementById('rd-ref')  && document.getElementById('rd-ref').value)  || '';
  var newMode = (document.getElementById('rd-mode') && document.getElementById('rd-mode').value) || 'Espèces';
  var newCollectedBy = (document.getElementById('rd-collected-by') && document.getElementById('rd-collected-by').value) || '';
  // ★ CORRECTIF (item 2) : dates/heures modifiables directement depuis la fiche.
  var newStartDate = (document.getElementById('rd-start-date') && document.getElementById('rd-start-date').value) || '';
  var newStartTime = (document.getElementById('rd-start-time') && document.getElementById('rd-start-time').value) || '10:00';
  var newEndDate   = (document.getElementById('rd-end-date')   && document.getElementById('rd-end-date').value)   || '';
  var newEndTime   = (document.getElementById('rd-end-time')   && document.getElementById('rd-end-time').value)   || '10:00';
  var payStatus = newPaid <= 0 ? 'Non payé' : (newPaid >= newTotal ? 'Paiement complet' : 'Paiement partiel');

  var res = aslRes();
  var r = res.find(function(x) { return String(x.id) === String(id); });
  // ★ Point 9 : aucune donnée financière n'est dupliquée — cette écriture met
  //   à jour DIRECTEMENT le même enregistrement (amount/pricePerDay/paid...),
  //   qui alimente automatiquement impayés, caisse, Grand Livre et
  //   statistiques (tous calculés en direct depuis cette même réservation).
  var patch = { paid: newPaid, amount: newTotal, pricePerDay: newPpu, paymentMode: newMode, paymentStatus: payStatus, contractRef: newRef, collectedBy: newCollectedBy };
  var total = newTotal;

  if (r && newStartDate && newEndDate) {
    var datesChanged = (newStartDate !== r.startDate || newEndDate !== r.endDate || newStartTime !== (r.startTime||'10:00') || newEndTime !== (r.endTime||'10:00'));
    if (datesChanged) {
      // Vérifie qu'on ne crée pas de conflit avec une autre location du même véhicule
      if (typeof ASLDB !== 'undefined' && ASLDB.checkAvailability && r.carId) {
        var fleet = aslFleet();
        var car = fleet.find(function(c) { return c.id === r.carId; });
        if (car) {
          var chk = ASLDB.checkAvailability(car, newStartDate, newEndDate, newStartTime, newEndTime, { excludeId: r.id });
          if (!chk.available) {
            if (!confirm('⛔ CONFLIT DÉTECTÉ\n\nCe véhicule est déjà réservé/loué sur cette nouvelle période.\n\nEnregistrer quand même ?')) return;
          }
        }
      }
      var days = Math.max(1, Math.round((new Date(newEndDate) - new Date(newStartDate)) / 86400000));
      patch.startDate = newStartDate; patch.endDate = newEndDate;
      patch.startTime = newStartTime; patch.endTime = newEndTime;
      patch.days = days;
    }
  }

  if (typeof ASLDB !== 'undefined' && ASLDB.updateReservation) {
    ASLDB.updateReservation(id, patch);
  }
  if (typeof reloadData === 'function') reloadData();
  renderRentals();
  if (typeof renderPayments === 'function') renderPayments();
  renderDashboard();
  closeRentalDrawer();
  showToast('Location mise à jour et synchronisée ✓');
}

function closeRentalDrawer() {
  var bg = document.getElementById('rental-drawer-bg');
  var dr = document.getElementById('rental-drawer');
  if (bg) bg.style.display = 'none';
  if (dr) { dr.style.transform = 'translateX(100%)'; setTimeout(function(){ dr.style.display='none'; dr.style.transform=''; }, 280); }
  // ★ Item 3 (navigation) : retour exact au tiroir Dashboard d'origine, le cas échéant.
  if (typeof restoreDashReturnContext === 'function') restoreDashReturnContext();
}

/* ============================================================
   ★ Item 3 — NAVIGATION : le Dashboard doit conserver son contexte.
   Quand une fiche (viewRental / viewRes / viewUnpaidFiche) est ouverte
   depuis un tiroir du Dashboard, on mémorise ce contexte ; à la fermeture
   de la fiche (Enregistrer, Annuler, ou simple fermeture), on rouvre
   automatiquement EXACTEMENT ce même tiroir — jamais de redirection vers
   Réservations / Locations en cours / un autre onglet.
   ============================================================ */
window._dashReturnContext = null;
function setDashReturnContext(type, filter) {
  window._dashReturnContext = { type: type, filter: filter || null };
}
function restoreDashReturnContext() {
  var ctx = window._dashReturnContext;
  if (!ctx) return;
  window._dashReturnContext = null;
  if (ctx.filter) window._returnsFilter = ctx.filter;
  if (typeof openDashDrawer === 'function') openDashDrawer(ctx.type);
}

function prolongerLocation(id) {
  var res = aslRes();
  var r = res.find(function(x) { return String(x.id) === String(id); });
  if (!r) return;
  var jours = parseInt(prompt('Nombre de jours supplémentaires :', '1'));
  if (!jours || jours < 1) return;
  // ★ Nouvelle heure de retour : conservée par défaut, modifiable (demande explicite :
  //   pouvoir changer la date ET l'heure de retour lors d'une prolongation).
  var newTime = prompt('Heure de retour (HH:MM) :', r.endTime || '18:00');
  if (newTime === null) return;
  if (!/^\d{1,2}:\d{2}$/.test(newTime)) newTime = r.endTime || '18:00';
  // Arithmétique de date robuste (indépendante du fuseau) : on part des
  // composants Y/M/D locaux du endDate existant plutôt que de reparser la
  // chaîne via `new Date(r.endDate)` (qui serait interprétée en UTC).
  var parts = String(r.endDate || '').split('-').map(Number);
  var base = new Date(parts[0] || 1970, (parts[1] || 1) - 1, parts[2] || 1);
  base.setDate(base.getDate() + jours);
  var newEndStr = (typeof ASLDB !== 'undefined' && ASLDB.localDateISO) ? ASLDB.localDateISO(base)
    : (base.getFullYear() + '-' + String(base.getMonth() + 1).padStart(2, '0') + '-' + String(base.getDate()).padStart(2, '0'));
  var ppu = r.pricePerDay || Math.round((Number(r.amount)||0) / Math.max(1, r.days||1));
  var supplement = ppu * jours;
  var newTotal = (Number(r.amount)||0) + supplement;
  var newDays  = (r.days||0) + jours;
  if (!confirm('Prolongation de ' + jours + ' j\nNouvelle date de retour : ' + newEndStr + ' à ' + newTime + '\nSupplément : ' + fmtMAD(supplement) + '\nNouveau total : ' + fmtMAD(newTotal) + '\n\nConfirmer ?')) return;
  if (typeof ASLDB !== 'undefined' && ASLDB.updateReservation) {
    ASLDB.updateReservation(id, { endDate: newEndStr, endTime: newTime, days: newDays, amount: newTotal, extended: true });
  }
  if (typeof reloadData === 'function') reloadData();
  renderRentals(); renderDashboard();
  if (typeof renderPayments === 'function') renderPayments();
  if (typeof closeRentalDrawer === 'function') closeRentalDrawer();
  showToast('Prolongation enregistrée — retour le ' + newEndStr + ' à ' + newTime + ' ✓');
}

function terminerLocation(id) {
  if (!confirm('Clore cette location et libérer le véhicule ?')) return;
  var res = aslRes();
  var r = res.find(function(x) { return String(x.id) === String(id); });
  if (r && typeof ASLDB !== 'undefined') {
    if (r.carId && r.assignedPlate && typeof ASLDB.releaseUnit === 'function') {
      ASLDB.releaseUnit(r.carId, r.assignedPlate);
    }
    if (ASLDB.updateReservation) {
      // ★ CORRECTIF (point 4 — retour anticipé) : si la fiche est ouverte et
      //   que l'admin a modifié la date/heure de retour (ex. le client rend
      //   le véhicule plus tôt que prévu), on utilise CETTE date réelle
      //   plutôt que de toujours forcer l'instant présent — sinon la
      //   correction saisie était silencieusement ignorée. On recalcule
      //   aussi la durée réelle à partir des dates effectives.
      var endDateEl = document.getElementById('rd-end-date');
      var endTimeEl = document.getElementById('rd-end-time');
      var startDateEl = document.getElementById('rd-start-date');
      var now = new Date();
      var actualEndDate = (endDateEl && endDateEl.value) ? endDateEl.value
        : ((typeof ASLDB !== 'undefined' && ASLDB.localDateISO) ? ASLDB.localDateISO(now) : now.toISOString().slice(0,10));
      var actualEndTime = (endTimeEl && endTimeEl.value) ? endTimeEl.value
        : ((typeof ASLDB !== 'undefined' && ASLDB.localTimeHM) ? ASLDB.localTimeHM(now) : (String(now.getHours()).padStart(2,'0') + ':' + String(now.getMinutes()).padStart(2,'0')));
      var actualStartDate = (startDateEl && startDateEl.value) ? startDateEl.value : r.startDate;
      var patch = { status: 'completed', endDate: actualEndDate, endTime: actualEndTime, plannedEndDate: r.plannedEndDate || r.endDate, plannedEndTime: r.plannedEndTime || r.endTime || '' };
      if (actualStartDate && actualEndDate) {
        var realDays = Math.max(1, Math.round((new Date(actualEndDate) - new Date(actualStartDate)) / 86400000));
        patch.days = realDays;
      }
      ASLDB.updateReservation(id, patch);
    }
  }
  if (typeof reloadData === 'function') reloadData();
  renderRentals(); renderDashboard();
  if (typeof renderFleetPage === 'function') renderFleetPage();
  if (typeof closeRentalDrawer === 'function') closeRentalDrawer();
  showToast('Location clôturée — véhicule libéré ✓');
}

/* ---- ANNULATION (item 5) ----
   Deux cas distincts, intégrés directement dans les fiches existantes :
   1. Annuler une RÉSERVATION (avant que le client ne récupère le véhicule) :
      le statut passe à 'cancelled', l'unité éventuellement pré-réservée
      est libérée, le véhicule redevient immédiatement disponible.
   2. Annuler/clôturer une LOCATION en cours (retour anticipé ou annulation
      après remise du véhicule) : mêmes effets que "Confirmer la
      récupération", mais explicitement nommé "annulation" et enregistre
      la date/heure réelle de restitution (souvent avant la date prévue). */
function cancelReservation(id) {
  var res = aslRes();
  var r = res.find(function(x) { return String(x.id) === String(id); });
  if (!r) return;
  if (!confirm('❌ Annuler la réservation « ' + (r.contractRef||r.id) + ' » ?\n\nLe véhicule redeviendra immédiatement disponible.')) return;
  if (typeof ASLDB !== 'undefined') {
    if (r.carId && r.assignedPlate && typeof ASLDB.releaseUnit === 'function') {
      ASLDB.releaseUnit(r.carId, r.assignedPlate);
    }
    if (ASLDB.updateReservation) {
      ASLDB.updateReservation(id, { status: 'cancelled', cancelledAt: new Date().toISOString() });
    }
  }
  if (typeof reloadData === 'function') reloadData();
  renderRentals(); renderDashboard();
  if (typeof renderAllReservations === 'function') renderAllReservations();
  if (typeof renderFleetPage === 'function') renderFleetPage();
  updateBadges();
  if (typeof closeModal === 'function') closeModal();
  showToast('Réservation annulée — véhicule disponible ✓');
}

function cancelRental(id) {
  var res = aslRes();
  var r = res.find(function(x) { return String(x.id) === String(id); });
  if (!r) return;
  if (!confirm('❌ Annuler / clôturer cette location « ' + (r.contractRef||r.id) + ' » ?\n\nLa date et l\'heure réelles de restitution seront enregistrées, et le véhicule redeviendra immédiatement disponible.')) return;
  if (typeof ASLDB !== 'undefined') {
    if (r.carId && r.assignedPlate && typeof ASLDB.releaseUnit === 'function') {
      ASLDB.releaseUnit(r.carId, r.assignedPlate);
    }
    if (ASLDB.updateReservation) {
      var now = new Date();
      var actualEndDate = (typeof ASLDB !== 'undefined' && ASLDB.localDateISO) ? ASLDB.localDateISO(now) : now.toISOString().slice(0,10);
      var actualEndTime = (typeof ASLDB !== 'undefined' && ASLDB.localTimeHM) ? ASLDB.localTimeHM(now) : (String(now.getHours()).padStart(2,'0') + ':' + String(now.getMinutes()).padStart(2,'0'));
      ASLDB.updateReservation(id, { status: 'completed', endDate: actualEndDate, endTime: actualEndTime, plannedEndDate: r.endDate, plannedEndTime: r.endTime || '', earlyOrCancelled: true });
    }
  }
  if (typeof reloadData === 'function') reloadData();
  renderRentals(); renderDashboard();
  if (typeof renderFleetPage === 'function') renderFleetPage();
  updateBadges();
  if (typeof closeRentalDrawer === 'function') closeRentalDrawer();
  if (typeof closeModal === 'function') closeModal();
  showToast('Location annulée / clôturée — véhicule disponible ✓');
}

/* ============================================================
   ★ SUPPRESSION DÉFINITIVE (point 1) — distincte de l'annulation.
   Retire complètement le dossier (réservation OU location, quel que soit
   son statut : en cours, en retard, terminée). Le montant disparaît
   automatiquement des revenus/caisse/statistiques puisque ceux-ci sont
   toujours recalculés à partir de la liste réelle des réservations —
   aucune valeur n'est jamais stockée séparément.
   À utiliser pour corriger une erreur de saisie (ex. mauvaise date),
   sans laisser de doublon dans l'historique.
   ============================================================ */
function deleteReservationPermanently(id) {
  var res = aslRes();
  var r = res.find(function(x) { return String(x.id) === String(id); });
  if (!r) return;
  if (!confirm('🗑 SUPPRESSION DÉFINITIVE\n\n« ' + (r.contractRef||r.id) + ' » — ' + (r.client||'') + ' (' + (r.car||'') + ')\n\nCette action retire complètement ce dossier : activité récente, revenus, caisse et statistiques seront recalculés automatiquement.\n\nCeci est irréversible (contrairement à une annulation). Continuer ?')) return;
  if (!confirm('⛔ CONFIRMATION FINALE\n\nSupprimer définitivement ce dossier ?')) return;
  if (typeof ASLDB !== 'undefined') {
    if (r.carId && r.assignedPlate && typeof ASLDB.releaseUnit === 'function') {
      ASLDB.releaseUnit(r.carId, r.assignedPlate);
    }
    if (ASLDB.deleteReservation) ASLDB.deleteReservation(id);
  }
  if (typeof reloadData === 'function') reloadData();
  renderRentals(); renderDashboard();
  if (typeof renderAllReservations === 'function') renderAllReservations();
  if (typeof renderFleetPage === 'function') renderFleetPage();
  if (typeof renderPayments === 'function') renderPayments();
  updateBadges();
  if (typeof closeRentalDrawer === 'function') closeRentalDrawer();
  if (typeof closeModal === 'function') closeModal();
  showToast('Dossier supprimé définitivement — véhicule disponible ✓');
}

/* Depuis le panneau « En retard » du tableau de bord : confirmer le retour
   (clôture) ou prolonger. Après traitement, le panneau se rafraîchit et
   l'alerte disparaît automatiquement. */
function dashConfirmReturn(id) {
  terminerLocation(id);
  if (typeof openDashDrawer === 'function') setTimeout(function(){ openDashDrawer('late'); }, 60);
}
function dashExtend(id) {
  prolongerLocation(id);
  if (typeof openDashDrawer === 'function') setTimeout(function(){ openDashDrawer('late'); }, 60);
}

/* ==================== PARAMETRES SYSTEME ==================== */

function renderSettings() {
  var fleet = aslFleet(), res = aslRes();
  var el;
  el = document.getElementById('sys-fleet'); if(el) el.textContent = fleet.length + ' véhicule(s)';
  el = document.getElementById('sys-res');   if(el) el.textContent = res.length + ' réservation(s)';
}

function _OLD_confirmReset_unused() {
  if (!confirm('⚠ RÉINITIALISATION OPÉRATIONNELLE\n\nCette action va archiver (sans supprimer) :\n• Réservations actives\n• Locations en cours\n• Alertes et notifications\n\nToutes les données restent consultables dans l\'historique.\n\nContinuer ?')) return;
  if (!confirm('⛔ CONFIRMATION FINALE\n\nCette action est irréversible sur les données actives.\n\nConfirmer la réinitialisation ?')) return;
  var res = aslRes();
  var count = 0;
  res.forEach(function(r) {
    if (r.status === 'active' || r.status === 'confirmed' || r.status === 'pending') {
      if (typeof ASLDB !== 'undefined' && ASLDB.updateReservation) {
        ASLDB.updateReservation(r.id, { status: 'completed', archivedAt: new Date().toISOString() });
      }
      count++;
    }
  });
  if (typeof reloadData === 'function') reloadData();
  renderDashboard(); renderRentals(); updateBadges();
  showToast('Réinitialisation terminée — ' + count + ' dossier(s) archivé(s) ✓');
  alert('✓ Réinitialisation terminée.\n' + count + ' dossier(s) archivé(s). Données consultables dans l\'historique.');
}

/* ==================== MODAL : NOUVELLE LOCATION (extension openModal) ==================== */

(function () {
  var _orig = window.openModal;
  window.openModal = function (type) {
    if (type === 'new-location') {
      _buildNewLocationModal();
      return;
    }
    if (typeof _orig === 'function') _orig(type);
  };
})();

/* ── Nouvelle location : calcul automatique du nombre de jours ──────────────
   Le champ « Nombre de jours » calcule la date de retour à partir de la date
   de départ. Si l'on change la date de retour, le nombre de jours se met à
   jour. Présent UNIQUEMENT dans le pop-up Nouvelle location (pas Réservation). */
function nlSetDays(d) {
  var i = document.getElementById('nl-days');
  if (i) { i.value = d; nlDaysToEnd(); }
}
function nlDaysToEnd() {
  var s = document.getElementById('nl-start'),
      e = document.getElementById('nl-end'),
      dEl = document.getElementById('nl-days');
  if (!s || !e || !dEl) return;
  var days = parseInt(dEl.value, 10);
  if (!s.value || !days || days < 1) return;
  var d = new Date(s.value + 'T00:00:00');
  d.setDate(d.getDate() + days);   // retour = départ + N jours (ex : 01/07 + 30 = 31/07)
  var yyyy = d.getFullYear(), mm = String(d.getMonth() + 1).padStart(2, '0'), dd = String(d.getDate()).padStart(2, '0');
  e.value = yyyy + '-' + mm + '-' + dd;
  try { e.dispatchEvent(new Event('change')); } catch (_) {}
}
function nlEndToDays() {
  var s = document.getElementById('nl-start'),
      e = document.getElementById('nl-end'),
      dEl = document.getElementById('nl-days');
  if (!s || !e || !dEl || !s.value || !e.value) return;
  var days = Math.round((new Date(e.value + 'T00:00:00') - new Date(s.value + 'T00:00:00')) / 86400000);
  if (days >= 1) dEl.value = days;
}

/* ★ Point 3 (LLD) — Deuxième méthode, plus rapide, pour fixer la date de
   fin : un nombre de mois directement, en plus du calendrier existant
   (conservé intact). Le résultat reste ensuite modifiable librement via le
   calendrier, comme n'importe quelle autre date de fin. */
function nlApplyLLDMonths(months) {
  months = parseInt(months, 10);
  var sEl = document.getElementById('nl-start');
  var eEl = document.getElementById('nl-end');
  if (!months) return;
  if (!sEl || !sEl.value) { alert('Choisissez d\'abord la date de départ.'); return; }
  if (!eEl) return;
  var d = new Date(sEl.value + 'T00:00:00');
  d.setMonth(d.getMonth() + months);
  eEl.value = d.getFullYear() + '-' + String(d.getMonth()+1).padStart(2,'0') + '-' + String(d.getDate()).padStart(2,'0');
  nlEndToDays();
  try { eEl.dispatchEvent(new Event('change')); } catch (e) {}
}

function _buildNewLocationModal(isLLD) {
  // Garantit la présence du bouton #modal-save même si un autre module (LLD…)
  // a remplacé le pied de page du pop-up partagé juste avant.
  if (typeof restoreModalFooter === 'function') restoreModalFooter();
  var fleet = aslFleet();
  var overlay = document.getElementById('modal-overlay');
  var titleEl = document.getElementById('modal-title');
  var bodyEl  = document.getElementById('modal-body');
  var footEl  = document.getElementById('modal-footer');
  if (!overlay) return;
  // ★ Points 5-6 : la Location Longue Durée réutilise EXACTEMENT le même
  //   pop-up qu'une location manuelle — même ergonomie, mêmes champs, même
  //   système de dates/calendrier. Seule différence : le type enregistré et
  //   l'ajout d'un historique de versements libres (voir _saveNewLocation).
  if (titleEl) titleEl.textContent = isLLD ? 'Nouvelle location longue durée' : 'Nouvelle location directe';
  if (footEl)  footEl.style.display = 'flex';

  var carOpts = fleet.map(function(c) {
    var ppu = c.priceMAD || Math.round((c.priceEUR||0) * 10.8);
    var units = (typeof ASLDB !== 'undefined' && ASLDB.normalizeUnits) ? ASLDB.normalizeUnits(c) : null;
    if (units && units.length) {
      return units.map(function(u, i) {
        var av = (u.status||'available') === 'available';
        return '<option value="' + c.id + '" data-unit="' + i + '" data-plate="' + (u.plate||'') + '" data-color="' + (u.color||'') + '" data-ppu="' + ppu + '"' + (av ? '' : ' disabled') + '>' +
          c.name + ' — ' + (u.plate||'sans plaque') + (u.color ? ' · ' + u.color : '') + ' — ' + ppu + ' MAD/j' + (av ? '' : ' (occupée)') + '</option>';
      }).join('');
    }
    return '<option value="' + c.id + '" data-ppu="' + ppu + '">' + c.name + ' (' + (c.plate||'') + ') — ' + ppu + ' MAD/j</option>';
  }).join('');

  if (bodyEl) bodyEl.innerHTML =
    '<input type="hidden" id="nl-is-lld" value="' + (isLLD ? '1' : '') + '">' +
    (isLLD ? '<div style="background:rgba(139,92,246,.08);border:1px solid rgba(139,92,246,.25);border-radius:10px;padding:10px 14px;margin-bottom:14px;font-size:12.5px;color:#6d28d9;">📅 Location Longue Durée — le montant saisi dans « Montant reçu » ci-dessous sera enregistré comme <strong>premier versement</strong>. Vous pourrez ajouter les suivants librement depuis la fiche, à chaque paiement du client (aucun calendrier fixe imposé).</div>' : '') +
    '<div class="form-group"><label class="form-label">Type de dossier</label>' +
    '<select class="form-select" id="nl-doctype" onchange="nlToggleSublease()">' +
    '<option value="direct">Client direct</option>' +
    '<option value="sublease">Sous-location</option>' +
    '</select></div>' +
    '<div class="form-group" id="nl-sublease-box" style="display:none;background:rgba(196,30,58,.05);border:1px solid rgba(196,30,58,.18);border-radius:10px;padding:12px;">' +
    '<label class="form-label">Sous-location</label>' +
    '<div style="display:flex;gap:8px;align-items:center;">' +
    '<select class="form-select" id="nl-sublease" style="flex:1;">' + (typeof ASLSublease!=='undefined'?ASLSublease.options():'') + '</select>' +
    '<button type="button" class="btn-sm primary" style="white-space:nowrap;" onclick="nlQuickCreateSublease()">+ Créer</button>' +
    '</div>' +
    '<div style="font-size:11px;color:var(--text3);margin-top:5px;">Le « Prénom / Nom » ci-dessous = le client final de cette sous-location.</div></div>' +
    '<div class="form-group"><label class="form-label">N° Contrat</label>' +
    '<input class="form-input" id="nl-ref" placeholder="LOC-2026-001">' +
    '<div style="font-size:11px;color:var(--text3);margin-top:3px;">Modifiable — synchronisé avec Paiements, Clients et Tableau de bord</div></div>' +
    '<div class="form-row">' +
    '<div class="form-group"><label class="form-label">Prénom</label><input class="form-input" id="nl-fn" placeholder="Prénom"></div>' +
    '<div class="form-group"><label class="form-label">Nom</label><input class="form-input" id="nl-ln" placeholder="Nom"></div>' +
    '</div>' +
    '<div class="form-row">' +
    '<div class="form-group"><label class="form-label">Téléphone / WhatsApp</label><input class="form-input" id="nl-phone" placeholder="+212 6..."></div>' +
    '<div class="form-group"><label class="form-label">Profession</label><input class="form-input" id="nl-profession" placeholder="Ex : Médecin, Ingénieur…"></div>' +
    '</div>' +
    '<div class="form-row">' +
    '<div class="form-group"><label class="form-label">Nationalité</label><input class="form-input" id="nl-nat" placeholder="ex : Française"></div>' +
    '</div>' +
    '<div class="form-group"><label class="form-label">Véhicule</label><select class="form-select" id="nl-car">' + carOpts + '</select></div>' +
    '<div class="form-group"><label class="form-label">Prix / jour (MAD) — libre</label><input class="form-input" type="number" id="nl-ppu" placeholder="Saisissez le prix négocié"></div>' +
    '<div class="form-group"><label class="form-label">Nombre de jours</label>' +
    '<input class="form-input" type="number" min="1" id="nl-days" placeholder="Nombre de jours"></div>' +
    '<div class="form-row">' +
    '<div class="form-group"><label class="form-label">Date départ</label><input type="date" class="form-input" id="nl-start"></div>' +
    '<div class="form-group"><label class="form-label">Heure départ</label><input type="time" class="form-input" id="nl-start-time" value="10:00"></div>' +
    '</div>' +
    (isLLD ?
      '<div class="form-group"><label class="form-label">Durée rapide (facultatif)</label>' +
      '<select class="form-select" id="nl-lld-months" onchange="nlApplyLLDMonths(this.value)">' +
      '<option value="">— Utiliser le calendrier ci-dessous —</option>' +
      Array.from({length:12}, function(_,i){ var m=i+1; return '<option value="'+m+'">'+m+' mois</option>'; }).join('') +
      '</select>' +
      '<div style="font-size:11px;color:var(--text3);margin-top:4px;">Calcule automatiquement la date de fin — vous pouvez toujours l\'ajuster manuellement ensuite via le calendrier.</div></div>'
      : '') +
    '<div class="form-row">' +
    '<div class="form-group"><label class="form-label">Date retour</label><input type="date" class="form-input" id="nl-end"></div>' +
    '<div class="form-group"><label class="form-label">Heure retour</label><input type="time" class="form-input" id="nl-end-time" value="10:00"></div>' +
    '</div>' +
    '<div class="form-group"><label class="form-label">Lieu de prise en charge</label>' +
    '<input class="form-input" id="nl-pickup" list="dl-pickup-options" placeholder="Sélectionnez ou saisissez librement…" value="Aéroport Marrakech (RAK)"></div>' +
    '<div class="form-group"><label class="form-label">Origine du client</label>' +
    '<input class="form-input" id="nl-source" list="dl-source-options" placeholder="Sélectionnez ou saisissez librement…"></div>' +
    '<div style="background:rgba(18,22,30,.04);border-radius:10px;padding:14px;">' +
    '<div style="font-weight:700;margin-bottom:10px;color:var(--red);">Paiement</div>' +
    '<div class="form-row">' +
    '<div class="form-group"><label class="form-label">Total (MAD)</label><input class="form-input" type="number" id="nl-total" placeholder="Calculé auto" oninput="nlPayCalc()"></div>' +
    '<div class="form-group"><label class="form-label">Reçu (MAD)</label><input class="form-input" type="number" id="nl-paid" value="0" oninput="nlPayCalc()"></div>' +
    '</div>' +
    '<div class="form-row">' +
    '<div class="form-group"><label class="form-label">Mode de paiement</label>' +
    '<select class="form-select" id="nl-mode"><option>Espèces</option><option>Carte bancaire</option><option>Virement</option><option>Chèque</option><option>Autre</option></select></div>' +
    '<div class="form-group"><label class="form-label" style="color:var(--red);">Encaissé par *</label>' +
    '<select class="form-select" id="nl-collected-by" required>' +
    '<option value="">— Sélectionner —</option><option value="Mohamed">Mohamed</option><option value="Younes">Younes</option><option value="Khalid">Khalid</option>' +
    '</select></div>' +
    '</div>' +
    '<div id="nl-rest" style="font-weight:700;font-size:13px;margin-top:4px;"></div></div>' +
    '<div class="form-group"><label class="form-label">Notes internes</label><textarea class="form-input form-textarea" rows="2" id="nl-notes" placeholder="Notes..."></textarea></div>' +
    '<div class="form-group"><label class="form-label">Documents (facultatif)</label>' +
    '<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;">' +
    '<div tabindex="0" class="doc-drop-zone" style="border:1px solid var(--border);border-radius:8px;padding:8px;" title="Cliquez puis Ctrl+V pour coller une image, ou glissez-déposez un fichier" onpaste="pasteDocField(\'nl-doc-permis\',\'nl-permis-prev\',event)" ondragover="event.preventDefault();this.classList.add(\'doc-drop-active\')" ondragleave="this.classList.remove(\'doc-drop-active\')" ondrop="dropDocField(\'nl-doc-permis\',\'nl-permis-prev\',event)">' +
    '<div style="font-size:12px;color:var(--text3);margin-bottom:4px;">Permis de conduire <span style="font-weight:400;">— ou collez (Ctrl+V)</span></div>' +
    '<input type="file" accept="image/*" id="nl-doc-permis" class="form-input" style="padding:8px;" onchange="docPreview(this,\'nl-permis-prev\')"><div id="nl-permis-prev" style="margin-top:6px;"></div></div>' +
    '<div tabindex="0" class="doc-drop-zone" style="border:1px solid var(--border);border-radius:8px;padding:8px;" title="Cliquez puis Ctrl+V pour coller une image, ou glissez-déposez un fichier" onpaste="pasteDocField(\'nl-doc-identity\',\'nl-identity-prev\',event)" ondragover="event.preventDefault();this.classList.add(\'doc-drop-active\')" ondragleave="this.classList.remove(\'doc-drop-active\')" ondrop="dropDocField(\'nl-doc-identity\',\'nl-identity-prev\',event)">' +
    '<div style="font-size:12px;color:var(--text3);margin-bottom:4px;">CIN / Passeport <span style="font-weight:400;">— ou collez (Ctrl+V)</span></div>' +
    '<input type="file" accept="image/*" id="nl-doc-identity" class="form-input" style="padding:8px;" onchange="docPreview(this,\'nl-identity-prev\')"><div id="nl-identity-prev" style="margin-top:6px;"></div></div>' +
    '</div><div style="font-size:11px;color:var(--text3);margin-top:5px;">Ajoutables aussi plus tard depuis la fiche client.</div></div>';

  overlay.classList.add('open');

  /* Auto-calc */
  setTimeout(function() {
    var refEl = document.getElementById('nl-ref');
    if (refEl && !refEl.value && typeof suggestContractRef === 'function') refEl.value = suggestContractRef('LOC');
    var carSel = document.getElementById('nl-car');
    var sEl = document.getElementById('nl-start');
    var eEl = document.getElementById('nl-end');
    var ppuEl = document.getElementById('nl-ppu');
    // ★ CORRECTIF (point 9) — Le prix du véhicule (fiche flotte) n'est plus
    //   JAMAIS recopié automatiquement dans ce champ, y compris à la
    //   sélection du véhicule. Le prix journalier est désormais une valeur
    //   totalement libre saisie par l'utilisateur (remises, tarifs
    //   négociés...) ; seul le TOTAL continue de se recalculer
    //   automatiquement (prix × nombre de jours) à chaque changement de
    //   prix ou de dates.
    function autoTotal() {
      var s = sEl&&sEl.value, e = eEl&&eEl.value, ppu = parseFloat(ppuEl&&ppuEl.value)||0;
      if (ppu && s && e) {
        var d = Math.max(1, Math.round((new Date(e)-new Date(s))/86400000));
        var tEl = document.getElementById('nl-total');
        if (tEl && !tEl.dataset.manual) { tEl.value = ppu*d; nlPayCalc(); }
      }
    }
    if (carSel) carSel.addEventListener('change', function(){ autoTotal(); });
    if (sEl) sEl.addEventListener('change', function(){ nlDaysToEnd(); });
    if (eEl) eEl.addEventListener('change', function(){ nlEndToDays(); });
    var daysEl = document.getElementById('nl-days');
    if (daysEl) daysEl.addEventListener('input', function(){ nlDaysToEnd(); });
    [sEl,eEl].forEach(function(el){ if(el) el.addEventListener('change', function(){ autoTotal(); }); });
    if (ppuEl) ppuEl.addEventListener('input', function(){ autoTotal(); });
    var tEl = document.getElementById('nl-total');
    if (tEl) tEl.addEventListener('input', function(){ this.dataset.manual='1'; });
    autoTotal();
  }, 80);

  var saveBtn = document.getElementById('modal-save');
  if (saveBtn) {
    saveBtn.textContent = 'Enregistrer la location';
    saveBtn.onclick = _saveNewLocation;
  }

  // ★ Point 8 : restaure un brouillon existant, puis surveille la saisie.
  var NL_DRAFT_FIELDS = ['nl-ref','nl-fn','nl-ln','nl-phone','nl-profession','nl-nat','nl-car','nl-ppu','nl-days','nl-start','nl-start-time','nl-end','nl-end-time','nl-pickup','nl-source','nl-total','nl-paid','nl-mode','nl-collected-by','nl-notes','nl-doctype','nl-sublease'];
  setTimeout(function () {
    if (draftRestore('nl', NL_DRAFT_FIELDS)) showToast('Brouillon restauré ✓');
    draftWatch('nl', bodyEl, NL_DRAFT_FIELDS);
  }, 100);
}

function nlPayCalc() {
  var total = parseFloat((document.getElementById('nl-total')&&document.getElementById('nl-total').value)||0);
  var paid  = parseFloat((document.getElementById('nl-paid') &&document.getElementById('nl-paid').value) ||0);
  var reste = Math.max(0, total-paid);
  var box   = document.getElementById('nl-rest');
  if (!box) return;
  var statut, col;
  if (paid<=0)                        { statut='Non payé';          col='var(--red)'; }
  else if (paid>=total && total>0)    { statut='Paiement complet';  col='#22c55e'; }
  else                                { statut='Paiement partiel';  col='#d97706'; }
  box.innerHTML = 'Reste : <span style="color:' + col + ';font-weight:800;">' + fmtMAD(reste) + '</span> &nbsp;·&nbsp; <span style="color:' + col + ';">' + statut + '</span>';
}

function _saveNewLocation() {
  var fleet = aslFleet();
  var fn   = document.getElementById('nl-fn')   && document.getElementById('nl-fn').value;
  var ln   = document.getElementById('nl-ln')   && document.getElementById('nl-ln').value;
  var carSel  = document.getElementById('nl-car');
  var carOpt  = carSel && carSel.options[carSel.selectedIndex];
  var carId   = carSel ? parseInt(carSel.value) : null;
  var car     = fleet.find(function(c){ return c.id===carId; });
  var start   = document.getElementById('nl-start') && document.getElementById('nl-start').value;
  var end     = document.getElementById('nl-end')   && document.getElementById('nl-end').value;
  var startTime = (document.getElementById('nl-start-time') && document.getElementById('nl-start-time').value) || '10:00';
  var endTime   = (document.getElementById('nl-end-time')   && document.getElementById('nl-end-time').value)   || '10:00';
  if (!fn || !start || !end) { alert('Complétez les champs obligatoires (prénom, dates)'); return; }
  var days = Math.max(1, Math.round((new Date(end)-new Date(start))/(86400000)));
  // ★ CORRECTIF (point 9) : prix journalier libre et obligatoire, plus
  //   aucun repli automatique sur le prix de la fiche véhicule.
  var ppu  = parseFloat(document.getElementById('nl-ppu')&&document.getElementById('nl-ppu').value)||0;
  if (!ppu || ppu <= 0) { alert('Merci de saisir le prix journalier (le prix de la fiche véhicule n\'est qu\'une référence, il n\'est plus appliqué automatiquement).'); return; }
  var total = parseFloat(document.getElementById('nl-total')&&document.getElementById('nl-total').value) || ppu*days;
  var paid  = parseFloat(document.getElementById('nl-paid') &&document.getElementById('nl-paid').value)  || 0;
  var plate = (carOpt && carOpt.getAttribute('data-plate')) || (car&&car.plate) || '';
  var color = (carOpt && carOpt.getAttribute('data-color')) || '';
  var ref   = (document.getElementById('nl-ref')&&document.getElementById('nl-ref').value||'').trim();
  var payStatus = paid<=0 ? 'Non payé' : (paid>=total ? 'Paiement complet' : 'Paiement partiel');
  var mode  = document.getElementById('nl-mode')&&document.getElementById('nl-mode').value || 'Espèces';

  /* Type de dossier : sous-location ? */
  var docType = (document.getElementById('nl-doctype') && document.getElementById('nl-doctype').value) || 'direct';
  var subleaseId = '';
  if (docType === 'sublease') {
    subleaseId = (document.getElementById('nl-sublease') && document.getElementById('nl-sublease').value) || '';
    if (!subleaseId) { alert('Veuillez choisir une sous-location (ou la créer).'); return; }
  }
  var finalClientName = (fn + ' ' + (ln||'')).trim();

  /* ★ VÉRIFICATION DE CONFLIT avant d'enregistrer (disponibilité réelle) */
  if (typeof ASLDB !== 'undefined' && ASLDB.checkAvailability && car) {
    var chk = ASLDB.checkAvailability(car, start, end, startTime, endTime);
    if (!chk.available) {
      var msg = '⛔ CONFLIT DÉTECTÉ\n\nLe véhicule « ' + car.name + ' » est déjà réservé ou loué sur cette période.';
      if (chk.nextFrom) {
        msg += '\n\nProchaine disponibilité : ' + chk.nextFrom.toLocaleDateString('fr-FR', {day:'numeric',month:'long',year:'numeric'}) + ' à ' + chk.nextFrom.toLocaleTimeString('fr-FR', {hour:'2-digit',minute:'2-digit'}) + ' (marge de sécurité incluse).';
      }
      msg += '\n\nVoulez-vous quand même forcer l\'enregistrement ?';
      if (!confirm(msg)) return;
    } else if (chk.tightReturns && chk.tightReturns.length) {
      var tr = chk.tightReturns[0];
      alert('⚠ ATTENTION — Retour serré\n\nUn autre véhicule identique doit revenir le ' +
        tr.returnAt.toLocaleDateString('fr-FR',{day:'numeric',month:'long'}) + ' à ' + tr.returnAt.toLocaleTimeString('fr-FR',{hour:'2-digit',minute:'2-digit'}) +
        ', juste avant cette location.\n\nVérifiez le retour ou contactez le client actuel pour éviter tout retard.');
    }
  }

  // ★ Point 3 : "Encaissé par" est obligatoire — indépendant de l'utilisateur connecté.
  var nlCollectedBy = (document.getElementById('nl-collected-by') && document.getElementById('nl-collected-by').value) || '';
  if (!nlCollectedBy) { alert('Merci de renseigner « Encaissé par » avant d\'enregistrer.'); return; }

  // ★ Points 5-6 : Location Longue Durée = même fiche, seul le type change,
  //   + le premier versement initialise un historique de paiements LIBRE
  //   (pas de calendrier fixe imposé — voir addLLDPaymentEntry pour les suivants).
  var isLLD = (document.getElementById('nl-is-lld') && document.getElementById('nl-is-lld').value === '1');
  var initialPayments = [];
  if (isLLD && paid > 0) {
    initialPayments.push({ date: (typeof ASLDB!=='undefined' && ASLDB.localDateISO) ? ASLDB.localDateISO() : new Date().toISOString().slice(0,10), amount: paid, mode: mode, collectedBy: nlCollectedBy, comment: '' });
  }

  var newLoc = null;
  if (typeof ASLDB!=='undefined' && ASLDB.addReservation) {
    newLoc = ASLDB.addReservation({
      client: (fn + ' ' + (ln||'')).trim(),
      contractRef: ref, email: '',
      phone: (document.getElementById('nl-phone')&&document.getElementById('nl-phone').value)||'',
      profession: (document.getElementById('nl-profession')&&document.getElementById('nl-profession').value)||'',
      nationality: (document.getElementById('nl-nat')&&document.getElementById('nl-nat').value)||'N/A',
      car: car ? car.name : '', carId: carId,
      pricePerDay: ppu, assignedPlate: plate, assignedColor: color,
      days: days, amount: total, paid: paid,
      paymentStatus: payStatus, paymentMode: mode, collectedBy: nlCollectedBy,
      startDate: start, endDate: end, startTime: startTime, endTime: endTime,
      pickup: (document.getElementById('nl-pickup')&&document.getElementById('nl-pickup').value)||'',
      source: (document.getElementById('nl-source')&&document.getElementById('nl-source').value)||'manual',
      type: isLLD ? 'lld' : 'location', status: 'active',
      payments: isLLD ? initialPayments : undefined,
      subleaseId: subleaseId, finalClient: subleaseId ? finalClientName : '',
      notes: (document.getElementById('nl-notes')&&document.getElementById('nl-notes').value)||''
      // ★ CORRECTIF CRITIQUE (régression Mission 2) : les documents ne sont
      //   PLUS jamais embarqués directement dans la réservation elle-même
      //   (voir _nlDocs juste en dessous). Une photo compressée pèse déjà
      //   100-400 Ko : embarquée ici, la réservation dépassait largement la
      //   limite de 20 Ko du serveur pour un ajout, qui était alors rejeté
      //   EN PERMANENCE — bloquant TOUTES les réservations suivantes dans la
      //   file d'attente de synchronisation (elles restaient coincées
      //   derrière celle-ci indéfiniment). Les documents continuent d'être
      //   correctement associés au client via saveCustomerDocs() ci-dessous,
      //   dans leur propre magasin synchronisé séparément.
    });
    if (car && plate && typeof ASLDB.setUnitStatusByPlate==='function') {
      ASLDB.setUnitStatusByPlate(carId, plate, 'active');
    } else if (car && typeof ASLDB.assignUnit==='function') {
      ASLDB.assignUnit(carId, 'active');
    }
  }
  if (typeof reloadData==='function') reloadData();
  var _nlDocs = (typeof collectDocs==='function') ? collectDocs('nl-doc-permis','nl-doc-identity') : {};
  if (newLoc && (_nlDocs.permis || _nlDocs.identite) && typeof saveCustomerDocs==='function') saveCustomerDocs(newLoc.email, newLoc.client, _nlDocs);
  if (typeof clearPendingDocs==='function') clearPendingDocs();
  renderRentals(); renderDashboard();
  if (typeof renderPayments==='function') renderPayments();
  if (typeof renderSubleases==='function') renderSubleases();
  updateBadges();
  if (typeof closeModal==='function') closeModal();
  draftClear('nl'); // ★ Point 8 : enregistrement réussi = brouillon effacé
  showToast('Location ' + (newLoc ? newLoc.id : '') + ' créée et synchronisée ✓');
}

/* Affiche/masque le sélecteur de sous-location selon le type de dossier. */
function nlToggleSublease() {
  var box = document.getElementById('nl-sublease-box');
  var type = (document.getElementById('nl-doctype') && document.getElementById('nl-doctype').value) || 'direct';
  if (box) box.style.display = (type === 'sublease') ? 'block' : 'none';
}

/* Création rapide d'une sous-location depuis le formulaire de location. */
function nlQuickCreateSublease() {
  if (typeof openSubleaseModal !== 'function') return;
  openSubleaseModal(null, function (saved) {
    var sel = document.getElementById('nl-sublease');
    if (sel && saved) { sel.innerHTML = ASLSublease.options(saved.id); }
  });
}

/* ==================== viewRes AMÉLIORÉ (remplace la version originale) ==================== */

function viewRes(id) {
  var res = aslRes();
  var r = res.find(function(x) { return String(x.id) === String(id); });
  if (!r) return;
  var overlay = document.getElementById('modal-overlay');
  var titleEl = document.getElementById('modal-title');
  var bodyEl  = document.getElementById('modal-body');
  var footEl  = document.getElementById('modal-footer');
  if (!overlay) return;
  if (titleEl) titleEl.textContent = 'Réservation ' + (r.contractRef||r.id);
  overlay.classList.add('open');

  var total = Number(r.amount)||0, paid = Number(r.paid)||0;
  var mode  = r.paymentMode || 'Espèces';

  if (bodyEl) bodyEl.innerHTML =
    // ★ Point 6 : nom de la sous-location affiché en tout premier si applicable.
    (function() {
      var slName = subLeaseNameFor(r);
      return slName ? '<div style="background:rgba(139,92,246,.08);border:1px solid rgba(139,92,246,.25);border-radius:10px;padding:10px 14px;margin-bottom:12px;"><div style="font-size:11px;color:#8b5cf6;font-weight:700;text-transform:uppercase;letter-spacing:.4px;">Sous-location</div><div style="font-weight:800;font-size:15px;">' + slName + '</div></div>' : '';
    })() +
    '<div class="form-group"><label class="form-label">N° Contrat</label>' +
    '<input class="form-input" id="vr-ref" value="' + (r.contractRef||r.id||'') + '" style="font-weight:700;">' +
    '<div style="font-size:11px;color:var(--text3);margin-top:3px;">Modifiable — synchronisé avec Paiements, Clients et Tableau de bord</div></div>' +
    '<div class="res-detail-grid">' +
    _rCell('Client',       '<strong>' + (r.client||'') + '</strong>') +
    _rCell('Téléphone',    r.phone||'—') +
    _rCell('Email',        '<span style="font-size:12px;">' + (r.email||'—') + '</span>') +
    _rCell('Nationalité',  r.nationality||'—') +
    _rCell('Véhicule',     r.car||'—') +
    _rCell('Durée',        (r.days||'—') + ' jours') +
    _rCell('Départ',       (r.pickup||'') + '<br><small>' + fmtD(r.startDate||'') + (r.startTime ? ' à ' + r.startTime : '') + '</small>') +
    _rCell('Retour',       fmtD(r.endDate||'') + (r.endTime ? ' à ' + r.endTime : '')) +
    _rCell('Source',       '<span class="badge badge-gray">' + (r.source||'—') + '</span>' + ((r.source==='phone'||r.source==='manual')?' <span style="font-size:10px;background:rgba(0,0,0,.07);padding:2px 6px;border-radius:4px;">Manuelle</span>':'')) +
    _rCell('Statut',       statusBadge(r.status)) +
    '</div>' +
    '<div style="font-size:22px;font-weight:800;color:var(--red);margin:12px 0;">' + fmtMAD(total) + '</div>' +
    ((r.status !== 'cancelled' && r.status !== 'completed') ?
      (function() {
        // ★ CORRECTIF : le bouton et l'action doivent correspondre au TYPE
        //   RÉEL de l'opération (phase réelle), pas seulement au statut brut.
        //   Une "réservation" pas encore démarrée → Annuler la réservation.
        //   Un élément déjà en cours (loué) ou en retard → Annuler la location.
        var phase = (typeof ASLDB !== 'undefined' && ASLDB.computePhase) ? ASLDB.computePhase(r) : 'reserved';
        var isLocation = (phase === 'active' || phase === 'late');
        return '<div style="margin-bottom:14px;display:flex;gap:8px;flex-wrap:wrap;">' +
          '<button class="topbar-btn secondary" style="color:var(--red);border-color:var(--red);" data-rid="' + r.id + '" onclick="' + (isLocation ? 'cancelRental' : 'cancelReservation') + '(this.dataset.rid)">❌ ' + (isLocation ? 'Annuler la location' : 'Annuler la réservation') + '</button>' +
          '</div>';
      })() : '') +
    // ★ Point 1 : suppression définitive toujours disponible, quel que soit le statut.
    '<div style="margin-bottom:14px;">' +
    '<button class="topbar-btn secondary" style="color:var(--text3);" data-rid="' + r.id + '" onclick="deleteReservationPermanently(this.dataset.rid)">🗑 Supprimer définitivement</button>' +
    '</div>' +
    '<div style="background:rgba(18,22,30,.04);border-radius:10px;padding:14px;">' +
    '<div style="font-weight:700;margin-bottom:10px;color:var(--red);">Paiement</div>' +
    '<div class="form-row">' +
    '<div class="form-group"><label class="form-label">Total (MAD)</label>' +
    '<input class="form-input" type="number" id="vr-total" value="' + total + '" oninput="vrPayCalc(parseFloat(this.value)||0)"></div>' +
    '<div class="form-group"><label class="form-label">Montant reçu (MAD)</label>' +
    '<input class="form-input" type="number" id="vr-paid" value="' + paid + '" oninput="vrPayCalc(parseFloat(document.getElementById(\'vr-total\').value)||' + total + ')"></div>' +
    '</div>' +
    '<div class="form-row">' +
    '<div class="form-group"><label class="form-label">Mode de paiement</label>' +
    '<select class="form-select" id="vr-mode">' +
    ['Espèces','Carte bancaire','Virement','Chèque','Autre'].map(function(m){ return '<option' + (mode===m?' selected':'') + '>' + m + '</option>'; }).join('') +
    '</select></div>' +
    '<div class="form-group"><label class="form-label">Encaissé par</label>' +
    '<select class="form-select" id="vr-collected-by">' +
    '<option value=""' + (!r.collectedBy?' selected':'') + '>— Non renseigné —</option>' +
    ['Mohamed','Younes','Khalid'].map(function(m){ return '<option' + (r.collectedBy===m?' selected':'') + '>' + m + '</option>'; }).join('') +
    '</select></div>' +
    '</div>' +
    '<div id="vr-rest" style="font-weight:700;font-size:13px;margin-top:6px;"></div></div>' +
    '<div style="display:flex;gap:8px;margin-top:12px;flex-wrap:wrap;">' +
    '<button class="topbar-btn secondary" style="flex:1;min-width:120px;" onclick="addDocsToReservation(\'' + r.id + '\')">📎 Documents</button>' +
    (r.phone ? '<a href="https://wa.me/' + r.phone.replace(/[^0-9]/g,'') + '" target="_blank" class="topbar-btn primary" style="flex:1;text-align:center;text-decoration:none;min-width:120px;">WhatsApp</a>' : '') +
    (r.phone ? '<a href="tel:' + r.phone + '" class="topbar-btn secondary" style="flex:1;text-align:center;text-decoration:none;min-width:120px;">Appeler</a>' : '') +
    '</div>';

  if (footEl) footEl.style.display = 'flex';
  var saveBtn = document.getElementById('modal-save');
  if (saveBtn) {
    saveBtn.textContent = r.status==='pending' ? 'Confirmer la réservation' : 'Enregistrer les modifications';
    saveBtn.onclick = function() {
      // ★ Point 9 : total/prix modifiables même après enregistrement, sans doublon.
      var newTotal = parseFloat(document.getElementById('vr-total')&&document.getElementById('vr-total').value);
      if (isNaN(newTotal)) newTotal = total;
      var newPaid = parseFloat(document.getElementById('vr-paid')&&document.getElementById('vr-paid').value || 0);
      var newRef  = (document.getElementById('vr-ref') &&document.getElementById('vr-ref').value)  || r.contractRef || r.id;
      var newMode = (document.getElementById('vr-mode')&&document.getElementById('vr-mode').value) || r.paymentMode;
      var newCollectedBy = (document.getElementById('vr-collected-by')&&document.getElementById('vr-collected-by').value) || '';
      var payStatus = newPaid<=0 ? 'Non payé' : (newPaid>=newTotal ? 'Paiement complet' : 'Paiement partiel');
      if (r.status==='pending' && typeof confirmRes==='function') { confirmRes(id); }
      if (typeof ASLDB!=='undefined' && ASLDB.updateReservation) {
        ASLDB.updateReservation(id, { paid: newPaid, amount: newTotal, paymentMode: newMode, paymentStatus: payStatus, contractRef: newRef, collectedBy: newCollectedBy });
      }
      if (typeof reloadData==='function') reloadData();
      if (typeof renderAllReservations==='function') renderAllReservations();
      if (typeof renderPayments==='function') renderPayments();
      renderRentals(); renderDashboard(); updateBadges();
      if (typeof closeModal==='function') closeModal();
      showToast('Réservation mise à jour et synchronisée ✓');
    };
  }
  setTimeout(function(){ vrPayCalc(total); }, 50);
}

/* ============================================================
   ★ Item 1E — Fiche IMPAYÉS dédiée : uniquement infos client + paiement.
   AUCUNE action de réservation/location (ni annuler, ni confirmer, ni
   prolonger) — cette fiche ne sert qu'à enregistrer un paiement. Dès que
   le reste à payer atteint 0, le dossier disparaît automatiquement de la
   liste des impayés (recalculée à chaque ouverture du tiroir).
   ============================================================ */
function viewUnpaidFiche(id) {
  var res = aslRes();
  var r = res.find(function(x) { return String(x.id) === String(id); });
  if (!r) return;
  var overlay = document.getElementById('modal-overlay');
  var titleEl = document.getElementById('modal-title');
  var bodyEl  = document.getElementById('modal-body');
  var footEl  = document.getElementById('modal-footer');
  if (!overlay) return;
  if (titleEl) titleEl.textContent = 'Paiement — ' + (r.contractRef||r.id);
  overlay.classList.add('open');

  var total = Number(r.amount)||0, paid = Number(r.paid)||0;
  var mode  = r.paymentMode || 'Espèces';

  if (bodyEl) bodyEl.innerHTML =
    // ★ Point 7 : nom de la sous-location affiché en tout premier si applicable.
    (function() {
      var slName = subLeaseNameFor(r);
      return slName ? '<div style="background:rgba(139,92,246,.08);border:1px solid rgba(139,92,246,.25);border-radius:10px;padding:10px 14px;margin-bottom:12px;"><div style="font-size:11px;color:#8b5cf6;font-weight:700;text-transform:uppercase;letter-spacing:.4px;">Sous-location</div><div style="font-weight:800;font-size:15px;">' + slName + '</div></div>' : '';
    })() +
    '<div class="res-detail-grid">' +
    _rCell('Client',    '<strong>' + (r.client||'') + '</strong>') +
    _rCell('Téléphone', r.phone||'—') +
    _rCell('Véhicule',  r.car||'—') +
    _rCell('Contrat',   r.contractRef||r.id) +
    '</div>' +
    '<div style="font-size:22px;font-weight:800;color:var(--red);margin:12px 0;" id="vr-total-display">' + fmtMAD(total) + '</div>' +
    '<div style="background:rgba(18,22,30,.04);border-radius:10px;padding:14px;">' +
    '<div style="font-weight:700;margin-bottom:10px;color:var(--red);">Paiement</div>' +
    '<div class="form-row">' +
    '<div class="form-group"><label class="form-label">Total (MAD)</label>' +
    '<input class="form-input" type="number" id="vr-total" value="' + total + '" oninput="vrPayCalc(parseFloat(this.value)||0)"></div>' +
    '<div class="form-group"><label class="form-label">Montant reçu (MAD)</label>' +
    '<input class="form-input" type="number" id="vr-paid" value="' + paid + '" oninput="vrPayCalc(parseFloat(document.getElementById(\'vr-total\').value)||' + total + ')"></div>' +
    '</div>' +
    '<div class="form-row">' +
    '<div class="form-group"><label class="form-label">Mode de paiement</label>' +
    '<select class="form-select" id="vr-mode">' +
    ['Espèces','Carte bancaire','Virement','Chèque','Autre'].map(function(m){ return '<option' + (mode===m?' selected':'') + '>' + m + '</option>'; }).join('') +
    '</select></div>' +
    '<div class="form-group"><label class="form-label">Encaissé par</label>' +
    '<select class="form-select" id="vr-collected-by">' +
    '<option value=""' + (!r.collectedBy?' selected':'') + '>— Non renseigné —</option>' +
    ['Mohamed','Younes','Khalid'].map(function(m){ return '<option' + (r.collectedBy===m?' selected':'') + '>' + m + '</option>'; }).join('') +
    '</select></div>' +
    '</div>' +
    '<div id="vr-rest" style="font-weight:700;font-size:13px;margin-top:6px;"></div></div>';

  if (footEl) footEl.style.display = 'flex';
  var saveBtn = document.getElementById('modal-save');
  if (saveBtn) {
    saveBtn.textContent = 'Enregistrer le paiement';
    saveBtn.onclick = function() {
      // ★ Point 9 : total modifiable même après enregistrement, sans doublon.
      var newTotal = parseFloat(document.getElementById('vr-total') && document.getElementById('vr-total').value);
      if (isNaN(newTotal)) newTotal = total;
      var newPaid = parseFloat(document.getElementById('vr-paid') && document.getElementById('vr-paid').value || 0);
      var newMode = (document.getElementById('vr-mode') && document.getElementById('vr-mode').value) || r.paymentMode;
      var newCollectedBy = (document.getElementById('vr-collected-by') && document.getElementById('vr-collected-by').value) || '';
      var payStatus = newPaid<=0 ? 'Non payé' : (newPaid>=newTotal ? 'Paiement complet' : 'Paiement partiel');
      if (typeof ASLDB!=='undefined' && ASLDB.updateReservation) {
        ASLDB.updateReservation(id, { paid: newPaid, amount: newTotal, paymentMode: newMode, paymentStatus: payStatus, collectedBy: newCollectedBy });
      }
      if (typeof reloadData==='function') reloadData();
      if (typeof renderAllReservations==='function') renderAllReservations();
      if (typeof renderPayments==='function') renderPayments();
      renderRentals(); renderDashboard(); updateBadges();
      if (typeof closeModal==='function') closeModal();
      showToast(newPaid>=total ? 'Paiement enregistré — dossier soldé ✓' : 'Paiement enregistré ✓');
    };
  }
  setTimeout(function(){ vrPayCalc(total); }, 50);
}

/* ============================================================
   ★ CORRECTIF — Documents (Permis / CIN / Passeport) dans les formulaires
   "Nouvelle réservation" et "Nouvelle location".
   Ces deux fonctions étaient APPELÉES (onchange="docPreview(...)",
   collectDocs(...) au moment d'enregistrer) mais n'étaient définies NULLE
   PART dans le projet : la sélection d'un document ne faisait donc
   littéralement rien, et aucun document n'était jamais enregistré depuis
   ces deux formulaires. Implémentées ici, avec en plus le collage
   (Ctrl+V) et le glisser-déposer demandés (point 5), pour les 3 documents
   (permis, CIN, passeport).
   ============================================================ */
function docPreview(input, previewId) {
  var file = input && input.files && input.files[0];
  _applyDocFile(input && input.id, previewId, file);
  if (input) input.value = '';
}

function collectDocs(permisInputId, identityInputId) {
  var out = {};
  var p = document.getElementById(permisInputId);
  var i = document.getElementById(identityInputId);
  // ★ CORRECTIF (point 3) : plusieurs images (recto/verso) par champ,
  //   stockées en tableau JSON sur l'élément — jamais une seule valeur qui
  //   écraserait la précédente à chaque collage.
  if (p && p.dataset && p.dataset.dataurls) { try { out.permis = JSON.parse(p.dataset.dataurls); } catch(e) {} }
  if (i && i.dataset && i.dataset.dataurls) { try { out.identite = JSON.parse(i.dataset.dataurls); } catch(e) {} }
  return out;
}

/* Colle une image copiée (Ctrl+V) directement dans un champ document. */
function pasteDocField(inputId, previewId, ev) {
  var items = (ev.clipboardData && ev.clipboardData.items) || [];
  for (var k = 0; k < items.length; k++) {
    if (items[k].type && items[k].type.indexOf('image') === 0) {
      var file = items[k].getAsFile();
      if (file) { ev.preventDefault(); _applyDocFile(inputId, previewId, file); return; }
    }
  }
}

/* Glisser-déposer une image sur un champ document. */
function dropDocField(inputId, previewId, ev) {
  ev.preventDefault();
  if (ev.currentTarget && ev.currentTarget.classList) ev.currentTarget.classList.remove('doc-drop-active');
  var file = ev.dataTransfer && ev.dataTransfer.files && ev.dataTransfer.files[0];
  if (file) _applyDocFile(inputId, previewId, file);
}

/* ★ Même protection anti-course que la fiche client (point 10) : une file
   par champ garantit qu'un collage rapide n'écrase jamais le précédent. */
var _docFieldQueues = {};
function _applyDocFile(inputId, previewId, file) {
  var qKey = inputId || previewId || 'default';
  var prevQ = _docFieldQueues[qKey] || Promise.resolve();
  var next = prevQ.then(function () { return _applyDocFileNow(inputId, previewId, file); })
    .catch(function (e) { console.error('_applyDocFile:', e); });
  _docFieldQueues[qKey] = next;
  return next;
}
async function _applyDocFileNow(inputId, previewId, file) {
  var input = inputId ? document.getElementById(inputId) : null;
  var prev = previewId ? document.getElementById(previewId) : null;
  if (!file) return;
  if (file.size > 20 * 1024 * 1024) { alert('Fichier trop volumineux (max 20 Mo).'); return; }
  // ★ Point 5 : même compression que la fiche client, pour éviter toute
  //   erreur de capacité de stockage dès la création.
  var result = (typeof _compressImageFile === 'function') ? await _compressImageFile(file, 1200, 0.7) : null;
  if (!result) {
    var reader = new FileReader();
    reader.onload = function(e) { result = e.target.result; _finishDocPreview(input, prev, result); };
    reader.readAsDataURL(file);
    return;
  }
  _finishDocPreview(input, prev, result);
}

/* ★ CORRECTIF (point 3) — Chaque nouvelle image (recto/verso, pages
   multiples) est désormais AJOUTÉE au tableau existant sur le champ, jamais
   remplacée. `input.dataset.dataurls` contient un tableau JSON, lu ensuite
   par collectDocs() au moment d'enregistrer la réservation/location. */
function _finishDocPreview(input, prev, dataUrl) {
  if (input) {
    var arr = [];
    try { arr = JSON.parse(input.dataset.dataurls || '[]'); } catch (e) { arr = []; }
    arr.push(dataUrl);
    input.dataset.dataurls = JSON.stringify(arr);
    if (prev) _renderDocPreviewGallery(input, prev, arr);
  } else if (prev) {
    prev.innerHTML = '<img src="' + dataUrl + '" style="width:48px;height:48px;border-radius:8px;object-fit:cover;">' +
      '<span style="font-size:11px;color:#22c55e;margin-left:6px;">✓ Enregistré</span>';
  }
}

/* Galerie de vignettes pour les documents en cours de création (avant même
   l'enregistrement de la réservation), avec suppression individuelle. */
function _renderDocPreviewGallery(input, prev, arr) {
  var thumbs = arr.map(function (url, idx) {
    return '<div style="position:relative;display:inline-block;">' +
      '<img src="' + url + '" style="width:44px;height:44px;border-radius:6px;object-fit:cover;">' +
      '<button type="button" style="position:absolute;top:-5px;right:-5px;width:16px;height:16px;padding:0;border:none;border-radius:50%;background:#fff;color:var(--red);line-height:1;font-size:10px;box-shadow:0 1px 3px rgba(0,0,0,.25);cursor:pointer;" title="Retirer" onclick="_removeDocPreview(\'' + input.id + '\',\'' + prev.id + '\',' + idx + ')">✕</button>' +
      '</div>';
  }).join('');
  prev.innerHTML = '<div style="display:flex;gap:6px;flex-wrap:wrap;align-items:center;">' + thumbs +
    '<span style="font-size:11px;color:#22c55e;">✓ ' + arr.length + ' image' + (arr.length>1?'s':'') + '</span></div>';
}
function _removeDocPreview(inputId, previewId, idx) {
  var input = document.getElementById(inputId);
  var prev = document.getElementById(previewId);
  if (!input) return;
  var arr = [];
  try { arr = JSON.parse(input.dataset.dataurls || '[]'); } catch (e) { arr = []; }
  arr.splice(idx, 1);
  input.dataset.dataurls = JSON.stringify(arr);
  if (prev) {
    if (arr.length) _renderDocPreviewGallery(input, prev, arr);
    else prev.innerHTML = '';
  }
}

function _rCell(label, val) {
  return '<div class="res-detail-item"><div class="res-detail-label">' + label + '</div><div class="res-detail-val">' + val + '</div></div>';
}

function vrPayCalc(total) {
  var paidEl = document.getElementById('vr-paid');
  var restEl = document.getElementById('vr-rest');
  var totalDisplay = document.getElementById('vr-total-display');
  if (totalDisplay) totalDisplay.textContent = fmtMAD(total);
  if (!paidEl || !restEl) return;
  var paid = parseFloat(paidEl.value)||0, reste = Math.max(0, total-paid);
  var statut, col;
  if (paid<=0)                        { statut='Non payé';          col='var(--red)'; }
  else if (paid>=total && total>0)    { statut='Paiement complet';  col='#22c55e'; }
  else                                { statut='Paiement partiel';  col='#d97706'; }
  restEl.innerHTML = 'Reste : <span style="color:' + col + ';font-weight:800;">' + fmtMAD(reste) + '</span> &nbsp;·&nbsp; <span style="color:' + col + ';">' + statut + '</span>';
}

/* ==================== CSS DYNAMIQUE ==================== */

(function() {
  var style = document.createElement('style');
  style.textContent = [
    /* 5-card grid responsive */
    '#dash-cards-grid { grid-template-columns: repeat(7,1fr) !important; }',
    '@media(max-width:1200px){ #dash-cards-grid { grid-template-columns: repeat(4,1fr) !important; } }',
    '@media(max-width:580px){ #dash-cards-grid { grid-template-columns: repeat(2,1fr) !important; } }',
    /* Hover sur cartes */
    '.stat-card[onclick] { transition: transform .15s, box-shadow .15s, border-color .15s; }',
    '.stat-card[onclick]:hover { transform: translateY(-3px); box-shadow: 0 8px 28px rgba(0,0,0,.12); }',
    /* Table actions */
    '#rentals-table td:last-child { white-space:nowrap; }',
    /* Fleet grid fix */
    '.fleet-grid { display:grid; grid-template-columns:repeat(auto-fill,minmax(260px,1fr)); gap:18px; }',
  ].join('\n');
  document.head.appendChild(style);
})();

/* ==================== INIT ==================== */

document.addEventListener('DOMContentLoaded', function() {
  updateBadges();
  renderDashboard();
  /* Rafraîchissement en temps réel : dès que les données changent
     (création/édition de réservation, sync depuis le site client,
     paiement…), on met à jour le tableau de bord (dont "Retours
     aujourd'hui", "Loués", "Impayés"…). */
  if (typeof ASLDB !== 'undefined' && typeof ASLDB.onChange === 'function') {
    ASLDB.onChange(function () {
      setTimeout(function () {
        try { renderDashboard(); } catch (e) {}
        try { if (typeof updateBadges === 'function') updateBadges(); } catch (e) {}
        try { if (typeof renderRentals === 'function') renderRentals(); } catch (e) {}
      }, 50);
    });
  }
  /* ★ CORRECTIF — Un dossier passe de "Réservé" à "Loué" (ou de "Loué" à
     "En retard") uniquement parce que l'heure réelle a dépassé sa date de
     départ/retour — computePhase() le recalcule en direct, mais RIEN
     n'écrit de nouvelle donnée à cet instant précis (aucun événement
     onChange ne se déclenche). Sans rafraîchissement périodique, les
     cartes du Dashboard restaient donc figées sur l'ancienne phase (ex. le
     compteur "Réservés" affichait encore 1 alors que le dossier était déjà
     "Loué" et la liste, elle, correctement vide) jusqu'à ce qu'une autre
     action déclenche un re-rendu. Ce minuteur rafraîchit le Dashboard
     toutes les 30 secondes pour que ces transitions purement temporelles
     restent toujours à jour, sans attendre une action ou une synchronisation. */
  setInterval(function () {
    try { renderDashboard(); } catch (e) {}
    try { if (typeof updateBadges === 'function') updateBadges(); } catch (e) {}
  }, 30000);
  /* Enregistrement auto → toast vert */
  document.addEventListener('click', function(e) {
    var btn = e.target && (e.target.tagName==='BUTTON' ? e.target : e.target.closest('button'));
    if (!btn) return;
    var txt = (btn.textContent||'').toLowerCase();
    var oc  = (btn.getAttribute('onclick')||'').toLowerCase();
    if (txt.indexOf('enregistrer')>=0 || txt.indexOf('confirmer')>=0 ||
        oc.indexOf('save')>=0 || oc.indexOf('savemaint')>=0 || oc.indexOf('savere')>=0) {
      /* showToast is called directly from save functions */
    }
  }, true);
});
