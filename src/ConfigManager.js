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

        // Define new nested structure for defaults
        this.defaults = {
            client: {
                app_id: undefined,
                app_url_local: undefined,
                app_url_cloud: undefined,
                access_token: undefined,
                use_cloud: false,
                validateTokenId: false,
                static_ip: undefined,
                polling_seconds: 900,
            },
            devices: {
                excluded_attributes: [],
                excluded_capabilities: [],
                round_levels: true,
                consider_fan_by_name: true,
                consider_light_by_name: false,
            },
            features: {
                adaptive_lighting: {
                    enabled: true,
                    off_when_on: false,
                    offset: undefined,
                },
                led_effects: {
                    enabled: true,
                },
            },
            preferences: {
                temperature_unit: "F",
                update_method: "direct",
            },
            logging: {
                debug: false,
                showChanges: true,
            },
        };

        // Properties that should not be saved to config.json
        this.excludeProperties = ["excluded_attributes", "excluded_capabilities", "update_method"];

        // Track the active port
        this.activePort = null;

        // First check if config is in old format and needs upgrade
        if (this.isLegacyConfig(platformConfig)) {
            this.config = this.upgradeLegacyConfig(platformConfig);
            // Save the upgraded config
            this.saveConfig();
        } else {
            this.config = this.applyDefaults(platformConfig);
        }
    }

    isConfigValid() {
        const client = this.config.client;
        return client && client.app_id && client.app_url_local && client.app_url_cloud;
    }

    // Helper to detect if config is in old format
    isLegacyConfig(config) {
        // Check if config has any of the old top-level properties
        const legacyProps = ["app_id", "app_url_local", "app_url_cloud", "access_token", "polling_seconds", "round_levels", "adaptive_lighting"];
        return legacyProps.some((prop) => config.hasOwnProperty(prop));
    }

    // Convert old flat config to new nested structure
    upgradeLegacyConfig(oldConfig) {
        console.log("Upgrading legacy config format to new structure...");

        // Create new config structure from old flat config
        const newConfig = {
            client: {
                app_id: oldConfig.app_id,
                app_url_local: oldConfig.app_url_local,
                app_url_cloud: oldConfig.app_url_cloud,
                access_token: oldConfig.access_token,
                use_cloud: oldConfig.use_cloud,
                validateTokenId: oldConfig.validateTokenId,
                static_ip: oldConfig.direct_ip,
                polling_seconds: oldConfig.polling_seconds,
            },
            devices: {
                excluded_attributes: oldConfig.excluded_attributes,
                excluded_capabilities: oldConfig.excluded_capabilities,
                round_levels: oldConfig.round_levels,
                consider_fan_by_name: oldConfig.consider_fan_by_name,
                consider_light_by_name: oldConfig.consider_light_by_name,
            },
            features: {
                adaptive_lighting: {
                    enabled: oldConfig.adaptive_lighting,
                    off_when_on: oldConfig.adaptive_lighting_off_when_on,
                    offset: oldConfig.adaptive_lighting_offset,
                },
                led_effects: {
                    enabled: oldConfig.allow_led_effects_control,
                },
            },
            preferences: {
                temperature_unit: oldConfig.temperature_unit,
                update_method: oldConfig.update_method,
            },
            logging: {
                debug: oldConfig.logConfig?.debug,
                showChanges: oldConfig.logConfig?.showChanges,
            },
        };

        // console.log("New config:", newConfig);

        // Apply defaults to ensure all properties exist
        return this.applyDefaults(newConfig);
    }

    // Apply defaults to ensure all required properties exist
    applyDefaults(config) {
        const result = {};

        // Recursive helper to merge defaults
        const mergeDefaults = (target, source, defaults) => {
            for (const key in defaults) {
                if (typeof defaults[key] === "object" && !Array.isArray(defaults[key])) {
                    // Create nested object if it doesn't exist
                    target[key] = {};
                    // Merge recursively for nested objects
                    mergeDefaults(target[key], (source && source[key]) || {}, defaults[key]);
                } else {
                    // For non-objects, use source value if it exists, otherwise use default
                    target[key] = source && source[key] !== undefined ? source[key] : defaults[key];
                }
            }
        };

        mergeDefaults(result, config, this.defaults);
        return result;
    }

    // Helper methods to access nested config
    getClientConfig() {
        return this.config.client;
    }

    getDevicesConfig() {
        return this.config.devices;
    }

    getFeaturesConfig() {
        return this.config.features;
    }

    getPreferencesConfig() {
        return this.config.preferences;
    }

    getLoggingConfig() {
        return this.config.logging;
    }

    // Update methods for specific sections
    updateClientConfig(updates) {
        this.config.client = {
            ...this.config.client,
            ...updates,
        };
        this.saveConfig(this.excludeProperties);
        this.eventEmitter.emit("configUpdated", this.config);
    }

    updateDevicesConfig(updates) {
        this.config.devices = {
            ...this.config.devices,
            ...updates,
        };
        this.saveConfig(this.excludeProperties);
        this.eventEmitter.emit("configUpdated", this.config);
    }

    updatePreferencesConfig(updates) {
        this.config.preferences = {
            ...this.config.preferences,
            ...updates,
        };
        this.saveConfig(this.excludeProperties);
        this.eventEmitter.emit("configUpdated", this.config);
    }

    updateFeaturesConfig(updates) {
        this.config.features = {
            ...this.config.features,
            ...updates,
        };
        this.saveConfig(this.excludeProperties);
        this.eventEmitter.emit("configUpdated", this.config);
    }

    updateLoggingConfig(updates) {
        this.config.logging = {
            ...this.config.logging,
            ...updates,
        };
        this.saveConfig(this.excludeProperties);
        this.eventEmitter.emit("configUpdated", this.config);
    }

    updateNestedConfig(path, value) {
        let current = this.config;
        const parts = path.split(".");
        const last = parts.pop();

        for (const part of parts) {
            current = current[part] = current[part] || {};
        }

        current[last] = value;
        this.saveConfig(this.excludeProperties);
        this.eventEmitter.emit("configUpdated", this.config);
    }

    // Generic update method that accepts dot notation paths
    updateConfig(updates) {
        if (typeof updates === "string") {
            const [path, value] = updates.split("=");
            this.updateNestedConfig(path, value);
        } else {
            // Handle object updates
            Object.entries(updates).forEach(([key, value]) => {
                if (key.includes(".")) {
                    this.updateNestedConfig(key, value);
                } else {
                    // Handle top-level updates
                    this.config[key] = value;
                }
            });
            this.saveConfig(this.excludeProperties);
            this.eventEmitter.emit("configUpdated", this.config);
        }
    }

    saveConfig() {
        try {
            const configPath = this.homebridge.configPath();
            const configFile = fs.readFileSync(configPath, "utf8");
            const fullConfig = JSON.parse(configFile);

            // Find the platform config in the platforms array
            const platformIndex = fullConfig.platforms.findIndex((x) => {
                // For old config structure
                if (x.app_id) {
                    return x.name === this.platformConfig.name && x.app_id === this.config.client.app_id;
                }
                // For new config structure
                return x.name === this.platformConfig.name && x.client?.app_id === this.config.client.app_id;
            });

            if (platformIndex === -1) {
                console.error("Platform configuration not found in config.json");
                return;
            }

            // Create a copy of the current config
            const configToSave = JSON.parse(JSON.stringify(this.config));

            // Remove excluded properties
            this.excludeProperties.forEach((prop) => {
                const sections = ["client", "devices", "preferences"];
                sections.forEach((section) => {
                    if (configToSave[section] && prop in configToSave[section]) {
                        delete configToSave[section][prop];
                    }
                });
            });

            // Preserve existing platform, name, and _bridge properties
            const preservedProperties = {
                platform: fullConfig.platforms[platformIndex].platform,
                name: fullConfig.platforms[platformIndex].name,
            };

            // Only include _bridge if it exists in the original config
            if (fullConfig.platforms[platformIndex]._bridge) {
                preservedProperties._bridge = fullConfig.platforms[platformIndex]._bridge;
            }

            // Replace the old platform config with the new one, keeping platform and name at root
            fullConfig.platforms[platformIndex] = {
                ...preservedProperties,
                ...configToSave,
            };

            // Write the updated config back to file
            fs.writeFileSync(configPath, JSON.stringify(fullConfig, null, 4), "utf8");

            // Emit the config updated event
            this.eventEmitter.emit("configUpdated", this.config);

            // console.log("Config saved successfully");
        } catch (error) {
            console.error("Error saving config:", error);
        }
    }

    async findAvailablePort() {
        try {
            const basePort = 8000;
            this.activePort = portFinderSync.getPort(basePort);
            if (this.activePort !== basePort) {
                console.log(`Port ${basePort} was in use, using port ${this.activePort} instead`);
            }
            return this.activePort;
        } catch (error) {
            console.error("Error finding available port:", error);
            throw error;
        }
    }

    getActivePort() {
        return this.activePort;
    }

    // New method to determine if using static IP
    isUsingStaticIP() {
        return !!this.config.client.static_ip;
    }

    // Updated method to get active IP
    getActiveIP() {
        return this.config.client.static_ip || this.getIPAddress();
    }

    getConfig() {
        return { ...this.config }; // Return a copy to prevent accidental mutations
    }

    getConfigValue(key) {
        return this.config[key];
    }

    onConfigUpdate(listener) {
        this.eventEmitter.on("configUpdated", listener);
    }

    // Get the local IP address
    getIPAddress() {
        // console.log("Getting local IP address...");
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

    getTempUnit() {
        return this.config.preferences.temperature_unit;
    }

    updateTempUnit(unit) {
        if (unit && (unit === "F" || unit === "C")) {
            this.updateNestedConfig("preferences.temperature_unit", unit);
        } else {
            console.error("Invalid temperature unit:", unit);
        }
    }
}
