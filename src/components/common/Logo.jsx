import { useEffect, useRef, useState } from 'react';
import { APP_LOGO_URL, APP_BRAND_NAME } from '@/constants/branding';
import { useTheme } from '@/components/theme/ThemeProvider';

export default function Logo({ className }) {
  const { isDarkMode } = useTheme();
  const [dataUrl, setDataUrl] = useState(null);
  const canvasRef = useRef(null);

  useEffect(() => {
    // Only process the image if we are in dark mode
    if (!isDarkMode) {
      setDataUrl(null);
      return;
    }

    let cancelled = false;
    const img = new Image();
    img.crossOrigin = "Anonymous";
    img.src = APP_LOGO_URL;

    img.onload = () => {
      if (cancelled) return;

      const canvas = canvasRef.current;
      if (!canvas) return;

      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0);

      try {
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const data = imageData.data;

        for (let i = 0; i < data.length; i += 4) {
          // Target dark/black pixels (like the "Playoffs" text)
          // If RGB are all low and Alpha is high
          if (data[i+3] > 50 && data[i] < 60 && data[i+1] < 60 && data[i+2] < 60) {
            data[i] = 255;     // R
            data[i+1] = 255;   // G
            data[i+2] = 255;   // B
          }
        }

        ctx.putImageData(imageData, 0, 0);
        if (!cancelled) {
          setDataUrl(canvas.toDataURL());
        }
      } catch (e) {
        console.error("CORS issue preventing image processing:", e);
        // Fallback to original image if canvas is tainted
        if (!cancelled) setDataUrl(null);
      }
    };

    img.onerror = () => {
      if (!cancelled) setDataUrl(null);
    };

    // Cleanup: prevent state updates after unmount or when switching back to light mode
    return () => {
      cancelled = true;
    };
  }, [isDarkMode]);

  return (
    <>
      <img
        src={dataUrl || APP_LOGO_URL}
        alt={`${APP_BRAND_NAME} Logo`}
        className={className}
      />
      {isDarkMode && <canvas ref={canvasRef} style={{ display: 'none' }} />}
    </>
  );
}
