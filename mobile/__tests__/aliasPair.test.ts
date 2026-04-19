/**
 * Locks the Ultimate Warrior alias pair contract in unit tests so a
 * fixture rename can't silently break the device smoke test.
 */
import { ULTIMATE_WARRIOR_ALIAS_FIXTURE } from './fixtures/aliasPairs';

describe('alias pairs (backend smoke-test fixture)', () => {
  it('KB canonical matches Mint A format (fp_{fandom}_..._hash6)', () => {
    expect(ULTIMATE_WARRIOR_ALIAS_FIXTURE.kbCanonical).toMatch(
      /^fp_[a-z0-9-]+_[a-z0-9-]+_[a-z0-9-]+_[a-z0-9-]+_[a-z0-9-]+_[a-f0-9]{6}$/,
    );
  });

  it('DB sibling also matches Mint A format', () => {
    expect(ULTIMATE_WARRIOR_ALIAS_FIXTURE.dbSibling).toMatch(
      /^fp_[a-z0-9-]+_[a-z0-9-]+_[a-z0-9-]+_[a-z0-9-]+_[a-z0-9-]+_[a-f0-9]{6}$/,
    );
  });

  it('canonical and sibling are different ids (otherwise there is no alias to resolve)', () => {
    expect(ULTIMATE_WARRIOR_ALIAS_FIXTURE.kbCanonical).not.toBe(
      ULTIMATE_WARRIOR_ALIAS_FIXTURE.dbSibling,
    );
  });

  it('expectedMatchQuality is "moved" (alias layer return for a KB canonical that points at a sibling)', () => {
    expect(ULTIMATE_WARRIOR_ALIAS_FIXTURE.expectedMatchQuality).toBe('moved');
  });
});
