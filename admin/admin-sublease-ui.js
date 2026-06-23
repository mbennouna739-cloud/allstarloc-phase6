/* ============================================================
   ALL STAR LOC — Interface Sous-location (desktop)
   Onglet, liste, formulaire compact, fiche complète, impayés,
   paiement. Indépendant des clients classiques.
   ============================================================ */
(function () {
  'use strict';

  function esc(s) { return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }
  function money(n) { return ASLSublease.money(n); }
  function S() { return window.ASLSublease; }

  /* ---------- LISTE ---------- */
  window.renderSubleases = function () {
    var host = document.getElementById('sublease-list');
    if (!host || typeof ASLSublease === 'undefined') return;
    var q = ((document.getElementById('sublease-search') || {}).value || '').toLowerCase().trim();
    var list = S().list();
    if (q) list = list.filter(function (s) { return ((s.name || '') + ' ' + (s.phone || '')).toLowerCase().indexOf(q) >= 0; });
    if (!list.length) {
      host.innerHTML = '<div style="text-align:center;padding:34px;color:#999;font-size:14px;">' +
        (q ? 'Aucune sous-location trouvée.' : 'Aucune sous-location. Cliquez sur « + Nouvelle sous-location ».') + '</div>';
      return;
    }
    host.innerHTML = list.map(function (s) {
      var st = S().stats(s.id);
      return '<div class="table-card" style="padding:15px 16px;margin-bottom:11px;cursor:pointer;" onclick="openSubleaseFiche(\'' + s.id + '\')">'
        + '<div style="display:flex;justify-content:space-between;align-items:flex-start;gap:10px;flex-wrap:wrap;">'
        + '<div><div style="font-weight:800;font-size:15px;">🤝 ' + esc(s.name) + '</div>'
        + '<div style="font-size:12.5px;color:var(--text3);margin-top:2px;">' + esc(s.phone || 'Pas de téléphone') + ' · ' + st.count + ' location(s)</div></div>'
        + '<div style="text-align:right;">'
        + '<div style="font-size:12px;color:var(--text3);">Restant dû</div>'
        + '<div style="font-weight:800;font-size:16px;color:' + (st.rest > 0 ? '#C41E3A' : '#16a34a') + ';">' + money(st.rest) + '</div></div>'
        + '</div>'
        + '<div style="display:flex;gap:16px;margin-top:10px;padding-top:10px;border-top:1px solid var(--border);font-size:12.5px;">'
        + '<div>Facturé : <strong>' + money(st.total) + '</strong></div>'
        + '<div>Payé : <strong style="color:#16a34a;">' + money(st.paid) + '</strong></div>'
        + '</div></div>';
    }).join('');
  };

  /* ---------- FORMULAIRE COMPACT (créer / modifier) ---------- */
  window.openSubleaseModal = function (id, onSaved) {
    var sub = id ? S().get(id) : null;
    var host = document.getElementById('sublease-modal-host');
    if (!host) { host = document.createElement('div'); host.id = 'sublease-modal-host'; document.body.appendChild(host); }
    host.innerHTML =
      '<div style="position:fixed;inset:0;background:rgba(10,12,18,.55);z-index:9000;display:flex;align-items:center;justify-content:center;padding:16px;" onclick="if(event.target===this)closeSubleaseModal()">'
      + '<div style="background:#fff;border-radius:16px;max-width:460px;width:100%;max-height:92vh;overflow-y:auto;box-shadow:0 24px 60px rgba(0,0,0,.25);">'
      + '<div style="padding:18px 20px;border-bottom:1px solid #eee;display:flex;align-items:center;justify-content:space-between;">'
      + '<strong style="font-size:16px;color:#1a1a2e;">' + (sub ? 'Modifier la sous-location' : 'Nouvelle sous-location') + '</strong>'
      + '<button onclick="closeSubleaseModal()" style="background:none;border:none;font-size:20px;cursor:pointer;color:#999;">&#10005;</button></div>'
      + '<div style="padding:20px;">'
      + fld('Nom', '<input type="text" id="sub-name" class="form-input" value="' + (sub ? esc(sub.name) : '') + '" placeholder="">')
      + fld('Téléphone', '<input type="tel" id="sub-phone" class="form-input" value="' + (sub ? esc(sub.phone) : '') + '" placeholder="+212 6...">')
      + fld('WhatsApp', '<input type="tel" id="sub-whatsapp" class="form-input" value="' + (sub ? esc(sub.whatsapp) : '') + '" placeholder="+212 6...">')
      + fld('Adresse (facultatif)', '<input type="text" id="sub-address" class="form-input" value="' + (sub ? esc(sub.address) : '') + '" placeholder="">')
      + fld('Notes internes', '<textarea id="sub-notes" class="form-input" rows="3" placeholder="">' + (sub ? esc(sub.notes) : '') + '</textarea>')
      + '</div>'
      + '<div style="padding:14px 20px;border-top:1px solid #eee;display:flex;gap:10px;justify-content:flex-end;">'
      + '<button onclick="closeSubleaseModal()" style="padding:9px 18px;border:1px solid #ddd;background:#fff;border-radius:9px;cursor:pointer;font-size:14px;">Annuler</button>'
      + '<button onclick="saveSublease(' + (id ? '\'' + id + '\'' : 'null') + ')" style="padding:9px 20px;border:none;background:#C41E3A;color:#fff;border-radius:9px;cursor:pointer;font-weight:600;font-size:14px;">Enregistrer</button>'
      + '</div></div></div>';
    window._subleaseOnSaved = onSaved || null;
  };

  function fld(label, field) {
    return '<div style="margin-bottom:13px;"><label style="display:block;font-size:13px;font-weight:600;margin-bottom:5px;color:#374151;">' + label + '</label>' + field + '</div>';
  }

  window.closeSubleaseModal = function () { var h = document.getElementById('sublease-modal-host'); if (h) h.innerHTML = ''; };

  window.saveSublease = function (id) {
    var data = {
      name: (document.getElementById('sub-name').value || '').trim(),
      phone: document.getElementById('sub-phone').value || '',
      whatsapp: document.getElementById('sub-whatsapp').value || '',
      address: document.getElementById('sub-address').value || '',
      notes: document.getElementById('sub-notes').value || ''
    };
    if (!data.name) { alert('Veuillez saisir un nom.'); return; }
    var saved;
    if (id) { saved = S().update(id, data); if (typeof showToast === 'function') showToast('Sous-location mise à jour ✓'); }
    else { var res = S().create(data); if (res.error) { alert(res.error); return; } saved = res.sub; if (typeof showToast === 'function') showToast('Sous-location créée ✓'); }
    closeSubleaseModal();
    if (typeof renderSubleases === 'function') renderSubleases();
    if (window._subleaseOnSaved) { try { window._subleaseOnSaved(saved); } catch (e) {} window._subleaseOnSaved = null; }
  };

  /* ---------- FICHE COMPLÈTE ---------- */
  window.openSubleaseFiche = function (id) {
    var sub = S().get(id);
    if (!sub) return;
    var st = S().stats(id);
    var rows = S().linkedRes(id);
    var host = document.getElementById('sublease-fiche-host');
    if (!host) { host = document.createElement('div'); host.id = 'sublease-fiche-host'; document.body.appendChild(host); }

    var rowsHtml = rows.length ? rows.map(function (r) {
      var reste = Math.max(0, (Number(r.amount) || 0) - (Number(r.paid) || 0));
      var payState = reste <= 0 ? '<span style="font-size:11px;font-weight:700;padding:3px 9px;border-radius:50px;background:rgba(22,163,74,.12);color:#16a34a;">Soldé</span>' : '<span style="font-size:11px;font-weight:700;padding:3px 9px;border-radius:50px;background:rgba(196,30,58,.12);color:#C41E3A;">Reste ' + money(reste) + '</span>';
      var plate = r.assignedPlate || (function () { try { var f = ASLDB.getFleet().filter(function (c) { return c.name === r.car || c.id === r.carId; })[0]; return f ? (f.plate || '') : ''; } catch (e) { return ''; } })();
      return '<tr>'
        + '<td>' + esc(r.car || '') + (plate ? '<br><span style="font-size:11px;color:#888;">' + esc(plate) + '</span>' : '') + '</td>'
        + '<td>' + esc(r.finalClient || r.client || '—') + '</td>'
        + '<td style="font-size:11.5px;">' + esc(r.startDate || '') + '<br>→ ' + esc(r.endDate || '') + '</td>'
        + '<td style="text-align:right;">' + money(r.amount || 0) + '</td>'
        + '<td style="text-align:right;color:#16a34a;">' + money(r.paid || 0) + '</td>'
        + '<td style="text-align:right;color:' + (reste > 0 ? '#C41E3A' : '#16a34a') + ';">' + money(reste) + '</td>'
        + '<td>' + payState + '</td>'
        + '<td style="white-space:nowrap;">'
        + '<button class="btn-sm ghost" onclick="closeSubleaseFiche();viewRes(\'' + r.id + '\')">Voir</button>'
        + (reste > 0 ? ' <button class="btn-sm primary" onclick="subleasePayLine(\'' + id + '\',\'' + r.id + '\')">Payer</button>' : '')
        + '</td></tr>';
    }).join('') : '<tr><td colspan="8" style="text-align:center;color:#999;padding:24px;">Aucune location liée.</td></tr>';

    host.innerHTML =
      '<div style="position:fixed;inset:0;background:rgba(10,12,18,.55);z-index:8500;display:flex;align-items:center;justify-content:center;padding:16px;" onclick="if(event.target===this)closeSubleaseFiche()">'
      + '<div style="background:#fff;border-radius:16px;max-width:920px;width:100%;max-height:92vh;overflow-y:auto;box-shadow:0 24px 60px rgba(0,0,0,.25);">'
      + '<div style="padding:18px 22px;border-bottom:1px solid #eee;display:flex;align-items:center;justify-content:space-between;position:sticky;top:0;background:#fff;z-index:2;">'
      + '<strong style="font-size:17px;color:#1a1a2e;">🤝 ' + esc(sub.name) + '</strong>'
      + '<div style="display:flex;gap:8px;"><button class="btn-sm ghost" onclick="openSubleaseModal(\'' + id + '\',function(){openSubleaseFiche(\'' + id + '\');})">Modifier</button>'
      + '<button onclick="closeSubleaseFiche()" style="background:none;border:none;font-size:20px;cursor:pointer;color:#999;">&#10005;</button></div></div>'
      + '<div style="padding:22px;">'
      // Coordonnées
      + '<div style="display:flex;gap:18px;flex-wrap:wrap;margin-bottom:18px;font-size:13px;color:#556;">'
      + (sub.phone ? '<div>📞 <a href="tel:' + esc(sub.phone) + '" style="color:#2563eb;">' + esc(sub.phone) + '</a></div>' : '')
      + (sub.whatsapp ? '<div>💬 <a href="https://wa.me/' + esc(sub.whatsapp.replace(/[^0-9]/g, '')) + '" target="_blank" style="color:#16a34a;">' + esc(sub.whatsapp) + '</a></div>' : '')
      + (sub.address ? '<div>📍 ' + esc(sub.address) + '</div>' : '')
      + '</div>'
      + (sub.notes ? '<div style="background:#fafafa;border-radius:10px;padding:12px;font-size:13px;color:#556;margin-bottom:18px;">📝 ' + esc(sub.notes) + '</div>' : '')
      // Stats
      + '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(130px,1fr));gap:12px;margin-bottom:20px;">'
      + statCard('Locations', st.count, '#4f46e5')
      + statCard('Total facturé', money(st.total), '#1a1a2e')
      + statCard('Total payé', money(st.paid), '#16a34a')
      + '<div onclick="openSubleaseUnpaid(\'' + id + '\')" style="background:#fff;border:1px solid var(--border);border-left:4px solid #C41E3A;border-radius:10px;padding:12px;cursor:pointer;">'
      + '<div style="font-size:11.5px;color:#667;">Restant à payer</div><div style="font-size:18px;font-weight:800;color:#C41E3A;">' + money(st.rest) + '</div>'
      + '<div style="font-size:11px;color:#2563eb;text-decoration:underline;margin-top:2px;">Voir le détail →</div></div>'
      + '</div>'
      // Historique
      + '<div style="font-size:13px;font-weight:800;margin-bottom:10px;color:#374151;">Historique complet</div>'
      + '<div style="overflow-x:auto;"><table class="data-table" style="width:100%;font-size:12.5px;">'
      + '<thead><tr><th>Véhicule</th><th>Client final</th><th>Dates</th><th style="text-align:right;">Total</th><th style="text-align:right;">Payé</th><th style="text-align:right;">Restant</th><th>Statut</th><th></th></tr></thead>'
      + '<tbody>' + rowsHtml + '</tbody></table></div>'
      + '</div></div></div>';
  };

  function statCard(label, val, color) {
    return '<div style="background:#fff;border:1px solid var(--border);border-radius:10px;padding:12px;"><div style="font-size:11.5px;color:#667;">' + label + '</div><div style="font-size:18px;font-weight:800;color:' + (color || '#1a1a2e') + ';">' + val + '</div></div>';
  }

  window.closeSubleaseFiche = function () { var h = document.getElementById('sublease-fiche-host'); if (h) h.innerHTML = ''; };

  /* ---------- IMPAYÉS (détail) ---------- */
  window.openSubleaseUnpaid = function (id) {
    var sub = S().get(id);
    if (!sub) return;
    var unpaid = S().linkedRes(id).filter(function (r) { return (Number(r.amount) || 0) > (Number(r.paid) || 0); });
    var totalUnpaid = unpaid.reduce(function (s, r) { return s + ((Number(r.amount) || 0) - (Number(r.paid) || 0)); }, 0);
    var host = document.getElementById('sublease-unpaid-host');
    if (!host) { host = document.createElement('div'); host.id = 'sublease-unpaid-host'; document.body.appendChild(host); }
    var rows = unpaid.length ? unpaid.map(function (r) {
      var reste = (Number(r.amount) || 0) - (Number(r.paid) || 0);
      return '<div class="table-card" style="padding:13px 15px;margin-bottom:10px;">'
        + '<div style="display:flex;justify-content:space-between;align-items:flex-start;gap:10px;flex-wrap:wrap;">'
        + '<div><div style="font-weight:700;">' + esc(r.finalClient || r.client || 'Client') + '</div>'
        + '<div style="font-size:12px;color:#778;">' + esc(r.car || '') + ' · ' + esc(r.startDate || '') + ' → ' + esc(r.endDate || '') + '</div></div>'
        + '<div style="text-align:right;"><div style="font-size:11px;color:#667;">Reste</div><div style="font-weight:800;color:#C41E3A;">' + money(reste) + '</div></div></div>'
        + '<div style="display:flex;gap:14px;margin-top:9px;padding-top:9px;border-top:1px solid var(--border);font-size:12px;">'
        + '<div>Total : <strong>' + money(r.amount || 0) + '</strong></div><div>Payé : <strong style="color:#16a34a;">' + money(r.paid || 0) + '</strong></div></div>'
        + '<div style="display:flex;gap:8px;margin-top:10px;">'
        + '<button class="btn-sm ghost" style="flex:1;" onclick="closeSubleaseUnpaid();closeSubleaseFiche();viewRes(\'' + r.id + '\')">Voir location</button>'
        + '<button class="btn-sm primary" style="flex:1;" onclick="subleasePayLine(\'' + id + '\',\'' + r.id + '\')">Marquer payé</button>'
        + '</div></div>';
    }).join('') : '<div style="text-align:center;color:#16a34a;padding:24px;">✓ Aucun impayé pour cette sous-location.</div>';

    host.innerHTML =
      '<div style="position:fixed;inset:0;background:rgba(10,12,18,.55);z-index:8600;display:flex;align-items:center;justify-content:center;padding:16px;" onclick="if(event.target===this)closeSubleaseUnpaid()">'
      + '<div style="background:#fff;border-radius:16px;max-width:520px;width:100%;max-height:90vh;overflow-y:auto;box-shadow:0 24px 60px rgba(0,0,0,.25);">'
      + '<div style="padding:18px 20px;border-bottom:1px solid #eee;display:flex;align-items:center;justify-content:space-between;position:sticky;top:0;background:#fff;">'
      + '<div><strong style="font-size:16px;">Impayés — ' + esc(sub.name) + '</strong><div style="font-size:13px;color:#C41E3A;font-weight:700;margin-top:2px;">Total impayé : ' + money(totalUnpaid) + '</div></div>'
      + '<button onclick="closeSubleaseUnpaid()" style="background:none;border:none;font-size:20px;cursor:pointer;color:#999;">&#10005;</button></div>'
      + '<div style="padding:18px;">' + rows + '</div></div></div>';
  };

  window.closeSubleaseUnpaid = function () { var h = document.getElementById('sublease-unpaid-host'); if (h) h.innerHTML = ''; };

  /* ---------- PAIEMENT (partiel ou total) ---------- */
  window.subleasePayLine = function (subId, resId) {
    var r = (ASLDB.getReservations() || []).filter(function (x) { return x.id === resId; })[0];
    if (!r) return;
    var reste = Math.max(0, (Number(r.amount) || 0) - (Number(r.paid) || 0));
    var amountStr = prompt('Montant encaissé pour ' + (r.finalClient || r.client || '') + '\n(Reste à payer : ' + money(reste) + ')\n\nLaissez le montant pour solder, ou saisissez un montant partiel :', String(Math.round(reste)));
    if (amountStr === null) return;
    var amount = parseFloat(amountStr) || 0;
    if (amount <= 0) { alert('Montant invalide.'); return; }
    if (amount > reste) amount = reste;
    var newPaid = (Number(r.paid) || 0) + amount;
    var payStatus = newPaid >= (Number(r.amount) || 0) ? 'paid' : 'partial';
    try {
      ASLDB.updateReservation(resId, { paid: newPaid, paymentStatus: payStatus });
    } catch (e) {}
    if (typeof showToast === 'function') showToast('Paiement de ' + money(amount) + ' enregistré ✓');
    // Rafraîchir tout ce qui dépend des paiements
    ['renderSubleases', 'renderDashboard', 'renderCaisse', 'renderPayments', 'updateBadges'].forEach(function (fn) {
      try { if (typeof window[fn] === 'function') window[fn](); } catch (e) {}
    });
    // Recharger les vues sous-location ouvertes
    closeSubleaseUnpaid();
    if (document.getElementById('sublease-fiche-host') && document.getElementById('sublease-fiche-host').innerHTML) openSubleaseFiche(subId);
  };

  /* Helpers pour le formulaire Nouvelle réservation (nr-*). */
  window.nrToggleSublease = function () {
    var box = document.getElementById('nr-sublease-box');
    var type = (document.getElementById('nr-doctype') && document.getElementById('nr-doctype').value) || 'direct';
    if (box) box.style.display = (type === 'sublease') ? 'block' : 'none';
  };
  window.nrQuickCreateSublease = function () {
    openSubleaseModal(null, function (saved) {
      var sel = document.getElementById('nr-sublease');
      if (sel && saved) sel.innerHTML = ASLSublease.options(saved.id);
    });
  };

  /* Rendu auto quand on ouvre l'onglet. */
  document.addEventListener('DOMContentLoaded', function () {
    if (document.getElementById('sublease-list')) renderSubleases();
  });
})();
