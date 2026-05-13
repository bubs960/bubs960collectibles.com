import React from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, radii, spacing } from '@/theme/tokens';
import { type } from '@/theme/typography';
import type { PermissionStatus } from '@/notifications/setup';

export interface PermissionBannerProps {
  status: PermissionStatus;
  working: boolean;
  onEnable: () => void;
}

/**
 * Native variant. iOS + Android both support Expo push tokens via
 * expo-notifications, so the standard ask-for-permission flow applies.
 *
 * The web variant (see .web.tsx) renders a different banner that
 * explains alerts ping the user's phone, not the browser — web push
 * is deferred to v3 (CHANGELOG Phase 13).
 */
export function PermissionBanner({ status, working, onEnable }: PermissionBannerProps) {
  if (status === 'granted') return null;
  return (
    <View style={styles.banner}>
      <View style={{ flex: 1 }}>
        <Text style={styles.bannerTitle}>
          {status === 'denied' ? 'Notifications are off' : 'Turn on notifications'}
        </Text>
        <Text style={styles.bannerBody}>
          {status === 'denied'
            ? 'Enable alerts in iOS / Android settings so we can ping you on price drops.'
            : "We'll only notify you when a figure on your wantlist crosses your target."}
        </Text>
      </View>
      <Pressable
        onPress={onEnable}
        disabled={working || status === 'denied'}
        accessibilityRole="button"
        accessibilityLabel="Enable notifications"
        style={({ pressed }) => [
          styles.bannerBtn,
          (working || status === 'denied') && { opacity: 0.5 },
          pressed && { opacity: 0.8 },
        ]}
      >
        {working ? <ActivityIndicator color={colors.text} /> : <Text style={styles.bannerBtnText}>Enable</Text>}
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    margin: spacing.md,
    padding: spacing.md,
    backgroundColor: colors.surface0,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.accent,
  },
  bannerTitle: { ...type.body, color: colors.text, fontSize: 15 },
  bannerBody: { ...type.meta, color: colors.muted, marginTop: 2 },
  bannerBtn: {
    minHeight: 44,
    minWidth: 80,
    paddingHorizontal: spacing.md,
    borderRadius: radii.md,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bannerBtnText: { ...type.eyebrow, color: colors.text },
});
