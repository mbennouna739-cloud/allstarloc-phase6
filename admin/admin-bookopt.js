/* ============================================================
   ALL STAR LOC — Options de réservation (back-office principal)
   Gérées directement sous "Assurances" dans le menu latéral.
   Stockage : même clé que le module Marketing (asl_mkt_bkopt_v1)
   → parfaitement synchronisé avec le site et le module Marketing.
   ============================================================ */

(function(){
  var BKOPT_KEY = 'asl_mkt_bkopt_v1';
  var MKT_LOCAL_KEY = 'asl_mkt_all_v1';

  function readOpts() {
    try {
      var raw = localStorage.getItem(BKOPT_KEY);
      if (raw) return JSON.parse(raw);
    } catch(e) {}
    var def = _defaultBookOpts();
    try { localStorage.setItem(BKOPT_KEY, JSON.stringify(def)); } catch(e) {}
    return def;
  }
  function writeOpts(opts) {
    try { localStorage.setItem(BKOPT_KEY, JSON.stringify(opts)); } catch(e) {}
  }

  function _defaultBookOpts() {
    return [
      { id:'extra-driver', name:{fr:'Deuxième conducteur',en:'Second driver',es:'Segundo conductor',ar:'سائق ثانٍ'}, price:50, priceType:'day', active:true },
      { id:'baby-seat', name:{fr:'Siège bébé',en:'Baby seat',es:'Silla de bebé',ar:'مقعد للرضع'}, price:50, priceType:'day', active:true },
      { id:'booster', name:{fr:'Réhausseur enfant',en:'Child booster seat',es:'Elevador infantil',ar:'مقعد رافع للأطفال'}, price:50, priceType:'day', active:true },
      { id:'gps', name:{fr:'GPS portable',en:'Portable GPS',es:'GPS portátil',ar:'GPS محمول'}, price:50, priceType:'day', active:true },
      { id:'delivery', name:{fr:'Livraison véhicule',en:'Vehicle delivery',es:'Entrega del vehículo',ar:'توصيل السيارة'}, price:0, priceType:'free', active:true },
      { id:'return', name:{fr:'Retour véhicule',en:'Vehicle return',es:'Devolución del vehículo',ar:'إرجاع السيارة'}, price:0, priceType:'free', active:true },
      { id:'tire-protection', name:{fr:'Protection pneus / crevaison',en:'Tyre / puncture protection',es:'Protección neumáticos / pinchazo',ar:'حماية الإطارات / الثقب'}, price:30, priceType:'day', active:true },
      { id:'roadside', name:{fr:'Assistance dépannage',en:'Roadside assistance',es:'Asistencia en carretera',ar:'مساعدة على الطريق'}, price:50, priceType:'day', active:true },
      { id:'insurance-ext', name:{fr:'Extension assurance',en:'Insurance extension',es:'Extensión de seguro',ar:'تمديد التأمين'}, price:110, priceType:'day', active:true },
    ];
  }
  window._defaultBookOpts = window._defaultBookOpts || _defaultBookOpts;

  /* Synchronisation vers le serveur : on met à jour la SECTION
     bookingOptions du document marketing complet (sans écraser le reste). */
  function syncBookOpts(opts) {
    showBkoptBar('Enregistrement…', 'info');
    /* Mettre à jour le cache local complet pour cohérence avec le site hors-ligne */
    try {
      var all = {};
      try { all = JSON.parse(localStorage.getItem(MKT_LOCAL_KEY) || '{}'); } catch(e) { all = {}; }
      all.bookingOptions = opts;
      all.updatedAt = new Date().toISOString();
      localStorage.setItem(MKT_LOCAL_KEY, JSON.stringify(all));
    } catch(e) {}

    if (typeof fetch === 'undefined') { showBkoptBar('Enregistré en local.', 'ok'); return; }

    /* Lire le document marketing du serveur, fusionner bookingOptions, renvoyer. */
    fetch('/api/marketing', { headers:{ 'Cache-Control':'no-cache' } })
      .then(function(r){ return r.ok ? r.json() : null; })
      .then(function(resp){
        var doc = (resp && resp.data) ? resp.data : {};
        doc.bookingOptions = opts;
        doc.updatedAt = new Date().toISOString();
        var headers = { 'Content-Type':'application/json' };
        try { var k = localStorage.getItem('asl_admin_key') || ''; if (k) headers['X-ASL-Key'] = k; } catch(e) {}
        return fetch('/api/marketing', { method:'PUT', headers:headers, body:JSON.stringify(doc) });
      })
      .then(function(r){
        if (r && r.ok) showBkoptBar('✓ Options enregistrées et synchronisées avec le site. Rafraîchissez le site public (Ctrl+F5).', 'ok');
        else showBkoptBar('Enregistré en local. Synchronisation serveur indisponible (test local ?).', 'warn');
      })
      .catch(function(){
        showBkoptBar('Enregistré en local (serveur injoignable — normal en test local).', 'warn');
      });
  }

  function showBkoptBar(msg, kind) {
    var bar = document.getElementById('bookopt-sync-bar');
    if (!bar) return;
    var colors = { ok:'#16a34a', warn:'#d97706', info:'#0ea5e9', err:'#dc2626' };
    var bg = { ok:'#dcfce7', warn:'#fef3c7', info:'#e0f2fe', err:'#fee2e2' };
    bar.style.display = 'block';
    bar.style.background = bg[kind] || bg.info;
    bar.style.color = colors[kind] || colors.info;
    bar.textContent = msg;
    if (kind === 'ok') setTimeout(function(){ bar.style.display='none'; }, 8000);
  }

  /* ---- Rendu de la liste ---- */
  window.renderBookOptMain = function() {
    var opts = readOpts();
    var list = document.getElementById('bookopt-main-list');
    var empty = document.getElementById('bookopt-main-empty');
    if (!list) return;
    if (!opts.length) { list.innerHTML=''; if(empty) empty.style.display='block'; return; }
    if (empty) empty.style.display='none';
    list.innerHTML = opts.map(function(o, i){
      var priceTxt = o.priceType==='free'
        ? '<span style="color:#16a34a;font-weight:700;">Gratuit</span>'
        : (o.price + ' MAD ' + (o.priceType==='day' ? '/ jour' : '/ réservation'));
      var statusBadge = o.active===false
        ? '<span style="font-size:11px;color:#999;border:1px solid #ddd;border-radius:20px;padding:2px 10px;">Désactivée</span>'
        : '<span style="font-size:11px;color:#16a34a;border:1px solid #bbf7d0;background:#f0fdf4;border-radius:20px;padding:2px 10px;">● Active</span>';
      return '<div style="display:flex;align-items:center;gap:12px;padding:14px 16px;border-bottom:1px solid #f0f0f0;flex-wrap:wrap;">'
        + '<div style="flex:1;min-width:180px;">'
        + '<div style="font-weight:700;font-size:14px;color:#1a1a2e;">' + escapeHtml(o.name && o.name.fr || o.id) + '</div>'
        + '<div style="font-size:12.5px;color:#667;margin-top:2px;">' + priceTxt + '</div>'
        + '</div>'
        + '<div>' + statusBadge + '</div>'
        + '<button class="btn-sm ghost" onclick="toggleBookOptMain(' + i + ')">' + (o.active===false?'Activer':'Désactiver') + '</button>'
        + '<button class="btn-sm ghost" onclick="openBookOptEditorMain(' + i + ')">Modifier</button>'
        + '<button class="btn-sm ghost" style="color:#dc2626;" onclick="deleteBookOptMain(' + i + ')">Suppr.</button>'
        + '</div>';
    }).join('');
  };

  function escapeHtml(s){ return String(s==null?'':s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }

  /* ---- Éditeur (mini-modale autonome) ---- */
  var _editLang = 'fr';
  var _buf = { fr:'', en:'', es:'', ar:'' };

  window.openBookOptEditorMain = function(idx) {
    var opts = readOpts();
    var o = (typeof idx === 'number') ? opts[idx] : null;
    _editLang = 'fr';
    _buf = {
      fr: (o && o.name && o.name.fr) || '',
      en: (o && o.name && o.name.en) || '',
      es: (o && o.name && o.name.es) || '',
      ar: (o && o.name && o.name.ar) || ''
    };
    var ptype = o ? o.priceType : 'day';
    var price = o ? o.price : 0;
    var active = o ? (o.active !== false) : true;

    var host = document.getElementById('bkopt-modal-host');
    if (!host) {
      host = document.createElement('div');
      host.id = 'bkopt-modal-host';
      document.body.appendChild(host);
    }
    host.innerHTML =
      '<div style="position:fixed;inset:0;background:rgba(10,12,18,.5);z-index:6000;display:flex;align-items:center;justify-content:center;padding:16px;" onclick="if(event.target===this)closeBkoptModal()">'
      + '<div style="background:#fff;border-radius:16px;max-width:460px;width:100%;max-height:90vh;overflow-y:auto;box-shadow:0 24px 60px rgba(0,0,0,.25);">'
      + '<div style="padding:18px 20px;border-bottom:1px solid #eee;display:flex;align-items:center;justify-content:space-between;">'
      + '<strong style="font-size:16px;">' + (o ? 'Modifier l\'option' : 'Nouvelle option') + '</strong>'
      + '<button onclick="closeBkoptModal()" style="background:none;border:none;font-size:20px;cursor:pointer;color:#999;">&#10005;</button>'
      + '</div>'
      + '<div style="padding:20px;display:flex;flex-direction:column;gap:14px;">'
      + '<div style="display:flex;gap:6px;flex-wrap:wrap;">'
      + _langBtn('fr','🇫🇷 FR',true) + _langBtn('en','🇬🇧 EN') + _langBtn('es','🇪🇸 ES') + _langBtn('ar','🇸🇦 AR')
      + '</div>'
      + '<div><label style="display:block;font-size:13px;font-weight:600;margin-bottom:5px;">Nom de l\'option <span id="bkopt-lng">FR</span> *</label>'
      + '<input id="bkopt-name" value="' + escapeHtml(_buf.fr) + '" placeholder="Ex : Siège bébé" style="width:100%;padding:10px 12px;border:1px solid #ddd;border-radius:8px;font-size:14px;box-sizing:border-box;"></div>'
      + '<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;">'
      + '<div><label style="display:block;font-size:13px;font-weight:600;margin-bottom:5px;">Type de prix</label>'
      + '<select id="bkopt-ptype" onchange="_bkoptMainPtype()" style="width:100%;padding:10px 12px;border:1px solid #ddd;border-radius:8px;font-size:14px;box-sizing:border-box;">'
      + '<option value="day"' + (ptype==='day'?' selected':'') + '>Par jour</option>'
      + '<option value="booking"' + (ptype==='booking'?' selected':'') + '>Par réservation</option>'
      + '<option value="free"' + (ptype==='free'?' selected':'') + '>Gratuit</option>'
      + '</select></div>'
      + '<div><label style="display:block;font-size:13px;font-weight:600;margin-bottom:5px;">Prix (MAD)</label>'
      + '<input id="bkopt-price" type="number" value="' + price + '"' + (ptype==='free'?' disabled':'') + ' style="width:100%;padding:10px 12px;border:1px solid #ddd;border-radius:8px;font-size:14px;box-sizing:border-box;"></div>'
      + '</div>'
      + '<label style="display:flex;align-items:center;gap:8px;font-size:13.5px;cursor:pointer;"><input type="checkbox" id="bkopt-active"' + (active?' checked':'') + ' style="width:16px;height:16px;"> Option active (visible dans le pop-up de réservation)</label>'
      + '</div>'
      + '<div style="padding:16px 20px;border-top:1px solid #eee;display:flex;gap:10px;justify-content:flex-end;">'
      + '<button onclick="closeBkoptModal()" style="padding:10px 18px;border:1px solid #ddd;background:#fff;border-radius:8px;cursor:pointer;font-size:14px;">Annuler</button>'
      + '<button onclick="saveBookOptMain(' + (typeof idx==='number'?idx:'undefined') + ')" style="padding:10px 18px;border:none;background:#C41E3A;color:#fff;border-radius:8px;cursor:pointer;font-size:14px;font-weight:600;">Enregistrer</button>'
      + '</div>'
      + '</div></div>';
  };

  function _langBtn(l, label, active) {
    return '<button type="button" data-bkl="' + l + '" onclick="switchBkoptMainLang(\'' + l + '\')" '
      + 'style="padding:6px 12px;border-radius:8px;border:1px solid ' + (active?'#C41E3A':'#ddd') + ';background:' + (active?'#C41E3A':'#fff') + ';color:' + (active?'#fff':'#444') + ';font-size:12.5px;cursor:pointer;">' + label + '</button>';
  }

  window.switchBkoptMainLang = function(lang) {
    _buf[_editLang] = document.getElementById('bkopt-name').value || '';
    _editLang = lang;
    document.querySelectorAll('[data-bkl]').forEach(function(b){
      var on = b.getAttribute('data-bkl') === lang;
      b.style.background = on ? '#C41E3A' : '#fff';
      b.style.color = on ? '#fff' : '#444';
      b.style.borderColor = on ? '#C41E3A' : '#ddd';
    });
    var lng = document.getElementById('bkopt-lng'); if (lng) lng.textContent = lang.toUpperCase();
    var inp = document.getElementById('bkopt-name');
    if (inp) { inp.value = _buf[lang] || ''; inp.dir = (lang==='ar')?'rtl':'ltr'; }
  };

  window._bkoptMainPtype = function() {
    var t = document.getElementById('bkopt-ptype').value;
    var p = document.getElementById('bkopt-price');
    if (p) { if (t==='free'){ p.value=0; p.disabled=true; } else { p.disabled=false; } }
  };

  window.closeBkoptModal = function() {
    var host = document.getElementById('bkopt-modal-host');
    if (host) host.innerHTML = '';
  };

  window.saveBookOptMain = function(idx) {
    _buf[_editLang] = document.getElementById('bkopt-name').value || '';
    if (!(_buf.fr||'').trim()) { alert('Le nom français est obligatoire.'); return; }
    var opts = readOpts();
    var ptype = document.getElementById('bkopt-ptype').value || 'day';
    var price = ptype==='free' ? 0 : (parseFloat(document.getElementById('bkopt-price').value) || 0);
    var active = document.getElementById('bkopt-active').checked !== false;
    var slug = (_buf.fr||'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]+/g,'-').replace(/^-+|-+$/g,'');
    var item = {
      id: (typeof idx==='number' && opts[idx]) ? opts[idx].id : (slug || ('opt-'+Date.now())),
      name: { fr:_buf.fr.trim(), en:(_buf.en||'').trim(), es:(_buf.es||'').trim(), ar:(_buf.ar||'').trim() },
      price: price, priceType: ptype, active: active
    };
    if (typeof idx==='number' && idx < opts.length) opts[idx] = item;
    else opts.push(item);
    writeOpts(opts);
    closeBkoptModal();
    renderBookOptMain();
    syncBookOpts(opts);
  };

  window.toggleBookOptMain = function(idx) {
    var opts = readOpts();
    if (!opts[idx]) return;
    opts[idx].active = (opts[idx].active === false);
    writeOpts(opts);
    renderBookOptMain();
    syncBookOpts(opts);
  };

  window.deleteBookOptMain = function(idx) {
    if (!confirm('Supprimer cette option ?')) return;
    var opts = readOpts().filter(function(_,i){ return i!==idx; });
    writeOpts(opts);
    renderBookOptMain();
    syncBookOpts(opts);
  };
})();
