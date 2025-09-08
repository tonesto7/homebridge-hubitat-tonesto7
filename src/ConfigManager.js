// ConfigManager.js

import events from "events";
import fs from "fs";
import os from "os";
import portFinderSync from "portfinder-sync";

export default class ConfigManager {
    constructor(platformConfig, homebridge, log) {
        this.homebridge = homebridge;
        this.log = log;
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
            multi_instance: {
                enabled: true,
                discovery_enabled: true,
                instance_id: undefined, // Auto-generated if not provided
                conflict_resolution: "warn", // "warn", "error", "ignore"
                health_monitoring: true,
                persistent_queues: true,
                connection_pooling: true,
                instance_name: undefined, // User-friendly name for this instance
                scan_interval: 300000, // 5 minutes between background scans
                startup_scan_timeout: 5000, // 5 seconds for initial scan
                max_scan_failures: 3, // Stop scanning after this many failures
                scan_on_health_failure: true, // Trigger scan when health issues occur
                scan_on_connection_loss: true, // Trigger scan when connection lost
            },
            logging: {
                debug: false,
                showChanges: true,
            },
        };

        // Properties that should not be saved to config.json
        this.excludeProperties = ["excluded_attributes", "excluded_capabilities", "update_method"];

        // Track the active port and IP
        this.activePort = null;
        this.activeIP = null;

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
            this.log.error("Error saving config:", error);
        }
    }

    async findAvailablePort() {
        try {
            const basePort = 8000;
            this.activePort = portFinderSync.getPort(basePort);
            if (this.activePort !== basePort) {
                this.log.info(`Auto-assigned port ${basePort} was in use, using port ${this.activePort} instead`);
            }
            return this.activePort;
        } catch (error) {
            this.log.error("Error finding available port:", error);
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
        return this.config.client.static_ip || this.activeIP || this.getIPAddress();
    }

    getConfig() {
        return { ...this.config }; // Return a copy to prevent accidental mutations
    }

    /**
     * Generate a unique instance ID for multi-instance support
     */
    generateInstanceId() {
        // Combine MAC address, current timestamp, and random string
        const networkInterfaces = os.networkInterfaces();
        let macAddress = 'unknown';
        
        // Find the first non-internal network interface with a MAC address
        for (const [name, interfaces] of Object.entries(networkInterfaces)) {
            for (const iface of interfaces || []) {
                if (!iface.internal && iface.mac && iface.mac !== '00:00:00:00:00:00') {
                    macAddress = iface.mac.replace(/:/g, '');
                    break;
                }
            }
            if (macAddress !== 'unknown') break;
        }
        
        const timestamp = Date.now().toString(36);
        const random = Math.random().toString(36).substring(2, 8);
        const port = this.getActivePort() || '8000';
        
        return `${macAddress.substring(0, 6)}-${timestamp}-${random}-${port}`;
    }

    /**
     * Initialize instance ID if not set
     */
    initializeInstanceId() {
        if (!this.config.multi_instance.instance_id) {
            const instanceId = this.generateInstanceId();
            this.updateConfig({ 'multi_instance.instance_id': instanceId });
            this.log.info(`Generated new instance ID: ${instanceId}`);
            return instanceId;
        }
        return this.config.multi_instance.instance_id;
    }

    /**
     * Get instance configuration
     */
    getInstanceConfig() {
        return {
            instance_id: this.initializeInstanceId(),
            instance_name: this.config.multi_instance.instance_name || `Homebridge-${this.config.client.app_id}`,
            app_id: this.config.client.app_id,
            ip: this.getActiveIP(),
            port: this.getActivePort(),
            discovery_enabled: this.config.multi_instance.discovery_enabled,
            health_monitoring: this.config.multi_instance.health_monitoring,
            persistent_queues: this.config.multi_instance.persistent_queues,
            connection_pooling: this.config.multi_instance.connection_pooling,
            conflict_resolution: this.config.multi_instance.conflict_resolution
        };
    }

    /**
     * Check if multi-instance features are enabled
     */
    isMultiInstanceEnabled() {
        return this.config.multi_instance.enabled;
    }

    /**
     * Check if plugin discovery is enabled
     */
    isDiscoveryEnabled() {
        return this.config.multi_instance.discovery_enabled && this.isMultiInstanceEnabled();
    }

    /**
     * Get conflict resolution strategy
     */
    getConflictResolution() {
        return this.config.multi_instance.conflict_resolution || 'warn';
    }

    /**
     * Set instance name
     */
    setInstanceName(name) {
        this.updateConfig({ 'multi_instance.instance_name': name });
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
                    // console.log("Local IP Address:", alias.address);
                    this.activeIP = alias.address;
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
            this.log.error("Invalid temperature unit:", unit);
        }
    }
}
