/* ============================================================
   ACE-BENCH — leaderboard + interactive trade-off plot
   ============================================================ */

const state = {
  results: [],
  filtered: [],
  points: [],
  sort: "completion"
};

const dataVersion = "20260624-redesign";

/* ============================================================
   i18n — bilingual EN / 中文
   English lives in the HTML (data-i18n marks each node, original
   cached on first switch); Chinese lives here. JS-generated text
   (leaderboard tags, canvas labels, tooltip) uses t().
   ============================================================ */
let currentLang = document.documentElement.getAttribute("data-lang") || "en";

const I18N_ZH = {
  "nav.leaderboard": "排行榜",
  "nav.problem": "问题",
  "nav.benchmark": "基准",
  "nav.strategies": "策略",
  "nav.findings": "发现",
  "nav.code": "代码",

  "hero.venue": "基准与分析 · 2026",
  "hero.title": `赋能端侧智能体：大模型智能体执行中<br><span class="title-accent">端云协同</span>的系统性分析`,
  "hero.affil1": `<sup>1</sup> 东北大学，沈阳`,
  "hero.affil2": `<sup>2</sup> 清华大学，北京`,
  "hero.affil3": `<sup>3</sup> 中国移动在线服务`,
  "hero.corr": `<span>*</span> 通讯作者`,
  "hero.btnCode": "代码与数据",
  "hero.btnPaper": "论文 (PDF)",
  "hero.btnLeaderboard": "排行榜",
  "hero.btnBibtex": "BibTeX",
  "hero.thesis": `如今大模型智能体在私有的本地工作区中运行——文件、数据库、终端与应用状态。全部在端侧运行可保护数据但能力受限；全部交给云端虽强大却会泄露上下文。<strong>真正的问题是端与云应如何协同</strong>——而 <strong>ACE-BENCH</strong> 是首个在<em>任务效用</em>、<em>资源成本</em>与<em>隐私</em>三个维度上同时衡量这一选择的基准。`,
  "hero.caption": `<strong>核心矛盾。</strong>仅端侧执行让数据留在本地，却会撞上能力瓶颈；仅云端执行能完成任务，但会暴露累积的本地上下文。端云协同力求两全——按需调用云端，既保持能力<em>又</em>保护隐私。`,

  "takeaways.kicker": "要点",
  "takeaways.h2": "核心要点",
  "takeaways.c1h": "没有哪一端能独赢",
  "takeaways.c1p": `仅云端的智能体能力强但泄露严重（隐私约 22%）；仅端侧的智能体隐私完美，却在困难的长程工作区任务上力不从心。`,
  "takeaways.c2h": "协同有效——前提是组织得当",
  "takeaways.c2p": `端云协同能取得更好的平衡——这取决于<strong>何时</strong>调用云端、<strong>传输哪些上下文</strong>。最优配置以约 <strong>1/10 的成本</strong>逼近云端效用，且隐私强得多。`,
  "takeaways.c3h": "端侧能力重塑配方",
  "takeaways.c3p": `端侧模型越强，对云端的依赖越少。最优模式从步级回退转向任务路由与规划——成本只是零头（<strong>$3 对 $35</strong>）。`,
  "takeaways.c4h": "有选择 ≠ 安全",
  "takeaways.c4p": `即便谨慎使用云端，仍可能暴露敏感的本地上下文。未来的智能体必须<strong>同时</strong>优化模型调用与上下文共享的决策。`,

  "lb.kicker": "排行榜",
  "lb.filterLabel": "策略族",
  "lb.optAll": "全部策略",
  "lb.optEdge": "仅端侧",
  "lb.optCloud": "仅云端",
  "lb.optEdgeCloud": "端云协同",
  "lb.sortCompletion": "完成度 ↑",
  "lb.sortPrivacy": "隐私 ↑",
  "lb.sortCost": "云成本 ↓",
  "lb.thMethod": "方法",
  "lb.thCompletion": "完成度 ↑",
  "lb.thPass": "Pass",
  "lb.thPrivacy": "隐私 ↑",
  "lb.thCost": "云成本 ↓",
  "lb.note": `每个方法列出其端侧 / 云端模型、云端 token（原始 / 缓存读取 / 输出，单位百万）与端侧 FLOPs（PetaFLOPs）。隐私在 100 个隐私标注任务上计算；所示箭头方向均为越高越好。`,

  "problem.kicker": "问题",
  "problem.h2": "多步智能体中的云端调用悄然泄露工作区。",
  "problem.lede": `当今最强的智能体依赖云端托管的前沿大模型。但智能体与本地工作区交互时会不断累积上下文——文件内容、工具输出、不断变化的应用状态——每一次云端调用都可能把其中一部分送出设备。这使云端执行成为真实的隐私通道，而端侧执行则以更弱的能力换取这种安全。`,
  "problem.c1tag": "仅端侧",
  "problem.c1h": "私密，但能力受限",
  "problem.c1p": `所有步骤在小型本地模型上运行。数据不出设备——但能力密集、长程的任务会暴露明显瓶颈。`,
  "problem.c1pillA": "100% 隐私",
  "problem.c1pillB": "效用低",
  "problem.c2tag": "仅云端",
  "problem.c2h": "强大，但暴露",
  "problem.c2p": `前沿大模型驱动每一步。效用很高，但累积的本地上下文被反复传输——隐私暴露与成本都最高。`,
  "problem.c2pillA": "效用最高",
  "problem.c2pillB": "22% 隐私",
  "problem.c3tag": "此前缺失的",
  "problem.c3h": "以往基准研究了错误的场景",
  "problem.c3p": `以往工作在<em>静态</em>、非智能体任务上评估端云协同——数学、问答、对话——而忽略了云端调用如何沿轨迹暴露不断变化的本地上下文。`,
  "problem.c3pill": "需要轨迹级审计",

  "bench.kicker": "基准",
  "bench.h2": "ACE-BENCH：智能体端云协同，三维度衡量。",
  "bench.lede": `ACE-BENCH（Agentic Cloud-Edge Collaboration Benchmark，智能体端云协同基准）。128 个可执行的真实数字任务，扎根于真实工作区，并配有任务专属验证器。其中 100 个带有细粒度隐私标注，使每一次云端调用所暴露的敏感上下文都可被审计。`,
  "bench.m1": "可执行任务",
  "bench.m2": "隐私标注",
  "bench.m3": "执行策略",
  "bench.m4": "评估维度",
  "bench.caption": `<strong>一次运行如何评分。</strong>每个任务自带工作区、工具与成功检查器。测评框架在选定的协同策略下执行智能体，并记录完整轨迹——模型调用、工具结果、token 用量、以及确切传给云端的上下文——再据此在三个维度上打分。`,
  "bench.a1h": "任务效用",
  "bench.a1p": `智能体真的把任务完成了吗？以完成度分数与 Pass<sup>n</sup> 衡量，结合基于规则的检查、环境状态审计与 LLM 评判。`,
  "bench.a2h": "资源用量",
  "bench.a2p": `代价几何？云端 token（原始 / 缓存读取 / 输出）、估算费用、以及端侧 FLOPs——以一份画像呈现，绝不压缩为单一标量。`,
  "bench.a3h": "隐私表现",
  "bench.a3p": `泄露了什么？在标注的<em>敏感单元</em>（个人与组织机密，12 个子类）上计算风险加权的非泄露分数，并比对一切对云端可见的内容。`,
  "bench.coverage": "任务覆盖",
  "bench.cov1": "信息检索",
  "bench.cov2": "内容生成",
  "bench.cov3": "数据分析",
  "bench.cov4": "办公生产力",
  "bench.cov5": "开发",
  "bench.cov6": "工作流自动化",

  "strat.kicker": "协同策略",
  "strat.h2": "在端与云之间分配工作的六种方式。",
  "strat.lede": `两个单侧基线，加上四种代表性的协同模式。它们的关键区别在于一个决定性维度：<strong>云端何时参与</strong>——是在任务开始前就固定，还是随轨迹展开实时决定。`,
  "strat.col1": "单侧基线",
  "strat.s1tag": "仅端侧",
  "strat.s1p": "每一步都在本地运行。无云端暴露；能力受限于端侧模型。",
  "strat.s2tag": "仅云端",
  "strat.s2p": "每一步都在云端运行。能力参照点——也是隐私 / 成本的上限。",
  "strat.col2": `执行前协调 <small>任务开始前固定</small>`,
  "strat.s3tag": "草图引导",
  "strat.s3p": "云端先写好整体计划；随后端侧模型独立执行整条轨迹。",
  "strat.s4tag": "任务级路由",
  "strat.s4p": "一次性路由器在任务开始前，把整个任务分配给端侧或云端。",
  "strat.col3": `运行时协调 <small>逐步决定</small>`,
  "strat.s5tag": "步级路由",
  "strat.s5p": `端侧执行每一步，但在<em>不确定</em>时把该步上升到云端。`,
  "strat.s6tag": "自适应云端协助",
  "strat.s6p": "端侧保持主导，仅在主动求助时才向云端获取计划、提示或纠错。",

  "find.kicker": "关键发现",
  "find.h2": "三维视角揭示了什么。",
  "find.lede": `把每个策略画在同一个效用–成本–隐私空间里，会暴露单一成功率所掩盖的权衡。把每个点看作一个策略：<strong>越靠右</strong> = 云成本越高，<strong>越靠上</strong> = 完成度越高，<strong>点内数字</strong> = 隐私。`,
  "find.axY": "Y · 完成度",
  "find.axX": "X · 云成本",
  "find.axN": "# · 隐私",
  "find.f1tag": "发现 1",
  "find.f1h": "单侧执行无法兼顾三者。",
  "find.f1p": `仅云端效用最高，但隐私跌破 25%；仅端侧保持 100% 隐私，却损失超过 10 分完成度。每个极端都牺牲了一个维度。`,
  "find.f2tag": "发现 2",
  "find.f2h": "协同能移动工作点——当组织得当时。",
  "find.f2p": `端云协同通过仅在必要时调用云端，取得显著更好的平衡。但增益取决于<em>哪种</em>模式：云端使用与上下文传输如何安排。`,
  "find.f3tag": "发现 3",
  "find.f3h": "更强的端侧改变最优模式。",
  "find.f3p": `有了强端侧模型，优选配方从步级回退转向任务路由、规划与纠错引导——在削减成本与暴露的同时保持效用（自适应协助：<strong>$3.07</strong> 对 仅云端的 <strong>$34.69</strong>）。`,
  "find.footnote": `虚线轮廓将共享同一端侧骨干的策略分组。悬停任一点可看其精确数值。结论：未来的端云智能体应把云端调用视为模型使用<em>与</em>上下文共享的联合决策——而非简单的质量–成本权衡。`,

  "res.kicker": "资源与引用",
  "res.h2": "复现、扩展、引用。",
  "res.c1h": "代码与数据集",
  "res.c1p": "任务、可执行工作区、验证器，以及每种协同策略的实现。",
  "res.c2h": "完整论文",
  "res.c2p": "形式化、任务构建、隐私标注协议与完整分析。",
  "res.c2go": "阅读 PDF",
  "res.copy": "复制",

  "footer.tagline": "面向工作区接地的大模型智能体的端云协同。"
};

/* JS-generated strings (both languages, since the source is JS not the DOM). */
const JS_STR = {
  en: {
    top: "Top", edge: "Edge", cloud: "Cloud", tok: "Tok", flops: "FLOPs",
    tipCompletion: "Completion", tipCost: "Cloud cost", tipPrivacy: "Privacy",
    copied: "Copied!", copyFail: "Press Ctrl+C",
    axX: "Cloud cost (USD)  →  cheaper is left", axY: "Completion score  →  higher is up",
    legEdge: "Edge-only", legCloud: "Cloud-only",
    loadErr: m => `Couldn't load results (${m}). Open this page over http(s), or see the paper's Table 1 for the full numbers.`
  },
  zh: {
    top: "最佳", edge: "端", cloud: "云", tok: "Tok", flops: "FLOPs",
    tipCompletion: "完成度", tipCost: "云成本", tipPrivacy: "隐私",
    copied: "已复制！", copyFail: "请按 Ctrl+C",
    axX: "云成本 (美元)  →  越靠左越省", axY: "完成度  →  越靠上越高",
    legEdge: "仅端侧", legCloud: "仅云端",
    loadErr: m => `结果加载失败（${m}）。请通过 http(s) 打开本页，或查看论文表 1 获取完整数值。`
  }
};

function t(key) {
  const pack = JS_STR[currentLang] || JS_STR.en;
  return key in pack ? pack[key] : JS_STR.en[key];
}

function applyLang(lang) {
  currentLang = lang;
  const root = document.documentElement;
  root.setAttribute("data-lang", lang);
  root.setAttribute("lang", lang === "zh" ? "zh-CN" : "en");

  document.querySelectorAll("[data-i18n]").forEach(el => {
    if (el.dataset.enHtml == null) el.dataset.enHtml = el.innerHTML;  // cache original EN
    if (lang === "zh") {
      const zh = I18N_ZH[el.dataset.i18n];
      el.innerHTML = zh != null ? zh : el.dataset.enHtml;
    } else {
      el.innerHTML = el.dataset.enHtml;
    }
  });

  document.title = lang === "zh"
    ? "ACE-BENCH · 大模型智能体的端云协同基准"
    : "ACE-BENCH · Edge-Cloud Collaboration for LLM Agents";
  const lbl = document.getElementById("lang-toggle-label");
  if (lbl) lbl.textContent = lang === "zh" ? "EN" : "中文";

  try { localStorage.setItem("acebench-lang", lang); } catch (e) {}

  // Re-render JS-driven content in the new language.
  if (state.results && state.results.length) {
    renderLeaderboard();
    renderTradeoff();
  }
}

function bindLangToggle() {
  const btn = document.getElementById("lang-toggle");
  if (!btn) return;
  btn.addEventListener("click", () => applyLang(currentLang === "zh" ? "en" : "zh"));
}


/* Execution-family colors (match the page + teaser figure) */
const groupColors = {
  "Edge-only":  "#2563eb",
  "Edge-Cloud": "#7c3aed",
  "Cloud-only": "#dc2626"
};

/* Collaboration-method colors (match paper Figure 3) */
const methodColors = {
  "Sketch-Guided Edge Execution.": "#1f9d57",
  "Task-Level Routing":            "#e8820e",
  "Step-Level Routing":            "#8b5cf6",
  "Adaptive Cloud Assistance.":    "#2f7fe0",
  "Edge-only":                     "#2563eb",
  "Cloud-only":                    "#dc2626"
};

const shortNames = {
  "Edge-only": "Edge",
  "Cloud-only": "Cloud",
  "Sketch-Guided Edge Execution.": "Sketch",
  "Task-Level Routing": "Task-route",
  "Step-Level Routing": "Step-route",
  "Adaptive Cloud Assistance.": "Assist"
};

const format = {
  percent: value => `${Number(value).toFixed(2)}`,
  money: value => value === 0 ? "$0.00" : `$${Number(value).toFixed(2)}`,
  flops: value => value == null ? "–" : `${Number(value).toFixed(0)} P`
};

async function init() {
  // Wire up data-independent UI first so it works even if the fetch fails.
  bindActiveNavigation();
  bindCopyButtons();
  bindLangToggle();
  applyLang(currentLang);
  try {
    const response = await fetch(`data/results.json?v=${dataVersion}`, { cache: "no-store" });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const data = await response.json();
    state.results = data.results || [];
    hydrateStats(data.metrics || {});
    bindControls();
    renderLeaderboard();
    renderTradeoff();
    let resizeTimer;
    window.addEventListener("resize", () => {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(renderTradeoff, 120);
    });
  } catch (err) {
    const body = document.getElementById("leaderboard-body");
    if (body) {
      body.innerHTML = `<tr><td colspan="6" style="padding:24px;text-align:center;color:var(--muted)">${t("loadErr")(err.message)}</td></tr>`;
    }
  }
}

function hydrateStats(metrics) {
  const set = (id, value) => { const el = document.getElementById(id); if (el) el.textContent = value; };
  set("task-count", metrics.tasks);
  set("privacy-task-count", metrics.privacyAnnotatedTasks);
  set("strategy-count", metrics.executionStrategies);
}

function bindControls() {
  const filter = document.getElementById("group-filter");
  if (filter) filter.addEventListener("change", renderLeaderboard);
  document.querySelectorAll(".leaderboard-tabs button[data-sort]").forEach(button => {
    button.addEventListener("click", () => {
      state.sort = button.dataset.sort;
      syncSortTabs();
      renderLeaderboard();
    });
  });
  const canvas = document.getElementById("tradeoff-canvas");
  if (!canvas) return;
  canvas.addEventListener("mousemove", handlePlotHover);
  canvas.addEventListener("mouseleave", hideTooltip);
}

function bindCopyButtons() {
  document.querySelectorAll(".copy-btn[data-copy]").forEach(btn => {
    btn.addEventListener("click", async () => {
      const target = document.querySelector(btn.dataset.copy);
      if (!target) return;
      const text = target.textContent;
      let ok = true;
      try {
        await navigator.clipboard.writeText(text);
      } catch (e) {
        const ta = document.createElement("textarea");
        ta.value = text;
        ta.style.position = "fixed";
        ta.style.opacity = "0";
        document.body.appendChild(ta);
        ta.select();
        try { ok = document.execCommand("copy"); } catch (_) { ok = false; }
        document.body.removeChild(ta);
      }
      const label = btn.querySelector("span");
      const prev = label ? label.textContent : "";
      if (label) label.textContent = ok ? t("copied") : t("copyFail");
      btn.classList.add("copied");
      setTimeout(() => {
        if (label) label.textContent = prev || t("copy") || "Copy";
        btn.classList.remove("copied");
      }, 1600);
    });
  });
}

function syncSortTabs() {
  document.querySelectorAll(".leaderboard-tabs button[data-sort]").forEach(button => {
    const isActive = button.dataset.sort === state.sort;
    button.classList.toggle("active", isActive);
    button.setAttribute("aria-pressed", String(isActive));
  });
}

function bindActiveNavigation() {
  const navLinks = [...document.querySelectorAll(".nav-links a[href^='#']")];
  const sections = navLinks
    .map(link => document.querySelector(link.getAttribute("href")))
    .filter(Boolean);
  if (!navLinks.length || !sections.length) return;

  const setActive = id => {
    navLinks.forEach(link => {
      const isActive = link.getAttribute("href") === `#${id}`;
      if (isActive) link.setAttribute("aria-current", "page");
      else link.removeAttribute("aria-current");
    });
  };

  const updateActive = () => {
    const probeY = window.scrollY + Math.min(window.innerHeight * 0.42, 360);
    const current = sections.reduce((active, section) =>
      section.offsetTop <= probeY ? section : active, sections[0]);
    setActive(current.id);
  };

  navLinks.forEach(link => {
    link.addEventListener("click", () => {
      const target = link.getAttribute("href").slice(1);
      if (target) setActive(target);
    });
  });

  updateActive();
  window.addEventListener("scroll", updateActive, { passive: true });
  window.addEventListener("resize", updateActive);
}

function getSortedResults() {
  const filterEl = document.getElementById("group-filter");
  const group = filterEl ? filterEl.value : "all";
  const sort = state.sort;
  const rows = state.results.filter(item => group === "all" || item.group === group);
  const sorted = [...rows];
  sorted.sort((a, b) => {
    if (sort === "privacy") return b.privacy - a.privacy || b.completion - a.completion;
    if (sort === "cloudCostAsc") return a.cloudCost - b.cloudCost || b.completion - a.completion;
    if (sort === "pass3") return b.pass3 - a.pass3 || b.completion - a.completion;
    return b.completion - a.completion || b.privacy - a.privacy;
  });
  return sorted;
}

function cleanMethod(name) {
  return name.replace(/\.$/, "");
}

function modelLine(item) {
  const parts = [];
  if (item.edgeModel && item.edgeModel !== "None")
    parts.push(`<span class="ml-tag edge">${t("edge")}</span>${item.edgeModel}`);
  if (item.cloudModel && item.cloudModel !== "None")
    parts.push(`<span class="ml-tag cloud">${t("cloud")}</span>${item.cloudModel}`);
  return parts.join('<span class="ml-sep">+</span>') || item.model;
}

function renderLeaderboard() {
  const body = document.getElementById("leaderboard-body");
  state.filtered = getSortedResults();
  body.innerHTML = state.filtered.map((item, index) => `
    <tr class="${index === 0 ? "top-row" : ""}">
      <td class="rank">${index + 1}</td>
      <td class="method-cell">
        <div class="method-name">
          <span class="dot" style="background:${groupColors[item.group]}"></span>
          <span>${cleanMethod(item.method)}</span>
          ${index === 0 ? `<span class="top-badge">${t("top")}</span>` : ""}
        </div>
        <div class="model-line">${modelLine(item)}</div>
        <div class="run-detail">${t("tok")} ${item.cloudTokens || "–"} · ${t("flops")} ${format.flops(item.edgeFlops)}</div>
      </td>
      <td class="score-cell">
        <div class="score-bar-wrap">
          <div class="score-bar"><span style="width:${Math.max(0, Math.min(100, item.completion))}%"></span></div>
          <strong>${format.percent(item.completion)}%</strong>
        </div>
      </td>
      <td class="compact-metric pass-metric">${format.percent(item.pass3)}%</td>
      <td class="compact-metric privacy-metric">${format.percent(item.privacy)}%</td>
      <td class="compact-metric cost-metric">${format.money(item.cloudCost)}</td>
    </tr>
  `).join("");
}

/* ---------------------- Trade-off plot ---------------------- */

const PLOT = { xMin: -1.5, xMax: 38, yMin: 38, yMax: 75 };

function renderTradeoff() {
  const canvas = document.getElementById("tradeoff-canvas");
  if (!canvas) return;
  const ratio = window.devicePixelRatio || 1;

  // Display size tracks container width; logical size == display size (clean hover math)
  canvas.style.width = "100%";
  const displayW = canvas.getBoundingClientRect().width || 760;
  const W = Math.max(560, displayW);
  const H = Math.round(W * 0.56);
  canvas.style.height = `${H}px`;
  canvas.width = W * ratio;
  canvas.height = H * ratio;
  state.plotW = W;
  state.plotH = H;

  const ctx = canvas.getContext("2d");
  ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
  ctx.clearRect(0, 0, W, H);

  const margin = { top: 92, right: 28, bottom: 64, left: 64 };
  const plot = { x: margin.left, y: margin.top, w: W - margin.left - margin.right, h: H - margin.top - margin.bottom };
  const { xMin, xMax, yMin, yMax } = PLOT;

  drawPlotFrame(ctx, plot, xMin, xMax, yMin, yMax);
  drawBackboneContours(ctx, plot, xMin, xMax, yMin, yMax);

  state.points = state.results.map(item => {
    const x = scaleX(item.cloudCost, plot, xMin, xMax);
    const y = plot.y + (1 - ((item.completion - yMin) / (yMax - yMin))) * plot.h;
    const radius = (W < 640) ? 15 : 18;
    drawPoint(ctx, x, y, radius, item);
    return { x, y, radius, item };
  });

  drawPointLabels(ctx, state.points, plot, W);
  drawLegend(ctx, plot);
}

function scaleX(value, plot, xMin, xMax) {
  return plot.x + ((value - xMin) / (xMax - xMin)) * plot.w;
}

function plotPosition(item, plot, xMin, xMax, yMin, yMax) {
  return {
    x: scaleX(item.cloudCost, plot, xMin, xMax),
    y: plot.y + (1 - ((item.completion - yMin) / (yMax - yMin))) * plot.h
  };
}

function drawBackboneContours(ctx, plot, xMin, xMax, yMin, yMax) {
  const groups = [
    { label: "Qwen3.5-9B",  color: "rgba(37, 99, 235, 0.34)",
      items: state.results.filter(item => item.edgeModel === "Qwen3.5-9B"  || item.model === "Qwen3.5-9B") },
    { label: "Qwen3.5-27B", color: "rgba(124, 58, 237, 0.34)",
      items: state.results.filter(item => item.edgeModel === "Qwen3.5-27B" || item.model === "Qwen3.5-27B") }
  ];
  ctx.save();
  groups.forEach(group => {
    const points = group.items.map(item => plotPosition(item, plot, xMin, xMax, yMin, yMax));
    if (!points.length) return;
    const minX = Math.max(scaleX(0, plot, xMin, xMax) - 30, Math.min(...points.map(p => p.x)) - 30);
    const maxX = Math.max(...points.map(p => p.x)) + 30;
    const minY = Math.min(...points.map(p => p.y)) - 32;
    const maxY = Math.max(...points.map(p => p.y)) + 32;
    ctx.setLineDash([7, 6]);
    ctx.lineWidth = 1.4;
    ctx.strokeStyle = group.color;
    roundedRect(ctx, minX, minY, maxX - minX, maxY - minY, 20);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = group.color.replace("0.34", "0.85");
    ctx.font = "700 12px Inter, system-ui, sans-serif";
    ctx.fillText(group.label, minX + 11, minY + 19);
  });
  ctx.restore();
}

function roundedRect(ctx, x, y, width, height, radius) {
  const r = Math.min(radius, width / 2, height / 2);
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + width - r, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + r);
  ctx.lineTo(x + width, y + height - r);
  ctx.quadraticCurveTo(x + width, y + height, x + width - r, y + height);
  ctx.lineTo(x + r, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
}

function drawPlotFrame(ctx, plot, xMin, xMax, yMin, yMax) {
  ctx.save();
  ctx.strokeStyle = "#eef2ee";
  ctx.fillStyle = "#8a958f";
  ctx.lineWidth = 1;
  ctx.font = "12px JetBrains Mono, ui-monospace, monospace";

  const xTicks = [0, 10, 20, 30];
  xTicks.forEach(value => {
    const x = scaleX(value, plot, xMin, xMax);
    ctx.beginPath();
    ctx.moveTo(x, plot.y);
    ctx.lineTo(x, plot.y + plot.h);
    ctx.stroke();
    ctx.textAlign = "center";
    ctx.fillText(`$${value}`, x, plot.y + plot.h + 22);
  });

  ctx.textAlign = "right";
  for (let i = 0; i <= 5; i += 1) {
    const y = plot.y + (i / 5) * plot.h;
    const value = Math.round(yMax - ((yMax - yMin) / 5) * i);
    ctx.beginPath();
    ctx.moveTo(plot.x, y);
    ctx.lineTo(plot.x + plot.w, y);
    ctx.stroke();
    ctx.fillText(`${value}`, plot.x - 12, y + 4);
  }

  // Axis titles
  ctx.fillStyle = "#3c4742";
  ctx.font = "700 13px Inter, 'Noto Sans SC', system-ui, sans-serif";
  ctx.textAlign = "center";
  ctx.fillText(t("axX"), plot.x + plot.w / 2, plot.y + plot.h + 46);
  ctx.save();
  ctx.translate(18, plot.y + plot.h / 2);
  ctx.rotate(-Math.PI / 2);
  ctx.fillText(t("axY"), 0, 0);
  ctx.restore();
  ctx.restore();
}

function drawPoint(ctx, x, y, radius, item) {
  ctx.save();
  const color = methodColors[item.method] || groupColors[item.group];
  if (item.group === "Cloud-only") {
    drawStar(ctx, x, y, radius + 3, color);
  } else if (item.group === "Edge-only") {
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.fillStyle = "#ffffff";
    ctx.fill();
    ctx.lineWidth = 2.4;
    ctx.setLineDash([3, 3]);
    ctx.strokeStyle = color;
    ctx.stroke();
    ctx.setLineDash([]);
  } else {
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.globalAlpha = 0.95;
    ctx.fillStyle = color;
    ctx.fill();
    ctx.globalAlpha = 1;
    ctx.lineWidth = 2;
    ctx.strokeStyle = "#ffffff";
    ctx.stroke();
  }
  ctx.fillStyle = item.group === "Edge-only" ? color : "#ffffff";
  ctx.font = "800 12px Inter, system-ui, sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(Math.round(item.privacy), x, y + 0.5);
  ctx.restore();
}

function drawStar(ctx, x, y, radius, color) {
  const spikes = 5;
  const outerRadius = radius;
  const innerRadius = radius * 0.46;
  let rotation = Math.PI / 2 * 3;
  ctx.beginPath();
  ctx.moveTo(x, y - outerRadius);
  for (let i = 0; i < spikes; i += 1) {
    ctx.lineTo(x + Math.cos(rotation) * outerRadius, y + Math.sin(rotation) * outerRadius);
    rotation += Math.PI / spikes;
    ctx.lineTo(x + Math.cos(rotation) * innerRadius, y + Math.sin(rotation) * innerRadius);
    rotation += Math.PI / spikes;
  }
  ctx.closePath();
  ctx.fillStyle = color;
  ctx.fill();
  ctx.lineWidth = 1.8;
  ctx.strokeStyle = "#ffffff";
  ctx.stroke();
}

function drawPointLabels(ctx, points, plot, W) {
  if (W < 560) return;
  ctx.save();
  ctx.font = "600 11.5px Inter, system-ui, sans-serif";
  ctx.textBaseline = "middle";
  points.forEach(point => {
    const { item, x, y, radius } = point;
    if (item.group === "Cloud-only") {
      // Label cloud models above the star
      ctx.textAlign = "center";
      ctx.fillStyle = "rgba(60, 71, 66, 0.78)";
      ctx.fillText(item.cloudModel, x, y - radius - 12);
      return;
    }
    const label = item.group === "Edge-only"
      ? `Edge ${item.edgeModel.replace("Qwen3.5-", "")}`
      : `${shortNames[item.method] || item.method}·${item.edgeModel.replace("Qwen3.5-", "")}`;
    const alignRight = x > plot.x + plot.w * 0.74;
    ctx.textAlign = alignRight ? "right" : "left";
    const labelX = alignRight ? x - radius - 8 : x + radius + 8;
    ctx.fillStyle = "rgba(60, 71, 66, 0.74)";
    ctx.fillText(label, labelX, y);
  });
  ctx.restore();
}

function drawLegend(ctx, plot) {
  ctx.save();
  let x = plot.x + 4;
  const y = 24;  // above the grid (in the top margin), not inside the plot area
  ctx.textBaseline = "middle";
  ctx.font = "700 11px Inter, 'Noto Sans SC', system-ui, sans-serif";

  // Colour = collaboration method (matches the filled edge-cloud points).
  const methods = [
    [methodColors["Sketch-Guided Edge Execution."], "Sketch"],
    [methodColors["Task-Level Routing"], "Task"],
    [methodColors["Step-Level Routing"], "Step"],
    [methodColors["Adaptive Cloud Assistance."], "Adaptive"]
  ];
  methods.forEach(([color, label]) => {
    ctx.beginPath();
    ctx.arc(x + 6, y, 5.5, 0, Math.PI * 2);
    ctx.fillStyle = color;
    ctx.fill();
    ctx.lineWidth = 1.5;
    ctx.strokeStyle = "#ffffff";
    ctx.stroke();
    ctx.fillStyle = "rgba(60, 71, 66, 0.9)";
    ctx.textAlign = "left";
    ctx.fillText(label, x + 15, y);
    x += 15 + ctx.measureText(label).width + 14;
  });

  // Shape = single-side reference points.
  ctx.beginPath();
  ctx.arc(x + 6, y, 5, 0, Math.PI * 2);
  ctx.fillStyle = "#ffffff";
  ctx.fill();
  ctx.lineWidth = 1.6;
  ctx.setLineDash([2.5, 2.5]);
  ctx.strokeStyle = groupColors["Edge-only"];
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.fillStyle = "rgba(60, 71, 66, 0.9)";
  ctx.fillText(t("legEdge"), x + 15, y);
  x += 15 + ctx.measureText(t("legEdge")).width + 14;

  drawStar(ctx, x + 6, y, 6, groupColors["Cloud-only"]);
  ctx.fillStyle = "rgba(60, 71, 66, 0.9)";
  ctx.fillText(t("legCloud"), x + 15, y);

  ctx.restore();
}

function handlePlotHover(event) {
  const canvas = document.getElementById("tradeoff-canvas");
  const rect = canvas.getBoundingClientRect();
  const dispX = event.clientX - rect.left;
  const dispY = event.clientY - rect.top;
  // Map display px -> logical px (they differ below 560px where logical width is clamped).
  const sx = (state.plotW || rect.width) / rect.width;
  const sy = (state.plotH || rect.height) / rect.height;
  const mx = dispX * sx;
  const my = dispY * sy;
  const hit = state.points.find(point => Math.hypot(mx - point.x, my - point.y) <= Math.max(point.radius, 13) + 3);
  if (!hit) { hideTooltip(); return; }
  const tooltip = document.getElementById("plot-tooltip");
  const item = hit.item;
  tooltip.style.display = "block";
  tooltip.style.left = `${Math.min(dispX + 16, rect.width - 210)}px`;
  tooltip.style.top = `${Math.max(dispY - 10, 8)}px`;
  tooltip.innerHTML = `
    <strong>${cleanMethod(item.method)}</strong><br>
    <span style="opacity:.75">${item.model}</span><br>
    ${t("tipCompletion")}: ${format.percent(item.completion)}% &nbsp;·&nbsp; Pass³: ${format.percent(item.pass3)}%<br>
    ${t("tipCost")}: ${format.money(item.cloudCost)} &nbsp;·&nbsp; ${t("tipPrivacy")}: ${format.percent(item.privacy)}%
  `;
}

function hideTooltip() {
  const tooltip = document.getElementById("plot-tooltip");
  if (tooltip) tooltip.style.display = "none";
}

/* Scroll-triggered reveal: elements fade/slide in as they enter the viewport.
   Degrades gracefully — without JS or IntersectionObserver, content stays visible,
   because the hiding rule only applies to .reveal (added here) under html.js-reveal. */
function setupReveal() {
  const selectors = [
    ".section-head", ".tldr-card", ".metric-band", ".wide-figure", ".axis-card",
    ".taxonomy", ".problem-card", ".strategy-col", ".plot-card", ".finding",
    ".findings-footnote", ".leaderboard-toolbar", ".table-shell", ".leaderboard-note",
    ".resource-card", ".citation-card"
  ];
  const els = [];
  selectors.forEach(sel => document.querySelectorAll(sel).forEach(el => {
    if (!els.includes(el)) els.push(el);
  }));
  if (!els.length) return;

  els.forEach(el => el.classList.add("reveal"));

  // Stagger siblings within the same parent so grids cascade in.
  const groupCount = new Map();
  els.forEach(el => {
    const parent = el.parentElement;
    const n = groupCount.get(parent) || 0;
    el.style.transitionDelay = `${Math.min(n * 70, 320)}ms`;
    groupCount.set(parent, n + 1);
  });

  const reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (reduce || !("IntersectionObserver" in window)) {
    els.forEach(el => el.classList.add("is-visible"));
    return;
  }

  // Re-fire every time an element enters the viewport (and reset when it leaves),
  // so the float-in animation always plays, not just on first scroll.
  const io = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      entry.target.classList.toggle("is-visible", entry.isIntersecting);
    });
  }, { threshold: 0.12, rootMargin: "0px 0px -8% 0px" });
  els.forEach(el => io.observe(el));
}

init();
setupReveal();
