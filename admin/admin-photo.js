/* ============================================================
   ALL STAR LOC — Traitement automatique des photos de véhicules
   ------------------------------------------------------------
   Rendu « catalogue » professionnel, 100 % local (aucun service
   externe, aucune clé). Pour CHAQUE photo envoyée :
     • détection de la zone utile (la voiture) par contraste avec
       les bords uniformes → recadrage automatique ;
     • centrage + redimensionnement sur un canevas uniforme avec
       une marge (rien ne touche les bords) ;
     • fond au choix : blanc (défaut), noir, transparent, ou
       personnalisé (image téléversée par l'admin) ;
     • format de sortie uniforme (ratio 4:3, 1200×900).

   IMPORTANT : ce module n'ajoute qu'une fonction utilitaire
   (window.ASLPhoto.process). Il ne modifie aucune logique métier,
   aucune donnée, aucun autre module. S'il échoue pour une raison
   quelconque, l'appelant peut retomber sur l'image d'origine.
   ============================================================ */
(function () {
  'use strict';

  var OUT_W = 1600, OUT_H = 1200;    // format catalogue uniforme (4:3), haute définition
  var MARGIN_RATIO = 0.08;           // marge mini autour de la voiture (8 %)

  /* Charge un fichier (ou dataURL) en élément Image. */
  function loadImage(src) {
    return new Promise(function (resolve, reject) {
      var img = new Image();
      img.onload = function () { resolve(img); };
      img.onerror = function () { reject(new Error('Image illisible')); };
      img.src = src;
    });
  }
  function fileToDataURL(file) {
    return new Promise(function (resolve, reject) {
      var r = new FileReader();
      r.onload = function () { resolve(r.result); };
      r.onerror = function () { reject(new Error('Lecture impossible')); };
      r.readAsDataURL(file);
    });
  }

  /* Détecte la boîte englobante de la voiture : on échantillonne la
     couleur des 4 coins (supposés = fond), puis on cherche les pixels
     qui s'en écartent. Robuste pour les fonds relativement unis. */
  function detectBounds(ctx, w, h) {
    var data;
    try { data = ctx.getImageData(0, 0, w, h).data; } catch (e) { return null; }
    function px(x, y) { var i = (y * w + x) * 4; return [data[i], data[i + 1], data[i + 2]]; }
    // Couleur de fond estimée = moyenne des 4 coins
    var corners = [px(2, 2), px(w - 3, 2), px(2, h - 3), px(w - 3, h - 3)];
    var bg = [0, 0, 0];
    corners.forEach(function (c) { bg[0] += c[0]; bg[1] += c[1]; bg[2] += c[2]; });
    bg = [bg[0] / 4, bg[1] / 4, bg[2] / 4];
    // Seuil de différence (distance euclidienne) — tolérant aux dégradés légers
    var THRESH = 38;
    var minX = w, minY = h, maxX = 0, maxY = 0, found = false;
    var step = Math.max(1, Math.floor(Math.min(w, h) / 400)); // sous-échantillonnage
    for (var y = 0; y < h; y += step) {
      for (var x = 0; x < w; x += step) {
        var i = (y * w + x) * 4;
        var dr = data[i] - bg[0], dg = data[i + 1] - bg[1], db = data[i + 2] - bg[2];
        if (Math.sqrt(dr * dr + dg * dg + db * db) > THRESH) {
          if (x < minX) minX = x; if (x > maxX) maxX = x;
          if (y < minY) minY = y; if (y > maxY) maxY = y;
          found = true;
        }
      }
    }
    if (!found || (maxX - minX) < w * 0.15 || (maxY - minY) < h * 0.12) return null; // détection peu fiable
    return { x: minX, y: minY, w: (maxX - minX), h: (maxY - minY) };
  }

  /* Applique le fond choisi sur le canevas de sortie. */
  function paintBackground(ctx, bg, customImg) {
    if (bg === 'transparent') { ctx.clearRect(0, 0, OUT_W, OUT_H); return; }
    if (bg === 'custom' && customImg) {
      // Couvre tout le canevas en conservant le ratio (cover)
      var r = Math.max(OUT_W / customImg.width, OUT_H / customImg.height);
      var cw = customImg.width * r, ch = customImg.height * r;
      ctx.drawImage(customImg, (OUT_W - cw) / 2, (OUT_H - ch) / 2, cw, ch);
      return;
    }
    ctx.fillStyle = (bg === 'black') ? '#0A0A0A' : '#FFFFFF';
    ctx.fillRect(0, 0, OUT_W, OUT_H);
  }

  /* Traitement principal.
     opts = { background: 'white'|'black'|'transparent'|'custom',
              customBackground: dataURL (si background==='custom') }
     Renvoie une promesse → dataURL (image/png ou image/jpeg). */
  function process(input, opts) {
    opts = opts || {};
    var bg = opts.background || 'white';
    var srcPromise = (typeof input === 'string') ? Promise.resolve(input) : fileToDataURL(input);

    return srcPromise.then(loadImage).then(function (img) {
      var iw = img.naturalWidth || img.width, ih = img.naturalHeight || img.height;
      if (!iw || !ih) throw new Error('Dimensions invalides');

      // 1) Canevas d'analyse à taille raisonnable (perf)
      var aScale = Math.min(1, 1000 / Math.max(iw, ih));
      var aw = Math.round(iw * aScale), ah = Math.round(ih * aScale);
      var ac = document.createElement('canvas'); ac.width = aw; ac.height = ah;
      var actx = ac.getContext('2d');
      actx.drawImage(img, 0, 0, aw, ah);

      // 2) Détection de la voiture (sur le canevas d'analyse)
      var b = detectBounds(actx, aw, ah);
      var crop;
      if (b) {
        // Reconvertir vers les coordonnées de l'image d'origine
        crop = { x: b.x / aScale, y: b.y / aScale, w: b.w / aScale, h: b.h / aScale };
        // petite dilatation pour ne pas couper la carrosserie
        var padX = crop.w * 0.04, padY = crop.h * 0.04;
        crop.x = Math.max(0, crop.x - padX); crop.y = Math.max(0, crop.y - padY);
        crop.w = Math.min(iw - crop.x, crop.w + 2 * padX);
        crop.h = Math.min(ih - crop.y, crop.h + 2 * padY);
      } else {
        // Détection peu fiable → on garde l'image entière (toujours centrée/redim.)
        crop = { x: 0, y: 0, w: iw, h: ih };
      }

      // 3) Canevas de sortie uniforme + fond choisi
      var out = document.createElement('canvas'); out.width = OUT_W; out.height = OUT_H;
      var octx = out.getContext('2d');
      octx.imageSmoothingEnabled = true; octx.imageSmoothingQuality = 'high';

      var customPromise = (bg === 'custom' && opts.customBackground)
        ? loadImage(opts.customBackground).catch(function () { return null; })
        : Promise.resolve(null);

      return customPromise.then(function (customImg) {
        paintBackground(octx, bg, customImg);

        // 4) Redimensionner la voiture dans la zone utile avec marge
        var availW = OUT_W * (1 - 2 * MARGIN_RATIO);
        var availH = OUT_H * (1 - 2 * MARGIN_RATIO);
        var scale = Math.min(availW / crop.w, availH / crop.h);
        var dw = crop.w * scale, dh = crop.h * scale;
        var dx = (OUT_W - dw) / 2, dy = (OUT_H - dh) / 2;
        octx.drawImage(img, crop.x, crop.y, crop.w, crop.h, dx, dy, dw, dh);

        // 5) Export : PNG si transparent (préserve l'alpha), sinon JPEG (léger)
        if (bg === 'transparent') return out.toDataURL('image/png');
        return out.toDataURL('image/jpeg', 0.95);
      });
    });
  }

  window.ASLPhoto = { process: process };
})();
