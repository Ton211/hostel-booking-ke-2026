import { User, Bed, Building2, Calendar, CreditCard } from 'lucide-react';

const STATUS_STYLES = {
  CONFIRMED: 'bg-emerald-100 text-emerald-700',
  confirmed: 'bg-emerald-100 text-emerald-700',
  PENDING_PAYMENT: 'bg-amber-100 text-amber-700',
  pending: 'bg-amber-100 text-amber-700',
  CANCELLED: 'bg-red-100 text-red-700',
  cancelled: 'bg-red-100 text-red-700',
  EXPIRED: 'bg-stone-100 text-stone-600',
  expired: 'bg-stone-100 text-stone-600',
  ACTIVE: 'bg-blue-100 text-blue-700',
  active: 'bg-blue-100 text-blue-700',
};

const PAYMENT_STYLES = {
  PAID: 'bg-emerald-100 text-emerald-700',
  paid: 'bg-emerald-100 text-emerald-700',
  PENDING: 'bg-amber-100 text-amber-700',
  pending: 'bg-amber-100 text-amber-700',
  FAILED: 'bg-red-100 text-red-700',
  failed: 'bg-red-100 text-red-700',
  EXPIRED: 'bg-stone-100 text-stone-600',
  STK_FAILED: 'bg-red-100 text-red-700',
};

function formatStatus(status) {
  if (!status) return 'Unknown';
  return status.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());
}

function formatDate(timestamp) {
  if (!timestamp) return 'N/A';
  try {
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleDateString('en-KE', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return 'N/A';
  }
}

export default function BookingCard({ booking }) {
  if (!booking) return null;

  return (
    <div className="bg-white rounded-xl border border-stone-200 shadow-sm overflow-hidden">
      <div className="px-5 py-4 border-b border-stone-100">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <User className="w-5 h-5 text-clay-500" />
            <span className="font-semibold text-stone-800">{booking.studentName || 'N/A'}</span>
          </div>
          <span
            className={`text-xs font-semibold px-2.5 py-1 rounded-full ${
              STATUS_STYLES[booking.bookingStatus || booking.status] || 'bg-stone-100 text-stone-600'
            }`}
          >
            {formatStatus(booking.bookingStatus || booking.status)}
          </span>
        </div>
        {booking.reference && (
          <p className="text-xs text-stone-400 mt-1">Ref: {booking.reference}</p>
        )}
        {booking.bookingReference && (
          <p className="text-xs text-stone-400 mt-1">Ref: {booking.bookingReference}</p>
        )}
      </div>

      <div className="px-5 py-3 divide-y divide-stone-50">
        <DetailRow icon={Building2} label="Accommodation" value={booking.accommodationTypeName || booking.accommodationTypeId || 'N/A'} />
        <DetailRow icon={Bed} label="Room" value={booking.roomName || booking.roomId || 'N/A'} />
        <DetailRow
          icon={Bed}
          label="Bed"
          value={
            booking.bedName
              ? `${booking.bedName}${booking.bedPosition ? ` (${booking.bedPosition})` : ''}`
              : booking.bedId || 'N/A'
          }
        />
        {booking.semester && (
          <DetailRow icon={Calendar} label="Semester" value={booking.semester} />
        )}
        {booking.semesterId && !booking.semester && (
          <DetailRow icon={Calendar} label="Semester" value={booking.semesterId} />
        )}
      </div>

      <div className="px-5 py-3 bg-stone-50 border-t border-stone-100 flex items-center justify-between">
        <div className="flex items-center gap-1">
          <CreditCard className="w-4 h-4 text-stone-400" />
          <span className="text-xs text-stone-500">Payment:</span>
          <span
            className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
              PAYMENT_STYLES[booking.paymentStatus] || 'bg-stone-100 text-stone-600'
            }`}
          >
            {formatStatus(booking.paymentStatus)}
          </span>
        </div>
        {booking.price != null && (
          <span className="text-sm font-bold text-emerald-600">
            KSh {Number(booking.price).toLocaleString()}
          </span>
        )}
      </div>

      {booking.mpesaReceipt && (
        <div className="px-5 py-2 bg-stone-50 border-t border-stone-100">
          <p className="text-xs text-stone-500">
            M-Pesa Receipt: <span className="font-mono text-stone-700">{booking.mpesaReceipt}</span>
          </p>
        </div>
      )}

      <div className="px-5 py-2 bg-stone-50 border-t border-stone-100">
        <p className="text-xs text-stone-400">
          Booked: {formatDate(booking.createdAt)}
        </p>
      </div>
    </div>
  );
}

function DetailRow({ icon: Icon, label, value }) {
  return (
    <div className="flex items-center gap-2 py-2">
      <Icon className="w-4 h-4 text-stone-400 shrink-0" />
      <span className="text-xs text-stone-500 min-w-[90px]">{label}</span>
      <span className="text-sm font-medium text-stone-700">{value}</span>
    </div>
  );
}
