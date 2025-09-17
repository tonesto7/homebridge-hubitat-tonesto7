/**
 * @file AccessoryManager.js
 * @description Manages the configuration, initialization, and maintenance of HomeKit accessories
 * Handles device type detection, handler initialization, and accessory setup
 */

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

export class AccessoryManager {
    /**
     * @param {Object} platform - The Hubitat platform instance
     */
    constructor(platform) {
        this.platform = platform;
        this.logManager = platform.logManager;
        this.Service = platform.Service;
        this.Characteristic = platform.Characteristic;
        this.CommunityTypes = platform.CommunityTypes;
        this.config = platform.config;
        this.api = platform.api;

        // Command management handled by HubitatClient

        // Initialize device handlers and tests
        this.deviceHandlers = {
            accelerationSensor: new AccelerationSensor(this.platform),
            airPurifier: new AirPurifier(this.platform),
            airQuality: new AirQuality(this.platform),
            alarmSystem: new AlarmSystem(this.platform),
            button: new Button(this.platform),
            carbonDioxide: new CarbonDioxide(this.platform),
            carbonMonoxide: new CarbonMonoxide(this.platform),
            battery: new Battery(this.platform),
            contactSensor: new ContactSensor(this.platform),
            energyMeter: new EnergyMeter(this.platform),
            fan: new Fan(this.platform),
            filterMaintenance: new FilterMaintenance(this.platform),
            garageDoor: new GarageDoor(this.platform),
            humidifier: new Humidifier(this.platform),
            humiditySensor: new HumiditySensor(this.platform),
            illuminanceSensor: new IlluminanceSensor(this.platform),
            leakSensor: new LeakSensor(this.platform),
            light: new Light(this.platform),
            lock: new Lock(this.platform),
            motionSensor: new MotionSensor(this.platform),
            outlet: new Outlet(this.platform),
            powerMeter: new PowerMeter(this.platform),
            presenceSensor: new PresenceSensor(this.platform),
            smokeDetector: new SmokeDetector(this.platform),
            speaker: new Speaker(this.platform),
            switch: new Switch(this.platform),
            temperatureSensor: new TemperatureSensor(this.platform),
            thermostat: new Thermostat(this.platform),
            valve: new Valve(this.platform),
            virtualMode: new VirtualMode(this.platform),
            virtualPiston: new VirtualPiston(this.platform),
            windowCovering: new WindowCovering(this.platform),
        };
        this.deviceTypeTests = this.initializeDeviceTests();
    }

    /**
     * Initialize device type detection tests
     * @returns {Array} Array of device type test configurations
     */
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
                    // Complex fan control
                    (["Fan", "FanControl"].some((cap) => accessory.hasCapability(cap)) && this.deviceHandlers.fan.hasSpeedControl(accessory)) || (accessory.hasFanLabel() && accessory.hasCapability("Switch")),
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
                excludeCapabilities: ["WindowShade", "DoorControl", "GarageDoorControl", "Fan", "FanControl", "LightBulb", "Bulb", "Outlet", "Button", "Valve"],
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
     * Configure an accessory with all necessary services and characteristics
     * @param {PlatformAccessory} accessory - The accessory to configure
     * @returns {PlatformAccessory} The configured accessory
     */
    async configureAccessory(accessory) {
        try {
            // Bind core methods and configure info
            this.bindAccessoryMethods(accessory);
            this.configureAccessoryInformation(accessory);

            // Determine device types if not already set
            if (!accessory.context.deviceTypes) {
                const deviceTypes = this.determineDeviceTypes(accessory);
                accessory.context.deviceTypes = deviceTypes.map((type) => type.name);
            }

            // Configure each device type
            for (const deviceType of accessory.context.deviceTypes) {
                const handler = this.deviceHandlers[deviceType];
                if (handler) {
                    await handler.configure(accessory);
                } else {
                    this.logManager.logWarn(`No handler found for device type: ${deviceType}`);
                }
            }

            // Clean up unused services and set primary
            this.cleanupUnusedServices(accessory);
            this.setPrimaryService(accessory);

            return accessory;
        } catch (error) {
            this.logManager.logError(`Error configuring accessory ${accessory.displayName}:`, error);
            throw error;
        }
    }

    /**
     * Bind utility methods to the accessory instance
     * @param {PlatformAccessory} accessory - The accessory to bind methods to
     */
    bindAccessoryMethods(accessory) {
        // Set of active services
        accessory.activeServices = new Set();

        // Core capability checks
        accessory.hasAttribute = (attr) => {
            return accessory.context.deviceData?.attributes && Object.keys(accessory.context.deviceData.attributes).includes(attr);
        };

        accessory.hasCommand = (cmd) => {
            return accessory.context.deviceData?.commands && Object.keys(accessory.context.deviceData.commands).includes(cmd);
        };

        accessory.hasCapability = (cap) => {
            return accessory.context.deviceData?.capabilities && Object.keys(accessory.context.deviceData.capabilities).includes(cap);
        };

        accessory.hasDeviceFlag = (flag) => {
            return accessory.context.deviceData?.customflags && Object.keys(accessory.context.deviceData.customflags).includes(flag);
        };

        // Label checks
        accessory.hasLightLabel = () => this.config.devices.consider_light_by_name && accessory.context.deviceData.name.toLowerCase().includes("light");

        accessory.hasFanLabel = () => this.config.devices.consider_fan_by_name && accessory.context.deviceData.name.toLowerCase().includes("fan");

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
                if (name) {
                    if (!existingService.testCharacteristic(this.Characteristic.Name) || existingService.getCharacteristic(this.Characteristic.Name).value !== name) {
                        existingService.setCharacteristic(this.Characteristic.Name, name);
                    }
                } else {
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

        // Characteristic management
        accessory.getOrAddCharacteristic = (service, characteristicType, options = {}) => {
            const { preReqChk = null, getHandler = null, setHandler = null, props = {}, eventOnly = false, value = null, removeIfMissingPreReq = false } = options;

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

        // Command handling - delegate to HubitatClient batching
        accessory.sendCommand = async (command, params = []) => {
            try {
                // Ensure params is an array and filter out null/undefined
                const validParams = Array.isArray(params) ? params.filter((p) => p !== null) : [params].filter((p) => p !== null);

                // Send command through HubitatClient's batching system
                return await this.platform.client.sendHubitatCommand(accessory.context.deviceData, command, validParams);
            } catch (error) {
                this.logManager.logError(`Error executing command ${command} for device ${accessory.context.deviceData.name}:`, error);
                throw error;
            }
        };

        accessory.getServiceById = (service, subtype) => {
            return accessory.services.find((s) => s instanceof service && s.subtype === subtype);
        };

        accessory.cleanServiceDisplayName = (name, type) => {
            return `${name} ${type}`.replace(/[^a-zA-Z0-9 ]/g, "").trim();
        };
    }

    /**
     * Configure the AccessoryInformation service
     * @param {PlatformAccessory} accessory - The accessory to configure
     */
    configureAccessoryInformation(accessory) {
        accessory.displayName = this.sanitizeName(accessory.displayName);
        const infoService = accessory.getOrAddService(this.Service.AccessoryInformation);
        const devData = accessory.context.deviceData;

        infoService
            .setCharacteristic(this.Characteristic.FirmwareRevision, devData.firmwareVersion)
            .setCharacteristic(this.Characteristic.Manufacturer, devData.manufacturerName)
            .setCharacteristic(this.Characteristic.Model, devData.modelName ? this.toTitleCase(devData.modelName) : "Unknown")
            .setCharacteristic(this.Characteristic.Name, this.sanitizeName(devData.name))
            .setCharacteristic(this.Characteristic.SerialNumber, "he_deviceid_" + devData.deviceid);

        // Handle Identify event
        const identifyChar = infoService.getCharacteristic(this.Characteristic.Identify);
        identifyChar.removeAllListeners("set");
        identifyChar.on("set", (value, callback) => {
            this.logManager.logDebug(`${accessory.displayName} identified with value: ${value}`);
            callback(null);
        });
    }

    /**
     * Determine the device types for an accessory based on its capabilities
     * @param {PlatformAccessory} accessory - The accessory to analyze
     * @returns {Array} Array of device types
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
            hasSpeedControl: () => (attributesSet.has("speed") && commandsSet.has("setSpeed")) || (attributesSet.has("level") && commandsSet.has("setLevel")),
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
                matchedTypes.push({
                    name: deviceTest.name,
                    handler: deviceTest.handler,
                });
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

    /**
     * Clean up unused services from an accessory
     * @param {PlatformAccessory} accessory - The accessory to clean up
     */
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
            }
        }

        // Clean up the tracking Set
        delete accessory.activeServices;
    }

    /**
     * Set the primary service for accessories with multiple services
     * @param {PlatformAccessory} accessory - The accessory to configure
     */
    setPrimaryService(accessory) {
        // Get all services except AccessoryInformation
        const services = accessory.services.filter((service) => service.UUID !== this.Service.AccessoryInformation.UUID);

        // If there's only one service or no services, no need to set primary
        if (services.length <= 1) return;

        // Define service priorities
        const serviceMap = {
            [this.Service.SecuritySystem.UUID]: { priority: 100 },
            [this.Service.Thermostat.UUID]: { priority: 90 },
            [this.Service.LockMechanism.UUID]: { priority: 80 },
            [this.Service.GarageDoorOpener.UUID]: { priority: 75 },
            [this.Service.Valve.UUID]: { priority: 74 },
            [this.Service.Window.UUID]: { priority: 70 },
            [this.Service.WindowCovering.UUID]: { priority: 65 },
            [this.Service.Lightbulb.UUID]: { priority: 60 },
            [this.Service.Speaker.UUID]: { priority: 58 },
            [this.Service.Outlet.UUID]: { priority: 55 },
            [this.Service.Switch.UUID]: { priority: 50 },
            [this.Service.Fanv2.UUID]: { priority: 45 },
            [this.Service.StatelessProgrammableSwitch.UUID]: { priority: 42 },
            [this.Service.MotionSensor.UUID]: { priority: 40 },
            [this.Service.ContactSensor.UUID]: { priority: 35 },
            [this.Service.OccupancySensor.UUID]: { priority: 34 },
            [this.Service.TemperatureSensor.UUID]: { priority: 30 },
            [this.Service.HumiditySensor.UUID]: { priority: 25 },
            [this.Service.LightSensor.UUID]: { priority: 24 },
            [this.Service.LeakSensor.UUID]: { priority: 20 },
            [this.Service.AirQualitySensor.UUID]: { priority: 18 },
            [this.Service.CarbonMonoxideSensor.UUID]: { priority: 15 },
            [this.Service.CarbonDioxideSensor.UUID]: { priority: 10 },
            [this.Service.Battery.UUID]: { priority: 5 },
        };

        // Sort services by priority
        services.sort((a, b) => {
            const priorityA = serviceMap[a.UUID]?.priority || 0;
            const priorityB = serviceMap[b.UUID]?.priority || 0;
            return priorityB - priorityA;
        });

        // Set highest priority service as primary
        const primaryService = services[0];
        primaryService.setPrimaryService(true);

        this.logManager.logDebug(`Setting primary service for ${accessory.displayName}: ` + `${primaryService.constructor.name} (Priority: ${serviceMap[primaryService.UUID]?.priority || 0})`);
    }

    /**
     * Sanitize device names
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

        return sanitized.length === 0 ? "Unnamed Device" : sanitized;
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
     * Clean up all timers and clear maps
     * Command timers are now handled by HubitatClient
     */
    cleanupTimers() {
        // No command timers to clean up in AccessoryManager
        // HubitatClient handles its own timer cleanup
    }

    /**
     * Dispose of the AccessoryManager
     */
    dispose() {
        this.cleanupTimers();
        // Clear device handlers
        for (const handler of Object.values(this.deviceHandlers)) {
            if (typeof handler.dispose === "function") {
                handler.dispose();
            }
        }
    }
}
