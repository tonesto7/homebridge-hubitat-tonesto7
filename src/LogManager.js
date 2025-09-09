// platform/LogManager.js

import chalk from "chalk";

export class LogManager {
    constructor(log, configManager) {
        this.log = log;
        this.config = configManager.getConfig();
        this.updateLoggingConfig(this.config.logging);

        // Subscribe to config updates
        configManager.onConfigUpdate((newConfig) => {
            this.config = newConfig;
            this.updateLoggingConfig(newConfig.logging);
        });
    }

    updateLoggingConfig(loggingConfig) {
        this.logConfig = {
            debug: loggingConfig?.debug || false,
            showChanges: loggingConfig?.showChanges !== false,
        };
    }

    /**
     * Format a log message with optional args
     * @private
     */
    formatMessage(message, ...args) {
        if (!args?.length) return message;

        if (args[0] instanceof Error) {
            return `${message} ${args[0].stack || args[0].message}`;
        }

        try {
            return `${message} ${args.map((arg) => (typeof arg === "object" ? JSON.stringify(arg) : arg)).join(" ")}`;
        } catch (_) {
            return `${message} ${args.join(" ")}`;
        }
    }

    // Native Homebridge logging methods
    logInfo(message, ...args) {
        this.log.info(this.formatMessage(message, ...args));
    }

    logWarn(message, ...args) {
        this.log.warn(this.formatMessage(message, ...args));
    }

    logError(message, ...args) {
        this.log.error(this.formatMessage(message, ...args));
    }

    logDebug(message, ...args) {
        if (this.logConfig.debug) {
            // Simulate debug logging through info when config debug is true
            this.log.info(chalk.gray(this.formatMessage(message, ...args)));
        } else {
            this.log.debug(this.formatMessage(message, ...args));
        }
    }

    // Additional color methods not provided by Homebridge
    logBlue(message, ...args) {
        this.log.info(chalk.blue(this.formatMessage(message, ...args)));
    }

    logBrightBlue(message, ...args) {
        this.log.info(chalk.blueBright(this.formatMessage(message, ...args)));
    }

    logMagenta(message, ...args) {
        this.log.info(chalk.magenta(this.formatMessage(message, ...args)));
    }

    logBrightMagenta(message, ...args) {
        this.log.info(chalk.magentaBright(this.formatMessage(message, ...args)));
    }

    logCyan(message, ...args) {
        this.log.info(chalk.cyan(this.formatMessage(message, ...args)));
    }

    logBrightCyan(message, ...args) {
        this.log.info(chalk.cyanBright(this.formatMessage(message, ...args)));
    }

    // Special purpose logging methods
    logAlert(message, ...args) {
        this.log.warn(this.formatMessage(message, ...args));
    }

    logGreen(message, ...args) {
        this.log.info(chalk.green(this.formatMessage(message, ...args)));
    }

    logOrange(message, ...args) {
        this.log.info(chalk.hex("#FFA500")(this.formatMessage(message, ...args)));
    }

    logSuccess(message, ...args) {
        this.log.success(this.formatMessage(message, ...args));
    }

    logAttributeChange(deviceName, attribute, previousValue, newValue) {
        if (!this.logConfig.showChanges) return;

        this.log.info(`${chalk.hex("#FFA500")("Device Event")}: ` + `(${chalk.blueBright(deviceName)}) ` + `[${chalk.yellow.bold(attribute ? attribute.toUpperCase() : "unknown")}] ` + `changed from ${chalk.green(previousValue)} to ${chalk.green(newValue)}`);
    }

    /**
     * Log an object as a formatted table
     */
    logTable(title, data) {
        if (!this.logConfig.debug && !this.nativeDebug) return;

        this.logDebug(title);
        this.logDebug("=".repeat(50));

        for (const [key, value] of Object.entries(data)) {
            const formattedValue = typeof value === "object" ? JSON.stringify(value, null, 2) : value;
            this.logDebug(`${key.padEnd(20)}: ${formattedValue}`);
        }

        this.logDebug("=".repeat(50));
    }

    /**
     * Log execution time of an async function
     */
    async logExecutionTime(label, fn) {
        const start = process.hrtime();
        try {
            return await fn();
        } finally {
            const [seconds, nanoseconds] = process.hrtime(start);
            const milliseconds = seconds * 1000 + nanoseconds / 1000000;
            this.logDebug(`${label} took ${milliseconds.toFixed(2)}ms`);
        }
    }
}
