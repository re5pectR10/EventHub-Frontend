"use client";

import { useState } from "react";
import { MapPin, Navigation, RefreshCw, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useLocation, useLocationActions } from "@/lib/stores/location-store";
import { ManualLocationModal } from "./manual-location-modal";

interface LocationBannerProps {
  className?: string;
  showPreciseLocationButton?: boolean;
}

export function LocationBanner({
  className = "",
  showPreciseLocationButton = true,
}: LocationBannerProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const { location, isLoading, error, hasCoordinates, permissionDenied } =
    useLocation();
  const { requestPreciseLocation, initialize } = useLocationActions();

  // Format location display text
  const getLocationText = () => {
    if (isLoading) {
      return "Detecting your location...";
    }

    if (error) {
      return "Unable to detect location";
    }

    if (!location) {
      return "Location not available";
    }

    // Build location text from available data
    const parts: string[] = [];

    if (location.city) {
      parts.push(location.city);
    }

    if (location.region && location.region !== location.city) {
      parts.push(location.region);
    }

    if (location.country && parts.length === 0) {
      parts.push(location.country);
    }

    if (parts.length === 0) {
      if (hasCoordinates) {
        return `${location.latitude?.toFixed(2)}, ${location.longitude?.toFixed(
          2
        )}`;
      }
      return "Unknown location";
    }

    return parts.join(", ");
  };

  // Get location source icon and text
  const getLocationSource = () => {
    switch (location?.source) {
      case "browser":
        return { icon: Navigation, text: "Precise location" };
      case "ip":
        return { icon: MapPin, text: "Approximate location" };
      case "manual":
        return { icon: Settings, text: "Custom location" };
      default:
        return { icon: MapPin, text: "Estimated location" };
    }
  };

  const locationSource = getLocationSource();
  const LocationIcon = locationSource.icon;

  const handlePreciseLocation = async () => {
    const success = await requestPreciseLocation();
    if (!success && permissionDenied) {
      // Could show a toast notification here
      console.log("Location permission denied");
    }
  };

  const handleRetry = () => {
    initialize();
  };

  return (
    <>
      <Card
        className={`p-4 bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200 ${className}`}
      >
        <div className="flex items-center justify-between gap-4">
          {/* Location Info */}
          <div className="flex items-center gap-3 min-w-0 flex-1">
            <div className="flex-shrink-0">
              {isLoading ? (
                <RefreshCw className="h-5 w-5 text-blue-600 animate-spin" />
              ) : (
                <LocationIcon className="h-5 w-5 text-blue-600" />
              )}
            </div>

            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-gray-900">
                  Showing events near
                </span>
                <span className="text-sm font-semibold text-blue-900">
                  {getLocationText()}
                </span>
              </div>

              {location && !isLoading && (
                <div className="text-xs text-gray-600 mt-1">
                  {locationSource.text}
                  {hasCoordinates && location.source !== "browser" && (
                    <span className="ml-2 text-blue-600">
                      • Use precise location for better results
                    </span>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2">
            {/* Precise Location Button */}
            {showPreciseLocationButton &&
              hasCoordinates &&
              location?.source !== "browser" &&
              !permissionDenied && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handlePreciseLocation}
                  disabled={isLoading}
                  className="flex items-center gap-1 text-blue-700 border-blue-300 hover:bg-blue-50"
                >
                  <Navigation className="h-3 w-3" />
                  Precise Location
                </Button>
              )}

            {/* Retry Button (shown on error) */}
            {error && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleRetry}
                disabled={isLoading}
                className="flex items-center gap-1 text-orange-700 border-orange-300 hover:bg-orange-50"
              >
                <RefreshCw className="h-3 w-3" />
                Retry
              </Button>
            )}

            {/* Change Location Button */}
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsModalOpen(true)}
              className="flex items-center gap-1 text-gray-700 border-gray-300 hover:bg-gray-50"
            >
              <Settings className="h-3 w-3" />
              Change
            </Button>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mt-3 p-2 bg-red-50 border border-red-200 rounded text-sm text-red-700">
            {error}
          </div>
        )}
      </Card>

      {/* Manual Location Modal */}
      <ManualLocationModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
      />
    </>
  );
}
