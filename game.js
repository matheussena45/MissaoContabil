// =========================================================
// EMPRESÁRIO EM AÇÃO — protótipo jogável
//
// COMO PERSONALIZAR:
//  - Cores da marca: editar THEME (abaixo) + :root em style.css (manter os dois sincronizados)
//  - Personagens jogáveis: editar CHARACTERS (abaixo) + arquivos em assets/characters/<id>/
//  - Fases, murais e perguntas: editar PHASES
//  - Textos "Sobre o escritório" / "Sobre o criador": editar diretamente no index.html
// =========================================================

const RANKING_KEY = 'empresario_ranking_v1';
const MAX_LIVES = 6;
const INFO_PROXIMITY_RADIUS = 90; // px — raio em que o mural fica visível
const ANSWER_SECONDS = 30;  // tempo pra responder depois que as alternativas aparecem
const ONCE_BUBBLE_MIN_MS = 4500; // tempo mínimo que um mural "de uso único" fica aberto, mesmo andando

// ---------------------------------------------------------
// TEMA / IDENTIDADE VISUAL (deve bater com :root em style.css)
// ---------------------------------------------------------
const THEME = {
  primary: 0x14213d,       // azul-marinho
  primaryDark: 0x0b1526,
  accent: 0xf2a900,        // dourado
  accentLight: 0xffe27a,
  cream: 0xf5f0e6,
  danger: 0xc0392b,
  success: 0x2e7d32,
  skin: 0xe8b892,
  hair: 0x2b1d12,
  shoe: 0x111111,
};

// ---------------------------------------------------------
// PERSONAGENS JOGÁVEIS
// Para adicionar um novo (ex: uma variação mulher), basta:
//  1. Colocar Idle.png e Walk.png em assets/characters/<id>/
//  2. Colocar uma miniatura em assets/thumbnails/<id>.png
//  3. Adicionar uma entrada aqui + um botão em index.html (#character-select)
// ---------------------------------------------------------
const CHARACTERS = [
  { id: 'city_men_1', label: 'Personagem 1', idleFrames: 6, walkFrames: 10 },
  { id: 'city_girl_1', label: 'Personagem 2', idleFrames: 6, walkFrames: 10 },
  { id: 'city_men_3', label: 'Personagem 3', idleFrames: 6, walkFrames: 10 },
];
const CHARACTER_FRAME_SIZE = 128;
// Hitbox real do personagem dentro do frame 128x128 (o resto é espaço transparente)
const CHARACTER_BODY = { width: 44, height: 70, offsetX: 42, offsetY: 58 };
const CHARACTER_SCALE = 2.7; // aumenta/diminui o tamanho do personagem em tela

// ---------------------------------------------------------
// ESTADO GLOBAL DO JOGO (sobrevive entre trocas de fase/cena)
// ---------------------------------------------------------
const GameData = {
  playerName: 'Empresário',
  selectedCharacter: CHARACTERS[0].id,
  lives: MAX_LIVES,
  score: 0,
  phaseIndex: 0,
  infosSeen: new Set(),   // apenas estatística/curiosidade — NÃO pontua
  correctAnswers: 0,
  startTime: null,
  paused: false,          // true SOMENTE durante a batalha do boss
  sessionId: 0,           // incrementado a cada nova partida — invalida timers/callbacks antigos
  hasEnded: false,        // trava para impedir salvar o ranking duas vezes na mesma partida
};

function resetGameData() {
  GameData.lives = MAX_LIVES;
  GameData.score = 0;
  GameData.phaseIndex = 0;
  GameData.infosSeen = new Set();
  GameData.correctAnswers = 0;
  GameData.startTime = Date.now();
  GameData.paused = false;
  GameData.sessionId += 1;
  GameData.hasEnded = false;
}

// ---------------------------------------------------------
// CONTEÚDO DAS FASES
// ---------------------------------------------------------
const PHASES = [
  {
    id: 'fase1',
    name: 'Abrindo sua Empresa',
    startX: 80,
    startDirection: 'right',
    hasBoss: true,
    exitInitiallyOpen: false,

    skyColor: 0x18233d,
    groundColor: 0x2c3350,
    decorColor: 0x22304f,
    levelWidth: 1990,
    bg: 'street_bg.png',
    bossX: 1750,
    bossY: 460,
    doorX: 1770,
    groundY: 480,
    showExitArrow: true,
    exitDirection: 'forward', // seta aponta pra frente
    characterScale: 1.8,
    infoSpots: [
      { x: 440, y: 340, text: 'Nota fiscal registra a venda oficialmente — evita problemas com o fisco e passa confiança ao cliente.' },
      { x: 820, y: 320, text: 'A reforma tributária vai unificar vários impostos em dois: CBS e IBS.' },
      { x: 1300, y: 320, text: 'Planejamento tributário legal ajuda a pagar só o imposto necessário, dentro da lei.' },
    ],
    boss: {
      name: 'Guardião da Reforma Tributária',
      questions: [
        { q: 'Para que serve emitir nota fiscal?', options: ['Só para o cliente ter um papel', 'Para registrar a venda oficialmente e evitar problemas', 'Não é importante para pequenas empresas', 'É opcional em qualquer venda'], correct: 1, explanation: 'A nota fiscal formaliza a venda perante o fisco e transmite mais confiança e segurança ao cliente.' },
        { q: 'A reforma tributária vai unificar vários tributos em quais siglas?', options: ['ICMS e ISS', 'CBS e IBS', 'IPTU e IPVA', 'INSS e FGTS'], correct: 1, explanation: 'A reforma cria a CBS (federal) e o IBS (estadual/municipal), substituindo vários tributos atuais.' },
        { q: 'O que é planejamento tributário (feito de forma legal)?', options: ['Sonegar imposto', 'Organizar a empresa para pagar só o imposto devido, dentro da lei', 'Atrasar pagamentos de propósito', 'Um tipo de empréstimo bancário'], correct: 1, explanation: 'Planejamento tributário legal significa estruturar a empresa para não pagar mais imposto do que o necessário, sempre dentro da lei.' },
      ],
    },
  },
  {
    id: 'fase2',
    name: 'Organizando a Empresa',
    startX: 80,
    startDirection: 'right',
    hasBoss: true,
    exitInitiallyOpen: false,
    showExitArrow: true,
    exitDirection: 'backward', // seta aponta pra trás (saindo da empresa)

    skyColor: 0x18233d,
    groundColor: 0x2c3350,
    decorColor: 0x22304f,
    levelWidth: 1990,
    bg: 'agencia_bg.png',
    bossX: 1790,
    bossY: 290,
    doorX: 100,
    groundY: 400,
    characterScale: 2.2,
    infoSpots: [
      { x: 195, y: 235, text: 'Olá, Seja bem vindo a Agência Sebrae RN.', textAfterBoss: 'Tchau! Foi um prazer te ajudar, volte sempre.', },
      { x: 700, y: 245, text: 'Pró-labore é o salário do dono — separar isso do lucro da empresa evita confusão financeira.', once: true, },
      { x: 1400, y: 255, text: 'Misturar conta pessoal com conta da empresa é um dos erros mais comuns de quem começa.', once: true, },
    ],
    boss: {
      name: 'Fiscalizador das Finanças',
      questions: [
        { q: 'O que é fluxo de caixa?', options: ['O lucro anual da empresa', 'O controle de entradas e saídas de dinheiro', 'Um tipo de imposto', 'O valor do capital social'], correct: 1, explanation: 'Fluxo de caixa mostra tudo que entra e sai da empresa, ajudando a saber se sobra ou falta dinheiro no mês.' },
        { q: 'O que é pró-labore?', options: ['O lucro repartido entre sócios no fim do ano', 'A remuneração do dono pelo trabalho na empresa', 'Um imposto sobre vendas', 'Um tipo de empréstimo'], correct: 1, explanation: 'Pró-labore é o "salário" do sócio que trabalha na empresa, separado do lucro do negócio.' },
        { q: 'Por que separar conta pessoal da conta da empresa?', options: ['Não faz diferença nenhuma', 'Para evitar confusão e problemas financeiros/fiscais', 'Só é exigido para empresas grandes', 'Para pagar menos imposto automaticamente'], correct: 1, explanation: 'Misturar contas dificulta saber a real saúde financeira da empresa e pode gerar problemas contábeis e fiscais.' },
      ],
    },
  },
  {
    id: 'fasetransicao',
    name: 'Um Novo Caminho',
    skyColor: 0x18233d,
    groundColor: 0x2c3350,
    decorColor: 0x22304f,
    levelWidth: 1990,
    bg: 'street_bg.png',
    startX: 1790,
    startDirection: 'left',
    hasBoss: false,
    exitInitiallyOpen: true,

    doorX: 90,
    groundY: 480,
    showExitArrow: true,
    exitDirection: 'backward', // seta aponta pra trás (saindo da empresa)
    characterScale: 1.8,
    infoSpots: [
      { x: 1300, y: 320, text: 'Agora que sua empresa foi formalizada, é importante manter toda a documentação organizada.' },
      { x: 820, y: 320, text: 'O acompanhamento contábil ajuda a empresa a crescer com mais segurança.' },
      { x: 440, y: 340, text: 'O próximo passo é procurar uma contabilidade que acompanhe sua nova jornada.' },
    ],
  },
  {
    id: 'fasetransicao2',
    name: 'Em Busca de Orientação',

    skyColor: 0x18233d,
    groundColor: 0x2c3350,
    decorColor: 0x22304f,

    levelWidth: 1990,
    bg: 'street2_bg.png',

    startX: 1880,
    startDirection: 'left',

    hasBoss: false,
    exitInitiallyOpen: true,

    doorX: 230,
    groundY: 460,

    showExitArrow: true,
    exitDirection: 'backward',

    characterScale: 1.8,

    infoSpots: [
      { x: 1400, y: 320, text: 'Com a empresa aberta, novos desafios começam a aparecer.' },
      { x: 850, y: 320, text: 'Uma contabilidade próxima ajuda o empresário a compreender melhor os números do negócio.' },
      { x: 420, y: 340, text: 'Você está chegando à JS Grilo Contabilidade & Gestão.' },
    ],
  },
  {
    id: 'fase3',
    name: 'JS Grilo Contabilidade & Gestão',
    startX: 80,
    startDirection: 'right',
    hasBoss: true,
    exitInitiallyOpen: false,
    skyColor: 0x18233d,
    groundColor: 0x2c3350,
    decorColor: 0x22304f,
    levelWidth: 1994,
    bg: 'office_bg.png', // nome do arquivo em assets/backgrounds/
    // Posição do boss/porta nesta fase (em pixels, dentro da imagem de fundo de 2200x540).
    // Ajuste bossX/bossY livremente pra encaixar o boss na cadeira/mesa da sua arte.
    // bossY é a linha do "chão" onde os pés do boss encostam (mesma lógica do player).
    bossX: 1700,
    bossY: 330,
    doorX: 1750, // porta de saída (some até vencer o boss)
    groundY: 460,        // altura em que os PÉS do personagem encostam nesta fase (chão da perspectiva)
    showExitArrow: false, // fase final: sem seta, o jogo encerra na hora
    characterScale: 2.7, // tamanho do personagem só nesta fase (perspectivas diferentes = tamanhos diferentes)
    infoSpots: [
      { x: 210, y: 230, text: 'Olá, Seja bem vindo a JS Grilo Contabilidade.' },
      { x: 720, y: 230, text: 'Existem vários tipos de empresa (MEI, ME, LTDA...). O ideal depende do seu faturamento e atividade.' },
      { x: 1355, y: 210, text: 'Um contador não é só pra fazer imposto: ele te ajuda a tomar decisões melhores desde o início.' },
    ],
    boss: {
      name: 'Empresário Desorganizado',
      questions: [
        { q: 'O que é CNPJ?', options: ['Um tipo de imposto', 'O documento de identificação da empresa', 'Um empréstimo bancário', 'Um tipo de contrato de trabalho'], correct: 1, explanation: 'CNPJ é o Cadastro Nacional da Pessoa Jurídica: identifica a empresa perante o governo, bancos e clientes.' },
        { q: 'Qual a principal vantagem de ter um contador desde o começo?', options: ['Ele garante que a empresa nunca pague imposto', 'Ele ajuda a organizar e planejar decisões financeiras', 'Ele é obrigatório só depois de 1 ano de empresa', 'Ele substitui o dono na gestão'], correct: 1, explanation: 'O contador ajuda a organizar as finanças e orientar decisões — quanto antes ele entra, menos erros custosos acontecem.' },
        { q: 'O tipo de empresa ideal para abrir depende de quê?', options: ['Da cor do logotipo', 'Só da vontade do dono', 'Do faturamento e da atividade do negócio', 'Do número de sócios apenas'], correct: 2, explanation: 'Faturamento esperado e tipo de atividade definem o enquadramento (MEI, ME, LTDA etc.) mais vantajoso.' },
      ],
    },
  },
];

// ---------------------------------------------------------
// HELPERS GERAIS
// ---------------------------------------------------------
function pickRandom(arr, n) {
  const copy = [...arr];
  const result = [];
  for (let i = 0; i < n && copy.length > 0; i++) {
    const idx = Math.floor(Math.random() * copy.length);
    result.push(copy.splice(idx, 1)[0]);
  }
  return result;
}

function updateHUD() {
  document.getElementById('hud-lives').textContent = '❤️'.repeat(Math.max(GameData.lives, 0)) || '💀';
  // Placar parcial em tempo real, usando os mesmos critérios da pontuação final
  // (tempo ainda não entra aqui pra não ficar mudando sozinho a cada segundo na tela).
  const partialScore = GameData.correctAnswers * 100 + GameData.lives * 150;
  document.getElementById('score-value').textContent = partialScore;
  document.getElementById('phase-value').textContent = GameData.phaseIndex + 1;
}

// Conta quantos murais da fase atual já foram vistos (só estatística/flavor, não pontua)
function updateMuraisCounter(phaseId, total) {
  let count = 0;
  GameData.infosSeen.forEach((id) => { if (id.startsWith(`${phaseId}_`)) count += 1; });
  document.getElementById('hud-murais-count').textContent = count;
  document.getElementById('hud-murais-total').textContent = total;
}

function loadRanking() {
  try { return JSON.parse(localStorage.getItem(RANKING_KEY)) || []; }
  catch (e) { return []; }
}

function saveRankingEntry(name, score, elapsedSeconds) {
  const ranking = loadRanking();
  ranking.push({ name: name || 'Anônimo', score, time: elapsedSeconds, date: new Date().toLocaleDateString('pt-BR') });
  ranking.sort((a, b) => b.score - a.score);
  const top10 = ranking.slice(0, 10);
  localStorage.setItem(RANKING_KEY, JSON.stringify(top10));
  return top10;
}

function renderRankingInto(elId) {
  const list = loadRanking();
  const el = document.getElementById(elId);
  if (list.length === 0) {
    el.innerHTML = '<p>Ninguém no ranking ainda. Seja o primeiro!</p>';
    return;
  }
  const items = list.map((r) => `<li>${escapeHtml(r.name)} — ${r.score} pts (${r.time}s) — ${r.date}</li>`).join('');
  el.innerHTML = `<ol>${items}</ol>`;
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

// ---------------------------------------------------------
// FÓRMULA DE PONTUAÇÃO
// Considera SOMENTE: acertos, vidas restantes e tempo total.
// Exploração/murais NÃO entram na conta (só servem para aprender).
// ---------------------------------------------------------
function computeFinalScore(elapsedSeconds) {
  const correctPoints = GameData.correctAnswers * 100;      // até 900 (9 perguntas)
  const livesPoints = GameData.lives * 150;                  // até 450 (3 vidas)
  // Bônus de agilidade: quanto mais rápido concluir, mais pontos (sem punir demais quem explora)
  const timeBonus = Math.max(0, Math.round((600 - elapsedSeconds) * 0.5)); // até 300 se concluir em <10min
  return correctPoints + livesPoints + timeBonus;
}

function formatMessageForScore(score) {
  if (score >= 1000) return 'Excelente empresário! Você domina os conceitos essenciais da gestão.';
  if (score >= 700) return 'Muito bom! Você já entende bastante, mas ainda pode evoluir.';
  return 'Você deu o primeiro passo. Vale a pena revisar alguns conceitos com calma.';
}

// ---------------------------------------------------------
// SISTEMA DE INPUT (abstrai teclado / touch / gamepad)
// Hoje só o teclado está implementado. Para adicionar touch ou
// gamepad no futuro, basta criar uma classe com os mesmos métodos
// (isLeft/isRight/isJump/isDuck) e registrar em InputManager.providers.
// ---------------------------------------------------------
class KeyboardInputProvider {
  constructor(scene) {
    this.cursors = scene.input.keyboard.createCursorKeys();
    this.keys = scene.input.keyboard.addKeys({ A: 'A', D: 'D' });
  }
  isLeft() { return this.cursors.left.isDown || this.keys.A.isDown; }
  isRight() { return this.cursors.right.isDown || this.keys.D.isDown; }
}

// TODO (futuro): class TouchInputProvider { ... }  -> botões on-screen
// TODO (futuro): class GamepadInputProvider { ... } -> this.scene.input.gamepad
// TODO (futuro): se pular/agachar voltarem a fazer sentido (ex: obstáculos), reintroduzir
// isJump()/isDuck() aqui e no InputManager abaixo — a arquitetura já está pronta pra isso.

class InputManager {
  constructor(scene) {
    this.providers = [new KeyboardInputProvider(scene)];
    this.enabled = true;
  }
  setEnabled(v) { this.enabled = v; }
  left() { return this.enabled && this.providers.some((p) => p.isLeft()); }
  right() { return this.enabled && this.providers.some((p) => p.isRight()); }
}

// ---------------------------------------------------------
// PIXEL ART — geração de texturas via grid de caracteres
// ---------------------------------------------------------
function drawPixelTexture(scene, key, rows, palette, pixelSize) {
  if (scene.textures.exists(key)) return;
  const height = rows.length;
  const width = rows[0].length;
  const g = scene.make.graphics({ x: 0, y: 0, add: false });
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const ch = rows[y][x];
      if (ch === '.' || palette[ch] === undefined) continue;
      g.fillStyle(palette[ch], 1);
      g.fillRect(x * pixelSize, y * pixelSize, pixelSize, pixelSize);
    }
  }
  g.generateTexture(key, width * pixelSize, height * pixelSize);
  g.destroy();
}

const BOSS_PALETTE = { R: THEME.danger, K: 0x1a1a1a, G: 0x555555 };
const BOSS_FRAME = [
  '..RRRRRRRRRR..', '.RRRRRRRRRRRR.', 'RRRRKKKKKKRRRR', 'RRRRK....KRRRR',
  'RRRRKKKKKKRRRR', '.RRRRRRRRRRRR.', '.RRRRRRRRRRRR.', '..RRRRRRRRRR..',
  '...GGGGGGGG...', '...GGGGGGGG...', '...GGGGGGGG...', '...GG....GG...',
  '...GG....GG...', '...GG....GG...',
];

const POSTER_FRAME = [
  "............",
  "...BBBBBB...",
  "..BWWWWWWB..",
  ".BWWWWWWWWB.",
  ".BWWDWDWDWB.",
  ".BWWWWWWWWB.",
  "..BWWWWWWB..",
  "...BBBBBB...",
  ".....BB.....",
  "....BB......",
];

const POSTER_PALETTE = {
  B: 0xf5f0e6, // borda dourada
  W: 0xf5f0e6, // interior claro
  D: 0x14213d, // três pontos azuis
};

const DOOR_PALETTE = { F: 0x8a5a2b, D: 0x6b4423, K: THEME.accent };
const DOOR_FRAME = [
  'FFFFFFFFFF', 'FDDDDDDDDF', 'FDDDDDDDDF', 'FDDDDDDDDF',
  'FDDDDDDDDF', 'FDDDDDDDDF', 'FDDDDKDDDF', 'FDDDDDDDDF',
  'FDDDDDDDDF', 'FDDDDDDDDF', 'FDDDDDDDDF', 'FFFFFFFFFF',
];

function buildAllTextures(scene) {
  const PS = 4; // tamanho do "pixel" em px reais
  drawPixelTexture(scene, 'bossTex', BOSS_FRAME, BOSS_PALETTE, PS);
  drawPixelTexture(scene, 'posterTex', POSTER_FRAME, POSTER_PALETTE, PS);
  drawPixelTexture(scene, 'doorTex', DOOR_FRAME, DOOR_PALETTE, PS);

  if (!scene.textures.exists('ground')) {
    const g = scene.make.graphics({ x: 0, y: 0, add: false });
    g.fillStyle(THEME.primary, 1);
    g.fillRect(0, 0, 64, 64);
    g.lineStyle(2, THEME.primaryDark, 1);
    g.strokeRect(0, 0, 64, 64);
    g.generateTexture('ground', 64, 64);
    g.destroy();
  }
}

// ---------------------------------------------------------
// TELA DE FIM DE JOGO (vitória ou derrota) — pontuação salva automaticamente
// ---------------------------------------------------------
function endGame(won) {
  if (GameData.hasEnded) return; // evita salvar o ranking duas vezes na mesma partida
  GameData.hasEnded = true;

  const elapsedSeconds = Math.floor((Date.now() - GameData.startTime) / 1000);
  const finalScore = computeFinalScore(elapsedSeconds);

  saveRankingEntry(GameData.playerName, finalScore, elapsedSeconds);

  document.getElementById('end-overlay').classList.remove('hidden');
  document.getElementById('end-title').textContent = won ? '🏆 Parabéns!' : 'Game Over';
  document.getElementById('end-message').textContent = won
    ? 'Você completou as três fases e agora conhece melhor os desafios da gestão empresarial!'
    : 'Você ficou sem vidas no meio da jornada. Que tal tentar de novo?';

  document.getElementById('end-score').innerHTML = `
    Respostas corretas: ${GameData.correctAnswers}<br/>
    Vidas restantes: ${GameData.lives}<br/>
    Tempo total: ${elapsedSeconds}s<br/>
    Murais lidos (curiosidade, não pontua): ${GameData.infosSeen.size}<br/>
    <strong>Pontuação final: ${finalScore}</strong><br/>
    ${formatMessageForScore(finalScore)}
  `;
}

// ---------------------------------------------------------
// BATALHA DE BOSS — PAUSA o jogo (física + input) enquanto ativa
// ---------------------------------------------------------
function positionBossDialogue(scene, bossSprite) {
  // #game-wrapper é sempre 960x540 "por dentro" — o zoom de tela cheia (fitGameToScreen)
  // é feito com um CSS transform em cima do wrapper inteiro, então tudo que está dentro
  // dele (HUD, balões etc.) escala JUNTO automaticamente. Por isso aqui a gente só usa
  // as coordenadas nativas (960x540), sem multiplicar por nenhum fator de zoom.
  const bounds = bossSprite.getBounds();
  const scrollX = scene.cameras.main.scrollX;
  let screenX = bounds.centerX - scrollX;
  const screenTopY = bounds.top;

  // Evita o balão sair da tela quando o boss está perto da borda direita/esquerda
  screenX = Math.min(Math.max(screenX, 160), 960 - 160);

  const dialogueEl = document.getElementById('boss-dialogue');
  dialogueEl.style.left = `${screenX}px`;
  dialogueEl.style.bottom = `${540 - screenTopY + 26}px`;
}

// Frases de transição do "boss falando" — variam um pouco por pergunta pra não ficar repetitivo.
// Fique à vontade pra editar/adicionar mais frases nessas listas.
const BOSS_INTRO_LINES = [
  'Vamos testar seus conhecimentos sobre isso!',
  'Aqui vai a próxima pergunta:',
  'Última pergunta, vamos lá:',
];
const BOSS_CORRECT_LINES = [
  'Isso mesmo! Mandou bem.',
  'Perfeito, é exatamente isso!',
  'Excelente resposta!',
];
const BOSS_WRONG_LINES = [
  'Não foi dessa vez.',
  'Quase! Deixa eu te explicar:',
  'Essa é traiçoeira, mas vamos entender:',
];
const TYPE_SPEED_MS = 45; // velocidade da digitação (ms por letra) — aumente pra deixar mais devagar, diminua pra mais rápido
const INFO_TYPE_SPEED_MS = 30;

function pickLine(list, index) {
  return list[Math.min(index, list.length - 1)];
}

function startBossBattle(scene, phaseConfig, bossSprite, onComplete) {
  const mySession = GameData.sessionId; // trava esta batalha à partida atual
  GameData.paused = true;
  scene.physics.pause();
  scene.inputManager.setEnabled(false);

  positionBossDialogue(scene, bossSprite);

  const overlay = document.getElementById('boss-overlay');
  const nameEl = document.getElementById('boss-name');
  const headerEl = document.getElementById('dialogue-header');
  const questionEl = document.getElementById('question-text');
  const answersPanelEl = document.getElementById('boss-answers-panel');
  const optionsEl = document.getElementById('question-options');

  overlay.classList.remove('hidden');
  nameEl.textContent = `⚔️ ${phaseConfig.boss.name}`;

  const questions = pickRandom(phaseConfig.boss.questions, 3);
  let qIndex = 0;
  let timerInterval = null;
  let typeInterval = null;
  const typeState = { instant: false };

  function isStale() { return mySession !== GameData.sessionId; }

  // Efeito de "digitação" — clicar no balão pula direto pro texto completo
  function typeText(text, onDone) {
    clearInterval(typeInterval);
    questionEl.textContent = '';
    headerEl.textContent = '💬';
    typeState.instant = false;
    let i = 0;
    typeInterval = setInterval(() => {
      if (isStale()) { clearInterval(typeInterval); return; }
      if (typeState.instant) {
        questionEl.textContent = text;
        clearInterval(typeInterval);
        if (onDone) onDone();
        return;
      }
      i += 1;
      questionEl.textContent = text.slice(0, i);
      if (i >= text.length) {
        clearInterval(typeInterval);
        if (onDone) onDone();
      }
    }, TYPE_SPEED_MS);
  }
  questionEl.onclick = () => { typeState.instant = true; };

  // Etapa 1: boss "fala" uma introdução, depois a pergunta em si, só então libera as alternativas
  function playIntroThenQuestion(index) {
    if (isStale()) return;
    answersPanelEl.classList.add('hidden');
    const q = questions[index];
    typeText(pickLine(BOSS_INTRO_LINES, index), () => {
      if (isStale()) return;
      setTimeout(() => {
        if (isStale()) return;
        typeText(q.q, () => revealOptions(q));
      }, 700);
    });
  }

  // Etapa 2: alternativas aparecem, começa o cronômetro de resposta
  function revealOptions(q) {
    if (isStale()) return;
    answersPanelEl.classList.remove('hidden');
    optionsEl.innerHTML = '';

    q.options.forEach((optText, idx) => {
      const btn = document.createElement('button');
      btn.className = 'option-btn';
      btn.textContent = optText;
      btn.onclick = () => {
        if (isStale()) return;
        clearInterval(timerInterval);
        resolveAnswer(idx, q);
      };
      optionsEl.appendChild(btn);
    });

    let timeLeft = ANSWER_SECONDS;
    headerEl.textContent = `⏱ ${timeLeft}s`;
    clearInterval(timerInterval);
    timerInterval = setInterval(() => {
      if (isStale()) { clearInterval(timerInterval); return; }
      timeLeft -= 1;
      headerEl.textContent = `⏱ ${timeLeft}s`;
      if (timeLeft <= 0) {
        clearInterval(timerInterval);
        resolveAnswer(null, q);
      }
    }, 1000);
  }

  // Etapa 3: boss reage (parabeniza ou explica o motivo do erro), depois avança
  function resolveAnswer(chosenIdx, q) {
    if (isStale()) return;
    const isCorrect = chosenIdx === q.correct;
    answersPanelEl.classList.add('hidden');

    if (isCorrect) {
      GameData.correctAnswers += 1;
    } else {
      GameData.lives -= 1;
    }
    updateHUD();

    const resultText = isCorrect
      ? pickLine(BOSS_CORRECT_LINES, qIndex)
      : `${pickLine(BOSS_WRONG_LINES, qIndex)} ${q.explanation}`;

    typeText(resultText, () => {
      if (isStale()) return;
      const waitTime = isCorrect ? 1400 : 4200; // dá mais tempo de leitura quando erra (tem explicação)
      setTimeout(() => {
        if (isStale()) return;
        qIndex += 1;
        if (GameData.lives <= 0) {
          overlay.classList.add('hidden');
          finishBossUI();
          endGame(false);
          return;
        }
        if (qIndex < questions.length) {
          playIntroThenQuestion(qIndex);
        } else {
          overlay.classList.add('hidden');
          finishBossUI();
          onComplete();
        }
      }, waitTime);
    });
  }

  function finishBossUI() {
    clearInterval(timerInterval);
    clearInterval(typeInterval);
    questionEl.onclick = null;
    GameData.paused = false;
    scene.physics.resume();
    scene.inputManager.setEnabled(true);
  }

  playIntroThenQuestion(qIndex);
}

// ---------------------------------------------------------
// BALÃO DE INFORMAÇÃO DOS NPCS
// Abre por proximidade, digita letra por letra e fecha ao se afastar.
// Não pausa o jogo.
// ---------------------------------------------------------

let activeInfoId = null;
let infoTypeInterval = null;

function typeInfoText(element, text) {
  clearInterval(infoTypeInterval);

  element.textContent = "";

  let charIndex = 0;

  infoTypeInterval = setInterval(() => {
    charIndex += 1;
    element.textContent = text.slice(0, charIndex);

    if (charIndex >= text.length) {
      clearInterval(infoTypeInterval);
      infoTypeInterval = null;
    }
  }, INFO_TYPE_SPEED_MS);
}

function animateInfoBubbleOpening(bubble) {
  bubble.classList.remove("info-bubble-opening");

  // Força o navegador a reiniciar a animação
  void bubble.offsetWidth;

  bubble.classList.add("info-bubble-opening");
}

function positionInfoBubble(scene, spot) {
  const bubble = document.getElementById("info-bubble");
  const camera = scene.cameras.main;

  let screenX = spot.x - camera.scrollX;
  let screenY = (spot.y ?? 300) - camera.scrollY;

  const halfBubbleWidth = 165;

  screenX = Phaser.Math.Clamp(
    screenX,
    halfBubbleWidth,
    960 - halfBubbleWidth
  );

  screenY = Math.max(screenY, 115);

  bubble.style.left = `${screenX}px`;
  bubble.style.top = `${screenY - 8}px`;
}

function updateInfoBubble(scene, playerX, infoSpots, phaseId, infoIcons) {
  // Enquanto "segurada" (tempo mínimo de leitura), continua atualizando a POSIÇÃO
  // na tela (acompanhando o scroll da câmera) — só não reavalia nem reinicia a digitação.
  if (scene.pinnedInfoUntil && Date.now() < scene.pinnedInfoUntil) {
    if (scene.pinnedSpot) positionInfoBubble(scene, scene.pinnedSpot);
    return;
  }
  scene.pinnedInfoUntil = null;
  scene.pinnedSpot = null;

  let nearest = null;
  let nearestDist = Infinity;

  infoSpots.forEach((spot, index) => {
    if (spot.once && scene.usedOnceSpots?.has(index)) return;

    const distance = Math.abs(playerX - spot.x);
    if (distance <= INFO_PROXIMITY_RADIUS && distance < nearestDist) {
      const text = (spot.textAfterBoss && scene.doorOpen) ? spot.textAfterBoss : spot.text;
      nearest = { id: `${phaseId}_${index}`, index, spot, text };
      nearestDist = distance;
    }
  });

  const bubble = document.getElementById("info-bubble");
  const content = bubble.querySelector(".info-bubble-content");

  if (nearest) {
    positionInfoBubble(scene, nearest.spot);

    if (activeInfoId !== nearest.id) {
      activeInfoId = nearest.id;
      GameData.infosSeen.add(nearest.id);
      updateMuraisCounter(phaseId, infoSpots.length);
      clearInterval(infoTypeInterval);

      if (infoIcons?.[nearest.index]) {
        infoIcons[nearest.index].setVisible(false);
      }

      if (nearest.spot.once) {
        scene.usedOnceSpots?.add(nearest.index);
        scene.pinnedInfoUntil = Date.now() + ONCE_BUBBLE_MIN_MS;
        scene.pinnedSpot = nearest.spot;
      }

      bubble.classList.remove("info-bubble-hidden");
      animateInfoBubbleOpening(bubble);
      typeInfoText(content, `💬 ${nearest.text}`);
    }
    return;
  }

  if (activeInfoId !== null) {
    const previousIndex = Number(activeInfoId.split("_").at(-1));
    const previousSpot = infoSpots[previousIndex];
    activeInfoId = null;

    clearInterval(infoTypeInterval);
    infoTypeInterval = null;

    bubble.classList.remove("info-bubble-opening");
    bubble.classList.add("info-bubble-hidden");

    setTimeout(() => {
      if (bubble.classList.contains("info-bubble-hidden")) content.textContent = "";
    }, 220);

    const staysHidden = previousSpot?.once && scene.usedOnceSpots?.has(previousIndex);
    if (infoIcons?.[previousIndex] && !staysHidden) {
      infoIcons[previousIndex].setVisible(true);
    }
  }
}

// ---------------------------------------------------------
// CENA PRINCIPAL DO PHASER
// ---------------------------------------------------------
class PhaseScene extends Phaser.Scene {
  constructor() { super('PhaseScene'); }

  init(data) {
    this.phaseIndex = data.phaseIndex || 0;
    this.config = PHASES[this.phaseIndex];
  }

  preload() {
    buildAllTextures(this);

    const cfg = this.config;
    const bgKey = `bg_${cfg.id}`; // chave única por fase (fase1, fase2, fase3), evita conflito de cache
    if (!this.textures.exists(bgKey)) {
      this.load.image(bgKey, `assets/backgrounds/${cfg.bg}`);
    }

    const charId = GameData.selectedCharacter;
    if (!this.textures.exists(`char_${charId}_idle`)) {
      this.load.spritesheet(`char_${charId}_idle`, `assets/characters/${charId}/Idle.png`, {
        frameWidth: CHARACTER_FRAME_SIZE, frameHeight: CHARACTER_FRAME_SIZE,
      });
      this.load.spritesheet(`char_${charId}_walk`, `assets/characters/${charId}/Walk.png`, {
        frameWidth: CHARACTER_FRAME_SIZE, frameHeight: CHARACTER_FRAME_SIZE,
      });
    }
  }

  create() {
    activeInfoId = null;
    clearInterval(infoTypeInterval);
    infoTypeInterval = null;

    const infoBubble = document.getElementById("info-bubble");

    infoBubble.classList.remove(
      "hidden",
      "info-bubble-opening"
    );

    infoBubble.classList.add("info-bubble-hidden");

    infoBubble.querySelector(".info-bubble-content").textContent = "";

    const cfg = this.config;
    this.cameras.main.setBackgroundColor(cfg.skyColor);
    this.physics.world.setBounds(0, 0, cfg.levelWidth, 540);
    this.cameras.main.setBounds(0, 0, cfg.levelWidth, 540);

    // Fundo: imagem real do escritório/ambiente desta fase, repetida (tile) ao longo da largura
    const bgKey = `bg_${cfg.id}`;
    const bgTex = this.textures.get(bgKey).getSourceImage();
    const bgScale = 540 / bgTex.height; // encaixa a altura da imagem na altura do jogo (540px)
    const bg = this.add.tileSprite(cfg.levelWidth / 2, 270, cfg.levelWidth, 540, bgKey);
    bg.setTileScale(bgScale, bgScale);
    bg.setScrollFactor(1);

    // Chão (invisível — a própria imagem de fundo já mostra o piso; mantém só a física)
    this.groundGroup = this.physics.add.staticGroup();
    for (let x = 0; x < cfg.levelWidth; x += 64) {
      this.groundGroup.create(x + 32, 500, 'ground').setVisible(false).refreshBody();
    }

    // Player (sprite real — CraftPix City Men)
    const charId = GameData.selectedCharacter;
    const charDef = CHARACTERS.find((c) => c.id === charId);

    if (!this.anims.exists(`${charId}_idle`)) {
      this.anims.create({
        key: `${charId}_idle`,
        frames: this.anims.generateFrameNumbers(`char_${charId}_idle`, { start: 0, end: charDef.idleFrames - 1 }),
        frameRate: 6,
        repeat: -1,
      });
    }
    if (!this.anims.exists(`${charId}_walk`)) {
      this.anims.create({
        key: `${charId}_walk`,
        frames: this.anims.generateFrameNumbers(`char_${charId}_walk`, { start: 0, end: charDef.walkFrames - 1 }),
        frameRate: 12,
        repeat: -1,
      });
    }

    // groundY = onde os pés encostam nesta fase; characterScale = tamanho do personagem nesta fase
    // (cada uma tem fallback pro padrão, então é opcional definir por fase)
    const groundY = cfg.groundY ?? 460;
    const charScale = cfg.characterScale ?? CHARACTER_SCALE;
    const startX = cfg.startX ?? 80;
    const startDirection = cfg.startDirection ?? 'right';

    this.player = this.physics.add.sprite(
      startX,
      groundY,
      `char_${charId}_idle`,
      0
    );

    this.player.setOrigin(0.5, 1);
    this.player.body.setAllowGravity(false);
    this.player.setSize(CHARACTER_BODY.width, CHARACTER_BODY.height);
    this.player.body.setOffset(
      CHARACTER_BODY.offsetX,
      CHARACTER_BODY.offsetY
    );

    this.player.setScale(charScale);
    this.player.setFlipX(startDirection === 'left');
    this.player.setCollideWorldBounds(true);
    this.player.setDragX(900);
    this.player.setMaxVelocity(220, 0);
    this.player.anims.play(`${charId}_idle`);

    this.cameras.main.startFollow(
      this.player,
      true,
      0.1,
      0.1
    );

    // Murais/quadros na parede (posição real do mundo — igual ao cálculo de proximidade)
    this.infoIcons = [];

    this.usedOnceSpots = new Set(); // controla murais de uso único (ex: fase 2 — não reaparecem depois de vistos)

    cfg.infoSpots.forEach((spot, index) => {
      const icon = this.add
        .image(spot.x, spot.y ?? 300, "posterTex")
        .setOrigin(0.5, 1)
        .setDepth(20)
        .setAlpha(0.75);

      this.tweens.add({
        targets: icon,
        y: icon.y - 4,
        duration: 650,
        yoyo: true,
        repeat: -1,
        ease: "Sine.easeInOut",
      });

      this.infoIcons.push(icon);
    });
    this.infoSpots = cfg.infoSpots;

    // Boss no fim da fase (posição vem da config da fase — ver bossX/bossY em PHASES)
    const doorX = cfg.doorX;
    const hasBoss = cfg.hasBoss !== false && cfg.boss;

    this.bossTriggered = false;

    if (hasBoss) {
      const bossX = cfg.bossX;
      const bossY = cfg.bossY;

      this.bossSprite = this.add
        .image(bossX, bossY, 'bossTex')
        .setOrigin(0.5, 1);

      this.bossZone = this.add.zone(
        bossX,
        bossY,
        70,
        100
      );

      this.physics.add.existing(this.bossZone, true);

      this.physics.add.overlap(
        this.player,
        this.bossZone,
        () => {
          if (!this.bossTriggered && !GameData.paused) {
            this.bossTriggered = true;
            this.player.setVelocity(0, 0);

            startBossBattle(
              this,
              cfg,
              this.bossSprite,
              () => this.onBossDefeated()
            );
          }
        }
      );
    }

    // Saída — seta dourada, só existe se a fase tiver uma (fase final não tem)
    if (cfg.showExitArrow !== false) {
      const exitY = groundY;
      const arrowPointsLeft =
        (cfg.exitDirection || 'forward') === 'backward';

      const exitStartsOpen = cfg.exitInitiallyOpen === true;

      this.doorGlow = this.add
        .circle(
          doorX,
          exitY - 90,
          46,
          THEME.accent,
          0.25
        )
        .setVisible(exitStartsOpen);

      this.door = this.add
        .text(
          doorX,
          exitY - 90,
          '➜',
          {
            fontSize: '64px',
            fontStyle: 'bold',
            color: '#f2a900',
          }
        )
        .setOrigin(0.5)
        .setFlipX(arrowPointsLeft)
        .setVisible(exitStartsOpen);

      this.tweens.add({
        targets: this.doorGlow,
        scale: {
          from: 0.85,
          to: 1.15,
        },
        alpha: {
          from: 0.15,
          to: 0.35,
        },
        duration: 900,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut',
      });

      this.tweens.add({
        targets: this.door,
        x: doorX + (arrowPointsLeft ? -12 : 12),
        duration: 650,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut',
      });

      this.doorX = doorX;
      this.doorTriggerRadius = 70;
      this.doorOpen = exitStartsOpen;
    } else {
      this.doorOpen = false;
    }

    this.phaseTransitioning = false; // trava pra não disparar a troca de fase várias vezes seguidas

    // Sistema de input (teclado por padrão; pronto para touch/gamepad no futuro)
    this.inputManager = new InputManager(this);

    this.levelWidth = cfg.levelWidth;
    updateHUD();
    updateMuraisCounter(cfg.id, cfg.infoSpots.length);
  }

  onBossDefeated() {
    if (this.config.showExitArrow === false) {
      this.goToNextPhase();
      return;
    }
    this.doorOpen = true;
    this.door.setVisible(true);
    this.doorGlow.setVisible(true);
  }

  goToNextPhase() {
    const next = this.phaseIndex + 1;
    if (next >= PHASES.length) {
      endGame(true);
    } else {
      GameData.phaseIndex = next;
      updateHUD();
      this.cameras.main.fadeOut(300, 0, 0, 0);
      this.cameras.main.once('camerafadeoutcomplete', () => {
        this.scene.restart({ phaseIndex: next });
      });
    }
  }

  update() {
    // Mural por proximidade — nunca pausa o jogo
    updateInfoBubble(
      this,
      this.player.x,
      this.infoSpots,
      this.config.id,
      this.infoIcons
    );

    if (GameData.paused) {
      this.player.setVelocityX(0);
      const idleAnim = `${GameData.selectedCharacter}_idle`;
      if (this.player.anims.currentAnim?.key !== idleAnim) {
        this.player.anims.play(idleAnim, true);
      }
      return;
    }
    // Saída da fase — dispara quando o jogador chega perto da seta (só depois do boss cair)
    if (this.doorOpen && !this.phaseTransitioning && this.doorX !== undefined) {
      if (Math.abs(this.player.x - this.doorX) < this.doorTriggerRadius) {
        this.phaseTransitioning = true;
        this.goToNextPhase();
      }
    }

    const charId = GameData.selectedCharacter;
    const left = this.inputManager.left();
    const right = this.inputManager.right();

    let vx = 0;
    if (left) { vx = -160; this.player.setFlipX(true); }
    if (right) { vx = 160; this.player.setFlipX(false); }
    this.player.setVelocityX(vx);

    const desiredAnim = vx !== 0 ? `${charId}_walk` : `${charId}_idle`;
    if (this.player.anims.currentAnim?.key !== desiredAnim) {
      this.player.anims.play(desiredAnim, true);
    }
  }
}

// ---------------------------------------------------------
// CONFIGURAÇÃO DO PHASER
// ---------------------------------------------------------
const config = {
  type: Phaser.AUTO,
  parent: 'game-container',
  width: 960,
  height: 540,
  pixelArt: true, // mantém os pixels nítidos ao escalar
  backgroundColor: '#000000',
  physics: { default: 'arcade', arcade: { gravity: { y: 1200 }, debug: false } },
  scene: [], // NÃO registrar PhaseScene aqui — evitaria autostart e capturaria o teclado antes da hora
};

const game = new Phaser.Game(config);
// Registrado manualmente, mas com autostart desligado (3º argumento = false).
// A cena só é iniciada de fato quando o jogador confirma o nome e clica em "Jogar".

// ---------------------------------------------------------
// TELA CHEIA RESPONSIVA
// O jogo roda internamente sempre em 960x540 (mesma resolução de sempre,
// então nada da lógica/posicionamento muda). O #game-wrapper inteiro
// (canvas + HUD + caixas de diálogo) é escalado via CSS transform pra
// preencher a tela do usuário, mantendo a proporção 16:9.
// ---------------------------------------------------------
function fitGameToScreen() {
  const wrapper = document.getElementById('game-wrapper');
  if (!wrapper) return;
  const scale = Math.min(window.innerWidth / 960, window.innerHeight / 540);
  wrapper.style.transform = `translate(-50%, -50%) scale(${scale})`;
}
window.addEventListener('resize', fitGameToScreen);
fitGameToScreen();
game.scene.add('PhaseScene', PhaseScene, false);

// ---------------------------------------------------------
// MENU INICIAL — navegação entre sub-telas (Jogar/Ranking/Regras/Sobre/Criador)
// ---------------------------------------------------------
function showPanel(id) {
  document.querySelectorAll('.menu-panel').forEach((p) => p.classList.add('hidden'));
  document.getElementById(id).classList.remove('hidden');
  if (id === 'panel-ranking') renderRankingInto('ranking-list-menu');
}

document.querySelectorAll('.menu-btn[data-target], .back-btn[data-target]').forEach((btn) => {
  btn.addEventListener('click', () => showPanel(btn.dataset.target));
});

const nameInput = document.getElementById('player-name-start');
const nameWarning = document.getElementById('name-warning');

document.querySelectorAll('.character-option').forEach((btn) => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.character-option').forEach((b) => b.classList.remove('selected'));
    btn.classList.add('selected');
    GameData.selectedCharacter = btn.dataset.character;
    document.getElementById('hud-character-icon').src = `assets/thumbnails/${GameData.selectedCharacter}.png`;
  });
});

document.getElementById('confirm-name-btn').addEventListener('click', () => {
  const name = nameInput.value.trim();
  if (!name) {
    nameWarning.classList.remove('hidden');
    nameInput.focus();
    return;
  }
  GameData.playerName = name;
  resetGameData();
  updateHUD();
  document.getElementById('start-overlay').classList.add('hidden');
  game.scene.start('PhaseScene', { phaseIndex: 0 });
});

// ---------------------------------------------------------
// TELA FINAL — ranking e reinício
// ---------------------------------------------------------
document.getElementById('view-ranking-btn').addEventListener('click', () => {
  renderRankingInto('ranking-list-content');
  document.getElementById('ranking-overlay').classList.remove('hidden');
});
document.getElementById('close-ranking-btn').addEventListener('click', () => {
  document.getElementById('ranking-overlay').classList.add('hidden');
});
document.getElementById('restart-btn').addEventListener('click', () => {
  document.getElementById('end-overlay').classList.add('hidden');
  nameInput.value = '';
  nameWarning.classList.add('hidden');
  showPanel('panel-menu');
  document.getElementById('start-overlay').classList.remove('hidden');
});