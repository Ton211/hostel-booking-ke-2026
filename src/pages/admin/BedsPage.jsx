import { useEffect, useState, useMemo, useCallback } from 'react';
import toast from 'react-hot-toast';
import { Plus, Ban, Unlock } from 'lucide-react';
import { collection, getDocs, query, orderBy } from 'firebase/firestore';

import { db } from '../../firebase/config';
import RoomVisual from '../../components/admin/RoomVisual';
import Modal from '../../components/admin/Modal';
import StatusBadge from '../../components/admin/StatusBadge';
import FilterBar from '../../components/admin/FilterBar';
import { getAllHostels } from '../../services/hostelService';
import {
  blockBed,
  unblockBed,
  createBed,
  updateBed,
} from '../../services/bedService';

async function fetchRoomsAndBeds() {
  const [roomsSnap, bedsSnap, bookingsSnap, hostels] = await Promise.all([
    getDocs(query(collection(db, 'rooms'), orderBy('name', 'asc'))),
    getDocs(collection(db, 'beds')),
    getDocs(collection(db, 'bookings')),
    getAllHostels(),
  ]);

  const rooms = roomsSnap.docs
    .map((d) => ({ id: d.id, ...d.data() }))
    .filter((r) => r.isActive !== false);

  const bookingMap = {};
  bookingsSnap.docs.forEach((d) => {
    const b = d.data();
    const bookingStatus = b.bookingStatus || b.status;
    if (['CONFIRMED', 'PENDING_PAYMENT', 'confirmed', 'active', 'pending'].includes(bookingStatus)) {
      if (b.bedId && !bookingMap[b.bedId]) {
        bookingMap[b.bedId] = {
          studentName: b.studentName || b.student?.name || 'N/A',
          reference: b.bookingReference || b.reference,
          bookingId: d.id,
          status: bookingStatus,
        };
      }
    }
  });

  const beds = bedsSnap.docs
    .map((d) => {
      const bed = { id: d.id, ...d.data() };
      const info = bookingMap[bed.id];
      return {
        ...bed,
        studentName: info?.studentName,
        bookingRef: info?.reference,
        bookingId: info?.bookingId,
        bookingStatus: info?.status,
      };
    })
    .filter((b) => b.isActive !== false);

  const roomBeds = rooms.map((room) => ({
    ...room,
    beds: beds.filter((b) => b.roomId === room.id),
  }));

  return { roomBeds, hostels };
}

export default function BedsPage() {
  const [roomBeds, setRoomBeds] = useState([]);
  const [hostels, setHostels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [search, setSearch] = useState('');
  const [filters, setFilters] = useState({
    gender: '',
    hostel: '',
    room: '',
    status: '',
  });

  const [selectedBed, setSelectedBed] = useState(null);
  const [addBedRoom, setAddBedRoom] = useState(null);
  const [addForm, setAddForm] = useState({ bedNumber: 1, position: 'UP' });
  const [saving, setSaving] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { roomBeds: rb, hostels: h } = await fetchRoomsAndBeds();
      setRoomBeds(rb);
      setHostels(h);
    } catch (err) {
      console.error('Failed to load beds:', err);
      setError('Failed to load beds. Please try again.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const allBeds = useMemo(
    () => roomBeds.flatMap((room) => room.beds),
    [roomBeds]
  );

  const filteredRooms = useMemo(() => {
    const q = search.toLowerCase();
    return roomBeds
      .map((room) => {
        const beds = room.beds.filter((bed) => {
          const matchesSearch =
            !q ||
            String(bed.bedNumber).includes(q) ||
            (bed.studentName || '').toLowerCase().includes(q) ||
            (bed.name || '').toLowerCase().includes(q);
          const matchesStatus = !filters.status || bed.status === filters.status;
          return matchesSearch && matchesStatus;
        });
        return { ...room, beds };
      })
      .filter((room) => {
        const matchesGender = !filters.gender || room.gender === filters.gender;
        const matchesHostel = !filters.hostel || room.hostelId === filters.hostel;
        const matchesRoom = !filters.room || room.id === filters.room;
        return matchesGender && matchesHostel && matchesRoom && room.beds.length > 0;
      });
  }, [roomBeds, search, filters]);

  function handleChange(key, value) {
    setFilters((f) => ({ ...f, [key]: value }));
  }

  async function handleBlockToggle(bed) {
    try {
      if (bed.status === 'blocked') {
        await unblockBed(bed.id);
        toast.success(`Bed ${bed.bedNumber} unblocked`);
      } else {
        await blockBed(bed.id);
        toast.success(`Bed ${bed.bedNumber} blocked`);
      }
      loadData();
      setSelectedBed((cur) => (cur && cur.id === bed.id ? null : cur));
    } catch (err) {
      console.error(err);
      toast.error('Failed to update bed status');
    }
  }

  async function handleAddBed(e) {
    e.preventDefault();
    if (!addBedRoom) return;
    setSaving(true);
    try {
      const num = Number(addForm.bedNumber) || 1;
      await createBed({
        roomId: addBedRoom.id,
        bedNumber: num,
        name: `Bed ${num}`,
        position: addForm.position,
        status: 'available',
      });
      toast.success('Bed added successfully');
      setAddBedRoom(null);
      setAddForm({ bedNumber: 1, position: 'UP' });
      loadData();
    } catch (err) {
      console.error(err);
      toast.error('Failed to add bed');
    } finally {
      setSaving(false);
    }
  }

  async function handleEditBed(e) {
    e.preventDefault();
    if (!selectedBed) return;
    setSaving(true);
    try {
      await updateBed(selectedBed.id, {
        bedNumber: Number(selectedBed.bedNumber) || selectedBed.bedNumber,
        name: `Bed ${Number(selectedBed.bedNumber) || selectedBed.bedNumber}`,
        position: selectedBed.position,
      });
      toast.success('Bed updated successfully');
      setSelectedBed(null);
      loadData();
    } catch (err) {
      console.error(err);
      toast.error('Failed to update bed');
    } finally {
      setSaving(false);
    }
  }

  const roomOptions = roomBeds.map((r) => ({
    value: r.id,
    label: r.name || r.roomNumber || r.id,
  }));

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
      key: 'hostel',
      label: 'Hostel',
      options: hostels.map((h) => ({ value: h.id, label: h.name })),
    },
    { key: 'room', label: 'Room', options: roomOptions },
    {
      key: 'status',
      label: 'Status',
      options: [
        { value: 'available', label: 'Available' },
        { value: 'occupied', label: 'Occupied' },
        { value: 'blocked', label: 'Blocked' },
      ],
    },
  ];

  const inputCls =
    'w-full px-3 py-2 text-sm border border-stone-200 rounded-lg focus:ring-2 focus:ring-clay-500 focus:border-clay-500';
  const labelCls = 'block text-sm font-medium text-stone-700 mb-1.5';

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-stone-900">Beds</h2>
          <p className="text-sm text-stone-500">
            {allBeds.length} beds across {roomBeds.length} rooms
          </p>
        </div>
      </div>

      <div className="flex flex-wrap gap-2 text-xs">
        <span className="inline-flex items-center gap-1.5">
          <span className="w-3 h-3 rounded bg-green-500" /> Available
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="w-3 h-3 rounded bg-red-500" /> Occupied
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="w-3 h-3 rounded bg-yellow-500" /> Pending
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="w-3 h-3 rounded bg-stone-400" /> Blocked
        </span>
      </div>

      <FilterBar
        filters={filterConfigs}
        values={filters}
        onChange={handleChange}
        searchValue={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search by bed number or student name..."
      />

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
      ) : loading ? (
        <div className="flex flex-col items-center justify-center py-24 gap-3">
          <div className="w-10 h-10 border-4 border-clay-200 border-t-clay-600 rounded-full animate-spin" />
          <p className="text-sm text-stone-500">Loading beds...</p>
        </div>
      ) : filteredRooms.length === 0 ? (
        <div className="bg-white rounded-xl border border-stone-100 p-14 text-center text-stone-400">
          No beds found matching your filters
        </div>
      ) : (
        <div className="space-y-4">
          {filteredRooms.map((room) => (
            <div key={room.id}>
              <RoomVisual room={room} beds={room.beds} onBedClick={setSelectedBed} />
              {room.beds.length > 0 && room.beds[room.beds.length - 1] && (
                <div className="flex justify-end mt-2">
                  <button
                    onClick={() => {
                      setAddBedRoom(room);
                      setAddForm({
                        bedNumber: room.beds.length + 1,
                        position: 'UP',
                      });
                    }}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-clay-600 bg-clay-50 rounded-lg hover:bg-clay-100 transition-colors"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Add Bed
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      <Modal
        isOpen={!!selectedBed}
        onClose={() => setSelectedBed(null)}
        title={`Bed ${selectedBed?.bedNumber || ''} · Detail`}
        size="md"
        footer={
          <div className="flex justify-end gap-3">
            {selectedBed?.status !== 'occupied' && (
              <>
                {selectedBed?.status === 'blocked' ? (
                  <button
                    onClick={() => handleBlockToggle(selectedBed)}
                    className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-green-700 bg-green-50 border border-green-200 rounded-lg hover:bg-green-100 transition-colors"
                  >
                    <Unlock className="w-4 h-4" />
                    Unblock Bed
                  </button>
                ) : (
                  <button
                    onClick={() => handleBlockToggle(selectedBed)}
                    className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-stone-700 bg-white border border-stone-300 rounded-lg hover:bg-stone-50 transition-colors"
                  >
                    <Ban className="w-4 h-4" />
                    Block Bed
                  </button>
                )}
                <button
                  onClick={handleEditBed}
                  disabled={saving}
                  className="px-4 py-2 text-sm font-medium text-white bg-clay-600 rounded-lg hover:bg-clay-700 disabled:opacity-50 transition-colors"
                >
                  {saving ? 'Saving...' : 'Save Changes'}
                </button>
              </>
            )}
            <button
              onClick={() => setSelectedBed(null)}
              className="px-4 py-2 text-sm font-medium text-stone-700 bg-white border border-stone-300 rounded-lg hover:bg-stone-50 transition-colors"
            >
              Close
            </button>
          </div>
        }
      >
        {selectedBed && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              <div className="bg-stone-50 rounded-lg p-3">
                <div className="text-xs text-stone-500">Bed Number</div>
                <div className="font-semibold text-stone-900">
                  {selectedBed.bedNumber}
                </div>
              </div>
              <div className="bg-stone-50 rounded-lg p-3">
                <div className="text-xs text-stone-500">Position</div>
                <select
                  value={selectedBed.position || 'UP'}
                  onChange={(e) =>
                    setSelectedBed({
                      ...selectedBed,
                      position: e.target.value,
                    })
                  }
                  disabled={selectedBed.status === 'occupied'}
                  className="mt-0.5 w-full px-2 py-1 text-sm border border-stone-200 rounded-lg focus:ring-2 focus:ring-clay-500 bg-white disabled:opacity-60"
                >
                  <option value="UP">UP</option>
                  <option value="DOWN">DOWN</option>
                </select>
              </div>
              <div className="bg-stone-50 rounded-lg p-3">
                <div className="text-xs text-stone-500">Status</div>
                <StatusBadge status={selectedBed.status} type="bed" />
              </div>
            </div>

            {(selectedBed.status === 'occupied' ||
              selectedBed.bookingRef ||
              selectedBed.studentName) && (
              <div className="bg-blue-50 border border-blue-100 rounded-lg p-4">
                <div className="text-xs font-semibold text-blue-700 uppercase tracking-wide mb-2">
                  Current Booking
                </div>
                <dl className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
                  <div>
                    <dt className="text-stone-500 text-xs">Student</dt>
                    <dd className="font-medium text-stone-900">
                      {selectedBed.studentName || 'N/A'}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-stone-500 text-xs">Reference</dt>
                    <dd className="font-medium text-stone-900">
                      {selectedBed.bookingRef || 'N/A'}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-stone-500 text-xs">Booking Status</dt>
                    <dd>
                      <StatusBadge
                        status={selectedBed.bookingStatus || 'active'}
                        type="booking"
                      />
                    </dd>
                  </div>
                  <div>
                    <dt className="text-stone-500 text-xs">Booking ID</dt>
                    <dd className="font-medium text-stone-900 text-xs break-all">
                      {selectedBed.bookingId || 'N/A'}
                    </dd>
                  </div>
                </dl>
              </div>
            )}
            <p className="text-xs text-stone-400">
              Occupied beds cannot be blocked or repositioned. Position edits apply
              to all beds.
            </p>
          </div>
        )}
      </Modal>

      <Modal
        isOpen={!!addBedRoom}
        onClose={() => setAddBedRoom(null)}
        title={`Add Bed · ${addBedRoom?.name || addBedRoom?.roomNumber || ''}`}
        size="sm"
        footer={
          <div className="flex justify-end gap-3">
            <button
              onClick={() => setAddBedRoom(null)}
              className="px-4 py-2 text-sm font-medium text-stone-700 bg-white border border-stone-300 rounded-lg hover:bg-stone-50 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleAddBed}
              disabled={saving}
              className="px-4 py-2 text-sm font-medium text-white bg-clay-600 rounded-lg hover:bg-clay-700 disabled:opacity-50 transition-colors"
            >
              {saving ? 'Adding...' : 'Add Bed'}
            </button>
          </div>
        }
      >
        <form onSubmit={handleAddBed} className="grid grid-cols-2 gap-4">
          <div>
            <label className={labelCls}>Bed Number</label>
            <input
              type="number"
              min="1"
              value={addForm.bedNumber}
              onChange={(e) =>
                setAddForm({ ...addForm, bedNumber: e.target.value })
              }
              className={inputCls}
              required
            />
          </div>
          <div>
            <label className={labelCls}>Position</label>
            <select
              value={addForm.position}
              onChange={(e) =>
                setAddForm({ ...addForm, position: e.target.value })
              }
              className={inputCls}
            >
              <option value="UP">UP</option>
              <option value="DOWN">DOWN</option>
            </select>
          </div>
        </form>
      </Modal>
    </div>
  );
}