# ACE-BENCH — Project Page

Academic project page for **“Empowering Edge Agents: A Systematic Analysis of
Edge-Cloud Collaboration in LLM Agent Execution.”**

The page is a single static `index.html` that tells the paper's story top to bottom:

1. **Hero** — title, authors, action buttons, one-paragraph thesis, and the teaser
   trade-off figure (Figure 1 from the paper).
2. **TL;DR** — four key takeaways.
3. **Problem** — why neither edge-only nor cloud-only execution is enough, and what
   prior benchmarks missed.
4. **Benchmark** — what ACE-BENCH is, the three evaluation axes, and the pipeline
   figure (Figure 2 from the paper).
5. **Strategies** — the six execution strategies, grouped by *when* the cloud participates.
6. **Findings** — an interactive utility–cost–privacy scatter plot plus three findings.
7. **Leaderboard** — sortable results table.
8. **Resources & Citation**.

## Local preview

```bash
python3 -m http.server 8080
# open http://localhost:8080
```

## Editing content

- **Results / leaderboard / plot** — all driven by `data/results.json`. Add or edit a
  row there; the table and the trade-off plot update automatically. Sort defaults to
  Completion while keeping cost and privacy in view.
- **Figures** — `assets/figures/fig1-tradeoff.png`, `fig2-pipeline.png`,
  `fig3-pareto.png` are cropped directly from the paper PDF (300 DPI).
- **Copy / narrative** — edit `index.html` sections directly.
- **Design tokens** — colors, spacing, and fonts live in the `:root` block of
  `assets/styles.css`. The three axes are color-coded consistently
  (utility = green, cost = amber, privacy = indigo).

## Notes before publishing

- `paper.pdf` is the full submission. Remove it (and the two “Paper (PDF)” links in
  `index.html`) if you do not want the PDF public while under review.
- The hero tag reads “Benchmark & Analysis · 2026”; update it to the venue once accepted.
- In `index.html` `<head>` there is a commented block with `canonical` / `og:image` /
  `twitter:image` tags — uncomment it and replace `YOUR-USER` with the final GitHub Pages
  URL so social link-previews render an image.
- The `<a href="https://github.com/OpenBMB/AceBench">` links and the BibTeX `url` point at
  the public repo — update if the canonical location changes.

## Deployment (GitHub Pages)

Push to GitHub, then enable Pages from the repository settings with the default branch
as the source. A `.nojekyll` file is included so all assets are served as-is.
