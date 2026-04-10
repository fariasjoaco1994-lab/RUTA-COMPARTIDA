export interface User {
  uid: string;
  displayName: string | null;
  email: string | null;
  photoURL: string | null;
  phoneNumber?: string;
  bio?: string;
  rating?: number;
  tripsCompleted?: number;
  createdAt: string;
  role?: 'user' | 'admin';
  verificationStatus?: 'none' | 'pending' | 'approved' | 'rejected';
  rejectionReason?: string;
  
  // Driver Profile Fields
  isDriver?: boolean;
  realName?: string;
  dni?: string;
  licenseUrl?: string;
  dniFrontUrl?: string;
  dniBackUrl?: string;
  carBrand?: string;
  carModel?: string;
  carPlate?: string;
  carColor?: string;
  carPhotoUrl?: string;
  carSeats?: number;
  updatedAt?: string;
}

export interface DriverVerification {
  id: string;
  userId: string;
  realName: string;
  dni: string;
  phoneNumber: string;
  email: string;
  carBrand: string;
  carModel: string;
  carPlate: string;
  carColor: string;
  carSeats: number;
  status: 'pending' | 'approved' | 'rejected';
  photoURL: string;
  bio: string;
  dniFrontUrl: string;
  dniBackUrl: string;
  licenseUrl: string;
  carPhotoUrl: string;
  createdAt: string;
  rejectionReason?: string;
}

export interface Trip {
  id: string;
  driverId: string;
  driverName: string;
  driverPhoto?: string;
  driverBio?: string;
  origin: string;
  destination: string;
  originCoords?: { lat: number; lng: number };
  destinationCoords?: { lat: number; lng: number };
  departureTime: string;
  availableSeats: number;
  pricePerSeat: number;
  montoNaftaConductor?: number;
  comisionPlataforma?: number;
  precioFinalPasajero?: number;
  distanciaKm?: number;
  description?: string;
  status: 'active' | 'completed' | 'cancelled';
  createdAt: string;
}

export interface AppConfig {
  precio_nafta_actual: number;
  consumo_estandar_100km: number;
  comision_plataforma_fija: number;
}

export interface Booking {
  id: string;
  tripId: string;
  passengerId: string;
  passengerName: string;
  seats: number;
  totalPrice: number;
  status: 'pending' | 'confirmed' | 'cancelled' | 'rejected';
  paymentId?: string;
  createdAt: string;
}

export interface Message {
  id: string;
  chatId: string;
  senderId: string;
  text: string;
  createdAt: string;
}
