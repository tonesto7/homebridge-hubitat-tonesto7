// platform/LogManager.js

import chalk from "chalk";

export class LogManager {
    constructor(log, debug = false, configManager) {
        this.log = log;

        this.config = configManager.getConfig();
        this.debug = debug;

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
            info: true,
            warn: true,
            notice: true,
            error: true,
            showChanges: loggingConfig?.showChanges !== false,
        };
    }

    /**
     * Format a log message with optional args
     * @private
     * @param {string} message - The message to format
     * @param {Array} args - Additional arguments
     * @returns {string} Formatted message
     */
    formatMessage(message, ...args) {
        let formattedMessage = message;
        if (args && args.length) {
            if (args[0] instanceof Error) {
                formattedMessage += ` ${args[0].stack || args[0].message}`;
            } else {
                try {
                    formattedMessage += " " + args.map((arg) => (typeof arg === "object" ? JSON.stringify(arg) : arg)).join(" ");
                } catch (e) {
                    formattedMessage += " " + args.join(" ");
                }
            }
        }
        return formattedMessage;
    }

    /**
     * Log an alert message (yellow)
     * @param {string} message - Message to log
     * @param {...*} args - Additional arguments
     */
    logAlert(message, ...args) {
        if (!this.logConfig.notice) return;
        this.log.info(chalk.yellow(this.formatMessage(message, ...args)));
    }

    /**
     * Log a success message (green)
     * @param {string} message - Message to log
     * @param {...*} args - Additional arguments
     */
    logGreen(message, ...args) {
        if (!this.logConfig.notice) return;
        this.log.info(chalk.green(this.formatMessage(message, ...args)));
    }

    /**
     * Log a notice message (blue)
     * @param {string} message - Message to log
     * @param {...*} args - Additional arguments
     */
    logNotice(message, ...args) {
        if (!this.logConfig.notice) return;
        this.log.info(chalk.blueBright(this.formatMessage(message, ...args)));
    }

    /**
     * Log a warning message (orange)
     * @param {string} message - Message to log
     * @param {...*} args - Additional arguments
     */
    logWarn(message, ...args) {
        if (!this.logConfig.warn) return;
        this.log.warn(chalk.hex("#FFA500").bold(this.formatMessage(message, ...args)));
    }

    /**
     * Log an error message (red)
     * @param {string} message - Message to log
     * @param {Error|string} [error] - Optional error object or message
     * @param {...*} args - Additional arguments
     */
    logError(message, error, ...args) {
        if (!this.logConfig.error) return;

        this.log.error(chalk.bold.red(this.formatMessage(message, ...args)));

        if (error) {
            if (error instanceof Error) {
                this.log.error(chalk.red(error.stack || error.message));
            } else {
                this.log.error(chalk.red(error));
            }
        }
    }

    /**
     * Log an info message (white)
     * @param {string} message - Message to log
     * @param {...*} args - Additional arguments
     */
    logInfo(message, ...args) {
        if (!this.logConfig.info) return;
        this.log.info(chalk.white(this.formatMessage(message, ...args)));
    }

    /**
     * Log a debug message (gray)
     * @param {string} message - Message to log
     * @param {...*} args - Additional arguments
     */
    logDebug(message, ...args) {
        if (!this.logConfig.debug && !this.debug) return;
        this.log.debug(chalk.gray(this.formatMessage(message, ...args)));
    }

    logAttributeChange(deviceName, attribute, previousValue, newValue) {
        this.logInfo(`${chalk.hex("#FFA500")("Device Event")}: ` + `(${chalk.blueBright(deviceName)}) ` + `[${chalk.yellow.bold(attribute ? attribute.toUpperCase() : "unknown")}] ` + `changed from ${chalk.green(previousValue)} to ${chalk.green(newValue)}`);
    }

    /**
     * Log a message with the base logger
     * @param {string} message - Message to log
     * @param {...*} args - Additional arguments
     */
    log(message, ...args) {
        this.log.info(this.formatMessage(message, ...args));
    }

    /**
     * Create a prefixed logger for a specific component
     * @param {string} prefix - Prefix for log messages
     * @returns {Object} Prefixed logger methods
     */
    createPrefixedLogger(prefix) {
        const prefixedMethods = {};
        const logMethods = ["log", "logAlert", "logGreen", "logNotice", "logWarn", "logError", "logInfo", "logDebug"];

        for (const method of logMethods) {
            prefixedMethods[method] = (message, ...args) => {
                this[method](`[${prefix}] ${message}`, ...args);
            };
        }

        return prefixedMethods;
    }

    /**
     * Create a scoped logger for a device
     * @param {string} deviceName - Name of the device
     * @returns {Object} Scoped logger methods
     */
    createDeviceLogger(deviceName) {
        return this.createPrefixedLogger(deviceName);
    }

    /**
     * Log an object as a formatted table
     * @param {string} title - Table title
     * @param {Object} data - Data to display
     */
    logTable(title, data) {
        if (!this.logConfig.debug) return;

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
     * @param {string} label - Label for the timing log
     * @param {Function} fn - Async function to time
     * @returns {Promise} Result of the async function
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
