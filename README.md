# Ops Intelligence Dashboard

An AI-powered operational analytics tool that ingests a CSV of tasks and instantly surfaces bottlenecks, overdue patterns, workload imbalances, and plain-language recommendations — powered by Claude.

**Live demo:** [ops-intelligence-dashboard-gamma.vercel.app](https://ops-intelligence-dashboard-gamma.vercel.app)

---

## What it does

Upload any CSV of operational tasks and get:

- **6 KPI cards** — total, completed, in-progress, overdue, blocked, critical open
- **AI insights** — executive summary, bottleneck analysis, overdue patterns, workload issues, and top 3 weekly recommendations
- **Workload chart** — stacked bar chart showing task distribution by assignee and status
- **Status donut** — at-a-glance breakdown of where all tasks stand
- **Filterable task table** — filter by status with overdue rows highlighted
- **Sample dataset** — 35 tasks across Engineering, Product, Operations, Security, and HR ready to load in one click

## Tech stack

| Layer | Tool |
|---|---|
| Framework | Next.js 16 (App Router) |
| Styling | Tailwind CSS |
| AI | Claude Haiku via Anthropic SDK |
| Charts | Recharts |
| CSV parsing | PapaParse |
| Deployment | Vercel |

## CSV format

The dashboard expects a CSV with these columns (extra columns are ignored):

```
task_id, task_name, assignee, status, priority, created_date, due_date, completed_date, department, category, estimated_hours, actual_hours
```

**Supported status values:** `Done`, `In Progress`, `Blocked`, `Not Started`

Tasks with a `due_date` in the past and a non-done status are automatically flagged as `Overdue`.

A sample CSV is included at `public/sample.csv`.

## Getting started

### 1. Clone and install

```bash
git clone https://github.com/your-username/ops-intelligence-dashboard.git
cd ops-intelligence-dashboard
npm install
```

### 2. Set your Anthropic API key

```bash
cp .env.example .env.local
# then edit .env.local and add your key
```

Or export it directly:

```bash
export ANTHROPIC_API_KEY=sk-ant-...
```

Get a key at [console.anthropic.com](https://console.anthropic.com/settings/api-keys).

### 3. Run locally

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000), then click **Load Sample Dataset** or upload your own CSV.

## Deploying to Vercel

```bash
npm i -g vercel
vercel --prod
```

Add `ANTHROPIC_API_KEY` as a production environment variable in your Vercel project settings (or via `vercel env add ANTHROPIC_API_KEY production`).

## Project structure

```
app/
  page.tsx               # Main dashboard — state, layout, AI fetch
  api/analyze/route.ts   # Server route — prompt builder + Claude call
  globals.css
components/
  CSVUpload.tsx          # Drag-and-drop upload + sample loader
  MetricsGrid.tsx        # 6 KPI stat cards
  InsightsPanel.tsx      # AI output — risk badge, findings, recommendations
  WorkloadChart.tsx      # Stacked bar chart by assignee
  StatusBreakdown.tsx    # Donut chart by status
  TaskTable.tsx          # Filterable task table with overdue highlighting
public/
  sample.csv             # 35-row demo dataset
```
