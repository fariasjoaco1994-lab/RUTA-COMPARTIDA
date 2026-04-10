import { useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase, isSupabaseConfigured } from '../supabase';
import { motion } from 'motion/react';
import { Mail, Loader2, AlertCircle, CheckCircle, ArrowLeft } from 'lucide-react';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [mode, setMode] = useState<'reset' | 'magic'>('reset');

  const handleAuthAction = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isSupabaseConfigured) {
      setError('La configuración de Supabase no es válida.');
      return;
    }
    setLoading(true);
    setError(null);

    try {
      if (mode === 'reset') {
        const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: `${window.location.origin}/reset-password`,
        });
        if (resetError) throw resetError;
      } else {
        const { error: magicError } = await supabase.auth.signInWithOtp({
          email,
          options: {
            emailRedirectTo: `${window.location.origin}`,
          }
        });
        if (magicError) throw magicError;
      }
      setSuccess(true);
    } catch (err: any) {
      setError(err.message || 'Error al procesar la solicitud');
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
        <Link to="/login" className="inline-flex items-center text-sm text-gray-500 hover:text-blue-600 mb-6 transition-colors font-medium">
          <ArrowLeft className="w-4 h-4 mr-1" /> Volver al login
        </Link>

        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-blue-600 rounded-2xl flex items-center justify-center text-white mx-auto mb-4 shadow-lg shadow-blue-100">
            <Mail className="w-8 h-8" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">
            {mode === 'reset' ? 'Recuperar contraseña' : 'Acceso rápido'}
          </h1>
          <p className="text-gray-500">
            {mode === 'reset' 
              ? 'Te enviaremos un link para restablecerla' 
              : 'Te enviaremos un link para entrar sin contraseña'}
          </p>
        </div>

        {success ? (
          <div className="text-center space-y-6">
            <div className="p-6 bg-green-50 rounded-2xl border border-green-100 space-y-3">
              <CheckCircle className="w-10 h-10 text-green-600 mx-auto" />
              <div className="text-green-800 text-sm font-medium">
                <p className="font-bold text-base mb-1">¡Correo enviado!</p>
                <p>Revisá tu bandeja de entrada y la carpeta de <strong>Spam</strong>.</p>
                <p className="mt-2 text-xs opacity-75">Nota: Supabase limita el envío a 3 correos por hora.</p>
              </div>
            </div>
            <Link
              to="/login"
              className="block w-full bg-blue-600 text-white py-4 rounded-2xl font-bold text-lg hover:bg-blue-700 transition-all shadow-lg shadow-blue-100"
            >
              Ir al inicio
            </Link>
          </div>
        ) : (
          <>
            {error && (
              <div className="mb-6 p-4 bg-red-50 rounded-2xl border border-red-100 flex items-start space-x-3 text-red-800 text-sm">
                <AlertCircle className="w-5 h-5 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleAuthAction} className="space-y-6">
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

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-blue-600 text-white py-4 rounded-2xl font-bold text-lg hover:bg-blue-700 transition-all shadow-lg shadow-blue-100 flex items-center justify-center disabled:opacity-50"
              >
                {loading ? <Loader2 className="w-6 h-6 animate-spin" /> : mode === 'reset' ? 'Enviar link de recuperación' : 'Enviar link de acceso'}
              </button>
            </form>

            <div className="mt-8 pt-6 border-t border-gray-100 text-center">
              <button
                onClick={() => setMode(mode === 'reset' ? 'magic' : 'reset')}
                className="text-sm font-bold text-blue-600 hover:underline"
              >
                {mode === 'reset' 
                  ? '¿Preferís entrar con un link mágico?' 
                  : 'Volver a recuperación de contraseña'}
              </button>
            </div>
          </>
        )}
      </motion.div>
    </div>
  );
}
