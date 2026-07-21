/* ============================================================
   ALL STAR LOC — Durée minimale de location (configurable)
   ------------------------------------------------------------
   Remplace la valeur "2 jours" et son message, auparavant codés
   en dur dans index.html, par un réglage géré depuis le
   Back-Office → Paramètres.

   Stockage : section "minStay" du document marketing complet
   (même mécanisme que "cookies" ou "bookingOptions"), synchronisé
   via /api/marketing → visible instantanément sur le site client
   (desktop ET mobile, aucune différence).

   Traduction : le texte saisi en français est automatiquement
   traduit en anglais, espagnol et arabe via window.ASLTranslate
   (déjà utilisé par FAQ/Blog), puis stocké dans les 4 langues.
   ============================================================ */
(function () {
  var MKT_LOCAL_KEY = 'asl_mkt_all_v1';

  function _defaultMinStay() {
    return {
      days: 2,
      message: {
        fr: 'La durée minimale de location est de {n} jours. Veuillez sélectionner une période d\'au moins {n} jours.',
        en: 'The minimum rental duration is {n} days. Please select a period of at least {n} days.',
        es: 'La duración mínima de alquiler es de {n} días. Seleccione un período de al menos {n} días.',
        ar: 'المدة الدنيا للكراء هي {n} أيام. المرجو اختيار فترة لا تقل عن {n} أيام.'
      }
    };
  }
  window._defaultMinStay = window._defaultMinStay || _defaultMinStay;

  function readMinStay() {
    try {
      var all = JSON.parse(localStorage.getItem(MKT_LOCAL_KEY) || '{}');
      if (all && all.minStay && all.minStay.days) return all.minStay;
    } catch (e) {}
    return _defaultMinStay();
  }

  function statusEl() { return document.getElementById('minstay-status'); }
  function setStatus(txt, kind) {
    var el = statusEl();
    if (!el) return;
    el.textContent = txt;
    el.style.color = kind === 'err' ? '#ef4444' : (kind === 'ok' ? '#16a34a' : 'var(--text2)');
  }

  /* Remplit les champs du formulaire avec la config actuelle (locale d'abord,
     puis rafraîchie depuis le serveur pour rester cohérent multi-appareils). */
  function loadMinStayConfigUI() {
    var dIn = document.getElementById('minstay-days');
    var mIn = document.getElementById('minstay-msg-fr');
    if (!dIn || !mIn) return; // page pas encore affichée
    var cfg = readMinStay();
    dIn.value = cfg.days;
    mIn.value = (cfg.message && cfg.message.fr) || _defaultMinStay().message.fr;

    if (typeof fetch === 'undefined') return;
    fetch('/api/marketing', { headers: { 'Cache-Control': 'no-cache' } })
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(function (resp) {
        var doc = (resp && resp.data) ? resp.data : null;
        if (doc && doc.minStay && doc.minStay.days) {
          dIn.value = doc.minStay.days;
          mIn.value = (doc.minStay.message && doc.minStay.message.fr) || mIn.value;
        }
      })
      .catch(function () {});
  }
  window.loadMinStayConfigUI = loadMinStayConfigUI;

  /* Enregistre + traduit automatiquement (EN/ES/AR) + synchronise le serveur. */
  window.saveMinStayConfig = function () {
    var dIn = document.getElementById('minstay-days');
    var mIn = document.getElementById('minstay-msg-fr');
    if (!dIn || !mIn) return;
    var days = Math.max(1, Math.min(60, parseInt(dIn.value, 10) || 2));
    var msgFr = (mIn.value || '').trim() || _defaultMinStay().message.fr;
    dIn.value = days;

    setStatus('Traduction automatique en cours (EN, ES, AR)…', 'info');

    var translate = (window.ASLTranslate && typeof window.ASLTranslate.one === 'function')
      ? window.ASLTranslate.one
      : function (t) { return Promise.resolve(t); }; // repli si le module n'est pas chargé

    Promise.all([
      translate(msgFr, 'en'),
      translate(msgFr, 'es'),
      translate(msgFr, 'ar')
    ]).then(function (out) {
      var minStay = { days: days, message: { fr: msgFr, en: out[0] || msgFr, es: out[1] || msgFr, ar: out[2] || msgFr } };

      /* Cache local immédiat (site + admin hors-ligne cohérents tout de suite) */
      try {
        var all = {};
        try { all = JSON.parse(localStorage.getItem(MKT_LOCAL_KEY) || '{}'); } catch (e) { all = {}; }
        all.minStay = minStay;
        localStorage.setItem(MKT_LOCAL_KEY, JSON.stringify(all));
      } catch (e) {}

      if (typeof fetch === 'undefined') { setStatus('Enregistré en local (pas de réseau).', 'ok'); return; }

      /* Fusionne avec le document marketing serveur (sans écraser le reste), puis renvoie. */
      fetch('/api/marketing', { headers: { 'Cache-Control': 'no-cache' } })
        .then(function (r) { return r.ok ? r.json() : null; })
        .then(function (resp) {
          var doc = (resp && resp.data) ? resp.data : {};
          doc.minStay = minStay;
          return fetch('/api/marketing', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(doc)
          });
        })
        .then(function (r) { return r && r.ok ? r.json() : null; })
        .then(function () {
          setStatus('✓ Enregistré et traduit — appliqué immédiatement sur le site client (' + days + ' jour(s) minimum).', 'ok');
          if (typeof showToast === 'function') showToast('Durée minimale mise à jour ✓');
        })
        .catch(function () {
          setStatus('Enregistré localement, synchronisation serveur en attente (hors-ligne ?).', 'err');
        });
    });
  };

  /* Chargement des champs déclenché par showPage('minstay', …) dans index.html
     (la section est maintenant une page dédiée, regroupée avec Assurances et
     Options de réservation, et non plus une carte de Paramètres système). */
  document.addEventListener('DOMContentLoaded', function () {
    var pm = document.getElementById('page-minstay');
    if (pm && pm.classList.contains('active')) loadMinStayConfigUI();
  });
})();
