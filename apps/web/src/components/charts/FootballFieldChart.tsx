import React from 'react';
import { ValuationFootballFieldData, ValuationRange } from '@wertbot/shared-types';
import { TrendingUp, BarChart3, Info } from 'lucide-react';

interface FootballFieldChartProps {
  data?: ValuationFootballFieldData;
}

const DEFAULT_VALUATION_DATA: ValuationFootballFieldData = {
  symbol: 'AAPL',
  companyName: 'Apple Inc.',
  currentPrice: 224.50,
  currency: 'USD',
  asOfDate: new Date().toLocaleDateString(),
  ranges: [
    { methodology: '52-Week Trading Range', min: 164.08, max: 237.23, base: 200.65, color: 'bg-slate-600' },
    { methodology: 'DCF Intrinsic Fair Value', min: 210.00, max: 260.00, base: 235.00, color: 'bg-emerald-500' },
    { methodology: 'Analyst Target Price (Wall St)', min: 185.00, max: 275.00, base: 240.00, color: 'bg-cyan-500' },
    { methodology: 'Comps P/E Multiple (28.5x-34x)', min: 195.00, max: 245.00, base: 220.00, color: 'bg-indigo-500' },
    { methodology: 'LBO Floor Valuation (12x EBITDA)', min: 155.00, max: 190.00, base: 172.50, color: 'bg-amber-500' },
  ],
};

export const FootballFieldChart: React.FC<FootballFieldChartProps> = ({ data = DEFAULT_VALUATION_DATA }) => {
  // Calculate global min and max for chart scale
  const allValues = [
    data.currentPrice,
    ...data.ranges.map((r) => r.min),
    ...data.ranges.map((r) => r.max),
  ];
  const globalMin = Math.floor(Math.min(...allValues) * 0.9);
  const globalMax = Math.ceil(Math.max(...allValues) * 1.1);
  const totalSpan = globalMax - globalMin;

  const getPct = (val: number) => {
    return Math.max(0, Math.min(100, ((val - globalMin) / totalSpan) * 100));
  };

  const currentPricePct = getPct(data.currentPrice);

  return (
    <div className="bg-[#111827] border border-slate-800 rounded-xl p-6 shadow-2xl text-slate-100 font-sans">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-6 border-b border-slate-800 gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="bg-cyan-500/10 text-cyan-400 text-xs font-semibold px-2.5 py-1 rounded-full border border-cyan-500/20">
              VALUATION SUITE
            </span>
            <span className="text-xs text-slate-400">Updated {data.asOfDate}</span>
          </div>
          <h2 className="text-2xl font-bold mt-2 text-white flex items-center gap-2">
            {data.companyName} ({data.symbol})
            <span className="text-sm font-normal text-slate-400">Football Field Valuation</span>
          </h2>
        </div>

        <div className="flex items-center gap-4 bg-slate-900/80 px-4 py-2.5 rounded-lg border border-slate-800">
          <div>
            <div className="text-xs text-slate-400 uppercase tracking-wider font-medium">Current Market Price</div>
            <div className="text-xl font-extrabold text-cyan-400 font-mono">
              ${data.currentPrice.toFixed(2)} {data.currency}
            </div>
          </div>
          <TrendingUp className="w-6 h-6 text-cyan-400" />
        </div>
      </div>

      {/* Football Field Visual Bars */}
      <div className="mt-8 space-y-6">
        {data.ranges.map((range: ValuationRange, idx: number) => {
          const leftPct = getPct(range.min);
          const rightPct = getPct(range.max);
          const widthPct = rightPct - leftPct;
          const basePct = getPct(range.base);

          return (
            <div key={idx} className="space-y-1.5">
              <div className="flex justify-between items-center text-sm">
                <span className="font-medium text-slate-300 flex items-center gap-2">
                  <BarChart3 className="w-4 h-4 text-slate-500" />
                  {range.methodology}
                </span>
                <span className="font-mono text-xs text-slate-400">
                  ${range.min.toFixed(2)} – ${range.max.toFixed(2)} (Base: ${range.base.toFixed(2)})
                </span>
              </div>

              {/* Bar Container */}
              <div className="relative h-9 bg-slate-950/80 rounded-md border border-slate-800/80 overflow-hidden flex items-center">
                {/* Current Price Vertical Reference Line Across Bar */}
                <div
                  className="absolute top-0 bottom-0 border-r-2 border-dashed border-cyan-400 z-20 pointer-events-none"
                  style={{ left: `${currentPricePct}%` }}
                />

                {/* Range Bar */}
                <div
                  className={`absolute h-6 rounded ${range.color || 'bg-cyan-600'} opacity-85 transition-all duration-500 hover:opacity-100 shadow-md`}
                  style={{
                    left: `${leftPct}%`,
                    width: `${widthPct}%`,
                  }}
                >
                  {/* Base Value Marker Line Inside Bar */}
                  <div
                    className="absolute top-0 bottom-0 w-1 bg-white/90 shadow-sm"
                    style={{ left: `${((basePct - leftPct) / widthPct) * 100}%` }}
                    title={`Base Fair Value: $${range.base}`}
                  />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Axis Scale Legend */}
      <div className="relative mt-8 pt-4 border-t border-slate-800 flex justify-between text-xs font-mono text-slate-400">
        <span>${globalMin.toFixed(0)}</span>
        <span>${((globalMin + globalMax) / 2).toFixed(0)}</span>
        <span>${globalMax.toFixed(0)}</span>

        {/* Marker Indicator */}
        <div
          className="absolute top-[-10px] transform -translate-x-1/2 flex flex-col items-center z-30"
          style={{ left: `${currentPricePct}%` }}
        >
          <div className="bg-cyan-500 text-slate-950 font-bold px-2 py-0.5 rounded text-[10px] shadow">
            CURRENT: ${data.currentPrice.toFixed(2)}
          </div>
          <div className="w-0 h-0 border-l-4 border-r-4 border-t-4 border-l-transparent border-r-transparent border-t-cyan-500" />
        </div>
      </div>

      {/* Footer Info */}
      <div className="mt-6 pt-4 border-t border-slate-800/60 flex items-center gap-2 text-xs text-slate-400">
        <Info className="w-4 h-4 text-cyan-400 flex-shrink-0" />
        <span>
          The Football Field Chart aggregates DCF intrinsic value, analyst consensus price targets, LBO floor, and market multiple ranges to evaluate fair value against the current price (${data.currentPrice.toFixed(2)}).
        </span>
      </div>
    </div>
  );
};
