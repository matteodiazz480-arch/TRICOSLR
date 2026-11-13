/**
 * Utilidad de compresión y optimización de imágenes en el navegador.
 * Convierte archivos subidos por drag-and-drop o selector de archivos a DataURLs ligeros.
 */
export const compressImageFile = (file, maxWidth = 800, maxHeight = 800, quality = 0.82) => {
  return new Promise((resolve, reject) => {
    if (!file || !file.type.startsWith('image/')) {
      return reject(new Error('El archivo seleccionado no es una imagen válida'));
    }

    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Error leyendo el archivo'));
    reader.onload = (e) => {
      const img = new Image();
      img.onerror = () => reject(new Error('Error decodificando la imagen'));
      img.onload = () => {
        let width = img.width;
        let height = img.height;

        // Mantener proporción de aspecto
        if (width > height) {
          if (width > maxWidth) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          }
        } else {
          if (height > maxHeight) {
            width = Math.round((width * maxHeight) / height);
            height = maxHeight;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          return resolve(e.target.result); // Fallback a DataURL original si canvas falla
        }

        // Fondo blanco por si la imagen tiene transparencia en JPEG
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, width, height);
        ctx.drawImage(img, 0, 0, width, height);

        try {
          const compressed = canvas.toDataURL('image/jpeg', quality);
          resolve(compressed);
        } catch {
          resolve(e.target.result);
        }
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  });
};
