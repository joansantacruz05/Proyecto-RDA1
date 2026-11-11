import React, { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import styles from './InteractiveMap.module.css';

interface InteractiveMapProps {
  lat: number;
  lng: number;
  zoom?: number;
  height?: string | number;
  editable?: boolean;
  markerTitle?: string;
  markerSubtitle?: string;
  isApproximate?: boolean;
  onChange?: (lat: number, lng: number) => void;
}

const createPinIcon = (editable: boolean) =>
  L.divIcon({
    className: styles.pinIconWrapper,
    iconSize: [34, 42],
    iconAnchor: [17, 40],
    popupAnchor: [0, -38],
    html: `<div class="${styles.pinVisual}" style="cursor:${editable ? 'grab' : 'pointer'}">
      <svg width="34" height="42" viewBox="0 0 34 42" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M17 1C8.163 1 1 8.163 1 17c0 11.4 16 24 16 24s16-12.6 16-24C33 8.163 25.837 1 17 1z" fill="#0F2744" stroke="#D4AF37" stroke-width="2.2"/>
        <circle cx="17" cy="17" r="6" fill="#D4AF37"/>
      </svg>
    </div>`,
  });

function roundCoord(val: number): number {
  return Math.round(val * 1000000) / 1000000;
}

export const InteractiveMap: React.FC<InteractiveMapProps> = ({
  lat,
  lng,
  zoom = 14,
  height = 280,
  editable = false,
  markerTitle,
  markerSubtitle,
  isApproximate = false,
  onChange,
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markerRef = useRef<L.Marker | null>(null);
  const onChangeRef = useRef(onChange);

  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  // Inicializar mapa Leaflet una sola vez
  useEffect(() => {
    const el = containerRef.current;
    if (!el || mapRef.current) return;

    const map = L.map(el, {
      center: [lat, lng],
      zoom,
      scrollWheelZoom: editable,
    });

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap',
      maxZoom: 19,
    }).addTo(map);

    const marker = L.marker([lat, lng], {
      draggable: editable,
      icon: createPinIcon(editable),
    }).addTo(map);

    if (editable) {
      map.on('click', (e: L.LeafletMouseEvent) => {
        const nextLat = roundCoord(e.latlng.lat);
        const nextLng = roundCoord(e.latlng.lng);
        marker.setLatLng([nextLat, nextLng]);
        onChangeRef.current?.(nextLat, nextLng);
      });

      marker.on('dragend', () => {
        const pos = marker.getLatLng();
        onChangeRef.current?.(roundCoord(pos.lat), roundCoord(pos.lng));
      });
    }

    mapRef.current = map;
    markerRef.current = marker;

    // Forzar recalculo de dimensiones cuando se monta dentro de modales o pestanas
    const t1 = window.setTimeout(() => map.invalidateSize(), 120);
    const t2 = window.setTimeout(() => map.invalidateSize(), 380);

    let ro: ResizeObserver | null = null;
    if (typeof ResizeObserver !== 'undefined') {
      ro = new ResizeObserver(() => map.invalidateSize());
      ro.observe(el);
    }

    return () => {
      window.clearTimeout(t1);
      window.clearTimeout(t2);
      ro?.disconnect();
      map.remove();
      mapRef.current = null;
      markerRef.current = null;
    };
  }, [editable]);

  // Sincronizar posicion y zoom al cambiar props externamente
  useEffect(() => {
    const map = mapRef.current;
    const marker = markerRef.current;
    if (!map || !marker) return;

    const current = marker.getLatLng();
    const moved =
      Math.abs(current.lat - lat) > 0.00001 ||
      Math.abs(current.lng - lng) > 0.00001;

    if (moved) {
      marker.setLatLng([lat, lng]);
      map.setView([lat, lng], zoom, { animate: true });
    }
  }, [lat, lng, zoom]);

  // Actualizar contenido del popup en modo lectura
  useEffect(() => {
    const marker = markerRef.current;
    if (!marker) return;
    if (!editable && markerTitle) {
      const safeTitle = markerTitle.replace(/[<>&"]/g, '');
      const safeSub = (markerSubtitle || '').replace(/[<>&"]/g, '');
      marker.bindPopup(
        `<div style="font-family:inherit;line-height:1.35"><strong>${safeTitle}</strong>${safeSub ? `<br/><span style="color:#4a5568;font-size:12px">${safeSub}</span>` : ''}</div>`,
      );
    } else {
      marker.unbindPopup();
    }
  }, [editable, markerTitle, markerSubtitle]);

  return (
    <div
      className={styles.mapWrapper}
      style={{ height: typeof height === 'number' ? `${height}px` : height }}
    >
      <div ref={containerRef} className={styles.mapCanvas} />
      {editable ? (
        <div className={styles.mapHintBar}>
          Haz clic en el mapa o arrastra el pin para fijar la ubicación exacta
        </div>
      ) : isApproximate ? (
        <div className={styles.mapHintBar}>
          Ubicación aproximada de referencia por ciudad
        </div>
      ) : null}
    </div>
  );
};

