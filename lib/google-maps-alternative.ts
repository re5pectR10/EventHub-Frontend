/**
 * Alternative Google Maps loading method that might bypass blocking issues
 */

// Use existing Window interface from google-maps.ts

let isLoaded = false;
let loadingPromise: Promise<void> | null = null;

export function loadGoogleMapsAlternative(): Promise<void> {
  if (isLoaded) {
    return Promise.resolve();
  }

  if (loadingPromise) {
    return loadingPromise;
  }

  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
  if (!apiKey) {
    return Promise.reject(new Error("Google Maps API key not found"));
  }

  loadingPromise = new Promise((resolve, reject) => {
    // Check if already available
    if (window.google?.maps) {
      isLoaded = true;
      resolve();
      return;
    }

    // Alternative loading method - without callback
    const script = document.createElement("script");
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places`;
    script.async = false; // Load synchronously
    script.defer = false;

    const checkLoaded = () => {
      if (window.google?.maps) {
        isLoaded = true;
        resolve();
      } else {
        // Keep checking every 100ms for up to 10 seconds
        setTimeout(checkLoaded, 100);
      }
    };

    script.onload = () => {
      // Start checking after script loads
      setTimeout(checkLoaded, 100);
    };

    script.onerror = () => {
      reject(new Error("Failed to load Google Maps script"));
    };

    // Add to head
    document.head.appendChild(script);

    // Timeout after 10 seconds
    setTimeout(() => {
      if (!isLoaded) {
        reject(new Error("Google Maps loading timeout"));
      }
    }, 10000);
  });

  return loadingPromise;
}

/**
 * Simple check if Google Maps is available
 */
export function isGoogleMapsAvailable(): boolean {
  return !!window.google?.maps;
}
