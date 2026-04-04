import React, { useState, useMemo } from 'react';
import { Search, BarChart2, ShieldAlert, AlertTriangle, Activity } from 'lucide-react';
import Sidebar from '../components/Sidebar';
import PageHeader from '../components/PageHeader';
import usePolling from '../hooks/usePolling';

function timeAgo(dateStr) {
  const diff = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  return `${Math.floor(diff / 3600)}h ago`;
}

export default function Security() {
  const { data, loading, error, refresh, lastFetched } = usePolling('/patterns/security', 15000);
  const [search, setSearch] = useState('');
  const [filterMode, setFilterMode] = useState('ALL'); // ALL, BLOCKED, DROPPED

  const anomalies = data?.anomalies || [];

  const filtered = useMemo(() => {
    let list = anomalies;
    if (filterMode !== 'ALL') {
      list = list.filter(a => a.action === filterMode);
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter((a) => a.transaction_id.toLowerCase().includes(q));
    }
    return list;
  }, [anomalies, search, filterMode]);

  const summary = useMemo(() => {
    const total = anomalies.length;
    const blocked = anomalies.filter(a => a.action === 'BLOCKED').length;
    const dropped = anomalies.filter(a => a.action === 'DROPPED').length;
    const avgScore = total > 0 ? (anomalies.reduce((acc, a) => acc + a.fraud_score, 0) / total).toFixed(2) : '0.00';
    return { total, blocked, dropped, avgScore };
  }, [anomalies]);

  return (
    <div className="min-h-screen bg-[#030712] flex font-sans text-gray-200">
      <Sidebar />

      <main className="ml-[220px] w-[calc(100%-220px)] min-h-screen bg-[#030712] p-[24px]">
        <PageHeader 
          title="Security Center" 
          subtitle="Review security events and pattern alerts" 
          lastFetched={lastFetched} 
          onRefresh={refresh} 
        />

        {/* Summary Cards Row */}
        <div className="grid grid-cols-4 gap-4 mb-8">
          <div className="bg-[#1e2130] rounded-xl border border-[#2d3148] p-5 flex flex-col justify-center">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Total Events</span>
              <div className="p-1.5 bg-gray-800 rounded text-gray-400"><BarChart2 className="w-4 h-4" /></div>
            </div>
            <span className="text-2xl font-bold text-white">{summary.total}</span>
          </div>
          <div className="bg-[#1e2130] rounded-xl border border-[#2d3148] p-5 flex flex-col justify-center">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Blocked</span>
              <div className="p-1.5 bg-[#ef4444]/10 rounded text-[#ef4444]"><ShieldAlert className="w-4 h-4" /></div>
            </div>
            <span className="text-2xl font-bold text-[#ef4444]">{summary.blocked}</span>
          </div>
          <div className="bg-[#1e2130] rounded-xl border border-[#2d3148] p-5 flex flex-col justify-center">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Dropped</span>
              <div className="p-1.5 bg-[#f59e0b]/10 rounded text-[#f59e0b]"><AlertTriangle className="w-4 h-4" /></div>
            </div>
            <span className="text-2xl font-bold text-[#f59e0b]">{summary.dropped}</span>
          </div>
          <div className="bg-[#1e2130] rounded-xl border border-[#2d3148] p-5 flex flex-col justify-center">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Avg Fraud Score</span>
              <div className="p-1.5 bg-[#8b5cf6]/10 rounded text-[#8b5cf6]"><Activity className="w-4 h-4" /></div>
            </div>
            <span className="text-2xl font-bold text-[#8b5cf6]">{summary.avgScore}</span>
          </div>
        </div>

        {/* Filters */}
        <div className="flex items-center justify-between mb-6">
          <div className="relative max-w-sm w-full shrink-0">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
            <input
              type="text"
              placeholder="Search by Transaction ID..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-[#1e2130] border border-[#2d3148] text-white rounded-lg pl-10 pr-4 py-2 text-sm placeholder-gray-500 focus:outline-none focus:border-[#6366f1] transition-colors"
            />
          </div>
          
          <div className="flex gap-2">
            {['ALL', 'BLOCKED', 'DROPPED'].map((mode) => (
              <button
                key={mode}
                onClick={() => setFilterMode(mode)}
                className={`px-4 py-2 rounded-lg text-xs font-bold uppercase transition-colors ${
                  filterMode === mode ? 'bg-[#6366f1] text-white shadow-md' : 'bg-[#1e2130] border border-[#2d3148] text-gray-400 hover:text-white hover:bg-[#2d3148]'
                }`}
              >
                {mode}
              </button>
            ))}
          </div>
        </div>

        {/* Table */}
        <div className="bg-[#1e2130] rounded-xl border border-[#2d3148] overflow-hidden">
          {error ? (
            <div className="p-6 text-[#ef4444] text-center font-medium">Failed to load security events.</div>
          ) : loading && !data ? (
            <div className="p-6 space-y-4">
              {[...Array(5)].map((_, i) => <div key={i} className="h-10 bg-[#2d3148] rounded animate-pulse" />)}
            </div>
          ) : filtered.length === 0 ? (
            <div className="p-10 text-center flex flex-col items-center">
              <ShieldAlert className="w-10 h-10 text-gray-600 mb-3" />
              <p className="text-gray-400">No items match your filters.</p>
            </div>
          ) : (
            <div className="overflow-x-auto w-full">
              <table className="w-full text-left whitespace-nowrap text-sm">
                <thead>
                  <tr className="bg-[#1a1d27] border-b border-[#2d3148]">
                    <th className="px-6 py-3 font-semibold text-gray-400 text-xs tracking-wider uppercase">ID</th>
                    <th className="px-6 py-3 font-semibold text-gray-400 text-xs tracking-wider uppercase">Transaction ID</th>
                    <th className="px-6 py-3 font-semibold text-gray-400 text-xs tracking-wider uppercase">Type</th>
                    <th className="px-6 py-3 font-semibold text-gray-400 text-xs tracking-wider uppercase">Detail</th>
                    <th className="px-6 py-3 font-semibold text-gray-400 text-xs tracking-wider uppercase w-48">Fraud Score</th>
                    <th className="px-6 py-3 font-semibold text-gray-400 text-xs tracking-wider uppercase">Action</th>
                    <th className="px-6 py-3 font-semibold text-gray-400 text-xs tracking-wider uppercase">Time</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#2d3148]">
                  {filtered.map(evt => {
                    const isReplay = evt.anomaly_type === 'REPLAY_ATTACK';
                    const isHarmless = evt.anomaly_type === 'HARMLESS_RETRY';
                    const rowBg = isReplay ? 'bg-[#450a0a]' : isHarmless ? 'bg-[#422006]/20' : 'hover:bg-[#2d3148]/30';
                    const scoreColor = evt.fraud_score > 0.7 ? 'bg-[#ef4444]' : evt.fraud_score > 0.4 ? 'bg-[#f59e0b]' : 'bg-[#10b981]';
                    
                    return (
                      <tr key={evt.id} className={`${rowBg} transition-colors`}>
                        <td className="px-6 py-4 text-gray-500 font-mono text-xs">{evt.id}</td>
                        <td className="px-6 py-4 font-mono text-[#6366f1] font-bold text-xs">{evt.transaction_id}</td>
                        <td className="px-6 py-4">
                          <span className={`px-2 py-1 text-[10px] uppercase font-bold rounded-md border ${
                            isReplay ? 'bg-[#ef4444]/20 text-[#ef4444] border-[#ef4444]/30' : 
                            isHarmless ? 'bg-[#f59e0b]/20 text-[#f59e0b] border-[#f59e0b]/30' : 'bg-gray-800 text-gray-300 border-gray-600'
                          }`}>
                            {evt.anomaly_type || 'UNKNOWN'}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-gray-300 max-w-[200px] truncate" title={evt.detail}>{evt.detail}</td>
                        <td className="px-6 py-4 w-48">
                          <div className="flex items-center gap-3">
                            <div className="w-full h-1.5 bg-[#030712] rounded-full overflow-hidden shrink-0">
                              <div className={`h-full rounded-full ${scoreColor}`} style={{ width: `${evt.fraud_score * 100}%` }} />
                            </div>
                            <span className="font-mono text-gray-400 text-xs shrink-0">{evt.fraud_score.toFixed(2)}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className={`px-2.5 py-1 text-[10px] uppercase font-bold rounded-full ${
                            evt.action === 'BLOCKED' ? 'bg-[#ef4444]' : 'bg-[#f59e0b]'
                          } text-white`}>
                            {evt.action}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-gray-400 text-xs">{timeAgo(evt.created_at)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
