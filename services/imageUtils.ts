
/**
 * Resizes and compresses a Base64 image.
 * Maintains aspect ratio while ensuring max dimension is 2048px.
 * Compresses to JPEG quality 0.7.
 */
export const compressImage = (base64Str: string): Promise<string> => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.src = base64Str;
      img.onload = () => {
        const MAX_DIMENSION = 2048;
        let width = img.width;
        let height = img.height;
  
        if (width > height) {
          if (width > MAX_DIMENSION) {
            height *= MAX_DIMENSION / width;
            width = MAX_DIMENSION;
          }
        } else {
          if (height > MAX_DIMENSION) {
            width *= MAX_DIMENSION / height;
            height = MAX_DIMENSION;
          }
        }
  
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        
        if (!ctx) {
            reject("Canvas context unavailable");
            return;
        }
  
        ctx.drawImage(img, 0, 0, width, height);
        
        // Export as JPEG with 0.7 quality
        resolve(canvas.toDataURL('image/jpeg', 0.7));
      };
      img.onerror = (err) => reject(err);
    });
  };
