import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { getReleaseNotes, prepareChangelog, validateChangelog, bumpVersion, compareVersions } from '../../scripts/release.mjs';

const REPO = 'https://github.com/kyletaylored/datadog-rum-interceptor';

const changelog = `# Changelog

## [Unreleased]

### Fixed
- Something new.

## [0.1.0] - 2026-10-26

### Added
- Feature.

## [0.0.9] - 2025-02-04

### Removed
- Old.

[Unreleased]: ${REPO}/compare/0.1.0...HEAD
[0.1.0]: ${REPO}/compare/0.0.9...0.1.0
[0.0.9]: ${REPO}/releases/tag/0.0.9
`;

describe('getReleaseNotes', () => {
    it('returns the body of a version section', () => {
        expect(getReleaseNotes(changelog, '0.1.0')).toBe('### Added\n- Feature.');
    });

    it('stops the last section before link references', () => {
        expect(getReleaseNotes(changelog, '0.0.9')).toBe('### Removed\n- Old.');
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
        expect(problems).toContain('[0.1.0]: heading must be "## [0.1.0] - YYYY-MM-DD" (optionally followed by " [YANKED]").');
    });

    describe('Keep a Changelog rules', () => {
        const problemsFor = (text, version = '0.1.0') => validateChangelog(text, version);

        it('rejects unknown change types', () => {
            expect(problemsFor(changelog.replace('### Added', '### New'))).toContain(
                '[0.1.0]: unknown change type "New". Use one of: Added, Changed, Deprecated, Removed, Fixed, Security.'
            );
        });

        it('rejects groups out of canonical order', () => {
            const text = changelog.replace('### Added\n- Feature.', '### Fixed\n- Bug.\n\n### Added\n- Feature.');
            expect(problemsFor(text)).toContain('[0.1.0]: "Added" must come before "Fixed" (order: Added, Changed, Deprecated, Removed, Fixed, Security).');
        });

        it('rejects duplicate and empty groups', () => {
            const text = changelog.replace('### Added\n- Feature.', '### Added\n- Feature.\n\n### Added\n- Again.\n\n### Fixed\n');
            const problems = problemsFor(text);
            expect(problems).toContain('[0.1.0]: duplicate "Added" group.');
            expect(problems).toContain('[0.1.0]: "Fixed" group has no entries.');
        });

        it('rejects ungrouped entries, including under Unreleased', () => {
            const text = changelog.replace('### Fixed\n- Something new.', '- Something new.');
            expect(problemsFor(text)).toContain(
                '[Unreleased]: entries must be grouped under a change type heading (Added, Changed, Deprecated, Removed, Fixed, Security).'
            );
        });

        it('rejects versions out of order and duplicates', () => {
            const swapped = changelog.replace('## [0.1.0] - 2026-10-26', '## [0.0.8] - 2026-10-26').replace('[0.1.0]: ', '[0.0.8]: ');
            expect(problemsFor(swapped, '0.0.8')).toContain('[0.0.8]: versions must be listed newest first (found before 0.0.9).');
            const duplicated = changelog.replace('## [0.0.9] - 2025-02-04', '## [0.1.0] - 2025-02-04');
            expect(problemsFor(duplicated)).toContain('[0.1.0]: duplicate version section.');
        });

        it('rejects malformed section headings', () => {
            const text = changelog.replace('## [0.0.9] - 2025-02-04', '## 0.0.9 - 2025-02-04');
            expect(problemsFor(text)).toContain('Malformed section heading "## 0.0.9 - 2025-02-04". Use "## [x.y.z] - YYYY-MM-DD".');
        });

        it('accepts yanked releases, but not as the current version', () => {
            const text = changelog.replace('## [0.0.9] - 2025-02-04', '## [0.0.9] - 2025-02-04 [YANKED]');
            expect(problemsFor(text)).toEqual([]);
            expect(problemsFor(text, '0.0.9')).toContain('[0.0.9]: the package.json version is marked [YANKED].');
        });
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

describe('compareVersions', () => {
    it.each([
        ['0.1.0', '0.0.9', 1],
        ['0.0.9', '0.1.0', -1],
        ['1.0.0', '1.0.0', 0],
        ['1.0.0-rc.1', '1.0.0', -1],
        ['1.0.0-rc.10', '1.0.0-rc.2', 1],
        ['0.10.0', '0.9.0', 1],
    ])('compare(%s, %s) has sign %i', (a, b, sign) => {
        expect(Math.sign(compareVersions(a, b))).toBe(sign);
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
