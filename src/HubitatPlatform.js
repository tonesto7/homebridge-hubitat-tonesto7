/**
 * @file HubitatPlatform.js
 * @description Main platform class that handles integration between Hubitat and HomeKit
 * Manages device discovery, accessory configuration, and platform lifecycle
 */

import { platformName, platformDesc, pluginName } from "./StaticConst.js";
import ConfigManager from "./ConfigManager.js";
import HubitatClient from "./HubitatClient.js";
import CommunityTypes from "./libs/CommunityTypes.js";
import { WebServer } from "./WebServer.js";
import { LogManager } from "./LogManager.js";
import { VersionManager } from "./VersionManager.js";
import { AccessoryManager } from "./AccessoryManager.js";
import { MetricsManager } from "./MetricsManager.js";
import events from "events";

export default class HubitatPlatform {
    /**
     * Platform constructor
     * @param {Object} log - Homebridge logging object
     * @param {Object} config - Platform configuration
     * @param {Object} api - Homebridge API
     */
    constructor(log, config, api) {
        // Initialize core managers
        this.configManager = new ConfigManager(config, api.user, log);
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

        // Initialize platform state
        this.appEvts = new events.EventEmitter();
        this.appEvts.setMaxListeners(50);
        this._cachedAccessories = new Map();

        // Add health check monitoring
        this.healthCheckMonitor = {
            lastSuccessfulCheck: null,
            consecutiveFailures: 0,
            maxConsecutiveFailures: 3,
            checkInterval: 300000, // 5 minutes
            isHealthy: true,
        };

        // Set max listeners for Identify characteristic
        this.api.hap.Characteristic.Identify.setMaxListeners(50);

        // Initialize components
        this.client = new HubitatClient(this);
        this.accessoryManager = new AccessoryManager(this);
        this.metricsManager = new MetricsManager(this);
        this.webServer = new WebServer(this);
        this.unknownCapabilities = [];

        // Initialize health monitoring with client reference
        this.webServer.initializeHealthMonitoring(this.client);

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

    /**
     * Platform initialization after Homebridge launch
     */
    async didFinishLaunching() {
        try {
            this.logManager.logInfo(`Fetching ${platformName} Devices. NOTICE: This may take a moment if you have a large number of devices being loaded!`);

            // Setup refresh interval and store reference
            this._refreshInterval = setInterval(this.refreshDevices.bind(this), this.config.client.polling_seconds * 1000);

            // Initial device refresh
            await this.refreshDevices("First Launch");

            // Initialize web server
            const webServerResult = await this.webServer.initialize();
            if (webServerResult?.status === "OK") {
                this.appEvts.emit("event:register_for_direct_updates");
            }
        } catch (err) {
            this.logManager.logError("Platform Initialization Error:", err);
        }
    }

    /**
     * Refresh all devices from Hubitat hub
     * @param {string} [src] - Source of the refresh request
     */
    async refreshDevices(src = undefined) {
        const starttime = new Date();

        try {
            this.logManager.logInfo(`Refreshing All Device Data${src ? ` | Source: (${src})` : ""}`);

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
            await this.processHubitatDevices(resp.deviceList);

            // Log completion
            this.logManager.logAlert(`Total Initialization Time: (${Math.round((new Date() - starttime) / 1000)} seconds)`);

            // if (this.unknownCapabilities.length > 0) {
            //     this.logManager.logBrightBlue(`Unknown Capabilities: ${JSON.stringify(this.unknownCapabilities)}`);
            // }

            this.appEvts.emit("event:update_plugin_status");
            return true;
        } catch (ex) {
            this.logManager.logError(`refreshDevices Error:`, ex);
            throw ex;
        }
    }

    /**
     * Process and configure a list of Hubitat devices
     * @param {Array} deviceList - List of Hubitat devices to process
     */
    async processHubitatDevices(deviceList) {
        try {
            this.logManager.logDebug("Processing Hubitat devices...");

            // Create sets for diffing
            const existingDeviceIds = new Set(this._cachedAccessories.keys());
            const incomingDeviceIds = new Set(deviceList.map((d) => d.deviceid));

            // Determine devices to add, update, and remove
            const toCreate = deviceList.filter((d) => !existingDeviceIds.has(d.deviceid));
            const toUpdate = deviceList.filter((d) => existingDeviceIds.has(d.deviceid));
            const toRemove = Array.from(this._cachedAccessories.values()).filter((a) => !incomingDeviceIds.has(a.context.deviceData.deviceid));

            // Log changes
            this.logManager.logWarn(
                `Devices to Remove: (${toRemove.length}):`,
                toRemove.map((a) => a.displayName),
            );
            this.logManager.logInfo(`Devices to Update: (${toUpdate.length})`);
            this.logManager.logSuccess(
                `Devices to Create: (${toCreate.length}):`,
                toCreate.map((d) => d.name),
            );

            // Process removals
            for (const accessory of toRemove) {
                await this.removeAccessory(accessory);
            }

            // Process updates
            for (const device of toUpdate) {
                await this.updateAccessory(device);
            }

            // Process additions
            for (const device of toCreate) {
                await this.addAccessory(device);
            }

            this.logManager.logInfo(`Device Cache Size: (${this._cachedAccessories.size})`);
            return true;
        } catch (error) {
            this.logManager.logError("Error processing Hubitat devices:", error);
            return false;
        }
    }

    /**
     * Update location settings from hub response
     * @param {Object} location - Location settings from hub
     */
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

    /**
     * Add a new accessory
     * @param {Object} device - Hubitat device data
     */
    async addAccessory(device) {
        try {
            let accessory = new this.api.platformAccessory(device.name, this.api.hap.uuid.generate(device.deviceid.toString()));

            // Set initial context
            accessory.context.deviceData = device;
            accessory.context.lastUpdate = new Date().toLocaleString();
            accessory.context.uuid = accessory.UUID;

            // Configure the accessory
            accessory = await this.accessoryManager.configureAccessory(accessory);

            // Register with platform and cache
            this.api.registerPlatformAccessories(pluginName, platformName, [accessory]);
            this.addAccessoryToCache(accessory);

            return accessory;
        } catch (error) {
            this.logManager.logError(`Error adding accessory ${device.name}:`, error);
            throw error;
        }
    }

    /**
     * Update an existing accessory
     * @param {Object} device - Updated Hubitat device data
     */
    async updateAccessory(device) {
        try {
            let accessory = this.getAccessoryFromCache(device.deviceid);
            if (!accessory) return;

            // Clear the device types cache
            delete accessory.context._deviceTypesCache;

            // Update device data and timestamp
            accessory.context.deviceData = device;
            accessory.context.lastUpdate = new Date().toLocaleString();

            // Reconfigure the accessory
            accessory = await this.accessoryManager.configureAccessory(accessory);

            // Update platform and cache
            this.api.updatePlatformAccessories([accessory]);
            this.addAccessoryToCache(accessory);

            return accessory;
        } catch (error) {
            this.logManager.logError(`Error updating accessory ${device.name}:`, error);
            throw error;
        }
    }

    /**
     * Remove an accessory
     * @param {PlatformAccessory} accessory - The accessory to remove
     */
    removeAccessory(accessory) {
        try {
            this.logManager.logWarn(`Removing accessory: ${accessory.displayName}`);
            this.api.unregisterPlatformAccessories(pluginName, platformName, [accessory]);
            this.removeAccessoryFromCache(accessory);
        } catch (err) {
            this.logManager.logError(`Error removing accessory ${accessory.displayName}:`, err);
        }
    }

    /**
     * Process a device attribute update
     * @param {Object} update - The attribute update data
     */
    async processDeviceAttributeUpdate(update) {
        const startTime = Date.now();
        try {
            this.logManager.logDebug(`Processing update for device ${update.name || update.deviceid}: ${update.attribute} = ${update.value}`);
            
            const accessory = this.getAccessoryFromCache(update.deviceid);
            if (!accessory) {
                this.logManager.logWarn(`No accessory found for device ${update.deviceid}`);
                this.metricsManager.recordError();
                return false;
            }

            this.logManager.logAttributeChange(accessory.displayName, update.attribute, accessory.context.deviceData.attributes[update.attribute], update.value);

            // Update the device data
            accessory.context.deviceData.attributes[update.attribute] = update.value;
            accessory.context.lastUpdate = new Date().toLocaleString();

            // Handle attribute updates for each device type
            const deviceTypes = accessory.context.deviceTypes || [];
            for (const deviceType of deviceTypes) {
                const handler = this.accessoryManager.deviceHandlers[deviceType];
                if (handler && typeof handler.handleAttributeUpdate === "function") {
                    handler.handleAttributeUpdate(accessory, update);
                }
            }

            await this.addAccessoryToCache(accessory);
            
            // Record metrics for successful update
            const processingTime = Date.now() - startTime;
            this.metricsManager.recordDeviceUpdate(update, processingTime);
            
            return true;
        } catch (error) {
            this.logManager.logError(`Error in processDeviceAttributeUpdate:`, error);
            this.metricsManager.recordError();
            return false;
        }
    }

    /**
     * Configure an accessory during platform initialization
     * @param {PlatformAccessory} accessory - The accessory to configure
     */
    configureAccessory(accessory) {
        const deviceId = accessory.context.deviceData?.deviceid;
        if (deviceId) {
            this.addAccessoryToCache(accessory);
        } else {
            this.logManager.logWarn(`Accessory ${accessory.displayName} is missing deviceData.deviceid`);
        }
    }

    /**
     * Handle platform shutdown
     */
    async handleShutdown() {
        this.logManager.logBrightBlue(`${platformDesc} Platform Shutdown`);

        try {
            // Stop refresh interval
            if (this._refreshInterval) {
                clearInterval(this._refreshInterval);
            }

            // Cleanup components
            this.client.dispose();
            this.accessoryManager.dispose();
            
            // Save and cleanup metrics
            if (this.metricsManager) {
                await this.metricsManager.dispose();
            }

            // Remove all event listeners
            this.appEvts.removeAllListeners();

            // Clear accessory cache
            this._cachedAccessories.clear();

            // Close web server if running
            if (this.webServer && this.webServer.close) {
                await this.webServer.close();
            }
        } catch (error) {
            this.logManager.logError("Error during shutdown:", error);
        }
    }

    /**
     * Add accessory to cache
     * @param {PlatformAccessory} accessory - The accessory to cache
     * @returns {PlatformAccessory} The cached accessory
     */
    addAccessoryToCache(accessory) {
        if (!this._cachedAccessories.has(accessory.context.deviceData.deviceid)) {
            this._cachedAccessories.set(accessory.context.deviceData.deviceid, accessory);
        }
        return accessory;
    }

    /**
     * Remove accessory from cache
     * @param {PlatformAccessory} accessory - The accessory to remove from cache
     */
    removeAccessoryFromCache(accessory) {
        if (this._cachedAccessories.has(accessory.context.deviceData.deviceid)) {
            this._cachedAccessories.delete(accessory.context.deviceData.deviceid);
        }
    }

    /**
     * Get accessory from cache by device ID
     * @param {string|number} deviceId - The device ID to look up
     * @returns {PlatformAccessory|undefined} The cached accessory or undefined
     */
    getAccessoryFromCache(deviceId) {
        return this._cachedAccessories.get(deviceId);
    }

    /**
     * Get all cached accessories
     * @returns {Array<PlatformAccessory>} Array of all cached accessories
     */
    getAllCachedAccessories() {
        return Array.from(this._cachedAccessories.values());
    }

    getAllAccessoryKeys() {
        return Array.from(this._cachedAccessories.keys());
    }

    /**
     * Get platform health metrics
     * @returns {Object} Object containing memory usage and uptime metrics
     */
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

    /**
     * Generate a standardized service name
     * @param {string} displayName - Base display name
     * @param {string} appendedStr - String to append
     * @returns {string} Combined service name
     */
    generateSrvcName(displayName, appendedStr) {
        // check if the appendedStr is already in the displayName
        if (displayName.includes(appendedStr)) {
            return displayName;
        }
        return `${displayName} ${appendedStr}`;
    }

    /**
     * Validate health check response
     * @param {Object} response - Health check response
     * @returns {Object} Validation result
     */
    validateHealthCheckResponse(response) {
        this.logManager.logDebug(`Validating health check response: ${JSON.stringify(response)}`);
        
        if (!response || !response.data) {
            this.logManager.logDebug(`Health check validation failed: response=${!!response}, data=${!!response?.data}`);
            return { valid: false, reason: "No response data" };
        }

        const { data } = response;
        if (data.status !== "OK") {
            this.logManager.logDebug(`Health check validation failed: status=${data.status}`);
            return { valid: false, reason: `Invalid status: ${data.status}` };
        }

        if (!data.pluginVersion || !data.timestamp) {
            this.logManager.logDebug(`Health check validation failed: pluginVersion=${!!data.pluginVersion}, timestamp=${!!data.timestamp}`);
            return { valid: false, reason: "Missing required fields" };
        }

        // Check if response is recent (within last 10 minutes)
        const responseTime = new Date(data.timestamp).getTime();
        const now = Date.now();
        if (now - responseTime > 600000) {
            // 10 minutes
            return { valid: false, reason: "Response too old" };
        }

        return { valid: true };
    }
}
