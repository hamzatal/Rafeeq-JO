import { useEffect, useMemo, useState } from 'react';
import { Image, Linking, ScrollView, StyleSheet, Text, View } from 'react-native';
import type { AdBanner as AdBannerModel, AdPlacement } from '@rafeeq/shared';
import { api } from '../lib/api';
import { useTheme, type AppTheme } from '../theme';
import { PressableScale } from './kit';

/**
 * In-app advertising slot. Fetches live banners for a placement and renders a
 * designed, tappable card (horizontal carousel when there are several).
 * Renders nothing when there are no active banners, so it never leaves an
 * empty gap in the layout.
 */
export function AdBanner({ placement }: { placement: AdPlacement }) {
  const theme = useTheme();
  const s = useMemo(() => makeStyles(theme), [theme]);
  const [banners, setBanners] = useState<AdBannerModel[]>([]);

  useEffect(() => {
    let alive = true;
    api.ads
      .active(placement)
      .then((b) => alive && setBanners(b))
      .catch(() => undefined);
    return () => {
      alive = false;
    };
  }, [placement]);

  if (banners.length === 0) return null;

  const open = (b: AdBannerModel) => {
    if (b.link_url) void Linking.openURL(b.link_url).catch(() => undefined);
  };

  const single = banners.length === 1;

  const Card = ({ b }: { b: AdBannerModel }) => (
    <PressableScale onPress={() => open(b)} style={[s.card, !single && s.cardInScroll]} scaleTo={0.98}>
      <Image source={{ uri: b.image_url }} style={s.image} resizeMode="cover" />
      <View style={s.overlay} pointerEvents="none" />
      <View style={s.sponsorTag}>
        <Text style={s.sponsorText}>إعلان</Text>
      </View>
      <Text style={s.title} numberOfLines={1}>{b.title}</Text>
    </PressableScale>
  );

  if (single) {
    return (
      <View style={s.wrap}>
        <Card b={banners[0]} />
      </View>
    );
  }

  return (
    <View style={s.wrap}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={s.scrollContent}
      >
        {banners.map((b) => (
          <Card key={b.id} b={b} />
        ))}
      </ScrollView>
    </View>
  );
}

const makeStyles = (t: AppTheme) =>
  StyleSheet.create({
    wrap: { marginBottom: t.spacing.md },
    scrollContent: { flexDirection: 'row-reverse', gap: t.spacing.sm, paddingHorizontal: 2 },
    card: { height: 92, borderRadius: t.radius.lg, overflow: 'hidden', backgroundColor: t.colors.surfaceAlt, ...t.shadow.sm },
    cardInScroll: { width: 300 },
    image: { ...StyleSheet.absoluteFillObject, width: '100%', height: '100%' },
    overlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,32,69,0.28)' },
    sponsorTag: { position: 'absolute', top: 8, left: 8, backgroundColor: 'rgba(0,0,0,0.45)', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 2 },
    sponsorText: { fontFamily: t.fontFamily.medium, fontSize: 10, color: '#FFFFFF' },
    title: { position: 'absolute', right: 12, bottom: 10, left: 12, fontFamily: t.fontFamily.bold, fontSize: 15, color: '#FFFFFF', textAlign: 'right' },
  });
