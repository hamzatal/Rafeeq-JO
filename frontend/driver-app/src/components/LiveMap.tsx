import { useEffect, useMemo, useRef } from 'react';
import { Linking, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { useTheme, type AppTheme } from '../theme';
import { getMapsKey } from '../lib/appConfig';
import { Icon } from './Icon';

export interface MapPoint {
  lat: number;
  lng: number;
  label?: string;
  kind?: 'captain' | 'pickup' | 'destination' | 'origin';
}

interface LiveMapProps {
  /** Markers to render. A `captain` point animates smoothly between updates. */
  points: MapPoint[];
  /** Optional ordered polyline (e.g. captain → pickups → university). */
  route?: { lat: number; lng: number }[];
  /** When provided, tapping the map reports the chosen coordinates. */
  onPick?: (p: { lat: number; lng: number }) => void;
  /** Show the small legend below the map. Default: true when >1 kind. */
  legend?: boolean;
  height?: number;
}

/**
 * Google Maps key, resolved at runtime from the backend `/config` endpoint
 * (see lib/appConfig). When present the map uses the OFFICIAL Google Maps
 * JavaScript API; otherwise it falls back to free OpenStreetMap (Leaflet).
 * Either way the map is fully functional.
 */
const IRBID = { lat: 32.5556, lng: 35.85 };

export function LiveMap({ points, route, onPick, legend, height = 220 }: LiveMapProps) {
  const theme = useTheme();
  const s = useMemo(() => makeStyles(theme), [theme]);
  const webRef = useRef<any>(null);

  const center = points[0] ?? route?.[0] ?? IRBID;
  const colors = useMemo(
    () => ({
      captain: theme.colors.primary,
      pickup: '#2563EB',
      destination: theme.colors.accent,
      origin: theme.colors.success,
      route: theme.colors.primary,
    }),
    [theme],
  );

  const kinds = new Set(points.map((p) => p.kind ?? 'pickup'));
  const showLegend = legend ?? kinds.size > 1;

  // ── Web fallback: a clean live panel (Leaflet/WebView aren't reliable on web).
  if (Platform.OS === 'web') {
    return (
      <View>
        <View style={[s.webCard, { height }]}>
          <Icon name="map-pin" size={26} color={theme.colors.primary} />
          {points.map((p, i) => (
            <Text key={i} style={s.webCoord}>
              {p.label ? `${p.label}: ` : ''}
              {p.lat.toFixed(5)}, {p.lng.toFixed(5)}
            </Text>
          ))}
          <Pressable
            onPress={() =>
              Linking.openURL(
                `https://www.openstreetmap.org/?mlat=${center.lat}&mlon=${center.lng}#map=15/${center.lat}/${center.lng}`,
              )
            }
            style={s.webBtn}
          >
            <Text style={s.webBtnText}>فتح في الخريطة</Text>
          </Pressable>
        </View>
        {showLegend && <Legend s={s} colors={colors} kinds={kinds} />}
      </View>
    );
  }

  // ── Native: a WebView map. Official Google Maps JS when a key is configured,
  // else Leaflet + OpenStreetMap. Built once; live updates are injected.
  const { WebView } = require('react-native-webview');
  const mapsKey = getMapsKey();

  const initial = useRef({ points, route, center }).current;
  const html = useMemo(
    () =>
      mapsKey
        ? buildGoogleHtml(initial.points, initial.route, initial.center, colors, !!onPick, mapsKey)
        : buildLeafletHtml(initial.points, initial.route, initial.center, colors, !!onPick),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [mapsKey],
  );

  // Push live data into the running map whenever inputs change.
  useEffect(() => {
    const payload = JSON.stringify({ points, route: route ?? null });
    webRef.current?.injectJavaScript(`window.__rafeeqUpdate && window.__rafeeqUpdate(${payload}); true;`);
  }, [points, route]);

  const onMessage = (e: { nativeEvent: { data: string } }) => {
    if (!onPick) return;
    try {
      const m = JSON.parse(e.nativeEvent.data);
      if (m?.type === 'pick' && Number.isFinite(m.lat) && Number.isFinite(m.lng)) {
        onPick({ lat: m.lat, lng: m.lng });
      }
    } catch {
      /* ignore malformed messages */
    }
  };

  return (
    <View>
      <View style={[s.mapWrap, { height }]}>
        <WebView
          ref={webRef}
          originWhitelist={['*']}
          source={{ html }}
          style={{ flex: 1, backgroundColor: 'transparent' }}
          scrollEnabled={false}
          onMessage={onMessage}
        />
        {onPick && (
          <View style={s.pickHint} pointerEvents="none">
            <Icon name="crosshair" size={13} color={theme.colors.onPrimary} />
            <Text style={s.pickHintText}>اضغط على الخريطة لتحديد الموقع</Text>
          </View>
        )}
      </View>
      {showLegend && <Legend s={s} colors={colors} kinds={kinds} />}
    </View>
  );
}

function Legend({
  s,
  colors,
  kinds,
}: {
  s: ReturnType<typeof makeStyles>;
  colors: Record<string, string>;
  kinds: Set<string>;
}) {
  const labels: Record<string, string> = {
    captain: 'الكابتن',
    pickup: 'نقطة الالتقاط',
    destination: 'الوجهة',
    origin: 'الانطلاق',
  };
  return (
    <View style={s.legend}>
      {[...kinds].map((k) => (
        <View key={k} style={s.legendItem}>
          <View style={[s.legendDot, { backgroundColor: colors[k] ?? colors.pickup }]} />
          <Text style={s.legendText}>{labels[k] ?? k}</Text>
        </View>
      ))}
    </View>
  );
}

function buildGoogleHtml(
  points: MapPoint[],
  route: { lat: number; lng: number }[] | undefined,
  center: { lat: number; lng: number },
  colors: Record<string, string>,
  pickable: boolean,
  mapsKey: string,
): string {
  const data = JSON.stringify({ points, route: route ?? null });
  const c = JSON.stringify(center);
  const col = JSON.stringify(colors);

  // Official Google Maps JavaScript API.
  return `<!DOCTYPE html><html><head>
<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1">
<style>
  html,body,#map{height:100%;margin:0;background:#eef3f0}
</style></head><body><div id="map"></div>
<script>
  var COL = ${col};
  var CENTER = ${c};
  var PICKABLE = ${pickable ? 'true' : 'false'};
  var map, markers=[], routeLine=null, captainMarker=null, pickMarker=null, pendingInitial=${data};

  function post(lat,lng){
    if(window.ReactNativeWebView){window.ReactNativeWebView.postMessage(JSON.stringify({type:'pick',lat:lat,lng:lng}));}
  }

  function pin(kind){
    var bg = COL[kind] || COL.pickup;
    var glyph = kind==='captain' ? '🚗' : kind==='destination' ? '★' : kind==='origin' ? '⌂' : '●';
    var size = kind==='captain' ? 44 : 30;
    var svg = '<svg xmlns="http://www.w3.org/2000/svg" width="'+size+'" height="'+size+'">'
      + '<circle cx="'+(size/2)+'" cy="'+(size/2)+'" r="'+(size/2-3)+'" fill="'+bg+'" stroke="#fff" stroke-width="3"/>'
      + '<text x="50%" y="54%" dominant-baseline="middle" text-anchor="middle" font-size="'+(kind==='captain'?20:14)+'">'+glyph+'</text></svg>';
    return { url: 'data:image/svg+xml;charset=UTF-8,'+encodeURIComponent(svg),
             scaledSize: new google.maps.Size(size,size), anchor: new google.maps.Point(size/2,size/2) };
  }

  function draw(d){
    markers.forEach(function(m){m.setMap(null);}); markers=[];
    if(routeLine){routeLine.setMap(null);routeLine=null;}
    var bounds = new google.maps.LatLngBounds();
    var captain=null, captainIdx=-1;
    (d.points||[]).forEach(function(p,i){
      var kind=p.kind||'pickup';
      if(kind==='captain'){captain=p;captainIdx=i;}
      var m=new google.maps.Marker({position:{lat:p.lat,lng:p.lng},map:map,icon:pin(kind),title:p.label||''});
      markers.push(m); bounds.extend({lat:p.lat,lng:p.lng});
    });
    var line = d.route && d.route.length>1 ? d.route
      : ((d.points||[]).length>1 ? d.points : null);
    if(line){
      routeLine=new google.maps.Polyline({path:line.map(function(p){return {lat:p.lat,lng:p.lng};}),
        geodesic:true, strokeColor:COL.route, strokeOpacity:0.8, strokeWeight:5, map:map});
      line.forEach(function(p){bounds.extend({lat:p.lat,lng:p.lng});});
    }
    if((d.points||[]).length>1 || (line&&line.length>1)){ map.fitBounds(bounds,48); }
    else if((d.points||[]).length===1){ map.setCenter({lat:d.points[0].lat,lng:d.points[0].lng}); map.setZoom(15); }
    return captainIdx;
  }

  function animateCaptain(to){
    if(!captainMarker){return;}
    var from=captainMarker.getPosition();
    var start=Date.now(), dur=900, f={lat:from.lat(),lng:from.lng()};
    function step(){
      var t=Math.min(1,(Date.now()-start)/dur);
      captainMarker.setPosition({lat:f.lat+(to.lat-f.lat)*t, lng:f.lng+(to.lng-f.lng)*t});
      if(t<1){requestAnimationFrame(step);}
    }
    step();
  }

  window.__rafeeqUpdate=function(d){
    var newCaptain=(d.points||[]).filter(function(p){return (p.kind||'')==='captain';})[0];
    var sameCount = markers.length===(d.points||[]).length;
    if(captainMarker && newCaptain && sameCount){ animateCaptain(newCaptain); }
    else { var ci=draw(d); captainMarker = ci>=0 ? markers[ci] : null; }
  };

  function initMap(){
    map=new google.maps.Map(document.getElementById('map'),{
      center:CENTER, zoom:14, disableDefaultUI:true, gestureHandling:'greedy', clickableIcons:false });
    var ci=draw(pendingInitial); captainMarker = ci>=0 ? markers[ci] : null;
    if(PICKABLE){
      map.addListener('click',function(e){
        var ll={lat:e.latLng.lat(),lng:e.latLng.lng()};
        if(pickMarker){pickMarker.setPosition(ll);} else {
          pickMarker=new google.maps.Marker({position:ll,map:map,icon:pin('pickup'),draggable:true});
          pickMarker.addListener('dragend',function(ev){post(ev.latLng.lat(),ev.latLng.lng());});
        }
        post(ll.lat,ll.lng);
      });
    }
  }
  window.gm_authFailure=function(){ document.getElementById('map').innerHTML='<div style="padding:16px;font:14px sans-serif;color:#777">تعذّر تحميل خريطة جوجل — تحقّق من المفتاح.</div>'; };
</script>
<script async src="https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(mapsKey)}&callback=initMap&language=ar&region=JO"></script>
</body></html>`;
}

function buildLeafletHtml(
  points: MapPoint[],
  route: { lat: number; lng: number }[] | undefined,
  center: { lat: number; lng: number },
  colors: Record<string, string>,
  pickable: boolean,
): string {
  const data = JSON.stringify({ points, route: route ?? null });
  const c = JSON.stringify(center);
  const col = JSON.stringify(colors);

  // Free OpenStreetMap tiles (no key required, ToS-compliant).
  const tileUrl = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';

  return `<!DOCTYPE html><html><head>
<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1">
<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"/>
<style>
  html,body,#map{height:100%;margin:0;background:#eef3f0}
  .rfq-pin{display:flex;align-items:center;justify-content:center;border-radius:50%;
    border:3px solid #fff;box-shadow:0 1px 4px rgba(0,0,0,.4);font:700 12px sans-serif;color:#fff}
  .rfq-car{font-size:18px;line-height:1}
  .rfq-pulse{animation:rfqpulse 1.6s infinite}
  @keyframes rfqpulse{0%{box-shadow:0 0 0 0 rgba(11,121,67,.5)}70%{box-shadow:0 0 0 14px rgba(11,121,67,0)}100%{box-shadow:0 0 0 0 rgba(11,121,67,0)}}
</style></head><body><div id="map"></div>
<script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
<script>
  var COL = ${col};
  var c = ${c};
  var map = L.map('map',{zoomControl:false,attributionControl:false}).setView([c.lat,c.lng],14);
  L.tileLayer('${tileUrl}',{maxZoom:19,subdomains:['a','b','c']}).addTo(map);

  var markers=[], routeLine=null, captainMarker=null;

  function icon(kind,index){
    var bg = COL[kind] || COL.pickup;
    var inner = kind==='captain' ? '<span class="rfq-car">🚗</span>'
      : kind==='destination' ? '★'
      : kind==='origin' ? '⌂'
      : (index!=null ? (index+1) : '');
    var size = kind==='captain' ? 40 : 30;
    var cls = 'rfq-pin' + (kind==='captain' ? ' rfq-pulse' : '');
    return L.divIcon({className:'',html:'<div class="'+cls+'" style="width:'+size+'px;height:'+size+'px;background:'+bg+'">'+inner+'</div>',
      iconSize:[size,size],iconAnchor:[size/2,size/2]});
  }

  function draw(d){
    markers.forEach(function(m){map.removeLayer(m);}); markers=[];
    if(routeLine){map.removeLayer(routeLine);routeLine=null;}
    var bounds=[];
    var pickupIndex=0;
    var captain=null;
    (d.points||[]).forEach(function(p){
      var kind=p.kind||'pickup';
      var idx = kind==='pickup' ? pickupIndex++ : null;
      if(kind==='captain'){captain=p;}
      var m=L.marker([p.lat,p.lng],{icon:icon(kind,idx)}).addTo(map);
      if(p.label){m.bindTooltip(p.label,{direction:'top'});}
      markers.push(m);
      bounds.push([p.lat,p.lng]);
    });
    var line = d.route && d.route.length>1 ? d.route
      : (bounds.length>1 ? bounds.map(function(b){return {lat:b[0],lng:b[1]};}) : null);
    if(line){
      routeLine=L.polyline(line.map(function(p){return [p.lat,p.lng];}),
        {color:COL.route,weight:5,opacity:.75,dashArray:'1,8',lineCap:'round'}).addTo(map);
      line.forEach(function(p){bounds.push([p.lat,p.lng]);});
    }
    if(bounds.length>1){map.fitBounds(bounds,{padding:[44,44],maxZoom:16});}
    else if(bounds.length===1){map.setView(bounds[0],15);}
    return captain;
  }

  // Smoothly slide the captain marker from its current spot to the new one.
  function animateCaptain(to){
    if(!captainMarker){return;}
    var from=captainMarker.getLatLng();
    var start=Date.now(), dur=900;
    function step(){
      var t=Math.min(1,(Date.now()-start)/dur);
      var lat=from.lat+(to.lat-from.lat)*t, lng=from.lng+(to.lng-from.lng)*t;
      captainMarker.setLatLng([lat,lng]);
      if(t<1){requestAnimationFrame(step);}
    }
    step();
  }

  window.__rafeeqUpdate=function(d){
    // If only the captain moved, animate; otherwise redraw everything.
    var newCaptain=(d.points||[]).filter(function(p){return (p.kind||'')==='captain';})[0];
    var sameCount = markers.length===(d.points||[]).length;
    if(captainMarker && newCaptain && sameCount){
      animateCaptain(newCaptain);
    } else {
      var cap=draw(d);
      captainMarker = cap ? markers[(d.points||[]).findIndex(function(p){return (p.kind||'')==='captain';})] : null;
    }
  };

  var cap0=draw(${data});
  captainMarker = cap0 ? markers.find(function(m,i){return (${data}.points[i]||{}).kind==='captain';}) : null;

  ${pickable ? `
  var pickMarker=null;
  map.on('click',function(e){
    if(pickMarker){pickMarker.setLatLng(e.latlng);} else {
      pickMarker=L.marker(e.latlng,{icon:icon('pickup',0),draggable:true}).addTo(map);
      pickMarker.on('dragend',function(ev){var ll=ev.target.getLatLng();post(ll.lat,ll.lng);});
    }
    post(e.latlng.lat,e.latlng.lng);
  });
  function post(lat,lng){
    if(window.ReactNativeWebView){window.ReactNativeWebView.postMessage(JSON.stringify({type:'pick',lat:lat,lng:lng}));}
  }` : ''}
</script></body></html>`;
}

const makeStyles = (t: AppTheme) =>
  StyleSheet.create({
    mapWrap: {
      borderRadius: t.radius.lg,
      overflow: 'hidden',
      borderWidth: 1,
      borderColor: t.colors.border,
      marginTop: t.spacing.sm,
    },
    pickHint: {
      position: 'absolute',
      bottom: 8,
      alignSelf: 'center',
      flexDirection: 'row-reverse',
      alignItems: 'center',
      gap: 5,
      backgroundColor: t.colors.primary,
      borderRadius: t.radius.md,
      paddingVertical: 5,
      paddingHorizontal: 10,
      opacity: 0.92,
    },
    pickHintText: { fontFamily: t.fontFamily.medium, fontSize: 11, color: t.colors.onPrimary },
    legend: {
      flexDirection: 'row-reverse',
      flexWrap: 'wrap',
      gap: t.spacing.base,
      marginTop: t.spacing.xs,
      paddingHorizontal: 4,
    },
    legendItem: { flexDirection: 'row-reverse', alignItems: 'center', gap: 5 },
    legendDot: { width: 10, height: 10, borderRadius: 5 },
    legendText: { fontFamily: t.fontFamily.medium, fontSize: 11, color: t.colors.textSecondary },
    webCard: {
      borderRadius: t.radius.lg,
      borderWidth: 1,
      borderColor: t.colors.border,
      backgroundColor: t.colors.primarySoft,
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6,
      marginTop: t.spacing.sm,
    },
    webCoord: { fontFamily: t.fontFamily.medium, fontSize: 13, color: t.colors.text },
    webBtn: {
      marginTop: 6,
      backgroundColor: t.colors.primary,
      borderRadius: t.radius.md,
      paddingVertical: 8,
      paddingHorizontal: t.spacing.lg,
    },
    webBtnText: { fontFamily: t.fontFamily.bold, fontSize: 13, color: t.colors.onPrimary },
  });
