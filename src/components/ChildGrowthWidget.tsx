'use client';

import { useEffect, useState, useMemo } from 'react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
} from 'recharts';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui';
import { TrendingUp, Ruler, Weight, ChevronDown, Activity } from 'lucide-react';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface GrowthRecord {
  id: string;
  recordDate: string;
  weight: number | string | null;
  height: number | string | null;
  headCircumference: number | string | null;
  bmi: number | string | null;
  notes: string | null;
}

interface ChildWithGrowth {
  id: string;
  name: string;
  gender: 'MALE' | 'FEMALE';
  birthDate: string;
  birthWeight: number | string | null;
  birthHeight: number | string | null;
  growthRecords: GrowthRecord[];
}

interface ChartPoint {
  label: string;
  weight: number | null;
  height: number | null;
  bmi: number | null;
  ageMonths: number;
}

type Metric = 'weight' | 'height' | 'bmi';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function toNum(v: number | string | null | undefined): number | null {
  if (v == null) return null;
  const n = typeof v === 'string' ? parseFloat(v) : v;
  return isNaN(n) ? null : n;
}

function monthsDiff(from: Date, to: Date): number {
  return (
    (to.getFullYear() - from.getFullYear()) * 12 +
    (to.getMonth() - from.getMonth())
  );
}

function ageLabel(months: number): string {
  if (months <= 0) return 'Birth';
  if (months < 12) return `${months}M`;
  const y = Math.floor(months / 12);
  const m = months % 12;
  return m === 0 ? `${y}Y` : `${y}Y${m}M`;
}

function calcBmi(weight: number | null, height: number | null): number | null {
  if (!weight || !height || height === 0) return null;
  const heightM = height / 100;
  return parseFloat((weight / (heightM * heightM)).toFixed(1));
}

function getAgeString(birthDate: string): string {
  const birth = new Date(birthDate);
  const now = new Date();
  const totalMonths = monthsDiff(birth, now);
  if (totalMonths < 1) return 'Newborn';
  if (totalMonths < 12) return `${totalMonths} month${totalMonths > 1 ? 's' : ''} old`;
  const years = Math.floor(totalMonths / 12);
  const months = totalMonths % 12;
  if (months === 0) return `${years} year${years > 1 ? 's' : ''} old`;
  return `${years}y ${months}m old`;
}

// ---------------------------------------------------------------------------
// Metric config
// ---------------------------------------------------------------------------

const METRIC_CONFIG: Record<
  Metric,
  {
    label: string;
    unit: string;
    color: string;
    gradientId: string;
    gradientFrom: string;
    gradientTo: string;
    icon: React.ReactNode;
    badgeBg: string;
    badgeText: string;
    badgeBorder: string;
    iconBg: string;
    iconColor: string;
  }
> = {
  weight: {
    label: 'Weight',
    unit: 'kg',
    color: '#14b8a6',
    gradientId: 'weightGrad',
    gradientFrom: 'rgba(20,184,166,0.28)',
    gradientTo: 'rgba(20,184,166,0.02)',
    icon: <Weight className="h-3.5 w-3.5" />,
    badgeBg: 'bg-emerald-50',
    badgeText: 'text-emerald-700',
    badgeBorder: 'border-emerald-200',
    iconBg: 'bg-emerald-100',
    iconColor: 'text-emerald-600',
  },
  height: {
    label: 'Height',
    unit: 'cm',
    color: '#38bdf8',
    gradientId: 'heightGrad',
    gradientFrom: 'rgba(56,189,248,0.28)',
    gradientTo: 'rgba(56,189,248,0.02)',
    icon: <Ruler className="h-3.5 w-3.5" />,
    badgeBg: 'bg-sky-50',
    badgeText: 'text-sky-700',
    badgeBorder: 'border-sky-200',
    iconBg: 'bg-sky-100',
    iconColor: 'text-sky-600',
  },
  bmi: {
    label: 'BMI',
    unit: '',
    color: '#a78bfa',
    gradientId: 'bmiGrad',
    gradientFrom: 'rgba(167,139,250,0.28)',
    gradientTo: 'rgba(167,139,250,0.02)',
    icon: <Activity className="h-3.5 w-3.5" />,
    badgeBg: 'bg-violet-50',
    badgeText: 'text-violet-700',
    badgeBorder: 'border-violet-200',
    iconBg: 'bg-violet-100',
    iconColor: 'text-violet-600',
  },
};

// ---------------------------------------------------------------------------
// Custom Tooltip
// ---------------------------------------------------------------------------

function CustomTooltip({
  active,
  payload,
  label,
  metric,
}: {
  active?: boolean;
  payload?: { value?: number; payload?: ChartPoint }[];
  label?: string;
  metric: Metric;
}) {
  if (!active || !payload?.length) return null;
  const data = payload[0].payload;
  if (!data) return null;
  const cfg = METRIC_CONFIG[metric];

  return (
    <div className="bg-white/95 backdrop-blur-sm border border-gray-200 rounded-xl px-4 py-3 shadow-lg">
      <p className="text-xs font-semibold text-gray-500 mb-2">{label}</p>
      <div className="space-y-1.5">
        {data.weight != null && metric === 'weight' && (
          <div className="flex items-center gap-2 text-sm">
            <span className="h-2 w-2 rounded-full bg-teal-500 inline-block" />
            <span className="text-gray-500">Weight:</span>
            <span className="font-bold text-gray-900">{data.weight.toFixed(2)} kg</span>
          </div>
        )}
        {data.height != null && metric === 'height' && (
          <div className="flex items-center gap-2 text-sm">
            <span className="h-2 w-2 rounded-full bg-sky-400 inline-block" />
            <span className="text-gray-500">Height:</span>
            <span className="font-bold text-gray-900">{data.height.toFixed(1)} cm</span>
          </div>
        )}
        {data.bmi != null && metric === 'bmi' && (
          <div className="flex items-center gap-2 text-sm">
            <span className="h-2 w-2 rounded-full bg-violet-400 inline-block" />
            <span className="text-gray-500">BMI:</span>
            <span className="font-bold text-gray-900">{data.bmi.toFixed(1)}</span>
          </div>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Active Dot
// ---------------------------------------------------------------------------

function ActiveDot({ cx, cy, color }: { cx?: number; cy?: number; color: string }) {
  if (cx == null || cy == null) return null;
  return (
    <g>
      <circle cx={cx} cy={cy} r={9} fill={color} fillOpacity={0.15} />
      <circle cx={cx} cy={cy} r={5} fill="#fff" stroke={color} strokeWidth={2.5} />
    </g>
  );
}

// ---------------------------------------------------------------------------
// Skeleton
// ---------------------------------------------------------------------------

function SkeletonLoader() {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <div className="h-5 w-5 rounded bg-gray-200 animate-pulse" />
          <div className="h-5 w-44 rounded bg-gray-200 animate-pulse" />
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex gap-2 mb-5">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-9 w-24 rounded-lg bg-gray-200 animate-pulse" />
          ))}
        </div>
        <div className="h-[260px] w-full rounded-xl bg-gray-100 animate-pulse" />
      </CardContent>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Summary Stat Card
// ---------------------------------------------------------------------------

function StatPill({
  icon,
  label,
  value,
  sub,
  bg,
  text,
  border,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  sub?: string;
  bg: string;
  text: string;
  border: string;
}) {
  return (
    <div className={`flex items-center gap-3 px-4 py-3 rounded-xl border ${bg} ${border}`}>
      <span className={text}>{icon}</span>
      <div>
        <p className={`text-xs font-medium ${text} opacity-70`}>{label}</p>
        <p className={`text-sm font-bold ${text}`}>{value}</p>
        {sub && <p className={`text-xs ${text} opacity-60`}>{sub}</p>}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------

export default function ChildGrowthWidget() {
  const [children, setChildren] = useState<ChildWithGrowth[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [metric, setMetric] = useState<Metric>('weight');

  useEffect(() => {
    const fetchChildren = async () => {
      try {
        const res = await fetch('/api/children');
        const json = await res.json();
        const data: ChildWithGrowth[] = json.data ?? [];
        setChildren(data);
        if (data.length > 0) setSelectedId(data[0].id);
      } catch {
        console.error('ChildGrowthWidget: failed to load children');
      } finally {
        setLoading(false);
      }
    };
    fetchChildren();
  }, []);

  const child = useMemo(
    () => children.find((c) => c.id === selectedId) ?? null,
    [children, selectedId],
  );

  // Build chart data with BMI
  const chartData = useMemo<ChartPoint[]>(() => {
    if (!child) return [];
    const birthDate = new Date(child.birthDate);
    const birthW = toNum(child.birthWeight);
    const birthH = toNum(child.birthHeight);
    const birthBmi = calcBmi(birthW, birthH);

    const points: ChartPoint[] = [
      { label: 'Birth', weight: birthW, height: birthH, bmi: birthBmi, ageMonths: 0 },
    ];

    for (const rec of child.growthRecords) {
      const recDate = new Date(rec.recordDate);
      const months = monthsDiff(birthDate, recDate);
      if (months <= 0) continue;
      const w = toNum(rec.weight);
      const h = toNum(rec.height);
      const bmi = toNum(rec.bmi) ?? calcBmi(w, h);
      points.push({ label: ageLabel(months), weight: w, height: h, bmi, ageMonths: months });
    }

    points.sort((a, b) => a.ageMonths - b.ageMonths);
    return points;
  }, [child]);

  // Velocity / gain stats
  const stats = useMemo(() => {
    if (chartData.length < 2) return null;
    const first = chartData[0];
    const last = chartData[chartData.length - 1];
    return {
      weightGain:
        first.weight != null && last.weight != null
          ? +(last.weight - first.weight).toFixed(2)
          : null,
      heightGain:
        first.height != null && last.height != null
          ? +(last.height - first.height).toFixed(1)
          : null,
      currentBmi: last.bmi,
      latestWeight: last.weight,
      latestHeight: last.height,
    };
  }, [chartData]);

  const cfg = METRIC_CONFIG[metric];

  if (loading) return <SkeletonLoader />;
  if (children.length === 0) return null;

  const ageString = child ? getAgeString(child.birthDate) : '';

  return (
    <Card className="overflow-visible">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between flex-wrap gap-3">
          {/* Title + child info */}
          <div className="flex items-center gap-3">
            <div className="p-1.5 bg-teal-100 rounded-lg">
              <TrendingUp className="h-5 w-5 text-teal-600" />
            </div>
            <div>
              <CardTitle className="leading-none">Child Growth Tracker</CardTitle>
              {child && (
                <p className="text-xs text-gray-500 mt-0.5">
                  <span className="font-medium text-gray-700">{child.name}</span>
                  {' · '}
                  <span>{ageString}</span>
                  {' · '}
                  <span className={child.gender === 'MALE' ? 'text-sky-600' : 'text-pink-500'}>
                    {child.gender === 'MALE' ? '♂ Male' : '♀ Female'}
                  </span>
                </p>
              )}
            </div>
          </div>

          {/* Child selector */}
          {children.length > 1 && (
            <div className="relative">
              <button
                type="button"
                onClick={() => setDropdownOpen((o) => !o)}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-50 hover:bg-gray-100 border border-gray-200 rounded-lg text-sm font-medium text-gray-700 transition-colors"
              >
                {child?.name ?? 'Select child'}
                <ChevronDown className="h-4 w-4 text-gray-400" />
              </button>
              {dropdownOpen && (
                <div className="absolute right-0 mt-1 w-52 bg-white border border-gray-200 rounded-lg shadow-lg z-30 py-1">
                  {children.map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => { setSelectedId(c.id); setDropdownOpen(false); }}
                      className={`w-full text-left px-4 py-2.5 text-sm hover:bg-teal-50 transition-colors ${
                        c.id === selectedId ? 'bg-teal-50 text-teal-700 font-medium' : 'text-gray-700'
                      }`}
                    >
                      <span className="font-medium">{c.name}</span>
                      <span className="block text-xs text-gray-400">{getAgeString(c.birthDate)}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </CardHeader>

      <CardContent>
        {/* Metric Toggle */}
        <div className="flex gap-2 mb-4 flex-wrap">
          {(['weight', 'height', 'bmi'] as Metric[]).map((m) => {
            const c = METRIC_CONFIG[m];
            const active = metric === m;
            return (
              <button
                key={m}
                type="button"
                onClick={() => setMetric(m)}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium border transition-all ${
                  active
                    ? `${c.badgeBg} ${c.badgeText} ${c.badgeBorder} shadow-sm`
                    : 'bg-gray-50 text-gray-500 border-gray-200 hover:bg-gray-100'
                }`}
              >
                <span className={active ? c.badgeText : 'text-gray-400'}>{c.icon}</span>
                {c.label}
                {active && <span className="text-xs opacity-70">({c.unit || 'index'})</span>}
              </button>
            );
          })}
        </div>

        {/* Summary pills */}
        {stats && (
          <div className="flex flex-wrap gap-2 mb-4">
            {stats.weightGain != null && (
              <StatPill
                icon={<Weight className="h-4 w-4" />}
                label="Weight gained"
                value={`+${stats.weightGain} kg`}
                sub={stats.latestWeight ? `Now ${stats.latestWeight.toFixed(1)} kg` : undefined}
                bg="bg-emerald-50"
                text="text-emerald-700"
                border="border-emerald-200"
              />
            )}
            {stats.heightGain != null && (
              <StatPill
                icon={<Ruler className="h-4 w-4" />}
                label="Height gained"
                value={`+${stats.heightGain} cm`}
                sub={stats.latestHeight ? `Now ${stats.latestHeight.toFixed(1)} cm` : undefined}
                bg="bg-sky-50"
                text="text-sky-700"
                border="border-sky-200"
              />
            )}
            {stats.currentBmi != null && (
              <StatPill
                icon={<Activity className="h-4 w-4" />}
                label="Current BMI"
                value={stats.currentBmi.toFixed(1)}
                bg="bg-violet-50"
                text="text-violet-700"
                border="border-violet-200"
              />
            )}
          </div>
        )}

        {/* Chart */}
        {chartData.length >= 2 ? (
          <ResponsiveContainer width="100%" height={260}>
            <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
              <defs>
                <linearGradient id={cfg.gradientId} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={cfg.color} stopOpacity={0.28} />
                  <stop offset="95%" stopColor={cfg.color} stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
              <XAxis
                dataKey="label"
                tick={{ fontSize: 11, fill: '#9ca3af' }}
                axisLine={{ stroke: '#e5e7eb' }}
                tickLine={false}
                dy={8}
              />
              <YAxis
                tick={{ fontSize: 11, fill: '#9ca3af' }}
                axisLine={false}
                tickLine={false}
                unit={cfg.unit ? ` ${cfg.unit}` : ''}
                width={cfg.unit === 'cm' ? 52 : 44}
                domain={['dataMin - 0.5', 'dataMax + 0.5']}
              />
              <Tooltip
                content={<CustomTooltip metric={metric} />}
                cursor={{ stroke: cfg.color, strokeWidth: 1, strokeDasharray: '4 4' }}
              />
              <Area
                type="monotone"
                dataKey={metric}
                stroke={cfg.color}
                strokeWidth={2.5}
                fill={`url(#${cfg.gradientId})`}
                dot={{ r: 4, fill: '#fff', stroke: cfg.color, strokeWidth: 2 }}
                activeDot={<ActiveDot color={cfg.color} />}
                connectNulls
              />
            </AreaChart>
          </ResponsiveContainer>
        ) : (
          <div className="flex flex-col items-center justify-center h-[260px] text-gray-400 bg-gray-50 rounded-xl border border-dashed border-gray-200">
            <TrendingUp className="h-10 w-10 mb-2 opacity-30" />
            <p className="text-sm font-medium text-gray-500">Not enough data yet</p>
            <p className="text-xs mt-1 text-gray-400">At least two measurements are needed to display a chart.</p>
          </div>
        )}

        {/* Data points count */}
        {chartData.length >= 2 && (
          <p className="text-xs text-gray-400 text-right mt-2">
            {chartData.length} measurement{chartData.length !== 1 ? 's' : ''} recorded
          </p>
        )}
      </CardContent>
    </Card>
  );
}