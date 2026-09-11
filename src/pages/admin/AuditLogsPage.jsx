import { useEffect, useState, useMemo, useCallback } from 'react';

import DataTable from '../../components/admin/DataTable';
import FilterBar from '../../components/admin/FilterBar';
import StatusBadge from '../../components/admin/StatusBadge';
import { getAuditLogs } from '../../services/auditService';
import { getAdmins } from '../../services/adminService';

function fmtDateTime(value) {
  if (!value) return 'N/A';
  if (typeof value === 'object' && typeof value.toDate === 'function')
    return value.toDate().toLocaleString();
  const d = new Date(value);
  return isNaN(d.getTime()) ? String(value) : d.toLocaleString();
}

function dateValue(value) {
  if (!value) return null;
  if (typeof value === 'object' && typeof value.toDate === 'function') {
    const d = value.toDate();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(
      d.getDate()
    ).padStart(2, '0')}`;
  }
  return value;
}

function actionType(action) {
  const a = String(action || '').toLowerCase();
  if (a.includes('login')) return 'login';
  if (a.includes('logout')) return 'logout';
  if (a.includes('create') || a.includes('add')) return 'create';
  if (a.includes('delete') || a.includes('deactivate')) return 'delete';
  if (a.includes('transfer')) return 'transfer';
  if (a.includes('cancel')) return 'cancel';
  if (a.includes('block')) return 'block';
  if (a.includes('unblock')) return 'unblock';
  if (a.includes('update') || a.includes('edit')) return 'update';
  return 'other';
}

export default function AuditLogsPage() {
  const [logs, setLogs] = useState([]);
  const [admins, setAdmins] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [search, setSearch] = useState('');
  const [filters, setFilters] = useState({
    action: '',
    performedBy: '',
    entityType: '',
    dateFrom: '',
    dateTo: '',
  });

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [logList, adminList] = await Promise.all([
        getAuditLogs({ limit: 500 }),
        getAdmins(),
      ]);
      setLogs(logList);
      setAdmins(adminList);
    } catch (err) {
      console.error('Failed to load audit logs:', err);
      setError('Failed to load audit logs. Please try again.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return logs.filter((log) => {
      const detailsText = `${log.details || ''} ${log.entityName || ''} ${log.entityId || ''}`.toLowerCase();
      const matchesSearch =
        !q ||
        (log.performedByName || '').toLowerCase().includes(q) ||
        (log.action || '').toLowerCase().includes(q) ||
        detailsText.includes(q);

      const matchesAction =
        !filters.action || actionType(log.action) === filters.action;
      const matchesAdmin =
        !filters.performedBy || log.performedBy === filters.performedBy;
      const matchesEntity =
        !filters.entityType ||
        (log.entityType || '').toLowerCase() === filters.entityType.toLowerCase();
      let matchesRange = true;
      if (filters.dateFrom || filters.dateTo) {
        const d = dateValue(log.createdAt);
        if (d) {
          if (filters.dateFrom && d < filters.dateFrom) matchesRange = false;
          if (filters.dateTo && d > filters.dateTo) matchesRange = false;
        }
      }
      return (
        matchesSearch &&
        matchesAction &&
        matchesAdmin &&
        matchesEntity &&
        matchesRange
      );
    });
  }, [logs, search, filters]);

  function handleChange(key, value) {
    setFilters((f) => ({ ...f, [key]: value }));
  }

  const entityOptions = useMemo(() => {
    const set = new Set();
    logs.forEach((l) => {
      if (l.entityType) set.add(l.entityType.toLowerCase());
    });
    return [...set].sort().map((t) => ({ value: t, label: t.toUpperCase() }));
  }, [logs]);

  const filterConfigs = [
    {
      key: 'action',
      label: 'Action',
      options: [
        { value: 'create', label: 'Create' },
        { value: 'update', label: 'Update' },
        { value: 'delete', label: 'Delete' },
        { value: 'login', label: 'Login' },
        { value: 'logout', label: 'Logout' },
        { value: 'transfer', label: 'Transfer' },
        { value: 'cancel', label: 'Cancel' },
        { value: 'block', label: 'Block' },
        { value: 'unblock', label: 'Unblock' },
        { value: 'other', label: 'Other' },
      ],
    },
    {
      key: 'performedBy',
      label: 'Admin',
      options: admins
        .filter((a) => a.uid)
        .map((a) => ({ value: a.uid, label: a.displayName || a.email })),
    },
    { key: 'entityType', label: 'Record Type', options: entityOptions },
  ];

  const columns = [
    {
      key: 'createdAt',
      label: 'Date / Time',
      sortable: true,
      render: (l) => (
        <span className="text-stone-600 whitespace-nowrap">
          {fmtDateTime(l.createdAt)}
        </span>
      ),
    },
    {
      key: 'performedByName',
      label: 'Admin',
      render: (l) => (
        <div>
          <div className="font-medium text-stone-900">
            {l.performedByName || l.performedBy || 'System'}
          </div>
          {l.performedBy && l.performedByName !== l.performedBy && (
            <div className="text-xs text-stone-400">{l.performedBy}</div>
          )}
        </div>
      ),
    },
    {
      key: 'action',
      label: 'Action',
      sortable: true,
      render: (l) => <StatusBadge status={actionType(l.action)} type="record" />,
    },
    {
      key: 'entityType',
      label: 'Record Type',
      render: (l) => (
        <span className="text-stone-700 text-xs font-medium uppercase tracking-wide">
          {l.entityType || 'N/A'}
        </span>
      ),
    },
    {
      key: 'entityId',
      label: 'Record ID',
      render: (l) => (
        <span className="text-stone-500 text-xs break-all">{l.entityId || 'N/A'}</span>
      ),
    },
    {
      key: 'details',
      label: 'Details',
      render: (l) => {
        const text =
          l.details ||
          [l.entityName, l.newValues ? JSON.stringify(l.newValues) : '']
            .filter(Boolean)
            .join(': ');
        return (
          <div>
            <div className="text-stone-700 line-clamp-2 max-w-[280px]">
              {text || 'N/A'}
            </div>
            {l.entityName && (
              <div className="text-xs text-stone-400">{l.entityName}</div>
            )}
          </div>
        );
      },
    },
  ];

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-bold text-stone-900">Audit Logs</h2>
        <p className="text-sm text-stone-500">
          {logs.length} recorded actions · newest first
        </p>
      </div>

      <div className="bg-white rounded-xl border border-stone-100 shadow-sm p-4 flex flex-wrap items-end gap-3">
        <div>
          <label className="block text-xs font-medium text-stone-500 mb-1">
            Date From
          </label>
          <input
            type="date"
            value={filters.dateFrom}
            onChange={(e) => handleChange('dateFrom', e.target.value)}
            className="py-2 px-3 text-sm border border-stone-200 rounded-lg focus:ring-2 focus:ring-clay-500 bg-white"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-stone-500 mb-1">
            Date To
          </label>
          <input
            type="date"
            value={filters.dateTo}
            onChange={(e) => handleChange('dateTo', e.target.value)}
            className="py-2 px-3 text-sm border border-stone-200 rounded-lg focus:ring-2 focus:ring-clay-500 bg-white"
          />
        </div>
        <div className="flex-1 min-w-full lg:min-w-0">
          <FilterBar
            filters={filterConfigs}
            values={filters}
            onChange={handleChange}
            searchValue={search}
            onSearchChange={setSearch}
            searchPlaceholder="Search by admin, action or details..."
          />
        </div>
      </div>

      {error ? (
        <div className="bg-white rounded-xl border border-red-200 p-10 text-center">
          <p className="text-red-600 font-medium">{error}</p>
          <button
            onClick={loadData}
            className="mt-4 px-4 py-2 text-sm font-medium text-white bg-clay-600 rounded-lg hover:bg-clay-700 transition-colors"
          >
            Retry
          </button>
        </div>
      ) : (
        <DataTable
          columns={columns}
          data={filtered}
          loading={loading}
          emptyMessage="No audit logs found"
          pageSize={15}
        />
      )}
    </div>
  );
}