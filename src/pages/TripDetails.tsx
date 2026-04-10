import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase, isSupabaseConfigured } from '../supabase';
import { Trip, User, Booking } from '../types';
import { useAuth } from '../hooks/useAuth';
import { MapPin, Calendar, Clock, Users, DollarSign, User as UserIcon, ShieldCheck, ArrowLeft, MessageCircle, Navigation, Trash2, XCircle } from 'lucide-react';
import { formatCurrency, formatDate } from '../lib/utils';
import { motion } from 'motion/react';
import { useGoogleMaps } from '../components/GoogleMapsProvider';
import { useRef } from 'react';

declare global {
  interface Window {
    MercadoPago: any;
    google: any;
  }
}

export default function TripDetails() {
  const { id } = useParams();
  const { user } = useAuth();
  const isMapsLoaded = useGoogleMaps();
  const navigate = useNavigate();
  const mapRef = useRef<HTMLDivElement>(null);
  const [trip, setTrip] = useState<Trip | null>(null);
  const [driver, setDriver] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [bookingLoading, setBookingLoading] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [seatsToBook, setSeatsToBook] = useState(1);

  useEffect(() => {
    const fetchTrip = async () => {
      if (!id || !isSupabaseConfigured) {
        setLoading(false);
        return;
      }
      try {
        const { data, error } = await supabase
          .from('trips')
          .select(`
            *,
            drivers (
              user_id,
              users (
                display_name,
                photo_url,
                bio
              )
            )
          `)
          .eq('id', id)
          .single();

        if (error) throw error;

        if (data) {
          const tripData: Trip = {
            id: data.id,
            driverId: data.drivers?.user_id || '',
            driverName: data.drivers?.users?.display_name || 'Conductor',
            driverPhoto: data.drivers?.users?.photo_url,
            driverBio: data.drivers?.users?.bio,
            origin: data.origin,
            destination: data.destination,
            originCoords: data.origin_coords,
            destinationCoords: data.destination_coords,
            departureTime: data.departure_time,
            availableSeats: data.available_seats,
            pricePerSeat: data.price_per_seat,
            montoNaftaConductor: data.monto_nafta_conductor,
            comisionPlataforma: data.comision_plataforma,
            precioFinalPasajero: data.precio_final_pasajero,
            distanciaKm: data.distancia_km,
            description: data.description,
            status: data.status,
            createdAt: data.created_at
          };
          setTrip(tripData);
        }
      } catch (error) {
        console.error('Error fetching trip:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchTrip();
  }, [id]);

  useEffect(() => {
    if (isMapsLoaded && trip && mapRef.current) {
      const map = new window.google.maps.Map(mapRef.current, {
        center: { lat: -34.6037, lng: -58.3816 }, // Default to BA
        zoom: 6,
        disableDefaultUI: true,
        zoomControl: true,
        styles: [
          {
            "featureType": "administrative",
            "elementType": "geometry",
            "stylers": [{ "visibility": "off" }]
          },
          {
            "featureType": "poi",
            "stylers": [{ "visibility": "off" }]
          },
          {
            "featureType": "road",
            "elementType": "labels.icon",
            "stylers": [{ "visibility": "off" }]
          },
          {
            "featureType": "transit",
            "stylers": [{ "visibility": "off" }]
          }
        ]
      });

      const directionsService = new window.google.maps.DirectionsService();
      const directionsRenderer = new window.google.maps.DirectionsRenderer({
        map,
        suppressMarkers: false,
        polylineOptions: {
          strokeColor: '#2563eb',
          strokeWeight: 5
        }
      });

      directionsService.route(
        {
          origin: trip.origin,
          destination: trip.destination,
          travelMode: window.google.maps.TravelMode.DRIVING,
        },
        (result: any, status: any) => {
          if (status === 'OK') {
            directionsRenderer.setDirections(result);
          }
        }
      );
    }
  }, [isMapsLoaded, trip]);

  const handleDelete = async () => {
    if (!id || !trip) return;
    
    const departureTime = new Date(trip.departureTime).getTime();
    const now = new Date().getTime();
    const hoursUntilDeparture = (departureTime - now) / (1000 * 60 * 60);

    if (hoursUntilDeparture < 24) {
      alert('No podés eliminar un viaje con menos de 24 horas de anticipación por respeto a los pasajeros.');
      setShowDeleteConfirm(false);
      return;
    }

    setDeleteLoading(true);
    try {
      const { error } = await supabase
        .from('trips')
        .delete()
        .eq('id', id);

      if (error) throw error;
      navigate('/my-trips');
    } catch (error) {
      console.error('Error deleting trip:', error);
      alert('Error al eliminar el viaje');
    } finally {
      setDeleteLoading(false);
      setShowDeleteConfirm(false);
    }
  };

  const handleBooking = async () => {
    if (!user) return alert('Debes iniciar sesión para reservar');
    if (!trip) return;

    setBookingLoading(true);
    try {
      // 1. Create booking in Supabase
      const { data: bookingData, error: bookingError } = await supabase
        .from('bookings')
        .insert([{
          trip_id: trip.id,
          passenger_id: user.uid,
          seats: seatsToBook,
          total_price: trip.pricePerSeat * seatsToBook,
          status: 'pending'
        }])
        .select()
        .single();

      if (bookingError) throw bookingError;

      // 2. Create Mercado Pago Preference
      const response = await fetch('/api/create-preference', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: `Viaje ${trip.origin} -> ${trip.destination}`,
          quantity: seatsToBook,
          unit_price: trip.pricePerSeat,
          bookingId: bookingData.id
        })
      });

      const preference = await response.json();
      
      if (preference.init_point) {
        window.location.href = preference.init_point;
      } else {
        throw new Error('Failed to create payment preference');
      }

    } catch (error: any) {
      console.error('Booking error:', error);
      alert('Error al procesar la reserva: ' + error.message);
    } finally {
      setBookingLoading(false);
    }
  };

  if (loading) return <div className="h-96 flex items-center justify-center"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div></div>;
  if (!trip) return <div className="text-center py-20">Viaje no encontrado</div>;

  const isDriver = user?.uid === trip.driverId;

  return (
    <div className="max-w-5xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-8">
      <div className="lg:col-span-2 space-y-8">
        <div className="flex items-center justify-between">
          <button 
            onClick={() => navigate(-1)}
            className="flex items-center text-gray-500 hover:text-gray-900 transition-colors"
          >
            <ArrowLeft className="w-5 h-5 mr-2" /> Volver
          </button>

          {isDriver && (
            <div className="flex flex-col items-end">
              <button
                onClick={() => setShowDeleteConfirm(true)}
                disabled={deleteLoading || (trip && (new Date(trip.departureTime).getTime() - new Date().getTime()) / (1000 * 60 * 60) < 24)}
                className="flex items-center text-red-500 hover:text-red-700 font-bold transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
              >
                <Trash2 className="w-5 h-5 mr-2" /> 
                Eliminar viaje
              </button>
              {trip && (new Date(trip.departureTime).getTime() - new Date().getTime()) / (1000 * 60 * 60) < 24 && (
                <span className="text-[10px] text-red-400 mt-1 font-medium">No se puede cancelar (menos de 24h)</span>
              )}
            </div>
          )}
        </div>

        {/* Trip Info Card */}
        <div className="bg-white rounded-3xl p-8 border border-gray-100 shadow-sm space-y-8">
          <div className="flex flex-col space-y-6">
            <div className="flex items-start space-x-4">
              <div className="flex flex-col items-center mt-1">
                <div className="w-4 h-4 rounded-full bg-blue-600 border-4 border-blue-100" />
                <div className="w-0.5 h-12 bg-gray-100 my-1" />
                <div className="w-4 h-4 rounded-full bg-red-500 border-4 border-red-100" />
              </div>
              <div className="flex-1 space-y-8">
                <div>
                  <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider">Origen</h3>
                  <p className="text-xl font-bold text-gray-900">{trip.origin}</p>
                </div>
                <div>
                  <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider">Destino</h3>
                  <p className="text-xl font-bold text-gray-900">{trip.destination}</p>
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 gap-6 pt-8 border-t border-gray-50">
            <div className="space-y-1">
              <span className="text-xs font-bold text-gray-400 uppercase">Fecha y Hora</span>
              <div className="flex items-center text-gray-900 font-semibold">
                <Calendar className="w-4 h-4 mr-2 text-blue-600" />
                {formatDate(trip.departureTime)}
              </div>
            </div>
            <div className="space-y-1">
              <span className="text-xs font-bold text-gray-400 uppercase">Asientos</span>
              <div className="flex items-center text-gray-900 font-semibold">
                <Users className="w-4 h-4 mr-2 text-blue-600" />
                {trip.availableSeats || 0} disponibles
              </div>
            </div>
            <div className="space-y-1">
              <span className="text-xs font-bold text-gray-400 uppercase">Precio</span>
              <div className="flex items-center text-blue-600 font-bold text-lg">
                <DollarSign className="w-4 h-4 mr-1" />
                {formatCurrency(trip.pricePerSeat)}
              </div>
            </div>
          </div>

          {trip.description && (
            <div className="pt-8 border-t border-gray-50">
              <h3 className="text-sm font-bold text-gray-400 uppercase mb-3">Descripción del viaje</h3>
              <p className="text-gray-600 leading-relaxed">{trip.description}</p>
            </div>
          )}

          {/* Map Section */}
          <div className="pt-8 border-t border-gray-50">
            <h3 className="text-sm font-bold text-gray-400 uppercase mb-4 flex items-center">
              <Navigation className="w-4 h-4 mr-2 text-blue-600" /> Ruta del viaje
            </h3>
            <div 
              ref={mapRef} 
              className="w-full h-80 rounded-2xl bg-gray-100 border border-gray-100 overflow-hidden shadow-inner"
            />
            <p className="text-xs text-gray-400 mt-2 text-center">
              Punto de encuentro a coordinar con el conductor.
            </p>
          </div>
        </div>

        {/* Driver Info */}
        <div className="bg-white rounded-3xl p-8 border border-gray-100 shadow-sm">
          <h3 className="text-sm font-bold text-gray-400 uppercase mb-6">Conductor</h3>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              {(driver?.photoURL || trip.driverPhoto) ? (
                <img src={driver?.photoURL || trip.driverPhoto} alt="" className="w-16 h-16 rounded-2xl object-cover" referrerPolicy="no-referrer" />
              ) : (
                <div className="w-16 h-16 bg-blue-50 rounded-2xl flex items-center justify-center">
                  <UserIcon className="w-8 h-8 text-blue-600" />
                </div>
              )}
              <div>
                <h4 className="text-lg font-bold text-gray-900">{trip.driverName}</h4>
                <div className="flex items-center text-sm text-gray-500">
                  <ShieldCheck className="w-4 h-4 mr-1 text-green-500" />
                  Usuario verificado
                </div>
              </div>
            </div>
            <button className="p-3 bg-gray-50 rounded-xl text-gray-600 hover:bg-gray-100 transition-colors">
              <MessageCircle className="w-6 h-6" />
            </button>
          </div>
          {(driver?.bio || trip.driverBio) && (
            <div className="mt-6 p-4 bg-gray-50 rounded-2xl text-sm text-gray-600 italic">
              "{driver?.bio || trip.driverBio}"
            </div>
          )}
        </div>
      </div>

      {/* Booking Sidebar */}
      <div className="lg:col-span-1">
        <div className="bg-white rounded-3xl p-8 border border-gray-100 shadow-xl shadow-gray-100 sticky top-24 space-y-6">
          <h3 className="text-xl font-bold text-gray-900">Reservar lugar</h3>
          
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl">
              <span className="font-medium text-gray-700">Asientos</span>
              <div className="flex items-center space-x-4">
                <button 
                  onClick={() => setSeatsToBook(Math.max(1, (seatsToBook || 1) - 1))}
                  className="w-8 h-8 flex items-center justify-center bg-white border border-gray-200 rounded-lg font-bold"
                >
                  -
                </button>
                <span className="font-bold text-lg">{seatsToBook || 1}</span>
                <button 
                  onClick={() => setSeatsToBook(Math.min(trip.availableSeats || 1, (seatsToBook || 1) + 1))}
                  className="w-8 h-8 flex items-center justify-center bg-white border border-gray-200 rounded-lg font-bold"
                >
                  +
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between px-2">
              <span className="text-gray-500">Total a pagar</span>
              <span className="text-2xl font-bold text-gray-900">
                {formatCurrency((trip.pricePerSeat || 0) * (seatsToBook || 1))}
              </span>
            </div>
          </div>

          <button
            onClick={handleBooking}
            disabled={bookingLoading || isDriver || trip.availableSeats === 0}
            className="w-full bg-blue-600 text-white py-4 rounded-2xl font-bold text-lg hover:bg-blue-700 transition-all shadow-lg shadow-blue-100 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {bookingLoading ? 'Procesando...' : isDriver ? 'Tu propio viaje' : trip.availableSeats === 0 ? 'Sin lugares' : 'Reservar ahora'}
          </button>

          <p className="text-xs text-center text-gray-400">
            Pagos seguros procesados por Mercado Pago.
          </p>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
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
                onClick={handleDelete}
                disabled={deleteLoading}
                className="w-full bg-red-500 text-white py-4 rounded-2xl font-bold hover:bg-red-600 transition-colors disabled:opacity-50"
              >
                {deleteLoading ? 'Eliminando...' : 'Sí, eliminar viaje'}
              </button>
              <button
                onClick={() => setShowDeleteConfirm(false)}
                disabled={deleteLoading}
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
