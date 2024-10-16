// HubitatAccessory.js

export default class HubitatAccessory {
    constructor(platform, accessory, deviceData) {
        this.platform = platform;
        this.accessory = accessory;
        this.deviceData = deviceData;

        this.Service = platform.Service;
        this.Characteristic = platform.Characteristic;
        this.Categories = platform.Categories;
        this.uuid = platform.uuid;
        this.log = platform.log;
        this.homebridge = platform.homebridge;

        this.config = platform.configItems;

        // Initialize common properties
        this.accessory.context.deviceData = deviceData;
        this.accessory.deviceid = deviceData.deviceid;
        this.accessory.name = deviceData.name;

        // Initialize button map and command timers
        this.accessory._buttonMap = {};
        this.accessory.commandTimers = {};
        this.accessory.commandTimersTS = {};

        // Initialize services and characteristics to keep
        this.accessory.servicesToKeep = [];
        this.accessory.characteristicsToKeep = {};

        // Setup AccessoryInformation service
        this.setupAccessoryInformation();

        // Sanitize accessory name
        this.sanitizeName();

        // Add to cache
        this.platform.deviceManager.addAccessoryToCache(this.accessory);
    }

    sanitizeName() {
        const originalName = this.deviceData.name;
        let sanitized = originalName
            .replace(/[^a-zA-Z0-9 ']/g, "")
            .trim()
            .replace(/^[^a-zA-Z0-9]+/, "")
            .replace(/[^a-zA-Z0-9]+$/, "")
            .replace(/\s{2,}/g, " ");

        sanitized = sanitized.length === 0 ? "Unnamed Device" : sanitized;

        if (originalName !== sanitized) {
            this.log.warn(`Sanitized Name: "${originalName}" => "${sanitized}"`);
            this.accessory.name = sanitized;

            const accessoryInformation = this.accessory.getService(this.Service.AccessoryInformation);
            if (accessoryInformation) {
                accessoryInformation.getCharacteristic(this.Characteristic.Name).updateValue(sanitized);

                const displayName = accessoryInformation.getCharacteristic(this.Characteristic.Name).value;
                if (displayName !== sanitized) {
                    this.log.warn(`Failed to update displayName for device ID: ${this.deviceData.deviceid}`);
                } else {
                    this.log.info(`AccessoryInformation service updated successfully for device ID: ${this.deviceData.deviceid} | Old Name: "${originalName}" | Display Name: "${displayName}"`);
                    this.homebridge.updatePlatformAccessories([this.accessory]);
                }
            } else {
                this.log.warn(`AccessoryInformation service not found for device ID: ${this.deviceData.deviceid}`);
            }
        }
    }

    setupAccessoryInformation() {
        const accInfoSvc = this.accessory.getService(this.Service.AccessoryInformation) || this.accessory.addService(this.Service.AccessoryInformation);

        accInfoSvc
            .setCharacteristic(this.Characteristic.FirmwareRevision, this.deviceData.firmwareVersion)
            .setCharacteristic(this.Characteristic.Manufacturer, this.deviceData.manufacturerName)
            .setCharacteristic(this.Characteristic.Model, this.deviceData.modelName ? this.toTitleCase(this.deviceData.modelName) : "Unknown")
            .setCharacteristic(this.Characteristic.Name, this.accessory.name)
            .setCharacteristic(this.Characteristic.HardwareRevision, this.platform.pluginVersion)
            .setCharacteristic(this.Characteristic.SerialNumber, `he_deviceid_${this.deviceData.deviceid}`);

        // Handle Identify event
        if (!accInfoSvc.listeners("identify").length) {
            accInfoSvc.on("identify", (paired, callback) => {
                this.log.info(`${this.accessory.name} - identify`);
                callback();
            });
        }

        // Mark AccessoryInformation service to keep
        this.addServiceToKeep(accInfoSvc);
    }

    getOrAddService(serviceType, serviceName = null) {
        const service = this.accessory.getService(serviceType) || this.accessory.addService(serviceType, serviceName);
        this.addServiceToKeep(service);
        return service;
    }

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

    addServiceToKeep(service) {
        const serviceKey = `${service.UUID}:${service.subtype || ""}`;
        if (!this.accessory.servicesToKeep.includes(serviceKey)) {
            this.accessory.servicesToKeep.push(serviceKey);
        }
    }

    addCharacteristicToKeep(service, characteristic) {
        if (!this.accessory.characteristicsToKeep[service.UUID]) {
            this.accessory.characteristicsToKeep[service.UUID] = [];
        }
        if (!this.accessory.characteristicsToKeep[service.UUID].includes(characteristic.UUID)) {
            this.accessory.characteristicsToKeep[service.UUID].push(characteristic.UUID);
        }
    }

    removeUnusedServices() {
        const servicesToKeep = new Set(this.accessory.servicesToKeep);
        this.accessory.services.forEach((service) => {
            const serviceKey = `${service.UUID}:${service.subtype || ""}`;
            if (!servicesToKeep.has(serviceKey)) {
                this.accessory.removeService(service);
                this.log.info(`Removing Unused Service: ${service.displayName ? service.displayName : service.UUID} from ${this.accessory.displayName}`);
            } else {
                this.removeUnusedCharacteristics(service);
            }
        });
    }

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

    updateCharacteristicValue(service, characteristicType, value) {
        if (service && service.testCharacteristic(characteristicType)) {
            service.updateCharacteristic(characteristicType, value);
            this.log.debug(`${this.accessory.name} | Updated ${characteristicType.name}: ${value}`);
        } else {
            this.log.warn(`${this.accessory.name} | Failed to update ${characteristicType.name}: Service or Characteristic not found`);
        }
    }

    hasCapability(cap) {
        const caps = Object.keys(this.deviceData.capabilities);
        return caps.includes(cap) || caps.includes(cap.replace(/\s/g, ""));
    }

    getCapabilities() {
        return Object.keys(this.deviceData.capabilities);
    }

    hasAttribute(attr) {
        return this.deviceData.attributes.hasOwnProperty(attr);
    }

    hasCommand(cmd) {
        return this.deviceData.commands.hasOwnProperty(cmd);
    }

    hasService(service) {
        return this.accessory.services.map((s) => s.UUID).includes(service.UUID);
    }

    hasCharacteristic(svc, char) {
        const service = this.accessory.getService(svc);
        return service ? service.getCharacteristic(char) !== undefined : false;
    }

    hasDeviceFlag(flag) {
        return this.deviceData.deviceflags?.hasOwnProperty(flag) || false;
    }

    getButtonSvcByName(serviceType, displayName, subType) {
        this.log.debug(`${this.accessory.name} | Getting or adding button service: ${displayName} (subType: ${subType})`);

        let svc = this.accessory.services.find((s) => s.UUID === serviceType.UUID && s.subtype === subType);

        if (!svc) {
            const oldServiceName = `${this.deviceData.deviceid}_${subType}`;
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

    sendCommand(callback, dev, cmd, vals) {
        const id = `${cmd}`;
        const tsNow = Date.now();

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
                this.accessory.commandTimers[id].cancel();
                this.accessory.commandTimers[id] = null;
            }

            this.accessory.commandTimers[id] = _.debounce(
                () => {
                    this.accessory.commandTimersTS[id] = Date.now();
                    this.platform.appEvts.emit("event:device_command", dev, cmd, vals);
                },
                delay,
                { trailing },
            );

            this.accessory.commandTimers[id]();
        } else {
            this.platform.appEvts.emit("event:device_command", dev, cmd, vals);
        }

        if (callback) callback();
    }

    clamp(value, min, max) {
        return Math.max(min, Math.min(max, value));
    }

    clearAndSetTimeout(timeoutReference, fn, timeoutMs) {
        if (timeoutReference) clearTimeout(timeoutReference);
        return setTimeout(fn, timeoutMs);
    }

    toTitleCase(str) {
        return str.replace(/\w\S*/g, (txt) => txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase());
    }
}
