/* ============================================================
   ALL STAR LOC — Page article universelle (article.html?slug=...)
   Lit l'article depuis les données synchronisées du back-office
   (via content-bridge → window._ASL_BLOG) et l'affiche entièrement,
   multilingue, avec SEO. Ne laisse JAMAIS la page vide : repli FR,
   puis message clair si l'article est introuvable.
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

  function slugify(s) {
    return String(s || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
  }

  function artField(a, field, lang) {
    if (a && a.i18n && a.i18n[lang] && a.i18n[lang][field]) return a.i18n[lang][field];
    if (a && a.i18n && a.i18n.fr && a.i18n.fr[field]) return a.i18n.fr[field];
    return (a && a[field]) || '';
  }

  /* Trouve l'article : par slug exact, sinon par slug dérivé du titre FR. */
  function findArticle(slug) {
    var list = (window._ASL_BLOG || window._ASL_BLOG_PUBLISHED || []);
    if (!list.length) return null;
    var bySlug = list.filter(function (a) { return (a.slug || '') === slug; })[0];
    if (bySlug) return bySlug;
    return list.filter(function (a) {
      return slugify(artField(a, 'title', 'fr')) === slug;
    })[0] || null;
  }

  /* Transforme un contenu texte simple en HTML si pas déjà balisé. */
  function contentToHtml(txt) {
    if (!txt) return '';
    if (/<(p|h[1-6]|ul|ol|li|div|br|strong|em)\b/i.test(txt)) return txt; // déjà du HTML
    return txt.split(/\n{2,}/).map(function (p) {
      return '<p>' + escapeHtml(p.trim()).replace(/\n/g, '<br>') + '</p>';
    }).join('\n');
  }

  function escapeHtml(s) {
    return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }
  function escapeAttr(s) {
    return String(s == null ? '' : s).replace(/"/g, '&quot;');
  }

  function setText(id, txt) { var el = document.getElementById(id); if (el) el.textContent = txt; }

  function render() {
    var slug = getParam('slug');
    var lang = activeLang();
    var a = findArticle(slug);

    var contentEl = document.getElementById('art-content');
    var titleEl = document.getElementById('art-title');
    var heroEl = document.getElementById('art-hero');

    if (!a) {
      // Pas trouvé (données pas encore chargées ou slug inconnu) → message clair, jamais vide
      if (titleEl) titleEl.textContent = ({
        fr: 'Article introuvable', en: 'Article not found',
        es: 'Artículo no encontrado', ar: 'المقال غير موجود'
      })[lang] || 'Article introuvable';
      if (contentEl) {
        var backTxt = ({ fr: 'Retour au blog', en: 'Back to blog', es: 'Volver al blog', ar: 'العودة إلى المدونة' })[lang] || 'Retour au blog';
        var msg = ({
          fr: "Cet article n'est pas disponible ou a été déplacé.",
          en: 'This article is not available or has been moved.',
          es: 'Este artículo no está disponible o ha sido movido.',
          ar: 'هذا المقال غير متوفر أو تم نقله.'
        })[lang] || "Cet article n'est pas disponible.";
        contentEl.innerHTML = '<p style="text-align:center;color:#666;padding:30px 0;">' + escapeHtml(msg) +
          '</p><p style="text-align:center;"><a href="blog.html" style="color:var(--red,#C41E3A);font-weight:600;">' + escapeHtml(backTxt) + ' →</a></p>';
      }
      return;
    }

    var title = artField(a, 'title', lang);
    var excerpt = artField(a, 'desc', lang);
    var content = artField(a, 'content', lang);
    var cat = a.category || 'Article';
    var img = a.img || '';
    var imgAlt = a.imgAlt || title;

    // Titre + hero
    if (titleEl) titleEl.innerHTML = escapeHtml(title);
    setText('art-cat', cat);
    setText('art-excerpt', excerpt);
    document.documentElement.setAttribute('dir', lang === 'ar' ? 'rtl' : 'ltr');

    // Contenu complet (image en tête si présente)
    var html = '';
    if (img) {
      html += '<img src="' + escapeAttr(img) + '" alt="' + escapeAttr(imgAlt) +
        '" style="width:100%;border-radius:14px;margin:0 0 24px;display:block;object-fit:cover;max-height:420px;">';
    }
    html += contentToHtml(content);

    // Bandeau CTA (cohérent avec les autres articles)
    var ctaH3 = ({ fr: 'Prêt à prendre la route ?', en: 'Ready to hit the road?', es: '¿Listo para salir a la carretera?', ar: 'مستعد للانطلاق؟' })[lang] || 'Prêt à prendre la route ?';
    var ctaP = ({ fr: 'Réservez votre voiture en 2 minutes, livraison gratuite à l\'aéroport de Marrakech.', en: 'Book your car in 2 minutes, free delivery at Marrakech airport.', es: 'Reserve su coche en 2 minutos, entrega gratuita en el aeropuerto de Marrakech.', ar: 'احجز سيارتك في دقيقتين، توصيل مجاني في مطار مراكش.' })[lang] || '';
    var ctaBtn = ({ fr: 'Voir nos véhicules', en: 'See our vehicles', es: 'Ver nuestros vehículos', ar: 'شاهد سياراتنا' })[lang] || 'Voir nos véhicules';
    html += '<div class="cta-band"><h3>' + escapeHtml(ctaH3) + '</h3><p>' + escapeHtml(ctaP) +
      '</p><a href="../index.html#fleet">' + escapeHtml(ctaBtn) +
      ' <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-0.125em;flex-shrink:0;"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg></a></div>';

    if (contentEl) contentEl.innerHTML = html;

    // SEO : title + meta description + og
    var metaTitle = artField(a, 'metaTitle', lang) || title;
    document.title = metaTitle + ' — ALL STAR LOC Marrakech';
    setMeta('name', 'description', excerpt || (content ? content.replace(/<[^>]*>/g, '').slice(0, 155) : ''));
    setMeta('property', 'og:title', metaTitle);
    setMeta('property', 'og:description', excerpt || '');
    if (img) setMeta('property', 'og:image', img);

    // Schema.org Article
    injectArticleSchema(a, lang, title, excerpt, img);
  }

  function setMeta(attr, key, val) {
    if (!val) return;
    var sel = 'meta[' + attr + '="' + key + '"]';
    var el = document.querySelector(sel);
    if (!el) {
      el = document.createElement('meta');
      el.setAttribute(attr, key);
      document.head.appendChild(el);
    }
    el.setAttribute('content', val);
  }

  function injectArticleSchema(a, lang, title, excerpt, img) {
    try {
      var old = document.getElementById('art-schema');
      if (old) old.remove();
      var schema = {
        '@context': 'https://schema.org', '@type': 'Article',
        headline: title, description: excerpt || '',
        author: { '@type': 'Organization', name: 'ALL STAR LOC' },
        publisher: { '@type': 'Organization', name: 'ALL STAR LOC' },
        inLanguage: lang
      };
      if (img) schema.image = img;
      if (a.date || a.createdAt) schema.datePublished = a.date || a.createdAt;
      if (a.updatedAt) schema.dateModified = a.updatedAt;
      var s = document.createElement('script');
      s.type = 'application/ld+json';
      s.id = 'art-schema';
      s.textContent = JSON.stringify(schema);
      document.head.appendChild(s);
    } catch (e) {}
  }

  // Premier rendu : dès que le DOM est prêt
  function boot() {
    render();
    // Re-render quand les données arrivent du serveur (content-bridge)
    var prevApplied = window.onMarketingApplied;
    window.onMarketingApplied = function () {
      if (typeof prevApplied === 'function') { try { prevApplied(); } catch (e) {} }
      render();
    };
    // Re-render au changement de langue
    var prevLang = window.onLangApplied;
    window.onLangApplied = function () {
      if (typeof prevLang === 'function') { try { prevLang(); } catch (e) {} }
      render();
    };
  }

  if (document.readyState !== 'loading') boot();
  else document.addEventListener('DOMContentLoaded', boot);
})();
