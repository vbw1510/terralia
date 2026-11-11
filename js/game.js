/* Terrália Farm — jogo de fazenda 3D (mobile first, horizontal)
   Estrutura: DADOS → MAPA → ESTADO → CENA 3D → MODELOS → OBJETOS DO MAPA → PERSONAGENS → CANTEIROS
              → REGRAS → EDIÇÃO → INTERFACE → ENTRADA → LOOP */
(() => {
  if (!window.THREE) { document.body.innerHTML = '<div class="erro">Não consegui carregar o motor 3D. Recarregue a página.</div>'; return; }
  const KEY = 'terralia-v1';
  const ON = {sb:null, user:null, sujo:false, enviando:false, recarregando:false, ultimo:0, erro:'', nuvem:null, ordem:'nivel', rank:null, rankErro:'', carregandoRank:false}; // estado online
  let pedidoInstalar = null; // pedido de instalação do app (Chrome)
  const instalado = () => matchMedia('(display-mode: fullscreen), (display-mode: standalone)').matches || !!navigator.standalone;
  const VERSAO = '0.31'; // a cada atualização: aumentar aqui e no versao.json
  const MODO_TESTE = true; // fase de testes: mostra o botão Recomeçar. No lançamento, trocar para false.
  const MOBILE = matchMedia('(pointer:coarse)').matches || Math.min(screen.width, screen.height) < 600;
  const ICO = window.ICONES || {};

  // ================= DADOS =================
  const CROPS = [
    // trigo, milho e cenoura: os 3 primeiros (baratos e usados na ração dos bichos); alface vem depois
    {id:'trigo',   nome:'Trigo',   emoji:'🌾', semente:2,   tempo:30,  preco:7,   xp:1,  nivel:1},
    {id:'milho',   nome:'Milho',   emoji:'🌽', semente:5,   tempo:45,  preco:15,  xp:2,  nivel:1},
    {id:'cenoura', nome:'Cenoura', emoji:'🥕', semente:10,  tempo:60,  preco:26,  xp:4,  nivel:1},
    {id:'alface',  nome:'Alface',  emoji:'🥬', semente:20,  tempo:90,  preco:50,  xp:7,  nivel:2},
    {id:'tomate',  nome:'Tomate',  emoji:'🍅', semente:35,  tempo:120,  preco:84,  xp:11, nivel:3},
    {id:'morango', nome:'Morango', emoji:'🍓', semente:60,  tempo:180, preco:148, xp:17, nivel:4},
    {id:'abobora', nome:'Abóbora', emoji:'🎃', semente:115, tempo:270, preco:285, xp:28, nivel:5},
    {id:'batata',  nome:'Batata',  emoji:'🥔', semente:45,  tempo:300, preco:118, xp:18, nivel:7},
    {id:'girassol',nome:'Girassol',emoji:'🌻', semente:70,  tempo:420, preco:178, xp:26, nivel:9},
    {id:'cana',    nome:'Cana',    emoji:'🎋', semente:65,  tempo:480, preco:172, xp:28, nivel:11},
    {id:'algodao', nome:'Algodão', emoji:'🤍', semente:110, tempo:600, preco:285, xp:38, nivel:13},
    {id:'pimentao',nome:'Pimentão',emoji:'🫑', semente:95,  tempo:540, preco:250, xp:35, nivel:15},
    {id:'melancia',nome:'Melancia',emoji:'🍉', semente:190, tempo:900, preco:520, xp:60, nivel:18},
    {id:'cafe',    nome:'Café',    emoji:'🫘', semente:280, tempo:1200,preco:780, xp:85, nivel:22},
    {id:'uva',     nome:'Uva',     emoji:'🍇', semente:230, tempo:390, preco:590, xp:45, nivel:6},
  ];
  const EXTRAS = [
    {id:'ovo',   nome:'Ovo',   emoji:'🥚', preco:18, animal:'galinha'},
    {id:'leite', nome:'Leite', emoji:'🥛', preco:40, animal:'vaca'},
    {id:'la',    nome:'Lã',    emoji:'🧶', preco:70, animal:'ovelha'},
    {id:'angora', nome:'Pelo de angorá', emoji:'☁️', preco:120, animal:'coelho'},
    {id:'pena',   nome:'Pena',   emoji:'🪶', preco:85,  animal:'pato'},
    {id:'trufa',  nome:'Trufa',  emoji:'🍄', preco:260, animal:'porco'},
    {id:'mel',    nome:'Mel',    emoji:'🍯', preco:190, animal:'abelha'},
  ];
  // frutas das árvores do pomar (plantou uma vez, colhe sempre)
  const FRUTAS = [
    {id:'maca',    nome:'Maçã',    emoji:'🍎', preco:60,  nivel:8,  arvore:'macieira',   tempo:1800, rende:4, cor:0xe83b2c},
    {id:'laranja', nome:'Laranja', emoji:'🍊', preco:75,  nivel:12, arvore:'laranjeira', tempo:2700, rende:4, cor:0xf59a23},
    {id:'cereja',  nome:'Cereja',  emoji:'🍒', preco:110, nivel:17, arvore:'cerejeira',  tempo:3600, rende:4, cor:0xc8102e},
  ];
  // rações: feitas no moinho, servem para alimentar os animais (não são vendidas)
  const RACOES = [
    {id:'racaoG', nome:'Ração de galinha', emoji:'🥣', animal:'galinha', ing:{trigo:3}, tempo:60, nivel:2, preco:0, racao:true, rende:3},
    {id:'racaoV', nome:'Ração de vaca',    emoji:'🥣', animal:'vaca',    ing:{milho:2, trigo:2}, tempo:120, nivel:3, preco:0, racao:true, rende:3},
    {id:'racaoO', nome:'Ração de ovelha',  emoji:'🥣', animal:'ovelha',  ing:{trigo:2, cenoura:2}, tempo:180, nivel:5, preco:0, racao:true, rende:3},
    {id:'racaoC', nome:'Ração de coelho',  emoji:'🥣', animal:'coelho',  ing:{alface:2, cenoura:2}, tempo:240, nivel:8, preco:0, racao:true, rende:3},
    {id:'racaoP', nome:'Ração de pato',    emoji:'🥣', animal:'pato',    ing:{trigo:2, alface:1},   tempo:200, nivel:10, preco:0, racao:true, rende:3},
    {id:'racaoS', nome:'Ração de porco',   emoji:'🥣', animal:'porco',   ing:{milho:2, batata:2},   tempo:300, nivel:12, preco:0, racao:true, rende:3},
    {id:'nectar', nome:'Néctar de flores', emoji:'🥣', animal:'abelha',  ing:{girassol:2},          tempo:300, nivel:14, preco:0, racao:true, rende:3},
  ];
  RACOES.forEach(r => r.fab = 'moinho');
  Object.assign(RACOES[0], {mini:'🐔', cor:'#f5c542'}); Object.assign(RACOES[1], {mini:'🐄', cor:'#6cc357'}); Object.assign(RACOES[2], {mini:'🐑', cor:'#5bb3ea'}); Object.assign(RACOES[3], {mini:'🐰', cor:'#f29ac0'}); Object.assign(RACOES[4], {mini:'🦆', cor:'#7fd3d9'}); Object.assign(RACOES[5], {mini:'🐷', cor:'#f7a6a6'}); Object.assign(RACOES[6], {mini:'🐝', cor:'#ffcf3f'});
  // produtos das fábricas (valem bem mais que o ingrediente cru)
  const PRODUTOS = [
    {id:'pao',      nome:'Pão',               emoji:'🍞', fab:'padaria',   ing:{trigo:3},                     tempo:180,  preco:60,   xp:6,  nivel:4},
    {id:'paoMilho', nome:'Pão de milho',      emoji:'🌽', fab:'padaria',   ing:{milho:2, ovo:1},              tempo:300,  preco:150,  xp:10, nivel:4},
    {id:'bolo',     nome:'Bolo',              emoji:'🎂', fab:'padaria',   ing:{trigo:2, ovo:2, leite:1},     tempo:600,  preco:320,  xp:18, nivel:5},
    {id:'sanduiche',nome:'Sanduíche',         emoji:'🥪', fab:'padaria',   ing:{pao:1, alface:1, queijo:1},   tempo:540,  preco:480,  xp:24, nivel:6},
    {id:'manteiga', nome:'Manteiga',          emoji:'🧈', fab:'laticinio', ing:{leite:2},                     tempo:360,  preco:140,  xp:10, nivel:5},
    {id:'queijo',   nome:'Queijo',            emoji:'🧀', fab:'laticinio', ing:{leite:3},                     tempo:600,  preco:210,  xp:14, nivel:5},
    {id:'iogurte',  nome:'Iogurte de morango',emoji:'🍓', fab:'laticinio', ing:{leite:1, morango:2},          tempo:480,  preco:330,  xp:18, nivel:6},
    {id:'novelo',   nome:'Novelo de linha',   emoji:'🧶', fab:'tecelagem', ing:{la:1},                        tempo:300,  preco:110,  xp:8,  nivel:6},
    {id:'cachecol', nome:'Cachecol',          emoji:'🧣', fab:'tecelagem', ing:{la:2},                        tempo:720,  preco:240,  xp:16, nivel:6},
    {id:'sueter',   nome:'Suéter',            emoji:'🧥', fab:'tecelagem', ing:{la:3, novelo:1},              tempo:1500, preco:520,  xp:30, nivel:7},
    {id:'luvas',    nome:'Luvas de angorá',   emoji:'🧤', fab:'tecelagem', ing:{angora:2},                    tempo:900,  preco:380,  xp:20, nivel:8},
    {id:'gorro',    nome:'Gorro de angorá',   emoji:'👒', fab:'tecelagem', ing:{angora:3, novelo:1},          tempo:1800, preco:760,  xp:36, nivel:9},
    {id:'omelete',  nome:'Omelete',           emoji:'🍳', fab:'cozinha',   ing:{ovo:2, tomate:1},             tempo:480,  preco:150,  xp:10, nivel:7},
    {id:'salada',   nome:'Salada da horta',   emoji:'🥗', fab:'cozinha',   ing:{alface:2, tomate:1, cenoura:1}, tempo:420, preco:290,  xp:15, nivel:7},
    {id:'torta',    nome:'Torta de abóbora',  emoji:'🥧', fab:'cozinha',   ing:{abobora:1, ovo:2, trigo:2},   tempo:1200, preco:640,  xp:32, nivel:7},
    {id:'geleia',   nome:'Geleia de uva',     emoji:'🍇', fab:'cozinha',   ing:{uva:3},                       tempo:900,  preco:1900, xp:60, nivel:8},
    {id:'paoMel',   nome:'Pão de mel',        emoji:'🍪', fab:'padaria',   ing:{trigo:2, mel:1},              tempo:720,  preco:520,  xp:26, nivel:14},
    {id:'tortaMaca',nome:'Torta de maçã',     emoji:'🥧', fab:'padaria',   ing:{maca:3, trigo:2, acucar:1},   tempo:1200, preco:880,  xp:40, nivel:13},
    {id:'batataFrita',nome:'Batata frita',    emoji:'🍟', fab:'cozinha',   ing:{batata:3, oleo:1},            tempo:600,  preco:720,  xp:34, nivel:12},
    {id:'sucoLaranja',nome:'Suco de laranja', emoji:'🧃', fab:'cozinha',   ing:{laranja:3},                   tempo:480,  preco:330,  xp:18, nivel:12},
    {id:'risoto',   nome:'Risoto de trufa',   emoji:'🍲', fab:'cozinha',   ing:{trufa:1, leite:1, batata:2},  tempo:1500, preco:1150, xp:52, nivel:15},
    {id:'camiseta', nome:'Camiseta',          emoji:'👕', fab:'tecelagem', ing:{algodao:3},                   tempo:1200, preco:1000, xp:44, nivel:13},
    {id:'travesseiro',nome:'Travesseiro de penas',emoji:'🛏️', fab:'tecelagem', ing:{pena:4, algodao:2},      tempo:1800, preco:1050, xp:50, nivel:14},
    {id:'acucar',   nome:'Açúcar',            emoji:'🧂', fab:'engenho',   ing:{cana:3},                      tempo:420,  preco:560,  xp:22, nivel:11},
    {id:'oleo',     nome:'Óleo de girassol',  emoji:'🫗', fab:'engenho',   ing:{girassol:3},                  tempo:480,  preco:580,  xp:24, nivel:11},
    {id:'melado',   nome:'Melado',            emoji:'🍯', fab:'engenho',   ing:{cana:2, mel:1},               tempo:900,  preco:620,  xp:30, nivel:14},
    {id:'cupcake',  nome:'Cupcake',           emoji:'🧁', fab:'docaria',   ing:{trigo:2, acucar:1, ovo:1},    tempo:900,  preco:780,  xp:36, nivel:13},
    {id:'pudim',    nome:'Pudim',             emoji:'🍮', fab:'docaria',   ing:{leite:2, acucar:1, ovo:2},    tempo:1200, preco:900,  xp:42, nivel:14},
    {id:'balaMel',  nome:'Bala de mel',       emoji:'🍬', fab:'docaria',   ing:{mel:1, acucar:1},             tempo:600,  preco:900,  xp:34, nivel:15},
    {id:'docePimenta',nome:'Geleia de pimentão',emoji:'🫙', fab:'docaria', ing:{pimentao:3, acucar:1},        tempo:1200, preco:1400, xp:48, nivel:16},
    {id:'sorvete',  nome:'Sorvete de morango',emoji:'🍨', fab:'sorveteria',ing:{leite:2, morango:2, acucar:1},tempo:900,  preco:1180, xp:46, nivel:16},
    {id:'picole',   nome:'Picolé de melancia',emoji:'🍧', fab:'sorveteria',ing:{melancia:1, acucar:1},        tempo:720,  preco:1150, xp:44, nivel:18},
    {id:'sorveteCereja',nome:'Sorvete de cereja',emoji:'🍒', fab:'sorveteria',ing:{leite:2, cereja:3, acucar:1},tempo:1200,preco:1500, xp:58, nivel:18},
    {id:'cafeGelado',nome:'Café gelado',      emoji:'🧋', fab:'sorveteria',ing:{cafe:1, leite:2, acucar:1},   tempo:1500, preco:1900, xp:70, nivel:22},
  ];
  const FABRICAS = {
    moinho:    {nome:'Moinho',     emoji:'🌾', receitas:RACOES},
    padaria:   {nome:'Padaria',    emoji:'🥖', receitas:PRODUTOS.filter(p => p.fab === 'padaria')},
    laticinio: {nome:'Laticínio',  emoji:'🧀', receitas:PRODUTOS.filter(p => p.fab === 'laticinio')},
    tecelagem: {nome:'Tecelagem',  emoji:'🧵', receitas:PRODUTOS.filter(p => p.fab === 'tecelagem')},
    cozinha:   {nome:'Cozinha da fazenda', emoji:'🍳', receitas:PRODUTOS.filter(p => p.fab === 'cozinha')},
    engenho:   {nome:'Engenho',    emoji:'🏭', receitas:PRODUTOS.filter(p => p.fab === 'engenho')},
    docaria:   {nome:'Docaria',    emoji:'🧁', receitas:PRODUTOS.filter(p => p.fab === 'docaria')},
    sorveteria:{nome:'Sorveteria', emoji:'🍨', receitas:PRODUTOS.filter(p => p.fab === 'sorveteria')},
  };
  const ITENS = [...CROPS, ...EXTRAS, ...FRUTAS, ...RACOES, ...PRODUTOS];
  const VENDAVEIS = ITENS.filter(i => !i.racao);
  const UPG = {
    // niv = nível do jogador necessário para cada nível da melhoria
    botas:    {nome:'Botas de couro',  emoji:'🥾', desc:'O fazendeiro anda 15% mais rápido por nível.', max:10, base:200, mult:2, niv:[2, 4, 6, 8, 10, 20, 35, 55, 80, 110]},
    ferram:   {nome:'Ferramentas de qualidade', emoji:'🧰', desc:'Plantar, regar e colher mais rápido a cada nível.', max:10, base:250, mult:2.1, niv:[2, 4, 6, 8, 10, 22, 38, 58, 85, 120]},
    fertil:   {nome:'Fertilizante',   emoji:'🌿', desc:'Plantas e árvores crescem 10% mais rápido a cada nível.', max:12, base:120, mult:2.1, niv:[3, 5, 7, 9, 11, 18, 28, 40, 55, 75, 100, 140]},
    maos:     {nome:'Mãos de fazendeiro', emoji:'🧤', desc:'Mais chance de colher em dobro: +5% a cada nível.', max:4, base:400, mult:2.6, niv:[4, 8, 13, 18]},
    moinhoVaga:{nome:'Fábricas maiores', emoji:'⚙️', desc:'+1 vaga na fila de produção do moinho e de todas as fábricas.', max:8, base:500, mult:2.2, niv:[4, 6, 8, 16, 30, 50, 80, 120]},
    adubo:    {nome:'Adubo especial', emoji:'🧪', desc:'+12% de chance de colheita dupla por nível.', max:5, base:150, mult:2.3, niv:[5, 7, 9, 11, 13]},
    aspersor: {nome:'Aspersores',     emoji:'💦', desc:'Tudo que você planta já nasce regado.', max:1, base:1200, mult:1, niv:[7]},
  };
  // materiais de ampliação: caem de vez em quando ao colher, coletar e produzir (não ocupam espaço)
  const MATERIAIS = {
    parafuso:{nome:'Parafuso', emoji:'🔩', para:'armazem'}, tabua:{nome:'Tábua', emoji:'🪓', para:'armazem'}, fita:{nome:'Fita adesiva', emoji:'🎗️', para:'armazem'},
    prego:{nome:'Prego', emoji:'📌', para:'celeiro'}, tijolo:{nome:'Tijolo', emoji:'🧱', para:'celeiro'}, tinta:{nome:'Lata de tinta', emoji:'🎨', para:'celeiro'},
    escritura:{nome:'Escritura', emoji:'📜', para:'ilha'}, marreta:{nome:'Marreta', emoji:'🔨', para:'ilha'}, estaca:{nome:'Estaca', emoji:'📍', para:'ilha'},
  };
  // ícones desenhados dos materiais (emoji falham em alguns celulares)
  const MAT_SVG = (() => {
    const s = d => `<svg viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg" stroke-linejoin="round" stroke-linecap="round">${d}</svg>`;
    return {
      parafuso: s(`<path d="M18 14h28l-4 9H22z" fill="#ffd76a" stroke="#7a4f0e" stroke-width="3"/><rect x="26" y="23" width="12" height="30" rx="2" fill="#e9b443" stroke="#7a4f0e" stroke-width="3"/>
        <path d="M26 29l12-3M26 36l12-3M26 43l12-3M26 50l12-3" stroke="#7a4f0e" stroke-width="2.4"/><path d="M28 53l4 7 4-7" fill="#e9b443" stroke="#7a4f0e" stroke-width="3"/><path d="M27 15v7M37 15v7" stroke="#7a4f0e" stroke-width="2.4"/><path d="M21 16h7" stroke="#fff" stroke-width="2" opacity=".7"/>`),
      tabua: s(`<path d="M6 30l42-14 10 8-42 15z" fill="#e0a45c" stroke="#6b3d14" stroke-width="3"/><path d="M6 30l10 9v10L6 40z" fill="#b8742e" stroke="#6b3d14" stroke-width="3"/><path d="M16 39l42-15v10L16 49z" fill="#c98640" stroke="#6b3d14" stroke-width="3"/>
        <path d="M14 30c8-3 16-4 24-9M20 34c10-4 18-5 28-11" stroke="#9a5a1f" stroke-width="1.8" fill="none"/><circle cx="34" cy="26" r="2" fill="#9a5a1f"/><circle cx="30" cy="42" r="1.6" fill="#3b4652"/><circle cx="50" cy="35" r="1.6" fill="#3b4652"/>`),
      fita: s(`<circle cx="30" cy="34" r="22" fill="#d9d9d9" stroke="#59606a" stroke-width="3"/><circle cx="30" cy="34" r="16" fill="#efe3b0" stroke="#a89350" stroke-width="2"/><circle cx="30" cy="34" r="9" fill="#fff" stroke="#59606a" stroke-width="3"/>
        <path d="M44 50l16 4-2 8-17-6z" fill="#efe3b0" stroke="#a89350" stroke-width="2.4"/><path d="M58 54l2 8" stroke="#a89350" stroke-width="2"/><path d="M14 26a17 17 0 0 1 8-8" stroke="#fff" stroke-width="3" fill="none" opacity=".7"/>`),
      prego: s(`<rect x="14" y="10" width="36" height="8" rx="3" fill="#c9d2dc" stroke="#3b4652" stroke-width="3"/><path d="M28 18h8v34l-4 9-4-9z" fill="#aab6c3" stroke="#3b4652" stroke-width="3"/><path d="M30 21v28" stroke="#fff" stroke-width="2" opacity=".7"/>`),
      tijolo: s(`<path d="M6 28l30-10 22 8-30 11z" fill="#e8806a" stroke="#6b2a1c" stroke-width="3"/><path d="M6 28l22 9v14L6 42z" fill="#b5503b" stroke="#6b2a1c" stroke-width="3"/><path d="M28 37l30-11v14L28 51z" fill="#cf6750" stroke="#6b2a1c" stroke-width="3"/>
        <path d="M36 37l6-2M46 33l6-2M34 46l6-2M44 42l6-2" stroke="#8a3a29" stroke-width="2"/>`),
      tinta: s(`<path d="M12 22h40v30a6 6 0 0 1-6 6H18a6 6 0 0 1-6-6z" fill="#7aa8d8" stroke="#24476e" stroke-width="3"/><ellipse cx="32" cy="22" rx="20" ry="6" fill="#ff8a3d" stroke="#24476e" stroke-width="3"/>
        <path d="M18 24c0 8 4 6 4 12" stroke="#ff8a3d" stroke-width="5" fill="none"/><rect x="20" y="36" width="24" height="12" rx="2" fill="#fff" stroke="#24476e" stroke-width="2"/><path d="M12 22c0-14 40-14 40 0" fill="none" stroke="#59606a" stroke-width="2.6"/>`),
      escritura: s(`<rect x="12" y="10" width="40" height="44" rx="4" fill="#fbefc9" stroke="#7a5420" stroke-width="3"/><path d="M19 20h26M19 27h26M19 34h18" stroke="#b08a4a" stroke-width="2.6"/>
        <circle cx="42" cy="46" r="8" fill="#d8443a" stroke="#7a1e18" stroke-width="2.6"/><path d="M38 52l-3 9 7-4 7 4-3-9" fill="#d8443a" stroke="#7a1e18" stroke-width="2.2"/>`),
      marreta: s(`<path d="M30 30l6-6 22 30-5 5z" fill="#c98640" stroke="#6b3d14" stroke-width="3"/><path d="M6 20l14-14 18 18-14 14z" fill="#8b96a3" stroke="#2c333b" stroke-width="3"/><path d="M10 20l10-10" stroke="#c9d2dc" stroke-width="3"/>`),
      estaca: s(`<path d="M26 8h12v40l-6 12-6-12z" fill="#e0a45c" stroke="#6b3d14" stroke-width="3"/><path d="M26 18h12v6H26z" fill="#d8443a" stroke="#6b3d14" stroke-width="2.4"/><path d="M30 28v18" stroke="#9a5a1f" stroke-width="2"/><ellipse cx="32" cy="58" rx="16" ry="3.5" fill="#7a9a4a" opacity=".6"/>`),
    };
  })();
  const matIco = m => `<i class="mi">${MAT_SVG[m] || ''}</i>`;
  const matsDe = para => Object.keys(MATERIAIS).filter(k => MATERIAIS[k].para === para);
  const PETS = {
    cachorro: {nome:'Pipoca', especie:'Cachorro',      img:'cachorro.jpg', custo:2500, nivel:3, desc:'Late e avisa quando tem planta pronta, e de vez em quando cava e acha moedas ou sementes.'},
    raposa:   {nome:'Lumi',   especie:'Raposa mágica', img:'raposa.jpg',   custo:6000, nivel:5, desc:'A magia dela faz as plantas crescerem 25% mais rápido.'},
    gato:     {nome:'Mingau', especie:'Gato',          img:null, emoji:'🐱', custo:4500, nivel:7,  desc:'Espanta os ratinhos: os animais produzem 10% mais rápido.'},
    papagaio: {nome:'Kiwi',   especie:'Papagaio',      img:null, emoji:'🦜', custo:9000, nivel:11, desc:'Conversa com os clientes: os pedidos do caminhão pagam 15% a mais.'},
  };
  const ANIMAIS = {
    galinha: {nome:'Galinha', plural:'Galinhas', emoji:'🐔', img:null,       prod:'ovo',   tempo:120, porRacao:3, racao:'racaoG', porCercado:6, custo:150,  mult:1.3,  nivel:1, cercado:'galinheiro'},
    vaca:    {nome:'Vaca',    plural:'Vacas',    emoji:'🐄', img:'vaca.jpg', prod:'leite', tempo:300, porRacao:2, racao:'racaoV', porCercado:3, custo:800,  mult:1.45, nivel:2, cercado:'curral'},
    ovelha:  {nome:'Ovelha',  plural:'Ovelhas',  emoji:'🐑', img:null,       prod:'la',    tempo:480, porRacao:2, racao:'racaoO', porCercado:4, custo:1400, mult:1.4,  nivel:4, cercado:'pasto'},
    coelho:  {nome:'Coelho',  plural:'Coelhos',  emoji:'🐰', img:null,       prod:'angora', tempo:600, porRacao:2, racao:'racaoC', porCercado:5, custo:2200, mult:1.4, nivel:8, cercado:'coelheira'},
    pato:    {nome:'Pato',    plural:'Patos',    emoji:'🦆', img:null,       prod:'pena',   tempo:420, porRacao:3, racao:'racaoP', porCercado:5, custo:2600, mult:1.4, nivel:10, cercado:'lagoinha'},
    porco:   {nome:'Porco',   plural:'Porcos',   emoji:'🐷', img:null,       prod:'trufa',  tempo:900, porRacao:2, racao:'racaoS', porCercado:3, custo:4200, mult:1.45, nivel:12, cercado:'chiqueiro', fem:false},
    abelha:  {nome:'Abelha',  plural:'Abelhas',  emoji:'🐝', img:null,       prod:'mel',    tempo:720, porRacao:3, racao:'nectar', porCercado:6, custo:3000, mult:1.35, nivel:14, cercado:'apiario'},
  };
  // construções do mapa (tamanho em células da grade)
  const TIPOS = {
    lote:       {nome:'Lote de plantio', w:2, d:2},
    celeiro:    {nome:'Celeiro',    w:3, d:3, abre:'celeiro', obst:true},
    armazem:    {nome:'Armazém',    w:3, d:2, abre:'armazem', obst:true},
    loja:       {nome:'Loja',       w:3, d:3, abre:'loja', obst:true},
    moinho:     {nome:'Moinho',     w:2, d:2, obst:true, fab:true},
    padaria:    {nome:'Padaria',    w:2, d:2, obst:true, fab:true},
    laticinio:  {nome:'Laticínio',  w:2, d:2, obst:true, fab:true},
    tecelagem:  {nome:'Tecelagem',  w:2, d:2, obst:true, fab:true},
    cozinha:    {nome:'Cozinha da fazenda', w:2, d:2, obst:true, fab:true},
    poco:       {nome:'Poço',       w:1, d:1, obst:true},
    galinheiro: {nome:'Galinheiro', w:3, d:2, animal:'galinha'},
    curral:     {nome:'Curral',     w:3, d:3, animal:'vaca'},
    pasto:      {nome:'Pasto',      w:3, d:3, animal:'ovelha'},
    coelheira:  {nome:'Coelheira',  w:3, d:2, animal:'coelho', fem:true},
    lagoinha:   {nome:'Lagoinha',   w:3, d:3, animal:'pato', fem:true},
    chiqueiro:  {nome:'Chiqueiro',  w:3, d:2, animal:'porco'},
    apiario:    {nome:'Apiário',    w:2, d:2, animal:'abelha'},
    engenho:    {nome:'Engenho',    w:2, d:2, obst:true, fab:true},
    docaria:    {nome:'Docaria',    w:2, d:2, obst:true, fab:true},
    sorveteria: {nome:'Sorveteria', w:2, d:2, obst:true, fab:true},
    casinhaPet: {nome:'Casinha dos bichinhos', w:2, d:2, obst:true},
    macieira:   {nome:'Macieira',   w:1, d:1, obst:true, fruta:'maca'},
    laranjeira: {nome:'Laranjeira', w:1, d:1, obst:true, fruta:'laranja'},
    cerejeira:  {nome:'Cerejeira',  w:1, d:1, obst:true, fruta:'cereja'},
    lago:       {nome:'Lago',       w:3, d:3, obst:true},
    // decorações (só deixam a fazenda bonita)
    flores:     {nome:'Canteiro de flores', w:1, d:1, decor:true},
    caminho:    {nome:'Caminho de pedras',  w:1, d:1, decor:true},
    cercaDec:   {nome:'Cerca branca',       w:1, d:1, decor:true},
    banco:      {nome:'Banco de praça',     w:1, d:1, decor:true, obst:true},
    espantalho: {nome:'Espantalho',         w:1, d:1, decor:true, obst:true},
    poste:      {nome:'Poste de luz',       w:1, d:1, decor:true, obst:true},
    arvoreDec:  {nome:'Árvore frutífera',   w:1, d:1, decor:true, obst:true},
    fonte:      {nome:'Fonte',              w:2, d:2, decor:true, obst:true},
  };
  const DECOR = [
    {tipo:'flores', icone:'🌷', preco:40, nivel:1}, {tipo:'caminho', icone:'🪨', preco:15, nivel:1}, {tipo:'cercaDec', icone:'🤍', preco:25, nivel:1},
    {tipo:'banco', icone:'🪑', preco:80, nivel:2}, {tipo:'espantalho', icone:'🎃', preco:120, nivel:2}, {tipo:'poste', icone:'💡', preco:150, nivel:3},
    {tipo:'arvoreDec', icone:'🍎', preco:200, nivel:3}, {tipo:'fonte', icone:'⛲', preco:900, nivel:5},
  ];
  const MERCADO_MS = 20000;

  const $ = s => document.querySelector(s);
  // ícone de item: rações ganham um saquinho colorido com o bichinho
  const emojiItem = it => it.racao ? it.mini : it.emoji;
  function iconeItem(it, cls = '') {
    if (!it.racao) return `<span class="${cls}">${it.emoji}</span>`;
    return `<span class="racao-ic ${cls}"><svg viewBox="0 0 64 64"><path d="M14 22c-4 10-4 26 0 34 4 4 32 4 36 0 4-8 4-24 0-34z" fill="${it.cor}" stroke="#5a3519" stroke-width="3"/><path d="M16 22h32l-4-10H20z" fill="${it.cor}" stroke="#5a3519" stroke-width="3"/><path d="M18 17h28" stroke="#fff" stroke-opacity=".5" stroke-width="3"/><circle cx="32" cy="41" r="13" fill="#fffaf0" stroke="#5a3519" stroke-width="2.5"/></svg><i>${it.mini}</i></span>`;
  }
  const crop = id => CROPS.find(c => c.id === id);
  const item = id => ITENS.find(c => c.id === id);
  const fmtT = s => { s = Math.max(0, Math.ceil(s)); if (s >= 3600) { const h = Math.floor(s / 3600), m = Math.floor(s % 3600 / 60); return `${h}h ${String(m).padStart(2, '0')}m`; } const m = Math.floor(s / 60), r = s % 60; return m ? `${m}m ${String(r).padStart(2, '0')}s` : `${r}s`; };
  const fmtN = n => Math.round(n).toLocaleString('pt-BR');
  const rnd = (a, b) => a + Math.random() * (b - a);
  const V3 = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);

  // ================= MAPA (grade e terras) =================
  const G = 2.15;                 // tamanho de uma célula
  // expansões: cada anel aumenta a ilha em 5 células para cada lado (lido antes de montar o mapa; comprar uma expansão recarrega o jogo)
  const VISITA = (() => { try { return JSON.parse(sessionStorage.getItem('terralia-visita')); } catch (e) { return null; } })(); // visitando a fazenda de outro jogador
  const ANEL = (() => { try { return Math.max(0, Math.min(6, (VISITA ? VISITA.dados : JSON.parse(localStorage.getItem('terralia-v1'))).expansao | 0)); } catch (e) { return 0; } })();
  const MAX_ANEL = 6;
  const OFF = 12 + 5 * ANEL, ZONA = 5, NZ = 5 + 2 * ANEL; // células de -OFF a OFF, terras de 5×5 células
  const MEIA = (OFF + .5) * G + 1.6; // metade do lado da ilha quadrada
  const zonaDe = (cx, cz) => [Math.floor((cx + 12) / ZONA), Math.floor((cz + 12) / ZONA)]; // chaves das terras não mudam quando a ilha cresce
  const zKey = (zx, zz) => zx + ',' + zz;
  const celulaUtil = (cx, cz) => Math.abs(cx) <= OFF && Math.abs(cz) <= OFF;
  const ZONAS = []; // terras que existem (com espaço suficiente dentro da ilha)
  for (let zx = -ANEL; zx < 5 + ANEL; zx++) for (let zz = -ANEL; zz < 5 + ANEL; zz++) {
    const cel = [];
    for (let i = 0; i < ZONA; i++) for (let j = 0; j < ZONA; j++) { const cx = zx * ZONA - 12 + i, cz = zz * ZONA - 12 + j; if (celulaUtil(cx, cz)) cel.push([cx, cz]); }
    if (cel.length >= 6) ZONAS.push({key:zKey(zx, zz), zx, zz, cel, anel:Math.max(-zx, -zz, zx - 4, zz - 4, 0), inicial:zx >= 1 && zx <= 3 && zz >= 1 && zz <= 3});
  }
  const zonaLiberada = (cx, cz) => { const [zx, zz] = zonaDe(cx, cz); return S.zonas.includes(zKey(zx, zz)); };
  const dims = o => o.rot % 2 ? [TIPOS[o.tipo].d, TIPOS[o.tipo].w] : [TIPOS[o.tipo].w, TIPOS[o.tipo].d];
  const centro = o => { const [W, D] = dims(o); return V3((o.ox + (W - 1) / 2) * G, 0, (o.oz + (D - 1) / 2) * G); };
  function celulas(o) { const [W, D] = dims(o), out = []; for (let i = 0; i < W; i++) for (let j = 0; j < D; j++) out.push([o.ox + i, o.oz + j]); return out; }

  // ================= ESTADO =================
  let S;
  let proxId = 1;
  function layoutInicial() {
    const L = [
      {tipo:'lago', ox:-7, oz:3}, {tipo:'lote', ox:-1, oz:-1, li:0},
      {tipo:'celeiro', ox:-6, oz:-6}, {tipo:'armazem', ox:-2, oz:-6}, {tipo:'loja', ox:3, oz:-6}, {tipo:'poco', ox:3, oz:2},
    ];
    return L.map((o, i) => Object.assign({id:'o' + (i + 1), rot:0}, o));
  }
  function novo() {
    return { moedas:40, xp:0, nivel:1, plots:Array.from({length:4}, () => ({c:null})), tut:0,
      stats:{colheu:{}, plantou:{}, coletou:{}, vendeu:0, compras:0, fez:{}, alimentou:0}, missoes:{idx:0, ativas:[], geradas:0}, az:0,
      ani:{}, ins:{}, moinhos:{}, fab:{}, nomes:{}, perfil:null, tutB:-2, presente:{}, cap:{armazem:0, celeiro:0},
      objetos:layoutInicial(), zonas:ZONAS.filter(z => z.inicial).map(z => z.key),
      sementes:{trigo:6}, celeiro:{}, upg:{}, amigos:{}, animais:{}, prod:{}, aniUpg:{}, seguir:false, ferramenta:'mao', semSel:'trigo',
      precos:Object.fromEntries(ITENS.map(c => [c.id, 1])), tend:{}, evento:null,
      ganho:0, colhidos:0, viuAjuda:false, leve:MOBILE && (window.devicePixelRatio || 1) > 2.5 };
  }
  function carregar() {
    try {
      const r = VISITA ? JSON.stringify(Object.assign({}, VISITA.dados, {tut:-1, tutB:-1, viuAjuda:true, perfil:VISITA.dados.perfil && VISITA.dados.perfil.avatar ? VISITA.dados.perfil : {nome:VISITA.nome, avatar:{}}})) : localStorage.getItem(KEY) || localStorage.getItem('sitio-dourado-3d-v1');
      if (r) {
        S = Object.assign(novo(), JSON.parse(r));
        ITENS.forEach(c => { if (S.precos[c.id] == null) S.precos[c.id] = 1; });
        if (S.amigos.vaca) { S.animais.vaca = Math.max(1, S.animais.vaca || 0); delete S.amigos.vaca; }
        if (S.ferramenta && S.ferramenta !== 'mao' && S.ferramenta !== 'regador' && !crop(S.ferramenta)) S.ferramenta = 'mao'; if (crop(S.ferramenta)) S.semSel = S.ferramenta; if (!S.semSel) S.semSel = 'trigo';
        if (S.upg.cesta || S.upg.regadorG) { S.upg.maos = Math.max(S.upg.maos || 0, S.upg.cesta || 0); if (S.upg.regadorG) S.moedas += 350; delete S.upg.cesta; delete S.upg.regadorG; }
        // saves antigos: plantação fixa → lotes de 4 canteiros
        const lotes = S.objetos.filter(o => o.tipo === 'lote').length;
        const precisa = Math.max(1, Math.ceil(S.plots.length / 4));
        if (S.tut == null || (S.tut === 0 && S.colhidos > 0)) S.tut = S.colhidos > 0 ? -1 : 0;
        S.stats = Object.assign({colheu:{}, plantou:{}, coletou:{}, vendeu:0, compras:0, fez:{}, alimentou:0}, S.stats);
        S.cap = Object.assign({armazem:0, celeiro:0}, S.cap); S.fab = S.fab || {};
        if (!S.objetos.some(o => o.tipo === 'armazem')) { const ce = S.objetos.find(o => o.tipo === 'celeiro'), pos = acharEspaco('armazem', ce ? ce.ox + 4 : -2, ce ? ce.oz : -6); if (pos) S.objetos.push({id:'oArm', tipo:'armazem', rot:0, ...pos}); }
        if (S.perfil && !S.perfil.avatar) S.perfil.avatar = S.perfil.genero === 'f' ? {cabelo:'trancas', corCabelo:3, pele:1, olhos:0, camisa:1, macacao:1, chapeu:'flor', bochecha:true, sardas:true, cilios:true} : avPadrao();
        if (S.prod) { for (const k in S.prod) { const a = ANIMAIS[k]; if (a && S.prod[k].acum) S.celeiro[a.prod] = (S.celeiro[a.prod] || 0) + S.prod[k].acum; } delete S.prod; }
        for (const k in ANIMAIS) if (qtdAnimal(k) && !S.ani[k]) { S.ani[k] = []; S.celeiro[ANIMAIS[k].racao] = (S.celeiro[ANIMAIS[k].racao] || 0) + qtdAnimal(k); } // save antigo: 1 ração de presente por animal
        for (let li = lotes; li < precisa; li++) { const pos = acharEspaco('lote'); if (pos) S.objetos.push({id:'o' + Date.now() + li, tipo:'lote', li, rot:0, ...pos}); }
        const nl = S.objetos.filter(o => o.tipo === 'lote').length;
        while (S.plots.length < nl * 4) S.plots.push({c:null});
        S.plots = S.plots.slice(0, nl * 4);
      }
    } catch (e) { console.warn(e); S = null; }
    if (!S) S = novo();
    salvoAntes = S.salvoEm || 0; { const t = S.salvoEm; S.salvoEm = 0; ultimoJson = JSON.stringify(S); S.salvoEm = t; }
    S.objetos.forEach(o => { const n = parseInt(String(o.id).replace(/\D/g, ''), 10) || 0; if (n >= proxId && n < 1e9) proxId = n + 1; });
  }
  let salvoAntes = 0; // horário do último save deste aparelho antes de abrir o jogo (para comparar com a nuvem)
  let ultimoJson = '';
  function salvar() {
    if (ON.recarregando || VISITA) return;
    try { const t = S.salvoEm; S.salvoEm = 0; const j = JSON.stringify(S); S.salvoEm = t;
      if (j === ultimoJson) return; // nada mudou: não grava de novo
      ultimoJson = j; S.salvoEm = Date.now(); ON.sujo = true; // só conta como mudança se algo mudou de verdade
      localStorage.setItem(KEY, j.replace('"salvoEm":0', '"salvoEm":' + S.salvoEm)); } catch (e) {}
  }
  const novoId = () => 'o' + (proxId++);

  const xpProx = n => Math.round(30 * Math.pow(n, 1.6));
  const velocidade = () => Math.pow(.9, S.upg.fertil || 0) * (S.amigos.raposa ? 0.75 : 1); // cada nível de fertilizante: 10% mais rápido
  const eventoAtivo = () => S.evento && S.evento.ate > Date.now() ? S.evento : null;
  function precoAtual(id) { let m = S.precos[id] || 1; const ev = eventoAtivo(); if (ev && ev.id === id) m *= 2; return Math.max(1, Math.round(item(id).preco * m)); }
  const custoUpg = k => Math.round(UPG[k].base * Math.pow(UPG[k].mult, S.upg[k] || 0));
  const nTipo = t => S.objetos.filter(o => o.tipo === t).length;
  const custoLote = () => Math.round(150 * Math.pow(1.45, nTipo('lote') - 1));
  const CONSTRUCOES = [
    {tipo:'lote',       icone:'🟫', desc:'4 canteiros para plantar.'},
    {tipo:'galinheiro', icone:'🐔', nivel:2, base:300,  desc:'Casa das galinhas: cabem 6.'},
    {tipo:'poco',       icone:'🪣', nivel:2, base:150,  desc:'Decoração da fazenda.'},
    {tipo:'curral',     icone:'🐄', nivel:3, base:1200, desc:'Lugar das vacas: cabem 3.'},
    {tipo:'moinho',     icone:'🌾', nivel:2, base:400,  desc:'Fábrica de ração: transforma trigo, milho e cenoura em comida para os animais.'},
    {tipo:'pasto',      icone:'🐑', nivel:5, base:2500, desc:'Pasto das ovelhas: cabem 4.'},
    {tipo:'coelheira',  icone:'🐰', nivel:8, base:3500, desc:'Casa dos coelhos: cabem 5. Eles dão pelo de angorá.'},
    {tipo:'casinhaPet', icone:'🏡', nivel:3, base:900, desc:'Casinha dos bichinhos: eles brincam e dormem perto dela.', unico:true},
    {tipo:'macieira', mult:1.35,   icone:'🍎', nivel:8,  base:1800, desc:'Árvore de maçã: dá 4 maçãs a cada 30 min, para sempre.'},
    {tipo:'lagoinha',   icone:'🦆', nivel:10, base:4500, desc:'Lagoinha dos patos: cabem 5. Eles dão penas.'},
    {tipo:'engenho',    icone:'🏭', nivel:11, base:7500, desc:'Faz açúcar, óleo de girassol e melado.', unico:true},
    {tipo:'chiqueiro',  icone:'🐷', nivel:12, base:6500, desc:'Casa dos porcos: cabem 3. Eles acham trufas!'},
    {tipo:'laranjeira', mult:1.35, icone:'🍊', nivel:12, base:3200, desc:'Árvore de laranja: dá 4 laranjas a cada 45 min.'},
    {tipo:'docaria',    icone:'🧁', nivel:13, base:9500, desc:'Faz cupcake, pudim, bala de mel e geleia.', unico:true},
    {tipo:'apiario',    icone:'🐝', nivel:14, base:7000, desc:'Colmeias: cabem 6 abelhas. Elas fazem mel.'},
    {tipo:'sorveteria', icone:'🍨', nivel:16, base:12000, desc:'Faz sorvetes, picolé e café gelado.', unico:true},
    {tipo:'cerejeira', mult:1.35,  icone:'🍒', nivel:17, base:5200, desc:'Árvore de cereja: dá 4 cerejas a cada 1 hora.'},
    {tipo:'padaria',    icone:'🥖', nivel:4, base:1500, desc:'Faz pão, pão de milho, bolo e sanduíche.', unico:true},
    {tipo:'laticinio',  icone:'🧀', nivel:5, base:2800, desc:'Transforma leite em manteiga, queijo e iogurte.', unico:true},
    {tipo:'tecelagem',  icone:'🧵', nivel:6, base:4000, desc:'Transforma lã e pelo de angorá em roupas.', unico:true},
    {tipo:'cozinha',    icone:'🍳', nivel:7, base:6000, desc:'Faz omelete, salada, torta de abóbora e geleia.', unico:true},
  ];
  const consDe = t => CONSTRUCOES.find(c => c.tipo === t);
  const decDe = t => DECOR.find(c => c.tipo === t);
  // quantas de cada construção dá para ter, conforme o nível
  const LIMITES = {galinheiro:[2, 5, 8, 12], curral:[3, 6, 10, 14], pasto:[5, 9, 13, 17], coelheira:[8, 12, 16, 20], lagoinha:[10, 15, 20, 26], chiqueiro:[12, 17, 23, 30], apiario:[14, 19, 25, 32], macieira:[8, 9, 11, 13, 16, 20, 25], laranjeira:[12, 13, 15, 18, 22, 27], cerejeira:[17, 18, 21, 25, 30, 36], moinho:[2, 7, 12, 17]};
  const nivelDaN = (t, k) => { const L = LIMITES[t]; return k < L.length ? L[k] : L[L.length - 1] + 4 * (k - L.length + 1); }; // nível do k-ésimo (0 = primeiro)
  const maxPermitido = t => { if (!LIMITES[t]) return Infinity; let k = 0; while (nivelDaN(t, k) <= S.nivel) k++; return k; };
  const nivelConstrucao = t => t === 'lote' ? 1 + Math.ceil(nTipo('lote') * .67) : decDe(t) ? decDe(t).nivel : LIMITES[t] ? nivelDaN(t, nTipo(t)) : consDe(t).nivel;
  const ehUnico = t => { const c = consDe(t); return !!(c && c.unico); };
  const custoConstrucao = t => t === 'lote' ? custoLote() : decDe(t) ? decDe(t).preco : Math.round(consDe(t).base * Math.pow(consDe(t).mult || 1.8, nTipo(t)));
  // bichinho (praga): enquanto está na planta, ela cresce na metade da velocidade
  const decorrido = p => { const ag = Date.now(); let d = ag - p.t0; if (p.pragaEm && ag > p.pragaEm) d -= (Math.min(ag, p.pragaFim || ag) - p.pragaEm) / 2; return d; };
  const restante = p => Math.max(0, p.dur - decorrido(p));
  const progresso = p => (!p.c || !p.reg) ? 0 : Math.min(1, decorrido(p) / p.dur);
  const temPraga = p => !!(p && p.c && p.reg && p.pragaEm && !p.pragaFim && Date.now() >= p.pragaEm && decorrido(p) < p.dur);
  const crescendo_ = p => !!(p && p.c && p.reg && decorrido(p) < p.dur);
  const INSUMOS = {
    antipraga:{nome:'Spray antipraga', emoji:'🧴', preco:60, nivel:4, desc:'Tira o bichinho e protege a planta até a colheita.'},
    rapido:   {nome:'Adubo rápido',    emoji:'⚡', preco:120, nivel:5, desc:'A planta fica pronta na metade do tempo que falta.'},
    super:    {nome:'Super adubo',     emoji:'🌟', preco:220, nivel:8, desc:'Dobra a colheita do canteiro.'},
  };
  const qtdIns = k => (S.ins || {})[k] || 0;
  function insumoServe(k, p) {
    if (!p || !p.c) return false;
    if (k === 'antipraga') return !p.prot && (!p.reg || crescendo_(p));
    if (k === 'rapido') return crescendo_(p) && !p.rap;
    if (k === 'super') return !p.dobro && (!p.reg || crescendo_(p));
    return false;
  }
  function usarInsumo(k, i) {
    const p = S.plots[i]; if (!insumoServe(k, p) || qtdIns(k) < 1) return false;
    S.ins[k]--;
    if (k === 'antipraga') { p.prot = true; if (temPraga(p)) p.pragaFim = Date.now(); else if (p.pragaEm && !p.pragaFim) p.pragaEm = null; }
    if (k === 'rapido') { p.rap = true; p.t0 -= restante(p) / 2; }
    if (k === 'super') p.dobro = true;
    atualizarTile(i); chuva(i, k === 'antipraga' ? 0xb8f0ff : 0xfff07a, .06); flutuar(posTile(i).add(V3(0, 1.3, 0)), INSUMOS[k].emoji);
    return true;
  }
  function tirarPraga(i, deAmigo) {
    const p = S.plots[i]; if (!temPraga(p)) return false;
    p.pragaFim = Date.now(); atualizarTile(i);
    if (!deAmigo) { flutuar(posTile(i).add(V3(0, 1.3, 0)), '🐛 ✔'); ganharXp(1); }
    return true;
  }
  const pronto = p => p.c && p.reg && progresso(p) >= 1;
  const qtdAnimal = k => S.animais[k] || 0;
  const maxAnimal = k => ANIMAIS[k].porCercado * nTipo(ANIMAIS[k].cercado);
  const custoAnimal = k => Math.round(ANIMAIS[k].custo * Math.pow(ANIMAIS[k].mult, qtdAnimal(k)));
  const aniLista = k => { const L = S.ani[k] || (S.ani[k] = []); while (L.length < qtdAnimal(k)) L.push({rest:0, t:0, prontos:0}); return L; };
  const nomePet = k => (S.nomes && S.nomes[k]) || PETS[k].nome;
  // espaço: Celeiro guarda sementes, Armazém guarda itens (colheitas, produtos e rações)
  const capArmazem = () => 100 + 30 * S.cap.armazem, capCeleiro = () => 100 + 30 * S.cap.celeiro;
  const matsAmpliar = k => 1 + Math.floor(S.cap[k] / 2); // quantos de cada material para ampliar
  const matsExpansao = () => 3 + 3 * ANEL;
  const usoArmazem = () => Object.values(S.celeiro).reduce((a, b) => a + (b || 0), 0);
  const usoCeleiro = () => Object.values(S.sementes).reduce((a, b) => a + (b || 0), 0);
  const livreArmazem = () => Math.max(0, capArmazem() - usoArmazem());
  const custoAmpliar = k => Math.round(150 * Math.pow(1.35, S.cap[k]) / 10) * 10;
  let avisoCheio = 0;
  function avisarCheio() { if (Date.now() - avisoCheio > 2500) { avisoCheio = Date.now(); toast('📦 Armazém cheio! Venda itens ou amplie o armazém'); } }
  const vagasFab = t => nTipo(t) ? 2 + (S.upg.moinhoVaga || 0) : 0; // cada fábrica (e cada moinho) tem a sua fila
  const listaMoinhos = () => S.objetos.filter(o => o.tipo === 'moinho');
  let fabSel = null; // moinho aberto na janela
  function fabEstado(t, oid) {
    if (t !== 'moinho') return S.fab[t] || (S.fab[t] = {fila:[], prontos:{}});
    const ms = listaMoinhos(); if (!S.moinhos) S.moinhos = {};
    if (S.moinho && ms[0]) { S.moinhos[ms[0].id] = S.moinho; delete S.moinho; } // save antigo: fila única vai para o 1º moinho
    if (!oid) oid = fabSel && ms.some(o => o.id === fabSel) ? fabSel : ms[0] && ms[0].id;
    if (!oid) return {fila:[], prontos:{}};
    return S.moinhos[oid] || (S.moinhos[oid] = {fila:[], prontos:{}});
  }
  const fabEstadoId = () => { const ms = listaMoinhos(); return fabSel && ms.some(o => o.id === fabSel) ? fabSel : ms[0] && ms[0].id; };
  const numMoinho = oid => listaMoinhos().findIndex(o => o.id === oid) + 1;
  const zonasCompradas = () => S.zonas.length - ZONAS.filter(z => z.inicial).length;
  const custoZona = () => { const n = zonasCompradas(); return Math.round(450 * Math.pow(1.6, Math.min(n, 10)) * (1 + .25 * Math.max(0, n - 10)) / 10) * 10; };
  const custoExpansao = () => [12000, 40000, 100000, 220000, 450000, 900000][ANEL] || 0;
  const nivelExpansao = () => [16, 26, 40, 60, 85, 115][ANEL] || 999;
  const ilhaCheia = () => ZONAS.every(z => S.zonas.includes(z.key));
  const nivelZona = () => 3 + zonasCompradas();

  // ocupação da grade
  function ocupacao(exceto) {
    const m = new Set();
    S.objetos.forEach(o => { if (o !== exceto) celulas(o).forEach(([x, z]) => m.add(x + ',' + z)); });
    return m;
  }
  function posicaoValida(o, ocup) {
    ocup = ocup || ocupacao(o);
    return celulas(o).every(([x, z]) => celulaUtil(x, z) && zonaLiberada(x, z) && !ocup.has(x + ',' + z));
  }
  function acharEspaco(tipo, px = 0, pz = 0) { // procura o lugar livre mais perto de (px, pz)
    const teste = {tipo, ox:0, oz:0, rot:0}, ocup = ocupacao(null);
    for (let r = 0; r <= OFF; r++) for (let dx = -r; dx <= r; dx++) for (let dz = -r; dz <= r; dz++) {
      if (Math.max(Math.abs(dx), Math.abs(dz)) !== r) continue;
      teste.ox = px + dx; teste.oz = pz + dz;
      if (posicaoValida(teste, ocup)) return {ox:teste.ox, oz:teste.oz};
    }
    return null;
  }

  // ================= CENA 3D =================
  const canvas = $('#cena');
  const renderer = new THREE.WebGLRenderer({canvas, antialias:true, powerPreference:'high-performance'});
  renderer.shadowMap.enabled = true; renderer.shadowMap.type = MOBILE ? THREE.PCFShadowMap : THREE.PCFSoftShadowMap;
  // cores corretas + "filme" (tone mapping) para um visual mais bonito
  renderer.outputEncoding = THREE.sRGBEncoding;
  renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.0;
  const C = h => new THREE.Color(h).convertSRGBToLinear();
  const scene = new THREE.Scene();
  scene.background = C(0xbfe6ff);
  scene.fog = new THREE.Fog(C(0xcdeeff), 70, 150);
  if (THREE.RoomEnvironment) { const pm = new THREE.PMREMGenerator(renderer); scene.environment = pm.fromScene(new THREE.RoomEnvironment(), .04).texture; }
  const camera = new THREE.PerspectiveCamera(42, 1, .1, 170);
  camera.position.set(12, 16, 16.5);
  const controls = new THREE.OrbitControls(camera, canvas);
  controls.target.set(0, 0, 0);
  controls.enableDamping = true; controls.dampingFactor = .1;
  controls.enablePan = true; controls.screenSpacePanning = false; controls.panSpeed = 1.1;
  controls.minDistance = 9; controls.maxDistance = 52;
  controls.minPolarAngle = .4; controls.maxPolarAngle = 1.2;
  controls.rotateSpeed = .55; controls.zoomSpeed = .9;
  // câmera em ângulo fixo: 1 dedo arrasta, pinça dá zoom; girar só de 90° em 90° pelo botão
  controls.enableRotate = false;
  controls.mouseButtons = {LEFT:THREE.MOUSE.PAN, MIDDLE:THREE.MOUSE.DOLLY, RIGHT:THREE.MOUSE.PAN};
  controls.touches = {ONE:THREE.TOUCH.PAN, TWO:THREE.TOUCH.DOLLY_PAN};
  let azAlvo = Math.PI / 4, azAtual = Math.PI / 4;
  function ajustarCamera(dt) {
    azAtual += (azAlvo - azAtual) * Math.min(1, dt * 7);
    const tg = controls.target, d = camera.position.distanceTo(tg);
    const f = Math.min(1, Math.max(0, (d - controls.minDistance) / (controls.maxDistance - controls.minDistance)));
    const polar = .72 - f * .2; // perto ~41°, longe ~30° (mais de cima, menos horizonte)
    camera.position.set(tg.x + d * Math.sin(polar) * Math.sin(azAtual), tg.y + d * Math.cos(polar), tg.z + d * Math.sin(polar) * Math.cos(azAtual));
    camera.lookAt(tg);
  }

  scene.add(new THREE.HemisphereLight(C(0xd8efff), C(0x3f7a25), .55));
  const sol = new THREE.DirectionalLight(C(0xffd9a0), 2.35);
  sol.position.set(24, 22, 9); sol.castShadow = true;
  sol.shadow.mapSize.set(MOBILE ? 1024 : 2048, MOBILE ? 1024 : 2048);
  { const L = Math.min(52, MEIA + 4); Object.assign(sol.shadow.camera, {left:-L, right:L, top:L, bottom:-L, near:1, far:90 + 2 * L}); }
  sol.shadow.bias = -0.0005; sol.shadow.normalBias = .02;
  scene.add(sol);
  renderer.shadowMap.autoUpdate = false; // a sombra é recalculada a cada 3 quadros (a ilha quase não se mexe)
  const gov = {soma:0, n:0, bons:0, pr:0, max:1};
  function aplicarQualidade() {
    gov.max = gov.pr = Math.min(window.devicePixelRatio || 1, S.leve ? 1 : (MOBILE ? 1.5 : 2));
    renderer.setPixelRatio(gov.pr);
    sol.castShadow = !S.leve;
  }

  const mats = {}, matsLiso = {};
  const mat = c => mats[c] || (mats[c] = new THREE.MeshStandardMaterial({color:C(c), flatShading:true, roughness:.95, metalness:0, envMapIntensity:.2}));
  const liso = c => matsLiso[c] || (matsLiso[c] = new THREE.MeshStandardMaterial({color:C(c), roughness:.6, metalness:0, envMapIntensity:.25}));
  // ===== otimização: junta as peças paradas de um modelo em poucas malhas (uma por material) =====
  // Menos objetos = muito menos trabalho para o celular desenhar a cada quadro.
  function mesclar(raiz, pular) {
    raiz.updateMatrixWorld(true);
    const inv = new THREE.Matrix4().copy(raiz.matrixWorld).invert(), grupos = new Map(), remover = [];
    const ignorado = o => { for (let p = o; p && p !== raiz; p = p.parent) if (pular && pular.has(p)) return true; return false; };
    raiz.traverse(o => {
      if (!o.isMesh || o.isInstancedMesh || o.isSkinnedMesh || Array.isArray(o.material) || o.material.transparent || !o.visible || ignorado(o)) return;
      const g = o.geometry; if (!g || !g.attributes.position || g.morphAttributes && Object.keys(g.morphAttributes).length) return;
      const k = o.material.uuid + '|' + o.castShadow + '|' + o.receiveShadow;
      if (!grupos.has(k)) grupos.set(k, {mat:o.material, cast:o.castShadow, rec:o.receiveShadow, itens:[]});
      grupos.get(k).itens.push(o); remover.push(o);
    });
    let juntou = 0;
    grupos.forEach(gr => {
      if (gr.itens.length < 2) { remover.splice(remover.indexOf(gr.itens[0]), 1); return; }
      const usaUv = !!gr.mat.map, usaCor = !!gr.mat.vertexColors, pos = [], nor = [], uv = [], cor = [], m = new THREE.Matrix4(), nm = new THREE.Matrix3();
      gr.itens.forEach(o => {
        const g = o.geometry.index ? o.geometry.toNonIndexed() : o.geometry;
        m.multiplyMatrices(inv, o.matrixWorld); nm.getNormalMatrix(m);
        const P = g.attributes.position, N = g.attributes.normal, U = g.attributes.uv, Cc = g.attributes.color, v = new THREE.Vector3();
        for (let i = 0; i < P.count; i++) {
          v.fromBufferAttribute(P, i).applyMatrix4(m); pos.push(v.x, v.y, v.z);
          if (N) { v.fromBufferAttribute(N, i).applyMatrix3(nm).normalize(); nor.push(v.x, v.y, v.z); } else nor.push(0, 1, 0);
          if (usaUv) U ? uv.push(U.getX(i), U.getY(i)) : uv.push(0, 0);
          if (usaCor) Cc ? cor.push(Cc.getX(i), Cc.getY(i), Cc.getZ(i)) : cor.push(1, 1, 1);
        }
      });
      const geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); geo.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
      if (usaUv) geo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); if (usaCor) geo.setAttribute('color', new THREE.Float32BufferAttribute(cor, 3));
      geo.computeBoundingSphere();
      const mm = new THREE.Mesh(geo, gr.mat); mm.castShadow = gr.cast; mm.receiveShadow = gr.rec; mm.userData.mesclado = true; raiz.add(mm); juntou++;
    });
    remover.forEach(o => o.parent && o.parent.remove(o));
    return juntou;
  }
  function mesh(geo, cor, x = 0, y = 0, z = 0, sombra = true, m) {
    const o = new THREE.Mesh(geo, m || mat(cor)); o.position.set(x, y, z);
    o.castShadow = sombra; o.receiveShadow = true; return o;
  }
  const bola = (r, cor, x, y, z, seg = 14) => mesh(new THREE.SphereGeometry(r, seg, Math.max(6, seg * .7 | 0)), cor, x, y, z, true, liso(cor));
  const blob = (r, cor, x, y, z, det = 1) => mesh(new THREE.IcosahedronGeometry(r, det), cor, x, y, z, true, liso(cor));
  const cil = (rt, rb, h, cor, x, y, z, seg = 12, m) => mesh(new THREE.CylinderGeometry(rt, rb, h, seg), cor, x, y, z, true, m || liso(cor));

  const texCache = {};
  const ANISO = Math.min(8, renderer.capabilities.getMaxAnisotropy ? renderer.capabilities.getMaxAnisotropy() : 4);
  function emojiTex(e, n) {
    const key = e + '|' + (n || '');
    if (texCache[key]) return texCache[key];
    const c = document.createElement('canvas'); c.width = c.height = 256;
    const g = c.getContext('2d'); g.scale(2, 2); g.font = '92px serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
    if (n) {
      g.fillStyle = '#fff8ea'; g.strokeStyle = '#7a4a26'; g.lineWidth = 7;
      g.beginPath(); g.arc(64, 60, 52, 0, Math.PI * 2); g.fill(); g.stroke();
      g.font = '62px serif'; g.fillText(e, 64, 64);
      g.fillStyle = '#e0503a'; g.beginPath(); g.arc(100, 24, 22, 0, Math.PI * 2); g.fill();
      g.fillStyle = '#fff'; g.font = 'bold 28px sans-serif'; g.fillText(n > 99 ? '99' : n, 100, 26);
    } else g.fillText(e, 64, 72);
    const tx = new THREE.CanvasTexture(c); tx.encoding = THREE.sRGBEncoding; tx.anisotropy = ANISO; return texCache[key] = tx;
  }
  function sprite(e, s = 1) {
    const sp = new THREE.Sprite(new THREE.SpriteMaterial({map:emojiTex(e), depthTest:false, transparent:true}));
    sp.scale.set(s, s, s); sp.renderOrder = 10; return sp;
  }
  function rotulo(texto, cor = '#8f5530') {
    const c = document.createElement('canvas'); c.width = 1024; c.height = 256;
    const g = c.getContext('2d'); g.scale(2, 2);
    g.font = '800 60px "Baloo 2", sans-serif';
    const w = Math.min(500, g.measureText(texto).width + 70), x = (512 - w) / 2;
    g.fillStyle = cor; g.strokeStyle = '#5a3519'; g.lineWidth = 8;
    g.beginPath(); g.roundRect ? g.roundRect(x, 16, w, 92, 24) : g.rect(x, 16, w, 92); g.fill(); g.stroke();
    g.fillStyle = 'rgba(255,255,255,.18)'; g.fillRect(x + 10, 24, w - 20, 10);
    g.textAlign = 'center'; g.textBaseline = 'middle'; g.lineWidth = 10; g.strokeStyle = '#4a2c14';
    g.strokeText(texto, 256, 66); g.fillStyle = '#fff'; g.fillText(texto, 256, 66);
    const tx = new THREE.CanvasTexture(c); tx.encoding = THREE.sRGBEncoding; tx.anisotropy = ANISO;
    const sp = new THREE.Sprite(new THREE.SpriteMaterial({map:tx, depthTest:false, transparent:true, sizeAttenuation:false}));
    sp.scale.set(.15, .0375, 1); sp.renderOrder = 11; return sp;
  }

  // sombra suave embaixo das coisas (dá sensação de volume)
  const texSombra = (() => { const c = document.createElement('canvas'); c.width = c.height = 64; const g = c.getContext('2d');
    const gr = g.createRadialGradient(32, 32, 2, 32, 32, 32); gr.addColorStop(0, 'rgba(20,40,10,.55)'); gr.addColorStop(1, 'rgba(20,40,10,0)'); g.fillStyle = gr; g.fillRect(0, 0, 64, 64);
    return new THREE.CanvasTexture(c); })();
  const matSombra = new THREE.MeshBasicMaterial({map:texSombra, transparent:true, depthWrite:false});
  const geoSombra = new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2);
  function sombraBlob(r, op = 1) { const m = new THREE.Mesh(geoSombra, op === 1 ? matSombra : new THREE.MeshBasicMaterial({map:texSombra, transparent:true, depthWrite:false, opacity:op})); m.scale.set(r * 2, 1, r * 2); m.position.y = .03; m.renderOrder = 1; return m; }

  // ================= MODELOS (cenário) =================
  function telhado(w, h, d, cor) {
    const sh = new THREE.Shape(); sh.moveTo(-w / 2, 0); sh.lineTo(w / 2, 0); sh.lineTo(0, h); sh.closePath();
    const g = new THREE.ExtrudeGeometry(sh, {depth:d, bevelEnabled:false}); g.translate(0, 0, -d / 2);
    return mesh(g, cor);
  }
  function telhadoCeleiro(w, h, d, cor) { // telhado "quebrado" (duas inclinações)
    const sh = new THREE.Shape();
    sh.moveTo(-w / 2, 0); sh.lineTo(-w * .4, h * .58); sh.lineTo(0, h); sh.lineTo(w * .4, h * .58); sh.lineTo(w / 2, 0); sh.closePath();
    const g = new THREE.ExtrudeGeometry(sh, {depth:d, bevelEnabled:true, bevelThickness:.06, bevelSize:.06, bevelSegments:1}); g.translate(0, 0, -d / 2);
    return mesh(g, cor);
  }
  const congelar = g => g.traverse(o => { if (!o.userData.anim && !o.isSprite) { o.updateMatrix(); o.matrixAutoUpdate = false; } }); // nunca se mexe: não recalcula a posição a cada quadro
  const semSombra = g => g.traverse(o => { if (o.isMesh) { o.castShadow = false; o.receiveShadow = false; } }); // decoração: só a sombrinha redonda
  const VERDES = [0x4fae3c, 0x5fbb45, 0x45a035, 0x6cc650, 0x55b240];
  function arvore(s = 1, fruta) {
    const g = new THREE.Group(), cor = VERDES[Math.random() * VERDES.length | 0];
    g.add(cil(.14 * s, .26 * s, 1.5 * s, 0x8a5a33, 0, .75 * s, 0, 8));
    const galho = cil(.06 * s, .09 * s, .7 * s, 0x8a5a33, .2 * s, 1.3 * s, 0, 6); galho.rotation.z = -.7; g.add(galho);
    const claro = new THREE.Color(cor).offsetHSL(0, .03, .05).getHex();
    [[0, 2.05, 0, 1], [.6, 1.85, .25, .72], [-.55, 1.9, -.2, .75], [.1, 2.65, -.1, .72], [-.15, 1.75, .6, .62], [.35, 2.4, .45, .55], [-.4, 2.45, .3, .5]].forEach(([x, y, z, r], i) =>
      g.add(mesh(new THREE.IcosahedronGeometry(r * s, 1), 0, x * s, y * s, z * s, false, liso(i >= 3 ? claro : cor))));
    g.add(sombraBlob(1.5 * s));
    if (fruta) for (let i = 0; i < 7; i++) { const a = rnd(0, 6.28), b = rnd(-.2, .9); g.add(bola(.09 * s, fruta, Math.cos(a) * 1.0 * s, (2.0 + b * .5) * s, Math.sin(a) * 1.0 * s, 8)); }
    g.rotation.y = rnd(0, 6); semSombra(g); return g;
  }
  function pinheiro(s = 1) {
    const g = new THREE.Group(), cor = [0x3f9a4a, 0x358a42, 0x4aa654][Math.random() * 3 | 0];
    g.add(cil(.13 * s, .2 * s, 1 * s, 0x7a4b25, 0, .5 * s, 0, 8));
    for (let i = 0; i < 4; i++) g.add(mesh(new THREE.ConeGeometry((1.15 - i * .24) * s, 1.15 * s, 9), 0, 0, (1.05 + i * .62) * s, 0, false, liso(i % 2 ? new THREE.Color(cor).offsetHSL(0, 0, .05).getHex() : cor)));
    g.add(sombraBlob(1.3 * s));
    semSombra(g); return g;
  }
  function arbusto(s = 1) {
    const g = new THREE.Group(), cor = VERDES[Math.random() * VERDES.length | 0];
    [[0, 0, .55], [.48, -.1, .4], [-.42, .05, .42], [.1, .3, .35]].forEach(([dx, dz, r]) => g.add(mesh(new THREE.IcosahedronGeometry(r * s, 1), 0, dx * s, r * s * .75, dz * s, false, liso(cor))));
    g.add(sombraBlob(.9 * s));
    if (Math.random() < .4) for (let i = 0; i < 4; i++) g.add(bola(.07 * s, [0xff7aa8, 0xffffff, 0xffd84a][i % 3], rnd(-.5, .5) * s, rnd(.4, .8) * s, rnd(-.4, .4) * s, 6));
    semSombra(g); return g;
  }
  const pedra = (s = 1) => { const m = mesh(new THREE.DodecahedronGeometry(.5 * s, 0), 0xb4b8bb, 0, .2 * s, 0); m.scale.y = .7; m.rotation.y = rnd(0, 6); return m; };
  function tora(s = 1) {
    const g = new THREE.Group();
    const t = cil(.28 * s, .28 * s, 1.6 * s, 0x8a5a33, 0, .28 * s, 0, 10); t.rotation.z = Math.PI / 2; g.add(t);
    [-1, 1].forEach(l => { const a = cil(.24 * s, .24 * s, .02, 0xe2c08c, l * .81 * s, .28 * s, 0, 10); a.rotation.z = Math.PI / 2; g.add(a); });
    g.rotation.y = rnd(0, 6); return g;
  }
  function cerca(w, d, portao = true, cor = 0xb07a46) { // cerca de postes arredondados (portão na frente)
    const g = new THREE.Group(), x0 = -w / 2, x1 = w / 2, z0 = -d / 2, z1 = d / 2;
    const poste = (x, z) => { g.add(cil(.08, .1, .85, cor, x, .42, z, 8)); g.add(bola(.1, cor, x, .87, z, 8)); };
    const trilho = (xa, za, xb, zb) => {
      const len = Math.hypot(xb - xa, zb - za); if (len < .05) return;
      [.35, .68].forEach(y => { const r = cil(.045, .045, len, 0xc99560, (xa + xb) / 2, y, (za + zb) / 2, 6); r.rotation.z = Math.PI / 2; r.rotation.y = -Math.atan2(zb - za, xb - xa); g.add(r); });
    };
    const lado = (xa, za, xb, zb, abre) => {
      const len = Math.hypot(xb - xa, zb - za), n = Math.max(1, Math.round(len / 1.5));
      const pts = []; for (let i = 0; i <= n; i++) pts.push([xa + (xb - xa) * i / n, za + (zb - za) * i / n]);
      if (abre) {
        const esq = pts.filter(p => p[0] < -.7), dir = pts.filter(p => p[0] > .7);
        esq.forEach(p => poste(...p)); dir.forEach(p => poste(...p)); poste(-.7, za); poste(.7, za);
        trilho(xa, za, -.7, za); trilho(.7, za, xb, zb);
      } else { pts.forEach(p => poste(...p)); trilho(xa, za, xb, zb); }
    };
    lado(x0, z0, x1, z0); lado(x0, z1, x1, z1, portao); lado(x0, z0, x0, z1); lado(x1, z0, x1, z1);
    return g;
  }
  const chaoPlano = (w, d, cor, y = .03) => { const m = mesh(new THREE.BoxGeometry(w, .04, d), 0, 0, y, 0, false, liso(cor)); return m; };

  // ---------- construções ----------
  function modeloArmazem() {
    const g = new THREE.Group();
    g.add(chaoPlano(2.4, 1, 0xd8b98a).translateZ(1.75));
    g.add(mesh(new THREE.BoxGeometry(5.6, 2.6, 3.2), 0, 0, 1.3, -.2, true, liso(0x9a6238)));
    for (let i = 0; i < 9; i++) g.add(mesh(new THREE.BoxGeometry(.06, 2.6, .04), 0, -2.6 + i * .65, 1.3, 1.42, false, liso(0x7a4b25)));
    const t = telhado(6.2, 1.5, 3.7, 0x8a4b3a); t.position.set(0, 2.6, -.2); g.add(t);
    g.add(mesh(new THREE.BoxGeometry(2, 2, .1), 0, 0, 1, 1.43, true, liso(0x6b4226)));
    [-1, 1].forEach(sx => { const x = mesh(new THREE.BoxGeometry(.08, 2.2, .04), 0, sx * .5, 1, 1.5, false, liso(0xe8d2a8)); x.rotation.z = sx * .45; g.add(x); });
    // caixotes, barris e sacos na frente
    [[-2.2, 1.9], [-1.7, 2.1]].forEach(([x, z]) => g.add(mesh(new THREE.BoxGeometry(.6, .6, .6), 0, x, .3, z, true, liso(0xc48b52))));
    g.add(mesh(new THREE.BoxGeometry(.5, .5, .5), 0, -2, .85, 1.95, true, liso(0xb07a46)));
    [[2.1, 1.9], [2.5, 2.3]].forEach(([x, z]) => { g.add(cil(.32, .3, .75, 0x8b5a2b, x, .38, z, 14)); [.15, .6].forEach(y => { const a = mesh(new THREE.TorusGeometry(.32, .03, 6, 16), 0, x, y, z, false, liso(0x5a5a5a)); a.rotation.x = Math.PI / 2; g.add(a); }); });
    return g;
  }
  const fumacas = [];
  function chamine(g, x, y, z) {
    g.add(mesh(new THREE.BoxGeometry(.45, 1.1, .45), 0, x, y, z, true, liso(0x9a7d6a)));
    const f = new THREE.Group(); f.position.set(x, y + .6, z); g.add(f);
    for (let i = 0; i < 4; i++) { const b = mesh(new THREE.SphereGeometry(.22, 10, 8), 0, 0, 0, 0, false, new THREE.MeshStandardMaterial({color:C(0xf2f2f2), transparent:true, opacity:.7})); b.userData.f = i / 4; f.add(b); }
    fumacas.push(f);
  }
  function animarFumaca(f, dt, seg) {
    const ativa = !!f.userData.ativa;
    f.children.forEach(b => { b.userData.f = (b.userData.f + dt * .35) % 1; const k = b.userData.f;
      b.position.set(Math.sin(k * 6 + seg) * .15, k * 1.8, 0); b.scale.setScalar(.5 + k * 1.3); b.material.opacity = ativa ? (1 - k) * .7 : 0; });
  }
  function casinha(g, corParede, corTelhado, larg = 3.4, prof = 3) {
    g.add(mesh(new THREE.BoxGeometry(larg, 2.2, prof), 0, 0, 1.1, -.2, true, liso(corParede)));
    const t = telhado(larg + .5, 1.3, prof + .4, corTelhado); t.position.set(0, 2.2, -.2); g.add(t);
    g.add(mesh(new THREE.BoxGeometry(.8, 1.4, .08), 0, -.6, .7, prof / 2 - .16, true, liso(0x8b5a2b)));
    g.add(mesh(new THREE.BoxGeometry(.7, .55, .08), 0, .75, 1.35, prof / 2 - .16, true, liso(0xffe9a0)));
  }
  function meiaCilindro(r, len, cor) { // telhado arredondado
    const m = mesh(new THREE.CylinderGeometry(r, r, len, 20, 1, false, 0, Math.PI), 0, 0, 0, 0, true, liso(cor));
    m.rotation.z = Math.PI / 2; return m;
  }
  function toldo(g, x, y, z, larg, c1, c2, n = 6) { // toldo listrado com babadinho
    const w = larg / n;
    for (let i = 0; i < n; i++) {
      const f = mesh(new THREE.BoxGeometry(w, .06, .8), 0, x - larg / 2 + w / 2 + i * w, y, z, true, liso(i % 2 ? c2 : c1)); f.rotation.x = .38; g.add(f);
      g.add(mesh(new THREE.SphereGeometry(w / 2, 10, 6, 0, Math.PI), 0, x - larg / 2 + w / 2 + i * w, y - .18, z + .38, false, liso(i % 2 ? c2 : c1)));
    }
  }
  function modeloFabrica(t) {
    const g = new THREE.Group();
    g.add(chaoPlano(2, .9, 0xd8b98a).translateZ(1.85));
    const porta = (x, cor, z = 1.31) => { g.add(mesh(new THREE.BoxGeometry(.8, 1.4, .08), 0, x, .7, z, true, liso(cor))); g.add(bola(.05, 0xffd34d, x + .28, .7, z + .06, 8)); };
    const janela = (x, y, z = 1.31, w = .75, h = .6) => { g.add(mesh(new THREE.BoxGeometry(w + .14, h + .14, .06), 0, x, y, z, true, liso(0xffffff))); g.add(mesh(new THREE.BoxGeometry(w, h, .08), 0, x, y, z + .01, false, liso(0xffe9a0))); };
    if (t === 'padaria') {
      // padaria: casinha de tijolinho com telhado arredondado e um pão gigante em cima
      g.add(mesh(new THREE.BoxGeometry(3.4, 2.1, 3), 0, 0, 1.05, -.2, true, liso(0xf7e3c4)));
      g.add(mesh(new THREE.BoxGeometry(3.46, .55, 3.06), 0, 0, .28, -.2, true, liso(0xc0623a)));
      for (let i = 0; i < 6; i++) g.add(mesh(new THREE.BoxGeometry(.03, .5, .02), 0, -1.5 + i * .6, .28, 1.34, false, liso(0xe9a17a)));
      const tr = meiaCilindro(1.75, 3.5, 0x8a4b2a); tr.position.set(0, 2.1, -.2); g.add(tr);
      for (let i = 0; i < 5; i++) { const f = meiaCilindro(1.77, .12, 0xb5653a); f.position.set(-1.5 + i * .75, 2.1, -.2); g.add(f); }
      const pao = bola(.9, 0xe0a24c, 0, 3.95, -.2, 18); pao.scale.set(1.7, .62, .72); g.add(pao);
      [-.9, -.3, .3, .9].forEach(x => { const c = mesh(new THREE.BoxGeometry(.1, .05, .5), 0, x, 4.48, -.2, false, liso(0xffe2a8)); c.rotation.y = .5; g.add(c); });
      porta(-.75, 0x7a4320); janela(.75, 1.25);
      toldo(g, .75, 1.8, 1.55, 1.3, 0x8a4b2a, 0xfff1d6, 4);
      // vitrine com pãezinhos
      g.add(mesh(new THREE.BoxGeometry(1.25, .45, .45), 0, .75, .25, 1.6, true, liso(0xb77a45)));
      [[.42, 0xd99a4a], [.75, 0xc98a3a], [1.08, 0xe7b062]].forEach(([x, c]) => { const p = bola(.17, c, x, .58, 1.6, 10); p.scale.set(1.4, .7, .8); g.add(p); });
      // forno de barro com fogo
      g.add(cil(.6, .7, .8, 0xb8735a, 1.65, .4, -1.2, 14)); g.add(mesh(new THREE.SphereGeometry(.6, 14, 8, 0, Math.PI * 2, 0, Math.PI / 2), 0, 1.65, .8, -1.2, true, liso(0xb8735a)));
      chamine(g, -1.1, 3.2, -1);
    } else if (t === 'laticinio') {
      // laticínio: paredes de vaquinha (branco com manchas pretas) e uma garrafa de leite gigante
      g.add(mesh(new THREE.BoxGeometry(3, 2.2, 3), 0, -.35, 1.1, -.2, true, liso(0xffffff)));
      [[-1.3, 1.5, 1.31, .38], [-.1, .45, 1.31, .3], [.3, 1.75, 1.31, .26], [-1.86, 1.3, .3, .4], [-1.86, .6, -1.1, .3]].forEach(([x, y, z, r]) => {
        const lado = x < -1.8; [[0, 0, 1], [.55, .3, .6], [-.5, -.25, .55], [.3, -.45, .45]].forEach(([dx, dy, k]) => {
          const m = bola(r * k, 0x2a2524, lado ? x : x + dx * r, y + dy * r, lado ? z + dx * r : z, 10); m.scale.set(lado ? .12 : 1.15, .9, lado ? 1.15 : .12); g.add(m); }); });
      const tt = telhado(3.5, 1.2, 3.4, 0x3e7fc4); tt.position.set(-.35, 2.2, -.2); g.add(tt);
      porta(-.95, 0x3e7fc4); janela(.35, 1.2, 1.31, .55, .5);
      // garrafa de leite gigante
      const bx = 1.55, bz = -.3;
      g.add(cil(.62, .62, 2.3, 0xf7fbff, bx, 1.15, bz, 18)); g.add(bola(.62, 0xf7fbff, bx, 2.3, bz, 18));
      g.add(cil(.32, .45, .5, 0xf7fbff, bx, 2.85, bz, 16)); g.add(cil(.36, .36, .28, 0x3e7fc4, bx, 3.2, bz, 16));
      g.add(cil(.635, .635, .7, 0x5aa0e0, bx, 1.2, bz, 18));
      const gota = bola(.18, 0xffffff, bx, 1.2, bz + .62, 10); gota.scale.z = .3; g.add(gota);
      // fatia de queijo na frente
      const q = mesh(new THREE.CylinderGeometry(.55, .55, .32, 16, 1, false, 0, Math.PI / 2.4), 0, .55, .17, 1.85, true, liso(0xffc93c)); q.rotation.y = 2.2; g.add(q);
      [[.45, .3, 1.95], [.7, .2, 1.75]].forEach(([x, y, z]) => g.add(bola(.06, 0xd99a1e, x, y + .02, z, 8)));
      // latões de leite
      [-1.55, -1.15].forEach(x => { g.add(cil(.17, .2, .5, 0xc8ced4, x, .25, 1.75, 12)); g.add(cil(.09, .12, .14, 0xb0b8c0, x, .57, 1.75, 10)); });
    } else if (t === 'tecelagem') {
      // tecelagem: casinha lilás com um novelo de lã gigante no telhado e varal de roupas
      casinha(g, 0xeedcf5, 0x8e4fb5);
      const nv = new THREE.Group(); nv.position.set(.15, 3.55, -.3); g.add(nv);
      nv.add(bola(.95, 0xff7eb6, 0, 0, 0, 20));
      for (let k = 0; k < 4; k++) { const fio = mesh(new THREE.TorusGeometry(.92 - k * .04, .05, 6, 28), 0, 0, 0, 0, false, liso(0xe2589a)); fio.rotation.set(k * .8, k * .5, 0); nv.add(fio); }
      [[.5, -.6], [-.5, .6]].forEach(([a, b]) => { const ag = cil(.05, .05, 2.4, 0xc0c6cf, 0, 0, 0, 8); ag.rotation.set(0, 0, a + b); nv.add(ag); });
      const solto = mesh(new THREE.TorusGeometry(.6, .04, 6, 16, Math.PI * .9), 0, -1.2, 3.1, -.3, false, liso(0xe2589a)); solto.rotation.z = Math.PI; g.add(solto);
      // roda de fiar
      const roda = new THREE.Group(); roda.position.set(1.95, .9, .2); g.add(roda);
      roda.add(mesh(new THREE.TorusGeometry(.5, .05, 8, 24), 0, 0, 0, 0, true, liso(0x8b5a2b)));
      for (let k = 0; k < 6; k++) { const r = mesh(new THREE.BoxGeometry(.04, 1, .04), 0, 0, 0, 0, false, liso(0x8b5a2b)); r.rotation.z = k * Math.PI / 6; roda.add(r); }
      roda.rotation.y = Math.PI / 2; roda.userData.roda = true; fabRodas.push(roda);
      g.add(mesh(new THREE.BoxGeometry(.12, .9, .12), 0, 1.95, .45, .2, true, liso(0x6b4226)));
      // varal com cachecol e suéter
      [-1.75, .25].forEach(x => g.add(cil(.05, .05, 1.5, 0x8b5a2b, x, .75, 1.95, 6)));
      const corda = cil(.015, .015, 2, 0xffffff, -.75, 1.42, 1.95, 4); corda.rotation.z = Math.PI / 2; g.add(corda);
      g.add(mesh(new THREE.BoxGeometry(.28, .8, .04), 0, -1.35, 1.02, 1.95, true, liso(0xe2453a)));
      g.add(mesh(new THREE.BoxGeometry(.6, .55, .05), 0, -.55, 1.12, 1.95, true, liso(0x5bb3ea)));
      [-.88, -.22].forEach(x => g.add(mesh(new THREE.BoxGeometry(.18, .4, .05), 0, x, 1.22, 1.95, true, liso(0x5bb3ea))));
      [[0xffc93c, .9], [0x6cc357, 1.2]].forEach(([c, x]) => g.add(bola(.17, c, x, .2, 1.7, 12)));
    } else if (t === 'cozinha') {
      // cozinha: lanchonete de telhado reto com um chapéu de cozinheiro gigante e frigideira com ovo
      g.add(mesh(new THREE.BoxGeometry(3.4, 2.3, 3), 0, 0, 1.15, -.2, true, liso(0xd8f2d0)));
      for (let i = 0; i < 9; i++) for (let k = 0; k < 2; k++) g.add(mesh(new THREE.BoxGeometry(.38, .38, .04), 0, -1.52 + i * .38, .19 + k * .38, 1.31, false, liso((i + k) % 2 ? 0xffffff : 0xe2453a)));
      g.add(mesh(new THREE.BoxGeometry(3.7, .25, 3.3), 0, 0, 2.42, -.2, true, liso(0xe2453a)));
      // chapéu de cozinheiro
      g.add(cil(.75, .75, .7, 0xffffff, 0, 2.9, -.3, 18));
      [[0, 3.5, -.3, .7], [-.5, 3.4, -.3, .5], [.5, 3.4, -.3, .5], [0, 3.4, .15, .5], [0, 3.4, -.75, .5]].forEach(([x, y, z, r]) => g.add(bola(r, 0xffffff, x, y, z, 14)));
      g.add(cil(.77, .77, .14, 0xe2453a, 0, 2.6, -.3, 18));
      // frigideira com ovo (placa)
      const fr = new THREE.Group(); fr.position.set(.8, 1.55, 1.36); g.add(fr);
      const prato = cil(.45, .4, .08, 0x3a3a3a, 0, 0, 0, 18); prato.rotation.x = Math.PI / 2; fr.add(prato);
      const cabo = mesh(new THREE.BoxGeometry(.6, .1, .06), 0, .7, 0, 0, false, liso(0x6b4226)); fr.add(cabo);
      const clara = bola(.3, 0xffffff, 0, 0, .06, 12); clara.scale.z = .2; fr.add(clara);
      const gema = bola(.12, 0xffc21a, .03, .03, .1, 10); gema.scale.z = .6; fr.add(gema);
      porta(-.8, 0x6cc357, 1.33);
      toldo(g, -.8, 1.75, 1.55, 1.2, 0xe2453a, 0xffffff, 4);
      // mesinha com torta
      g.add(cil(.35, .35, .06, 0xffffff, 1.4, .62, 1.85, 14)); g.add(cil(.05, .05, .6, 0x8b5a2b, 1.4, .3, 1.85, 6));
      g.add(cil(.24, .2, .12, 0xd99a4a, 1.4, .72, 1.85, 14)); g.add(cil(.2, .2, .03, 0xe0703a, 1.4, .79, 1.85, 14));
      chamine(g, -1.2, 3, -1.1);
    } else if (t === 'engenho') {
      // engenho: casa de pedra com roda d'água e chaminé alta
      g.add(mesh(new THREE.BoxGeometry(3, 2.2, 2.8), 0, -.3, 1.1, -.2, true, liso(0xc9c2b5)));
      for (let i = 0; i < 12; i++) g.add(mesh(new THREE.BoxGeometry(.5, .25, .04), 0, -1.6 + (i % 4) * .85 + (i > 3 && i < 8 ? .4 : 0), .4 + Math.floor(i / 4) * .6, 1.21, false, liso(0xa9a294)));
      const tt = telhado(3.4, 1, 3.2, 0x8a4b2a); tt.position.set(-.3, 2.2, -.2); g.add(tt);
      porta(-.8, 0x6b4226, 1.21); janela(.4, 1.3, 1.21, .6, .5);
      const roda = new THREE.Group(); roda.position.set(1.45, 1.1, .2); roda.rotation.y = Math.PI / 2; g.add(roda); roda.userData.roda = true; fabRodas.push(roda);
      roda.add(mesh(new THREE.TorusGeometry(.95, .08, 8, 24), 0, 0, 0, 0, true, liso(0x8b5a2b)));
      for (let k = 0; k < 8; k++) { const r = mesh(new THREE.BoxGeometry(.08, 1.9, .3), 0, 0, 0, 0, true, liso(0x9a6238)); r.rotation.z = k * Math.PI / 8; roda.add(r); }
      g.add(mesh(new THREE.BoxGeometry(.5, .2, 2.8), 0, 1.75, .12, .2, true, liso(0x4fb3e8)));
      g.add(cil(.3, .38, 3.6, 0xa0522d, -1.4, 1.8, -1.2, 10)); g.add(cil(.36, .36, .2, 0x6b3a1f, -1.4, 3.6, -1.2, 10));
      chamine(g, -1.4, 3.9, -1.2);
      [[.3, 1.85], [.7, 1.75]].forEach(([x, z]) => { for (let k = 0; k < 3; k++) { const c = cil(.03, .035, 1.1, 0x9cc94a, x + k * .08, .55, z, 5); c.rotation.z = .3; g.add(c); } });
    } else if (t === 'docaria') {
      // docaria: casa rosa com um cupcake gigante no telhado
      g.add(mesh(new THREE.BoxGeometry(3.2, 2.1, 2.8), 0, 0, 1.05, -.2, true, liso(0xffd6e4)));
      const tt = telhado(3.6, 1, 3.2, 0xff7fb0); tt.position.set(0, 2.1, -.2); g.add(tt);
      const cp = new THREE.Group(); cp.position.set(0, 3.05, -.2); g.add(cp);
      cp.add(cil(.7, .5, .7, 0xf7b267, 0, 0, 0, 16)); for (let k = 0; k < 10; k++) { const r = cil(.03, .03, .7, 0xe0954a, Math.cos(k * .63) * .6, 0, Math.sin(k * .63) * .6, 4); cp.add(r); }
      [[0, .55, .72], [0, .9, .55], [0, 1.18, .35]].forEach(([x, y, r]) => { const b = bola(r, 0xfff0f6, x, y, 0, 16); b.scale.y = .6; cp.add(b); });
      cp.add(bola(.16, 0xe8203a, 0, 1.42, 0, 10));
      for (let k = 0; k < 8; k++) cp.add(mesh(new THREE.BoxGeometry(.12, .03, .03), 0, rnd(-.4, .4), rnd(.6, 1.1), rnd(-.4, .4) + .2, false, liso([0x5fc8ff, 0xffd84a, 0x7ad65a][k % 3])));
      porta(-.7, 0xc94f7c, 1.21); janela(.75, 1.25, 1.21);
      toldo(g, .75, 1.8, 1.45, 1.3, 0xff7fb0, 0xffffff, 4);
      g.add(mesh(new THREE.BoxGeometry(1.25, .45, .45), 0, .75, .25, 1.55, true, liso(0xffffff)));
      [[.45, 0xffb3c7], [.75, 0xa6e3ff], [1.05, 0xfff0a6]].forEach(([x, c]) => { g.add(cil(.1, .08, .12, 0xf7b267, x, .54, 1.55, 10)); g.add(bola(.1, c, x, .66, 1.55, 10)); });
    } else if (t === 'sorveteria') {
      // sorveteria: quiosque listrado azul e branco com uma casquinha gigante
      g.add(cil(1.5, 1.5, 2.1, 0xffffff, 0, 1.05, -.2, 20));
      for (let k = 0; k < 10; k++) { const f = mesh(new THREE.BoxGeometry(.25, 2.1, .05), 0, Math.sin(k * .628) * 1.51, 1.05, -.2 + Math.cos(k * .628) * 1.51, false, liso(0x5bb3ea)); f.rotation.y = k * .628; if (k % 2) g.add(f); }
      const tp = mesh(new THREE.ConeGeometry(1.9, .9, 20), 0, 0, 2.55, -.2, true, liso(0xff7fb0)); g.add(tp);
      const cs = new THREE.Group(); cs.position.set(0, 3.0, -.2); g.add(cs);
      const cone = mesh(new THREE.ConeGeometry(.42, 1.1, 14), 0, 0, .55, 0, true, liso(0xe0a25a)); cone.rotation.x = Math.PI; cs.add(cone);
      cs.add(bola(.45, 0xffb3c7, 0, 1.2, 0, 14)); cs.add(bola(.38, 0xfff3d6, 0, 1.62, 0, 14)); cs.add(bola(.12, 0xe8203a, 0, 2.02, 0, 8));
      porta(0, 0x5bb3ea, 1.28);
      g.add(mesh(new THREE.BoxGeometry(1.6, .12, .6), 0, 0, 1.0, 1.4, true, liso(0x5bb3ea)));
      [[-1.5, 1.7], [1.5, 1.7]].forEach(([x, z]) => { g.add(cil(.35, .35, .05, 0xffffff, x, .7, z, 14)); g.add(cil(.04, .04, .7, 0xb0b8c0, x, .35, z, 6)); g.add(cil(.04, .04, 1.4, 0xb0b8c0, x, 1.2, z, 6)); g.add(mesh(new THREE.ConeGeometry(.6, .35, 10), 0, x, 1.95, z, true, liso(0xffd84a))); });
    }
    return g;
  }
  function modeloCasinhaPet() {
    const g = new THREE.Group();
    g.add(chaoPlano(1.9, 1.9, 0x9fd67a));
    const c = new THREE.Group(); c.position.set(-.3, 0, -.4); g.add(c);
    c.add(mesh(new THREE.BoxGeometry(1.5, 1, 1.2), 0, 0, .5, 0, true, liso(0x5bb3ea)));
    const t = telhado(1.8, .55, 1.5, 0xe2453a); t.position.y = 1; c.add(t);
    const porta = cil(.32, .32, .06, 0x3a2a20, 0, .38, .61, 16); porta.rotation.x = Math.PI / 2; c.add(porta);
    c.add(mesh(new THREE.BoxGeometry(.64, .38, .06), 0, 0, .19, .61, false, liso(0x3a2a20)));
    c.add(mesh(new THREE.BoxGeometry(.6, .18, .05), 0, 0, 1.2, .76, false, liso(0xfff1d6)));
    g.add(cil(.22, .18, .1, 0xe2453a, .7, .05, .55, 14)); g.add(cil(.18, .18, .02, 0xb07a46, .7, .1, .55, 14));
    const osso = new THREE.Group(); osso.position.set(.2, .06, .8); osso.rotation.y = .6; g.add(osso);
    osso.add(cil(.03, .03, .3, 0xfff8ea, 0, 0, 0, 6).rotateZ(Math.PI / 2)); [-1, 1].forEach(k => { osso.add(bola(.045, 0xfff8ea, k * .16, 0, .03, 6)); osso.add(bola(.045, 0xfff8ea, k * .16, 0, -.03, 6)); });
    const alm = cil(.35, .38, .1, 0xb08cff, .55, .05, -.2, 16); alm.scale.z = .75; g.add(alm);
    g.add(bola(.1, 0xffd84a, .9, .1, .1, 8));
    return g;
  }
  // árvore do pomar: as frutas aparecem quando estão maduras
  const frutosArv = {};
  function modeloArvoreFruta(o) {
    const f = item(TIPOS[o.tipo].fruta), g = arvore(1.05, null); g.rotation.y = 0;
    const fr = new THREE.Group(); fr.userData.anim = true; g.add(fr);
    for (let i = 0; i < 9; i++) { const a = i * .7 + rnd(0, .3), b = rnd(-.2, .9); fr.add(bola(.12, f.cor, Math.cos(a) * 1.0, 2.0 + b * .5, Math.sin(a) * 1.0, 8)); }
    frutosArv[o.id] = fr; return g;
  }
  const fabRodas = [];
  function modeloCeleiro() {
    const g = new THREE.Group(), bx = -.45, bz = -.3;
    g.add(chaoPlano(3.2, 1.5, 0xd8b98a).translateX(bx).translateZ(2.0));
    g.add(mesh(new THREE.BoxGeometry(4, 2.6, 3.4), 0, bx, 1.3, bz, true, liso(0xc8433a)));
    const tc = telhadoCeleiro(4.5, 2, 3.8, 0x6e3a2e); tc.position.set(bx, 2.6, bz); g.add(tc);
    [[-2, -1.7], [2, -1.7], [-2, 1.7], [2, 1.7]].forEach(([x, z]) => g.add(mesh(new THREE.BoxGeometry(.14, 2.6, .14), 0, bx + x, 1.3, bz + z, true, liso(0xfaf3e6))));
    g.add(mesh(new THREE.BoxGeometry(4.08, .12, 3.48), 0, bx, 2.6, bz, true, liso(0xfaf3e6)));
    const fz = bz + 1.72;
    g.add(mesh(new THREE.BoxGeometry(1.7, 1.95, .06), 0, bx, .98, fz, true, liso(0xfaf3e6)));
    g.add(mesh(new THREE.BoxGeometry(1.45, 1.75, .07), 0, bx, .92, fz + .01, true, liso(0xa8372f)));
    [.9, -.9].forEach(a => { const x = mesh(new THREE.BoxGeometry(.1, 2.1, .04), 0, bx, .92, fz + .05, false, liso(0xfaf3e6)); x.rotation.z = a * .62; g.add(x); });
    g.add(mesh(new THREE.BoxGeometry(.06, 1.75, .05), 0, bx, .92, fz + .05, false, liso(0xfaf3e6)));
    g.add(mesh(new THREE.BoxGeometry(.95, .75, .06), 0, bx, 3.3, bz + 1.95, true, liso(0xfaf3e6)));
    g.add(mesh(new THREE.BoxGeometry(.75, .55, .07), 0, bx, 3.3, bz + 1.96, false, liso(0x4a2c1a)));
    // silo
    const sx = 2.15, sz = -.6;
    g.add(cil(.72, .72, 3.6, 0, sx, 1.8, sz, 18, liso(0xbcc6ce)));
    [.7, 1.6, 2.5, 3.3].forEach(y => { const t = mesh(new THREE.TorusGeometry(.73, .04, 6, 18), 0, sx, y, sz, false, liso(0x8f9aa3)); t.rotation.x = Math.PI / 2; g.add(t); });
    g.add(mesh(new THREE.SphereGeometry(.74, 18, 8, 0, Math.PI * 2, 0, Math.PI / 2), 0, sx, 3.6, sz, true, liso(0x9aa5ae)));
    g.add(bola(.1, 0x8f9aa3, sx, 4.38, sz, 8));
    // sacos de semente
    [[-1.6, 2.15], [-1.25, 2.4], [.7, 2.2]].forEach(([x, z]) => {
      const sc = bola(.26, 0xe2b06c, bx + x, .28, z, 12); sc.scale.set(1, 1.1, .85); g.add(sc);
      g.add(mesh(new THREE.ConeGeometry(.12, .18, 8), 0, bx + x, .62, z, true, liso(0xcf9853)));
    });
    return g;
  }
  function modeloLoja() {
    const g = new THREE.Group(), lz = -.5;
    g.add(chaoPlano(3.6, 1.4, 0xd8b98a).translateZ(2.2));
    g.add(mesh(new THREE.BoxGeometry(4.2, 2.7, 3.2), 0, 0, 1.35, lz, true, liso(0xf6e6c4)));
    [-2.05, 2.05].forEach(x => [-1.55, 1.55].forEach(z => g.add(mesh(new THREE.BoxGeometry(.22, 2.7, .22), 0, x, 1.35, lz + z, true, liso(0x9a6238)))));
    const t = telhado(5, 1.7, 3.9, 0xd9653b); t.position.set(0, 2.7, lz); g.add(t);
    g.add(mesh(new THREE.BoxGeometry(.5, 1.2, .5), 0, 1.25, 3.7, lz - .6, true, liso(0x9a7d6a)));
    g.add(mesh(new THREE.BoxGeometry(.85, 1.55, .08), 0, -1.15, .78, lz + 1.62, true, liso(0x8b5a2b)));
    g.add(mesh(new THREE.BoxGeometry(.85, .7, .08), 0, 1.15, 1.85, lz + 1.62, true, liso(0xffe9a0)));
    for (let i = 0; i < 7; i++) { const f = mesh(new THREE.BoxGeometry(.5, .07, 1.2), 0, -1.5 + i * .5, 2.3, lz + 2.15, true, liso(i % 2 ? 0xffffff : 0xe2453a)); f.rotation.x = .35; g.add(f); }
    for (let i = 0; i < 7; i++) g.add(mesh(new THREE.SphereGeometry(.25, 10, 6, 0, Math.PI), 0, -1.5 + i * .5, 2.08, lz + 2.72, false, liso(i % 2 ? 0xffffff : 0xe2453a)));
    [-1.6, 1.6].forEach(x => g.add(cil(.06, .06, 2.1, 0x8b5a2b, x, 1.05, lz + 2.65, 8)));
    g.add(mesh(new THREE.BoxGeometry(3, .8, .6), 0, 0, .4, lz + 2.5, true, liso(0xb77a45)));
    [[0xe83b2c, -.95], [0xf5c63a, -.32], [0x7fd35a, .32], [0xf58a20, .95]].forEach(([c, x]) => {
      g.add(mesh(new THREE.BoxGeometry(.55, .2, .42), 0, x, .9, lz + 2.5, true, liso(0x8b5a2b)));
      for (let k = 0; k < 3; k++) g.add(bola(.09, c, x - .14 + k * .14, 1.05, lz + 2.5, 8));
    });
    return g;
  }
  let pasMoinho = [];
  function modeloMoinho() {
    const g = new THREE.Group();
    g.add(cil(1.45, 1.6, .8, 0x9ea4a8, 0, .4, 0, 18));
    for (let i = 0; i < 12; i++) { const a = i / 12 * Math.PI * 2; g.add(mesh(new THREE.DodecahedronGeometry(.22, 0), 0x8c9296, Math.cos(a) * 1.5, .3 + (i % 2) * .3, Math.sin(a) * 1.5)); }
    g.add(cil(.95, 1.3, 3.8, 0xf3e3c3, 0, 2.7, 0, 18));
    [1.6, 3.2].forEach(y => { const t = mesh(new THREE.TorusGeometry(1.3 - (y - .8) * .093, .05, 6, 20), 0, 0, y, 0, false, liso(0x9a6238)); t.rotation.x = Math.PI / 2; g.add(t); });
    g.add(mesh(new THREE.BoxGeometry(.6, 1, .1), 0, 0, 1.3, 1.27, true, liso(0x8b5a2b)));
    const arco = mesh(new THREE.CylinderGeometry(.3, .3, .1, 12, 1, false, 0, Math.PI), 0, 0, 1.8, 1.25, true, liso(0x8b5a2b)); arco.rotation.set(Math.PI / 2, 0, Math.PI / 2); g.add(arco);
    [[.75, 2.9], [-.75, 2.9]].forEach(([x, y]) => g.add(mesh(new THREE.BoxGeometry(.32, .4, .08), 0, x * .9, y, Math.sqrt(1.2 - x * x) * .95, false, liso(0x6aa9d6))));
    g.add(cil(1.25, 1.25, .1, 0x9a6238, 0, 4.6, 0, 20));
    for (let i = 0; i < 16; i++) { const a = i / 16 * Math.PI * 2; g.add(cil(.03, .03, .4, 0x9a6238, Math.cos(a) * 1.2, 4.85, Math.sin(a) * 1.2, 5)); }
    const gp = mesh(new THREE.TorusGeometry(1.2, .04, 6, 24), 0, 0, 5.05, 0, false, liso(0x9a6238)); gp.rotation.x = Math.PI / 2; g.add(gp);
    const cap = mesh(new THREE.SphereGeometry(1.1, 18, 10, 0, Math.PI * 2, 0, Math.PI / 2), 0, 0, 4.65, 0, true, liso(0xc0563a)); cap.scale.y = 1.15; g.add(cap);
    g.add(bola(.12, 0xf2c230, 0, 5.95, 0, 8));
    const pas = new THREE.Group(); pas.position.set(0, 4.75, 1.15);
    for (let i = 0; i < 4; i++) {
      const b = new THREE.Group(); b.rotation.z = i * Math.PI / 2;
      b.add(mesh(new THREE.BoxGeometry(.12, 2.9, .08), 0, 0, 1.45, 0, true, liso(0x7a4b25)));
      [.18, .72].forEach(x => b.add(mesh(new THREE.BoxGeometry(.05, 2.2, .05), 0, x, 1.75, 0, true, liso(0xa0703f))));
      for (let k = 0; k < 7; k++) b.add(mesh(new THREE.BoxGeometry(.6, .05, .04), 0, .45, .7 + k * .35, 0, false, liso(0xa0703f)));
      if (i % 2 === 0) { const vela = mesh(new THREE.PlaneGeometry(.52, 1.9), 0, .45, 1.75, -.03, false, new THREE.MeshStandardMaterial({color:C(0xfaf2e2), side:THREE.DoubleSide, transparent:true, opacity:.9})); b.add(vela); }
      pas.add(b);
    }
    pas.add(bola(.22, 0x6b4a2b, 0, 0, .05, 10));
    g.add(pas); pasMoinho.push(pas);
    return g;
  }
  function modeloPoco() {
    const g = new THREE.Group();
    g.add(cil(.72, .78, .8, 0xa7acb1, 0, .4, 0, 18));
    const borda = mesh(new THREE.TorusGeometry(.72, .09, 8, 20), 0, 0, .8, 0, true, liso(0x8c9296)); borda.rotation.x = Math.PI / 2; g.add(borda);
    g.add(cil(.62, .62, .04, 0x3d8fd0, 0, .72, 0, 18));
    [-.62, .62].forEach(x => g.add(mesh(new THREE.BoxGeometry(.12, 1.5, .12), 0, x, 1.25, 0, true, liso(0x8b5a2b))));
    const eixo = cil(.06, .06, 1.3, 0x7a4b25, 0, 1.55, 0, 8); eixo.rotation.z = Math.PI / 2; g.add(eixo);
    g.add(cil(.12, .1, .2, 0x9aa5ae, 0, 1.2, 0, 10));
    const t = telhado(1.7, .6, 1.3, 0xc0563a); t.position.y = 1.95; g.add(t);
    return g;
  }
  function modeloLago() {
    const g = new THREE.Group();
    g.add(cil(3.05, 3.15, .14, 0x8a6a45, 0, .06, 0, 40)); // margem de terra
    const geo = new THREE.CircleGeometry(2.85, 48); geo.rotateX(-Math.PI / 2);
    const agua = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({color:C(0x2f9fe0), roughness:.12, metalness:.05, envMapIntensity:.45}));
    agua.position.y = .15; agua.receiveShadow = true; g.add(agua);
    const brilho = new THREE.Mesh(new THREE.RingGeometry(.2, .32, 32).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({color:0xffffff, transparent:true, opacity:0, depthWrite:false}));
    brilho.position.y = .16; g.add(brilho); aguasAnimadas.push(brilho);
    for (let i = 0; i < 18; i++) { const a = i / 18 * Math.PI * 2, s = rnd(.5, .85); const p = pedra(s); p.position.set(Math.cos(a) * 3.05, .14, Math.sin(a) * 3.05); g.add(p); }
    [[-1, .5], [1.1, -.9], [.3, 1.3]].forEach(([x, z]) => { const v = cil(.38, .38, .03, 0x4fae3e, x, .17, z, 16); g.add(v); if (Math.random() < .6) g.add(bola(.08, 0xff9ac2, x + .1, .21, z, 8)); });
    for (let i = 0; i < 8; i++) { const a = rnd(2.2, 3.8), r = rnd(2.5, 2.9); g.add(cil(.025, .03, rnd(.6, 1), 0x5a8a3a, Math.cos(a) * r, .45, Math.sin(a) * r, 5)); }
    return g;
  }
  function modeloCercado(tipo, w, d) {
    const g = new THREE.Group(), W = w * G - .4, D = d * G - .4;
    const cores = {galinheiro:0xd9c08a, curral:0xc9a66b, pasto:0x8fd06a, coelheira:0x9fd67a, lagoinha:0x8fd06a, chiqueiro:0xb08a5a, apiario:0xa6dc7e};
    g.add(chaoPlano(W, D, cores[tipo], .025));
    g.add(cerca(W, D, true, 0xa86f3c));
    const fx = W / 2 - .9, fz = -D / 2 + .55;
    g.add(mesh(new THREE.BoxGeometry(1.2, .35, .5), 0, fx, .18, fz, true, liso(0x8b5a2b)));
    g.add(mesh(new THREE.BoxGeometry(1.05, .08, .36), 0, fx, .36, fz, false, liso(tipo === 'galinheiro' ? 0xe8c55a : 0x6cc452)));
    if (tipo === 'galinheiro') {
      const c = new THREE.Group();
      c.add(mesh(new THREE.BoxGeometry(1.5, 1, 1.1), 0, 0, .72, 0, true, liso(0xd2503f)));
      [-.6, .6].forEach(x => [-.4, .4].forEach(z => c.add(cil(.05, .05, .4, 0x8b5a2b, x, .2, z, 6))));
      const t = telhado(1.8, .65, 1.4, 0x7a3b2e); t.position.y = 1.22; c.add(t);
      c.add(mesh(new THREE.BoxGeometry(.42, .42, .05), 0, 0, .7, .57, false, liso(0x4a2c1a)));
      const rampa = mesh(new THREE.BoxGeometry(.35, .05, .8), 0, 0, .25, .9, true, liso(0x9a6238)); rampa.rotation.x = .5; c.add(rampa);
      c.position.set(-W / 2 + 1.05, 0, -D / 2 + .85); g.add(c);
    }
    if (tipo === 'curral') {
      g.add(mesh(new THREE.BoxGeometry(1, .3, .45), 0, -W / 2 + .8, .15, D / 2 - .7, true, liso(0x9aa5ae)));
      g.add(mesh(new THREE.BoxGeometry(.9, .05, .35), 0, -W / 2 + .8, .3, D / 2 - .7, false, liso(0x5fb5e8)));
      for (let i = 0; i < 2; i++) { const f = cil(.45, .45, .8, 0xeccb5e, -W / 2 + .9, .45, -D / 2 + .9 + i * 1.0, 14); f.rotation.z = Math.PI / 2; g.add(f); }
    }
    if (tipo === 'lagoinha') {
      const ag = cil(1.25, 1.3, .06, 0x4fb3e8, .2, .04, .2, 24); ag.scale.z = .8; g.add(ag);
      for (let i = 0; i < 6; i++) { const a = i / 6 * 6.28; g.add(cil(.03, .03, .7, 0x6b8f3a, .2 + Math.cos(a) * 1.35, .35, .2 + Math.sin(a) * 1.1, 4)); }
      g.add(bola(.18, 0x9a9a9a, 1.3, .1, -.9, 6)); g.add(bola(.14, 0x8a8a8a, -1, .08, 1.1, 6));
    }
    if (tipo === 'chiqueiro') {
      const lama = cil(1, 1.05, .05, 0x6b4a2b, .5, .04, .1, 20); lama.scale.z = .7; g.add(lama);
      const c = new THREE.Group(); c.add(mesh(new THREE.BoxGeometry(1.3, .8, .9), 0, 0, .4, 0, true, liso(0xb5733f)));
      const t = telhado(1.6, .45, 1.2, 0x7a4a26); t.position.y = .8; c.add(t); c.position.set(-W / 2 + .9, 0, -D / 2 + .7); g.add(c);
    }
    if (tipo === 'apiario') {
      [[-.5, -.4], [.5, -.4], [0, .5]].forEach(([x, z]) => { const h = new THREE.Group(); h.position.set(x, 0, z);
        [0, 1, 2].forEach(k => h.add(mesh(new THREE.BoxGeometry(.6, .26, .5), 0, 0, .15 + k * .27, 0, true, liso(k % 2 ? 0xf2c14e : 0xffd76a))));
        h.add(mesh(new THREE.BoxGeometry(.7, .06, .6), 0, 0, .86, 0, true, liso(0xb07a46))); g.add(h); });
      for (let i = 0; i < 8; i++) g.add(bola(.06, [0xff6fa0, 0xffd84a, 0xb08cff][i % 3], rnd(-W / 2 + .3, W / 2 - .3), .1, rnd(-D / 2 + .3, D / 2 - .3), 6));
    }
    if (tipo === 'coelheira') {
      const c = new THREE.Group();
      c.add(mesh(new THREE.BoxGeometry(1.7, .8, 1), 0, 0, .75, 0, true, liso(0xf2e3c6)));
      [-.75, .75].forEach(x => [-.4, .4].forEach(z => c.add(cil(.05, .05, .4, 0x8b5a2b, x, .2, z, 6))));
      const t = telhado(2, .55, 1.3, 0xd96a8a); t.position.y = 1.15; c.add(t);
      c.add(mesh(new THREE.BoxGeometry(.7, .5, .05), 0, -.35, .75, .52, false, liso(0x7a5a3a)));
      for (let k = 0; k < 4; k++) c.add(mesh(new THREE.BoxGeometry(.03, .5, .06), 0, .2 + k * .15, .75, .52, false, liso(0xb0b8c0)));
      const rampa = mesh(new THREE.BoxGeometry(.32, .05, .7), 0, -.35, .25, .85, true, liso(0x9a6238)); rampa.rotation.x = .55; c.add(rampa);
      c.position.set(-W / 2 + 1.1, 0, -D / 2 + .8); g.add(c);
      // cenouras espalhadas
      for (let i = 0; i < 4; i++) { const ce = mesh(new THREE.ConeGeometry(.06, .3, 6), 0, rnd(0, W / 2 - .5), .06, rnd(-D / 2 + .5, D / 2 - .5), true, liso(0xff8a2a)); ce.rotation.z = Math.PI / 2; ce.rotation.y = rnd(0, 6); g.add(ce); }
    }
    if (tipo === 'pasto') {
      for (let i = 0; i < 2; i++) { const f = cil(.45, .45, .8, 0xeccb5e, -W / 2 + .9, .45, D / 2 - .9 - i * 1.0, 14); f.rotation.z = Math.PI / 2; g.add(f); }
      for (let i = 0; i < 10; i++) g.add(bola(.07, [0xffffff, 0xffd84a][i % 2], rnd(-W / 2 + .5, W / 2 - .5), .1, rnd(-D / 2 + .5, D / 2 - .5), 6));
    }
    return g;
  }

  function modeloDecor(t) {
    const g = new THREE.Group();
    if (t === 'flores') {
      g.add(cil(.85, .9, .16, 0x7a5233, 0, .08, 0, 20)); g.add(cil(.78, .78, .04, 0x5a3a22, 0, .17, 0, 20));
      const cs = [0xff6fa0, 0xffd84a, 0xffffff, 0xb08cff, 0xff8a3d];
      for (let i = 0; i < 9; i++) { const a = i * 2.4, r = i ? .5 : 0, x = Math.cos(a) * r, z = Math.sin(a) * r;
        g.add(cil(.025, .025, .35, 0x3f9a3a, x, .35, z, 5)); const c = cs[i % 5];
        for (let k = 0; k < 5; k++) { const pa = k / 5 * Math.PI * 2; g.add(bola(.07, c, x + Math.cos(pa) * .08, .55, z + Math.sin(pa) * .08, 6)); }
        g.add(bola(.05, 0xffc93c, x, .57, z, 6)); }
    } else if (t === 'caminho') {
      [[-.45, -.4, .38], [.4, -.3, .34], [-.2, .35, .4], [.45, .45, .3]].forEach(([x, z, r]) => { const p = cil(r, r * 1.05, .08, 0xb9b4ad, x, .05, z, 9); p.rotation.y = rnd(0, 3); g.add(p); });
    } else if (t === 'cercaDec') {
      [-.85, -.3, .3, .85].forEach(x => { g.add(mesh(new THREE.BoxGeometry(.16, .9, .08), 0, x, .45, 0, true, liso(0xfaf7f0))); const c = mesh(new THREE.ConeGeometry(.115, .16, 4), 0, x, .98, 0, true, liso(0xfaf7f0)); c.rotation.y = Math.PI / 4; g.add(c); });
      [.3, .65].forEach(y => g.add(mesh(new THREE.BoxGeometry(2.1, .1, .06), 0, 0, y, -.07, true, liso(0xeeeae2))));
    } else if (t === 'banco') {
      for (let i = 0; i < 3; i++) g.add(mesh(new THREE.BoxGeometry(1.5, .07, .16), 0, 0, .5, -.18 + i * .18, true, liso(0xb07a46)));
      for (let i = 0; i < 2; i++) g.add(mesh(new THREE.BoxGeometry(1.5, .14, .06), 0, 0, .78 + i * .2, -.32, true, liso(0xb07a46)));
      [-.65, .65].forEach(x => { g.add(mesh(new THREE.BoxGeometry(.08, .5, .5), 0, x, .25, -.05, true, liso(0x3a3a3a))); g.add(mesh(new THREE.BoxGeometry(.08, .55, .06), 0, x, .8, -.34, true, liso(0x3a3a3a))); });
      g.add(sombraBlob(.8));
    } else if (t === 'espantalho') {
      g.add(cil(.06, .07, 2, 0x8b5a2b, 0, 1, 0, 8));
      const br = cil(.05, .05, 1.5, 0x8b5a2b, 0, 1.45, 0, 8); br.rotation.z = Math.PI / 2; g.add(br);
      g.add(mesh(new THREE.BoxGeometry(.6, .7, .3), 0, 0, 1.25, 0, true, liso(0x3d6fd1)));
      [-1, 1].forEach(sx => { const m = mesh(new THREE.BoxGeometry(.5, .2, .22), 0, sx * .5, 1.45, 0, true, liso(0xd9534f)); g.add(m); g.add(bola(.1, 0xeccb5e, sx * .78, 1.45, 0, 8)); });
      g.add(bola(.28, 0xf2d79b, 0, 1.85, 0, 14)); olhos(g, 1.9, .24, .1, .045);
      g.add(cil(.5, .52, .05, 0xc99b54, 0, 2.08, 0, 16)); g.add(cil(.22, .28, .3, 0xc99b54, 0, 2.24, 0, 14));
      g.add(sombraBlob(.5));
    } else if (t === 'poste') {
      g.add(cil(.18, .22, .2, 0x3a3a3a, 0, .1, 0, 12)); g.add(cil(.06, .08, 2.6, 0x3a3a3a, 0, 1.4, 0, 10));
      const luz = mesh(new THREE.SphereGeometry(.22, 14, 10), 0, 0, 2.85, 0, false, new THREE.MeshStandardMaterial({color:C(0xfff2c0), emissive:C(0xffd76a), emissiveIntensity:1.4}));
      g.add(luz); g.add(mesh(new THREE.ConeGeometry(.3, .25, 12), 0, 0, 3.12, 0, true, liso(0x3a3a3a)));
      g.add(sombraBlob(.4));
    } else if (t === 'arvoreDec') {
      const a = arvore(.75, 0xe83b2c); g.add(a);
    } else if (t === 'fonte') {
      g.add(cil(1.75, 1.85, .45, 0xc8c2b8, 0, .22, 0, 28));
      g.add(cil(1.55, 1.55, .05, 0x2f9fe0, 0, .42, 0, 28, new THREE.MeshStandardMaterial({color:C(0x4fb8ec), roughness:.1, envMapIntensity:.5})));
      g.add(cil(.22, .3, 1.2, 0xc8c2b8, 0, .9, 0, 14)); g.add(cil(.7, .55, .2, 0xc8c2b8, 0, 1.5, 0, 20));
      g.add(cil(.62, .62, .03, 0x4fb8ec, 0, 1.6, 0, 20, new THREE.MeshStandardMaterial({color:C(0x4fb8ec), roughness:.1, envMapIntensity:.5})));
      const jato = mesh(new THREE.SphereGeometry(.22, 12, 10), 0, 0, 1.85, 0, false, new THREE.MeshStandardMaterial({color:C(0xbfe9ff), transparent:true, opacity:.75, roughness:.05}));
      g.add(jato); g.userData.jato = jato;
    }
    return g;
  }

  // ---------- chão, natureza e terras bloqueadas ----------
  const aguasAnimadas = [];
  let aguaMar = null;
  function formaQuadrada(h, r) {
    const f = new THREE.Shape();
    f.moveTo(-h + r, -h); f.lineTo(h - r, -h); f.quadraticCurveTo(h, -h, h, -h + r); f.lineTo(h, h - r); f.quadraticCurveTo(h, h, h - r, h);
    f.lineTo(-h + r, h); f.quadraticCurveTo(-h, h, -h, h - r); f.lineTo(-h, -h + r); f.quadraticCurveTo(-h, -h, -h + r, -h);
    return f;
  }
  function palmeira(s = 1) {
    const g = new THREE.Group(); let x = 0, y = 0;
    for (let i = 0; i < 6; i++) { const seg = cil(.14 * s, .17 * s, .62 * s, 0xa77a4a, x, y + .3 * s, 0, 8); seg.rotation.z = -.08 * i; g.add(seg); x += .05 * i * s; y += .58 * s; }
    for (let i = 0; i < 7; i++) {
      const f = mesh(new THREE.ConeGeometry(.28 * s, 1.9 * s, 4), 0, 0, 0, 0, true, liso(i % 2 ? 0x4fae3e : 0x5cbf48));
      f.scale.set(1, 1, .25); f.position.set(x, y + .1, 0); f.rotation.set(0, i / 7 * Math.PI * 2, 1.15); f.translateY(.85 * s); g.add(f);
    }
    g.add(bola(.13 * s, 0x7a5233, x + .1, y - .05, .08)); g.add(bola(.13 * s, 0x7a5233, x - .08, y - .08, -.1));
    g.rotation.y = rnd(0, 6); semSombra(g); return g;
  }
  let sombraNuvens = null; const borboletas = [];
  function montarIlha() {
    const marGeo = new THREE.PlaneGeometry(360, 360, 40, 40); marGeo.rotateX(-Math.PI / 2);
    aguaMar = new THREE.Mesh(marGeo, new THREE.MeshStandardMaterial({color:C(0x56b4e6), roughness:.3, metalness:.05}));
    aguaMar.position.y = -1.55; scene.add(aguaMar);
    const areia = new THREE.ExtrudeGeometry(formaQuadrada(MEIA + 2.4, 6), {depth:1.6, bevelEnabled:true, bevelThickness:.4, bevelSize:.9, bevelSegments:2, curveSegments:10});
    areia.rotateX(-Math.PI / 2);
    const ma = new THREE.Mesh(areia, liso(0xeedba0)); ma.position.y = -2.15; ma.receiveShadow = true; scene.add(ma);
    const terra = new THREE.ExtrudeGeometry(formaQuadrada(MEIA, 4), {depth:1, bevelEnabled:true, bevelThickness:.2, bevelSize:.25, bevelSegments:2, curveSegments:10});
    terra.rotateX(-Math.PI / 2);
    const mt = new THREE.Mesh(terra, liso(0x6cb84c)); mt.position.y = -1.2; mt.receiveShadow = true; scene.add(mt);
    // grama com tons variados
    const geo = new THREE.PlaneGeometry(2 * MEIA, 2 * MEIA, 70, 70); geo.rotateX(-Math.PI / 2);
    const cores = [], c = new THREE.Color(), pos = geo.attributes.position, R = 4, K = MEIA - R;
    for (let i = 0; i < pos.count; i++) {
      let x = pos.getX(i), z = pos.getZ(i);
      if (Math.abs(x) > K && Math.abs(z) > K) { const cx = Math.sign(x) * K, cz = Math.sign(z) * K, dx = x - cx, dz = z - cz, d = Math.hypot(dx, dz); if (d > R) { x = cx + dx / d * R; z = cz + dz / d * R; pos.setX(i, x); pos.setZ(i, z); } }
      const n = Math.sin(x * .23) * Math.cos(z * .19) + Math.sin((x + z) * .11) * .7 + Math.sin(x * .7 + z * .5) * .15;
      const m = Math.sin(x * .05 + 1.3) * Math.cos(z * .06 - .4); // manchas grandes: grama mais clara e mais escura
      c.setHSL(.265 + n * .018 - m * .015, .62 + n * .05, .40 + n * .05 + m * .045).convertSRGBToLinear(); cores.push(c.r, c.g, c.b);
    }
    geo.setAttribute('color', new THREE.Float32BufferAttribute(cores, 3));
    const tg = document.createElement('canvas'); tg.width = tg.height = 256; const gg = tg.getContext('2d');
    gg.fillStyle = '#d8d8d8'; gg.fillRect(0, 0, 256, 256);
    for (let i = 0; i < 1600; i++) { const v = 170 + Math.random() * 85 | 0; gg.strokeStyle = `rgb(${v},${v},${v})`; gg.lineWidth = rnd(1, 2.2); const x = rnd(0, 256), y = rnd(0, 256); gg.beginPath(); gg.moveTo(x, y); gg.lineTo(x + rnd(-2, 2), y - rnd(3, 7)); gg.stroke(); }
    const txg = new THREE.CanvasTexture(tg); txg.wrapS = txg.wrapT = THREE.RepeatWrapping; txg.repeat.set(22, 22); txg.encoding = THREE.sRGBEncoding; txg.anisotropy = 4;
    const grama = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({vertexColors:true, map:txg, roughness:1, envMapIntensity:.25}));
    grama.position.y = .01; grama.material.color = C(0xe6ffe0); grama.receiveShadow = true; scene.add(grama);
    const tufoGeo = new THREE.ConeGeometry(.07, .32, 4); tufoGeo.translate(0, .16, 0);
    const tufos = new THREE.InstancedMesh(tufoGeo, new THREE.MeshStandardMaterial({roughness:.8, envMapIntensity:.25}), 1300);
    const flores = new THREE.InstancedMesh(new THREE.SphereGeometry(.12, 6, 5), new THREE.MeshStandardMaterial({roughness:.8}), 420);
    const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), sc = V3(), p = V3(), coresF = [0xff3f7f, 0xffc21a, 0xb06bff, 0xff7a2f, 0xff5fb0];
    const pontoIlha = () => p.set(rnd(-MEIA + 1, MEIA - 1), 0, rnd(-MEIA + 1, MEIA - 1));
    for (let i = 0; i < 1300; i++) { pontoIlha(); q.setFromAxisAngle(V3(Math.random() - .5, 0, Math.random() - .5).normalize(), rnd(-.3, .3)); sc.setScalar(rnd(.7, 1.5)); tufos.setMatrixAt(i, m4.compose(p, q, sc)); tufos.setColorAt(i, c.setHSL(rnd(.24, .3), rnd(.5, .7), rnd(.3, .45)).convertSRGBToLinear()); }
    { let cx = 0, cz = 0, cor = 0; for (let i = 0; i < 420; i++) { if (i % 14 === 0) { pontoIlha(); cx = p.x; cz = p.z; cor = coresF[Math.random() * 5 | 0]; } p.set(cx + rnd(-1.1, 1.1), .12, cz + rnd(-1.1, 1.1)); sc.setScalar(rnd(.8, 1.3)); q.identity(); flores.setMatrixAt(i, m4.compose(p, q, sc)); flores.setColorAt(i, c.setHex(Math.random() < .8 ? cor : 0xffffff).convertSRGBToLinear()); } } // flores em canteirinhos
    tufos.receiveShadow = true; scene.add(tufos, flores);
    // sombra das nuvens passando devagar pelo chão
    { const cv = document.createElement('canvas'); cv.width = cv.height = 256; const g2 = cv.getContext('2d');
      for (let i = 0; i < 9; i++) { const x = rnd(20, 236), y = rnd(20, 236), r = rnd(30, 60), gr = g2.createRadialGradient(x, y, 4, x, y, r); gr.addColorStop(0, 'rgba(0,20,0,.55)'); gr.addColorStop(1, 'rgba(0,20,0,0)'); g2.fillStyle = gr; g2.fillRect(0, 0, 256, 256); }
      const tx = new THREE.CanvasTexture(cv); tx.wrapS = tx.wrapT = THREE.RepeatWrapping; tx.repeat.set(2, 2);
      sombraNuvens = new THREE.Mesh(new THREE.PlaneGeometry(2 * MEIA, 2 * MEIA).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({map:tx, transparent:true, opacity:.22, depthWrite:false}));
      sombraNuvens.position.y = .06; sombraNuvens.renderOrder = 1; scene.add(sombraNuvens); }
    // borboletas
    for (let i = 0; i < 7; i++) {
      const g3 = new THREE.Group(), cor = [0xffd84a, 0xff8ac0, 0xffffff, 0x8fd3ff, 0xffa53d][i % 5], m3 = new THREE.MeshBasicMaterial({color:C(cor), side:THREE.DoubleSide});
      const asa = new THREE.PlaneGeometry(.22, .18); asa.translate(.11, 0, 0);
      const a1 = new THREE.Mesh(asa, m3), a2 = new THREE.Mesh(asa, m3); a2.rotation.y = Math.PI; g3.add(a1, a2);
      g3.position.set(rnd(-MEIA + 3, MEIA - 3), rnd(.6, 1.4), rnd(-MEIA + 3, MEIA - 3)); scene.add(g3);
      borboletas.push({g:g3, a1, a2, fase:rnd(0, 6), alvo:g3.position.clone(), vel:rnd(.6, 1)});
    }
    // árvores na borda e palmeiras na praia (juntas numa malha só por material)
    const borda = new THREE.Group();
    for (let i = 0; i < 64; i++) {
      const lado = i % 4, t = rnd(-MEIA + 2, MEIA - 2), o = MEIA - rnd(.3, .9);
      const x = lado === 0 ? t : lado === 1 ? t : lado === 2 ? -o : o, z = lado === 0 ? -o : lado === 1 ? o : t;
      const a = Math.random() < .35 ? pinheiro(rnd(.85, 1.2)) : Math.random() < .25 ? arbusto(rnd(1, 1.3)) : arvore(rnd(.8, 1.1), Math.random() < .2 ? 0xe83b2c : null);
      a.position.set(x, 0, z); borda.add(a);
    }
    for (let i = 0; i < 14; i++) {
      const lado = i % 4, t = rnd(-MEIA, MEIA), o = MEIA + rnd(1.2, 2.2);
      const x = lado < 2 ? t : lado === 2 ? -o : o, z = lado === 0 ? -o : lado === 1 ? o : t;
      const pm = palmeira(rnd(.9, 1.2)); pm.position.set(x, -.2, z); borda.add(pm);
    }
    scene.add(borda); mesclar(borda); congelar(borda);
    // placa com o nome do jogo na entrada da ilha
    { const cv = document.createElement('canvas'); cv.width = 1024; cv.height = 360; const g2 = cv.getContext('2d');
      const desenhar = () => { g2.clearRect(0, 0, 1024, 360);
      g2.fillStyle = '#9a5a24'; g2.strokeStyle = '#4a2a0e'; g2.lineWidth = 18; g2.beginPath(); g2.roundRect ? g2.roundRect(14, 14, 996, 332, 60) : g2.rect(14, 14, 996, 332); g2.fill(); g2.stroke();
      g2.fillStyle = 'rgba(255,255,255,.14)'; g2.fillRect(50, 40, 924, 24); g2.strokeStyle = 'rgba(70,35,10,.35)'; g2.lineWidth = 5; [150, 250].forEach(y => { g2.beginPath(); g2.moveTo(50, y); g2.lineTo(974, y); g2.stroke(); });
      g2.textAlign = 'center'; g2.textBaseline = 'middle'; g2.font = '800 150px "Baloo 2", sans-serif'; g2.lineJoin = 'round';
      g2.lineWidth = 24; g2.strokeStyle = '#5a2d08'; g2.strokeText('Terrália', 512, 140); g2.fillStyle = '#ffd447'; g2.fillText('Terrália', 512, 140);
      g2.font = '800 96px "Baloo 2", sans-serif'; g2.lineWidth = 18; g2.strokeText('FARM', 512, 268); g2.fillStyle = '#fff3c4'; g2.fillText('FARM', 512, 268); };
      desenhar();
      const tx = new THREE.CanvasTexture(cv); tx.encoding = THREE.sRGBEncoding; tx.anisotropy = ANISO;
      const placa = new THREE.Group();
      const pl = new THREE.Mesh(new THREE.PlaneGeometry(3.4, 1.2), new THREE.MeshStandardMaterial({map:tx, transparent:true, roughness:.8})); pl.position.y = 1.55; pl.castShadow = true; placa.add(pl);
      const tras = new THREE.Mesh(new THREE.BoxGeometry(3.3, 1.1, .08), liso(0x6b3d17)); tras.position.set(0, 1.55, -.06); placa.add(tras);
      [-1.25, 1.25].forEach(x => placa.add(cil(.09, .11, 2.1, 0x6b3d17, x, 1.05, -.06, 7)));
      [-1.6, 1.6].forEach(x => { const f = arbusto(.55); f.position.set(x, 0, .15); placa.add(f); });
      placa.position.set(MEIA - .3, -.05, MEIA - .3); placa.rotation.y = Math.PI / 4; placa.scale.setScalar(1.5); scene.add(placa);
      if (document.fonts) document.fonts.ready.then(() => { desenhar(); tx.needsUpdate = true; }); }
  }
  const terras = {}; // decoração + placa das terras bloqueadas
  const clicaveisTerra = [];
  function montarTerras() {
    for (const z of ZONAS) {
      if (S.zonas.includes(z.key)) continue;
      const g = new THREE.Group();
      const qtd = 6 + (Math.random() * 3 | 0), usadas = new Set();
      for (let i = 0; i < qtd; i++) {
        const [cx, cz] = z.cel[Math.random() * z.cel.length | 0]; const k = cx + ',' + cz; if (usadas.has(k)) continue; usadas.add(k);
        const r = Math.random(), o = r < .45 ? arvore(rnd(.8, 1.15), Math.random() < .15 ? 0xf5a623 : null) : r < .6 ? pinheiro(rnd(.9, 1.2)) : r < .75 ? pedra(rnd(1, 1.6)) : r < .88 ? tora(rnd(.8, 1.1)) : arbusto(rnd(.9, 1.3));
        o.position.set(cx * G + rnd(-.4, .4), 0, cz * G + rnd(-.4, .4)); g.add(o);
      }
      for (let i = 0; i < 6; i++) { const [cx, cz] = z.cel[Math.random() * z.cel.length | 0]; const b = arbusto(rnd(.6, .9)); b.position.set(cx * G + rnd(-.8, .8), 0, cz * G + rnd(-.8, .8)); g.add(b); }
      const mx = z.cel.reduce((a, c) => a + c[0], 0) / z.cel.length * G, mz = z.cel.reduce((a, c) => a + c[1], 0) / z.cel.length * G;
      // placa de madeira
      const placa = new THREE.Group();
      placa.add(cil(.07, .08, 1.3, 0x7a4b25, 0, .65, 0, 6));
      placa.add(mesh(new THREE.BoxGeometry(1.2, .7, .08), 0, 0, 1.2, .05, true, liso(0xb07a46)));
      placa.add(bola(.16, 0xf2c230, 0, 1.2, .14, 10));
      placa.position.set(mx, 0, mz); g.add(placa);
      const r = rotulo(`🔒 Nível ${nivelZona()}`, '#6b4a2b'); r.position.set(mx, 2.3, mz); r.scale.multiplyScalar(.62); g.add(r);
      g.userData.rotulo = r; r.visible = false;
      const caixa = new THREE.Mesh(new THREE.BoxGeometry(ZONA * G, .6, ZONA * G), new THREE.MeshBasicMaterial({transparent:true, opacity:0, depthWrite:false}));
      caixa.position.set((z.zx * ZONA - 12 + 2) * G, .3, (z.zz * ZONA - 12 + 2) * G); caixa.userData.zona = z.key; g.add(caixa); clicaveisTerra.push(caixa);
      mesclar(g, new Set([placa])); scene.add(g); terras[z.key] = g; congelar(g);
    }
  }
  function atualizarPlacasTerra() {
    for (const k in terras) {
      const g = terras[k], old = g.userData.rotulo, r = rotulo(`🔒 Nível ${nivelZona()}`, '#6b4a2b');
      r.position.copy(old.position); r.scale.copy(old.scale); r.visible = false; g.remove(old); g.add(r); g.userData.rotulo = r;
    }
  }

  function montarCeu() {
    const geo = new THREE.SphereGeometry(220, 24, 16), cores = [], p = geo.attributes.position, c1 = C(0x5fb6f0), c2 = C(0xd8f1ff), c = new THREE.Color();
    for (let i = 0; i < p.count; i++) { const h = Math.max(0, Math.min(1, p.getY(i) / 140 + .1)); c.copy(c2).lerp(c1, h); cores.push(c.r, c.g, c.b); }
    geo.setAttribute('color', new THREE.Float32BufferAttribute(cores, 3));
    scene.add(new THREE.Mesh(geo, new THREE.MeshBasicMaterial({vertexColors:true, side:THREE.BackSide, fog:false, depthWrite:false})));
  }
  const nuvens = [];
  function montarNuvens() {
    const m = new THREE.MeshStandardMaterial({color:C(0xffffff), roughness:1});
    for (let i = 0; i < 7; i++) {
      const g = new THREE.Group(), k = rnd(3, 6) | 0;
      for (let j = 0; j < k; j++) { const b = new THREE.Mesh(new THREE.IcosahedronGeometry(rnd(1.2, 2.2), 2), m); b.position.set(j * 1.6 - k * .8, rnd(-.3, .5), rnd(-.6, .6)); g.add(b); }
      g.position.set(rnd(-60, 60), rnd(34, 40), rnd(-70, -20)); g.userData.v = rnd(.4, 1);
      scene.add(g); nuvens.push(g);
    }
  }

  // ================= OBJETOS DO MAPA =================
  const obj3D = {};      // id → {g, pick}
  const pickObjs = [];   // caixas de toque das construções
  const tiles = [];      // canteiros (índice = índice em S.plots)
  const geoTile = new THREE.BoxGeometry(G - .28, .3, G - .28);
  const geoSulco = new THREE.BoxGeometry(G - .55, .06, .17);
  const COR_TERRA = 0xa06640, COR_MOLHADA = 0x5f3a23;

  function criarLote(o) {
    const g = new THREE.Group(), W = 2 * G;
    // moldura de madeira
    g.add(chaoPlano(W - .1, W - .1, 0x6b4226, .02));
    [[0, -W / 2 + .08, W, .16], [0, W / 2 - .08, W, .16]].forEach(([x, z, w, d]) => g.add(mesh(new THREE.BoxGeometry(w, .3, d), 0, x, .15, z, true, liso(0x7a4b25))));
    [[-W / 2 + .08, 0], [W / 2 - .08, 0]].forEach(([x, z]) => g.add(mesh(new THREE.BoxGeometry(.16, .3, W - .32), 0, x, .15, z, true, liso(0x7a4b25))));
    [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([a, b]) => g.add(cil(.11, .11, .4, 0x6b4226, a * (W / 2 - .08), .2, b * (W / 2 - .08), 8)));
    for (let k = 0; k < 4; k++) {
      const i = o.li * 4 + k;
      const t = new THREE.Group(); t.position.set((k % 2 - .5) * G, 0, (Math.floor(k / 2) - .5) * G); g.add(t);
      const base = new THREE.Mesh(geoTile, new THREE.MeshStandardMaterial({color:C(COR_TERRA), roughness:.95, envMapIntensity:.3}));
      base.position.y = .1; base.receiveShadow = true; base.userData.i = i; t.add(base);
      const sulcos = new THREE.Group();
      for (let s = -1; s <= 1; s++) { const m = new THREE.Mesh(geoSulco, mat(0x7c4b2c)); m.position.set(0, .27, s * .56); m.receiveShadow = true; sulcos.add(m); }
      t.add(sulcos);
      const planta = new THREE.Group(); planta.position.y = .25; t.add(planta);
      const icone = sprite('✨', .9); icone.position.y = 1.9; icone.visible = false; t.add(icone);
      const marca = new THREE.Mesh(new THREE.RingGeometry(.62, .78, 28).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({color:0xffe066, transparent:true, opacity:.85, depthWrite:false}));
      marca.position.y = .3; marca.visible = false; t.add(marca);
      tiles[i] = {g:t, base, sulcos, planta, icone, marca, chave:'', pop:0};
    }
    return g;
  }
  function criarObjeto3D(o) {
    const T = TIPOS[o.tipo];
    let g;
    if (o.tipo === 'lote') g = criarLote(o);
    else if (o.tipo === 'celeiro') g = modeloCeleiro();
    else if (o.tipo === 'armazem') g = modeloArmazem();
    else if (FABRICAS[o.tipo] && o.tipo !== 'moinho') g = modeloFabrica(o.tipo);
    else if (o.tipo === 'loja') g = modeloLoja();
    else if (o.tipo === 'moinho') g = modeloMoinho();
    else if (o.tipo === 'poco') g = modeloPoco();
    else if (o.tipo === 'lago') g = modeloLago();
    else if (T.fruta) g = modeloArvoreFruta(o);
    else if (o.tipo === 'casinhaPet') g = modeloCasinhaPet();
    else if (T.decor) g = modeloDecor(o.tipo);
    else g = modeloCercado(o.tipo, T.w, T.d);
    if (o.tipo !== 'lote' && o.tipo !== 'lago') { const anim = new Set(); g.traverse(x => { if (fumacas.includes(x) || pasMoinho.includes(x) || fabRodas.includes(x) || x.userData.anim) anim.add(x); }); mesclar(g, anim); }
    let rot = null;
    if (T.fab) g.traverse(x => { if (fumacas.includes(x) || fabRodas.includes(x)) x.userData.tipo = o.tipo; if (pasMoinho.includes(x)) x.userData.oid = o.id; });
    if (T.abre || T.animal || T.fab) { rot = rotulo(T.nome); rot.position.set(0, T.animal ? 2.4 : o.tipo === 'celeiro' ? 5.4 : o.tipo === 'armazem' ? 4.6 : o.tipo === 'moinho' ? 6.4 : 4.3, T.animal ? -T.d * G / 2 + .3 : 0); rot.visible = false; g.add(rot); }
    const ph = o.tipo === 'lote' ? .5 : T.animal ? 1.6 : T.decor ? 1.6 : 4;
    const pick = new THREE.Mesh(new THREE.BoxGeometry(T.w * G - .1, ph, T.d * G - .1), new THREE.MeshBasicMaterial({transparent:true, opacity:0, depthWrite:false}));
    pick.position.y = ph / 2; pick.userData.objId = o.id; g.add(pick); pickObjs.push(pick);
    scene.add(g);
    obj3D[o.id] = {g, pick, rot, ate:0};
    posicionar(o);
  }
  function posicionar(o, levantar) {
    const g = obj3D[o.id].g, c = centro(o);
    g.position.set(c.x, levantar ? .3 : 0, c.z); g.rotation.y = -o.rot * Math.PI / 2;
    g.updateMatrixWorld(true);
  }
  function montarObjetos() { S.objetos.forEach(criarObjeto3D); }
  const objPorId = id => S.objetos.find(o => o.id === id);
  const cercadosDe = k => S.objetos.filter(o => o.tipo === ANIMAIS[k].cercado);
  function limites(o) { const c = centro(o), [W, D] = dims(o); return {x:c.x, z:c.z, hw:W * G / 2 - .9, hd:D * G / 2 - .9}; }

  // ================= PERSONAGENS =================
  function perna(cor, h, r, x, y, z, pe) {
    const piv = new THREE.Group(); piv.position.set(x, y, z);
    piv.add(mesh(new THREE.CylinderGeometry(r, r * .9, h, 10), 0, 0, -h / 2, 0, true, liso(cor)));
    if (pe) piv.add(mesh(new THREE.SphereGeometry(r * 1.25, 10, 8), 0, 0, -h, r * .4, true, liso(pe)));
    return piv;
  }
  function olhos(g, y, z, sep, r = .06) {
    [-1, 1].forEach(s => { g.add(bola(r, 0x1f1a17, s * sep, y, z, 10)); g.add(bola(r * .38, 0xffffff, s * sep + r * .3, y + r * .35, z + r * .75, 6)); });
  }
  // ---------- personagem personalizável ----------
  const AV = {
    cabelos:[['curto', 'Curto'], ['topete', 'Topete'], ['cacheado', 'Cacheado'], ['rabo', 'Rabo de cavalo'], ['trancas', 'Tranças'], ['coque', 'Coque']],
    corCabelo:[0x4a2c1a, 0x1f1a17, 0xe6c15a, 0xb5482a, 0xf28ab8, 0x4a8fe0],
    pele:[0xffe0c4, 0xf5c9a2, 0xd9a273, 0xa86f44, 0x6e4528],
    olhos:[0x5a3a1e, 0x1f1a17, 0x3a7bd5, 0x3f9a4a, 0xb07a2a],
    camisa:[0x7fbdf0, 0xfaf1e4, 0xe2453a, 0x6cc357, 0xffc93c, 0xb08cff],
    macacao:[0x3d6fd1, 0x5b8fd6, 0x8b5a2b, 0x3f8d33, 0xd9534f, 0x4a4a4a],
    chapeus:[['palha', 'Palha'], ['flor', 'Com girassol'], ['bone', 'Boné'], ['nenhum', 'Sem chapéu']],
  };
  const avPadrao = () => ({cabelo:'curto', corCabelo:0, pele:1, olhos:0, camisa:0, macacao:0, chapeu:'palha', bochecha:true, sardas:false, cilios:false});
  function avAleatorio() {
    const r = a => Math.random() * a | 0;
    return {cabelo:AV.cabelos[r(6)][0], corCabelo:r(6), pele:r(5), olhos:r(5), camisa:r(6), macacao:r(6), chapeu:AV.chapeus[r(4)][0], bochecha:Math.random() < .7, sardas:Math.random() < .3, cilios:Math.random() < .5};
  }
  function criarPersonagem(av, velho) {
    av = Object.assign(avPadrao(), av || {});
    const g = new THREE.Group(), corpo = new THREE.Group(); g.add(corpo);
    const pele = velho ? 0xf0c09a : AV.pele[av.pele], camisa = velho ? 0xb5482a : AV.camisa[av.camisa], macacao = velho ? 0x6b4a2b : AV.macacao[av.macacao], bota = 0x8b5a2b;
    const corCabelo = velho ? 0xd8d4cc : AV.corCabelo[av.corCabelo];
    const pE = perna(macacao, .55, .12, -.14, .62, 0, bota), pD = perna(macacao, .55, .12, .14, .62, 0, bota);
    corpo.add(pE, pD);
    corpo.add(mesh(new THREE.CylinderGeometry(velho ? .33 : .3, velho ? .36 : .32, .55, 14), 0, 0, .9, 0, true, liso(camisa)));
    if (velho) { // camisa xadrez + suspensórios + barriguinha
      for (let k = 0; k < 3; k++) { const f = mesh(new THREE.TorusGeometry(.34 - k * .005, .018, 6, 20), 0, 0, .75 + k * .16, 0, false, liso(0x7a2a1c)); f.rotation.x = Math.PI / 2; corpo.add(f); }
      [-.14, .14].forEach(x => corpo.add(mesh(new THREE.BoxGeometry(.06, .55, .05), 0, x, .92, .33, true, liso(0x6b4a2b))));
      corpo.add(bola(.3, camisa, 0, .82, .08, 14));
      corpo.add(mesh(new THREE.CylinderGeometry(.34, .36, .22, 14), 0, 0, .7, 0, true, liso(macacao)));
    } else {
      corpo.add(mesh(new THREE.CylinderGeometry(.31, .33, .38, 14), 0, 0, .8, 0, true, liso(macacao)));
      corpo.add(mesh(new THREE.BoxGeometry(.34, .26, .05), 0, 0, 1.02, .29, true, liso(macacao)));
      [-.13, .13].forEach(x => corpo.add(bola(.035, 0xd8d8d8, x, 1.12, .31, 6)));
    }
    const bE = perna(camisa, .42, .085, -.38, 1.12, 0, pele), bD = perna(camisa, .42, .085, .38, 1.12, 0, pele);
    bE.rotation.z = -.12; bD.rotation.z = .12; corpo.add(bE, bD);
    const cab = new THREE.Group(); cab.position.y = 1.58; corpo.add(cab);
    cab.add(bola(.38, pele, 0, 0, 0, 18));
    // cabelo
    const est = velho ? 'velho' : av.cabelo;
    if (est !== 'velho') { const c = mesh(new THREE.SphereGeometry(.4, 16, 10, 0, Math.PI * 2, 0, Math.PI / 2.1), 0, 0, .02, -.04, true, liso(corCabelo)); c.rotation.x = -.35; cab.add(c); }
    if (est === 'velho') { [-1, 1].forEach(sx => { const t = bola(.16, corCabelo, sx * .3, .02, -.12, 10); t.scale.set(.6, 1, 1.1); cab.add(t); }); cab.add(bola(.3, corCabelo, 0, .02, -.2, 12)); }
    if (est === 'topete') { const t = bola(.17, corCabelo, 0, .32, .2, 12); t.scale.set(1.3, .8, 1); t.rotation.x = -.5; cab.add(t); }
    if (est === 'cacheado') for (let k = 0; k < 16; k++) { const a = k / 16 * Math.PI * 2, y = .1 + (k % 3) * .1; cab.add(bola(.1, corCabelo, Math.cos(a) * .36, y, Math.sin(a) * .34 - .04, 8)); }
    if (est === 'rabo') { cab.add(bola(.12, corCabelo, 0, .1, -.4, 10)); const r = bola(.14, corCabelo, 0, -.22, -.46, 10); r.scale.set(.75, 1.9, .75); cab.add(r); cab.add(bola(.06, 0xe2453a, 0, .02, -.43, 8)); }
    if (est === 'trancas') {
      const atras = bola(.38, corCabelo, 0, -.08, -.12, 16); atras.scale.set(1.05, 1.1, .8); cab.add(atras);
      [-1, 1].forEach(sx => { for (let k = 0; k < 4; k++) cab.add(bola(.1 - k * .01, corCabelo, sx * .3, -.3 - k * .15, -.05, 10)); cab.add(bola(.06, 0xe2453a, sx * .3, -.82, -.05, 8)); });
    }
    if (est === 'coque') { cab.add(bola(.18, corCabelo, 0, .36, -.16, 12)); }
    [-1, 1].forEach(s => cab.add(bola(.08, pele, s * .38, -.02, 0, 8)));
    // olhos com cor
    [-1, 1].forEach(s => {
      cab.add(bola(.062, 0xffffff, s * .13, .02, .335, 10));
      cab.add(bola(.045, velho ? 0x5a3a1e : AV.olhos[av.olhos], s * .13, .02, .37, 10));
      cab.add(bola(.022, 0x111111, s * .13, .02, .395, 8));
      cab.add(bola(.012, 0xffffff, s * .13 + .015, .04, .41, 6));
      if (av.cilios && !velho) { const c = bola(.035, 0x1f1a17, s * .2, .085, .3, 6); c.scale.set(1.6, .4, 1); cab.add(c); }
    });
    if (av.bochecha || velho) [-1, 1].forEach(s => cab.add(bola(.06, 0xffa8a0, s * .22, -.1, .3, 8)));
    if (av.sardas && !velho) [-1, 1].forEach(s => { for (let k = 0; k < 3; k++) cab.add(bola(.012, 0xa0603a, s * (.17 + k * .04), -.04 - (k % 2) * .03, .345, 4)); });
    const boca = mesh(new THREE.TorusGeometry(.06, .015, 6, 10, Math.PI), 0, 0, -.13, .36, false, liso(0x8a3a2a)); boca.rotation.z = Math.PI; cab.add(boca);
    if (velho) { // barba, bigode e óculos
      const barba = bola(.3, corCabelo, 0, -.2, .12, 14); barba.scale.set(1.05, .9, .9); cab.add(barba);
      [-1, 1].forEach(s => { const b = bola(.09, corCabelo, s * .08, -.09, .34, 8); b.scale.set(1.5, .6, .8); cab.add(b); });
      cab.add(bola(.06, 0xf0b090, 0, -.02, .38, 8));
      [-1, 1].forEach(s => { const l = mesh(new THREE.TorusGeometry(.085, .014, 6, 16), 0, s * .13, .02, .39, false, liso(0x3a2a1a)); cab.add(l); });
      cab.add(mesh(new THREE.BoxGeometry(.08, .015, .015), 0, 0, .04, .4, false, liso(0x3a2a1a)));
    }
    // chapéu
    const ch = velho ? 'palha' : av.chapeu;
    if (ch === 'palha' || ch === 'flor') {
      const chapeu = new THREE.Group(); chapeu.position.y = .26; chapeu.rotation.x = -.12; cab.add(chapeu);
      const cor = velho ? 0xc99b54 : 0xe3b46c;
      chapeu.add(mesh(new THREE.CylinderGeometry(.68, .7, .05, 22), 0, 0, 0, 0, true, liso(cor)));
      chapeu.add(mesh(new THREE.CylinderGeometry(.3, .37, .3, 16), 0, 0, .16, 0, true, liso(cor)));
      chapeu.add(mesh(new THREE.CylinderGeometry(.375, .375, .07, 16), 0, 0, .06, 0, false, liso(velho ? 0x5a3a1e : ch === 'flor' ? 0x9b3d5a : 0xb9442f)));
      if (ch === 'flor') {
        const flor = new THREE.Group(); flor.position.set(-.3, .12, .26); flor.rotation.set(-.3, -.5, 0);
        for (let k = 0; k < 10; k++) { const pt = bola(.06, 0xffc928, Math.cos(k / 10 * Math.PI * 2) * .1, Math.sin(k / 10 * Math.PI * 2) * .1, 0, 8); pt.scale.set(1, 1, .4); flor.add(pt); }
        flor.add(bola(.065, 0x6b3f1d, 0, 0, .02, 10)); chapeu.add(flor);
      }
    }
    if (ch === 'bone') {
      const b = mesh(new THREE.SphereGeometry(.41, 16, 10, 0, Math.PI * 2, 0, Math.PI / 2), 0, 0, .06, -.02, true, liso(camisa)); b.rotation.x = -.15; cab.add(b);
      const aba = mesh(new THREE.CylinderGeometry(.26, .26, .03, 16, 1, false, -Math.PI / 2, Math.PI), 0, 0, .1, .3, true, liso(camisa)); aba.rotation.x = -.1; cab.add(aba);
      cab.add(bola(.04, 0xffffff, 0, .47, -.04, 6));
    }
    // objetos na mão
    const mao = new THREE.Group(); mao.position.set(0, -.46, .05); mao.scale.setScalar(1.6); bD.add(mao);
    const saco = new THREE.Group();
    const sc = bola(.17, 0xe2b06c, 0, -.12, 0, 12); sc.scale.set(1, 1.15, .85); saco.add(sc);
    saco.add(mesh(new THREE.ConeGeometry(.1, .14, 8), 0, 0, .06, 0, true, liso(0xcf9853)));
    const fita = mesh(new THREE.TorusGeometry(.08, .02, 6, 12), 0, 0, .02, 0, false, liso(0xc0392b)); fita.rotation.x = Math.PI / 2; saco.add(fita);
    saco.visible = false; mao.add(saco);
    const regador = new THREE.Group();
    regador.add(mesh(new THREE.CylinderGeometry(.15, .17, .3, 12), 0, 0, -.15, 0, true, liso(0x5bb3ea)));
    const bico = mesh(new THREE.CylinderGeometry(.025, .04, .38, 8), 0, 0, -.1, .25, true, liso(0x4a9fd6)); bico.rotation.x = 1.0; regador.add(bico);
    regador.add(mesh(new THREE.TorusGeometry(.1, .025, 6, 12, Math.PI), 0, 0, 0, -.02, true, liso(0x2f7fb8)));
    regador.visible = false; mao.add(regador);
    g.add(sombraBlob(.55));
    g.scale.setScalar(.9);
    g.userData = {corpo, pE, pD, bE, bD, cab, saco, regador, fase:0};
    return g;
  }
  const criarFazendeiro = () => criarPersonagem(S.perfil && S.perfil.avatar);

  // retratos (foto de perfil) e prévia do editor: um renderizador pequeno separado
  const mini = (() => {
    const r = new THREE.WebGLRenderer({antialias:true, alpha:true, preserveDrawingBuffer:true});
    r.setSize(220, 220); r.setPixelRatio(1); r.outputEncoding = THREE.sRGBEncoding; r.toneMapping = THREE.ACESFilmicToneMapping; r.toneMappingExposure = .95;
    const cena = new THREE.Scene();
    cena.add(new THREE.HemisphereLight(C(0xffffff), C(0x88aa77), .9));
    const l = new THREE.DirectionalLight(C(0xfff0d8), 1.6); l.position.set(2, 3, 4); cena.add(l);
    const cam = new THREE.PerspectiveCamera(30, 1, .1, 50);
    return {r, cena, cam, modelo:null};
  })();
  function retrato(av, velho) {
    if (mini.modelo) mini.cena.remove(mini.modelo);
    const m = criarPersonagem(av, velho); mini.cena.add(m);
    mini.cam.position.set(0, 1.5, 2.6); mini.cam.lookAt(0, 1.38, 0);
    mini.r.setClearColor(velho ? 0xffe9b8 : 0xcfeeff, 1); mini.r.render(mini.cena, mini.cam);
    const url = mini.r.domElement.toDataURL('image/png'); mini.cena.remove(m);
    if (mini.modelo) mini.cena.add(mini.modelo);
    return url;
  }
  function previaAvatar(av) {
    if (mini.modelo) mini.cena.remove(mini.modelo);
    mini.modelo = criarPersonagem(av); mini.cena.add(mini.modelo);
  }
  function renderPrevia(t) {
    if (!mini.modelo) return;
    mini.modelo.rotation.y = Math.sin(t * .8) * .6;
    mini.cam.position.set(0, 1.35, 4.3); mini.cam.lookAt(0, 1.02, 0);
    mini.r.setClearColor(0x000000, 0); mini.r.render(mini.cena, mini.cam);
  }

  // Tonho: o fazendeiro experiente que ensina o jogo
  let tonho = null;
  function montarTonho() {
    tonho = criarPersonagem(null, true); scene.add(tonho);
    tonho.userData.dica = sprite('💬', .8); tonho.userData.dica.position.y = 2.6; tonho.add(tonho.userData.dica);
    posicionarTonho();
  }
  function posicionarTonho() {
    const lj = S.objetos.find(o => o.tipo === 'loja'); if (!lj || !tonho) return;
    const c = centro(lj), [W, D] = dims(lj); tonho.position.set(c.x - W * G / 2 - .4, 0, c.z + D * G / 2 - .3); tonho.rotation.y = .6;
  }

  function criarCachorro() {
    const g = new THREE.Group(), corpo = new THREE.Group(); g.add(corpo);
    const pelo = 0xd99a5b, branco = 0xfbf3e6, orelha = 0x8e5a32;
    const tronco = bola(.3, pelo, 0, .45, 0, 16); tronco.scale.set(.95, .85, 1.3); corpo.add(tronco);
    const barriga = bola(.24, branco, 0, .4, .12, 12); barriga.scale.set(.9, .8, 1.1); corpo.add(barriga);
    const pernas = [[-.15, .28], [.15, .28], [-.15, -.25], [.15, -.25]].map(([x, z]) => { const p = perna(branco, .26, .07, x, .32, z); corpo.add(p); return p; });
    const cab = new THREE.Group(); cab.position.set(0, .82, .32); corpo.add(cab);
    cab.add(bola(.3, pelo, 0, 0, 0, 16));
    cab.add(bola(.2, branco, 0, -.04, .14, 12));
    const focinho = bola(.13, branco, 0, -.08, .27, 10); focinho.scale.set(1.1, .8, 1); cab.add(focinho);
    cab.add(bola(.055, 0x1f1a17, 0, -.03, .38, 8));
    olhos(cab, .06, .25, .12, .055);
    [-1, 1].forEach(s => { const o = bola(.13, orelha, s * .27, -.06, -.02, 10); o.scale.set(.55, 1.3, .8); o.rotation.z = s * .35; cab.add(o); });
    const laco = new THREE.Group(); laco.position.set(0, .66, .38); corpo.add(laco);
    [-1, 1].forEach(s => { const c = mesh(new THREE.ConeGeometry(.08, .16, 8), 0, s * .08, 0, 0, true, liso(0xe2372b)); c.rotation.z = s * Math.PI / 2; laco.add(c); });
    laco.add(bola(.04, 0xe2372b, 0, 0, 0, 8));
    const cauda = new THREE.Group(); cauda.position.set(0, .55, -.38); corpo.add(cauda);
    const cc = mesh(new THREE.ConeGeometry(.07, .35, 8), 0, 0, .15, -.05, true, liso(pelo)); cc.rotation.x = -.6; cauda.add(cc);
    g.add(sombraBlob(.5));
    g.userData = {corpo, pernas, cauda, cab, fase:0};
    return g;
  }
  function criarRaposa() {
    const g = new THREE.Group(), corpo = new THREE.Group(); g.add(corpo);
    const lar = 0xf39a4a, br = 0xfdf4ea, az = 0x9fdcf7;
    const tronco = bola(.24, lar, 0, 0, 0, 14); tronco.scale.set(.9, .9, 1.25); corpo.add(tronco);
    corpo.add(bola(.17, br, 0, -.02, .15, 10));
    const cab = new THREE.Group(); cab.position.set(0, .3, .22); corpo.add(cab);
    cab.add(bola(.24, lar, 0, 0, 0, 16));
    const bochecha = bola(.16, br, 0, -.07, .1, 12); bochecha.scale.set(1.3, .8, 1); cab.add(bochecha);
    cab.add(bola(.04, 0x3a2418, 0, -.04, .27, 6));
    olhos(cab, .04, .2, .1, .055);
    [-1, 1].forEach(s => {
      const o = mesh(new THREE.ConeGeometry(.12, .42, 10), 0, s * .15, .3, -.02, true, liso(lar)); o.rotation.z = -s * .3; cab.add(o);
      const p = mesh(new THREE.ConeGeometry(.055, .14, 8), 0, s * .23, .48, -.02, false, liso(az)); p.rotation.z = -s * .3; cab.add(p);
    });
    const cauda = new THREE.Group(); cauda.position.set(0, .05, -.25); corpo.add(cauda);
    const c1 = bola(.16, lar, 0, .1, -.2, 12); c1.scale.set(1, 1, 2); c1.rotation.x = .6; cauda.add(c1);
    cauda.add(bola(.13, az, 0, .3, -.45, 10));
    const aura = new THREE.Mesh(new THREE.SphereGeometry(.55, 16, 12), new THREE.MeshBasicMaterial({color:C(0xbfe9ff), transparent:true, opacity:.18, depthWrite:false}));
    g.add(aura);
    g.userData = {corpo, cauda, cab, aura, fase:0};
    return g;
  }
  function criarGato() {
    const g = new THREE.Group(), corpo = new THREE.Group(); g.add(corpo);
    const pelo = [0xf2a65a, 0x9a9a9a, 0x2f2a28][Math.random() * 3 | 0], br = 0xfaf3ea;
    const tronco = bola(.24, pelo, 0, .36, 0, 14); tronco.scale.set(.85, .8, 1.35); corpo.add(tronco);
    const pernas = [[-.11, .2], [.11, .2], [-.11, -.2], [.11, -.2]].map(([x, z]) => { const p = perna(br, .22, .05, x, .26, z); corpo.add(p); return p; });
    const cab = new THREE.Group(); cab.position.set(0, .62, .3); corpo.add(cab); cab.add(bola(.22, pelo, 0, 0, 0, 14));
    const fo = bola(.12, br, 0, -.06, .14, 10); fo.scale.set(1.2, .8, .8); cab.add(fo); cab.add(bola(.03, 0xf28ab8, 0, -.03, .22, 6));
    [-1, 1].forEach(k => { const o = mesh(new THREE.ConeGeometry(.08, .17, 4), 0, k * .12, .2, -.02, true, liso(pelo)); o.rotation.z = -k * .25; cab.add(o); });
    olhos(cab, .05, .18, .085, .045);
    const cauda = new THREE.Group(); cauda.position.set(0, .45, -.32); corpo.add(cauda); const cc = cil(.035, .03, .5, pelo, 0, .2, -.1, 6); cc.rotation.x = -.5; cauda.add(cc);
    g.add(sombraBlob(.4)); g.userData = {corpo, pernas, cauda, cab, fase:0};
    return g;
  }
  function criarPapagaio() {
    const g = new THREE.Group(), corpo = new THREE.Group(); g.add(corpo);
    const b = bola(.17, 0x3fb04a, 0, 0, 0, 12); b.scale.set(.85, 1.1, 1); corpo.add(b);
    corpo.add(bola(.1, 0xffd23f, 0, -.04, .1, 8));
    const cab = new THREE.Group(); cab.position.set(0, .2, .06); corpo.add(cab); cab.add(bola(.13, 0xe2352a, 0, 0, 0, 12));
    const bico = mesh(new THREE.ConeGeometry(.05, .12, 6), 0, 0, -.02, .14, true, liso(0x2f2a28)); bico.rotation.x = 1.9; cab.add(bico);
    olhos(cab, .03, .1, .07, .03);
    const asas = [-1, 1].map(k => { const a = bola(.12, 0x2f7fd8, k * .15, 0, -.02, 8); a.scale.set(.4, 1, .8); corpo.add(a); return a; });
    const cauda = new THREE.Group(); cauda.position.set(0, -.15, -.12); corpo.add(cauda); const cc = mesh(new THREE.BoxGeometry(.08, .3, .03), 0, 0, -.1, -.05, true, liso(0x2f7fd8)); cc.rotation.x = .5; cauda.add(cc);
    g.userData = {corpo, cauda, cab, asas, fase:0};
    return g;
  }
  function criarVaca() {
    const g = new THREE.Group(), corpo = new THREE.Group(); g.add(corpo);
    const branco = 0xfaf6ee, preto = 0x2a2524, rosa = 0xf6b2b0;
    const tronco = bola(.55, branco, 0, .85, 0, 18); tronco.scale.set(1, .85, 1.35); corpo.add(tronco);
    [[.35, 1.05, .2, .2], [-.4, .9, -.3, .22], [.1, 1.25, -.45, .18], [-.3, 1.2, .35, .14]].forEach(([x, y, z, r]) => { const m = bola(r, preto, x, y, z, 10); m.scale.set(1, .5, 1); m.lookAt(0, .85, 0); corpo.add(m); });
    const pernas = [[-.3, .45], [.3, .45], [-.3, -.45], [.3, -.45]].map(([x, z]) => { const p = perna(branco, .48, .11, x, .55, z, preto); corpo.add(p); return p; });
    const cab = new THREE.Group(); cab.position.set(0, 1.35, .75); corpo.add(cab);
    cab.add(bola(.42, branco, 0, 0, 0, 18));
    cab.add(bola(.12, preto, 0, .38, -.05, 8));
    const fu = bola(.24, rosa, 0, -.15, .3, 14); fu.scale.set(1.25, .85, .8); cab.add(fu);
    [-1, 1].forEach(s => cab.add(bola(.035, 0x8a4a4a, s * .09, -.13, .5, 6)));
    olhos(cab, .1, .36, .17, .075);
    [-1, 1].forEach(s => cab.add(bola(.07, 0xff9a9a, s * .27, -.08, .3, 8)));
    [-1, 1].forEach(s => { const o = bola(.13, preto, s * .45, .12, -.05, 10); o.scale.set(1.4, .6, .8); cab.add(o);
      const ch = mesh(new THREE.ConeGeometry(.06, .2, 8), 0, s * .22, .42, 0, true, liso(0xe2b77a)); ch.rotation.z = -s * .4; cab.add(ch); });
    corpo.add(bola(.08, 0xf2c230, 0, 1.0, .82, 10));
    const cauda = new THREE.Group(); cauda.position.set(0, 1.05, -.72); corpo.add(cauda);
    cauda.add(mesh(new THREE.CylinderGeometry(.025, .025, .5, 6), 0, 0, -.25, 0, true, liso(branco)));
    cauda.add(bola(.06, preto, 0, -.52, 0, 6));
    g.add(sombraBlob(.85));
    g.scale.setScalar(.95);
    g.userData = {corpo, pernas, cauda, cab, fase:0, vel:.9};
    return g;
  }
  function criarGalinha() {
    const g = new THREE.Group(), corpo = new THREE.Group(); g.add(corpo);
    const tronco = bola(.26, 0xfdfbf5, 0, .38, 0, 14); tronco.scale.set(.9, .95, 1.15); corpo.add(tronco);
    [-1, 1].forEach(s => { const a = bola(.14, 0xf1ece2, s * .22, .38, -.02, 10); a.scale.set(.4, .8, 1.1); corpo.add(a); });
    const cauda = new THREE.Group(); cauda.position.set(0, .48, -.25); corpo.add(cauda);
    const cc = bola(.12, 0xf1ece2, 0, .05, 0, 8); cc.scale.set(.6, 1.2, .8); cauda.add(cc);
    const cab = new THREE.Group(); cab.position.set(0, .68, .16); corpo.add(cab);
    cab.add(bola(.15, 0xfdfbf5, 0, 0, 0, 12));
    const bico = mesh(new THREE.ConeGeometry(.05, .12, 6), 0, 0, -.02, .16, true, liso(0xf5a623)); bico.rotation.x = Math.PI / 2; cab.add(bico);
    [-.04, .04].forEach((z, i) => cab.add(bola(.05, 0xe2372b, 0, .14 - i * .01, z, 8)));
    cab.add(bola(.035, 0xe2372b, 0, -.1, .12, 6));
    olhos(cab, .03, .12, .08, .03);
    const pernas = [-.08, .08].map(x => { const p = perna(0xf5a623, .18, .022, x, .2, 0); corpo.add(p); return p; });
    g.add(sombraBlob(.35));
    g.scale.setScalar(.85);
    g.userData = {corpo, pernas, cauda, cab, fase:0, vel:1.1, bica:true};
    return g;
  }
  function criarOvelha() {
    const g = new THREE.Group(), corpo = new THREE.Group(); g.add(corpo);
    const la = 0xfbf8f1, rosto = 0x3a302c;
    [[0, .75, 0, .42], [.25, .85, .2, .3], [-.25, .85, .2, .3], [.25, .85, -.25, .3], [-.25, .85, -.25, .3], [0, 1.0, 0, .32], [0, .8, -.4, .28]]
      .forEach(([x, y, z, r]) => corpo.add(mesh(new THREE.IcosahedronGeometry(r, 1), 0, x, y, z, true, liso(la))));
    const pernas = [[-.2, .25], [.2, .25], [-.2, -.25], [.2, -.25]].map(([x, z]) => { const p = perna(rosto, .45, .06, x, .48, z); corpo.add(p); return p; });
    const cab = new THREE.Group(); cab.position.set(0, .95, .48); corpo.add(cab);
    const ca = bola(.2, rosto, 0, 0, .05, 12); ca.scale.set(.85, 1, 1.1); cab.add(ca);
    cab.add(mesh(new THREE.IcosahedronGeometry(.17, 1), 0, 0, .16, -.02, true, liso(la)));
    [-1, 1].forEach(s => { const o = bola(.07, rosto, s * .2, .02, 0, 8); o.scale.set(1.6, .6, .8); cab.add(o); });
    olhos(cab, .04, .2, .08, .04);
    const cauda = new THREE.Group(); cauda.position.set(0, .85, -.55); corpo.add(cauda);
    cauda.add(bola(.1, la, 0, 0, 0, 8));
    g.add(sombraBlob(.6));
    g.userData = {corpo, pernas, cauda, cab, fase:0, vel:.8};
    return g;
  }

  function criarPato() {
    const g = new THREE.Group(), corpo = new THREE.Group(); g.add(corpo);
    const cor = Math.random() < .5 ? 0xffffff : 0xf7e9b0, lar = 0xff9a1f;
    const b = bola(.26, cor, 0, .32, 0, 14); b.scale.set(.85, .8, 1.25); corpo.add(b);
    const pernas = [-.08, .08].map(x => { const p = perna(lar, .16, .03, x, .16, 0); corpo.add(p); return p; });
    const cab = new THREE.Group(); cab.position.set(0, .58, .2); corpo.add(cab); cab.add(bola(.15, cor, 0, 0, 0, 12));
    const bico = mesh(new THREE.BoxGeometry(.14, .05, .16), 0, 0, -.03, .16, true, liso(lar)); cab.add(bico);
    olhos(cab, .04, .11, .08, .03);
    const cauda = new THREE.Group(); cauda.position.set(0, .4, -.3); corpo.add(cauda); const ca = mesh(new THREE.ConeGeometry(.08, .16, 5), 0, 0, 0, 0, true, liso(cor)); ca.rotation.x = -1.2; cauda.add(ca);
    g.add(sombraBlob(.35)); g.userData = {corpo, pernas, cauda, cab, fase:0, vel:.9, bica:true};
    return g;
  }
  function criarPorco() {
    const g = new THREE.Group(), corpo = new THREE.Group(); g.add(corpo);
    const rosa = 0xf7a8b0, escuro = 0xd97f8a;
    const b = bola(.45, rosa, 0, .55, 0, 16); b.scale.set(.95, .85, 1.3); corpo.add(b);
    const pernas = [[-.2, .3], [.2, .3], [-.2, -.3], [.2, -.3]].map(([x, z]) => { const p = perna(rosa, .3, .07, x, .3, z, escuro); corpo.add(p); return p; });
    const cab = new THREE.Group(); cab.position.set(0, .7, .55); corpo.add(cab); cab.add(bola(.3, rosa, 0, 0, 0, 14));
    const fo = cil(.12, .13, .1, escuro, 0, -.04, .28, 12); fo.rotation.x = Math.PI / 2; cab.add(fo);
    [-1, 1].forEach(k => { const o = mesh(new THREE.ConeGeometry(.1, .18, 4), 0, k * .17, .25, -.02, true, liso(escuro)); o.rotation.z = -k * .4; cab.add(o); });
    olhos(cab, .08, .24, .12, .04);
    const cauda = new THREE.Group(); cauda.position.set(0, .7, -.6); corpo.add(cauda); cauda.add(mesh(new THREE.TorusGeometry(.06, .02, 6, 12, 5), 0, 0, 0, 0, false, liso(escuro)));
    g.add(sombraBlob(.6)); g.userData = {corpo, pernas, cauda, cab, fase:0, vel:.6};
    return g;
  }
  function criarAbelha() {
    const g = new THREE.Group(), corpo = new THREE.Group(); corpo.position.y = 1.1; g.add(corpo);
    const b = bola(.13, 0xffc21a, 0, 0, 0, 10); b.scale.set(.9, .9, 1.3); corpo.add(b);
    [-.05, .06].forEach(z => { const f = cil(.123, .123, .04, 0x2a2524, 0, 0, z, 10); f.rotation.x = Math.PI / 2; corpo.add(f); });
    const cab = new THREE.Group(); cab.position.set(0, .02, .17); corpo.add(cab); cab.add(bola(.08, 0x2a2524, 0, 0, 0, 8));
    const asas = [-1, 1].map(k => { const a = bola(.09, 0xdff4ff, k * .1, .12, 0, 8); a.scale.set(1, .25, .7); a.material = new THREE.MeshStandardMaterial({color:0xeefaff, transparent:true, opacity:.7}); corpo.add(a); return a; });
    const cauda = new THREE.Group(); cauda.position.set(0, 0, -.18); corpo.add(cauda);
    g.add(sombraBlob(.15)); g.userData = {corpo, pernas:[], cauda, cab, fase:0, vel:1.4, voa:true, asas};
    return g;
  }
  function criarCoelho() {
    const g = new THREE.Group(), corpo = new THREE.Group(); g.add(corpo);
    const cor = [0xf7f3ee, 0xd8b48c, 0xb9b4b0][Math.random() * 3 | 0], rosa = 0xffa9c0;
    const b = bola(.3, cor, 0, .32, -.05, 14); b.scale.set(.9, .85, 1.15); corpo.add(b);
    const pernas = [[-.13, .18], [.13, .18], [-.15, -.2], [.15, -.2]].map(([x, z]) => { const p = perna(cor, .14, .05, x, .14, z); corpo.add(p); return p; });
    const cab = new THREE.Group(); cab.position.set(0, .55, .24); corpo.add(cab);
    cab.add(bola(.2, cor, 0, 0, 0, 14));
    [-1, 1].forEach(s => { const o = bola(.07, cor, s * .08, .3, -.03, 10); o.scale.set(.7, 2.6, .5); o.rotation.z = -s * .15; cab.add(o);
      const oi = bola(.045, rosa, s * .08, .3, .01, 8); oi.scale.set(.6, 2.4, .3); oi.rotation.z = -s * .15; cab.add(oi); });
    cab.add(bola(.035, rosa, 0, -.02, .19, 8));
    olhos(cab, .05, .16, .09, .035);
    const cauda = new THREE.Group(); cauda.position.set(0, .35, -.38); corpo.add(cauda); cauda.add(bola(.1, 0xffffff, 0, 0, 0, 8));
    g.add(sombraBlob(.4));
    g.userData = {corpo, pernas, cauda, cab, fase:0, vel:1.1, pula:true};
    return g;
  }

  const heroi = {g:null, rota:[], acao:null, pulo:0, fila:[], atual:null};
  const pets = {};
  function montarPersonagens() {
    heroi.g = criarFazendeiro(); heroi.g.position.set(0, 0, 2 * G); heroi.g.rotation.y = Math.PI; scene.add(heroi.g);
    atualizarPets3D(); atualizarAnimais3D();
  }
  function atualizarPets3D() {
    for (const k in PETS) {
      if (S.amigos[k] && !pets[k]) {
        const g = ({cachorro:criarCachorro, raposa:criarRaposa, gato:criarGato, papagaio:criarPapagaio}[k])();
        g.position.copy(heroi.g.position).add(V3(rnd(-1.5, 1.5), 0, rnd(.5, 1.5))); scene.add(g);
        pets[k] = {g, modo:'parado', alvo:g.position.clone(), timer:rnd(1, 3), zzz:null};
        colocarRotuloPet(k);
      }
      if (!S.amigos[k] && pets[k]) { scene.remove(pets[k].g); if (pets[k].zzz) scene.remove(pets[k].zzz); delete pets[k]; }
    }

  }
  // cachorro: avisa plantas prontas e de vez em quando cava um presente
  let latidoT = 0, cavarT = Date.now() + 60000;
  function cachorroAjuda() {
    const p = pets.cachorro; if (!p) return false;
    const prontas = S.plots.some(pronto);
    if (!p.alerta) { p.alerta = sprite('❗', .7); p.g.add(p.alerta); p.alerta.position.y = 1.9; }
    p.alerta.visible = prontas;
    if (prontas && Date.now() - latidoT > 45000) { latidoT = Date.now(); flutuar(p.g.position.clone().add(V3(0, 1.6, 0)), '🐶 Au au!'); }
    if (Date.now() > cavarT && p.modo !== 'seguir') {
      cavarT = Date.now() + rnd(90, 180) * 1000;
      p.modo = 'cavar'; p.timer = 2.5;
      poeiraEm(p.g.position, 0x8a5a33);
      const cs = CROPS.filter(c => c.nivel <= S.nivel);
      if (Math.random() < .55 || usoCeleiro() >= capCeleiro()) { const m = 5 + (Math.random() * 5 * S.nivel | 0); S.moedas += m; flutuar(p.g.position.clone().add(V3(0, 1.4, 0)), `+${m} 🪙`); }
      else { const c = cs[Math.random() * cs.length | 0]; S.sementes[c.id] = (S.sementes[c.id] || 0) + 1; flutuar(p.g.position.clone().add(V3(0, 1.4, 0)), `+1 ${c.emoji} semente`); }
      return true;
    }
    return false;
  }
  function colocarRotuloPet(k) {
    const p = pets[k]; if (!p) return;
    if (p.rot) p.g.remove(p.rot);
    p.rot = rotulo(nomePet(k), '#3f8d33'); p.rot.scale.multiplyScalar(.55); p.rot.position.y = ({cachorro:1.35, gato:1.05}[k] || .85); p.rot.visible = false; p.g.add(p.rot);
  }
  function atualizarRotulosPets() { for (const k in pets) colocarRotuloPet(k); }
  const rebanho = {galinha:[], vaca:[], ovelha:[], coelho:[], pato:[], porco:[], abelha:[]};
  function cercadoDoAnimal(k, j) { const cs = cercadosDe(k); return cs[Math.min(cs.length - 1, Math.floor(j / ANIMAIS[k].porCercado))]; }
  function pontoNoCercado(o) { const L = limites(o); return V3(L.x + rnd(-L.hw, L.hw), 0, L.z + rnd(-L.hd, L.hd)); }
  function atualizarAnimais3D(reposicionar) {
    for (const k in ANIMAIS) {
      const lista = rebanho[k];
      while (lista.length < qtdAnimal(k)) {
        const g = ({galinha:criarGalinha, vaca:criarVaca, coelho:criarCoelho, ovelha:criarOvelha, pato:criarPato, porco:criarPorco, abelha:criarAbelha}[k] || criarGalinha)();
        const o = cercadoDoAnimal(k, lista.length); if (!o) break;
        g.position.copy(pontoNoCercado(o)); g.rotation.y = rnd(0, 6); scene.add(g);
        lista.push({g, alvo:g.position.clone(), espera:rnd(0, 3)});
      }
      while (lista.length > qtdAnimal(k)) scene.remove(lista.pop().g);
      if (reposicionar) lista.forEach((a, j) => { const o = cercadoDoAnimal(k, j); if (o) { a.g.position.copy(pontoNoCercado(o)); a.alvo.copy(a.g.position); } });
    }
  }

  function dentroDe(p, o, folga = 0) { const c = centro(o), [W, D] = dims(o); return Math.abs(p.x - c.x) < W * G / 2 + folga && Math.abs(p.z - c.z) < D * G / 2 + folga; }
  function ajustarDestino(p) {
    p.x = Math.max(-MEIA + 1, Math.min(MEIA - 1, p.x)); p.z = Math.max(-MEIA + 1, Math.min(MEIA - 1, p.z));
    for (const o of S.objetos) {
      if (!TIPOS[o.tipo].obst || !dentroDe(p, o, .3)) continue;
      const c = centro(o), [W, D] = dims(o), hw = W * G / 2 + .4, hd = D * G / 2 + .4, dx = p.x - c.x, dz = p.z - c.z;
      if (hw - Math.abs(dx) < hd - Math.abs(dz)) p.x = c.x + Math.sign(dx || 1) * hw; else p.z = c.z + Math.sign(dz || 1) * hd;
    }
    p.y = 0; return p;
  }
  function irPara(dest) { heroi.rota = [ajustarDestino(dest.clone())]; }
  function andar(obj, alvo, vel, dt) {
    const p = obj.position, dx = alvo.x - p.x, dz = alvo.z - p.z, d = Math.hypot(dx, dz);
    if (d < .06) return false;
    const passo = Math.min(d, vel * dt);
    p.x += dx / d * passo; p.z += dz / d * passo;
    let diff = Math.atan2(dx, dz) - obj.rotation.y; diff = Math.atan2(Math.sin(diff), Math.cos(diff));
    obj.rotation.y += diff * Math.min(1, dt * 12);
    return true;
  }
  function pontoLivre() {
    const ocup = ocupacao(null);
    for (let i = 0; i < 40; i++) {
      const z = ZONAS[Math.random() * ZONAS.length | 0]; if (!S.zonas.includes(z.key)) continue;
      const [cx, cz] = z.cel[Math.random() * z.cel.length | 0];
      if (!ocup.has(cx + ',' + cz)) return V3(cx * G + rnd(-.6, .6), 0, cz * G + rnd(-.6, .6));
    }
    return V3(rnd(-2, 2), 0, 2 * G);
  }
  function animarPernas(u, dt, vel, amp) {
    u.fase += dt * vel;
    u.pernas.forEach((p, i) => p.rotation.x = Math.sin(u.fase + (i % 2 ? Math.PI : 0) + (i > 1 ? Math.PI / 2 : 0)) * amp);
  }
  function animarPersonagens(dt, t) {
    const h = heroi.g, u = h.userData;
    let anda = false;
    processarFila(dt);
    while (heroi.rota.length) { if (andar(h, heroi.rota[0], velHeroi(), dt)) { anda = true; break; } heroi.rota.shift(); }
    if (anda) {
      u.fase += dt * 11; const s = Math.sin(u.fase);
      u.pE.rotation.x = s * .7; u.pD.rotation.x = -s * .7; u.bE.rotation.x = -s * .6;
      if (!heroi.acao) u.bD.rotation.x = s * .6;
      u.corpo.position.y = Math.abs(Math.cos(u.fase)) * .06;
    } else {
      ['pE', 'pD', 'bE'].forEach(k => u[k].rotation.x *= .8);
      if (!heroi.acao) u.bD.rotation.x *= .8;
      u.corpo.position.y = Math.sin(t * 2) * .015;
    }
    if (heroi.acao) {
      const ac = heroi.acao; ac.t -= dt;
      u.saco.visible = ac.tipo === 'plantar'; u.regador.visible = ac.tipo === 'regar';
      const agacha = ac.tipo !== 'regar' && !anda;
      u.corpo.position.y = agacha ? -.2 : u.corpo.position.y; u.corpo.rotation.x = agacha ? .35 : 0;
      if (ac.tipo === 'regar') { u.bD.rotation.x = -1.2 + Math.sin(t * 6) * .12; u.regador.rotation.x = .7; }
      else if (ac.tipo === 'plantar') { u.bD.rotation.x = -.9 + Math.sin(t * 12) * .35; u.bE.rotation.x = -.5; }
      else { u.bD.rotation.x = -1.3 + Math.abs(Math.sin(t * 10)) * .9; u.bE.rotation.x = -1.3 + Math.abs(Math.cos(t * 10)) * .9; }
      if (ac.t <= 0) { heroi.acao = null; u.saco.visible = u.regador.visible = false; u.corpo.rotation.x = 0; }
    }
    if (heroi.pulo > 0) { heroi.pulo = Math.max(0, heroi.pulo - dt * 3); u.corpo.position.y += Math.sin(heroi.pulo * Math.PI) * .3; }

    for (const k in pets) {
      const p = pets[k], g = p.g, gu = g.userData, voa = k === 'raposa' || k === 'papagaio';
      let mov = false;
      if (S.seguir) {
        p.modo = 'seguir';
        const off = ({cachorro:V3(-.9, 0, -.7), raposa:V3(.9, 0, -.7), gato:V3(-.5, 0, -1.3), papagaio:V3(.5, 0, -1.3)}[k] || V3(0, 0, -1)).clone();
        const atras = off.applyAxisAngle(V3(0, 1, 0), h.rotation.y).add(h.position);
        const dist = Math.hypot(atras.x - g.position.x, atras.z - g.position.z);
        mov = dist > .35 && andar(g, atras, dist > 3 ? 7.5 : 5, dt);
      } else {
        if (p.modo === 'seguir') { p.modo = 'parado'; p.timer = rnd(1, 3); }
        p.timer -= dt;
        if (p.modo === 'andar') { mov = andar(g, p.alvo, voa ? 2.4 : 2.8, dt); if (!mov) { p.modo = 'parado'; p.timer = rnd(2, 5); } }
        else if (p.timer <= 0) {
          const r = Math.random();
          if (r < .6) { p.modo = 'andar'; const casa = S.objetos.find(o => o.tipo === 'casinhaPet'); p.alvo = casa && Math.random() < .5 ? centro(casa).add(V3(rnd(-1.6, 1.6), 0, rnd(1, 1.8))) : pontoLivre(); }
          else if (r < .82 || voa) { p.modo = 'sentar'; p.timer = rnd(4, 8); }
          else { p.modo = 'dormir'; p.timer = rnd(8, 14); }
        }
      }
      const alvoRotX = p.modo === 'sentar' && !voa ? -.35 : p.modo === 'cavar' ? .45 + Math.sin(t * 20) * .08 : 0, alvoRotZ = p.modo === 'dormir' ? 1.25 : 0, alvoY = p.modo === 'dormir' ? -.12 : 0;
      gu.corpo.rotation.x += (alvoRotX - gu.corpo.rotation.x) * Math.min(1, dt * 6);
      gu.corpo.rotation.z += (alvoRotZ - gu.corpo.rotation.z) * Math.min(1, dt * 4);
      if (!voa) {
        if (mov) { animarPernas(gu, dt, 16, .7); gu.corpo.position.y = Math.abs(Math.sin(gu.fase)) * .05; }
        else { gu.pernas.forEach(q => q.rotation.x *= .8); gu.corpo.position.y += (alvoY - gu.corpo.position.y) * .1; gu.cab.rotation.z = p.modo === 'sentar' ? Math.sin(t * 1.3) * .15 : 0; }
        gu.cauda.rotation.y = Math.sin(t * (mov ? 18 : p.modo === 'dormir' ? 1.5 : 10)) * (p.modo === 'dormir' ? .15 : .7);
      } else {
        g.position.y = (p.modo === 'dormir' ? .45 : S.seguir ? 1.6 : 1.1) + Math.sin(t * 2.2) * .18;
        gu.cauda.rotation.y = Math.sin(t * 3) * .5;
        if (gu.aura) gu.aura.material.opacity = .14 + Math.sin(t * 3) * .06;
        if (gu.asas) gu.asas.forEach((a, i) => a.rotation.z = (i ? -1 : 1) * (.3 + Math.sin(t * 18) * .5));
        p.faisca = (p.faisca || 0) - dt;
        if (k === 'raposa' && p.faisca <= 0 && p.modo !== 'dormir') { p.faisca = .3; faisca(g.position); }
      }
      if (p.modo === 'dormir') {
        if (!p.zzz) { p.zzz = sprite('💤', .7); scene.add(p.zzz); }
        p.zzz.position.copy(g.position).add(V3(0, 1.1 + Math.sin(t * 2) * .1, 0));
      } else if (p.zzz) { scene.remove(p.zzz); p.zzz = null; }
    }

    for (const k in rebanho) {
      rebanho[k].forEach((a, j) => {
        const g = a.g, gu = g.userData;
        const mov = andar(g, a.alvo, gu.vel, dt);
        if (mov) { animarPernas(gu, dt, k === 'galinha' ? 18 : k === 'coelho' ? 10 : 6, k === 'galinha' ? .6 : .4); if (gu.bica) gu.corpo.position.y = Math.abs(Math.sin(gu.fase)) * .04; if (gu.pula) gu.corpo.position.y = Math.abs(Math.sin(gu.fase)) * .18; }
        else {
          gu.pernas.forEach(q => q.rotation.x *= .8); if (gu.pula) gu.corpo.position.y *= .8;
          gu.cab.rotation.x = gu.bica ? Math.max(0, Math.sin(t * 6 + g.id)) * .8 : .25 + Math.sin(t * 1.5 + g.id) * .08;
          a.espera -= dt;
          if (a.espera <= 0) { a.espera = rnd(2, 6); const o = cercadoDoAnimal(k, j); if (o && !(editar.sel === o)) a.alvo.copy(pontoNoCercado(o)); }
        }
        if (mov) gu.cab.rotation.x *= .9;
        gu.cauda.rotation.z = Math.sin(t * 2.4 + g.id) * .3;
        if (gu.voa) { gu.corpo.position.y = 1.1 + Math.sin(t * 3 + g.id) * .25; gu.asas.forEach((a, i) => a.rotation.z = Math.sin(t * 40 + i * 3) * .6); }
      });
    }
  }

  // ================= CANTEIROS (plantas) =================
  function folha(cor, h, r = .12) { const m = mesh(new THREE.ConeGeometry(r, h, 5), 0, 0, 0, 0, true, liso(cor)); m.position.y = h / 2; return m; }
  const PONTOS = [[-.42, -.42], [.42, .42], [-.42, .42], [.42, -.42]];
  function broto() {
    const g = new THREE.Group();
    PONTOS.forEach(([x, z]) => {
      const a = folha(0x74d651, .35, .07); a.position.x = x; a.position.z = z; a.rotation.z = .3; g.add(a);
      const b = folha(0x74d651, .3, .07); b.position.x = x; b.position.z = z; b.rotation.z = -.3; g.add(b);
    });
    return g;
  }
  function crescendo(id) {
    const g = new THREE.Group(), alto = ['milho', 'girassol', 'cana'].includes(id) ? 1.1 : id === 'uva' ? .9 : .6;
    PONTOS.forEach(([x, z]) => { for (let k = 0; k < 3; k++) { const f = folha(0x52b63c, alto, .1); f.position.x = x; f.position.z = z; f.rotation.set(rnd(-.4, .4), k * 2.1, rnd(-.4, .4)); g.add(f); } });
    return g;
  }
  function maduro(id) {
    const g = new THREE.Group();
    PONTOS.forEach(([x, z], idx) => {
      const p = new THREE.Group(); p.position.set(x, 0, z); p.rotation.y = idx * 1.3;
      if (id === 'trigo') {
        for (let k = 0; k < 6; k++) { const x = rnd(-.15, .15), z = rnd(-.15, .15), h = rnd(.75, .95);
          const haste = cil(.018, .022, h, 0xd8b04a, x, h / 2, z, 5); haste.rotation.z = rnd(-.12, .12); p.add(haste);
          const esp = mesh(new THREE.CylinderGeometry(.05, .03, .26, 6), 0, x, h + .08, z, true, liso(0xf0c95a)); p.add(esp); }
      } else if (id === 'alface') {
        for (let k = 0; k < 6; k++) { const s = blob(.21, k < 2 ? 0xbaf07c : 0x80d65a, rnd(-.12, .12), .2 + rnd(0, .1), rnd(-.12, .12)); s.scale.y = .8; p.add(s); }
      } else if (id === 'cenoura') {
        const c = mesh(new THREE.ConeGeometry(.17, .55, 8), 0, 0, .08, 0, true, liso(0xf58a2a)); c.rotation.x = Math.PI; p.add(c);
        for (let k = 0; k < 4; k++) { const f = folha(0x4fb43a, .5, .06); f.position.y = .3; f.rotation.set(rnd(-.5, .5), 0, rnd(-.5, .5)); p.add(f); }
      } else if (id === 'milho') {
        p.add(cil(.06, .08, 1.6, 0x5aa83c, 0, .8, 0, 6));
        const esp = cil(.12, .1, .45, 0xf7d23c, .12, 1.05, 0, 8); esp.rotation.z = -.35; p.add(esp);
        for (let k = 0; k < 4; k++) { const f = folha(0x5aa83c, .8, .07); f.position.y = .3 + k * .3; f.rotation.set(0, k * 1.6, .7); p.add(f); }
      } else if (id === 'tomate') {
        p.add(blob(.38, 0x4c9c38, 0, .45, 0));
        for (let k = 0; k < 4; k++) { const a = k * 1.6; p.add(bola(.13, 0xe83b2c, Math.cos(a) * .3, .35 + (k % 2) * .25, Math.sin(a) * .3, 10)); }
      } else if (id === 'morango') {
        for (let k = 0; k < 5; k++) { const f = mesh(new THREE.BoxGeometry(.3, .04, .14), 0, Math.cos(k * 1.25) * .12, .1, -Math.sin(k * 1.25) * .12, true, liso(0x3f9a3a)); f.rotation.y = k * 1.25; p.add(f); }
        for (let k = 0; k < 3; k++) { const b = mesh(new THREE.ConeGeometry(.1, .18, 8), 0, Math.cos(k * 2.1) * .22, .14, Math.sin(k * 2.1) * .22, true, liso(0xec334a)); b.rotation.x = Math.PI; p.add(b); }
      } else if (id === 'abobora') {
        if (idx > 1) return;
        p.position.set(idx ? .38 : -.38, 0, idx ? .33 : -.33);
        const ab = bola(.48, 0xf58a20, 0, .36, 0, 16); ab.scale.set(1, .72, 1); p.add(ab);
        p.add(cil(.05, .07, .22, 0x6b4a1f, 0, .78, 0, 6));
        const f = mesh(new THREE.BoxGeometry(.5, .04, .3), 0, .4, .1, .1, true, liso(0x4c9c38)); f.rotation.y = .6; p.add(f);
      } else if (id === 'batata') {
        p.add(blob(.32, 0x5fae3f, 0, .3, 0)); for (let k = 0; k < 3; k++) { const b = bola(.12, 0xc9955a, Math.cos(k * 2.1) * .25, .07, Math.sin(k * 2.1) * .25, 8); b.scale.set(1.3, .8, 1); p.add(b); }
      } else if (id === 'girassol') {
        p.add(cil(.04, .05, 1.5, 0x4c9c38, 0, .75, 0, 6)); for (let k = 0; k < 2; k++) { const f = folha(0x4c9c38, .45, .12); f.position.y = .5 + k * .35; f.rotation.set(0, k * 3, .9); p.add(f); }
        const fl = new THREE.Group(); fl.position.set(0, 1.55, .05); fl.rotation.x = -.5; p.add(fl);
        fl.add(cil(.26, .26, .05, 0xffc21a, 0, 0, 0, 14)); fl.add(cil(.15, .15, .07, 0x6b3f1f, 0, .01, 0, 12));
      } else if (id === 'cana') {
        for (let k = 0; k < 4; k++) { const x = rnd(-.14, .14), z = rnd(-.14, .14), h = rnd(1.4, 1.8); const c = cil(.035, .04, h, 0x9cc94a, x, h / 2, z, 6); c.rotation.z = rnd(-.08, .08); p.add(c);
          const f = folha(0x6cb84c, .6, .07); f.position.set(x, h * .8, z); f.rotation.set(0, k * 1.6, .8); p.add(f); }
      } else if (id === 'algodao') {
        p.add(blob(.28, 0x5f8f3a, 0, .4, 0)); for (let k = 0; k < 5; k++) p.add(bola(.1, 0xffffff, rnd(-.25, .25), .45 + rnd(0, .3), rnd(-.25, .25), 8));
      } else if (id === 'pimentao') {
        p.add(blob(.3, 0x3f8f34, 0, .42, 0)); for (let k = 0; k < 3; k++) { const c = cil(.08, .06, .2, k % 2 ? 0xe2352a : 0x46b83a, Math.cos(k * 2.1) * .24, .3 + k * .06, Math.sin(k * 2.1) * .24, 8); p.add(c); }
      } else if (id === 'melancia') {
        if (idx > 1) return;
        p.position.set(idx ? .38 : -.38, 0, idx ? .3 : -.3);
        const m = bola(.42, 0x2f8a2f, 0, .3, 0, 16); m.scale.set(1.25, .8, .95); p.add(m);
        for (let k = 0; k < 4; k++) { const fx = mesh(new THREE.TorusGeometry(.4, .025, 4, 18, Math.PI), 0, 0, .3, 0, false, liso(0x1f5f1f)); fx.rotation.set(0, k * .7 - 1, Math.PI / 2); fx.scale.set(1, .8, 1.25); p.add(fx); }
        const f = mesh(new THREE.BoxGeometry(.4, .04, .25), 0, .45, .08, .2, true, liso(0x4c9c38)); f.rotation.y = .5; p.add(f);
      } else if (id === 'cafe') {
        p.add(blob(.34, 0x2f7a35, 0, .55, 0)); p.add(cil(.05, .06, .4, 0x6b4a2b, 0, .2, 0, 6));
        for (let k = 0; k < 7; k++) p.add(bola(.06, k % 3 ? 0xc0272d : 0x7a1d1d, rnd(-.3, .3), .4 + rnd(0, .35), rnd(-.3, .3), 6));
      } else if (id === 'uva') {
        if (idx > 1) return;
        p.position.set(idx ? .45 : -.45, 0, 0);
        p.add(mesh(new THREE.BoxGeometry(.1, 1.4, .1), 0, 0, .7, 0, true, liso(0x8b5a2b)));
        p.add(mesh(new THREE.BoxGeometry(.8, .08, .08), 0, 0, 1.3, 0, true, liso(0x8b5a2b)));
        p.add(blob(.32, 0x4c9c38, 0, 1.35, 0));
        [-.28, .28].forEach(dx => { for (let k = 0; k < 6; k++) p.add(bola(.08, 0x7d3fb0, dx + rnd(-.07, .07), 1.15 - k * .07 - (k > 2 ? .05 : 0), rnd(-.07, .07), 8)); });
      }
      g.add(p);
    });
    return g;
  }
  function posTile(i) { return tiles[i].g.getWorldPosition(V3()); }
  function atualizarTile(i) {
    const t = tiles[i]; if (!t) return;
    const p = S.plots[i];
    let chave = 'vazio';
    if (p.c) { const f = progresso(p); chave = `${p.c}|${p.reg ? 1 : 0}|${f >= 1 ? 2 : f >= .45 ? 1 : 0}|${temPraga(p) ? 1 : 0}|${p.dobro ? 1 : 0}`; }
    if (t.chave === chave) return;
    const antiga = t.chave; t.chave = chave;
    while (t.planta.children.length) t.planta.remove(t.planta.children[0]);
    pintarTile(i);
    t.icone.visible = false;
    if (chave !== 'vazio') {
      const est = +chave.split('|')[2];
      t.planta.add(est === 2 ? maduro(p.c) : est === 1 ? crescendo(p.c) : broto());
      if (!p.reg) { t.icone.material.map = emojiTex('💧'); t.icone.visible = true; t.icone.scale.setScalar(.85); }
      else if (est === 2) { t.icone.material.map = emojiTex(p.dobro ? '🌟' : '✨'); t.icone.visible = true; t.icone.scale.setScalar(.9); }
      else if (temPraga(p)) { t.icone.material.map = emojiTex('🐛'); t.icone.visible = true; t.icone.scale.setScalar(.95); }
      if (antiga && antiga.split('|')[2] !== String(est)) t.pop = 1;
    }
    t.icone.material.needsUpdate = true;
  }

  const destaque = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(G - .16, .4, G - .16)), new THREE.LineBasicMaterial({color:0xffffff}));
  destaque.visible = false; scene.add(destaque);
  const area = new THREE.Mesh(new THREE.PlaneGeometry(G * 3, G * 3), new THREE.MeshBasicMaterial({color:C(0x7fd0ff), transparent:true, opacity:.25, depthWrite:false}));
  area.rotation.x = -Math.PI / 2; area.visible = false; scene.add(area);
  const marcador = new THREE.Mesh(new THREE.RingGeometry(.35, .5, 24), new THREE.MeshBasicMaterial({color:C(0xffffff), transparent:true, opacity:.9, depthWrite:false}));
  marcador.rotation.x = -Math.PI / 2; marcador.position.y = .06; marcador.visible = false; scene.add(marcador);
  let marcadorT = 0;

  // ================= REGRAS =================
  function dicaFerramenta() {
    return 'Toque no canteiro e arraste a semente, o regador ou a foice por cima dos canteiros';
  }
  function plantar(i, id) {
    const c = crop(id);
    if ((S.sementes[id] || 0) <= 0) { toast(`Sem sementes de ${c.nome}. Compre na Loja`); return false; }
    S.sementes[id]--; S.plots[i] = {c:id, reg:false}; S.stats.plantou[id] = (S.stats.plantou[id] || 0) + 1;
    if (S.upg.aspersor) regar(i, true);
    chuva(i, 0x8a5a2b, .07); somT('plantar');
    return true;
  }
  function regar(i, silencioso) {
    const p = S.plots[i];
    if (!p || !p.c || p.reg) return false;
    p.reg = true; p.t0 = Date.now(); p.dur = S.tut >= 0 && S.tut <= 5 ? 4000 : crop(p.c).tempo * 1000 * velocidade(); // no tutorial a 1ª planta cresce rapidinho
    if (!(S.tut >= 0 && S.tut <= 5) && !p.prot && crop(p.c).tempo >= 120 && S.nivel >= 4 && Math.random() < .12) p.pragaEm = p.t0 + p.dur * (.15 + Math.random() * .35);
    if (!silencioso) { chuva(i, 0x6cc3ee, .08); somT('agua', 120); }
    return true;
  }
  function colher(i, auto) {
    const p = S.plots[i], c = crop(p.c);
    if (livreArmazem() < 1) { avisarCheio(); return false; }
    const q = Math.min(livreArmazem(), (Math.random() < 0.12 * (S.upg.adubo || 0) + 0.05 * (S.upg.maos || 0) ? 2 : 1) * (p.dobro ? 2 : 1));
    S.celeiro[c.id] = (S.celeiro[c.id] || 0) + q; S.colhidos += q; S.stats.colheu[c.id] = (S.stats.colheu[c.id] || 0) + q;
    S.plots[i] = {c:null};
    flutuar(posTile(i).add(V3(0, 1.2, 0)), `+${q} ${c.emoji}${q > 1 ? ' 🎉' : ''}`); acharMaterial(posTile(i), .045); acharInsumo(posTile(i), .02);
    poeira(i, 0xffe07a); somT('colher'); ganharXp(c.xp * q);
    if (!auto && !heroi.fila.length) heroi.pulo = 1;
    return true;
  }
  const somT = (n, e) => { if (window.SOM) SOM.tocar(n, e); };
  function acharInsumo(pos, chance) {
    if (S.nivel < 4 || Math.random() > chance) return;
    const ks = Object.keys(INSUMOS).filter(k => S.nivel >= INSUMOS[k].nivel), k = ks[Math.random() * ks.length | 0]; if (!k) return;
    if (!S.ins) S.ins = {}; S.ins[k] = (S.ins[k] || 0) + 1;
    setTimeout(() => { somT('achou'); if (pos) flutuar(pos.clone().add(V3(0, 2.4, 0)), `🎁 +1 ${INSUMOS[k].emoji}`); toast(`🎁 Achou: ${INSUMOS[k].nome}!`, 'bom'); }, 700);
  }
  function acharMaterial(pos, chance) { // de vez em quando cai um material de ampliação
    if (Math.random() > chance) return;
    const ilha = S.nivel >= 14 && Math.random() < .18, lista = ilha ? matsDe('ilha') : [...matsDe('armazem'), ...matsDe('celeiro')], m = lista[Math.random() * lista.length | 0];
    if (!S.mat) S.mat = {}; S.mat[m] = (S.mat[m] || 0) + 1;
    setTimeout(() => { somT('achou'); if (pos) flutuar(pos.clone().add(V3(0, 2.2, 0)), `🎁 +1 ${MATERIAIS[m].nome}`); toast(`🎁 Achou: ${MATERIAIS[m].nome}!`, 'bom'); }, 450);
  }
  function ganharXp(x) {
    S.xp += x;
    let subiu = false;
    while (S.xp >= xpProx(S.nivel)) {
      S.xp -= xpProx(S.nivel); S.nivel++; subiu = true; somT('nivel', 500);
      const novos = [...CROPS.filter(c => c.nivel === S.nivel).map(c => c.emoji + ' ' + c.nome),
        ...Object.values(ANIMAIS).filter(a => a.nivel === S.nivel).map(a => a.emoji + ' ' + a.nome),
        ...Object.values(PETS).filter(a => a.nivel === S.nivel).map(a => a.nome)];
      toast(`⭐ Nível ${S.nivel}!${novos.length ? ' Liberou: ' + novos.join(', ') : ''}`, 'ouro');
    }
    if (subiu) atualizarPlacasTerra();
  }
  function comprarSemente(id, q) {
    const c = crop(id), custo = c.semente * q;
    if (S.nivel < c.nivel || S.moedas < custo) return;
    if (usoCeleiro() + q > capCeleiro()) { toast('🏚️ Celeiro cheio! Amplie o celeiro para guardar mais sementes'); return; }
    S.moedas -= custo; S.sementes[id] = (S.sementes[id] || 0) + q; S.stats.compras++;
    toast(`Comprou ${q} ${c.emoji} por ${fmtN(custo)} moedas`, 'bom');
    if (S.ferramenta === 'mao' || !(S.sementes[S.semSel] || 0)) { S.ferramenta = id; S.semSel = id; }
    tudo();
  }
  function vender(id, qtd) { const tem = S.celeiro[id] || 0, q = Math.min(tem, qtd == null ? tem : Math.max(0, qtd | 0)); if (!q) return 0; const v = q * precoAtual(id); somT('moeda', 150); S.moedas += v; S.ganho += v; S.stats.vendeu += v; S.celeiro[id] = tem - q; return v; }
  function comprarUpg(k) {
    const u = UPG[k], l = S.upg[k] || 0, custo = custoUpg(k);
    if (l < u.max && S.nivel < u.niv[l]) { toast(`Libera no nível ${u.niv[l]}`); return; }
    if (l >= u.max || S.moedas < custo) return;
    S.moedas -= custo; S.upg[k] = l + 1;
    toast(`${u.emoji} ${u.nome}${u.max > 1 ? ' nível ' + (l + 1) : ''} comprado!`, 'bom');
    if (k === 'aspersor') S.plots.forEach((p, i) => regar(i, true));
    tudo();
  }
  function adotarPet(k) {
    const a = PETS[k];
    if (S.amigos[k] || S.nivel < a.nivel || S.moedas < a.custo) return;
    S.moedas -= a.custo; S.amigos[k] = true; atualizarPets3D();
    toast(`🐾 Um ${a.especie.toLowerCase()} chegou na fazenda! Dê um nome para ele`, 'ouro'); tudo(); abrir('nome', k);
  }
  function comprarAnimal(k) {
    const a = ANIMAIS[k], custo = custoAnimal(k);
    if (S.nivel < a.nivel || qtdAnimal(k) >= maxAnimal(k) || S.moedas < custo) return;
    S.moedas -= custo; S.animais[k] = qtdAnimal(k) + 1; aniLista(k);
    atualizarAnimais3D();
    toast(`${a.emoji} Nova ${a.nome.toLowerCase()}! Toque no ${TIPOS[a.cercado].nome.toLowerCase()} para dar ração`, 'bom'); tudo();
  }
  // comprar construção nova: coloca no primeiro lugar livre e abre o modo edição para posicionar
  function comprarConstrucao(tipo) {
    const custo = custoConstrucao(tipo);
    if (S.nivel < nivelConstrucao(tipo)) { toast(`Libera no nível ${nivelConstrucao(tipo)}`); return; }
    if (ehUnico(tipo) && nTipo(tipo)) { toast('Você já tem essa construção'); return; }
    if (S.moedas < custo) { toast('Moedas insuficientes'); return; }
    const tg = controls.target, pos = acharEspaco(tipo, Math.round(tg.x / G), Math.round(tg.z / G)) || acharEspaco(tipo);
    if (!pos) { toast('Sem espaço livre! Libere novas terras 🌳'); return; }
    S.moedas -= custo;
    const o = {id:novoId(), tipo, rot:0, ...pos};
    if (tipo === 'lote') { o.li = nTipo('lote'); for (let k = 0; k < 4; k++) S.plots.push({c:null}); }
    S.objetos.push(o); criarObjeto3D(o);
    const an = TIPOS[tipo].animal;
    if (an && !S.presente[tipo]) { S.presente[tipo] = 1; const r = ANIMAIS[an].racao; S.celeiro[r] = (S.celeiro[r] || 0) + 3; setTimeout(() => toast(`🎁 Presente: 3 ${item(r).nome.toLowerCase()}!`, 'ouro'), 1500); }
    const jaEditando = editar.ativo;
    fechar(); tudo();
    entrarEdicao(); selecionar(o); renderBarraConstrucao();
    if (!jaEditando) toast(`${TIPOS[tipo].nome} comprado! Arraste, toque ✓ e escolha mais itens na barra de baixo`, 'bom');
  }
  const temMats = (lista, n) => lista.every(m => ((S.mat || {})[m] || 0) >= n);
  const gastarMats = (lista, n) => lista.forEach(m => S.mat[m] -= n);
  function ampliar(k) {
    const c = custoAmpliar(k), ms = matsDe(k), n = matsAmpliar(k);
    if (!temMats(ms, n)) { toast(`Faltam materiais: ${ms.map(m => `${MATERIAIS[m].nome} ${(S.mat || {})[m] || 0}/${n}`).join(' · ')}. Eles caem ao colher e produzir!`); return; }
    if (S.moedas < c) { toast('Moedas insuficientes'); return; }
    S.moedas -= c; gastarMats(ms, n); S.cap[k]++; toast(`📦 ${k === 'armazem' ? 'Armazém' : 'Celeiro'} ampliado: agora cabem ${k === 'armazem' ? capArmazem() : capCeleiro()}!`, 'bom'); tudo();
  }
  function comprarZona(key) {
    const z = ZONAS.find(z => z.key === key); if (!z || S.zonas.includes(key)) return;
    const custo = custoZona();
    if (S.nivel < nivelZona()) { toast(`Precisa chegar no nível ${nivelZona()}`); return; }
    if (S.moedas < custo) { toast(`Precisa de ${fmtN(custo)} moedas`); return; }
    S.moedas -= custo; S.zonas.push(key);
    const g = terras[key];
    if (g) { g.traverse(m => { const i = clicaveisTerra.indexOf(m); if (i >= 0) clicaveisTerra.splice(i, 1); }); scene.remove(g); delete terras[key]; }
    for (let k = 0; k < 14; k++) { const [cx, cz] = z.cel[Math.random() * z.cel.length | 0]; poeiraEm(V3(cx * G, 0, cz * G), 0x9ad46a); }
    atualizarPlacasTerra();
    toast('🌳 Terra nova liberada! Use ✏️ Editar para construir nela', 'ouro'); fechar(); tudo();
  }

  // produção dos animais: 1 ração = 1 ciclo (ex.: galinha bota 3 ovos, 1 a cada 2 min)
  function atualizarProducao() {
    let mudou = false; const agora = Date.now();
    for (const k in ANIMAIS) {
      const a = ANIMAIS[k], ms = a.tempo * 1000 * (S.amigos.gato ? .9 : 1);
      aniLista(k).forEach(x => {
        if (x.rest <= 0) return;
        const n = Math.min(x.rest, Math.floor((agora - x.t) / ms));
        if (n > 0) { x.rest -= n; x.prontos += n; x.t += n * ms; mudou = true; }
      });
    }
    if (atualizarMoinho()) mudou = true;
    return mudou;
  }
  function animaisDoCercado(o) {
    const k = TIPOS[o.tipo].animal, idx = cercadosDe(k).indexOf(o), por = ANIMAIS[k].porCercado;
    return aniLista(k).slice(0, qtdAnimal(k)).slice(idx * por, idx * por + por);
  }
  // pomar
  const fruta = o => item(TIPOS[o.tipo].fruta);
  function tPomar(o) { if (!S.pomar) S.pomar = {}; if (!S.pomar[o.id]) S.pomar[o.id] = Date.now(); return S.pomar[o.id]; }
  const restaPomar = o => Math.max(0, fruta(o).tempo * 1000 * velocidade() - (Date.now() - tPomar(o)));
  function colherPomar(o) {
    if (restaPomar(o) > 0) return;
    const f = fruta(o), n = Math.min(f.rende, livreArmazem()); if (n < 1) { avisarCheio(); return; }
    S.celeiro[f.id] = (S.celeiro[f.id] || 0) + n; S.stats.colheu[f.id] = (S.stats.colheu[f.id] || 0) + n; S.pomar[o.id] = Date.now();
    flutuar(centro(o).add(V3(0, 2.5, 0)), `+${n} ${f.emoji}`); ganharXp(Math.round(n * f.preco / 25)); acharMaterial(centro(o), .12);
  }
  function estadoCercado(o) {
    const L = animaisDoCercado(o), a = ANIMAIS[TIPOS[o.tipo].animal], agora = Date.now();
    const prod = L.filter(x => x.rest > 0);
    return {n:L.length, prontos:L.reduce((s, x) => s + x.prontos, 0), fome:L.filter(x => x.rest <= 0).length, prod:prod.length,
      prox:prod.length ? Math.min(...prod.map(x => a.tempo * 1000 * (S.amigos.gato ? .9 : 1) - (agora - x.t))) : 0};
  }
  function trabalharCercado(o) { // coleta o que está pronto e dá ração para quem está com fome
    atualizarProducao();
    const k = TIPOS[o.tipo].animal, a = ANIMAIS[k], it = item(a.prod), r = item(a.racao), L = animaisDoCercado(o), c = centro(o);
    let col = 0; L.forEach(x => { const n = Math.min(x.prontos, livreArmazem() - col); col += n; x.prontos -= n; });
    if (L.some(x => x.prontos > 0)) avisarCheio();
    if (col) { acharMaterial(c, .1); S.celeiro[it.id] = (S.celeiro[it.id] || 0) + col; S.stats.coletou[it.id] = (S.stats.coletou[it.id] || 0) + col; flutuar(c.clone().add(V3(0, 2, 0)), `+${col} ${it.emoji}`); ganharXp(col); }
    let comeu = 0;
    L.forEach(x => { if (x.rest <= 0 && (S.celeiro[r.id] || 0) > 0) { S.celeiro[r.id]--; x.rest = a.porRacao; x.t = Date.now(); comeu++; } });
    if (comeu) { S.stats.alimentou += comeu; setTimeout(() => flutuar(c.clone().add(V3(0, 1.2, 0)), `🥣 ×${comeu}`), col ? 350 : 0); }
    const fome = L.filter(x => x.rest <= 0).length;
    if (fome) toast(`${fome} ${fome > 1 ? a.plural.toLowerCase() + ' com' : a.nome.toLowerCase() + ' com'} fome! Faça ${r.nome.toLowerCase()} no moinho 🌾`);
    else if (!col && !comeu) { const e = estadoCercado(o); toast(`${a.emoji} Próximo ${it.nome.toLowerCase()} em ${fmtT(e.prox / 1000)}`); }
  }
  // fábricas (moinho, padaria...): fila de produção, um item por vez
  function atualizarFab(t, oid) {
    const M = fabEstado(t, oid); let mudou = false; const agora = Date.now();
    while (M.fila.length) {
      const f = M.fila[0]; if (!f.t0) f.t0 = agora;
      if (agora - f.t0 < f.dur) break;
      M.fila.shift(); M.prontos[f.id] = (M.prontos[f.id] || 0) + 1; mudou = true;
      if (M.fila[0]) M.fila[0].t0 = f.t0 + f.dur;
    }
    return mudou;
  }
  const atualizarMoinho = () => Object.keys(FABRICAS).reduce((m, t) => t === 'moinho' ? listaMoinhos().reduce((mm, o) => atualizarFab(t, o.id) || mm, m) : atualizarFab(t) || m, false);
  function temIngredientes(r, q = 1) { return Object.entries(r.ing).every(([id, n]) => (S.celeiro[id] || 0) >= n * q); }
  function produzir(id, silencioso) {
    const r = item(id), t = r.fab, M = fabEstado(t), F = FABRICAS[t];
    if (!nTipo(t)) { toast(`Construa ${t === 'moinho' ? 'um moinho' : 'a ' + F.nome.toLowerCase()} primeiro`); return false; }
    if (S.nivel < r.nivel) { toast(`Libera no nível ${r.nivel}`); return false; }
    if (M.fila.length >= vagasFab(t)) { if (!silencioso) toast('A fila está cheia. Compre a melhoria Fábricas maiores!'); return false; }
    if (!temIngredientes(r)) { if (!silencioso) toast('Faltam ingredientes no armazém'); return false; }
    Object.entries(r.ing).forEach(([k, n]) => S.celeiro[k] -= n);
    M.fila.push({id, dur:r.tempo * 1000, t0:M.fila.length ? 0 : Date.now()});
    if (!silencioso) { toast(`⚙️ ${r.nome} entrou na fila`, 'bom'); tudo(); }
    return true;
  }
  function coletarFab(t, oid) {
    atualizarFab(t, oid);
    const M = fabEstado(t, oid); let tot = 0, xp = 0, em = ''; const o = oid ? objPorId(oid) : S.objetos.find(o => o.tipo === t);
    for (const id in M.prontos) {
      const r = item(id), rende = r.rende || 1, cabe = Math.floor(livreArmazem() / rende), n = Math.min(M.prontos[id], cabe); if (!n) continue;
      S.celeiro[id] = (S.celeiro[id] || 0) + n * rende; S.stats.fez[id] = (S.stats.fez[id] || 0) + n; tot += n * rende; M.prontos[id] -= n; xp += n * (r.xp || 2); em = r.racao ? '🥣' + r.mini : r.emoji;
    }
    if (Object.values(M.prontos).some(v => v > 0)) avisarCheio();
    if (tot) { if (o) flutuar(centro(o).add(V3(0, 3, 0)), `+${tot} ${em}`); ganharXp(xp); acharMaterial(o ? centro(o) : null, .1); }
    return tot;
  }
  const coletarMoinho = () => coletarFab('moinho');
  const prontosFab = (t, oid) => Object.entries(fabEstado(t, oid).prontos).reduce((a, [id, v]) => a + v * (item(id).rende || 1), 0);
  const baloes = {};
  function balao_(id, y) {
    let b = baloes[id];
    if (!b) {
      const cv = document.createElement('canvas'); cv.width = 512; cv.height = 256;
      const tx = new THREE.CanvasTexture(cv); tx.encoding = THREE.sRGBEncoding; tx.anisotropy = ANISO;
      b = baloes[id] = new THREE.Sprite(new THREE.SpriteMaterial({map:tx, depthTest:false, transparent:true}));
      b.renderOrder = 10; b.scale.set(2.2, 1.1, 1); b.userData.cv = cv; b.visible = false; scene.add(b);
    }
    b.userData.y = y; return b;
  }
  function desenharBalao(b, emoji, texto, cor = '#fff8ea') {
    const chave = emoji + '|' + texto; b.visible = true;
    if (b.userData.chave === chave) return; b.userData.chave = chave;
    const cv = b.userData.cv, g = cv.getContext('2d'); g.setTransform(2, 0, 0, 2, 0, 0); g.clearRect(0, 0, 256, 128);
    g.font = '800 46px "Baloo 2", sans-serif'; const w = Math.min(244, 96 + (texto ? g.measureText(texto).width : 0)), x = (256 - w) / 2;
    g.fillStyle = cor; g.strokeStyle = '#7a4a26'; g.lineWidth = 7;
    g.beginPath(); g.roundRect ? g.roundRect(x, 18, w, 84, 40) : g.rect(x, 18, w, 84); g.fill(); g.stroke();
    g.beginPath(); g.moveTo(118, 101); g.lineTo(128, 120); g.lineTo(138, 101); g.fill();
    g.font = '52px serif'; g.textBaseline = 'middle'; g.textAlign = 'left'; g.fillText(emoji, x + 14, 64);
    if (texto) { g.font = '800 44px "Baloo 2", sans-serif'; g.fillStyle = '#4a2e17'; g.fillText(texto, x + 76, 66); }
    b.material.map.needsUpdate = true;
  }
  const tempoCurto = ms => { const s = Math.max(0, Math.ceil(ms / 1000)); return s >= 3600 ? `${Math.floor(s / 3600)}h${String(Math.floor(s % 3600 / 60)).padStart(2, '0')}` : s >= 60 ? `${Math.floor(s / 60)}m${String(s % 60).padStart(2, '0')}` : `${s}s`; };
  function atualizarBaloes() {
    for (const k in baloes) baloes[k].visible = false;
    S.objetos.forEach(o => {
      const T = TIPOS[o.tipo], c = centro(o);
      if (T.animal) {
        const e = estadoCercado(o); if (!e.n) return;
        const [, D] = dims(o), b = balao_(o.id, 4.2); b.position.set(c.x, 4.2, c.z + D * G / 4);
        if (e.prontos) desenharBalao(b, item(ANIMAIS[T.animal].prod).emoji, '×' + e.prontos, '#eaffd8');
        else if (e.prod) desenharBalao(b, '⏳', tempoCurto(e.prox) + (e.fome ? ' 🍽️' : ''));
        else if (e.fome) desenharBalao(b, '🍽️', 'fome!', '#ffe4dd');
      }
      if (T.fruta) {
        const r = restaPomar(o), fr = frutosArv[o.id]; if (fr) fr.visible = r <= 0;
        const b = balao_(o.id, 3.6); b.position.set(c.x, 3.6, c.z);
        if (r <= 0) desenharBalao(b, fruta(o).emoji, '×' + fruta(o).rende, '#eaffd8'); else desenharBalao(b, '⏳', tempoCurto(r));
      }
      if (T.fab && (o.tipo === 'moinho' || S.objetos.find(x => x.tipo === o.tipo) === o)) { // cada moinho tem o seu balão
        const y = o.tipo === 'moinho' ? 7 : 5, oid = o.tipo === 'moinho' ? o.id : undefined;
        const n = prontosFab(o.tipo, oid), b = balao_(o.id, y); b.position.set(c.x, y, c.z);
        const M = fabEstado(o.tipo, oid), f = M.fila[0], pr = Object.keys(M.prontos).find(k => M.prontos[k] > 0);
        if (n) desenharBalao(b, emojiItem(item(pr)), '×' + n, '#eaffd8');
        else if (f && f.t0) desenharBalao(b, emojiItem(item(f.id)), tempoCurto(f.dur - (Date.now() - f.t0)));
      }
    });
  }

  // fila de ações: o fazendeiro vai até cada canteiro e faz o trabalho com animação
  const DUR = {plantar:1.5, regar:1.3, colher:.9, catar:.8, cercado:1.3, pomar:1.2, andar:0};
  const durAcao = tipo => DUR[tipo] * Math.max(.1, Math.pow(.84, S.upg.ferram || 0)) * (S.tut >= 0 && S.tut <= 5 ? .6 : 1);
  const velHeroi = () => 4.2 * (1 + .15 * (S.upg.botas || 0));
  const naFila = i => heroi.fila.some(a => a.i === i || (a.lista && a.lista.includes(i))) || (heroi.atual && (heroi.atual.i === i || (heroi.atual.lista && heroi.atual.lista.includes(i))));
  const objNaFila = id => heroi.fila.some(a => a.oid === id) || (heroi.atual && heroi.atual.oid === id);
  const alvoAcao = a => { if (a.pos) return {anda:a.pos.clone(), olha:a.pos}; if (a.oid) { const o = objPorId(a.oid), c = centro(o), [, D] = dims(o); return {anda:V3(c.x, 0, c.z + D * G / 2 + .6), olha:c}; } const t = posTile(a.i); return {anda:t.clone().add(V3(0, 0, G * .55)), olha:t}; };
  const semFila = id => [heroi.atual, ...heroi.fila].filter(a => a && a.tipo === 'plantar' && a.id === id).reduce((n, a) => n + idsAcao(a).length, 0);
  function marcar(i, on) { if (i != null && tiles[i]) { tiles[i].ocupado = on; pintarTile(i); } }
  const COR_OCUPADO = C(0xa9a39c);
  function pintarTile(i) { // canteiro esperando o fazendeiro: fica acinzentado
    const t = tiles[i], p = S.plots[i]; if (!t || !p) return;
    t.base.material.color.copy(C(p.reg ? COR_MOLHADA : COR_TERRA)); if (t.ocupado) t.base.material.color.lerp(COR_OCUPADO, .6);
  }
  const idsAcao = a => a.lista || (a.i != null ? [a.i] : []);
  const areaMax = () => 6; // o fazendeiro faz até 6 canteiros seguidos numa tarefa só
  function areaAcao(i, filtro, max, ignorar) { // o canteiro tocado + os mais perto que também servem
    const c = posTile(i);
    return [i, ...S.plots.map((q, j) => j).filter(j => j !== i && tiles[j] && filtro(S.plots[j]) && !naFila(j) && !(ignorar && ignorar.has(j)))
      .sort((x, y) => posTile(x).distanceTo(c) - posTile(y).distanceTo(c))].slice(0, Math.max(1, Math.min(areaMax(), max)));
  }
  const regavel = p => p.c && !p.reg, vazio = p => !p.c;
  // plantar: só nos canteiros que o jogador escolheu; canteiros seguidos com a mesma semente viram uma tarefa só (até o limite das Mãos)
  // plantar, regar e colher: só nos canteiros que o jogador escolheu; canteiros seguidos da mesma ação viram uma tarefa só (até o limite das Mãos)
  function enfileirarGrupo(tipo, i, id) {
    const u = heroi.fila[heroi.fila.length - 1];
    if (u && u.tipo === tipo && u.id === id && idsAcao(u).length < areaMax()) { u.lista = idsAcao(u).concat(i); marcar(i, true); renderFila(); return; }
    enfileirar(id ? {tipo, i, id, lista:[i]} : {tipo, i, lista:[i]});
  }
  const enfileirarPlantio = (i, id) => enfileirarGrupo('plantar', i, id);
  const colhendoNaFila = () => [heroi.atual, ...heroi.fila].filter(a => a && a.tipo === 'colher').reduce((n, a) => n + idsAcao(a).length, 0);
  const MAX_FILA = Infinity;
  function enfileirar(acao) {
    if (heroi.fila.length >= MAX_FILA) { toast('A lista de afazeres está cheia (20)'); return false; }
    heroi.fila.push(acao); idsAcao(acao).forEach(j => marcar(j, true)); renderFila(); return true;
  }
  function limparFila() {
    heroi.fila.forEach(a => idsAcao(a).forEach(j => marcar(j, false))); heroi.fila = [];
    if (heroi.atual) { idsAcao(heroi.atual).forEach(j => marcar(j, false)); heroi.atual = null; heroi.acao = null; heroi.rota = []; }
    renderFila();
  }
  function removerDaFila(k) { const a = heroi.fila.splice(k, 1)[0]; if (a) idsAcao(a).forEach(j => marcar(j, false)); renderFila(); }
  function iconeAcao(a) {
    if (a.tipo === 'pomar') { const o = objPorId(a.oid); return o ? fruta(o).emoji : '🌳'; }
    if (a.tipo === 'plantar') return crop(a.id).emoji;
    if (a.tipo === 'regar') return '💧';
    if (a.tipo === 'catar') return '🐛';
    if (a.tipo === 'colher') return '🧺';
    if (a.tipo === 'cercado') { const o = objPorId(a.oid); return o ? ANIMAIS[TIPOS[o.tipo].animal].emoji : '🐾'; }
    if (a.oid) { const o = objPorId(a.oid); return o && FABRICAS[o.tipo] ? FABRICAS[o.tipo].emoji : '🚶'; }
    return '🚶';
  }
  let filaHTML = '';
  function renderFila() {
    const el = $('#filaUI'); if (!el) return;
    const tot = heroi.fila.length + (heroi.atual ? 1 : 0);
    let h = '';
    if (tot) {
      h += `<span class="fila-tit">📋 ${tot}</span>`;
      if (heroi.atual) h += `<span class="fila-ic atual">${iconeAcao(heroi.atual)}</span>`;
      heroi.fila.slice(0, 9).forEach((a, k) => h += `<button class="fila-ic" data-fila="${k}" title="Remover">${iconeAcao(a)}</button>`);
      if (heroi.fila.length > 9) h += `<span class="fila-mais">+${heroi.fila.length - 9}</span>`;
      h += `<button class="fila-cancel" data-fila="tudo" title="Cancelar tudo">✋</button>`;
    }
    if (h !== filaHTML) { filaHTML = h; el.innerHTML = h; el.style.display = tot ? 'flex' : 'none'; }
  }
  function processarFila(dt) {
    if (!heroi.atual) {
      if (!heroi.fila.length) return;
      heroi.atual = heroi.fila.shift(); heroi.atual.fase = 'andar'; renderFila();
      heroi.rota = [ajustarDestino(alvoAcao(heroi.atual).anda)];
    }
    const a = heroi.atual;
    if (a.fase === 'andar' && !heroi.rota.length) {
      a.fase = 'agir'; a.t = durAcao(a.tipo); heroi.acao = {tipo:a.tipo, t:a.t};
      const c = alvoAcao(a).olha; heroi.g.rotation.y = Math.atan2(c.x - heroi.g.position.x, c.z - heroi.g.position.z);
    }
    if (a.fase === 'agir') {
      a.t -= dt;
      if (a.t <= 0) { heroi.atual = null; executar(a); idsAcao(a).forEach(j => marcar(j, false)); renderFila(); tudo(); }
    }
  }
  function executar(a) {
    if (a.tipo === 'cercado') { const o = objPorId(a.oid); if (o) trabalharCercado(o); return; }
    if (a.tipo === 'pomar') { const o = objPorId(a.oid); if (o) colherPomar(o); return; }
    if (a.tipo === 'andar') return;
    const p = S.plots[a.i];
    if (a.tipo === 'plantar') idsAcao(a).forEach(j => { if (!S.plots[j].c && (S.sementes[a.id] || 0) > 0) plantar(j, a.id); });
    if (a.tipo === 'regar') idsAcao(a).forEach(j => regar(j));
    if (a.tipo === 'colher') idsAcao(a).forEach(j => { if (pronto(S.plots[j])) colher(j); });
    if (a.tipo === 'catar') idsAcao(a).forEach(j => tirarPraga(j));
  }
  const listaColheita = (i, ignorar) => areaAcao(i, pronto, livreArmazem(), ignorar);
  function clicarTile(i) {
    if (VISITA) { ajudarNaVisita(i); return; }
    const p = S.plots[i];
    if (naFila(i)) return;
    if (!p.c) { abrirPlantio(i); return; }
    if (p.c && !p.reg) { abrirFerramenta('regar', i); return; }
    if (pronto(p)) { abrirFerramenta('colher', i); return; }
    if (temPraga(p)) { abrirFerramenta('catar', i); return; }
    abrirFerramenta('insumos', i);
  }
  function mostrarNome(o, ms = 3000) { const r = obj3D[o.id]; if (r && r.rot) r.ate = Date.now() + ms; }
  function atualizarNomes() {
    const agora = Date.now();
    for (const id in obj3D) { const r = obj3D[id]; if (r.rot) { r.rot.visible = !!(editar.ativo || r.ate > agora || (hoverObj && hoverObj.id === id)); const b = baloes[id]; if (b) b.material.opacity = r.rot.visible ? .2 : 1; } }
  }
  function clicarConstrucao(o) {
    const T = TIPOS[o.tipo]; mostrarNome(o);
    if (T.animal && qtdAnimal(T.animal)) somT(T.animal, 700);
    if (VISITA) { if (T.animal && qtdAnimal(T.animal)) { somT(T.animal, 700); ajudarCercadoVisita(o); } return; } // visitando: só olha (e ajuda)
    if (T.abre) { const c = centro(o), [, D] = dims(o); irPara(V3(c.x, 0, c.z + D * G / 2 + .8)); abrir(T.abre); return; }
    if (objNaFila(o.id)) return;
    if (T.fruta) { const r = restaPomar(o); if (r > 0) toast(`${fruta(o).emoji} ${TIPOS[o.tipo].nome}: frutas em ${fmtT(r / 1000)}`); else enfileirar({tipo:'pomar', oid:o.id}); return; }
    if (T.animal) {
      if (!qtdAnimal(T.animal)) { abrir('animais'); return; }
      { atualizarProducao(); const e = estadoCercado(o), a = ANIMAIS[T.animal];
        if (e.fome && !e.prontos && !(S.celeiro[a.racao] > 0)) { irParaRacao(a); return; } }
      enfileirar({tipo:'cercado', oid:o.id}); return;
    }
    if (T.fab) { if (o.tipo === 'moinho') fabSel = o.id; const oidF = o.tipo === 'moinho' ? o.id : undefined; if (prontosFab(o.tipo, oidF) > 0) { coletarFab(o.tipo, oidF); tudo(); return; } abrir('fabrica', o.tipo); if (!objNaFila(o.id)) enfileirar({tipo:'andar', oid:o.id}); tudo(); }
  }
  let destaqueRec = null;
  function irParaRacao(a) { // bicho com fome e sem ração: já abre o moinho mostrando a ração certa
    const r = item(a.racao), m = listaMoinhos()[0];
    if (!m) { toast(`${a.plural} com fome! Construa um Moinho para fazer ${r.nome.toLowerCase()} 🌾`); abrir('loja', 'construcoes'); return; }
    fabSel = m.id; destaqueRec = r.id; abrir('fabrica', 'moinho'); destaqueRec = null;
    const el = $(`[data-rec=${r.id}]`); if (el) el.scrollIntoView({block:'center'});
    toast(`🍽️ ${a.plural} com fome! Faça ${r.nome.toLowerCase()} aqui no moinho`, 'bom');
    apontar_(() => $(`[data-receita=${r.id}]`), null, 6000);
  }
  const clicavel = o => o && (TIPOS[o.tipo].abre || TIPOS[o.tipo].animal || TIPOS[o.tipo].fab || TIPOS[o.tipo].fruta);
  function vizinhos(i) {
    const c = posTile(i), out = [];
    S.plots.forEach((p, j) => { if (tiles[j] && posTile(j).distanceTo(c) < G * 1.6) out.push(j); });
    return out;
  }
  function tickMercado() {
    for (const c of ITENS) {
      const m = S.precos[c.id] || 1;
      let n = m + (Math.random() - .5) * .3 + (1 - m) * .2;
      n = Math.min(1.6, Math.max(.6, n));
      S.tend[c.id] = n > m + .01 ? 1 : n < m - .01 ? -1 : 0;
      S.precos[c.id] = +n.toFixed(3);
    }
    if (!eventoAtivo() && Math.random() < .18) {
      const lib = CROPS.filter(c => c.nivel <= S.nivel), c = lib[Math.random() * lib.length | 0];
      S.evento = {id:c.id, ate:Date.now() + 45000};
      toast(`📣 Feira de ${c.nome}! Preço em dobro por 45s`, 'ouro');
    }
    if (janela === 'armazem') renderJanela();
    salvar();
  }

  // ================= MODO EDIÇÃO =================
  const editar = {ativo:false, sel:null, orig:null, arrastando:false, valido:true};
  const grade = new THREE.GridHelper((2 * OFF + 1) * G, 2 * OFF + 1, 0xffffff, 0xffffff);
  grade.material.transparent = true; grade.material.opacity = .28; grade.position.y = .04; grade.visible = false; scene.add(grade);
  const pegada = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({color:C(0x5cd65c), transparent:true, opacity:.45, depthWrite:false}));
  pegada.material.depthTest = false; pegada.rotation.x = -Math.PI / 2; pegada.position.y = .4; pegada.visible = false; pegada.renderOrder = 8; scene.add(pegada);
  const ferrEd = $('#ferrEdicao');

  function entrarEdicao() {
    if (editar.ativo) return;
    editar.ativo = true; grade.visible = true; document.body.classList.add('editando'); setTimeout(renderBarraConstrucao, 0);
    fechar(); tip.style.display = 'none';
  }
  function sairEdicao() {
    if (editar.sel) { if (editar.valido) confirmarSel(); else cancelarSel(); }
    editar.ativo = false; grade.visible = false; document.body.classList.remove('editando'); ferrEd.style.display = 'none';
    salvar();
  }
  // barra de construção: aparece no modo edição para comprar e colocar vários itens seguidos
  let barraHTML = '';
  function renderBarraConstrucao() {
    const el = $('#barraConstrucao'); if (!el) return;
    if (!editar.ativo) { el.innerHTML = ''; barraHTML = ''; return; }
    const lista = [...CONSTRUCOES.map(c => ({tipo:c.tipo, icone:c.icone})), ...DECOR.map(c => ({tipo:c.tipo, icone:c.icone}))];
    let h = '';
    lista.forEach(c => {
      const nv = nivelConstrucao(c.tipo), trava = S.nivel < nv, custo = custoConstrucao(c.tipo), feito = ehUnico(c.tipo) && nTipo(c.tipo) > 0;
      if (feito) return;
      h += `<button class="bc ${trava ? 'trava' : ''} ${!trava && S.moedas < custo ? 'caro' : ''}" data-bc="${c.tipo}"><span class="e">${c.icone}</span><small>${TIPOS[c.tipo].nome}</small>
        <b>${trava ? '🔒 Nv ' + nv : moedaMini + fmtN(custo)}</b></button>`;
    });
    if (h !== barraHTML) { barraHTML = h; el.innerHTML = h; }
  }
  $('#barraConstrucao').addEventListener('click', e => {
    const b = e.target.closest('[data-bc]'); if (!b) return;
    if (editar.sel && !editar.valido) { toast('Primeiro coloque o item selecionado num lugar livre (verde) ou cancele ✕'); return; }
    comprarConstrucao(b.dataset.bc); renderBarraConstrucao();
  });
  function selecionar(o) {
    if (editar.sel && editar.sel !== o) { if (editar.valido) confirmarSel(); else cancelarSel(); }
    if (!o) return;
    editar.sel = o; editar.orig = {ox:o.ox, oz:o.oz, rot:o.rot};
    validarSel();
  }
  function validarSel() {
    const o = editar.sel; if (!o) return;
    posicionar(o, true);
    editar.valido = posicaoValida(o);
    const [W, D] = dims(o), c = centro(o);
    pegada.scale.set(W * G, D * G, 1); pegada.position.set(c.x, .4, c.z);
    pegada.material.color.copy(C(editar.valido ? 0x5cd65c : 0xe0503a)); pegada.visible = true;
    ferrEd.style.display = 'flex';
    ferrEd.querySelector('[data-ed=ok]').disabled = !editar.valido;
    ferrEd.querySelector('[data-ed=vender]').style.display = TIPOS[editar.sel.tipo].decor ? '' : 'none';
    atualizarBaloes();
  }
  function moverSel(p) {
    const o = editar.sel, [W, D] = dims(o);
    const ox = Math.round(p.x / G - (W - 1) / 2), oz = Math.round(p.z / G - (D - 1) / 2);
    if (ox === o.ox && oz === o.oz) return;
    o.ox = ox; o.oz = oz; validarSel();
  }
  function girarSel() {
    const o = editar.sel; if (!o) return;
    const c = centro(o); o.rot = (o.rot + 1) % 4;
    const [W, D] = dims(o); o.ox = Math.round(c.x / G - (W - 1) / 2); o.oz = Math.round(c.z / G - (D - 1) / 2);
    validarSel();
  }
  function confirmarSel() {
    const o = editar.sel; if (!o) return;
    if (!editar.valido) { toast('Aqui não dá: está ocupado ou fora das suas terras'); return; }
    posicionar(o); editar.sel = null; pegada.visible = false; ferrEd.style.display = 'none';
    if (TIPOS[o.tipo].animal) atualizarAnimais3D(true);
    if (o.tipo === 'loja') posicionarTonho();
    poeiraEm(centro(o), 0xd8b98a); salvar(); atualizarBaloes();
  }
  function venderSel() {
    const o = editar.sel; if (!o || !TIPOS[o.tipo].decor) return;
    const v = Math.round(custoConstrucao(o.tipo) / 2);
    S.objetos.splice(S.objetos.indexOf(o), 1);
    const r = obj3D[o.id]; scene.remove(r.g); pickObjs.splice(pickObjs.indexOf(r.pick), 1); delete obj3D[o.id];
    editar.sel = null; pegada.visible = false; ferrEd.style.display = 'none';
    S.moedas += v; toast(`Decoração vendida por ${fmtN(v)} moedas`); tudo();
  }
  function cancelarSel() {
    const o = editar.sel; if (!o) return;
    Object.assign(o, editar.orig); posicionar(o);
    editar.sel = null; pegada.visible = false; ferrEd.style.display = 'none';
  }


  // ================= MISSÕES =================
  const CADEIA = [
    {t:'colher', id:'trigo', n:5, r:30}, {t:'vender', n:50, r:25}, {t:'plantar', id:'cenoura', n:3, r:40},
    {t:'nivel', n:2, r:50}, {t:'ter', id:'lote', n:2, r:60}, {t:'ter', id:'galinheiro', n:1, r:80},
    {t:'animais', id:'galinha', n:3, r:120}, {t:'plantar', id:'trigo', n:6, r:60}, {t:'ter', id:'moinho', n:1, r:100},
    {t:'fazer', id:'racaoG', n:3, r:120}, {t:'alimentar', n:6, r:120}, {t:'coletar', id:'ovo', n:10, r:150},
    {t:'nivel', n:3, r:150}, {t:'ter', id:'curral', n:1, r:200}, {t:'animais', id:'vaca', n:2, r:250},
    {t:'fazer', id:'racaoV', n:2, r:200}, {t:'coletar', id:'leite', n:4, r:250}, {t:'terras', n:1, r:300},
    {t:'colher', id:'milho', n:10, r:200}, {t:'animais', id:'vaca', n:3, r:300}, {t:'ter', id:'curral', n:2, r:500},
    {t:'pet', id:'cachorro', n:1, r:600}, {t:'ter', id:'pasto', n:1, r:800}, {t:'animais', id:'ovelha', n:3, r:900},
    {t:'ter', id:'padaria', n:1, r:500}, {t:'fazer', id:'pao', n:3, r:300}, {t:'fazer', id:'bolo', n:1, r:500},
    {t:'fazer', id:'racaoO', n:3, r:600}, {t:'coletar', id:'la', n:5, r:800}, {t:'ter', id:'laticinio', n:1, r:900},
    {t:'fazer', id:'queijo', n:2, r:700}, {t:'ter', id:'tecelagem', n:1, r:1200}, {t:'fazer', id:'cachecol', n:2, r:1000},
    {t:'terras', n:3, r:1500}, {t:'ter', id:'cozinha', n:1, r:1800}, {t:'fazer', id:'torta', n:2, r:2000},
    {t:'colher', id:'alface', n:10, r:600}, {t:'fazer', id:'salada', n:2, r:900}, {t:'fazer', id:'sanduiche', n:2, r:1200},
    {t:'ter', id:'coelheira', n:1, r:1500}, {t:'animais', id:'coelho', n:3, r:1800}, {t:'fazer', id:'racaoC', n:3, r:1200},
    {t:'coletar', id:'angora', n:5, r:2000}, {t:'fazer', id:'luvas', n:2, r:2200}, {t:'fazer', id:'gorro', n:1, r:3000},
  ];
  const ABSOLUTA = ['nivel', 'ter', 'animais', 'terras', 'pet'];
  function valorMissao(m) {
    switch (m.t) {
      case 'colher': return S.stats.colheu[m.id] || 0;
      case 'plantar': return S.stats.plantou[m.id] || 0;
      case 'coletar': return S.stats.coletou[m.id] || 0;
      case 'vender': return S.stats.vendeu;
      case 'nivel': return S.nivel;
      case 'ter': return nTipo(m.id);
      case 'animais': return qtdAnimal(m.id);
      case 'terras': return zonasCompradas();
      case 'pet': return S.amigos[m.id] ? 1 : 0;
      case 'fazer': return S.stats.fez[m.id] || 0;
      case 'alimentar': return S.stats.alimentou || 0;
    }
    return 0;
  }
  const progMissao = m => Math.max(0, Math.min(m.n, valorMissao(m) - (m.base || 0)));
  function textoMissao(m) {
    const it = m.id && item(m.id), nome = it ? `${it.emoji} ${it.nome.toLowerCase()}` : '';
    switch (m.t) {
      case 'colher': return `Colha ${m.n} ${nome}`;
      case 'plantar': return `Plante ${m.n} ${nome}`;
      case 'coletar': return `Colete ${m.n} ${nome}`;
      case 'vender': return `Ganhe ${fmtN(m.n)} moedas vendendo`;
      case 'nivel': return `Chegue ao nível ${m.n}`;
      case 'ter': return m.id === 'lote' ? `Tenha ${m.n} lotes de plantio` : m.n === 1 ? `Construa um ${TIPOS[m.id].nome.toLowerCase()}` : `Tenha ${m.n} ${TIPOS[m.id].nome.toLowerCase()}s`;
      case 'animais': return `Tenha ${m.n} ${ANIMAIS[m.id].plural.toLowerCase()} ${ANIMAIS[m.id].emoji}`;
      case 'terras': return m.n === 1 ? 'Libere uma terra nova 🌳' : `Libere ${m.n} terras novas 🌳`;
      case 'pet': return `Adote um ${PETS[m.id].especie.toLowerCase()} 🐾`;
      case 'fazer': return `Faça ${m.n}× ${it.nome.toLowerCase()} ${emojiItem(it)}`;
      case 'alimentar': return `Alimente ${m.n} animais 🥣`;
    }
    return '';
  }
  function ativarMissao(def) { const m = Object.assign({}, def); m.base = ABSOLUTA.includes(m.t) ? 0 : valorMissao(m); m.xp = Math.round(m.r / 5) + 5; return m; }
  function gerarMissao() { // depois da história, missões infinitas que crescem com o nível
    const L = S.nivel, tipo = Math.random(), crops = CROPS.filter(c => c.nivel <= L);
    S.missoes.geradas++;
    const prods = EXTRAS.filter(e => qtdAnimal(e.animal));
    if (tipo > .82) { const rs = [...RACOES, ...PRODUTOS].filter(r => r.nivel <= L && nTipo(r.fab)); if (rs.length) { const r = rs[Math.random() * rs.length | 0]; const n = 2 + (L / 4 | 0); return {t:'fazer', id:r.id, n, r:Math.max(60 * L, Math.round(n * (r.preco || 40) * .6))}; } }
    if (tipo < .45) { const c = crops[Math.random() * crops.length | 0], n = 8 + L * 2; return {t:'colher', id:c.id, n, r:Math.round(n * c.preco * .5)}; }
    if (tipo < .7 && prods.length) { const e = prods[Math.random() * prods.length | 0], n = 6 + L * 2; return {t:'coletar', id:e.id, n, r:Math.round(n * e.preco * .5)}; }
    if (tipo < .85) { const n = Math.round(150 * L / 50) * 50; return {t:'vender', n, r:Math.round(n * .3)}; }
    const c = crops[crops.length - 1], n = 4 + L; return {t:'plantar', id:c.id, n, r:Math.round(n * c.preco * .4)};
  }
  function encherMissoes() {
    const M = S.missoes;
    while (M.ativas.length < 3) M.ativas.push(ativarMissao(M.idx < CADEIA.length ? CADEIA[M.idx++] : gerarMissao()));
  }
  function resgatarMissao(i) {
    const m = S.missoes.ativas[i]; if (!m || progMissao(m) < m.n) return;
    S.missoes.ativas.splice(i, 1);
    S.moedas += m.r; toast(`🏆 Missão completa! +${fmtN(m.r)} moedas e +${m.xp} XP`, 'ouro'); pulsar();
    ganharXp(m.xp); encherMissoes(); tudo();
  }
  const telaBaixa = () => window.innerHeight < 520;
  let missoesHTML = '', missoesAbertas = false;
  let guia = null; // mãozinha apontando o caminho de uma missão
  function apontar_(el, p3, ms = 7000) { guia = {el, p3, ate:Date.now() + ms, desde:Date.now()}; }
  function rolarAte(sel) { setTimeout(() => { const e = $(sel); if (e) e.scrollIntoView({block:'center', behavior:'smooth'}); }, 60); }
  function focar(p) { focoCam = p.clone(); }
  function guiarTerra() {
    const z = ZONAS.filter(z => !S.zonas.includes(z.key)).sort((a, b) => Math.hypot(a.zx - 2, a.zz - 2) - Math.hypot(b.zx - 2, b.zz - 2))[0];
    if (!z) return;
    const mx = z.cel.reduce((a, c) => a + c[0], 0) / z.cel.length * G, mz = z.cel.reduce((a, c) => a + c[1], 0) / z.cel.length * G;
    focar(V3(mx, 0, mz)); apontar_(null, () => V3(mx, 1.4, mz));
    toast(`Toque na placa 🔒 para liberar a terra (nível ${nivelZona()})`);
  }
  function guiarMissao(m) {
    const k = m.id;
    switch (m.t) {
      case 'colher': case 'plantar':
        if (S.nivel < crop(k).nivel) { toast(`${crop(k).nome} libera no nível ${crop(k).nivel}`); return; }
        if ((S.sementes[k] || 0) > 0) { fechar(); S.semSel = k; toast('Toque num canteiro vazio e escolha a semente (ou arraste por vários)'); }
        else { abrir('loja', 'sementes'); rolarAte(`[data-comprar=${k}]`); apontar_(() => $(`[data-comprar=${k}][data-q="10"]`) || $(`[data-comprar=${k}]`)); }
        return;
      case 'vender': abrir('armazem'); apontar_(() => $('[data-acao=vender-tudo]')); return;
      case 'coletar': {
        const an = EXTRAS.find(e => e.id === k).animal, o = cercadosDe(an)[0];
        if (!o) { abrir('loja', 'construcoes'); rolarAte(`[data-construir=${ANIMAIS[an].cercado}]`); apontar_(() => $(`[data-construir=${ANIMAIS[an].cercado}]`)); return; }
        if (!qtdAnimal(an)) { abrir('animais'); rolarAte(`[data-animal=${an}]`); apontar_(() => $(`[data-animal=${an}]`)); return; }
        fechar(); focar(centro(o)); apontar_(null, () => centro(o).add(V3(0, 1.5, 0))); toast('Toque no cercado para coletar'); return;
      }
      case 'nivel': toast('⭐ Ganhe XP colhendo, coletando dos animais e completando missões'); return;
      case 'ter': {
        const sub = decDe(k) ? 'decoracao' : 'construcoes';
        abrir('loja', sub); rolarAte(`[data-construir=${k}]`); apontar_(() => $(`[data-construir=${k}]`)); return;
      }
      case 'animais': {
        const cer = ANIMAIS[k].cercado;
        if (!nTipo(cer) || qtdAnimal(k) >= maxAnimal(k)) { abrir('loja', 'construcoes'); rolarAte(`[data-construir=${cer}]`); apontar_(() => $(`[data-construir=${cer}]`)); if (nTipo(cer)) toast(`Precisa de mais um ${TIPOS[cer].nome.toLowerCase()} para caber mais`); return; }
        abrir('animais'); rolarAte(`[data-animal=${k}]`); apontar_(() => $(`[data-animal=${k}]`)); return;
      }
      case 'terras': fechar(); guiarTerra(); return;
      case 'pet': abrir('animais'); rolarAte(`[data-adotar=${k}]`); apontar_(() => $(`[data-adotar=${k}]`)); return;
      case 'fazer': {
        const fb = item(k).fab, o = S.objetos.find(o => o.tipo === fb);
        if (!o) { abrir('loja', 'construcoes'); rolarAte(`[data-construir=${fb}]`); apontar_(() => $(`[data-construir=${fb}]`)); return; }
        focar(centro(o)); abrir('fabrica', fb); apontar_(() => $(`[data-receita=${k}]`)); return;
      }
      case 'alimentar': {
        const o = S.objetos.find(o => TIPOS[o.tipo].animal && estadoCercado(o).fome) || S.objetos.find(o => TIPOS[o.tipo].animal);
        if (!o) { abrir('loja', 'construcoes'); rolarAte('[data-construir=galinheiro]'); apontar_(() => $('[data-construir=galinheiro]')); return; }
        if (!qtdAnimal(TIPOS[o.tipo].animal)) { abrir('animais'); return; }
        fechar(); focar(centro(o)); apontar_(null, () => centro(o).add(V3(0, 1.5, 0))); toast('Toque no cercado para dar ração'); return;
      }
    }
  }
  function renderMissoes() {
    encherMissoes();
    const prontas = S.missoes.ativas.filter(m => progMissao(m) >= m.n).length;
    let h = `<button class="mis-topo" data-mis="toggle">📜 Missões ${prontas ? `<b class="mis-pronta">${prontas}</b>` : ''}<span>${missoesAbertas ? '▾' : '▸'}</span></button>`;
    const lista = missoesAbertas ? S.missoes.ativas : [];
    $('#missoes').classList.toggle('aberta', missoesAbertas);
    lista.forEach((m, i) => {
      const p = progMissao(m), ok = p >= m.n;
      h += `<div class="mis ${ok ? 'ok' : ''}" data-guia="${i}"><div class="mis-txt">${textoMissao(m)} ${ok ? '' : '<span class="mis-ir">👉</span>'}</div>
        <div class="mis-linha"><div class="mis-barra"><i style="width:${100 * p / m.n}%"></i></div><span>${fmtN(p)}/${fmtN(m.n)}</span></div>
        ${ok ? `<button class="btn verde mis-btn" data-mis="${i}">Resgatar ${moedaMini}${fmtN(m.r)}</button>` : `<div class="mis-premio">${moedaMini}${fmtN(m.r)} · ⭐${m.xp}</div>`}</div>`;
    });
    const nlc = typeof CHAT !== 'undefined' ? totalNaoLidas() : 0;
    h += `<button class="mis-topo chat-btn" data-chat-abrir="1">💬 Chat ${nlc ? `<b class="mis-pronta">${nlc}</b>` : ''}</button>`;
    if (h !== missoesHTML) { missoesHTML = h; $('#missoes').innerHTML = h; }
  }

  // ================= TUTORIAL =================
  const primeiro = f => { const i = S.plots.findIndex(f); return i < 0 ? 0 : i; };
  const celeiroObj = () => S.objetos.find(o => o.tipo === 'armazem') || S.objetos.find(o => o.tipo === 'celeiro');
  const TUT = [
    {txt:'Oi! Eu sou o Tonho. Bem-vindo à <b>Terrália Farm</b>! Vou te mostrar como cuidar da sua fazenda.', botao:'Vamos lá!'},
    {txt:'Toque num <b>canteiro vazio</b> e <b>arraste a sacola de trigo</b> por cima dele.', p3:() => posTile(primeiro(p => !p.c)), el:() => seletorAberto ? $('[data-sem=trigo]') : undefined, ok:() => S.plots.some(p => p.c) || heroi.fila.some(a => a.tipo === 'plantar') || (heroi.atual && heroi.atual.tipo === 'plantar')},
    {txt:'Toda planta precisa de água! Toque na plantinha com a gotinha 💧 e <b>arraste o regador</b> por cima dela.', p3:() => posTile(primeiro(p => p.c && !p.reg)), el:() => seletorAberto ? $('[data-ferr-arr]') : undefined, ok:() => S.plots.some(p => p.c && p.reg)},
    {txt:'Muito bem! Espere crescer, toque nela quando aparecer ✨ e <b>arraste a foice</b> por cima para colher.', p3:() => posTile(primeiro(p => p.c)), el:() => seletorAberto ? $('[data-ferr-arr]') : undefined, ok:() => S.colhidos > 0},
    {txt:'A colheita foi para o <b>Armazém</b>. Toque nele para vender! (O Celeiro guarda as sementes.)', p3:() => centro(celeiroObj()).add(V3(0, 3, 0)), el:() => janela ? null : undefined, ok:() => janela === 'armazem'},
    {txt:'Toque em <b>Vender tudo</b> para ganhar moedas.', el:() => $('[data-acao=vender-tudo]'), ok:() => S.stats.vendeu > 0},
    {txt:'Agora vamos comprar mais sementes na <b>Loja</b>.', el:() => janela ? $('.fechar') : $('.cantos [data-abrir=loja]'), ok:() => janela === 'loja'},
    {txt:'Compre <b>10 sementes de trigo</b>.', el:() => $('[data-comprar=trigo][data-q="10"]'), ok:() => S.stats.compras > 0},
    {txt:'Arraste a tela para passear pela fazenda e use a <b>pinça</b> (ou a rodinha) para zoom. No botão <b>🎥 Visão</b> você gira e centraliza a câmera.', el:() => $('[data-grupo=visao]'), botao:'Entendi', entrar:() => fechar()},
    {txt:'Prontinho! Siga as <b>Missões</b> aqui do lado para crescer sua fazenda. Boa colheita! 🌻', el:() => $('#missoes'), botao:'Bora!'},
  ];
  const moinhoObj = () => S.objetos.find(o => o.tipo === 'moinho');
  // 2ª parte do tutorial: aparece quando o jogador constrói o primeiro galinheiro
  const TUTB = [
    {txt:'Que legal, seu primeiro galinheiro! 🐔 Agora compre uma <b>galinha</b> em Animais.', el:() => janela === 'animais' ? $('[data-animal=galinha]') : janela ? $('#jabas [data-abrir=animais]') : $('.cantos [data-abrir=animais]'), ok:() => qtdAnimal('galinha') > 0},
    {txt:'Galinhas só botam ovos depois de comer. Você ganhou rações de presente! Toque no <b>galinheiro</b> para dar ração.', entrar:() => fechar(), p3:() => centro(cercadosDe('galinha')[0]).add(V3(0, 1.5, 0)), el:() => janela ? null : undefined, ok:() => S.stats.alimentou > 0},
    {txt:'Quando a ração acabar, você faz mais no <b>Moinho</b>. A ração é feita de <b>trigo</b> 🌾. Toma 6 sementes de trigo de presente!', botao:'Oba!', entrar:() => { S.sementes.trigo = (S.sementes.trigo || 0) + 6; renderHotbar(); }},
    {txt:'Plante <b>3 trigos</b>: toque num canteiro vazio e escolha o <b>trigo</b> (ou arraste por vários). Não esqueça de regar!', el:() => janela ? null : seletorAberto ? $('[data-sem=trigo]') : null, ok:() => (S.stats.plantou.trigo || 0) >= 3},
    {txt:'Agora compre um <b>Moinho</b> na loja, na aba Construções.', el:() => janela === 'loja' && subLoja === 'construcoes' ? $('[data-construir=moinho]') : janela === 'loja' ? $('[data-sub=construcoes]') : $('.cantos [data-abrir=construir]'), ok:() => nTipo('moinho') > 0},
    {txt:'Escolha o lugar do moinho e toque em <b>Concluir</b>.', el:() => editar.ativo ? $('.barra-edicao [data-ed=concluir]') : null, ok:() => !editar.ativo},
    {txt:'Colha o trigo quando ficar pronto ✨ e depois toque no <b>Moinho</b>.', p3:() => centro(moinhoObj()).add(V3(0, 3, 0)), el:() => janela ? null : undefined, ok:() => janela === 'fabrica'},
    {txt:'Toque em <b>Produzir</b> na Ração de galinha (precisa de 3 trigos no armazém; rende 3 porções).', el:() => $('[data-receita=racaoG]'), ok:() => listaMoinhos().some(o => fabEstado('moinho', o.id).fila.length > 0) || (S.stats.fez.racaoG || 0) > 0},
    {txt:'Isso! Quando ficar pronta, toque no moinho para pegar a ração e depois no galinheiro para alimentar. É assim que a fazenda cresce: 🌾 ➜ 🥣 ➜ 🥚 ➜ 💰', botao:'Entendi!'},
  ];
  function tutAtual() {
    if (S.tut >= 0 && S.tut < TUT.length) return {lista:TUT, i:S.tut, chave:'tut'};
    if (S.tutB >= 0 && S.tutB < TUTB.length) return {lista:TUTB, i:S.tutB, chave:'tutB'};
    return null;
  }
  const balao = $('#tutorial'), mao = $('#maozinha');
  function mostrarTutorial() {
    const T = S.perfil ? tutAtual() : null, ativo = !!T;
    document.body.classList.toggle('em-tutorial', ativo && T.i < T.lista.length - 1);
    balao.style.display = ativo ? 'flex' : 'none';
    if (!ativo) { mao.style.display = 'none'; return; }
    const st = T.lista[T.i];
    balao.querySelector('.tut-txt').innerHTML = st.txt;
    const b = balao.querySelector('[data-tut=prox]'); b.style.display = st.botao ? '' : 'none'; b.textContent = st.botao || '';
  }
  function avancarTutorial() {
    const T = tutAtual(); if (!T) return;
    S[T.chave]++;
    if (S[T.chave] >= T.lista.length) { S[T.chave] = -1; toast(T.chave === 'tut' ? '🎉 Tutorial concluído! Bom jogo!' : '🎉 Agora você sabe cuidar dos animais!', 'ouro'); }
    else if (T.lista[S[T.chave]].entrar) T.lista[S[T.chave]].entrar();
    mostrarTutorial(); salvar();
  }
  function verificarTutorial() {
    if (!S.perfil) return;
    if (S.tut === -1 && S.tutB === -2 && nTipo('galinheiro') > 0 && !editar.ativo) { S.tutB = 0; mostrarTutorial(); }
    const T = tutAtual(); if (T) { const st = T.lista[T.i]; if (st.ok && st.ok()) avancarTutorial(); }
  }
  function posicionarMao() {
    let st; const T = S.perfil ? tutAtual() : null;
    if (T) st = T.lista[T.i];
    else if (guia && guia.ate > Date.now()) st = guia;
    else { if (guia) guia = null; mao.style.display = 'none'; return; }
    let x = null, y = null;
    const el = st.el ? st.el() : undefined;
    if (el) { const r = el.getBoundingClientRect(); if (r.width) { x = r.left + r.width / 2; y = r.top + r.height / 2; } }
    else if (el !== null && st.p3) { const v = st.p3().project(camera); x = (v.x + 1) / 2 * window.innerWidth; y = (1 - v.y) / 2 * window.innerHeight; }
    if (x == null) { mao.style.display = 'none'; return; }
    mao.style.display = 'block'; mao.style.left = x + 'px'; mao.style.top = y + 'px';
  }
  balao.addEventListener('click', e => {
    const a = e.target.closest('[data-tut]'); if (!a) return;
    if (a.dataset.tut === 'prox') avancarTutorial();
    if (a.dataset.tut === 'pular') { const T = tutAtual(); if (T) S[T.chave] = -1; mostrarTutorial(); salvar(); toast('Tutorial pulado. Siga as Missões! 📜'); }
  });
  $('#missoes').addEventListener('click', e => {
    const b = e.target.closest('[data-mis]'); if (!b) return;
    if (b.dataset.mis === 'toggle') { missoesAbertas = !missoesAbertas; renderMissoes(); } else resgatarMissao(+b.dataset.mis);
  });
  $('#missoes').addEventListener('click', e => {
    if (e.target.closest('[data-mis]')) return;
    const c = e.target.closest('[data-guia]'); if (!c) return;
    const m = S.missoes.ativas[+c.dataset.guia]; if (m) guiarMissao(m);
  });
  document.addEventListener('pointerdown', e => { if (guia && Date.now() - guia.desde > 400 && !e.target.closest('#missoes')) guia.ate = Date.now() + 250; }, true);

  // ================= INTERFACE =================
  const moedaMini = `<span class="m-ico">${ICO.moeda || '🪙'}</span>`;
  function renderHUD() {
    $('#moedas').textContent = fmtN(S.moedas);
    $('#nivel').textContent = S.nivel;
    const prox = xpProx(S.nivel);
    $('#xpbar').style.width = (100 * S.xp / prox) + '%';
    $('#xptxt').textContent = `${fmtN(S.xp)} / ${fmtN(prox)} XP`;
    const tot = VENDAVEIS.reduce((a, c) => a + (S.celeiro[c.id] || 0), 0);
    const b = $('#badgeArmazem'); b.style.display = tot ? 'block' : 'none'; b.textContent = tot > 99 ? '99+' : tot; b.classList.toggle('cheio', usoArmazem() >= capArmazem());
    const pend = S.objetos.filter(o => TIPOS[o.tipo].animal).reduce((a, o) => a + estadoCercado(o).prontos, 0);
    const ba = $('#badgeAnimais'); ba.style.display = pend ? 'block' : 'none'; ba.textContent = pend > 99 ? '99+' : pend;
    $('#dicaCampo').textContent = dicaFerramenta();
  }
  // barra de baixo: Colher, Regar e Plantar (a semente é escolhida num painel acima da barra)
  let seletorAberto = false, destaqueSem = null;
  const semAtual = () => { const c = crop(S.semSel) && crop(S.semSel).nivel <= S.nivel ? crop(S.semSel) : CROPS[0]; return c; };
  function renderHotbar() {
    const plantando = !!crop(S.ferramenta);
    const slot = (id, ico, nome, qtd, ativo, extra = '') => `<button class="slot ${ativo ? 'ativo' : ''} ${extra}" data-ferr="${id}"><span class="ico">${ico}</span><small>${nome}</small>${qtd != null ? `<span class="qtd">${qtd}</span>` : ''}</button>`;
    const c = semAtual(), q = S.sementes[c.id] || 0;
    const hb = slot('mao', ICO.cesta, 'Colher', null, S.ferramenta === 'mao') + slot('regador', ICO.regador, 'Regar', null, S.ferramenta === 'regador')
      + slot('plantar', ICO.saco + `<span class="emo">${c.emoji}</span>`, 'Plantar', q, plantando, (q ? '' : 'vazio ') + 'plantar' + (seletorAberto ? ' aberto' : '')).replace('</button>', '<span class="seta">▲</span></button>');
    if (hb !== hotbarHTML) { hotbarHTML = hb; $('#hotbar').innerHTML = hb; }
    renderSeletor();
  }
  let hotbarHTML = '';
  let alvoPlantio = null, paginaSem = 0;
  let modoSel = 'sementes';
  const FOICE = '<svg viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg" stroke-linejoin="round" stroke-linecap="round"><path d="M14 10c22-6 42 6 44 26-10-14-26-18-40-12z" fill="#dfe6ee" stroke="#3b4652" stroke-width="3.2"/><path d="M20 14c14-3 28 2 34 12" stroke="#fff" stroke-width="2.4" fill="none" opacity=".8"/><path d="M18 24l-8 34" stroke="#7a4a1c" stroke-width="7"/><path d="M18 24l-8 34" stroke="#c98640" stroke-width="3.5"/><circle cx="17" cy="25" r="4" fill="#59606a" stroke="#2c333b" stroke-width="2"/></svg>';
  function abrirFerramenta(modo, i) {
    if (VISITA) return; alvoPlantio = i; modoSel = modo; seletorAberto = true;
    renderSeletor(); verificarTutorial();
  }
  function posicionarSeletor() {
    const el = $('#seletorSem'); if (!seletorAberto || alvoPlantio == null || !tiles[alvoPlantio]) { el.style.cssText = ''; el.classList.remove('flutua'); return; }
    const v = posTile(alvoPlantio).project(camera), x = (v.x + 1) / 2 * innerWidth, y = (1 - v.y) / 2 * innerHeight;
    el.classList.add('flutua');
    const w = el.offsetWidth, h = el.offsetHeight, emCima = y - h - 34 > 8;
    el.style.left = Math.max(8, Math.min(innerWidth - w - 8, x - w / 2)) + 'px';
    el.style.top = (emCima ? y - h - 34 : Math.min(innerHeight - h - 8, y + 30)) + 'px';
  }
  function abrirPlantio(i) {
    if (VISITA) return; alvoPlantio = i; modoSel = 'sementes'; seletorAberto = true;
    const lib = CROPS.filter(c => c.nivel <= S.nivel), k = lib.findIndex(c => c.id === semAtual().id); paginaSem = Math.max(0, Math.floor(k / 6));
    renderSeletor(); verificarTutorial();
  }
  function renderSeletor() {
    const el = $('#seletorSem'); el.classList.toggle('on', seletorAberto); if (!seletorAberto) { el.classList.remove('flutua', 'arrastando'); el.style.cssText = ''; return; }
    if (modoSel === 'insumos' || modoSel === 'catar') {
      const p = S.plots[alvoPlantio] || {}, cat = modoSel === 'catar';
      const ks = Object.keys(INSUMOS).filter(k => S.nivel >= INSUMOS[k].nivel && (!cat || k === 'antipraga'));
      const bts = (cat ? [`<button class="sem ferr-arr" data-ferr-arr="catar"><span class="ico"><span class="emo-g">🖐️</span></span><small>Catar</small></button>`] : [])
        .concat(ks.map(k => { const q = qtdIns(k), serve = insumoServe(k, p);
          return `<button class="sem ins ${q ? '' : 'vazio'} ${serve ? '' : 'usado'}" data-ins="${k}" title="${INSUMOS[k].desc}"><span class="ico"><span class="emo-g">${INSUMOS[k].emoji}</span></span><small>${INSUMOS[k].nome.split(' ')[0]}</small>${q ? `<span class="qtd">${q}</span>` : '<span class="mais" data-comprar-ins="1">+</span>'}</button>`; }));
      const c = crop(p.c), pr = Math.floor(progresso(p) * 100), avisos = [temPraga(p) && '🐛 bichinho!', p.dobro && '🌟 colheita dobrada', p.prot && '🧴 protegida', p.rap && '⚡ adubada'].filter(Boolean);
      el.innerHTML = `<div class="tempo-card"><div class="tc-anel" style="--p:${pr}"><span>${c.emoji}</span></div><div class="tc-txt"><b data-tc-tempo="1">${fmtT(restante(p) / 1000)}</b><small>${c.nome} · <span data-tc-pct="1">${pr}</span>%</small>${avisos.length ? `<em>${avisos.join(' · ')}</em>` : ''}</div></div>` + (bts.length ? `<div class="sel-lista ferr">${bts.join('')}</div>` : '');
      posicionarSeletor(); return;
    }
    if (modoSel !== 'sementes') {
      const col = modoSel === 'colher';
      el.innerHTML = `<div class="sel-lista ferr"><button class="sem ferr-arr" data-ferr-arr="${modoSel}"><span class="ico">${col ? FOICE : ICO.regador}</span><small>${col ? 'Foice' : 'Regador'}</small></button></div>`;
      posicionarSeletor(); return;
    }
    const atual = semAtual().id, lib = CROPS.filter(c => c.nivel <= S.nivel), pags = Math.ceil(lib.length / 6); paginaSem = Math.min(paginaSem, pags - 1);
    el.innerHTML = '<div class="sel-linha">' + (pags > 1 ? `<button class="pg" data-sel="ant" ${paginaSem ? '' : 'disabled'}>◀</button>` : '') + '<div class="sel-lista pag">' + lib.slice(paginaSem * 6, paginaSem * 6 + 6).map(c => { const q = S.sementes[c.id] || 0;
      return `<button class="sem ${c.id === atual ? 'ativo' : ''} ${q ? '' : 'vazio'}" data-sem="${c.id}"><span class="ico">${ICO.saco}<span class="emo">${c.emoji}</span></span><small>${c.nome}</small>${q ? `<span class="qtd">${q}</span>` : '<span class="mais" data-comprar-sem="1">+</span>'}</button>`; }).join('') + '</div>' + (pags > 1 ? `<button class="pg" data-sel="prox" ${paginaSem < pags - 1 ? '' : 'disabled'}>▶</button>` : '') + '</div>';
    posicionarSeletor();
  }
  function abrirSeletor(v) { seletorAberto = v; if (!v) alvoPlantio = null; renderSeletor(); }

  let janela = null, zonaSel = null;
  const TITULOS = {fabrica:'Fábrica', loja:'Loja', celeiro:'Celeiro', armazem:'Armazém', animais:'Animais', ajuda:'Como jogar', config:'Configurações', reset:'Recomeçar?', zona:'Terra nova', moinho:'Moinho', nome:'Nome do bichinho', perfil:'Seu personagem', pedidos:'🚚 Pedidos', amigos:'👥 Amigos', banca:'🏪 Banca', ranking:'🏆 Ranking', nuvem:'☁️ Qual fazenda usar?', contas:'👥 Trocar de conta', nomeRank:'✏️ Nome no ranking'};
  let janelaArg = null, perfilTemp = null;
  const ABAS = ['armazem', 'celeiro', 'animais']; // só estas três dividem a mesma janela
  const SUBLOJA = {sementes:'🌱 Sementes', insumos:'🧪 Adubos', construcoes:'🏗️ Construções', decoracao:'🌸 Decoração', melhorias:'⚡ Melhorias'};
  let subLoja = 'sementes', vitrineChave = '';
  function abrir(nome, sub) {
    if (VISITA && nome !== 'config') { toast('Você está visitando. Volte para casa para usar isso 🏠'); return; }
    if (editar.ativo && nome !== 'config') return;
    if (nome === 'melhorias' || nome === 'construir' || nome === 'decoracao') { sub = nome === 'construir' ? 'construcoes' : nome; nome = 'loja'; }
    if (nome === 'coop' || nome === 'amigos') { SOC.aba = nome === 'coop' ? 'coop' : 'amigos'; nome = 'amigos'; }
    if (nome === 'ranking') ON.rank = null;
    if (nome === 'amigos') { SOC.amigos = null; COOP.meu = undefined; }
    if (nome === 'banca') { BAN.ofertas = null; clearInterval(BAN.timer); BAN.timer = setInterval(() => { if (janela === 'banca' && !document.hidden) carregarBanca(true); else if (janela !== 'banca') clearInterval(BAN.timer); }, 20000); }
    if (nome === 'loja') subLoja = sub || (janela === 'loja' ? subLoja : 'sementes');
    if (nome === 'nome' || nome === 'fabrica') janelaArg = sub;
    if (nome === 'moinho') { nome = 'fabrica'; janelaArg = 'moinho'; }
    if (nome === 'perfil') { perfilTemp = Object.assign(avPadrao(), S.perfil && S.perfil.avatar); previaAvatar(perfilTemp); }
    janela = nome; $('#fundo').classList.add('aberto'); renderJanela(); verificarTutorial(); }
  function fechar() { if (janela === 'perfil' && !S.perfil) return; janela = null; $('#fundo').classList.remove('aberto'); if (!S.viuAjuda) { S.viuAjuda = true; salvar(); } if (typeof verificarTutorial === 'function') verificarTutorial(); }
  function renderJanela() {
    if (!janela) return;
    $('#jtitulo').innerHTML = `<span class="contorno">${janela === 'fabrica' ? FABRICAS[janelaArg].emoji + ' ' + FABRICAS[janelaArg].nome + (janelaArg === 'moinho' && listaMoinhos().length > 1 ? ' ' + numMoinho(fabEstadoId()) : '') : TITULOS[janela]}</span>`;
    $('#jabas').innerHTML = ABAS.includes(janela) ? ABAS.map(k => `<button data-abrir="${k}" class="${k === janela ? 'ativa' : ''}">${TITULOS[k]}</button>`).join('') : '';
    $('.janela').classList.toggle('larga', ['loja', 'armazem', 'celeiro', 'animais', 'pedidos', 'banca'].includes(janela));
    let h = '';
    const tile = o => `<div class="tile ${o.trava ? 'trava' : ''} ${o.cls || ''}" ${o.attr || ''}>
      ${o.selo ? `<span class="selo ${o.seloCls || ''}">${o.selo}</span>` : ''}
      <div class="t-ic">${o.ic}</div><div class="t-nome">${o.nome}</div>
      <div class="t-info">${o.info}</div><div class="t-acao">${o.acao}</div></div>`;

    if (janela === 'loja') {
      // loja em "vitrine": cartões grandes lado a lado, rolando para o lado
      const DICAS = {sementes:'Toque num canteiro vazio e arraste a sacola de sementes por cima dos canteiros.', insumos:'Toque numa planta crescendo e arraste o adubo ou o spray por cima dela.', construcoes:'Depois de comprar, arraste para onde quiser e toque ✓.',
        decoracao:'Só deixam a fazenda mais bonita. Dá para vender pela metade no modo edição.', melhorias:'Fazem você ganhar mais e trabalhar mais rápido.'};
      h += `<div class="loja-topo"><div class="subabas">${Object.entries(SUBLOJA).map(([k, v]) => `<button data-sub="${k}" class="${k === subLoja ? 'ativa' : ''}">${v}</button>`).join('')}</div>
        <p class="dica">${DICAS[subLoja]}</p></div><div class="vitrine">`;
      if (subLoja === 'sementes') CROPS.forEach(c => {
        const trava = S.nivel < c.nivel, t = c.tempo * velocidade(), q = S.sementes[c.id] || 0;
        h += tile({trava, cls:c.id === destaqueSem ? 'destaque' : '', attr:`data-card-sem="${c.id}"`,
          selo:trava ? `🔒 Nível ${c.nivel}` : q ? `Você tem ${q}` : '', seloCls:trava ? 'trava' : '',
          ic:`<span class="saco-card">${ICO.saco}<span class="emo">${c.emoji}</span></span>`, nome:c.nome,
          info:`<span>⏱ ${fmtT(t)}</span><span>Vende ${moedaMini}${c.preco}</span><span class="sobe">lucro ${fmtN(c.preco - c.semente)}</span>`,
          acao:trava ? '' : `<button class="btn verde" data-comprar="${c.id}" data-q="1" ${S.moedas < c.semente ? 'disabled' : ''}>${moedaMini}${c.semente}</button>
            <button class="btn" data-comprar="${c.id}" data-q="10" ${S.moedas < c.semente * 10 ? 'disabled' : ''}>×10</button>`});
      });
      if (subLoja === 'insumos') Object.entries(INSUMOS).forEach(([k, n]) => {
        const trava = S.nivel < n.nivel, q = qtdIns(k);
        h += tile({trava, selo:trava ? `🔒 Nível ${n.nivel}` : q ? `Você tem ${q}` : '', seloCls:trava ? 'trava' : '',
          ic:`<span class="emo-card">${n.emoji}</span>`, nome:n.nome, info:`<span class="desc">${n.desc}</span>`,
          acao:trava ? '' : `<button class="btn verde" data-comprar-insumo="${k}" data-q="1" ${S.moedas < n.preco ? 'disabled' : ''}>${moedaMini}${n.preco}</button>
            <button class="btn" data-comprar-insumo="${k}" data-q="5" ${S.moedas < n.preco * 5 ? 'disabled' : ''}>×5</button>`});
      });
      if (subLoja === 'construcoes') {
        const livres = ZONAS.filter(z => !S.zonas.includes(z.key)).length;
        CONSTRUCOES.filter(c => c.tipo !== 'poco').forEach(c => {
          const T = TIPOS[c.tipo], nv = nivelConstrucao(c.tipo), trava = S.nivel < nv, custo = custoConstrucao(c.tipo), n = nTipo(c.tipo), feito = c.unico && n > 0, lim = LIMITES[c.tipo];
          h += tile({trava:trava && !n, selo:trava ? `🔒 ${n ? 'Próximo no nível' : 'Nível'} ${nv}` : lim ? `${n}/${Math.max(n, maxPermitido(c.tipo))}` : n && !feito ? `Você tem ${n}` : '', seloCls:trava ? 'trava' : '',
            ic:`<span class="emo-g">${c.icone}</span>`, nome:T.nome, info:`<span class="desc">${c.desc}</span>`,
            acao:trava ? '' : feito ? '<span class="ok">✓ Construído</span>' : `<button class="btn verde" data-construir="${c.tipo}" ${S.moedas < custo ? 'disabled' : ''}>${moedaMini}${fmtN(custo)}</button>`});
        });
        h += tile({selo:`${S.zonas.length}/${ZONAS.length}`, ic:'<span class="emo-g">🌳</span>', nome:'Terras',
          info:`<span class="desc">${livres ? `Mais espaço para construir. Próxima: ${moedaMini}${fmtN(custoZona())} · nível ${nivelZona()}` : 'Você liberou a ilha inteira!'}</span>`,
          acao:livres ? `<button class="btn" data-acao="ver-terra">Ver</button>` : ''});
        if (ANEL < MAX_ANEL) { const pode = ilhaCheia(), nv = nivelExpansao(), cx = custoExpansao();
          h += tile({trava:!pode || S.nivel < nv, selo:`Ilha ${ANEL + 1}/${MAX_ANEL + 1}`, seloCls:!pode || S.nivel < nv ? 'trava' : 'max', ic:'<span class="emo-g">🏝️</span>', nome:'Expansão da ilha',
            info:`<span class="desc">${!pode ? 'Libere todas as terras da ilha primeiro.' : S.nivel < nv ? `Disponível no nível ${nv}.` : 'A ilha cresce para todos os lados!'}</span><span class="mats">${matsDe('ilha').map(m => `<span class="${((S.mat || {})[m] || 0) >= matsExpansao() ? 'ok' : ''}" title="${MATERIAIS[m].nome}">${matIco(m)}${(S.mat || {})[m] || 0}/${matsExpansao()}</span>`).join('')}</span>`,
            acao:pode && S.nivel >= nv ? `<button class="btn verde" data-acao="expandir" ${S.moedas < cx ? 'disabled' : ''}>${moedaMini}${fmtN(cx)}</button>` : `<span class="nv">${moedaMini}${fmtN(cx)} · nível ${nv}</span>`}); }
        h += tile({ic:'<span class="emo-g">✏️</span>', nome:'Modo edição', info:'<span class="desc">Mova e gire suas construções.</span>', acao:`<button class="btn" data-acao="editar">Editar</button>`});
      }
      if (subLoja === 'decoracao') DECOR.forEach(c => {
        const T = TIPOS[c.tipo], trava = S.nivel < c.nivel, n = nTipo(c.tipo);
        h += tile({trava, selo:trava ? `🔒 Nível ${c.nivel}` : n ? `Você tem ${n}` : '', seloCls:trava ? 'trava' : '', ic:`<span class="emo-g">${c.icone}</span>`, nome:T.nome,
          info:`<span>Ocupa ${T.w}×${T.d}</span>`, acao:trava ? '' : `<button class="btn verde" data-construir="${c.tipo}" ${S.moedas < c.preco ? 'disabled' : ''}>${moedaMini}${fmtN(c.preco)}</button>`});
      });
      if (subLoja === 'melhorias') for (const k in UPG) {
        const u = UPG[k], l = S.upg[k] || 0, max = l >= u.max, custo = custoUpg(k), trava = !max && S.nivel < u.niv[l];
        h += tile({trava:trava && !l, selo:trava ? (l ? `${l}/${u.max} · próximo no nível ${u.niv[l]}` : `🔒 Nível ${u.niv[l]}`) : u.max > 1 ? `${l}/${u.max}` : l ? 'Ativo' : '', seloCls:trava ? 'trava' : max ? 'max' : '',
          ic:`<span class="emo-g">${u.emoji}</span>`, nome:u.nome, info:`<span class="desc">${u.desc}</span>`,
          acao:trava ? '' : `<button class="btn ${max ? '' : 'verde'}" data-upg="${k}" ${max || S.moedas < custo ? 'disabled' : ''}>${max ? (u.max > 1 ? 'Máximo' : 'Ok') : moedaMini + fmtN(custo)}</button>`});
      }
      h += '</div>';
    }
    const barraCap = (uso, cap, k) => { const ms = matsDe(k), n = matsAmpliar(k), ok = temMats(ms, n) && S.moedas >= custoAmpliar(k);
      return `<div class="cap"><div class="cap-txt">📦 ${uso}/${cap}</div><div class="mis-barra"><i style="width:${Math.min(100, 100 * uso / cap)}%;${uso >= cap ? 'background:#e0503a' : ''}"></i></div>
      <span class="mats">${ms.map(m => `<span class="${((S.mat || {})[m] || 0) >= n ? 'ok' : ''}" title="${MATERIAIS[m].nome}">${matIco(m)}${(S.mat || {})[m] || 0}/${n}</span>`).join('')}</span>
      <button class="btn ${ok ? 'verde' : ''}" data-ampliar="${k}">Ampliar +30 · ${moedaMini}${fmtN(custoAmpliar(k))}</button></div>`; };
    if (janela === 'celeiro') {
      h += `<div class="loja-topo">${barraCap(usoCeleiro(), capCeleiro(), 'celeiro')}<p class="dica">Aqui ficam as suas <b>sementes</b>. Use o botão <b>Plantar</b> lá embaixo para escolher qual plantar.</p></div><div class="vitrine">`;
      CROPS.filter(c => c.nivel <= S.nivel || S.sementes[c.id]).forEach(c => {
        const q = S.sementes[c.id] || 0;
        h += tile({selo:`× ${q}`, seloCls:q ? '' : 'trava', ic:`<span class="saco-card">${ICO.saco}<span class="emo">${c.emoji}</span></span>`, nome:c.nome,
          info:`<span>⏱ ${fmtT(c.tempo * velocidade())}</span><span>Semente ${moedaMini}${c.semente}</span>`,
          acao:`<button class="btn verde" data-comprar="${c.id}" data-q="1" ${S.moedas < c.semente ? 'disabled' : ''}>+1</button><button class="btn" data-comprar="${c.id}" data-q="10" ${S.moedas < c.semente * 10 ? 'disabled' : ''}>+10</button>`});
      });
      h += '</div>';
    }
    if (janela === 'armazem') {
      const ev = eventoAtivo();
      let total = 0; VENDAVEIS.forEach(c => total += (S.celeiro[c.id] || 0) * precoAtual(c.id));
      h += `<div class="loja-topo"><div class="topo-linha">${barraCap(usoArmazem(), capArmazem(), 'armazem')}<button class="btn verde" data-acao="vender-tudo" ${total ? '' : 'disabled'}>Vender tudo · ${moedaMini}${fmtN(total)}</button></div>
        ${ev ? `<div class="evento">📣 Feira de ${crop(ev.id).emoji} ${crop(ev.id).nome}: preço em dobro!</div>` : '<p class="dica">Os preços mudam a cada 20 segundos. Guardar e vender na alta dá mais lucro.</p>'}</div><div class="vitrine">`;
      const lista = VENDAVEIS.filter(c => (c.nivel ? c.nivel <= S.nivel : qtdAnimal(c.animal)) || S.celeiro[c.id]).sort((a, b) => (S.celeiro[b.id] ? 1 : 0) - (S.celeiro[a.id] ? 1 : 0));
      lista.forEach(c => {
        const q = S.celeiro[c.id] || 0, pr = precoAtual(c.id), td = S.tend[c.id] || 0;
        const seta = td > 0 ? '<b class="sobe">▲</b>' : td < 0 ? '<b class="desce">▼</b>' : '';
        h += tile({cls:q ? '' : 'vazio', selo:`× ${q}`, seloCls:q ? '' : 'trava', ic:`<span class="emo-g">${c.emoji}</span>`, nome:c.nome,
          info:`<span class="preco-g">${moedaMini}${pr} ${seta}</span><span>cada</span>`,
          acao:`<button class="btn" data-vender="${c.id}" ${q ? '' : 'disabled'}>Vender</button>`});
      });
      h += tile({cls:'larga', selo:'Materiais', seloCls:'max', ic:'<span class="emo-g">🧰</span>', nome:'Materiais',
        info:`<span class="desc">Caem ao colher e produzir. Servem para ampliar e expandir.</span><span class="mats-todos">${Object.keys(MATERIAIS).map(m => `<b title="${MATERIAIS[m].nome}">${matIco(m)}${(S.mat || {})[m] || 0}</b>`).join('')}</span>`, acao:''});
      RACOES.filter(r => S.celeiro[r.id]).forEach(r => h += tile({selo:`× ${S.celeiro[r.id]}`, seloCls:'max', ic:iconeItem(r, 'grande'), nome:r.nome,
        info:`<span>Cada porção alimenta 1 ${ANIMAIS[r.animal].nome.toLowerCase()}</span>`, acao:'<span class="ok">Para os bichos</span>'}));
      h += '</div>';
    }
    if (janela === 'animais') {
      atualizarProducao();
      h += `<div class="loja-topo"><div class="topo-linha"><p class="dica" style="flex:1;white-space:normal">Cada animal come <b>1 ração</b> para produzir. O fazendeiro coleta o que estiver pronto e dá ração para quem tiver fome.</p><button class="btn verde" data-acao="cuidar-todos">🐾 Cuidar de todos</button>${Object.keys(pets).length ? `<button class="btn" data-acao="chamar-pets">${S.seguir ? '🐕 Soltar bichinhos' : '🐕 Chamar bichinhos'}</button>` : ''}</div></div><div class="vitrine">`;
      for (const k in ANIMAIS) {
        const a = ANIMAIS[k], n = qtdAnimal(k), mx = maxAnimal(k), it = item(a.prod), r = item(a.racao), cc = custoConstrucao(a.cercado), nvC = LIMITES[a.cercado] ? nivelDaN(a.cercado, 0) : nivelConstrucao(a.cercado), nvProx = nivelConstrucao(a.cercado);
        const trava = S.nivel < Math.max(a.nivel, nvC), nomeC = TIPOS[a.cercado].nome.toLowerCase();
        const ic = a.img ? `<span class="foto-g"><img src="assets/img/${a.img}" alt=""></span>` : `<span class="emo-g">${a.emoji}</span>`;
        if (trava) { h += tile({trava:true, selo:`🔒 Nível ${Math.max(a.nivel, nvC)}`, seloCls:'trava', ic, nome:a.plural, info:`<span>Dão ${it.emoji} ${it.nome.toLowerCase()}</span>`, acao:''}); continue; }
        if (!nTipo(a.cercado)) {
          h += tile({selo:'0', ic, nome:a.plural, info:`<span class="desc">Primeiro construa ${TIPOS[a.cercado].fem ? 'uma' : 'um'} ${nomeC}.</span>`,
            acao:`<button class="btn verde" data-construir="${a.cercado}" ${S.moedas < cc ? 'disabled' : ''}>${moedaMini}${fmtN(cc)}</button>`});
          continue;
        }
        let pr = 0, fome = 0, prod = 0; cercadosDe(k).forEach(o => { const e = estadoCercado(o); pr += e.prontos; fome += e.fome; prod += e.prod; });
        const est = n ? [prod ? `⏳ ${prod} produzindo` : '', fome ? `🍽️ ${fome} com fome` : '', pr ? `${it.emoji} ${pr} pronto(s)` : ''].filter(Boolean).join(' · ') : 'Nenhum ainda';
        h += tile({cls:'larga', selo:`${n}/${mx}`, ic, nome:a.plural,
          info:`<span>${iconeItem(r, 'mini-ic')} ${S.celeiro[r.id] || 0} · 1 = ${a.porRacao} ${it.emoji} · ${fmtT(a.tempo)}</span><span>${est}</span>`,
          acao:`<div class="t-col">${n && cercadosDe(k).some(o => objNaFila(o.id)) ? '<button class="btn" disabled>🚶 A caminho…</button>' : n ? `<button class="btn verde" data-ir-cercado="${k}">${pr ? `Coletar ${pr} ${it.emoji}` : fome ? (S.celeiro[r.id] > 0 ? 'Dar ração 🥣' : 'Sem ração') : (TIPOS[a.cercado].fem ? 'Ir à ' : 'Ir ao ') + nomeC}</button>` : ''}
            ${fome && !(S.celeiro[r.id] > 0) ? `<button class="btn" data-ir-moinho="1">Fazer ração</button>` : ''}
            <button class="btn" data-animal="${k}" ${n >= mx || S.moedas < custoAnimal(k) ? 'disabled' : ''}>${n >= mx ? 'Cheio' : `+1 ${a.emoji} · ${moedaMini}${fmtN(custoAnimal(k))}`}</button>
            ${S.nivel < nvProx ? `<span class="nv">Novo ${nomeC} no nível ${nvProx}</span>` : `<button class="btn" data-construir="${a.cercado}" ${S.moedas < cc ? 'disabled' : ''}>➕ ${TIPOS[a.cercado].nome} · ${moedaMini}${fmtN(cc)}</button>`}</div>`});
      }
      for (const k in PETS) {
        const a = PETS[k], tem = S.amigos[k], trava = S.nivel < a.nivel;
        h += tile({trava:trava && !tem, cls:tem ? 'amigo-ok' : '', selo:tem ? 'Na fazenda' : trava ? `🔒 Nível ${a.nivel}` : 'Bichinho', seloCls:tem ? 'max' : trava ? 'trava' : '',
          ic:a.img ? `<span class="foto-g"><img src="assets/img/${a.img}" alt=""></span>` : `<span class="emo-g">${a.emoji}</span>`, nome:tem ? `${nomePet(k)} <button class="lapis" data-renomear="${k}">✏️</button>` : a.especie,
          info:`<span class="desc">${a.desc}</span>`, acao:tem || trava ? '' : `<button class="btn verde" data-adotar="${k}" ${S.moedas < a.custo ? 'disabled' : ''}>${moedaMini}${fmtN(a.custo)}</button>`});
      }
      h += '</div>';
    }
    if (janela === 'fabrica') {
      const t = janelaArg, F = FABRICAS[t], M = fabEstado(t), vagas = vagasFab(t), prontos = prontosFab(t);
      atualizarFab(t);
      h += `<div class="fab-topo">`;
      for (let i = 0; i < vagas; i++) {
        const f = M.fila[i];
        if (!f) { h += `<div class="slotfab vazio">+</div>`; continue; }
        const r = item(f.id);
        h += `<div class="slotfab ${i === 0 ? 'ativo' : ''}">${iconeItem(r, 'e')}${i === 0 ? `<small data-fabtempo="1">${tempoCurto(f.dur - (Date.now() - (f.t0 || Date.now())))}</small><i class="pb" data-fabbarra="1" style="width:${f.t0 ? Math.min(100, 100 * (Date.now() - f.t0) / f.dur) : 0}%"></i>` : '<small>fila</small>'}</div>`;
      }
      h += `${prontos ? `<button class="btn verde" data-acao="coletar-fab">Pegar ×${prontos}</button>` : ''}</div>`;
      F.receitas.forEach(r => {
        const trava = S.nivel < r.nivel, ok = temIngredientes(r) && M.fila.length < vagas;
        const ings = Object.entries(r.ing).map(([id, n]) => { const q = S.celeiro[id] || 0; return `<span class="ing ${q >= n ? 'tem' : 'falta'}">${item(id).emoji}${q}/${n}</span>`; }).join('');
        const tem = S.celeiro[r.id] || 0;
        h += `<div class="receita ${trava ? 'trava' : ''} ${destaqueRec === r.id ? 'destaque' : ''}" data-rec="${r.id}">${iconeItem(r, 'e')}<div class="meio"><b>${r.nome}</b> <span class="tem-qtd ${tem ? '' : 'zero'}">×${tem}</span>${trava ? ` <span class="nv">Nível ${r.nivel}</span>` : ''}
          <div class="det">${ings} <span>⏱${tempoCurto(r.tempo * 1000)}</span> ${r.rende ? `<span>×${r.rende} porções</span>` : `<span>💰${r.preco}</span>`}</div></div>
          ${trava ? '' : `<button class="btn verde" data-receita="${r.id}" ${ok ? '' : 'disabled'}>+1</button><button class="btn" data-receita="${r.id}" data-max="1" ${ok ? '' : 'disabled'}>Máx</button>`}</div>`;
      });
    }
    if (janela === 'nome') {
      const k = janelaArg;
      h += `<div class="texto"><p>Como vai se chamar ${k === 'cachorro' ? 'o seu cachorrinho' : 'a sua raposinha'}?</p>
        <input class="campo" id="inpNome" maxlength="14" value="${nomePet(k)}">
        <div class="acoes"><button class="btn verde" data-acao="salvar-nome">Salvar</button></div></div>`;
    }
    if (janela === 'perfil') {
      const t = perfilTemp, nome = S.perfil ? S.perfil.nome : '';
      const chips = (campo, lista) => lista.map(([k, n]) => `<button class="chip ${t[campo] === k ? 'sel' : ''}" data-av="${campo}" data-v="${k}">${n}</button>`).join('');
      const cores = (campo, lista) => lista.map((c, i) => `<button class="cor ${t[campo] === i ? 'sel' : ''}" style="background:#${c.toString(16).padStart(6, '0')}" data-av="${campo}" data-v="${i}"></button>`).join('');
      const tog = (campo, n) => `<button class="chip ${t[campo] ? 'sel' : ''}" data-av="${campo}" data-v="toggle">${t[campo] ? '✓ ' : ''}${n}</button>`;
      h += `<p class="dica">${S.perfil ? 'Mude seu personagem quando quiser.' : 'Antes de começar, monte o seu fazendeiro ou a sua fazendeira!'}</p>
        <div class="editor-av"><div class="prev" id="prevAvatar"></div><div class="opcoes">
          <div class="op"><b>💇 Cabelo</b><div class="chips">${chips('cabelo', AV.cabelos)}</div></div>
          <div class="op"><b>🎨 Cor do cabelo</b><div class="chips">${cores('corCabelo', AV.corCabelo)}</div></div>
          <div class="op"><b>🙂 Pele</b><div class="chips">${cores('pele', AV.pele)}</div></div>
          <div class="op"><b>👀 Olhos</b><div class="chips">${cores('olhos', AV.olhos)}</div></div>
          <div class="op"><b>👕 Camisa</b><div class="chips">${cores('camisa', AV.camisa)}</div></div>
          <div class="op"><b>👖 Macacão</b><div class="chips">${cores('macacao', AV.macacao)}</div></div>
          <div class="op"><b>🤠 Chapéu</b><div class="chips">${chips('chapeu', AV.chapeus)}</div></div>
          <div class="op"><b>😊 Detalhes</b><div class="chips">${tog('bochecha', 'Bochecha rosada')}${tog('sardas', 'Sardas')}${tog('cilios', 'Cílios')}</div></div>
        </div></div>
        <p style="margin:6px 4px 0;font-weight:700">Seu nome:</p><input class="campo" id="inpPerfil" maxlength="14" placeholder="Digite seu nome" value="${nome}">
        <div class="acoes"><button class="btn" data-av="aleatorio">🎲 Aleatório</button>${S.perfil ? '<button class="btn" data-abrir="config">⚙️ Configurações</button>' : ''}<button class="btn verde" data-acao="salvar-perfil">${S.perfil ? 'Salvar' : 'Começar! 🌱'}</button></div>`;
    }
    if (janela === 'zona') {
      const custo = custoZona(), nv = nivelZona(), ok = S.nivel >= nv && S.moedas >= custo;
      h += `<div class="texto"><p>Limpe o mato e as árvores desta área para ganhar mais espaço para plantações, cercados e construções.</p>
        <div class="linha-cfg"><span>Custo</span><b>${moedaMini}${fmtN(custo)}</b></div>
        <div class="linha-cfg"><span>Nível necessário</span><b>${nv} ${S.nivel >= nv ? '✅' : `(você está no ${S.nivel})`}</b></div>
        <div class="acoes"><button class="btn" data-acao="fechar">Agora não</button><button class="btn verde" data-zona="${zonaSel}" ${ok ? '' : 'disabled'}>Liberar terra</button></div></div>`;
    }
    if (janela === 'ajuda') {
      h += `<div class="texto"><ul>
        <li>Escolha um <b>saquinho de sementes</b> na barra de baixo e toque num canteiro vazio.</li>
        <li>Pegue o <b>regador</b> e regue: a planta só cresce depois de regada.</li>
        <li>Quando aparecer ✨, toque para <b>colher</b>. A colheita vai para o <b>Armazém</b>, onde você vende.</li>
        <li>O <b>Celeiro</b> guarda suas sementes. Os dois têm espaço limitado: amplie quando encher!</li>
        <li>Compre <b>animais</b> e toque no cercado para coletar ovos, leite e lã.</li>
        <li>Em <b>Construir</b> você compra lotes, cercados e outras construções. Use <b>✏️ Editar</b> para mudar tudo de lugar.</li>
        <li>Toque nas placas 🔒 para liberar terras e siga as <b>Missões</b> para ganhar prêmios.</li>
        <li>Toque no chão para andar. Arraste para mover a câmera, use a pinça para zoom e o botão ⟳ para girar a visão.</li>
      </ul><p>O progresso fica salvo neste aparelho, e o que estiver regado continua crescendo com o jogo fechado.</p>
      <div class="acoes"><button class="btn verde" data-acao="fechar">Bora plantar!</button></div></div>`;
    }
    if (janela === 'config') {
      const au = S.audio || {};
      h += `<div class="linha-cfg"><span>🎵 Música</span><input type="range" class="vol" data-vol="musica" min="0" max="1" step="0.05" value="${au.musica ?? .5}"></div>
        <div class="linha-cfg"><span>🔔 Efeitos e bichos</span><input type="range" class="vol" data-vol="efeitos" min="0" max="1" step="0.05" value="${au.efeitos ?? .8}"></div>
        <div class="linha-cfg"><span>${au.mudo ? '🔇' : '🔊'} Som</span><button class="btn ${au.mudo ? 'vermelho' : ''}" data-acao="mudo">${au.mudo ? 'Desligado' : 'Ligado'}</button></div>
        <div class="linha-cfg"><span>🎨 Gráficos</span><button class="btn" data-acao="qualidade">${S.leve ? 'Leve (mais rápido)' : 'Bonito'}</button></div>
        ${instalado() ? '' : `<div class="linha-cfg"><span>📲 Jogar como app (tela cheia, sem barra do navegador)</span>${pedidoInstalar ? '<button class="btn verde" data-acao="instalar">Instalar</button>' : '<span class="det">No Chrome: menu ⋮ → Instalar app</span>'}</div>`}
        ${htmlOnlineCfg()}
        <div class="linha-cfg"><span>❓ Como jogar</span><button class="btn" data-abrir="ajuda">Abrir</button></div>
        <div class="linha-cfg"><span>📊 ${fmtN(S.colhidos)} colhidos · ${fmtN(S.ganho)} moedas ganhas</span></div>
        <div class="linha-cfg"><span>🌱 <b>Terrália Farm</b> · versão ${VERSAO}<br><small class="det">${novaVersao ? `Nova versão ${esc(novaVersao)} disponível!` : 'O jogo se atualiza sozinho quando abre.'}</small></span>
          <button class="btn ${novaVersao ? 'verde' : ''}" data-acao="${novaVersao ? 'atualizar-ja' : 'procurar-versao'}">${novaVersao ? 'Atualizar agora' : 'Procurar atualização'}</button></div>
        <p class="dica legal">🎵 Músicas e sons: Mixkit (licença livre), OpenGameArt (CC0) e Pixabay.</p>
        <p class="dica legal"><a href="privacidade.html" target="_blank">Privacidade</a> · <a href="termos.html" target="_blank">Termos de uso</a></p>
        ${MODO_TESTE ? '<div class="linha-cfg"><span>↺ Recomeçar do zero (teste)</span><button class="btn vermelho" data-abrir="reset">Recomeçar</button></div>' : ''}`;
    }
    if (janela === 'ranking') h += htmlRanking();
    if (janela === 'pedidos') h += htmlPedidos();
    if (janela === 'banca') h += htmlBanca();
    if (janela === 'amigos') h += (ON.user ? `<div class="subabas"><button data-social="amigos" class="${SOC.aba !== 'coop' ? 'ativa' : ''}">👥 Amigos</button><button data-social="coop" class="${SOC.aba === 'coop' ? 'ativa' : ''}">🤝 Cooperativa</button></div>` : '') + (SOC.aba === 'coop' && ON.user ? htmlCoop() : htmlAmigos());
    if (janela === 'nuvem') h += htmlNuvem();
    if (janela === 'contas') h += htmlContas();
    if (janela === 'nomeRank') h += htmlNome();
    if (janela === 'reset') {
      h += `<div class="texto"><p>Você vai perder moedas, nível, construções, sementes, melhorias, animais e terras. Não dá para desfazer.</p>
      <div class="acoes"><button class="btn" data-acao="fechar">Cancelar</button><button class="btn vermelho" data-acao="reset-sim">Recomeçar</button></div></div>`;
    }
    const vOld = $('#jcorpo .vitrine'), chaveV = janela + subLoja, sl = vOld && vitrineChave === chaveV ? vOld.scrollLeft : 0; vitrineChave = chaveV;
    $('#jcorpo').innerHTML = h;
    const vNew = $('#jcorpo .vitrine'); if (vNew) vNew.scrollLeft = sl;
    if (janela === 'perfil') { const pv = $('#prevAvatar'); if (pv) pv.appendChild(mini.r.domElement); }
  }

  let fotoTonho = null;
  function aplicarAvatar() {
    const img = $('#avatarImg'); if (img && S.perfil) img.src = retrato(S.perfil.avatar);
    if (!fotoTonho) fotoTonho = retrato(null, true);
    $('.tut-avatar img').src = fotoTonho;
  }
  function salvarPerfil() {
    const nome = ($('#inpPerfil').value || '').trim().slice(0, 14) || 'Fazendeiro';
    const primeira = !S.perfil;
    S.perfil = {nome, avatar:Object.assign({}, perfilTemp)};
    if (heroi.g) { const pos = heroi.g.position.clone(), rot = heroi.g.rotation.y; scene.remove(heroi.g); heroi.g = criarFazendeiro(); heroi.g.position.copy(pos); heroi.g.rotation.y = rot; scene.add(heroi.g); }
    aplicarAvatar(); salvar(); janela = 'x'; fechar();
    toast(primeira ? `Bem-vindo(a), ${nome}! 🌻` : 'Personagem atualizado!', 'bom');
    if (primeira) setTimeout(mostrarTutorial, 300);
  }
  function tudo() { if (editar.ativo) renderBarraConstrucao(); renderFila(); tudo_(); }
  function tudo_() { renderHUD(); renderHotbar(); renderJanela(); S.plots.forEach((p, i) => atualizarTile(i)); atualizarBaloes(); renderMissoes(); verificarTutorial(); salvar(); }
  function pulsar() { const c = $('#chipMoedas'); c.classList.remove('pulse'); void c.offsetWidth; c.classList.add('pulse'); }

  // ================= EFEITOS =================
  function toast(msg, tipo = '') {
    const t = document.createElement('div'); t.className = 'toast ' + tipo; t.textContent = msg;
    $('#toasts').appendChild(t); setTimeout(() => t.remove(), 2600);
    while ($('#toasts').children.length > 3) $('#toasts').firstChild.remove();
  }
  const flutuantes = [];
  function flutuar(pos, txt) {
    const el = document.createElement('div'); el.className = 'flutua contorno'; el.textContent = txt; document.body.appendChild(el);
    flutuantes.push({el, pos, t0:performance.now()});
  }
  const particulas = [];
  const geoPart = new THREE.BoxGeometry(.12, .12, .12), geoGota = new THREE.SphereGeometry(1, 6, 5);
  function poeiraEm(base, cor) {
    for (let k = 0; k < 10; k++) {
      const m = new THREE.Mesh(geoPart, mat(cor)); m.position.set(base.x + rnd(-.8, .8), .4, base.z + rnd(-.8, .8)); scene.add(m);
      particulas.push({m, v:V3(rnd(-1, 1), rnd(2, 4), rnd(-1, 1)), t0:performance.now(), g:1, vida:.7});
    }
  }
  const poeira = (i, cor) => poeiraEm(posTile(i), cor);
  function chuva(i, cor, r) {
    const base = posTile(i);
    for (let k = 0; k < 16; k++) {
      const m = new THREE.Mesh(geoGota, liso(cor)); m.scale.setScalar(r); m.position.set(base.x + rnd(-.8, .8), rnd(1.4, 2.4), base.z + rnd(-.8, .8)); scene.add(m);
      particulas.push({m, v:V3(0, rnd(-1, 0), 0), t0:performance.now() + k * 25, g:1, vida:.75, chao:.3});
    }
  }
  function faisca(pos) {
    const s = sprite('✨', .3); s.position.copy(pos).add(V3(rnd(-.3, .3), rnd(-.2, .2), rnd(-.3, .3))); scene.add(s);
    particulas.push({m:s, v:V3(0, -.4, 0), t0:performance.now(), g:0, vida:.8});
  }

  // ================= ENTRADA =================
  const ray = new THREE.Raycaster(), mouse = new THREE.Vector2(), tip = $('#tip');
  const planoChao = new THREE.Plane(V3(0, 1, 0), 0);
  let hoverI = -1, hoverObj = null, downPos = null, toques = 0;
  function apontar(ev) {
    const r = canvas.getBoundingClientRect();
    mouse.x = ((ev.clientX - r.left) / r.width) * 2 - 1; mouse.y = -((ev.clientY - r.top) / r.height) * 2 + 1;
    ray.setFromCamera(mouse, camera);
  }
  function pickTile() { const hit = ray.intersectObjects(tiles.filter(Boolean).map(t => t.base))[0]; return hit ? hit.object.userData.i : -1; }
  function pickConstrucao(incluirLotes) {
    const hits = ray.intersectObjects(pickObjs);
    for (const h of hits) { const o = objPorId(h.object.userData.objId); if (o && (incluirLotes || o.tipo !== 'lote')) return o; }
    return null;
  }
  function pickTerra() { const hit = ray.intersectObjects(clicaveisTerra)[0]; return hit ? hit.object.userData.zona : null; }
  function pontoChao() { const p = V3(); return ray.ray.intersectPlane(planoChao, p) ? p : null; }
  function textoTip(i) {
    const p = S.plots[i]; if (!p.c) return 'Canteiro vazio';
    const c = crop(p.c);
    if (!p.reg) return `${c.emoji} ${c.nome} · precisa de água`;
    if (pronto(p)) return `${c.emoji} ${c.nome} · pronta para colher!`;
    return `${c.emoji} ${c.nome} · ${fmtT(restante(p) / 1000)} · ${Math.floor(progresso(p) * 100)}%${temPraga(p) ? ' · 🐛 bichinho!' : ''}`;
  }
  function textoObj(o) {
    if (typeof o === 'string') return `🔒 Terra nova · ${fmtN(custoZona())} moedas · nível ${nivelZona()}`;
    const T = TIPOS[o.tipo];
    if (o.tipo === 'celeiro') return `Celeiro · sementes ${usoCeleiro()}/${capCeleiro()}`;
    if (o.tipo === 'armazem') return `Armazém · itens ${usoArmazem()}/${capArmazem()}`;
    if (o.tipo === 'loja') return 'Loja · comprar sementes';
    if (T.animal) {
      const k = T.animal, an = ANIMAIS[k];
      if (!qtdAnimal(k)) return `${T.nome} · compre ${an.plural.toLowerCase()}`;
      const e = estadoCercado(o);
      return `${an.plural} · ${e.prontos ? `coletar ${e.prontos} ${item(an.prod).emoji}` : e.fome ? `🍽️ ${e.fome} com fome` : `próximo em ${fmtT(e.prox / 1000)}`}`;
    }
    if (T.fab) { const f = fabEstado(o.tipo, o.tipo === 'moinho' ? o.id : undefined).fila[0]; return f && f.t0 ? `${T.nome} · ${item(f.id).nome} em ${fmtT((f.dur - (Date.now() - f.t0)) / 1000)}` : `${T.nome} · produzir`; }
    return T.nome;
  }

  // arrastar o dedo pelos canteiros: planta (com saquinho), rega (com regador) ou colhe (qualquer ferramenta, se estiver pronto)
  function modoTile(i) { // o canteiro decide o que fazer: vazio = plantar, sem água = regar, pronto = colher
    const p = S.plots[i];
    if (pronto(p)) return 'colher';
    if (!p.c) return 'plantar';
    if (!p.reg) return 'regar';
    return null;
  }
  // arrastar a semente, a foice ou o regador do balão por cima dos canteiros (estilo Hay Day)
  const arr = {ativo:false, tipo:null, id:null, x0:0, y0:0, moveu:false, feitos:new Set(), avisou:false, ate:0};
  const fant = document.createElement('div'); fant.className = 'fantasma'; document.body.appendChild(fant);
  function aplicarArr(i) {
    if (i < 0 || arr.feitos.has(i) || naFila(i)) return;
    const pq = S.plots[i];
    if (!(arr.tipo === 'insumo' ? insumoServe(arr.id, pq) : arr.tipo === 'catar' ? temPraga(pq) : modoTile(i) === arr.tipo)) return;
    arr.feitos.add(i);
    if (arr.tipo === 'insumo') { if (qtdIns(arr.id) < 1) { if (!arr.avisou) { arr.avisou = true; toast(`Acabou: ${INSUMOS[arr.id].nome}`); } return; } usarInsumo(arr.id, i); somT('pop', 40); return; }
    if (arr.tipo === 'catar') { enfileirarGrupo('catar', i); somT('pop', 40); return; }
    if (arr.tipo === 'plantar') {
      const f = arr.id;
      if ((S.sementes[f] || 0) - semFila(f) <= 0) { if (!arr.avisou) { arr.avisou = true; toast(`Acabaram as sementes de ${crop(f).nome}`); } return; }
      enfileirarPlantio(i, f); somT('pop', 40);
    } else if (arr.tipo === 'regar') { enfileirarGrupo('regar', i); somT('agua', 120); }
    else if (arr.tipo === 'colher') {
      if (livreArmazem() - colhendoNaFila() < 1) { if (!arr.avisou) { arr.avisou = true; avisarCheio(); } return; }
      enfileirarGrupo('colher', i); somT('pop', 40);
    }
  }
  $('#seletorSem').addEventListener('pointerdown', ev => {
    const b = ev.target.closest('[data-sem], [data-ferr-arr], [data-ins]'); if (!b || ev.target.closest('[data-comprar-sem], [data-comprar-ins]')) return;
    let tipo, id = null;
    if (b.dataset.sem) { id = b.dataset.sem; if (!(S.sementes[id] || 0)) return; tipo = 'plantar'; S.semSel = id; }
    else if (b.dataset.ins) { id = b.dataset.ins; if (!qtdIns(id)) { abrirSeletor(false); abrir('loja', 'insumos'); return; } tipo = 'insumo'; }
    else tipo = b.dataset.ferrArr;
    Object.assign(arr, {ativo:true, tipo, id, x0:ev.clientX, y0:ev.clientY, moveu:false, feitos:new Set(), avisou:false});
    fant.innerHTML = b.querySelector('.ico').outerHTML; fant.style.left = ev.clientX + 'px'; fant.style.top = ev.clientY + 'px';
  });
  window.addEventListener('pointermove', ev => {
    if (!arr.ativo) return;
    if (!arr.moveu) { if (Math.hypot(ev.clientX - arr.x0, ev.clientY - arr.y0) < 10) return; arr.moveu = true; controls.enabled = false; fant.classList.add('on'); $('#seletorSem').classList.add('arrastando'); }
    fant.style.left = ev.clientX + 'px'; fant.style.top = ev.clientY + 'px';
    apontar(ev); aplicarArr(pickTile());
  });
  const fimArr = () => {
    if (!arr.ativo) return; arr.ativo = false; fant.classList.remove('on'); controls.enabled = true;
    if (arr.moveu) { arr.ate = arrastoAcabou = Date.now(); downPos = null; abrirSeletor(false); salvar(); verificarTutorial(); return; }
    arr.ate = Date.now(); if (alvoPlantio != null) dicaArrasto(arr.tipo, alvoPlantio, arr.id); // só tocou: não faz nada, ensina a arrastar
  };
  window.addEventListener('pointerup', fimArr); window.addEventListener('pointercancel', fimArr);
  let arrastoAcabou = 0;
  function dicaArrasto(tipo, i, id) {
    const el = $('#dicaArr'), v = posTile(i).project(camera), x = (v.x + 1) / 2 * innerWidth, y = (1 - v.y) / 2 * innerHeight, sr = $('#seletorSem').getBoundingClientRect();
    const ic = {plantar:ICO.saco, regar:ICO.regador, colher:FOICE}[tipo] || `<span class="emo-g">${tipo === 'catar' ? '🖐️' : id && INSUMOS[id] ? INSUMOS[id].emoji : '🧴'}</span>`;
    const txt = {plantar:'Arraste a semente pelos canteiros para plantar', regar:'Arraste o regador por cima das plantas para regar', colher:'Arraste a foice por cima para colher', catar:'Arraste a mão por cima para catar o bichinho'}[tipo] || 'Arraste por cima das plantas para usar';
    const nome = tipo === 'plantar' && id ? `${crop(id).emoji} ${crop(id).nome}` : tipo === 'insumo' && id ? `${INSUMOS[id].emoji} ${INSUMOS[id].nome}` : {regar:'💧 Regador', colher:'✂️ Foice', catar:'🖐️ Catar bichinho'}[tipo] || '';
    const desc = tipo === 'insumo' && id ? INSUMOS[id].desc : tipo === 'catar' ? 'O fazendeiro tira o bichinho da planta (de graça).' : '';
    el.innerHTML = `<div class="da-trilha"><i></i><i></i><i></i><span class="da-ic">${ic}</span></div><div class="da-txt">${nome ? `<b class="da-nome">${nome}</b>` : ''}${desc ? `<span class="da-desc">${desc}</span>` : ''}<span>${txt}</span></div>`;
    const acima = sr.top > 150; el.style.left = Math.max(130, Math.min(innerWidth - 130, x)) + 'px'; el.style.top = (acima ? sr.top - 6 : Math.min(innerHeight - 10, sr.bottom + 110)) + 'px';
    el.classList.remove('on'); void el.offsetWidth; el.classList.add('on'); clearTimeout(el._t); el._t = setTimeout(() => el.classList.remove('on'), 3200);
  }

  // segurar o dedo numa construção: anel enche e ela "levanta" para mover (abre o modo edição)
  const segEl = document.createElement('div'); segEl.className = 'segurar'; segEl.innerHTML = '<svg viewBox="0 0 64 64"><circle cx="32" cy="32" r="26" class="trilho"/><circle cx="32" cy="32" r="26" class="enche"/></svg><b>⬆</b>'; document.body.appendChild(segEl);
  const seg = {t:null, o:null, x:0, y:0};
  function cancelarSeg() { clearTimeout(seg.t); seg.t = null; seg.o = null; segEl.classList.remove('on'); }
  window.addEventListener('pointerdown', ev => {
    cancelarSeg();
    if (editar.ativo || VISITA || ev.target !== canvas || ev.button === 2 || dedos.size > 0 || (S.tut >= 0 && S.tut <= 7)) return;
    apontar(ev); const o = pickConstrucao(true); if (!o) return;
    Object.assign(seg, {o, x:ev.clientX, y:ev.clientY});
    segEl.style.left = ev.clientX + 'px'; segEl.style.top = ev.clientY + 'px';
    seg.tv = setTimeout(() => { if (seg.o) segEl.classList.add('on'); }, 150);
    seg.t = setTimeout(() => {
      const ob = seg.o; cancelarSeg(); if (!ob || dedos.size > 1) return;
      abrirSeletor(false); entrarEdicao(); selecionar(ob); editar.arrastando = true; controls.enabled = false; downPos = null; arrastoAcabou = Date.now();
      somT('pop'); if (navigator.vibrate) try { navigator.vibrate(25); } catch (e) {}
      renderBarraConstrucao();
    }, 650);
  }, true);
  window.addEventListener('pointermove', ev => { if (seg.o && Math.hypot(ev.clientX - seg.x, ev.clientY - seg.y) > 10) cancelarSeg(); });
  window.addEventListener('pointerup', cancelarSeg); window.addEventListener('pointercancel', cancelarSeg);

  // arrastar construção no modo edição (antes da câmera receber o toque)
  window.addEventListener('pointerdown', ev => {
    if (!editar.ativo || !editar.sel || ev.target !== canvas) return;
    apontar(ev);
    if (pickConstrucao(true) === editar.sel) { editar.arrastando = true; controls.enabled = false; }
  }, true);
  window.addEventListener('pointermove', ev => {
    if (!editar.arrastando) return;
    apontar(ev); const p = pontoChao(); if (p) moverSel(p);
  });
  window.addEventListener('pointerup', () => { if (editar.arrastando) { editar.arrastando = false; controls.enabled = true; downPos = null; } });

  canvas.addEventListener('pointermove', ev => {
    if (ev.pointerType !== 'mouse' || ev.buttons || editar.ativo) { hoverI = -1; hoverObj = null; tip.style.display = 'none'; return; }
    apontar(ev); hoverI = pickTile(); hoverObj = hoverI < 0 ? (pickConstrucao(false) || pickTerra()) : null;
    if (hoverObj && typeof hoverObj !== 'string' && !clicavel(hoverObj)) hoverObj = null;
    const txt = hoverI >= 0 ? textoTip(hoverI) : hoverObj ? textoObj(hoverObj) : '';
    if (txt) { tip.style.display = 'block'; tip.style.left = ev.clientX + 'px'; tip.style.top = ev.clientY + 'px'; tip.textContent = txt; canvas.style.cursor = 'pointer'; }
    else { tip.style.display = 'none'; canvas.style.cursor = 'grab'; }
  });
  canvas.addEventListener('pointerleave', () => { hoverI = -1; hoverObj = null; tip.style.display = 'none'; });
  const dedos = new Set();
  canvas.addEventListener('pointerdown', ev => { dedos.add(ev.pointerId); toques = dedos.size; downPos = toques === 1 && ev.button !== 2 ? {x:ev.clientX, y:ev.clientY} : null; });
  const soltarDedo = ev => { dedos.delete(ev.pointerId); toques = dedos.size; };
  window.addEventListener('pointerup', soltarDedo); window.addEventListener('pointercancel', soltarDedo);
  canvas.addEventListener('pointerup', ev => {
    dedos.delete(ev.pointerId); toques = dedos.size;
    if (Date.now() - arrastoAcabou < 60) { downPos = null; return; }
    if (!downPos || Math.hypot(ev.clientX - downPos.x, ev.clientY - downPos.y) > 9) { if (!toques) downPos = null; return; }
    downPos = null;
    apontar(ev);
    if (editar.ativo) { // toque no modo edição: seleciona ou leva a seleção até o ponto
      const o = pickConstrucao(true);
      if (o && o !== editar.sel) { selecionar(o); return; }
      if (!o && editar.sel) { const p = pontoChao(); if (p) moverSel(p); }
      return;
    }
    const i = pickTile(); if (i >= 0) { clicarTile(i); return; }
    if (heroi.atual && ray.intersectObject(heroi.g, true).length) { idsAcao(heroi.atual).forEach(j => marcar(j, false)); heroi.atual = null; heroi.acao = null; heroi.rota = []; renderFila(); toast('✋ Tarefa atual cancelada'); return; }
    for (const k in pets) if (ray.intersectObject(pets[k].g, true).length) { const p = pets[k]; if (p.rot) { p.rot.visible = true; clearTimeout(p.rotT); p.rotT = setTimeout(() => { if (p.rot) p.rot.visible = false; }, 3000); } flutuar(p.g.position.clone().add(V3(0, 1.2, 0)), '💕'); somT(k, 600); return; }
    if (tonho && ray.intersectObject(tonho, true).length) { irPara(tonho.position.clone().add(V3(.8, 0, .8))); abrir('ajuda'); return; }
    const o = pickConstrucao(false); if (clicavel(o)) { clicarConstrucao(o); return; }
    const z = pickTerra(); if (z) { const tg = terras[z]; if (tg && tg.userData.rotulo) { const r = tg.userData.rotulo; r.visible = true; clearTimeout(r.userData.t); r.userData.t = setTimeout(() => r.visible = false, 3500); } zonaSel = z; abrir('zona'); return; }
    const p = pontoChao(); if (p) { const d = ajustarDestino(p.clone()); if (!enfileirar({tipo:'andar', pos:d})) return; marcador.position.set(d.x, .06, d.z); marcador.visible = true; marcadorT = 1; }
  });
  canvas.addEventListener('pointercancel', () => { dedos.clear(); toques = 0; downPos = null; });

  let focoCam = null;
  function girarCamera() { azAlvo += Math.PI / 2; S.az = (S.az + 1) % 4; }
  // grupos de botões: tocar abre/fecha; tocar fora fecha
  const fecharGrupos = () => document.querySelectorAll('.grupo.aberto').forEach(g => g.classList.remove('aberto'));
  document.querySelectorAll('[data-grupo]').forEach(b => b.addEventListener('click', e => { e.stopPropagation(); const g = b.parentElement, ab = g.classList.contains('aberto'); fecharGrupos(); if (!ab) g.classList.add('aberto'); }));
  document.querySelectorAll('.flyout').forEach(f => f.addEventListener('click', () => setTimeout(fecharGrupos, 120)));
  window.addEventListener('pointerdown', e => { if (!e.target.closest('.grupo')) fecharGrupos(); }, true);
  $('#btnGirar').addEventListener('click', girarCamera);
  $('#btnCentro').addEventListener('click', () => { focoCam = heroi.g.position.clone(); });

  $('#btnEditar').addEventListener('click', () => { if (editar.ativo) sairEdicao(); else { entrarEdicao(); toast('Toque numa construção para mover'); } });
  document.addEventListener('click', e => {
    const ed = e.target.closest('[data-ed]'); if (!ed) return;
    const a = ed.dataset.ed;
    if (a === 'girar') girarSel(); if (a === 'ok') confirmarSel(); if (a === 'cancelar') cancelarSel(); if (a === 'concluir') sairEdicao(); if (a === 'vender') venderSel();
  });

  $('#filaUI').addEventListener('click', e => { const b = e.target.closest('[data-fila]'); if (!b) return; if (b.dataset.fila === 'tudo') { limparFila(); toast('✋ Lista de afazeres cancelada'); } else removerDaFila(+b.dataset.fila); });
  $('#hotbar').addEventListener('click', e => { const b = e.target.closest('[data-ferr]'); if (!b) return;
    const f = b.dataset.ferr;
    if (f === 'plantar') {
      const c = semAtual();
      if (crop(S.ferramenta) || !(S.sementes[c.id] || 0)) seletorAberto = !seletorAberto; // 2º toque (ou sem semente) abre o painel
      S.ferramenta = c.id;
    } else { S.ferramenta = f; seletorAberto = false; }
    renderHotbar(); renderHUD(); salvar(); });
  $('#seletorSem').addEventListener('click', e => {
    if (e.target.closest('[data-comprar-ins]')) { abrirSeletor(false); abrir('loja', 'insumos'); return; }
    if (Date.now() - arr.ate < 400) return;
    const sl = e.target.closest('[data-sel]'); if (sl) { const a = sl.dataset.sel; if (a === 'fechar') abrirSeletor(false); else { paginaSem += a === 'prox' ? 1 : -1; renderSeletor(); } return; }
    const b = e.target.closest('[data-sem]'); if (!b) return;
    const id = b.dataset.sem, alvo = alvoPlantio;
    S.semSel = id;
    if (e.target.closest('[data-comprar-sem]') || !(S.sementes[id] || 0)) { abrirSeletor(false); destaqueSem = id; abrir('loja', 'sementes'); destaqueSem = null;
      const card = $(`[data-card-sem=${id}]`); if (card) card.scrollIntoView({block:'nearest', inline:'center'}); return; }
    renderSeletor(); });
  window.addEventListener('pointerdown', e => { if (seletorAberto && !e.target.closest('#seletorSem')) abrirSeletor(false); }, true);
  document.addEventListener('click', e => {
    const ab = e.target.closest('[data-abrir]'); if (ab) { abrir(ab.dataset.abrir); return; }
    if (!e.target.closest('#fundo')) return;
    if (e.target.id === 'fundo') { fechar(); return; }
    const ci = e.target.closest('[data-comprar-insumo]'); if (ci) { const k = ci.dataset.comprarInsumo, q = +ci.dataset.q, cu = INSUMOS[k].preco * q;
      if (S.moedas < cu) { toast('Moedas insuficientes'); return; } S.moedas -= cu; if (!S.ins) S.ins = {}; S.ins[k] = qtdIns(k) + q; S.stats.compras = (S.stats.compras || 0) + 1; somT('moeda'); toast(`${INSUMOS[k].emoji} +${q} ${INSUMOS[k].nome}`, 'bom'); tudo(); renderJanela(); return; }
    const c = e.target.closest('[data-comprar]'); if (c) { comprarSemente(c.dataset.comprar, +c.dataset.q); return; }
    const v = e.target.closest('[data-vender]'); if (v) { abrirVenda(v.dataset.vender); return; }
    const u = e.target.closest('[data-upg]'); if (u) { comprarUpg(u.dataset.upg); return; }
    const ad = e.target.closest('[data-adotar]'); if (ad) { adotarPet(ad.dataset.adotar); return; }
    const an = e.target.closest('[data-animal]'); if (an) { comprarAnimal(an.dataset.animal); return; }
    const ic = e.target.closest('[data-ir-cercado]'); if (ic) { // manda o fazendeiro cuidar de todos os cercados desse bicho, sem fechar a janela
      const k = ic.dataset.irCercado, a = ANIMAIS[k], temRacao = (S.celeiro[a.racao] || 0) > 0;
      const alvos = cercadosDe(k).filter(o => { const e2 = estadoCercado(o); return (e2.prontos || (e2.fome && temRacao)) && !objNaFila(o.id); });
      if (!alvos.length) { toast(cercadosDe(k).some(o => objNaFila(o.id)) ? '👍 O fazendeiro já está indo lá' : 'Nada para fazer agora nesses cercados'); return; }
      alvos.forEach(o => enfileirar({tipo:'cercado', oid:o.id}));
      toast(`🐾 Indo cuidar ${alvos.length > 1 ? 'dos ' + alvos.length + ' cercados' : 'do cercado'} de ${a.plural.toLowerCase()}`, 'bom'); renderJanela(); return; }
    const im = e.target.closest('[data-ir-moinho]'); if (im) { const o = S.objetos.find(o => o.tipo === 'moinho'); if (o) { focar(centro(o)); clicarConstrucao(o); } else abrir('loja', 'construcoes'); return; }
    const rc = e.target.closest('[data-receita]'); if (rc) {
      if (rc.dataset.max) { let n = 0; while (produzir(rc.dataset.receita, true)) n++; toast(n ? `⚙️ ${n}× ${item(rc.dataset.receita).nome} na fila` : 'Sem ingredientes ou fila cheia', n ? 'bom' : ''); tudo(); }
      else produzir(rc.dataset.receita); return; }
    const rn = e.target.closest('[data-renomear]'); if (rn) { abrir('nome', rn.dataset.renomear); return; }
    const av = e.target.closest('[data-av]');
    if (av) {
      const c = av.dataset.av, v = av.dataset.v;
      if (c === 'aleatorio') perfilTemp = avAleatorio();
      else if (v === 'toggle') perfilTemp[c] = !perfilTemp[c];
      else perfilTemp[c] = isNaN(+v) ? v : +v;
      const nm = $('#inpPerfil').value, sc = $('#jcorpo').scrollTop; previaAvatar(perfilTemp); renderJanela(); $('#inpPerfil').value = nm; $('#jcorpo').scrollTop = sc; return;
    }
    const cs = e.target.closest('[data-construir]'); if (cs) { comprarConstrucao(cs.dataset.construir); return; }
    const amp = e.target.closest('[data-ampliar]'); if (amp) { ampliar(amp.dataset.ampliar); return; }
    const zn = e.target.closest('[data-zona]'); if (zn) { comprarZona(zn.dataset.zona); return; }
    const so = e.target.closest('[data-social]'); if (so) { SOC.aba = so.dataset.social; renderJanela(); return; }
    if (janela === 'banca' && cliqueBanca(e)) return;
    if (janela === 'amigos' && SOC.aba === 'coop' && e.target.closest('[data-emblema], [data-entrar-coop], [data-coop-sub], [data-pedir-coop], [data-doar], [data-coop-novo]')) { cliqueCoop(e); return; }
    const vi = e.target.closest('[data-visitar]'); if (vi) { visitar(vi.dataset.visitar, vi.dataset.nome); return; }
    const aa = e.target.closest('[data-add-amigo]'); if (aa) { pedirAmizade(aa.dataset.addAmigo); return; }
    const am = e.target.closest('[data-amizade]'); if (am) { responderAmizade(+am.dataset.amizade, !!am.dataset.ok); return; }
    const pd = e.target.closest('[data-pedido]'); if (pd) { entregarPedido(+pd.dataset.pedido); return; }
    const tp = e.target.closest('[data-trocar-pedido]'); if (tp) { trocarPedido(+tp.dataset.trocarPedido); return; }
    const ct = e.target.closest('[data-conta]'); if (ct) { trocarConta(ct.dataset.conta); return; }
    const nm = e.target.closest('[data-nome]'); if (nm) { escolherNome(nm.dataset.nome); return; }
    const sb = e.target.closest('[data-sub]'); if (sb) { subLoja = sb.dataset.sub; renderJanela(); $('#jcorpo').scrollTop = 0; return; }
    const a = e.target.closest('[data-acao]'); if (!a) return;
    const ac = a.dataset.acao;
    if (ac === 'fechar') fechar();
    if (ac === 'coletar-fab') { coletarFab(janelaArg, janelaArg === 'moinho' ? fabEstadoId() : undefined); tudo(); }
    if (ac === 'salvar-nome') { const v = ($('#inpNome').value || '').trim().slice(0, 14); if (v) { S.nomes[janelaArg] = v; atualizarRotulosPets(); toast(`🐾 Agora ele se chama ${v}!`, 'bom'); } fechar(); tudo(); }
    if (ac === 'salvar-perfil') salvarPerfil();
    if (ac === 'editar') { fechar(); entrarEdicao(); toast('Toque numa construção para mover'); }
    if (ac === 'ver-terra') { fechar(); guiarTerra(); }
    if (ac === 'instalar' && pedidoInstalar) { pedidoInstalar.prompt(); pedidoInstalar.userChoice.finally(() => { pedidoInstalar = null; renderJanela(); }); }
    if (ac === 'chamar-pets') { S.seguir = !S.seguir; atualizarPets3D(); salvar(); renderJanela(); toast(S.seguir ? '🐾 Seus bichinhos estão seguindo você' : '🐾 Bichinhos soltos para passear'); }
    if (ac === 'cuidar-todos') {
      const alvos = S.objetos.filter(o => { const T = TIPOS[o.tipo]; if (!T.animal || !qtdAnimal(T.animal) || objNaFila(o.id)) return false; const e2 = estadoCercado(o); return e2.prontos || (e2.fome && (S.celeiro[ANIMAIS[T.animal].racao] || 0) > 0); });
      if (!alvos.length) toast('Nada para fazer agora: ninguém com fome (com ração) nem produto pronto');
      else { alvos.forEach(o => enfileirar({tipo:'cercado', oid:o.id})); toast(`🐾 Indo cuidar de ${alvos.length} cercado(s)`, 'bom'); renderJanela(); }
    }
    if (ac === 'expandir') {
      if (!ilhaCheia() || S.nivel < nivelExpansao() || S.moedas < custoExpansao() || ANEL >= MAX_ANEL) return;
      if (!temMats(matsDe('ilha'), matsExpansao())) { toast(`Faltam materiais: ${matsDe('ilha').map(m => `${MATERIAIS[m].nome} ${(S.mat || {})[m] || 0}/${matsExpansao()}`).join(' · ')}`); return; }
      S.moedas -= custoExpansao(); gastarMats(matsDe('ilha'), matsExpansao()); S.expansao = ANEL + 1; salvar(); if (ON.user) enviarSave();
      try { sessionStorage.setItem('terralia-msg', '🏝️ A ilha cresceu! Novas terras para liberar em volta.'); } catch (e) {}
      ON.recarregando = true; setTimeout(() => location.reload(), ON.user ? 1200 : 100);
    }
    if (ac === 'add-amigo') pedirAmizade(($('#inAmigo') || {}).value);
    if (ac === 'buscar-coop') { COOP.busca = (($('#inBuscaCoop') || {}).value || '').trim(); COOP.meu = undefined; carregarCoop(); }
    if (['criar-coop', 'postar-mural', 'recolher-coop', 'sair-coop'].includes(ac)) acaoCoop(ac);
    if (ac === 'atualizar-banca') carregarBanca();
    if (ac === 'colocar-oferta') colocarOferta();
    if (ac === 'recolher-banca') recolherVendas();
    if (ac === 'atualizar-amigos') { carregarSocial(); if (SOC.aba === 'coop') carregarCoop(); }
    if (ac === 'voltar-visita') voltarDaVisita();
    if (ac === 'procurar-versao') procurarVersao(true);
    if (ac === 'atualizar-ja') atualizarJogo();
    if (ac === 'entrar-google') entrarGoogle();
    if (ac === 'sair-conta') sairConta();
    if (ac === 'salvar-nuvem') { if (ON.pausado && ON.nuvem) abrir('nuvem'); else enviarSave(true); }
    if (ac === 'usar-nuvem') usarSaveNuvem();
    if (ac === 'conta-nova-fazenda') { guardarSlot(); carregarFazenda(fazendaNova(ON.user.id), '🌱 Fazenda nova para esta conta!'); }
    if (ac === 'nome-ok') escolherNome(($('#inNome') || {}).value);
    if (ac === 'mudar-nome') abrirEscolhaNome('trocar');
    if (ac === 'usar-local') { janela = 'x'; fechar(); ON.pausado = false; enviarSave(true, true); }
    if (ac.startsWith('rank-')) { ON.ordem = ac.slice(5); carregarRanking(); }
    if (ac === 'mudo') { S.audio.mudo = !S.audio.mudo; SOM.config(S.audio); salvar(); renderJanela(); }
    if (ac === 'qualidade') { S.leve = !S.leve; aplicarQualidade(); salvar(); renderJanela(); }
    if (ac === 'vender-tudo') { let t = 0; VENDAVEIS.forEach(c => t += vender(c.id)); if (t) { toast(`Vendeu tudo por ${fmtN(t)} moedas`, 'bom'); pulsar(); } tudo(); }
    if (ac === 'reset-sim') { const leve = S.leve; S = novo(); S.leve = leve; S.viuAjuda = true; salvar(); location.reload(); }
  });
  document.addEventListener('keydown', e => {
    if (e.target && e.target.tagName === 'INPUT') { if (e.key === 'Enter' && e.target.id === 'inNome') escolherNome(e.target.value); if (e.key === 'Enter' && e.target.id === 'inAmigo') pedirAmizade(e.target.value); if (e.key === 'Enter' && e.target.id === 'inBuscaCoop') { COOP.busca = e.target.value.trim(); COOP.meu = undefined; carregarCoop(); } return; }
    if (e.key === 'Escape') { if (editar.ativo) sairEdicao(); else fechar(); return; }
    if (editar.ativo) { if (e.key === 'r' || e.key === 'R') girarSel(); if (e.key === 'Enter') confirmarSel(); return; }
    return;
  });
  document.addEventListener('gesturestart', e => e.preventDefault());

  function redimensionar() {
    const w = window.innerWidth, h = window.innerHeight, retrato = h > w;
    renderer.setSize(w, h, false); camera.aspect = w / h;
    const baixo = !retrato && h < 520;
    camera.fov = retrato ? 58 : baixo ? 48 : 42; camera.updateProjectionMatrix();
    const dist = retrato ? 33 : baixo ? 23 : 25.5;
    const dir = camera.position.clone().sub(controls.target).normalize();
    camera.position.copy(controls.target).addScaledVector(dir, dist);
  }
  window.addEventListener('resize', redimensionar);

  // ================= LOOP =================
  let ultimoLogico = 0, ultimoT = 0;
  const v3 = V3(), desloc = V3();
  function animarAgua(t) {
    aguasAnimadas.forEach((b, i) => { // ondinhas se espalhando na água
      const f = ((t * .45 + i * .37) % 1);
      if (f < .02 && !b.userData.mov) { b.position.x = rnd(-1.6, 1.6); b.position.z = rnd(-1.6, 1.6); }
      b.userData.mov = f >= .02;
      b.scale.setScalar(1 + f * 5); b.material.opacity = (1 - f) * .45;
    });
    if (aguaMar) aguaMar.position.y = -1.55 + Math.sin(t * .8) * .06;
  }
  let quadro = 0;
  function animar(t) {
    requestAnimationFrame(animar);
    const dt = Math.min(.05, (t - ultimoT) / 1000 || .016); ultimoT = t;
    const seg = t / 1000;
    if (t - ultimoLogico > 250) {
      ultimoLogico = t;
      let mudou = false;
      if (S.amigos.cachorro) mudou = cachorroAjuda() || mudou;
      if (atualizarProducao()) mudou = true;
      if (S.evento && !eventoAtivo()) { S.evento = null; mudou = true; }
      if (S.nivel >= NIVEL_PEDIDOS && garantirPedidos()) mudou = true;
      if (janela === 'pedidos' && !mudou && Math.floor(t / 1000) !== Math.floor((t - 260) / 1000)) renderJanela();
      S.plots.forEach((p, i) => atualizarTile(i));
      atualizarBaloes();
      if (seletorAberto) posicionarSeletor();
      if (seletorAberto && (modoSel === 'insumos' || modoSel === 'catar') && alvoPlantio != null) { const p = S.plots[alvoPlantio], te = $('[data-tc-tempo]');
        if (!p || !p.c || pronto(p)) abrirSeletor(false); else if (te) { te.textContent = fmtT(restante(p) / 1000); const pr = Math.floor(progresso(p) * 100); $('[data-tc-pct]').textContent = pr; $('.tc-anel').style.setProperty('--p', pr); } }
      if (mudou) { renderHUD(); renderJanela(); salvar(); }
      else if (janela === 'fabrica') { // só atualiza o tempo e a barra (não redesenha a janela inteira)
        const f = fabEstado(janelaArg).fila[0], te = $('[data-fabtempo]'), br = $('[data-fabbarra]');
        if (f && f.t0) { if (te) te.textContent = tempoCurto(f.dur - (Date.now() - f.t0)); if (br) br.style.width = Math.min(100, 100 * (Date.now() - f.t0) / f.dur) + '%'; }
      }
      if (hoverI >= 0) tip.textContent = textoTip(hoverI); else if (hoverObj) tip.textContent = textoObj(hoverObj);
      animarAgua(seg); renderMissoes(); verificarTutorial();
    }
    tiles.forEach((tl, i) => {
      if (!tl) return;
      tl.planta.rotation.z = Math.sin(seg * 1.6 + i) * .035;
      if (tl.pop > 0) { tl.pop = Math.max(0, tl.pop - dt * 3); const s = 1 + Math.sin(tl.pop * Math.PI) * .35; tl.planta.scale.set(s, s, s); }
      if (tl.icone.visible) tl.icone.position.y = 1.9 + Math.sin(seg * 3 + i) * .15;
    });
    for (const k in baloes) if (baloes[k].visible) baloes[k].position.y = baloes[k].userData.y + Math.sin(seg * 3) * .15;
    if (hoverI >= 0) {
      const p = posTile(hoverI); destaque.position.set(p.x, .15, p.z); destaque.rotation.y = tiles[hoverI].g.parent.rotation.y; destaque.visible = true;
      area.visible = false;
    } else { destaque.visible = false; area.visible = false; }
    { const kz = Math.min(1.6, Math.max(1, camera.position.distanceTo(controls.target) / 24)); // de longe os balões crescem um pouco para continuar legíveis
      for (const id in baloes) { const b = baloes[id]; if (b.visible && b.userData.k !== kz) { b.userData.k = kz; b.scale.set(2.2 * kz, 1.1 * kz, 1); } } }
    if (sombraNuvens) { sombraNuvens.material.map.offset.x += dt * .006; sombraNuvens.material.map.offset.y += dt * .0035; }
    borboletas.forEach(b => {
      b.fase += dt * 18; const ab = Math.sin(b.fase) * 1.1; b.a1.rotation.y = ab; b.a2.rotation.y = Math.PI - ab;
      const d = b.alvo.clone().sub(b.g.position); if (d.length() < .3) b.alvo.set(Math.max(-MEIA + 2, Math.min(MEIA - 2, b.g.position.x + rnd(-5, 5))), rnd(.5, 1.5), Math.max(-MEIA + 2, Math.min(MEIA - 2, b.g.position.z + rnd(-5, 5))));
      d.normalize().multiplyScalar(dt * b.vel); b.g.position.add(d); b.g.position.y += Math.sin(b.fase * .15) * dt * .4; b.g.rotation.y = Math.atan2(d.x, d.z);
    });
    for (let k = coracoes.length - 1; k >= 0; k--) { const h = coracoes[k]; h.sp.position.y = h.y + Math.sin(performance.now() / 400 + k) * .15; if (Date.now() > h.ate) { scene.remove(h.sp); coracoes.splice(k, 1); } }
    if (marcadorT > 0) { marcadorT -= dt * 1.2; marcador.material.opacity = Math.max(0, marcadorT); marcador.scale.setScalar(1 + (1 - marcadorT) * .6); if (marcadorT <= 0) marcador.visible = false; }
    atualizarNomes();
    fumacas.forEach(f => { f.userData.ativa = f.userData.tipo && fabEstado(f.userData.tipo).fila.length > 0; animarFumaca(f, dt, seg); });
    if (fabRodas.length) fabRodas.forEach(r => r.rotation.x += dt * ((S.fab[r.userData.tipo || 'tecelagem'] || {fila:[]}).fila.length ? 3 : .2)); pasMoinho.forEach(p => p.rotation.z += dt * (p.userData.oid && fabEstado('moinho', p.userData.oid).fila.length ? 2.2 : .25));
    nuvens.forEach(n => { n.position.x += n.userData.v * dt * 1.2; if (n.position.x > 60) n.position.x = -60; });
    animarPersonagens(dt, seg);
    if (tonho) { const u = tonho.userData; u.corpo.position.y = Math.sin(seg * 1.5) * .02; u.cab.rotation.y = Math.sin(seg * .7) * .35; u.bD.rotation.x = Math.sin(seg * 2) * .1 - .1;
      u.dica.visible = !!(S.perfil && tutAtual()); u.dica.position.y = 2.6 + Math.sin(seg * 3) * .08; }
    if (janela === 'perfil') renderPrevia(seg);
    if (editar.sel) { // barrinha de ferramentas acima da construção selecionada
      const c = centro(editar.sel); v3.set(c.x, editar.sel.tipo === 'lote' ? 1.4 : (TIPOS[editar.sel.tipo].animal || TIPOS[editar.sel.tipo].decor) ? 2.2 : 4.2, c.z).project(camera);
      ferrEd.style.left = Math.max(110, Math.min(window.innerWidth - 110, (v3.x + 1) / 2 * window.innerWidth)) + 'px'; ferrEd.style.top = Math.max(120, (1 - v3.y) / 2 * window.innerHeight) + 'px';
      pegada.material.opacity = .35 + Math.sin(seg * 5) * .1;
    }
    for (let k = particulas.length - 1; k >= 0; k--) {
      const p = particulas[k], idade = (t - p.t0) / 1000;
      if (idade < 0) { p.m.visible = false; continue; } p.m.visible = true;
      p.v.y -= 9.8 * dt * p.g; p.m.position.addScaledVector(p.v, dt);
      if (p.chao && p.m.position.y < p.chao) { p.m.position.y = p.chao; p.v.set(0, 0, 0); }
      if (p.g && !p.chao) p.m.rotation.x += .1;
      if (!p.g) p.m.material.opacity = 1 - idade / p.vida;
      if (idade > p.vida) { scene.remove(p.m); particulas.splice(k, 1); }
    }
    for (let k = flutuantes.length - 1; k >= 0; k--) {
      const f = flutuantes[k], idade = (t - f.t0) / 1000;
      v3.copy(f.pos); v3.y += idade * 1.5; v3.project(camera);
      f.el.style.left = ((v3.x + 1) / 2 * window.innerWidth) + 'px';
      f.el.style.top = ((1 - v3.y) / 2 * window.innerHeight) + 'px';
      f.el.style.opacity = 1 - idade;
      if (idade > 1) { f.el.remove(); flutuantes.splice(k, 1); }
    }
    if (focoCam) {
      desloc.copy(focoCam).sub(controls.target).multiplyScalar(Math.min(1, dt * 6));
      controls.target.add(desloc); camera.position.add(desloc);
      if (focoCam.distanceTo(controls.target) < .05) focoCam = null;
    }
    posicionarMao();
    controls.update();
    const tg = controls.target, lim = MEIA - 3;
    desloc.set(Math.max(-lim, Math.min(lim, tg.x)) - tg.x, -tg.y, Math.max(-lim, Math.min(lim, tg.z)) - tg.z);
    if (desloc.lengthSq()) { tg.add(desloc); camera.position.add(desloc); }
    ajustarCamera(dt);
    quadro++; renderer.shadowMap.needsUpdate = quadro % 3 === 0;
    // qualidade automática: se estiver travando, baixa um pouco a resolução; quando melhorar, volta
    gov.soma += dt; gov.n++;
    if (gov.soma > 2.5) {
      const med = gov.soma / gov.n; gov.soma = gov.n = 0;
      if (med > 1 / 38 && gov.pr > 1) { gov.pr = Math.max(1, gov.pr - .25); gov.bons = 0; renderer.setPixelRatio(gov.pr); }
      else if (med < 1 / 56 && gov.pr < gov.max) { if (++gov.bons >= 2) { gov.pr = Math.min(gov.max, gov.pr + .25); gov.bons = 0; renderer.setPixelRatio(gov.pr); } }
      else gov.bons = 0;
    }
    renderer.render(scene, camera);
  }

  // ================= PEDIDOS (caminhão de encomendas) =================
  const NIVEL_PEDIDOS = 3;
  function itensParaPedido() {
    const fabs = new Set(S.objetos.filter(o => TIPOS[o.tipo].fab).map(o => o.tipo)), arv = new Set(S.objetos.filter(o => TIPOS[o.tipo].fruta).map(o => TIPOS[o.tipo].fruta));
    return VENDAVEIS.filter(i => crop(i.id) ? i.nivel <= S.nivel : i.animal ? qtdAnimal(i.animal) > 0 : i.arvore ? arv.has(i.id) : i.fab ? fabs.has(i.fab) && i.nivel <= S.nivel : false);
  }
  function gerarPedido() {
    const lista = itensParaPedido().sort(() => Math.random() - .5), n = Math.min(lista.length, 1 + (Math.random() < .5 ? 0 : 1) + (S.nivel >= 10 && Math.random() < .5 ? 1 : 0));
    const itens = lista.slice(0, Math.max(1, n)).map(i => { const cru = !!crop(i.id) || !!i.arvore; const max = cru ? Math.min(20, 3 + Math.floor(S.nivel / 3)) : Math.min(6, 1 + Math.floor(S.nivel / 8));
      return [i.id, Math.max(1, Math.round(rnd(cru ? 2 : 1, max)))]; });
    const valor = itens.reduce((t, [id, q]) => t + q * item(id).preco, 0), xp = itens.reduce((t, [id, q]) => t + q * (item(id).xp || Math.max(2, item(id).preco / 18)), 0);
    return {itens, moedas:Math.round(valor * 1.5 / 5) * 5, xp:Math.round(xp * .3) + 5, espera:0, expira:Date.now() + Math.round(rnd(4, 24)) * 3600 * 1000};
  }
  function garantirPedidos() {
    if (!S.pedidos) S.pedidos = [];
    const vagas = Math.min(9, 3 + Math.floor(S.nivel / 8)), agora = Date.now();
    while (S.pedidos.length < vagas) S.pedidos.push({itens:[], espera:agora + S.pedidos.length * 1000});
    let mudou = false; S.pedidos.forEach((p, i) => {
      if (p.itens.length && p.expira && agora >= p.expira) { S.pedidos[i] = {itens:[], espera:agora + 60 * 1000}; mudou = true; } // venceu: chega outro em 1 minuto
      else if (!p.itens.length && agora >= p.espera) { S.pedidos[i] = gerarPedido(); mudou = true; } });
    return mudou;
  }
  function entregarPedido(i) {
    const p = S.pedidos[i]; if (!p || !p.itens.length) return;
    if (!p.itens.every(([id, q]) => (S.celeiro[id] || 0) >= q)) { toast('Faltam itens para este pedido'); return; }
    p.itens.forEach(([id, q]) => S.celeiro[id] -= q);
    const bonus = S.amigos.papagaio ? Math.round(p.moedas * .15) : 0; S.moedas += p.moedas + bonus; S.stats.pedidos = (S.stats.pedidos || 0) + 1; ganharXp(p.xp);
    acharMaterial(null, .35);
    toast(`🚚 Pedido entregue! +${fmtN(p.moedas + bonus)} moedas${bonus ? ' (🦜 +15%)' : ''} e ⭐${p.xp}`, 'bom'); pulsar();
    S.pedidos[i] = {itens:[], espera:Date.now() + 30 * 1000}; tudo();
  }
  function trocarPedido(i) { S.pedidos[i] = {itens:[], espera:Date.now() + 3 * 60 * 1000}; toast('🗑️ Pedido descartado. Um novo chega em 3 minutos.'); tudo(); }
  function htmlPedidos() {
    if (S.nivel < NIVEL_PEDIDOS) return `<p class="dica">O caminhão de pedidos chega no nível ${NIVEL_PEDIDOS}. 🚚</p>`;
    garantirPedidos();
    let h = `<div class="loja-topo"><p class="dica">Entregue encomendas para ganhar <b>mais moedas e XP</b> do que vendendo no armazém. Já entregou ${fmtN(S.stats.pedidos || 0)} pedidos.</p></div><div class="vitrine">`;
    S.pedidos.forEach((p, i) => {
      if (!p.itens.length) { h += `<div class="tile"><div class="t-ic"><span class="emo-g">🚚</span></div><div class="t-nome">Novo pedido</div><div class="t-info"><span>chega em ${fmtT(Math.max(0, p.espera - Date.now()) / 1000)}</span></div><div class="t-acao"></div></div>`; return; }
      const ok = p.itens.every(([id, q]) => (S.celeiro[id] || 0) >= q);
      h += `<div class="tile larga ${ok ? 'amigo-ok' : ''}"><span class="selo ${ok ? 'max' : ''}">${ok ? 'Pronto!' : 'Pedido ' + (i + 1)}</span>
        <div class="ped-itens">${p.itens.map(([id, q]) => { const tem = S.celeiro[id] || 0; return `<div class="ped-it ${tem >= q ? 'ok' : ''}"><span>${emojiItem(item(id))}</span><b>${Math.min(tem, q)}/${q}</b></div>`; }).join('')}</div>
        <div class="t-info"><span class="preco-g">${moedaMini}${fmtN(p.moedas)}</span><span>⭐ ${p.xp} XP</span>${p.expira ? `<span>⏳ ${fmtT(Math.max(0, p.expira - Date.now()) / 1000)}</span>` : ''}</div>
        <div class="t-acao"><button class="btn verde" data-pedido="${i}" ${ok ? '' : 'disabled'}>Entregar</button><button class="btn" data-trocar-pedido="${i}" title="Trocar pedido">🗑️</button></div></div>`;
    });
    return h + '</div>';
  }

  // ================= SOCIAL: amigos, quem está online, visitas e ajudas =================
  const ONLINE_MS = 2.5 * 60 * 1000;
  const SOC = {amigos:null, pedidos:[], online:[], carregando:false, erro:'', busca:''};
  const estaOnline = r => r && r.visto_em && Date.now() - Date.parse(r.visto_em) < ONLINE_MS;
  function fotoFazenda() { // o que os amigos precisam para desenhar a sua fazenda
    const p = S.perfil || {};
    return {nome:p.nome || 'Fazendeiro', perfil:{nome:p.nome, avatar:p.avatar}, nivel:S.nivel, expansao:S.expansao || 0, zonas:S.zonas, objetos:S.objetos,
      plots:S.plots.map(q => q.c ? {c:q.c, reg:!!q.reg, t0:q.t0, dur:q.dur, pragaEm:q.pragaEm || null, pragaFim:q.pragaFim || null} : {c:null}), animais:S.animais, ani:S.ani, amigos:S.amigos, pomar:S.pomar || {}};
  }
  async function batida() { // "estou online" + aplica ajudas recebidas
    if (!ON.user || VISITA || ON.recarregando || !ON.sincronizado) return;
    try { await ON.sb.from('ranking').update({visto_em:new Date().toISOString()}).eq('user_id', ON.user.id); } catch (e) {}
    receberAjudas();
  }
  function alimentarCercado(o) { // ajuda de amigo: ração de presente para quem está com fome
    if (!o || !TIPOS[o.tipo].animal) return 0; atualizarProducao();
    const a = ANIMAIS[TIPOS[o.tipo].animal]; let n = 0;
    animaisDoCercado(o).forEach(x => { if (x.rest <= 0) { x.rest = a.porRacao; x.t = Date.now(); n++; } });
    return n;
  }
  const coracoes = [];
  function coracaoEm(pos) { const sp = sprite('💚', .8); sp.position.copy(pos); scene.add(sp); coracoes.push({sp, ate:Date.now() + 5 * 60000, y:pos.y}); }
  async function receberAjudas() {
    if (!ON.user || VISITA) return;
    try {
      const {data} = await ON.sb.from('ajudas').select('id, de, tipo, alvo, ref').eq('para', ON.user.id).eq('aplicado', false).limit(100);
      if (!data || !data.length) return;
      const nomes = await nomesDe([...new Set(data.map(a => a.de))]); const porQuem = {};
      data.forEach(a => {
        const p = S.plots[a.alvo], q = porQuem[a.de] || (porQuem[a.de] = {regar:0, praga:0, adubar:0, alimentar:0});
        if (a.tipo === 'regar' && p && p.c && !p.reg) { regar(a.alvo, true); q.regar++; coracaoEm(posTile(a.alvo).add(V3(0, 2.3, 0))); }
        if (a.tipo === 'praga' && tirarPraga(a.alvo, true)) { q.praga++; coracaoEm(posTile(a.alvo).add(V3(0, 2.3, 0))); }
        if (a.tipo === 'adubar' && crescendo_(p)) { p.t0 -= p.dur * .15; atualizarTile(a.alvo); q.adubar++; coracaoEm(posTile(a.alvo).add(V3(0, 2.3, 0))); }
        if (a.tipo === 'alimentar') { const o = objPorId(a.ref); if (alimentarCercado(o)) { q.alimentar++; coracaoEm(centro(o).add(V3(0, 3.2, 0))); } }
      });
      await ON.sb.from('ajudas').update({aplicado:true}).in('id', data.map(a => a.id));
      Object.entries(porQuem).forEach(([de, q], k) => {
        const partes = [q.regar && `regou ${q.regar} planta${q.regar > 1 ? 's' : ''}`, q.praga && `tirou ${q.praga} bichinho${q.praga > 1 ? 's' : ''}`, q.adubar && `adubou ${q.adubar} planta${q.adubar > 1 ? 's' : ''}`, q.alimentar && `alimentou ${q.alimentar} cercado${q.alimentar > 1 ? 's' : ''}`].filter(Boolean);
        if (partes.length) setTimeout(() => { toast(`🤝 ${nomes[de] || 'Um amigo'} te ajudou: ${partes.join(', ')}!`, 'bom'); somT('achou'); }, 600 + k * 2600);
      });
      salvar(); tudo();
    } catch (e) {}
  }
  async function nomesDe(ids) {
    if (!ids.length) return {};
    const {data} = await ON.sb.from('ranking').select('user_id, nome, nivel, visto_em').in('user_id', ids);
    const m = {}; (data || []).forEach(r => { m[r.user_id] = r.nome; m['_' + r.user_id] = r; }); return m;
  }
  async function carregarSocial() {
    if (!ON.sb || !ON.user) return;
    SOC.carregando = true; SOC.erro = ''; if (janela === 'amigos') renderJanela();
    try {
      const me = ON.user.id;
      const {data:am} = await ON.sb.from('amizades').select('id, de, para, status');
      const ids = [...new Set((am || []).map(a => a.de === me ? a.para : a.de))], info = await nomesDe(ids);
      SOC.amigos = (am || []).filter(a => a.status === 'aceito').map(a => { const o = a.de === me ? a.para : a.de; return Object.assign({id:a.id, uid:o}, info['_' + o] || {nome:'?'}); })
        .sort((x, y) => (estaOnline(y) ? 1 : 0) - (estaOnline(x) ? 1 : 0) || (y.nivel || 0) - (x.nivel || 0));
      SOC.pedidos = (am || []).filter(a => a.status === 'pendente').map(a => ({id:a.id, recebido:a.para === me, uid:a.de === me ? a.para : a.de, nome:(info['_' + (a.de === me ? a.para : a.de)] || {}).nome || '?'}));
      const desde = new Date(Date.now() - ONLINE_MS).toISOString();
      const {data:on} = await ON.sb.from('ranking').select('user_id, nome, nivel, visto_em').gt('visto_em', desde).neq('user_id', me).order('nivel', {ascending:false}).limit(30);
      SOC.online = on || [];
    } catch (e) { SOC.erro = 'sem internet'; }
    SOC.carregando = false; if (janela === 'amigos') renderJanela();
  }
  async function pedirAmizade(nome) {
    nome = String(nome || '').trim(); if (nome.length < 3) { toast('Digite o nome do fazendeiro'); return; }
    try {
      const {data} = await ON.sb.rpc('buscar_jogador', {n:nome}); const j = data && data[0];
      if (!j) { toast(`Não achei o fazendeiro "${nome}"`); return; }
      if (j.user_id === ON.user.id) { toast('Esse é você! 😄'); return; }
      const {error} = await ON.sb.from('amizades').insert({de:ON.user.id, para:j.user_id});
      if (error) toast(error.code === '23505' ? 'Vocês já são amigos (ou o pedido já foi enviado)' : 'Não deu para enviar: ' + error.message);
      else toast(`📨 Pedido de amizade enviado para ${j.nome}!`, 'bom');
    } catch (e) { toast('Sem internet'); }
    carregarSocial();
  }
  async function responderAmizade(id, aceitar) {
    try { if (aceitar) await ON.sb.from('amizades').update({status:'aceito'}).eq('id', id); else await ON.sb.from('amizades').delete().eq('id', id); } catch (e) {}
    if (aceitar) toast('🤝 Agora vocês são amigos!', 'bom'); carregarSocial();
  }
  async function visitar(uid, nome) {
    try {
      const {data, error} = await ON.sb.from('fazendas_publicas').select('dados').eq('user_id', uid).maybeSingle();
      if (error || !data) { toast(`${nome || 'Esse fazendeiro'} ainda não tem fazenda para visitar`); return; }
      const amigo = (SOC.amigos || []).some(a => a.uid === uid);
      let feitas = 0;
      if (amigo) { const {count} = await ON.sb.from('ajudas').select('id', {count:'exact', head:true}).eq('de', ON.user.id).eq('para', uid).gt('criado', new Date(Date.now() - 864e5).toISOString()); feitas = count || 0; }
      if (ON.sujo) await enviarSave();
      sessionStorage.setItem('terralia-visita', JSON.stringify({uid, nome:nome || data.dados.nome, amigo, ajudas:Math.max(0, 5 - feitas), dados:data.dados}));
      telaCarregando(`Indo para a fazenda de ${nome || data.dados.nome || 'um amigo'}…`);
      ON.recarregando = true; setTimeout(() => location.reload(), 350);
    } catch (e) { toast('Sem internet para visitar agora'); }
  }
  function voltarDaVisita() { sessionStorage.removeItem('terralia-visita'); telaCarregando('Voltando para a sua fazenda…'); setTimeout(() => location.reload(), 350); }
  function telaCarregando(txt) { // mostra já e avisa a próxima página para continuar mostrando
    try { sessionStorage.setItem('terralia-indo', txt); } catch (e) {}
    if (window.mostrarCarregando) window.mostrarCarregando(txt);
  }
  async function enviarAjuda(tipo, alvo, ref, pos, efeito) {
    if (!VISITA.amigo) { toast('Só dá para ajudar a fazenda de amigos 🤝 Adicione como amigo primeiro'); return; }
    if (VISITA.ajudas <= 0) { toast('Você já usou as 5 ajudas de hoje nesta fazenda 💚'); return; }
    if (VISITA.ocupado) return; VISITA.ocupado = true;
    try {
      const {error} = await ON.sb.from('ajudas').insert({de:ON.user.id, para:VISITA.uid, tipo, alvo, ref:ref || null});
      if (error) { VISITA.ocupado = false; toast(error.message.includes('limite') ? 'Você já usou as 5 ajudas de hoje nesta fazenda 💚' : 'Não deu para ajudar agora'); if (error.message.includes('limite')) { VISITA.ajudas = 0; renderVisita(); } return; }
    } catch (e) { VISITA.ocupado = false; toast('Sem internet'); return; }
    VISITA.ocupado = false; VISITA.ajudas--; efeito();
    const rec = JSON.parse(sessionStorage.getItem('terralia-recompensa') || '{"moedas":0,"xp":0,"n":0}'), bonus = VISITA.ajudas === 0 ? 50 : 0;
    rec.moedas += 20 + bonus; rec.xp += 5; rec.n++;
    sessionStorage.setItem('terralia-recompensa', JSON.stringify(rec)); sessionStorage.setItem('terralia-visita', JSON.stringify(VISITA));
    somT('moeda'); flutuar(pos, `💚 +20 🪙 +5 ⭐`); if (bonus) setTimeout(() => toast(`🎉 5 ajudas! Bônus de +${bonus} moedas`, 'bom'), 500);
    renderVisita();
  }
  async function ajudarNaVisita(i) {
    const p = S.plots[i]; if (!p || !p.c) { toast('Aqui não precisa de ajuda'); return false; }
    const pos = posTile(i).add(V3(0, 1.5, 0));
    if (!p.reg) { enviarAjuda('regar', i, null, pos, () => { p.reg = true; p.t0 = Date.now(); atualizarTile(i); chuva(i, 0x5fb5e8, .05); }); return true; }
    if (temPraga(p)) { enviarAjuda('praga', i, null, pos, () => { p.pragaFim = Date.now(); atualizarTile(i); }); return true; }
    if (crescendo_(p) && !p.ajAdubo) { enviarAjuda('adubar', i, null, pos, () => { p.ajAdubo = true; p.t0 -= p.dur * .15; atualizarTile(i); chuva(i, 0xfff07a, .05); }); return true; }
    toast(pronto(p) ? 'Essa já está pronta: quem colhe é o dono 🌾' : 'Essa planta já foi ajudada'); return false;
  }
  function ajudarCercadoVisita(o) {
    const e = estadoCercado(o); if (!e.fome) { toast('Os bichinhos daqui não estão com fome'); return; }
    enviarAjuda('alimentar', -1, o.id, centro(o).add(V3(0, 2.5, 0)), () => { const a = ANIMAIS[TIPOS[o.tipo].animal]; animaisDoCercado(o).forEach(x => { if (x.rest <= 0) { x.rest = a.porRacao; x.t = Date.now(); } }); atualizarBaloes(); });
  }
  function renderVisita() {
    if (!VISITA) return;
    $('#barraVisita').innerHTML = `<span>🏡 Fazenda de <b>${esc(VISITA.nome)}</b> · ⭐ ${VISITA.dados.nivel || 1}</span>
      <span class="det">${VISITA.amigo ? `Toque para ajudar: 💧 regar · 🐛 tirar bichinho · 🌱 adubar · 🍽️ alimentar · ajudas: <b>${VISITA.ajudas}/5</b>` : 'Adicione como amigo para poder ajudar'}</span>
      <button class="btn verde" data-acao="voltar-visita">🏠 Voltar para casa</button>`;
  }
  function aplicarRecompensaVisita() {
    try { const r = JSON.parse(sessionStorage.getItem('terralia-recompensa')); if (!r || !r.n) return; sessionStorage.removeItem('terralia-recompensa');
      S.moedas += r.moedas; ganharXp(r.xp); setTimeout(() => toast(`💚 Você ajudou ${r.n}× e ganhou ${r.moedas} moedas!`, 'bom'), 900); salvar(); } catch (e) {}
  }
  function htmlAmigos() {
    if (!ON.user) return '<p class="dica">Entre com Google em ⚙️ Configurações para ter amigos, ver quem está online e visitar fazendas.</p>';
    if (SOC.amigos == null && !SOC.carregando) setTimeout(carregarSocial, 0);
    let h = `<div class="campo-nome"><input id="inAmigo" maxlength="24" placeholder="Nome do fazendeiro no ranking" autocomplete="off"><button class="btn verde" data-acao="add-amigo">➕ Adicionar</button></div>`;
    if (SOC.carregando && SOC.amigos == null) return h + '<p class="dica">Carregando…</p>';
    if (SOC.erro) h += `<p class="dica">⚠️ ${esc(SOC.erro)}</p>`;
    const rec = SOC.pedidos.filter(p => p.recebido), env = SOC.pedidos.filter(p => !p.recebido);
    if (rec.length) { h += '<p class="sub">Pedidos de amizade</p>'; rec.forEach(p => h += `<div class="card"><div class="em">📨</div><div class="meio"><div class="nome">${esc(p.nome)}</div><div class="det">quer ser seu amigo</div></div><div class="botoes"><button class="btn verde" data-amizade="${p.id}" data-ok="1">Aceitar</button><button class="btn" data-amizade="${p.id}">Recusar</button></div></div>`); }
    h += `<p class="sub">Amigos (${(SOC.amigos || []).length})</p>`;
    if (!(SOC.amigos || []).length) h += '<p class="dica">Ainda sem amigos. Adicione pelo nome que aparece no ranking! 🌻</p>';
    (SOC.amigos || []).forEach(a => h += `<div class="card"><div class="em">${estaOnline(a) ? '🟢' : '⚪'}</div><div class="meio"><div class="nome">${esc(a.nome)}</div><div class="det">⭐ Nível ${a.nivel || 1} · ${estaOnline(a) ? 'online agora' : 'visto ' + hora(a.visto_em)}</div></div><button class="btn verde" data-visitar="${a.uid}" data-nome="${esc(a.nome)}">Visitar</button></div>`);
    if (env.length) h += `<p class="dica">Aguardando resposta: ${env.map(p => esc(p.nome)).join(', ')}</p>`;
    h += `<p class="sub">Online agora (${SOC.online.length})</p>`;
    if (!SOC.online.length) h += '<p class="dica">Ninguém online agora além de você.</p>';
    SOC.online.forEach(r => { const amigo = (SOC.amigos || []).some(a => a.uid === r.user_id);
      h += `<div class="card"><div class="em">🟢</div><div class="meio"><div class="nome">${esc(r.nome)}</div><div class="det">⭐ Nível ${r.nivel}</div></div><div class="botoes">${amigo ? '' : `<button class="btn" data-add-amigo="${esc(r.nome)}">➕</button>`}<button class="btn verde" data-visitar="${r.user_id}" data-nome="${esc(r.nome)}">Visitar</button></div></div>`; });
    return h + `<button class="btn" data-acao="atualizar-amigos" style="width:100%;margin-top:6px">🔄 Atualizar</button>`;
  }

  // ================= BANCA ONLINE (vender e comprar entre jogadores) =================
  const BAN = {sub:'comprar', ofertas:null, minhas:null, carregando:false, erro:'', venda:null};
  const precoBase = id => item(id).preco || 1;
  async function carregarBanca(sil) {
    if (!ON.user) return; if (!sil) { BAN.carregando = true; BAN.erro = ''; if (janela === 'banca') renderJanela(); }
    try {
      const me = ON.user.id, antes = JSON.stringify([BAN.ofertas, BAN.minhas]);
      const {data:ab} = await ON.sb.from('ofertas').select('id, vendedor, item, qtd, preco, criado').is('comprador', null).neq('vendedor', me).order('criado', {ascending:false}).limit(60);
      const {data:mi} = await ON.sb.from('ofertas').select('id, item, qtd, preco, comprador, recolhido').eq('vendedor', me).eq('recolhido', false).order('criado', {ascending:false});
      const nomes = await nomesDe([...new Set((ab || []).map(o => o.vendedor))]);
      BAN.ofertas = (ab || []).filter(o => item(o.item)).map(o => Object.assign(o, {nome:nomes[o.vendedor] || '?'})); BAN.minhas = (mi || []).filter(o => item(o.item));
      if (sil && (BAN.venda || antes === JSON.stringify([BAN.ofertas, BAN.minhas]))) return;
    } catch (e) { if (sil) return; BAN.erro = 'sem internet'; }
    BAN.carregando = false; if (janela === 'banca') renderJanela();
  }
  async function comprarOferta(id) {
    const o = (BAN.ofertas || []).find(x => x.id === id); if (!o) return;
    if (S.moedas < o.preco) { toast('Moedas insuficientes'); return; }
    if (livreArmazem() < o.qtd) { avisarCheio(); return; }
    try {
      const {data, error} = await ON.sb.rpc('comprar_oferta', {oferta:id});
      if (error || !data || !data.length) { toast('😕 Alguém comprou primeiro!'); carregarBanca(); return; }
      const r = data[0]; S.moedas -= r.preco; S.celeiro[r.item] = (S.celeiro[r.item] || 0) + r.qtd;
      toast(`🛒 Comprou ${r.qtd} ${item(r.item).nome} por ${fmtN(r.preco)} moedas`, 'bom'); tudo(); enviarSave();
    } catch (e) { toast('Sem internet'); }
    carregarBanca();
  }
  async function colocarOferta() {
    const v = BAN.venda; if (!v) return; const tem = S.celeiro[v.id] || 0;
    if (v.qtd < 1 || v.qtd > tem) { toast('Quantidade inválida'); return; }
    S.celeiro[v.id] = tem - v.qtd; salvar();
    try {
      const {error} = await ON.sb.from('ofertas').insert({vendedor:ON.user.id, item:v.id, qtd:v.qtd, preco:v.preco});
      if (error) { S.celeiro[v.id] = (S.celeiro[v.id] || 0) + v.qtd; toast(error.message.includes('limite') ? 'Você já tem 8 ofertas na banca' : 'Não deu para colocar: ' + error.message); }
      else { toast(`🏪 ${v.qtd} ${item(v.id).nome} à venda por ${fmtN(v.preco)}!`, 'bom'); BAN.venda = null; enviarSave(); }
    } catch (e) { S.celeiro[v.id] = (S.celeiro[v.id] || 0) + v.qtd; toast('Sem internet'); }
    tudo(); carregarBanca();
  }
  async function cancelarOferta(id) {
    try { const {data} = await ON.sb.rpc('cancelar_oferta', {oferta:id}); if (data && data[0]) { S.celeiro[data[0].item] = (S.celeiro[data[0].item] || 0) + data[0].qtd; toast('Oferta retirada: os itens voltaram para o armazém'); tudo(); enviarSave(); } } catch (e) { toast('Sem internet'); }
    carregarBanca();
  }
  async function recolherVendas() {
    try { const {data} = await ON.sb.rpc('recolher_vendas'); const tot = (data || []).reduce((t, o) => t + o.preco, 0);
      if (tot) { S.moedas += tot; S.stats.vendeu += tot; toast(`💰 Recolheu ${fmtN(tot)} moedas da banca!`, 'bom'); pulsar(); tudo(); enviarSave(); } } catch (e) { toast('Sem internet'); }
    carregarBanca();
  }
  function htmlBanca() {
    if (!ON.user) return '<p class="dica">A banca é online: entre com Google em ⚙️ Configurações para vender e comprar de outros fazendeiros.</p>';
    if (BAN.ofertas == null && !BAN.carregando) setTimeout(carregarBanca, 0);
    let h = `<div class="loja-topo"><div class="subabas"><button data-banca="comprar" class="${BAN.sub === 'comprar' ? 'ativa' : ''}">🛒 Comprar</button><button data-banca="minha" class="${BAN.sub === 'minha' ? 'ativa' : ''}">🏪 Minha banca</button></div></div>`;
    if (BAN.carregando && BAN.ofertas == null) return h + '<p class="dica">Carregando…</p>';
    if (BAN.erro) h += `<p class="dica">⚠️ ${esc(BAN.erro)}</p>`;
    if (BAN.sub === 'comprar') {
      if (!(BAN.ofertas || []).length) return h + '<p class="dica">Nenhuma oferta agora. Volte daqui a pouco ou coloque as suas! 🌻</p>';
      h += '<div class="vitrine">' + BAN.ofertas.map(o => { const it = item(o.item), justo = o.qtd * precoBase(o.item);
        return `<div class="tile"><span class="selo">por ${esc(o.nome)}</span><div class="t-ic"><span class="emo-g">${emojiItem(it)}</span></div><div class="t-nome">${it.nome} ×${o.qtd}</div>
          <div class="t-info"><span class="preco-g">${moedaMini}${fmtN(o.preco)}</span><span class="${o.preco < justo ? 'sobe' : o.preco > justo * 1.2 ? 'desce' : ''}">${o.preco < justo ? 'mais barato que o normal' : o.preco > justo * 1.2 ? 'acima do normal' : 'preço normal'}</span></div>
          <div class="t-acao"><button class="btn verde" data-comprar-oferta="${o.id}" ${S.moedas < o.preco ? 'disabled' : ''}>Comprar</button></div></div>`; }).join('') + '</div>';
      return h;
    }
    const vendidas = (BAN.minhas || []).filter(o => o.comprador), abertas = (BAN.minhas || []).filter(o => !o.comprador), tot = vendidas.reduce((t, o) => t + o.preco, 0);
    h += '<div class="vitrine">';
    if (tot) h += `<div class="tile amigo-ok"><span class="selo max">Vendido!</span><div class="t-ic"><span class="emo-g">💰</span></div><div class="t-nome">${vendidas.length} venda(s)</div><div class="t-info"><span class="preco-g">${moedaMini}${fmtN(tot)}</span></div><div class="t-acao"><button class="btn verde" data-acao="recolher-banca">Recolher</button></div></div>`;
    const v = BAN.venda;
    if (v) { const it = item(v.id), b = v.qtd * precoBase(v.id), tem = S.celeiro[v.id] || 0;
      h += `<div class="tile larga"><span class="selo">Nova oferta</span><div class="t-ic"><span class="emo-g">${emojiItem(it)}</span></div><div class="t-nome">${it.nome}</div>
        <div class="t-info"><span>Quantidade: <button class="mini-b" data-bv="q-1">−</button> <b>${v.qtd}</b> <button class="mini-b" data-bv="q1">+</button> <small>(tem ${tem})</small></span>
        <span>Preço: <button class="mini-b" data-bv="p-">−</button> <b>${moedaMini}${fmtN(v.preco)}</b> <button class="mini-b" data-bv="p+">+</button></span><span><small>normal: ${fmtN(b)}</small></span></div>
        <div class="t-acao"><button class="btn verde" data-acao="colocar-oferta">Vender</button><button class="btn" data-bv="cancelar">✕</button></div></div>`; }
    else { const tem = VENDAVEIS.filter(i => (S.celeiro[i.id] || 0) > 0);
      h += `<div class="tile larga"><span class="selo">Vender na banca</span><div class="t-ic"><span class="emo-g">🏪</span></div><div class="t-nome">Escolha um item</div>
        <div class="t-info ban-escolha">${tem.length ? tem.map(i => `<button class="mini-b" data-bv-item="${i.id}" title="${i.nome}">${emojiItem(i)}<small>${S.celeiro[i.id]}</small></button>`).join('') : '<span>Seu armazém está vazio</span>'}</div><div class="t-acao"></div></div>`; }
    abertas.forEach(o => { const it = item(o.item); h += `<div class="tile"><span class="selo">À venda</span><div class="t-ic"><span class="emo-g">${emojiItem(it)}</span></div><div class="t-nome">${it.nome} ×${o.qtd}</div><div class="t-info"><span class="preco-g">${moedaMini}${fmtN(o.preco)}</span><span>esperando comprador</span></div><div class="t-acao"><button class="btn" data-cancelar-oferta="${o.id}">Retirar</button></div></div>`; });
    return h + '</div>';
  }
  function cliqueBanca(e) {
    const bs = e.target.closest('[data-banca]'); if (bs) { BAN.sub = bs.dataset.banca; renderJanela(); return true; }
    const co = e.target.closest('[data-comprar-oferta]'); if (co) { comprarOferta(+co.dataset.comprarOferta); return true; }
    const ca = e.target.closest('[data-cancelar-oferta]'); if (ca) { cancelarOferta(+ca.dataset.cancelarOferta); return true; }
    const bi = e.target.closest('[data-bv-item]'); if (bi) { const id = bi.dataset.bvItem, q = Math.min(10, S.celeiro[id] || 0); BAN.venda = {id, qtd:q, preco:q * precoBase(id)}; renderJanela(); return true; }
    const bv = e.target.closest('[data-bv]'); if (bv && BAN.venda) { const v = BAN.venda, a = bv.dataset.bv, tem = S.celeiro[v.id] || 0;
      if (a === 'cancelar') BAN.venda = null;
      else if (a === 'q1' || a === 'q-1') { const ant = v.qtd; v.qtd = Math.max(1, Math.min(50, tem, v.qtd + (a === 'q1' ? 1 : -1))); v.preco = Math.round(v.preco / ant * v.qtd); }
      else { const b = v.qtd * precoBase(v.id); v.preco = Math.max(Math.ceil(b * .5), Math.min(Math.floor(b * 2), Math.round(v.preco * (a === 'p+' ? 1.1 : .9)))); }
      renderJanela(); return true; }
    return false;
  }
  // ================= COOPERATIVAS =================
  const COOP = {meu:undefined, info:null, membros:[], mural:[], pedidos:[], lista:null, carregando:false, sub:'pedidos', emblema:'🌻'};
  const EMBLEMAS = ['🌻', '🐔', '🐄', '🌾', '🍎', '🐝', '🚜', '🌈'];
  async function carregarCoop() {
    if (!ON.user) return; COOP.carregando = true; if (janela === 'amigos') renderJanela();
    try {
      const {data:m} = await ON.sb.from('coop_membros').select('coop_id, papel').eq('user_id', ON.user.id).maybeSingle();
      COOP.meu = m ? m.coop_id : null; COOP.papel = m && m.papel;
      if (COOP.meu) {
        const [{data:c}, {data:mb}, {data:mu}, {data:pd}] = await Promise.all([ON.sb.from('coops').select('*').eq('id', COOP.meu).maybeSingle(), ON.sb.from('coop_membros').select('user_id, papel').eq('coop_id', COOP.meu),
          Promise.resolve({data:[]}), ON.sb.from('coop_pedidos').select('*').eq('coop_id', COOP.meu).order('criado', {ascending:false}).limit(40)]);
        const nomes = await nomesDe([...new Set([...(mb || []).map(x => x.user_id), ...(mu || []).map(x => x.user_id), ...(pd || []).map(x => x.user_id)])]);
        COOP.info = c; COOP.membros = (mb || []).map(x => Object.assign({}, nomes['_' + x.user_id] || {nome:'?'}, x)).sort((a, b) => (estaOnline(b) ? 1 : 0) - (estaOnline(a) ? 1 : 0) || (b.nivel || 0) - (a.nivel || 0));
        COOP.mural = (mu || []).map(x => Object.assign(x, {nome:nomes[x.user_id] || '?'})); COOP.pedidos = (pd || []).filter(x => item(x.item) && (x.doado < x.qtd || x.recolhido < x.doado || x.user_id === ON.user.id && Date.now() - Date.parse(x.criado) < 864e5)).map(x => Object.assign(x, {nome:nomes[x.user_id] || '?'}));
      } else {
        let qc = ON.sb.from('coops').select('id, nome, emblema, descricao'); if (COOP.busca) qc = qc.ilike('nome', '%' + COOP.busca.replace(/[%_]/g, '') + '%');
        const {data:cs} = await qc.order('criado', {ascending:false}).limit(40);
        const {data:mb} = await ON.sb.from('coop_membros').select('coop_id').in('coop_id', (cs || []).map(c => c.id));
        const n = {}; (mb || []).forEach(x => n[x.coop_id] = (n[x.coop_id] || 0) + 1);
        COOP.lista = (cs || []).map(c => Object.assign(c, {n:n[c.id] || 0})).sort((a, b) => b.n - a.n);
      }
    } catch (e) { COOP.erro = 'sem internet'; }
    COOP.carregando = false; if (janela === 'amigos') renderJanela();
  }
  async function coopRpc(f, args, ok) { try { const {data, error} = await ON.sb.rpc(f, args); if (error) { toast('😕 ' + error.message); return null; } if (ok) toast(ok, 'bom'); return data; } catch (e) { toast('Sem internet'); return null; } }
  function htmlCoop() {
    if (COOP.meu === undefined && !COOP.carregando) setTimeout(carregarCoop, 0);
    if (COOP.carregando && COOP.meu === undefined) return '<p class="dica">Carregando…</p>';
    if (!COOP.meu) {
      let h = `<p class="dica">Cooperativas são grupos de até 20 fazendeiros que se ajudam: chat da cooperativa e pedidos de itens entre os membros.</p>
        <div class="subabas"><button data-coop-novo="procurar" class="${COOP.novo !== 'criar' ? 'ativa' : ''}">🔎 Procurar</button><button data-coop-novo="criar" class="${COOP.novo === 'criar' ? 'ativa' : ''}">➕ Criar nova</button></div>`;
      if (COOP.novo === 'criar') return h + `<div class="campo-nome"><input id="inCoop" maxlength="24" placeholder="Nome da nova cooperativa" autocomplete="off"><button class="btn verde" data-acao="criar-coop" ${S.moedas < 5000 ? 'disabled' : ''}>Criar · ${moedaMini}5.000</button></div>
        <p class="sub">Emblema</p><div class="sug-nomes">${EMBLEMAS.map(e => `<button class="btn ${COOP.emblema === e ? 'verde' : ''}" data-emblema="${e}">${e}</button>`).join('')}</div>`;
      h += `<div class="campo-nome"><input id="inBuscaCoop" maxlength="24" placeholder="Nome da cooperativa" value="${esc(COOP.busca || '')}" autocomplete="off"><button class="btn verde" data-acao="buscar-coop">🔎 Buscar</button></div>
        <p class="sub">${COOP.busca ? `Resultados para "${esc(COOP.busca)}"` : 'Cooperativas'}</p>`;
      if (!(COOP.lista || []).length) h += `<p class="dica">${COOP.busca ? 'Nenhuma cooperativa com esse nome.' : 'Nenhuma ainda. Crie a primeira! 🌻'}</p>`;
      (COOP.lista || []).forEach(c => h += `<div class="card"><div class="em">${esc(c.emblema)}</div><div class="meio"><div class="nome">${esc(c.nome)}</div><div class="det">${c.n}/20 membros ${c.descricao ? '· ' + esc(c.descricao) : ''}</div></div><button class="btn verde" data-entrar-coop="${c.id}" ${c.n >= 20 ? 'disabled' : ''}>${c.n >= 20 ? 'Cheia' : 'Entrar'}</button></div>`);
      return h;
    }
    const c = COOP.info || {}, me = ON.user.id;
    let h = `<div class="coop-topo"><span class="coop-emb">${esc(c.emblema || '🌻')}</span><div><b>${esc(c.nome || '')}</b><div class="det">${COOP.membros.length}/20 membros · ${COOP.membros.filter(estaOnline).length} online</div></div></div>
      <div class="subabas">${[['pedidos', '📦 Pedidos'], ['membros', '👥 Membros']].map(([k, t]) => `<button data-coop-sub="${k}" class="${COOP.sub === k ? 'ativa' : ''}">${t}</button>`).join('')}<button data-chat-abrir="coop">💬 Chat</button><button data-acao="atualizar-amigos">🔄</button></div>`;
    if (COOP.sub === 'mural_antigo') {
      h += `<div class="campo-nome"><input id="inMural" maxlength="140" placeholder="Escreva um recado para a cooperativa" autocomplete="off"><button class="btn verde" data-acao="postar-mural">Enviar</button></div>`;
      h += COOP.mural.length ? COOP.mural.map(m => `<div class="mural-msg"><b>${esc(m.nome)}</b> <small>${hora(m.criado)}</small><div>${esc(m.texto)}</div></div>`).join('') : '<p class="dica">Nenhum recado ainda.</p>';
    } else if (COOP.sub === 'pedidos') {
      const meus = COOP.pedidos.filter(p => p.user_id === me), recolher = meus.reduce((t, p) => t + p.doado - p.recolhido, 0);
      if (recolher) h += `<button class="btn verde" data-acao="recolher-coop" style="width:100%;margin-bottom:8px">📦 Recolher ${recolher} item(ns) doados</button>`;
      h += `<p class="dica">Peça até 20 de um item; os colegas doam e ganham moedas. Você pode ter 1 pedido aberto por vez.</p>`;
      if (!meus.some(p => p.doado < p.qtd)) h += `<div class="ban-escolha">${itensParaPedido().slice(0, 40).map(i => `<button class="mini-b" data-pedir-coop="${i.id}" title="${i.nome}">${emojiItem(i)}</button>`).join('')}</div>`;
      COOP.pedidos.forEach(p => { const it = item(p.item), meu = p.user_id === me, tem = S.celeiro[p.item] || 0, falta = p.qtd - p.doado;
        h += `<div class="card ${falta <= 0 ? 'amigo-ok' : ''}"><div class="em">${emojiItem(it)}</div><div class="meio"><div class="nome">${meu ? 'Você' : esc(p.nome)} pede ${p.qtd} ${it.nome}</div><div class="det">${p.doado}/${p.qtd} doados</div></div>
          ${meu || falta <= 0 ? '' : `<div class="botoes"><button class="btn verde" data-doar="${p.id}" data-q="1" ${tem < 1 ? 'disabled' : ''}>Doar 1</button><button class="btn" data-doar="${p.id}" data-q="${Math.min(5, falta)}" ${tem < Math.min(5, falta) ? 'disabled' : ''}>Doar ${Math.min(5, falta)}</button></div>`}</div>`; });
    } else {
      COOP.membros.forEach(m => h += `<div class="card"><div class="em">${estaOnline(m) ? '🟢' : '⚪'}</div><div class="meio"><div class="nome">${esc(m.nome)} ${m.papel === 'lider' ? '👑' : ''}</div><div class="det">⭐ Nível ${m.nivel || 1}</div></div>${m.user_id === me ? '' : `<button class="btn verde" data-visitar="${m.user_id}" data-nome="${esc(m.nome)}">Visitar</button>`}</div>`);
      h += `<button class="btn vermelho" data-acao="sair-coop" style="width:100%;margin-top:8px">Sair da cooperativa</button>`;
    }
    return h;
  }
  async function cliqueCoop(e) {
    const cn = e.target.closest('[data-coop-novo]'); if (cn) { COOP.novo = cn.dataset.coopNovo; renderJanela(); return true; }
    const em = e.target.closest('[data-emblema]'); if (em) { COOP.emblema = em.dataset.emblema; renderJanela(); return true; }
    const ec = e.target.closest('[data-entrar-coop]'); if (ec) { if (await coopRpc('entrar_coop', {c:+ec.dataset.entrarCoop}, '🤝 Você entrou na cooperativa!') !== null) { COOP.meu = undefined; carregarCoop(); } return true; }
    const cs = e.target.closest('[data-coop-sub]'); if (cs) { COOP.sub = cs.dataset.coopSub; renderJanela(); return true; }
    const pc = e.target.closest('[data-pedir-coop]'); if (pc) { const q = crop(pc.dataset.pedirCoop) ? 10 : 3;
      try { const {error} = await ON.sb.from('coop_pedidos').insert({coop_id:COOP.meu, user_id:ON.user.id, item:pc.dataset.pedirCoop, qtd:q}); toast(error ? 'Não deu para pedir: ' + error.message : `📦 Pedido de ${q} ${item(pc.dataset.pedirCoop).nome} enviado!`, error ? '' : 'bom'); } catch (x) { toast('Sem internet'); }
      carregarCoop(); return true; }
    const dd = e.target.closest('[data-doar]'); if (dd) { const p = COOP.pedidos.find(x => x.id === +dd.dataset.doar), q = +dd.dataset.q; if (!p || (S.celeiro[p.item] || 0) < q) return true;
      const dado = await coopRpc('doar_coop', {p:p.id, q}); if (dado > 0) { S.celeiro[p.item] -= dado; S.moedas += dado * 12; ganharXp(dado * 2); toast(`💚 Doou ${dado} ${item(p.item).nome}! +${dado * 12} moedas`, 'bom'); tudo(); enviarSave(); }
      carregarCoop(); return true; }
    return false;
  }
  async function acaoCoop(ac) {
    if (ac === 'criar-coop') { const n = ($('#inCoop') || {}).value || ''; if (n.trim().length < 3) { toast('Dê um nome com pelo menos 3 letras'); return; } if (S.moedas < 5000) return;
      const id = await coopRpc('criar_coop', {n, e:COOP.emblema, d:''}, `🎉 Cooperativa ${n} criada!`); if (id) { S.moedas -= 5000; tudo(); enviarSave(); COOP.meu = undefined; carregarCoop(); } }
    if (ac === 'postar-mural') { const t = (($('#inMural') || {}).value || '').trim(); if (!t) return; try { await ON.sb.from('coop_mural').insert({coop_id:COOP.meu, user_id:ON.user.id, texto:t.slice(0, 140)}); } catch (e) {} carregarCoop(); }
    if (ac === 'recolher-coop') { const r = await coopRpc('recolher_coop', {}); let n = 0; (r || []).forEach(x => { if (item(x.item)) { S.celeiro[x.item] = (S.celeiro[x.item] || 0) + x.qtd; n += x.qtd; } }); if (n) { toast(`📦 Recebeu ${n} item(ns) da cooperativa!`, 'bom'); tudo(); enviarSave(); } carregarCoop(); }
    if (ac === 'sair-coop') { try { await ON.sb.from('coop_membros').delete().eq('user_id', ON.user.id); toast('Você saiu da cooperativa'); } catch (e) {} COOP.meu = undefined; carregarCoop(); }
  }

  // ================= VENDER EM PARTES =================
  let venda = null;
  function abrirVenda(id) { const q = S.celeiro[id] || 0; if (!q) return; venda = {id, n:Math.max(1, Math.ceil(q / 2))}; renderVenda(); }
  function renderVenda() {
    const el = $('#popVenda'); if (!venda) { el.classList.remove('on'); return; }
    const it = item(venda.id), q = S.celeiro[venda.id] || 0; venda.n = Math.max(1, Math.min(q, venda.n));
    if (!q) { venda = null; el.classList.remove('on'); return; }
    const pr = precoAtual(venda.id);
    el.innerHTML = `<div class="pv-caixa"><div class="pv-topo"><span class="pv-ic">${emojiItem(it)}</span><div><b>Vender ${it.nome}</b><div class="det">Você tem ${q} · ${moedaMini}${pr} cada</div></div><button class="fechar" data-pv="fechar">✕</button></div>
      <div class="pv-qtd"><button class="btn" data-pv="-10">−10</button><button class="btn" data-pv="-1">−</button><b>${venda.n}</b><button class="btn" data-pv="1">+</button><button class="btn" data-pv="10">+10</button></div>
      <input type="range" min="1" max="${q}" value="${venda.n}" id="pvRange">
      <div class="pv-atalhos"><button class="btn" data-pv="um">1</button><button class="btn" data-pv="metade">Metade</button>${q > 10 ? '<button class="btn" data-pv="menos10">Deixar 10</button>' : ''}<button class="btn" data-pv="tudo">Tudo</button></div>
      <button class="btn verde grande" data-pv="ok">Vender ${venda.n} por ${moedaMini}${fmtN(venda.n * pr)}</button></div>`;
    el.classList.add('on');
  }
  function iniciarVenda() {
    const el = $('#popVenda');
    el.addEventListener('click', e => {
      if (e.target === el) { venda = null; renderVenda(); return; }
      const b = e.target.closest('[data-pv]'); if (!b || !venda) return; const a = b.dataset.pv, q = S.celeiro[venda.id] || 0;
      if (a === 'fechar') venda = null;
      else if (a === 'ok') { const n = vender(venda.id, venda.n); if (n) { toast(`Vendeu ${venda.n} por ${fmtN(n)} moedas`, 'bom'); pulsar(); } venda = null; tudo(); }
      else if (a === 'um') venda.n = 1; else if (a === 'metade') venda.n = Math.ceil(q / 2); else if (a === 'tudo') venda.n = q; else if (a === 'menos10') venda.n = q - 10;
      else venda.n += +a;
      renderVenda();
    });
    el.addEventListener('input', e => { if (e.target.id === 'pvRange' && venda) { venda.n = +e.target.value; const v = el.querySelector('[data-pv=ok]'), bq = el.querySelector('.pv-qtd b');
      if (bq) bq.textContent = venda.n; if (v) v.innerHTML = `Vender ${venda.n} por ${moedaMini}${fmtN(venda.n * precoAtual(venda.id))}`; } });
  }

  // ================= ATUALIZAÇÕES (versao.json no GitHub) =================
  let novaVersao = null;
  async function procurarVersao(avisar) {
    if (!/^https?:$/.test(location.protocol)) { if (avisar) toast('Só dá para procurar atualização pelo site do jogo'); return; }
    try {
      const r = await fetch('versao.json?t=' + Date.now(), {cache:'no-store'}); const j = await r.json();
      if (j.versao && j.versao !== VERSAO) { novaVersao = j.versao; $('#avisoVersao').classList.add('on'); $('#avisoVersao b').textContent = j.versao; }
      else if (avisar) toast('✅ Você já está na versão mais nova (' + VERSAO + ')', 'bom');
    } catch (e) { if (avisar) toast('Sem internet para procurar atualização'); }
    if (janela === 'config') renderJanela();
  }
  async function atualizarJogo() {
    toast('🌱 Atualizando…'); salvar();
    try { if (ON.user && ON.sujo) await enviarSave(); } catch (e) {}
    try { const reg = navigator.serviceWorker && await navigator.serviceWorker.getRegistration(); if (reg) await reg.update(); } catch (e) {}
    try { const ks = await caches.keys(); await Promise.all(ks.map(k => caches.delete(k))); } catch (e) {}
    location.reload();
  }

  // ================= ONLINE (Supabase: login Google, save na nuvem, ranking) =================
  const SB_URL = 'https://oxnhimwkotsrfuxakazo.supabase.co', SB_KEY = 'sb_publishable_LFUz1Cn-9RouOGJbayeg1Q_YDrqcqOZ';
  const podeLogar = () => /^https?:$/.test(location.protocol) && window.top === window; // Google não deixa entrar dentro de iframe nem em arquivo local
  const producaoTotal = () => [S.stats.colheu, S.stats.coletou, S.stats.fez].reduce((a, o) => a + Object.values(o || {}).reduce((x, y) => x + (+y || 0), 0), 0);
  function iniciarOnline() {
    if (!window.supabase || !window.supabase.createClient) return;
    try { ON.sb = window.supabase.createClient(SB_URL, SB_KEY, {auth:{persistSession:true, autoRefreshToken:true, detectSessionInUrl:true, flowType:'pkce'}}); } catch (e) { console.warn(e); return; }
    ON.sb.auth.onAuthStateChange((ev, sess) => {
      const u = sess && sess.user, novo = u && (!ON.user || ON.user.id !== u.id);
      ON.user = u || null;
      if (novo) { ON.sincronizado = false; setTimeout(sincronizarAoEntrar, 0); }
      if (janela === 'config' || janela === 'ranking') renderJanela();
    });
    setInterval(() => { if (ON.user && ON.sujo && Date.now() - ON.ultimo > 30000) enviarSave(); }, 5000);
    setInterval(batida, 60000); setTimeout(batida, 8000);
    document.addEventListener('visibilitychange', () => { if (document.hidden && ON.user && ON.sujo) enviarSave(); });
  }
  async function entrarGoogle() {
    if (!ON.sb) { toast('Sem conexão com o servidor agora'); return; }
    if (!podeLogar()) { toast('Para entrar com Google, abra o jogo pelo endereço do site (não pelo arquivo nem pela prévia)'); return; }
    const {error} = await ON.sb.auth.signInWithOAuth({provider:'google', options:{redirectTo:location.origin + location.pathname, queryParams:{prompt:'select_account'}}});
    if (error) toast('Não deu para entrar: ' + error.message);
  }
  async function sairConta() {
    if (ON.sujo) await enviarSave();
    await ON.sb.auth.signOut(); ON.user = null; toast('Você saiu da conta. A fazenda continua salva neste aparelho.'); renderJanela();
  }
  // Sincronização: cada save na nuvem tem um carimbo (atualizado). O aparelho guarda o carimbo que conhece (S.nuvemVer).
  // Se o carimbo da nuvem mudou sem ser por este aparelho, outro aparelho salvou: carrega de lá ou pergunta, nunca sobrescreve sem querer.
  const verDe = t => Date.parse(t) || 0;
  async function lerNuvem(campos) { return ON.sb.from('saves').select(campos).eq('user_id', ON.user.id).maybeSingle(); }
  // ---------- várias contas no mesmo aparelho: cada uma tem a sua fazenda guardada separada ----------
  const SLOT = id => 'terralia-conta:' + (id || 'convidado');
  const lerSlot = id => { try { return JSON.parse(localStorage.getItem(SLOT(id))); } catch (e) { return null; } };
  function guardarSlot() { if (!S) return; try { localStorage.setItem(SLOT(S.uid), JSON.stringify(S)); } catch (e) {} }
  function listaContas() { try { return JSON.parse(localStorage.getItem('terralia-contas')) || []; } catch (e) { return []; } }
  function lembrarConta(u) {
    const md = u.user_metadata || {}, l = listaContas().filter(c => c.uid !== u.id);
    l.unshift({uid:u.id, email:u.email || '', nome:md.full_name || md.name || u.email || 'Conta Google', foto:md.avatar_url || ''});
    try { localStorage.setItem('terralia-contas', JSON.stringify(l.slice(0, 8))); } catch (e) {}
  }
  // troca a fazenda ativa e recarrega (com trava contra recarregar sem parar)
  function carregarFazenda(d, msg) {
    let rc = {n:0, t:0}; try { rc = JSON.parse(sessionStorage.getItem('terralia-rc')) || rc; } catch (e) {}
    if (Date.now() - rc.t > 30000) rc = {n:0, t:Date.now()};
    if (rc.n >= 3) { ON.pausado = true; ON.erro = 'não deu para trocar de fazenda'; toast('☁️ Não deu para carregar a fazenda. Saia da conta e entre de novo.'); return; }
    rc.n++; try { sessionStorage.setItem('terralia-rc', JSON.stringify(rc)); if (msg) sessionStorage.setItem('terralia-msg', msg); } catch (e) {}
    ON.recarregando = true; ON.sujo = false; // a partir daqui nada mais é salvo por cima
    try { if (d) localStorage.setItem(KEY, JSON.stringify(d)); else localStorage.removeItem(KEY); } catch (e) {}
    location.reload();
  }
  function fazendaNova(uid) { const d = novo(); d.uid = uid || undefined; return d; }
  async function sincronizarAoEntrar() {
    if (!ON.user || ON.recarregando) return;
    if (VISITA) { ON.sincronizado = false; renderVisita(); return; } // visitando: não mexe na própria fazenda
    const uid = ON.user.id; lembrarConta(ON.user);
    const {data, error} = await lerNuvem('dados, atualizado');
    if (error) { ON.erro = error.message; toast('☁️ Não deu para ler a nuvem agora'); setTimeout(sincronizarAoEntrar, 15000); return; } // tenta de novo depois; até lá não envia nada
    const nv = data && (data.dados || {}), ver = data ? verDe(data.atualizado) : 0;
    const localNovo = !S.colhidos && S.nivel <= 1 && !S.stats.vendeu;
    if (S.uid && S.uid !== uid) { // a fazenda aberta é de OUTRA conta: guarda ela e abre a desta conta
      guardarSlot();
      const loc = lerSlot(uid);
      if (data) carregarFazenda(loc && loc.nuvemVer === ver ? loc : Object.assign({}, nv, {uid, nuvemVer:ver, salvoEm:ver}), '☁️ Fazenda da conta carregada!');
      else carregarFazenda(loc || fazendaNova(uid), loc ? '🌱 Fazenda da conta carregada!' : '🌱 Fazenda nova para esta conta!');
      return;
    }
    if (!S.uid) { // jogando sem conta e acabou de entrar
      if (data) { if (!localNovo) guardarSlot(); carregarFazenda(Object.assign({}, nv, {uid, nuvemVer:ver, salvoEm:ver}), '☁️ Fazenda da conta carregada!'); return; }
      if (localNovo) { ON.sincronizado = true; await enviarSave(true); return; }
      ON.sincronizado = true; ON.pausado = true; ON.motivo = 'levar'; abrir('nuvem'); return; // pergunta se leva a fazenda sem conta para a conta
    }
    // a fazenda aberta é desta conta
    if (!data) { ON.sincronizado = true; await enviarSave(true); return; }
    if (S.nuvemVer == null && Math.abs((nv.salvoEm || 0) - (S.salvoEm || 0)) < 2000) S.nuvemVer = ver; // saves antigos
    const mudouAqui = (S.salvoEm || 0) > (S.nuvemVer || 0) + 2000; // jogou neste aparelho depois do último envio
    if (S.nuvemVer === ver) { ON.sincronizado = true; if (mudouAqui || ON.sujo) enviarSave(); return; } // tudo em dia
    if (!mudouAqui) { carregarFazenda(Object.assign({}, nv, {uid, nuvemVer:ver, salvoEm:ver}), '☁️ Fazenda carregada da nuvem!'); return; } // outro aparelho avançou
    ON.nuvem = nv; ON.nuvemVer = ver; ON.pausado = true; ON.sincronizado = true; ON.motivo = 'outro'; abrir('nuvem');
  }
  function carregarDaNuvem(nv, ver) { carregarFazenda(Object.assign({}, nv, {uid:ON.user.id, nuvemVer:ver, salvoEm:ver}), '☁️ Fazenda carregada da nuvem!'); }
  async function trocarConta(alvo) { // alvo: uid de uma conta lembrada, 'nova' (outra conta Google) ou 'convidado'
    fechar(); toast('👥 Trocando de conta…');
    if (ON.user && ON.sujo) { try { await enviarSave(); } catch (e) {} }
    guardarSlot();
    if (alvo === 'convidado') {
      if (ON.sb && ON.user) { try { await ON.sb.auth.signOut(); } catch (e) {} }
      carregarFazenda(lerSlot(null) || fazendaNova(null), '🌱 Jogando sem conta'); return;
    }
    const c = listaContas().find(x => x.uid === alvo);
    if (!ON.sb || !podeLogar()) { toast('Para entrar com Google, abra o jogo pelo endereço do site'); return; }
    if (ON.user) { try { await ON.sb.auth.signOut(); } catch (e) {} ON.user = null; }
    ON.recarregando = true; // não salva nada por cima enquanto vai para o Google
    const {error} = await ON.sb.auth.signInWithOAuth({provider:'google', options:{redirectTo:location.origin + location.pathname, queryParams:Object.assign({prompt:'select_account'}, c && c.email ? {login_hint:c.email} : {})}});
    if (error) { ON.recarregando = false; toast('Não deu para entrar: ' + error.message); }
  }
  function htmlContas() {
    const atual = ON.user && ON.user.id, l = listaContas();
    let h = '<p class="dica">Cada conta tem a sua própria fazenda. Ao trocar, a fazenda de agora fica salva e você pode voltar para ela quando quiser.</p>';
    l.forEach(c => h += `<div class="card ${c.uid === atual ? 'amigo-ok' : ''}"><div class="em">${c.foto ? `<img class="foto-conta" src="${esc(c.foto)}" alt="" referrerpolicy="no-referrer">` : '👤'}</div>
      <div class="meio"><div class="nome">${esc(c.nome)}</div><div class="det">${esc(c.email)}</div></div>
      ${c.uid === atual ? '<span class="nv">Jogando agora</span>' : `<button class="btn verde" data-conta="${c.uid}">Usar</button>`}</div>`);
    h += `<div class="card"><div class="em">➕</div><div class="meio"><div class="nome">Outra conta Google</div><div class="det">Entra com uma conta diferente (começa com fazenda nova se ainda não tiver)</div></div><button class="btn btn-google" data-conta="nova"><b>G</b> Entrar</button></div>`;
    h += `<div class="card ${!atual ? 'amigo-ok' : ''}"><div class="em">📱</div><div class="meio"><div class="nome">Jogar sem conta</div><div class="det">A fazenda fica salva só neste aparelho e não entra no ranking</div></div>
      ${!atual ? '<span class="nv">Jogando agora</span>' : '<button class="btn" data-conta="convidado">Usar</button>'}</div>`;
    return h;
  }
  // ---------- nome único no ranking ----------
  function sugestoesNome(base) {
    base = (base || 'Fazendeiro').replace(/[^\p{L}\p{N}_ ]/gu, '').trim().slice(0, 18) || 'Fazendeiro';
    const r = () => 10 + Math.floor(Math.random() * 89);
    return [base, base + r(), base + '_Farm', 'Fazendeiro' + base.slice(0, 12), base + '_' + r(), base + 'Terra', base + r() + r()].map(n => n.slice(0, 24));
  }
  async function abrirEscolhaNome(motivo) {
    ON.motivoNome = motivo; ON.sugestoes = null; abrir('nomeRank');
    try { const {data} = await ON.sb.rpc('nomes_livres', {nomes:sugestoesNome(S.perfil && S.perfil.nome)}); ON.sugestoes = (data || []).filter(n => n !== (S.perfil && S.perfil.nome)).slice(0, 4); } catch (e) { ON.sugestoes = []; }
    if (janela === 'nomeRank') renderJanela();
  }
  async function escolherNome(n) {
    n = String(n || '').replace(/\s+/g, ' ').trim().slice(0, 24);
    if (n.length < 3) { toast('O nome precisa ter pelo menos 3 letras'); return; }
    try {
      const {data, error} = await ON.sb.rpc('nomes_livres', {nomes:[n]});
      if (error) throw error;
      if (!data || !data.length) { toast(`😕 O nome "${n}" já é de outro fazendeiro. Tente outro!`); return; }
    } catch (e) { toast('Sem internet para conferir o nome'); return; }
    S.perfil = Object.assign({}, S.perfil || {}, {nome:n}); salvar(); aplicarAvatar && aplicarAvatar();
    fechar(); toast(`✅ Agora você é ${n} no ranking!`, 'bom'); ON.pausado = false; enviarSave(true, true);
  }
  function htmlNome() {
    const atual = (S.perfil && S.perfil.nome) || '';
    return `<p class="dica">${ON.motivoNome === 'ocupado' ? `O nome <b>${esc(atual)}</b> já é de outro fazendeiro no ranking. Cada fazendeiro precisa de um nome só dele.` : 'Escolha o nome que vai aparecer no ranking.'}</p>
      <div class="campo-nome"><input id="inNome" maxlength="24" value="${esc(atual)}" placeholder="Seu nome" autocomplete="off"><button class="btn verde" data-acao="nome-ok">Usar</button></div>
      <p class="sub">Sugestões livres</p><div class="sug-nomes">${ON.sugestoes == null ? '<span class="det">Procurando…</span>' : ON.sugestoes.length ? ON.sugestoes.map(n => `<button class="btn" data-nome="${esc(n)}">${esc(n)}</button>`).join('') : '<span class="det">Digite um nome diferente.</span>'}</div>`;
  }
  function usarSaveNuvem() { if (ON.nuvem) carregarDaNuvem(ON.nuvem, ON.nuvemVer || 0); }
  async function enviarSave(avisar, forcar) {
    if (!ON.user || ON.enviando || ON.recarregando || !ON.sincronizado || (ON.pausado && !forcar)) return; // nunca envia antes de comparar com a nuvem
    ON.enviando = true;
    try {
      if (!forcar && S.uid === ON.user.id) { // confere se outro aparelho salvou desde a última vez
        const {data} = await lerNuvem('atualizado');
        if (data && verDe(data.atualizado) !== S.nuvemVer) {
          const r = await lerNuvem('dados, atualizado'); ON.enviando = false;
          if (r.data) { ON.nuvem = r.data.dados; ON.nuvemVer = verDe(r.data.atualizado); ON.pausado = true; ON.motivo = 'outro'; abrir('nuvem'); }
          return;
        }
      }
      const agora = new Date().toISOString(), p = S.perfil || {};
      S.uid = ON.user.id; S.nuvemVer = verDe(agora); salvar(); S.salvoEm = S.nuvemVer; salvar();
      const r1 = await ON.sb.from('saves').upsert({user_id:ON.user.id, dados:S, atualizado:agora});
      const r2 = r1.error ? {} : await ON.sb.from('ranking').upsert({user_id:ON.user.id, nome:(p.nome || 'Fazendeiro').slice(0, 24), nivel:S.nivel, producao:producaoTotal(), terras:S.zonas.length, avatar:p.avatar || null, atualizado:agora, visto_em:agora});
      if (!r1.error) ON.sb.from('fazendas_publicas').upsert({user_id:ON.user.id, dados:fotoFazenda(), atualizado:agora}).then(() => {}, () => {});
      if (r2.error && r2.error.code === '23505') { ON.sujo = false; ON.ultimo = Date.now(); ON.erro = 'escolha outro nome para o ranking'; abrirEscolhaNome('ocupado'); ON.enviando = false; return; }
      const err = r1.error || r2.error;
      if (err) { ON.erro = err.message; if (avisar) toast('☁️ Não deu para salvar na nuvem: ' + err.message); }
      else { ON.sujo = false; ON.pausado = false; ON.ultimo = Date.now(); ON.erro = ''; if (avisar) toast('☁️ Fazenda salva na nuvem!', 'bom'); }
    } catch (e) { ON.erro = 'sem internet'; }
    ON.enviando = false;
    if (janela === 'config') renderJanela();
  }

  // ================= CHAT (global e da cooperativa) =================
  var CHAT = {aberto:false, aba:'global', msgs:{global:[], coop:[]}, ult:{global:0, coop:0}, naoLidas:{global:0, coop:0}, escolha:null, enviando:false, t:null, erro:''};
  try { Object.assign(CHAT.ult, JSON.parse(localStorage.getItem('terralia-chat-visto') || '{}')); } catch (e) {}
  const canalDe = aba => aba === 'coop' ? (COOP.meu ? 'coop:' + COOP.meu : null) : 'global';
  const horaCurta = t => new Date(t).toLocaleTimeString('pt-BR', {hour:'2-digit', minute:'2-digit'});
  async function garantirCoop() {
    if (COOP.meu !== undefined || !ON.user) return;
    try { const {data:m} = await ON.sb.from('coop_membros').select('coop_id, papel').eq('user_id', ON.user.id).maybeSingle(); COOP.meu = m ? m.coop_id : null; COOP.papel = m && m.papel; } catch (e) {}
  }
  function abrirChat(aba) {
    if (aba) CHAT.aba = aba;
    CHAT.aberto = true; CHAT.escolha = null; $('#chat').classList.add('aberto');
    renderChat(); carregarChat(true);
    clearInterval(CHAT.t); CHAT.t = setInterval(() => carregarChat(false), 4000);
  }
  function fecharChat() { CHAT.aberto = false; CHAT.escolha = null; $('#chat').classList.remove('aberto', 'digitando'); clearInterval(CHAT.t); CHAT.t = null; renderMissoes(); }
  async function carregarChat(tudoDeNovo) {
    if (!ON.user) { renderChat(); return; }
    await garantirCoop();
    const aba = CHAT.aba, canal = canalDe(aba); if (!canal) { renderChat(); return; }
    const lista = CHAT.msgs[aba], ultimo = !tudoDeNovo && lista.length ? lista[lista.length - 1].id : 0;
    try {
      let q = ON.sb.from('chat').select('id, user_id, nome, nivel, texto, tipo, ref, criado').eq('canal', canal);
      q = ultimo ? q.gt('id', ultimo).order('id', {ascending:true}).limit(50) : q.order('id', {ascending:false}).limit(50);
      const {data, error} = await q; if (error) throw error;
      const novas = ultimo ? data : (data || []).reverse();
      CHAT.msgs[aba] = (ultimo ? lista.concat(novas) : novas).slice(-80); CHAT.erro = '';
      if (novas.length || tudoDeNovo) renderChatSuave();
    } catch (e) { CHAT.erro = 'Sem conexão com o chat'; renderChat(); }
    marcarLido();
  }
  function marcarLido() {
    const l = CHAT.msgs[CHAT.aba]; if (!CHAT.aberto || !l.length) return;
    CHAT.ult[CHAT.aba] = Math.max(CHAT.ult[CHAT.aba] || 0, l[l.length - 1].id); CHAT.naoLidas[CHAT.aba] = 0;
    try { localStorage.setItem('terralia-chat-visto', JSON.stringify(CHAT.ult)); } catch (e) {}
    renderMissoes();
  }
  async function contarNaoLidas() {
    if (!ON.user || VISITA || document.hidden) return;
    await garantirCoop();
    for (const aba of ['global', 'coop']) {
      const canal = canalDe(aba); if (!canal || (CHAT.aberto && CHAT.aba === aba)) continue;
      try { const {count} = await ON.sb.from('chat').select('id', {count:'exact', head:true}).eq('canal', canal).neq('user_id', ON.user.id).gt('id', CHAT.ult[aba] || 0); CHAT.naoLidas[aba] = Math.min(99, count || 0); } catch (e) {}
    }
    renderMissoes();
  }
  const totalNaoLidas = () => (CHAT.naoLidas.global || 0) + (CHAT.naoLidas.coop || 0);
  function htmlMsg(m) {
    const eu = ON.user && m.user_id === ON.user.id, r = m.ref || {};
    let extra = '';
    if (m.tipo === 'venda' && r.item && item(r.item)) {
      const it = item(r.item);
      extra = `<div class="cm-card"><span class="cm-ic">${iconeItem(it, 'e')}</span><span><b>${r.qtd}× ${esc(it.nome)}</b><br>${moedaMini}${fmtN(r.preco)}</span>${eu ? '<small>sua oferta</small>' : `<button class="btn verde" data-chat-comprar="${+r.oferta}">Comprar</button>`}</div>`;
    }
    if (m.tipo === 'ajuda' && !eu) extra = `<div class="cm-card"><span>🏡 Fazenda de ${esc(m.nome)}</span><button class="btn" data-chat-visitar="${esc(m.user_id)}" data-nome="${esc(m.nome)}">Visitar e ajudar</button></div>`;
    return `<div class="cm ${eu ? 'eu' : ''} t-${m.tipo}"><div class="cm-top"><b>${esc(m.nome || 'Fazendeiro')}</b>${m.nivel ? `<small>Nv ${m.nivel}</small>` : ''}<small>${horaCurta(m.criado)}</small></div><div class="cm-txt">${m.tipo === 'venda' ? '📢 ' : m.tipo === 'ajuda' ? '🙋 ' : ''}${esc(m.texto)}</div>${extra}</div>`;
  }
  function renderChat(rolar) {
    const el = $('#chat'); if (!el || !CHAT.aberto) return;
    const ab = CHAT.aba, nl = CHAT.naoLidas;
    let corpo = '';
    if (!ON.user) corpo = `<div class="chat-vazio">Entre com sua conta Google para conversar com outros fazendeiros.<br><button class="btn verde" data-chat-cfg="1">Entrar</button></div>`;
    else if (ab === 'coop' && !COOP.meu) corpo = `<div class="chat-vazio">${COOP.meu === undefined ? 'Carregando…' : 'Você ainda não está em uma cooperativa.<br><button class="btn verde" data-chat-coops="1">🤝 Procurar cooperativa</button>'}</div>`;
    else if (CHAT.escolha === 'venda') {
      const minhas = (BAN.minhas || []).filter(o => !o.comprador);
      corpo = `<div class="chat-escolha"><b>Qual oferta da sua banca você quer anunciar?</b>${BAN.minhas === null ? '<p class="dica">Carregando…</p>' : minhas.length ? `<div class="ban-escolha">${minhas.map(o => `<button class="mini-b largo" data-chat-anunciar="${o.id}">${emojiItem(item(o.item))} ${o.qtd}× · ${fmtN(o.preco)}</button>`).join('')}</div>` : '<p class="dica">Você não tem nada à venda. Coloque algo na Banca primeiro!</p><button class="btn" data-chat-banca="1">🏪 Abrir banca</button>'}<button class="btn" data-chat-voltar="1">Voltar</button></div>`;
    } else {
      const l = CHAT.msgs[ab];
      corpo = `<div class="chat-msgs" id="chatMsgs">${l.length ? l.map(htmlMsg).join('') : `<div class="chat-vazio">${CHAT.erro || 'Nenhuma mensagem ainda. Diga oi! 👋'}</div>`}</div>`;
    }
    const pode = ON.user && (ab === 'global' || COOP.meu) && CHAT.escolha !== 'venda';
    el.innerHTML = `<div class="chat-topo"><button data-chat-aba="global" class="${ab === 'global' ? 'ativa' : ''}">🌎 Global${ab !== 'global' && nl.global ? `<b>${nl.global}</b>` : ''}</button><button data-chat-aba="coop" class="${ab === 'coop' ? 'ativa' : ''}">🤝 Cooperativa${ab !== 'coop' && nl.coop ? `<b>${nl.coop}</b>` : ''}</button><button class="chat-x" data-chat-fechar="1">✕</button></div>
      ${corpo}
      ${pode ? `<div class="chat-rapido"><button data-chat-rapido="venda">📢 Anunciar venda</button><button data-chat-rapido="ajuda">🙋 Pedir ajuda</button></div>
      <div class="chat-enviar"><input id="inChat" maxlength="200" placeholder="Escreva uma mensagem…" autocomplete="off" enterkeyhint="send"><button class="btn verde" data-chat-enviar="1">➤</button></div>` : ''}`;
    const box = $('#chatMsgs'); if (box) box.scrollTop = box.scrollHeight;
  }
  function renderChatSuave() { // não apaga o que está sendo digitado nem pula a rolagem
    const inp = $('#inChat'), txt = inp ? inp.value : '', foco = document.activeElement === inp, bx = $('#chatMsgs');
    const noFim = !bx || bx.scrollHeight - bx.scrollTop - bx.clientHeight < 40, pos = bx ? bx.scrollTop : 0;
    renderChat(); const n = $('#inChat'); if (n) { n.value = txt; if (foco) n.focus(); }
    const nb = $('#chatMsgs'); if (nb && !noFim) nb.scrollTop = pos;
  }
  async function enviarChat(tipo = 'msg', texto, ref) {
    if (!ON.user || CHAT.enviando) return;
    const inp = $('#inChat'); texto = (texto != null ? texto : inp ? inp.value : '').trim().slice(0, 200); if (!texto) return;
    if (/(https?:\/\/|www\.)/i.test(texto)) { toast('Links não são permitidos no chat'); return; }
    const canal = canalDe(CHAT.aba); if (!canal) return;
    CHAT.enviando = true;
    try {
      const {error} = await ON.sb.from('chat').insert({canal, texto, tipo, ref:ref || null});
      if (error) toast(/Calma|Muitas|Links/.test(error.message) ? error.message : '😕 Não deu para enviar'); else if (tipo === 'msg' && inp) inp.value = '';
    } catch (e) { toast('Sem internet'); }
    CHAT.enviando = false; CHAT.escolha = null; await carregarChat(false); renderChatSuave();
  }
  async function chatComprar(id) {
    if (!BAN.ofertas || !BAN.ofertas.some(o => o.id === id)) {
      try { const {data} = await ON.sb.from('ofertas').select('id, vendedor, item, qtd, preco, criado').eq('id', id).is('comprador', null).maybeSingle();
        if (!data) { toast('😕 Essa oferta já foi vendida'); return; }
        BAN.ofertas = (BAN.ofertas || []).concat([data]); } catch (e) { toast('Sem internet'); return; }
    }
    comprarOferta(id);
  }
  function cliqueChat(e) {
    const d = k => e.target.closest('[data-' + k + ']');
    let b;
    if ((b = d('chat-fechar'))) return fecharChat();
    if ((b = d('chat-aba'))) { CHAT.aba = b.dataset.chatAba; CHAT.escolha = null; renderChat(); carregarChat(true); return; }
    if ((b = d('chat-enviar'))) return enviarChat();
    if ((b = d('chat-cfg'))) { fecharChat(); abrir('config'); return; }
    if ((b = d('chat-coops'))) { fecharChat(); SOC.aba = 'coop'; abrir('amigos'); return; }
    if ((b = d('chat-banca'))) { fecharChat(); abrir('banca'); return; }
    if ((b = d('chat-voltar'))) { CHAT.escolha = null; renderChat(); return; }
    if ((b = d('chat-rapido'))) {
      if (b.dataset.chatRapido === 'ajuda') { enviarChat('ajuda', 'Alguém pode passar na minha fazenda e me dar uma ajudinha?', {uid:ON.user.id}); return; }
      CHAT.escolha = 'venda'; renderChat(); if (BAN.minhas === null) carregarBanca().then(() => renderChat()); return;
    }
    if ((b = d('chat-anunciar'))) {
      const o = (BAN.minhas || []).find(x => x.id === +b.dataset.chatAnunciar); if (!o) return;
      enviarChat('venda', `Vendo ${o.qtd} ${item(o.item).nome} por ${fmtN(o.preco)} moedas na minha banca!`, {oferta:o.id, item:o.item, qtd:o.qtd, preco:o.preco}); return;
    }
    if ((b = d('chat-comprar'))) { chatComprar(+b.dataset.chatComprar); return; }
    if ((b = d('chat-visitar'))) { fecharChat(); visitar(b.dataset.chatVisitar, b.dataset.nome); return; }
  }
  $('#chat').addEventListener('click', cliqueChat);
  document.addEventListener('click', e => { const b = e.target.closest('[data-chat-abrir]'); if (!b) return; e.stopPropagation(); if (VISITA) { toast('Volte para casa para usar o chat 🏠'); return; } if (janela) fechar(); if (CHAT.aberto && b.dataset.chatAbrir === '1') fecharChat(); else abrirChat(b.dataset.chatAbrir === 'coop' ? 'coop' : undefined); }, true);
  $('#chat').addEventListener('keydown', e => { if (e.key === 'Enter' && e.target.id === 'inChat') { e.preventDefault(); enviarChat(); } e.stopPropagation(); });
  // teclado do celular: o painel encolhe para caber acima do teclado
  const ajustarChatTeclado = () => { const vv = window.visualViewport, el = $('#chat'); if (!vv || !el) return; const cheio = vv.height > innerHeight - 40;
    el.style.height = cheio ? '' : vv.height + 'px'; el.style.top = cheio ? '' : vv.offsetTop + 'px'; el.style.bottom = cheio ? '' : 'auto';
    const bx = $('#chatMsgs'); if (bx && !cheio) bx.scrollTop = bx.scrollHeight; };
  if (window.visualViewport) { visualViewport.addEventListener('resize', ajustarChatTeclado); visualViewport.addEventListener('scroll', ajustarChatTeclado); }
  setInterval(contarNaoLidas, 30000); setTimeout(contarNaoLidas, 6000);
  const hora = t => t ? new Date(t).toLocaleString('pt-BR', {day:'2-digit', month:'2-digit', hour:'2-digit', minute:'2-digit'}) : '—';
  function esc(t) { return String(t).replace(/[&<>"']/g, c => ({'&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;'}[c])); }
  function htmlOnlineCfg() {
    if (!ON.sb) return '<div class="linha-cfg"><span>☁️ Conta online</span><span class="det">indisponível agora</span></div>';
    const rank = '<div class="linha-cfg"><span>🏆 Ranking dos fazendeiros</span><button class="btn" data-abrir="ranking">Ver</button></div>';
    if (!ON.user) return `<div class="linha-cfg"><span>☁️ Salve sua fazenda na nuvem e entre no ranking</span><button class="btn btn-google" data-acao="entrar-google"><b>G</b> Entrar com Google</button></div>`
      + (listaContas().length ? '<div class="linha-cfg"><span>👥 Contas usadas neste aparelho</span><button class="btn" data-abrir="contas">Contas</button></div>' : '') + rank;
    const md = ON.user.user_metadata || {}, nome = md.full_name || md.name || ON.user.email || 'Conta Google';
    return `<div class="linha-cfg"><span>☁️ ${esc(nome)}<br><small class="det">${ON.erro ? '⚠️ ' + esc(ON.erro) : ON.sujo ? 'salvando em instantes…' : 'salvo na nuvem às ' + hora(ON.ultimo || S.salvoEm)}</small></span>
      <span class="botoes-cfg"><button class="btn" data-acao="salvar-nuvem">Salvar agora</button></span></div>
      <div class="linha-cfg"><span>✏️ Nome no ranking: <b>${esc((S.perfil && S.perfil.nome) || 'Fazendeiro')}</b></span><button class="btn" data-acao="mudar-nome">Trocar</button></div>
      <div class="linha-cfg"><span>👥 Trocar de conta ou jogar sem conta</span><button class="btn" data-abrir="contas">Contas</button></div>` + rank;
  }
  function htmlNuvem() {
    const n = ON.nuvem || {}, cart = (ic, tit, d, ac) => `<div class="card"><div class="em">${ic}</div><div class="meio"><div class="nome">${tit}</div>
      <div class="det">⭐ Nível ${d.nivel || 1} · ${moedaMini}${fmtN(d.moedas || 0)} · 🌾 ${fmtN(d.colhidos || 0)} colhidos</div><div class="det">Salvo em ${hora(d.salvoEm)}</div></div>
      <div class="botoes"><button class="btn verde" data-acao="${ac}">Usar esta</button></div></div>`;
    if (ON.motivo === 'levar') return `<p class="dica">Você estava jogando <b>sem conta</b> neste aparelho. Quer levar essa fazenda para a conta Google? Assim ela fica salva na nuvem e entra no ranking.</p>`
      + `<div class="card"><div class="em">📱</div><div class="meio"><div class="nome">Levar esta fazenda</div><div class="det">⭐ Nível ${S.nivel} · ${moedaMini}${fmtN(S.moedas)} · 🌾 ${fmtN(S.colhidos || 0)} colhidos</div></div><button class="btn verde" data-acao="usar-local">Levar</button></div>`
      + `<div class="card"><div class="em">🌱</div><div class="meio"><div class="nome">Começar fazenda nova na conta</div><div class="det">A fazenda sem conta continua guardada neste aparelho</div></div><button class="btn" data-acao="conta-nova-fazenda">Começar</button></div>`;
    return `<p class="dica">${ON.motivo === 'outro' ? 'Sua fazenda foi salva em <b>outro aparelho</b> enquanto você jogava aqui.' : 'Esta conta já tem uma fazenda na nuvem, diferente da que está neste aparelho.'} Qual você quer continuar? A outra será substituída. Até você escolher, nada é enviado para a nuvem.</p>`
      + cart('☁️', 'Fazenda da nuvem', n, 'usar-nuvem') + cart('📱', 'Fazenda deste aparelho', S, 'usar-local');
  }
  async function carregarRanking() {
    if (!ON.sb) { ON.rankErro = 'sem conexão com o servidor'; renderJanela(); return; }
    ON.carregandoRank = true; ON.rankErro = ''; renderJanela();
    const col = {nivel:'nivel', producao:'producao', terras:'terras'}[ON.ordem] || 'nivel';
    let q = ON.sb.from('ranking').select('user_id, nome, nivel, producao, terras').order(col, {ascending:false});
    if (col === 'nivel') q = q.order('producao', {ascending:false});
    try { const {data, error} = await Promise.race([q.limit(50), new Promise((_, rej) => setTimeout(() => rej(new Error('tempo')), 9000))]); ON.rank = data || []; ON.rankErro = error ? error.message : ''; }
    catch (e) { ON.rank = []; ON.rankErro = 'sem internet'; }
    ON.carregandoRank = false;
    if (janela === 'ranking') renderJanela();
  }
  function htmlRanking() {
    if (!ON.rank && !ON.carregandoRank && !ON.rankErro) setTimeout(carregarRanking, 0);
    const tabs = [['nivel', '⭐ Nível'], ['producao', '🌾 Produção'], ['terras', '🌳 Terras']].map(([k, t]) => `<button class="${ON.ordem === k ? 'ativa' : ''}" data-acao="rank-${k}">${t}</button>`).join('');
    let h = `<div class="subabas">${tabs}</div>`;
    if (ON.carregandoRank || !ON.rank && !ON.rankErro) return h + '<p class="dica">Carregando…</p>';
    if (ON.rankErro) return h + `<p class="dica">⚠️ Não deu para carregar o ranking (${esc(ON.rankErro)}).</p>`;
    const lista = ON.rank, meu = ON.user ? lista.findIndex(r => r.user_id === ON.user.id) : -1;
    if (!lista.length) h += '<p class="dica">Ninguém no ranking ainda. Entre com Google para ser o primeiro! 🌱</p>';
    h += '<div class="rank-lista">' + lista.map((r, i) => `<div class="rank-linha ${i === meu ? 'eu' : ''}"><span class="pos">${i < 3 ? ['🥇', '🥈', '🥉'][i] : i + 1}</span><span class="nm">${esc(r.nome)}</span>
      <span class="vl">${ON.ordem === 'producao' ? '🌾 ' + fmtN(r.producao) : ON.ordem === 'terras' ? '🌳 ' + r.terras : '⭐ ' + r.nivel}</span></div>`).join('') + '</div>';
    if (!ON.user) h += '<p class="dica">Entre com Google nas Configurações para aparecer aqui.</p>';
    else if (meu < 0) h += '<p class="dica">Você ainda não está no top 50. Continue crescendo! 💪</p>';
    return h;
  }

  // ================= INÍCIO =================
  document.querySelectorAll('[data-icone]').forEach(el => {
    const svg = ICO[el.dataset.icone]; if (!svg) return;
    if (el.classList.contains('estrela')) el.insertAdjacentHTML('afterbegin', svg); else el.innerHTML = svg;
  });
  carregar();
  aplicarQualidade();
  if (!S.audio) S.audio = {musica:.5, efeitos:.8, mudo:false};
  if (window.SOM) { SOM.config(S.audio); SOM.tocarMusica(); }
  montarCeu(); montarIlha(); montarTerras(); montarNuvens(); montarObjetos(); montarPersonagens(); montarTonho();
  azAtual = azAlvo = Math.PI / 4 + (S.az || 0) * Math.PI / 2;
  redimensionar();
  atualizarProducao();
  tudo();
  requestAnimationFrame(animar);
  iniciarOnline();
  iniciarVenda();
  if (VISITA) { document.body.classList.add('visitando'); renderVisita(); $('#barraVisita').addEventListener('click', e => { if (e.target.closest('[data-acao=voltar-visita]')) voltarDaVisita(); }); } else aplicarRecompensaVisita();
  setTimeout(() => procurarVersao(false), 4000); setInterval(() => procurarVersao(false), 5 * 60 * 1000);
  document.addEventListener('visibilitychange', () => { if (!document.hidden) procurarVersao(false); });
  $('#avisoVersao').addEventListener('click', atualizarJogo);
  try { const m = sessionStorage.getItem('terralia-msg'); if (m) { sessionStorage.removeItem('terralia-msg'); setTimeout(() => toast(m, 'bom'), 800); } } catch (e) {}
  $('#jcorpo').addEventListener('input', e => { const r = e.target.closest('[data-vol]'); if (!r) return; S.audio[r.dataset.vol] = +r.value; SOM.config(S.audio); });
  $('#jcorpo').addEventListener('change', e => { const r = e.target.closest('[data-vol]'); if (!r) return; salvar(); if (r.dataset.vol === 'efeitos') somT('vaca'); });
  document.addEventListener('pointerdown', e => { if (e.target.closest('button, .tile, [data-abrir], [data-acao], .sem')) somT('clique', 40); }, true);
  $('#jcorpo').addEventListener('wheel', e => { const v = e.target.closest('.vitrine'); if (v && Math.abs(e.deltaY) > Math.abs(e.deltaX)) { v.scrollLeft += e.deltaY; e.preventDefault(); } }, {passive:false});
  // ===== modo app (instalar na tela inicial) =====
  if ('serviceWorker' in navigator && /^https?:$/.test(location.protocol)) navigator.serviceWorker.register('sw.js').catch(() => {});
  window.addEventListener('beforeinstallprompt', e => { e.preventDefault(); pedidoInstalar = e; if (janela === 'config') renderJanela(); });
  // botão "Baixar o jogo" da tela inicial: instala como app (ícone na tela do celular)
  const btnInst = $('#btnInstalar');
  function atualizarBtnInstalar() { if (btnInst) btnInst.style.display = instalado() ? 'none' : ''; }
  function ajudaInstalar() {
    const ua = navigator.userAgent, ios = /iPhone|iPad|iPod/i.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1), dentroApp = /Instagram|FBAN|FBAV|WhatsApp|Line\/|TikTok|Snapchat/i.test(ua);
    let h;
    if (dentroApp) h = `<p>Você abriu o jogo dentro de outro aplicativo. Para instalar:</p><ol><li>Toque nos <b>três pontinhos ⋮</b> ou no menu do app</li><li>Escolha <b>Abrir no navegador</b> (Chrome ou Safari)</li><li>Lá, toque de novo em <b>📲 Baixar o jogo</b></li></ol>`;
    else if (ios) h = `<p>No iPhone é assim (pelo <b>Safari</b>):</p><ol><li>Toque no botão <b>Compartilhar</b> <span class="mi-ic">⬆️</span> na barra de baixo</li><li>Role e toque em <b>Adicionar à Tela de Início</b> <span class="mi-ic">➕</span></li><li>Toque em <b>Adicionar</b>. Pronto! O ícone do Terrália Farm aparece na sua tela 🐄</li></ol>`;
    else h = `<p>No Android é assim (pelo <b>Chrome</b>):</p><ol><li>Toque nos <b>três pontinhos ⋮</b> lá em cima</li><li>Toque em <b>Instalar app</b> ou <b>Adicionar à tela inicial</b></li><li>Confirme. O ícone do Terrália Farm aparece na sua tela 🐄</li></ol>`;
    $('#miCorpo').innerHTML = h + '<p class="mi-obs">Depois é só abrir pelo ícone: o jogo abre em tela cheia, igual a um aplicativo, e se atualiza sozinho.</p>';
    $('#modalInst').classList.add('on');
  }
  if (btnInst) btnInst.addEventListener('click', e => {
    e.stopPropagation();
    if (pedidoInstalar) { pedidoInstalar.prompt(); pedidoInstalar.userChoice.then(r => { if (r && r.outcome === 'accepted') btnInst.textContent = '✅ Instalando…'; }).finally(() => { pedidoInstalar = null; }); }
    else ajudaInstalar();
  });
  $('#miFechar').addEventListener('click', () => $('#modalInst').classList.remove('on'));
  $('#modalInst').addEventListener('click', e => { if (e.target.id === 'modalInst') $('#modalInst').classList.remove('on'); });
  atualizarBtnInstalar();
  window.addEventListener('appinstalled', () => { pedidoInstalar = null; if (btnInst) btnInst.textContent = '✅ Instalado! Abra pelo ícone'; toast('📲 Terrália Farm instalado! Abra pelo ícone na tela inicial.', 'bom'); if (janela === 'config') renderJanela(); });
  setInterval(tickMercado, MERCADO_MS);
  setInterval(salvar, 5000);
  document.addEventListener('visibilitychange', () => { if (document.hidden) salvar(); });

  // terminou de montar a fazenda: tira a tela de carregamento (visitas) e pula a capa
  if (sessionStorage.getItem('terralia-indo')) {
    sessionStorage.removeItem('terralia-indo');
    const sp = $('#splash'); if (sp) sp.remove();
    aplicarAvatar();
    requestAnimationFrame(() => requestAnimationFrame(() => { if (window.esconderCarregando) window.esconderCarregando(); }));
  }
  ($('#btnJogar') || document.createElement('i')).addEventListener('click', () => {
    if (MOBILE) {
      try {
        const el = document.documentElement, fs = el.requestFullscreen || el.webkitRequestFullscreen;
        const p = fs && fs.call(el, {navigationUI:'hide'});
        const travar = () => { try { screen.orientation && screen.orientation.lock && screen.orientation.lock('landscape').catch(() => {}); } catch (e) {} };
        if (p && p.then) p.then(travar).catch(() => {}); else travar();
      } catch (e) {}
    }
    $('#splash').classList.add('saindo');
    setTimeout(() => $('#splash').remove(), 500);
    aplicarAvatar();
    if (!S.perfil) setTimeout(() => abrir('perfil'), 400); else setTimeout(mostrarTutorial, 400);
  });

  // atalhos para testes no console: Terralia.dar(1000), Terralia.nivel(5)
  window.Terralia = { dar:(m = 1000) => { S.moedas += m; tudo(); }, nivel:n => { S.nivel = n; atualizarPlacasTerra(); tudo(); }, estado:() => S,
    _teste:{ cena:() => scene, rend:() => renderer, matsvg:() => MAT_SVG, praga:i => { const p = S.plots[i]; p.pragaEm = Date.now() - 1000; atualizarTile(i); }, edit:() => editar.ativo, objPos:id => { const v = centro(objPorId(id)).project(camera); return [(v.x + 1) / 2 * innerWidth, (1 - v.y) / 2 * innerHeight]; }, sel:id => { entrarEdicao(); selecionar(objPorId(id)); }, grupos:() => { const r = []; scene.children.forEach(c => { let m = 0; c.traverse(o => { if (o.isMesh) m++; }); r.push([c.name || c.type + (c.userData && c.userData.tipo ? ':' + c.userData.tipo : ''), m]); }); r.sort((a, b) => b[1] - a[1]); return JSON.stringify(r.slice(0, 15)); }, info:() => { let n = 0, m = 0, st = 0; scene.traverse(o => { n++; if (o.isMesh) m++; if (!o.matrixAutoUpdate) st++; }); return JSON.stringify({calls:renderer.info.render.calls, tris:renderer.info.render.triangles, objetos:n, meshes:m, estaticos:st, geo:renderer.info.memory.geometries, tex:renderer.info.memory.textures, pr:renderer.getPixelRatio()}); },
      irPara:(x, z) => irPara(V3(x, 0, z)), centro:() => { focoCam = heroi.g.position.clone(); },
      editar:() => entrarEdicao(), sel:id => selecionar(objPorId(id)), mover:(x, z) => moverSel(V3(x, 0, z)), girar:() => girarSel(), ok:() => confirmarSel(), sair:() => sairEdicao(),
      filaIds:() => [heroi.atual, ...heroi.fila].filter(Boolean).map(a => (a.lista || [a.i]).length),
      tilePos:i => { const v = posTile(i).project(camera); return [(v.x + 1) / 2 * innerWidth, (1 - v.y) / 2 * innerHeight]; }, heroi:() => JSON.stringify({fila:heroi.fila.map(a => a.tipo), atual:heroi.atual && {tipo:heroi.atual.tipo, fase:heroi.atual.fase, t:heroi.atual.t}, rota:heroi.rota.length, pos:heroi.g.position}), obj:id => clicarConstrucao(objPorId(id)), objs:() => S.objetos.map(o => o.id + ':' + o.tipo).join(' '), abrir:(n, x) => abrir(n, x), tile:i => clicarTile(i), ferr:f => { S.ferramenta = f; }, zona:k => comprarZona(k), cam:(x, z, d) => { controls.target.set(x, 0, z); camera.position.set(x + d * .5, d * .6, z + d * .5); }, girar90:() => girarCamera(), zonas:() => ZONAS.map(z => z.key), construir:t => { S.moedas += custoConstrucao(t); comprarConstrucao(t); }, nome:(id, ms) => mostrarNome(objPorId(id), ms), nomes:() => Object.values(obj3D).filter(r => r.rot && r.rot.visible).length + "/" + Object.values(obj3D).filter(r => r.rot).length + " ed:" + editar.ativo } };
})();
