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
        + '<button class="topbar-btn" style="border:1px solid var(--border);font-size:12px;padding:6px 10px;" onclick="doRestoreArchive(\'' + a.id + '\')">♻ Restaurer</button>'
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
      + '<button onclick="doRestoreArchive(\'' + a.id + '\')" style="padding:9px 16px;border:1px solid #ddd;background:#fff;border-radius:8px;cursor:pointer;">♻ Restaurer</button>'
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

  /* ---- RESTAURER ---- */
  window.doRestoreArchive = function (id) {
    var a = getArchives().filter(function (x) { return x.id === id; })[0];
    if (!a) return;
    if (!confirm('♻ RESTAURER « ' + a.label + ' »\n\nLes réservations et charges de cette archive vont être rajoutées aux données actives du tableau de bord.\n\nContinuer ?')) return;
    try { if (typeof ASLDB !== 'undefined' && ASLDB.restoreArchive) ASLDB.restoreArchive(id); } catch (e) {}
    refreshAll();
    closeArchiveModal();
    renderArchives();
    if (typeof showToast === 'function') showToast('Archive restaurée ✓');
    alert('✓ Archive restaurée.\nLes données ont été rajoutées au tableau de bord.');
  };

  /* ---- SUPPRIMER ---- */
  window.doDeleteArchive = function (id) {
    if (!confirm('🗑 Supprimer définitivement cette archive ?\n\nCette action est irréversible.')) return;
    try { if (typeof ASLDB !== 'undefined' && ASLDB.deleteArchive) ASLDB.deleteArchive(id); } catch (e) {}
    renderArchives();
    if (typeof showToast === 'function') showToast('Archive supprimée');
  };

  document.addEventListener('DOMContentLoaded', function () {
    if (document.getElementById('archives-list')) renderArchives();
  });
})();
