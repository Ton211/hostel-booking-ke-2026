import { useEffect, useState } from 'react';
import { Building2, Loader2 } from 'lucide-react';
import { getAllTypes } from '../../services/accommodationService';

export default function AccommodationSelector({ selected, onSelect }) {
  const [types, setTypes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function fetchTypes() {
      try {
        const data = await getAllTypes();
        setTypes(data);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    fetchTypes();
  }, []);

  if (loading) {
    return (
      <div className="space-y-3">
        <h2 className="text-lg font-semibold text-gray-800">Select Accommodation Type</h2>
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-6 h-6 text-indigo-600 animate-spin" />
          <span className="ml-2 text-sm text-gray-500">Loading accommodation types...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-3">
        <h2 className="text-lg font-semibold text-gray-800">Select Accommodation Type</h2>
        <div className="text-center py-12 text-red-500 text-sm">
          Failed to load accommodation types: {error}
        </div>
      </div>
    );
  }

  if (types.length === 0) {
    return (
      <div className="space-y-3">
        <h2 className="text-lg font-semibold text-gray-800">Select Accommodation Type</h2>
        <div className="text-center py-12 text-gray-500 text-sm">
          No accommodation types available at the moment.
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <h2 className="text-lg font-semibold text-gray-800">Select Accommodation Type</h2>
      <p className="text-sm text-gray-500">Choose your preferred accommodation plan</p>
      <div className="grid gap-4 mt-4">
        {types.map((type) => {
          const isSelected = selected === type.id;
          return (
            <button
              key={type.id}
              onClick={() => onSelect(type.id)}
              className={`
                relative flex items-center gap-4 p-5 rounded-xl border-2 text-left transition-all duration-200
                ${
                  isSelected
                    ? 'border-indigo-500 bg-indigo-50 ring-4 ring-indigo-100 shadow-md'
                    : 'border-gray-200 bg-white hover:border-gray-300 hover:shadow-sm'
                }
              `}
            >
              <div
                className={`flex items-center justify-center w-12 h-12 rounded-lg shrink-0 ${
                  isSelected ? 'bg-indigo-100' : 'bg-gray-100'
                }`}
              >
                <Building2
                  className={`w-6 h-6 ${isSelected ? 'text-indigo-600' : 'text-gray-400'}`}
                  strokeWidth={1.5}
                />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <h3 className={`font-semibold ${isSelected ? 'text-indigo-700' : 'text-gray-800'}`}>
                    {type.name}
                  </h3>
                  <span
                    className={`text-lg font-bold shrink-0 ml-3 ${
                      isSelected ? 'text-indigo-600' : 'text-emerald-600'
                    }`}
                  >
                    KSh {Number(type.price).toLocaleString()}
                  </span>
                </div>
                {type.description && (
                  <p className="text-sm text-gray-500 mt-1">{type.description}</p>
                )}
              </div>
              {isSelected && (
                <div className="absolute top-2 right-2 w-5 h-5 rounded-full bg-indigo-600 flex items-center justify-center">
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
