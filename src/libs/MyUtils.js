const {
    // platformName,
    // platformDesc,
    packageFile,
} = require("./Constants"),
    _ = require("lodash"),
    fs = require("fs"),
    childProcess = require("child_process"),
    compareVersions = require("compare-versions"),
    os = require("os");

module.exports = class MyUtils {
    constructor(platform) {
        this.platform = platform;
        this.client = platform.client;
        this.log = platform.log;
        this.logInfo = platform.logInfo;
        this.logAlert = platform.logAlert;
        this.logNotice = platform.logNotice;
        this.logDebug = platform.logDebug;
        this.logError = platform.logError;
        this.logWarn = platform.logWarn;
        this.homebridge = platform.homebridge;
    }

    cleanSpaces(str) {
        return String(str.replace(/ /g, ""));
    }

    toTitleCase(str) {
        return str.replace(/\w\S*/g, (txt) => txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase());
    }

    debounce(a, b, c) {
        let d;
        return function() {
            let e = this,
                f = arguments;
            clearTimeout(d),
                (d = setTimeout(function() {
                    (d = null), c || a.apply(e, f);
                }, b)),
                c && !d && a.apply(e, f);
        };
    }

    debounceAlt(func, delay, immediate) {
        let timerId;
        return (...args) => {
            const boundFunc = func.bind(this, ...args);
            clearTimeout(timerId);
            if (immediate && !timerId) {
                boundFunc();
            }
            const calleeFunc = immediate ?
                () => {
                    timerId = null;
                } :
                boundFunc;
            timerId = setTimeout(calleeFunc, delay);
        };
    }

    throttle(func, delay, immediate) {
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

    updateConfig(newConfig) {
        const configPath = this.homebridge.user.configPath();
        const file = fs.readFileSync(configPath);
        const config = JSON.parse(file);
        const platConfig = config.platforms.find((x) => x.name === this.config.name);
        _.extend(platConfig, newConfig);
        const serializedConfig = JSON.stringify(config, null, "  ");
        fs.writeFileSync(configPath, serializedConfig, "utf8");
        _.extend(this.config, newConfig);
    }

    checkVersion() {
        this.logInfo("Checking Package Version for Updates...");
        return new Promise((resolve) => {
            childProcess.exec(`npm view ${packageFile.name} version`, (error, stdout) => {
                const newVer = stdout && stdout.trim();
                if (newVer && compareVersions(stdout.trim(), packageFile.version) > 0) {
                    this.logWarn(`---------------------------------------------------------------`);
                    this.logWarn(`NOTICE: New version of ${packageFile.name} available: ${newVer}`);
                    this.logWarn(`---------------------------------------------------------------`);
                    resolve({
                        hasUpdate: true,
                        newVersion: newVer,
                    });
                } else {
                    this.logInfo(`INFO: Your plugin version is up-to-date`);
                    resolve({
                        hasUpdate: false,
                        newVersion: newVer,
                    });
                }
            });
        });
    }
};