/* ============================================================
   ALL STAR LOC — Bannière de consentement cookies
   - Bannière responsive, multilingue
   - Accepter / Refuser / Personnaliser
   - Catégories : Nécessaires (toujours), Analytics, Marketing, Fonctionnels
   - Configurable depuis le back-office (Paramètres → Cookies & Confidentialité)
   - Prête pour Google Analytics, Google Ads, Meta Pixel : les scripts de
     suivi ne se chargent QUE si le consentement est donné.
   Chargé sur le site après i18n.js.
   ============================================================ */
(function(){
  var CONSENT_KEY = 'asl_cookie_consent_v1';
  var DEFAULT_CFG = {
    enabled: true,
    text: {
      fr: 'Nous utilisons des cookies pour améliorer votre expérience, analyser le trafic et personnaliser le contenu. Vous pouvez accepter, refuser ou personnaliser vos choix.',
      en: 'We use cookies to improve your experience, analyse traffic and personalise content. You can accept, decline or customise your choices.',
      es: 'Utilizamos cookies para mejorar su experiencia, analizar el tráfico y personalizar el contenido. Puede aceptar, rechazar o personalizar sus opciones.',
      ar: 'نستخدم ملفات تعريف الارتباط لتحسين تجربتك وتحليل الزيارات وتخصيص المحتوى. يمكنك القبول أو الرفض أو تخصيص اختياراتك.'
    },
    categories: { analytics: true, marketing: true, functional: true },
    // Identifiants de suivi (vides par défaut, à remplir depuis le back-office)
    trackers: { ga4: '', googleAds: '', metaPixel: '' }
  };

  function getCfg() {
    try {
      var all = JSON.parse(localStorage.getItem('asl_mkt_all_v1') || '{}');
      if (all && all.cookies) return mergeCfg(all.cookies);
    } catch(e) {}
    if (window._ASL_COOKIES) return mergeCfg(window._ASL_COOKIES);
    return DEFAULT_CFG;
  }
  function mergeCfg(c) {
    return {
      enabled: c.enabled !== false,
      text: Object.assign({}, DEFAULT_CFG.text, c.text || {}),
      categories: Object.assign({}, DEFAULT_CFG.categories, c.categories || {}),
      trackers: Object.assign({}, DEFAULT_CFG.trackers, c.trackers || {})
    };
  }

  function getConsent() {
    try { return JSON.parse(localStorage.getItem(CONSENT_KEY) || 'null'); } catch(e) { return null; }
  }
  function saveConsent(consent) {
    consent.date = new Date().toISOString();
    try { localStorage.setItem(CONSENT_KEY, JSON.stringify(consent)); } catch(e) {}
    applyTrackers(consent);
  }

  function lang() {
    try { if (typeof window.getLang === 'function') return window.getLang(); } catch(e){}
    return 'fr';
  }
  function L(obj){ return (obj && (obj[lang()] || obj.fr)) || ''; }

  /* Active les scripts de suivi UNIQUEMENT selon le consentement. */
  function applyTrackers(consent) {
    var cfg = getCfg();
    if (consent.analytics && cfg.trackers.ga4) loadGA4(cfg.trackers.ga4);
    if (consent.marketing && cfg.trackers.googleAds) loadGoogleAds(cfg.trackers.googleAds);
    if (consent.marketing && cfg.trackers.metaPixel) loadMetaPixel(cfg.trackers.metaPixel);
  }
  var _loaded = {};
  function loadGA4(id) {
    if (_loaded.ga4) return; _loaded.ga4 = true;
    var s = document.createElement('script'); s.async = true;
    s.src = 'https://www.googletagmanager.com/gtag/js?id=' + encodeURIComponent(id);
    document.head.appendChild(s);
    window.dataLayer = window.dataLayer || [];
    window.gtag = function(){ window.dataLayer.push(arguments); };
    window.gtag('js', new Date());
    window.gtag('config', id);
  }
  function loadGoogleAds(id) {
    if (_loaded.ads) return; _loaded.ads = true;
    var s = document.createElement('script'); s.async = true;
    s.src = 'https://www.googletagmanager.com/gtag/js?id=' + encodeURIComponent(id);
    document.head.appendChild(s);
    window.dataLayer = window.dataLayer || [];
    window.gtag = window.gtag || function(){ window.dataLayer.push(arguments); };
    window.gtag('js', new Date());
    window.gtag('config', id);
  }
  function loadMetaPixel(id) {
    if (_loaded.meta) return; _loaded.meta = true;
    !function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?
      n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;
      n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;
      t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,
      document,'script','https://connect.facebook.net/en_US/fbevents.js');
    window.fbq('init', id); window.fbq('track', 'PageView');
  }

  /* ---- UI de la bannière ---- */
  function texts() {
    var t = {
      fr: { accept:'Tout accepter', refuse:'Tout refuser', custom:'Personnaliser', save:'Enregistrer mes choix', title:'Vos préférences cookies', necessary:'Nécessaires (toujours actifs)', analytics:'Analytics', marketing:'Marketing', functional:'Fonctionnels', necessaryD:'Indispensables au fonctionnement du site.', analyticsD:'Mesure d\'audience (ex : Google Analytics).', marketingD:'Publicité et reciblage (ex : Google Ads, Meta Pixel).', functionalD:'Fonctions de confort (préférences, chat).' },
      en: { accept:'Accept all', refuse:'Decline all', custom:'Customise', save:'Save my choices', title:'Your cookie preferences', necessary:'Necessary (always on)', analytics:'Analytics', marketing:'Marketing', functional:'Functional', necessaryD:'Essential for the website to work.', analyticsD:'Audience measurement (e.g. Google Analytics).', marketingD:'Advertising and retargeting (e.g. Google Ads, Meta Pixel).', functionalD:'Comfort features (preferences, chat).' },
      es: { accept:'Aceptar todo', refuse:'Rechazar todo', custom:'Personalizar', save:'Guardar mis opciones', title:'Sus preferencias de cookies', necessary:'Necesarias (siempre activas)', analytics:'Analytics', marketing:'Marketing', functional:'Funcionales', necessaryD:'Imprescindibles para el funcionamiento del sitio.', analyticsD:'Medición de audiencia (p. ej. Google Analytics).', marketingD:'Publicidad y retargeting (p. ej. Google Ads, Meta Pixel).', functionalD:'Funciones de confort (preferencias, chat).' },
      ar: { accept:'قبول الكل', refuse:'رفض الكل', custom:'تخصيص', save:'حفظ اختياراتي', title:'تفضيلات ملفات تعريف الارتباط', necessary:'ضرورية (مفعّلة دائماً)', analytics:'تحليلات', marketing:'تسويق', functional:'وظيفية', necessaryD:'ضرورية لعمل الموقع.', analyticsD:'قياس الجمهور (مثل Google Analytics).', marketingD:'إعلانات وإعادة استهداف (مثل Google Ads وMeta Pixel).', functionalD:'ميزات الراحة (التفضيلات، الدردشة).' }
    };
    return t[lang()] || t.fr;
  }

  function buildBanner(cfg) {
    var tx = texts();
    var isRTL = lang() === 'ar';
    var wrap = document.createElement('div');
    wrap.id = 'asl-cookie-banner';
    wrap.setAttribute('dir', isRTL ? 'rtl' : 'ltr');
    /* Carte discrète en bas à gauche (desktop) / barre compacte en bas (mobile),
       jamais pleine largeur agressive. Largeur limitée, coins arrondis, ombre douce. */
    wrap.style.cssText = [
      'position:fixed', 'z-index:980',  /* sous le pop-up de réservation (overlay 990 / drawer 1000) : ne le couvre jamais */
      'left:18px', 'bottom:18px', 'width:360px', 'max-width:calc(100vw - 36px)',
      'background:#fff', 'border:1px solid #e5e7eb', 'border-radius:14px',
      'box-shadow:0 12px 40px rgba(0,0,0,.18)', 'padding:18px',
      'font-family:inherit', 'box-sizing:border-box'
    ].join(';');
    wrap.innerHTML =
      '<div style="display:flex;flex-direction:column;gap:14px;">'
      + '<div style="display:flex;gap:12px;align-items:flex-start;">'
      + '<span style="flex-shrink:0;width:34px;height:34px;border-radius:9px;background:rgba(196,30,58,.08);display:flex;align-items:center;justify-content:center;">'
      + '<svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="#C41E3A" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z"/><path d="m9 12 2 2 4-4"/></svg></span>'
      + '<div style="flex:1;font-size:13px;color:#374151;line-height:1.55;">'
      + '<div style="font-weight:700;color:#111827;font-size:13.5px;margin-bottom:3px;">' + (tx.title || 'Cookies & confidentialité') + '</div>'
      + escapeHtml(L(cfg.text)) + '</div>'
      + '</div>'
      + '<div style="display:flex;gap:8px;flex-wrap:wrap;">'
      + '<button id="asl-ck-accept" style="'+btn('primary')+'flex:1;min-width:120px;">' + tx.accept + '</button>'
      + '<button id="asl-ck-refuse" style="'+btn('ghost')+'">' + tx.refuse + '</button>'
      + '<button id="asl-ck-custom" style="'+btn('ghost')+'">' + tx.custom + '</button>'
      + '</div></div>';
    return wrap;
  }
  function btn(kind){
    if (kind==='primary') return 'padding:10px 18px;border:none;border-radius:8px;background:#C41E3A;color:#fff;font-weight:600;font-size:13px;cursor:pointer;';
    return 'padding:10px 16px;border:1px solid #d1d5db;border-radius:8px;background:#fff;color:#374151;font-size:13px;cursor:pointer;';
  }
  function escapeHtml(s){ return String(s==null?'':s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }

  function buildCustomModal(cfg) {
    var tx = texts();
    var isRTL = lang() === 'ar';
    var prev = getConsent() || { analytics:false, marketing:false, functional:false };
    var host = document.createElement('div');
    host.id = 'asl-cookie-modal';
    host.setAttribute('dir', isRTL ? 'rtl' : 'ltr');
    host.style.cssText = 'position:fixed;inset:0;z-index:100000;background:rgba(0,0,0,.5);display:flex;align-items:center;justify-content:center;padding:16px;';
    function row(key, on, locked) {
      return '<label style="display:flex;gap:12px;align-items:flex-start;padding:12px 0;border-bottom:1px solid #f0f0f0;cursor:'+(locked?'default':'pointer')+';">'
        + '<input type="checkbox" data-ck="'+key+'" '+(on?'checked':'')+' '+(locked?'disabled checked':'')+' style="margin-top:3px;width:16px;height:16px;accent-color:#C41E3A;">'
        + '<div><div style="font-weight:700;font-size:13.5px;color:#1a1a2e;">'+tx[key]+'</div>'
        + '<div style="font-size:12px;color:#667;margin-top:2px;">'+tx[key+'D']+'</div></div></label>';
    }
    var rows = row('necessary', true, true);
    if (cfg.categories.analytics !== false) rows += row('analytics', prev.analytics, false);
    if (cfg.categories.marketing !== false) rows += row('marketing', prev.marketing, false);
    if (cfg.categories.functional !== false) rows += row('functional', prev.functional, false);
    host.innerHTML =
      '<div style="background:#fff;border-radius:16px;max-width:460px;width:100%;max-height:86vh;overflow-y:auto;box-shadow:0 24px 60px rgba(0,0,0,.3);">'
      + '<div style="padding:18px 20px;border-bottom:1px solid #eee;"><strong style="font-size:16px;">'+tx.title+'</strong></div>'
      + '<div style="padding:8px 20px;">' + rows + '</div>'
      + '<div style="padding:16px 20px;display:flex;gap:10px;justify-content:flex-end;">'
      + '<button id="asl-ck-save" style="'+btn('primary')+'">'+tx.save+'</button>'
      + '</div></div>';
    return host;
  }

  function removeBanner(){ var b=document.getElementById('asl-cookie-banner'); if(b) b.remove(); }
  function removeModal(){ var m=document.getElementById('asl-cookie-modal'); if(m) m.remove(); }

  function show() {
    var cfg = getCfg();
    if (!cfg.enabled) return;          // bannière désactivée depuis le back-office
    if (getConsent()) { applyTrackers(getConsent()); return; }  // déjà choisi
    var banner = buildBanner(cfg);
    document.body.appendChild(banner);
    _watchBookingPopup();              // masquer si le pop-up de réservation est ouvert
    document.getElementById('asl-ck-accept').onclick = function(){
      saveConsent({ analytics:true, marketing:true, functional:true });
      removeBanner();
    };
    document.getElementById('asl-ck-refuse').onclick = function(){
      saveConsent({ analytics:false, marketing:false, functional:false });
      removeBanner();
    };
    document.getElementById('asl-ck-custom').onclick = function(){
      var modal = buildCustomModal(cfg);
      document.body.appendChild(modal);
      modal.addEventListener('click', function(e){ if(e.target===modal) removeModal(); });
      document.getElementById('asl-ck-save').onclick = function(){
        var consent = { analytics:false, marketing:false, functional:false };
        modal.querySelectorAll('input[data-ck]').forEach(function(cb){
          var k = cb.getAttribute('data-ck');
          if (k !== 'necessary') consent[k] = cb.checked;
        });
        saveConsent(consent);
        removeModal(); removeBanner();
      };
    };
  }

  /* Masque la bannière cookies tant qu'un pop-up de réservation est ouvert,
     puis la réaffiche à la fermeture. Évite tout chevauchement / confusion. */
  function _watchBookingPopup() {
    var drawer = document.getElementById('booking-drawer');
    var overlay = document.getElementById('drawer-overlay');
    if (!drawer && !overlay) return;   // pas de pop-up sur cette page
    function update() {
      var banner = document.getElementById('asl-cookie-banner');
      if (!banner) return;
      var open = (drawer && drawer.classList.contains('open')) ||
                 (overlay && overlay.classList.contains('open'));
      banner.style.display = open ? 'none' : '';
    }
    update();
    try {
      var obs = new MutationObserver(update);
      if (drawer) obs.observe(drawer, { attributes:true, attributeFilter:['class'] });
      if (overlay) obs.observe(overlay, { attributes:true, attributeFilter:['class'] });
    } catch(e) {}
  }

  /* Permet de rouvrir les préférences depuis un lien du pied de page :
     <a href="#" onclick="ASLCookies.open()">Gérer les cookies</a> */
  window.ASLCookies = {
    open: function(){
      removeBanner();
      var cfg = getCfg();
      var modal = buildCustomModal(cfg);
      document.body.appendChild(modal);
      modal.addEventListener('click', function(e){ if(e.target===modal) removeModal(); });
      document.getElementById('asl-ck-save').onclick = function(){
        var consent = { analytics:false, marketing:false, functional:false };
        modal.querySelectorAll('input[data-ck]').forEach(function(cb){
          var k = cb.getAttribute('data-ck');
          if (k !== 'necessary') consent[k] = cb.checked;
        });
        saveConsent(consent); removeModal();
      };
    },
    reset: function(){ try{ localStorage.removeItem(CONSENT_KEY); }catch(e){} location.reload(); }
  };

  // Le content-bridge expose la config serveur dans window._ASL_COOKIES ;
  // on attend un court instant pour la récupérer, sinon on utilise le cache local.
  function init(){ setTimeout(show, 400); }
  if (document.readyState !== 'loading') init();
  else document.addEventListener('DOMContentLoaded', init);
})();
