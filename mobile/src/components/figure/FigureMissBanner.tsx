import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { colors, radii, spacing } from '@/theme/tokens';
import { type } from '@/theme/typography';

interface FigureMissBannerProps {
  /**
   * The id the user originally requested — exposed for assistive tech
   * (VoiceOver reads it as part of the alert) and for support tickets:
   * collectors emailing "this figure is missing" can point at the exact
   * id we logged.
   */
  originalFigureId?: string;
}

/**
 * Renders when /figure/:id returns match_quality='not_found_but_logged'
 * — the alias layer miss that was logged to figure_id_miss_log on the
 * backend.
 *
 * The request-to-add CTA ships in v3 mobile per the engineer's Q9 (data
 * pipe is already there via the miss log; only the button + endpoint
 * wiring is deferred). For v1/v2 we render a factual placeholder that
 * sets the right expectation without faking a feature.
 */
export function FigureMissBanner({ originalFigureId }: FigureMissBannerProps = {}) {
  return (
    <View style={styles.wrap} accessible accessibilityRole="alert">
      <Text style={styles.title}>We don't have this figure yet</Text>
      <Text style={styles.body}>
        Your query was logged — our team reviews new requests and adds figures as they come in.
        Tap Search to try a related figure.
      </Text>
      {originalFigureId ? (
        <Text style={styles.idHint} selectable>
          Reference: {originalFigureId}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    marginHorizontal: spacing.md,
    padding: spacing.md,
    borderRadius: radii.md,
    backgroundColor: 'rgba(240, 160, 75, 0.08)',
    borderWidth: 1,
    borderColor: colors.accentWarm,
    gap: 4,
  },
  title: {
    ...type.h2,
    color: colors.text,
    fontSize: 18,
  },
  body: {
    ...type.body,
    color: colors.muted,
  },
  idHint: {
    ...type.meta,
    color: colors.muted,
    marginTop: spacing.xs,
    fontFamily: 'Menlo',
  },
});
