import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { supabase, isSupabaseConfigured } from '../supabase';
import { motion } from 'motion/react';
import { LogIn, Mail, Lock, Loader2, AlertCircle } from 'lucide-react';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isSupabaseConfigured) {
      setError('⚠️ Configuración faltante: Debés cargar VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY en los Settings de AI Studio.');
      return;
    }
    setLoading(true);
    setError(null);

    try {
      console.log('🚀 Intentando iniciar sesión para:', email);
      const { data, error: loginError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (loginError) {
        console.error('❌ Error en Supabase Auth (Login):', loginError);
        if (loginError.message.includes('Invalid login credentials')) {
          setError('Credenciales inválidas. ¿Ya creaste tu cuenta? Si no, registrate primero.');
        } else if (loginError.message.includes('Email not confirmed')) {
          setError('Tu email aún no ha sido confirmado. Por favor, revisá tu bandeja de entrada.');
        } else {
          throw loginError;
        }
        return;
      }

      if (data.user) {
        console.log('✅ Inicio de sesión exitoso en Auth. ID:', data.user.id);
      }
      
      navigate('/');
    } catch (err: any) {
      console.error('❌ Error crítico en el flujo de login:', err);
      setError(err.message || 'Error al iniciar sesión');
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
            <LogIn className="w-8 h-8" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Bienvenido de nuevo</h1>
          <p className="text-gray-500">Iniciá sesión con tu cuenta existente</p>
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

        <form onSubmit={handleLogin} className="space-y-4">
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
            <div className="flex items-center justify-between ml-1">
              <label className="text-sm font-bold text-gray-700">Contraseña</label>
              <Link to="/forgot-password" className="text-xs font-bold text-blue-600 hover:underline">
                ¿Olvidaste tu contraseña?
              </Link>
            </div>
            <div className="relative">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-12 pr-4 py-3 rounded-2xl border border-gray-200 focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                placeholder="••••••••"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 text-white py-4 rounded-2xl font-bold text-lg hover:bg-blue-700 transition-all shadow-lg shadow-blue-100 flex items-center justify-center disabled:opacity-50"
          >
            {loading ? <Loader2 className="w-6 h-6 animate-spin" /> : 'Iniciar Sesión'}
          </button>
        </form>

        <div className="mt-6">
          <div className="relative mb-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-100"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-white text-gray-400">O continuá con</span>
            </div>
          </div>

          <button
            onClick={async () => {
              try {
                const { data, error } = await supabase.auth.signInWithOAuth({
                  provider: 'google',
                  options: {
                    redirectTo: window.location.origin,
                    skipBrowserRedirect: true,
                  }
                });
                if (error) throw error;
                
                if (data?.url) {
                  const authWindow = window.open(data.url, 'google_oauth', 'width=600,height=700');
                  if (!authWindow) {
                    setError('El navegador bloqueó la ventana emergente. Por favor, permití las ventanas emergentes.');
                  }
                }
              } catch (err: any) {
                setError(err.message || 'Error al conectar con Google');
              }
            }}
            className="w-full bg-white border border-gray-200 text-gray-700 py-3 rounded-2xl font-bold hover:bg-gray-50 transition-all flex items-center justify-center space-x-2"
          >
            <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" className="w-5 h-5" alt="" />
            <span>Google</span>
          </button>
        </div>

        <p className="mt-8 text-center text-gray-500">
          ¿No tenés cuenta?{' '}
          <Link to="/register" className="text-blue-600 font-bold hover:underline">
            Registrate acá
          </Link>
        </p>
      </motion.div>
    </div>
  );
}
