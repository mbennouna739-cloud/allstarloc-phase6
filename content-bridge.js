/**
 * ALL STAR LOC — Content Bridge v3
 * ===================================================
 * Chargé après i18n.js, avant data.js.
 * Source de vérité : KV Cloudflare via /api/marketing
 * Fallback : localStorage (mode hors-ligne / dev local)
 * ===================================================
 */
(function () {
  var REMOTE_URL   = '/api/marketing';
  var LOCAL_KEY    = 'asl_mkt_all_v1';      // cache local du marketing complet
  var LOCAL_STAMP  = 'asl_mkt_stamp_v1';    // timestamp du dernier fetch KV

  function rd(k) { try { return JSON.parse(localStorage.getItem(k) || 'null'); } catch (e) { return null; } }
  function wr(k,v){ try { localStorage.setItem(k, JSON.stringify(v)); } catch(e){} }

  /* ---- Appliquer toutes les données marketing au site ---- */
  /* Langue active du site (depuis i18n / localStorage). */
  function activeLang() {
    try {
      if (typeof window.getLang === 'function') return window.getLang();
      var s = localStorage.getItem('asl_lang');
      if (s) return s;
    } catch(e) {}
    return 'fr';
  }

  /* Renvoie un champ d'article dans la langue voulue, avec repli FR puis valeur racine. */
  function artField(a, field, lang) {
    if (a && a.i18n && a.i18n[lang] && a.i18n[lang][field]) return a.i18n[lang][field];
    if (a && a.i18n && a.i18n.fr && a.i18n.fr[field]) return a.i18n.fr[field];
    return (a && a[field]) || '';
  }

  /* ====================================================================
     FUSION SEED (contenu existant du site) + BACK-OFFICE (KV).
     Principe : le contenu géré dans l'admin a la priorité ; les éléments
     du site non encore repris dans l'admin restent affichés grâce au seed.
     Ainsi rien n'est jamais codé en dur ET rien n'est jamais vide.
     ==================================================================== */
  function _key(s){ return String(s||'').trim().toLowerCase(); }

  /* Articles : l'admin (kv) prime par slug/id, le seed complète. */
  function mergeArticles(seed, kv) {
    var out = [], seen = {};
    (kv || []).forEach(function (a) {
      var k = _key(a.slug || a.id);
      if (k) seen[k] = true;
      out.push(a);
    });
    (seed || []).forEach(function (s) {
      var k = _key(s.slug || s.id);
      if (k && seen[k]) return;           // déjà repris (et éventuellement modifié) dans l'admin
      out.push(s);
    });
    return out;
  }

  /* FAQ : dédoublonnage par id stable (repli question FR). L'admin (kv) prime,
     le seed complète. Garantit qu'aucune question n'apparaît en double et que
     chaque entrée porte ses 4 langues. */
  function mergeFaqs(seed, kv) {
    function q(f){ return _key((f.i18n && f.i18n.fr && f.i18n.fr.question) || f.question); }
    function idOf(f){ return f && f.id ? String(f.id) : ''; }
    var out = [], seenId = {}, seenQ = {};
    (kv || []).forEach(function (f) { var i = idOf(f), k = q(f); if (i) seenId[i] = true; if (k) seenQ[k] = true; out.push(f); });
    (seed || []).forEach(function (s) {
      var i = idOf(s), k = q(s);
      if ((i && seenId[i]) || (k && seenQ[k])) return;
      out.push(s);
    });
    return out;
  }

  /* Pages légales : par langue, le contenu admin non vide prime, sinon le seed. */
  function mergeLegal(seed, kv) {
    var out = {}, slugs = {};
    Object.keys(seed || {}).forEach(function (s) { slugs[s] = true; });
    Object.keys(kv   || {}).forEach(function (s) { slugs[s] = true; });
    Object.keys(slugs).forEach(function (s) {
      var sd = (seed && seed[s]) || {}, kd = (kv && kv[s]) || {}, m = {};
      ['fr', 'en', 'es', 'ar'].forEach(function (l) {
        var k = kd[l] || {}, d = sd[l] || {};
        m[l] = {
          title:   (k.title   != null && k.title   !== '') ? k.title   : (d.title   || ''),
          content: (k.content != null && k.content !== '') ? k.content : (d.content || '')
        };
      });
      out[s] = m;
    });
    return out;
  }

  /* Bootstrap immédiat : exposer au minimum le contenu seed dès le chargement,
     pour qu'une page article / blog / FAQ / légale ne soit JAMAIS vide, même
     hors-ligne ou avant la réponse du serveur. Les données KV viendront ensuite
     enrichir/écraser via applyMarketing. */
  (function bootstrapSeed() {
    if (window._ASL_BLOG_SEED && !window._ASL_BLOG) {
      window._ASL_BLOG = window._ASL_BLOG_SEED.slice();
      window._ASL_BLOG_PUBLISHED = window._ASL_BLOG.filter(function (a) {
        return (a.status || 'draft') === 'published';
      });
    }
    if (window._ASL_FAQ_SEED && !window._ASL_FAQS) {
      window._ASL_FAQS = window._ASL_FAQ_SEED.slice();
      window._ASL_FAQS_PUBLISHED = window._ASL_FAQS.filter(function (f) { return f.active !== false; });
    }
    if (window._ASL_LEGAL_SEED && !window._ASL_LEGAL) {
      window._ASL_LEGAL = mergeLegal(window._ASL_LEGAL_SEED, {});
    }
    if (window._ASL_PAGES_SEED && !window._ASL_PAGES) {
      window._ASL_PAGES = window._ASL_PAGES_SEED;
    }
  })();

  /* Génère les cartes d'articles sur la page blog publique (même design que les cartes existantes) */
  function renderBlogGrid(articles) {
    var grid = document.getElementById('blog-grid') || document.querySelector('.cards-grid');
    var emptyEl = document.getElementById('blog-empty');
    if (!grid) return;
    if (!articles || !articles.length) {
      grid.querySelectorAll('.asl-dyn-article').forEach(function(el){ el.remove(); });
      if (emptyEl) emptyEl.style.display = 'block';
      return;
    }
    if (emptyEl) emptyEl.style.display = 'none';
    function esc(s){ return String(s==null?'':s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }
    function slugify(s){ return String(s||'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]+/g,'-').replace(/^-+|-+$/g,''); }
    var lang = activeLang();
    var readLbl = ({ fr:"Lire l'article", en:'Read the article', es:'Leer el artículo', ar:'اقرأ المقال' })[lang] || "Lire l'article";
    var arrowSvg = '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-0.125em;flex-shrink:0;"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>';
    var html = articles.map(function(a){
      var img = a.img || 'https://images.unsplash.com/photo-1597212618440-806262de4f6b?w=600&q=80';
      var cat = a.category || 'Article';
      var title = artField(a, 'title', lang);
      var desc = artField(a, 'desc', lang);
      var content = artField(a, 'content', lang);
      var excerpt = desc || (content ? String(content).replace(/<[^>]*>/g,'').slice(0,140) + '…' : '');
      var artSlug = a.slug ? a.slug : slugify(artField(a,'title','fr'));
      var href = 'article.html?slug=' + encodeURIComponent(artSlug);
      var alt = a.imgAlt || title;  /* Texte ALT SEO, repli sur le titre */
      return '<div class="card asl-dyn-article">'
        + '<div class="card-img"><img src="' + esc(img) + '" alt="' + esc(alt) + '" loading="lazy"></div>'
        + '<div class="card-body">'
        + '<div class="card-tag">' + esc(cat) + '</div>'
        + '<div class="card-title">' + esc(title) + '</div>'
        + '<div class="card-text">' + esc(excerpt) + '</div>'
        + '<a class="card-link" href="' + esc(href) + '">' + esc(readLbl) + ' ' + arrowSvg + '</a>'
        + '</div></div>';
    }).join('');
    // Retirer d'éventuelles cartes dynamiques précédentes (re-render au changement de langue)
    grid.querySelectorAll('.asl-dyn-article').forEach(function(el){ el.remove(); });
    // Les articles publiés depuis l'admin viennent EN PREMIER, les cartes statiques existantes restent ensuite
    grid.insertAdjacentHTML('afterbegin', html);
  }

  /* Affiche les avis clients gérés depuis le back-office (multilingue). */
  function renderReviews(reviewsData) {
    if (!reviewsData || !reviewsData.items) return;
    var grid = document.getElementById('reviews-grid');
    if (!grid) return;
    var lang = activeLang();
    function esc(s){ return String(s==null?'':s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }
    function initials(name){
      var parts = String(name||'').trim().split(/\s+/);
      return ((parts[0]||'')[0]||'').toUpperCase() + ((parts[1]||'')[0]||'').toUpperCase();
    }
    var star = '<svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor" stroke="none" style="vertical-align:-0.125em;flex-shrink:0;margin-right:1px;"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>';
    var active = reviewsData.items.filter(function(r){ return r.active !== false; });
    if (!active.length) return;
    var html = active.map(function(rv){
      var txt = (rv.text && (rv.text[lang] || rv.text.fr)) || '';
      if (!txt) return '';
      var avatar = rv.photo
        ? '<div class="review-avatar" style="background-image:url(\'' + esc(rv.photo) + '\');background-size:cover;background-position:center;"></div>'
        : '<div class="review-avatar" style="background:' + (rv.color||'#C41E3A') + ';">' + esc(initials(rv.name)) + '</div>';
      var stars = '';
      for (var i=0;i<(rv.rating||5);i++) stars += star;
      return '<div class="review-card">'
        + '<div class="review-header">' + avatar
        + '<div><div class="review-name">' + esc(rv.name) + '</div><div class="review-source">' + esc(rv.source||'') + '</div></div>'
        + '</div>'
        + '<div class="review-stars">' + stars + '</div>'
        + '<div class="review-text">' + esc(txt) + '</div>'
        + '</div>';
    }).join('');
    if (html) grid.innerHTML = html;
  }

  /* Injecte le contenu d'une page légale (seed + back-office). Multilingue. */
  function renderLegalContent(slug, pageData) {
    if (!pageData) return;
    var container = document.querySelector('.page-content');
    if (!container) return;
    var lang = activeLang();
    var d = (pageData[lang] && pageData[lang].content) ? pageData[lang]
          : (pageData.fr && pageData.fr.content ? pageData.fr : null);
    if (!d || !d.content) return;  // aucun contenu → garder le texte par défaut du site
    /* Le titre est déjà affiché dans le hero de la page ; on n'injecte que le corps
       pour éviter un double H1. */
    container.innerHTML = d.content;
    container.setAttribute('dir', lang === 'ar' ? 'rtl' : 'ltr');
    /* Titre du hero traduit si une traduction existe pour la langue active (hors FR,
       qui conserve son intitulé d'origine stylé). */
    try {
      var heroH1 = document.querySelector('.page-hero h1');
      if (heroH1 && lang !== 'fr' && pageData[lang] && pageData[lang].title) {
        heroH1.textContent = pageData[lang].title;
      }
    } catch (e) {}
  }
  function _escapeText(s){ return String(s==null?'':s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }

  /* Affiche les questions FAQ (seed + back-office) sur la page faq.html (multilingue).
     Remplace les questions codées en dur pour éviter tout doublon. */
  function renderFaqList(faqs) {
    var container = document.querySelector('.page-content');
    if (!container || !faqs || !faqs.length) return;
    function esc(s){ return String(s==null?'':s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }
    var lang = activeLang();
    var field = function(f, k){
      if (f.i18n && f.i18n[lang] && f.i18n[lang][k]) return f.i18n[lang][k];
      if (f.i18n && f.i18n.fr && f.i18n.fr[k]) return f.i18n.fr[k];
      return f[k] || '';
    };
    var html = faqs.map(function(f){
      /* La question est échappée ; la réponse peut contenir des liens (HTML) saisis depuis l'admin. */
      return '<div class="faq-item asl-dyn-faq">'
        + '<button class="faq-q" onclick="this.parentElement.classList.toggle(\'open\')">' + esc(field(f,'question')) + '</button>'
        + '<div class="faq-a"><p style="margin:10px 0 0;">' + field(f,'answer') + '</p></div>'
        + '</div>';
    }).join('');
    /* Retirer TOUTES les questions existantes (statiques codées en dur + anciennes dynamiques)
       pour repartir d'une liste unique pilotée par le back-office. */
    container.querySelectorAll('.faq-item').forEach(function(el){ el.remove(); });
    /* Insérer la liste avant l'éventuel bandeau CTA, sinon au début. */
    var cta = container.querySelector('.cta-band');
    if (cta) cta.insertAdjacentHTML('beforebegin', html);
    else container.insertAdjacentHTML('afterbegin', html);
  }

  function applyMarketing(data) {
    if (!data) return;

    /* 1. Overrides textes i18n — supporte le multilingue.
       Format possible pour ov[k] :
       - une chaîne simple  → appliquée à toutes les langues (ancien format)
       - un objet {fr,en,es,ar} → chaque langue reçoit sa traduction */
    var ov = data.content || {};
    if (typeof I18N !== 'undefined' && I18N.fr && Object.keys(ov).length) {
      Object.keys(ov).forEach(function (k) {
        var val = ov[k];
        if (val && typeof val === 'object') {
          /* Multilingue : appliquer chaque langue si présente, sinon garder l'originale */
          ['fr','en','es','ar'].forEach(function(l){
            if (I18N[l] && val[l]) I18N[l][k] = val[l];
          });
        } else if (val) {
          /* Ancien format (chaîne) : appliquer à toutes les langues */
          ['fr','en','es','ar'].forEach(function(l){ if(I18N[l]) I18N[l][k] = val; });
        }
      });
    }

    /* 2. SEO : title + meta description + canonical */
    var page = 'index';
    var p = window.location.pathname;
    if (p.indexOf('nos-vehicules') > -1) page = 'nos-vehicules';
    else if (p.indexOf('about')    > -1) page = 'about';
    else if (p.indexOf('contact')  > -1) page = 'contact';
    else if (p.indexOf('aeroport') > -1) page = 'aeroport';
    else if (p.indexOf('blog')     > -1) page = 'blog';
    else if (p.indexOf('faq')      > -1) page = 'faq';
    else if (p.indexOf('cgv')      > -1) page = 'cgv';
    else if (p.indexOf('privacy')  > -1) page = 'privacy';
    else if (p.indexOf('mentions') > -1) page = 'mentions';
    else if (p.indexOf('lld')      > -1) page = 'lld';

    var seo = data.seo && data.seo[page];
    if (seo) {
      if (seo.title) {
        document.title = seo.title;
        var og = document.querySelector('meta[property="og:title"]');
        if (og) og.setAttribute('content', seo.title);
      }
      if (seo.desc) {
        var md = document.querySelector('meta[name="description"]');
        if (md) md.setAttribute('content', seo.desc);
        var ogd = document.querySelector('meta[property="og:description"]');
        if (ogd) ogd.setAttribute('content', seo.desc);
      }
      if (seo.h1 && typeof I18N !== 'undefined' && I18N.fr) {
        I18N.fr['hero.titleHtml'] = seo.h1;
      }
      if (seo.canonical) {
        var canon = document.querySelector('link[rel="canonical"]');
        if (canon) canon.setAttribute('href', seo.canonical);
      }
    }

    /* 3. A/B Test */
    var ab = data.ab;
    if (ab && ab.active && ab.variants && ab.variants.length > 0) {
      var track = rd('asl_mkt_track_v1') || { visits:0, variants:{} };
      track.visits = (track.visits || 0) + 1;
      var idx = track.visits % ab.variants.length;
      var variant = ab.variants[idx];
      window._ASL_AB_VARIANT = idx;
      if (variant && variant.overrides && typeof I18N !== 'undefined' && I18N.fr) {
        Object.keys(variant.overrides).forEach(function (k) {
          if (variant.overrides[k]) I18N.fr[k] = variant.overrides[k];
        });
      }
      if (!track.variants[idx]) track.variants[idx] = { views:0, wa:0, res:0 };
      track.variants[idx].views = (track.variants[idx].views || 0) + 1;
      wr('asl_mkt_track_v1', track);
    }

    /* 4. FAQ — fusion seed (questions du site) + back-office, Schema.org + affichage. */
    var faqs = mergeFaqs(window._ASL_FAQ_SEED || [], (data.faq && data.faq.length) ? data.faq : []);
    if (faqs && faqs.length > 0) {
      window._ASL_FAQS = faqs;
      var pub = faqs.filter(function(f){ return f.active !== false; });
      window._ASL_FAQS_PUBLISHED = pub;
      if (pub.length > 0) {
        var flang = activeLang();
        var fField = function(f, field){
          if (f.i18n && f.i18n[flang] && f.i18n[flang][field]) return f.i18n[flang][field];
          if (f.i18n && f.i18n.fr && f.i18n.fr[field]) return f.i18n.fr[field];
          return f[field] || '';
        };
        var schema = {
          '@context':'https://schema.org','@type':'FAQPage',
          mainEntity: pub.map(function(f){ return {
            '@type':'Question', name: fField(f,'question'),
            acceptedAnswer:{ '@type':'Answer', text: fField(f,'answer') }
          }; })
        };
        var s = document.createElement('script');
        s.type = 'application/ld+json';
        s.textContent = JSON.stringify(schema);
        document.head.appendChild(s);

        /* Affichage VISIBLE des questions du back-office sur la page FAQ.
           Elles s'ajoutent avant les questions statiques, et se re-rendent
           quand le visiteur change de langue. */
        if (page === 'faq') {
          var doFaq = function(){ renderFaqList(pub); };
          if (document.readyState !== 'loading') doFaq();
          else document.addEventListener('DOMContentLoaded', doFaq);
          var prevFaqHook = window.onLangApplied;
          window.onLangApplied = function(){
            if (typeof prevFaqHook === 'function') { try { prevFaqHook(); } catch(e){} }
            try { renderFaqList(window._ASL_FAQS_PUBLISHED || []); } catch(e){}
          };
        }
      }
    }

    /* 4bis. BLOG — fusion seed (articles existants du site) + back-office.
       Le résultat alimente la page Blog ET la page article (jamais vide). */
    var kvBlog = (data.blog && data.blog.length) ? data.blog : [];
    var mergedBlog = mergeArticles(window._ASL_BLOG_SEED || [], kvBlog);
    if (mergedBlog.length) {
      window._ASL_BLOG = mergedBlog;
      var publishedArticles = mergedBlog.filter(function(a){ return (a.status || 'draft') === 'published'; });
      window._ASL_BLOG_PUBLISHED = publishedArticles;
      if (page === 'blog') {
        var doRender = function(){ renderBlogGrid(publishedArticles); };
        if (document.readyState !== 'loading') doRender();
        else document.addEventListener('DOMContentLoaded', doRender);
        /* Re-rendu automatique quand le visiteur change la langue du site. */
        var prevHook = window.onLangApplied;
        window.onLangApplied = function(){
          if (typeof prevHook === 'function') { try { prevHook(); } catch(e){} }
          try { renderBlogGrid(window._ASL_BLOG_PUBLISHED || []); } catch(e){}
        };
      }
    }

    /* 5. Popup */
    var pc = data.popup;
    if (pc && pc.active) {
      window._ASL_POPUP_CFG = pc;
      document.addEventListener('DOMContentLoaded', function () {
        setTimeout(function () {
          var pageSlug = window.location.pathname.replace(/.*\//, '').replace('.html','') || 'index';
          var show = pc.pages === 'all' ||
            (pc.pages === 'home'      && (page === 'index')) ||
            (pc.pages === 'vehicules' && page === 'nos-vehicules');
          if (!show) return;
          var seen = localStorage.getItem('asl_popup_seen');
          if (seen && (Date.now() - parseInt(seen)) < 86400000) return;
          var overlay = document.createElement('div');
          overlay.style.cssText = 'position:fixed;inset:0;background:rgba(10,12,18,.55);z-index:9999;display:flex;align-items:center;justify-content:center;';
          overlay.innerHTML = '<div style="background:#fff;border-radius:18px;padding:32px 28px;max-width:420px;width:90%;text-align:center;position:relative;box-shadow:0 24px 60px rgba(0,0,0,.2);">'
            + '<button onclick="this.closest(\'div\').parentElement.remove()" style="position:absolute;top:12px;right:14px;background:none;border:none;font-size:20px;cursor:pointer;color:#999;">✕</button>'
            + '<div style="font-size:20px;font-weight:900;color:#C41E3A;margin-bottom:10px;">' + (pc.title||'') + '</div>'
            + '<div style="font-size:14px;color:#666;margin-bottom:20px;line-height:1.6;">' + (pc.text||'') + '</div>'
            + '<button onclick="this.closest(\'div\').parentElement.remove();window._ASL_track&&window._ASL_track(\'wa\')" '
            + 'style="background:#C41E3A;color:#fff;border:none;border-radius:10px;padding:13px 28px;font-size:15px;font-weight:700;cursor:pointer;font-family:inherit;">'
            + (pc.cta||'Réserver maintenant') + '</button></div>';
          document.body.appendChild(overlay);
          localStorage.setItem('asl_popup_seen', Date.now().toString());
        }, (pc.delay||5) * 1000);
      });
    }

    window._ASL_MARKETING = data;

    /* Pages de contenu (CGV, confidentialité, mentions, services…)
       gérées depuis le back-office. Fusion : seed pré-rempli + données admin.
       Le contenu admin prime ; sinon le seed reste affiché et éditable. */
    (function(){
      var seed = window._ASL_PAGES_SEED || {};
      var kv = (data.legalPages && typeof data.legalPages === 'object') ? data.legalPages :
               ((data.contentPages && typeof data.contentPages === 'object') ? data.contentPages : {});
      var merged = {};
      Object.keys(seed).forEach(function(k){ merged[k] = seed[k]; });
      Object.keys(kv).forEach(function(k){
        // fusion par champ : l'admin écrase le seed champ par champ.
        // Le back-office stocke par LANGUE → champ (kv[k][lang][field]).
        // Le seed et page-render utilisent CHAMP → langue (obj[field][lang]).
        if (!merged[k]) {
          // Convertir l'entrée admin (langue→champ) vers champ→langue.
          var conv = {};
          ['slug','status','image'].forEach(function(f){ if (kv[k][f] !== undefined) conv[f] = kv[k][f]; });
          ['title','subtitle','badge','content','metaTitle','metaDesc'].forEach(function(f){
            conv[f] = {};
            ['fr','en','es','ar'].forEach(function(l){ conv[f][l] = (kv[k][l] && kv[k][l][f]) || ''; });
          });
          merged[k] = conv;
          return;
        }
        var base = {}; var s = merged[k];
        ['slug','status','image'].forEach(function(f){ base[f] = (kv[k][f] !== undefined ? kv[k][f] : s[f]); });
        ['title','subtitle','badge','content','metaTitle','metaDesc'].forEach(function(f){
          base[f] = {};
          ['fr','en','es','ar'].forEach(function(l){
            // valeur admin = kv[k][langue][champ] ; repli sur le seed champ→langue.
            var av = kv[k][l] && kv[k][l][f];
            base[f][l] = (av && String(av).trim()) ? av : ((s[f] && s[f][l]) || '');
          });
        });
        merged[k] = base;
      });
      window._ASL_PAGES = merged;
    })();

    /* Notifie les pages (ex : article.html) que les données du back-office
       sont arrivées et appliquées, pour qu'elles se re-rendent. */
    if (typeof window.onMarketingApplied === 'function') {
      try { window.onMarketingApplied(); } catch (e) {}
    }

    /* Configuration de la bannière cookies (gérée depuis le back-office). */
    if (data.cookies) {
      window._ASL_COOKIES = data.cookies;
      /* Notifier cookie-consent.js pour qu'il réévalue l'affichage */
      if (window.ASLCookies && typeof window.ASLCookies.refresh === 'function') {
        try { window.ASLCookies.refresh(); } catch(e) {}
      }
    }

    /* Avis clients gérés depuis le back-office (multilingues). */
    if (data.reviews && data.reviews.items) {
      window._ASL_REVIEWS = data.reviews;
      var doReviews = function(){ renderReviews(data.reviews); };
      if (document.readyState !== 'loading') doReviews();
      else document.addEventListener('DOMContentLoaded', doReviews);
      var prevRevHook = window.onLangApplied;
      window.onLangApplied = function(){
        if (typeof prevRevHook === 'function') { try { prevRevHook(); } catch(e){} }
        try { renderReviews(window._ASL_REVIEWS); } catch(e){}
      };
    }

    /* Pages légales gérées depuis le back-office.
       Si un contenu existe pour la page courante, il remplace le texte
       par défaut dans .page-content (repli FR si la langue est vide). */
    /* Pages légales — fusion seed (contenu existant du site) + back-office.
       Le contenu admin non vide prime ; sinon le contenu d'origine reste affiché
       (et reste éditable). Repli FR si la langue active n'est pas traduite. */
    var kvLegal = (data.legalPages && typeof data.legalPages === 'object') ? data.legalPages : {};
    window._ASL_LEGAL = mergeLegal(window._ASL_LEGAL_SEED || {}, kvLegal);
    var legalSlug = ({ 'cgv':'cgv', 'privacy':'privacy', 'mentions':'mentions', 'lld':'lld' })[page] || null;
    if (legalSlug && window._ASL_LEGAL[legalSlug]) {
      var doLegal = function(){ renderLegalContent(legalSlug, (window._ASL_LEGAL||{})[legalSlug]); };
      if (document.readyState !== 'loading') doLegal();
      else document.addEventListener('DOMContentLoaded', doLegal);
      var prevLegalHook = window.onLangApplied;
      window.onLangApplied = function(){
        if (typeof prevLegalHook === 'function') { try { prevLegalHook(); } catch(e){} }
        try { renderLegalContent(legalSlug, (window._ASL_LEGAL||{})[legalSlug]); } catch(e){}
      };
    }

    /* Options de réservation gérées depuis le back-office.
       Le site (index.html) les lit si présentes, sinon garde ses options par défaut. */
    if (data.bookingOptions && data.bookingOptions.length) {
      window._ASL_BOOKING_OPTIONS = data.bookingOptions.filter(function(o){ return o.active !== false; });
      if (typeof window.onBookingOptionsLoaded === 'function') {
        try { window.onBookingOptionsLoaded(); } catch(e){}
      }
    }
  
    /* 3. Réseaux sociaux : appliquer les liens aux icônes du footer */
    var social = data.social || {};
    if (social && typeof social === 'object') {
      var map = {
        whatsapp: social.whatsapp,
        instagram: social.instagram,
        facebook: social.facebook,
        tiktok: social.tiktok,
        snapchat: social.snapchat
      };
      Object.keys(map).forEach(function (net) {
        var url = map[net];
        if (!url) return;
        var els = document.querySelectorAll('[data-social="' + net + '"]');
        for (var k = 0; k < els.length; k++) {
          els[k].setAttribute('href', url);
          els[k].setAttribute('target', '_blank');
          els[k].style.display = '';
        }
      });
    }
}

  /* ---- Tracking ---- */
  window._ASL_track = function (event) {
    try {
      var track = rd('asl_mkt_track_v1') || { visits:0, global:{}, variants:{} };
      if (!track.global) track.global = {};
      track.global[event] = (track.global[event] || 0) + 1;
      var v = window._ASL_AB_VARIANT;
      if (v !== undefined && track.variants && track.variants[v]) {
        track.variants[v][event] = (track.variants[v][event] || 0) + 1;
      }
      wr('asl_mkt_track_v1', track);
    } catch(e) {}
  };

  /* ---- Chargement : KV d'abord, localStorage en fallback ---- */
  /* Appliquer d'abord le cache local immédiatement (pas de flash) */
  var cached = rd(LOCAL_KEY);
  if (cached) {
    applyMarketing(cached);
    /* Ré-appliquer les traductions pour que H1 / titres modifiés apparaissent tout de suite */
    if (typeof applyI18n === 'function') applyI18n();
  }

  /* Garantir l'application APRÈS l'init i18n (évite que applyI18n du DOMContentLoaded
     ne remette les valeurs par défaut). On ré-applique le cache puis les traductions. */
  document.addEventListener('DOMContentLoaded', function () {
    var c = rd(LOCAL_KEY);
    /* Même sans cache, on applique au minimum le seed (objet vide → contenu du site
       repris depuis les seeds) pour ne JAMAIS laisser une page blog/FAQ/légale vide. */
    applyMarketing(c || {});
    if (typeof applyI18n === 'function') applyI18n();
  });

  /* Puis fetch KV en arrière-plan pour mettre à jour */
  if (typeof fetch !== 'undefined') {
    fetch(REMOTE_URL, { headers: { 'Cache-Control': 'no-cache' } })
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(function (resp) {
        if (resp && resp.ok && resp.data) {
          wr(LOCAL_KEY, resp.data);         /* mettre à jour le cache local */
          wr(LOCAL_STAMP, Date.now());
          applyMarketing(resp.data);        /* ré-appliquer avec données fraîches */
          /* Ré-appliquer les traductions après le fetch */
          if (typeof applyI18n === 'function') applyI18n();
        }
      })
      .catch(function () {
        /* Pas de réseau → fallback localStorage déjà appliqué */
      });
  }

})();
