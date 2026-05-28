"use client";

/**
 * Static "Architecture" view. Shows how the demo dashboard would map
 * onto a real LiveTrends-scale pipeline. Three sections:
 *   1. Diagram (inline SVG) with title + subtitle above
 *   2. "What changes at scale" — five short paragraphs in a card
 *   3. "Where verifiability lives" — three bullets in a card
 *
 * No new dependencies. Pure SVG, all coordinates inlined.
 */
export function ArchitectureView() {
  return (
    <div className="space-y-10">
      {/* Section 1 — diagram */}
      <section>
        <h2 className="text-2xl font-semibold tracking-tight text-zinc-50 mb-2">
          How this would work at LiveTrends scale
        </h2>
        <p className="text-sm text-zinc-400 mb-6 max-w-2xl leading-relaxed">
          Today the dashboard parses a CSV in the browser. At scale, the
          same UX sits on top of a real data pipeline.
        </p>
        <Diagram />
      </section>

      {/* Section 2 — what changes at scale */}
      <section className="card-surface rounded-md p-8 space-y-5">
        <h3 className="text-xs text-muted uppercase tracking-widest">
          What changes at scale
        </h3>
        <Para title="Why a warehouse exists.">
          You can&apos;t run analytical queries against the systems that run
          the business. They&apos;ll buckle, and you can&apos;t fix sources you
          don&apos;t own. So you copy everything into one place and impose
          consistency on the way in.
        </Para>
        <Para title="Why ELT, not ETL.">
          Extract from sources, Load the raw data unchanged first, then
          Transform inside the warehouse with version-controlled SQL.
          Retailer feeds change format constantly. If you transform before
          loading, a format change destroys data you can&apos;t get back.
          Keep the raw bytes, and you can always replay.
        </Para>
        <Para title="How AI fits in without becoming a liability.">
          AI never sees raw rows. It reads from the same clean marts the
          dashboard reads from. It can write queries against that clean
          layer, but it can&apos;t hallucinate numbers, because the numbers
          it returns are computed by SQL, not generated.
        </Para>
        <Para title="Batch vs live.">
          Most decisions don&apos;t need real-time data. Live feeds multiply
          failure modes for marginal value. Default to nightly batch with
          a clear SLA. Move specific feeds to streaming only when a
          business case demands it.
        </Para>
        <Para title="What this dashboard becomes.">
          The demo you&apos;re looking at parses a CSV in the browser. That
          works up to about 10,000 rows. At LiveTrends scale, the same
          dashboard becomes a thin query layer over the warehouse. Same
          UX, completely different plumbing. The architecture is designed
          for that swap from day one.
        </Para>
      </section>

      {/* Section 3 — verifiability */}
      <section className="card-surface rounded-md p-8 space-y-4">
        <h3 className="text-xs text-muted uppercase tracking-widest">
          Where verifiability lives
        </h3>
        <Bullet title="Lineage.">
          Every number traces back through dbt&apos;s lineage graph to the
          exact raw rows. Drill-through in the demo is the seed of this.
        </Bullet>
        <Bullet title="Validation gates.">
          dbt tests run on every transform: row counts, freshness,
          uniqueness, totals reconcile. Bad data never reaches the marts.
        </Bullet>
        <Bullet title="Reconciliation.">
          Warehouse totals tie back to source-of-record systems. If a
          retailer says they sold 12,000 units of a SKU and the warehouse
          says 11,800, you know within hours, not weeks.
        </Bullet>
      </section>
    </div>
  );
}

function Para({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <p className="text-sm text-zinc-200 leading-relaxed">
        <span className="font-semibold">{title}</span>{" "}
        <span className="text-zinc-400">{children}</span>
      </p>
    </div>
  );
}

function Bullet({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex gap-3 items-start">
      <span
        className="mt-2 w-1.5 h-1.5 rounded-full flex-shrink-0"
        style={{ backgroundColor: "#8b5cf6" }}
      />
      <p className="text-sm text-zinc-200 leading-relaxed">
        <span className="font-semibold">{title}</span>{" "}
        <span className="text-zinc-400">{children}</span>
      </p>
    </div>
  );
}

// ---------------------------------------------------------------------
// Diagram (inline SVG)
// ---------------------------------------------------------------------

/**
 * Five logical regions, left to right:
 *   Sources (3 stacked)  →  Landing zone  →  Warehouse  →  Consumption
 *                                              ↑
 *                                    Transformation banner above
 *
 * All coordinates in a 1200×540 viewBox. Scales responsively via
 * width="100%" + preserveAspectRatio.
 */
function Diagram() {
  // Box geometry — referenced by arrows below so they stay aligned.
  const G = {
    src: { x: 20, w: 200, h: 90, ys: [40, 150, 260] },
    landing: { x: 270, y: 130, w: 180, h: 130 },
    transform: { x: 500, y: 30, w: 260, h: 56 },
    warehouse: { x: 500, y: 100, w: 260, h: 360 },
    dashboard: { x: 820, y: 150, w: 240, h: 110 },
    ai: { x: 820, y: 300, w: 240, h: 140 },
  };

  return (
    <div className="card-surface rounded-md p-6">
      <svg
        viewBox="0 0 1200 540"
        className="w-full h-auto font-sans"
        role="img"
        aria-label="Production architecture: sources flow into a landing zone, then a warehouse with a transformation banner on top, then a dashboard and an AI layer."
      >
        <defs>
          {/* Box gradient matches the .card-surface CSS utility */}
          <linearGradient id="cardGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#18181c" />
            <stop offset="100%" stopColor="#131316" />
          </linearGradient>
          {/* Single shared arrowhead used by all six arrows */}
          <marker
            id="arrow"
            viewBox="0 0 10 10"
            refX="9"
            refY="5"
            markerWidth="6"
            markerHeight="6"
            orient="auto-start-reverse"
          >
            <path d="M 0 0 L 10 5 L 0 10 Z" fill="#8b5cf6" />
          </marker>
        </defs>

        {/* ---- Sources column ---- */}
        <SourceBox
          x={G.src.x}
          y={G.src.ys[0]}
          w={G.src.w}
          h={G.src.h}
          title="Retailer feeds"
          sub="EDI 852, APIs"
          detail="Lowe's, Costco, Walmart"
        />
        <SourceBox
          x={G.src.x}
          y={G.src.ys[1]}
          w={G.src.w}
          h={G.src.h}
          title="ERP & Production"
          sub="CDC replication"
          detail="Apopka, Mt. Dora"
        />
        <SourceBox
          x={G.src.x}
          y={G.src.ys[2]}
          w={G.src.w}
          h={G.src.h}
          title="Supplier data"
          sub="SFTP, spreadsheets"
          detail="Asia, EU"
        />

        {/* ---- Landing zone ---- */}
        <BasicBox
          x={G.landing.x}
          y={G.landing.y}
          w={G.landing.w}
          h={G.landing.h}
          titleLines={["Landing zone", "(raw, unchanged)"]}
          subLines={["S3 / Cloud storage"]}
        />
        {/* Italic caption sits below the landing box */}
        <text
          x={G.landing.x + G.landing.w / 2}
          y={G.landing.y + G.landing.h + 22}
          textAnchor="middle"
          fill="#71717a"
          fontSize="10"
          fontStyle="italic"
        >
          Raw data preserved.
        </text>
        <text
          x={G.landing.x + G.landing.w / 2}
          y={G.landing.y + G.landing.h + 36}
          textAnchor="middle"
          fill="#71717a"
          fontSize="10"
          fontStyle="italic"
        >
          Re-runs are idempotent.
        </text>

        {/* ---- Transformation banner (sits above the warehouse) ---- */}
        <BasicBox
          x={G.transform.x}
          y={G.transform.y}
          w={G.transform.w}
          h={G.transform.h}
          titleLines={["Transformation (dbt)"]}
          subLines={["version-controlled SQL · validation gates · lineage"]}
          accent="#8b5cf6"
        />

        {/* ---- Warehouse (tall, three internal layers) ---- */}
        <WarehouseBox
          x={G.warehouse.x}
          y={G.warehouse.y}
          w={G.warehouse.w}
          h={G.warehouse.h}
        />

        {/* ---- Consumption column ---- */}
        <BasicBox
          x={G.dashboard.x}
          y={G.dashboard.y}
          w={G.dashboard.w}
          h={G.dashboard.h}
          titleLines={["This dashboard"]}
          subLines={["thin query layer"]}
        />
        <BasicBox
          x={G.ai.x}
          y={G.ai.y}
          w={G.ai.w}
          h={G.ai.h}
          titleLines={["AI layer"]}
          subLines={[
            "column mapping, drafting, NL query",
            "only reads from clean marts, never raw",
          ]}
        />

        {/* ---- Arrows: sources → landing ---- */}
        <Arrow d="M 220 85  Q 248 100 270 165" />
        <Arrow d="M 220 195 L 270 195" />
        <Arrow d="M 220 305 Q 248 290 270 225" />

        {/* ---- Arrow: landing → warehouse ---- */}
        <Arrow d="M 450 195 L 500 280" />

        {/* ---- Arrows: warehouse → consumption ---- */}
        <Arrow d="M 760 205 L 820 205" />
        <Arrow d="M 760 370 L 820 370" />
      </svg>
    </div>
  );
}

// ---------------------------------------------------------------------
// SVG helpers
// ---------------------------------------------------------------------

interface BasicBoxProps {
  x: number;
  y: number;
  w: number;
  h: number;
  titleLines: string[];
  subLines?: string[];
  /** Optional accent stroke instead of the default zinc-900 border. */
  accent?: string;
}

function BasicBox({
  x,
  y,
  w,
  h,
  titleLines,
  subLines = [],
  accent,
}: BasicBoxProps) {
  const cx = x + w / 2;
  // Center the title+sub block vertically.
  const blockHeight = titleLines.length * 16 + subLines.length * 14;
  const startY = y + (h - blockHeight) / 2 + 12;
  return (
    <g>
      <rect
        x={x}
        y={y}
        width={w}
        height={h}
        rx={6}
        fill="url(#cardGrad)"
        stroke={accent ?? "#1f1f23"}
        strokeWidth={accent ? 1.5 : 1}
      />
      {titleLines.map((line, i) => (
        <text
          key={`t-${i}`}
          x={cx}
          y={startY + i * 16}
          textAnchor="middle"
          fill="#fafafa"
          fontSize="13"
          fontWeight="600"
        >
          {line}
        </text>
      ))}
      {subLines.map((line, i) => (
        <text
          key={`s-${i}`}
          x={cx}
          y={startY + titleLines.length * 16 + i * 14 + 4}
          textAnchor="middle"
          fill="#a1a1aa"
          fontSize="11"
        >
          {line}
        </text>
      ))}
    </g>
  );
}

function SourceBox({
  x,
  y,
  w,
  h,
  title,
  sub,
  detail,
}: {
  x: number;
  y: number;
  w: number;
  h: number;
  title: string;
  sub: string;
  detail: string;
}) {
  const cx = x + w / 2;
  return (
    <g>
      <rect
        x={x}
        y={y}
        width={w}
        height={h}
        rx={6}
        fill="url(#cardGrad)"
        stroke="#1f1f23"
        strokeWidth={1}
      />
      <text
        x={cx}
        y={y + 26}
        textAnchor="middle"
        fill="#fafafa"
        fontSize="13"
        fontWeight="600"
      >
        {title}
      </text>
      <text
        x={cx}
        y={y + 46}
        textAnchor="middle"
        fill="#a1a1aa"
        fontSize="11"
      >
        {sub}
      </text>
      <text
        x={cx}
        y={y + 66}
        textAnchor="middle"
        fill="#71717a"
        fontSize="10"
      >
        {detail}
      </text>
    </g>
  );
}

function WarehouseBox({
  x,
  y,
  w,
  h,
}: {
  x: number;
  y: number;
  w: number;
  h: number;
}) {
  const cx = x + w / 2;
  // Three inner pills, evenly spaced
  const pillH = 50;
  const pillX = x + 16;
  const pillW = w - 32;
  const pillsTop = y + 90;
  const pillGap = 16;
  const pills = [
    "Raw layer",
    "Staging (cleaned)",
    "Marts (business-ready)",
  ];

  return (
    <g>
      <rect
        x={x}
        y={y}
        width={w}
        height={h}
        rx={6}
        fill="url(#cardGrad)"
        stroke="#1f1f23"
        strokeWidth={1}
      />
      <text
        x={cx}
        y={y + 30}
        textAnchor="middle"
        fill="#fafafa"
        fontSize="14"
        fontWeight="600"
      >
        Data Warehouse
      </text>
      <text
        x={cx}
        y={y + 52}
        textAnchor="middle"
        fill="#a1a1aa"
        fontSize="11"
      >
        Snowflake / BigQuery
      </text>

      {pills.map((label, i) => {
        const py = pillsTop + i * (pillH + pillGap);
        return (
          <g key={label}>
            <rect
              x={pillX}
              y={py}
              width={pillW}
              height={pillH}
              rx={4}
              fill="rgba(255, 255, 255, 0.03)"
              stroke="#27272a"
              strokeWidth={1}
            />
            <text
              x={pillX + pillW / 2}
              y={py + pillH / 2 + 4}
              textAnchor="middle"
              fill="#d4d4d8"
              fontSize="12"
              fontWeight="500"
            >
              {label}
            </text>
          </g>
        );
      })}
    </g>
  );
}

function Arrow({ d }: { d: string }) {
  return (
    <path
      d={d}
      stroke="#8b5cf6"
      strokeWidth={1.5}
      fill="none"
      markerEnd="url(#arrow)"
    />
  );
}
