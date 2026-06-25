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
      body.innerHTML = `<tr><td colspan="6" style="padding:24px;text-align:center;color:var(--muted)">Couldn't load results (${err.message}). Open this page over http(s), or see the paper's Table 1 for the full numbers.</td></tr>`;
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
      if (label) label.textContent = ok ? "Copied!" : "Press Ctrl+C";
      btn.classList.add("copied");
      setTimeout(() => {
        if (label) label.textContent = prev || "Copy";
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
    parts.push(`<span class="ml-tag edge">Edge</span>${item.edgeModel}`);
  if (item.cloudModel && item.cloudModel !== "None")
    parts.push(`<span class="ml-tag cloud">Cloud</span>${item.cloudModel}`);
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
          ${index === 0 ? '<span class="top-badge">Top</span>' : ""}
        </div>
        <div class="model-line">${modelLine(item)}</div>
        <div class="run-detail">Tok ${item.cloudTokens || "–"} · FLOPs ${format.flops(item.edgeFlops)}</div>
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
  const H = Math.round(W * 0.52);
  canvas.style.height = `${H}px`;
  canvas.width = W * ratio;
  canvas.height = H * ratio;
  state.plotW = W;
  state.plotH = H;

  const ctx = canvas.getContext("2d");
  ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
  ctx.clearRect(0, 0, W, H);

  const margin = { top: 64, right: 28, bottom: 64, left: 64 };
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
  ctx.font = "700 13px Inter, system-ui, sans-serif";
  ctx.textAlign = "center";
  ctx.fillText("Cloud cost (USD)  →  cheaper is left", plot.x + plot.w / 2, plot.y + plot.h + 46);
  ctx.save();
  ctx.translate(18, plot.y + plot.h / 2);
  ctx.rotate(-Math.PI / 2);
  ctx.fillText("Completion score  →  higher is up", 0, 0);
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
  const y = plot.y + 8;
  ctx.textBaseline = "middle";
  ctx.font = "700 11px Inter, system-ui, sans-serif";

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
  ctx.fillText("Edge-only", x + 15, y);
  x += 15 + ctx.measureText("Edge-only").width + 14;

  drawStar(ctx, x + 6, y, 6, groupColors["Cloud-only"]);
  ctx.fillStyle = "rgba(60, 71, 66, 0.9)";
  ctx.fillText("Cloud-only", x + 15, y);

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
    Completion: ${format.percent(item.completion)}% &nbsp;·&nbsp; Pass³: ${format.percent(item.pass3)}%<br>
    Cloud cost: ${format.money(item.cloudCost)} &nbsp;·&nbsp; Privacy: ${format.percent(item.privacy)}%
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
