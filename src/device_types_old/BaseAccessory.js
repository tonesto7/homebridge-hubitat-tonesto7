// device_types/BaseAccessory.js

export default class HubitatBaseAccessory {
    constructor(platform, accessory) {
        if (!platform || !platform.logManager || !platform.stateManager || !platform.configManager || !platform.api) {
            throw new Error("Platform object with required properties not provided to HubitatBaseAccessory");
        }

        // Initialize managers from platform
        this.logManager = platform.logManager;
        this.stateManager = platform.stateManager;
        this.configManager = platform.configManager;
        this.sanitizeName = platform.sanitizeName;

        // Initialize platform properties
        this.api = platform.api;
        this.config = platform.config;
        this.client = platform.client;
        this.Characteristic = platform.Characteristic;
        this.Service = platform.Service;
        this.accessory = accessory;
        this.tempUnit = platform.configManager.getTempUnit();

        // Runtime-only properties (non-serializable, don't store in context)
        this._commandTimers = new Map(); // Keep timers in memory only
        this._lastCommandTimes = new Map(); // Keep command times in memory only
        this._adaptiveLightingController = null; // Keep controller instance in memory

        // Ensure context state exists and has required properties
        this.stateManager.initializeAccessoryContext(accessory);

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
            this.logManager.logError(`Error initializing accessory ${this.accessory.displayName}:`, error);
            throw error;
        }
    }

    configureAccessoryInfo() {
        this.accessory.displayName = this.sanitizeName(this.deviceData.name);

        // Remove legacy AccessoryInformation service and create new one with subtype
        const existingInfoService = this.accessory.getService(this.Service.AccessoryInformation);
        if (existingInfoService) {
            this.accessory.removeService(existingInfoService);
        }

        const infoService = this.getOrAddService(this.Service.AccessoryInformation, null, "accessoryInfo");

        // Direct updates instead of handlers
        infoService
            .updateCharacteristic(this.Characteristic.Manufacturer, this.deviceData.manufacturerName || "Unknown")
            .updateCharacteristic(this.Characteristic.Model, this.deviceData.modelName || "Unknown")
            .updateCharacteristic(this.Characteristic.SerialNumber, `hubitat_${this.deviceData.deviceid}`)
            .updateCharacteristic(this.Characteristic.FirmwareRevision, this.deviceData.firmwareVersion || "Unknown")
            .updateCharacteristic(this.Characteristic.Name, this.sanitizeName(this.deviceData.name));

        // Only add handler for Identify
        this.getOrAddCharacteristic(infoService, this.Characteristic.Identify, {
            setHandler: () => {
                this.logManager.logInfo(`${this.deviceData.name} - identify`);
            },
        });

        // handle the identify event
        this.getOrAddCharacteristic(infoService, this.Characteristic.Identify, {
            setHandler: () => {
                this.logManager.logInfo(`${this.deviceData.name} - identify`);
            },
        });
    }

    updateDeviceAttribute(attribute, value, deviceName) {
        if (!this.deviceData) {
            this.logManager.logError(`No deviceData found for ${this.accessory.displayName}`);
            return { success: false };
        }

        if (!this.deviceData.attributes) {
            this.deviceData.attributes = {};
        }

        const previousValue = this.deviceData.attributes[attribute];
        this.deviceData.attributes[attribute] = value;

        if (this.config.logConfig?.showChanges) {
            this.logManager.logAttributeChange(deviceName || this.deviceData.name, attribute, previousValue, value);
        }

        return { success: true, previousValue };
    }

    // Service Management
    getOrAddService(serviceType, displayName, subType) {
        try {
            let service;

            // First try to find existing service
            service = this.accessory.getService(serviceType);

            // If no existing service was found...
            if (!service) {
                // If we have a display name, use subtype approach
                if (displayName) {
                    if (!subType) {
                        subType = `${serviceType.UUID}_${Date.now()}`;
                        this.logManager.logDebug(`${this.deviceData.name} | Generated subtype: ${subType}`);
                    }
                    service = this.accessory.getServiceById(serviceType, subType) || this.accessory.addService(serviceType, displayName, subType);
                }
                // If no display name, use original approach
                else {
                    service = this.accessory.addService(serviceType);
                }
            }

            // Update name if display name provided (works for both existing and new services)
            if (displayName && service) {
                const nameCharacteristic = service.getCharacteristic(this.Characteristic.Name) || service.addCharacteristic(this.Characteristic.Name);
                nameCharacteristic.setValue(displayName);
            }

            // Use StateManager to track service
            this.stateManager.trackService(this.accessory, service);

            return service;
        } catch (error) {
            this.logManager.logError(`Error adding service ${displayName} (${subType}):`, error);
            throw error;
        }
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
        this.stateManager.trackCharacteristic(this.accessory, service, characteristic);

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
        // For AccessoryInformation service, always use UUID only
        if (service.UUID === this.Service.AccessoryInformation.UUID) {
            return service.UUID;
        }
        // For all other services, use UUID + subtype if available
        return service.subtype ? `${service.UUID} ${service.subtype}` : service.UUID;
    }

    cleanServiceDisplayName(deviceName, serviceName) {
        const sanitizedDeviceName = this.sanitizeName(deviceName);
        const sanitizedServiceName = this.sanitizeName(serviceName);

        // Check if the service name is already included in the device name
        if (sanitizedDeviceName.includes(sanitizedServiceName)) {
            return sanitizedDeviceName;
        }
        return `${sanitizedDeviceName} ${sanitizedServiceName}`;
    }

    // Cleanup Methods
    async cleanup() {
        // Clear runtime timers
        for (const [_, timer] of this._commandTimers) {
            clearTimeout(timer);
        }
        this._commandTimers.clear();
        this._lastCommandTimes.clear();

        // Clean up adaptive lighting if present
        if (this._adaptiveLightingController) {
            this.accessory.removeController(this._adaptiveLightingController);
            this._adaptiveLightingController = null;
        }

        // Use StateManager to clean up state
        this.stateManager.cleanupAccessoryState(this.accessory);
    }

    getServiceDisplayName(service) {
        let serviceName = "unnamed";
        if (service.displayName) {
            serviceName = service.displayName;
        } else {
            // Try to get the service name from the UUID
            for (const [key, value] of Object.entries(this.Service)) {
                if (value.UUID === service.UUID) {
                    serviceName = key;
                    break;
                }
            }
        }
        return serviceName;
    }

    // In HubitatBaseAccessory.js
    cleanupUnusedServices(accessory) {
        const services = accessory.services.slice();

        for (const service of services) {
            const serviceId = this.getServiceId(service);

            // Never remove AccessoryInformation service
            if (service.UUID === this.Service.AccessoryInformation.UUID) {
                continue;
            }

            // Get a descriptive name for the service
            const serviceName = this.getServiceDisplayName(service);

            if (!this.stateManager.getActiveServices(accessory).includes(serviceId)) {
                // Remove the entire service if it's not active
                this.logManager.logWarn(`Removing unused service: ${serviceName} ` + `(${serviceId}) from ${accessory.displayName}`);
                accessory.removeService(service);
            } else {
                // Service is active, clean up its unused characteristics
                const activeChars = this.stateManager.getActiveCharacteristics(accessory, serviceId);
                const characteristics = service.characteristics.slice();

                // Get required characteristics for this service type
                const requiredCharUUIDs = new Set(service.constructor.requiredCharacteristics?.map((c) => c.UUID) || []);

                for (const characteristic of characteristics) {
                    // Skip if characteristic is required or active
                    if (requiredCharUUIDs.has(characteristic.UUID) || activeChars.includes(characteristic.UUID)) {
                        continue;
                    }

                    // Remove handlers first
                    characteristic.removeOnGet();
                    characteristic.removeOnSet();
                    characteristic.removeAllListeners();

                    // Remove the characteristic
                    service.removeCharacteristic(characteristic);
                }
            }
        }
    }

    cleanupServiceCharacteristics(service) {
        const serviceId = this.getServiceId(service);
        const activeChars = this.stateManager.getActiveCharacteristics(this.accessory, serviceId);
        const characteristics = service.characteristics.slice();

        // Don't remove required characteristics
        // const requiredCharUUIDs = new Set(service.characteristics.filter((c) => c.props.perms.includes("pr")).map((c) => c.UUID));

        for (const characteristic of characteristics) {
            if (!activeChars.includes(characteristic.UUID)) {
                // Remove handlers first
                characteristic.removeOnGet();
                characteristic.removeOnSet();
                characteristic.removeAllListeners("get");
                characteristic.removeAllListeners("set");
                characteristic.removeAllListeners("change");

                // Remove the characteristic
                service.removeCharacteristic(characteristic);

                this.logManager.logDebug(`${this.deviceData.name} | Removed unused characteristic: ${characteristic.displayName} ` + `from service ${service.displayName} on ${this.accessory.displayName}`);
            }
        }
    }

    // Command Handling
    async sendCommand(command, params = []) {
        try {
            // Get the command debounce config
            const cmdConfig = this.defaultCmdDebounceConfig[command];
            const delay = cmdConfig?.delay || 300;
            const trailing = cmdConfig?.trailing || false;

            // Get the time since the last command
            const now = Date.now();
            const lastTime = this._lastCommandTimes.get(command) || 0;
            const timeSinceLastCommand = now - lastTime;

            // Clear any existing timer for this command
            const existingTimer = this._commandTimers.get(command);
            if (existingTimer) {
                clearTimeout(existingTimer);
                this._commandTimers.delete(command);
            }

            // Ensure params is an array and filter out null/undefined
            const validParams = Array.isArray(params) ? params.filter((p) => p != null) : [params].filter((p) => p != null);

            // Execute the command (check for trailing debounce)
            const executeCommand = async () => {
                this._lastCommandTimes.set(command, Date.now());
                return await this.client.sendHubitatCommand(this.deviceData, command, validParams);
            };

            // If trailing or time since last command is less than delay, set a timer to execute the command
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
                                this._commandTimers.delete(command);
                            }
                        },
                        trailing ? delay : Math.max(0, delay - timeSinceLastCommand),
                    );
                    this._commandTimers.set(command, timer);
                });
            }

            // Otherwise, execute the command immediately
            return await executeCommand();
        } catch (error) {
            this.logManager.logError(`Error executing command ${command} for device ${this.deviceData.name}:`, error);
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

    // Checks homebridge version to see if Adaptive Lighting is supported
    adaptiveLightingSupported() {
        return this.api.versionGreaterOrEqual && this.api.versionGreaterOrEqual("v1.3.0-beta.23");
    }

    // Methods to be implemented by device type classes
    async configureServices() {
        throw new Error("configureServices must be implemented by device type class");
    }

    async handleAttributeUpdate(attribute, value, data = {}) {
        throw new Error("handleAttributeUpdate must be implemented by device type class");
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
            this.logManager.logWarn(`Invalid ${charName} value: ${value}, keeping current value: ${currentValue}`);
            return currentValue;
        }

        const numValue = Number(value);
        if (numValue < minValue || numValue > maxValue) {
            this.logManager.logWarn(`${charName} value out of range: ${value} (min: ${minValue}, max: ${maxValue}), keeping current value: ${currentValue}`);
            return currentValue;
        }

        return numValue;
    }
}
