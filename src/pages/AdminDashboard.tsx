import { useState, useEffect } from 'react';
import { supabase, isSupabaseConfigured } from '../supabase';
import { User, DriverVerification } from '../types';
import { useAuth } from '../hooks/useAuth';
import { Shield, Check, X, Eye, ExternalLink, Loader2, UserCheck, UserX, Clock } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export default function AdminDashboard() {
  const { user: currentUser } = useAuth();
  const [pendingRequests, setPendingRequests] = useState<DriverVerification[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRequest, setSelectedRequest] = useState<DriverVerification | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');

  const adminEmails = ['farias.joaco1994@gmail.com', 'MROSA.ZALAZAR@OUTLOOK.COM'];
  const isAdmin = currentUser?.role === 'admin' || (currentUser?.email && adminEmails.includes(currentUser.email));

  const fetchPendingRequests = async () => {
    if (!isSupabaseConfigured) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('drivers')
        .select(`
          *,
          users (
            display_name,
            real_name,
            email,
            photo_url,
            phone_number
          ),
          driver_documents (*)
        `)
        .eq('estado', 'pending');

      if (error) throw error;

      const requests: DriverVerification[] = (data || []).map(d => ({
        id: d.id,
        userId: d.user_id,
        firstName: d.users?.real_name?.split(' ')[0] || d.users?.display_name?.split(' ')[0] || '',
        lastName: d.users?.real_name?.split(' ').slice(1).join(' ') || d.users?.display_name?.split(' ').slice(1).join(' ') || '',
        realName: d.users?.real_name || d.users?.display_name || '',
        dni: d.dni,
        phoneNumber: d.users?.phone_number || '',
        email: d.users?.email || '',
        carBrand: d.vehiculo_marca,
        carModel: d.vehiculo_modelo,
        carPlate: d.patente,
        carColor: d.vehiculo_color,
        carSeats: d.vehiculo_asientos,
        status: d.estado,
        photoURL: d.users?.photo_url,
        bio: d.sobre_mi,
        dniFrontUrl: d.driver_documents?.[0]?.dni_frente_url,
        dniBackUrl: d.driver_documents?.[0]?.dni_dorso_url,
        licenseUrl: d.driver_documents?.[0]?.licencia_url,
        carPhotoUrl: d.driver_documents?.[0]?.auto_foto_url,
        createdAt: d.created_at
      }));

      setPendingRequests(requests);
    } catch (error) {
      console.error('Error fetching pending requests:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isAdmin) {
      fetchPendingRequests();
    }
  }, [isAdmin]);

  const handleApprove = async (request: DriverVerification) => {
    setActionLoading(request.id);
    try {
      // 1. Update driver request status
      const { error: driverError } = await supabase
        .from('drivers')
        .update({ estado: 'approved', updated_at: new Date().toISOString() })
        .eq('id', request.id);

      if (driverError) throw driverError;

      // 2. Update user document
      const { error: userError } = await supabase
        .from('users')
        .update({
          verification_status: 'approved',
          is_driver: true,
          real_name: request.realName,
          dni: request.dni,
          car_brand: request.carBrand,
          car_model: request.carModel,
          car_plate: request.carPlate,
          car_color: request.carColor,
          car_seats: request.carSeats,
          car_photo_url: request.carPhotoUrl,
          bio: request.bio,
          updated_at: new Date().toISOString()
        })
        .eq('id', request.userId);

      if (userError) throw userError;

      setPendingRequests(prev => prev.filter(r => r.id !== request.id));
      setSelectedRequest(null);
      alert('Conductor aprobado con éxito');
    } catch (error) {
      console.error('Error approving driver:', error);
      alert('Error al aprobar conductor');
    } finally {
      setActionLoading(null);
    }
  };

  const handleReject = async (request: DriverVerification) => {
    if (!rejectionReason) return alert('Por favor, ingresá un motivo de rechazo');
    setActionLoading(request.id);
    try {
      // 1. Update driver request status
      const { error: driverError } = await supabase
        .from('drivers')
        .update({ 
          estado: 'rejected', 
          rejection_reason: rejectionReason,
          updated_at: new Date().toISOString() 
        })
        .eq('id', request.id);

      if (driverError) throw driverError;

      // 2. Update user document
      const { error: userError } = await supabase
        .from('users')
        .update({
          verification_status: 'rejected',
          rejection_reason: rejectionReason,
          updated_at: new Date().toISOString()
        })
        .eq('id', request.userId);

      if (userError) throw userError;

      setPendingRequests(prev => prev.filter(r => r.id !== request.id));
      setSelectedRequest(null);
      setRejectionReason('');
      alert('Solicitud rechazada');
    } catch (error) {
      console.error('Error rejecting driver:', error);
      alert('Error al rechazar solicitud');
    } finally {
      setActionLoading(null);
    }
  };

  if (!isAdmin) {
    return (
      <div className="max-w-2xl mx-auto py-20 px-4 text-center">
        <Shield className="w-16 h-16 text-red-500 mx-auto mb-4" />
        <h1 className="text-2xl font-bold text-gray-900">Acceso Denegado</h1>
        <p className="text-gray-600">No tenés permisos para acceder a esta sección.</p>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto py-8 px-4 space-y-8">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="w-12 h-12 bg-blue-600 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-blue-100">
            <Shield className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Panel de Administración</h1>
            <p className="text-sm text-gray-500">Gestión de verificaciones de conductores.</p>
          </div>
        </div>
        <button 
          onClick={fetchPendingRequests}
          className="p-2 text-blue-600 hover:bg-blue-50 rounded-xl transition-all"
        >
          Actualizar lista
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* List of Pending Requests */}
        <div className="lg:col-span-1 space-y-4">
          <h2 className="text-lg font-bold text-gray-900 flex items-center">
            <Clock className="w-5 h-5 mr-2 text-blue-600" /> Solicitudes Pendientes ({pendingRequests.length})
          </h2>
          
          {loading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
            </div>
          ) : pendingRequests.length === 0 ? (
            <div className="bg-white rounded-3xl p-8 text-center border border-gray-100">
              <Check className="w-12 h-12 text-green-500 mx-auto mb-2" />
              <p className="text-gray-500 font-medium">No hay solicitudes pendientes</p>
            </div>
          ) : (
            <div className="space-y-3">
              {pendingRequests.map(r => (
                <button
                  key={r.id}
                  onClick={() => setSelectedRequest(r)}
                  className={`w-full p-4 rounded-2xl border transition-all text-left flex items-center space-x-3 ${selectedRequest?.id === r.id ? 'bg-blue-600 border-blue-600 text-white shadow-lg shadow-blue-100' : 'bg-white border-gray-100 hover:border-blue-200 text-gray-900'}`}
                >
                  <div className="w-10 h-10 rounded-full bg-gray-100 overflow-hidden flex-shrink-0">
                    <img src={r.photoURL || ''} alt="" className="w-full h-full object-cover" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold truncate">{r.realName}</p>
                    <p className={`text-xs truncate ${selectedRequest?.id === r.id ? 'text-blue-100' : 'text-gray-500'}`}>{r.email}</p>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Request Details */}
        <div className="lg:col-span-2">
          <AnimatePresence mode="wait">
            {selectedRequest ? (
              <motion.div
                key={selectedRequest.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="bg-white rounded-[32px] border border-gray-100 shadow-xl overflow-hidden"
              >
                <div className="p-8 space-y-8">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center space-x-4">
                      <div className="w-16 h-16 rounded-2xl overflow-hidden bg-gray-100">
                        <img src={selectedRequest.photoURL || ''} alt="" className="w-full h-full object-cover" />
                      </div>
                      <div>
                        <h3 className="text-xl font-bold text-gray-900">{selectedRequest.realName}</h3>
                        <p className="text-gray-500">{selectedRequest.email}</p>
                        <p className="text-sm font-medium text-blue-600">{selectedRequest.phoneNumber}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-xs font-bold text-gray-400 uppercase">DNI</p>
                      <p className="text-lg font-bold text-gray-900">{selectedRequest.dni}</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-4">
                      <h4 className="font-bold text-gray-900 border-b pb-2">Vehículo</h4>
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <p className="text-gray-500">Marca/Modelo</p>
                          <p className="font-bold">{selectedRequest.carBrand} {selectedRequest.carModel}</p>
                        </div>
                        <div>
                          <p className="text-gray-500">Patente</p>
                          <p className="font-bold">{selectedRequest.carPlate}</p>
                        </div>
                        <div>
                          <p className="text-gray-500">Color</p>
                          <p className="font-bold">{selectedRequest.carColor}</p>
                        </div>
                        <div>
                          <p className="text-gray-500">Asientos</p>
                          <p className="font-bold">{selectedRequest.carSeats || 0}</p>
                        </div>
                      </div>
                      <div className="relative aspect-video rounded-2xl overflow-hidden bg-gray-100 border border-gray-100 group">
                        <img src={selectedRequest.carPhotoUrl} alt="Auto" className="w-full h-full object-cover" />
                        <a 
                          href={selectedRequest.carPhotoUrl} 
                          target="_blank" 
                          rel="noreferrer"
                          className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white font-bold"
                        >
                          <ExternalLink className="w-6 h-6 mr-2" /> Ver en alta resolución
                        </a>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <h4 className="font-bold text-gray-900 border-b pb-2">Documentación</h4>
                      <div className="space-y-3">
                        <a 
                          href={selectedRequest.dniFrontUrl} 
                          target="_blank" 
                          rel="noreferrer"
                          className="flex items-center justify-between p-3 bg-gray-50 rounded-xl hover:bg-gray-100 transition-all group"
                        >
                          <span className="text-sm font-medium text-gray-700">DNI Frente</span>
                          <ExternalLink className="w-4 h-4 text-gray-400 group-hover:text-blue-600" />
                        </a>
                        <a 
                          href={selectedRequest.dniBackUrl} 
                          target="_blank" 
                          rel="noreferrer"
                          className="flex items-center justify-between p-3 bg-gray-50 rounded-xl hover:bg-gray-100 transition-all group"
                        >
                          <span className="text-sm font-medium text-gray-700">DNI Dorso</span>
                          <ExternalLink className="w-4 h-4 text-gray-400 group-hover:text-blue-600" />
                        </a>
                        <a 
                          href={selectedRequest.licenseUrl} 
                          target="_blank" 
                          rel="noreferrer"
                          className="flex items-center justify-between p-3 bg-gray-50 rounded-xl hover:bg-gray-100 transition-all group"
                        >
                          <span className="text-sm font-medium text-gray-700">Carnet de Conducir</span>
                          <ExternalLink className="w-4 h-4 text-gray-400 group-hover:text-blue-600" />
                        </a>
                      </div>
                      <div className="p-4 bg-blue-50 rounded-2xl">
                        <p className="text-xs font-bold text-blue-800 mb-1 uppercase tracking-wider">Biografía</p>
                        <p className="text-sm text-blue-900 italic">"{selectedRequest.bio}"</p>
                      </div>
                    </div>
                  </div>

                  <div className="pt-6 border-t border-gray-100 space-y-4">
                    <div className="flex space-x-4">
                      <div className="flex-1">
                        <input
                          type="text"
                          value={rejectionReason}
                          onChange={(e) => setRejectionReason(e.target.value)}
                          placeholder="Motivo del rechazo (obligatorio para rechazar)"
                          className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-red-500 outline-none"
                        />
                      </div>
                      <button
                        onClick={() => handleReject(selectedRequest)}
                        disabled={!!actionLoading || !rejectionReason}
                        className="px-6 py-3 bg-red-50 text-red-600 rounded-xl font-bold hover:bg-red-100 transition-all disabled:opacity-50 flex items-center"
                      >
                        {actionLoading === selectedRequest.id ? <Loader2 className="w-5 h-5 animate-spin" /> : <><UserX className="w-5 h-5 mr-2" /> Rechazar</>}
                      </button>
                      <button
                        onClick={() => handleApprove(selectedRequest)}
                        disabled={!!actionLoading}
                        className="px-8 py-3 bg-green-600 text-white rounded-xl font-bold hover:bg-green-700 transition-all shadow-lg shadow-green-100 disabled:opacity-50 flex items-center"
                      >
                        {actionLoading === selectedRequest.id ? <Loader2 className="w-5 h-5 animate-spin" /> : <><UserCheck className="w-5 h-5 mr-2" /> Aprobar</>}
                      </button>
                    </div>
                  </div>
                </div>
              </motion.div>
            ) : (
              <div className="h-full flex flex-col items-center justify-center py-20 bg-gray-50 rounded-[32px] border-2 border-dashed border-gray-200 text-gray-400">
                <Eye className="w-16 h-16 mb-4 opacity-20" />
                <p className="font-medium">Seleccioná una solicitud para revisar</p>
              </div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
