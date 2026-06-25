/* ============================================================
   ALL STAR LOC — Location Longue Durée (LLD)
   ------------------------------------------------------------
   Module autonome (même esprit que Sous-location). Stockage :
   asl_lld_v1, synchronisé serveur via le mécanisme misc existant.
   Un contrat LLD : client + véhicule + date de début + durée
   (mois) + montant mensuel + suivi des paiements mois par mois.
   Quand un véhicule est en LLD active, il est masqué du site
   client et non réservable (via son statut 'lld').
   ============================================================ */
(function () {
  'use strict';

  var KEY = 'asl_lld_v1';

  function rd() { try { return JSON.parse(localStorage.getItem(KEY) || '[]'); } catch (e) { return []; } }
  function wr(list) {
    try { localStorage.setItem(KEY, JSON.stringify(list)); } catch (e) {}
    try { if (typeof ASLDB !== 'undefined' && ASLDB.noteLocalChange) ASLDB.noteLocalChange(KEY); } catch (e) {}
    try { if (typeof ASLDB !== 'undefined' && ASLDB.syncNow) ASLDB.syncNow(); } catch (e) {}
  }

  function list() { return rd(); }
  function get(id) { return rd().filter(function (c) { return c.id === id; })[0] || null; }

  function add(obj) {
    var l = rd();
    obj.id = 'lld_' + Date.now();
    obj.createdAt = new Date().toISOString();
    obj.payments = obj.payments || [];
    l.push(obj);
    wr(l);
    return obj;
  }
  function update(id, patch) {
    var l = rd();
    var c = l.filter(function (x) { return x.id === id; })[0];
    if (c) { Object.keys(patch).forEach(function (k) { c[k] = patch[k]; }); wr(l); }
    return c;
  }
  function remove(id) {
    wr(rd().filter(function (x) { return x.id !== id; }));
  }

  /* Échéancier mois par mois calculé à partir de la date de début,
     de la durée et du montant mensuel. Statut de chaque mois selon
     les paiements enregistrés. */
  function schedule(contract) {
    var months = [];
    if (!contract || !contract.startDate) return months;
    var start = new Date(contract.startDate);
    var n = Number(contract.durationMonths) || 0;
    var monthly = Number(contract.monthlyAmount) || 0;
    var paid = {};
    (contract.payments || []).forEach(function (p) { paid[p.monthIndex] = (paid[p.monthIndex] || 0) + (Number(p.amount) || 0); });
    for (var i = 0; i < n; i++) {
      var d = new Date(start.getFullYear(), start.getMonth() + i, start.getDate());
      var due = monthly;
      var got = paid[i] || 0;
      months.push({
        index: i,
        date: d.toISOString().slice(0, 10),
        label: d.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' }),
        due: due,
        paid: got,
        rest: Math.max(0, due - got),
        status: got >= due ? 'paid' : (got > 0 ? 'partial' : 'pending')
      });
    }
    return months;
  }
  function totals(contract) {
    var sch = schedule(contract);
    var totalDue = sch.reduce(function (s, m) { return s + m.due; }, 0);
    var totalPaid = sch.reduce(function (s, m) { return s + m.paid; }, 0);
    return { totalDue: totalDue, totalPaid: totalPaid, rest: Math.max(0, totalDue - totalPaid), months: sch };
  }

  window.ASLLLD = {
    KEY: KEY,
    list: list, get: get, add: add, update: update, remove: remove,
    schedule: schedule, totals: totals
  };
})();
