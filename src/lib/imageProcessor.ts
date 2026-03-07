export async function applySafetyFilter(base64Input: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error("Could not get canvas context"));
        return;
      }
      ctx.drawImage(img, 0, 0);
      
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const data = imageData.data;
      
      // Threshold level (0-255). 
      // We use a lower threshold to wash out mid-tones (shading, skin) into white,
      // keeping only the darkest elements (text, strong outlines) as black.
      // Previously 200, which turned mid-tones black (creating silhouettes).
      // Now 100, which turns mid-tones white.
      const threshold = 100; 

      for (let i = 0; i < data.length; i += 4) {
        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];
        
        // Grayscale (luminance)
        const gray = 0.299 * r + 0.587 * g + 0.114 * b;
        
        // Binarize
        // If it's lighter than threshold (mid-tones + highlights), make it white.
        // If it's darker (text + ink), make it black.
        const val = gray > threshold ? 255 : 0;
        
        data[i] = val;
        data[i + 1] = val;
        data[i + 2] = val;
      }
      
      ctx.putImageData(imageData, 0, 0);
      resolve(canvas.toDataURL('image/jpeg', 0.8));
    };
    img.onerror = (err) => reject(new Error("Failed to load image for processing"));
    img.src = base64Input;
  });
}
