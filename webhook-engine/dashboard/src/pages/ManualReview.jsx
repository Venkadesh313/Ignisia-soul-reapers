import React, { useState } from 'react';
import axios from 'axios';
import { CheckCircle, AlertTriangle, ShieldCheck, XCircle } from 'lucide-react';
import Sidebar from '../components/Sidebar';
import PageHeader from '../components/PageHeader';
import usePolling from '../hooks/usePolling';

function timeAgo(dateStr) {
  const diff = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  return `${Math.floor(diff / 3600)}h ago`;
}

export default function ManualReview() {
  const { data, loading, refresh, lastFetched } = usePolling('/patterns/security', 15000);
  const [actionLoading, setActionLoading] = useState(false);
  const [toast, setToast] = useState(null);

  const anomalies = data?.anomalies || [];
  const blockedItems = anomalies.filter(a => a.action === 'BLOCKED');
  
  const handleAction = async (transaction_id, decision) => {
    setActionLoading(true);
    try {
      await axios.post('/review/resolve', { transaction_id, decision });
      
      if (decision === 'SAFE') {
        setToast({ message: 'Marked as safe', type: 'success' });
      } else {
        setToast({ message: 'Confirmed as fraud', type: 'error' });
      }

      setTimeout(() => setToast(null), 3000);
      refresh(); // refetch list after decision
    } catch (err) {
      setToast({ message: 'Action failed: ' + (err.response?.data?.error || err.message), type: 'error' });
      setTimeout(() => setToast(null), 3000);
    }
    setActionLoading(false);
  };

  const highestScore = blockedItems.length > 0 ? Math.max(...blockedItems.map(i => i.fraud_score)).toFixed(2) : '0.00';

  return (
    <div className="min-h-screen bg-[#030712] flex font-sans text-gray-200">
      <Sidebar />

      <main className="ml-[220px] w-[calc(100%-220px)] min-h-screen bg-[#030712] p-[24px] relative">
        <PageHeader 
          title="Manual Review Queue" 
          subtitle="Review and action flagged transactions" 
          lastFetched={lastFetched} 
          onRefresh={refresh} 
        />

        {loading && !data ? (
          <div className="h-20 w-full bg-[#1e2130] rounded-xl border border-[#2d3148] animate-pulse" />
        ) : blockedItems.length === 0 ? (
          <div className="bg-[#10b981]/10 border border-[#10b981]/30 rounded-xl p-16 text-center flex flex-col items-center">
            <CheckCircle className="w-16 h-16 text-[#10b981] mb-6" />
            <h2 className="text-2xl font-bold text-[#10b981] mb-2">All Clear — No transactions pending review</h2>
            <p className="text-[#10b981]/80 text-sm">Your manual review queue is currently empty.</p>
          </div>
        ) : (
          <div className="space-y-6 max-w-6xl">
            <div className="flex gap-6">
              <div className="bg-[#1e2130] rounded-lg border border-[#2d3148] px-6 py-4 flex flex-col min-w-[200px]">
                <span className="text-xs text-gray-400 font-semibold uppercase tracking-widest mb-1">Flagged Transactions</span>
                <span className="text-3xl font-bold text-white">{blockedItems.length}</span>
              </div>
              <div className="bg-[#1e2130] rounded-lg border border-[#2d3148] px-6 py-4 flex flex-col min-w-[200px]">
                <span className="text-xs text-gray-400 font-semibold uppercase tracking-widest mb-1">Highest Risk Score</span>
                <span className="text-3xl font-bold text-[#ef4444]">{highestScore}</span>
              </div>
            </div>

            <div className="bg-[#1e2130] rounded-xl border border-[#2d3148] overflow-hidden">
              <div className="overflow-x-auto w-full">
                <table className="w-full text-left whitespace-nowrap text-sm">
                  <thead>
                    <tr className="bg-[#1a1d27] border-b border-[#2d3148]">
                      <th className="px-6 py-4 font-semibold text-gray-400 uppercase tracking-widest text-xs">Transaction ID</th>
                      <th className="px-6 py-4 font-semibold text-gray-400 uppercase tracking-widest text-xs">Fraud Score</th>
                      <th className="px-6 py-4 font-semibold text-gray-400 uppercase tracking-widest text-xs">Type</th>
                      <th className="px-6 py-4 font-semibold text-gray-400 uppercase tracking-widest text-xs">Detected</th>
                      <th className="px-6 py-4 font-semibold text-gray-400 uppercase tracking-widest text-xs text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#2d3148]">
                    {blockedItems.map(item => {
                      const scoreColor = item.fraud_score > 0.7 ? '#ef4444' : item.fraud_score > 0.4 ? '#f59e0b' : '#10b981';
                      
                      return (
                        <tr key={item.id} className="hover:bg-[#2d3148]/30 transition-colors">
                          <td className="px-6 py-4 font-mono text-[#6366f1] font-bold text-xs">{item.transaction_id}</td>
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-full flex items-center justify-center font-bold text-white shadow-inner" style={{ backgroundColor: scoreColor }}>
                                {item.fraud_score.toFixed(2)}
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                             <span className="px-2 py-1 bg-[#ef4444]/10 text-[#ef4444] border border-[#ef4444]/30 rounded text-[10px] uppercase font-bold tracking-wider">
                               {item.anomaly_type || 'UNKNOWN'}
                             </span>
                          </td>
                          <td className="px-6 py-4 text-gray-400 text-xs font-medium">{timeAgo(item.created_at)}</td>
                          <td className="px-6 py-4">
                            <div className="flex items-center justify-end gap-3">
                              <button 
                                disabled={actionLoading}
                                onClick={() => handleAction(item.transaction_id, 'SAFE')}
                                className="px-4 py-2 rounded border border-[#10b981] text-[#10b981] hover:bg-[#10b981]/10 font-bold transition-colors flex items-center gap-2 text-xs uppercase disabled:opacity-50"
                              >
                                <ShieldCheck className="w-4 h-4" />
                                Mark Safe
                              </button>
                              <button 
                                disabled={actionLoading}
                                onClick={() => handleAction(item.transaction_id, 'FRAUD')}
                                className="px-4 py-2 rounded bg-[#ef4444] hover:bg-[#dc2626] text-white font-bold transition-colors flex items-center gap-2 text-xs uppercase shadow-md disabled:opacity-50"
                              >
                                <AlertTriangle className="w-4 h-4" />
                                Confirm Fraud
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* Global Toast */}
        {toast && (
          <div className="fixed bottom-8 right-8 z-[100] animate-in fade-in slide-in-from-bottom-8 duration-300">
            <div className={`flex items-center gap-3 px-6 py-4 rounded-xl shadow-2xl border ${
              toast.type === 'success' ? 'bg-[#10b981]/90 border-[#10b981] text-white' : 'bg-[#ef4444]/90 border-[#ef4444] text-white'
            }`}>
              {toast.type === 'success' ? <CheckCircle className="w-5 h-5 flex-shrink-0" /> : <XCircle className="w-5 h-5 flex-shrink-0" />}
              <span className="font-semibold">{toast.message}</span>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
