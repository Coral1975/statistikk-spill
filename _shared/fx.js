/* fx.js – ayudas opcionales de motion (sin dependencias). Todo es opcional:
   el CSS funciona sin este archivo. Respeta prefers-reduced-motion. */
(function (g) {
  'use strict';
  var mq = g.matchMedia ? g.matchMedia('(prefers-reduced-motion: reduce)') : { matches: false };
  function reduced() { return mq.matches || document.documentElement.getAttribute('data-motion') === 'off'; }

  /* confetti(contenedor, n): añade <div class="confetti"> con n piezas; se autoelimina. */
  function confetti(host, n) {
    if (!host || reduced()) return;
    var box = document.createElement('div');
    box.className = 'confetti';
    box.setAttribute('aria-hidden', 'true');
    for (var i = 0; i < (n || 28); i++) {
      var p = document.createElement('i');
      p.style.setProperty('--x', (Math.random() * 100).toFixed(1) + '%');
      p.style.setProperty('--dx', ((Math.random() - .5) * 120).toFixed(0) + 'px');
      p.style.setProperty('--r', ((Math.random() - .5) * 900).toFixed(0) + 'deg');
      p.style.setProperty('--d', (1400 + Math.random() * 900).toFixed(0) + 'ms');
      p.style.setProperty('--dl', (Math.random() * 300).toFixed(0) + 'ms');
      box.appendChild(p);
    }
    if (getComputedStyle(host).position === 'static') host.style.position = 'relative';
    host.appendChild(box);
    setTimeout(function () { box.remove(); }, 3000);
  }

  /* lightStars(.stars, [true,false,true]): marca estrellas y lanza la animación. */
  function lightStars(list, flags) {
    var items = list.querySelectorAll('.stars__item'), k = 0;
    items.forEach(function (it, idx) {
      var on = !!flags[idx], st = it.querySelector('.star');
      it.classList.toggle('is-on', on); st.classList.toggle('is-on', on);
      if (on) st.style.setProperty('--i', k++);
      var s = it.querySelector('.stars__state');
      if (s) s.textContent = on ? 'tent' : 'ikke tent ennå';
    });
    list.classList.remove('is-lighting'); void list.offsetWidth;
    if (!reduced()) list.classList.add('is-lighting');
  }

  /* countUp(el, valor): cuenta de 0 a valor (CSS @property); sin animación: valor directo. */
  function countUp(el, to) {
    el.style.setProperty('--to', to);
    el.classList.remove('is-counting'); void el.offsetWidth;
    if (!reduced()) {
      el.classList.add('is-counting');
      el.addEventListener('animationend', function () { el.classList.remove('is-counting'); }, { once: true });     // lote 2B: el valor final queda fijo (--n = --to)
    }
  }

  /* nextRound(salida, entrada): transición entre rondas (slide). */
  function nextRound(out, inn, done) {
    if (reduced() || !out) { if (out) out.hidden = true; inn.hidden = false; done && done(); return; }
    out.classList.add('anim-slide-out');
    setTimeout(function () {
      out.hidden = true; out.classList.remove('anim-slide-out');
      inn.hidden = false; inn.classList.remove('anim-slide-in'); void inn.offsetWidth; inn.classList.add('anim-slide-in');
      done && done();
    }, 280);
  }

  g.FX = { confetti: confetti, lightStars: lightStars, countUp: countUp, nextRound: nextRound, reduced: reduced };
})(window);
