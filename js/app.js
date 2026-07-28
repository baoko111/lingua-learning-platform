/* ============================================================
   app.js —— 多语种学习平台主逻辑
   职责：
   1) 本地状态管理（localStorage）与注册登录
   2) hash 路由
   3) 各视图渲染：首页 / 仪表盘 / 课程 / 学习 / 推荐 / 社区 / 成就
   4) 互动学习模块：单词卡 / 语法选择 / 听力 TTS / 口语跟读
   5) 进度、连续打卡、经验、成就追踪
   ============================================================ */
(function () {
  'use strict';

  // 解构平台数据
  const { LANGUAGES, LEVEL_META, COURSES, ACHIEVEMENTS, COMMUNITY_SEED, RECOMMEND_RULES } = window.PLATFORM_DATA;

  // ============================================================
  // 一、状态层（localStorage 持久化）
  // ============================================================
  const STORE_KEY = 'lingua_state_v1';
  const ACCOUNTS_KEY = 'lingua_accounts_v1';
  const COMMUNITY_KEY = 'lingua_community_v1';

  /** 默认状态：每位用户独立的学习档案 */
  function defaultState() {
    return {
      name: '',
      currentLang: 'en',          // 当前学习语种
      onboarded: false,           // 是否完成推荐引导
      goal: '',                   // 学习目标 id
      pace: 'standard',           // 学习节奏 id
      xp: 0,
      streak: 0,
      lastStudyDate: '',          // YYYY-MM-DD
      perfectCount: 0,            // 满分练习次数
      studyDays: [],              // 学习日期集合（用于热力图与天数统计）
      // 进度：按 `${lang}:${unit}` 记录每节课的模块完成情况与得分
      progress: {},
      // 成就解锁
      achievements: []
    };
  }

  /** 读取当前用户状态 */
  function loadState() {
    try {
      const raw = localStorage.getItem(STORE_KEY);
      if (!raw) return defaultState();
      return Object.assign(defaultState(), JSON.parse(raw));
    } catch (e) {
      return defaultState();
    }
  }

  /** 持久化状态 */
  function saveState() {
    localStorage.setItem(STORE_KEY, JSON.stringify(state));
  }

  /** 读取账号库（注册用，明文仅作演示） */
  function loadAccounts() {
    try { return JSON.parse(localStorage.getItem(ACCOUNTS_KEY) || '{}'); }
    catch (e) { return {}; }
  }
  function saveAccounts(acc) {
    localStorage.setItem(ACCOUNTS_KEY, JSON.stringify(acc));
  }

  /** 读取社区话题（合并种子数据） */
  function loadCommunity() {
    try {
      const raw = localStorage.getItem(COMMUNITY_KEY);
      if (!raw) return COMMUNITY_SEED.slice();
      return JSON.parse(raw);
    } catch (e) { return COMMUNITY_SEED.slice(); }
  }
  function saveCommunity(list) {
    localStorage.setItem(COMMUNITY_KEY, JSON.stringify(list));
  }

  let state = loadState();
  let community = loadCommunity();

  // 当前会话账号（已登录）
  let sessionAccount = localStorage.getItem('lingua_session') || '';

  // ============================================================
  // 二、工具函数
  // ============================================================
  const $ = (sel, ctx = document) => ctx.querySelector(sel);
  const $$ = (sel, ctx = document) => Array.from(ctx.querySelectorAll(sel));

  /** 生成进度键 */
  function pKey(lang, unit) { return `${lang}:${unit}`; }

  /** 获取某节课的进度记录 */
  function getUnitProgress(lang, unit) {
    return state.progress[pKey(lang, unit)] || { modules: {}, score: 0 };
  }

  /** 标记某模块完成并返回是否全部完成 */
  function markModuleDone(lang, unit, module, score) {
    const key = pKey(lang, unit);
    const up = state.progress[key] || { modules: {}, score: 0 };
    up.modules[module] = true;
    // 累加得分（模块满分按比例计入）
    up.score = Math.min(100, up.score + (score || 0));
    state.progress[key] = up;
    return Object.keys(up.modules).length >= 4;
  }

  /** 计算某语种整体完成度（按模块完成比例，含部分进度） */
  function langCompletion(lang) {
    const units = COURSES[lang] || [];
    if (!units.length) return { pct: 0, done: 0, total: 0 };
    const totalModules = units.length * 4; // 每课 4 个模块
    let doneModules = 0;
    let doneUnits = 0;
    units.forEach(u => {
      const up = getUnitProgress(lang, u.unit);
      const modCount = Object.keys(up.modules).length;
      doneModules += modCount;
      if (modCount >= 4) doneUnits++;
    });
    return { pct: Math.round((doneModules / totalModules) * 100), done: doneUnits, total: units.length };
  }

  /** 获取今日日期串 */
  function todayStr() {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }

  /** 记录一次学习行为：连续天数 + 学习日集合 */
  function registerStudyActivity() {
    const today = todayStr();
    if (state.lastStudyDate !== today) {
      // 连续判断：上次是昨天则 +1，否则重置为 1
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const yStr = `${yesterday.getFullYear()}-${String(yesterday.getMonth() + 1).padStart(2, '0')}-${String(yesterday.getDate()).padStart(2, '0')}`;
      state.streak = (state.lastStudyDate === yStr) ? state.streak + 1 : 1;
      state.lastStudyDate = today;
    }
    if (!state.studyDays.includes(today)) {
      state.studyDays.push(today);
    }
  }

  /** 增加经验值 */
  function addXp(amount) {
    state.xp += amount;
  }

  /** 设置当前语种并同步主题色 */
  function setCurrentLang(lang) {
    state.currentLang = lang;
    applyAccent(lang);
    saveState();
  }

  /** 应用语种主题色到根变量 */
  function applyAccent(lang) {
    const meta = LANGUAGES[lang];
    if (!meta) return;
    document.documentElement.style.setProperty('--accent', meta.accent);
    document.documentElement.style.setProperty('--accent-soft', meta.accentSoft);
  }

  /** Toast 通知 */
  function toast(msg, type = 'default', icon) {
    const wrap = $('#toastWrap');
    const el = document.createElement('div');
    el.className = `toast ${type}`;
    const ic = icon || (type === 'success' ? '✓' : type === 'achievement' ? '✦' : '·');
    el.innerHTML = `<span class="t-ic">${ic}</span><span>${msg}</span>`;
    wrap.appendChild(el);
    setTimeout(() => {
      el.classList.add('out');
      setTimeout(() => el.remove(), 300);
    }, 3000);
  }

  /** 语音合成：朗读文本 */
  function speak(text, lang) {
    if (!('speechSynthesis' in window)) {
      toast('当前浏览器不支持语音合成', 'default', '!');
      return;
    }
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = LANGUAGES[lang]?.tts || 'en-US';
    u.rate = 0.9;
    u.pitch = 1;
    window.speechSynthesis.speak(u);
    return u;
  }

  // ============================================================
  // 三、认证（注册 / 登录）
  // ============================================================
  let authMode = 'login'; // login | register

  function openAuth(mode) {
    authMode = mode || 'login';
    const modal = $('#authModal');
    modal.classList.add('show');
    refreshAuthUI();
    $('#authAccount').focus();
  }
  function closeAuth() {
    $('#authModal').classList.remove('show');
    $('#authError').classList.remove('show');
    ['authName', 'authAccount', 'authPass'].forEach(id => $('#' + id).value = '');
  }
  function refreshAuthUI() {
    if (authMode === 'register') {
      $('#authTitle').innerHTML = '加入<em>语径</em>';
      $('#authSub').textContent = '创建账号，开启你的语言之旅';
      $('#nameField').style.display = 'block';
      $('#authSubmit').textContent = '注册并登录';
      $('#authSwitchText').textContent = '已有账号？';
      $('#authSwitch').textContent = '去登录';
    } else {
      $('#authTitle').innerHTML = '欢迎<em>回来</em>';
      $('#authSub').textContent = '登录以同步你的学习进度';
      $('#nameField').style.display = 'none';
      $('#authSubmit').textContent = '登录';
      $('#authSwitchText').textContent = '还没有账号？';
      $('#authSwitch').textContent = '立即注册';
    }
    // 切换模式时清除错误提示与已输入内容
    $('#authError').classList.remove('show');
  }
  function authError(msg) {
    const el = $('#authError');
    el.textContent = msg;
    el.classList.add('show');
  }

  function submitAuth() {
    const account = $('#authAccount').value.trim();
    const pass = $('#authPass').value;
    if (!account || !pass) { authError('请填写账号与密码'); return; }
    if (pass.length < 4) { authError('密码至少 4 位'); return; }
    const accounts = loadAccounts();

    if (authMode === 'register') {
      const name = $('#authName').value.trim() || account;
      if (accounts[account]) { authError('该账号已注册，请直接登录'); return; }
      accounts[account] = { pass, name };
      saveAccounts(accounts);
      // 新用户：写入默认状态并标记会话
      state = defaultState();
      state.name = name;
      saveState();
      sessionAccount = account;
      localStorage.setItem('lingua_session', account);
      closeAuth();
      toast(`欢迎加入，${name}！`, 'success', '✦');
      onLoginSuccess();
    } else {
      const rec = accounts[account];
      if (!rec) { authError('账号不存在，请先注册'); return; }
      if (rec.pass !== pass) { authError('密码不正确'); return; }
      // 登录：以账号为命名空间读取其状态
      sessionAccount = account;
      localStorage.setItem('lingua_session', account);
      // 尝试读取该账号专属状态
      const userStateKey = `lingua_state_${account}`;
      try {
        const raw = localStorage.getItem(userStateKey);
        state = raw ? Object.assign(defaultState(), JSON.parse(raw)) : Object.assign(defaultState(), { name: rec.name });
      } catch (e) {
        state = Object.assign(defaultState(), { name: rec.name });
      }
      // 重写 saveState 指向账号命名空间
      saveStateToAccount();
      closeAuth();
      toast(`欢迎回来，${state.name}`, 'success', '✓');
      onLoginSuccess();
    }
  }

  /** 将状态保存到当前账号命名空间（避免递归：直接写入对应键） */
  function saveStateToAccount() {
    if (sessionAccount) {
      // 已登录：写入该账号专属命名空间
      localStorage.setItem(`lingua_state_${sessionAccount}`, JSON.stringify(state));
    } else {
      // 未登录：写入匿名键
      localStorage.setItem(STORE_KEY, JSON.stringify(state));
    }
  }
  // 重写 saveState，使全局调用都落到账号命名空间
  saveState = saveStateToAccount;

  function logout() {
    sessionAccount = '';
    localStorage.removeItem('lingua_session');
    state = defaultState();
    localStorage.removeItem(STORE_KEY);
    refreshUserUI();
    toast('已退出登录');
    router.go('home');
  }

  function onLoginSuccess() {
    refreshUserUI();
    applyAccent(state.currentLang);
    // 若未完成引导，跳到推荐页
    if (!state.onboarded) {
      router.go('recommend');
    } else {
      router.go('dashboard');
    }
  }

  function isLoggedIn() { return !!sessionAccount; }

  /** 刷新顶部用户按钮显示 */
  function refreshUserUI() {
    const btn = $('#userBtn');
    const txt = $('#userBtnText');
    const av = $('#userAvatar');
    if (isLoggedIn()) {
      txt.style.display = 'none';
      av.style.display = 'grid';
      av.textContent = (state.name || 'U').charAt(0).toUpperCase();
      btn.title = `${state.name} · 点击退出`;
    } else {
      txt.style.display = 'inline';
      txt.textContent = '登录';
      av.style.display = 'none';
      btn.title = '点击登录';
    }
    $('#streakNum').textContent = state.streak;
  }

  // ============================================================
  // 四、路由
  // ============================================================
  const router = {
    current: 'home',
    go(view) {
      // 学习视图需要登录
      if (view === 'learn' && !isLoggedIn()) {
        toast('请先登录后开始学习');
        openAuth('login');
        return;
      }
      if (view === 'dashboard' && !isLoggedIn()) {
        openAuth('login');
        return;
      }
      this.current = view;
      window.location.hash = '#/' + view;
      render(view);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  function handleHash() {
    const hash = window.location.hash.replace('#/', '') || 'home';
    const valid = ['home', 'dashboard', 'courses', 'learn', 'recommend', 'community', 'achievements'];
    const view = valid.includes(hash) ? hash : 'home';
    router.current = view;
    render(view);
  }

  // ============================================================
  // 五、视图渲染总入口
  // ============================================================
  function render(view) {
    $$('.view').forEach(v => v.classList.toggle('active', v.dataset.view === view));
    $$('.nav-link').forEach(l => l.classList.toggle('active', l.dataset.nav === view));
    applyAccent(state.currentLang);

    switch (view) {
      case 'home':         renderHome(); break;
      case 'dashboard':    renderDashboard(); break;
      case 'courses':      renderCourses(); break;
      case 'learn':        renderLearn(); break;
      case 'recommend':    renderRecommend(); break;
      case 'community':    renderCommunity(); break;
      case 'achievements': renderAchievements(); break;
    }
  }

  // ============================================================
  // 六、首页
  // ============================================================
  function renderHome() {
    // 语种卡片堆叠
    const stack = $('#langStack');
    const langs = Object.values(LANGUAGES);
    stack.innerHTML = langs.map((l, i) => {
      const comp = langCompletion(l.code);
      return `
        <div class="lang-card" data-lang="${l.code}" style="color:${l.accent};">
          <div class="lc-top">
            <span class="lc-flag">${l.flag}</span>
            <span class="lc-native">${l.greeting}</span>
          </div>
          <div>
            <div class="lc-name">${l.name} <span style="color:var(--ink-mute);font-size:14px;">${l.nativeName}</span></div>
            <div class="lc-tag">${l.tagline}</div>
          </div>
          <div>
            <div class="lc-bar"><i style="width:${comp.pct}%"></i></div>
            <div style="font-size:11px;color:var(--ink-mute);margin-top:6px;font-family:var(--font-mono);">${comp.done}/${comp.total} 单元</div>
          </div>
        </div>`;
    }).join('');
    stack.querySelectorAll('.lang-card').forEach(card => {
      card.addEventListener('click', () => {
        setCurrentLang(card.dataset.lang);
        router.go('courses');
      });
    });

    // 模块入口
    const modules = [
      { id: 'vocab',    icon: '字', num: '01', title: '单词记忆', desc: '翻面卡片，语境中识记生词', meta: '闪卡 · 即时反馈' },
      { id: 'grammar',  icon: '文', num: '02', title: '语法练习', desc: '句型拆解配选择题巩固', meta: '选择 · 自动判分' },
      { id: 'listening',icon: '听', num: '03', title: '听力训练', desc: '真实场景对话与理解题', meta: '语音合成 · 听写' },
      { id: 'speaking', icon: '说', num: '04', title: '口语跟读', desc: '逐句跟读，攻克发音', meta: '录音 · 朗读提示' }
    ];
    $('#moduleGrid').innerHTML = modules.map(m => `
      <div class="module-card" data-module="${m.id}">
        <div class="mc-num">${m.num}</div>
        <div class="mc-icon">${m.icon}</div>
        <div class="mc-title">${m.title}</div>
        <div class="mc-desc">${m.desc}</div>
        <div class="mc-foot">
          <span>${m.meta}</span>
          <span class="mc-arrow">→</span>
        </div>
      </div>`).join('');
    $('#moduleGrid').querySelectorAll('.module-card').forEach(card => {
      card.addEventListener('click', () => {
        if (!isLoggedIn()) { openAuth('login'); return; }
        // 默认进入当前语种第一节未完成课的对应模块
        startLearn(state.currentLang, null, card.dataset.module);
      });
    });

    // 英雄区按钮
    $('#heroStart').onclick = () => {
      if (!isLoggedIn()) { openAuth('login'); return; }
      startLearn(state.currentLang, null, 'vocab');
    };
    $('#heroExplore').onclick = () => router.go('courses');
  }

  /** 启动学习：定位到合适的单元与模块 */
  function startLearn(lang, unit, module) {
    if (!isLoggedIn()) { openAuth('login'); return; }
    setCurrentLang(lang);
    let targetUnit = unit;
    if (!targetUnit) {
      // 找第一节未全部完成的课
      const units = COURSES[lang] || [];
      targetUnit = (units.find(u => Object.keys(getUnitProgress(lang, u.unit).modules).length < 4) || units[0]).unit;
    }
    learnCtx.lang = lang;
    learnCtx.unit = targetUnit;
    learnCtx.module = module || 'vocab';
    router.go('learn');
  }

  // ============================================================
  // 七、仪表盘
  // ============================================================
  function renderDashboard() {
    if (!isLoggedIn()) { openAuth('login'); return; }

    // 问候语按时段
    const h = new Date().getHours();
    const greet = h < 6 ? '深夜好' : h < 11 ? '早安' : h < 14 ? '午安' : h < 18 ? '下午好' : '晚上好';
    $('#dashGreet').innerHTML = `${greet}，<em>${state.name || '同学'}</em>`;

    const lang = state.currentLang;
    const meta = LANGUAGES[lang];
    $('#dashLangTag').textContent = `${meta.name} · ${meta.flag}`;

    // 进度环
    const comp = langCompletion(lang);
    const circumference = 2 * Math.PI * 52; // r=52
    const offset = circumference * (1 - comp.pct / 100);
    $('#ringFg').setAttribute('stroke-dasharray', circumference.toFixed(1));
    $('#ringFg').setAttribute('stroke-dashoffset', offset.toFixed(1));
    $('#ringPct').textContent = comp.pct;
    $('#rmTitle').textContent = `${meta.name} · 整体完成度`;
    $('#rmSub').textContent = `已完成 ${comp.done} / ${comp.total} 个单元`;
    $('#rmLessons').textContent = comp.done;
    $('#rmXp').textContent = state.xp;
    $('#rmDays').textContent = state.studyDays.length;

    // 技能均衡度：统计各模块完成数
    const skillCount = { vocab: 0, grammar: 0, listening: 0, speaking: 0 };
    Object.entries(state.progress).forEach(([key, up]) => {
      if (!key.startsWith(lang + ':')) return;
      Object.keys(up.modules).forEach(m => { if (skillCount[m] !== undefined) skillCount[m]++; });
    });
    const totalUnits = (COURSES[lang] || []).length || 1;
    const skills = [
      { id: 'vocab',     label: '词汇 · 单词记忆' },
      { id: 'grammar',   label: '语法 · 句型练习' },
      { id: 'listening', label: '听力 · 听辨理解' },
      { id: 'speaking',  label: '口语 · 跟读表达' }
    ];
    $('#skillList').innerHTML = skills.map(s => {
      const pct = Math.round((skillCount[s.id] / totalUnits) * 100);
      return `
        <div class="skill-row">
          <div class="sr-top"><span class="lbl">${s.label}</span><span class="val">${skillCount[s.id]}/${totalUnits}</span></div>
          <div class="skill-bar"><i style="width:${pct}%"></i></div>
        </div>`;
    }).join('');

    // 本周打卡
    const weekDays = ['一', '二', '三', '四', '五', '六', '日'];
    const today = new Date();
    const dayIdx = (today.getDay() + 6) % 7; // 周一为 0
    const weekStudy = weekDays.map((d, i) => {
      const date = new Date(today);
      date.setDate(today.getDate() - (dayIdx - i));
      const dStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
      const done = state.studyDays.includes(dStr);
      const isToday = dStr === todayStr();
      return { d, done, isToday };
    });
    $('#streakBoard').innerHTML = weekStudy.map(w => `
      <div class="streak-day ${w.done ? 'done' : ''} ${w.isToday ? 'today' : ''}">${w.d}</div>
    `).join('');
    const weekDone = weekStudy.filter(w => w.done).length;
    $('#weekStreak').textContent = `${weekDone}/7`;

    // 热力图：近 14 天（按 2 行 7 列，这里用 14 列单行）
    const heatCells = [];
    for (let i = 13; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(today.getDate() - i);
      const dStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
      const studied = state.studyDays.includes(dStr);
      // 用随机等级模拟强度（已学习则有强度）
      const level = studied ? (Math.random() > 0.5 ? 3 : 2) : 0;
      heatCells.push(level);
    }
    $('#heatmap').innerHTML = heatCells.map(l => `<div class="cell ${l ? 'l' + l : ''}"></div>`).join('');
  }

  // ============================================================
  // 八、课程浏览
  // ============================================================
  let courseView = { lang: state.currentLang, level: '' };

  function renderCourses() {
    courseView.lang = state.currentLang;
    const lang = courseView.lang;
    const meta = LANGUAGES[lang];

    // 语种切换
    $('#langTabs').innerHTML = Object.values(LANGUAGES).map(l => {
      const count = (COURSES[l.code] || []).length;
      return `
        <div class="lang-tab ${l.code === lang ? 'active' : ''}" data-lang="${l.code}">
          <span class="dot" style="background:${l.accent}"></span>
          ${l.name}
          <span class="count">${count} 课</span>
        </div>`;
    }).join('');
    $$('#langTabs .lang-tab').forEach(t => {
      t.onclick = () => {
        setCurrentLang(t.dataset.lang);
        courseView.lang = t.dataset.lang;
        courseView.level = '';
        renderCourses();
      };
    });

    // 等级轴
    const levels = meta.levels;
    if (!courseView.level) courseView.level = levels[0];
    $('#levelRail').innerHTML = levels.map(lv => {
      const lm = LEVEL_META[lv];
      // 该等级下是否有完成的课
      const hasDone = (COURSES[lang] || []).some(u => u.level === lv && Object.keys(getUnitProgress(lang, u.unit).modules).length >= 4);
      return `
        <div class="level-node ${lv === courseView.level ? 'active' : ''} ${hasDone ? 'done' : ''}" data-level="${lv}">
          <div class="ln-code">${lv}</div>
          <div class="ln-circle"><span>${lv}</span></div>
          <div class="ln-name">${lm?.name || ''}</div>
          <div class="ln-hours">${lm?.ceHours || ''}</div>
        </div>`;
    }).join('');
    $$('#levelRail .level-node').forEach(n => {
      n.onclick = () => { courseView.level = n.dataset.level; renderCourses(); };
    });

    // 单元列表
    const units = (COURSES[lang] || []).filter(u => u.level === courseView.level);
    const listEl = $('#unitList');
    if (!units.length) {
      listEl.innerHTML = `<div style="text-align:center;padding:60px 0;color:var(--ink-mute);">
        <div style="font-family:var(--font-display);font-size:48px;color:var(--line);margin-bottom:12px;">∅</div>
        该等级课程正在打磨中，敬请期待。
      </div>`;
      return;
    }
    listEl.innerHTML = units.map(u => {
      const up = getUnitProgress(lang, u.unit);
      const modCount = Object.keys(up.modules).length;
      const done = modCount >= 4;
      const pct = Math.round((modCount / 4) * 100);
      return `
        <div class="unit-row ${done ? 'done' : ''}" data-unit="${u.unit}">
          <div class="unit-num">${String(u.unit).padStart(2, '0')}</div>
          <div class="unit-info">
            <h4>${u.title}</h4>
            <div class="unit-sub">${u.subtitle}</div>
            <div class="unit-focus">重点 · ${u.focus}</div>
          </div>
          <div class="unit-cta">
            <div class="progress-mini"><i style="width:${pct}%"></i></div>
            <span>${done ? '复习' : modCount > 0 ? '继续' : '开始'} →</span>
          </div>
        </div>`;
    }).join('');
    $$('#unitList .unit-row').forEach(r => {
      r.onclick = () => startLearn(lang, parseInt(r.dataset.unit), 'vocab');
    });
  }

  // ============================================================
  // 九、互动学习
  // ============================================================
  const learnCtx = { lang: 'en', unit: 1, module: 'vocab' };
  // 模块顺序
  const MODULE_ORDER = ['vocab', 'grammar', 'listening', 'speaking'];
  const MODULE_META = {
    vocab:     { name: '单词记忆', icon: '字' },
    grammar:   { name: '语法练习', icon: '文' },
    listening: { name: '听力训练', icon: '听' },
    speaking:  { name: '口语跟读', icon: '说' }
  };

  function renderLearn() {
    if (!isLoggedIn()) { openAuth('login'); return; }
    const unit = (COURSES[learnCtx.lang] || []).find(u => u.unit === learnCtx.unit);
    if (!unit) { router.go('courses'); return; }

    // 侧边导航
    const up = getUnitProgress(learnCtx.lang, learnCtx.unit);
    $('#learnSide').innerHTML = `
      <a class="ls-back" id="lsBack">← 返回课程</a>
      <div class="ls-title">${unit.title}</div>
      <div style="font-size:12px;color:var(--ink-mute);margin-bottom:18px;font-family:var(--font-mono);">
        ${LANGUAGES[learnCtx.lang].name} · ${unit.level}
      </div>
      <div class="learn-nav">
        ${MODULE_ORDER.map(m => `
          <div class="ln-items ${m === learnCtx.module ? 'active' : ''} ${up.modules[m] ? 'done' : ''}" data-module="${m}">
            <span class="ln-ic">${MODULE_META[m].icon}</span>
            <span>${MODULE_META[m].name}</span>
          </div>`).join('')}
      </div>
      <div style="margin-top:24px;padding-top:18px;border-top:1px dashed var(--line);font-size:12px;color:var(--ink-mute);">
        本课得分：<b style="color:var(--accent);font-family:var(--font-display);font-size:18px;">${up.score}</b>/100
      </div>
    `;
    $('#lsBack').onclick = () => router.go('courses');
    $$('#learnSide .ln-items').forEach(el => {
      el.onclick = () => { learnCtx.module = el.dataset.module; renderLearn(); };
    });

    // 主内容按模块分发
    const main = $('#learnMain');
    switch (learnCtx.module) {
      case 'vocab':     main.innerHTML = renderVocab(unit); bindVocab(unit); break;
      case 'grammar':   main.innerHTML = renderGrammar(unit); bindGrammar(unit); break;
      case 'listening': main.innerHTML = renderListening(unit); bindListening(unit); break;
      case 'speaking':  main.innerHTML = renderSpeaking(unit); bindSpeaking(unit); break;
    }
  }

  // —— 单词记忆模块 ——
  function renderVocab(unit) {
    const words = unit.vocab;
    return `
      <div class="learn-head">
        <div class="lh-title">单词记忆<small>${words.length} 个核心词 · 点击卡片翻面</small></div>
        <div class="learn-dots" id="vocabDots">
          ${words.map((_, i) => `<span class="dot ${i === 0 ? 'active' : ''}"></span>`).join('')}
        </div>
      </div>
      <div class="flash-stage">
        <div class="flash-card" id="flashCard">
          <div class="flash-inner" id="flashInner">
            <div class="flash-face flash-front">
              <div class="flash-word" id="flashWord">${words[0].word}</div>
              <div class="flash-phon" id="flashPhon">${words[0].phonetic}</div>
              <div class="flash-hint">点击查看释义 ·  朗读</div>
            </div>
            <div class="flash-face flash-back">
              <div class="flash-meaning" id="flashMeaning">${words[0].meaning}</div>
              <div class="flash-eg" id="flashEg">${words[0].example}</div>
              <div class="flash-eg-zh" id="flashEgZh">${words[0].exampleZh}</div>
            </div>
          </div>
        </div>
        <div class="flash-controls">
          <button class="btn-icon" id="flashSpeak" title="朗读">♪</button>
          <button class="flash-known" id="flashKnown">已记住，下一个</button>
          <button class="btn-icon" id="flashPrev" title="上一个">‹</button>
        </div>
      </div>
    `;
  }
  function bindVocab(unit) {
    const words = unit.vocab;
    let idx = 0;
    const inner = $('#flashInner');
    const dots = $$('#vocabDots .dot');

    function update() {
      const w = words[idx];
      $('#flashWord').textContent = w.word;
      $('#flashPhon').textContent = w.phonetic;
      $('#flashMeaning').textContent = w.meaning;
      $('#flashEg').textContent = w.example;
      $('#flashEgZh').textContent = w.exampleZh;
      inner.classList.remove('flip');
      dots.forEach((d, i) => d.classList.toggle('active', i === idx));
    }

    // 翻面
    $('#flashCard').onclick = () => inner.classList.toggle('flip');
    // 朗读
    $('#flashSpeak').onclick = (e) => { e.stopPropagation(); speak(words[idx].word + '. ' + words[idx].example, learnCtx.lang); };
    // 上一个
    $('#flashPrev').onclick = (e) => { e.stopPropagation(); if (idx > 0) { idx--; update(); } };
    // 已记住
    $('#flashKnown').onclick = (e) => {
      e.stopPropagation();
      if (idx < words.length - 1) {
        idx++;
        update();
      } else {
        // 全部完成
        completeModule('vocab', 25);
      }
    };
  }

  // —— 语法练习模块 ——
  function renderGrammar(unit) {
    const blocks = unit.grammar;
    // 为每个语法点生成一道选择题（基于 examples）
    const quizzes = blocks.map((g, gi) => {
      // 用 example 的中文翻译作为题干，让用户选择正确英文/日文/韩文例句
      const exIdx = Math.floor(Math.random() * g.examples.length);
      const correct = g.examples[exIdx];
      // 从其它语法点或同点其它例句构造干扰项
      const distractors = [];
      const pool = blocks.flatMap(b => b.examples).filter(e => e !== correct);
      while (distractors.length < 3 && pool.length) {
        const pick = pool.splice(Math.floor(Math.random() * pool.length), 1)[0];
        if (!distractors.includes(pick)) distractors.push(pick);
      }
      const options = [correct, ...distractors].sort(() => Math.random() - 0.5);
      return { g, gi, prompt: `下列哪句符合「${g.title}」？`, options, answer: options.indexOf(correct) };
    });

    const html = `
      <div class="learn-head">
        <div class="lh-title">语法练习<small>${quizzes.length} 道题 · 选择正确选项</small></div>
        <div class="learn-dots" id="gramDots">
          ${quizzes.map((_, i) => `<span class="dot ${i === 0 ? 'active' : ''}"></span>`).join('')}
        </div>
      </div>
      <div id="gramStage"></div>
    `;
    // 暂存 quizzes 到 dataset
    setTimeout(() => {
      $('#gramStage').dataset.quizzes = JSON.stringify(quizzes.map(q => ({ ...q, g: undefined })));
      renderGramQuestion(0, 0);
    }, 0);
    return html;
  }
  function renderGramQuestion(qIdx, correctCount) {
    const stage = $('#gramStage');
    const quizzes = JSON.parse(stage.dataset.quizzes);
    if (qIdx >= quizzes.length) {
      // 完成
      const score = Math.round((correctCount / quizzes.length) * 25);
      completeModule('grammar', score);
      return;
    }
    const q = quizzes[qIdx];
    $$('#gramDots .dot').forEach((d, i) => d.classList.toggle('active', i === qIdx));
    stage.innerHTML = `
      <div class="quiz-q">${qIdx + 1}. ${q.prompt}</div>
      <div class="quiz-opts" id="gramOpts">
        ${q.options.map((opt, i) => `
          <div class="quiz-opt" data-i="${i}">
            <span class="qo-key">${String.fromCharCode(65 + i)}</span>
            <span>${opt}</span>
          </div>`).join('')}
      </div>
    `;
    $$('#gramOpts .quiz-opt').forEach(opt => {
      opt.onclick = () => {
        const chosen = parseInt(opt.dataset.i);
        const isCorrect = chosen === q.answer;
        // 标记所有选项
        $$('#gramOpts .quiz-opt').forEach(o => {
          o.classList.add('disabled');
          const oi = parseInt(o.dataset.i);
          if (oi === q.answer) o.classList.add('correct');
          else if (oi === chosen) o.classList.add('wrong');
        });
        const newCount = correctCount + (isCorrect ? 1 : 0);
        setTimeout(() => renderGramQuestion(qIdx + 1, newCount), 1100);
      };
    });
  }
  function bindGrammar(unit) { /* 绑定在渲染内完成 */ }

  // —— 听力训练模块 ——
  function renderListening(unit) {
    const li = unit.listening;
    return `
      <div class="learn-head">
        <div class="lh-title">听力训练<small>${li.title} · 点击播放后作答</small></div>
        <div class="learn-dots" id="listenDots">
          ${li.questions.map((_, i) => `<span class="dot ${i === 0 ? 'active' : ''}"></span>`).join('')}
        </div>
      </div>
      <div class="listen-player">
        <button class="play-btn" id="listenPlay">▶</button>
        <div class="listen-title">${li.title}</div>
        <div class="listen-meta">语种：${LANGUAGES[learnCtx.lang].name} · 约 ${Math.ceil(li.audioText.length / 12)} 秒</div>
        <div class="wave-bars" id="waveBars">
          ${Array(10).fill('<i></i>').join('')}
        </div>
      </div>
      <div class="transcript-box" id="transcriptBox" style="display:none;">
        <strong>原文参考：</strong>${li.transcript}
      </div>
      <div id="listenQuestions">
        ${li.questions.map((q, qi) => `
          <div class="quiz-q" style="margin-bottom:14px;">${qi + 1}. ${q.q}</div>
          <div class="quiz-opts" data-qi="${qi}">
            ${q.options.map((opt, i) => `
              <div class="quiz-opt" data-i="${i}">
                <span class="qo-key">${String.fromCharCode(65 + i)}</span>
                <span>${opt}</span>
              </div>`).join('')}
          </div>`).join('')}
      </div>
      <div style="margin-top:24px;display:flex;gap:12px;">
        <button class="btn btn-ghost" id="listenTranscript">显示原文</button>
        <button class="btn btn-primary" id="listenSubmit" style="margin-left:auto;">提交答案</button>
      </div>
    `;
  }
  function bindListening(unit) {
    const li = unit.listening;
    let answered = new Array(li.questions.length).fill(null);
    const playBtn = $('#listenPlay');
    const wave = $('#waveBars');

    playBtn.onclick = () => {
      const u = speak(li.audioText, learnCtx.lang);
      if (!u) return;
      playBtn.classList.add('playing');
      wave.classList.add('active');
      playBtn.textContent = '■';
      u.onend = () => {
        playBtn.classList.remove('playing');
        wave.classList.remove('active');
        playBtn.textContent = '▶';
      };
    };

    $('#listenTranscript').onclick = () => {
      const box = $('#transcriptBox');
      box.style.display = box.style.display === 'none' ? 'block' : 'none';
    };

    $$('#listenQuestions .quiz-opts').forEach(group => {
      const qi = parseInt(group.dataset.qi);
      group.querySelectorAll('.quiz-opt').forEach(opt => {
        opt.onclick = () => {
          if (group.querySelector('.correct')) return; // 已答
          const chosen = parseInt(opt.dataset.i);
          answered[qi] = chosen;
          group.querySelectorAll('.quiz-opt').forEach(o => {
            o.classList.add('disabled');
            const oi = parseInt(o.dataset.i);
            if (oi === li.questions[qi].answer) o.classList.add('correct');
            else if (oi === chosen) o.classList.add('wrong');
          });
        };
      });
    });

    $('#listenSubmit').onclick = () => {
      const correct = answered.filter((a, i) => a === li.questions[i].answer).length;
      const allAnswered = answered.every(a => a !== null);
      if (!allAnswered) { toast('请先完成所有题目', 'default', '!'); return; }
      const score = Math.round((correct / li.questions.length) * 25);
      completeModule('listening', score);
    };
  }

  // —— 口语跟读模块 ——
  function renderSpeaking(unit) {
    const phrases = unit.speaking;
    return `
      <div class="learn-head">
        <div class="lh-title">口语跟读<small>${phrases.length} 句 · 跟读并对比</small></div>
        <div class="learn-dots" id="speakDots">
          ${phrases.map((_, i) => `<span class="dot ${i === 0 ? 'active' : ''}"></span>`).join('')}
        </div>
      </div>
      <div id="speakStage"></div>
    `;
  }
  function bindSpeaking(unit) {
    const phrases = unit.speaking;
    let idx = 0;
    const stage = $('#speakStage');
    const dots = $$('#speakDots .dot');

    function update() {
      const p = phrases[idx];
      dots.forEach((d, i) => d.classList.toggle('active', i === idx));
      stage.innerHTML = `
        <div class="speak-card">
          <div class="speak-phrase">${p.phrase}</div>
          <div class="speak-translation">${p.translation}</div>
          <div class="speak-tip">提示 · ${p.tip}</div>
          <div class="speak-actions">
            <button class="speak-mic" id="speakPlay" title="示范朗读">♪</button>
            <button class="speak-mic" id="speakRecord" title="按住跟读（模拟录音）">●</button>
          </div>
          <div id="speakFeedback" style="margin-top:18px;font-size:13px;color:var(--ink-mute);min-height:20px;"></div>
        </div>
        <div style="display:flex;justify-content:space-between;margin-top:16px;">
          <button class="btn btn-ghost" id="speakPrev" ${idx === 0 ? 'disabled style="opacity:.4;"' : ''}>上一句</button>
          <button class="btn btn-primary" id="speakNext">${idx === phrases.length - 1 ? '完成模块' : '下一句'}</button>
        </div>
      `;
      $('#speakPlay').onclick = () => speak(p.phrase, learnCtx.lang);
      // 录音：使用浏览器 getUserMedia（若不可用则模拟）
      const recBtn = $('#speakRecord');
      let mediaRecorder = null;
      let chunks = [];
      recBtn.onclick = async () => {
        if (recBtn.classList.contains('recording')) {
          recBtn.classList.remove('recording');
          if (mediaRecorder && mediaRecorder.state !== 'inactive') mediaRecorder.stop();
          return;
        }
        // 尝试真实录音
        if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
          try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            mediaRecorder = new MediaRecorder(stream);
            chunks = [];
            mediaRecorder.ondataavailable = e => chunks.push(e.data);
            mediaRecorder.onstop = () => {
              stream.getTracks().forEach(t => t.stop());
              $('#speakFeedback').innerHTML = '✓ 已录下你的跟读，可对比示范朗读再练一次';
              $('#speakFeedback').style.color = 'var(--success)';
            };
            mediaRecorder.start();
            recBtn.classList.add('recording');
            $('#speakFeedback').textContent = '正在录音…再次点击结束';
            $('#speakFeedback').style.color = 'var(--danger)';
          } catch (e) {
            // 权限拒绝：模拟
            simulateRecord(recBtn);
          }
        } else {
          simulateRecord(recBtn);
        }
      };
      $('#speakPrev').onclick = () => { if (idx > 0) { idx--; update(); } };
      $('#speakNext').onclick = () => {
        if (idx < phrases.length - 1) { idx++; update(); }
        else { completeModule('speaking', 25); }
      };
    }

    function simulateRecord(recBtn) {
      recBtn.classList.add('recording');
      $('#speakFeedback').textContent = '正在录音（模拟）…';
      $('#speakFeedback').style.color = 'var(--danger)';
      setTimeout(() => {
        recBtn.classList.remove('recording');
        $('#speakFeedback').innerHTML = '✓ 已模拟跟读完成，建议多听示范对比发音';
        $('#speakFeedback').style.color = 'var(--success)';
      }, 1800);
    }

    update();
  }

  /** 模块完成统一处理：记录进度、经验、成就 */
  function completeModule(module, score) {
    registerStudyActivity();
    const allDone = markModuleDone(learnCtx.lang, learnCtx.unit, module, score);
    addXp(score);
    saveState();

    // 渲染完成总结
    const main = $('#learnMain');
    main.innerHTML = `
      <div class="module-summary">
        <div class="ms-icon">${MODULE_META[module].icon}</div>
        <div class="ms-title">${MODULE_META[module].name}完成！</div>
        <div class="ms-sub">${LANGUAGES[learnCtx.lang].name} · 第 ${learnCtx.unit} 课</div>
        <div class="ms-xp">+${score} XP</div>
        <div class="summary-actions">
          ${allDone ? `<button class="btn btn-accent" id="goNextUnit">进入下一课</button>` : ''}
          <button class="btn btn-ghost" id="goUnitHome">回到本课</button>
          <button class="btn btn-primary" id="goDash">查看进度</button>
        </div>
      </div>
    `;
    toast(`+${score} 经验！${MODULE_META[module].name}完成`, 'success', '✦');

    // 检查成就
    checkAchievements();

    if (allDone) {
      $('#goNextUnit') && ($('#goNextUnit').onclick = () => {
        const units = COURSES[learnCtx.lang];
        const idx = units.findIndex(u => u.unit === learnCtx.unit);
        const next = units[idx + 1];
        if (next) { learnCtx.unit = next.unit; learnCtx.module = 'vocab'; renderLearn(); }
        else { toast('已是本语种最后一课，期待新内容上线'); router.go('dashboard'); }
      });
    }
    $('#goUnitHome').onclick = () => renderLearn();
    $('#goDash').onclick = () => router.go('dashboard');
    refreshUserUI();
  }

  // ============================================================
  // 十、个性化推荐
  // ============================================================
  let recoStep = 0; // 0:目标 1:节奏 2:结果
  let recoChoices = { goal: '', pace: 'standard' };

  function renderRecommend() {
    const container = $('#recoContainer');
    if (state.onboarded && state.goal) {
      // 已引导过：直接展示推荐路径
      renderRecoResult(container);
      return;
    }
    if (recoStep === 0) {
      container.innerHTML = `
        <div class="reco-onboard">
          <div class="onboard-step">第 1 / 2 步</div>
          <div class="onboard-q">你学习语言，主要是为了？</div>
          <div class="choice-grid" id="goalChoices">
            ${RECOMMEND_RULES.goals.map(g => `
              <div class="choice ${recoChoices.goal === g.id ? 'selected' : ''}" data-id="${g.id}">
                <div class="ch-ic">${g.icon}</div>
                <div class="ch-label">${g.label}</div>
                <div class="ch-desc">${g.desc}</div>
              </div>`).join('')}
          </div>
          <div class="onboard-foot">
            <span></span>
            <button class="btn btn-primary" id="recoNext" ${!recoChoices.goal ? 'disabled style="opacity:.4;"' : ''}>下一步</button>
          </div>
        </div>
      `;
      $$('#goalChoices .choice').forEach(c => {
        c.onclick = () => {
          recoChoices.goal = c.dataset.id;
          renderRecommend();
        };
      });
      $('#recoNext') && ($('#recoNext').onclick = () => { recoStep = 1; renderRecommend(); });
    } else if (recoStep === 1) {
      container.innerHTML = `
        <div class="reco-onboard">
          <div class="onboard-step">第 2 / 2 步</div>
          <div class="onboard-q">每天能投入多少时间？</div>
          <div class="choice-grid" id="paceChoices">
            ${RECOMMEND_RULES.paces.map(p => `
              <div class="choice ${recoChoices.pace === p.id ? 'selected' : ''}" data-id="${p.id}">
                <div class="ch-ic">${p.minutes}</div>
                <div class="ch-label">${p.label}</div>
                <div class="ch-desc">${p.desc}</div>
              </div>`).join('')}
          </div>
          <div class="onboard-foot">
            <button class="btn btn-ghost" id="recoPrev">上一步</button>
            <button class="btn btn-primary" id="recoGen">生成路径</button>
          </div>
        </div>
      `;
      $$('#paceChoices .choice').forEach(c => {
        c.onclick = () => { recoChoices.pace = c.dataset.id; renderRecommend(); };
      });
      $('#recoPrev').onclick = () => { recoStep = 0; renderRecommend(); };
      $('#recoGen').onclick = () => {
        state.goal = recoChoices.goal;
        state.pace = recoChoices.pace;
        state.onboarded = true;
        saveState();
        renderRecommend();
        toast('专属学习路径已生成', 'success', '✦');
      };
    }
  }

  function renderRecoResult(container) {
    const goal = RECOMMEND_RULES.goals.find(g => g.id === state.goal) || RECOMMEND_RULES.goals[0];
    const pace = RECOMMEND_RULES.paces.find(p => p.id === state.pace) || RECOMMEND_RULES.paces[1];

    // 根据目标推荐语种与起始模块
    let recos = [];
    if (state.goal === 'culture') {
      recos = [
        { lang: 'ja', reason: '动漫、文学、影视资源丰富，与文化兴趣高度契合', modules: ['listening', 'speaking', 'vocab'] },
        { lang: 'ko', reason: '韩剧、K-pop 与综艺，沉浸式语料触手可及', modules: ['listening', 'speaking', 'grammar'] }
      ];
    } else if (state.goal === 'travel') {
      recos = [
        { lang: 'en', reason: '通用语，覆盖大多数旅行目的地', modules: ['vocab', 'listening', 'speaking'] },
        { lang: 'ja', reason: '日本旅行高频场景：问路、购物、点餐', modules: ['vocab', 'speaking', 'listening'] }
      ];
    } else if (state.goal === 'work') {
      recos = [
        { lang: 'en', reason: '职场通用语，邮件、会议、汇报必备', modules: ['grammar', 'vocab', 'speaking'] }
      ];
    } else if (state.goal === 'exam') {
      recos = [
        { lang: 'en', reason: '对标 CEFR，体系最完整', modules: ['grammar', 'vocab', 'listening', 'speaking'] },
        { lang: 'ja', reason: '对标 JLPT，分级清晰', modules: ['vocab', 'grammar', 'listening'] },
        { lang: 'ko', reason: '对标 TOPIK，循序渐进', modules: ['vocab', 'grammar', 'listening'] }
      ];
    } else { // social
      recos = [
        { lang: 'ko', reason: '流行表达与社交语境丰富', modules: ['speaking', 'listening', 'vocab'] },
        { lang: 'en', reason: '国际社交通用语', modules: ['speaking', 'vocab', 'listening'] }
      ];
    }

    // 找到每个推荐语种的当前进度
    const cards = recos.map((r, i) => {
      const meta = LANGUAGES[r.lang];
      const comp = langCompletion(r.lang);
      const units = COURSES[r.lang] || [];
      const firstUndone = units.find(u => Object.keys(getUnitProgress(r.lang, u.unit).modules).length < 4) || units[0];
      const steps = r.modules.map((m, mi) => ({
        title: MODULE_META[m].name,
        desc: mi === 0 ? `从「${firstUndone?.title || '第一课'}」开始` : '巩固上一模块后继续'
      }));
      return `
        <div class="path-card ${i === 0 ? 'featured' : ''}">
          <h3>${meta.name} <span style="color:var(--ink-mute);font-size:16px;">${meta.nativeName}</span></h3>
          <div class="pc-tag">${r.reason} · 每日约 ${pace.minutes} 分钟</div>
          <div class="path-steps">
            ${steps.map((s, si) => `
              <div class="path-step">
                <div class="ps-num">${si + 1}</div>
                <div>
                  <div class="ps-title">${s.title}</div>
                  <div class="ps-desc">${s.desc}</div>
                </div>
              </div>`).join('')}
          </div>
          <button class="btn ${i === 0 ? 'btn-accent' : 'btn-ghost'}" data-lang="${r.lang}" data-unit="${firstUndone?.unit}" data-module="${r.modules[0]}">
            ${comp.done > 0 ? `继续学习（已完成 ${comp.done}/${comp.total}）` : '开始这条路径'}
          </button>
        </div>
      `;
    }).join('');

    container.innerHTML = `
      <div style="margin-bottom:28px;padding:20px 24px;background:var(--paper-soft);border:1px solid var(--line);border-radius:var(--r-md);display:flex;align-items:center;gap:18px;flex-wrap:wrap;">
        <div style="font-family:var(--font-display);font-size:18px;">你的画像：</div>
        <span class="topic-tag">${goal.icon} ${goal.label}</span>
        <span class="topic-tag">${pace.label} · ${pace.minutes} 分钟/天</span>
        <button class="btn btn-ghost" id="recoRedo" style="margin-left:auto;">重新评估</button>
      </div>
      <div class="reco-result">${cards}</div>
    `;
    container.querySelectorAll('[data-lang]').forEach(btn => {
      btn.onclick = () => startLearn(btn.dataset.lang, parseInt(btn.dataset.unit), btn.dataset.module);
    });
    $('#recoRedo').onclick = () => {
      state.onboarded = false;
      state.goal = '';
      saveState();
      recoStep = 0;
      renderRecommend();
    };
  }

  // ============================================================
  // 十一、社区
  // ============================================================
  function renderCommunity() {
    renderTopicList();
    renderContribList();

    $('#postBtn').onclick = () => {
      const text = $('#postInput').value.trim();
      if (!text) { toast('请输入内容后再发布'); return; }
      if (!isLoggedIn()) { openAuth('login'); return; }
      const lang = $('#postLang').value;
      const topic = {
        id: 'u' + Date.now(),
        author: state.name || '我',
        avatar: LANGUAGES[state.currentLang].accent,
        lang,
        tag: '学习心得',
        title: text.length > 24 ? text.slice(0, 24) + '…' : text,
        excerpt: text,
        likes: 0, replies: 0,
        time: '刚刚'
      };
      community.unshift(topic);
      saveCommunity(community);
      $('#postInput').value = '';
      addXp(5); saveState();
      toast('发布成功 +5 经验', 'success', '✦');
      renderTopicList();
      checkAchievements();
      refreshUserUI();
    };
  }

  function renderTopicList() {
    $('#topicList').innerHTML = community.map(t => {
      const langMeta = LANGUAGES[t.lang] || { name: '综合', accent: 'var(--ink)' };
      return `
        <div class="topic-card" data-id="${t.id}">
          <div class="topic-head">
            <div class="topic-avatar" style="background:${t.avatar}">${t.author.charAt(0)}</div>
            <div>
              <div class="topic-author">${t.author}</div>
              <div class="topic-time">${t.time}</div>
            </div>
            <div class="topic-tags">
              <span class="topic-tag lang">${langMeta.name}</span>
              <span class="topic-tag">${t.tag}</span>
            </div>
          </div>
          <div class="topic-title">${t.title}</div>
          <div class="topic-excerpt">${t.excerpt}</div>
          <div class="topic-foot">
            <span class="${t.liked ? 'liked' : ''}" data-act="like">♥ ${t.likes}</span>
            <span data-act="reply">💬 ${t.replies}</span>
            <span data-act="share">↗ 分享</span>
          </div>
        </div>
      `;
    }).join('');
    $$('#topicList .topic-card').forEach(card => {
      const id = card.dataset.id;
      card.querySelector('[data-act="like"]').onclick = (e) => {
        e.stopPropagation();
        const t = community.find(x => x.id === id);
        if (!t) return;
        if (t.liked) { t.likes--; t.liked = false; }
        else { t.likes++; t.liked = true; }
        saveCommunity(community);
        renderTopicList();
      };
      card.querySelector('[data-act="reply"]').onclick = (e) => {
        e.stopPropagation();
        const t = community.find(x => x.id === id);
        if (t) { t.replies++; saveCommunity(community); toast('已加入讨论'); renderTopicList(); }
      };
      card.querySelector('[data-act="share"]').onclick = (e) => {
        e.stopPropagation();
        toast('链接已复制（演示）');
      };
    });
  }

  function renderContribList() {
    // 用社区数据 + 当前用户模拟贡献榜
    const map = {};
    community.forEach(t => {
      map[t.author] = map[t.author] || { name: t.author, avatar: t.avatar, xp: 0 };
      map[t.author].xp += t.likes + t.replies * 2;
    });
    if (isLoggedIn()) {
      map[state.name || '我'] = map[state.name || '我'] || { name: state.name || '我', avatar: LANGUAGES[state.currentLang].accent, xp: 0 };
      map[state.name || '我'].xp += state.xp;
    }
    const list = Object.values(map).sort((a, b) => b.xp - a.xp).slice(0, 6);
    $('#contribList').innerHTML = list.map((c, i) => `
      <div class="contrib-row">
        <span class="rank ${i < 3 ? 'top' : ''}">${i + 1}</span>
        <span class="contrib-avatar" style="background:${c.avatar}">${c.name.charAt(0)}</span>
        <span class="contrib-name">${c.name}${c.name === (state.name || '我') ? '（我）' : ''}</span>
        <span class="contrib-xp">${c.xp} XP</span>
      </div>
    `).join('');
  }

  // ============================================================
  // 十二、成就
  // ============================================================
  function renderAchievements() {
    const unlocked = new Set(state.achievements);
    $('#badgeGrid').innerHTML = ACHIEVEMENTS.map(a => `
      <div class="badge ${unlocked.has(a.id) ? 'unlocked' : 'locked'}" data-id="${a.id}">
        <div class="b-icon">${a.icon}</div>
        <div class="b-name">${a.name}</div>
        <div style="font-size:11px;color:var(--ink-mute);margin-top:4px;">${a.desc}</div>
      </div>
    `).join('');
    $('#achSummary').textContent = `已解锁 ${unlocked.size} / ${ACHIEVEMENTS.length} 枚徽章，累计 ${state.xp} 经验。`;
  }

  /** 检查并解锁成就 */
  function checkAchievements() {
    const unlocked = new Set(state.achievements);
    const stats = {
      streak: state.streak,
      xp: state.xp,
      lesson: 0,
      lang: new Set(),
      perfect: state.perfectCount
    };
    Object.entries(state.progress).forEach(([key, up]) => {
      if (Object.keys(up.modules).length >= 4) {
        stats.lesson++;
        stats.lang.add(key.split(':')[0]);
      }
    });

    ACHIEVEMENTS.forEach(a => {
      if (unlocked.has(a.id)) return;
      let val = stats[a.type];
      if (a.type === 'lang') val = stats.lang.size;
      const reach = (a.type === 'lang') ? val >= a.threshold : val >= a.threshold;
      if (reach) {
        state.achievements.push(a.id);
        if (a.xp) { state.xp += a.xp; }
        toast(`成就解锁：${a.name} ${a.xp ? `(+${a.xp} XP)` : ''}`, 'achievement', a.icon);
      }
    });
    saveState();
  }

  // ============================================================
  // 十三、事件绑定与启动
  // ============================================================
  function bindGlobal() {
    // 导航链接
    $$('[data-nav]').forEach(el => {
      el.addEventListener('click', (e) => {
        e.preventDefault();
        router.go(el.dataset.nav);
      });
    });

    // 用户按钮
    $('#userBtn').onclick = () => {
      if (isLoggedIn()) {
        if (confirm(`当前账号：${state.name}\n是否退出登录？`)) logout();
      } else {
        openAuth('login');
      }
    };

    // 认证模态
    $('#authClose').onclick = closeAuth;
    $('#authModal').onclick = (e) => { if (e.target.id === 'authModal') closeAuth(); };
    $('#authSwitch').addEventListener('click', (e) => { e.preventDefault(); authMode = authMode === 'login' ? 'register' : 'login'; refreshAuthUI(); });
    $('#authSubmit').onclick = submitAuth;
    // 回车提交
    ['authAccount', 'authPass', 'authName'].forEach(id => {
      $('#' + id).addEventListener('keydown', (e) => { if (e.key === 'Enter') submitAuth(); });
    });

    // 路由
    window.addEventListener('hashchange', handleHash);

    // 键盘 Esc 关闭模态
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') closeAuth();
    });
  }

  // 启动
  function boot() {
    bindGlobal();
    // 若存在已登录会话，加载该账号专属状态（而非匿名状态）
    if (sessionAccount) {
      try {
        const raw = localStorage.getItem(`lingua_state_${sessionAccount}`);
        if (raw) state = Object.assign(defaultState(), JSON.parse(raw));
      } catch (e) { /* 解析失败则沿用默认状态 */ }
    }
    refreshUserUI();
    applyAccent(state.currentLang);
    handleHash();
  }

  // DOM 就绪后启动
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
