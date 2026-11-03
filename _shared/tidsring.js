/* Tidsring uten tall (delt). TidsRing.html(t0, målMin) gir markup; TidsRing.tick(t0, målMin, sumMin) oppdaterer ring, aria-tekst og «Gå til oppsummering»-knappen.
   Ingen tall vises: bare ordene i aria-label. */
(function (root) {
  'use strict';
  var R = 11, LEN = 2 * Math.PI * R;
  function frac(t0, mal) { return t0 ? Math.max(0, Math.min(1.2, (Date.now() - t0) / (mal * 60000))) : 0; }
  function ord(f) { return f < 0.15 ? 'Tidsring: dere er i gang' : f < 0.6 ? 'Tidsring: dere har god tid' : f < 0.85 ? 'Tidsring: det meste av tiden er brukt, men det er litt igjen' : f < 1 ? 'Tidsring: mot slutten av tiden' : 'Tidsring: tiden er brukt opp'; }
  function html(t0, mal) {
    var f = frac(t0, mal);
    return '<span class="tidsring' + (f >= 0.85 ? ' is-late' : '') + '" id="tidsring" role="img" aria-label="' + ord(f) + '"><svg viewBox="0 0 28 28" aria-hidden="true"><circle class="bg" cx="14" cy="14" r="' + R + '"/><circle class="fg" cx="14" cy="14" r="' + R + '" stroke-dasharray="' + LEN.toFixed(1) + '" stroke-dashoffset="' + (LEN * (1 - Math.min(1, f))).toFixed(1) + '"/></svg><span class="small" aria-hidden="true">Tid</span></span>';
  }
  function tick(t0, mal, sumMin) {
    var el = document.getElementById('tidsring'); if (!el) return false;
    var f = frac(t0, mal), fg = el.querySelector('.fg');
    el.setAttribute('aria-label', ord(f)); el.classList.toggle('is-late', f >= 0.85);
    if (fg) fg.setAttribute('stroke-dashoffset', (LEN * (1 - Math.min(1, f))).toFixed(1));
    var b = document.getElementById('toSummaryBtn');
    if (b) b.hidden = !(t0 && (Date.now() - t0) >= sumMin * 60000);
    return true;
  }
  root.TidsRing = { html: html, tick: tick, frac: frac };
})(typeof window !== 'undefined' ? window : this);
