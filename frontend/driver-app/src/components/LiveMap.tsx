import { useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Linking, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { useTheme, type AppTheme } from '../theme';
import { useI18n } from '../i18n';
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
  const { t } = useI18n();
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
            <Text style={s.webBtnText}>{t('map.openInMap')}</Text>
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

  // If Google fails to load (missing/invalid key — e.g. a non-Google key), fall
  // back to the free OpenStreetMap map so a map ALWAYS shows.
  const [googleFailed, setGoogleFailed] = useState(false);
  const useGoogle = !!mapsKey && !googleFailed;

  const initial = useRef({ points, route, center }).current;
  const html = useMemo(
    () =>
      useGoogle
        ? buildGoogleHtml(initial.points, initial.route, initial.center, colors, !!onPick, mapsKey)
        : buildLeafletHtml(initial.points, initial.route, initial.center, colors, !!onPick),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [useGoogle],
  );

  // Push live data into the running map whenever inputs change.
  useEffect(() => {
    const payload = JSON.stringify({ points, route: route ?? null });
    webRef.current?.injectJavaScript(`window.__rafeeqUpdate && window.__rafeeqUpdate(${payload}); true;`);
  }, [points, route]);

  const onMessage = (e: { nativeEvent: { data: string } }) => {
    try {
      const m = JSON.parse(e.nativeEvent.data);
      // Google Maps couldn't authenticate → switch to the free OSM map.
      if (m?.type === 'gmfail') {
        setGoogleFailed(true);
        return;
      }
      if (onPick && m?.type === 'pick' && Number.isFinite(m.lat) && Number.isFinite(m.lng)) {
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
          javaScriptEnabled
          domStorageEnabled
          startInLoadingState
          androidLayerType="hardware"
          mixedContentMode="always"
          setSupportMultipleWindows={false}
          renderLoading={() => (
            <View style={s.mapLoading}>
              <ActivityIndicator color={theme.colors.primary} />
            </View>
          )}
        />
        {onPick && (
          <View style={s.pickHint} pointerEvents="none">
            <Icon name="crosshair" size={13} color={theme.colors.onPrimary} />
            <Text style={s.pickHintText}>{t('map.pickHint')}</Text>
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
  const { t } = useI18n();
  const labels: Record<string, string> = {
    captain: t('map.captain'),
    pickup: t('map.pickup'),
    destination: t('map.destination'),
    origin: t('map.origin'),
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
  var map, markers=[], routeLine=null, routeLineCasing=null, captainMarker=null, pickMarker=null, pendingInitial=${data};

  function post(lat,lng){
    if(window.ReactNativeWebView){window.ReactNativeWebView.postMessage(JSON.stringify({type:'pick',lat:lat,lng:lng}));}
  }

  function pin(kind){
    var bg = COL[kind] || COL.pickup;
    // Captain & origin/destination use distinct modern marker shapes.
    if(kind==='captain'){
      var c = '<svg xmlns="http://www.w3.org/2000/svg" width="46" height="46" viewBox="0 0 46 46">'
        + '<circle cx="23" cy="23" r="19" fill="'+bg+'" stroke="#fff" stroke-width="3"/>'
        + '<g transform="translate(11,12)" fill="#fff">'
        + '<path d="M3 11 L4.2 6.5 C4.5 5.4 5.5 4.6 6.7 4.6 L17.3 4.6 C18.5 4.6 19.5 5.4 19.8 6.5 L21 11 L21 16.5 C21 17.2 20.4 17.8 19.7 17.8 L18.3 17.8 C17.6 17.8 17 17.2 17 16.5 L17 15.5 L7 15.5 L7 16.5 C7 17.2 6.4 17.8 5.7 17.8 L4.3 17.8 C3.6 17.8 3 17.2 3 16.5 Z"/>'
        + '</g>'
        + '<circle cx="15.5" cy="27" r="2.2" fill="'+bg+'"/><circle cx="30.5" cy="27" r="2.2" fill="'+bg+'"/></svg>';
      return { url: 'data:image/svg+xml;charset=UTF-8,'+encodeURIComponent(c),
               scaledSize: new google.maps.Size(46,46), anchor: new google.maps.Point(23,23) };
    }
    var glyph = kind==='destination' ? '★' : kind==='origin' ? '⌂' : '';
    // Modern teardrop pin with white core.
    var t = '<svg xmlns="http://www.w3.org/2000/svg" width="34" height="46" viewBox="0 0 34 46">'
      + '<defs><filter id="s" x="-30%" y="-20%" width="160%" height="150%"><feDropShadow dx="0" dy="2" stdDeviation="2" flood-opacity="0.35"/></filter></defs>'
      + '<path filter="url(#s)" d="M17 1 C8.2 1 1 8.2 1 17 C1 28.5 17 45 17 45 C17 45 33 28.5 33 17 C33 8.2 25.8 1 17 1 Z" fill="'+bg+'" stroke="#fff" stroke-width="2"/>'
      + '<circle cx="17" cy="17" r="6.5" fill="#fff"/>'
      + (glyph ? '<text x="17" y="21" text-anchor="middle" font-size="9" font-weight="bold" fill="'+bg+'">'+glyph+'</text>' : '')
      + '</svg>';
    return { url: 'data:image/svg+xml;charset=UTF-8,'+encodeURIComponent(t),
             scaledSize: new google.maps.Size(34,46), anchor: new google.maps.Point(17,45) };
  }

  function draw(d){
    markers.forEach(function(m){m.setMap(null);}); markers=[];
    if(routeLine){routeLine.setMap(null);routeLine=null;}
    if(routeLineCasing){routeLineCasing.setMap(null);routeLineCasing=null;}
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
      var path = line.map(function(p){return {lat:p.lat,lng:p.lng};});
      // White casing underneath + colored route on top (map-app look).
      routeLineCasing=new google.maps.Polyline({path:path, geodesic:true,
        strokeColor:'#FFFFFF', strokeOpacity:0.9, strokeWeight:9, map:map, zIndex:1});
      routeLine=new google.maps.Polyline({path:path, geodesic:true,
        strokeColor:COL.route, strokeOpacity:1, strokeWeight:5, map:map, zIndex:2});
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
  window.gm_authFailure=function(){ try{ window.ReactNativeWebView && window.ReactNativeWebView.postMessage(JSON.stringify({type:'gmfail'})); }catch(e){} };
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
  .rfq-pin-wrap{position:relative;display:flex;align-items:center;justify-content:center}
  .rfq-tear{position:relative;width:30px;height:40px;filter:drop-shadow(0 2px 3px rgba(0,0,0,.35))}
  .rfq-tear svg{display:block}
  .rfq-tear .lbl{position:absolute;top:5px;left:0;width:30px;text-align:center;font:800 11px sans-serif}
  .rfq-badge{display:flex;align-items:center;justify-content:center;width:42px;height:42px;border-radius:50%;
    border:3px solid #fff;box-shadow:0 2px 6px rgba(0,0,0,.4);color:#fff;font-size:20px;line-height:1}
  .rfq-pulse::after{content:'';position:absolute;width:42px;height:42px;border-radius:50%;
    background:var(--rfq-c);opacity:.45;animation:rfqpulse 1.7s infinite}
  @keyframes rfqpulse{0%{transform:scale(1);opacity:.45}70%{transform:scale(2.4);opacity:0}100%{opacity:0}}
</style></head><body><div id="map"></div>
<script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
<script>
  var COL = ${col};
  var c = ${c};
  var map = L.map('map',{zoomControl:false,attributionControl:false}).setView([c.lat,c.lng],14);
  L.tileLayer('${tileUrl}',{maxZoom:19,subdomains:['a','b','c']}).addTo(map);

  var markers=[], routeLine=null, routeCasing=null, captainMarker=null;

  function icon(kind,index){
    var bg = COL[kind] || COL.pickup;
    if(kind==='captain'){
      var car='<svg width="20" height="20" viewBox="0 0 24 24" fill="#fff"><path d="M5 11l1.5-4.5A2 2 0 018.4 5h7.2a2 2 0 011.9 1.5L19 11v6a1 1 0 01-1 1h-1a1 1 0 01-1-1v-1H8v1a1 1 0 01-1 1H6a1 1 0 01-1-1z"/><circle cx="8" cy="14.5" r="1.4" fill="'+bg+'"/><circle cx="16" cy="14.5" r="1.4" fill="'+bg+'"/></svg>';
      return L.divIcon({className:'',iconSize:[42,42],iconAnchor:[21,21],
        html:'<div class="rfq-pin-wrap"><div class="rfq-pulse" style="--rfq-c:'+bg+'"></div><div class="rfq-badge" style="background:'+bg+'">'+car+'</div></div>'});
    }
    var glyph = kind==='destination' ? '★' : kind==='origin' ? '⌂' : (index!=null ? (index+1) : '');
    var tear='<svg width="30" height="40" viewBox="0 0 30 40"><path d="M15 1C7.3 1 1 7.3 1 15c0 10 14 24 14 24s14-14 14-24C29 7.3 22.7 1 15 1z" fill="'+bg+'" stroke="#fff" stroke-width="2"/><circle cx="15" cy="15" r="5.5" fill="#fff"/></svg>';
    return L.divIcon({className:'',iconSize:[30,40],iconAnchor:[15,39],
      html:'<div class="rfq-tear">'+tear+'<div class="lbl" style="color:'+bg+'">'+glyph+'</div></div>'});
  }

  function draw(d){
    markers.forEach(function(m){map.removeLayer(m);}); markers=[];
    if(routeLine){map.removeLayer(routeLine);routeLine=null;}
    if(routeCasing){map.removeLayer(routeCasing);routeCasing=null;}
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
      var latlngs=line.map(function(p){return [p.lat,p.lng];});
      // White casing under a solid colored route (clean map-app styling).
      routeCasing=L.polyline(latlngs,{color:'#fff',weight:9,opacity:.95,lineCap:'round',lineJoin:'round'}).addTo(map);
      routeLine=L.polyline(latlngs,{color:COL.route,weight:5,opacity:1,lineCap:'round',lineJoin:'round'}).addTo(map);
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
      backgroundColor: t.colors.primarySoft,
    },
    mapLoading: {
      ...StyleSheet.absoluteFillObject,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: t.colors.primarySoft,
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
