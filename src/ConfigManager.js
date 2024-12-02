// ConfigManager.js

import events from "events";
import fs from "fs";
import os from "os";
import portFinderSync from "portfinder-sync";

export default class ConfigManager {
    constructor(platformConfig, homebridge) {
        this.homebridge = homebridge;
        this.platformConfig = platformConfig;
        this.eventEmitter = new events.EventEmitter();

        // Default values for all config options
        this.defaults = {
            polling_seconds: 900,
            excluded_attributes: [],
            excluded_capabilities: [],
            update_method: "direct",
            round_levels: true,
            direct_port: 8000,
            validateTokenId: false,
            consider_fan_by_name: true,
            consider_light_by_name: false,
            adaptive_lighting: true,
            adaptive_lighting_off_when_on: false,
            adaptive_lighting_offset: undefined,
            allow_led_effects_control: true,
            temperature_unit: "F",
            logConfig: {
                debug: false,
                showChanges: true,
            },
        };

        // Properties that should not be saved to config.json
        this.excludeProperties = ["excluded_attributes", "excluded_capabilities", "update_method", "direct_port", "direct_ip"];

        // Load initial config
        this.config = this.normalizeConfig(platformConfig);
        // console.log("Initial Config:", this.config);
    }

    isConfigValid() {
        // check all of these:  config === undefined || config === null || config.app_url_local === undefined || config.app_url_local === null || config.app_url_cloud === undefined || config.app_url_cloud === null || config.app_id === undefined || config.app_id === null
        if (this.config === undefined || this.config === null || this.config.app_url_local === undefined || this.config.app_url_local === null || this.config.app_url_cloud === undefined || this.config.app_url_cloud === null || this.config.app_id === undefined || this.config.app_id === null) {
            return false;
        }
        return true;

        // const requiredFields = ["app_url_local", "app_url_cloud", "app_id"];
        // return this.config !== null && requiredFields.every((field) => this.config[field] !== undefined && this.config[field] !== null);
    }

    /**
     * Normalizes and validates the configuration.
     *
     * @param {Object} config - The raw configuration from Homebridge.
     * @returns {Object} - The normalized configuration object.
     */
    normalizeConfig(config) {
        // Start with all defaults
        const normalized = { ...this.defaults };

        // Add required fields
        normalized.app_url_local = config.app_url_local;
        normalized.app_url_cloud = config.app_url_cloud;
        normalized.app_id = config.app_id;
        normalized.access_token = config.access_token;

        // Special cases that need computation
        normalized.direct_ip = config.direct_ip || this.getIPAddress();
        normalized.direct_port = config.direct_port || this.findDirectPort(config) || this.defaults.direct_port;

        // Override any defaults with provided config values
        for (const [key, value] of Object.entries(config)) {
            if (value !== undefined) {
                if (key === "logConfig") {
                    normalized.logConfig = {
                        debug: config.logConfig?.debug === true,
                        showChanges: config.logConfig?.showChanges !== false,
                    };
                } else {
                    normalized[key] = value;
                }
            }
        }

        // Handle boolean flags consistently
        const booleanFlags = {
            use_cloud: false,
            validateTokenId: false,
            consider_fan_by_name: true,
            consider_light_by_name: false,
            adaptive_lighting: true,
            adaptive_lighting_off_when_on: false,
            allow_led_effects_control: true,
            round_levels: true,
        };

        for (const [key, defaultValue] of Object.entries(booleanFlags)) {
            normalized[key] = normalized[key] === undefined ? defaultValue : normalized[key] === true;
        }

        // Special case for adaptive lighting offset
        if (!normalized.adaptive_lighting) {
            normalized.adaptive_lighting_offset = undefined;
        }

        return normalized;
    }

    /**
     * Updates the configuration with new values and persists them to the config file.
     *
     * @param {Object} newConfig - The new configuration values.
     */
    updateConfig(newConfig) {
        const updatedFields = {};

        // Filter out excluded properties
        const configToUpdate = { ...newConfig };
        this.excludeProperties.forEach((prop) => {
            delete configToUpdate[prop];
        });

        // Only process changed fields
        for (const [key, value] of Object.entries(configToUpdate)) {
            if (JSON.stringify(this.config[key]) !== JSON.stringify(value)) {
                updatedFields[key] = value;
                this.config[key] = value;
            }
        }

        // Only save if there were actual changes
        if (Object.keys(updatedFields).length > 0) {
            this.saveConfig();
            this.eventEmitter.emit("configUpdated", this.config);
        }

        return updatedFields;
    }

    /**
     * Saves the current configuration back to the Homebridge config.json file.
     * Completely excludes specific properties from being saved.
     */
    saveConfig() {
        const configPath = this.homebridge.configPath();
        const configFile = fs.readFileSync(configPath, "utf8");
        const config = JSON.parse(configFile);

        // Find the platform config
        const platformConfig = config.platforms.find((x) => x.name === this.platformConfig.name && x.app_id === this.config.app_id);

        if (platformConfig) {
            // Create a copy of the current config
            const configToSave = { ...this.config };

            // Remove excluded properties from the config to save
            this.excludeProperties.forEach((prop) => {
                if (configToSave[prop]) {
                    delete configToSave[prop];
                }
            });

            // Update the platform config with the filtered configuration
            Object.assign(platformConfig, configToSave);

            // Write the updated config back to file
            fs.writeFileSync(configPath, JSON.stringify(config, null, 4), "utf8");
        } else {
            // Handle the case where the platform config is not found or app_id doesn't match
            console.error("Platform configuration not found or app_id does not match in config.json");
        }
    }

    /**
     * Loads the configuration from the Homebridge config.json file.
     */
    loadConfig() {
        const configPath = this.homebridge.configPath();
        const configFile = fs.readFileSync(configPath, "utf8");
        const config = JSON.parse(configFile);

        // Find the platform config
        const platformConfig = config.platforms.find((x) => x.name === this.platformConfig.name && x.app_id === this.platformConfig.app_id);

        if (platformConfig) {
            this.config = this.normalizeConfig(platformConfig);
        } else {
            // Handle the case where the platform config is not found or app_id doesn't match
            console.error("Platform configuration not found or app_id does not match in config.json");
        }
    }

    /**
     * Finds an available port for direct communication.
     *
     * @returns {number} - The available direct port.
     */
    findDirectPort(rawConfig) {
        console.log("Finding direct port...");
        let port = (rawConfig && rawConfig.direct_port) || 8000;
        if (port) {
            port = portFinderSync.getPort(port);
        }
        return port;
    }

    /**
     * Gets the current configuration.
     *
     * @returns {Object} - The current configuration.
     */
    getConfig() {
        return { ...this.config }; // Return a copy to prevent accidental mutations
    }

    getConfigValue(key) {
        return this.config[key];
    }

    /**
     * Registers a listener for configuration updates.
     *
     * @param {Function} listener - The listener function to be called on updates.
     */
    onConfigUpdate(listener) {
        this.eventEmitter.on("configUpdated", listener);
    }

    /**
     * Utility method to get the local IP address.
     *
     * @returns {string} - The local IP address.
     */
    getIPAddress() {
        console.log("Getting local IP address...");
        // Implement method to get local IP address
        const interfaces = os.networkInterfaces();
        for (const devName in interfaces) {
            const iface = interfaces[devName];
            for (let i = 0; i < iface.length; i++) {
                const alias = iface[i];
                if (alias.family === "IPv4" && alias.address !== "127.0.0.1" && !alias.internal) {
                    console.log("Local IP Address:", alias.address);
                    return alias.address;
                }
            }
        }
        return "0.0.0.0";
    }

    /**
     * Retrieves the temperature unit.
     *
     * @returns {string} The temperature unit.
     */
    getTempUnit() {
        return this.config.temperature_unit;
    }

    /**
     * Updates the temperature unit.
     *
     * @param {string} unit - The new temperature unit ('F' or 'C').
     */
    updateTempUnit(unit) {
        if (unit && (unit === "F" || unit === "C")) {
            this.updateConfig({ temperature_unit: unit });
        } else {
            console.error("Invalid temperature unit:", unit);
        }
    }
}
