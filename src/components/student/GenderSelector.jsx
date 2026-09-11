import { User, UserRound } from 'lucide-react';

export default function GenderSelector({ selected, onSelect }) {
  const options = [
    {
      value: 'MALE',
      label: 'Male',
      icon: User,
      color: 'blue',
      bg: 'bg-blue-50',
      border: 'border-blue-500',
      ring: 'ring-blue-100',
      text: 'text-blue-600',
      iconBg: 'bg-blue-100',
    },
    {
      value: 'FEMALE',
      label: 'Female',
      icon: UserRound,
      color: 'rose',
      bg: 'bg-rose-50',
      border: 'border-rose-500',
      ring: 'ring-rose-100',
      text: 'text-rose-600',
      iconBg: 'bg-rose-100',
    },
  ];

  return (
    <div className="space-y-3">
      <h2 className="text-lg font-semibold text-gray-800">Select Your Gender</h2>
      <p className="text-sm text-gray-500">Choose your gender to see available rooms</p>
      <div className="grid grid-cols-2 gap-4 mt-4">
        {options.map(({ value, label, icon: Icon, bg, border, ring, text, iconBg }) => {
          const isSelected = selected === value;
          return (
            <button
              key={value}
              onClick={() => onSelect(value)}
              className={`
                relative flex flex-col items-center gap-3 p-6 sm:p-8 rounded-xl border-2 transition-all duration-200
                ${
                  isSelected
                    ? `${border} ${bg} ring-4 ${ring} shadow-md`
                    : 'border-gray-200 bg-white hover:border-gray-300 hover:shadow-sm'
                }
              `}
            >
              <div
                className={`flex items-center justify-center w-16 h-16 rounded-full ${
                  isSelected ? iconBg : 'bg-gray-100'
                }`}
              >
                <Icon
                  className={`w-8 h-8 ${isSelected ? text : 'text-gray-400'}`}
                  strokeWidth={1.5}
                />
              </div>
              <span
                className={`text-base font-semibold ${
                  isSelected ? text : 'text-gray-600'
                }`}
              >
                {label}
              </span>
              {isSelected && (
                <div
                  className={`absolute top-2 right-2 w-5 h-5 rounded-full ${border.replace('border-', 'bg-')} flex items-center justify-center`}
                >
                  <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
