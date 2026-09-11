import { useEffect, useState, useMemo, useCallback } from 'react';
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts';
import {
  DoorOpen,
  BedDouble,
  BedSingle,
  CheckCircle2,
  Clock,
  Ban,
  Users,
  Banknote,
  GraduationCap,
  Landmark,
  RefreshCw,
} from 'lucide-react';

import StatCard from '../../components/admin/StatCard';
import { getAllSemesters } from '../../services/semesterService';
import { getDashboardStats } from '../../services/statsService';
import { getRoomsWithAvailability } from '../../services/roomService';
import { getBookingsBySemester } from '../../services/bookingService';
import { getPayments } from '../../services/paymentService';
import { getAllHostels } from '../../services/hostelService';

function fmtMoney(value) {
  return 'KSh ' + Number(value || 0).toLocaleString();
}

const PIE_COLORS = ['#10b981', '#ef4444', '#f59e0b', '#9ca3af'];

export default function DashboardPage() {
  const [semesters, setSemesters] = useState([]);
  const [semesterId, setSemesterId] = useState('');
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const loadData = useCallback(async (sid) => {
    if (!sid) return;
    setLoading(true);
    setError(null);
    try {
      const [stats, rooms, bookings, payments, hostels] = await Promise.all([
        getDashboardStats(sid),
        getRoomsWithAvailability(sid),
        getBookingsBySemester(sid),
        getPayments({ semesterId: sid }),
        getAllHostels(),
      ]);
      setData({ stats, rooms, bookings, payments, hostels });
    } catch (err) {
      console.error('Failed to load dashboard:', err);
      setError('Failed to load dashboard statistics. Please try again.');
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
          setError('Failed to load dashboard statistics. Please try again.');
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

  const derived = useMemo(() => {
    if (!data) return null;
    const { stats, rooms, bookings, payments } = data;

    const allStudentIds = new Set();
    const maleStudents = new Set();
    const femaleStudents = new Set();
    const schoolStudents = new Set();
    const regularStudents = new Set();
    let schoolRevenue = 0;
    let regularRevenue = 0;
    let pendingBookings = 0;

    bookings.forEach((b) => {
      allStudentIds.add(b.studentId);
      const gender = (b.studentGender || b.gender || '').toLowerCase();
      if (gender === 'male') maleStudents.add(b.studentId);
      else if (gender === 'female') femaleStudents.add(b.studentId);

      const type =
        (b.accommodationType || b.accommodationTypeName || '').toLowerCase();
      const isSchool = b.isSchoolBased === true || type.includes('school');

      if (isSchool) {
        schoolStudents.add(b.studentId);
        schoolRevenue += Number(b.amount) || 0;
      } else {
        regularStudents.add(b.studentId);
        regularRevenue += Number(b.amount) || 0;
      }
      if (b.status === 'pending') pendingBookings += 1;
    });

    const pendingPayments = payments.filter((p) => p.status === 'pending').length;

    const occupancyPie = [
      { name: 'Available', value: stats.availableBeds, color: PIE_COLORS[0] },
      { name: 'Booked', value: stats.occupiedBeds, color: PIE_COLORS[1] },
      { name: 'Pending', value: pendingBookings, color: PIE_COLORS[2] },
      { name: 'Blocked', value: stats.blockedBeds, color: PIE_COLORS[3] },
    ].filter((d) => d.value > 0);

    const revenueBars = [
      { name: 'School Based', amount: Math.round(schoolRevenue) },
      { name: 'Regular', amount: Math.round(regularRevenue) },
    ];

    const roomBars = [...rooms]
      .sort((a, b) => (b.occupiedBeds || 0) - (a.occupiedBeds || 0))
      .slice(0, 12)
      .map((r) => ({
        name: r.name || r.roomNumber || r.id,
        occupied: r.occupiedBeds || 0,
        available: r.availableBeds || 0,
      }));

    return {
      stats,
      pendingPayments,
      pendingBookings,
      totalStudents: allStudentIds.size,
      males: maleStudents.size,
      females: femaleStudents.size,
      schoolStudents: schoolStudents.size,
      regularStudents: regularStudents.size,
      schoolRevenue,
      regularRevenue,
      occupancyPie,
      revenueBars,
      roomBars,
      roomCount: rooms.length,
    };
  }, [data]);

  const statCards = derived
    ? [
        { title: 'Total Rooms', value: derived.stats.totalRooms, icon: DoorOpen, color: 'clay' },
        { title: 'Total Beds', value: derived.stats.totalBeds, icon: BedDouble, color: 'blue' },
        { title: 'Available Beds', value: derived.stats.availableBeds, icon: CheckCircle2, color: 'green' },
        { title: 'Booked Beds', value: derived.stats.occupiedBeds, icon: BedSingle, color: 'purple' },
        { title: 'Pending Payments', value: derived.pendingPayments, icon: Clock, color: 'yellow' },
        { title: 'Blocked Beds', value: derived.stats.blockedBeds, icon: Ban, color: 'stone' },
        { title: 'Total Students', value: derived.totalStudents, icon: Users, color: 'pink' },
        { title: 'Total Revenue', value: fmtMoney(derived.stats.totalRevenue), icon: Banknote, color: 'green' },
        { title: 'School Based Revenue', value: fmtMoney(derived.schoolRevenue), icon: GraduationCap, color: 'clay' },
        { title: 'Regular Revenue', value: fmtMoney(derived.regularRevenue), icon: Landmark, color: 'blue' },
      ]
    : [];

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-32 gap-3">
        <div className="w-10 h-10 border-4 border-clay-200 border-t-clay-600 rounded-full animate-spin" />
        <p className="text-sm text-stone-500">Loading dashboard...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white rounded-xl border border-red-200 p-10 text-center">
        <p className="text-red-600 font-medium">{error}</p>
        <button
          onClick={() => loadData(semesterId)}
          className="mt-4 inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-clay-600 rounded-lg hover:bg-clay-700 transition-colors"
        >
          <RefreshCw className="w-4 h-4" />
          Retry
        </button>
      </div>
    );
  }

  if (!derived) {
    return (
      <div className="bg-white rounded-xl border border-stone-100 p-10 text-center text-stone-500 text-sm">
        No data available for the selected semester.
      </div>
    );
  }

  const genderTotal = derived.males + derived.females || 1;
  const malePct = Math.round((derived.males / genderTotal) * 100);
  const femalePct = Math.round((derived.females / genderTotal) * 100);

  const accomTotal = derived.schoolStudents + derived.regularStudents || 1;
  const schoolPct = Math.round((derived.schoolStudents / accomTotal) * 100);
  const regularPct = Math.round((derived.regularStudents / accomTotal) * 100);

  const rate = Math.min(Number(derived.stats.occupancyRate) || 0, 100);

  const tooltipMoney = (value) => [fmtMoney(value), 'Amount'];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-stone-900">Dashboard Overview</h2>
          <p className="text-sm text-stone-500">
            Real-time snapshot of hostel occupancy and revenue.
          </p>
        </div>
        <label className="flex items-center gap-2 text-sm text-stone-600">
          <span className="font-medium whitespace-nowrap">Semester:</span>
          <select
            value={semesterId}
            onChange={(e) => setSemesterId(e.target.value)}
            className="py-2 pl-3 pr-8 text-sm border border-stone-200 rounded-lg focus:ring-2 focus:ring-clay-500 bg-white"
          >
            {semesters.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name} {s.isActive && !s.isClosed ? '(Active)' : ''}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-4">
        {statCards.map((card) => (
          <StatCard key={card.title} {...card} />
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl shadow-sm border border-stone-100 p-5">
          <h3 className="text-sm font-semibold text-stone-700 mb-4">Occupancy Rate</h3>
          <div className="flex items-end justify-between mb-2">
            <span className="text-3xl font-bold text-stone-900">
              {Number(derived.stats.occupancyRate || 0).toFixed(1)}%
            </span>
            <span className="text-xs text-stone-400">beds in use</span>
          </div>
          <div className="h-3 rounded-full bg-stone-100 overflow-hidden">
            <div
              className="h-full rounded-full bg-clay-600 transition-all"
              style={{ width: `${rate}%` }}
            />
          </div>
          <div className="mt-4 grid grid-cols-3 text-center border-t border-stone-100 pt-4">
            <div>
              <div className="text-lg font-bold text-green-600">
                {derived.stats.availableBeds}
              </div>
              <div className="text-xs text-stone-400">Available</div>
            </div>
            <div>
              <div className="text-lg font-bold text-red-600">
                {derived.stats.occupiedBeds}
              </div>
              <div className="text-xs text-stone-400">Booked</div>
            </div>
            <div>
              <div className="text-lg font-bold text-stone-500">
                {derived.stats.blockedBeds}
              </div>
              <div className="text-xs text-stone-400">Blocked</div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-stone-100 p-5">
          <h3 className="text-sm font-semibold text-stone-700 mb-4">Gender Breakdown</h3>
          <div className="text-3xl font-bold text-stone-900">{derived.totalStudents}</div>
          <div className="text-xs text-stone-400 mb-4">students booked this semester</div>
          <div className="space-y-3">
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-blue-600 font-medium">Male</span>
                <span className="text-stone-500">{derived.males} ({malePct}%)</span>
              </div>
              <div className="h-2 rounded-full bg-stone-100 overflow-hidden">
                <div className="h-full bg-blue-500 rounded-full" style={{ width: `${malePct}%` }} />
              </div>
            </div>
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-pink-600 font-medium">Female</span>
                <span className="text-stone-500">{derived.females} ({femalePct}%)</span>
              </div>
              <div className="h-2 rounded-full bg-stone-100 overflow-hidden">
                <div className="h-full bg-pink-500 rounded-full" style={{ width: `${femalePct}%` }} />
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-stone-100 p-5">
          <h3 className="text-sm font-semibold text-stone-700 mb-4">
            Accommodation Breakdown
          </h3>
          <div className="text-3xl font-bold text-stone-900">{accomTotal}</div>
          <div className="text-xs text-stone-400 mb-4">total allocations this semester</div>
          <div className="space-y-3">
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-clay-600 font-medium">School Based</span>
                <span className="text-stone-500">
                  {derived.schoolStudents} ({schoolPct}%)
                </span>
              </div>
              <div className="h-2 rounded-full bg-stone-100 overflow-hidden">
                <div className="h-full bg-clay-500 rounded-full" style={{ width: `${schoolPct}%` }} />
              </div>
            </div>
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-cyan-600 font-medium">Regular</span>
                <span className="text-stone-500">
                  {derived.regularStudents} ({regularPct}%)
                </span>
              </div>
              <div className="h-2 rounded-full bg-stone-100 overflow-hidden">
                <div className="h-full bg-cyan-500 rounded-full" style={{ width: `${regularPct}%` }} />
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl shadow-sm border border-stone-100 p-5">
          <h3 className="text-sm font-semibold text-stone-700 mb-2">Bed Occupancy</h3>
          <p className="text-xs text-stone-400 mb-3">
            Available vs booked vs blocked vs pending bookings
          </p>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={derived.occupancyPie}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  outerRadius={90}
                  label
                >
                  {derived.occupancyPie.map((entry, i) => (
                    <Cell key={entry.name} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend verticalAlign="bottom" height={40} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-stone-100 p-5">
          <h3 className="text-sm font-semibold text-stone-700 mb-2">Revenue by Type</h3>
          <p className="text-xs text-stone-400 mb-3">School Based vs Regular</p>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={derived.revenueBars} barSize={44}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip formatter={tooltipMoney} />
                <Bar dataKey="amount" name="Amount">
                  <Cell fill="#4f46e5" />
                  <Cell fill="#06b6d4" />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-3 flex justify-between text-xs text-stone-500 border-t border-stone-100 pt-3">
            <span>School Based: <strong className="text-stone-800">{fmtMoney(derived.schoolRevenue)}</strong></span>
            <span>Regular: <strong className="text-stone-800">{fmtMoney(derived.regularRevenue)}</strong></span>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-stone-100 p-5">
          <h3 className="text-sm font-semibold text-stone-700 mb-2">
            Occupancy Per Room
          </h3>
          <p className="text-xs text-stone-400 mb-3">Top rooms by occupied beds</p>
          <div className="h-64">
            {derived.roomBars.length === 0 ? (
              <div className="h-full flex items-center justify-center text-sm text-stone-400">
                No rooms available
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={derived.roomBars} layout="vertical" margin={{ left: 8, right: 16 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis type="number" tick={{ fontSize: 11 }} allowDecimals={false} />
                  <YAxis
                    type="category"
                    dataKey="name"
                    width={72}
                    tick={{ fontSize: 11 }}
                  />
                  <Tooltip />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  <Bar dataKey="occupied" name="Occupied" fill="#ef4444" radius={[0, 4, 4, 0]} />
                  <Bar dataKey="available" name="Available" fill="#10b981" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}