/* ============================================================
   ALL STAR LOC — Documents clients (permis / CIN / passeport)
   Téléversement rapide depuis galerie (mobile) ou fichier (desktop),
   stockés en base64 et rattachés à la réservation/location.
   Ajoutables au moment de la création OU plus tard depuis la fiche.
   Stockage : champ docs {permis, identity} sur la réservation, et
   miroir dans asl_cust_docs_v1 par téléphone client.
   ============================================================ */
(function () {
  'use strict';

  var DOC_KEY = 'asl_cust_docs_v1';

  /* Aperçu + mémorisation temporaire du fichier choisi dans le formulaire. */
  window._pendingDocs = window._pendingDocs || {};
  window.docPreview = function (input, prevId) {
    var file = input && input.files && input.files[0];
    if (!file) return;
    if (file.size > 4 * 1024 * 1024) { alert('Image trop lourde (max 4 Mo).'); input.value = ''; return; }
    var reader = new FileReader();
    reader.onload = function () {
      window._pendingDocs[input.id] = reader.result;
      var prev = document.getElementById(prevId);
      if (prev) prev.innerHTML = '<img src="' + reader.result + '" style="max-height:64px;border-radius:8px;border:1px solid #ddd;">';
    };
    reader.readAsDataURL(file);
  };

  /* Récupère les documents saisis dans un formulaire (par préfixe d'id). */
  window.collectDocs = function (permisId, identityId) {
    var docs = {};
    if (window._pendingDocs[permisId]) docs.permis = window._pendingDocs[permisId];
    if (window._pendingDocs[identityId]) docs.identity = window._pendingDocs[identityId];
    return docs;
  };

  window.clearPendingDocs = function () { window._pendingDocs = {}; };

  function rd() { try { return JSON.parse(localStorage.getItem(DOC_KEY) || '{}'); } catch (e) { return {}; } }
  function wr(o) { try { localStorage.setItem(DOC_KEY, JSON.stringify(o)); } catch (e) {} try { if (typeof ASLDB !== 'undefined' && ASLDB.noteLocalChange) ASLDB.noteLocalChange(DOC_KEY); } catch (e) {} }

  /* Sauvegarde des documents par téléphone (miroir, partagé entre dossiers). */
  window.saveCustomerDocs = function (phone, docs) {
    if (!phone || !docs) return;
    var all = rd();
    all[phone] = Object.assign(all[phone] || {}, docs);
    wr(all);
    try { if (typeof ASLDB !== 'undefined' && ASLDB.syncNow) ASLDB.syncNow(); } catch (e) {}
  };
  window.getCustomerDocs = function (phone) { return (rd()[phone]) || {}; };

  /* Ajouter/mettre à jour les documents d'une réservation existante
     (depuis la fiche client/réservation), desktop ou mobile. */
  window.addDocsToReservation = function (resId) {
    var r = (ASLDB.getReservations() || []).filter(function (x) { return x.id === resId; })[0];
    if (!r) return;
    var existing = (r.docs || window.getCustomerDocs(r.phone) || {});
    var host = document.getElementById('doc-add-host');
    if (!host) { host = document.createElement('div'); host.id = 'doc-add-host'; document.body.appendChild(host); }
    host.innerHTML =
      '<div style="position:fixed;inset:0;background:rgba(10,12,18,.55);z-index:9200;display:flex;align-items:center;justify-content:center;padding:16px;" onclick="if(event.target===this)closeDocAdd()">'
      + '<div style="background:#fff;border-radius:16px;max-width:440px;width:100%;max-height:90vh;overflow-y:auto;box-shadow:0 24px 60px rgba(0,0,0,.25);">'
      + '<div style="padding:16px 20px;border-bottom:1px solid #eee;display:flex;align-items:center;justify-content:space-between;">'
      + '<strong style="font-size:16px;">Documents — ' + (r.client || '') + '</strong>'
      + '<button onclick="closeDocAdd()" style="background:none;border:none;font-size:20px;cursor:pointer;color:#999;">&#10005;</button></div>'
      + '<div style="padding:20px;">'
      + '<div style="margin-bottom:14px;"><div style="font-size:13px;font-weight:600;margin-bottom:5px;">Permis de conduire</div>'
      + '<input type="file" accept="image/*" id="da-permis" class="form-input" style="padding:8px;" onchange="docPreview(this,\'da-permis-prev\')">'
      + '<div id="da-permis-prev" style="margin-top:6px;">' + (existing.permis ? '<img src="' + existing.permis + '" style="max-height:64px;border-radius:8px;">' : '') + '</div></div>'
      + '<div style="margin-bottom:8px;"><div style="font-size:13px;font-weight:600;margin-bottom:5px;">CIN / Passeport</div>'
      + '<input type="file" accept="image/*" id="da-identity" class="form-input" style="padding:8px;" onchange="docPreview(this,\'da-identity-prev\')">'
      + '<div id="da-identity-prev" style="margin-top:6px;">' + (existing.identity ? '<img src="' + existing.identity + '" style="max-height:64px;border-radius:8px;">' : '') + '</div></div>'
      + '</div>'
      + '<div style="padding:14px 20px;border-top:1px solid #eee;display:flex;gap:10px;justify-content:flex-end;">'
      + '<button onclick="closeDocAdd()" style="padding:9px 18px;border:1px solid #ddd;background:#fff;border-radius:9px;cursor:pointer;">Annuler</button>'
      + '<button onclick="saveDocsToRes(\'' + resId + '\')" style="padding:9px 20px;border:none;background:#C41E3A;color:#fff;border-radius:9px;cursor:pointer;font-weight:600;">Enregistrer</button>'
      + '</div></div></div>';
  };
  window.closeDocAdd = function () { var h = document.getElementById('doc-add-host'); if (h) h.innerHTML = ''; window.clearPendingDocs(); };
  window.saveDocsToRes = function (resId) {
    var r = (ASLDB.getReservations() || []).filter(function (x) { return x.id === resId; })[0];
    if (!r) return;
    var docs = Object.assign({}, r.docs || {});
    if (window._pendingDocs['da-permis']) docs.permis = window._pendingDocs['da-permis'];
    if (window._pendingDocs['da-identity']) docs.identity = window._pendingDocs['da-identity'];
    try { ASLDB.updateReservation(resId, { docs: docs }); } catch (e) {}
    if (r.phone) window.saveCustomerDocs(r.phone, docs);
    window.closeDocAdd();
    if (typeof showToast === 'function') showToast('Documents enregistrés ✓');
  };
})();
