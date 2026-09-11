import { CheckCircle, Printer, Home, Bed, User, Building2, Hash } from 'lucide-react';

export default function BookingConfirmation({ confirmationData, onBackToHome }) {
  if (!confirmationData) return null;

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6">
      <div className="text-center">
        <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-emerald-100 mb-4">
          <CheckCircle className="w-12 h-12 text-emerald-600" />
        </div>
        <h2 className="text-2xl font-bold text-stone-800">BOOKING CONFIRMED</h2>
        <p className="text-sm text-stone-500 mt-2">Your hostel bed has been booked successfully</p>
      </div>

      <div className="bg-white rounded-xl border border-stone-200 overflow-hidden shadow-sm">
        <div className="bg-emerald-600 px-5 py-3 flex items-center gap-2">
          <Hash className="w-4 h-4 text-emerald-100" />
          <span className="text-white font-semibold text-sm">
            Reference: {confirmationData.bookingReference}
          </span>
        </div>

        <div className="divide-y divide-stone-100">
          <ConfirmRow icon={User} label="Student" value={confirmationData.studentName || 'N/A'} />
          <ConfirmRow icon={User} label="Phone" value={confirmationData.studentPhone || 'N/A'} />
          <ConfirmRow
            icon={Building2}
            label="Accommodation"
            value={confirmationData.accommodationType || 'N/A'}
          />
          <ConfirmRow icon={Bed} label="Room" value={confirmationData.roomName || 'N/A'} />
          <ConfirmRow
            icon={Bed}
            label="Bed"
            value={
              confirmationData.bedName
                ? `${confirmationData.bedName}${confirmationData.bedPosition ? ` (${confirmationData.bedPosition})` : ''}`
                : 'N/A'
            }
          />
          <ConfirmRow
            icon={User}
            label="Amount"
            value={`KSh ${Number(confirmationData.price || 0).toLocaleString()}`}
          />
        </div>
      </div>

      <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
        <p className="text-sm text-amber-800">
          <strong>Payment Status:</strong>{' '}
          {confirmationData.paymentStatus === 'PENDING'
            ? 'Waiting for M-Pesa payment confirmation'
            : confirmationData.paymentStatus === 'PAID'
            ? 'Payment confirmed'
            : confirmationData.paymentStatus || 'Pending'}
        </p>
        {confirmationData.stkPushStatus && (
          <p className="text-xs text-amber-600 mt-2">{confirmationData.stkPushStatus}</p>
        )}
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <button
          onClick={handlePrint}
          className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-white border-2 border-clay-500 text-clay-600 font-semibold rounded-xl hover:bg-clay-50 transition-all duration-200"
        >
          <Printer className="w-5 h-5" />
          Print Confirmation
        </button>
        <button
          onClick={onBackToHome}
          className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-clay-600 text-white font-semibold rounded-xl hover:bg-clay-700 transition-all duration-200"
        >
          <Home className="w-5 h-5" />
          Back to Home
        </button>
      </div>
    </div>
  );
}

function ConfirmRow({ icon: Icon, label, value }) {
  return (
    <div className="flex items-center gap-3 px-5 py-3">
      <Icon className="w-4 h-4 text-stone-400 shrink-0" />
      <span className="text-sm text-stone-500 min-w-[120px]">{label}</span>
      <span className="text-sm font-medium text-stone-800 text-right flex-1">{value}</span>
    </div>
  );
}
