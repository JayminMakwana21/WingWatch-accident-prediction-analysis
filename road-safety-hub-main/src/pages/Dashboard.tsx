import { useDataset } from '@/contexts/DatasetContext';
import { motion } from 'framer-motion';
import { useMemo } from 'react';
import {
    Bar,
    BarChart,
    CartesianGrid,
    Cell,
    LabelList,
    Legend,
    Line,
    LineChart,
    Pie,
    PieChart,
    ResponsiveContainer,
    Scatter,
    ScatterChart,
    Tooltip,
    XAxis,
    YAxis,
} from 'recharts';

type SeverityType = 'Minor' | 'Serious' | 'Fatal';

type BoxStats = {
  name: SeverityType;
  min: number;
  q1: number;
  median: number;
  q3: number;
  max: number;
  iqr: number;
};

const CHART_COLORS = {
  minor: '#2dd4bf',
  serious: '#f59e0b',
  fatal: '#ef4444',
  line: '#38bdf8',
  bar: '#60a5fa',
  cardBorder: 'rgba(148, 163, 184, 0.20)',
  grid: '#25324f',
  text: '#9fb2d4',
};

const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

const STATE_LAYOUT = [
  { state: 'Rajasthan', x: 8, y: 10 },
  { state: 'Delhi', x: 34, y: 8 },
  { state: 'Haryana', x: 26, y: 17 },
  { state: 'Uttar Pradesh', x: 46, y: 20 },
  { state: 'Gujarat', x: 4, y: 38 },
  { state: 'Madhya Pradesh', x: 29, y: 38 },
  { state: 'Bihar', x: 60, y: 38 },
  { state: 'Maharashtra', x: 15, y: 62 },
  { state: 'Jharkhand', x: 54, y: 57 },
  { state: 'West Bengal', x: 70, y: 57 },
];

function normalizeSeverity(value: unknown): SeverityType {
  if (value === 'Fatal' || value === 'Serious') return value;
  return 'Minor';
}

function severityScore(severity: SeverityType): number {
  if (severity === 'Fatal') return 3;
  if (severity === 'Serious') return 2;
  return 1;
}

function pickState(lat: number, lng: number): string {
  if (lat < 22 && lng < 74) return 'Maharashtra';
  if (lat < 23.2 && lng >= 74) return 'Madhya Pradesh';
  if (lat < 24 && lng >= 77.2) return 'Jharkhand';
  if (lat >= 24 && lng > 78) return 'West Bengal';
  if (lat >= 26.5 && lng < 74.5) return 'Rajasthan';
  if (lat >= 26.5 && lng >= 74.5 && lng < 76.2) return 'Haryana';
  if (lat >= 26.8 && lng >= 76.2) return 'Delhi';
  if (lat >= 24.5 && lng >= 76.2 && lng < 78.2) return 'Uttar Pradesh';
  if (lat >= 23 && lng < 73.8) return 'Gujarat';
  return 'Bihar';
}

function quantile(sorted: number[], q: number): number {
  if (!sorted.length) return 0;
  const pos = (sorted.length - 1) * q;
  const base = Math.floor(pos);
  const rest = pos - base;
  if (sorted[base + 1] !== undefined) {
    return sorted[base] + rest * (sorted[base + 1] - sorted[base]);
  }
  return sorted[base];
}

function pearson(data: Array<Record<string, number>>, a: string, b: string): number {
  const values = data.filter((row) => Number.isFinite(row[a]) && Number.isFinite(row[b]));
  if (values.length < 2) return 0;

  const meanA = values.reduce((sum, row) => sum + row[a], 0) / values.length;
  const meanB = values.reduce((sum, row) => sum + row[b], 0) / values.length;

  let numerator = 0;
  let denominatorA = 0;
  let denominatorB = 0;

  values.forEach((row) => {
    const da = row[a] - meanA;
    const db = row[b] - meanB;
    numerator += da * db;
    denominatorA += da * da;
    denominatorB += db * db;
  });

  if (denominatorA === 0 || denominatorB === 0) return 0;
  return numerator / Math.sqrt(denominatorA * denominatorB);
}

function formatMonthLabel(key: string): string {
  const [year, month] = key.split('-');
  const m = Number(month);
  return `${MONTH_NAMES[m - 1]} ${year}`;
}

function CustomTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: Array<{ dataKey: string; color: string; name: string; value: number | string }>;
  label?: string;
}) {
  if (!active || !payload?.length) return null;

  return (
    <div className="rounded-lg border border-slate-700/70 bg-slate-900/95 px-3 py-2 text-xs text-slate-200 shadow-lg">
      <p className="mb-1 font-semibold text-white">{label}</p>
      {payload.map((item) => (
        <p key={item.dataKey} className="flex items-center gap-2">
          <span className="inline-block h-2 w-2 rounded-full" style={{ backgroundColor: item.color }} />
          <span>{item.name}: {Number(item.value).toLocaleString()}</span>
        </p>
      ))}
    </div>
  );
}

function Card({ title, subtitle, children, index }: { title: string; subtitle: string; children: React.ReactNode; index: number }) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.04, duration: 0.45 }}
      className="rounded-2xl border bg-slate-950/55 p-4 backdrop-blur-xl"
      style={{ borderColor: CHART_COLORS.cardBorder, boxShadow: '0 10px 35px rgba(0, 0, 0, 0.24)' }}
    >
      <h3 className="text-sm font-semibold text-slate-100">{title}</h3>
      <p className="mb-3 text-xs text-slate-400">{subtitle}</p>
      <div className="h-80">{children}</div>
    </motion.section>
  );
}

function ChoroplethTiles({ data }: { data: Array<{ state: string; accidents: number }> }) {
  const max = Math.max(...data.map((d) => d.accidents), 1);
  const lookup = Object.fromEntries(data.map((d) => [d.state, d.accidents]));

  return (
    <div className="relative mx-auto h-full max-w-xl rounded-xl border border-slate-700/50 bg-slate-900/60 p-3">
      <div className="absolute left-3 top-3 text-[11px] text-slate-300">State-wise intensity map</div>
      <svg viewBox="0 0 100 90" className="h-full w-full">
        {STATE_LAYOUT.map((item) => {
          const count = lookup[item.state] ?? 0;
          const ratio = count / max;
          const fill = `rgba(${Math.round(239 - ratio * 80)}, ${Math.round(68 + ratio * 90)}, ${Math.round(68 + ratio * 160)}, ${0.30 + ratio * 0.70})`;

          return (
            <g key={item.state}>
              <rect x={item.x} y={item.y} width="22" height="16" rx="3" fill={fill} stroke="rgba(226,232,240,0.42)" />
              <text x={item.x + 11} y={item.y + 7} textAnchor="middle" fill="#f8fafc" fontSize="3.2" fontWeight="700">
                {item.state}
              </text>
              <text x={item.x + 11} y={item.y + 12} textAnchor="middle" fill="#dbeafe" fontSize="4.1" fontWeight="700">
                {count}
              </text>
              <title>{`${item.state}: ${count.toLocaleString()} accidents`}</title>
            </g>
          );
        })}
      </svg>
    </div>
  );
}

function Heatmap({ data, years }: { data: Record<string, number>; years: number[] }) {
  const maxValue = Math.max(...Object.values(data), 1);

  return (
    <div className="h-full overflow-auto rounded-xl border border-slate-700/50 bg-slate-900/55 p-3">
      <div className="grid grid-cols-[120px_repeat(12,minmax(48px,1fr))] gap-1 text-xs">
        <div className="p-2 text-slate-300">Year / Month</div>
        {MONTH_NAMES.map((month) => (
          <div key={month} className="p-2 text-center font-semibold text-slate-200">{month}</div>
        ))}

        {years.map((year) => (
          <>
            <div key={`${year}-name`} className="rounded-md bg-slate-800/70 p-2 font-semibold text-slate-100">{year}</div>
            {MONTH_NAMES.map((_, monthIdx) => {
              const key = `${year}-${String(monthIdx + 1).padStart(2, '0')}`;
              const value = data[key] ?? 0;
              const ratio = value / maxValue;
              return (
                <div
                  key={key}
                  className="flex items-center justify-center rounded-md border border-slate-600/45 text-[11px] font-semibold text-slate-100"
                  style={{ background: `linear-gradient(135deg, rgba(30,41,59,0.65), rgba(${Math.round(59 + ratio * 180)}, ${Math.round(130 + ratio * 70)}, 246, ${0.25 + ratio * 0.75}))` }}
                  title={`${year} ${MONTH_NAMES[monthIdx]}: ${value.toLocaleString()} accidents`}
                >
                  {value}
                </div>
              );
            })}
          </>
        ))}
      </div>
    </div>
  );
}

export default function Dashboard() {
  const { data } = useDataset();

  const normalized = useMemo(() => {
    return data.map((row) => {
      const severity = normalizeSeverity(row.severity);
      const lat = Number(row.lat) || 0;
      const lng = Number(row.lng) || 0;
      const speed = Number(row.speed) || 0;
      const crashForce = Number(row.crashForce) || 0;
      const timeOfDay = Number(row.timeOfDay) || 0;
      const alcohol = row.alcoholInvolved ? 1 : 0;
      const date = typeof row.date === 'string' ? row.date : '2025-01-01';

      return {
        severity,
        speed,
        crashForce,
        timeOfDay,
        alcohol,
        date,
        vehicleType: String(row.vehicleType || 'Others'),
        state: pickState(lat, lng),
      };
    });
  }, [data]);

  const totalAccidents = normalized.length;

  const trendLineData = useMemo(() => {
    const counts: Record<string, number> = {};
    normalized.forEach((row) => {
      const key = row.date.slice(0, 7);
      counts[key] = (counts[key] || 0) + 1;
    });

    return Object.keys(counts)
      .sort((a, b) => a.localeCompare(b))
      .map((key) => ({
        key,
        month: formatMonthLabel(key),
        accidents: counts[key],
      }));
  }, [normalized]);

  const stateBarData = useMemo(() => {
    const counts: Record<string, number> = {};
    normalized.forEach((row) => {
      counts[row.state] = (counts[row.state] || 0) + 1;
    });

    return Object.entries(counts)
      .map(([state, accidents]) => ({ state, accidents }))
      .sort((a, b) => b.accidents - a.accidents);
  }, [normalized]);

  const severityPieData = useMemo(() => {
    const counts: Record<SeverityType, number> = { Minor: 0, Serious: 0, Fatal: 0 };
    normalized.forEach((row) => {
      counts[row.severity] += 1;
    });

    return [
      { name: 'Minor', value: counts.Minor, color: CHART_COLORS.minor },
      { name: 'Serious', value: counts.Serious, color: CHART_COLORS.serious },
      { name: 'Fatal', value: counts.Fatal, color: CHART_COLORS.fatal },
    ];
  }, [normalized]);

  const vehicleSeverityData = useMemo(() => {
    const map: Record<string, { vehicleType: string; Minor: number; Serious: number; Fatal: number; total: number }> = {};

    normalized.forEach((row) => {
      if (!map[row.vehicleType]) {
        map[row.vehicleType] = { vehicleType: row.vehicleType, Minor: 0, Serious: 0, Fatal: 0, total: 0 };
      }
      map[row.vehicleType][row.severity] += 1;
      map[row.vehicleType].total += 1;
    });

    return Object.values(map)
      .sort((a, b) => b.total - a.total)
      .slice(0, 7);
  }, [normalized]);

  const speedScatterData = useMemo(() => {
    return normalized.slice(0, 500).map((row) => ({
      speed: row.speed,
      severityScore: severityScore(row.severity),
      severity: row.severity,
      crashForce: row.crashForce,
    }));
  }, [normalized]);

  const hourHistogramData = useMemo(() => {
    const bins = Array.from({ length: 24 }, (_, hour) => ({ hour, accidents: 0 }));
    normalized.forEach((row) => {
      const hour = Math.max(0, Math.min(23, Math.floor(row.timeOfDay)));
      bins[hour].accidents += 1;
    });
    return bins;
  }, [normalized]);

  const heatmapData = useMemo(() => {
    const counts: Record<string, number> = {};
    normalized.forEach((row) => {
      const key = row.date.slice(0, 7);
      counts[key] = (counts[key] || 0) + 1;
    });
    return counts;
  }, [normalized]);

  const heatmapYears = useMemo(() => {
    const years = new Set<number>();
    Object.keys(heatmapData).forEach((key) => years.add(Number(key.slice(0, 4))));
    return Array.from(years).sort((a, b) => a - b);
  }, [heatmapData]);

  const crashForceBoxData: BoxStats[] = useMemo(() => {
    const groups: Record<SeverityType, number[]> = { Minor: [], Serious: [], Fatal: [] };
    normalized.forEach((row) => {
      groups[row.severity].push(row.crashForce);
    });

    return (Object.keys(groups) as SeverityType[]).map((severity) => {
      const sorted = groups[severity].sort((a, b) => a - b);
      const min = sorted[0] ?? 0;
      const max = sorted[sorted.length - 1] ?? 0;
      const q1 = quantile(sorted, 0.25);
      const median = quantile(sorted, 0.5);
      const q3 = quantile(sorted, 0.75);

      return {
        name: severity,
        min: Number(min.toFixed(2)),
        q1: Number(q1.toFixed(2)),
        median: Number(median.toFixed(2)),
        q3: Number(q3.toFixed(2)),
        max: Number(max.toFixed(2)),
        iqr: Number((q3 - q1).toFixed(2)),
      };
    });
  }, [normalized]);

  const correlationMatrix = useMemo(() => {
    const rows = normalized.map((row) => ({
      speed: row.speed,
      crashForce: row.crashForce,
      timeOfDay: row.timeOfDay,
      severityScore: severityScore(row.severity),
      alcohol: row.alcohol,
    }));

    const features = ['speed', 'crashForce', 'timeOfDay', 'severityScore', 'alcohol'];

    return features.map((r) => ({
      feature: r,
      cells: features.map((c) => ({
        feature: c,
        value: Number(pearson(rows, r, c).toFixed(2)),
      })),
    }));
  }, [normalized]);

  const topHotspots = stateBarData.slice(0, 10);

  return (
    <div className="space-y-5 pb-8">
      <section className="relative overflow-hidden rounded-2xl border border-sky-400/20 bg-gradient-to-br from-slate-950 via-slate-900 to-slate-800 px-6 py-7">
        <div className="pointer-events-none absolute -right-16 -top-14 h-52 w-52 rounded-full bg-sky-400/20 blur-3xl" />
        <div className="pointer-events-none absolute -left-16 -bottom-16 h-52 w-52 rounded-full bg-emerald-400/20 blur-3xl" />

        <h1 className="text-2xl font-bold tracking-tight text-white md:text-3xl">Road Safety Intelligence Dashboard</h1>
        <p className="mt-2 max-w-2xl text-sm text-slate-300">
          Professional accident analytics with trend, hotspot, severity, and risk-correlation insights.
          Every chart includes exact values and hover details.
        </p>

        <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div className="rounded-xl border border-sky-300/20 bg-slate-900/65 p-3">
            <p className="text-xs text-slate-400">Total Accidents</p>
            <p className="text-2xl font-bold text-sky-300">{totalAccidents.toLocaleString()}</p>
          </div>
          <div className="rounded-xl border border-amber-300/20 bg-slate-900/65 p-3">
            <p className="text-xs text-slate-400">Top State/Region</p>
            <p className="text-2xl font-bold text-amber-300">{stateBarData[0]?.state ?? 'N/A'}</p>
          </div>
          <div className="rounded-xl border border-rose-300/20 bg-slate-900/65 p-3">
            <p className="text-xs text-slate-400">Highest Severity Share</p>
            <p className="text-2xl font-bold text-rose-300">
              {severityPieData.sort((a, b) => b.value - a.value)[0]?.name ?? 'N/A'}
            </p>
          </div>
        </div>
      </section>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <Card title="1) Accidents Over Time (Monthly/Yearly Trend)" subtitle="Line chart with monthly counts and value labels" index={0}>
          <ResponsiveContainer>
            <LineChart data={trendLineData}>
              <CartesianGrid strokeDasharray="3 3" stroke={CHART_COLORS.grid} />
              <XAxis dataKey="month" tick={{ fill: CHART_COLORS.text, fontSize: 10 }} angle={-35} textAnchor="end" height={56} />
              <YAxis tick={{ fill: CHART_COLORS.text, fontSize: 10 }} />
              <Tooltip content={<CustomTooltip />} />
              <Line type="monotone" dataKey="accidents" name="Accidents" stroke={CHART_COLORS.line} strokeWidth={3} dot={{ r: 4 }}>
                <LabelList dataKey="accidents" position="top" fill="#dbeafe" fontSize={10} formatter={(v: number) => v.toLocaleString()} />
              </Line>
            </LineChart>
          </ResponsiveContainer>
        </Card>

        <Card title="2) Accidents by State / Region" subtitle="Bar chart with exact totals on bars" index={1}>
          <ResponsiveContainer>
            <BarChart data={stateBarData}>
              <CartesianGrid strokeDasharray="3 3" stroke={CHART_COLORS.grid} vertical={false} />
              <XAxis dataKey="state" tick={{ fill: CHART_COLORS.text, fontSize: 10 }} interval={0} angle={-20} textAnchor="end" height={54} />
              <YAxis tick={{ fill: CHART_COLORS.text, fontSize: 10 }} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="accidents" name="Accidents" fill="url(#stateBarGrad)" radius={[7, 7, 0, 0]}>
                <LabelList dataKey="accidents" position="top" fill="#e2e8f0" fontSize={10} formatter={(v: number) => v.toLocaleString()} />
              </Bar>
              <defs>
                <linearGradient id="stateBarGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#60a5fa" />
                  <stop offset="100%" stopColor="#2563eb" />
                </linearGradient>
              </defs>
            </BarChart>
          </ResponsiveContainer>
        </Card>

        <Card title="3) Accident Severity Distribution" subtitle="Pie chart with percentage and count" index={2}>
          <ResponsiveContainer>
            <PieChart>
              <Pie
                data={severityPieData}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                outerRadius={110}
                label={({ name, value }) => `${name}: ${Number(value).toLocaleString()}`}
                labelLine={false}
              >
                {severityPieData.map((entry) => (
                  <Cell key={entry.name} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </Card>

        <Card title="4) Accidents by Vehicle Type & Severity" subtitle="Stacked bar chart with totals per vehicle" index={3}>
          <ResponsiveContainer>
            <BarChart data={vehicleSeverityData}>
              <CartesianGrid strokeDasharray="3 3" stroke={CHART_COLORS.grid} vertical={false} />
              <XAxis dataKey="vehicleType" tick={{ fill: CHART_COLORS.text, fontSize: 10 }} />
              <YAxis tick={{ fill: CHART_COLORS.text, fontSize: 10 }} />
              <Tooltip content={<CustomTooltip />} />
              <Legend />
              <Bar dataKey="Minor" stackId="severity" fill={CHART_COLORS.minor} />
              <Bar dataKey="Serious" stackId="severity" fill={CHART_COLORS.serious} />
              <Bar dataKey="Fatal" stackId="severity" fill={CHART_COLORS.fatal}>
                <LabelList dataKey="total" position="top" fill="#e2e8f0" fontSize={10} formatter={(v: number) => v.toLocaleString()} />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </Card>

        <Card title="5) State-wise Accident Hotspots" subtitle="Choropleth-style geo tile map with hotspot counts" index={4}>
          <ChoroplethTiles data={topHotspots} />
        </Card>

        <Card title="6) Speed vs Severity Analysis" subtitle="Scatter plot (Speed vs Severity score)" index={5}>
          <ResponsiveContainer>
            <ScatterChart>
              <CartesianGrid strokeDasharray="3 3" stroke={CHART_COLORS.grid} />
              <XAxis type="number" dataKey="speed" name="Speed" unit=" km/h" tick={{ fill: CHART_COLORS.text, fontSize: 10 }} />
              <YAxis type="number" dataKey="severityScore" name="Severity Score" domain={[0.5, 3.5]} tick={{ fill: CHART_COLORS.text, fontSize: 10 }} />
              <Tooltip
                cursor={{ strokeDasharray: '3 3' }}
                formatter={(value: number | string, name: string, item: { payload: { severity: string } }) => {
                  if (name === 'severityScore') return [item.payload.severity, 'Severity'];
                  return [Number(value).toLocaleString(), name === 'speed' ? 'Speed (km/h)' : 'Crash Force'];
                }}
                labelFormatter={() => 'Data Point'}
                contentStyle={{ background: '#0f172acc', borderColor: '#334155', color: '#e2e8f0', borderRadius: 10 }}
              />
              <Scatter name="Minor" data={speedScatterData.filter((d) => d.severity === 'Minor')} fill={CHART_COLORS.minor} />
              <Scatter name="Serious" data={speedScatterData.filter((d) => d.severity === 'Serious')} fill={CHART_COLORS.serious} />
              <Scatter name="Fatal" data={speedScatterData.filter((d) => d.severity === 'Fatal')} fill={CHART_COLORS.fatal} />
              <Legend />
            </ScatterChart>
          </ResponsiveContainer>
        </Card>

        <Card title="7) Accidents by Time of Day (Hour-wise)" subtitle="Histogram with hour-wise counts" index={6}>
          <ResponsiveContainer>
            <BarChart data={hourHistogramData}>
              <CartesianGrid strokeDasharray="3 3" stroke={CHART_COLORS.grid} vertical={false} />
              <XAxis dataKey="hour" tick={{ fill: CHART_COLORS.text, fontSize: 10 }} />
              <YAxis tick={{ fill: CHART_COLORS.text, fontSize: 10 }} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="accidents" fill="url(#hourGrad)" name="Accidents" radius={[4, 4, 0, 0]}>
                <LabelList dataKey="accidents" position="top" fill="#dbeafe" fontSize={9} formatter={(v: number) => v.toLocaleString()} />
              </Bar>
              <defs>
                <linearGradient id="hourGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#2dd4bf" />
                  <stop offset="100%" stopColor="#0f766e" />
                </linearGradient>
              </defs>
            </BarChart>
          </ResponsiveContainer>
        </Card>

        <Card title="8) Monthly Accident Intensity (Year vs Month)" subtitle="Heatmap with exact values in every cell" index={7}>
          <Heatmap data={heatmapData} years={heatmapYears} />
        </Card>

        <Card title="9) Crash Force Distribution" subtitle="Box plot by severity (Min, Q1, Median, Q3, Max)" index={8}>
          <ResponsiveContainer>
            <BarChart data={crashForceBoxData}>
              <CartesianGrid strokeDasharray="3 3" stroke={CHART_COLORS.grid} />
              <XAxis dataKey="name" tick={{ fill: CHART_COLORS.text, fontSize: 10 }} />
              <YAxis tick={{ fill: CHART_COLORS.text, fontSize: 10 }} />
              <Tooltip
                content={({ active, payload }) => {
                  if (!active || !payload?.length) return null;
                  const d = payload[0].payload as BoxStats;
                  return (
                    <div className="rounded-lg border border-slate-700/70 bg-slate-900/95 px-3 py-2 text-xs text-slate-200 shadow-lg">
                      <p className="font-semibold text-white">{d.name}</p>
                      <p>Min: {d.min}</p>
                      <p>Q1: {d.q1}</p>
                      <p>Median: {d.median}</p>
                      <p>Q3: {d.q3}</p>
                      <p>Max: {d.max}</p>
                    </div>
                  );
                }}
              />
              <Bar dataKey="q1" stackId="box" fill="transparent" />
              <Bar dataKey="iqr" stackId="box" radius={[5, 5, 5, 5]} name="IQR">
                {crashForceBoxData.map((row) => (
                  <Cell
                    key={row.name}
                    fill={row.name === 'Fatal' ? CHART_COLORS.fatal : row.name === 'Serious' ? CHART_COLORS.serious : CHART_COLORS.minor}
                    fillOpacity={0.55}
                  />
                ))}
                <LabelList dataKey="median" position="insideTop" fill="#f8fafc" fontSize={10} formatter={(v: number) => `Med ${v}`} />
              </Bar>
              <Line dataKey="min" stroke="#94a3b8" strokeDasharray="5 3" dot={{ r: 3 }} name="Min" />
              <Line dataKey="max" stroke="#cbd5e1" strokeDasharray="5 3" dot={{ r: 3 }} name="Max" />
              <Legend />
            </BarChart>
          </ResponsiveContainer>
        </Card>

        <Card title="10) Correlation Between Features" subtitle="Correlation matrix (Speed, Force, Severity, Time, Alcohol)" index={9}>
          <div className="h-full overflow-auto rounded-xl border border-slate-700/50 bg-slate-900/55 p-3">
            <div className="grid grid-cols-6 gap-1 text-xs">
              <div className="p-2" />
              {correlationMatrix[0]?.cells.map((c) => (
                <div key={`h-${c.feature}`} className="p-2 text-center font-semibold capitalize text-slate-200">{c.feature}</div>
              ))}

              {correlationMatrix.map((row) => (
                <>
                  <div key={`r-${row.feature}`} className="rounded-md bg-slate-800/70 p-2 font-semibold capitalize text-slate-100">{row.feature}</div>
                  {row.cells.map((cell) => {
                    const value = cell.value;
                    const intensity = Math.min(1, Math.abs(value));
                    const blue = value >= 0;
                    const bg = blue
                      ? `rgba(59,130,246,${0.20 + intensity * 0.75})`
                      : `rgba(239,68,68,${0.20 + intensity * 0.75})`;
                    return (
                      <div
                        key={`${row.feature}-${cell.feature}`}
                        className="flex items-center justify-center rounded-md border border-slate-600/45 p-2 font-semibold text-slate-100"
                        style={{ background: bg }}
                        title={`${row.feature} vs ${cell.feature}: ${value}`}
                      >
                        {value}
                      </div>
                    );
                  })}
                </>
              ))}
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
