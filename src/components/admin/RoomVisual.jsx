import { DoorOpen, BedDouble } from 'lucide-react';

const bedClasses = {
  available: 'bg-green-50 border-green-200 hover:border-green-400',
  occupied: 'bg-red-50 border-red-200 hover:border-red-400',
  blocked: 'bg-gray-100 border-gray-200 hover:border-gray-300',
  pending: 'bg-yellow-50 border-yellow-200 hover:border-yellow-400',
};

const bedText = {
  available: 'text-green-700',
  occupied: 'text-red-700',
  blocked: 'text-gray-500',
  pending: 'text-yellow-700',
};

export default function RoomVisual({ room, beds = [], onBedClick }) {
  const occupied = beds.filter((b) => b.status === 'occupied').length;
  const available = beds.filter((b) => b.status === 'available').length;
  const blocked = beds.filter((b) => b.status === 'blocked').length;

  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 bg-gray-50 border-b border-gray-100">
        <div className="flex items-center gap-2">
          <DoorOpen className="w-4 h-4 text-indigo-600" />
          <span className="font-semibold text-gray-900">
            {room.name || room.roomNumber || room.id || 'Room'}
          </span>
          <span
            className={`text-xs font-medium px-2 py-0.5 rounded-full ${
              room.gender === 'male'
                ? 'bg-blue-100 text-blue-700'
                : room.gender === 'female'
                ? 'bg-pink-100 text-pink-700'
                : 'bg-gray-100 text-gray-600'
            }`}
          >
            {room.gender ? room.gender.toUpperCase() : '—'}
          </span>
        </div>
        <div className="flex flex-wrap gap-3 text-xs text-gray-500">
          <span className="text-green-600 font-medium">{available} free</span>
          <span className="text-red-600 font-medium">{occupied} occupied</span>
          {blocked > 0 && (
            <span className="text-gray-500 font-medium">{blocked} blocked</span>
          )}
        </div>
      </div>

      <div className="p-4 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
        {beds.length === 0 && (
          <div className="col-span-full text-sm text-gray-400 py-8 text-center">
            No beds in this room
          </div>
        )}
        {beds.map((bed) => {
          const status = bed.status || 'available';
          const cls = bedClasses[status] || bedClasses.available;
          const txt = bedText[status] || bedText.available;
          const position = bed.position || (bed.bedNumber % 2 === 0 ? 'DOWN' : 'UP');
          return (
            <button
              key={bed.id}
              onClick={() => onBedClick?.(bed)}
              className={`rounded-lg border p-3 text-left transition-colors flex flex-col ${cls}`}
              title={`Bed ${bed.bedNumber} (${position})`}
            >
              <div className="flex items-center justify-between">
                <BedDouble className={`w-4 h-4 ${txt}`} />
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-white/70 text-gray-500">
                  {position}
                </span>
              </div>
              <div className={`mt-2 text-sm font-semibold ${txt}`}>
                Bed {bed.bedNumber}
              </div>
              {bed.studentName && status === 'occupied' && (
                <div className="mt-0.5 text-[11px] text-gray-500 truncate">
                  {bed.studentName}
                </div>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}