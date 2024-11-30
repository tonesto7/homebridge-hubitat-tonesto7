// HubitatPlatform.js

import { pluginName, platformName, platformDesc } from "./StaticConfig.js";
import ConfigManager from "./ConfigManager.js";
import HubitatClient from "./HubitatClient.js";
import HubitatAccessories from "./HubitatAccessories.js";
import CommunityTypes from "./libs/CommunityTypes.js";
import { WebServer } from "./WebServer.js";
// import { StateManager } from "./StateManager.js";
import { LogManager } from "./LogManager.js";
import { VersionManager } from "./VersionManager.js";
import events from "events";

export default class HubitatPlatform {
    constructor(log, config, api) {
        // Initialize managers
        this.logManager = new LogManager(log);
        this.configManager = new ConfigManager(config, api.user);
        // this.stateManager = new StateManager(this);
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
        if (this.validateConfig(this.config)) {
            this.logManager.log(`${platformName} Plugin is not Configured | Skipping...`);
            return;
        }

        // Platform state
        this.ok2Run = true;
        this.appEvts = new events.EventEmitter();
        this.appEvts.setMaxListeners(50);

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
        this.appEvts.emit("event:plugin_upd_status");
    }

    async didFinishLaunching() {
        try {
            this.logManager.logInfo(`Fetching ${platformName} Devices. NOTICE: This may take a moment if you have a large number of devices being loaded!`);

            // Initialize accessory states
            // await this.stateManager.initializeAccessoryStates(this.accessories.getAllAccessories());

            // Setup refresh interval
            setInterval(this.refreshDevices.bind(this), this.config.polling_seconds * 1000);

            // Initial device refresh
            await this.refreshDevices("First Launch");

            // Initialize web server
            const webServerResult = await this.webServer.initialize();
            if (webServerResult?.status === "OK") {
                this.appEvts.emit("event:plugin_start_direct");
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

            // Refresh accessories
            await this.accessories.refreshDevices(resp.deviceList);

            // Update refresh timestamps
            // await this.stateManager.updateLastRefresh(this.accessories.getAllAccessories());

            // Log completion
            this.logManager.logAlert(`Total Initialization Time: (${Math.round((new Date() - starttime) / 1000)} seconds)`);

            if (src !== "First Launch") {
                this.appEvts.emit("event:plugin_upd_status");
            }

            return true;
        } catch (ex) {
            this.logManager.logError(`refreshDevices Error:`, ex);
            throw ex;
        }
    }

    handleLocationUpdate(location) {
        if (location.temperature_scale) {
            this.configManager.updateTempUnit(location.temperature_scale);
        }
        if (location.hubIP) {
            this.configManager.updateConfig({
                direct_ip: location.hubIP,
                use_cloud: location.use_cloud === true,
            });
        }
    }

    configureAccessory(accessory) {
        if (!this.ok2Run) return;
        this.accessories.configureAccessory(accessory);
    }

    async handleShutdown() {
        this.logManager.logNotice(`${platformDesc} Platform Shutdown`);
        // await this.stateManager.handleShutdown(this.accessories.getAllAccessories());
    }

    validateConfig(config) {
        return !config || !config.app_url_local || !config.app_url_cloud || !config.app_id;
    }

    // Expose logging methods for backwards compatibility
    logAlert(...args) {
        this.logManager.logAlert(...args);
    }
    logGreen(...args) {
        this.logManager.logGreen(...args);
    }
    logNotice(...args) {
        this.logManager.logNotice(...args);
    }
    logWarn(...args) {
        this.logManager.logWarn(...args);
    }
    logError(...args) {
        this.logManager.logError(...args);
    }
    logInfo(...args) {
        this.logManager.logInfo(...args);
    }
    logDebug(...args) {
        this.logManager.logDebug(...args);
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
}
