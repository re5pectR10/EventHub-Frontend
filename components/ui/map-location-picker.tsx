"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { Button } from "./button";
import { Card, CardContent, CardHeader, CardTitle } from "./card";
import { MapPin, X, Check } from "lucide-react";
import {
  getGoogleMapsApi,
  GoogleMapsMap,
  GoogleMapsMarker,
  GoogleMapsGeocoder,
  GoogleMapsLatLngLiteral,
  MapLocationData,
} from "@/lib/types/google-maps";
import { loadGoogleMapsAlternative } from "@/lib/google-maps-alternative";

interface MapLocationPickerProps {
  isOpen: boolean;
  onClose: () => void;
  onLocationSelect: (location: MapLocationData) => void;
  initialLocation?: GoogleMapsLatLngLiteral;
  initialName?: string;
}

interface MapClickEvent {
  latLng: {
    lat(): number;
    lng(): number;
  };
}

export function MapLocationPicker({
  isOpen,
  onClose,
  onLocationSelect,
  initialLocation,
  initialName = "",
}: MapLocationPickerProps) {
  const [selectedLocation, setSelectedLocation] =
    useState<GoogleMapsLatLngLiteral | null>(initialLocation || null);
  const [address, setAddress] = useState<string>("");
  const [name, setName] = useState<string>(initialName);
  const [isLoading, setIsLoading] = useState(false);
  const [mapInitialized, setMapInitialized] = useState(false);

  const mapRef = useRef<HTMLDivElement>(null);
  const modalRef = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<GoogleMapsMap | null>(null);
  const markerInstance = useRef<GoogleMapsMarker | null>(null);
  const geocoderInstance = useRef<GoogleMapsGeocoder | null>(null);

  // Prevent scroll propagation to background
  const handleModalScroll = useCallback((e: React.WheelEvent) => {
    e.stopPropagation();
  }, []);

  // Prevent event bubbling to background
  const handleModalClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
  }, []);

  // Handle keyboard events (ESC to close)
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    },
    [onClose]
  );

  // Add/remove event listeners for keyboard handling
  useEffect(() => {
    if (isOpen) {
      document.addEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "hidden"; // Prevent background scroll
    } else {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "unset";
    }

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "unset";
    };
  }, [isOpen, handleKeyDown]);

  // Initialize Google Maps
  useEffect(() => {
    if (!isOpen || !mapRef.current || mapInitialized) return;

    const initializeMap = async () => {
      try {
        console.log("🗺️ Loading Google Maps API...");
        await loadGoogleMapsAlternative();
      } catch (error) {
        console.error("Failed to load Google Maps API:", error);
        return;
      }

      const googleApi = getGoogleMapsApi();
      if (!googleApi?.maps) {
        console.error("Google Maps API not loaded");
        return;
      }

      const defaultLocation = initialLocation || { lat: 40.7128, lng: -74.006 }; // Default to NYC

      console.log("🗺️ Creating map instance...");

      // Initialize map with specific styling for modal context
      mapInstance.current = new googleApi.maps.Map(mapRef.current!, {
        center: defaultLocation,
        zoom: 15,
        mapTypeControl: false,
        streetViewControl: false,
        fullscreenControl: false,
      });

      // Initialize geocoder
      geocoderInstance.current = new googleApi.maps.Geocoder();

      // Wait for map to be fully loaded using standard event listener
      const mapLoadListener = () => {
        console.log("🗺️ Map loaded successfully");
        setMapInitialized(true);

        // Force a resize to ensure proper rendering in modal
        setTimeout(() => {
          if (window.google?.maps?.event && mapInstance.current) {
            window.google.maps.event.trigger(mapInstance.current, "resize");
            if (initialLocation) {
              mapInstance.current.setCenter(initialLocation);
            }
          }
        }, 100);
      };

      // Use regular event listener since addListenerOnce may not be available
      if (window.google?.maps?.event) {
        window.google.maps.event.addListener(
          mapInstance.current,
          "tilesloaded",
          mapLoadListener
        );
      } else {
        // Fallback - just mark as initialized
        setTimeout(() => setMapInitialized(true), 500);
      }

      // Initialize marker if initial location exists
      if (initialLocation) {
        markerInstance.current = new googleApi.maps.Marker({
          position: defaultLocation,
          map: mapInstance.current,
          title: "Selected Location",
          draggable: true,
        });

        // Reverse geocode initial location
        reverseGeocode(defaultLocation);

        // Add marker drag listener
        if (window.google?.maps?.event) {
          window.google.maps.event.addListener(
            markerInstance.current,
            "dragend",
            () => {
              const position = markerInstance.current?.getPosition();
              if (position) {
                const newLocation = {
                  lat: position.lat(),
                  lng: position.lng(),
                };
                setSelectedLocation(newLocation);
                reverseGeocode(newLocation);
              }
            }
          );
        }
      }

      // Add click listener to map
      if (window.google?.maps?.event) {
        window.google.maps.event.addListener(
          mapInstance.current,
          "click",
          (event: MapClickEvent) => {
            if (event.latLng) {
              const clickedLocation = {
                lat: event.latLng.lat(),
                lng: event.latLng.lng(),
              };

              setSelectedLocation(clickedLocation);
              reverseGeocode(clickedLocation);

              // Create or update marker
              if (markerInstance.current) {
                markerInstance.current.setPosition(clickedLocation);
              } else {
                markerInstance.current = new googleApi.maps.Marker({
                  position: clickedLocation,
                  map: mapInstance.current!,
                  title: "Selected Location",
                  draggable: true,
                });

                // Add marker drag listener
                if (window.google?.maps?.event) {
                  window.google.maps.event.addListener(
                    markerInstance.current,
                    "dragend",
                    () => {
                      const position = markerInstance.current?.getPosition();
                      if (position) {
                        const newLocation = {
                          lat: position.lat(),
                          lng: position.lng(),
                        };
                        setSelectedLocation(newLocation);
                        reverseGeocode(newLocation);
                      }
                    }
                  );
                }
              }
            }
          }
        );
      }
    };

    // Add delay to ensure modal is fully rendered
    const initTimer = setTimeout(() => {
      if (window.google?.maps) {
        initializeMap();
      } else {
        // Wait for Google Maps to load
        const checkGoogleMaps = setInterval(() => {
          if (window.google?.maps) {
            clearInterval(checkGoogleMaps);
            initializeMap();
          }
        }, 100);

        // Cleanup interval after 10 seconds
        setTimeout(() => clearInterval(checkGoogleMaps), 10000);
      }
    }, 250); // Small delay to ensure modal DOM is ready

    // Set initial selected location
    if (initialLocation) {
      setSelectedLocation(initialLocation);
    }

    return () => {
      clearTimeout(initTimer);
    };
  }, [isOpen, initialLocation, mapInitialized]);

  // Reset map initialization state when modal closes
  useEffect(() => {
    if (!isOpen) {
      setMapInitialized(false);
    }
  }, [isOpen]);

  // Reverse geocode to get address from coordinates
  const reverseGeocode = (location: { lat: number; lng: number }) => {
    if (!geocoderInstance.current) return;

    setIsLoading(true);

    geocoderInstance.current.geocode(
      { location },
      (results: unknown, status: unknown) => {
        setIsLoading(false);
        if (
          status === window.google?.maps?.GeocoderStatus.OK &&
          results &&
          Array.isArray(results) &&
          results[0] &&
          typeof results[0] === "object" &&
          "formatted_address" in results[0]
        ) {
          setAddress(results[0].formatted_address as string);
        } else {
          setAddress("Address not found");
        }
      }
    );
  };

  // Handle location confirmation
  const handleConfirm = () => {
    if (selectedLocation && address) {
      onLocationSelect({
        coordinates: selectedLocation,
        address,
        name: name.trim() || undefined,
      });
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black bg-opacity-50"
      onClick={onClose}
      onWheel={handleModalScroll}
      ref={modalRef}
    >
      <Card
        className="w-full max-w-5xl max-h-[95vh] m-4 flex flex-col shadow-2xl"
        onClick={handleModalClick}
        style={{ zIndex: 10000 }}
      >
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4 flex-shrink-0">
          <CardTitle>Select Location on Map</CardTitle>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="h-8 w-8 p-0"
          >
            <X className="h-4 w-4" />
          </Button>
        </CardHeader>
        <CardContent className="flex-1 flex flex-col overflow-hidden">
          {/* Instructions */}
          <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-md flex-shrink-0">
            <p className="text-sm text-blue-800">
              Click anywhere on the map to select a location. You can also drag
              the marker to fine-tune the position.
            </p>
          </div>

          {/* Location Name Input */}
          <div className="mb-4 flex-shrink-0">
            <label
              htmlFor="location-name"
              className="block text-sm font-medium mb-2"
            >
              Location Name (Optional)
            </label>
            <input
              id="location-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Central Park, Main Building, etc."
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Map Container - Critical: explicit dimensions for Google Maps */}
          <div
            className="flex-1 mb-4 border border-gray-300 rounded-md overflow-hidden relative"
            style={{
              minHeight: "450px",
              height: "450px", // Explicit height for Google Maps
              width: "100%",
            }}
          >
            <div
              ref={mapRef}
              className="absolute inset-0 w-full h-full"
              style={{
                // Ensure map container has explicit dimensions
                width: "100%",
                height: "100%",
                minHeight: "450px",
              }}
            />
            {!mapInitialized && (
              <div className="absolute inset-0 flex items-center justify-center bg-gray-100">
                <div className="text-gray-600">Loading map...</div>
              </div>
            )}
          </div>

          {/* Selected Location Info */}
          {selectedLocation && (
            <div className="mb-4 p-3 bg-gray-50 border border-gray-200 rounded-md flex-shrink-0">
              <div className="flex items-start gap-2">
                <MapPin className="h-4 w-4 text-gray-600 mt-1 flex-shrink-0" />
                <div className="flex-1">
                  <div className="text-sm font-medium text-gray-900">
                    Selected Coordinates
                  </div>
                  <div className="text-xs text-gray-600">
                    {selectedLocation.lat.toFixed(6)},{" "}
                    {selectedLocation.lng.toFixed(6)}
                  </div>
                  {isLoading ? (
                    <div className="mt-1 text-sm text-gray-500">
                      Loading address...
                    </div>
                  ) : address ? (
                    <div className="mt-1 text-sm text-gray-700">{address}</div>
                  ) : null}
                </div>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex justify-end gap-3 flex-shrink-0">
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button
              onClick={handleConfirm}
              disabled={!selectedLocation || isLoading}
              className="flex items-center gap-2"
            >
              <Check className="h-4 w-4" />
              Confirm Location
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
