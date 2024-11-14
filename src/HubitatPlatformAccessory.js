// HubitatPlatformAccessory.js

export default class HubitatPlatformAccessory {
    constructor(platform, accessory) {
        if (!platform || !platform.log) {
            throw new Error("Platform object with required properties not provided to HubitatPlatformAccessory");
        }

        this.sanitizeName = platform.sanitizeName;
        this.log = platform.log;
        this.config = platform.config;
        this.client = platform.client;
        this.Characteristic = platform.Characteristic;
        this.Service = platform.Service;
        this.accessory = accessory;
        this.tempUnit = platform.configManager.getTempUnit();

        // Initialize shared tracking collections in accessory context
        if (!accessory.context._activeServices) {
            accessory.context._activeServices = new Set();
        }
        if (!accessory.context._activeCharacteristics) {
            accessory.context._activeCharacteristics = new Map();
        }

        // Use references to shared collections
        this.activeServices = accessory.context._activeServices;
        this.activeCharacteristics = accessory.context._activeCharacteristics;

        // Instance-specific collections
        this.commandTimers = new Map();
        this.lastCommandTimes = new Map();

        // Device data shortcut
        this.deviceData = accessory.context.deviceData;

        this.defaultCmdDebounceConfig = {
            setLevel: { delay: 600, trailing: true },
            setVolume: { delay: 600, trailing: true },
            setSpeed: { delay: 600, trailing: true },
            setSaturation: { delay: 600, trailing: true },
            setHue: { delay: 600, trailing: true },
            setColorTemperature: { delay: 600, trailing: true },
            setHeatingSetpoint: { delay: 600, trailing: true },
            setCoolingSetpoint: { delay: 600, trailing: true },
            setThermostatSetpoint: { delay: 600, trailing: true },
            setThermostatMode: { delay: 600, trailing: true },
        };
    }

    async initializeAccessory() {
        try {
            // Configure basic services
            this.configureAccessoryInfo();

            // Configure device-specific services
            await this.configureServices();

            return true;
        } catch (error) {
            this.log.error(`Error initializing accessory ${this.accessory.displayName}:`, error);
            throw error;
        }
    }

    configureAccessoryInfo() {
        const infoService = this.getOrAddService(this.Service.AccessoryInformation);

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
            getHandler: () => this.sanitizeName(this.deviceData.name),
        });

        // handle the identify event
        this.getOrAddCharacteristic(infoService, this.Characteristic.Identify, {
            setHandler: () => {
                this.logInfo(`${this.deviceData.name} - identify`);
            },
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
        if (name || subType) {
            if (subType) {
                service = this.accessory.getServiceById(serviceType.UUID, subType) || this.accessory.addService(serviceType, name, subType);
            } else {
                service = this.accessory.getServiceById(serviceType.UUID) || this.accessory.addService(serviceType, name);
            }
        } else {
            service = this.accessory.getService(serviceType) || this.accessory.addService(serviceType);
        }

        // Mark the service for retention
        this.markServiceForRetention(service);

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

    getServiceId(service) {
        return service.subtype ? `${service.UUID} ${service.subtype}` : service.UUID;
    }

    // Service and Characteristic Tracking
    markServiceForRetention(service) {
        if (!service) {
            this.log.warn("Attempted to mark null service for retention");
            return;
        }

        const serviceId = this.getServiceId(service);
        if (!this.activeServices.has(serviceId)) {
            this.activeServices.add(serviceId);
        }

        // Initialize characteristics tracking for this service if needed
        if (!this.activeCharacteristics.has(serviceId)) {
            this.activeCharacteristics.set(serviceId, new Set());
        }
    }

    markCharacteristicForRetention(service, characteristic) {
        const serviceId = this.getServiceId(service);
        if (!this.activeCharacteristics.has(serviceId)) {
            this.activeCharacteristics.set(serviceId, new Set());
        }
        this.activeCharacteristics.get(serviceId).add(characteristic);
    }

    // Cleanup Methods
    cleanup() {
        this.logDebug(`${this.deviceData.name} | Cleaning up`);

        // Clean up timers
        for (const [_, timer] of this.commandTimers) {
            clearTimeout(timer);
        }
        this.commandTimers.clear();
        this.lastCommandTimes.clear();
    }

    cleanupUnusedServices() {
        // return;
        const services = this.accessory.services.slice();

        for (const service of services) {
            const serviceId = this.getServiceId(service);
            if (!this.activeServices.has(serviceId)) {
                if (service.UUID === this.Service.AccessoryInformation.UUID) {
                    continue; // Skip AccessoryInformation service
                }
                this.log.warn(`Removing unused service: ${service.displayName} (${serviceId})`);
                this.cleanupServiceCharacteristics(service);
                this.accessory.removeService(service);
            }
        }
    }

    cleanupServiceCharacteristics(service) {
        const serviceId = this.getServiceId(service);
        const activeChars = this.activeCharacteristics.get(serviceId) || new Set();
        const characteristics = service.characteristics.slice();

        // Don't remove required characteristics
        // const requiredCharUUIDs = new Set(service.characteristics.filter((c) => c.props.perms.includes("pr")).map((c) => c.UUID));

        for (const characteristic of characteristics) {
            if (!activeChars.has(characteristic)) {
                // Remove handlers first
                characteristic.removeOnGet();
                characteristic.removeOnSet();
                characteristic.removeAllListeners("get");
                characteristic.removeAllListeners("set");
                characteristic.removeAllListeners("change");

                // Remove the characteristic
                service.removeCharacteristic(characteristic);

                this.log.debug(`${this.deviceData.name} | Removed unused characteristic: ${characteristic.displayName} ` + `from service ${service.displayName} on ${this.accessory.displayName}`);
            }
        }
    }

    // Command Handling
    async sendCommand(command, value = null) {
        try {
            const cmdConfig = this.defaultCmdDebounceConfig[command];
            const delay = cmdConfig?.delay || 300;
            const trailing = cmdConfig?.trailing || false;

            const now = Date.now();
            const lastTime = this.lastCommandTimes.get(command) || 0;
            const timeSinceLastCommand = now - lastTime;

            // Clear existing timer if any
            const existingTimer = this.commandTimers.get(command);
            if (existingTimer) {
                clearTimeout(existingTimer);
                this.commandTimers.delete(command);
            }

            // Create payload
            const payload = value ? { value1: value } : undefined;

            // Execute command function
            const executeCommand = async () => {
                this.lastCommandTimes.set(command, Date.now());
                return await this.client.sendHubitatCommand(this.deviceData, command, payload);
            };

            // If command should trail or needs debouncing
            if (trailing || timeSinceLastCommand < delay) {
                return new Promise((resolve, reject) => {
                    const timer = setTimeout(
                        async () => {
                            try {
                                const result = await executeCommand();
                                resolve(result);
                            } catch (error) {
                                reject(error);
                            } finally {
                                this.commandTimers.delete(command);
                            }
                        },
                        trailing ? delay : Math.max(0, delay - timeSinceLastCommand),
                    );

                    this.commandTimers.set(command, timer);
                });
            }

            // Execute immediately for non-trailing commands
            return await executeCommand();
        } catch (error) {
            this.logError(`Error executing command ${command} for device ${this.deviceData.name}:`, error);
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

    // Temperature Utilities
    getTempUnit() {
        return this.tempUnit;
    }

    getTemperatureDisplayUnits() {
        return this.tempUnit === "F" ? this.Characteristic.TemperatureDisplayUnits.FAHRENHEIT : this.Characteristic.TemperatureDisplayUnits.CELSIUS;
    }

    transformTemperatureToHomeKit(temp) {
        if (this.tempUnit === "F") {
            return parseFloat(((temp - 32) / 1.8) * 10) / 10; // F to C with 1 decimal
        }
        return parseFloat(temp * 10) / 10; // Already in C, just format to 1 decimal
    }

    transformTemperatureFromHomeKit(temp) {
        if (this.tempUnit === "F") {
            return parseFloat(temp * 1.8 + 32); // C to F
        }
        return parseFloat(temp); // Keep in C
    }

    validateCharacteristicValue(service, characteristic, value, opts = {}) {
        const currentValue = service.getCharacteristic(characteristic).value;
        const charName = characteristic.name;
        const { minValue = characteristic.props.minValue, maxValue = characteristic.props.maxValue } = opts;

        if (value === null || value === undefined || isNaN(value)) {
            this.logWarn(`Invalid ${charName} value: ${value}, keeping current value: ${currentValue}`);
            return currentValue;
        }

        const numValue = Number(value);
        if (numValue < minValue || numValue > maxValue) {
            this.logWarn(`${charName} value out of range: ${value} (min: ${minValue}, max: ${maxValue}), keeping current value: ${currentValue}`);
            return currentValue;
        }

        return numValue;
    }
}
