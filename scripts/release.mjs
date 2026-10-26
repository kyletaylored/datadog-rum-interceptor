#!/usr/bin/env node
/**
 * @file release.mjs
 * @description Release helpers with no dependencies, used locally and by the release workflow.
 *
 * Usage:
 *   node scripts/release.mjs prepare <patch|minor|major|x.y.z>  Bump the version and date the changelog
 *   node scripts/release.mjs notes [version]                    Print release notes for a version (default: package.json)
 *   node scripts/release.mjs check                              Validate the changelog against package.json
 */

import { readFileSync, writeFileSync, realpathSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const CHANGELOG_PATH = path.join(ROOT, 'CHANGELOG.md');
const PACKAGE_PATH = path.join(ROOT, 'package.json');
const REPO_URL = 'https://github.com/kyletaylored/datadog-rum-interceptor';

const SEMVER = /^\d+\.\d+\.\d+(-[0-9A-Za-z.-]+)?$/;
const SECTION_HEADING = /^## \[([^\]]+)\](?: - (.+))?$/gm;
const RELEASE_DATE = /^(\d{4}-\d{2}-\d{2})( \[YANKED\])?$/;

/** Keep a Changelog 1.1.0 change types, in their canonical order. */
export const CHANGE_TYPES = ['Added', 'Changed', 'Deprecated', 'Removed', 'Fixed', 'Security'];

/**
 * Splits a changelog into its version sections.
 * @param {string} changelog - Changelog markdown.
 * @returns {{ name: string, date: string|undefined, start: number, bodyStart: number, end: number }[]}
 */
export function parseSections(changelog) {
    const headings = [...changelog.matchAll(SECTION_HEADING)];
    // Sections end at the next heading or at the link reference definitions
    const linksStart = changelog.search(/^\[[^\]]+\]: /m);
    const docEnd = linksStart === -1 ? changelog.length : linksStart;

    return headings.map((match, i) => ({
        name: match[1],
        date: match[2],
        start: match.index,
        bodyStart: match.index + match[0].length,
        end: i + 1 < headings.length ? headings[i + 1].index : docEnd,
    }));
}

/**
 * Returns the release notes for a version.
 * @param {string} changelog - Changelog markdown.
 * @param {string} version - Version to look up.
 * @returns {string|null} Trimmed section body, or null if the version is missing or has no notes.
 */
export function getReleaseNotes(changelog, version) {
    const section = parseSections(changelog).find((s) => s.name === version);
    if (!section) return null;
    const body = changelog.slice(section.bodyStart, section.end).trim();
    return body || null;
}

/**
 * Moves the Unreleased section to a dated version section and starts a new empty Unreleased section.
 * @param {string} changelog - Changelog markdown.
 * @param {string} version - Version being released.
 * @param {string} date - Release date (YYYY-MM-DD).
 * @returns {string} Updated changelog.
 */
export function prepareChangelog(changelog, version, date) {
    const sections = parseSections(changelog);
    if (sections.some((s) => s.name === version)) {
        throw new Error(`CHANGELOG.md already has a section for ${version}.`);
    }

    const unreleased = sections.find((s) => s.name === 'Unreleased');
    if (!unreleased || !changelog.slice(unreleased.bodyStart, unreleased.end).trim()) {
        throw new Error('CHANGELOG.md has no entries under "## [Unreleased]". Add release notes before preparing a release.');
    }

    const previous = sections.find((s) => s.name !== 'Unreleased');
    let updated = changelog.slice(0, unreleased.start)
        + `## [Unreleased]\n\n## [${version}] - ${date}`
        + changelog.slice(unreleased.bodyStart);

    // Update link references: Unreleased compares against the new tag, the new version against the previous one
    updated = updated.replace(/^\[Unreleased\]: .*$/m, `[Unreleased]: ${REPO_URL}/compare/${version}...HEAD`);
    const versionLink = previous
        ? `[${version}]: ${REPO_URL}/compare/${previous.name}...${version}`
        : `[${version}]: ${REPO_URL}/releases/tag/${version}`;
    updated = updated.replace(/^(\[Unreleased\]: .*)$/m, `$1\n${versionLink}`);

    return updated;
}

/**
 * Compares two semver versions.
 * @param {string} a - First version.
 * @param {string} b - Second version.
 * @returns {number} Negative if a < b, positive if a > b, 0 if equal.
 */
export function compareVersions(a, b) {
    const [coreA, preA] = a.split('-');
    const [coreB, preB] = b.split('-');
    const partsA = coreA.split('.').map(Number);
    const partsB = coreB.split('.').map(Number);
    for (let i = 0; i < 3; i++) {
        if (partsA[i] !== partsB[i]) return partsA[i] - partsB[i];
    }
    // A prerelease sorts before its release
    if (preA && !preB) return -1;
    if (!preA && preB) return 1;
    return (preA || '').localeCompare(preB || '', undefined, { numeric: true });
}

/**
 * Validates the change type groups (### headings) of one section against Keep a Changelog.
 * @param {string} name - Section name, used in messages.
 * @param {string} body - Section body.
 * @returns {string[]} List of problems.
 */
function validateGroups(name, body) {
    const problems = [];
    const trimmed = body.trim();
    if (!trimmed) return problems;

    if (!trimmed.startsWith('### ')) {
        problems.push(`[${name}]: entries must be grouped under a change type heading (${CHANGE_TYPES.join(', ')}).`);
    }

    const groups = [...trimmed.matchAll(/^### (.+)$/gm)];
    const seen = [];
    groups.forEach((match, i) => {
        const type = match[1].trim();
        const groupBody = trimmed.slice(match.index + match[0].length, groups[i + 1]?.index ?? trimmed.length);

        if (!CHANGE_TYPES.includes(type)) {
            problems.push(`[${name}]: unknown change type "${type}". Use one of: ${CHANGE_TYPES.join(', ')}.`);
            return;
        }
        if (seen.includes(type)) {
            problems.push(`[${name}]: duplicate "${type}" group.`);
        } else if (seen.length && CHANGE_TYPES.indexOf(type) < CHANGE_TYPES.indexOf(seen[seen.length - 1])) {
            problems.push(`[${name}]: "${type}" must come before "${seen[seen.length - 1]}" (order: ${CHANGE_TYPES.join(', ')}).`);
        }
        if (!/^\s*[-*] \S/m.test(groupBody)) {
            problems.push(`[${name}]: "${type}" group has no entries.`);
        }
        seen.push(type);
    });

    return problems;
}

/**
 * Validates that the changelog follows Keep a Changelog 1.1.0 and is ready for the version in package.json.
 * @param {string} changelog - Changelog markdown.
 * @param {string} version - Current package.json version.
 * @returns {string[]} List of problems; empty when valid.
 */
export function validateChangelog(changelog, version) {
    const problems = [];
    const sections = parseSections(changelog);

    if (sections[0]?.name !== 'Unreleased') {
        problems.push('The first section must be "## [Unreleased]".');
    }
    if (sections.filter((s) => s.name === 'Unreleased').length > 1) {
        problems.push('There must be only one "## [Unreleased]" section.');
    }

    // Catch level-2 headings that aren't in the "## [name]" form, which would otherwise be silently ignored
    for (const match of changelog.matchAll(/^## (?!\[[^\]]+\](?: - .+)?$).*$/gm)) {
        problems.push(`Malformed section heading "${match[0]}". Use "## [x.y.z] - YYYY-MM-DD".`);
    }

    const releases = sections.filter((s) => s.name !== 'Unreleased');
    const seenVersions = new Set();
    releases.forEach((section, i) => {
        if (!SEMVER.test(section.name)) {
            problems.push(`[${section.name}]: version is not valid semver.`);
            return;
        }
        if (seenVersions.has(section.name)) {
            problems.push(`[${section.name}]: duplicate version section.`);
        }
        seenVersions.add(section.name);
        if (!RELEASE_DATE.test(section.date || '')) {
            problems.push(`[${section.name}]: heading must be "## [${section.name}] - YYYY-MM-DD" (optionally followed by " [YANKED]").`);
        }
        const next = releases[i + 1];
        if (next && SEMVER.test(next.name) && compareVersions(section.name, next.name) <= 0) {
            problems.push(`[${section.name}]: versions must be listed newest first (found before ${next.name}).`);
        }
    });

    for (const section of sections) {
        problems.push(...validateGroups(section.name, changelog.slice(section.bodyStart, section.end)));
    }

    const current = sections.find((s) => s.name === version);
    if (!current) {
        problems.push(`No "## [${version}]" section for the package.json version.`);
    } else {
        if (!getReleaseNotes(changelog, version)) {
            problems.push(`[${version}]: section has no release notes.`);
        }
        if (/\[YANKED\]/.test(current.date || '')) {
            problems.push(`[${version}]: the package.json version is marked [YANKED].`);
        }
    }

    for (const section of sections) {
        if (!new RegExp(`^\\[${section.name.replace(/\./g, '\\.')}\\]: `, 'm').test(changelog)) {
            problems.push(`Missing link reference for [${section.name}].`);
        }
    }

    return problems;
}

/**
 * Bumps a semver version.
 * @param {string} version - Current version (x.y.z).
 * @param {'patch'|'minor'|'major'} type - Bump type.
 * @returns {string} Next version.
 */
export function bumpVersion(version, type) {
    const [core, prerelease] = version.split('-');
    const [major, minor, patch] = core.split('.').map(Number);
    // Like `npm version`, bumping a prerelease to the level it already targets just drops the prerelease tag
    if (type === 'major') return prerelease && minor === 0 && patch === 0 ? core : `${major + 1}.0.0`;
    if (type === 'minor') return prerelease && patch === 0 ? core : `${major}.${minor + 1}.0`;
    return prerelease ? core : `${major}.${minor}.${patch + 1}`;
}

function readPackageVersion() {
    return JSON.parse(readFileSync(PACKAGE_PATH, 'utf8')).version;
}

function main([command, arg]) {
    const changelog = readFileSync(CHANGELOG_PATH, 'utf8');

    switch (command) {
        case 'prepare': {
            if (!arg || !(['patch', 'minor', 'major'].includes(arg) || SEMVER.test(arg))) {
                throw new Error('Usage: release.mjs prepare <patch|minor|major|x.y.z>');
            }
            const version = SEMVER.test(arg) ? arg : bumpVersion(readPackageVersion(), arg);
            const date = new Date().toISOString().slice(0, 10);
            // Update the changelog first so a missing Unreleased section fails before anything is written
            const updated = prepareChangelog(changelog, version, date);
            const problems = validateChangelog(updated, version);
            if (problems.length) throw new Error(`CHANGELOG.md is invalid:\n- ${problems.join('\n- ')}`);
            execFileSync('npm', ['version', version, '--no-git-tag-version'], { cwd: ROOT, stdio: 'ignore' });
            writeFileSync(CHANGELOG_PATH, updated);
            console.log(`Prepared ${version}. Review CHANGELOG.md, then open a pull request titled "Release ${version}".`);
            break;
        }
        case 'notes': {
            const version = arg || readPackageVersion();
            const notes = getReleaseNotes(changelog, version);
            if (!notes) throw new Error(`No release notes found for ${version} in CHANGELOG.md.`);
            process.stdout.write(`${notes}\n`);
            break;
        }
        case 'check': {
            const problems = validateChangelog(changelog, readPackageVersion());
            if (problems.length) throw new Error(`CHANGELOG.md is invalid:\n- ${problems.join('\n- ')}`);
            console.log('CHANGELOG.md is valid.');
            break;
        }
        default:
            throw new Error('Usage: release.mjs <prepare|notes|check> [arg]');
    }
}

// Run only when executed directly (not when imported by tests). Compare real paths so symlinked directories match.
if (process.argv[1] && realpathSync(process.argv[1]) === realpathSync(fileURLToPath(import.meta.url))) {
    try {
        main(process.argv.slice(2));
    } catch (err) {
        console.error(err.message);
        process.exit(1);
    }
}
