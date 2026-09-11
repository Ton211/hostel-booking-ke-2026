import { useEffect, useState } from 'react';
import { DoorOpen, Loader2, Users } from 'lucide-react';
import { getRoomsByGender } from '../../services/roomService';
import { getBedsByRoom } from '../../services/bedService';

export default function RoomSelector({ gender, accommodationTypeId, selected, onSelect }) {
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!gender) return;

    let cancelled = false;

    async function fetchRooms() {
      setLoading(true);
      setError(null);
      try {
        const roomsData = await getRoomsByGender(gender);

        const roomsWithAvailability = await Promise.all(
          roomsData.map(async (room) => {
            const beds = await getBedsByRoom(room.id);
            const totalBeds = beds.length;
            const availableBeds = beds.filter(
              (b) => b.status === 'available' || b.status === 'AVAILABLE'
            ).length;
            const blockedBeds = beds.filter(
              (b) => b.status === 'blocked' || b.status === 'BLOCKED'
            ).length;
            const occupiedBeds = totalBeds - availableBeds - blockedBeds;

            return {
              ...room,
              totalBeds,
              availableBeds,
              blockedBeds,
              occupiedBeds,
            };
          })
        );

        if (!cancelled) {
          setRooms(roomsWithAvailability);
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

    fetchRooms();
    return () => { cancelled = true; };
  }, [gender]);

  if (!gender) {
    return (
      <div className="space-y-3">
        <h2 className="text-lg font-semibold text-stone-800">Select a Room</h2>
        <p className="text-sm text-stone-500">Please select your gender first</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="space-y-3">
        <h2 className="text-lg font-semibold text-stone-800">Select a Room</h2>
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-6 h-6 text-clay-600 animate-spin" />
          <span className="ml-2 text-sm text-stone-500">Loading rooms...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-3">
        <h2 className="text-lg font-semibold text-stone-800">Select a Room</h2>
        <div className="text-center py-12 text-red-500 text-sm">
          Failed to load rooms: {error}
        </div>
      </div>
    );
  }

  if (rooms.length === 0) {
    return (
      <div className="space-y-3">
        <h2 className="text-lg font-semibold text-stone-800">Select a Room</h2>
        <div className="text-center py-12">
          <DoorOpen className="w-12 h-12 text-stone-300 mx-auto mb-3" />
          <p className="text-stone-500 text-sm">No rooms available for {gender.toLowerCase()} students</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <h2 className="text-lg font-semibold text-stone-800">Select a Room</h2>
      <p className="text-sm text-stone-500">
        {rooms.filter((r) => r.availableBeds > 0).length} room(s) with available beds
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-4">
        {rooms.map((room) => {
          const isSelected = selected === room.id;
          const isFull = room.availableBeds === 0;
          const isPartiallyFull = room.availableBeds > 0 && room.occupiedBeds > 0;

          return (
            <button
              key={room.id}
              onClick={() => !isFull && onSelect(room)}
              disabled={isFull}
              className={`
                relative flex flex-col p-4 rounded-xl border-2 text-left transition-all duration-200
                ${isFull ? 'border-stone-200 bg-stone-50 opacity-60 cursor-not-allowed' : ''}
                ${!isFull && isSelected ? 'border-clay-500 bg-clay-50 ring-4 ring-clay-100 shadow-md' : ''}
                ${!isFull && !isSelected ? 'border-stone-200 bg-white hover:border-stone-300 hover:shadow-sm cursor-pointer' : ''}
              `}
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <DoorOpen
                    className={`w-5 h-5 ${
                      isSelected ? 'text-clay-600' : isFull ? 'text-stone-400' : 'text-stone-500'
                    }`}
                  />
                  <span className={`font-semibold ${isSelected ? 'text-clay-700' : 'text-stone-800'}`}>
                    {room.name}
                  </span>
                </div>
                <span
                  className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                    isFull
                      ? 'bg-red-100 text-red-700'
                      : isPartiallyFull
                      ? 'bg-amber-100 text-amber-700'
                      : 'bg-emerald-100 text-emerald-700'
                  }`}
                >
                  {isFull ? 'Full' : isPartiallyFull ? 'Partial' : 'Available'}
                </span>
              </div>
              <div className="flex items-center gap-1 text-sm text-stone-500">
                <Users className="w-4 h-4" />
                <span>
                  {room.availableBeds} / {room.totalBeds} beds available
                </span>
              </div>
              {room.hostelId && (
                <p className="text-xs text-stone-400 mt-1">
                  Hostel: {room.hostelId}
                </p>
              )}
              {isSelected && (
                <div className="absolute top-2 right-2 w-5 h-5 rounded-full bg-clay-600 flex items-center justify-center">
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
