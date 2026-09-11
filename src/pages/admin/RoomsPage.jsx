import { useEffect, useState, useMemo, useCallback } from 'react';
import toast from 'react-hot-toast';
import { Plus, Pencil, Power, Eye, ChevronDown, ChevronUp } from 'lucide-react';
import { collection, getDocs, query, orderBy } from 'firebase/firestore';

import { db } from '../../firebase/config';
import DataTable from '../../components/admin/DataTable';
import Modal from '../../components/admin/Modal';
import ConfirmDialog from '../../components/admin/ConfirmDialog';
import StatusBadge from '../../components/admin/StatusBadge';
import FilterBar from '../../components/admin/FilterBar';
import { getAllHostels } from '../../services/hostelService';
import {
  createRoom,
  updateRoom,
  deactivateRoom,
} from '../../services/roomService';

function deriveRoomStatus(room, beds) {
  if (room.isActive === false) return 'inactive';
  if (beds.length === 0) return 'partial';
  const occupied = beds.filter((b) => b.status === 'occupied').length;
  if (occupied >= beds.length) return 'full';
  if (occupied === 0) return 'available';
  return 'partial';
}

async function fetchAllRoomsWithBeds() {
  const [roomsSnap, bedsSnap, hostels] = await Promise.all([
    getDocs(query(collection(db, 'rooms'), orderBy('name', 'asc'))),
    getDocs(collection(db, 'beds')),
    getAllHostels(),
  ]);
  const allBeds = bedsSnap.docs.map((d) => ({ id: d.id, ...d.data() }));

  const rooms = roomsSnap.docs.map((d) => {
    const room = { id: d.id, ...d.data() };
    const beds = allBeds.filter((b) => b.roomId === room.id);
    const occupied = beds.filter((b) => b.status === 'occupied').length;
    const available = beds.filter((b) => b.status === 'available').length;
    const blocked = beds.filter((b) => b.status === 'blocked').length;
    return {
      ...room,
      beds,
      totalBeds: beds.length,
      occupied,
      available,
      blocked,
      status: deriveRoomStatus(room, beds),
    };
  });

  return { rooms, allBeds, hostels };
}

const emptyForm = { name: '', hostelId: '', gender: '', bedCount: 1 };

export default function RoomsPage() {
  const [rooms, setRooms] = useState([]);
  const [hostels, setHostels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [search, setSearch] = useState('');
  const [filters, setFilters] = useState({ gender: '', hostel: '', status: '' });

  const [addOpen, setAddOpen] = useState(false);
  const [addForm, setAddForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  const [editRoom, setEditRoom] = useState(null);
  const [editForm, setEditForm] = useState(emptyForm);

  const [deactivateTarget, setDeactivateTarget] = useState(null);
  const [expandedRoomId, setExpandedRoomId] = useState(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { rooms: r, hostels: h } = await fetchAllRoomsWithBeds();
      setRooms(r);
      setHostels(h);
    } catch (err) {
      console.error('Failed to load rooms:', err);
      setError('Failed to load rooms. Please try again.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return rooms.filter((r) => {
      const matchesSearch =
        !q ||
        (r.name || r.roomNumber || '').toLowerCase().includes(q) ||
        (r.hostelName || '').toLowerCase().includes(q);
      const matchesGender = !filters.gender || r.gender === filters.gender;
      const matchesHostel = !filters.hostel || r.hostelId === filters.hostel;
      const matchesStatus = !filters.status || r.status === filters.status;
      return matchesSearch && matchesGender && matchesHostel && matchesStatus;
    });
  }, [rooms, search, filters]);

  function handleChange(key, value) {
    setFilters((f) => ({ ...f, [key]: value }));
  }

  function openEdit(room) {
    setEditRoom(room);
    setEditForm({
      name: room.name || room.roomNumber || '',
      hostelId: room.hostelId || '',
      gender: room.gender || '',
      bedCount: room.bedCount || room.totalBeds || 1,
    });
  }

  async function handleAdd(e) {
    e.preventDefault();
    if (!addForm.name || !addForm.hostelId || !addForm.gender) {
      toast.error('Please fill in all required fields');
      return;
    }
    setSaving(true);
    try {
      const hostel = hostels.find((h) => h.id === addForm.hostelId);
      await createRoom({
        name: addForm.name,
        roomNumber: addForm.name,
        hostelId: addForm.hostelId,
        hostelName: hostel?.name || addForm.hostelId,
        gender: addForm.gender,
        isActive: true,
        bedCount: Number(addForm.bedCount) || 1,
      });
      toast.success('Room created successfully');
      setAddOpen(false);
      setAddForm(emptyForm);
      loadData();
    } catch (err) {
      console.error(err);
      toast.error('Failed to create room');
    } finally {
      setSaving(false);
    }
  }

  async function handleEditSubmit(e) {
    e.preventDefault();
    if (!editRoom) return;
    setSaving(true);
    try {
      const data = {
        name: editForm.name,
        gender: editForm.gender,
        bedCount: Number(editForm.bedCount) || 1,
      };
      if (editForm.hostelId) {
        const hostel = hostels.find((h) => h.id === editForm.hostelId);
        data.hostelId = editForm.hostelId;
        data.hostelName = hostel?.name || editForm.hostelId;
      }
      await updateRoom(editRoom.id, data);
      toast.success('Room updated successfully');
      setEditRoom(null);
      loadData();
    } catch (err) {
      console.error(err);
      toast.error('Failed to update room');
    } finally {
      setSaving(false);
    }
  }

  async function handleDeactivate() {
    if (!deactivateTarget) return;
    try {
      await deactivateRoom(deactivateTarget.id);
      toast.success(`Room ${deactivateTarget.name || deactivateTarget.id} deactivated`);
      setDeactivateTarget(null);
      setExpandedRoomId(null);
      loadData();
    } catch (err) {
      console.error(err);
      toast.error('Failed to deactivate room');
    }
  }

  function toggleExpand(room) {
    setExpandedRoomId((cur) => (cur === room.id ? null : room.id));
  }

  const columns = [
    {
      key: 'name',
      label: 'Room #',
      render: (r) => (
        <span className="font-medium text-gray-900">
          {r.name || r.roomNumber || r.id}
        </span>
      ),
    },
    {
      key: 'hostelName',
      label: 'Hostel',
      render: (r) => (
        <span className="text-gray-500">{r.hostelName || r.hostelId}</span>
      ),
    },
    {
      key: 'gender',
      label: 'Gender',
      render: (r) => (
        <span
          className={`text-sm font-medium ${
            r.gender === 'male'
              ? 'text-blue-600'
              : r.gender === 'female'
              ? 'text-pink-600'
              : 'text-gray-500'
          }`}
        >
          {(r.gender || '—').toUpperCase()}
        </span>
      ),
    },
    {
      key: 'totalBeds',
      label: 'Capacity',
      sortable: true,
      render: (r) => r.bedCount || r.totalBeds || 0,
    },
    {
      key: 'occupied',
      label: 'Occupied',
      sortable: true,
      render: (r) => <span className="text-red-600 font-medium">{r.occupied}</span>,
    },
    {
      key: 'available',
      label: 'Available',
      sortable: true,
      render: (r) => (
        <span className="text-green-600 font-medium">{r.available}</span>
      ),
    },
    {
      key: 'status',
      label: 'Status',
      sortable: true,
      render: (r) => <StatusBadge status={r.status} type="room" />,
    },
    {
      key: 'actions',
      label: 'Actions',
      sortable: false,
      render: (r) => (
        <div className="flex items-center gap-1.5">
          <button
            onClick={(e) => {
              e.stopPropagation();
              toggleExpand(r);
            }}
            className="p-1.5 rounded-lg text-gray-500 hover:text-indigo-600 hover:bg-indigo-50 transition-colors"
            title="View beds"
          >
            {expandedRoomId === r.id ? (
              <ChevronUp className="w-4 h-4" />
            ) : (
              <Eye className="w-4 h-4" />
            )}
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              openEdit(r);
            }}
            className="p-1.5 rounded-lg text-gray-500 hover:text-blue-600 hover:bg-blue-50 transition-colors"
            title="Edit"
          >
            <Pencil className="w-4 h-4" />
          </button>
          {r.isActive !== false && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                setDeactivateTarget(r);
              }}
              className="p-1.5 rounded-lg text-gray-500 hover:text-red-600 hover:bg-red-50 transition-colors"
              title="Deactivate"
            >
              <Power className="w-4 h-4" />
            </button>
          )}
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
      key: 'hostel',
      label: 'Hostel',
      options: hostels.map((h) => ({ value: h.id, label: h.name })),
    },
    {
      key: 'status',
      label: 'Status',
      options: [
        { value: 'available', label: 'Available' },
        { value: 'partial', label: 'Partial' },
        { value: 'full', label: 'Full' },
        { value: 'inactive', label: 'Inactive' },
      ],
    },
  ];

  const inputCls =
    'w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500';
  const labelCls = 'block text-sm font-medium text-gray-700 mb-1.5';

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Rooms</h2>
          <p className="text-sm text-gray-500">
            {rooms.length} rooms · {rooms.reduce((s, r) => s + r.totalBeds, 0)} beds
          </p>
        </div>
        <button
          onClick={() => setAddOpen(true)}
          className="inline-flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Add Room
        </button>
      </div>

      <FilterBar
        filters={filterConfigs}
        values={filters}
        onChange={handleChange}
        searchValue={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search by room number or hostel..."
      />

      {error ? (
        <div className="bg-white rounded-xl border border-red-200 p-10 text-center">
          <p className="text-red-600 font-medium">{error}</p>
          <button
            onClick={loadData}
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
          emptyMessage="No rooms found"
          onRowClick={(r) => toggleExpand(r)}
          pageSize={10}
        />
      )}

      {expandedRoomId && (
        <div className="mt-4">
          {(() => {
            const room = rooms.find((r) => r.id === expandedRoomId);
            if (!room) return null;
            return (
              <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="flex items-center justify-between px-4 py-3 bg-gray-50 border-b border-gray-100">
                  <span className="text-sm font-semibold text-gray-700">
                    Beds in {room.name || room.roomNumber || room.id}
                  </span>
                  <span className="text-xs text-gray-500">
                    {room.available} available · {room.occupied} occupied ·{' '}
                    {room.blocked} blocked
                  </span>
                </div>
                <div className="p-4 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
                  {room.beds.length === 0 && (
                    <div className="col-span-full text-sm text-gray-400 py-6 text-center">
                      No beds in this room
                    </div>
                  )}
                  {room.beds.map((bed) => (
                    <div
                      key={bed.id}
                      className={`rounded-lg border p-3 ${
                        bed.status === 'occupied'
                          ? 'bg-red-50 border-red-200'
                          : bed.status === 'blocked'
                          ? 'bg-gray-100 border-gray-200'
                          : 'bg-green-50 border-green-200'
                      }`}
                    >
                      <div className="text-sm font-semibold text-gray-800">
                        Bed {bed.bedNumber}
                      </div>
                      <div className="text-xs text-gray-500">
                        {bed.position || (bed.bedNumber % 2 === 0 ? 'DOWN' : 'UP')} ·{' '}
                        {bed.status || 'available'}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })()}
        </div>
      )}

      <Modal
        isOpen={addOpen}
        onClose={() => setAddOpen(false)}
        title="Add Room"
        size="md"
        footer={
          <div className="flex justify-end gap-3">
            <button
              onClick={() => setAddOpen(false)}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleAdd}
              disabled={saving}
              className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition-colors"
            >
              {saving ? 'Creating...' : 'Create Room'}
            </button>
          </div>
        }
      >
        <form onSubmit={handleAdd} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className={labelCls}>Room Number</label>
            <input
              type="text"
              value={addForm.name}
              onChange={(e) => setAddForm({ ...addForm, name: e.target.value })}
              className={inputCls}
              placeholder="e.g. R101"
              required
            />
          </div>
          <div>
            <label className={labelCls}>Hostel</label>
            <select
              value={addForm.hostelId}
              onChange={(e) => setAddForm({ ...addForm, hostelId: e.target.value })}
              className={inputCls}
              required
            >
              <option value="">Select hostel</option>
              {hostels.map((h) => (
                <option key={h.id} value={h.id}>
                  {h.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className={labelCls}>Gender</label>
            <select
              value={addForm.gender}
              onChange={(e) => setAddForm({ ...addForm, gender: e.target.value })}
              className={inputCls}
              required
            >
              <option value="">Select gender</option>
              <option value="male">Male</option>
              <option value="female">Female</option>
            </select>
          </div>
          <div>
            <label className={labelCls}>Capacity (beds)</label>
            <input
              type="number"
              min="1"
              value={addForm.bedCount}
              onChange={(e) =>
                setAddForm({ ...addForm, bedCount: e.target.value })
              }
              className={inputCls}
            />
          </div>
        </form>
      </Modal>

      <Modal
        isOpen={!!editRoom}
        onClose={() => setEditRoom(null)}
        title={`Edit Room: ${editRoom?.name || editRoom?.roomNumber || ''}`}
        size="md"
        footer={
          <div className="flex justify-end gap-3">
            <button
              onClick={() => setEditRoom(null)}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleEditSubmit}
              disabled={saving}
              className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition-colors"
            >
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        }
      >
        <form onSubmit={handleEditSubmit} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className={labelCls}>Room Number</label>
            <input
              type="text"
              value={editForm.name}
              onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
              className={inputCls}
              required
            />
          </div>
          <div>
            <label className={labelCls}>Hostel</label>
            <select
              value={editForm.hostelId}
              onChange={(e) =>
                setEditForm({ ...editForm, hostelId: e.target.value })
              }
              className={inputCls}
            >
              <option value="">Select hostel</option>
              {hostels.map((h) => (
                <option key={h.id} value={h.id}>
                  {h.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className={labelCls}>Gender</label>
            <select
              value={editForm.gender}
              onChange={(e) => setEditForm({ ...editForm, gender: e.target.value })}
              className={inputCls}
              required
            >
              <option value="male">Male</option>
              <option value="female">Female</option>
            </select>
          </div>
          <div>
            <label className={labelCls}>Capacity (beds)</label>
            <input
              type="number"
              min="1"
              value={editForm.bedCount}
              onChange={(e) =>
                setEditForm({ ...editForm, bedCount: e.target.value })
              }
              className={inputCls}
            />
            <p className="mt-1 text-xs text-gray-400">
              Updating capacity does not change existing beds.
            </p>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        isOpen={!!deactivateTarget}
        onClose={() => setDeactivateTarget(null)}
        onConfirm={handleDeactivate}
        title="Deactivate room?"
        message={`Room "${
          deactivateTarget?.name || deactivateTarget?.roomNumber || deactivateTarget?.id
        }" will no longer accept new bookings. Existing bookings are not affected. Continue?`}
        confirmText="Deactivate"
        variant="danger"
      />
    </div>
  );
}