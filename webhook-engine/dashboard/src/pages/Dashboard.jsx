import React, { useMemo } from 'react';
import { ArrowUpRight, ShieldAlert, Activity, BarChart2 } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, LineChart, Line } from 'recharts';
import Sidebar from '../components/Sidebar';
import PageHeader from '../components/PageHeader';
import usePolling from '../hooks/usePolling';

function timeAgo(dateStr) {
  const diff = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  return `${Math.floor(diff / 3600)}h ago`;
}

const CustomTooltip = ({ active, payload }) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-[#1e2130] border border-[#2d3148] rounded shadow-lg p-3">
        {payload.map((entry, index) => (
          <p key={index} className="text-sm font-medium" style={{ color: entry.fill || entry.color || '#fff' }}>
            {entry.name || entry.dataKey}: {entry.value}
          </p>
        ))}
      </div>
    );
  }
  return null;
};

export default function Dashboard() {
  const { data: metrics, loading: metricsLoading, lastFetched: metricsFetched, refresh: refreshMetrics } = usePolling('/patterns/metrics', 15000);
  const { data: secData, lastFetched: secFetched } = usePolling('/patterns/security', 15000);

  const barData = useMemo(() => {
    if (!metrics) return [];
    return [
      { name: 'clean', count: metrics.clean, color: '#10b981' },
      { name: 'anomaly', count: metrics.anomaly, color: '#ef4444' },
      { name: 'resolved', count: metrics.resolved, color: '#3b82f6' },
      { name: 'unresolvable', count: metrics.unresolvable, color: '#f97316' },
    ];
  }, [metrics]);

  const lineData = [
    { day: 'Mon', score: 85 },
    { day: 'Tue', score: 88 },
    { day: 'Wed', score: 72 },
    { day: 'Thu', score: 90 },
    { day: 'Fri', score: 65 },
    { day: 'Sat', score: 88 },
    { day: 'Sun', score: 92 },
  ];

  const recentEvents = secData?.anomalies?.slice(0, 5) || [];
  const anomalyCount = metrics?.anomaly || 0;

  return (
    <div className="min-h-screen bg-[#030712] flex font-sans text-gray-200">
      <Sidebar />

      <main className="ml-[220px] w-[calc(100%-220px)] min-h-screen bg-[#030712] p-[24px]">
        <PageHeader 
          title="Dashboard" 
          subtitle="System health and reconciliation overview" 
          lastFetched={metricsFetched} 
          onRefresh={refreshMetrics} 
        />

        {/* Top row - Metric cards */}
        <div className="grid grid-cols-4 gap-4 mb-8">
          {/* Card 1 */}
          <div className="bg-[#1e2130] rounded-xl border border-[#2d3148] p-5 hover:border-[#6366f1]/50 transition-colors">
            <div className="flex justify-between items-start mb-3">
              <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Total Transactions</span>
              <div className="w-8 h-8 rounded-lg bg-[#3b82f6]/10 flex items-center justify-center">
                <BarChart2 className="w-4 h-4 text-[#3b82f6]" />
              </div>
            </div>
            {metricsLoading && !metrics ? <div className="h-8 w-24 bg-[#2d3148] rounded animate-pulse" /> : (
              <div className="flex items-center gap-3 mt-2">
                <span className="text-3xl font-bold text-white">{metrics?.total?.toLocaleString() || 0}</span>
                <span className="flex items-center text-[10px] font-bold text-[#3b82f6] bg-[#3b82f6]/10 px-1.5 py-0.5 rounded">
                  <ArrowUpRight className="w-3 h-3 mr-0.5" /> UP
                </span>
              </div>
            )}
          </div>

          {/* Card 2 */}
          <div className="bg-[#1e2130] rounded-xl border border-[#2d3148] p-5 hover:border-[#6366f1]/50 transition-colors">
            <div className="flex justify-between items-start mb-3">
              <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Drift Rate %</span>
              <div className="w-8 h-8 rounded-lg bg-[#2d3148] flex items-center justify-center">
                <Activity className="w-4 h-4 text-gray-400" />
              </div>
            </div>
            {metricsLoading && !metrics ? <div className="h-8 w-20 bg-[#2d3148] rounded animate-pulse" /> : (
              <div className="flex items-center gap-3 mt-2">
                <span className={`text-3xl font-bold ${metrics?.driftRate > 20 ? 'text-[#ef4444]' : metrics?.driftRate > 10 ? 'text-[#f59e0b]' : 'text-[#10b981]'}`}>
                  {metrics?.driftRate?.toFixed(1) || 0}%
                </span>
                <div className="flex-1 max-w-[60px] h-1.5 bg-[#030712] rounded-full overflow-hidden shrink-0">
                  <div 
                    className={`h-full ${metrics?.driftRate > 20 ? 'bg-[#ef4444]' : metrics?.driftRate > 10 ? 'bg-[#f59e0b]' : 'bg-[#10b981]'}`}
                    style={{ width: `${Math.min(100, metrics?.driftRate || 0)}%` }} 
                  />
                </div>
              </div>
            )}
          </div>

          {/* Card 3 */}
          <div className="bg-[#1e2130] rounded-xl border border-[#2d3148] p-5 hover:border-[#6366f1]/50 transition-colors">
            <div className="flex justify-between items-start mb-3">
              <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Heal Success Rate</span>
              <div className="w-8 h-8 rounded-lg bg-[#10b981]/10 flex items-center justify-center">
                <ShieldAlert className="w-4 h-4 text-[#10b981]" />
              </div>
            </div>
            {metricsLoading && !metrics ? <div className="h-8 w-20 bg-[#2d3148] rounded animate-pulse" /> : (
              <div className="mt-2">
                <span className="text-3xl font-bold text-[#10b981]">{metrics?.healSuccessRate?.toFixed(1) || 0}%</span>
                <p className="text-[10px] text-gray-500 font-medium uppercase tracking-wider block">Auto-resolved</p>
              </div>
            )}
          </div>

          {/* Card 4 */}
          <div className="bg-[#1e2130] rounded-xl border border-[#2d3148] p-5 hover:border-[#6366f1]/50 transition-colors">
            <div className="flex justify-between items-start mb-3">
              <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Anomalies Detected</span>
              <div className="w-8 h-8 rounded-lg bg-[#ef4444]/10 flex items-center justify-center">
                <ShieldAlert className="w-4 h-4 text-[#ef4444]" />
              </div>
            </div>
            {metricsLoading && !metrics ? <div className="h-8 w-16 bg-[#2d3148] rounded animate-pulse" /> : (
              <div className="mt-2">
                <span className="text-3xl font-bold text-[#ef4444]">{anomalyCount}</span>
                {anomalyCount > 0 && <p className="text-[10px] text-[#ef4444] font-medium uppercase tracking-wider block">Needs attention</p>}
              </div>
            )}
          </div>
        </div>

        {/* Charts row */}
        <div className="grid grid-cols-2 gap-4 mb-8">
          <div className="bg-[#1e2130] rounded-xl border border-[#2d3148] p-6">
            <h3 className="text-sm font-semibold text-white mb-6">Transaction Status Distribution</h3>
            <div className="h-[250px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={barData} margin={{ top: 20, right: 30, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#2d3148" vertical={false} />
                  <XAxis dataKey="name" tick={{fill: '#9ca3af', fontSize: 11, textTransform: 'uppercase'}} axisLine={false} tickLine={false} dy={10} />
                  <YAxis tick={{fill: '#9ca3af', fontSize: 11}} axisLine={false} tickLine={false} dx={-10} />
                  <Tooltip cursor={{fill: '#2d3148', opacity: 0.4}} content={<CustomTooltip />} />
                  <Bar dataKey="count" radius={[4, 4, 0, 0]} maxBarSize={50}>
                    {barData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="bg-[#1e2130] rounded-xl border border-[#2d3148] p-6">
            <h3 className="text-sm font-semibold text-white mb-6">System Health Timeline</h3>
            <div className="h-[250px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={lineData} margin={{ top: 20, right: 30, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#2d3148" vertical={false} />
                  <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{fill: '#9ca3af', fontSize: 11}} dy={10} />
                  <YAxis domain={[0, 100]} axisLine={false} tickLine={false} tick={{fill: '#9ca3af', fontSize: 11}} dx={-10} />
                  <Tooltip content={<CustomTooltip />} cursor={{ stroke: '#2d3148' }} />
                  <Line type="monotone" dataKey="score" stroke="#6366f1" strokeWidth={3} dot={{r: 4, fill: '#1e2130', stroke: '#6366f1', strokeWidth: 2}} activeDot={{r: 6, fill: '#6366f1'}} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Live feed */}
        <div className="bg-[#1e2130] rounded-xl border border-[#2d3148] p-6">
          <h3 className="text-sm font-semibold text-white mb-6">Live Security Feed</h3>
          {!recentEvents.length ? (
            <p className="text-sm text-gray-500">No recent activity found.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left whitespace-nowrap text-sm">
                <thead>
                  <tr className="border-b border-[#2d3148]">
                    <th className="px-4 py-3 text-xs font-medium tracking-wider text-gray-400 uppercase">Transaction ID</th>
                    <th className="px-4 py-3 text-xs font-medium tracking-wider text-gray-400 uppercase w-48">Fraud Score</th>
                    <th className="px-4 py-3 text-xs font-medium tracking-wider text-gray-400 uppercase">Type</th>
                    <th className="px-4 py-3 text-xs font-medium tracking-wider text-gray-400 uppercase text-right">Time</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#2d3148]">
                  {recentEvents.map((evt) => {
                    const scoreColor = evt.fraud_score > 0.7 ? 'bg-[#ef4444]' : evt.fraud_score > 0.4 ? 'bg-[#f59e0b]' : 'bg-[#10b981]';
                    return (
                      <tr key={evt.id} className="hover:bg-[#2d3148]/30 transition-colors">
                        <td className="px-4 py-4 font-mono text-[#6366f1] text-xs font-bold">{evt.transaction_id}</td>
                        <td className="px-4 py-4 w-48">
                          <div className="flex items-center gap-2">
                            <div className="w-full max-w-[100px] h-1.5 bg-[#030712] rounded-full overflow-hidden">
                              <div className={`h-full rounded-full ${scoreColor}`} style={{ width: `${evt.fraud_score * 100}%` }} />
                            </div>
                            <span className="font-mono text-gray-400 text-xs">{evt.fraud_score.toFixed(2)}</span>
                          </div>
                        </td>
                        <td className="px-4 py-4">
                          <span className={`px-2 py-1 text-[10px] uppercase font-bold tracking-wider rounded border ${
                            evt.anomaly_type === 'REPLAY_ATTACK' ? 'bg-[#ef4444]/10 text-[#ef4444] border-[#ef4444]/30' : 
                            'bg-[#f59e0b]/10 text-[#f59e0b] border-[#f59e0b]/30'
                          }`}>
                            {evt.anomaly_type || 'UNKNOWN'}
                          </span>
                        </td>
                        <td className="px-4 py-4 text-xs text-gray-500 text-right">{timeAgo(evt.created_at)}</td>
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
