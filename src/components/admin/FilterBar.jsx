import { Search, X, Filter } from 'lucide-react';

export default function FilterBar({
  filters = [],
  values = {},
  onChange,
  searchValue = '',
  onSearchChange,
  searchPlaceholder = 'Search...',
}) {
  function clearAll() {
    filters.forEach((f) => onChange(f.key, ''));
    if (onSearchChange) onSearchChange('');
  }

  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
      <div className="flex items-center gap-2 mb-3">
        <Filter className="w-4 h-4 text-gray-400" />
        <span className="text-sm font-medium text-gray-500">Filters</span>
      </div>
      <div className="flex flex-wrap items-center gap-3">
        {typeof onSearchChange === 'function' && (
          <div className="relative flex-1 min-w-[220px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              value={searchValue}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder={searchPlaceholder}
              className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            />
          </div>
        )}

        {filters.map((f) => (
          <select
            key={f.key}
            value={values[f.key] || ''}
            onChange={(e) => onChange(f.key, e.target.value)}
            className="py-2 pl-3 pr-8 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white"
          >
            <option value="">{f.label}: All</option>
            {f.options.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        ))}

        <button
          onClick={clearAll}
          className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
        >
          <X className="w-4 h-4" />
          Clear
        </button>
      </div>
    </div>
  );
}