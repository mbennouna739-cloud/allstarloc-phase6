/* ============================================================
   ALL STAR LOC — CLÔTURE DE PÉRIODE & ARCHIVAGE (interface)
   Surcouche d'interface au-dessus du moteur d'archivage du
   data layer (ASLDB.closePeriod / getArchives / restoreArchive /
   deleteArchive). Une vraie clôture : archive tout l'opérationnel
   terminé, remet le tableau de bord à zéro, garde tout consultable.
   Les éléments permanents (véhicules, tarifs, paramètres, FAQ,
   blog, marketing, entretien) ne sont JAMAIS touchés.
   ============================================================ */
(function () {
  'use strict';

  function money(n) {
    n = Math.round(Number(n) || 0);
    return n.toLocaleString('fr-FR').replace(/\u202f/g, ' ') + ' MAD';
  }
  function esc(s) { return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }

  function getArchives() {
    try { return (typeof ASLDB !== 'undefined' && ASLDB.getArchives) ? (ASLDB.getArchives() || []) : []; } catch (e) { return []; }
  }

  function _defaultLabel() {
    var d = new Date();
    var moy = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'];
    return 'Période ' + moy[d.getMonth()] + ' ' + d.getFullYear();
  }

  /* ---- CLÔTURE DE PÉRIODE (remplace l'ancien reset) ---- */
  window.confirmReset = function () {
    var res = [];
    try { res = (typeof ASLDB !== 'undefined' && ASLDB.getReservations) ? ASLDB.getReservations() : []; } catch (e) {}
    var charges = [];
    try { charges = JSON.parse(localStorage.getItem('asl_charges_v1') || '[]'); } catch (e) {}

    if (!res.length && !charges.length) {
      alert('Aucune donnée opérationnelle à clôturer.\nLe tableau de bord est déjà vide.');
      return;
    }

    var totalEnc = res.reduce(function (s, r) { return s + (Number(r.paid) || 0); }, 0);
    var totalChg = charges.filter(function (c) { return c.status !== 'pending'; }).reduce(function (s, c) { return s + (Number(c.amount) || 0); }, 0);

    var msg = '⚠ CLÔTURE DE PÉRIODE\n\n'
      + 'Cette action va ARCHIVER puis VIDER le tableau de bord :\n'
      + '• ' + res.length + ' réservation(s) / location(s)\n'
      + '• ' + charges.length + ' charge(s)\n'
      + '• Paiements, activité récente, grand livre\n\n'
      + 'Encaissé : ' + money(totalEnc) + '   |   Charges : ' + money(totalChg) + '\n\n'
      + 'Les véhicules, tarifs, paramètres, FAQ, blog, marketing et\n'
      + 'l\'historique d\'entretien NE sont PAS touchés.\n\n'
      + 'Tout restera consultable dans les Archives. Continuer ?';
    if (!confirm(msg)) return;

    var label = prompt('Nom de cette période archivée :', _defaultLabel());
    if (label === null) return;
    if (!confirm('⛔ CONFIRMATION FINALE\n\nLe tableau de bord va repartir à zéro.\nLes données sont archivées (jamais supprimées).\n\nConfirmer la clôture ?')) return;

    var snap = null;
    try {
      if (typeof ASLDB !== 'undefined' && ASLDB.closePeriod) {
        snap = ASLDB.closePeriod((label || '').trim() || _defaultLabel());
      }
    } catch (e) {}

    // Rafraîchir toute l'interface (dashboard à zéro)
    refreshAll();

    if (typeof showToast === 'function') showToast('Période clôturée et archivée ✓');
    alert('✓ Période clôturée.\n\nLe tableau de bord est repassé à zéro.\nArchive « ' + ((snap && snap.label) || label) + ' » consultable dans Paramètres → Archives.');
    renderArchives();

    // ★ CORRECTIF : le vidage local est immédiat, mais sa confirmation par le
    //   serveur (donc sa propagation vers les autres appareils, mobile compris)
    //   est asynchrone. On vérifie ici, après un court délai, si elle a bien
    //   abouti ; sinon on prévient l'administrateur au lieu de laisser croire
    //   — à tort — que TOUS les appareils sont déjà à jour. La relance
    //   automatique (ASLDB) continue en arrière-plan tant que ce n'est pas confirmé.
    setTimeout(function () {
      try {
        if (localStorage.getItem('asl_pending_reservations_reset_v1')) {
          var msg = "Clôture pas encore confirmée par le serveur — les autres appareils (mobile) peuvent encore afficher l'ancien état. Nouvelle tentative automatique en cours.";
          if (typeof showToast === 'function') showToast('⚠ ' + msg);
          else alert('⚠ ' + msg + '\n\nVérifiez le badge de synchro en bas de l\'écran.');
        }
      } catch (e) {}
    }, 3000);
  };

  function refreshAll() {
    ['reloadData', 'renderDashboard', 'renderRentals', 'renderAllReservations', 'renderPayments',
      'renderCustomers', 'updateBadges', 'renderCaisse', 'renderMobileDash'].forEach(function (fn) {
      try { if (typeof window[fn] === 'function') window[fn](); } catch (e) {}
    });
  }

  /* ---- LISTE DES ARCHIVES ---- */
  window.renderArchives = function () {
    var host = document.getElementById('archives-list');
    if (!host) return;
    var archives = getArchives();
    var q = (document.getElementById('archive-search') ? document.getElementById('archive-search').value : '').toLowerCase().trim();
    if (q) {
      archives = archives.filter(function (a) {
        if ((a.label || '').toLowerCase().indexOf(q) >= 0) return true;
        return (a.reservations || []).some(function (r) {
          return ((r.client || '') + ' ' + (r.car || '') + ' ' + (r.contractRef || '')).toLowerCase().indexOf(q) >= 0;
        });
      });
    }
    if (!archives.length) {
      host.innerHTML = '<div style="text-align:center;padding:30px;color:#999;font-size:14px;">' +
        (q ? 'Aucune archive ne correspond à « ' + esc(q) + ' ».' : 'Aucune archive pour le moment. Les périodes clôturées apparaîtront ici.') + '</div>';
      return;
    }
    host.innerHTML = archives.map(function (a) {
      var s = a.stats || a.summary || {};
      var enc = s.encaisse || 0, chg = s.charges || 0;
      var nbRes = s.totalReservations != null ? s.totalReservations : (s.nbReservations || (a.reservations || []).length);
      var closed = a.closedAt ? new Date(a.closedAt).toLocaleString('fr-FR') : (a.closedAtStr || '');
      return '<div class="table-card" style="padding:16px;margin-bottom:12px;">'
        + '<div style="display:flex;justify-content:space-between;align-items:flex-start;flex-wrap:wrap;gap:10px;">'
        + '<div><div style="font-weight:800;font-size:15px;color:#1a1a2e;">📦 ' + esc(a.label) + '</div>'
        + '<div style="font-size:12px;color:#667;margin-top:2px;">Clôturée le ' + esc(closed) + '</div></div>'
        + '<div style="display:flex;gap:6px;flex-wrap:wrap;">'
        + '<button class="topbar-btn" style="border:1px solid var(--border);font-size:12px;padding:6px 10px;" onclick="viewArchive(\'' + a.id + '\')">👁 Consulter</button>'
        + '<button class="topbar-btn" style="border:1px solid var(--border);font-size:12px;padding:6px 10px;" onclick="exportArchiveExcel(\'' + a.id + '\')">📊 Excel</button>'
        + '<button class="topbar-btn" style="border:1px solid var(--border);font-size:12px;padding:6px 10px;" onclick="doRestoreArchive(\'' + a.id + '\')">↩ Réintégrer dans l\'actif</button>'
        + '<button class="topbar-btn" style="border:1px solid rgba(196,30,58,.3);color:var(--red);font-size:12px;padding:6px 10px;" onclick="doDeleteArchive(\'' + a.id + '\')">🗑</button>'
        + '</div></div>'
        + '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(110px,1fr));gap:8px;margin-top:12px;">'
        + _stat('Réservations', nbRes, '#4f46e5')
        + _stat('Encaissé', money(enc), '#16a34a')
        + _stat('Charges', money(chg), '#dc2626')
        + _stat('Solde réel', money(enc - chg), '#1a1a2e')
        + '</div></div>';
    }).join('');
  };

  function _stat(label, val, color) {
    return '<div style="background:#fafafa;border-radius:8px;padding:8px 10px;"><div style="font-size:10.5px;color:#667;">' + label + '</div><div style="font-size:14px;font-weight:800;color:' + (color || '#1a1a2e') + ';">' + val + '</div></div>';
  }

  /* ---- CONSULTER ---- */
  window.viewArchive = function (id) {
    var a = getArchives().filter(function (x) { return x.id === id; })[0];
    if (!a) return;
    var host = document.getElementById('archive-modal-host');
    if (!host) { host = document.createElement('div'); host.id = 'archive-modal-host'; document.body.appendChild(host); }
    var closed = a.closedAt ? new Date(a.closedAt).toLocaleString('fr-FR') : '';
    var rows = (a.reservations || []).map(function (r) {
      var reste = Math.max(0, (Number(r.amount) || 0) - (Number(r.paid) || 0));
      return '<tr><td>' + esc(r.contractRef || r.id || '') + '</td><td>' + esc(r.client || '') + '</td><td>' + esc(r.car || '') + '</td>'
        + '<td style="font-size:11px;">' + esc((r.startDate || '') + (r.endDate ? ' → ' + r.endDate : '')) + '</td>'
        + '<td style="text-align:right;">' + money(r.amount || 0) + '</td><td style="text-align:right;color:#16a34a;">' + money(r.paid || 0) + '</td>'
        + '<td style="text-align:right;color:#d97706;">' + money(reste) + '</td></tr>';
    }).join('');
    var chgRows = (a.charges || []).map(function (c) {
      return '<tr><td>' + esc(c.date || '') + '</td><td>' + esc(c.vehicle || '—') + '</td><td>' + esc(c.category || '') + '</td>'
        + '<td>' + esc(c.description || '') + '</td><td style="text-align:right;color:#dc2626;">' + money(c.amount || 0) + '</td></tr>';
    }).join('');
    host.innerHTML =
      '<div style="position:fixed;inset:0;background:rgba(10,12,18,.5);z-index:8000;display:flex;align-items:center;justify-content:center;padding:16px;" onclick="if(event.target===this)closeArchiveModal()">'
      + '<div style="background:#fff;border-radius:16px;max-width:820px;width:100%;max-height:90vh;overflow-y:auto;box-shadow:0 24px 60px rgba(0,0,0,.25);">'
      + '<div style="padding:18px 20px;border-bottom:1px solid #eee;display:flex;align-items:center;justify-content:space-between;position:sticky;top:0;background:#fff;">'
      + '<strong style="font-size:16px;">📦 ' + esc(a.label) + '</strong>'
      + '<button onclick="closeArchiveModal()" style="background:none;border:none;font-size:20px;cursor:pointer;color:#999;">&#10005;</button></div>'
      + '<div style="padding:20px;">'
      + '<div style="font-size:12px;color:#667;margin-bottom:14px;">Clôturée le ' + esc(closed) + '</div>'
      + '<h4 style="font-size:13px;font-weight:800;margin:0 0 8px;">Réservations / Locations (' + (a.reservations || []).length + ')</h4>'
      + (rows ? '<div style="overflow-x:auto;"><table class="data-table" style="width:100%;font-size:12px;"><thead><tr><th>Réf.</th><th>Client</th><th>Véhicule</th><th>Période</th><th style="text-align:right;">Total</th><th style="text-align:right;">Payé</th><th style="text-align:right;">Reste</th></tr></thead><tbody>' + rows + '</tbody></table></div>' : '<div style="color:#999;font-size:12px;padding:10px 0;">Aucune réservation.</div>')
      + '<h4 style="font-size:13px;font-weight:800;margin:18px 0 8px;">Charges (' + (a.charges || []).length + ')</h4>'
      + (chgRows ? '<div style="overflow-x:auto;"><table class="data-table" style="width:100%;font-size:12px;"><thead><tr><th>Date</th><th>Véhicule</th><th>Catégorie</th><th>Description</th><th style="text-align:right;">Montant</th></tr></thead><tbody>' + chgRows + '</tbody></table></div>' : '<div style="color:#999;font-size:12px;padding:10px 0;">Aucune charge.</div>')
      + '</div>'
      + '<div style="padding:16px 20px;border-top:1px solid #eee;display:flex;gap:10px;justify-content:flex-end;flex-wrap:wrap;">'
      + '<button onclick="exportArchiveExcel(\'' + a.id + '\')" style="padding:9px 16px;border:1px solid #ddd;background:#fff;border-radius:8px;cursor:pointer;">📊 Export Excel</button>'
      + '<button onclick="doRestoreArchive(\'' + a.id + '\')" style="padding:9px 16px;border:1px solid #ddd;background:#fff;border-radius:8px;cursor:pointer;">↩ Réintégrer dans l\'actif</button>'
      + '<button onclick="closeArchiveModal()" style="padding:9px 16px;border:none;background:#C41E3A;color:#fff;border-radius:8px;cursor:pointer;">Fermer</button>'
      + '</div></div></div>';
  };

  window.closeArchiveModal = function () { var h = document.getElementById('archive-modal-host'); if (h) h.innerHTML = ''; };

  /* ---- EXPORT EXCEL ---- */
  window.exportArchiveExcel = function (id) {
    var a = getArchives().filter(function (x) { return x.id === id; })[0];
    if (!a) return;
    var s = a.stats || a.summary || {};
    var enc = s.encaisse || 0, chg = s.charges || 0;
    var rows = [];
    rows.push(['ALL STAR LOC — Archive de période']);
    rows.push(['Période', a.label]);
    rows.push(['Clôturée le', a.closedAt ? new Date(a.closedAt).toLocaleString('fr-FR') : '']);
    rows.push([]);
    rows.push(['RÉSUMÉ']);
    rows.push(['Réservations', s.totalReservations != null ? s.totalReservations : (a.reservations || []).length]);
    rows.push(['Encaissé', Math.round(enc)]);
    rows.push(['Charges', Math.round(chg)]);
    rows.push(['Solde réel', Math.round(enc - chg)]);
    rows.push([]);
    rows.push(['RÉSERVATIONS / LOCATIONS']);
    rows.push(['Réf.', 'Client', 'Véhicule', 'Début', 'Fin', 'Total', 'Payé', 'Reste', 'Mode']);
    (a.reservations || []).forEach(function (r) {
      rows.push([r.contractRef || r.id || '', r.client || '', r.car || '', r.startDate || '', r.endDate || '',
        Math.round(r.amount || 0), Math.round(r.paid || 0), Math.round(Math.max(0, (r.amount || 0) - (r.paid || 0))), r.paymentMode || '']);
    });
    rows.push([]);
    rows.push(['CHARGES']);
    rows.push(['Date', 'Véhicule', 'Catégorie', 'Description', 'Montant', 'Statut']);
    (a.charges || []).forEach(function (c) {
      rows.push([c.date || '', c.vehicle || '', c.category || '', c.description || '', Math.round(c.amount || 0), c.status === 'pending' ? 'En attente' : 'Payée']);
    });
    var csv = rows.map(function (row) {
      return row.map(function (cell) {
        var v = String(cell == null ? '' : cell);
        return /[",;\n]/.test(v) ? '"' + v.replace(/"/g, '""') + '"' : v;
      }).join(';');
    }).join('\n');
    var blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
    var url = URL.createObjectURL(blob);
    var el = document.createElement('a');
    el.href = url; el.download = 'archive_' + (a.label || '').replace(/\s+/g, '_') + '.csv';
    document.body.appendChild(el); el.click(); document.body.removeChild(el);
    setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
    if (typeof showToast === 'function') showToast('Archive exportée ✓');
  };

  /* ---- RÉINTÉGRER UNE ARCHIVE DANS L'ACTIF ----
     ★ Important : ceci AJOUTE les réservations/charges de cette période
     archivée aux données actuellement actives (fusion, sans doublon par id).
     Ce n'est PAS une restauration de sauvegarde : pour revenir exactement à
     un état antérieur du système entier, sans mélange, utilisez « Restaurer
     une sauvegarde… » dans Paramètres → Sauvegarde &amp; restauration complète. */
  window.doRestoreArchive = async function (id) {
    var a = getArchives().filter(function (x) { return x.id === id; })[0];
    if (!a) return;
    if (!confirm('↩ RÉINTÉGRER « ' + a.label + ' » DANS L\'ACTIF\n\nLes réservations et charges de cette archive vont être AJOUTÉES aux données actuellement actives du tableau de bord (elles s\'ajoutent, elles ne remplacent rien).\n\nCe n\'est PAS une restauration de sauvegarde complète. Continuer ?')) return;
    /* Attendre que la restauration soit poussée au serveur avant d'afficher la confirmation
       Ainsi, si l'utilisateur ouvre le mobile 1 seconde après, les données sont déjà sur le serveur. */
    try { if (typeof ASLDB !== 'undefined' && ASLDB.restoreArchive) await ASLDB.restoreArchive(id); } catch (e) {}
    refreshAll();
    closeArchiveModal();
    renderArchives();
    if (typeof showToast === 'function') showToast('Période réintégrée ✓ — synchronisé sur tous les appareils');
    alert('✓ Période réintégrée dans l\'actif et synchronisée.\nLes données sont maintenant disponibles sur tous vos appareils (mobile, desktop).');
  };

  /* ---- SUPPRIMER ---- */
  window.doDeleteArchive = function (id) {
    if (!confirm('🗑 Supprimer définitivement cette archive ?\n\nCette action est irréversible.')) return;
    try { if (typeof ASLDB !== 'undefined' && ASLDB.deleteArchive) ASLDB.deleteArchive(id); } catch (e) {}
    renderArchives();
    if (typeof showToast === 'function') showToast('Archive supprimée');
  };

  /* ============================================================
     ★ REFONTE — SAUVEGARDE COMPLÈTE / RESTAURATION EXACTE / RESET TEST
     Interface au-dessus d'ASLDB.exportFullBackup / restoreFullBackup /
     resetTestData (data.js). Voir ces fonctions pour le détail technique :
     restoreFullBackup() REMPLACE tout (jamais de fusion) et purge le cache
     local de l'appareil qui restaure, pour bannir tout mélange.
     ============================================================ */
  function _downloadJSON(obj, filename) {
    var blob = new Blob([JSON.stringify(obj, null, 2)], { type: 'application/json;charset=utf-8;' });
    var url = URL.createObjectURL(blob);
    var el = document.createElement('a');
    el.href = url; el.download = filename;
    document.body.appendChild(el); el.click(); document.body.removeChild(el);
    setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
  }
  function _dateStamp() {
    var d = new Date();
    function p(n) { return String(n).padStart(2, '0'); }
    return d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate()) + '_' + p(d.getHours()) + 'h' + p(d.getMinutes());
  }

  /* ---- 📦 Télécharger une sauvegarde complète ---- */
  window.doExportFullBackup = async function () {
    if (typeof ASLDB === 'undefined' || !ASLDB.exportFullBackup) { alert('Fonction de sauvegarde indisponible.'); return; }
    try {
      if (typeof showToast === 'function') showToast('Préparation de la sauvegarde…');
      var backup = await ASLDB.exportFullBackup();
      _downloadJSON(backup, 'allstarloc_sauvegarde_' + _dateStamp() + '.json');
      if (typeof showToast === 'function') showToast('✓ Sauvegarde téléchargée');
      else alert('✓ Sauvegarde complète téléchargée.');
    } catch (e) {
      alert('⚠ Échec de la sauvegarde : ' + (e && e.message ? e.message : 'erreur inconnue') + '\n\nVérifiez votre connexion et votre session (clé admin).');
    }
  };

  /* ---- ⚠ Restaurer une sauvegarde (remplace TOUT, jamais de fusion) ---- */
  window.handleBackupRestoreFile = function (input) {
    var file = input && input.files && input.files[0];
    if (!file) return;
    var reader = new FileReader();
    reader.onload = async function () {
      var parsed;
      try { parsed = JSON.parse(reader.result); } catch (e) {
        alert('⚠ Fichier invalide : ce n\'est pas un JSON de sauvegarde valide.');
        input.value = '';
        return;
      }
      var backup = parsed && parsed.data ? parsed : null; // accepte soit {version,data} directement
      if (!backup) { alert('⚠ Ce fichier ne correspond pas à une sauvegarde ALL STAR LOC valide.'); input.value = ''; return; }
      var when = backup.exportedAt ? new Date(backup.exportedAt).toLocaleString('fr-FR') : 'date inconnue';
      var step1 = confirm(
        '⚠ RESTAURATION COMPLÈTE — À LIRE ATTENTIVEMENT\n\n' +
        'Sauvegarde du : ' + when + '\n\n' +
        'Cette action va REMPLACER INTÉGRALEMENT l\'état actuel du système ' +
        '(véhicules, réservations, employés, marketing/FAQ/blog, sous-locations, ' +
        'charges, entretien, documents, LLD, archives) par le contenu de ce fichier.\n\n' +
        'AUCUNE fusion : tout ce qui n\'est pas dans cette sauvegarde sera perdu. ' +
        'Toutes les données actuelles seront écrasées, sur TOUS les appareils ' +
        '(desktop et mobile), sans exception.\n\n' +
        'Voulez-vous continuer ?'
      );
      if (!step1) { input.value = ''; return; }
      var step2 = confirm(
        '⛔ CONFIRMATION FINALE\n\n' +
        'Il n\'y a pas de retour en arrière possible après cette action ' +
        '(sauf si vous avez vous-même une sauvegarde de l\'état actuel).\n\n' +
        'Confirmer la restauration complète ?'
      );
      if (!step2) { input.value = ''; return; }

      try {
        if (typeof showToast === 'function') showToast('Restauration en cours…');
        var out = await ASLDB.restoreFullBackup(backup);
        refreshAll();
        if (typeof renderArchives === 'function') renderArchives();
        var r = out && out.result;
        if (r && r.errors && r.errors.length) {
          alert('⚠ Restauration PARTIELLE.\n\nCertains éléments n\'ont pas pu être restaurés :\n' + r.errors.join('\n') + '\n\nRéessayez, ou vérifiez votre connexion.');
        } else {
          if (typeof showToast === 'function') showToast('✓ Restauration complète effectuée — synchronisé sur tous les appareils');
          alert('✓ Restauration complète effectuée.\n\nL\'état du système correspond maintenant exactement à la sauvegarde du ' + when + ', sur tous les appareils (desktop et mobile).');
        }
      } catch (e) {
        alert('⚠ Échec de la restauration : ' + (e && e.message ? e.message : 'erreur inconnue') + '\n\nAucune modification locale n\'a été appliquée sans confirmation du serveur.');
      } finally {
        input.value = '';
      }
    };
    reader.onerror = function () { alert('⚠ Impossible de lire ce fichier.'); input.value = ''; };
    reader.readAsText(file);
  };

  /* ---- 🧹 Réinitialiser les données de test (avant mise en production) ----
     ★ Distincte de « Clôturer la période » : ne crée PAS d'archive
     commerciale, prend une sauvegarde de sécurité automatique, et ne touche
     jamais à la flotte, aux tarifs, aux employés ni à la configuration. */
  window.confirmResetTestData = async function () {
    var res = []; var charges = [];
    try { res = (typeof ASLDB !== 'undefined' && ASLDB.getReservations) ? ASLDB.getReservations() : []; } catch (e) {}
    try { charges = JSON.parse(localStorage.getItem('asl_charges_v1') || '[]'); } catch (e) {}

    if (!res.length && !charges.length) {
      alert('Aucune donnée de test à effacer.\nLe tableau de bord est déjà vide.');
      return;
    }

    var step1 = confirm(
      '🧹 RÉINITIALISATION DES DONNÉES DE TEST\n\n' +
      'Cette action va effacer :\n' +
      '• ' + res.length + ' réservation(s) / location(s) de test\n' +
      '• ' + charges.length + ' charge(s) de test\n\n' +
      'Elle NE crée PAS d\'archive commerciale (contrairement à « Clôturer la période »).\n' +
      'Une sauvegarde complète automatique sera prise juste avant, en filet de sécurité.\n\n' +
      'JAMAIS touchés : véhicules, tarifs, employés, marketing, FAQ, blog.\n\n' +
      'Continuer ?'
    );
    if (!step1) return;
    var step2 = confirm('⛔ CONFIRMATION FINALE\n\nLes données de test seront définitivement effacées (une sauvegarde de sécurité sera téléchargée). Confirmer ?');
    if (!step2) return;

    try {
      if (typeof showToast === 'function') showToast('Réinitialisation des données de test…');
      var out = await ASLDB.resetTestData();
      if (out && out.safetyBackup) {
        _downloadJSON(out.safetyBackup, 'allstarloc_sauvegarde_avant_reset_test_' + _dateStamp() + '.json');
      }
      refreshAll();
      if (typeof showToast === 'function') showToast('✓ Données de test réinitialisées');
      alert('✓ Données de test réinitialisées.\n\nLe tableau de bord est reparti à zéro (réservations, locations, impayés, caisse). Véhicules, tarifs, employés et configuration inchangés.' +
        (out && out.safetyBackup ? '\n\nUne sauvegarde de sécurité vient d\'être téléchargée.' : '\n\n⚠ La sauvegarde de sécurité automatique a échoué (hors-ligne ?) — pensez à en refaire une manuellement.'));
    } catch (e) {
      alert('⚠ Échec de la réinitialisation : ' + (e && e.message ? e.message : 'erreur inconnue'));
    }
  };

  document.addEventListener('DOMContentLoaded', function () {
    if (document.getElementById('archives-list')) renderArchives();
  });
})();
