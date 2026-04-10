import { useState, useEffect } from 'react';
import { supabase, isSupabaseConfigured } from '../supabase';
import { User } from '../types';

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isSupabaseConfigured) {
      setLoading(false);
      return;
    }

    // 1. Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        console.log('📦 Sesión inicial encontrada para:', session.user.email);
        fetchUserProfile(session.user.id);
      } else {
        console.log('📦 No hay sesión inicial');
        setLoading(false);
      }
    });

    // 2. Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      console.log('🔔 Cambio de estado Auth:', event);
      if (session) {
        console.log('👤 Usuario autenticado:', session.user.email);
        fetchUserProfile(session.user.id);
      } else {
        console.log('👤 Usuario desautenticado');
        setUser(null);
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  async function fetchUserProfile(uid: string) {
    console.log('🔍 Buscando perfil en tabla "users" para UID:', uid);
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', uid)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          console.log('⚠️ Perfil no encontrado en tabla "users". Intentando crear uno...');
          // User profile doesn't exist yet, create it
          const { data: authUser } = await supabase.auth.getUser();
          if (authUser.user) {
            console.log('📝 Datos de Auth para el nuevo perfil:', authUser.user.user_metadata);
            const newUser: User = {
              uid: authUser.user.id,
              displayName: authUser.user.user_metadata.display_name || authUser.user.email?.split('@')[0] || 'Usuario',
              email: authUser.user.email || '',
              photoURL: authUser.user.user_metadata.avatar_url || '',
              phoneNumber: authUser.user.user_metadata.phone || '',
              createdAt: new Date().toISOString(),
            };
            
            console.log('📤 Insertando nuevo perfil en tabla "users":', newUser);
            const { error: insertError } = await supabase
              .from('users')
              .insert([{
                id: newUser.uid,
                display_name: newUser.displayName,
                email: newUser.email,
                photo_url: newUser.photoURL,
                phone_number: newUser.phoneNumber,
                created_at: newUser.createdAt,
                role: 'user',
                verification_status: 'none'
              }]);

            if (insertError) {
              console.error('❌ Error al crear perfil en tabla "users":', insertError);
              setError('Error al crear el perfil de usuario. Verificá la consola para más detalles.');
            } else {
              console.log('✅ Perfil creado exitosamente en tabla "users"');
              setUser(newUser);
            }
          }
        } else {
          console.error('❌ Error al obtener perfil:', error);
          setError('Error al cargar el perfil de usuario.');
        }
      } else {
        console.log('✅ Perfil encontrado:', data.display_name);
        // Map Supabase snake_case to our camelCase User interface
        setUser({
          uid: data.id,
          displayName: data.display_name,
          email: data.email,
          photoURL: data.photo_url,
          phoneNumber: data.phone_number,
          bio: data.bio,
          rating: data.rating,
          tripsCompleted: data.trips_completed,
          createdAt: data.created_at,
          role: data.role,
          verificationStatus: data.verification_status,
          rejectionReason: data.rejection_reason,
          isDriver: data.is_driver,
          realName: data.real_name,
          dni: data.dni,
          licenseUrl: data.license_url,
          dniFrontUrl: data.dni_front_url,
          dniBackUrl: data.dni_back_url,
          carBrand: data.car_brand,
          carModel: data.car_model,
          carPlate: data.car_plate,
          carColor: data.car_color,
          carPhotoUrl: data.car_photo_url,
          carSeats: data.car_seats,
          updatedAt: data.updated_at
        });
      }
    } catch (err) {
      console.error('Unexpected error in fetchUserProfile:', err);
    } finally {
      setLoading(false);
    }
  }

  return { user, loading, error };
}
