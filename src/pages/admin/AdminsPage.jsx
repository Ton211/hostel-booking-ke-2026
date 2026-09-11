import { useEffect, useState, useCallback } from 'react';
import toast from 'react-hot-toast';
import { Plus, Pencil, Power, ShieldAlert } from 'lucide-react';

import DataTable from '../../components/admin/DataTable';
import Modal from '../../components/admin/Modal';
import ConfirmDialog from '../../components/admin/ConfirmDialog';
import StatusBadge from '../../components/admin/StatusBadge';
import { useAuth } from '../../contexts/AuthContext';
import {
  getAdmins,
  createAdmin,
  updateAdmin,
  setAdminRole,
} from '../../services/adminService';

const emptyForm = { displayName: '', email: '', password: '', role: 'ADMIN' };

export default function AdminsPage() {
  const { currentUser, userRole } = useAuth();
  const isSuperAdmin = userRole === 'SUPER_ADMIN';

  const [admins, setAdmins] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [addOpen, setAddOpen] = useState(false);
  const [addForm, setAddForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  const [editAdmin, setEditAdmin] = useState(null);
  const [editRole, setEditRole] = useState('');
  const [deactivateTarget, setDeactivateTarget] = useState(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setAdmins(await getAdmins());
    } catch (err) {
      console.error('Failed to load admins:', err);
      setError('Failed to load admins. Please try again.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  if (!isSuperAdmin) {
    return (
      <div className="bg-white rounded-xl border border-red-100 p-14 text-center">
        <ShieldAlert className="w-12 h-12 text-red-400 mx-auto" />
        <h2 className="mt-4 text-lg font-semibold text-stone-900">
          Access Restricted
        </h2>
        <p className="mt-1 text-sm text-stone-500">
          Only SUPER_ADMIN users can manage administrator accounts.
        </p>
      </div>
    );
  }

  async function handleAdd(e) {
    e.preventDefault();
    if (!addForm.displayName || !addForm.email || !addForm.password) {
      toast.error('Name, email and password are required');
      return;
    }
    setSaving(true);
    try {
      await createAdmin({
        email: addForm.email,
        password: addForm.password,
        displayName: addForm.displayName,
        role: addForm.role,
      });
      toast.success('Admin account created');
      setAddOpen(false);
      setAddForm(emptyForm);
      loadData();
    } catch (err) {
      console.error(err);
      toast.error(err.message || 'Failed to create admin');
    } finally {
      setSaving(false);
    }
  }

  function openEdit(admin) {
    setEditAdmin(admin);
    setEditRole(admin.role || 'ADMIN');
  }

  async function handleEditSave() {
    if (!editAdmin) return;
    setSaving(true);
    try {
      if (editRole !== editAdmin.role) {
        await setAdminRole(editAdmin.uid, editRole);
      }
      toast.success('Admin role updated');
      setEditAdmin(null);
      loadData();
    } catch (err) {
      console.error(err);
      toast.error('Failed to update admin');
    } finally {
      setSaving(false);
    }
  }

  async function handleDeactivate() {
    if (!deactivateTarget) return;
    try {
      await updateAdmin(deactivateTarget.uid, {
        isActive: false,
      });
      toast.success(`${deactivateTarget.displayName} deactivated`);
      setDeactivateTarget(null);
      loadData();
    } catch (err) {
      console.error(err);
      toast.error('Failed to deactivate admin');
    }
  }

  const columns = [
    {
      key: 'displayName',
      label: 'Name',
      render: (a) => (
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-clay-100 text-clay-600 flex items-center justify-center text-xs font-bold uppercase">
            {(a.displayName || '?').charAt(0)}
          </div>
          <div>
            <div className="font-medium text-stone-900">
              {a.displayName || 'N/A'}
              {currentUser?.uid === a.uid && (
                <span className="ml-2 text-[10px] font-semibold text-clay-600 bg-clay-50 px-1.5 py-0.5 rounded-full">
                  You
                </span>
              )}
            </div>
            <div className="text-xs text-stone-400">{a.uid}</div>
          </div>
        </div>
      ),
    },
    { key: 'email', label: 'Email', render: (a) => a.email || 'N/A' },
    {
      key: 'role',
      label: 'Role',
      sortable: true,
      render: (a) => <StatusBadge status={a.role} type="role" />,
    },
    {
      key: 'status',
      label: 'Status',
      sortable: true,
      render: (a) => (
        <StatusBadge status={a.isActive === false ? 'inactive' : 'active'} type="admin" />
      ),
    },
    {
      key: 'actions',
      label: 'Actions',
      sortable: false,
      render: (a) =>
        currentUser?.uid === a.uid ? (
          <span className="text-xs text-stone-400">·</span>
        ) : (
          <div className="flex items-center gap-1.5">
            <button
              onClick={(e) => {
                e.stopPropagation();
                openEdit(a);
              }}
              className="p-1.5 rounded-lg text-stone-500 hover:text-blue-600 hover:bg-blue-50 transition-colors"
              title="Change role"
            >
              <Pencil className="w-4 h-4" />
            </button>
            {a.isActive !== false && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setDeactivateTarget(a);
                }}
                className="p-1.5 rounded-lg text-stone-500 hover:text-red-600 hover:bg-red-50 transition-colors"
                title="Deactivate"
              >
                <Power className="w-4 h-4" />
              </button>
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
          <h2 className="text-xl font-bold text-stone-900">Admins</h2>
          <p className="text-sm text-stone-500">
            {admins.length} administrator accounts
          </p>
        </div>
        <button
          onClick={() => setAddOpen(true)}
          className="inline-flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium text-white bg-clay-600 rounded-lg hover:bg-clay-700 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Add Admin
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
          data={admins}
          loading={loading}
          emptyMessage="No admins found"
          pageSize={10}
        />
      )}

      <Modal
        isOpen={addOpen}
        onClose={() => setAddOpen(false)}
        title="Add Admin"
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
              {saving ? 'Creating...' : 'Create Admin'}
            </button>
          </div>
        }
      >
        <form onSubmit={handleAdd} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="sm:col-span-2">
            <label className={labelCls}>Full Name</label>
            <input
              type="text"
              value={addForm.displayName}
              onChange={(e) =>
                setAddForm({ ...addForm, displayName: e.target.value })
              }
              className={inputCls}
              required
            />
          </div>
          <div>
            <label className={labelCls}>Email</label>
            <input
              type="email"
              value={addForm.email}
              onChange={(e) => setAddForm({ ...addForm, email: e.target.value })}
              className={inputCls}
              required
            />
          </div>
          <div>
            <label className={labelCls}>Password</label>
            <input
              type="password"
              value={addForm.password}
              onChange={(e) =>
                setAddForm({ ...addForm, password: e.target.value })
              }
              className={inputCls}
              required
              minLength={6}
            />
          </div>
          <div className="sm:col-span-2">
            <label className={labelCls}>Role</label>
            <select
              value={addForm.role}
              onChange={(e) => setAddForm({ ...addForm, role: e.target.value })}
              className={inputCls}
            >
              <option value="ADMIN">ADMIN</option>
              <option value="STAFF">STAFF</option>
              <option value="SUPER_ADMIN">SUPER_ADMIN</option>
            </select>
          </div>
        </form>
      </Modal>

      <Modal
        isOpen={!!editAdmin}
        onClose={() => setEditAdmin(null)}
        title={`Edit: ${editAdmin?.displayName || ''}`}
        size="sm"
        footer={
          <div className="flex justify-end gap-3">
            <button
              onClick={() => setEditAdmin(null)}
              className="px-4 py-2 text-sm font-medium text-stone-700 bg-white border border-stone-300 rounded-lg hover:bg-stone-50 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleEditSave}
              disabled={saving}
              className="px-4 py-2 text-sm font-medium text-white bg-clay-600 rounded-lg hover:bg-clay-700 disabled:opacity-50 transition-colors"
            >
              {saving ? 'Saving...' : 'Save Role'}
            </button>
          </div>
        }
      >
        <div className="space-y-4">
          <div className="bg-stone-50 rounded-lg p-3 text-sm">
            <div className="text-xs text-stone-500">Account</div>
            <div className="font-medium text-stone-900">
              {editAdmin?.displayName}
              {editAdmin?.email ? ` · ${editAdmin.email}` : ''}
            </div>
          </div>
          <div>
            <label className={labelCls}>Role</label>
            <select
              value={editRole}
              onChange={(e) => setEditRole(e.target.value)}
              className={inputCls}
            >
              <option value="ADMIN">ADMIN</option>
              <option value="STAFF">STAFF</option>
              <option value="SUPER_ADMIN">SUPER_ADMIN</option>
            </select>
          </div>
        </div>
      </Modal>

      <ConfirmDialog
        isOpen={!!deactivateTarget}
        onClose={() => setDeactivateTarget(null)}
        onConfirm={handleDeactivate}
        title="Deactivate admin?"
        message={`"${deactivateTarget?.displayName}" will no longer be able to sign in to the admin console. Continue?`}
        confirmText="Deactivate"
        variant="danger"
      />
    </div>
  );
}