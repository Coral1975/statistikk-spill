
window.TL_CONFIG = {
  gameId: '06c',
  gameName: 'Treningslaben AS',

  // Rondas por set (A o B). 'REG' = caso "registro grande" (ronda 4, generado en el navegador).

  sets: {
    A: { runder: ['F01', 'F02', 'F05', 'REG', 'F04'], rapport: { fraRunde: 1 } },     // lote 2E: el rapport informa el estudio de la ronda 2 del propio grupo (indice 1)
    B: { runder: ['F07', 'F09', 'F10', 'REG', 'F11'], rapport: { fraRunde: 1 } }
  },
  practice: { forslag: 'F14', lag: 1, n: 20 },          // ronda de practica guiada (no puntua)

  // Caso "registro grande" (diseñado): n por grupo (el d verdadero esta ofuscado en js/secrets.js), sigma, media de control, semilla fija.
  registry: { n: 1000, sigma: 3.5, muKontroll: 1.0, seed: 6, enhet: 'ml/kg/min' },

  // ---- MODO KJERNE / EKSTRA (lote 2A-2) ----
  // Nucleo por defecto (~45 min): rondas 1, 2 y 4 (indices 0, 1, 3) + rapport + langtid corto + debrief de 3 preguntas.
  // Extras: rondas 3 y 5 (indices 2, 4). Modo 'full' = todo. Estrellas en % del modo (ver summary()).
  mode: { core: [0, 1, 3], extra: [2, 4], targetMin: 60, summaryMin: 33 },

  nLevels: [10, 20, 40, 80],            
  alphaLevels: [0.05, 0.01],
  alphaFromRound: 1,                    // alfa elegible desde la ronda 2 (indice 1): la eleccion de alfa esta en el NUCLEO (lote 2A-2)
  jamoviRounds: [1, 3],                 // rondas (indice) donde la app NO muestra p/IC/d: hay que sacarlos de Jamovi
  justificationRounds: [1, 2, 4],          // rondas con frase de justificacion de n y alfa
  consultantRound: 4,                   // desde esta ronda el "consulente" (tabla de potencia) esta tras un boton

  // ---- PUNTUACION (poeng) ----
  // Puntuacion del grupo = startPoeng + resultado de las rondas (ganancias - costes de estudio), con suelo
  // `floor` ("redningspakke" si el juego solo la baja de ahi). Las AYUDAS se restan despues:
  //   sluttpoeng = max(0, puntuacion de juego - puntos de ayuda)  -> nunca baja de 0 por culpa de las ayudas.
  // (startPoeng 300 = antiguo suelo -300 desplazado: el juego es el mismo, pero ahora la escala es >= 0.)
  score: { startPoeng: 300, floor: 0 },

  // ---- AYUDAS CON COSTE (hjelp) ----
  // freeUses: nº de ayudas gratis por partida (se aplican a las primeras ayudas de tipos con free:true).
  // cost: puntos que resta cada uso. Una ayuda ya desbloqueada en una pantalla no se vuelve a cobrar.
  // Tipos: hint = pista; konsulent = tabla de potencia (R5); fasit = ver los numeros de Jamovi (en vez de leerlos);
  //        modell = ver el texto modelo del reporte.
  // Sin ayuda de pago (siguen gratis por ser el instrumento del juego): barra de potencia en R1-R4, comprobador
  // del reporte, tillitsnivå. La ronda de practica no cobra ayudas. "Trenerpause": no existe en 6C.
  help: {
    freeUses: 0,                 // (ya no hay «mochila» de gratis: ver freePerRound)
    types: {
      hint:      { cost: 5,  freePerRound: true },       // 1 hint gratis por ronda, no acumulable
      konsulent: { cost: 35 },                              // de pago (lote 2B: ganancia maxima 31,1 segun QA; 28,7 con la matriz nueva)
      fasit:     { cost: 20 },                              // Jamovi da lo mismo gratis: el campo mostrado cuenta 0
      modell:    { cost: 30, freeAfterSubmit: true }        // modelo anotado: gratis tras entregar el borrador
    },
    order: ['hint', 'konsulent', 'fasit', 'modell']
  },

  // Umbrales de las tres estrellas (fijados de antemano, no comparan con otros grupos)
  thresholds: { velg: 4 /* de 6 */, kjor: 2 /* de 3 */, rapporter: 4 /* de 5 */ },

  // Badges activos (la profesora decidio 5 en total en el sistema; aqui 5 de los 7 aplicables a 6C)
  // Las 5 medallas de la profesora (ronda 5): Prøv igjen-laget sustituye a «Klar for kamp». Criterios escritos en strings.js (medalRule) y calculados en game.js summary().
  badgesActive: ['felle', 'magefolelse', 'rapport', 'jamovi', 'proveigjen'],

  // Tolerancias al comprobar lo que el alumnado lee en Jamovi (Jamovi redondea a 3 decimales)
  tol: { rel: 0.02, absMin: 0.0006, p: 0.0015, t: 0.02, d: 0.015 },

  storageKey: 'statistikklab.06c.run.v1',
  bestKey: 'statistikklab.06c.best.v1',
  // El alias (lagnavn) y el lema se guardan con _shared/alias.js (UNICA clave compartida por todos los juegos; migra las antiguas).
};
