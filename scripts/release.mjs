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
 * Validates that the changelog is ready for the version in package.json.
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

    const current = sections.find((s) => s.name === version);
    if (!current) {
        problems.push(`No "## [${version}]" section for the package.json version.`);
    } else {
        if (!/^\d{4}-\d{2}-\d{2}$/.test(current.date || '')) {
            problems.push(`Section ${version} must be dated as "## [${version}] - YYYY-MM-DD".`);
        }
        if (!getReleaseNotes(changelog, version)) {
            problems.push(`Section ${version} has no release notes.`);
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
