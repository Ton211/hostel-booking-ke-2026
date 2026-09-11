import { useEffect, useState } from 'react';
import { Bed, Loader2, ArrowUp, ArrowDown } from 'lucide-react';
import { getBedsByRoom } from '../../services/bedService';

const STATUS_CONFIG = {
  available: { label: 'Available', bg: 'bg-emerald-50', border: 'border-emerald-400', text: 'text-emerald-700', badge: 'bg-emerald-100 text-emerald-700', selectable: true },
  AVAILABLE: { label: 'Available', bg: 'bg-emerald-50', border: 'border-emerald-400', text: 'text-emerald-700', badge: 'bg-emerald-100 text-emerald-700', selectable: true },
  pending: { label: 'Pending', bg: 'bg-amber-50', border: 'border-amber-400', text: 'text-amber-700', badge: 'bg-amber-100 text-amber-700', selectable: false },
  PENDING_PAYMENT: { label: 'Pending', bg: 'bg-amber-50', border: 'border-amber-400', text: 'text-amber-700', badge: 'bg-amber-100 text-amber-700', selectable: false },
  booked: { label: 'Booked', bg: 'bg-red-50', border: 'border-red-400', text: 'text-red-700', badge: 'bg-red-100 text-red-700', selectable: false },
  BOOKED: { label: 'Booked', bg: 'bg-red-50', border: 'border-red-400', text: 'text-red-700', badge: 'bg-red-100 text-red-700', selectable: false },
  blocked: { label: 'Blocked', bg: 'bg-stone-50', border: 'border-stone-300', text: 'text-stone-500', badge: 'bg-stone-100 text-stone-500', selectable: false },
  BLOCKED: { label: 'Blocked', bg: 'bg-stone-50', border: 'border-stone-300', text: 'text-stone-500', badge: 'bg-stone-100 text-stone-500', selectable: false },
};

function getStatusConfig(status) {
  return STATUS_CONFIG[status] || STATUS_CONFIG.blocked;
}

export default function BedSelector({ roomId, selected, onSelect, semesterId }) {
  const [beds, setBeds] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!roomId) {
      setBeds([]);
      setLoading(false);
      return;
    }

    let cancelled = false;

    async function fetchBeds() {
      setLoading(true);
      setError(null);
      try {
        const data = await getBedsByRoom(roomId);
        if (!cancelled) {
          setBeds(data);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err.message);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    fetchBeds();
    return () => { cancelled = true; };
  }, [roomId]);

  if (!roomId) {
    return (
      <div className="space-y-3">
        <h2 className="text-lg font-semibold text-stone-800">Select a Bed</h2>
        <p className="text-sm text-stone-500">Please select a room first</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="space-y-3">
        <h2 className="text-lg font-semibold text-stone-800">Select a Bed</h2>
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-6 h-6 text-clay-600 animate-spin" />
          <span className="ml-2 text-sm text-stone-500">Loading beds...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-3">
        <h2 className="text-lg font-semibold text-stone-800">Select a Bed</h2>
        <div className="text-center py-12 text-red-500 text-sm">
          Failed to load beds: {error}
        </div>
      </div>
    );
  }

  if (beds.length === 0) {
    return (
      <div className="space-y-3">
        <h2 className="text-lg font-semibold text-stone-800">Select a Bed</h2>
        <div className="text-center py-12">
          <Bed className="w-12 h-12 text-stone-300 mx-auto mb-3" />
          <p className="text-stone-500 text-sm">No beds found in this room</p>
        </div>
      </div>
    );
  }

  const upBeds = beds.filter((b) => (b.position || '').toUpperCase() === 'UP');
  const downBeds = beds.filter((b) => (b.position || '').toUpperCase() === 'DOWN');
  const unpositionedBeds = beds.filter(
    (b) => !b.position || (b.position.toUpperCase() !== 'UP' && b.position.toUpperCase() !== 'DOWN')
  );

  function renderBedCard(bed) {
    const config = getStatusConfig(bed.status);
    const isSelected = selected === bed.id;
    const isSelectable = config.selectable;
    const position = (bed.position || '').toUpperCase();

    return (
      <button
        key={bed.id}
        onClick={() => isSelectable && onSelect(bed)}
        disabled={!isSelectable}
        className={`
          relative flex flex-col items-center p-4 rounded-xl border-2 transition-all duration-200 min-w-[120px]
          ${!isSelectable ? `${config.bg} ${config.border} opacity-60 cursor-not-allowed` : ''}
          ${isSelectable && isSelected ? 'border-clay-500 bg-clay-50 ring-4 ring-clay-100 shadow-md' : ''}
          ${isSelectable && !isSelected ? 'border-emerald-300 bg-white hover:border-emerald-400 hover:shadow-sm cursor-pointer' : ''}
        `}
      >
        <div className="flex items-center gap-1 mb-2">
          {position === 'UP' && <ArrowUp className="w-4 h-4 text-clay-500" />}
          {position === 'DOWN' && <ArrowDown className="w-4 h-4 text-clay-500" />}
          <span className="text-xs font-medium text-stone-500 uppercase">{position || 'N/A'}</span>
        </div>
        <Bed
          className={`w-8 h-8 mb-2 ${
            isSelected ? 'text-clay-600' : isSelectable ? 'text-emerald-600' : config.text
          }`}
          strokeWidth={1.5}
        />
        <span className={`text-sm font-semibold ${isSelected ? 'text-clay-700' : 'text-stone-800'}`}>
          Bed {bed.bedNumber || bed.name}
        </span>
        <span className={`text-xs font-medium mt-1 px-2 py-0.5 rounded-full ${config.badge}`}>
          {config.label}
        </span>
        {isSelected && (
          <div className="absolute top-2 right-2 w-5 h-5 rounded-full bg-clay-600 flex items-center justify-center">
            <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
            </svg>
          </div>
        )}
      </button>
    );
  }

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold text-stone-800">Select a Bed</h2>

      <div className="flex flex-wrap gap-2 mb-4">
        <span className="flex items-center gap-1 text-xs">
          <span className="w-3 h-3 rounded-full bg-emerald-400" /> Available
        </span>
        <span className="flex items-center gap-1 text-xs">
          <span className="w-3 h-3 rounded-full bg-amber-400" /> Pending
        </span>
        <span className="flex items-center gap-1 text-xs">
          <span className="w-3 h-3 rounded-full bg-red-400" /> Booked
        </span>
        <span className="flex items-center gap-1 text-xs">
          <span className="w-3 h-3 rounded-full bg-stone-300" /> Blocked
        </span>
      </div>

      {upBeds.length > 0 && (
        <div>
          <h3 className="text-sm font-medium text-stone-600 mb-2 flex items-center gap-1">
            <ArrowUp className="w-4 h-4" /> Upper Bunks
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {upBeds.map(renderBedCard)}
          </div>
        </div>
      )}

      {downBeds.length > 0 && (
        <div>
          <h3 className="text-sm font-medium text-stone-600 mb-2 flex items-center gap-1">
            <ArrowDown className="w-4 h-4" /> Lower Bunks
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {downBeds.map(renderBedCard)}
          </div>
        </div>
      )}

      {unpositionedBeds.length > 0 && (
        <div>
          <h3 className="text-sm font-medium text-stone-600 mb-2 flex items-center gap-1">
            <Bed className="w-4 h-4" /> Beds
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {unpositionedBeds.map(renderBedCard)}
          </div>
        </div>
      )}
    </div>
  );
}
