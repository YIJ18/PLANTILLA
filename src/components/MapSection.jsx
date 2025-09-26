import React, { useEffect, useRef } from 'react';
import { MapPin, LocateFixed } from 'lucide-react';
import { Button } from '@/components/ui/button';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

const MapSection = ({ coordinates }) => {
  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markerRef = useRef(null);
  const pathRef = useRef(null);
  const breadcrumbsLayerRef = useRef(null); // nuevo grupo de capas

  useEffect(() => {
    if (!mapRef.current || mapInstanceRef.current) return;

    const map = L.map(mapRef.current, {
      center: [coordinates[0]?.lat || 40.7128, coordinates[0]?.lng || -74.0060],
      zoom: 13,
      zoomControl: false,
    });

    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
      subdomains: 'abcd',
      maxZoom: 19,
    }).addTo(map);

    L.control.zoom({ position: 'bottomright' }).addTo(map);

    // inicializar grupo para breadcrumbs
    breadcrumbsLayerRef.current = L.layerGroup().addTo(map);

    mapInstanceRef.current = map;

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    if (!mapInstanceRef.current || !coordinates.length) return;

    const map = mapInstanceRef.current;
    const latestCoord = coordinates[coordinates.length - 1];

    // --- Icono animado del último punto ---
    const canSatIcon = L.divIcon({
      className: 'custom-cansat-marker',
      html: `
        <div style="
          width: 20px;
          height: 20px;
          background: #ef4444;
          border: 3px solid white;
          border-radius: 50%;
          box-shadow: 0 0 15px #ef4444, 0 0 25px #ef4444;
          animation: pulse-red 1.5s infinite;
        "></div>
        <style>
          @keyframes pulse-red {
            0% { transform: scale(0.9); box-shadow: 0 0 0 0 rgba(239, 68, 68, 0.7); }
            70% { transform: scale(1); box-shadow: 0 0 0 10px rgba(239, 68, 68, 0); }
            100% { transform: scale(0.9); box-shadow: 0 0 0 0 rgba(239, 68, 68, 0); }
          }
        </style>
      `,
      iconSize: [20, 20],
      iconAnchor: [10, 10],
    });

    // --- Marker principal ---
    if (markerRef.current) {
      markerRef.current.setLatLng([latestCoord.lat, latestCoord.lng]);
    } else {
      markerRef.current = L.marker([latestCoord.lat, latestCoord.lng], {
        icon: canSatIcon,
        zIndexOffset: 1000,
      }).addTo(map);
    }

    markerRef.current.bindPopup(
      `<b>🛰️ CanSat Astra</b><br>Lat: ${latestCoord.lat.toFixed(6)}<br>Lng: ${latestCoord.lng.toFixed(6)}`
    );

    // --- Polyline del recorrido ---
    if (pathRef.current) {
      pathRef.current.setLatLngs(coordinates.map((c) => [c.lat, c.lng]));
    } else {
      pathRef.current = L.polyline(coordinates.map((c) => [c.lat, c.lng]), {
        color: '#3b82f6',
        weight: 3,
        opacity: 0.8,
      }).addTo(map);
    }

    // --- Breadcrumbs (reset cada vez) ---
    breadcrumbsLayerRef.current.clearLayers(); // limpiar anteriores
    coordinates.forEach((coord, idx) => {
      if (idx === coordinates.length - 1) {
        // último punto → verde
        L.circleMarker([coord.lat, coord.lng], {
          radius: 5,
          color: '#FF0000',
          fillColor: '#FF0000',
          fillOpacity: 0.5,
        }).addTo(breadcrumbsLayerRef.current);
      } else {
        // puntos anteriores → azul
        L.circleMarker([coord.lat, coord.lng], {
          radius: 3,
          color: '#3b82f6',
          fillColor: '#3b82f6',
          fillOpacity: 0.6,
        }).addTo(breadcrumbsLayerRef.current);
      }
    });

    // --- Ajuste automático de vista ---
    if (coordinates.length > 1) {
      const bounds = L.latLngBounds(coordinates.map((c) => [c.lat, c.lng]));
      map.fitBounds(bounds, { padding: [50, 50] });
    } else {
      map.panTo([latestCoord.lat, latestCoord.lng]);
    }
  }, [coordinates]);

  const centerMap = () => {
    if (mapInstanceRef.current && markerRef.current) {
      mapInstanceRef.current.panTo(markerRef.current.getLatLng());
    }
  };

  const currentCoord = coordinates[coordinates.length - 1] || { lat: 0, lng: 0, alt: 0 };

  return (
    <div className="map-section glass-card rounded-xl p-6 h-full flex flex-col">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-3">
          <MapPin className="w-6 h-6 text-blue-400" />
          <h2 className="text-2xl font-bold text-white">Tracker de Vuelo</h2>
        </div>
        <Button
          onClick={centerMap}
          variant="outline"
          size="sm"
          className="bg-transparent border-blue-400 text-blue-400 hover:bg-blue-400 hover:text-black"
        >
          <LocateFixed className="w-4 h-4 mr-2" /> Centrar
        </Button>
      </div>

      <div
        ref={mapRef}
        className="w-full flex-grow rounded-lg overflow-hidden border border-gray-600"
        style={{ background: '#1f2937', minHeight: '300px' }}
      />

      <div className="grid grid-cols-3 gap-4 mt-6 text-center">
        <div className="bg-gray-800/50 rounded-lg p-3">
          <div className="text-blue-400 text-sm font-semibold">Latitud</div>
          <div className="text-white font-mono text-sm">{currentCoord.lat.toFixed(6)}</div>
        </div>
        <div className="bg-gray-800/50 rounded-lg p-3">
          <div className="text-red-400 text-sm font-semibold">Longitud</div>
          <div className="text-white font-mono text-sm">{currentCoord.lng.toFixed(6)}</div>
        </div>
        <div className="bg-gray-800/50 rounded-lg p-3">
          <div className="text-green-400 text-sm font-semibold">Altitud</div>
          <div className="text-white font-mono text-sm">{(currentCoord.alt || 0).toFixed(1)}m</div>
        </div>
      </div>
    </div>
  );
};

export default MapSection;
