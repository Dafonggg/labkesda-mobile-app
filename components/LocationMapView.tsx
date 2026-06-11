import React, { useRef, useEffect, useCallback, useImperativeHandle, forwardRef } from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';
import { WebView, type WebViewMessageEvent } from 'react-native-webview';
import { Colors, Radius } from '@/constants/theme';

// ─── Default center: Purwakarta, Jawa Barat ─────────────────────────────────
const DEFAULT_LATITUDE = -6.5562;
const DEFAULT_LONGITUDE = 107.4467;
const DEFAULT_ZOOM = 15;

// ─── Types ───────────────────────────────────────────────────────────────────

export interface MapMarker {
  id: string;
  latitude: number;
  longitude: number;
  title: string;
  description?: string;
  color?: string;
}

interface LocationMapViewProps {
  /** Current latitude. Null = no marker shown, map centers on default. */
  latitude: number | null;
  /** Current longitude. Null = no marker shown, map centers on default. */
  longitude: number | null;
  /** Called when user taps map to pick a new location. If omitted, map is read-only. */
  onChange?: (lat: number, lng: number) => void;
  /** Map container height in pixels. Default 180. */
  height?: number;
  /** Show the blue user-location dot. Default false. */
  showsUserLocation?: boolean;
  /** Extra markers to display on the map (e.g. jadwal locations). */
  markers?: MapMarker[];
  /** Called when a marker callout is pressed. */
  onMarkerCalloutPress?: (marker: MapMarker) => void;
  /** If true, auto-fit map to show all markers. Default false. */
  fitToMarkers?: boolean;
  /** If true, removes border radius and border for full-screen usage. Default false. */
  borderless?: boolean;
}

// ─── Ref API (for imperative control from parent) ────────────────────────────

export interface LocationMapViewRef {
  flyTo: (lat: number, lng: number, zoom?: number) => void;
  fitBounds: (coords: { latitude: number; longitude: number }[]) => void;
}

// ─── Leaflet HTML Generator ──────────────────────────────────────────────────

function generateMapHtml({
  centerLat,
  centerLng,
  zoom,
  isPickable,
  showsUserLocation,
  markerLat,
  markerLng,
  markers,
}: {
  centerLat: number;
  centerLng: number;
  zoom: number;
  isPickable: boolean;
  showsUserLocation: boolean;
  markerLat: number | null;
  markerLng: number | null;
  markers: MapMarker[];
}): string {
  const markersJson = JSON.stringify(markers);

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
  <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
  <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    html, body { width: 100%; height: 100%; overflow: hidden; }
    #map { width: 100%; height: 100%; }

    /* Custom marker styles */
    .custom-marker {
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .marker-pin {
      width: 28px;
      height: 28px;
      border-radius: 50% 50% 50% 0;
      position: relative;
      transform: rotate(-45deg);
      box-shadow: 0 2px 8px rgba(0,0,0,0.3);
      border: 2px solid #fff;
    }
    .marker-pin::after {
      content: '';
      width: 10px;
      height: 10px;
      border-radius: 50%;
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      background: #fff;
    }

    /* Popup styles */
    .leaflet-popup-content-wrapper {
      border-radius: 12px !important;
      box-shadow: 0 4px 16px rgba(0,0,0,0.15) !important;
      padding: 0 !important;
    }
    .leaflet-popup-content {
      margin: 10px 14px !important;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif !important;
      font-size: 12px !important;
      line-height: 1.4 !important;
    }
    .leaflet-popup-content .popup-title {
      font-weight: 600;
      font-size: 13px;
      color: #1a1a1a;
      margin-bottom: 2px;
    }
    .leaflet-popup-content .popup-desc {
      color: #666;
      font-size: 11px;
    }
    .leaflet-popup-tip {
      box-shadow: 0 4px 16px rgba(0,0,0,0.15) !important;
    }

    /* Hide Leaflet attribution for cleaner look */
    .leaflet-control-attribution {
      font-size: 8px !important;
      background: rgba(255,255,255,0.7) !important;
      padding: 2px 5px !important;
    }

    /* Zoom controls styling */
    .leaflet-control-zoom a {
      width: 32px !important;
      height: 32px !important;
      line-height: 32px !important;
      font-size: 16px !important;
      border-radius: 8px !important;
      background: rgba(255,255,255,0.95) !important;
      color: #333 !important;
      box-shadow: 0 2px 6px rgba(0,0,0,0.15) !important;
    }
    .leaflet-control-zoom {
      border: none !important;
      border-radius: 10px !important;
      overflow: hidden;
      box-shadow: 0 2px 8px rgba(0,0,0,0.12) !important;
    }
  </style>
</head>
<body>
  <div id="map"></div>
  <script>
    // ── Initialize map ──
    var map = L.map('map', {
      center: [${centerLat}, ${centerLng}],
      zoom: ${zoom},
      zoomControl: true,
      attributionControl: true,
    });

    // ── Force map to recalculate size (fixes black area bug in WebView) ──
    setTimeout(function() { map.invalidateSize(); }, 100);
    setTimeout(function() { map.invalidateSize(); }, 300);
    setTimeout(function() { map.invalidateSize(); }, 800);
    setTimeout(function() { map.invalidateSize(); }, 1500);
    window.addEventListener('resize', function() { map.invalidateSize(); });
    // Also use ResizeObserver for dynamic container changes
    if (typeof ResizeObserver !== 'undefined') {
      new ResizeObserver(function() { map.invalidateSize(); }).observe(document.getElementById('map'));
    }

    // ── CartoDB Voyager tiles (modern, clean look) ──
    L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a> &copy; <a href="https://carto.com/">CARTO</a>',
      subdomains: 'abcd',
      maxZoom: 20,
    }).addTo(map);

    // ── SVG icon factory ──
    function createMarkerIcon(color) {
      return L.divIcon({
        className: 'custom-marker',
        html: '<div class="marker-pin" style="background-color: ' + color + ';"></div>',
        iconSize: [28, 40],
        iconAnchor: [14, 40],
        popupAnchor: [0, -42],
      });
    }

    // ── Primary marker ──
    var primaryMarker = null;
    ${markerLat !== null && markerLng !== null ? `
    primaryMarker = L.marker([${markerLat}, ${markerLng}], {
      icon: createMarkerIcon('#006a44'),
    }).addTo(map);
    primaryMarker.bindPopup(
      '<div class="popup-title">Lokasi Sampling</div>' +
      '<div class="popup-desc">' + ${markerLat}.toFixed(6) + ', ' + ${markerLng}.toFixed(6) + '</div>'
    );
    ` : ''}

    // ── Extra markers ──
    var extraMarkers = ${markersJson};
    var markerObjects = {};
    extraMarkers.forEach(function(m) {
      var color = m.color || '#2563EB';
      var marker = L.marker([m.latitude, m.longitude], {
        icon: createMarkerIcon(color),
      }).addTo(map);

      var popupHtml = '<div class="popup-title">' + m.title + '</div>';
      if (m.description) {
        popupHtml += '<div class="popup-desc">' + m.description + '</div>';
      }
      marker.bindPopup(popupHtml);

      marker.on('click', function() {
        window.ReactNativeWebView.postMessage(JSON.stringify({
          type: 'markerPress',
          markerId: m.id,
        }));
      });

      markerObjects[m.id] = marker;
    });

    // ── User location ──
    ${showsUserLocation ? `
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(function(pos) {
        var userLat = pos.coords.latitude;
        var userLng = pos.coords.longitude;
        L.circleMarker([userLat, userLng], {
          radius: 7,
          fillColor: '#4285F4',
          color: '#fff',
          weight: 2,
          opacity: 1,
          fillOpacity: 1,
        }).addTo(map);
        L.circle([userLat, userLng], {
          radius: pos.coords.accuracy || 30,
          fillColor: '#4285F4',
          color: '#4285F4',
          weight: 1,
          opacity: 0.15,
          fillOpacity: 0.1,
        }).addTo(map);
      });
    }
    ` : ''}

    // ── Fit to all markers ──
    ${markers.length > 0 ? `
    (function() {
      var allCoords = [];
      ${markerLat !== null && markerLng !== null ? `allCoords.push([${markerLat}, ${markerLng}]);` : ''}
      extraMarkers.forEach(function(m) {
        allCoords.push([m.latitude, m.longitude]);
      });
      if (allCoords.length > 1) {
        setTimeout(function() {
          map.fitBounds(allCoords, { padding: [40, 40], maxZoom: 16 });
        }, 300);
      }
    })();
    ` : ''}

    // ── Map tap handler (picker mode) ──
    ${isPickable ? `
    map.on('click', function(e) {
      var lat = e.latlng.lat;
      var lng = e.latlng.lng;

      // Move/create primary marker
      if (primaryMarker) {
        primaryMarker.setLatLng([lat, lng]);
      } else {
        primaryMarker = L.marker([lat, lng], {
          icon: createMarkerIcon('#006a44'),
        }).addTo(map);
      }
      primaryMarker.bindPopup(
        '<div class="popup-title">Lokasi Sampling</div>' +
        '<div class="popup-desc">' + lat.toFixed(6) + ', ' + lng.toFixed(6) + '</div>'
      );

      // Send to React Native
      window.ReactNativeWebView.postMessage(JSON.stringify({
        type: 'locationPicked',
        latitude: lat,
        longitude: lng,
      }));
    });
    ` : ''}

    // ── API for injected JS ──
    window.flyTo = function(lat, lng, zoom) {
      map.flyTo([lat, lng], zoom || 15, { duration: 0.8 });
      if (primaryMarker) {
        primaryMarker.setLatLng([lat, lng]);
        primaryMarker.setPopupContent(
          '<div class="popup-title">Lokasi Sampling</div>' +
          '<div class="popup-desc">' + lat.toFixed(6) + ', ' + lng.toFixed(6) + '</div>'
        );
      }
    };

    window.fitBounds = function(coordsJson) {
      var coords = JSON.parse(coordsJson);
      if (coords.length > 0) {
        var bounds = coords.map(function(c) { return [c.latitude, c.longitude]; });
        map.fitBounds(bounds, { padding: [50, 50], maxZoom: 16 });
      }
    };

    window.updatePrimaryMarker = function(lat, lng) {
      if (primaryMarker) {
        primaryMarker.setLatLng([lat, lng]);
      } else {
        primaryMarker = L.marker([lat, lng], {
          icon: createMarkerIcon('#006a44'),
        }).addTo(map);
      }
      primaryMarker.bindPopup(
        '<div class="popup-title">Lokasi Sampling</div>' +
        '<div class="popup-desc">' + lat.toFixed(6) + ', ' + lng.toFixed(6) + '</div>'
      );
      map.flyTo([lat, lng], map.getZoom(), { duration: 0.6 });
    };
  </script>
</body>
</html>
`;
}

// ─── Component ───────────────────────────────────────────────────────────────

const LocationMapView = forwardRef<LocationMapViewRef, LocationMapViewProps>(({
  latitude,
  longitude,
  onChange,
  height = 180,
  showsUserLocation = false,
  markers = [],
  onMarkerCalloutPress,
  fitToMarkers = false,
  borderless = false,
}, ref) => {
  const webViewRef = useRef<WebView>(null);
  const isReadOnly = !onChange;
  const isFirstRender = useRef(true);

  const safeLat = (latitude !== null && latitude !== undefined) ? Number(latitude) : NaN;
  const safeLng = (longitude !== null && longitude !== undefined) ? Number(longitude) : NaN;
  const hasCoords = !isNaN(safeLat) && !isNaN(safeLng);

  const centerLat = hasCoords ? safeLat : DEFAULT_LATITUDE;
  const centerLng = hasCoords ? safeLng : DEFAULT_LONGITUDE;

  // ── Expose imperative API ──
  useImperativeHandle(ref, () => ({
    flyTo: (lat: number, lng: number, zoom?: number) => {
      webViewRef.current?.injectJavaScript(
        `window.flyTo(${lat}, ${lng}, ${zoom || DEFAULT_ZOOM}); true;`
      );
    },
    fitBounds: (coords: { latitude: number; longitude: number }[]) => {
      webViewRef.current?.injectJavaScript(
        `window.fitBounds('${JSON.stringify(coords)}'); true;`
      );
    },
  }));

  // ── Update primary marker when coords change (after initial render) ──
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    if (hasCoords && webViewRef.current) {
      webViewRef.current.injectJavaScript(
        `window.updatePrimaryMarker(${safeLat}, ${safeLng}); true;`
      );
    }
  }, [safeLat, safeLng, hasCoords]);

  // ── Handle messages from WebView ──
  const handleMessage = useCallback(
    (event: WebViewMessageEvent) => {
      try {
        const data = JSON.parse(event.nativeEvent.data);

        if (data.type === 'locationPicked' && onChange) {
          onChange(data.latitude, data.longitude);
        }

        if (data.type === 'markerPress' && onMarkerCalloutPress) {
          const marker = markers.find((m) => m.id === data.markerId);
          if (marker) {
            onMarkerCalloutPress(marker);
          }
        }
      } catch {
        // Ignore parse errors
      }
    },
    [onChange, onMarkerCalloutPress, markers],
  );

  // ── Generate HTML ──
  const htmlContent = generateMapHtml({
    centerLat,
    centerLng,
    zoom: DEFAULT_ZOOM,
    isPickable: !isReadOnly,
    showsUserLocation,
    markerLat: hasCoords ? safeLat : null,
    markerLng: hasCoords ? safeLng : null,
    markers,
  });

  return (
    <View style={[
      styles.container,
      height ? { height } : { flex: 1 },
      borderless && styles.containerBorderless,
    ]}>
      <WebView
        ref={webViewRef}
        source={{ html: htmlContent }}
        style={styles.map}
        onMessage={handleMessage}
        scrollEnabled={false}
        bounces={false}
        overScrollMode="never"
        javaScriptEnabled
        domStorageEnabled
        startInLoadingState
        showsHorizontalScrollIndicator={false}
        showsVerticalScrollIndicator={false}
        originWhitelist={['*']}
        mixedContentMode="always"
        // Prevent WebView from stealing scroll on Android
        nestedScrollEnabled={false}
        androidLayerType="hardware"
      />

      {/* Read-only overlay hint */}
      {isReadOnly && hasCoords && (
        <View style={styles.readOnlyBadge}>
          <Text style={styles.readOnlyText}>Lokasi Tersimpan</Text>
        </View>
      )}

      {/* Tap-to-pick hint */}
      {!isReadOnly && !hasCoords && (
        <View style={styles.hintOverlay}>
          <Text style={styles.hintText}>Tap pada peta untuk memilih lokasi</Text>
        </View>
      )}
    </View>
  );
});

LocationMapView.displayName = 'LocationMapView';

// ─── Styles ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    borderRadius: Radius.lg,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: Colors.outlineVariant,
    backgroundColor: Colors.surfaceContainerLow,
  },
  containerBorderless: {
    borderRadius: 0,
    borderWidth: 0,
    borderColor: 'transparent',
  },
  map: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  readOnlyBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: 'rgba(0, 106, 68, 0.85)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: Radius.full,
  },
  readOnlyText: {
    fontSize: 10,
    fontFamily: 'Inter_600SemiBold',
    color: Colors.onPrimary,
    letterSpacing: 0.5,
  },
  hintOverlay: {
    position: 'absolute',
    bottom: 10,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  hintText: {
    fontSize: 11,
    fontFamily: 'Inter_500Medium',
    color: Colors.onSurface,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: Radius.full,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: Colors.outlineVariant,
  },
});

export default LocationMapView;
