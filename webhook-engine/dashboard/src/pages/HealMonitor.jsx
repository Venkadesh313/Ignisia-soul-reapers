import React, { useMemo } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';
import { CheckCircle, AlertCircle, RefreshCw } from 'lucide-react';
import Sidebar from '../components/Sidebar';
import PageHeader from '../components/PageHeader';
import usePolling from '../hooks/usePolling';

function formatTime(ts) {
  const d = new Date(ts);
  return d.toLocaleString();
}

export default function HealMonitor() {
  const { data: metrics, lastFetched: metricsFetched, refresh: refreshMetrics } = usePolling('/patterns/metrics', 15000);
  const { data: flagsData } = usePolling('/patterns/flags', 15000);
  const flags = flagsData?.flags || [];

  const totalHealed = metrics?.resolved || 0;
  const unresolvable = metrics?.unresolvable || 0;
  const anomaly = metrics?.anomaly || 0;
  const pending = Math.max(0, anomaly - totalHealed - unresolvable);
  const successRate = metrics?.healSuccessRate || 0;

  const pieData = [
    { name: 'RESOLVED', value: totalHealed, color: '#10b981' },
    { name: 'UNRESOLVABLE', value: unresolvable, color: '#ef4444' },
    { name: 'ANOMALY (Pending)', value: pending, color: '#f59e0b' },
  ].filter(d => d.value > 0);

  const renderData = pieData.length > 0 ? pieData : [{ name: 'EMPTY', value: 1, color: '#2d3148' }];

  return (
    <div className="min-h-screen bg-[#030712] flex font-sans text-gray-200">
      <Sidebar />

      <main className="ml-[220px] w-[calc(100%-220px)] min-h-screen bg-[#030712] p-[24px]">
        <PageHeader 
          title="Auto-Heal Monitor" 
          subtitle="Automatic state reconciliation metrics & patterns" 
          lastFetched={metricsFetched} 
          onRefresh={refreshMetrics} 
        />

        {/* Top: Pattern Flags Section */}
        <div className="bg-[#1e2130] rounded-xl border border-[#2d3148] p-6 mb-8 w-full shadow-md">
           <h3 className="text-sm font-semibold text-white mb-6 uppercase tracking-widest">Active Pattern Flags</h3>
           {flags.length === 0 ? (
              <div className="bg-[#10b981]/10 border border-[#10b981]/30 rounded-lg p-6 flex flex-col items-center justify-center">
                <CheckCircle className="w-8 h-8 text-[#10b981] mb-2" />
                <p className="text-[#10b981] font-bold">All Systems Healthy</p>
                <p className="text-[#10b981]/80 text-sm">No critical flags detected</p>
              </div>
           ) : (
              <div className="space-y-4">
                {flags.map((flag, i) => {
                  const isHigh = flag.severity === 'HIGH';
                  return (
                    <div key={i} className={`bg-[#030712] rounded-lg border p-4 ${isHigh ? 'border-[#ef4444]/50' : 'border-[#f59e0b]/50'}`}>
                      <div className="flex items-center gap-3">
                        <div className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${isHigh ? 'bg-[#ef4444] animate-pulse' : 'bg-[#f59e0b]'}`} />
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded border ${isHigh ? 'bg-[#ef4444]/10 text-[#ef4444] border-[#ef4444]/30' : 'bg-[#f59e0b]/10 text-[#f59e0b] border-[#f59e0b]/30'}`}>{flag.type}</span>
                            <span className={`text-[10px] font-bold uppercase text-gray-400`}>{formatTime(flag.timestamp)}</span>
                          </div>
                          <p className="text-sm text-gray-300">{flag.detail}</p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
           )}
        </div>

        {/* Bottom: Two columns */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 w-full">
          {/* Left Block: Pie chart */}
          <div className="bg-[#1e2130] rounded-xl border border-[#2d3148] p-8 flex flex-col min-h-[300px]">
            <h2 className="text-sm font-semibold text-white mb-6 uppercase tracking-widest">Reconciliation Breakdown</h2>
            <div className="w-full flex-1 relative flex items-center justify-center min-h-[220px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie 
                    data={renderData} 
                    cx="50%" cy="50%" 
                    innerRadius={70} 
                    outerRadius={100} 
                    paddingAngle={3} 
                    dataKey="value" 
                    stroke="none"
                  >
                    {renderData.map((entry, index) => <Cell key={index} fill={entry.color} />)}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <span className="text-3xl font-bold text-white">{successRate.toFixed(0)}%</span>
                <span className="text-[10px] text-gray-400 uppercase tracking-widest mt-1">Success</span>
              </div>
            </div>
            <div className="flex flex-wrap justify-center gap-x-6 gap-y-2 mt-4">
              <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-[#10b981]" /><span className="text-xs text-gray-300 uppercase tracking-wide">Resolved</span></div>
              <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-[#ef4444]" /><span className="text-xs text-gray-300 uppercase tracking-wide">Unresolvable</span></div>
              <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-[#f59e0b]" /><span className="text-xs text-gray-300 uppercase tracking-wide">Pending</span></div>
            </div>
          </div>

          {/* Right Block: Stats */}
          <div className="flex flex-col gap-4">
            <div className="bg-[#1e2130] rounded-xl border border-[#2d3148] p-6 flex flex-col justify-center flex-1 border-l-4 border-l-[#10b981]">
              <span className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-1">Total Healed</span>
              <span className="text-4xl font-bold text-[#10b981]">{totalHealed}</span>
            </div>
            <div className="bg-[#1e2130] rounded-xl border border-[#2d3148] p-6 flex flex-col justify-center flex-1 border-l-4 border-l-[#f59e0b]">
              <span className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-1">Pending Validation</span>
              <span className="text-4xl font-bold text-[#f59e0b]">{pending}</span>
            </div>
            <div className="bg-[#1e2130] rounded-xl border border-[#2d3148] p-6 flex flex-col justify-center flex-1 border-l-4 border-l-[#ef4444]">
              <span className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-1">Unresolvable Failures</span>
              <span className="text-4xl font-bold text-[#ef4444]">{unresolvable}</span>
            </div>
             <div className="bg-[#1e2130] rounded-xl border border-[#2d3148] p-6 flex flex-col justify-center flex-1 border-l-4 border-l-[#6366f1]">
              <span className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-1">Success Rate</span>
              <span className="text-4xl font-bold text-[#6366f1]">{successRate.toFixed(1)}%</span>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
