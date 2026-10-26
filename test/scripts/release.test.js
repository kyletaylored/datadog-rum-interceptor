import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { getReleaseNotes, prepareChangelog, validateChangelog, bumpVersion } from '../../scripts/release.mjs';

const REPO = 'https://github.com/kyletaylored/datadog-rum-interceptor';

const changelog = `# Changelog

## [Unreleased]

### Fixed
- Something new.

## [0.1.0] - 2026-10-26

### Added
- Feature.

## [0.0.9] - 2025-02-04

Old.

[Unreleased]: ${REPO}/compare/0.1.0...HEAD
[0.1.0]: ${REPO}/compare/0.0.9...0.1.0
[0.0.9]: ${REPO}/releases/tag/0.0.9
`;

describe('getReleaseNotes', () => {
    it('returns the body of a version section', () => {
        expect(getReleaseNotes(changelog, '0.1.0')).toBe('### Added\n- Feature.');
    });

    it('stops the last section before link references', () => {
        expect(getReleaseNotes(changelog, '0.0.9')).toBe('Old.');
    });

    it('returns null for missing or empty sections', () => {
        expect(getReleaseNotes(changelog, '9.9.9')).toBeNull();
        expect(getReleaseNotes(prepareChangelog(changelog, '0.2.0', '2026-11-01'), 'Unreleased')).toBeNull();
    });
});

describe('prepareChangelog', () => {
    const prepared = prepareChangelog(changelog, '0.2.0', '2026-11-01');

    it('moves Unreleased entries into a dated version section', () => {
        expect(prepared).toContain('## [Unreleased]\n\n## [0.2.0] - 2026-11-01\n\n### Fixed\n- Something new.');
        expect(getReleaseNotes(prepared, '0.2.0')).toBe('### Fixed\n- Something new.');
    });

    it('updates link references', () => {
        expect(prepared).toContain(`[Unreleased]: ${REPO}/compare/0.2.0...HEAD`);
        expect(prepared).toContain(`[0.2.0]: ${REPO}/compare/0.1.0...0.2.0`);
    });

    it('produces a valid changelog', () => {
        expect(validateChangelog(prepared, '0.2.0')).toEqual([]);
    });

    it('refuses an empty Unreleased section', () => {
        expect(() => prepareChangelog(prepared, '0.3.0', '2026-11-02')).toThrow(/no entries/);
    });

    it('refuses an existing version', () => {
        expect(() => prepareChangelog(changelog, '0.1.0', '2026-11-01')).toThrow(/already has a section/);
    });
});

describe('validateChangelog', () => {
    it('accepts a valid changelog', () => {
        expect(validateChangelog(changelog, '0.1.0')).toEqual([]);
    });

    it('reports a missing version section', () => {
        expect(validateChangelog(changelog, '0.2.0')).toContain('No "## [0.2.0]" section for the package.json version.');
    });

    it('reports an undated version and a missing Unreleased section', () => {
        const broken = changelog.replace('## [Unreleased]\n\n### Fixed\n- Something new.\n\n', '').replace('0.1.0] - 2026-10-26', '0.1.0] - Unreleased');
        const problems = validateChangelog(broken, '0.1.0');
        expect(problems).toContain('The first section must be "## [Unreleased]".');
        expect(problems).toContain('Section 0.1.0 must be dated as "## [0.1.0] - YYYY-MM-DD".');
    });

    it('reports missing link references', () => {
        expect(validateChangelog(changelog.replace(/^\[0\.0\.9\]: .*$/m, ''), '0.1.0')).toContain('Missing link reference for [0.0.9].');
    });

    it('accepts the repository changelog for the current package version', () => {
        const repoChangelog = readFileSync(new URL('../../CHANGELOG.md', import.meta.url), 'utf8');
        const { version } = JSON.parse(readFileSync(new URL('../../package.json', import.meta.url), 'utf8'));
        expect(validateChangelog(repoChangelog, version)).toEqual([]);
    });
});

describe('bumpVersion', () => {
    it.each([
        ['0.1.0', 'patch', '0.1.1'],
        ['0.1.9', 'minor', '0.2.0'],
        ['0.9.3', 'major', '1.0.0'],
        ['1.2.3-beta.1', 'patch', '1.2.3'],
        ['1.3.0-rc.1', 'minor', '1.3.0'],
        ['1.3.1-rc.1', 'minor', '1.4.0'],
        ['2.0.0-rc.1', 'major', '2.0.0'],
    ])('%s + %s = %s', (version, type, expected) => {
        expect(bumpVersion(version, type)).toBe(expected);
    });
});
