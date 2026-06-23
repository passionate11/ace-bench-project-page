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

const methodColors = {
  "Sketch-Guided": "#2f9a70",
  "Task-Routing": "#b7791f",
  "Step-Routing": "#8a6bd1",
  "Adaptive Assist.": "#d36b4c",
  "Edge-only": "#16855f",
  "Cloud-only": "#2e6fc7"
};

const shortNames = {
  "Edge-only": "Edge",
  "Cloud-only": "Cloud",
  "Sketch-Guided": "Sketch",
  "Task-Routing": "Task route",
  "Step-Routing": "Step route",
  "Adaptive Assist.": "Assist"
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
  if (!canvas) return;
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
  body.innerHTML = state.filtered.map((item, index) => `
    <tr class="${index === 0 ? "top-row" : ""}">
      <td class="rank">#${index + 1}</td>
      <td class="method-cell">
        <div class="method-name">
          <span class="dot" style="background:${groupColors[item.group]}"></span>
          <span>${item.method}</span>
          ${index === 0 ? '<span class="top-badge">Top</span>' : ""}
        </div>
        <div class="model-line">${item.model}</div>
        <div class="run-detail">Edge ${item.edgeModel} | Cloud ${item.cloudModel} | Tok ${item.cloudTokens || "-"} | FLOPs ${format.flops(item.edgeFlops)}</div>
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
    <div class="metric-value"><span>${label}</span>${suffix ? `<small>${suffix}</small>` : ""}</div>
    <div class="bar ${className}"><span style="width:${width}%"></span></div>
  `;
}

function renderTradeoff() {
  const canvas = document.getElementById("tradeoff-canvas");
  if (!canvas) return;
  const rect = canvas.getBoundingClientRect();
  const ratio = window.devicePixelRatio || 1;
  canvas.width = Math.max(900, rect.width) * ratio;
  canvas.height = Math.max(680, rect.height || 680) * ratio;
  const ctx = canvas.getContext("2d");
  ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
  const width = canvas.width / ratio;
  const height = canvas.height / ratio;
  ctx.clearRect(0, 0, width, height);

  const margin = { top: 86, right: 70, bottom: 86, left: 86 };
  const plot = {
    x: margin.left,
    y: margin.top,
    w: width - margin.left - margin.right,
    h: height - margin.top - margin.bottom
  };
  const xMin = -1.2;
  const xMax = 35;
  const yMin = 38;
  const yMax = 75;

  drawPlotFrame(ctx, plot, xMin, xMax, yMin, yMax);
  drawBackboneContours(ctx, plot, xMin, xMax, yMin, yMax);
  state.points = state.results.map(item => {
    const x = scaleX(item.cloudCost, plot, xMin, xMax);
    const y = plot.y + (1 - ((item.completion - yMin) / (yMax - yMin))) * plot.h;
    const radius = item.group === "Cloud-only" ? 22 : 20;
    drawPoint(ctx, x, y, radius, item);
    return { x, y, radius, item };
  });
  drawPointLabels(ctx, state.points, plot);
  drawPlotNotes(ctx, plot);
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
    {
      label: "Qwen3.5-9B",
      items: state.results.filter(item => item.edgeModel === "Qwen3.5-9B" || item.model === "Qwen3.5-9B")
    },
    {
      label: "Qwen3.5-27B",
      items: state.results.filter(item => item.edgeModel === "Qwen3.5-27B" || item.model === "Qwen3.5-27B")
    }
  ];
  ctx.save();
  groups.forEach((group, index) => {
    const points = group.items.map(item => plotPosition(item, plot, xMin, xMax, yMin, yMax));
    if (!points.length) return;
    const minX = Math.max(scaleX(0, plot, xMin, xMax) + 2, Math.min(...points.map(point => point.x)) - 34);
    const maxX = Math.max(...points.map(point => point.x)) + 34;
    const minY = Math.min(...points.map(point => point.y)) - 38;
    const maxY = Math.max(...points.map(point => point.y)) + 38;
    ctx.setLineDash([8, 7]);
    ctx.lineWidth = 1.6;
    ctx.strokeStyle = index === 0 ? "rgba(183, 121, 31, 0.42)" : "rgba(22, 133, 95, 0.42)";
    roundedRect(ctx, minX, minY, maxX - minX, maxY - minY, 22);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = index === 0 ? "rgba(183, 121, 31, 0.8)" : "rgba(22, 133, 95, 0.8)";
    ctx.font = "700 14px ui-sans-serif, system-ui, sans-serif";
    ctx.fillText(group.label, minX + 12, minY + 22);
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
  ctx.strokeStyle = "#e2e7e1";
  ctx.fillStyle = "#61706a";
  ctx.lineWidth = 1;
  ctx.font = "13px ui-monospace, SFMono-Regular, Menlo, Consolas, monospace";

  const xTicks = [0, 6, 12, 18, 23, 29, 35];
  xTicks.forEach(value => {
    const x = scaleX(value, plot, xMin, xMax);
    ctx.beginPath();
    ctx.moveTo(x, plot.y);
    ctx.lineTo(x, plot.y + plot.h);
    ctx.stroke();
    ctx.fillText(`$${value}`, x - 12, plot.y + plot.h + 32);
  });

  for (let i = 0; i <= 5; i += 1) {
    const y = plot.y + (i / 5) * plot.h;
    const value = Math.round(yMax - ((yMax - yMin) / 5) * i);
    ctx.beginPath();
    ctx.moveTo(plot.x, y);
    ctx.lineTo(plot.x + plot.w, y);
    ctx.stroke();
    ctx.fillText(`${value}`, plot.x - 46, y + 5);
  }

  ctx.fillStyle = "#17211d";
  ctx.font = "700 15px ui-sans-serif, system-ui, sans-serif";
  ctx.fillText("Cloud cost (USD)", plot.x + plot.w / 2 - 66, plot.y + plot.h + 60);
  ctx.save();
  ctx.translate(24, plot.y + plot.h / 2 + 68);
  ctx.rotate(-Math.PI / 2);
  ctx.fillText("Completion score", 0, 0);
  ctx.restore();
  ctx.restore();
}

function drawPoint(ctx, x, y, radius, item) {
  ctx.save();
  const color = methodColors[item.method] || groupColors[item.group];
  if (item.group === "Cloud-only") {
    drawStar(ctx, x, y, radius, color);
  } else {
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    if (item.group === "Edge-only") {
      ctx.fillStyle = "#ffffff";
      ctx.fill();
      ctx.lineWidth = 2.6;
      ctx.strokeStyle = color;
      ctx.stroke();
    } else {
      ctx.globalAlpha = 0.92;
      ctx.fillStyle = color;
      ctx.fill();
      ctx.lineWidth = 2;
      ctx.strokeStyle = "#ffffff";
      ctx.stroke();
      ctx.globalAlpha = 1;
    }
  }
  ctx.fillStyle = item.group === "Edge-only" ? color : "#ffffff";
  ctx.font = "800 13px ui-sans-serif, system-ui, sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(Math.round(item.privacy), x, y + (item.group === "Cloud-only" ? 1 : 0));
  ctx.restore();
}

function drawStar(ctx, x, y, radius, color) {
  const spikes = 5;
  const outerRadius = radius;
  const innerRadius = radius * 0.48;
  let rotation = Math.PI / 2 * 3;
  let cx = x;
  let cy = y;
  ctx.beginPath();
  ctx.moveTo(x, y - outerRadius);
  for (let i = 0; i < spikes; i += 1) {
    cx = x + Math.cos(rotation) * outerRadius;
    cy = y + Math.sin(rotation) * outerRadius;
    ctx.lineTo(cx, cy);
    rotation += Math.PI / spikes;
    cx = x + Math.cos(rotation) * innerRadius;
    cy = y + Math.sin(rotation) * innerRadius;
    ctx.lineTo(cx, cy);
    rotation += Math.PI / spikes;
  }
  ctx.lineTo(x, y - outerRadius);
  ctx.closePath();
  ctx.fillStyle = color;
  ctx.fill();
  ctx.lineWidth = 2;
  ctx.strokeStyle = "#ffffff";
  ctx.stroke();
}

function drawPointLabels(ctx, points, plot) {
  ctx.save();
  ctx.font = "650 13px ui-sans-serif, system-ui, sans-serif";
  ctx.textBaseline = "middle";
  points.forEach(point => {
    const { item, x, y, radius } = point;
    const label = item.group === "Cloud-only" ? item.cloudModel : `${shortNames[item.method] || item.method} / ${item.edgeModel.replace("Qwen3.5-", "")}`;
    const alignRight = x > plot.x + plot.w * 0.72;
    const labelX = alignRight ? x - radius - 10 : x + radius + 10;
    const labelY = y;
    ctx.textAlign = alignRight ? "right" : "left";
    ctx.fillStyle = "rgba(23, 33, 29, 0.72)";
    ctx.fillText(label, labelX, labelY);
  });
  ctx.restore();
}

function drawPlotNotes(ctx, plot) {
  ctx.save();
  const legendY = plot.y - 26;
  drawInlineLegend(ctx, plot.x, legendY);
  ctx.fillStyle = "rgba(97, 112, 106, 0.9)";
  ctx.font = "13px ui-sans-serif, system-ui, sans-serif";
  ctx.fillText("Higher utility", plot.x + plot.w - 88, plot.y - 24);
  ctx.strokeStyle = "rgba(46, 111, 199, 0.55)";
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(plot.x + plot.w - 112, plot.y - 28);
  ctx.lineTo(plot.x + plot.w - 128, plot.y - 28);
  ctx.stroke();
  ctx.restore();
}

function drawInlineLegend(ctx, x, y) {
  ctx.save();
  ctx.font = "700 12px ui-sans-serif, system-ui, sans-serif";
  ctx.textBaseline = "middle";

  ctx.beginPath();
  ctx.arc(x + 8, y, 7, 0, Math.PI * 2);
  ctx.fillStyle = "#ffffff";
  ctx.fill();
  ctx.lineWidth = 2;
  ctx.strokeStyle = groupColors["Edge-only"];
  ctx.stroke();
  ctx.fillStyle = "rgba(97, 112, 106, 0.94)";
  ctx.fillText("Edge-only", x + 22, y);

  const hybridX = x + 112;
  ctx.beginPath();
  ctx.arc(hybridX + 8, y, 7, 0, Math.PI * 2);
  ctx.fillStyle = groupColors["Edge-Cloud"];
  ctx.fill();
  ctx.strokeStyle = "#ffffff";
  ctx.lineWidth = 1.5;
  ctx.stroke();
  ctx.fillStyle = "rgba(97, 112, 106, 0.94)";
  ctx.fillText("Edge-cloud", hybridX + 22, y);

  const cloudX = x + 232;
  drawStar(ctx, cloudX + 8, y, 8, groupColors["Cloud-only"]);
  ctx.fillStyle = "rgba(97, 112, 106, 0.94)";
  ctx.fillText("Cloud-only", cloudX + 24, y);

  ctx.font = "500 12px ui-sans-serif, system-ui, sans-serif";
  ctx.fillText("Number = privacy", cloudX + 128, y);
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
  const tooltip = document.getElementById("plot-tooltip");
  if (tooltip) tooltip.style.display = "none";
}

init();
