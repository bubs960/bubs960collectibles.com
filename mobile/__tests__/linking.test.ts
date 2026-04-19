/**
 * Lock the deep-link config shape. A rename or accidental drop in
 * linking.ts's screens map would break universal-link routing in ways
 * that don't show up until a reviewer taps a link on a real device.
 */
import { linking } from '../src/navigation/linking';

describe('linking config', () => {
  it('exposes the figurepinner:// + https://figurepinner.com prefixes', () => {
    expect(linking.prefixes).toEqual(
      expect.arrayContaining(['figurepinner://', 'https://figurepinner.com']),
    );
  });

  it('maps FigureDetail to /open/:figureId (narrowed from /figure/* per reviewer note)', () => {
    expect(linking.config?.screens.FigureDetail).toBe('open/:figureId');
  });

  it('maps the other v1 screens at intuitive paths', () => {
    const screens = linking.config?.screens ?? {};
    expect(screens.Search).toBe('search');
    expect(screens.Settings).toBe('settings');
  });

  it('keeps v2 paths in the table even when the screens are unrouted today', () => {
    // AppNavigator conditionally registers these; RNav drops deep-link
    // events for unregistered routes rather than crashing, so keeping
    // them in the linking map is safe and saves a diff when v2 lands.
    const screens = linking.config?.screens ?? {};
    expect(screens.Vault).toBe('vault');
    expect(screens.Wantlist).toBe('wantlist');
    expect(screens.SignIn).toBe('sign-in');
    expect(screens.Alerts).toBe('alerts');
  });
});
