
(function (root) {
  'use strict';

  var MSG = {
    // ---- fallos duros: contenido ----
    absence: 'Feil: et ikke-signifikant resultat viser ikke «ingen effekt», «ingen forskjell» eller «virker ikke». Skriv for eksempel «Det ble ikke funnet tilstrekkelig belegg for en forskjell» eller «en effekt kan ikke utelukkes».',
    proof: 'Feil: et enkelt datasett «beviser» eller «bekrefter» ikke noe. Skriv «støtter» eller «er forenlig med» og nevn usikkerheten.',
    h0true: 'Feil: vi «aksepterer» ikke H₀ og H₀ er ikke «bevist sann». Vi forkaster H₀, eller vi forkaster ikke H₀.',
    misread: 'Feil: p og KI sier ikke «95 % sikker» eller «sannsynligheten for at H₀ er sann». p er sannsynligheten for å få data minst like ekstreme som disse hvis H₀ er sann.',
    signif: 'Feil: «signifikant» stemmer ikke med p-verdien og α. Signifikant betyr p < α; ikke signifikant betyr p ≥ α.',
    causal: 'Feil: korrelasjon viser ikke årsak. Bruk «sammenheng» eller «assosiasjon» og nevn tverrsnitt eller tredjevariabler.',
    ordinal: 'Feil: subskalaen (et gjennomsnitt) behandles som en kontinuerlig variabel her, ikke som ordinal.',
    // ---- fallos duros: tall ----
    p000: 'Feil: «p = .000» finnes ikke. Skriv «p < .001».',
    pWrong: 'Feil: p-verdien stemmer ikke med Jamovi-utskriften.',
    pLt001: 'Feil: «p < .001» passer bare når p er under .001. Skriv eksakt p (for eksempel p = .095).',
    tWrong: 'Feil: t-verdien stemmer ikke med Jamovi-utskriften.',
    dfWrong: 'Feil: frihetsgradene stemmer ikke (to grupper: df = n₁ + n₂ − 2; korrelasjon: df = n − 2).',
    dWrong: 'Feil: Cohens d stemmer ikke med Jamovi-utskriften.',
    dLabel: 'Feil: ordet for effektstørrelsen passer ikke med d (under 0,2 triviell, 0,2–0,5 liten, 0,5–0,8 middels, over 0,8 stor).',
    ciInverted: 'Feil: KI er skrevet baklengs. Den laveste verdien kommer først: [nedre, øvre].',
    ciWrong: 'Feil: tallene i KI-et stemmer ikke med Jamovi-utskriften.',
    ciSign: 'Feil: fortegnet på KI-et passer ikke med fortegnet på forskjellen. Bruk samme retning (Program − Kontroll) i begge.',
    rWrong: 'Feil: r stemmer ikke med Jamovi-utskriften.',
    rhoWrong: 'Feil: ρ stemmer ikke med Jamovi-utskriften.',
    dirWrong: 'Feil: retningen (positiv/negativ) stemmer ikke med fortegnet på r.',
    sizeWrong: 'Feil: ordet for hvor sterk sammenhengen er (neglisjerbar, svak, moderat, sterk) passer ikke med |r| (Tabell 10.4: under .10 neglisjerbar, .10–.30 svak, .30–.50 moderat, over .50 sterk).',
    // ---- avisos de formato ----
    zeroP: 'Formatråd: p skrives uten innledende null (p = .095, ikke p = 0.095).',
    zeroR: 'Formatråd: r skrives uten innledende null (r = .49, ikke r = 0.49).',
    pDecimals: 'Formatråd: oppgi p med tre desimaler, slik Jamovi gjør (p = .095).',
    pNoExact: 'Formatråd: oppgi eksakt p-verdi (p = .023), ikke bare «p < .05». Unntak: p < .001.',
    ciNo95: 'Formatråd: skriv «95 % KI [a, b]» slik at det går fram at det er et 95 %-intervall.',
    // ---- elementos que faltan ----
    miss: {
      desc: 'Mangler gjennomsnitt, SD og n for begge grupper (med riktige tall).',
      test: 'Mangler t(df) og p med riktige verdier.',
      ci: 'Mangler forskjellen med 95 % KI.',
      es: 'Mangler Cohens d og størrelsen i ord (triviell, liten, middels eller stor).',
      interp: 'Tolkningen mangler eller er for kort. Skriv hva vi kan og ikke kan slutte, og nevn usikkerheten.',
      dir: 'Mangler retning og størrelse i ord (for eksempel «positiv, moderat sammenheng»).',
      apa: 'Mangler r(df) = …, p = … og n i APA-format.',
      el4: 'Mangler uteliggeren (med og uten) og hvorfor Spearman, eller variabeltypen (gjennomsnitt av items, kontinuerlig, Pearson).',
      caus: 'Mangler en begrensning (tverrsnitt, tredjevariabel), eller teksten uttaler seg om årsak.'
    }
  };

  var DEF_TOL = { rel: 0.02, absMin: 0.0006, p: 0.0015, t: 0.02, d: 0.015, r: 0.02 };
  var NUM = '-?(?:\\d+(?:[.,]\\d+)?|[.,]\\d+)';
  var EXEMPT = /(kan\s+ikke|betyr\s+ikke|ikke\s+det\s+samme\s+som|ikke\s+(?:belegg|bevis|tilstrekkelig)|ikke\s+påvist|ikke\s+nødvendigvis|ikke\s+at\b|inkluderer|inneholder|omfatter|forenlig|utelukke)/i;

  function norm(t) { return String(t == null ? '' : t).replace(/[−–‒—]/g, '-').replace(/ /g, ' '); }
  function toNum(s) { return parseFloat(String(s).replace(/\s/g, '').replace(',', '.')); }
  function tolX(ctx, x) {
    var T = ctx.tol, half = ctx.dp != null ? 0.5 * Math.pow(10, -ctx.dp) * 1.001 : 0;
    return Math.max(T.rel * Math.abs(x), T.absMin, half);
  }
  function nearX(ctx, v, x) { return Math.abs(v - x) <= tolX(ctx, x); }
  function nearXs(ctx, v, x) { return nearX(ctx, v, x) || nearX(ctx, v, -x); }

  /* Tall i teksten. Innenfor [ ] uten «;» skiller komma endepunktene («95 % KI [a, b]»). */
  function numsIn(text) {
    var t = norm(text).replace(/_+/g, ' ');
    t = t.replace(/\[([^\[\]]*)\]/g, function (m, inner) { return inner.indexOf(';') < 0 && /\d\s*,/.test(inner) ? '[' + inner.replace(/,/g, ' ; ') + ']' : m; });
    var out = [], re = new RegExp(NUM, 'g'), m;
    while ((m = re.exec(t))) out.push(toNum(m[0]));
    return out;
  }

  /* Oppdeling i setninger og leddsetninger. Negasjon gjelder bare innenfor samme ledd. */
  function clauses(text) {
    var out = [];
    norm(text).replace(/_+/g, ' ').split(/(?<=[.!?])\s+|\n+/).forEach(function (s) {
      s.split(/[;,]|\b(?:så|derfor|dermed|altså|men|og)\b/i).forEach(function (c) { if (c.trim()) out.push(c.trim()); });
    });
    return out;
  }

  /* ---- fallos duros por contenido (compartido) ---- */
  function contentHard(text, ctx) {
    var found = [], cl = clauses(text);
    function add(id) { if (found.indexOf(id) < 0) found.push(id); }
    cl.forEach(function (c) {
      var m, ex = EXEMPT.test(c), hasNot = /\bikke\b/i.test(c);
      // ausencia como evidencia
      m = /\b(?:ingen|ikke\s+noen|ikke\s+noe)\s+(?:[a-zæøå-]+\s+){0,2}?(?:effekt|forskjell|sammenheng|virkning|endring)/i.exec(c);
      if (m && !ex && !/signifikant|statistisk|belegg|bevis/i.test(m[0])) add('absence');
      if (/\b(?:har|hadde|gir|ga)\s+ikke\s+(?:noen\s+)?(?:effekt|virkning)/i.test(c) && !ex) add('absence');
      if (/\b(?:virker|virket|fungerer)\s+ikke\b|\bikke\s+(?:virker|virket|fungerer)\b/i.test(c) && !ex) add('absence');
      // prueba o certeza
      if ((/\b(?:bevist|beviser|beviste|bevise|bevises)\b/i.test(c) || /\bbekrefter\s+(?:at\s+)?(?:H\s*[0₀₁1]|hypotes|nullhypotes)/i.test(c)) && !hasNot && !ex) add('proof');
      if ((/\bH\s*[0₀]\s+er\s+(?:sann|riktig|bekreftet)/i.test(c) || /\b(?:aksepter\w*|godta\w*)\s+(?:nullhypotes\w*|H\s*[0₀])/i.test(c) || /\bnullhypotesen\s+er\s+(?:sann|riktig)/i.test(c)) && !ex && !hasNot) add('h0true');
      // lectura erronea de p / KI
      if ((/95\s*%\s*(?:sikker|sikkert|sannsynlig)/i.test(c) || /sannsynlighet(?:en)?\s+for\s+at\s+(?:H\s*[0₀]|nullhypotesen)\s+er\s+sann/i.test(c) ||
        /\d+(?:[.,]\d+)?\s*%\s*(?:sjanse|sannsynlighet)\s+for\s+at\s+(?:effekten|programmet|H\s*[0₀])/i.test(c) || /\bp\s+(?:forteller|sier)\s+(?:oss\s+)?hvor\s+stor/i.test(c)) && !ex) add('misread');
    });
    // «signifikant» incoherente con p (solo t-test, un unico p de referencia)
    if (ctx.kind === 'ttest' && ctx.tt && ctx.tt.p != null) {
      var sigP = ctx.tt.p < (ctx.alpha || 0.05);
      cl.forEach(function (c) {
        if (!/signifikant\b/i.test(c) || /\b(?:hvis|dersom|selv om|for å|ville|kunne|må)\b/i.test(c)) return;
        var neg = /\b(?:ikke|ingen|uten)\b/i.test(c);
        if ((!neg && !sigP) || (neg && sigP)) add('signif');
      });
    }

    if (ctx.kind === 'corr') {
      var KAUSAL = /\b(?:førte\s+til|fører\s+til|forårsaket|forårsaker|forårsak\w*|bevist|beviser|skyldes|resulterte\s+i|årsaken\s+til)\b/i;
      cl.forEach(function (c) { if (KAUSAL.test(c) && !/\b(?:ikke|ingen|kan\s+ikke|betyr\s+ikke)\b/i.test(c)) add('causal'); });
    }
    return found;
  }

  /* ---- p-verdier ---- */
  function readP(t) {
    var re = new RegExp('(?:^|[^a-zæøåA-ZÆØÅ])p\\s*([=<>])\\s*(' + '\\d*[.,]?\\d+' + ')', 'g'), out = [], m;
    while ((m = re.exec(t))) out.push({ op: m[1], raw: m[2], v: toNum(m[2]) });
    return out;
  }
  function pFormat(entry) {   // devuelve lista de avisos de formato para un p escrito con «=»
    var w = [], raw = entry.raw;
    if (/^0[.,]/.test(raw)) w.push('zeroP');
    var dec = (raw.split(/[.,]/)[1] || '').length;
    if (entry.op === '=' && dec !== 3) w.push('pDecimals');
    return w;
  }
  /* Comprueba los p escritos contra los p aceptables. Devuelve { hard:'id'|null, warn:[...], found:bool, ok:bool } */
  function checkP(t, ctx, accept, loose) {
    var ps = readP(t), res = { hard: null, warn: [], found: ps.length > 0, ok: false }, anyEq = false;
    var tolP = ctx.tol.p, minP = Math.min.apply(null, accept);
    ps.forEach(function (e) {
      if (e.op === '=') {
        anyEq = true;
        if (e.v === 0) { res.hard = res.hard || 'p000'; return; }
        var decs = (e.raw.split(/[.,]/)[1] || '').length, tolE = Math.max(tolP, 0.5 * Math.pow(10, -decs) * 1.001);   // media unidad del ultimo decimal escrito
        var match = accept.some(function (a) { return Math.abs(e.v - a) <= tolE; });
        if (!match) { if (loose) res.loose = true; else res.hard = res.hard || 'pWrong'; return; }
        pFormat(e).forEach(function (w) { if (res.warn.indexOf(w) < 0) res.warn.push(w); });
      } else if (e.op === '<') {
        if (e.v <= 0.001 + 1e-9) { if (minP >= 0.001 && !loose) res.hard = res.hard || 'pLt001'; else if (minP >= 0.001) res.loose = true; }
        else if (!(minP < e.v)) res.hard = res.hard || 'pWrong';
        if (/^0[.,]/.test(e.raw) && res.warn.indexOf('zeroP') < 0) res.warn.push('zeroP');
      }
    });
    if (ps.length && !anyEq && ps.every(function (e) { return e.op === '<' && e.v > 0.001 + 1e-9; })) res.warn.push('pNoExact');
    res.ok = ps.length > 0 && !res.hard && !res.loose;
    return res;
  }

  /* ---- Cohens d: ord ---- */
  var DWORDS = '(?:triviell|svært\\s+liten|liten|svak|moderat|middels|medium|stor|sterk)';
  function dBandOk(word, ad) {
    var w = word.toLowerCase(), s = 0.05;
    if (/triviell/.test(w)) return ad < 0.2 + s;
    if (/liten|svak/.test(w)) return ad >= 0.2 - s && ad < 0.5 + s;
    if (/moderat|middels|medium/.test(w)) return ad >= 0.5 - s && ad < 0.8 + s;
    if (/stor|sterk/.test(w)) return ad >= 0.8 - s;
    return true;
  }
  function rBandOk(word, ar) {
    var w = word.toLowerCase(), s = 0.05;
    if (/neglisjerbar/.test(w)) return ar < 0.1 + s;
    if (/svak/.test(w)) return ar >= 0.1 - s && ar < 0.3 + s;
    if (/moderat|middels/.test(w)) return ar >= 0.3 - s && ar < 0.5 + s;
    if (/sterk/.test(w)) return ar >= 0.5 - s;
    return true;
  }

  function item(id, state, msg) { return { id: id, state: state, msg: msg || '' }; }

  /* =========================== t-test (6C) =========================== */
  function checkTtest(text, ctx) {
    var tt = ctx.tt, t0 = norm(text), nums = numsIn(text), warns = {}, hardItem = {};
    function has(x, signed) { return nums.some(function (v) { return nearX(ctx, v, x) || (signed && nearX(ctx, v, -x)); }); }
    var items = {};
    function addWarn(id, key) { (warns[id] = warns[id] || []).push(key); }
    // 1 desc
    var cM = (t0.match(/\bM\s*=/g) || []).length, cS = (t0.match(/\bSD\s*=/g) || []).length;
    var descOk = cM >= 2 && cS >= 2 && has(tt.m1) && has(tt.m2) && has(tt.s1) && has(tt.s2) && nums.indexOf(ctx.n) >= 0;
    items.desc = descOk ? item('desc', 'ok') : item('desc', 'falta', MSG.miss.desc);
    // 2 test: t(df) og p
    var tm = new RegExp('\\bt\\s*\\(\\s*(\\d+)\\s*\\)\\s*=\\s*(' + NUM.replace('-?', '-?\\s*') + ')').exec(t0), tState = 'falta', tMsg = MSG.miss.test, tHard = null;
    var pr = checkP(t0, ctx, [tt.p], false);
    if (tm) {
      if (Number(tm[1]) !== tt.df) tHard = 'dfWrong';
      else if (Math.abs(Math.abs(toNum(tm[2])) - Math.abs(tt.t)) > ctx.tol.t) tHard = 'tWrong';
    }
    if (!tHard && pr.hard) tHard = pr.hard;
    if (tHard) { tState = 'hard'; tMsg = MSG[tHard]; }
    else if (tm && pr.ok) { tState = pr.warn.length ? 'avvik' : 'ok'; tMsg = pr.warn.length ? MSG[pr.warn[0]] : ''; pr.warn.forEach(function (w) { addWarn('test', w); }); }
    items.test = item('test', tState, tMsg);
    // 3 ci: forskjell + 95 % KI [lo, hi]
    var cim = new RegExp('(?:\\b95\\s*%?\\s*)?\\b(KI|CI)\\b[^\\[(\\d]{0,24}[\\[(]\\s*(' + NUM + ')\\s*[;,]\\s*(' + NUM + ')\\s*[\\])]', 'i').exec(t0);
    var dm0 = new RegExp('forskjell[^\\d\\[\\-.,]{0,24}(' + NUM + ')', 'i').exec(t0), ciState = 'falta', ciMsg = MSG.miss.ci, ciHard = null;
    var diffOk = has(tt.diff, true);
    if (cim) {
      var lo = toNum(cim[2]), hi = toNum(cim[3]);
      if (lo > hi) ciHard = 'ciInverted';
      else {
        var normal = nearX(ctx, lo, tt.lo) && nearX(ctx, hi, tt.hi), flip = nearX(ctx, lo, -tt.hi) && nearX(ctx, hi, -tt.lo);
        if (!normal && !flip) ciHard = 'ciWrong';
        else if (dm0) { var dv = toNum(dm0[1]); if (nearXs(ctx, dv, tt.diff) && ((normal && !flip && dv * tt.diff < 0 && Math.abs(dv) > 1e-9) || (flip && !normal && dv * tt.diff > 0))) ciHard = 'ciSign'; }
      }
      if (!ciHard && /\b(?:80|90|95|99)\b/.test(t0.slice(Math.max(0, cim.index - 12), cim.index + cim[0].length)) === false) addWarn('ci', 'ciNo95');
    }
    if (ciHard) { ciState = 'hard'; ciMsg = MSG[ciHard]; }
    else if (cim && diffOk) { var wc = (warns.ci || []); ciState = wc.length ? 'avvik' : 'ok'; ciMsg = wc.length ? MSG[wc[0]] : ''; }
    items.ci = item('ci', ciState, ciMsg);
    // 4 es: d + ord
    var dm = /(?:^|[^a-zæøåA-ZÆØÅ])d\s*=\s*(-?\s*(?:\d+)?[.,]?\d+)/.exec(t0), ad = Math.abs(tt.d), esState = 'falta', esMsg = MSG.miss.es;
    if (dm) {
      var dv2 = Math.abs(toNum(dm[1]));
      if (Math.abs(dv2 - ad) > ctx.tol.d) { esState = 'hard'; esMsg = MSG.dWrong; }
      else {
        var after = t0.slice(dm.index + dm[0].length, dm.index + dm[0].length + 45), before = t0.slice(Math.max(0, dm.index - 40), dm.index);
        var lw = new RegExp('(' + DWORDS + ')(?=\\s*(?:effekt|forskjell|effektstørrelse|størrelse|\\)|,|\\.|;|$))', 'ig'), words = [], mm;
        [after, before].forEach(function (seg) { lw.lastIndex = 0; while ((mm = lw.exec(seg))) words.push(mm[1]); });
        if (!words.length) { esState = 'falta'; esMsg = MSG.miss.es; }
        else if (words.some(function (w) { return dBandOk(w, ad); })) { esState = 'ok'; esMsg = ''; }
        else { esState = 'hard'; esMsg = MSG.dLabel; }
      }
    }
    items.es = item('es', esState, esMsg);
    // 5 interp
    var hard = contentHard(text, ctx);
    var seg = (/tolkning\s*:?/i.test(t0) ? t0.split(/tolkning\s*:?/i).pop() : t0).replace(/_+/g, '').replace(/[\[\]]/g, '').trim();
    var unc = /(usikker|ikke konklusiv|ikke avklart|ikke påvist|bredt|bred |stor usikkerhet|mer data|større utvalg|replik|kan ikke utelukke|forenlig|inkluderer|lav styrke|ikke statistisk signifikant|ikke signifikant|ikke tilstrekkelig|ikke funnet|ikke belegg)/i.test(seg);
    var iState, iMsg = '';
    if (hard.length) { iState = 'hard'; iMsg = MSG[hard[0]]; }
    else if (seg.length >= 40 && unc) iState = 'ok';
    else { iState = 'falta'; iMsg = MSG.miss.interp; }
    items.interp = item('interp', iState, iMsg);
    return { items: items, order: ['desc', 'test', 'ci', 'es', 'interp'], contentHard: hard, warns: warns };
  }

  
  function checkCorr(text, ctx) {
    var t0 = norm(text), warns = {}, items = {};
    var rs = [ctx.r].concat(ctx.rAlt || []).filter(function (x) { return x != null; });
    var rhos = [ctx.rho].concat(ctx.rhoAlt || []).filter(function (x) { return x != null; });
    var n = ctx.n, tolR = ctx.tol.r, df = n - 2;
    function addWarn(id, key) { (warns[id] = warns[id] || []).push(key); }
    // 1 dir: retning og styrke
    var dirM = /\b(positiv\w*|negativ\w*)/i.exec(t0), dState = 'falta', dMsg = MSG.miss.dir;
    var lw = /(neglisjerbar|svak|moderat|middels|sterk)\w*/ig, sizes = [], mm;
    while ((mm = lw.exec(t0))) { var w = t0.slice(Math.max(0, mm.index - 30), mm.index + mm[0].length + 30); if (/sammenheng|korrelasjon|assosiasjon|positiv|negativ|\br\b/i.test(w)) sizes.push(mm[1]); }
    if (dirM && sizes.length) {
      // referencia = la r que el texto cita PRIMERO si coincide con una r verdadera (con o sin uteligger); si no, la r principal
      var m0 = /(?:^|[^a-zæøåA-ZÆØÅ])r\s*(?:\(\s*\d+\s*\))?\s*=\s*(-?\s*(?:\d+)?[.,]?\d+)/.exec(t0), q0 = m0 ? toNum(m0[1]) : null;
      var ref = [ctx.r];
      if (q0 != null) rs.forEach(function (r) { if (Math.abs(q0 - r) <= tolR) ref = [r]; });
      var wantPos = /^positiv/i.test(dirM[1]), dirOk = ref.some(function (r) { return Math.abs(r) < 0.05 || (r > 0) === wantPos; });
      if (!dirOk) { dState = 'hard'; dMsg = MSG.dirWrong; }
      else if (!sizes.some(function (s) { return ref.some(function (r) { return rBandOk(s, Math.abs(r)); }); })) { dState = 'hard'; dMsg = MSG.sizeWrong; }
      else { dState = 'ok'; dMsg = ''; }
    }
    items.dir = item('dir', dState, dMsg);
    // 2 apa: r(df) = x, p = ..., n
    var aState = 'falta', aMsg = MSG.miss.apa, aHard = null;
    var reR = new RegExp('(?:^|[^a-zæøåA-ZÆØÅ])(r|rs|ρ|rho)\\s*(?:\\(\\s*(\\d+)\\s*\\))?\\s*=\\s*(' + NUM.replace('-?', '-?\\s*') + ')', 'ig'), rvals = [], rhovals = [], any, dfSeen = [];
    while ((any = reR.exec(t0))) {
      var v = toNum(any[3]), isRho = /^(rs|ρ|rho)$/i.test(any[1]);
      (isRho ? rhovals : rvals).push(v);
      if (any[2] != null) dfSeen.push({ df: Number(any[2]), rho: isRho, raw: any[3] });
      if (!isRho && /^-?\s*0[.,]\d/.test(any[3].trim())) addWarn('apa', 'zeroR');
    }
    var pAcc = ctx.pAcc && ctx.pAcc.length ? ctx.pAcc : (ctx.p != null ? [ctx.p] : [1]);
    var pr = checkP(t0, ctx, pAcc, ctx.mission === 'm1');
    var harN = /\(\s*\d+\s*\)/.test(t0) || /\bn\s*=\s*\d+/i.test(t0);
    if (rvals.some(function (x) { return !rs.some(function (r) { return Math.abs(Math.abs(x) - Math.abs(r)) <= tolR && (x === 0 || r === 0 || (x > 0) === (r > 0) || Math.abs(x) < 0.02); }); })) aHard = 'rWrong';
    else if (rhovals.some(function (x) { return !rhos.some(function (r) { return Math.abs(x - r) <= tolR; }); })) aHard = 'rhoWrong';
    else if (dfSeen.some(function (d) { return [df, df - 1].indexOf(d.df) < 0; })) aHard = 'dfWrong';
    else if (pr.hard) aHard = pr.hard;
    if (aHard) { aState = 'hard'; aMsg = MSG[aHard]; }
    else if (rvals.length && dfSeen.length && pr.found && harN) {
      var wa = (warns.apa || []).concat(pr.warn); wa.forEach(function (x) { if ((warns.apa || []).indexOf(x) < 0) addWarn('apa', x); });
      aState = (warns.apa || []).length ? 'avvik' : 'ok'; aMsg = (warns.apa || []).length ? MSG[warns.apa[0]] : '';
    }
    items.apa = item('apa', aState, aMsg);
    // 3 ci
    var cim = new RegExp('(?:\\b95\\s*%?\\s*)?(KI|CI|konfidensintervall)\\b[^\\[(\\d]{0,24}[\\[(]\\s*(' + NUM + ')\\s*[;,]\\s*(' + NUM + ')\\s*[\\])]', 'i').exec(t0), cState = 'falta', cMsg = MSG.miss.ci;
    if (cim) {
      var lo = toNum(cim[2]), hi = toNum(cim[3]);
      if (lo > hi) { cState = 'hard'; cMsg = MSG.ciInverted; }
      else {
        var contains = rs.some(function (r) { return r >= lo - tolR && r <= hi + tolR; });
        var close = ctx.mission === 'm2' ? (Math.abs(lo - ctx.lo) <= tolR && Math.abs(hi - ctx.hi) <= tolR) : true;
        if (!contains || !close) { cState = 'hard'; cMsg = MSG.ciWrong; }
        else if (!/\b(?:80|90|95|99)\b/.test(t0.slice(Math.max(0, cim.index - 12), cim.index + 30))) { cState = 'avvik'; cMsg = MSG.ciNo95; addWarn('ci', 'ciNo95'); }
        else { cState = 'ok'; cMsg = ''; }
      }
    }
    items.ci = item('ci', cState, cMsg);
    // 4 el4
    var e4;
    if (ctx.mission === 'm1') e4 = /(uteligger|avvikende|ekstrem)/i.test(t0) && /(uten|ekskluder|fjern|eksklusjon)/i.test(t0) && /(spearman|ρ|rangkorrelasjon)/i.test(t0);
    else e4 = /(kontinuerlig|gjennomsnitt|snitt|subskala)/i.test(t0) && /pearson/i.test(t0);
    var ordinalWrong = ctx.mission === 'm2' && /ordinal/i.test(t0) && !/ikke\s+ordinal/i.test(t0);
    items.el4 = ordinalWrong ? item('el4', 'hard', MSG.ordinal) : e4 ? item('el4', 'ok') : item('el4', 'falta', MSG.miss.el4);
    // 5 caus
    var hard = contentHard(text, ctx);
    var begr = /(ikke[^.]{0,50}(kausal|årsak|forårsak)|tverrsnitt|tredjevariabel|begrensning|forbehold|nødvendigvis)/i.test(t0);
    items.caus = hard.length ? item('caus', 'hard', MSG[hard[0]]) : begr ? item('caus', 'ok') : item('caus', 'falta', MSG.miss.caus);
    return { items: items, order: ['dir', 'apa', 'ci', 'el4', 'caus'], contentHard: hard, warns: warns, kausal: hard.indexOf('causal') >= 0 };
  }

  function check(text, ctx) {
    ctx = ctx || {};
    var c = {}; Object.keys(ctx).forEach(function (k) { c[k] = ctx[k]; });
    c.tol = Object.assign({}, DEF_TOL, ctx.tol || {});
    c.kind = c.kind || (c.tt ? 'ttest' : 'corr');
    var raw = c.kind === 'ttest' ? checkTtest(text || '', c) : checkCorr(text || '', c);
    var items = raw.order.map(function (id) { return raw.items[id]; });
    var hard = items.filter(function (i) { return i.state === 'hard'; }).map(function (i) { return { id: i.id, msg: i.msg }; });
    // fallos duros de contenido que no cayeron en un elemento visible se anaden igualmente
    var warn = [];
    Object.keys(raw.warns).forEach(function (id) { raw.warns[id].filter(function (k, i, a) { return a.indexOf(k) === i; }).forEach(function (k) { warn.push({ id: id, key: k, msg: MSG[k] }); }); });
    var nOk = items.filter(function (i) { return i.state === 'ok' || i.state === 'avvik'; }).length, minOk = c.minOk || 4;
    return { kind: c.kind, items: items, hard: hard, warn: warn, nOk: nOk, nTotal: items.length,
      star: nOk >= minOk && hard.length === 0, medal: nOk === items.length && hard.length === 0,        // lote 2B: el formato (avisos ambar) no quita la medalla
      contentHard: raw.contentHard, checks: items.map(function (i) { return i.state === 'ok' || i.state === 'avvik'; }), kausalt: raw.kausal ? ['kausal'] : [] };
  }

  var api = { check: check, MSG: MSG, numsIn: numsIn, clauses: clauses, DEF_TOL: DEF_TOL };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  root.Rapport = api;
})(typeof window !== 'undefined' ? window : globalThis);
