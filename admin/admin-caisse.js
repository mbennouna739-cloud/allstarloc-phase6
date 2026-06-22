/* ============================================================
   ALL STAR LOC — Module CAISSE
   Vision financière simple, branchée sur les données EXISTANTES.
   Aucune redondance : lit les réservations/locations (amount, paid)
   pour les encaissements et les montants à encaisser ; les impayés
   renvoient au module existant. Seules les CHARGES sont stockées ici.
   Stockage charges : asl_charges_v1
   ============================================================ */
(function () {
  'use strict';

  var CHARGES_KEY = 'asl_charges_v1';

  var CHARGE_CATEGORIES = ['Carburant','Lavage','Vidange','Pneus','Réparation','Entretien','Assurance','Parking','Amende','Accessoire','Autre'];

  function money(n) {
    n = Math.round(Number(n) || 0);
    return n.toLocaleString('fr-FR').replace(/\u202f/g, ' ') + ' MAD';
  }

  function readCharges() {
    try { return JSON.parse(localStorage.getItem(CHARGES_KEY) || '[]'); } catch (e) { return []; }
  }
  function writeCharges(list) {
    try { localStorage.setItem(CHARGES_KEY, JSON.stringify(list)); } catch (e) {}
  }

  /* Récupère toutes les réservations/locations via la base partagée. */
  function allReservations() {
    try {
      if (typeof ASLDB !== 'undefined' && ASLDB.getReservations) return ASLDB.getReservations() || [];
    } catch (e) {}
    try { return JSON.parse(localStorage.getItem('asl_reservations_v1') || '[]'); } catch (e) { return []; }
  }

  /* ---- Calculs financiers (source unique : amount / paid) ---- */
  function computeTotals(fromTs, toTs) {
    var res = allReservations();
    var encaisse = 0, aEncaisser = 0;
    res.forEach(function (r) {
      if (r.status === 'cancelled') return;
      var amount = Number(r.amount) || 0;
      var paid = Number(r.paid) || 0;
      var reste = Math.max(0, amount - paid);
      // Filtre période (sur la date de réservation/prise en charge si fournie)
      if (fromTs || toTs) {
        var d = _resDate(r);
        if (d != null) {
          if (fromTs && d < fromTs) return;
          if (toTs && d > toTs) return;
        }
      }
      encaisse += paid;
      aEncaisser += reste;
    });

    var charges = 0;
    readCharges().forEach(function (c) {
      if (c.status === 'pending') return; // charge en attente : hors caisse réelle
      if (fromTs || toTs) {
        var d = c.date ? new Date(c.date).getTime() : null;
        if (d != null) {
          if (fromTs && d < fromTs) return;
          if (toTs && d > toTs) return;
        }
      }
      charges += Number(c.amount) || 0;
    });

    return {
      encaisse: encaisse,
      charges: charges,
      soldeReel: encaisse - charges,
      aEncaisser: aEncaisser,
      soldeEstime: encaisse + aEncaisser - charges
    };
  }

  function _resDate(r) {
    var s = r.startDate || r.createdAt || r.date;
    if (!s) return null;
    var t = new Date(s).getTime();
    return isNaN(t) ? null : t;
  }

  /* ---- RÉSUMÉ ---- */
  function renderResume() {
    var t = computeTotals();
    setTxt('cs-encaisse', money(t.encaisse));
    setTxt('cs-charges', money(t.charges));
    setTxt('cs-solde-reel', money(t.soldeReel));
    setTxt('cs-aencaisser', money(t.aEncaisser));
    setTxt('cs-solde-estime', money(t.soldeEstime));
    setTxt('cs-inline-enc', money(t.encaisse));
    setTxt('cs-inline-chg', money(t.charges));
    setTxt('cs-inline-reel', money(t.soldeReel));
    setTxt('cs-inline-rest', money(t.aEncaisser));
  }

  function setTxt(id, v) { var e = document.getElementById(id); if (e) e.textContent = v; }

  /* ---- CHARGES ---- */
  function renderChargesList() {
    var list = readCharges().slice().sort(function (a, b) {
      return new Date(b.date || 0) - new Date(a.date || 0);
    });
    var tbody = document.getElementById('charges-tbody');
    var empty = document.getElementById('charges-empty');
    if (!tbody) return;
    var total = list.reduce(function (s, c) { return s + (Number(c.amount) || 0); }, 0);
    setTxt('cs-charges-total', money(total));
    if (!list.length) { tbody.innerHTML = ''; if (empty) empty.style.display = 'block'; return; }
    if (empty) empty.style.display = 'none';
    tbody.innerHTML = list.map(function (c) {
      var d = c.date ? new Date(c.date).toLocaleDateString('fr-FR') : '—';
      var photo = c.photo ? '<a href="' + c.photo + '" target="_blank" style="color:#2563eb;">📎 Voir</a>' : '—';
      var statusBadge = (c.status === 'pending')
        ? '<span style="font-size:11px;color:#d97706;background:#fef3c7;padding:2px 8px;border-radius:20px;">En attente</span>'
        : '<span style="font-size:11px;color:#16a34a;background:#dcfce7;padding:2px 8px;border-radius:20px;">Payée</span>';
      return '<tr>'
        + '<td>' + d + '</td>'
        + '<td>' + esc(c.vehicle || '—') + '</td>'
        + '<td><span style="font-size:12px;background:#f3f4f6;padding:3px 9px;border-radius:20px;">' + esc(c.category || 'Autre') + '</span></td>'
        + '<td style="color:#667;">' + esc(c.description || '') + ' ' + statusBadge + '</td>'
        + '<td><strong style="color:#dc2626;">' + money(c.amount) + '</strong></td>'
        + '<td>' + photo + '</td>'
        + '<td><button onclick="openChargeModal(\'' + c.id + '\')" style="background:none;border:none;color:#2563eb;cursor:pointer;font-size:13px;margin-right:6px;">Modif.</button><button onclick="deleteCharge(\'' + c.id + '\')" style="background:none;border:none;color:#dc2626;cursor:pointer;font-size:13px;">Suppr.</button></td>'
        + '</tr>';
    }).join('');
  }

  function esc(s) { return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }

  /* Liste des véhicules pour le menu déroulant. */
  function fleetOptions(selected) {
    var fleet = [];
    try { if (typeof ASLDB !== 'undefined' && ASLDB.getFleet) fleet = ASLDB.getFleet() || []; } catch (e) {}
    var opts = '<option value="">— Aucun / général —</option>';
    fleet.forEach(function (v) {
      var name = v.name || v.model || ('Véhicule ' + v.id);
      opts += '<option' + (selected === name ? ' selected' : '') + '>' + esc(name) + '</option>';
    });
    return opts;
  }

  window.openChargeModal = function (id) {
    var list = readCharges();
    var c = id ? list.filter(function (x) { return x.id === id; })[0] : null;
    var today = new Date().toISOString().slice(0, 10);
    var host = document.getElementById('charge-modal-host');
    if (!host) { host = document.createElement('div'); host.id = 'charge-modal-host'; document.body.appendChild(host); }
    var catOpts = CHARGE_CATEGORIES.map(function (cat) {
      return '<option' + (c && c.category === cat ? ' selected' : '') + '>' + cat + '</option>';
    }).join('');
    host.innerHTML =
      '<div style="position:fixed;inset:0;background:rgba(10,12,18,.5);z-index:7000;display:flex;align-items:center;justify-content:center;padding:16px;" onclick="if(event.target===this)closeChargeModal()">'
      + '<div style="background:#fff;border-radius:16px;max-width:460px;width:100%;max-height:90vh;overflow-y:auto;box-shadow:0 24px 60px rgba(0,0,0,.25);">'
      + '<div style="padding:18px 20px;border-bottom:1px solid #eee;display:flex;align-items:center;justify-content:space-between;">'
      + '<strong style="font-size:16px;">' + (c ? 'Modifier la charge' : 'Nouvelle charge') + '</strong>'
      + '<button onclick="closeChargeModal()" style="background:none;border:none;font-size:20px;cursor:pointer;color:#999;">&#10005;</button></div>'
      + '<div style="padding:20px;display:flex;flex-direction:column;gap:14px;">'
      + fg('Date', '<input type="date" id="chg-date" class="form-input" value="' + (c && c.date ? c.date.slice(0,10) : today) + '">')
      + fg('Véhicule concerné', '<select id="chg-vehicle" class="form-input">' + fleetOptions(c && c.vehicle) + '</select>')
      + fg('Catégorie', '<select id="chg-category" class="form-input">' + catOpts + '</select>')
      + fg('Montant (MAD)', '<input type="number" id="chg-amount" class="form-input" min="0" step="0.01" value="' + (c ? c.amount : '') + '" placeholder="0">')
      + fg('Statut', '<select id="chg-status" class="form-input"><option value="paid"' + (!c || c.status !== 'pending' ? ' selected' : '') + '>Payée (entre dans la caisse)</option><option value="pending"' + (c && c.status === 'pending' ? ' selected' : '') + '>En attente (hors caisse réelle)</option></select>')
      + fg('Description', '<input type="text" id="chg-desc" class="form-input" value="' + (c ? esc(c.description) : '') + '" placeholder="Ex : plein gasoil station Shell">')
      + fg('Photo facture (optionnel)', '<input type="file" id="chg-photo-file" accept="image/*" class="form-input" onchange="chargePhotoPreview(this)"><div id="chg-photo-prev" style="margin-top:6px;">' + (c && c.photo ? '<img src="' + c.photo + '" style="max-height:60px;border-radius:6px;">' : '') + '</div>')
      + '</div>'
      + '<div style="padding:16px 20px;border-top:1px solid #eee;display:flex;gap:10px;justify-content:flex-end;">'
      + '<button onclick="closeChargeModal()" style="padding:10px 18px;border:1px solid #ddd;background:#fff;border-radius:8px;cursor:pointer;">Annuler</button>'
      + '<button onclick="saveCharge(' + (id ? '\'' + id + '\'' : 'null') + ')" style="padding:10px 18px;border:none;background:#C41E3A;color:#fff;border-radius:8px;cursor:pointer;font-weight:600;">Enregistrer</button>'
      + '</div></div></div>';
    // mémoriser la photo existante
    window._chargePhotoData = (c && c.photo) || '';
  };

  function fg(label, field) {
    return '<div><label style="display:block;font-size:13px;font-weight:600;margin-bottom:5px;color:#374151;">' + label + '</label>' + field + '</div>';
  }

  window.chargePhotoPreview = function (input) {
    var file = input && input.files && input.files[0];
    if (!file) return;
    if (file.size > 3 * 1024 * 1024) { alert('Photo trop lourde (max 3 Mo).'); input.value = ''; return; }
    var reader = new FileReader();
    reader.onload = function () {
      window._chargePhotoData = reader.result;
      var prev = document.getElementById('chg-photo-prev');
      if (prev) prev.innerHTML = '<img src="' + reader.result + '" style="max-height:60px;border-radius:6px;">';
    };
    reader.readAsDataURL(file);
  };

  window.closeChargeModal = function () {
    var host = document.getElementById('charge-modal-host');
    if (host) host.innerHTML = '';
    window._chargePhotoData = '';
  };

  window.saveCharge = function (id) {
    var amount = parseFloat(document.getElementById('chg-amount').value) || 0;
    if (amount <= 0) { alert('Le montant doit être supérieur à 0.'); return; }
    var list = readCharges();
    var item = {
      id: id || ('chg' + Date.now()),
      date: document.getElementById('chg-date').value || new Date().toISOString().slice(0, 10),
      vehicle: document.getElementById('chg-vehicle').value || '',
      category: document.getElementById('chg-category').value || 'Autre',
      amount: amount,
      status: (document.getElementById('chg-status') ? document.getElementById('chg-status').value : 'paid'),
      description: document.getElementById('chg-desc').value || '',
      photo: window._chargePhotoData || ''
    };
    if (id) {
      var i = list.findIndex(function (x) { return x.id === id; });
      if (i >= 0) list[i] = item; else list.push(item);
    } else {
      list.push(item);
    }
    writeCharges(list);
    closeChargeModal();
    renderChargesList();
    renderResume();
    if (typeof toast === 'function') toast('Charge enregistrée', 'g');
  };

  window.deleteCharge = function (id) {
    if (!confirm('Supprimer cette charge ?')) return;
    writeCharges(readCharges().filter(function (c) { return c.id !== id; }));
    renderChargesList();
    renderResume();
    if (typeof toast === 'function') toast('Charge supprimée', 'g');
  };

  /* ---- Ouvre le module Impayés EXISTANT (aucun doublon) ---- */
  window.caisseOpenUnpaid = function () {
    if (typeof openDashDrawer === 'function') { openDashDrawer('unpaid'); return; }
    // Repli : aller à la page Paiements
    if (typeof showPage === 'function') {
      var el = document.querySelector('.sb-item[onclick*="payments"]');
      showPage('payments', el);
    }
  };

  /* ---- Sous-onglets ---- */
  window.caisseTab = function (tab, btn) {
    // Permissions : charges / rapports peuvent être restreints
    if (typeof window.ASL_HAS_PERM === 'function' && window.ASL_IS_EMPLOYEE) {
      if (tab === 'charges' && !window.ASL_HAS_PERM('charges')) { if (window.ASL_showDenied) window.ASL_showDenied(); return; }
      if (tab === 'rapports' && !window.ASL_HAS_PERM('reports')) { if (window.ASL_showDenied) window.ASL_showDenied(); return; }
    }
    document.querySelectorAll('.caisse-tab').forEach(function (b) { b.classList.toggle('active', b.getAttribute('data-ctab') === tab); });
    document.querySelectorAll('.caisse-sub').forEach(function (s) { s.style.display = 'none'; });
    var el = document.getElementById('caisse-' + tab);
    if (el) el.style.display = 'block';
    if (tab === 'resume') renderResume();
    if (tab === 'charges') renderChargesList();
    if (tab === 'rapports') { glSetPeriod('month', document.querySelector('.rep-period[data-period="month"]')); }
  };

  /* ============================================================
     GRAND LIVRE DE CAISSE (onglet Rapports)
     Construit la liste chronologique des mouvements réels :
       • ENTRÉES  = paiements encaissés (paid > 0) des réservations/
                    locations (manuelles, site, confirmées).
       • SORTIES  = charges PAYÉES (status != 'pending').
     Solde progressif. Filtres période / type / mode / catégorie /
     véhicule. Les montants à encaisser restent SÉPARÉS du solde.
     ============================================================ */

  var _glPeriod = 'month';

  function periodRange(period) {
    var now = new Date();
    var from = null, to = null;
    if (period === 'today') {
      from = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
      to = from + 24 * 3600 * 1000 - 1;
    } else if (period === 'week') {
      var day = (now.getDay() + 6) % 7;
      var monday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - day);
      from = monday.getTime();
      to = from + 7 * 24 * 3600 * 1000 - 1;
    } else if (period === 'month') {
      from = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
      to = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59).getTime();
    } else if (period === 'custom') {
      var f = document.getElementById('gl-from') ? document.getElementById('gl-from').value : '';
      var t = document.getElementById('gl-to') ? document.getElementById('gl-to').value : '';
      from = f ? new Date(f).getTime() : null;
      to = t ? new Date(t + 'T23:59:59').getTime() : null;
    }
    return { from: from, to: to };
  }

  function _periodLabelText(period) {
    if (period === 'today') return "Aujourd'hui";
    if (period === 'week') return 'Cette semaine';
    if (period === 'month') return 'Ce mois';
    if (period === 'all') return 'Tout l\'historique';
    if (period === 'custom') {
      var f = document.getElementById('gl-from') ? document.getElementById('gl-from').value : '';
      var t = document.getElementById('gl-to') ? document.getElementById('gl-to').value : '';
      return (f || '…') + ' → ' + (t || '…');
    }
    return '';
  }

  window.glSetPeriod = function (period, btn) {
    _glPeriod = period;
    document.querySelectorAll('.rep-period').forEach(function (b) { b.classList.toggle('active', b.getAttribute('data-period') === period); });
    var box = document.getElementById('gl-custom-range');
    if (box) box.style.display = (period === 'custom') ? 'flex' : 'none';
    renderGrandLivre();
  };

  /* Remplit les listes déroulantes de filtres (mode, catégorie, véhicule). */
  function _fillGlFilters() {
    // Modes de paiement présents dans les réservations
    var modes = {};
    allReservations().forEach(function (r) { if (r.paymentMode) modes[r.paymentMode] = 1; });
    var modeSel = document.getElementById('gl-mode');
    if (modeSel && modeSel.options.length <= 1) {
      Object.keys(modes).forEach(function (m) {
        var o = document.createElement('option'); o.value = m; o.textContent = m; modeSel.appendChild(o);
      });
    }
    // Catégories de charges
    var catSel = document.getElementById('gl-cat');
    if (catSel && catSel.options.length <= 1) {
      CHARGE_CATEGORIES.forEach(function (c) {
        var o = document.createElement('option'); o.value = c; o.textContent = c; catSel.appendChild(o);
      });
    }
    // Véhicules
    var vSel = document.getElementById('gl-vehicle');
    if (vSel && vSel.options.length <= 1) {
      var fleet = [];
      try { if (typeof ASLDB !== 'undefined' && ASLDB.getFleet) fleet = ASLDB.getFleet() || []; } catch (e) {}
      fleet.forEach(function (v) {
        var name = v.name || v.model || ('Véhicule ' + v.id);
        var o = document.createElement('option'); o.value = name; o.textContent = name; vSel.appendChild(o);
      });
    }
  }

  /* Construit la liste des mouvements selon les filtres. */
  function buildMovements() {
    var range = (_glPeriod === 'all') ? { from: null, to: null } : periodRange(_glPeriod);
    var fType = (document.getElementById('gl-type') || {}).value || '';
    var fMode = (document.getElementById('gl-mode') || {}).value || '';
    var fCat = (document.getElementById('gl-cat') || {}).value || '';
    var fVeh = (document.getElementById('gl-vehicle') || {}).value || '';

    var inRange = function (ts) {
      if (ts == null) return true;
      if (range.from && ts < range.from) return false;
      if (range.to && ts > range.to) return false;
      return true;
    };

    var moves = [];

    // ENTRÉES : paiements encaissés
    if (fType === '' || fType === 'Paiement') {
      allReservations().forEach(function (r) {
        if (r.status === 'cancelled') return;
        var paid = Number(r.paid) || 0;
        if (paid <= 0) return; // uniquement ce qui est réellement encaissé
        if (fVeh && (r.car || '') !== fVeh) return;
        if (fMode && (r.paymentMode || '') !== fMode) return;
        if (fCat) return; // les paiements n'ont pas de catégorie de charge
        var ts = _resDate(r);
        if (!inRange(ts)) return;
        moves.push({
          ts: ts || 0,
          date: r.startDate || r.createdAt || '',
          type: 'Paiement',
          label: 'Encaissement ' + (r.contractRef || r.id || ''),
          party: r.client || '',
          vehicle: r.car || '',
          category: '',
          mode: r.paymentMode || '',
          entree: paid,
          sortie: 0
        });
      });
    }

    // SORTIES : charges payées
    if (fType === '' || fType === 'Charge') {
      readCharges().forEach(function (c) {
        if (c.status === 'pending') return; // hors caisse réelle
        if (fVeh && (c.vehicle || '') !== fVeh) return;
        if (fCat && (c.category || '') !== fCat) return;
        if (fMode) return; // charges sans mode de paiement
        var ts = c.date ? new Date(c.date).getTime() : null;
        if (!inRange(ts)) return;
        moves.push({
          ts: ts || 0,
          date: c.date || '',
          type: 'Charge',
          label: c.description || c.category || 'Charge',
          party: 'Fournisseur',
          vehicle: c.vehicle || '',
          category: c.category || '',
          mode: '',
          entree: 0,
          sortie: Number(c.amount) || 0
        });
      });
    }

    // Tri chronologique + solde progressif
    moves.sort(function (a, b) { return a.ts - b.ts; });
    var solde = 0;
    moves.forEach(function (m) { solde += m.entree - m.sortie; m.solde = solde; });
    return moves;
  }

  /* Montants à encaisser (séparés) selon le filtre véhicule. */
  function computeRestForVehicle(fVeh) {
    var rest = 0;
    allReservations().forEach(function (r) {
      if (r.status === 'cancelled') return;
      if (fVeh && (r.car || '') !== fVeh) return;
      rest += Math.max(0, (Number(r.amount) || 0) - (Number(r.paid) || 0));
    });
    return rest;
  }

  window.renderGrandLivre = function () {
    _fillGlFilters();
    var moves = buildMovements();
    var fVeh = (document.getElementById('gl-vehicle') || {}).value || '';

    var totalIn = moves.reduce(function (s, m) { return s + m.entree; }, 0);
    var totalOut = moves.reduce(function (s, m) { return s + m.sortie; }, 0);
    var rest = computeRestForVehicle(fVeh);

    setTxt('gl-total-in', money(totalIn));
    setTxt('gl-total-out', money(totalOut));
    setTxt('gl-total-solde', money(totalIn - totalOut));
    setTxt('gl-total-rest', money(rest));
    setTxt('gl-period-label', 'Période : ' + _periodLabelText(_glPeriod));

    // Fiche financière véhicule
    var card = document.getElementById('gl-vehicle-card');
    if (card) {
      if (fVeh) {
        var fleet = [];
        try { if (typeof ASLDB !== 'undefined' && ASLDB.getFleet) fleet = ASLDB.getFleet() || []; } catch (e) {}
        var v = fleet.filter(function (x) { return (x.name || x.model) === fVeh; })[0] || {};
        var nbLoc = {};
        allReservations().forEach(function (r) {
          if (r.status === 'cancelled') return;
          if ((r.car || '') === fVeh && (Number(r.paid) || 0) > 0) nbLoc[r.contractRef || r.id] = 1;
        });
        card.style.display = 'block';
        card.innerHTML =
          '<div style="font-weight:800;font-size:15px;color:#1a1a2e;margin-bottom:4px;">🚗 ' + esc(fVeh) + '</div>'
          + '<div style="font-size:12px;color:#667;margin-bottom:12px;">Immatriculation : ' + esc(v.plate || v.immat || '—') + '</div>'
          + '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(120px,1fr));gap:10px;">'
          + _fcell('Total encaissé', money(totalIn), '#16a34a')
          + _fcell('Total charges', money(totalOut), '#dc2626')
          + _fcell('Solde réel', money(totalIn - totalOut), '#1a1a2e')
          + _fcell('À encaisser', money(rest), '#d97706')
          + _fcell('Locations', String(Object.keys(nbLoc).length), '#4f46e5')
          + '</div>';
      } else {
        card.style.display = 'none';
      }
    }

    // Tableau
    var tbody = document.getElementById('gl-tbody');
    var empty = document.getElementById('gl-empty');
    if (!tbody) return;
    if (!moves.length) { tbody.innerHTML = ''; if (empty) empty.style.display = 'block'; return; }
    if (empty) empty.style.display = 'none';
    tbody.innerHTML = moves.map(function (m) {
      var d = m.date ? new Date(m.date).toLocaleDateString('fr-FR') : '—';
      var typeBadge = (m.type === 'Paiement')
        ? '<span style="font-size:11px;color:#16a34a;background:#dcfce7;padding:2px 8px;border-radius:20px;">Paiement</span>'
        : '<span style="font-size:11px;color:#dc2626;background:#fee2e2;padding:2px 8px;border-radius:20px;">Charge</span>';
      return '<tr>'
        + '<td>' + d + '</td>'
        + '<td>' + typeBadge + '</td>'
        + '<td>' + esc(m.label) + '</td>'
        + '<td>' + esc(m.party) + '</td>'
        + '<td>' + esc(m.vehicle || '—') + '</td>'
        + '<td>' + esc(m.category || '—') + '</td>'
        + '<td>' + esc(m.mode || '—') + '</td>'
        + '<td style="text-align:right;color:#16a34a;font-weight:600;">' + (m.entree ? money(m.entree) : '—') + '</td>'
        + '<td style="text-align:right;color:#dc2626;font-weight:600;">' + (m.sortie ? money(m.sortie) : '—') + '</td>'
        + '<td style="text-align:right;font-weight:700;">' + money(m.solde) + '</td>'
        + '</tr>';
    }).join('');
  };

  function _fcell(label, val, color) {
    return '<div style="background:#fafafa;border-radius:8px;padding:10px;"><div style="font-size:11px;color:#667;">' + label + '</div><div style="font-size:16px;font-weight:800;color:' + (color || '#1a1a2e') + ';">' + val + '</div></div>';
  }

  /* ---- EXPORTS Grand Livre ---- */
  function _glExportData() {
    var moves = buildMovements();
    var fVeh = (document.getElementById('gl-vehicle') || {}).value || '';
    var totalIn = moves.reduce(function (s, m) { return s + m.entree; }, 0);
    var totalOut = moves.reduce(function (s, m) { return s + m.sortie; }, 0);
    return {
      moves: moves, vehicle: fVeh,
      totalIn: totalIn, totalOut: totalOut,
      solde: totalIn - totalOut,
      rest: computeRestForVehicle(fVeh),
      period: _periodLabelText(_glPeriod),
      filters: _activeFiltersLabel()
    };
  }

  function _activeFiltersLabel() {
    var parts = [];
    var t = (document.getElementById('gl-type') || {}).value; if (t) parts.push('Type: ' + t);
    var m = (document.getElementById('gl-mode') || {}).value; if (m) parts.push('Mode: ' + m);
    var c = (document.getElementById('gl-cat') || {}).value; if (c) parts.push('Catégorie: ' + c);
    var v = (document.getElementById('gl-vehicle') || {}).value; if (v) parts.push('Véhicule: ' + v);
    return parts.length ? parts.join(' · ') : 'Aucun';
  }

  window.exportGrandLivreExcel = function () {
    var d = _glExportData();
    var rows = [];
    rows.push(['ALL STAR LOC — Grand Livre de Caisse']);
    rows.push(['Période', d.period]);
    rows.push(['Filtres', d.filters]);
    if (d.vehicle) rows.push(['Véhicule', d.vehicle]);
    rows.push([]);
    rows.push(['Date', 'Type', 'Libellé', 'Client/Fournisseur', 'Véhicule', 'Catégorie', 'Mode', 'Entrée', 'Sortie', 'Solde']);
    d.moves.forEach(function (m) {
      rows.push([
        m.date ? new Date(m.date).toLocaleDateString('fr-FR') : '',
        m.type, m.label, m.party, m.vehicle, m.category, m.mode,
        m.entree ? Math.round(m.entree) : '', m.sortie ? Math.round(m.sortie) : '', Math.round(m.solde)
      ]);
    });
    rows.push([]);
    rows.push(['Total entrées', Math.round(d.totalIn)]);
    rows.push(['Total sorties', Math.round(d.totalOut)]);
    rows.push(['Solde final', Math.round(d.solde)]);
    rows.push(['Montants à encaisser (séparé, hors solde)', Math.round(d.rest)]);
    var csv = rows.map(function (row) {
      return row.map(function (cell) {
        var s = String(cell == null ? '' : cell);
        return /[",;\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
      }).join(';');
    }).join('\n');
    var blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
    _download(blob, 'grand_livre_' + (d.vehicle ? d.vehicle.replace(/\s+/g, '_') + '_' : '') + Date.now() + '.csv');
    if (typeof toast === 'function') toast('Grand Livre exporté (Excel)', 'g');
  };

  window.exportGrandLivrePDF = function () {
    var d = _glExportData();
    var w = window.open('', '_blank');
    if (!w) { alert('Veuillez autoriser les pop-ups pour l\'export PDF.'); return; }
    var rowsHtml = d.moves.map(function (m) {
      var dd = m.date ? new Date(m.date).toLocaleDateString('fr-FR') : '';
      return '<tr>'
        + '<td>' + dd + '</td><td>' + m.type + '</td><td>' + esc(m.label) + '</td>'
        + '<td>' + esc(m.party) + '</td><td>' + esc(m.vehicle || '') + '</td>'
        + '<td>' + esc(m.category || '') + '</td><td>' + esc(m.mode || '') + '</td>'
        + '<td style="text-align:right;color:#16a34a;">' + (m.entree ? money(m.entree) : '') + '</td>'
        + '<td style="text-align:right;color:#dc2626;">' + (m.sortie ? money(m.sortie) : '') + '</td>'
        + '<td style="text-align:right;font-weight:700;">' + money(m.solde) + '</td></tr>';
    }).join('');
    w.document.write(
      '<html><head><meta charset="utf-8"><title>Grand Livre de Caisse</title>'
      + '<style>body{font-family:Arial,sans-serif;margin:24px;color:#1a1a2e;}h1{color:#C41E3A;font-size:20px;margin-bottom:4px;}'
      + 'table{width:100%;border-collapse:collapse;font-size:11px;margin-top:14px;}th,td{border:1px solid #ddd;padding:5px 7px;text-align:left;}'
      + 'th{background:#f3f4f6;}tfoot td{font-weight:700;background:#fafafa;}.meta{color:#667;font-size:12px;margin:2px 0;}</style></head><body>'
      + '<h1>ALL STAR LOC — Grand Livre de Caisse</h1>'
      + '<div class="meta">Période : ' + esc(d.period) + '</div>'
      + '<div class="meta">Filtres : ' + esc(d.filters) + '</div>'
      + (d.vehicle ? '<div class="meta"><strong>Véhicule : ' + esc(d.vehicle) + '</strong></div>' : '')
      + '<table><thead><tr><th>Date</th><th>Type</th><th>Libellé</th><th>Client/Fourn.</th><th>Véhicule</th><th>Catégorie</th><th>Mode</th><th>Entrée</th><th>Sortie</th><th>Solde</th></tr></thead>'
      + '<tbody>' + (rowsHtml || '<tr><td colspan="10" style="text-align:center;color:#999;">Aucun mouvement</td></tr>') + '</tbody>'
      + '<tfoot>'
      + '<tr><td colspan="7" style="text-align:right;">Total entrées</td><td style="text-align:right;color:#16a34a;">' + money(d.totalIn) + '</td><td></td><td></td></tr>'
      + '<tr><td colspan="7" style="text-align:right;">Total sorties</td><td></td><td style="text-align:right;color:#dc2626;">' + money(d.totalOut) + '</td><td></td></tr>'
      + '<tr><td colspan="7" style="text-align:right;">Solde final</td><td colspan="3" style="text-align:right;">' + money(d.solde) + '</td></tr>'
      + '<tr><td colspan="7" style="text-align:right;">Montants à encaisser (séparé, hors solde)</td><td colspan="3" style="text-align:right;color:#d97706;">' + money(d.rest) + '</td></tr>'
      + '</tfoot></table>'
      + '<p style="color:#9aa;font-size:11px;margin-top:18px;">Généré le ' + new Date().toLocaleString('fr-FR') + '</p>'
      + '<script>window.onload=function(){window.print();}<\/script></body></html>'
    );
    w.document.close();
    if (typeof toast === 'function') toast('Grand Livre prêt à imprimer (PDF)', 'g');
  };

  function _download(blob, name) {
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url; a.download = name;
    document.body.appendChild(a); a.click();
    document.body.removeChild(a);
    setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
  }

  /* ---- Entrée principale ---- */
  window.renderCaisse = function () {
    // Toujours revenir au résumé à l'ouverture
    document.querySelectorAll('.caisse-tab').forEach(function (b) { b.classList.toggle('active', b.getAttribute('data-ctab') === 'resume'); });
    document.querySelectorAll('.caisse-sub').forEach(function (s) { s.style.display = 'none'; });
    var resume = document.getElementById('caisse-resume');
    if (resume) resume.style.display = 'block';
    renderResume();
  };

  /* Mise à jour live si les réservations changent (paiement encaissé, etc.) */
  try {
    if (typeof ASLDB !== 'undefined' && ASLDB.onChange) {
      ASLDB.onChange(function () {
        var page = document.getElementById('page-caisse');
        if (page && page.classList.contains('active')) renderResume();
      });
    }
  } catch (e) {}
})();
