

// ===== CONFIGURACION: pega aqui la URL de la Web App (termina en /exec), o deja vacio y usa CONFIG.leaderboardUrl =====
const KLASSETAVLA_URL = '';          // vacia = marcador desactivado
// El Klassemål (meta de clase, belonning y temaer) NO se define aqui: lo calcula y devuelve el servidor (hoja «Innstillinger» de Code.gs).
// Sin marcador (sin URL o sin respuesta) no hay Klassemål.
// ============================================================================================

(function (root) {
  'use strict';
  const TIMEOUT_MS = 8000;
  const REFRESH_MS = 15000;
  const SPILL_NAVN = { '06c': 'Treningslaben AS', '10a': 'Gjett r: Lagkampen' };
  const Kt = { enabled: false, last: null, status: { sjekket: false, tilgjengelig: false } };

  function url() {
    try {
      if (root.KLASSETAVLA_URL) return String(root.KLASSETAVLA_URL).trim();
      if (KLASSETAVLA_URL) return String(KLASSETAVLA_URL).trim();
      if (typeof CONFIG !== 'undefined' && CONFIG && CONFIG.leaderboardUrl) return String(CONFIG.leaderboardUrl).trim();
    } catch (e) { /* ignorar */ }
    return '';
  }
  Object.defineProperty(Kt, 'url', { get: url, enumerable: true });

  function withTimeout(promise, ms) {
    return new Promise((resolve, reject) => {
      const t = setTimeout(() => reject(new Error('timeout')), ms);
      promise.then(v => { clearTimeout(t); resolve(v); }, e => { clearTimeout(t); reject(e); });
    });
  }
  async function get() {
    const u = url();
    if (!u) throw new Error('ikke konfigurert');
    const r = await withTimeout(fetch(u, { method: 'GET' }), TIMEOUT_MS);
    if (!r.ok) throw new Error('http ' + r.status);
    const j = await r.json();
    if (!j || !Array.isArray(j.grupper)) throw new Error('format');
    Kt.last = j;
    return j;
  }
  // Comprueba una vez al cargar; nunca lanza.
  Kt.init = async function () {
    if (!url()) { Kt.enabled = false; Kt.status = { sjekket: true, tilgjengelig: false }; return false; }
    try { await get(); Kt.enabled = true; } catch (e) { Kt.enabled = false; }
    Kt.status = { sjekket: true, tilgjengelig: Kt.enabled };
    return Kt.enabled;
  };
  Kt.get = get;
  Kt.hent = get;                                   
  Kt.sjekk = Kt.init;                              
  Kt.konfigurert = function () { return !!url(); };

  function clampInt(v, lo, hi) { const n = Math.round(Number(v)); return isNaN(n) ? lo : Math.max(lo, Math.min(hi, n)); }
  function buildBody(spill, alias, stjerner, x) {
    x = x || {};
    const hj = {};
    Object.keys(x.hjelp || {}).forEach(k => {      // solo numeros; la clave se limita; el servidor agrupa los tipos desconocidos
      const key = String(k).toLowerCase();
      if (/^[a-z]{2,20}$/.test(key)) hj[key] = clampInt(x.hjelp[k], 0, 99);
    });
    const body = {
      spill: String(spill), alias: root.Alias ? root.Alias.clean(alias) : String(alias).slice(0, 24), stjerner: clampInt(stjerner, 0, 3),
      poeng: clampInt(x.poeng, 0, 9999), hjelp: hj, hjelpPoeng: clampInt(x.hjelpPoeng, 0, 9999),
      dato: String(x.dato || new Date().toISOString().slice(0, 10)).slice(0, 10)
    };
    // Esquema v2 (opcional): modo de juego y ayudas por ronda. Si no se pasan, no se envian y el servidor (antiguo o nuevo) los deja vacios.
    if (x.modus === 'kjerne' || x.modus === 'full') body.modus = x.modus;
    if (x.hjelpRunder && typeof x.hjelpRunder === 'object') {
      const hr = {};
      Object.keys(x.hjelpRunder).slice(0, 12).forEach(k => { if (/^[A-Za-z0-9_-]{1,12}$/.test(k)) hr[k] = clampInt(x.hjelpRunder[k], 0, 99); });
      body.hjelpRunder = hr;
    }
    return body;
  }
  async function post(body) {
    // text/plain evita el preflight CORS de Apps Script
    const r = await withTimeout(fetch(url(), { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify(body) }), TIMEOUT_MS + 2000);
    if (!r.ok) throw new Error('http ' + r.status);
    const j = await r.json();
    if (!j || j.ok !== true) throw new Error((j && (j.feil || j.error)) || 'avvist');
    return j;
  }
  // send(spill, alias, stjerner, extra) -> Promise<boolean>   (estilo 6C; nunca rechaza)

  Kt.send = function (a, alias, stjerner, extra) {
    if (a && typeof a === 'object') {
      if (!url()) return Promise.reject(new Error('ikke konfigurert'));
      return post(buildBody(a.spill !== undefined ? a.spill : a.juego, a.alias, a.stjerner, a));
    }
    if (!url()) return Promise.resolve(false);
    return post(buildBody(a, alias, stjerner, extra)).then(() => true, () => false);
  };

  function esc(s) { return String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])); }
  function starsText(n) { return '★'.repeat(n) + '☆'.repeat(3 - n) + ' (' + n + ' av 3)'; }

  // Pinta la tablero en `el`. Orden alfabetico por alias, sin posiciones ni puntos. Se refresca solo.
  Kt.mount = function (el) {
    let timer = null, stopped = false;
    async function draw() {
      try {
        const j = await get();
        const byAlias = {};
        j.grupper.forEach(g => { (byAlias[g.alias] = byAlias[g.alias] || []).push(g); });
        const aliases = Object.keys(byAlias).sort((a, b) => a.localeCompare(b, 'nb'));
        const total = j.grupper.reduce((s, g) => s + (g.stjerner || 0), 0);
        const maal = Math.round(Number(j.maal)) > 0 ? Math.round(Number(j.maal)) : 0;       // 0 = el servidor no da meta: no se muestra barra
        const reached = maal > 0 && total >= maal;
        const belonning = j.belonning ? String(j.belonning) : '';
        const temaer = Array.isArray(j.temaer) ? j.temaer.map(String).filter(Boolean) : [];
        let goal = '';
        if (maal > 0) {
          const pct = Math.min(100, Math.round(100 * total / maal));
          goal = '<div class="kt-goal"><p><strong>Klassemål:</strong> ' + (reached
            ? 'Klassemål nådd! 🎉 Dere har låst opp' + (belonning ? ': ' + esc(belonning) : '') + '.'
            : 'Sammen har klassen ' + total + ' av ' + maal + ' stjerner. Bare ' + (maal - total) + ' igjen!') + '</p>' +
            '<div class="kt-bar" role="progressbar" aria-valuemin="0" aria-valuemax="' + maal + '" aria-valuenow="' + Math.min(total, maal) +
            '" aria-label="Klassemål: stjerner"><span style="width:' + pct + '%"></span></div>' +
            (belonning ? '<p class="kt-reward">Belønning: ' + esc(belonning) + '</p>' : '') +
            (temaer.length ? '<details class="kt-themes"' + (reached ? ' open' : '') + '><summary>Temaer dere kan stemme over' + (reached ? ' nå' : '') + '</summary><ul>' +
              temaer.map(t => '<li>' + esc(t) + '</li>').join('') + '</ul></details>' : '') + '</div>';
        }
        el.innerHTML = goal +
          (aliases.length ? '<ul class="kt-list">' + aliases.map(a =>
            '<li><strong>' + esc(a) + '</strong>' + byAlias[a].map(g =>
              '<span>' + esc(SPILL_NAVN[g.spill] || g.spill) + ': <span class="kt-stars" aria-label="' + (g.stjerner || 0) + ' av 3 stjerner">' +
              starsText(g.stjerner || 0) + '</span></span>').join('') + '</li>').join('') + '</ul>'
            : '<p>Ingen lag har sendt inn ennå.</p>') +
          '<p class="kt-note">Tavla viser bare lagnavn og stjerner, i alfabetisk rekkefølge – ingen rangering.</p>';
      } catch (e) {
        el.innerHTML = '<p>Klassetavla er ikke tilgjengelig akkurat nå. Utfordringen fungerer som vanlig.</p>';
      }
      if (!stopped) timer = setTimeout(draw, REFRESH_MS);
    }
    draw();
    return function stop() { stopped = true; clearTimeout(timer); };
  };

  root.Klassetavla = Kt;
})(typeof window !== 'undefined' ? window : globalThis);
