import { useEffect, useState, useCallback } from 'react';
import toast from 'react-hot-toast';
import { Plus, Pencil, Power, Lock, Check } from 'lucide-react';

import DataTable from '../../components/admin/DataTable';
import Modal from '../../components/admin/Modal';
import ConfirmDialog from '../../components/admin/ConfirmDialog';
import StatusBadge from '../../components/admin/StatusBadge';
import {
  getAllSemesters,
  createSemester,
  updateSemester,
  closeSemester,
} from '../../services/semesterService';

function fmtDate(value) {
  if (!value) return 'N/A';
  if (typeof value === 'object' && typeof value.toDate === 'function')
    return value.toDate().toLocaleDateString();
  const d = new Date(value);
  return isNaN(d.getTime()) ? String(value) : d.toLocaleDateString();
}

function toInputValue(value) {
  if (!value) return '';
  if (typeof value === 'object' && typeof value.toDate === 'function') {
    const d = value.toDate();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(
      d.getDate()
    ).padStart(2, '0')}`;
  }
  return String(value).slice(0, 10);
}

function semesterStatus(sem) {
  if (sem.isClosed) return 'closed';
  if (sem.isActive) return 'active';
  return 'inactive';
}

const emptyForm = {
  name: '',
  startDate: '',
  endDate: '',
  bookingStart: '',
  bookingEnd: '',
};

export default function SemestersPage() {
  const [semesters, setSemesters] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [addOpen, setAddOpen] = useState(false);
  const [addForm, setAddForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  const [editSemester, setEditSemester] = useState(null);
  const [editForm, setEditForm] = useState(emptyForm);

  const [closeTarget, setCloseTarget] = useState(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setSemesters(await getAllSemesters());
    } catch (err) {
      console.error('Failed to load semesters:', err);
      setError('Failed to load semesters. Please try again.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  function openEdit(sem) {
    setEditSemester(sem);
    setEditForm({
      name: sem.name || '',
      startDate: toInputValue(sem.startDate),
      endDate: toInputValue(sem.endDate),
      bookingStart: toInputValue(sem.bookingStartDate || sem.bookingStart),
      bookingEnd: toInputValue(sem.bookingEndDate || sem.bookingEnd),
    });
  }

  async function handleAdd(e) {
    e.preventDefault();
    if (!addForm.name) {
      toast.error('Semester name is required');
      return;
    }
    setSaving(true);
    try {
      await createSemester({
        name: addForm.name,
        startDate: addForm.startDate,
        endDate: addForm.endDate,
        bookingStartDate: addForm.bookingStart,
        bookingEndDate: addForm.bookingEnd,
        bookingStart: addForm.bookingStart,
        bookingEnd: addForm.bookingEnd,
      });
      toast.success('Semester created successfully');
      setAddOpen(false);
      setAddForm(emptyForm);
      loadData();
    } catch (err) {
      console.error(err);
      toast.error('Failed to create semester');
    } finally {
      setSaving(false);
    }
  }

  async function handleEditSubmit(e) {
    e.preventDefault();
    if (!editSemester) return;
    setSaving(true);
    try {
      await updateSemester(editSemester.id, {
        name: editForm.name,
        startDate: editForm.startDate,
        endDate: editForm.endDate,
        bookingStartDate: editForm.bookingStart,
        bookingEndDate: editForm.bookingEnd,
        bookingStart: editForm.bookingStart,
        bookingEnd: editForm.bookingEnd,
      });
      toast.success('Semester updated successfully');
      setEditSemester(null);
      loadData();
    } catch (err) {
      console.error(err);
      toast.error('Failed to update semester');
    } finally {
      setSaving(false);
    }
  }

  async function handleToggleActive(sem) {
    try {
      await updateSemester(sem.id, { isActive: !sem.isActive });
      toast.success(
        sem.isActive
          ? `Semester "${sem.name}" deactivated`
          : `Semester "${sem.name}" activated`
      );
      loadData();
    } catch (err) {
      console.error(err);
      toast.error('Failed to update semester status');
    }
  }

  async function handleClose() {
    if (!closeTarget) return;
    try {
      await closeSemester(closeTarget.id);
      toast.success(`Semester "${closeTarget.name}" closed`);
      setCloseTarget(null);
      loadData();
    } catch (err) {
      console.error(err);
      toast.error('Failed to close semester');
    }
  }

  const columns = [
    {
      key: 'name',
      label: 'Name',
      render: (s) => (
        <div>
          <div className="font-semibold text-stone-900">{s.name}</div>
          <div className="text-xs text-stone-400">{s.id}</div>
        </div>
      ),
    },
    {
      key: 'startDate',
      label: 'Start Date',
      sortable: true,
      render: (s) => fmtDate(s.startDate),
    },
    {
      key: 'endDate',
      label: 'End Date',
      sortable: true,
      render: (s) => fmtDate(s.endDate),
    },
    {
      key: 'bookingStart',
      label: 'Booking Start',
      render: (s) => fmtDate(s.bookingStartDate || s.bookingStart),
    },
    {
      key: 'bookingEnd',
      label: 'Booking End',
      render: (s) => fmtDate(s.bookingEndDate || s.bookingEnd),
    },
    {
      key: 'status',
      label: 'Status',
      sortable: true,
      render: (s) => <StatusBadge status={semesterStatus(s)} type="semester" />,
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
              openEdit(s);
            }}
            className="p-1.5 rounded-lg text-stone-500 hover:text-blue-600 hover:bg-blue-50 transition-colors"
            title="Edit"
          >
            <Pencil className="w-4 h-4" />
          </button>
          {!s.isClosed && (
            <>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleToggleActive(s);
                }}
                className="p-1.5 rounded-lg text-stone-500 hover:text-green-600 hover:bg-green-50 transition-colors"
                title={s.isActive ? 'Deactivate' : 'Activate'}
              >
                {s.isActive ? (
                  <Power className="w-4 h-4" />
                ) : (
                  <Check className="w-4 h-4" />
                )}
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setCloseTarget(s);
                }}
                className="p-1.5 rounded-lg text-stone-500 hover:text-red-600 hover:bg-red-50 transition-colors"
                title="Close semester"
              >
                <Lock className="w-4 h-4" />
              </button>
            </>
          )}
        </div>
      ),
    },
  ];

  const inputCls =
    'w-full px-3 py-2 text-sm border border-stone-200 rounded-lg focus:ring-2 focus:ring-clay-500 focus:border-clay-500';
  const labelCls = 'block text-sm font-medium text-stone-700 mb-1.5';

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-stone-900">Semesters</h2>
          <p className="text-sm text-stone-500">{semesters.length} semesters</p>
        </div>
        <button
          onClick={() => setAddOpen(true)}
          className="inline-flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium text-white bg-clay-600 rounded-lg hover:bg-clay-700 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Add Semester
        </button>
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
          data={semesters}
          loading={loading}
          emptyMessage="No semesters yet"
          pageSize={10}
        />
      )}

      <Modal
        isOpen={addOpen}
        onClose={() => setAddOpen(false)}
        title="Add Semester"
        size="md"
        footer={
          <div className="flex justify-end gap-3">
            <button
              onClick={() => setAddOpen(false)}
              className="px-4 py-2 text-sm font-medium text-stone-700 bg-white border border-stone-300 rounded-lg hover:bg-stone-50 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleAdd}
              disabled={saving}
              className="px-4 py-2 text-sm font-medium text-white bg-clay-600 rounded-lg hover:bg-clay-700 disabled:opacity-50 transition-colors"
            >
              {saving ? 'Creating...' : 'Create Semester'}
            </button>
          </div>
        }
      >
        <form onSubmit={handleAdd} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="sm:col-span-2">
            <label className={labelCls}>Semester Name</label>
            <input
              type="text"
              value={addForm.name}
              onChange={(e) => setAddForm({ ...addForm, name: e.target.value })}
              className={inputCls}
              placeholder="e.g. 2026 Semester One"
              required
            />
          </div>
          <div>
            <label className={labelCls}>Start Date</label>
            <input
              type="date"
              value={addForm.startDate}
              onChange={(e) => setAddForm({ ...addForm, startDate: e.target.value })}
              className={inputCls}
            />
          </div>
          <div>
            <label className={labelCls}>End Date</label>
            <input
              type="date"
              value={addForm.endDate}
              onChange={(e) => setAddForm({ ...addForm, endDate: e.target.value })}
              className={inputCls}
            />
          </div>
          <div>
            <label className={labelCls}>Booking Open</label>
            <input
              type="date"
              value={addForm.bookingStart}
              onChange={(e) =>
                setAddForm({ ...addForm, bookingStart: e.target.value })
              }
              className={inputCls}
            />
          </div>
          <div>
            <label className={labelCls}>Booking Close</label>
            <input
              type="date"
              value={addForm.bookingEnd}
              onChange={(e) =>
                setAddForm({ ...addForm, bookingEnd: e.target.value })
              }
              className={inputCls}
            />
          </div>
        </form>
      </Modal>

      <Modal
        isOpen={!!editSemester}
        onClose={() => setEditSemester(null)}
        title={`Edit Semester: ${editSemester?.name || ''}`}
        size="md"
        footer={
          <div className="flex justify-end gap-3">
            <button
              onClick={() => setEditSemester(null)}
              className="px-4 py-2 text-sm font-medium text-stone-700 bg-white border border-stone-300 rounded-lg hover:bg-stone-50 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleEditSubmit}
              disabled={saving}
              className="px-4 py-2 text-sm font-medium text-white bg-clay-600 rounded-lg hover:bg-clay-700 disabled:opacity-50 transition-colors"
            >
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        }
      >
        <form onSubmit={handleEditSubmit} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="sm:col-span-2">
            <label className={labelCls}>Semester Name</label>
            <input
              type="text"
              value={editForm.name}
              onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
              className={inputCls}
              required
            />
          </div>
          <div>
            <label className={labelCls}>Start Date</label>
            <input
              type="date"
              value={editForm.startDate}
              onChange={(e) =>
                setEditForm({ ...editForm, startDate: e.target.value })
              }
              className={inputCls}
            />
          </div>
          <div>
            <label className={labelCls}>End Date</label>
            <input
              type="date"
              value={editForm.endDate}
              onChange={(e) =>
                setEditForm({ ...editForm, endDate: e.target.value })
              }
              className={inputCls}
            />
          </div>
          <div>
            <label className={labelCls}>Booking Open</label>
            <input
              type="date"
              value={editForm.bookingStart}
              onChange={(e) =>
                setEditForm({ ...editForm, bookingStart: e.target.value })
              }
              className={inputCls}
            />
          </div>
          <div>
            <label className={labelCls}>Booking Close</label>
            <input
              type="date"
              value={editForm.bookingEnd}
              onChange={(e) =>
                setEditForm({ ...editForm, bookingEnd: e.target.value })
              }
              className={inputCls}
            />
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        isOpen={!!closeTarget}
        onClose={() => setCloseTarget(null)}
        onConfirm={handleClose}
        title="Close semester?"
        message={`Closing "${closeTarget?.name}" will stop new bookings and mark it as closed. Existing bookings and records remain intact. Continue?`}
        confirmText="Close Semester"
        variant="danger"
      />
    </div>
  );
}