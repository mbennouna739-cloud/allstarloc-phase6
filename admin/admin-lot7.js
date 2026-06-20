/* ============================================================
   ALL STAR LOC — LOT 7 (ajustements finaux)
   admin-lot7.js
   1. Notifications externes (config WhatsApp/SMS/Email + alertes)
   2. Réinitialisation opérationnelle clarifiée (parc -> disponible)
   Chargé APRÈS admin-lot5.js et admin-lot6.js.
   ============================================================ */

/* ---------- Helpers partagés ---------- */
function asl7Fleet() {
  try { return (typeof ASLDB !== 'undefined' && ASLDB.getFleet) ? ASLDB.getFleet() : (typeof FLEET !== 'undefined' ? FLEET : []); } catch(e) { return []; }
}
function asl7Res() {
  try { return (typeof ASLDB !== 'undefined' && ASLDB.getReservations) ? ASLDB.getReservations() : (typeof RESERVATIONS !== 'undefined' ? RESERVATIONS : []); } catch(e) { return []; }
}
function asl7Toast(m) { if (typeof showToast === 'function') showToast(m); }

/* ============================================================
   1. NOTIFICATIONS EXTERNES — réglages persistants
   ============================================================ */
var ASL_NOTIF_KEY = 'asl_notif_ext_v1';

function _loadNotifSettings() {
  try { return JSON.parse(localStorage.getItem(ASL_NOTIF_KEY) || '{}'); } catch(e) { return {}; }
}

function loadNotifSettingsUI() {
  var s = _loadNotifSettings();
  function setV(id, v) { var el = document.getElementById(id); if (el) el.value = v || ''; }
  function setC(id, v) { var el = document.getElementById(id); if (el) el.checked = !!v; }
  setV('notif-wa', s.whatsapp);
  setV('notif-sms', s.sms);
  setV('notif-email', s.email);
  var a = s.alerts || {};
  setC('na-return', a.return);
  setC('na-late',   a.late);
  setC('na-vidange',a.vidange);
  setC('na-vt',     a.vt);
  setC('na-assur',  a.assur);
  setC('na-unpaid', a.unpaid);
}

function saveNotifSettings() {
  function gV(id) { var el = document.getElementById(id); return el ? el.value.trim() : ''; }
  function gC(id) { var el = document.getElementById(id); return el ? el.checked : false; }
  var s = {
    whatsapp: gV('notif-wa'),
    sms: gV('notif-sms'),
    email: gV('notif-email'),
    alerts: {
      return:  gC('na-return'),
      late:    gC('na-late'),
      vidange: gC('na-vidange'),
      vt:      gC('na-vt'),
      assur:   gC('na-assur'),
      unpaid:  gC('na-unpaid')
    },
    updated: new Date().toISOString()
  };
  try { localStorage.setItem(ASL_NOTIF_KEY, JSON.stringify(s)); } catch(e) {}
  asl7Toast('Notifications externes enregistrées ✓');
}

/* Construit la liste des alertes du jour selon les réglages actifs.
   Réutilise la logique existante (retours, retards, entretien, impayés). */
function buildTodayAlerts() {
  var s = _loadNotifSettings();
  var a = s.alerts || {};
  var res = asl7Res();
  var fleet = asl7Fleet();
  var today = new Date(); today.setHours(0,0,0,0);
  var ts = today.toISOString().slice(0,10);
  var out = [];

  if (a.return) {
    res.filter(function(r){ return (r.endDate||'').slice(0,10) === ts && r.status !== 'cancelled'; })
       .forEach(function(r){ out.push('🔄 Retour aujourd\'hui : ' + (r.car||'') + ' — ' + (r.client||'')); });
  }
  if (a.late) {
    res.filter(function(r){ return (r.endDate||'') < ts && (r.status==='active'||r.status==='confirmed'); })
       .forEach(function(r){
         var diff = Math.round((today - new Date(r.endDate)) / 86400000);
         out.push('⚠ Retard ' + diff + 'j : ' + (r.car||'') + ' — ' + (r.client||'') + (r.phone?' ('+r.phone+')':''));
       });
  }
  if (a.vidange || a.vt || a.assur) {
    var MAINT = {};
    try { MAINT = JSON.parse(localStorage.getItem('asl_maint_v1') || '{}'); } catch(e) {}
    fleet.forEach(function(c) {
      var m = MAINT[String(c.id)] || {};
      function chk(date, label, on) {
        if (!on || !date) return;
        var diff = Math.round((new Date(date) - today) / 86400000);
        if (diff <= 7) out.push((diff<0?'⛔':'🔧') + ' ' + label + ' : ' + c.name + (diff<0?' (en retard '+Math.abs(diff)+'j)':' (dans '+diff+'j)'));
      }
      chk(m.vidange_next, 'Vidange', a.vidange);
      chk(m.vt_next, 'Visite technique', a.vt);
      chk(m.assur, 'Assurance', a.assur);
    });
  }
  if (a.unpaid) {
    res.filter(function(r){ return r.status !== 'cancelled' && (Number(r.amount)||0) > (Number(r.paid)||0); })
       .forEach(function(r){
         var reste = (Number(r.amount)||0) - (Number(r.paid)||0);
         if (reste >= 500) out.push('💳 Impayé : ' + (r.client||'') + ' — ' + reste.toLocaleString('fr-FR') + ' MAD (' + (r.contractRef||r.id) + ')');
       });
  }
  return out;
}

function testNotifPreview() {
  var s = _loadNotifSettings();
  var alerts = buildTodayAlerts();
  var dest = [];
  if (s.whatsapp) dest.push('WhatsApp ' + s.whatsapp);
  if (s.sms) dest.push('SMS ' + s.sms);
  if (s.email) dest.push('Email ' + s.email);

  var msg = '📲 APERÇU DES ALERTES DU JOUR\n\n';
  if (!alerts.length) {
    msg += '✅ Aucune alerte active aujourd\'hui selon vos réglages.';
  } else {
    msg += alerts.join('\n');
  }
  if (dest.length) {
    msg += '\n\n— Destinataires configurés —\n' + dest.join('\n');
  } else {
    msg += '\n\n⚠ Aucun destinataire configuré (WhatsApp / SMS / Email).';
  }
  alert(msg);
}

/* ============================================================
   2. RÉINITIALISATION OPÉRATIONNELLE (clarifiée + sécurisée)
   Remet le parc à "disponible", archive l'exploitation,
   ne supprime jamais : flotte, clients, paiements, assurances,
   marketing, historique.
   ============================================================ */
function confirmReset() {
  var step1 = confirm(
    '🔄 RÉINITIALISATION OPÉRATIONNELLE\n\n' +
    'Cette action remet l\'exploitation courante à zéro :\n' +
    '• Réservations actives → archivées\n' +
    '• Locations en cours → archivées\n' +
    '• Tous les véhicules repassent DISPONIBLES\n' +
    '• Alertes opérationnelles en cours effacées\n\n' +
    'JAMAIS supprimés : véhicules, clients, paiements,\n' +
    'assurances, marketing, et tout l\'historique.\n\n' +
    'Continuer ?'
  );
  if (!step1) return;

  var step2 = confirm(
    '⛔ CONFIRMATION FINALE\n\n' +
    'Le parc va redevenir entièrement disponible et\n' +
    'l\'exploitation en cours sera archivée.\n\n' +
    'Cette opération est irréversible sur les données actives\n' +
    '(l\'historique, lui, reste consultable).\n\n' +
    'Confirmer la réinitialisation ?'
  );
  if (!step2) return;

  var res = asl7Res();
  var archived = 0;
  res.forEach(function(r) {
    if (r.status === 'active' || r.status === 'confirmed' || r.status === 'pending') {
      if (typeof ASLDB !== 'undefined' && ASLDB.updateReservation) {
        ASLDB.updateReservation(r.id, { status: 'completed', archivedAt: new Date().toISOString() });
      }
      archived++;
    }
  });

  /* Remettre TOUTES les voitures (et leurs unités) en "disponible" */
  var fleet = asl7Fleet();
  fleet.forEach(function(c) {
    try {
      var patch = { status: 'available' };
      /* Si le véhicule gère des unités (plaque/couleur), les libérer aussi */
      if (Array.isArray(c.units) && c.units.length) {
        patch.units = c.units.map(function(u) {
          var nu = {}; for (var k in u) nu[k] = u[k];
          nu.status = 'available';
          return nu;
        });
      }
      if (typeof ASLDB !== 'undefined' && ASLDB.updateVehicle) ASLDB.updateVehicle(c.id, patch);
    } catch(e) {}
  });

  /* Effacer les alertes opérationnelles d'entretien en cours (historique flotte conservé ailleurs) */
  /* On NE touche PAS aux documents clients ni aux paiements. */

  if (typeof reloadData === 'function') reloadData();
  if (typeof renderDashboard === 'function') renderDashboard();
  if (typeof renderRentals === 'function') renderRentals();
  if (typeof renderFleetPage === 'function') renderFleetPage();
  if (typeof renderCustomers === 'function') renderCustomers();
  if (typeof updateBadges === 'function') updateBadges();

  asl7Toast('Réinitialisation effectuée — parc redevenu disponible ✓');
  alert('✓ Réinitialisation terminée.\n\n' +
        archived + ' dossier(s) d\'exploitation archivé(s).\n' +
        fleet.length + ' véhicule(s) repassés disponibles.\n\n' +
        'L\'historique reste consultable. Aucune donnée supprimée.');
}

/* ============================================================
   Hook : charger les réglages quand on ouvre Paramètres système
   ============================================================ */
(function() {
  var _origRenderSettings = window.renderSettings;
  window.renderSettings = function() {
    if (typeof _origRenderSettings === 'function') {
      try { _origRenderSettings(); } catch(e) {}
    }
    loadNotifSettingsUI();
  };
})();

document.addEventListener('DOMContentLoaded', function() {
  /* Si la page settings est déjà active au chargement */
  var ps = document.getElementById('page-settings');
  if (ps && ps.classList.contains('active')) loadNotifSettingsUI();
});

/* ============================================================
   3. REVENUS ENCAISSÉS — carte "Revenus du mois" + détail
   Basé sur les montants RÉELLEMENT ENCAISSÉS (r.paid),
   pas sur les montants théoriques des contrats.
   Source : locations + réservations confirmées/actives/terminées
   (tout sauf annulées). Évite les doublons : aucune mention de
   "total encaissé / paiements complets / partiels" ici.
   ============================================================ */

/* Date d'encaissement de référence pour rattacher un revenu à une période.
   On utilise paidAt si disponible, sinon la date de début (départ). */
function _revDateOf(r) {
  return (r.paidAt || r.paymentDate || r.startDate || r.createdAt || '').slice(0, 10);
}

/* Somme des montants encaissés (r.paid) sur une période [fromISO, toISO]. */
function _revenueBetween(fromISO, toISO) {
  var res = asl7Res();
  var sum = 0;
  res.forEach(function(r) {
    if (r.status === 'cancelled') return;
    var paid = Number(r.paid) || 0;
    if (paid <= 0) return;
    var d = _revDateOf(r);
    if (!d) return;
    if (d >= fromISO && d <= toISO) sum += paid;
  });
  return sum;
}

function _resteAPayerGlobal() {
  var res = asl7Res();
  var sum = 0;
  res.forEach(function(r) {
    if (r.status === 'cancelled') return;
    sum += Math.max(0, (Number(r.amount) || 0) - (Number(r.paid) || 0));
  });
  return sum;
}

function computeRevenues() {
  var now = new Date();
  var y = now.getFullYear();
  var pad = function(n) { return String(n).padStart(2, '0'); };

  /* Semaine : du lundi au dimanche courant */
  var day = now.getDay(); /* 0=dim..6=sam */
  var diffToMon = (day === 0 ? 6 : day - 1);
  var monday = new Date(now); monday.setDate(now.getDate() - diffToMon); monday.setHours(0,0,0,0);
  var sunday = new Date(monday); sunday.setDate(monday.getDate() + 6);
  var weekFrom = monday.getFullYear() + '-' + pad(monday.getMonth()+1) + '-' + pad(monday.getDate());
  var weekTo   = sunday.getFullYear() + '-' + pad(sunday.getMonth()+1) + '-' + pad(sunday.getDate());

  /* Mois courant */
  var monthFrom = y + '-' + pad(now.getMonth()+1) + '-01';
  var monthTo   = y + '-' + pad(now.getMonth()+1) + '-31';

  /* Année courante */
  var yearFrom = y + '-01-01';
  var yearTo   = y + '-12-31';

  return {
    week:  _revenueBetween(weekFrom, weekTo),
    month: _revenueBetween(monthFrom, monthTo),
    year:  _revenueBetween(yearFrom, yearTo),
    dueGlobal: _resteAPayerGlobal()
  };
}

function updateRevenueCard() {
  try {
    var el = document.getElementById('dash-revenue');
    if (!el) return;
    var r = computeRevenues();
    el.textContent = (r.month || 0).toLocaleString('fr-FR') + ' MAD';
  } catch(e) {}
}

function openRevenueDrawer() {
  var r = computeRevenues();
  var body = document.getElementById('rev-drawer-body');
  if (body) {
    function row(label, val, color, note) {
      return '<div style="border:1px solid var(--border);border-radius:12px;padding:16px;margin-bottom:12px;">' +
        '<div style="font-size:12px;color:var(--text3);margin-bottom:4px;">' + label + '</div>' +
        '<div style="font-size:24px;font-weight:800;color:' + color + ';">' + (val||0).toLocaleString('fr-FR') + ' <span style="font-size:14px;">MAD</span></div>' +
        (note ? '<div style="font-size:11px;color:var(--text3);margin-top:4px;">' + note + '</div>' : '') +
        '</div>';
    }
    body.innerHTML =
      '<div style="font-size:12px;color:var(--text2);margin-bottom:16px;line-height:1.5;">Montants <strong>réellement encaissés</strong> (paiements enregistrés), hors contrats théoriques.</div>' +
      row('Revenus de la semaine', r.week, '#16a34a', 'Du lundi au dimanche en cours') +
      row('Revenus du mois', r.month, '#16a34a', 'Mois calendaire en cours') +
      row('Revenus de l\'année', r.year, '#16a34a', 'Année ' + new Date().getFullYear()) +
      row('Reste à payer global', r.dueGlobal, (r.dueGlobal > 0 ? '#ef4444' : '#16a34a'), 'Somme de tous les soldes dus');
  }
  var bg = document.getElementById('rev-drawer-bg');
  var dr = document.getElementById('rev-drawer');
  if (bg) bg.style.display = 'block';
  if (dr) { dr.style.display = 'flex'; dr.style.transform = 'translateX(0)'; }
}

function closeRevenueDrawer() {
  var bg = document.getElementById('rev-drawer-bg');
  var dr = document.getElementById('rev-drawer');
  if (bg) bg.style.display = 'none';
  if (dr) { dr.style.transform = 'translateX(100%)'; setTimeout(function(){ dr.style.display='none'; dr.style.transform=''; }, 280); }
}

/* Hook : recalculer la carte Revenus à chaque rendu du tableau de bord */
(function() {
  var _origRender = window.renderDashboard;
  window.renderDashboard = function() {
    if (typeof _origRender === 'function') {
      try { _origRender(); } catch(e) {}
    }
    updateRevenueCard();
  };
})();

document.addEventListener('DOMContentLoaded', function() {
  updateRevenueCard();
});
