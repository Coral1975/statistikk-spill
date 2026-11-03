/* ==========================================================================
   alias.js  –  UNICO modulo del alias (lagnavn) para todos los juegos y para el marcador.
   Un solo sitio para: normalizacion, filtro de palabras, validacion, almacenamiento (una clave) y el boton «Bytt navn».

   REGLA DE ORO: el bloque entre  >>> ALIAS-CORE BEGIN  y  ALIAS-CORE END  es la UNICA fuente de la lista y de la funcion.
   El mismo bloque, byte a byte, esta copiado en  marcador/Code.gs  (Apps Script) con
       node _shared/marcador/sync_alias.js
   y  node _shared/marcador/test_marcador.js  comprueba que ambos son identicos. NO edites el bloque en Code.gs.
   El bloque esta escrito en JavaScript "clasico" (var, sin modulos) para que lo ejecuten por igual el navegador, Node y Apps Script.

   Filtro (la profesora no modera los alias, asi que un falso positivo molesta mas que un alias dudoso):
     - se normaliza (minusculas, sin tildes salvo æøå, leetspeak 0 1 3 4 5 7 @ $ !, letras repetidas) y se parte en PALABRAS;
     - se bloquea una palabra solo si es EXACTAMENTE una de la lista (algunas con terminaciones tipicas: idiot -> idioten)
       o si EMPIEZA por un prefijo inequivoco (fuck..., nigger...). Nunca por subcadena en medio de una palabra:
       «Scunthorpe», «Pikkolo», «Profitten», «Penisillin», «Retardert», «Sluttspurt», «Cockpit» y «Dickens» pasan;
     - las letras sueltas separadas («f u c k», «f.u.c.k») se unen antes de comprobar.
   ========================================================================== */

/* >>> ALIAS-CORE BEGIN */
var AliasCore = (function () {
  var MAX = 24, MIN = 2;
  // Prefijos inequivocos: bloquean cualquier palabra que EMPIECE asi (fuck, fuckers, fucking...).
  var PREFIX = ['fuck', 'shit', 'bitch', 'cunt', 'nigger', 'nigga', 'faggot', 'whore', 'hitler', 'nazi', 'jævla', 'jaevla',
    'helvete', 'hurunge', 'voldta', 'porno'];
  // Palabras enteras con terminaciones tipicas (idiot -> idioten, idioter). «pikk» NO bloquea «Pikkolo»; «fitte» NO bloquea «Profitten».
  var WORD = ['nigg', 'kødd', 'rasist', 'retard', 'penis', 'vagina', 'satan', 'drep', 'faen', 'dritt', 'idiot', 'neger', 'pikk', 'fitte'];
  var ENDINGS = ['', 's', 'er', 'ers', 'ed', 'ing', 'en', 'et', 'ene', 'e', 'r', 'ne'];
  // Palabras que solo bloquean EXACTAS, sin terminaciones: «Fans», «Cocker», «Sexta», «Hora» (hora/tiempo) y «Fana» no se tocan por error.
  var EXACT = ['fan', 'ass', 'sex', 'homo', 'kuk', 'hore', 'hora', 'dick', 'dicks', 'cock', 'cocks', 'tits', 'slut', 'sluts', 'slutty'];
  var LEET = { '0': 'o', '1': 'i', '3': 'e', '4': 'a', '5': 's', '7': 't', '@': 'a', '$': 's', '!': 'i' };
  var LETTERS = 'a-zæøåäöü';

  /** Texto tal como se guarda y se compara: sin caracteres de control ni invisibles ni <>, espacios colapsados, recortado, max 24. */
  function clean(s) {
    s = String(s === undefined || s === null ? '' : s);
    if (s.normalize) s = s.normalize('NFC');
    return s.replace(/[\u0000-\u001F\u007F\u200B-\u200F\u2028-\u202F\u2060\uFEFF<>]/g, '').replace(/\s+/g, ' ').trim().slice(0, MAX);
  }
  /** Clave para comparar dos alias (el servidor trata «Rask Elg» y «rask elg» como el mismo grupo). */
  function key(s) { return clean(s).toLowerCase(); }
  /** Minusculas, leetspeak a letras, letras repetidas 3+ veces reducidas a 2. */
  function normalize(s) {
    var out = '', t = String(s).toLowerCase(), i, c;
    for (i = 0; i < t.length; i++) { c = t.charAt(i); out += LEET[c] || c; }
    return out.replace(/(.)\1{2,}/g, '$1$1');
  }
  /** Palabras del alias; las letras sueltas consecutivas («f u c k») se unen en una palabra mas. */
  function tokens(s) {
    var raw = normalize(s).split(new RegExp('[^' + LETTERS + ']+')).filter(function (t) { return t; });
    var out = raw.slice(), run = '', i;
    for (i = 0; i <= raw.length; i++) {
      if (i < raw.length && raw[i].length === 1) run += raw[i];
      else { if (run.length >= 3) out.push(run); run = ''; }
    }
    return out;
  }
  function wordHit(t) {
    var i, j;
    for (i = 0; i < PREFIX.length; i++) if (t.indexOf(PREFIX[i]) === 0) return true;
    for (i = 0; i < EXACT.length; i++) if (t === EXACT[i]) return true;
    for (i = 0; i < WORD.length; i++) for (j = 0; j < ENDINGS.length; j++) if (t === WORD[i] + ENDINGS[j]) return true;
    return false;
  }
  function isBlocked(s) {
    var tk = tokens(s), i;
    for (i = 0; i < tk.length; i++) if (wordHit(tk[i])) return true;
    return false;
  }
  /** {ok, value, error}  error: 'short' | 'blocked'  (value = alias ya limpio). */
  function validate(raw) {
    var v = clean(raw);
    if (v.length < MIN) return { ok: false, value: v, error: 'short' };
    if (isBlocked(v)) return { ok: false, value: v, error: 'blocked' };
    return { ok: true, value: v };
  }
  return { MAX: MAX, MIN: MIN, PREFIX: PREFIX, WORD: WORD, EXACT: EXACT, clean: clean, key: key, normalize: normalize, tokens: tokens, isBlocked: isBlocked, validate: validate };
})();
/* <<< ALIAS-CORE END */

/* ---------- Parte de navegador (almacenamiento, campo con validacion amable, boton «Bytt navn») ---------- */
(function (root) {
  'use strict';
  var Core = AliasCore;
  var KEY = 'statistikklab.lag.v1';                       // UNICA clave actual: {alias, motto}
  var OLD = { alias6c: 'statistikklab.alias', motto6c: 'statistikklab.motto', lag10a: 'idrettsstat.lag.v1' };

  var TXT = {
    tomt: 'Skriv et lagnavn for å starte.',
    kort: 'Skriv minst to tegn.',
    upassende: 'Velg et annet lagnavn.',
    bytt: 'Bytt navn', bytt_tittel: 'Bytt lagnavn', bytt_label: 'Nytt lagnavn', lagre: 'Lagre', avbryt: 'Avbryt',
    bytt_hjelp: 'Navnet gjelder for alle spillene i kurset (lagres i denne nettleseren). Resultater som allerede er sendt til klassetavla beholder det gamle navnet.',
    ingenLagring: 'Nettleseren blokkerer lagring, så lagnavnet huskes ikke til neste gang.'
  };
  var listeners = [];

  function ls() { try { return root.localStorage || null; } catch (e) { return null; } }
  function rd(k) { try { var s = ls(); return s ? s.getItem(k) : null; } catch (e) { return null; } }
  function wr(k, v) { try { var s = ls(); if (!s) return false; s.setItem(k, v); return true; } catch (e) { return false; } }
  function rm(k) { try { var s = ls(); if (s) s.removeItem(k); } catch (e) { /* sin almacenamiento */ } }

  
  function load() {
    var cur = null;
    try { cur = JSON.parse(rd(KEY)); } catch (e) { cur = null; }
    if (cur && typeof cur === 'object' && typeof cur.alias === 'string') {
      return { alias: Core.clean(cur.alias), motto: Core.clean(cur.motto || '').slice(0, 60) };
    }
    var alias = '', motto = '', j = null;
    try { j = JSON.parse(rd(OLD.lag10a)); } catch (e) { j = null; }
    if (j && typeof j === 'object') { alias = Core.clean(j.alias || ''); motto = Core.clean(j.motto || '').slice(0, 60); }
    var a6 = rd(OLD.alias6c), m6 = rd(OLD.motto6c);
    if (!alias && a6) alias = Core.clean(a6);
    if (!motto && m6) motto = Core.clean(m6).slice(0, 60);
    if (alias && !Core.validate(alias).ok) { alias = ''; }          // un alias antiguo que el filtro nuevo no acepta, no se arrastra
    if (alias || motto) {
      if (wr(KEY, JSON.stringify({ alias: alias, motto: motto }))) { rm(OLD.alias6c); rm(OLD.motto6c); rm(OLD.lag10a); }
    }
    return { alias: alias, motto: motto };
  }
  function save(alias, motto) {
    var v = { alias: Core.clean(alias), motto: Core.clean(motto === undefined ? load().motto : motto).slice(0, 60) };
    return wr(KEY, JSON.stringify(v));
  }
  function emit(v) { listeners.slice().forEach(function (f) { try { f(v); } catch (e) { /* ignorar */ } }); }
  function onChange(f) { if (typeof f === 'function') listeners.push(f); }

  function msg(error) { return error === 'short' ? TXT.kort : TXT.upassende; }

  /** Campo de alias con validacion amable: NO regana antes de escribir. El error solo aparece despues de salir del campo
   *  (blur) o de intentar enviar, y desaparece en cuanto se corrige. Devuelve {check(show) -> {ok,value,error}}. */
  function bindField(input, errEl) {
    var touched = false;
    function show(r, force) {
      if (!errEl) return;
      if (r.ok) { errEl.textContent = ''; input.removeAttribute('aria-invalid'); return; }
      var empty = r.value.length === 0;
      if (!(touched || force)) { errEl.textContent = ''; input.removeAttribute('aria-invalid'); return; }
      errEl.textContent = empty ? TXT.tomt : msg(r.error);
      if (force && !empty) input.setAttribute('aria-invalid', 'true'); else input.removeAttribute('aria-invalid');
    }
    input.addEventListener('blur', function () { if (input.value.trim()) { touched = true; show(Core.validate(input.value), false); } });
    input.addEventListener('input', function () { if (touched) show(Core.validate(input.value), false); });
    return {
      check: function (force) { var r = Core.validate(input.value); if (force) touched = true; show(r, !!force); return r; },
      reset: function () { touched = false; if (errEl) errEl.textContent = ''; input.removeAttribute('aria-invalid'); }
    };
  }

  /** Dialogo «Bytt navn». Guarda el nuevo alias (clave unica) y avisa a los juegos con onChange(). */
  function openChange() {
    var cur = load().alias, prev = root.document.activeElement, d = root.document;
    var inp = d.createElement('input'); inp.type = 'text'; inp.id = 'bytt-navn-inp'; inp.maxLength = Core.MAX; inp.value = ''; inp.placeholder = cur; inp.autocomplete = 'off';   // placeholder, NO value prefijado: lo escrito nunca se concatena con el nombre antiguo
    inp.style.cssText = 'width:100%;max-width:100%;min-height:2.75rem;font:inherit;padding:.4rem .7rem;border:2px solid var(--c-line,#999);border-radius:.6rem;background:var(--c-surface,#fff);color:var(--c-ink,#000)';
    var lab = d.createElement('label'); lab.htmlFor = inp.id; lab.textContent = TXT.bytt_label; lab.style.fontWeight = '600';
    var err = d.createElement('p'); err.setAttribute('role', 'alert'); err.style.minHeight = '1.4em'; err.style.color = 'var(--c-accent,#C2410C)'; err.style.fontWeight = '600';
    var hint = d.createElement('p'); hint.className = 'small'; hint.textContent = TXT.bytt_hjelp;
    var h2 = d.createElement('h2'); h2.textContent = TXT.bytt_tittel;
    var body = d.createElement('div'); body.className = 'modal__body'; [h2, lab, inp, err, hint].forEach(function (x) { body.appendChild(x); });
    var ok = d.createElement('button'); ok.type = 'button'; ok.className = 'btn btn--primary'; ok.textContent = TXT.lagre;
    var no = d.createElement('button'); no.type = 'button'; no.className = 'btn'; no.textContent = TXT.avbryt;
    var foot = d.createElement('div'); foot.className = 'modal__foot'; foot.appendChild(ok); foot.appendChild(no);
    var dlg = d.createElement('dialog'); dlg.className = 'modal'; dlg.setAttribute('aria-label', TXT.bytt_tittel); dlg.appendChild(body); dlg.appendChild(foot);
    var field = bindField(inp, err);
    function done() { if (!inp.value.trim()) { dlg.close(); return; }   // campo vacio = conservar el nombre actual
      var r = field.check(true); if (!r.ok) { inp.focus(); return; } var old = load(); save(r.value, old.motto); dlg.close(); emit({ alias: r.value, motto: old.motto, previous: cur }); }
    ok.addEventListener('click', done);
    no.addEventListener('click', function () { dlg.close(); });
    inp.addEventListener('keydown', function (e) { if (e.key === 'Enter') { e.preventDefault(); done(); } });
    dlg.addEventListener('click', function (e) { if (e.target === dlg) dlg.close(); });
    dlg.addEventListener('close', function () { dlg.remove(); if (prev && prev.focus) prev.focus(); });
    d.body.appendChild(dlg);
    if (dlg.showModal) dlg.showModal(); else dlg.setAttribute('open', '');
    inp.focus();
    return dlg;
  }
  /** Conecta cualquier boton con data-bytt-navn (o el elemento dado) al dialogo. */
  function wireButton(btn) { if (btn) btn.addEventListener('click', function () { openChange(); }); }

  var Alias = {
    KEY: KEY, OLD_KEYS: OLD, MAX: Core.MAX, MIN: Core.MIN, TXT: TXT, core: Core,
    clean: Core.clean, key: Core.key, isBlocked: Core.isBlocked, validate: Core.validate,
    load: load, save: save, onChange: onChange, bindField: bindField, openChange: openChange, wireButton: wireButton,
    storageOk: function () { try { var s = ls(); if (!s) return false; s.setItem('statistikklab.__t', '1'); s.removeItem('statistikklab.__t'); return true; } catch (e) { return false; } }
  };
  root.Alias = Alias;
  if (typeof module !== 'undefined' && module.exports) module.exports = Alias;
})(typeof window !== 'undefined' ? window : globalThis);
