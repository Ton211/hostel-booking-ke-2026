import { useEffect, useState, useMemo, useCallback } from 'react';
import toast from 'react-hot-toast';
import { Download, FileSpreadsheet, FileText, FileDown } from 'lucide-react';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import Papa from 'papaparse';
import { collection, getDocs, query, orderBy } from 'firebase/firestore';

import { db } from '../../firebase/config';
import DataTable from '../../components/admin/DataTable';
import FilterBar from '../../components/admin/FilterBar';
import StatusBadge from '../../components/admin/StatusBadge';
import StatCard from '../../components/admin/StatCard';
import { getAllSemesters } from '../../services/semesterService';
import { getBookingsBySemester } from '../../services/bookingService';
import { getPayments } from '../../services/paymentService';
import { getAllHostels } from '../../services/hostelService';

const TABS = [
  { id: 'occupancy', label: 'Occupancy' },
  { id: 'students', label: 'Student Allocation' },
  { id: 'payments', label: 'Payments' },
  { id: 'revenue', label: 'Revenue' },
  { id: 'availableBeds', label: 'Available Beds' },
];

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

function download(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function exportCSV(filename, rows) {
  const csv = Papa.unparse(rows);
  download(new Blob([csv], { type: 'text/csv;charset=utf-8;' }), `${filename}.csv`);
}

function exportExcel(filename, rows) {
  const ws = XLSX.utils.json_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Report');
  XLSX.writeFile(wb, `${filename}.xlsx`);
}

function exportPDF(filename, head, body) {
  const doc = new jsPDF({ orientation: 'landscape' });
  autoTable(doc, { head, body, styles: { fontSize: 9 } });
  doc.save(`${filename}.pdf`);
}

async function fetchRoomsWithBeds() {
  const [roomsSnap, bedsSnap, hostels] = await Promise.all([
    getDocs(query(collection(db, 'rooms'), orderBy('name', 'asc'))),
    getDocs(collection(db, 'beds')),
    getAllHostels(),
  ]);
  const beds = bedsSnap.docs.map((d) => ({ id: d.id, ...d.data() }));
  const roomList = roomsSnap.docs
    .map((d) => ({ id: d.id, ...d.data() }))
    .filter((r) => r.isActive !== false);

  return roomList.map((room) => {
    const roomBeds = beds.filter((b) => b.roomId === room.id);
    const occupied = roomBeds.filter((b) => b.status === 'occupied').length;
    const available = roomBeds.filter((b) => b.status === 'available').length;
    const blocked = roomBeds.filter((b) => b.status === 'blocked').length;
    return {
      ...room,
      beds: roomBeds,
      totalBeds: roomBeds.length,
      occupied,
      available,
      blocked,
      hostelName: room.hostelName || hostels.find((h) => h.id === room.hostelId)?.name || room.hostelId,
    };
  });
}

export default function ReportsPage() {
  const [activeTab, setActiveTab] = useState('occupancy');

  const [semesters, setSemesters] = useState([]);
  const [semesterId, setSemesterId] = useState('');

  const [rooms, setRooms] = useState([]);
  const [roomsLoading, setRoomsLoading] = useState(false);

  const [bookings, setBookings] = useState([]);
  const [payments, setPayments] = useState([]);
  const [dataLoading, setDataLoading] = useState(false);
  const [dataError, setDataError] = useState(null);

  const loadSemesters = useCallback(async () => {
    try {
      const list = await getAllSemesters();
      setSemesters(list);
      const active = list.find((s) => s.isActive && !s.isClosed) || list[0];
      setSemesterId(active ? active.id : '');
    } catch (err) {
      console.error(err);
      toast.error('Failed to load semesters');
    }
  }, []);

  useEffect(() => {
    loadSemesters();
  }, [loadSemesters]);

  const loadReportData = useCallback(async (sid) => {
    if (!sid) return;
    setDataError(null);
    try {
      const [bookingList, paymentList] = await Promise.all([
        getBookingsBySemester(sid),
        getPayments({ semesterId: sid }),
      ]);
      setBookings(bookingList);
      setPayments(paymentList);
    } catch (err) {
      console.error('Failed to load report data:', err);
      setDataError('Failed to load report data. Please try again.');
    }
  }, []);

  useEffect(() => {
    if (semesterId) {
      setDataLoading(true);
      loadReportData(semesterId).finally(() => setDataLoading(false));
    }
  }, [semesterId, loadReportData]);

  const loadRooms = useCallback(async () => {
    setRoomsLoading(true);
    try {
      setRooms(await fetchRoomsWithBeds());
    } catch (err) {
      console.error(err);
      toast.error('Failed to load rooms');
    } finally {
      setRoomsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (activeTab === 'occupancy' || activeTab === 'availableBeds') {
      loadRooms();
    }
  }, [activeTab, loadRooms]);

  const [bedFilters, setBedFilters] = useState({ gender: '', hostel: '' });
  const [bedSearch, setBedSearch] = useState('');

  const availableBeds = useMemo(() => {
    const q = bedSearch.toLowerCase();
    const list = [];
    rooms.forEach((room) => {
      room.beds.forEach((bed) => {
        if (bed.status !== 'available') return;
        const matchesGender = !bedFilters.gender || room.gender === bedFilters.gender;
        const matchesHostel =
          !bedFilters.hostel || room.hostelId === bedFilters.hostel;
        const matchesSearch =
          !q ||
          String(bed.bedNumber).includes(q) ||
          (room.name || '').toLowerCase().includes(q);
        if (matchesGender && matchesHostel && matchesSearch) {
          list.push({
            id: bed.id,
            room: room.name || room.roomNumber || room.id,
            hostel: room.hostelName || room.hostelId,
            gender: room.gender || '—',
            bedNumber: bed.bedNumber,
            position: bed.position || (bed.bedNumber % 2 === 0 ? 'DOWN' : 'UP'),
          });
        }
      });
    });
    return list;
  }, [rooms, bedFilters, bedSearch]);

  const allocations = useMemo(() => {
    return bookings
      .filter((b) => ['confirmed', 'active'].includes(b.status))
      .map((b) => ({
        id: b.id,
        reference: b.reference,
        student: b.studentName || b.student?.name || '—',
        gender: b.studentGender || b.gender || '—',
        room: b.roomName || b.roomNumber || '—',
        bed: b.bedName || (b.bedNumber ? `Bed ${b.bedNumber}` : '—'),
        accommodation: b.accommodationType || '—',
        amount: Number(b.amount) || 0,
        status: b.status,
      }));
  }, [bookings]);

  const revenue = useMemo(() => {
    let schoolRevenue = 0;
    let regularRevenue = 0;
    bookings.forEach((b) => {
      if (['confirmed', 'active'].includes(b.status)) {
        const type = (b.accommodationType || '').toLowerCase();
        const isSchool = b.isSchoolBased === true || type.includes('school');
        if (isSchool) schoolRevenue += Number(b.amount) || 0;
        else regularRevenue += Number(b.amount) || 0;
      }
    });
    const totalRevenue = payments
      .filter((p) => p.status === 'completed')
      .reduce((sum, p) => sum + Number(p.amount || 0), 0);
    const methodBreakdown = payments
      .filter((p) => p.status === 'completed')
      .reduce((acc, p) => {
        const m = p.paymentMethod || 'unknown';
        acc[m] = (acc[m] || 0) + Number(p.amount || 0);
        return acc;
      }, {});
    return {
      totalRevenue,
      schoolRevenue,
      regularRevenue,
      methodBreakdown,
      completedCount: payments.filter((p) => p.status === 'completed').length,
    };
  }, [bookings, payments]);

  function getRows() {
    switch (activeTab) {
      case 'occupancy':
        return rooms.map((r) => ({
          Room: r.name || r.roomNumber || r.id,
          Hostel: r.hostelName || r.hostelId,
          Gender: (r.gender || '').toUpperCase(),
          Capacity: r.totalBeds,
          Occupied: r.occupied,
          Available: r.available,
          'Occupancy %': r.totalBeds
            ? Number(((r.occupied / r.totalBeds) * 100).toFixed(1))
            : 0,
        }));
      case 'students':
        return allocations.map((a) => ({
          Reference: a.reference,
          Student: a.student,
          Gender: String(a.gender).toUpperCase(),
          Room: a.room,
          Bed: a.bed,
          Accommodation: a.accommodation,
          Amount: a.amount,
          Status: a.status,
        }));
      case 'payments':
        return payments.map((p) => ({
          Student: p.studentName,
          Reference: p.bookingReference || p.bookingId,
          Room: p.roomName || p.roomNumber,
          Bed: p.bedName || (p.bedNumber ? `Bed ${p.bedNumber}` : ''),
          Accommodation: p.accommodationType,
          Amount: p.amount,
          Phone: p.phone || p.studentPhone,
          Receipt: p.receiptNumber || p.mpesaReceipt || p.reference,
          Status: p.status,
          Date: fmtDate(p.createdAt),
        }));
      case 'revenue':
        return [
          {
            'Revenue Type': 'School Based',
            Amount: revenue.schoolRevenue,
          },
          {
            'Revenue Type': 'Regular',
            Amount: revenue.regularRevenue,
          },
          {
            'Revenue Type': 'Total',
            Amount: revenue.totalRevenue,
          },
        ];
      case 'availableBeds':
        return availableBeds.map((b) => ({
          Room: b.room,
          Hostel: b.hostel,
          Gender: String(b.gender).toUpperCase(),
          'Bed Number': b.bedNumber,
          Position: b.position,
        }));
      default:
        return [];
    }
  }

  function getPDFHead() {
    switch (activeTab) {
      case 'occupancy':
        return [['Room', 'Hostel', 'Gender', 'Capacity', 'Occupied', 'Available', 'Occupancy %']];
      case 'students':
        return [['Ref', 'Student', 'Gender', 'Room', 'Bed', 'Accommodation', 'Amount', 'Status']];
      case 'payments':
        return [['Student', 'Ref', 'Room', 'Bed', 'Accommodation', 'Amount', 'Phone', 'Receipt', 'Status', 'Date']];
      case 'revenue':
        return [['Revenue Type', 'Amount']];
      case 'availableBeds':
        return [['Room', 'Hostel', 'Gender', 'Bed Number', 'Position']];
      default:
        return [[]];
    }
  }

  function getPDFBody() {
    switch (activeTab) {
      case 'occupancy':
        return rooms.map((r) => [
          r.name || r.roomNumber || r.id,
          r.hostelName || r.hostelId,
          (r.gender || '').toUpperCase(),
          r.totalBeds,
          r.occupied,
          r.available,
          r.totalBeds ? Number(((r.occupied / r.totalBeds) * 100).toFixed(1)) : 0,
        ]);
      case 'students':
        return allocations.map((a) => [
          a.reference,
          a.student,
          String(a.gender).toUpperCase(),
          a.room,
          a.bed,
          a.accommodation,
          a.amount,
          a.status,
        ]);
      case 'payments':
        return payments.map((p) => [
          p.studentName,
          p.bookingReference || p.bookingId,
          p.roomName || p.roomNumber,
          p.bedName || (p.bedNumber ? `Bed ${p.bedNumber}` : ''),
          p.accommodationType,
          p.amount,
          p.phone || p.studentPhone,
          p.receiptNumber || p.mpesaReceipt || p.reference,
          p.status,
          fmtDate(p.createdAt),
        ]);
      case 'revenue':
        return [
          ['School Based', revenue.schoolRevenue],
          ['Regular', revenue.regularRevenue],
          ['Total', revenue.totalRevenue],
        ];
      case 'availableBeds':
        return availableBeds.map((b) => [
          b.room,
          b.hostel,
          String(b.gender).toUpperCase(),
          b.bedNumber,
          b.position,
        ]);
      default:
        return [];
    }
  }

  function handleExport(kind) {
    const filename = `report-${activeTab}-${semesterId || 'all'}`;
    try {
      const rows = getRows();
      if (rows.length === 0) {
        toast.error('Nothing to export for the current filters');
        return;
      }
      if (kind === 'csv') {
        exportCSV(filename, rows);
        toast.success('CSV exported');
      } else if (kind === 'excel') {
        exportExcel(filename, rows);
        toast.success('Excel file exported');
      } else {
        exportPDF(filename, getPDFHead(), getPDFBody());
        toast.success('PDF exported');
      }
    } catch (err) {
      console.error('Export failed:', err);
      toast.error('Export failed');
    }
  }

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-bold text-gray-900">Reports</h2>
        <p className="text-sm text-gray-500">
          Exportable management reports with full history.
        </p>
      </div>

      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="flex flex-wrap gap-2 bg-white rounded-xl border border-gray-100 shadow-sm p-1.5">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                activeTab === tab.id
                  ? 'bg-indigo-600 text-white shadow'
                  : 'text-gray-600 hover:bg-gray-50'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="flex flex-wrap items-center gap-3">
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
          <button
            onClick={() => handleExport('csv')}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <FileDown className="w-4 h-4" />
            CSV
          </button>
          <button
            onClick={() => handleExport('excel')}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-green-700 bg-green-50 border border-green-200 rounded-lg hover:bg-green-100 transition-colors"
          >
            <FileSpreadsheet className="w-4 h-4" />
            Excel
          </button>
          <button
            onClick={() => handleExport('pdf')}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-red-700 bg-red-50 border border-red-200 rounded-lg hover:bg-red-100 transition-colors"
          >
            <FileText className="w-4 h-4" />
            PDF
          </button>
        </div>
      </div>

      {dataError && (
        <div className="bg-white rounded-xl border border-red-200 p-6 text-center">
          <p className="text-red-600 font-medium">{dataError}</p>
          <button
            onClick={() => loadReportData(semesterId)}
            className="mt-3 px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 transition-colors"
          >
            Retry
          </button>
        </div>
      )}

      {activeTab === 'revenue' && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            title="Total Revenue"
            value={fmtMoney(revenue.totalRevenue)}
            icon={Download}
            color="green"
            subtitle={`${revenue.completedCount} completed payments`}
          />
          <StatCard
            title="School Based"
            value={fmtMoney(revenue.schoolRevenue)}
            icon={Download}
            color="indigo"
          />
          <StatCard
            title="Regular"
            value={fmtMoney(revenue.regularRevenue)}
            icon={Download}
            color="blue"
          />
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
            <h3 className="text-sm font-medium text-gray-500 mb-3">By Method</h3>
            <div className="space-y-2">
              {Object.keys(revenue.methodBreakdown).length === 0 ? (
                <p className="text-xs text-gray-400">No completed payments</p>
              ) : (
                Object.entries(revenue.methodBreakdown).map(([method, amount]) => (
                  <div key={method} className="flex items-center justify-between text-sm">
                    <span className="text-gray-700 capitalize">{method}</span>
                    <span className="font-medium text-gray-900">{fmtMoney(amount)}</span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'availableBeds' && (
        <FilterBar
          filters={[
            {
              key: 'gender',
              label: 'Gender',
              options: [
                { value: 'male', label: 'Male' },
                { value: 'female', label: 'Female' },
              ],
            },
            {
              key: 'hostel',
              label: 'Hostel',
              options: rooms
                .map((r) => ({ id: r.hostelId, name: r.hostelName || r.hostelId }))
                .filter((h, i, arr) => arr.findIndex((x) => x.id === h.id) === i)
                .map((h) => ({ value: h.id, label: h.name })),
            },
          ]}
          values={bedFilters}
          onChange={(k, v) => setBedFilters((f) => ({ ...f, [k]: v }))}
          searchValue={bedSearch}
          onSearchChange={setBedSearch}
          searchPlaceholder="Search by bed number or room..."
        />
      )}

      {activeTab === 'occupancy' &&
        (roomsLoading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <div className="w-10 h-10 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" />
            <p className="text-sm text-gray-500">Loading occupancy...</p>
          </div>
        ) : (
          <div className="overflow-x-auto bg-white rounded-xl shadow-sm border border-gray-100">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  {['Room', 'Hostel', 'Gender', 'Capacity', 'Occupied', 'Available', 'Occupancy %'].map((h) => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {rooms.map((r) => (
                  <tr key={r.id} className="hover:bg-indigo-50/50 transition-colors">
                    <td className="px-4 py-3 text-sm font-medium text-gray-900">{r.name || r.roomNumber || r.id}</td>
                    <td className="px-4 py-3 text-sm text-gray-500">{r.hostelName || r.hostelId}</td>
                    <td className="px-4 py-3 text-sm">
                      <span className={r.gender === 'male' ? 'text-blue-600 font-medium' : 'text-pink-600 font-medium'}>
                        {(r.gender || '—').toUpperCase()}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-700">{r.totalBeds}</td>
                    <td className="px-4 py-3 text-sm text-red-600 font-medium">{r.occupied}</td>
                    <td className="px-4 py-3 text-sm text-green-600 font-medium">{r.available}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-24 h-2 rounded-full bg-gray-100 overflow-hidden">
                          <div
                            className={`h-full rounded-full ${r.totalBeds && r.occupied >= r.totalBeds ? 'bg-red-500' : 'bg-indigo-500'}`}
                            style={{ width: `${r.totalBeds ? Math.min(100, (r.occupied / r.totalBeds) * 100) : 0}%` }}
                          />
                        </div>
                        <span className="text-xs text-gray-500">
                          {r.totalBeds ? ((r.occupied / r.totalBeds) * 100).toFixed(0) : 0}%
                        </span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ))}

      {/* Shared DataTables for non-custom tabs */}
      {activeTab === 'students' && !dataError && (
        <DataTable
          columns={[
            { key: 'reference', label: 'Ref', render: (a) => <span className="font-medium text-indigo-600">{a.reference || '—'}</span> },
            { key: 'student', label: 'Student', render: (a) => <span className="font-medium text-gray-900">{a.student}</span> },
            { key: 'gender', label: 'Gender', render: (a) => <span className="capitalize">{a.gender}</span> },
            { key: 'room', label: 'Room', render: (a) => a.room },
            { key: 'bed', label: 'Bed', render: (a) => a.bed },
            { key: 'accommodation', label: 'Accommodation', render: (a) => a.accommodation },
            { key: 'amount', label: 'Amount', sortable: true, render: (a) => fmtMoney(a.amount) },
            { key: 'status', label: 'Status', render: (a) => <StatusBadge status={a.status} type="booking" /> },
          ]}
          data={allocations}
          loading={dataLoading}
          emptyMessage="No student allocations for this semester"
          pageSize={10}
        />
      )}

      {activeTab === 'payments' && !dataError && (
        <DataTable
          columns={[
            { key: 'studentName', label: 'Student', render: (p) => <span className="font-medium text-gray-900">{p.studentName || '—'}</span> },
            { key: 'bookingRef', label: 'Booking Ref', render: (p) => <span className="font-medium text-indigo-600">{p.bookingReference || p.bookingId || '—'}</span> },
            { key: 'room', label: 'Room', render: (p) => p.roomName || p.roomNumber || '—' },
            { key: 'bed', label: 'Bed', render: (p) => p.bedName || (p.bedNumber ? `Bed ${p.bedNumber}` : '—') },
            { key: 'amount', label: 'Amount', sortable: true, render: (p) => fmtMoney(p.amount) },
            { key: 'receipt', label: 'Receipt', render: (p) => p.receiptNumber || p.mpesaReceipt || p.reference || '—' },
            { key: 'createdAt', label: 'Date', render: (p) => fmtDate(p.createdAt) },
            { key: 'status', label: 'Status', render: (p) => <StatusBadge status={p.status} type="payment" /> },
          ]}
          data={payments}
          loading={dataLoading}
          emptyMessage="No payments for this semester"
          pageSize={10}
        />
      )}

      {activeTab === 'revenue' && !dataError && (
        <DataTable
          columns={[
            { key: 'type', label: 'Revenue Type', render: (r) => <span className="font-medium text-gray-900">{r.type}</span> },
            { key: 'amount', label: 'Amount', sortable: true, render: (r) => fmtMoney(r.amount) },
          ]}
          data={[
            { id: 'school', type: 'School Based', amount: revenue.schoolRevenue },
            { id: 'regular', type: 'Regular', amount: revenue.regularRevenue },
            { id: 'total', type: 'Total', amount: revenue.totalRevenue },
          ]}
          pagination={false}
          emptyMessage="No revenue data"
        />
      )}

      {activeTab === 'availableBeds' && !dataError && (
        <DataTable
          columns={[
            { key: 'room', label: 'Room', render: (b) => <span className="font-medium text-gray-900">{b.room}</span> },
            { key: 'hostel', label: 'Hostel', render: (b) => b.hostel },
            { key: 'gender', label: 'Gender', render: (b) => <span className="capitalize">{b.gender}</span> },
            { key: 'bedNumber', label: 'Bed Number', sortable: true, render: (b) => `Bed ${b.bedNumber}` },
            { key: 'position', label: 'Position', render: (b) => <span className="text-gray-700">{b.position}</span> },
          ]}
          data={availableBeds}
          loading={roomsLoading}
          emptyMessage="No available beds match your filters"
          pageSize={10}
        />
      )}
    </div>
  );
}