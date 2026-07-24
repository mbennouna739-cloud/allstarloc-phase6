/* ============================================================
   ALL STAR LOC — LOT 6 (corrections finales)
   admin-lot6.js — Tarifs saisonniers groupés, documents clients,
                   filtre par mois clients.
   Chargé APRÈS admin-lot5.js. N'écrase aucune logique métier :
   réutilise ASLDB.dailyRate (source unique de calcul).
   ============================================================ */

/* ==================== UTILITAIRES PARTAGÉS ==================== */

var ASL_MONTHS = ['', 'Janvier','Février','Mars','Avril','Mai','Juin','Juillet','Août','Septembre','Octobre','Novembre','Décembre'];

function asl6Fleet() {
  try { return (typeof ASLDB !== 'undefined' && ASLDB.getFleet) ? ASLDB.getFleet() : (typeof FLEET !== 'undefined' ? FLEET : []); } catch(e) { return []; }
}
function asl6Res() {
  try { return (typeof ASLDB !== 'undefined' && ASLDB.getReservations) ? ASLDB.getReservations() : (typeof RESERVATIONS !== 'undefined' ? RESERVATIONS : []); } catch(e) { return []; }
}
function asl6Toast(msg) {
  if (typeof showToast === 'function') showToast(msg);
}

/* ============================================================
   1. TARIFS SAISONNIERS GROUPÉS
   Écrit dans car.seasonalTiers (déjà lu par ASLDB.dailyRate).
   => Calcul unique partout : site, fiche, réservation, WhatsApp.
   ============================================================ */

var _seasonTiers = [];   /* tranches en cours d'édition : {min,max,price} */
var _seasonMonths = {};  /* {1:true, 7:true ...} mois sélectionnés */

function openSeasonalManager() {
  _seasonTiers = [{ min: 1, max: 3, price: '' }, { min: 4, max: 7, price: '' }, { min: 8, max: 15, price: '' }];
  _seasonMonths = {};
  _renderSeasonalBody();
  document.getElementById('seasonal-bg').style.display = 'block';
  document.getElementById('seasonal-modal').style.display = 'block';
}

function closeSeasonalManager() {
  var bg = document.getElementById('seasonal-bg');
  var md = document.getElementById('seasonal-modal');
  if (bg) bg.style.display = 'none';
  if (md) md.style.display = 'none';
}

function _renderSeasonalBody() {
  var body = document.getElementById('seasonal-body');
  if (!body) return;
  var fleet = asl6Fleet();

  /* --- Section mois --- */
  var monthsHtml = '<div style="font-weight:700;margin-bottom:8px;">1. Sélectionnez le ou les mois concernés</div>' +
    '<div style="display:flex;flex-wrap:wrap;gap:6px;margin-bottom:18px;">';
  for (var m = 1; m <= 12; m++) {
    var on = _seasonMonths[m];
    monthsHtml += '<button type="button" data-m="' + m + '" onclick="toggleSeasonMonth(' + m + ')" ' +
      'style="padding:6px 12px;border-radius:8px;cursor:pointer;font-size:12.5px;font-weight:600;border:1.5px solid ' +
      (on ? 'var(--red);background:var(--red);color:#fff;' : 'var(--border);background:transparent;color:var(--text2);') + '">' +
      ASL_MONTHS[m] + '</button>';
  }
  monthsHtml += '</div>';

  /* --- Section tranches --- */
  var tiersHtml = '<div style="font-weight:700;margin-bottom:8px;">2. Définissez les tranches de durée et les prix</div>';
  tiersHtml += '<div id="season-tiers-list">';
  _seasonTiers.forEach(function(t, i) {
    tiersHtml += '<div style="display:flex;gap:8px;align-items:center;margin-bottom:8px;">' +
      '<input class="form-input" type="number" min="1" value="' + (t.min||'') + '" placeholder="de" style="width:70px;" oninput="updateSeasonTier(' + i + ',\'min\',this.value)">' +
      '<span style="color:var(--text3);">à</span>' +
      '<input class="form-input" type="number" min="1" value="' + (t.max||'') + '" placeholder="à" style="width:70px;" oninput="updateSeasonTier(' + i + ',\'max\',this.value)">' +
      '<span style="color:var(--text3);font-size:13px;">jours →</span>' +
      '<input class="form-input" type="number" min="0" value="' + (t.price||'') + '" placeholder="Prix/j" style="width:100px;" oninput="updateSeasonTier(' + i + ',\'price\',this.value)">' +
      '<span style="color:var(--text3);font-size:13px;">DH/jour</span>' +
      '<button type="button" onclick="removeSeasonTier(' + i + ')" style="background:none;border:none;cursor:pointer;color:var(--red);font-size:18px;line-height:1;margin-left:auto;">&times;</button>' +
      '</div>';
  });
  tiersHtml += '</div>';
  tiersHtml += '<button type="button" class="btn-sm ghost" onclick="addSeasonTier()" style="margin-bottom:18px;">+ Ajouter une tranche</button>';

  /* --- Section véhicules --- */
  var vehHtml = '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">' +
    '<div style="font-weight:700;">3. Sélectionnez les véhicules concernés</div>' +
    '<button type="button" class="btn-sm ghost" onclick="toggleAllSeasonCars()" style="font-size:11px;">Tout sélectionner</button></div>';
  vehHtml += '<div style="display:grid;grid-template-columns:1fr 1fr;gap:6px;max-height:200px;overflow-y:auto;border:1px solid var(--border);border-radius:10px;padding:10px;">';
  fleet.forEach(function(c) {
    vehHtml += '<label style="display:flex;align-items:center;gap:8px;font-size:13px;cursor:pointer;padding:4px;">' +
      '<input type="checkbox" class="season-car-cb" value="' + c.id + '" style="width:16px;height:16px;cursor:pointer;">' +
      '<span>' + c.name + '</span></label>';
  });
  vehHtml += '</div>';
  vehHtml += '<div style="font-size:11.5px;color:var(--text3);margin-top:10px;line-height:1.5;">' +
    'Les tarifs personnalisés déjà définis dans chaque fiche véhicule sont conservés. ' +
    'Cet outil ajoute/remplace uniquement les tranches des mois sélectionnés ci-dessus.</div>';

  body.innerHTML = monthsHtml + tiersHtml + vehHtml;
}

function toggleSeasonMonth(m) {
  _seasonMonths[m] = !_seasonMonths[m];
  _renderSeasonalBody();
}
function addSeasonTier() {
  var last = _seasonTiers[_seasonTiers.length - 1];
  var nextMin = last ? (Number(last.max) + 1 || 1) : 1;
  _seasonTiers.push({ min: nextMin, max: nextMin + 6, price: '' });
  _renderSeasonalBody();
}
function removeSeasonTier(i) {
  _seasonTiers.splice(i, 1);
  _renderSeasonalBody();
}
function updateSeasonTier(i, field, val) {
  if (_seasonTiers[i]) _seasonTiers[i][field] = val;
}
function toggleAllSeasonCars() {
  var cbs = document.querySelectorAll('.season-car-cb');
  var allOn = Array.prototype.every.call(cbs, function(cb){ return cb.checked; });
  cbs.forEach(function(cb){ cb.checked = !allOn; });
}

function applySeasonalGroup() {
  var months = Object.keys(_seasonMonths).filter(function(m){ return _seasonMonths[m]; }).map(Number);
  if (!months.length) { alert('Sélectionnez au moins un mois.'); return; }

  var tiers = _seasonTiers
    .map(function(t){ return { min: Number(t.min)||1, max: Number(t.max)||9999, price: Number(t.price)||0 }; })
    .filter(function(t){ return t.price > 0; });
  if (!tiers.length) { alert('Définissez au moins une tranche avec un prix.'); return; }

  var carIds = Array.prototype.map.call(document.querySelectorAll('.season-car-cb:checked'), function(cb){ return parseInt(cb.value); });
  if (!carIds.length) { alert('Sélectionnez au moins un véhicule.'); return; }

  if (typeof ASLDB === 'undefined' || !ASLDB.updateVehicle) { alert('Erreur : module données indisponible.'); return; }

  var fleet = asl6Fleet();
  var applied = 0;
  carIds.forEach(function(id) {
    var car = fleet.find(function(c){ return c.id === id; });
    if (!car) return;
    /* Conserver les tranches existantes des autres mois */
    var existing = Array.isArray(car.seasonalTiers) ? car.seasonalTiers.slice() : [];
    existing = existing.filter(function(r){ return months.indexOf(Number(r.month)) < 0; });
    /* Ajouter les nouvelles tranches pour chaque mois sélectionné */
    months.forEach(function(mo) {
      tiers.forEach(function(t) {
        existing.push({ month: mo, minDays: t.min, maxDays: t.max, pricePerDay: t.price, active: true });
      });
    });
    ASLDB.updateVehicle(id, { seasonalTiers: existing });
    applied++;
  });

  // Fermer le pop-up et confirmer AVANT le rendu, pour que la confirmation
  // s'affiche toujours (même si un rendu ultérieur rencontrait un souci).
  var monthNames = months.map(function(m){ return ASL_MONTHS[m]; }).join(', ');
  try { closeSeasonalManager(); } catch (e) {}
  asl6Toast('Tarifs ' + monthNames + ' appliqués à ' + applied + ' véhicule(s) ✓ Synchronisé.');
  try { if (typeof reloadData === 'function') reloadData(); } catch (e) {}
  try { if (typeof renderFleetPage === 'function') renderFleetPage(); } catch (e) { console.error('renderFleetPage:', e); }
  try { if (typeof ASLDB !== 'undefined' && ASLDB.syncNow) ASLDB.syncNow(); } catch (e) {}
}

/* ============================================================
   2 + 3. CLIENTS : filtre par mois + fiche avec documents
   On surcharge renderCustomers SANS supprimer les colonnes
   existantes ; on ajoute filtre mois + lignes cliquables.
   Documents stockés en localStorage (clé par email client).
   ============================================================ */

function _custDocsKey() { return 'asl_cust_docs_v1'; }
function _loadCustDocs() {
  try { return JSON.parse(localStorage.getItem(_custDocsKey()) || '{}'); } catch(e) { return {}; }
}
function _saveCustDocs(obj) {
  try { localStorage.setItem(_custDocsKey(), JSON.stringify(obj)); } catch(e) { alert('Stockage plein : document trop volumineux.'); }
}
function _custId(email, name) {
  return (email && email.trim()) ? email.trim().toLowerCase() : ('name:' + (name||'').trim().toLowerCase());
}

/* ★ CORRECTIF — Pont manquant entre les documents collés/déposés lors d'une
   création (Nouvelle réservation / Nouvelle location) et la fiche client.
   Cette fonction était APPELÉE (saveCustomerDocs(...)) mais n'existait
   NULLE PART : les documents ajoutés à la création n'étaient donc jamais
   associés au client, même si collectDocs() les récupérait correctement.
   Fusionne avec les documents déjà existants du client (ne remplace jamais
   un document déjà présent par du vide). */
function saveCustomerDocs(email, name, docs) {
  if (!docs || (!docs.permis && !docs.identite)) return;
  var key = _custId(email, name);
  var all = _loadCustDocs();
  if (!all[key]) all[key] = {};
  if (docs.permis) all[key].permis = docs.permis;
  if (docs.identite) all[key].identite = docs.identite;
  _saveCustDocs(all);
}

/* Surcharge propre de renderCustomers (garde toutes les colonnes d'origine
   + ajoute filtre mois + clic pour ouvrir la fiche). */
function renderCustomers() {
  try {
    var res = asl6Res();
    var monthFilter = parseInt((document.getElementById('cust-month-filter') && document.getElementById('cust-month-filter').value) || '0');
    var q = ((document.getElementById('cust-search') && document.getElementById('cust-search').value) || '').toLowerCase().trim();

    // ★ Item 8 — Libellés lisibles pour l'origine du client (source de la
    //   réservation). "Site Web" pour les réservations en ligne ; les autres
    //   valeurs sont choisies par l'admin lors de la création manuelle.
    var ORIGIN_LABELS = {
      online: 'Site Web', manual: 'Réservation manuelle', phone: 'Téléphone',
      whatsapp: 'WhatsApp', partner: 'Partenaire', gbp: 'Google Business Profile',
      facebook: 'Facebook', instagram: 'Instagram'
    };
    var customers = {};
    res.forEach(function(r) {
      var key = _custId(r.email, r.client);
      if (!customers[key]) {
        customers[key] = { key: key, name: r.client, email: r.email || '', phone: r.phone || '', nationality: r.nationality || '', count: 0, total: 0, unpaid: 0, last: '', months: {}, origin: r.source || '' };
      }
      var c = customers[key];
      c.count++;
      c.total += (Number(r.amount) || 0);
      /* Montant impayé = somme des restes à payer (hors annulées), synchronisé avec réservations/locations/paiements */
      if (r.status !== 'cancelled') {
        var rReste = Math.max(0, (Number(r.amount) || 0) - (Number(r.paid) || 0));
        c.unpaid += rReste;
      }
      // ★ Origine : celle de la réservation la plus récente du client.
      if ((r.startDate || '') > c.last) { c.last = r.startDate || ''; if (r.source) c.origin = r.source; }
      var mo = (typeof ASLDB !== 'undefined' && ASLDB.monthOfISO) ? ASLDB.monthOfISO(r.startDate) : 0;
      if (mo) c.months[mo] = true;
      if (!c.name && r.client) c.name = r.client;
      if (!c.phone && r.phone) c.phone = r.phone;
      if (!c.nationality && r.nationality) c.nationality = r.nationality;
    });

    var list = Object.keys(customers).map(function(k){ return customers[k]; });

    if (monthFilter) list = list.filter(function(c){ return c.months[monthFilter]; });
    if (q) list = list.filter(function(c){
      return ((c.name||'') + ' ' + (c.email||'') + ' ' + (c.phone||'')).toLowerCase().indexOf(q) >= 0;
    });
    list.sort(function(a,b){ return String(b.last).localeCompare(String(a.last)); });

    var docs = _loadCustDocs();
    var tbody = document.getElementById('customers-table');
    if (!tbody) return;
    if (!list.length) {
      tbody.innerHTML = '<tr><td colspan="9" style="text-align:center;padding:30px;color:var(--text3);">Aucun client' + (monthFilter ? ' pour ' + ASL_MONTHS[monthFilter] : '') + '.</td></tr>';
      return;
    }
    tbody.innerHTML = list.map(function(c) {
      var d = docs[c.key] || {};
      var docCount = ['permis','identite'].filter(function(t){ return d[t]; }).length;
      var docBadge = docCount ? '<span class="badge badge-green" style="margin-left:6px;font-size:10px;">📎 ' + docCount + '</span>' : '';
      var unpaid = Number(c.unpaid) || 0;
      var unpaidCell = unpaid > 0
        ? '<td><strong style="color:#ef4444;">' + unpaid.toLocaleString('fr-FR') + ' MAD</strong></td>'
        : '<td style="color:var(--text3);">—</td>';
      return '<tr style="cursor:pointer;" onclick="openCustomerDrawer(\'' + encodeURIComponent(c.key) + '\')">' +
        '<td><strong>' + (c.name||'—') + '</strong>' + docBadge + '</td>' +
        '<td style="color:var(--text2);font-size:12px;">' + (c.email||'—') + '</td>' +
        '<td style="font-size:12px;">' + (c.phone||'—') + '</td>' +
        '<td><span class="badge badge-gray">' + (c.nationality||'N/A') + '</span></td>' +
        '<td><span class="badge badge-blue" style="font-size:11px;">' + (ORIGIN_LABELS[c.origin] || c.origin || '—') + '</span></td>' +
        '<td style="text-align:center;"><strong>' + c.count + '</strong></td>' +
        '<td><strong style="color:var(--green);">' + (Number(c.total)||0).toLocaleString('fr-FR') + ' MAD</strong></td>' +
        unpaidCell +
        '<td style="font-size:12px;color:var(--text2);">' + (c.last||'—') + '</td>' +
        '</tr>';
    }).join('');
  } catch(e) { console.error('renderCustomers(lot6):', e); }
}

function openCustomerDrawer(encKey) {
  var key = decodeURIComponent(encKey);
  var res = asl6Res();
  var cust = null;
  var custRes = [];
  res.forEach(function(r) {
    if (_custId(r.email, r.client) === key) {
      custRes.push(r);
      if (!cust) cust = { name: r.client, email: r.email||'', phone: r.phone||'', nationality: r.nationality||'' };
      else {
        if (!cust.phone && r.phone) cust.phone = r.phone;
        if (!cust.nationality && r.nationality) cust.nationality = r.nationality;
      }
    }
  });
  if (!cust) return;
  custRes.sort(function(a,b){ return String(b.startDate||'').localeCompare(String(a.startDate||'')); });

  var docs = _loadCustDocs();
  var d = docs[key] || {};
  var totalSpent = custRes.reduce(function(s,r){ return s + (Number(r.amount)||0); }, 0);
  var totalPaid  = custRes.reduce(function(s,r){ return s + (Number(r.paid)||0); }, 0);
  var totalDue   = Math.max(0, totalSpent - totalPaid);

  var titleEl = document.getElementById('cust-drawer-title');
  var bodyEl  = document.getElementById('cust-drawer-body');
  if (titleEl) titleEl.textContent = cust.name || 'Client';

  /* Infos + résumé financier (lecture seule, dérivé de l'existant) */
  var html =
    '<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:16px;">' +
    _c6cell('Téléphone', cust.phone||'—') +
    _c6cell('Email', '<span style="font-size:12px;">' + (cust.email||'—') + '</span>') +
    _c6cell('Nationalité', cust.nationality||'—') +
    _c6cell('Locations', String(custRes.length)) +
    '</div>' +
    '<div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px;margin-bottom:18px;">' +
    '<div style="background:rgba(34,197,94,.08);border-radius:8px;padding:10px;text-align:center;"><div style="font-size:11px;color:var(--text3);">Total</div><div style="font-weight:800;color:#16a34a;font-size:15px;">' + totalSpent.toLocaleString('fr-FR') + '</div></div>' +
    '<div style="background:rgba(59,130,246,.08);border-radius:8px;padding:10px;text-align:center;"><div style="font-size:11px;color:var(--text3);">Payé</div><div style="font-weight:800;color:#3b82f6;font-size:15px;">' + totalPaid.toLocaleString('fr-FR') + '</div></div>' +
    '<div style="background:rgba(239,68,68,.08);border-radius:8px;padding:10px;text-align:center;"><div style="font-size:11px;color:var(--text3);">Reste dû</div><div style="font-weight:800;color:' + (totalDue>0?'#ef4444':'#16a34a') + ';font-size:15px;">' + totalDue.toLocaleString('fr-FR') + '</div></div>' +
    '</div>';

  /* Documents d'identité */
  html += '<div style="font-weight:800;font-size:14px;margin-bottom:10px;border-top:1px solid var(--border);padding-top:16px;">Documents d\'identité</div>';
  html += _docBlock(key, 'permis', 'Permis de conduire', d.permis);
  html += _docBlock(key, 'identite', 'Carte d\'identité (CIN) ou Passeport', d.identite, d.identiteType);
  html += '<div style="font-size:11px;color:var(--text3);margin-top:6px;line-height:1.5;">Les documents restent associés au client pour toutes ses futures réservations.</div>';

  /* Historique réservations */
  html += '<div style="font-weight:800;font-size:14px;margin:20px 0 10px;border-top:1px solid var(--border);padding-top:16px;">Historique des réservations</div>';
  if (!custRes.length) {
    html += '<div style="color:var(--text3);font-size:13px;">Aucune réservation.</div>';
  } else {
    html += custRes.map(function(r) {
      var total = Number(r.amount)||0, paid = Number(r.paid)||0, reste = Math.max(0, total-paid);
      var st = (typeof statusBadge === 'function') ? statusBadge(r.status) : (r.status||'');
      return '<div style="border:1px solid var(--border);border-radius:10px;padding:12px;margin-bottom:8px;">' +
        '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:4px;">' +
        '<strong>' + (r.contractRef||r.id) + '</strong>' + st + '</div>' +
        '<div style="font-size:12.5px;color:var(--text2);">' + (r.car||'') + ' · ' + (r.startDate||'') + ' → ' + (r.endDate||'') + '</div>' +
        '<div style="font-size:12.5px;margin-top:4px;">Total : <strong>' + total.toLocaleString('fr-FR') + ' MAD</strong>' +
        (reste>0 ? ' · <span style="color:#ef4444;">Reste ' + reste.toLocaleString('fr-FR') + ' MAD</span>' : ' · <span style="color:#16a34a;">Soldé</span>') + '</div>' +
        '</div>';
    }).join('');
  }

  if (bodyEl) bodyEl.innerHTML = html;
  document.getElementById('cust-drawer-bg').style.display = 'block';
  var dr = document.getElementById('cust-drawer');
  dr.style.display = 'flex';
  dr.style.transform = 'translateX(0)';
}

function _c6cell(label, val) {
  return '<div style="background:rgba(18,22,30,.03);border-radius:8px;padding:10px;">' +
    '<div style="font-size:11px;color:var(--text3);margin-bottom:2px;">' + label + '</div>' +
    '<div style="font-size:13px;font-weight:600;">' + val + '</div></div>';
}

function _docBlock(key, type, label, dataUrl, subType) {
  var enc = encodeURIComponent(key);
  var inner;
  if (dataUrl) {
    var isPdf = dataUrl.indexOf('application/pdf') >= 0;
    var preview = isPdf
      ? '<div style="width:54px;height:54px;border-radius:8px;background:rgba(196,30,58,.1);display:flex;align-items:center;justify-content:center;color:var(--red);font-weight:700;font-size:11px;flex-shrink:0;">PDF</div>'
      : '<img src="' + dataUrl + '" style="width:54px;height:54px;border-radius:8px;object-fit:cover;flex-shrink:0;cursor:pointer;" onclick="window.open(\'\').document.write(\'<img src=&quot;' + '' + '&quot;>\')">';
    inner =
      '<div style="display:flex;align-items:center;gap:12px;">' +
      preview +
      '<div style="flex:1;"><div style="font-weight:600;font-size:13px;">' + label + '</div>' +
      (subType ? '<div style="font-size:11px;color:var(--text3);">' + subType + '</div>' : '') +
      '<div style="display:flex;gap:6px;margin-top:6px;flex-wrap:wrap;">' +
      '<button class="btn-sm ghost" onclick="previewCustDoc(\'' + enc + '\',\'' + type + '\')">Aperçu</button>' +
      '<button class="btn-sm ghost" onclick="downloadCustDoc(\'' + enc + '\',\'' + type + '\')">Télécharger</button>' +
      '<button class="btn-sm ghost" onclick="document.getElementById(\'docin-' + type + '\').click()">Remplacer</button>' +
      '<button class="btn-sm ghost" style="color:var(--red);" onclick="deleteCustDoc(\'' + enc + '\',\'' + type + '\')">Supprimer</button>' +
      '</div></div></div>';
  } else {
    inner =
      '<div style="display:flex;align-items:center;justify-content:space-between;gap:12px;">' +
      '<div style="font-weight:600;font-size:13px;color:var(--text2);">' + label + '<div style="font-size:11px;color:var(--text3);font-weight:400;">Aucun document — cliquez ici puis Ctrl+V pour coller une image, ou glissez-déposez un fichier</div></div>' +
      '<button class="btn-sm primary" onclick="document.getElementById(\'docin-' + type + '\').click()">+ Ajouter</button>' +
      '</div>';
  }
  var accept = 'image/*,application/pdf';
  var onchange = type === 'identite'
    ? 'uploadCustDoc(\'' + enc + '\',\'identite\',this)'
    : 'uploadCustDoc(\'' + enc + '\',\'' + type + '\',this)';
  // ★ CORRECTIF (point 5) : zone entière collable (Ctrl+V) et glissable-déposable
  //   (drag & drop), en plus de la sélection de fichier classique — pour les 3
  //   documents (permis, CIN, passeport), sans changer le reste du fonctionnement.
  return '<div tabindex="0" class="doc-drop-zone" style="border:1px solid var(--border);border-radius:10px;padding:12px;margin-bottom:8px;outline:none;cursor:text;" ' +
    'title="Cliquez puis Ctrl+V pour coller une image, ou glissez-déposez un fichier" ' +
    'onpaste="pasteCustDoc(\'' + enc + '\',\'' + type + '\',event)" ' +
    'ondragover="event.preventDefault();this.classList.add(\'doc-drop-active\')" ' +
    'ondragleave="this.classList.remove(\'doc-drop-active\')" ' +
    'ondrop="dropCustDoc(\'' + enc + '\',\'' + type + '\',event)">' + inner +
    '<input type="file" id="docin-' + type + '" accept="' + accept + '" style="display:none;" onchange="' + onchange + '"></div>';
}

function uploadCustDoc(encKey, type, input) {
  var file = input && input.files && input.files[0];
  if (!file) return;
  _saveDocFile(encKey, type, file);
  input.value = '';
}

/* ★ CORRECTIF (point 5) — Logique de sauvegarde extraite pour être partagée
   entre sélection de fichier, coller (Ctrl+V) et glisser-déposer. */
function _saveDocFile(encKey, type, file) {
  var key = decodeURIComponent(encKey);
  if (!file) return;
  if (file.size > 3 * 1024 * 1024) { alert('Fichier trop volumineux (max 3 Mo).'); return; }
  var reader = new FileReader();
  reader.onload = function(e) {
    var docs = _loadCustDocs();
    if (!docs[key]) docs[key] = {};
    docs[key][type] = e.target.result;
    if (type === 'identite') {
      var t = prompt('Type de document ?\nTapez 1 pour CIN, 2 pour Passeport :', '1');
      docs[key].identiteType = (t === '2') ? 'Passeport' : 'CIN (Carte d\'identité nationale)';
    }
    _saveCustDocs(docs);
    openCustomerDrawer(encKey);
    renderCustomers();
    asl6Toast('Document enregistré et associé au client ✓');
  };
  reader.readAsDataURL(file);
}

/* ★ CORRECTIF (point 5) — Coller une image copiée (Ctrl+V / "Copier" sur
   téléphone) directement dans la zone du document, sans sélectionner de
   fichier. Fonctionne pour tous les documents (permis, CIN, passeport). */
function pasteCustDoc(encKey, type, ev) {
  var items = (ev.clipboardData && ev.clipboardData.items) || [];
  for (var i = 0; i < items.length; i++) {
    if (items[i].type && items[i].type.indexOf('image') === 0) {
      var file = items[i].getAsFile();
      if (file) { ev.preventDefault(); _saveDocFile(encKey, type, file); return; }
    }
  }
}

/* ★ CORRECTIF (point 5) — Glisser-déposer une image sur la zone du document. */
function dropCustDoc(encKey, type, ev) {
  ev.preventDefault();
  if (ev.currentTarget && ev.currentTarget.classList) ev.currentTarget.classList.remove('doc-drop-active');
  var file = ev.dataTransfer && ev.dataTransfer.files && ev.dataTransfer.files[0];
  if (file) _saveDocFile(encKey, type, file);
}

function previewCustDoc(encKey, type) {
  var key = decodeURIComponent(encKey);
  var docs = _loadCustDocs();
  var url = docs[key] && docs[key][type];
  if (!url) return;
  var w = window.open('');
  if (!w) { alert('Autorisez les pop-ups pour l\'aperçu.'); return; }
  if (url.indexOf('application/pdf') >= 0) {
    w.document.write('<iframe src="' + url + '" style="width:100%;height:100%;border:none;"></iframe>');
  } else {
    w.document.write('<body style="margin:0;background:#111;display:flex;align-items:center;justify-content:center;height:100vh;"><img src="' + url + '" style="max-width:100%;max-height:100%;"></body>');
  }
}

function downloadCustDoc(encKey, type) {
  var key = decodeURIComponent(encKey);
  var docs = _loadCustDocs();
  var url = docs[key] && docs[key][type];
  if (!url) return;
  var ext = url.indexOf('application/pdf') >= 0 ? 'pdf' : (url.indexOf('image/png') >= 0 ? 'png' : 'jpg');
  var a = document.createElement('a');
  a.href = url;
  a.download = type + '_' + key.replace(/[^a-z0-9]/gi,'_') + '.' + ext;
  document.body.appendChild(a); a.click(); document.body.removeChild(a);
}

function deleteCustDoc(encKey, type) {
  if (!confirm('Supprimer ce document ?')) return;
  var key = decodeURIComponent(encKey);
  var docs = _loadCustDocs();
  if (docs[key]) {
    delete docs[key][type];
    if (type === 'identite') delete docs[key].identiteType;
    _saveCustDocs(docs);
  }
  openCustomerDrawer(encKey);
  renderCustomers();
  asl6Toast('Document supprimé ✓');
}

function closeCustomerDrawer() {
  var bg = document.getElementById('cust-drawer-bg');
  var dr = document.getElementById('cust-drawer');
  if (bg) bg.style.display = 'none';
  if (dr) { dr.style.transform = 'translateX(100%)'; setTimeout(function(){ dr.style.display='none'; dr.style.transform=''; }, 280); }
}
