import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Bed,
  Search,
  ArrowRight,
  CheckCircle,
  CreditCard,
  ClipboardCheck,
  Phone,
  Mail,
  MapPin,
  Building2,
  Loader2,
} from 'lucide-react';
import { getAllTypes } from '../../services/accommodationService';

export default function HomePage() {
  const [accommodations, setAccommodations] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchAccommodations() {
      try {
        const data = await getAllTypes();
        setAccommodations(data);
      } catch {
        setAccommodations([]);
      } finally {
        setLoading(false);
      }
    }
    fetchAccommodations();
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-b from-indigo-50 to-white">
      <header className="bg-indigo-600 text-white">
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Bed className="w-6 h-6" />
            <span className="font-bold text-lg">Hostel Booking</span>
          </div>
          <Link
            to="/check-booking"
            className="text-sm text-indigo-200 hover:text-white transition"
          >
            Check Booking
          </Link>
        </div>
      </header>

      <section className="max-w-5xl mx-auto px-4 py-16 sm:py-24 text-center">
        <h1 className="text-4xl sm:text-5xl font-extrabold text-gray-900 tracking-tight">
          HOSTEL <span className="text-indigo-600">BOOKING</span>
        </h1>
        <p className="mt-4 text-lg text-gray-600 max-w-xl mx-auto">
          Book your hostel bed quickly and securely. Select your room, pay via M-Pesa, and get instant confirmation.
        </p>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mt-8">
          <Link
            to="/book"
            className="inline-flex items-center gap-2 px-8 py-3.5 bg-indigo-600 text-white font-semibold rounded-xl hover:bg-indigo-700 shadow-lg shadow-indigo-200 transition-all duration-200"
          >
            <Bed className="w-5 h-5" />
            Book a Bed
            <ArrowRight className="w-4 h-4" />
          </Link>
          <Link
            to="/check-booking"
            className="inline-flex items-center gap-2 px-8 py-3.5 bg-white text-indigo-600 font-semibold rounded-xl border-2 border-indigo-200 hover:border-indigo-400 hover:bg-indigo-50 transition-all duration-200"
          >
            <Search className="w-5 h-5" />
            Check My Booking
          </Link>
        </div>
      </section>

      <section className="max-w-5xl mx-auto px-4 pb-16">
        <h2 className="text-2xl font-bold text-gray-900 text-center mb-8">
          Accommodation Types & Pricing
        </h2>
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-6 h-6 text-indigo-600 animate-spin" />
          </div>
        ) : accommodations.length === 0 ? (
          <p className="text-center text-gray-500 py-12">No accommodation types available yet.</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {accommodations.map((acc) => (
              <div
                key={acc.id}
                className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 hover:shadow-md transition"
              >
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-lg bg-indigo-100 flex items-center justify-center">
                    <Building2 className="w-5 h-5 text-indigo-600" />
                  </div>
                  <h3 className="font-semibold text-gray-800">{acc.name}</h3>
                </div>
                {acc.description && (
                  <p className="text-sm text-gray-500 mb-4">{acc.description}</p>
                )}
                <div className="text-2xl font-bold text-emerald-600">
                  KSh {Number(acc.price).toLocaleString()}
                </div>
                <p className="text-xs text-gray-400 mt-1">per semester</p>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="bg-white border-y border-gray-200">
        <div className="max-w-5xl mx-auto px-4 py-16">
          <h2 className="text-2xl font-bold text-gray-900 text-center mb-10">
            How It Works
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-8">
            <StepCard
              step={1}
              icon={ClipboardCheck}
              title="Choose"
              description="Select your gender, accommodation type, and pick a room and bed."
            />
            <StepCard
              step={2}
              icon={CreditCard}
              title="Pay"
              description="Review your booking details and pay instantly via M-Pesa."
            />
            <StepCard
              step={3}
              icon={CheckCircle}
              title="Confirm"
              description="Get instant booking confirmation with your unique reference number."
            />
          </div>
        </div>
      </section>

      <section className="max-w-5xl mx-auto px-4 py-16">
        <h2 className="text-2xl font-bold text-gray-900 text-center mb-8">
          Contact Us
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 max-w-3xl mx-auto">
          <div className="flex flex-col items-center gap-2 p-4">
            <div className="w-12 h-12 rounded-full bg-indigo-100 flex items-center justify-center">
              <Phone className="w-5 h-5 text-indigo-600" />
            </div>
            <span className="text-sm font-medium text-gray-700">Phone</span>
            <span className="text-sm text-gray-500">+254 700 000 000</span>
          </div>
          <div className="flex flex-col items-center gap-2 p-4">
            <div className="w-12 h-12 rounded-full bg-indigo-100 flex items-center justify-center">
              <Mail className="w-5 h-5 text-indigo-600" />
            </div>
            <span className="text-sm font-medium text-gray-700">Email</span>
            <span className="text-sm text-gray-500">hostels@university.ac.ke</span>
          </div>
          <div className="flex flex-col items-center gap-2 p-4">
            <div className="w-12 h-12 rounded-full bg-indigo-100 flex items-center justify-center">
              <MapPin className="w-5 h-5 text-indigo-600" />
            </div>
            <span className="text-sm font-medium text-gray-700">Location</span>
            <span className="text-sm text-gray-500">Student Affairs Office</span>
          </div>
        </div>
      </section>

      <footer className="bg-gray-900 text-gray-400 py-6">
        <div className="max-w-5xl mx-auto px-4 text-center">
          <div className="flex items-center justify-center gap-2 mb-2">
            <Bed className="w-5 h-5 text-indigo-400" />
            <span className="font-semibold text-white">Hostel Management System</span>
          </div>
          <p className="text-xs">&copy; {new Date().getFullYear()} Hostel Booking System. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}

function StepCard({ step, icon: Icon, title, description }) {
  return (
    <div className="text-center">
      <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-indigo-100 mb-4">
        <Icon className="w-7 h-7 text-indigo-600" />
      </div>
      <div className="text-xs font-bold text-indigo-400 mb-1">Step {step}</div>
      <h3 className="font-semibold text-gray-800 mb-2">{title}</h3>
      <p className="text-sm text-gray-500">{description}</p>
    </div>
  );
}
