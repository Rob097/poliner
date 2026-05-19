"use client";

import { useCallback, useState } from "react";

export interface GeoCoords {
  lat: number;
  lng: number;
  accuracy: number;
}

interface UseGeolocationState {
  coords: GeoCoords | null;
  loading: boolean;
  error: string | null;
  unsupported: boolean;
}

export function useGeolocation() {
  const [state, setState] = useState<UseGeolocationState>({
    coords: null,
    loading: false,
    error: null,
    unsupported: typeof window !== "undefined" && !("geolocation" in navigator),
  });

  const request = useCallback(() => {
    if (typeof window === "undefined" || !("geolocation" in navigator)) {
      setState((s) => ({ ...s, unsupported: true, error: "Il browser non supporta la geolocalizzazione" }));
      return;
    }
    setState((s) => ({ ...s, loading: true, error: null }));
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setState({
          coords: {
            lat: pos.coords.latitude,
            lng: pos.coords.longitude,
            accuracy: pos.coords.accuracy,
          },
          loading: false,
          error: null,
          unsupported: false,
        });
      },
      (err) => {
        const messages: Record<number, string> = {
          [err.PERMISSION_DENIED]: "Hai negato il permesso. Puoi inserire la città manualmente.",
          [err.POSITION_UNAVAILABLE]: "Posizione non disponibile. Riprova o inseriscila a mano.",
          [err.TIMEOUT]: "Timeout. Riprova o inseriscila a mano.",
        };
        setState((s) => ({
          ...s,
          loading: false,
          error: messages[err.code] ?? "Errore nel recupero posizione",
        }));
      },
      { enableHighAccuracy: false, timeout: 8000, maximumAge: 60_000 },
    );
  }, []);

  return { ...state, request };
}
