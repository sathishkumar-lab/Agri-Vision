"use client";

import React, { useEffect, useState } from "react";
import { MapPin } from "lucide-react";
import "leaflet/dist/leaflet.css";

interface MapViewProps {
  farmLat?: number | null;
  farmLon?: number | null;
  claimLat?: number | null;
  claimLon?: number | null;
  farmLocation?: { lat: number; lng: number } | null;
  claimLocation?: { lat: number; lng: number } | null;
  distanceKm?: number | null;
  height?: string;
}

export default function MapView({
  farmLat,
  farmLon,
  claimLat,
  claimLon,
  farmLocation,
  claimLocation,
  distanceKm,
  height = "520px",
}: MapViewProps) {
  const fLat = farmLocation?.lat ?? farmLat;
  const fLon = farmLocation?.lng ?? farmLon;
  const cLat = claimLocation?.lat ?? claimLat;
  const cLon = claimLocation?.lng ?? claimLon;

  const hasFarm = typeof fLat === "number" && !isNaN(fLat) && fLat >= -90 && fLat <= 90 && typeof fLon === "number" && !isNaN(fLon) && fLon >= -180 && fLon <= 180;
  const hasClaim = typeof cLat === "number" && !isNaN(cLat) && cLat >= -90 && cLat <= 90 && typeof cLon === "number" && !isNaN(cLon) && cLon >= -180 && cLon <= 180;

  const [mounted, setMounted] = useState(false);
  const [LeafletMap, setLeafletMap] = useState<any>(null);

  useEffect(() => {
    setMounted(true);
    Promise.all([
      import("react-leaflet"),
      import("leaflet"),
    ]).then(([reactLeaflet, L]) => {
      delete (L.Icon.Default.prototype as any)._getIconUrl;
      L.Icon.Default.mergeOptions({
        iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
        iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
        shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
      });

      setLeafletMap({
        MapContainer: reactLeaflet.MapContainer,
        TileLayer: reactLeaflet.TileLayer,
        Marker: reactLeaflet.Marker,
        Popup: reactLeaflet.Popup,
        useMap: reactLeaflet.useMap,
        L,
      });
    });
  }, []);

  if (!hasFarm && !hasClaim) {
    return (
      <div
        style={{ height }}
        className="w-full bg-[#f8faf7] border border-gray-200 rounded-xl flex flex-col items-center justify-center text-gray-500 text-xs font-semibold p-4 text-center space-y-1"
      >
        <MapPin className="w-6 h-6 text-gray-400" />
        <span className="font-bold text-gray-700">Location unavailable</span>
        <span className="text-[11px] text-gray-400">No registered farm or captured claim GPS coordinates provided</span>
      </div>
    );
  }

  if (!mounted || !LeafletMap) {
    return (
      <div
        style={{ height }}
        className="w-full bg-[#f8faf7] rounded-xl flex flex-col items-center justify-center text-gray-500 border border-gray-200"
      >
        <div className="w-7 h-7 border-2 border-[#1a382b] border-t-transparent rounded-full animate-spin mb-2"></div>
        <p className="text-xs font-medium">Loading Map Canvas...</p>
      </div>
    );
  }

  const { MapContainer, TileLayer, Marker, Popup, useMap, L } = LeafletMap;

  const farmIcon = new L.Icon({
    iconUrl: "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-green.png",
    shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png",
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41]
  });

  const claimIcon = new L.Icon({
    iconUrl: "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-gold.png",
    shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png",
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41]
  });

  let centerLat = 0;
  let centerLon = 0;

  if (hasFarm && hasClaim) {
    centerLat = (fLat! + cLat!) / 2;
    centerLon = (fLon! + cLon!) / 2;
  } else if (hasFarm) {
    centerLat = fLat!;
    centerLon = fLon!;
  } else {
    centerLat = cLat!;
    centerLon = cLon!;
  }

  function MapController({ center }: { center: [number, number] }) {
    const map = useMap();
    useEffect(() => {
      map.invalidateSize();
      map.setView(center, map.getZoom());
    }, [center[0], center[1], map]);
    return null;
  }

  return (
    <div className="relative w-full rounded-xl overflow-hidden border border-gray-200 shadow-sm" style={{ height }}>
      <MapContainer
        center={[centerLat, centerLon]}
        zoom={hasFarm && hasClaim ? 13 : 14}
        scrollWheelZoom={false}
        style={{ height: "100%", width: "100%" }}
      >
        <MapController center={[centerLat, centerLon]} />
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        
        {/* Farm Marker */}
        {hasFarm && (
          <Marker position={[fLat!, fLon!]} icon={farmIcon}>
            <Popup>
              <div className="text-xs font-sans">
                <strong className="text-[#1a382b] block text-sm font-bold">Registered Farm</strong>
                <span>Lat: {fLat!.toFixed(4)}, Lon: {fLon!.toFixed(4)}</span>
              </div>
            </Popup>
          </Marker>
        )}

        {/* Claim Location Marker */}
        {hasClaim && (
          <Marker position={[cLat!, cLon!]} icon={claimIcon}>
            <Popup>
              <div className="text-xs font-sans">
                <strong className="text-[#b89528] block text-sm font-bold">Current Claim Location</strong>
                <span>Lat: {cLat!.toFixed(4)}, Lon: {cLon!.toFixed(4)}</span>
                {distanceKm !== undefined && distanceKm !== null && (
                  <div className="mt-1 font-bold text-[#2e7d32]">
                    Distance to Farm: {distanceKm} km
                  </div>
                )}
              </div>
            </Popup>
          </Marker>
        )}
      </MapContainer>

      {/* Floating map legend overlay */}
      <div className="absolute bottom-2 left-2 z-[1000] bg-[#1a382b]/95 backdrop-blur-sm text-white text-[11px] px-3 py-2 rounded-xl border border-[#2a4d3d] shadow-lg flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-1.5 font-semibold">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block shadow-sm"></span>
          <span className="text-emerald-200">Registered Farm Plot (Green)</span>
        </div>
        <div className="flex items-center gap-1.5 font-semibold">
          <span className="w-2.5 h-2.5 rounded-full bg-amber-400 inline-block shadow-sm"></span>
          <span className="text-amber-200">Claim Photo Location (Yellow)</span>
        </div>
        {distanceKm !== undefined && distanceKm !== null && (
          <div className="flex items-center gap-1 text-[10px] text-gray-300 border-l border-emerald-800/80 pl-2">
            <span>Distance: <strong className="text-[#d4af37] font-mono">{distanceKm.toFixed(2)} km</strong></span>
          </div>
        )}
      </div>

      {/* Floating distance pill overlay */}
      {distanceKm !== undefined && distanceKm !== null && (
        <div className="absolute top-3 right-3 z-[1000] bg-[#1a382b] text-white text-xs px-3 py-1.5 rounded-lg border border-[#d4af37]/40 shadow-md flex items-center gap-1.5 font-medium">
          <span className="w-2 h-2 rounded-full bg-[#d4af37]"></span>
          <span>Distance: <strong>{distanceKm.toFixed(2)} km</strong></span>
        </div>
      )}
    </div>
  );
}
