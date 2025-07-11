"use client";

import { useState } from "react";
import { X, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LocationInput } from "@/components/ui/location-input";
import { useLocationActions } from "@/lib/stores/location-store";
import type { LocationData } from "@/lib/types/google-maps";

interface ManualLocationModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ManualLocationModal({
  isOpen,
  onClose,
}: ManualLocationModalProps) {
  const [selectedLocation, setSelectedLocation] = useState<LocationData | null>(
    null
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { setManualLocation } = useLocationActions();

  const handleLocationChange = (location: LocationData) => {
    setSelectedLocation(location);
  };

  const handleConfirm = () => {
    if (!selectedLocation || !selectedLocation.coordinates) {
      return;
    }

    setIsSubmitting(true);

    try {
      // Update the location store with the selected location
      setManualLocation(
        selectedLocation.coordinates,
        selectedLocation.name || selectedLocation.address
      );

      // Close the modal
      onClose();

      // Reset form
      setSelectedLocation(null);
    } catch (error) {
      console.error("Error setting manual location:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
    setSelectedLocation(null);
    onClose();
  };

  // Don't render if modal is not open
  if (!isOpen) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black bg-opacity-50"
        onClick={handleCancel}
      />

      {/* Modal Content */}
      <Card className="relative w-full max-w-md mx-4 max-h-[90vh] overflow-y-auto">
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <MapPin className="h-5 w-5 text-blue-600" />
              <CardTitle className="text-lg">Change Location</CardTitle>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleCancel}
              className="h-6 w-6 p-0"
            >
              <X className="h-4 w-4" />
              <span className="sr-only">Close</span>
            </Button>
          </div>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Instructions */}
          <div className="p-3 bg-blue-50 border border-blue-200 rounded-md">
            <p className="text-sm text-blue-800">
              Search for a city, address, or venue to see events in that area.
              You can also select a location from the suggestions.
            </p>
          </div>

          {/* Location Input */}
          <div className="space-y-4">
            <LocationInput
              value={{
                location_name: selectedLocation?.name || "",
                location_address: selectedLocation?.address || "",
                location_coordinates: selectedLocation?.coordinates,
              }}
              onChange={handleLocationChange}
              nameLabel="Location Name (Optional)"
              addressLabel="Search Location"
              className="w-full"
            />
          </div>

          {/* Selected Location Preview */}
          {selectedLocation && selectedLocation.coordinates && (
            <div className="p-3 bg-green-50 border border-green-200 rounded-md">
              <div className="flex items-start gap-2">
                <MapPin className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                <div className="flex-1">
                  <div className="font-medium text-green-900">
                    {selectedLocation.name || "Selected Location"}
                  </div>
                  <div className="text-sm text-green-700">
                    {selectedLocation.address}
                  </div>
                  <div className="text-xs text-green-600 mt-1">
                    {selectedLocation.coordinates.lat.toFixed(4)},{" "}
                    {selectedLocation.coordinates.lng.toFixed(4)}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-3 pt-4">
            <Button
              variant="outline"
              onClick={handleCancel}
              disabled={isSubmitting}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              onClick={handleConfirm}
              disabled={
                !selectedLocation ||
                !selectedLocation.coordinates ||
                isSubmitting
              }
              className="flex-1 bg-blue-600 hover:bg-blue-700"
            >
              {isSubmitting ? "Setting Location..." : "Set Location"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
