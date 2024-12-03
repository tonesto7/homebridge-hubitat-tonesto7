// platform/VersionManager.js

import { exec } from "child_process";
import { compare, validate } from "compare-versions";
import { pluginVersion, packageName } from "./StaticConst.js";

export class VersionManager {
    constructor(platform) {
        this.logManager = platform.logManager;
        this.currentVersion = pluginVersion;
        this._lastCheckTime = null;
        this._lastCheckResult = null;
        this._checkInProgress = false;

        // Cache check results for this duration (15 minutes)
        this.cacheDuration = 15 * 60 * 1000;
    }

    /**
     * Get the current plugin version
     * @returns {string} Current version
     */
    getVersion() {
        return this.currentVersion;
    }

    /**
     * Check if version check results are cached and valid
     * @returns {boolean} True if cache is valid
     * @private
     */
    _isCacheValid() {
        return this._lastCheckTime && Date.now() - this._lastCheckTime < this.cacheDuration && this._lastCheckResult;
    }

    /**
     * Check for package updates
     * @returns {Promise<Object>} Update check result
     */
    async checkVersion() {
        // Return cached result if valid
        if (this._isCacheValid()) {
            return this._lastCheckResult;
        }

        // Prevent multiple simultaneous checks
        if (this._checkInProgress) {
            return new Promise((resolve) => {
                const checkInterval = setInterval(() => {
                    if (!this._checkInProgress) {
                        clearInterval(checkInterval);
                        resolve(this._lastCheckResult);
                    }
                }, 100);
            });
        }

        this._checkInProgress = true;
        this.logManager.logInfo("Checking Package Version for Updates...");

        try {
            const result = await this._performVersionCheck();

            // Cache the results
            this._lastCheckTime = Date.now();
            this._lastCheckResult = result;

            return result;
        } catch (error) {
            this.logManager.logError("Version check failed:", error);
            return {
                hasUpdate: false,
                newVersion: null,
                error: error.message,
            };
        } finally {
            this._checkInProgress = false;
        }
    }

    /**
     * Perform the actual version check
     * @returns {Promise<Object>} Version check result
     * @private
     */
    _performVersionCheck() {
        return new Promise((resolve) => {
            exec(`npm view ${packageName} version`, (error, stdout) => {
                if (error) {
                    resolve({
                        hasUpdate: false,
                        newVersion: null,
                        error: error.message,
                    });
                    return;
                }

                const newVer = stdout && stdout.trim();

                if (newVer && validate(newVer)) {
                    const hasUpdate = compare(newVer, this.currentVersion, ">");

                    if (hasUpdate) {
                        this.logManager.logWarn("---------------------------------------------------------------");
                        this.logManager.logWarn(`NOTICE: New version of ${packageName} available: ${newVer}`);
                        this.logManager.logWarn("---------------------------------------------------------------");
                    } else {
                        this.logManager.logInfo("INFO: Your plugin version is up-to-date");
                    }

                    resolve({
                        hasUpdate,
                        newVersion: newVer,
                        currentVersion: this.currentVersion,
                    });
                } else {
                    resolve({
                        hasUpdate: false,
                        newVersion: null,
                        error: "Invalid version received",
                    });
                }
            });
        });
    }

    /**
     * Compare two versions
     * @param {string} version1 - First version to compare
     * @param {string} version2 - Second version to compare
     * @param {string} operator - Comparison operator (">", "<", "=", ">=", "<=")
     * @returns {boolean} Comparison result
     */
    compareVersions(version1, version2, operator = ">") {
        try {
            return compare(version1, version2, operator);
        } catch (error) {
            this.logManager.logError("Version comparison failed:", error);
            return false;
        }
    }

    /**
     * Validate a version string
     * @param {string} version - Version string to validate
     * @returns {boolean} True if version is valid
     */
    isValidVersion(version) {
        try {
            return validate(version);
        } catch (error) {
            this.logManager.logError("Version validation failed:", error);
            return false;
        }
    }

    /**
     * Get semantic version components
     * @param {string} version - Version string to parse
     * @returns {Object|null} Version components or null if invalid
     */
    getVersionComponents(version) {
        if (!this.isValidVersion(version)) {
            return null;
        }

        const [major, minor, patch] = version.split(".");
        return {
            major: parseInt(major),
            minor: parseInt(minor),
            patch: parseInt(patch),
        };
    }

    /**
     * Clear the version check cache
     */
    clearCache() {
        this._lastCheckTime = null;
        this._lastCheckResult = null;
    }

    /**
     * Format version for display
     * @param {string} version - Version to format
     * @returns {string} Formatted version string
     */
    formatVersion(version) {
        const components = this.getVersionComponents(version);
        if (!components) {
            return version;
        }
        return `v${components.major}.${components.minor}.${components.patch}`;
    }

    /**
     * Get time since last version check
     * @returns {number|null} Milliseconds since last check or null if never checked
     */
    getTimeSinceLastCheck() {
        if (!this._lastCheckTime) {
            return null;
        }
        return Date.now() - this._lastCheckTime;
    }
}
