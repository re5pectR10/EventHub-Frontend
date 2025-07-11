"use client";

import { useState, useRef, useEffect } from "react";
import { Input } from "./input";
import { Button } from "./button";
import { MapPin, Search } from "lucide-react";
import {
  getGoogleMapsApi,
  GoogleMapsPlaceResult,
  GoogleMapsPlacesService,
  GoogleMapsAutocompleteService,
  LocationData,
} from "@/lib/types/google-maps";
import { loadGoogleMapsAlternative } from "@/lib/google-maps-alternative";

interface LocationInputProps {
  value: {
    location_name: string;
    location_address: string;
    location_coordinates?: {
      lat: number;
      lng: number;
    };
  };
  onChange: (location: LocationData) => void;
  onMapClick?: () => void;
  className?: string;
  nameLabel?: string;
  addressLabel?: string;
  nameError?: string;
  addressError?: string;
}

export function LocationInput({
  value,
  onChange,
  onMapClick,
  className = "",
  nameLabel = "Venue Name",
  addressLabel = "Venue Address",
  nameError,
  addressError,
}: LocationInputProps) {
  const [nameInputValue, setNameInputValue] = useState(value.location_name);
  const [addressInputValue, setAddressInputValue] = useState(
    value.location_address
  );
  const [suggestions, setSuggestions] = useState<GoogleMapsPlaceResult[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedSuggestionIndex, setSelectedSuggestionIndex] = useState(-1);

  const addressInputRef = useRef<HTMLInputElement>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);
  const placesService = useRef<GoogleMapsPlacesService | null>(null);
  const autocompleteService = useRef<GoogleMapsAutocompleteService | null>(
    null
  );

  // Initialize Google Places services
  useEffect(() => {
    const initializeGoogleMaps = async () => {
      console.log("📍 LocationInput: Starting Google Maps initialization...");
      try {
        console.log("📥 LocationInput: Loading Google Maps API...");
        await loadGoogleMapsAlternative();
        console.log("✅ LocationInput: Google Maps API loaded successfully");

        const googleApi = getGoogleMapsApi();
        console.log("🔍 LocationInput: Google API available:", !!googleApi);
        console.log(
          "🔍 LocationInput: Places API available:",
          !!googleApi?.maps?.places
        );

        if (googleApi?.maps?.places) {
          // Create a dummy div for PlacesService (required by Google Maps API)
          const div = document.createElement("div");
          placesService.current = new googleApi.maps.places.PlacesService(div);
          autocompleteService.current =
            new googleApi.maps.places.AutocompleteService();
          console.log(
            "✅ LocationInput: Places services initialized successfully"
          );
        } else {
          console.error(
            "❌ LocationInput: Places API not available after loading"
          );
        }
      } catch (error) {
        console.error(
          "❌ LocationInput: Failed to initialize Google Maps:",
          error
        );
      }
    };

    initializeGoogleMaps();
  }, []);

  // Update local state when value prop changes
  useEffect(() => {
    setNameInputValue(value.location_name);
    setAddressInputValue(value.location_address);
  }, [value.location_name, value.location_address]);

  // Handle address input changes and trigger autocomplete
  const handleAddressChange = async (inputValue: string) => {
    console.log("🔍 LocationInput: Handling address change:", inputValue);
    setAddressInputValue(inputValue);
    setSelectedSuggestionIndex(-1);

    if (inputValue.length < 3) {
      console.log("📝 LocationInput: Input too short, clearing suggestions");
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }

    if (!autocompleteService.current) {
      console.error("❌ LocationInput: Autocomplete service not available");
      return;
    }

    console.log("🌐 LocationInput: Making autocomplete request...");
    setIsLoading(true);

    try {
      const request = {
        input: inputValue,
        types: ["establishment", "geocode"],
        // componentRestrictions: { country: "us" }, // Adjust as needed
      };

      autocompleteService.current.getPlacePredictions(
        request,
        (predictions: GoogleMapsPlaceResult[] | null, status: string) => {
          console.log(
            "📡 LocationInput: Autocomplete response - Status:",
            status
          );
          console.log(
            "📡 LocationInput: Autocomplete response - Count:",
            predictions?.length || 0
          );

          setIsLoading(false);
          const googleApi = getGoogleMapsApi();
          if (
            status === googleApi?.maps?.places?.PlacesServiceStatus.OK &&
            predictions
          ) {
            setSuggestions(predictions.slice(0, 5)); // Limit to 5 suggestions
            setShowSuggestions(true);
            console.log("✅ LocationInput: Suggestions updated successfully");
          } else {
            setSuggestions([]);
            setShowSuggestions(false);
            console.error(
              "❌ LocationInput: Autocomplete failed with status:",
              status
            );
          }
        }
      );
    } catch (error) {
      console.error(
        "❌ LocationInput: Error fetching place predictions:",
        error
      );
      setIsLoading(false);
      setSuggestions([]);
      setShowSuggestions(false);
    }
  };

  // Handle suggestion selection
  const handleSuggestionSelect = (suggestion: GoogleMapsPlaceResult) => {
    if (!placesService.current || !suggestion.place_id) {
      return;
    }

    const request = {
      placeId: suggestion.place_id,
      fields: ["name", "formatted_address", "geometry", "place_id"],
    };

    placesService.current.getDetails(
      request,
      (place: GoogleMapsPlaceResult | null, status: string) => {
        const googleApi = getGoogleMapsApi();
        if (
          status === googleApi?.maps?.places?.PlacesServiceStatus.OK &&
          place
        ) {
          const location: LocationData = {
            name:
              place.name || suggestion.structured_formatting?.main_text || "",
            address: place.formatted_address || suggestion.description || "",
            coordinates: {
              lat: place.geometry?.location?.lat() || 0,
              lng: place.geometry?.location?.lng() || 0,
            },
            placeId: place.place_id,
          };

          setNameInputValue(location.name);
          setAddressInputValue(location.address);
          setShowSuggestions(false);
          onChange(location);
        }
      }
    );
  };

  // Handle keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!showSuggestions || suggestions.length === 0) return;

    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        setSelectedSuggestionIndex((prev) =>
          prev < suggestions.length - 1 ? prev + 1 : prev
        );
        break;
      case "ArrowUp":
        e.preventDefault();
        setSelectedSuggestionIndex((prev) => (prev > 0 ? prev - 1 : -1));
        break;
      case "Enter":
        e.preventDefault();
        if (selectedSuggestionIndex >= 0) {
          handleSuggestionSelect(suggestions[selectedSuggestionIndex]);
        }
        break;
      case "Escape":
        setShowSuggestions(false);
        setSelectedSuggestionIndex(-1);
        break;
    }
  };

  // Handle manual form updates
  const handleManualChange = () => {
    if (nameInputValue && addressInputValue) {
      onChange({
        name: nameInputValue,
        address: addressInputValue,
        coordinates: value.location_coordinates || { lat: 0, lng: 0 },
      });
    }
  };

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Venue Name Input */}
      <div className="space-y-2">
        <label htmlFor="venue-name" className="text-sm font-medium">
          {nameLabel} *
        </label>
        <Input
          id="venue-name"
          type="text"
          value={nameInputValue}
          onChange={(e) => {
            setNameInputValue(e.target.value);
            // Trigger change if both fields have values
            if (e.target.value && addressInputValue) {
              onChange({
                name: e.target.value,
                address: addressInputValue,
                coordinates: value.location_coordinates || { lat: 0, lng: 0 },
              });
            }
          }}
          placeholder="Enter venue name"
          required
          className={nameError ? "border-red-500" : ""}
        />
        {nameError && <p className="text-sm text-red-600">{nameError}</p>}
      </div>

      {/* Address Input with Autocomplete */}
      <div className="space-y-2 relative">
        <label htmlFor="venue-address" className="text-sm font-medium">
          {addressLabel} *
        </label>
        <div className="relative">
          <Input
            ref={addressInputRef}
            id="venue-address"
            type="text"
            value={addressInputValue}
            onChange={(e) => handleAddressChange(e.target.value)}
            onKeyDown={handleKeyDown}
            onBlur={() => {
              // Delay hiding suggestions to allow for clicks
              setTimeout(() => setShowSuggestions(false), 200);
              handleManualChange();
            }}
            onFocus={() => {
              if (suggestions.length > 0) {
                setShowSuggestions(true);
              }
            }}
            placeholder="Start typing venue address..."
            required
            className={`${addressError ? "border-red-500" : ""} pr-10`}
          />
          <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
            {isLoading ? (
              <div className="animate-spin h-4 w-4 border-2 border-gray-300 border-t-blue-600 rounded-full"></div>
            ) : (
              <Search className="h-4 w-4 text-gray-400" />
            )}
          </div>
        </div>

        {/* Suggestions Dropdown */}
        {showSuggestions && suggestions.length > 0 && (
          <div
            ref={suggestionsRef}
            className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-y-auto"
          >
            {suggestions.map((suggestion, index) => (
              <button
                key={suggestion.place_id || index}
                type="button"
                onClick={() => handleSuggestionSelect(suggestion)}
                className={`w-full text-left px-4 py-3 hover:bg-gray-50 border-b border-gray-100 last:border-b-0 ${
                  index === selectedSuggestionIndex ? "bg-blue-50" : ""
                }`}
              >
                <div className="flex items-start gap-3">
                  <MapPin className="h-4 w-4 text-gray-400 mt-0.5 flex-shrink-0" />
                  <div className="min-w-0 flex-1">
                    <div className="font-medium text-gray-900 truncate">
                      {suggestion.structured_formatting?.main_text ||
                        suggestion.description}
                    </div>
                    <div className="text-sm text-gray-500 truncate">
                      {suggestion.structured_formatting?.secondary_text || ""}
                    </div>
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}

        {addressError && <p className="text-sm text-red-600">{addressError}</p>}
      </div>

      {/* Map Button */}
      {onMapClick && (
        <div className="pt-2">
          <Button
            type="button"
            variant="outline"
            onClick={onMapClick}
            className="flex items-center gap-2"
          >
            <MapPin className="h-4 w-4" />
            Select on Map
          </Button>
        </div>
      )}

      {/* Current Coordinates Display (for debugging) */}
      {value.location_coordinates && (
        <div className="text-xs text-gray-500">
          Coordinates: {value.location_coordinates.lat.toFixed(6)},{" "}
          {value.location_coordinates.lng.toFixed(6)}
        </div>
      )}
    </div>
  );
}
