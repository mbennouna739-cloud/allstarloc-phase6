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
    try { if (typeof ASLDB !== 'undefined' && ASLDB.noteLocalChange) ASLDB.noteLocalChange(CHARGES_KEY); } catch (e) {}
    try { if (typeof ASLDB !== 'undefined' && ASLDB.syncNow) ASLDB.syncNow(); } catch (e) {}
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
    // ★ SOURCE UNIQUE : sans filtre de période, on délègue à la fonction
    //   partagée (ASLDB.computeCashTotals) utilisée aussi par Mobile —
    //   impossible d'obtenir deux montants différents. Le calcul détaillé
    //   ci-dessous ne sert plus que lorsqu'un filtre de période est demandé
    //   (fonctionnalité propre à l'onglet Caisse Desktop).
    if (!fromTs && !toTs && typeof ASLDB !== 'undefined' && ASLDB.computeCashTotals) {
      var ct = ASLDB.computeCashTotals();
      var chgTot = 0;
      readCharges().forEach(function (c) { if (c.status !== 'pending') chgTot += Number(c.amount) || 0; });
      return {
        encaisse: ct.encaisse, charges: chgTot, aEncaisser: ct.reste,
        soldeReel: ct.encaisse - chgTot, soldeEstime: ct.encaisse + ct.reste - chgTot
      };
    }
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

    // ★ Point 4 : répartition "Encaissé par" — calculée UNIQUEMENT à partir
    //   du champ collectedBy de chaque paiement, jamais de l'utilisateur
    //   connecté. Le total global reste toujours la somme des 3 personnes
    //   (+ éventuels encaissements sans "Encaissé par" renseigné, pour ne
    //   jamais perdre d'argent dans le total si une ancienne donnée n'a pas
    //   ce champ).
    var byPerson = { Mohamed: 0, Younes: 0, Khalil: 0 };
    var globalCollected = 0;
    allReservations().forEach(function (r) {
      if (r.status === 'cancelled') return;
      var paid = Number(r.paid) || 0;
      if (paid <= 0) return;
      globalCollected += paid;
      var who = r.collectedBy || '';
      if (byPerson.hasOwnProperty(who)) byPerson[who] += paid;
    });
    setTxt('cs-collected-global', money(globalCollected));
    setTxt('cs-collected-mohamed', money(byPerson.Mohamed));
    setTxt('cs-collected-younes', money(byPerson.Younes));
    setTxt('cs-collected-khalid', money(byPerson.Khalil));
    // ★ LOT 51 : dépenses PAYÉES par chaque personne (champ « Payé par » des
    //   charges) → ce qu'elle a réellement en main = encaissé − dépenses.
    var spent = { Mohamed: 0, Younes: 0, Khalil: 0 };
    readCharges().forEach(function (c) { if (c.status !== 'pending' && spent.hasOwnProperty(c.paidBy)) spent[c.paidBy] += Number(c.amount) || 0; });
    [['Mohamed', 'cs-collected-mohamed'], ['Younes', 'cs-collected-younes'], ['Khalil', 'cs-collected-khalid']].forEach(function (pp) {
      var el = document.getElementById(pp[1]); if (!el) return;
      var subId = pp[1] + '-spent', sub = document.getElementById(subId);
      if (!spent[pp[0]]) { if (sub) sub.remove(); return; }
      if (!sub) { sub = document.createElement('div'); sub.id = subId; sub.style.cssText = 'font-size:11.5px;color:#889;margin-top:4px;font-weight:600;'; el.parentNode.insertBefore(sub, el.nextSibling); }
      sub.textContent = 'Dépenses payées : ' + money(spent[pp[0]]) + ' · En main : ' + money(byPerson[pp[0]] - spent[pp[0]]);
    });
  }
  // ★ LOT 51 : rafraîchissement après une charge saisie dans la nouvelle fenêtre.
  window._caisseRefresh = function () {
    renderResume();
    var cl = document.getElementById('charges-tbody'); if (cl) renderChargesList();
    if (typeof window.renderGrandLivre === 'function' && document.getElementById('gl-total-solde')) { try { window.renderGrandLivre(); } catch (e) {} }
  };

  /* ★ Point 4 — Clic sur une carte (Mohamed/Younes/Khalil) : bascule vers
     l'onglet Rapports (Grand Livre) déjà filtré sur cette personne. */
  window.caisseShowCollectedBy = function (name) {
    var btn = document.querySelector('.caisse-tab[data-ctab="rapports"]');
    if (typeof window.caisseTab === 'function') window.caisseTab('rapports', btn);
    setTimeout(function () { if (typeof window.glSetCollectedBy === 'function') window.glSetCollectedBy(name); }, 0);
  };

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
        + '<td>' + esc(typeof window.aslChargeVehicleText === 'function' ? window.aslChargeVehicleText(c) : (c.vehicle || '—')) + '</td>'
        + '<td><span style="font-size:12px;background:#f3f4f6;padding:3px 9px;border-radius:20px;">' + esc(c.category || 'Autre') + '</span></td>'
        + '<td style="color:#667;">' + esc(c.description || '') + ' ' + statusBadge + (c.paidBy ? '<div style="font-size:11.5px;color:#889;margin-top:2px;">Payé par ' + esc(c.paidBy) + (c.payMode ? ' · ' + esc(c.payMode) : '') + '</div>' : '') + '</td>'
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
    // ★ Point 4 : filtre "Encaissé par" — indépendant de l'utilisateur connecté,
    //   basé uniquement sur le champ collectedBy enregistré avec chaque paiement.
    var fCollectedBy = _glCollectedByFilter || '';

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
        if (fCollectedBy && (r.collectedBy || '') !== fCollectedBy) return;
        var ts = _resDate(r);
        if (!inRange(ts)) return;
        moves.push({
          ts: ts || 0,
          date: r.startDate || r.createdAt || '',
          type: 'Paiement',
          label: 'Encaissement ' + (r.contractRef || r.id || ''),
          party: r.client || '',
          vehicle: r.car || '',
          // ★ Demande 6 : libellé affiché (modèle — plaque · couleur). Le champ
          //   « vehicle » reste le modèle, utilisé par le filtre par véhicule.
          vehicleLabel: (typeof aslVehLabel === 'function') ? aslVehLabel(r) : (r.car || ''),
          category: '',
          mode: r.paymentMode || '',
          collectedBy: r.collectedBy || '—',
          entree: paid,
          sortie: 0
        });
      });
    }

    // SORTIES : charges payées
    if (fType === '' || fType === 'Charge') {
      // ★ LOT 51 : les charges ont maintenant « Payé par » et « Mode » : avec
      //   le filtre personne, on montre ses encaissements ET ses dépenses.
      readCharges().forEach(function (c) {
        if (c.status === 'pending') return; // hors caisse réelle
        if (fCollectedBy && (c.paidBy || '') !== fCollectedBy) return;
        if (fVeh && (c.vehicle || '') !== fVeh) return;
        if (fCat && (c.category || '') !== fCat) return;
        if (fMode && (c.payMode || '') !== fMode) return;
        var ts = c.date ? new Date(c.date).getTime() : null;
        if (!inRange(ts)) return;
        moves.push({
          ts: ts || 0,
          date: c.date || '',
          type: 'Charge',
          label: c.description || c.category || 'Charge',
          party: 'Fournisseur',
          vehicle: (typeof window.aslChargeVehicleText === 'function' ? window.aslChargeVehicleText(c) : (c.vehicle || '')),
          category: c.category || '',
          mode: c.payMode || '',
          collectedBy: c.paidBy || '—',
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

  /* ★ Point 4 — Filtre "Encaissé par" actif dans le Grand Livre (Mohamed /
     Younes / Khalil / vide = tous). Appelé depuis les cartes de répartition
     de la Caisse et depuis le menu déroulant dédié du Grand Livre. */
  var _glCollectedByFilter = '';
  window.glSetCollectedBy = function (name) {
    _glCollectedByFilter = name || '';
    var sel = document.getElementById('gl-collected-by');
    if (sel) sel.value = _glCollectedByFilter;
    renderGrandLivre();
  };

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
        + '<td>' + esc(m.vehicleLabel || m.vehicle || '—') + '</td>'
        + '<td>' + esc(m.category || '—') + '</td>'
        + '<td>' + esc(m.mode || '—') + '</td>'
        + '<td>' + esc(m.collectedBy || '—') + '</td>'
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
        + '<td>' + esc(m.party) + '</td><td>' + esc(m.vehicleLabel || m.vehicle || '') + '</td>'
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

/* ======================================================================
   ★ LOT 51 — RENDEMENT PAR VÉHICULE + NOUVELLE SAISIE DES CHARGES
   ----------------------------------------------------------------------
   1. Fenêtre « Ajouter une charge » (remplace l'ancienne, même nom
      window.openChargeModal → la Caisse l'utilise automatiquement) :
      type en un clic, voitures à cocher, 3 façons de saisir (une voiture /
      même montant par voiture / total à partager), statut Payée / À payer,
      Payé par, Mode de paiement. Aucune voiture = charge générale.
   2. Stockage : MÊME liste qu'avant (asl_charges_v1, synchronisée comme
      avant). Un achat = UN enregistrement (montant total) + sa répartition
      par voiture (allocations). La Caisse voit le total une seule fois.
   3. Onglet « Rendement » : jours loués, occupation, CA, encaissé,
      charges et bénéfice par voiture (par plaque), par mois / année /
      dates libres, avec fiche détaillée et graphique mensuel.
   Lecture seule pour les dossiers : rien n'est modifié dans les locations.
   ====================================================================== */
(function () {
  'use strict';
  var RD_CHG_KEY = 'asl_charges_v1';
  var RD_CATS = ['Carburant', 'AdBlue', 'Vidange', 'Pneus', 'Réparation', 'Lavage', 'Visite technique', 'Assurance', 'Entretien', 'Parking', 'Amende', 'Accessoire', 'Autre'];
  var RD_PAYERS = ['Mohamed', 'Younes', 'Khalil'];
  var RD_MODES = ['Espèces', 'Carte bancaire', 'Virement', 'Chèque', 'Autre'];
  var RD_MONTHS = ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin', 'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'];
  var RD_MSHORT = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Juin', 'Juil', 'Août', 'Sep', 'Oct', 'Nov', 'Déc'];

  function esc(s) { return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }
  function r2(n) { return Math.round((Number(n) || 0) * 100) / 100; }
  function mad(n) { return Math.round(Number(n) || 0).toLocaleString('fr-FR') + ' MAD'; }
  function num(n) { return Math.round(Number(n) || 0).toLocaleString('fr-FR'); }
  function today() { return (typeof todayStr === 'function') ? todayStr() : new Date().toISOString().slice(0, 10); }
  function addDays(iso, n) {
    var d = new Date(String(iso).slice(0, 10) + 'T12:00:00'); d.setDate(d.getDate() + n);
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  }
  function daysBetween(a, b) { return Math.round((new Date(b + 'T12:00:00') - new Date(a + 'T12:00:00')) / 86400000); }

  /* ---------- Charges : lecture / écriture (mêmes clé et synchro que la Caisse) ---------- */
  function readCharges() { try { return JSON.parse(localStorage.getItem(RD_CHG_KEY) || '[]'); } catch (e) { return []; } }
  function writeCharges(list) {
    try { localStorage.setItem(RD_CHG_KEY, JSON.stringify(list)); } catch (e) {}
    try { if (typeof ASLDB !== 'undefined' && ASLDB.noteLocalChange) ASLDB.noteLocalChange(RD_CHG_KEY); } catch (e) {}
    try { if (typeof ASLDB !== 'undefined' && ASLDB.syncNow) ASLDB.syncNow(); } catch (e) {}
  }

  /* ---------- Flotte : une entrée par voiture (plaque) ---------- */
  function units() {
    var out = [];
    (typeof aslFleet === 'function' ? aslFleet() : []).forEach(function (c) {
      var us = (typeof aslUnitsOf === 'function') ? aslUnitsOf(c) : [];
      if (!us.length) us = [{ plate: c.plate || '', color: c.color || '' }];
      us.forEach(function (u) {
        out.push({ key: String(c.id) + '::' + (u.plate || ''), carId: c.id, model: c.name || '', plate: u.plate || '', color: u.color || '', single: us.length === 1 });
      });
    });
    out.sort(function (a, b) { return (a.model + a.plate).localeCompare(b.model + b.plate, 'fr'); });
    return out;
  }
  function unitByKey(key) { return units().filter(function (u) { return u.key === key; })[0] || null; }
  function unitLabel(u) { return u.model + (u.plate ? ' — ' + u.plate : '') + (u.color ? ' · ' + u.color : ''); }

  /* Répartition d'une charge par voiture. Nouvelle charge : sa répartition.
     Ancienne charge (rattachée à un MODÈLE) : partagée à parts égales entre
     les voitures de ce modèle. Sinon : charge générale ([]). */
  function allocationsOf(c) {
    if (c && Array.isArray(c.allocations)) return c.allocations.filter(function (a) { return a && a.key; });
    if (c && c.vehicle) {
      var us = units().filter(function (u) { return u.model === c.vehicle; });
      if (us.length) {
        var part = r2((Number(c.amount) || 0) / us.length);
        return us.map(function (u) { return { key: u.key, amount: part, legacy: true }; });
      }
    }
    return [];
  }
  /* Texte « véhicule » d'une charge (liste de la Caisse). */
  window.aslChargeVehicleText = function (c) {
    if (c && Array.isArray(c.allocations)) {
      if (!c.allocations.length) return 'Générale';
      if (c.allocations.length === 1) { var u = unitByKey(c.allocations[0].key); return u ? unitLabel(u) : (c.vehicle || '1 véhicule'); }
      return c.allocations.length + ' véhicules';
    }
    return (c && c.vehicle) || '—';
  };

  /* ======================= FENÊTRE « CHARGE » ======================= */
  var CM = null; // état de la fenêtre ouverte
  function cmStyle() {
    if (document.getElementById('rd-cm-style')) return;
    var st = document.createElement('style'); st.id = 'rd-cm-style';
    st.textContent = [
      '#rd-cm{position:fixed;inset:0;z-index:7000;background:rgba(10,12,18,.5);display:flex;align-items:center;justify-content:center;padding:16px;}',
      '#rd-cm .box{background:var(--dark2,#fff);color:var(--text);border-radius:16px;width:100%;max-width:560px;max-height:92vh;display:flex;flex-direction:column;box-shadow:0 24px 60px rgba(0,0,0,.25);}',
      '#rd-cm .hd{padding:16px 20px;border-bottom:1px solid var(--border);display:flex;justify-content:space-between;align-items:center;}',
      '#rd-cm .bd{padding:14px 20px;overflow-y:auto;}',
      '#rd-cm .ft{padding:14px 20px;border-top:1px solid var(--border);display:flex;gap:8px;align-items:center;}',
      '#rd-cm .lb{font-size:11.5px;font-weight:700;color:var(--text3);letter-spacing:.3px;text-transform:uppercase;margin:12px 0 6px;}',
      '#rd-cm .chips{display:flex;flex-wrap:wrap;gap:6px;}',
      '#rd-cm .chip{border:1px solid var(--border);background:transparent;border-radius:20px;padding:5px 12px;font-size:12.5px;font-weight:600;color:var(--text2);cursor:pointer;font-family:inherit;}',
      '#rd-cm .chip.on{background:var(--red);border-color:var(--red);color:#fff;}',
      '#rd-cm .g2{display:grid;grid-template-columns:1fr 1fr;gap:10px;}',
      '#rd-cm .cars{border:1px solid var(--border);border-radius:10px;max-height:220px;overflow-y:auto;}',
      '#rd-cm .car{display:flex;align-items:center;gap:10px;padding:7px 10px;border-bottom:1px solid var(--border);cursor:pointer;}',
      '#rd-cm .car:last-child{border-bottom:none;}',
      '#rd-cm .car input[type=checkbox]{width:16px;height:16px;accent-color:var(--red);flex-shrink:0;}',
      '#rd-cm .car .n{flex:1;min-width:0;font-size:13px;font-weight:600;}',
      '#rd-cm .car .n small{display:block;font-weight:400;color:var(--text3);font-size:11.5px;}',
      '#rd-cm .car .amt{width:96px;text-align:right;padding:4px 8px;font-size:12.5px;}',
      '#rd-cm .note{font-size:12px;color:var(--text3);margin-top:6px;}',
      '#rd-cm .sum{font-size:12.5px;font-weight:600;flex:1;}',
      /* ★ LOT 52 — Sur téléphone : plein écran, grandes zones tactiles. */
      '@media (max-width:600px){#rd-cm{padding:0;align-items:stretch;}#rd-cm .box{max-width:none;max-height:none;height:100%;border-radius:0;}'
      + '#rd-cm .hd{padding-top:calc(env(safe-area-inset-top,0px) + 14px);}#rd-cm .ft{flex-wrap:wrap;padding-bottom:calc(env(safe-area-inset-bottom,0px) + 14px);}'
      + '#rd-cm .ft .sum{flex-basis:100%;margin-bottom:6px;}#rd-cm .ft .btn-sm{flex:1;height:50px;font-size:15px;border-radius:13px;}'
      + '#rd-cm .chip{height:42px;padding:0 15px;font-size:14.5px;}#rd-cm .car{min-height:56px;}#rd-cm .car input[type=checkbox]{width:22px;height:22px;}'
      + '#rd-cm .form-input{height:50px;font-size:16px;}#rd-cm .car .amt{height:42px;width:110px;}#rd-cm .cars{max-height:none;}#rd-cm .g2{grid-template-columns:1fr 1fr;}}'
    ].join('\n');
    document.head.appendChild(st);
  }
  /* ★ LOT 52 — Types de charge : suggestions + types personnalisés déjà
     utilisés (lus dans les charges elles-mêmes, donc synchronisés). */
  function cmCats() {
    var extra = [];
    readCharges().forEach(function (c) { var k = String(c.category || '').trim(); if (k && RD_CATS.indexOf(k) < 0 && extra.indexOf(k) < 0) extra.push(k); });
    extra.sort(function (a, b) { return a.localeCompare(b, 'fr'); });
    return RD_CATS.concat(extra);
  }
  function cmSelected() { return CM.units.filter(function (u) { return CM.sel[u.key]; }); }
  function cmEffectiveMode() { var n = cmSelected().length; return n <= 1 ? (n === 0 ? 'general' : 'single') : CM.mode; }
  function cmEqualize() {
    var sel = cmSelected(); var total = parseFloat(CM.amount) || 0;
    if (!sel.length) return;
    var base = Math.floor(total / sel.length * 100) / 100;
    var rest = r2(total - base * sel.length);
    sel.forEach(function (u, i) { CM.parts[u.key] = r2(base + (i === 0 ? rest : 0)); });
  }
  function cmRender() {
    var host = document.getElementById('rd-cm'); if (!host) return;
    var mode = cmEffectiveMode(), sel = cmSelected();
    var amtLabel = mode === 'each' ? 'Montant PAR voiture (MAD)' : (mode === 'total' ? 'Montant TOTAL (MAD)' : 'Montant (MAD)');
    var totalCalc = mode === 'each' ? r2((parseFloat(CM.amount) || 0) * sel.length) : r2(parseFloat(CM.amount) || 0);
    var partsSum = r2(sel.reduce(function (s, u) { return s + (Number(CM.parts[u.key]) || 0); }, 0));
    var cars = CM.units.map(function (u) {
      var on = !!CM.sel[u.key];
      var showAmt = on && mode === 'total';
      return '<label class="car"><input type="checkbox" ' + (on ? 'checked' : '') + ' onchange="rdCmToggle(\'' + esc(u.key) + '\',this.checked)">'
        + '<span class="n">' + esc(u.model) + '<small>' + esc((u.plate || 'sans plaque') + (u.color ? ' · ' + u.color : '')) + '</small></span>'
        + (showAmt ? '<input class="form-input amt" type="number" min="0" step="any" value="' + (CM.parts[u.key] != null ? CM.parts[u.key] : '') + '" onclick="event.preventDefault();event.stopPropagation();this.focus()" oninput="rdCmPart(\'' + esc(u.key) + '\',this.value)" aria-label="Part de ' + esc(unitLabel(u)) + '">' : '')
        + '</label>';
    }).join('');
    var sumTxt = mode === 'general' ? 'Charge générale (aucune voiture) · ' + mad(totalCalc)
      : mode === 'single' ? esc(unitLabel(sel[0])) + ' · ' + mad(totalCalc)
      : mode === 'each' ? sel.length + ' voitures × ' + mad(CM.amount) + ' = <b>' + mad(totalCalc) + '</b>'
      : sel.length + ' voitures · réparti ' + mad(partsSum) + ' / ' + mad(totalCalc) + (Math.abs(partsSum - totalCalc) > 0.009 ? ' <span style="color:var(--red);">(à ajuster)</span>' : ' ✓');
    host.querySelector('.bd').innerHTML =
      '<div class="lb">Type</div><div class="chips">' + cmCats().map(function (c) { return '<button type="button" class="chip' + (!CM.customOpen && CM.category === c ? ' on' : '') + '" data-cat="' + esc(c) + '" onclick="rdCmCat(this.dataset.cat)">' + esc(c) + '</button>'; }).join('')
        + '<button type="button" class="chip' + (CM.customOpen ? ' on' : '') + '" onclick="rdCmCustom()">+ Nouveau type</button></div>'
        + (CM.customOpen ? '<input id="rd-cm-cat" class="form-input" style="margin-top:8px;" value="' + esc(CM.customOpen ? CM.category : '') + '" placeholder="Nom du type (ex : Péage, Assurance bris de glace…)" oninput="rdCmSet(\'category\',this.value,1)" maxlength="40">' : '')
      + '<div class="lb" style="display:flex;justify-content:space-between;"><span>Voitures concernées</span><span style="text-transform:none;font-weight:600;"><a href="#" onclick="rdCmAll(1);return false;">Toutes</a> · <a href="#" onclick="rdCmAll(0);return false;">Aucune</a></span></div>'
      + '<div class="cars">' + cars + '</div>'
      + (sel.length >= 2 ? '<div class="lb">Saisie</div><div class="chips">'
          + '<button type="button" class="chip' + (CM.mode === 'each' ? ' on' : '') + '" onclick="rdCmSet(\'mode\',\'each\')">Même montant pour chaque voiture</button>'
          + '<button type="button" class="chip' + (CM.mode === 'total' ? ' on' : '') + '" onclick="rdCmSet(\'mode\',\'total\')">Montant total à partager</button></div>'
        : (sel.length === 0 ? '<div class="note">Aucune voiture cochée : charge générale (loyer, téléphone…). Elle compte dans la Caisse et le total, pas dans une voiture.</div>' : ''))
      + '<div class="g2"><div><div class="lb">' + amtLabel + '</div><input id="rd-cm-amount" class="form-input" type="number" min="0" step="any" value="' + esc(CM.amount) + '" oninput="rdCmAmount(this.value)" placeholder="0"></div>'
      + '<div><div class="lb">Date</div><input class="form-input" type="date" value="' + esc(CM.date) + '" onchange="rdCmSet(\'date\',this.value,1)"></div></div>'
      + '<div class="lb">Statut</div><div class="chips">'
      + '<button type="button" class="chip' + (CM.status !== 'pending' ? ' on' : '') + '" onclick="rdCmSet(\'status\',\'paid\')">Payée (baisse la caisse)</button>'
      + '<button type="button" class="chip' + (CM.status === 'pending' ? ' on' : '') + '" onclick="rdCmSet(\'status\',\'pending\')">À payer</button></div>'
      + '<div class="g2"><div><div class="lb">Payé par</div><select class="form-input" onchange="rdCmSet(\'paidBy\',this.value,1)"><option value="">—</option>' + RD_PAYERS.map(function (p) { return '<option' + (CM.paidBy === p ? ' selected' : '') + '>' + p + '</option>'; }).join('') + '</select></div>'
      + '<div><div class="lb">Mode</div><select class="form-input" onchange="rdCmSet(\'payMode\',this.value,1)">' + RD_MODES.map(function (m) { return '<option' + (CM.payMode === m ? ' selected' : '') + '>' + m + '</option>'; }).join('') + '</select></div></div>'
      + '<div class="lb">Description (facultatif)</div><input class="form-input" value="' + esc(CM.description) + '" oninput="rdCmSet(\'description\',this.value,1)" placeholder="Ex : 4 bidons AdBlue, station Shell">';
    host.querySelector('.sum').innerHTML = sumTxt;
  }
  window.rdCmCat = function (c) { CM.customOpen = false; CM.category = c; cmRender(); };
  window.rdCmCustom = function () { CM.customOpen = true; CM.category = ''; cmRender(); setTimeout(function () { var el = document.getElementById('rd-cm-cat'); if (el) el.focus(); }, 20); };
  window.rdCmToggle = function (key, on) { CM.sel[key] = !!on; if (CM.mode === 'total') cmEqualize(); cmRender(); };
  window.rdCmAll = function (on) { CM.units.forEach(function (u) { CM.sel[u.key] = !!on; }); if (CM.mode === 'total') cmEqualize(); cmRender(); };
  window.rdCmSet = function (field, val, quiet) { CM[field] = val; if (field === 'mode' && val === 'total') cmEqualize(); if (!quiet) cmRender(); };
  window.rdCmAmount = function (v) {
    CM.amount = v; if (cmEffectiveMode() === 'total') cmEqualize();
    // mise à jour sans perdre le curseur : seulement les parts + le récapitulatif
    var focus = document.activeElement && document.activeElement.id === 'rd-cm-amount';
    cmRender();
    if (focus) { var el = document.getElementById('rd-cm-amount'); if (el) { el.focus(); var l = el.value.length; try { el.setSelectionRange(l, l); } catch (e) {} } }
  };
  window.rdCmPart = function (key, v) {
    CM.parts[key] = parseFloat(v) || 0;
    var sel = cmSelected(); var total = r2(parseFloat(CM.amount) || 0);
    var partsSum = r2(sel.reduce(function (s, u) { return s + (Number(CM.parts[u.key]) || 0); }, 0));
    var sumEl = document.querySelector('#rd-cm .sum');
    if (sumEl) sumEl.innerHTML = sel.length + ' voitures · réparti ' + mad(partsSum) + ' / ' + mad(total) + (Math.abs(partsSum - total) > 0.009 ? ' <span style="color:var(--red);">(à ajuster)</span>' : ' ✓');
  };
  window.rdCmClose = function () { var h = document.getElementById('rd-cm'); if (h) h.remove(); CM = null; };

  /* Ouvre la fenêtre. id = charge à modifier ; preset = { keys:[clés voitures] }. */
  window.openChargeModal = function (id, preset) {
    cmStyle();
    var list = readCharges();
    var c = id ? list.filter(function (x) { return x.id === id; })[0] : null;
    var us = units();
    CM = { id: c ? c.id : null, units: us, sel: {}, parts: {}, mode: 'each', category: (c && c.category) || 'Carburant', customOpen: false,
      date: (c && c.date ? String(c.date).slice(0, 10) : today()), status: (c && c.status === 'pending') ? 'pending' : 'paid',
      paidBy: (c && c.paidBy) || '', payMode: (c && c.payMode) || 'Espèces', description: (c && c.description) || '',
      amount: '', photo: (c && c.photo) || '' };
    if (c) {
      var al = allocationsOf(c);
      al.forEach(function (a) { CM.sel[a.key] = true; CM.parts[a.key] = r2(a.amount); });
      if (c.splitMode === 'each' && al.length >= 2) { CM.mode = 'each'; CM.amount = String(r2(al[0].amount)); }
      else { CM.mode = al.length >= 2 ? 'total' : 'each'; CM.amount = String(r2(c.amount)); }
    } else if (preset && preset.keys) {
      preset.keys.forEach(function (k) { CM.sel[k] = true; });
    }
    var old = document.getElementById('rd-cm'); if (old) old.remove();
    var host = document.createElement('div'); host.id = 'rd-cm';
    host.addEventListener('click', function (e) { if (e.target === host) rdCmClose(); });
    host.innerHTML = '<div class="box" role="dialog" aria-modal="true" aria-label="Charge">'
      + '<div class="hd"><strong style="font-size:16px;">' + (c ? 'Modifier la charge' : 'Ajouter une charge') + '</strong><button type="button" class="rcal-close" onclick="rdCmClose()" aria-label="Fermer" style="width:32px;height:32px;border-radius:9px;border:1px solid var(--border);background:transparent;font-size:18px;cursor:pointer;color:var(--text);">×</button></div>'
      + '<div class="bd"></div>'
      + '<div class="ft"><div class="sum"></div>'
      + (c ? '<button type="button" class="btn-sm ghost" style="color:var(--red);" onclick="rdCmDelete()">Supprimer</button>' : '')
      + '<button type="button" class="btn-sm ghost" onclick="rdCmClose()">Annuler</button>'
      + '<button type="button" class="btn-sm primary" onclick="rdCmSave()">Enregistrer</button></div></div>';
    document.body.appendChild(host);
    cmRender();
    setTimeout(function () { var a = document.getElementById('rd-cm-amount'); if (a && !c) a.focus(); }, 30);
  };
  window.closeChargeModal = window.rdCmClose;

  window.rdCmSave = function () {
    if (!CM) return;
    var mode = cmEffectiveMode(), sel = cmSelected();
    var amt = r2(parseFloat(CM.amount) || 0);
    if (amt <= 0) { alert('Saisissez le montant de la charge.'); return; }
    CM.category = String(CM.category || '').trim();
    if (!CM.category) { alert('Choisissez ou saisissez le type de la charge.'); return; }
    var allocations, total;
    if (mode === 'general') { allocations = []; total = amt; }
    else if (mode === 'single') { allocations = [{ key: sel[0].key, amount: amt }]; total = amt; }
    else if (mode === 'each') { allocations = sel.map(function (u) { return { key: u.key, amount: amt }; }); total = r2(amt * sel.length); }
    else {
      allocations = sel.map(function (u) { return { key: u.key, amount: r2(CM.parts[u.key]) }; });
      var s = r2(allocations.reduce(function (x, a) { return x + a.amount; }, 0));
      if (Math.abs(s - amt) > 0.009) { alert('La répartition (' + mad(s) + ') ne correspond pas au montant total (' + mad(amt) + ').\nAjustez les montants par voiture.'); return; }
      total = amt;
    }
    allocations.forEach(function (a) { var u = unitByKey(a.key); if (u) { a.carId = u.carId; a.plate = u.plate; a.model = u.model; } });
    var models = {}; allocations.forEach(function (a) { if (a.model) models[a.model] = 1; });
    var mk = Object.keys(models);
    var item = {
      id: CM.id || ('chg' + Date.now()),
      date: CM.date || today(),
      vehicle: mk.length === 1 ? mk[0] : (allocations.length ? 'Plusieurs véhicules' : ''),
      category: CM.category || 'Autre',
      amount: total,
      status: CM.status === 'pending' ? 'pending' : 'paid',
      description: String(CM.description || '').trim(),
      photo: CM.photo || '',
      allocations: allocations,
      splitMode: mode,
      paidBy: CM.paidBy || '',
      payMode: CM.payMode || ''
    };
    var list = readCharges();
    var i = list.findIndex(function (x) { return x.id === item.id; });
    if (i >= 0) list[i] = item; else list.push(item);
    writeCharges(list);
    rdCmClose();
    rdRefreshAll();
    if (typeof showToast === 'function') showToast('Charge enregistrée ✓ — ' + mad(total));
  };
  window.rdCmDelete = function () {
    if (!CM || !CM.id) return;
    if (!confirm('Supprimer cette charge ?')) return;
    writeCharges(readCharges().filter(function (x) { return x.id !== CM.id; }));
    rdCmClose(); rdRefreshAll();
    if (typeof showToast === 'function') showToast('Charge supprimée ✓');
  };
  function rdRefreshAll() {
    try { if (typeof window._caisseRefresh === 'function') window._caisseRefresh(); } catch (e) {}
    try { var p = document.getElementById('page-rendement'); if (p && p.classList.contains('active')) renderRendement(); } catch (e) {}
  }

  /* ======================= MOTEUR DE CALCUL ======================= */
  /* Clé voiture d'un dossier : plaque attribuée ; sinon, si le modèle n'a
     qu'un exemplaire, celui-ci ; sinon « modèle, plaque non attribuée ». */
  function unitKeyOfRes(r, uidx) {
    var car = (typeof aslFindCar === 'function') ? aslFindCar(r.carId, r.car) : null;
    var cid = car ? car.id : r.carId;
    if (r.assignedPlate) { var k = String(cid) + '::' + r.assignedPlate; if (uidx[k]) return k; }
    var same = Object.keys(uidx).filter(function (k) { return uidx[k].carId == cid; });
    if (same.length === 1) return same[0];
    return 'model:' + cid + ':' + (car ? car.name : (r.car || '?'));
  }
  /* Période choisie → { from, to, label } (dates incluses). */
  function periodOf(st) {
    var t = today();
    if (st.mode === 'month') { var y = +st.ym.slice(0, 4), m = +st.ym.slice(5, 7); return { from: st.ym + '-01', to: st.ym + '-' + String(new Date(y, m, 0).getDate()).padStart(2, '0'), label: RD_MONTHS[m - 1] + ' ' + y }; }
    if (st.mode === 'custom') { var f = st.from || t, to = st.to || t; if (to < f) { var x = f; f = to; to = x; } return { from: f, to: to, label: 'Du ' + f.split('-').reverse().join('/') + ' au ' + to.split('-').reverse().join('/') }; }
    return { from: st.year + '-01-01', to: st.year + '-12-31', label: 'Année ' + st.year };
  }
  /* Parcourt chaque jour de chaque dossier (non annulé, hors sous-location).
     Un dossier du 28/09 au 03/10 = 5 jours (28, 29, 30, 1er, 2) ; montant,
     jours facturés et encaissé sont répartis à parts égales sur ces jours.
     Réalisé = location en cours / terminée (ou longue durée), jour ≤ aujourd'hui.
     À venir = réservation confirmée / location en cours, jour > aujourd'hui. */
  function eachDay(fn) {
    var t = today();
    (typeof aslRes === 'function' ? aslRes() : []).forEach(function (r) {
      if (!r || r.status === 'cancelled' || r.subleaseId || !r.startDate) return;
      var s = String(r.startDate).slice(0, 10), e = String(r.endDate || r.startDate).slice(0, 10);
      var n = Math.max(1, daysBetween(s, e));
      var billed = Number(r.days) > 0 ? Number(r.days) : n;
      var amount = Number(r.amount) || 0, paid = Math.min(Number(r.paid) || 0, amount || Number(r.paid) || 0);
      var realizedType = (r.status === 'active' || r.status === 'completed' || r.type === 'lld');
      var plannedType = (r.status === 'active' || r.status === 'confirmed');
      for (var i = 0; i < n; i++) {
        var d = addDays(s, i);
        var real = realizedType && d <= t, plan = !real && plannedType && d > t;
        if (!real && !plan) continue;
        fn(r, d, { days: billed / n, ca: amount / n, paid: paid / n, real: real });
      }
    });
  }
  function compute(per) {
    var us = units(), uidx = {}; us.forEach(function (u) { uidx[u.key] = u; });
    var rows = {}; function row(k) {
      if (!rows[k]) {
        var u = uidx[k], m = /^model:([^:]*):(.*)$/.exec(k);
        rows[k] = { key: k, unit: u || null, label: u ? u.model : (m ? m[2] : k), sub: u ? ((u.plate || 'sans plaque') + (u.color ? ' · ' + u.color : '')) : 'plaque non attribuée',
          days: 0, ca: 0, paid: 0, planned: 0, charges: 0, res: {} };
      }
      return rows[k];
    }
    us.forEach(function (u) { row(u.key); });
    eachDay(function (r, d, p) {
      if (d < per.from || d > per.to) return;
      var o = row(unitKeyOfRes(r, uidx));
      if (p.real) { o.days += p.days; o.ca += p.ca; o.paid += p.paid; } else { o.planned += p.days; }
      if (p.real) { var x = o.res[r.id] || (o.res[r.id] = { r: r, days: 0, ca: 0, paid: 0 }); x.days += p.days; x.ca += p.ca; x.paid += p.paid; }
    });
    var general = 0, chargeLines = [];
    readCharges().forEach(function (c) {
      var d = String(c.date || '').slice(0, 10);
      if (!d || d < per.from || d > per.to) return;
      var al = allocationsOf(c);
      if (!al.length) { general += Number(c.amount) || 0; return; }
      al.forEach(function (a) { if (uidx[a.key]) { row(a.key).charges += Number(a.amount) || 0; chargeLines.push({ key: a.key, c: c, part: Number(a.amount) || 0, n: al.length, legacy: !!a.legacy }); } else { general += Number(a.amount) || 0; } });
    });
    var end = per.to < today() ? per.to : today();
    var elapsed = per.from > today() ? 0 : daysBetween(per.from, end) + 1;
    var list = Object.keys(rows).map(function (k) { var o = rows[k]; o.profit = o.ca - o.charges; o.occ = elapsed > 0 && o.unit ? Math.min(100, o.days / elapsed * 100) : null; return o; })
      .filter(function (o) { return o.unit || o.days > 0 || o.ca > 0; })
      .sort(function (a, b) { return b.profit - a.profit || a.label.localeCompare(b.label, 'fr'); });
    var tot = list.reduce(function (t, o) { t.days += o.days; t.ca += o.ca; t.paid += o.paid; t.charges += o.charges; t.planned += o.planned; return t; }, { days: 0, ca: 0, paid: 0, charges: 0, planned: 0 });
    tot.general = general; tot.profit = tot.ca - tot.charges - general;
    return { list: list, tot: tot, chargeLines: chargeLines, elapsed: elapsed };
  }
  /* Série mensuelle (année Y) d'une voiture : jours et CA réalisés. */
  function monthly(key, year) {
    var us = units(), uidx = {}; us.forEach(function (u) { uidx[u.key] = u; });
    var out = []; for (var i = 0; i < 12; i++) out.push({ days: 0, ca: 0 });
    eachDay(function (r, d, p) {
      if (!p.real || d.slice(0, 4) !== String(year)) return;
      if (unitKeyOfRes(r, uidx) !== key) return;
      var m = +d.slice(5, 7) - 1; out[m].days += p.days; out[m].ca += p.ca;
    });
    return out;
  }
  window.aslRendementCompute = function (st) { return compute(periodOf(st)); }; // (tests)

  /* ======================= ONGLET RENDEMENT ======================= */
  var ST = null;
  function state() {
    if (!ST) { var t = today(); ST = { mode: 'year', year: +t.slice(0, 4), ym: t.slice(0, 7), from: t.slice(0, 8) + '01', to: t, unit: null, chart: 'days' }; }
    return ST;
  }
  window.rdSet = function (field, val) {
    var st = state(); st[field] = (field === 'year') ? +val : val;
    if (field === 'mode' && val !== 'custom') { st.from = st.from || today(); }
    renderRendement();
  };
  window.rdOpenUnit = function (key) { state().unit = key; renderRendement(); window.scrollTo && window.scrollTo(0, 0); };
  window.rdBack = function () { state().unit = null; renderRendement(); };
  window.rdMonthClick = function (y, m) { var st = state(); st.mode = 'month'; st.ym = y + '-' + String(m + 1).padStart(2, '0'); renderRendement(); };
  window.rdAddCharge = function (key) { openChargeModal(null, key ? { keys: [key] } : null); };
  window.rdOpenRes = function (id) {
    var r = (typeof aslRes === 'function' ? aslRes() : []).filter(function (x) { return String(x.id) === String(id); })[0];
    if (!r) return;
    if (r.status === 'active' && typeof viewRental === 'function') viewRental(r.id); else if (typeof viewRes === 'function') viewRes(r.id);
  };

  function rdStyle() {
    if (document.getElementById('rd-style')) return;
    var st = document.createElement('style'); st.id = 'rd-style';
    st.textContent = [
      '.rd-bar{display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap;margin-bottom:14px;}',
      '.rd-seg{display:inline-flex;gap:3px;padding:3px;background:var(--dark2,#fff);border:1px solid var(--border);border-radius:10px;}',
      '.rd-seg button{border:none;background:transparent;padding:6px 12px;border-radius:7px;font-family:inherit;font-size:13px;font-weight:600;color:var(--text3);cursor:pointer;}',
      '.rd-seg button.on{background:var(--red);color:#fff;}',
      '.rd-ctrl{display:flex;align-items:center;gap:8px;flex-wrap:wrap;}',
      '.rd-ctrl .form-select,.rd-ctrl .form-input{width:auto;padding:7px 10px;font-size:13px;}',
      '.rd-kpis{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:10px;margin-bottom:14px;}',
      '.rd-kpi{background:var(--dark2,#fff);border:1px solid var(--border);border-radius:12px;padding:12px 14px;}',
      '.rd-kpi .l{font-size:12px;color:var(--text3);font-weight:600;}',
      '.rd-kpi .v{font-size:20px;font-weight:800;margin-top:2px;}',
      '.rd-kpi .s{font-size:11.5px;color:var(--text3);margin-top:2px;}',
      '.rd-row{cursor:pointer;}',
      '.rd-row:hover td{background:rgba(196,30,58,.04);}',
      '.rd-occ{height:5px;border-radius:3px;background:rgba(18,22,30,.08);margin-top:4px;width:90px;}',
      '.rd-occ i{display:block;height:100%;border-radius:3px;background:var(--red);}',
      '.rd-pos{color:#15803d;font-weight:700;}.rd-neg{color:var(--red);font-weight:700;}',
      '.rd-chart{display:flex;align-items:flex-end;gap:8px;height:190px;padding:10px 4px 0;border-bottom:1px solid var(--border);}',
      '.rd-chart .c{flex:1;display:flex;flex-direction:column;align-items:center;justify-content:flex-end;height:100%;cursor:pointer;}',
      '.rd-chart .c b{width:100%;max-width:46px;background:var(--red);opacity:.85;border-radius:5px 5px 0 0;min-height:2px;}',
      '.rd-chart .c:hover b{opacity:1;}',
      '.rd-chart .c span{font-size:11px;font-weight:700;color:var(--text2);margin-bottom:4px;white-space:nowrap;}',
      '.rd-mlab{display:flex;gap:8px;padding:6px 4px 0;}.rd-mlab div{flex:1;text-align:center;font-size:11.5px;color:var(--text3);font-weight:600;}',
      '.rd-sec{background:var(--dark2,#fff);border:1px solid var(--border);border-radius:14px;padding:14px 16px;margin-bottom:14px;}',
      '.rd-sec h3{font-size:14.5px;font-weight:800;margin:0 0 10px;display:flex;justify-content:space-between;align-items:center;gap:8px;flex-wrap:wrap;}',
      '.rd-sub{font-size:11.5px;color:var(--text3);}'
    ].join('\n');
    document.head.appendChild(st);
  }
  function periodControls(st) {
    var t = today(), y0 = +t.slice(0, 4), years = [];
    for (var y = y0 - 3; y <= y0 + 1; y++) years.push(y);
    var yearSel = function (val, onch) { return '<select class="form-select" onchange="' + onch + '">' + years.map(function (y) { return '<option' + (y === val ? ' selected' : '') + '>' + y + '</option>'; }).join('') + '</select>'; };
    var ctrls = '';
    if (st.mode === 'month') {
      var my = +st.ym.slice(0, 4), mm = +st.ym.slice(5, 7);
      ctrls = '<select class="form-select" onchange="rdSet(\'ym\',\'' + my + '-\'+this.value)">' + RD_MONTHS.map(function (n, i) { var v = String(i + 1).padStart(2, '0'); return '<option value="' + v + '"' + (i + 1 === mm ? ' selected' : '') + '>' + n + '</option>'; }).join('') + '</select>'
        + yearSel(my, "rdSet('ym',this.value+'-" + String(mm).padStart(2, '0') + "')");
    } else if (st.mode === 'year') {
      ctrls = yearSel(st.year, "rdSet('year',this.value)");
    } else {
      ctrls = '<input type="date" class="form-input" value="' + st.from + '" onchange="rdSet(\'from\',this.value)"><span style="color:var(--text3);">→</span><input type="date" class="form-input" value="' + st.to + '" onchange="rdSet(\'to\',this.value)">';
    }
    return '<div class="rd-ctrl"><div class="rd-seg">'
      + '<button class="' + (st.mode === 'month' ? 'on' : '') + '" onclick="rdSet(\'mode\',\'month\')">Mois</button>'
      + '<button class="' + (st.mode === 'year' ? 'on' : '') + '" onclick="rdSet(\'mode\',\'year\')">Année</button>'
      + '<button class="' + (st.mode === 'custom' ? 'on' : '') + '" onclick="rdSet(\'mode\',\'custom\')">Personnalisé</button></div>' + ctrls + '</div>';
  }
  function kpi(l, v, s, cls) { return '<div class="rd-kpi"><div class="l">' + l + '</div><div class="v ' + (cls || '') + '">' + v + '</div>' + (s ? '<div class="s">' + s + '</div>' : '') + '</div>'; }

  window.renderRendement = function () {
    var root = document.getElementById('rendement-root'); if (!root) return;
    rdStyle();
    var st = state(), per = periodOf(st), R = compute(per);
    var head = '<div class="rd-bar"><div><div style="font-size:18px;font-weight:800;">Rendement des véhicules</div><div class="rd-sub">' + esc(per.label) + ' · jours et montants réalisés (locations en cours ou terminées)</div></div>'
      + '<div class="rd-ctrl">' + periodControls(st) + '<button class="btn-sm primary" onclick="rdAddCharge()">+ Charge</button></div></div>';
    if (st.unit) { root.innerHTML = head + renderUnit(st, per, R); return; }
    var T = R.tot;
    var kp = '<div class="rd-kpis">'
      + kpi('Jours loués', num(T.days), T.planned > 0.5 ? '+ ' + num(T.planned) + ' j réservés à venir' : '')
      + kpi('Chiffre d\'affaires', mad(T.ca), 'Encaissé : ' + mad(T.paid))
      + kpi('Charges véhicules', mad(T.charges), T.general > 0 ? '+ charges générales : ' + mad(T.general) : '')
      + kpi('Bénéfice', mad(T.profit), 'CA − toutes les charges', T.profit >= 0 ? 'rd-pos' : 'rd-neg')
      + '</div>';
    var rows = R.list.map(function (o) {
      var occ = o.occ == null ? '—' : Math.round(o.occ) + ' %<div class="rd-occ"><i style="width:' + Math.round(o.occ) + '%"></i></div>';
      return '<tr class="rd-row" onclick="rdOpenUnit(\'' + esc(o.key) + '\')">'
        + '<td><strong>' + esc(o.label) + '</strong><div class="rd-sub">' + esc(o.sub) + '</div></td>'
        + '<td style="white-space:nowrap;"><strong>' + num(o.days) + ' j</strong>' + (o.planned > 0.5 ? '<div class="rd-sub">+ ' + num(o.planned) + ' j à venir</div>' : '') + '</td>'
        + '<td>' + occ + '</td>'
        + '<td style="white-space:nowrap;">' + mad(o.ca) + '</td>'
        + '<td style="white-space:nowrap;">' + mad(o.paid) + '</td>'
        + '<td style="white-space:nowrap;">' + mad(o.charges) + '</td>'
        + '<td style="white-space:nowrap;" class="' + (o.profit >= 0 ? 'rd-pos' : 'rd-neg') + '">' + mad(o.profit) + '</td>'
        + '<td style="white-space:nowrap;">' + (o.unit ? '<button class="btn-sm ghost" onclick="event.stopPropagation();rdAddCharge(\'' + esc(o.key) + '\')">+ Charge</button>' : '') + '</td>'
        + '</tr>';
    }).join('');
    root.innerHTML = head + kp
      + '<div class="table-card"><div class="table-header"><div class="table-title">Par véhicule</div><div class="rd-sub">Cliquez sur une voiture pour voir son détail</div></div>'
      + '<div style="overflow-x:auto;"><table><thead><tr><th>Véhicule</th><th>Jours loués</th><th>Occupation</th><th>Chiffre d\'affaires</th><th>Encaissé</th><th>Charges</th><th>Bénéfice</th><th></th></tr></thead>'
      + '<tbody>' + (rows || '<tr><td colspan="8" style="text-align:center;padding:30px;color:var(--text3);">Aucun véhicule.</td></tr>') + '</tbody></table></div></div>';
  };

  function renderUnit(st, per, R) {
    var o = R.list.filter(function (x) { return x.key === st.unit; })[0];
    if (!o) { st.unit = null; return '<div class="rd-sec">Véhicule introuvable.</div>'; }
    var year = st.mode === 'month' ? +st.ym.slice(0, 4) : (st.mode === 'year' ? st.year : +String(st.from).slice(0, 4));
    var series = monthly(o.key, year);
    var vals = series.map(function (m) { return st.chart === 'days' ? m.days : m.ca; });
    var mx = Math.max.apply(null, vals.concat([1]));
    var chart = '<div class="rd-chart">' + vals.map(function (v, i) {
      return '<div class="c" onclick="rdMonthClick(' + year + ',' + i + ')" title="Voir ' + RD_MONTHS[i] + ' ' + year + '"><span>' + (v > 0 ? (st.chart === 'days' ? num(v) + ' j' : (v >= 1000 ? (Math.round(v / 100) / 10).toLocaleString('fr-FR') + 'k' : num(v))) : '') + '</span><b style="height:' + Math.round(v / mx * 150) + 'px"></b></div>';
    }).join('') + '</div><div class="rd-mlab">' + RD_MSHORT.map(function (m) { return '<div>' + m + '</div>'; }).join('') + '</div>';
    var resRows = Object.keys(o.res).map(function (k) { return o.res[k]; }).sort(function (a, b) { return String(b.r.startDate).localeCompare(String(a.r.startDate)); }).map(function (x) {
      var r = x.r, fd = function (d) { return String(d || '').slice(0, 10).split('-').reverse().join('/'); };
      return '<tr class="rd-row" onclick="rdOpenRes(\'' + esc(r.id) + '\')"><td><strong>' + esc(r.contractRef || r.id) + '</strong></td><td>' + esc(r.client || '') + '</td><td style="white-space:nowrap;">' + fd(r.startDate) + ' → ' + fd(r.endDate) + '</td><td>' + num(x.days) + ' j</td><td style="white-space:nowrap;">' + mad(x.ca) + '</td><td style="white-space:nowrap;">' + mad(x.paid) + '</td></tr>';
    }).join('');
    var chRows = R.chargeLines.filter(function (l) { return l.key === o.key; }).sort(function (a, b) { return String(b.c.date).localeCompare(String(a.c.date)); }).map(function (l) {
      var c = l.c;
      return '<tr class="rd-row" onclick="openChargeModal(\'' + esc(c.id) + '\')"><td style="white-space:nowrap;">' + String(c.date || '').slice(0, 10).split('-').reverse().join('/') + '</td><td><strong>' + esc(c.category || 'Autre') + '</strong>' + (c.description ? '<div class="rd-sub">' + esc(c.description) + '</div>' : '') + '</td>'
        + '<td style="white-space:nowrap;"><strong>' + mad(l.part) + '</strong>' + (l.n > 1 ? '<div class="rd-sub">' + (l.legacy ? 'ancienne charge du modèle, ' : '') + 'partagée sur ' + l.n + ' voitures (' + mad(c.amount) + ')</div>' : '') + '</td>'
        + '<td>' + (c.status === 'pending' ? '<span style="color:#b45309;font-weight:600;">À payer</span>' : 'Payée') + (c.paidBy ? '<div class="rd-sub">' + esc(c.paidBy) + (c.payMode ? ' · ' + esc(c.payMode) : '') + '</div>' : '') + '</td></tr>';
    }).join('');
    var occ = o.occ == null ? '—' : Math.round(o.occ) + ' %';
    return '<div class="rd-sec"><h3><span><button class="btn-sm ghost" onclick="rdBack()">← Tous les véhicules</button> &nbsp;' + esc(o.label) + ' <span class="rd-sub" style="font-size:13px;">' + esc(o.sub) + '</span></span>'
      + (o.unit ? '<button class="btn-sm primary" onclick="rdAddCharge(\'' + esc(o.key) + '\')">+ Charge pour cette voiture</button>' : '') + '</h3>'
      + '<div class="rd-kpis" style="margin-bottom:0;">'
      + kpi('Jours loués', num(o.days) + ' j', o.planned > 0.5 ? '+ ' + num(o.planned) + ' j à venir' : '')
      + kpi('Occupation', occ, R.elapsed ? 'sur ' + R.elapsed + ' jour' + (R.elapsed > 1 ? 's' : '') + ' écoulé' + (R.elapsed > 1 ? 's' : '') : '')
      + kpi('Chiffre d\'affaires', mad(o.ca), 'Encaissé : ' + mad(o.paid) + (o.days > 0 ? ' · ' + mad(o.ca / o.days) + ' / jour' : ''))
      + kpi('Charges', mad(o.charges))
      + kpi('Bénéfice', mad(o.profit), '', o.profit >= 0 ? 'rd-pos' : 'rd-neg')
      + '</div></div>'
      + '<div class="rd-sec"><h3><span>Par mois — ' + year + '</span><span class="rd-seg"><button class="' + (st.chart === 'days' ? 'on' : '') + '" onclick="rdSet(\'chart\',\'days\')">Jours loués</button><button class="' + (st.chart === 'ca' ? 'on' : '') + '" onclick="rdSet(\'chart\',\'ca\')">Chiffre d\'affaires</button></span></h3>'
      + chart + '<div class="rd-sub" style="margin-top:8px;">Cliquez sur un mois pour afficher le détail de ce mois.</div></div>'
      + '<div class="rd-sec"><h3><span>Locations — ' + esc(per.label) + '</span></h3>'
      + (resRows ? '<div style="overflow-x:auto;"><table><thead><tr><th>Contrat</th><th>Client</th><th>Dates</th><th>Jours (période)</th><th>Montant (période)</th><th>Encaissé (période)</th></tr></thead><tbody>' + resRows + '</tbody></table></div>' : '<div class="rd-sub">Aucune location sur cette période.</div>') + '</div>'
      + '<div class="rd-sec"><h3><span>Charges — ' + esc(per.label) + '</span>' + (o.unit ? '<button class="btn-sm ghost" onclick="rdAddCharge(\'' + esc(o.key) + '\')">+ Charge</button>' : '') + '</h3>'
      + (chRows ? '<div style="overflow-x:auto;"><table><thead><tr><th>Date</th><th>Type</th><th>Part de cette voiture</th><th>Statut</th></tr></thead><tbody>' + chRows + '</tbody></table></div>' : '<div class="rd-sub">Aucune charge sur cette période.</div>') + '</div>';
  }

  try {
    if (typeof ASLDB !== 'undefined' && ASLDB.onChange) {
      ASLDB.onChange(function () {
        var p = document.getElementById('page-rendement');
        if (p && p.classList.contains('active') && !document.getElementById('rd-cm')) renderRendement();
      });
    }
  } catch (e) {}
})();
