const state = {
  results: [],
  filtered: [],
  points: []
};

const groupColors = {
  "Edge-only": "#16855f",
  "Edge-Cloud": "#b7791f",
  "Cloud-only": "#2e6fc7"
};

const format = {
  percent: value => `${Number(value).toFixed(2)}`,
  money: value => value === 0 ? "$0.00" : `$${Number(value).toFixed(2)}`,
  flops: value => value == null ? "-" : `${Number(value).toFixed(2)} P`
};

async function init() {
  const response = await fetch("data/results.json");
  const data = await response.json();
  state.results = data.results;
  hydrateStats(data.metrics);
  bindControls();
  renderLeaderboard();
  renderTradeoff();
  window.addEventListener("resize", () => renderTradeoff());
}

function hydrateStats(metrics) {
  document.getElementById("task-count").textContent = metrics.tasks;
  document.getElementById("privacy-task-count").textContent = metrics.privacyAnnotatedTasks;
  document.getElementById("strategy-count").textContent = metrics.strategyFamilies;
}

function bindControls() {
  document.getElementById("group-filter").addEventListener("change", renderLeaderboard);
  document.getElementById("sort-select").addEventListener("change", renderLeaderboard);
  const canvas = document.getElementById("tradeoff-canvas");
  canvas.addEventListener("mousemove", handlePlotHover);
  canvas.addEventListener("mouseleave", hideTooltip);
}

function getSortedResults() {
  const group = document.getElementById("group-filter").value;
  const sort = document.getElementById("sort-select").value;
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

function renderLeaderboard() {
  const body = document.getElementById("leaderboard-body");
  state.filtered = getSortedResults();
  renderLeaderboardSummary(state.filtered);
  const maxCost = Math.max(...state.results.map(item => item.cloudCost));
  body.innerHTML = state.filtered.map((item, index) => `
    <tr class="${index === 0 ? "top-row" : ""}">
      <td class="rank">#${index + 1}</td>
      <td>
        <div class="method-name">
          <span class="dot" style="background:${groupColors[item.group]}"></span>
          <span>${item.method}</span>
          ${index === 0 ? '<span class="top-badge">Top</span>' : ""}
        </div>
        <span class="pill">${item.group}</span>
      </td>
      <td>
        <strong>${item.model}</strong>
        <div class="muted">Edge: ${item.edgeModel} | Cloud: ${item.cloudModel}</div>
      </td>
      <td class="metric-cell">
        ${metricBar(item.completion, 100, "completion-bar", format.percent(item.completion), "%")}
      </td>
      <td>${format.percent(item.pass3)}%</td>
      <td class="metric-cell">
        ${metricBar(item.cloudCost, maxCost, "cost-bar", format.money(item.cloudCost), "")}
      </td>
      <td class="metric-cell">
        ${metricBar(item.privacy, 100, "privacy-bar", format.percent(item.privacy), "%")}
      </td>
      <td>${item.cloudTokens || "-"}</td>
      <td>${format.flops(item.edgeFlops)}</td>
    </tr>
  `).join("");
}

function renderLeaderboardSummary(rows) {
  const summary = document.getElementById("leaderboard-summary");
  if (!rows.length) {
    summary.innerHTML = "";
    return;
  }
  const byCompletion = [...rows].sort((a, b) => b.completion - a.completion)[0];
  const byPrivacy = [...rows].sort((a, b) => b.privacy - a.privacy || b.completion - a.completion)[0];
  const byCost = [...rows].sort((a, b) => a.cloudCost - b.cloudCost || b.completion - a.completion)[0];
  summary.innerHTML = `
    <article class="summary-card">
      <span class="summary-label">Best Completion</span>
      <span class="summary-value">${byCompletion.method}</span>
      <span class="summary-meta">${byCompletion.model} | ${format.percent(byCompletion.completion)}%</span>
    </article>
    <article class="summary-card">
      <span class="summary-label">Lowest Cloud Cost</span>
      <span class="summary-value">${byCost.method}</span>
      <span class="summary-meta">${byCost.model} | ${format.money(byCost.cloudCost)}</span>
    </article>
    <article class="summary-card">
      <span class="summary-label">Highest Privacy</span>
      <span class="summary-value">${byPrivacy.method}</span>
      <span class="summary-meta">${byPrivacy.model} | ${format.percent(byPrivacy.privacy)}%</span>
    </article>
  `;
}

function metricBar(value, max, className, label, suffix) {
  const width = max === 0 ? 0 : Math.max(0, Math.min(100, value / max * 100));
  return `
    <div class="metric-value"><span>${label}</span><small>${suffix}</small></div>
    <div class="bar ${className}"><span style="width:${width}%"></span></div>
  `;
}

function renderTradeoff() {
  const canvas = document.getElementById("tradeoff-canvas");
  const rect = canvas.getBoundingClientRect();
  const ratio = window.devicePixelRatio || 1;
  canvas.width = Math.max(720, rect.width) * ratio;
  canvas.height = Math.max(480, rect.height || 520) * ratio;
  const ctx = canvas.getContext("2d");
  ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
  const width = canvas.width / ratio;
  const height = canvas.height / ratio;
  ctx.clearRect(0, 0, width, height);

  const margin = { top: 34, right: 42, bottom: 68, left: 74 };
  const plot = {
    x: margin.left,
    y: margin.top,
    w: width - margin.left - margin.right,
    h: height - margin.top - margin.bottom
  };
  const xMax = 36;
  const yMin = 36;
  const yMax = 76;

  drawPlotFrame(ctx, plot, xMax, yMin, yMax);
  state.points = state.results.map(item => {
    const x = plot.x + (item.cloudCost / xMax) * plot.w;
    const y = plot.y + (1 - ((item.completion - yMin) / (yMax - yMin))) * plot.h;
    const radius = 8 + item.privacy / 12;
    drawPoint(ctx, x, y, radius, groupColors[item.group], item);
    return { x, y, radius, item };
  });
}

function drawPlotFrame(ctx, plot, xMax, yMin, yMax) {
  ctx.save();
  ctx.strokeStyle = "#d9dfd8";
  ctx.fillStyle = "#61706a";
  ctx.lineWidth = 1;
  ctx.font = "12px ui-monospace, SFMono-Regular, Menlo, Consolas, monospace";

  for (let i = 0; i <= 6; i += 1) {
    const x = plot.x + (i / 6) * plot.w;
    const value = Math.round((xMax / 6) * i);
    ctx.beginPath();
    ctx.moveTo(x, plot.y);
    ctx.lineTo(x, plot.y + plot.h);
    ctx.stroke();
    ctx.fillText(`$${value}`, x - 10, plot.y + plot.h + 28);
  }

  for (let i = 0; i <= 5; i += 1) {
    const y = plot.y + (i / 5) * plot.h;
    const value = Math.round(yMax - ((yMax - yMin) / 5) * i);
    ctx.beginPath();
    ctx.moveTo(plot.x, y);
    ctx.lineTo(plot.x + plot.w, y);
    ctx.stroke();
    ctx.fillText(`${value}`, plot.x - 42, y + 4);
  }

  ctx.fillStyle = "#17211d";
  ctx.font = "700 13px ui-sans-serif, system-ui, sans-serif";
  ctx.fillText("Cloud cost (USD)", plot.x + plot.w / 2 - 54, plot.y + plot.h + 54);
  ctx.save();
  ctx.translate(22, plot.y + plot.h / 2 + 60);
  ctx.rotate(-Math.PI / 2);
  ctx.fillText("Completion score", 0, 0);
  ctx.restore();
  ctx.restore();
}

function drawPoint(ctx, x, y, radius, color, item) {
  ctx.save();
  ctx.globalAlpha = 0.88;
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(x, y, radius, 0, Math.PI * 2);
  ctx.fill();
  ctx.lineWidth = 2;
  ctx.strokeStyle = "#ffffff";
  ctx.stroke();
  ctx.globalAlpha = 1;
  ctx.fillStyle = "#ffffff";
  ctx.font = "700 11px ui-sans-serif, system-ui, sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(Math.round(item.privacy), x, y);
  ctx.restore();
}

function handlePlotHover(event) {
  const canvas = document.getElementById("tradeoff-canvas");
  const rect = canvas.getBoundingClientRect();
  const mx = event.clientX - rect.left;
  const my = event.clientY - rect.top;
  const hit = state.points.find(point => {
    const distance = Math.hypot(mx - point.x, my - point.y);
    return distance <= Math.max(point.radius, 14);
  });
  if (!hit) {
    hideTooltip();
    return;
  }
  const tooltip = document.getElementById("plot-tooltip");
  const item = hit.item;
  tooltip.style.display = "block";
  tooltip.style.left = `${Math.min(mx + 16, rect.width - 230)}px`;
  tooltip.style.top = `${Math.max(my - 18, 12)}px`;
  tooltip.innerHTML = `
    <strong>${item.method}</strong><br>
    <span>${item.model}</span><br>
    Completion: ${format.percent(item.completion)}%<br>
    Cloud cost: ${format.money(item.cloudCost)}<br>
    Privacy: ${format.percent(item.privacy)}%
  `;
}

function hideTooltip() {
  document.getElementById("plot-tooltip").style.display = "none";
}

init();
