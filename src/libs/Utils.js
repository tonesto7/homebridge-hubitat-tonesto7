// Utils.js

// Description: This file contains the utility functions for the plugin.
import { createRequire } from "module";
const require = createRequire(import.meta.url);
const packageFile = require("../../package.json");

// import _ from "lodash";
import fs from "fs/promises";
import { exec } from "child_process";
import os from "os";
import { compare, validate } from "compare-versions";

/**
 * Utility class providing various helper methods for the platform.
 */
export default class Utils {
    constructor(platform) {
        this.platform = platform;
        this.client = platform.client;
        this.log = platform.log;
        this.homebridge = platform.homebridge;
    }

    /**
     * Sanitizes a given name by removing all characters except alphanumerics, spaces, and apostrophes.
     * It also trims leading and trailing non-alphanumeric characters and replaces multiple spaces with a single space.
     * If the name becomes empty after sanitization, it defaults to "Unnamed Device".
     * Logs a warning if the name was sanitized.
     *
     * @param {string} name - The name to be sanitized.
     * @returns {string} - The sanitized name.
     */
    sanitizeName = (name) => {
        // Remove all characters except alphanumerics, spaces, and apostrophes
        let sanitized = name
            .replace(/[^a-zA-Z0-9 ']/g, "")
            .trim()
            .replace(/^[^a-zA-Z0-9]+/, "") // Remove leading non-alphanumeric characters
            .replace(/[^a-zA-Z0-9]+$/, "") // Remove trailing non-alphanumeric characters
            .replace(/\s{2,}/g, " "); // Replace multiple spaces with a single space

        // If the name becomes empty after sanitization, use a default name
        sanitized = sanitized.length === 0 ? "Unnamed Device" : sanitized;

        // Log if the name was sanitized
        if (name !== sanitized) {
            this.log.warn(`Sanitized Name: "${name}" => "${sanitized}"`);
        }

        return sanitized;
    };

    /**
     * Removes all spaces from a given string.
     *
     * @param {string} str - The string from which spaces will be removed.
     * @returns {string} - The string without any spaces.
     */
    cleanSpaces = (str) => String(str.replace(/ /g, ""));

    /**
     * Converts a string to title case.
     *
     * @param {string} str - The string to be converted.
     * @returns {string} - The converted string with the first letter of each word in uppercase and the rest in lowercase.
     */
    toTitleCase = (str) => str.replace(/\w\S*/g, (txt) => txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase());

    /**
     * Creates a debounced function that delays invoking the provided function until after a specified wait time has elapsed
     * since the last time the debounced function was invoked. Optionally, the function can be invoked immediately on the
     * leading edge instead of the trailing edge.
     *
     * @param {Function} a - The function to debounce.
     * @param {number} b - The number of milliseconds to delay.
     * @param {boolean} [c=false] - If `true`, the function will be invoked on the leading edge of the wait time.
     * @returns {Function} - Returns the new debounced function.
     */
    // debounce = (a, b, c) => {
    //     let d;
    //     return function () {
    //         let e = this,
    //             f = arguments;
    //         clearTimeout(d),
    //             (d = setTimeout(() => {
    //                 (d = null), c || a.apply(e, f);
    //             }, b)),
    //             c && !d && a.apply(e, f);
    //     };
    // };

    /**
     * Creates a debounced function that delays invoking the provided function until after the specified delay.
     * If `immediate` is true, the function will be invoked immediately on the leading edge instead of the trailing edge.
     *
     * @param {Function} func - The function to debounce.
     * @param {number} delay - The number of milliseconds to delay.
     * @param {boolean} immediate - If true, trigger the function on the leading edge, instead of the trailing.
     * @returns {Function} - Returns the new debounced function.
     */
    // debounceAlt = (func, delay, immediate) => {
    //     let timerId;
    //     return (...args) => {
    //         const boundFunc = func.bind(this, ...args);
    //         clearTimeout(timerId);
    //         if (immediate && !timerId) {
    //             boundFunc();
    //         }
    //         const calleeFunc = immediate
    //             ? () => {
    //                   timerId = null;
    //               }
    //             : boundFunc;
    //         timerId = setTimeout(calleeFunc, delay);
    //     };
    // };

    /**
     * Creates a throttled function that only invokes `func` at most once per every `delay` milliseconds.
     * If `immediate` is true, `func` is invoked on the leading edge of the `delay` timeout.
     *
     * @param {Function} func - The function to throttle.
     * @param {number} delay - The number of milliseconds to delay.
     * @param {boolean} immediate - If true, trigger the function on the leading edge, instead of the trailing.
     * @returns {Function} - Returns the new throttled function.
     */
    // throttle = (func, delay, immediate) => {
    //     let timerId;
    //     return (...args) => {
    //         const boundFunc = func.bind(this, ...args);
    //         if (timerId) {
    //             return;
    //         }
    //         if (immediate && !timerId) {
    //             boundFunc();
    //         }
    //         timerId = setTimeout(() => {
    //             if (!immediate) {
    //                 boundFunc();
    //             }
    //             timerId = null;
    //         }, delay);
    //     };
    // };

    /**
     * Retrieves the local machine's IPv4 address.
     *
     * This function iterates over the network interfaces of the local machine
     * and returns the first non-internal IPv4 address it finds. If no such address
     * is found, it returns "0.0.0.0".
     *
     * @returns {string} The local machine's IPv4 address or "0.0.0.0" if no address is found.
     */
    getIPAddress = () => {
        const interfaces = os.networkInterfaces();
        for (const devName in interfaces) {
            const iface = interfaces[devName];
            for (let i = 0; i < iface.length; i++) {
                const alias = iface[i];
                if (alias.family === "IPv4" && alias.address !== "127.0.0.1" && !alias.internal) {
                    return alias.address;
                }
            }
        }
        return "0.0.0.0";
    };

    /**
     * Asynchronously updates the Homebridge configuration with new settings.
     *
     * @param {Object} newConfig - The new configuration settings to be applied.
     * @returns {Promise<void>} - A promise that resolves when the configuration has been updated.
     */
    updateConfig = async (newConfig) => {
        const configPath = this.homebridge.user.configPath();
        const file = await fs.readFile(configPath, "utf8");
        const config = JSON.parse(file);
        const platConfig = config.platforms.find((x) => x.name === this.config.name);
        Object.assign(platConfig, newConfig);
        const serializedConfig = JSON.stringify(config, null, "  ");
        await fs.writeFile(configPath, serializedConfig, "utf8");
        Object.assign(this.config, newConfig);
    };

    /**
     * Checks the current package version against the latest available version on npm.
     * Logs information about the update status and resolves a promise with the update details.
     *
     * @returns {Promise<Object>} A promise that resolves to an object containing:
     * - `hasUpdate` {boolean}: Indicates if there is a new version available.
     * - `newVersion` {string}: The latest version available on npm.
     */
    checkVersion = () => {
        this.log.info("Checking Package Version for Updates...");
        return new Promise((resolve) => {
            exec(`npm view ${packageFile.name} version`, (error, stdout) => {
                const newVer = stdout && stdout.trim();
                if (newVer && validate(newVer) && compare(stdout.trim(), packageFile.version, ">")) {
                    this.log.warn("---------------------------------------------------------------");
                    this.log.warn(`NOTICE: New version of ${packageFile.name} available: ${newVer}`);
                    this.log.warn("---------------------------------------------------------------");
                    resolve({
                        hasUpdate: true,
                        newVersion: newVer,
                    });
                } else {
                    this.log.info("INFO: Your plugin version is up-to-date");
                    resolve({
                        hasUpdate: false,
                        newVersion: newVer,
                    });
                }
            });
        });
    };
}
