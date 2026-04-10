import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { supabase, isSupabaseConfigured } from '../supabase';
import { motion } from 'motion/react';
import { UserPlus, Mail, Lock, User, Loader2, AlertCircle, Phone } from 'lucide-react';

export default function Register() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const navigate = useNavigate();

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    console.log('🚀 Iniciando proceso de registro...');
    console.log('📧 Email:', email);
    console.log('👤 Nombre:', firstName, lastName);
    console.log('📞 Teléfono:', phone);

    if (!isSupabaseConfigured) {
      console.error('❌ Supabase no está configurado');
      setError('⚠️ Configuración faltante: Debés cargar VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY en los Settings de AI Studio.');
      return;
    }
    setLoading(true);
    setError(null);
    setSuccess(false);

    try {
      // 1. Crear usuario en Supabase Auth
      console.log('1️⃣ Intentando crear usuario en Supabase Auth...');
      const { data: authData, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            display_name: `${firstName} ${lastName}`,
            first_name: firstName,
            last_name: lastName,
            phone: phone
          },
        },
      });

      if (signUpError) {
        console.error('❌ Error en Supabase Auth:', signUpError);
        throw signUpError;
      }

      if (!authData.user) {
        console.error('❌ No se recibió información del usuario de Auth');
        throw new Error('No se pudo crear el usuario en Auth');
      }

      console.log('✅ Usuario creado en Auth con ID:', authData.user.id);
      console.log('ℹ️ El perfil se creará automáticamente en la tabla "users" mediante el Trigger de la base de datos.');
      
      setSuccess(true);

    } catch (err: any) {
      console.error('❌ Error crítico en el flujo de registro:', err);
      setError(err.message || 'Error al registrarse');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto py-12 px-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white rounded-[32px] p-8 shadow-xl border border-gray-100"
      >
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-blue-600 rounded-2xl flex items-center justify-center text-white mx-auto mb-4 shadow-lg shadow-blue-100">
            <UserPlus className="w-8 h-8" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Crear cuenta</h1>
          <p className="text-gray-500">Unite a nuestra comunidad de viajes</p>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 rounded-2xl border border-red-100 flex items-start space-x-3 text-red-800 text-sm">
            <AlertCircle className="w-5 h-5 shrink-0" />
            <div className="flex flex-col">
              <span className="font-bold">Error</span>
              <span>{error}</span>
              {!isSupabaseConfigured && (
                <div className="mt-2 p-2 bg-white rounded-lg border border-red-200 text-xs">
                  <p className="font-bold mb-1">Cómo solucionar:</p>
                  <ol className="list-decimal ml-4 space-y-1">
                    <li>Andá al engranaje ⚙️ (Settings)</li>
                    <li>Buscá "Environment Variables"</li>
                    <li>Agregá las llaves de tu proyecto de Supabase</li>
                  </ol>
                </div>
              )}
            </div>
          </div>
        )}

        {success && (
          <div className="mb-6 p-6 bg-blue-50 rounded-2xl border border-blue-100 text-center space-y-4">
            <div className="w-12 h-12 bg-blue-600 rounded-full flex items-center justify-center text-white mx-auto">
              <Mail className="w-6 h-6" />
            </div>
            <div className="space-y-2">
              <h3 className="font-bold text-blue-900 text-lg">¡Casi listo!</h3>
              <p className="text-blue-800 text-sm">
                Hemos enviado un correo de confirmación a <strong>{email}</strong>.
              </p>
              <p className="text-blue-700 text-xs bg-white/50 p-3 rounded-xl">
                <strong>Importante:</strong> Debés hacer clic en el link del correo para que tu cuenta se active. Si no lo hacés, no podrás ingresar.
              </p>
            </div>
            <div className="flex flex-col space-y-2">
              <button 
                onClick={() => navigate('/login')}
                className="text-blue-600 font-bold text-sm hover:underline"
              >
                Ir al inicio de sesión
              </button>
              <button 
                onClick={async () => {
                  setLoading(true);
                  const { error } = await supabase.auth.resend({
                    type: 'signup',
                    email: email,
                  });
                  setLoading(false);
                  if (error) {
                    setError('Error al reenviar: ' + error.message);
                  } else {
                    alert('Correo reenviado con éxito.');
                  }
                }}
                className="text-gray-500 text-xs hover:text-blue-600 transition-colors"
              >
                ¿No te llegó? Reenviar correo
              </button>
            </div>
          </div>
        )}

        <form onSubmit={handleRegister} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-sm font-bold text-gray-700 ml-1">Nombre</label>
              <div className="relative">
                <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  required
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  className="w-full pl-12 pr-4 py-3 rounded-2xl border border-gray-200 focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                  placeholder="Juan"
                />
              </div>
            </div>
            <div className="space-y-1">
              <label className="text-sm font-bold text-gray-700 ml-1">Apellido</label>
              <div className="relative">
                <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  required
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  className="w-full pl-12 pr-4 py-3 rounded-2xl border border-gray-200 focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                  placeholder="Pérez"
                />
              </div>
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-sm font-bold text-gray-700 ml-1">Teléfono</label>
            <div className="relative">
              <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="tel"
                required
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full pl-12 pr-4 py-3 rounded-2xl border border-gray-200 focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                placeholder="+54 9 11 ..."
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-sm font-bold text-gray-700 ml-1">Email</label>
            <div className="relative">
              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full pl-12 pr-4 py-3 rounded-2xl border border-gray-200 focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                placeholder="tu@email.com"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-sm font-bold text-gray-700 ml-1">Contraseña</label>
            <div className="relative">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-12 pr-4 py-3 rounded-2xl border border-gray-200 focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                placeholder="Mínimo 6 caracteres"
                minLength={6}
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 text-white py-4 rounded-2xl font-bold text-lg hover:bg-blue-700 transition-all shadow-lg shadow-blue-100 flex items-center justify-center disabled:opacity-50"
          >
            {loading ? <Loader2 className="w-6 h-6 animate-spin" /> : 'Registrarse'}
          </button>
        </form>

        <p className="mt-8 text-center text-gray-500">
          ¿Ya tenés cuenta?{' '}
          <Link to="/login" className="text-blue-600 font-bold hover:underline">
            Iniciá sesión acá
          </Link>
        </p>
      </motion.div>
    </div>
  );
}
