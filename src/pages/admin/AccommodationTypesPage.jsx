import { useEffect, useState, useCallback } from 'react';
import toast from 'react-hot-toast';
import { Plus, Pencil, Power, Home } from 'lucide-react';

import Modal from '../../components/admin/Modal';
import StatusBadge from '../../components/admin/StatusBadge';
import {
  getAllTypes,
  createType,
  updateType,
} from '../../services/accommodationService';

function fmtMoney(n) {
  return 'KSh ' + Number(n || 0).toLocaleString();
}

const emptyForm = { name: '', price: '', description: '' };

export default function AccommodationTypesPage() {
  const [types, setTypes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [addOpen, setAddOpen] = useState(false);
  const [addForm, setAddForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  const [editType, setEditType] = useState(null);
  const [editForm, setEditForm] = useState(emptyForm);
  const [priceChanged, setPriceChanged] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setTypes(await getAllTypes());
    } catch (err) {
      console.error('Failed to load accommodation types:', err);
      setError('Failed to load accommodation types. Please try again.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  function openEdit(type) {
    setEditType(type);
    setEditForm({
      name: type.name || '',
      price: type.price ?? '',
      description: type.description || '',
    });
    setPriceChanged(false);
  }

  async function handleAdd(e) {
    e.preventDefault();
    if (!addForm.name || addForm.price === '') {
      toast.error('Name and price are required');
      return;
    }
    setSaving(true);
    try {
      await createType({
        name: addForm.name,
        price: Number(addForm.price) || 0,
        description: addForm.description,
      });
      toast.success('Accommodation type created');
      setAddOpen(false);
      setAddForm(emptyForm);
      loadData();
    } catch (err) {
      console.error(err);
      toast.error('Failed to create accommodation type');
    } finally {
      setSaving(false);
    }
  }

  async function handleEdit(e) {
    e.preventDefault();
    if (!editType) return;
    setSaving(true);
    try {
      await updateType(editType.id, {
        name: editForm.name,
        price: Number(editForm.price) || 0,
        description: editForm.description,
      });
      toast.success('Accommodation type updated');
      setEditType(null);
      loadData();
    } catch (err) {
      console.error(err);
      toast.error('Failed to update accommodation type');
    } finally {
      setSaving(false);
    }
  }

  async function handleToggleActive(type) {
    try {
      await updateType(type.id, { isActive: !(type.isActive ?? true) });
      toast.success(
        type.isActive === false
          ? `"${type.name}" activated`
          : `"${type.name}" deactivated`
      );
      loadData();
    } catch (err) {
      console.error(err);
      toast.error('Failed to toggle accommodation type');
    }
  }

  const inputCls =
    'w-full px-3 py-2 text-sm border border-stone-200 rounded-lg focus:ring-2 focus:ring-clay-500 focus:border-clay-500';
  const labelCls = 'block text-sm font-medium text-stone-700 mb-1.5';

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-stone-900">Accommodation Types</h2>
          <p className="text-sm text-stone-500">
            {types.length} types · {types.filter((t) => t.isActive !== false).length} active
          </p>
        </div>
        <button
          onClick={() => setAddOpen(true)}
          className="inline-flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium text-white bg-clay-600 rounded-lg hover:bg-clay-700 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Add Type
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
      ) : loading ? (
        <div className="flex flex-col items-center justify-center py-24 gap-3">
          <div className="w-10 h-10 border-4 border-clay-200 border-t-clay-600 rounded-full animate-spin" />
          <p className="text-sm text-stone-500">Loading accommodation types...</p>
        </div>
      ) : types.length === 0 ? (
        <div className="bg-white rounded-xl border border-stone-100 p-14 text-center text-stone-400">
          No accommodation types yet. Add your first type to get started.
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {types.map((t) => {
            const active = t.isActive !== false;
            return (
              <div
                key={t.id}
                className={`bg-white rounded-xl shadow-sm border p-5 transition-opacity ${
                  active ? 'border-stone-100' : 'border-stone-200 opacity-60'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="p-2.5 rounded-lg bg-clay-100 text-clay-600">
                    <Home className="w-5 h-5" />
                  </div>
                  <StatusBadge
                    status={active ? 'active' : 'inactive'}
                    type="admin"
                  />
                </div>
                <h3 className="mt-4 font-semibold text-stone-900">{t.name}</h3>
                <div className="mt-1 text-2xl font-bold text-clay-600">
                  {fmtMoney(t.price)}
                </div>
                <p className="mt-2 text-sm text-stone-500 min-h-[40px]">
                  {t.description || 'No description provided.'}
                </p>
                <div className="mt-4 flex items-center justify-between">
                  <button
                    onClick={() => openEdit(t)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors"
                  >
                    <Pencil className="w-3.5 h-3.5" />
                    Edit
                  </button>
                  <button
                    onClick={() => handleToggleActive(t)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-stone-600 bg-stone-50 rounded-lg hover:bg-stone-100 transition-colors"
                  >
                    <Power className="w-3.5 h-3.5" />
                    {active ? 'Deactivate' : 'Activate'}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <Modal
        isOpen={addOpen}
        onClose={() => setAddOpen(false)}
        title="Add Accommodation Type"
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
              {saving ? 'Creating...' : 'Create Type'}
            </button>
          </div>
        }
      >
        <form onSubmit={handleAdd} className="space-y-4">
          <div>
            <label className={labelCls}>Name</label>
            <input
              type="text"
              value={addForm.name}
              onChange={(e) => setAddForm({ ...addForm, name: e.target.value })}
              className={inputCls}
              placeholder="e.g. Shared Dormitory"
              required
            />
          </div>
          <div>
            <label className={labelCls}>Price (KSh)</label>
            <input
              type="number"
              min="0"
              value={addForm.price}
              onChange={(e) => setAddForm({ ...addForm, price: e.target.value })}
              className={inputCls}
              placeholder="e.g. 15000"
              required
            />
          </div>
          <div>
            <label className={labelCls}>Description</label>
            <textarea
              value={addForm.description}
              onChange={(e) =>
                setAddForm({ ...addForm, description: e.target.value })
              }
              rows="3"
              className={inputCls}
              placeholder="Optional description"
            />
          </div>
        </form>
      </Modal>

      <Modal
        isOpen={!!editType}
        onClose={() => setEditType(null)}
        title={`Edit: ${editType?.name || ''}`}
        size="md"
        footer={
          <div className="flex justify-end gap-3">
            <button
              onClick={() => setEditType(null)}
              className="px-4 py-2 text-sm font-medium text-stone-700 bg-white border border-stone-300 rounded-lg hover:bg-stone-50 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleEdit}
              disabled={saving}
              className="px-4 py-2 text-sm font-medium text-white bg-clay-600 rounded-lg hover:bg-clay-700 disabled:opacity-50 transition-colors"
            >
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        }
      >
        <form onSubmit={handleEdit} className="space-y-4">
          <div>
            <label className={labelCls}>Name</label>
            <input
              type="text"
              value={editForm.name}
              onChange={(e) => {
                setEditForm({ ...editForm, name: e.target.value });
              }}
              className={inputCls}
              required
            />
          </div>
          <div>
            <label className={labelCls}>Price (KSh)</label>
            <input
              type="number"
              min="0"
              value={editForm.price}
              onChange={(e) => {
                const price = e.target.value;
                setEditForm({ ...editForm, price });
                setPriceChanged(
                  Number(price) !== (editType?.price ?? 0)
                );
              }}
              className={inputCls}
              required
            />
            {priceChanged && (
              <div className="mt-2 flex items-start gap-2 bg-yellow-50 border border-yellow-200 rounded-lg p-3 text-xs text-yellow-800">
                <span className="font-medium">
                  Price change will only apply to new bookings. Existing bookings
                  keep the price they were created with.
                </span>
              </div>
            )}
          </div>
          <div>
            <label className={labelCls}>Description</label>
            <textarea
              value={editForm.description}
              onChange={(e) =>
                setEditForm({ ...editForm, description: e.target.value })
              }
              rows="3"
              className={inputCls}
            />
          </div>
        </form>
      </Modal>
    </div>
  );
}