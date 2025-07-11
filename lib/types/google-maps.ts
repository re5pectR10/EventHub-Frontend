// Google Maps API type definitions
// These types are scoped to avoid conflicts with global declarations

export interface GoogleMapsLatLng {
  lat(): number;
  lng(): number;
}

export interface GoogleMapsLatLngLiteral {
  lat: number;
  lng: number;
}

export interface GoogleMapsMapOptions {
  center: GoogleMapsLatLngLiteral;
  zoom: number;
  mapTypeControl?: boolean;
  streetViewControl?: boolean;
  fullscreenControl?: boolean;
}

export interface GoogleMapsMarkerOptions {
  position: GoogleMapsLatLngLiteral;
  map: GoogleMapsMap;
  title?: string;
  draggable?: boolean;
}

export interface GoogleMapsMap {
  setCenter(location: GoogleMapsLatLngLiteral): void;
  setZoom(zoom: number): void;
  getCenter(): GoogleMapsLatLng;
  getZoom(): number;
}

export interface GoogleMapsMarker {
  setPosition(location: GoogleMapsLatLngLiteral): void;
  getPosition(): GoogleMapsLatLng | null;
  setMap(map: GoogleMapsMap | null): void;
  setDraggable(draggable: boolean): void;
}

export interface GoogleMapsGeocoder {
  geocode(
    request: { location: GoogleMapsLatLngLiteral },
    callback: (
      results: GoogleMapsGeocoderResult[] | null,
      status: string
    ) => void
  ): void;
}

export interface GoogleMapsGeocoderResult {
  formatted_address: string;
  address_components: Array<{
    long_name: string;
    short_name: string;
    types: string[];
  }>;
}

export interface GoogleMapsPlaceResult {
  place_id?: string;
  name?: string;
  formatted_address?: string;
  description?: string;
  structured_formatting?: {
    main_text?: string;
    secondary_text?: string;
  };
  geometry?: {
    location?: GoogleMapsLatLng;
  };
}

export interface GoogleMapsPlacesService {
  getDetails(
    request: { placeId: string; fields: string[] },
    callback: (place: GoogleMapsPlaceResult | null, status: string) => void
  ): void;
}

export interface GoogleMapsAutocompleteService {
  getPlacePredictions(
    request: {
      input: string;
      types?: string[];
      componentRestrictions?: { country: string };
    },
    callback: (
      predictions: GoogleMapsPlaceResult[] | null,
      status: string
    ) => void
  ): void;
}

// Google Maps API global interface (for checking availability)
export interface GoogleMapsApi {
  maps: {
    Map: new (
      element: HTMLElement,
      options: GoogleMapsMapOptions
    ) => GoogleMapsMap;
    Marker: new (options: GoogleMapsMarkerOptions) => GoogleMapsMarker;
    Geocoder: new () => GoogleMapsGeocoder;
    LatLng: new (lat: number, lng: number) => GoogleMapsLatLng;
    GeocoderStatus: {
      OK: string;
    };
    event: {
      addListener: (
        instance: GoogleMapsMap | GoogleMapsMarker,
        eventName: string,
        handler: (...args: unknown[]) => void
      ) => void;
    };
    places: {
      PlacesService: new (div: HTMLDivElement) => GoogleMapsPlacesService;
      AutocompleteService: new () => GoogleMapsAutocompleteService;
      PlacesServiceStatus: {
        OK: string;
      };
    };
  };
}

// Helper function to safely check for Google Maps API
export function getGoogleMapsApi(): GoogleMapsApi | null {
  const w = window as { google?: GoogleMapsApi };
  return w.google || null;
}

// Location data interfaces for our components
export interface LocationData {
  name: string;
  address: string;
  coordinates: GoogleMapsLatLngLiteral;
  placeId?: string;
}

export interface MapLocationData {
  coordinates: GoogleMapsLatLngLiteral;
  address: string;
  name?: string;
}
