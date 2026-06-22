/* ALL STAR LOC — Auth Guard + Permissions
 * À inclure en PREMIER dans chaque page admin.
 * Vérifie la session, puis applique les permissions de l'utilisateur :
 *  - masque les menus non autorisés ;
 *  - bloque l'accès direct à une section non autorisée ("Accès non autorisé").
 */
(function() {
  const SESSION_KEY = 'asl_admin_session';
  const SESSION_TTL = 8 * 60 * 60 * 1000;

  // ---- MODE TEST LOCAL ----
  // En local (fichier ouvert directement ou localhost), session admin auto.
  var isLocal = location.protocol === 'file:' ||
                location.hostname === 'localhost' ||
                location.hostname === '127.0.0.1';
  if (isLocal && !localStorage.getItem(SESSION_KEY)) {
    localStorage.setItem(SESSION_KEY, JSON.stringify({
      user: 'test-local', exp: Date.now() + SESSION_TTL, token: 'local-test'
    }));
  }

  function logout(reason) {
    localStorage.removeItem(SESSION_KEY);
    window.location.replace((window.location.pathname.includes('/admin/') ? '' : 'admin/') + 'login.html' + (reason ? '?r='+reason : ''));
  }

  const raw = localStorage.getItem(SESSION_KEY);
  if (!raw) { logout('noauth'); return; }

  let session;
  try { session = JSON.parse(raw); } catch(e) { logout('invalid'); return; }

  if (!session || !session.exp || Date.now() >= session.exp) { logout('expired'); return; }

  if (session.exp - Date.now() < 30 * 60 * 1000) {
    session.exp = Date.now() + SESSION_TTL;
    localStorage.setItem(SESSION_KEY, JSON.stringify(session));
  }

  window.ASL_ADMIN_USER = session.user;
  window.ASL_IS_EMPLOYEE = !!session.employee;
  window.ASL_PERMS = session.perms || null;

  /* Permission helper local (admin-users.js peut ne pas être encore chargé). */
  function permOk(perm) {
    if (!session.employee) return true;       // admin principal : tout
    if (!perm) return true;
    return !!(session.perms && session.perms[perm] === true);
  }
  window.ASL_HAS_PERM = permOk;

  /* Correspondance page → permission (doit rester cohérente avec admin-users.js). */
  var PAGE_PERM = {
    dashboard: 'dashboard', fleet: 'fleet', maintenance: 'maintenance',
    reservations: 'reservations', rentals: 'rentals', customers: 'customers',
    payments: 'payments', caisse: 'caisse', settings: 'settings',
    options: 'fleet', bookopt: 'fleet'
  };

  /* Applique les permissions à l'interface une fois le DOM prêt. */
  function applyPermsToUI() {
    if (!session.employee) return; // admin principal : rien à masquer

    // 1. Masquer les items de menu non autorisés
    document.querySelectorAll('.sb-item').forEach(function(a) {
      var oc = a.getAttribute('onclick') || '';
      var m = oc.match(/showPage\('([^']+)'/);
      if (m) {
        var page = m[1];
        var perm = PAGE_PERM[page];
        if (perm && !permOk(perm)) { a.style.display = 'none'; }
      }
      // Marketing Digital (lien vers marketing.html)
      var href = a.getAttribute('href') || '';
      if (href.indexOf('marketing.html') >= 0 && !permOk('marketing')) {
        a.style.display = 'none';
      }
    });

    // 2. Si la page courante est marketing.html sans permission → bloquer
    if (location.pathname.indexOf('marketing.html') >= 0 && !permOk('marketing')) {
      showDenied();
    }
  }

  /* Affiche un écran "Accès non autorisé" plein écran. */
  function showDenied() {
    var d = document.createElement('div');
    d.id = 'asl-denied';
    d.style.cssText = 'position:fixed;inset:0;z-index:99999;background:#0f1117;color:#fff;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;padding:24px;font-family:system-ui,sans-serif;';
    d.innerHTML = '<div style="font-size:54px;margin-bottom:12px;">&#128274;</div>'
      + '<div style="font-size:22px;font-weight:800;margin-bottom:8px;">Accès non autorisé</div>'
      + '<div style="font-size:14px;color:#aab;max-width:420px;line-height:1.5;">Vous n\'avez pas la permission d\'accéder à cette section. Contactez l\'administrateur principal si vous pensez qu\'il s\'agit d\'une erreur.</div>'
      + '<button onclick="window.location.href=\'index.html\'" style="margin-top:22px;padding:11px 22px;border:none;border-radius:9px;background:#C41E3A;color:#fff;font-weight:600;cursor:pointer;">Retour au tableau de bord</button>';
    document.body.appendChild(d);
  }
  window.ASL_showDenied = showDenied;

  /* Garde showPage : bloque la navigation vers une section interdite. */
  function guardShowPage() {
    if (!session.employee) return;
    if (typeof window.showPage !== 'function') return;
    var orig = window.showPage;
    window.showPage = function(id, el) {
      var perm = PAGE_PERM[id];
      if (perm && !permOk(perm)) {
        showDenied();
        return;
      }
      return orig.apply(this, arguments);
    };
  }

  if (document.readyState !== 'loading') { applyPermsToUI(); guardShowPage(); }
  else document.addEventListener('DOMContentLoaded', function(){ applyPermsToUI(); guardShowPage(); });

  /* Si l'employé arrive sur une page tableau de bord mais n'a pas la permission
     dashboard, le rediriger vers la première section autorisée. */
  document.addEventListener('DOMContentLoaded', function() {
    if (!session.employee) return;
    if (!permOk('dashboard')) {
      // trouver la 1ère page autorisée
      var firstAllowed = null;
      Object.keys(PAGE_PERM).some(function(pg) {
        if (permOk(PAGE_PERM[pg])) { firstAllowed = pg; return true; }
        return false;
      });
      if (firstAllowed && typeof window.showPage === 'function') {
        setTimeout(function(){ try { window.showPage(firstAllowed, null); } catch(e){} }, 100);
      }
    }
  });
})();
