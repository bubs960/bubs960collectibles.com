import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { colors, radii, spacing } from '@/theme/tokens';
import { type } from '@/theme/typography';
import type { PermissionStatus } from '@/notifications/setup';

export interface PermissionBannerProps {
  status: PermissionStatus;
  working: boolean;
  onEnable: () => void;
}

/**
 * Web variant of the alerts permission banner. v1 doesn't ship web
 * push (deferred to v3 with VAPID + a separate worker route), so we
 * render a banner that sets the correct expectation: configure
 * thresholds here, get notified on your phone.
 *
 * Status / working / onEnable are accepted to keep the interface
 * identical with the native variant, but unused — the banner is
 * informational only on this surface.
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function PermissionBanner(_props: PermissionBannerProps) {
  return (
    <View style={styles.banner}>
      <View style={{ flex: 1 }}>
        <Text style={styles.bannerTitle}>Alerts fire on your phone</Text>
        <Text style={styles.bannerBody}>
          Configure thresholds here on desktop; install FigurePinner on iOS or Android to
          receive the push notification when a target is hit.
        </Text>
      </View>
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
    borderColor: colors.accentWarm,
  },
  bannerTitle: { ...type.body, color: colors.text, fontSize: 15 },
  bannerBody: { ...type.meta, color: colors.muted, marginTop: 2 },
});
