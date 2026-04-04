import React, { useState } from 'react';
import axios from 'axios';
import { Send, Search, CheckCircle, XCircle, AlertTriangle, Activity, Heart, ShieldAlert } from 'lucide-react';
import Sidebar from '../components/Sidebar';
import PageHeader from '../components/PageHeader';
import usePolling from '../hooks/usePolling';

export default function Transactions() {
  const { data: statusData, loading: statusLoading, refresh: refreshStatus, lastFetched } = usePolling('/status', 15000);

  const [webhookForm, setWebhookForm] = useState({ transaction_id: '', event_type: 'created', idempotency_key: '' });
  const [webhookLoading, setWebhookLoading] = useState(false);
  const [webhookResult, setWebhookResult] = useState(null);

  const [checkTxnId, setCheckTxnId] = useState('');
  const [checkLoading, setCheckLoading] = useState(false);
  const [checkResult, setCheckResult] = useState(null);

  const [healLoading, setHealLoading] = useState(false);
  const [healResult, setHealResult] = useState(null);

  const handleSendWebhook = async (e) => {
    e.preventDefault();
    setWebhookLoading(true);
    setWebhookResult(null);
    try {
      const res = await axios.post('/webhook', webhookForm, { headers: { 'x-webhook-signature': 'test' } });
      setWebhookResult({ success: true, data: res.data });
    } catch (err) {
      setWebhookResult({ success: false, message: err.response?.data?.error || err.message });
    }
    setWebhookLoading(false);
  };

  const handleCheck = async (e) => {
    e.preventDefault();
    if (!checkTxnId.trim()) return;
    setCheckLoading(true);
    setCheckResult(null);
    setHealResult(null);
    try {
      const res = await axios.post('/check', { transaction_id: checkTxnId.trim() });
      setCheckResult({ success: true, data: res.data });
    } catch (err) {
      setCheckResult({ success: false, message: err.response?.data?.error || err.message });
    }
    setCheckLoading(false);
  };

  const handleHeal = async () => {
    setHealLoading(true);
    setHealResult(null);
    try {
      const res = await axios.post('/heal', { transaction_id: checkTxnId.trim() });
      setHealResult({ success: true, data: res.data });
      // Refresh check to show it possibly healed
      await handleCheck({ preventDefault: () => {} });
    } catch (err) {
      setHealResult({ success: false, message: err.response?.data?.error || err.message });
    }
    setHealLoading(false);
  };

  return (
    <div className="min-h-screen bg-[#030712] flex font-sans text-gray-200">
      <Sidebar />

      <main className="ml-[220px] w-[calc(100%-220px)] min-h-screen bg-[#030712] p-[24px]">
        <PageHeader 
          title="Transactions" 
          subtitle="Simulate webhooks and inspect states" 
          lastFetched={lastFetched} 
          onRefresh={refreshStatus} 
        />

        <div className="flex flex-col space-y-6 max-w-4xl">
          {/* Section 1: Engine status */}
          <section className="bg-[#1e2130] rounded-xl border border-[#2d3148] p-6 shadow-md">
            <h2 className="text-sm font-semibold text-white mb-4 tracking-wide uppercase">Engine Status</h2>
            {statusLoading && !statusData ? (
              <div className="h-10 w-full bg-[#2d3148] rounded animate-pulse" />
            ) : statusData ? (
              <div className="flex items-center gap-4 bg-[#030712] p-4 rounded-lg border border-[#2d3148]">
                <Activity className="w-5 h-5 text-gray-400" />
                <span className="text-gray-400 font-medium">Service:</span>
                <span className="text-white font-mono">{statusData.service}</span>
                <div className="w-px h-6 bg-[#2d3148] mx-2" />
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full bg-[#10b981] shadow-[0_0_8px_#10b981]" />
                  <span className="text-[#10b981] font-bold uppercase tracking-widest">{statusData.status}</span>
                </div>
              </div>
            ) : (
              <div className="text-[#ef4444] text-sm font-medium">Unable to fetch status</div>
            )}
          </section>

          {/* Section 2: Send Webhook */}
          <section className="bg-[#1e2130] rounded-xl border border-[#2d3148] p-6 shadow-md">
            <h2 className="text-sm font-semibold text-white mb-6 uppercase tracking-wide">Inject Test Webhook</h2>
            
            <form onSubmit={handleSendWebhook} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div>
                  <label className="block text-xs font-semibold text-gray-400 mb-2 uppercase tracking-wide">Transaction ID</label>
                  <input 
                    type="text" 
                    value={webhookForm.transaction_id} 
                    onChange={(e) => setWebhookForm({...webhookForm, transaction_id: e.target.value})} 
                    placeholder="tx_001" 
                    className="w-full bg-[#030712] border border-[#2d3148] text-white rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-[#6366f1] transition-colors" 
                    required 
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-400 mb-2 uppercase tracking-wide">Event Type</label>
                  <select 
                    value={webhookForm.event_type} 
                    onChange={(e) => setWebhookForm({...webhookForm, event_type: e.target.value})} 
                    className="w-full bg-[#030712] border border-[#2d3148] text-white rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-[#6366f1] transition-colors"
                  >
                    {['created','captured','settled','refunded','failed'].map(typ => <option key={typ} value={typ}>{typ}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-400 mb-2 uppercase tracking-wide">Idempotency Key</label>
                  <input 
                    type="text" 
                    value={webhookForm.idempotency_key} 
                    onChange={(e) => setWebhookForm({...webhookForm, idempotency_key: e.target.value})} 
                    placeholder="key_001" 
                    className="w-full bg-[#030712] border border-[#2d3148] text-white rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-[#6366f1] transition-colors" 
                    required 
                  />
                </div>
              </div>
              <button 
                type="submit" 
                disabled={webhookLoading} 
                className="bg-[#6366f1] hover:bg-[#4f46e5] text-white rounded-lg px-6 py-2.5 text-sm font-semibold transition-colors disabled:opacity-50 flex items-center gap-2"
              >
                <Send className="w-4 h-4" />
                {webhookLoading ? 'Sending...' : 'Send Webhook'}
              </button>
            </form>

            {webhookResult && (
              <div className={`mt-6 rounded-lg p-4 border flex items-start gap-3 ${
                webhookResult.success ? 'bg-[#10b981]/10 border-[#10b981]/30 text-[#10b981]' : 
                'bg-[#ef4444]/10 border-[#ef4444]/30 text-[#ef4444]'
              }`}>
                {webhookResult.success ? <CheckCircle className="w-5 h-5 flex-shrink-0" /> : <XCircle className="w-5 h-5 flex-shrink-0" />}
                <div className="w-full overflow-hidden">
                  <p className="font-semibold text-sm mb-1">{webhookResult.success ? 'Webhook Processed' : 'Webhook Failed'}</p>
                  <pre className="text-xs opacity-80 whitespace-pre-wrap font-mono">
                    {JSON.stringify(webhookResult.success ? webhookResult.data : webhookResult.message, null, 2)}
                  </pre>
                </div>
              </div>
            )}
          </section>

          {/* Section 3: Check Transaction */}
          <section className="bg-[#1e2130] rounded-xl border border-[#2d3148] p-6 shadow-md">
            <h2 className="text-sm font-semibold text-white mb-6 uppercase tracking-wide">Check Transaction State</h2>
            
            <form onSubmit={handleCheck} className="flex gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                <input 
                  type="text" 
                  value={checkTxnId} 
                  onChange={(e) => setCheckTxnId(e.target.value)} 
                  placeholder="Enter transaction ID to check (e.g. tx_001)..." 
                  className="w-full bg-[#030712] border border-[#2d3148] text-white rounded-lg pl-10 pr-4 py-2.5 text-sm placeholder-gray-600 focus:outline-none focus:border-[#6366f1] transition-colors" 
                  required 
                />
              </div>
              <button 
                type="submit" 
                disabled={checkLoading} 
                className="bg-[#2d3148] hover:bg-[#3f4563] text-white rounded-lg px-6 py-2.5 text-sm font-semibold transition-colors disabled:opacity-50 whitespace-nowrap"
              >
                {checkLoading ? 'Checking...' : 'Check Status'}
              </button>
            </form>

            {checkResult && (
              <div className="mt-6">
                {checkResult.success ? (
                  <div className="bg-[#030712] border border-[#2d3148] rounded-xl overflow-hidden p-6 space-y-4">
                    <div className="flex items-center gap-4">
                      <span className="text-sm text-gray-400 font-medium uppercase">Status:</span>
                      <span className={`px-3 py-1 text-xs font-bold uppercase rounded border ${
                        checkResult.data.status === 'CLEAN' ? 'bg-[#10b981]/20 text-[#10b981] border-[#10b981]/30' : 
                        checkResult.data.status === 'ANOMALY' ? 'bg-[#ef4444]/20 text-[#ef4444] border-[#ef4444]/30' : 
                        'bg-[#6366f1]/20 text-[#6366f1] border-[#6366f1]/30'
                      }`}>
                        {checkResult.data.status}
                      </span>
                    </div>

                    {checkResult.data.gaps && checkResult.data.gaps.length > 0 && (
                      <div className="flex flex-col gap-2">
                        <span className="text-sm text-gray-400 font-medium uppercase">Gaps Detected:</span>
                        <div className="flex gap-2">
                          {checkResult.data.gaps.map((g, i) => (
                            <span key={i} className="px-2 py-1 bg-gray-800 text-gray-300 rounded text-xs font-mono">{g}</span>
                          ))}
                        </div>
                      </div>
                    )}

                    {checkResult.data.status === 'ANOMALY' && (
                      <div className="pt-4 border-t border-[#2d3148]">
                        <button 
                          onClick={handleHeal} 
                          disabled={healLoading}
                          className="bg-[#10b981] hover:bg-[#059669] text-white px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 transition-colors disabled:opacity-50"
                        >
                          <Heart className="w-4 h-4" /> 
                          {healLoading ? 'Healing...' : 'Trigger Auto-Heal'}
                        </button>
                      </div>
                    )}

                    {healResult && (
                       <div className={`rounded-lg p-4 border flex items-start gap-3 mt-4 ${
                        healResult.success && healResult.data.healed ? 'bg-[#10b981]/10 border-[#10b981]/30 text-[#10b981]' : 
                        'bg-[#ef4444]/10 border-[#ef4444]/30 text-[#ef4444]'
                      }`}>
                        {healResult.success && healResult.data.healed ? <CheckCircle className="w-5 h-5 flex-shrink-0" /> : <ShieldAlert className="w-5 h-5 flex-shrink-0" />}
                        <div className="w-full">
                          <p className="font-semibold text-sm">
                            {healResult.success && healResult.data.healed 
                              ? 'Transaction successfully healed' 
                              : `Heal failed: ${healResult.data?.reason || healResult.message || 'Unknown'}`}
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="flex items-center gap-3 p-4 bg-[#ef4444]/10 border border-[#ef4444]/30 text-[#ef4444] rounded-xl">
                    <AlertTriangle className="w-5 h-5 flex-shrink-0" />
                    <span className="text-sm font-medium">{checkResult.message}</span>
                  </div>
                )}
              </div>
            )}
          </section>
        </div>
      </main>
    </div>
  );
}
