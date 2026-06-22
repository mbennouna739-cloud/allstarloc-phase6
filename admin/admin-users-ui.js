/* ============================================================
   ALL STAR LOC — Interface de gestion des utilisateurs
   Liste, création, édition, désactivation, suppression des accès
   employés avec cases à cocher par section. Visible seulement pour
   l'administrateur principal.
   ============================================================ */
(function () {
  'use strict';

  function esc(s) { return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }

  /* La carte utilisateurs n'est visible que pour l'admin principal. */
  function ensureVisibility() {
    var card = document.getElementById('users-card');
    if (!card) return;
    var isAdmin = (typeof ASLUsers !== 'undefined') ? ASLUsers.isMainAdmin() : true;
    card.style.display = isAdmin ? '' : 'none';
  }

  window.renderUsers = function () {
    ensureVisibility();
    var host = document.getElementById('users-list');
    if (!host || typeof ASLUsers === 'undefined') return;
    if (!ASLUsers.isMainAdmin()) { host.innerHTML = ''; return; }
    var users = ASLUsers.list();
    if (!users.length) {
      host.innerHTML = '<div style="text-align:center;padding:24px;color:#999;font-size:14px;">Aucun accès employé créé. Cliquez sur « + Créer un accès ».</div>';
      return;
    }
    host.innerHTML = users.map(function (u) {
      var permCount = Object.keys(u.perms || {}).filter(function (k) { return u.perms[k]; }).length;
      var statusBadge = u.active === false
        ? '<span style="font-size:11px;color:#dc2626;background:#fee2e2;padding:2px 9px;border-radius:20px;">Désactivé</span>'
        : '<span style="font-size:11px;color:#16a34a;background:#dcfce7;padding:2px 9px;border-radius:20px;">Actif</span>';
      return '<div class="table-card" style="padding:14px 16px;margin-bottom:10px;">'
        + '<div style="display:flex;justify-content:space-between;align-items:flex-start;flex-wrap:wrap;gap:10px;">'
        + '<div><div style="font-weight:700;font-size:14px;">' + esc(u.name || u.username) + ' ' + statusBadge + '</div>'
        + '<div style="font-size:12px;color:var(--text3);margin-top:2px;">Identifiant : <strong>' + esc(u.username) + '</strong> · ' + permCount + ' section(s) autorisée(s)</div></div>'
        + '<div style="display:flex;gap:6px;flex-wrap:wrap;">'
        + '<button class="btn-sm ghost" onclick="openUserModal(\'' + u.id + '\')">Modifier</button>'
        + '<button class="btn-sm ghost" onclick="toggleUserActive(\'' + u.id + '\')">' + (u.active === false ? 'Activer' : 'Désactiver') + '</button>'
        + '<button class="btn-sm ghost" style="color:var(--red);" onclick="deleteUser(\'' + u.id + '\')">Supprimer</button>'
        + '</div></div></div>';
    }).join('');
  };

  window.openUserModal = function (id) {
    if (typeof ASLUsers === 'undefined') return;
    var user = id ? ASLUsers.list().filter(function (x) { return x.id === id; })[0] : null;
    var host = document.getElementById('user-modal-host');
    if (!host) { host = document.createElement('div'); host.id = 'user-modal-host'; document.body.appendChild(host); }

    var sectionsHtml = ASLUsers.SECTIONS.map(function (s) {
      var checked = user && user.perms && user.perms[s.perm] ? 'checked' : '';
      return '<label style="display:flex;align-items:center;gap:8px;font-size:13px;padding:6px 8px;border-radius:7px;cursor:pointer;background:#fafafa;">'
        + '<input type="checkbox" class="usr-perm" data-perm="' + s.perm + '" ' + checked + ' style="width:16px;height:16px;accent-color:#C41E3A;cursor:pointer;"> ' + esc(s.label) + '</label>';
    }).join('');

    host.innerHTML =
      '<div style="position:fixed;inset:0;background:rgba(10,12,18,.55);z-index:9000;display:flex;align-items:center;justify-content:center;padding:16px;" onclick="if(event.target===this)closeUserModal()">'
      + '<div style="background:#fff;border-radius:16px;max-width:560px;width:100%;max-height:92vh;overflow-y:auto;box-shadow:0 24px 60px rgba(0,0,0,.25);">'
      + '<div style="padding:18px 20px;border-bottom:1px solid #eee;display:flex;align-items:center;justify-content:space-between;position:sticky;top:0;background:#fff;z-index:1;">'
      + '<strong style="font-size:16px;color:#1a1a2e;">' + (user ? 'Modifier l\'accès' : 'Créer un accès employé') + '</strong>'
      + '<button onclick="closeUserModal()" style="background:none;border:none;font-size:20px;cursor:pointer;color:#999;">&#10005;</button></div>'
      + '<div style="padding:20px;">'
      + fld('Nom de l\'employé', '<input type="text" id="usr-name" class="form-input" value="' + (user ? esc(user.name) : '') + '" placeholder="Ex : Youssef">')
      + fld('Identifiant de connexion', '<input type="text" id="usr-username" class="form-input" value="' + (user ? esc(user.username) : '') + '" placeholder="Ex : youssef" autocomplete="off">')
      + fld('Mot de passe' + (user ? ' (laisser vide pour ne pas changer)' : ''), '<input type="text" id="usr-password" class="form-input" placeholder="' + (user ? '••••••••' : 'Choisir un mot de passe') + '" autocomplete="new-password">')
      + '<div style="margin-top:16px;margin-bottom:8px;display:flex;justify-content:space-between;align-items:center;">'
      + '<label style="font-size:13px;font-weight:700;color:#374151;">Sections autorisées</label>'
      + '<div style="display:flex;gap:6px;"><button type="button" class="btn-sm ghost" onclick="usrToggleAll(true)">Tout cocher</button><button type="button" class="btn-sm ghost" onclick="usrToggleAll(false)">Tout décocher</button></div>'
      + '</div>'
      + '<div style="display:grid;grid-template-columns:1fr 1fr;gap:6px;">' + sectionsHtml + '</div>'
      + '</div>'
      + '<div style="padding:16px 20px;border-top:1px solid #eee;display:flex;gap:10px;justify-content:flex-end;position:sticky;bottom:0;background:#fff;">'
      + '<button onclick="closeUserModal()" style="padding:10px 18px;border:1px solid #ddd;background:#fff;border-radius:8px;cursor:pointer;">Annuler</button>'
      + '<button onclick="saveUser(' + (id ? '\'' + id + '\'' : 'null') + ')" style="padding:10px 18px;border:none;background:#C41E3A;color:#fff;border-radius:8px;cursor:pointer;font-weight:600;">Enregistrer</button>'
      + '</div></div></div>';
  };

  function fld(label, field) {
    return '<div style="margin-bottom:12px;"><label style="display:block;font-size:13px;font-weight:600;margin-bottom:5px;color:#374151;">' + label + '</label>' + field + '</div>';
  }

  window.usrToggleAll = function (val) {
    document.querySelectorAll('.usr-perm').forEach(function (cb) { cb.checked = val; });
  };

  window.closeUserModal = function () {
    var h = document.getElementById('user-modal-host'); if (h) h.innerHTML = '';
  };

  window.saveUser = function (id) {
    var name = (document.getElementById('usr-name').value || '').trim();
    var username = (document.getElementById('usr-username').value || '').trim();
    var password = document.getElementById('usr-password').value || '';
    if (!username) { alert('Veuillez saisir un identifiant.'); return; }
    if (!id && !password) { alert('Veuillez définir un mot de passe.'); return; }

    var perms = {};
    document.querySelectorAll('.usr-perm').forEach(function (cb) {
      perms[cb.getAttribute('data-perm')] = cb.checked;
    });

    if (id) {
      var patch = { name: name, username: username, perms: perms };
      if (password) patch.password = password;
      ASLUsers.update(id, patch);
      if (typeof showToast === 'function') showToast('Accès mis à jour ✓');
    } else {
      var res = ASLUsers.create({ name: name, username: username, password: password, perms: perms });
      if (res.error) { alert(res.error); return; }
      if (typeof showToast === 'function') showToast('Accès employé créé ✓');
    }
    closeUserModal();
    renderUsers();
  };

  window.toggleUserActive = function (id) {
    ASLUsers.toggleActive(id);
    renderUsers();
    if (typeof showToast === 'function') showToast('Statut mis à jour');
  };

  window.deleteUser = function (id) {
    var u = ASLUsers.list().filter(function (x) { return x.id === id; })[0];
    if (!u) return;
    if (!confirm('Supprimer définitivement l\'accès de « ' + (u.name || u.username) + ' » ?\n\nCette personne ne pourra plus se connecter.')) return;
    ASLUsers.remove(id);
    renderUsers();
    if (typeof showToast === 'function') showToast('Accès supprimé');
  };

  /* Rendu auto quand on ouvre les Paramètres. */
  document.addEventListener('DOMContentLoaded', function () {
    if (document.getElementById('users-list')) renderUsers();
  });
})();
