import { TrendingUp, TrendingDown } from 'lucide-react';

const colorMap = {
  indigo: 'bg-indigo-100 text-indigo-600',
  green: 'bg-green-100 text-green-600',
  red: 'bg-red-100 text-red-600',
  yellow: 'bg-yellow-100 text-yellow-700',
  blue: 'bg-blue-100 text-blue-600',
  purple: 'bg-purple-100 text-purple-600',
  pink: 'bg-pink-100 text-pink-600',
  cyan: 'bg-cyan-100 text-cyan-600',
  gray: 'bg-gray-100 text-gray-600',
};

export default function StatCard({
  title,
  value,
  icon: Icon = null,
  color = 'indigo',
  subtitle,
  trend,
}) {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
      <div className="flex items-start justify-between gap-2">
        {Icon && (
          <div
            className={`inline-flex p-2.5 rounded-lg ${colorMap[color] || colorMap.indigo}`}
          >
            <Icon className="w-5 h-5" />
          </div>
        )}
        {trend && (
          <span
            className={`inline-flex items-center gap-1 text-xs font-medium rounded-full px-2 py-0.5 ${
              trend.up ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
            }`}
          >
            {trend.up ? (
              <TrendingUp className="w-3.5 h-3.5" />
            ) : (
              <TrendingDown className="w-3.5 h-3.5" />
            )}
            {trend.label}
          </span>
        )}
      </div>
      <div className="mt-4">
        <div className="text-2xl font-bold text-gray-900 leading-tight truncate">
          {value}
        </div>
        <div className="mt-1 text-sm font-medium text-gray-500">{title}</div>
        {subtitle && <div className="mt-1 text-xs text-gray-400">{subtitle}</div>}
      </div>
    </div>
  );
}