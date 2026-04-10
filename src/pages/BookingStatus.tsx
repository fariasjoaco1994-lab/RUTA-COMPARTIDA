import { useEffect, useState } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { supabase } from '../supabase';
import { CheckCircle, XCircle, Clock, ArrowRight, Car } from 'lucide-react';
import { motion } from 'motion/react';

export default function BookingStatus() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState<'loading' | 'success' | 'failure' | 'pending'>('loading');
  const [error, setError] = useState<string | null>(null);

  const paymentStatus = searchParams.get('status');
  const bookingId = searchParams.get('external_reference');

  useEffect(() => {
    const updateBooking = async () => {
      if (!bookingId) {
        setStatus('failure');
        setError('No se encontró la referencia de la reserva.');
        return;
      }

      try {
        const { data: bookingData, error: bookingError } = await supabase
          .from('bookings')
          .select('*')
          .eq('id', bookingId)
          .single();

        if (bookingError || !bookingData) {
          setStatus('failure');
          setError('La reserva no existe.');
          return;
        }

        if (paymentStatus === 'approved') {
          // Update booking status
          const { error: updateError } = await supabase
            .from('bookings')
            .update({
              status: 'confirmed',
              payment_id: searchParams.get('payment_id')
            })
            .eq('id', bookingId);

          if (updateError) throw updateError;

          // Reduce available seats in the trip
          // First fetch current seats
          const { data: tripData } = await supabase
            .from('trips')
            .select('available_seats')
            .eq('id', bookingData.trip_id)
            .single();

          if (tripData) {
            await supabase
              .from('trips')
              .update({
                available_seats: tripData.available_seats - bookingData.seats
              })
              .eq('id', bookingData.trip_id);
          }

          setStatus('success');
        } else if (paymentStatus === 'pending' || paymentStatus === 'in_process') {
          await supabase
            .from('bookings')
            .update({ status: 'pending' })
            .eq('id', bookingId);
          setStatus('pending');
        } else {
          await supabase
            .from('bookings')
            .update({ status: 'rejected' })
            .eq('id', bookingId);
          setStatus('failure');
        }
      } catch (err) {
        console.error('Error updating booking status:', err);
        setStatus('failure');
        setError('Hubo un problema al procesar tu pago.');
      }
    };

    updateBooking();
  }, [paymentStatus, bookingId, searchParams]);

  if (status === 'loading') {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto py-12 px-4">
      <motion.div 
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white rounded-3xl p-8 border border-gray-100 shadow-xl text-center space-y-6"
      >
        {status === 'success' && (
          <>
            <div className="bg-green-100 w-20 h-20 rounded-full flex items-center justify-center mx-auto">
              <CheckCircle className="w-12 h-12 text-green-600" />
            </div>
            <h1 className="text-3xl font-bold text-gray-900">¡Pago aprobado!</h1>
            <p className="text-gray-600">Tu lugar ha sido reservado con éxito. Podés ver los detalles en tu sección de viajes.</p>
          </>
        )}

        {status === 'pending' && (
          <>
            <div className="bg-yellow-100 w-20 h-20 rounded-full flex items-center justify-center mx-auto">
              <Clock className="w-12 h-12 text-yellow-600" />
            </div>
            <h1 className="text-3xl font-bold text-gray-900">Pago pendiente</h1>
            <p className="text-gray-600">Estamos esperando la confirmación de Mercado Pago. Te avisaremos cuando se procese.</p>
          </>
        )}

        {status === 'failure' && (
          <>
            <div className="bg-red-100 w-20 h-20 rounded-full flex items-center justify-center mx-auto">
              <XCircle className="w-12 h-12 text-red-600" />
            </div>
            <h1 className="text-3xl font-bold text-gray-900">Pago fallido</h1>
            <p className="text-gray-600">{error || 'No pudimos procesar tu pago. Por favor, intentá nuevamente.'}</p>
          </>
        )}

        <div className="pt-6 space-y-3">
          <Link 
            to="/my-trips" 
            className="w-full bg-blue-600 text-white py-4 rounded-2xl font-bold block hover:bg-blue-700 transition-all"
          >
            Ir a mis viajes
          </Link>
          <Link 
            to="/" 
            className="w-full text-gray-500 font-semibold py-2 block hover:text-gray-900 transition-all flex items-center justify-center"
          >
            Volver al inicio <ArrowRight className="w-4 h-4 ml-2" />
          </Link>
        </div>
      </motion.div>
    </div>
  );
}
