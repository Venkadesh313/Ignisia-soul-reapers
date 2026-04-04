import React, { useEffect, useState } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { LayoutDashboard, Shield, Activity, ClipboardList, Brain, Heart, LogOut } from 'lucide-react';
import axios from 'axios';

const navLinks = [
  { path: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { path: '/security', icon: Shield, label: 'Security' },
  { path: '/transactions', icon: Activity, label: 'Transactions' },
  { path: '/review', icon: ClipboardList, label: 'Manual Review' },
  { path: '/ai-insights', icon: Brain, label: 'AI Insights' },
  { path: '/heal-monitor', icon: Heart, label: 'Heal Monitor' },
];

export default function Sidebar() {
  const navigate = useNavigate();
  const location = useLocation();
  const [blockedCount, setBlockedCount] = useState(0);

  useEffect(() => {
    // Sidebar fetches /patterns/security on mount to count BLOCKED items for badge
    axios.get('/patterns/security')
      .then(res => {
        if (res.data?.anomalies) {
          const blocks = res.data.anomalies.filter(a => a.action === 'BLOCKED').length;
          setBlockedCount(blocks);
        }
      })
      .catch(console.error);
    
    // Optional basic polling for the badge independent of page
    const interval = setInterval(() => {
      axios.get('/patterns/security')
        .then(res => {
          if (res.data?.anomalies) {
            const blocks = res.data.anomalies.filter(a => a.action === 'BLOCKED').length;
            setBlockedCount(blocks);
          }
        })
        .catch(console.error);
    }, 15000);

    return () => clearInterval(interval);
  }, []);

  const handleLogout = () => {
    sessionStorage.removeItem('isLoggedIn');
    navigate('/');
  };

  return (
    <aside className="fixed left-0 top-0 h-screen w-[220px] bg-[#1a1d27] border-r border-[#2d3148] flex flex-col z-50 text-gray-300 font-sans">
      {/* Logo */}
      <div className="p-6 border-b border-[#2d3148]">
        <Link to="/dashboard" className="flex items-center gap-3 group">
          <Shield className="w-8 h-8 text-[#6366f1] group-hover:scale-105 transition-transform" />
          <div className="flex flex-col">
            <span className="font-bold text-white text-[17px] tracking-tight leading-tight">WebhookGuard</span>
            <span className="text-[10px] text-gray-400 font-medium uppercase tracking-wider">Recon Engine</span>
          </div>
        </Link>
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-6 px-4 space-y-1 overflow-y-auto">
        {navLinks.map(({ path, icon: Icon, label }) => {
          const isActive = location.pathname === path;
          return (
            <Link
              key={path}
              to={path}
              className={`flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200
                ${isActive
                  ? 'bg-[#6366f1] text-white shadow-md'
                  : 'text-gray-400 hover:bg-[#1e2130] hover:text-gray-200'
                }`}
            >
              <div className="flex items-center gap-3 truncate">
                <Icon className={`w-5 h-5 flex-shrink-0 ${isActive ? 'text-white' : 'text-gray-400'}`} />
                <span className="truncate">{label}</span>
              </div>
              {path === '/review' && blockedCount > 0 && (
                <span className="bg-[#ef4444] text-white flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full text-[10px] font-bold shadow-sm">
                  {blockedCount}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      {/* Logout */}
      <div className="p-4 border-t border-[#2d3148]">
        <button
          onClick={handleLogout}
          className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-gray-400 hover:bg-[#ef4444]/10 hover:text-[#ef4444] w-full transition-colors duration-200"
        >
          <LogOut className="w-5 h-5 flex-shrink-0" />
          <span>Logout</span>
        </button>
      </div>
    </aside>
  );
}
