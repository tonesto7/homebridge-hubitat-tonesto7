// HubitatPlatform.js

import { pluginName, platformName, platformDesc } from "./StaticConfig.js";
import ConfigManager from "./ConfigManager.js";
import HubitatClient from "./HubitatClient.js";
import HubitatAccessories from "./HubitatAccessories.js";
import CommunityTypes from "./libs/CommunityTypes.js";
import { WebServer } from "./WebServer.js";
import { LogManager } from "./LogManager.js";
import { VersionManager } from "./VersionManager.js";
import events from "events";

export default class HubitatPlatform {
    constructor(log, config, api) {
        // Initialize managers
        this.configManager = new ConfigManager(config, api.user);
        this.logManager = new LogManager(log, this.configManager);
        this.versionManager = new VersionManager(this);

        // Store API references
        this.api = api;
        this.homebridge = api;
        this.hap = api.hap;
        this.Service = api.hap.Service;
        this.Characteristic = api.hap.Characteristic;
        this.Categories = api.hap.Categories;
        this.CommunityTypes = CommunityTypes(this.Service, this.Characteristic);
        this.PlatformAccessory = api.platformAccessory;
        this.uuid = api.hap.uuid;

        // Get config
        this.config = this.configManager.getConfig();

        // Validate config
        if (!this.configManager.isConfigValid()) {
            this.logManager.logError(`${platformName} Plugin Config is missing required fields | Skipping...`);
            return;
        }

        // Platform state
        this.ok2Run = true;
        this.appEvts = new events.EventEmitter();
        this.appEvts.setMaxListeners(50);

        // Set max listeners for Identify characteristic
        this.api.hap.Characteristic.Identify.setMaxListeners(50);

        // Initialize components
        this.client = new HubitatClient(this);
        this.accessories = new HubitatAccessories(this);
        this.client.setAccessories(this.accessories);
        this.webServer = new WebServer(this);
        this.unknownCapabilities = [];

        // Log platform info
        this.logManager.logInfo(`Homebridge Version: ${api.version}`);
        this.logManager.logInfo(`Plugin Version: ${this.versionManager.getVersion()}`);

        // Configuration subscriptions
        this.configManager.onConfigUpdate((newConfig) => {
            this.config = newConfig;
        });

        // Register platform
        api.on("didFinishLaunching", this.didFinishLaunching.bind(this));
        this.api.on("shutdown", this.handleShutdown.bind(this));
    }

    async didFinishLaunching() {
        try {
            this.logManager.logInfo(`Fetching ${platformName} Devices. NOTICE: This may take a moment if you have a large number of devices being loaded!`);

            // Setup refresh interval
            setInterval(this.refreshDevices.bind(this), this.config.client.polling_seconds * 1000);

            // Initial device refresh
            await this.refreshDevices("First Launch");
            // this.appEvts.emit("event:update_plugin_status");

            // Initialize web server
            const webServerResult = await this.webServer.initialize();
            if (webServerResult?.status === "OK") {
                this.appEvts.emit("event:register_for_direct_updates");
            }
        } catch (err) {
            this.logManager.logError("Platform Initialization Error:", err);
        }
    }

    async refreshDevices(src = undefined) {
        const starttime = new Date();

        try {
            this.logManager.logInfo(`Refreshing All Device Data${src ? " | Source: (" + src + ")" : ""}`);

            // Fetch devices from hub
            const resp = await this.client.getDevices();
            if (!resp?.deviceList?.length) {
                throw new Error("Invalid device list received");
            }

            // Update location settings if available
            if (resp.location) {
                this.handleLocationUpdate(resp.location);
            }

            // Process devices
            await this.accessories.processHubitatDevices(resp.deviceList);

            // Log completion
            this.logManager.logAlert(`Total Initialization Time: (${Math.round((new Date() - starttime) / 1000)} seconds)`);

            if (this.unknownCapabilities.length > 0) {
                this.logManager.logBrightBlue(`Unknown Capabilities: ${JSON.stringify(this.unknownCapabilities)}`);
            }

            this.appEvts.emit("event:update_plugin_status");

            return true;
        } catch (ex) {
            this.logManager.logError(`refreshDevices Error:`, ex);
            throw ex;
        }
    }

    handleLocationUpdate(location) {
        if (location.temperature_scale) {
            this.configManager.updatePreferencesConfig({
                temperature_unit: location.temperature_scale,
            });
        }
        if (location.use_cloud !== undefined) {
            this.configManager.updateClientConfig({
                use_cloud: location.use_cloud === true,
            });
        }
    }

    configureAccessory(accessory) {
        if (!this.ok2Run) return;
        this.accessories.configureAccessory(accessory);
    }

    async handleShutdown() {
        this.logManager.logBrightBlue(`${platformDesc} Platform Shutdown`);
        this.client.dispose();
    }

    getHealthMetrics() {
        const memory = process.memoryUsage();
        const uptime = process.uptime();

        return {
            memory: {
                heapUsed: memory.heapUsed,
                heapTotal: memory.heapTotal,
                heapUsedMB: Math.round(memory.heapUsed / (1024 * 1024)),
                heapTotalMB: Math.round(memory.heapTotal / (1024 * 1024)),
            },
            uptime: {
                seconds: uptime,
                formatted: uptime > 86400 ? `${Math.round(uptime / 86400)}d` : uptime > 3600 ? `${Math.round(uptime / 3600)}h` : `${Math.round(uptime / 60)}m`,
            },
        };
    }

    /**
     * Sanitize a device name
     * @param {string} name - The name to sanitize
     * @returns {string} Sanitized name
     */
    sanitizeName(name) {
        if (!name) return "Unnamed Device";

        let sanitized = name
            .replace(/[^a-zA-Z0-9 ']/g, "")
            .trim()
            .replace(/^[^a-zA-Z0-9]+/, "")
            .replace(/[^a-zA-Z0-9]+$/, "")
            .replace(/\s{2,}/g, " ");

        sanitized = sanitized.length === 0 ? "Unnamed Device" : sanitized;

        if (name !== sanitized) {
            this.logManager.logWarn(`Sanitized Name: "${name}" => "${sanitized}"`);
        }

        return sanitized;
    }

    /**
     * Convert a string to title case
     * @param {string} str - The string to convert
     * @returns {string} Title case string
     */
    toTitleCase(str) {
        return str.replace(/\w\S*/g, (txt) => txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase());
    }

    generateSrvcName(displayName, appendedStr) {
        // check if the appendedStr is already in the displayName
        if (displayName.includes(appendedStr)) {
            return displayName;
        }
        return `${displayName} ${appendedStr}`;
    }
}
