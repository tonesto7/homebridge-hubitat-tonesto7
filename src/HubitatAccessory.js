// HubitatAccessory.js

/**
 * Represents a Hubitat accessory for Homebridge.
 *
 * This class provides methods to manage and interact with Hubitat devices within the Homebridge platform.
 * It includes functionality for setting up accessory information, managing services and characteristics,
 * sending commands, and handling various device capabilities and attributes.
 *
 * @class
 * @classdesc A class to manage Hubitat accessories in Homebridge.
 *
 * @param {object} platform - The platform instance.
 * @param {object} accessory - The accessory instance.
 *
 * @property {object} platform - The platform instance.
 * @property {object} accessory - The accessory instance.
 * @property {object} Service - The Homebridge Service class.
 * @property {object} Characteristic - The Homebridge Characteristic class.
 * @property {object} Categories - The Homebridge Categories class.
 * @property {string} uuid - The UUID for the accessory.
 * @property {object} log - The logging instance.
 * @property {object} homebridge - The Homebridge instance.
 * @property {object} config - The platform configuration items.
 *
 * @property {object} accessory._buttonMap - A map of button services.
 * @property {object} accessory.commandTimers - A map of command timers.
 * @property {object} accessory.commandTimersTS - A map of command timer timestamps.
 * @property {Array} accessory.deviceGroups - An array of device groups.
 * @property {Array} accessory.servicesToKeep - An array of services to keep.
 * @property {object} accessory.characteristicsToKeep - A map of characteristics to keep.
 *
 * @method setupAccessoryInformation - Sets up the accessory information for the Homebridge accessory.
 * @method sanitizeAndUpdateAccessoryName - Sanitizes the accessory name and updates it if necessary.
 * @method getAccessoryName - Retrieves the name of the accessory.
 * @method getOrAddService - Retrieves an existing service or adds a new one to the accessory.
 * @method getOrAddCharacteristic - Adds a characteristic to a service if it doesn't already exist.
 * @method addServiceToKeep - Adds a service to the list of services to keep for the accessory.
 * @method addCharacteristicToKeep - Adds a characteristic to the list of characteristics to keep for a given service.
 * @method removeUnusedServices - Removes unused services from the accessory.
 * @method removeUnusedCharacteristics - Removes unused characteristics from a given service.
 * @method updateCharacteristicValue - Updates the value of a specified characteristic for a given service.
 * @method hasCapability - Checks if the accessory has a specific capability.
 * @method getCapabilities - Retrieves the capabilities of the accessory.
 * @method hasAttribute - Checks if the accessory has a specific attribute.
 * @method hasCommand - Checks if the accessory has a specific command.
 * @method hasService - Checks if the accessory has a specific service.
 * @method hasCharacteristic - Checks if the specified service has the given characteristic.
 * @method hasDeviceFlag - Checks if the device has a specific flag.
 * @method getButtonSvcByName - Retrieves or adds a button service to the accessory.
 * @method sendCommand - Sends a command to the device with optional debouncing.
 * @method clamp - Clamps a value between a minimum and maximum value.
 * @method clearAndSetTimeout - Clears the existing timeout and sets a new timeout.
 * @method toTitleCase - Converts a string to title case.
 */
export default class HubitatAccessory {
    constructor(platform, accessory) {
        this.platform = platform;
        this.accessory = accessory;

        this.Service = platform.Service;
        this.Characteristic = platform.Characteristic;
        this.Categories = platform.Categories;
        this.uuid = platform.uuid;
        this.log = platform.log;
        this.homebridge = platform.homebridge;

        this.config = platform.configItems;

        // Initialize button map and command timers
        this.accessory._buttonMap = {};
        this.accessory.commandTimers = {};
        this.accessory.commandTimersTS = {};
        this.accessory.deviceGroups = [];

        // Initialize services and characteristics to keep
        this.accessory.servicesToKeep = [];
        this.accessory.characteristicsToKeep = {};

        // Bind functions to the accessory
        accessory.hasCapability = this.hasCapability.bind(this);
        accessory.getCapabilities = this.getCapabilities.bind(this);
        accessory.hasAttribute = this.hasAttribute.bind(this);
        accessory.hasCommand = this.hasCommand.bind(this);
        accessory.hasService = this.hasService.bind(this);
        accessory.hasCharacteristic = this.hasCharacteristic.bind(this);
        accessory.hasDeviceFlag = this.hasDeviceFlag.bind(this);
        accessory.getButtonSvcByName = this.getButtonSvcByName.bind(this);
        accessory.sendCommand = this.sendCommand.bind(this);
        accessory.isAdaptiveLightingSupported = (this.platform.homebridge.version >= 2.7 && this.platform.homebridge.versionGreaterOrEqual("1.3.0-beta.19")) || !!this.platform.homebridge.hap.AdaptiveLightingController;

        // Setup AccessoryInformation service
        this.setupAccessoryInformation();
    }

    /**
     * Sets up the accessory information for the Homebridge accessory.
     *
     * This method performs the following tasks:
     * - Checks if the accessory context contains device data.
     * - Sanitizes the device name and updates the accessory name if necessary.
     * - Configures the Accessory Information service with characteristics such as
     *   FirmwareRevision, Manufacturer, Model, Name, HardwareRevision, and SerialNumber.
     * - Verifies that the accessory name has been sanitized.
     * - Sets up an event listener for the "identify" event if not already present.
     *
     * @throws {Error} Logs an error if the accessory context does not contain device data.
     */
    setupAccessoryInformation() {
        if (!this.accessory.context.deviceData) {
            this.log.error(`Missing deviceData in accessory context for ${this.accessory.displayName || "Unknown Device"}`);
            return;
        }

        const originalName = this.accessory.context.deviceData.name;
        const sanitizedName = this.platform.Utils.sanitizeName(originalName);
        // console.log(`setupAccessoryInformation | Name: (${this.accessory.context.deviceData.name}) | Sanitized: [${sanitizedName}]`);
        if (originalName !== sanitizedName || this.accessory.displayName !== sanitizedName || this.accessory.context.deviceData.name !== sanitizedName) {
            this.log.warn(`Sanitized Name: "${originalName}" => "${sanitizedName}"`);
            this.accessory.name = sanitizedName;
            this.accessory.displayName = sanitizedName;
            this.accessory.context.deviceData.name = sanitizedName;
        }

        const accInfoSvc = this.getOrAddService(this.Service.AccessoryInformation);
        accInfoSvc
            .setCharacteristic(this.Characteristic.FirmwareRevision, this.accessory.context.deviceData.firmwareVersion || "Unknown")
            .setCharacteristic(this.Characteristic.Manufacturer, this.accessory.context.deviceData.manufacturerName || "Unknown")
            .setCharacteristic(this.Characteristic.Model, this.accessory.context.deviceData.modelName ? this.toTitleCase(this.accessory.context.deviceData.modelName) : "Unknown")
            .setCharacteristic(this.Characteristic.Name, this.accessory.name)
            .setCharacteristic(this.Characteristic.HardwareRevision, this.platform.pluginVersion || "Unknown")
            .setCharacteristic(this.Characteristic.SerialNumber, `he_deviceid_${this.accessory.context.deviceData.deviceid || "Unknown"}`);

        // Verify the name has been Sanitized
        const currentName = accInfoSvc.getCharacteristic(this.Characteristic.Name).value;
        if (currentName !== sanitizedName) {
            this.log.warn(`Failed to sanitize the accessory name (${originalName}) to [${sanitizedName}] for device ID: ${this.accessory.context.deviceData.deviceid}`);
            accInfoSvc.getCharacteristic(this.Characteristic.Name).updateValue(sanitizedName);
        }

        // Handle Identify event
        if (!accInfoSvc.listeners("identify").length) {
            accInfoSvc.on("identify", (paired, callback) => {
                this.log.info(`${this.accessory.name} - identify`);
                callback();
            });
        }
    }

    /**
     * Sanitizes the accessory name and updates it if necessary.
     *
     * This method retrieves the original name of the accessory from its context,
     * sanitizes it using the platform's utility function, and updates the accessory's
     * name if the sanitized name differs from the original. It also updates the
     * AccessoryInformation service with the new name and verifies the update.
     *
     * If the AccessoryInformation service is not found or the display name update fails,
     * appropriate warnings are logged. If the update is successful, an informational log
     * is created and the platform accessories are updated.
     *
     * @method sanitizeAndUpdateAccessoryName
     * @memberof HubitatAccessory
     */
    sanitizeAndUpdateAccessoryName() {
        const originalName = this.accessory.context.deviceData.name;
        const sanitizedName = this.platform.utils.sanitizeName(originalName);

        if (sanitizedName !== originalName) {
            // Update the name properties
            this.accessory.name = sanitizedName;

            // Update the AccessoryInformation service
            const accessoryInformation = accessory.getService(this.Service.AccessoryInformation);
            if (accessoryInformation) {
                accessoryInformation.getCharacteristic(this.Characteristic.Name).updateValue(sanitizedName);

                // Verify that the displayName was updated
                const displayName = accessoryInformation.getCharacteristic(this.Characteristic.Name).value;
                if (displayName !== sanitizedName) {
                    this.logWarn(`Failed to update displayName for device ID: ${accessory.deviceid}`);
                } else {
                    this.logInfo(`AccessoryInformation service updated successfully for device ID: ${accessory.deviceid} | Old Name: "${originalName}" | Display Name: "${displayName}"`);
                    this.homebridge.updatePlatformAccessories([accessory]);
                }
            } else {
                this.logWarn(`AccessoryInformation service not found for device ID: ${accessory.deviceid}`);
            }
        }
    }

    /**
     * Retrieves the name of the accessory.
     * If the displayName property is set and not empty, it returns displayName.
     * Otherwise, it returns the name property.
     *
     * @returns {string} The name of the accessory.
     */
    getAccessoryName() {
        return this.accessory.displayName && this.accessory.displayName.length > 0 ? this.accessory.displayName : this.accessory.name;
    }

    /**
     * Retrieves an existing service or adds a new one to the accessory.
     * If the service does not exist, it will be created and added.
     * The service is also added to the list of services to keep.
     *
     * @param {Function} serviceType - The type of the service to retrieve or add.
     * @param {string} [serviceName=null] - The name of the service to add if it does not exist.
     * @returns {Service} The retrieved or newly added service.
     */
    getOrAddService(serviceType, serviceName = null) {
        const service = this.accessory.getService(serviceType) || this.accessory.addService(serviceType, serviceName);
        this.addServiceToKeep(service);
        return service;
    }

    /**
     * Adds a characteristic to a service if it doesn't already exist, and sets up handlers and properties.
     *
     * @param {Service} service - The service to which the characteristic belongs.
     * @param {Characteristic} characteristicType - The type of characteristic to get or add.
     * @param {Object} [options={}] - Optional parameters.
     * @param {Function} [options.preReqChk=null] - A function to check prerequisites before adding the characteristic.
     * @param {Function} [options.getHandler=null] - A function to handle getting the characteristic's value.
     * @param {Function} [options.setHandler=null] - A function to handle setting the characteristic's value.
     * @param {Object} [options.props={}] - Properties to set on the characteristic.
     * @param {boolean} [options.eventOnly=true] - Whether the characteristic is event-only.
     * @returns {Characteristic|null} The added or retrieved characteristic, or null if the prerequisite check fails.
     */
    getOrAddCharacteristic(service, characteristicType, options = {}) {
        const { preReqChk = null, getHandler = null, setHandler = null, props = {}, eventOnly = true } = options;

        if (preReqChk && !preReqChk(this.accessory)) {
            return null;
        }

        let characteristic = service.getCharacteristic(characteristicType) || service.addCharacteristic(characteristicType);

        if (Object.keys(props).length > 0) {
            characteristic.setProps(props);
        }

        if (!eventOnly) {
            characteristic.eventOnlyCharacteristic = false;
        }

        if (getHandler) {
            characteristic.onGet(getHandler.bind(this.accessory));
        }

        if (setHandler) {
            characteristic.onSet(setHandler.bind(this.accessory));
        }

        this.addCharacteristicToKeep(service, characteristic);

        return characteristic;
    }

    /**
     * Adds a service to the list of services to keep for the accessory.
     *
     * @param {object} service - The service object to add.
     * @param {string} service.UUID - The unique identifier for the service.
     * @param {string} [service.subtype] - The optional subtype of the service.
     */
    addServiceToKeep(service) {
        const serviceKey = `${service.UUID}:${service.subtype || ""}`;
        if (!this.accessory.servicesToKeep.includes(serviceKey)) {
            this.accessory.servicesToKeep.push(serviceKey);
        }
    }

    /**
     * Adds a characteristic to the list of characteristics to keep for a given service.
     *
     * @param {object} service - The service to which the characteristic belongs.
     * @param {object} characteristic - The characteristic to keep.
     */
    addCharacteristicToKeep(service, characteristic) {
        if (!this.accessory.characteristicsToKeep[service.UUID]) {
            this.accessory.characteristicsToKeep[service.UUID] = [];
        }
        if (!this.accessory.characteristicsToKeep[service.UUID].includes(characteristic.UUID)) {
            this.accessory.characteristicsToKeep[service.UUID].push(characteristic.UUID);
        }
    }

    /**
     * Removes unused services from the accessory.
     *
     * This method iterates over the services of the accessory and removes those
     * that are not in the `servicesToKeep` set. If a service is kept, it calls
     * `removeUnusedCharacteristics` on that service.
     *
     * @method
     */
    removeUnusedServices() {
        const servicesToKeep = new Set(this.accessory.servicesToKeep);
        this.accessory.services.forEach((service) => {
            const serviceKey = `${service.UUID}:${service.subtype || ""}`;
            if (!servicesToKeep.has(serviceKey)) {
                this.accessory.removeService(service);
                this.log.info(`Removing Unused Service: ${service.displayName ? service.displayName : service.UUID} from ${this.accessory.name}`);
            } else {
                this.removeUnusedCharacteristics(service);
            }
        });
    }

    /**
     * Removes unused characteristics from a given service.
     *
     * This method checks if the service UUID matches the AccessoryInformation UUID.
     * If it does, the method returns immediately. Otherwise, it iterates through
     * the characteristics of the service and removes any characteristic that is not
     * included in the `characteristicsToKeep` array for the given service UUID.
     *
     * @param {object} service - The service object from which unused characteristics will be removed.
     * @param {string} service.UUID - The UUID of the service.
     * @param {Array} service.characteristics - The array of characteristics associated with the service.
     * @param {function} service.removeCharacteristic - The function to remove a characteristic from the service.
     * @param {string} service.displayName - The display name of the service.
     *
     * @returns {void}
     */
    removeUnusedCharacteristics(service) {
        if (service.UUID === this.Service.AccessoryInformation.UUID) {
            return;
        }

        const characteristicsToKeep = this.accessory.characteristicsToKeep[service.UUID] || [];
        service.characteristics.forEach((characteristic) => {
            if (!characteristicsToKeep.includes(characteristic.UUID)) {
                service.removeCharacteristic(characteristic);
                this.log.info(`Removing Unused Characteristic: ${characteristic.displayName} from ${service.displayName} from ${this.accessory.name}`);
            }
        });
    }

    /**
     * Updates the value of a specified characteristic for a given service.
     *
     * @param {object} service - The service object containing the characteristic.
     * @param {object} characteristicType - The type of characteristic to update.
     * @param {*} value - The new value to set for the characteristic.
     */
    updateCharacteristicValue(service, characteristicType, value) {
        if (service && service.testCharacteristic(characteristicType)) {
            service.updateCharacteristic(characteristicType, value);
            this.log.debug(`${this.accessory.name} | Updated ${characteristicType.name}: ${value}`);
        } else {
            this.log.warn(`${this.accessory.name} | Failed to update ${characteristicType.name}: Service or Characteristic not found`);
        }
    }

    /**
     * Checks if the accessory has a specific capability.
     *
     * @param {string} cap - The capability to check for.
     * @returns {boolean} - Returns true if the capability is present, otherwise false.
     */
    hasCapability(cap) {
        const caps = Object.keys(this.accessory.context.deviceData.capabilities);
        return caps.includes(cap) || caps.includes(cap.replace(/\s/g, ""));
    }

    /**
     * Retrieves the capabilities of the accessory.
     *
     * @returns {string[]} An array of capability names.
     */
    getCapabilities() {
        return Object.keys(this.accessory.context.deviceData.capabilities);
    }

    /**
     * Checks if the accessory has a specific attribute.
     *
     * @param {string} attr - The name of the attribute to check.
     * @returns {boolean} True if the attribute exists, false otherwise.
     */
    hasAttribute(attr) {
        return this.accessory.context.deviceData.attributes.hasOwnProperty(attr);
    }

    /**
     * Checks if the accessory has a specific command.
     *
     * @param {string} cmd - The command to check for.
     * @returns {boolean} - Returns true if the command exists, otherwise false.
     */
    hasCommand(cmd) {
        return this.accessory.context.deviceData.commands.hasOwnProperty(cmd);
    }

    /**
     * Checks if the accessory has a specific service.
     *
     * @param {object} service - The service to check for.
     * @param {string} service.UUID - The UUID of the service to check.
     * @returns {boolean} - Returns true if the service is found, otherwise false.
     */
    hasService(service) {
        return this.accessory.services.map((s) => s.UUID).includes(service.UUID);
    }

    /**
     * Checks if the specified service has the given characteristic.
     *
     * @param {string} svc - The name of the service to check.
     * @param {string} char - The name of the characteristic to check for.
     * @returns {boolean} - Returns true if the characteristic exists, otherwise false.
     */
    hasCharacteristic(svc, char) {
        const service = this.accessory.getService(svc);
        return service ? service.getCharacteristic(char) !== undefined : false;
    }

    /**
     * Checks if the device has a specific flag.
     *
     * @param {string} flag - The flag to check for.
     * @returns {boolean} - Returns true if the device has the specified flag, otherwise false.
     */
    hasDeviceFlag(flag) {
        return this.accessory.context.deviceData.deviceflags?.hasOwnProperty(flag) || false;
    }

    /**
     * Retrieves or adds a button service to the accessory based on the provided service type, display name, and subtype.
     *
     * @param {object} serviceType - The type of the service to retrieve or add.
     * @param {string} displayName - The display name of the service.
     * @param {string} subType - The subtype of the service.
     * @returns {object} The retrieved or newly added service.
     */
    getButtonSvcByName(serviceType, displayName, subType) {
        this.log.debug(`${this.accessory.name} | Getting or adding button service: ${displayName} (subType: ${subType})`);

        let svc = this.accessory.services.find((s) => s.UUID === serviceType.UUID && s.subtype === subType);

        if (!svc) {
            const oldServiceName = `${this.accessory.context.deviceData.deviceid}_${subType}`;
            svc = this.accessory.services.find((s) => s.displayName === oldServiceName);

            if (svc) {
                this.log.debug(`${this.accessory.name} | Found existing service with old naming scheme: ${oldServiceName}. Updating to new naming.`);
                svc.displayName = displayName;
                svc.subtype = subType;
            }
        }

        if (!svc) {
            this.log.debug(`${this.accessory.name} | Adding new service for: ${displayName} (subType: ${subType})`);
            svc = new serviceType(displayName, subType);
            this.accessory.addService(svc);
        } else {
            this.log.debug(`${this.accessory.name} | Reusing existing service for: ${displayName} (subType: ${subType})`);
        }

        this.addServiceToKeep(svc);

        return svc;
    }

    /**
     * Sends a command to the device with optional debouncing.
     *
     * @param {Function} callback - The callback function to be executed after the command is sent.
     * @param {Object} devData - The device data required for the command.
     * @param {string} cmd - The command to be sent to the device.
     * @param {Array} vals - The values associated with the command.
     *
     * The function supports debouncing for specific commands to prevent rapid consecutive executions.
     * The debouncing configuration includes a delay and a trailing option for each command.
     * If the command is debounced, it will be executed after the specified delay.
     * If the trailing option is false, the command will be executed immediately as well.
     * If the command is not debounced, it will be executed immediately.
     */
    sendCommand(callback, devData, cmd, vals) {
        const id = `${cmd}`;

        const debounceConfig = {
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

        if (debounceConfig[cmd]) {
            const { delay, trailing } = debounceConfig[cmd];

            if (this.accessory.commandTimers[id]) {
                clearTimeout(this.accessory.commandTimers[id]);
                this.accessory.commandTimers[id] = null;
            }

            this.accessory.commandTimers[id] = setTimeout(() => {
                this.accessory.commandTimersTS[id] = Date.now();
                this.platform.appEvts.emit("event:device_command", devData, cmd, vals);
            }, delay);

            if (!trailing) {
                this.platform.appEvts.emit("event:device_command", devData, cmd, vals);
            }
        } else {
            this.platform.appEvts.emit("event:device_command", devData, cmd, vals);
        }

        if (callback) callback();
    }

    /**
     * Clamps a value between a minimum and maximum value.
     *
     * @param {number} value - The value to be clamped.
     * @param {number} min - The minimum value to clamp to.
     * @param {number} max - The maximum value to clamp to.
     * @returns {number} - The clamped value.
     */
    clamp(value, min, max) {
        return Math.max(min, Math.min(max, value));
    }

    /**
     * Clears the existing timeout referenced by `timeoutReference` and sets a new timeout.
     *
     * @param {NodeJS.Timeout | undefined} timeoutReference - The reference to the existing timeout to be cleared.
     * @param {Function} fn - The function to be executed after the timeout.
     * @param {number} timeoutMs - The number of milliseconds to wait before executing the function.
     * @returns {NodeJS.Timeout} The new timeout reference.
     */
    clearAndSetTimeout(timeoutReference, fn, timeoutMs) {
        if (timeoutReference) clearTimeout(timeoutReference);
        return setTimeout(fn, timeoutMs);
    }

    /**
     * Converts a string to title case.
     *
     * @param {string} str - The string to be converted.
     * @returns {string} The converted string in title case.
     */
    toTitleCase(str) {
        return str.replace(/\w\S*/g, (txt) => txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase());
    }
}
