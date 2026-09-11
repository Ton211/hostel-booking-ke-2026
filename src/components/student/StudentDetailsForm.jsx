import { User, Phone, Users, AlertCircle } from 'lucide-react';

function validateKenyanPhone(phone) {
  const cleaned = phone.replace(/[\s\-]/g, '');
  if (/^(?:\+?254|0)[17]\d{8}$/.test(cleaned)) return true;
  return false;
}

function formatPhoneForStorage(phone) {
  const cleaned = phone.replace(/[\s\-]/g, '');
  if (cleaned.startsWith('0')) return '254' + cleaned.slice(1);
  if (cleaned.startsWith('+254')) return cleaned.slice(1);
  return cleaned;
}

function FormField({ label, icon: Icon, error, children }) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
      <div className="relative">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <Icon className="w-5 h-5 text-gray-400" />
        </div>
        {children}
      </div>
      {error && (
        <p className="mt-1 text-xs text-red-500 flex items-center gap-1">
          <AlertCircle className="w-3 h-3" /> {error}
        </p>
      )}
    </div>
  );
}

export default function StudentDetailsForm({ data, onChange, errors }) {
  function handleChange(field, value) {
    onChange({ ...data, [field]: value });
  }

  return (
    <div className="space-y-3">
      <h2 className="text-lg font-semibold text-gray-800">Student Details</h2>
      <p className="text-sm text-gray-500">Fill in your personal information</p>

      <div className="space-y-4 mt-4">
        <FormField label="Full Name" icon={User} error={errors?.fullName}>
          <input
            type="text"
            value={data.fullName || ''}
            onChange={(e) => handleChange('fullName', e.target.value)}
            placeholder="Enter your full name"
            className={`w-full pl-10 pr-4 py-3 rounded-lg border text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition ${
              errors?.fullName ? 'border-red-300 bg-red-50' : 'border-gray-300'
            }`}
          />
        </FormField>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Gender</label>
          <div className="w-full px-4 py-3 rounded-lg border border-gray-200 bg-gray-50 text-sm text-gray-600">
            {data.gender === 'MALE' ? 'Male' : data.gender === 'FEMALE' ? 'Female' : 'Not selected'}
          </div>
        </div>

        <FormField label="Phone Number" icon={Phone} error={errors?.phoneNumber}>
          <input
            type="tel"
            value={data.phoneNumber || ''}
            onChange={(e) => handleChange('phoneNumber', e.target.value)}
            placeholder="07XX XXX XXX"
            className={`w-full pl-10 pr-4 py-3 rounded-lg border text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition ${
              errors?.phoneNumber ? 'border-red-300 bg-red-50' : 'border-gray-300'
            }`}
          />
        </FormField>

        <FormField label="Next of Kin Name" icon={Users} error={errors?.nextOfKinName}>
          <input
            type="text"
            value={data.nextOfKinName || ''}
            onChange={(e) => handleChange('nextOfKinName', e.target.value)}
            placeholder="Next of kin full name"
            className={`w-full pl-10 pr-4 py-3 rounded-lg border text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition ${
              errors?.nextOfKinName ? 'border-red-300 bg-red-50' : 'border-gray-300'
            }`}
          />
        </FormField>

        <FormField label="Next of Kin Phone" icon={Phone} error={errors?.nextOfKinPhone}>
          <input
            type="tel"
            value={data.nextOfKinPhone || ''}
            onChange={(e) => handleChange('nextOfKinPhone', e.target.value)}
            placeholder="07XX XXX XXX"
            className={`w-full pl-10 pr-4 py-3 rounded-lg border text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition ${
              errors?.nextOfKinPhone ? 'border-red-300 bg-red-50' : 'border-gray-300'
            }`}
          />
        </FormField>

        <FormField label="M-Pesa Phone Number" icon={Phone} error={errors?.mpesaPhone}>
          <input
            type="tel"
            value={data.mpesaPhone || ''}
            onChange={(e) => handleChange('mpesaPhone', e.target.value)}
            placeholder="07XX XXX XXX"
            className={`w-full pl-10 pr-4 py-3 rounded-lg border text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition ${
              errors?.mpesaPhone ? 'border-red-300 bg-red-50' : 'border-gray-300'
            }`}
          />
        </FormField>
      </div>
    </div>
  );
}

export function validateStudentDetails(data) {
  const errors = {};

  if (!data.fullName || data.fullName.trim().length < 3) {
    errors.fullName = 'Full name is required (at least 3 characters)';
  }

  if (!data.phoneNumber || !validateKenyanPhone(data.phoneNumber)) {
    errors.phoneNumber = 'Enter a valid Kenyan phone number (07XX or 01XX)';
  }

  if (!data.nextOfKinName || data.nextOfKinName.trim().length < 3) {
    errors.nextOfKinName = 'Next of kin name is required';
  }

  if (!data.nextOfKinPhone || !validateKenyanPhone(data.nextOfKinPhone)) {
    errors.nextOfKinPhone = 'Enter a valid Kenyan phone number';
  }

  if (!data.mpesaPhone || !validateKenyanPhone(data.mpesaPhone)) {
    errors.mpesaPhone = 'Enter a valid M-Pesa phone number';
  }

  return { errors, isValid: Object.keys(errors).length === 0, formatPhoneForStorage };
}
