
(function (root) {
  'use strict';
  function compute(inp) {
    var game = Math.round(inp.game || 0), by = {}, pts = {}, n = 0, sum = 0, free = 0;
    var bt = (inp.help && inp.help.byType) || {};
    Object.keys(bt).forEach(function (t) {
      var e = bt[t] || {};
      by[t] = e.n || 0; pts[t] = e.sum || 0; n += e.n || 0; sum += e.sum || 0; free += e.free || 0;
    });
    var freeLeft = Math.max(0, (inp.freeUses || 0) - free);
    var deducted = Math.min(sum, Math.max(0, game)), final = Math.max(0, game - sum);
    return { game: game, help: { by: by, pts: pts, n: n, sum: sum, free: free, freeLeft: freeLeft }, deducted: deducted, final: final,
      clamped: sum > deducted, eq: { round: game, help: deducted, final: final } };
  }
  /* Tres estados: oppnadd (have >= need), nesten (le falta 1 y ya tiene algo), ikke. */
  function state(have, need, ok) {
    var done = ok != null ? !!ok : have >= need;
    return { state: done ? 'oppnadd' : (need > 1 && have >= need - 1 && have > 0 ? 'nesten' : 'ikke'), have: have, need: need };
  }
  var states = { ikke: 'Ikke ennå', nesten: 'Nesten', oppnadd: 'Oppnådd' };
  var api = { compute: compute, state: state, states: states };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  root.Score = api;
})(typeof window !== 'undefined' ? window : globalThis);
