/* ============================================================
   ALL STAR LOC — LOT 45 · Finitions UX (back-office uniquement)
   admin-ux.js — chargé EN DERNIER par admin/index.html.

   Ce fichier ne modifie AUCUNE logique : ni données, ni calculs, ni
   synchronisation. Il ne touche ni au site client ni au marketing
   (pages séparées qui ne le chargent pas).

   1. Messages d'information (alert) affichés dans une fenêtre aux
      couleurs de l'application au lieu de la boîte grise du navigateur.
      Les CONFIRMATIONS (confirm) et SAISIES (prompt) restent natives :
      leur fonctionnement bloquant protège les décisions importantes
      (suppression, montants…).
   2. Tableaux : numéros de contrat, montants, plaques et statuts ne se
      coupent plus sur deux lignes.
   ============================================================ */
(function () {
  'use strict';

  /* ---------- 1. Fenêtre de message ---------- */
  var nativeAlert = window.alert ? window.alert.bind(window) : null;
  window._aslNativeAlert = nativeAlert;
  var queue = [];
  var openNow = false;

  function esc(s) {
    return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }
  /* Ton du message, déduit de son contenu (aucun appel n'est modifié). */
  function toneOf(msg) {
    var m = String(msg || '');
    var head = m.slice(0, 80).toLowerCase();
    if (/^[\s]*(⛔|❌|🚫)/.test(m) || /erreur|impossible|invalide|échec|refus|trop volumineu|introuvable|conflit/.test(head)) return 'error';
    if (/^[\s]*(⚠|⚠️)/.test(m) || /attention|merci de|veuillez|complétez|saisissez|sélectionnez|choisissez|autorisez|aucun|aucune/.test(head)) return 'warn';
    if (/^[\s]*(✓|✅|✔)/.test(m) || /créé|créée|enregistr|terminé|terminée|réussi|succès|mis à jour|mise à jour|copié/.test(head)) return 'ok';
    return 'info';
  }
  var TONES = {
    error: { title: 'Action impossible', color: '#C41E3A', bg: 'rgba(196,30,58,.10)',
      icon: '<circle cx="12" cy="12" r="9"/><path d="M12 8v5"/><path d="M12 16.5h.01"/>' },
    warn: { title: 'Attention', color: '#B45309', bg: 'rgba(217,119,6,.12)',
      icon: '<path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z"/><path d="M12 9v4"/><path d="M12 17h.01"/>' },
    ok: { title: 'C\'est fait', color: '#15803D', bg: 'rgba(22,163,74,.12)',
      icon: '<circle cx="12" cy="12" r="9"/><path d="m8 12 3 3 5-6"/>' },
    info: { title: 'Information', color: '#1D4ED8', bg: 'rgba(37,99,235,.10)',
      icon: '<circle cx="12" cy="12" r="9"/><path d="M12 11v5"/><path d="M12 7.5h.01"/>' }
  };
  /* Retire l'emoji de tête : l'icône de la fenêtre joue déjà ce rôle. */
  function cleanText(msg) {
    return String(msg == null ? '' : msg).replace(/^[\s]*(⛔|❌|🚫|⚠️|⚠|✓|✅|✔|🗑)\s*/, '');
  }

  function showNext() {
    if (openNow || !queue.length) return;
    openNow = true;
    var msg = queue.shift();
    var t = TONES[toneOf(msg)];
    var text = cleanText(msg);
    // Première ligne en MAJUSCULES (ex. « CONFLIT DÉTECTÉ ») = titre du message.
    var lines = text.split('\n');
    var title = t.title;
    if (lines.length > 1 && lines[0].length <= 60 && lines[0] === lines[0].toUpperCase() && /[A-ZÀ-Ý]/.test(lines[0])) {
      title = lines[0].charAt(0) + lines[0].slice(1).toLowerCase();
      text = lines.slice(1).join('\n').replace(/^\s+/, '');
    }
    var ov = document.createElement('div');
    ov.className = 'asl-dlg-ov';
    ov.setAttribute('role', 'alertdialog');
    ov.setAttribute('aria-modal', 'true');
    ov.innerHTML =
      '<div class="asl-dlg" tabindex="-1">' +
      '<div class="asl-dlg-ico" style="background:' + t.bg + ';color:' + t.color + ';">' +
      '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + t.icon + '</svg></div>' +
      '<div class="asl-dlg-title">' + esc(title) + '</div>' +
      (text ? '<div class="asl-dlg-msg">' + esc(text) + '</div>' : '') +
      '<button type="button" class="asl-dlg-btn">OK</button>' +
      '</div>';
    function close() {
      document.removeEventListener('keydown', onKey, true);
      ov.classList.add('closing');
      setTimeout(function () { if (ov.parentNode) ov.parentNode.removeChild(ov); openNow = false; showNext(); }, 120);
    }
    function onKey(e) {
      if (e.key === 'Enter' || e.key === 'Escape' || e.key === ' ') { e.preventDefault(); e.stopPropagation(); close(); }
    }
    ov.querySelector('.asl-dlg-btn').onclick = close;
    ov.addEventListener('click', function (e) { if (e.target === ov) close(); });
    document.addEventListener('keydown', onKey, true);
    (document.body || document.documentElement).appendChild(ov);
    try { ov.querySelector('.asl-dlg-btn').focus(); } catch (e) {}
  }

  window.alert = function (msg) {
    try {
      if (!document.body) { if (nativeAlert) nativeAlert(msg); return; }
      queue.push(msg);
      showNext();
    } catch (e) {
      if (nativeAlert) nativeAlert(msg); // repli : jamais de message perdu
    }
  };

  /* ---------- Styles ---------- */
  var css = [
    /* Fenêtre de message */
    '.asl-dlg-ov{position:fixed;inset:0;z-index:2147483000;background:rgba(10,12,18,.45);display:flex;align-items:center;justify-content:center;padding:20px;animation:aslDlgIn .14s ease-out;}',
    '.asl-dlg-ov.closing{opacity:0;transition:opacity .12s;}',
    '.asl-dlg{background:#fff;color:#101216;border-radius:16px;width:100%;max-width:400px;padding:24px 22px 18px;box-shadow:0 24px 64px rgba(0,0,0,.28);text-align:center;font-family:var(--font,"Outfit",system-ui,sans-serif);outline:none;max-height:85vh;overflow-y:auto;animation:aslDlgPop .16s ease-out;}',
    '.asl-dlg-ico{width:46px;height:46px;border-radius:50%;display:flex;align-items:center;justify-content:center;margin:0 auto 12px;}',
    '.asl-dlg-title{font-size:16.5px;font-weight:800;letter-spacing:-.01em;margin-bottom:6px;}',
    '.asl-dlg-msg{font-size:14px;line-height:1.55;color:#4b5563;white-space:pre-line;word-break:break-word;margin-bottom:4px;}',
    '.asl-dlg-btn{margin-top:16px;width:100%;min-height:44px;border:none;border-radius:11px;background:#C41E3A;color:#fff;font-size:14.5px;font-weight:700;cursor:pointer;font-family:inherit;}',
    '.asl-dlg-btn:hover{background:#9B1830;}',
    '.asl-dlg-btn:focus-visible{outline:3px solid rgba(196,30,58,.35);outline-offset:2px;}',
    '@keyframes aslDlgIn{from{opacity:0}to{opacity:1}}',
    '@keyframes aslDlgPop{from{transform:translateY(6px) scale(.98);opacity:0}to{transform:none;opacity:1}}',

    /* ---------- 2. Tableaux : pas de coupure des valeurs courtes ----------
       Les pastilles de STATUT restent toujours sur une ligne. Le reste
       (numéros, montants, dates, plaques) uniquement sur écran large :
       sur un portable, les tableaux gardent exactement leur largeur
       d'origine (aucun défilement horizontal ajouté). */
    '#dashboard-reservations td:nth-child(9) .badge,#rentals-table td:nth-child(11) .badge,#history-table td:nth-child(8) .badge,#payments-table td:nth-child(9) .badge{white-space:nowrap;}',
    '@media (min-width:1400px){' +
      '.table-card .badge{white-space:nowrap;}' +
      '#dashboard-reservations td:nth-child(1),#dashboard-reservations td:nth-child(4),#dashboard-reservations td:nth-child(6),#dashboard-reservations td:nth-child(8){white-space:nowrap;}' +
      '#all-reservations td:nth-child(1),#all-reservations td:nth-child(9){white-space:nowrap;}' +
      '#rentals-table td:nth-child(1),#rentals-table td:nth-child(9){white-space:nowrap;}' +
      '#history-table td:nth-child(1),#history-table td:nth-child(7){white-space:nowrap;}' +
      '#payments-table td:nth-child(1),#payments-table td:nth-child(5),#payments-table td:nth-child(6),#payments-table td:nth-child(7),#payments-table td:nth-child(10){white-space:nowrap;}' +
      '#customers-table td:nth-child(7),#customers-table td:nth-child(8){white-space:nowrap;}' +
    '}'
  ].join('\n');
  var st = document.createElement('style');
  st.id = 'asl-ux-style';
  st.textContent = css;
  (document.head || document.documentElement).appendChild(st);
})();
