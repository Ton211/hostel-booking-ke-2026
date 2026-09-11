const base =
  'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset';

const typeMaps = {
  booking: {
    pending: 'bg-yellow-100 text-yellow-800 ring-yellow-600/20',
    confirmed: 'bg-blue-100 text-blue-800 ring-blue-600/20',
    active: 'bg-green-100 text-green-800 ring-green-600/20',
    cancelled: 'bg-red-100 text-red-800 ring-red-600/20',
    completed: 'bg-gray-100 text-gray-800 ring-gray-600/20',
    expired: 'bg-orange-100 text-orange-800 ring-orange-600/20',
    rejected: 'bg-red-100 text-red-800 ring-red-600/20',
    transferred: 'bg-purple-100 text-purple-800 ring-purple-600/20',
  },
  payment: {
    pending: 'bg-yellow-100 text-yellow-800 ring-yellow-600/20',
    completed: 'bg-green-100 text-green-800 ring-green-600/20',
    failed: 'bg-red-100 text-red-800 ring-red-600/20',
    verified: 'bg-emerald-100 text-emerald-800 ring-emerald-600/20',
    unverified: 'bg-gray-100 text-gray-800 ring-gray-600/20',
    refunded: 'bg-purple-100 text-purple-800 ring-purple-600/20',
  },
  room: {
    available: 'bg-green-100 text-green-800 ring-green-600/20',
    partial: 'bg-yellow-100 text-yellow-800 ring-yellow-600/20',
    full: 'bg-red-100 text-red-800 ring-red-600/20',
    inactive: 'bg-gray-100 text-gray-800 ring-gray-600/20',
  },
  semester: {
    active: 'bg-green-100 text-green-800 ring-green-600/20',
    closed: 'bg-gray-100 text-gray-800 ring-gray-600/20',
    inactive: 'bg-yellow-100 text-yellow-800 ring-yellow-600/20',
  },
  bed: {
    available: 'bg-green-100 text-green-800 ring-green-600/20',
    occupied: 'bg-red-100 text-red-800 ring-red-600/20',
    blocked: 'bg-gray-100 text-gray-800 ring-gray-600/20',
    pending: 'bg-yellow-100 text-yellow-800 ring-yellow-600/20',
  },
  admin: {
    active: 'bg-green-100 text-green-800 ring-green-600/20',
    inactive: 'bg-red-100 text-red-800 ring-red-600/20',
  },
  role: {
    super_admin: 'bg-red-100 text-red-800 ring-red-600/20',
    admin: 'bg-blue-100 text-blue-800 ring-blue-600/20',
    staff: 'bg-green-100 text-green-800 ring-green-600/20',
  },
  record: {
    create: 'bg-green-100 text-green-800 ring-green-600/20',
    update: 'bg-blue-100 text-blue-800 ring-blue-600/20',
    delete: 'bg-red-100 text-red-800 ring-red-600/20',
    login: 'bg-indigo-100 text-indigo-800 ring-indigo-600/20',
    logout: 'bg-gray-100 text-gray-800 ring-gray-600/20',
    transfer: 'bg-purple-100 text-purple-800 ring-purple-600/20',
    cancel: 'bg-orange-100 text-orange-800 ring-orange-600/20',
    block: 'bg-gray-100 text-gray-800 ring-gray-600/20',
    unblock: 'bg-cyan-100 text-cyan-800 ring-cyan-600/20',
    other: 'bg-gray-100 text-gray-800 ring-gray-600/20',
  },
};

export default function StatusBadge({ status, type = 'booking' }) {
  const key = String(status || '').toLowerCase();
  const map = typeMaps[type] || typeMaps.booking;
  const classes = map[key] || map.other || 'bg-gray-100 text-gray-700 ring-gray-600/20';
  const label = key.replace(/_/g, ' ').toUpperCase();
  return (
    <span className={`${base} ${classes}`}>{label || '—'}</span>
  );
}