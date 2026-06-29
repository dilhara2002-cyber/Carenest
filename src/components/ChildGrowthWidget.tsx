'use client';

import { useEffect, useState, useMemo } from 'react';
import {
  ComposedChart,
  Area,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui';
import { TrendingUp, Ruler, Weight, ChevronDown, Activity, AlertTriangle } from 'lucide-react';
import type { ReferenceBand } from '@/lib/growthUtils';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface GrowthRecord {
  id: string;
  recordDate: string;
  ageMonths: number | null;
  correctedAgeMonths: number | null;
  weight: number | null;
  height: number | null;
  bmi: number | null;
  weightStatus: string | null;
  heightStatus: string | null;
  bmiStatus: string | null;
}

interface ChildInfo {
  id: string;
  name: string;
  gender: 'MALE' | 'FEMALE';
  birthDate: string;
  isPreterm: boolean;
  gestationalAgeWeeks: number | null;
  birthWeight: number | null;
  birthHeight: number | null;
}

interface GrowthApiResponse {
  child: ChildInfo;
  records: GrowthRecord[];
  referenceBands: ReferenceBand[];
}

// Child summary for the selector (fetched from /api/children)
interface ChildSummary {
  id: string;
  name: string;
  gender: 'MALE' | 'FEMALE';
  birthDate: string;
  isPreterm: boolean;
}

type Metric = 'weight' | 'height' | 'bmi';

// Combined chart data point — child's actual value + WHO band boundaries
interface ChartPoint {
  label: string;
  ageMonths: number;
  // Child's actual values
  actual: number | null;
  // WHO bands
  normalMin: number | null;
  normalMax: number | null;
  moderateMin: number | null;
  // Status for dot color
  status: string | null;
}

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
  const h = height / 100;
  return parseFloat((weight / (h * h)).toFixed(1));
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

// Get dot color based on WHO status
function statusToColor(status: string | null): string {
  if (status === 'SEVERE') return '#ef4444';   // red-500
  if (status === 'MODERATE') return '#eab308'; // yellow-500
  return '#22c55e';                            // green-500
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
    badgeBg: string;
    badgeText: string;
    badgeBorder: string;
    icon: React.ReactNode;
    // Keys into ReferenceBand
    normalMinKey: keyof ReferenceBand;
    normalMaxKey: keyof ReferenceBand;
    moderateMinKey: keyof ReferenceBand;
  }
> = {
  weight: {
    label: 'Weight',
    unit: 'kg',
    color: '#14b8a6',
    badgeBg: 'bg-emerald-50',
    badgeText: 'text-emerald-700',
    badgeBorder: 'border-emerald-200',
    icon: <Weight className="h-3.5 w-3.5" />,
    normalMinKey: 'weightNormalMin',
    normalMaxKey: 'weightNormalMax',
    moderateMinKey: 'weightModerateMin',
  },
  height: {
    label: 'Height',
    unit: 'cm',
    color: '#38bdf8',
    badgeBg: 'bg-sky-50',
    badgeText: 'text-sky-700',
    badgeBorder: 'border-sky-200',
    icon: <Ruler className="h-3.5 w-3.5" />,
    normalMinKey: 'heightNormalMin',
    normalMaxKey: 'heightNormalMax',
    moderateMinKey: 'heightModerateMin',
  },
  bmi: {
    label: 'BMI',
    unit: '',
    color: '#a78bfa',
    badgeBg: 'bg-violet-50',
    badgeText: 'text-violet-700',
    badgeBorder: 'border-violet-200',
    icon: <Activity className="h-3.5 w-3.5" />,
    normalMinKey: 'bmiNormalMin',
    normalMaxKey: 'bmiNormalMax',
    moderateMinKey: 'bmiModerateMin',
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
  payload?: { name?: string; value?: number; payload?: ChartPoint }[];
  label?: string;
  metric: Metric;
}) {
  if (!active || !payload?.length) return null;
  const cfg = METRIC_CONFIG[metric];
  const point = payload[0]?.payload;
  if (!point) return null;

  const actualEntry = payload.find((p) => p.name === 'actual');
  const actual = actualEntry?.value;
  const status = point.status;

  const statusLabel =
    status === 'SEVERE' ? '🔴 Severe Malnutrition' :
    status === 'MODERATE' ? '🟡 Moderate Concern' :
    status === 'NORMAL' ? '🟢 Normal' : null;

  return (
    <div className="bg-white/95 backdrop-blur-sm border border-gray-200 rounded-xl px-4 py-3 shadow-lg min-w-[160px]">
      <p className="text-xs font-semibold text-gray-500 mb-2">{label}</p>
      {actual != null && (
        <div className="flex items-center gap-2 text-sm mb-1">
          <span className="h-2 w-2 rounded-full inline-block" style={{ backgroundColor: cfg.color }} />
          <span className="text-gray-500">{cfg.label}:</span>
          <span className="font-bold text-gray-900">
            {actual.toFixed(cfg.unit === 'cm' ? 1 : 2)}{cfg.unit ? ` ${cfg.unit}` : ''}
          </span>
        </div>
      )}
      {statusLabel && (
        <p className="text-xs mt-1 font-medium text-gray-600">{statusLabel}</p>
      )}
      {point.normalMin != null && point.normalMax != null && (
        <p className="text-xs text-gray-400 mt-1">
          Normal: {point.normalMin.toFixed(1)}–{point.normalMax.toFixed(1)}{cfg.unit ? ` ${cfg.unit}` : ''}
        </p>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Custom Dot — colored by WHO status
// ---------------------------------------------------------------------------

function StatusDot(props: {
  cx?: number;
  cy?: number;
  payload?: ChartPoint;
}) {
  const { cx, cy, payload } = props;
  if (cx == null || cy == null || payload?.actual == null) return null;
  const color = statusToColor(payload.status);
  return (
    <g>
      <circle cx={cx} cy={cy} r={5} fill="#fff" stroke={color} strokeWidth={2.5} />
    </g>
  );
}

function ActiveStatusDot(props: {
  cx?: number;
  cy?: number;
  payload?: ChartPoint;
}) {
  const { cx, cy, payload } = props;
  if (cx == null || cy == null || payload?.actual == null) return null;
  const color = statusToColor(payload.status);
  return (
    <g>
      <circle cx={cx} cy={cy} r={9} fill={color} fillOpacity={0.2} />
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
        <div className="h-[280px] w-full rounded-xl bg-gray-100 animate-pulse" />
      </CardContent>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Stat Pill
// ---------------------------------------------------------------------------

function StatPill({
  icon, label, value, sub, bg, text, border,
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
  // Step 1: fetch child list for selector
  const [childList, setChildList] = useState<ChildSummary[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [listLoading, setListLoading] = useState(true);

  // Step 2: fetch detailed growth data for selected child
  const [growthData, setGrowthData] = useState<GrowthApiResponse | null>(null);
  const [growthLoading, setGrowthLoading] = useState(false);

  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [metric, setMetric] = useState<Metric>('weight');

  // Fetch child list
  useEffect(() => {
    const fetchList = async () => {
      try {
        const res = await fetch('/api/children');
        const json = await res.json();
        const data: ChildSummary[] = (json.data ?? []).map((c: any) => ({
          id: c.id,
          name: c.name,
          gender: c.gender,
          birthDate: c.birthDate,
          isPreterm: c.isPreterm ?? false,
        }));
        setChildList(data);
        if (data.length > 0) setSelectedId(data[0].id);
      } catch {
        console.error('ChildGrowthWidget: failed to load child list');
      } finally {
        setListLoading(false);
      }
    };
    fetchList();
  }, []);

  // Fetch growth data when selectedId changes
  useEffect(() => {
    if (!selectedId) return;
    const fetchGrowth = async () => {
      setGrowthLoading(true);
      try {
        const res = await fetch(`/api/children/${selectedId}/growth`);
        const json = await res.json();
        setGrowthData(json.data ?? null);
      } catch {
        console.error('ChildGrowthWidget: failed to load growth data');
      } finally {
        setGrowthLoading(false);
      }
    };
    fetchGrowth();
  }, [selectedId]);

  const cfg = METRIC_CONFIG[metric];

  // Build combined chart data — merge child records with WHO reference bands
  const chartData = useMemo<ChartPoint[]>(() => {
    if (!growthData) return [];
    const { child, records, referenceBands } = growthData;

    // Build a map of WHO bands by ageMonths for quick lookup
    const bandMap = new Map<number, ReferenceBand>();
    referenceBands.forEach((b) => bandMap.set(b.ageMonths, b));

    // Interpolate band value for any age
    const interpolateBand = (ageMonths: number, key: keyof ReferenceBand): number | null => {
      const sorted = referenceBands.slice().sort((a, b) => a.ageMonths - b.ageMonths);
      if (sorted.length === 0) return null;
      if (ageMonths <= sorted[0].ageMonths) return sorted[0][key] as number;
      if (ageMonths >= sorted[sorted.length - 1].ageMonths) return sorted[sorted.length - 1][key] as number;
      for (let i = 0; i < sorted.length - 1; i++) {
        if (ageMonths >= sorted[i].ageMonths && ageMonths <= sorted[i + 1].ageMonths) {
          const t = (ageMonths - sorted[i].ageMonths) / (sorted[i + 1].ageMonths - sorted[i].ageMonths);
          const a = sorted[i][key] as number;
          const b2 = sorted[i + 1][key] as number;
          return parseFloat((a + t * (b2 - a)).toFixed(2));
        }
      }
      return null;
    };

    const points: ChartPoint[] = records.map((rec) => {
      // Use corrected age if available (preterm), otherwise chronological
      const effectiveAge = rec.correctedAgeMonths !== null ? rec.correctedAgeMonths : (rec.ageMonths ?? 0);

      const actual =
        metric === 'weight' ? toNum(rec.weight) :
        metric === 'height' ? toNum(rec.height) :
        (toNum(rec.bmi) ?? calcBmi(toNum(rec.weight), toNum(rec.height)));

      const status =
        metric === 'weight' ? rec.weightStatus :
        metric === 'height' ? rec.heightStatus :
        rec.bmiStatus;

      return {
        label: ageLabel(effectiveAge),
        ageMonths: effectiveAge,
        actual,
        normalMin: interpolateBand(effectiveAge, cfg.normalMinKey),
        normalMax: interpolateBand(effectiveAge, cfg.normalMaxKey),
        moderateMin: interpolateBand(effectiveAge, cfg.moderateMinKey),
        status,
      };
    });

    return points.sort((a, b) => a.ageMonths - b.ageMonths);
  }, [growthData, metric, cfg]);

  // Summary stats
  const stats = useMemo(() => {
    if (chartData.length < 2) return null;
    const first = chartData[0];
    const last = chartData[chartData.length - 1];
    const weightFirst = growthData?.records[0] ? toNum(growthData.records[0].weight) : null;
    const weightLast = growthData?.records[growthData.records.length - 1] ? toNum(growthData.records[growthData.records.length - 1].weight) : null;
    const heightFirst = growthData?.records[0] ? toNum(growthData.records[0].height) : null;
    const heightLast = growthData?.records[growthData.records.length - 1] ? toNum(growthData.records[growthData.records.length - 1].height) : null;
    const lastBmi = growthData?.records[growthData.records.length - 1];

    return {
      weightGain: weightFirst != null && weightLast != null ? +(weightLast - weightFirst).toFixed(2) : null,
      heightGain: heightFirst != null && heightLast != null ? +(heightLast - heightFirst).toFixed(1) : null,
      latestWeight: weightLast,
      latestHeight: heightLast,
      currentBmi: lastBmi ? (toNum(lastBmi.bmi) ?? calcBmi(toNum(lastBmi.weight), toNum(lastBmi.height))) : null,
      latestStatus: last.status,
    };
  }, [chartData, growthData]);

  // Check for any concern in latest record
  const hasConcern = stats?.latestStatus === 'MODERATE' || stats?.latestStatus === 'SEVERE';

  const selectedChild = childList.find((c) => c.id === selectedId) ?? null;
  const ageString = selectedChild ? getAgeString(selectedChild.birthDate) : '';
  const loading = listLoading || growthLoading;

  if (listLoading) return <SkeletonLoader />;
  if (childList.length === 0) return null;

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
              {selectedChild && (
                <p className="text-xs text-gray-500 mt-0.5">
                  <span className="font-medium text-gray-700">{selectedChild.name}</span>
                  {' · '}
                  <span>{ageString}</span>
                  {' · '}
                  <span className={selectedChild.gender === 'MALE' ? 'text-sky-600' : 'text-pink-500'}>
                    {selectedChild.gender === 'MALE' ? '♂ Male' : '♀ Female'}
                  </span>
                  {selectedChild.isPreterm && (
                    <span className="ml-1.5 bg-orange-100 text-orange-700 px-1.5 py-0.5 rounded text-xs font-medium">
                      Preterm
                    </span>
                  )}
                </p>
              )}
            </div>
          </div>

          {/* Child selector */}
          {childList.length > 1 && (
            <div className="relative">
              <button
                type="button"
                onClick={() => setDropdownOpen((o) => !o)}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-50 hover:bg-gray-100 border border-gray-200 rounded-lg text-sm font-medium text-gray-700 transition-colors"
              >
                {selectedChild?.name ?? 'Select child'}
                <ChevronDown className="h-4 w-4 text-gray-400" />
              </button>
              {dropdownOpen && (
                <div className="absolute right-0 mt-1 w-52 bg-white border border-gray-200 rounded-lg shadow-lg z-30 py-1">
                  {childList.map((c) => (
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
        {/* Health concern alert */}
        {hasConcern && (
          <div className={`flex items-center gap-2 p-3 rounded-lg mb-4 ${
            stats?.latestStatus === 'SEVERE' ? 'bg-red-50 border border-red-200' : 'bg-yellow-50 border border-yellow-200'
          }`}>
            <AlertTriangle className={`h-4 w-4 shrink-0 ${stats?.latestStatus === 'SEVERE' ? 'text-red-500' : 'text-yellow-500'}`} />
            <p className={`text-sm font-medium ${stats?.latestStatus === 'SEVERE' ? 'text-red-700' : 'text-yellow-700'}`}>
              {stats?.latestStatus === 'SEVERE'
                ? 'Severe malnutrition detected — immediate midwife consultation recommended'
                : 'Moderate growth concern detected — please consult your midwife'}
            </p>
          </div>
        )}

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
                bg="bg-emerald-50" text="text-emerald-700" border="border-emerald-200"
              />
            )}
            {stats.heightGain != null && (
              <StatPill
                icon={<Ruler className="h-4 w-4" />}
                label="Height gained"
                value={`+${stats.heightGain} cm`}
                sub={stats.latestHeight ? `Now ${stats.latestHeight.toFixed(1)} cm` : undefined}
                bg="bg-sky-50" text="text-sky-700" border="border-sky-200"
              />
            )}
            {stats.currentBmi != null && (
              <StatPill
                icon={<Activity className="h-4 w-4" />}
                label="Current BMI"
                value={stats.currentBmi.toFixed(1)}
                bg="bg-violet-50" text="text-violet-700" border="border-violet-200"
              />
            )}
          </div>
        )}

        {/* Chart */}
        {growthLoading ? (
          <div className="h-[280px] w-full rounded-xl bg-gray-100 animate-pulse" />
        ) : chartData.length >= 2 ? (
          <>
            <ResponsiveContainer width="100%" height={280}>
              <ComposedChart data={chartData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                <defs>
                  {/* Green zone — normal range */}
                  <linearGradient id="normalZone" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#22c55e" stopOpacity={0.15} />
                    <stop offset="100%" stopColor="#22c55e" stopOpacity={0.05} />
                  </linearGradient>
                  {/* Yellow zone — moderate concern */}
                  <linearGradient id="moderateZone" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#eab308" stopOpacity={0.15} />
                    <stop offset="100%" stopColor="#eab308" stopOpacity={0.05} />
                  </linearGradient>
                  {/* Red zone — severe concern */}
                  <linearGradient id="severeZone" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#ef4444" stopOpacity={0.15} />
                    <stop offset="100%" stopColor="#ef4444" stopOpacity={0.05} />
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
                  domain={['dataMin - 1', 'dataMax + 1']}
                />
                <Tooltip
                  content={<CustomTooltip metric={metric} />}
                  cursor={{ stroke: cfg.color, strokeWidth: 1, strokeDasharray: '4 4' }}
                />

                {/* 1. Green Zone: normal range up to normalMax (Backmost) */}
                <Area
                  type="monotone"
                  dataKey="normalMax"
                  stroke="#22c55e"
                  strokeWidth={1}
                  strokeDasharray="4 3"
                  fill="url(#normalZone)"
                  fillOpacity={1}
                  legendType="none"
                  dot={false}
                  activeDot={false}
                  connectNulls
                  isAnimationActive={false}
                />

                {/* 2. Yellow Zone: moderate range up to normalMin (Middle) */}
                <Area
                  type="monotone"
                  dataKey="normalMin"
                  stroke="#eab308"
                  strokeWidth={1}
                  strokeDasharray="4 3"
                  fill="url(#moderateZone)"
                  fillOpacity={1}
                  legendType="none"
                  dot={false}
                  activeDot={false}
                  connectNulls
                  isAnimationActive={false}
                />

                {/* 3. Red Zone: severe range up to moderateMin (Frontmost) */}
                <Area
                  type="monotone"
                  dataKey="moderateMin"
                  stroke="#ef4444"
                  strokeWidth={1}
                  strokeDasharray="4 3"
                  fill="url(#severeZone)"
                  fillOpacity={1}
                  legendType="none"
                  dot={false}
                  activeDot={false}
                  connectNulls
                  isAnimationActive={false}
                />

                {/* Child's actual growth line */}
                <Line
                  type="monotone"
                  dataKey="actual"
                  stroke={cfg.color}
                  strokeWidth={2.5}
                  dot={<StatusDot />}
                  activeDot={<ActiveStatusDot />}
                  connectNulls
                  name="actual"
                />
              </ComposedChart>
            </ResponsiveContainer>

            {/* Legend */}
            <div className="flex flex-wrap items-center gap-4 mt-3 justify-end">
              <div className="flex items-center gap-1.5">
                <span className="h-3 w-3 rounded-sm bg-green-200 border border-green-400" />
                <span className="text-xs text-gray-500">Normal (WHO)</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="h-3 w-3 rounded-sm bg-yellow-200 border border-yellow-400" />
                <span className="text-xs text-gray-500">Moderate concern</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="h-3 w-3 rounded-sm bg-red-200 border border-red-400" />
                <span className="text-xs text-gray-500">Severe (below)</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="h-0.5 w-4 rounded" style={{ backgroundColor: cfg.color }} />
                <span className="text-xs text-gray-500">Child's growth</span>
              </div>
            </div>

            <p className="text-xs text-gray-400 text-right mt-1">
              {chartData.length} measurement{chartData.length !== 1 ? 's' : ''} recorded
              {selectedChild?.isPreterm ? ' · corrected age applied' : ''}
            </p>
          </>
        ) : (
          <div className="flex flex-col items-center justify-center h-[280px] text-gray-400 bg-gray-50 rounded-xl border border-dashed border-gray-200">
            <TrendingUp className="h-10 w-10 mb-2 opacity-30" />
            <p className="text-sm font-medium text-gray-500">Not enough data yet</p>
            <p className="text-xs mt-1 text-gray-400">At least two measurements are needed to display a chart.</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}