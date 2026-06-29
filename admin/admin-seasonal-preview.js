/* ============================================================
   ALL STAR LOC — Aperçu tarifs saisonniers (par véhicule)
   Consulter et modifier rapidement les tarifs saisonniers d'UNE
   voiture, regroupés par mois ayant les mêmes tranches. La
   modification se synchronise avec car.seasonalTiers (même source
   que « Gérer les tranches saisonnières ») → visible partout et
   appliquée au calcul des réservations.
   ============================================================ */
(function () {
  'use strict';

  var MONTHS = ['', 'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin', 'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'];

  function fleet() { try { return (ASLDB.getFleet && ASLDB.getFleet()) || []; } catch (e) { return []; } }
  function esc(s) { return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }

  // Signature d'un mois = ses tranches (min-max:prix) triées, pour regrouper
  // les mois identiques.
  function monthSignature(tiers, month) {
    var rows = tiers.filter(function (t) { return Number(t.month) === month && t.active !== false; })
      .map(function (t) { return [Number(t.minDays) || 1, Number(t.maxDays) || 9999, Number(t.pricePerDay) || 0]; })
      .sort(function (a, b) { return a[0] - b[0]; });
    return JSON.stringify(rows);
  }

  function groupMonths(tiers) {
    // Regrouper les mois consécutifs/identiques par signature
    var groups = [];
    var bySig = {};
    for (var m = 1; m <= 12; m++) {
      var sig = monthSignature(tiers, m);
      if (sig === '[]') { // mois sans tarif
        sig = '__EMPTY__';
      }
      if (!bySig[sig]) { bySig[sig] = { months: [], sig: sig }; groups.push(bySig[sig]); }
      bySig[sig].months.push(m);
    }
    return groups;
  }

  function tierRowsForMonth(tiers, month) {
    return tiers.filter(function (t) { return Number(t.month) === month && t.active !== false; })
      .sort(function (a, b) { return (Number(a.minDays) || 1) - (Number(b.minDays) || 1); });
  }

  window.openSeasonalPreview = function () {
    // Ouvrir d'abord la modale (réinitialise pied + titre), PUIS injecter notre
    // contenu pour qu'il ne soit pas écrasé par openModal.
    if (typeof openModal === 'function') openModal('seasonal-preview');
    else { var ov = document.getElementById('modal-overlay'); if (ov) ov.classList.add('open'); }
    var body = document.getElementById('modal-body');
    var title = document.getElementById('modal-title');
    var footer = document.getElementById('modal-footer');
    if (!body) return;
    if (title) title.textContent = 'Aperçu tarifs saisonniers';
    var cars = fleet();
    var opts = '<option value="">— Choisissez votre voiture —</option>' + cars.map(function (c) {
      return '<option value="' + c.id + '">' + esc(c.name) + (c.plate ? ' (' + esc(c.plate) + ')' : '') + '</option>';
    }).join('');
    body.innerHTML =
      '<div class="form-group"><label class="form-label">Choisissez votre voiture</label>'
      + '<select class="form-select" id="sp-car" onchange="renderSeasonalPreview()">' + opts + '</select></div>'
      + '<div id="sp-content" style="margin-top:8px;"></div>';
    if (footer) {
      footer.style.display = 'flex';
      footer.innerHTML = '<button class="topbar-btn secondary" onclick="closeModal()">Fermer</button>';
    }
  };

  window.renderSeasonalPreview = function () {
    var sel = document.getElementById('sp-car');
    var host = document.getElementById('sp-content');
    if (!sel || !host) return;
    var id = parseInt(sel.value);
    if (!id) { host.innerHTML = '<div style="color:var(--text3);text-align:center;padding:24px;">Sélectionnez une voiture pour voir ses tarifs saisonniers.</div>'; return; }
    var car = fleet().filter(function (c) { return c.id === id; })[0];
    if (!car) { host.innerHTML = ''; return; }
    var tiers = (typeof ASLDB !== 'undefined' && ASLDB.normalizeSeasonalTiers) ? ASLDB.normalizeSeasonalTiers(car.seasonalTiers || []) : (car.seasonalTiers || []);
    var groups = groupMonths(tiers);

    var html = '<div style="max-height:50vh;overflow-y:auto;-webkit-overflow-scrolling:touch;padding-right:4px;">';
    html += '<div style="font-weight:800;font-size:15px;margin-bottom:10px;">' + esc(car.name) + '</div>';

    groups.forEach(function (g) {
      var monthsLabel = g.months.map(function (m) { return MONTHS[m]; }).join(' / ');
      html += '<div style="border:1px solid var(--border);border-radius:10px;padding:12px;margin-bottom:10px;">';
      html += '<div style="font-weight:700;font-size:13.5px;color:var(--red);margin-bottom:8px;">' + monthsLabel + '</div>';
      if (g.sig === '__EMPTY__') {
        html += '<div style="color:var(--text3);font-size:13px;">Aucun tarif configuré</div>';
      } else {
        // Tranches du 1er mois du groupe (tous identiques par définition)
        var rows = tierRowsForMonth(tiers, g.months[0]);
        html += '<div style="display:flex;flex-direction:column;gap:6px;">';
        rows.forEach(function (t, idx) {
          var maxLabel = (t.maxDays >= 9999) ? (t.minDays + '+ jours') : (t.minDays + ' à ' + t.maxDays + ' jours');
          html += '<div style="display:flex;align-items:center;gap:8px;justify-content:space-between;font-size:13px;">'
            + '<span style="color:var(--text2);">' + maxLabel + '</span>'
            + '<span style="display:flex;align-items:center;gap:6px;">'
            + '<input type="number" min="0" value="' + (t.pricePerDay || 0) + '" '
            + 'data-months="' + g.months.join(',') + '" data-min="' + t.minDays + '" data-max="' + t.maxDays + '" '
            + 'class="sp-price-input" style="width:90px;padding:5px 8px;border:1px solid var(--border);border-radius:7px;font-size:13px;text-align:right;"> '
            + '<span style="color:var(--text3);font-size:12px;">MAD/j</span></span>'
            + '</div>';
        });
        html += '</div>';
      }
      html += '</div>';
    });
    html += '</div>';
    // Bouton enregistrer si au moins une tranche existe
    var hasTiers = tiers.length > 0;
    if (hasTiers) {
      html += '<button class="topbar-btn primary" style="width:100%;margin-top:6px;" onclick="saveSeasonalPreview(' + id + ')">Enregistrer les modifications</button>';
      html += '<div style="font-size:11px;color:var(--text3);margin-top:8px;text-align:center;">Les modifications se synchronisent avec « Gérer les tranches saisonnières » et s\'appliquent au calcul des réservations.</div>';
    } else {
      html += '<div style="font-size:12.5px;color:var(--text3);margin-top:6px;text-align:center;">Aucun tarif saisonnier configuré pour cette voiture. Utilisez « Gérer les tranches saisonnières » pour en ajouter.</div>';
    }
    host.innerHTML = html;
  };

  window.saveSeasonalPreview = function (id) {
    var car = fleet().filter(function (c) { return c.id === id; })[0];
    if (!car) return;
    var inputs = document.querySelectorAll('.sp-price-input');
    // Reconstruire seasonalTiers à partir des valeurs modifiées
    var existing = (typeof ASLDB !== 'undefined' && ASLDB.normalizeSeasonalTiers) ? ASLDB.normalizeSeasonalTiers(car.seasonalTiers || []) : (car.seasonalTiers || []).slice();
    // Map (month|min|max) → nouveau prix
    var priceMap = {};
    inputs.forEach(function (inp) {
      var months = (inp.getAttribute('data-months') || '').split(',').map(function (x) { return parseInt(x); });
      var min = parseInt(inp.getAttribute('data-min'));
      var max = parseInt(inp.getAttribute('data-max'));
      var price = Math.max(0, parseFloat(inp.value) || 0);
      months.forEach(function (m) { priceMap[m + '|' + min + '|' + max] = price; });
    });
    var updated = existing.map(function (t) {
      var key = Number(t.month) + '|' + (Number(t.minDays) || 1) + '|' + (Number(t.maxDays) || 9999);
      if (priceMap.hasOwnProperty(key)) { var nt = {}; for (var k in t) nt[k] = t[k]; nt.pricePerDay = priceMap[key]; return nt; }
      return t;
    });
    // Sauvegarder sur le véhicule (même champ que Gérer les tranches)
    try {
      if (ASLDB.updateVehicle) ASLDB.updateVehicle(id, { seasonalTiers: updated });
    } catch (e) {}
    if (typeof reloadData === 'function') reloadData();
    if (typeof renderFleetPage === 'function') renderFleetPage();
    if (typeof showToast === 'function') showToast('Tarifs saisonniers mis à jour ✓ Synchronisé.');
    renderSeasonalPreview();
  };
})();
