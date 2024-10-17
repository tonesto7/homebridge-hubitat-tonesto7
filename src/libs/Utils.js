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

export default class Utils {
    constructor(platform) {
        this.platform = platform;
        this.client = platform.client;
        this.log = platform.log;
        this.homebridge = platform.homebridge;
    }

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

    cleanSpaces = (str) => String(str.replace(/ /g, ""));

    toTitleCase = (str) => str.replace(/\w\S*/g, (txt) => txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase());

    debounce = (a, b, c) => {
        let d;
        return function () {
            let e = this,
                f = arguments;
            clearTimeout(d),
                (d = setTimeout(() => {
                    (d = null), c || a.apply(e, f);
                }, b)),
                c && !d && a.apply(e, f);
        };
    };

    debounceAlt = (func, delay, immediate) => {
        let timerId;
        return (...args) => {
            const boundFunc = func.bind(this, ...args);
            clearTimeout(timerId);
            if (immediate && !timerId) {
                boundFunc();
            }
            const calleeFunc = immediate
                ? () => {
                      timerId = null;
                  }
                : boundFunc;
            timerId = setTimeout(calleeFunc, delay);
        };
    };

    throttle = (func, delay, immediate) => {
        let timerId;
        return (...args) => {
            const boundFunc = func.bind(this, ...args);
            if (timerId) {
                return;
            }
            if (immediate && !timerId) {
                boundFunc();
            }
            timerId = setTimeout(() => {
                if (!immediate) {
                    boundFunc();
                }
                timerId = null;
            }, delay);
        };
    };

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
