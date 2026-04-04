import React, { useState, useEffect } from 'react';
import { RefreshCw } from 'lucide-react';

export default function PageHeader({ title, subtitle, lastFetched, onRefresh }) {
  const [seconds, setSeconds] = useState(0);

  useEffect(() => {
    if (!lastFetched) {
      setSeconds(0);
      return;
    }
    const interval = setInterval(() => {
      setSeconds(Math.floor((Date.now() - lastFetched) / 1000));
    }, 1000);
    setSeconds(Math.floor((Date.now() - lastFetched) / 1000));
    return () => clearInterval(interval);
  }, [lastFetched]);

  return (
    <div className="flex items-center justify-between mb-8 w-full border-b border-[#2d3148] pb-6">
      <div>
        <h1 className="text-2xl font-bold text-white tracking-tight">{title}</h1>
        {subtitle && <p className="text-sm text-gray-400 mt-1">{subtitle}</p>}
      </div>
      {(lastFetched || onRefresh) && (
        <div className="flex items-center gap-4">
          {lastFetched && <span className="text-sm text-gray-400 font-medium whitespace-nowrap">Last refresh {seconds}s ago</span>}
          {onRefresh && (
            <button
              onClick={onRefresh}
              className="flex items-center gap-2 bg-[#1e2130] hover:bg-[#2d3148] border border-[#2d3148] text-gray-300 rounded-lg px-4 py-2 text-sm transition-colors"
            >
              <RefreshCw className="w-4 h-4" />
              Refresh
            </button>
          )}
        </div>
      )}
    </div>
  );
}
