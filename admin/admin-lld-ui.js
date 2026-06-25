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

  window.renderLLD = function () {
    var host = document.getElementById('lld-list');
    if (!host) return;
    var q = ((document.getElementById('lld-search') && document.getElementById('lld-search').value) || '').toLowerCase().trim();
    var all = ASLLLD.list();
    if (q) {
      all = all.filter(function (c) {
        return (c.client || '').toLowerCase().indexOf(q) >= 0 || (carName(c.carId) || '').toLowerCase().indexOf(q) >= 0;
      });
    }
    if (!all.length) {
      host.innerHTML = '<div style="text-align:center;padding:40px;color:var(--text3);">Aucun contrat de location longue durée.<br>Cliquez sur « + Nouveau contrat LLD » pour commencer.</div>';
      return;
    }
    host.innerHTML = '<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(300px,1fr));gap:16px;">' + all.map(function (c) {
      var t = ASLLLD.totals(c);
      var statusColor = c.status === 'ended' ? '#9ca3af' : (t.rest > 0 ? '#d97706' : '#22c55e');
      var statusLabel = c.status === 'ended' ? 'Terminé' : (t.rest > 0 ? 'En cours' : 'À jour');
      return '<div class="fleet-card" style="cursor:pointer;" onclick="viewLLDContract(\'' + c.id + '\')">'
        + '<div style="padding:16px;">'
        + '<div style="display:flex;justify-content:space-between;align-items:flex-start;gap:10px;">'
        + '<div><div style="font-weight:800;font-size:15px;">' + esc(c.client || 'Client') + '</div>'
        + '<div style="font-size:12.5px;color:var(--text2);margin-top:2px;">' + esc(carName(c.carId)) + (carPlate(c.carId) ? ' · ' + esc(carPlate(c.carId)) : '') + '</div></div>'
        + '<span class="badge" style="background:' + statusColor + '22;color:' + statusColor + ';white-space:nowrap;">● ' + statusLabel + '</span></div>'
        + '<div style="display:flex;gap:8px 18px;flex-wrap:wrap;margin-top:12px;font-size:12.5px;">'
        + '<div><span style="color:var(--text3);">Début</span><br><b>' + esc(c.startDate || '—') + '</b></div>'
        + '<div><span style="color:var(--text3);">Durée</span><br><b>' + (c.durationMonths || 0) + ' mois</b></div>'
        + '<div><span style="color:var(--text3);">Mensualité</span><br><b>' + money(c.monthlyAmount) + '</b></div>'
        + '<div><span style="color:var(--text3);">Reste</span><br><b style="color:' + (t.rest > 0 ? '#C41E3A' : '#22c55e') + ';">' + money(t.rest) + '</b></div>'
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
    var c = ASLLLD.get(id);
    if (!c) return;
    if (!confirm('Supprimer ce contrat LLD ?\nLe véhicule redeviendra disponible sur le site client.')) return;
    // Libérer le véhicule
    try {
      if (c.carId && ASLDB.updateVehicle) ASLDB.updateVehicle(c.carId, { status: 'available', lldContractId: null });
    } catch (e) {}
    ASLLLD.remove(id);
    if (typeof reloadData === 'function') reloadData();
    if (typeof renderFleetPage === 'function') renderFleetPage();
    if (typeof renderAvailability === 'function') renderAvailability();
    if (typeof closeModal === 'function') closeModal();
    renderLLD();
    if (typeof showToast === 'function') showToast('Contrat supprimé — véhicule de nouveau disponible ✓');
  };

  /* Fiche détaillée : échéancier mois par mois + paiements + reste. */
  window.viewLLDContract = function (id) {
    var c = ASLLLD.get(id);
    if (!c) return;
    var t = ASLLLD.totals(c);
    var body = document.getElementById('modal-body');
    var title = document.getElementById('modal-title');
    var footer = document.getElementById('modal-footer');
    if (title) title.textContent = 'Contrat LLD — ' + (c.client || '');
    var rows = t.months.map(function (m) {
      var col = m.status === 'paid' ? '#22c55e' : (m.status === 'partial' ? '#d97706' : '#9ca3af');
      var lbl = m.status === 'paid' ? 'Payé' : (m.status === 'partial' ? 'Partiel' : 'En attente');
      return '<tr style="border-bottom:1px solid var(--border);">'
        + '<td style="padding:8px 6px;text-transform:capitalize;">' + esc(m.label) + '</td>'
        + '<td style="padding:8px 6px;">' + money(m.due) + '</td>'
        + '<td style="padding:8px 6px;color:#16a34a;">' + money(m.paid) + '</td>'
        + '<td style="padding:8px 6px;color:' + (m.rest > 0 ? '#C41E3A' : '#16a34a') + ';">' + money(m.rest) + '</td>'
        + '<td style="padding:8px 6px;"><span style="color:' + col + ';font-weight:600;font-size:12px;">● ' + lbl + '</span></td>'
        + '<td style="padding:8px 6px;">' + (m.rest > 0 ? '<button class="btn-sm primary" onclick="addLLDPayment(\'' + c.id + '\',' + m.index + ')">Encaisser</button>' : '✓') + '</td>'
        + '</tr>';
    }).join('');
    body.innerHTML =
      '<div style="display:flex;gap:8px 20px;flex-wrap:wrap;margin-bottom:16px;font-size:13px;">'
      + '<div><span style="color:var(--text3);">Véhicule</span><br><b>' + esc(carName(c.carId)) + (carPlate(c.carId) ? ' (' + esc(carPlate(c.carId)) + ')' : '') + '</b></div>'
      + '<div><span style="color:var(--text3);">Début</span><br><b>' + esc(c.startDate || '—') + '</b></div>'
      + '<div><span style="color:var(--text3);">Durée</span><br><b>' + (c.durationMonths || 0) + ' mois</b></div>'
      + '<div><span style="color:var(--text3);">Mensualité</span><br><b>' + money(c.monthlyAmount) + '</b></div>'
      + (c.phone ? '<div><span style="color:var(--text3);">Téléphone</span><br><b>' + esc(c.phone) + '</b></div>' : '')
      + '</div>'
      + '<div style="display:flex;gap:8px 20px;flex-wrap:wrap;margin-bottom:16px;padding:12px;background:rgba(18,22,30,.03);border-radius:10px;font-size:13px;">'
      + '<div><span style="color:var(--text3);">Total dû</span><br><b>' + money(t.totalDue) + '</b></div>'
      + '<div><span style="color:var(--text3);">Total encaissé</span><br><b style="color:#16a34a;">' + money(t.totalPaid) + '</b></div>'
      + '<div><span style="color:var(--text3);">Reste à payer</span><br><b style="color:' + (t.rest > 0 ? '#C41E3A' : '#16a34a') + ';">' + money(t.rest) + '</b></div>'
      + '</div>'
      + '<div style="font-weight:700;margin-bottom:8px;">Suivi mois par mois</div>'
      + '<div style="overflow-x:auto;"><table style="width:100%;border-collapse:collapse;font-size:13px;min-width:480px;">'
      + '<thead><tr style="text-align:left;color:var(--text3);font-size:12px;">'
      + '<th style="padding:6px;">Mois</th><th style="padding:6px;">Dû</th><th style="padding:6px;">Payé</th><th style="padding:6px;">Reste</th><th style="padding:6px;">Statut</th><th style="padding:6px;"></th></tr></thead>'
      + '<tbody>' + rows + '</tbody></table></div>';
    if (footer) {
      footer.style.display = 'flex';
      footer.innerHTML = '<button class="topbar-btn" onclick="closeModal()">Fermer</button>'
        + '<button class="topbar-btn" onclick="openLLDModal(\'' + c.id + '\')">Modifier le contrat</button>'
        + (c.phone ? '<a class="topbar-btn primary" style="text-decoration:none;" href="https://wa.me/' + esc(c.phone.replace(/[^0-9]/g, '')) + '" target="_blank">WhatsApp</a>' : '');
    }
    // Ouvre l'overlay SANS passer par openModal() : ce module a son propre pied
    // de page (boutons specifiques). openModal() restaurerait le pied de page
    // standard et ecraserait ces boutons.
    var _ov = document.getElementById('modal-overlay'); if (_ov) _ov.classList.add('open');
  };

  window.addLLDPayment = function (id, monthIndex) {
    var c = ASLLLD.get(id);
    if (!c) return;
    var sch = ASLLLD.schedule(c)[monthIndex];
    if (!sch) return;
    var def = sch.rest;
    var val = prompt('Montant encaissé pour ' + sch.label + ' (reste ' + (Number(sch.rest)).toLocaleString('fr-FR') + ' MAD) :', String(def));
    if (val == null) return;
    var amount = parseFloat(val) || 0;
    if (amount <= 0) return;
    var payments = (c.payments || []).slice();
    payments.push({ monthIndex: monthIndex, amount: amount, date: new Date().toISOString().slice(0, 10) });
    ASLLLD.update(id, { payments: payments });
    if (typeof reloadData === 'function') reloadData();
    viewLLDContract(id);
    if (typeof showToast === 'function') showToast('Paiement enregistré ✓');
  };
})();
