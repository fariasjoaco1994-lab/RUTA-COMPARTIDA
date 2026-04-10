import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '../supabase';
import { useAuth } from '../hooks/useAuth';
import { Car, Search, PlusCircle, User, LogOut, Menu, X, Shield, LogIn, UserPlus } from 'lucide-react';
import { useState } from 'react';
import { cn } from '../lib/utils';

export default function Navbar() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);

  const adminEmails = ['farias.joaco1994@gmail.com', 'MROSA.ZALAZAR@OUTLOOK.COM'];
  const isAdmin = user?.role === 'admin' || (user?.email && adminEmails.includes(user.email));

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/');
  };

  return (
    <nav className="bg-white border-b border-gray-100 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16 items-center">
          <Link to="/" className="flex items-center space-x-2">
            <div className="bg-blue-600 p-2 rounded-xl">
              <Car className="text-white w-6 h-6" />
            </div>
            <span className="text-2xl font-bold text-gray-900 tracking-tight">RUTA COMPARTIDA</span>
          </Link>

          {/* Desktop Nav */}
          <div className="hidden md:flex items-center space-x-8">
            <Link to="/" className="text-gray-600 hover:text-blue-600 font-medium flex items-center gap-2">
              <Search className="w-4 h-4" /> Buscar
            </Link>
            <Link to="/create-trip" className="text-gray-600 hover:text-blue-600 font-medium flex items-center gap-2">
              <PlusCircle className="w-4 h-4" /> Publicar viaje
            </Link>
            {user ? (
              <div className="flex items-center space-x-4">
                {isAdmin && (
                  <Link to="/admin" className="text-blue-600 hover:text-blue-700 font-bold flex items-center gap-1">
                    <Shield className="w-4 h-4" /> Admin
                  </Link>
                )}
                <Link to="/my-trips" className="text-gray-600 hover:text-blue-600 font-medium">Mis Viajes</Link>
                <Link to="/profile" className="flex items-center space-x-2 bg-gray-50 px-3 py-1.5 rounded-full border border-gray-200 hover:bg-gray-100 transition-colors">
                  {user.photoURL ? (
                    <img src={user.photoURL} alt="" className="w-6 h-6 rounded-full" referrerPolicy="no-referrer" />
                  ) : (
                    <User className="w-4 h-4 text-gray-600" />
                  )}
                  <span className="text-sm font-medium text-gray-700">{user.displayName?.split(' ')[0]}</span>
                </Link>
                <button onClick={handleLogout} className="text-gray-400 hover:text-red-500 transition-colors">
                  <LogOut className="w-5 h-5" />
                </button>
              </div>
            ) : (
              <div className="flex items-center space-x-4">
                <Link
                  to="/login"
                  className="text-gray-600 hover:text-blue-600 font-bold flex items-center gap-2"
                >
                  <LogIn className="w-4 h-4" /> Ingresar
                </Link>
                <Link
                  to="/register"
                  className="bg-blue-600 text-white px-6 py-2 rounded-full font-semibold hover:bg-blue-700 transition-all shadow-sm flex items-center gap-2"
                >
                  <UserPlus className="w-4 h-4" /> Registrarse
                </Link>
              </div>
            )}
          </div>

          {/* Mobile Menu Button */}
          <div className="md:hidden">
            <button onClick={() => setIsOpen(!isOpen)} className="text-gray-600 p-2">
              {isOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Nav */}
      <div className={cn(
        "md:hidden absolute top-16 left-0 w-full bg-white border-b border-gray-100 transition-all duration-200 ease-in-out overflow-hidden shadow-xl",
        isOpen ? "max-h-96 opacity-100" : "max-h-0 opacity-0"
      )}>
        <div className="px-4 pt-2 pb-6 space-y-4">
          <Link to="/" onClick={() => setIsOpen(false)} className="block text-lg font-medium text-gray-700 py-2">Buscar viaje</Link>
          <Link to="/create-trip" onClick={() => setIsOpen(false)} className="block text-lg font-medium text-gray-700 py-2">Publicar viaje</Link>
          {user ? (
            <>
              {isAdmin && (
                <Link to="/admin" onClick={() => setIsOpen(false)} className="block text-lg font-bold text-blue-600 py-2 flex items-center gap-2">
                  <Shield className="w-5 h-5" /> Panel Admin
                </Link>
              )}
              <Link to="/my-trips" onClick={() => setIsOpen(false)} className="block text-lg font-medium text-gray-700 py-2">Mis Viajes</Link>
              <Link to="/profile" onClick={() => setIsOpen(false)} className="block text-lg font-medium text-gray-700 py-2">Mi Perfil</Link>
              <button onClick={handleLogout} className="w-full text-left text-lg font-medium text-red-600 py-2">Cerrar sesión</button>
            </>
          ) : (
            <div className="space-y-3">
              <Link
                to="/login"
                onClick={() => setIsOpen(false)}
                className="block w-full text-center text-lg font-medium text-gray-700 py-3 border border-gray-200 rounded-xl"
              >
                Ingresar
              </Link>
              <Link
                to="/register"
                onClick={() => setIsOpen(false)}
                className="block w-full bg-blue-600 text-white px-6 py-3 rounded-xl font-semibold text-center hover:bg-blue-700 transition-all"
              >
                Registrarse
              </Link>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
}
