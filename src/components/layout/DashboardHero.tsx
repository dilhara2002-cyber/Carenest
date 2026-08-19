'use client';

import * as React from 'react';
import { ArrowRight } from 'lucide-react';

interface DashboardHeroProps {
  title: string;
  subtitle?: React.ReactNode;
  pillLabel?: string;
  pillColorClass?: string; // e.g. 'text-[#10B981]'
  actions?: React.ReactNode;
  rightInfo?: React.ReactNode;
}

export default function DashboardHero({ title, subtitle, pillLabel, pillColorClass, actions, rightInfo }: DashboardHeroProps) {
  return (
    <div className="relative overflow-hidden rounded-2xl bg-[#111827] p-8 text-white">
      <div className="absolute top-0 right-0 w-1/2 h-full bg-gradient-to-l from-[#1E40AF]/25 to-transparent pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-1/2 h-full bg-gradient-to-r from-[#F472B6]/15 to-transparent pointer-events-none" />

      <div className="absolute inset-0 overflow-hidden rounded-2xl pointer-events-none">
        <div className="absolute top-0 left-0 w-1/3 h-full bg-gradient-to-r from-transparent via-white/5 to-transparent animate-shimmer" />
      </div>

      <div className="relative z-10 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
        <div>
          {pillLabel && (
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#D1FAE5] mb-5">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#10B981] opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-[#10B981]"></span>
              </span>
              <span className={`${pillColorClass ?? 'text-[#10B981]'} text-xs font-semibold tracking-widest uppercase`}>{pillLabel}</span>
            </div>
          )}

          <h1 className="text-3xl font-extrabold tracking-tight text-white mb-2">{title}</h1>

          {subtitle && (
            <p className="text-slate-300 text-base max-w-lg leading-relaxed font-light">
              {subtitle}
            </p>
          )}
        </div>

        <div className="flex flex-wrap lg:flex-col items-start lg:items-end gap-3 font-sans shrink-0 w-full lg:w-auto">
          {rightInfo}
          {actions && (
            <div className="flex items-center gap-2.5 flex-wrap">{actions}</div>
          )}
        </div>
      </div>
    </div>
  );
}
