/* Sons do Terrália — tudo gerado na hora com WebAudio (sem arquivos de áudio) */
window.SOM = (() => {
  let ctx = null, master, gMus, gSfx, musOn = false, timer = null;
  const cfg = {musica: .5, efeitos: .8, mudo: false};
  const ult = {};

  function iniciar() {
    if (ctx) { if (ctx.state === 'suspended' && !document.hidden) ctx.resume(); return; }
    const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return;
    ctx = new AC();
    master = ctx.createGain(); master.connect(ctx.destination);
    gMus = ctx.createGain(); gMus.connect(master);
    gSfx = ctx.createGain(); gSfx.connect(master);
    aplicar();
    carregarSons();
    if (musOn) tocarMusica();
  }
  // gravações reais (Mixkit, OpenGameArt CC0 e Pixabay — licenças livres para jogos); se não carregar, usa o som gerado
  const VAR = {vaca:['vaca', 'vaca2'], ovelha:['ovelha', 'ovelha2'], galinha:['galinha'], porco:['porco', 'porco2'], pato:['pato'], coelho:['coelho'], abelha:['abelha'],
    cachorro:['cachorro'], gato:['gato', 'gato2'], papagaio:['papagaio'], raposa:['raposa'], galo:['galo'], moeda:['moeda'], agua:['agua'], nivel:['nivel']};
  const ARQ = [].concat(...Object.values(VAR));
  const buf = {};
  const temBuf = n => VAR[n] && VAR[n].some(a => buf[a]);
  function carregarSons() {
    ARQ.forEach(n => fetch('assets/sons/' + n + '.mp3').then(r => r.ok ? r.arrayBuffer() : Promise.reject()).then(a => new Promise((ok, erro) => ctx.decodeAudioData(a, ok, erro))).then(b => { buf[n] = b; }).catch(() => {}));
  }
  function tocarBuf(n, t) {
    const ops = VAR[n].filter(a => buf[a]); const s = ctx.createBufferSource(); s.buffer = buf[ops[Math.random() * ops.length | 0]]; s.playbackRate.value = .94 + Math.random() * .12;
    const g = ctx.createGain(); g.gain.value = {galo:.45, moeda:.5, agua:.45, nivel:.55}[n] || .85; s.connect(g); g.connect(gSfx); s.start(t);
  }
  function aplicar() {
    if (!ctx) return;
    const t = ctx.currentTime;
    master.gain.setTargetAtTime(cfg.mudo ? 0 : 1, t, .05);
    gMus.gain.setTargetAtTime(cfg.musica * .8, t, .1);
    gSfx.gain.setTargetAtTime(cfg.efeitos * .9, t, .05);
  }
  function config(c) { Object.assign(cfg, c || {}); aplicar(); }

  // ---------- peças básicas ----------
  let ruidoBuf = null;
  function ruido() {
    if (ruidoBuf) return ruidoBuf;
    ruidoBuf = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
    const d = ruidoBuf.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    return ruidoBuf;
  }
  function env(g, t, a, dur, pico, rel = .08) {
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(pico, t + a);
    g.gain.setValueAtTime(pico, t + Math.max(a, dur - rel));
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  }
  // oscilador com curva de altura [[tempo, freq], ...]
  function osc(dest, tipo, t, dur, curva, pico, filtro, a = .01) {
    const o = ctx.createOscillator(), g = ctx.createGain(); o.type = tipo;
    o.frequency.setValueAtTime(curva[0][1], t);
    for (let i = 1; i < curva.length; i++) o.frequency.linearRampToValueAtTime(curva[i][1], t + curva[i][0]);
    env(g, t, a, dur, pico);
    let n = o;
    if (filtro) { const f = ctx.createBiquadFilter(); f.type = filtro.tipo || 'lowpass'; f.frequency.value = filtro.f; f.Q.value = filtro.q || 1; n.connect(f); n = f; }
    n.connect(g); g.connect(dest); o.start(t); o.stop(t + dur + .05);
    return o;
  }
  function chiado(dest, t, dur, pico, f, q = 1, tipo = 'bandpass', f2) {
    const s = ctx.createBufferSource(); s.buffer = ruido();
    const fl = ctx.createBiquadFilter(); fl.type = tipo; fl.frequency.setValueAtTime(f, t); if (f2) fl.frequency.exponentialRampToValueAtTime(f2, t + dur); fl.Q.value = q;
    const g = ctx.createGain(); env(g, t, .005, dur, pico, dur * .6);
    s.connect(fl); fl.connect(g); g.connect(dest); s.start(t, Math.random() * .5); s.stop(t + dur + .05);
  }
  // tremor (para o "béé" e o zumbido)
  function tremor(o, t, dur, hz, prof) {
    const l = ctx.createOscillator(), g = ctx.createGain(); l.frequency.value = hz; g.gain.value = prof;
    l.connect(g); return {l, g, start() { l.start(t); l.stop(t + dur + .05); }};
  }

  // ---------- efeitos ----------
  const SFX = {
    clique(t) { osc(gSfx, 'sine', t, .07, [[0, 880], [.06, 560]], .22); },
    abrir(t) { osc(gSfx, 'triangle', t, .09, [[0, 520], [.08, 780]], .18); },
    colher(t) { osc(gSfx, 'triangle', t, .09, [[0, 660]], .22); osc(gSfx, 'triangle', t + .07, .12, [[0, 990]], .2); },
    plantar(t) { osc(gSfx, 'sine', t, .12, [[0, 240], [.1, 120]], .35); chiado(gSfx, t, .08, .08, 900, .8); },
    agua(t) { chiado(gSfx, t, .35, .16, 2500, 1.2, 'bandpass', 700); chiado(gSfx, t + .05, .25, .08, 4000, 2, 'bandpass', 1500); },
    moeda(t) { osc(gSfx, 'square', t, .08, [[0, 988]], .07, {f: 3000}); osc(gSfx, 'square', t + .07, .22, [[0, 1319]], .07, {f: 3000}); },
    nivel(t) { [523, 659, 784, 1047].forEach((f, i) => osc(gSfx, 'triangle', t + i * .1, .25, [[0, f]], .2)); },
    erro(t) { osc(gSfx, 'square', t, .18, [[0, 180], [.15, 140]], .06, {f: 900}); },
    achou(t) { [784, 988, 1175, 1568].forEach((f, i) => osc(gSfx, 'sine', t + i * .06, .18, [[0, f]], .14)); },
    pop(t) { osc(gSfx, 'sine', t, .1, [[0, 300], [.08, 700]], .25); },
    // bichos
    vaca(t) {
      const c = [[0, 105], [.25, 128], [.8, 118], [1.15, 92]];
      osc(gSfx, 'sawtooth', t, 1.2, c, .32, {f: 520, q: 3}, .18);
      osc(gSfx, 'sawtooth', t, 1.2, c.map(([a, f]) => [a, f * 2.01]), .1, {f: 900, q: 4}, .2);
    },
    ovelha(t) {
      const o = osc(gSfx, 'sawtooth', t, .75, [[0, 300], [.1, 330], [.7, 285]], .2, {tipo: 'bandpass', f: 1100, q: 1.5}, .05);
      const tr = tremor(o, t, .75, 16, 22); tr.g.connect(o.frequency); tr.start();
    },
    galinha(t) {
      for (let i = 0; i < 3; i++) { const u = t + i * .12 + (i === 2 ? .08 : 0); osc(gSfx, 'square', u, .07, [[0, 520], [.05, 820]], .09, {tipo: 'bandpass', f: 1400, q: 3}); }
      osc(gSfx, 'square', t + .5, .2, [[0, 700], [.08, 1000], [.2, 650]], .08, {tipo: 'bandpass', f: 1500, q: 3});
    },
    coelho(t) { for (let i = 0; i < 3; i++) chiado(gSfx, t + i * .09, .05, .12, 3500, 3); osc(gSfx, 'sine', t + .32, .1, [[0, 1700], [.08, 2300]], .1); },
    pato(t) { for (let i = 0; i < 2; i++) osc(gSfx, 'sawtooth', t + i * .22, .16, [[0, 380], [.15, 300]], .16, {tipo: 'bandpass', f: 1100, q: 5}); },
    porco(t) { for (let i = 0; i < 2; i++) { osc(gSfx, 'sawtooth', t + i * .28, .2, [[0, 170], [.18, 120]], .22, {f: 700, q: 4}); chiado(gSfx, t + i * .28, .18, .06, 500, 2); } },
    abelha(t) {
      const o = osc(gSfx, 'sawtooth', t, 1, [[0, 215], [.5, 235], [1, 210]], .1, {tipo: 'bandpass', f: 700, q: 2}, .2);
      const tr = tremor(o, t, 1, 40, 12); tr.g.connect(o.frequency); tr.start();
    },
    cachorro(t) { for (let i = 0; i < 2; i++) { osc(gSfx, 'sawtooth', t + i * .2, .12, [[0, 420], [.1, 260]], .2, {f: 1200, q: 2}); chiado(gSfx, t + i * .2, .08, .08, 900, 1); } },
    gato(t) { const o = osc(gSfx, 'sawtooth', t, .7, [[0, 560], [.25, 760], [.7, 520]], .12, {tipo: 'bandpass', f: 900, q: 3}, .08); },
    raposa(t) { osc(gSfx, 'sawtooth', t, .18, [[0, 900], [.15, 1400]], .1, {tipo: 'bandpass', f: 1600, q: 3}); osc(gSfx, 'sawtooth', t + .22, .14, [[0, 1000], [.12, 1300]], .08, {tipo: 'bandpass', f: 1600, q: 3}); },
    papagaio(t) { osc(gSfx, 'square', t, .25, [[0, 1300], [.1, 1700], [.25, 1000]], .07, {tipo: 'bandpass', f: 2000, q: 2}); chiado(gSfx, t, .2, .05, 3000, 2); },
  };
  function tocar(nome, espera = 60) {
    if (!ctx || cfg.mudo || !cfg.efeitos || !(SFX[nome] || temBuf(nome))) return;
    const agora = performance.now(); if (ult[nome] && agora - ult[nome] < espera) return; ult[nome] = agora;
    try { if (temBuf(nome)) tocarBuf(nome, ctx.currentTime + .01); else if (SFX[nome]) SFX[nome](ctx.currentTime + .01); } catch (e) {}
  }

  // ---------- música de fazendinha (loop) ----------
  const BPM = 104, PASSO = 60 / BPM / 2; // colcheias
  const NOTA = n => 440 * Math.pow(2, (n - 69) / 12);
  // C  G  Am  F  |  C  F  G  C  — em dó maior
  const ACORDES = [[48, 52, 55], [43, 47, 50], [45, 48, 52], [41, 45, 48], [48, 52, 55], [41, 45, 48], [43, 47, 50], [48, 52, 55]];
  const PENTA = [72, 74, 76, 79, 81, 84];
  // melodia gerada uma vez (sempre a mesma, para soar como uma música)
  let semente = 7; const rnd = () => (semente = (semente * 16807) % 2147483647) / 2147483647;
  function frase(c0) {
    const m = [];
    for (let b = 0; b < 4; b++) {
      const ac = ACORDES[(c0 + b) % 8], alvo = ac.map(n => n + 24);
      for (let s = 0; s < 8; s++) {
        if (s === 0) m.push(alvo[rnd() * 3 | 0]);
        else if (rnd() < (s % 2 ? .45 : .2)) m.push(null);
        else if (s === 7 && b === 3) m.push(null);
        else m.push(rnd() < .55 ? alvo[rnd() * 3 | 0] : PENTA[rnd() * PENTA.length | 0]);
      }
    }
    return m;
  }
  const A = frase(0), B = frase(4), A2 = A.slice(0, 24).concat(frase(4).slice(24));
  const MEL = A.concat(B, A, A2); // 16 compassos
  let passo = 0, prox = 0;

  function agendar() {
    while (prox < ctx.currentTime + .15) {
      if (cfg.mudo || !cfg.musica) { passo++; prox += PASSO; continue; }
      const t = prox, s = passo % 128, comp = Math.floor(s / 8), dentro = s % 8;
      const ac = ACORDES[comp % 8];
      // baixo: 1 e 3
      if (dentro === 0 || dentro === 4) { const n = dentro === 0 ? ac[0] - 12 : ac[2] - 12; osc(gMus, 'triangle', t, PASSO * 3.2, [[0, NOTA(n)]], .32, null, .01); }
      // "violinha": acorde no contratempo
      if (dentro % 2 === 1) ac.forEach((n, i) => osc(gMus, 'triangle', t + i * .012, PASSO * .9, [[0, NOTA(n + 12)]], .06, {f: 2200}, .005));
      // melodia (assobio)
      const m = MEL[s];
      if (m) { const d = MEL[s + 1] === null ? PASSO * 1.8 : PASSO * .95; const o = osc(gMus, 'sine', t, d, [[0, NOTA(m)]], .13, null, .02); const v = ctx.createOscillator(), vg = ctx.createGain(); v.frequency.value = 5.5; vg.gain.value = 4; v.connect(vg); vg.connect(o.frequency); v.start(t); v.stop(t + d + .05);
        osc(gMus, 'triangle', t, d, [[0, NOTA(m)]], .04, {f: 3000}); }
      // chocalho leve
      if (dentro % 2 === 1) chiado(gMus, t, .05, .035, 7000, 1, 'highpass');
      if (dentro === 4) chiado(gMus, t, .09, .05, 2500, 1);
      // passarinho de vez em quando
      if (dentro === 0 && Math.random() < .12) { const u = t + Math.random() * .6, f = 2400 + Math.random() * 1200; for (let i = 0; i < 2 + (Math.random() * 3 | 0); i++) osc(gMus, 'sine', u + i * .11, .08, [[0, f], [.07, f * 1.35]], .035); }
      passo++; prox += PASSO;
    }
  }
  // música de verdade (arquivo); se falhar, toca a musiquinha gerada
  const FAIXAS = ['musica1', 'musica2', 'musica3']; // Mixkit: Fun at the Farm, Relaxing Country, At the Barn
  let faixa = null, faixaOk = null, nFaixa = 0;
  function tocarFaixa() {
    if (faixaOk === false) return false;
    if (!faixa) {
      faixa = new Audio(); faixa.preload = 'auto';
      try { ctx.createMediaElementSource(faixa).connect(gMus); } catch (e) {}
      faixa.addEventListener('error', () => { if (faixaOk) { proxFaixa(); return; } faixaOk = false; faixa = null; if (musOn) tocarMusica(); });
      faixa.addEventListener('ended', proxFaixa);
      faixa.src = 'assets/sons/' + FAIXAS[nFaixa] + '.mp3';
    }
    const p = faixa.play(); if (p && p.then) p.then(() => { faixaOk = true; }).catch(() => {});
    return true;
  }
  function proxFaixa() { if (!faixa) return; nFaixa = (nFaixa + 1) % FAIXAS.length; faixa.src = 'assets/sons/' + FAIXAS[nFaixa] + '.mp3'; if (musOn && !document.hidden) faixa.play().catch(() => {}); }
  function tocarMusica() {
    musOn = true;
    if (!ctx) return;
    if (tocarFaixa()) { if (!ult.galoInicio) { ult.galoInicio = 1; setTimeout(() => tocar('galo'), 600); } return; }
    if (timer) return;
    prox = ctx.currentTime + .1;
    timer = setInterval(() => { if (ctx.state === 'running') agendar(); }, 40);
  }
  function pararMusica() { musOn = false; clearInterval(timer); timer = null; if (faixa) faixa.pause(); }

  // destrava o áudio no 1º toque (regra dos navegadores)
  const destravar = () => iniciar();
  ['pointerdown', 'touchstart', 'keydown'].forEach(e => window.addEventListener(e, destravar, {passive: true}));
  document.addEventListener('visibilitychange', () => { if (!ctx) return; if (document.hidden) { ctx.suspend(); if (faixa) faixa.pause(); } else { ctx.resume(); if (faixa && musOn) faixa.play().catch(() => {}); } });

  return {tocar, tocarMusica, pararMusica, config, iniciar, get cfg() { return cfg; }};
})();
