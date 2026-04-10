import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabase';
import { useAuth } from '../hooks/useAuth';
import { useGoogleMaps } from '../components/GoogleMapsProvider';
import { MapPin, Calendar, Clock, Users, DollarSign, Info, ArrowLeft, CheckCircle, ShieldCheck, AlertCircle, Car } from 'lucide-react';
import { motion } from 'motion/react';
import { AppConfig } from '../types';
import { formatCurrency } from '../lib/utils';

declare global {
  interface Window {
    google: any;
  }
}

export default function CreateTrip() {
  const { user } = useAuth();
  const isMapsLoaded = useGoogleMaps();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [driverId, setDriverId] = useState<string | null>(null);
  const [appConfig, setAppConfig] = useState<AppConfig | null>(null);
  const [distanceKm, setDistanceKm] = useState<number>(0);
  const [totalSeats, setTotalSeats] = useState<5 | 7>(5);

  useEffect(() => {
    fetchAppConfig();
    if (user) {
      if (!user.verificationStatus || user.verificationStatus === 'none') {
        navigate('/driver-profile');
      } else {
        fetchDriverId();
      }
    }
  }, [user, navigate]);

  async function fetchDriverId() {
    if (!user) return;
    const { data, error } = await supabase
      .from('drivers')
      .select('id')
      .eq('user_id', user.uid)
      .single();
    
    if (data) {
      setDriverId(data.id);
    }
  }

  async function fetchAppConfig() {
    const { data, error } = await supabase
      .from('app_config')
      .select('*')
      .limit(1)
      .single();
    
    if (data) {
      setAppConfig(data);
    } else {
      // Fallback if table is empty or doesn't exist yet
      setAppConfig({
        precio_nafta_actual: 1000,
        consumo_estandar_100km: 10,
        comision_plataforma_fija: 500
      });
    }
  }

  const isApproved = user?.verificationStatus === 'approved';
  const isPending = user?.verificationStatus === 'pending';
  const isRejected = user?.verificationStatus === 'rejected';

  const [formData, setFormData] = useState({
    origin: '',
    destination: '',
    departureDate: '',
    departureTime: '',
    availableSeats: 3,
    pricePerSeat: 0,
    montoNaftaConductor: 0,
    description: ''
  });

  const originRef = useRef<HTMLInputElement>(null);
  const destRef = useRef<HTMLInputElement>(null);

  const calculateDistance = () => {
    if (formData.origin && formData.destination && window.google) {
      const service = new window.google.maps.DistanceMatrixService();
      service.getDistanceMatrix(
        {
          origins: [formData.origin],
          destinations: [formData.destination],
          travelMode: window.google.maps.TravelMode.DRIVING,
          unitSystem: window.google.maps.UnitSystem.METRIC,
        },
        (response: any, status: any) => {
          if (status === 'OK' && response.rows[0].elements[0].status === 'OK') {
            const distance = response.rows[0].elements[0].distance.value / 1000;
            setDistanceKm(distance);
          }
        }
      );
    }
  };

  useEffect(() => {
    if (isMapsLoaded && originRef.current && destRef.current) {
      const options = {
        componentRestrictions: { country: 'ar' },
        types: ['(cities)']
      };
      
      const originAutocomplete = new window.google.maps.places.Autocomplete(originRef.current, options);
      const destAutocomplete = new window.google.maps.places.Autocomplete(destRef.current, options);

      originAutocomplete.addListener('place_changed', () => {
        const place = originAutocomplete.getPlace();
        const address = place.formatted_address || '';
        setFormData(prev => ({ ...prev, origin: address }));
      });

      destAutocomplete.addListener('place_changed', () => {
        const place = destAutocomplete.getPlace();
        const address = place.formatted_address || '';
        setFormData(prev => ({ ...prev, destination: address }));
      });
    }
  }, [isMapsLoaded]);

  useEffect(() => {
    if (formData.origin && formData.destination) {
      calculateDistance();
    }
  }, [formData.origin, formData.destination]);

  // Pricing Logic
  const costoTotal = appConfig ? (distanceKm / 100) * appConfig.consumo_estandar_100km * appConfig.precio_nafta_actual : 0;
  const precioSugeridoNafta = costoTotal / totalSeats;
  const topeMaximoNafta = precioSugeridoNafta * 1.15;
  const isOverLimit = formData.montoNaftaConductor > topeMaximoNafta;
  const comisionFija = appConfig?.comision_plataforma_fija || 0;
  const precioFinalPasajero = formData.montoNaftaConductor + comisionFija;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !driverId) return alert('Debes ser un conductor aprobado para publicar un viaje');
    if (isOverLimit) return;
    
    setLoading(true);
    try {
      const departureTime = new Date(`${formData.departureDate}T${formData.departureTime}`).toISOString();
      
      const { error } = await supabase
        .from('trips')
        .insert([{
          driver_id: driverId,
          origin: formData.origin,
          destination: formData.destination,
          departure_time: departureTime,
          available_seats: Number(formData.availableSeats),
          price_per_seat: precioFinalPasajero,
          monto_nafta_conductor: formData.montoNaftaConductor,
          comision_plataforma: comisionFija,
          precio_final_pasajero: precioFinalPasajero,
          distancia_km: distanceKm,
          description: formData.description,
          status: 'active'
        }]);

      if (error) throw error;

      setSuccess(true);
      setTimeout(() => navigate('/my-trips'), 2000);
    } catch (error: any) {
      console.error('Error creating trip:', error);
      alert('Error al publicar el viaje: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center text-center space-y-4">
        <div className="bg-green-100 p-4 rounded-full">
          <CheckCircle className="w-16 h-16 text-green-600" />
        </div>
        <h2 className="text-3xl font-bold text-gray-900">¡Viaje publicado con éxito!</h2>
        <p className="text-gray-600">Redirigiendo a tus viajes...</p>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto">
      <button 
        onClick={() => navigate(-1)}
        className="flex items-center text-gray-500 hover:text-gray-900 mb-8 transition-colors"
      >
        <ArrowLeft className="w-5 h-5 mr-2" /> Volver
      </button>

      <div className="bg-white rounded-3xl shadow-xl shadow-gray-100 border border-gray-100 overflow-hidden">
        <div className="bg-blue-600 p-8 text-white">
          <h1 className="text-3xl font-bold">Publicar un viaje</h1>
          <p className="text-blue-100 mt-2">Compartí tu ruta y ahorrá en gastos de combustible.</p>
        </div>

        <form onSubmit={handleSubmit} className="p-8 space-y-6 relative">
          {!isApproved && (
            <div className="absolute inset-0 z-10 bg-white/80 backdrop-blur-sm flex flex-col items-center justify-center p-8 text-center">
              <div className="bg-amber-100 p-4 rounded-full mb-4">
                <ShieldCheck className="w-12 h-12 text-amber-600" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">
                {isPending ? 'Verificación en proceso' : isRejected ? 'Verificación rechazada' : 'Verificación requerida'}
              </h3>
              <p className="text-gray-600 max-w-sm mb-6">
                {isPending 
                  ? 'Tu cuenta aún no está verificada. Esperá la aprobación de un administrador para publicar viajes.' 
                  : isRejected 
                  ? `Tu solicitud fue rechazada: ${user?.rejectionReason}. Por favor, actualizá tus datos.`
                  : 'Debes completar tu perfil de conductor y ser aprobado antes de publicar viajes.'}
              </p>
              <button
                type="button"
                onClick={() => navigate('/driver-profile')}
                className="px-8 py-3 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition-all shadow-lg shadow-blue-100"
              >
                {isRejected ? 'Reintentar verificación' : 'Ir a verificación'}
              </button>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-sm font-bold text-gray-700 flex items-center">
                <MapPin className="w-4 h-4 mr-2 text-blue-600" /> Origen
              </label>
              <input
                ref={originRef}
                type="text"
                required
                placeholder="Ej: La Plata, Buenos Aires"
                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                value={formData.origin}
                onChange={(e) => setFormData({ ...formData, origin: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-bold text-gray-700 flex items-center">
                <MapPin className="w-4 h-4 mr-2 text-red-500" /> Destino
              </label>
              <input
                ref={destRef}
                type="text"
                required
                placeholder="Ej: Mar del Plata, Buenos Aires"
                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                value={formData.destination}
                onChange={(e) => setFormData({ ...formData, destination: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-bold text-gray-700 flex items-center">
                <Calendar className="w-4 h-4 mr-2 text-gray-400" /> Fecha
              </label>
              <input
                type="date"
                required
                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                value={formData.departureDate}
                onChange={(e) => setFormData({ ...formData, departureDate: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-bold text-gray-700 flex items-center">
                <Clock className="w-4 h-4 mr-2 text-gray-400" /> Hora
              </label>
              <input
                type="time"
                required
                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                value={formData.departureTime}
                onChange={(e) => setFormData({ ...formData, departureTime: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-bold text-gray-700 flex items-center">
                <Users className="w-4 h-4 mr-2 text-gray-400" /> Asientos disponibles para pasajeros
              </label>
              <select
                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                value={formData.availableSeats}
                onChange={(e) => setFormData({ ...formData, availableSeats: Number(e.target.value) })}
              >
                {[1, 2, 3, 4, 5, 6].map(n => (
                  <option key={n} value={n}>{n} {n === 1 ? 'asiento' : 'asientos'}</option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-bold text-gray-700 flex items-center">
                <Car className="w-4 h-4 mr-2 text-gray-400" /> Capacidad total del auto
              </label>
              <div className="flex space-x-4 p-1 bg-gray-50 rounded-xl">
                {[5, 7].map((seats) => (
                  <button
                    key={seats}
                    type="button"
                    onClick={() => setTotalSeats(seats as 5 | 7)}
                    className={`flex-1 py-2 rounded-lg font-bold transition-all ${totalSeats === seats ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                  >
                    {seats} Asientos
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2 col-span-full">
              <label className="text-sm font-bold text-gray-700 flex items-center">
                <DollarSign className="w-4 h-4 mr-2 text-green-600" /> Monto para nafta (por pasajero)
              </label>
              <div className="relative">
                <input
                  type="number"
                  required
                  min="0"
                  placeholder="Ej: 5000"
                  className={`w-full px-4 py-3 rounded-xl border focus:ring-2 focus:border-transparent outline-none transition-all ${isOverLimit ? 'border-red-500 focus:ring-red-500' : 'border-gray-200 focus:ring-blue-500'}`}
                  value={formData.montoNaftaConductor || ''}
                  onChange={(e) => setFormData({ ...formData, montoNaftaConductor: Number(e.target.value) })}
                />
                {isOverLimit && (
                  <p className="text-red-500 text-xs mt-1 font-medium flex items-center">
                    <AlertCircle className="w-3 h-3 mr-1" />
                    El monto de nafta supera el límite del 15% sobre el precio sugerido ({formatCurrency(topeMaximoNafta)})
                  </p>
                )}
              </div>
              {distanceKm > 0 && (
                <p className="text-xs text-gray-500">
                  Distancia estimada: <span className="font-bold">{distanceKm.toFixed(1)} km</span>. 
                  Precio sugerido: <span className="font-bold">{formatCurrency(precioSugeridoNafta)}</span>
                </p>
              )}
            </div>
          </div>

          {/* Resumen de Costos */}
          <div className="bg-blue-50 rounded-2xl p-6 space-y-4 border border-blue-100">
            <h3 className="font-bold text-blue-900 flex items-center">
              <Info className="w-4 h-4 mr-2" /> Resumen del viaje
            </h3>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-blue-700">Recibís para nafta:</span>
                <span className="font-bold text-blue-900">{formatCurrency(formData.montoNaftaConductor)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-blue-700">Gastos de gestión:</span>
                <span className="font-bold text-blue-900">{formatCurrency(comisionFija)}</span>
              </div>
              <div className="pt-2 border-t border-blue-200 flex justify-between items-center">
                <span className="font-bold text-blue-900">Precio final para el pasajero:</span>
                <span className="text-xl font-black text-blue-600">{formatCurrency(precioFinalPasajero)}</span>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-bold text-gray-700 flex items-center">
              <Info className="w-4 h-4 mr-2 text-gray-400" /> Información adicional
            </label>
            <textarea
              placeholder="Detalles sobre el punto de encuentro, equipaje, etc."
              rows={4}
              className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all resize-none"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            />
          </div>

          <button
            type="submit"
            disabled={loading || isOverLimit}
            className="w-full bg-blue-600 text-white py-4 rounded-2xl font-bold text-lg hover:bg-blue-700 transition-all shadow-lg shadow-blue-100 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Publicando...' : 'Publicar viaje'}
          </button>
        </form>
      </div>
    </div>
  );
}
