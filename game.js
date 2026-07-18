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
const NARRATIVE_TYPE_SPEED_MS = 35;
const NARRATIVE_DEFAULT_DURATION_MS = 4000;
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
    phaseNumber: 1,
    phaseLabel: 'Fase 1',
    skyColor: 0x18233d,
    groundColor: 0x2c3350,
    decorColor: 0x22304f,
    levelWidth: 1990,
    bg: 'street_bg.png',
    bossX: 1750,
    bossY: 478,
    doorX: 1770,
    groundY: 480,
    showExitArrow: true,
    exitDirection: 'forward', // seta aponta pra frente
    characterScale: 1.8,
    infoSpots: [
      { x: 440, y: 340, text: 'Se você está começando um negócio, lembre-se: organizar tudo desde o início evita muita dor de cabeça no futuro.' },
      { x: 820, y: 320, text: 'Muita gente acha que abrir uma empresa é só conseguir um CNPJ, mas existem outras responsabilidades importantes.' },
      { x: 1300, y: 320, text: 'Cada decisão tomada no início da empresa pode fazer diferença lá na frente. Vale a pena conhecer bem cada etapa.' },
    ],
    boss: {
      name: 'Analista do Sebrae',
      portrait: { idle: 'boss1_idle.png', talk: 'boss1_talk.png' },
      portraitHeight: 130, // corpo inteiro — maior que os outros dois (retrato busto)
      portraitFlip: true,
      greeting: 'Olá!Me chamo Franciel Monte, sou o Analista do Sebrae. Antes de você seguir sua jornada, vou ver o que você já aprendeu sobre abrir uma empresa!',
      introLines: [
        'Vamos lá, primeira pergunta:',
        'Show de bola! Próxima:',
        'Última pergunta, capricha:',
      ],
      correctLines: [
        'Isso aí! Você manda bem.',
        'Perfeito, é exatamente isso!',
        'Excelente! Já sei que você vai longe.',
      ],
      wrongLines: [
        'Ops, não foi dessa vez.',
        'Quase! Deixa eu te explicar:',
        'Essa pega muita gente, mas vamos entender:',
      ],
      resultMessages: {
        3: 'Mandou muito bem, acertou todas! Pode seguir em frente com confiança.',
        2: 'Muito bom! Só um detalhezinho pra revisar, mas já está no caminho certo.',
        1: 'Você começou bem, mas vale revisar esses conceitos com calma.',
        0: 'Não foi dessa vez, mas o importante é continuar aprendendo. Vamos em frente!',
      },
      questions: [
        {
          q: "Para que serve o CNPJ?",
          options: [
            'É o "documento de identidade" da empresa, usado para ela existir oficialmente perante o governo',
            'É o número utilizado pelo banco para identificar a principal conta financeira da empresa e registrar suas movimentações',
            'É um selo de qualidade concedido pelos órgãos públicos às empresas que cumprem todos os requisitos legais',
            'É um documento que substitui o CPF do proprietário em qualquer operação realizada pela empresa'
          ],
          correct: 0,
          explanation: "O CNPJ é como o documento de identidade da empresa. É por meio dele que ela existe oficialmente perante o governo e pode exercer suas atividades de forma legal."
        },

        {
          q: "O que é o MEI (Microempreendedor Individual)?",
          options: [
            'Uma linha de crédito criada por bancos públicos para incentivar pequenos empreendedores no início do negócio',
            'Um jeito simples e barato de formalizar um pequeno negócio, como autônomo',
            'Um tipo de imposto pago mensalmente por empresas que possuem apenas um funcionário registrado',
            'Um curso obrigatório oferecido pelo governo antes da abertura de qualquer empresa no Brasil'
          ],
          correct: 1,
          explanation: "O MEI foi criado para facilitar a formalização de pequenos empreendedores, permitindo que trabalhem legalmente, tenham CNPJ e possam emitir nota fiscal."
        },

        {
          q: "Depois de formalizar a empresa, o que ela passa a ter direito/dever de fazer?",
          options: [
            'Ficar permanentemente isenta do pagamento de impostos e demais obrigações fiscais previstas em lei',
            'Emitir nota fiscal e pagar os impostos e taxas devidos',
            'Deixar de prestar informações ao governo porque a empresa já está oficialmente registrada',
            'Contratar funcionários imediatamente, independentemente do porte ou da necessidade do negócio'
          ],
          correct: 1,
          explanation: "Ao formalizar uma empresa, ela ganha direitos, como emitir nota fiscal, mas também assume responsabilidades, como cumprir suas obrigações fiscais."
        },

        {
          q: "O que significa a razão social de uma empresa?",
          options: [
            'O nome utilizado pela empresa em campanhas publicitárias, redes sociais e materiais de divulgação',
            'O nome oficial e completo da empresa, registrado nos documentos legais',
            'O endereço comercial informado no cadastro da prefeitura durante a abertura da empresa',
            'O valor do patrimônio inicial declarado pelos sócios no momento da constituição da empresa'
          ],
          correct: 1,
          explanation: "A razão social é o nome oficial registrado nos documentos da empresa. Já o nome fantasia é aquele que os clientes costumam conhecer."
        },

        {
          q: "O que geralmente é necessário para abrir uma conta bancária no nome da empresa (conta PJ)?",
          options: [
            'Somente o CPF do proprietário e um comprovante atualizado de residência em seu nome',
            'O CNPJ da empresa e os documentos de constituição dela',
            'Um comprovante demonstrando que a empresa já obteve lucro suficiente para movimentar uma conta empresarial',
            'Uma autorização emitida pelo contador responsável confirmando que a empresa está apta para abrir conta'
          ],
          correct: 1,
          explanation: "Antes de abrir uma conta empresarial, o banco precisa confirmar que a empresa existe oficialmente, por isso solicita o CNPJ e os documentos da empresa."
        },

        {
          q: "Por que a maioria das empresas contrata um contador?",
          options: [
            'Porque toda empresa, independentemente do porte, é obrigada por lei a possuir um contador exclusivo em tempo integral',
            'Para cuidar de obrigações fiscais, contábeis e trabalhistas que a lei exige',
            'Porque somente um contador possui autorização legal para emitir notas fiscais em nome da empresa',
            'Para assumir as decisões administrativas e financeiras que normalmente seriam tomadas pelos sócios'
          ],
          correct: 1,
          explanation: "O contador auxilia a empresa a cumprir suas obrigações legais, organizar as finanças e evitar problemas com o Fisco."
        },

        {
          q: "De forma simples, o que é o regime tributário de uma empresa?",
          options: [
            'O conjunto de horários e regras que determina quando uma empresa pode funcionar legalmente',
            'O conjunto de regras que define como e quanto a empresa vai pagar de impostos',
            'A classificação utilizada pelo governo para definir quais produtos uma empresa está autorizada a vender',
            'O limite máximo de sócios permitido para cada empresa de acordo com sua atividade econômica'
          ],
          correct: 1,
          explanation: "O regime tributário funciona como um conjunto de regras que define a forma de cálculo e o pagamento dos impostos da empresa."
        },

        {
          q: "Por que é importante guardar notas fiscais e comprovantes de gastos da empresa?",
          options: [
            'Depois da compra esses documentos podem ser descartados, pois ficam registrados automaticamente no governo',
            'Servem para comprovar despesas, ajudar no controle financeiro e evitar problemas com o Fisco',
            'São utilizados apenas para organizar os arquivos físicos da empresa e facilitar consultas internas',
            'Têm utilidade apenas quando é necessário solicitar a troca de um produto adquirido pela empresa'
          ],
          correct: 1,
          explanation: "Esses documentos registram tudo o que entra e sai da empresa, facilitando o controle financeiro e comprovando despesas quando necessário."
        },

        {
          q: "O que pode acontecer se a empresa não pagar os impostos em dia?",
          options: [
            'Os impostos podem ser pagos a qualquer momento sem cobrança adicional, desde que sejam quitados no mesmo ano',
            'A empresa pode ser multada, ter juros sobre o valor devido e até ficar com restrições (como negativação)',
            'O governo costuma cancelar automaticamente os débitos após determinado período sem necessidade de pagamento',
            'O contador responsável assume legalmente a dívida e realiza o pagamento em nome da empresa'
          ],
          correct: 1,
          explanation: "Assim como qualquer conta em atraso, impostos não pagos podem gerar multas, juros e outras restrições para a empresa."
        },

        {
          q: "O que é o alvará de funcionamento?",
          options: [
            'Um documento que autoriza a empresa a funcionar naquele endereço, emitido pela prefeitura',
            'O comprovante oficial de pagamento das contribuições mensais realizadas pelo Microempreendedor Individual',
            'Um seguro obrigatório contratado para proteger a empresa contra multas e fiscalizações municipais',
            'O contrato firmado entre os sócios definindo as responsabilidades administrativas de cada participante'
          ],
          correct: 0,
          explanation: "O alvará é a autorização concedida pela prefeitura para que a empresa possa exercer suas atividades legalmente naquele endereço."
        }
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
    phaseNumber: 2,
    phaseLabel: 'Fase 2',
    skyColor: 0x18233d,
    groundColor: 0x2c3350,
    decorColor: 0x22304f,
    levelWidth: 1990,
    bg: 'agencia_bg.png',
    bossX: 1785,
    bossY: 292,
    doorX: 100,
    groundY: 400,
    characterScale: 2.2,
    infoSpots: [
      { x: 195, y: 235, text: 'Olá! Seja muito bem-vindo ao Sebrae. Estamos felizes em ajudar você nessa nova etapa da sua empresa.', textAfterBoss: 'Tchau! Foi um prazer te ajudar, volte sempre.', },
      { x: 700, y: 245, text: 'Uma empresa organizada acompanha suas finanças e mantém seus documentos sempre em dia.', once: true, },
      { x: 1400, y: 255, text: 'Controlar receitas, despesas e impostos ajuda o empresário a tomar decisões muito mais seguras.', once: true, },
    ],
    boss: {
      name: 'Gerente do Sebrae',
      portrait: { idle: 'boss2_idle.png', talk: 'boss2_talk.png' },
      portraitHeight: 90,
      greeting: 'Seja bem-vindo ao Sebrae RN. Meu nome é Leonel Pontes, sou o responsável por este escritório. Antes de prosseguirmos, gostaria de avaliar seus conhecimentos sobre a organização financeira de uma empresa.',
      introLines: [
        'Vamos à primeira questão:',
        'Muito bem. Sigamos para a próxima:',
        'Última questão — atenção redobrada aqui:',
      ],
      correctLines: [
        'Correto. Você demonstra bom entendimento do assunto.',
        'Exatamente isso. Prossigamos.',
        'Resposta precisa. Muito bem.',
      ],
      wrongLines: [
        'Não é bem assim. Deixe-me esclarecer:',
        'Esse é um ponto que exige atenção. Veja bem:',
        'Vamos revisar esse conceito com calma:',
      ],
      resultMessages: {
        3: 'Desempenho excelente. Você demonstrou domínio sólido sobre organização financeira e tributária.',
        2: 'Bom resultado. Você já tem uma base sólida, mas ainda há pontos importantes para aprofundar.',
        1: 'Você acertou parte dos conceitos, mas ainda vale revisar alguns pontos importantes para a gestão do seu negócio.',
        0: 'Esses conceitos ainda precisam de mais atenção. Estudar um pouco mais fará toda a diferença na gestão da sua empresa.',
      },
      questions: [
        {
          q: "Todo mês ou trimestre, a empresa recolhe seus impostos por meio de uma guia. Para que serve essa guia?",
          options: [
            "É o comprovante utilizado para registrar oficialmente o pagamento dos tributos devidos pela empresa naquele período",
            "É um boleto emitido automaticamente apenas quando a empresa atrasa o pagamento de algum imposto",
            "É um documento interno utilizado somente para organização financeira da empresa, sem validade perante o governo",
            "É um documento obrigatório apenas para empresas de grande porte que possuem muitos funcionários"
          ],
          correct: 0,
          explanation:
            "Essa guia comprova o pagamento dos tributos devidos pela empresa naquele período. No Simples Nacional, ela é chamada de DAS e reúne vários impostos em um único pagamento."
        },

        {
          q: "A empresa pode escolher entre diferentes formas de calcular o imposto sobre o lucro. O que isso significa?",
          options: [
            "Todas as empresas pagam exatamente o mesmo valor de imposto, independentemente do regime escolhido",
            "Existem regras diferentes, e o regime escolhido pode aumentar ou diminuir o quanto a empresa paga de imposto",
            "Somente empresas que apresentam prejuízo durante o ano podem optar por outro regime tributário",
            "O regime tributário é definido automaticamente pelo banco onde a empresa possui sua conta empresarial"
          ],
          correct: 1,
          explanation:
            "Cada regime tributário possui regras próprias para calcular os impostos. Por isso, uma escolha adequada pode reduzir custos e evitar que a empresa pague mais do que deveria."
        },

        {
          q: "Para que serve, na prática, o Balanço Patrimonial?",
          options: [
            "Mostrar apenas quanto a empresa vendeu durante o último dia útil do mês",
            "Mostrar uma 'fotografia' da situação financeira da empresa: o que ela tem, o que deve e o que sobra para os sócios",
            "Servir exclusivamente como documento exigido pelos bancos para aprovação de financiamentos",
            "Substituir as notas fiscais emitidas durante o funcionamento normal da empresa"
          ],
          correct: 1,
          explanation:
            "O Balanço Patrimonial funciona como uma fotografia da empresa em uma data específica. Ele mostra seus bens, seus direitos, suas dívidas e o patrimônio que pertence aos sócios."
        },

        {
          q: "O que é o Simples Nacional?",
          options: [
            "Uma obrigação criada exclusivamente para empresas de grande porte que possuem alto faturamento",
            "Um aplicativo desenvolvido pelo governo para emissão de boletos e pagamento de tributos",
            "Uma linha especial de crédito destinada às pequenas empresas em fase de crescimento",
            "Um regime tributário simplificado, criado para facilitar o pagamento de impostos de pequenas e médias empresas"
          ],
          correct: 3,
          explanation:
            "O Simples Nacional é um regime tributário que simplifica o recolhimento de impostos para empresas que atendem aos seus requisitos, reunindo vários tributos em uma única guia."
        },

        {
          q: "Todo ano, muitas empresas precisam entregar uma declaração informando ao governo o quanto faturaram. Para que serve essa declaração?",
          options: [
            "Substitui completamente a necessidade de pagar os impostos mensais da empresa",
            "É apenas uma formalidade administrativa que não gera nenhuma consequência caso não seja enviada",
            "Para o governo confirmar se os impostos pagos estão de acordo com o movimento real da empresa",
            "É uma obrigação exclusiva para empresas que encerraram o ano com prejuízo financeiro"
          ],
          correct: 2,
          explanation:
            "Essa declaração funciona como uma prestação de contas. Por meio dela, o governo verifica se o faturamento informado e os impostos pagos pela empresa estão corretos."
        },

        {
          q: "Qual é a diferença entre faturamento e lucro?",
          options: [
            "Representam exatamente o mesmo conceito financeiro, mudando apenas o nome utilizado",
            "Faturamento é tudo o que a empresa recebeu com vendas; lucro é o que sobra depois de pagar todas as despesas",
            "Faturamento corresponde somente ao valor que sobra disponível no caixa ao final do mês",
            "O lucro sempre será maior que o faturamento quando a empresa possui boa administração financeira"
          ],
          correct: 1,
          explanation:
            "O faturamento representa o total recebido pelas vendas ou serviços. Já o lucro é o valor que sobra depois que todas as despesas e obrigações são pagas."
        },

        {
          q: "O que é a folha de pagamento de uma empresa?",
          options: [
            "Uma lista contendo apenas os nomes e cargos dos funcionários contratados pela empresa",
            "O conjunto de cálculos e obrigações relacionados aos salários e encargos dos funcionários",
            "Um relatório financeiro utilizado exclusivamente para registrar as vendas realizadas pela empresa",
            "O documento responsável por registrar todas as compras de materiais e equipamentos da empresa"
          ],
          correct: 1,
          explanation:
            "A folha de pagamento reúne os salários e todos os cálculos relacionados aos funcionários, como férias, décimo terceiro, descontos, benefícios e contribuições."
        },

        {
          q: "O que é o pró-labore?",
          options: [
            "Um imposto obrigatório cobrado exclusivamente das empresas de grande porte",
            "A remuneração que o sócio recebe pelo trabalho que exerce na própria empresa",
            "O valor distribuído entre os sócios apenas no encerramento do exercício financeiro anual",
            "Uma taxa administrativa cobrada pela prefeitura para permitir o funcionamento da empresa"
          ],
          correct: 1,
          explanation:
            'O pró-labore é a remuneração recebida pelo sócio pelo trabalho que realiza na empresa. Ele funciona como uma espécie de "salário do sócio", mas não é a mesma coisa que distribuição de lucros.'
        },

        {
          q: "O que é a DRE, ou Demonstração do Resultado do Exercício?",
          options: [
            "Um relatório que mostra se a empresa teve lucro ou prejuízo em determinado período",
            "O documento utilizado para comprovar o pagamento de todos os impostos recolhidos pela empresa",
            "Uma relação completa dos bens, equipamentos e imóveis pertencentes à empresa",
            "Um documento exigido apenas durante o processo de abertura e registro da empresa"
          ],
          correct: 0,
          explanation:
            'A DRE mostra as receitas, os custos e as despesas da empresa durante um período, permitindo descobrir se ela teve lucro ou prejuízo. Enquanto o Balanço é uma "foto", a DRE mostra o desempenho ao longo do tempo.'
        },

        {
          q: "Por que é importante separar as finanças pessoais das finanças da empresa?",
          options: [
            "Não é necessário separar as contas, pois a empresa e o proprietário podem utilizar os mesmos recursos livremente",
            "Para ter controle real do desempenho do negócio e evitar problemas contábeis e fiscais",
            "Porque toda empresa é obrigada por lei a encerrar definitivamente a conta pessoal do proprietário",
            "A separação existe apenas para facilitar a organização visual dos extratos bancários e documentos"
          ],
          correct: 1,
          explanation:
            "Quando as contas pessoais e empresariais são misturadas, fica difícil saber se o negócio realmente está dando lucro. A separação também facilita o controle contábil e evita problemas fiscais."
        }
      ],
    },
  },
  {
    id: 'fasetransicao',
    name: 'O Início de uma Nova Jornada',
    phaseNumber: 2,
    phaseLabel: 'Interlúdio',
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

    narrative: [
      {
        type: 'narrator',
        text: 'Após concluir o processo de formalização, a empresa finalmente estava pronta para começar.',
        duration: 2000,
      },
      {
        type: 'player',
        text: 'Pronto! Meu CNPJ está aberto. Agora vamos pra cima!',
        duration: 2000,
      },
    ],
    infoSpots: [
      { x: 1300, y: 320, text: 'Parabéns por formalizar sua empresa! Esse é só o começo, agora é hora de cuidar bem dela. Boa sorte nessa nova jornada!' },
      { x: 820, y: 320, text: 'Uma boa gestão financeira, organização e planejamento fazem toda a diferença para o sucesso do seu negócio.' },
      { x: 440, y: 340, text: 'Lembre-se: buscar orientação de profissionais especializados pode ajudar sua empresa a crescer com mais segurança.' },
    ],
  },
  {
    id: 'fasetransicao2',
    name: 'Novos Desafios',
    phaseNumber: 2,
    phaseLabel: 'Algum tempo depois',
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

    narrative: [
      {
        type: 'narrator',
        text: 'Algum tempo depois...',
        duration: 2000,
      },
      {
        type: 'narrator',
        text: 'A empresa começou a crescer. Novos clientes chegaram e as responsabilidades aumentaram.',
        duration: 2000,
      },
      {
        type: 'player',
        text: 'Minha empresa está crescendo, mas preciso de ajuda para organizar tudo.',
        duration: 2000,
      },
      {
        type: 'player',
        text: 'Ouvi falar muito bem da JS Grilo Contabilidade & Gestão. Vou procurar a equipe deles.',
        duration: 2000,
      },
    ],
    infoSpots: [
      { x: 1430, y: 325, text: 'Com a empresa crescendo, a papelada e as obrigações também aumentam, é hora de ter um bom apoio contábil.' },
      { x: 1130, y: 305, text: 'Uma contabilidade de confiança faz toda diferença: ajuda a entender os números e tomar decisões melhores.' },
      { x: 720, y: 280, text: 'Sou cliente da JS Grilo Contabilidade & Gestão há um tempo, recomendo demais, são muito bons no que fazem!' },
    ],
  },
  {
    id: 'fase3',
    name: 'JS Grilo Contabilidade & Gestão',
    startX: 80,
    startDirection: 'right',
    hasBoss: true,
    exitInitiallyOpen: false,
    phaseNumber: 3,
    phaseLabel: 'Fase 3',
    skyColor: 0x18233d,
    groundColor: 0x2c3350,
    decorColor: 0x22304f,
    levelWidth: 1994,
    bg: 'office_bg.png', // nome do arquivo em assets/backgrounds/
    // Posição do boss/porta nesta fase (em pixels, dentro da imagem de fundo de 2200x540).
    // Ajuste bossX/bossY livremente pra encaixar o boss na cadeira/mesa da sua arte.
    // bossY é a linha do "chão" onde os pés do boss encostam (mesma lógica do player).
    bossX: 1740,
    bossY: 315,
    doorX: 1750, // porta de saída (some até vencer o boss)
    groundY: 460,        // altura em que os PÉS do personagem encostam nesta fase (chão da perspectiva)
    showExitArrow: false, // fase final: sem seta, o jogo encerra na hora
    characterScale: 2.7, // tamanho do personagem só nesta fase (perspectivas diferentes = tamanhos diferentes)
    infoSpots: [
      { x: 210, y: 230, text: 'Olá, Seja bem vindo a JS Grilo Contabilidade. Parabéns por chegar até aqui! Agora você vai conhecer assuntos mais avançados da contabilidade. Boa sorte!' },
      { x: 720, y: 230, text: 'A legislação muda com frequência. Manter-se atualizado é essencial para qualquer empresa.' },
      { x: 1355, y: 210, text: 'A contabilidade não serve apenas para cumprir obrigações. Ela também ajuda a empresa a crescer com mais segurança.' },
    ],
    boss: {
      name: 'Dona da JS',
      portrait: { idle: 'boss3_idle.png', talk: 'boss3_talk.png' },
      portraitHeight: 100,
      greeting: 'Seja bem-vindo à JS Grilo! Eu sou a responsável pelo escritório. Vamos ver o que você sabe sobre os temas mais avançados da contabilidade?',
      introLines: ['Vamos à primeira:', 'Ótimo! Vamos pra próxima:', 'Última pergunta, força:'],
      correctLines: ['Isso mesmo, muito bem!', 'Perfeito!', 'Excelente resposta!'],
      wrongLines: ['Quase lá.', 'Essa é mais avançada, deixa eu explicar:', 'Vamos entender juntos:'],
      resultMessages: {
        3: 'Impressionante! Você domina até os temas mais avançados da contabilidade. Poucos empresários chegam nesse nível, parabéns!',
        2: 'Muito bom! Você já entende bastante, só alguns detalhes pra aperfeiçoar. E pra isso, contar com uma contabilidade especializada como a JS Grilo faz toda diferença.',
        1: 'Esses temas mais avançados realmente pegam muita gente, e é exatamente pra isso que existe a JS Grilo. Você não precisa saber tudo sozinho, é só contar com a gente!',
        0: 'Não se preocupe, esses são assuntos bem complexos mesmo, até pra quem já tem empresa há um tempo. É justamente por isso que ter uma contabilidade de confiança como a JS Grilo ao seu lado faz toda a diferença.',
      },
      questions: [
        {
          q: "O Brasil está passando por uma reforma tributária que simplifica os impostos sobre consumo. Na prática, o que ela faz?",
          options: [
            "Cria um modelo único de Imposto de Renda para pessoas físicas e jurídicas, substituindo as faixas e regras atuais",
            "Junta vários impostos que hoje existem separadamente, como PIS, Cofins, ICMS e ISS, em novos tributos chamados CBS e IBS",
            "Elimina todos os tributos federais incidentes sobre produtos e serviços comercializados no território nacional",
            "Altera apenas a forma de tributação dos Microempreendedores Individuais, sem afetar as demais empresas"
          ],
          correct: 1,
          explanation: "A Reforma Tributária busca simplificar o sistema brasileiro, substituindo diversos tributos sobre o consumo por dois novos: a CBS e o IBS. Isso torna as regras mais claras e reduz a complexidade para empresas e contribuintes."
        },

        {
          q: "A reforma tributária também criou o chamado Imposto Seletivo. O que ele faz?",
          options: [
            "Substitui o Imposto de Renda cobrado das pessoas físicas que ultrapassam determinado limite de rendimento anual",
            "Cobra um valor extra sobre produtos prejudiciais à saúde ou ao meio ambiente, como cigarros e bebidas alcoólicas",
            "É cobrado exclusivamente de empreendedores que abrem uma nova empresa ou alteram sua atividade econômica",
            "Concede um desconto tributário aos consumidores que compram produtos recicláveis ou ambientalmente sustentáveis"
          ],
          correct: 1,
          explanation: "O Imposto Seletivo incide sobre produtos considerados prejudiciais à saúde ou ao meio ambiente. Por isso, ele ficou conhecido como o 'imposto do pecado'."
        },

        {
          q: "Quando duas empresas do mesmo grupo fazem negócio entre si e o produto ainda não foi revendido para fora do grupo, o que acontece com esse lucro na consolidação?",
          options: [
            "O lucro é reconhecido integralmente, pois a operação ocorreu entre duas empresas juridicamente independentes",
            "O lucro é retirado das demonstrações, porque ainda não representa um ganho real para o grupo perante terceiros",
            "O lucro é registrado em dobro, uma vez que aparece simultaneamente na empresa compradora e na vendedora",
            "O lucro é convertido em uma obrigação financeira da empresa que adquiriu o produto dentro do grupo"
          ],
          correct: 1,
          explanation: "Na consolidação das demonstrações financeiras, esse lucro é eliminado, pois a operação aconteceu apenas dentro do próprio grupo empresarial e ainda não gerou um ganho efetivo perante terceiros."
        },

        {
          q: "O que é o período de transição da Reforma Tributária?",
          options: [
            "O prazo em que os tributos antigos e os novos coexistirão gradualmente até ocorrer a substituição completa",
            "O período temporário em que as empresas ficam dispensadas do pagamento de tributos sobre o consumo",
            "O prazo concedido ao proprietário para decidir se deseja manter ou encerrar definitivamente a empresa",
            "Um benefício fiscal temporário destinado exclusivamente aos Microempreendedores Individuais formalizados"
          ],
          correct: 0,
          explanation: "A mudança não acontece de uma única vez. Durante alguns anos, os tributos atuais e os novos coexistirão para permitir uma adaptação gradual de empresas, governos e contribuintes."
        },

        {
          q: "O que significa dizer que a CBS e o IBS serão tributos não cumulativos?",
          options: [
            "Significa que esses tributos não poderão aparecer mais de uma vez no mesmo documento fiscal emitido pela empresa",
            "A empresa pode descontar do imposto devido os valores pagos nas etapas anteriores da cadeia produtiva",
            "Os tributos serão cobrados apenas uma vez durante todo o período de funcionamento da empresa",
            "As empresas não poderão utilizar créditos tributários relacionados às compras e despesas realizadas"
          ],
          correct: 1,
          explanation: "A não cumulatividade evita o chamado 'imposto sobre imposto'. Assim, a empresa aproveita créditos referentes às etapas anteriores da produção."
        },

        {
          q: "O que costuma ser feito, do ponto de vista contábil, no encerramento do exercício de uma empresa?",
          options: [
            "A empresa encerra formalmente suas atividades e realiza uma nova abertura para iniciar o exercício seguinte",
            "São apurados os resultados do período e organizadas as contas para elaborar as demonstrações contábeis",
            "Os tributos ainda não pagos durante o ano são automaticamente cancelados pelos órgãos responsáveis",
            "Os contratos de trabalho são encerrados para que os funcionários sejam novamente registrados no ano seguinte"
          ],
          correct: 1,
          explanation: "No encerramento do exercício, a contabilidade apura os resultados da empresa e prepara as demonstrações contábeis que representam tudo o que aconteceu durante o ano."
        },

        {
          q: "O que é a consolidação das demonstrações financeiras de um grupo de empresas?",
          options: [
            "É a soma direta de todos os balanços das empresas, sem excluir transações ou realizar qualquer tipo de ajuste",
            "É a união das demonstrações das empresas do grupo em um único conjunto, eliminando operações entre elas",
            "É um relatório institucional elaborado exclusivamente para divulgar os resultados do grupo ao mercado",
            "É uma declaração tributária utilizada para reunir e calcular todos os impostos federais das empresas"
          ],
          correct: 1,
          explanation: "A consolidação reúne as informações das empresas do grupo como se todas formassem uma única organização, eliminando transações realizadas entre elas."
        },

        {
          q: "O que é a Escrituração Contábil Digital (ECD), também chamada de SPED Contábil?",
          options: [
            "Uma plataforma de comércio eletrônico utilizada pelas empresas para registrar vendas e emitir pedidos online",
            "O envio digital da contabilidade da empresa ao governo, substituindo os antigos livros contábeis em papel",
            "Uma modalidade de empréstimo disponibilizada por bancos para financiar a modernização das empresas",
            "Uma declaração eletrônica destinada exclusivamente às pessoas físicas que possuem rendimentos empresariais"
          ],
          correct: 1,
          explanation: "A ECD faz parte do SPED e permite que os livros contábeis sejam enviados digitalmente ao governo, substituindo os antigos registros em papel."
        },

        {
          q: "Com a Reforma Tributária, uma das mudanças é que o imposto passará a ser mostrado 'por fora' na nota fiscal. O que isso significa para o consumidor?",
          options: [
            "O preço final dos produtos e serviços será reduzido automaticamente após a implantação do novo sistema",
            "Ficará mais claro quanto do valor pago pelo consumidor corresponde aos impostos cobrados na operação",
            "O consumidor deixará de pagar tributos sobre os produtos e serviços adquiridos no mercado",
            "Os produtos não terão mais impostos considerados na composição do preço apresentado ao consumidor"
          ],
          correct: 1,
          explanation: "A proposta é tornar o sistema mais transparente, permitindo que o consumidor visualize claramente quanto do preço corresponde aos tributos."
        },

        {
          q: "Ao comprar outra empresa por um valor acima do que vale seu patrimônio líquido, como costuma ser chamada essa diferença?",
          options: [
            "Depreciação acumulada, correspondente à perda de valor dos bens e ativos adquiridos na operação",
            "Ágio, ou goodwill, normalmente relacionado às expectativas de lucros e benefícios econômicos futuros",
            "Provisão para devedores duvidosos, destinada a cobrir possíveis perdas com clientes inadimplentes",
            "Capital de giro, utilizado para financiar as despesas operacionais e manter as atividades da empresa"
          ],
          correct: 1,
          explanation: "Esse valor adicional é conhecido como ágio, ou goodwill. Ele representa benefícios esperados, como marca, reputação, carteira de clientes e potencial de geração de lucros futuros."
        }
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

function shuffleQuestion(question) {
  const items = question.options.map((text, index) => ({
    text,
    isCorrect: index === question.correct,
  }));

  // Embaralhamento Fisher-Yates
  for (let i = items.length - 1; i > 0; i--) {
    const randomIndex = Math.floor(Math.random() * (i + 1));

    [items[i], items[randomIndex]] = [
      items[randomIndex],
      items[i],
    ];
  }

  return {
    ...question,
    options: items.map((item) => item.text),
    correct: items.findIndex((item) => item.isCorrect),
  };
}

function updateHUD() {
  document.getElementById('hud-lives').textContent =
    '❤️'.repeat(Math.max(GameData.lives, 0)) || '💀';

  const partialScore =
    GameData.correctAnswers * 100 +
    GameData.lives * 150;

  document.getElementById('score-value').textContent =
    partialScore;

  const currentPhase = PHASES[GameData.phaseIndex];

  if (!currentPhase) return;

  document.getElementById('phase-label').textContent =
    currentPhase.phaseLabel ??
    `Fase ${currentPhase.phaseNumber ?? GameData.phaseIndex + 1}`;

  document.getElementById('phase-name').textContent =
    currentPhase.name;
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
  const bounds = bossSprite.getBounds();
  const scrollX = scene.cameras.main.scrollX;
  let screenX = bounds.centerX - scrollX;
  const screenTopY = bounds.top;

  screenX = Math.min(Math.max(screenX, 170), 960 - 170);

  const dialogueEl = document.getElementById('boss-dialogue');
  dialogueEl.style.left = `${screenX}px`;

  let bottom = 540 - screenTopY + 26;
  const boxHeight = dialogueEl.offsetHeight;
  const maxBottom = 540 - 10 - boxHeight; // deixa no mínimo 10px de folga no topo da tela
  if (boxHeight > 0 && bottom > maxBottom) {
    bottom = Math.max(maxBottom, 10);
  }
  dialogueEl.style.bottom = `${bottom}px`;
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
  nameEl.textContent = ` ${phaseConfig.boss.name}`;

  const questions = pickRandom(phaseConfig.boss.questions, 3)
    .map((question) => shuffleQuestion(question));
  let qIndex = 0;
  let battleCorrectCount = 0;
  let timerInterval = null;
  let typeInterval = null;
  const typeState = { instant: false };

  function isStale() { return mySession !== GameData.sessionId; }

  // Efeito de "digitação" — clicar no balão pula direto pro texto completo
  function typeText(text, onDone) {
    clearInterval(typeInterval);
    questionEl.textContent = '';
    headerEl.textContent = '';
    typeState.instant = false;
    scene.startBossTalkAnim?.();
    let i = 0;
    typeInterval = setInterval(() => {
      if (isStale()) { clearInterval(typeInterval); scene.stopBossTalkAnim?.(); return; }
      if (typeState.instant) {
        questionEl.textContent = text;
        positionBossDialogue(scene, bossSprite);   // <-- adiciona
        clearInterval(typeInterval);
        scene.stopBossTalkAnim?.();
        if (onDone) onDone();
        return;
      }
      i += 1;
      questionEl.textContent = text.slice(0, i);
      positionBossDialogue(scene, bossSprite);      // <-- adiciona
      if (i >= text.length) {
        clearInterval(typeInterval);
        scene.stopBossTalkAnim?.();
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
    const introLines = phaseConfig.boss.introLines || BOSS_INTRO_LINES;
    typeText(pickLine(introLines, index), () => {
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
      battleCorrectCount += 1;
    } else {
      GameData.lives -= 1;
    }
    updateHUD();

    const correctLines = phaseConfig.boss.correctLines || BOSS_CORRECT_LINES;
    const wrongLines = phaseConfig.boss.wrongLines || BOSS_WRONG_LINES;

    const resultText = isCorrect
      ? pickLine(correctLines, qIndex)
      : `${pickLine(wrongLines, qIndex)} ${q.explanation}`;

    typeText(resultText, () => {
      if (isStale()) return;
      const waitTime = isCorrect ? 1400 : 4200;
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
          finishBattleWithResult();
        }
      }, waitTime);
    });
  }

  // Mostra a mensagem final (varia conforme o desempenho: 3/3, 2/3, 1/3 ou 0/3) antes de liberar a saída
  function finishBattleWithResult() {
    const msg = phaseConfig.boss.resultMessages?.[battleCorrectCount];
    if (msg) {
      typeText(msg, () => {
        setTimeout(() => {
          if (isStale()) return;
          overlay.classList.add('hidden');
          finishBossUI();
          onComplete();
        }, 2800);
      });
    } else {
      overlay.classList.add('hidden');
      finishBossUI();
      onComplete();
    }
  }

  function finishBossUI() {
    clearInterval(timerInterval);
    clearInterval(typeInterval);
    questionEl.onclick = null;
    GameData.paused = false;
    scene.physics.resume();
    scene.inputManager.setEnabled(true);
  }

  if (phaseConfig.boss.greeting) {
    typeText(phaseConfig.boss.greeting, () => {
      setTimeout(() => playIntroThenQuestion(qIndex), 900);
    });
  } else {
    playIntroThenQuestion(qIndex);
  }
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
      typeInfoText(content, ` ${nearest.text}`);
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
function showPhaseIntro(phaseConfig, onComplete) {
  const intro = document.getElementById('phase-intro');
  const label = document.getElementById('phase-intro-label');
  const name = document.getElementById('phase-intro-name');

  label.textContent =
    phaseConfig.phaseLabel ??
    `Fase ${phaseConfig.phaseNumber ?? ''}`;

  name.textContent = phaseConfig.name;

  intro.classList.remove(
    'hidden',
    'phase-intro-visible'
  );

  void intro.offsetWidth;

  intro.classList.add('phase-intro-visible');

  setTimeout(() => {
    intro.classList.add('hidden');
    intro.classList.remove('phase-intro-visible');

    if (onComplete) onComplete();
  }, 2600);
}

// ---------------------------------------------------------
// NARRATIVA DAS FASES DE TRANSIÇÃO
//
// - Bloqueia o movimento durante as falas.
// - Digita o texto letra por letra.
// - Um clique completa a digitação.
// - Outro clique avança para a próxima fala.
// - Também avança automaticamente após o duration.
// ---------------------------------------------------------
function startNarrative(scene, narrative, onComplete) {
  if (!Array.isArray(narrative) || narrative.length === 0) {
    scene.inputManager.setEnabled(true);

    if (onComplete) {
      onComplete();
    }

    return;
  }

  const mySession = GameData.sessionId;

  const overlay = document.getElementById('narrative-overlay');
  const box = document.getElementById('narrative-box');
  const speakerEl = document.getElementById('narrative-speaker');
  const textEl = document.getElementById('narrative-text');
  const continueEl = document.getElementById('narrative-continue');

  let dialogueIndex = 0;
  let typeInterval = null;
  let autoAdvanceTimeout = null;

  let isTyping = false;
  let currentText = '';
  let currentCharIndex = 0;
  let currentDialogueFinished = false;
  let narrativeFinished = false;

  function isStale() {
    return (
      mySession !== GameData.sessionId ||
      !scene.scene.isActive()
    );
  }

  function clearNarrativeTimers() {
    clearInterval(typeInterval);
    clearTimeout(autoAdvanceTimeout);

    typeInterval = null;
    autoAdvanceTimeout = null;
  }

  function getSpeaker(dialogue) {
    if (dialogue.type === 'player') {
      return ` ${GameData.playerName}`;
    }

    return '📖 Narrador';
  }

  function applyDialogueStyle(dialogue) {
    box.classList.remove(
      'player-dialogue',
      'narrator-dialogue'
    );

    if (dialogue.type === 'player') {
      box.classList.add('player-dialogue');
    } else {
      box.classList.add('narrator-dialogue');
    }
  }

  function completeTyping() {
    if (!isTyping) {
      return;
    }

    clearInterval(typeInterval);
    typeInterval = null;

    textEl.textContent = currentText;
    currentCharIndex = currentText.length;

    isTyping = false;
    currentDialogueFinished = true;

    continueEl.classList.add('visible');

    scheduleAutoAdvance();
  }

  function scheduleAutoAdvance() {
    clearTimeout(autoAdvanceTimeout);

    const dialogue = narrative[dialogueIndex];

    const duration =
      dialogue.duration ??
      NARRATIVE_DEFAULT_DURATION_MS;

    autoAdvanceTimeout = setTimeout(() => {
      if (isStale() || narrativeFinished) {
        return;
      }

      goToNextDialogue();
    }, duration);
  }

  function typeDialogueText(text) {
    clearInterval(typeInterval);
    clearTimeout(autoAdvanceTimeout);

    currentText = text;
    currentCharIndex = 0;
    currentDialogueFinished = false;
    isTyping = true;

    textEl.textContent = '';
    continueEl.classList.remove('visible');

    typeInterval = setInterval(() => {
      if (isStale()) {
        clearNarrativeTimers();
        return;
      }

      currentCharIndex += 1;

      textEl.textContent = currentText.slice(
        0,
        currentCharIndex
      );

      if (currentCharIndex >= currentText.length) {
        clearInterval(typeInterval);
        typeInterval = null;

        isTyping = false;
        currentDialogueFinished = true;

        continueEl.classList.add('visible');

        scheduleAutoAdvance();
      }
    }, NARRATIVE_TYPE_SPEED_MS);
  }

  function showDialogue(index) {
    if (isStale() || narrativeFinished) {
      return;
    }

    const dialogue = narrative[index];

    if (!dialogue) {
      finishNarrative();
      return;
    }

    applyDialogueStyle(dialogue);

    speakerEl.textContent = getSpeaker(dialogue);

    /*
     * Permite usar {playerName} dentro do próprio texto,
     * caso você queira citar o jogador na frase.
     */
    const resolvedText = String(dialogue.text ?? '')
      .replaceAll('{playerName}', GameData.playerName);

    typeDialogueText(resolvedText);
  }

  function goToNextDialogue() {
    if (isStale() || narrativeFinished) {
      return;
    }

    clearNarrativeTimers();

    dialogueIndex += 1;

    if (dialogueIndex >= narrative.length) {
      finishNarrative();
      return;
    }

    showDialogue(dialogueIndex);
  }

  function handleNarrativeClick() {
    if (isStale() || narrativeFinished) {
      return;
    }

    /*
     * Primeiro clique:
     * completa imediatamente o texto.
     */
    if (isTyping) {
      completeTyping();
      return;
    }

    /*
     * Segundo clique:
     * avança para a próxima fala.
     */
    if (currentDialogueFinished) {
      goToNextDialogue();
    }
  }

  function finishNarrative() {
    if (narrativeFinished) {
      return;
    }

    narrativeFinished = true;

    clearNarrativeTimers();

    overlay.removeEventListener(
      'click',
      handleNarrativeClick
    );

    overlay.classList.add('hidden');

    box.classList.remove(
      'player-dialogue',
      'narrator-dialogue'
    );

    speakerEl.textContent = '';
    textEl.textContent = '';
    continueEl.classList.remove('visible');

    /*
     * Só libera o jogador se esta ainda for
     * a mesma partida/cena.
     */
    if (!isStale()) {
      scene.inputManager.setEnabled(true);
    }

    if (onComplete && !isStale()) {
      onComplete();
    }
  }

  // Impede que o personagem continue deslizando.
  scene.player.setVelocityX(0);

  // Bloqueia o teclado enquanto a narrativa ocorre.
  scene.inputManager.setEnabled(false);

  overlay.classList.remove('hidden');

  overlay.addEventListener(
    'click',
    handleNarrativeClick
  );

  /*
   * Quando a cena for encerrada ou reiniciada,
   * remove timers e eventos da narrativa.
   */
  scene.events.once('shutdown', () => {
    narrativeFinished = true;

    clearNarrativeTimers();

    overlay.removeEventListener(
      'click',
      handleNarrativeClick
    );

    overlay.classList.add('hidden');
  });

  showDialogue(dialogueIndex);
}

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

    const hasBoss = cfg.hasBoss !== false && cfg.boss;
    if (hasBoss && cfg.boss.portrait) {
      const idleKey = `boss_${cfg.id}_idle`;
      const talkKey = `boss_${cfg.id}_talk`;
      if (!this.textures.exists(idleKey)) {
        this.load.image(idleKey, `assets/bosses/${cfg.boss.portrait.idle}`);
        this.load.image(talkKey, `assets/bosses/${cfg.boss.portrait.talk}`);
      }
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
        targets: icon,          // <- corrigido
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

      if (cfg.boss.portrait) {
        const idleKey = `boss_${cfg.id}_idle`;
        const talkKey = `boss_${cfg.id}_talk`;
        const portraitHeight = cfg.boss.portraitHeight ?? 260;
        const flip = cfg.boss.portraitFlip === true;

        const idleTex = this.textures.get(idleKey).getSourceImage();
        const talkTex = this.textures.get(talkKey).getSourceImage();
        const idleBaseScale = portraitHeight / idleTex.height;
        const talkBaseScale = portraitHeight / talkTex.height;

        this.bossIdleSprite = this.add.image(bossX, bossY, idleKey)
          .setOrigin(0.5, 1)
          .setScale(idleBaseScale)
          .setFlipX(flip);

        this.bossTalkSprite = this.add.image(bossX, bossY, talkKey)
          .setOrigin(0.5, 1)
          .setScale(talkBaseScale)
          .setFlipX(flip)
          .setVisible(false);

        this.bossSprite = this.bossIdleSprite; // usado pra posicionar o balão de diálogo

        // Respiração sutil — escala em cima da própria base (pés ficam travados no lugar)
        this.tweens.add({
          targets: this.bossIdleSprite,
          scaleY: idleBaseScale * 1.02,
          scaleX: idleBaseScale * 0.995,
          duration: 700,
          yoyo: true,
          repeat: -1,
          ease: 'Sine.easeInOut',
        });
        this.tweens.add({
          targets: this.bossTalkSprite,
          scaleY: talkBaseScale * 1.02,
          scaleX: talkBaseScale * 0.995,
          duration: 700,
          yoyo: true,
          repeat: -1,
          ease: 'Sine.easeInOut',
        });

        this.bossTalkInterval = null;
        this.startBossTalkAnim = () => {
          if (this.bossTalkInterval) return;
          this.bossTalkInterval = setInterval(() => {
            const showTalk = !this.bossTalkSprite.visible;
            this.bossTalkSprite.setVisible(showTalk);
            this.bossIdleSprite.setVisible(!showTalk);
          }, 160);
        };
        this.stopBossTalkAnim = () => {
          clearInterval(this.bossTalkInterval);
          this.bossTalkInterval = null;
          this.bossIdleSprite.setVisible(true);
          this.bossTalkSprite.setVisible(false);
        };
      } else {
        this.bossSprite = this.add.image(bossX, bossY, 'bossTex').setOrigin(0.5, 1);
      }

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

    // Sistema de input
    this.inputManager = new InputManager(this);

    this.levelWidth = cfg.levelWidth;

    updateHUD();
    updateMuraisCounter(cfg.id, cfg.infoSpots.length);

    // Bloqueia o personagem durante o título
    this.inputManager.setEnabled(false);

    // Apresentação do capítulo
    showPhaseIntro(cfg, () => {
      if (cfg.narrative?.length) {
        startNarrative(this, cfg.narrative);
      } else {
        this.inputManager.setEnabled(true);
      }
    });

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

    if (!this.inputManager.enabled) {
      this.player.setVelocityX(0);

      const idleAnim =
        `${GameData.selectedCharacter}_idle`;

      if (
        this.player.anims.currentAnim?.key !== idleAnim
      ) {
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