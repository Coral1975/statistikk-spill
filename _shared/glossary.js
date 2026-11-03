/* Glossar i bruk (punkt der begrepet står). Delt av alle spill.
   Glossary.enhance(rotElement) pakker FØRSTE forekomst av hvert begrep i teksten inn i en liten knapp (span.gterm) som åpner én setning.
   Hopper over overskrifter, knapper, skjemafelt, lenker og <summary>. Ingen eksterne avhengigheter.
   Tekstene er de 18 setningene fra spec 2A med rettelsene fra norsk revisjon (pasada 1).: trenger gjennomlesning av en med norsk som morsmål.
   V16 (APA-format) er [DUDA] i revisjonen og står med opprinnelig ordlyd. */
(function (root) {
  'use strict';
  var TERMS = [
    { k: 'h0', re: /H₀|nullhypotese[n]?/i, label: 'H₀ (nullhypotesen)', def: 'H₀ er nullhypotesen: antakelsen om at det ikke finnes noen forskjell (eller sammenheng) i populasjonen.' },
    { k: 'alpha', re: /\bα\b|signifikansnivå(?:et)?/i, label: 'α (signifikansnivå)', def: 'α (signifikansnivå) er grensen dere bestemmer på forhånd: er p mindre enn α, kaller vi resultatet statistisk signifikant.' },
    { k: 'type1', re: /type I-feil/i, label: 'Type I-feil', def: 'Type I-feil er å konkludere med en forskjell som egentlig ikke finnes; hvis H₀ er sann, skjer det i omtrent α av studiene.' },
    { k: 'type2', re: /type II-feil/i, label: 'Type II-feil', def: 'Type II-feil er å overse en forskjell som faktisk finnes; sjansen for det er 1 − statistisk styrke.' },
    { k: 'styrke', re: /statistisk styrke|\bpower\b/i, label: 'Statistisk styrke (power)', def: 'Statistisk styrke (power) er sjansen for å finne en signifikant forskjell når den virkelig finnes; den øker med større utvalg.' },
    { k: 'ki', re: /konfidensintervall(?:et)?|\bKI\b/, label: 'Konfidensintervall (KI)', def: 'Et 95 % konfidensintervall (KI) viser hvilke verdier for forskjellen (eller for r) som er forenlige med dataene; ligger 0 utenfor intervallet, er resultatet signifikant på 5 %-nivå.' },
    { k: 'd', re: /Cohens d|effektstørrelse/i, label: 'Cohens d', def: 'Cohens d er forskjellen mellom to gjennomsnitt målt i standardavvik: omtrent 0,2 regnes som liten effekt, 0,5 som middels og 0,8 som stor.' },
    { k: 'p', re: /p-verdi(?:en)?/i, label: 'p-verdi', def: 'p-verdien er sannsynligheten for å få en forskjell minst like stor som den dere fant (i begge retninger), hvis H₀ er sann. Den sier verken hvor stor forskjellen er eller hvor sikre dere kan være på at programmet virker.' },
    { k: 'df', re: /frihetsgrader|\bdf\b/i, label: 'Frihetsgrader (df)', def: 'Frihetsgrader (df) er antall uavhengige opplysninger testen bruker: n − 2 for korrelasjon, og n₁ + n₂ − 2 for en uavhengig t-test.' },
    { k: 'random', re: /randomiser(?:t|ing|e)/i, label: 'Randomisert', def: 'Randomisert betyr at deltakerne ble fordelt på gruppene ved loddtrekning, så gruppene i gjennomsnitt er omtrent like før programmet starter.' },
    { k: 'obs', re: /observasjonsdata|registerdata/i, label: 'Observasjonsdata', def: 'I observasjonsdata har ingen bestemt hvem som fikk programmet, så en forskjell kan skyldes andre forhold enn programmet.' },
    { k: 'kont', re: /kontinuerlig(?:e)?\s+variabel|ordinal(?:e)?\s+variabel/i, label: 'Kontinuerlig og ordinal variabel', def: 'En kontinuerlig variabel har mange verdier med like store steg (hoppehøyde i cm); en ordinal variabel har en rekkefølge, men ikke like store steg (plassering).' },
    { k: 'mono', re: /monoton/i, label: 'Monoton sammenheng', def: 'Monoton sammenheng betyr at y bare går opp (eller bare ned) når x øker, men ikke nødvendigvis langs en rett linje.' },
    { k: 'simpson', re: /Simpson/i, label: 'Simpsons paradoks', def: 'Simpsons paradoks er at en sammenheng i hele datasettet kan snu eller forsvinne innenfor hver delgruppe, fordi en tredje variabel blander gruppene.' },
    { k: 'ikkesig', re: /ikke signifikant/i, label: 'Ikke signifikant', def: 'Ikke signifikant betyr at dataene ikke gir nok belegg for en forskjell, ikke at forskjellen er null; KI viser hvilke størrelser som fortsatt er mulige.' },
    { k: 'apa', re: /APA-format|APA-form/i, label: 'APA-format', def: 'Skriv p og r uten innledende null (p = .095, p < .001, r = .49), p med tre desimaler og KI som 95 % KI [a, b]; d skrives med innledende null (d = 0.57).' },
    { k: 'rho', re: /ρ|Spearman/, label: 'ρ (Spearman)', def: 'ρ (rho) er som r, men regnet på rangene: den måler om y stiger (eller synker) jevnt, også langs en kurve.' },
    { k: 'signifikant', re: /signifikant(?:e|ent)?/i, label: 'Signifikant', def: 'Et resultat er statistisk signifikant når p er mindre enn grensen (α) dere bestemte på forhånd, vanligvis .05. Det betyr ikke at resultatet er viktig eller stort.' },
    { k: 'tillit', re: /tillitsnivå(?:et)?/i, label: 'Tillitsnivå', def: 'Tillitsnivå er hvor sikre dere er på svaret. Det gir ikke poeng; det er for å øve magefølelsen.' },
    { k: 'kausal', re: /kausal\w*\s+språk|kausalt/i, label: 'Kausalt språk', def: 'Kausalt språk er ord som «førte til» og «forårsaket». En korrelasjon eller en observert forskjell alene viser ikke årsak.' },
    { k: 'fortegn', re: /fortegn(?:et)?\s+i\s+Jamovi/i, label: 'Fortegn i Jamovi', def: 'Jamovi regner forskjellen som den første gruppen minus den andre gruppen. Med A_Program og B_Kontroll blir forskjellen Program − Kontroll, så en positiv forskjell betyr at programmet gjorde det bedre.' }
  ];
  /* Regel etter retning (spec V17) er ikke et begrep i teksten, men en setning i reglene; den ligger i GLOSSARY_RULE. */
  var RULE = 'Innfør programmet hvis p er mindre enn α og programgruppen forbedret seg mer enn kontrollgruppen; ellers innfører dere det ikke.';
  var SKIP = /^(A|BUTTON|INPUT|TEXTAREA|SELECT|SUMMARY|H1|H2|H3|H4|LABEL|LEGEND|CODE|SCRIPT|STYLE|CANVAS|SVG|OPTION)$/;
  var pop = null, openFor = null;

  function byKey(k) { for (var i = 0; i < TERMS.length; i++) if (TERMS[i].k === k) return TERMS[i]; return null; }
  function close() { if (!pop) return; pop.hidden = true; if (openFor) openFor.setAttribute('aria-expanded', 'false'); openFor = null; }
  function toggle(el) {
    if (openFor === el) { close(); return; }
    close();
    var t = byKey(el.getAttribute('data-gl')); if (!t) return;
    pop.innerHTML = '<strong></strong> <span></span>' + (typeof api.openAll === 'function' ? ' <button type="button" class="linkbtn gterm-all">Alle ord i spillet</button>' : '');
    pop.firstChild.textContent = t.label + ': '; pop.childNodes[2].textContent = t.def;
    var all = pop.querySelector('.gterm-all'); if (all) all.addEventListener('click', function () { close(); api.openAll(); });
    pop.hidden = false; openFor = el; el.setAttribute('aria-expanded', 'true');
    var r = el.getBoundingClientRect(), w = Math.min(340, window.innerWidth - 16);
    pop.style.width = w + 'px';
    pop.style.left = Math.max(8, Math.min(window.innerWidth - w - 8, r.left + window.scrollX)) + 'px';
    pop.style.top = (r.bottom + window.scrollY + 6) + 'px';
  }
  function ensurePop() {
    if (pop) return pop;
    pop = document.createElement('div');
    pop.className = 'gterm-pop'; pop.setAttribute('role', 'status'); pop.hidden = true;
    document.body.appendChild(pop);
    document.addEventListener('click', function (e) {
      var t = e.target.closest && e.target.closest('.gterm');
      if (t) { toggle(t); return; }
      if (!e.target.closest || !e.target.closest('.gterm-pop')) close();
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') { close(); return; }
      var t = e.target && e.target.classList && e.target.classList.contains('gterm') ? e.target : null;
      if (t && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); toggle(t); }
    });
    return pop;
  }
  function textNodes(rootEl) {
    var out = [], w = document.createTreeWalker(rootEl, NodeFilter.SHOW_TEXT, {
      acceptNode: function (n) {
        for (var p = n.parentNode; p && p !== rootEl; p = p.parentNode) {
          if (p.nodeType === 1 && (SKIP.test(p.nodeName.toUpperCase()) || p.classList.contains('gterm') || p.classList.contains('no-gl'))) return NodeFilter.FILTER_REJECT;
        }
        return n.nodeValue.trim() ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT;
      }
    });
    while (w.nextNode()) out.push(w.currentNode);
    return out;
  }
  /* opts.only: liste med nøkler; opts.max: maks antall begreper per skjerm (standard 5). Tom skjerm-tekst i <summary>/<details> lukket hoppes IKKE over. */
  function enhance(rootEl, opts) {
    if (!rootEl || !document.createTreeWalker) return 0;
    opts = opts || {};
    var max = opts.max || 5, count = 0, nodes = textNodes(rootEl);
    for (var ti = 0; ti < TERMS.length && count < max; ti++) {
      var t = TERMS[ti];
      if (opts.only && opts.only.indexOf(t.k) < 0) continue;
      for (var ni = 0; ni < nodes.length; ni++) {
        var n = nodes[ni]; if (!n.parentNode) continue;
        var m = t.re.exec(n.nodeValue); if (!m) continue;
        var before = n.nodeValue.slice(0, m.index), hit = m[0], after = n.nodeValue.slice(m.index + hit.length);
        var span = document.createElement('span');
        span.className = 'gterm'; span.setAttribute('role', 'button'); span.tabIndex = 0; span.setAttribute('aria-expanded', 'false');
        span.setAttribute('data-gl', t.k); span.setAttribute('aria-label', hit + ' – forklaring'); span.textContent = hit;
        var par = n.parentNode;
        var bn = document.createTextNode(before);
        par.insertBefore(bn, n); par.insertBefore(span, n);
        n.nodeValue = after;
        nodes.splice(ni, 1, bn, n);          // lote 2D: el trozo anterior sigue en la lista para los terminos siguientes
        count++; break;
      }
    }
    ensurePop();
    return count;
  }
  var api = { TERMS: TERMS, RULE: RULE, get: byKey, enhance: enhance, close: close, openAll: null };
  root.Glossary = api;
})(typeof window !== 'undefined' ? window : this);
