/* ============================================================
   ALL STAR LOC — MODULE SOUS-LOCATION
   Suivi des sous-locations (personnes/agences à qui des voitures
   sont confiées) : véhicules, clients finaux, montants dus, payés,
   impayés. Totalement indépendant des clients classiques.
   Stockage : asl_subleases_v1
   Liaison : chaque réservation/location liée porte subleaseId +
   finalClient (le client final). Synchro caisse/grand livre via le
   même mécanisme de paiements (paid/amount).
   ============================================================ */
(function () {
  'use strict';

  var KEY = 'asl_subleases_v1';

  function rd(k, def) { try { var v = JSON.parse(localStorage.getItem(k)); return v == null ? def : v; } catch (e) { return def; } }
  function wr(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} }
  function money(n) { n = Math.round(Number(n) || 0); return n.toLocaleString('fr-FR').replace(/\u202f/g, ' ') + ' MAD'; }

  function getSubleases() { return rd(KEY, []); }
  function saveSubleases(list) {
    wr(KEY, list);
    try { if (typeof ASLDB !== 'undefined' && ASLDB.syncNow) ASLDB.syncNow(); } catch (e) {}
  }

  function reservations() { try { return (ASLDB.getReservations && ASLDB.getReservations()) || []; } catch (e) { return []; } }

  /* Réservations/locations liées à une sous-location. */
  function linkedRes(subId) {
    return reservations().filter(function (r) { return r.subleaseId === subId && r.status !== 'cancelled'; });
  }

  /* Totaux d'une sous-location (facturé / payé / restant + nb). */
  function subStats(subId) {
    var list = linkedRes(subId);
    var total = 0, paid = 0;
    list.forEach(function (r) { total += Number(r.amount) || 0; paid += Number(r.paid) || 0; });
    return { count: list.length, total: total, paid: paid, rest: Math.max(0, total - paid) };
  }

  window.ASLSublease = {
    KEY: KEY,
    list: getSubleases,
    money: money,
    linkedRes: linkedRes,
    stats: subStats,

    get: function (id) { return getSubleases().filter(function (s) { return s.id === id; })[0] || null; },

    create: function (data) {
      var list = getSubleases();
      var s = {
        id: 'sub' + Date.now(),
        name: (data.name || '').trim(),
        phone: (data.phone || '').trim(),
        whatsapp: (data.whatsapp || '').trim(),
        address: (data.address || '').trim(),
        notes: (data.notes || '').trim(),
        createdAt: new Date().toISOString()
      };
      if (!s.name) return { error: 'Le nom est obligatoire.' };
      list.push(s);
      saveSubleases(list);
      return { sub: s };
    },

    update: function (id, patch) {
      var list = getSubleases();
      var s = list.filter(function (x) { return x.id === id; })[0];
      if (!s) return null;
      ['name', 'phone', 'whatsapp', 'address', 'notes'].forEach(function (f) {
        if (patch[f] != null) s[f] = patch[f];
      });
      saveSubleases(list);
      return s;
    },

    remove: function (id) {
      saveSubleases(getSubleases().filter(function (x) { return x.id !== id; }));
    },

    options: function (selectedId) {
      return '<option value="">— Choisir une sous-location —</option>' +
        getSubleases().map(function (s) {
          return '<option value="' + s.id + '"' + (selectedId === s.id ? ' selected' : '') + '>' + esc(s.name) + '</option>';
        }).join('');
    }
  };

  function esc(s) { return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }
})();
