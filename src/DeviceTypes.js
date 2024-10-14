// DeviceTypes.js

import { knownCapabilities, pluginVersion } from "./Constants.js";
import path from "path";
import { fileURLToPath } from "url";
import _ from "lodash";
import CommunityTypes from "./libs/CommunityTypes.js";
import deviceTypes from "./device_types/index.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let appEvts;

export default class DeviceTypes {
    constructor(platform) {
        this.platform = platform;
        appEvts = platform.appEvts;

        this.configItems = platform.getConfigItems();
        this.homebridge = platform.homebridge;
        this.Utils = platform.Utils;
        this.log = platform.log;
        this.uuid = platform.uuid;
        this.Service = platform.Service;
        this.Characteristic = platform.Characteristic;
        this.Categories = platform.Categories;
        this.CommunityTypes = CommunityTypes(this.Service, this.Characteristic);
        this.client = platform.client;

        // Bind comparator for use in lodash functions
        this.comparator = this.comparator.bind(this);

        // Accessory Cache
        this.services = [];
        this._platformAccessories = {};
        this._buttonMap = {};

        // Load device type modules and initialize mappings
        this.deviceTypes = deviceTypes;
        this.deviceTypeMap = this.getDeviceTypeMap();
        this.initializeDeviceTypeTests();
    }

    getDeviceTypeMap() {
        return {
            acceleration_sensor: this.Service.MotionSensor,
            air_purifier: this.CommunityTypes.NewAirPurifierService,
            air_quality: this.Service.AirQualitySensor,
            alarm_system: this.Service.SecuritySystem,
            battery: this.Service.Battery,
            button: this.Service.StatelessProgrammableSwitch,
            carbon_dioxide: this.Service.CarbonDioxideSensor,
            carbon_monoxide: this.Service.CarbonMonoxideSensor,
            contact_sensor: this.Service.ContactSensor,
            fan: this.Service.Fanv2,
            filter_maintenance: this.Service.FilterMaintenance,
            garage_door: this.Service.GarageDoorOpener,
            humidity_sensor: this.Service.HumiditySensor,
            illuminance_sensor: this.Service.LightSensor,
            light: this.Service.Lightbulb,
            lock: this.Service.LockMechanism,
            motion_sensor: this.Service.MotionSensor,
            presence_sensor: this.Service.OccupancySensor,
            outlet: this.Service.Outlet,
            smoke_detector: this.Service.SmokeSensor,
            speaker: this.Service.Speaker,
            switch_device: this.Service.Switch,
            temperature_sensor: this.Service.TemperatureSensor,
            thermostat: this.Service.Thermostat,
            thermostat_fan: this.Service.Fanv2,
            valve: this.Service.Valve,
            virtual_mode: this.Service.Switch,
            virtual_piston: this.Service.Switch,
            leak_sensor: this.Service.LeakSensor,
            window_covering: this.Service.WindowCovering,
        };
    }

    initializeDeviceTypeTests() {
        this.deviceTypeTests = [
            new DeviceTypeTest("window_covering", (accessory) => accessory.hasCapability("WindowShade") && !["Speaker", "Fan", "FanControl"].some((cap) => accessory.hasCapability(cap)), true),
            new DeviceTypeTest(
                "light",
                (accessory) => accessory.hasCapability("SwitchLevel") && (accessory.hasCapability("LightBulb") || accessory.hasCapability("Bulb") || accessory.context.deviceData.name.toLowerCase().includes("light") || ["saturation", "hue", "colorTemperature"].some((attr) => accessory.hasAttribute(attr)) || accessory.hasCapability("ColorControl")),
                true,
            ),
            // new DeviceTypeTest("air_purifier", (accessory) => accessory.hasCapability("custom.airPurifierOperationMode")),
            new DeviceTypeTest("garage_door", (accessory) => accessory.hasCapability("GarageDoorControl")),
            new DeviceTypeTest("lock", (accessory) => accessory.hasCapability("Lock")),
            new DeviceTypeTest("valve", (accessory) => accessory.hasCapability("Valve")),
            new DeviceTypeTest("speaker", (accessory) => accessory.hasCapability("Speaker")),
            new DeviceTypeTest("filter_maintenance", (accessory) => accessory.hasCapability("FilterStatus") && accessory.hasAttribute("filterStatus")),
            new DeviceTypeTest("fan", (accessory) => ["Fan", "FanControl"].some((cap) => accessory.hasCapability(cap)) || (this.configItems.consider_fan_by_name && accessory.context.deviceData.name.toLowerCase().includes("fan")) || accessory.hasCommand("setSpeed") || accessory.hasAttribute("speed")),
            new DeviceTypeTest("virtual_mode", (accessory) => accessory.hasCapability("Mode")),
            new DeviceTypeTest("virtual_piston", (accessory) => accessory.hasCapability("Piston")),
            new DeviceTypeTest("button", (accessory) => ["Button", "DoubleTapableButton", "HoldableButton", "PushableButton"].some((cap) => accessory.hasCapability(cap))),
            new DeviceTypeTest("light", (accessory) => accessory.hasCapability("Switch") && (accessory.hasCapability("LightBulb") || accessory.hasCapability("Bulb") || (this.configItems.consider_light_by_name && accessory.context.deviceData.name.toLowerCase().includes("light"))), true),
            new DeviceTypeTest("outlet", (accessory) => accessory.hasCapability("Outlet") && accessory.hasCapability("Switch"), true),
            new DeviceTypeTest("switch_device", (accessory) => accessory.hasCapability("Switch") && !["LightBulb", "Outlet", "Bulb", "Button", "FanControl"].some((cap) => accessory.hasCapability(cap)) && !(this.configItems.consider_light_by_name && accessory.context.deviceData.name.toLowerCase().includes("light"))),
            new DeviceTypeTest("smoke_detector", (accessory) => accessory.hasCapability("SmokeDetector") && accessory.hasAttribute("smoke")),
            new DeviceTypeTest("carbon_monoxide", (accessory) => accessory.hasCapability("CarbonMonoxideDetector") && accessory.hasAttribute("carbonMonoxide")),
            new DeviceTypeTest("carbon_dioxide", (accessory) => accessory.hasCapability("CarbonDioxideMeasurement") && accessory.hasAttribute("carbonDioxide")),
            new DeviceTypeTest("motion_sensor", (accessory) => accessory.hasCapability("MotionSensor")),
            new DeviceTypeTest("acceleration_sensor", (accessory) => accessory.hasCapability("AccelerationSensor")),
            new DeviceTypeTest("leak_sensor", (accessory) => accessory.hasCapability("WaterSensor")),
            new DeviceTypeTest("presence_sensor", (accessory) => accessory.hasCapability("PresenceSensor")),
            new DeviceTypeTest("humidity_sensor", (accessory) => accessory.hasCapability("RelativeHumidityMeasurement") && accessory.hasAttribute("humidity") && !["Thermostat", "ThermostatOperatingState"].some((cap) => accessory.hasCapability(cap)) && !accessory.hasAttribute("thermostatOperatingState")),
            new DeviceTypeTest("temperature_sensor", (accessory) => accessory.hasCapability("TemperatureMeasurement") && !["Thermostat", "ThermostatOperatingState"].some((cap) => accessory.hasCapability(cap)) && !accessory.hasAttribute("thermostatOperatingState")),
            new DeviceTypeTest("illuminance_sensor", (accessory) => accessory.hasCapability("IlluminanceMeasurement")),
            new DeviceTypeTest("contact_sensor", (accessory) => accessory.hasCapability("ContactSensor") && !accessory.hasCapability("GarageDoorControl")),
            new DeviceTypeTest("air_quality", (accessory) => accessory.hasCapability("airQuality") || accessory.hasCapability("AirQuality")),
            new DeviceTypeTest("battery", (accessory) => accessory.hasCapability("Battery")),
            // new DeviceTypeTest("energy_meter", (accessory) => accessory.hasCapability("EnergyMeter") && !accessory.hasCapability("Switch"), true),
            // new DeviceTypeTest("power_meter", (accessory) => accessory.hasCapability("PowerMeter") && !accessory.hasCapability("Switch"), true),
            new DeviceTypeTest("thermostat", (accessory) => accessory.hasCapability("Thermostat") || accessory.hasCapability("ThermostatOperatingState") || accessory.hasAttribute("thermostatOperatingState")),
            new DeviceTypeTest("thermostat_fan", (accessory) => accessory.hasCapability("Thermostat") && accessory.hasAttribute("thermostatFanMode") && accessory.hasCommand("fanAuto") && accessory.hasCommand("fanOn")),
            new DeviceTypeTest("alarm_system", (accessory) => accessory.hasAttribute("alarmSystemStatus")),
        ];
    }

    getDeviceTypes(accessory) {
        const devicesFound = [];
        const devicesBlocked = [];

        for (const devTest of this.deviceTypeTests) {
            if (devTest.ImplementsDevice(accessory)) {
                const blockDevice = devTest.onlyOnNoGrps && devicesFound.length > 0;
                if (blockDevice) {
                    devicesBlocked.push(devTest.Name);
                    this.platform.logDebug(`(${accessory.name}) | Device Type BLOCKED | Name: ${devTest.Name} | Count: ${devicesFound.length} | Devices: ${devicesFound.map((d) => d.name)}`);
                }
                if (!blockDevice) {
                    devicesFound.push({
                        name: devTest.Name,
                        type: this.deviceTypeMap[devTest.Name],
                    });
                }
            }
        }

        if (devicesBlocked.length) {
            this.platform.logDebug(`(${accessory.name}) | Device Types BLOCKED | ${devicesBlocked}`);
        }

        // console.log(`${accessory.name} | deviceTypesFound:`, devicesFound.map((d) => d.name).join(", "));
        return devicesFound;
    }

    initializeAccessory(accessory, fromCache = false) {
        try {
            const { deviceData } = accessory.context;
            accessory.deviceid = deviceData.deviceid;
            accessory.name = deviceData.name;

            if (!fromCache) {
                deviceData.excludedCapabilities.forEach((cap) => {
                    if (cap) {
                        this.platform.logDebug(`Removing capability: ${cap} from Device: ${accessory.name}`);
                        delete accessory.context.deviceData.capabilities[cap];
                    }
                });
            } else {
                this.platform.logDebug(`Initializing Cached Device ${accessory.name} | ${accessory.deviceid}`);
            }

            accessory._buttonMap = {};
            accessory.commandTimers = {};
            accessory.commandTimersTS = {};
            accessory.context.uuid = accessory.UUID || this.uuid.generate(`hubitat_v2_${accessory.deviceid}`);
            accessory.log = this.log;
            accessory.homebridgeApi = this.homebridge;
            accessory.getPlatformConfig = this.configItems;

            // Bind utility methods
            accessory.getButtonSvcByName = this.getButtonSvcByName.bind(accessory);
            accessory.hasCapability = this.hasCapability.bind(accessory);
            accessory.getCapabilities = this.getCapabilities.bind(accessory);
            accessory.hasAttribute = this.hasAttribute.bind(accessory);
            accessory.hasCommand = this.hasCommand.bind(accessory);
            accessory.hasDeviceFlag = this.hasDeviceFlag.bind(accessory);
            accessory.hasService = this.hasService.bind(accessory);
            accessory.hasCharacteristic = this.hasCharacteristic.bind(accessory);
            accessory.sendCommand = this.sendCommand.bind(accessory);

            // Adaptive Lighting Support
            accessory.isAdaptiveLightingSupported = (this.homebridge.version >= 2.7 && this.homebridge.versionGreaterOrEqual("1.3.0-beta.19")) || !!this.homebridge.hap.AdaptiveLightingController;

            // Check availability and set error if unavailable
            // this.handleAvailability(accessory);

            return this.configureCharacteristics(accessory);
        } catch (err) {
            this.platform.logError(`initializeAccessory (fromCache: ${fromCache}) | Name: ${accessory.name} | Error: ${err}`);
            console.error(err);
            return accessory;
        }
    }

    configureCharacteristics(accessory) {
        const { deviceData } = accessory.context;

        // Track unknown capabilities
        Object.keys(deviceData.capabilities).forEach((cap) => {
            if (!knownCapabilities.includes(cap) && !this.platform.unknownCapabilities.includes(cap)) {
                this.platform.unknownCapabilities.push(cap);
            }
        });

        accessory.context.deviceGroups = [];
        accessory.servicesToKeep = [];
        accessory.characteristicsToKeep = {};
        accessory.reachable = true;
        accessory.context.lastUpdate = new Date();

        // Add the AccessoryInformation service
        const accInfoSvc = accessory.getService(this.Service.AccessoryInformation) || accessory.addService(this.Service.AccessoryInformation);

        accInfoSvc
            .setCharacteristic(this.Characteristic.FirmwareRevision, deviceData.firmwareVersion)
            .setCharacteristic(this.Characteristic.Manufacturer, deviceData.manufacturerName)
            .setCharacteristic(this.Characteristic.Model, deviceData.modelName ? this.Utils.toTitleCase(deviceData.modelName) : "Unknown")
            .setCharacteristic(this.Characteristic.Name, accessory.name)
            .setCharacteristic(this.Characteristic.HardwareRevision, pluginVersion)
            .setCharacteristic(this.Characteristic.SerialNumber, `he_deviceid_${deviceData.deviceid}`);

        // Add the characteristics to keep for AccessoryInformation service
        this.addCharacteristicToKeep(accessory, accInfoSvc, this.Characteristic.FirmwareRevision);
        this.addCharacteristicToKeep(accessory, accInfoSvc, this.Characteristic.Manufacturer);
        this.addCharacteristicToKeep(accessory, accInfoSvc, this.Characteristic.Model);
        this.addCharacteristicToKeep(accessory, accInfoSvc, this.Characteristic.Name);
        this.addCharacteristicToKeep(accessory, accInfoSvc, this.Characteristic.HardwareRevision);
        this.addCharacteristicToKeep(accessory, accInfoSvc, this.Characteristic.SerialNumber);

        this.addServiceToKeep(accessory, accInfoSvc);

        // Handle Identify event
        if (!accInfoSvc.listeners("identify").length) {
            accInfoSvc.on("identify", (paired, callback) => {
                this.platform.logInfo(`${accessory.name} - identify`);
                callback();
            });
        }

        // Determine device types and initialize corresponding services
        const deviceTypeMatches = this.getDeviceTypes(accessory);
        if (deviceTypeMatches.length > 0) {
            deviceTypeMatches.forEach((deviceType) => {
                const { name, type } = deviceType;
                if (name && type && this.deviceTypes[name]) {
                    // this.platform.logGreen(`Device type ${name} found for ${accessory.name}`);

                    // check if init method is available for the device type and call it
                    if (typeof this.deviceTypes[name].init === "function") {
                        this.deviceTypes[name].init(this, this.Characteristic, this.Service, this.CommunityTypes);
                    } else {
                        this.platform.logError(`Device type ${name} does not have an initializeAccessory method`);
                    }

                    // Check if the device type has an initializeAccessory method
                    if (typeof this.deviceTypes[name].initializeAccessory === "function") {
                        this.deviceTypes[name].initializeAccessory(accessory);
                    } else {
                        this.platform.logError(`Device type ${name} does not have an initializeAccessory method`);
                    }
                } else {
                    this.platform.logError(`Device type ${name} not found for ${accessory.name}`);
                }
            });
        } else {
            this.platform.logWarn(`Unable to determine the device type for device | ${accessory.name} | deviceId: (${deviceData.deviceid})`);
        }

        return this.removeUnusedServices(accessory);
    }

    /**
     * Retrieves an existing service from the accessory or adds a new one if it doesn't exist.
     * Also ensures the service is marked to be kept.
     *
     * @param {object} accessory - The accessory object to retrieve or add the service to.
     * @param {object} serviceType - The type of the service to retrieve or add.
     * @param {string} [serviceName=null] - The name of the service to add, if a new service is being added.
     * @returns {object} The retrieved or newly added service.
     */
    getOrAddService(accessory, serviceType, serviceName = null) {
        const service = accessory.getService(serviceType) || accessory.addService(serviceType, serviceName);
        this.addServiceToKeep(accessory, service);
        return service;
    }

    /**
     * Adds a characteristic to a service if it doesn't already exist, or retrieves it if it does.
     * Optionally sets properties, event handlers, and checks prerequisites.
     *
     * @param {object} accessory - The accessory object.
     * @param {object} service - The service to which the characteristic belongs.
     * @param {object} characteristicType - The type of characteristic to add or retrieve.
     * @param {object} [options={}] - Optional parameters.
     * @param {function} [options.preReqChk=null] - A function to check prerequisites. If it returns false, the characteristic is not added.
     * @param {function} [options.getHandler=null] - A function to handle 'get' events for the characteristic.
     * @param {function} [options.setHandler=null] - A function to handle 'set' events for the characteristic.
     * @param {object} [options.props={}] - Properties to set on the characteristic.
     * @param {boolean} [options.eventOnly=true] - If true, the characteristic is event-only.
     * @param {boolean} [options.removeIfMissingPreReq=false] - If true, removes the characteristic if prerequisites are not met.
     * @returns {object|null} The added or retrieved characteristic, or null if prerequisites are not met.
     */
    getOrAddCharacteristic(accessory, service, characteristicType, options = {}) {
        if (!accessory || !service || !characteristicType) {
            this.platform.logError("getOrAddCharacteristic called with missing required parameters");
            return null;
        }

        const { preReqChk = null, getHandler = null, setHandler = null, props = {}, eventOnly = true, removeIfMissingPreReq = false } = options;

        // Check if preReqChk is provided and evaluates to false
        if (preReqChk && !preReqChk(accessory)) {
            // accessory.log.error(`Prerequisite not met for characteristic ${characteristicType.name} for ${accessory.name}`);

            if (removeIfMissingPreReq) {
                const existingChar = service.getCharacteristic(characteristicType);
                if (existingChar) {
                    service.removeCharacteristic(existingChar);
                    // accessory.log.debug(`Removed characteristic ${characteristicType.name} from ${accessory.name} due to unmet prerequisites`);
                }
            }
            return null;
        }

        let characteristic;
        try {
            characteristic = service.getCharacteristic(characteristicType) || service.addCharacteristic(characteristicType);
        } catch (error) {
            accessory.log.error(`Error adding characteristic ${characteristicType.constructorName} to ${accessory.name}: ${error.message}`);
            return null;
        }

        if (Object.keys(props).length > 0) {
            try {
                characteristic.setProps(props);
            } catch (error) {
                accessory.log.error(`Error setting props for ${characteristicType.name} on ${accessory.name}: ${error.message}`);
            }
        }

        if (!eventOnly) {
            characteristic.eventOnlyCharacteristic = false;
        }

        if (getHandler) {
            characteristic.onGet(getHandler.bind(accessory));
        }

        if (setHandler) {
            characteristic.onSet(setHandler.bind(accessory));
        }

        this.addCharacteristicToKeep(accessory, service, characteristic);

        return characteristic;
    }

    /**
     * Adds a service to the list of services to keep for a given accessory.
     * If the list does not exist, it initializes it.
     * If the service is not already in the list, it adds the service's UUID to the list.
     *
     * @param {Object} accessory - The accessory object to which the service belongs.
     * @param {Object} service - The service object to be added to the list of services to keep.
     * @param {string} service.UUID - The unique identifier of the service.
     */
    addServiceToKeep(accessory, service) {
        if (!accessory.servicesToKeep) {
            accessory.servicesToKeep = [];
        }
        const serviceKey = `${service.UUID}:${service.subtype || ""}`;
        if (!accessory.servicesToKeep.includes(serviceKey)) {
            accessory.servicesToKeep.push(serviceKey);
        }
    }

    /**
     * Adds a characteristic to the list of characteristics to keep for a given accessory and service.
     *
     * @param {Object} accessory - The accessory object to which the characteristic belongs.
     * @param {Object} service - The service object that contains the characteristic.
     * @param {Object} characteristic - The characteristic object to be added to the keep list.
     */
    addCharacteristicToKeep(accessory, service, characteristic) {
        if (!accessory.characteristicsToKeep) {
            accessory.characteristicsToKeep = {};
        }
        if (!accessory.characteristicsToKeep[service.UUID]) {
            accessory.characteristicsToKeep[service.UUID] = [];
        }
        if (!accessory.characteristicsToKeep[service.UUID].includes(characteristic.UUID)) {
            accessory.characteristicsToKeep[service.UUID].push(characteristic.UUID);
        }
    }

    /**
     * Removes unused services from the accessory.
     *
     * This method iterates over the services of the given accessory and removes any service
     * that is not in the `servicesToKeep` set. If a service is removed, it logs the removal.
     * For services that are kept, it calls `removeUnusedCharacteristics` to further clean up
     * unused characteristics.
     *
     * @param {Object} acc - The accessory object containing services.
     * @param {Set} acc.servicesToKeep - A set of service UUIDs that should be kept.
     * @param {Array} acc.services - An array of service objects associated with the accessory.
     * @param {Function} acc.removeService - A method to remove a service from the accessory.
     * @param {Object} service - A service object associated with the accessory.
     * @param {string} service.UUID - The UUID of the service.
     * @param {string} service.displayName - The display name of the service.
     * @param {Function} this.removeUnusedCharacteristics - A method to remove unused characteristics from a service.
     * @param {Object} this.platform - The platform object containing logging methods.
     * @param {Function} this.platform.logInfo - A method to log informational messages.
     * @returns {Object} The accessory object with unused services removed.
     */
    removeUnusedServices(accessory) {
        const servicesToKeep = new Set(accessory.servicesToKeep);
        accessory.services.forEach((service) => {
            const serviceKey = `${service.UUID}:${service.subtype || ""}`;
            if (!servicesToKeep.has(serviceKey)) {
                accessory.removeService(service);
                this.platform.logInfo(`Removing Unused Service: ${service.displayName ? service.displayName : service.UUID} from ${accessory.displayName}`);
            } else {
                this.removeUnusedCharacteristics(accessory, service);
            }
        });
        return accessory;
    }

    removeUnusedCharacteristics(accessory, service) {
        // Always keep all characteristics of AccessoryInformation service
        if (service.UUID === this.Service.AccessoryInformation.UUID) {
            return;
        }

        const characteristicsToKeep = accessory.characteristicsToKeep[service.UUID] || [];
        service.characteristics.forEach((characteristic) => {
            if (!characteristicsToKeep.includes(characteristic.UUID)) {
                service.removeCharacteristic(characteristic);
                this.platform.logInfo(`Removing Unused Characteristic: ${characteristic.name ? characteristic.name : characteristic.displayName} from ${service.displayName} from ${accessory.name}`);
            }
        });
    }

    updateCharacteristicValue(accessory, service, characteristicType, value) {
        if (service && service.testCharacteristic(characteristicType)) {
            service.updateCharacteristic(characteristicType, value);
            // service.getCharacteristic(characteristicType).updateValue(value);//
            accessory.log.debug(`${accessory.name} | Updated ${characteristicType.name}: ${value}`);
        } else {
            accessory.log.warn(`${accessory.name} | Failed to update ${characteristicType.name}: Service or Characteristic not found`);
        }
    }

    handleAvailability(accessory) {
        const { isUnavailable } = accessory.context.deviceData;
        const accInfoSvc = accessory.getService(this.Service.AccessoryInformation);
        if (accInfoSvc) {
            accInfoSvc.updateCharacteristic(this.Characteristic.Name, isUnavailable ? new Error("Device Unavailable") : accessory.name);
            if (isUnavailable) {
                this.platform.logWarn(`Marked ${accessory.name} as ${isUnavailable ? "Unavailable" : "Available"}`);
            }
        } else {
            this.platform.logWarn(`AccessoryInformation service not found for ${accessory.name}`);
        }
    }

    async processDeviceAttributeUpdate(change) {
        const accessory = this.getAccessoryFromCache({ deviceid: change.deviceid });
        if (!accessory) {
            this.platform.logError(`Accessory not found for device ID: ${change.deviceid}`);
            return false;
        }

        // Update the attribute
        accessory.context.deviceData.attributes[change.attribute] = change.value;
        accessory.context.lastUpdate = new Date().toLocaleString();

        // Get device types and handle updates
        const deviceTypes = this.getDeviceTypes(accessory);
        if (deviceTypes.length > 0) {
            deviceTypes.forEach((deviceType) => {
                const typeModule = this.deviceTypes[deviceType.name];
                if (typeModule && typeof typeModule.handleAttributeUpdate === "function" && typeModule.relevantAttributes.includes(change.attribute)) {
                    typeModule.handleAttributeUpdate(accessory, change);
                }
            });
        } else {
            this.platform.logWarn(`No device types found for accessory: ${accessory.name}`);
        }
        // }

        return true;
    }

    sendCommand(callback, acc, dev, cmd, vals) {
        const id = `${cmd}`;
        const tsNow = Date.now();

        // Define debounce parameters based on command type
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

            if (acc.commandTimers[id]) {
                acc.commandTimers[id].cancel();
                acc.commandTimers[id] = null;
            }

            acc.commandTimers[id] = _.debounce(
                () => {
                    acc.commandTimersTS[id] = Date.now();
                    appEvts.emit("event:device_command", dev, cmd, vals);
                },
                delay,
                { trailing },
            );

            acc.commandTimers[id]();
        } else {
            // Immediate command emission for commands without debounce configuration
            appEvts.emit("event:device_command", dev, cmd, vals);
        }

        if (callback) callback();
    }

    log_change(attr, char, acc, chgObj) {
        if (this.platform.logConfig.debug) {
            this.platform.logNotice(`[CHARACTERISTIC (${char.name}) CHANGE] ${attr} (${acc.displayName}) | LastUpdate: (${acc.context.lastUpdate}) | NewValue: (${chgObj.newValue}) | OldValue: (${chgObj.oldValue})`);
        }
    }

    log_get(attr, char, acc, val) {
        if (this.platform.logConfig.debug) {
            this.platform.logGreen(`[CHARACTERISTIC (${char.name}) GET] ${attr} (${acc.displayName}) | LastUpdate: (${acc.context.lastUpdate}) | Value: (${val})`);
        }
    }

    log_set(attr, char, acc, val) {
        if (this.platform.logConfig.debug) {
            this.platform.logWarn(`[CHARACTERISTIC (${char.name}) SET] ${attr} (${acc.displayName}) | LastUpdate: (${acc.context.lastUpdate}) | Value: (${val})`);
        }
    }

    hasCapability(cap) {
        const caps = Object.keys(this.context.deviceData.capabilities);
        return caps.includes(cap) || caps.includes(cap.replace(/\s/g, ""));
    }

    getCapabilities() {
        return Object.keys(this.context.deviceData.capabilities);
    }

    hasAttribute(attr) {
        return this.context.deviceData.attributes.hasOwnProperty(attr);
    }

    hasCommand(cmd) {
        return this.context.deviceData.commands.hasOwnProperty(cmd);
    }

    hasService(service) {
        return this.services.map((s) => s.UUID).includes(service.UUID);
    }

    hasCharacteristic(svc, char) {
        const service = this.getService(svc);
        return service ? service.getCharacteristic(char) !== undefined : false;
    }

    hasDeviceFlag(flag) {
        return this.context?.deviceData?.deviceflags?.hasOwnProperty(flag) || false;
    }

    getButtonSvcByName(serviceType, displayName, subType) {
        this.log.debug(`${this.name} | Getting or adding button service: ${displayName} (subType: ${subType})`);

        // Attempt to find the service with the same UUID and subtype within the accessory's services
        let svc = this.services.find((s) => s.UUID === serviceType.UUID && s.subtype === subType);

        if (!svc) {
            // Attempt to find the service using the old naming scheme
            const oldServiceName = `${this.deviceId || this.context.deviceData.deviceId}_${subType}`;
            svc = this.services.find((s) => s.displayName === oldServiceName);

            if (svc) {
                this.log.debug(`${this.name} | Found existing service with old naming scheme: ${oldServiceName}. Updating to new naming.`);
                // Update the service's display name to the new naming scheme
                svc.displayName = displayName;
                svc.subtype = subType; // Ensure the subtype is correctly set
            }
        }

        if (!svc) {
            this.log.debug(`${this.name} | Adding new service for: ${displayName} (subType: ${subType})`);
            svc = new serviceType(displayName, subType);
            this.addService(svc);
        } else {
            this.log.debug(`${this.name} | Reusing existing service for: ${displayName} (subType: ${subType})`);
        }

        // Ensure the service is in servicesToKeep regardless of whether it's new or existing
        const serviceKey = `${svc.UUID}:${svc.subtype || ""}`;
        if (!this.servicesToKeep.includes(serviceKey)) {
            this.servicesToKeep.push(serviceKey);
        }

        // Log the current services for debugging
        this.log.debug(
            `${this.name} | Current Services: ${this.services
                .map((s) => s.displayName)
                .filter((s) => s.length > 0)
                .join(", ")}`,
        );

        return svc;
    }

    getAccessoryId(accessory) {
        return accessory.deviceid || accessory.context.deviceData.deviceid || undefined;
    }

    getAccessoryFromCache(device) {
        const key = this.getAccessoryId(device);
        return this._platformAccessories[key];
    }

    getAllAccessoriesFromCache() {
        return this._platformAccessories;
    }

    clearAccessoryCache() {
        this.platform.logAlert("CLEARING ACCESSORY CACHE AND FORCING DEVICE RELOAD");
        this._platformAccessories = {};
    }

    addAccessoryToCache(accessory) {
        const key = this.getAccessoryId(accessory);
        this._platformAccessories[key] = accessory;
        return true;
    }

    removeAccessoryFromCache(accessory) {
        const key = this.getAccessoryId(accessory);
        const removed = this._platformAccessories[key];
        delete this._platformAccessories[key];
        return removed;
    }

    clamp(value, min, max) {
        return Math.max(min, Math.min(max, value));
    }

    forEach(fn) {
        return _.forEach(this._platformAccessories, fn);
    }

    intersection(devices) {
        const accessories = _.values(this._platformAccessories);
        return _.intersectionWith(devices, accessories, this.comparator);
    }

    diffAdd(devices) {
        const accessories = _.values(this._platformAccessories);
        return _.differenceWith(devices, accessories, this.comparator);
    }

    diffRemove(devices) {
        const accessories = _.values(this._platformAccessories);
        return _.differenceWith(accessories, devices, this.comparator);
    }

    comparator(accessory1, accessory2) {
        return this.getAccessoryId(accessory1) === this.getAccessoryId(accessory2);
    }

    clearAndSetTimeout(timeoutReference, fn, timeoutMs) {
        if (timeoutReference) clearTimeout(timeoutReference);
        return setTimeout(fn, timeoutMs);
    }
}

class DeviceTypeTest {
    constructor(name, testFn, onlyOnNoGrps = false) {
        this.Name = name;
        this.ImplementsDevice = testFn;
        this.onlyOnNoGrps = onlyOnNoGrps;
    }
}
