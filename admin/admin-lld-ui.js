/* ============================================================
   ALL STAR LOC — Location Longue Durée : interface desktop
   Liste (client + véhicule), fiche détaillée (échéancier mois
   par mois, paiements, reste à payer). Affecte le statut du
   véhicule à 'lld' (masqué + non réservable) quand actif.
   ============================================================ */
(function () {
  'use strict';

  function fleet() { try { return (ASLDB.getFleet && ASLDB.getFleet()) || []; } catch (e) { return []; } }
  function money(n) { return (Number(n) || 0).toLocaleString('fr-FR') + ' MAD'; }
  function esc(s) { return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }
  function carName(id) { var c = fleet().filter(function (x) { return String(x.id) === String(id); })[0]; return c ? c.name : '—'; }
  function carPlate(id) { var c = fleet().filter(function (x) { return String(x.id) === String(id); })[0]; return c ? (c.plate || '') : ''; }

  /* ★ Points 5-6 (refonte) — Les contrats LLD sont désormais de simples
     réservations avec type:'lld', créées via le MÊME pop-up que Nouvelle
     location (voir _buildNewLocationModal(true) dans admin-lot5.js). Plus
     de calendrier mensuel fixe : chaque contrat porte un historique de
     versements libres (r.payments[]), chacun avec sa date, son montant,
     son mode et la personne qui l'a encaissé. r.paid = somme des versements. */
  function lldRes() { try { return (ASLDB.getReservations && ASLDB.getReservations()) || []; } catch (e) { return []; } }
  function lldList() { return lldRes().filter(function (r) { return r.type === 'lld' && r.status !== 'cancelled'; }); }

  window.renderLLD = function () {
    var host = document.getElementById('lld-list');
    if (!host) return;
    var q = ((document.getElementById('lld-search') && document.getElementById('lld-search').value) || '').toLowerCase().trim();
    var all = lldList();
    if (q) {
      all = all.filter(function (c) {
        return (c.client || '').toLowerCase().indexOf(q) >= 0 || (c.car || '').toLowerCase().indexOf(q) >= 0;
      });
    }
    if (!all.length) {
      host.innerHTML = '<div style="text-align:center;padding:40px;color:var(--text3);">Aucun contrat de location longue durée.<br>Cliquez sur « + Nouveau contrat LLD » pour commencer.</div>';
      return;
    }
    host.innerHTML = '<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(300px,1fr));gap:16px;">' + all.map(function (c) {
      var totalPaid = (c.payments || []).reduce(function (s, p) { return s + (Number(p.amount) || 0); }, 0);
      var rest = Math.max(0, (Number(c.amount) || 0) - totalPaid);
      var statusColor = rest > 0 ? '#d97706' : '#22c55e';
      var statusLabel = rest > 0 ? 'En cours' : 'Soldé';
      return '<div class="fleet-card" style="cursor:pointer;" onclick="viewLLDContract(\'' + c.id + '\')">'
        + '<div style="padding:16px;">'
        + '<div style="display:flex;justify-content:space-between;align-items:flex-start;gap:10px;">'
        + '<div><div style="font-weight:800;font-size:15px;">' + esc(c.client || 'Client') + '</div>'
        + '<div style="font-size:12.5px;color:var(--text2);margin-top:2px;">' + esc(c.car || '') + (c.assignedPlate ? ' · ' + esc(c.assignedPlate) : '') + '</div></div>'
        + '<span class="badge" style="background:' + statusColor + '22;color:' + statusColor + ';white-space:nowrap;">● ' + statusLabel + '</span></div>'
        + '<div style="display:flex;gap:8px 18px;flex-wrap:wrap;margin-top:12px;font-size:12.5px;">'
        + '<div><span style="color:var(--text3);">Début</span><br><b>' + esc(c.startDate || '—') + '</b></div>'
        + '<div><span style="color:var(--text3);">Durée</span><br><b>' + (c.days || 0) + ' jours</b></div>'
        + '<div><span style="color:var(--text3);">Total</span><br><b>' + money(c.amount) + '</b></div>'
        + '<div><span style="color:var(--text3);">Reste</span><br><b style="color:' + (rest > 0 ? '#C41E3A' : '#22c55e') + ';">' + money(rest) + '</b></div>'
        + '</div></div></div>';
    }).join('') + '</div>';
  };

  function carOptions(selectedId) {
    return fleet().map(function (c) {
      return '<option value="' + c.id + '"' + (String(c.id) === String(selectedId) ? ' selected' : '') + '>' + esc(c.name) + (c.plate ? ' (' + esc(c.plate) + ')' : '') + '</option>';
    }).join('');
  }

  window.openLLDModal = function (id) {
    var c = id ? ASLLLD.get(id) : null;
    var body = document.getElementById('modal-body');
    var title = document.getElementById('modal-title');
    var footer = document.getElementById('modal-footer');
    if (!body) return;
    if (title) title.textContent = c ? 'Modifier le contrat LLD' : 'Nouveau contrat LLD';
    var today = new Date().toISOString().slice(0, 10);
    body.innerHTML =
      '<div class="form-group"><label class="form-label">Client</label><input class="form-input" id="lld-client" value="' + esc(c ? c.client : '') + '" placeholder="Nom du client"></div>'
      + '<div class="form-group"><label class="form-label">Téléphone</label><input class="form-input" id="lld-phone" value="' + esc(c ? c.phone : '') + '" placeholder="06 12 34 56 78"></div>'
      + '<div class="form-group"><label class="form-label">Véhicule</label><select class="form-select" id="lld-car">' + carOptions(c ? c.carId : '') + '</select></div>'
      + '<div class="form-row">'
      + '<div class="form-group"><label class="form-label">Date de début</label><input type="date" class="form-input" id="lld-start" value="' + (c ? c.startDate : today) + '"></div>'
      + '<div class="form-group"><label class="form-label">Durée (mois)</label><input type="number" min="1" max="60" class="form-input" id="lld-duration" value="' + (c ? c.durationMonths : 12) + '"></div>'
      + '</div>'
      + '<div class="form-group"><label class="form-label">Montant mensuel (MAD)</label><input type="number" min="0" class="form-input" id="lld-monthly" value="' + (c ? c.monthlyAmount : '') + '" placeholder="ex : 4500"></div>'
      + '<div class="form-group"><label class="form-label">Notes</label><textarea class="form-input form-textarea" id="lld-notes" rows="2" placeholder="Observations…">' + esc(c ? c.notes : '') + '</textarea></div>';
    if (footer) {
      footer.style.display = 'flex';
      footer.innerHTML = '<button class="topbar-btn" onclick="closeModal()">Annuler</button>'
        + (c ? '<button class="topbar-btn" style="color:#ef4444;" onclick="deleteLLD(\'' + c.id + '\')">Supprimer</button>' : '')
        + '<button class="topbar-btn primary" onclick="saveLLD(' + (c ? "'" + c.id + "'" : 'null') + ')">Enregistrer</button>';
    }
    // Ouvre l'overlay SANS passer par openModal() : ce module a son propre pied
    // de page (boutons specifiques). openModal() restaurerait le pied de page
    // standard et ecraserait ces boutons.
    var _ov = document.getElementById('modal-overlay'); if (_ov) _ov.classList.add('open');
  };

  window.saveLLD = function (id) {
    var client = (document.getElementById('lld-client') || {}).value || '';
    if (!client.trim()) { alert('Indiquez le nom du client.'); return; }
    var carId = parseInt((document.getElementById('lld-car') || {}).value);
    var data = {
      client: client.trim(),
      phone: (document.getElementById('lld-phone') || {}).value || '',
      carId: carId,
      startDate: (document.getElementById('lld-start') || {}).value || '',
      durationMonths: parseInt((document.getElementById('lld-duration') || {}).value) || 0,
      monthlyAmount: parseFloat((document.getElementById('lld-monthly') || {}).value) || 0,
      notes: (document.getElementById('lld-notes') || {}).value || '',
      status: 'active'
    };
    var saved;
    if (id) saved = ASLLLD.update(id, data);
    else saved = ASLLLD.add(data);
    // Affecter le véhicule : statut 'lld' → masqué du site + non réservable
    try {
      if (carId && ASLDB.updateVehicle) ASLDB.updateVehicle(carId, { status: 'lld', lldContractId: saved.id });
    } catch (e) {}
    if (typeof reloadData === 'function') reloadData();
    if (typeof renderFleetPage === 'function') renderFleetPage();
    if (typeof renderAvailability === 'function') renderAvailability();
    if (typeof closeModal === 'function') closeModal();
    renderLLD();
    if (typeof showToast === 'function') showToast('Contrat LLD enregistré ✓ Véhicule retiré du site client.');
  };

  window.deleteLLD = function (id) {
    var c = lldRes().filter(function (x) { return x.id === id; })[0];
    if (!c) return;
    if (!confirm('Supprimer définitivement ce contrat LLD ?\nLe véhicule redeviendra disponible.')) return;
    if (typeof ASLDB !== 'undefined') {
      if (c.carId && c.assignedPlate && typeof ASLDB.releaseUnit === 'function') ASLDB.releaseUnit(c.carId, c.assignedPlate);
      if (ASLDB.deleteReservation) ASLDB.deleteReservation(id);
    }
    if (typeof reloadData === 'function') reloadData();
    if (typeof renderFleetPage === 'function') renderFleetPage();
    if (typeof closeModal === 'function') closeModal();
    renderLLD();
    if (typeof showToast === 'function') showToast('Contrat supprimé — véhicule de nouveau disponible ✓');
  };

  /* ★ Points 5-6 (refonte) — Fiche détaillée : historique de versements
     LIBRES (aucun calendrier mensuel imposé), chacun avec sa date, son
     montant, son mode et la personne ayant encaissé. Chaque versement met
     à jour r.paid (= somme des versements) via ASLDB.updateReservation,
     qui alimente donc automatiquement caisse, Grand Livre et statistiques
     — sans aucun doublon, puisque c'est toujours le même enregistrement. */
  window.viewLLDContract = function (id) {
    var c = lldRes().filter(function (x) { return x.id === id; })[0];
    if (!c) return;
    var payments = (c.payments || []).slice().sort(function (a, b) { return String(a.date||'').localeCompare(String(b.date||'')); });
    var totalPaid = payments.reduce(function (s, p) { return s + (Number(p.amount) || 0); }, 0);
    var totalDue = Number(c.amount) || 0;
    var rest = Math.max(0, totalDue - totalPaid);
    var body = document.getElementById('modal-body');
    var title = document.getElementById('modal-title');
    var footer = document.getElementById('modal-footer');
    if (title) title.textContent = 'Contrat LLD — ' + (c.client || '');

    var slName = (typeof subLeaseNameFor === 'function') ? subLeaseNameFor(c) : '';
    var payRows = payments.length ? payments.map(function (p, idx) {
      return '<tr style="border-bottom:1px solid var(--border);">'
        + '<td style="padding:8px 6px;">' + esc(p.date || '—') + '</td>'
        + '<td style="padding:8px 6px;color:#16a34a;font-weight:600;">' + money(p.amount) + '</td>'
        + '<td style="padding:8px 6px;">' + esc(p.mode || '—') + '</td>'
        + '<td style="padding:8px 6px;">' + esc(p.collectedBy || '—') + '</td>'
        + '<td style="padding:8px 6px;color:var(--text3);">' + esc(p.comment || '') + '</td>'
        + '<td style="padding:8px 6px;"><button class="btn-sm ghost" style="color:var(--red);" onclick="deleteLLDPaymentEntry(\'' + c.id + '\',' + idx + ')">✕</button></td>'
        + '</tr>';
    }).join('') : '<tr><td colspan="6" style="padding:14px;text-align:center;color:var(--text3);">Aucun versement enregistré.</td></tr>';

    var carOptsLLD = fleet().map(function(fc){
      var sel = (String(fc.id)===String(c.carId)) ? ' selected' : '';
      return '<option value="'+fc.id+'"'+sel+'>'+esc(fc.name)+(fc.plate?' — '+esc(fc.plate):'')+'</option>';
    }).join('');
    body.innerHTML =
      (slName ? '<div style="background:rgba(139,92,246,.08);border:1px solid rgba(139,92,246,.25);border-radius:10px;padding:10px 14px;margin-bottom:12px;"><div style="font-size:11px;color:#8b5cf6;font-weight:700;text-transform:uppercase;">Sous-location</div><div style="font-weight:800;font-size:15px;">' + esc(slName) + '</div></div>' : '')
      // ★ MISSION « FINI TOUT » (point 1) : contrat LLD entièrement
      //   modifiable — client, téléphone, véhicule, dates, montant total.
      + '<div class="form-row">'
      + '<div class="form-group"><label class="form-label">Client</label><input class="form-input" id="lld-client" value="' + esc(c.client||'') + '"></div>'
      + '<div class="form-group"><label class="form-label">Téléphone</label><input class="form-input" id="lld-phone" value="' + esc(c.phone||'') + '"></div>'
      + '</div>'
      + '<div class="form-group"><label class="form-label">Véhicule</label><select class="form-select" id="lld-car">' + carOptsLLD + '</select></div>'
      + '<div class="form-row">'
      + '<div class="form-group"><label class="form-label">Date début</label><input type="date" class="form-input" id="lld-start" value="' + esc(c.startDate||'') + '" onchange="lldSyncDays()"></div>'
      + '<div class="form-group"><label class="form-label">Date fin</label><input type="date" class="form-input" id="lld-end" value="' + esc(c.endDate||'') + '" onchange="lldSyncDays()"></div>'
      + '</div>'
      + '<div class="form-group"><label class="form-label">Durée (jours, calculée)</label><input class="form-input" id="lld-days-display" value="' + (typeof daysFromDates === 'function' ? daysFromDates(c.startDate, c.endDate, c.days||0) : (c.days||0)) + ' jours" disabled></div>'
      + '<div style="display:flex;gap:8px 20px;flex-wrap:wrap;margin-bottom:16px;padding:12px;background:rgba(18,22,30,.03);border-radius:10px;font-size:13px;">'
      + '<div class="form-group" style="margin:0;"><label class="form-label">Montant total du contrat (MAD)</label><input class="form-input" type="number" id="lld-amount" value="' + totalDue + '"></div>'
      + '<div><span style="color:var(--text3);">Total reçu</span><br><b style="color:#16a34a;">' + money(totalPaid) + '</b></div>'
      + '<div><span style="color:var(--text3);">Reste à payer</span><br><b style="color:' + (rest > 0 ? '#C41E3A' : '#16a34a') + ';">' + money(rest) + '</b></div>'
      + '</div>'
      + '<button class="btn-sm primary" style="margin-bottom:14px;" onclick="saveLLDContractInfo(\'' + c.id + '\')">💾 Enregistrer les modifications du contrat</button>'
      + '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">'
      + '<div style="font-weight:700;">Historique des paiements</div>'
      + '<button class="btn-sm primary" onclick="addLLDPaymentEntry(\'' + c.id + '\')">+ Ajouter un versement</button>'
      + '</div>'
      + '<div style="overflow-x:auto;"><table style="width:100%;border-collapse:collapse;font-size:13px;min-width:520px;">'
      + '<thead><tr style="text-align:left;color:var(--text3);font-size:12px;">'
      + '<th style="padding:6px;">Date</th><th style="padding:6px;">Montant</th><th style="padding:6px;">Mode</th><th style="padding:6px;">Encaissé par</th><th style="padding:6px;">Commentaire</th><th style="padding:6px;"></th></tr></thead>'
      + '<tbody>' + payRows + '</tbody></table></div>';

    if (footer) {
      footer.style.display = 'flex';
      footer.innerHTML = '<button class="topbar-btn" onclick="closeModal()">Fermer</button>'
        + '<button class="topbar-btn" style="color:var(--red);" onclick="deleteLLD(\'' + c.id + '\')">🗑 Supprimer le contrat</button>'
        + (c.phone ? '<a class="topbar-btn primary" style="text-decoration:none;" href="https://wa.me/' + esc(c.phone.replace(/[^0-9]/g, '')) + '" target="_blank">WhatsApp</a>' : '');
    }
    var _ov = document.getElementById('modal-overlay'); if (_ov) _ov.classList.add('open');
  };

  /* ★ Point 6 — Ajoute un versement LIBRE (aucune date imposée). Met à jour
     r.paid (= somme des versements) et r.paymentStatus, qui alimentent
     automatiquement impayés / caisse / Grand Livre / statistiques puisque
     ceux-ci sont toujours recalculés en direct depuis la réservation. */
  window.addLLDPaymentEntry = function (id) {
    var c = lldRes().filter(function (x) { return x.id === id; })[0];
    if (!c) return;
    var rest = Math.max(0, (Number(c.amount) || 0) - (c.payments || []).reduce(function (s, p) { return s + (Number(p.amount) || 0); }, 0));
    var amountStr = prompt('Montant du versement (MAD) — reste dû : ' + money(rest) + ' :', rest > 0 ? String(rest) : '');
    if (amountStr == null) return;
    var amount = parseFloat(amountStr) || 0;
    if (amount <= 0) return;
    var dateStr = prompt('Date du versement (AAAA-MM-JJ) :', (typeof ASLDB !== 'undefined' && ASLDB.localDateISO) ? ASLDB.localDateISO() : new Date().toISOString().slice(0, 10));
    if (dateStr == null) return;
    var modeStr = prompt('Mode de paiement (Espèces / Carte bancaire / Virement / Chèque / Autre) :', c.paymentMode || 'Espèces') || 'Espèces';
    var collector = prompt('Encaissé par (Mohamed / Younes / Khalil) :', c.collectedBy || '') || '';
    var comment = prompt('Commentaire (facultatif) :', '') || '';

    var payments = (c.payments || []).slice();
    payments.push({ date: dateStr, amount: amount, mode: modeStr, collectedBy: collector, comment: comment });
    var newPaid = payments.reduce(function (s, p) { return s + (Number(p.amount) || 0); }, 0);
    var payStatus = newPaid <= 0 ? 'Non payé' : (newPaid >= (Number(c.amount)||0) ? 'Paiement complet' : 'Paiement partiel');
    if (typeof ASLDB !== 'undefined' && ASLDB.updateReservation) {
      ASLDB.updateReservation(id, { payments: payments, paid: newPaid, paymentStatus: payStatus, paymentMode: modeStr, collectedBy: collector });
    }
    if (typeof reloadData === 'function') reloadData();
    renderLLD();
    viewLLDContract(id);
    if (typeof showToast === 'function') showToast('Versement enregistré ✓');
  };

  /* Supprime un versement précis (correction d'erreur de saisie). */
  /* Recalcule la durée affichée quand les dates changent (info seule — le
     montant du contrat reste un champ libre, comme demandé). */
  window.lldSyncDays = function () {
    var s = document.getElementById('lld-start'), e = document.getElementById('lld-end'), d = document.getElementById('lld-days-display');
    if (!s || !e || !d || !s.value || !e.value) return;
    var days = Math.max(0, Math.round((new Date(e.value+'T00:00:00') - new Date(s.value+'T00:00:00')) / 86400000));
    d.value = days + ' jours';
  };

  /* ★ MISSION « FINI TOUT » (point 1) : enregistre les modifications du
     contrat LLD (client, téléphone, véhicule, dates, montant). Changer de
     véhicule bascule la disponibilité exactement comme pour une location
     normale (l'ancien redevient disponible, le nouveau devient occupé). */
  window.saveLLDContractInfo = function (id) {
    var c = lldRes().filter(function (x) { return x.id === id; })[0];
    if (!c) return;
    var newClient = (document.getElementById('lld-client')||{}).value || c.client;
    var newPhone = (document.getElementById('lld-phone')||{}).value || '';
    var newStart = (document.getElementById('lld-start')||{}).value || c.startDate;
    var newEnd = (document.getElementById('lld-end')||{}).value || c.endDate;
    var newAmount = parseFloat((document.getElementById('lld-amount')||{}).value);
    if (isNaN(newAmount)) newAmount = c.amount;
    var newDays = (newStart && newEnd) ? Math.max(1, Math.round((new Date(newEnd) - new Date(newStart)) / 86400000)) : c.days;
    var patch = { client: newClient, phone: newPhone, startDate: newStart, endDate: newEnd, days: newDays, amount: newAmount };

    var carSel = document.getElementById('lld-car');
    var newCarId = carSel ? parseInt(carSel.value, 10) : null;
    if (newCarId && String(newCarId) !== String(c.carId) && typeof ASLDB !== 'undefined') {
      var newCar = fleet().filter(function (x) { return String(x.id) === String(newCarId); })[0];
      if (c.carId && c.assignedPlate && typeof ASLDB.releaseUnit === 'function') { try { ASLDB.releaseUnit(c.carId, c.assignedPlate); } catch(e) {} }
      var newPlate = newCar ? (newCar.plate || '') : '';
      if (typeof ASLDB.setUnitStatusByPlate === 'function' && newPlate) { try { ASLDB.setUnitStatusByPlate(newCarId, newPlate, 'active'); } catch(e) {} }
      else if (typeof ASLDB.assignUnit === 'function') { try { ASLDB.assignUnit(newCarId, 'active'); } catch(e) {} }
      patch.carId = newCarId; patch.car = newCar ? newCar.name : (c.car||''); patch.assignedPlate = newPlate; patch.assignedColor = newCar ? (newCar.color||'') : '';
    }
    if (typeof ASLDB !== 'undefined' && ASLDB.updateReservation) ASLDB.updateReservation(id, patch);
    if (typeof reloadData === 'function') reloadData();
    renderLLD();
    viewLLDContract(id);
    if (typeof showToast === 'function') showToast('Contrat LLD mis à jour ✓');
  };

  window.deleteLLDPaymentEntry = function (id, idx) {
    var c = lldRes().filter(function (x) { return x.id === id; })[0];
    if (!c) return;
    if (!confirm('Supprimer ce versement ?')) return;
    var payments = (c.payments || []).slice();
    payments.splice(idx, 1);
    var newPaid = payments.reduce(function (s, p) { return s + (Number(p.amount) || 0); }, 0);
    var payStatus = newPaid <= 0 ? 'Non payé' : (newPaid >= (Number(c.amount)||0) ? 'Paiement complet' : 'Paiement partiel');
    if (typeof ASLDB !== 'undefined' && ASLDB.updateReservation) {
      ASLDB.updateReservation(id, { payments: payments, paid: newPaid, paymentStatus: payStatus });
    }
    if (typeof reloadData === 'function') reloadData();
    renderLLD();
    viewLLDContract(id);
    if (typeof showToast === 'function') showToast('Versement supprimé ✓');
  };
})();
