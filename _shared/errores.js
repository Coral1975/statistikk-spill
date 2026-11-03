/* ==========================================================================
   errores.js  –  Manejador global de errores + aviso de «sin almacenamiento» (comun a todos los juegos).
   Uso (en cada juego, justo despues de cargar este archivo):
       Errores.init({ keys: ['clave.de.partida', ...] });
   - Un error de JavaScript no capturado muestra una pantalla serena («Noe gikk galt») con dos botones:
       «Last inn på nytt» (conserva lo guardado) y «Start på nytt» (borra SOLO las claves de ese juego y recarga).
     El lagnavn (clave compartida) NO se borra.
   - Si el navegador bloquea localStorage, un aviso discreto lo explica (el juego sigue funcionando, solo que sin guardar).
   - Los fallos del marcador opcional (red, Apps Script) no deben tumbar el juego: se ignoran aqui (el juego ya los captura).
   ========================================================================== */
(function (root) {
  'use strict';
  var T = {
    tittel: 'Noe gikk galt',
    tekst: 'Beklager, spillet støtet på en feil. Fremgangen din ligger lagret i nettleseren, så prøv først «Last inn på nytt». Hjelper ikke det, kan du starte på nytt (da slettes fremgangen i dette spillet; lagnavnet beholdes).',
    reload: 'Last inn på nytt', restart: 'Start på nytt', lukk: 'Lukk',
    detalj: 'Teknisk melding (til læreren):',
    bekreft: 'Starte helt på nytt? Fremgangen i dette spillet slettes (lagnavnet beholdes).',
    ingenLagring: 'Nettleseren blokkerer lagring (privat modus eller innstillinger). Spillet fungerer, men fremgangen huskes ikke hvis du laster siden på nytt eller lukker fanen.'
  };
  var cfg = { keys: [], onRestart: null }, shown = false, started = false;

  function storageOk() {
    try { var s = root.localStorage; if (!s) return false; s.setItem('statistikklab.__t', '1'); s.removeItem('statistikklab.__t'); return true; } catch (e) { return false; }
  }
  function el(tag, props, text) {
    var e = root.document.createElement(tag), k;
    for (k in (props || {})) e.setAttribute(k, props[k]);
    if (text) e.textContent = text;
    return e;
  }
  function clearKeys() {
    var i;
    for (i = 0; i < cfg.keys.length; i++) { try { root.localStorage.removeItem(cfg.keys[i]); } catch (e) { /* sin almacenamiento */ } }
    if (typeof cfg.onRestart === 'function') { try { cfg.onRestart(); } catch (e) { /* ignorar */ } }
  }
  /** Pantalla de error. `detail` es solo texto (nunca HTML). */
  function show(detail) {
    if (shown || !root.document || !root.document.body) return;
    shown = true;
    var d = root.document;
    var wrap = el('div', { id: 'feil-skjerm', role: 'alertdialog', 'aria-modal': 'true', 'aria-labelledby': 'feil-tittel', 'aria-describedby': 'feil-tekst' });
    wrap.style.cssText = 'position:fixed;inset:0;z-index:9999;display:flex;align-items:center;justify-content:center;padding:1rem;background:rgba(5,14,24,.82)';
    var box = el('div');
    box.style.cssText = 'max-width:34rem;width:100%;background:var(--c-surface,#fffcf5);color:var(--c-ink,#14202e);border:3px solid var(--c-wood,#6b4423);border-radius:1rem;padding:1.25rem 1.5rem;box-shadow:0 8px 28px rgba(0,0,0,.5);font:1.0625rem/1.5 system-ui,sans-serif';
    var h = el('h2', { id: 'feil-tittel', tabindex: '-1' }, T.tittel); h.style.cssText = 'margin:0 0 .5rem;font-size:1.5rem';
    var p = el('p', { id: 'feil-tekst' }, T.tekst);
    var row = el('div'); row.style.cssText = 'display:flex;flex-wrap:wrap;gap:.75rem;margin-top:1rem';
    var b1 = el('button', { type: 'button', class: 'btn btn--primary' }, T.reload);
    var b2 = el('button', { type: 'button', class: 'btn' }, T.restart);
    var b3 = el('button', { type: 'button', class: 'btn btn--ghost' }, T.lukk);
    [b1, b2, b3].forEach(function (b) { b.style.cssText = 'min-height:2.75rem;padding:.5rem 1.1rem;font:600 1rem system-ui,sans-serif;border-radius:.75rem;border:2px solid #8a7a5a;cursor:pointer;background:' + (b === b1 ? '#0b7a6b;color:#fff' : '#fffcf5;color:#14202e'); });
    b1.addEventListener('click', function () { root.location.reload(); });
    b2.addEventListener('click', function () {
      if (root.confirm && !root.confirm(T.bekreft)) return;
      clearKeys(); root.location.reload();
    });
    b3.addEventListener('click', function () { wrap.remove(); shown = false; });
    row.appendChild(b1); row.appendChild(b2); row.appendChild(b3);
    box.appendChild(h); box.appendChild(p); box.appendChild(row);
    if (detail) {
      var det = el('details'); det.style.marginTop = '.75rem';
      det.appendChild(el('summary', null, T.detalj));
      var pre = el('pre', null, String(detail).slice(0, 400)); pre.style.cssText = 'white-space:pre-wrap;font-size:.85rem;margin:.5rem 0 0';
      det.appendChild(pre); box.appendChild(det);
    }
    wrap.appendChild(box); d.body.appendChild(wrap);
    try { h.focus(); } catch (e) { /* ignorar */ }
  }
  function harmless(msg, file) {
    msg = String(msg || '');
    if (/ResizeObserver loop/i.test(msg)) return true;                           // aviso inofensivo del navegador
    // OBS: con file:// Chrome oculta el detalle («Script error.») pero el error es real: se muestra igual.
    if (file && /klassetavla/i.test(String(file))) return true;                    // el marcador es opcional
    if (/^(timeout|ikke konfigurert|http \d+|format|avvist|ugyldig lagnavn)$/i.test(msg)) return true;
    return false;
  }
  function onError(ev) {
    var msg = ev && ev.message, file = ev && ev.filename;
    if (harmless(msg, file)) return;
    show((msg || 'Feil') + (file ? '\n' + String(file).split('/').pop() + ':' + (ev.lineno || '?') : ''));
  }
  function onRejection(ev) {
    var r = ev && ev.reason, msg = r && r.message ? r.message : String(r || '');
    var stack = r && r.stack ? String(r.stack) : '';
    if (harmless(msg, stack) || /klassetavla/i.test(stack)) return;
    show(msg + (stack ? '\n' + stack.split('\n')[1] : ''));
  }
  function storageNotice() {
    if (storageOk() || !root.document || !root.document.body || root.document.getElementById('lagring-varsel')) return;
    var b = el('div', { id: 'lagring-varsel', role: 'status' }, T.ingenLagring);
    b.style.cssText = 'background:var(--c-warn-soft,#fff1cc);color:var(--c-ink,#14202e);border-bottom:3px solid var(--c-warn,#8a5a00);padding:.5rem 1rem;font:1rem/1.4 system-ui,sans-serif';
    var x = el('button', { type: 'button', 'aria-label': T.lukk }, '×'); x.style.cssText = 'float:right;min-width:2.75rem;min-height:2.75rem;margin:-.5rem -1rem 0 .5rem;font-size:1.25rem;background:none;border:0;cursor:pointer;color:inherit';
    x.addEventListener('click', function () { b.remove(); });
    b.insertBefore(x, b.firstChild);
    root.document.body.insertBefore(b, root.document.body.firstChild);
  }

  var Errores = {
    T: T,
    storageOk: storageOk, show: show,
    init: function (opts) {
      cfg.keys = (opts && opts.keys) || []; cfg.onRestart = (opts && opts.onRestart) || null;
      if (!started) {
        started = true;
        root.addEventListener('error', onError);
        root.addEventListener('unhandledrejection', onRejection);
        if (root.document.readyState === 'loading') root.document.addEventListener('DOMContentLoaded', storageNotice); else storageNotice();
      }
    },
    /** Para tests: ignora el estado «ya mostrada». */
    _reset: function () { shown = false; var w = root.document.getElementById('feil-skjerm'); if (w) w.remove(); }
  };
  root.Errores = Errores;
})(typeof window !== 'undefined' ? window : globalThis);
