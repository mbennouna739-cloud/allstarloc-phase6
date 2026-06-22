/* ============================================================
   ALL STAR LOC — Page de contenu universelle (page.html?slug=...)
   Affiche une page gérée depuis le back-office (CGV, confidentialité,
   mentions, location courte/longue durée, livraison aéroport/hôtel…).
   Multilingue, SEO, jamais vide (repli FR puis seed).
   ============================================================ */
(function () {
  'use strict';

  function getParam(name) {
    var m = new RegExp('[?&]' + name + '=([^&]*)').exec(window.location.search);
    return m ? decodeURIComponent(m[1].replace(/\+/g, ' ')) : '';
  }

  function activeLang() {
    try {
      if (typeof window.getLang === 'function') return window.getLang();
      var s = localStorage.getItem('asl_lang');
      if (s) return s;
    } catch (e) {}
    return 'fr';
  }

  /* Champ multilingue : langue active → repli FR → vide. */
  function F(obj, lang) {
    if (!obj) return '';
    return obj[lang] || obj.fr || '';
  }

  /* Trouve la page : données synchronisées (back-office) puis seed. */
  function findPage(slug) {
    var all = (window._ASL_PAGES) || {};
    if (all[slug]) return all[slug];
    if (window._ASL_PAGES_SEED && window._ASL_PAGES_SEED[slug]) return window._ASL_PAGES_SEED[slug];
    return null;
  }

  function escapeHtml(s) {
    return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  function setMeta(attr, key, val) {
    if (!val) return;
    var el = document.querySelector('meta[' + attr + '="' + key + '"]');
    if (!el) { el = document.createElement('meta'); el.setAttribute(attr, key); document.head.appendChild(el); }
    el.setAttribute('content', val);
  }

  /* Bloc CTA de conversion ajouté à la fin de CHAQUE page de contenu.
     Design premium épuré : bloc rouge, titre, texte marketing et un seul
     bouton « Réserver un véhicule » relié à la section de réservation.
     Le contact WhatsApp reste disponible via le bouton/badge flottant du site
     (présent en permanence pendant le scroll). Multilingue FR/EN/ES/AR,
     responsive, compatible RTL. */
  var CTA_I18N = {
    fr: { title: 'Prêt à prendre la route à Marrakech ?',
          text: "Réservez votre véhicule en quelques minutes et profitez de nos meilleurs tarifs avec livraison à l'aéroport, à votre hôtel ou partout à Marrakech.",
          book: 'Réserver un véhicule' },
    en: { title: 'Ready to hit the road in Marrakech?',
          text: 'Book your vehicle in just a few minutes and enjoy our best rates with delivery to the airport, your hotel or anywhere in Marrakech.',
          book: 'Book a vehicle' },
    es: { title: '¿Listo para salir a la carretera en Marrakech?',
          text: 'Reserve su vehículo en pocos minutos y disfrute de nuestras mejores tarifas con entrega en el aeropuerto, en su hotel o en cualquier lugar de Marrakech.',
          book: 'Reservar un vehículo' },
    ar: { title: 'مستعد للانطلاق في مراكش؟',
          text: 'احجز سيارتك في بضع دقائق واستفد من أفضل أسعارنا مع التوصيل إلى المطار أو إلى فندقك أو إلى أي مكان في مراكش.',
          book: 'احجز سيارة' }
  };

  function ensureCtaStyle() {
    if (document.getElementById('asl-cta-style')) return;
    var st = document.createElement('style');
    st.id = 'asl-cta-style';
    st.textContent =
      '.asl-cta{margin:40px 0 8px;padding:34px 28px;border-radius:18px;color:#fff;' +
      'background:linear-gradient(135deg,#C41E3A 0%,#9b1730 100%);' +
      'box-shadow:0 16px 40px rgba(196,30,58,.26);text-align:center;}' +
      '.asl-cta h2{margin:0 0 12px;font-size:25px;line-height:1.25;color:#fff;border:none;padding:0;font-weight:800;}' +
      '.asl-cta p{margin:0 auto 24px;max-width:640px;font-size:15px;line-height:1.65;color:rgba(255,255,255,.94);}' +
      '.asl-cta-btn{display:inline-flex;align-items:center;justify-content:center;gap:9px;' +
      'padding:14px 30px;border-radius:12px;font-size:15.5px;font-weight:800;text-decoration:none;' +
      'font-family:inherit;transition:transform .15s ease,box-shadow .15s ease;cursor:pointer;' +
      'background:#fff;color:#C41E3A;box-shadow:0 6px 18px rgba(0,0,0,.18);}' +
      '.asl-cta-btn:hover{transform:translateY(-2px);box-shadow:0 10px 24px rgba(0,0,0,.22);}' +
      '.asl-cta-btn svg{flex-shrink:0;}' +
      '@media(max-width:520px){.asl-cta{padding:28px 18px;}.asl-cta h2{font-size:21px;}' +
      '.asl-cta-btn{width:100%;}}';
    document.head.appendChild(st);
  }

  function ctaHtml(lang) {
    var t = CTA_I18N[lang] || CTA_I18N.fr;
    var carIcon = '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 17H3v-5l2-5h12l2 5v5h-2"/><circle cx="7.5" cy="17" r="2"/><circle cx="16.5" cy="17" r="2"/></svg>';
    var bookHref = '../index.html#booking-section';
    return '<div class="asl-cta" dir="' + (lang === 'ar' ? 'rtl' : 'ltr') + '">' +
      '<h2>' + escapeHtml(t.title) + '</h2>' +
      '<p>' + escapeHtml(t.text) + '</p>' +
      '<a class="asl-cta-btn" href="' + bookHref + '">' + carIcon + '<span>' + escapeHtml(t.book) + '</span></a>' +
      '</div>';
  }

  function render() {
    var slug = getParam('slug');
    var lang = activeLang();
    var p = findPage(slug);

    var titleEl = document.getElementById('pg-title');
    var contentEl = document.getElementById('pg-content');

    if (!p || (p.status && p.status === 'hidden')) {
      if (titleEl) titleEl.textContent = ({ fr: 'Page introuvable', en: 'Page not found', es: 'Página no encontrada', ar: 'الصفحة غير موجودة' })[lang] || 'Page introuvable';
      if (contentEl) {
        var back = ({ fr: 'Retour à l\'accueil', en: 'Back to home', es: 'Volver al inicio', ar: 'العودة إلى الرئيسية' })[lang] || 'Retour à l\'accueil';
        contentEl.innerHTML = '<p style="text-align:center;color:#666;padding:30px 0;">' +
          escapeHtml(({ fr: 'Cette page n\'est pas disponible.', en: 'This page is not available.', es: 'Esta página no está disponible.', ar: 'هذه الصفحة غير متوفرة.' })[lang] || '') +
          '</p><p style="text-align:center;"><a href="../index.html" style="color:var(--red,#C41E3A);font-weight:600;">' + escapeHtml(back) + ' →</a></p>';
      }
      return;
    }

    var title = F(p.title, lang);
    var subtitle = F(p.subtitle, lang);
    var badge = F(p.badge, lang);
    var content = F(p.content, lang);

    if (titleEl) titleEl.textContent = title;
    var badgeEl = document.getElementById('pg-badge-text'); if (badgeEl) badgeEl.textContent = badge || 'ALL STAR LOC';
    var subEl = document.getElementById('pg-subtitle'); if (subEl) subEl.textContent = subtitle;
    document.documentElement.setAttribute('dir', lang === 'ar' ? 'rtl' : 'ltr');

    var html = '';
    if (p.image) {
      html += '<img src="' + escapeHtml(p.image) + '" alt="' + escapeHtml(title) +
        '" style="width:100%;border-radius:14px;margin:0 0 24px;display:block;object-fit:cover;max-height:420px;">';
    }
    html += content || '';
    if (contentEl) contentEl.innerHTML = html || '<p style="text-align:center;color:#888;">—</p>';

    // Bloc CTA de conversion à la fin de la page (multilingue, responsive).
    ensureCtaStyle();
    if (contentEl) contentEl.insertAdjacentHTML('beforeend', ctaHtml(lang));

    // SEO
    var metaTitle = F(p.metaTitle, lang) || title;
    var metaDesc = F(p.metaDesc, lang) || subtitle;
    document.title = metaTitle + ' — ALL STAR LOC Marrakech';
    setMeta('name', 'description', metaDesc);
    setMeta('property', 'og:title', metaTitle);
    setMeta('property', 'og:description', metaDesc);
  }

  function boot() {
    render();
    var prevM = window.onMarketingApplied;
    window.onMarketingApplied = function () { if (typeof prevM === 'function') { try { prevM(); } catch (e) {} } render(); };
    var prevL = window.onLangApplied;
    window.onLangApplied = function () { if (typeof prevL === 'function') { try { prevL(); } catch (e) {} } render(); };
  }

  if (document.readyState !== 'loading') boot();
  else document.addEventListener('DOMContentLoaded', boot);
})();
