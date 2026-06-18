import { useMemo } from 'react';
import { Linking, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { useTheme, type AppTheme } from '../theme';
import { Icon } from './Icon';

export interface MapPoint {
  lat: number;
  lng: number;
  label?: string;
  kind?: 'captain' | 'pickup' | 'destination';
}

interface LiveMapProps {
  points: MapPoint[];
  height?: number;
}

/**
 * Key-free live map.
 *  - Native: renders Leaflet + OpenStreetMap tiles inside a WebView.
 *  - Web: renders a clean live-position panel + "open in maps" link
 *    (react-native-webview web support is limited, so we avoid it there).
 * Upgrade path: swap OSM tiles for Google/Mapbox once a key is configured.
 */
export function LiveMap({ points, height = 220 }: LiveMapProps) {
  const theme = useTheme();
  const s = useMemo(() => makeStyles(theme), [theme]);

  const center = points[0] ?? { lat: 32.5556, lng: 35.85 }; // Irbid fallback

  if (Platform.OS === 'web') {
    return (
      <View style={[s.webCard, { height }]}>
        <Icon name="map-pin" size={26} color={theme.colors.primary} />
        {points.map((p, i) => (
          <Text key={i} style={s.webCoord}>
            {p.label ? `${p.label}: ` : ''}{p.lat.toFixed(5)}, {p.lng.toFixed(5)}
          </Text>
        ))}
        <Pressable
          onPress={() => Linking.openURL(`https://www.openstreetmap.org/?mlat=${center.lat}&mlon=${center.lng}#map=15/${center.lat}/${center.lng}`)}
          style={s.webBtn}
        >
          <Text style={s.webBtnText}>فتح في الخريطة</Text>
        </Pressable>
      </View>
    );
  }

  // Native: lazy-require so the web bundle never loads the native module.
  const { WebView } = require('react-native-webview');
  const html = buildLeafletHtml(points, center);

  return (
    <View style={[s.mapWrap, { height }]}>
      <WebView
        originWhitelist={['*']}
        source={{ html }}
        style={{ flex: 1, backgroundColor: 'transparent' }}
        scrollEnabled={false}
      />
    </View>
  );
}

function buildLeafletHtml(points: MapPoint[], center: MapPoint): string {
  const data = JSON.stringify(points);
  const c = JSON.stringify({ lat: center.lat, lng: center.lng });
  return `<!DOCTYPE html><html><head>
<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1">
<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"/>
<style>html,body,#map{height:100%;margin:0;background:#eef3f0}</style>
</head><body><div id="map"></div>
<script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
<script>
  var pts = ${data}; var c = ${c};
  var map = L.map('map',{zoomControl:false,attributionControl:false}).setView([c.lat,c.lng],14);
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:19}).addTo(map);
  var colors={captain:'#0B7A43',pickup:'#2563EB',destination:'#E6B23E'};
  var bounds=[];
  pts.forEach(function(p){
    var m=L.circleMarker([p.lat,p.lng],{radius:9,color:'#fff',weight:3,fillColor:colors[p.kind]||'#0B7A43',fillOpacity:1}).addTo(map);
    if(p.label){m.bindTooltip(p.label,{permanent:false});}
    bounds.push([p.lat,p.lng]);
  });
  if(bounds.length>1){map.fitBounds(bounds,{padding:[40,40]});}
</script></body></html>`;
}

const makeStyles = (t: AppTheme) =>
  StyleSheet.create({
    mapWrap: { borderRadius: t.radius.lg, overflow: 'hidden', borderWidth: 1, borderColor: t.colors.border, marginTop: t.spacing.sm },
    webCard: { borderRadius: t.radius.lg, borderWidth: 1, borderColor: t.colors.border, backgroundColor: t.colors.primarySoft, alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: t.spacing.sm },
    webCoord: { fontFamily: t.fontFamily.medium, fontSize: 13, color: t.colors.text },
    webBtn: { marginTop: 6, backgroundColor: t.colors.primary, borderRadius: t.radius.md, paddingVertical: 8, paddingHorizontal: t.spacing.lg },
    webBtnText: { fontFamily: t.fontFamily.bold, fontSize: 13, color: t.colors.onPrimary },
  });
