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
const MAX_LIVES = 3;
const INFO_PROXIMITY_RADIUS = 90; // px — raio em que o mural fica visível
const READING_SECONDS = 5; // tempo em que só a pergunta aparece (boss "falando"), sem alternativas
const ANSWER_SECONDS = 30;  // tempo pra responder depois que as alternativas aparecem

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
const CHARACTER_SCALE = 2.2; // aumenta/diminui o tamanho do personagem em tela

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
    skyColor: 0x18233d,
    groundColor: 0x2c3350,
    decorColor: 0x22304f,
    levelWidth: 2200,
    infoSpots: [
      { x: 500, text: 'Todo negócio formal precisa de um CNPJ — é o "CPF" da empresa perante o governo.' },
      { x: 950, text: 'Existem vários tipos de empresa (MEI, ME, LTDA...). O ideal depende do seu faturamento e atividade.' },
      { x: 1500, text: 'Um contador não é só pra fazer imposto: ele te ajuda a tomar decisões melhores desde o início.' },
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
  {
    id: 'fase2',
    name: 'Organizando a Empresa',
    skyColor: 0x18233d,
    groundColor: 0x2c3350,
    decorColor: 0x22304f,
    levelWidth: 2400,
    infoSpots: [
      { x: 500, text: 'Fluxo de caixa é o controle de tudo que entra e sai de dinheiro na empresa.' },
      { x: 1000, text: 'Pró-labore é o salário do dono — separar isso do lucro da empresa evita confusão financeira.' },
      { x: 1600, text: 'Misturar conta pessoal com conta da empresa é um dos erros mais comuns de quem começa.' },
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
    id: 'fase3',
    name: 'Impostos e Reforma Tributária',
    skyColor: 0x18233d,
    groundColor: 0x2c3350,
    decorColor: 0x22304f,
    levelWidth: 2400,
    infoSpots: [
      { x: 500, text: 'Nota fiscal registra a venda oficialmente — evita problemas com o fisco e passa confiança ao cliente.' },
      { x: 1000, text: 'A reforma tributária vai unificar vários impostos em dois: CBS e IBS.' },
      { x: 1600, text: 'Planejamento tributário legal ajuda a pagar só o imposto necessário, dentro da lei.' },
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

// Move o marcador do mini indicador "rumo ao chefe" conforme o jogador avança na fase
function updateBossProgress(playerX, levelWidth) {
  const pct = Math.min(100, Math.max(0, (playerX / levelWidth) * 100));
  document.getElementById('hud-progress-fill').style.width = `${pct}%`;
  document.getElementById('hud-progress-marker').style.left = `${pct}%`;
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

const POSTER_PALETTE = { F: 0x8a5a2b, C: THEME.cream, L: 0x9a9a9a };
const POSTER_FRAME = [
  'FFFFFFFFFFFFFF', 'FCCCCCCCCCCCCF', 'FCLLLLLLLLLLCF', 'FCLLLLLLLLLLCF',
  'FCLLLLL.LLLLCF', 'FCLLLLLLLLLLCF', 'FCLLLL.LLLLLCF', 'FCLLLLLLLLLLCF',
  'FCLLLLLLLLLLCF', 'FCCCCCCCCCCCCF', 'FFFFFFFFFFFFFF',
];

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
  const canvas = scene.game.canvas;
  const wrapper = document.getElementById('game-wrapper');
  const wrapperRect = wrapper.getBoundingClientRect();
  const scaleFactor = canvas.clientWidth / canvas.width; // canvas.width = resolução nativa (960)

  const bounds = bossSprite.getBounds();
  const scrollX = scene.cameras.main.scrollX;
  let screenX = (bounds.centerX - scrollX) * scaleFactor;
  const screenTopY = bounds.top * scaleFactor;

  // Evita o balão sair da tela quando o boss está perto da borda direita/esquerda
  screenX = Math.min(Math.max(screenX, 160), wrapperRect.width - 160);

  const dialogueEl = document.getElementById('boss-dialogue');
  dialogueEl.style.left = `${screenX}px`;
  dialogueEl.style.bottom = `${wrapperRect.height - screenTopY + 26}px`;
}

function startBossBattle(scene, phaseConfig, bossSprite, onComplete) {
  const mySession = GameData.sessionId; // trava esta batalha à partida atual
  GameData.paused = true;
  scene.physics.pause();
  scene.inputManager.setEnabled(false);

  positionBossDialogue(scene, bossSprite);
  const onResize = () => positionBossDialogue(scene, bossSprite);
  window.addEventListener('resize', onResize);

  const overlay = document.getElementById('boss-overlay');
  const nameEl = document.getElementById('boss-name');
  const headerEl = document.getElementById('dialogue-header');
  const questionEl = document.getElementById('question-text');
  const answersPanelEl = document.getElementById('boss-answers-panel');
  const optionsEl = document.getElementById('question-options');
  const feedbackEl = document.getElementById('question-feedback');

  overlay.classList.remove('hidden');
  nameEl.textContent = `⚔️ ${phaseConfig.boss.name}`;

  const questions = pickRandom(phaseConfig.boss.questions, 3);
  let qIndex = 0;
  let readInterval = null;
  let timerInterval = null;

  function isStale() { return mySession !== GameData.sessionId; }

  // Etapa 1: o boss "fala" a pergunta (balão), sem alternativas ainda — tempo pra ler/pensar
  function askQuestion() {
    if (isStale()) return;
    feedbackEl.classList.add('hidden');
    feedbackEl.textContent = '';
    const q = questions[qIndex];
    questionEl.textContent = q.q;
    optionsEl.innerHTML = '';
    answersPanelEl.classList.add('hidden');

    let readLeft = READING_SECONDS;
    headerEl.textContent = `💭 alternativas em ${readLeft}s`;
    clearInterval(readInterval);
    readInterval = setInterval(() => {
      if (isStale()) { clearInterval(readInterval); return; }
      readLeft -= 1;
      if (readLeft <= 0) {
        clearInterval(readInterval);
        revealOptions(q);
      } else {
        headerEl.textContent = `💭 alternativas em ${readLeft}s`;
      }
    }, 1000);
  }

  // Etapa 2: alternativas aparecem, começa o cronômetro de resposta
  function revealOptions(q) {
    if (isStale()) return;
    answersPanelEl.classList.remove('hidden');

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

  function resolveAnswer(chosenIdx, q) {
    if (isStale()) return;
    const isCorrect = chosenIdx === q.correct;
    const buttons = optionsEl.querySelectorAll('.option-btn');
    buttons.forEach((b, i) => {
      b.disabled = true;
      if (i === q.correct) b.classList.add('correct');
      if (i === chosenIdx && !isCorrect) b.classList.add('wrong');
    });

    if (isCorrect) {
      GameData.correctAnswers += 1;
    } else {
      GameData.lives -= 1;
      feedbackEl.classList.remove('hidden');
      feedbackEl.textContent = `❌ Não foi dessa vez! ${q.explanation}`;
    }
    updateHUD();

    const delay = isCorrect ? 900 : 3200;
    setTimeout(() => {
      if (isStale()) return;
      qIndex += 1;
      if (GameData.lives <= 0) {
        overlay.classList.add('hidden');
        answersPanelEl.classList.add('hidden');
        finishBossUI();
        endGame(false);
        return;
      }
      if (qIndex < questions.length) {
        askQuestion();
      } else {
        overlay.classList.add('hidden');
        answersPanelEl.classList.add('hidden');
        finishBossUI();
        onComplete();
      }
    }, delay);
  }

  function finishBossUI() {
    clearInterval(readInterval);
    clearInterval(timerInterval);
    window.removeEventListener('resize', onResize);
    GameData.paused = false;
    scene.physics.resume();
    scene.inputManager.setEnabled(true);
  }

  askQuestion();
}

// ---------------------------------------------------------
// MURAL / QUADRO DE INFORMAÇÃO — aparece por proximidade, some ao se afastar (sem pausar o jogo)
// ---------------------------------------------------------
let activeInfoId = null;
function updateInfoBubble(playerX, infoSpots, phaseId) {
  let nearest = null;
  let nearestDist = Infinity;
  infoSpots.forEach((spot, i) => {
    const dist = Math.abs(playerX - spot.x);
    if (dist <= INFO_PROXIMITY_RADIUS && dist < nearestDist) {
      nearest = { id: `${phaseId}_${i}`, text: spot.text };
      nearestDist = dist;
    }
  });

  const bubble = document.getElementById('info-bubble');
  if (nearest) {
    if (activeInfoId !== nearest.id) {
      activeInfoId = nearest.id;
      GameData.infosSeen.add(nearest.id); // só estatística, não pontua
      updateMuraisCounter(phaseId, infoSpots.length);
      bubble.querySelector('.info-bubble-content').textContent = '📄 ' + nearest.text;
      bubble.classList.remove('hidden');
    }
  } else if (activeInfoId !== null) {
    activeInfoId = null;
    bubble.classList.add('hidden');
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

    if (!this.textures.exists('officeBg')) {
      this.load.image('officeBg', 'assets/backgrounds/office_bg.png');
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
    document.getElementById('info-bubble').classList.add('hidden');

    const cfg = this.config;
    this.cameras.main.setBackgroundColor(cfg.skyColor);
    this.physics.world.setBounds(0, 0, cfg.levelWidth, 540);
    this.cameras.main.setBounds(0, 0, cfg.levelWidth, 540);

    // Fundo: imagem real do escritório, repetida (tile) ao longo de toda a largura da fase
    const bgTex = this.textures.get('officeBg').getSourceImage();
    const bgScale = 540 / bgTex.height; // encaixa a altura da imagem na altura do jogo (540px)
    const bg = this.add.tileSprite(cfg.levelWidth / 2, 270, cfg.levelWidth, 540, 'officeBg');
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

    this.player = this.physics.add.sprite(80, 460, `char_${charId}_idle`, 0);
    this.player.setOrigin(0.5, 1);
    this.player.body.setAllowGravity(false); // sem pulo — o personagem não precisa de gravidade
    this.player.setSize(CHARACTER_BODY.width, CHARACTER_BODY.height);
    this.player.body.setOffset(CHARACTER_BODY.offsetX, CHARACTER_BODY.offsetY);
    this.player.setScale(CHARACTER_SCALE);
    this.player.setCollideWorldBounds(true);
    this.player.setDragX(900);
    this.player.setMaxVelocity(220, 0);
    this.player.anims.play(`${charId}_idle`);
    this.cameras.main.startFollow(this.player, true, 0.1, 0.1);

    // Murais/quadros na parede (posição real do mundo — igual ao cálculo de proximidade)
    cfg.infoSpots.forEach((spot) => {
      this.add.image(spot.x, 300, 'posterTex');
    });
    this.infoSpots = cfg.infoSpots;

    // Boss no fim da fase
    const bossX = cfg.levelWidth - 160;
    this.bossSprite = this.add.image(bossX, 460, 'bossTex').setOrigin(0.5, 1);
    this.bossZone = this.add.zone(bossX, 460, 70, 100);
    this.physics.add.existing(this.bossZone, true);
    this.bossTriggered = false;
    this.physics.add.overlap(this.player, this.bossZone, () => {
      if (!this.bossTriggered && !GameData.paused) {
        this.bossTriggered = true;
        this.player.setVelocity(0, 0);
        startBossBattle(this, cfg, this.bossSprite, () => this.onBossDefeated());
      }
    });

    // Porta (só abre após vencer o boss)
    this.door = this.add.image(bossX + 90, 460, 'doorTex').setOrigin(0.5, 1);
    this.door.setVisible(false);
    this.doorZone = this.add.zone(bossX + 90, 460, 50, 90);
    this.physics.add.existing(this.doorZone, true);
    this.doorOpen = false;
    this.physics.add.overlap(this.player, this.doorZone, () => {
      if (this.doorOpen) this.goToNextPhase();
    });

    // Sistema de input (teclado por padrão; pronto para touch/gamepad no futuro)
    this.inputManager = new InputManager(this);

    this.levelWidth = cfg.levelWidth;
    updateHUD();
    updateMuraisCounter(cfg.id, cfg.infoSpots.length);
    updateBossProgress(this.player.x, this.levelWidth);
  }

  onBossDefeated() {
    this.doorOpen = true;
    this.door.setVisible(true);
    this.door.setTint(0x66ff99);
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
    updateInfoBubble(this.player.x, this.infoSpots, this.config.id);
    updateBossProgress(this.player.x, this.levelWidth);

    if (GameData.paused) {
      this.player.setVelocityX(0);
      const idleAnim = `${GameData.selectedCharacter}_idle`;
      if (this.player.anims.currentAnim?.key !== idleAnim) {
        this.player.anims.play(idleAnim, true);
      }
      return;
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