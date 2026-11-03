/* Estadistica minima para Treningslaben AS: t de Student (2 muestras, varianzas agrupadas),
   IC95 %, d de Cohen, PRNG con semilla y simulacion. Sin dependencias. */
(function (root) {
  'use strict';

  // ---- funciones especiales ----
  function logGamma(x) {
    const c = [76.18009172947146, -86.50532032941677, 24.01409824083091,
      -1.231739572450155, 0.1208650973866179e-2, -0.5395239384953e-5];
    let y = x, tmp = x + 5.5;
    tmp -= (x + 0.5) * Math.log(tmp);
    let ser = 1.000000000190015;
    for (let j = 0; j < 6; j++) ser += c[j] / ++y;
    return -tmp + Math.log(2.5066282746310005 * ser / x);
  }
  function betacf(a, b, x) {
    const MAXIT = 300, EPS = 3e-14, FPMIN = 1e-300;
    let qab = a + b, qap = a + 1, qam = a - 1, c = 1, d = 1 - qab * x / qap;
    if (Math.abs(d) < FPMIN) d = FPMIN;
    d = 1 / d;
    let h = d;
    for (let m = 1; m <= MAXIT; m++) {
      const m2 = 2 * m;
      let aa = m * (b - m) * x / ((qam + m2) * (a + m2));
      d = 1 + aa * d; if (Math.abs(d) < FPMIN) d = FPMIN;
      c = 1 + aa / c; if (Math.abs(c) < FPMIN) c = FPMIN;
      d = 1 / d; h *= d * c;
      aa = -(a + m) * (qab + m) * x / ((a + m2) * (qap + m2));
      d = 1 + aa * d; if (Math.abs(d) < FPMIN) d = FPMIN;
      c = 1 + aa / c; if (Math.abs(c) < FPMIN) c = FPMIN;
      d = 1 / d;
      const del = d * c;
      h *= del;
      if (Math.abs(del - 1) < EPS) break;
    }
    return h;
  }
  // Beta incompleta regularizada I_x(a,b)
  function ibeta(x, a, b) {
    if (x <= 0) return 0;
    if (x >= 1) return 1;
    const bt = Math.exp(logGamma(a + b) - logGamma(a) - logGamma(b) + a * Math.log(x) + b * Math.log(1 - x));
    if (x < (a + 1) / (a + b + 2)) return bt * betacf(a, b, x) / a;
    return 1 - bt * betacf(b, a, 1 - x) / b;
  }
  // p bilateral de t con df grados de libertad
  function pTwoSided(t, df) { return ibeta(df / (df + t * t), df / 2, 0.5); }
  // valor critico t tal que P(|T| > tc) = alpha
  function tCrit(alpha, df) {
    let lo = 0, hi = 50;
    for (let i = 0; i < 80; i++) {
      const mid = (lo + hi) / 2;
      if (pTwoSided(mid, df) > alpha) lo = mid; else hi = mid;
    }
    return (lo + hi) / 2;
  }

  // ---- t de Student para dos grupos independientes ----
  function mean(a) { let s = 0; for (const v of a) s += v; return s / a.length; }
  function sd(a) { const m = mean(a); let s = 0; for (const v of a) s += (v - m) * (v - m); return Math.sqrt(s / (a.length - 1)); }

  // control = Kontroll, program = Program. diff = Program - Kontroll (positivo = forbedring)
  function ttest(control, program) {
    const n1 = control.length, n2 = program.length;
    const m1 = mean(control), m2 = mean(program), s1 = sd(control), s2 = sd(program);
    const df = n1 + n2 - 2;
    const sp = Math.sqrt(((n1 - 1) * s1 * s1 + (n2 - 1) * s2 * s2) / df);
    const diff = m2 - m1;
    const se = sp * Math.sqrt(1 / n1 + 1 / n2);
    const t = diff / se;
    const p = pTwoSided(t, df);
    const tc = tCrit(0.05, df);
    return { n1, n2, df, m1, m2, s1, s2, sp, diff, se, t, p, d: diff / sp,
      lo: diff - tc * se, hi: diff + tc * se };
  }

  // ---- PRNG con semilla ----
  function mulberry32(seed) {
    let a = seed >>> 0;
    return function () {
      a = (a + 0x6D2B79F5) >>> 0;
      let t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  function makeNormal(rand) {
    let spare = null;
    return function () {
      if (spare !== null) { const s = spare; spare = null; return s; }
      let u = 0, v = 0;
      while (u === 0) u = rand();
      v = rand();
      const r = Math.sqrt(-2 * Math.log(u));
      spare = r * Math.sin(2 * Math.PI * v);
      return r * Math.cos(2 * Math.PI * v);
    };
  }

  // ---- simulacion de N estudios (para el "reveal" de largo plazo) ----
  // Devuelve flags de significancia bilateral (|t| > tcrit) y de "innfor" (t>0 y significativo).
  function simulate(reps, n, d, alpha, seed) {
    const norm = makeNormal(mulberry32(seed));
    const tc = tCrit(alpha, 2 * n - 2);
    const sig = new Uint8Array(reps), adopt = new Uint8Array(reps);
    let nSig = 0, nAdopt = 0;
    for (let r = 0; r < reps; r++) {
      let s1 = 0, q1 = 0, s2 = 0, q2 = 0;
      for (let i = 0; i < n; i++) { const x = norm(); s1 += x; q1 += x * x; }
      for (let i = 0; i < n; i++) { const x = d + norm(); s2 += x; q2 += x * x; }
      const m1 = s1 / n, m2 = s2 / n;
      const v1 = (q1 - n * m1 * m1) / (n - 1), v2 = (q2 - n * m2 * m2) / (n - 1);
      const sp = Math.sqrt((v1 + v2) / 2);
      const t = (m2 - m1) / (sp * Math.sqrt(2 / n));
      if (Math.abs(t) > tc) { sig[r] = 1; nSig++; if (t > 0) { adopt[r] = 1; nAdopt++; } }
    }
    return { sig, adopt, nSig, nAdopt, reps };
  }

  const api = { ttest, mean, sd, pTwoSided, tCrit, ibeta, mulberry32, makeNormal, simulate };
  if (typeof module !== 'undefined' && module.exports) module.exports = api; else root.TLStats = api;
})(typeof window !== 'undefined' ? window : globalThis);
