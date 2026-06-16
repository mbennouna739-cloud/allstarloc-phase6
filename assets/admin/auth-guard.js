/* ALL STAR LOC — Auth Guard
 * À inclure en PREMIER dans chaque page admin.
 * Vérifie la session et redirige vers login si invalide.
 */
(function() {
  const SESSION_KEY = 'asl_admin_session';
  const SESSION_TTL = 8 * 60 * 60 * 1000;

  function logout(reason) {
    localStorage.removeItem(SESSION_KEY);
    const base = window.location.pathname.includes('/admin/') ? '' : 'admin/';
    window.location.replace((window.location.pathname.includes('/admin/') ? '' : 'admin/') + 'login.html' + (reason ? '?r='+reason : ''));
  }

  const raw = localStorage.getItem(SESSION_KEY);
  if (!raw) { logout('noauth'); return; }

  let session;
  try { session = JSON.parse(raw); } catch(e) { logout('invalid'); return; }

  if (!session || !session.exp || Date.now() >= session.exp) {
    logout('expired');
    return;
  }

  // Renouveler si proche de l'expiration (< 30 min restantes)
  if (session.exp - Date.now() < 30 * 60 * 1000) {
    session.exp = Date.now() + SESSION_TTL;
    localStorage.setItem(SESSION_KEY, JSON.stringify(session));
  }

  // Exposer l'utilisateur courant
  window.ASL_ADMIN_USER = session.user;
})();
