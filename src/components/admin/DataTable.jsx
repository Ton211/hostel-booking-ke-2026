import { useState, useMemo, useEffect } from 'react';
import {
  ChevronDown,
  ChevronUp,
  ChevronsUpDown,
  Inbox,
  Loader2,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';

export default function DataTable({
  columns = [],
  data = [],
  onRowClick,
  loading = false,
  emptyMessage = 'No records found',
  pageSize = 10,
  pagination = true,
  onPageChange,
}) {
  const [sortKey, setSortKey] = useState(null);
  const [sortDir, setSortDir] = useState('asc');
  const [page, setPage] = useState(1);

  const totalItems = (data || []).length;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));

  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, totalPages]);

  useEffect(() => {
    onPageChange?.(page);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page]);

  const sorted = useMemo(() => {
    const rows = [...(data || [])];
    if (!sortKey) return rows;
    return rows.sort((a, b) => {
      const av = a[sortKey] ?? '';
      const bv = b[sortKey] ?? '';
      const result =
        typeof av === 'number' && typeof bv === 'number'
          ? av - bv
          : String(av).localeCompare(String(bv), undefined, { numeric: true });
      return sortDir === 'asc' ? result : -result;
    });
  }, [data, sortKey, sortDir]);

  const pageRows = pagination
    ? sorted.slice((page - 1) * pageSize, page * pageSize)
    : sorted;

  function handleSort(col) {
    if (!col.key || col.sortable === false) return;
    if (sortKey === col.key) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(col.key);
      setSortDir('asc');
    }
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              {columns.map((col) => (
                <th
                  key={col.key || col.label}
                  onClick={() => col.sortable !== false && col.key && handleSort(col)}
                  className={`px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider ${
                    col.sortable !== false && col.key
                      ? 'cursor-pointer select-none'
                      : ''
                  } ${col.className || ''}`}
                >
                  <span className="inline-flex items-center gap-1.5">
                    {col.label}
                    {col.sortable !== false && col.key ? (
                      sortKey === col.key ? (
                        sortDir === 'asc' ? (
                          <ChevronUp className="w-3.5 h-3.5 text-indigo-500" />
                        ) : (
                          <ChevronDown className="w-3.5 h-3.5 text-indigo-500" />
                        )
                      ) : (
                        <ChevronsUpDown className="w-3.5 h-3.5 text-gray-300" />
                      )
                    ) : null}
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 bg-white">
            {loading ? (
              <tr>
                <td colSpan={columns.length} className="px-4 py-14 text-center">
                  <div className="flex flex-col items-center gap-2 text-gray-400">
                    <Loader2 className="w-7 h-7 animate-spin text-indigo-500" />
                    <span className="text-sm">Loading...</span>
                  </div>
                </td>
              </tr>
            ) : pageRows.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="px-4 py-14 text-center">
                  <div className="flex flex-col items-center gap-2 text-gray-400">
                    <Inbox className="w-9 h-9" />
                    <span className="text-sm">{emptyMessage}</span>
                  </div>
                </td>
              </tr>
            ) : (
              pageRows.map((row, idx) => (
                <tr
                  key={row.id || idx}
                  onClick={() => onRowClick?.(row)}
                  className={`hover:bg-indigo-50/50 transition-colors ${
                    onRowClick ? 'cursor-pointer' : ''
                  } ${idx % 2 === 1 ? 'bg-gray-50/50' : ''}`}
                >
                  {columns.map((col) => (
                    <td key={col.key || col.label} className="px-4 py-3 text-sm text-gray-700 align-middle">
                      {col.render ? col.render(row) : row[col.key]}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {pagination && !loading && totalItems > 0 && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-4 py-3 border-t border-gray-100 bg-gray-50">
          <span className="text-xs text-gray-500">
            Showing{' '}
            <strong className="font-medium text-gray-700">
              {(page - 1) * pageSize + 1}
            </strong>{' '}
            to{' '}
            <strong className="font-medium text-gray-700">
              {Math.min(page * pageSize, totalItems)}
            </strong>{' '}
            of <strong className="font-medium text-gray-700">{totalItems}</strong>
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="p-1.5 rounded-lg border border-gray-200 bg-white text-gray-600 hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed"
              aria-label="Previous page"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="text-xs font-medium text-gray-600">
              Page {page} of {totalPages}
            </span>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="p-1.5 rounded-lg border border-gray-200 bg-white text-gray-600 hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed"
              aria-label="Next page"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}