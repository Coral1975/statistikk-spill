
(function (root) {
  'use strict';
  function key(type, round) { return type + '|' + round; }
  /* ¿queda la ayuda gratis de este tipo en esta ronda? */
  function freeAvailable(cfg, type, round, used) {
    var t = cfg.types[type];
    return !!(t && t.freePerRound && !(used && used[key(type, round)]));
  }
  /* Precio efectivo ahora: { cost, free, why } */
  function price(cfg, type, round, used, flags) {
    var t = cfg.types[type];
    if (!t) return { cost: 0, free: true, why: 'unknown' };
    if (t.freeAfterSubmit && flags && flags.submitted) return { cost: 0, free: true, why: 'afterSubmit' };
    if (freeAvailable(cfg, type, round, used)) return { cost: 0, free: true, why: 'perRound' };
    return { cost: t.cost, free: t.cost === 0, why: 'paid' };
  }
  function markFree(used, type, round) { used[key(type, round)] = true; return used; }
  /* Mapa de gratis usadas a partir de un registro [{type, ctx, free}] con la función ronda(ctx). */
  function usedFromLog(log, roundFn) {
    var u = {};
    (log || []).forEach(function (e) { if (e && e.free && e.cost === 0) u[key(e.type, roundFn(e.ctx))] = true; });
    return u;
  }
  
  var GAIN = {
    '6C': { hint: 0, konsulent: 31.1, fasit: 0, modell: 0 },
    '10A': { hint: 0, konsulent: 31, linje: 5, femti: 5, fasit: 15, mal: 0, modell: 0 }
  };
  /* Devuelve la lista de ayudas que incumplen «precio >= ganancia máxima» (vacía = correcto).
     Se evalúa el precio de pago (sin la gratis por ronda) salvo en las ayudas cuya ganancia es 0. */
  function nonProfitViolations(game, cfg) {
    var out = [];
    Object.keys(GAIN[game]).forEach(function (type) {
      var t = cfg.types[type];
      if (!t) { out.push({ type: type, why: 'falta en la configuración' }); return; }
      if (t.cost < GAIN[game][type]) out.push({ type: type, cost: t.cost, gain: GAIN[game][type] });
    });
    return out;
  }
  var api = { freeAvailable: freeAvailable, price: price, markFree: markFree, usedFromLog: usedFromLog, GAIN: GAIN, nonProfitViolations: nonProfitViolations };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  root.Help = api;
})(typeof window !== 'undefined' ? window : globalThis);
