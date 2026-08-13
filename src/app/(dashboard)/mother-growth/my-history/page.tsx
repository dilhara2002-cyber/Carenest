'use client';

import { useEffect, useState, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { Card, CardContent, CardHeader, CardTitle, Badge } from '@/components/ui';
import { TrendingUp, Weight, Activity, Calendar } from 'lucide-react';
import { formatDate } from '@/lib/utils';
import type { MotherGrowthRecordData } from '@/types';

// ── Tiny inline SVG line chart (no external dependency) ───────────────────────
interface LineChartProps {
  data: { date: string; value: number }[];
  color: string;
  label: string;
  unit: string;
}

function LineChart({ data, color, label, unit }: LineChartProps) {
  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center h-40 text-gray-400 text-sm">
        No data yet
      </div>
    );
  }

  const W = 480;
  const H = 160;
  const pad = { top: 16, right: 16, bottom: 32, left: 44 };
  const chartW = W - pad.left - pad.right;
  const chartH = H - pad.top - pad.bottom;

  const values = data.map((d) => d.value);
  const minV = Math.min(...values);
  const maxV = Math.max(...values);
  const rangeV = maxV - minV || 1;

  const xScale = (i: number) => pad.left + (i / Math.max(data.length - 1, 1)) * chartW;
  const yScale = (v: number) => pad.top + chartH - ((v - minV) / rangeV) * chartH;

  const points = data.map((d, i) => `${xScale(i)},${yScale(d.value)}`).join(' ');
  const areaPoints = [
    `${xScale(0)},${pad.top + chartH}`,
    ...data.map((d, i) => `${xScale(i)},${yScale(d.value)}`),
    `${xScale(data.length - 1)},${pad.top + chartH}`,
  ].join(' ');

  // Y-axis ticks (3 ticks)
  const ticks = [minV, minV + rangeV / 2, maxV];

  return (
    <div>
      <p className="text-xs font-medium text-gray-500 mb-2">{label}</p>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="w-full"
        style={{ maxHeight: '160px' }}
        aria-label={`${label} trend chart`}
      >
        {/* Grid lines */}
        {ticks.map((t, i) => (
          <g key={i}>
            <line
              x1={pad.left}
              y1={yScale(t)}
              x2={pad.left + chartW}
              y2={yScale(t)}
              stroke="#e5e7eb"
              strokeWidth="1"
              strokeDasharray="4 4"
            />
            <text
              x={pad.left - 6}
              y={yScale(t) + 4}
              textAnchor="end"
              className="fill-gray-400"
              style={{ fontSize: '10px' }}
            >
              {t.toFixed(1)}
            </text>
          </g>
        ))}

        {/* Area fill */}
        <polygon points={areaPoints} fill={color} fillOpacity="0.08" />

        {/* Line */}
        <polyline
          points={points}
          fill="none"
          stroke={color}
          strokeWidth="2.5"
          strokeLinejoin="round"
          strokeLinecap="round"
        />

        {/* Data points + tooltips */}
        {data.map((d, i) => (
          <g key={i}>
            <circle
              cx={xScale(i)}
              cy={yScale(d.value)}
              r="4"
              fill="white"
              stroke={color}
              strokeWidth="2"
            />
            <title>{`${d.date}: ${d.value} ${unit}`}</title>
          </g>
        ))}

        {/* X-axis labels (first and last only to avoid clutter) */}
        {[0, data.length - 1]
          .filter((i, idx, arr) => arr.indexOf(i) === idx) // Remove duplicates when only 1 data point
          .map((i) => (
            <text
              key={`x-label-${i}`}
              x={xScale(i)}
              y={H - 6}
              textAnchor={i === 0 ? 'start' : 'end'}
              className="fill-gray-400"
              style={{ fontSize: '9px' }}
            >
              {new Date(data[i].date).toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
              })}
            </text>
          ))}
      </svg>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function MyGrowthHistoryPage() {
  const { data: session } = useSession();
  const [records, setRecords] = useState<MotherGrowthRecordData[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchRecords = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/mother-growth');
      const data = await res.json();
      // Sort ascending for chart; table shows descending
      setRecords((data.data || []).sort(
        (a: MotherGrowthRecordData, b: MotherGrowthRecordData) =>
          new Date(a.recordDate).getTime() - new Date(b.recordDate).getTime()
      ));
    } catch (err) {
      console.error('Failed to fetch growth records:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRecords();
  }, [fetchRecords]);

  // Chart series (ascending by date — already sorted)
  const weightSeries = records.map((r) => ({
    date: new Date(r.recordDate).toISOString().split('T')[0],
    value: parseFloat(String(r.weightKg)),
  }));

  const sfhSeries = records
    .filter((r) => r.sfhCm != null)
    .map((r) => ({
      date: new Date(r.recordDate).toISOString().split('T')[0],
      value: parseFloat(String(r.sfhCm)),
    }));

  // Latest values for stat cards
  const latestRecord = records[records.length - 1];
  const firstRecord = records[0];
  const weightChange =
    records.length >= 2
      ? (
          parseFloat(String(latestRecord.weightKg)) -
          parseFloat(String(firstRecord.weightKg))
        ).toFixed(1)
      : null;

  // Descending order for the table (most recent first)
  const tableRecords = [...records].reverse();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">My Growth History</h1>
        <p className="text-gray-500">
          Track your weight and belly growth (SFH) during pregnancy
        </p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardContent className="flex items-center gap-4 p-5">
            <div className="rounded-full bg-teal-100 p-3">
              <Weight className="h-6 w-6 text-teal-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Current Weight</p>
              <p className="text-2xl font-bold text-gray-900">
                {latestRecord
                  ? `${parseFloat(String(latestRecord.weightKg)).toFixed(1)} kg`
                  : '—'}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex items-center gap-4 p-5">
            <div className="rounded-full bg-rose-100 p-3">
              <TrendingUp className="h-6 w-6 text-rose-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Latest SFH</p>
              <p className="text-2xl font-bold text-gray-900">
                {latestRecord?.sfhCm != null
                  ? `${parseFloat(String(latestRecord.sfhCm)).toFixed(1)} cm`
                  : '—'}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex items-center gap-4 p-5">
            <div className="rounded-full bg-purple-100 p-3">
              <Activity className="h-6 w-6 text-purple-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Total Weight Change</p>
              <p className="text-2xl font-bold text-gray-900">
                {weightChange !== null
                  ? `${Number(weightChange) >= 0 ? '+' : ''}${weightChange} kg`
                  : '—'}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Weight className="h-4 w-4 text-teal-500" />
              Weight Trend
            </CardTitle>
          </CardHeader>
          <CardContent>
            <LineChart
              data={weightSeries}
              color="#0d9488"
              label="Weight (kg)"
              unit="kg"
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <TrendingUp className="h-4 w-4 text-rose-500" />
              Belly Growth (SFH) Trend
            </CardTitle>
          </CardHeader>
          <CardContent>
            <LineChart
              data={sfhSeries}
              color="#f43f5e"
              label="Symphysis-Fundal Height (cm)"
              unit="cm"
            />
          </CardContent>
        </Card>
      </div>

      {/* History table — read-only */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5 text-teal-500" />
            Measurement History ({records.length} records)
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-12">
              <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-teal-600" />
            </div>
          ) : tableRecords.length === 0 ? (
            <p className="text-center text-gray-500 py-10">
              No growth records yet. Your midwife will add measurements during your
              visits.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="py-3 px-4 text-left font-semibold text-gray-600">
                      Date
                    </th>
                    <th className="py-3 px-4 text-left font-semibold text-gray-600">
                      Weight
                    </th>
                    <th className="py-3 px-4 text-left font-semibold text-gray-600">
                      SFH (Belly)
                    </th>
                    <th className="py-3 px-4 text-left font-semibold text-gray-600">
                      Recorded By
                    </th>
                    <th className="py-3 px-4 text-left font-semibold text-gray-600">
                      Notes
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {tableRecords.map((record, idx) => {
                    // Weight delta vs previous measurement
                    const prevIdx = tableRecords.length - 1 - idx; // ascending index
                    const prevRecord = records[prevIdx - 1];
                    const delta =
                      prevRecord
                        ? parseFloat(String(record.weightKg)) -
                          parseFloat(String(prevRecord.weightKg))
                        : null;

                    return (
                      <tr key={record.id} className="hover:bg-gray-50 transition-colors">
                        <td className="py-3 px-4 text-gray-700 whitespace-nowrap">
                          {formatDate(record.recordDate)}
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-2">
                            <Badge variant="info">
                              {parseFloat(String(record.weightKg)).toFixed(1)} kg
                            </Badge>
                            {delta !== null && (
                              <span
                                className={`text-xs font-medium ${
                                  delta > 0
                                    ? 'text-emerald-600'
                                    : delta < 0
                                    ? 'text-red-500'
                                    : 'text-gray-400'
                                }`}
                              >
                                {delta > 0 ? '+' : ''}
                                {delta.toFixed(1)} kg
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          {record.sfhCm != null ? (
                            <Badge variant="success">
                              {parseFloat(String(record.sfhCm)).toFixed(1)} cm
                            </Badge>
                          ) : (
                            <span className="text-gray-400">—</span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-gray-500">
                          {record.recordedBy?.user?.name || '—'}
                        </td>
                        <td className="py-3 px-4 text-gray-600 max-w-[220px] truncate">
                          {record.notes || '—'}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Disclaimer */}
      <p className="text-xs text-gray-400 text-center pb-2">
        Measurements are recorded by your assigned midwife during prenatal visits. Contact
        your midwife if you notice any concerns.
      </p>
    </div>
  );
}
