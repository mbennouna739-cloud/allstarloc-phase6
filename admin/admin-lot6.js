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

/* ============================================================
   ★ CORRECTIF (point 5) — Compression d'image avant stockage.
   Une photo de téléphone pèse souvent 3 à 8 Mo ; stockée telle quelle,
   plusieurs documents (recto/verso × 3 documents) dépassaient vite la
   capacité du navigateur ("stockage plein"). En la redimensionnant et en
   la recompressant en JPEG, on obtient un fichier de ~100-400 Ko sans
   perte de lisibilité perceptible pour un document d'identité — cela
   règle la cause réelle du problème plutôt que d'augmenter une limite.
   Les PDF ne sont jamais recompressés (ils passent tels quels).
   ============================================================ */
function _compressImageFile(file, maxDim, quality) {
  maxDim = maxDim || 1600; quality = quality || 0.75;
  return new Promise(function (resolve) {
    if (!file.type || file.type.indexOf('image') !== 0) {
      // PDF ou autre : pas de compression possible, on lit tel quel
      var r0 = new FileReader();
      r0.onload = function (e) { resolve(e.target.result); };
      r0.onerror = function () { resolve(null); };
      r0.readAsDataURL(file);
      return;
    }
    var img = new Image();
    var reader = new FileReader();
    reader.onload = function (e) {
      img.onload = function () {
        var w = img.width, h = img.height;
        if (w > maxDim || h > maxDim) {
          if (w >= h) { h = Math.round(h * maxDim / w); w = maxDim; }
          else { w = Math.round(w * maxDim / h); h = maxDim; }
        }
        var canvas = document.createElement('canvas');
        canvas.width = w; canvas.height = h;
        var ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, w, h);
        try {
          resolve(canvas.toDataURL('image/jpeg', quality));
        } catch (err) {
          resolve(e.target.result); // repli : image d'origine si le canvas échoue
        }
      };
      img.onerror = function () { resolve(e.target.result); };
      img.src = e.target.result;
    };
    reader.onerror = function () { resolve(null); };
    reader.readAsDataURL(file);
  });
}

/* Normalise une entrée de document (ancien format = chaîne unique, nouveau
   format = tableau) en tableau, pour une rétrocompatibilité totale avec
   les documents déjà enregistrés avant ce correctif. */
function _docAsArray(entry) {
  if (!entry) return [];
  return Array.isArray(entry) ? entry : [entry];
}

function _custDocsKey() { return 'asl_cust_docs_v1'; }

/* ★ CORRECTIF (item 3) — Profil client modifiable. Les informations client
   (nom, téléphone, email, nationalité, adresse) sont normalement DÉRIVÉES
   des réservations (il n'existe pas de "fiche client" à part). Ce petit
   magasin de "surcharges" permet de les corriger/compléter manuellement
   depuis la fiche, sans dépendre d'une réservation existante. Synchronisé
   comme les autres données auxiliaires (MISC_MAP.custprofiles). */
function _custProfilesKey() { return 'asl_cust_profiles_v1'; }
function _loadCustProfiles() {
  try { return JSON.parse(localStorage.getItem(_custProfilesKey()) || '{}'); } catch(e) { return {}; }
}
function _saveCustProfiles(obj) {
  try { localStorage.setItem(_custProfilesKey(), JSON.stringify(obj)); } catch(e) {}
  try { if (typeof ASLDB !== 'undefined' && ASLDB.noteLocalChange) ASLDB.noteLocalChange(_custProfilesKey()); } catch(e) {}
  try { if (typeof ASLDB !== 'undefined' && ASLDB.syncNow) ASLDB.syncNow(); } catch(e) {}
}

/* ============================================================
   ★ CORRECTIF DÉFINITIF (point 10) — Deux causes réelles trouvées :

   1. CONDITION DE COURSE : chaque ajout de document compresse l'image
      (~200-500 ms) puis fait "lire → modifier → écrire" sur localStorage.
      Si on colle une 2e image AVANT que le 1er ajout ait fini d'écrire, le
      2e lit un état encore incomplet et écrase le 1er en écrivant après
      lui — exactement le symptôme "la 2e image remplace la 1re". Corrigé
      avec une file d'attente (_docSaveQueue) qui garantit que chaque
      ajout attend la fin complet du précédent avant de commencer.

   2. localStorage A UNE LIMITE PAR ORIGINE (5-10 Mo au total, pas juste
      par clé) — après plusieurs sessions de tests avec de nombreux
      documents, cette limite globale pouvait être atteinte MÊME avec des
      images compressées, bloquant tout nouvel ajout avec "stockage plein"
      et empêchant l'image collée de s'afficher. Corrigé en gardant TOUJOURS
      un cache EN MÉMOIRE (valable pour la session en cours) comme source
      de vérité : même si l'écriture sur localStorage échoue, l'image
      s'affiche immédiatement et part quand même vers le serveur (source
      définitive, sans limite pratique de ce type).
   ============================================================ */
var _custDocsMemCache = null; // cache en mémoire, toujours à jour
function _custDocsKey() { return 'asl_cust_docs_v1'; }

function _loadCustDocs() {
  if (_custDocsMemCache) return _custDocsMemCache; // priorité au cache mémoire (toujours fiable)
  try { _custDocsMemCache = JSON.parse(localStorage.getItem(_custDocsKey()) || '{}'); }
  catch (e) { _custDocsMemCache = {}; }
  return _custDocsMemCache;
}
function _saveCustDocs(obj) {
  _custDocsMemCache = obj; // ★ le cache mémoire fait TOUJOURS foi pour cette session
  try { localStorage.setItem(_custDocsKey(), JSON.stringify(obj)); }
  catch (e) {
    // Stockage local saturé : ce n'est PLUS bloquant — le document reste
    // disponible pour toute la session (cache mémoire) et part quand même
    // vers le serveur juste en dessous. On informe sans alarmer.
    if (typeof asl6Toast === 'function') asl6Toast('⚠ Cache local plein (sans conséquence) — document conservé et synchronisé normalement.');
  }
  try { if (typeof ASLDB !== 'undefined' && ASLDB.noteLocalChange) ASLDB.noteLocalChange(_custDocsKey()); } catch(e) {}
  try { if (typeof ASLDB !== 'undefined' && ASLDB.syncNow) ASLDB.syncNow(); } catch(e) {}
  // ★ LOT 44 : toute nouvelle image part vers le stockage privé.
  try { if (typeof aslMigrateDocsSoon === 'function') aslMigrateDocsSoon(); } catch(e) {}
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
  // ★ Points 3/5 : on AJOUTE au tableau existant, on ne remplace jamais.
  //   docs.permis/docs.identite peuvent désormais être un tableau (plusieurs
  //   images saisies dès la création, recto/verso) OU une valeur unique
  //   (rétrocompatibilité) — on CONCATÈNE dans les deux cas, on ne pousse
  //   jamais un tableau entier comme un seul élément imbriqué.
  if (docs.permis) { var pArr = _docAsArray(all[key].permis).concat(_docAsArray(docs.permis)); all[key].permis = pArr; }
  if (docs.identite) { var iArr = _docAsArray(all[key].identite).concat(_docAsArray(docs.identite)); all[key].identite = iArr; }
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
        customers[key] = { key: key, name: r.client, email: r.email || '', phone: r.phone || '', nationality: r.nationality || '', count: 0, total: 0, unpaid: 0, last: '', months: {}, origin: r.source || '', vehicles: [] };
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
      // ★ Point 2 : mémorise chaque véhicule (+ immatriculation) loué par ce
      //   client, pour permettre la recherche « par véhicule ».
      if (r.car || r.assignedPlate) {
        var vLabel = ((r.car||'') + ' ' + (r.assignedPlate||'')).trim();
        if (vLabel && c.vehicles.indexOf(vLabel) < 0) c.vehicles.push(vLabel);
      }
    });

    var list = Object.keys(customers).map(function(k){ return customers[k]; });

    if (monthFilter) list = list.filter(function(c){ return c.months[monthFilter]; });
    if (q) list = list.filter(function(c){
      // ★ Point 2 : recherche également par véhicule ou immatriculation —
      //   saisir "Kia Picanto" ou "1234-A-56" retrouve tous les clients
      //   ayant loué ce véhicule.
      return ((c.name||'') + ' ' + (c.email||'') + ' ' + (c.phone||'') + ' ' + (c.vehicles||[]).join(' ')).toLowerCase().indexOf(q) >= 0;
    });
    list.sort(function(a,b){ return String(b.last).localeCompare(String(a.last)); });

    var docs = _loadCustDocs();
    var profiles = _loadCustProfiles();
    var tbody = document.getElementById('customers-table');
    if (!tbody) return;
    if (!list.length) {
      tbody.innerHTML = '<tr><td colspan="10" style="text-align:center;padding:30px;color:var(--text3);">Aucun client' + (monthFilter ? ' pour ' + ASL_MONTHS[monthFilter] : '') + '.</td></tr>';
      return;
    }
    tbody.innerHTML = list.map(function(c) {
      var d = docs[c.key] || {};
      var p = profiles[c.key] || {};
      // ★ CORRECTIF (item 3) : les surcharges de la fiche (si modifiées) priment sur les valeurs dérivées des réservations.
      var dispName = (p.firstName != null || p.lastName != null) ? ((p.firstName||'') + ' ' + (p.lastName||'')).trim() : c.name;
      var dispPhone = p.phone != null ? p.phone : c.phone;
      var dispEmail = p.email != null ? p.email : c.email;
      var dispNat = p.nationality != null ? p.nationality : c.nationality;
      var docCount = ['permis','identite'].filter(function(t){ return d[t]; }).length;
      var docBadge = docCount ? '<span class="badge badge-green" style="margin-left:6px;font-size:10px;">📎 ' + docCount + '</span>' : '';
      var unpaid = Number(c.unpaid) || 0;
      var unpaidCell = unpaid > 0
        ? '<td><strong style="color:#ef4444;">' + unpaid.toLocaleString('fr-FR') + ' MAD</strong></td>'
        : '<td style="color:var(--text3);">—</td>';
      return '<tr style="cursor:pointer;" onclick="openCustomerDrawer(\'' + encodeURIComponent(c.key) + '\')">' +
        '<td><strong>' + (dispName||'—') + '</strong>' + docBadge + '</td>' +
        '<td style="color:var(--text2);font-size:12px;">' + (dispEmail||'—') + '</td>' +
        '<td style="font-size:12px;">' + (dispPhone||'—') + '</td>' +
        '<td><span class="badge badge-gray">' + (dispNat||'N/A') + '</span></td>' +
        '<td><span class="badge badge-blue" style="font-size:11px;">' + (ORIGIN_LABELS[c.origin] || c.origin || '—') + '</span></td>' +
        '<td style="text-align:center;"><strong>' + c.count + '</strong></td>' +
        '<td><strong style="color:var(--green);">' + (Number(c.total)||0).toLocaleString('fr-FR') + ' MAD</strong></td>' +
        unpaidCell +
        '<td style="font-size:12px;color:var(--text2);">' + (c.last||'—') + '</td>' +
        '<td style="text-align:center;"><button class="btn-sm ghost" onclick="event.stopPropagation();openCustomerDrawer(\'' + encodeURIComponent(c.key) + '\')" title="Voir la fiche complète"><svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/></svg></button></td>' +
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
  // ★ CORRECTIF (item 3) : surcharges éventuelles (modifiées manuellement),
  //   sinon valeurs dérivées des réservations.
  var profiles = _loadCustProfiles();
  var prof = profiles[key] || {};
  var nameParts = String(cust.name||'').trim().split(/\s+/);
  var defFirst = nameParts.slice(0,-1).join(' ') || nameParts[0] || '';
  var defLast = nameParts.length > 1 ? nameParts[nameParts.length-1] : '';
  var firstName = prof.firstName != null ? prof.firstName : defFirst;
  var lastName  = prof.lastName  != null ? prof.lastName  : defLast;
  var phone = prof.phone != null ? prof.phone : (cust.phone||'');
  var email = prof.email != null ? prof.email : (cust.email||'');
  var nationality = prof.nationality != null ? prof.nationality : (cust.nationality||'');
  var address = prof.address != null ? prof.address : '';
  var profession = prof.profession != null ? prof.profession : (custRes[0] && custRes[0].profession || '');
  var totalSpent = custRes.reduce(function(s,r){ return s + (Number(r.amount)||0); }, 0);
  var totalPaid  = custRes.reduce(function(s,r){ return s + (Number(r.paid)||0); }, 0);
  var totalDue   = Math.max(0, totalSpent - totalPaid);

  var titleEl = document.getElementById('cust-drawer-title');
  var bodyEl  = document.getElementById('cust-drawer-body');
  if (titleEl) titleEl.textContent = cust.name || 'Client';

  /* ★ CORRECTIF (item 3) : fiche client complète et modifiable — nom,
     prénom, téléphone, email, nationalité, adresse. */
  var html =
    '<input type="hidden" id="cd-key" value="' + encodeURIComponent(key) + '">' +
    '<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:12px;">' +
    '<div class="form-group"><label class="form-label">Prénom</label><input class="form-input" id="cd-firstname" value="' + firstName.replace(/"/g,'&quot;') + '"></div>' +
    '<div class="form-group"><label class="form-label">Nom</label><input class="form-input" id="cd-lastname" value="' + lastName.replace(/"/g,'&quot;') + '"></div>' +
    '<div class="form-group"><label class="form-label">Téléphone</label><input class="form-input" id="cd-phone" value="' + phone.replace(/"/g,'&quot;') + '"></div>' +
    '<div class="form-group"><label class="form-label">Profession</label><input class="form-input" id="cd-profession" value="' + profession.replace(/"/g,'&quot;') + '" placeholder="Ex : Médecin, Ingénieur…"></div>' +
    '<div class="form-group"><label class="form-label">Email</label><input class="form-input" id="cd-email" value="' + email.replace(/"/g,'&quot;') + '"></div>' +
    '<div class="form-group"><label class="form-label">Nationalité</label><input class="form-input" id="cd-nationality" value="' + nationality.replace(/"/g,'&quot;') + '"></div>' +
    '<div class="form-group"><label class="form-label">Adresse</label><input class="form-input" id="cd-address" value="' + address.replace(/"/g,'&quot;') + '" placeholder="Si disponible"></div>' +
    '</div>' +
    '<button class="topbar-btn primary" style="width:100%;margin-bottom:16px;" onclick="saveCustomerProfile()">💾 Enregistrer les modifications</button>' +
    '<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:8px;">' +
    '<div style="background:rgba(139,92,246,.08);border-radius:8px;padding:10px;text-align:center;"><div style="font-size:11px;color:var(--text3);">Nombre de locations</div><div style="font-weight:800;color:#8b5cf6;font-size:15px;">' + custRes.length + '</div></div>' +
    '<div style="background:rgba(18,22,30,.04);border-radius:8px;padding:10px;text-align:center;"><div style="font-size:11px;color:var(--text3);">Dernière location</div><div style="font-weight:800;font-size:14px;">' + (custRes[0] ? ((typeof fmtD==='function'?fmtD(custRes[0].startDate):(custRes[0].startDate||'')) + (custRes[0].startTime ? ' à ' + custRes[0].startTime : '')) : '—') + '</div></div>' +
    '</div>' +
    '<div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px;margin-bottom:18px;">' +
    '<div style="background:rgba(34,197,94,.08);border-radius:8px;padding:10px;text-align:center;"><div style="font-size:11px;color:var(--text3);">Total</div><div style="font-weight:800;color:#16a34a;font-size:15px;">' + totalSpent.toLocaleString('fr-FR') + '</div></div>' +
    '<div style="background:rgba(59,130,246,.08);border-radius:8px;padding:10px;text-align:center;"><div style="font-size:11px;color:var(--text3);">Payé</div><div style="font-weight:800;color:#3b82f6;font-size:15px;">' + totalPaid.toLocaleString('fr-FR') + '</div></div>' +
    '<div style="background:rgba(239,68,68,.08);border-radius:8px;padding:10px;text-align:center;"><div style="font-size:11px;color:var(--text3);">Reste dû</div><div style="font-weight:800;color:' + (totalDue>0?'#ef4444':'#16a34a') + ';font-size:15px;">' + totalDue.toLocaleString('fr-FR') + '</div></div>' +
    '</div>';

  /* Documents d'identité */
  html += '<div style="font-weight:800;font-size:14px;margin-bottom:10px;border-top:1px solid var(--border);padding-top:16px;">Documents d\'identité</div>';
  // ★ Demande 2 : tous les documents de ce client, quelle que soit la façon
  //   dont ils ont été enregistrés (voir aslGatherCustomerDocs).
  var gd = aslGatherCustomerDocs(key, custRes, { names: [cust.name, (firstName + ' ' + lastName).trim()], phone: phone, email: email });
  html += _docBlock(key, 'permis', 'Permis de conduire', gd.permis);
  html += _docBlock(key, 'identite', 'Carte d\'identité (CIN) ou Passeport', gd.identite, gd.identiteType || d.identiteType);
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
        '<div style="font-size:12.5px;color:var(--text2);">' + (typeof aslVehLabel === 'function' ? aslVehLabel(r) : (r.car||'')) + ' · ' + (r.startDate||'') + ' → ' + (r.endDate||'') + '</div>' +
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

/* ★ CORRECTIF (item 3) — Enregistre les modifications de la fiche client
   (prénom, nom, téléphone, email, nationalité, adresse) dans le magasin de
   surcharges, synchronisé comme le reste du Back-office. */
function saveCustomerProfile() {
  var encKey = document.getElementById('cd-key') && document.getElementById('cd-key').value;
  if (!encKey) return;
  var key = decodeURIComponent(encKey);
  var profiles = _loadCustProfiles();
  profiles[key] = {
    firstName: (document.getElementById('cd-firstname') && document.getElementById('cd-firstname').value) || '',
    lastName: (document.getElementById('cd-lastname') && document.getElementById('cd-lastname').value) || '',
    phone: (document.getElementById('cd-phone') && document.getElementById('cd-phone').value) || '',
    profession: (document.getElementById('cd-profession') && document.getElementById('cd-profession').value) || '',
    email: (document.getElementById('cd-email') && document.getElementById('cd-email').value) || '',
    nationality: (document.getElementById('cd-nationality') && document.getElementById('cd-nationality').value) || '',
    address: (document.getElementById('cd-address') && document.getElementById('cd-address').value) || ''
  };
  _saveCustProfiles(profiles);
  renderCustomers();
  openCustomerDrawer(encKey);
  if (typeof asl6Toast === 'function') asl6Toast('Fiche client mise à jour ✓');
}

function _c6cell(label, val) {
  return '<div style="background:rgba(18,22,30,.03);border-radius:8px;padding:10px;">' +
    '<div style="font-size:11px;color:var(--text3);margin-bottom:2px;">' + label + '</div>' +
    '<div style="font-size:13px;font-weight:600;">' + val + '</div></div>';
}

/* ============================================================
   ★ Demande 2 — Afficher TOUS les documents d'identité déjà enregistrés.
   CAUSE : la fiche ne lisait qu'UN seul emplacement (documents classés sous
   l'email du client, ou à défaut sous son nom). Or des documents ont aussi
   été enregistrés, selon les versions de l'application :
     • sous le numéro de téléphone du client (ancien module, champ
       « identity » au lieu de « identite ») ;
     • sous le nom du client alors que sa fiche est classée par email
       (ou l'inverse) ;
     • directement dans ses dossiers de réservation (r.docs).
   aslGatherCustomerDocs() rassemble ces sources en LECTURE SEULE : rien
   n'est déplacé, copié ni effacé. Les doublons (même image à plusieurs
   endroits) ne sont affichés qu'une fois. Les ajouts se font toujours au
   même endroit qu'avant (fiche client).
   ============================================================ */
var _cdDocReg = {};
function _cdSig(url) { return url.length + ':' + url.slice(0, 96) + url.slice(-96); }
function _cdLower(s) { return String(s || '').trim().toLowerCase(); }
function _cdDigits(s) { return String(s || '').replace(/\D/g, ''); }
function aslGatherCustomerDocs(key, custRes, extra) {
  var docs = _loadCustDocs() || {};
  var out = { permis: [], identite: [], identiteType: '' };
  var seen = {};
  function add(type, url, src) {
    if (!url || typeof url !== 'string' || url.indexOf('data:') !== 0 && url.indexOf('/api/') !== 0 && url.indexOf('http') !== 0 && url.indexOf('asldoc:') !== 0) return;
    var sig = _cdSig(url);
    if (seen[sig]) return;
    seen[sig] = 1;
    var ref = [src.kind, src.key || src.resId || '', src.field, src.idx].join('|');
    _cdDocReg[ref] = { url: url, kind: src.kind, key: src.key, resId: src.resId, field: src.field, idx: src.idx };
    out[type].push({ url: url, ref: ref, readonly: src.kind !== 'store' });
  }
  function fromStoreKey(k) {
    var d = docs[k];
    if (!d || typeof d !== 'object') return;
    _docAsArray(d.permis).forEach(function (u, i) { add('permis', u, { kind: 'store', key: k, field: 'permis', idx: i }); });
    _docAsArray(d.identite).forEach(function (u, i) { add('identite', u, { kind: 'store', key: k, field: 'identite', idx: i }); });
    _docAsArray(d.identity).forEach(function (u, i) { add('identite', u, { kind: 'store', key: k, field: 'identity', idx: i }); });
    if (!out.identiteType && d.identiteType) out.identiteType = d.identiteType;
  }
  custRes = custRes || [];
  extra = extra || {};
  // 1) Emplacement principal (celui où la fiche enregistre les ajouts).
  fromStoreKey(key);
  // 2) Autres clés possibles pour ce même client : email(s), nom(s), téléphone(s).
  var cand = {}, phones = {};
  custRes.forEach(function (r) {
    if (r.email) cand[_cdLower(r.email)] = 1;
    if (r.client) cand['name:' + _cdLower(r.client)] = 1;
    var pd = _cdDigits(r.phone); if (pd.length >= 6) phones[pd] = 1;
  });
  (extra.names || []).forEach(function (n) { if (_cdLower(n)) cand['name:' + _cdLower(n)] = 1; });
  if (extra.email) cand[_cdLower(extra.email)] = 1;
  if (_cdDigits(extra.phone).length >= 6) phones[_cdDigits(extra.phone)] = 1;
  Object.keys(cand).forEach(function (k) { if (k !== key && docs[k]) fromStoreKey(k); });
  Object.keys(docs).forEach(function (k) {
    if (k === key || cand[k] || k.indexOf('name:') === 0 || k.indexOf('@') >= 0) return;
    var kd = _cdDigits(k);
    if (kd.length >= 6 && phones[kd]) fromStoreKey(k);
  });
  // 3) Documents enregistrés directement dans les dossiers (lecture seule).
  custRes.forEach(function (r) {
    var d = r && r.docs;
    if (!d || typeof d !== 'object') return;
    _docAsArray(d.permis).forEach(function (u, i) { add('permis', u, { kind: 'res', resId: r.id, field: 'permis', idx: i }); });
    _docAsArray(d.identite).forEach(function (u, i) { add('identite', u, { kind: 'res', resId: r.id, field: 'identite', idx: i }); });
    _docAsArray(d.identity).forEach(function (u, i) { add('identite', u, { kind: 'res', resId: r.id, field: 'identity', idx: i }); });
  });
  return out;
}
window.aslGatherCustomerDocs = aslGatherCustomerDocs;

function _aslDocOpenPreview(u) {
  // La fenêtre s'ouvre immédiatement (sinon le navigateur la bloquerait),
  // puis le document privé y est affiché dès qu'il est chargé.
  var w = window.open('');
  if (!w) { alert('Autorisez les pop-ups pour l\'aperçu.'); return; }
  try { w.document.write('<body style="margin:0;background:#111;color:#aaa;font-family:sans-serif;display:flex;align-items:center;justify-content:center;height:100vh;">Chargement…</body>'); } catch (e0) {}
  aslDocResolve(u).then(function (url) {
    var isPdf = (aslDocIsRef(u) ? aslDocParse(u).type : url).indexOf('application/pdf') >= 0;
    w.document.open();
    if (isPdf) w.document.write('<iframe src="' + url + '" style="width:100%;height:100%;border:none;"></iframe>');
    else w.document.write('<body style="margin:0;background:#111;display:flex;align-items:center;justify-content:center;height:100vh;"><img src="' + url + '" style="max-width:100%;max-height:100%;"></body>');
    w.document.close();
  }).catch(function () {
    try { w.document.body.textContent = 'Document indisponible pour le moment (vérifiez la connexion).'; } catch (e1) {}
  });
}
function previewCustDocRef(encRef) {
  var e = _cdDocReg[decodeURIComponent(encRef)];
  if (!e || !e.url) return;
  _aslDocOpenPreview(e.url);
}
function downloadCustDocRefs(encRefs, baseName) {
  var refs = decodeURIComponent(encRefs).split('\n').filter(Boolean);
  refs.forEach(function (ref, i) {
    var e = _cdDocReg[ref];
    if (!e || !e.url) return;
    var src = e.url;
    var t = aslDocIsRef(src) ? aslDocParse(src).type : src;
    var ext = t.indexOf('application/pdf') >= 0 ? 'pdf' : (t.indexOf('image/png') >= 0 ? 'png' : (t.indexOf('image/webp') >= 0 ? 'webp' : 'jpg'));
    aslDocResolve(src).then(function (url) {
      var a = document.createElement('a');
      a.href = url;
      a.download = (baseName || 'document') + (refs.length > 1 ? '_' + (i + 1) : '') + '.' + ext;
      document.body.appendChild(a); a.click(); document.body.removeChild(a);
    }).catch(function () { alert('Document indisponible pour le moment (vérifiez la connexion).'); });
  });
}
/* Suppression : uniquement pour les documents de la fiche client (même
   stockage qu'avant). L'image est retrouvée par son contenu, jamais par une
   position qui aurait pu changer entre-temps. */
function deleteCustDocRef(encRef, encKey) {
  var e = _cdDocReg[decodeURIComponent(encRef)];
  if (!e || e.kind !== 'store') return;
  if (!confirm('Supprimer cette image ?')) return;
  var docs = _loadCustDocs();
  var d = docs[e.key];
  if (d) {
    var val = d[e.field];
    if (Array.isArray(val)) {
      var pos = val.indexOf(e.url);
      if (pos >= 0) val.splice(pos, 1);
      if (!val.length) delete d[e.field];
    } else if (val === e.url) {
      delete d[e.field];
    }
    if (!d.identite && !d.identity) delete d.identiteType;
    _saveCustDocs(docs);
  }
  if (encKey && document.getElementById('cust-drawer') && document.getElementById('cust-drawer').style.display !== 'none') openCustomerDrawer(encKey);
  renderCustomers();
  asl6Toast('Document supprimé ✓');
}

function _docBlock(key, type, label, dataUrl, subType) {
  var enc = encodeURIComponent(key);
  // ★ Demande 2 : accepte soit une liste d'images brutes (ancien appel),
  //   soit la liste rassemblée par aslGatherCustomerDocs() (toutes sources).
  var raw = _docAsArray(dataUrl);
  var entries = raw.map(function (u, i) {
    if (u && typeof u === 'object' && u.url) return u;
    var ref = ['store', key, type, i].join('|');
    _cdDocReg[ref] = { url: u, kind: 'store', key: key, field: type, idx: i };
    return { url: u, ref: ref, readonly: false };
  }).filter(function (x) { return x && typeof x.url === 'string'; });
  var inner;
  if (entries.length) {
    var thumbs = entries.map(function (en) {
      var url = en.url;
      var encRef = encodeURIComponent(en.ref);
      var isPdf = url.indexOf('application/pdf') >= 0;
      var thumb = isPdf
        ? '<div style="width:54px;height:54px;border-radius:8px;background:rgba(196,30,58,.1);display:flex;align-items:center;justify-content:center;color:var(--red);font-weight:700;font-size:11px;flex-shrink:0;cursor:pointer;" onclick="previewCustDocRef(\'' + encRef + '\')">PDF</div>'
        : '<img' + aslDocImgAttrs(url) + ' style=""width:54px;height:54px;border-radius:8px;object-fit:cover;flex-shrink:0;cursor:pointer;background:rgba(18,22,30,.06);" title="Cliquer pour agrandir" onclick="previewCustDocRef(\'' + encRef + '\')">';
      var del = en.readonly
        ? ''
        : '<button class="btn-sm ghost" style="position:absolute;top:-6px;right:-6px;width:20px;height:20px;padding:0;border-radius:50%;background:#fff;color:var(--red);line-height:1;font-size:12px;box-shadow:0 1px 4px rgba(0,0,0,.2);" title="Supprimer cette image" onclick="event.stopPropagation();deleteCustDocRef(\'' + encRef + '\',\'' + enc + '\')">✕</button>';
      return '<div style="position:relative;"' + (en.readonly ? ' title="Document enregistré dans un dossier de réservation"' : '') + '>' + thumb + del + '</div>';
    }).join('');
    var allRefs = encodeURIComponent(entries.map(function (x) { return x.ref; }).join('\n'));
    var base = type + '_' + key.replace(/[^a-z0-9]/gi, '_');
    inner =
      '<div style="display:flex;align-items:flex-start;gap:12px;">' +
      '<div style="display:flex;gap:8px;flex-wrap:wrap;">' + thumbs + '</div>' +
      '<div style="flex:1;min-width:120px;"><div style="font-weight:600;font-size:13px;">' + label + ' <span style="font-weight:400;color:var(--text3);font-size:11px;">(' + entries.length + ' image' + (entries.length>1?'s':'') + ')</span></div>' +
      (subType ? '<div style="font-size:11px;color:var(--text3);">' + subType + '</div>' : '') +
      '<div style="display:flex;gap:6px;margin-top:6px;flex-wrap:wrap;">' +
      '<button class="btn-sm ghost" onclick="document.getElementById(\'docin-' + type + '\').click()">+ Ajouter une image (recto/verso)</button>' +
      '<button class="btn-sm ghost" onclick="downloadCustDocRefs(\'' + allRefs + '\',\'' + base + '\')">Télécharger tout</button>' +
      '</div></div></div>';
  } else {
    inner =
      '<div style="display:flex;align-items:center;justify-content:space-between;gap:12px;">' +
      '<div style="font-weight:600;font-size:13px;color:var(--text2);">' + label + '<div style="font-size:11px;color:var(--text3);font-weight:400;">Aucun document — cliquez ici puis Ctrl+V pour coller une image, ou glissez-déposez un fichier</div></div>' +
      '<button class="btn-sm primary" onclick="document.getElementById(\'docin-' + type + '\').click()">+ Ajouter</button>' +
      '</div>';
  }
  var accept = 'image/*,application/pdf';
  var onchange = 'uploadCustDoc(\'' + enc + '\',\'' + type + '\',this)';
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

/* ★ CORRECTIF DÉFINITIF (point 10) — File d'attente (mutex) : deux collages
   rapprochés lançaient chacun leur propre "lire → modifier → écrire" en
   parallèle ; celui qui finissait sa compression en second écrivait après
   l'autre à partir d'un état déjà périmé, effaçant la première image. Cette
   file garantit qu'un ajout ne commence JAMAIS avant que le précédent soit
   entièrement terminé (compression + lecture + écriture), quel que soit le
   nombre de collages rapides. */
var _docSaveQueue = Promise.resolve();
function _saveDocFile(encKey, type, file) {
  _docSaveQueue = _docSaveQueue.then(function () { return _saveDocFileNow(encKey, type, file); })
    .catch(function (e) { console.error('_saveDocFile:', e); });
  return _docSaveQueue;
}

async function _saveDocFileNow(encKey, type, file) {
  var key = decodeURIComponent(encKey);
  if (!file) return;
  // Limite de sécurité sur le fichier D'ORIGINE (avant compression) — très
  // large, car la compression ramène presque toujours l'image à quelques
  // centaines de Ko avant l'enregistrement réel.
  if (file.size > 20 * 1024 * 1024) { alert('Fichier trop volumineux (max 20 Mo).'); return; }
  // ★ Compression un peu plus poussée (1200px / qualité 0.7) : marge de
  //   sécurité supplémentaire contre la capacité de stockage, sans perte de
  //   lisibilité pour un document d'identité.
  var compressed = await _compressImageFile(file, 1200, 0.7);
  if (!compressed) { alert('Impossible de lire ce fichier.'); return; }
  var docs = _loadCustDocs();
  if (!docs[key]) docs[key] = {};
  var arr = _docAsArray(docs[key][type]);
  arr.push(compressed);
  docs[key][type] = arr;
  if (type === 'identite' && !docs[key].identiteType) {
    var t = prompt('Type de document ?\nTapez 1 pour CIN, 2 pour Passeport :', '1');
    docs[key].identiteType = (t === '2') ? 'Passeport' : 'CIN (Carte d\'identité nationale)';
  }
  _saveCustDocs(docs);
  // ★ Affichage IMMÉDIAT depuis la donnée qu'on vient d'écrire (pas une
  //   relecture localStorage qui pourrait échouer si le stockage est plein).
  openCustomerDrawer(encKey);
  renderCustomers();
  asl6Toast('Document ajouté (' + arr.length + ' image' + (arr.length>1?'s':'') + ') ✓');
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

function previewCustDoc(encKey, type, idx) {
  var key = decodeURIComponent(encKey);
  var docs = _loadCustDocs();
  var arr = _docAsArray(docs[key] && docs[key][type]);
  var url = arr[idx || 0];
  if (!url) return;
  _aslDocOpenPreview(url); // ★ LOT 44 : image directe ou document privé
}

function downloadCustDoc(encKey, type, idx) {
  var key = decodeURIComponent(encKey);
  var docs = _loadCustDocs();
  var arr = _docAsArray(docs[key] && docs[key][type]);
  if (!arr.length) return;
  // ★ Point 5 : idx omis (undefined) = "Télécharger tout" (une image = un
  //   téléchargement par image, suffixé _1, _2...) ; idx fourni = une seule image.
  var toDownload = (idx == null) ? arr : [arr[idx]];
  toDownload.forEach(function (src, i) {
    if (!src) return;
    var t = aslDocIsRef(src) ? aslDocParse(src).type : src; // ★ LOT 44
    var ext = t.indexOf('application/pdf') >= 0 ? 'pdf' : (t.indexOf('image/png') >= 0 ? 'png' : 'jpg');
    aslDocResolve(src).then(function (url) {
      var a = document.createElement('a');
      a.href = url;
      a.download = type + '_' + key.replace(/[^a-z0-9]/gi,'_') + (arr.length>1 ? '_' + ((idx==null?i:idx)+1) : '') + '.' + ext;
      document.body.appendChild(a); a.click(); document.body.removeChild(a);
    }).catch(function () {});
  });
}

function deleteCustDoc(encKey, type, idx) {
  if (!confirm(idx != null ? 'Supprimer cette image ?' : 'Supprimer ce document ?')) return;
  var key = decodeURIComponent(encKey);
  var docs = _loadCustDocs();
  if (docs[key]) {
    var arr = _docAsArray(docs[key][type]);
    if (idx != null && arr.length) {
      arr.splice(idx, 1);
      docs[key][type] = arr;
      if (!arr.length && type === 'identite') delete docs[key].identiteType;
    } else {
      delete docs[key][type];
      if (type === 'identite') delete docs[key].identiteType;
    }
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

/* ★ CORRECTIF (point 10) — Le cache mémoire (_custDocsMemCache) accélère
   l'affichage et contourne les limites de localStorage, mais il doit être
   invalidé quand une version plus récente arrive du serveur (ex. document
   ajouté depuis un autre appareil) — sinon cet onglet resterait bloqué sur
   sa propre copie locale malgré la synchronisation réelle des données. */
try {
  if (typeof ASLDB !== 'undefined' && ASLDB.onChange) {
    ASLDB.onChange(function (changedKey) {
      if (changedKey === _custDocsKey()) {
        _custDocsMemCache = null; // force une relecture fraîche au prochain accès
        try { if (document.getElementById('cust-drawer') && document.getElementById('cust-drawer').style.display !== 'none') {
          var openKey = document.getElementById('cd-key');
          if (openKey && openKey.value) openCustomerDrawer(openKey.value);
        } } catch (e) {}
        try { renderCustomers(); } catch (e) {}
      }
    });
  }
} catch (e) {}

/* ============================================================
   ★ Demande 3 — Choisir un CLIENT EXISTANT dans les pop-ups
   « Nouvelle location » et « Nouvelle réservation » (desktop + mobile,
   qui partagent ces mêmes pop-ups).
   - La liste = exactement les clients de l'onglet Clients (même
     regroupement), avec les corrections faites dans leur fiche.
   - Choisir un client remplit : prénom, nom, téléphone, profession,
     nationalité. Tout reste modifiable.
   - L'email du client est repris en arrière-plan : le nouveau dossier est
     ainsi rattaché à la MÊME fiche client (historique, documents,
     impayés), au lieu de créer un doublon.
   - Sans sélection, le pop-up fonctionne exactement comme avant.
   Lecture seule : ce module n'écrit rien dans la base ; l'enregistrement
   reste celui du pop-up, inchangé.
   ============================================================ */
var ASL_CP_FIELDS = {
  nr: { first: 'nr-firstname', last: 'nr-lastname', phone: 'nr-phone', profession: 'nr-profession', nat: null },
  nl: { first: 'nl-fn', last: 'nl-ln', phone: 'nl-phone', profession: 'nl-profession', nat: 'nl-nat' }
};
function _cpEsc(s) { return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }
function _cpSplitName(full) {
  var parts = String(full || '').trim().split(/\s+/).filter(Boolean);
  if (parts.length <= 1) return { first: parts[0] || '', last: '' };
  return { first: parts.slice(0, -1).join(' '), last: parts[parts.length - 1] };
}
function aslCustomerDirectory() {
  var map = {};
  asl6Res().forEach(function (r) {
    if (!r || !r.client) return;
    var key = _custId(r.email, r.client);
    var c = map[key];
    if (!c) c = map[key] = { key: key, name: '', email: '', phone: '', profession: '', nationality: '', count: 0, last: '' };
    c.count++;
    var d = r.startDate || '';
    // Valeurs du dossier le plus récent en priorité, sinon premières trouvées.
    var newer = d >= c.last;
    if (newer) c.last = d;
    if (newer || !c.name) c.name = r.client;
    if (r.email && (newer || !c.email)) c.email = r.email;
    if (r.phone && (newer || !c.phone)) c.phone = r.phone;
    if (r.profession && (newer || !c.profession)) c.profession = r.profession;
    if (r.nationality && r.nationality !== 'N/A' && (newer || !c.nationality)) c.nationality = r.nationality;
  });
  var profiles = {};
  try { profiles = _loadCustProfiles() || {}; } catch (e) {}
  return Object.keys(map).map(function (k) {
    var c = map[k], p = profiles[k] || {};
    var split = _cpSplitName(c.name);
    var first = split.first, last = split.last;
    // Clients classés par NOM : on garde le nom des dossiers (c'est lui qui
    // les relie entre eux). Clients classés par EMAIL : le nom corrigé dans
    // la fiche peut être utilisé sans risque de doublon.
    if (k.indexOf('name:') !== 0 && (p.firstName != null || p.lastName != null)) {
      first = p.firstName || ''; last = p.lastName || '';
    }
    return {
      key: k,
      first: first, last: last,
      display: (first + ' ' + last).trim() || c.name,
      email: c.email,
      phone: p.phone != null && p.phone !== '' ? p.phone : c.phone,
      profession: p.profession != null && p.profession !== '' ? p.profession : c.profession,
      nationality: p.nationality != null && p.nationality !== '' ? p.nationality : c.nationality,
      count: c.count, lastDate: c.last
    };
  }).sort(function (a, b) { return String(b.lastDate).localeCompare(String(a.lastDate)); });
}
window.aslCustomerDirectory = aslCustomerDirectory;

function aslClientPickerHTML(prefix) {
  return '<div class="form-group asl-cp" id="' + prefix + '-cp">' +
    '<label class="form-label">Client existant <span style="font-weight:400;color:var(--text3);">— facultatif</span></label>' +
    '<div id="' + prefix + '-cust-sel" class="asl-cp-sel" style="display:none;"></div>' +
    '<div id="' + prefix + '-cust-searchwrap" class="asl-cp-searchwrap">' +
    '<svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>' +
    '<input class="form-input" id="' + prefix + '-cust-q" autocomplete="off" placeholder="Rechercher par nom ou téléphone…" oninput="aslClientPickerSearch(\'' + prefix + '\')" onfocus="aslClientPickerSearch(\'' + prefix + '\')">' +
    '</div>' +
    '<div id="' + prefix + '-cust-res" class="asl-cp-res" style="display:none;"></div>' +
    '<input type="hidden" id="' + prefix + '-cust-key"><input type="hidden" id="' + prefix + '-cust-email"><input type="hidden" id="' + prefix + '-cust-nat">' +
    '<div style="font-size:11px;color:var(--text3);margin-top:4px;">Remplit automatiquement les informations du client. Laissez vide pour un nouveau client.</div>' +
    '</div>';
}
window.aslClientPickerHTML = aslClientPickerHTML;

function aslClientPickerSearch(prefix) {
  var qEl = document.getElementById(prefix + '-cust-q');
  var box = document.getElementById(prefix + '-cust-res');
  if (!qEl || !box) return;
  var q = qEl.value.trim().toLowerCase();
  if (!q) { box.style.display = 'none'; box.innerHTML = ''; return; }
  var qDigits = q.replace(/\D/g, '');
  var list = aslCustomerDirectory().filter(function (c) {
    if ((c.display + ' ' + (c.email || '')).toLowerCase().indexOf(q) >= 0) return true;
    return qDigits.length >= 3 && String(c.phone || '').replace(/\D/g, '').indexOf(qDigits) >= 0;
  }).slice(0, 8);
  if (!list.length) {
    box.innerHTML = '<div class="asl-cp-empty">Aucun client trouvé — saisissez ses informations ci-dessous.</div>';
    box.style.display = 'block';
    return;
  }
  box.innerHTML = list.map(function (c) {
    var sub = [c.phone || 'Pas de téléphone', c.count + ' dossier' + (c.count > 1 ? 's' : '')];
    if (c.lastDate) sub.push('dernier le ' + c.lastDate.split('-').reverse().join('/'));
    return '<button type="button" class="asl-cp-item" data-k="' + _cpEsc(encodeURIComponent(c.key)) + '" onclick="aslClientPickerPick(\'' + prefix + '\', this.dataset.k)">' +
      '<span class="asl-cp-ava">' + _cpEsc((c.display || '?').charAt(0).toUpperCase()) + '</span>' +
      '<span class="asl-cp-txt"><span class="asl-cp-name">' + _cpEsc(c.display) + '</span>' +
      '<span class="asl-cp-sub">' + _cpEsc(sub.join(' · ')) + '</span></span></button>';
  }).join('');
  box.style.display = 'block';
}
window.aslClientPickerSearch = aslClientPickerSearch;

function _cpSet(id, val) {
  if (!id) return;
  var el = document.getElementById(id);
  if (!el) return;
  el.value = val || '';
  try { el.dispatchEvent(new Event('input', { bubbles: true })); } catch (e) {}
}
function aslClientPickerPick(prefix, encKey) {
  var key = decodeURIComponent(encKey);
  var c = aslCustomerDirectory().filter(function (x) { return x.key === key; })[0];
  var f = ASL_CP_FIELDS[prefix];
  if (!c || !f) return;
  _cpSet(f.first, c.first);
  _cpSet(f.last, c.last);
  _cpSet(f.phone, c.phone);
  _cpSet(f.profession, c.profession);
  if (f.nat) _cpSet(f.nat, c.nationality);
  _cpSet(prefix + '-cust-key', c.key);
  _cpSet(prefix + '-cust-email', c.email || '');
  _cpSet(prefix + '-cust-nat', c.nationality || '');
  _cpShowSelected(prefix, c);
}
window.aslClientPickerPick = aslClientPickerPick;

function _cpShowSelected(prefix, c) {
  var sel = document.getElementById(prefix + '-cust-sel');
  if (sel) {
    sel.innerHTML = '<span class="asl-cp-ava">' + _cpEsc((c.display || '?').charAt(0).toUpperCase()) + '</span>' +
      '<span class="asl-cp-txt"><span class="asl-cp-name">' + _cpEsc(c.display) + '</span><span class="asl-cp-sub">' + _cpEsc(c.phone || 'Pas de téléphone') + ' · client existant</span></span>' +
      '<button type="button" class="btn-sm ghost" onclick="aslClientPickerClear(\'' + prefix + '\')">Changer</button>';
    sel.style.display = 'flex';
  }
  var wrap = document.getElementById(prefix + '-cust-searchwrap'); if (wrap) wrap.style.display = 'none';
  var box = document.getElementById(prefix + '-cust-res'); if (box) { box.style.display = 'none'; box.innerHTML = ''; }
  var q = document.getElementById(prefix + '-cust-q'); if (q) q.value = '';
}

/* « Changer » : retire le client choisi et vide les champs qu'il avait
   remplis, pour revenir à un formulaire « nouveau client ». */
function aslClientPickerClear(prefix) {
  var f = ASL_CP_FIELDS[prefix];
  if (f) { _cpSet(f.first, ''); _cpSet(f.last, ''); _cpSet(f.phone, ''); _cpSet(f.profession, ''); if (f.nat) _cpSet(f.nat, ''); }
  _cpSet(prefix + '-cust-key', ''); _cpSet(prefix + '-cust-email', ''); _cpSet(prefix + '-cust-nat', '');
  var sel = document.getElementById(prefix + '-cust-sel'); if (sel) { sel.style.display = 'none'; sel.innerHTML = ''; }
  var wrap = document.getElementById(prefix + '-cust-searchwrap'); if (wrap) wrap.style.display = '';
  var q = document.getElementById(prefix + '-cust-q'); if (q) { q.value = ''; try { q.focus(); } catch (e) {} }
}
window.aslClientPickerClear = aslClientPickerClear;

/* Rétablit l'encart « client existant » si un brouillon restauré contenait
   un client choisi (le brouillon mémorise ses champs cachés). */
function aslClientPickerRestore(prefix) {
  var k = document.getElementById(prefix + '-cust-key');
  if (!k || !k.value) return;
  var c = aslCustomerDirectory().filter(function (x) { return x.key === k.value; })[0];
  if (c) _cpShowSelected(prefix, c); // affiche seulement : les champs du brouillon sont conservés
}
window.aslClientPickerRestore = aslClientPickerRestore;

(function () {
  if (document.getElementById('asl-cp-style')) return;
  var st = document.createElement('style');
  st.id = 'asl-cp-style';
  st.textContent = [
    '.asl-cp-searchwrap{position:relative;}',
    '.asl-cp-searchwrap svg{position:absolute;left:12px;top:50%;transform:translateY(-50%);color:var(--text3);pointer-events:none;}',
    '.asl-cp-searchwrap .form-input{padding-left:36px;}',
    '.asl-cp-res{margin-top:6px;border:1px solid var(--border);border-radius:10px;background:var(--dark2,#fff);max-height:260px;overflow-y:auto;box-shadow:0 6px 20px rgba(0,0,0,.08);}',
    '.asl-cp-item{display:flex;align-items:center;gap:10px;width:100%;padding:10px 12px;border:none;border-bottom:1px solid var(--border);background:transparent;cursor:pointer;text-align:left;font-family:inherit;color:var(--text);}',
    '.asl-cp-item:last-child{border-bottom:none;}',
    '.asl-cp-item:hover,.asl-cp-item:focus{background:rgba(196,30,58,.06);outline:none;}',
    '.asl-cp-ava{width:32px;height:32px;border-radius:50%;background:rgba(196,30,58,.1);color:var(--red);display:flex;align-items:center;justify-content:center;font-weight:800;font-size:13px;flex-shrink:0;}',
    '.asl-cp-txt{display:flex;flex-direction:column;min-width:0;flex:1;}',
    '.asl-cp-name{font-weight:700;font-size:13.5px;}',
    '.asl-cp-sub{font-size:12px;color:var(--text3);}',
    '.asl-cp-empty{padding:12px;font-size:12.5px;color:var(--text3);}',
    '.asl-cp-sel{align-items:center;gap:10px;padding:10px 12px;border:1px solid rgba(22,163,74,.35);background:rgba(22,163,74,.06);border-radius:10px;}'
  ].join('\n');
  (document.head || document.documentElement).appendChild(st);
})();

/* ============================================================
   ★ LOT 44 — DOCUMENTS CLIENTS : STOCKAGE PRIVÉ, SANS LIMITE DE TAILLE
   PROBLÈME : toutes les images (CIN, permis) de tous les clients étaient
   embarquées dans UN SEUL bloc synchronisé (« docs »), limité à 4 Mo par
   le serveur (~15 photos) et lisible sans authentification. Au-delà de la
   limite, les nouveaux documents ne partaient plus vers le serveur et
   restaient sur l'appareil qui les avait ajoutés.
   CORRECTION : chaque image est déposée séparément dans un stockage
   PRIVÉ (/api/doc, clé requise). Le bloc « docs » ne contient plus que de
   courtes références « asldoc:<id>|<type> » : il reste minuscule, et la
   synchronisation (inchangée) fonctionne à nouveau.
   CONVERSION AUTOMATIQUE des documents existants, en arrière-plan : une
   image n'est remplacée par sa référence QU'APRÈS confirmation du
   serveur. En cas d'échec (hors connexion, mode local…), rien ne change
   et une nouvelle tentative a lieu plus tard. Rien n'est jamais supprimé.
   ============================================================ */
var ASL_DOC_PREFIX = 'asldoc:';
var ASL_DOC_TYPES = { 'image/jpeg': 1, 'image/png': 1, 'image/webp': 1, 'application/pdf': 1 };
var ASL_DOC_BLANK = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';
var _aslDocUrlCache = {};
var _aslDocBlocked = false; // clé refusée par le serveur : on arrête de réessayer pour cette session

function aslDocIsRef(u) { return typeof u === 'string' && u.indexOf(ASL_DOC_PREFIX) === 0; }
function aslDocParse(u) {
  var rest = String(u).slice(ASL_DOC_PREFIX.length);
  var bar = rest.indexOf('|');
  return { id: bar < 0 ? rest : rest.slice(0, bar), type: bar < 0 ? 'image/jpeg' : rest.slice(bar + 1) };
}
function _aslDocRemote() {
  return typeof fetch === 'function' && typeof location !== 'undefined' && location.protocol !== 'file:';
}
function _aslDocHeaders(json) {
  var h = json ? { 'Content-Type': 'application/json' } : {};
  try { var k = localStorage.getItem('asl_admin_key') || ''; if (k) h['X-ASL-Key'] = k; } catch (e) {}
  return h;
}
/* Référence → adresse affichable (blob privé, mis en cache pour la session). */
function aslDocResolve(u) {
  if (!aslDocIsRef(u)) return Promise.resolve(u);
  if (_aslDocUrlCache[u]) return _aslDocUrlCache[u];
  var p = aslDocParse(u);
  var pr = fetch('/api/doc/' + encodeURIComponent(p.id), { headers: _aslDocHeaders(false), cache: 'no-store' })
    .then(function (res) {
      if (!res.ok) { var e = new Error('HTTP ' + res.status); e.status = res.status; throw e; }
      return res.blob();
    })
    .then(function (blob) { return URL.createObjectURL(new Blob([blob], { type: p.type })); });
  pr.catch(function () { delete _aslDocUrlCache[u]; }); // réessai possible plus tard
  _aslDocUrlCache[u] = pr;
  return pr;
}
window.aslDocResolve = aslDocResolve;
/* Attributs <img> : image directe, ou emplacement chargé automatiquement. */
function aslDocImgAttrs(u) {
  if (!aslDocIsRef(u)) return ' src="' + u + '"';
  return ' src="' + ASL_DOC_BLANK + '" data-asldoc="' + String(u).replace(/"/g, '&quot;') + '"';
}
window.aslDocImgAttrs = aslDocImgAttrs;
function aslDocHydrate(root) {
  var list = (root || document).querySelectorAll ? (root || document).querySelectorAll('img[data-asldoc]:not([data-asldoc-done])') : [];
  Array.prototype.forEach.call(list, function (img) {
    img.setAttribute('data-asldoc-done', '1');
    aslDocResolve(img.getAttribute('data-asldoc')).then(function (url) {
      img.src = url;
      img.style.background = '';
    }).catch(function () {
      img.removeAttribute('data-asldoc-done');
      img.title = 'Document momentanément indisponible (connexion)';
    });
  });
}
window.aslDocHydrate = aslDocHydrate;
(function () {
  try {
    if (typeof MutationObserver === 'undefined' || !document.documentElement) return;
    var pending = false;
    new MutationObserver(function () {
      if (pending) return;
      pending = true;
      setTimeout(function () { pending = false; aslDocHydrate(document); }, 30);
    }).observe(document.documentElement, { childList: true, subtree: true });
  } catch (e) {}
})();

/* Dépôt d'une image « data: » → référence privée. Rejette si impossible. */
function aslDocUpload(dataUrl) {
  var m = /^data:([^;,]+);base64,(.*)$/.exec(String(dataUrl || ''));
  if (!m || !ASL_DOC_TYPES[m[1]]) return Promise.reject(new Error('format'));
  return fetch('/api/doc', {
    method: 'POST', headers: _aslDocHeaders(true), cache: 'no-store',
    body: JSON.stringify({ type: m[1], data: m[2] })
  }).then(function (res) {
    if (!res.ok) { var e = new Error('HTTP ' + res.status); e.status = res.status; throw e; }
    return res.json();
  }).then(function (j) {
    if (!j || !j.ok || !j.id) throw new Error('réponse invalide');
    var ref = ASL_DOC_PREFIX + j.id + '|' + m[1];
    _aslDocUrlCache[ref] = Promise.resolve(dataUrl); // affichage immédiat, sans re-télécharger
    return ref;
  });
}

function _aslDocDataUrlsIn(v, out) {
  (Array.isArray(v) ? v : (v ? [v] : [])).forEach(function (u) {
    if (typeof u === 'string' && u.indexOf('data:') === 0 && out.indexOf(u) < 0) out.push(u);
  });
}
function _aslDocSwap(v, map) {
  if (Array.isArray(v)) return v.map(function (u) { return map[u] || u; });
  return (typeof v === 'string' && map[v]) ? map[v] : v;
}
var DOC_FIELDS_ALL = ['permis', 'identite', 'identity'];
var _aslDocMigrating = false, _aslDocAgain = false, _aslDocTimer = null;
var _aslDocSkip = {}; // images impossibles à déposer (format/taille) : ignorées, laissées telles quelles
function _aslDocUploadable(u) {
  if (_aslDocSkip[u]) return false;
  var m = /^data:([^;,]+);base64,/.exec(u);
  return !!(m && ASL_DOC_TYPES[m[1]]);
}
/* Dépôt d'une image de la file : un refus DÉFINITIF (format, taille) met
   seulement cette image de côté ; une erreur réseau interrompt le lot
   sans rien modifier (nouvelle tentative plus tard). */
function _aslDocUploadInto(u, map) {
  return aslDocUpload(u).then(function (ref) { map[u] = ref; }).catch(function (e) {
    if (e && (e.status === 413 || e.status === 415 || e.message === 'format')) { _aslDocSkip[u] = 1; return; }
    throw e;
  });
}

/* Convertit par lots de 5 : chaque lot n'est enregistré qu'après que TOUS
   ses dépôts ont été confirmés par le serveur. L'écriture passe par la
   même file d'attente que les ajouts manuels (aucune course possible). */
function aslMigrateDocs() {
  if (!_aslDocRemote() || _aslDocBlocked) return Promise.resolve(0);
  if (_aslDocMigrating) { _aslDocAgain = true; return Promise.resolve(0); }
  _aslDocMigrating = true;
  var converted = 0;
  function nextBatch() {
    var docs = _loadCustDocs() || {};
    var todo = [];
    Object.keys(docs).forEach(function (k) {
      var d = docs[k]; if (!d || typeof d !== 'object') return;
      DOC_FIELDS_ALL.forEach(function (f) { _aslDocDataUrlsIn(d[f], todo); });
    });
    todo = todo.filter(_aslDocUploadable);
    if (!todo.length) return Promise.resolve();
    var batch = todo.slice(0, 5), map = {};
    return batch.reduce(function (chain, u) {
      return chain.then(function () { return _aslDocUploadInto(u, map); });
    }, Promise.resolve()).then(function () {
      if (!Object.keys(map).length) return;
      _docSaveQueue = _docSaveQueue.then(function () {
        var cur = _loadCustDocs() || {};
        Object.keys(cur).forEach(function (k) {
          var d = cur[k]; if (!d || typeof d !== 'object') return;
          DOC_FIELDS_ALL.forEach(function (f) { if (d[f]) d[f] = _aslDocSwap(d[f], map); });
        });
        _saveCustDocs(cur);
        converted += Object.keys(map).length;
      });
      return _docSaveQueue;
    }).then(nextBatch);
  }
  /* Documents enregistrés directement dans d'anciens dossiers : même
     conversion, puis petite modification du dossier (quelques octets). */
  function migrateRes() {
    var list = (typeof asl6Res === 'function' ? asl6Res() : []).filter(function (r) {
      if (!r || !r.docs || typeof r.docs !== 'object') return false;
      var t = []; DOC_FIELDS_ALL.forEach(function (f) { _aslDocDataUrlsIn(r.docs[f], t); }); return t.filter(_aslDocUploadable).length > 0;
    });
    return list.reduce(function (chain, r) {
      return chain.then(function () {
        var t = [], map = {};
        DOC_FIELDS_ALL.forEach(function (f) { _aslDocDataUrlsIn(r.docs[f], t); });
        t = t.filter(_aslDocUploadable);
        return t.reduce(function (c2, u) {
          return c2.then(function () { return _aslDocUploadInto(u, map); });
        }, Promise.resolve()).then(function () {
          if (!Object.keys(map).length) return;
          var nd = Object.assign({}, r.docs);
          DOC_FIELDS_ALL.forEach(function (f) { if (nd[f]) nd[f] = _aslDocSwap(nd[f], map); });
          if (typeof ASLDB !== 'undefined' && ASLDB.updateReservation) ASLDB.updateReservation(r.id, { docs: nd });
          converted += Object.keys(map).length;
        });
      });
    }, Promise.resolve());
  }
  return nextBatch().then(migrateRes).catch(function (e) {
    if (e && (e.status === 401 || e.status === 403)) _aslDocBlocked = true;
    // Hors connexion / serveur indisponible : rien n'a été modifié, on réessaiera.
  }).then(function () {
    _aslDocMigrating = false;
    if (_aslDocAgain) { _aslDocAgain = false; aslMigrateDocsSoon(2000); }
    return converted;
  });
}
window.aslMigrateDocs = aslMigrateDocs;
function aslMigrateDocsSoon(ms) {
  if (!_aslDocRemote()) return;
  clearTimeout(_aslDocTimer);
  _aslDocTimer = setTimeout(aslMigrateDocs, ms == null ? 1500 : ms);
}
window.aslMigrateDocsSoon = aslMigrateDocsSoon;
(function () {
  if (!_aslDocRemote()) return;
  setTimeout(aslMigrateDocs, 6000);        // au démarrage, après la 1re synchro
  setInterval(aslMigrateDocs, 90000);      // puis régulièrement (ajouts depuis la création d'un dossier…)
})();
