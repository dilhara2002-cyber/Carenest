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
} from 'recharts';
import { Card, CardHeader, CardTitle, CardContent, Badge } from '@/components/ui';
import { TrendingUp, Ruler, Weight, ChevronDown } from 'lucide-react';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface GrowthRecord {
  id: string;
  recordDate: string;
  weight: number | string | null;
  height: number | string | null;
  headCircumference: number | string | null;
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
  ageMonths: number;
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
    (to.getMonth() - from.getMonth()) +
    (to.getDate() >= from.getDate() ? 0 : 0) // keep whole months
  );
}

function ageLabel(months: number): string {
  if (months <= 0) return 'Birth';
  if (months < 12) return `${months}M`;
  const y = Math.floor(months / 12);
  const m = months % 12;
  return m === 0 ? `${y}Y` : `${y}Y${m}M`;
}

// ---------------------------------------------------------------------------
// Custom Tooltip
// ---------------------------------------------------------------------------

interface TooltipPayloadItem {
  value?: number;
  payload?: ChartPoint;
}

function CustomTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: TooltipPayloadItem[];
  label?: string;
}) {
  if (!active || !payload?.length) return null;
  const data = payload[0].payload;
  if (!data) return null;

  return (
    <div className="bg-white/95 backdrop-blur-sm border border-teal-200 rounded-xl px-4 py-3 shadow-lg">
      <p className="text-xs font-semibold text-teal-700 mb-1.5">{label}</p>
      <div className="space-y-1">
        {data.weight != null && (
          <div className="flex items-center gap-2 text-sm">
            <span className="h-2 w-2 rounded-full bg-teal-500 inline-block" />
            <span className="text-gray-600">Weight:</span>
            <span className="font-bold text-gray-900">{data.weight.toFixed(1)} kg</span>
          </div>
        )}
        {data.height != null && (
          <div className="flex items-center gap-2 text-sm">
            <span className="h-2 w-2 rounded-full bg-cyan-400 inline-block" />
            <span className="text-gray-600">Height:</span>
            <span className="font-bold text-gray-900">{data.height.toFixed(1)} cm</span>
          </div>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Skeleton Loader
// ---------------------------------------------------------------------------

function SkeletonLoader() {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <div className="h-5 w-5 rounded bg-gray-200 animate-pulse" />
          <div className="h-5 w-40 rounded bg-gray-200 animate-pulse" />
        </div>
      </CardHeader>
      <CardContent>
        {/* Badge placeholders */}
        <div className="flex gap-3 mb-5">
          <div className="h-7 w-44 rounded-full bg-gray-200 animate-pulse" />
          <div className="h-7 w-44 rounded-full bg-gray-200 animate-pulse" />
        </div>
        {/* Chart placeholder */}
        <div className="h-[280px] w-full rounded-lg bg-gray-100 animate-pulse" />
      </CardContent>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Custom Active Dot
// ---------------------------------------------------------------------------

interface ActiveDotProps {
  cx?: number;
  cy?: number;
}

function ActiveDot({ cx, cy }: ActiveDotProps) {
  if (cx == null || cy == null) return null;
  return (
    <g>
      <circle cx={cx} cy={cy} r={8} fill="rgba(20,184,166,0.15)" />
      <circle cx={cx} cy={cy} r={5} fill="#fff" stroke="#14b8a6" strokeWidth={2.5} />
    </g>
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

  // ── Fetch ─────────────────────────────────────────────────────────────────
  useEffect(() => {
    const fetchChildren = async () => {
      try {
        const res = await fetch('/api/children');
        const json = await res.json();
        const data: ChildWithGrowth[] = json.data ?? [];
        setChildren(data);
        if (data.length > 0) setSelectedId(data[0].id); // default: first (most recent birthDate desc)
      } catch {
        console.error('ChildGrowthWidget: failed to load children');
      } finally {
        setLoading(false);
      }
    };
    fetchChildren();
  }, []);

  // ── Selected child ────────────────────────────────────────────────────────
  const child = useMemo(
    () => children.find((c) => c.id === selectedId) ?? null,
    [children, selectedId],
  );

  // ── Build chart data ──────────────────────────────────────────────────────
  const chartData = useMemo<ChartPoint[]>(() => {
    if (!child) return [];
    const birthDate = new Date(child.birthDate);
    const birthW = toNum(child.birthWeight);
    const birthH = toNum(child.birthHeight);

    const points: ChartPoint[] = [
      { label: 'Birth', weight: birthW, height: birthH, ageMonths: 0 },
    ];

    for (const rec of child.growthRecords) {
      const recDate = new Date(rec.recordDate);
      const months = monthsDiff(birthDate, recDate);
      // skip if it overlaps with birth (same month)
      if (months <= 0) continue;
      points.push({
        label: ageLabel(months),
        weight: toNum(rec.weight),
        height: toNum(rec.height),
        ageMonths: months,
      });
    }

    // ensure chronological (API should already be asc, but defensive)
    points.sort((a, b) => a.ageMonths - b.ageMonths);
    return points;
  }, [child]);

  // ── Velocity badges ───────────────────────────────────────────────────────
  const velocity = useMemo(() => {
    if (chartData.length < 2) return null;
    const first = chartData[0];
    const last = chartData[chartData.length - 1];
    const weightGain =
      first.weight != null && last.weight != null ? last.weight - first.weight : null;
    const heightGain =
      first.height != null && last.height != null ? last.height - first.height : null;
    return { weightGain, heightGain };
  }, [chartData]);

  // ── Render gates ──────────────────────────────────────────────────────────
  if (loading) return <SkeletonLoader />;
  if (children.length === 0) return null; // mother has no children — hide widget

  return (
    <Card className="overflow-visible">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <CardTitle className="flex items-center gap-2">
            <div className="p-1.5 bg-teal-100 rounded-lg">
              <TrendingUp className="h-5 w-5 text-teal-600" />
            </div>
            Child Growth Tracker
          </CardTitle>

          {/* Child selector (only if > 1 child) */}
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
                      onClick={() => {
                        setSelectedId(c.id);
                        setDropdownOpen(false);
                      }}
                      className={`w-full text-left px-4 py-2 text-sm hover:bg-teal-50 transition-colors ${
                        c.id === selectedId
                          ? 'bg-teal-50 text-teal-700 font-medium'
                          : 'text-gray-700'
                      }`}
                    >
                      {c.name}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </CardHeader>

      <CardContent>
        {/* Velocity badges */}
        {velocity && (
          <div className="flex flex-wrap gap-3 mb-5">
            {velocity.weightGain != null && (
              <div className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 border border-emerald-200 rounded-full">
                <Weight className="h-3.5 w-3.5 text-emerald-600" />
                <span className="text-xs font-semibold text-emerald-700">
                  {velocity.weightGain >= 0 ? '+' : ''}
                  {velocity.weightGain.toFixed(1)} kg since birth
                </span>
              </div>
            )}
            {velocity.heightGain != null && (
              <div className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-sky-50 border border-sky-200 rounded-full">
                <Ruler className="h-3.5 w-3.5 text-sky-600" />
                <span className="text-xs font-semibold text-sky-700">
                  {velocity.heightGain >= 0 ? '+' : ''}
                  {velocity.heightGain.toFixed(1)} cm since birth
                </span>
              </div>
            )}
          </div>
        )}

        {/* Chart */}
        {chartData.length >= 2 ? (
          <ResponsiveContainer width="100%" height={280}>
            <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
              <defs>
                <linearGradient id="growthGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#14b8a6" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#14b8a6" stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
              <XAxis
                dataKey="label"
                tick={{ fontSize: 12, fill: '#6b7280' }}
                axisLine={{ stroke: '#d1d5db' }}
                tickLine={false}
                dy={8}
              />
              <YAxis
                tick={{ fontSize: 12, fill: '#6b7280' }}
                axisLine={false}
                tickLine={false}
                unit=" kg"
                width={60}
                domain={['dataMin - 0.5', 'dataMax + 0.5']}
              />
              <Tooltip content={<CustomTooltip />} />
              <Area
                type="monotone"
                dataKey="weight"
                stroke="#14b8a6"
                strokeWidth={2.5}
                fill="url(#growthGradient)"
                dot={{ r: 4, fill: '#fff', stroke: '#14b8a6', strokeWidth: 2 }}
                activeDot={<ActiveDot />}
                connectNulls
              />
            </AreaChart>
          </ResponsiveContainer>
        ) : (
          <div className="flex flex-col items-center justify-center h-[280px] text-gray-400">
            <TrendingUp className="h-10 w-10 mb-2 opacity-40" />
            <p className="text-sm">Not enough growth data to display a chart yet.</p>
            <p className="text-xs mt-1">At least two measurements are needed.</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
