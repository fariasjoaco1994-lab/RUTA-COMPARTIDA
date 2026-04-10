import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase, isSupabaseConfigured } from '../supabase';
import { useAuth } from '../hooks/useAuth';
import { motion, AnimatePresence } from 'motion/react';
import { User, ShieldCheck, Car, Camera, Upload, CheckCircle, ArrowRight, ArrowLeft, Info, Loader2, XCircle, Clock, Phone, Smartphone, Check } from 'lucide-react';

export default function DriverProfile() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [uploadingField, setUploadingField] = useState<string | null>(null);
  
  const [formData, setFormData] = useState({
    firstName: user?.displayName?.split(' ')[0] || '',
    lastName: user?.displayName?.split(' ').slice(1).join(' ') || '',
    bio: user?.bio || '',
    phoneNumber: user?.phoneNumber || '+549',
    dni: user?.dni || '',
    email: user?.email || '',
    carBrand: user?.carBrand || '',
    carModel: user?.carModel || '',
    carColor: user?.carColor || '',
    carPlate: user?.carPlate || '',
    carSeats: user?.carSeats || 3,
    photoURL: user?.photoURL || '',
    dniFrontUrl: user?.dniFrontUrl || '',
    dniBackUrl: user?.dniBackUrl || '',
    licenseUrl: user?.licenseUrl || '',
    carPhotoUrl: user?.carPhotoUrl || '',
  });

  const fileInputRef = useRef<HTMLInputElement>(null);

  if (user?.verificationStatus === 'pending') {
    return (
      <div className="max-w-2xl mx-auto py-20 px-4 text-center space-y-6">
        <div className="w-20 h-20 bg-blue-50 rounded-full flex items-center justify-center mx-auto">
          <Clock className="w-10 h-10 text-blue-600 animate-pulse" />
        </div>
        <h1 className="text-3xl font-bold text-gray-900">Verificación en proceso</h1>
        <p className="text-gray-600 text-lg max-w-md mx-auto">
          Estamos revisando tu documentación. Te notificaremos por email cuando tu perfil sea aprobado para empezar a publicar viajes.
        </p>
        <button 
          onClick={() => navigate('/')}
          className="px-8 py-3 bg-blue-600 text-white rounded-2xl font-bold hover:bg-blue-700 transition-all"
        >
          Volver al inicio
        </button>
      </div>
    );
  }

  if (user?.verificationStatus === 'approved') {
    navigate('/create-trip');
    return null;
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    
    if (name === 'phoneNumber') {
      const prefix = '+549';
      // If the user tries to delete the prefix, we force it back
      if (!value.startsWith(prefix)) {
        setFormData(prev => ({ ...prev, [name]: prefix }));
        return;
      }
    }
    
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, field: string) => {
    const file = e.target.files?.[0];
    if (!file || !user || !isSupabaseConfigured) return;

    setUploadingField(field);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Math.random()}.${fileExt}`;
      const filePath = `${user.uid}/${field}_${Date.now()}_${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('driver-documents')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data } = supabase.storage
        .from('driver-documents')
        .getPublicUrl(filePath);

      setFormData(prev => ({ ...prev, [field]: data.publicUrl }));
    } catch (error: any) {
      console.error('Upload error:', error);
      alert('Error al subir el archivo: ' + (error.message || 'Intentá de nuevo.'));
    } finally {
      setUploadingField(null);
    }
  };

  const isStep1Valid = formData.phoneNumber.length >= 10 && formData.firstName.trim().length > 1 && formData.lastName.trim().length > 1;
  const isStep2Valid = formData.dni.length > 6 && formData.email.includes('@');
  const isStep3Valid = formData.dniFrontUrl && formData.dniBackUrl && formData.licenseUrl;
  const isStep4Valid = formData.carBrand && formData.carModel && formData.carColor && formData.carPlate && formData.carPhotoUrl;

  const handleNext = () => {
    if (step === 1 && !isStep1Valid) return alert('Por favor, completá tu nombre, apellido y teléfono.');
    if (step === 2 && !isStep2Valid) return alert('Por favor, completá todos los campos obligatorios.');
    if (step === 3 && !isStep3Valid) return alert('Debes subir todos los documentos.');
    setStep(prev => prev + 1);
  };
  const handleBack = () => setStep(prev => prev - 1);

  const handleSubmit = async () => {
    if (!user || !isSupabaseConfigured) return;
    setLoading(true);
    try {
      // 1. Create a driver record
      const { data: driverData, error: driverError } = await supabase
        .from('drivers')
        .insert([{
          user_id: user.uid,
          dni: formData.dni,
          vehiculo_marca: formData.carBrand,
          vehiculo_modelo: formData.carModel,
          patente: formData.carPlate,
          vehiculo_color: formData.carColor,
          vehiculo_asientos: Number(formData.carSeats),
          sobre_mi: formData.bio,
          estado: 'pending'
        }])
        .select()
        .single();

      if (driverError) throw driverError;

      // 2. Create documents record
      const { error: docsError } = await supabase
        .from('driver_documents')
        .insert([{
          driver_id: driverData.id,
          dni_frente_url: formData.dniFrontUrl,
          dni_dorso_url: formData.dniBackUrl,
          licencia_url: formData.licenseUrl,
          auto_foto_url: formData.carPhotoUrl
        }]);

      if (docsError) throw docsError;

      // 3. Update user profile status
      const { error: userError } = await supabase
        .from('users')
        .update({
          verification_status: 'pending',
          phone_number: formData.phoneNumber,
          real_name: `${formData.firstName} ${formData.lastName}`,
          updated_at: new Date().toISOString()
        })
        .eq('id', user.uid);

      if (userError) throw userError;
      
      alert('Solicitud enviada con éxito');
      navigate('/');
    } catch (error: any) {
      console.error('Error submitting driver verification:', error);
      alert('Error al enviar la solicitud: ' + (error.message || 'Por favor, intentá de nuevo.'));
    } finally {
      setLoading(false);
    }
  };

  const renderStep1 = () => (
    <motion.div 
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="space-y-6"
    >
      <div className="text-center space-y-2">
        <div className="w-16 h-16 bg-blue-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
          <User className="w-8 h-8 text-blue-600" />
        </div>
        <h2 className="text-2xl font-bold text-gray-900">Datos Personales y Teléfono</h2>
        <p className="text-gray-500">Ingresá tu nombre y teléfono para continuar.</p>
      </div>

      <div className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-1">Nombre *</label>
            <input
              type="text"
              name="firstName"
              value={formData.firstName}
              onChange={handleInputChange}
              placeholder="Ej: Juan"
              className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-500 outline-none transition-all"
            />
          </div>
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-1">Apellido *</label>
            <input
              type="text"
              name="lastName"
              value={formData.lastName}
              onChange={handleInputChange}
              placeholder="Ej: Pérez"
              className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-500 outline-none transition-all"
            />
          </div>
        </div>
        
        <div>
          <label className="block text-sm font-bold text-gray-700 mb-1">Número de Teléfono *</label>
          <div className="relative">
            <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="tel"
              name="phoneNumber"
              value={formData.phoneNumber}
              onChange={handleInputChange}
              placeholder="+54 9 221 1234567"
              className="w-full pl-12 pr-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-500 outline-none font-medium"
            />
          </div>
        </div>
      </div>

      <button
        onClick={handleNext}
        disabled={!isStep1Valid}
        className="w-full bg-blue-600 text-white py-4 rounded-2xl font-bold text-lg hover:bg-blue-700 transition-all shadow-lg shadow-blue-100 flex items-center justify-center disabled:opacity-50"
      >
        Continuar <ArrowRight className="w-5 h-5 ml-2" />
      </button>
    </motion.div>
  );

  const renderStep2 = () => (
    <motion.div 
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="space-y-6"
    >
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-bold text-gray-900">Paso 2: Información Adicional</h2>
        <p className="text-gray-500">Completá tu información de contacto y biografía.</p>
      </div>

      <div className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-1">DNI *</label>
            <input
              type="text"
              name="dni"
              value={formData.dni}
              onChange={handleInputChange}
              placeholder="Ej: 35123456"
              className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-500 outline-none"
            />
          </div>
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-1">Email *</label>
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleInputChange}
              placeholder="tu@email.com"
              className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-500 outline-none"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-bold text-gray-700 mb-1">Sobre vos (Opcional)</label>
          <textarea
            name="bio"
            value={formData.bio}
            onChange={handleInputChange}
            placeholder="Contanos un poco de vos para tus futuros pasajeros..."
            rows={3}
            className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-500 outline-none transition-all resize-none"
          />
        </div>
      </div>

      <div className="flex space-x-4">
        <button
          onClick={handleBack}
          className="flex-1 bg-gray-100 text-gray-600 py-4 rounded-2xl font-bold text-lg hover:bg-gray-200 transition-all flex items-center justify-center"
        >
          <ArrowLeft className="w-5 h-5 mr-2" /> Volver
        </button>
        <button
          onClick={handleNext}
          disabled={!isStep2Valid}
          className="flex-[2] bg-blue-600 text-white py-4 rounded-2xl font-bold text-lg hover:bg-blue-700 transition-all shadow-lg shadow-blue-100 flex items-center justify-center disabled:opacity-50"
        >
          Siguiente <ArrowRight className="w-5 h-5 ml-2" />
        </button>
      </div>
    </motion.div>
  );

  const renderStep3 = () => (
    <motion.div 
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="space-y-6"
    >
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-bold text-gray-900">Paso 3: Documentación</h2>
        <p className="text-gray-500">Subí fotos claras de tus documentos legales.</p>
      </div>

      <div className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="block text-sm font-bold text-gray-700">DNI Frente *</label>
            <div className="relative">
              <input 
                type="file" 
                accept="image/*" 
                onChange={(e) => handleFileUpload(e, 'dniFrontUrl')}
                className="hidden" 
                id="dniFront"
              />
              <label 
                htmlFor="dniFront"
                className={`w-full h-32 rounded-2xl border-2 border-dashed flex flex-col items-center justify-center cursor-pointer transition-all ${formData.dniFrontUrl ? 'border-green-200 bg-green-50' : 'border-gray-200 bg-gray-50 hover:bg-gray-100'}`}
              >
                {uploadingField === 'dniFrontUrl' ? (
                  <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
                ) : formData.dniFrontUrl ? (
                  <img src={formData.dniFrontUrl} className="w-full h-full object-cover rounded-2xl" alt="DNI Frente" />
                ) : (
                  <>
                    <Camera className="w-8 h-8 text-gray-400 mb-2" />
                    <span className="text-xs font-bold text-gray-500">Subir Frente</span>
                  </>
                )}
              </label>
            </div>
          </div>

          <div className="space-y-2">
            <label className="block text-sm font-bold text-gray-700">DNI Dorso *</label>
            <div className="relative">
              <input 
                type="file" 
                accept="image/*" 
                onChange={(e) => handleFileUpload(e, 'dniBackUrl')}
                className="hidden" 
                id="dniBack"
              />
              <label 
                htmlFor="dniBack"
                className={`w-full h-32 rounded-2xl border-2 border-dashed flex flex-col items-center justify-center cursor-pointer transition-all ${formData.dniBackUrl ? 'border-green-200 bg-green-50' : 'border-gray-200 bg-gray-50 hover:bg-gray-100'}`}
              >
                {uploadingField === 'dniBackUrl' ? (
                  <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
                ) : formData.dniBackUrl ? (
                  <img src={formData.dniBackUrl} className="w-full h-full object-cover rounded-2xl" alt="DNI Dorso" />
                ) : (
                  <>
                    <Camera className="w-8 h-8 text-gray-400 mb-2" />
                    <span className="text-xs font-bold text-gray-500">Subir Dorso</span>
                  </>
                )}
              </label>
            </div>
          </div>
        </div>

        <div className="space-y-2">
          <label className="block text-sm font-bold text-gray-700">Carnet de Conducir *</label>
          <div className="relative">
            <input 
              type="file" 
              accept="image/*" 
              onChange={(e) => handleFileUpload(e, 'licenseUrl')}
              className="hidden" 
              id="license"
            />
            <label 
              htmlFor="license"
              className={`w-full h-40 rounded-2xl border-2 border-dashed flex flex-col items-center justify-center cursor-pointer transition-all ${formData.licenseUrl ? 'border-green-200 bg-green-50' : 'border-gray-200 bg-gray-50 hover:bg-gray-100'}`}
            >
              {uploadingField === 'licenseUrl' ? (
                <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
              ) : formData.licenseUrl ? (
                <img src={formData.licenseUrl} className="w-full h-full object-cover rounded-2xl" alt="Carnet" />
              ) : (
                <>
                  <Upload className="w-8 h-8 text-gray-400 mb-2" />
                  <span className="text-xs font-bold text-gray-500">Subir Foto del Carnet</span>
                </>
              )}
            </label>
          </div>
        </div>
      </div>

      <div className="flex space-x-4">
        <button
          onClick={handleBack}
          className="flex-1 bg-gray-100 text-gray-600 py-4 rounded-2xl font-bold text-lg hover:bg-gray-200 transition-all flex items-center justify-center"
        >
          <ArrowLeft className="w-5 h-5 mr-2" /> Volver
        </button>
        <button
          onClick={handleNext}
          disabled={!isStep3Valid}
          className="flex-[2] bg-blue-600 text-white py-4 rounded-2xl font-bold text-lg hover:bg-blue-700 transition-all shadow-lg shadow-blue-100 flex items-center justify-center disabled:opacity-50"
        >
          Siguiente <ArrowRight className="w-5 h-5 ml-2" />
        </button>
      </div>
    </motion.div>
  );

  const renderStep4 = () => (
    <motion.div 
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="space-y-6"
    >
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-bold text-gray-900">Paso 4: Vehículo</h2>
        <p className="text-gray-500">Contanos sobre el auto que vas a usar.</p>
      </div>

      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-1">Marca y Modelo *</label>
            <input
              type="text"
              name="carBrand"
              value={formData.carBrand}
              onChange={handleInputChange}
              placeholder="Ej: VW Gol"
              className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-500 outline-none"
            />
          </div>
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-1">Año *</label>
            <input
              type="text"
              name="carModel"
              value={formData.carModel}
              onChange={handleInputChange}
              placeholder="Ej: 2018"
              className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-500 outline-none"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-1">Color *</label>
            <input
              type="text"
              name="carColor"
              value={formData.carColor}
              onChange={handleInputChange}
              placeholder="Ej: Blanco"
              className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-500 outline-none"
            />
          </div>
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-1">Patente *</label>
            <input
              type="text"
              name="carPlate"
              value={formData.carPlate}
              onChange={handleInputChange}
              placeholder="Ej: ABC 123"
              className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-500 outline-none"
            />
          </div>
        </div>

        <div className="space-y-2">
          <label className="block text-sm font-bold text-gray-700">Foto del Vehículo *</label>
          <div className="relative">
            <input 
              type="file" 
              accept="image/*" 
              onChange={(e) => handleFileUpload(e, 'carPhotoUrl')}
              className="hidden" 
              id="carPhoto"
            />
            <label 
              htmlFor="carPhoto"
              className={`w-full h-48 rounded-2xl border-2 border-dashed flex flex-col items-center justify-center cursor-pointer transition-all ${formData.carPhotoUrl ? 'border-green-200 bg-green-50' : 'border-gray-200 bg-gray-50 hover:bg-gray-100'}`}
            >
              {uploadingField === 'carPhotoUrl' ? (
                <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
              ) : formData.carPhotoUrl ? (
                <img src={formData.carPhotoUrl} className="w-full h-full object-cover rounded-2xl" alt="Auto" />
              ) : (
                <>
                  <Car className="w-10 h-10 text-gray-400 mb-2" />
                  <span className="text-xs font-bold text-gray-500">Subir Foto del Auto</span>
                </>
              )}
            </label>
          </div>
        </div>
      </div>

      <div className="flex space-x-4">
        <button
          onClick={handleBack}
          className="flex-1 bg-gray-100 text-gray-600 py-4 rounded-2xl font-bold text-lg hover:bg-gray-200 transition-all flex items-center justify-center"
        >
          <ArrowLeft className="w-5 h-5 mr-2" /> Volver
        </button>
        <button
          onClick={handleSubmit}
          disabled={loading || !isStep4Valid}
          className="flex-[2] bg-green-600 text-white py-4 rounded-2xl font-bold text-lg hover:bg-green-700 transition-all shadow-lg shadow-green-100 flex items-center justify-center disabled:opacity-50"
        >
          {loading ? <Loader2 className="w-6 h-6 animate-spin" /> : 'Enviar para Verificación'}
        </button>
      </div>
    </motion.div>
  );

  return (
    <div className="max-w-2xl mx-auto py-8 px-4">
      <div className="mb-8 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="w-12 h-12 bg-blue-600 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-blue-100">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Verificación de Conductor</h1>
            <p className="text-sm text-gray-500">Completá tu perfil para empezar a manejar.</p>
          </div>
        </div>
        <div className="flex space-x-1">
          {[1, 2, 3, 4].map(i => (
            <div 
              key={i} 
              className={`h-1.5 w-8 rounded-full transition-all duration-500 ${step >= i ? 'bg-blue-600' : 'bg-gray-200'}`}
            />
          ))}
        </div>
      </div>

      {user?.verificationStatus === 'rejected' && (
        <div className="mb-8 p-6 bg-red-50 rounded-3xl border border-red-100 flex items-start space-x-4">
          <XCircle className="w-6 h-6 text-red-600 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-red-800">
            <p className="font-bold mb-1">Solicitud rechazada</p>
            <p>{user.rejectionReason || 'Tu documentación no pudo ser validada. Por favor, revisá los datos y volvé a intentarlo.'}</p>
          </div>
        </div>
      )}

      <div className="bg-white rounded-3xl p-8 border border-gray-100 shadow-xl shadow-gray-100/50">
        <AnimatePresence mode="wait">
          {step === 1 && renderStep1()}
          {step === 2 && renderStep2()}
          {step === 3 && renderStep3()}
          {step === 4 && renderStep4()}
        </AnimatePresence>
      </div>

      <div className="mt-8 p-6 bg-blue-50 rounded-2xl border border-blue-100 flex items-start space-x-4">
        <Info className="w-6 h-6 text-blue-600 flex-shrink-0 mt-0.5" />
        <div className="text-sm text-blue-800 leading-relaxed">
          <p className="font-bold mb-1">Proceso de Verificación</p>
          <p>Una vez enviada, nuestra administración revisará tu solicitud en un plazo de 24-48 horas. Recibirás una notificación cuando seas aprobado.</p>
        </div>
      </div>
    </div>
  );
}
