import { useId, useMemo } from 'react';
import { GeoJSONSource, Layer } from '@maplibre/maplibre-react-native';
import { circleRing } from '@/features/map/mapCamera';
import type { MapCoordinate } from '@/types';

interface MapCircleProps {
  center: MapCoordinate;
  /** Meters. */
  radius: number;
  fillColor?: string;
  strokeColor?: string;
  strokeWidth?: number;
}

/** A zone `radius` meters around `center`, drawn as a GeoJSON polygon. */
export default function MapCircle({
  center,
  radius,
  fillColor = 'rgba(46, 92, 255, 0.1)',
  strokeColor = 'rgba(46, 92, 255, 0.3)',
  strokeWidth = 1,
}: MapCircleProps) {
  const id = `zone-${useId().replace(/[^a-zA-Z0-9]/g, '')}`;
  const data = useMemo<GeoJSON.Feature<GeoJSON.Polygon>>(
    () => ({
      type: 'Feature',
      properties: {},
      geometry: { type: 'Polygon', coordinates: [circleRing(center, radius)] },
    }),
    [center.latitude, center.longitude, radius]
  );

  return (
    <GeoJSONSource id={id} data={data}>
      <Layer id={`${id}-fill`} type="fill" paint={{ 'fill-color': fillColor }} />
      <Layer
        id={`${id}-line`}
        type="line"
        paint={{ 'line-color': strokeColor, 'line-width': strokeWidth }}
      />
    </GeoJSONSource>
  );
}
