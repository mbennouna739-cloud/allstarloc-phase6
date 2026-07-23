/* ============================================================
   ALL STAR LOC — Équipements personnalisés (custom features)
   Gestion CRUD depuis le back-office flotte.
   Stockage : asl_custom_features_v1
   Schéma : [{ id, name, lucideIcon, createdAt }]
   Par véhicule : car.customFeatures = { id: true/false, … }
   ============================================================ */

(function () {
  'use strict';

  var CF_KEY = 'asl_custom_features_v1';

  /* ---------- Lucide icons disponibles (subset professionnel) ---------- */
  var LUCIDE_ICONS = {
    'wifi':        '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12.55a11 11 0 0 1 14.08 0"/><path d="M1.42 9a16 16 0 0 1 21.16 0"/><path d="M8.53 16.11a6 6 0 0 1 6.95 0"/><circle cx="12" cy="20" r="1"/></svg>',
    'smartphone':  '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect width="14" height="20" x="5" y="2" rx="2" ry="2"/><path d="M12 18h.01"/></svg>',
    'tablet':      '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect width="16" height="20" x="4" y="2" rx="2" ry="2"/><line x1="12" x2="12.01" y1="18" y2="18"/></svg>',
    'navigation':  '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><polygon points="3 11 22 2 13 21 11 13 3 11"/></svg>',
    'camera':      '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z"/><circle cx="12" cy="13" r="3"/></svg>',
    'usb':         '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="10" cy="7" r="1"/><circle cx="14" cy="7" r="1"/><path d="M12 20v-8"/><path d="M8 20h8"/><path d="M12 4v3"/><path d="M9 7h6l1 5H8l1-5Z"/></svg>',
    'music':       '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/></svg>',
    'sun':         '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41"/></svg>',
    'thermometer': '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M14 14.76V3.5a2.5 2.5 0 0 0-5 0v11.26a4.5 4.5 0 1 0 5 0z"/></svg>',
    'shield':      '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z"/></svg>',
    'zap':         '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M4 14a1 1 0 0 1-.78-1.63l9.9-10.2a.5.5 0 0 1 .86.46l-1.92 6.02A1 1 0 0 0 13 10h7a1 1 0 0 1 .78 1.63l-9.9 10.2a.5.5 0 0 1-.86-.46l1.92-6.02A1 1 0 0 0 11 14z"/></svg>',
    'star':        '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>',
    'package':     '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M11 21.73a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73z"/><path d="M12 22V12"/><path d="m3.3 7 8.7 5 8.7-5"/><path d="M12 12 3.3 7"/></svg>',
    'map-pin':     '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M20 10c0 4.993-5.539 10.193-7.399 11.799a1 1 0 0 1-1.202 0C9.539 20.193 4 14.993 4 10a8 8 0 0 1 16 0"/><circle cx="12" cy="10" r="3"/></svg>',
    'baby':        '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M9 12h.01"/><path d="M15 12h.01"/><path d="M10 16c.5.3 1.2.5 2 .5s1.5-.2 2-.5"/><path d="M19 6.3a9 9 0 0 1 1.8 3.9 2 2 0 0 1 0 3.6 9 9 0 0 1-17.6 0 2 2 0 0 1 0-3.6A9 9 0 0 1 12 3c2 0 3.5 1.1 3.5 2.5s-.9 2.5-2 2.5c-.8 0-1.5-.4-1.5-1"/></svg>',
    'car':         '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M19 17H5v2H3V9l2-5h14l2 5v10h-2v-2Z"/><path d="M7 17h10"/><circle cx="7.5" cy="14.5" r="1.5"/><circle cx="16.5" cy="14.5" r="1.5"/></svg>',
    'settings':    '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/><circle cx="12" cy="12" r="3"/></svg>',
    'aperture':    '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="14.31" x2="20.05" y1="8" y2="17.94"/><line x1="9.69" x2="21.17" y1="8" y2="8"/><line x1="7.38" x2="13.12" y1="12" y2="2.06"/><line x1="9.69" x2="3.95" y1="16" y2="6.06"/><line x1="14.31" x2="2.83" y1="16" y2="16"/><line x1="16.62" x2="10.88" y1="12" y2="21.94"/></svg>',
  };

  /* ---------- Lecture / écriture ---------- */
  function readCF() {
    try {
      var raw = localStorage.getItem(CF_KEY);
      if (raw) return JSON.parse(raw);
    } catch (e) {}
    return [];
  }
  function writeCF(list) {
    try { localStorage.setItem(CF_KEY, JSON.stringify(list)); } catch (e) {}
    /* Synchroniser vers le serveur et les autres appareils */
    try { if (typeof ASLDB !== 'undefined' && ASLDB.noteLocalChange) ASLDB.noteLocalChange(CF_KEY); } catch (e) {}
    try { if (typeof ASLDB !== 'undefined' && ASLDB.syncNow) ASLDB.syncNow(); } catch (e) {}
  }

  /* ---------- Helpers ---------- */
  function uid() {
    return 'cf_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
  }
  function getSvg(iconKey) {
    return LUCIDE_ICONS[iconKey] || LUCIDE_ICONS['star'];
  }

  /* ================================================================
     POP-UP GESTION DES ÉQUIPEMENTS PERSONNALISÉS
     Ouvert depuis le bouton dans la toolbar de la page Flotte
  ================================================================ */

  window.openCustomFeaturesManager = function () {
    /* Overlay */
    var ov = document.createElement('div');
    ov.id = 'cf-overlay';
    ov.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.45);z-index:3000;display:flex;align-items:center;justify-content:center;padding:16px;';
    ov.innerHTML = '<div id="cf-modal" style="background:var(--card,#fff);border-radius:18px;width:100%;max-width:580px;max-height:90vh;display:flex;flex-direction:column;box-shadow:0 20px 60px rgba(0,0,0,.25);overflow:hidden;">' +
      /* Header */
      '<div style="display:flex;align-items:center;justify-content:space-between;padding:18px 22px;border-bottom:1px solid var(--border,#eee);">' +
        '<div>' +
          '<div style="font-size:16px;font-weight:800;color:var(--text);">Équipements personnalisés</div>' +
          '<div style="font-size:12px;color:var(--text3);margin-top:2px;">Créez des équipements dynamiques affichés sur le site client</div>' +
        '</div>' +
        '<button onclick="closeCFManager()" style="border:none;background:none;cursor:pointer;padding:6px;border-radius:8px;color:var(--text3);font-size:20px;line-height:1;">✕</button>' +
      '</div>' +
      /* Body */
      '<div style="overflow-y:auto;flex:1;padding:20px 22px;">' +
        '<div id="cf-list" style="display:flex;flex-direction:column;gap:8px;margin-bottom:16px;"></div>' +
        '<button onclick="openCFEditor(null)" style="width:100%;padding:10px;border:2px dashed var(--border,#ddd);background:none;border-radius:10px;font-size:13px;font-weight:600;color:var(--text2);cursor:pointer;transition:.15s;" onmouseover="this.style.borderColor=\'var(--red,#c41e3a)\';this.style.color=\'var(--red,#c41e3a)\';" onmouseout="this.style.borderColor=\'var(--border,#ddd)\';this.style.color=\'var(--text2)\';"><span style="font-size:16px;vertical-align:-2px;">+</span> Ajouter un équipement</button>' +
      '</div>' +
    '</div>';
    document.body.appendChild(ov);
    ov.addEventListener('mousedown', function (e) { if (e.target === ov) closeCFManager(); });
    renderCFList();
  };

  window.closeCFManager = function () {
    var ov = document.getElementById('cf-overlay');
    if (ov) ov.remove();
    /* Rafraîchir les pop-ups modifier/ajouter véhicule si ouverts */
    if (typeof refreshCustomFeatChecks === 'function') refreshCustomFeatChecks();
  };

  function renderCFList() {
    var list = document.getElementById('cf-list');
    if (!list) return;
    var cfs = readCF();
    if (!cfs.length) {
      list.innerHTML = '<div style="text-align:center;padding:30px;color:var(--text3);font-size:13px;">Aucun équipement personnalisé. Cliquez sur « + Ajouter un équipement ».</div>';
      return;
    }
    list.innerHTML = cfs.map(function (cf) {
      return '<div style="display:flex;align-items:center;gap:12px;padding:12px 14px;border:1px solid var(--border,#eee);border-radius:10px;background:var(--gray,#f9f9f9);">' +
        '<div style="width:34px;height:34px;border-radius:8px;background:rgba(196,30,58,.08);display:flex;align-items:center;justify-content:center;flex-shrink:0;color:var(--red,#c41e3a);">' + getSvg(cf.lucideIcon) + '</div>' +
        '<div style="flex:1;min-width:0;"><div style="font-weight:700;font-size:13.5px;">' + escHtml(cf.name) + '</div><div style="font-size:11.5px;color:var(--text3);">Icône : ' + (cf.lucideIcon||'star') + '</div></div>' +
        '<button onclick="openCFEditor(\'' + cf.id + '\')" style="border:1px solid var(--border);background:none;border-radius:7px;padding:5px 12px;font-size:12px;font-weight:600;cursor:pointer;color:var(--text2);">Modifier</button>' +
        '<button onclick="deleteCF(\'' + cf.id + '\')" style="border:1px solid rgba(239,68,68,.3);background:none;border-radius:7px;padding:5px 10px;font-size:12px;cursor:pointer;color:#ef4444;" title="Supprimer">✕</button>' +
      '</div>';
    }).join('');
  }

  window.deleteCF = function (id) {
    if (!confirm('Supprimer cet équipement ? Il sera retiré de tous les véhicules.')) return;
    var cfs = readCF().filter(function (x) { return x.id !== id; });
    writeCF(cfs);
    /* Nettoyer dans tous les véhicules */
    try {
      if (typeof ASLDB !== 'undefined' && ASLDB.getFleet && ASLDB.updateVehicle) {
        ASLDB.getFleet().forEach(function (car) {
          if (car.customFeatures && car.customFeatures[id] !== undefined) {
            var cf = {};
            Object.keys(car.customFeatures).forEach(function (k) { if (k !== id) cf[k] = car.customFeatures[k]; });
            ASLDB.updateVehicle(car.id, { customFeatures: cf });
          }
        });
      }
    } catch (e) {}
    // ★ CORRECTIF (synchro immédiate) : garantit la propagation même si cet
    //   équipement n'était assigné à aucun véhicule (la boucle ci-dessus ne
    //   déclenche alors aucun syncNow()).
    try { if (typeof ASLDB !== 'undefined' && ASLDB.syncNow) ASLDB.syncNow(); } catch (e) {}
    renderCFList();
  };

  /* --------- Éditeur d'un équipement --------- */
  window.openCFEditor = function (id) {
    var cfs = readCF();
    var cf = id ? cfs.find(function (x) { return x.id === id; }) : null;
    var isNew = !cf;
    if (isNew) cf = { id: uid(), name: '', lucideIcon: 'star' };

    var modal = document.getElementById('cf-modal');
    if (!modal) return;

    /* remplace le contenu du modal */
    var savedHtml = modal.innerHTML;

    modal.innerHTML =
      '<div style="display:flex;align-items:center;justify-content:space-between;padding:18px 22px;border-bottom:1px solid var(--border,#eee);">' +
        '<div style="font-size:16px;font-weight:800;">' + (isNew ? 'Nouvel équipement' : 'Modifier l\'équipement') + '</div>' +
        '<button onclick="document.getElementById(\'cf-modal\').innerHTML=\'\';openCustomFeaturesManager();var ov2=document.getElementById(\'cf-overlay\');if(ov2){ov2.remove();}" style="border:none;background:none;cursor:pointer;font-size:20px;color:var(--text3);">✕</button>' +
      '</div>' +
      '<div style="padding:22px;overflow-y:auto;">' +
        '<div style="margin-bottom:14px;">' +
          '<label style="display:block;font-size:12px;font-weight:700;color:var(--text2);margin-bottom:6px;">Nom de l\'équipement</label>' +
          '<input id="cf-name" class="form-input" placeholder="ex : Apple CarPlay, Tablette, Wi-Fi…" value="' + escHtml(cf.name) + '" style="width:100%;">' +
        '</div>' +
        '<div style="margin-bottom:18px;">' +
          '<label style="display:block;font-size:12px;font-weight:700;color:var(--text2);margin-bottom:8px;">Icône</label>' +
          '<div id="cf-icon-grid" style="display:grid;grid-template-columns:repeat(auto-fill,minmax(64px,1fr));gap:8px;">' +
            Object.keys(LUCIDE_ICONS).map(function (k) {
              var sel = (cf.lucideIcon === k);
              return '<button type="button" data-icon="' + k + '" onclick="cfSelectIcon(this,\'' + k + '\')" style="display:flex;flex-direction:column;align-items:center;gap:4px;padding:8px 4px;border:2px solid ' + (sel ? 'var(--red,#c41e3a)' : 'var(--border,#eee)') + ';border-radius:9px;background:' + (sel ? 'rgba(196,30,58,.07)' : 'none') + ';cursor:pointer;transition:.15s;">' +
                '<span style="color:' + (sel ? 'var(--red,#c41e3a)' : 'var(--text2)') + ';">' + LUCIDE_ICONS[k] + '</span>' +
                '<span style="font-size:10px;color:var(--text3);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:56px;">' + k + '</span>' +
              '</button>';
            }).join('') +
          '</div>' +
        '</div>' +
        '<div style="display:flex;gap:10px;">' +
          '<button onclick="saveCF(\'' + cf.id + '\',' + isNew + ')" style="flex:1;padding:12px;background:var(--red,#c41e3a);color:#fff;border:none;border-radius:10px;font-size:14px;font-weight:700;cursor:pointer;">Enregistrer</button>' +
          '<button onclick="closeCFManager();setTimeout(openCustomFeaturesManager,0);" style="padding:12px 18px;background:none;border:1px solid var(--border);border-radius:10px;font-size:13px;cursor:pointer;">Annuler</button>' +
        '</div>' +
      '</div>';

    /* stocker l'icône choisie */
    window._cfSelectedIcon = cf.lucideIcon || 'star';
  };

  window.cfSelectIcon = function (btn, key) {
    window._cfSelectedIcon = key;
    document.querySelectorAll('#cf-icon-grid button').forEach(function (b) {
      var sel = b.dataset.icon === key;
      b.style.borderColor = sel ? 'var(--red,#c41e3a)' : 'var(--border,#eee)';
      b.style.background = sel ? 'rgba(196,30,58,.07)' : 'none';
      b.querySelector('span').style.color = sel ? 'var(--red,#c41e3a)' : 'var(--text2)';
    });
  };

  window.saveCF = function (id, isNew) {
    var name = (document.getElementById('cf-name') && document.getElementById('cf-name').value || '').trim();
    if (!name) { alert('Entrez un nom pour l\'équipement.'); return; }
    var icon = window._cfSelectedIcon || 'star';
    var cfs = readCF();
    if (isNew) {
      cfs.push({ id: id, name: name, lucideIcon: icon, createdAt: new Date().toISOString() });
    } else {
      var idx = cfs.findIndex(function (x) { return x.id === id; });
      if (idx > -1) { cfs[idx].name = name; cfs[idx].lucideIcon = icon; }
    }
    writeCF(cfs);
    // ★ CORRECTIF (synchro immédiate) : writeCF() marque la clé "dirty" mais
    //   ne poussait vers le serveur qu'au prochain cycle de synchro (~8s),
    //   contrairement aux autres écritures du back-office (flotte, etc.) qui
    //   synchronisent immédiatement. On aligne ce comportement ici.
    try { if (typeof ASLDB !== 'undefined' && ASLDB.syncNow) ASLDB.syncNow(); } catch (e) {}
    closeCFManager();
    setTimeout(openCustomFeaturesManager, 0);
  };

  /* ================================================================
     INJECTION DANS LES POP-UPS MODIFIER / AJOUTER VÉHICULE
     Appelé depuis renderCustomFeatSection(prefix, car)
  ================================================================ */

  window.renderCustomFeatSection = function (prefix, car) {
    var cfs = readCF();
    if (!cfs.length) return '';
    var carCF = (car && car.customFeatures) ? car.customFeatures : {};
    return '<div class="form-group" style="grid-column:1/-1;">' +
      '<label class="form-label">Équipements personnalisés</label>' +
      '<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px 14px;padding:4px 2px;" id="' + prefix + '-custom-feats">' +
      cfs.map(function (cf) {
        var checked = carCF[cf.id] ? 'checked' : '';
        return '<label style="display:flex;align-items:center;gap:8px;font-size:13.5px;cursor:pointer;">' +
          '<input type="checkbox" id="' + prefix + '-cf-' + cf.id + '" ' + checked + '> ' +
          '<span style="display:flex;align-items:center;gap:5px;">' + getSvg(cf.lucideIcon) + ' ' + escHtml(cf.name) + '</span>' +
          '</label>';
      }).join('') +
      '</div>' +
    '</div>';
  };

  /* Collecte les valeurs des checkboxes custom dans un pop-up */
  window.collectCustomFeats = function (prefix) {
    var cfs = readCF();
    var result = {};
    cfs.forEach(function (cf) {
      var el = document.getElementById(prefix + '-cf-' + cf.id);
      if (el) result[cf.id] = el.checked;
    });
    return result;
  };

  /* Expose la liste pour le site client */
  window.getCustomFeaturesDef = function () { return readCF(); };

  /* ================================================================
     HELPERS
  ================================================================ */
  function escHtml(s) {
    return String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

})();
