import { useEffect, useState, useMemo, useCallback } from 'react';
import toast from 'react-hot-toast';
import { Eye, ArrowLeftRight } from 'lucide-react';
import { collection, getDocs, query, orderBy } from 'firebase/firestore';

import { db } from '../../firebase/config';
import DataTable from '../../components/admin/DataTable';
import Modal from '../../components/admin/Modal';
import FilterBar from '../../components/admin/FilterBar';
import StatusBadge from '../../components/admin/StatusBadge';
import { getAllSemesters } from '../../services/semesterService';
import { getStudent } from '../../services/studentService';
import { getBookingsByStudent, transferBed } from '../../services/bookingService';
import { getPaymentsByBooking } from '../../services/paymentService';
import { getRoomsWithAvailability } from '../../services/roomService';
import { getAvailableBeds } from '../../services/bedService';

function fmtDate(value) {
  if (!value) return '—';
  if (typeof value === 'object' && typeof value.toDate === 'function')
    return value.toDate().toLocaleDateString();
  const d = new Date(value);
  return isNaN(d.getTime()) ? String(value) : d.toLocaleDateString();
}

function fmtMoney(n) {
  return 'KSh ' + Number(n || 0).toLocaleString();
}

async function fetchStudents(semesterId) {
  const [studentsSnap, bookingsSnap] = await Promise.all([
    getDocs(query(collection(db, 'students'), orderBy('fullName', 'asc'))),
    getDocs(collection(db, 'bookings')),
  ]);

  const bookings = bookingsSnap.docs
    .map((d) => ({ id: d.id, ...d.data() }))
    .filter((b) => b.semesterId === semesterId);

  const byStudent = {};
  bookings.forEach((b) => {
    (byStudent[b.studentId] = byStudent[b.studentId] || []).push(b);
  });

  return studentsSnap.docs.map((d) => {
    const s = { id: d.id, ...d.data() };
    const sb = byStudent[s.id] || [];
    const activeBookings = sb.filter((b) =>
      ['active', 'confirmed'].includes(b.status)
    );
    return {
      ...s,
      bookings: sb,
      activeBookings,
      bookingsCount: sb.length,
      hasActiveBooking: activeBookings.length > 0,
      latestBooking: activeBookings[0] || sb[0] || null,
    };
  });
}

export default function StudentsPage() {
  const [semesters, setSemesters] = useState([]);
  const [semesterId, setSemesterId] = useState('');
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [search, setSearch] = useState('');
  const [filters, setFilters] = useState({ gender: '', bookingStatus: '' });

  const [detail, setDetail] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const [transferTarget, setTransferTarget] = useState(null);
  const [rooms, setRooms] = useState([]);
  const [transferRoom, setTransferRoom] = useState('');
  const [transferBeds, setTransferBeds] = useState([]);
  const [transferBedId, setTransferBedId] = useState('');
  const [transferBusy, setTransferBusy] = useState(false);

  const loadStudents = useCallback(
    async (sid) => {
      if (!sid) return;
      setLoading(true);
      setError(null);
      try {
        const list = await fetchStudents(sid);
        setStudents(list);
      } catch (err) {
        console.error('Failed to load students:', err);
        setError('Failed to load students. Please try again.');
      } finally {
        setLoading(false);
      }
    },
    []
  );

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
          setError('Failed to load students. Please try again.');
          setLoading(false);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (semesterId) loadStudents(semesterId);
  }, [semesterId, loadStudents]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return students.filter((s) => {
      const matchesSearch =
        !q ||
        (s.fullName || '').toLowerCase().includes(q) ||
        (s.phone || '').includes(q) ||
        (s.registrationNumber || '').toLowerCase().includes(q);
      const matchesGender = !filters.gender || s.gender === filters.gender;
      let matchesBooking = true;
      if (filters.bookingStatus === 'active')
        matchesBooking = s.hasActiveBooking;
      else if (filters.bookingStatus === 'confirmed')
        matchesBooking = s.bookings.some((b) => b.status === 'confirmed');
      else if (filters.bookingStatus === 'pending')
        matchesBooking = s.bookings.some((b) => b.status === 'pending');
      else if (filters.bookingStatus === 'none')
        matchesBooking = s.bookingsCount === 0;
      return matchesSearch && matchesGender && matchesBooking;
    });
  }, [students, search, filters]);

  async function openDetail(student) {
    setDetailLoading(true);
    setDetail(student);
    try {
      const s = await getStudent(student.id);
      const bookings = await getBookingsByStudent(student.id);
      const payments = [];
      for (const booking of bookings) {
        const pay = await getPaymentsByBooking(booking.id);
        payments.push(...pay.map((p) => ({ ...p, booking })));
      }
      setDetail({ ...s, bookings, payments });
    } catch (err) {
      console.error('Failed to load student detail:', err);
      toast.error('Failed to load student details');
    } finally {
      setDetailLoading(false);
    }
  }

  async function openTransfer(student) {
    setTransferTarget(student);
    setTransferRoom('');
    setTransferBedId('');
    setTransferBeds([]);
    try {
      const list = await getRoomsWithAvailability();
      const available = list.filter((r) => r.availableBeds > 0);
      setRooms(available);
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
      const beds = await getAvailableBeds(rid);
      setTransferBeds(beds);
    } catch (err) {
      console.error(err);
      toast.error('Failed to load available beds');
    }
  }

  async function handleTransfer() {
    const booking = transferTarget?.activeBookings?.[0] || transferTarget?.latestBooking;
    if (!booking || !transferBedId) {
      toast.error('Please select a new bed');
      return;
    }
    setTransferBusy(true);
    try {
      await transferBed(booking.id, transferBedId);
      toast.success(`Student "${transferTarget.fullName}" transferred to new bed`);
      setTransferTarget(null);
      loadStudents(semesterId);
    } catch (err) {
      console.error(err);
      toast.error('Failed to transfer bed');
    } finally {
      setTransferBusy(false);
    }
  }

  const columns = [
    {
      key: 'fullName',
      label: 'Name',
      render: (s) => (
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center text-xs font-bold uppercase">
            {(s.fullName || '?').charAt(0)}
          </div>
          <div>
            <div className="font-medium text-gray-900">{s.fullName || '—'}</div>
            <div className="text-xs text-gray-400">
              {s.registrationNumber || s.email || ''}
            </div>
          </div>
        </div>
      ),
    },
    {
      key: 'gender',
      label: 'Gender',
      render: (s) => (
        <span
          className={`font-medium ${
            s.gender === 'male'
              ? 'text-blue-600'
              : s.gender === 'female'
              ? 'text-pink-600'
              : 'text-gray-500'
          }`}
        >
          {(s.gender || '—').toUpperCase()}
        </span>
      ),
    },
    { key: 'phone', label: 'Phone', render: (s) => s.phone || '—' },
    {
      key: 'nok',
      label: 'Next of Kin',
      render: (s) => {
        const nok =
          s.nextOfKin || (typeof s.nok === 'string' ? { name: s.nok } : s.nok);
        return (
          <div>
            <div className="text-gray-900">{nok?.name || '—'}</div>
            <div className="text-xs text-gray-400">{nok?.phone || ''}</div>
          </div>
        );
      },
    },
    {
      key: 'bookingsCount',
      label: 'Bookings',
      sortable: true,
      render: (s) => (
        <span className="inline-flex items-center gap-1">
          <span className="font-semibold text-gray-900">{s.bookingsCount}</span>
          {s.hasActiveBooking && (
            <StatusBadge status="active" type="booking" />
          )}
        </span>
      ),
    },
    {
      key: 'actions',
      label: 'Actions',
      sortable: false,
      render: (s) => (
        <div className="flex items-center gap-1.5">
          <button
            onClick={(e) => {
              e.stopPropagation();
              openDetail(s);
            }}
            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-indigo-600 bg-indigo-50 rounded-lg hover:bg-indigo-100 transition-colors"
          >
            <Eye className="w-3.5 h-3.5" />
            View
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              openTransfer(s);
            }}
            disabled={!s.hasActiveBooking}
            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-purple-600 bg-purple-50 rounded-lg hover:bg-purple-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            <ArrowLeftRight className="w-3.5 h-3.5" />
            Transfer Bed
          </button>
        </div>
      ),
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
      key: 'bookingStatus',
      label: 'Booking Status',
      options: [
        { value: 'active', label: 'Has Active' },
        { value: 'confirmed', label: 'Confirmed' },
        { value: 'pending', label: 'Pending' },
        { value: 'none', label: 'No Bookings' },
      ],
    },
  ];

  const inputCls =
    'w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500';
  const labelCls = 'block text-sm font-medium text-gray-700 mb-1.5';

  const bookingCols = [
    { key: 'reference', label: 'Ref', render: (b) => <span className="font-medium text-indigo-600">{b.reference || '—'}</span> },
    { key: 'roomName', label: 'Room', render: (b) => b.roomName || b.roomNumber || b.hostelId || '—' },
    { key: 'bed', label: 'Bed', render: (b) => b.bedName || (b.bedNumber ? `Bed ${b.bedNumber}` : '—') },
    { key: 'accommodationType', label: 'Accommodation', render: (b) => b.accommodationType || '—' },
    { key: 'amount', label: 'Amount', sortable: true, render: (b) => fmtMoney(b.amount) },
    { key: 'status', label: 'Status', render: (b) => <StatusBadge status={b.status} type="booking" /> },
    { key: 'createdAt', label: 'Date', render: (b) => fmtDate(b.createdAt) },
  ];

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Students</h2>
          <p className="text-sm text-gray-500">{students.length} students</p>
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
        onChange={(k, v) => setFilters((f) => ({ ...f, [k]: v }))}
        searchValue={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search by name, phone or reg no..."
      />

      {error ? (
        <div className="bg-white rounded-xl border border-red-200 p-10 text-center">
          <p className="text-red-600 font-medium">{error}</p>
          <button
            onClick={() => loadStudents(semesterId)}
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
          emptyMessage="No students found"
          onRowClick={openDetail}
          pageSize={10}
        />
      )}

      <Modal
        isOpen={!!detail}
        onClose={() => setDetail(null)}
        title="Student Details"
        size="lg"
        footer={
          <div className="flex justify-end gap-3">
            {detail?.hasActiveBooking && (
              <button
                onClick={() => {
                  const s = detail;
                  setDetail(null);
                  openTransfer(s);
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
        {detailLoading && !detail ? (
          <div className="py-10 text-center text-sm text-gray-400">Loading...</div>
        ) : detail ? (
          <div className="space-y-6">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center text-xl font-bold uppercase">
                {(detail.fullName || '?').charAt(0)}
              </div>
              <div>
                <div className="text-lg font-semibold text-gray-900">
                  {detail.fullName}
                </div>
                <div className="text-sm text-gray-500">
                  {detail.registrationNumber || ''} · {detail.gender || '—'}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {[
                ['Phone', detail.phone],
                ['Email', detail.email],
                ['Program', detail.program || detail.course],
                ['School', detail.school || detail.institution],
                ['Year of Study', detail.yearOfStudy],
                [
                  'Next of Kin',
                  detail.nextOfKin
                    ? `${detail.nextOfKin.name || ''}${detail.nextOfKin.phone ? ` (${detail.nextOfKin.phone})` : ''}`
                    : '—',
                ],
              ].map(([k, v]) => (
                <div key={k} className="bg-gray-50 rounded-lg p-3">
                  <div className="text-xs text-gray-500">{k}</div>
                  <div className="text-sm font-medium text-gray-900">
                    {v || '—'}
                  </div>
                </div>
              ))}
            </div>

            {detail.latestBooking && (
              <div className="bg-blue-50 border border-blue-100 rounded-lg p-4">
                <div className="text-xs font-semibold text-blue-700 uppercase tracking-wide mb-2">
                  Current Booking
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
                  <div>
                    <div className="text-gray-500 text-xs">Reference</div>
                    <div className="font-medium text-gray-900">
                      {detail.latestBooking.reference || '—'}
                    </div>
                  </div>
                  <div>
                    <div className="text-gray-500 text-xs">Room</div>
                    <div className="font-medium text-gray-900">
                      {detail.latestBooking.roomName ||
                        detail.latestBooking.roomNumber ||
                        '—'}
                    </div>
                  </div>
                  <div>
                    <div className="text-gray-500 text-xs">Bed</div>
                    <div className="font-medium text-gray-900">
                      {detail.latestBooking.bedName ||
                        (detail.latestBooking.bedNumber
                          ? `Bed ${detail.latestBooking.bedNumber}`
                          : '—')}
                    </div>
                  </div>
                  <div>
                    <div className="text-gray-500 text-xs">Status</div>
                    <StatusBadge
                      status={detail.latestBooking.status}
                      type="booking"
                    />
                  </div>
                </div>
              </div>
            )}

            <div>
              <h4 className="text-sm font-semibold text-gray-700 mb-2">
                Booking History
              </h4>
              <DataTable
                columns={bookingCols}
                data={detail.bookings || []}
                pagination={false}
                emptyMessage="No bookings"
              />
            </div>

            <div>
              <h4 className="text-sm font-semibold text-gray-700 mb-2">
                Payment History
              </h4>
              <DataTable
                columns={[
                  {
                    key: 'receipt',
                    label: 'Receipt',
                    render: (p) => (
                      <span className="font-medium text-gray-900">
                        {p.receiptNumber || p.mpesaReceipt || p.reference || '—'}
                      </span>
                    ),
                  },
                  {
                    key: 'amount',
                    label: 'Amount',
                    sortable: true,
                    render: (p) => fmtMoney(p.amount),
                  },
                  {
                    key: 'status',
                    label: 'Status',
                    render: (p) => (
                      <StatusBadge status={p.status} type="payment" />
                    ),
                  },
                  {
                    key: 'createdAt',
                    label: 'Date',
                    render: (p) => fmtDate(p.createdAt),
                  },
                ]}
                data={detail.payments || []}
                pagination={false}
                emptyMessage="No payments"
              />
            </div>
          </div>
        ) : null}
      </Modal>

      <Modal
        isOpen={!!transferTarget}
        onClose={() => setTransferTarget(null)}
        title={`Transfer Bed — ${transferTarget?.fullName || ''}`}
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
          {transferTarget?.latestBooking && (
            <div className="bg-gray-50 rounded-lg p-4 text-sm">
              <div className="text-xs text-gray-500 mb-1">From</div>
              <div className="font-semibold text-gray-900">
                {transferTarget.latestBooking.roomName ||
                  transferTarget.latestBooking.roomNumber ||
                  '—'}{' '}
                ·{' '}
                {transferTarget.latestBooking.bedName ||
                  (transferTarget.latestBooking.bedNumber
                    ? `Bed ${transferTarget.latestBooking.bedNumber}`
                    : '—')}{' '}
                <span className="text-gray-400">
                  ({transferTarget.latestBooking.reference})
                </span>
              </div>
            </div>
          )}
          <div>
            <label className={labelCls}>New Room</label>
            <select
              value={transferRoom}
              onChange={handleRoomChange}
              className={inputCls}
            >
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
                {transferRoom
                  ? 'Select bed'
                  : 'Select a room first'}
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