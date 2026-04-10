import { useState, useEffect, useRef } from 'react';
import { supabase, isSupabaseConfigured } from '../supabase';
import { Trip } from '../types';
import TripCard from '../components/TripCard';
import { Search, MapPin, Calendar, Users, Map as MapIcon, Car } from 'lucide-react';
import { useGoogleMaps } from '../components/GoogleMapsProvider';
import { motion } from 'motion/react';

declare global {
  interface Window {
    google: any;
  }
}

export default function Home() {
  const isMapsLoaded = useGoogleMaps();
  const [trips, setTrips] = useState<Trip[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchParams, setSearchParams] = useState({
    origin: '',
    destination: '',
    date: '',
    seats: 1
  });

  const originRef = useRef<HTMLInputElement>(null);
  const destRef = useRef<HTMLInputElement>(null);

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
        setSearchParams(prev => ({ ...prev, origin: place.formatted_address || '' }));
      });

      destAutocomplete.addListener('place_changed', () => {
        const place = destAutocomplete.getPlace();
        setSearchParams(prev => ({ ...prev, destination: place.formatted_address || '' }));
      });
    }
  }, [isMapsLoaded]);

  const fetchTrips = async () => {
    if (!isSupabaseConfigured) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      let query = supabase
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
        .eq('status', 'active')
        .order('departure_time', { ascending: true })
        .limit(20);

      if (searchParams.date) {
        query = query.gte('departure_time', searchParams.date);
      }

      const { data, error } = await query;

      if (error) throw error;

      const tripsData: Trip[] = (data || []).map(t => ({
        id: t.id,
        driverId: t.driver_id,
        driverName: t.drivers?.users?.display_name || 'Conductor',
        driverPhoto: t.drivers?.users?.photo_url,
        driverBio: t.drivers?.users?.bio,
        origin: t.origin,
        destination: t.destination,
        originCoords: t.origin_coords,
        destinationCoords: t.destination_coords,
        departureTime: t.departure_time,
        availableSeats: t.available_seats,
        pricePerSeat: t.price_per_seat,
        montoNaftaConductor: t.monto_nafta_conductor,
        comisionPlataforma: t.comision_plataforma,
        precioFinalPasajero: t.precio_final_pasajero,
        distanciaKm: t.distancia_km,
        description: t.description,
        status: t.status,
        createdAt: t.created_at
      }));
      
      let filtered = tripsData;
      if (searchParams.origin) {
        filtered = filtered.filter(t => t.origin.toLowerCase().includes(searchParams.origin.toLowerCase()));
      }
      if (searchParams.destination) {
        filtered = filtered.filter(t => t.destination.toLowerCase().includes(searchParams.destination.toLowerCase()));
      }

      setTrips(filtered);
    } catch (error) {
      console.error('Error fetching trips:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTrips();
  }, []);

  const [viewMode, setViewMode] = useState<'list' | 'map'>('list');
  const mapRef = useRef<HTMLDivElement>(null);
  const googleMap = useRef<any>(null);
  const markers = useRef<any[]>([]);

  // Initialize Map
  useEffect(() => {
    if (isMapsLoaded && viewMode === 'map' && mapRef.current && !googleMap.current) {
      googleMap.current = new window.google.maps.Map(mapRef.current, {
        center: { lat: -34.6037, lng: -58.3816 }, // Buenos Aires
        zoom: 5,
        styles: [
          { featureType: "poi", stylers: [{ visibility: "off" }] },
          { featureType: "transit", stylers: [{ visibility: "off" }] }
        ]
      });
    }

    if (googleMap.current && viewMode === 'map') {
      // Clear existing markers
      markers.current.forEach(m => m.setMap(null));
      markers.current = [];

      // Add markers for trips
      trips.forEach(trip => {
        if (trip.originCoords) {
          const marker = new window.google.maps.Marker({
            position: trip.originCoords,
            map: googleMap.current,
            title: `${trip.origin} -> ${trip.destination}`,
            icon: {
              path: window.google.maps.SymbolPath.CIRCLE,
              scale: 10,
              fillColor: "#2563eb",
              fillOpacity: 1,
              strokeWeight: 2,
              strokeColor: "#ffffff",
            }
          });
          
          const infoWindow = new window.google.maps.InfoWindow({
            content: `<div style="padding: 8px; font-family: sans-serif;">
              <p style="font-weight: bold; margin-bottom: 4px;">${trip.origin} → ${trip.destination}</p>
              <p style="font-size: 12px; color: #666;">${new Date(trip.departureTime).toLocaleString()}</p>
              <a href="/trip/${trip.id}" style="color: #2563eb; font-size: 12px; font-weight: bold; text-decoration: none; display: block; margin-top: 8px;">Ver detalles</a>
            </div>`
          });

          marker.addListener('click', () => {
            infoWindow.open(googleMap.current, marker);
          });

          markers.current.push(marker);
        }
      });
    }
  }, [isMapsLoaded, viewMode, trips]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    fetchTrips();
  };

  return (
    <div className="space-y-12">
      {/* Hero Section */}
      <section className="relative py-16 px-6 rounded-[40px] overflow-hidden bg-blue-600 text-white">
        <div className="absolute inset-0 opacity-10">
          <img 
            src="https://picsum.photos/seed/argentina-road/1920/1080" 
            alt="" 
            className="w-full h-full object-cover"
            referrerPolicy="no-referrer"
          />
        </div>
        <div className="relative z-10 max-w-4xl mx-auto text-center space-y-8">
          <motion.h1 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-4xl md:text-6xl font-black tracking-tight"
          >
            Tus viajes compartidos,<br />al mejor precio.
          </motion.h1>

          {/* Search Bar */}
          <motion.form 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            onSubmit={handleSearch}
            className="bg-white p-2 rounded-[32px] shadow-2xl flex flex-col md:flex-row gap-2 mt-8"
          >
            <div className="flex-1 flex items-center px-4 py-3 border-b md:border-b-0 md:border-r border-gray-100">
              <MapPin className="w-5 h-5 text-blue-500 mr-3 shrink-0" />
              <input
                ref={originRef}
                type="text"
                placeholder="¿Desde dónde?"
                className="w-full bg-transparent text-gray-900 focus:outline-none placeholder:text-gray-400 font-medium py-2"
                value={searchParams.origin}
                onChange={(e) => setSearchParams(prev => ({ ...prev, origin: e.target.value }))}
              />
            </div>
            <div className="flex-1 flex items-center px-4 py-3 border-b md:border-b-0 md:border-r border-gray-100">
              <MapPin className="w-5 h-5 text-red-500 mr-3 shrink-0" />
              <input
                ref={destRef}
                type="text"
                placeholder="¿A dónde vas?"
                className="w-full bg-transparent text-gray-900 focus:outline-none placeholder:text-gray-400 font-medium py-2"
                value={searchParams.destination}
                onChange={(e) => setSearchParams(prev => ({ ...prev, destination: e.target.value }))}
              />
            </div>
            <div className="flex-1 flex items-center px-4 py-3">
              <Calendar className="w-5 h-5 text-gray-400 mr-3 shrink-0" />
              <input
                type="date"
                className="w-full bg-transparent text-gray-900 focus:outline-none font-medium py-2"
                value={searchParams.date}
                onChange={(e) => setSearchParams({ ...searchParams, date: e.target.value })}
              />
            </div>
            <button 
              type="submit"
              className="bg-blue-600 text-white px-8 py-4 rounded-[24px] font-bold hover:bg-blue-700 transition-all flex items-center justify-center"
            >
              <Search className="w-5 h-5 mr-2" /> Buscar
            </button>
          </motion.form>
        </div>
      </section>

      {/* Results Section */}
      <section className="space-y-6">
        <div className="flex justify-between items-end">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">
              {loading ? 'Buscando viajes...' : `${trips.length} viajes disponibles`}
            </h2>
            <p className="text-gray-500">Encontrá tu próximo destino</p>
          </div>
          
          <div className="flex bg-white p-1 rounded-2xl border border-gray-100 shadow-sm">
            <button 
              onClick={() => setViewMode('list')}
              className={`p-2 rounded-xl flex items-center gap-2 px-4 transition-all ${viewMode === 'list' ? 'bg-blue-600 text-white shadow-lg shadow-blue-100' : 'text-gray-500 hover:bg-gray-50'}`}
            >
              <Search className="w-4 h-4" /> <span className="text-sm font-bold">Lista</span>
            </button>
            <button 
              onClick={() => setViewMode('map')}
              className={`p-2 rounded-xl flex items-center gap-2 px-4 transition-all ${viewMode === 'map' ? 'bg-blue-600 text-white shadow-lg shadow-blue-100' : 'text-gray-500 hover:bg-gray-50'}`}
            >
              <MapIcon className="w-4 h-4" /> <span className="text-sm font-bold">Mapa</span>
            </button>
          </div>
        </div>

        {viewMode === 'list' ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {loading ? (
              [1, 2, 3, 4, 5, 6].map(i => (
                <div key={i} className="h-64 bg-gray-200 animate-pulse rounded-[32px]" />
              ))
            ) : trips.length > 0 ? (
              trips.map(trip => (
                <TripCard key={trip.id} trip={trip} />
              ))
            ) : (
              <div className="col-span-full text-center py-20 bg-white rounded-[40px] border border-dashed border-gray-200">
                <Car className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-gray-900">No se encontraron viajes</h3>
                <p className="text-gray-500 mt-2">Probá cambiando los filtros o buscá en otras fechas.</p>
              </div>
            )}
          </div>
        ) : (
          <div className="w-full h-[600px] rounded-[40px] bg-gray-100 border border-gray-200 overflow-hidden relative shadow-inner">
            <div ref={mapRef} className="w-full h-full" />
            {!isMapsLoaded && (
              <div className="absolute inset-0 flex items-center justify-center bg-gray-50/80 backdrop-blur-sm">
                <div className="text-center space-y-4">
                  <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600 mx-auto"></div>
                  <p className="text-gray-600 font-medium">Cargando mapa...</p>
                </div>
              </div>
            )}
          </div>
        )}
      </section>
    </div>
  );
}
