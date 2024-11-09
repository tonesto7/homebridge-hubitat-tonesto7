// libs/MyUtils.js

import { packageName, pluginVersion } from "../Constants.js";
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

    cleanSpaces(str) {
        return String(str.replace(/ /g, ""));
    }

    toTitleCase(str) {
        return str.replace(/\w\S*/g, (txt) => txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase());
    }

    getIPAddress() {
        let interfaces = os.networkInterfaces();
        for (let devName in interfaces) {
            let iface = interfaces[devName];
            for (let i = 0; i < iface.length; i++) {
                let alias = iface[i];
                if (alias.family === "IPv4" && alias.address !== "127.0.0.1" && !alias.internal) {
                    return alias.address;
                }
            }
        }
        return "0.0.0.0";
    }

    checkVersion = () => {
        this.log.info("Checking Package Version for Updates...");
        return new Promise((resolve) => {
            exec(`npm view ${packageName} version`, (error, stdout) => {
                const newVer = stdout && stdout.trim();
                if (newVer && validate(newVer) && compare(stdout.trim(), pluginVersion, ">")) {
                    this.log.warn("---------------------------------------------------------------");
                    this.log.warn(`NOTICE: New version of ${packageName} available: ${newVer}`);
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
