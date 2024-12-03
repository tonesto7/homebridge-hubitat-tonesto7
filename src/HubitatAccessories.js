/**
 * @file HubitatAccessories.js
 * @description Manages Hubitat device accessories and their integration with HomeKit
 */

import { platformName } from "./StaticConst.js";
import { AccessoryManager } from "./AccessoryManager.js";

export default class HubitatAccessories {
    /**
     * @param {Object} platform - The Hubitat platform instance
     */
    constructor(platform) {
        this.platform = platform;
        this.logManager = platform.logManager;
        this.configManager = platform.configManager;
        this.client = platform.client;
        this.api = platform.api;
        this.config = platform.config;

        // Initialize accessory management
        this._cachedAccessories = new Map();
        this.accessoryManager = new AccessoryManager(platform);
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
            this.api.registerPlatformAccessories(platformName, platformName, [accessory]);
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
            let accessory = this._cachedAccessories.get(device.deviceid);
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
            this.api.unregisterPlatformAccessories(platformName, platformName, [accessory]);
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
        try {
            const accessory = this._cachedAccessories.get(update.deviceid);
            if (!accessory) {
                this.logManager.logWarn(`No accessory found for device ${update.deviceid}`);
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
            return true;
        } catch (error) {
            this.logManager.logError(`Error in processDeviceAttributeUpdate:`, error);
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
            this._cachedAccessories.set(deviceId, accessory);
        } else {
            this.logManager.logWarn(`Accessory ${accessory.displayName} is missing deviceData.deviceid`);
        }
    }

    // Cache management methods
    addAccessoryToCache(accessory) {
        if (!this._cachedAccessories.has(accessory.context.deviceData.deviceid)) {
            this._cachedAccessories.set(accessory.context.deviceData.deviceid, accessory);
        }
        return accessory;
    }

    removeAccessoryFromCache(accessory) {
        if (this._cachedAccessories.has(accessory.context.deviceData.deviceid)) {
            this._cachedAccessories.delete(accessory.context.deviceData.deviceid);
        }
    }

    getAccessoryFromCache(deviceId) {
        return this._cachedAccessories.get(deviceId);
    }

    getAllCachedAccessories() {
        return Array.from(this._cachedAccessories.values());
    }
}
