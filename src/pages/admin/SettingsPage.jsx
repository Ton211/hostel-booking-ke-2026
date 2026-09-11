import { useEffect, useState, useCallback } from 'react';
import toast from 'react-hot-toast';
import { Save, ShieldAlert, Download, Building2, CalendarClock, Cog } from 'lucide-react';

import { useAuth } from '../../contexts/AuthContext';
import {
  getAllSettings,
  updateSetting,
} from '../../services/settingsService';
import { getAllSemesters } from '../../services/semesterService';

const INPUT_CLS =
  'w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500';
const LABEL_CLS = 'block text-sm font-medium text-gray-700 mb-1.5';

function saveSection(fields, values, setSaving, reload) {
  return async function handleSave() {
    setSaving(true);
    try {
      for (const key of fields) {
        await updateSetting(key, values[key]);
      }
      toast.success('Settings saved successfully');
      if (reload) reload();
    } catch (err) {
      console.error('Failed to save settings:', err);
      toast.error('Failed to save settings');
    } finally {
      setSaving(false);
    }
  };
}

function SectionHeader({ icon: Icon, title, subtitle }) {
  return (
    <div className="flex items-center gap-3">
      <div className="p-2.5 rounded-lg bg-indigo-100 text-indigo-600">
        <Icon className="w-5 h-5" />
      </div>
      <div>
        <h3 className="text-sm font-semibold text-gray-900">{title}</h3>
        <p className="text-xs text-gray-500">{subtitle}</p>
      </div>
    </div>
  );
}

function SaveButton({ saving }) {
  return (
    <button
      type="submit"
      disabled={saving}
      className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition-colors"
    >
      <Save className="w-4 h-4" />
      {saving ? 'Saving...' : 'Save'}
    </button>
  );
}

export default function SettingsPage() {
  const { userRole } = useAuth();
  const isSuperAdmin = userRole === 'SUPER_ADMIN';

  const [settings, setSettings] = useState({});
  const [semesters, setSemesters] = useState([]);
  const [loading, setLoading] = useState(true);

  const [general, setGeneral] = useState({
    hostelName: '',
    contactPhone: '',
    contactEmail: '',
    logoUrl: '',
  });
  const [booking, setBooking] = useState({
    reservationTimeout: '10',
    currentSemesterId: '',
  });
  const [system, setSystem] = useState({ systemName: '' });

  const [savingGeneral, setSavingGeneral] = useState(false);
  const [savingBooking, setSavingBooking] = useState(false);
  const [savingSystem, setSavingSystem] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [allSettings, semestersList] = await Promise.all([
        getAllSettings(),
        getAllSemesters(),
      ]);
      const map = {};
      allSettings.forEach((s) => {
        map[s.key] = s.value;
      });
      setSettings(map);
      setSemesters(semestersList);

      setGeneral({
        hostelName: map.hostelName || '',
        contactPhone: map.contactPhone || '',
        contactEmail: map.contactEmail || '',
        logoUrl: map.logoUrl || '',
      });
      setBooking({
        reservationTimeout: String(map.reservationTimeout ?? '10'),
        currentSemesterId: map.currentSemesterId || '',
      });
      setSystem({ systemName: map.systemName || '' });
    } catch (err) {
      console.error('Failed to load settings:', err);
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
        <h2 className="mt-4 text-lg font-semibold text-gray-900">
          Access Restricted
        </h2>
        <p className="mt-1 text-sm text-gray-500">
          Only SUPER_ADMIN users can modify system settings.
        </p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-3">
        <div className="w-10 h-10 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" />
        <p className="text-sm text-gray-500">Loading settings...</p>
      </div>
    );
  }

  return (
    <div className="space-y-4 max-w-4xl">
      <div>
        <h2 className="text-xl font-bold text-gray-900">Settings</h2>
        <p className="text-sm text-gray-500">
          Configure system-wide preferences for the hostel portal.
        </p>
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          saveSection(
            ['hostelName', 'contactPhone', 'contactEmail', 'logoUrl'],
            general,
            setSavingGeneral
          )();
        }}
        className="bg-white rounded-xl border border-gray-100 shadow-sm p-6 space-y-4"
      >
        <SectionHeader
          icon={Building2}
          title="General"
          subtitle="Hostel identity and contact details"
        />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className={LABEL_CLS}>Hostel Name</label>
            <input
              type="text"
              value={general.hostelName}
              onChange={(e) =>
                setGeneral({ ...general, hostelName: e.target.value })
              }
              className={INPUT_CLS}
              placeholder="e.g. Bidii Hostel"
            />
          </div>
          <div>
            <label className={LABEL_CLS}>Contact Phone</label>
            <input
              type="tel"
              value={general.contactPhone}
              onChange={(e) =>
                setGeneral({ ...general, contactPhone: e.target.value })
              }
              className={INPUT_CLS}
              placeholder="e.g. 0700 000 000"
            />
          </div>
          <div>
            <label className={LABEL_CLS}>Contact Email</label>
            <input
              type="email"
              value={general.contactEmail}
              onChange={(e) =>
                setGeneral({ ...general, contactEmail: e.target.value })
              }
              className={INPUT_CLS}
              placeholder="admin@hostel.ac.ke"
            />
          </div>
          <div>
            <label className={LABEL_CLS}>Logo URL</label>
            <div className="flex gap-2">
              <input
                type="text"
                value={general.logoUrl}
                onChange={(e) =>
                  setGeneral({ ...general, logoUrl: e.target.value })
                }
                className={INPUT_CLS}
                placeholder="https://..."
              />
              <label
                className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer shrink-0"
                title="Logo upload"
              >
                <Download className="w-4 h-4" />
                Upload
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      const objectUrl = URL.createObjectURL(file);
                      setGeneral({ ...general, logoUrl: objectUrl });
                      toast.success('Logo selected — will be saved as a URL');
                    }
                  }}
                />
              </label>
            </div>
          </div>
        </div>
        <div className="flex justify-end">
          <SaveButton saving={savingGeneral} />
        </div>
      </form>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          saveSection(
            ['reservationTimeout', 'currentSemesterId'],
            booking,
            setSavingBooking
          )();
        }}
        className="bg-white rounded-xl border border-gray-100 shadow-sm p-6 space-y-4"
      >
        <SectionHeader
          icon={CalendarClock}
          title="Booking"
          subtitle="Mid-term break semester and booking behaviour"
        />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className={LABEL_CLS}>Reservation Timeout (minutes)</label>
            <input
              type="number"
              min="1"
              value={booking.reservationTimeout}
              onChange={(e) =>
                setBooking({ ...booking, reservationTimeout: e.target.value })
              }
              className={INPUT_CLS}
            />
            <p className="mt-1 text-xs text-gray-400">
              How long a pending reservation is held before it expires.
            </p>
          </div>
          <div>
            <label className={LABEL_CLS}>Current Semester</label>
            <select
              value={booking.currentSemesterId}
              onChange={(e) =>
                setBooking({ ...booking, currentSemesterId: e.target.value })
              }
              className={INPUT_CLS}
            >
              <option value="">Select semester</option>
              {semesters.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
            <p className="mt-1 text-xs text-gray-400">
              Used by the portal as the default active semester.
            </p>
          </div>
        </div>
        <div className="flex justify-end">
          <SaveButton saving={savingBooking} />
        </div>
      </form>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          saveSection(['systemName'], system, setSavingSystem)();
        }}
        className="bg-white rounded-xl border border-gray-100 shadow-sm p-6 space-y-4"
      >
        <SectionHeader
          icon={Cog}
          title="System"
          subtitle="Branding used across the platform"
        />
        <div>
          <label className={LABEL_CLS}>System Name</label>
          <input
            type="text"
            value={system.systemName}
            onChange={(e) => setSystem({ ...system, systemName: e.target.value })}
            className={INPUT_CLS}
            placeholder="e.g. Hostel Management System"
          />
        </div>
        <div className="flex justify-end">
          <SaveButton saving={savingSystem} />
        </div>
      </form>
    </div>
  );
}