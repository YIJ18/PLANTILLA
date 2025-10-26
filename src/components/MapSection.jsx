import React, { useEffect, useRef, useState } from 'react';
import { MapPin, LocateFixed } from 'lucide-react';
import { Button } from '@/components/ui/button';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import html2canvas from 'html2canvas';

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

const MapSection = ({ coordinates = [], initialCenter = null }) => {
  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markerRef = useRef(null);
  const pathRef = useRef(null);
  const breadcrumbsLayerRef = useRef(null);
  // optional override coordinate (used by the UI 'Mostrar ejemplo' button)
  const overrideCoordRef = useRef(null);
  const [useGoogle, setUseGoogle] = useState(false);

  // Helper: try to read lat/lng from URL query params if provided
  const readLatLngFromQuery = () => {
    try {
      if (typeof window === 'undefined') return null;
      const params = new URLSearchParams(window.location.search);
      const lat = parseFloat(params.get('lat'));
      const lng = parseFloat(params.get('lng'));
      if (!Number.isNaN(lat) && !Number.isNaN(lng)) return { lat, lng };
    } catch (e) {}
    return null;
  };

  useEffect(() => {
    if (!mapRef.current || mapInstanceRef.current) return;

    // decide initial center: prefer first coordinate, then initialCenter prop, then URL params, then default
    const urlCoord = readLatLngFromQuery();
    const firstCoord = (Array.isArray(coordinates) && coordinates.length > 0) ? coordinates[0] : null;
    const centerSource = firstCoord || initialCenter || urlCoord || { lat: 40.7128, lng: -74.0060 };

    const map = L.map(mapRef.current, {
      center: [centerSource.lat, centerSource.lng],
      zoom: 13,
      zoomControl: false,
    });

    // Try a colorful basemap (Carto Voyager). If tiles fail (CORS/blocked), fall back to OSM tiles.
    const primaryUrl = 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png';
    const fallbackUrl = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';

    const primaryLayer = L.tileLayer(primaryUrl, {
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
      subdomains: 'abcd',
      maxZoom: 19,
      detectRetina: true,
      crossOrigin: true,
    }).addTo(map);

    // If primary tiles error (e.g., CORS or blocked), swap to OSM tiles
    primaryLayer.on('tileerror', function (err) {
      try {
        console.warn('Primary tile layer failed, switching to fallback OSM tiles', err);
        map.removeLayer(primaryLayer);
        const fallbackLayer = L.tileLayer(fallbackUrl, {
          attribution: '&copy; OpenStreetMap contributors',
          subdomains: 'abc',
          maxZoom: 19,
          detectRetina: true,
          crossOrigin: true,
        }).addTo(map);
      } catch (e) {
        console.error('Failed to switch tile layers:', e);
      }
    });

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
  const latestCoord = (Array.isArray(coordinates) && coordinates.length > 0) ? coordinates[coordinates.length - 1] : (initialCenter || readLatLngFromQuery() || null);

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
    if (latestCoord && typeof latestCoord.lat === 'number' && typeof latestCoord.lng === 'number') {
      if (markerRef.current) {
        markerRef.current.setLatLng([latestCoord.lat, latestCoord.lng]);
      } else {
        markerRef.current = L.marker([latestCoord.lat, latestCoord.lng], {
          icon: canSatIcon,
          zIndexOffset: 1000,
        }).addTo(map);
      }

      markerRef.current.bindPopup(
        `<b>🛰️ CanSat Astra</b><br>
         ⏰ Hora: ${latestCoord.time || "N/A"}<br>
         🌐 Lat: ${latestCoord.lat.toFixed(6)}<br>
         🌐 Lng: ${latestCoord.lng.toFixed(6)}<br>
         ⛰️ Alt: ${(latestCoord.alt || 0).toFixed(1)} m`
      );
    }

    // --- Polyline del recorrido ---
    // Update or create polyline only if we have valid coordinates array
    if (Array.isArray(coordinates) && coordinates.length > 0) {
      if (pathRef.current) {
        pathRef.current.setLatLngs(coordinates.map((c) => [c.lat, c.lng]));
      } else {
        pathRef.current = L.polyline(coordinates.map((c) => [c.lat, c.lng]), {
          color: '#3b82f6',
          weight: 3,
          opacity: 0.8,
        }).addTo(map);
      }

      // --- Breadcrumbs (cada punto con popup) ---
      breadcrumbsLayerRef.current.clearLayers();
      coordinates.forEach((coord, idx) => {
        if (typeof coord.lat !== 'number' || typeof coord.lng !== 'number') return;
        const circle = L.circleMarker([coord.lat, coord.lng], {
          radius: idx === coordinates.length - 1 ? 5 : 3,
          color: idx === coordinates.length - 1 ? '#FF0000' : '#3b82f6',
          fillColor: idx === coordinates.length - 1 ? '#FF0000' : '#3b82f6',
          fillOpacity: idx === coordinates.length - 1 ? 0.5 : 0.6,
        });

        circle.bindPopup(`
          <b>📍 Punto ${idx + 1}</b><br>
          ⏰ Hora: ${coord.time || "N/A"}<br>
          🌐 Lat: ${coord.lat.toFixed(6)}<br>
          🌐 Lng: ${coord.lng.toFixed(6)}<br>
          ⛰️ Alt: ${(coord.alt || 0).toFixed(1)} m
        `);

        circle.addTo(breadcrumbsLayerRef.current);
      });
    }

    // --- Ajuste automático de vista ---
    if (Array.isArray(coordinates) && coordinates.length > 1) {
      const bounds = L.latLngBounds(coordinates.map((c) => [c.lat, c.lng]));
      map.fitBounds(bounds, { padding: [50, 50] });
    } else if (latestCoord && typeof latestCoord.lat === 'number' && typeof latestCoord.lng === 'number') {
      map.panTo([latestCoord.lat, latestCoord.lng]);
    }
  }, [coordinates]);

  const centerMap = () => {
    if (mapInstanceRef.current && markerRef.current) {
      mapInstanceRef.current.panTo(markerRef.current.getLatLng());
    }
  };

  const setMapToLatLng = (lat, lng, alt = 0) => {
    try {
      if (!mapInstanceRef.current) return;
      const map = mapInstanceRef.current;
      const coord = { lat: Number(lat), lng: Number(lng), alt };
      overrideCoordRef.current = coord;

      if (markerRef.current) {
        markerRef.current.setLatLng([coord.lat, coord.lng]);
      } else {
        const canSatIcon = L.divIcon({
          className: 'custom-cansat-marker',
          html: `<div style="width: 20px; height: 20px; background: #ef4444; border: 3px solid white; border-radius: 50%; box-shadow: 0 0 15px #ef4444, 0 0 25px #ef4444;"></div>`,
          iconSize: [20, 20],
          iconAnchor: [10, 10],
        });
        markerRef.current = L.marker([coord.lat, coord.lng], { icon: canSatIcon, zIndexOffset: 1000 }).addTo(map);
      }
      markerRef.current.bindPopup(`<b>📍 Ejemplo</b><br>Lat: ${coord.lat.toFixed(6)}<br>Lng: ${coord.lng.toFixed(6)}`);
      map.panTo([coord.lat, coord.lng]);
      // update breadcrumbs layer so point is visible
      try {
        if (breadcrumbsLayerRef.current) breadcrumbsLayerRef.current.clearLayers();
        const circle = L.circleMarker([coord.lat, coord.lng], { radius: 5, color: '#FF0000', fillColor: '#FF0000', fillOpacity: 0.6 });
        circle.bindPopup(`<b>📍 Ejemplo</b><br>Lat: ${coord.lat.toFixed(6)}<br>Lng: ${coord.lng.toFixed(6)}`);
        breadcrumbsLayerRef.current.addLayer(circle);
      } catch (e) {}
    } catch (e) {
      console.error('setMapToLatLng error', e);
    }
  };

  const downloadMapImage = async () => {
    try {
      const el = mapRef.current;
      if (!el) return;
      const canvas = await html2canvas(el, { backgroundColor: '#0f172a', useCORS: true });
      const dataUrl = canvas.toDataURL('image/png');
      const a = document.createElement('a');
      a.href = dataUrl;
      const now = new Date().toISOString().replace(/[:.]/g, '-');
      a.download = `astra_map_${now}.png`;
      document.body.appendChild(a);
      a.click();
      a.remove();
    } catch (e) {
      console.error('Failed to download map image', e);
    }
  };

  const urlCoord = (typeof window !== 'undefined') ? (new URLSearchParams(window.location.search)) : null;
  const parsedUrlCoord = urlCoord ? { lat: parseFloat(urlCoord.get('lat')), lng: parseFloat(urlCoord.get('lng')) } : null;
  const currentCoord = overrideCoordRef.current || (Array.isArray(coordinates) && coordinates.length > 0)
    ? coordinates[coordinates.length - 1]
    : (initialCenter || (parsedUrlCoord && !Number.isNaN(parsedUrlCoord.lat) && !Number.isNaN(parsedUrlCoord.lng) ? { lat: parsedUrlCoord.lat, lng: parsedUrlCoord.lng, alt: 0 } : { lat: 0, lng: 0, alt: 0 }));

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
        <Button
            onClick={downloadMapImage}
            variant="outline"
            size="sm"
            className="ml-3 bg-transparent border-green-400 text-green-400 hover:bg-green-400 hover:text-black"
          >
            📥 Descargar mapa
          </Button>
          <Button
            onClick={() => setMapToLatLng(6.581477107274777, -75.8226857277858, 0)}
            variant="outline"
            size="sm"
            className="ml-3 bg-transparent border-yellow-400 text-yellow-400 hover:bg-yellow-400 hover:text-black"
          >
            📍 Mostrar ejemplo
          </Button>
          <Button
            onClick={() => setUseGoogle(u => !u)}
            variant="outline"
            size="sm"
            className="ml-3 bg-transparent border-indigo-400 text-indigo-400 hover:bg-indigo-400 hover:text-black"
          >
            {useGoogle ? 'Usar Leaflet' : 'Usar Google Maps'}
          </Button>
      </div>

      <div className="w-full flex-grow rounded-lg overflow-hidden border border-gray-600" style={{ minHeight: '300px' }}>
        {!useGoogle && (
          <div ref={mapRef} style={{ width: '100%', height: '100%', background: '#1f2937' }} />
        )}
        {useGoogle && (
          // Google Maps embed iframe (no API key required) as a simple fallback. Center on currentCoord.
          <iframe
            title="Google Maps Embed"
            width="100%"
            height="100%"
            style={{ border: 0 }}
            loading="lazy"
            src={`https://www.google.com/maps?q=${(currentCoord.lat || 0).toFixed(6)},${(currentCoord.lng || 0).toFixed(6)}&z=15&output=embed`}
          />
        )}
      </div>

      <div className="grid grid-cols-3 gap-4 mt-6 text-center">
        <div className="bg-gray-800/50 rounded-lg p-3">
          <div className="text-blue-400 text-sm font-semibold">Latitud</div>
          <div className="text-white font-mono text-sm">{(currentCoord.lat || 0).toFixed ? currentCoord.lat.toFixed(6) : String(currentCoord.lat)}</div>
        </div>
        <div className="bg-gray-800/50 rounded-lg p-3">
          <div className="text-red-400 text-sm font-semibold">Longitud</div>
          <div className="text-white font-mono text-sm">{(currentCoord.lng || 0).toFixed ? currentCoord.lng.toFixed(6) : String(currentCoord.lng)}</div>
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
