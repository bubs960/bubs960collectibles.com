/**
 * Locks the Miz alias-pair contract in unit tests so a fixture rename
 * can't silently break the device smoke test. Replaces the obsolete
 * Ultimate Warrior fixture (Tier-5 deploy 2026-04-25 retired the pair).
 */
import { THE_MIZ_DIRECT_FIXTURE, THE_MIZ_ALIAS_FIXTURE } from './fixtures/aliasPairs';

const MINT_A_RE = /^fp_[a-z0-9-]+_[a-z0-9-]+_[a-z0-9-]+_[a-z0-9-]+_[a-z0-9-]+_[a-f0-9]{6}$/;

describe('alias pairs (backend smoke-test fixture)', () => {
  describe('direct (the-miz canonical)', () => {
    it('canonical matches Mint A format (fp_{fandom}_..._hash6)', () => {
      expect(THE_MIZ_DIRECT_FIXTURE.canonical).toMatch(MINT_A_RE);
    });

    it('expectedMatchQuality is "direct"', () => {
      expect(THE_MIZ_DIRECT_FIXTURE.expectedMatchQuality).toBe('direct');
    });
  });

  describe('moved (miz alias → the-miz canonical)', () => {
    it('alias matches Mint A format', () => {
      expect(THE_MIZ_ALIAS_FIXTURE.alias).toMatch(MINT_A_RE);
    });

    it('canonical matches Mint A format', () => {
      expect(THE_MIZ_ALIAS_FIXTURE.canonical).toMatch(MINT_A_RE);
    });

    it('alias and canonical are different ids (otherwise there is no alias to resolve)', () => {
      expect(THE_MIZ_ALIAS_FIXTURE.alias).not.toBe(THE_MIZ_ALIAS_FIXTURE.canonical);
    });

    it('expectedMatchQuality is "moved"', () => {
      expect(THE_MIZ_ALIAS_FIXTURE.expectedMatchQuality).toBe('moved');
    });

    it('expectedAliasSource is "figure_id_alias" (not sibling_search)', () => {
      expect(THE_MIZ_ALIAS_FIXTURE.expectedAliasSource).toBe('figure_id_alias');
    });

    it('canonical pair points at the same target as the direct fixture', () => {
      expect(THE_MIZ_ALIAS_FIXTURE.canonical).toBe(THE_MIZ_DIRECT_FIXTURE.canonical);
    });
  });
});
