/* ============================================================
   ALL STAR LOC — PARTENAIRES / SOUS-LOCATION
   ------------------------------------------------------------
   Gestion des partenaires qui prennent des véhicules pour les
   relouer. SÉPARÉ des clients classiques.

   Données : KV serveur (clé "partners") + cache localStorage
   (asl_partners_v1), même mécanique fiable que les comptes
   employés. Les locations sont rattachées via le champ
   reservation.partnerId (+ clientFinal). Les paiements
   partenaires passent par reservation.paid → ils alimentent
   automatiquement la Caisse et le Grand Livre (aucun système
   financier parallèle).
   ============================================================ */
(function () {
  'use strict';

  var PKEY = 'asl_partners_v1';

  function rd() { try { return JSON.parse(localStorage.getItem(PKEY) || '[]'); } catch (e) { return []; } }
  function wr(list) { try { localStorage.setItem(PKEY, JSON.stringify(list)); } catch (e) {} }
  function esc(s) { return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }
  function money(n) { return (Math.round(Number(n) || 0)).toLocaleString('fr-FR') + ' MAD'; }
  function reservations() { try { return (window.ASLDB && ASLDB.getReservations()) || []; } catch (e) { return []; } }

  /* ---- Synchronisation serveur (KV) ---- */
  function adminKey() { try { return localStorage.getItem('asl_admin_key') || ''; } catch (e) { return ''; } }
  function api(method, body) {
    return fetch('/api/partners', {
      method: method,
      headers: { 'Content-Type': 'application/json', 'X-ASL-Key': adminKey() },
      cache: 'no-store',
      body: body ? JSON.stringify(body) : undefined
    }).then(function (r) { return r.json().then(function (d) { if (!r.ok || !d || d.ok === false) throw new Error((d && d.error) || ('HTTP ' + r.status)); return d; }); });
  }
  function push(action, payload) { try { api('POST', Object.assign({ action: action }, payload || {})).catch(function () {}); } catch (e) {} }
  function pull() {
    try {
      api('GET').then(function (d) {
        if (!d || !Array.isArray(d.partners)) return;
        var local = rd();
        if (d.partners.length === 0 && local.length > 0) { push('replace', { items: local }); return; }
        if (JSON.stringify(d.partners) === JSON.stringify(local)) return; // pas de changement
        wr(d.partners);
        if (document.getElementById('partners-root')) renderPartners();
        if (typeof window.renderPartnersMobile === 'function' && document.getElementById('ma-partners')) window.renderPartnersMobile();
      }).catch(function () {});
    } catch (e) {}
  }

  /* ---- Agrégation des locations rattachées à un partenaire ---- */
  function stats(id) {
    var linked = reservations().filter(function (r) { return r.partnerId === id && r.status !== 'cancelled'; });
    var facture = 0, paye = 0, impaye = 0;
    linked.forEach(function (r) {
      var amt = Number(r.amount) || 0, pd = Number(r.paid) || 0;
      facture += amt; paye += pd; impaye += Math.max(0, amt - pd);
    });
    return { count: linked.length, facture: facture, paye: paye, impaye: impaye, items: linked, statut: impaye > 0 ? 'impaye' : 'ajour' };
  }

  /* ============ API publique ============ */
  window.ASLPartners = {
    list: function () { return rd(); },
    get: function (id) { return rd().filter(function (p) { return p.id === id; })[0] || null; },
    stats: stats,
    refresh: pull,
    create: function (data) {
      var list = rd();
      var p = {
        id: 'prt' + Date.now() + Math.random().toString(36).slice(2, 5),
        name: (data.name || '').trim(),
        phone: (data.phone || '').trim(),
        whatsapp: (data.whatsapp || '').trim(),
        city: (data.city || '').trim(),
        address: (data.address || '').trim(),
        notes: (data.notes || '').trim(),
        createdAt: new Date().toISOString()
      };
      list.push(p); wr(list); push('add', { item: p });
      return p;
    },
    update: function (id, patch) {
      var list = rd(); var p = list.filter(function (x) { return x.id === id; })[0];
      if (!p) return null;
      Object.assign(p, patch); wr(list);
      push('update', { id: id, patch: { name: p.name, phone: p.phone, whatsapp: p.whatsapp, city: p.city, address: p.address, notes: p.notes } });
      return p;
    },
    remove: function (id) { wr(rd().filter(function (x) { return x.id !== id; })); push('remove', { id: id }); }
  };

  /* ============ ÉTAT DE VUE ============ */
  var _view = { mode: 'list', id: null };

  /* ============ RENDU PAGE ============ */
  window.renderPartners = function () {
    var root = document.getElementById('partners-root');
    if (!root) return;
    if (_view.mode === 'fiche' && _view.id) renderFiche(root, _view.id);
    else renderList(root);
  };

  function renderList(root) {
    var partners = ASLPartners.list().slice().sort(function (a, b) { return (a.name || '').localeCompare(b.name || ''); });
    var rows = partners.map(function (p) {
      var s = stats(p.id);
      var stBadge = s.impaye > 0
        ? '<span class="badge badge-red">● Impayé</span>'
        : '<span class="badge badge-green">● À jour</span>';
      return '<tr>'
        + '<td><strong>' + esc(p.name) + '</strong></td>'
        + '<td style="font-size:12px;color:var(--text3);">' + esc(p.phone || '—') + '</td>'
        + '<td>' + s.count + '</td>'
        + '<td>' + money(s.facture) + '</td>'
        + '<td style="color:#22c55e;">' + money(s.paye) + '</td>'
        + '<td style="color:' + (s.impaye > 0 ? 'var(--red)' : 'inherit') + ';font-weight:600;">' + money(s.impaye) + '</td>'
        + '<td>' + stBadge + '</td>'
        + '<td><button class="btn-sm primary" onclick="aslOpenPartner(\'' + p.id + '\')">Voir la fiche</button></td>'
        + '</tr>';
    }).join('');
    root.innerHTML =
      '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:16px;flex-wrap:wrap;gap:10px;">'
      + '<div style="color:var(--text3);font-size:13px;">' + partners.length + ' partenaire(s) de sous-location · suivi séparé des clients classiques</div>'
      + '<button class="topbar-btn primary" onclick="aslOpenPartnerModal(null)">+ Ajouter partenaire</button>'
      + '</div>'
      + '<div class="table-card"><div class="table-header"><div class="table-title">Partenaires</div></div><div style="overflow-x:auto;"><table>'
      + '<thead><tr><th>Nom</th><th>Téléphone</th><th>Locations</th><th>Facturé</th><th>Payé</th><th>Impayé</th><th>Statut</th><th></th></tr></thead>'
      + '<tbody>' + (rows || '<tr><td colspan="8" style="text-align:center;color:var(--text3);padding:30px;">Aucun partenaire. Cliquez sur « Ajouter partenaire ».</td></tr>') + '</tbody>'
      + '</table></div></div>';
  }

  function statusLabel(st) {
    var map = { active: ['badge-green', 'En cours'], confirmed: ['badge-blue', 'Confirmée'], pending: ['badge-yellow', 'En attente'], reserved: ['badge-yellow', 'Réservée'], completed: ['badge-gray', 'Terminée'], closed: ['badge-gray', 'Clôturée'], cancelled: ['badge-red', 'Annulée'] };
    return map[st] || ['badge-gray', st || '—'];
  }
  function payLabel(r) {
    var reste = Math.max(0, (Number(r.amount) || 0) - (Number(r.paid) || 0));
    if (reste <= 0) return '<span class="badge badge-green">Payé</span>';
    if ((Number(r.paid) || 0) > 0) return '<span class="badge badge-yellow">Partiel · reste ' + money(reste) + '</span>';
    return '<span class="badge badge-red">Impayé · ' + money(reste) + '</span>';
  }

  function renderFiche(root, id) {
    var p = ASLPartners.get(id);
    if (!p) { _view = { mode: 'list', id: null }; renderList(root); return; }
    var s = stats(id);
    var enCours = s.items.filter(function (r) { return r.status === 'active' || r.status === 'confirmed' || r.status === 'reserved' || r.status === 'pending'; });
    var terminees = s.items.filter(function (r) { return r.status === 'completed' || r.status === 'closed'; });

    function locRow(r) {
      var reste = Math.max(0, (Number(r.amount) || 0) - (Number(r.paid) || 0));
      var stl = statusLabel(r.status);
      return '<tr>'
        + '<td><strong>' + esc(r.car || '—') + '</strong><div style="font-size:11px;color:var(--text3);">' + esc(r.assignedPlate || r.plate || '') + '</div></td>'
        + '<td style="font-size:12px;">' + esc(r.clientFinal || '—') + '</td>'
        + '<td style="font-size:12px;">' + esc(r.startDate || '') + '<br>→ ' + esc(r.endDate || '') + '</td>'
        + '<td>' + money(r.amount || 0) + '</td>'
        + '<td style="color:#22c55e;">' + money(r.paid || 0) + '</td>'
        + '<td style="color:' + (reste > 0 ? 'var(--red)' : 'inherit') + ';font-weight:600;">' + money(reste) + '</td>'
        + '<td>' + payLabel(r) + '</td>'
        + '<td><span class="badge ' + stl[0] + '">' + stl[1] + '</span></td>'
        + '<td style="white-space:nowrap;">'
        + (reste > 0 ? '<button class="btn-sm" onclick="aslPartnerMarkPaid(\'' + r.id + '\')">Marquer payé</button> ' : '')
        + (reste > 0 ? '<button class="btn-sm primary" onclick="aslPartnerPay(\'' + r.id + '\')">Encaisser</button> ' : '')
        + '<button class="btn-sm" onclick="aslPartnerViewLoc(\'' + r.id + '\')">Voir location</button>'
        + '</td></tr>';
    }
    var head = '<thead><tr><th>Véhicule</th><th>Client final</th><th>Dates</th><th>Total</th><th>Payé</th><th>Reste</th><th>Paiement</th><th>Statut</th><th>Actions</th></tr></thead>';

    root.innerHTML =
      '<button class="topbar-btn" onclick="aslPartnersBack()" style="margin-bottom:16px;">&#8592; Retour aux partenaires</button>'
      + '<div class="table-card" style="margin-bottom:18px;"><div style="padding:18px;">'
      + '<div style="display:flex;align-items:flex-start;justify-content:space-between;flex-wrap:wrap;gap:12px;">'
      + '<div><div style="font-size:20px;font-weight:700;">' + esc(p.name) + '</div>'
      + '<div style="color:var(--text3);font-size:13px;margin-top:4px;">'
      + (p.phone ? '📞 ' + esc(p.phone) + '&nbsp;&nbsp;' : '')
      + (p.whatsapp ? 'WhatsApp ' + esc(p.whatsapp) : '') + '</div>'
      + (p.address ? '<div style="color:var(--text3);font-size:12px;margin-top:2px;">' + esc(p.address) + '</div>' : '')
      + (p.notes ? '<div style="color:var(--text3);font-size:12px;margin-top:6px;font-style:italic;">' + esc(p.notes) + '</div>' : '')
      + '</div>'
      + '<div style="display:flex;gap:8px;flex-wrap:wrap;">'
      + '<button class="btn-sm" onclick="aslOpenPartnerModal(\'' + p.id + '\')">Modifier</button>'
      + '<button class="btn-sm primary" onclick="aslPartnerLink(\'' + p.id + '\')">+ Lier une location</button>'
      + '</div></div>'
      + '<div style="display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin-top:18px;">'
      + statCard('Locations', s.count, 'var(--text)')
      + statCard('Facturé', money(s.facture), 'var(--text)')
      + statCard('Payé', money(s.paye), '#22c55e')
      + statCard('Impayé', money(s.impaye), s.impaye > 0 ? 'var(--red)' : '#22c55e', s.impaye > 0 ? "var t=document.getElementById('partner-impaye'); if(t) t.scrollIntoView({behavior:'smooth',block:'start'});" : '')
      + '</div></div></div>'
      + (s.impaye > 0
        ? '<div class="table-card" id="partner-impaye" style="margin-bottom:18px;"><div class="table-header"><div class="table-title" style="color:var(--red);">Détail des impayés — total ' + money(s.impaye) + '</div></div><div style="overflow-x:auto;"><table>'
          + head + '<tbody>' + s.items.filter(function (r) { return (Number(r.amount) || 0) > (Number(r.paid) || 0); }).map(locRow).join('') + '</tbody></table></div></div>'
        : '')
      + '<div class="table-card" style="margin-bottom:18px;"><div class="table-header"><div class="table-title">Locations en cours (' + enCours.length + ')</div></div><div style="overflow-x:auto;"><table>'
      + head + '<tbody>' + (enCours.map(locRow).join('') || '<tr><td colspan="9" style="text-align:center;color:var(--text3);padding:20px;">Aucune location en cours.</td></tr>') + '</tbody></table></div></div>'
      + '<div class="table-card"><div class="table-header"><div class="table-title">Historique / terminées (' + terminees.length + ')</div></div><div style="overflow-x:auto;"><table>'
      + head + '<tbody>' + (terminees.map(locRow).join('') || '<tr><td colspan="9" style="text-align:center;color:var(--text3);padding:20px;">Aucune location terminée.</td></tr>') + '</tbody></table></div></div>';
  }
  function statCard(label, val, color, onclick) {
    return '<div style="background:var(--dark);border-radius:10px;padding:14px;' + (onclick ? 'cursor:pointer;' : '') + '"' + (onclick ? ' onclick="' + onclick + '"' : '') + '>'
      + '<div style="font-size:12px;color:var(--text3);">' + label + (onclick ? ' ›' : '') + '</div>'
      + '<div style="font-size:19px;font-weight:700;margin-top:4px;color:' + color + ';">' + val + '</div></div>';
  }

  /* ============ ACTIONS ============ */
  window.aslOpenPartner = function (id) { _view = { mode: 'fiche', id: id }; renderPartners(); };
  window.aslPartnersBack = function () { _view = { mode: 'list', id: null }; renderPartners(); };
  window.aslPartnerViewLoc = function (resId) {
    if (typeof window.viewRental === 'function') window.viewRental(resId);
    else if (typeof window.viewRes === 'function') window.viewRes(resId);
  };

  /* Marquer payé : solde en un clic (paiement total). */
  window.aslPartnerMarkPaid = function (resId) {
    var r = reservations().filter(function (x) { return x.id === resId; })[0];
    if (!r) return;
    var amt = Number(r.amount) || 0;
    if ((Number(r.paid) || 0) >= amt) { alert('Cette location est déjà soldée.'); return; }
    if (!confirm('Marquer cette location comme entièrement payée (' + money(amt - (Number(r.paid) || 0)) + ') ?')) return;
    try { if (window.ASLDB && ASLDB.updateReservation) ASLDB.updateReservation(resId, { paid: amt, lastPaymentAt: new Date().toISOString(), lastPaymentKind: 'partner' }); } catch (e) {}
    if (typeof window.reloadData === 'function') reloadData();
    renderPartners();
    if (typeof window.renderCaisse === 'function') renderCaisse();
    if (typeof window.renderDashboard === 'function') renderDashboard();
    if (typeof window.showToast === 'function') showToast('Location soldée ✓');
  };

  /* Encaissement partenaire : total ou partiel → met à jour reservation.paid
     (alimente automatiquement la Caisse et le Grand Livre). */
  window.aslPartnerPay = function (resId) {
    var r = reservations().filter(function (x) { return x.id === resId; })[0];
    if (!r) return;
    var reste = Math.max(0, (Number(r.amount) || 0) - (Number(r.paid) || 0));
    if (reste <= 0) { alert('Cette location est déjà soldée.'); return; }
    var v = prompt('Montant encaissé (reste : ' + money(reste) + ').\nLaissez le montant pour solder, ou saisissez un paiement partiel :', String(reste));
    if (v == null) return;
    var amt = Math.max(0, Math.min(reste, Math.round(Number(String(v).replace(/[^0-9.]/g, '')) || 0)));
    if (amt <= 0) { alert('Montant invalide.'); return; }
    var newPaid = (Number(r.paid) || 0) + amt;
    try { if (window.ASLDB && ASLDB.updateReservation) ASLDB.updateReservation(resId, { paid: newPaid, lastPaymentAt: new Date().toISOString(), lastPaymentKind: 'partner' }); } catch (e) {}
    if (typeof window.reloadData === 'function') reloadData();
    renderPartners();
    if (typeof window.renderCaisse === 'function') renderCaisse();
    if (typeof window.renderDashboard === 'function') renderDashboard();
    if (typeof window.showToast === 'function') showToast('Paiement partenaire encaissé : ' + money(amt) + (newPaid >= (Number(r.amount) || 0) ? ' — soldé ✓' : ''));
  };

  /* Lier une location existante (non rattachée) à ce partenaire. */
  window.aslPartnerLink = function (partnerId) {
    var avail = reservations().filter(function (r) { return !r.partnerId && r.status !== 'cancelled' && r.status !== 'completed'; });
    if (!avail.length) { alert('Aucune location disponible à lier (toutes sont déjà rattachées ou terminées).'); return; }
    var opts = avail.map(function (r) { return '<option value="' + r.id + '">' + esc((r.car || '') + ' · ' + (r.client || '') + ' · ' + (r.startDate || '') + ' → ' + (r.endDate || '')) + '</option>'; }).join('');
    openOverlay(
      '<div style="font-size:17px;font-weight:700;margin-bottom:12px;">Lier une location</div>'
      + '<div class="form-group"><label class="form-label">Location à rattacher</label><select class="form-select" id="lk-res">' + opts + '</select></div>'
      + '<div class="form-group"><label class="form-label">Client final (facultatif)</label><input class="form-input" id="lk-client" placeholder="Nom du client final"></div>'
      + '<div style="display:flex;gap:8px;margin-top:8px;"><button class="topbar-btn" onclick="aslCloseOverlay()">Annuler</button><button class="topbar-btn primary" style="flex:1;" onclick="aslPartnerLinkSave(\'' + partnerId + '\')">Lier</button></div>'
    );
  };
  window.aslPartnerLinkSave = function (partnerId) {
    var resId = (document.getElementById('lk-res') || {}).value;
    var clientFinal = ((document.getElementById('lk-client') || {}).value || '').trim();
    if (!resId) return;
    try { if (window.ASLDB && ASLDB.updateReservation) ASLDB.updateReservation(resId, { partnerId: partnerId, clientFinal: clientFinal }); } catch (e) {}
    aslCloseOverlay();
    if (typeof window.reloadData === 'function') reloadData();
    renderPartners();
    if (typeof window.showToast === 'function') showToast('Location rattachée au partenaire ✓');
  };

  /* ---- Modal Ajouter / Modifier partenaire ---- */
  window.aslOpenPartnerModal = function (id) {
    var p = id ? ASLPartners.get(id) : null;
    openOverlay(
      '<div style="font-size:17px;font-weight:700;margin-bottom:14px;">' + (p ? 'Modifier le partenaire' : 'Ajouter un partenaire') + '</div>'
      + '<div class="form-group"><label class="form-label">Nom du partenaire *</label><input class="form-input" id="pt-name" value="' + esc(p && p.name || '') + '"></div>'
      + '<div class="form-row"><div class="form-group"><label class="form-label">Téléphone</label><input class="form-input" id="pt-phone" value="' + esc(p && p.phone || '') + '"></div>'
      + '<div class="form-group"><label class="form-label">WhatsApp</label><input class="form-input" id="pt-wa" value="' + esc(p && p.whatsapp || '') + '"></div></div>'
      + '<div class="form-group"><label class="form-label">Adresse (facultatif)</label><input class="form-input" id="pt-addr" value="' + esc(p && p.address || '') + '"></div>'
      + '<div class="form-group"><label class="form-label">Notes internes</label><textarea class="form-input form-textarea" rows="2" id="pt-notes">' + esc(p && p.notes || '') + '</textarea></div>'
      + '<div style="display:flex;gap:8px;align-items:center;margin-top:16px;">'
      + (p ? '<button class="btn-sm" style="color:var(--red);margin-right:auto;" onclick="aslPartnerDelete(\'' + p.id + '\')">Supprimer</button>' : '<span style="margin-right:auto;"></span>')
      + '<button class="btn-sm" onclick="aslCloseOverlay()">Annuler</button>'
      + '<button class="btn-sm primary" onclick="aslSavePartner(' + (p ? '\'' + p.id + '\'' : 'null') + ')">Enregistrer</button></div>'
    );
  };
  window.aslSavePartner = function (id) {
    var data = {
      name: (document.getElementById('pt-name') || {}).value || '',
      phone: (document.getElementById('pt-phone') || {}).value || '',
      whatsapp: (document.getElementById('pt-wa') || {}).value || '',
      city: (document.getElementById('pt-city') || {}).value || '',
      address: (document.getElementById('pt-addr') || {}).value || '',
      notes: (document.getElementById('pt-notes') || {}).value || ''
    };
    if (!data.name.trim()) { alert('Le nom du partenaire est obligatoire.'); return; }
    if (id) ASLPartners.update(id, data); else { var np = ASLPartners.create(data); _view = { mode: 'fiche', id: np.id }; }
    aslCloseOverlay();
    renderPartners();
    if (typeof window.showToast === 'function') showToast('Partenaire enregistré ✓');
  };
  window.aslPartnerDelete = function (id) {
    if (!confirm('Supprimer ce partenaire ? Les locations rattachées ne sont pas supprimées, seulement dissociées.')) return;
    reservations().forEach(function (r) { if (r.partnerId === id) { try { ASLDB.updateReservation(r.id, { partnerId: '' }); } catch (e) {} } });
    ASLPartners.remove(id);
    aslCloseOverlay();
    _view = { mode: 'list', id: null };
    renderPartners();
    if (typeof window.showToast === 'function') showToast('Partenaire supprimé.');
  };

  /* ---- Overlay générique (self-contained, ne dépend pas des modales résa) ---- */
  function openOverlay(html) {
    aslCloseOverlay();
    var o = document.createElement('div');
    o.id = 'asl-partner-overlay';
    o.style.cssText = 'position:fixed;inset:0;z-index:6000;background:rgba(8,10,15,.6);display:flex;align-items:center;justify-content:center;padding:16px;';
    o.onclick = function (e) { if (e.target === o) aslCloseOverlay(); };
    o.innerHTML = '<div style="background:var(--dark2);border:1px solid var(--border);border-radius:16px;max-width:520px;width:100%;max-height:90vh;overflow-y:auto;padding:22px;">' + html + '</div>';
    document.body.appendChild(o);
  }
  window.aslCloseOverlay = function () { var o = document.getElementById('asl-partner-overlay'); if (o) o.remove(); };

  /* ---- Init : synchro KV au chargement (si connecté) + périodique ---- */
  try {
    if (typeof document !== 'undefined') {
      if (document.readyState !== 'loading') setTimeout(function () { if (adminKey()) pull(); }, 700);
      else document.addEventListener('DOMContentLoaded', function () { setTimeout(function () { if (adminKey()) pull(); }, 700); });
      setInterval(function () { if (adminKey()) pull(); }, 12000);
    }
  } catch (e) {}
})();
