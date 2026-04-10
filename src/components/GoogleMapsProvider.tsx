import React, { createContext, useContext, useEffect, useState } from 'react';
import { setOptions, importLibrary } from '@googlemaps/js-api-loader';

const GoogleMapsContext = createContext<boolean>(false);

export function GoogleMapsProvider({ children }: { children: React.ReactNode }) {
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    const apiKey = (import.meta as any).env.VITE_GOOGLE_MAPS_API_KEY || '';
    
    if (!apiKey) {
      console.warn('VITE_GOOGLE_MAPS_API_KEY is missing');
      return;
    }

    (setOptions as any)({
      apiKey,
      version: 'weekly',
    });

    Promise.all([
      importLibrary('places'),
      importLibrary('maps')
    ]).then(() => {
      setIsLoaded(true);
    }).catch((e) => {
      console.error('Error loading Google Maps:', e);
    });
  }, []);

  return (
    <GoogleMapsContext.Provider value={isLoaded}>
      {children}
    </GoogleMapsContext.Provider>
  );
}

export const useGoogleMaps = () => useContext(GoogleMapsContext);
