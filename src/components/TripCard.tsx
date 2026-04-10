import { Link } from 'react-router-dom';
import { Trip } from '../types';
import { MapPin, Calendar, Users, ArrowRight, Trash2 } from 'lucide-react';
import { formatCurrency, formatDate } from '../lib/utils';

interface TripCardProps {
  trip: Trip;
  showDelete?: boolean;
  onDelete?: (id: string) => void;
  deleteDisabled?: boolean;
  deleteDisabledMessage?: string;
}

export default function TripCard({ trip, showDelete, onDelete, deleteDisabled, deleteDisabledMessage }: TripCardProps) {
  const handleDelete = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (deleteDisabled) return;
    if (onDelete) onDelete(trip.id);
  };

  return (
    <Link 
      to={`/trip/${trip.id}`}
      className="block bg-white rounded-2xl border border-gray-100 p-6 hover:shadow-lg transition-all duration-300 group relative"
    >
      {showDelete && (
        <div className="absolute top-4 right-4 flex flex-col items-end z-10">
          <button
            onClick={handleDelete}
            disabled={deleteDisabled}
            className="p-2 bg-red-50 text-red-500 rounded-xl hover:bg-red-100 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
            title={deleteDisabled ? deleteDisabledMessage : "Eliminar viaje"}
          >
            <Trash2 className="w-5 h-5" />
          </button>
          {deleteDisabled && deleteDisabledMessage && (
            <span className="text-[8px] text-red-400 mt-1 font-medium bg-white/80 px-1 rounded">{deleteDisabledMessage}</span>
          )}
        </div>
      )}
      <div className="flex justify-between items-start mb-4">
        <div className="flex flex-col space-y-3 flex-1">
          <div className="flex items-center space-x-3">
            <div className="w-2.5 h-2.5 rounded-full bg-blue-600" />
            <span className="font-semibold text-gray-900 truncate">{trip.origin}</span>
          </div>
          <div className="w-0.5 h-4 bg-gray-200 ml-1" />
          <div className="flex items-center space-x-3">
            <div className="w-2.5 h-2.5 rounded-full bg-red-500" />
            <span className="font-semibold text-gray-900 truncate">{trip.destination}</span>
          </div>
        </div>
        <div className="text-right">
          <div className="text-2xl font-bold text-blue-600">{formatCurrency(trip.pricePerSeat)}</div>
          <div className="text-xs text-gray-500 font-medium">por asiento</div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 pt-4 border-t border-gray-50">
        <div className="flex items-center text-gray-600 text-sm">
          <Calendar className="w-4 h-4 mr-2 text-gray-400" />
          {formatDate(trip.departureTime)}
        </div>
        <div className="flex items-center text-gray-600 text-sm justify-end">
          <Users className="w-4 h-4 mr-2 text-gray-400" />
          {trip.availableSeats || 0} disponibles
        </div>
      </div>

      <div className="mt-4 flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center text-xs font-bold text-gray-600">
            {trip.driverName.charAt(0)}
          </div>
          <span className="text-sm text-gray-600 font-medium">{trip.driverName}</span>
        </div>
        <div className="text-blue-600 opacity-0 group-hover:opacity-100 transition-opacity flex items-center text-sm font-bold">
          Ver detalles <ArrowRight className="w-4 h-4 ml-1" />
        </div>
      </div>
    </Link>
  );
}
