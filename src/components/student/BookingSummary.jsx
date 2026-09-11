import { CreditCard, Loader2, User, Bed, Building2, Calendar, AlertCircle } from 'lucide-react';

export default function BookingSummary({ bookingData, onPay, loading, error }) {
  if (!bookingData) return null;

  const {
    gender,
    accommodationType,
    room,
    bed,
    details,
  } = bookingData;

  const position = (bed?.position || '').toUpperCase();

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold text-stone-800">Booking Summary</h2>
      <p className="text-sm text-stone-500">Review your booking details before payment</p>

      <div className="bg-white rounded-xl border border-stone-200 overflow-hidden shadow-sm">
        <div className="bg-clay-600 px-5 py-3">
          <h3 className="text-white font-semibold text-sm">Booking Details</h3>
        </div>

        <div className="divide-y divide-stone-100">
          <SummaryRow
            icon={User}
            label="Student Name"
            value={details?.fullName || 'N/A'}
          />
          <SummaryRow
            icon={User}
            label="Gender"
            value={gender === 'MALE' ? 'Male' : 'Female'}
          />
          <SummaryRow
            icon={User}
            label="Phone Number"
            value={details?.phoneNumber || 'N/A'}
          />
          <SummaryRow
            icon={Building2}
            label="Accommodation Type"
            value={accommodationType?.name || 'N/A'}
          />
          <SummaryRow
            icon={Bed}
            label="Room"
            value={room?.name || 'N/A'}
          />
          <SummaryRow
            icon={Bed}
            label="Bed"
            value={`Bed ${bed?.bedNumber || bed?.name || 'N/A'}${position ? ` (${position})` : ''}`}
          />
          <SummaryRow
            icon={User}
            label="Next of Kin"
            value={details?.nextOfKinName || 'N/A'}
          />
          <SummaryRow
            icon={User}
            label="Next of Kin Phone"
            value={details?.nextOfKinPhone || 'N/A'}
          />
          <SummaryRow
            icon={CreditCard}
            label="M-Pesa Phone"
            value={details?.mpesaPhone || 'N/A'}
          />
        </div>

        <div className="bg-stone-50 px-5 py-4 border-t border-stone-200">
          <div className="flex items-center justify-between">
            <span className="text-sm text-stone-600">Amount to Pay</span>
            <span className="text-xl font-bold text-emerald-600">
              KSh {Number(accommodationType?.price || 0).toLocaleString()}
            </span>
          </div>
        </div>
      </div>

      {error && (
        <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
          <AlertCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      <button
        onClick={onPay}
        disabled={loading}
        className="w-full flex items-center justify-center gap-2 px-6 py-3.5 bg-clay-600 text-white font-semibold rounded-xl hover:bg-clay-700 focus:ring-4 focus:ring-clay-100 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
      >
        {loading ? (
          <>
            <Loader2 className="w-5 h-5 animate-spin" />
            Processing Payment...
          </>
        ) : (
          <>
            <CreditCard className="w-5 h-5" />
            Proceed to Payment
          </>
        )}
      </button>

      <p className="text-xs text-center text-stone-400">
        You will receive an M-Pesa prompt on {details?.mpesaPhone || 'your phone'} to complete payment
      </p>
    </div>
  );
}

function SummaryRow({ icon: Icon, label, value }) {
  return (
    <div className="flex items-center gap-3 px-5 py-3">
      <Icon className="w-4 h-4 text-stone-400 shrink-0" />
      <span className="text-sm text-stone-500 min-w-[120px]">{label}</span>
      <span className="text-sm font-medium text-stone-800 text-right flex-1">{value}</span>
    </div>
  );
}
