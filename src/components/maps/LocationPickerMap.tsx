'use client';

import { useEffect, useRef, useState } from 'react';

type LocationPickerMapProps = {
  latitude: number | null;
  longitude: number | null;
  onPick: (lat: number, lng: number) => void;
};

const defaultCenter: [number, number] = [7.8731, 80.7718]; // Sri Lanka

const SCRIPT_ID = 'google-maps-js';
let googleMapsPromise: Promise<typeof google.maps> | null = null;

function loadGoogleMaps(apiKey: string): Promise<typeof google.maps> {
  if (typeof window === 'undefined') {
    return Promise.reject(new Error('Google Maps can only be loaded in the browser'));
  }

  if (window.google?.maps) {
    return Promise.resolve(window.google.maps);
  }

  if (googleMapsPromise) {
    return googleMapsPromise;
  }

  googleMapsPromise = new Promise((resolve, reject) => {
    const existingScript = document.getElementById(SCRIPT_ID) as HTMLScriptElement | null;

    if (existingScript) {
      existingScript.addEventListener('load', () => {
        if (window.google?.maps) {
          resolve(window.google.maps);
          return;
        }
        reject(new Error('Google Maps loaded but API is unavailable'));
      });

      existingScript.addEventListener('error', () => {
        reject(new Error('Failed to load Google Maps script'));
      });

      return;
    }

    const script = document.createElement('script');
    script.id = SCRIPT_ID;
    script.async = true;
    script.defer = true;
    script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(apiKey)}&libraries=places`;

    script.onload = () => {
      if (window.google?.maps) {
        resolve(window.google.maps);
        return;
      }
      reject(new Error('Google Maps loaded but API is unavailable'));
    };

    script.onerror = () => {
      reject(new Error('Failed to load Google Maps script'));
    };

    document.head.appendChild(script);
  });

  return googleMapsPromise;
}

function toLatLngLiteral(latitude: number, longitude: number): google.maps.LatLngLiteral {
  return { lat: latitude, lng: longitude };
}

export function LocationPickerMap({ latitude, longitude, onPick }: LocationPickerMapProps) {
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const searchInputRef = useRef<HTMLInputElement | null>(null);
  const mapRef = useRef<google.maps.Map | null>(null);
  const markerRef = useRef<google.maps.Marker | null>(null);
  const mapClickListenerRef = useRef<google.maps.MapsEventListener | null>(null);
  const markerDragListenerRef = useRef<google.maps.MapsEventListener | null>(null);
  const autocompleteListenerRef = useRef<google.maps.MapsEventListener | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const onPickRef = useRef(onPick);

  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

  useEffect(() => {
    onPickRef.current = onPick;
  }, [onPick]);

  const setMarkerPosition = (maps: typeof google.maps, position: google.maps.LatLng | google.maps.LatLngLiteral) => {
    if (!mapRef.current) return;

    if (!markerRef.current) {
      markerRef.current = new maps.Marker({
        map: mapRef.current,
        position,
        draggable: true,
      });

      markerDragListenerRef.current = markerRef.current.addListener('dragend', () => {
        const markerPosition = markerRef.current?.getPosition();
        if (!markerPosition) return;
        onPickRef.current(markerPosition.lat(), markerPosition.lng());
      });
      return;
    }

    markerRef.current.setMap(mapRef.current);
    markerRef.current.setPosition(position);
  };

  useEffect(() => {
    if (!apiKey) {
      setLoading(false);
      setLoadError('Google Maps API key is missing.');
      return;
    }

    if (!mapContainerRef.current) {
      return;
    }

    const initialCenter =
      latitude !== null && longitude !== null
        ? toLatLngLiteral(latitude, longitude)
        : toLatLngLiteral(defaultCenter[0], defaultCenter[1]);

    let isMounted = true;

    loadGoogleMaps(apiKey)
      .then((maps) => {
        if (!isMounted || !mapContainerRef.current) return;

        const map = new maps.Map(mapContainerRef.current, {
          center: initialCenter,
          zoom: latitude !== null && longitude !== null ? 15 : 8,
          mapTypeControl: false,
          streetViewControl: false,
          fullscreenControl: false,
          zoomControl: true,
          gestureHandling: 'greedy',
        });

        mapRef.current = map;

        mapClickListenerRef.current = map.addListener('click', (event) => {
          if (!event.latLng) return;

          setMarkerPosition(maps, event.latLng);
          onPickRef.current(event.latLng.lat(), event.latLng.lng());
        });

        if (searchInputRef.current) {
          const autocomplete = new maps.places.Autocomplete(searchInputRef.current, {
            fields: ['geometry', 'formatted_address'],
          });

          autocomplete.bindTo('bounds', map);

          autocompleteListenerRef.current = autocomplete.addListener('place_changed', () => {
            const place = autocomplete.getPlace();
            const location = place.geometry?.location;

            if (!location || !mapRef.current) return;

            mapRef.current.panTo(location);
            mapRef.current.setZoom(16);
            setMarkerPosition(maps, location);
            onPickRef.current(location.lat(), location.lng());
          });
        }

        if (latitude !== null && longitude !== null) {
          setMarkerPosition(maps, initialCenter);
        }

        setLoadError(null);
        setLoading(false);
      })
      .catch((error: unknown) => {
        console.error('Failed to initialize Google Maps:', error);
        if (!isMounted) return;

        setLoadError('Failed to load Google Maps. Check your API key and browser network.');
        setLoading(false);
      });

    return () => {
      isMounted = false;

      if (mapClickListenerRef.current) {
        mapClickListenerRef.current.remove();
        mapClickListenerRef.current = null;
      }

      if (markerDragListenerRef.current) {
        markerDragListenerRef.current.remove();
        markerDragListenerRef.current = null;
      }

      if (autocompleteListenerRef.current) {
        autocompleteListenerRef.current.remove();
        autocompleteListenerRef.current = null;
      }

      if (markerRef.current) {
        markerRef.current.setMap(null);
        markerRef.current = null;
      }

      mapRef.current = null;
    };
  }, [apiKey]);

  useEffect(() => {
    if (!mapRef.current || !window.google?.maps) return;

    if (latitude === null || longitude === null) {
      if (markerRef.current) {
        markerRef.current.setMap(null);
        markerRef.current = null;
      }
      return;
    }

    const maps = window.google.maps;
    const nextPosition = toLatLngLiteral(latitude, longitude);

    setMarkerPosition(maps, nextPosition);
    mapRef.current.panTo(nextPosition);
  }, [latitude, longitude]);

  if (loadError) {
    return (
      <div className="rounded-lg border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900">
        <p className="font-medium">Google Maps is not ready.</p>
        <p className="mt-1">{loadError}</p>
        <p className="mt-2">
          Add <code className="font-mono">NEXT_PUBLIC_GOOGLE_MAPS_API_KEY</code> to your .env file and restart the app.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <input
        ref={searchInputRef}
        type="text"
        placeholder="Search a place or address"
        className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
      />

      <div className="h-80 w-full overflow-hidden rounded-lg border border-gray-200">
        {loading && (
          <div className="flex h-full items-center justify-center bg-gray-50 text-sm text-gray-500">
            Loading Google Maps...
          </div>
        )}
        <div ref={mapContainerRef} className={`h-full w-full ${loading ? 'hidden' : 'block'}`} />
      </div>

      <p className="text-xs text-gray-500">
        Tip: Click anywhere on the map or drag the marker to fine-tune your location.
      </p>
    </div>
  );
}

