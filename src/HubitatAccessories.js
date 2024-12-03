// HubitatAccessories.js

import { platformName, pluginName, pluginVersion } from "./StaticConst.js";

import { AccelerationSensor } from "./devices/AccelerationSensor.js";
import { AirPurifier } from "./devices/AirPurifier.js";
import { AirQuality } from "./devices/AirQuality.js";
import { AlarmSystem } from "./devices/AlarmSystem.js";
import { Battery } from "./devices/Battery.js";
import { Button } from "./devices/Button.js";
import { CarbonDioxide } from "./devices/CarbonDioxide.js";
import { CarbonMonoxide } from "./devices/CarbonMonoxide.js";
import { ContactSensor } from "./devices/ContactSensor.js";
import { EnergyMeter } from "./devices/EnergyMeter.js";
import { Fan } from "./devices/Fan.js";
import { FilterMaintenance } from "./devices/FilterMaintenance.js";
import { GarageDoor } from "./devices/GarageDoor.js";
import { Humidifier } from "./devices/Humidifier.js";
import { HumiditySensor } from "./devices/HumiditySensor.js";
import { IlluminanceSensor } from "./devices/IlluminanceSensor.js";
import { LeakSensor } from "./devices/LeakSensor.js";
import { Light } from "./devices/Light.js";
import { Lock } from "./devices/Lock.js";
import { MotionSensor } from "./devices/MotionSensor.js";
import { Outlet } from "./devices/Outlet.js";
import { PowerMeter } from "./devices/PowerMeter.js";
import { PresenceSensor } from "./devices/PresenceSensor.js";
import { SmokeDetector } from "./devices/SmokeDetector.js";
import { Speaker } from "./devices/Speaker.js";
import { Switch } from "./devices/Switch.js";
import { TemperatureSensor } from "./devices/TemperatureSensor.js";
import { Thermostat } from "./devices/Thermostat.js";
import { Valve } from "./devices/Valve.js";
import { VirtualMode } from "./devices/VirtualMode.js";
import { VirtualPiston } from "./devices/VirtualPiston.js";
import { WindowCovering } from "./devices/WindowCovering.js";

export default class HubitatAccessories {
    constructor(platform) {
        this.platformName = platformName;

        this.sanitizeName = platform.sanitizeName;
        this.toTitleCase = platform.toTitleCase;
        this.Service = platform.Service;
        this.Characteristic = platform.Characteristic;
        this.CommunityTypes = platform.CommunityTypes;

        this.logManager = platform.logManager;
        this.stateManager = platform.stateManager;
        this.configManager = platform.configManager;
        this.client = platform.client;
        this.api = platform.api;
        this.config = platform.config;

        // Initialize accessory cache and utilities
        this._cachedAccessories = new Map();

        this._buttonMap = {};
        this._commandTimers = new Map();
        this._lastCommandTimes = new Map();

        this.deviceTypeTests = this.initializeDeviceTests();

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

        // Initialize device handlers
        this.deviceHandlers = {
            accelerationSensor: new AccelerationSensor(platform),
            airPurifier: new AirPurifier(platform),
            airQuality: new AirQuality(platform),
            alarmSystem: new AlarmSystem(platform),
            button: new Button(platform),
            carbonDioxide: new CarbonDioxide(platform),
            carbonMonoxide: new CarbonMonoxide(platform),
            battery: new Battery(platform),
            contactSensor: new ContactSensor(platform),
            energyMeter: new EnergyMeter(platform),
            fan: new Fan(platform),
            filterMaintenance: new FilterMaintenance(platform),
            garageDoor: new GarageDoor(platform),
            humidifier: new Humidifier(platform),
            humiditySensor: new HumiditySensor(platform),
            illuminanceSensor: new IlluminanceSensor(platform),
            leakSensor: new LeakSensor(platform),
            light: new Light(platform),
            lock: new Lock(platform),
            motionSensor: new MotionSensor(platform),
            outlet: new Outlet(platform),
            powerMeter: new PowerMeter(platform),
            presenceSensor: new PresenceSensor(platform),
            smokeDetector: new SmokeDetector(platform),
            speaker: new Speaker(platform),
            switch: new Switch(platform),
            temperatureSensor: new TemperatureSensor(platform),
            thermostat: new Thermostat(platform),
            valve: new Valve(platform),
            virtualMode: new VirtualMode(platform),
            virtualPiston: new VirtualPiston(platform),
            windowCovering: new WindowCovering(platform),
        };

        // Initialize device data
        this.deviceData = [];
    }

    initializeDeviceTests() {
        return [
            {
                name: "windowCovering",
                test: (accessory) => accessory.hasCapability("WindowShade"),
            },
            {
                name: "light",
                test: (accessory) => accessory.hasCapability("Switch") && (accessory.hasCapability("LightBulb") || accessory.hasCapability("Bulb") || accessory.hasLightLabel() || ["saturation", "hue", "colorTemperature"].some((attr) => accessory.hasAttribute(attr)) || accessory.hasCapability("ColorControl")),
            },
            {
                name: "airPurifier",
                test: (accessory) => accessory.hasCapability("custom.airPurifierOperationMode"),
                disable: true,
            },
            {
                name: "garageDoor",
                test: (accessory) => accessory.hasCapability("GarageDoorControl"),
            },
            {
                name: "lock",
                test: (accessory) => accessory.hasCapability("Lock"),
            },
            {
                name: "valve",
                test: (accessory) => accessory.hasCapability("Valve"),
            },
            {
                name: "speaker",
                test: (accessory) => accessory.hasCapability("Speaker"),
            },
            {
                name: "filterMaintenance",
                test: (accessory) => accessory.hasCapability("FilterStatus") && accessory.hasAttribute("filterStatus"),
            },
            {
                name: "fan",
                test: (accessory) =>
                    (["Fan", "FanControl"].some((cap) => accessory.hasCapability(cap)) && ((accessory.hasCommand("setSpeed") && accessory.hasAttribute("speed")) || (accessory.hasAttribute("level") && accessory.hasCommand("setLevel")))) ||
                    (accessory.hasFanLabel() && accessory.hasCapability("Switch") && (accessory.hasAttribute("switch") || accessory.hasAttribute("level"))),
            },
            {
                name: "virtualMode",
                test: (accessory) => accessory.hasCapability("Mode"),
            },
            {
                name: "virtualPiston",
                test: (accessory) => accessory.hasCapability("Piston"),
            },
            {
                name: "button",
                test: (accessory) => ["Button", "DoubleTapableButton", "HoldableButton", "PushableButton"].some((cap) => accessory.hasCapability(cap)),
            },
            {
                name: "outlet",
                test: (accessory) => accessory.hasCapability("Outlet") && accessory.hasCapability("Switch"),
                excludeCapabilities: ["LightBulb", "Bulb", "Button", "Fan", "FanControl"],
            },
            {
                name: "switch",
                test: (accessory) => accessory.hasCapability("Switch") && !accessory.hasLightLabel(),
                excludeCapabilities: ["WindowShade", "DoorControl", "GarageDoorControl", "Fan", "FanControl", "LightBulb", "Bulb", "Outlet", "Button"],
                excludeAttributes: ["position", "level", "windowShade"],
            },
            {
                name: "smokeDetector",
                test: (accessory) => accessory.hasCapability("SmokeDetector") && accessory.hasAttribute("smoke"),
            },
            {
                name: "carbonMonoxide",
                test: (accessory) => accessory.hasCapability("CarbonMonoxideDetector") && accessory.hasAttribute("carbonMonoxide"),
            },
            {
                name: "carbonDioxide",
                test: (accessory) => accessory.hasCapability("CarbonDioxideMeasurement") && accessory.hasAttribute("carbonDioxide"),
            },
            {
                name: "motionSensor",
                test: (accessory) => accessory.hasCapability("MotionSensor"),
            },
            {
                name: "accelerationSensor",
                test: (accessory) => accessory.hasCapability("AccelerationSensor"),
            },
            {
                name: "leakSensor",
                test: (accessory) => accessory.hasCapability("WaterSensor"),
            },
            {
                name: "presenceSensor",
                test: (accessory) => accessory.hasCapability("PresenceSensor"),
            },
            {
                name: "humiditySensor",
                test: (accessory) => accessory.hasCapability("RelativeHumidityMeasurement") && accessory.hasAttribute("humidity") && !["Thermostat", "ThermostatOperatingState"].some((cap) => accessory.hasCapability(cap)) && !accessory.hasAttribute("thermostatOperatingState"),
            },
            {
                name: "temperatureSensor",
                test: (accessory) => accessory.hasCapability("TemperatureMeasurement") && !["Thermostat", "ThermostatOperatingState"].some((cap) => accessory.hasCapability(cap)) && !accessory.hasAttribute("thermostatOperatingState"),
            },
            {
                name: "illuminanceSensor",
                test: (accessory) => accessory.hasCapability("IlluminanceMeasurement"),
            },
            {
                name: "contactSensor",
                test: (accessory) => accessory.hasCapability("ContactSensor") && !accessory.hasCapability("GarageDoorControl"),
            },
            {
                name: "airQuality",
                test: (accessory) => accessory.hasCapability("airQuality") || accessory.hasCapability("AirQuality"),
            },
            {
                name: "battery",
                test: (accessory) => accessory.hasCapability("Battery"),
            },
            {
                name: "energyMeter",
                test: (accessory) => accessory.hasCapability("EnergyMeter"),
                disable: true,
            },
            {
                name: "powerMeter",
                test: (accessory) => accessory.hasCapability("PowerMeter"),
                disable: true,
            },
            {
                name: "thermostat",
                test: (accessory) => accessory.hasCapability("Thermostat") || accessory.hasCapability("ThermostatOperatingState") || accessory.hasAttribute("thermostatOperatingState"),
            },
            {
                name: "alarmSystem",
                test: (accessory) => accessory.hasAttribute("alarmSystemStatus"),
            },
        ].sort((a, b) => {
            if (a.onlyOnNoGrps && !b.onlyOnNoGrps) return 1;
            if (!a.onlyOnNoGrps && b.onlyOnNoGrps) return -1;
            return 0;
        });
    }

    /**
     * Determine the device types for an accessory based on its capabilities
     * @param {PlatformAccessory} accessory
     * @returns {Array} - Array of device types with their services
     */
    determineDeviceTypes(accessory) {
        // Create a cache key from capabilities, attributes, commands and name
        const cacheKey = JSON.stringify({
            capabilities: accessory.context.deviceData.capabilities,
            attributes: accessory.context.deviceData.attributes,
            commands: accessory.context.deviceData.commands,
            name: accessory.context.deviceData.name,
            config: {
                consider_light_by_name: this.config.devices.consider_light_by_name,
                consider_fan_by_name: this.config.devices.consider_fan_by_name,
            },
        });

        // Check if we have cached results for this configuration
        if (accessory.context._deviceTypesCache?.key === cacheKey) {
            return accessory.context._deviceTypesCache.types;
        }

        // Create device wrapper with memoized functions
        const capabilitiesSet = new Set(Object.keys(accessory.context.deviceData.capabilities || {}));
        const attributesSet = new Set(Object.keys(accessory.context.deviceData.attributes || {}));
        const commandsSet = new Set(Object.keys(accessory.context.deviceData.commands || {}));
        const nameLower = accessory.context.deviceData.name.toLowerCase();

        const deviceWrapper = {
            hasCapability: (capability) => capabilitiesSet.has(capability),
            hasAttribute: (attribute) => attributesSet.has(attribute),
            hasCommand: (command) => commandsSet.has(command),
            hasLightLabel: () => this.config.devices.consider_light_by_name && nameLower.includes("light"),
            hasFanLabel: () => this.config.devices.consider_fan_by_name && nameLower.includes("fan"),
            context: accessory.context,
        };

        const matchedTypes = [];
        const matchedSet = new Set();

        for (const deviceTest of this.deviceTypeTests) {
            if (deviceTest.disable) continue;

            const hasExcludedCapability = deviceTest.excludeCapabilities?.some((cap) => capabilitiesSet.has(cap));
            const hasExcludedAttribute = deviceTest.excludeAttributes?.some((attr) => attributesSet.has(attr));

            if (hasExcludedCapability || hasExcludedAttribute) {
                this.logManager.logDebug(`${accessory.displayName} excluded from ${deviceTest.name} due to ` + `${hasExcludedCapability ? "capabilities" : "attributes"}`);
                continue;
            }

            if (deviceTest.test(deviceWrapper)) {
                if (deviceTest.excludeDevTypes?.some((type) => matchedSet.has(type))) {
                    continue;
                }
                matchedTypes.push({ name: deviceTest.name });
                matchedSet.add(deviceTest.name);
            }
        }

        if (matchedTypes.length === 0) {
            this.logManager.logWarn(`No device types matched for ${accessory.displayName}`);
        }

        // Cache the results
        accessory.context._deviceTypesCache = {
            key: cacheKey,
            types: matchedTypes,
        };

        return matchedTypes;
    }

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
                this.removeAccessory(accessory);
            }

            // Process updates
            for (const device of toUpdate) {
                await this.updateAccessory(device);
            }

            // Process additions
            for (const device of toCreate) {
                await this.addAccessory(device);
            }

            // Log statistics
            // this.logDeviceStatistics();
            this.logManager.logInfo(`Device Cache Size: (${this._cachedAccessories.size})`);

            return true;
        } catch (error) {
            this.logManager.logError("Error processing Hubitat devices:", error);
            return false;
        }
    }

    // Add accessory
    async addAccessory(device) {
        try {
            let accessory = new this.api.platformAccessory(device.name, this.api.hap.uuid.generate(device.deviceid.toString()));
            accessory.context.deviceData = device;
            accessory.context.lastUpdate = new Date().toLocaleString();
            accessory.context.uuid = accessory.UUID;

            // Bind accessory methods
            this.bindAccessoryMethods(accessory);

            // Configure Accessory Information Service
            this.configureAccessoryInformation(accessory);

            // Determine device types
            const svcTypes = this.determineDeviceTypes(accessory);
            accessory.context.deviceTypes = svcTypes.map((type) => type.name);

            // Assign services and characteristics
            for (const svc of svcTypes) {
                if (svc.name) {
                    this.logManager.logDebug(`${accessory.displayName} | Adding service: ${svc.name}`);
                    this.deviceHandlers[svc.name].configure(accessory);
                } else {
                    this.logManager.logWarn(`${accessory.displayName} | No service found for ${svc.name}`);
                }
            }

            // Set the primary service
            this.setPrimaryService(accessory);

            // Add accessory to cache and platform
            this.addAccessoryToCache(accessory);
            this.api.registerPlatformAccessories(pluginName, platformName, [accessory]);

            return accessory;
        } catch (error) {
            this.logManager.logError(`Error adding accessory ${device.name}:`, error);
            throw error;
        }
    }

    configureAccessory(accessory) {
        this.logManager.logDebug(`Configuring cached accessory: ${accessory.displayName}`);

        const deviceId = accessory.context.deviceData?.deviceid;
        if (deviceId) {
            this._cachedAccessories.set(deviceId, accessory);
        } else {
            this.logManager.logWarn(`Accessory ${accessory.displayName} is missing deviceData.deviceid`);
        }
    }

    // Update accessory
    async updateAccessory(device) {
        try {
            let accessory = this._cachedAccessories.get(device.deviceid);
            if (!accessory) return;

            // Clear the device types cache since it may be stale
            delete accessory.context._deviceTypesCache;

            // Reset active services tracking
            accessory.activeServices = new Set();

            // Update device data
            accessory.context.deviceData = device;
            accessory.context.lastUpdate = new Date().toLocaleString();

            // Bind accessory methods
            this.bindAccessoryMethods(accessory);

            // Update Accessory Information Service
            this.configureAccessoryInformation(accessory);

            // Determine device types
            const svcTypes = this.determineDeviceTypes(accessory);
            accessory.context.deviceTypes = svcTypes.map((type) => type.name);

            // Reconfigure services and characteristics
            for (const svc of svcTypes) {
                if (svc.name) {
                    // this.logManager.logGreen(`${accessory.displayName} | Updating service: ${svc.name}`);
                    if (this.deviceHandlers[svc.name]) {
                        this.deviceHandlers[svc.name].configure(accessory);
                    } else {
                        this.logManager.logWarn(`${accessory.displayName} | No handler found for ${svc.name}`);
                    }
                }
            }

            // Clean up unused services
            this.cleanupUnusedServices(accessory);

            // Set the primary service
            this.setPrimaryService(accessory);

            this.api.updatePlatformAccessories([accessory]);

            // Add accessory to cache
            this.addAccessoryToCache(accessory);

            return accessory;
        } catch (error) {
            this.logManager.logError(`Error updating accessory ${device.name}:`, error);
            throw error;
        }
    }

    // Remove accessory
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
     * Configure Accessory Information Service
     * @param {PlatformAccessory} accessory
     */
    configureAccessoryInformation(accessory) {
        accessory.displayName = this.sanitizeName(accessory.displayName);
        const infoService = accessory.getOrAddService(this.Service.AccessoryInformation);
        const devData = accessory.context.deviceData;

        infoService
            .setCharacteristic(this.Characteristic.FirmwareRevision, devData.firmwareVersion)
            .setCharacteristic(this.Characteristic.Manufacturer, devData.manufacturerName)
            .setCharacteristic(this.Characteristic.Model, devData.modelName ? `${this.toTitleCase(devData.modelName)}` : "Unknown")
            .setCharacteristic(this.Characteristic.Name, this.sanitizeName(devData.name))
            .setCharacteristic(this.Characteristic.SerialNumber, "he_deviceid_" + devData.deviceid)
            .setCharacteristic(this.Characteristic.HardwareRevision, pluginVersion);

        // Handle Identify event
        const identifyChar = infoService.getCharacteristic(this.Characteristic.Identify);
        identifyChar.removeAllListeners("set");

        // Add new listener
        identifyChar.on("set", (value, callback) => {
            this.logManager.logDebug(`${accessory.displayName} identified with value: ${value}`);
            // Implement any custom identify behavior here
            callback(null);
        });
    }

    bindAccessoryMethods(accessory) {
        // Set of active services
        accessory.activeServices = new Set();

        accessory.hasAttribute = (attr) => {
            return accessory.context.deviceData && accessory.context.deviceData.attributes && Object.keys(accessory.context.deviceData.attributes).includes(attr);
        };

        accessory.hasCommand = (cmd) => {
            return accessory.context.deviceData && accessory.context.deviceData.commands && Object.keys(accessory.context.deviceData.commands).includes(cmd);
        };

        accessory.hasCapability = (cap) => {
            return accessory.context.deviceData && accessory.context.deviceData.capabilities && Object.keys(accessory.context.deviceData.capabilities).includes(cap);
        };

        accessory.hasDeviceFlag = (flag) => {
            return accessory.context.deviceData.customflags && Object.keys(accessory.context.deviceData.customflags).includes(flag);
        };

        accessory.hasLightLabel = () => this.config.devices.consider_light_by_name && accessory.context.deviceData.name.toLowerCase().includes("light");
        accessory.hasFanLabel = () => this.config.devices.consider_fan_by_name && accessory.context.deviceData.name.toLowerCase().includes("fan");

        accessory.hasCharacteristic = (service, characteristic) => {
            const existingService = accessory.getService(service);
            return existingService ? existingService.testCharacteristic(characteristic) : false;
        };

        // Command handling
        accessory.sendCommand = async (command, params = []) => {
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
                    return await this.client.sendHubitatCommand(accessory.context.deviceData, command, validParams);
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
                this.logManager.logError(`Error executing command ${command} for device ${accessory.context.deviceData.name}:`, error);
                throw error;
            }
        };

        // Service management
        accessory.getOrAddService = (service, name = undefined, subtype = undefined) => {
            // Sanitize name and subtype for compatibility
            if (name) {
                const oldName = name;
                name = name.replace(/[^a-zA-Z0-9 ]/g, "").trim();
                if (oldName !== name) {
                    this.logManager.logWarn(`Service name sanitized from "${oldName}" to "${name}"`);
                }
            }
            if (subtype) {
                const oldSubtype = subtype;
                subtype = subtype.replace(/[^a-zA-Z0-9]/g, "").trim();
                if (oldSubtype !== subtype) {
                    this.logManager.logWarn(`Service subtype sanitized from "${oldSubtype}" to "${subtype}"`);
                }
            }

            // Track this service as active
            const serviceId = subtype ? `${service.UUID} ${subtype}` : service.UUID;
            accessory.activeServices.add(serviceId);

            // Find existing service
            let existingService = subtype ? accessory.getServiceById(service, subtype) : accessory.getService(service);

            // If service exists but name needs updating
            if (existingService) {
                // Handle Name characteristic for existing service
                if (name) {
                    // Add or update Name characteristic if name is provided
                    if (!existingService.testCharacteristic(this.Characteristic.Name) || existingService.getCharacteristic(this.Characteristic.Name).value !== name) {
                        existingService.setCharacteristic(this.Characteristic.Name, name);
                    }
                } else {
                    // Remove Name characteristic if no name provided
                    if (existingService.testCharacteristic(this.Characteristic.Name)) {
                        existingService.removeCharacteristic(existingService.getCharacteristic(this.Characteristic.Name));
                    }
                }
                return existingService;
            }

            // Create new service
            let newService = subtype ? new service(name || accessory.displayName, subtype) : new service(name || accessory.displayName);

            // Set Name characteristic if provided
            if (name) {
                newService.setCharacteristic(this.Characteristic.Name, name);
            }

            accessory.addService(newService);
            return newService;
        };

        accessory.getOrAddCharacteristic = (service, characteristicType, options = {}) => {
            const { preReqChk = null, getHandler = null, setHandler = null, props = {}, eventOnly = false, value = null, removeIfMissingPreReq = false, storeAttribute = null } = options;

            if (preReqChk && !preReqChk()) {
                if (removeIfMissingPreReq) {
                    service.removeCharacteristic(characteristicType);
                }
                return null;
            }

            let characteristic = service.getCharacteristic(characteristicType) || service.addCharacteristic(characteristicType);

            if (Object.keys(props).length) {
                characteristic.setProps(props);
            }

            characteristic.eventOnlyCharacteristic = eventOnly;

            if (getHandler) {
                if (characteristic._events.get) {
                    characteristic.removeListener("get", characteristic._events.get);
                }
                characteristic.on("get", (callback) => {
                    callback(null, getHandler());
                });
            }

            if (setHandler) {
                if (characteristic._events.set) {
                    characteristic.removeListener("set", characteristic._events.set);
                }
                characteristic.on("set", (value, callback) => {
                    setHandler(value);
                    callback();
                });
            }

            if (value !== null) {
                characteristic.updateValue(value);
            }

            return characteristic;
        };

        // Service lookup
        accessory.getServiceById = (service, subtype) => {
            return accessory.services.find((s) => s instanceof service && s.subtype === subtype);
        };

        accessory.cleanServiceDisplayName = (name, type) => {
            return `${name} ${type}`.replace(/[^a-zA-Z0-9 ]/g, "").trim();
        };
    }

    cleanupUnusedServices(accessory) {
        // Always keep AccessoryInformation service
        const infoServiceUUID = this.Service.AccessoryInformation.UUID;

        // Get all current services except AccessoryInformation
        const currentServices = accessory.services.filter((service) => service.UUID !== infoServiceUUID);

        // Remove services that weren't used in this update
        for (const service of currentServices) {
            const serviceId = service.subtype ? `${service.UUID} ${service.subtype}` : service.UUID;

            if (!accessory.activeServices.has(serviceId)) {
                this.logManager.logWarn(`Removing unused service from ${accessory.displayName}: ` + `${service.constructor.name}${service.subtype ? ` (${service.subtype})` : ""}`);
                accessory.removeService(service);
            } else {
                // Service is active, clean up unused characteristics
                // const characteristics = service.characteristics.slice(); // Create a copy to avoid modification during iteration
                // for (const characteristic of characteristics) {
                //     // Skip mandatory characteristics
                //     if (service.constructor.MANDATORY_CHARACTERISTICS && service.constructor.MANDATORY_CHARACTERISTICS.includes(characteristic.constructor)) {
                //         continue;
                //     }
                //     // Skip Name characteristic if service has a name
                //     if (characteristic.constructor === this.Characteristic.Name && service.displayName !== accessory.displayName) {
                //         continue;
                //     }
                //     // Skip event-only characteristics
                //     if (characteristic.eventOnlyCharacteristic) {
                //         continue;
                //     }
                //     // Skip characteristics that have listeners
                //     if ((characteristic._events.get && characteristic._events.get.length > 0) || (characteristic._events.set && characteristic._events.set.length > 0)) {
                //         continue;
                //     }
                //     // Remove characteristic if it reaches this point
                //     this.logManager.logWarn(`Removing unused characteristic from ${accessory.displayName} ` + `${service.constructor.name}: ${characteristic.constructor.name}`);
                //     service.removeCharacteristic(characteristic);
                // }
            }
        }

        // Clean up the tracking Set
        delete accessory.activeServices;
    }

    // Process device attribute update
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

            // Handle attribute updates
            const deviceTypes = accessory.context.deviceTypes || [];
            for (const deviceType of deviceTypes) {
                const handler = this.deviceHandlers[deviceType];
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
     * Sets the primary service for accessories with multiple services based on priority rules
     * @param {PlatformAccessory} accessory - The accessory to configure primary service for
     */
    setPrimaryService(accessory) {
        // Get all services except AccessoryInformation
        const services = accessory.services.filter((service) => service.UUID !== this.Service.AccessoryInformation.UUID);

        // If there's only one service or no services, no need to set primary
        if (services.length <= 1) return;

        // Define service map with service classes and priorities
        const serviceMap = {
            [this.Service.SecuritySystem.UUID]: { service: this.Service.SecuritySystem, priority: 100 },
            [this.Service.Thermostat.UUID]: { service: this.Service.Thermostat, priority: 90 },
            [this.Service.LockMechanism.UUID]: { service: this.Service.LockMechanism, priority: 80 },
            [this.Service.GarageDoorOpener.UUID]: { service: this.Service.GarageDoorOpener, priority: 75 },
            [this.Service.Valve.UUID]: { service: this.Service.Valve, priority: 74 },
            [this.Service.Window.UUID]: { service: this.Service.Window, priority: 70 },
            [this.Service.WindowCovering.UUID]: { service: this.Service.WindowCovering, priority: 65 },
            [this.Service.Lightbulb.UUID]: { service: this.Service.Lightbulb, priority: 60 },
            [this.Service.Speaker.UUID]: { service: this.Service.Speaker, priority: 58 },
            [this.Service.Outlet.UUID]: { service: this.Service.Outlet, priority: 55 },
            [this.Service.Switch.UUID]: { service: this.Service.Switch, priority: 50 },
            [this.Service.Fanv2.UUID]: { service: this.Service.Fanv2, priority: 45 },
            [this.Service.StatelessProgrammableSwitch.UUID]: { service: this.Service.StatelessProgrammableSwitch, priority: 42 },
            [this.Service.MotionSensor.UUID]: { service: this.Service.MotionSensor, priority: 40 },
            [this.Service.ContactSensor.UUID]: { service: this.Service.ContactSensor, priority: 35 },
            [this.Service.OccupancySensor.UUID]: { service: this.Service.OccupancySensor, priority: 34 },
            [this.Service.TemperatureSensor.UUID]: { service: this.Service.TemperatureSensor, priority: 30 },
            [this.Service.HumiditySensor.UUID]: { service: this.Service.HumiditySensor, priority: 25 },
            [this.Service.LightSensor.UUID]: { service: this.Service.LightSensor, priority: 24 },
            [this.Service.LeakSensor.UUID]: { service: this.Service.LeakSensor, priority: 20 },
            [this.Service.AirQualitySensor.UUID]: { service: this.Service.AirQualitySensor, priority: 18 },
            [this.Service.CarbonMonoxideSensor.UUID]: { service: this.Service.CarbonMonoxideSensor, priority: 15 },
            [this.Service.CarbonDioxideSensor.UUID]: { service: this.Service.CarbonDioxideSensor, priority: 10 },
            [this.Service.Battery.UUID]: { service: this.Service.Battery, priority: 5 },
        };

        // Sort services by priority (highest first)
        const sortedServices = services.sort((a, b) => {
            const priorityA = serviceMap[a.UUID]?.priority || 0;
            const priorityB = serviceMap[b.UUID]?.priority || 0;
            return priorityB - priorityA;
        });

        // Set the highest priority service as primary
        const primaryService = sortedServices[0];
        const serviceDef = serviceMap[primaryService.UUID];

        if (serviceDef) {
            const service = accessory.getService(serviceDef.service);
            if (service) {
                service.setPrimaryService(true);
                this.logManager.logDebug(`Setting primary service for ${accessory.displayName}: ` + `${service.constructor.name} (Priority: ${serviceDef.priority})`);
            }
        }
    }

    logDeviceStatistics() {
        const deviceCount = this._cachedAccessories.size;
        const deviceTypes = new Map();
        const allDeviceTypes = new Set();

        // Iterate through cached accessories
        for (const accessory of this._cachedAccessories.values()) {
            // Use stored device types from context
            const types = accessory.context.deviceTypes || [];

            // Count each device type
            for (const typeName of types) {
                deviceTypes.set(typeName, (deviceTypes.get(typeName) || 0) + 1);
                allDeviceTypes.add(typeName);
            }
        }

        // Log the statistics
        // this.logManager.logTable("Device Statistics", {
        //     "Total Devices": deviceCount,
        //     "Device Types": Object.fromEntries(deviceTypes),
        // });

        this.logManager.logSuccess(`${deviceCount} devices loaded and cached.`);
    }

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

    getAccessoryId(device) {
        return `${this.platformName}.${device.deviceid}`;
    }

    getAccessory(deviceId) {
        return this._cachedAccessories.get(deviceId);
    }

    getServiceId(service) {
        return service.subtype ? `${service.UUID} ${service.subtype}` : service.UUID;
    }

    getAllAccessories() {
        return Array.from(this._cachedAccessories.values());
    }
}
