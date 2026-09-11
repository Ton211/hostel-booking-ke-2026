import { useEffect, useState, useMemo, useCallback } from 'react';
import toast from 'react-hot-toast';
import { Eye, XCircle, ArrowLeftRight } from 'lucide-react';

import DataTable from '../../components/admin/DataTable';
import Modal from '../../components/admin/Modal';
import ConfirmDialog from '../../components/admin/ConfirmDialog';
import FilterBar from '../../components/admin/FilterBar';
import StatusBadge from '../../components/admin/StatusBadge';
import { getAllSemesters } from '../../services/semesterService';
import {
  getBookingsBySemester,
  cancelBooking,
  transferBed,
} from '../../services/bookingService';
import { getRoomsWithAvailability } from '../../services/roomService';
import { getAvailableBeds } from '../../services/bedService';
import { getAllTypes } from '../../services/accommodationService';

function fmtDate(value) {
  if (!value) return '—';
  if (typeof value === 'object' && typeof value.toDate === 'function')
    return value.toDate().toLocaleDateString();
  const d = new Date(value);
  return isNaN(d.getTime()) ? String(value) : d.toLocaleDateString();
}

function fmtDateTime(value) {
  if (!value) return '—';
  if (typeof value === 'object' && typeof value.toDate === 'function')
    return value.toDate().toLocaleString();
  const d = new Date(value);
  return isNaN(d.getTime()) ? String(value) : d.toLocaleString();
}

function fmtMoney(n) {
  return 'KSh ' + Number(n || 0).toLocaleString();
}

function getPaymentStatus(booking) {
  if (booking.paymentStatus) return booking.paymentStatus;
  if (booking.paymentId) return 'verified';
  if (['cancelled', 'completed', 'rejected'].includes(booking.status))
    return 'unverified';
  return 'pending';
}

export default function BookingsPage() {
  const [semesters, setSemesters] = useState([]);
  const [semesterId, setSemesterId] = useState('');
  const [types, setTypes] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [search, setSearch] = useState('');
  const [filters, setFilters] = useState({
    gender: '',
    accommodation: '',
    status: '',
    paymentStatus: '',
  });

  const [detail, setDetail] = useState(null);
  const [cancelTarget, setCancelTarget] = useState(null);

  const [transferTarget, setTransferTarget] = useState(null);
  const [rooms, setRooms] = useState([]);
  const [transferRoom, setTransferRoom] = useState('');
  const [transferBeds, setTransferBeds] = useState([]);
  const [transferBedId, setTransferBedId] = useState('');
  const [transferBusy, setTransferBusy] = useState(false);

  const loadData = useCallback(async (sid) => {
    if (!sid) return;
    setLoading(true);
    setError(null);
    try {
      const [bookingList, accommodationTypes] = await Promise.all([
        getBookingsBySemester(sid),
        getAllTypes(),
      ]);
      setBookings(bookingList);
      setTypes(accommodationTypes);
    } catch (err) {
      console.error('Failed to load bookings:', err);
      setError('Failed to load bookings. Please try again.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const list = await getAllSemesters();
        if (cancelled) return;
        setSemesters(list);
        const active = list.find((s) => s.isActive && !s.isClosed) || list[0];
        setSemesterId(active ? active.id : '');
      } catch (err) {
        console.error('Failed to load semesters:', err);
        if (!cancelled) {
          setError('Failed to load bookings. Please try again.');
          setLoading(false);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (semesterId) loadData(semesterId);
  }, [semesterId, loadData]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return bookings.filter((b) => {
      const roomText = `${b.roomName || ''} ${b.roomNumber || ''}`.toLowerCase();
      const matchesSearch =
        !q ||
        (b.reference || '').toLowerCase().includes(q) ||
        (b.studentName || '').toLowerCase().includes(q) ||
        roomText.includes(q);
      const matchesGender =
        !filters.gender || (b.studentGender || b.gender) === filters.gender;
      const matchesAccom =
        !filters.accommodation ||
        (b.accommodationType || b.accommodationTypeId) === filters.accommodation;
      const matchesStatus = !filters.status || b.status === filters.status;
      const matchesPayment =
        !filters.paymentStatus ||
        getPaymentStatus(b) === filters.paymentStatus;
      return (
        matchesSearch &&
        matchesGender &&
        matchesAccom &&
        matchesStatus &&
        matchesPayment
      );
    });
  }, [bookings, search, filters]);

  function handleChange(key, value) {
    setFilters((f) => ({ ...f, [key]: value }));
  }

  async function handleCancel() {
    if (!cancelTarget) return;
    try {
      await cancelBooking(cancelTarget.id);
      toast.success(`Booking ${cancelTarget.reference} cancelled`);
      setCancelTarget(null);
      loadData(semesterId);
    } catch (err) {
      console.error(err);
      toast.error('Failed to cancel booking');
    }
  }

  async function openTransfer(booking) {
    setTransferTarget(booking);
    setTransferRoom('');
    setTransferBedId('');
    setTransferBeds([]);
    try {
      const list = await getRoomsWithAvailability();
      setRooms(list.filter((r) => r.availableBeds > 0));
    } catch (err) {
      console.error(err);
      toast.error('Failed to load available rooms');
    }
  }

  async function handleRoomChange(e) {
    const rid = e.target.value;
    setTransferRoom(rid);
    setTransferBedId('');
    if (!rid) {
      setTransferBeds([]);
      return;
    }
    try {
      setTransferBeds(await getAvailableBeds(rid));
    } catch (err) {
      console.error(err);
      toast.error('Failed to load available beds');
    }
  }

  async function handleTransfer() {
    if (!transferTarget || !transferBedId) {
      toast.error('Please select a new bed');
      return;
    }
    setTransferBusy(true);
    try {
      await transferBed(transferTarget.id, transferBedId);
      toast.success(
        `Booking ${transferTarget.reference} transferred to new bed`
      );
      setTransferTarget(null);
      loadData(semesterId);
    } catch (err) {
      console.error(err);
      toast.error('Failed to transfer booking');
    } finally {
      setTransferBusy(false);
    }
  }

  const columns = [
    {
      key: 'reference',
      label: 'Ref',
      render: (b) => (
        <span className="font-semibold text-indigo-600">{b.reference || '—'}</span>
      ),
    },
    {
      key: 'studentName',
      label: 'Student',
      render: (b) => (
        <div>
          <div className="font-medium text-gray-900">{b.studentName || '—'}</div>
          <div className="text-xs text-gray-400">{b.studentRegNo || b.studentId || ''}</div>
        </div>
      ),
    },
    {
      key: 'gender',
      label: 'Gender',
      render: (b) => (
        <span
          className={`font-medium ${
            (b.studentGender || b.gender) === 'male'
              ? 'text-blue-600'
              : (b.studentGender || b.gender) === 'female'
              ? 'text-pink-600'
              : 'text-gray-500'
          }`}
        >
          {(b.studentGender || b.gender || '—').toUpperCase()}
        </span>
      ),
    },
    {
      key: 'room',
      label: 'Room',
      render: (b) => b.roomName || b.roomNumber || b.hostelId || '—',
    },
    {
      key: 'bed',
      label: 'Bed',
      render: (b) => b.bedName || (b.bedNumber ? `Bed ${b.bedNumber}` : '—'),
    },
    { key: 'accommodationType', label: 'Accommodation', render: (b) => b.accommodationType || '—' },
    {
      key: 'amount',
      label: 'Amount',
      sortable: true,
      render: (b) => <span className="font-medium">{fmtMoney(b.amount)}</span>,
    },
    {
      key: 'status',
      label: 'Status',
      sortable: true,
      render: (b) => <StatusBadge status={b.status} type="booking" />,
    },
    {
      key: 'payment',
      label: 'Payment',
      render: (b) => <StatusBadge status={getPaymentStatus(b)} type="payment" />,
    },
    {
      key: 'createdAt',
      label: 'Date',
      sortable: true,
      render: (b) => <span className="text-gray-500">{fmtDate(b.createdAt)}</span>,
    },
    {
      key: 'actions',
      label: 'Actions',
      sortable: false,
      render: (b) => {
        const cancellable = !['cancelled', 'completed', 'expired', 'rejected'].includes(b.status);
        return (
          <div className="flex items-center gap-1.5">
            <button
              onClick={(e) => {
                e.stopPropagation();
                setDetail(b);
              }}
              className="p-1.5 rounded-lg text-gray-500 hover:text-indigo-600 hover:bg-indigo-50 transition-colors"
              title="View details"
            >
              <Eye className="w-4 h-4" />
            </button>
            {cancellable && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setCancelTarget(b);
                }}
                className="p-1.5 rounded-lg text-gray-500 hover:text-red-600 hover:bg-red-50 transition-colors"
                title="Cancel booking"
              >
                <XCircle className="w-4 h-4" />
              </button>
            )}
            {['confirmed', 'active'].includes(b.status) && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  openTransfer(b);
                }}
                className="p-1.5 rounded-lg text-gray-500 hover:text-purple-600 hover:bg-purple-50 transition-colors"
                title="Transfer bed"
              >
                <ArrowLeftRight className="w-4 h-4" />
              </button>
            )}
          </div>
        );
      },
    },
  ];

  const filterConfigs = [
    {
      key: 'gender',
      label: 'Gender',
      options: [
        { value: 'male', label: 'Male' },
        { value: 'female', label: 'Female' },
      ],
    },
    {
      key: 'accommodation',
      label: 'Accommodation',
      options: types.map((t) => ({ value: t.name, label: t.name })),
    },
    {
      key: 'status',
      label: 'Booking Status',
      options: [
        { value: 'pending', label: 'Pending' },
        { value: 'confirmed', label: 'Confirmed' },
        { value: 'active', label: 'Active' },
        { value: 'cancelled', label: 'Cancelled' },
        { value: 'completed', label: 'Completed' },
        { value: 'expired', label: 'Expired' },
      ],
    },
    {
      key: 'paymentStatus',
      label: 'Payment Status',
      options: [
        { value: 'pending', label: 'Pending' },
        { value: 'verified', label: 'Paid / Verified' },
        { value: 'unverified', label: 'Unverified' },
        { value: 'failed', label: 'Failed' },
      ],
    },
  ];

  const inputCls =
    'w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 bg-white';
  const labelCls = 'block text-sm font-medium text-gray-700 mb-1.5';

  const infoItems = (b) => [
    ['Reference', b.reference],
    ['Student', b.studentName],
    ['Phone', b.studentPhone],
    ['Registration', b.studentRegNo],
    ['Gender', (b.studentGender || b.gender || '').toUpperCase()],
    ['Hostel', b.hostelName || b.hostelId],
    ['Room', b.roomName || b.roomNumber],
    ['Bed', b.bedName || (b.bedNumber ? `Bed ${b.bedNumber}` : '')],
    ['Accommodation', b.accommodationType],
    ['Amount', fmtMoney(b.amount)],
    ['Status', ''],
    ['Payment', ''],
    ['Created', fmtDateTime(b.createdAt)],
    ['Booking Start', fmtDate(b.bookingStartDate || b.startDate)],
    ['Booking End', fmtDate(b.bookingEndDate || b.endDate)],
  ];

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Bookings</h2>
          <p className="text-sm text-gray-500">{bookings.length} bookings</p>
        </div>
        <label className="flex items-center gap-2 text-sm text-gray-600">
          <span className="font-medium whitespace-nowrap">Semester:</span>
          <select
            value={semesterId}
            onChange={(e) => setSemesterId(e.target.value)}
            className="py-2 pl-3 pr-8 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 bg-white"
          >
            {semesters.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </label>
      </div>

      <FilterBar
        filters={filterConfigs}
        values={filters}
        onChange={handleChange}
        searchValue={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search by reference, student or room..."
      />

      {error ? (
        <div className="bg-white rounded-xl border border-red-200 p-10 text-center">
          <p className="text-red-600 font-medium">{error}</p>
          <button
            onClick={() => loadData(semesterId)}
            className="mt-4 px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 transition-colors"
          >
            Retry
          </button>
        </div>
      ) : (
        <DataTable
          columns={columns}
          data={filtered}
          loading={loading}
          emptyMessage="No bookings found"
          onRowClick={(b) => setDetail(b)}
          pageSize={10}
        />
      )}

      <Modal
        isOpen={!!detail}
        onClose={() => setDetail(null)}
        title={`Booking ${detail?.reference || ''}`}
        size="lg"
        footer={
          <div className="flex justify-end gap-3">
            {detail &&
              ['confirmed', 'active'].includes(detail.status) && (
                <button
                  onClick={() => {
                    const b = detail;
                    setDetail(null);
                    openTransfer(b);
                  }}
                  className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-purple-700 bg-purple-50 border border-purple-200 rounded-lg hover:bg-purple-100 transition-colors"
                >
                  <ArrowLeftRight className="w-4 h-4" />
                  Transfer Bed
                </button>
              )}
            <button
              onClick={() => setDetail(null)}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Close
            </button>
          </div>
        }
      >
        {detail && (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {infoItems(detail).map(([k, v]) => (
              <div key={k} className="bg-gray-50 rounded-lg p-3">
                <div className="text-xs text-gray-500">{k}</div>
                {k === 'Status' ? (
                  <StatusBadge status={v || detail.status} type="booking" />
                ) : k === 'Payment' ? (
                  <StatusBadge
                    status={getPaymentStatus(detail)}
                    type="payment"
                  />
                ) : (
                  <div className="text-sm font-medium text-gray-900">
                    {v || '—'}
                  </div>
                )}
              </div>
            ))}
            {detail.schoolBased !== undefined && (
              <div className="bg-gray-50 rounded-lg p-3">
                <div className="text-xs text-gray-500">School Based</div>
                <div className="text-sm font-medium text-gray-900">
                  {detail.schoolBased ? 'Yes' : 'No'}
                </div>
              </div>
            )}
          </div>
        )}
      </Modal>

      <ConfirmDialog
        isOpen={!!cancelTarget}
        onClose={() => setCancelTarget(null)}
        onConfirm={handleCancel}
        title="Cancel booking?"
        message={`Booking "${cancelTarget?.reference}" for ${
          cancelTarget?.studentName || 'this student'
        } will be cancelled and the bed released. This action cannot be undone. Continue?`}
        confirmText="Cancel Booking"
        variant="danger"
      />

      <Modal
        isOpen={!!transferTarget}
        onClose={() => setTransferTarget(null)}
        title={`Transfer Booking ${transferTarget?.reference || ''}`}
        size="md"
        footer={
          <div className="flex justify-end gap-3">
            <button
              onClick={() => setTransferTarget(null)}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleTransfer}
              disabled={transferBusy || !transferBedId}
              className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {transferBusy ? 'Transferring...' : 'Confirm Transfer'}
            </button>
          </div>
        }
      >
        <div className="space-y-4">
          <div className="bg-gray-50 rounded-lg p-4 text-sm">
            <div className="text-xs text-gray-500 mb-1">From</div>
            <div className="font-semibold text-gray-900">
              {transferTarget?.roomName || transferTarget?.roomNumber || '—'} ·{' '}
              {transferTarget?.bedName ||
                (transferTarget?.bedNumber
                  ? `Bed ${transferTarget.bedNumber}`
                  : '—')}
            </div>
          </div>
          <div>
            <label className={labelCls}>New Room</label>
            <select value={transferRoom} onChange={handleRoomChange} className={inputCls}>
              <option value="">Select room with available beds</option>
              {rooms.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name || r.roomNumber} — {r.availableBeds} available
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className={labelCls}>New Bed</label>
            <select
              value={transferBedId}
              onChange={(e) => setTransferBedId(e.target.value)}
              disabled={!transferRoom}
              className={inputCls}
            >
              <option value="">
                {transferRoom ? 'Select bed' : 'Select a room first'}
              </option>
              {transferBeds.map((b) => (
                <option key={b.id} value={b.id}>
                  Bed {b.bedNumber} ({b.position || 'UP'})
                </option>
              ))}
            </select>
          </div>
        </div>
      </Modal>
    </div>
  );
}