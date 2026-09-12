import { useEffect, useState, useMemo, useCallback } from 'react';
import toast from 'react-hot-toast';
import {
  Download,
  FileSpreadsheet,
  Eye,
  Wallet,
  CheckCircle2,
  Clock,
  XCircle,
} from 'lucide-react';
import * as XLSX from 'xlsx';
import Papa from 'papaparse';
import { collection, query, where, orderBy } from 'firebase/firestore';

import { db } from '../../firebase/config';
import DataTable from '../../components/admin/DataTable';
import Modal from '../../components/admin/Modal';
import FilterBar from '../../components/admin/FilterBar';
import StatusBadge from '../../components/admin/StatusBadge';
import StatCard from '../../components/admin/StatCard';
import { useRealtimeQuery } from '../../hooks/useRealtime';
import { isPaymentPaid } from '../../utils/status';

function fmtDate(value) {
  if (!value) return 'N/A';
  if (typeof value === 'object' && typeof value.toDate === 'function')
    return value.toDate().toLocaleDateString();
  const d = new Date(value);
  return isNaN(d.getTime()) ? String(value) : d.toLocaleDateString();
}

function fmtDateTime(value) {
  if (!value) return 'N/A';
  if (typeof value === 'object' && typeof value.toDate === 'function')
    return value.toDate().toLocaleString();
  const d = new Date(value);
  return isNaN(d.getTime()) ? String(value) : d.toLocaleString();
}

function fmtMoney(n) {
  return 'KSh ' + Number(n || 0).toLocaleString();
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

function downloadBlob(content, filename, mime) {
  const blob = content instanceof Blob ? content : new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function toExportRows(rows) {
  return rows.map((p) => ({
    Student: p.studentName || '',
    'Booking Ref': p.bookingReference || p.bookingId || '',
    Room: p.roomName || p.roomNumber || '',
    Bed: p.bedName || (p.bedNumber ? `Bed ${p.bedNumber}` : ''),
    Accommodation: p.accommodationType || '',
    Amount: p.amount || 0,
    Phone: p.phone || p.studentPhone || '',
    Receipt: p.receiptNumber || p.mpesaReceipt || p.reference || '',
    Status: p.status || '',
    Date: fmtDate(p.createdAt),
  }));
}

export default function PaymentsPage() {
  const [semesterId, setSemesterId] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const semesterRows = useRealtimeQuery(
    () => query(collection(db, 'semesters'), orderBy('startDate', 'desc')),
    []
  );
  const paymentRows = useRealtimeQuery(
    () =>
      semesterId
        ? query(
            collection(db, 'payments'),
            where('semesterId', '==', semesterId),
            orderBy('createdAt', 'desc')
          )
        : null,
    [semesterId]
  );

  useEffect(() => {
    if (!semesterId && semesterRows.data.length) {
      const active =
        semesterRows.data.find((s) => s.isActive && !s.isClosed) ||
        semesterRows.data[0];
      setSemesterId(active ? active.id : '');
    }
  }, [semesterId, semesterRows.data]);

  const semesters = semesterRows.data;
  const payments = paymentRows.data;
  const loadData = useCallback(() => {}, []);

  useEffect(() => {
    setLoading(semesterRows.loading || (semesterId ? paymentRows.loading : false));
  }, [semesterRows.loading, paymentRows.loading, semesterId]);

  useEffect(() => {
    setError(semesterRows.error || paymentRows.error);
  }, [semesterRows.error, paymentRows.error]);

  const [search, setSearch] = useState('');
  const [filters, setFilters] = useState({ status: '', dateFrom: '', dateTo: '' });
  const [detail, setDetail] = useState(null);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return payments.filter((p) => {
      const receipt = `${p.receiptNumber || ''} ${p.mpesaReceipt || ''} ${p.reference || ''}`.toLowerCase();
      const matchesSearch =
        !q ||
        (p.studentName || '').toLowerCase().includes(q) ||
        receipt.includes(q);
      const matchesStatus = !filters.status || p.status === filters.status;
      let matchesRange = true;
      if (filters.dateFrom || filters.dateTo) {
        const d = dateValue(p.createdAt);
        if (d) {
          if (filters.dateFrom && d < filters.dateFrom) matchesRange = false;
          if (filters.dateTo && d > filters.dateTo) matchesRange = false;
        }
      }
      return matchesSearch && matchesStatus && matchesRange;
    });
  }, [payments, search, filters]);

  function handleChange(key, value) {
    setFilters((f) => ({ ...f, [key]: value }));
  }

  const summary = useMemo(() => {
    const isPaid = (p) => isPaymentPaid(p.status);
    const statusKey = (p) => String(p.status || '').toUpperCase();

    const revenue = payments
      .filter(isPaid)
      .reduce((sum, p) => sum + Number(p.amount || 0), 0);
    const paid = revenue;
    const paidCount = payments.filter(isPaid).length;
    const pending = payments.filter((p) => statusKey(p) === 'PENDING');
    const pendingCount = pending.length;
    const pendingAmount = pending.reduce((s, p) => s + Number(p.amount || 0), 0);
    const failed = payments.filter(
      (p) => statusKey(p) === 'FAILED' || statusKey(p) === 'REJECTED'
    );
    const failedCount = failed.length;
    const failedAmount = failed.reduce((s, p) => s + Number(p.amount || 0), 0);
    return { revenue, paid, paidCount, pendingCount, pendingAmount, failedCount, failedAmount };
  }, [payments]);

  function exportCSV() {
    if (filtered.length === 0) {
      toast.error('Nothing to export');
      return;
    }
    const csv = Papa.unparse(toExportRows(filtered));
    downloadBlob(csv, `payments-${new Date().toISOString().split('T')[0]}.csv`, 'text/csv;charset=utf-8;');
    toast.success('CSV exported');
  }

  function exportExcel() {
    if (filtered.length === 0) {
      toast.error('Nothing to export');
      return;
    }
    const ws = XLSX.utils.json_to_sheet(toExportRows(filtered));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Payments');
    XLSX.writeFile(wb, `payments-${new Date().toISOString().split('T')[0]}.xlsx`);
    toast.success('Excel file exported');
  }

  const columns = [
    {
      key: 'studentName',
      label: 'Student',
      render: (p) => (
        <div>
          <div className="font-medium text-stone-900">{p.studentName || 'N/A'}</div>
          <div className="text-xs text-stone-400">{p.studentPhone || ''}</div>
        </div>
      ),
    },
    {
      key: 'bookingRef',
      label: 'Booking Ref',
      render: (p) => (
        <span className="font-medium text-clay-600">
          {p.bookingReference || p.bookingRef || 'N/A'}
        </span>
      ),
    },
    { key: 'room', label: 'Room', render: (p) => p.roomName || p.roomNumber || 'N/A' },
    { key: 'bed', label: 'Bed', render: (p) => p.bedName || (p.bedNumber ? `Bed ${p.bedNumber}` : 'N/A') },
    {
      key: 'accommodationType',
      label: 'Accommodation',
      render: (p) => p.accommodationType || 'N/A',
    },
    {
      key: 'amount',
      label: 'Amount',
      sortable: true,
      render: (p) => <span className="font-medium text-stone-900">{fmtMoney(p.amount)}</span>,
    },
    {
      key: 'phone',
      label: 'Phone',
      render: (p) => p.phone || p.studentPhone || 'N/A',
    },
    {
      key: 'receipt',
      label: 'M-Pesa Receipt',
      render: (p) => (
        <span className="text-stone-700">
          {p.receiptNumber || p.mpesaReceipt || p.reference || 'N/A'}
        </span>
      ),
    },
    {
      key: 'createdAt',
      label: 'Date',
      sortable: true,
      render: (p) => <span className="text-stone-500">{fmtDate(p.createdAt)}</span>,
    },
    {
      key: 'status',
      label: 'Status',
      sortable: true,
      render: (p) => <StatusBadge status={p.status} type="payment" />,
    },
    {
      key: 'actions',
      label: 'Actions',
      sortable: false,
      render: (p) => (
        <button
          onClick={(e) => {
            e.stopPropagation();
            setDetail(p);
          }}
          className="p-1.5 rounded-lg text-stone-500 hover:text-clay-600 hover:bg-clay-50 transition-colors"
          title="View details"
        >
          <Eye className="w-4 h-4" />
        </button>
      ),
    },
  ];

  const filterConfigs = [
    {
      key: 'status',
      label: 'Status',
      options: [
        { value: 'completed', label: 'Completed' },
        { value: 'pending', label: 'Pending' },
        { value: 'failed', label: 'Failed' },
        { value: 'verified', label: 'Verified' },
        { value: 'refunded', label: 'Refunded' },
      ],
    },
  ];

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-stone-900">Payments</h2>
          <p className="text-sm text-stone-500">{payments.length} payments</p>
        </div>
        <div className="flex items-center gap-3">
          <label className="flex items-center gap-2 text-sm text-stone-600">
            <span className="font-medium whitespace-nowrap">Semester:</span>
            <select
              value={semesterId}
              onChange={(e) => setSemesterId(e.target.value)}
              className="py-2 pl-3 pr-8 text-sm border border-stone-200 rounded-lg focus:ring-2 focus:ring-clay-500 bg-white"
            >
              {semesters.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </label>
          <button
            onClick={exportCSV}
            className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium text-stone-700 bg-white border border-stone-300 rounded-lg hover:bg-stone-50 transition-colors"
          >
            <Download className="w-4 h-4" />
            CSV
          </button>
          <button
            onClick={exportExcel}
            className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium text-green-700 bg-green-50 border border-green-200 rounded-lg hover:bg-green-100 transition-colors"
          >
            <FileSpreadsheet className="w-4 h-4" />
            Excel
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Revenue"
          value={fmtMoney(summary.revenue)}
          icon={Wallet}
          color="green"
          subtitle={`${summary.paidCount} completed payments`}
        />
        <StatCard
          title="Paid"
          value={fmtMoney(summary.paid)}
          icon={CheckCircle2}
          color="blue"
          subtitle={`${summary.paidCount} payments`}
        />
        <StatCard
          title="Pending"
          value={summary.pendingCount}
          icon={Clock}
          color="yellow"
          subtitle={fmtMoney(summary.pendingAmount)}
        />
        <StatCard
          title="Failed"
          value={summary.failedCount}
          icon={XCircle}
          color="red"
          subtitle={fmtMoney(summary.failedAmount)}
        />
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
        <FilterBar
          filters={filterConfigs}
          values={filters}
          onChange={handleChange}
          searchValue={search}
          onSearchChange={setSearch}
          searchPlaceholder="Search by receipt or student..."
        />
      </div>

      {error ? (
        <div className="bg-white rounded-xl border border-red-200 p-10 text-center">
          <p className="text-red-600 font-medium">{error}</p>
          <button
            onClick={() => loadData(semesterId)}
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
          emptyMessage="No payments found"
          onRowClick={(p) => setDetail(p)}
          pageSize={10}
        />
      )}

      <Modal
        isOpen={!!detail}
        onClose={() => setDetail(null)}
        title="Payment Details"
        size="lg"
        footer={
          <div className="flex justify-end">
            <button
              onClick={() => setDetail(null)}
              className="px-4 py-2 text-sm font-medium text-stone-700 bg-white border border-stone-300 rounded-lg hover:bg-stone-50 transition-colors"
            >
              Close
            </button>
          </div>
        }
      >
        {detail && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {[
                ['Student', detail.studentName],
                ['Phone', detail.phone || detail.studentPhone],
                ['Booking Ref', detail.bookingReference || detail.bookingId],
                ['Room', detail.roomName || detail.roomNumber],
                ['Bed', detail.bedName || (detail.bedNumber ? `Bed ${detail.bedNumber}` : '')],
                ['Accommodation', detail.accommodationType],
                ['Amount', fmtMoney(detail.amount)],
                ['M-Pesa Receipt', detail.receiptNumber || detail.mpesaReceipt || detail.reference],
                ['Method', detail.paymentMethod],
                ['Status', detail.status],
                ['Date', fmtDateTime(detail.createdAt)],
                ['Payment ID', detail.id],
              ].map(([k, v]) => (
                <div key={k} className="bg-stone-50 rounded-lg p-3">
                  <div className="text-xs text-stone-500">{k}</div>
                  {k === 'Status' ? (
                    <StatusBadge status={v} type="payment" />
                  ) : (
                    <div className="text-sm font-medium text-stone-900 break-all">
                      {v || 'N/A'}
                    </div>
                  )}
                </div>
              ))}
            </div>
            {detail.transactionId && (
              <div className="bg-stone-50 rounded-lg p-3 text-sm">
                <span className="text-stone-500">Transaction ID: </span>
                <span className="font-medium text-stone-900">
                  {detail.transactionId}
                </span>
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}