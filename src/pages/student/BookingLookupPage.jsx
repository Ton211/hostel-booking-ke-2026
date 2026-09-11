import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Bed,
  Search,
  ArrowLeft,
  Loader2,
  AlertCircle,
  Hash,
  Phone,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { collection, query, where, limit, getDocs } from 'firebase/firestore';
import { db } from '../../firebase/config';
import BookingCard from '../../components/student/BookingCard';

export default function BookingLookupPage() {
  const [reference, setReference] = useState('');
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [booking, setBooking] = useState(null);
  const [searched, setSearched] = useState(false);

  async function handleSearch(e) {
    e.preventDefault();

    const trimmedRef = reference.trim();
    if (!trimmedRef) {
      toast.error('Please enter a booking reference');
      return;
    }

    setLoading(true);
    setError(null);
    setBooking(null);
    setSearched(true);

    try {
      const q = query(
        collection(db, 'bookings'),
        where('bookingReference', '==', trimmedRef),
        limit(1)
      );
      const snapshot = await getDocs(q);

      if (snapshot.empty) {
        const q2 = query(
          collection(db, 'bookings'),
          where('reference', '==', trimmedRef),
          limit(1)
        );
        const snapshot2 = await getDocs(q2);

        if (snapshot2.empty) {
          setError(`No booking found with reference "${trimmedRef}"`);
          return;
        }

        const doc = snapshot2.docs[0];
        const data = { id: doc.id, ...doc.data() };

        if (phone.trim() && data.studentPhone !== phone.trim()) {
          setError('Phone number does not match this booking');
          return;
        }

        setBooking(data);
        return;
      }

      const doc = snapshot.docs[0];
      const data = { id: doc.id, ...doc.data() };

      if (phone.trim() && data.studentPhone !== phone.trim()) {
        setError('Phone number does not match this booking');
        return;
      }

      setBooking(data);
    } catch (err) {
      setError(err.message || 'Failed to search for booking');
      toast.error('Search failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center gap-3">
          <Link to="/" className="p-2 rounded-lg hover:bg-gray-100 transition">
            <ArrowLeft className="w-5 h-5 text-gray-600" />
          </Link>
          <div className="flex items-center gap-2">
            <Bed className="w-5 h-5 text-indigo-600" />
            <span className="font-semibold text-gray-800 text-sm">Check My Booking</span>
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-8">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-indigo-100 mb-4">
            <Search className="w-8 h-8 text-indigo-600" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Find Your Booking</h1>
          <p className="text-sm text-gray-500 mt-2">
            Enter your booking reference to check status and details
          </p>
        </div>

        <form onSubmit={handleSearch} className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 space-y-4 max-w-lg mx-auto">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Booking Reference *
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Hash className="w-5 h-5 text-gray-400" />
              </div>
              <input
                type="text"
                value={reference}
                onChange={(e) => setReference(e.target.value)}
                placeholder="e.g. HOST-2024-ABC12"
                className="w-full pl-10 pr-4 py-3 rounded-lg border border-gray-300 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Phone Number <span className="text-gray-400">(optional verification)</span>
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Phone className="w-5 h-5 text-gray-400" />
              </div>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="Phone number used during booking"
                className="w-full pl-10 pr-4 py-3 rounded-lg border border-gray-300 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-indigo-600 text-white font-semibold rounded-xl hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
          >
            {loading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Searching...
              </>
            ) : (
              <>
                <Search className="w-5 h-5" />
                Check Booking
              </>
            )}
          </button>
        </form>

        {error && searched && !loading && (
          <div className="mt-6 flex items-start gap-3 p-4 bg-red-50 border border-red-200 rounded-xl max-w-lg mx-auto">
            <AlertCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
            <p className="text-sm text-red-700">{error}</p>
          </div>
        )}

        {booking && !loading && (
          <div className="mt-6 max-w-lg mx-auto">
            <BookingCard booking={booking} />
          </div>
        )}

        {searched && !booking && !error && !loading && (
          <div className="mt-6 text-center">
            <p className="text-sm text-gray-500">No booking found.</p>
          </div>
        )}
      </main>
    </div>
  );
}
