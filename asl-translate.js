/* ============================================================
   ALL STAR LOC — Traduction automatique (FR → EN / ES / AR)
   ------------------------------------------------------------
   Utilisé par le back-office (FAQ, Blog) pour générer
   automatiquement les versions anglaise, espagnole et arabe à
   partir du français, afin de ne pas ressaisir le contenu dans
   chaque langue.

   • one(text, target)   : traduit un texte simple.
   • html(htmlStr, target): traduit un contenu HTML en
                            préservant les balises (seul le texte
                            entre les balises est traduit).
   • fields(obj, target, htmlKeys) : traduit un ensemble de champs.

   Réseau : appel au service public de traduction Google (gtx).
   En cas d'indisponibilité (hors-ligne, test local, quota), la
   fonction renvoie le texte FRANÇAIS d'origine — ainsi aucun
   champ n'est jamais vide. Chaque langue reste éditable à la main
   dans le back-office.
   ============================================================ */
(function () {
  'use strict';

  function _join(j) {
    // Format gtx : j[0] = [[chunkTraduit, chunkOriginal, ...], ...]
    if (Array.isArray(j) && Array.isArray(j[0])) {
      return j[0].map(function (seg) { return (seg && seg[0]) ? seg[0] : ''; }).join('');
    }
    return null;
  }

  async function one(text, target) {
    text = String(text == null ? '' : text);
    if (!text.trim()) return '';
    if (!target || target === 'fr') return text;
    try {
      var url = 'https://translate.googleapis.com/translate_a/single?client=gtx&sl=fr&tl=' +
        encodeURIComponent(target) + '&dt=t&q=' + encodeURIComponent(text);
      var r = await fetch(url, { method: 'GET' });
      if (r && r.ok) {
        var j = await r.json();
        var out = _join(j);
        if (out != null && out.trim()) return out;
      }
    } catch (e) { /* réseau indisponible → repli FR */ }
    return text; // repli : on conserve le texte FR (jamais vide)
  }

  async function html(htmlStr, target) {
    htmlStr = String(htmlStr == null ? '' : htmlStr);
    if (!htmlStr.trim()) return '';
    if (!target || target === 'fr') return htmlStr;
    // Découpe : on garde les balises <...> intactes, on traduit le texte.
    var parts = htmlStr.split(/(<[^>]+>)/g);
    for (var i = 0; i < parts.length; i++) {
      var seg = parts[i];
      if (!seg || seg.charAt(0) === '<' || !seg.trim()) continue; // balise / espaces : inchangé
      // Conserver les éventuelles entités &nbsp; etc. : la traduction du
      // texte visible suffit pour la grande majorité des cas.
      parts[i] = await one(seg, target);
    }
    return parts.join('');
  }

  async function fields(obj, target, htmlKeys) {
    htmlKeys = htmlKeys || [];
    var out = {};
    var keys = Object.keys(obj || {});
    for (var i = 0; i < keys.length; i++) {
      var k = keys[i];
      out[k] = (htmlKeys.indexOf(k) !== -1)
        ? await html(obj[k], target)
        : await one(obj[k], target);
    }
    return out;
  }

  window.ASLTranslate = { one: one, html: html, fields: fields, LANGS: ['en', 'es', 'ar'] };
})();
