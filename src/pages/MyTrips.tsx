import { useState, useEffect } from 'react';
import { supabase, isSupabaseConfigured } from '../supabase';
import { useAuth } from '../hooks/useAuth';
import { Trip, Booking } from '../types';
import TripCard from '../components/TripCard';
import { Car, Ticket, Clock, CheckCircle, XCircle } from 'lucide-react';
import { formatCurrency, formatDate } from '../lib/utils';
import { cn } from '../lib/utils';
import { motion } from 'motion/react';

export default function MyTrips() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'published' | 'booked'>('published');
  const [publishedTrips, setPublishedTrips] = useState<Trip[]>([]);
  const [bookings, setBookings] = useState<(Booking & { trip?: Trip })[]>([]);
  const [loading, setLoading] = useState(true);
  const [tripToDelete, setTripToDelete] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const fetchData = async () => {
    if (!user || !isSupabaseConfigured) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      // Fetch driver record first
      const { data: driverData } = await supabase
        .from('drivers')
        .select('id')
        .eq('user_id', user.uid)
        .single();

      if (driverData) {
        // Fetch published trips
        const { data: tripsData, error: tripsError } = await supabase
          .from('trips')
          .select('*')
          .eq('driver_id', driverData.id)
          .order('created_at', { ascending: false });

        if (tripsError) throw tripsError;
        setPublishedTrips((tripsData || []).map(t => ({
          id: t.id,
          driverId: t.driver_id,
          origin: t.origin,
          destination: t.destination,
          departureTime: t.departure_time,
          availableSeats: t.available_seats,
          pricePerSeat: t.price_per_seat,
          montoNaftaConductor: t.monto_nafta_conductor,
          comisionPlataforma: t.comision_plataforma,
          precioFinalPasajero: t.precio_final_pasajero,
          distanciaKm: t.distancia_km,
          status: t.status,
          createdAt: t.created_at
        } as Trip)));
      }

      // Fetch bookings
      const { data: bookingsData, error: bookingsError } = await supabase
        .from('bookings')
        .select(`
          *,
          trips (
            *,
            drivers (
              users (
                display_name,
                photo_url
              )
            )
          )
        `)
        .eq('passenger_id', user.uid)
        .order('created_at', { ascending: false });

      if (bookingsError) throw bookingsError;
      
      const formattedBookings = (bookingsData || []).map(b => ({
        id: b.id,
        tripId: b.trip_id,
        passengerId: b.passenger_id,
        passengerName: user.displayName || '',
        seats: b.seats,
        totalPrice: b.total_price,
        status: b.status,
        createdAt: b.created_at,
        trip: b.trips ? {
          id: b.trips.id,
          driverId: b.trips.driver_id,
          driverName: b.trips.drivers?.users?.display_name,
          driverPhoto: b.trips.drivers?.users?.photo_url,
          origin: b.trips.origin,
          destination: b.trips.destination,
          departureTime: b.trips.departure_time,
          availableSeats: b.trips.available_seats,
          pricePerSeat: b.trips.price_per_seat,
          montoNaftaConductor: b.trips.monto_nafta_conductor,
          comisionPlataforma: b.trips.comision_plataforma,
          precioFinalPasajero: b.trips.precio_final_pasajero,
          distanciaKm: b.trips.distancia_km,
          status: b.trips.status,
          createdAt: b.trips.created_at
        } : undefined
      }));
      
      setBookings(formattedBookings);
    } catch (error) {
      console.error('Error fetching user data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [user]);

  const handleDeleteTrip = async () => {
    if (!tripToDelete) return;

    const trip = publishedTrips.find(t => t.id === tripToDelete);
    if (trip) {
      const departureTime = new Date(trip.departureTime).getTime();
      const now = new Date().getTime();
      const hoursUntilDeparture = (departureTime - now) / (1000 * 60 * 60);

      if (hoursUntilDeparture < 24) {
        alert('No podés eliminar un viaje con menos de 24 horas de anticipación por respeto a los pasajeros.');
        setTripToDelete(null);
        return;
      }
    }

    setIsDeleting(true);
    try {
      const { error } = await supabase
        .from('trips')
        .delete()
        .eq('id', tripToDelete);

      if (error) throw error;

      setPublishedTrips(prev => prev.filter(t => t.id !== tripToDelete));
      setTripToDelete(null);
    } catch (error) {
      console.error('Error deleting trip:', error);
      alert('Hubo un error al intentar eliminar el viaje.');
    } finally {
      setIsDeleting(false);
    }
  };

  if (!user) return <div className="text-center py-20">Iniciá sesión para ver tus viajes</div>;

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <h1 className="text-3xl font-bold text-gray-900">Mis Viajes</h1>
        <div className="flex bg-gray-100 p-1 rounded-xl">
          <button
            onClick={() => setActiveTab('published')}
            className={cn(
              "px-6 py-2 rounded-lg font-semibold transition-all",
              activeTab === 'published' ? "bg-white text-blue-600 shadow-sm" : "text-gray-500 hover:text-gray-700"
            )}
          >
            Como conductor
          </button>
          <button
            onClick={() => setActiveTab('booked')}
            className={cn(
              "px-6 py-2 rounded-lg font-semibold transition-all",
              activeTab === 'booked' ? "bg-white text-blue-600 shadow-sm" : "text-gray-500 hover:text-gray-700"
            )}
          >
            Como pasajero
          </button>
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map(i => <div key={i} className="h-48 bg-gray-200 animate-pulse rounded-2xl" />)}
        </div>
      ) : activeTab === 'published' ? (
        publishedTrips.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {publishedTrips.map(trip => {
              const hoursUntilDeparture = (new Date(trip.departureTime).getTime() - new Date().getTime()) / (1000 * 60 * 60);
              const isDeleteDisabled = hoursUntilDeparture < 24;

              return (
                <TripCard 
                  key={trip.id} 
                  trip={trip} 
                  showDelete={true} 
                  onDelete={(id) => setTripToDelete(id)} 
                  deleteDisabled={isDeleteDisabled}
                  deleteDisabledMessage="No se puede eliminar (menos de 24h)"
                />
              );
            })}
          </div>
        ) : (
          <EmptyState icon={<Car className="w-12 h-12" />} title="No publicaste viajes todavía" />
        )
      ) : (
        bookings.length > 0 ? (
          <div className="space-y-4">
            {bookings.map(booking => (
              <div key={booking.id} className="bg-white p-6 rounded-2xl border border-gray-100 flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div className="flex-1 space-y-2">
                  <div className="flex items-center space-x-2 text-sm font-bold text-blue-600 uppercase tracking-wider">
                    <Ticket className="w-4 h-4" />
                    <span>Reserva #{booking.id.slice(-6)}</span>
                  </div>
                  <h3 className="text-xl font-bold text-gray-900">
                    {booking.trip?.origin} → {booking.trip?.destination}
                  </h3>
                  <div className="flex items-center text-gray-500 text-sm">
                    <Clock className="w-4 h-4 mr-2" />
                    {booking.trip ? formatDate(booking.trip.departureTime) : 'Fecha no disponible'}
                  </div>
                </div>
                
                <div className="flex items-center gap-8">
                  <div className="text-right">
                    <div className="text-sm text-gray-500">Asientos: {booking.seats || 0}</div>
                    <div className="text-lg font-bold text-gray-900">{formatCurrency(booking.totalPrice)}</div>
                  </div>
                  <div className={cn(
                    "px-4 py-2 rounded-full text-sm font-bold flex items-center gap-2",
                    booking.status === 'confirmed' ? "bg-green-50 text-green-700" :
                    booking.status === 'pending' ? "bg-yellow-50 text-yellow-700" :
                    "bg-red-50 text-red-700"
                  )}>
                    {booking.status === 'confirmed' ? <CheckCircle className="w-4 h-4" /> : 
                     booking.status === 'pending' ? <Clock className="w-4 h-4" /> : 
                     <XCircle className="w-4 h-4" />}
                    {booking.status.toUpperCase()}
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <EmptyState icon={<Ticket className="w-12 h-12" />} title="No tenés reservas activas" />
        )
      )}

      {/* Delete Confirmation Modal */}
      {tripToDelete && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-3xl p-8 max-w-sm w-full shadow-2xl space-y-6"
          >
            <div className="bg-red-50 w-16 h-16 rounded-2xl flex items-center justify-center mx-auto">
              <XCircle className="w-8 h-8 text-red-500" />
            </div>
            <div className="text-center space-y-2">
              <h3 className="text-xl font-bold text-gray-900">¿Eliminar viaje?</h3>
              <p className="text-gray-500">Esta acción no se puede deshacer y se cancelarán las reservas asociadas.</p>
            </div>
            <div className="flex flex-col gap-3">
              <button
                onClick={handleDeleteTrip}
                disabled={isDeleting}
                className="w-full bg-red-500 text-white py-4 rounded-2xl font-bold hover:bg-red-600 transition-colors disabled:opacity-50"
              >
                {isDeleting ? 'Eliminando...' : 'Sí, eliminar viaje'}
              </button>
              <button
                onClick={() => setTripToDelete(null)}
                disabled={isDeleting}
                className="w-full bg-gray-100 text-gray-600 py-4 rounded-2xl font-bold hover:bg-gray-200 transition-colors"
              >
                Cancelar
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}

function EmptyState({ icon, title }: { icon: React.ReactNode, title: string }) {
  return (
    <div className="text-center py-20 bg-white rounded-3xl border border-dashed border-gray-200">
      <div className="text-gray-300 mx-auto mb-4 flex justify-center">{icon}</div>
      <h3 className="text-xl font-semibold text-gray-900">{title}</h3>
      <p className="text-gray-500 mt-2">¡Empezá a compartir viajes hoy mismo!</p>
    </div>
  );
}
