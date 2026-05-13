import React from 'react';

/**
 * Native passthrough. iOS / Android render edge-to-edge; the
 * max-width constraint exists only to keep the desktop layout from
 * stretching across a 1920px monitor.
 *
 * The .web.tsx variant constrains children to a centered 600px-wide
 * column on screens wider than 600px.
 */
export function MaxWidthShell({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
