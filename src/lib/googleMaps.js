const GMAPS_KEY = 'AIzaSyBrnc0DymMPO5Qbki2Ijqo6pXxOcmXT9AU';

// Cargador de script de Google Maps seguro y único
let gmapsLoadingPromise = null;
export const loadGoogleMaps = () => {
  if (window.google && window.google.maps) {
    return Promise.resolve(window.google.maps);
  }
  if (!gmapsLoadingPromise) {
    gmapsLoadingPromise = new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = `https://maps.googleapis.com/maps/api/js?key=${GMAPS_KEY}&libraries=places`;
      script.async = true;
      script.defer = true;
      script.onload = () => resolve(window.google.maps);
      script.onerror = () => reject(new Error('Error cargando Google Maps API'));
      document.head.appendChild(script);
    });
  }
  return gmapsLoadingPromise;
};
