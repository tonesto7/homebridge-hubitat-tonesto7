// HubitatPlatformAccessory.js

export default class HubitatPlatformAccessory {
    constructor(platform, accessory) {
        if (!platform || !platform.log) {
            throw new Error("Platform object with required properties not provided to HubitatPlatformAccessory");
        }

        // TODO: Fix the name sanitizer

        this.log = platform.log;
        this.client = platform.client;
        this.Characteristic = platform.Characteristic;
        this.Service = platform.Service;
        this.accessory = accessory;

        // Core tracking collections
        this.activeServices = new Set();
        this.activeCharacteristics = new Map(); // Map of service UUID to Set of characteristic UUIDs
        this.commandTimers = new Map();
        this.lastCommandTimes = new Map();

        // Device data shortcut
        this.deviceData = accessory.context.deviceData;
    }

    async initializeAccessory() {
        try {
            // Clear previous tracking
            this.activeServices.clear();
            this.activeCharacteristics.clear();

            // Configure basic services
            this.configureAccessoryInfo();

            // Configure device-specific services
            await this.configureServices();

            // Clean up any unused services/characteristics
            this.cleanupUnusedServices();

            return true;
        } catch (error) {
            this.log.error(`Error initializing accessory ${this.accessory.displayName}:`, error);
            throw error;
        }
    }

    configureAccessoryInfo() {
        const infoService = this.getOrAddService(this.Service.AccessoryInformation);
        this.markServiceForRetention(infoService);

        // Add required characteristics
        this.getOrAddCharacteristic(infoService, this.Characteristic.Manufacturer, {
            getHandler: () => this.deviceData.manufacturerName || "Unknown",
        });

        this.getOrAddCharacteristic(infoService, this.Characteristic.Model, {
            getHandler: () => this.deviceData.modelName || "Unknown",
        });

        this.getOrAddCharacteristic(infoService, this.Characteristic.SerialNumber, {
            getHandler: () => `hubitat_${this.deviceData.deviceid}`,
        });

        this.getOrAddCharacteristic(infoService, this.Characteristic.FirmwareRevision, {
            getHandler: () => this.deviceData.firmwareVersion || "Unknown",
        });

        // Sanitize the name
        this.getOrAddCharacteristic(infoService, this.Characteristic.Name, {
            getHandler: () => this.deviceData.name,
        });
    }

    updateDeviceAttribute(attribute, value) {
        if (this.deviceData.attributes && this.deviceData.attributes[attribute]) {
            this.deviceData.attributes[attribute] = value;
        }
    }

    async handleAttributeUpdate(attribute, value, data = {}) {
        throw new Error("handleAttributeUpdate must be implemented by device type class");
    }

    // Service Management
    getOrAddService(serviceType, name, subType) {
        let service;
        if (name) {
            service = this.accessory.getServiceByUUIDAndSubType(serviceType.UUID, subType) || this.accessory.addService(serviceType, name, subType);
        } else {
            service = this.accessory.getService(serviceType) || this.accessory.addService(serviceType);
        }
        return service;
    }

    // Characteristic Management
    getOrAddCharacteristic(service, characteristicType, options = {}) {
        const { preReqChk = null, getHandler = null, setHandler = null, props = {}, eventOnly = false, removeIfMissingPreReq = false } = options;

        // Check prerequisites if specified
        if (preReqChk && !preReqChk(this)) {
            if (removeIfMissingPreReq) {
                const existing = service.getCharacteristic(characteristicType);
                if (existing) {
                    service.removeCharacteristic(existing);
                }
            }
            return null;
        }

        let characteristic = service.getCharacteristic(characteristicType) || service.addCharacteristic(characteristicType);

        // Track this characteristic as active
        this.markCharacteristicForRetention(service, characteristic);

        // Configure characteristic
        if (Object.keys(props).length) {
            characteristic.setProps(props);
        }

        if (!eventOnly) {
            characteristic.eventOnlyCharacteristic = false;
        }

        if (getHandler) {
            // Remove any existing get handler
            characteristic.removeOnGet();
            characteristic.onGet(getHandler.bind(this));
        }

        if (setHandler) {
            // Remove any existing set handler
            characteristic.removeOnSet();
            characteristic.onSet(setHandler.bind(this));
        }

        return characteristic;
    }

    // Service and Characteristic Tracking
    markServiceForRetention(service) {
        this.activeServices.add(service.UUID);
    }

    markCharacteristicForRetention(service, characteristic) {
        if (!this.activeCharacteristics.has(service.UUID)) {
            this.activeCharacteristics.set(service.UUID, new Set());
        }
        this.activeCharacteristics.get(service.UUID).add(characteristic.UUID);
    }

    // Cleanup Methods
    cleanup() {
        // Clean up services and characteristics
        this.cleanupUnusedServices();

        // Clear tracking sets
        this.activeServices.clear();
        this.activeCharacteristics.clear();

        // Clean up timers
        for (const [_, timer] of this.commandTimers) {
            clearTimeout(timer);
        }
        this.commandTimers.clear();
        this.lastCommandTimes.clear();
    }

    cleanupUnusedServices() {
        const services = this.accessory.services.slice();

        for (const service of services) {
            if (!this.activeServices.has(service.UUID)) {
                this.cleanupServiceCharacteristics(service);
                this.accessory.removeService(service);
                this.log.debug(`Removed unused service: ${service.displayName} from ${this.accessory.displayName}`);
            } else {
                // Clean up characteristics for retained services
                this.cleanupServiceCharacteristics(service);
            }
        }
    }

    cleanupServiceCharacteristics(service) {
        const activeChars = this.activeCharacteristics.get(service.UUID) || new Set();
        const characteristics = service.characteristics.slice();

        // Don't remove required characteristics
        const requiredCharUUIDs = new Set(service.characteristics.filter((c) => c.props.perms.includes("pr")).map((c) => c.UUID));

        for (const characteristic of characteristics) {
            if (!activeChars.has(characteristic.UUID) && !requiredCharUUIDs.has(characteristic.UUID)) {
                // Remove handlers first
                characteristic.removeOnGet();
                characteristic.removeOnSet();
                characteristic.removeAllListeners("get");
                characteristic.removeAllListeners("set");
                characteristic.removeAllListeners("change");

                // Remove the characteristic
                service.removeCharacteristic(characteristic);

                this.log.debug(`Removed unused characteristic: ${characteristic.displayName} ` + `from service ${service.displayName} on ${this.accessory.displayName}`);
            }
        }
    }

    // Command Handling
    async sendCommand(command, value = null, options = {}) {
        const { debounce = 300, trailing = false, commandName = null } = options;

        const cmdKey = commandName || command;
        const now = Date.now();
        const lastTime = this.lastCommandTimes.get(cmdKey) || 0;
        const timeSinceLastCommand = now - lastTime;

        // If debouncing is active, clear existing timer
        const existingTimer = this.commandTimers.get(cmdKey);
        if (existingTimer) {
            clearTimeout(existingTimer);
            this.commandTimers.delete(cmdKey);
        }

        // If enough time has passed, send immediately
        if (timeSinceLastCommand >= debounce) {
            this.lastCommandTimes.set(cmdKey, now);
            return this.executeCommand(command, value);
        }

        // Otherwise, set up debounced command
        return new Promise((resolve, reject) => {
            const timer = setTimeout(
                async () => {
                    try {
                        this.lastCommandTimes.set(cmdKey, Date.now());
                        const result = await this.executeCommand(command, value);
                        resolve(result);
                    } catch (error) {
                        reject(error);
                    }
                    this.commandTimers.delete(cmdKey);
                },
                trailing ? debounce : debounce - timeSinceLastCommand,
            );

            this.commandTimers.set(cmdKey, timer);
        });
    }

    async executeCommand(command, value = null) {
        try {
            const payload = value ? { value1: value } : undefined;
            return await this.client.sendDeviceCommand(this.deviceData.deviceid, command, payload);
        } catch (error) {
            this.log.error(`Error executing command ${command} for ${this.accessory.displayName}:`, error);
            throw error;
        }
    }

    // Device Capability Checking
    hasCapability(capability) {
        return this.deviceData.capabilities && Object.keys(this.deviceData.capabilities).includes(capability);
    }

    hasAttribute(attribute) {
        return this.deviceData.attributes && Object.keys(this.deviceData.attributes).includes(attribute);
    }

    hasCommand(command) {
        return this.deviceData.commands && Object.keys(this.deviceData.commands).includes(command);
    }

    hasDeviceFlag(flag) {
        return this.deviceData.deviceflags && Object.keys(this.deviceData.deviceflags).includes(flag);
    }

    // Methods to be implemented by device type classes
    async configureServices() {
        throw new Error("configureServices must be implemented by device type class");
    }

    async handleAttributeUpdate(attribute, value, data = {}) {
        throw new Error("handleAttributeUpdate must be implemented by device type class");
    }

    // Helper Methods
    logDebug(message) {
        this.log.debug(`[${this.accessory.displayName}] ${message}`);
    }

    logInfo(message) {
        this.log.info(`[${this.accessory.displayName}] ${message}`);
    }

    logWarn(message) {
        this.log.warn(`[${this.accessory.displayName}] ${message}`);
    }

    logError(message, error = null) {
        this.log.error(`[${this.accessory.displayName}] ${message}`);
        if (error) {
            this.log.error(error);
        }
    }
}
