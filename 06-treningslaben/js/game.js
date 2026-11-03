
(function () {
  'use strict';
  const C = window.TL_CONFIG, D = window.TL_DATA, S = window.TLStats, T = window.TL_T, A = window.Alias, LK = window.TLLock, Sc = window.Score, Rp = window.Rapport;     // A = _shared/alias.js (unico modulo del alias)
  const app = document.getElementById('app');
  const PROP = {}; D.forslag.forEach(f => { PROP[f.id] = f; });
  const REGPROP = { id: 'REG', navn: 'Intervallprogram (nasjonalt register)', kontekst: 'Registerdata, utholdenhetsutøvere',
    maal: 'Forbedring i VO2maks', enhet: C.registry.enhet, sd: C.registry.sigma, kost: 0 };

  /* ---------- hemmeligheter (ofuscert, se js/lock.js og README) ---------- */
  let secCache = null;
  function sec() { return secCache || (secCache = JSON.parse(LK.dec(window.TL_SEC.blob))); }
  const truth = fid => sec().sann[fid];
  const rightAns = (key, idx) => idx != null && LK.h(key + '|' + idx) === window.TL_SEC.ans[key];

  /* ---------- hjelpefunksjoner ---------- */
  const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const MINUS = '−';
  function fmt(x, dp) { const s = Math.abs(x).toFixed(dp).replace('.', ','); return (x < 0 && Number(s.replace(',', '.')) !== 0 ? MINUS : '') + s; }
  // Texto del REPORTE (formato del libro): PUNTO decimal, minus tipografico. La interfaz (tablas tipo Jamovi) sigue con coma con fmt().
  function fmtT(x, dp) { const s = Math.abs(x).toFixed(dp); return (x < 0 && Number(s) !== 0 ? MINUS : '') + s; }
  const minusN = n => (n > 0 ? MINUS : '') + fmt(n, 0);   // «−12» o «0»; nunca «−0»
  function dpFor(prop) { return prop.sd >= 15 ? 1 : (prop.sd >= 0.5 ? 2 : 3); }
  function pStr(p) { return p < 0.001 ? 'p < .001' : 'p = .' + p.toFixed(3).slice(2); }
  function pnum(p) { return p < 0.001 ? '< .001' : '.' + p.toFixed(3).slice(2); }
  function parseNum(str) {
    let s = String(str == null ? '' : str).trim().replace(/[−–‒]/g, '-').replace(',', '.');
    if (!s) return null;
    let lt = false;
    if (s[0] === '<') { lt = true; s = s.slice(1).trim(); }
    if (!/^-?\d*\.?\d+$/.test(s)) return null;
    return { v: parseFloat(s), lt };
  }
  const wc = s => String(s || '').trim().split(/\s+/).filter(Boolean).length;
  const pick = (arr, i) => arr[i % arr.length];
  function clone(o) { return JSON.parse(JSON.stringify(o)); }

  /* ---------- tilstand ---------- */
  function newRound() { return { design: { n: 20, a: 0.05 }, locked: false, just: '', cons: false, dec: null, conf: null, quiz: null, quizConf: null, done: false }; }
  function newState() {
    const saved = A.load();
    return { v: 1, alias: saved.alias, motto: saved.motto, size: 5, lag: 1, set: 'A', pred: '',
      view: 'howto', mode: 'kjerne', extra: {}, t0: null, ff: { sel: {}, checked: false }, help: { log: [], got: {} }, pulse: false, r: 0, ph: 'brief', rounds: [0, 1, 2, 3, 4].map(newRound), dir: { a: [null, null, null], c: [null, null, null] },
      ent: {}, rep: { text: '', best: 0, last: null, model: false, first: null, tries: 0, retryOk: false, done: false, skipped: false }, rot: { 1: false, 2: false, 3: false, 4: false }, ticket: {}, prior: null,
      seed: Math.floor(Math.random() * 2147483647) + 1, sent: false, date: new Date().toISOString().slice(0, 10) };
  }
  /* Validacion del estado guardado: un JSON manipulado, truncado o de otra version NO debe tumbar el juego (se descarta y se empieza de cero). */
  const VIEWS = ['howto', 'intro', 'roles', 'practice', 'round', 'report', 'long', 'debrief', 'card'], PHASES = ['brief', 'dirq', 'design', 'study', 'decide', 'reveal'];
  const isObj = o => !!o && typeof o === 'object' && !Array.isArray(o);
  function validState(s) {
    try {
      if (!isObj(s) || s.v !== 1) return false;
      if (VIEWS.indexOf(s.view) < 0 || PHASES.indexOf(s.ph) < 0) return false;
      if (!Number.isInteger(s.r) || s.r < 0 || s.r > 4 || !Number.isInteger(s.lag) || s.lag < 1 || s.lag > 8) return false;
      if (s.set !== 'A' && s.set !== 'B') return false;
      if (s.size !== 5 && s.size !== 6) return false;
      if (typeof s.alias !== 'string' || typeof s.motto !== 'string' || !(s.pred == null || typeof s.pred === 'string' || typeof s.pred === 'number')) return false;
      if (!Array.isArray(s.rounds) || s.rounds.length !== 5) return false;
      if (!s.rounds.every(r => isObj(r) && isObj(r.design) && C.nLevels.indexOf(r.design.n) >= 0 && C.alphaLevels.indexOf(r.design.a) >= 0 && typeof r.just === 'string')) return false;
      if (!isObj(s.help) || !Array.isArray(s.help.log) || !isObj(s.help.got)) return false;
      if (!s.help.log.every(e => isObj(e) && typeof e.type === 'string' && C.help.types[e.type] && Number.isFinite(e.cost) && e.cost >= 0)) return false;
      if (!isObj(s.dir) || !Array.isArray(s.dir.a) || s.dir.a.length !== 3 || !Array.isArray(s.dir.c) || s.dir.c.length !== 3) return false;
      if (!isObj(s.ent) || !isObj(s.rep) || typeof s.rep.text !== 'string' || !Number.isFinite(s.rep.best) || !isObj(s.rot) || !isObj(s.ticket)) return false;
      if (!(s.mode == null || s.mode === 'kjerne' || s.mode === 'full') || !(s.extra == null || isObj(s.extra))) return false;
      if (!Number.isFinite(s.seed)) return false;
      return true;
    } catch (e) { return false; }
  }
  function loadState() {
    try { const j = localStorage.getItem(C.storageKey); if (j) { const s = JSON.parse(j); if (isObj(s) && s.v === 1) { s.help = s.help || { log: [], got: {} }; if (!s.seed) s.seed = Math.floor(Math.random() * 2147483647) + 1; if (validState(s)) return s; } } } catch (e) { /* ingen lagring */ }
    return null;
  }
  let st = loadState() || newState();
  /* ---------- modo Kjerne / Ekstra (lote 2A-2) ---------- */
  const MD = C.mode;
  const modeOf = () => st.mode || 'full';                       // estados antiguos (sin modo) = partida completa
  const inPlay = i => MD.core.includes(i) || modeOf() === 'full' || !!(st.extra && st.extra[i]);
  const isExtraRd = i => MD.extra.includes(i);
  const playList = () => [0, 1, 2, 3, 4].filter(inPlay);
  const seqNo = i => playList().indexOf(i) + 1;
  const coreNo = i => MD.core.filter(inPlay).indexOf(i) + 1;
  const roundLabel = i => isExtraRd(i) ? T.extraWord + ' ' + (i === MD.extra[0] ? 'A' : 'B') : T.roundWord + ' ' + coreNo(i);
  const nextInPlay = i => { for (let k = i + 1; k <= 4; k++) if (inPlay(k)) return k; return -1; };
  function save() { try { localStorage.setItem(C.storageKey, JSON.stringify(st)); } catch (e) { /* ok */ } }
  function loadBest() { try { const b = JSON.parse(localStorage.getItem(C.bestKey)); return b && typeof b.stars === 'number' ? b : null; } catch (e) { return null; } }
  function saveBest(n) { try { const b = loadBest(); if (!b || n > b.stars) localStorage.setItem(C.bestKey, JSON.stringify({ stars: n, date: st.date })); } catch (e) { /* ok */ } }
  /* Orden de opciones: permutacion determinista por sesion (st.seed) y pregunta (key). El valor guardado
     sigue siendo el indice ORIGINAL de la opcion, asi que las claves ofuscadas (secrets.js) no cambian. */
  function optOrder(key, n) {
    const r = S.mulberry32((st.seed ^ parseInt(LK.h('ord|' + key), 36)) >>> 0), a = [];
    for (let i = 0; i < n; i++) a.push(i);
    for (let i = n - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); const t = a[i]; a[i] = a[j]; a[j] = t; }
    return a;
  }
  const LETTERS = 'abcdefgh';
  function shuffledOpts(key, opts, name, bind, cur) {
    return optOrder(key, opts.length).map((v, pos) => '<label class="opt block"><input type="radio" name="' + name + '" data-bind="' + bind + '" data-num value="' + v + '"' + (cur === v ? ' checked' : '') + '> <span class="optl">' + LETTERS[pos] + ')</span> ' + opts[v] + '</label>').join('');
  }
  function correctLetter(key, order) {
    for (const v of order) if (rightAns(key, v)) return LETTERS[order.indexOf(v)];
    return '?';
  }
  const plan = () => C.sets[st.set].runder;

  /* ---------- data og beregninger ---------- */
  let regCache = null;
  function regStudy() {
    if (regCache) return regCache;
    const R = C.registry, nr = S.makeNormal(S.mulberry32(R.seed)), r2 = x => Math.round(x * 100) / 100;
    const k = [], p = [];
    for (let i = 0; i < R.n; i++) k.push(r2(R.muKontroll + R.sigma * nr()));
    for (let i = 0; i < R.n; i++) p.push(r2(R.muKontroll + sec().regd * R.sigma + R.sigma * nr()));
    regCache = { k, p, tt: S.ttest(k, p), prop: REGPROP, truthD: sec().regd, isNull: false, n: R.n };
    return regCache;
  }
  const cache = {};
  function makeStudy(fid, lag, n) {
    const key = fid + '|' + lag + '|' + n;
    if (cache[key]) return cache[key];
    const raw = D.raw[String(lag)][fid];
    const k = raw[0].slice(0, n), p = raw[1].slice(0, n);
    return (cache[key] = { k, p, tt: S.ttest(k, p), prop: PROP[fid], truthD: truth(fid), isNull: truth(fid) === 0, n, fid });
  }
  function studyFor(i) {
    const f = plan()[i];
    return f === 'REG' ? regStudy() : makeStudy(f, st.lag, st.rounds[i].design.n);
  }
  const practiceStudy = () => makeStudy(C.practice.forslag, C.practice.lag, C.practice.n);
  const reportStudy = () => studyFor(C.sets[st.set].rapport.fraRunde);                     // lote 2E: estudio de la ronda 2 del grupo, con el n que eligio
  function powerOf(d, n, a, which) { const x = D.power.find(r => r.d === d && r.n === n && r.a === a); return x ? x[which || 'two'] : null; }

  function decide(study, a, dec) {
    const tt = study.tt, sig = tt.p < a && tt.diff > 0;
    return { rule: sig, sigTwo: tt.p < a };
  }
  function outcomeOf(study, dec) {
    const real = !study.isNull;
    if (dec === 'in') return real ? 'riktigInnf' : 'type1';
    return real ? 'type2' : 'riktigAvvist';
  }
  function payoff(study, dec, n) {
    const P = D.pagos, cost = 2 * n * P.kostnad_per_deltaker; let gain = 0;
    if (dec === 'in') gain = study.isNull ? P.tap_falsk_innforing : P.gevinst_ekte[String(study.truthD)];
    else gain = study.isNull ? P.gevinst_riktig_avvisning : P.avvist_ekte;
    return { gain, cost, net: gain - cost };
  }
  const isCorrect = (study, dec) => (dec === 'in') === !study.isNull;
  const BANK_ROUNDS = [0, 1, 2, 4];
  function budget() {
    let run = C.score.startPoeng + D.pagos.startkapital; const out = {}; let reserved = 0;
    for (const i of BANK_ROUNDS) {
      const R = st.rounds[i];
      if (R.locked && !R.done) reserved += 2 * R.design.n * D.pagos.kostnad_per_deltaker;     // lote 2B: el coste del estudio se reserva al fijar el diseño
      if (!R.done) continue;
      const pay = payoff(studyFor(i), R.dec, R.design.n);
      run += pay.net; let rescued = false;
      if (run < C.score.floor) { run = C.score.floor; rescued = true; }
      out[i] = { pay, run, rescued };
    }
    return { per: out, total: run, reserved };
  }

  /* ---------- sjekk av Jamovi-tall ---------- */
  function near(v, x, kind, dec) {
    const tol = C.tol;
    if (kind === 'x' && dec != null && Math.abs(v - x) <= 0.5 * Math.pow(10, -Math.max(1, dec)) + 1e-9) return true;   // lote 2B: 0,13 vale como 0,134 (redondeo mostrado)
    if (kind === 'p') return Math.abs(v - x) <= tol.p;
    if (kind === 't') return Math.abs(v - x) <= tol.t;
    if (kind === 'd') return Math.abs(v - x) <= tol.d;
    return Math.abs(v - x) <= Math.max(tol.rel * Math.abs(x), tol.absMin);
  }
  /* Campos que se piden en cada entrada (lote 2B): R2 = 4 (Δ, p, KI nedre/øvre), R4 = 3 (Δ, p, d), øvelse = 6. t, df y d no pedidos se muestran como "Fra Jamovi". */
  const ENTRY_FIELDS = { r1: ['diff', 'p', 'lo', 'hi'], r3: ['diff', 'p', 'd'] };
  const fieldsFor = key => ENTRY_FIELDS[key] || ['diff', 't', 'p', 'd', 'lo', 'hi'];
  const decimalsOf = raw => { const m = /[.,](\d+)\s*$/.exec(String(raw).trim()); return m ? m[1].length : 0; };
  function checkEntry(key, tt) {
    const e = st.ent[key] || {}, f = {}, bad = [], F = fieldsFor(key), dc = {}; let anyEmpty = false;
    F.forEach(k => {
      const raw = String(e[k] == null ? '' : e[k]).trim(); f[k] = parseNum(raw); dc[k] = decimalsOf(raw);
      if (!raw) anyEmpty = true; else if (!f[k]) bad.push(k);          // escrito pero no es un numero: «+0,932», «9.32e-1», «abc», «1.000,5»...
    });
    if (bad.length) return { invalid: true, bad };                      // «Ugyldig tall» (distinto de «Fyll inn alle feltene»)
    if (anyEmpty) return { empty: true };
    const m = {}, N = {}, Fl = {};
    const tr = { diff: [tt.diff, -tt.diff, 'x'], t: [tt.t, -tt.t, 't'], d: [tt.d, -tt.d, 'd'], lo: [tt.lo, -tt.hi, 'x'], hi: [tt.hi, -tt.lo, 'x'] };
    F.forEach(k => {
      if (k === 'p') { m.p = tt.p < 0.001 ? (f.p.v > 0 && f.p.v <= 0.001) : (!f.p.lt && near(f.p.v, tt.p, 'p')); return; }
      N[k] = near(f[k].v, tr[k][0], tr[k][2], dc[k]); Fl[k] = near(f[k].v, tr[k][1], tr[k][2], dc[k]); m[k] = N[k] || Fl[k];
    });
    const normal = Object.keys(N).every(k => N[k]), flip = Object.keys(Fl).every(k => Fl[k]);
    const all = (m.p == null || m.p) && (normal || flip);
    return { m, ok: all, flip: all && !normal };
  }

  /* ---------- sjekk av rapporttekst: validador comun _shared/rapport.js (fallos duros, avisos de formato, primer envio) ---------- */
  function checkReport(text, study) {
    const r = Rp.check(text, { kind: 'ttest', tt: study.tt, n: study.n, alpha: 0.05, dp: dpFor(study.prop), minOk: C.thresholds.rapporter, tol: C.tol });
    const res = { items: r.items.map(i => ({ id: i.id, state: i.state, msg: i.msg })), hard: r.hard, warn: r.warn.map(w => ({ id: w.id, key: w.key, msg: w.msg })), nOk: r.nOk, star: r.star, medal: r.medal };
    r.items.forEach(i => { res[i.id] = i.state === 'ok'; });          // compat: res.desc, res.test, ... como booleanos
    return res;
  }
  function modelText(study) {
    const tt = study.tt, prop = study.prop, dp = dpFor(prop), n = study.n;
    // Grenser som i boka (Cohens): under 0,2 triviell, 0,2–0,5 liten, 0,5–0,8 middels, fra 0,8 stor. Rapport.check godtar ±0,05 ved grensene og både «middels» og «moderat».
    const ad = Math.abs(tt.d), mag = ad < 0.2 ? 'triviell' : (ad < 0.5 ? 'liten' : (ad < 0.8 ? 'middels' : 'stor'));
    const v = { prop: prop.navn.toLowerCase(), m2: fmtT(tt.m2, dp), sd2: fmtT(tt.s2, dp), n: n, dir: tt.diff >= 0 ? 'høyere' : 'lavere', m1: fmtT(tt.m1, dp), sd1: fmtT(tt.s1, dp),
      diff: fmtT(tt.diff, dp), unit: prop.enhet, df: tt.df, t: fmtT(tt.t, 2), p: pStr(tt.p), lo: fmtT(tt.lo, dp), hi: fmtT(tt.hi, dp), d: fmtT(tt.d, 2), mag: mag, pw: Math.round(powerOf(0.5, n, 0.05, 'two') * 100) };
    v.pwTxt = v.pw < 80 ? T.modelPwLow(v.pw) : T.modelPwHigh(v.pw);
    return (tt.p < 0.05 ? sec().modelSig : sec().model).replace(/\{(\w+)\}/g, (m, k) => String(v[k]));
  }
  /* Lote 2D: hvis malen med hull står igjen foran den utfylte teksten, fjernes malen (kortet viste begge deler etter hverandre). */
  function stripTemplate(text) {
    const t = template(reportStudy()), x = String(text || '');
    return x.indexOf(t) === 0 && x.length > t.length ? x.slice(t.length).replace(/^[\s.]+/, '') : x;
  }
  function template(study) {
    const p = study.prop;
    // Formato del libro: punto decimal, p = .xxx sin cero inicial, «95 % KI [a, b]» con coma entre los extremos.
    return 'Gruppen som fikk «' + p.navn.toLowerCase() + '» (M = __, SD = __, n = __) forbedret seg i gjennomsnitt [mer/mindre] enn kontrollgruppen (M = __, SD = __, n = __); forskjell = __ ' +
      p.enhet + ', t(__) = __, p = __, 95 % KI [__, __], Cohens d = __ (__ effekt). Tolkning: ______';
  }

  /* ---------- oppsummering (stjerner, tillitsnivå, medaljer) ----------
     Alt leses fra registeret i `st` (beslutninger, svar, Jamovi-felt, FØRSTE innlevering av rapporten). Medaljene har skrevet kriterium
     og tre tilstander (Ikke ennå / Nesten / Oppnådd): se T.medalRule. */
  function summary() {
    const velgItems = [];
    [1, 2, 4].forEach(i => { if (inPlay(i)) velgItems.push(wc(st.rounds[i].just) >= 3); });
    if (inPlay(4)) T.dirQs.forEach((q, i) => velgItems.push(rightAns('dir' + i, st.dir.a[i])));
    velgItems.push(rightAns('reg', st.rounds[3].quiz));
    const velg = velgItems.filter(Boolean).length;
    const kj = ['r1', 'r3'].map(k => !!(st.ent[k] && st.ent[k].ok));
    const kjor = kj.filter(Boolean).length;
    const first = st.rep.first, rep = first ? first.nOk : 0;                       // ★ Rapporter og Rapportstjerner: første innlevering
    const stars = { velg: velg >= Math.max(1, Math.ceil(C.thresholds.velg / 6 * velgItems.length - 1e-9)),   // % del modo (4 de 6 = 2/3)
       kjor: kjor >= Math.ceil(C.thresholds.kjor / 3 * kj.length - 1e-9), rapporter: !!(first && first.star) };
    const count = (stars.velg ? 1 : 0) + (stars.kjor ? 1 : 0) + (stars.rapporter ? 1 : 0);
    const conf = [];
    BANK_ROUNDS.forEach(i => { const R = st.rounds[i]; if (R.done) conf.push({ c: R.conf, ok: isCorrect(studyFor(i), R.dec) }); });
    T.dirQs.forEach((q, i) => { if (st.dir.a[i] != null) conf.push({ c: st.dir.c[i], ok: rightAns('dir' + i, st.dir.a[i]) }); });
    if (st.rounds[3].quiz != null) conf.push({ c: st.rounds[3].conf, ok: rightAns('reg', st.rounds[3].quiz) });       // R4: ett enkelt tillitsnivå for begge svar
    const sure = conf.filter(x => x.c === 'helt'), sureOk = sure.filter(x => x.ok).length;
    let ok = 0, tot = 0;
    BANK_ROUNDS.forEach(i => { const R = st.rounds[i]; if (!R.done) return; tot++; if (isCorrect(studyFor(i), R.dec)) ok++; });
    // --- medaljer ---
    const nullRounds = BANK_ROUNDS.filter(i => inPlay(i) && studyFor(i).isNull), nullDone = nullRounds.filter(i => st.rounds[i].done);
    const nullOk = nullDone.filter(i => st.rounds[i].dec === 'out').length;
    const levels = new Set(conf.filter(x => x.c).map(x => x.c)).size, needSure = Math.max(2, Math.ceil(0.75 * sure.length));
    const jamEntries = (st.ent.practice ? ['practice'] : []).concat(['r1', 'r3']).map(k => st.ent[k]), jamOk = jamEntries.filter(e => e && e.ok && !e.shown).length;
    const decFail = BANK_ROUNDS.some((i, k) => { const R = st.rounds[i]; return R.done && !isCorrect(studyFor(i), R.dec) && BANK_ROUNDS.slice(k + 1).some(j => st.rounds[j].done); });
    const decRetry = BANK_ROUNDS.some((i, k) => { const R = st.rounds[i], nx = BANK_ROUNDS.slice(k + 1).find(j => st.rounds[j].done); return R.done && nx != null && !isCorrect(studyFor(i), R.dec) && isCorrect(studyFor(nx), st.rounds[nx].dec); });
    const repFail = !!(first && !first.star);
    const med = {
      felle: Sc.state(nullOk, Math.max(1, nullRounds.length), nullRounds.length > 0 && nullDone.length === nullRounds.length && nullOk === nullRounds.length),
      
      magefolelse: { state: levels >= 2 ? (sure.length >= 2 && sureOk >= needSure ? 'oppnadd' : 'nesten') : 'ikke', have: sureOk, need: needSure },
      rapport: Sc.state(rep, 5, !!(first && first.medal)),
      jamovi: Sc.state(jamOk, jamEntries.length, jamOk >= Math.ceil(0.8 * jamEntries.length)),
      proveigjen: { state: (repFail && st.rep.retryOk) || decRetry ? 'oppnadd' : ((repFail || decFail) ? 'nesten' : 'ikke'), have: (repFail && st.rep.retryOk) || decRetry ? 1 : 0, need: 1 }
    };
    const medals = C.badgesActive.map(k => Object.assign({ key: k }, med[k]));
    const badges = medals.filter(m => m.state === 'oppnadd').map(m => m.key);
    return { velgItems, velg, kj, kjor, rep, stars, count, sure: sure.length, sureOk, ok, tot, medals, badges };
  }

  /* ---------- poeng og hjelp ---------- */
  // ESTADO UNICO: scoreNow() = Score.compute(registro). Lo leen el contador de cabecera, la ficha de la ronda, la tarjeta final, el texto copiado y el POST del marcador.
  function helpInput() {
    const byType = {}; C.help.order.forEach(t => { byType[t] = { n: 0, sum: 0, free: 0 }; });
    st.help.log.forEach(e => { const b = byType[e.type]; if (!b) return; b.n++; b.sum += e.cost; if (e.free) b.free++; });
    return { byType };
  }
  const helpStats = () => Sc.compute({ game: 0, help: helpInput(), freeUses: C.help.freeUses }).help;
  // sluttpoeng = max(0, poeng fra rundene - hjelpepoeng). Hjelp kan aldri sende poengene under 0.
  function scoreNow() {
    const b = budget(), sc = Sc.compute({ game: Math.max(C.score.floor, b.total - b.reserved), help: helpInput(), freeUses: C.help.freeUses });
    sc.bud = b; sc.reserved = b.reserved; return sc;
  }
  /* ronda a la que pertenece un ctx de ayuda: design.2 / dirq.2 / decide.2 / cons.2 -> '2'; jam.r1 / fasit.r1 -> '1'; el resto (rapport) -> 'rep' */
  const roundOfCtx = ctx => { const m = /\.(r?\d)$/.exec(String(ctx)); return m ? m[1].replace('r', '') : 'rep'; };
  const hkey = (type, ctx) => type + ':' + ctx;
  const gotHelp = (type, ctx) => !!st.help.got[hkey(type, ctx)];
  function helpPrice(type, ctx) {
    const cfg = C.help.types[type];
    if (String(ctx).indexOf('practice') >= 0) return { cost: 0, free: true, practice: true };
    const p = Help.price(C.help, type, roundOfCtx(ctx), Help.usedFromLog(st.help.log, roundOfCtx), { submitted: !!st.rep.first });
    return { cost: p.cost, free: p.free, practice: false };
  }
  let toastTimer = null;
  function toast(text) {
    let el = document.getElementById('toast');
    if (!el) { el = document.createElement('div'); el.id = 'toast'; el.className = 'toast'; el.setAttribute('role', 'status'); el.setAttribute('aria-live', 'polite'); document.body.appendChild(el); }
    el.textContent = text; el.classList.remove('is-on'); void el.offsetWidth; el.classList.add('is-on');
    clearTimeout(toastTimer); toastTimer = setTimeout(() => el.classList.remove('is-on'), 6000);
  }
  function useHelp(type, ctx) {
    if (gotHelp(type, ctx)) return;
    const price = helpPrice(type, ctx), before = scoreNow().final, name = T.help.types[type].name;
    st.help.got[hkey(type, ctx)] = true;
    if (!price.practice) st.help.log.push({ type, ctx, cost: price.cost, free: price.free });
    if (type === 'fasit') { const key = ctx.replace(/^fasit\./, ''); (st.ent[key] = st.ent[key] || {}).shown = true; }
    const sc = scoreNow();
    toast(price.practice ? name + ': gratis i øvelsen.' : T.help.toast(name, before - sc.final, price.free) + (sc.clamped ? T.help.toastClamp : ''));
    st.pulse = true;
    save();
  }
  function hintText(ctx) {
    const [k, v] = ctx.split('.');
    if (k === 'design') return T.hints.design[+v] || '';
    return T.hints[k] || '';
  }
  function helpBtn(type, ctx) {
    const tp = T.help.types[type], p = helpPrice(type, ctx);
    const price = p.practice ? T.help.freeTag + ' (øvelse)' : (p.free ? T.help.freeTag : T.help.cost(p.cost));
    return '<button type="button" class="btn btn--sm helpbtn" data-act="help" data-type="' + type + '" data-ctx="' + ctx + '" title="' + esc(tp.desc) + '">' + tp.btn + ' <span class="price">' + price + '</span></button>';
  }
  function helpOut(type, ctx) {
    if (type === 'hint') return '<div class="callout callout--hint anim-reveal" id="ho_' + ctx.replace(/\W/g, '_') + '" tabindex="-1"><p><strong>' + T.help.hintTitle + ':</strong> ' + esc(hintText(ctx)) + '</p></div>';
    if (type === 'modell') return '<div class="well anim-reveal" id="ho_model" tabindex="-1"><p class="well__title">' + T.reportModelTitle + '</p><p>' + esc(modelText(reportStudy())) + '</p><p class="small">' + T.help.modelUsedNote + '</p></div>';
    return '';
  }
  // items: [[type, ctx], ...]. Viser knapper for ubrukt hjelp og innholdet for brukt hjelp.
  function helpBlock(items) {
    if (!items.length) return '';
    const btns = items.filter(x => !gotHelp(x[0], x[1])).map(x => helpBtn(x[0], x[1])).join(' ');
    const outs = items.filter(x => gotHelp(x[0], x[1])).map(x => helpOut(x[0], x[1])).join('');
    const hs = helpStats();
    return '<section class="helpbox" aria-label="' + T.help.title + '"><p class="helpbox__head"><strong>' + T.help.title + '</strong> <span class="small">' + (btns ? T.help.intro + ' ' : '') + T.help.free(Help.freeAvailable(C.help, 'hint', roundOfCtx(items[0][1]), Help.usedFromLog(st.help.log, roundOfCtx))) + '.</span></p>' +
      (btns ? '<div class="row">' + btns + '</div>' : '') + outs + '</section>';
  }

  /* ---------- Oppgave / Slik gjør dere det / Dette leverer dere ---------- */
  function sub(s) { return s.replace(/\{c:(\w+)\}/g, (m, t) => C.help.types[t].cost).replace(/\{free\}/g, C.help.freeUses).replace(/\{start\}/g, C.score.startPoeng); }
  function taskBox(key) {
    const k = T.task[key]; if (!k) return '';
    const Lb = T.taskLabels;
    return '<aside class="taskbox" aria-label="' + Lb.o + '"><div class="taskbox__o"><h3>' + Lb.o + '</h3><p>' + sub(k.o) + '</p></div><div class="taskbox__s"><h3>' + Lb.s + '</h3><ol>' +
      k.s.map(x => '<li>' + sub(x) + '</li>').join('') + '</ol></div><div class="taskbox__l"><h3>' + Lb.l + '</h3><p>' + sub(k.l) + '</p></div></aside>';
  }

  /* ---------- UI-byggesteiner ---------- */
  function statsPanel(study, opts) {
    const tt = study.tt, dp = dpFor(study.prop), u = esc(study.prop.enhet);
    const dRow = (l, v) => '<tr><th scope="row">' + l + '</th><td>' + v + '</td></tr>';
    return '<div class="card anim-reveal"><table class="stats"><caption>' + (opts && opts.caption ? opts.caption : 'Resultat') + '</caption><thead><tr><th scope="col">' + T.desc.group + '</th><th scope="col">' + T.desc.n +
      '</th><th scope="col">' + T.desc.m + ' (' + u + ')</th><th scope="col">' + T.desc.sd + '</th></tr></thead><tbody>' +
      '<tr><th scope="row">' + T.desc.ctrl + '</th><td>' + tt.n1 + '</td><td>' + fmt(tt.m1, dp) + '</td><td>' + fmt(tt.s1, dp) + '</td></tr>' +
      '<tr><th scope="row">' + T.desc.prog + '</th><td>' + tt.n2 + '</td><td>' + fmt(tt.m2, dp) + '</td><td>' + fmt(tt.s2, dp) + '</td></tr></tbody></table>' +
      '<table class="stats"><tbody>' + dRow(T.statDiff, fmt(tt.diff, dp) + ' ' + u) + dRow('t(' + tt.df + ')', fmt(tt.t, 2)) + dRow('p', pnum(tt.p)) +
      dRow(T.statCi, '[' + fmt(tt.lo, dp) + '; ' + fmt(tt.hi, dp) + '] ' + u) + dRow('Cohens d', fmt(tt.d, 2)) + '</tbody></table>' + ciPlot(tt, study.prop) + '</div>';
  }
  function ciPlot(tt, prop) {
    const dp = dpFor(prop), pad = (Math.max(tt.hi, 0) - Math.min(tt.lo, 0)) * 0.15 || 1;
    const lo = Math.min(tt.lo, 0) - pad, hi = Math.max(tt.hi, 0) + pad, W = 420, x = v => 20 + (v - lo) / (hi - lo) * (W - 40);
    const desc = 'Forskjell ' + fmt(tt.diff, dp) + ' ' + prop.enhet + ', 95 % KI fra ' + fmt(tt.lo, dp) + ' til ' + fmt(tt.hi, dp) + '. ' + (tt.lo <= 0 && tt.hi >= 0 ? 'KI-et inkluderer 0.' : 'KI-et inkluderer ikke 0.');
    const ink = 'stroke:var(--c-ink)', inf = 'stroke:var(--c-info)';
    return '<svg class="ci" viewBox="0 0 ' + W + ' 56" role="img" aria-label="' + esc(desc) + '"><line x1="' + x(0) + '" y1="6" x2="' + x(0) + '" y2="40" style="' + ink + '" stroke-dasharray="4 3"/>' +
      '<text x="' + x(0) + '" y="52" text-anchor="middle" font-size="12" style="fill:var(--c-ink)">0</text>' +
      [[tt.lo, 'start'], [tt.diff, 'middle'], [tt.hi, 'end']].map(a => '<text x="' + x(a[0]) + '" y="10" text-anchor="' + a[1] + '" font-size="11" style="fill:var(--c-ink)">' + fmt(a[0], dp) + '</text>').join('') + '<line class="ci-bar" x1="' + x(tt.lo) + '" y1="23" x2="' + x(tt.hi) + '" y2="23" style="' + inf + '" stroke-width="4"/>' +
      '<line x1="' + x(tt.lo) + '" y1="15" x2="' + x(tt.lo) + '" y2="31" style="' + inf + '" stroke-width="3"/><line x1="' + x(tt.hi) + '" y1="15" x2="' + x(tt.hi) + '" y2="31" style="' + inf + '" stroke-width="3"/>' +
      '<rect x="' + (x(tt.diff) - 6) + '" y="17" width="12" height="12" style="fill:var(--c-info)" transform="rotate(45 ' + x(tt.diff) + ' 23)"/></svg><p class="small">◆ er forskjellen, den vannrette streken er 95 % KI, den stiplede linjen er 0 (ingen forskjell).</p>';
  }
  function confGroup(name, val, legend) {
    const id = v => 'cf_' + name.replace(/\./g, '_') + '_' + v;
    return '<fieldset class="confidence"><legend>' + (legend || T.confQ) + ' <span class="small">(' + T.tillit + ')</span></legend><div class="confidence__opts">' +
      T.confOpts.map((o, k) => '<span class="confidence__opt"><input type="radio" name="' + name + '" id="' + id(o[0]) + '" data-bind="' + name + '" value="' + o[0] + '"' + (val === o[0] ? ' checked' : '') + '><label for="' + id(o[0]) + '" data-level="' + '●'.repeat(k + 1) + '○'.repeat(2 - k) + '">' + o[1] + '</label></span>').join('') + '</div></fieldset>';
  }
  function powerPanel(n, a, hideNote) {
    const rows = [0.2, 0.5, 0.8].map(d => { const v = powerOf(d, n, a, 'two'), pct = Math.round(v * 100);
      return '<div class="power' + (pct >= 80 ? ' is-strong' : '') + '"><div class="progress__label"><span>' + T.powerRow(d) + '</span><strong class="power__value num">' + pct + ' %</strong></div>' +
        '<div class="power__track" role="img" aria-label="' + T.powerRow(d) + ': ' + pct + ' %"><div class="power__fill" style="--value:0" data-to="' + pct + '"></div><div class="power__target" data-label="mål 80 %" style="--target:80"></div></div></div>'; }).join('');
    return '<div class="powerpanel" role="group" aria-label="' + T.powerTitle + '"><h4>' + T.powerTitle + '</h4>' + rows + (hideNote ? '' : '<p class="small">' + T.powerNote + '</p>') + '</div>';
  }
  function animatePower() {
    const els = document.querySelectorAll('.power__fill[data-to]');
    if (!els.length) return;
    requestAnimationFrame(() => requestAnimationFrame(() => els.forEach(e => { e.style.setProperty('--value', e.dataset.to); })));
  }
  function csvLink(study, fname) {
    // Niveles «A_Program» / «B_Kontroll» (Program primero): Jamovi ordena los niveles de texto alfabeticamente y calcula primer − segundo nivel => Program − Kontroll (= FASIT).
    const rows = ['gruppe,deltaker,forbedring']; study.p.forEach((v, i) => rows.push('A_Program,' + (i + 1) + ',' + v)); study.k.forEach((v, i) => rows.push('B_Kontroll,' + (i + 1) + ',' + v));
    return '<button type="button" class="btn" data-act="csv" data-name="' + fname + '" data-csv="' + esc(rows.join('\n')) + '">⬇ ' + T.csvDownload + '</button><p class="small">' + T.csvHint + '</p>';
  }
  /* lote 2D: abierto en la primera ronda con Jamovi, plegado (pero siempre reabrible) despues; el estado se guarda en st.ui.jam y sobrevive a los re-renders */
  function jamoviBox(key, openDefault) { st.ui = st.ui || { jam: {} }; st.ui.jam = st.ui.jam || {}; const open = st.ui.jam[key] != null ? st.ui.jam[key] : !!openDefault; return '<details class="jam" data-jam="' + key + '"' + (open ? ' open' : '') + '><summary>' + T.jamoviTitle + '</summary><ol>' + T.jamoviSteps.map(s => '<li>' + s + '</li>').join('') + '</ol></details>'; }
  function entryBox(key, study, merged) {
    const e = st.ent[key] = st.ent[key] || {}, tt = study.tt, dp = dpFor(study.prop);
    const res = e.last;
    let fb = '';
    if (e.ok) fb = '<p class="ok" tabindex="-1" id="fb">✔ ' + (e.flip ? T.entryOkFlip : T.entryOk) + '</p>';
    else if (e.shown) fb = '<p class="info" tabindex="-1" id="fb">' + T.entryShown + '</p>' +
      '<p class="truthline">' + [T.entryFields.diff + ' = ' + fmt(tt.diff, dp), 't = ' + fmt(tt.t, 2), 'p ' + (tt.p < 0.001 ? '< .001' : '= ' + pnum(tt.p)), 'd = ' + fmt(tt.d, 2), 'KI [' + fmt(tt.lo, dp) + '; ' + fmt(tt.hi, dp) + ']'].join(' · ') + '</p>';
    else if (res && res.invalid) fb = '<p class="warn" tabindex="-1" id="fb">' + T.entryInvalid + '</p>';
    else if (res && res.empty) fb = '<p class="warn" tabindex="-1" id="fb">' + T.entryEmpty + '</p>';
    else if (res) fb = '<p class="warn" tabindex="-1" id="fb">' + T.entryBad + '</p>';
    const locked = e.ok || e.shown;
    const field = k => { const inv = res && res.invalid && res.bad.indexOf(k) >= 0 && !locked;
      const mark = inv ? ' <span class="badmark">✖ ' + T.entryFieldInvalid + '</span>' : res && res.m && !locked ? (res.m[k] ? ' <span class="okmark">✔ ' + T.entryFieldOk + '</span>' : ' <span class="badmark">✖ ' + T.entryFieldBad + '</span>') : '';
      return '<div class="fld"><label for="e_' + key + '_' + k + '">' + T.entryFields[k] + mark + '</label><input type="text" id="e_' + key + '_' + k + '" inputmode="text" autocomplete="off" data-ent="' + key + '.' + k + '" value="' + esc(e[k] || '') + '"' + (locked ? ' disabled' : '') + (inv || (res && res.m && !res.m[k] && !locked) ? ' aria-invalid="true"' : '') + '></div>'; };
    return '<section class="card entry" aria-labelledby="et_' + key + '"><h3 id="et_' + key + '">' + T.entryTitle + '</h3><p class="signline small">' + T.jamoviSignNote + '</p><div class="grid6">' + fieldsFor(key).map(field).join('') + '</div>' + (fieldsFor(key).length < 6 && tt ? '<p class="small">' + T.fraJamovi(tt, dp, fmt, ['t', 'd', 'lo', 'hi'].filter(k => fieldsFor(key).indexOf(k) < 0)) + '</p>' : '') +
      (locked ? '' : (st.t0 && Date.now() - st.t0 >= C.mode.summaryMin * 60000 ? '<div class="row"><button type="button" class="btn" data-act="showres" data-key="' + key + '">' + T.showResult + '</button> <span class="small">' + T.showResultNote + '</span></div>' : '') + (merged ? '' : '<div class="row"><button type="button" class="btn btn--primary" data-act="entry" data-key="' + key + '">' + T.entryCheck + '</button></div>') + helpBlock([['hint', 'jam.' + key], ['fasit', 'fasit.' + key]])) +
      '<div role="status" aria-live="polite">' + fb + '</div></section>';
  }
  // Boton de accion UNICO con estados: desactivado con la razon visible BAJO el boton (aria-describedby), o activo con otra etiqueta (Sjekk -> Neste).
  let gateN = 0;
  function gateBtn(o) {
    const id = 'gw' + (++gateN), attrs = Object.keys(o.data || {}).map(k => ' data-' + k + '="' + esc(o.data[k]) + '"').join('');
    return '<div class="gate"><button type="button" class="btn btn--primary btn--lg' + (o.cta ? ' btn--cta' : '') + '" data-act="' + o.act + '"' + attrs + (o.enabled === false ? ' disabled aria-describedby="' + id + '"' : '') + '>' + o.label + '</button>' +
      (o.enabled === false && o.reason ? '<p class="gate__why small" id="' + id + '">' + o.reason + '</p>' : (o.note ? '<p class="gate__why small">' + o.note + '</p>' : '')) + '</div>';
  }
  function skeptic(i, ph) { const t = T.skepticR[i] && T.skepticR[i][ph]; return t ? '<p class="skeptic">💬 ' + esc(t) + '</p>' : ''; }
  function roleList() {
    const keys = st.size === 6 ? T.roles6 : T.roles5;
    return '<ul class="roles">' + keys.map(k => { const r = k === 'kasserer+talsperson' ? T.kassTals : T.roles[k]; return '<li><strong>' + r[0] + '</strong> – ' + r[1] + '</li>'; }).join('') + '</ul>';
  }
  const LEAVES = [[34, 52], [60, 38], [44, 22], [86, 44], [76, 22]];
  function treeSvg(done, animNewest) {
    return '<svg class="tree" viewBox="0 0 120 120" role="img" aria-label="' + esc(T.saga.yggdrasil(done) + '. ' + T.saga.yggdrasilHint) + '"><path class="trunk" d="M60 112V62M60 80C48 76 40 68 34 56M60 72c12-4 20-12 26-24M60 62C58 48 52 36 44 26M60 62c2-14 8-26 16-36M50 112c4-4 16-4 20 0"/>' +
      LEAVES.map((c, k) => '<circle class="leaf' + (k < done ? ' is-on' : '') + '" style="--i:0' + (k < done && !(animNewest && k === done - 1) ? ';animation:none' : '') + '" cx="' + c[0] + '" cy="' + c[1] + '" r="9"/>').join('') + '</svg>';
  }

  /* ---------- visninger ---------- */
  function steps() {
    const out = [['howto', 'Start']];
    [0, 1, 2, 3, 4].forEach(i => out.push(['r' + i, roundLabel(i), isExtraRd(i)]));
    return out.concat([['report', 'Rapport'], ['long', 'Langtid'], ['debrief', 'Oppsummering'], ['card', 'Kort']]);
  }
  function stepKey() { return st.view === 'round' ? 'r' + st.r : st.view; }
  function header() {
    const cur = stepKey(), STEPS = steps(), idx = STEPS.findIndex(s => s[0] === cur);
    const sc = scoreNow();
    return '<header class="app-header"><img src="../_shared/assets/logo-treningslaben.svg" alt=""><div><div class="apptitle">' + T.title + '</div><p class="tagline">' + T.saga.motto + (st.alias ? ' · ' + T.cardTeam + ': ' + esc(st.alias) : '') + '</p></div><span class="spacer"></span>' +
      '<div class="hud"><span class="scorepanel" aria-label="' + T.totalWord + '">' + T.totalWord + ' <strong id="scoreNum"' + (st.pulse ? ' class="anim-pop"' : '') + '>' + fmt(sc.final, 0) + '</strong></span> ' +
      (sc.reserved ? '<span class="scorepanel small" id="reservedTag">' + T.reservedTag(sc.reserved) + '</span> ' : '') + '<span class="scorepanel hjelpchip" title="' + T.help.headerLabel + '">' + T.help.headerLabel + ' <strong>' + sc.help.n + '</strong>' + (sc.help.sum ? ' <small>(−' + sc.help.sum + ')</small>' : '') + '</span> ' +
      (st.t0 ? window.TidsRing.html(st.t0, MD.targetMin) : '') + '<button type="button" class="btn btn--sm" id="toSummaryBtn" data-act="toSummary" hidden>' + T.toSummaryBtn + '</button> ' +
      '<button type="button" class="btn btn--sm" id="boardBtn" data-act="board" hidden>' + T.boardOpen + '</button></div>' +
      '<nav aria-label="Fremdrift"><ol class="stepper">' + STEPS.map((s, i) => '<li' + (i === idx ? ' aria-current="step"' : '') + (s[2] || i < idx ? ' class="' + [i < idx ? 'is-done' : '', s[2] ? 'is-extra' : ''].filter(Boolean).join(' ') + '"' : '') + '>' + s[1] + '' + '</li>').join('') + '</ol></nav></header>';
  }
  function glossaryHtml() {
    const G = T.glossary;
    return '<details class="card glossary"><summary>' + G.summary + '</summary><dl class="dl">' + G.items.map(x => '<dt>' + x[0] + '</dt><dd>' + x[1] + '</dd>').join('') + '</dl></details>';
  }
  function matrixHtml() {
    return '<p>' + T.matrixWhat + '</p><table class="matrix"><caption>' + T.matrixCaption + '</caption><thead><tr>' + T.matrixHead.map(h => '<th scope="col">' + h + '</th>').join('') + '</tr></thead><tbody>' +
      T.matrixRows.map(r => '<tr><th scope="row">' + r[0] + '</th><td>' + r[1] + '</td><td>' + r[2] + '</td></tr>').join('') + '</tbody></table><p class="small">' + T.matrixNote + '</p>';
  }
  function vHowto() {
    const H = T.howto, ty = C.help.types, kj = modeOf() === 'kjerne';
    const costRows = C.help.order.map(t => '<tr><th scope="row">' + T.help.types[t].name + '</th><td>' + T.help.types[t].desc + '</td><td>' + ty[t].cost + ' poeng' + (ty[t].freePerRound ? ' <span class="small">(' + T.help.freeTag + ' første gang i hver runde)</span>' : ty[t].freeAfterSubmit ? ' <span class="small">(gratis etter innlevering)</span>' : '') + '</td></tr>').join('');
    /* Lag 1: tre kort + modusvalg + knapp. Lag 2: hvordan det går til. Lag 3: alle detaljer. */
    return '<h1 data-focus tabindex="-1">' + H.title + '</h1>' + taskBox('howto') +
      '<div class="grid3 opencards">' + H.cards.map(c => '<div class="card"><h3>' + c[0] + '</h3><p>' + c[1] + '</p></div>').join('') + '</div>' +
      '<fieldset class="card layer"><legend>' + H.modeTitle + '</legend><div class="modechoice">' +
      '<label class="' + (kj ? 'is-on' : '') + '"><input type="radio" name="mode" data-bind="mode" value="kjerne"' + (kj ? ' checked' : '') + '> <strong>' + H.modeCore + '</strong><br><span class="small">' + H.modeCoreText + '</span></label>' +
      '<label class="' + (kj ? '' : 'is-on') + '"><input type="radio" name="mode" data-bind="mode" value="full"' + (kj ? '' : ' checked') + '> <strong>' + H.modeFull + '</strong><br><span class="small">' + H.modeFullText + '</span></label></div></fieldset>' +
      '<details class="card layer"><summary>' + H.layer2 + '</summary><p>' + H.goal + '</p><p>' + T.story + '</p><div class="grid"><div><h3>' + H.rolesTitle + '</h3><p>' + H.rolesText + '</p>' + roleList() + '</div><div><h3>' + H.timeTitle + '</h3><p>' + H.timeText + '</p><p>' + H.stars + '</p></div></div></details>' +
      '<details class="card layer"><summary>' + H.layer3 + '</summary><div class="callout callout--rules"><div><h3>' + H.programTitle + '</h3><p>' + H.programText + '</p></div></div>' + glossaryHtml() +
      '<h3>' + H.scoreTitle + '</h3><p>' + sub(H.scoreText) + '</p><table class="helptable"><thead><tr>' + H.costHead.map(h => '<th scope="col">' + h + '</th>').join('') + '</tr></thead><tbody>' + costRows + '</tbody></table><p class="small">' + T.help.intro + '</p>' +
      '<details class="card"><summary>' + H.matrixSummary + '</summary>' + matrixHtml() + '</details></details>' +
      '<section aria-labelledby="lagH">' + vIntro().replace(/<h2[^>]*>[^<]*<\/h2>/, '<h2 id="lagH">' + T.cardTeam + '</h2>').replace(taskBox('intro'), '') + '</section>';
  }
  function vIntro() {
    const sets = ['A', 'B'];
    return '<h2 data-focus tabindex="-1">' + T.cardTeam + '</h2>' + taskBox('intro') + '<p class="lead">' + T.welcome + '</p>' +
      '<form class="card" id="introForm" novalidate><div class="fld"><label for="alias">' + T.fAlias + '</label><div class="row"><input type="text" id="alias" maxlength="' + A.MAX + '" autocomplete="off" value="' + esc(st.alias) + '" data-bind="alias" aria-describedby="aliasHelp aliasErr" autocapitalize="words" spellcheck="false">' +
      '<button type="button" class="btn" data-act="suggest">' + T.fAliasSuggest + '</button></div><p class="small" id="aliasHelp">' + T.fAliasHelp + ' ' + T.boardWarn + '</p><p class="warn" id="aliasErr" role="alert"></p></div>' +
      '<div class="fld"><label for="motto">' + T.fMotto + '</label><input type="text" id="motto" maxlength="40" value="' + esc(st.motto) + '" data-bind="motto" autocomplete="off"></div>' +
      '<div class="grid3"><div class="fld"><label for="size">' + T.fSize + '</label><select id="size" data-bind="size"><option value="5"' + (st.size === 5 ? ' selected' : '') + '>5</option><option value="6"' + (st.size === 6 ? ' selected' : '') + '>6</option></select></div>' +
      '</div>' +
      '<div class="fld"><label for="pred">' + T.fPred + '</label><input id="pred" type="number" min="0" max="100" inputmode="numeric" value="' + esc(st.pred) + '" data-bind="pred" aria-describedby="predHelp"><p class="small" id="predHelp">' + T.fPredHelp + '</p></div>' +
      '<button type="submit" class="btn btn--primary btn--lg">' + T.start + '</button></form><p class="small">' + T.prereq + ' ' + T.privacy + '</p>';
  }
  function vRoles() {
    return '<h2 data-focus tabindex="-1">' + T.rolesTitle + '</h2>' + taskBox('roles') + '<p>' + T.rolesIntro + '</p>' + roleList() +
      '<div class="row"><button type="button" class="btn btn--primary btn--lg" data-act="startRound" data-r="0">' + T.next + '</button></div>';
  }
  function vPractice() {
    const s = practiceStudy(), e = (st.ent.practice = st.ent.practice || {}), fin = e.ok || e.shown;
    return '<h2 data-focus tabindex="-1">' + T.practiceTitle + '</h2>' + taskBox('practice') + '<p>' + T.practiceIntro + '</p>' + csvLink(s, 'ovelse_studie.csv') + jamoviBox('practice', true) + entryBox('practice', s, true) +
      (fin ? statsPanel(s, { caption: 'Fasit for øvelsen' }) + '<p>' + T.practiceDone + '</p>' : '') +
      (fin ? gateBtn({ label: 'Til runde 1', act: 'startRound', data: { r: 0 }, cta: true }) : gateBtn({ label: T.entryCheck, act: 'entry', data: { key: 'practice' }, note: T.gate.numbersDone }));
  }
  function roundHead(i) {
    const f = plan()[i], p = f === 'REG' ? REGPROP : PROP[f], done = st.rounds.filter(r => r.done).length;
    return '<div class="roundhead"><div><h2 data-focus tabindex="-1">' + (isExtraRd(i) ? roundLabel(i) + ' <span class="extra-tag">' + T.extraWord + '</span>' : roundLabel(i) + ' av ' + MD.core.filter(inPlay).length) + ' <span class="small">(' + T.timeHint + ')</span></h2>' + (f === 'REG' ? '<h3>' + T.regTitle + '</h3>' : '<h3>' + esc(p.navn) + '</h3>') + (i === 0 ? '<p class="programline">' + T.programLine + '</p>' : '') + (i === 0 ? '<p class="premise"><strong>' + T.premise + '</strong></p>' : '') + '</div>' + treeSvg(done, st.ph === 'reveal') + '</div>' + roleBanner(i);
  }
  /* Lote 2B: brief-skjermen er slått sammen med neste skjerm (briefBody legges øverst i dirq/design/study). */
  const firstPhase = i => plan()[i] === 'REG' ? 'study' : (i === C.consultantRound ? 'dirq' : 'design');
  function briefBody(i) {
    const f = plan()[i];
    if (f === 'REG') return '<div class="card"><p>' + T.regStory + '</p><p class="small">' + T.regNoMoney + '</p></div>';
    const p = PROP[f], pil = D.pilot[String(st.lag)][f];
    return '<div class="card"><dl class="dl"><dt>Kontekst</dt><dd>' + esc(p.kontekst) + '</dd><dt>' + T.briefGoal + '</dt><dd>' + esc(p.maal) + ' (' + esc(p.enhet) + ')</dd>' +
      '<dt>' + T.briefSd + '</dt><dd>' + fmt(p.sd, dpFor(p)) + ' ' + esc(p.enhet) + '</dd><dt>' + T.briefCost + '</dt><dd>' + fmt(p.kost, 1) + ' ' + T.briefCostUnit + '</dd>' +
      '<dt>' + T.briefPilot + '</dt><dd>d = ' + fmt(pil[0], 2) + ', 95 % KI [' + fmt(pil[1], 2) + '; ' + fmt(pil[2], 2) + ']<br><span class="small">' + T.briefPilotWarn + '</span></dd></dl><p class="small">' + T.briefTruthHidden + '</p></div>' + skeptic(i, 'brief') +
      (i === 0 ? '<details class="card layer" open><summary>' + T.r1Gloss.title + '</summary><ul>' + T.r1Gloss.items.map(x => '<li>' + x + '</li>').join('') + '</ul></details>' : '');
  }
  function vBrief(i) { st.ph = firstPhase(i); return vRound(); }
  function vDirq(i) {
    let h = roundHead(i) + briefBody(i) + '<h3>' + T.dirTitle + '</h3>' + taskBox('dirq') + '<p>' + T.dirIntro + '</p>';
    T.dirQs.forEach((q, k) => {
      const done = st.dir.a[k] != null && st.dir.c[k], ok = done && rightAns('dir' + k, st.dir.a[k]);
      h += '<fieldset class="card"><legend>' + (k + 1) + '. ' + q.q + '</legend>' + T.dirOptsV.map((o, v) => '<label class="opt"><input type="radio" name="dir' + k + '" data-bind="dir.a.' + k + '" data-num value="' + v + '"' + (st.dir.a[k] === v ? ' checked' : '') + (done ? ' disabled' : '') + '> ' + o + '</label>').join('') +
        confGroup('dir.c.' + k, st.dir.c[k]) + (done ? '<p class="' + (ok ? 'ok' : 'warn') + '" role="status">' + (ok ? '✔ ' + T.dirOk : '✘ ' + T.dirBad) + '</p>' : '') + '</fieldset>';
    });
    const ready = st.dir.a.every(v => v != null) && st.dir.c.every(v => v);
    return h + helpBlock([['hint', 'dirq.' + i]]) + gateBtn({ label: T.dirCheck, act: 'ph', data: { ph: 'design' }, enabled: ready, reason: T.confNeed });
  }
  function designPanelHtml(i) {
    const R = st.rounds[i], d = R.design, cons = gotHelp('konsulent', 'cons.' + i), hideBar = i >= C.consultantRound && !cons;
    let h = '';
    { const now = scoreNow().final, cost = 2 * d.n * 0.5; h += '<p class="info" id="designPreview">' + T.designPreview(d.n, fmt(cost, 0), fmt(now, 0), fmt(Math.max(0, now - cost), 0)) + '</p>'; }
    if (hideBar) h += '<p class="small">' + T.designBarHidden + '</p>';
    else h += (cons ? '<p class="info">' + T.consultantUsed + '</p>' : '') + powerPanel(d.n, d.a);
    return h;
  }
  function vDesign(i) {
    const R = st.rounds[i], needJust = C.justificationRounds.includes(i), hasAlpha = i >= C.alphaFromRound;
    const justOk = !needJust || wc(R.just) >= 3;
    const hideBar = i >= C.consultantRound;
    const items = [['hint', 'design.' + i]]; if (hideBar) items.push(['konsulent', 'cons.' + i]);
    const tk = i >= C.consultantRound ? 'design3' : (hasAlpha ? 'design2' : 'design1');
    return roundHead(i) + briefBody(i) + '<h3>' + T.designTitle + '</h3>' + taskBox(tk) + skeptic(i, 'design') +
      '<div class="card"><fieldset class="fld"><legend>' + T.designN + '</legend>' + C.nLevels.map(n => '<label class="opt"><input type="radio" name="dn" data-bind="rounds.' + i + '.design.n" data-num data-panel value="' + n + '"' + (R.design.n === n ? ' checked' : '') + '> ' + n + ' <span class="small">· ' + T.costPerN(n) + '</span></label>').join('') + '</fieldset>' +
      (hasAlpha ? '<fieldset class="fld"><legend>' + T.designAlpha + '</legend>' + C.alphaLevels.map(a => '<label class="opt"><input type="radio" name="da" data-bind="rounds.' + i + '.design.a" data-num data-panel value="' + a + '"' + (R.design.a === a ? ' checked' : '') + '> ' + String(a).replace('.', ',') + '</label>').join('') + '</fieldset>' : '<p class="small">' + T.designAlphaFixed + '</p>') +
      '<div id="designPanel" aria-live="polite">' + designPanelHtml(i) + '</div>' +
      '<div class="fld"><label for="just">' + T.designJust + (needJust ? ' *' : '') + '</label><p class="small" id="jh">' + T.designJustHelp + '</p><textarea id="just" rows="2" data-bind="rounds.' + i + '.just" aria-describedby="jh" placeholder="' + T.designJustPh + '">' + esc(R.just) + '</textarea></div></div>' +
      helpBlock(items) +
      '<div class="row"><button type="button" class="btn btn--primary btn--lg" data-act="lock" id="lockBtn"' + (justOk ? '' : ' disabled') + '>' + T.designLock + '</button></div>' + (justOk ? '' : '<p class="small" id="lockHint">Skriv en kort begrunnelse (minst tre ord) for å gå videre.</p>');
  }
  function vStudy(i) {
    const R = st.rounds[i], s = studyFor(i), f = plan()[i];
    const key = 'r' + i, jam = C.jamoviRounds.includes(i), e = st.ent[key] = st.ent[key] || {}, fin = !jam || e.ok || e.shown;
    let h = roundHead(i) + (f === 'REG' ? briefBody(i) : '') + '<h3>' + T.studyTitle + '</h3>' + taskBox(jam ? 'study_jam' : 'study_sum');
    if (f !== 'REG') h += '<p class="small">Design: n = ' + R.design.n + ' per gruppe, α = ' + String(R.design.a).replace('.', ',') + '.</p>';
    else h += '<p class="small">n = ' + C.registry.n + ' per gruppe (registerdata).</p>';
    if (jam && i === C.jamoviRounds[0]) h += '<div class="callout"><div><strong>' + T.practiceInR2Title + '</strong> ' + T.practiceInR2 + '</div></div>';
    if (jam) h += '<p>' + T.studyJamoviNote + '</p>' + csvLink(s, (isExtraRd(i) ? 'ekstra' + (i === MD.extra[0] ? 'A' : 'B') : 'runde' + coreNo(i)) + '_studie.csv') + jamoviBox(key, i === C.jamoviRounds[0]) + entryBox(key, s, true) + (fin ? statsPanel(s) : '');
    else h += '<p>' + T.studySummaryNote + '</p>' + statsPanel(s) + csvLink(s, (isExtraRd(i) ? 'ekstra' + (i === MD.extra[0] ? 'A' : 'B') : 'runde' + coreNo(i)) + '_studie.csv');
    return h + (fin ? gateBtn({ label: T.next, act: 'ph', data: { ph: 'decide' } }) : gateBtn({ label: T.entryCheck, act: 'entry', data: { key }, note: T.gate.numbersDone }));
  }
  function vDecide(i) {
    const R = st.rounds[i], s = studyFor(i), f = plan()[i];
    const ready = R.dec && R.conf && (f !== 'REG' || R.quiz != null);
    let h = roundHead(i) + '<h3>' + T.decideTitle + '</h3>' + taskBox(f === 'REG' ? 'decide_reg' : 'decide') + statsPanel(s) +
      '<div class="bridge"><span class="bridge__end">' + T.saga.bifrostEnds[0] + '</span><svg viewBox="0 0 160 90" role="img" aria-label="' + esc(T.saga.bifrost) + '"><path pathLength="1" d="M10 80A70 70 0 0 1 150 80"/><path pathLength="1" d="M18 80A62 62 0 0 1 142 80"/><path pathLength="1" d="M26 80A54 54 0 0 1 134 80"/><path pathLength="1" d="M34 80A46 46 0 0 1 126 80"/></svg><span class="bridge__end">' + T.saga.bifrostEnds[1] + '</span></div>' +
      '<p>' + T.decideRule + '</p>' + skeptic(i, 'decide') +
      '<fieldset class="card"><legend>Beslutning</legend><label class="opt big"><input type="radio" name="dec" data-bind="rounds.' + i + '.dec" value="in"' + (R.dec === 'in' ? ' checked' : '') + '> ' + T.decideIn + '</label>' +
      '<label class="opt big"><input type="radio" name="dec" data-bind="rounds.' + i + '.dec" value="out"' + (R.dec === 'out' ? ' checked' : '') + '> ' + T.decideOut + '</label>' + (f === 'REG' ? '' : confGroup('rounds.' + i + '.conf', R.conf) + '<p class="small">' + T.confNote + '</p>') + '</fieldset>';
    if (f === 'REG') h += '<fieldset class="card"><legend>' + T.regQuizQ + '</legend>' + shuffledOpts('reg', T.regQuizOpts, 'quiz', 'rounds.' + i + '.quiz', R.quiz) + '</fieldset>' +
      '<div class="card">' + confGroup('rounds.' + i + '.conf', R.conf, T.confQReg) + '<p class="small">' + T.confNote + '</p></div>';
    return h + helpBlock([['hint', 'decide.' + i]]) + gateBtn({ label: T.revealBtn, act: 'reveal', enabled: !!ready, reason: T.confNeed });
  }
  function vReveal(i) {
    const R = st.rounds[i], s = studyFor(i), f = plan()[i];
    let h = roundHead(i) + '<h3>' + T.revealTitle + '</h3>' + taskBox('reveal');
    if (f === 'REG') {
      const okq = rightAns('reg', R.quiz);
      h += '<div class="card"><p>' + T.regReveal + '</p><p class="' + (okq ? 'ok' : 'warn') + '">' + (okq ? '✔ ' + T.regRevealOk : T.regRevealBad) + '</p></div>';
    } else {
      const oc = outcomeOf(s, R.dec), o = T.outcomes[oc], pay = budget().per[i], good = oc === 'riktigInnf' || oc === 'riktigAvvist', sc = scoreNow();
      h += '<div class="card"><p>' + (s.isNull ? T.truthNull : T.truthReal(s.truthD)) + '</p>' +
        (good ? '<div class="callout callout--ok anim-reveal"><p><strong>' + o[0] + '.</strong> ' + o[1] + '</p></div>' : '<div class="callout callout--ragnarok anim-reveal"><p><strong>' + o[0] + '.</strong> ' + o[1] + '</p>' + (T.saga.ragnarok ? '<p class="small">' + T.saga.ragnarok + '</p>' : '') + '</div>') +
        (s.isNull && s.tt.p < R.design.a && s.tt.diff < 0 ? '<p class="info">' + T.type1Neg + '</p>' : '') +
        (R.dec === 'in' && R.conf === 'helt' && !good ? '<p class="info">' + T.trapMsg + '</p>' : '') +
        (s.isNull ? '<p class="info">' + (R.dec === 'out' ? T.nullRightMsg : T.counterfactualOut) + '</p>' : '') +
        (T.contWorld ? '<p class="small">' + T.contWorld + '</p>' : '') + '</div>' +
        '<div class="card"><h4>' + T.payoffTitle + '</h4><dl class="dl"><dt>' + T.payoffGain + '</dt><dd>' + (pay.pay.gain >= 0 ? '+' : '') + fmt(pay.pay.gain, 0).replace('-', MINUS) + '</dd><dt>' + T.payoffCost + '</dt><dd>' + minusN(pay.pay.cost) + '</dd><dt>' + T.payoffNet + '</dt><dd><strong>' + (pay.pay.net >= 0 ? '+' : '') + fmt(pay.pay.net, 0) + '</strong></dd>' +
        '<dt>' + T.totalWord + ' nå</dt><dd><strong>' + fmt(sc.final, 0) + '</strong></dd></dl>' + (pay.rescued ? '<p class="info">' + T.rescue + '</p>' : '') + '</div>';
    }
    const last = nextInPlay(i) < 0, nx = i + 1;
    const offer = (nx <= 4 && isExtraRd(nx) && !inPlay(nx) && (!st.t0 || Date.now() - st.t0 < (nx === 2 ? 20 : 28) * 60000)) ? '<div class="extra-offer"><p><span class="extra-tag">' + T.extraWord + '</span> ' + T.extraOffer + '</p><button type="button" class="btn" data-act="addExtra" data-r="' + nx + '">' + T.extraBtn + '</button></div>' : '';
    return h + '<section class="whatnow" aria-labelledby="whatnowH"><h3 id="whatnowH">' + T.whatNow.label + '</h3><p>' + (last ? T.whatNow.textLast : T.whatNow.text) + '</p>' +
      '<div class="row"><button type="button" class="btn btn--primary btn--lg btn--cta" data-act="nextRound">' + (last ? T.toReport : T.nextRound) + ' →</button></div>' + offer + '</section>';
  }
  function roleBanner(i) {
    const rb = T.roleBanner, role = rb.byPhase[st.ph] || rb.byPhase.brief;
    return '<div class="rolebanner" role="note"><span><strong>' + rb.now + '</strong> ' + role + '</span></div>' +
      (seqNo(i) > 1 && st.ph === firstPhase(i) && !st.rot[i] ? '<div class="rolebanner rotbox" role="group"><span><strong>' + rb.rotate + ':</strong> ' + rb.rotateHow + '</span><button type="button" class="btn btn--sm" data-act="rotdone" data-r="' + i + '">' + rb.done + '</button></div>' : '');
  }
  function vRound() {
    const i = st.r, ph = st.ph;
    return ph === 'brief' ? vBrief(i) : ph === 'dirq' ? vDirq(i) : ph === 'design' ? vDesign(i) : ph === 'study' ? vStudy(i) : ph === 'decide' ? vDecide(i) : vReveal(i);
  }
  /* «Finn feilene» (lote 2A-2; scenario F12, lag 1, n = 20): øvelse uten poeng før rapporten skrives. */
  function finnHtml() {
    const F = T.finn; st.ff = st.ff || { sel: {}, checked: false }; st.ff.sel = st.ff.sel || {};
    let h = '<details class="card extra-offer" id="finnFeilene"' + (st.ff.checked ? ' open' : '') + '><summary><span class="extra-tag">' + T.extraWord + '</span> ' + F.title + '</summary><p>' + F.intro + '</p><p class="small">' + F.how + '</p><ul class="finn">';
    F.parts.forEach((p, k) => {
      const on = !!st.ff.sel[k];
      h += '<li><label class="opt"><input type="checkbox" data-bind="ff.sel.' + k + '"' + (on ? ' checked' : '') + '> ' + esc(p.t) + '</label>';
      if (st.ff.checked) h += '<p class="small ' + (p.err === on ? 'ok' : 'warn') + '" role="status">' + (p.err === on ? '✔ ' : '✘ ') + p.fb + '</p>';
      h += '</li>';
    });
    return h + '</ul><button type="button" class="btn" data-act="ffcheck">' + F.check + '</button>' + (st.ff.checked ? '<p>' + F.after + '</p>' : '') + '</details>';
  }
  function vReport() {
    const s = reportStudy(), rep = st.rep, fin = true;
    if (!rep.text && !rep.touched) rep.text = template(s);
    let h = '<h2 data-focus tabindex="-1">' + T.reportTitle + '</h2>' + taskBox('report') + '<p>' + T.reportIntro + '</p><p>' + T.reportCase(s.prop.navn, s.prop.maal, s.n) + '</p><p class="small">' + T.reportNoTruth + '</p><ol class="small"><li>' + T.reportStep1 + '</li><li>' + T.reportStep2 + '</li></ol>' +
      csvLink(s, 'rapport_studie.csv') + statsPanel(s, { caption: T.reportNumbersCaption });
    h += finnHtml();
    const L_ = rep.last, R_ = T.rep;
    h += '<section class="card">' + (rep.first ? '' : '<p class="info">' + R_.firstNote + '</p>') + '<h3 id="reptxtH">' + T.reportTplLabel + '</h3><textarea id="reptxt" aria-labelledby="reptxtH" rows="9" data-bind="rep.text" data-touch>' + esc(rep.text) + '</textarea>' +
      '<div class="row"><button type="button" class="btn" data-act="tpl">' + T.reportTplBtn + '</button> <button type="button" class="btn btn--primary" data-act="repcheck">' + T.reportCheckBtn + '</button></div><div role="status" aria-live="polite" id="repfb">';
    if (L_ && L_.items) {
      h += '<ul class="checklist">' + L_.items.map(it => { const li = T.reportList.find(x => x[0] === it.id); return '<li class="' + (it.state === 'ok' ? 'is-yes' : it.state === 'avvik' ? 'is-warn' : 'is-no') + '">' + (li ? li[1] : it.id) + ' <span class="small">(' + R_.stateWord[it.state] + ')</span></li>'; }).join('') + '</ul>';
      if (L_.hard.length) h += '<div class="callout callout--warn"><div><p><strong>' + R_.hardTitle + '</strong></p><ul>' + L_.hard.map(x => '<li>' + esc(x.msg) + '</li>').join('') + '</ul></div></div>';
      const miss = L_.items.filter(it => it.state === 'falta');
      if (miss.length) h += '<ul>' + miss.map(it => '<li>' + T.reportMiss[it.id] + '</li>').join('') + '</ul>';
      if (L_.warn.length) h += '<div class="callout"><div><p><strong>' + R_.warnTitle + '</strong></p><ul>' + L_.warn.map(x => '<li>' + esc(x.msg) + '</li>').join('') + '</ul></div></div>';
      const f_ = rep.first;
      if (f_) h += '<p class="' + (f_.star ? 'ok' : 'warn') + '">' + (f_.star ? '★ ' + R_.firstStar + (f_.medal ? ' ' + T.reportOkAll : '') : R_.firstNoStar) + '</p>';
      if (rep.retryOk) h += '<p class="ok">' + R_.retry + '</p>';
      if (rep.skipped && !(f_ && f_.star)) h += '<p class="info">' + R_.skipped + '</p>';
    }
    h += '</div>' + (rep.first && !rep.done ? '<div class="row"><button type="button" class="btn" data-act="repskip">' + R_.skip + '</button></div>' : '') +
      helpBlock([['hint', 'report'], ...(rep.first || L_ ? [['modell', 'rep.model']] : [])]) + '<p class="small">' + T.reportDiscuss + '</p></section>' +
      gateBtn({ label: modeOf() === 'kjerne' ? T.toDebrief : T.toLongrun, act: 'goto', data: { view: modeOf() === 'kjerne' ? 'debrief' : 'long' }, enabled: !!rep.done, reason: T.gate.reportDone, cta: true });
    return h;
  }

  /* ---------- langtidsavsløring ---------- */
  function usedDesigns() {
    const out = [], seen = new Set();
    [0, 1, 2, 4].forEach(i => { const R = st.rounds[i]; if (!R.locked) return; const k = R.design.n + '|' + R.design.a; if (!seen.has(k)) { seen.add(k); out.push({ n: R.design.n, a: R.design.a }); } });
    if (!out.length) out.push({ n: 20, a: 0.05 });
    return out;
  }
  const simCache = {};
  function sim(n, d, a, seed) { const k = [n, d, a, seed].join('|'); return simCache[k] || (simCache[k] = S.simulate(1000, n, d, a, seed)); }
  function vLong() {
    const ds = usedDesigns(); const sel = st.longSel != null && ds[st.longSel] ? st.longSel : 0; const des = ds[sel]; const rd = st.longD || 0.5;
    const s1 = sim(20, 0.5, 0.05, 101), n0 = sim(des.n, 0, des.a, 202), r1 = sim(des.n, rd, des.a, 303);
    const g = st.pred !== '' && st.pred != null ? T.longGuess(st.pred) : T.longNoGuess;
    const powPos = powerOf(rd, des.n, des.a, 'pos');
    return '<h2 data-focus tabindex="-1">' + T.longTitle + '</h2>' + taskBox('long') + '<p>' + T.longIntro + '</p><p class="muted"><span class="rune" aria-hidden="true">ᚠ</span> <strong>' + T.saga.norns + '.</strong> ' + T.saga.nornsText + '</p>' +
      '<section class="card"><h3>' + T.longQ1 + '</h3><p>' + g + '</p><p>' + T.longRes1(s1.nAdopt, s1.nSig) + '</p><canvas class="lgrid" data-grid="1" width="500" height="200" role="img" aria-label="' + esc(T.longGridLabel('Spørsmålet fra starten', s1.nSig)) + '"></canvas></section>' +
      (modeOf() === 'kjerne' ? '<details class="extra-offer"><summary><span class="extra-tag">' + T.extraWord + '</span> ' + T.longExplore + '</summary>' : '') +
      '<section class="card"><h3>' + T.longPick + '</h3><div class="row"><fieldset class="fld"><legend>' + T.longDesignLabel + '</legend>' + ds.map((x, k) => '<label class="opt"><input type="radio" name="lsel" data-act-change="lsel" value="' + k + '"' + (k === sel ? ' checked' : '') + '> n = ' + x.n + ', α = ' + String(x.a).replace('.', ',') + '</label>').join('') + '</fieldset>' +
      '<fieldset class="fld"><legend>' + T.longRealD + '</legend>' + [0.2, 0.5, 0.8].map(d => '<label class="opt"><input type="radio" name="ld" data-act-change="ld" value="' + d + '"' + (d === rd ? ' checked' : '') + '> ' + String(d).replace('.', ',') + '</label>').join('') + '</fieldset></div>' +
      '<h4>' + T.longNullTitle + '</h4><p>' + T.longNullRes(n0.nSig, n0.nAdopt, des.a) + '</p><canvas class="lgrid" data-grid="2" width="500" height="200" role="img" aria-label="' + esc(T.longGridLabel('Null-programmer', n0.nAdopt)) + '"></canvas>' +
      '<h4>' + T.longRealTitle(rd) + '</h4><p>' + T.longRealRes(r1.nAdopt, String(Math.round(powPos * 1000) / 10).replace('.', ',')) + '</p><canvas class="lgrid" data-grid="3" width="500" height="200" role="img" aria-label="' + esc(T.longGridLabel('Ekte programmer', r1.nAdopt)) + '"></canvas></section>' + (modeOf() === 'kjerne' ? '</details>' : '') +
      '<div class="callout"><div><p>' + T.longTakeaway + '</p></div></div><p class="small">Fylt firkant = innført (p &lt; α og positiv forskjell). Tom firkant = ikke innført.</p><div class="row"><button type="button" class="btn btn--primary btn--lg" data-act="goto" data-view="debrief">' + T.toDebrief + '</button></div>';
  }
  // Rutenettet fylles gradvis (hver firkant = én gjentatt studie) slik at "mange trekk" sees; ved redusert bevegelse tegnes alt med en gang.
  let gridRun = 0;
  function paintGrids() {
    const ds = usedDesigns(); const sel = st.longSel != null && ds[st.longSel] ? st.longSel : 0, des = ds[sel], rd = st.longD || 0.5;
    const sims = { 1: sim(20, 0.5, 0.05, 101), 2: sim(des.n, 0, des.a, 202), 3: sim(des.n, rd, des.a, 303) };
    const cs0 = getComputedStyle(document.documentElement), fill = cs0.getPropertyValue('--c-info').trim() || '#2F5DA8', edge = cs0.getPropertyValue('--c-ink-soft').trim() || '#666';
    const reduced = window.FX ? window.FX.reduced() : false, run = ++gridRun;
    document.querySelectorAll('canvas[data-grid]').forEach(cv => {
      const s = sims[cv.dataset.grid], ctx = cv.getContext('2d'), cs = 10; let r = 0;
      ctx.clearRect(0, 0, cv.width, cv.height);
      function step() {
        if (run !== gridRun) return;
        const end = reduced ? 1000 : Math.min(1000, r + 40);
        for (; r < end; r++) { const x = (r % 50) * cs, y = Math.floor(r / 50) * cs;
          if (s.adopt[r]) { ctx.fillStyle = fill; ctx.fillRect(x + 1, y + 1, cs - 2, cs - 2); }
          else { ctx.strokeStyle = edge; ctx.lineWidth = 1; ctx.strokeRect(x + 1.5, y + 1.5, cs - 3, cs - 3); } }
        if (r < 1000) requestAnimationFrame(step);
      }
      step();
    });
  }

  function vDebrief() {
    const tk = st.ticket;
    let h = '<h2 data-focus tabindex="-1">' + T.debTitle + '</h2>' + taskBox('debrief') + (modeOf() === 'kjerne' ? '<p class="callout"><strong>' + T.longLineTitle + '</strong> ' + T.longLine(sim(20, 0.5, 0.05, 101).nSig, st.pred !== '' && st.pred != null ? T.longGuess(st.pred) : '') + '</p>' : '') + '<ol class="debq">' + T.debCore.map(q => '<li>' + q + '</li>').join('') + '</ol><details class="extra-offer"><summary><span class="extra-tag">' + T.extraWord + '</span> ' + T.debMore + '</summary><ol class="debq">' + T.debQs.map(q => '<li>' + q + '</li>').join('') + '</ol></details><section class="card"><h3>' + T.ticketTitle + '</h3>';
    T.ticketItems.forEach((it, k) => {
      const key = 'tk' + k;
      h += '<fieldset class="tk"><legend>' + (k + 1) + '. ' + it.q + '</legend>' + shuffledOpts(key, it.o, key, 'ticket.' + k, tk[k]);
      if (tk.checked && tk[k] != null) {
        const ok = rightAns(key, tk[k]);
        // lote 2D: første «Sjekk svar» sier bare riktig/ikke helt; riktig svar og forklaring vises når svaret er riktig eller ved andre sjekk
        if (ok || (tk.tries || 0) >= 2) h += '<p class="' + (ok ? 'ok' : 'warn') + '">' + (ok ? '✔ ' : '✘ ') + T.tkRight(it.o[it.o.findIndex((x, v) => rightAns(key, v))]) + ' ' + sec().tkfb[k] + '</p>';
        else h += '<p class="warn">✘ ' + T.tkTryAgain + '</p>';
      }
      h += '</fieldset>';
    });
    return h + '<button type="button" class="btn" data-act="tkcheck">' + T.ticketCheck + '</button></section><div class="row"><button type="button" class="btn btn--primary btn--lg" data-act="goto" data-view="card">' + T.toCard + '</button></div>';
  }

  const BADGE_IMG = { felle: 'badge-fellefinner', magefolelse: 'badge-magefolelse-mestere', rapport: 'badge-rapportstjerner', jamovi: 'badge-jamovi-laget', alle: 'badge-alle-med', proveigjen: 'badge-prov-igjen-laget' };
  function helpSummaryHtml(sc) {
    const H = sc.help, rows = C.help.order.map(t => '<tr><th scope="row">' + T.help.types[t].name + '</th><td>' + H.by[t] + '</td><td>' + (H.by[t] ? (H.pts[t] > 0 ? MINUS + H.pts[t] : '0 (gratis)') : '–') + '</td></tr>').join('');
    return '<table class="helptable"><thead><tr>' + T.cardHelpCols.map(c => '<th scope="col">' + c + '</th>').join('') + '</tr></thead><tbody>' + rows + '</tbody></table>' +
      '<p>' + (H.n ? T.cardHelpSome(H.n, H.sum) + (H.free ? ' ' + H.free + ' av dem var gratis.' : '') : T.cardHelpNone) + (sc.clamped ? ' ' + T.cardHelpClamp : '') + '</p>';
  }
  function vCard() {
    const sm = summary(), sc = scoreNow(), best = loadBest();
    const names = ['velg', 'kjor', 'rapporter'];
    const counts = { velg: sm.velg + ' av ' + sm.velgItems.length, kjor: sm.kjor + ' av ' + sm.kj.length, rapporter: sm.rep + ' av 5 (første innlevering)' };
    const stars = '<ul class="stars" id="cardStars" aria-label="Stjerner">' + names.map(k => '<li class="stars__item' + (sm.stars[k] ? ' is-on' : '') + '"><span class="star' + (sm.stars[k] ? ' is-on' : '') + '"></span><span><span class="stars__name">' + T.stars[k] + '</span><small class="stars__state">' + (sm.stars[k] ? T.starLit : T.starOff) + '</small><small>' + counts[k] + '</small></span></li>').join('') + '</ul>' +
      '<p class="star-total">' + T.starCount(sm.count) + '</p>' + names.filter(k => !sm.stars[k]).map(k => '<p class="muted">' + T.stars[k] + ': ' + T.starHint[k] + '</p>').join('');
    const mast = [], nxt = [];
    if (sm.kjor >= 2) mast.push(T.mastered.jamovi); else nxt.push(T.nextSteps.jamovi);
    if (sm.rep >= 4) mast.push(T.mastered.report); else nxt.push(T.nextSteps.report);
    if (sm.tot && sm.ok / sm.tot >= 0.5) mast.push(T.mastered.dec);
    if (sm.sure >= 2 && sm.sureOk / sm.sure >= 0.75) mast.push(T.mastered.calib);
    nxt.push(T.nextSteps.nullNotZero); if (!sm.stars.velg) nxt.push(T.nextSteps.power); nxt.push(T.nextSteps.always); mast.push(T.mastered.always);
    // Medaljer: alltid de fem, med kriterium og tilstand (ikke bare farge: tekst i tillegg)
    const bd = sm.medals.map(m => '<li class="badge badge--' + m.state + (m.state === 'oppnadd' ? ' is-new' : '') + '"><img class="badge__medal" src="../_shared/assets/' + BADGE_IMG[m.key] + '.svg" alt=""><span class="badge__name">' + T.badges[m.key][1] + '</span>' +
      '<span class="badge__state">' + T.medalState[m.state] + (m.state === 'oppnadd' ? '' : ' (' + T.medalProg(Math.min(m.have, m.need), m.need) + ')') + '</span><span class="badge__desc">' + T.medalRule[m.key] + '</span></li>').join('');
    const cells = Math.min(sm.sure, 12);
    const meter = sm.sure ? '<div class="meter" role="img" aria-label="' + esc(T.confSummary(sm.sure, sm.sureOk)) + '"><div class="meter__track">' + Array.from({ length: cells }, (_, k) => '<span class="meter__cell ' + (k < Math.round(sm.sureOk / sm.sure * cells) ? 'is-right' : 'is-miss') + '"></span>').join('') + '</div><span class="num">' + sm.sureOk + '/' + sm.sure + '</span></div>' : '';
    const date = new Date(st.date).toLocaleDateString('nb-NO');
    const L_ = st.rep.last;
    return '<h2 class="sr-only" data-focus tabindex="-1">' + T.cardTitle + '</h2>' + taskBox('card') + '<article class="challenge-card" id="challengeCard" aria-label="' + T.cardTitle + '"><header class="challenge-card__head"><div><h2>' + T.title + ' – ' + T.cardTitle + '</h2><p class="challenge-card__team">' + T.cardTeam + ': <strong>«' + esc(st.alias) + '»</strong>' + (st.motto ? ' · ' + T.cardMotto + ': «' + esc(st.motto) + '»' : '') + ' · ' + date + '</p></div><img src="../_shared/assets/logo-treningslaben.svg" alt="" width="48" height="48"></header>' +
      '<section class="challenge-card__section"><h3>' + T.cardStars + '</h3>' + stars + '</section>' +
      '<section class="challenge-card__section"><h3>' + T.cardBadges + '</h3><ul class="badge-grid">' + bd + '</ul></section>' +
      (sm.sure ? '<section class="challenge-card__section"><h3>' + T.cardConf + '</h3><p>' + T.confSummary(sm.sure, sm.sureOk) + '</p>' + meter + '</section>' : '') +
      '<section class="challenge-card__section"><h3>' + T.cardScore + '</h3><p class="challenge-card__result"><span class="count-up" id="finalScore" aria-hidden="true" style="--to:' + sc.final + '"></span><span class="sr-only">' + sc.final + '</span></p>' +
      '<p class="eqline"><strong>' + T.cardEq(fmt(sc.eq.round, 0), fmt(sc.eq.help, 0), fmt(sc.eq.final, 0)) + '</strong></p><p class="small">' + T.cardScoreNote + '</p>' +
      '<p>' + T.cardFinalText(sm.ok, sm.tot) + '<br><span class="small">' + T.cardRegText + '</span></p></section>' +
      '<section class="challenge-card__section"><h3>' + T.cardHelpTitle + '</h3>' + helpSummaryHtml(sc) + '</section>' +
      '<section class="challenge-card__section"><h3>' + T.cardReport + '</h3><p class="quote no-gl">' + (st.rep.text ? esc(stripTemplate(st.rep.text)) : '–') + '</p>' + (L_ && L_.items ? '<ul class="checklist">' + L_.items.map(it => { const li = T.reportList.find(x => x[0] === it.id); return '<li class="' + (it.state === 'ok' ? 'is-yes' : it.state === 'avvik' ? 'is-warn' : 'is-no') + '">' + (li ? li[1] : it.id) + '</li>'; }).join('') + '</ul>' : '') + '</section>' +
      '<section class="challenge-card__section challenge-card__cols"><div><h3>' + T.cardMastered + '</h3><ul class="bullets bullets--plus">' + mast.slice(0, 2).map(x => '<li>' + x + '</li>').join('') + '</ul></div><div><h3>' + T.cardNext + '</h3><ul class="bullets bullets--next">' + nxt.slice(0, 2).map(x => '<li>' + x + '</li>').join('') + '</ul></div></section>' +
      '<footer class="challenge-card__foot">' + T.privacy + (best ? ' ' + T.best + ': ' + best.stars + ' av 3 stjerner.' : '') + '</footer></article>' +
      '<div class="row no-print"><button type="button" class="btn" data-act="print">' + T.btnPrint + '</button> <button type="button" class="btn" data-act="copy">' + T.btnCopy + '</button> <button type="button" class="btn btn--primary" data-act="again">' + T.btnAgain + '</button></div><p id="copyfb" role="status" class="small"></p>' +
      '<section class="card no-print" id="boardSend" hidden><p>' + T.boardSend + ' ' + T.boardWarn + '</p><button type="button" class="btn btn--primary" data-act="send">' + T.boardSendBtn + '</button> <button type="button" class="btn" data-act="board">' + T.boardOpen + '</button><p role="status" id="sendfb" class="small"></p></section>';
  }
  function cardFx() {
    const sm = summary(), sc = scoreNow(), list = document.getElementById('cardStars');
    if (window.FX) {
      if (list) window.FX.lightStars(list, ['velg', 'kjor', 'rapporter'].map(k => sm.stars[k]));
      const cs = document.getElementById('finalScore'); if (cs) window.FX.countUp(cs, sc.final);
      if (sm.count >= 2 || sm.badges.length) window.FX.confetti(document.getElementById('challengeCard'), 28);
    }
  }

  /* ---------- rendering ---------- */
  let lastKey = null, aliasField = null;
  function render(focus) {
    const v = st.view;
    let body = v === 'howto' ? vHowto() : v === 'intro' ? vIntro() : v === 'roles' ? vRoles() : v === 'practice' ? vPractice() : v === 'round' ? vRound() : v === 'report' ? vReport() : v === 'long' ? vLong() : v === 'debrief' ? vDebrief() : vCard();
    const key = v + '|' + st.r + '|' + st.ph, changed = key !== lastKey; lastKey = key;
    if (changed) { const tt = document.getElementById('toast'); if (tt) tt.classList.remove('is-on'); }
    app.innerHTML = header() + '<main id="main" class="container stack content' + (changed ? ' anim-slide-in' : '') + '">' + body + '</main>';
    st.pulse = false;
    if (!st.t0 && v !== 'howto' && v !== 'intro') st.t0 = Date.now();
    document.title = T.title + (v === 'howto' ? '' : ' – ' + (steps().find(s => s[0] === stepKey()) || [0, ''])[1]);
    aliasField = null;
    if (v === 'intro' || v === 'howto') { const ai = document.getElementById('alias'); if (ai) aliasField = A.bindField(ai, document.getElementById('aliasErr')); }
    if (v === 'long') paintGrids();
    animatePower();
    refreshBoardUi();
    if (window.Glossary) window.Glossary.enhance(app.querySelector('main'), { max: 14 });
    window.TidsRing.tick(st.t0, MD.targetMin, MD.summaryMin);
    if (focus !== false) { const el = app.querySelector('[data-focus]'); if (el) { el.focus({ preventScroll: true }); window.scrollTo(0, 0); } }
    if (v === 'card') { saveBest(summary().count); if (changed) cardFx(); }   // beste forsøk
    save();
  }
  function refreshBoardUi() {
    const on = !!(window.Klassetavla && window.Klassetavla.enabled);
    const b = document.getElementById('boardBtn'); if (b) b.hidden = !on;
    const s = document.getElementById('boardSend'); if (s) s.hidden = !on;
  }

  /* ---------- hendelser ---------- */
  function setPath(path, val) {
    const parts = path.split('.'); let o = st;
    for (let k = 0; k < parts.length - 1; k++) o = o[parts[k]];
    o[parts[parts.length - 1]] = val;
  }
  app.addEventListener('input', ev => {
    const t = ev.target;
    if (t.dataset.ent) { const [k, f] = t.dataset.ent.split('.'); (st.ent[k] = st.ent[k] || {})[f] = t.value; save(); return; }
    if (t.dataset.bind && (t.tagName === 'TEXTAREA' || t.type === 'text' || t.type === 'number')) {
      setPath(t.dataset.bind, t.value);
      if (t.dataset.touch) st.rep.touched = true;
      if (t.dataset.bind.endsWith('.just')) { const i = +t.dataset.bind.split('.')[1], ok = !C.justificationRounds.includes(i) || wc(t.value) >= 3, b = document.getElementById('lockBtn'); if (b) b.disabled = !ok; const h = document.getElementById('lockHint'); if (h) h.hidden = ok; }
      save();
    }
  });
  app.addEventListener('change', ev => {
    const t = ev.target;
    if (t.dataset.actChange === 'lsel') { st.longSel = +t.value; render(false); return; }
    if (t.dataset.actChange === 'ld') { st.longD = +t.value; render(false); return; }
    if (!t.dataset.bind) return;
    let val = t.type === 'checkbox' ? t.checked : t.value;
    if (t.dataset.num !== undefined) val = Number(val);
    if (t.dataset.bind === 'size' || t.dataset.bind === 'lag') val = Number(val);
    setPath(t.dataset.bind, val);
    if (t.dataset.panel !== undefined) { const i = st.r; document.getElementById('designPanel').innerHTML = designPanelHtml(i); animatePower(); save(); return; }
    // beslutnings-/svarvalg som styrer aktiverte knapper
    const b = t.dataset.bind;
    if (b === 'mode') { render(false); const el = app.querySelector('input[data-bind="mode"][value="' + t.value + '"]'); if (el) el.focus(); return; }
    if (/^rounds\.\d\.(dec|conf|quiz|quizConf)$/.test(b) || /^dir\./.test(b)) { render(false); const el = app.querySelector('input[data-bind="' + b + '"][value="' + t.value + '"]'); if (el) el.focus(); return; }
    save();
  });
  app.addEventListener('toggle', ev => { const d = ev.target; if (d && d.dataset && d.dataset.jam) { st.ui = st.ui || { jam: {} }; st.ui.jam = st.ui.jam || {}; st.ui.jam[d.dataset.jam] = d.open; save(); } }, true);
  app.addEventListener('submit', ev => {
    ev.preventDefault();
    if (ev.target.id !== 'introForm') return;
    const r = aliasField ? aliasField.check(true) : A.validate(st.alias);
    if (!r.ok) { document.getElementById('alias').focus(); return; }
    st.alias = r.value; st.motto = A.clean(st.motto).slice(0, 40); A.save(st.alias, st.motto);
    st.prior = (loadBest() || {}).stars != null ? loadBest().stars : null;
    const hs = Array.from(A.key ? A.key(st.alias) : st.alias.toLowerCase()).reduce((a, c) => (a * 31 + c.charCodeAt(0)) >>> 0, 7);
    st.lag = 1 + hs % 8; st.set = (hs >> 3) % 2 ? 'B' : 'A';          // lote 2B: lagnummer og sett utledes fra lagnavnet (ikke vist)
    st.t0 = Date.now(); st.view = 'round'; st.r = 0; st.ph = 'brief'; render();
  });
  setInterval(() => { try { window.TidsRing.tick(st.t0, MD.targetMin, MD.summaryMin); } catch (e) { /* ok */ } }, 20000);
  function downloadCsv(name, text) {
    try {
      const blob = new Blob([text + '\n'], { type: 'text/csv;charset=utf-8' }), a = document.createElement('a');
      a.href = URL.createObjectURL(blob); a.download = name; document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 2000);
    } catch (e) { window.alert('Nedlasting feilet i denne nettleseren.'); }
  }
  function cardText() {
    const sm = summary(), sc = scoreNow(), hs = sc.help;
    return [T.title + ' – lag «' + st.alias + '»' + (st.motto ? ' – ' + st.motto : ''),
      T.starCount(sm.count) + ': ' + ['velg', 'kjor', 'rapporter'].map(k => (sm.stars[k] ? '★ ' : '☆ ') + T.stars[k]).join(', '),
      'Utmerkelser: ' + sm.medals.map(m => T.badges[m.key][1] + ' (' + T.medalState[m.state] + ')').join(', '),
      T.confSummary(sm.sure, sm.sureOk), T.cardFinalText(sm.ok, sm.tot),
      T.cardEq(sc.eq.round, sc.eq.help, sc.eq.final), T.cardHelpTitle + ': ' + C.help.order.map(t => T.help.types[t].name + ' ' + hs.by[t]).join(', '),
      'Rapport: ' + (st.rep.text || '–'), T.privacy].join('\n');
  }
  app.addEventListener('click', ev => {
    const t = ev.target.closest('[data-act]'); if (!t) return;
    const act = t.dataset.act;
    if (act === 'csv') { downloadCsv(t.dataset.name, t.dataset.csv); return; }
    if (act === 'suggest') { const el = document.getElementById('alias'); st.sug = ((st.sug == null ? Math.floor(Math.random() * T.aliasNames.length) : st.sug + 1)) % T.aliasNames.length; st.alias = T.aliasNames[st.sug]; el.value = st.alias; if (aliasField) aliasField.reset(); el.focus(); return; }
    if (act === 'goto') { st.view = t.dataset.view; render(); return; }
    if (act === 'startRound') { st.view = 'round'; st.r = +t.dataset.r; st.ph = 'brief'; render(); return; }
    if (act === 'ph') { st.ph = t.dataset.ph; render(); return; }
    if (act === 'help') {
      const sy = window.scrollY, type = t.dataset.type, ctx = t.dataset.ctx;
      useHelp(type, ctx); render(false); window.scrollTo(0, sy);
      const out = document.getElementById(type === 'fasit' ? 'fb' : type === 'modell' ? 'ho_model' : type === 'hint' ? 'ho_' + ctx.replace(/\W/g, '_') : 'designPanel');
      if (out) out.focus({ preventScroll: true });
      return;
    }
    if (act === 'lock') { st.rounds[st.r].locked = true; st.ph = C.jamoviRounds.includes(st.r) ? 'study' : 'decide'; st.pulse = true; render(); return; }
    if (act === 'entry') {
      const key = t.dataset.key, s = key === 'practice' ? practiceStudy() : key === 'rep' ? reportStudy() : studyFor(+key.slice(1)), e = st.ent[key];
      const res = checkEntry(key, s.tt); e.last = res; e.tries = (e.tries || 0) + 1;
      if (res.ok) { e.ok = true; e.flip = res.flip; }
      render(false); const fb = document.getElementById('fb'); if (fb) fb.focus(); return;
    }
    if (act === 'reveal') {
      const i = st.r, R = st.rounds[i]; R.done = true; st.ph = 'reveal'; render(); return;
    }
    if (act === 'nextRound') {
      const nx = nextInPlay(st.r); if (nx >= 0) { st.r = nx; st.ph = 'brief'; render(); } else { st.view = 'report'; render(); } return;
    }
    if (act === 'addExtra') { const r = +t.dataset.r; st.extra = st.extra || {}; st.extra[r] = true; st.r = r; st.ph = 'brief'; render(); return; }
    if (act === 'showres') { const e = st.ent[t.dataset.key] = st.ent[t.dataset.key] || {}; e.shown = true; e.byTime = true; render(false); return; }
    if (act === 'ffcheck') { st.ff = st.ff || { sel: {}, checked: false }; st.ff.checked = true; render(false); return; }
    if (act === 'rotdone') { st.rot[+t.dataset.r] = true; render(false); return; }
    if (act === 'toSummary') { st.view = 'debrief'; render(); return; }
    if (act === 'tpl') { st.rep.text = template(reportStudy()); st.rep.touched = false; render(false); return; }
    if (act === 'repcheck') {
      const ta = document.getElementById('reptxt'); if (ta) st.rep.text = stripTemplate(ta.value);
      const r = checkReport(st.rep.text, reportStudy()), rp = st.rep; rp.last = r; rp.tries = (rp.tries || 0) + 1; rp.best = Math.max(rp.best, r.nOk);
      if (!rp.first) rp.first = { nOk: r.nOk, star: r.star, medal: r.medal, hard: r.hard.map(x => x.id), warn: r.warn.map(x => x.id) };      // PRIMER envio: de el salen ★ Rapporter y Rapportstjerner
      else if (!rp.first.star && r.star) rp.retryOk = true;                                                                                // Prøv igjen-laget
      if (r.star) rp.done = true;
      render(false); const fb = document.getElementById('repfb'); if (fb) { fb.setAttribute('tabindex', '-1'); fb.focus(); } return;
    }
    if (act === 'repskip') { st.rep.done = true; st.rep.skipped = true; render(false); return; }
    if (act === 'tkcheck') { st.ticket.checked = true; st.ticket.tries = (st.ticket.tries || 0) + 1; render(false); return; }
    if (act === 'print') { window.print(); return; }
    if (act === 'copy') { const fb = document.getElementById('copyfb'); try { navigator.clipboard.writeText(cardText()).then(() => { fb.textContent = T.copied; }, () => { fb.textContent = cardText(); }); } catch (e) { fb.textContent = cardText(); } return; }
    if (act === 'again') {
      const alias = st.alias, motto = st.motto, lag = st.lag, size = st.size, set = st.set === 'A' ? 'B' : 'A';
      st = newState(); st.alias = alias; st.motto = motto; st.lag = lag; st.size = size; st.set = set; st.prior = (loadBest() || {}).stars != null ? loadBest().stars : null; st.view = 'round'; st.r = 0; st.ph = 'brief'; st.t0 = Date.now(); render(); return;
    }
    if (act === 'send') {
      const sm = summary(), sc = scoreNow(), fb = document.getElementById('sendfb'); fb.textContent = '…';
      window.Klassetavla.send(C.gameId, st.alias, sm.count, { poeng: sc.final, hjelp: sc.help.by, hjelpPoeng: sc.deducted, modus: modeOf(), hjelpRunder: st.help.log.reduce((a, e) => { const r = 'r' + roundOfCtx(e.ctx); a[r] = (a[r] || 0) + 1; return a; }, {}) }).then(ok => { fb.textContent = ok ? T.boardSent : T.boardFail; if (ok) { st.sent = true; save(); openBoard(); } });
      return;
    }
    if (act === 'board') { openBoard(); return; }
  });
  let stopBoard = null;
  function openBoard() {
    let dlg = document.getElementById('boardDlg');
    if (!dlg) { dlg = document.createElement('dialog'); dlg.id = 'boardDlg'; dlg.className = 'modal'; dlg.setAttribute('aria-labelledby', 'boardH'); dlg.innerHTML = '<div class="modal__body"><h2 id="boardH">' + T.boardTitle + '</h2><p class="small">' + T.boardWarn + '</p><div id="boardBody" aria-live="polite"></div></div><form method="dialog" class="modal__foot"><button class="btn btn--primary">Lukk</button></form>'; document.body.appendChild(dlg);
      dlg.addEventListener('close', () => { if (stopBoard) { stopBoard(); stopBoard = null; } }); }
    if (typeof dlg.showModal === 'function') dlg.showModal(); else dlg.setAttribute('open', '');
    if (stopBoard) stopBoard();
    stopBoard = window.Klassetavla.mount(document.getElementById('boardBody'));
  }


  A.onChange(v => { st.alias = v.alias; st.sent = false; save(); render(false); });
  const renameBtn = document.getElementById('renameBtn'); if (renameBtn) A.wireButton(renameBtn);

  // «Ord i spillet» som vindu fra begrepene i teksten (Glossary.enhance → «Alle ord i spillet»)
  if (window.Glossary) window.Glossary.openAll = () => {
    let dlg = document.getElementById('glossDlg');
    if (!dlg) { dlg = document.createElement('dialog'); dlg.id = 'glossDlg'; dlg.className = 'modal'; dlg.setAttribute('aria-labelledby', 'glossH'); document.body.appendChild(dlg); }
    dlg.innerHTML = '<div class="modal__body"><h2 id="glossH">' + T.glossary.summary + '</h2><dl class="dl">' + T.glossary.items.map(x => '<dt>' + x[0] + '</dt><dd>' + x[1] + '</dd>').join('') + '</dl><button type="button" class="btn" id="glossClose">Lukk</button></div>';
    dlg.querySelector('#glossClose').addEventListener('click', () => dlg.close());
    if (typeof dlg.showModal === 'function') dlg.showModal(); else dlg.setAttribute('open', '');
  };

  // Valgfri klassetavle: ingen feil her kan stoppe spillet
  try { if (window.Klassetavla) window.Klassetavla.init().then(refreshBoardUi, () => {}); } catch (e) { /* ok */ }


  /* (bloque de depuracion retirado por publicar.js) */
  render();
})();
