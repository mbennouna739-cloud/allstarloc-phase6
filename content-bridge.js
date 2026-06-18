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
  /* Génère les cartes d'articles sur la page blog publique (même design que les cartes existantes) */
  function renderBlogGrid(articles) {
    var grid = document.querySelector('.cards-grid');
    if (!grid || !articles || !articles.length) return;
    function esc(s){ return String(s==null?'':s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }
    function slugify(s){ return String(s||'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]+/g,'-').replace(/^-+|-+$/g,''); }
    var arrowSvg = '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-0.125em;flex-shrink:0;"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>';
    var html = articles.map(function(a){
      var img = a.img || 'https://images.unsplash.com/photo-1597212618440-806262de4f6b?w=600&q=80';
      var cat = a.category || 'Article';
      var excerpt = a.desc || (a.content ? String(a.content).replace(/<[^>]*>/g,'').slice(0,140) + '…' : '');
      var href = a.slug ? (a.slug + '.html') : ('article-' + slugify(a.title) + '.html');
      return '<div class="card">'
        + '<div class="card-img"><img src="' + esc(img) + '" alt="' + esc(a.title) + '" loading="lazy"></div>'
        + '<div class="card-body">'
        + '<div class="card-tag">' + esc(cat) + '</div>'
        + '<div class="card-title">' + esc(a.title) + '</div>'
        + '<div class="card-text">' + esc(excerpt) + '</div>'
        + '<a class="card-link" href="' + esc(href) + '">Lire l\'article ' + arrowSvg + '</a>'
        + '</div></div>';
    }).join('');
    // Les articles publiés depuis l'admin viennent EN PREMIER, les cartes statiques existantes restent ensuite
    grid.insertAdjacentHTML('afterbegin', html);
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

    /* 4. FAQ Schema.org */
    var faqs = data.faq;
    if (faqs && faqs.length > 0) {
      window._ASL_FAQS = faqs;
      var pub = faqs.filter(function(f){ return f.active !== false; });
      if (pub.length > 0) {
        var schema = {
          '@context':'https://schema.org','@type':'FAQPage',
          mainEntity: pub.map(function(f){ return {
            '@type':'Question', name: f.question,
            acceptedAnswer:{ '@type':'Answer', text: f.answer }
          }; })
        };
        var s = document.createElement('script');
        s.type = 'application/ld+json';
        s.textContent = JSON.stringify(schema);
        document.head.appendChild(s);
      }
    }

    /* 4bis. BLOG — exposer les articles publiés et les afficher sur la page blog */
    var blog = data.blog;
    if (blog && blog.length) {
      window._ASL_BLOG = blog;
      var publishedArticles = blog.filter(function(a){ return (a.status || 'draft') === 'published'; });
      if (page === 'blog' && publishedArticles.length) {
        document.addEventListener('DOMContentLoaded', function(){
          renderBlogGrid(publishedArticles);
        });
        if (document.readyState !== 'loading') renderBlogGrid(publishedArticles);
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
    if (c) {
      applyMarketing(c);
      if (typeof applyI18n === 'function') applyI18n();
    }
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
