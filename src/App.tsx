import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { GoogleMapsProvider } from './components/GoogleMapsProvider';
import Navbar from './components/Navbar';
import Home from './pages/Home';
import Login from './pages/Login';
import Register from './pages/Register';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';
import CreateTrip from './pages/CreateTrip';
import TripDetails from './pages/TripDetails';
import Profile from './pages/Profile';
import MyTrips from './pages/MyTrips';
import BookingStatus from './pages/BookingStatus';
import DriverProfile from './pages/DriverProfile';
import AdminDashboard from './pages/AdminDashboard';
import { useAuth } from './hooks/useAuth';

export default function App() {
  const { loading, error: authError } = useAuth();
  const isSupabaseConfigured = import.meta.env.VITE_SUPABASE_URL && import.meta.env.VITE_SUPABASE_ANON_KEY;

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <GoogleMapsProvider>
      <Router>
        <div className="min-h-screen bg-gray-50 font-sans text-gray-900">
          <Navbar />
          <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />
              <Route path="/forgot-password" element={<ForgotPassword />} />
              <Route path="/reset-password" element={<ResetPassword />} />
              <Route path="/create-trip" element={<CreateTrip />} />
              <Route path="/trip/:id" element={<TripDetails />} />
              <Route path="/profile" element={<Profile />} />
              <Route path="/my-trips" element={<MyTrips />} />
              <Route path="/driver-profile" element={<DriverProfile />} />
              <Route path="/admin" element={<AdminDashboard />} />
              <Route path="/booking-success" element={<BookingStatus />} />
              <Route path="/booking-failure" element={<BookingStatus />} />
              <Route path="/booking-pending" element={<BookingStatus />} />
            </Routes>
          </main>
        </div>
      </Router>
    </GoogleMapsProvider>
  );
}
