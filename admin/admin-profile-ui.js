/* ============================================================
   ALL STAR LOC — Profil administrateur (sidebar)
   ------------------------------------------------------------
   Remplit le bloc bas de sidebar (déjà existant) avec le VRAI
   utilisateur connecté, au lieu d'un texte fixe "Admin". Source :
   window.ASL_ADMIN_USER / window.ASL_IS_EMPLOYEE, déjà exposés par
   auth-guard.js. Ne modifie ni la disposition ni l'apparence du
   bloc : seul le texte affiché devient dynamique.
   ============================================================ */
(function () {
  function initials(name) {
    var parts = String(name || 'A').trim().split(/\s+/).filter(Boolean);
    if (!parts.length) return 'A';
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }

  function apply() {
    var name = (typeof window.ASL_ADMIN_USER === 'string' && window.ASL_ADMIN_USER) ? window.ASL_ADMIN_USER : 'Admin';
    var role = window.ASL_IS_EMPLOYEE ? 'Employé' : 'Administrateur';
    var ini = initials(name);

    var sName = document.querySelector('.sb-user-name');
    var sRole = document.querySelector('.sb-user-role');
    var sAvatar = document.querySelector('.sb-avatar');
    if (sName) sName.textContent = name;
    if (sRole) sRole.textContent = role;
    if (sAvatar) sAvatar.textContent = ini;
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', apply);
  else apply();
})();
