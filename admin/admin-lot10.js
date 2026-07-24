/* ============================================================
   ALL STAR LOC — LOT 10
   Notifications cliquables : chaque notification ouvre
   directement la fiche/module permettant de résoudre le problème.
   Remplace l'ancien showNotifications() (alert) par un panneau.
   Chargé en dernier.
   ============================================================ */

function asl10Res() {
  try { return (typeof ASLDB !== 'undefined' && ASLDB.getReservations) ? ASLDB.getReservations() : (typeof RESERVATIONS !== 'undefined' ? RESERVATIONS : []); } catch(e) { return []; }
}
function asl10Fleet() {
  try { return (typeof ASLDB !== 'undefined' && ASLDB.getFleet) ? ASLDB.getFleet() : (typeof FLEET !== 'undefined' ? FLEET : []); } catch(e) { return []; }
}

/* Construit la liste structurée des notifications actives. */
function buildNotifList() {
  var res = asl10Res();
  var fleet = asl10Fleet();
  var today = new Date(); today.setHours(0,0,0,0);
  var ts = today.toISOString().slice(0,10);
  var items = [];

  /* Réservations en attente (nouvelles réservations reçues du site) */
  res.filter(function(r){ return r.status === 'pending'; }).forEach(function(r){
    var heure = r.startTime ? (' à ' + r.startTime) : '';
    var endH = r.endTime ? (' à ' + r.endTime) : '';
    var src = (r.source === 'online') ? ' (site web)' : '';
    items.push({
      type: 'pending', icon: '🆕', color: '#f59e0b',
      title: 'Nouvelle réservation reçue' + src,
      desc: (r.car || '') + ' · ' + (r.client || 'Client') + '\n'
          + 'Du ' + (r.startDate || '') + heure + ' au ' + (r.endDate || '') + endH,
      action: 'notifGoReservation', arg: r.id
    });
    /* Alerte "retour serré" : ce véhicule doit revenir juste avant cette nouvelle réservation. */
    try {
      if (typeof ASLDB !== 'undefined' && ASLDB.checkAvailability) {
        var fleet2 = asl10Fleet();
        var car = fleet2.find(function(c){ return c.id === r.carId || c.name === r.car; });
        if (car) {
          var chk = ASLDB.checkAvailability(car, r.startDate, r.endDate, r.startTime, r.endTime, { excludeId: r.id });
          if (chk.tightReturns && chk.tightReturns.length) {
            var tr = chk.tightReturns[0];
            var rt = tr.returnAt;
            items.push({
              type: 'tight', icon: '⚠', color: '#d97706',
              title: 'Retour à vérifier avant cette réservation',
              desc: (r.car || '') + ' doit revenir le ' + rt.toLocaleDateString('fr-FR',{day:'numeric',month:'long'}) + ' à ' + rt.toLocaleTimeString('fr-FR',{hour:'2-digit',minute:'2-digit'}) + '. Vérifiez le retour ou contactez le client actuel.',
              action: 'notifGoReservation', arg: r.id
            });
          }
        }
      }
    } catch(e) {}
  });

  /* Retours prévus aujourd'hui */
  res.filter(function(r){ return (typeof ASLDB !== 'undefined' && ASLDB.computePhase) ? ((r.endDate||'').slice(0,10) === ts && ASLDB.computePhase(r) === 'active') : ((r.endDate||'').slice(0,10) === ts && (r.status==='active'||r.status==='confirmed')); }).forEach(function(r){
    items.push({
      type: 'return', icon: '🔄', color: '#3b82f6',
      title: 'Retour prévu aujourd\'hui',
      desc: (r.car || '') + ' · ' + (r.client || '') + ' — à restituer' + (r.endTime ? ' à ' + r.endTime : ''),
      action: 'notifGoRental', arg: r.id
    });
  });

  /* Véhicules en retard (date+heure de retour réellement dépassées) */
  res.filter(function(r){ return (typeof ASLDB !== 'undefined' && ASLDB.computePhase) ? ASLDB.computePhase(r) === 'late' : (r.endDate && (r.endDate||'').slice(0,10) < ts && (r.status==='active'||r.status==='confirmed')); }).forEach(function(r){
    var diff = Math.round((today - new Date(r.endDate)) / 86400000);
    items.push({
      type: 'late', icon: '⚠', color: '#ef4444',
      title: 'Véhicule en retard (' + diff + 'j)',
      desc: (r.car || '') + ' · ' + (r.client || '') + ' — retour le ' + (r.endDate || '') + (r.endTime ? ' à ' + r.endTime : ''),
      action: 'notifGoRental', arg: r.id
    });
  });

  /* Entretien : rappel de vérification vidange (tous les 20 jours) + visite technique */
  var MAINT = {};
  try { MAINT = JSON.parse(localStorage.getItem('asl_maint_v1') || '{}'); } catch(e) {}
  fleet.forEach(function(c){
    var m = MAINT[String(c.id)] || {};
    function check(date, label, type) {
      if (!date) return;
      var diff = Math.round((new Date(date) - today) / 86400000);
      if (diff <= 7) {
        items.push({
          type: type, icon: '🔧', color: (diff < 0 ? '#ef4444' : '#d97706'),
          title: label + (diff < 0 ? ' — en retard' : ' — proche'),
          desc: c.name + (c.plate?' ('+c.plate+')':'') + ' · ' + (diff < 0 ? 'dépassé de ' + Math.abs(diff) + 'j' : 'dans ' + diff + 'j'),
          action: 'notifGoMaint', arg: c.id
        });
      }
    }
    /* Rappel vidange : vérifier le km tous les 20 jours (pas de calcul auto). */
    if (m.reminder_next) {
      var dd = Math.round((new Date(m.reminder_next) - today) / 86400000);
      if (dd <= 0) {
        var kmTxt = m.km_vidange_next ? Number(m.km_vidange_next).toLocaleString('fr-FR') + ' km' : '—';
        items.push({
          type: 'vidange', icon: '🔧', color: '#d97706',
          title: 'Vérifier le kilométrage de ' + c.name,
          desc: 'Prochaine vidange prévue à ' + kmTxt + (c.plate ? ' · ' + c.plate : ''),
          action: 'notifGoMaint', arg: c.id
        });
      }
    }
    check(m.vt_next, 'Visite technique', 'vt');
  });

  /* Impayés importants */
  res.filter(function(r){ return r.status !== 'cancelled' && (Number(r.amount)||0) > (Number(r.paid)||0); }).forEach(function(r){
    var reste = (Number(r.amount)||0) - (Number(r.paid)||0);
    if (reste >= 500) {
      items.push({
        type: 'unpaid', icon: '💳', color: '#ef4444',
        title: 'Impayé : ' + reste.toLocaleString('fr-FR') + ' MAD',
        desc: (r.client || '') + ' · ' + (r.car || '') + ' · ' + (r.contractRef || r.id),
        action: 'notifGoReservation', arg: r.id
      });
    }
  });

  return items;
}

/* Remplace l'ancien showNotifications (alert) par un panneau cliquable. */
function showNotifications() {
  var items = buildNotifList();

  /* Construire / réutiliser le panneau */
  var panel = document.getElementById('asl-notif-panel');
  var bg = document.getElementById('asl-notif-bg');
  if (!panel) {
    bg = document.createElement('div');
    bg.id = 'asl-notif-bg';
    bg.style.cssText = 'position:fixed;inset:0;z-index:4000;background:transparent;';
    bg.onclick = closeNotifPanel;
    document.body.appendChild(bg);

    panel = document.createElement('div');
    panel.id = 'asl-notif-panel';
    panel.style.cssText = [
      'position:fixed','top:64px','right:18px','z-index:4001',
      'width:min(380px,94vw)','max-height:72vh','overflow-y:auto',
      'background:var(--dark2,#fff)','border:1px solid var(--border,#e2e8f0)',
      'border-radius:14px','box-shadow:0 12px 40px rgba(0,0,0,.18)',
      'font-family:inherit'
    ].join(';');
    document.body.appendChild(panel);
  }

  var header = '<div style="display:flex;align-items:center;justify-content:space-between;padding:14px 16px;border-bottom:1px solid var(--border,#e2e8f0);position:sticky;top:0;background:var(--dark2,#fff);border-radius:14px 14px 0 0;">' +
    '<strong style="font-size:14px;">🔔 Notifications' + (items.length ? ' (' + items.length + ')' : '') + '</strong>' +
    '<button onclick="closeNotifPanel()" style="background:none;border:none;cursor:pointer;font-size:18px;color:var(--text3,#888);line-height:1;">&#10005;</button>' +
    '</div>';

  var body;
  if (!items.length) {
    body = '<div style="padding:32px 18px;text-align:center;color:var(--text3,#888);font-size:13px;">✅ Aucune action urgente.<br>Tout est à jour.</div>';
  } else {
    body = items.map(function(it, i){
      return '<div class="asl-notif-item" data-i="' + i + '" ' +
        'onclick="handleNotifClick(' + i + ')" ' +
        'style="display:flex;gap:12px;padding:13px 16px;border-bottom:1px solid var(--border,#eee);cursor:pointer;transition:background .15s;" ' +
        'onmouseenter="this.style.background=\'rgba(0,0,0,.03)\'" onmouseleave="this.style.background=\'transparent\'">' +
        '<div style="font-size:20px;flex-shrink:0;line-height:1.2;">' + it.icon + '</div>' +
        '<div style="flex:1;min-width:0;">' +
        '<div style="font-weight:700;font-size:13px;color:' + it.color + ';margin-bottom:2px;">' + it.title + '</div>' +
        '<div style="font-size:12px;color:var(--text2,#555);line-height:1.4;white-space:pre-line;">' + it.desc + '</div>' +
        '<div style="font-size:11px;color:var(--text3,#999);margin-top:3px;">Cliquer pour traiter →</div>' +
        '</div></div>';
    }).join('');
  }

  panel.innerHTML = header + body;
  panel._items = items;
  bg.style.display = 'block';
  panel.style.display = 'block';
}

function closeNotifPanel() {
  var panel = document.getElementById('asl-notif-panel');
  var bg = document.getElementById('asl-notif-bg');
  if (panel) panel.style.display = 'none';
  if (bg) bg.style.display = 'none';
}

/* Au clic sur une notification : router vers la fiche/module concerné. */
function handleNotifClick(i) {
  var panel = document.getElementById('asl-notif-panel');
  var items = panel && panel._items;
  if (!items || !items[i]) return;
  var it = items[i];
  closeNotifPanel();
  try {
    if (typeof window[it.action] === 'function') window[it.action](it.arg);
  } catch(e) { console.error('notif action error', e); }
}

/* ---- Routeurs : ouvrent directement la fiche permettant l'action ---- */

function notifGoReservation(id) {
  /* Ouvre la page Réservations puis la fiche détail (confirmer/modifier/traiter) */
  if (typeof showPage === 'function') {
    var item = document.querySelector('.sb-item[onclick*="reservations"]');
    showPage('reservations', item || null);
  }
  setTimeout(function(){ if (typeof viewRes === 'function') viewRes(id); }, 350);
}

function notifGoRental(id) {
  /* Ouvre Locations en cours puis la fiche location (confirmer retour, traiter) */
  if (typeof showPage === 'function') {
    var item = document.querySelector('.sb-item[onclick*="rentals"]');
    showPage('rentals', item || null);
  }
  setTimeout(function(){ if (typeof viewRental === 'function') viewRental(id, 'returns'); }, 350);
}

function notifGoMaint(carId) {
  /* Ouvre Entretien véhicules puis la fiche du véhicule (modifier date/km) */
  if (typeof showPage === 'function') {
    var item = document.querySelector('.sb-item[onclick*="maintenance"]');
    showPage('maintenance', item || null);
  }
  setTimeout(function(){ if (typeof openMaintModal === 'function') openMaintModal(parseInt(carId)); }, 350);
}

/* Fermer le panneau au scroll de la page (comportement propre) */
document.addEventListener('DOMContentLoaded', function() {
  window.addEventListener('scroll', function() {
    var p = document.getElementById('asl-notif-panel');
    if (p && p.style.display === 'block') closeNotifPanel();
  }, { passive: true });
  // Compteur initial sur la cloche
  setTimeout(refreshNotifCount, 300);
});

/* ---- Compteur live sur la cloche ----
   Affiche le nombre de notifications actives. Quand un problème est
   résolu et enregistré (les données changent), le compteur se met à
   jour automatiquement : la notification "disparaît" visiblement. */
function refreshNotifCount() {
  try {
    var n = buildNotifList().length;
    var dot = document.querySelector('.notif-dot');
    if (dot) {
      if (n > 0) {
        dot.textContent = n > 9 ? '9+' : String(n);
        dot.style.cssText = 'position:absolute;top:2px;right:2px;min-width:16px;height:16px;padding:0 3px;'
          + 'background:var(--red,#C41E3A);color:#fff;border-radius:9px;font-size:10px;font-weight:800;'
          + 'display:flex;align-items:center;justify-content:center;line-height:1;border:2px solid var(--dark2,#fff);';
      } else {
        dot.textContent = '';
        dot.style.cssText = 'display:none;';
      }
    }
    // Si le panneau est ouvert, le rafraîchir aussi pour faire disparaître l'item traité
    var panel = document.getElementById('asl-notif-panel');
    if (panel && panel.style.display === 'block') showNotifications();
  } catch(e) {}
}

/* Brancher le rafraîchissement sur les changements de données.
   ASLDB.onChange est déjà déclenché après chaque save/sync (réservations,
   véhicules…). On y ajoute la mise à jour du compteur de notifications. */
(function() {
  function hookDataChange() {
    if (typeof ASLDB !== 'undefined' && typeof ASLDB.onChange === 'function') {
      ASLDB.onChange(function(){ setTimeout(refreshNotifCount, 60); });
      return true;
    }
    return false;
  }
  if (!hookDataChange()) {
    /* ASLDB pas encore prêt : réessayer une fois le DOM chargé */
    document.addEventListener('DOMContentLoaded', function(){
      if (!hookDataChange()) {
        /* Filet de sécurité : rafraîchir périodiquement (léger) */
        setInterval(refreshNotifCount, 15000);
      }
    });
  }
  /* L'entretien est stocké en localStorage (asl_maint_v1) : after saveMaintRecord,
     on rafraîchit aussi. On enveloppe saveMaintRecord si présent. */
  document.addEventListener('DOMContentLoaded', function(){
    if (typeof window.saveMaintRecord === 'function') {
      var orig = window.saveMaintRecord;
      window.saveMaintRecord = function(){
        var r = orig.apply(this, arguments);
        setTimeout(refreshNotifCount, 80);
        return r;
      };
    }
  });
})();
