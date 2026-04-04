import React from 'react';

export default function MetricCard({ title, value, subtitle, icon: Icon, colorClass = 'from-indigo-500 to-indigo-600', trend }) {
  return (
    <div className="bg-gray-900 rounded-xl border border-gray-800 p-6 flex items-start gap-4 hover:border-gray-700 transition-colors duration-200">
      <div className={`flex-shrink-0 w-12 h-12 rounded-lg bg-gradient-to-br ${colorClass} flex items-center justify-center`}>
        {Icon && <Icon className="w-6 h-6 text-white" />}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm text-gray-400 font-medium">{title}</p>
        <p className="text-2xl font-bold text-white mt-1">{value}</p>
        {subtitle && (
          <p className="text-xs text-gray-500 mt-1">{subtitle}</p>
        )}
        {trend && (
          <p className={`text-xs mt-1 font-medium ${trend.positive ? 'text-emerald-400' : 'text-red-400'}`}>
            {trend.positive ? '↑' : '↓'} {trend.text}
          </p>
        )}
      </div>
    </div>
  );
}
