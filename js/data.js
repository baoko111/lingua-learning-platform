/**
 * data.js —— 多语种学习平台课程数据层
 * 涵盖英语 / 日语 / 韩语三大语种的分级课程体系与互动学习素材
 * 数据结构：语种 -> 等级(A1~C2) -> 课程单元 -> 互动素材（单词/语法/听力/口语）
 */

// 语种元数据：包含文化色彩、字面标识、TTS 语言代码等
const LANGUAGES = {
  en: {
    code: 'en',
    name: '英语',
    nativeName: 'English',
    tagline: '通向世界的通用语',
    accent: '#0f6e6e',          // 深青——英伦沉稳
    accentSoft: '#d7e9e6',
    flag: 'EN',
    tts: 'en-US',
    greeting: 'Hello, welcome',
    levels: ['A1', 'A2', 'B1', 'B2', 'C1', 'C2']
  },
  ja: {
    code: 'ja',
    name: '日语',
    nativeName: '日本語',
    tagline: '一音一景，禅意流转',
    accent: '#c0392b',          // 朱红——和风 Vermillion
    accentSoft: '#f6deda',
    flag: 'JA',
    tts: 'ja-JP',
    greeting: 'ようこそ',
    levels: ['N5', 'N4', 'N3', 'N2', 'N1']  // 对标 JLPT
  },
  ko: {
    code: 'ko',
    name: '韩语',
    nativeName: '한국어',
    tagline: '韵律之间，听见韩流',
    accent: '#6d3a8e',          // 紫梅——韩韵 Plum
    accentSoft: '#e7ddf0',
    flag: 'KO',
    tts: 'ko-KR',
    greeting: '환영합니다',
    levels: ['1급', '2급', '3급', '4급', '5급', '6급']  // 对标 TOPIK
  }
};

// 等级元数据：通用能力描述（CEFR 对照）
const LEVEL_META = {
  'A1':  { name: '入门', desc: '理解并使用日常用语和基本句型', ceHours: '90~100h' },
  'A2':  { name: '基础', desc: '简单交流、描述背景与即时需求', ceHours: '180~200h' },
  'B1':  { name: '进阶', desc: '在旅游、工作场景中应对大部分情况', ceHours: '350~400h' },
  'B2':  { name: '中高', desc: '与母语者流畅交流、撰写详细文本', ceHours: '500~600h' },
  'C1':  { name: '高级', desc: '灵活高效地运用语言于社交与学术', ceHours: '700~800h' },
  'C2':  { name: '精通', desc: '毫不费力地理解几乎所有内容', ceHours: '1000~1200h' },
  'N5':  { name: '入门', desc: '能读懂基础日语、听懂日常会话', ceHours: '~150h' },
  'N4':  { name: '基础', desc: '能理解日常场景基本日语', ceHours: '~300h' },
  'N3':  { name: '进阶', desc: '能大致理解日常场景的日语', ceHours: '~450h' },
  'N2':  { name: '中高', desc: '能理解日常场景与部分抽象内容', ceHours: '~600h' },
  'N1':  { name: '高级', desc: '能理解各类复杂场景的日语', ceHours: '~900h' },
  '1급': { name: '入门', desc: '掌握韩语基本发音与日常问候', ceHours: '~120h' },
  '2급': { name: '基础', desc: '能进行简单日常生活对话', ceHours: '~220h' },
  '3급': { name: '进阶', desc: '能使用韩语处理日常事务', ceHours: '~380h' },
  '4급': { name: '中级', desc: '能使用一定抽象的韩语表达', ceHours: '~500h' },
  '5급': { name: '中高', desc: '能流利进行专业领域交流', ceHours: '~700h' },
  '6급': { name: '高级', desc: '能流畅、精准地运用韩语', ceHours: '~900h' }
};

/**
 * 课程单元数据
 * 结构：[langCode] -> 数组，每项含 { level, unit, title, subtitle, focus, vocab[], grammar[], listening{}, speaking[] }
 * 每条 vocab: { word, phonetic, meaning, example, exampleZh }
 * 每条 grammar: { title, pattern, explain, examples[] }
 * listening: { title, transcript, audioText(供 TTS 朗读), questions[] }
 * speaking[]: { phrase, translation, tip }
 */
const COURSES = {
  // ============ 英语 ============
  en: [
    {
      level: 'A1', unit: 1,
      title: 'First Words · 初识英语',
      subtitle: '从问候开始的第一步',
      focus: '问候 / 自我介绍 / 人称代词',
      vocab: [
        { word: 'hello', phonetic: '/həˈloʊ/', meaning: '你好', example: 'Hello, how are you?', exampleZh: '你好，你怎么样？' },
        { word: 'name', phonetic: '/neɪm/', meaning: '名字', example: 'My name is Lin.', exampleZh: '我的名字叫林。' },
        { word: 'friend', phonetic: '/frend/', meaning: '朋友', example: 'She is my best friend.', exampleZh: '她是我最好的朋友。' },
        { word: 'today', phonetic: '/təˈdeɪ/', meaning: '今天', example: 'Today is a sunny day.', exampleZh: '今天是个晴天。' },
        { word: 'thank you', phonetic: '/ˈθæŋk juː/', meaning: '谢谢你', example: 'Thank you very much.', exampleZh: '非常感谢。' }
      ],
      grammar: [
        {
          title: 'be 动词与人称',
          pattern: 'I am / You are / He·She·It is',
          explain: 'be 动词随主语变化，是最基础的句型骨架。',
          examples: ['I am a student.', 'You are kind.', 'She is my teacher.']
        },
        {
          title: '物主代词',
          pattern: 'my / your / his / her',
          explain: '表示所属关系，置于名词之前。',
          examples: ['This is my book.', 'Her name is Anna.']
        }
      ],
      listening: {
        title: '咖啡馆里的初次见面',
        audioText: "Hi, I'm Anna. Nice to meet you. Are you a new student here? My class is in room twelve. Let's get a coffee after class, okay?",
        transcript: 'Anna 在咖啡馆与新同学打招呼，并约课后一起喝咖啡。',
        questions: [
          { q: 'Anna 的班级在哪间教室？', options: ['10 号', '11 号', '12 号', '13 号'], answer: 2 },
          { q: 'Anna 提议课后做什么？', options: ['看书', '喝咖啡', '去图书馆', '回家'], answer: 1 }
        ]
      },
      speaking: [
        { phrase: 'Nice to meet you.', translation: '很高兴认识你。', tip: '尾音 you 轻而上扬，显得真诚。' },
        { phrase: 'How do you do?', translation: '您好（正式）。', tip: '较正式场合使用，回答相同。' },
        { phrase: 'See you later.', translation: '回头见。', tip: 'later 的 t 略弱化。' }
      ]
    },
    {
      level: 'A1', unit: 2,
      title: 'Daily Life · 日常作息',
      subtitle: '描述一天的生活节奏',
      focus: '一般现在时 / 时间表达 / 频率副词',
      vocab: [
        { word: 'morning', phonetic: '/ˈmɔːrnɪŋ/', meaning: '早晨', example: 'I read English every morning.', exampleZh: '我每天早晨读英语。' },
        { word: 'breakfast', phonetic: '/ˈbrekfəst/', meaning: '早餐', example: 'Breakfast is ready.', exampleZh: '早餐准备好了。' },
        { word: 'work', phonetic: '/wɜːrk/', meaning: '工作', example: 'I work in a hospital.', exampleZh: '我在医院工作。' },
        { word: 'evening', phonetic: '/ˈiːvnɪŋ/', meaning: '傍晚', example: 'I relax in the evening.', exampleZh: '我傍晚放松。' },
        { word: 'usually', phonetic: '/ˈjuːʒuəli/', meaning: '通常', example: 'I usually walk home.', exampleZh: '我通常步行回家。' }
      ],
      grammar: [
        {
          title: '一般现在时',
          pattern: '主语 + 动词 (第三人称单数加 -s)',
          explain: '表达习惯、常态与客观事实。',
          examples: ['He works hard.', 'The sun rises in the east.']
        },
        {
          title: '频率副词的位置',
          pattern: 'always / usually / often / sometimes / never',
          explain: '通常位于 be 动词之后，实义动词之前。',
          examples: ['She is always happy.', 'I often read at night.']
        }
      ],
      listening: {
        title: '记者采访上班族',
        audioText: "I usually wake up at six and have breakfast at seven. I take the subway to work. Work starts at nine. I finish at six in the evening, and I read for thirty minutes before bed.",
        transcript: '一位上班族介绍自己的日常作息时间表。',
        questions: [
          { q: '他几点起床？', options: ['5 点', '6 点', '7 点', '9 点'], answer: 1 },
          { q: '他睡前做什么？', options: ['看电视', '听音乐', '读书 30 分钟', '锻炼'], answer: 2 }
        ]
      },
      speaking: [
        { phrase: 'I usually get up at seven.', translation: '我通常七点起床。', tip: 'usually 重音在第一个音节。' },
        { phrase: 'What time is it?', translation: '现在几点？', tip: '口语常弱化为 What time is it?' },
        { phrase: 'Have a nice day!', translation: '祝你有美好的一天！', tip: 'day 尾音上扬。' }
      ]
    },
    {
      level: 'A2', unit: 3,
      title: 'Travel Around · 旅行见闻',
      subtitle: '在路上用英语解决问题',
      focus: '过去时态 / 问路与方向',
      vocab: [
        { word: 'airport', phonetic: '/ˈerpɔːrt/', meaning: '机场', example: 'The airport is far from here.', exampleZh: '机场离这里很远。' },
        { word: 'ticket', phonetic: '/ˈtɪkɪt/', meaning: '车票', example: 'Two tickets, please.', exampleZh: '请给我两张票。' },
        { word: 'direction', phonetic: '/dəˈrekʃn/', meaning: '方向', example: 'Can you give me directions?', exampleZh: '你能指一下方向吗？' },
        { word: 'arrive', phonetic: '/əˈraɪv/', meaning: '到达', example: 'We arrived at noon.', exampleZh: '我们中午到达。' },
        { word: 'lost', phonetic: '/lɔːst/', meaning: '迷路的', example: 'I think I am lost.', exampleZh: '我想我迷路了。' }
      ],
      grammar: [
        {
          title: '一般过去时',
          pattern: '主语 + 动词过去式 (-ed / 不规则)',
          explain: '描述过去发生的动作或状态。',
          examples: ['We visited Kyoto last year.', 'I lost my passport.']
        }
      ],
      listening: {
        title: '在车站问路',
        audioText: "Excuse me, how do I get to the central station? Go straight for two blocks, then turn left at the bank. The station is on your right, next to the post office.",
        transcript: '游客在街头向当地人询问去中央车站的路。',
        questions: [
          { q: '走几个街区后左转？', options: ['1 个', '2 个', '3 个', '4 个'], answer: 1 },
          { q: '车站在什么旁边？', options: ['银行', '邮局', '超市', '学校'], answer: 1 }
        ]
      },
      speaking: [
        { phrase: 'Excuse me, where is the station?', translation: '打扰一下，车站在哪？', tip: 'Excuse me 用于礼貌引起注意。' },
        { phrase: 'Turn left at the corner.', translation: '在拐角处左转。', tip: 'corner 重音在前。' }
      ]
    },
    {
      level: 'B1', unit: 4,
      title: 'Opinions & Ideas · 表达观点',
      subtitle: '从陈述到表达立场',
      focus: '比较级 / 观点表达 / 让步从句',
      vocab: [
        { word: 'opinion', phonetic: '/əˈpɪnjən/', meaning: '观点', example: 'In my opinion, it is too late.', exampleZh: '在我看来太迟了。' },
        { word: 'compare', phonetic: '/kəmˈper/', meaning: '比较', example: 'Compare the two photos.', exampleZh: '比较这两张照片。' },
        { word: 'although', phonetic: '/ɔːlˈðoʊ/', meaning: '尽管', example: 'Although it rained, we went out.', exampleZh: '尽管下雨，我们还是出门了。' },
        { word: 'decision', phonetic: '/dɪˈsɪʒn/', meaning: '决定', example: 'It is a hard decision.', exampleZh: '这是个艰难的决定。' },
        { word: 'benefit', phonetic: '/ˈbenɪfɪt/', meaning: '好处', example: 'Reading has many benefits.', exampleZh: '阅读有很多好处。' }
      ],
      grammar: [
        {
          title: '比较级与最高级',
          pattern: '形容词 + er / more + 形容词; the + 最高级',
          explain: '用于两者或多者之间的比较。',
          examples: ['This book is more interesting than that one.', 'She is the tallest in class.']
        }
      ],
      listening: {
        title: '播客：远程办公的利与弊',
        audioText: "Working from home saves commuting time, but it also blurs the line between work and life. In my opinion, a hybrid model is better because it gives flexibility and keeps team connection.",
        transcript: '播客主持讨论远程办公的优缺点，并给出个人观点。',
        questions: [
          { q: '远程办公的好处之一？', options: ['省通勤时间', '工资更高', '同事更多', '更轻松'], answer: 0 },
          { q: '主持支持哪种模式？', options: ['全远程', '全到岗', '混合模式', '不表态'], answer: 2 }
        ]
      },
      speaking: [
        { phrase: 'In my opinion…', translation: '在我看来……', tip: '用于引出观点，得体正式。' },
        { phrase: 'I see your point, but…', translation: '我明白你的意思，但是……', tip: '让步后转折，礼貌反驳。' }
      ]
    }
  ],

  // ============ 日语 ============
  ja: [
    {
      level: 'N5', unit: 1,
      title: 'はじめまして · 初次见面',
      subtitle: '从寒暄进入和风世界',
      focus: 'あいさつ / 自己紹介 / です形',
      vocab: [
        { word: 'こんにちは', phonetic: 'konnichiwa', meaning: '你好', example: 'こんにちは、元気ですか。', exampleZh: '你好，你好吗？' },
        { word: 'はじめまして', phonetic: 'hajimemashite', meaning: '初次见面', example: 'はじめまして、どうぞよろしく。', exampleZh: '初次见面，请多关照。' },
        { word: '名前', phonetic: 'namae', meaning: '名字', example: 'お名前は何ですか。', exampleZh: '您叫什么名字？' },
        { word: '学生', phonetic: 'gakusei', meaning: '学生', example: '私は学生です。', exampleZh: '我是学生。' },
        { word: 'ありがとうございます', phonetic: 'arigatou gozaimasu', meaning: '非常感谢', example: '本当にありがとうございます。', exampleZh: '真的很感谢。' }
      ],
      grammar: [
        {
          title: '「です」断定句',
          pattern: '名詞1 は 名詞2 です',
          explain: '表示「A 是 B」的基本判断句型，「は」为主题助词。',
          examples: ['私は日本人です。', 'これは本です。']
        },
        {
          title: '疑问词「何」',
          pattern: '～は 何ですか',
          explain: '用于询问名称或内容，句末「か」表疑问。',
          examples: ['これは何ですか。', 'お名前は何ですか。']
        }
      ],
      listening: {
        title: '学校里的自我介绍',
        audioText: 'はじめまして。私は田中です。日本人です。東京大学の学生です。どうぞよろしくお願いします。',
        transcript: '田中在学校做自我介绍，说明国籍与身份。',
        questions: [
          { q: '田中的国籍是？', options: ['中国', '韩国', '日本', '美国'], answer: 2 },
          { q: '田中的身份是？', options: ['老师', '公司职员', '学生', '医生'], answer: 2 }
        ]
      },
      speaking: [
        { phrase: 'はじめまして、どうぞよろしくお願いします。', translation: '初次见面，请多关照。', tip: '「お願いします」语调微微下沉。' },
        { phrase: 'おはようございます。', translation: '早上好。', tip: '早晨使用，较为正式。' },
        { phrase: 'すみません。', translation: '对不起/打扰了。', tip: '引起注意或道歉时通用。' }
      ]
    },
    {
      level: 'N5', unit: 2,
      title: '毎日の生活 · 每日生活',
      subtitle: '描述日常作息与时间',
      focus: 'ます形 / 時間 / 助詞「に·で·へ」',
      vocab: [
        { word: '朝', phonetic: 'asa', meaning: '早晨', example: '朝六時に起きます。', exampleZh: '早上六点起床。' },
        { word: '学校', phonetic: 'gakkou', meaning: '学校', example: '学校へ行きます。', exampleZh: '去学校。' },
        { word: '食べる', phonetic: 'taberu', meaning: '吃', example: 'パンを食べます。', exampleZh: '吃面包。' },
        { word: '電車', phonetic: 'densha', meaning: '电车', example: '電車で通います。', exampleZh: '坐电车通勤。' },
        { word: '夜', phonetic: 'yoru', meaning: '夜晚', example: '夜は本を読みます。', exampleZh: '晚上读书。' }
      ],
      grammar: [
        {
          title: '「ます」礼貌体现在时',
          pattern: '動詞ます形（～ます / ～ません）',
          explain: '表示礼貌的现在或将来动作，否定用「ません」。',
          examples: ['毎朝パンを食べます。', '今日は行きません。']
        },
        {
          title: '移动助词「へ·で」',
          pattern: '場所へ 行く / 交通手段で 行く',
          explain: '「へ」表方向，「で」表交通手段。',
          examples: ['会社へ電車で行きます。']
        }
      ],
      listening: {
        title: '一天的时间表',
        audioText: '私は毎朝六時に起きます。七時に朝ごはんを食べます。八時に家を出て、電車で学校へ行きます。夜は十時に寝ます。',
        transcript: '讲述者介绍自己一天从早到晚的时间安排。',
        questions: [
          { q: '几点出门？', options: ['6 点', '7 点', '8 点', '10 点'], answer: 2 },
          { q: '怎么去学校？', options: ['步行', '电车', '公交', '开车'], answer: 1 }
        ]
      },
      speaking: [
        { phrase: '毎朝六時に起きます。', translation: '我每天早上六点起床。', tip: '「に」用于具体时间点。' },
        { phrase: 'いってきます。', translation: '我出门了。', tip: '离家时常用寒暄。' }
      ]
    },
    {
      level: 'N4', unit: 3,
      title: 'ショッピング · 购物',
      subtitle: '在商店里自如交流',
      focus: 'て形 / 形容词 / 欲しい',
      vocab: [
        { word: '店', phonetic: 'mise', meaning: '商店', example: 'あの店は安いです。', exampleZh: '那家店很便宜。' },
        { word: '値段', phonetic: 'nedan', meaning: '价格', example: '値段が高いです。', exampleZh: '价格很贵。' },
        { word: '欲しい', phonetic: 'hoshii', meaning: '想要', example: '新しい靴が欲しいです。', exampleZh: '想要新鞋。' },
        { word: '大きい', phonetic: 'ookii', meaning: '大的', example: '大きい袋をください。', exampleZh: '请给我大袋子。' },
        { word: '安い', phonetic: 'yasui', meaning: '便宜的', example: 'とても安いです。', exampleZh: '非常便宜。' }
      ],
      grammar: [
        {
          title: 'い形容词·な形容词',
          pattern: 'い形 + です / な形 + な + 名詞',
          explain: 'い形容词词尾「い」直接接「です」；な形容词去「な」接名词。',
          examples: ['この鞄は重いです。', 'きれいな花ですね。']
        },
        {
          title: 'て形并列请求',
          pattern: '動詞て + ください',
          explain: '表示礼貌的请求或指示。',
          examples: ['もう一度言ってください。', 'ここに書いてください。']
        }
      ],
      listening: {
        title: '服装店试衣',
        audioText: 'すみません、このシャツ、もう少し大きいサイズはありますか。はい、Lサイズならございます。試着してもいいですか。どうぞ、こちらの試着室へどうぞ。',
        transcript: '顾客在服装店询问是否有更大尺码并请求试穿。',
        questions: [
          { q: '顾客想要什么？', options: ['更小尺码', '更大尺码', '别的颜色', '更便宜'], answer: 1 },
          { q: '店员指了哪里？', options: ['收银台', '出口', '试衣间', '仓库'], answer: 2 }
        ]
      },
      speaking: [
        { phrase: 'これ、いくらですか。', translation: '这个多少钱？', tip: '购物最常用句。' },
        { phrase: 'もう少し安くなりませんか。', translation: '能再便宜点吗？', tip: '礼貌议价。' }
      ]
    }
  ],

  // ============ 韩语 ============
  ko: [
    {
      level: '1급', unit: 1,
      title: '처음 뵙겠습니다 · 初次见面',
      subtitle: '走进韩流的问候世界',
      focus: '인사 / 자기소개 / 입니다',
      vocab: [
        { word: '안녕하세요', phonetic: 'annyeonghaseyo', meaning: '你好', example: '안녕하세요, 만나서 반갑습니다.', exampleZh: '你好，很高兴见到你。' },
        { word: '이름', phonetic: 'ireum', meaning: '名字', example: '이름이 뭐예요?', exampleZh: '你叫什么名字？' },
        { word: '학생', phonetic: 'haksaeng', meaning: '学生', example: '저는 학생이에요.', exampleZh: '我是学生。' },
        { word: '감사합니다', phonetic: 'gamsahamnida', meaning: '谢谢', example: '정말 감사합니다.', exampleZh: '真的很感谢。' },
        { word: '처음 뵙겠습니다', phonetic: 'cheoeum boegesseumnida', meaning: '初次见面', example: '처음 뵙겠습니다, 잘 부탁드립니다.', exampleZh: '初次见面，请多关照。' }
      ],
      grammar: [
        {
          title: '입니다 / 이에요 断定',
          pattern: '명사 + 입니다 / 이에요(예요)',
          explain: '表示「是……」的判断句，「입니다」更正式，「이에요」较口语。',
          examples: ['저는 학생입니다.', '이것은 책이에요.']
        },
        {
          title: '主语助词 은/는',
          pattern: '명사 + 은(종성 O) / 는(종성 X)',
          explain: '提示句子主题，有收音用「은」，无收音用「는」。',
          examples: ['저는 한국 사람이에요.', '이 책은 제것입니다.']
        }
      ],
      listening: {
        title: '新学期自我介绍',
        audioText: '안녕하세요, 처음 뵙겠습니다. 저는 김민준입니다. 한국 사람이고 서울대학교 학생입니다. 잘 부탁드립니다.',
        transcript: '金敏俊在新学期做自我介绍。',
        questions: [
          { q: '他的国籍？', options: ['中国', '日本', '韩国', '美国'], answer: 2 },
          { q: '他的身份？', options: ['老师', '学生', '医生', '职员'], answer: 1 }
        ]
      },
      speaking: [
        { phrase: '안녕하세요, 만나서 반갑습니다.', translation: '你好，很高兴见到你。', tip: '语调平和，尾音略下沉。' },
        { phrase: '잘 부탁드립니다.', translation: '请多关照。', tip: '初次见面常用客套。' }
      ]
    },
    {
      level: '2급', unit: 2,
      title: '하루 생활 · 一天生活',
      subtitle: '描述日常与时间',
      focus: '해요체 / 시간 / 에서·로',
      vocab: [
        { word: '아침', phonetic: 'achim', meaning: '早晨', example: '아침 여섯 시에 일어나요.', exampleZh: '早上六点起床。' },
        { word: '학교', phonetic: 'hakgyo', meaning: '学校', example: '학교에 가요.', exampleZh: '去学校。' },
        { word: '먹다', phonetic: 'meokda', meaning: '吃', example: '밥을 먹어요.', exampleZh: '吃饭。' },
        { word: '지하철', phonetic: 'jihacheol', meaning: '地铁', example: '지하철을 타요.', exampleZh: '坐地铁。' },
        { word: '밤', phonetic: 'bam', meaning: '夜晚', example: '밤에 책을 읽어요.', exampleZh: '晚上读书。' }
      ],
      grammar: [
        {
          title: '해요체 现在时',
          pattern: '동사 어간 + 아요/어요',
          explain: '日常最常用的敬语阶称，礼貌而自然。',
          examples: ['매일 한국어를 공부해요.', '오늘 친구를 만나요.']
        },
        {
          title: '处所助词 에 / 에서',
          pattern: '장소 에 가다 / 장소 에서 하다',
          explain: '「에」表目的地，「에서」表动作发生地。',
          examples: ['도서관에서 공부해요.', '집에 가요.']
        }
      ],
      listening: {
        title: '一天的时间表',
        audioText: '저는 매일 아침 여섯 시에 일어나요. 일곱 시에 아침을 먹고 여덟 시에 집에서 나와요. 지하철을 타고 학교에 가요. 밤 열 시에 자요.',
        transcript: '讲述者介绍自己一天的作息。',
        questions: [
          { q: '几点出门？', options: ['6 点', '7 点', '8 点', '10 点'], answer: 2 },
          { q: '怎么去学校？', options: ['步行', '公交', '地铁', '开车'], answer: 2 }
        ]
      },
      speaking: [
        { phrase: '지금 몇 시예요?', translation: '现在几点？', tip: '问时间最常用。' },
        { phrase: '맛있게 드세요.', translation: '请慢用。', tip: '对用餐者说。' }
      ]
    },
    {
      level: '3급', unit: 3,
      title: '쇼핑 · 购物',
      subtitle: '在店里自如表达',
      focus: '고 싶다 / 아/어 보다 / 形容词',
      vocab: [
        { word: '가게', phonetic: 'gage', meaning: '商店', example: '이 가게는 싸요.', exampleZh: '这家店很便宜。' },
        { word: '가격', phonetic: 'gagyeok', meaning: '价格', example: '가격이 비싸요.', exampleZh: '价格很贵。' },
        { word: '사고 싶다', phonetic: 'sago sipda', meaning: '想买', example: '신발을 사고 싶어요.', exampleZh: '想买鞋。' },
        { word: '크다', phonetic: 'keuda', meaning: '大的', example: '더 큰 사이즈 있어요?', exampleZh: '有更大的尺码吗？' },
        { word: '싸다', phonetic: 'ssada', meaning: '便宜的', example: '정말 싸요.', exampleZh: '真的很便宜。' }
      ],
      grammar: [
        {
          title: '고 싶다 愿望',
          pattern: '동사 어간 + 고 싶다',
          explain: '表示第一人称的愿望，「싶어요」为口语敬语。',
          examples: ['커피를 마시고 싶어요.', '여행을 가고 싶습니다.']
        },
        {
          title: '아/어 보다 尝试',
          pattern: '동사 어간 + 아/어 보다',
          explain: '表示尝试做某事，常用于建议。',
          examples: ['이 옷을 입어 보세요.', '한국 음식을 먹어 봤어요?']
        }
      ],
      listening: {
        title: '服装店试衣',
        audioText: '저기요, 이 셔츠 더 큰 사이즈 있나요? 네, L 사이즈 있습니다. 입어 봐도 돼요? 네, 탈의실로 들어가세요.',
        transcript: '顾客询问是否有更大尺码并请求试穿。',
        questions: [
          { q: '顾客想要？', options: ['更小尺码', '更大尺码', '别的颜色', '更便宜'], answer: 1 },
          { q: '店员指了哪里？', options: ['收银台', '出口', '试衣间', '仓库'], answer: 2 }
        ]
      },
      speaking: [
        { phrase: '이거 얼마예요?', translation: '这个多少钱？', tip: '购物必备。' },
        { phrase: '좀 깎아 주세요.', translation: '请便宜一点。', tip: '礼貌议价。' }
      ]
    }
  ]
};

/**
 * 成就系统数据
 * type: streak(连续) | xp(经验) | lesson(课时) | lang(语种) | perfect(满分)
 */
const ACHIEVEMENTS = [
  { id: 'first_step',   name: '迈出第一步',   desc: '完成第一节课',           icon: '✦', type: 'lesson',  threshold: 1,  xp: 20 },
  { id: 'streak_3',     name: '三日不辍',     desc: '连续学习 3 天',          icon: '✺', type: 'streak',  threshold: 3,  xp: 30 },
  { id: 'streak_7',     name: '一周坚持',     desc: '连续学习 7 天',          icon: '❉', type: 'streak',  threshold: 7,  xp: 80 },
  { id: 'xp_100',       name: '初露锋芒',     desc: '累计获得 100 经验',      icon: '◈', type: 'xp',      threshold: 100, xp: 0 },
  { id: 'xp_500',       name: '勤学不倦',     desc: '累计获得 500 经验',      icon: '◈', type: 'xp',      threshold: 500, xp: 0 },
  { id: 'lesson_10',    name: '十课有成',     desc: '完成 10 节课',           icon: '✪', type: 'lesson',  threshold: 10, xp: 60 },
  { id: 'lang_2',       name: '双语者',       desc: '在 2 个语种完成至少一课', icon: '❂', type: 'lang',    threshold: 2,  xp: 100 },
  { id: 'lang_3',       name: '三语通',       desc: '在 3 个语种完成至少一课', icon: '❂', type: 'lang',    threshold: 3,  xp: 200 },
  { id: 'perfect_5',    name: '满分达人',     desc: '获得 5 次满分练习',      icon: '✧', type: 'perfect', threshold: 5,  xp: 80 }
];

/**
 * 社区话题种子数据
 * 每条：{ id, author, avatar色, lang, tag, title, excerpt, likes, replies, time }
 */
const COMMUNITY_SEED = [
  { id: 'c1', author: '柚子', avatar: '#c0392b', lang: 'ja', tag: '学习心得', title: 'N5 一次过的经验：每天 30 分钟听力', excerpt: '把 NHK Easy 当背景音，三个月下来耳朵真的变灵了……', likes: 128, replies: 23, time: '2 小时前' },
  { id: 'c2', author: 'Lin',  avatar: '#0f6e6e', lang: 'en', tag: '口语练习', title: '影子跟读 21 天打卡', excerpt: '从结结巴巴到能跟上 TED 演讲节奏，分享我的跟读清单……', likes: 96, replies: 18, time: '5 小时前' },
  { id: 'c3', author: '민준', avatar: '#6d3a8e', lang: 'ko', tag: '资源分享', title: '推荐三个免费韩语播客', excerpt: '通勤路上听，语速友好又有字幕，初学者也能跟上……', likes: 74, replies: 11, time: '昨天' },
  { id: 'c4', author: '小满', avatar: '#d97706', lang: 'ja', tag: '疑问求助', title: 'て形总是记不住怎么办？', excerpt: '背了忘忘了背，有没有什么口诀或记忆法……', likes: 41, replies: 32, time: '昨天' },
  { id: 'c5', author: 'Echo', avatar: '#0f6e6e', lang: 'en', tag: '学习心得', title: 'B1 到 B2 的瓶颈期怎么破？', excerpt: '听力一直上不去，感觉卡在某个点过不去……', likes: 63, replies: 27, time: '3 天前' }
];

// 个性化推荐规则：基于未学习语种与最薄弱模块给出建议
const RECOMMEND_RULES = {
  // 学习目标选项
  goals: [
    { id: 'travel',  label: '出国旅行',   icon: '✈', desc: '侧重日常对话与听力' },
    { id: 'work',    label: '职场提升',   icon: '◈', desc: '侧重商务表达与写作' },
    { id: 'exam',    label: '考试认证',   icon: '✦', desc: '对标 CEFR/JLPT/TOPIK' },
    { id: 'culture', label: '文化兴趣',   icon: '❉', desc: '影视、文学、动漫' },
    { id: 'social',  label: '社交交友',   icon: '❂', desc: '口语与流行表达' }
  ],
  // 每日学习时长
  paces: [
    { id: 'casual',  label: '轻松模式', minutes: 15, desc: '每天约 15 分钟' },
    { id: 'standard',label: '标准模式', minutes: 30, desc: '每天约 30 分钟' },
    { id: 'intense', label: '强化模式', minutes: 60, desc: '每天约 60 分钟' }
  ]
};

// 暴露到全局
window.PLATFORM_DATA = { LANGUAGES, LEVEL_META, COURSES, ACHIEVEMENTS, COMMUNITY_SEED, RECOMMEND_RULES };
