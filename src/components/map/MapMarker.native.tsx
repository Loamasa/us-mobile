import { useContext } from 'react';
import type { ReactElement } from 'react';
import { Marker } from '@maplibre/maplibre-react-native';
import MapPressGuard from './MapPressGuard';
import type { MapCoordinate } from '@/types';

interface MapMarkerProps {
  coordinate: MapCoordinate;
  onPress?: () => void;
  /** One child; its center sits on the coordinate. */
  children: ReactElement;
}

/**
 * A React Native view pinned to a map coordinate (MapLibre Marker — real
 * native views on Android, so no bitmap snapshot and no clipping).
 */
export default function MapMarker({ coordinate, onPress, children }: MapMarkerProps) {
  const guard = useContext(MapPressGuard);
  return (
    <Marker
      lngLat={[coordinate.longitude, coordinate.latitude]}
      anchor="center"
      onPress={
        onPress
          ? () => {
              guard?.markerPressed();
              onPress();
            }
          : undefined
      }
    >
      {children}
    </Marker>
  );
}
