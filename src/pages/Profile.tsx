import { useState, useRef } from 'react';
import { useAuth } from '../hooks/useAuth';
import { User as UserIcon, ShieldCheck, MapPin, Calendar, Star, Settings, CheckCircle, Car, Camera, Loader2, Save, X } from 'lucide-react';
import { formatDate } from '../lib/utils';
import { supabase, isSupabaseConfigured } from '../supabase';
import { motion, AnimatePresence } from 'motion/react';

export default function Profile() {
  const { user } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [editData, setEditData] = useState({
    displayName: user?.displayName || '',
    phoneNumber: user?.phoneNumber || '+549',
    bio: user?.bio || '',
    photoURL: user?.photoURL || '',
    carBrand: user?.carBrand || '',
    carModel: user?.carModel || '',
    carPlate: user?.carPlate || '',
    carColor: user?.carColor || '',
    carSeats: user?.carSeats || 3,
  });

  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!user) return <div className="text-center py-20">Iniciá sesión para ver tu perfil</div>;

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    
    if (name === 'phoneNumber') {
      const prefix = '+549';
      if (!value.startsWith(prefix)) {
        setEditData(prev => ({ ...prev, [name]: prefix }));
        return;
      }
    }
    
    setEditData(prev => ({ ...prev, [name]: value }));
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user || !isSupabaseConfigured) return;

    setUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Math.random()}.${fileExt}`;
      const filePath = `${user.uid}/profile_${Date.now()}_${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('driver-documents') // Using the same bucket for simplicity
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data } = supabase.storage
        .from('driver-documents')
        .getPublicUrl(filePath);

      setEditData(prev => ({ ...prev, photoURL: data.publicUrl }));
    } catch (error: any) {
      console.error('Error uploading photo:', error);
      alert('Error al subir la foto: ' + error.message);
    } finally {
      setUploading(false);
    }
  };

  const handleSave = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const { error } = await supabase
        .from('users')
        .update({
          display_name: editData.displayName,
          phone_number: editData.phoneNumber,
          bio: editData.bio,
          photo_url: editData.photoURL,
          car_brand: editData.carBrand,
          car_model: editData.carModel,
          car_plate: editData.carPlate,
          car_color: editData.carColor,
          car_seats: editData.carSeats,
          updated_at: new Date().toISOString()
        })
        .eq('id', user.uid);

      if (error) throw error;

      setIsEditing(false);
      alert('Perfil actualizado con éxito');
    } catch (error: any) {
      console.error('Error updating profile:', error);
      alert('Error al actualizar el perfil: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div className="bg-white rounded-3xl p-8 border border-gray-100 shadow-sm relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-32 bg-blue-600" />
        
        <div className="relative pt-16 flex flex-col md:flex-row items-end gap-6 px-4">
          <div className="relative group">
            {editData.photoURL ? (
              <img src={editData.photoURL} alt="" className="w-32 h-32 rounded-3xl border-4 border-white shadow-lg object-cover" referrerPolicy="no-referrer" />
            ) : (
              <div className="w-32 h-32 bg-gray-100 rounded-3xl border-4 border-white shadow-lg flex items-center justify-center">
                <UserIcon className="w-12 h-12 text-gray-400" />
              </div>
            )}
            
            {isEditing && (
              <button 
                onClick={() => fileInputRef.current?.click()}
                className="absolute inset-0 bg-black/40 rounded-3xl flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
              >
                {uploading ? <Loader2 className="w-8 h-8 text-white animate-spin" /> : <Camera className="w-8 h-8 text-white" />}
              </button>
            )}
            <input 
              type="file" 
              ref={fileInputRef} 
              onChange={handleFileUpload} 
              className="hidden" 
              accept="image/*" 
            />

            {!isEditing && (
              <div className="absolute -bottom-2 -right-2 bg-green-500 p-2 rounded-xl border-4 border-white shadow-sm">
                <ShieldCheck className="w-5 h-5 text-white" />
              </div>
            )}
          </div>
          
          <div className="flex-1 pb-2">
            {isEditing ? (
              <input
                type="text"
                name="displayName"
                value={editData.displayName}
                onChange={handleInputChange}
                className="text-3xl font-bold text-gray-900 bg-gray-50 border-b-2 border-blue-600 outline-none px-2 py-1 w-full max-w-md"
              />
            ) : (
              <h1 className="text-3xl font-bold text-gray-900">{user.displayName}</h1>
            )}
            <p className="text-gray-500 font-medium">{user.email}</p>
          </div>

          <div className="flex gap-2 mb-2">
            {isEditing ? (
              <>
                <button 
                  onClick={() => setIsEditing(false)}
                  className="p-3 bg-gray-100 text-gray-600 rounded-xl hover:bg-gray-200 transition-colors"
                >
                  <X className="w-6 h-6" />
                </button>
                <button 
                  onClick={handleSave}
                  disabled={loading}
                  className="p-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors shadow-lg shadow-blue-100 disabled:opacity-50"
                >
                  {loading ? <Loader2 className="w-6 h-6 animate-spin" /> : <Save className="w-6 h-6" />}
                </button>
              </>
            ) : (
              <button 
                onClick={() => setIsEditing(true)}
                className="p-3 bg-gray-50 rounded-xl text-gray-600 hover:bg-gray-100 transition-colors"
              >
                <Settings className="w-6 h-6" />
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <div className="md:col-span-1 space-y-8">
          <div className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm space-y-6">
            <h3 className="font-bold text-gray-900">Estadísticas</h3>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-gray-500 text-sm">Calificación</span>
                <div className="flex items-center font-bold text-gray-900">
                  <Star className="w-4 h-4 text-yellow-400 mr-1 fill-yellow-400" />
                  {(user.rating && !isNaN(user.rating)) ? user.rating : '5.0'}
                </div>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-500 text-sm">Viajes realizados</span>
                <span className="font-bold text-gray-900">{user.tripsCompleted || 0}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-500 text-sm">Miembro desde</span>
                <span className="font-bold text-gray-900">{new Date(user.createdAt).getFullYear()}</span>
              </div>
            </div>
          </div>

          {isEditing && (
            <div className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm space-y-4">
              <h3 className="font-bold text-gray-900">Contacto</h3>
              <div>
                <label className="block text-xs font-bold text-gray-400 uppercase mb-1">Teléfono</label>
                <input
                  type="tel"
                  name="phoneNumber"
                  value={editData.phoneNumber}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 bg-gray-50 rounded-lg border border-gray-200 outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          )}
        </div>

        <div className="md:col-span-2 space-y-8">
          <div className="bg-white rounded-3xl p-8 border border-gray-100 shadow-sm">
            <h3 className="font-bold text-gray-900 mb-4">Sobre mí</h3>
            {isEditing ? (
              <textarea
                name="bio"
                value={editData.bio}
                onChange={handleInputChange}
                rows={4}
                className="w-full px-4 py-3 bg-gray-50 rounded-xl border border-gray-200 outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                placeholder="Contanos algo sobre vos..."
              />
            ) : (
              <p className="text-gray-600 leading-relaxed">
                {user.bio || "Este usuario aún no ha escrito una biografía."}
              </p>
            )}
          </div>

          {isEditing && user.isDriver && (
            <div className="bg-white rounded-3xl p-8 border border-gray-100 shadow-sm space-y-6">
              <h3 className="font-bold text-gray-900">Datos del Vehículo</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-400 uppercase mb-1">Marca</label>
                  <input
                    type="text"
                    name="carBrand"
                    value={editData.carBrand}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 bg-gray-50 rounded-lg border border-gray-200 outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-400 uppercase mb-1">Modelo</label>
                  <input
                    type="text"
                    name="carModel"
                    value={editData.carModel}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 bg-gray-50 rounded-lg border border-gray-200 outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-400 uppercase mb-1">Patente</label>
                  <input
                    type="text"
                    name="carPlate"
                    value={editData.carPlate}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 bg-gray-50 rounded-lg border border-gray-200 outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-400 uppercase mb-1">Color</label>
                  <input
                    type="text"
                    name="carColor"
                    value={editData.carColor}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 bg-gray-50 rounded-lg border border-gray-200 outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
            </div>
          )}

          <div className="bg-white rounded-3xl p-8 border border-gray-100 shadow-sm">
            <h3 className="font-bold text-gray-900 mb-6">Verificaciones</h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-green-50 rounded-2xl border border-green-100">
                <div className="flex items-center">
                  <div className="bg-green-500 p-2 rounded-lg mr-4">
                    <ShieldCheck className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <p className="font-bold text-green-900">Email verificado</p>
                    <p className="text-sm text-green-700">{user.email}</p>
                  </div>
                </div>
                <CheckCircle className="w-6 h-6 text-green-500" />
              </div>

              {user.phoneNumber && (
                <div className="flex items-center justify-between p-4 bg-green-50 rounded-2xl border border-green-100">
                  <div className="flex items-center">
                    <div className="bg-green-500 p-2 rounded-lg mr-4">
                      <ShieldCheck className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <p className="font-bold text-green-900">Teléfono verificado</p>
                      <p className="text-sm text-green-700">{user.phoneNumber}</p>
                    </div>
                  </div>
                  <CheckCircle className="w-6 h-6 text-green-500" />
                </div>
              )}
              
              {user.isDriver && (
                <div className="flex items-center justify-between p-4 bg-blue-50 rounded-2xl border border-blue-100">
                  <div className="flex items-center">
                    <div className="bg-blue-500 p-2 rounded-lg mr-4">
                      <ShieldCheck className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <p className="font-bold text-blue-900">Conductor verificado</p>
                      <p className="text-sm text-blue-700">DNI y documentación validada</p>
                    </div>
                  </div>
                  <CheckCircle className="w-6 h-6 text-blue-500" />
                </div>
              )}
            </div>
          </div>

          {user.isDriver && (
            <div className="bg-white rounded-3xl p-8 border border-gray-100 shadow-sm">
              <h3 className="font-bold text-gray-900 mb-6">Mi Vehículo</h3>
              <div className="flex items-center space-x-6">
                <div className="w-32 h-24 bg-gray-100 rounded-2xl overflow-hidden">
                  {user.carPhotoUrl ? (
                    <img src={user.carPhotoUrl} alt="Auto" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Car className="w-8 h-8 text-gray-400" />
                    </div>
                  )}
                </div>
                <div className="space-y-1">
                  <p className="text-lg font-bold text-gray-900">{user.carBrand} {user.carModel}</p>
                  <p className="text-sm text-gray-500">Color: {user.carColor}</p>
                  <p className="text-sm text-gray-500">Asientos: {user.carSeats || 0}</p>
                  <p className="text-xs font-mono bg-gray-100 px-2 py-1 rounded inline-block mt-2">Patente: {user.carPlate}</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
