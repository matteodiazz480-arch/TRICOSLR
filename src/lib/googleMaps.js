const GMAPS_KEY = 'AIzaSyBrnc0DymMPO5Qbki2Ijqo6pXxOcmXT9AU';

// Cargador de script de Google Maps seguro, único y reactivo
let gmapsLoadingPromise = null;

export const loadGoogleMaps = () => {
  if (typeof window === 'undefined') {
    return Promise.reject(new Error('Window no está disponible'));
  }

  if (window.google && window.google.maps) {
    return Promise.resolve(window.google.maps);
  }

  if (!gmapsLoadingPromise) {
    gmapsLoadingPromise = new Promise((resolve, reject) => {
      const existingScript = document.querySelector('script[src*="maps.googleapis.com"]');
      if (existingScript) {
        if (window.google && window.google.maps) {
          resolve(window.google.maps);
          return;
        }
        existingScript.addEventListener('load', () => resolve(window.google.maps));
        existingScript.addEventListener('error', (err) => {
          gmapsLoadingPromise = null;
          reject(err);
        });
        return;
      }

      const script = document.createElement('script');
      script.src = `https://maps.googleapis.com/maps/api/js?key=${GMAPS_KEY}&libraries=places`;
      script.async = true;
      script.defer = true;
      script.onload = () => resolve(window.google.maps);
      script.onerror = (err) => {
        gmapsLoadingPromise = null;
        reject(new Error('Error cargando Google Maps API'));
      };
      document.head.appendChild(script);
    });
  }

  return gmapsLoadingPromise;
};
