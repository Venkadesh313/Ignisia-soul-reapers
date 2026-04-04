import React from 'react';
import { ShieldCheck, Activity, Bell, Clock, AlertTriangle } from 'lucide-react';
import Sidebar from '../components/Sidebar';
import PageHeader from '../components/PageHeader';
import usePolling from '../hooks/usePolling';

function formatTime(ts) {
  const d = new Date(ts);
  return d.toLocaleString();
}

export default function AIInsights() {
  const { data: flagsData, loading: flagsLoading, lastFetched: flagsFetched, refresh: flagsRefresh } = usePolling('/patterns/flags', 15000);
  const { data: surgeData } = usePolling('/patterns/surge', 15000);

  const flags = flagsData?.flags || [];

  return (
    <div className="min-h-screen bg-[#030712] flex font-sans text-gray-200">
      <Sidebar />

      <main className="ml-[220px] w-[calc(100%-220px)] min-h-screen bg-[#030712] p-[24px] space-y-10">
        <PageHeader 
          title="AI Pattern Intelligence" 
          subtitle="Real-time behavioral anomaly detection"
          lastFetched={flagsFetched} 
          onRefresh={flagsRefresh} 
        />

        {/* Section 1: Pattern Detection Status */}
        <section>
           <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-widest mb-6">Pattern Detection Status</h2>
           {flagsLoading && !flagsData ? (
             <div className="h-32 w-full bg-[#1e2130] rounded-xl border border-[#2d3148] animate-pulse" />
           ) : flags.length === 0 ? (
             <div className="bg-[#10b981]/10 border border-[#10b981]/30 rounded-xl p-10 flex flex-col items-center justify-center">
               <ShieldCheck className="w-12 h-12 text-[#10b981] mb-4" />
               <p className="text-xl font-bold text-[#10b981] mb-2">AI Pattern Detection Active — All Clear</p>
               <p className="text-[#10b981]/80 text-sm">System behavior is normal. No anomalous patterns detected.</p>
             </div>
           ) : (
             <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
               {flags.map((flag, idx) => {
                 const isHigh = flag.severity === 'HIGH';
                 const borderColor = isHigh ? 'border-l-[#ef4444]' : 'border-l-[#f59e0b]';
                 
                 return (
                   <div key={idx} className={`bg-[#1e2130] rounded-r-xl border border-[#2d3148] border-l-4 ${borderColor} p-6 flex flex-col`}>
                     <div className="flex items-center justify-between mb-4">
                       <span className={`px-2.5 py-1 text-[10px] font-bold uppercase rounded border tracking-wider ${
                         isHigh ? 'bg-[#ef4444]/10 text-[#ef4444] border-[#ef4444]/30' : 'bg-[#f59e0b]/10 text-[#f59e0b] border-[#f59e0b]/30'
                       }`}>
                         {flag.type}
                       </span>
                       <span className={`text-[10px] uppercase font-bold tracking-wider ${isHigh ? 'text-[#ef4444]' : 'text-[#f59e0b]'}`}>
                         {flag.severity}
                       </span>
                     </div>
                     <p className="text-sm text-gray-300 flex-1 mb-6 leading-relaxed">{flag.detail}</p>
                     
                     {flag.type === 'FAILURE_SPIKE' && flag.baseline !== undefined && flag.current !== undefined && (
                       <div className="bg-[#030712] border border-[#2d3148] p-4 rounded-lg space-y-4 mb-4">
                         <div>
                           <div className="flex justify-between text-xs font-semibold uppercase tracking-widest text-gray-400 mb-1.5">
                             <span>Baseline Rate</span>
                             <span className="text-white font-mono">{flag.baseline}%</span>
                           </div>
                           <div className="w-full h-1.5 bg-[#2d3148] rounded-full overflow-hidden">
                             <div className="h-full bg-[#10b981]" style={{ width: `${Math.min(100, flag.baseline)}%` }} />
                           </div>
                         </div>
                         <div>
                           <div className="flex justify-between text-xs font-semibold uppercase tracking-widest text-gray-400 mb-1.5">
                             <span className="text-[#ef4444]">Current Spike</span>
                             <span className="text-[#ef4444] font-mono">{flag.current}%</span>
                           </div>
                           <div className="w-full h-1.5 bg-[#2d3148] rounded-full overflow-hidden">
                             <div className="h-full bg-[#ef4444]" style={{ width: `${Math.min(100, flag.current)}%` }} />
                           </div>
                         </div>
                       </div>
                     )}

                     {flag.type === 'RETRY_STORM' && flag.duplicateRate !== undefined && (
                       <div className="bg-[#030712] border border-[#2d3148] p-4 rounded-lg flex items-center justify-between mb-4">
                         <span className="text-xs uppercase font-semibold text-gray-400 tracking-widest">Duplication Rate</span>
                         <span className="text-2xl font-bold text-[#f59e0b]">{flag.duplicateRate}</span>
                       </div>
                     )}

                     {flag.type === 'DELAY_ANOMALY' && flag.avgDelayMs !== undefined && flag.currentDelayMs !== undefined && (
                       <div className="bg-[#030712] border border-[#2d3148] p-4 rounded-lg grid grid-cols-2 divide-x divide-[#2d3148] mb-4">
                         <div className="px-2">
                           <span className="block text-[10px] uppercase font-semibold tracking-widest text-gray-500 mb-1">Avg Delay</span>
                           <span className="text-white font-mono">{flag.avgDelayMs}ms</span>
                         </div>
                         <div className="px-2">
                           <span className="block text-[10px] uppercase font-semibold tracking-widest text-gray-500 mb-1">Current Delay</span>
                           <span className="text-[#f59e0b] font-mono">{flag.currentDelayMs}ms</span>
                         </div>
                       </div>
                     )}

                     <div className="mt-auto text-[10px] text-gray-500 uppercase tracking-widest font-semibold flex items-center gap-1.5">
                       <Clock className="w-3 h-3" />
                       {formatTime(flag.timestamp)}
                     </div>
                   </div>
                 );
               })}
             </div>
           )}
        </section>

        {/* Section 2: Surge Protection */}
        <section>
          <div className="flex items-center gap-3 mb-6">
            <h2 className="text-sm font-semibold text-white tracking-widest uppercase">Surge Protection</h2>
            {!surgeData && <div className="h-4 w-16 bg-[#2d3148] rounded animate-pulse" />}
          </div>
          
          <div className="bg-[#1e2130] rounded-xl border border-[#2d3148] p-6">
            <div className="grid grid-cols-4 gap-4 mb-6">
              <div className="bg-[#030712] rounded-lg border border-[#2d3148] p-5">
                <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest block mb-2">Avg Response Time</span>
                <span className="text-2xl font-bold text-white">{surgeData ? surgeData.avgResponseTime : '--'}ms</span>
              </div>
              <div className="bg-[#030712] rounded-lg border border-[#2d3148] p-5">
                <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest block mb-2">Current Rate Limit</span>
                <span className="text-2xl font-bold text-[#6366f1]">{surgeData ? surgeData.currentLimit : '--'} req/s</span>
              </div>
              <div className="bg-[#030712] rounded-lg border border-[#2d3148] p-5">
                <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest block mb-2">Queue Depth</span>
                <span className="text-2xl font-bold text-gray-300">{surgeData ? surgeData.queueDepth : '--'} items</span>
              </div>
              <div className="bg-[#030712] rounded-lg border border-[#2d3148] p-5">
                <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest block mb-2">System Status</span>
                {surgeData ? (
                  <span className={`px-2.5 py-1 text-[10px] uppercase font-bold tracking-widest rounded border inline-block mt-1 ${
                    surgeData.status === 'HEALTHY' ? 'bg-[#10b981]/10 text-[#10b981] border-[#10b981]/30' :
                    surgeData.status === 'CRITICAL' ? 'bg-[#ef4444]/10 text-[#ef4444] border-[#ef4444]/30' :
                    'bg-[#f59e0b]/10 text-[#f59e0b] border-[#f59e0b]/30'
                  }`}>
                    {surgeData.status}
                  </span>
                ) : <span className="text-2xl font-bold text-gray-500">--</span>}
              </div>
            </div>
            {surgeData?.thresholds && (
              <div className="p-4 bg-[#6366f1]/10 border border-[#6366f1]/20 rounded-lg text-sm text-[#6366f1]/90">
                <p className="font-semibold mb-1 uppercase tracking-wider text-[10px]">Dynamic Thresholds Architecture</p>
                <p>System maintains {surgeData.thresholds.healthyLimit} req/s when healthy. Degrades to {surgeData.thresholds.degradedLimit} req/s if DB response &gt; {surgeData.thresholds.healthyMaxMs}ms. Locks down to {surgeData.thresholds.criticalLimit} req/s if queue depth exceeds {surgeData.thresholds.maxQueueDepth}. Rate limit automatically recovers when pressure drops.</p>
              </div>
            )}
          </div>
        </section>

        {/* Section 3: How It Works */}
        <section>
          <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-widest mb-6">How It Works</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-[#1e2130] rounded-xl border border-[#2d3148] p-6 hover:border-[#ef4444]/50 transition-colors">
              <div className="w-10 h-10 rounded-lg bg-[#ef4444]/10 flex items-center justify-center mb-4 border border-[#ef4444]/20">
                <AlertTriangle className="w-5 h-5 text-[#ef4444]" />
              </div>
              <h3 className="font-bold text-white mb-2 tracking-wide">Failure Spike Detection</h3>
              <p className="text-sm text-gray-400 leading-relaxed">
                Monitors failure rate across a rolling 100-event window vs the immediate last 10 events.
                Flags if the localized current rate exceeds the established baseline drastically while being significantly high.
              </p>
            </div>

            <div className="bg-[#1e2130] rounded-xl border border-[#2d3148] p-6 hover:border-[#f59e0b]/50 transition-colors">
              <div className="w-10 h-10 rounded-lg bg-[#f59e0b]/10 flex items-center justify-center mb-4 border border-[#f59e0b]/20">
                <Bell className="w-5 h-5 text-[#f59e0b]" />
              </div>
              <h3 className="font-bold text-white mb-2 tracking-wide">Retry Storm Detection</h3>
              <p className="text-sm text-gray-400 leading-relaxed">
                Actively tracks duplicate webhook attempts targeting identical entities. Automatically flags the system if the ratio of duplications exceeds safety thresholds limiting upstream congestion.
              </p>
            </div>

            <div className="bg-[#1e2130] rounded-xl border border-[#2d3148] p-6 hover:border-[#6366f1]/50 transition-colors">
              <div className="w-10 h-10 rounded-lg bg-[#6366f1]/10 flex items-center justify-center mb-4 border border-[#6366f1]/20">
                <Activity className="w-5 h-5 text-[#6366f1]" />
              </div>
              <h3 className="font-bold text-white mb-2 tracking-wide">Delay Anomaly Detection</h3>
              <p className="text-sm text-gray-400 leading-relaxed">
                Time-series tracking evaluates created-to-captured operational timings per transaction.
                Flags the event securely if localized downstream processes begin exceeding aggregated averages by more than defined multipliers.
              </p>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
