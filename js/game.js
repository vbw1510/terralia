/* Terrália Farm — jogo de fazenda 3D (mobile first, horizontal)
   Estrutura: DADOS → MAPA → ESTADO → CENA 3D → MODELOS → OBJETOS DO MAPA → PERSONAGENS → CANTEIROS
              → REGRAS → EDIÇÃO → INTERFACE → ENTRADA → LOOP */
(() => {
  if (!window.THREE) { document.body.innerHTML = '<div class="erro">Não consegui carregar o motor 3D. Recarregue a página.</div>'; return; }
  const KEY = 'terralia-v1';
  const ON = {sb:null, user:null, sujo:false, enviando:false, recarregando:false, ultimo:0, erro:'', nuvem:null, ordem:'nivel', rank:null, rankErro:'', carregandoRank:false}; // estado online
  let pedidoInstalar = null; // pedido de instalação do app (Chrome)
  const instalado = () => matchMedia('(display-mode: fullscreen), (display-mode: standalone)').matches || !!navigator.standalone;
  // fora do app instalado, o site é só a página de baixar (?navegador=1 libera para testes; ?baixar=1 força a página)
  const MODO_BAIXAR = /[?&]baixar=1/.test(location.search) || (!instalado() && !/[?&]navegador=1/.test(location.search) && !/^(localhost|127\.0\.0\.1)$/.test(location.hostname) && /^https?:$/.test(location.protocol));
  const VERSAO = '0.54'; // a cada atualização: aumentar aqui e no versao.json
  const MODO_TESTE = /^(localhost|127\.0\.0\.1)$/.test(location.hostname); // só no computador de desenvolvimento (no site, o Recomeçar é só da conta GM)
  const MOBILE = matchMedia('(pointer:coarse)').matches || Math.min(screen.width, screen.height) < 600;
  const ICO = window.ICONES || {};
  // imagens desenhadas (assets/ui) no lugar de alguns ícones
  const UI = (n, cls = 'ui-img') => `<img class="${cls}" src="assets/ui/${n}.webp" alt="" draggable="false">`;
  Object.assign(ICO, {estrela:UI('estrela'), moeda:UI('moeda'), engrenagem:UI('b_config'), loja:UI('b_loja')});
  const ITEM_IMG = {trigo:'c_trigo', milho:'c_milho', cenoura:'c_cenoura', tomate:'c_tomate', alface:'c_alface', algodao:'c_algodao', ovo:'p_ovo', leite:'p_leite', la:'p_la', mel:'p_mel', queijo:'p_queijo', farinha:'p_farinha'};
  const LOJA_IMG = {moinho:'e_moinho', poco:'e_poco', carrinho:'e_mercado'};
  const iconeLoja = (t, emo) => LOJA_IMG[t] ? `<span class="img-g">${UI(LOJA_IMG[t])}</span>` : `<span class="emo-g">${emo}</span>`;
  // tamanho da interface, do texto e fonte: valem só para este aparelho
  const TELA = (() => { try { const t = JSON.parse(localStorage.getItem('terralia-tela') || 'null'); if (t) return t; } catch (e) {}
    const h = Math.min(innerWidth, innerHeight); return {ui:Math.max(.8, Math.min(1.3, Math.round(h / 384 * 10) / 10)), txt:1, jogo:1, fonte:'padrao', fps:false, auto:true}; })();
  if (TELA.jogo == null) TELA.jogo = 1;
  function aplicarTela() {
    const r = document.documentElement.style; r.setProperty('--esc-ui', TELA.ui); r.setProperty('--esc-txt', TELA.txt); r.setProperty('--esc-jogo', TELA.jogo);
    document.body.classList.toggle('fonte-legivel', TELA.fonte === 'legivel'); document.body.classList.toggle('fonte-simples', TELA.fonte === 'simples');
    document.body.classList.toggle('sem-fps', !TELA.fps);
  }
  function salvarTela(auto) { TELA.auto = !!auto; try { localStorage.setItem('terralia-tela', JSON.stringify(TELA)); } catch (e) {} aplicarTela(); }
  aplicarTela();
  const secaoLoja = tit => `<div class="secao-loja"><span>${tit}</span></div>`;

  // ================= DADOS =================
  const CROPS = [
    // trigo, milho e cenoura: os 3 primeiros (baratos e usados na ração dos bichos); alface vem depois
    {id:'trigo',   nome:'Trigo',   emoji:'🌾', semente:2,   tempo:60,  preco:6,   xp:1,  rar:'comum', nivel:1, ilha:'principal'},
    {id:'milho',   nome:'Milho',   emoji:'🌽', semente:5,   tempo:90,  preco:9,  xp:1,  rar:'comum', nivel:1, ilha:'principal'},
    {id:'cenoura', nome:'Cenoura', emoji:'🥕', semente:10,  tempo:120,  preco:12,  xp:2,  rar:'comum', nivel:1, ilha:'principal'},
    {id:'alface',  nome:'Alface',  emoji:'🥬', semente:20,  tempo:180,  preco:20,  xp:2,  rar:'comum', nivel:2, ilha:'principal'},
    {id:'tomate',  nome:'Tomate',  emoji:'🍅', semente:35,  tempo:240,  preco:30,  xp:4, rar:'comum', nivel:3, ilha:'principal'},
    {id:'morango', nome:'Morango', emoji:'🍓', semente:60,  tempo:360, preco:50, xp:6, rar:'comum', nivel:4, ilha:'principal'},
    {id:'abobora', nome:'Abóbora', emoji:'🎃', semente:115, tempo:480, preco:73, xp:9, rar:'incomum', nivel:5, ilha:'principal'},
    {id:'batata',  nome:'Batata',  emoji:'🥔', semente:45,  tempo:660, preco:119, xp:15, rar:'incomum', nivel:7, ilha:'principal'},
    {id:'girassol',nome:'Girassol',emoji:'🌻', semente:70,  tempo:780, preco:162, xp:20, rar:'incomum', nivel:9, ilha:'principal'},
    {id:'cana',    nome:'Cana',    emoji:'🎋', semente:65,  tempo:900, preco:212, xp:26, rar:'raro', nivel:11, ilha:'principal'},
    {id:'algodao', nome:'Algodão', emoji:'🤍', semente:110, tempo:1020, preco:269, xp:34, rar:'raro', nivel:13, ilha:'principal'},
    {id:'pimentao',nome:'Pimentão',emoji:'🫑', semente:95,  tempo:1140, preco:332, xp:42, rar:'epico', nivel:15, ilha:'principal'},
    {id:'melancia',nome:'Melancia',emoji:'🍉', semente:190, tempo:1320, preco:440, xp:55, rar:'epico', nivel:18, ilha:'principal'},
    {id:'cafe',    nome:'Café',    emoji:'🫘', semente:280, tempo:1560,preco:607, xp:76, rar:'lendario', nivel:22, ilha:'principal'},
    // 🏝️ Ilha Tropical: só crescem lá (do comum, rápido, ao lendário, demorado)
    {id:'mandioca',  nome:'Mandioca',    emoji:'🌿', semente:160,  tempo:900,  preco:450,  xp:56,  rar:'comum',    nivel:30, ilha:'tropical'},
    {id:'batataDoce',nome:'Batata-doce', emoji:'🍠', semente:220,  tempo:1200, preco:617,  xp:77,  rar:'comum',    nivel:31, ilha:'tropical'},
    {id:'abacaxi',   nome:'Abacaxi',     emoji:'🍍', semente:340,  tempo:1800, preco:950,  xp:119, rar:'incomum',  nivel:32, ilha:'tropical'},
    {id:'maracuja',  nome:'Maracujá',    emoji:'🍈', semente:470,  tempo:2400, preco:1300, xp:162, rar:'incomum',  nivel:33, ilha:'tropical'},
    {id:'gengibre',  nome:'Gengibre',    emoji:'🫚', semente:680,  tempo:3300, preco:1879, xp:235, rar:'raro',     nivel:35, ilha:'tropical'},
    {id:'pimenta',   nome:'Pimenta',     emoji:'🌶️', semente:880,  tempo:4200, preco:2450, xp:306, rar:'raro',     nivel:36, ilha:'tropical'},
    {id:'baunilha',  nome:'Baunilha',    emoji:'🌼', semente:1320, tempo:6000, preco:3667, xp:458, rar:'epico',    nivel:38, ilha:'tropical'},
    {id:'orquidea',  nome:'Orquídea dourada', emoji:'🏵️', semente:0, tempo:9000, preco:5750, xp:719, rar:'lendario', nivel:30, ilha:'tropical', soAchado:true},
    {id:'uva',     nome:'Uva',     emoji:'🍇', semente:230, tempo:600, preco:100, xp:12, rar:'incomum', nivel:6, ilha:'principal'},
  ];
  const EXTRAS = [
    {id:'ovo',   nome:'Ovo',   emoji:'🥚', preco:13, xp:1, rar:'comum', animal:'galinha'},
    {id:'leite', nome:'Leite', emoji:'🥛', preco:37, xp:4, rar:'comum', animal:'vaca'},
    {id:'la',    nome:'Lã',    emoji:'🧶', preco:67, xp:7, rar:'comum', animal:'ovelha'},
    {id:'angora', nome:'Pelo de angorá', emoji:'☁️', preco:114, xp:11, rar:'incomum', animal:'coelho'},
    {id:'pena',   nome:'Pena',   emoji:'🪶', preco:144, xp:14, rar:'raro', animal:'pato'},
    {id:'trufa',  nome:'Bacon',  emoji:'🥓', preco:238, xp:24, rar:'raro', animal:'porco'},
    {id:'mel',    nome:'Mel',    emoji:'🍯', preco:294, xp:29, rar:'raro', animal:'abelha'},
    {id:'leiteCabra', nome:'Leite de cabra', emoji:'🍼', preco:793, xp:79, rar:'lendario', animal:'cabra'},
    {id:'leiteBufala', nome:'Leite de búfala', emoji:'🧴', preco:1257, xp:126, rar:'lendario', animal:'bufalo'},
    {id:'peixe', nome:'Peixe', emoji:'🐟', preco:300, xp:20, rar:'raro', rede:true},
    {id:'ferro',  nome:'Ferro',  emoji:'⛓️', preco:600, xp:20, rar:'raro', mina:true},
    {id:'carvao', nome:'Carvão', emoji:'⚫', preco:400, xp:15, rar:'raro', mina:true},
  ];
  // frutas das árvores do pomar (plantou uma vez, colhe sempre)
  const FRUTAS = [
    {id:'maca',    nome:'Maçã',    emoji:'🍎', preco:60,  nivel:8,  arvore:'macieira',   tempo:1800, rende:4, cor:0xe83b2c},
    {id:'laranja', nome:'Laranja', emoji:'🍊', preco:75,  nivel:12, arvore:'laranjeira', tempo:2700, rende:4, cor:0xf59a23},
    {id:'cereja',  nome:'Cereja',  emoji:'🍒', preco:110, nivel:17, arvore:'cerejeira',  tempo:3600, rende:4, cor:0xc8102e},
    {id:'banana',  nome:'Banana',  emoji:'🍌', preco:380, nivel:30, arvore:'bananeira',  tempo:3600, rende:4, cor:0xffd83a},
    {id:'coco',    nome:'Coco',    emoji:'🥥', preco:450, nivel:31, arvore:'coqueiro',   tempo:5400, rende:4, cor:0x7a5233},
    {id:'manga',   nome:'Manga',   emoji:'🥭', preco:700, nivel:34, arvore:'mangueira',  tempo:7200, rende:4, cor:0xffb02e},
    {id:'cacau',   nome:'Cacau',   emoji:'🫘', preco:950, nivel:36, arvore:'cacaueiro',  tempo:9000, rende:4, cor:0xd2691e},
    {id:'acai',    nome:'Açaí',    emoji:'🫐', preco:1100, nivel:39, arvore:'acaizeiro', tempo:10800, rende:5, cor:0x4b1d5e},
    // 🏰 Ilha Medieval: nada de plantar, tudo se coleta (a mina e o bosque voltam a encher sozinhos)
    {id:'pedra',     nome:'Pedra',      emoji:'🪨', preco:250, nivel:45, arvore:'mina',          tempo:5400, rende:4, cor:0x9a9a9a, extra:{ferro:2, carvao:2}, raroMed:.08},
    {id:'madeira',   nome:'Madeira',    emoji:'🪵', preco:280, nivel:45, arvore:'bosque',        tempo:3600, rende:5, cor:0x8b5a2b},
    {id:'amora',     nome:'Amora',      emoji:'🫐', preco:300, nivel:45, arvore:'amoreira',      tempo:2400, rende:4, cor:0x3a1e5e},
    {id:'cogumelo',  nome:'Cogumelo',   emoji:'🍄', preco:330, nivel:46, arvore:'cogumelos',     tempo:2700, rende:4, cor:0xe2352a},
    {id:'framboesa', nome:'Framboesa',  emoji:'🍓', preco:360, nivel:47, arvore:'framboeseira',  tempo:3000, rende:4, cor:0xd8204a},
  ];
  // rações: feitas no moinho, servem para alimentar os animais (não são vendidas)
  const RACOES = [
    {id:'racaoG', nome:'Ração de galinha', emoji:'🥣', animal:'galinha', ing:{trigo:3}, tempo:60, nivel:2, preco:0, racao:true, rende:3},
    {id:'racaoV', nome:'Ração de vaca',    emoji:'🥣', animal:'vaca',    ing:{milho:2, trigo:2}, tempo:120, nivel:3, preco:0, racao:true, rende:3},
    {id:'racaoO', nome:'Ração de ovelha',  emoji:'🥣', animal:'ovelha',  ing:{trigo:2, cenoura:2}, tempo:180, nivel:5, preco:0, racao:true, rende:3},
    {id:'racaoC', nome:'Ração de coelho',  emoji:'🥣', animal:'coelho',  ing:{alface:2, cenoura:2}, tempo:240, nivel:8, preco:0, racao:true, rende:3},
    {id:'racaoP', nome:'Ração de pato',    emoji:'🥣', animal:'pato',    ing:{trigo:2, alface:1},   tempo:200, nivel:10, preco:0, racao:true, rende:3},
    {id:'racaoS', nome:'Ração de porco',   emoji:'🥣', animal:'porco',   ing:{milho:2, batata:2},   tempo:300, nivel:12, preco:0, racao:true, rende:3},
    {id:'nectar', nome:'Néctar de flores', emoji:'🌼', animal:'abelha',  ing:{girassol:2},          tempo:300, nivel:14, preco:0, racao:true, rende:3},
    {id:'racaoPet', nome:'Ração de pet',   emoji:'🦴', animal:null, pet:true, ing:{milho:1, cenoura:1}, tempo:150, nivel:3, preco:0, racao:true, rende:3, mini:'🐾', cor:'#c8743a'},
    {id:'racaoCa', nome:'Ração de cabra',  emoji:'🥣', animal:'cabra',   ing:{mandioca:2, batataDoce:1}, tempo:600, nivel:33, preco:0, racao:true, rende:3, mini:'🐐', cor:'#c9a26b', xp:6},
    {id:'racaoBu', nome:'Ração de búfalo', emoji:'🥣', animal:'bufalo',  ing:{maracuja:1, mandioca:2},  tempo:900, nivel:37, preco:0, racao:true, rende:3, mini:'🐃', cor:'#7b5ea7', xp:8},
  ];
  RACOES.forEach(r => r.fab = 'moinho');
  Object.assign(RACOES[0], {mini:'🐔', cor:'#f5c542'}); Object.assign(RACOES[1], {mini:'🐄', cor:'#6cc357'}); Object.assign(RACOES[2], {mini:'🐑', cor:'#5bb3ea'}); Object.assign(RACOES[3], {mini:'🐰', cor:'#f29ac0'}); Object.assign(RACOES[4], {mini:'🦆', cor:'#7fd3d9'}); Object.assign(RACOES[5], {mini:'🐷', cor:'#f7a6a6'}); Object.assign(RACOES[6], {mini:'🐝', cor:'#ffcf3f'});
  // produtos das fábricas (valem bem mais que o ingrediente cru)
  const PRODUTOS = [
    {id:'pao',      nome:'Pão',               emoji:'🍞', fab:'padaria',   ing:{trigo:3},                     tempo:60,  preco:25,   xp:2,  rar:'comum', nivel:4},
    {id:'paoMilho', nome:'Pão de milho',      emoji:'🫓', fab:'padaria',   ing:{milho:2, ovo:1},              tempo:120,  preco:43,  xp:3, rar:'comum', nivel:4},
    {id:'bolo',     nome:'Bolo',              emoji:'🎂', fab:'padaria',   ing:{trigo:2, ovo:2, leite:1},     tempo:360,  preco:112,  xp:7, rar:'incomum', nivel:5},
    {id:'sanduiche',nome:'Sanduíche',         emoji:'🥪', fab:'padaria',   ing:{pao:1, alface:1, queijo:1},   tempo:900,  preco:338,  xp:23, rar:'raro', nivel:6},
    {id:'manteiga', nome:'Manteiga',          emoji:'🧈', fab:'laticinio', ing:{leite:2},                     tempo:360,  preco:111,  xp:7, rar:'incomum', nivel:5},
    {id:'queijo',   nome:'Queijo',            emoji:'🧀', fab:'laticinio', ing:{leite:3},                     tempo:480,  preco:166,  xp:11, rar:'incomum', nivel:5},
    {id:'iogurte',  nome:'Iogurte de morango',emoji:'🥤', fab:'laticinio', ing:{leite:1, morango:2},          tempo:600,  preco:206,  xp:14, rar:'incomum', nivel:6},
    {id:'novelo',   nome:'Novelo de linha',   emoji:'🧵', fab:'tecelagem', ing:{la:1},                        tempo:300,  preco:100,  xp:7,  rar:'incomum', nivel:6},
    {id:'cachecol', nome:'Cachecol',          emoji:'🧣', fab:'tecelagem', ing:{la:2},                        tempo:600,  preco:201,  xp:13, rar:'incomum', nivel:6},
    {id:'sueter',   nome:'Suéter',            emoji:'🧥', fab:'tecelagem', ing:{la:3, novelo:1},              tempo:1200, preco:482,  xp:32, rar:'raro', nivel:7},
    {id:'luvas',    nome:'Luvas de angorá',   emoji:'🧤', fab:'tecelagem', ing:{angora:2},                    tempo:900,  preco:342,  xp:23, rar:'incomum', nivel:8},
    {id:'gorro',    nome:'Gorro de angorá',   emoji:'👒', fab:'tecelagem', ing:{angora:3, novelo:1},          tempo:1740, preco:707,  xp:47, rar:'raro', nivel:9},
    {id:'omelete',  nome:'Omelete',           emoji:'🍳', fab:'cozinha',   ing:{ovo:2, tomate:1},             tempo:300,  preco:84,  xp:6, rar:'incomum', nivel:7},
    {id:'salada',   nome:'Salada da horta',   emoji:'🥗', fab:'cozinha',   ing:{alface:2, tomate:1, cenoura:1}, tempo:360, preco:123,  xp:8, rar:'incomum', nivel:7},
    {id:'torta',    nome:'Torta de abóbora',  emoji:'🥧', fab:'cozinha',   ing:{abobora:1, ovo:2, trigo:2},   tempo:480, preco:166,  xp:11, rar:'incomum', nivel:7},
    {id:'geleia',   nome:'Geleia de uva',     emoji:'🫐', fab:'cozinha',   ing:{uva:3},                       tempo:900,  preco:450, xp:30, rar:'incomum', nivel:8},
    {id:'paoMel',   nome:'Pão de mel',        emoji:'🍪', fab:'padaria',   ing:{trigo:2, mel:1},              tempo:1200,  preco:490,  xp:33, rar:'raro', nivel:14},
    {id:'tortaMaca',nome:'Torta de maçã',     emoji:'🥮', fab:'padaria',   ing:{maca:3, trigo:2, acucar:1},   tempo:3300, preco:1678,  xp:112, rar:'epico', nivel:13},
    {id:'batataFrita',nome:'Batata frita',    emoji:'🍟', fab:'cozinha',   ing:{batata:3, oleo:1},            tempo:3240,  preco:1641,  xp:109, rar:'epico', nivel:12},
    {id:'sucoLaranja',nome:'Suco de laranja', emoji:'🧃', fab:'cozinha',   ing:{laranja:3},                   tempo:900,  preco:360,  xp:24, rar:'raro', nivel:12},
    {id:'risoto',   nome:'Batata com bacon',   emoji:'🥘', fab:'cozinha',   ing:{trufa:1, leite:1, batata:2},  tempo:2700, preco:872, xp:58, rar:'epico', nivel:15},
    {id:'camiseta', nome:'Camiseta',          emoji:'👕', fab:'tecelagem', ing:{algodao:3},                   tempo:2700, preco:1291, xp:86, rar:'raro', nivel:13},
    {id:'travesseiro',nome:'Travesseiro de penas',emoji:'🛏️', fab:'tecelagem', ing:{pena:4, algodao:2},      tempo:2700, preco:1782, xp:119, rar:'raro', nivel:14},
    {id:'acucar',   nome:'Açúcar',            emoji:'🧂', fab:'engenho',   ing:{cana:3},                      tempo:480,  preco:795,  xp:53, rar:'raro', nivel:11},
    {id:'oleo',     nome:'Óleo de girassol',  emoji:'🫗', fab:'engenho',   ing:{girassol:3},                  tempo:480,  preco:608,  xp:41, rar:'raro', nivel:11},
    {id:'melado',   nome:'Melado',            emoji:'🍶', fab:'engenho',   ing:{cana:2, mel:1},               tempo:2700,  preco:1149,  xp:77, rar:'raro', nivel:14},
    {id:'cupcake',  nome:'Cupcake',           emoji:'🧁', fab:'docaria',   ing:{trigo:2, acucar:1, ovo:1},    tempo:2760,  preco:1394,  xp:93, rar:'epico', nivel:13},
    {id:'pudim',    nome:'Pudim',             emoji:'🍮', fab:'docaria',   ing:{leite:2, acucar:1, ovo:2},    tempo:3000, preco:1522,  xp:101, rar:'epico', nivel:14},
    {id:'balaMel',  nome:'Bala de mel',       emoji:'🍬', fab:'docaria',   ing:{mel:1, acucar:1},             tempo:5400,  preco:1960,  xp:131, rar:'lendario', nivel:15},
    {id:'docePimenta',nome:'Geleia de pimentão',emoji:'🫙', fab:'docaria', ing:{pimentao:3, acucar:1},        tempo:5400, preco:3224, xp:215, rar:'lendario', nivel:16},
    {id:'sorvete',  nome:'Sorvete de morango',emoji:'🍨', fab:'sorveteria',ing:{leite:2, morango:2, acucar:1},tempo:5400,  preco:1744, xp:116, rar:'lendario', nivel:16},
    {id:'picole',   nome:'Picolé de melancia',emoji:'🍧', fab:'sorveteria',ing:{melancia:1, acucar:1},        tempo:5400,  preco:2223, xp:148, rar:'lendario', nivel:18},
    {id:'sorveteCereja',nome:'Sorvete de cereja',emoji:'🍦', fab:'sorveteria',ing:{leite:2, cereja:3, acucar:1},tempo:5400,preco:2158, xp:144, rar:'lendario', nivel:18},
    {id:'cafeGelado',nome:'Café gelado',      emoji:'🧋', fab:'sorveteria',ing:{cafe:1, leite:2, acucar:1},   tempo:5400, preco:2657, xp:177, rar:'lendario', nivel:22},
    // 🏝️ fábricas da Ilha Tropical (todas Lendárias: demoram, para deixar produzindo)
    {id:'sucoAbacaxi', nome:'Suco de abacaxi',   emoji:'🍹', fab:'sucos',        ing:{abacaxi:2},                       tempo:5460,  preco:3420,  xp:228, rar:'lendario', nivel:34},
    {id:'sucoMaracuja',nome:'Suco de maracujá',  emoji:'🥤', fab:'sucos',        ing:{maracuja:2},                      tempo:7500,  preco:4680,  xp:312, rar:'lendario', nivel:34},
    {id:'aguaCoco',    nome:'Água de coco',      emoji:'🧉', fab:'sucos',        ing:{coco:3},                          tempo:5400,  preco:2430,  xp:162, rar:'lendario', nivel:34},
    {id:'vitamina',    nome:'Vitamina de banana',emoji:'🥛', fab:'sucos',        ing:{banana:2, leiteCabra:1},          tempo:5400,  preco:2795,  xp:186, rar:'lendario', nivel:35},
    {id:'sucoManga',   nome:'Suco de manga',     emoji:'🧃', fab:'sucos',        ing:{manga:3},                         tempo:6060,  preco:3780,  xp:252, rar:'lendario', nivel:36},
    {id:'farinha',     nome:'Farinha de mandioca',emoji:'🥣', fab:'tapiocaria',  ing:{mandioca:3},                      tempo:720,  preco:1688,  xp:113, rar:'lendario', nivel:35},
    {id:'tapioca',     nome:'Tapioca de coco',   emoji:'🫓', fab:'tapiocaria',   ing:{farinha:1, coco:1},               tempo:6180,  preco:3848,  xp:257, rar:'lendario', nivel:35},
    {id:'boloMandioca',nome:'Bolo de mandioca',  emoji:'🍰', fab:'tapiocaria',   ing:{mandioca:2, coco:2, leiteCabra:1},tempo:7440,  preco:4667,  xp:311, rar:'lendario', nivel:36},
    {id:'chocolate',   nome:'Barra de chocolate',emoji:'🍫', fab:'chocolateria', ing:{cacau:3},                         tempo:1500,  preco:3563,  xp:238, rar:'lendario', nivel:36},
    {id:'trufaMaracuja',nome:'Trufa de maracujá',emoji:'🟤', fab:'chocolateria', ing:{chocolate:1, maracuja:2},         tempo:10800, preco:11093, xp:740, rar:'lendario', nivel:37},
    {id:'bombom',      nome:'Caixa de bombons',  emoji:'🎁', fab:'chocolateria', ing:{chocolate:1, leiteBufala:1},      tempo:10800, preco:8676, xp:578, rar:'lendario', nivel:38},
    {id:'moqueca',     nome:'Moqueca',           emoji:'🍲', fab:'quiosque',     ing:{peixe:2, coco:1, pimenta:1},      tempo:10080, preco:6300,  xp:420, rar:'lendario', nivel:37},
    {id:'peixeFrito',  nome:'Peixe frito',       emoji:'🍤', fab:'quiosque',     ing:{peixe:2, farinha:1},              tempo:6600,  preco:4118,  xp:275, rar:'lendario', nivel:37},
    {id:'queijoCoalho',nome:'Queijo coalho',     emoji:'🧀', fab:'quiosque',     ing:{leiteBufala:3},                   tempo:10800, preco:6788,  xp:453, rar:'lendario', nivel:38},
    {id:'tigelaAcai',  nome:'Tigela de açaí',    emoji:'🍧', fab:'acaiteria',    ing:{acai:2, banana:2},                tempo:8520,  preco:5328,  xp:355, rar:'lendario', nivel:39},
    {id:'sorveteAcai', nome:'Sorvete de açaí',   emoji:'🍨', fab:'acaiteria',    ing:{acai:2, leiteBufala:1},           tempo:9960,  preco:6223,  xp:415, rar:'lendario', nivel:39},
    {id:'picoleManga', nome:'Picolé de manga',   emoji:'🍡', fab:'acaiteria',    ing:{manga:2, maracuja:1},             tempo:7800,  preco:4860,  xp:324, rar:'lendario', nivel:39},
    {id:'essencia',    nome:'Essência de baunilha',emoji:'🧪',fab:'perfumaria',  ing:{baunilha:2},                      tempo:2400, preco:9168, xp:611, rar:'lendario', nivel:40},
    {id:'colonia',     nome:'Colônia tropical',  emoji:'🫧', fab:'perfumaria',   ing:{gengibre:2, maracuja:1},          tempo:10800, preco:9104,  xp:607, rar:'lendario', nivel:40},
    {id:'perfumeOuro', nome:'Perfume dourado',   emoji:'✨', fab:'perfumaria',   ing:{essencia:1, orquidea:2},          tempo:10800, preco:37202, xp:2480, rar:'lendario', nivel:41},
    // 🏰 oficinas da Ilha Medieval
    {id:'ferradura',   nome:'Ferradura',          emoji:'🧲', fab:'ferraria',    ing:{ferro:2, carvao:1},            tempo:5400,  preco:2880,  xp:192, rar:'lendario', nivel:45},
    {id:'ferramentas', nome:'Caixa de ferramentas',emoji:'🛠️', fab:'ferraria',   ing:{ferro:1, madeira:2},           tempo:5400,  preco:2088,  xp:139, rar:'lendario', nivel:46},
    {id:'armadurinha', nome:'Armadurinha de brinquedo',emoji:'🛡️', fab:'ferraria',ing:{ferro:3, carvao:2},           tempo:7500,  preco:4680,  xp:312, rar:'lendario', nivel:48},
    {id:'escudo',      nome:'Escudo de madeira',  emoji:'🔰', fab:'carpintaria', ing:{madeira:3, ferro:1},           tempo:5400,  preco:2592,  xp:173, rar:'lendario', nivel:45},
    {id:'cavalinho',   nome:'Cavalinho de pau',   emoji:'🐴', fab:'carpintaria', ing:{madeira:4},                    tempo:5400,  preco:2016,  xp:134, rar:'lendario', nivel:46},
    {id:'bau',         nome:'Baú do tesouro',     emoji:'🧰', fab:'carpintaria', ing:{madeira:3, ferro:1, pedra:2},  tempo:5580,  preco:3492,  xp:233, rar:'lendario', nivel:47},
    {id:'tortaAmora',  nome:'Torta de amora',     emoji:'🥧', fab:'cozinhaReal', ing:{amora:3, trigo:2, ovo:1},      tempo:5400,  preco:1665,  xp:111, rar:'lendario', nivel:45},
    {id:'sopaCogumelo',nome:'Sopa de cogumelo',   emoji:'🍲', fab:'cozinhaReal', ing:{cogumelo:3, leite:1},          tempo:5400,  preco:1849,  xp:123, rar:'lendario', nivel:46},
    {id:'geleiaFramboesa',nome:'Geleia de framboesa',emoji:'🍯',fab:'cozinhaReal',ing:{framboesa:3, acucar:1},       tempo:5400,  preco:3375,  xp:225, rar:'lendario', nivel:47},
    {id:'anel',        nome:'Anel de ouro',       emoji:'💍', fab:'joalheria',   ing:{ouro:1, ferro:1},              tempo:10380, preco:6480,  xp:432, rar:'lendario', nivel:48},
    {id:'colar',       nome:'Colar de rubi',      emoji:'📿', fab:'joalheria',   ing:{ouro:1, rubi:1},               tempo:10800, preco:16200, xp:1080, rar:'lendario', nivel:49},
    {id:'coroa',       nome:'Coroa real',         emoji:'👑', fab:'joalheria',   ing:{ouro:2, rubi:1, safira:1},     tempo:10800, preco:37800, xp:2520, rar:'lendario', nivel:50},
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
    sucos:     {nome:'Casa de Sucos', emoji:'🍹', receitas:PRODUTOS.filter(p => p.fab === 'sucos')},
    tapiocaria:{nome:'Tapiocaria', emoji:'🫓', receitas:PRODUTOS.filter(p => p.fab === 'tapiocaria')},
    chocolateria:{nome:'Chocolateria', emoji:'🍫', receitas:PRODUTOS.filter(p => p.fab === 'chocolateria')},
    quiosque:  {nome:'Quiosque da praia', emoji:'🍲', receitas:PRODUTOS.filter(p => p.fab === 'quiosque')},
    acaiteria: {nome:'Açaiteria', emoji:'🍧', receitas:PRODUTOS.filter(p => p.fab === 'acaiteria')},
    perfumaria:{nome:'Perfumaria', emoji:'✨', receitas:PRODUTOS.filter(p => p.fab === 'perfumaria')},
    ferraria:  {nome:'Ferraria', emoji:'🔨', receitas:PRODUTOS.filter(p => p.fab === 'ferraria')},
    carpintaria:{nome:'Carpintaria', emoji:'🪚', receitas:PRODUTOS.filter(p => p.fab === 'carpintaria')},
    cozinhaReal:{nome:'Cozinha do castelo', emoji:'🍲', receitas:PRODUTOS.filter(p => p.fab === 'cozinhaReal')},
    joalheria: {nome:'Joalheria', emoji:'💍', receitas:PRODUTOS.filter(p => p.fab === 'joalheria')},
  };
  // ✨ achados raros da Ilha Tropical: caem na colheita e na rede de pesca (não se compram)
  const ACHADOS = [
    {id:'concha',  nome:'Concha dourada',     emoji:'🐚', preco:1500, xp:0, rar:'lendario', achado:true},
    {id:'perola',  nome:'Pérola',             emoji:'🦪', preco:4000, xp:0, rar:'lendario', achado:true},
    {id:'cristal', nome:'Cristal do vulcão',  emoji:'💎', preco:8000, xp:0, rar:'lendario', achado:true},
    {id:'ouro',    nome:'Pepita de ouro',     emoji:'🪙', preco:3000, xp:0, rar:'lendario', achado:true, med:true},
    {id:'rubi',    nome:'Rubi',               emoji:'❤️‍🔥', preco:6000, xp:0, rar:'lendario', achado:true, med:true},
    {id:'safira',  nome:'Safira',             emoji:'🔷', preco:9000, xp:0, rar:'lendario', achado:true, med:true},
  ];
  const ITENS = [...CROPS, ...EXTRAS, ...FRUTAS, ...RACOES, ...PRODUTOS, ...ACHADOS];
  const VENDAVEIS = ITENS.filter(i => !i.racao);
  const UPG = {
    // niv = nível do jogador necessário para cada nível da melhoria
    botas:    {nome:'Botas de couro',  emoji:'🥾', desc:'O fazendeiro anda 15% mais rápido por nível.', max:10, base:200, mult:2, niv:[2, 4, 6, 8, 10, 20, 35, 55, 80, 110]},
    ferram:   {nome:'Ferramentas de qualidade', emoji:'🧰', desc:'Plantar, regar e colher mais rápido a cada nível.', max:10, base:250, mult:2.1, niv:[2, 4, 6, 8, 10, 22, 38, 58, 85, 120]},
    fertil:   {nome:'Fertilizante',   emoji:'🌿', desc:'Plantas e árvores crescem 10% mais rápido a cada nível.', max:12, base:120, mult:2.1, niv:[3, 5, 7, 9, 11, 18, 28, 40, 55, 75, 100, 140]},
    maos:     {nome:'Mãos de fazendeiro', emoji:'🧤', desc:'Mais chance de colher em dobro: +5% a cada nível.', max:4, base:400, mult:2.6, niv:[4, 8, 13, 18]},
    moinhoVaga:{nome:'Fábricas maiores', emoji:'⚙️', desc:'+1 vaga na fila de produção do moinho e de todas as fábricas.', max:8, base:500, mult:2.2, niv:[4, 6, 8, 16, 30, 50, 80, 120]},
    adubo:    {nome:'Adubo especial', emoji:'🧪', desc:'+12% de chance de colheita dupla por nível.', max:5, base:150, mult:2.3, niv:[5, 7, 9, 11, 13]},
    cercado:  {nome:'Cercado maior', emoji:'🏡', desc:'+1 animal em cada cercado, de todos os tipos, por nível.', max:5, base:3000, mult:2.4, niv:[10, 20, 35, 55, 80]},
    engrenagem:{nome:'Engrenagens', emoji:'⚙️', desc:'Moinho e fábricas produzem 8% mais rápido por nível.', max:5, base:2500, mult:2.5, niv:[12, 25, 40, 60, 90]},
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
  const MAT_PRECO = {parafuso:40, tabua:40, fita:40, prego:55, tijolo:55, tinta:55, escritura:90, marreta:90, estaca:90};
  const matIco = m => `<i class="mi">${MAT_SVG[m] || ''}</i>`;
  const matsDe = para => Object.keys(MATERIAIS).filter(k => MATERIAIS[k].para === para);
  const PETS = {
    cachorro: {nome:'Pipoca', especie:'Cachorro',      img:'../ui/a_cachorro.webp', custo:2500, nivel:3, desc:'Late e avisa quando tem planta pronta, e de vez em quando cava e acha moedas ou plantas.'},
    raposa:   {nome:'Lumi',   especie:'Raposa mágica', img:'../ui/a_raposa.webp',   custo:6000, nivel:5, desc:'A magia dela faz as plantas crescerem 25% mais rápido.'},
    gato:     {nome:'Mingau', especie:'Gato',          img:'../ui/a_gato.webp', emoji:'🐱', custo:4500, nivel:7,  desc:'Espanta os ratinhos: os animais produzem 10% mais rápido.'},
    papagaio: {nome:'Kiwi',   especie:'Papagaio',      img:null, emoji:'🦜', custo:9000, nivel:11, desc:'Conversa com os clientes: os pedidos do caminhão pagam 15% a mais.'},
  };
  const ANIMAIS = {
    galinha: {nome:'Galinha', plural:'Galinhas', emoji:'🐔', img:'../ui/a_galinha.webp',       prod:'ovo',   tempo:120, porRacao:3, racao:'racaoG', porCercado:6, custo:150,  mult:1.3,  nivel:1, cercado:'galinheiro'},
    vaca:    {nome:'Vaca',    plural:'Vacas',    emoji:'🐄', img:'../ui/a_vaca.webp', prod:'leite', tempo:300, porRacao:2, racao:'racaoV', porCercado:3, custo:800,  mult:1.45, nivel:2, cercado:'curral'},
    ovelha:  {nome:'Ovelha',  plural:'Ovelhas',  emoji:'🐑', img:'../ui/a_ovelha.webp',       prod:'la',    tempo:480, porRacao:2, racao:'racaoO', porCercado:4, custo:1400, mult:1.4,  nivel:4, cercado:'pasto'},
    coelho:  {nome:'Coelho',  plural:'Coelhos',  emoji:'🐰', img:null,       prod:'angora', tempo:600, porRacao:2, racao:'racaoC', porCercado:5, custo:2200, mult:1.4, nivel:8, cercado:'coelheira'},
    pato:    {nome:'Pato',    plural:'Patos',    emoji:'🦆', img:null,       prod:'pena',   tempo:720, porRacao:3, racao:'racaoP', porCercado:5, custo:2600, mult:1.4, nivel:10, cercado:'lagoinha'},
    porco:   {nome:'Porco',   plural:'Porcos',   emoji:'🐷', img:'../ui/a_porco.webp',       prod:'trufa',  tempo:900, porRacao:2, racao:'racaoS', porCercado:3, custo:4200, mult:1.45, nivel:12, cercado:'chiqueiro', fem:false},
    abelha:  {nome:'Abelha',  plural:'Abelhas',  emoji:'🐝', img:null,       prod:'mel',    tempo:1080, porRacao:3, racao:'nectar', porCercado:6, custo:3000, mult:1.35, nivel:14, cercado:'apiario'},
    cabra:   {nome:'Cabra',   plural:'Cabras',   emoji:'🐐', img:null, prod:'leiteCabra', tempo:1200, porRacao:2, racao:'racaoCa', porCercado:4, custo:12000, mult:1.4, nivel:33, cercado:'aprisco', fem:true},
    bufalo:  {nome:'Búfalo',  plural:'Búfalos',  emoji:'🐃', img:null, prod:'leiteBufala', tempo:1800, porRacao:2, racao:'racaoBu', porCercado:3, custo:20000, mult:1.4, nivel:37, cercado:'bufalario'},
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
    coqueiro:   {nome:'Coqueiro',   w:1, d:1, obst:true, fruta:'coco'},
    mangueira:  {nome:'Mangueira',  w:1, d:1, obst:true, fruta:'manga', fem:true},
    aprisco:    {nome:'Aprisco',    w:3, d:3, animal:'cabra'},
    sucos:      {nome:'Casa de Sucos', w:2, d:2, obst:true, fab:true, fem:true},
    chocolateria:{nome:'Chocolateria', w:2, d:2, obst:true, fab:true, fem:true},
    tapiocaria: {nome:'Tapiocaria', w:2, d:2, obst:true, fab:true, fem:true},
    quiosque:   {nome:'Quiosque da praia', w:2, d:2, obst:true, fab:true},
    acaiteria:  {nome:'Açaiteria', w:2, d:2, obst:true, fab:true, fem:true},
    perfumaria: {nome:'Perfumaria', w:2, d:2, obst:true, fab:true, fem:true},
    bananeira:  {nome:'Bananeira', w:1, d:1, obst:true, fruta:'banana', fem:true},
    cacaueiro:  {nome:'Cacaueiro', w:1, d:1, obst:true, fruta:'cacau'},
    acaizeiro:  {nome:'Açaizeiro', w:1, d:1, obst:true, fruta:'acai'},
    bufalario:  {nome:'Curral de búfalos', w:3, d:3, animal:'bufalo'},
    mina:       {nome:'Mina', w:2, d:2, obst:true, fruta:'pedra', fem:true, coleta:true},
    bosque:     {nome:'Bosque', w:2, d:2, obst:true, fruta:'madeira', coleta:true},
    amoreira:   {nome:'Pé de amora', w:1, d:1, obst:true, fruta:'amora'},
    cogumelos:  {nome:'Canteiro de cogumelos', w:1, d:1, obst:true, fruta:'cogumelo'},
    framboeseira:{nome:'Pé de framboesa', w:1, d:1, obst:true, fruta:'framboesa'},
    ferraria:   {nome:'Ferraria', w:2, d:2, obst:true, fab:true, fem:true},
    carpintaria:{nome:'Carpintaria', w:2, d:2, obst:true, fab:true, fem:true},
    cozinhaReal:{nome:'Cozinha do castelo', w:2, d:2, obst:true, fab:true, fem:true},
    joalheria:  {nome:'Joalheria', w:2, d:2, obst:true, fab:true, fem:true},
    farol:      {nome:'Farol', w:1, d:1, decor:true, obst:true},
    cabanaTiki: {nome:'Cabana tiki', w:2, d:2, decor:true, obst:true, fem:true},
    estatuaConcha:{nome:'Estátua de concha', w:1, d:1, decor:true, obst:true, fem:true},
    flamingo:   {nome:'Flamingo de jardim', w:1, d:1, decor:true},
    arvoreEncantada:{nome:'Árvore encantada', w:2, d:2, decor:true, obst:true, fem:true},
    feiraMed:   {nome:'Barraca de feira', w:2, d:2, decor:true, obst:true, fem:true},
    casaMed:    {nome:'Casa medieval', w:2, d:2, decor:true, obst:true, fem:true},
    pracaMed:   {nome:'Praça do chafariz', w:3, d:3, decor:true, obst:true, fem:true},
    torreMed:   {nome:'Torre de vigia', w:1, d:1, decor:true, obst:true, fem:true},
    muralhaMed: {nome:'Muralha com torres', w:3, d:1, decor:true, obst:true, fem:true},
    moinhoMed:  {nome:'Moinho de pedra', w:2, d:2, decor:true, obst:true},
    temploMed:  {nome:'Templo', w:3, d:3, decor:true, obst:true},
    casteloMed: {nome:'Castelinho', w:3, d:3, decor:true, obst:true},
    lago:       {nome:'Lago',       w:3, d:3, obst:true},
    galpao:     {nome:'Galpão',     w:2, d:2, abre:'galpao', obst:true},
    // decorações (só deixam a fazenda bonita)
    flores:     {nome:'Canteiro de flores', w:1, d:1, decor:true},
    caminho:    {nome:'Caminho de pedras',  w:1, d:1, decor:true},
    cercaDec:   {nome:'Cerca branca',       w:1, d:1, decor:true},
    banco:      {nome:'Banco de praça',     w:1, d:1, decor:true, obst:true},
    espantalho: {nome:'Espantalho',         w:1, d:1, decor:true, obst:true},
    poste:      {nome:'Poste de luz',       w:1, d:1, decor:true, obst:true},
    arvoreDec:  {nome:'Árvore frutífera',   w:1, d:1, decor:true, obst:true},
    fonte:      {nome:'Fonte',              w:2, d:2, decor:true, obst:true},
    carroca:    {nome:'Carrinho de mão',    w:1, d:1, decor:true, obst:true},
    carrinho:   {nome:'Banca de caixotes',  w:1, d:1, decor:true, obst:true},
    barris:     {nome:'Barris',             w:1, d:1, decor:true, obst:true},
    caixotes:   {nome:'Caixotes e sacos',   w:1, d:1, decor:true, obst:true},
    bancoRustico:{nome:'Pilha de toras',    w:1, d:1, decor:true, obst:true},
    cercaMadeira:{nome:'Cerca de madeira',  w:1, d:1, decor:true},
    jardim:     {nome:'Moita de arbustos',  w:1, d:1, decor:true},
    porteira:   {nome:'Porteira',           w:1, d:1, decor:true},
    casinhaA:   {nome:'Casinha',            w:2, d:2, decor:true, obst:true},
    casinhaB:   {nome:'Casa de dois andares', w:2, d:2, decor:true, obst:true},
    taverna:    {nome:'Taverna',            w:3, d:3, decor:true, obst:true},
    tecidos:    {nome:'Pilha de tecidos',   w:1, d:1, decor:true, obst:true},
  };
  const ENFEITES = { // caixotes, barris e sacos em volta das construções (andam junto quando move)
    celeiro:[['barril', -2.6, 2.4, 0, 1], ['baldeAgua', -2.05, 2.75, 0, 1], ['caixaG', 2.5, 2.4, .4, 1], ['saco', 2.0, 2.8, .2, 1]],
    galpao:[['caixaG', -1.6, 1.55, .3, 1], ['lenha', 1.55, 1.5, .2, 1]],
    armazem:[['caixaG', -2.6, 1.55, -.2, 1], ['caixaP', -2.1, 1.85, .5, 1], ['saco', -2.5, 2.05, 0, 1]],
    padaria:[['saco', 1.55, 1.6, 0, 1], ['saco', 1.25, 1.9, .5, .9]],
  };
  const DECOR_GLB = { // decorações feitas com os modelos do KayKit: [modelo, x, z, giro, escala]
    feiraMed:[['qFeira', 0, 0, 0, 1]], casaMed:[['qCasa', 0, 0, 0, 1]], pracaMed:[['qPraca', 0, 0, 0, 1]], torreMed:[['qTorre', 0, 0, 0, 1]], muralhaMed:[['qMuralha', 0, 0, 0, 1]],
    moinhoMed:[['qMoinho', 0, 0, 0, 1]], temploMed:[['qTemplo', 0, 0, 0, 1]], casteloMed:[['qCastelo', 0, 0, 0, 1]],
    carroca:[['carrinhoMao', 0, 0, .6, 1], ['saco', -.45, .45, 0, .9]],
    carrinho:[['caixaAberta', -.3, -.2, .2, 1], ['caixaG', .35, .3, -.3, 1], ['saco', .4, -.45, .5, 1]],
    barris:[['barril', -.35, -.2, 0, 1], ['barril', .4, .25, 1, .95], ['baldeAgua', .05, .6, 0, 1]],
    caixotes:[['caixaG', -.3, -.25, .2, 1], ['caixaP', .4, .3, -.3, 1], ['saco', .45, -.4, .5, 1], ['saco', -.4, .45, 1, .9]],
    bancoRustico:[['toras', 0, 0, .3, 1]], cercaMadeira:[['cerca', 0, 0, 0, 1]], porteira:[['porteira', 0, 0, 0, 1]],
    jardim:[['arbusto1', -.3, -.3, 0, 1], ['arbusto3', .35, .2, 1, .9], ['capim1', -.25, .5, 2, 1], ['capim2', .5, -.45, 0, 1]],
    casinhaA:[['casaA', 0, 0, 0, 1]], casinhaB:[['casaB', 0, 0, 0, 1]], taverna:[['taverna', 0, 0, 0, 1]], tecidos:[['tecidos', 0, 0, .4, 1]],
  };
  const DECOR = [
    {tipo:'flores', icone:'🌷', preco:40, nivel:1}, {tipo:'caminho', icone:'🪨', preco:15, nivel:1}, {tipo:'cercaDec', icone:'🤍', preco:25, nivel:1},
    {tipo:'banco', icone:'🪑', preco:80, nivel:2}, {tipo:'espantalho', icone:'🎃', preco:120, nivel:2}, {tipo:'poste', icone:'💡', preco:150, nivel:3},
    {tipo:'arvoreDec', icone:'🍎', preco:200, nivel:3}, {tipo:'fonte', icone:'⛲', preco:900, nivel:5},
    {tipo:'jardim', icone:'🌳', preco:50, nivel:1}, {tipo:'cercaMadeira', icone:'🪵', preco:30, nivel:1}, {tipo:'porteira', icone:'🚪', preco:45, nivel:1},
    {tipo:'caixotes', icone:'📦', preco:90, nivel:2}, {tipo:'barris', icone:'🛢️', preco:100, nivel:2}, {tipo:'carroca', icone:'🛞', preco:140, nivel:2},
    {tipo:'bancoRustico', icone:'🪵', preco:120, nivel:3}, {tipo:'tecidos', icone:'🧶', preco:150, nivel:3}, {tipo:'carrinho', icone:'🍎', preco:180, nivel:3},
    {tipo:'casinhaA', icone:'🏠', preco:800, nivel:5}, {tipo:'casinhaB', icone:'🏡', preco:1200, nivel:7}, {tipo:'taverna', icone:'🍺', preco:2500, nivel:10},
    // 🏰 medievais (para quem já está nos níveis altos)
    {tipo:'feiraMed', icone:'⛺', preco:4000, nivel:20}, {tipo:'casaMed', icone:'🏘️', preco:6000, nivel:25}, {tipo:'pracaMed', icone:'⛲', preco:9000, nivel:30},
    {tipo:'torreMed', icone:'🛡️', preco:12000, nivel:35}, {tipo:'muralhaMed', icone:'🧱', preco:15000, nivel:40}, {tipo:'moinhoMed', icone:'⚙️', preco:20000, nivel:45},
    {tipo:'temploMed', icone:'⛪', preco:30000, nivel:50}, {tipo:'casteloMed', icone:'🏰', preco:50000, nivel:55},
    // 🏝️ exclusivas da Ilha Tropical: pedem achados raros
    {tipo:'arvoreEncantada', icone:'🌳', preco:0, nivel:999, premio:true},
    {tipo:'flamingo', icone:'🦩', preco:1500, nivel:30, ilha:'tropical', itens:{concha:1}}, {tipo:'cabanaTiki', icone:'🛖', preco:3000, nivel:30, ilha:'tropical', itens:{concha:2}},
    {tipo:'farol', icone:'🗼', preco:5000, nivel:31, ilha:'tropical', itens:{concha:3, perola:1}}, {tipo:'estatuaConcha', icone:'🗿', preco:8000, nivel:32, ilha:'tropical', itens:{perola:2, cristal:1}},
  ];
  const MERCADO_MS = 20000;

  const $ = s => document.querySelector(s);
  // ícone de item: rações ganham um saquinho colorido com o bichinho
  const emojiItem = it => ITEM_IMG[it.id] ? `<img class="it-mini" src="assets/ui/${ITEM_IMG[it.id]}.webp" alt="">` : it.racao ? it.mini : it.mat ? matIco(it.id) : it.emoji; // o mesmo item tem sempre a mesma imagem
  function iconeItem(it, cls = '') {
    if (ITEM_IMG[it.id]) return `<span class="${cls} it-img">${UI(ITEM_IMG[it.id])}</span>`;
    if (it.mat) return `<span class="${cls}">${matIco(it.id)}</span>`;
    if (!it.racao) return `<span class="${cls}">${it.emoji}</span>`;
    return `<span class="racao-ic ${cls}"><svg viewBox="0 0 64 64"><path d="M14 22c-4 10-4 26 0 34 4 4 32 4 36 0 4-8 4-24 0-34z" fill="${it.cor}" stroke="#5a3519" stroke-width="3"/><path d="M16 22h32l-4-10H20z" fill="${it.cor}" stroke="#5a3519" stroke-width="3"/><path d="M18 17h28" stroke="#fff" stroke-opacity=".5" stroke-width="3"/><circle cx="32" cy="41" r="13" fill="#fffaf0" stroke="#5a3519" stroke-width="2.5"/></svg><i>${it.mini}</i></span>`;
  }
  const crop = id => CROPS.find(c => c.id === id);
  const item = id => ITENS.find(c => c.id === id) || (MATERIAIS[id] ? {id, nome:MATERIAIS[id].nome, emoji:'', preco:MAT_PRECO[id], mat:true} : undefined);
  // estoque de qualquer item: materiais ficam no Galpão (S.mat), o resto no Celeiro/Armazém (S.celeiro)
  const estoque = id => MATERIAIS[id] ? (S.mat || {})[id] || 0 : S.celeiro[id] || 0;
  const temItens = o => Object.keys(o).every(k => estoque(k) >= o[k]);
  const txtItens = (o, tem) => Object.keys(o).map(k => `${o[k]} ${item(k).emoji}${tem ? ` (${estoque(k)})` : ''}`).join(' + ');
  function mudarEstoque(id, q) { if (MATERIAIS[id]) { if (!S.mat) S.mat = {}; S.mat[id] = Math.max(0, (S.mat[id] || 0) + q); } else S.celeiro[id] = Math.max(0, (S.celeiro[id] || 0) + q); }
  const fmtT = s => { s = Math.max(0, Math.ceil(s)); if (s >= 3600) { const h = Math.floor(s / 3600), m = Math.floor(s % 3600 / 60); return `${h}h ${String(m).padStart(2, '0')}m`; } const m = Math.floor(s / 60), r = s % 60; return m ? `${m}m ${String(r).padStart(2, '0')}s` : `${r}s`; };
  const fmtN = n => Math.round(n).toLocaleString('pt-BR');
  const rnd = (a, b) => a + Math.random() * (b - a);
  const V3 = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);

  // ================= MAPA (grade e terras) =================
  const G = 2.15;                 // tamanho de uma célula
  // expansões: cada anel aumenta a ilha em 5 células para cada lado (lido antes de montar o mapa; comprar uma expansão recarrega o jogo)
  const VISITA = (() => { try { return JSON.parse(sessionStorage.getItem('terralia-visita')); } catch (e) { return null; } })(); // visitando a fazenda de outro jogador
  let ANEL = (() => { try { return Math.max(0, Math.min(6, (VISITA ? VISITA.dados : JSON.parse(localStorage.getItem('terralia-v1'))).expansao | 0)); } catch (e) { return 0; } })();
  const MAX_ANEL = 6;
  // 🏝️ ilhas (v0.53): o jogo carrega só a ilha em que você está; as outras ficam guardadas em S.outras
  const ILHA = (() => { try { const d = VISITA ? VISITA.dados : JSON.parse(localStorage.getItem('terralia-v1')); return d && (d.ilha === 'tropical' || d.ilha === 'medieval') ? d.ilha : 'principal'; } catch (e) { return 'principal'; } })();
  const TROP = ILHA === 'tropical', MED = ILHA === 'medieval', NIVEL_PORTO = 30, NIVEL_MEDIEVAL = 45, CUSTO_PORTO = 25000;
  const NIVEL_ILHA = {principal:1, tropical:NIVEL_PORTO, medieval:NIVEL_MEDIEVAL};
  const ILHA_CHAVES = ['objetos', 'plots', 'zonas', 'expansao', 'moinhos', 'fab', 'pomar', 'ani', 'animais', 'prod'];
  const NOME_ILHA = {principal:'Ilha Principal', tropical:'Ilha Tropical', medieval:'Ilha Medieval'}, ICO_ILHA = {principal:'🏡', tropical:'🏝️', medieval:'🏰'};
  const podeAqui = x => (MED && x && x.tipo === 'lote') ? false : !x || !x.ilha || x.ilha === ILHA; // planta ou construção desta ilha (a medieval não tem plantação)
  if (TROP || MED) ANEL = 0; // as ilhas novas têm formato próprio e não têm expansão
  const ZONA = 5; let OFF = 12 + 5 * ANEL, NZ = 5 + 2 * ANEL; // células de -OFF a OFF, terras de 5×5 células
  // 🏝️ Ilha Tropical redonda: lagoa no meio, um anel de dentro (2 fatias, já suas) e um anel de fora (8 fatias para liberar)
  const R_ILHA = 12.3, R_LAGOA = 2.2, R_ANEL = 7.6;
  // 🏰 Ilha Medieval hexagonal: castelo no meio (com fosso) e 6 fatias, uma em cada lado do hexágono
  const R_HEX = 12.8, AP_HEX = R_HEX * Math.cos(Math.PI / 6), R_CASTELO = 3.3, NORM_HEX = [Math.PI / 6, Math.PI / 2, Math.PI * 5 / 6];
  const dentroHex = (x, z, ap) => NORM_HEX.every(t => Math.abs(x * Math.cos(t) + z * Math.sin(t)) <= ap);
  let MEIA = TROP ? (R_ILHA + .5) * G + 1.4 : MED ? (R_HEX + .5) * G + 1.4 : (OFF + .5) * G + 1.6; // metade do lado da ilha quadrada (ou o raio da redonda)
  const fatiaDe = (cx, cz) => { const d = Math.hypot(cx, cz), a = (Math.atan2(cz, cx) + Math.PI * 2 + .001) % (Math.PI * 2); return d < R_ANEL ? [0, Math.floor(a / Math.PI) % 2] : [1, Math.floor(a / (Math.PI / 4)) % 8]; };
  const fatiaHex = (cx, cz) => [0, Math.floor(((Math.atan2(cz, cx) + Math.PI * 2 + .001) % (Math.PI * 2)) / (Math.PI / 3)) % 6];
  const zonaDe = (cx, cz) => MED ? fatiaHex(cx, cz) : TROP ? fatiaDe(cx, cz) : [Math.floor((cx + 12) / ZONA), Math.floor((cz + 12) / ZONA)]; // chaves das terras não mudam quando a ilha cresce
  const zKey = (zx, zz) => zx + ',' + zz;
  const celulaUtil = (cx, cz) => MED ? (Math.hypot(cx, cz) > R_CASTELO && dentroHex(cx, cz, AP_HEX)) : TROP ? (Math.hypot(cx, cz) <= R_ILHA && Math.hypot(cx, cz) > R_LAGOA) : Math.abs(cx) <= OFF && Math.abs(cz) <= OFF;
  const ZONAS = []; // terras que existem (com espaço suficiente dentro da ilha)
  const ZONAS_TROP_INICIAIS = ['0,0', '0,1'], ZONAS_MED_INICIAIS = ['0,0', '0,1'];
  function calcZonas() { ZONAS.length = 0;
  if (TROP || MED) { const m = {};
    for (let cx = -13; cx <= 13; cx++) for (let cz = -13; cz <= 13; cz++) if (celulaUtil(cx, cz)) { const [r, f] = zonaDe(cx, cz), k = zKey(r, f); (m[k] = m[k] || {key:k, zx:r, zz:f, cel:[], anel:r, inicial:MED ? ZONAS_MED_INICIAIS.includes(k) : r === 0}).cel.push([cx, cz]); }
    Object.values(m).sort((a, b) => a.zx - b.zx || a.zz - b.zz).forEach(z => ZONAS.push(z)); return; }
  for (let zx = -ANEL; zx < 5 + ANEL; zx++) for (let zz = -ANEL; zz < 5 + ANEL; zz++) {
    const cel = [];
    for (let i = 0; i < ZONA; i++) for (let j = 0; j < ZONA; j++) { const cx = zx * ZONA - 12 + i, cz = zz * ZONA - 12 + j; if (celulaUtil(cx, cz)) cel.push([cx, cz]); }
    if (cel.length >= 6) ZONAS.push({key:zKey(zx, zz), zx, zz, cel, anel:Math.max(-zx, -zz, zx - 4, zz - 4, 0), inicial:zx >= 1 && zx <= 3 && zz >= 1 && zz <= 3});
  } }
  calcZonas();
  const zonaLiberada = (cx, cz) => { const [zx, zz] = zonaDe(cx, cz); return S.zonas.includes(zKey(zx, zz)); };
  const dims = o => o.rot % 2 ? [TIPOS[o.tipo].d, TIPOS[o.tipo].w] : [TIPOS[o.tipo].w, TIPOS[o.tipo].d];
  const centro = o => { const [W, D] = dims(o); return V3((o.ox + (W - 1) / 2) * G, 0, (o.oz + (D - 1) / 2) * G); };
  function celulas(o) { const [W, D] = dims(o), out = []; for (let i = 0; i < W; i++) for (let j = 0; j < D; j++) out.push([o.ox + i, o.oz + j]); return out; }

  // ================= ESTADO =================
  let S;
  let proxId = 1;
  function layoutInicial(ilha) {
    const L = (ilha || ILHA) === 'medieval' ? [ // 🏰 nas duas fatias da frente; já vem com uma mina, um bosque e um pé de amora para começar
      {tipo:'celeiro', ox:7, oz:0}, {tipo:'armazem', ox:0, oz:6}, {tipo:'loja', ox:4, oz:4}, {tipo:'galpao', ox:-3, oz:7}, {tipo:'poco', ox:8, oz:4},
      {tipo:'mina', ox:4, oz:0}, {tipo:'bosque', ox:1, oz:9}, {tipo:'amoreira', ox:6, oz:8},
    ] : (ilha || ILHA) === 'tropical' ? [ // tudo no anel de dentro, em volta da lagoa
      {tipo:'lote', ox:1, oz:3, li:0}, {tipo:'celeiro', ox:-6, oz:-2}, {tipo:'armazem', ox:-2, oz:-7}, {tipo:'loja', ox:2, oz:-6}, {tipo:'poco', ox:-3, oz:4}, {tipo:'galpao', ox:4, oz:-1},
    ] : [
      {tipo:'lago', ox:-7, oz:3}, {tipo:'lote', ox:-1, oz:-1, li:0},
      {tipo:'celeiro', ox:-6, oz:-6}, {tipo:'armazem', ox:-2, oz:-6}, {tipo:'loja', ox:3, oz:-6}, {tipo:'poco', ox:3, oz:2}, {tipo:'galpao', ox:-6, oz:-2},
    ];
    return L.map((o, i) => Object.assign({id:'o' + (i + 1), rot:0}, o));
  }
  function novo() {
    return { moedas:40, xp:0, nivel:1, plots:Array.from({length:4}, () => ({c:null})), tut:0,
      stats:{colheu:{}, plantou:{}, coletou:{}, vendeu:0, compras:0, fez:{}, alimentou:0}, missoes:{idx:0, ativas:[], geradas:0}, az:0,
      ani:{}, ins:{}, moinhos:{}, fab:{}, nomes:{}, perfil:null, tutB:-2, presente:{}, cap:{armazem:0, celeiro:0},
      objetos:layoutInicial(), zonas:ZONAS.filter(z => z.inicial).map(z => z.key),
      sementes:{}, celeiro:{trigo:6}, upg:{}, amigos:{}, animais:{}, prod:{}, aniUpg:{}, seguir:false, ferramenta:'mao', semSel:'trigo',
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
        const lotes = S.objetos.filter(o => o.tipo === 'lote').length + (S.guardados || []).filter(g => g.tipo === 'lote').length; // terras guardadas contam
        const precisa = MED ? 0 : Math.max(1, Math.ceil(S.plots.length / 4)); // a Ilha Medieval não tem canteiros
        if (S.tut == null || (S.tut === 0 && S.colhidos > 0)) S.tut = S.colhidos > 0 ? -1 : 0;
        S.stats = Object.assign({colheu:{}, plantou:{}, coletou:{}, vendeu:0, compras:0, fez:{}, alimentou:0}, S.stats);
        S.cap = Object.assign({armazem:0, celeiro:0}, S.cap); S.fab = S.fab || {};
        { const limpa = (pl, onde) => (pl || []).forEach((q, i) => { if (q && q.c && !crop(q.c)) { if (item(q.c)) S.celeiro[q.c] = (S.celeiro[q.c] || 0) + 2; pl[i] = {c:null}; if (onde) S.devolvidos = (S.devolvidos || 0) + 1; } });
          limpa(S.plots, 1); Object.values(S.outras || {}).forEach(o => limpa(o.plots, 1)); // v0.53: banana e cacau viraram árvores; quem tinha plantado recebe 2 de volta por canteiro
          if (S.devolvidos) { const n = S.devolvidos; delete S.devolvidos; setTimeout(() => toast(`🌳 Banana e cacau agora dão em árvores! Seus ${n} canteiros foram liberados e você recebeu as frutas de volta.`, 'ouro'), 5000); } }
        aplicarTetos();
        if (TROP || MED) { const ok = new Set(ZONAS.map(z => z.key)); S.zonas = [...new Set([...(MED ? ZONAS_MED_INICIAIS : ZONAS_TROP_INICIAIS), ...(S.zonas || []).filter(k => ok.has(k))])]; S.expansao = 0; // ilha redonda: só fatias que existem
          S.objetos = S.objetos.filter(o => o.tipo === 'lote' || celulas(o).every(([cx, cz]) => celulaUtil(cx, cz))); } // (algo de uma versão de teste fora da ilha redonda sai)
        if (VISITA) { // v0.45: bichinho só aparece na fazenda dos amigos (vira ajuda da visita)
          let sem = [...(VISITA.uid || 'x') + new Date().toDateString()].reduce((a, c) => (a * 31 + c.charCodeAt(0)) >>> 0, 7);
          const rnd = () => (sem = (sem * 1103515245 + 12345) >>> 0) / 4294967296, ag = Date.now();
          const cres = S.plots.map((q, i) => i).filter(i => { const q = S.plots[i]; return q.c && q.reg && q.t0 && ag - q.t0 < q.dur; });
          for (let n = Math.min(cres.length, 2 + Math.floor(rnd() * 3)); n > 0; n--) { const i = cres.splice(Math.floor(rnd() * cres.length), 1)[0], q = S.plots[i]; q.pragaEm = ag - 1000; q.pragaFim = null; q.prot = false; }
        } else {
          S.plots.forEach(q => { delete q.pragaEm; delete q.pragaFim; }); // na própria fazenda não tem mais bichinho
          if (S.ins && S.ins.antipraga) { const v = S.ins.antipraga * 60; S.moedas += v; delete S.ins.antipraga; setTimeout(() => toast(`🧴 O spray antipraga saiu do jogo: você recebeu ${fmtN(v)} moedas de volta`, 'ouro'), 4000); }
        }
        if (S.sementes && Object.keys(S.sementes).length) { for (const k in S.sementes) if (S['sementes'][k] > 0) S.celeiro[k] = (S.celeiro[k] || 0) + S['sementes'][k]; } S.sementes = {}; // sementes viraram plantas no celeiro
        if (S.petComeu == null) { S.petComeu = Date.now(); if (Object.keys(PETS).some(k => S.amigos && S.amigos[k])) S.celeiro.racaoPet = (S.celeiro.racaoPet || 0) + 3; }
        if (!S.objetos.some(o => o.tipo === 'galpao')) { const ce = S.objetos.find(o => o.tipo === 'celeiro'), pos = acharEspaco('galpao', ce ? ce.ox : -6, ce ? ce.oz + 4 : -2); if (pos) S.objetos.push({id:'og' + Date.now(), tipo:'galpao', rot:0, ...pos}); }
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
    try { const t = S.salvoEm, rv = S.rev; S.salvoEm = 0; S.rev = 0; const j = JSON.stringify(S); S.salvoEm = t; S.rev = rv;
      if (j === ultimoJson) return; // nada mudou: não grava de novo
      ultimoJson = j;
      // fazenda de conta que ainda não conferiu a nuvem: grava, mas NÃO conta como progresso novo
      // (senão um save velho deste aparelho poderia passar por cima do que foi jogado em outro)
      if (!(S.uid && !ON.sincronizado)) { S.salvoEm = Date.now(); S.rev = (rv || 0) + 1; ON.sujo = true; } // rev: conta cada mudança (não depende do relógio)
      localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) {}
  }
  const novoId = () => 'o' + (proxId++);
  // qual save está mais adiantado: pelo contador de mudanças; o relógio só desempata (relógios de aparelhos diferentes não batem)
  const maisAdiantado = (a, b) => a.rev && b.rev && a.rev !== b.rev ? a.rev > b.rev : (a.salvoEm || 0) > (b.salvoEm || 0);

  // v0.51: curva de XP sem nível máximo (simulada: casual ~nível 25 em 2 semanas, 50 em 2 meses, 100 em ~1 ano)
  const xpProx = n => n <= 10 ? Math.round(30 * Math.pow(n, 1.6) * (1 + 7 * (n - 1) / 9))
    : n <= 50 ? Math.round(8 * 30 * Math.pow(10, 1.6) * Math.pow(n / 10, 2.4))
    : Math.round(8 * 30 * Math.pow(10, 1.6) * Math.pow(5, 2.4) * Math.pow(n / 50, 1.6));
  // pets comem ração de pet a cada 6 horas; com fome, ficam deitados e sem habilidade
  const FOME_PET = 6 * 3600 * 1000;
  const temPet = () => Object.keys(PETS).some(k => S.amigos[k]);
  const petsComFome = () => temPet() && Date.now() - (S.petComeu || 0) > FOME_PET;
  const petOk = k => !!S.amigos[k] && !petsComFome();
  let apitoAte = 0;
  function apitar() { // 📯 acorda os pets e eles vêm correndo atrás do fazendeiro por 1 minuto
    if (!Object.keys(pets).length) { toast('Você ainda não tem bichinhos. Adote em Animais 🐶'); return; }
    apitoAte = Date.now() + 60000; somT('apito');
    Object.values(pets).forEach(p => { if (p.zzz) { scene.remove(p.zzz); p.zzz = null; } p.modo = 'seguir'; flutuar(p.g.position.clone().add(V3(0, 1.3, 0)), '❗'); });
    flutuar(heroi.g.position.clone().add(V3(0, 2.4, 0)), '📯'); toast(petsComFome() ? '📯 Eles acordaram, mas estão com fome! Dê ração na casinha 🦴' : '📯 Fiu-fiu! Os bichinhos vêm correndo', 'bom');
  }
  function menuCasinha(o) { // tocar na casinha: alimentar, apitar ou deixar seguindo
    let el = $('#menuPet'); if (!el) { el = document.createElement('div'); el.id = 'menuPet'; el.className = 'menu-pet'; document.body.appendChild(el);
      el.addEventListener('click', e => { const b = e.target.closest('[data-pet-ac]'); if (!b) return; const a = b.dataset.petAc; el.classList.remove('on');
        if (a === 'comer') alimentarPets(); if (a === 'apito') apitar(); if (a === 'seguir') { S.seguir = !S.seguir; atualizarPets3D(); salvar(); toast(S.seguir ? '🐾 Seus bichinhos estão seguindo você' : '🐾 Bichinhos soltos para passear', 'bom'); } }); }
    const fome = petsComFome(), r = S.celeiro.racaoPet || 0;
    el.innerHTML = `<b>🏡 Casinha dos bichinhos</b><small>${fome ? '😢 Estão com fome' : '😊 Barriga cheia'} · ração de pet: ${r}</small>
      <button class="btn ${fome ? 'verde' : ''}" data-pet-ac="comer">🦴 Alimentar</button><button class="btn laranja" data-pet-ac="apito">📯 Apito: chamar</button>
      <button class="btn" data-pet-ac="seguir">${S.seguir ? '🐾 Soltar para passear' : '🐾 Seguir sempre'}</button>`;
    const v = centro(o).add(V3(0, 2, 0)).project(camera); el.classList.add('on');
    const w = el.offsetWidth, h = el.offsetHeight; el.style.left = Math.min(innerWidth - w - 8, Math.max(8, (v.x + 1) / 2 * innerWidth - w / 2)) + 'px'; el.style.top = Math.min(innerHeight - h - 8, Math.max(8, (1 - v.y) / 2 * innerHeight - h - 10)) + 'px';
  }
  document.addEventListener('pointerdown', e => { const m = $('#menuPet'); if (m && m.classList.contains('on') && !e.target.closest('#menuPet')) m.classList.remove('on'); }, true);
  function alimentarPets() {
    if (!petsComFome()) { toast(`🐾 Os pets estão de barriga cheia (fome de novo em ${fmtT((FOME_PET - (Date.now() - S.petComeu)) / 1000)})`); return; }
    if (!(S.celeiro.racaoPet > 0)) { const m = listaMoinhos()[0];
      if (!m) { toast('🐾 Os pets estão com fome! Construa um Moinho para fazer ração de pet'); abrir('loja', 'construcoes'); return; }
      fabSel = m.id; destaqueRec = 'racaoPet'; abrir('fabrica', 'moinho'); destaqueRec = null; toast('🐾 Os pets estão com fome! Faça ração de pet aqui no moinho', 'bom'); apontar_(() => $('[data-receita=racaoPet]'), null, 6000); return; }
    S.celeiro.racaoPet--; S.petComeu = Date.now(); somT('cachorro'); toast('🦴 Os pets comeram e estão felizes! Habilidades ativas por 6 horas', 'bom');
    Object.values(pets).forEach(p => { p.modo = 'parado'; p.timer = .5; flutuar(p.g.position.clone().add(V3(0, 1.2, 0)), '💕'); }); salvar(); atualizarBaloes();
  }
  const velocidade = () => Math.pow(.9, S.upg.fertil || 0) * (petOk('raposa') ? 0.75 : 1) * (S.nivel <= 3 ? .5 : S.nivel <= 5 ? .75 : 1); // começo mais rápido: até o nível 3 tudo cresce na metade do tempo // cada nível de fertilizante: 10% mais rápido
  const eventoAtivo = () => S.evento && S.evento.ate > Date.now() ? S.evento : null;
  function precoAtual(id) { return Math.max(1, Math.round(item(id).preco)); } // v0.48: preço fixo (comprar na loja custa o dobro: comprar e revender nunca dá lucro)
  const custoUpg = k => Math.round(UPG[k].base * Math.pow(UPG[k].mult, S.upg[k] || 0));
  const nTipo = t => S.objetos.filter(o => o.tipo === t).length;
  const qtdGuardado = t => (S.guardados || []).filter(g => g.tipo === t).length;
  const nPosse = t => nTipo(t) + qtdGuardado(t);
  const TETO_ILHA = {tropical:{lote:8, aprisco:2, bufalario:1, bananeira:3, coqueiro:3, mangueira:3, cacaueiro:3, acaizeiro:3, moinho:1},
    medieval:{mina:3, bosque:3, amoreira:3, cogumelos:3, framboeseira:3, moinho:1}};
  const teto = t => { const ti = TETO_ILHA[ILHA]; return ti && ti[t] != null ? ti[t] : TETO[t]; };
  const noMaximo = t => teto(t) != null && nPosse(t) >= teto(t);
  function aplicarTetos() { // v0.54: o que passa do limite da ilha sai do jogo (para ninguém ficar com vantagem); o que estava plantado volta para o celeiro
    if (VISITA) return; const tipos = new Set([...Object.keys(TETO), ...Object.keys(TETO_ILHA[ILHA] || {})]), tirou = [];
    tipos.forEach(t => { const max = teto(t); if (max == null) return; let sobra = nPosse(t) - max; if (sobra <= 0) return; tirou.push(`${sobra} ${TIPOS[t].nome.toLowerCase()}`);
      if (t === 'lote') return tirarLotes(sobra);
      S.guardados = (S.guardados || []).filter(g => g.tipo !== t || sobra-- <= 0);
      for (let i = S.objetos.length - 1; i >= 0 && sobra > 0; i--) if (S.objetos[i].tipo === t) { if (S.pomar) delete S.pomar[S.objetos[i].id]; S.objetos.splice(i, 1); sobra--; } });
    for (const k in ANIMAIS) if (S.animais[k] > maxAnimal(k) && nTipo(ANIMAIS[k].cercado) >= 0) { S.animais[k] = maxAnimal(k); if (S.ani && S.ani[k]) S.ani[k] = S.ani[k].slice(0, S.animais[k]); }
    if (tirou.length) setTimeout(() => toast(`📏 Limite da ilha: saíram ${tirou.join(', ')}. O que estava plantado voltou para o celeiro.`, 'aviso'), 6000);
  }
  function tirarLotes(sobra) {
    const refs = [...(S.guardados || []).filter(g => g.tipo === 'lote').map(g => ({g, li:g.li})), ...S.objetos.filter(o => o.tipo === 'lote').map(o => ({o, li:o.li}))];
    const vazio = li => [0, 1, 2, 3].every(k => !(S.plots[li * 4 + k] || {}).c);
    refs.sort((a, b) => (!!b.g - !!a.g) || (vazio(b.li) - vazio(a.li)) || (b.li - a.li)); // primeiro os guardados, depois os vazios, depois os mais novos
    const fora = new Set(refs.slice(0, sobra));
    fora.forEach(r => { for (let k = 0; k < 4; k++) { const q = S.plots[r.li * 4 + k]; if (q && q.c && crop(q.c)) S.celeiro[q.c] = (S.celeiro[q.c] || 0) + 1; } // devolve a semente
      if (r.g) S.guardados.splice(S.guardados.indexOf(r.g), 1); else S.objetos.splice(S.objetos.indexOf(r.o), 1); });
    const ficam = refs.filter(r => !fora.has(r)).sort((a, b) => (!!a.g - !!b.g) || a.li - b.li), novos = []; // os colocados ficam com os primeiros canteiros
    ficam.forEach((r, i) => { for (let k = 0; k < 4; k++) novos.push(S.plots[r.li * 4 + k] || {c:null}); if (r.g) r.g.li = i; else r.o.li = i; });
    S.plots = novos;
  } // chegou no teto: o jogo cresce com coisas novas, não com mais do mesmo
  const custoLote = () => Math.round(150 * Math.pow(Math.max(1, nPosse('lote')), 1.8) / 10) * 10;
  const CONSTRUCOES = [
    {tipo:'lote',       icone:'🟫', desc:'4 canteiros para plantar.'},
    {tipo:'galinheiro', icone:'🐔', nivel:2, base:300,  desc:'Casa das galinhas: cabem 6.', ilha:'principal'},
    {tipo:'poco',       icone:'🪣', nivel:2, base:150,  desc:'Decoração da fazenda.'},
    {tipo:'curral',     icone:'🐄', nivel:3, base:1200, desc:'Lugar das vacas: cabem 3.', ilha:'principal'},
    {tipo:'moinho',     icone:'🌾', nivel:2, base:400,  desc:'Fábrica de ração: transforma trigo, milho e cenoura em comida para os animais.'},
    {tipo:'pasto',      icone:'🐑', nivel:5, base:2500, desc:'Pasto das ovelhas: cabem 4.', ilha:'principal'},
    {tipo:'coelheira',  icone:'🐰', nivel:8, base:3500, desc:'Casa dos coelhos: cabem 5. Eles dão pelo de angorá.', ilha:'principal'},
    {tipo:'casinhaPet', icone:'🏡', nivel:3, base:900, desc:'Casinha dos bichinhos: eles brincam e dormem perto dela.', unico:true},
    {tipo:'macieira', mult:1.35,   icone:'🍎', nivel:8,  base:1800, desc:'Árvore de maçã: dá 4 maçãs a cada 30 min, para sempre.', ilha:'principal'},
    {tipo:'lagoinha',   icone:'🦆', nivel:10, base:4500, desc:'Lagoinha dos patos: cabem 5. Eles dão penas.', ilha:'principal'},
    {tipo:'engenho',    icone:'🏭', nivel:11, base:7500, desc:'Faz açúcar, óleo de girassol e melado.', unico:true, ilha:'principal'},
    {tipo:'chiqueiro',  icone:'🐷', nivel:12, base:6500, desc:'Casa dos porcos: cabem 3. Eles dão bacon!', ilha:'principal'},
    {tipo:'laranjeira', mult:1.35, icone:'🍊', nivel:12, base:3200, desc:'Árvore de laranja: dá 4 laranjas a cada 45 min.', ilha:'principal'},
    {tipo:'docaria',    icone:'🧁', nivel:13, base:9500, desc:'Faz cupcake, pudim, bala de mel e geleia.', unico:true, ilha:'principal'},
    {tipo:'apiario',    icone:'🐝', nivel:14, base:7000, desc:'Colmeias: cabem 6 abelhas. Elas fazem mel.', ilha:'principal'},
    {tipo:'sorveteria', icone:'🍨', nivel:16, base:12000, desc:'Faz sorvetes, picolé e café gelado.', unico:true, ilha:'principal'},
    {tipo:'cerejeira', mult:1.35,  icone:'🍒', nivel:17, base:5200, desc:'Árvore de cereja: dá 4 cerejas a cada 1 hora.', ilha:'principal'},
    {tipo:'padaria',    icone:'🥖', nivel:4, base:1500, desc:'Faz pão, pão de milho, bolo e sanduíche.', unico:true, ilha:'principal'},
    {tipo:'laticinio',  icone:'🧀', nivel:5, base:2800, desc:'Transforma leite em manteiga, queijo e iogurte.', unico:true, ilha:'principal'},
    {tipo:'tecelagem',  icone:'🧵', nivel:6, base:4000, desc:'Transforma lã e pelo de angorá em roupas.', unico:true, ilha:'principal'},
    {tipo:'cozinha',    icone:'🍳', nivel:7, base:6000, desc:'Faz omelete, salada, torta de abóbora e geleia.', unico:true, ilha:'principal'},
    // 🏝️ só na Ilha Tropical
    {tipo:'bananeira', mult:1.35, icone:'🍌', nivel:30, base:7000,  desc:'Bananeira: dá 4 bananas a cada 1 hora.', ilha:'tropical'},
    {tipo:'coqueiro', mult:1.35,  icone:'🥥', nivel:31, base:9000,  desc:'Coqueiro: dá 4 cocos a cada 1h30.', ilha:'tropical'},
    {tipo:'aprisco',    icone:'🐐', nivel:33, base:18000, desc:'Casa das cabras: cabem 4. Elas dão leite de cabra.', ilha:'tropical'},
    {tipo:'sucos',      icone:'🍹', nivel:34, base:22000, desc:'Casa de Sucos: sucos de abacaxi, maracujá e manga, água de coco e vitamina.', unico:true, ilha:'tropical'},
    {tipo:'mangueira', mult:1.35, icone:'🥭', nivel:34, base:14000, desc:'Mangueira: dá 4 mangas a cada 2 horas.', ilha:'tropical'},
    {tipo:'tapiocaria', icone:'🫓', nivel:35, base:26000, desc:'Tapiocaria: farinha de mandioca, tapioca e bolo de mandioca.', unico:true, ilha:'tropical'},
    {tipo:'chocolateria', icone:'🍫', nivel:36, base:30000, desc:'Chocolateria: chocolate, trufa de maracujá e bombons.', unico:true, ilha:'tropical'},
    {tipo:'cacaueiro', mult:1.35, icone:'🫘', nivel:36, base:18000, desc:'Cacaueiro: dá 4 cacaus a cada 2h30.', ilha:'tropical'},
    {tipo:'bufalario',  icone:'🐃', nivel:37, base:26000, desc:'Curral dos búfalos: cabem 3. Eles dão leite de búfala.', ilha:'tropical'},
    {tipo:'quiosque',   icone:'🍲', nivel:37, base:34000, desc:'Quiosque da praia: moqueca, peixe frito e queijo coalho.', unico:true, ilha:'tropical'},
    {tipo:'acaiteria',  icone:'🍧', nivel:39, base:38000, desc:'Açaiteria: tigela de açaí, sorvete de açaí e picolé de manga.', unico:true, ilha:'tropical'},
    {tipo:'acaizeiro', mult:1.35, icone:'🫐', nivel:39, base:22000, desc:'Açaizeiro: dá 5 açaís a cada 3 horas.', ilha:'tropical'},
    {tipo:'perfumaria', icone:'✨', nivel:40, base:45000, desc:'Perfumaria: essência de baunilha, colônia e o raríssimo perfume dourado.', unico:true, ilha:'tropical'},
    // 🏰 só na Ilha Medieval (sem plantação: mina, bosque e arbustos que voltam a encher)
    {tipo:'mina',        icone:'⛏️', nivel:45, base:40000, mult:1.6, desc:'Mina: dá pedra, ferro e carvão a cada 1h30. Às vezes sai ouro, rubi ou safira!', ilha:'medieval'},
    {tipo:'bosque',      icone:'🌲', nivel:45, base:25000, mult:1.5, desc:'Bosque: dá 5 madeiras a cada 1 hora.', ilha:'medieval'},
    {tipo:'amoreira',    icone:'🫐', nivel:45, base:15000, mult:1.35, desc:'Pé de amora: dá 4 amoras a cada 40 min.', ilha:'medieval'},
    {tipo:'ferraria',    icone:'🔨', nivel:45, base:35000, desc:'Ferraria: ferraduras, ferramentas e armadurinha de brinquedo.', unico:true, ilha:'medieval'},
    {tipo:'carpintaria', icone:'🪚', nivel:45, base:30000, desc:'Carpintaria: escudo de madeira, cavalinho de pau e baú do tesouro.', unico:true, ilha:'medieval'},
    {tipo:'cozinhaReal', icone:'🍲', nivel:45, base:32000, desc:'Cozinha do castelo: torta de amora, sopa de cogumelo e geleia de framboesa.', unico:true, ilha:'medieval'},
    {tipo:'cogumelos',   icone:'🍄', nivel:46, base:16000, mult:1.35, desc:'Canteiro de cogumelos: nascem sozinhos, 4 a cada 45 min.', ilha:'medieval'},
    {tipo:'framboeseira',icone:'🍓', nivel:47, base:18000, mult:1.35, desc:'Pé de framboesa: dá 4 framboesas a cada 50 min.', ilha:'medieval'},
    {tipo:'joalheria',   icone:'💍', nivel:48, base:60000, desc:'Joalheria: anel, colar e coroa com o ouro e as gemas da mina.', unico:true, ilha:'medieval'},
  ];
  const consDe = t => CONSTRUCOES.find(c => c.tipo === t);
  const decDe = t => DECOR.find(c => c.tipo === t);
  // quantas de cada construção dá para ter, conforme o nível
  const LIMITES = {galinheiro:[2, 5, 8, 12], curral:[3, 6, 10, 14], pasto:[5, 9, 13, 17], coelheira:[8, 12, 16, 20], lagoinha:[10, 15, 20, 26], chiqueiro:[12, 17, 23, 30], apiario:[14, 19, 25, 32], macieira:[8, 9, 11, 13, 16, 20, 25], laranjeira:[12, 13, 15, 18, 22, 27], cerejeira:[17, 18, 21, 25, 30, 36], moinho:[2, 8, 18, 30], aprisco:[33, 36, 40], bufalario:[37, 40, 44]};
  const TETO = {mina:3, bosque:4, amoreira:6, cogumelos:6, framboeseira:6, aprisco:3, bufalario:3, coqueiro:6, mangueira:6, bananeira:6, cacaueiro:6, acaizeiro:6, galinheiro:5, curral:4, pasto:4, coelheira:3, lagoinha:3, chiqueiro:3, apiario:3, macieira:6, laranjeira:6, cerejeira:6, moinho:4, lote:40}; // v0.51: máximo de cada construção
  const nivelDaN = (t, k) => { const L = LIMITES[t]; return k < L.length ? L[k] : L[L.length - 1] + 4 * (k - L.length + 1); }; // nível do k-ésimo (0 = primeiro)
  const maxPermitido = t => { if (teto(t) != null && (t !== 'lote' || TETO_ILHA[ILHA])) return Math.min(teto(t), maxPermitido_(t)); return maxPermitido_(t); };
  const maxPermitido_ = t => { if (!LIMITES[t]) return Infinity; let k = 0; while (nivelDaN(t, k) <= S.nivel) k++; return k; };
  const nivelLote = k => k < 2 ? 1 : k <= 10 ? k : 10 + 2 * (k - 10); // nível do lote nº k+1
  const nivelConstrucao = t => t === 'lote' ? nivelLote(nPosse('lote')) : decDe(t) ? decDe(t).nivel : LIMITES[t] ? nivelDaN(t, nPosse(t)) : consDe(t).nivel;
  const ehUnico = t => { const c = consDe(t); return !!(c && c.unico); };
  const custoConstrucao = t => t === 'lote' ? custoLote() : decDe(t) ? decDe(t).preco : Math.round(consDe(t).base * Math.pow(consDe(t).mult || 1.8, nPosse(t)));
  // bichinho (praga): enquanto está na planta, ela cresce na metade da velocidade
  const decorrido = p => { const ag = Date.now(); let d = ag - p.t0; if (p.pragaEm && ag > p.pragaEm) d -= (Math.min(ag, p.pragaFim || ag) - p.pragaEm) / 2; return d; };
  const restante = p => Math.max(0, p.dur - decorrido(p));
  const progresso = p => (!p.c || !p.reg) ? 0 : Math.min(1, decorrido(p) / p.dur);
  const temPraga = p => !!(p && p.c && p.reg && p.pragaEm && !p.pragaFim && Date.now() >= p.pragaEm && decorrido(p) < p.dur);
  const crescendo_ = p => !!(p && p.c && p.reg && decorrido(p) < p.dur);
  const INSUMOS = {
    antipraga:{nome:'Spray antipraga', emoji:'🧴', preco:60, nivel:999, fora:true, desc:'Tira o bichinho e protege a planta até a colheita.'}, // v0.45: saiu da loja
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
  const maxAnimal = k => (ANIMAIS[k].porCercado + (S.upg.cercado || 0)) * nTipo(ANIMAIS[k].cercado); // melhoria Cercado maior: +1 por cercado
  const custoAnimal = k => Math.round(ANIMAIS[k].custo * Math.pow(ANIMAIS[k].mult, qtdAnimal(k)));
  const aniLista = k => { const L = S.ani[k] || (S.ani[k] = []); while (L.length < qtdAnimal(k)) L.push({rest:0, t:0, prontos:0}); return L; };
  const nomePet = k => (S.nomes && S.nomes[k]) || PETS[k].nome;
  // espaço: Celeiro guarda plantas, Armazém guarda a produção
  const capArmazem = () => 100 + 50 * S.cap.armazem, capCeleiro = () => 100 + 50 * S.cap.celeiro; // sempre de 50 em 50
  const matsAmpliar = k => 1 + Math.floor(S.cap[k] / 3); // quantos de cada material para ampliar
  const matsExpansao = () => 3 + 3 * ANEL;
  // Celeiro = só plantas (colheitas e frutas) · Armazém = produção (leite, ovo, pão, rações…). Os dois usam S.celeiro, cada um com a sua capacidade.
  const ehPlanta = id => CROPS.some(c => c.id === id) || FRUTAS.some(f => f.id === id);
  const usoArmazem = () => Object.entries(S.celeiro).reduce((a, [k, v]) => a + (ehPlanta(k) ? 0 : (v || 0)), 0);
  const usoCeleiro = () => Object.entries(S.celeiro).reduce((a, [k, v]) => a + (ehPlanta(k) ? (v || 0) : 0), 0);
  const livreArmazem = () => Math.max(0, capArmazem() - usoArmazem());
  const livreCeleiro = () => Math.max(0, capCeleiro() - usoCeleiro());
  const livreDe = id => MATERIAIS[id] ? 1e9 : ehPlanta(id) ? livreCeleiro() : livreArmazem();
  const precoPlanta = c => c.preco * 2; // comprar na loja custa o dobro de vender: vale a pena guardar para replantar
  const custoAmpliar = k => Math.round(100 * Math.pow(1.25, S.cap[k]) / 10) * 10;
  let avisoCheio = 0;
  function avisarCheio(k) { if (Date.now() - avisoCheio > 2500) { avisoCheio = Date.now(); toast(k === 'celeiro' ? '🏚️ Celeiro cheio! Venda plantas ou amplie o celeiro' : '📦 Armazém cheio! Venda itens ou amplie o armazém'); } }
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
  scene.background = C(TROP ? 0xa8eeff : MED ? 0xb4d2ec : 0xbfe6ff);
  scene.fog = new THREE.Fog(C(TROP ? 0xc4f4ff : MED ? 0xc6dcef : 0xcdeeff), 70, 150);
  const ceuBase = scene.background.clone(), ceuChuva = C(0x8fa9b8);
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
  controls.touches = {ONE:THREE.TOUCH.PAN, TWO:THREE.TOUCH.DOLLY_ROTATE}; // 2 dedos: pinça = zoom (girar e inclinar são feitos abaixo)
  let azAlvo = Math.PI / 4, azAtual = Math.PI / 4, inclina = 0;
  // 2 dedos: girar os dedos gira a fazenda livremente; arrastar os dois para cima/baixo inclina a câmera
  const dedos2 = new Map(); let gesto = null;
  canvas.addEventListener('pointerdown', e => { if (e.pointerType !== 'touch') return; dedos2.set(e.pointerId, {x:e.clientX, y:e.clientY}); gesto = null; });
  canvas.addEventListener('pointermove', e => {
    if (!dedos2.has(e.pointerId)) return; dedos2.set(e.pointerId, {x:e.clientX, y:e.clientY});
    if (dedos2.size !== 2 || editar.arrastando || !(S && S.camLivre)) return; // câmera travada: 2 dedos só dão zoom
    const [a, b] = [...dedos2.values()], ang = Math.atan2(b.y - a.y, b.x - a.x), my = (a.y + b.y) / 2;
    if (!gesto) { gesto = {ang, my}; return; }
    let da = ang - gesto.ang; if (da > Math.PI) da -= 2 * Math.PI; if (da < -Math.PI) da += 2 * Math.PI;
    if (Math.abs(da) > .004) { azAlvo -= da; azAtual = azAlvo; }
    inclina = Math.max(-.28, Math.min(.32, inclina + (my - gesto.my) * .004));
    gesto = {ang, my};
  });
  const soltar = e => { dedos2.delete(e.pointerId); gesto = null; if (!dedos2.size && S) { S.azLivre = azAlvo; S.inclina = inclina; } };
  canvas.addEventListener('pointerup', soltar); canvas.addEventListener('pointercancel', soltar); canvas.addEventListener('pointerleave', soltar);
  function ajustarCamera(dt) {
    azAtual += (azAlvo - azAtual) * Math.min(1, dt * 7);
    const tg = controls.target, d = camera.position.distanceTo(tg);
    const f = Math.min(1, Math.max(0, (d - controls.minDistance) / (controls.maxDistance - controls.minDistance)));
    const polar = Math.max(.34, Math.min(1.05, .72 - f * .2 + inclina)); // perto ~41°, longe ~30°, mais o que o jogador inclinou
    camera.position.set(tg.x + d * Math.sin(polar) * Math.sin(azAtual), tg.y + d * Math.cos(polar), tg.z + d * Math.sin(polar) * Math.cos(azAtual));
    camera.lookAt(tg);
  }

  scene.add(new THREE.HemisphereLight(C(0xd8efff), C(0x3f7a25), .55));
  const sol = new THREE.DirectionalLight(C(0xffd9a0), 2.35);
  sol.position.set(24, 22, 9); sol.castShadow = true;
  sol.shadow.mapSize.set(MOBILE ? 1024 : 2048, MOBILE ? 1024 : 2048);
  const ajustarSombraSol = () => { const L = Math.min(52, MEIA + 4); Object.assign(sol.shadow.camera, {left:-L, right:L, top:L, bottom:-L, near:1, far:90 + 2 * L}); sol.shadow.camera.updateProjectionMatrix(); };
  ajustarSombraSol();
  sol.shadow.bias = -0.0005; sol.shadow.normalBias = .02;
  scene.add(sol);
  renderer.shadowMap.autoUpdate = false; // a sombra é recalculada a cada 3 quadros (a ilha quase não se mexe)
  const fpsC = {n:0, t0:0, el:document.getElementById('fpsTeste')}; // contador de teste (ao lado do Armazém)
  const gov = {soma:0, n:0, bons:0, pr:0, max:1};
  let QUAL = 'alta'; // alta / media / leve (definida ao carregar o save)
  const segs = n => QUAL === 'alta' ? Math.round(n * 1.3) : n; // mais lados = peças mais redondas
  function aplicarQualidade() {
    // cada aparelho usa a nitidez real da própria tela; o jogo mede o desempenho e só baixa o necessário
    const dpr = window.devicePixelRatio || 1;
    gov.max = gov.pr = Math.min(dpr, QUAL === 'leve' ? 1 : QUAL === 'media' ? 1.75 : 3);
    gov.min = Math.min(gov.max, QUAL === 'alta' ? 1.5 : 1);
    gov.baixa = 1 / 45; gov.sobe = 1 / 56; gov.lentos = 0; // meta: perto de 60 quadros por segundo
    renderer.setPixelRatio(gov.pr);
    sol.castShadow = QUAL !== 'leve';
    const ms = QUAL === 'alta' ? 2048 : 1024;
    if (sol.shadow.mapSize.x !== ms) { sol.shadow.mapSize.set(ms, ms); if (sol.shadow.map) { sol.shadow.map.dispose(); sol.shadow.map = null; } }
  }

  const mats = {}, matsLiso = {};
  const mat = c => mats[c] || (mats[c] = new THREE.MeshStandardMaterial({color:C(c), flatShading:QUAL !== 'alta', roughness:.95, metalness:0, envMapIntensity:.2}));
  const liso = c => matsLiso[c] || (matsLiso[c] = new THREE.MeshStandardMaterial({color:C(c), roughness:.6, metalness:0, envMapIntensity:.25}));
  // ===== otimização: junta as peças paradas de um modelo em poucas malhas (uma por material) =====
  // Menos objetos = muito menos trabalho para o celular desenhar a cada quadro.
  function mesclar(raiz, pular) {
    raiz.updateMatrixWorld(true);
    const inv = new THREE.Matrix4().copy(raiz.matrixWorld).invert(), grupos = new Map(), remover = [];
    const ignorado = o => { for (let p = o; p && p !== raiz; p = p.parent) if (pular && pular.has(p)) return true; return false; };
    raiz.traverse(o => {
      if (!o.isMesh || o.isInstancedMesh || o.isSkinnedMesh || Array.isArray(o.material) || (o.material.transparent && o.material !== matSombra) || !o.visible || ignorado(o)) return;
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
  const bola = (r, cor, x, y, z, seg = 14) => mesh(new THREE.SphereGeometry(r, segs(seg), Math.max(6, segs(seg) * .7 | 0)), cor, x, y, z, true, liso(cor));
  const blob = (r, cor, x, y, z, det = 1) => mesh(new THREE.IcosahedronGeometry(r, det), cor, x, y, z, true, liso(cor));
  const cil = (rt, rb, h, cor, x, y, z, seg = 12, m) => mesh(new THREE.CylinderGeometry(rt, rb, h, segs(seg)), cor, x, y, z, true, m || liso(cor));

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
  // prédios que produzem: peça girando, prédio "respirando" e brilhinho quando tem coisa pronta
  const brilhos = {};
  function trabalhoDe(o) { if (!o) return {faz:false, pronto:false}; const e = o.tipo === 'moinho' ? fabEstado('moinho', o.id) : FABRICAS[o.tipo] ? fabEstado(o.tipo) : null;
    return e ? {faz:e.fila.length > 0, pronto:Object.values(e.prontos || {}).some(n => n > 0)} : {faz:false, pronto:false}; }
  function animarFabricas(dt, seg) {
    girantes.forEach(p => {
      if (p.userData.oid === undefined) { let x = p; while (x && !x.userData.oidRaiz) x = x.parent; p.userData.oid = x ? x.userData.oidRaiz : null; }
      const o = p.userData.oid && objPorId(p.userData.oid), v = trabalhoDe(o).faz ? 2.6 : (o && o.tipo === 'galpao' ? .6 : .2);
      p.rotation[p.userData.eixo || 'z'] += dt * v;
    });
    for (const o of S.objetos) { const T = TIPOS[o.tipo]; if (!T.fab) continue; const r = obj3D[o.id]; if (!r) continue;
      const w = trabalhoDe(o), g = r.g;
      const sy = w.faz ? 1 + Math.sin(seg * 5 + o.ox) * .025 : 1; if (Math.abs(g.scale.y - sy) > .0005 || g.userData.respira) { g.scale.y = sy; g.updateMatrix(); g.updateMatrixWorld(true); g.userData.respira = w.faz; }
      let b = brilhos[o.id];
      if (w.pronto && !w.faz) { if (!b) { b = brilhos[o.id] = new THREE.Sprite(new THREE.SpriteMaterial({map:emojiTex('✨'), depthTest:false, transparent:true})); b.renderOrder = 9; scene.add(b); }
        const c = centro(o); b.visible = true; b.position.set(c.x, (o.tipo === 'moinho' ? 5.6 : 4.2) + Math.sin(seg * 3) * .2, c.z); b.scale.setScalar(1.1 + Math.sin(seg * 6) * .15); b.material.rotation = Math.sin(seg * 2) * .3; }
      else if (b) b.visible = false;
    }
    for (const id in brilhos) if (!obj3D[id]) { scene.remove(brilhos[id]); delete brilhos[id]; }
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
  const FAB_KK = {sucos:'casaSucos', chocolateria:'chocoFab', tapiocaria:'tapiocaFab', quiosque:'quiosqueFab', acaiteria:'acaiFab', perfumaria:'perfumeFab', ferraria:'ferrariaFab', carpintaria:'carpintariaFab', cozinhaReal:'cozinhaRealFab', joalheria:'joalheriaFab', padaria:'casaPadaria', cozinha:'tavernaFab', engenho:'moinhoAgua', laticinio:'mercadoAzul', tecelagem:'mercadoVerde', docaria:'mercadoAmarelo', sorveteria:'mercadoVermelho'};
  const FUMACA_KK = {padaria:[-.55, 3.7, -.85], cozinha:[.6, 4.3, -.9]}; // de onde sai a fumaça quando está produzindo
  function fumacaSolta(g, x, y, z) { // só a fumaça (a chaminé já vem no modelo)
    const f = new THREE.Group(); f.position.set(x, y, z); g.add(f);
    for (let i = 0; i < 4; i++) { const b = mesh(new THREE.SphereGeometry(.22, 10, 8), 0, 0, 0, 0, false, new THREE.MeshStandardMaterial({color:C(0xf2f2f2), transparent:true, opacity:.7})); b.userData.f = i / 4; f.add(b); }
    fumacas.push(f);
  }
  function modeloFabrica(t) {
    if (THREE.GLTFLoader && FAB_KK[t]) { // prédios do KayKit
      const g = new THREE.Group(); g.add(modeloGLB(FAB_KK[t], 0, 0, 0, 1)); if (FUMACA_KK[t]) fumacaSolta(g, ...FUMACA_KK[t]); return g; }
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
      roda.rotation.y = Math.PI / 2; roda.userData.roda = true; roda.traverse(m => { m.castShadow = false; }); fabRodas.push(roda);
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
      const roda = new THREE.Group(); roda.position.set(1.45, 1.1, .2); roda.rotation.y = Math.PI / 2; g.add(roda); roda.userData.roda = true; fabRodas.push(roda); roda.traverse(m => { m.castShadow = false; });
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
    if (o.tipo === 'coqueiro') { // palmeira com cocos
      const g = palmeira(1.25); g.rotation.y = 0; const fr = new THREE.Group(); fr.userData.anim = true; g.add(fr);
      for (let i = 0; i < 5; i++) { const a = i * 1.25; fr.add(bola(.15, 0x7a5233, .3 + Math.cos(a) * .2, 3.35, Math.sin(a) * .2, 8)); }
      frutosArv[o.id] = fr; return g; }
    if (o.tipo === 'mina' || o.tipo === 'bosque') { // 🏰 modelos do pack medieval; o "pronto" aparece como pedrinhas/toras na frente
      const g = new THREE.Group(); g.add(THREE.GLTFLoader ? modeloGLB(o.tipo === 'mina' ? 'qMina' : 'qBosque', 0, 0, 0, 1) : (o.tipo === 'mina' ? pedra(2.2) : arvore(1.2)));
      const fr = new THREE.Group(); fr.userData.anim = true; g.add(fr);
      if (o.tipo === 'mina') { [[-.6, 1.1, 0x9a9a9a], [-.1, 1.3, 0x5a5a66], [.5, 1.1, 0x2a2a2a], [.2, 1.5, 0xffc83a]].forEach(([x, z, c]) => fr.add(bola(.2, c, x, .18, z, 7))); }
      else for (let i = 0; i < 3; i++) { const t = cil(.14, .14, 1.1, 0x8b5a2b, -.4 + i * .4, .16, 1.2, 8); t.rotation.z = Math.PI / 2; fr.add(t); }
      frutosArv[o.id] = fr; return g; }
    if (o.tipo === 'amoreira' || o.tipo === 'framboeseira') { // arbusto com frutinhas
      const g = new THREE.Group(), cor = o.tipo === 'amoreira' ? 0x3a1e5e : 0xd8204a;
      [[0, 0, .55], [-.3, .2, .42], [.3, -.1, .45], [.1, .35, .38]].forEach(([x, z, r]) => g.add(blob(r, 0x3f8a34, x, .45 + r * .3, z)));
      const fr = new THREE.Group(); fr.userData.anim = true; g.add(fr);
      for (let i = 0; i < 12; i++) { const a = i * 2.4; fr.add(bola(.07, cor, Math.cos(a) * .5, .35 + (i % 4) * .14, Math.sin(a) * .5, 6)); }
      frutosArv[o.id] = fr; return g; }
    if (o.tipo === 'cogumelos') { // tronquinho com cogumelos vermelhos de bolinha
      const g = new THREE.Group(); const t = cil(.22, .26, 1.0, 0x6b4a2b, 0, .22, 0, 9); t.rotation.z = Math.PI / 2; g.add(t);
      const fr = new THREE.Group(); fr.userData.anim = true; g.add(fr);
      [[-.35, .25, .9], [.05, .3, 1.1], [.4, .2, .8], [-.1, -.3, .7]].forEach(([x, z, sc]) => { fr.add(cil(.05 * sc, .06 * sc, .3 * sc, 0xf4ecd8, x, .15 * sc, z, 6));
        const ch = mesh(new THREE.SphereGeometry(.18 * sc, 10, 6, 0, Math.PI * 2, 0, Math.PI / 2), 0, x, .28 * sc, z, true, liso(0xe2352a)); fr.add(ch);
        fr.add(bola(.03 * sc, 0xffffff, x + .07 * sc, .4 * sc, z + .06 * sc, 4)); });
      frutosArv[o.id] = fr; return g; }
    if (o.tipo === 'acaizeiro') { // palmeira fininha com cachos roxos
      const g = palmeira(1.15); g.rotation.y = 0; g.scale.x = g.scale.z = .8; const fr = new THREE.Group(); fr.userData.anim = true; g.add(fr);
      for (let i = 0; i < 3; i++) { const a = i * 2.1; for (let k = 0; k < 6; k++) fr.add(bola(.07, 0x4b1d5e, .25 + Math.cos(a) * .25 + rnd(-.06, .06), 3.0 - k * .07, Math.sin(a) * .25 + rnd(-.06, .06), 6)); }
      frutosArv[o.id] = fr; return g; }
    if (o.tipo === 'bananeira') { // tronco verde e folhas enormes
      const g = new THREE.Group(); g.add(cil(.16, .22, 2.0, 0x8a9a3a, 0, 1.0, 0, 8));
      for (let k = 0; k < 6; k++) { const f = mesh(new THREE.BoxGeometry(1.7, .04, .55), 0, 0, 2.05, 0, true, liso(k % 2 ? 0x4caf3a : 0x3f9a34)); f.rotation.set(0, k * 1.05, -.35); f.translateX(.8); g.add(f); }
      const fr = new THREE.Group(); fr.userData.anim = true; g.add(fr);
      for (let k = 0; k < 10; k++) { const b = cil(.06, .05, .36, 0xffd23a, .28 + Math.cos(k * 1.3) * .14, 1.65 - (k % 4) * .12, Math.sin(k * 1.3) * .14, 6); b.rotation.z = .55; fr.add(b); }
      fr.add(mesh(new THREE.ConeGeometry(.12, .3, 6), 0, .3, 1.15, 0, true, liso(0x8a2f4a)));
      frutosArv[o.id] = fr; return g; }
    const f = item(TIPOS[o.tipo].fruta), g = arvore(o.tipo === 'mangueira' ? 1.2 : o.tipo === 'cacaueiro' ? .95 : 1.05, o.tipo === 'cacaueiro' ? 0x2f6a2a : null); g.rotation.y = 0;
    const fr = new THREE.Group(); fr.userData.anim = true; g.add(fr);
    for (let i = 0; i < 9; i++) { const a = i * .7 + rnd(0, .3), b = rnd(-.2, .9); fr.add(bola(.12, f.cor, Math.cos(a) * 1.0, 2.0 + b * .5, Math.sin(a) * 1.0, 8)); }
    frutosArv[o.id] = fr; return g;
  }
  const fabRodas = [];
  function modeloGalpao() { // galpão de ferramentas: casinha de madeira aberta na frente
    if (THREE.GLTFLoader) { const g = new THREE.Group(); g.add(modeloGLB('serraria', 0, 0, 0, 1)); return g; } // serraria do KayKit (a serra gira)
    const g = new THREE.Group();
    g.add(chaoPlano(1.9, 1.2, 0xc9a274).translateZ(1.2));
    g.add(mesh(new THREE.BoxGeometry(3.2, .14, 2.6), 0, 0, .07, -.15, true, liso(0x8a5a2b)));
    g.add(mesh(new THREE.BoxGeometry(3.2, 1.9, .14), 0, 0, 1.05, -1.4, true, liso(0x9c6b3c)));
    [-1.55, 1.55].forEach(x => g.add(mesh(new THREE.BoxGeometry(.14, 1.9, 2.6), 0, x, 1.05, -.15, true, liso(0xa8743f))));
    [-1.55, 1.55].forEach(x => g.add(mesh(new THREE.BoxGeometry(.16, 2.1, .16), 0, x, 1.05, 1.12, true, liso(0x6b3d17))));
    const tl = new THREE.Group(); [-1, 1].forEach(sd => { const t = mesh(new THREE.BoxGeometry(1.95, .12, 3.1), 0, sd * .82, 0, 0, true, liso(0x4f6f8a)); t.rotation.z = -sd * .5; tl.add(t); }); tl.position.set(0, 2.3, -.15); g.add(tl);
    g.add(mesh(new THREE.BoxGeometry(2.6, .12, .9), 0, 0, .85, -.85, true, liso(0xc28a4f))); // bancada
    [-1.1, 1.1].forEach(x => g.add(mesh(new THREE.BoxGeometry(.1, .8, .8), 0, x, .45, -.85, false, liso(0x8a5a2b))));
    const mart = new THREE.Group(); mart.add(mesh(new THREE.BoxGeometry(.06, .5, .06), 0, 0, 0, 0, false, liso(0x8a5a2b))); mart.add(mesh(new THREE.BoxGeometry(.24, .1, .1), 0, 0, .25, 0, false, liso(0x6f7b86)));
    mart.position.set(-.6, 1.5, -1.3); mart.rotation.z = .3; g.add(mart);
    const serra = mesh(new THREE.BoxGeometry(.6, .18, .03), 0, .5, 1.45, -1.31, false, liso(0xb8c2cc)); serra.rotation.z = -.15; g.add(serra);
    [[.9, .2], [1.2, .5]].forEach(([x, z]) => g.add(mesh(new THREE.BoxGeometry(.5, .4, .4), 0, x, .34, z, true, liso(0xd9a45a))));
    g.add(mesh(new THREE.BoxGeometry(1.2, .08, .2), 0, -.8, .98, -.7, false, liso(0xe0b47a)));
    g.add(cil(.12, .12, .22, 0x5a8fd8, -1, 1.02, -.6, 10)); // lata de tinta
    return g;
  }
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
    if (THREE.GLTFLoader) { const g = new THREE.Group(); g.add(modeloGLB('mercado', 0, 0, 0, 1)); return g; } // mercado do KayKit
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
    if (THREE.GLTFLoader) { const g = new THREE.Group(); g.add(modeloGLB('moinho', 0, 0, 0, 1)); return g; } // moinho do KayKit (as pás giram)
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
    pas.traverse(m => { m.castShadow = false; }); g.add(pas); pasMoinho.push(pas);
    return g;
  }
  function modeloPoco() {
    if (THREE.GLTFLoader) { const g = new THREE.Group(); g.add(modeloGLB('poco', 0, 0, 0, 1)); return g; } // poço do KayKit
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
    const cores = {galinheiro:0xd9c08a, curral:0xc9a66b, pasto:0x8fd06a, coelheira:0x9fd67a, lagoinha:0x8fd06a, chiqueiro:0xb08a5a, apiario:0xa6dc7e, aprisco:0xd8c08e, bufalario:0x9c8a5a};
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

  // ================= MODELOS 3D DO KAYKIT (Kay Lousberg, CC0) =================
  // tamanho: altura (a) ou largura (l) desejada, em unidades do mundo
  const MODELOS = {
    moinho:{f:'hex/building_windmill_red', l:3.9}, mercado:{f:'hex/building_market_red', l:6.1}, poco:{f:'hex/building_well_red', l:1.95},
    moinhoAgua:{f:'hex/building_watermill_red', l:3.7}, serraria:{f:'hex/building_lumbermill_red', l:3.9}, casaPadaria:{f:'hex/building_home_A_red', l:3.6}, casaSucos:{f:'hex/building_home_B_yellow', l:3.6}, chocoFab:{f:'hex/building_tavern_yellow', l:3.9}, tapiocaFab:{f:'hex/building_home_A_green', l:3.6}, quiosqueFab:{f:'hex/building_home_B_blue', l:3.6}, acaiFab:{f:'hex/building_tavern_blue', l:3.9}, perfumeFab:{f:'hex/building_tower_A_blue', l:2.6}, ferrariaFab:{f:'hex/building_blacksmith_red', l:3.7}, carpintariaFab:{f:'hex/building_lumbermill_blue', l:3.9}, cozinhaRealFab:{f:'hex/building_tavern_green', l:3.9}, joalheriaFab:{f:'quat/TowerHouse_SecondAge', l:3.4}, tavernaFab:{f:'hex/building_tavern_red', l:3.9},
    mercadoAzul:{f:'hex/building_market_blue', l:3.9}, mercadoVerde:{f:'hex/building_market_green', l:3.9}, mercadoAmarelo:{f:'hex/building_market_yellow', l:3.9}, mercadoVermelho:{f:'hex/building_market_red', l:3.9},
    casaA:{f:'hex/building_home_A_red', l:3.9},
    // 🏰 pack medieval (Quaternius, CC0)
    qFeira:{f:'quat/Market_FirstAge_Level1', l:3.9}, qCasa:{f:'quat/Houses_SecondAge_1_Level1', l:3.7}, qPraca:{f:'quat/TownCenter_SecondAge_Level1', l:6.1},
    qTorre:{f:'quat/WatchTower_SecondAge_Level1', l:1.9}, qMuralha:{f:'quat/WallTowers_SecondAge', l:6.3}, qMoinho:{f:'quat/Windmill_SecondAge', l:3.6},
    qTemplo:{f:'quat/Temple_SecondAge_Level2', l:5.6}, qCastelo:{f:'quat/Temple_SecondAge_Level3', l:6.2}, qPorto:{f:'quat/Port_SecondAge_Level1', l:9}, qMina:{f:'quat/Mine', l:3.6}, qPinho1:{f:'quat/Resource_PineTree', a:3.6}, qPinho2:{f:'quat/Resource_Tree1', a:3.2}, qPinho3:{f:'quat/Resource_PineTree', a:4.4}, qBosque:{f:'quat/Resource_Tree_Group', l:3.8},
    qCast1:{f:'quat/Wonder_SecondAge_Level1', l:7}, qCast2:{f:'quat/Wonder_SecondAge_Level2', l:7.6}, qCast3:{f:'quat/Wonder_SecondAge_Level3', l:7.6}, casaB:{f:'hex/building_home_B_red', l:3.9}, taverna:{f:'hex/building_tavern_red', l:6},
    cerca:{f:'hex/fence_wood_straight', l:2.15}, porteira:{f:'hex/fence_wood_straight_gate', l:2.15},
    barril:{f:'hex/barrel', a:.8}, caixaG:{f:'hex/crate_A_big', l:.8}, caixaP:{f:'hex/crate_A_small', l:.55}, caixaAberta:{f:'hex/crate_open', l:.8},
    saco:{f:'hex/sack', a:.5}, carrinhoMao:{f:'hex/wheelbarrow', l:1.5}, baldeAgua:{f:'hex/bucket_water', a:.42}, lenha:{f:'hex/resource_lumber', l:1},
    arv1:{f:'floresta/Tree_1_A', a:3.6}, arv1b:{f:'floresta/Tree_1_B', a:3.3}, arv2:{f:'floresta/Tree_2_A', a:3.4}, arv2c:{f:'floresta/Tree_2_C', a:3},
    arv3:{f:'floresta/Tree_3_A', a:3.8}, arv4:{f:'floresta/Tree_4_A', a:3.5},
    arbusto1:{f:'floresta/Bush_1_A', l:1.1}, arbusto2:{f:'floresta/Bush_2_A', l:1}, arbusto3:{f:'floresta/Bush_3_A', l:.9}, arbusto4:{f:'floresta/Bush_4_A', l:1.1},
    pedra1:{f:'floresta/Rock_1_A', l:1}, pedra2:{f:'floresta/Rock_2_A', l:.8}, pedra3:{f:'floresta/Rock_3_A', l:1.1},
    capim1:{f:'floresta/Grass_1_A', a:.42}, capim2:{f:'floresta/Grass_2_A', a:.38},
    toras:{f:'recursos/Wood_Log_Stack', l:1.5}, tecidos:{f:'recursos/Textiles_Stack_Large_Colored', l:.95},
  };
  const glb = {cache:{}, espera:{}, ok:false}, matPack = {}, girantes = [];
  function carregarModelos() {
    if (!THREE.GLTFLoader) return Promise.resolve();
    THREE.Cache.enabled = true; // a textura de cada pack é baixada uma vez só
    const L = new THREE.GLTFLoader(), nomes = Object.keys(MODELOS);
    return Promise.all(nomes.map(k => new Promise(res => L.load(`assets/kaykit/${MODELOS[k].f}.gltf`, gl => {
      const raiz = gl.scene, m = MODELOS[k], pasta = m.f.split('/')[0]; raiz.updateMatrixWorld(true);
      const bb = new THREE.Box3().setFromObject(raiz), tam = bb.getSize(V3());
      const esc = m.a ? m.a / tam.y : m.l / Math.max(tam.x, tam.z), cx = (bb.min.x + bb.max.x) / 2, cz = (bb.min.z + bb.max.z) / 2;
      const partes = []; // geometria já no tamanho e com o pé no chão, centralizada
      raiz.traverse(o => { if (!o.isMesh) return;
        // todas as peças do mesmo pack usam o mesmo material: assim dá para juntar tudo em poucas peças
        let mt = pasta === 'quat' ? o.material : matPack[pasta]; if (pasta === 'quat') { mt.envMapIntensity = .35; mt.roughness = .8; mt.metalness = 0; } else if (!mt) { mt = matPack[pasta] = o.material; if (mt.map) { mt.map.anisotropy = 4; mt.map.encoding = THREE.sRGBEncoding; } mt.envMapIntensity = .35; mt.roughness = .85; mt.metalness = 0; }
        if (/fan|wheel|saw/i.test(o.name)) { // pás do moinho, roda d'água, serra: peça separada que gira
          const piv = o.getWorldPosition(V3()); piv.x = (piv.x - cx) * esc; piv.y = (piv.y - bb.min.y) * esc; piv.z = (piv.z - cz) * esc;
          const g = o.geometry.clone(); g.computeBoundingBox(); const tb = g.boundingBox.getSize(V3()); g.scale(esc, esc, esc); g.computeBoundingSphere();
          partes.push({g, mt, piv, eixo:tb.x < tb.z ? 'x' : 'z'}); return; }
        const g = o.geometry.clone(); g.applyMatrix4(o.matrixWorld); g.translate(-cx, -bb.min.y, -cz); g.scale(esc, esc, esc); g.computeBoundingSphere();
        partes.push({g, mt}); });
      glb.cache[k] = partes; (glb.espera[k] || []).forEach(gr => encherGLB(gr, k)); delete glb.espera[k]; res();
    }, undefined, () => res())))).then(() => { glb.ok = true; montarDecorTerras(); });
  }
  function encherGLB(gr, k) {
    glb.cache[k].forEach(({g, mt, piv, eixo}) => {
      const m = new THREE.Mesh(g, mt); m.castShadow = gr.userData.sombra !== false; m.receiveShadow = true;
      if (piv) { const pv = new THREE.Group(); pv.position.copy(piv); pv.add(m); m.castShadow = false; pv.userData.anim = true; pv.userData.eixo = eixo; gr.add(pv); girantes.push(pv); return; }
      m.matrixAutoUpdate = false; m.updateMatrix(); gr.add(m); });
    gr.updateMatrixWorld(true); if (renderer.shadowMap) renderer.shadowMap.needsUpdate = true;
  }
  function modeloGLB(k, x = 0, z = 0, ry = 0, s = 1) { // devolve um grupo; o modelo entra assim que terminar de baixar
    const gr = new THREE.Group(); gr.position.set(x, 0, z); gr.rotation.y = ry; gr.scale.setScalar(s); gr.userData.glb = k;
    if (glb.cache[k]) encherGLB(gr, k); else (glb.espera[k] = glb.espera[k] || []).push(gr);
    return gr;
  }

  // flores, arbustos, pedras e plantinhas espalhados nos lugares vazios (cada modelo é desenhado de uma vez só)
  let natureza = [], natAssinatura = '';
  const NAT_PESOS = [['capim1', 4], ['capim2', 4], ['arbusto1', 2], ['arbusto2', 2], ['arbusto3', 2], ['arbusto4', 1.5], ['pedra1', 1], ['pedra2', 1.2], ['pedra3', .8]];
  const NAT_ARV = ['arv1', 'arv1b', 'arv2', 'arv2c', 'arv3', 'arv4'];
  const NAT_SOMBRA = {qPinho1:1, qPinho2:1, qPinho3:1, palma:1, arbusto1:1, arbusto2:1, arbusto3:1, arbusto4:1, pedra1:1, pedra2:1, pedra3:1, arv1:1, arv1b:1, arv2:1, arv2c:1, arv3:1, arv4:1};
  let posBordaArv = []; // lugares das árvores da borda da ilha (guardados ao montar a ilha)
  function cachePalma() { // palmeira pronta para desenhar muitas de uma vez (InstancedMesh), como as árvores do KayKit
    if (glb.cache.palma) return; const pm = palmeira(1.15); pm.rotation.y = 0; mesclar(pm); pm.updateMatrixWorld(true); const partes = [];
    pm.traverse(o => { if (o.isMesh) { const g = o.geometry.clone(); g.applyMatrix4(o.matrixWorld); partes.push({g, mt:o.material}); } }); glb.cache.palma = partes;
  }
  function espalharNatureza() {
    if (!glb.ok) return; if (TROP) cachePalma();
    natureza.forEach(m => scene.remove(m)); natureza = [];
    const ocup = ocupacao(null), lista = {}, total = NAT_PESOS.reduce((a, p) => a + p[1], 0), mr = Math.random;
    try {
      for (const z of ZONAS) {
        const livre = S.zonas.includes(z.key);
        for (const [cx, cz] of z.cel) {
          if (ocup.has(cx + ',' + cz)) continue;
          Math.random = sorteio((cx + 99) * 7919 + (cz + 99) * 104729);
          if (!livre && Math.random() < .3) { const k = TROP ? 'palma' : MED ? 'qPinho' + (1 + (Math.random() * 3 | 0)) : NAT_ARV[Math.random() * NAT_ARV.length | 0]; (lista[k] = lista[k] || []).push([cx * G + (Math.random() - .5) * .8, cz * G + (Math.random() - .5) * .8, Math.random() * 6.28, .85 + Math.random() * .35]); continue; } // terra bloqueada: mata
          const n = Math.random() < (livre ? .1 : .32) ? 1 + (Math.random() < .35 ? 1 : 0) : 0;
          for (let i = 0; i < n; i++) {
            let r = Math.random() * total, k = NAT_PESOS[0][0]; for (const [kk, w] of NAT_PESOS) { if ((r -= w) <= 0) { k = kk; break; } }
            if (livre && /pedra1|pedra3|arbusto4/.test(k)) k = 'capim1'; // nas terras em uso, só coisa pequena
            (lista[k] = lista[k] || []).push([cx * G + (Math.random() - .5) * 1.5, cz * G + (Math.random() - .5) * 1.5, Math.random() * 6.28, .8 + Math.random() * .45]);
          }
        }
      }
      posBordaArv.forEach(([x, z, i]) => { const k = TROP ? 'palma' : MED ? 'qPinho' + (1 + i % 3) : NAT_ARV[i % NAT_ARV.length]; (lista[k] = lista[k] || []).push([x, z, i * 1.7, .9 + (i % 5) * .08]); }); // árvores da borda
    } finally { Math.random = mr; }
    if (bordaArv) bordaArv.visible = false; // as árvores antigas da borda dão lugar às do KayKit
    const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), sc = V3(), p = V3(), eixo = V3(0, 1, 0);
    for (const k in lista) { const pts = lista[k], partes = glb.cache[k]; if (!partes) continue;
      partes.forEach(({g, mt}) => { const im = new THREE.InstancedMesh(g, mt, pts.length);
        pts.forEach(([x, z, ry, s], i) => im.setMatrixAt(i, m4.compose(p.set(x, 0, z), q.setFromAxisAngle(eixo, ry), sc.setScalar(s))));
        im.castShadow = !!NAT_SOMBRA[k]; im.receiveShadow = true; im.matrixAutoUpdate = false; scene.add(im); natureza.push(im); }); }
    if (renderer.shadowMap) renderer.shadowMap.needsUpdate = true;
  }
  function conferirNatureza() { // refaz quando algo é construído, movido ou removido, ou quando libera terra
    const sig = S.objetos.map(o => o.tipo + o.ox + ',' + o.oz + ',' + (o.rot || 0)).join('|') + '#' + S.zonas.length + '#' + ANEL;
    if (sig !== natAssinatura && glb.ok) { natAssinatura = sig; espalharNatureza(); }
  }

  function modeloDecor(t) {
    const g = new THREE.Group();
    if (DECOR_GLB[t]) { DECOR_GLB[t].forEach(([k, x, z, ry, s]) => g.add(modeloGLB(k, x, z, ry, s))); return g; }
    if (t === 'farol') { // farol listrado com a luz no topo
      g.add(cil(.55, .62, .3, 0x9a9a9a, 0, .15, 0, 12));
      for (let i = 0; i < 5; i++) g.add(cil(.42 - i * .045, .46 - i * .045, .55, i % 2 ? 0xffffff : 0xe2352a, 0, .3 + .27 + i * .55, 0, 14));
      g.add(cil(.36, .36, .08, 0x3a3a3a, 0, 3.12, 0, 14)); const luz = bola(.22, 0xfff3a0, 0, 3.4, 0, 12); luz.material = new THREE.MeshStandardMaterial({color:C(0xfff3a0), emissive:C(0xffd23a), emissiveIntensity:1}); g.add(luz);
      const tp = mesh(new THREE.ConeGeometry(.34, .4, 12), 0, 0, 3.78, 0, true, liso(0xe2352a)); g.add(tp); return g; }
    if (t === 'cabanaTiki') { // cabana de palha com tochas
      [[-.8, -.8], [.8, -.8], [-.8, .8], [.8, .8]].forEach(([x, z]) => g.add(cil(.07, .08, 1.6, 0x7a4b25, x, .8, z, 6)));
      g.add(mesh(new THREE.BoxGeometry(1.9, .1, 1.9), 0, 0, .05, 0, true, liso(0xb98552)));
      const tet = mesh(new THREE.ConeGeometry(1.6, 1.1, 8), 0, 0, 2.05, 0, true, liso(0xd8b45a)); g.add(tet);
      g.add(mesh(new THREE.ConeGeometry(1.7, .25, 8), 0, 0, 1.55, 0, true, liso(0xc49a3e)));
      [[-1.05, 1.05], [1.05, 1.05]].forEach(([x, z]) => { g.add(cil(.04, .05, 1.2, 0x5a3a1f, x, .6, z, 5)); const fg = mesh(new THREE.ConeGeometry(.09, .25, 6), 0, x, 1.32, z, false, new THREE.MeshStandardMaterial({color:C(0xffa020), emissive:C(0xff6a00), emissiveIntensity:.9})); g.add(fg); });
      return g; }
    if (t === 'estatuaConcha') { // concha dourada num pedestal de pedra
      g.add(mesh(new THREE.BoxGeometry(.8, .7, .8), 0, 0, .35, 0, true, liso(0xc9c2b2)));
      const ouro = new THREE.MeshStandardMaterial({color:C(0xffc83a), metalness:.6, roughness:.3});
      for (let i = 0; i < 7; i++) { const c = mesh(new THREE.CylinderGeometry(.02, .1, .8, 5), 0, 0, 1.05, 0, true, ouro); c.rotation.z = (i - 3) * .32; c.translateY(.25); g.add(c); }
      const base = mesh(new THREE.SphereGeometry(.42, 14, 8, 0, Math.PI * 2, 0, Math.PI / 2), 0, 0, .7, 0, true, ouro); base.scale.set(1, .9, .45); g.add(base);
      g.add(bola(.08, 0xffffff, 0, .95, .22, 10)); return g; }
    if (t === 'arvoreEncantada') { // prêmio do álbum completo: árvore brilhante com vaga-lumes
      g.add(cil(.22, .32, 1.8, 0x6b4a8a, 0, .9, 0, 8));
      [[0, 2.3, 0, 1.1], [-.6, 1.9, .3, .75], [.6, 2.0, -.2, .8], [.1, 2.8, .2, .7]].forEach(([x, y, z, r]) => { const b = bola(r, 0xb07ae0, x, y, z, 12); b.material = new THREE.MeshStandardMaterial({color:C(0xc49af0), emissive:C(0x7a3ad0), emissiveIntensity:.45, roughness:.6}); g.add(b); });
      for (let i = 0; i < 9; i++) { const v = bola(.07, 0xfff3a0, Math.cos(i * .7) * 1.2, 1.4 + (i % 3) * .5, Math.sin(i * .7) * 1.2, 6); v.material = new THREE.MeshStandardMaterial({color:C(0xfff3a0), emissive:C(0xffd23a), emissiveIntensity:1}); g.add(v); }
      return g; }
    if (t === 'flamingo') { // flamingo rosa de jardim
      g.add(cil(.015, .015, .7, 0x333333, 0, .35, 0, 4)); const cp = bola(.2, 0xff7eb6, 0, .82, 0, 10); cp.scale.set(.8, .75, 1.3); g.add(cp);
      const pe = cil(.035, .04, .45, 0xff7eb6, 0, 1.08, .18, 6); pe.rotation.x = -.35; g.add(pe); g.add(bola(.09, 0xff7eb6, 0, 1.32, .26, 8));
      const bico = mesh(new THREE.ConeGeometry(.035, .14, 6), 0, 0, 1.3, .37, true, liso(0x2a2a2a)); bico.rotation.x = 2; g.add(bico); return g; }
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
    if (TROP) { f.absarc(0, 0, h, 0, Math.PI * 2, false); return f; } // 🏝️ ilha redonda
    if (MED) { for (let i = 0; i < 6; i++) { const a = i * Math.PI / 3; i ? f.lineTo(Math.cos(a) * h, Math.sin(a) * h) : f.moveTo(h, 0); } f.closePath(); return f; } // 🏰 hexágono
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
  // ⚓ porto na praia do sul (não ocupa terra da fazenda) + barco
  let porto3D = null, barco3D = null;
  function montarPorto() {
    if (porto3D) { scene.remove(porto3D); porto3D = null; barco3D = null; }
    if (VISITA || !(TROP || MED || S.porto)) return;
    const g = new THREE.Group(), z0 = (MED ? MEIA * Math.cos(Math.PI / 6) : MEIA) - .6, madeira = 0xb98552, escura = 0x7a5233, med = !TROP && THREE.GLTFLoader;
    if (med) g.add(modeloGLB('qPorto', .6, z0 + 3.4, 0, 1)); // 🏰 porto medieval na ilha principal
    if (!med) for (let i = 0; i < 9; i++) g.add(mesh(new THREE.BoxGeometry(2.6, .14, .62), 0, 0, -.12, z0 + i * .66, true, liso(i % 2 ? madeira : 0xc6935e))); // tábuas do píer
    if (!med) { [-1.2, 1.2].forEach(x => { for (let i = 0; i < 4; i++) g.add(cil(.12, .14, 2, escura, x, -1.05, z0 + .3 + i * 1.7, 7)); });
    [-1.25, 1.25].forEach(x => g.add(mesh(new THREE.BoxGeometry(.1, .1, 5.9), 0, x, .28, z0 + 2.65, true, liso(escura))));
    for (let i = 0; i < 4; i++) [-1.25, 1.25].forEach(x => g.add(cil(.05, .05, .42, escura, x, .08, z0 + .3 + i * 1.7, 6)));
    g.add(mesh(new THREE.BoxGeometry(.6, .5, .6), 0, -.6, .15, z0 + .6, true, liso(0xa8743f))); g.add(mesh(new THREE.BoxGeometry(.45, .4, .45), 0, -.55, .6, z0 + .6, true, liso(0xc6935e))); // caixotes
    g.add(cil(.25, .25, .55, 0x8b5a2b, .7, .2, z0 + .7, 10)); } // barril
    const placa = new THREE.Group(); placa.position.set(1.65, 0, z0 + .2); g.add(placa);
    placa.add(cil(.05, .05, 1.4, escura, 0, .7, 0, 6)); placa.add(mesh(new THREE.BoxGeometry(1.1, .45, .08), 0, 0, 1.35, 0, true, liso(madeira)));
    const t = new THREE.Sprite(new THREE.SpriteMaterial({map:emojiTex('⚓'), depthTest:true})); t.position.set(0, 1.36, .08); t.scale.setScalar(.42); placa.add(t);
    // barco (aparece quando tem pedido do barco ou para viajar)
    const b = new THREE.Group(); b.position.set(2.7, -1.35, z0 + 4.2); b.rotation.y = .15;
    const casco = mesh(new THREE.BoxGeometry(1.6, .7, 3.6), 0, 0, .25, 0, true, liso(0xd2503f)); b.add(casco);
    const proa = mesh(new THREE.ConeGeometry(.8, 1.2, 4), 0, 0, .25, 2.35, true, liso(0xd2503f)); proa.rotation.set(Math.PI / 2, Math.PI / 4, 0); proa.scale.set(1, 1, .44); b.add(proa);
    b.add(mesh(new THREE.BoxGeometry(1.45, .1, 3.4), 0, 0, .62, .05, true, liso(0xe8c89a)));
    b.add(mesh(new THREE.BoxGeometry(1.7, .14, 3.7), 0, 0, .62, 0, true, liso(0xf4f0e4)).translateY(-.02).translateY(0));
    b.add(cil(.06, .07, 2.6, escura, 0, 1.9, .2, 6));
    const vela = mesh(new THREE.PlaneGeometry(1.5, 1.7), 0, 0, 2.1, .25, true, new THREE.MeshStandardMaterial({color:C(0xfff8e8), side:THREE.DoubleSide, roughness:.9})); vela.rotation.y = Math.PI / 2; b.add(vela);
    const band = new THREE.Sprite(new THREE.SpriteMaterial({map:emojiTex('⛵'), depthTest:true})); band.position.set(0, 3.35, .2); band.scale.setScalar(.55); b.add(band);
    [[-.3, .5], [.35, -.4]].forEach(([x, z]) => b.add(mesh(new THREE.BoxGeometry(.5, .45, .5), 0, x, .9, z, true, liso(0xa8743f))));
    g.add(b); barco3D = b;
    const pick = new THREE.Mesh(new THREE.BoxGeometry(5.5, 3, 9.5), new THREE.MeshBasicMaterial({visible:false})); pick.position.set(1, 0, z0 + 3.5); g.add(pick); g.userData.pick = pick;
    semSombra(g); g.traverse(o => { if (o.isMesh && o !== pick) o.castShadow = true; });
    scene.add(g); porto3D = g;
  }
  let sombraNuvens = null; const borboletas = [];
  let ilhaObjs = [], bordaArv = null;
  function montarIlha() {
    const antes = new Set(scene.children);
    const marGeo = new THREE.PlaneGeometry(360, 360, 40, 40); marGeo.rotateX(-Math.PI / 2);
    aguaMar = new THREE.Mesh(marGeo, new THREE.MeshStandardMaterial({color:C(TROP ? 0x2cc8d2 : MED ? 0x3d86d0 : 0x56b4e6), roughness:.3, metalness:.05})); // mar azul-turquesa na ilha tropical
    aguaMar.position.y = -1.55; scene.add(aguaMar);
    const areia = new THREE.ExtrudeGeometry(formaQuadrada(MEIA + 2.4, 6), {depth:1.6, bevelEnabled:true, bevelThickness:.4, bevelSize:.9, bevelSegments:2, curveSegments:10});
    areia.rotateX(-Math.PI / 2);
    const ma = new THREE.Mesh(areia, liso(TROP ? 0xfff0cc : MED ? 0xcfc4a8 : 0xeedba0)); ma.position.y = -2.15; ma.receiveShadow = true; scene.add(ma);
    const terra = new THREE.ExtrudeGeometry(formaQuadrada(MEIA, 4), {depth:1, bevelEnabled:true, bevelThickness:.2, bevelSize:.25, bevelSegments:2, curveSegments:10});
    terra.rotateX(-Math.PI / 2);
    const mt = new THREE.Mesh(terra, liso(TROP ? 0x8fcc45 : MED ? 0x5f9a42 : 0x6cb84c)); mt.position.y = -1.2; mt.receiveShadow = true; scene.add(mt);
    // grama com tons variados
    const geo = new THREE.PlaneGeometry(2 * MEIA, 2 * MEIA, 70, 70); geo.rotateX(-Math.PI / 2);
    const cores = [], c = new THREE.Color(), pos = geo.attributes.position, R = 4, K = MEIA - R;
    for (let i = 0; i < pos.count; i++) {
      let x = pos.getX(i), z = pos.getZ(i);
      if (TROP) { const d = Math.hypot(x, z); if (d > MEIA) { x *= MEIA / d; z *= MEIA / d; pos.setX(i, x); pos.setZ(i, z); } }
      else if (MED) { const apw = MEIA * Math.cos(Math.PI / 6), hh = Math.max(...NORM_HEX.map(t => Math.abs(x * Math.cos(t) + z * Math.sin(t)))); if (hh > apw) { x *= apw / hh; z *= apw / hh; pos.setX(i, x); pos.setZ(i, z); } }
      else if (Math.abs(x) > K && Math.abs(z) > K) { const cx = Math.sign(x) * K, cz = Math.sign(z) * K, dx = x - cx, dz = z - cz, d = Math.hypot(dx, dz); if (d > R) { x = cx + dx / d * R; z = cz + dz / d * R; pos.setX(i, x); pos.setZ(i, z); } }
      const n = Math.sin(x * .23) * Math.cos(z * .19) + Math.sin((x + z) * .11) * .7 + Math.sin(x * .7 + z * .5) * .15;
      const m = Math.sin(x * .05 + 1.3) * Math.cos(z * .06 - .4); // manchas grandes: grama mais clara e mais escura
      c.setHSL((TROP ? .19 : MED ? .29 : .265) + n * .018 - m * .015, (TROP ? .72 : MED ? .48 : .62) + n * .05, (TROP ? .44 : MED ? .37 : .40) + n * .05 + m * .045).convertSRGBToLinear(); cores.push(c.r, c.g, c.b);
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
    const pontoIlha = () => { do p.set(rnd(-MEIA + 1, MEIA - 1), 0, rnd(-MEIA + 1, MEIA - 1)); while ((TROP && (Math.hypot(p.x, p.z) > MEIA - 1 || Math.hypot(p.x, p.z) < (R_LAGOA + 1) * G)) || (MED && (!dentroHex(p.x, p.z, MEIA * .866 - 1) || Math.hypot(p.x, p.z) < (R_CASTELO + .6) * G))); return p; };
    for (let i = 0; i < 1300; i++) { pontoIlha(); q.setFromAxisAngle(V3(Math.random() - .5, 0, Math.random() - .5).normalize(), rnd(-.3, .3)); sc.setScalar(rnd(.7, 1.5)); tufos.setMatrixAt(i, m4.compose(p, q, sc)); tufos.setColorAt(i, c.setHSL(rnd(.24, .3), rnd(.5, .7), rnd(.3, .45)).convertSRGBToLinear()); }
    { let cx = 0, cz = 0, cor = 0; for (let i = 0; i < 420; i++) { if (i % 14 === 0) { pontoIlha(); cx = p.x; cz = p.z; cor = coresF[Math.random() * 5 | 0]; } p.set(cx + rnd(-1.1, 1.1), .12, cz + rnd(-1.1, 1.1)); sc.setScalar(rnd(.8, 1.3)); q.identity(); flores.setMatrixAt(i, m4.compose(p, q, sc)); flores.setColorAt(i, c.setHex(Math.random() < .8 ? cor : 0xffffff).convertSRGBToLinear()); } } // flores em canteirinhos
    tufos.receiveShadow = true; scene.add(tufos); // v0.48: as bolinhas coloridas (flores) saíram: caíam dentro dos cercados e pesavam
    // sombra das nuvens passando devagar pelo chão
    { const cv = document.createElement('canvas'); cv.width = cv.height = 256; const g2 = cv.getContext('2d');
      for (let i = 0; i < 9; i++) { const x = rnd(20, 236), y = rnd(20, 236), r = rnd(30, 60), gr = g2.createRadialGradient(x, y, 4, x, y, r); gr.addColorStop(0, 'rgba(0,20,0,.55)'); gr.addColorStop(1, 'rgba(0,20,0,0)'); g2.fillStyle = gr; g2.fillRect(0, 0, 256, 256); }
      const tx = new THREE.CanvasTexture(cv); tx.wrapS = tx.wrapT = THREE.RepeatWrapping; tx.repeat.set(2, 2);
      sombraNuvens = new THREE.Mesh((TROP ? new THREE.CircleGeometry(MEIA, 48) : MED ? new THREE.ShapeGeometry(formaQuadrada(MEIA)).rotateX(Math.PI / 2).rotateX(-Math.PI / 2) : new THREE.PlaneGeometry(2 * MEIA, 2 * MEIA)).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({map:tx, transparent:true, opacity:.22, depthWrite:false}));
      sombraNuvens.position.y = .06; sombraNuvens.renderOrder = 1; scene.add(sombraNuvens); }
    // borboletas
    for (let i = 0; i < 7; i++) {
      const g3 = new THREE.Group(), cor = [0xffd84a, 0xff8ac0, 0xffffff, 0x8fd3ff, 0xffa53d][i % 5], m3 = new THREE.MeshBasicMaterial({color:C(cor), side:THREE.DoubleSide});
      const asa = new THREE.PlaneGeometry(.22, .18); asa.translate(.11, 0, 0);
      const a1 = new THREE.Mesh(asa, m3), a2 = new THREE.Mesh(asa, m3); a2.rotation.y = Math.PI; g3.add(a1, a2);
      g3.position.set(rnd(-MEIA + 3, MEIA - 3), rnd(.6, 1.4), rnd(-MEIA + 3, MEIA - 3)); scene.add(g3);
      g3.traverse(m => { m.castShadow = false; }); borboletas.push({g:g3, a1, a2, fase:rnd(0, 6), alvo:g3.position.clone(), vel:rnd(.6, 1)});
    }
    // árvores na borda e palmeiras na praia (juntas numa malha só por material)
    const borda = new THREE.Group(); bordaArv = new THREE.Group(); posBordaArv = [];
    for (let i = 0; i < 64; i++) {
      const lado = i % 4, t = rnd(-MEIA + 2, MEIA - 2), o = MEIA - rnd(.3, .9), ang = i / 64 * Math.PI * 2 + rnd(-.03, .03);
      let x = lado === 0 ? t : lado === 1 ? t : lado === 2 ? -o : o, z = lado === 0 ? -o : lado === 1 ? o : t;
      if (TROP) { if (Math.abs(ang - Math.PI / 2) < .12) continue; x = Math.cos(ang) * o; z = Math.sin(ang) * o; } // na redonda: em volta do círculo (com um vão no porto)
      if (MED) { const k = i / 64 * 6, v = Math.floor(k), fr = k - v, a1 = v * Math.PI / 3, a2 = (v + 1) * Math.PI / 3, rr = o * .985; // em volta do hexágono
        x = (Math.cos(a1) * (1 - fr) + Math.cos(a2) * fr) * rr; z = (Math.sin(a1) * (1 - fr) + Math.sin(a2) * fr) * rr; if (v === 1 && Math.abs(fr - .5) < .12) continue; }
      const a = Math.random() < .35 ? pinheiro(rnd(.85, 1.2)) : Math.random() < .25 ? arbusto(rnd(1, 1.3)) : arvore(rnd(.8, 1.1), Math.random() < .2 ? 0xe83b2c : null);
      a.position.set(x, 0, z); bordaArv.add(a); posBordaArv.push([x, z, i]);
    }
    scene.add(bordaArv); mesclar(bordaArv); congelar(bordaArv); if (glb.ok) bordaArv.visible = false;
    for (let i = 0; i < 14; i++) {
      const lado = i % 4, t = rnd(-MEIA, MEIA), o = MEIA + rnd(1.2, 2.2), ang = i / 14 * Math.PI * 2 + .2;
      let x = lado < 2 ? t : lado === 2 ? -o : o, z = lado === 0 ? -o : lado === 1 ? o : t;
      if (TROP) { x = Math.cos(ang) * o; z = Math.sin(ang) * o; }
      if (MED) { const pd = pedra(rnd(1.2, 2)); pd.position.set(Math.cos(ang) * o, -.3, Math.sin(ang) * o); borda.add(pd); continue; } // pedras na praia de cascalho
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
      if (TROP) placa.position.set(MEIA * .7, -.05, MEIA * .7); else if (MED) placa.position.set(MEIA * .62, -.05, MEIA * .36); else placa.position.set(MEIA - .3, -.05, MEIA - .3); placa.rotation.y = Math.PI / 4; placa.scale.setScalar(1.5); scene.add(placa);
      if (document.fonts) document.fonts.ready.then(() => { desenhar(); tx.needsUpdate = true; }); }
    if (TROP) montarCenarioTropical();
    if (MED) setTimeout(montarCastelo, 0); // depois do S carregado
    ilhaObjs = scene.children.filter(o => !antes.has(o));
  }
  // 💡 ajudante: quando o jogador fica parado, mostra uma coisa útil que dá para fazer agora (com a mãozinha apontando)
  let ultimoToque = Date.now(), ultimaDica = Date.now(), tipoDicaAnt = '';
  window.addEventListener('pointerdown', () => { ultimoToque = Date.now(); const d = $('#dicaAjuda'); if (d) d.classList.remove('on'); }, true);
  const prontoFab = r => r.nivel <= S.nivel && Object.entries(r.ing).every(([k, q]) => estoque(k) >= q);
  function acharDicas() {
    const L = [], lojaEl = (sub, tipo) => () => janela === 'loja' ? (subLoja === sub ? $(`[data-construir=${tipo}]`) : $(`[data-sub=${sub}]`)) : janela ? null : $('.cantos [data-abrir=loja]');
    if (S.nivel >= NIVEL_PASSE && passePode()) L.push({k:'passe', txt:'🎁 Tem <b>presente</b> esperando no Passe!', el:() => janela === 'passe' ? null : $('#btnPasse')});
    S.objetos.forEach(o => { const T = TIPOS[o.tipo]; if (!T.fab || o.tipo === 'moinho' || o.pend) return; const f = fabEstado(o.tipo); if (f.fila.length) return;
      const r = (FABRICAS[o.tipo].receitas || []).find(prontoFab); if (r) L.push({k:'fab' + o.tipo, txt:`🏭 A <b>${T.nome}</b> está parada. Toque nela e faça <b>${r.nome}</b>!`, p3:() => centro(o).add(V3(0, 3.2, 0)), el:() => janela ? null : undefined}); });
    for (const k in ANIMAIS) { const a = ANIMAIS[k]; if (!nTipo(a.cercado) || qtdAnimal(k) >= maxAnimal(k) || S.moedas < custoAnimal(k) * 1.5 || S.nivel < a.nivel) continue;
      L.push({k:'ani' + k, txt:`${a.emoji} Cabe mais <b>${a.nome.toLowerCase()}</b> no ${TIPOS[a.cercado].nome.toLowerCase()}! Compre em Animais e produza mais.`, el:() => janela === 'animais' ? $(`[data-animal=${k}]`) : janela ? null : $('.cantos [data-abrir=animais]')}); }
    const nova = CONSTRUCOES.find(c => c.tipo !== 'lote' && podeAqui(c) && nPosse(c.tipo) === 0 && S.nivel >= nivelConstrucao(c.tipo) && S.moedas >= custoConstrucao(c.tipo));
    if (nova) { const sub = subDe(nova.tipo); L.push({k:'nova' + nova.tipo, txt:`🏗️ Você já pode ter: <b>${TIPOS[nova.tipo].nome}</b>! Veja em Loja › ${SUBLOJA[sub]}.`, el:lojaEl(sub, nova.tipo)}); }
    const mais = CONSTRUCOES.find(c => TIPOS[c.tipo].fruta && podeAqui(c) && nPosse(c.tipo) > 0 && !noMaximo(c.tipo) && nPosse(c.tipo) < maxPermitido(c.tipo) && S.nivel >= nivelConstrucao(c.tipo) && S.moedas >= custoConstrucao(c.tipo) * 2);
    if (mais) L.push({k:'mais' + mais.tipo, txt:`${mais.icone} Que tal mais um(a) <b>${TIPOS[mais.tipo].nome.toLowerCase()}</b>? Produz sozinho para sempre!`, el:lojaEl('fazenda', mais.tipo)});
    if (ZONAS.some(z => !S.zonas.includes(z.key)) && S.nivel >= nivelZona() && S.moedas >= custoZona()) L.push({k:'terra', txt:'🌳 Dá para liberar <b>mais terra</b>! Toque na placa 🔒.', fn:guiarTerra});
    const pr = S.plots.findIndex(pronto); if (pr >= 0) L.push({k:'colher', txt:'🌾 Tem planta <b>pronta</b>! Toque nela para colher.', p3:() => posTile(pr).add(V3(0, 1.2, 0)), el:() => janela ? null : undefined});
    const vz = S.plots.findIndex(p => !p.c); if (vz >= 0 && !MED) L.push({k:'plantar', txt:'🌱 Tem <b>canteiro vazio</b>. Toque nele e plante algo!', p3:() => posTile(vz).add(V3(0, 1, 0)), el:() => janela ? null : undefined});
    if (MED && estCacada().redes) L.push({k:'cacada', txt:'🦋 Suas redinhas estão prontas: que tal uma <b>Caçada mágica</b>?', el:() => janela ? null : $('#btnCacada')});
    return L;
  }
  function mostrarDica(forcar) {
    const L = acharDicas(); if (!L.length) { if (forcar) toast('💡 Tudo em dia por aqui! Siga as Missões para crescer.'); return; }
    const d = L.find(x => x.k !== tipoDicaAnt) || L[0]; tipoDicaAnt = d.k; ultimaDica = Date.now();
    let el = $('#dicaAjuda'); if (!el) { el = document.createElement('div'); el.id = 'dicaAjuda'; document.body.appendChild(el); }
    el.innerHTML = `<span class="da-ic">💡</span><span>${d.txt}</span>`; el.classList.add('on'); setTimeout(() => el.classList.remove('on'), 9000);
    if (d.fn) d.fn(); else apontar_(d.el, d.p3, 9000);
  }
  function tickDica() {
    if (VISITA || S.dicas === false || S.tut !== -1 || janela || tutAtual() || editar.ativo || seletorAberto || $('#jogoCacada')) return;
    const ag = Date.now(); if (ag - ultimoToque > 22000 && ag - ultimaDica > 45000 && ag - ultimoToque < 15 * 60000) mostrarDica();
  }
  // 🦋 Caçada mágica (Ilha Medieval): pegar criaturinhas com a redinha, guardar no álbum e soltar de volta. Ninguém se machuca!
  const CRIATURAS = [
    {id:'borboleta', nome:'Borboleta azul',   emoji:'🦋', peso:30, vel:1,   pts:20},
    {id:'joaninha',  nome:'Joaninha dourada', emoji:'🐞', peso:25, vel:.8,  pts:20},
    {id:'vagalume',  nome:'Vaga-lume',        emoji:'✨', peso:20, vel:1.3, pts:30},
    {id:'sapinho',   nome:'Sapinho-príncipe', emoji:'🐸', peso:12, vel:1,   pts:50, coroa:true},
    {id:'coruja',    nome:'Coruja sábia',     emoji:'🦉', peso:8,  vel:1.2, pts:70},
    {id:'fadinha',   nome:'Fadinha da floresta', emoji:'🧚', peso:6, vel:1.5, pts:100},
    {id:'unicornio', nome:'Unicórnio bebê',   emoji:'🦄', peso:3,  vel:1.6, pts:150},
    {id:'dragaozinho', nome:'Dragãozinho',    emoji:'🐲', peso:1.5, vel:1.8, pts:250},
  ];
  const REDES_MAX = 3, REDE_RECARGA = 2 * 3600 * 1000, CACADA_SEG = 30;
  function estCacada() { const c = S.cacada = S.cacada || {redes:REDES_MAX, t:Date.now(), album:{}, premio:{}};
    while (c.redes < REDES_MAX && Date.now() - c.t >= REDE_RECARGA) { c.redes++; c.t += REDE_RECARGA; } if (c.redes >= REDES_MAX) c.t = Date.now(); return c; }
  function htmlCacada() {
    const c = estCacada(), falta = c.redes < REDES_MAX ? REDE_RECARGA - (Date.now() - c.t) : 0, n = CRIATURAS.filter(k => c.album[k.id]).length;
    return `<div class="porto-viagem"><div class="pv-ic">🦋</div><div class="pv-txt"><b>Caçada mágica</b><small>Pegue as criaturinhas da floresta com a redinha antes que elas se escondam! Depois elas voltam felizes para a floresta 💚</small></div></div>
      <div class="cac-redes">${'🥅'.repeat(c.redes)}${'<i>🥅</i>'.repeat(REDES_MAX - c.redes)} <span>${c.redes}/${REDES_MAX} redinhas${falta ? ` · próxima em ${fmtT(falta / 1000)}` : ''}</span></div>
      <div class="barco-premio"><button class="btn verde" data-acao="cacada-ir" ${c.redes ? '' : 'disabled'}>🦋 Começar (30 s)</button> <button class="btn" data-abrir="album">📖 Álbum ${n}/${CRIATURAS.length}</button></div>`;
  }
  function htmlAlbum() {
    const c = estCacada(), n = CRIATURAS.filter(k => c.album[k.id]).length;
    return `<p class="dica">Pegue cada criatura pelo menos uma vez. Cada nova vale <b>⭐ 500 XP</b>, e o álbum completo dá um prêmio especial: a <b>🌳 Árvore encantada</b>!</p>
      <div class="album">${CRIATURAS.map(k => c.album[k.id] ? `<div class="alb ok"><span class="alb-e">${k.emoji}${k.coroa ? '<i>👑</i>' : ''}</span><b>${k.nome}</b><small>pegou ${fmtN(c.album[k.id])}×</small></div>`
        : `<div class="alb"><span class="alb-e">❔</span><b>???</b><small>${k.peso <= 3 ? 'raríssima' : k.peso <= 8 ? 'rara' : 'comum'}</small></div>`).join('')}</div>
      <p class="dica">${n}/${CRIATURAS.length} criaturas${c.completo ? ' · 🏆 álbum completo!' : ''}</p>`;
  }
  function comecarCacada() {
    const c = estCacada(); if (!c.redes) return; c.redes--; if (c.redes === REDES_MAX - 1) c.t = Date.now(); fechar(); salvar();
    const ov = document.createElement('div'); ov.id = 'jogoCacada';
    ov.innerHTML = `<div class="cac-topo"><b>🦋 Caçada mágica</b><div class="cac-tempo"><i></i></div><span class="cac-n">0</span></div><div class="cac-area"></div><div class="cac-dica">Toque nas criaturinhas!</div>`;
    document.body.appendChild(ov); const area = ov.querySelector('.cac-area'), barra = ov.querySelector('.cac-tempo i'), cont = ov.querySelector('.cac-n');
    for (let i = 0; i < 14; i++) { const d = document.createElement('span'); d.className = 'cac-arv'; d.textContent = ['🌲', '🌳', '🌿', '🍄', '🌸'][i % 5]; d.style.left = (i * 7.3 + rnd(-2, 2)) + '%'; d.style.top = rnd(10, 85) + '%'; d.style.fontSize = rnd(30, 56) + 'px'; area.appendChild(d); }
    const pegos = [], vivos = [], ini = performance.now(), tot = CRIATURAS.reduce((a, k) => a + k.peso, 0); let prox = ini + 400, fim = false;
    const nova = () => { let r = Math.random() * tot, k = CRIATURAS[0]; for (const x of CRIATURAS) { if ((r -= x.peso) <= 0) { k = x; break; } }
      const el = document.createElement('button'); el.className = 'cac-bicho'; el.innerHTML = k.emoji + (k.coroa ? '<i>👑</i>' : '');
      const W = area.clientWidth, H = area.clientHeight, b = {el, k, x:rnd(.1, .9) * W, y:rnd(.15, .85) * H, vx:rnd(-1, 1), vy:rnd(-.6, .6), nasc:performance.now(), vida:rnd(2200, 3400) / k.vel, fase:rnd(0, 6)};
      el.addEventListener('pointerdown', ev => { ev.stopPropagation(); if (b.pego || fim) return; b.pego = true; pegos.push(k); cont.textContent = pegos.length; somT('achou');
        el.classList.add('pego'); const rd = document.createElement('span'); rd.className = 'cac-rede'; rd.textContent = '✨'; rd.style.left = b.x + 'px'; rd.style.top = b.y + 'px'; area.appendChild(rd); setTimeout(() => rd.remove(), 700); setTimeout(() => el.remove(), 350); });
      area.appendChild(el); vivos.push(b); };
    const passo = t => { if (fim) return; const dec = (t - ini) / 1000, W = area.clientWidth, H = area.clientHeight;
      barra.style.width = Math.max(0, 100 - dec / CACADA_SEG * 100) + '%';
      if (t >= prox) { nova(); prox = t + rnd(450, 900); }
      for (let i = vivos.length - 1; i >= 0; i--) { const b = vivos[i]; if (b.pego) { vivos.splice(i, 1); continue; }
        const vida = (t - b.nasc) / b.vida, sp = 70 * b.k.vel; b.x += (b.vx * sp + Math.sin(t / 300 + b.fase) * 30) / 60; b.y += (b.vy * sp + Math.cos(t / 260 + b.fase) * 24) / 60;
        if (b.x < 30 || b.x > W - 30) b.vx *= -1; if (b.y < 30 || b.y > H - 30) b.vy *= -1;
        b.el.style.transform = `translate(${b.x}px, ${b.y}px) scale(${vida < .15 ? vida / .15 : vida > .85 ? Math.max(0, (1 - vida) / .15) : 1})`;
        if (vida >= 1) { b.el.remove(); vivos.splice(i, 1); } }
      if (dec >= CACADA_SEG) { fim = true; terminarCacada(ov, pegos); return; } requestAnimationFrame(passo); };
    requestAnimationFrame(passo);
  }
  function terminarCacada(ov, pegos) {
    const c = estCacada(), por = {}, novas = []; let moedas = 0, xp = 0;
    pegos.forEach(k => { por[k.id] = (por[k.id] || 0) + 1; moedas += k.pts * 15; xp += k.pts * 2; if (!c.album[k.id]) novas.push(k); c.album[k.id] = (c.album[k.id] || 0) + 1; });
    novas.forEach(() => xp += 500); let completo = false;
    if (!c.completo && CRIATURAS.every(k => c.album[k.id])) { c.completo = completo = true; moedas += 20000; xp += 5000; S.guardados = S.guardados || []; S.guardados.push({uid:'g' + Date.now(), tipo:'arvoreEncantada'}); }
    S.moedas += moedas; ganharXp(xp); S.stats.cacadas = (S.stats.cacadas || 0) + 1; salvar(); tudo();
    ov.querySelector('.cac-area').innerHTML = `<div class="cac-fim"><h3>${pegos.length ? `Você pegou ${pegos.length} criaturinha${pegos.length > 1 ? 's' : ''}!` : 'Elas foram rápidas desta vez!'}</h3>
      <div class="cac-lista">${CRIATURAS.filter(k => por[k.id]).map(k => `<span>${k.emoji} ${por[k.id]}×</span>`).join('') || '🌿'}</div>
      ${novas.length ? `<p>📖 Novas no álbum: ${novas.map(k => k.emoji + ' ' + k.nome).join(', ')}</p>` : ''}
      ${completo ? '<p class="cac-ouro">🏆 Álbum completo! Você ganhou a 🌳 Árvore encantada (Loja › 📦 Guardados)</p>' : ''}
      <p>💚 Todas voltaram felizes para a floresta.</p><p class="cac-premio">+${fmtN(moedas)} 🪙 · +${fmtN(xp)} XP</p>
      <button class="btn verde" data-cac-sair>Voltar</button></div>`;
    ov.querySelector('.cac-dica').textContent = '';
    ov.querySelector('[data-cac-sair]').addEventListener('click', () => { ov.remove(); abrir('cacada'); });
  }
  // 🏰 castelo do jogador no meio da Ilha Medieval: começa em ruínas e evolui em 3 níveis
  const CASTELO = [
    {nome:'Castelo restaurado', moedas:60000,  itens:{pedra:30, madeira:30, ferro:10}, xp:5000, bonus:1},
    {nome:'Castelo com torres', moedas:150000, itens:{pedra:60, madeira:50, ferro:25, ouro:2}, xp:15000, bonus:2},
    {nome:'Grande castelo',     moedas:400000, itens:{pedra:100, madeira:80, ferro:40, ouro:4, rubi:2, safira:2}, xp:40000, bonus:3},
  ];
  let castelo3D = null;
  function montarCastelo() {
    if (castelo3D) { scene.remove(castelo3D); castelo3D = null; }
    const g = new THREE.Group(), RH = (R_CASTELO - .9) * G, RF = (R_CASTELO - .25) * G;
    g.add(mesh(new THREE.CylinderGeometry(RF + .5, RF + .5, .1, 36), 0, 0, .02, 0, false, liso(0x9a9a8a))); // borda de pedra do fosso
    g.add(mesh(new THREE.CylinderGeometry(RF, RF, .14, 36), 0, 0, .05, 0, false, new THREE.MeshStandardMaterial({color:C(0x2f7fc4), roughness:.35, metalness:0, envMapIntensity:.2}))); // fosso
    g.add(mesh(new THREE.CylinderGeometry(RH, RH + .3, .7, 28), 0, 0, .35, 0, true, liso(0x7da84e))); // morro
    g.add(mesh(new THREE.BoxGeometry(1.5, .16, RF - RH + 1.2), 0, 0, .3, RH + (RF - RH) / 2, true, liso(0x9a6a3a))); // ponte
    [-.7, .7].forEach(x => g.add(mesh(new THREE.BoxGeometry(.1, .35, RF - RH + 1.2), 0, x, .5, RH + (RF - RH) / 2, true, liso(0x6b4a2b))));
    const n = S.castelo || 0;
    if (n && THREE.GLTFLoader) { const cm = modeloGLB('qCast' + n, 0, -.2, 0, 1); cm.position.y = .68; g.add(cm); }
    else { // ruínas: pedras, andaime e a placa
      [[-1.5, -.8, 1.6], [1.2, -1.2, 1.3], [.3, .9, 1.1], [-.6, 1.4, .9], [1.6, .6, 1]].forEach(([x, z, sc]) => { const pd = pedra(sc); pd.position.set(x, .68, z); g.add(pd); });
      [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([x, z]) => g.add(cil(.07, .07, 2.4, 0x8b5a2b, x * .9, 1.9, z * .9 - .3, 5)));
      g.add(mesh(new THREE.BoxGeometry(2.1, .1, 2.1), 0, 0, 2.6, -.3, true, liso(0xb98552)));
      const pl = rotulo('🔨 Restaure o castelo', '#6b4a2b'); pl.position.set(0, 3.6, 0); pl.scale.multiplyScalar(.7); g.add(pl); }
    [[-RH + .4, -RH * .3], [RH - .4, -RH * .3]].forEach(([x, z]) => { g.add(cil(.05, .05, 2.2, 0x5a3a1f, x, 1.8, z, 5)); const b = mesh(new THREE.PlaneGeometry(.8, .5), 0, x + .4, 2.65, z, false, new THREE.MeshStandardMaterial({color:C(0xd8443a), side:THREE.DoubleSide})); g.add(b); });
    const pick = new THREE.Mesh(new THREE.CylinderGeometry(RH + .4, RH + .4, 6, 16), new THREE.MeshBasicMaterial({visible:false})); pick.position.y = 2; g.add(pick); g.userData.pick = pick;
    scene.add(g); castelo3D = g;
  }
  function htmlCastelo() {
    const n = S.castelo || 0, prox = CASTELO[n];
    let h = `<div class="porto-viagem"><div class="pv-ic">🏰</div><div class="pv-txt"><b>${n ? CASTELO[n - 1].nome : 'Castelo em ruínas'} · nível ${n}/3</b>
      <small>${n ? `Bônus: a mina e o bosque dão <b>+${CASTELO[n - 1].bonus}</b> a cada coleta.` : 'Restaure o castelo com pedra, madeira e ferro. Cada nível deixa a mina e o bosque mais generosos!'}</small></div></div>`;
    if (!prox) return h + '<p class="dica">👑 Seu castelo está completo! Você é a realeza da Ilha Medieval.</p>';
    const ok = temItens(prox.itens) && S.moedas >= prox.moedas;
    h += `<div class="secao-titulo">🔨 Próximo: ${prox.nome}</div><div class="barco-caixas">${Object.entries(prox.itens).map(([k, q]) => { const tem = estoque(k);
      return `<div class="bx ${tem >= q ? 'feito' : ''}"><div class="bx-ic" data-info="${k}">${iconeItem(item(k), 'e')}</div><b>${q} ${esc(item(k).nome)}</b><small class="${tem >= q ? 'tem' : 'falta'}">você tem ${fmtN(tem)}</small></div>`; }).join('')}</div>
      <div class="barco-premio">Custa ${moedaMini}<b>${fmtN(prox.moedas)}</b> · ganha ⭐ <b>${fmtN(prox.xp)} XP</b> <button class="btn ${ok ? 'verde' : ''}" data-acao="castelo-subir" ${ok ? '' : 'disabled'}>Construir</button></div>`;
    return h;
  }
  function subirCastelo() {
    const n = S.castelo || 0, prox = CASTELO[n]; if (!prox || !temItens(prox.itens) || S.moedas < prox.moedas) return;
    S.moedas -= prox.moedas; for (const k in prox.itens) mudarEstoque(k, -prox.itens[k]); S.castelo = n + 1;
    ganharXp(prox.xp); montarCastelo(); somT('nivel'); toast(`🏰 ${prox.nome} pronto! A mina e o bosque agora dão +${prox.bonus} por coleta`, 'ouro'); salvar(); tudo();
  }
  // 🌧️ chuva tropical: de vez em quando rega tudo e adianta 20% do que está crescendo
  let chuva3D = null;
  const chovendo = () => TROP && S.chuvaAte && Date.now() < S.chuvaAte;
  function tickChuva() {
    if (VISITA || !S.perfil || S.tut !== -1) return false;
    const ag = Date.now(); let mudou = false;
    if (!S.chuvaProx) S.chuvaProx = ag + rnd(3, 6) * 60000;
    if (ag >= S.chuvaProx && !chovendo()) {
      S.chuvaAte = ag + 90000; S.chuvaProx = ag + rnd(20, 40) * 60000; S.stats.chuvas = (S.stats.chuvas || 0) + 1;
      S.plots.forEach(p => { if (crescendo_(p)) p.t0 -= .2 * (p.dur - decorrido(p)); });
      toast('🌧️ Chuva tropical! Tudo regado e o que está crescendo adiantou 20%', 'bom'); somT('agua', 400); mudou = true;
    }
    if (chovendo()) S.plots.forEach((p, i) => { if (p.c && !p.reg && regar(i, true)) mudou = true; });
    return mudou;
  }
  function animarChuva(t, dt) {
    const on = chovendo();
    if (on && !chuva3D) { const n = 900, pos = new Float32Array(n * 6);
      for (let i = 0; i < n; i++) { const x = rnd(-24, 24), y = rnd(0, 20), z = rnd(-24, 24); pos.set([x, y, z, x - .05, y - .7, z], i * 6); }
      const gm = new THREE.BufferGeometry(); gm.setAttribute('position', new THREE.BufferAttribute(pos, 3));
      chuva3D = new THREE.LineSegments(gm, new THREE.LineBasicMaterial({color:C(0xd8f2ff), transparent:true, opacity:.55})); chuva3D.frustumCulled = false; scene.add(chuva3D); }
    if (!chuva3D) return;
    chuva3D.visible = on; const alvo = on ? 1 : 0; chuva3D.userData.k = (chuva3D.userData.k || 0) + (alvo - (chuva3D.userData.k || 0)) * Math.min(1, dt * 1.5);
    const k = chuva3D.userData.k; sol.intensity = 2.35 - k * 1.1; scene.background.copy(ceuBase).lerp(ceuChuva, k);
    if (!on) { if (k < .01) { scene.remove(chuva3D); chuva3D.geometry.dispose(); chuva3D = null; sol.intensity = 2.35; } return; }
    chuva3D.position.set(controls.target.x, 0, controls.target.z);
    const a = chuva3D.geometry.attributes.position, v = a.array;
    for (let i = 0; i < v.length; i += 6) { v[i + 1] -= dt * 26; v[i + 4] -= dt * 26; if (v[i + 4] < 0) { v[i + 1] += 20; v[i + 4] += 20; } }
    a.needsUpdate = true;
  }
  // 🏝️ lagoa com cachoeira no meio da ilha redonda e o vulcão no mar, lá atrás
  let cachoeiraTx = null; const fumacaVulcao = [], espumas = [];
  function montarCenarioTropical() {
    const g = new THREE.Group(), RL = (R_LAGOA - .65) * G; // a lagoa fica só nas células livres do meio (não invade casinhas)
    const fundo = mesh(new THREE.CylinderGeometry(RL + .3, RL + .3, .12, 40), 0, 0, .02, 0, false, liso(0xe8d9a8)); g.add(fundo);
    const agua = mesh(new THREE.CylinderGeometry(RL - .1, RL - .1, .14, 40), 0, 0, .06, 0, false, new THREE.MeshStandardMaterial({color:C(0x1aa6d6), roughness:.35, metalness:0, envMapIntensity:.2})); g.add(agua);
    for (let i = 0; i < 16; i++) { const a = i / 16 * Math.PI * 2, pd = pedra(rnd(.55, .8)); pd.position.set(Math.cos(a) * (RL + .05), -.05, Math.sin(a) * (RL + .05)); pd.rotation.y = rnd(0, 6); g.add(pd); }
    for (let i = 0; i < 4; i++) { const a = rnd(0, 6.28), r = rnd(RL * .55, RL - .5); const v = mesh(new THREE.CylinderGeometry(.32, .32, .03, 10), 0, Math.cos(a) * r, .15, Math.sin(a) * r, false, liso(0x4caf3a)); g.add(v);
      if (i % 2) g.add(bola(.09, 0xff8ac0, Math.cos(a) * r, .2, Math.sin(a) * r, 8)); }
    // vulcãozinho no meio da lagoa: a cachoeira desce pela encosta e sai fumaça lá de cima
    const roc = new THREE.Group(); roc.position.set(0, 0, -RL * .2); roc.scale.setScalar(.62); g.add(roc);
    roc.add(mesh(new THREE.CylinderGeometry(.55, 2.1, 3.0, 12, 1), 0, 0, 1.5, 0, true, liso(0x7a5a48)));
    roc.add(mesh(new THREE.CylinderGeometry(1.6, 2.4, .7, 12, 1), 0, 0, .35, 0, true, liso(0x5f8a3a)));
    roc.add(mesh(new THREE.CylinderGeometry(.45, .45, .12, 12), 0, 0, 3.0, 0, false, new THREE.MeshStandardMaterial({color:C(0xff7a1a), emissive:C(0xff4a00), emissiveIntensity:1})));
    [[1.2, .9, .9], [-1.3, .7, .6], [.4, .8, -1.3], [-.5, .6, 1.5]].forEach(([x, sc, z]) => { const pd = pedra(sc * 1.4); pd.position.set(x, 0, z); roc.add(pd); });
    for (let i = 0; i < 3; i++) { const lv = mesh(new THREE.BoxGeometry(.16, 1.1, .06), 0, 0, 0, 0, false, new THREE.MeshStandardMaterial({color:C(0xff6a1a), emissive:C(0xff3a00), emissiveIntensity:.8})); const a = 2.4 + i * .9;
      lv.position.set(Math.cos(a) * .85, 2.45, Math.sin(a) * .85); lv.rotation.y = -a; lv.rotation.z = .5; roc.add(lv); }
    for (let i = 0; i < 5; i++) { const f = bola(.3, 0xd8d8d8, 0, 3.2, 0, 8); f.material = new THREE.MeshStandardMaterial({color:C(0xe0e0e0), transparent:true, opacity:.6}); f.castShadow = false; f.userData.f = i / 5; roc.add(f); fumacaVulcao.push(f); }
    const pm = palmeira(.6); pm.position.set(1.4, .5, .4); roc.add(pm);
    { const cv = document.createElement('canvas'); cv.width = 64; cv.height = 256; const c2 = cv.getContext('2d');
      c2.fillStyle = 'rgba(160,235,255,.85)'; c2.fillRect(0, 0, 64, 256);
      for (let i = 0; i < 40; i++) { c2.fillStyle = `rgba(255,255,255,${rnd(.4, .9)})`; c2.fillRect(rnd(0, 60), rnd(0, 256), rnd(2, 5), rnd(20, 60)); }
      cachoeiraTx = new THREE.CanvasTexture(cv); cachoeiraTx.wrapS = cachoeiraTx.wrapT = THREE.RepeatWrapping;
      const q = new THREE.Mesh(new THREE.PlaneGeometry(.7, 2.0), new THREE.MeshBasicMaterial({map:cachoeiraTx, transparent:true, opacity:.9, side:THREE.DoubleSide, depthWrite:false}));
      q.position.set(.35, 1.15, 1.35); q.rotation.x = -.45; q.rotation.y = .25; roc.add(q); }
    for (let i = 0; i < 5; i++) { const b = bola(.2, 0xffffff, .45 + rnd(-.4, .4), .15, 1.9 + rnd(0, .4), 8); b.material = new THREE.MeshStandardMaterial({color:C(0xffffff), transparent:true, opacity:.8}); roc.add(b); espumas.push(b); }
    scene.add(g);
  }
  function animarTropical(t, dt) {
    if (!TROP) return;
    if (cachoeiraTx) cachoeiraTx.offset.y = (cachoeiraTx.offset.y + dt * 1.4) % 1;
    espumas.forEach((b, i) => b.scale.setScalar(.8 + Math.sin(t * 5 + i) * .25));
    fumacaVulcao.forEach(f => { const k = (f.userData.f + t * .12) % 1; f.position.set(Math.sin(k * 6) * .3 + k * .8, 3.2 + k * 3.2, k * .4); f.scale.setScalar(.6 + k * 2.2); f.material.opacity = .65 * (1 - k); });
    animarChuva(t, dt);
  }
  const terras = {}; // decoração + placa das terras bloqueadas
  const clicaveisTerra = [];
  // a decoração de TODAS as terras bloqueadas vira um grupo só (poucas peças para o celular desenhar);
  // cada terra guarda só a placa de nível e a caixa invisível de toque. Sorteio fixo por terra: as árvores não mudam de lugar.
  let decorTerras = null;
  const sorteio = semente => { let a = semente >>> 0; return () => { a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; };
  function montarDecorTerras() {
    if (decorTerras) { liberarIlha(decorTerras); decorTerras = null; }
    const g = new THREE.Group(), mr = Math.random;
    try {
      for (const z of ZONAS) {
        if (S.zonas.includes(z.key)) continue;
        Math.random = sorteio((z.zx + 50) * 997 + (z.zz + 50) * 131);
        const qtd = glb.ok ? 0 : 6 + (Math.random() * 3 | 0), usadas = new Set(); // com o KayKit, a mata vem do espalharNatureza
        for (let i = 0; i < qtd; i++) {
          const [cx, cz] = z.cel[Math.random() * z.cel.length | 0]; const k = cx + ',' + cz; if (usadas.has(k)) continue; usadas.add(k);
          const r = Math.random(), o = r < .45 ? arvore(rnd(.8, 1.15), Math.random() < .15 ? 0xf5a623 : null) : r < .6 ? pinheiro(rnd(.9, 1.2)) : r < .75 ? pedra(rnd(1, 1.6)) : r < .88 ? tora(rnd(.8, 1.1)) : arbusto(rnd(.9, 1.3));
          o.position.set(cx * G + rnd(-.4, .4), 0, cz * G + rnd(-.4, .4)); g.add(o);
        }
        for (let i = 0; i < (glb.ok ? 0 : 6); i++) { const [cx, cz] = z.cel[Math.random() * z.cel.length | 0]; const b = arbusto(rnd(.6, .9)); b.position.set(cx * G + rnd(-.8, .8), 0, cz * G + rnd(-.8, .8)); g.add(b); }
        const mx = z.cel.reduce((a, c) => a + c[0], 0) / z.cel.length * G, mz = z.cel.reduce((a, c) => a + c[1], 0) / z.cel.length * G;
        const placa = new THREE.Group(); // placa de madeira
        placa.add(cil(.07, .08, 1.3, 0x7a4b25, 0, .65, 0, 6));
        placa.add(mesh(new THREE.BoxGeometry(1.2, .7, .08), 0, 0, 1.2, .05, true, liso(0xb07a46)));
        placa.add(bola(.16, 0xf2c230, 0, 1.2, .14, 10));
        placa.position.set(mx, 0, mz); g.add(placa);
      }
    } finally { Math.random = mr; }
    mesclar(g); scene.add(g); congelar(g); decorTerras = g;
    if (renderer.shadowMap) renderer.shadowMap.needsUpdate = true;
  }
  function mesclarAnimado(g) { // junta as peças paradas de cada parte que se mexe (corpo, cabeça, rabo, pernas…)
    const A = new Set(); Object.values(g.userData).forEach(v => [].concat(v).forEach(x => { if (x && x.isObject3D) A.add(x); }));
    [g, ...A].forEach(X => { if (!X.isMesh) mesclar(X, new Set([...A].filter(y => y !== X))); });
  }
  function montarTerras() {
    for (const z of ZONAS) {
      if (S.zonas.includes(z.key)) continue;
      const g = new THREE.Group();
      const mx = z.cel.reduce((a, c) => a + c[0], 0) / z.cel.length * G, mz = z.cel.reduce((a, c) => a + c[1], 0) / z.cel.length * G;
      const r = rotulo(`🔒 Nível ${nivelZona()}`, '#6b4a2b'); r.position.set(mx, 2.3, mz); r.scale.multiplyScalar(.62); g.add(r);
      g.userData.rotulo = r; r.visible = false;
      if (TROP || MED) { const mt = new THREE.MeshBasicMaterial({visible:false}), bg = new THREE.BoxGeometry(G, .6, G); // fatia: uma caixinha de toque por célula
        z.cel.forEach(([cx, cz]) => { const cb = new THREE.Mesh(bg, mt); cb.position.set(cx * G, .3, cz * G); cb.userData.zona = z.key; g.add(cb); clicaveisTerra.push(cb); }); }
      else { const caixa = new THREE.Mesh(new THREE.BoxGeometry(ZONA * G, .6, ZONA * G), new THREE.MeshBasicMaterial({visible:false})); // só para o toque: não é desenhada
      caixa.position.set((z.zx * ZONA - 12 + 2) * G, .3, (z.zz * ZONA - 12 + 2) * G); caixa.userData.zona = z.key; g.add(caixa); clicaveisTerra.push(caixa); }
      scene.add(g); terras[z.key] = g; congelar(g);
    }
    montarDecorTerras();
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
  // terra + 3 sulcos numa peça só (cor dos sulcos pelas cores dos vértices): 1 desenho por canteiro em vez de 4
  const geoCanteiro = (() => {
    const partes = [[geoTile, 0, .1, 0, [1, 1, 1]], ...[-1, 0, 1].map(s => [geoSulco, 0, .27, s * .56, [0x7c / 0xa0, 0x4b / 0x66, 0x2c / 0x40]])];
    const pos = [], nor = [], cor = [];
    partes.forEach(([g0, x, y, z, c]) => { const g = g0.index ? g0.toNonIndexed() : g0, P = g.attributes.position, N = g.attributes.normal;
      for (let i = 0; i < P.count; i++) { pos.push(P.getX(i) + x, P.getY(i) + y, P.getZ(i) + z); nor.push(N.getX(i), N.getY(i), N.getZ(i)); cor.push(...c); } });
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3)); g.setAttribute('color', new THREE.Float32BufferAttribute(cor, 3)); return g;
  })();

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
      const base = new THREE.Mesh(geoCanteiro, new THREE.MeshStandardMaterial({color:C(COR_TERRA), vertexColors:true, roughness:.95, envMapIntensity:.3}));
      base.receiveShadow = true; base.userData.i = i; t.add(base); const sulcos = null;
      const planta = new THREE.Group(); planta.position.y = .25; t.add(planta);
      const icone = sprite('✨', .9); icone.position.y = 1.9; icone.visible = false; t.add(icone);
      const marca = new THREE.Mesh(new THREE.RingGeometry(.62, .78, 28).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({color:0xffe066, transparent:true, opacity:.85, depthWrite:false}));
      marca.position.y = .3; marca.visible = false; t.add(marca);
      tiles[i] = {g:t, base, sulcos, planta, icone, marca, chave:'', pop:0};
    }
    mesclar(g, new Set(g.children.filter(c => c.isGroup))); // moldura de madeira numa peça só
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
    else if (o.tipo === 'galpao') g = modeloGalpao();
    else if (T.fruta) g = modeloArvoreFruta(o);
    else if (o.tipo === 'casinhaPet') g = modeloCasinhaPet();
    else if (T.decor) g = modeloDecor(o.tipo);
    else g = modeloCercado(o.tipo, T.w, T.d);
    g.userData.oidRaiz = o.id;
    { const ex = ENFEITES[o.tipo]; if (ex) ex.forEach(([k, x, z, ry, s]) => g.add(modeloGLB(k, x, z, ry, s))); } // enfeites dos packs em volta da construção
    if (o.tipo !== 'lote' && o.tipo !== 'lago') { const anim = new Set(); g.traverse(x => { if (fumacas.includes(x) || pasMoinho.includes(x) || fabRodas.includes(x) || x.userData.anim) anim.add(x); }); mesclar(g, anim); }
    let rot = null;
    if (T.fab) g.traverse(x => { if (fumacas.includes(x) || fabRodas.includes(x)) x.userData.tipo = o.tipo; if (pasMoinho.includes(x)) x.userData.oid = o.id; });
    if (T.abre || T.animal || T.fab) { rot = rotulo(T.nome); rot.position.set(0, T.animal ? 2.4 : o.tipo === 'celeiro' ? 5.4 : o.tipo === 'armazem' ? 4.6 : o.tipo === 'moinho' ? 6.4 : o.tipo === 'galpao' ? 3.3 : 4.3, T.animal ? -T.d * G / 2 + .3 : 0); rot.visible = false; g.add(rot); }
    const ph = o.tipo === 'lote' ? .5 : T.animal ? 1.6 : T.decor ? 1.6 : 4;
    const pick = new THREE.Mesh(new THREE.BoxGeometry(T.w * G - .1, ph, T.d * G - .1), new THREE.MeshBasicMaterial({visible:false})); // só para o toque: não é desenhada
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
  function montarObjetos() {
    // compra que ficou sem ✓ (app fechou no meio): desfaz, sem cobrar
    S.objetos.filter(o => o.pend).forEach(o => { S.objetos.splice(S.objetos.indexOf(o), 1); if (o.tipo === 'lote' && !o.doBau && o.li * 4 + 4 === S.plots.length) S.plots.splice(o.li * 4, 4); });
    S.objetos.forEach(criarObjeto3D);
  }
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
    tonho = criarPersonagem(null, true); soBlob(tonho, .5); scene.add(tonho);
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

  function criarBufalo() { // 🐃 búfalo: grandão, cinza-escuro, chifres largos e curvados
    const g = new THREE.Group(), corpo = new THREE.Group(); g.add(corpo);
    const pele = 0x4a4a52, esc = 0x2a2a30, chifre = 0xd9cfb8;
    const tronco = bola(.6, pele, 0, .85, 0, 18); tronco.scale.set(1.05, .85, 1.4); corpo.add(tronco);
    const pernas = [[-.32, .45], [.32, .45], [-.32, -.45], [.32, -.45]].map(([x, z]) => { const pp = perna(pele, .48, .12, x, .55, z, esc); corpo.add(pp); return pp; });
    const cab = new THREE.Group(); cab.position.set(0, 1.2, .82); corpo.add(cab);
    const ca = bola(.38, pele, 0, 0, 0, 16); ca.scale.set(1, .9, 1.1); cab.add(ca);
    const fu = bola(.22, 0x6a6a74, 0, -.16, .3, 12); fu.scale.set(1.2, .8, .8); cab.add(fu);
    [-1, 1].forEach(sd => cab.add(bola(.035, 0x1a1a1a, sd * .08, -.14, .48, 6)));
    olhos(cab, .09, .3, .15, .07);
    [-1, 1].forEach(sd => { const ch = mesh(new THREE.TorusGeometry(.32, .06, 6, 12, Math.PI * .8), 0, sd * .3, .22, -.05, true, liso(chifre)); ch.rotation.set(0, sd > 0 ? 0 : Math.PI, -.3); cab.add(ch);
      const o = bola(.1, pele, sd * .4, .05, -.08, 8); o.scale.set(1.5, .55, .8); cab.add(o); });
    const cauda = new THREE.Group(); cauda.position.set(0, 1.05, -.8); corpo.add(cauda);
    cauda.add(mesh(new THREE.CylinderGeometry(.025, .025, .5, 6), 0, 0, -.25, 0, true, liso(pele)));
    cauda.add(bola(.07, esc, 0, -.52, 0, 6));
    g.add(sombraBlob(.9)); g.scale.setScalar(.95);
    g.userData = {corpo, pernas, cauda, cab, fase:0, vel:.85};
    return g;
  }
  function criarCabra() { // 🐐 parecida com a ovelha, mas magrinha, com chifres e barbicha
    const g = new THREE.Group(), corpo = new THREE.Group(); g.add(corpo);
    const pelo = Math.random() < .5 ? 0xf3ece0 : 0xc89a6a, esc = 0x5a4130, chifre = 0xd8cbb0;
    const b = bola(.34, pelo, 0, .78, 0, 14); b.scale.set(.8, .78, 1.35); corpo.add(b);
    const pernas = [[-.16, .26], [.16, .26], [-.16, -.26], [.16, -.26]].map(([x, z]) => { const pp = perna(esc, .5, .05, x, .52, z); corpo.add(pp); return pp; });
    const cab = new THREE.Group(); cab.position.set(0, 1.08, .48); corpo.add(cab);
    const ca = bola(.18, pelo, 0, 0, .06, 12); ca.scale.set(.8, .9, 1.25); cab.add(ca);
    [-1, 1].forEach(sd => { const c = mesh(new THREE.ConeGeometry(.05, .3, 6), 0, sd * .09, .2, -.04, true, liso(chifre)); c.rotation.set(-.55, 0, sd * -.25); cab.add(c);
      const o = bola(.06, pelo, sd * .17, .04, -.02, 8); o.scale.set(1.7, .55, .8); cab.add(o); });
    const barba = mesh(new THREE.ConeGeometry(.05, .16, 6), 0, 0, -.2, .2, true, liso(esc)); barba.rotation.x = Math.PI; cab.add(barba);
    olhos(cab, .035, .18, .06, .05);
    const cauda = new THREE.Group(); cauda.position.set(0, .95, -.5); corpo.add(cauda);
    const cc = mesh(new THREE.ConeGeometry(.05, .18, 6), 0, 0, .06, 0, true, liso(pelo)); cc.rotation.x = -.6; cauda.add(cc);
    g.add(sombraBlob(.55));
    g.userData = {corpo, pernas, cauda, cab, fase:0, vel:1};
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

  // personagens que andam: só a sombrinha redonda (a sombra de verdade é calculada poucas vezes, só para o que fica parado)
  function soBlob(g, r) { mesclarAnimado(g); let tem = false; g.traverse(m => { m.castShadow = false; if (m.material === matSombra) tem = true; }); if (!tem) g.add(sombraBlob(r)); }
  const heroi = {g:null, rota:[], acao:null, pulo:0, fila:[], atual:null};
  const pets = {};
  function montarPersonagens() {
    heroi.g = criarFazendeiro(); soBlob(heroi.g, .5); heroi.g.position.set(0, 0, 2 * G); heroi.g.rotation.y = Math.PI; scene.add(heroi.g);
    atualizarPets3D(); atualizarAnimais3D();
  }
  function atualizarPets3D() {
    for (const k in PETS) {
      if (S.amigos[k] && !pets[k]) {
        const g = ({cachorro:criarCachorro, raposa:criarRaposa, gato:criarGato, papagaio:criarPapagaio}[k])();
        soBlob(g, .4); g.position.copy(heroi.g.position).add(V3(rnd(-1.5, 1.5), 0, rnd(.5, 1.5))); scene.add(g);
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
      if (Math.random() < .55 || livreCeleiro() < 1) { const m = 5 + (Math.random() * 5 * S.nivel | 0); S.moedas += m; flutuar(p.g.position.clone().add(V3(0, 1.4, 0)), `+${m} 🪙`); }
      else { const c = cs[Math.random() * cs.length | 0]; S.celeiro[c.id] = (S.celeiro[c.id] || 0) + 1; flutuar(p.g.position.clone().add(V3(0, 1.4, 0)), `+1 ${c.emoji}`); }
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
  const rebanho = {galinha:[], vaca:[], ovelha:[], coelho:[], pato:[], porco:[], abelha:[], cabra:[], bufalo:[]};
  function cercadoDoAnimal(k, j) { const cs = cercadosDe(k); return cs[Math.min(cs.length - 1, Math.floor(j / ANIMAIS[k].porCercado))]; }
  function pontoNoCercado(o) { const L = limites(o); return V3(L.x + rnd(-L.hw, L.hw), 0, L.z + rnd(-L.hd, L.hd)); }
  function atualizarAnimais3D(reposicionar) {
    for (const k in ANIMAIS) {
      const lista = rebanho[k];
      while (lista.length < qtdAnimal(k)) {
        const g = ({galinha:criarGalinha, vaca:criarVaca, coelho:criarCoelho, ovelha:criarOvelha, pato:criarPato, porco:criarPorco, abelha:criarAbelha, cabra:criarCabra, bufalo:criarBufalo}[k] || criarGalinha)();
        const o = cercadoDoAnimal(k, lista.length); if (!o) break;
        mesclarAnimado(g); g.traverse(m => { m.castShadow = false; }); g.position.copy(pontoNoCercado(o)); g.rotation.y = rnd(0, 6); scene.add(g);
        lista.push({g, alvo:g.position.clone(), espera:rnd(0, 3), est:'anda', est3d:'anda', estatua:null});
      }
      while (lista.length > qtdAnimal(k)) { const a = lista.pop(); tirarEstatua(a); scene.remove(a.g); }
      if (reposicionar) lista.forEach((a, j) => { const o = cercadoDoAnimal(k, j); if (o) { tirarEstatua(a); a.g.position.copy(pontoNoCercado(o)); a.alvo.copy(a.g.position); } });
    }
  }

  // ---- bicho parado: quando o produto está pronto ou está com fome ele para, faz uma pose e vira uma peça só (bem mais leve) ----
  function estadoAnimal(k, j) { const x = aniLista(k)[j]; if (!x || k === 'abelha') return 'anda'; return x.prontos > 0 ? 'pronto' : x.rest <= 0 ? 'fome' : 'anda'; }
  function propPronto(k) { // o produto aparece junto do bicho
    const g = new THREE.Group();
    if (k === 'galinha' || k === 'pato') { const ovo = bola(.12, k === 'pato' ? 0xeef3e2 : 0xfff6e6, .42, .12, .15, 10); ovo.scale.y = 1.25; g.add(ovo); if (k === 'pato') { const pena = bola(.09, 0xfafafa, -.3, .04, .15, 8); pena.scale.set(.5, .25, 1.6); g.add(pena); } }
    else if (k === 'vaca') { const ub = bola(.22, 0xf7a6a6, 0, .52, -.15, 12); ub.scale.set(1.1, .8, 1); g.add(ub); [[-.08, -.08], [.08, -.08], [-.08, -.22], [.08, -.22]].forEach(([x, z]) => g.add(cil(.035, .03, .16, 0xf08f8f, x, .38, z, 6))); }
    else if (k === 'porco') { const ba = new THREE.Group(); ba.position.set(.85, 0, .35); ba.rotation.y = .5; g.add(ba); // 2 fatias de bacon
      [0, 1].forEach(i => { ba.add(mesh(new THREE.BoxGeometry(.6, .07, .2), 0, 0, .05 + i * .08, i * .05, false, liso(i ? 0xc8574f : 0xd8705f))); [-.18, .02, .2].forEach(x => ba.add(mesh(new THREE.BoxGeometry(.07, .074, .205), 0, x, .05 + i * .08, i * .05, false, liso(0xfbe3d6)))); }); }
    return g;
  }
  function posarAnimal(a, k, est) {
    const g = a.g, u = g.userData;
    u.corpo.position.y = 0; u.corpo.scale.set(1, 1, 1); u.cab.rotation.set(0, 0, 0); u.pernas.forEach(p => { p.rotation.set(0, 0, 0); p.visible = true; });
    if (u.prop) { if (u.prop.parent) u.prop.parent.remove(u.prop); u.prop = null; }
    if (est === 'anda') return;
    const perna = u.pernas[0] ? u.pernas[0].position.y : .2, deita = est === 'fome' || ['galinha', 'pato', 'coelho', 'porco'].includes(k);
    if (deita) { u.corpo.position.y = -perna * .92; u.pernas.forEach(p => p.visible = false); }
    if (est === 'fome') { u.cab.rotation.x = .55; u.corpo.position.y -= .03; }
    else {
      u.cab.rotation.x = -.15;
      if (k === 'ovelha') u.corpo.scale.set(1.18, 1.12, 1.15); // lã bem fofa
      if (k === 'coelho') u.corpo.scale.set(1.15, 1.1, 1.15);
      u.prop = propPronto(k); (k === 'vaca' ? u.corpo : g).add(u.prop);
    }
  }
  function tirarEstatua(a) { if (a.estatua) { scene.remove(a.estatua); (a.estatua.userData.geos || []).forEach(g => g.dispose()); a.estatua = null; } a.g.visible = true; }
  function fazerEstatua(a, k, est) {
    tirarEstatua(a); posarAnimal(a, k, est); a.est3d = est;
    if (est === 'anda') { a.g.visible = true; return; }
    const e = a.g.clone(true), orig = new Set(); e.userData = {}; e.visible = true;
    a.g.traverse(m => { if (m.geometry) orig.add(m.geometry); });
    const escondidos = []; e.traverse(m => { if (m !== e && !m.visible) escondidos.push(m); }); escondidos.forEach(m => m.parent && m.parent.remove(m));
    e.traverse(m => { m.castShadow = false; }); mesclar(e); const geos = []; e.traverse(m => { if (m.geometry && !orig.has(m.geometry)) geos.push(m.geometry); }); e.userData.geos = geos; congelar(e);
    scene.add(e); a.estatua = e; a.g.visible = false;
  }
  let estatuasNoQuadro = 0;

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
      const agacha = ac.tipo === 'passeio' ? ac.sub === 'agacha' && !anda : ac.tipo !== 'regar' && !anda;
      u.corpo.position.y = agacha ? -.2 : u.corpo.position.y; u.corpo.rotation.x = agacha ? .35 : 0;
      if (ac.tipo === 'regar') { u.bD.rotation.x = -1.2 + Math.sin(t * 6) * .12; u.regador.rotation.x = .7; }
      else if (ac.tipo === 'plantar') { u.bD.rotation.x = -.9 + Math.sin(t * 12) * .35; u.bE.rotation.x = -.5; }
      else if (ac.tipo === 'passeio') { if (ac.sub === 'agacha') { u.bD.rotation.x = -.8 + Math.sin(t * 4) * .25; u.bE.rotation.x = -.3; } else { u.bD.rotation.x = -.25; u.bE.rotation.x = -.25; u.corpo.rotation.y = Math.sin(t * 1.6) * .25; } }
      else { u.bD.rotation.x = -1.3 + Math.abs(Math.sin(t * 10)) * .9; u.bE.rotation.x = -1.3 + Math.abs(Math.cos(t * 10)) * .9; }
      if (ac.t <= 0) { heroi.acao = null; u.saco.visible = u.regador.visible = false; u.corpo.rotation.x = 0; u.corpo.rotation.y = 0; }
    }
    if (heroi.pulo > 0) { heroi.pulo = Math.max(0, heroi.pulo - dt * 3); u.corpo.position.y += Math.sin(heroi.pulo * Math.PI) * .3; }

    for (const k in pets) {
      const p = pets[k], g = p.g, gu = g.userData, voa = k === 'raposa' || k === 'papagaio';
      let mov = false;
      const chamado = apitoAte > Date.now();
      if (petsComFome() && !S.seguir && !chamado) { p.modo = 'dormir'; p.timer = 5; }
      else if (S.seguir || chamado) {
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

    estatuasNoQuadro = 0;
    for (const k in rebanho) {
      rebanho[k].forEach((a, j) => {
        const g = a.g, gu = g.userData;
        const est = estadoAnimal(k, j);
        if (est !== a.est3d && estatuasNoQuadro < 4) { estatuasNoQuadro++; fazerEstatua(a, k, est); } // muda a pose (poucos por quadro)
        if (a.est3d !== 'anda') return; // parado: nada para animar
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
      } else if (id === 'mandioca') {
        for (let k = 0; k < 3; k++) { const h = rnd(.8, 1.05), x = rnd(-.12, .12), z = rnd(-.12, .12); p.add(cil(.025, .03, h, 0x9a5b3a, x, h / 2, z, 5));
          for (let j = 0; j < 5; j++) { const f = mesh(new THREE.BoxGeometry(.32, .02, .07), 0, x, h, z, true, liso(0x3f9a3a)); f.rotation.set(.3, j * 1.25 + k, .5); f.translateX(.15); p.add(f); } }
        for (let k = 0; k < 2; k++) { const r = cil(.05, .02, .3, 0xb07a4a, Math.cos(k * 3) * .12, .05, Math.sin(k * 3) * .12, 6); r.rotation.z = 1.3; p.add(r); }
      } else if (id === 'batataDoce') {
        for (let k = 0; k < 5; k++) { const f = blob(.15, 0x6a9e3a, Math.cos(k * 1.25) * .16, .16, Math.sin(k * 1.25) * .16); f.scale.y = .6; p.add(f); }
        for (let k = 0; k < 2; k++) { const b = bola(.13, 0xc2456a, Math.cos(k * 3.1) * .22, .08, Math.sin(k * 3.1) * .22, 8); b.scale.set(1.5, .8, .9); p.add(b); }
      } else if (id === 'abacaxi') {
        const a = bola(.22, 0xe0a22a, 0, .3, 0, 10); a.scale.set(.85, 1.3, .85); p.add(a);
        for (let k = 0; k < 5; k++) { const f = folha(0x3f9a3a, .45, .06); f.position.y = .55; f.rotation.set(rnd(-.4, .4), k * 1.25, rnd(-.4, .4)); p.add(f); }
      } else if (id === 'maracuja') {
        p.add(cil(.03, .03, 1.2, 0x8b5a2b, 0, .6, 0, 5)); p.add(blob(.3, 0x3f9a3a, 0, .95, 0));
        for (let k = 0; k < 3; k++) p.add(bola(.12, 0xf2c230, Math.cos(k * 2.1) * .22, .65 + k * .08, Math.sin(k * 2.1) * .22, 10));
        p.add(bola(.08, 0xb07ae0, .1, 1.2, .18, 8));
      } else if (id === 'gengibre') {
        for (let k = 0; k < 4; k++) { const h = rnd(.5, .75); const c = cil(.025, .03, h, 0x6cbf4a, rnd(-.12, .12), h / 2, rnd(-.12, .12), 5); c.rotation.z = rnd(-.25, .25); p.add(c); }
        for (let k = 0; k < 3; k++) { const r = bola(.1, 0xd9b26a, Math.cos(k * 2) * .14, .06, Math.sin(k * 2) * .14, 7); r.scale.set(1.6, .7, 1); p.add(r); }
      } else if (id === 'pimenta') {
        p.add(blob(.28, 0x2f8a34, 0, .4, 0));
        for (let k = 0; k < 5; k++) { const c = mesh(new THREE.ConeGeometry(.045, .22, 6), 0, Math.cos(k * 1.25) * .22, .32 + (k % 2) * .12, Math.sin(k * 1.25) * .22, true, liso(k % 3 ? 0xe2252a : 0xff8a1a)); c.rotation.x = Math.PI; p.add(c); }
      } else if (id === 'baunilha') {
        p.add(cil(.03, .035, 1.3, 0x4f8a3a, 0, .65, 0, 5));
        for (let k = 0; k < 4; k++) { const f = mesh(new THREE.BoxGeometry(.26, .02, .1), 0, 0, .4 + k * .25, 0, true, liso(0x3f9a3a)); f.rotation.y = k * 1.6; f.translateX(.13); p.add(f); }
        for (let k = 0; k < 3; k++) p.add(bola(.09, 0xfff1b0, Math.cos(k * 2.1) * .14, 1.15 + k * .06, Math.sin(k * 2.1) * .14, 8));
        for (let k = 0; k < 3; k++) { const v = cil(.015, .015, .35, 0x3a2414, Math.cos(k * 2.1 + 1) * .12, .8, Math.sin(k * 2.1 + 1) * .12, 4); p.add(v); }
      } else if (id === 'orquidea') {
        p.add(cil(.025, .03, .9, 0x4f8a3a, 0, .45, 0, 5)); for (let k = 0; k < 3; k++) { const f = folha(0x3f9a3a, .35, .08); f.rotation.set(0, k * 2.1, 1.1); p.add(f); }
        for (let k = 0; k < 3; k++) { const fl = new THREE.Group(); fl.position.set(Math.cos(k * 2.1) * .13, .78 + k * .07, Math.sin(k * 2.1) * .13); p.add(fl);
          for (let j = 0; j < 5; j++) { const pt = bola(.07, 0xffc21a, Math.cos(j * 1.25) * .07, 0, Math.sin(j * 1.25) * .07, 6); pt.scale.set(1.3, .4, 1.3); fl.add(pt); } fl.add(bola(.04, 0xff6a3a, 0, .02, 0, 6)); }
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
      { const pl = est === 2 ? maduro(p.c) : est === 1 ? crescendo(p.c) : broto(); pl.traverse(m => { m.castShadow = false; }); mesclar(pl); t.planta.add(pl); } // planta em poucas peças
      if (!p.reg) { t.icone.material.map = emojiTex('💧'); t.icone.visible = true; t.icone.scale.setScalar(.85); }
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
    if ((S.celeiro[id] || 0) <= 0) { toast(`Sem ${c.nome.toLowerCase()} no celeiro. Colha ou compre na Loja`); return false; }
    S.celeiro[id]--; S.plots[i] = {c:id, reg:false}; S.stats.plantou[id] = (S.stats.plantou[id] || 0) + 1;
    if (S.upg.aspersor) regar(i, true);
    chuva(i, 0x8a5a2b, .07); somT('plantar');
    return true;
  }
  function regar(i, silencioso) {
    const p = S.plots[i];
    if (!p || !p.c || p.reg) return false;
    p.reg = true; p.t0 = Date.now(); p.dur = S.tut >= 0 && S.tut <= 5 ? 4000 : crop(p.c).tempo * 1000 * velocidade(); // no tutorial a 1ª planta cresce rapidinho
    if (!silencioso) { chuva(i, 0x6cc3ee, .08); somT('agua', 120); }
    return true;
  }
  function colher(i, auto) {
    const p = S.plots[i], c = crop(p.c);
    if (livreCeleiro() < 1) { avisarCheio('celeiro'); return false; }
    const q = Math.min(livreCeleiro(), 2 * (Math.random() < 0.12 * (S.upg.adubo || 0) + 0.05 * (S.upg.maos || 0) ? 2 : 1) * (p.dobro ? 2 : 1));
    S.celeiro[c.id] = (S.celeiro[c.id] || 0) + q; S.colhidos += q; S.stats.colheu[c.id] = (S.stats.colheu[c.id] || 0) + q;
    S.plots[i] = {c:null};
    flutuar(posTile(i).add(V3(0, 1.2, 0)), `+${q} ${c.emoji}  +${fmtN(c.xp * q)} XP${q > 2 ? ' 🎉' : ''}`); acharMaterial(posTile(i), .045); acharInsumo(posTile(i), .02); if (TROP) acharRaro(posTile(i), .025);
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
  function sortearRaro(semente) { const r = Math.random(); return semente && r < .14 ? 'orquidea' : r < .62 ? 'concha' : r < .9 ? 'perola' : 'cristal'; }
  function acharRaro(pos, chance) { // ✨ só na Ilha Tropical: concha, pérola, cristal do vulcão ou uma semente de orquídea dourada
    if (Math.random() > chance) return; const k = sortearRaro(true); S.celeiro[k] = (S.celeiro[k] || 0) + 1; S.stats.raros = (S.stats.raros || 0) + 1;
    setTimeout(() => { somT('achou'); if (pos) flutuar(pos.clone().add(V3(0, 2.6, 0)), `✨ +1 ${item(k).emoji}`); toast(`✨ Achado raro: ${k === 'orquidea' ? 'semente de orquídea dourada' : item(k).nome}!`, 'ouro'); }, 900);
  }
  function acharMaterial(pos, chance) { // de vez em quando cai um material de ampliação
    if (Math.random() > chance) return;
    const ilha = S.nivel >= 14 && Math.random() < .18, lista = ilha ? matsDe('ilha') : [...matsDe('armazem'), ...matsDe('celeiro')], m = lista[Math.random() * lista.length | 0];
    if (!S.mat) S.mat = {}; S.mat[m] = (S.mat[m] || 0) + 1;
    setTimeout(() => { somT('achou'); if (pos) flutuar(pos.clone().add(V3(0, 2.2, 0)), `🎁 +1 ${MATERIAIS[m].nome}`); toast(`🎁 Achou: ${MATERIAIS[m].nome}!`, 'bom'); }, 450);
  }
  // prêmios de nível (v0.51): funciona para qualquer nível, sem limite
  const MAT_NIVEL = ['parafuso', 'prego', 'tabua', 'tijolo', 'fita', 'tinta'], MAT_ILHA = ['escritura', 'marreta', 'estaca'];
  function premiosNivel(n) {
    const out = [], mo = Math.round(n * 50 / 10) * 10, m = MAT_NIVEL[n % MAT_NIVEL.length];
    S.moedas += mo; out.push([UI('moeda', 'nv-img'), `${fmtN(mo)} moedas`]);
    mudarEstoque(m, 1); out.push([matIco(m), `1 ${MATERIAIS[m].nome.toLowerCase()}`]);
    if (n % 5 === 0) { // a cada 5 níveis: baú
      const bm = Math.round(n * 100 / 10) * 10, ins = n % 10 === 0 ? 'super' : 'rapido', mi = MAT_ILHA[(n / 5) % 3];
      S.moedas += bm; if (!S.ins) S.ins = {}; S.ins[ins] = (S.ins[ins] || 0) + 2; mudarEstoque(mi, 1);
      out.push([UI('bau', 'nv-img'), `Baú: ${fmtN(bm)} moedas, 2 ${INSUMOS[ins].nome.toLowerCase()} e 1 ${MATERIAIS[mi].nome.toLowerCase()}`]); }
    return out;
  }
  function ganharXp(x) {
    S.xp += x; if (!VISITA) popGanho('xp', x);
    let subiu = false, novos = [], premios = [];
    while (S.xp >= xpProx(S.nivel)) {
      S.xp -= xpProx(S.nivel); S.nivel++; subiu = true; premios = premiosNivel(S.nivel);
      novos = [...CROPS.filter(c => c.nivel === S.nivel).map(c => [ITEM_IMG[c.id] ? UI(ITEM_IMG[c.id], 'nv-img') : c.emoji, c.nome]),
        ...Object.values(ANIMAIS).filter(a => a.nivel === S.nivel).map(a => [a.emoji, a.nome]),
        ...Object.values(PETS).filter(a => a.nivel === S.nivel).map(a => [a.emoji || '🐾', a.especie]),
        ...CONSTRUCOES.filter(c => c.nivel === S.nivel && !LIMITES[c.tipo]).map(c => [c.icone, TIPOS[c.tipo].nome]),
        ...DECOR.filter(c => c.nivel === S.nivel).map(c => [c.icone, TIPOS[c.tipo].nome])];
      CROPS.filter(c => c.nivel === S.nivel).forEach(c => { S.celeiro[c.id] = (S.celeiro[c.id] || 0) + 2; setTimeout(() => toast(`🎁 Ganhou 2 ${c.emoji} ${c.nome} para começar a plantar!`, 'bom'), 1500); });
    }
    if (subiu) { atualizarPlacasTerra(); mostrarNivel(S.nivel, novos, premios); setTimeout(() => lembrarConvidado(true), 3000); }
  }
  // ---------- tela de "subiu de nível": logo, estrela, fazendeiros, fogos e confete ----------
  function mostrarNivel(nv, novos, premios = []) {
    let el = $('#telaNivel');
    if (!el) { el = document.createElement('div'); el.id = 'telaNivel'; document.body.appendChild(el);
      el.addEventListener('click', e => { if (e.target.closest('[data-nv-ok]') || e.target === el) fecharNivel(); }); }
    // v0.48: virou uma janela do tamanho do celular (não cobre mais a tela toda)
    el.innerHTML = `<canvas class="nv-fogos"></canvas>
      <div class="nv-caixa"><div class="nv-topo"><img src="assets/ui/logo.webp" alt=""></div>
        <div class="nv-meio"><img class="nv-f1" src="assets/ui/fazendeiro.webp" alt="">
          <div class="nv-centro"><div class="nv-estrela"><img src="assets/ui/estrela.webp" alt=""><b>${nv}</b></div><div class="nv-par">PARABÉNS!</div>
            <div class="nv-sub">Você chegou ao <b>nível ${nv}</b></div>
            ${premios.length ? `<div class="nv-premio"><span>🎁 Prêmios:</span>${premios.map(([i, t]) => `<span class="nv-pr">${i} ${t}</span>`).join('')}</div>` : ''}
            ${novos.length ? `<div class="nv-novos"><span>🔓 Liberou:</span>${novos.slice(0, 6).map(([i, n]) => `<span class="nv-item">${i} ${n}</span>`).join('')}</div>` : ''}
          </div><img class="nv-f2" src="assets/ui/fazendeira.webp" alt=""></div>
        <button class="btn verde grande" data-nv-ok>Continuar</button></div>`;
    el.classList.remove('saindo'); el.classList.add('on'); somT('nivel', 300); somT('fogos', 300);
    fogosNivel(el.querySelector('.nv-fogos'));
  }
  function fecharNivel() { const el = $('#telaNivel'); if (!el || !el.classList.contains('on')) return; el.classList.add('saindo'); setTimeout(() => el.classList.remove('on', 'saindo'), 350); }
  function fogosNivel(cv) {
    const ctx = cv.getContext('2d'), dpr = Math.min(2, devicePixelRatio || 1); let W, H;
    const tam = () => { W = cv.width = innerWidth * dpr; H = cv.height = innerHeight * dpr; }; tam();
    const P = [], cores = ['#ff5f5f', '#ffd84a', '#5fd0ff', '#a77bff', '#7dff8a', '#ff9f43', '#ffffff'];
    const estoura = () => { const x = W * (.15 + Math.random() * .7), y = H * (.12 + Math.random() * .38), c = cores[Math.random() * cores.length | 0], n = 46;
      for (let i = 0; i < n; i++) { const a = i / n * 6.283, v = (2 + Math.random() * 2.6) * dpr; P.push({x, y, vx:Math.cos(a) * v, vy:Math.sin(a) * v, c, vida:1, t:'f'}); } };
    for (let i = 0; i < 70; i++) P.push({x:Math.random() * W, y:-Math.random() * H * .6, vx:(Math.random() - .5) * dpr, vy:(1.2 + Math.random() * 1.8) * dpr, c:cores[i % 6], vida:1, t:'c', r:Math.random() * 6});
    let ult = performance.now(), prox = 0, ini = ult;
    (function q(agora) {
      if (!cv.isConnected || !$('#telaNivel').classList.contains('on')) return;
      const dt = Math.min(50, agora - ult) / 16.7; ult = agora;
      if (agora - ini < 4200 && agora > prox) { estoura(); prox = agora + 380 + Math.random() * 420; if (agora - ini > 300) somT('fogos', 900); }
      ctx.clearRect(0, 0, W, H);
      for (let i = P.length - 1; i >= 0; i--) { const p = P[i];
        if (p.t === 'f') { p.vy += .045 * dpr * dt; p.vx *= .985; p.vy *= .985; p.vida -= .012 * dt; ctx.globalAlpha = Math.max(0, p.vida); ctx.fillStyle = p.c; ctx.beginPath(); ctx.arc(p.x, p.y, 2.6 * dpr, 0, 6.283); ctx.fill(); }
        else { p.r += .08 * dt; p.vida -= .003 * dt; ctx.globalAlpha = Math.max(0, Math.min(1, p.vida * 2)); ctx.fillStyle = p.c; ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.r); ctx.fillRect(-4 * dpr, -2 * dpr, 8 * dpr, 4 * dpr); ctx.restore(); }
        p.x += p.vx * dt; p.y += p.vy * dt; if (p.vida <= 0 || p.y > H + 20) P.splice(i, 1); }
      ctx.globalAlpha = 1; if (P.length || agora - ini < 4200) requestAnimationFrame(q);
    })(ult);
  }
  function comprarSemente(id, q) {
    const c = crop(id), custo = precoPlanta(c) * q;
    if (S.nivel < c.nivel || S.moedas < custo) return;
    if (livreCeleiro() < q) { toast('🏚️ Celeiro cheio! Amplie o celeiro para guardar mais plantas'); return; }
    S.moedas -= custo; S.celeiro[id] = (S.celeiro[id] || 0) + q; S.stats.compras++;
    toast(`Comprou ${q} ${c.emoji} ${c.nome} por ${fmtN(custo)} moedas`, 'bom');
    if (!(S.celeiro[S.semSel] || 0)) S.semSel = id;
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
    if (!temPet()) S.petComeu = Date.now(); S.moedas -= a.custo; S.amigos[k] = true; atualizarPets3D();
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
  function comprarConstrucao(tipo, perto, doBau) { // doBau: item que estava guardado (sai de graça)
    const custo = doBau ? 0 : custoConstrucao(tipo);
    const cd = consDe(tipo) || decDe(tipo);
    if (!podeAqui(cd)) { toast(`${cd.ilha === 'tropical' ? '🏝️' : '🏡'} Essa construção é da ${NOME_ILHA[cd.ilha]}: viaje pelo ⚓ Porto`); return; }
    if (!doBau && cd && cd.itens && !temItens(cd.itens)) { toast(`✨ Faltam achados raros: ${txtItens(cd.itens)}. Eles caem nas colheitas e na rede de pesca da Ilha Tropical`); return; }
    if (!doBau && noMaximo(tipo)) { toast(`Você já tem o máximo de ${TIPOS[tipo].nome.toLowerCase()} (${teto(tipo)}). Melhore com as Melhorias da Loja!`); return; }
    if (!doBau && S.nivel < nivelConstrucao(tipo)) { toast(`Libera no nível ${nivelConstrucao(tipo)}`); return; }
    if (!doBau && ehUnico(tipo) && nPosse(tipo)) { toast(qtdGuardado(tipo) ? 'Ela está guardada: coloque pela Loja › 📦 Guardados' : 'Você já tem essa construção'); return; }
    if (S.moedas < custo) { toast('Moedas insuficientes'); return; }
    // só paga quando tocar no ✓ verde; o ✕ vermelho desiste sem gastar nada
    const tg = controls.target, ref = perto || {x:Math.round(tg.x / G), z:Math.round(tg.z / G)}, pos = acharEspaco(tipo, ref.x, ref.z) || acharEspaco(tipo);
    if (!pos) { toast('Sem espaço livre! Libere novas terras 🌳'); if (perto) sairEdicao(); return; }
    const o = {id:novoId(), tipo, rot:perto ? perto.rot || 0 : 0, ...pos, pend:true, custo}; if (doBau) o.doBau = doBau.uid;
    if (tipo === 'lote' && doBau && doBau.li != null) o.li = doBau.li; else if (tipo === 'lote') { o.li = S.plots.length / 4; for (let k = 0; k < 4; k++) S.plots.push({c:null}); }
    S.objetos.push(o); criarObjeto3D(o);
    fechar(); tudo();
    entrarEdicao(true); selecionar(o);
    toast(doBau ? 'Arraste até o lugar e toque ✓ para colocar · ✕ deixa guardado' : perto ? `Mais um? Arraste e toque ✓ · ✕ para parar` : `Arraste até o lugar e toque ✓ para comprar por ${fmtN(custo)} · ✕ desiste`, 'bom');
  }
  function removerObjeto(o) { // tira a construção do jogo (usado ao desistir de uma compra)
    const i = S.objetos.indexOf(o); if (i >= 0) S.objetos.splice(i, 1);
    const r = obj3D[o.id]; if (r) { scene.remove(r.g); const k = pickObjs.indexOf(r.pick); if (k >= 0) pickObjs.splice(k, 1); delete obj3D[o.id]; }
    if (o.tipo === 'lote') for (let k = 0; k < 4; k++) tiles[o.li * 4 + k] = undefined; // os canteiros somem junto (não ficam tocáveis)
    if (o.tipo === 'lote' && !o.doBau && o.li * 4 + 4 === S.plots.length) S.plots.splice(o.li * 4, 4);
    if (TIPOS[o.tipo].animal) atualizarAnimais3D(true);
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
    montarDecorTerras();
    for (let k = 0; k < 14; k++) { const [cx, cz] = z.cel[Math.random() * z.cel.length | 0]; poeiraEm(V3(cx * G, 0, cz * G), 0x9ad46a); }
    atualizarPlacasTerra();
    toast('🌳 Terra nova liberada! Use ✏️ Editar para construir nela', 'ouro'); fechar(); tudo();
  }

  // produção dos animais: 1 ração = 1 ciclo (ex.: galinha bota 3 ovos, 1 a cada 2 min)
  function atualizarProducao() {
    let mudou = false; const agora = Date.now();
    for (const k in ANIMAIS) {
      const a = ANIMAIS[k], ms = a.tempo * 1000 * (petOk('gato') ? .9 : 1);
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
  const prontosPomar = () => S.objetos.filter(o => TIPOS[o.tipo].fruta && !o.pend && restaPomar(o) <= 0);
  function coletarTudo() { // 🧺 pega tudo que está pronto (mina, bosque, árvores e arbustos) de uma vez
    let n = 0; for (const o of prontosPomar()) { if (livreCeleiro() < 1) { avisarCheio('celeiro'); break; } colherPomar(o); n++; }
    if (n) { toast(`🧺 Coletou ${n} de uma vez!`, 'bom'); somT('colher'); } tudo(); salvar();
  }
  function colherPomar(o) {
    if (restaPomar(o) > 0) return;
    const f = fruta(o), n = Math.min(f.rende + (MED && TIPOS[o.tipo].coleta ? (CASTELO[(S.castelo || 0) - 1] || {bonus:0}).bonus : 0), livreCeleiro()); if (n < 1) { avisarCheio('celeiro'); return; }
    S.celeiro[f.id] = (S.celeiro[f.id] || 0) + n; S.stats.colheu[f.id] = (S.stats.colheu[f.id] || 0) + n; S.pomar[o.id] = Date.now();
    let txt = `+${n} ${f.emoji}`; if (f.extra) for (const k in f.extra) { S.celeiro[k] = (S.celeiro[k] || 0) + f.extra[k]; txt += ` +${f.extra[k]} ${item(k).emoji}`; }
    if (f.raroMed && Math.random() < f.raroMed) { const r = Math.random(), k = r < .6 ? 'ouro' : r < .85 ? 'rubi' : 'safira'; S.celeiro[k] = (S.celeiro[k] || 0) + 1; S.stats.raros = (S.stats.raros || 0) + 1;
      setTimeout(() => { somT('achou'); toast(`✨ Achou na mina: ${item(k).emoji} ${item(k).nome}!`, 'ouro'); }, 800); }
    flutuar(centro(o).add(V3(0, 2.5, 0)), `${txt}  +${fmtN(Math.round(n * f.preco / 25))} XP`); ganharXp(Math.round(n * f.preco / 25)); acharMaterial(centro(o), .12); if (TROP) acharRaro(centro(o), .04);
  }
  function estadoCercado(o) {
    const L = animaisDoCercado(o), a = ANIMAIS[TIPOS[o.tipo].animal], agora = Date.now();
    const prod = L.filter(x => x.rest > 0);
    return {n:L.length, prontos:L.reduce((s, x) => s + x.prontos, 0), fome:L.filter(x => x.rest <= 0).length, prod:prod.length,
      prox:prod.length ? Math.min(...prod.map(x => a.tempo * 1000 * (petOk('gato') ? .9 : 1) - (agora - x.t))) : 0};
  }
  function trabalharCercado(o) { // coleta o que está pronto e dá ração para quem está com fome
    atualizarProducao();
    const k = TIPOS[o.tipo].animal, a = ANIMAIS[k], it = item(a.prod), r = item(a.racao), L = animaisDoCercado(o), c = centro(o);
    let col = 0; L.forEach(x => { const n = Math.min(x.prontos, livreArmazem() - col); col += n; x.prontos -= n; });
    if (L.some(x => x.prontos > 0)) avisarCheio();
    if (col) { acharMaterial(c, .1); S.celeiro[it.id] = (S.celeiro[it.id] || 0) + col; S.stats.coletou[it.id] = (S.stats.coletou[it.id] || 0) + col; flutuar(c.clone().add(V3(0, 2, 0)), `+${col} ${it.emoji}`); ganharXp(col * (it.xp || 1)); }
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
    M.fila.push({id, dur:Math.round(r.tempo * 1000 * (1 - .08 * (S.upg.engrenagem || 0))), t0:M.fila.length ? 0 : Date.now()});
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
  // balões de tempo/pronto: desenhados em HTML por cima do 3D, sempre na nitidez máxima da tela
  const baloes = {}, camadaBal = document.createElement('div'); camadaBal.id = 'baloes'; canvas.after(camadaBal);
  function balao_(id, y) {
    let b = baloes[id];
    if (!b) { const el = document.createElement('div'); el.className = 'bal3d'; el.style.display = 'none'; camadaBal.appendChild(el); b = baloes[id] = {el, position:V3(), visible:false, mostra:false, op:1, userData:{}}; }
    b.userData.y = y; return b;
  }
  function desenharBalao(b, emoji, texto, cor = '#fff8ea') {
    const chave = emoji + '|' + texto + '|' + cor; b.visible = true;
    if (b.userData.chave === chave) return; b.userData.chave = chave;
    b.el.style.background = cor; b.el.innerHTML = `<i>${emoji}</i>${texto ? `<b>${texto}</b>` : ''}`;
  }
  const vBal = V3();
  function posicionarBaloes(seg) {
    const f = Math.max(.72, Math.min(1.15, 24 / camera.position.distanceTo(controls.target))), W = innerWidth, H = innerHeight;
    for (const id in baloes) {
      const b = baloes[id]; let ok = b.visible;
      if (ok) { vBal.set(b.position.x, b.userData.y + Math.sin(seg * 3) * .15, b.position.z).project(camera); ok = vBal.z < 1 && Math.abs(vBal.x) < 1.15 && Math.abs(vBal.y) < 1.15; }
      if (ok !== b.mostra) { b.mostra = ok; b.el.style.display = ok ? '' : 'none'; }
      if (ok) { b.el.style.transform = `translate(${((vBal.x + 1) / 2 * W).toFixed(1)}px,${((1 - vBal.y) / 2 * H).toFixed(1)}px) translate(-50%,-100%) scale(${f.toFixed(3)})`; b.el.style.opacity = b.op; }
    }
  }
  const tempoCurto = ms => { const s = Math.max(0, Math.ceil(ms / 1000)); return s >= 3600 ? `${Math.floor(s / 3600)}h${String(Math.floor(s % 3600 / 60)).padStart(2, '0')}` : s >= 60 ? `${Math.floor(s / 60)}m${String(s % 60).padStart(2, '0')}` : `${s}s`; };
  const verBal = {}; // balões só aparecem por alguns segundos depois de tocar na construção
  function atualizarBaloes() {
    for (const k in baloes) baloes[k].visible = false;
    const agora = Date.now();
    S.objetos.forEach(o => {
      const T = TIPOS[o.tipo], c = centro(o);
      if (T.fruta) { const fr = frutosArv[o.id]; if (fr) fr.visible = restaPomar(o) <= 0; }
      if (!(verBal[o.id] > agora)) return;
      if (T.animal) {
        const e = estadoCercado(o); if (!e.n) return;
        const [, D] = dims(o), b = balao_(o.id, 4.2); b.position.set(c.x, 4.2, c.z + D * G / 4);
        if (e.prontos) desenharBalao(b, emojiItem(item(ANIMAIS[T.animal].prod)), '×' + e.prontos, '#eaffd8');
        else if (e.prod) desenharBalao(b, '⏳', tempoCurto(e.prox) + (e.fome ? ' 🍽️' : ''));
        else if (e.fome) desenharBalao(b, '🍽️', 'fome!', '#ffe4dd');
      }
      if (o.tipo === 'casinhaPet' && petsComFome()) { const b = balao_(o.id, 3.2); b.position.set(c.x, 3.2, c.z); desenharBalao(b, '🦴', 'fome!', '#ffe4dd'); }
      if (T.fruta) {
        const r = restaPomar(o);
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
  const DUR = {plantar:1.5, regar:1.3, colher:.9, catar:.8, cercado:1.3, pomar:1.2, andar:0, passeio:2.6};
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
    if (heroi.atual && heroi.atual.tipo === 'passeio') { heroi.atual = null; heroi.acao = null; heroi.rota = []; } // passeando: larga na hora
    heroi.ocioso = 0;
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
    const tot = heroi.fila.length + (heroi.atual && heroi.atual.tipo !== 'passeio' ? 1 : 0);
    let h = '';
    if (tot) {
      h += `<span class="fila-tit">📋 ${tot}</span>`;
      if (heroi.atual && heroi.atual.tipo !== 'passeio') h += `<span class="fila-ic atual">${iconeAcao(heroi.atual)}</span>`;
      heroi.fila.slice(0, 9).forEach((a, k) => h += `<button class="fila-ic" data-fila="${k}" title="Remover">${iconeAcao(a)}</button>`);
      if (heroi.fila.length > 9) h += `<span class="fila-mais">+${heroi.fila.length - 9}</span>`;
      h += `<button class="fila-cancel" data-fila="tudo" title="Cancelar tudo">✋</button>`;
    }
    if (h !== filaHTML) { filaHTML = h; el.innerHTML = h; el.style.display = tot ? 'flex' : 'none'; }
  }
  // sem nada para fazer, o fazendeiro passeia: olha os bichos, confere as plantas, visita as árvores
  function pontoPasseio() {
    const ops = [];
    S.objetos.forEach(o => { const T = TIPOS[o.tipo]; if (T.animal && qtdAnimal(T.animal)) ops.push({o, sub:'olha', peso:3}); else if (T.fruta) ops.push({o, sub:'olha', peso:1.5}); else if (T.abre || T.fab) ops.push({o, sub:'olha', peso:.6}); });
    S.plots.forEach((p, i) => { if (p.c) ops.push({i, sub:'agacha', peso:.35}); });
    if (!ops.length) return null;
    let r = Math.random() * ops.reduce((a, b) => a + b.peso, 0), e = ops[0]; for (const x of ops) { r -= x.peso; if (r <= 0) { e = x; break; } }
    if (e.o) { const c = centro(e.o), [W, D] = dims(e.o), lado = Math.floor(Math.random() * 4), a = [[0, D * G / 2 + .7], [0, -D * G / 2 - .7], [W * G / 2 + .7, 0], [-W * G / 2 - .7, 0]][lado];
      return {anda:V3(c.x + a[0] + rnd(-.6, .6), 0, c.z + a[1] + rnd(-.6, .6)), olha:c, sub:e.sub}; }
    const t = posTile(e.i); return {anda:V3(t.x + rnd(-.3, .3), 0, t.z + G * .62), olha:t, sub:e.sub};
  }
  function processarFila(dt) {
    if (!heroi.atual) {
      if (!heroi.fila.length) {
        heroi.ocioso = (heroi.ocioso || 0) + dt;
        if (heroi.ocioso > 6 && !VISITA && !editar.ativo && !(S.tut >= 0 && S.tut <= 12) && !heroi.rota.length) {
          heroi.ocioso = -rnd(2, 6); const pp = pontoPasseio();
          if (pp) { heroi.atual = {tipo:'passeio', pos:pp.anda, olhaPos:pp.olha, sub:pp.sub, fase:'andar'}; heroi.rota = [ajustarDestino(pp.anda)]; }
        }
        if (!heroi.atual) return;
      } else {
      heroi.ocioso = 0;
      heroi.atual = heroi.fila.shift(); heroi.atual.fase = 'andar'; renderFila();
      heroi.rota = [ajustarDestino(alvoAcao(heroi.atual).anda)];
      }
    }
    const a = heroi.atual;
    if (a.fase === 'andar' && !heroi.rota.length) {
      a.fase = 'agir'; a.t = a.tipo === 'passeio' ? rnd(1.8, 3.4) : durAcao(a.tipo); heroi.acao = {tipo:a.tipo, t:a.t, sub:a.sub};
      const c = a.olhaPos || alvoAcao(a).olha; heroi.g.rotation.y = Math.atan2(c.x - heroi.g.position.x, c.z - heroi.g.position.z);
    }
    if (a.fase === 'agir') {
      a.t -= dt;
      if (a.t <= 0) { heroi.atual = null; executar(a); idsAcao(a).forEach(j => marcar(j, false)); renderFila(); tudo(); }
    }
  }
  function executar(a) {
    if (a.tipo === 'cercado') { const o = objPorId(a.oid); if (o) trabalharCercado(o); return; }
    if (a.tipo === 'pomar') { const o = objPorId(a.oid); if (o) colherPomar(o); return; }
    if (a.tipo === 'andar' || a.tipo === 'passeio') return;
    const p = S.plots[a.i];
    if (a.tipo === 'plantar') idsAcao(a).forEach(j => { if (!S.plots[j].c && (S.celeiro[a.id] || 0) > 0) plantar(j, a.id); });
    if (a.tipo === 'regar') idsAcao(a).forEach(j => regar(j));
    if (a.tipo === 'colher') idsAcao(a).forEach(j => { if (pronto(S.plots[j])) colher(j); });
    if (a.tipo === 'catar') idsAcao(a).forEach(j => tirarPraga(j));
  }
  const listaColheita = (i, ignorar) => areaAcao(i, pronto, livreCeleiro(), ignorar);
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
    for (const id in obj3D) { const r = obj3D[id]; if (r.rot) { r.rot.visible = !!(editar.ativo || r.ate > agora || (hoverObj && hoverObj.id === id)); const b = baloes[id]; if (b) b.op = r.rot.visible ? .2 : 1; } }
  }
  function clicarConstrucao(o) {
    verBal[o.id] = Date.now() + 5000; setTimeout(atualizarBaloes, 50);
    if (o.tipo === 'casinhaPet' && !VISITA && !editar.ativo) { menuCasinha(o); return; }
    const T = TIPOS[o.tipo]; mostrarNome(o);
    if (T.animal && qtdAnimal(T.animal)) somT(T.animal, 700);
    if (VISITA) { if (T.animal && qtdAnimal(T.animal)) { somT(T.animal, 700); ajudarCercadoVisita(o); } return; } // visitando: só olha (e ajuda)
    if (T.abre) { const c = centro(o), [, D] = dims(o); irPara(V3(c.x, 0, c.z + D * G / 2 + .8)); abrir(T.abre); return; }
    if (objNaFila(o.id)) return;
    if (T.fruta) { const r = restaPomar(o); if (r > 0) toast(`${fruta(o).emoji} ${TIPOS[o.tipo].nome}: ${T.coleta ? 'pronto' : 'frutas'} em ${fmtT(r / 1000)}`); else enfileirar({tipo:'pomar', oid:o.id}); return; }
    if (T.animal) {
      if (!qtdAnimal(T.animal)) { abrir('animais'); return; }
      { atualizarProducao(); const e = estadoCercado(o), a = ANIMAIS[T.animal];
        if (e.fome && !e.prontos && !(S.celeiro[a.racao] > 0)) { toast(`🍽️ ${a.plural} com fome e sem ${item(a.racao).nome.toLowerCase()}. Faça no moinho 🌾`); somT('erro'); return; } } // só avisa (não abre o moinho sozinho)
      enfileirar({tipo:'cercado', oid:o.id}); return;
    }
    if (T.fab) { if (o.tipo === 'moinho') fabSel = o.id; const oidF = o.tipo === 'moinho' ? o.id : undefined; if (prontosFab(o.tipo, oidF) > 0) { coletarFab(o.tipo, oidF); tudo(); return; } abrir('fabrica', o.tipo); if (!objNaFila(o.id)) enfileirar({tipo:'andar', oid:o.id}); tudo(); }
  }
  let destaqueRec = null;
  function resumoCuidar() { // o que o "Cuidar de todos" vai fazer
    const r = {alvos:[], col:0, ali:0, semR:[]};
    for (const o of S.objetos) { const T = TIPOS[o.tipo]; if (!T.animal || !qtdAnimal(T.animal)) continue;
      const e = estadoCercado(o), temR = (S.celeiro[ANIMAIS[T.animal].racao] || 0) > 0;
      if (e.fome && !temR && !r.semR.includes(T.animal)) r.semR.push(T.animal);
      if (objNaFila(o.id) || !(e.prontos || (e.fome && temR))) continue;
      r.alvos.push(o); r.col += e.prontos; if (temR) r.ali += Math.min(e.fome, S.celeiro[ANIMAIS[T.animal].racao]); }
    return r;
  }
  function irParaRacao(a) { // bicho com fome e sem ração: já abre o moinho mostrando a ração certa
    const r = item(a.racao), m = listaMoinhos()[0];
    if (!m) { toast(`${a.plural} com fome! Construa um Moinho para fazer ${r.nome.toLowerCase()} 🌾`); abrir('loja', 'construcoes'); return; }
    fabSel = m.id; destaqueRec = r.id; abrir('fabrica', 'moinho'); destaqueRec = null;
    const el = $(`[data-rec=${r.id}]`); if (el) el.scrollIntoView({block:'center'});
    toast(`🍽️ ${a.plural} com fome! Faça ${r.nome.toLowerCase()} aqui no moinho`, 'bom');
    apontar_(() => $(`[data-receita=${r.id}]`), null, 6000);
  }
  // ===== v0.45: tocar num item mostra o que é e onde consegue; "Ir lá" leva até o lugar com a mãozinha =====
  const RAR_NOME = {comum:'Comum', incomum:'Incomum', raro:'Raro', epico:'Épico', lendario:'Lendário'};
  const tagRar = it => it && it.rar ? `<span class="rar rar-${it.rar}">${RAR_NOME[it.rar]}</span>` : '';
  const fabDe = id => Object.keys(FABRICAS).find(f => FABRICAS[f].receitas.some(r => r.id === id));
  const noNa = n => (/a$|ão$|agem$|ade$/.test(n.toLowerCase()) && !/moinho|engenho|laticínio|galinheiro|curral|pasto|chiqueiro|apiário/i.test(n) ? 'na ' : 'no ') + n;
  function fonteItem(id) {
    const it = item(id); if (!it) return '';
    if (MATERIAIS[id]) return '🎁 Cai de vez em quando ao colher e produzir. Também tem na Loja › Materiais.';
    if (ACHADOS.some(a => a.id === id)) return '✨ Achado raro da Ilha Tropical: cai de vez em quando nas colheitas, no pomar e na rede de pesca do porto. Serve para decorações exclusivas e pedidos especiais do barco.';
    if (id === 'peixe') return '🎣 Vem na rede de pesca do ⚓ Porto (a cada 4 horas).';
    if (crop(id) && crop(id).soAchado) return '✨ Semente raríssima: cai de vez em quando nas colheitas da Ilha Tropical. Plante lá e colha 2!';
    if (crop(id) && crop(id).ilha && crop(id).ilha !== ILHA && !(S.nivel < crop(id).nivel)) return `${crop(id).ilha === 'tropical' ? '🏝️' : '🏡'} Planta da ${NOME_ILHA[crop(id).ilha]}: plante lá (vá pelo ⚓ Porto). Sementes na Loja › Plantas.`;
    if (crop(id)) return S.nivel < crop(id).nivel ? `🔒 Planta que libera no nível ${crop(id).nivel}.` : '🌱 Planta: plante num canteiro (sementes na Loja › Plantas). Cada colheita rende 2.';
    if (it.arvore) return `🌳 Dá na ${TIPOS[it.arvore].nome.toLowerCase()} (Loja › Fazenda).${S.nivel < it.nivel ? ` Libera no nível ${it.nivel}.` : ''}`;
    const an = Object.keys(ANIMAIS).find(k => ANIMAIS[k].prod === id);
    if (an) { const a = ANIMAIS[an]; return `${a.emoji} Vem ${/a$/.test(a.nome) ? 'da' : 'do'} ${a.nome.toLowerCase()}, ${noNa(TIPOS[a.cercado].nome.toLowerCase())}. Ela come ${item(a.racao).nome.toLowerCase()}.`; }
    const f = fabDe(id);
    if (f) { const r = FABRICAS[f].receitas.find(r => r.id === id); return `🏭 Feito ${noNa(FABRICAS[f].nome)} com ${Object.entries(r.ing).map(([k, n]) => `${n} ${item(k).nome.toLowerCase()}`).join(', ')}.${S.nivel < r.nivel ? ` Libera no nível ${r.nivel}.` : ''}`; }
    return '';
  }
  function guiarFazer(id) { // abre a fábrica certa já na receita; se faltar ingrediente, aponta para ele
    const f = fabDe(id), r = f && FABRICAS[f].receitas.find(r => r.id === id); if (!r) return;
    if (S.nivel < r.nivel) { toast(`${r.nome} libera no nível ${r.nivel}`); return; }
    const o = f === 'moinho' ? listaMoinhos()[0] : S.objetos.find(o => o.tipo === f);
    if (!o) { abrir('loja', subDe(f)); rolarAte(`[data-construir=${f}]`); apontar_(() => $(`[data-construir=${f}]`)); toast(`Construa: ${FABRICAS[f].nome} para fazer ${r.nome.toLowerCase()}`); return; }
    if (f === 'moinho') fabSel = o.id;
    focar(centro(o)); destaqueRec = id; abrir('fabrica', f); destaqueRec = null;
    const el = $(`[data-rec=${id}]`); if (el) el.scrollIntoView({block:'center'});
    const falta = Object.entries(r.ing).find(([k, n]) => (S.celeiro[k] || 0) < n);
    if (falta) { toast(`Falta ${item(falta[0]).nome.toLowerCase()}: toque nele para ver onde consegue 👆`); apontar_(() => $(`[data-rec=${id}] [data-info=${falta[0]}]`), null, 6000); }
    else apontar_(() => $(`[data-receita=${id}]`), null, 6000);
  }
  function guiarItem(id) {
    fecharInfo();
    if (MATERIAIS[id]) { abrir('loja', 'materiais'); return; }
    if (crop(id)) { guiarMissao({t:'plantar', id}); return; }
    const it = item(id);
    if (it && it.arvore) { guiarMissao({t:'ter', id:it.arvore}); return; }
    if (EXTRAS.some(e => e.id === id)) { guiarMissao({t:'coletar', id}); return; }
    guiarFazer(id);
  }
  function fecharInfo() { const el = $('#infoItem'); if (el) el.classList.remove('on'); }
  function mostrarInfo(id, alvo) {
    const it = item(id); if (!it) return;
    let el = $('#infoItem');
    if (!el) { el = document.createElement('div'); el.id = 'infoItem'; document.body.appendChild(el);
      el.addEventListener('click', e => { const b = e.target.closest('[data-info-ir]'); if (b) guiarItem(b.dataset.infoIr); if (e.target.closest('[data-info-x]')) fecharInfo(); }); }
    el.innerHTML = `<button class="info-x" data-info-x>✕</button><div class="info-topo">${iconeItem(it, 'grande')}<div><b>${esc(it.nome)}</b> ${tagRar(it)}<small>Você tem ${fmtN(estoque(id))}${it.preco ? ` · vende por ${fmtN(precoAtual(id))}` : ''}${it.xp ? ` · ⭐ ${fmtN(it.xp)} XP ao produzir` : ''}</small></div></div>
      <p>${fonteItem(id)}</p><button class="btn verde" data-info-ir="${id}">Ir lá 👉</button>`;
    el.classList.add('on');
    const r = alvo.getBoundingClientRect(), w = el.offsetWidth, h = el.offsetHeight;
    let x = Math.min(innerWidth - w - 8, Math.max(8, r.left + r.width / 2 - w / 2)), y = r.top - h - 8; if (y < 8) y = Math.min(innerHeight - h - 8, r.bottom + 8);
    el.style.left = x + 'px'; el.style.top = y + 'px';
  }
  document.addEventListener('click', e => {
    const a = e.target.closest('[data-info]');
    if (a) { e.stopPropagation(); e.preventDefault(); mostrarInfo(a.dataset.info, a); return; }
    if (!e.target.closest('#infoItem')) fecharInfo();
  }, true);
  const clicavel = o => o && (TIPOS[o.tipo].abre || TIPOS[o.tipo].animal || TIPOS[o.tipo].fab || TIPOS[o.tipo].fruta || o.tipo === 'casinhaPet');
  function vizinhos(i) {
    const c = posTile(i), out = [];
    S.plots.forEach((p, j) => { if (tiles[j] && posTile(j).distanceTo(c) < G * 1.6) out.push(j); });
    return out;
  }
  function tickMercado() {
    S.tend = {}; S.evento = null; return; // v0.48: sem oscilação e sem feira (fechava um furo de dinheiro infinito)
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
  let grade;
  const montarGrade = () => { if (grade) { scene.remove(grade); grade.geometry.dispose(); }
    grade = new THREE.GridHelper((2 * OFF + 1) * G, 2 * OFF + 1, 0xffffff, 0xffffff);
    grade.material.transparent = true; grade.material.opacity = .28; grade.position.y = .04; grade.visible = !!(typeof editar !== 'undefined' && editar.ativo); scene.add(grade); };
  montarGrade();
  // a ilha cresce na hora, sem recarregar o jogo
  function liberarIlha(obj) { scene.remove(obj); obj.traverse(m => { if (m.geometry) m.geometry.dispose(); }); }
  function reconstruirIlha(novoAnel) {
    tirarPreviaIlha();
    ilhaObjs.forEach(liberarIlha); ilhaObjs = []; borboletas.length = 0;
    for (const k in terras) { liberarIlha(terras[k]); delete terras[k]; } clicaveisTerra.length = 0;
    ANEL = novoAnel; OFF = 12 + 5 * ANEL; NZ = 5 + 2 * ANEL; MEIA = (OFF + .5) * G + 1.6;
    calcZonas(); montarIlha(); montarTerras(); montarGrade(); ajustarSombraSol(); montarPorto();
    if (renderer.shadowMap) renderer.shadowMap.needsUpdate = true;
  }
  // prévia em cinza de como a ilha fica depois de crescer
  let previaIlha = null, previaTimer = 0, previaDist = 0;
  function tirarPreviaIlha() { if (!previaIlha) return; liberarIlha(previaIlha); previaIlha = null; if (previaDist) { controls.maxDistance = previaDist; previaDist = 0; } clearTimeout(previaTimer); document.body.classList.remove('previa-ilha'); }
  function mostrarPreviaIlha() {
    tirarPreviaIlha(); fechar();
    const M2 = (12 + 5 * (ANEL + 1) + .5) * G + 1.6, g = new THREE.Group();
    const sh = formaQuadrada(M2, 4); sh.holes.push(formaQuadrada(MEIA + 2.4, 6));
    const anel = new THREE.Mesh(new THREE.ShapeGeometry(sh, 12), new THREE.MeshBasicMaterial({color:0x9a9a9a, transparent:true, opacity:.72, depthWrite:false}));
    anel.rotation.x = -Math.PI / 2; anel.position.y = .08; anel.renderOrder = 6; g.add(anel);
    const borda = new THREE.LineLoop(new THREE.BufferGeometry().setFromPoints(formaQuadrada(M2, 4).getPoints(12).map(p => V3(p.x, 0, -p.y))), new THREE.LineBasicMaterial({color:0xffffff}));
    borda.position.y = .12; g.add(borda);
    scene.add(g); previaIlha = g; document.body.classList.add('previa-ilha');
    { const d = camera.position.clone().sub(controls.target); previaDist = controls.maxDistance; controls.maxDistance = 72; d.setLength(66); focar(V3(0, 0, 0)); camera.position.copy(controls.target).add(d); controls.update(); }
    toast('🏝️ A área cinza é o tamanho novo da ilha. Toque em qualquer lugar para fechar a prévia');
    previaTimer = setTimeout(tirarPreviaIlha, 12000);
    setTimeout(() => addEventListener('pointerdown', tirarPreviaIlha, {once:true}), 400);
  }
  const pegada = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({color:C(0x5cd65c), transparent:true, opacity:.45, depthWrite:false}));
  pegada.material.depthTest = false; pegada.rotation.x = -Math.PI / 2; pegada.position.y = .4; pegada.visible = false; pegada.renderOrder = 8; scene.add(pegada);
  const ferrEd = $('#ferrEdicao');

  function entrarEdicao(compra) {
    editar.compra = !!compra; document.body.classList.toggle('colocando', !!compra);
    if (editar.ativo) return;
    editar.ativo = true; grade.visible = true; document.body.classList.add('editando');
    fechar(); tip.style.display = 'none';
  }
  function sairEdicao() {
    if (editar.sel) { if (editar.valido) confirmarSel(); else cancelarSel(); }
    editar.ativo = false; editar.compra = false; grade.visible = false; document.body.classList.remove('editando', 'colocando'); ferrEd.style.display = 'none';
    salvar();
  }
  // barra de construção: aparece no modo edição para comprar e colocar vários itens seguidos
  let barraHTML = '';
  function renderBarraConstrucao() {
    const el = $('#barraConstrucao'); if (!el) return;
    el.innerHTML = ''; barraHTML = ''; return; // v0.44: a lojinha embaixo do modo edição saiu (compra é só pela Loja)
    const lista = [...CONSTRUCOES.map(c => ({tipo:c.tipo, icone:c.icone})), ...DECOR.map(c => ({tipo:c.tipo, icone:c.icone}))];
    let h = '';
    lista.forEach(c => {
      const nv = nivelConstrucao(c.tipo), trava = S.nivel < nv, custo = custoConstrucao(c.tipo), feito = ehUnico(c.tipo) && nPosse(c.tipo) > 0;
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
    if (editar.sel && editar.sel.pend && editar.sel !== o) return; // colocando uma compra: termine com ✓ ou ✕ antes
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
    { const gb = ferrEd.querySelector('[data-ed=guardar]'); if (gb) gb.style.display = editar.sel.pend || ['celeiro', 'armazem', 'galpao', 'loja', 'lago'].includes(editar.sel.tipo) ? 'none' : ''; }
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
    if (o.pend) { // compra: só agora desconta as moedas
      const custo = o.custo || 0; delete o.custo;
      if (S.moedas < custo) { toast('Moedas insuficientes'); cancelarSel(); return; }
      S.moedas -= custo; delete o.pend; somT('moeda');
      { const dc = decDe(o.tipo); if (dc && dc.itens && !o.doBau) { if (!temItens(dc.itens)) { S.moedas += custo; toast('✨ Faltam achados raros'); cancelarSel(); return; } for (const k in dc.itens) mudarEstoque(k, -dc.itens[k]); } }
      if (o.doBau) { S.guardados = (S.guardados || []).filter(g => g.uid !== o.doBau); delete o.doBau; editar.compra = false; posicionar(o); editar.sel = null; pegada.visible = false; ferrEd.style.display = 'none';
        if (TIPOS[o.tipo].animal) atualizarAnimais3D(true); poeiraEm(centro(o), 0xd8b98a); salvar(); sairEdicao(); tudo(); toast(`📦 ${TIPOS[o.tipo].nome} colocado de volta!`, 'bom'); return; }
      const an = TIPOS[o.tipo].animal;
      if (an && !S.presente[o.tipo]) { S.presente[o.tipo] = 1; const r = ANIMAIS[an].racao; S.celeiro[r] = (S.celeiro[r] || 0) + 3; setTimeout(() => toast(`🎁 Presente: 3 ${item(r).nome.toLowerCase()}!`, 'ouro'), 1500); }
    }
    const comprou = editar.compra;
    posicionar(o); editar.sel = null; pegada.visible = false; ferrEd.style.display = 'none';
    if (TIPOS[o.tipo].animal) atualizarAnimais3D(true);
    if (o.tipo === 'loja') posicionarTonho();
    poeiraEm(centro(o), 0xd8b98a); salvar(); atualizarBaloes(); tudo();
    if (comprou) { // decoração: já oferece mais uma do lado; construção: sai do modo de colocar
      const T = TIPOS[o.tipo], d = decDe(o.tipo);
      if (T.decor && d && S.moedas >= d.preco) { comprarConstrucao(o.tipo, {x:o.ox, z:o.oz, rot:o.rot}); return; }
      sairEdicao(); toast(`${T.nome} comprado! ✅`, 'bom');
    }
  }
  // ===== v0.49: guardar construções e decorações (Loja › 📦 Guardados) =====
  function motivoNaoGuardar(o) {
    const T = TIPOS[o.tipo];
    if (['celeiro', 'armazem', 'galpao', 'loja', 'lago'].includes(o.tipo)) return `O ${T.nome.toLowerCase()} não pode ser guardado (dá para mover)`;
    if (o.tipo === 'lote') { const ps = S.plots.slice(o.li * 4, o.li * 4 + 4); if (ps.some(p => p && p.c)) return 'Colha ou espere a plantação terminar antes de guardar esta terra'; }
    if (T.animal) { const a = ANIMAIS[T.animal]; if (qtdAnimal(T.animal) > a.porCercado * (nTipo(o.tipo) - 1)) return `Tem ${a.plural.toLowerCase()} morando aqui: não cabem nos outros cercados`; }
    if (T.fab) { const e = o.tipo === 'moinho' ? fabEstado('moinho', o.id) : fabEstado(o.tipo); if (e.fila.length || Object.values(e.prontos || {}).some(n => n > 0)) return 'Espere a produção terminar e pegue os produtos antes de guardar'; }
    if (objNaFila(o.id)) return 'O fazendeiro está indo até aí: espere um pouco';
    return '';
  }
  function guardarSel() {
    const o = editar.sel; if (!o || o.pend) return;
    const m = motivoNaoGuardar(o); if (m) { toast(m); somT('erro'); return; }
    S.objetos.splice(S.objetos.indexOf(o), 1);
    const r = obj3D[o.id]; if (r) { scene.remove(r.g); const k = pickObjs.indexOf(r.pick); if (k >= 0) pickObjs.splice(k, 1); delete obj3D[o.id]; }
    if (o.tipo === 'lote') for (let k = 0; k < 4; k++) tiles[o.li * 4 + k] = undefined;
    if (!S.guardados) S.guardados = [];
    S.guardados.push({uid:'g' + Date.now() + Math.random().toString(36).slice(2, 6), tipo:o.tipo, li:o.tipo === 'lote' ? o.li : null});
    editar.sel = null; pegada.visible = false; ferrEd.style.display = 'none';
    if (TIPOS[o.tipo].animal) atualizarAnimais3D(true);
    salvar(); tudo(); somT('abrir'); toast(`📦 ${TIPOS[o.tipo].nome} guardado! Coloque de volta em Loja › Guardados`, 'bom');
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
    if (o.pend) { editar.sel = null; pegada.visible = false; ferrEd.style.display = 'none'; removerObjeto(o); sairEdicao(); tudo(); return; } // desistiu da compra: nada é cobrado
    Object.assign(o, editar.orig); posicionar(o);
    editar.sel = null; pegada.visible = false; ferrEd.style.display = 'none';
    if (editar.compra) sairEdicao();
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
    const it = m.id && item(m.id), nome = it ? `${emojiItem(it)} ${it.nome.toLowerCase()}` : '';
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
    const cen = z => z.cel.reduce((a, c) => a + Math.hypot(c[0], c[1]), 0) / z.cel.length, z = ZONAS.filter(z => !S.zonas.includes(z.key)).sort((a, b) => TROP || MED ? a.zx - b.zx || a.zz - b.zz : Math.hypot(a.zx - 2, a.zz - 2) - Math.hypot(b.zx - 2, b.zz - 2))[0];
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
        if ((S.celeiro[k] || 0) > 0) { fechar(); S.semSel = k; toast('Toque num canteiro vazio e arraste a planta por cima dele'); }
        else { abrir('loja', 'sementes'); rolarAte(`[data-comprar=${k}]`); apontar_(() => $(`[data-compra="planta:${k}"]`)); }
        return;
      case 'vender': if (usoArmazem()) { abrir('armazem'); apontar_(() => $('[data-acao=vender-tudo]')); } else abrir('celeiro'); return;
      case 'coletar': {
        const an = EXTRAS.find(e => e.id === k).animal, o = cercadosDe(an)[0];
        if (!o) { abrir('loja', subDe(ANIMAIS[an].cercado)); rolarAte(`[data-construir=${ANIMAIS[an].cercado}]`); apontar_(() => $(`[data-construir=${ANIMAIS[an].cercado}]`)); return; }
        if (!qtdAnimal(an)) { abrir('animais'); rolarAte(`[data-animal=${an}]`); apontar_(() => $(`[data-animal=${an}]`)); return; }
        fechar(); focar(centro(o)); apontar_(null, () => centro(o).add(V3(0, 1.5, 0))); toast('Toque no cercado para coletar'); return;
      }
      case 'nivel': toast('⭐ Ganhe XP colhendo, coletando dos animais e completando missões'); return;
      case 'ter': {
        const sub = subDe(k);
        abrir('loja', sub); rolarAte(`[data-construir=${k}]`); apontar_(() => $(`[data-construir=${k}]`)); return;
      }
      case 'animais': {
        const cer = ANIMAIS[k].cercado;
        if (!nTipo(cer) || qtdAnimal(k) >= maxAnimal(k)) { abrir('loja', subDe(cer)); rolarAte(`[data-construir=${cer}]`); apontar_(() => $(`[data-construir=${cer}]`)); if (nTipo(cer)) toast(`Precisa de mais um ${TIPOS[cer].nome.toLowerCase()} para caber mais`); return; }
        abrir('animais'); rolarAte(`[data-animal=${k}]`); apontar_(() => $(`[data-animal=${k}]`)); return;
      }
      case 'terras': fechar(); guiarTerra(); return;
      case 'pet': abrir('animais'); rolarAte(`[data-adotar=${k}]`); apontar_(() => $(`[data-adotar=${k}]`)); return;
      case 'fazer': {
        const fb = item(k).fab, o = S.objetos.find(o => o.tipo === fb);
        if (!o) { abrir('loja', subDe(fb)); rolarAte(`[data-construir=${fb}]`); apontar_(() => $(`[data-construir=${fb}]`)); return; }
        focar(centro(o)); abrir('fabrica', fb); apontar_(() => $(`[data-receita=${k}]`)); return;
      }
      case 'alimentar': {
        const o = S.objetos.find(o => TIPOS[o.tipo].animal && estadoCercado(o).fome) || S.objetos.find(o => TIPOS[o.tipo].animal);
        if (!o) { abrir('loja', 'animais'); rolarAte('[data-construir=galinheiro]'); apontar_(() => $('[data-construir=galinheiro]')); return; }
        if (!qtdAnimal(TIPOS[o.tipo].animal)) { abrir('animais'); return; }
        fechar(); focar(centro(o)); apontar_(null, () => centro(o).add(V3(0, 1.5, 0))); toast('Toque no cercado para dar ração'); return;
      }
    }
  }
  function renderMissoes() {
    encherMissoes();
    const prontas = S.missoes.ativas.filter(m => progMissao(m) >= m.n).length;
    let h = `<button class="mis-ic ${missoesAbertas ? 'aberto' : ''}" data-mis="toggle"><img class="ui-img" src="assets/ui/b_mapa.webp" alt=""><small>Missões</small>${prontas ? `<b class="badge on">${prontas}</b>` : ''}</button><div class="mis-lista">`;
    const lista = missoesAbertas ? S.missoes.ativas : [];
    $('#missoes').classList.toggle('aberta', missoesAbertas);
    lista.forEach((m, i) => {
      const p = progMissao(m), ok = p >= m.n;
      h += `<div class="mis ${ok ? 'ok' : ''}" data-guia="${i}"><div class="mis-txt">${textoMissao(m)} ${ok ? '' : '<span class="mis-ir">👉</span>'}</div>
        <div class="mis-linha"><div class="mis-barra"><i style="width:${100 * p / m.n}%"></i></div><span>${fmtN(p)}/${fmtN(m.n)}</span></div>
        ${ok ? `<button class="btn verde mis-btn" data-mis="${i}">Resgatar ${moedaMini}${fmtN(m.r)}</button>` : `<div class="mis-premio">${moedaMini}${fmtN(m.r)} · ⭐${m.xp}</div>`}</div>`;
    });
    h += '</div>';
    const nlc = typeof CHAT !== 'undefined' ? totalNaoLidas() : 0, bc = $('#badgeChat'); if (bc) { bc.style.display = nlc ? 'block' : 'none'; bc.textContent = nlc > 99 ? '99+' : nlc; }
    const bp = $('#btnPasse'); if (bp) { bp.style.display = !VISITA && S.nivel >= NIVEL_PASSE ? '' : 'none'; const pd = passePode(); bp.classList.toggle('brilha', pd); $('#badgePasse').style.display = pd ? 'block' : 'none'; }
    if (h !== missoesHTML) { missoesHTML = h; $('#missoes').innerHTML = h; }
  }

  // ================= TUTORIAL =================
  const primeiro = f => { const i = S.plots.findIndex((p, j) => tiles[j] && f(p)); return i < 0 ? 0 : i; };
  const celeiroObj = () => S.objetos.find(o => o.tipo === 'celeiro') || S.objetos.find(o => o.tipo === 'armazem');
  const TUT = [
    {txt:'Oi! Eu sou o Tonho. Bem-vindo à <b>Terrália Farm</b>! Vou te mostrar como cuidar da sua fazenda.', botao:'Vamos lá!'},
    {txt:'Toque num <b>canteiro vazio</b> e <b>arraste a sacola de trigo</b> por cima dele.', p3:() => posTile(primeiro(p => !p.c)), el:() => seletorAberto ? $('[data-sem=trigo]') : undefined, ok:() => S.plots.some(p => p.c) || heroi.fila.some(a => a.tipo === 'plantar') || (heroi.atual && heroi.atual.tipo === 'plantar')},
    {txt:'Toda planta precisa de água! Toque na plantinha com a gotinha 💧 e <b>arraste o regador</b> por cima dela.', p3:() => posTile(primeiro(p => p.c && !p.reg)), el:() => seletorAberto ? $('[data-ferr-arr]') : undefined, ok:() => S.plots.some(p => p.c && p.reg)},
    {txt:'Muito bem! Espere crescer, toque nela quando aparecer ✨ e <b>arraste a foice</b> por cima para colher.', p3:() => posTile(primeiro(p => p.c)), el:() => seletorAberto ? $('[data-ferr-arr]') : undefined, ok:() => S.colhidos > 0},
    {txt:'Cada canteiro rende <b>2</b>! A colheita foi para o <b>Celeiro</b>. Toque nele para ver.', p3:() => centro(celeiroObj()).add(V3(0, 3, 0)), el:() => janela ? null : undefined, ok:() => janela === 'celeiro'},
    {txt:'Toque em <b>Vender</b> para trocar um pouco de trigo por moedas. Guarde alguns para plantar de novo!', el:() => $('[data-vender=trigo]') || $('#popVenda .btn.verde'), ok:() => S.stats.vendeu > 0},
    {txt:'Para plantar algo novo, compre na <b>Loja</b>.', el:() => janela ? $('.fechar') : $('.cantos [data-abrir=loja]'), ok:() => janela === 'loja'},
    {txt:'Toque em <b>Comprar</b> no trigo, escolha a quantidade e confirme. Depois é só plantar o que você colhe!', el:() => $('#popVenda.on [data-pv=ok]') || $('[data-compra="planta:trigo"]'), ok:() => S.stats.compras > 0},
    {txt:'Arraste a tela para passear pela fazenda e use a <b>pinça</b> (ou a rodinha) para zoom. No botão <b>🎥 Câmera</b> você gira e trava/destrava a câmera.', el:() => $('[data-grupo=visao]'), botao:'Entendi', entrar:() => fechar()},
    {txt:'Prontinho! Siga as <b>Missões</b> aqui do lado para crescer sua fazenda. Boa colheita! 🌻', el:() => $('#missoes'), botao:'Bora!'},
  ];
  const moinhoObj = () => S.objetos.find(o => o.tipo === 'moinho');
  // 2ª parte do tutorial: aparece quando o jogador constrói o primeiro galinheiro
  const TUTB = [
    {txt:'Que legal, seu primeiro galinheiro! 🐔 Agora compre uma <b>galinha</b> em Animais.', el:() => janela === 'animais' ? $('[data-animal=galinha]') : janela ? $('#jabas [data-abrir=animais]') : $('.cantos [data-abrir=animais]'), ok:() => qtdAnimal('galinha') > 0},
    {txt:'Galinhas só botam ovos depois de comer. Você ganhou rações de presente! Toque no <b>galinheiro</b> para dar ração.', entrar:() => fechar(), p3:() => centro(cercadosDe('galinha')[0]).add(V3(0, 1.5, 0)), el:() => janela ? null : undefined, ok:() => S.stats.alimentou > 0},
    {txt:'Quando a ração acabar, você faz mais no <b>Moinho</b>. A ração é feita de <b>trigo</b> 🌾. Toma 6 trigos de presente!', botao:'Oba!', entrar:() => { S.celeiro.trigo = (S.celeiro.trigo || 0) + 6; renderHotbar(); }},
    {txt:'Plante <b>3 trigos</b>: toque num canteiro vazio e escolha o <b>trigo</b> (ou arraste por vários). Não esqueça de regar!', el:() => janela ? null : seletorAberto ? $('[data-sem=trigo]') : null, ok:() => (S.stats.plantou.trigo || 0) >= 3},
    {txt:'Agora compre um <b>Moinho</b> na loja, na aba Produção.', el:() => janela === 'loja' && subLoja === 'producao' ? $('[data-construir=moinho]') : janela === 'loja' ? $('[data-sub=producao]') : $('.cantos [data-abrir=loja]'), ok:() => nTipo('moinho') > 0},
    {txt:'Escolha o lugar do moinho e toque no <b>✓ verde</b> para comprar.', el:() => editar.ativo ? $('#ferrEdicao [data-ed=ok]') : null, ok:() => !editar.ativo},
    {txt:'Colha o trigo quando ficar pronto ✨ e depois toque no <b>Moinho</b>.', p3:() => centro(moinhoObj()).add(V3(0, 3, 0)), el:() => janela ? null : undefined, ok:() => janela === 'fabrica'},
    {txt:'Toque em <b>Produzir</b> na Ração de galinha (precisa de 3 trigos no armazém; rende 3 porções).', el:() => $('[data-receita=racaoG]'), ok:() => listaMoinhos().some(o => fabEstado('moinho', o.id).fila.length > 0) || (S.stats.fez.racaoG || 0) > 0},
    {txt:'Isso! Quando ficar pronta, toque no moinho para pegar a ração e depois no galinheiro para alimentar. É assim que a fazenda cresce: 🌾 ➜ 🥣 ➜ 🥚 ➜ 💰', botao:'Entendi!'},
  ];
  // ===== Novidades de cada atualização: resumo + mini tutorial (adicione a nova versão no topo) =====
  const NOVIDADES = [
    {v:'0.54', titulo:'🔧 Ajustes nas ilhas', itens:[
        '🧺 Botão <b>Coletar</b>: pega de uma vez tudo que está pronto (mina, bosque, árvores e arbustos)',
        '◀ ▶ Setas na janela do <b>Moinho</b> para trocar entre os seus moinhos',
        '🛒 Em cada ilha, a <b>Loja</b>, os <b>Animais</b> e o <b>Moinho</b> mostram só o que dá para usar lá',
        '🏝️🏰 As ilhas novas ficaram mais enxutas: até 8 lotes, 1 ou 2 cercados, 3 de cada árvore e até 3 minas e 3 bosques. O que passava do limite saiu (as plantas voltaram para o celeiro)',
        '🪙 O saldo de moedas agora aparece só na Loja e no Armazém',
        '🌳 Banana e cacau agora dão em árvores: quem tinha plantado recebeu as frutas de volta',
        '🏰 Agora dá para liberar todas as terras da Ilha Medieval']},
    {v:'0.53', id:'medieval', titulo:'🏰 Chegou a Ilha Medieval!', nivel:NIVEL_MEDIEVAL,
      itens:['⛵ No <b>Porto</b>, a partir do nível 45, viaje para uma ilha <b>hexagonal</b> com um castelo no meio',
        '⛏️ <b>Sem plantação</b>: tudo se coleta. A <b>mina</b> dá pedra, ferro e carvão; o <b>bosque</b> dá madeira; e tem amora, framboesa e cogumelos',
        '🔨 Oficinas novas: <b>Ferraria</b>, <b>Carpintaria</b>, <b>Cozinha do castelo</b> e <b>Joalheria</b> (com ouro, rubi e safira da mina)',
        '🏰 Restaure o <b>castelo</b> em 3 níveis: cada nível faz a mina e o bosque darem mais',
        '🦋 <b>Caçada mágica</b>: pegue criaturinhas com a redinha, complete o <b>álbum</b> e ganhe a Árvore encantada',
        '💡 Um <b>ajudante</b> agora dá dicas quando você fica parado sem saber o que fazer',
],
      passos:[
        {txt:'Para ir à Ilha Medieval você precisa do <b>⚓ Porto</b>. Abra a <b>Loja</b>.', el:() => janela === 'loja' ? null : janela ? $('#jabas [data-abrir=loja]') : $('.cantos [data-abrir=loja]'), ok:() => S.porto || TROP || MED || janela === 'loja'},
        {txt:'Vá na aba <b>Fazenda</b> e compre o Porto.', el:() => { if (janela === 'loja' && subLoja === 'fazenda') { const b = $('[data-acao=comprar-porto]'); if (b) b.scrollIntoView({block:'nearest', inline:'center'}); return b; } return janela === 'loja' ? $('[data-sub=fazenda]') : $('.cantos [data-abrir=loja]'); }, ok:() => !!S.porto || TROP || MED},
        {txt:'Agora toque no <b>⚓ Porto</b> lá na praia.', entrar:() => { fechar(); if (porto3D) focar(porto3D.userData.pick.getWorldPosition(V3())); }, el:() => janela ? null : undefined, p3:() => porto3D ? porto3D.userData.pick.getWorldPosition(V3()).add(V3(0, 2, -2)) : null, ok:() => janela === 'porto'},
        {txt:'Toque em <b>Viajar</b> na Ilha Medieval! 🏰', el:() => janela === 'porto' ? $('[data-acao=viajar][data-ilha=medieval]') : null, ok:() => MED, botao:'Depois'}]},
    {v:'0.53', titulo:'🏝️ Chegou a Ilha Tropical!', nivel:NIVEL_PORTO,
      itens:['⚓ <b>Porto</b> (nível 30): compre na Loja › Fazenda e viaje de barco para uma ilha <b>redonda</b>, com lagoa, cachoeira e vulcão',
        '🌿 Plantas só de lá: <b>mandioca, batata-doce, abacaxi, maracujá, gengibre, pimenta e baunilha</b>',
        '🌳 Árvores: <b>bananeira, coqueiro, mangueira, cacaueiro e açaizeiro</b> · 🐐 <b>Cabra</b> e 🐃 <b>Búfalo</b>',
        '🏭 Fábricas novas: <b>Casa de Sucos, Tapiocaria, Chocolateria, Quiosque da praia, Açaiteria e Perfumaria</b>',
        '✨ <b>Achados raros</b>: conchas, pérolas, cristais e a semente da <b>orquídea dourada</b>, para decorações exclusivas',
        '🌧️ <b>Chuva tropical</b> que rega tudo e adianta as plantas · 🎣 <b>Rede de pesca</b> no píer',
        '🚢 <b>Pedido do barco</b>: 3 caixas a cada 6 horas, às vezes um pedido ✨ especial',
        '📦 Celeiro, armazém, moedas e nível são os mesmos nas duas ilhas',
        '🏰 <b>Decorações medievais</b> na Loja › Decoração (do nível 20 ao 55) e um <b>porto medieval</b> novo na ilha principal',
        '⚖️ <b>Açúcar e óleo</b> agora saem em 8 minutos: doces, sorvetes e tortas ficaram bem mais rápidos',
        '⭐ Agora você vê o <b>XP</b> de cada coisa, a <b>%</b> do nível e os ganhos subindo na tela'],
      passos:[
        {txt:'Vamos pegar o <b>Porto</b>! Abra a <b>Loja</b>.', el:() => janela === 'loja' ? null : janela ? $('#jabas [data-abrir=loja]') : $('.cantos [data-abrir=loja]'), ok:() => S.porto || janela === 'loja'},
        {txt:'Vá na aba <b>Fazenda</b>.', el:() => janela === 'loja' ? $('[data-sub=fazenda]') : $('.cantos [data-abrir=loja]'), ok:() => S.porto || (janela === 'loja' && subLoja === 'fazenda')},
        {txt:'Compre o <b>⚓ Porto</b>. Ele aparece na praia da sua fazenda.', el:() => { if (janela === 'loja' && subLoja === 'fazenda') { const b = $('[data-acao=comprar-porto]'); if (b) b.scrollIntoView({block:'nearest', inline:'center'}); return b; } return janela === 'loja' ? $('[data-sub=fazenda]') : $('.cantos [data-abrir=loja]'); }, ok:() => !!S.porto},
        {txt:'Agora toque no <b>⚓ Porto</b> lá na praia.', entrar:() => { fechar(); if (porto3D) focar(porto3D.position.clone().add(V3(1, 0, MEIA + 1))); }, el:() => janela ? null : undefined, p3:() => porto3D ? V3(1.65, 1.6, MEIA - .4) : null, ok:() => janela === 'porto'},
        {txt:'Aqui você <b>viaja</b> para a Ilha Tropical, recolhe a <b>rede de pesca</b> e entrega o <b>pedido do barco</b>. Tudo de novo só existe lá! 🏝️', botao:'Entendi!', el:() => janela === 'porto' ? $('[data-acao=viajar]') : null}]},
  ];
  // tutoriais extras: chegada na Ilha Medieval e o passeio pelos menus para quem está começando
  const TUT_EXTRA = {
    medChegada:[
      {txt:'Bem-vindo à <b>Ilha Medieval</b>! 🏰 Aqui não se planta: tudo se <b>coleta</b>. Toque na <b>Mina</b> ⛏️ para pegar pedra, ferro e carvão.', p3:() => { const o = S.objetos.find(o => o.tipo === 'mina'); return o ? centro(o).add(V3(0, 2.4, 0)) : null; }, el:() => janela ? null : undefined, ok:() => (S.stats.colheu.pedra || 0) > 0},
      {txt:'Isso! A mina, o <b>bosque</b> 🌲 e os pés de frutinhas voltam a encher sozinhos. Toque no <b>bosque</b> para pegar madeira.', p3:() => { const o = S.objetos.find(o => o.tipo === 'bosque'); return o ? centro(o).add(V3(0, 2.6, 0)) : null; }, el:() => janela ? null : undefined, ok:() => (S.stats.colheu.madeira || 0) > 0},
      {txt:'No meio da ilha fica o seu <b>castelo em ruínas</b>. Toque nele para ver o que precisa para restaurar!', entrar:() => focar(V3(0, 0, 0)), p3:() => V3(0, 3, 0), el:() => janela ? null : undefined, ok:() => janela === 'castelo'},
      {txt:'Pedra, madeira e ferro restauram o castelo, e cada nível deixa a mina e o bosque mais generosos. 💪', botao:'Legal!', el:() => janela === 'castelo' ? $('[data-acao=castelo-subir]') : null},
      {txt:'Agora a diversão: a <b>Caçada mágica</b> 🦋! Toque no botão aqui embaixo.', entrar:() => fechar(), el:() => janela === 'cacada' ? $('[data-acao=cacada-ir]') : $('#btnCacada'), ok:() => janela === 'cacada' || (S.stats.cacadas || 0) > 0},
      {txt:'Pegue as criaturinhas com a redinha e complete o <b>álbum</b>! Na Loja › Produção tem a <b>Ferraria</b>, a <b>Carpintaria</b> e a <b>Cozinha do castelo</b>. Divirta-se! 🏰', botao:'Bora!'},
    ],
    tour:[
      {txt:'Vou te mostrar os botões! 👀 Esta é a <b>Loja</b>: sementes, construções, animais e decorações.', el:() => $('.cantos [data-abrir=loja]'), botao:'Próximo'},
      {txt:'No <b>Armazém</b> você vende o que produziu e ganha moedas 🪙.', el:() => $('.cantos [data-abrir=armazem]'), botao:'Próximo'},
      {txt:'Em <b>Animais</b> você cuida dos bichinhos e compra mais para produzir mais.', el:() => $('.cantos [data-abrir=animais]'), botao:'Próximo'},
      {txt:'As <b>Missões</b> dizem o que fazer e dão prêmios. Toque nelas para a mãozinha mostrar o caminho!', el:() => $('#missoes'), botao:'Próximo'},
      {txt:'O <b>Passe</b> 🎁 tem um presente por dia. Quando ele brilhar, tem prêmio para pegar!', el:() => $('#btnPasse'), botao:'Próximo'},
      {txt:'Na <b>engrenagem</b> ⚙️ ficam o som, o tamanho dos textos, sua conta e as novidades.', el:() => $('[data-abrir=config]'), botao:'Próximo'},
      {txt:'E em <b>Social</b> 👥 você visita amigos, ajuda e vê o ranking. Agora é com você! 🌻', el:() => $('[data-grupo=social]'), botao:'Bora jogar!'},
    ],
  };
  const novidadePasso = () => { if (TUT_EXTRA[S.tutNv]) return TUT_EXTRA[S.tutNv]; const n = NOVIDADES.find(n => (n.id || n.v) === S.tutNv); return n && n.passos ? n.passos : []; };
  function iniciarTutExtra(k) { if (VISITA || tutAtual()) return; S.tutNv = k; S.tutN = 0; const T = tutAtual(); if (T && T.lista[0].entrar) T.lista[0].entrar(); mostrarTutorial(); salvar(); }
  function novidadesNaoVistas() { const v = S.novVista || '0'; return NOVIDADES.filter(n => parseFloat(n.v) > parseFloat(v) && parseFloat(n.v) <= parseFloat(VERSAO)); }
  function mostrarNovidades() { // ao entrar depois de atualizar: abre o resumo (1× por versão)
    if (VISITA || !S.perfil || S.tut !== -1 || janela || tutAtual()) return false;
    if (!novidadesNaoVistas().length) { if (S.novVista !== VERSAO) S.novVista = VERSAO; return false; }
    abrir('novidades'); return true;
  }
  function htmlNovidades() {
    const lista = (novidadesNaoVistas().length ? novidadesNaoVistas() : NOVIDADES.slice(0, 2)).slice().sort((a, b) => (S.nivel >= (b.nivel || 1)) - (S.nivel >= (a.nivel || 1))); // o que já dá para usar vem primeiro
    let h = '';
    lista.forEach((n, i) => {
      const pode = S.nivel >= (n.nivel || 1);
      h += `<div class="nov-bloco"><div class="nov-cab"><span class="nov-v">Versão ${n.v}</span><b>${n.titulo}</b></div><ul class="nov-lista">${n.itens.map(t => `<li>${t}</li>`).join('')}</ul>`
        + (n.passos ? (pode ? `<button class="btn verde" data-acao="nov-tut" data-v="${n.id || n.v}">👉 Me mostra como</button>` : `<div class="nov-trava">🔒 Libera no nível ${n.nivel} · faltam ${n.nivel - S.nivel} níveis</div>`) : '') + '</div>';
    });
    return h + `<div class="nov-rodape"><button class="btn" data-acao="nov-ok">Fechar</button></div>`;
  }
  function tutAtual() {
    if (S.tut >= 0 && S.tut < TUT.length) return {lista:TUT, i:S.tut, chave:'tut'};
    if (S.tutN >= 0 && S.tutN < novidadePasso().length) return {lista:novidadePasso(), i:S.tutN, chave:'tutN'};
    if (S.tutB >= 0 && S.tutB < TUTB.length) return {lista:TUTB, i:S.tutB, chave:'tutB'};
    return null;
  }
  const balao = $('#tutorial'), mao = $('#maozinha');
  function mostrarTutorial() {
    const T = S.perfil ? tutAtual() : null, ativo = !!T;
    document.body.classList.toggle('em-tutorial', ativo && T.chave !== 'tutN' && T.i < T.lista.length - 1); // os tutoriais extras não escondem os botões (eles são o assunto)
    balao.style.display = ativo ? 'flex' : 'none';
    if (!ativo) { mao.style.display = 'none'; return; }
    const st = T.lista[T.i];
    balao.querySelector('.tut-txt').innerHTML = st.txt;
    const b = balao.querySelector('[data-tut=prox]'); b.style.display = st.botao ? '' : 'none'; b.textContent = st.botao || '';
  }
  function avancarTutorial() {
    const T = tutAtual(); if (!T) return;
    S[T.chave]++;
    if (S[T.chave] >= T.lista.length) { S[T.chave] = -1; if (T.chave === 'tut') { S.novVista = VERSAO; S.tourVisto = 1; setTimeout(() => iniciarTutExtra('tour'), 2500); } /* quem acabou de começar não precisa das novidades antigas; ganha o passeio pelos menus */ toast(T.chave === 'tut' ? '🎉 Tutorial concluído! Bom jogo!' : T.chave === 'tutN' ? (S.tutNv === 'tour' ? '🌻 Agora você conhece os menus!' : '🎉 Pronto! Aproveite a novidade.') : '🎉 Agora você sabe cuidar dos animais!', 'ouro'); }
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
  // ganhos subindo do HUD: amarelo para moedas, azul para XP (somados quando vêm juntos)
  let ultMoedas = null; const popAcum = {ouro:0, xp:0}, popTimer = {};
  function popGanho(tipo, v) {
    if (!(v > 0)) return; popAcum[tipo] += v; if (popTimer[tipo]) return;
    popTimer[tipo] = setTimeout(() => { const n = Math.round(popAcum[tipo]); popAcum[tipo] = 0; popTimer[tipo] = null; if (!n) return;
      const ref = $(tipo === 'ouro' ? '#moedas' : '#xptxt'); if (!ref) return; const r = ref.getBoundingClientRect();
      const el = document.createElement('div'); el.className = 'pop-ganho ' + tipo; el.innerHTML = tipo === 'ouro' ? `+${fmtN(n)} <i class="pg-moeda"></i>` : `+${fmtN(n)} <b>XP</b>`;
      el.style.left = (r.left + r.width / 2) + 'px'; el.style.top = (r.bottom + 6) + 'px'; document.body.appendChild(el); setTimeout(() => el.remove(), 1500); }, 140);
  }
  function renderHUD() {
    $('#moedas').textContent = fmtN(S.moedas); { const sj = $('#saldoJ b'); if (sj) sj.textContent = fmtN(S.moedas); }
    $('#nivel').textContent = S.nivel;
    const prox = xpProx(S.nivel);
    $('#xpbar').style.width = (100 * S.xp / prox) + '%';
    $('#xptxt').innerHTML = `${fmtN(S.xp)} / ${fmtN(prox)} XP <b class="xp-pct">${Math.floor(100 * S.xp / prox)}%</b>`;
    if (ultMoedas != null && S.moedas > ultMoedas && !VISITA) popGanho('ouro', S.moedas - ultMoedas); ultMoedas = S.moedas; // moedinha subindo quando ganha
    const tot = VENDAVEIS.reduce((a, c) => a + (S.celeiro[c.id] || 0), 0);
    const b = $('#badgeArmazem'), ch = usoArmazem() >= capArmazem(); b.style.display = ch ? 'block' : 'none'; b.textContent = 'cheio'; b.classList.add('cheio'); // só avisa quando o armazém lota
    const pend = S.objetos.filter(o => TIPOS[o.tipo].animal).reduce((a, o) => a + estadoCercado(o).prontos, 0);
    { let bt = $('#btnColetar'); const n = VISITA ? 0 : prontosPomar().length;
      if (!bt && n) { bt = document.createElement('button'); bt.className = 'gbtn'; bt.id = 'btnColetar'; bt.addEventListener('click', coletarTudo); bt.innerHTML = '<i class="emo-gbtn">🧺</i><span>Coletar</span><b class="badge" id="badgeColetar"></b>'; $('.cantos.esq').appendChild(bt); }
      if (bt) { bt.style.display = n >= 1 ? '' : 'none'; $('#badgeColetar').style.display = 'block'; $('#badgeColetar').textContent = n; } }
    { const bc = $('#badgeCacada'); if (bc) { const r = estCacada().redes; bc.style.display = r ? 'block' : 'none'; bc.textContent = r; } }
    const ba = $('#badgeAnimais'); ba.style.display = pend ? 'block' : 'none'; ba.textContent = pend > 99 ? '99+' : pend;
    $('#dicaCampo').textContent = dicaFerramenta();
  }
  // barra de baixo: Colher, Regar e Plantar (a semente é escolhida num painel acima da barra)
  let seletorAberto = false, destaqueSem = null;
  const semAtual = () => { const c = crop(S.semSel) && crop(S.semSel).nivel <= S.nivel ? crop(S.semSel) : CROPS[0]; return c; };
  function renderHotbar() {
    const plantando = !!crop(S.ferramenta);
    const slot = (id, ico, nome, qtd, ativo, extra = '') => `<button class="slot ${ativo ? 'ativo' : ''} ${extra}" data-ferr="${id}"><span class="ico">${ico}</span><small>${nome}</small>${qtd != null ? `<span class="qtd">${qtd}</span>` : ''}</button>`;
    const c = semAtual(), q = S.celeiro[c.id] || 0;
    const hb = slot('mao', ICO.cesta, 'Colher', null, S.ferramenta === 'mao') + slot('regador', ICO.regador, 'Regar', null, S.ferramenta === 'regador')
      + slot('plantar', ICO.saco + `<span class="emo">${emojiItem(c)}</span>`, 'Plantar', q, plantando, (q ? '' : 'vazio ') + 'plantar' + (seletorAberto ? ' aberto' : '')).replace('</button>', '<span class="seta">▲</span></button>');
    if (hb !== hotbarHTML) { hotbarHTML = hb; $('#hotbar').innerHTML = hb; }
    renderSeletor();
  }
  let hotbarHTML = '';
  let alvoPlantio = null, paginaSem = 0;
  let modoSel = 'sementes';
  const FOICE = '<svg viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg" stroke-linejoin="round" stroke-linecap="round"><path d="M14 10c22-6 42 6 44 26-10-14-26-18-40-12z" fill="#dfe6ee" stroke="#3b4652" stroke-width="3.2"/><path d="M20 14c14-3 28 2 34 12" stroke="#fff" stroke-width="2.4" fill="none" opacity=".8"/><path d="M18 24l-8 34" stroke="#7a4a1c" stroke-width="7"/><path d="M18 24l-8 34" stroke="#c98640" stroke-width="3.5"/><circle cx="17" cy="25" r="4" fill="#59606a" stroke="#2c333b" stroke-width="2"/></svg>';
  function abrirFerramenta(modo, i) {
    if (VISITA) return; alvoPlantio = i; modoSel = modo; abrirSeletor(true); verificarTutorial();
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
    const lib = CROPS.filter(c => c.nivel <= S.nivel && podeAqui(c)), k = lib.findIndex(c => c.id === semAtual().id); paginaSem = Math.max(0, Math.floor(k / 6));
    abrirSeletor(true); verificarTutorial();
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
      el.innerHTML = `<div class="tempo-card"><div class="tc-anel" style="--p:${pr}"><span>${emojiItem(c)}</span></div><div class="tc-txt"><b data-tc-tempo="1">${fmtT(restante(p) / 1000)}</b><small>${c.nome} · <span data-tc-pct="1">${pr}</span>%</small>${avisos.length ? `<em>${avisos.join(' · ')}</em>` : ''}</div></div>` + (bts.length ? `<div class="sel-lista ferr">${bts.join('')}</div>` : '');
      posicionarSeletor(); return;
    }
    if (modoSel !== 'sementes') {
      const col = modoSel === 'colher';
      el.innerHTML = `<div class="sel-lista ferr"><button class="sem ferr-arr" data-ferr-arr="${modoSel}"><span class="ico">${col ? FOICE : ICO.regador}</span><small>${col ? 'Foice' : 'Regador'}</small></button></div>`;
      posicionarSeletor(); return;
    }
    const atual = semAtual().id, lib = CROPS.filter(c => c.nivel <= S.nivel && podeAqui(c)), pags = Math.ceil(lib.length / 6); paginaSem = Math.min(paginaSem, pags - 1);
    el.innerHTML = '<div class="sel-linha">' + (pags > 1 ? `<button class="pg" data-sel="ant" ${paginaSem ? '' : 'disabled'}>◀</button>` : '') + '<div class="sel-lista pag">' + lib.slice(paginaSem * 6, paginaSem * 6 + 6).map(c => { const q = S.celeiro[c.id] || 0;
      return `<button class="sem ${c.id === atual ? 'ativo' : ''} ${q ? '' : 'vazio'}" data-sem="${c.id}"><span class="ico">${ICO.saco}<span class="emo">${emojiItem(c)}</span></span><small>${c.nome}</small>${q ? `<span class="qtd">${q}</span>` : '<span class="mais" data-comprar-sem="1">+</span>'}</button>`; }).join('') + '</div>' + (pags > 1 ? `<button class="pg" data-sel="prox" ${paginaSem < pags - 1 ? '' : 'disabled'}>▶</button>` : '') + '</div>';
    posicionarSeletor();
  }
  let molduraSel = null; // moldura amarela no canteiro tocado
  function abrirSeletor(v) {
    seletorAberto = v; if (!v) alvoPlantio = null; document.body.classList.toggle('seletor-aberto', !!v);
    if (!molduraSel) { const g = new THREE.Group(), m = new THREE.MeshBasicMaterial({color:C(0xffd23f), transparent:true, opacity:.95, depthWrite:false}), L = G * .94, e = .2;
      [[0, -L / 2, L + e, e], [0, L / 2, L + e, e], [-L / 2, 0, e, L], [L / 2, 0, e, L]].forEach(([x, z, w, d]) => { const b = new THREE.Mesh(new THREE.BoxGeometry(w, .06, d), m); b.position.set(x, 0, z); g.add(b); });
      g.renderOrder = 3; scene.add(g); molduraSel = g; }
    molduraSel.visible = v && alvoPlantio != null;
    if (molduraSel.visible) { molduraSel.position.copy(posTile(alvoPlantio)); molduraSel.position.y += .32; }
    renderSeletor();
  }

  let janela = null, zonaSel = null;
  const TITULOS = {castelo:'🏰 Castelo', cacada:'🦋 Caçada mágica', album:'📖 Álbum de criaturas', novidades:'🎉 Novidades', fabrica:'Fábrica', loja:'Loja', celeiro:'Celeiro', armazem:'Armazém', animais:'Animais', galpao:'Galpão', ajuda:'Como jogar', config:'Configurações', reset:'Recomeçar?', zona:'Terra nova', moinho:'Moinho', nome:'Nome do bichinho', perfil:'Seu personagem', pedidos:'🚚 Pedidos', porto:'⚓ Porto', passe:'🎁 Passe do Fazendeiro', amigos:'👥 Amigos', banca:'🏪 Banca', ranking:'🏆 Ranking', nuvem:'☁️ Qual fazenda usar?', contas:'👥 Trocar de conta', nomeRank:'✏️ Nome no ranking'};
  let janelaArg = null, perfilTemp = null;
  const ABAS = ['armazem', 'celeiro', 'galpao']; // só estas três dividem a mesma janela
  const SUBLOJA = {sementes:'🌱 Plantas', producao:'🏭 Produção', animais:'🐄 Animais', fazenda:'🏡 Fazenda', decoracao:'🌸 Decoração', melhorias:'⚡ Melhorias', insumos:'🧪 Adubos', materiais:'🧰 Materiais', guardados:'📦 Guardados'};
  // em qual aba da loja fica cada construção
  const GRUPO_LOJA = {producao:['moinho', 'padaria', 'laticinio', 'tecelagem', 'cozinha', 'engenho', 'docaria', 'sorveteria', 'sucos', 'tapiocaria', 'chocolateria', 'quiosque', 'acaiteria', 'perfumaria', 'ferraria', 'carpintaria', 'cozinhaReal', 'joalheria'],
    animais:['galinheiro', 'curral', 'pasto', 'coelheira', 'lagoinha', 'chiqueiro', 'apiario', 'aprisco', 'bufalario', 'casinhaPet']};
  const SECOES_DECOR = [['🌿 Natureza', ['flores', 'jardim', 'arvoreDec']], ['🪵 Cercas e caminhos', ['caminho', 'cercaDec', 'cercaMadeira', 'porteira']],
    ['🛢️ Enfeites', ['banco', 'bancoRustico', 'espantalho', 'poste', 'caixotes', 'barris', 'carroca', 'tecidos', 'carrinho', 'fonte']], ['🏠 Casas', ['casinhaA', 'casinhaB', 'taverna']], ['🏰 Medieval', ['feiraMed', 'casaMed', 'pracaMed', 'torreMed', 'muralhaMed', 'moinhoMed', 'temploMed', 'casteloMed']], ['🏝️ Ilha Tropical · achados raros', ['flamingo', 'cabanaTiki', 'farol', 'estatuaConcha']]];
  const subDe = t => decDe(t) ? 'decoracao' : GRUPO_LOJA.producao.includes(t) ? 'producao' : GRUPO_LOJA.animais.includes(t) ? 'animais' : 'fazenda';
  let subLoja = 'sementes', vitrineChave = '', abaCfg = 'som';
  function abrir(nome, sub) {
    if (VISITA && nome !== 'config') { toast('Você está visitando. Volte para casa para usar isso 🏠'); return; }
    if (editar.ativo && nome !== 'config') return;
    if (nome === 'melhorias' || nome === 'construir' || nome === 'decoracao') { sub = nome === 'construir' ? 'construcoes' : nome; nome = 'loja'; }
    if (nome === 'coop' || nome === 'amigos') { SOC.aba = nome === 'coop' ? 'coop' : 'amigos'; nome = 'amigos'; }
    if (nome === 'ranking') ON.rank = null;
    if (nome === 'amigos') { SOC.amigos = null; COOP.meu = undefined; }
    if (nome === 'banca') { BAN.ofertas = null; clearInterval(BAN.timer); BAN.timer = setInterval(() => { if (janela === 'banca' && !document.hidden) carregarBanca(true); else if (janela !== 'banca') clearInterval(BAN.timer); }, 20000); }
    if (sub === 'construcoes') sub = 'producao';
    if (nome === 'loja') subLoja = sub || (janela === 'loja' ? subLoja : 'sementes');
    if (nome === 'nome' || nome === 'fabrica') janelaArg = sub;
    if (nome === 'moinho') { nome = 'fabrica'; janelaArg = 'moinho'; }
    if (nome === 'perfil') { perfilTemp = Object.assign(avPadrao(), S.perfil && S.perfil.avatar); previaAvatar(perfilTemp); }
    janela = nome; $('#fundo').classList.add('aberto'); renderJanela(); verificarTutorial(); }
  function fechar() { if (janela === 'perfil' && !S.perfil) return; janela = null; $('#fundo').classList.remove('aberto'); if (!S.viuAjuda) { S.viuAjuda = true; salvar(); } if (typeof verificarTutorial === 'function') verificarTutorial(); }
  function renderJanela() {
    if (!janela) return;
    $('#jtitulo').innerHTML = `<span class="contorno">${janela === 'fabrica' ? FABRICAS[janelaArg].emoji + ' ' + FABRICAS[janelaArg].nome + (janelaArg === 'moinho' && listaMoinhos().length > 1 ? ' ' + numMoinho(fabEstadoId()) : '') : TITULOS[janela]}</span>`;
    $('#saldoJ').innerHTML = ['loja', 'armazem'].includes(janela) ? `${UI('moeda')}<b>${fmtN(S.moedas)}</b>` : ''; // saldo sempre à vista dentro das janelas
    $('#jabas').innerHTML = ABAS.includes(janela) ? ABAS.map(k => `<button data-abrir="${k}" class="${k === janela ? 'ativa' : ''}">${TITULOS[k]}</button>`).join('') : '';
    $('.janela').classList.toggle('ani', janela === 'animais'); $('.janela').classList.toggle('cfg', janela === 'config');
    $('.janela').classList.toggle('larga', ['loja', 'armazem', 'celeiro', 'animais', 'galpao', 'pedidos', 'banca', 'passe'].includes(janela));
    let h = '';
    const tile = o => `<div class="tile ${o.trava ? 'trava' : ''} ${o.cls || ''}" ${o.attr || ''}>
      ${o.selo ? `<span class="selo ${o.seloCls || ''}">${o.selo}</span>` : ''}
      <div class="t-ic">${o.ic}</div><div class="t-nome">${o.nome}</div>
      <div class="t-info">${o.info}</div><div class="t-acao">${o.acao}</div></div>`;

    if (janela === 'loja') {
      // loja em "vitrine": cartões grandes lado a lado, rolando para o lado
      const DICAS = {sementes:'Compre algumas para começar. Depois é só plantar o que você colhe: cada colheita rende 2!', insumos:'Toque numa planta crescendo e arraste o adubo ou o spray por cima dela.', producao:'Fábricas transformam o que você colhe em produtos que valem mais.', animais:'Casas dos bichos e bichinhos de estimação.', fazenda:'Canteiros, árvores de fruta e terras novas. Depois de escolher, arraste e toque ✓ para comprar.',
        decoracao:'Só deixam a fazenda mais bonita. Dá para vender pela metade no modo edição.', melhorias:'Fazem você ganhar mais e trabalhar mais rápido.', materiais:'Só para testes: materiais pelo dobro do preço de venda.'};
      h += `<div class="loja-topo"><div class="subabas">${Object.entries(SUBLOJA).map(([k, v]) => `<button data-sub="${k}" class="${k === subLoja ? 'ativa' : ''}">${v}</button>`).join('')}${subLoja === 'fazenda' ? '<button class="editar-sub" data-acao="editar">✏️ Editar fazenda</button>' : ''}</div>
        <p class="dica">${DICAS[subLoja]}</p></div><div class="vitrine">`;
      if (subLoja === 'sementes' && MED) h += '<div class="tile larga"><div class="t-ic"><span class="emo-g">🏰</span></div><div class="t-nome">Aqui não se planta!</div><div class="t-info"><span class="desc">Na Ilha Medieval tudo se coleta: mina, bosque e pés de frutinhas voltam a encher sozinhos. Veja em Loja › Fazenda.</span></div><div class="t-acao"></div></div>';
      if (subLoja === 'sementes') CROPS.filter(c => podeAqui(c)).forEach(c => {
        const trava = S.nivel < c.nivel, t = c.tempo * velocidade(), q = S.celeiro[c.id] || 0;
        h += tile({trava, cls:c.id === destaqueSem ? 'destaque' : '', attr:`data-card-sem="${c.id}"`,
          selo:trava ? `🔒 Nível ${c.nivel}` : q ? `Você tem ${q}` : c.soAchado ? '✨ Raro' : '', seloCls:trava ? 'trava' : '',
          ic:ITEM_IMG[c.id] ? `<span class="img-g">${UI(ITEM_IMG[c.id])}</span>` : `<span class="emo-card">${c.emoji}</span>`, nome:c.nome,
          info:`<span>⏱ ${fmtT(t)}</span><span>Colhe 2 · vende ${moedaMini}${c.preco} cada</span><span class="xp-info">⭐ ${c.xp} XP cada</span>${c.ilha && c.ilha !== ILHA ? `<span class="so-ilha">${c.ilha === 'tropical' ? '🏝️' : '🏡'} cresce só na ${NOME_ILHA[c.ilha]}</span>` : ''}`,
          acao:trava ? '' : c.soAchado ? '<span class="so-ilha">✨ Só vem em achados raros</span>' : `<button class="btn verde" data-compra="planta:${c.id}" ${S.moedas < precoPlanta(c) ? 'disabled' : ''}>Comprar · ${moedaMini}${precoPlanta(c)}</button>`});
      });
      if (subLoja === 'materiais') Object.keys(MATERIAIS).forEach(k => {
        const m = MATERIAIS[k], pr = MAT_PRECO[k] * 2, q = (S.mat || {})[k] || 0;
        h += tile({selo:q ? `Você tem ${q}` : '', ic:`<span class="mat-card">${matIco(k)}</span>`, nome:m.nome, info:`<span>Usado para ampliar ${m.para === 'ilha' ? 'a ilha' : m.para === 'celeiro' ? 'o celeiro' : 'o armazém'}</span>`,
          acao:`<button class="btn verde" data-compra="mat:${k}" ${S.moedas < pr ? 'disabled' : ''}>Comprar · ${moedaMini}${pr}</button>`});
      });
      if (subLoja === 'guardados') { const gs = S.guardados || [];
        if (!gs.length) h += `<div class="vazio-msg">📦 Nada guardado ainda.<br><small>No modo edição, toque numa construção ou decoração e use o botão 📦 para guardar. Ela fica aqui para colocar de volta quando quiser, de graça.</small></div>`;
        gs.forEach(g => { const T = TIPOS[g.tipo], c = consDe(g.tipo) || decDe(g.tipo) || {};
          h += tile({selo:'Guardado', ic:iconeLoja(g.tipo, c.icone || '📦'), nome:T.nome, info:`<span class="desc">${g.tipo === 'lote' ? 'Terra com 4 canteiros' : 'Volta do jeito que estava'}</span>`,
            acao:`<button class="btn verde" data-colocar="${g.uid}">Colocar · grátis</button>`}); }); }
      if (subLoja === 'insumos') Object.entries(INSUMOS).filter(([k, n]) => !n.fora).forEach(([k, n]) => {
        const trava = S.nivel < n.nivel, q = qtdIns(k);
        h += tile({trava, selo:trava ? `🔒 Nível ${n.nivel}` : q ? `Você tem ${q}` : '', seloCls:trava ? 'trava' : '',
          ic:`<span class="emo-card">${n.emoji}</span>`, nome:n.nome, info:`<span class="desc">${n.desc}</span>`,
          acao:trava ? '' : `<button class="btn verde" data-compra="insumo:${k}" ${S.moedas < n.preco ? 'disabled' : ''}>Comprar · ${moedaMini}${n.preco}</button>`});
      });
      const cardCons = c => { const T = TIPOS[c.tipo], n = nTipo(c.tipo), noTeto = noMaximo(c.tipo), nv = nivelConstrucao(c.tipo), trava = !noTeto && S.nivel < nv, custo = custoConstrucao(c.tipo), feito = (c.unico && n > 0) || noTeto, lim = LIMITES[c.tipo];
        if (!podeAqui(c)) return tile({trava:true, selo:`${c.ilha === 'tropical' ? '🏝️' : '🏡'} ${NOME_ILHA[c.ilha]}`, seloCls:'trava', ic:iconeLoja(c.tipo, c.icone), nome:T.nome, info:`<span class="desc">${c.desc}</span><span class="so-ilha">Construa na ${NOME_ILHA[c.ilha]} (pelo ⚓ Porto${c.ilha === 'tropical' ? `, nível ${NIVEL_PORTO}` : ''})</span>`, acao:''});
        return tile({trava:trava && !n, selo:noTeto ? `Máximo · ${nPosse(c.tipo)}/${teto(c.tipo)}` : trava ? `🔒 ${n ? 'Próximo no nível' : 'Nível'} ${nv}` : lim ? `${n}/${Math.max(n, maxPermitido(c.tipo))}` : n && !feito ? `Você tem ${n}` : '', seloCls:trava ? 'trava' : '',
          ic:iconeLoja(c.tipo, c.icone), nome:T.nome, info:`<span class="desc">${c.desc}</span>`,
          acao:trava ? '' : noTeto ? '<span class="ok">✓ No máximo</span>' : feito ? '<span class="ok">✓ Construído</span>' : `<button class="btn verde" data-construir="${c.tipo}" ${S.moedas < custo ? 'disabled' : ''}>${moedaMini}${fmtN(custo)}</button>`}); };
      const ordemNv = (a, b) => podeAqui(b) - podeAqui(a) || nivelConstrucao(a.tipo) - nivelConstrucao(b.tipo) || custoConstrucao(a.tipo) - custoConstrucao(b.tipo);
      if (subLoja === 'producao' || subLoja === 'animais') CONSTRUCOES.filter(c => GRUPO_LOJA[subLoja].includes(c.tipo) && podeAqui(c)).sort(ordemNv).forEach(c => h += cardCons(c));
      if (subLoja === 'fazenda') {
        const livres = ZONAS.filter(z => !S.zonas.includes(z.key)).length;
        h += secaoLoja('🌾 Plantio');
        CONSTRUCOES.filter(c => subDe(c.tipo) === 'fazenda' && podeAqui(c)).sort(ordemNv).forEach(c => h += cardCons(c));
        h += secaoLoja('🗺️ Terras e ilha');
        if (!TROP && !MED) h += tile({trava:S.nivel < NIVEL_PORTO, selo:S.porto ? '✓ Construído' : S.nivel < NIVEL_PORTO ? `🔒 Nível ${NIVEL_PORTO}` : 'Novo!', seloCls:S.nivel < NIVEL_PORTO ? 'trava' : '', ic:'<span class="emo-g">⚓</span>', nome:'Porto',
          info:'<span class="desc">Fica na praia. O barco leva você até a 🏝️ Ilha Tropical e traz pedidos grandes.</span>',
          acao:S.porto ? '<button class="btn" data-abrir="porto">Abrir</button>' : S.nivel < NIVEL_PORTO ? '' : `<button class="btn verde" data-acao="comprar-porto">${moedaMini}${fmtN(CUSTO_PORTO)}</button>`});
        h += tile({selo:`${S.zonas.length}/${ZONAS.length}`, ic:'<span class="emo-g">🌳</span>', nome:'Terras',
          info:`<span class="desc">${livres ? `Mais espaço para construir. Próxima: ${moedaMini}${fmtN(custoZona())} · nível ${nivelZona()}` : 'Você liberou a ilha inteira!'}</span>`,
          acao:livres ? `<button class="btn" data-acao="ver-terra">Ver</button>` : ''});
        if (ANEL < MAX_ANEL && !TROP) { const pode = ilhaCheia(), nv = nivelExpansao(), cx = custoExpansao();
          h += tile({trava:!pode || S.nivel < nv, selo:`Ilha ${ANEL + 1}/${MAX_ANEL + 1}`, seloCls:!pode || S.nivel < nv ? 'trava' : 'max', ic:'<span class="emo-g">🏝️</span>', nome:'Expansão da ilha',
            info:`<span class="desc">${!pode ? 'Libere todas as terras da ilha primeiro.' : S.nivel < nv ? `Disponível no nível ${nv}.` : 'A ilha cresce para todos os lados!'}</span><span class="mats">${matsDe('ilha').map(m => `<span class="${((S.mat || {})[m] || 0) >= matsExpansao() ? 'ok' : ''}" title="${MATERIAIS[m].nome}">${matIco(m)}${(S.mat || {})[m] || 0}/${matsExpansao()}</span>`).join('')}</span>`,
            acao:`<div class="t-col">${pode && S.nivel >= nv ? `<button class="btn verde" data-acao="expandir" ${S.moedas < cx ? 'disabled' : ''}>${moedaMini}${fmtN(cx)}</button>` : `<span class="nv">${moedaMini}${fmtN(cx)} · nível ${nv}</span>`}<button class="btn" data-acao="previa-ilha">👁️ Ver como fica</button></div>`}); }
        h += secaoLoja('✏️ Organizar');
        h += tile({ic:'<span class="emo-g">✏️</span>', nome:'Modo edição', info:'<span class="desc">Mova e gire suas construções.</span>', acao:`<button class="btn" data-acao="editar">Editar</button>`});
      }
      if (subLoja === 'decoracao') SECOES_DECOR.forEach(([tit, tipos]) => {
        h += secaoLoja(tit);
        DECOR.filter(c => tipos.includes(c.tipo) && podeAqui(c)).sort((a, b) => a.nivel - b.nivel || a.preco - b.preco).forEach(c => {
          const T = TIPOS[c.tipo], trava = S.nivel < c.nivel || !podeAqui(c), n = nTipo(c.tipo), falta = c.itens && !temItens(c.itens);
          h += tile({trava, selo:S.nivel < c.nivel ? `🔒 Nível ${c.nivel}` : !podeAqui(c) ? `🏝️ ${NOME_ILHA[c.ilha]}` : n ? `Você tem ${n}` : '', seloCls:trava ? 'trava' : '', ic:iconeLoja(c.tipo, c.icone), nome:T.nome,
            info:`<span>Ocupa ${T.w}×${T.d}</span>${c.itens ? `<span class="so-ilha">✨ Pede: ${txtItens(c.itens, true)}</span>` : ''}`, acao:trava ? '' : `<button class="btn verde" data-construir="${c.tipo}" ${S.moedas < c.preco || falta ? 'disabled' : ''}>${moedaMini}${fmtN(c.preco)}</button>`});
        });
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
      <button class="btn ${ok ? 'verde' : ''}" data-ampliar="${k}">Ampliar +50 · ${moedaMini}${fmtN(custoAmpliar(k))}</button></div>`; };
    // Armazém, Celeiro e Galpão: mesmo desenho (barra de cima igual, cards iguais, só o que você tem)
    const topoEstoque = (cap, total, acao, dica) => `<div class="loja-topo estoque"><div class="topo-linha">${cap}<button class="btn verde vender-tudo" data-acao="${acao}" ${total ? '' : 'disabled'}>Vender tudo · ${moedaMini}${fmtN(total)}</button></div><p class="dica">${dica}</p></div><div class="vitrine estoque">`;
    const cardItem = (id, q, ic, nome, pr, extra, acao) => { const td = S.tend[id] || 0, seta = td > 0 ? '<b class="sobe">▲</b>' : td < 0 ? '<b class="desce">▼</b>' : '';
      return tile({selo:`× ${q}`, ic:`<span data-info="${id}" class="info-alvo">${ic}</span>`, nome, info:`<span class="preco-g">${moedaMini}${pr} ${pr && !MATERIAIS[id] ? seta : ''}</span><span>${extra}</span>`, acao}); };
    const vazio = txt => `<div class="vazio-msg">${txt}</div>`;
    if (janela === 'armazem') {
      const lista = VENDAVEIS.filter(c => !ehPlanta(c.id) && (S.celeiro[c.id] || 0) > 0), racs = RACOES.filter(r => S.celeiro[r.id] > 0);
      let total = 0; lista.forEach(c => total += S.celeiro[c.id] * precoAtual(c.id));
      h += topoEstoque(barraCap(usoArmazem(), capArmazem(), 'armazem'), total, 'vender-tudo', 'Itens de <b>produção</b>: leite, ovos, pães, rações… O "Vender tudo" não vende as rações.');
      if (!lista.length && !racs.length) h += vazio('O armazém está vazio. Cuide dos animais e use as fábricas para produzir 🥛🥚');
      lista.forEach(c => h += cardItem(c.id, S.celeiro[c.id], ITEM_IMG[c.id] ? `<span class="img-g">${UI(ITEM_IMG[c.id])}</span>` : `<span class="emo-g">${c.emoji}</span>`, c.nome, precoAtual(c.id), 'cada', `<button class="btn" data-vender="${c.id}">Vender</button>`));
      racs.forEach(r => h += cardItem(r.id, S.celeiro[r.id], iconeItem(r, 'grande'), r.nome, 0, r.pet ? 'para os pets' : 'para ' + ANIMAIS[r.animal].plural.toLowerCase(), `<button class="btn" disabled>Ração</button>`));
      h += '</div>';
    }
    if (janela === 'celeiro') {
      const pls = CROPS.concat(FRUTAS).filter(c => (S.celeiro[c.id] || 0) > 0);
      let total = 0; pls.forEach(c => total += Math.max(0, S.celeiro[c.id] - 3) * precoAtual(c.id));
      h += topoEstoque(barraCap(usoCeleiro(), capCeleiro(), 'celeiro'), total, 'vender-celeiro', 'Seus <b>grãos e frutas</b>. Cada um planta um canteiro e cada colheita rende <b>2</b>. O "Vender tudo" deixa 3 de cada.');
      if (!pls.length) h += vazio('O celeiro está vazio. Compre plantas na <b>Loja</b> para começar 🌱');
      pls.forEach(c => { const cr = crop(c.id); h += cardItem(c.id, S.celeiro[c.id], ITEM_IMG[c.id] ? `<span class="img-g">${UI(ITEM_IMG[c.id])}</span>` : `<span class="emo-g">${c.emoji}</span>`, c.nome, precoAtual(c.id), cr ? '⏱ ' + fmtT(cr.tempo * velocidade()) : 'fruta do pomar', `<button class="btn" data-vender="${c.id}">Vender</button>`); });
      h += '</div>';
    }
    if (janela === 'galpao') {
      const ms = Object.keys(MATERIAIS).filter(m => ((S.mat || {})[m] || 0) > 0);
      let total = 0; ms.forEach(m => total += Math.max(0, S.mat[m] - 3) * MAT_PRECO[m]);
      h += topoEstoque('<div class="cap"><div class="cap-txt">🧰 Não ocupa espaço</div></div>', total, 'vender-galpao', '<b>Ferramentas e materiais</b>: caem ao colher e produzir e servem para ampliar e expandir. O "Vender tudo" deixa 3 de cada.');
      if (!ms.length) h += vazio('O galpão está vazio. Os materiais caem de vez em quando ao colher e produzir 🔩');
      ms.forEach(m => h += cardItem(m, S.mat[m], `<span class="mat-card">${matIco(m)}</span>`, MATERIAIS[m].nome, MAT_PRECO[m], {armazem:'amplia o Armazém', celeiro:'amplia o Celeiro', ilha:'expande a ilha'}[MATERIAIS[m].para], `<button class="btn" data-vender-mat="${m}">Vender</button>`));
      h += '</div>';
    }
    if (janela === 'animais') {
      atualizarProducao();
      h += `<div class="loja-topo ani-topo"><div class="topo-linha"><p class="dica">Ciclo: <b>🍽️ com fome</b> → dê ração → <b>⏳ produzindo</b> → <b>pronto</b> → colete. O botão de cada animal já faz o próximo passo.</p>${(() => { const c = resumoCuidar(); return `<button class="btn ${c.col || c.ali ? 'verde' : ''} mini-b" data-acao="cuidar-todos">🐾 Cuidar de todos${c.col || c.ali ? `<small>${[c.col && `coletar ${c.col}`, c.ali && `alimentar ${c.ali}`].filter(Boolean).join(' · ')}</small>` : c.semR.length ? '<small>falta ração</small>' : '<small>tudo em dia</small>'}</button>`; })()}${Object.keys(pets).length ? `<button class="btn mini-b" data-acao="chamar-pets">${S.seguir ? '🐕 Soltar bichinhos' : '🐕 Chamar bichinhos'}</button>` : ''}</div></div><div class="vitrine ani-lista">`;
      for (const k in ANIMAIS) { if (!podeAqui(consDe(ANIMAIS[k].cercado))) continue;
        const a = ANIMAIS[k], n = qtdAnimal(k), mx = maxAnimal(k), it = item(a.prod), r = item(a.racao), cc = custoConstrucao(a.cercado), nvC = LIMITES[a.cercado] ? nivelDaN(a.cercado, 0) : nivelConstrucao(a.cercado), nvProx = nivelConstrucao(a.cercado);
        const trava = S.nivel < Math.max(a.nivel, nvC), nomeC = TIPOS[a.cercado].nome.toLowerCase();
        const ic = a.img ? `<span class="foto-g ${/webp$/.test(a.img) ? 'recorte' : ''}"><img src="assets/img/${a.img}" alt=""></span>` : `<span class="emo-g">${a.emoji}</span>`;
        let status, principal, extras = '';
        if (trava) { status = `🔒 Nível ${Math.max(a.nivel, nvC)} · dão ${emojiItem(it)}`; principal = `<button class="btn" disabled>Bloqueado</button>`; }
        else if (!nTipo(a.cercado)) { status = `Precisa ${TIPOS[a.cercado].fem ? 'de uma' : 'de um'} ${nomeC}`; principal = `<button class="btn verde" data-construir="${a.cercado}" ${S.moedas < cc ? 'disabled' : ''}>Construir · ${moedaMini}${fmtN(cc)}</button>`; }
        else {
          let pr = 0, fome = 0, prod = 0; cercadosDe(k).forEach(o => { const e = estadoCercado(o); pr += e.prontos; fome += e.fome; prod += e.prod; });
          const temR = (S.celeiro[r.id] || 0) > 0;
          status = n ? `<div class="ciclo"><span class="cc fome ${fome ? 'on' : ''}">🍽️ Com fome <b>${fome}</b></span><i>›</i><span class="cc prod ${prod ? 'on' : ''}">⏳ Produzindo <b>${prod}</b></span><i>›</i><span class="cc pronto ${pr ? 'on' : ''}">${emojiItem(it)} Pronto <b>${pr}</b></span></div>` : 'Nenhum animal ainda';
          status += `<span class="ani-racao ${(S.celeiro[r.id] || 0) ? '' : 'zero'}" data-info="${r.id}">${iconeItem(r, 'mini-ic')} ${r.nome}: tem <b>${S.celeiro[r.id] || 0}</b> ${(S.celeiro[r.id] || 0) ? '' : '· toque para ver como fazer'}</span>`;
          if (!n) principal = `<button class="btn verde" data-animal="${k}" ${S.moedas < custoAnimal(k) ? 'disabled' : ''}>Comprar ${a.emoji} · ${moedaMini}${fmtN(custoAnimal(k))}</button>`;
          else if (cercadosDe(k).some(o => objNaFila(o.id))) principal = '<button class="btn" disabled>🚶 A caminho…</button>';
          else if (pr) principal = `<button class="btn verde" data-ir-cercado="${k}">👉 Coletar ${pr} ${emojiItem(it)}</button>`;
          else if (fome && temR) principal = `<button class="btn verde" data-ir-cercado="${k}">👉 Dar ração a ${Math.min(fome, S.celeiro[r.id])} 🥣</button>`;
          else if (fome) principal = `<button class="btn laranja" data-fazer-racao="${r.id}">👉 Fazer ração 🌾</button>`;
          else principal = `<button class="btn" data-ir-cercado="${k}">✅ Tudo certo · ver</button>`;
          if (n) extras = `<div class="ani-mini"><button class="btn" data-animal="${k}" ${n >= mx || S.moedas < custoAnimal(k) ? 'disabled' : ''}>${n >= mx ? 'Cheio<small>precisa + cercado</small>' : `+1 ${a.emoji}<small>${moedaMini}${fmtN(custoAnimal(k))}</small>`}</button>${S.nivel < nvProx ? `<button class="btn" disabled>+ ${nomeC}<small>nível ${nvProx}</small></button>` : `<button class="btn" data-construir="${a.cercado}" ${S.moedas < cc ? 'disabled' : ''}>+ ${nomeC}<small>${moedaMini}${fmtN(cc)}</small></button>`}</div>`;
        }
        h += `<div class="ani-card ${trava ? 'trava' : ''}"><div class="ani-ic">${ic}</div><div class="ani-meio"><div class="ani-nome"><span>${a.plural}</span><span class="ani-n">${n}/${mx}</span></div><div class="ani-st">${status}</div></div><div class="ani-acoes">${principal}${extras}</div></div>`;
      }
      h += `</div><h4 class="ani-sec">🐶 Bichinhos de estimação</h4><div class="vitrine ani-lista">`;
      for (const k in PETS) {
        const a = PETS[k], tem = S.amigos[k], trava = S.nivel < a.nivel;
        const ic = a.img ? `<span class="foto-g ${/webp$/.test(a.img) ? 'recorte' : ''}"><img src="assets/img/${a.img}" alt=""></span>` : `<span class="emo-g">${a.emoji}</span>`;
        const st = tem ? (petsComFome() ? '🦴 Com fome: toque na casinha com ração de pet' : `🦴 Alimentado · ${fmtT((FOME_PET - (Date.now() - S.petComeu)) / 1000)}`) : trava ? `🔒 Nível ${a.nivel}` : a.desc;
        const ac = tem ? `<button class="btn" data-renomear="${k}">✏️ Renomear</button>` : `<button class="btn verde" data-adotar="${k}" ${trava || S.moedas < a.custo ? 'disabled' : ''}>Adotar · ${moedaMini}${fmtN(a.custo)}</button>`;
        h += `<div class="ani-card ${trava && !tem ? 'trava' : ''}"><div class="ani-ic">${ic}</div><div class="ani-meio"><div class="ani-nome"><span>${tem ? nomePet(k) : a.especie}</span></div><div class="ani-st">${st}</div></div><div class="ani-acoes">${ac}</div></div>`;
      }
      h += '</div>';
    }
    if (janela === 'fabrica') {
      const t = janelaArg, F = FABRICAS[t], M = fabEstado(t), vagas = vagasFab(t), prontos = prontosFab(t);
      atualizarFab(t);
      if (t === 'moinho' && listaMoinhos().length > 1) { const ms = listaMoinhos(), i = ms.findIndex(o => o.id === fabEstadoId());
        h += `<div class="fab-troca"><button class="btn" data-acao="moinho-ant">◀</button><b>Moinho ${i + 1} de ${ms.length}</b><button class="btn" data-acao="moinho-prox">▶</button></div>`; }
      h += `<div class="fab-topo">`;
      for (let i = 0; i < vagas; i++) {
        const f = M.fila[i];
        if (!f) { h += `<div class="slotfab vazio">+</div>`; continue; }
        const r = item(f.id);
        h += `<div class="slotfab ${i === 0 ? 'ativo' : ''}">${iconeItem(r, 'e')}${i === 0 ? `<small data-fabtempo="1">${tempoCurto(f.dur - (Date.now() - (f.t0 || Date.now())))}</small><i class="pb" data-fabbarra="1" style="width:${f.t0 ? Math.min(100, 100 * (Date.now() - f.t0) / f.dur) : 0}%"></i>` : '<small>fila</small>'}</div>`;
      }
      h += `${prontos ? `<button class="btn verde" data-acao="coletar-fab">Pegar ×${prontos}</button>` : ''}</div>`;
      F.receitas.filter(r => !r.racao || r.pet || !r.animal || podeAqui(consDe(ANIMAIS[r.animal].cercado))).forEach(r => {
        const trava = S.nivel < r.nivel, ok = temIngredientes(r) && M.fila.length < vagas;
        const ings = Object.entries(r.ing).map(([id, n]) => { const q = S.celeiro[id] || 0; return `<span class="ing ${q >= n ? 'tem' : 'falta'}" data-info="${id}">${emojiItem(item(id))}${q}/${n}</span>`; }).join('');
        const tem = S.celeiro[r.id] || 0;
        h += `<div class="receita ${trava ? 'trava' : ''} ${destaqueRec === r.id ? 'destaque' : ''}" data-rec="${r.id}">${iconeItem(r, 'e')}<div class="meio"><b>${r.nome}</b> ${tagRar(r)}<span class="tem-qtd ${tem ? '' : 'zero'}">×${tem}</span>${trava ? ` <span class="nv">Nível ${r.nivel}</span>` : ''}
          <div class="det">${ings} <span>⏱${tempoCurto(r.tempo * 1000)}</span> ${r.rende ? `<span>×${r.rende} porções</span>` : `<span>💰${r.preco}</span> <span class="xp-info">⭐${r.xp}</span>`}</div></div>
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
      const au = S.audio || {}, AB = {som:'🔊 Som', graficos:'🎨 Gráficos', tela:'📱 Tela e texto', conta:'👤 Conta'};
      h += `<div class="subabas cfg-abas">${Object.entries(AB).map(([k, v]) => `<button data-cfg-aba="${k}" class="${k === abaCfg ? 'ativa' : ''}">${v}</button>`).join('')}</div>`;
      if (abaCfg === 'som') h += `<div class="linha-cfg"><span>🎵 Música</span><input type="range" class="vol" data-vol="musica" min="0" max="1" step="0.05" value="${au.musica ?? .5}"></div>
        <div class="linha-cfg"><span>🔔 Efeitos e bichos</span><input type="range" class="vol" data-vol="efeitos" min="0" max="1" step="0.05" value="${au.efeitos ?? .8}"></div>
        <div class="linha-cfg"><span>${au.mudo ? '🔇' : '🔊'} Som</span><button class="btn ${au.mudo ? 'vermelho' : ''}" data-acao="mudo">${au.mudo ? 'Desligado' : 'Ligado'}</button></div>`;
      if (abaCfg === 'graficos') h += `<div class="linha-cfg"><span>🎨 Gráficos</span><span class="botoes-cfg">${[['alta', 'Alta'], ['media', 'Média'], ['leve', 'Leve']].map(([k, n]) => `<button class="btn ${S.qual === k ? 'verde' : ''}" data-qual="${k}">${n}</button>`).join('')}</span></div>
        <p class="dica cfg-dica">Nitidez agora: <b>${String(gov.pr.toFixed(2)).replace(/\.?0+$/, '').replace('.', ',')}×</b> (tela ${String(+(window.devicePixelRatio || 1).toFixed(2)).replace('.', ',')}×). ${S.qual === 'alta' ? 'Na Alta o jogo usa a nitidez máxima que este aparelho aguenta.' : 'Se travar, o jogo baixa um pouco sozinho.'}</p>
        ${instalado() ? '' : `<div class="linha-cfg"><span>📲 Jogar como app (tela cheia, sem barra do navegador)</span>${pedidoInstalar ? '<button class="btn verde" data-acao="instalar">Instalar</button>' : '<span class="det">No Chrome: menu ⋮ → Instalar app</span>'}</div>`}
        <div class="linha-cfg"><span>🎥 Câmera</span><span class="botoes-cfg"><button class="btn ${S.camLivre ? '' : 'verde'}" data-cam-cfg="0">🔒 Travada</button><button class="btn ${S.camLivre ? 'verde' : ''}" data-cam-cfg="1">🔓 Livre</button></span></div>
        <div class="linha-cfg"><span>📈 Contador de FPS</span><button class="btn ${TELA.fps ? 'verde' : ''}" data-acao="fps-toggle">${TELA.fps ? 'Ligado' : 'Desligado'}</button></div>`;
      if (abaCfg === 'tela') {
        const bt = (attr, v, atual, txt) => `<button class="btn mini-b ${Math.abs(atual - v) < .001 ? 'verde' : ''}" ${attr}="${v}">${txt}</button>`;
        const barra = (k, tit, min, max, pre) => `<div class="linha-cfg col tela-linha"><span>${tit} <b class="tela-val" data-tela-val="${k}">${Math.round(TELA[k] * 100)}%</b></span>
          <div class="tela-ctrl"><input type="range" class="vol" data-tela-barra="${k}" min="${min}" max="${max}" step="0.05" value="${TELA[k]}"><span class="botoes-cfg">${pre.map(([v, n]) => bt('data-tela-' + k, v, TELA[k], n)).join('')}</span></div></div>`;
        h += barra('ui', '🔍 Tamanho dos botões e barras', .7, 1.5, [[.8, 'P'], [1, 'M'], [1.2, 'G']])
          + barra('jogo', '🎮 Texto do jogo (missões, avisos, chat)', .8, 1.6, [[.9, 'P'], [1, 'M'], [1.2, 'G']])
          + barra('txt', '🔤 Texto das janelas', .8, 1.5, [[.9, 'P'], [1, 'M'], [1.15, 'G']]) + `
          <div class="linha-cfg col"><span>✒️ Fonte</span><span class="botoes-cfg">${[['padrao', 'Padrão', "'Baloo 2'"], ['legivel', 'Mais legível', 'Verdana'], ['simples', 'Simples', 'Arial']].map(([v, n, f]) => `<button class="btn ${TELA.fonte === v ? 'verde' : ''}" data-tela-fonte="${v}" style="font-family:${f},sans-serif">${n}</button>`).join('')}</span></div>
          <p class="dica cfg-dica">Vale só para este aparelho. ${TELA.auto ? 'O tamanho foi escolhido sozinho pela tela do seu celular.' : ''} <button class="btn mini-b" data-acao="tela-auto">Voltar ao automático</button></p>`;
      }
      if (abaCfg === 'conta') h += `${htmlOnlineCfg()}
        <div class="linha-cfg"><span>❓ Como jogar</span><button class="btn" data-abrir="ajuda">Abrir</button></div>
        <div class="linha-cfg"><span>🎉 Novidades da versão ${VERSAO}</span><button class="btn" data-abrir="novidades">Ver</button></div>
        <div class="linha-cfg"><span>💡 Dicas do ajudante quando você fica parado</span><button class="btn ${S.dicas === false ? '' : 'verde'}" data-acao="dicas-tg">${S.dicas === false ? 'Desligadas' : 'Ligadas'}</button></div>
        <div class="linha-cfg"><span>👀 Ver de novo o passeio pelos botões</span><button class="btn" data-acao="tour-de-novo">Mostrar</button></div>
        <div class="linha-cfg"><span>📊 ${fmtN(S.colhidos)} colhidos · ${fmtN(S.ganho)} moedas ganhas</span></div>
        ${(() => { const b = lerBackup(); if (!b) return ''; const d = new Date(b.em);
          return `<div class="linha-cfg"><span>🛟 Cópia de segurança<br><small class="det">${b.origem === 'nuvem' ? 'da nuvem' : 'deste aparelho'} · nível ${b.nivel} · ${d.toLocaleDateString('pt-BR')} ${d.toLocaleTimeString('pt-BR', {hour:'2-digit', minute:'2-digit'})}</small></span><button class="btn" data-acao="restaurar-backup">Restaurar</button></div>`; })()}
        <div class="linha-cfg"><span>🌱 <b>Terrália Farm</b> · versão ${VERSAO}<br><small class="det">${novaVersao ? `Versão ${esc(novaVersao)} no servidor, mas a atualização não completou.` : 'O jogo se atualiza sozinho.'}</small></span>
          <button class="btn ${novaVersao ? 'verde' : ''}" data-acao="${novaVersao ? 'atualizar-ja' : 'procurar-versao'}">${novaVersao ? 'Atualizar agora' : 'Procurar atualização'}</button></div>
        <p class="dica legal">🎵 Músicas e sons: Mixkit (licença livre), OpenGameArt (CC0) e Pixabay.</p>
        <p class="dica legal"><a href="privacidade.html" target="_blank">Privacidade</a> · <a href="termos.html" target="_blank">Termos de uso</a></p>
        ${ON.gm || (MODO_TESTE && !ON.user) ? '<div class="linha-cfg"><span>↺ Recomeçar do zero (teste · só GM)</span><button class="btn vermelho" data-abrir="reset">Recomeçar</button></div>' : ''}`;
    }
    if (janela === 'ranking') h += htmlRanking();
    if (janela === 'pedidos') h += htmlPedidos();
    if (janela === 'passe') h += htmlPasse();
    if (janela === 'porto') h += htmlPorto();
    if (janela === 'novidades') h += htmlNovidades();
    if (janela === 'castelo') h += htmlCastelo();
    if (janela === 'album') h += htmlAlbum();
    if (janela === 'cacada') h += htmlCacada();
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
    if (janela === 'passe') { const c = $('.passe-col.hoje') || [...document.querySelectorAll('.passe-col.feito')].pop(); const tr = $('.passe-trilha'); if (c && tr) tr.scrollLeft = Math.max(0, c.offsetLeft - tr.offsetLeft - 120); }
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
    if (heroi.g) { const pos = heroi.g.position.clone(), rot = heroi.g.rotation.y; scene.remove(heroi.g); heroi.g = criarFazendeiro(); soBlob(heroi.g, .5); heroi.g.position.copy(pos); heroi.g.rotation.y = rot; scene.add(heroi.g); }
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
    if (o.tipo === 'celeiro') return `Celeiro · plantas ${usoCeleiro()}/${capCeleiro()}`;
    if (o.tipo === 'armazem') return `Armazém · itens ${usoArmazem()}/${capArmazem()}`;
    if (o.tipo === 'loja') return 'Loja · comprar plantas';
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
    if (!arr.comecou) { if (i !== alvoPlantio) return; arr.comecou = true; } // só começa no canteiro que você tocou
    if (i < 0 || arr.feitos.has(i) || naFila(i)) return;
    const pq = S.plots[i];
    if (!(arr.tipo === 'insumo' ? insumoServe(arr.id, pq) : arr.tipo === 'catar' ? temPraga(pq) : modoTile(i) === arr.tipo)) return;
    arr.feitos.add(i);
    if (arr.tipo === 'insumo') { if (qtdIns(arr.id) < 1) { if (!arr.avisou) { arr.avisou = true; toast(`Acabou: ${INSUMOS[arr.id].nome}`); } return; } usarInsumo(arr.id, i); somT('pop', 40); return; }
    if (arr.tipo === 'catar') { enfileirarGrupo('catar', i); somT('pop', 40); return; }
    if (arr.tipo === 'plantar') {
      const f = arr.id;
      if ((S.celeiro[f] || 0) - semFila(f) <= 0) { if (!arr.avisou) { arr.avisou = true; toast(`Acabou o ${crop(f).nome.toLowerCase()} do celeiro`); } return; }
      enfileirarPlantio(i, f); somT('pop', 40);
    } else if (arr.tipo === 'regar') { enfileirarGrupo('regar', i); somT('agua', 120); }
    else if (arr.tipo === 'colher') {
      if (livreCeleiro() - 2 * colhendoNaFila() < 1) { if (!arr.avisou) { arr.avisou = true; avisarCheio('celeiro'); } return; }
      enfileirarGrupo('colher', i); somT('pop', 40);
    }
  }
  $('#seletorSem').addEventListener('pointerdown', ev => {
    const b = ev.target.closest('[data-sem], [data-ferr-arr], [data-ins]'); if (!b || ev.target.closest('[data-comprar-sem], [data-comprar-ins]')) return;
    let tipo, id = null;
    if (b.dataset.sem) { id = b.dataset.sem; if (!(S.celeiro[id] || 0)) return; tipo = 'plantar'; S.semSel = id; }
    else if (b.dataset.ins) { id = b.dataset.ins; if (!qtdIns(id)) { abrirSeletor(false); abrir('loja', 'insumos'); return; } tipo = 'insumo'; }
    else tipo = b.dataset.ferrArr;
    Object.assign(arr, {ativo:true, tipo, id, x0:ev.clientX, y0:ev.clientY, moveu:false, feitos:new Set(), avisou:false, comecou:alvoPlantio == null});
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
    const txt = {plantar:'Arraste a planta pelos canteiros para plantar', regar:'Arraste o regador por cima das plantas para regar', colher:'Arraste a foice por cima para colher', catar:'Arraste a mão por cima para catar o bichinho'}[tipo] || 'Arraste por cima das plantas para usar';
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
    for (const k in pets) if (ray.intersectObject(pets[k].g, true).length) { const p = pets[k]; if (p.rot) { p.rot.visible = true; clearTimeout(p.rotT); p.rotT = setTimeout(() => { if (p.rot) p.rot.visible = false; }, 3000); } flutuar(p.g.position.clone().add(V3(0, 1.2, 0)), '💕'); somT(k, 600); if (petsComFome() && !VISITA) alimentarPets(); return; }
    if (tonho && ray.intersectObject(tonho, true).length) { irPara(tonho.position.clone().add(V3(.8, 0, .8))); abrir('ajuda'); return; }
    if (porto3D && ray.intersectObject(porto3D.userData.pick).length) { abrir('porto'); return; } // ⚓
    if (castelo3D && ray.intersectObject(castelo3D.userData.pick).length) { abrir('castelo'); return; } // 🏰
    const o = pickConstrucao(false); if (clicavel(o)) { clicarConstrucao(o); return; }
    const z = pickTerra(); if (z) { const tg = terras[z]; if (tg && tg.userData.rotulo) { const r = tg.userData.rotulo; r.visible = true; clearTimeout(r.userData.t); r.userData.t = setTimeout(() => r.visible = false, 3500); } zonaSel = z; abrir('zona'); return; }
    const p = pontoChao(); if (p) { const d = ajustarDestino(p.clone()); if (!enfileirar({tipo:'andar', pos:d})) return; marcador.position.set(d.x, .06, d.z); marcador.visible = true; marcadorT = 1; }
  });
  canvas.addEventListener('pointercancel', () => { dedos.clear(); toques = 0; downPos = null; });

  let focoCam = null;
  function girarCamera() { azAlvo += Math.PI / 2; S.az = (S.az + 1) % 4; S.azLivre = azAlvo; }
  // grupos de botões: tocar abre/fecha; tocar fora fecha
  const fecharGrupos = () => document.querySelectorAll('.grupo.aberto').forEach(g => g.classList.remove('aberto'));
  document.querySelectorAll('[data-grupo]').forEach(b => b.addEventListener('click', e => { e.stopPropagation(); const g = b.parentElement, ab = g.classList.contains('aberto'); fecharGrupos(); if (!ab) g.classList.add('aberto'); }));
  document.querySelectorAll('.flyout').forEach(f => f.addEventListener('click', () => setTimeout(fecharGrupos, 120)));
  window.addEventListener('pointerdown', e => { if (!e.target.closest('.grupo')) fecharGrupos(); }, true);
  $('#btnGirar').addEventListener('click', girarCamera);
  function pintarTrava() { const b = $('#btnTrava'); if (!b) return; const livre = !!(S && S.camLivre);
    b.classList.toggle('travada', !livre); b.classList.toggle('livre', livre);
    b.querySelector('.txt-ico').textContent = livre ? '🔓' : '🔒'; b.querySelector('small').textContent = livre ? 'Livre' : 'Travada'; }
  function definirCamLivre(livre) {
    S.camLivre = livre;
    if (!livre) { const base = Math.PI / 4 + (S.az || 0) * Math.PI / 2; azAlvo = base + 2 * Math.PI * Math.round((azAlvo - base) / (2 * Math.PI)); inclina = 0; S.azLivre = null; S.inclina = 0; }
    salvar(); pintarTrava(); toast(livre ? '🔓 Câmera livre: gire e incline com dois dedos' : '🔒 Câmera travada no ângulo clássico');
  }
  $('#btnTrava').addEventListener('click', () => definirCamLivre(!S.camLivre));

  
  document.addEventListener('click', e => {
    const ed = e.target.closest('[data-ed]'); if (!ed) return;
    const a = ed.dataset.ed;
    if (a === 'girar') girarSel(); if (a === 'ok') confirmarSel(); if (a === 'cancelar') cancelarSel(); if (a === 'concluir') sairEdicao(); if (a === 'vender') venderSel(); if (a === 'guardar') guardarSel();
  });

  $('#filaUI').addEventListener('click', e => { const b = e.target.closest('[data-fila]'); if (!b) return; if (b.dataset.fila === 'tudo') { limparFila(); toast('✋ Lista de afazeres cancelada'); } else removerDaFila(+b.dataset.fila); });
  $('#hotbar').addEventListener('click', e => { const b = e.target.closest('[data-ferr]'); if (!b) return;
    const f = b.dataset.ferr;
    if (f === 'plantar') {
      const c = semAtual();
      if (crop(S.ferramenta) || !(S.celeiro[c.id] || 0)) seletorAberto = !seletorAberto; // 2º toque (ou sem semente) abre o painel
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
    if (e.target.closest('[data-comprar-sem]') || !(S.celeiro[id] || 0)) { abrirSeletor(false); destaqueSem = id; abrir('loja', 'sementes'); destaqueSem = null;
      const card = $(`[data-card-sem=${id}]`); if (card) card.scrollIntoView({block:'nearest', inline:'center'}); return; }
    renderSeletor(); });
  window.addEventListener('pointerdown', e => { if (seletorAberto && !e.target.closest('#seletorSem')) abrirSeletor(false); }, true);
  document.addEventListener('click', e => {
    const ab = e.target.closest('[data-abrir]'); if (ab) { abrir(ab.dataset.abrir); return; }
    if (!e.target.closest('#fundo')) return;
    if (e.target.id === 'fundo') { fechar(); return; }
    const cp = e.target.closest('[data-compra]'); if (cp) { const [t, id] = cp.dataset.compra.split(':'); abrirCompra(t, id); return; }
    const vm = e.target.closest('[data-vender-mat]'); if (vm) { abrirVendaMat(vm.dataset.venderMat); return; }
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
    const cg = e.target.closest('[data-colocar]'); if (cg) { const g = (S.guardados || []).find(x => x.uid === cg.dataset.colocar); if (g) comprarConstrucao(g.tipo, null, g); return; }
    const fr = e.target.closest('[data-fazer-racao]'); if (fr) { guiarFazer(fr.dataset.fazerRacao); return; }
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
    const ca = e.target.closest('[data-cfg-aba]'); if (ca) { abaCfg = ca.dataset.cfgAba; renderJanela(); return; }
    const tu = e.target.closest('[data-tela-ui]'); if (tu) { TELA.ui = +tu.dataset.telaUi; salvarTela(); renderJanela(); return; }
    const gb = e.target.closest('[data-gm]'); if (gb) { if (!ON.gm) return; const k = gb.dataset.gm; // só a conta GM (o servidor recusa o resto)
      if (k === 'n1' || k === 'n10') { S.nivel += k === 'n1' ? 1 : 10; S.xp = 0; atualizarPlacasTerra(); } else S.moedas += k === 'm10k' ? 1e4 : 1e6;
      salvar(); if (ON.user) enviarSave(); tudo(); renderJanela(); toast('🛡️ GM: feito', 'bom'); return; }
    const tj = e.target.closest('[data-tela-jogo]'); if (tj) { TELA.jogo = +tj.dataset.telaJogo; salvarTela(); renderJanela(); return; }
    const tt = e.target.closest('[data-tela-txt]'); if (tt) { TELA.txt = +tt.dataset.telaTxt; salvarTela(); renderJanela(); return; }
    const tf = e.target.closest('[data-tela-fonte]'); if (tf) { TELA.fonte = tf.dataset.telaFonte; salvarTela(); renderJanela(); return; }
    const cc = e.target.closest('[data-cam-cfg]'); if (cc) { definirCamLivre(cc.dataset.camCfg === '1'); renderJanela(); return; }
    const qb = e.target.closest('[data-qual]'); if (qb) { if (S.qual !== qb.dataset.qual) { S.qual = qb.dataset.qual; S.qualManual = true; S.leve = S.qual === 'leve'; salvar(); toast('🎨 Aplicando os gráficos…'); setTimeout(() => location.reload(), 500); } return; }
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
    if (ac === 'resgatar-passe') { resgatarPasse(); return; }
    if (ac === 'comprar-porto') { if (S.porto || S.nivel < NIVEL_PORTO) return; if (S.moedas < CUSTO_PORTO) { toast('Moedas insuficientes'); return; }
      S.moedas -= CUSTO_PORTO; S.porto = true; salvar(); montarPorto(); fechar(); tudo(); somT('nivel'); toast('⚓ Porto construído na praia! Toque nele para viajar', 'ouro');
      if (porto3D) focar(porto3D.userData.pick.getWorldPosition(V3())); return; }
    if (ac === 'viajar') { viajar(e.target.closest('[data-ilha]').dataset.ilha); return; }
    if (ac === 'barco-caixa') { encherCaixa(+e.target.closest('[data-cx]').dataset.cx); return; }
    if (ac === 'nov-ok') { S.novVista = VERSAO; salvar(); fechar(); setTimeout(() => { try { lembrarPasse(); } catch (e) {} }, 600); return; }
    if (ac === 'nov-tut') { S.novVista = VERSAO; S.tutNv = a.dataset.v; S.tutN = 0; fechar(); salvar(); const T = tutAtual(); if (T && T.lista[0].entrar) T.lista[0].entrar(); mostrarTutorial(); verificarTutorial(); return; }
    if (ac === 'rede') { recolherRede(); return; }
    if (ac === 'castelo-subir') { subirCastelo(); return; }
    if (ac === 'moinho-ant' || ac === 'moinho-prox') { const ms = listaMoinhos(), i = ms.findIndex(o => o.id === fabEstadoId()), j = (i + (ac === 'moinho-prox' ? 1 : -1) + ms.length) % ms.length; fabSel = ms[j].id; renderJanela(); return; }
    if (ac === 'coletar-tudo') { coletarTudo(); return; }
    if (ac === 'dicas-tg') { S.dicas = S.dicas === false ? true : false; salvar(); renderJanela(); toast(S.dicas === false ? '💡 Dicas desligadas' : '💡 Dicas ligadas', 'bom'); return; }
    if (ac === 'tour-de-novo') { fechar(); iniciarTutExtra('tour'); return; }
    if (ac === 'cacada-ir') { comecarCacada(); return; }
    if (ac === 'barco-trocar') { S.barco = null; S.barcoVolta = Date.now() + 3600 * 1000; salvar(); renderJanela(); toast('🚢 Pedido dispensado. Um barco novo chega em 1 hora'); return; }
    if (ac === 'cuidar-todos') {
      const c = resumoCuidar();
      if (c.alvos.length) { c.alvos.forEach(o => enfileirar({tipo:'cercado', oid:o.id})); toast(`🐾 Indo ${[c.col && `coletar ${c.col}`, c.ali && `alimentar ${c.ali}`].filter(Boolean).join(' e ')}`, 'bom'); }
      if (c.semR.length) setTimeout(() => toast(`🥣 Sem ração para ${c.semR.map(k => ANIMAIS[k].plural.toLowerCase()).join(', ')}. Faça no moinho (botão laranja "Fazer ração")`), c.alvos.length ? 1200 : 0); // só avisa: não abre nada sozinho
      else if (!c.alvos.length) toast('Tudo em dia! Nenhum animal com fome nem produto pronto 😊');
      renderJanela();
    }
    if (ac === 'previa-ilha') { mostrarPreviaIlha(); return; }
    if (ac === 'expandir') {
      if (!ilhaCheia() || S.nivel < nivelExpansao() || S.moedas < custoExpansao() || ANEL >= MAX_ANEL) return;
      if (!temMats(matsDe('ilha'), matsExpansao())) { toast(`Faltam materiais: ${matsDe('ilha').map(m => `${MATERIAIS[m].nome} ${(S.mat || {})[m] || 0}/${matsExpansao()}`).join(' · ')}`); return; }
      S.moedas -= custoExpansao(); gastarMats(matsDe('ilha'), matsExpansao()); S.expansao = ANEL + 1; salvar(); if (ON.user) enviarSave();
      fechar(); reconstruirIlha(ANEL + 1); somT('nivel'); toast('🏝️ A ilha cresceu! Novas terras para liberar em volta.', 'bom'); tudo();
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
    if (ac === 'fps-toggle') { TELA.fps = !TELA.fps; salvarTela(TELA.auto); renderJanela(); return; }
    if (ac === 'tela-auto') { const h = Math.min(innerWidth, innerHeight); Object.assign(TELA, {ui:Math.max(.8, Math.min(1.3, Math.round(h / 384 * 10) / 10)), txt:1, jogo:1, fonte:'padrao'}); salvarTela(true); renderJanela(); return; }
    if (ac === 'restaurar-backup') { const b = lerBackup(); if (!b) return;
      if (!confirm('Trocar a fazenda atual pela cópia de segurança (nível ' + b.nivel + ')? A fazenda atual vira a nova cópia.')) return;
      guardarBackup(S, 'aparelho'); const d = Object.assign({}, b.dados, {uid:S.uid, nuvemVer:S.nuvemVer, salvoEm:Date.now()});
      carregarFazenda(d, '🛟 Cópia de segurança restaurada!'); return; }
    if (ac === 'atualizar-ja') atualizarJogo();
    if (ac === 'entrar-google') { fechar(); abrirLogin('inicio'); }
    if (ac === 'sair-conta') { fechar(); sairDaConta(); }
    if (ac === 'outra-conta') { fechar(); (async () => { try { if (ON.sujo) await enviarSave(); } catch (er) {} abrirLogin('inicio'); })(); }
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
    if (ac === 'vender-galpao') { let t = 0; Object.keys(MATERIAIS).forEach(m => { const q = ((S.mat || {})[m] || 0) - 3; if (q > 0) { S.mat[m] -= q; t += q * MAT_PRECO[m]; } }); if (t) { S.moedas += t; S.stats.vendeu = (S.stats.vendeu || 0) + t; somT('moeda'); toast(`Vendeu os materiais extras por ${fmtN(t)} moedas (ficaram 3 de cada)`, 'bom'); pulsar(); } tudo(); return; }
    if (ac === 'vender-celeiro') { let t = 0; CROPS.concat(FRUTAS).forEach(c => { const q = (S.celeiro[c.id] || 0) - 3; if (q > 0) t += vender(c.id, q); }); if (t) { toast(`Vendeu as sobras por ${fmtN(t)} moedas (ficaram 3 de cada)`, 'bom'); pulsar(); } tudo(); return; }
    if (ac === 'vender-tudo') { let t = 0; VENDAVEIS.filter(c => !ehPlanta(c.id) && !c.achado).forEach(c => t += vender(c.id)); if (t) { toast(`Vendeu tudo por ${fmtN(t)} moedas`, 'bom'); pulsar(); } tudo(); }
    if (ac === 'reset-sim') { (async () => {
      if (ON.user && !ON.gm) { toast('Só a conta GM pode recomeçar do zero'); return; }
      const velho = S, leve = S.leve, ql = S.qual; guardarBackup(velho, 'antes de recomeçar');
      const n = novo(); n.leve = leve; n.qual = ql; n.perfil = velho.perfil; n.rev = (velho.rev || 0) + 1000; n.salvoEm = Date.now(); // rev maior: o save novo vence o antigo em qualquer aparelho
      if (ON.user) { n.uid = ON.user.id; toast('↺ Zerando a fazenda…');
        try { const {data, error} = await ON.sb.from('saves').upsert({user_id:ON.user.id, dados:n, atualizado:new Date().toISOString()}).select('atualizado').maybeSingle();
          if (error) throw error; n.nuvemVer = verDe(data.atualizado); } catch (e) { toast('☁️ Sem conexão: não deu para zerar agora. Tente de novo.'); return; } }
      ON.recarregando = true; try { localStorage.setItem(KEY, JSON.stringify(n)); } catch (e) {} location.reload(); })(); }
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
    if (barco3D) { barco3D.position.y = -1.35 + Math.sin(t * 1.1) * .07; barco3D.rotation.z = Math.sin(t * .9) * .03; }
  }
  let quadro = 0;
  function animar(t) {
    if (MODO_BAIXAR) return; // página de baixar: não desenha o jogo
    requestAnimationFrame(animar);
    const dt = Math.min(.05, (t - ultimoT) / 1000 || .016); ultimoT = t;
    const seg = t / 1000; animarTropical(seg, dt);
    if (t - ultimoLogico > 250) {
      ultimoLogico = t;
      let mudou = false;
      if (petOk('cachorro')) mudou = cachorroAjuda() || mudou;
      if (atualizarProducao()) mudou = true;
      if (TROP && tickChuva()) mudou = true;
      tickDica();
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
    if (hoverI >= 0) {
      const p = posTile(hoverI); destaque.position.set(p.x, .15, p.z); destaque.rotation.y = tiles[hoverI].g.parent.rotation.y; destaque.visible = true;
      area.visible = false;
    } else { destaque.visible = false; area.visible = false; }
    if (molduraSel && molduraSel.visible) molduraSel.scale.setScalar(1 + Math.sin(performance.now() / 180) * .03);
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
    if (fabRodas.length) fabRodas.forEach(r => r.rotation.x += dt * ((S.fab[r.userData.tipo || 'tecelagem'] || {fila:[]}).fila.length ? 3 : .2)); pasMoinho.forEach(p => p.rotation.z += dt * (p.userData.oid && fabEstado('moinho', p.userData.oid).fila.length ? 2.2 : .25)); animarFabricas(dt, seg);
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
    posicionarBaloes(performance.now() / 1000);
    quadro++; renderer.shadowMap.needsUpdate = quadro % 30 === 0; // sombras das construções: 2× por segundo basta (bichos e pessoas usam sombrinha redonda)
    // qualidade automática: se estiver travando, baixa um pouco a resolução; quando melhorar, volta
    gov.soma += dt; gov.n++;
    fpsC.n++; if (t - fpsC.t0 > 500) { const f = Math.round(fpsC.n * 1000 / (t - fpsC.t0)); fpsC.n = 0; fpsC.t0 = t; if (fpsC.el) fpsC.el.textContent = `${f} fps · ${String(+gov.pr.toFixed(2)).replace('.', ',')}×`; if (fpsC.el) fpsC.el.className = f >= 50 ? 'bom' : f >= 30 ? 'medio' : 'ruim'; }
    if (gov.soma > 2.5) {
      const med = gov.soma / gov.n; gov.soma = gov.n = 0;
      if (med > gov.baixa && gov.pr > gov.min) { gov.pr = Math.max(gov.min, gov.pr - .25); gov.bons = 0; renderer.setPixelRatio(gov.pr); }
      else if (med > 1 / 20 && gov.pr <= gov.min && !document.hidden && jogoIniciado) { // no mínimo e ainda muito lento: aparelho fraco
        if (++gov.lentos >= 3 && !S.qualManual && QUAL !== 'leve') { const nq = QUAL === 'alta' ? 'media' : 'leve'; S.qual = nq; S.leve = nq === 'leve'; salvar(); gov.lentos = 0;
          QUAL = nq; const m = gov.max; aplicarQualidade(); gov.max = Math.min(gov.max, m);
          toast(`🎨 Gráficos ajustados para ${nq === 'media' ? 'Média' : 'Leve'} para o jogo ficar mais leve neste aparelho (dá para mudar em Configurações)`); }
      }
      else if (med < gov.sobe && gov.pr < gov.max) { if (++gov.bons >= 2) { gov.pr = Math.min(gov.max, gov.pr + .25); gov.bons = 0; renderer.setPixelRatio(gov.pr); } }
      else gov.bons = 0;
    }
    renderer.render(scene, camera);
  }

  // ================= PEDIDOS (caminhão de encomendas) =================
  const NIVEL_PEDIDOS = 3;
  function itensParaPedido() {
    const fabs = new Set(S.objetos.filter(o => TIPOS[o.tipo].fab).map(o => o.tipo)), arv = new Set(S.objetos.filter(o => TIPOS[o.tipo].fruta).map(o => TIPOS[o.tipo].fruta));
    return VENDAVEIS.filter(i => i.soAchado || i.achado || i.rede ? false : crop(i.id) ? i.nivel <= S.nivel : i.animal ? qtdAnimal(i.animal) > 0 : i.arvore ? arv.has(i.id) : i.fab ? fabs.has(i.fab) && i.nivel <= S.nivel : false);
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
    const bonus = petOk('papagaio') ? Math.round(p.moedas * .15) : 0; S.moedas += p.moedas + bonus; S.stats.pedidos = (S.stats.pedidos || 0) + 1; ganharXp(p.xp);
    acharMaterial(null, .35);
    toast(`🚚 Pedido entregue! +${fmtN(p.moedas + bonus)} moedas${bonus ? ' (🦜 +15%)' : ''} e ⭐${p.xp}`, 'bom'); pulsar();
    S.pedidos[i] = {itens:[], espera:Date.now() + 30 * 1000}; tudo();
  }
  function trocarPedido(i) { S.pedidos[i] = {itens:[], espera:Date.now() + 3 * 60 * 1000}; toast('🗑️ Pedido descartado. Um novo chega em 3 minutos.'); tudo(); }
  // ================= PASSE DO FAZENDEIRO (v0.46): 1 recompensa por dia, temporadas de 30 dias =================
  const NIVEL_PASSE = 2;
  const MESES = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
  const hojeStr = () => { const d = new Date(); return d.getFullYear() + '-' + (d.getMonth() + 1) + '-' + d.getDate(); };
  const mesStr = () => { const d = new Date(); return d.getFullYear() + '-' + (d.getMonth() + 1); };
  const diaDoMes = () => new Date().getDate();
  const diasNoMes = () => { const d = new Date(); return new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate(); };
  // o passe segue o calendário: no dia 17 já dá para pegar os prêmios do dia 1 ao 17. A cada 7 dias um baú.
  const PASSE_GRATIS = [
    ['moedas', 200], ['item', 'racaoG', 6], ['xp', 30], ['item', 'milho', 10], ['ins', 'rapido', 2], ['moedas', 400], ['bau', 1],
    ['mat', 'parafuso', 1], ['item', 'racaoV', 6], ['xp', 60], ['moedas', 500], ['item', 'cenoura', 10], ['ins', 'super', 1], ['bau', 2],
    ['mat', 'prego', 1], ['item', 'racaoO', 6], ['moedas', 700], ['xp', 100], ['ins', 'rapido', 3], ['item', 'tomate', 10], ['bau', 3],
    ['mat', 'tabua', 2], ['moedas', 900], ['item', 'racaoPet', 6], ['xp', 150], ['ins', 'super', 2], ['mat', 'tijolo', 2], ['bau', 4],
    ['mat', 'escritura', 1], ['moedas', 1200], ['bau', 5]];
  const BAU_MAT = ['fita', 'tinta', 'parafuso', 'prego', 'marreta', 'estaca', 'tabua'];
  const PASSE_PREMIUM = PASSE_GRATIS.map(([t, a, b]) => t === 'moedas' ? ['moedas', a * 2] : t === 'xp' ? ['xp', a * 2] : t === 'bau' ? ['bau', a + 2] : t === 'mat' ? ['mat', a, (b || 1) + 1] : ['ins', (a === 'super' ? 'super' : 'rapido'), 3]);
  function passeEstado() {
    const m = mesStr();
    if (!S.passe || S.passe.mes !== m) S.passe = {mes:m, dia:S.passe && !S.passe.mes && S.passe.temp === 1 ? S.passe.dia || 0 : 0}; // mês novo: começa do dia 1
    return S.passe;
  }
  const passeFalta = () => { if (S.nivel < NIVEL_PASSE || VISITA) return 0; return Math.max(0, Math.min(diaDoMes(), diasNoMes()) - passeEstado().dia); };
  const passePode = () => passeFalta() > 0;
  function premioPasse(r) { // aplica e devolve o texto
    const [t, a, b] = r;
    if (t === 'moedas') { S.moedas += a; return `💰 ${fmtN(a)} moedas`; }
    if (t === 'xp') { ganharXp(a); return `⭐ ${a} XP`; }
    if (t === 'item') { S.celeiro[a] = (S.celeiro[a] || 0) + b; return `${item(a).emoji} ${b} ${item(a).nome.toLowerCase()}`; }
    if (t === 'ins') { if (!S.ins) S.ins = {}; S.ins[a] = (S.ins[a] || 0) + b; return `${INSUMOS[a].emoji} ${b} ${INSUMOS[a].nome.toLowerCase()}`; }
    if (t === 'mat') { const q = b || 1; mudarEstoque(a, q); return `${MATERIAIS[a].emoji} ${q} ${MATERIAIS[a].nome.toLowerCase()}`; }
    if (t === 'bau') { const mo = 400 * a + 200, m = BAU_MAT[(a - 1) % BAU_MAT.length];
      S.moedas += mo; mudarEstoque(m, a >= 5 ? 2 : 1); ganharXp(40 * a); return `🧰 Baú: 💰 ${fmtN(mo)} + ${MATERIAIS[m].emoji} ${MATERIAIS[m].nome.toLowerCase()} + ⭐ ${40 * a} XP`; }
    return '';
  }
  function iconePasse(r) {
    const [t, a, b] = r;
    if (t === 'moedas') return {ic:UI('moeda'), txt:fmtN(a)};
    if (t === 'xp') return {ic:UI('estrela'), txt:a + ' XP'};
    if (t === 'item') return {ic:iconeItem(item(a), 'e'), txt:'×' + b};
    if (t === 'ins') return {ic:`<span class="emo-g">${INSUMOS[a].emoji}</span>`, txt:'×' + b};
    if (t === 'mat') return {ic:`<span class="pc-mat">${matIco(a)}</span>`, txt:`${MATERIAIS[a].nome} ×${b || 1}`};
    if (t === 'bau') return {ic:UI('bau'), txt:'Baú!', dica:`${fmtN(400 * a + 200)} moedas + ${MATERIAIS[BAU_MAT[(a - 1) % BAU_MAT.length]].nome} + ${40 * a} XP`};
    return {ic:'', txt:''};
  }
  function resgatarPasse() { // pega de uma vez todos os prêmios liberados até hoje
    const n = passeFalta(); if (!n) return;
    const p = passeEstado(), m0 = S.moedas; let bau = 0, outros = 0, xp = 0, ult = '';
    for (let k = 0; k < n; k++) { const r = PASSE_GRATIS[p.dia]; if (r[0] === 'xp') xp += r[1]; if (r[0] === 'bau') { bau++; xp += 40 * r[1]; } else if (r[0] !== 'moedas' && r[0] !== 'xp') outros++; ult = premioPasse(r); p.dia++; }
    somT(bau ? 'nivel' : 'moeda'); salvar(); if (ON.user) enviarSave(); tudo(); renderJanela();
    if (n === 1) toast(`🎁 Dia ${p.dia}: ${ult}`, 'ouro');
    else toast(`🎁 ${n} prêmios resgatados: 💰 ${fmtN(S.moedas - m0)}${xp ? ` · ⭐ ${xp} XP` : ''}${bau ? ` · 🧰 ${bau} baú${bau > 1 ? 's' : ''}` : ''}${outros ? ` · +${outros} itens` : ''}`, 'ouro');
  }
  function lembrarPasse() { // 1× por dia, ao entrar: abre o passe sozinho
    if (!passePode() || janela || (S.tut >= 0 && S.tut <= 12) || S.passeVisto === hojeStr()) return;
    S.passeVisto = hojeStr(); abrir('passe');
  }
  function htmlPasse() {
    const p = passeEstado(), falta = passeFalta(), tot = diasNoMes(), hoje = diaDoMes(), resta = tot - hoje;
    let h = `<div class="passe-topo"><div><b>Passe de ${MESES[new Date().getMonth()]}</b><small>Um prêmio para cada dia do mês · ${resta ? `acaba em ${resta} dia${resta === 1 ? '' : 's'}` : 'último dia!'}</small></div>
      <div class="passe-prog"><i style="width:${100 * p.dia / tot}%"></i><span>${p.dia}/${tot}</span></div>
      ${falta ? `<button class="btn verde" data-acao="resgatar-passe">🎁 Resgatar ${falta > 1 ? `${falta} prêmios` : 'o prêmio de hoje'}</button>` : `<button class="btn" disabled>${p.dia >= tot ? '🏆 Mês completo!' : '✅ Volte amanhã'}</button>`}</div>
      <div class="passe-legenda"><span>🎁 Em cima: <b>grátis</b></span><span>⭐ Embaixo: <b>Premium</b> (em breve)</span></div><div class="passe-trilha">`;
    for (let i = 0; i < tot; i++) {
      const g = iconePasse(PASSE_GRATIS[i]), pr = iconePasse(PASSE_PREMIUM[i]), feito = i < p.dia, livre = !feito && i < hoje, grande = PASSE_GRATIS[i][0] === 'bau';
      h += `<div class="passe-col ${feito ? 'feito' : ''} ${livre ? 'hoje' : ''} ${grande ? 'grande' : ''} ${i >= hoje ? 'futuro' : ''}" ${livre ? 'data-acao="resgatar-passe"' : ''}><span class="passe-dia">Dia ${i + 1}</span>
        <div class="passe-card" title="${esc(g.dica || g.txt)}"><div class="pc-ic">${g.ic}</div><small>${g.txt}</small>${feito ? '<b class="pc-ok">✓</b>' : ''}</div>
        <div class="passe-card prem"><div class="pc-ic">${pr.ic}</div><small>${pr.txt}</small><b class="pc-tranca">🔒</b></div></div>`;
    }
    return h + `</div><p class="dica passe-dica">Cada dia do mês libera um prêmio. Faltou alguns dias? Pegue tudo de uma vez até o fim do mês. A cada 7 dias tem um <b>baú</b> 🧰.</p>`;
  }
  // ================= ILHAS E BARCO (v0.53) =================
  function ilhaNova(dest) { const med = dest === 'medieval', objs = layoutInicial(med ? 'medieval' : 'tropical'); return {objetos:objs, plots:med ? [] : Array.from({length:4}, () => ({c:null})), zonas:(med ? ZONAS_MED_INICIAIS : ZONAS_TROP_INICIAIS).slice(), expansao:0, moinhos:{}, fab:{}, pomar:Object.fromEntries(objs.filter(o => TIPOS[o.tipo].fruta).map(o => [o.id, 1])), ani:{}, animais:{}, prod:{}}; } // na medieval, a mina e o bosque já chegam prontos para coletar
  function viajar(dest) {
    if (dest === ILHA || VISITA) return;
    if (S.nivel < (NIVEL_ILHA[dest] || NIVEL_PORTO)) { toast(`${ICO_ILHA[dest]} A ${NOME_ILHA[dest]} libera no nível ${NIVEL_ILHA[dest]}`); return; }
    if (editar.ativo) sairEdicao(); fechar(); salvar();
    const d = JSON.parse(JSON.stringify(S)), atual = {};
    ILHA_CHAVES.forEach(k => { if (k in d) atual[k] = d[k]; delete d[k]; });
    d.outras = d.outras || {}; d.outras[ILHA] = atual;
    const alvo = d.outras[dest] || ilhaNova(dest); delete d.outras[dest];
    Object.assign(d, alvo); d.ilha = dest; d.rev = (S.rev || 0) + 1; d.salvoEm = Date.now(); // conta como progresso: sobe para a nuvem ao chegar
    let el = $('#telaViagem'); if (!el) { el = document.createElement('div'); el.id = 'telaViagem'; document.body.appendChild(el); }
    el.innerHTML = `<div class="via-mar"><div class="via-barco">⛵</div><div class="via-onda"></div></div><h3>Viajando para a ${NOME_ILHA[dest]}…</h3><p>${dest === 'medieval' ? '🏰 Um castelo para restaurar, mina, bosque e criaturas mágicas!' : dest === 'tropical' ? '🏝️ Lagoa, cachoeira, vulcão e muita coisa nova esperando por você!' : '🏡 Voltando para casa'}</p>`;
    el.classList.add('on'); somT('abrir');
    ON.recarregando = true; try { localStorage.setItem(KEY, JSON.stringify(d)); sessionStorage.setItem(ON.user ? 'terralia-entrar' : 'terralia-entrar-conv', '1'); } catch (e) {} // ao chegar, entra direto no jogo
    setTimeout(() => carregarFazenda(d, dest === 'principal' ? '🏡 De volta à Ilha Principal!' : `${ICO_ILHA[dest]} Bem-vindo à ${NOME_ILHA[dest]}!`), 2600);
  }
  // pedidos do barco: 3 caixas grandes, um barco a cada 6 horas
  const BARCO_INTERVALO = 6 * 3600 * 1000;
  function gerarBarco() {
    const L = S.nivel, pool = ITENS.filter(i => !i.racao && !i.achado && !i.soAchado && (i.nivel || 1) <= L && i.preco > 0 && !MATERIAIS[i.id]);
    const caros = pool.filter(i => i.fab || i.animal || (i.nivel || 1) >= Math.max(1, L - 12)), base = caros.length >= 3 ? caros : pool;
    const esc = [], usados = new Set();
    while (esc.length < 3 && usados.size < base.length) { const it = base[Math.random() * base.length | 0]; if (usados.has(it.id)) continue; usados.add(it.id);
      const n = Math.max(2, Math.min(30, Math.round(1500 * (1 + L / 20) / it.preco))); esc.push({id:it.id, n, feito:false}); }
    const especial = L >= NIVEL_PORTO && Math.random() < .35; if (especial && esc.length === 3) esc[2] = {id:Math.random() < .7 ? 'concha' : 'perola', n:Math.random() < .5 ? 1 : 2, feito:false, raro:true}; // ✨ pedido especial: pede um achado raro e paga bem mais
    const valor = esc.reduce((t, c) => t + c.n * item(c.id).preco * (c.raro ? 1.5 : 1), 0), xp = esc.reduce((t, c) => t + c.n * (item(c.id).xp || Math.round(item(c.id).preco / 12)), 0);
    S.barco = {caixas:esc, especial, moedas:Math.round(valor * 2 / 10) * 10, xp:Math.round(xp * .8 + 20), chegou:Date.now()}; S.barcoVolta = null;
  }
  function barcoAtual() { // o barco chega sozinho quando dá a hora
    if (!S.porto && !TROP && !MED) return null;
    if (!S.barco && (!S.barcoVolta || Date.now() >= S.barcoVolta)) { gerarBarco(); salvar(); }
    return S.barco;
  }
  function encherCaixa(i) {
    const b = barcoAtual(); if (!b) return; const c = b.caixas[i]; if (!c || c.feito) return;
    if (estoque(c.id) < c.n) { toast(`Faltam ${c.n - estoque(c.id)} ${item(c.id).nome.toLowerCase()}`); somT('erro'); return; }
    mudarEstoque(c.id, -c.n); c.feito = true; somT('moeda'); toast(`📦 Caixa ${i + 1} carregada!`, 'bom');
    if (b.caixas.every(x => x.feito)) { S.moedas += b.moedas; ganharXp(b.xp); S.barco = null; S.barcoVolta = Date.now() + BARCO_INTERVALO; S.stats.barcos = (S.stats.barcos || 0) + 1;
      setTimeout(() => toast(`🚢 Barco completo! +${fmtN(b.moedas)} moedas e +${fmtN(b.xp)} XP`, 'ouro'), 400); somT('nivel'); }
    salvar(); tudo(); renderJanela();
  }
  const REDE_MS = 4 * 3600 * 1000;
  function recolherRede() {
    if ((S.redeEm || 0) > Date.now()) return;
    const n = 3 + (Math.random() * 3 | 0), ganhou = [`${n} 🐟`]; S.celeiro.peixe = (S.celeiro.peixe || 0) + n;
    [['concha', .3], ['perola', .15], ['cristal', .05]].forEach(([k, ch]) => { if (Math.random() < ch) { S.celeiro[k] = (S.celeiro[k] || 0) + 1; ganhou.push(`1 ${item(k).emoji} ${item(k).nome}`); } });
    S.redeEm = Date.now() + REDE_MS; S.stats.redes = (S.stats.redes || 0) + 1; ganharXp(40); somT('achou');
    toast(`🎣 Rede recolhida: ${ganhou.join(' · ')}!`, ganhou.length > 1 ? 'ouro' : 'bom'); salvar(); tudo();
  }
  function htmlPorto() {
    const b = barcoAtual(), DESC = {principal:'Sua fazenda de casa, com plantações, animais e as fábricas de sempre.',
      tropical:'Ilha redonda com plantas, árvores, animais e fábricas que só existem lá.', medieval:'Ilha hexagonal sem plantação: mina, bosque, oficinas, castelo e a caçada mágica.'};
    let h = '';
    ['principal', 'tropical', 'medieval'].filter(k => k !== ILHA).forEach(k => { const nv = NIVEL_ILHA[k], trava = S.nivel < nv;
      h += `<div class="porto-viagem ${trava ? 'trava' : ''}"><div class="pv-ic">${ICO_ILHA[k]}</div><div class="pv-txt"><b>${k === 'principal' ? 'Voltar para a ' : 'Viajar para a '}${NOME_ILHA[k]}</b>
        <small>${DESC[k]}${trava ? ` <b>Libera no nível ${nv}.</b>` : ''}</small></div>
        ${trava ? `<span class="nov-trava">🔒 ${nv}</span>` : `<button class="btn verde" data-acao="viajar" data-ilha="${k}">⛵ ${k === 'principal' ? 'Voltar' : 'Viajar'}</button>`}</div>`; });
    h += '<p class="dica">📦 Celeiro, armazém, moedas e nível são os mesmos em todas as ilhas.</p>';
    { const r = Math.max(0, (S.redeEm || 0) - Date.now()); // 🎣 rede de pesca do píer
      h += `<div class="rede-pesca"><div class="pv-ic">🎣</div><div class="pv-txt"><b>Rede de pesca</b><small>${r ? `A rede está na água. Recolha em <b>${fmtT(r / 1000)}</b>` : 'A rede está cheia! Vem peixe e, com sorte, conchas, pérolas e cristais.'}</small></div>
        <button class="btn ${r ? '' : 'verde'}" data-acao="rede" ${r ? 'disabled' : ''}>Recolher</button></div>`; }
    h += `<div class="secao-titulo">🚢 Pedido do barco${b && b.especial ? ' <span class="selo-especial">✨ Especial</span>' : ''}</div>`;
    if (!b) { const r = Math.max(0, (S.barcoVolta || 0) - Date.now()); h += `<p class="dica">O próximo barco chega em <b>${fmtT(r / 1000)}</b>. Ele traz 3 caixas grandes para encher, e paga o dobro do caminhão.</p>`; return h; }
    h += `<div class="barco-caixas">${b.caixas.map((c, i) => { const it = item(c.id), tem = estoque(c.id), ok = tem >= c.n;
      return `<div class="bx ${c.feito ? 'feito' : ''} ${c.raro ? 'raro' : ''}"><span class="bx-n">${c.raro ? '✨ Especial' : 'Caixa ' + (i + 1)}</span><div class="bx-ic" data-info="${c.id}">${iconeItem(it, 'e')}</div><b>${c.n} ${esc(it.nome)}</b>
        ${c.feito ? '<span class="ok">✓ Carregada</span>' : `<small class="${ok ? 'tem' : 'falta'}">você tem ${fmtN(tem)}</small><button class="btn ${ok ? 'verde' : ''}" data-acao="barco-caixa" data-cx="${i}" ${ok ? '' : 'disabled'}>Carregar</button>`}</div>`; }).join('')}</div>
      <div class="barco-premio">Prêmio ao encher as 3: ${moedaMini}<b>${fmtN(b.moedas)}</b> · ⭐ <b>${fmtN(b.xp)} XP</b> <button class="btn mini-b" data-acao="barco-trocar">Dispensar</button></div>`;
    return h;
  }
  function htmlPedidos() {
    if (S.nivel < NIVEL_PEDIDOS) return `<p class="dica">O caminhão de pedidos chega no nível ${NIVEL_PEDIDOS}. 🚚</p>`;
    garantirPedidos();
    let h = `<div class="loja-topo"><p class="dica">Entregue encomendas para ganhar <b>mais moedas e XP</b> do que vendendo no armazém. Já entregou ${fmtN(S.stats.pedidos || 0)} pedidos.</p></div><div class="vitrine">`;
    S.pedidos.forEach((p, i) => {
      if (!p.itens.length) { h += `<div class="tile"><div class="t-ic"><span class="emo-g">🚚</span></div><div class="t-nome">Novo pedido</div><div class="t-info"><span>chega em ${fmtT(Math.max(0, p.espera - Date.now()) / 1000)}</span></div><div class="t-acao"></div></div>`; return; }
      const ok = p.itens.every(([id, q]) => (S.celeiro[id] || 0) >= q);
      h += `<div class="tile larga ${ok ? 'amigo-ok' : ''}"><span class="selo ${ok ? 'max' : ''}">${ok ? 'Pronto!' : 'Pedido ' + (i + 1)}</span>
        <div class="ped-itens">${p.itens.map(([id, q]) => { const tem = S.celeiro[id] || 0; return `<div class="ped-it ${tem >= q ? 'ok' : ''}" data-info="${id}"><span>${emojiItem(item(id))}</span><b>${Math.min(tem, q)}/${q}</b></div>`; }).join('')}</div>
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
    if (livreDe(o.item) < o.qtd) { avisarCheio(ehPlanta(o.item) ? 'celeiro' : 'armazem'); return; }
    try {
      const {data, error} = await ON.sb.rpc('comprar_oferta', {oferta:id});
      if (error || !data || !data.length) { toast('😕 Alguém comprou primeiro!'); carregarBanca(); return; }
      const r = data[0]; S.moedas -= r.preco; mudarEstoque(r.item, r.qtd);
      toast(`🛒 Comprou ${r.qtd} ${item(r.item).nome} por ${fmtN(r.preco)} moedas`, 'bom'); tudo(); enviarSave();
    } catch (e) { toast('Sem internet'); }
    carregarBanca();
  }
  async function colocarOferta() {
    const v = BAN.venda; if (!v) return; const tem = estoque(v.id);
    if (v.qtd < 1 || v.qtd > tem) { toast('Quantidade inválida'); return; }
    mudarEstoque(v.id, -v.qtd); salvar();
    try {
      const {error} = await ON.sb.from('ofertas').insert({vendedor:ON.user.id, item:v.id, qtd:v.qtd, preco:v.preco});
      if (error) { mudarEstoque(v.id, v.qtd); toast(error.message.includes('limite') ? 'Você já tem 8 ofertas na banca' : 'Não deu para colocar: ' + error.message); }
      else { toast(`🏪 ${v.qtd} ${item(v.id).nome} à venda por ${fmtN(v.preco)}!`, 'bom'); BAN.venda = null; enviarSave(); }
    } catch (e) { mudarEstoque(v.id, v.qtd); toast('Sem internet'); }
    tudo(); carregarBanca();
  }
  async function cancelarOferta(id) {
    try { const {data} = await ON.sb.rpc('cancelar_oferta', {oferta:id}); if (data && data[0]) { mudarEstoque(data[0].item, data[0].qtd); toast('Oferta retirada: os itens voltaram para o armazém'); tudo(); enviarSave(); } } catch (e) { toast('Sem internet'); }
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
    if (v) { const it = item(v.id), b = v.qtd * precoBase(v.id), tem = estoque(v.id);
      h += `<div class="tile larga"><span class="selo">Nova oferta</span><div class="t-ic"><span class="emo-g">${emojiItem(it)}</span></div><div class="t-nome">${it.nome}</div>
        <div class="t-info"><span>Quantidade: <button class="mini-b" data-bv="q-1">−</button> <b>${v.qtd}</b> <button class="mini-b" data-bv="q1">+</button> <small>(tem ${tem})</small></span>
        <span>Preço: <button class="mini-b" data-bv="p-">−</button> <b>${moedaMini}${fmtN(v.preco)}</b> <button class="mini-b" data-bv="p+">+</button></span><span><small>normal: ${fmtN(b)}</small></span></div>
        <div class="t-acao"><button class="btn verde" data-acao="colocar-oferta">Vender</button><button class="btn" data-bv="cancelar">✕</button></div></div>`; }
    else { const tem = VENDAVEIS.filter(i => (S.celeiro[i.id] || 0) > 0).concat(Object.keys(MATERIAIS).filter(m => (S.mat || {})[m] > 0).map(item));
      h += `<div class="tile larga"><span class="selo">Vender na banca</span><div class="t-ic"><span class="emo-g">🏪</span></div><div class="t-nome">Escolha um item</div>
        <div class="t-info ban-escolha">${tem.length ? tem.map(i => `<button class="mini-b" data-bv-item="${i.id}" title="${i.nome}">${emojiItem(i)}<small>${estoque(i.id)}</small></button>`).join('') : '<span>Seu armazém está vazio</span>'}</div><div class="t-acao"></div></div>`; }
    abertas.forEach(o => { const it = item(o.item); h += `<div class="tile"><span class="selo">À venda</span><div class="t-ic"><span class="emo-g">${emojiItem(it)}</span></div><div class="t-nome">${it.nome} ×${o.qtd}</div><div class="t-info"><span class="preco-g">${moedaMini}${fmtN(o.preco)}</span><span>esperando comprador</span></div><div class="t-acao"><button class="btn" data-cancelar-oferta="${o.id}">Retirar</button></div></div>`; });
    return h + '</div>';
  }
  function cliqueBanca(e) {
    const bs = e.target.closest('[data-banca]'); if (bs) { BAN.sub = bs.dataset.banca; renderJanela(); return true; }
    const co = e.target.closest('[data-comprar-oferta]'); if (co) { comprarOferta(+co.dataset.comprarOferta); return true; }
    const ca = e.target.closest('[data-cancelar-oferta]'); if (ca) { cancelarOferta(+ca.dataset.cancelarOferta); return true; }
    const bi = e.target.closest('[data-bv-item]'); if (bi) { const id = bi.dataset.bvItem, q = Math.min(10, estoque(id)); BAN.venda = {id, qtd:q, preco:q * precoBase(id)}; renderJanela(); return true; }
    const bv = e.target.closest('[data-bv]'); if (bv && BAN.venda) { const v = BAN.venda, a = bv.dataset.bv, tem = estoque(v.id);
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
  let venda = null; // {modo:'vender'|'comprar'|'vmat', tipo, id, n}
  function abrirVenda(id) { const q = S.celeiro[id] || 0; if (!q) return; venda = {modo:'vender', id, n:Math.max(1, Math.ceil(q / 2))}; renderVenda(); }
  function abrirCompra(tipo, id) { venda = {modo:'comprar', tipo, id, n:1}; if (!cfgVenda().max) { toast(S.moedas < cfgVenda().preco ? 'Moedas insuficientes' : tipo === 'planta' ? '🏚️ Celeiro cheio' : 'Não dá para comprar agora'); venda = null; return; } renderVenda(); }
  function abrirVendaMat(id) { const q = (S.mat || {})[id] || 0; if (!q) return; venda = {modo:'vmat', id, n:1}; renderVenda(); }
  function cfgVenda() {
    const v = venda;
    if (v.modo === 'vender') { const it = item(v.id), q = S.celeiro[v.id] || 0; return {ic:emojiItem(it), nome:it.nome, tem:q, max:q, preco:precoAtual(v.id), tit:`Vender ${it.nome}`, verbo:'Vender', det:`Você tem ${q} · ${moedaMini}${precoAtual(v.id)} cada`}; }
    if (v.modo === 'vmat') { const m = MATERIAIS[v.id], q = (S.mat || {})[v.id] || 0; return {ic:matIco(v.id), nome:m.nome, tem:q, max:q, preco:MAT_PRECO[v.id], tit:`Vender ${m.nome}`, verbo:'Vender', det:`Você tem ${q} · ${moedaMini}${MAT_PRECO[v.id]} cada`}; }
    if (v.tipo === 'mat') { const m = MATERIAIS[v.id], pr = MAT_PRECO[v.id] * 2, tem = (S.mat || {})[v.id] || 0; return {ic:matIco(v.id), nome:m.nome, tem, max:Math.max(0, Math.min(Math.floor(S.moedas / pr), 99)), preco:pr, tit:`Comprar ${m.nome}`, verbo:'Comprar', det:`Você tem ${tem} · ${moedaMini}${pr} cada (teste)`, compra:true}; }
    const pl = v.tipo === 'planta', c = pl ? crop(v.id) : INSUMOS[v.id], pr = pl ? precoPlanta(c) : c.preco, tem = pl ? S.celeiro[v.id] || 0 : qtdIns(v.id);
    const max = Math.max(0, Math.min(Math.floor(S.moedas / pr), pl ? livreCeleiro() : 99, 99));
    return {ic:ITEM_IMG[c.id] ? `<span class="img-g">${UI(ITEM_IMG[c.id])}</span>` : `<span class="emo-g">${c.emoji}</span>`, nome:c.nome, tem, max, preco:pr, tit:`Comprar ${c.nome}`, verbo:'Comprar', det:`Você tem ${tem} · ${moedaMini}${pr} cada`, compra:true};
  }
  function renderVenda() {
    const el = $('#popVenda'); if (!venda) { el.classList.remove('on'); return; }
    const k = cfgVenda(); venda.n = Math.max(1, Math.min(k.max, venda.n));
    if (!k.max) { venda = null; el.classList.remove('on'); return; }
    const at = k.compra ? `<button class="btn" data-pv="um">1</button><button class="btn" data-pv="5">5</button><button class="btn" data-pv="10x">10</button><button class="btn" data-pv="tudo">Máximo</button>`
      : `<button class="btn" data-pv="um">1</button><button class="btn" data-pv="metade">Metade</button>${k.max > 10 ? '<button class="btn" data-pv="menos10">Deixar 10</button>' : ''}<button class="btn" data-pv="tudo">Tudo</button>`;
    el.innerHTML = `<div class="pv-caixa ${k.compra ? 'compra' : ''}"><div class="pv-topo"><span class="pv-ic">${k.ic}</span><div><b>${k.tit}</b><div class="det">${k.det}</div></div><button class="fechar" data-pv="fechar">✕</button></div>
      <div class="pv-qtd"><button class="btn" data-pv="-10">−10</button><button class="btn" data-pv="-1">−</button><b>${venda.n}</b><button class="btn" data-pv="1">+</button><button class="btn" data-pv="10">+10</button></div>
      <input type="range" min="1" max="${k.max}" value="${venda.n}" id="pvRange">
      <div class="pv-atalhos">${at}</div>
      <button class="btn verde grande" data-pv="ok">${k.verbo} ${venda.n} por ${moedaMini}${fmtN(venda.n * k.preco)}</button></div>`;
    el.classList.add('on');
  }
  function confirmarVenda() {
    const v = venda, k = cfgVenda(), n = Math.min(v.n, k.max); if (n < 1) return;
    if (v.modo === 'vender') { const g = vender(v.id, n); if (g) { toast(`Vendeu ${n} por ${fmtN(g)} moedas`, 'bom'); pulsar(); } }
    else if (v.modo === 'vmat') { S.mat[v.id] -= n; const g = n * k.preco; S.moedas += g; S.stats.vendeu = (S.stats.vendeu || 0) + g; somT('moeda'); toast(`Vendeu ${n} ${k.nome} por ${fmtN(g)} moedas`, 'bom'); pulsar(); salvar(); }
    else { const cu = n * k.preco; if (S.moedas < cu) return; S.moedas -= cu; S.stats.compras = (S.stats.compras || 0) + 1;
      if (v.tipo === 'mat') { if (!S.mat) S.mat = {}; S.mat[v.id] = (S.mat[v.id] || 0) + n; }
      else if (v.tipo === 'planta') S.celeiro[v.id] = (S.celeiro[v.id] || 0) + n; else { if (!S.ins) S.ins = {}; S.ins[v.id] = qtdIns(v.id) + n; }
      somT('moeda'); toast(`Comprou ${n} ${k.nome} por ${fmtN(cu)} moedas`, 'bom'); salvar(); verificarTutorial(); }
    venda = null; tudo();
  }
  function iniciarVenda() {
    const el = $('#popVenda');
    el.addEventListener('click', e => {
      if (e.target === el) { venda = null; renderVenda(); return; }
      const b = e.target.closest('[data-pv]'); if (!b || !venda) return; const a = b.dataset.pv, q = cfgVenda().max;
      if (a === 'fechar') venda = null;
      else if (a === 'ok') confirmarVenda();
      else if (a === 'um') venda.n = 1; else if (a === 'metade') venda.n = Math.ceil(q / 2); else if (a === 'tudo') venda.n = q; else if (a === 'menos10') venda.n = q - 10; else if (a === '10x') venda.n = 10; else if (a === '5' && venda.modo === 'comprar') venda.n = 5;
      else venda.n += +a;
      renderVenda();
    });
    el.addEventListener('input', e => { if (e.target.id === 'pvRange' && venda) { venda.n = +e.target.value; const k = cfgVenda(), v = el.querySelector('[data-pv=ok]'), bq = el.querySelector('.pv-qtd b');
      if (bq) bq.textContent = venda.n; if (v) v.innerHTML = `${k.verbo} ${venda.n} por ${moedaMini}${fmtN(venda.n * k.preco)}`; } });
  }

  // ================= ATUALIZAÇÕES (versao.json no GitHub) =================
  // atualização automática: achou versão nova → salva, mostra "Atualizando…" e reabre já na versão nova
  let novaVersao = null, atualizando = false;
  const lerUpd = () => { try { return JSON.parse(sessionStorage.getItem('terralia-upd') || '{}'); } catch (e) { return {}; } };
  async function procurarVersao(avisar) {
    if (!/^https?:$/.test(location.protocol) || atualizando) { if (avisar && !atualizando) toast('Só dá para procurar atualização pelo site do jogo'); return; }
    try {
      const r = await fetch('versao.json?t=' + Date.now(), {cache:'no-store'}); const j = await r.json();
      if (j.versao && j.versao !== VERSAO) {
        novaVersao = j.versao; const u = lerUpd();
        if (jogoIniciado && !avisar && u.alvo !== j.versao) avisarPendente(j.versao); // jogando: avisa no meio da tela
        else if (avisar || u.alvo !== j.versao || (u.n || 0) < 2) atualizarJogo(); // tenta atualizar até 2 vezes seguidas
        else bloquearVersao(j.versao); // não conseguiu: NÃO deixa jogar na versão velha, fica tentando sozinho
      } else { novaVersao = null; try { sessionStorage.removeItem('terralia-upd'); } catch (e) {} if (avisar) toast('✅ Você já está na versão mais nova (' + VERSAO + ')', 'bom'); }
    } catch (e) { if (avisar) toast('Sem internet para procurar atualização'); }
    if (janela === 'config') renderJanela();
  }
  let bloqueio = null, pendente = null;
  function avisarPendente(v) { // versão nova enquanto joga: tela no meio, atualiza no toque (ou sozinho em 20s)
    if (pendente) return; salvar(); let el = $('#telaAtualiza');
    if (!el) { el = document.createElement('div'); el.id = 'telaAtualiza'; document.body.appendChild(el); }
    let seg = 20;
    el.innerHTML = telaUpdHTML('Atualização pendente!', `Chegou a versão <b>${esc(v)}</b> do Terrália Farm com novidades.<br>Sua fazenda está salva. Atualizando sozinho em <b data-upd-seg>${seg}</b>s…`,
      `<button data-upd-agora>✨ Atualizar agora</button><small class="upd-ver">Você está na ${esc(VERSAO)}</small>`);
    el.classList.add('on', 'pendente'); somT('nivel');
    if (!el.dataset.ag) { el.dataset.ag = 1; el.addEventListener('click', e => { if (e.target.closest('[data-upd-agora]')) { clearInterval(pendente); atualizarJogo(); } }); }
    pendente = setInterval(() => { seg--; const t = el.querySelector('[data-upd-seg]'); if (t) t.textContent = Math.max(0, seg); if (seg <= 0) { clearInterval(pendente); atualizarJogo(); } }, 1000);
  }
  const telaUpdHTML = (tit, txt, extra) => `<div class="upd-raios"></div>
    <img class="upd-logo" src="assets/ui/logo.webp" alt="Terrália Farm">
    <img class="upd-boneco upd-esq" src="assets/ui/fazendeiro.webp" alt=""><img class="upd-boneco upd-dir" src="assets/ui/fazendeira.webp" alt="">
    <div class="upd-caixa"><h3>${tit}</h3><p>${txt}</p><div class="upd-barra"><i></i></div>${extra}</div>`;
  function bloquearVersao(alvo) { // atualização obrigatória: o jogo fica parado até a versão nova chegar
    salvar(); let el = $('#telaAtualiza');
    if (!el) { el = document.createElement('div'); el.id = 'telaAtualiza'; document.body.appendChild(el); }
    let seg = 20;
    const pinta = () => { const t = el.querySelector('[data-upd-seg]'); if (t) { t.textContent = seg; return; }
      el.innerHTML = telaUpdHTML('Atualização obrigatória', `A versão ${esc(alvo)} está chegando no servidor. Sua fazenda está salva.<br>Tentando de novo em <b data-upd-seg>${seg}</b>s…`,
        `<button data-upd-tentar>🔄 Tentar agora</button><small class="upd-ver">Você está na ${esc(VERSAO)}</small>`); };
    pinta(); el.classList.add('on', 'bloqueado');
    if (!el.dataset.ok) { el.dataset.ok = 1; el.addEventListener('click', e => { if (e.target.closest('[data-upd-tentar]')) tentarDeNovo(); }); }
    clearInterval(bloqueio); bloqueio = setInterval(() => { seg--; if (seg <= 0) tentarDeNovo(); else pinta(); }, 1000);
  }
  function tentarDeNovo() { // zera as tentativas e recarrega pedindo tudo novo ao servidor
    clearInterval(bloqueio); try { sessionStorage.removeItem('terralia-upd'); } catch (e) {}
    location.replace(location.pathname + '?v=' + Date.now());
  }
  async function atualizarJogo() {
    if (atualizando) return; atualizando = true;
    const u = lerUpd(), n = u.alvo === novaVersao ? (u.n || 0) + 1 : 1;
    try { sessionStorage.setItem('terralia-upd', JSON.stringify({alvo:novaVersao, n})); } catch (e) {}
    let el = $('#telaAtualiza');
    if (!el) { el = document.createElement('div'); el.id = 'telaAtualiza'; document.body.appendChild(el); }
    el.innerHTML = telaUpdHTML('Atualizando o jogo', `Baixando a versão ${esc(novaVersao || '')}… sua fazenda já está salva.`, '');
    el.classList.add('on');
    salvar();
    const reabrir = () => location.replace(location.pathname + '?v=' + encodeURIComponent(novaVersao || Date.now()));
    const limite = setTimeout(reabrir, 8000); // nunca fica preso na tela de atualização
    try { if (ON.user && ON.sujo && !ON.expulso) await Promise.race([enviarSave(), new Promise(r => setTimeout(r, 4000))]); } catch (e) {}
    try { const ks = await caches.keys(); await Promise.all(ks.map(k => caches.delete(k))); } catch (e) {}
    try { const reg = navigator.serviceWorker && await navigator.serviceWorker.getRegistration(); if (reg) await Promise.race([reg.update(), new Promise(r => setTimeout(r, 2500))]); } catch (e) {}
    clearTimeout(limite); setTimeout(reabrir, 700);
  }
  // depois de atualizar: tira o ?v= do endereço
  if (/[?&]v=/.test(location.search)) try { history.replaceState(null, '', location.pathname); } catch (e) {}

  // ================= ONLINE (Supabase: login Google, save na nuvem, ranking) =================
  const SB_URL = 'https://oxnhimwkotsrfuxakazo.supabase.co', SB_KEY = 'sb_publishable_LFUz1Cn-9RouOGJbayeg1Q_YDrqcqOZ';
  const podeLogar = () => /^https?:$/.test(location.protocol) && window.top === window; // Google não deixa entrar dentro de iframe nem em arquivo local
  const producaoTotal = () => [S.stats.colheu, S.stats.coletou, S.stats.fez].reduce((a, o) => a + Object.values(o || {}).reduce((x, y) => x + (+y || 0), 0), 0);
  function iniciarOnline() {
    if (!window.supabase || !window.supabase.createClient) return;
    try { ON.sb = window.supabase.createClient(SB_URL, SB_KEY, {auth:{persistSession:true, autoRefreshToken:true, detectSessionInUrl:true, flowType:'pkce'}}); } catch (e) { console.warn(e); return; }
    ON.sb.auth.onAuthStateChange((ev, sess) => {
      if (sess) guardarSessao(sess);
      if (ev === 'PASSWORD_RECOVERY') setTimeout(() => abrirLogin('novaSenha'), 300);
      const u = sess && sess.user, novo = u && (!ON.user || ON.user.id !== u.id);
      if (u && !jogoIniciado && ev !== 'PASSWORD_RECOVERY') { let q = null; try { q = sessionStorage.getItem('terralia-entrar'); } catch (e) {} if (q) setTimeout(() => { if (!jogoIniciado) { $('#telaLogin').classList.add('on'); esperarSincronizar(); } }, 50); }
      if (u) $('#faixaConta').classList.remove('on');
      setTimeout(renderContaSplash, 0);
      ON.user = u || null; ON.token = sess ? sess.access_token : null;
      if (novo) { ON.sincronizado = false; setTimeout(sincronizarAoEntrar, 0); }
      if (janela === 'config' || janela === 'ranking') renderJanela();
    });
    setInterval(() => { if (ON.user && ON.sujo && Date.now() - (ON.tentou || 0) > 1500) enviarSave(); }, 1000); // salva na nuvem ~1,5 s depois de qualquer mudança
    setInterval(() => { if (!document.hidden && ON.user && ON.sincronizado && !ON.expulso) conferirSessao(); }, 8000);
    setInterval(batida, 60000); setTimeout(batida, 8000);
    document.addEventListener('visibilitychange', () => { if (document.hidden) salvarAoFechar(); else if (ON.user && ON.sincronizado && !ON.expulso) conferirSessao(); });
    addEventListener('pagehide', salvarAoFechar);
  }
  async function entrarGoogle() {
    if (!ON.sb) { toast('Sem conexão com o servidor agora'); return; }
    if (!podeLogar()) { toast('Para entrar com Google, abra o jogo pelo endereço do site (não pelo arquivo nem pela prévia)'); return; }
    const {error} = await ON.sb.auth.signInWithOAuth({provider:'google', options:{redirectTo:location.origin + location.pathname, queryParams:{prompt:'select_account'}}});
    if (error) toast('Não deu para entrar: ' + error.message);
  }
  async function sairConta() {
    if (ON.sujo) await enviarSave();
    await ON.sb.auth.signOut({scope:'local'}); ON.user = null; toast('Você saiu da conta. A fazenda continua salva neste aparelho.'); renderJanela();
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
  // logins guardados de cada conta: trocar entre contas já usadas é instantâneo
  const lerSessoes = () => { try { return JSON.parse(localStorage.getItem('terralia-sessoes')) || {}; } catch (e) { return {}; } };
  function guardarSessao(sess) { if (!sess || !sess.user || !sess.refresh_token) return; const m = lerSessoes(); m[sess.user.id] = {access_token:sess.access_token, refresh_token:sess.refresh_token}; try { localStorage.setItem('terralia-sessoes', JSON.stringify(m)); } catch (e) {} }
  function esquecerSessao(uid) { const m = lerSessoes(); delete m[uid]; try { localStorage.setItem('terralia-sessoes', JSON.stringify(m)); } catch (e) {} }
  async function sairDaConta() { // sai de verdade e volta para a tela inicial
    toast('🚪 Saindo…'); try { if (ON.sujo) await enviarSave(); } catch (e) {}
    guardarSlot(); if (ON.user) esquecerSessao(ON.user.id);
    try { await ON.sb.auth.signOut({scope:'local'}); } catch (e) {} ON.user = null;
    carregarFazenda(lerSlot(null) || fazendaNova(null), '🚪 Você saiu da conta');
  }
  function lembrarConta(u) {
    const md = u.user_metadata || {}, l = listaContas().filter(c => c.uid !== u.id);
    l.unshift({uid:u.id, email:u.email || '', nome:md.full_name || md.name || u.email || 'Sua conta', foto:md.avatar_url || md.picture || '', prov:(u.app_metadata && u.app_metadata.provider) || 'google'});
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
    await assumirSessao(); // entrou aqui: o outro aparelho que estiver com a conta é desconectado
    try { const {data:adm} = await ON.sb.from('admins').select('user_id').eq('user_id', uid).maybeSingle(); ON.gm = !!adm; } catch (e) { ON.gm = false; } // conta GM (só o servidor diz quem é)
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
    if (S.nuvemVer === ver) { ON.sincronizado = true; if (mudouAqui || ON.sujo || (S.rev || 0) > (nv.rev || 0)) enviarSave(false, true); return; } // tudo em dia (ou este aparelho tem progresso a mais, ex.: viagem de ilha)
    // saves diferentes: fica o mais recente (o que tem a última coisa feita na fazenda), sem perguntar; o outro vira cópia de segurança
    if (S.rev && nv.rev === S.rev) { S.nuvemVer = ver; salvar(); ON.sincronizado = true; if (ON.sujo) enviarSave(); return; } // mesmo save
    if (!maisAdiantado(S, nv)) { guardarBackup(S, 'aparelho'); carregarFazenda(Object.assign({}, nv, {uid, nuvemVer:ver, salvoEm:ver}), '☁️ Fazenda carregada da nuvem!'); return; }
    guardarBackup(nv, 'nuvem'); ON.sincronizado = true; await enviarSave(false, true); // o deste aparelho é mais novo: sobe para a nuvem
  }
  // cópia de segurança do save que não foi usado (fica 7 dias no aparelho)
  function guardarBackup(dados, origem) {
    try { if (!dados || !dados.nivel) return; localStorage.setItem('terralia-backup', JSON.stringify({em:Date.now(), origem, nivel:dados.nivel, moedas:dados.moedas, dados})); } catch (e) {}
  }
  function lerBackup() {
    try { const b = JSON.parse(localStorage.getItem('terralia-backup') || 'null'); if (!b) return null;
      if (Date.now() - b.em > 7 * 24 * 3600 * 1000) { localStorage.removeItem('terralia-backup'); return null; } return b; } catch (e) { return null; }
  }
  function carregarDaNuvem(nv, ver) { carregarFazenda(Object.assign({}, nv, {uid:ON.user.id, nuvemVer:ver, salvoEm:ver}), '☁️ Fazenda carregada da nuvem!'); }
  async function trocarConta(alvo) { // alvo: uid de uma conta lembrada, 'nova' (outra conta Google) ou 'convidado'
    fechar(); toast('👥 Trocando de conta…');
    if (ON.user && ON.sujo) { try { await enviarSave(); } catch (e) {} }
    guardarSlot();
    if (alvo === 'convidado') {
      if (ON.sb && ON.user) { try { await ON.sb.auth.signOut({scope:'local'}); } catch (e) {} }
      carregarFazenda(lerSlot(null) || fazendaNova(null), '🌱 Jogando sem conta'); return;
    }
    const c = listaContas().find(x => x.uid === alvo);
    if (!ON.sb || !podeLogar()) { toast('Para entrar, abra o jogo pelo endereço do site'); return; }
    const guardada = lerSessoes()[alvo];
    if (guardada) { // troca rápida: usa o login guardado desta conta
      try { if (!jogoIniciado) sessionStorage.setItem('terralia-entrar', '1'); } catch (e) {}
      if (ON.user) { try { await ON.sb.auth.signOut({scope:'local'}); } catch (e) {} ON.user = null; }
      const {error} = await ON.sb.auth.setSession(guardada);
      if (!error) return; // o resto (carregar a fazenda da conta) acontece sozinho ao entrar
      esquecerSessao(alvo);
    }
    if (ON.user) { try { await ON.sb.auth.signOut({scope:'local'}); } catch (e) {} ON.user = null; }
    if (alvo === 'nova' || (c && c.prov === 'email')) { LG.email = c ? c.email : ''; abrirLogin(c ? 'email' : 'inicio'); return; } // e-mail: pede a senha aqui mesmo
    try { if (!jogoIniciado) sessionStorage.setItem('terralia-entrar', '1'); } catch (e) {}
    ON.recarregando = true; // não salva nada por cima enquanto vai para o Google
    const {error} = await ON.sb.auth.signInWithOAuth({provider:c && c.prov === 'facebook' ? 'facebook' : 'google', options:{redirectTo:location.origin + location.pathname, queryParams:c && c.prov === 'facebook' ? undefined : Object.assign({prompt:'select_account'}, c && c.email ? {login_hint:c.email} : {})}});
    if (error) { ON.recarregando = false; toast('Não deu para entrar: ' + error.message); }
  }
  function htmlContas() {
    const atual = ON.user && ON.user.id, l = listaContas(), ses = lerSessoes();
    const icP = p => ({google:'<span class="lg-g mini">G</span>', facebook:'<span class="lg-f mini">f</span>', email:'✉️'}[p || 'google'] || '👤');
    let h = '<p class="dica">Cada conta tem a sua própria fazenda. Ao trocar, a fazenda de agora fica salva e você pode voltar para ela quando quiser.</p>';
    l.forEach(c => h += `<div class="card ${c.uid === atual ? 'amigo-ok' : ''}"><div class="em">${c.foto ? `<img class="foto-conta" src="${esc(c.foto)}" alt="" referrerpolicy="no-referrer">` : '👤'}</div>
      <div class="meio"><div class="nome">${icP(c.prov)} ${esc(c.nome)}</div><div class="det">${esc(c.email)}${c.uid !== atual && ses[c.uid] ? ' · <b class="ok">troca rápida</b>' : ''}</div></div>
      ${c.uid === atual ? '<span class="nv">Jogando agora</span>' : `<button class="btn verde" data-conta="${c.uid}">Usar</button>`}</div>`);
    h += `<div class="card"><div class="em">➕</div><div class="meio"><div class="nome">Entrar com outra conta</div><div class="det">Google, e-mail ou Facebook. Começa com fazenda nova se ainda não tiver</div></div><button class="btn verde" data-acao="outra-conta">Entrar</button></div>`;
    h += `<div class="card ${!atual ? 'amigo-ok' : ''}"><div class="em">📱</div><div class="meio"><div class="nome">Jogar sem conta</div><div class="det">A fazenda fica salva só neste aparelho e não entra no ranking</div></div>
      ${!atual ? '<span class="nv">Jogando agora</span>' : '<button class="btn" data-conta="convidado">Usar</button>'}</div>`;
    if (atual) h += `<div class="card"><div class="em">🚪</div><div class="meio"><div class="nome">Sair desta conta</div><div class="det">Salva tudo e volta para a tela inicial</div></div><button class="btn vermelho" data-acao="sair-conta">Sair</button></div>`;
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
    if (ON.expulso) return;
    ON.enviando = true; ON.tentou = Date.now();
    try {
      if (!(await conferirSessao())) { ON.enviando = false; return; } // a conta foi aberta em outro aparelho: não sobrescreve
      if (!forcar && S.uid === ON.user.id) { // confere se outro aparelho salvou desde a última vez
        const {data} = await lerNuvem('atualizado');
        if (data && verDe(data.atualizado) !== S.nuvemVer) {
          const r = await lerNuvem('dados, atualizado'); ON.enviando = false;
          if (r.data) { const nv = r.data.dados || {}, ver = verDe(r.data.atualizado);
            if (S.rev && nv.rev === S.rev) { S.nuvemVer = ver; salvar(); setTimeout(() => enviarSave(), 50); return; } // é o mesmo save: só a hora mudou
            if (maisAdiantado(nv, S)) { guardarBackup(S, 'aparelho'); carregarDaNuvem(nv, ver); return; } // a nuvem está mais adiantada
            guardarBackup(nv, 'nuvem'); setTimeout(() => enviarSave(false, true), 50); } // este aparelho está mais adiantado: sobrescreve
          return;
        }
      }
      const agora = new Date().toISOString(), p = S.perfil || {};
      S.uid = ON.user.id; S.nuvemVer = verDe(agora); salvar(); S.salvoEm = S.nuvemVer; salvar();
      const r1 = await ON.sb.from('saves').upsert({user_id:ON.user.id, dados:S, atualizado:agora}).select('atualizado').maybeSingle();
      if (!r1.error && r1.data && r1.data.atualizado) { S.nuvemVer = verDe(r1.data.atualizado); try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) {} } // a versão é a hora do servidor
      const rank = !r1.error && (avisar || Date.now() - (ON.ultRank || 0) > 60000); if (rank) ON.ultRank = Date.now(); // ranking e foto pública: no máximo 1 vez por minuto
      const r2 = !rank ? {} : await ON.sb.from('ranking').upsert({user_id:ON.user.id, nome:(p.nome || 'Fazendeiro').slice(0, 24), nivel:S.nivel, producao:producaoTotal(), terras:S.zonas.length + Object.values(S.outras || {}).reduce((t, i) => t + ((i.zonas || []).length), 0), avatar:p.avatar || null, atualizado:agora, visto_em:agora});
      if (rank) ON.sb.from('fazendas_publicas').upsert({user_id:ON.user.id, dados:fotoFazenda(), atualizado:agora}).then(() => {}, () => {});
      if (r2.error && r2.error.code === '23505') { ON.sujo = false; ON.ultimo = Date.now(); ON.erro = 'escolha outro nome para o ranking'; abrirEscolhaNome('ocupado'); ON.enviando = false; return; }
      const err = r1.error || r2.error;
      if (err) { ON.erro = err.message; if (avisar) toast('☁️ Não deu para salvar na nuvem: ' + err.message); }
      else { ON.sujo = false; ON.pausado = false; ON.ultimo = Date.now(); ON.erro = ''; if (avisar) toast('☁️ Fazenda salva na nuvem!', 'bom'); }
    } catch (e) { ON.erro = 'sem internet'; }
    ON.enviando = false;
    if (janela === 'config') renderJanela();
  }

  // ---------- uma conta = um aparelho por vez ----------
  const APARELHO = (() => { try { let a = localStorage.getItem('terralia-aparelho'); if (!a) { a = Date.now().toString(36) + Math.random().toString(36).slice(2, 10); localStorage.setItem('terralia-aparelho', a); } return a; } catch (e) { return 'x' + Math.random().toString(36).slice(2); } })();
  async function assumirSessao() {
    if (!ON.user || VISITA) return;
    try { await ON.sb.from('sessao_ativa').upsert({user_id:ON.user.id, aparelho:APARELHO, desde:new Date().toISOString()}); ON.expulso = false; } catch (e) {}
  }
  async function conferirSessao() { // true = este aparelho continua com a conta
    if (!ON.user || VISITA) return true; if (ON.expulso) return false;
    try {
      const {data, error} = await ON.sb.from('sessao_ativa').select('aparelho').eq('user_id', ON.user.id).maybeSingle();
      if (error) return true; // sem internet: segue jogando, confere de novo depois
      if (!data) { await assumirSessao(); return true; }
      if (data.aparelho !== APARELHO) { expulsar(); return false; }
    } catch (e) {}
    return true;
  }
  function expulsar() {
    if (ON.expulso) return; ON.expulso = true; ON.pausado = true; fechar();
    let el = $('#telaExpulso');
    if (!el) { el = document.createElement('div'); el.id = 'telaExpulso'; document.body.appendChild(el);
      el.addEventListener('click', async e => { const b = e.target.closest('[data-exp]'); if (!b) return;
        el.querySelectorAll('button').forEach(x => x.disabled = true);
        if (b.dataset.exp === 'aqui') { salvar(); await assumirSessao(); const {data} = await lerNuvem('dados, atualizado');
          if (data && !maisAdiantado(S, data.dados || {})) carregarDaNuvem(data.dados, verDe(data.atualizado)); // o outro aparelho jogou mais: fica o de lá
          else if (data) { guardarBackup(data.dados, 'nuvem'); S.nuvemVer = verDe(data.atualizado); ON.expulso = false; ON.pausado = false; el.classList.remove('on'); await enviarSave(true, true); } // este aparelho estava mais adiantado: nada se perde
          else location.reload(); }
        else { ON.sujo = false; sairDaConta(); }
      }); }
    el.innerHTML = `<div class="exp-caixa"><div class="exp-ic">📱</div><h3>Sua conta foi aberta em outro aparelho</h3><p>Para não perder nada, a fazenda só pode ficar aberta em um lugar por vez. O progresso de lá está salvo na nuvem.</p>
      <div class="exp-bt"><button class="btn verde grande" data-exp="aqui">Jogar aqui</button><button class="btn" data-exp="sair">Sair da conta</button></div></div>`;
    el.classList.add('on');
  }
  function salvarAoFechar() { // ao fechar/minimizar: envio que o navegador termina mesmo com a página fechando
    salvar(); if (!ON.user || !ON.sujo || !ON.sincronizado || ON.pausado || ON.expulso || ON.recarregando || !ON.token || S.uid !== ON.user.id) return;
    const agora = new Date().toISOString(); S.nuvemVer = verDe(agora); S.salvoEm = S.nuvemVer; salvar();
    const corpo = JSON.stringify({user_id:ON.user.id, dados:S, atualizado:agora});
    if (corpo.length > 60000) { enviarSave(); return; } // grande demais para o envio especial
    try { fetch(SB_URL + '/rest/v1/saves?on_conflict=user_id', {method:'POST', keepalive:true, headers:{apikey:SB_KEY, Authorization:'Bearer ' + ON.token, 'Content-Type':'application/json', Prefer:'resolution=merge-duplicates,return=minimal'}, body:corpo}); ON.sujo = false; ON.ultimo = Date.now(); } catch (e) { enviarSave(); }
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
  // missões e chat fecham ao tocar fora deles (ou mexer a câmera), como as outras janelas
  document.addEventListener('pointerdown', e => {
    const t = e.target;
    if (missoesAbertas && !t.closest('#missoes')) { missoesAbertas = false; renderMissoes(); }
    if (CHAT.aberto && !t.closest('#chat') && !t.closest('[data-chat-abrir]') && !t.closest('.toast')) fecharChat();
  }, true);
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
    if (!ON.user) return `<div class="linha-cfg"><span>☁️ Salve sua fazenda na nuvem e entre no ranking</span><button class="btn verde" data-acao="entrar-google">Entrar / criar conta</button></div>`
      + (listaContas().length ? '<div class="linha-cfg"><span>👥 Contas usadas neste aparelho</span><button class="btn" data-abrir="contas">Contas</button></div>' : '') + rank;
    const md = ON.user.user_metadata || {}, nome = md.full_name || md.name || ON.user.email || 'Sua conta';
    const gm = ON.gm ? `<div class="linha-cfg col gm-painel"><span>🛡️ Painel GM (só esta conta) · fora do ranking</span><span class="botoes-cfg">
      <button class="btn" data-gm="n1">+1 nível</button><button class="btn" data-gm="n10">+10 níveis</button><button class="btn" data-gm="m10k">+10 mil 🪙</button><button class="btn" data-gm="m1m">+1 milhão 🪙</button></span></div>` : '';
    return gm + `<div class="linha-cfg"><span>☁️ ${esc(nome)}<br><small class="det">${ON.erro ? '⚠️ ' + esc(ON.erro) : ON.sujo ? 'salvando em instantes…' : 'salvo na nuvem às ' + hora(ON.ultimo || S.salvoEm)}</small></span>
      <span class="botoes-cfg"><button class="btn" data-acao="salvar-nuvem">Salvar agora</button></span></div>
      <div class="linha-cfg"><span>✏️ Nome no ranking: <b>${esc((S.perfil && S.perfil.nome) || 'Fazendeiro')}</b></span><button class="btn" data-acao="mudar-nome">Trocar</button></div>
      <div class="linha-cfg"><span>👥 Trocar de conta ou jogar sem conta</span><button class="btn" data-abrir="contas">Contas</button></div>
      <div class="linha-cfg"><span>🚪 Sair da conta e voltar para a tela inicial</span><button class="btn vermelho" data-acao="sair-conta">Sair</button></div>` + rank;
  }
  function htmlNuvem() {
    const n = ON.nuvem || {}, cart = (ic, tit, d, ac) => `<div class="card"><div class="em">${ic}</div><div class="meio"><div class="nome">${tit}</div>
      <div class="det">⭐ Nível ${d.nivel || 1} · ${moedaMini}${fmtN(d.moedas || 0)} · 🌾 ${fmtN(d.colhidos || 0)} colhidos</div><div class="det">Salvo em ${hora(d.salvoEm)}</div></div>
      <div class="botoes"><button class="btn verde" data-acao="${ac}">Usar esta</button></div></div>`;
    if (ON.motivo === 'levar') return `<p class="dica">Você estava jogando <b>sem conta</b> neste aparelho. Quer levar essa fazenda para a sua conta? Assim ela fica salva na nuvem e entra no ranking.</p>`
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
  QUAL = S.qual || (S.leve ? 'leve' : 'alta'); S.qual = QUAL;
  aplicarQualidade();
  if (!S.audio) S.audio = {musica:.5, efeitos:.8, mudo:false};
  if (window.SOM) { SOM.config(S.audio); SOM.tocarMusica(); }
  montarCeu(); montarIlha(); montarTerras(); montarNuvens(); montarObjetos(); montarPersonagens(); montarTonho(); montarPorto();
  azAtual = azAlvo = S.camLivre && S.azLivre != null ? S.azLivre : Math.PI / 4 + (S.az || 0) * Math.PI / 2; inclina = S.camLivre ? S.inclina || 0 : 0; pintarTrava();
  redimensionar();
  atualizarProducao();
  tudo();
  requestAnimationFrame(animar);
  carregarModelos().then(conferirNatureza); setInterval(conferirNatureza, 1500); // modelos dos packs: baixam em segundo plano
  iniciarOnline();
  iniciarVenda();
  if (VISITA) { document.body.classList.add('visitando'); renderVisita(); $('#barraVisita').addEventListener('click', e => { if (e.target.closest('[data-acao=voltar-visita]')) voltarDaVisita(); }); } else aplicarRecompensaVisita();
  setTimeout(() => procurarVersao(false), 2500); setInterval(() => procurarVersao(false), 60 * 1000); // confere a cada 1 minuto
  addEventListener('focus', () => procurarVersao(false)); addEventListener('online', () => procurarVersao(false)); addEventListener('pageshow', () => procurarVersao(false));
  document.addEventListener('visibilitychange', () => { if (!document.hidden) procurarVersao(false); });
  try { const m = sessionStorage.getItem('terralia-msg'); if (m) { sessionStorage.removeItem('terralia-msg'); setTimeout(() => toast(m, 'bom'), 800); } } catch (e) {}
  $('#jcorpo').addEventListener('input', e => { const tb = e.target.closest('[data-tela-barra]'); // barrinhas de tamanho: muda na hora
    if (tb) { const k = tb.dataset.telaBarra; TELA[k] = Math.round(+tb.value * 100) / 100; const v = $(`[data-tela-val=${k}]`); if (v) v.textContent = Math.round(TELA[k] * 100) + '%'; if (k !== 'txt') aplicarTela(); return; } });
  $('#jcorpo').addEventListener('change', e => { const tb = e.target.closest('[data-tela-barra]'); if (tb) { salvarTela(); renderJanela(); } });
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
  function renderBaixar() {
    const el = $('#painelBaixar'); if (!el) return;
    const ua = navigator.userAgent, ios = /iPhone|iPad|iPod/i.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1), android = /Android/i.test(ua), dentroApp = /Instagram|FBAN|FBAV|WhatsApp|Line\/|TikTok|Snapchat/i.test(ua);
    let passos;
    if (dentroApp) passos = '<li>Toque nos <b>três pontinhos ⋮</b> do app</li><li>Escolha <b>Abrir no navegador</b></li><li>Lá, toque em <b>Instalar</b></li>';
    else if (ios) passos = '<li>No <b>Safari</b>, toque em <b>Compartilhar</b> ⬆️</li><li>Toque em <b>Adicionar à Tela de Início</b> ➕</li><li>Abra o jogo pelo ícone 🐄</li>';
    else if (android) passos = '<li>Toque em <b>Instalar</b> aqui embaixo</li><li>Ou no Chrome: <b>⋮ → Instalar app</b></li><li>Abra o jogo pelo ícone 🐄</li>';
    else passos = '<li>Abra este endereço <b>no seu celular</b></li><li>Ou no Chrome/Edge do computador: ícone de <b>instalar</b> na barra de endereço</li><li>Abra o jogo pelo ícone 🐄</li>';
    el.innerHTML = `<div class="bx-tit">📲 Instale o jogo para jogar</div>
      <button class="btn-jogar bx-bt" id="btnBaixar">${pedidoInstalar ? 'INSTALAR' : 'BAIXAR'}</button>
      <ol class="bx-passos">${passos}</ol>
      <small class="bx-obs">É grátis, não ocupa quase nada e abre em tela cheia como um aplicativo.</small>`;
    $('#btnBaixar').addEventListener('click', e => { e.stopPropagation(); if (pedidoInstalar) { pedidoInstalar.prompt(); pedidoInstalar.userChoice.then(r => { if (r && r.outcome === 'accepted') { el.querySelector('.bx-tit').textContent = '✅ Instalando… depois abra pelo ícone 🐄'; } }).finally(() => { pedidoInstalar = null; renderBaixar(); }); } else ajudaInstalar(); });
  }
  if (MODO_BAIXAR) { document.body.classList.add('modo-baixar'); renderBaixar(); window.addEventListener('beforeinstallprompt', () => setTimeout(renderBaixar, 0)); }
  window.addEventListener('appinstalled', () => { pedidoInstalar = null; if (MODO_BAIXAR) { const t = $('#painelBaixar .bx-tit'); if (t) t.textContent = '✅ Instalado! Abra o jogo pelo ícone 🐄 na sua tela'; } if (btnInst) btnInst.textContent = '✅ Instalado! Abra pelo ícone'; toast('📲 Terrália Farm instalado! Abra pelo ícone na tela inicial.', 'bom'); if (janela === 'config') renderJanela(); });
  setInterval(tickMercado, MERCADO_MS);
  setInterval(salvar, 2000); // grava no aparelho a cada 2 s (só se algo mudou)
  document.addEventListener('visibilitychange', () => { if (document.hidden) salvar(); });

  // terminou de montar a fazenda: tira a tela de carregamento (visitas) e pula a capa
  if (sessionStorage.getItem('terralia-indo')) {
    sessionStorage.removeItem('terralia-indo');
    const sp = $('#splash'); if (sp) sp.remove();
    aplicarAvatar();
    requestAnimationFrame(() => requestAnimationFrame(() => { if (window.esconderCarregando) window.esconderCarregando(); }));
  }
  let jogoIniciado = false;
  function iniciarJogo(comGesto) {
    if (jogoIniciado) return; jogoIniciado = true;
    try { sessionStorage.removeItem('terralia-entrar'); } catch (e) {}
    setTimeout(() => { try {
      if (VISITA) return;
      if (MED && !S.medTut && S.tut === -1) { S.medTut = 1; iniciarTutExtra('medChegada'); } // primeira vez na Ilha Medieval
      else if (!S.tourVisto && S.tut === -1 && S.nivel <= 10) { S.tourVisto = 1; iniciarTutExtra('tour'); } // quem está começando ganha o passeio pelos menus
      else if (!mostrarNovidades()) lembrarPasse(); } catch (e) {} }, 4500);
    if (MED && !VISITA && !$('#btnCacada')) { const b = document.createElement('button'); b.className = 'gbtn'; b.id = 'btnCacada'; b.dataset.abrir = 'cacada';
      b.innerHTML = '<i class="emo-gbtn">🦋</i><span>Caçada</span><b class="badge" id="badgeCacada"></b>'; $('.cantos.esq').appendChild(b); }
    $('#telaLogin').classList.remove('on');
    if (MOBILE && comGesto) {
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
    if (!ON.user) setTimeout(() => lembrarConvidado(true), 2500);
  }
  // ---------- tela de entrar (antes do jogo) ----------
  const LG = {modo:'inicio', ocupado:false, provs:null, msg:''};
  const iosApp = () => /iPhone|iPad|iPod/i.test(navigator.userAgent) && instalado();
  async function provedores() {
    if (LG.provs) return LG.provs;
    try { const r = await fetch(SB_URL + '/auth/v1/settings', {headers:{apikey:SB_KEY}}); const j = await r.json(); LG.provs = Object.assign({}, j.external || {}, {autoconfirm:!!j.mailer_autoconfirm}); }
    catch (e) { LG.provs = {google:true, email:true}; }
    return LG.provs;
  }
  function renderLogin() {
    const el = $('#lgCorpo'), pv = LG.provs || {google:true, email:true}, m = LG.modo;
    let h = '';
    if (m === 'carregando') h = `<div class="lg-carregando"><div class="lg-roda"></div><b>☁️ Carregando sua fazenda…</b><small>${LG.msg || ''}</small></div>`;
    else if (m === 'inicio') {
      h = `<p class="lg-sub">Entre com uma conta para salvar sua fazenda na nuvem e jogar em qualquer aparelho.</p>
        ${iosApp() ? `<button class="lg-bt email" data-lg="email">✉️ Entrar com e-mail e senha</button>` : ''}
        ${pv.google !== false ? `<button class="lg-bt google" data-lg="google"><span class="lg-g">G</span> Continuar com Google</button>` : ''}
        ${pv.facebook ? `<button class="lg-bt facebook" data-lg="facebook"><span class="lg-f">f</span> Continuar com Facebook</button>` : ''}
        ${!iosApp() ? `<button class="lg-bt email" data-lg="email">✉️ Entrar com e-mail e senha</button>` : ''}
        <div class="lg-ou"><span>ou</span></div>
        <button class="lg-bt conv" data-lg="convidado">👤 Jogar como convidado</button>
        <small class="lg-aviso">Como convidado, a fazenda fica salva só neste aparelho.</small>
        ${iosApp() ? '<small class="lg-aviso">No iPhone com o jogo instalado, use o <b>e-mail</b>: o Google e o Facebook podem não voltar para o app.</small>' : ''}`;
    } else if (m === 'email' || m === 'criar') {
      const cr = m === 'criar';
      h = `<div class="lg-abas"><button class="${cr ? '' : 'ativa'}" data-lg="email">Entrar</button><button class="${cr ? 'ativa' : ''}" data-lg="criar">Criar conta</button></div>
        <form id="lgForm" autocomplete="on">
          <input id="lgEmail" type="email" placeholder="Seu e-mail" autocomplete="email" required value="${esc(LG.email || '')}">
          <input id="lgSenha" type="password" placeholder="${cr ? 'Crie uma senha (mínimo 6)' : 'Sua senha'}" autocomplete="${cr ? 'new-password' : 'current-password'}" minlength="6" required>
          ${cr ? '<input id="lgSenha2" type="password" placeholder="Repita a senha" autocomplete="new-password" minlength="6" required>' : ''}
          <button class="lg-bt verde" type="submit">${cr ? '🌱 Criar conta e jogar' : '▶ Entrar e jogar'}</button>
        </form>
        ${cr ? '<small class="lg-aviso">Pode usar qualquer e-mail, inclusive o do iCloud.</small>' : '<button class="lg-link" data-lg="esqueci">Esqueci minha senha</button>'}
        <div class="lg-msg">${LG.msg || ''}</div>
        <button class="lg-link" data-lg="inicio">◀ Outras formas de entrar</button>`;
    } else if (m === 'gmail') {
      h = `<div class="lg-gmail">📧 <b>${esc(LG.email || '')}</b> é um e-mail do <b>Google</b>. Entrar com o Google é mais fácil e não precisa de senha.</div>
        <button class="lg-bt google" data-lg="google"><span class="lg-g">G</span> Entrar com Google</button>
        <button class="lg-bt email" data-lg="gmailok">✉️ Continuar com e-mail e senha</button>`;
    } else if (m === 'esqueci') {
      h = `<p class="lg-sub">Digite seu e-mail. Vamos mandar um link para você criar uma senha nova.</p>
        <form id="lgForm"><input id="lgEmail" type="email" placeholder="Seu e-mail" autocomplete="email" required value="${esc(LG.email || '')}"><button class="lg-bt verde" type="submit">Mandar link</button></form>
        <div class="lg-msg">${LG.msg || ''}</div><button class="lg-link" data-lg="email">◀ Voltar</button>`;
    } else if (m === 'novaSenha') {
      h = `<p class="lg-sub">Crie sua senha nova:</p>
        <form id="lgForm"><input id="lgSenha" type="password" placeholder="Senha nova (mínimo 6)" autocomplete="new-password" minlength="6" required><button class="lg-bt verde" type="submit">Salvar senha e jogar</button></form>
        <div class="lg-msg">${LG.msg || ''}</div>`;
    }
    el.innerHTML = h;
  }
  function abrirLogin(modo) { LG.modo = modo || 'inicio'; LG.msg = ''; $('#telaLogin').classList.add('on'); renderLogin(); provedores().then(() => { if (LG.modo === 'inicio') renderLogin(); }); }
  function esperarSincronizar() { // depois de entrar: espera a fazenda da conta chegar antes de abrir o jogo
    LG.modo = 'carregando'; renderLogin();
    try { sessionStorage.setItem('terralia-entrar', '1'); } catch (e) {}
    const t0 = Date.now(), iv = setInterval(() => {
      if (ON.recarregando) { clearInterval(iv); return; } // vai recarregar com a fazenda da conta e entrar sozinho
      if (ON.sincronizado || ON.pausado || Date.now() - t0 > 9000) { clearInterval(iv); iniciarJogo(false); }
    }, 200);
  }
  const msgErro = e => { const m = (e && e.message || '') + ''; return /Invalid login/i.test(m) ? 'E-mail ou senha incorretos.' : /already registered|already been registered/i.test(m) ? 'Esse e-mail já tem conta. Use a aba Entrar.' : /Password should be/i.test(m) ? 'A senha precisa ter pelo menos 6 caracteres.' : /rate limit|too many/i.test(m) ? 'Muitas tentativas. Espere alguns minutos.' : /not confirmed/i.test(m) ? 'Confirme seu e-mail pelo link que mandamos e tente de novo.' : /network|fetch/i.test(m) ? 'Sem internet agora.' : 'Não deu: ' + m; };
  async function enviarLogin(ev) {
    ev.preventDefault(); if (LG.ocupado || !ON.sb) return; const m = LG.modo;
    const email = ($('#lgEmail') || {}).value, senha = ($('#lgSenha') || {}).value;
    if (email) LG.email = email;
    if ((m === 'email' || m === 'criar') && /@(gmail|googlemail)\.com$/i.test(email || '') && !LG.gmailOk) {
      LG._s = [senha, ($('#lgSenha2') || {}).value]; LG._m = m; LG.modo = 'gmail'; LG.msg = ''; renderLogin(); return;
    }
    LG.ocupado = true; const bt = $('#lgForm button'); if (bt) bt.disabled = true;
    try {
      if (m === 'criar') {
        if (senha !== $('#lgSenha2').value) throw {message:'As senhas não são iguais.'};
        const {data, error} = await ON.sb.auth.signUp({email, password:senha, options:{emailRedirectTo:location.origin + location.pathname}}); if (error) throw error;
        if (!data.session) { LG.msg = '📧 Conta criada! Abra o link que mandamos para o seu e-mail e depois entre aqui.'; LG.modo = 'email'; }
        else esperarSincronizar();
      } else if (m === 'email') {
        const {error} = await ON.sb.auth.signInWithPassword({email, password:senha}); if (error) throw error; esperarSincronizar();
      } else if (m === 'esqueci') {
        const {error} = await ON.sb.auth.resetPasswordForEmail(email, {redirectTo:location.origin + location.pathname}); if (error) throw error;
        LG.msg = '📧 Pronto! Veja seu e-mail (e a caixa de spam).';
      } else if (m === 'novaSenha') {
        const {error} = await ON.sb.auth.updateUser({password:senha}); if (error) throw error; esperarSincronizar();
      }
    } catch (e) { LG.msg = '⚠️ ' + (e.message && !e.status && !e.code && !e.name ? e.message : msgErro(e)); }
    LG.ocupado = false; if (LG.modo !== 'carregando') renderLogin();
  }
  async function entrarOAuth(prov) {
    if (!ON.sb) { LG.msg = 'Sem conexão com o servidor agora'; return; }
    try { sessionStorage.setItem('terralia-entrar', '1'); } catch (e) {}
    ON.recarregando = true; LG.modo = 'carregando'; LG.msg = 'Abrindo ' + (prov === 'google' ? 'o Google' : 'o Facebook') + '…'; renderLogin();
    const {error} = await ON.sb.auth.signInWithOAuth({provider:prov, options:{redirectTo:location.origin + location.pathname, queryParams:prov === 'google' ? {prompt:'select_account'} : undefined}});
    if (error) { ON.recarregando = false; LG.modo = 'inicio'; renderLogin(); toast('Não deu para entrar: ' + error.message); }
  }
  $('#telaLogin').addEventListener('click', e => {
    const b = e.target.closest('[data-lg]'); if (!b) return; const a = b.dataset.lg;
    if (a === 'google' || a === 'facebook') { if (!podeLogar()) { toast('Abra o jogo pelo endereço do site para entrar'); return; } entrarOAuth(a); return; }
    if (a === 'convidado') {
      if (S.uid && !ON.user) { guardarSlot(); try { sessionStorage.setItem('terralia-entrar-conv', '1'); } catch (er) {} carregarFazenda(lerSlot(null) || fazendaNova(null), '🌱 Jogando sem conta'); return; } // a fazenda aberta é de uma conta: abre a do convidado
      if (jogoIniciado) { $('#telaLogin').classList.remove('on'); return; } iniciarJogo(true); return; }
    if (a === 'fechar') { $('#telaLogin').classList.remove('on'); if (!jogoIniciado) iniciarJogo(true); return; }
    if (a === 'gmailok') { LG.gmailOk = true; LG.msg = ''; LG.modo = LG._m || 'email'; renderLogin(); const t = LG._s || []; LG._s = null; if ($('#lgSenha')) $('#lgSenha').value = t[0] || ''; if ($('#lgSenha2')) $('#lgSenha2').value = t[1] || ''; if (t[0]) $('#lgForm').requestSubmit ? $('#lgForm').requestSubmit() : null; return; }
    LG.modo = a; LG.msg = ''; renderLogin(); const i = $('#lgEmail'); if (i && !MOBILE) i.focus();
  });
  $('#telaLogin').addEventListener('submit', enviarLogin);
  $('#telaLogin').addEventListener('keydown', e => e.stopPropagation());
  // conta na tela inicial: mostra com quem está conectado e deixa trocar
  function renderContaSplash() {
    const el = $('#contaSplash'); if (!el || jogoIniciado) return;
    if (!ON.sb || !podeLogar()) { el.innerHTML = ''; return; }
    const u = ON.user, md = (u && u.user_metadata) || {}, nome = u ? (md.full_name || md.name || u.email || 'Sua conta') : 'Convidado', foto = md.avatar_url || md.picture || '';
    const prov = u && u.app_metadata ? u.app_metadata.provider : '', ic = {google:'<span class="lg-g mini">G</span>', facebook:'<span class="lg-f mini">f</span>', email:'✉️'}[prov] || '👤';
    const outras = listaContas().filter(c => !u || c.uid !== u.id);
    el.innerHTML = `<button class="cs-chip" data-cs="menu">${foto ? `<img src="${esc(foto)}" alt="" referrerpolicy="no-referrer">` : `<span class="cs-av">${u ? esc(nome[0].toUpperCase()) : '👤'}</span>`}
        <span class="cs-txt"><small>${u ? 'Conectado como' : 'Sem conta'}</small><b>${esc(nome)}</b></span><span class="cs-seta">▾</span></button>
      <div class="cs-menu">
        ${u ? `<div class="cs-atual">${ic} <span>${esc(u.email || nome)}</span><em>conectado</em></div>` : '<div class="cs-atual">👤 <span>Jogando como convidado</span><em>só neste aparelho</em></div>'}
        ${outras.map(c => `<button class="cs-op" data-cs-conta="${c.uid}">${{google:'<span class="lg-g mini">G</span>', facebook:'<span class="lg-f mini">f</span>', email:'✉️'}[c.prov || 'google'] || '👤'} <span>${esc(c.email || c.nome)}</span></button>`).join('')}
        <button class="cs-op" data-cs="outra">➕ ${u ? 'Entrar com outra conta' : 'Entrar / criar conta'}</button>
        ${u ? '<button class="cs-op" data-cs="convidado">👤 Jogar como convidado</button><button class="cs-op sair" data-cs="sair">🚪 Sair desta conta</button>' : ''}
      </div>`;
  }
  $('#contaSplash').addEventListener('click', async e => {
    e.stopPropagation(); const el = $('#contaSplash'), b = e.target.closest('[data-cs], [data-cs-conta]'); if (!b) return;
    if (b.dataset.cs === 'menu') { el.classList.toggle('aberto'); return; }
    el.classList.remove('aberto');
    if (b.dataset.csConta) { trocarConta(b.dataset.csConta); return; }
    const a = b.dataset.cs;
    if (a === 'outra') { if (ON.user) { try { if (ON.sujo) await enviarSave(); guardarSlot(); await ON.sb.auth.signOut({scope:'local'}); } catch (er) {} ON.user = null; renderContaSplash(); } LG.email = ''; abrirLogin('inicio'); return; }
    if (a === 'sair') { sairDaConta(); return; }
    if (a === 'convidado') { trocarConta('convidado'); return; }
  });
  document.addEventListener('click', () => { const el = $('#contaSplash'); if (el) el.classList.remove('aberto'); });
  setTimeout(renderContaSplash, 0);
  try { if (sessionStorage.getItem('terralia-entrar-conv')) { sessionStorage.removeItem('terralia-entrar-conv'); setTimeout(() => iniciarJogo(false), 300); } } catch (e) {}
  // lembrete para quem joga sem conta
  let ultLembrete = 0;
  function lembrarConvidado(forcar) {
    if (ON.user || VISITA || !jogoIniciado || (!forcar && Date.now() - ultLembrete < 15 * 60000)) return;
    ultLembrete = Date.now(); const f = $('#faixaConta'); f.classList.add('on'); clearTimeout(f._t); f._t = setTimeout(() => f.classList.remove('on'), 12000);
  }
  setInterval(() => lembrarConvidado(false), 60000);
  $('#faixaConta').addEventListener('click', e => { $('#faixaConta').classList.remove('on'); if (!e.target.closest('.fc-x')) abrirLogin('inicio'); });
  ($('#btnJogar') || document.createElement('i')).addEventListener('click', async () => {
    await Promise.race([procurarVersao(false), new Promise(r => setTimeout(r, 3500))]); // antes de entrar: confere se é a versão mais nova
    if (atualizando || bloqueio) return;
    if (ON.user) { iniciarJogo(true); return; }
    if (ON.sb) { try { const {data} = await ON.sb.auth.getSession(); if (data && data.session) { iniciarJogo(true); return; } } catch (e) {} }
    if (!ON.sb || !podeLogar()) { iniciarJogo(true); return; } // sem servidor (arquivo local/prévia): joga direto
    abrirLogin('inicio');
  });

  // atalhos para testes no console: Terralia.dar(1000), Terralia.nivel(5)
  if (/^(localhost|127\.0\.0\.1)$/.test(location.hostname) || location.protocol === 'file:') window.Terralia = { dar:(m = 1000) => { S.moedas += m; tudo(); }, nivel:n => { S.nivel = n; atualizarPlacasTerra(); tudo(); }, estado:() => S,
    _teste:{ olhar:id => { const c = centro(objPorId(id)), d = camera.position.clone().sub(controls.target); controls.target.copy(c); camera.position.copy(c).add(d); controls.update(); }, tocar:id => clicarConstrucao(objPorId(id)), colher:i => { colher(i); tudo(); }, dica:() => mostrarDica(true), pomar:id => { colherPomar(objPorId(id)); tudo(); }, foco:(x, z) => { const d = camera.position.clone().sub(controls.target); controls.target.set(x, 0, z); camera.position.copy(controls.target).add(d); controls.update(); }, expulsar:() => expulsar(), zoom:d => { const v = camera.position.clone().sub(controls.target); v.setLength(d); camera.position.copy(controls.target).add(v); }, cena:() => scene, rend:() => renderer, matsvg:() => MAT_SVG, praga:i => { const p = S.plots[i]; p.pragaEm = Date.now() - 1000; atualizarTile(i); }, edit:() => editar.ativo, objPos:id => { const v = centro(objPorId(id)).project(camera); return [(v.x + 1) / 2 * innerWidth, (1 - v.y) / 2 * innerHeight]; }, sel:id => { entrarEdicao(); selecionar(objPorId(id)); }, grupos:() => { const r = []; scene.children.forEach(c => { let m = 0; c.traverse(o => { if (o.isMesh) m++; }); r.push([c.name || c.type + (c.userData && c.userData.tipo ? ':' + c.userData.tipo : ''), m]); }); r.sort((a, b) => b[1] - a[1]); return JSON.stringify(r.slice(0, 15)); }, info:() => { let n = 0, m = 0, st = 0; scene.traverse(o => { n++; if (o.isMesh) m++; if (!o.matrixAutoUpdate) st++; }); return JSON.stringify({calls:renderer.info.render.calls, tris:renderer.info.render.triangles, objetos:n, meshes:m, estaticos:st, geo:renderer.info.memory.geometries, tex:renderer.info.memory.textures, pr:renderer.getPixelRatio()}); },
      irPara:(x, z) => irPara(V3(x, 0, z)), centro:() => { focoCam = heroi.g.position.clone(); },
      editar:() => entrarEdicao(), comprar:t => comprarConstrucao(t), cancelar:() => cancelarSel(), nivelTela:n => mostrarNivel(n, [], premiosNivel(n)), abrir:(n, sb) => abrir(n, sb), sel:id => selecionar(objPorId(id)), mover:(x, z) => moverSel(V3(x, 0, z)), girar:() => girarSel(), ok:() => confirmarSel(), sair:() => sairEdicao(),
      filaIds:() => [heroi.atual, ...heroi.fila].filter(Boolean).map(a => (a.lista || [a.i]).length),
      proj:(x, y, z) => { const v = V3(x, y, z).project(camera); return [Math.round((v.x + 1) / 2 * innerWidth), Math.round((1 - v.y) / 2 * innerHeight)]; },
      tilePos:i => { const v = posTile(i).project(camera); return [(v.x + 1) / 2 * innerWidth, (1 - v.y) / 2 * innerHeight]; }, heroi:() => JSON.stringify({fila:heroi.fila.map(a => a.tipo), atual:heroi.atual && {tipo:heroi.atual.tipo, fase:heroi.atual.fase, t:heroi.atual.t}, rota:heroi.rota.length, pos:heroi.g.position}), obj:id => clicarConstrucao(objPorId(id)), objs:() => S.objetos.map(o => o.id + ':' + o.tipo).join(' '), abrir:(n, x) => abrir(n, x), tile:i => clicarTile(i), ferr:f => { S.ferramenta = f; }, zona:k => comprarZona(k), cam:(x, z, d) => { controls.target.set(x, 0, z); camera.position.set(x + d * .5, d * .6, z + d * .5); }, girar90:() => girarCamera(), zonas:() => ZONAS.map(z => z.key), construir:t => { S.moedas += custoConstrucao(t); comprarConstrucao(t); }, nome:(id, ms) => mostrarNome(objPorId(id), ms), nomes:() => Object.values(obj3D).filter(r => r.rot && r.rot.visible).length + "/" + Object.values(obj3D).filter(r => r.rot).length + " ed:" + editar.ativo } };
})();
