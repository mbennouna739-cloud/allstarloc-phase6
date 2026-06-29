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
  var d = new Date(); d.setHours(0,0,0,0); return d.toISOString().slice(0,10);
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
    var pending = res.filter(function(r) { return r.status === 'pending'; }).length;
    var el = document.getElementById('badge-res');
    if (el) el.textContent = pending;

    var active = res.filter(function(r) { return r.status === 'active' || r.status === 'confirmed'; }).length;
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

function renderDashboard() {
  try {
    var fleet = aslFleet();
    var res = aslRes();
    var ts = todayStr();

    // Compter les UNITÉS réellement disponibles (un modèle « Stock 2 »
    // compte pour 2). On utilise modelAvailability si présent, sinon repli.
    function _avUnits(c) {
      try {
        if (typeof ASLDB !== 'undefined' && ASLDB.modelAvailability) return ASLDB.modelAvailability(c).available;
      } catch (e) {}
      return (c.status === 'available') ? Math.max(1, parseInt(c.stock) || 1) : 0;
    }
    var availUnitsTotal = fleet.reduce(function (s, c) { return s + _avUnits(c); }, 0);
    var avail   = fleet.filter(function(c) { return c.status === 'available'; });
    var rented  = res.filter(function(r) { return (r.status === 'active' || r.status === 'confirmed') && (r.startDate||'') <= ts && (r.endDate||'') >= ts; });
    var returns = res.filter(function(r) { return (r.endDate||'').slice(0,10) === ts && r.status !== 'cancelled'; });
    var late    = res.filter(function(r) { return (r.endDate||'') < ts && (r.status === 'active' || r.status === 'confirmed'); });
    var unpaid  = res.filter(function(r) { if (r.status === 'cancelled') return false; return (Number(r.amount)||0) > (Number(r.paid)||0); });

    function setV(id, val, col) {
      var el = document.getElementById(id);
      if (el) { el.textContent = val; if (col) el.style.color = col; }
    }
    setV('dash-available', availUnitsTotal, availUnitsTotal ? '#22c55e'    : '');
    setV('dash-rented',    rented.length,  rented.length  ? '#3b82f6'    : '');
    setV('dash-returns',   returns.length, returns.length ? '#f59e0b'    : '');
    setV('dash-late',      late.length,    late.length    ? 'var(--red)' : '');
    setV('dash-unpaid',    unpaid.length,  unpaid.length  ? '#ef4444'    : '');

    var tbody = document.getElementById('dashboard-reservations');
    if (tbody) {
      var recent = res.slice().sort(function(a,b) {
        return String(b.createdAt||b.startDate||'').localeCompare(String(a.createdAt||a.startDate||''));
      }).slice(0,7);
      if (!recent.length) {
        tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;padding:32px;color:var(--text3);">Aucune réservation — les réservations du site client apparaîtront ici automatiquement.</td></tr>';
      } else {
        tbody.innerHTML = recent.map(function(r) {
          return '<tr>' +
            '<td><strong>' + (r.contractRef || r.id || '') + '</strong></td>' +
            '<td>' + (r.client || '') + '</td>' +
            '<td style="font-size:12px;color:var(--text2);">' + (r.car || '') + '</td>' +
            '<td style="font-size:12px;">' + (r.startDate||'') + (r.endDate ? ' → '+r.endDate : '') + '</td>' +
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

function openDashDrawer(type) {
  var fleet = aslFleet();
  var res = aslRes();
  var ts = todayStr();
  var today = new Date(); today.setHours(0,0,0,0);
  var title = '', rows = [];

  if (type === 'available') {
    title = '🟢 Véhicules disponibles';
    fleet.filter(function(c) { return c.status === 'available'; }).forEach(function(c) {
      var future = nextFutureReservation(c, res, ts);
      var av = 1, tot = 1;
      try { if (ASLDB.modelAvailability) { var m = ASLDB.modelAvailability(c); av = m.available; tot = m.total; } } catch (e) {}
      var unitBadge = (tot > 1) ? '<span class="badge badge-green">● ' + av + ' / ' + tot + ' dispo</span>' : '<span class="badge badge-green">● Disponible</span>';
      rows.push(
        '<div style="display:flex;justify-content:space-between;align-items:center;padding:12px 0;border-bottom:1px solid var(--border);gap:10px;">' +
        '<div style="min-width:0;"><div style="font-weight:700;">' + c.name + (tot > 1 ? ' <span style="font-size:11px;color:var(--text3);font-weight:500;">(stock ' + tot + ')</span>' : '') + '</div>' +
        '<div style="font-size:12px;color:var(--text3);">' + (c.plate||'') + ' · ' + (c.fuel||'') + ' · ' + (c.transmission||'') + '</div>' +
        (future ? '<div style="font-size:12px;color:#d97706;margin-top:2px;">Réservée du ' + fmtD(future.startDate) + ' au ' + fmtD(future.endDate) + '</div>' : '') +
        '</div>' +
        '<div style="text-align:right;flex-shrink:0;">' + unitBadge + '</div>' +
        '</div>'
      );
    });
    if (!rows.length) rows.push('<div style="color:var(--text3);text-align:center;padding:30px;">Aucun véhicule disponible en ce moment</div>');

  } else if (type === 'rented') {
    title = '🔵 Véhicules loués actuellement';
    res.filter(function(r) { return (r.status==='active'||r.status==='confirmed') && (r.startDate||'')<=ts && (r.endDate||'')>=ts; }).forEach(function(r) {
      rows.push(
        '<div style="display:flex;justify-content:space-between;align-items:center;padding:12px 0;border-bottom:1px solid var(--border);">' +
        '<div><div style="font-weight:700;">' + (r.car||'') + '</div>' +
        '<div style="font-size:12px;color:var(--text3);">' + (r.client||'') + ' · ' + (r.contractRef||r.id) + '</div>' +
        '<div style="font-size:12px;">Retour : <strong>' + (r.endDate||'') + '</strong></div></div>' +
        '<div><button class="btn-sm ghost" data-rid="' + r.id + '" onclick="closeDashDrawer();showPage(\'rentals\',null);setTimeout(function(){viewRental(document.querySelector(\'[data-rid=' + r.id + ']\')&&document.querySelector(\'[data-rid=' + r.id + ']\').dataset.rid)},400)">Voir →</button></div>' +
        '</div>'
      );
    });
    if (!rows.length) rows.push('<div style="color:var(--text3);text-align:center;padding:30px;">Aucune location active à ce jour</div>');

  } else if (type === 'returns') {
    title = '🟡 Retours prévus';
    // Filtres : aujourd'hui (défaut) / demain / date choisie
    var rf = window._returnsFilter || { mode: 'today', date: ts };
    var targetDate = ts;
    if (rf.mode === 'tomorrow') {
      var tm = new Date(today.getTime() + 86400000);
      targetDate = tm.toISOString().slice(0, 10);
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
    var matches = res.filter(function(r) { return (r.endDate||'').slice(0,10)===targetDate && r.status!=='cancelled' && r.status!=='completed'; });
    matches.forEach(function(r) {
      // Récupérer l'immatriculation depuis la flotte
      var plate = '';
      var fc = fleet.filter(function(c){ return c.name===r.car || c.id===r.carId; })[0];
      if (fc) plate = fc.plate || '';
      if (r.assignedPlate) plate = r.assignedPlate;
      rows.push(
        '<div style="display:flex;justify-content:space-between;align-items:center;padding:12px 0;border-bottom:1px solid var(--border);gap:10px;">' +
        '<div style="min-width:0;"><div style="font-weight:700;">' + (r.car||'') + '</div>' +
        '<div style="font-size:12px;color:var(--text3);">' + (plate ? '🚗 ' + plate + ' · ' : '') + (r.client||'') + '</div>' +
        '<div style="font-size:12px;">Retour prévu : <strong>' + (r.endDate||'') + '</strong>' + (r.endTime ? ' à <strong>' + r.endTime + '</strong>' : '') + '</div></div>' +
        '<div style="flex-shrink:0;"><button class="btn-sm primary" data-rid="' + r.id + '" onclick="closeDashDrawer();viewRes(this.dataset.rid)">Fiche →</button></div>' +
        '</div>'
      );
    });
    if (!matches.length) rows.push('<div style="color:#22c55e;text-align:center;padding:30px;">✓ Aucun retour prévu pour cette date</div>');

  } else if (type === 'late') {
    title = '🔴 Retards (date de retour dépassée)';
    res.filter(function(r) { return (r.endDate||'')<ts && (r.status==='active'||r.status==='confirmed'); }).forEach(function(r) {
      var diff = Math.round((today - new Date(r.endDate)) / 86400000);
      rows.push(
        '<div style="padding:12px 0;border-bottom:1px solid var(--border);">' +
        '<div style="font-weight:700;color:var(--red);">' + (r.car||'') + ' — ' + diff + ' jour(s) de retard</div>' +
        '<div style="font-size:12px;color:var(--text3);">' + (r.client||'') + ' — devait revenir le ' + (r.endDate||'') + '</div>' +
        '<div style="font-size:12px;margin-bottom:8px;">' + (r.phone||'') + '</div>' +
        '<div style="display:flex;gap:6px;flex-wrap:wrap;">' +
        '<button class="btn-sm primary" data-rid="' + r.id + '" onclick="dashConfirmReturn(this.dataset.rid)">Confirmer retour</button>' +
        '<button class="btn-sm ghost" data-rid="' + r.id + '" onclick="dashExtend(this.dataset.rid)">Prolonger</button>' +
        (r.phone ? '<a href="tel:'+r.phone+'" class="btn-sm ghost" style="text-decoration:none;">Appeler</a>' : '') +
        '</div></div>'
      );
    });
    if (!rows.length) rows.push('<div style="color:#22c55e;text-align:center;padding:30px;">✓ Aucun retard — tout est à l\'heure</div>');

  } else if (type === 'unpaid') {
    title = '💳 Dossiers avec impayés';
    res.filter(function(r) { if(r.status==='cancelled') return false; return (Number(r.amount)||0)>(Number(r.paid)||0); }).forEach(function(r) {
      var reste = (Number(r.amount)||0) - (Number(r.paid)||0);
      rows.push(
        '<div style="display:flex;justify-content:space-between;align-items:center;padding:12px 0;border-bottom:1px solid var(--border);">' +
        '<div><div style="font-weight:700;">' + (r.client||'') + '</div>' +
        '<div style="font-size:12px;color:var(--text3);">' + (r.car||'') + ' · ' + (r.contractRef||r.id) + '</div></div>' +
        '<div style="text-align:right;"><strong style="color:#ef4444;">' + fmtMAD(reste) + ' restant</strong><br>' +
        '<button class="btn-sm ghost" data-rid="' + r.id + '" onclick="closeDashDrawer();viewRes(this.dataset.rid)">Voir →</button></div>' +
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
    var rows;
    if (filter === 'active') {
      rows = res.filter(function(r) { return r.status === 'active' || r.status === 'confirmed'; });
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
      tbody.innerHTML = '<tr><td colspan="10" style="text-align:center;padding:30px;color:var(--text3);">Aucune location' + (filter==='active' ? ' en cours' : '') + '.</td></tr>';
      updateBadges(); return;
    }
    tbody.innerHTML = rows.map(function(r) {
      var total = Number(r.amount)||0, paid = Number(r.paid)||0, reste = Math.max(0, total-paid);
      var isLate = (r.endDate||'') < ts && (r.status==='active'||r.status==='confirmed');
      var payBadge = reste > 0
        ? '<span class="badge badge-red">● ' + fmtMAD(reste) + ' restant</span>'
        : '<span class="badge badge-green">● Soldé</span>';
      var manualTag = (r.source==='manual'||r.type==='location') ? ' <span style="font-size:10px;background:rgba(0,0,0,.08);padding:2px 6px;border-radius:4px;margin-left:4px;">Manuel</span>' : '';
      return '<tr' + (isLate ? ' style="background:rgba(196,30,58,.04);"' : '') + '>' +
        '<td><strong>' + (r.contractRef||r.id||'') + '</strong>' + manualTag + '</td>' +
        '<td><div style="font-weight:600;">' + (r.client||'—') + '</div><div style="font-size:11px;color:var(--text3);">' + (r.phone||'') + '</div></td>' +
        '<td style="font-size:13px;">' + (r.car||'—') + '</td>' +
        '<td style="font-size:12px;">' + (r.startDate||'') + '</td>' +
        '<td style="font-size:12px;' + (isLate ? 'color:var(--red);font-weight:700;' : '') + '">' + (r.endDate||'') + (isLate ? ' ⚠' : '') + '</td>' +
        '<td style="text-align:center;">' + (r.days||'—') + '</td>' +
        '<td><strong>' + fmtMAD(total) + '</strong></td>' +
        '<td>' + payBadge + '</td>' +
        '<td>' + statusBadge(r.status) + '</td>' +
        '<td style="white-space:nowrap;display:flex;gap:4px;">' +
          '<button class="btn-sm ghost" data-rid="' + r.id + '" onclick="viewRental(this.dataset.rid)" title="Détail">&#128065;</button>' +
          ((r.status==='active'||r.status==='confirmed') ? '<button class="btn-sm primary" data-rid="' + r.id + '" onclick="prolongerLocation(this.dataset.rid)" title="Prolonger">+jours</button>' : '') +
          ((r.status==='active'||r.status==='confirmed') ? '<button class="btn-sm ghost" data-rid="' + r.id + '" onclick="terminerLocation(this.dataset.rid)" title="Clore" style="color:var(--text3);">✓ Fin</button>' : '') +
        '</td>' +
        '</tr>';
    }).join('');
    updateBadges();
  } catch(e) { console.error('renderRentals:', e); }
}

/* ---- Drawer détail location ---- */

function viewRental(id) {
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

  if (titleEl) titleEl.textContent = 'Location ' + (r.contractRef||r.id);

  if (bodyEl) bodyEl.innerHTML =
    '<div class="form-group"><label class="form-label">N° Contrat / Référence</label>' +
    '<input class="form-input" id="rd-ref" value="' + (r.contractRef||r.id||'') + '" style="font-weight:700;">' +
    '<div style="font-size:11px;color:var(--text3);margin-top:3px;">Modifiable — synchronisé Paiements, Clients, Tableau de bord</div></div>' +

    '<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:12px;">' +
    _infoCell('Client', '<strong>' + (r.client||'') + '</strong>') +
    _infoCell('Téléphone', r.phone||'—') +
    _infoCell('Véhicule', r.car||'—') +
    _infoCell('Durée', (r.days||'—') + ' jours') +
    _infoCell('Départ', r.startDate||'') +
    _infoCell('Retour', r.endDate||'') +
    '</div>' +

    '<div style="font-size:22px;font-weight:800;color:var(--red);margin-bottom:14px;">' + fmtMAD(total) + '</div>' +

    '<div style="background:rgba(18,22,30,.04);border-radius:10px;padding:14px;">' +
    '<div style="font-weight:700;margin-bottom:10px;color:var(--red);">Paiement</div>' +
    '<div class="form-row">' +
    '<div class="form-group"><label class="form-label">Montant reçu (MAD)</label>' +
    '<input class="form-input" type="number" id="rd-paid" value="' + paid + '" oninput="rdPayCalc(' + total + ')"></div>' +
    '<div class="form-group"><label class="form-label">Mode de paiement</label>' +
    '<select class="form-select" id="rd-mode">' +
    ['Espèces','Carte bancaire','Virement','Chèque','Autre'].map(function(m) {
      return '<option' + (r.paymentMode===m?' selected':'') + '>' + m + '</option>';
    }).join('') +
    '</select></div></div>' +
    '<div id="rd-rest" style="font-weight:700;font-size:13px;margin-top:6px;"></div>' +
    '</div>';

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

function rdPayCalc(total) {
  var paidEl = document.getElementById('rd-paid');
  var restEl = document.getElementById('rd-rest');
  if (!paidEl || !restEl) return;
  var paid = parseFloat(paidEl.value) || 0;
  var reste = Math.max(0, total - paid);
  var statut, col;
  if (paid <= 0)                         { statut = 'Non payé';          col = 'var(--red)'; }
  else if (paid >= total && total > 0)   { statut = 'Paiement complet';  col = '#22c55e'; }
  else                                   { statut = 'Paiement partiel';  col = '#d97706'; }
  restEl.innerHTML = 'Reste : <span style="color:' + col + ';font-weight:800;">' + fmtMAD(reste) + '</span> &nbsp;·&nbsp; <span style="color:' + col + ';">' + statut + '</span>';
}

function saveRentalChanges(id, total) {
  var newPaid = parseFloat((document.getElementById('rd-paid') && document.getElementById('rd-paid').value) || 0);
  var newRef  = (document.getElementById('rd-ref')  && document.getElementById('rd-ref').value)  || '';
  var newMode = (document.getElementById('rd-mode') && document.getElementById('rd-mode').value) || 'Espèces';
  var payStatus = newPaid <= 0 ? 'Non payé' : (newPaid >= total ? 'Paiement complet' : 'Paiement partiel');
  if (typeof ASLDB !== 'undefined' && ASLDB.updateReservation) {
    ASLDB.updateReservation(id, { paid: newPaid, paymentMode: newMode, paymentStatus: payStatus, contractRef: newRef });
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
}

function prolongerLocation(id) {
  var res = aslRes();
  var r = res.find(function(x) { return String(x.id) === String(id); });
  if (!r) return;
  var jours = parseInt(prompt('Nombre de jours supplémentaires :', '1'));
  if (!jours || jours < 1) return;
  var newEnd = new Date(r.endDate); newEnd.setDate(newEnd.getDate() + jours);
  var newEndStr = newEnd.toISOString().slice(0,10);
  var ppu = r.pricePerDay || Math.round((Number(r.amount)||0) / Math.max(1, r.days||1));
  var supplement = ppu * jours;
  var newTotal = (Number(r.amount)||0) + supplement;
  var newDays  = (r.days||0) + jours;
  if (!confirm('Prolongation de ' + jours + ' j\nNouvelle date de retour : ' + newEndStr + '\nSupplément : ' + fmtMAD(supplement) + '\nNouveau total : ' + fmtMAD(newTotal) + '\n\nConfirmer ?')) return;
  if (typeof ASLDB !== 'undefined' && ASLDB.updateReservation) {
    ASLDB.updateReservation(id, { endDate: newEndStr, days: newDays, amount: newTotal, extended: true });
  }
  if (typeof reloadData === 'function') reloadData();
  renderRentals(); renderDashboard();
  if (typeof renderPayments === 'function') renderPayments();
  showToast('Prolongation enregistrée — retour le ' + newEndStr + ' ✓');
}

function terminerLocation(id) {
  if (!confirm('Clore cette location et libérer le véhicule ?')) return;
  var res = aslRes();
  var r = res.find(function(x) { return String(x.id) === String(id); });
  if (r && typeof ASLDB !== 'undefined') {
    if (r.carId && r.assignedPlate && typeof ASLDB.releaseUnit === 'function') {
      ASLDB.releaseUnit(r.carId, r.assignedPlate);
    }
    if (ASLDB.updateReservation) ASLDB.updateReservation(id, { status: 'completed' });
  }
  if (typeof reloadData === 'function') reloadData();
  renderRentals(); renderDashboard();
  if (typeof renderFleetPage === 'function') renderFleetPage();
  showToast('Location clôturée — véhicule libéré ✓');
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

function _buildNewLocationModal() {
  // Garantit la présence du bouton #modal-save même si un autre module (LLD…)
  // a remplacé le pied de page du pop-up partagé juste avant.
  if (typeof restoreModalFooter === 'function') restoreModalFooter();
  var fleet = aslFleet();
  var overlay = document.getElementById('modal-overlay');
  var titleEl = document.getElementById('modal-title');
  var bodyEl  = document.getElementById('modal-body');
  var footEl  = document.getElementById('modal-footer');
  if (!overlay) return;
  if (titleEl) titleEl.textContent = 'Nouvelle location directe';
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
    '<div class="form-group"><label class="form-label">N° Contrat / Référence</label>' +
    '<input class="form-input" id="nl-ref" placeholder="LOC-2026-001">' +
    '<div style="font-size:11px;color:var(--text3);margin-top:3px;">Modifiable — synchronisé avec Paiements, Clients et Tableau de bord</div></div>' +
    '<div class="form-row">' +
    '<div class="form-group"><label class="form-label">Prénom</label><input class="form-input" id="nl-fn" placeholder="Prénom"></div>' +
    '<div class="form-group"><label class="form-label">Nom</label><input class="form-input" id="nl-ln" placeholder="Nom"></div>' +
    '</div>' +
    '<div class="form-row">' +
    '<div class="form-group"><label class="form-label">Téléphone / WhatsApp</label><input class="form-input" id="nl-phone" placeholder="+212 6..."></div>' +
    '<div class="form-group"><label class="form-label">Nationalité</label><input class="form-input" id="nl-nat" placeholder="ex : Française"></div>' +
    '</div>' +
    '<div class="form-group"><label class="form-label">Véhicule</label><select class="form-select" id="nl-car">' + carOpts + '</select></div>' +
    '<div class="form-group"><label class="form-label">Prix / jour (MAD)</label><input class="form-input" type="number" id="nl-ppu" placeholder="Auto-calculé"></div>' +
    '<div class="form-group"><label class="form-label">Nombre de jours</label>' +
    '<input class="form-input" type="number" min="1" id="nl-days" placeholder="Nombre de jours"></div>' +
    '<div class="form-row">' +
    '<div class="form-group"><label class="form-label">Date départ</label><input type="date" class="form-input" id="nl-start"></div>' +
    '<div class="form-group"><label class="form-label">Date retour</label><input type="date" class="form-input" id="nl-end"></div>' +
    '</div>' +
    '<div class="form-group"><label class="form-label">Lieu de prise en charge</label>' +
    '<select class="form-select" id="nl-pickup"><option>Aéroport Marrakech (RAK)</option><option>Centre-Ville</option><option>Gare</option><option>Hôtel</option></select></div>' +
    '<div style="background:rgba(18,22,30,.04);border-radius:10px;padding:14px;">' +
    '<div style="font-weight:700;margin-bottom:10px;color:var(--red);">Paiement</div>' +
    '<div class="form-row">' +
    '<div class="form-group"><label class="form-label">Total (MAD)</label><input class="form-input" type="number" id="nl-total" placeholder="Calculé auto" oninput="nlPayCalc()"></div>' +
    '<div class="form-group"><label class="form-label">Reçu (MAD)</label><input class="form-input" type="number" id="nl-paid" value="0" oninput="nlPayCalc()"></div>' +
    '</div>' +
    '<div class="form-group"><label class="form-label">Mode de paiement</label>' +
    '<select class="form-select" id="nl-mode"><option>Espèces</option><option>Carte bancaire</option><option>Virement</option><option>Chèque</option><option>Autre</option></select></div>' +
    '<div id="nl-rest" style="font-weight:700;font-size:13px;margin-top:4px;"></div></div>' +
    '<div class="form-group"><label class="form-label">Notes internes</label><textarea class="form-input form-textarea" rows="2" id="nl-notes" placeholder="Notes..."></textarea></div>' +
    '<div class="form-group"><label class="form-label">Documents (facultatif)</label>' +
    '<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;">' +
    '<div><div style="font-size:12px;color:var(--text3);margin-bottom:4px;">Permis de conduire</div>' +
    '<input type="file" accept="image/*" id="nl-doc-permis" class="form-input" style="padding:8px;" onchange="docPreview(this,\'nl-permis-prev\')"><div id="nl-permis-prev" style="margin-top:6px;"></div></div>' +
    '<div><div style="font-size:12px;color:var(--text3);margin-bottom:4px;">CIN / Passeport</div>' +
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
    function syncPpu() {
      if (!ppuEl || ppuEl.dataset.manual) return;
      var opt = carSel && carSel.options[carSel.selectedIndex];
      var ppu = opt ? (parseFloat(opt.getAttribute('data-ppu'))||0) : 0;
      var carId = carSel ? parseInt(carSel.value) : null;
      var car = fleet.find(function(c){ return c.id===carId; });
      var s = sEl && sEl.value;
      var d = (s && eEl && eEl.value) ? Math.max(1, Math.round((new Date(eEl.value)-new Date(s))/86400000)) : 1;
      var rate = (car && typeof ASLDB!=='undefined' && ASLDB.dailyRate) ? ASLDB.dailyRate(car, d, s) : ppu;
      ppuEl.value = rate || ppu;
    }
    function autoTotal() {
      var s = sEl&&sEl.value, e = eEl&&eEl.value, ppu = parseFloat(ppuEl&&ppuEl.value)||0;
      if (ppu && s && e) {
        var d = Math.max(1, Math.round((new Date(e)-new Date(s))/86400000));
        var tEl = document.getElementById('nl-total');
        if (tEl && !tEl.dataset.manual) { tEl.value = ppu*d; nlPayCalc(); }
      }
    }
    if (carSel) carSel.addEventListener('change', function(){ if(ppuEl) delete ppuEl.dataset.manual; syncPpu(); autoTotal(); });
    if (sEl) sEl.addEventListener('change', function(){ nlDaysToEnd(); });
    if (eEl) eEl.addEventListener('change', function(){ nlEndToDays(); });
    var daysEl = document.getElementById('nl-days');
    if (daysEl) daysEl.addEventListener('input', function(){ nlDaysToEnd(); });
    [sEl,eEl].forEach(function(el){ if(el) el.addEventListener('change', function(){ syncPpu(); autoTotal(); }); });
    if (ppuEl) ppuEl.addEventListener('input', function(){ this.dataset.manual='1'; autoTotal(); });
    var tEl = document.getElementById('nl-total');
    if (tEl) tEl.addEventListener('input', function(){ this.dataset.manual='1'; });
    syncPpu(); autoTotal();
  }, 80);

  var saveBtn = document.getElementById('modal-save');
  if (saveBtn) {
    saveBtn.textContent = 'Enregistrer la location';
    saveBtn.onclick = _saveNewLocation;
  }
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
  if (!fn || !start || !end) { alert('Complétez les champs obligatoires (prénom, dates)'); return; }
  var days = Math.max(1, Math.round((new Date(end)-new Date(start))/(86400000)));
  var ppu  = parseFloat(document.getElementById('nl-ppu')&&document.getElementById('nl-ppu').value)||0;
  if (!ppu && car && typeof ASLDB!=='undefined' && ASLDB.dailyRate) ppu = ASLDB.dailyRate(car, days, start);
  if (!ppu && car) ppu = car.priceMAD || 0;
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
    var chk = ASLDB.checkAvailability(car, start, end, '10:00', '10:00');
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

  var newLoc = null;
  if (typeof ASLDB!=='undefined' && ASLDB.addReservation) {
    newLoc = ASLDB.addReservation({
      client: (fn + ' ' + (ln||'')).trim(),
      contractRef: ref, email: '',
      phone: (document.getElementById('nl-phone')&&document.getElementById('nl-phone').value)||'',
      nationality: (document.getElementById('nl-nat')&&document.getElementById('nl-nat').value)||'N/A',
      car: car ? car.name : '', carId: carId,
      pricePerDay: ppu, assignedPlate: plate, assignedColor: color,
      days: days, amount: total, paid: paid,
      paymentStatus: payStatus, paymentMode: mode,
      startDate: start, endDate: end,
      pickup: (document.getElementById('nl-pickup')&&document.getElementById('nl-pickup').value)||'',
      source: 'manual', type: 'location', status: 'active',
      subleaseId: subleaseId, finalClient: subleaseId ? finalClientName : '',
      notes: (document.getElementById('nl-notes')&&document.getElementById('nl-notes').value)||'',
      docs: (typeof collectDocs==='function' ? collectDocs('nl-doc-permis','nl-doc-identity') : {})
    });
    if (car && plate && typeof ASLDB.setUnitStatusByPlate==='function') {
      ASLDB.setUnitStatusByPlate(carId, plate, 'active');
    } else if (car && typeof ASLDB.assignUnit==='function') {
      ASLDB.assignUnit(carId, 'active');
    }
  }
  if (typeof reloadData==='function') reloadData();
  if (newLoc && newLoc.docs && newLoc.phone && typeof saveCustomerDocs==='function') saveCustomerDocs(newLoc.phone, newLoc.docs);
  if (typeof clearPendingDocs==='function') clearPendingDocs();
  renderRentals(); renderDashboard();
  if (typeof renderPayments==='function') renderPayments();
  if (typeof renderSubleases==='function') renderSubleases();
  updateBadges();
  if (typeof closeModal==='function') closeModal();
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
    '<div class="form-group"><label class="form-label">N° Contrat / Référence</label>' +
    '<input class="form-input" id="vr-ref" value="' + (r.contractRef||r.id||'') + '" style="font-weight:700;">' +
    '<div style="font-size:11px;color:var(--text3);margin-top:3px;">Modifiable — synchronisé avec Paiements, Clients et Tableau de bord</div></div>' +
    '<div class="res-detail-grid">' +
    _rCell('Client',       '<strong>' + (r.client||'') + '</strong>') +
    _rCell('Téléphone',    r.phone||'—') +
    _rCell('Email',        '<span style="font-size:12px;">' + (r.email||'—') + '</span>') +
    _rCell('Nationalité',  r.nationality||'—') +
    _rCell('Véhicule',     r.car||'—') +
    _rCell('Durée',        (r.days||'—') + ' jours') +
    _rCell('Départ',       (r.pickup||'') + '<br><small>' + (r.startDate||'') + '</small>') +
    _rCell('Retour',       r.endDate||'') +
    _rCell('Source',       '<span class="badge badge-gray">' + (r.source||'—') + '</span>' + ((r.source==='phone'||r.source==='manual')?' <span style="font-size:10px;background:rgba(0,0,0,.07);padding:2px 6px;border-radius:4px;">Manuelle</span>':'')) +
    _rCell('Statut',       statusBadge(r.status)) +
    '</div>' +
    '<div style="font-size:22px;font-weight:800;color:var(--red);margin:12px 0;">' + fmtMAD(total) + '</div>' +
    '<div style="background:rgba(18,22,30,.04);border-radius:10px;padding:14px;">' +
    '<div style="font-weight:700;margin-bottom:10px;color:var(--red);">Paiement</div>' +
    '<div class="form-row">' +
    '<div class="form-group"><label class="form-label">Montant reçu (MAD)</label>' +
    '<input class="form-input" type="number" id="vr-paid" value="' + paid + '" oninput="vrPayCalc(' + total + ')"></div>' +
    '<div class="form-group"><label class="form-label">Mode de paiement</label>' +
    '<select class="form-select" id="vr-mode">' +
    ['Espèces','Carte bancaire','Virement','Chèque','Autre'].map(function(m){ return '<option' + (mode===m?' selected':'') + '>' + m + '</option>'; }).join('') +
    '</select></div></div>' +
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
      var newPaid = parseFloat(document.getElementById('vr-paid')&&document.getElementById('vr-paid').value || 0);
      var newRef  = (document.getElementById('vr-ref') &&document.getElementById('vr-ref').value)  || r.contractRef || r.id;
      var newMode = (document.getElementById('vr-mode')&&document.getElementById('vr-mode').value) || r.paymentMode;
      var payStatus = newPaid<=0 ? 'Non payé' : (newPaid>=total ? 'Paiement complet' : 'Paiement partiel');
      if (r.status==='pending' && typeof confirmRes==='function') { confirmRes(id); }
      if (typeof ASLDB!=='undefined' && ASLDB.updateReservation) {
        ASLDB.updateReservation(id, { paid: newPaid, paymentMode: newMode, paymentStatus: payStatus, contractRef: newRef });
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

function _rCell(label, val) {
  return '<div class="res-detail-item"><div class="res-detail-label">' + label + '</div><div class="res-detail-val">' + val + '</div></div>';
}

function vrPayCalc(total) {
  var paidEl = document.getElementById('vr-paid');
  var restEl = document.getElementById('vr-rest');
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
    '#dash-cards-grid { grid-template-columns: repeat(6,1fr) !important; }',
    '@media(max-width:1100px){ #dash-cards-grid { grid-template-columns: repeat(3,1fr) !important; } }',
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
