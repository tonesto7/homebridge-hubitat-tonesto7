// device_types.js

const { knownCapabilities, pluginVersion } = require("./Constants");
const fs = require("fs");
const path = require("path");
const _ = require("lodash");
const CommunityTypes = require("./libs/CommunityTypes");

let appEvts;

class DeviceTypes {
    constructor(platform) {
        this.platform = platform;
        appEvts = platform.appEvts;

        if (!appEvts) {
            this.platform.logError("appEvts is not initialized in DeviceTypes");
            return;
        }
        // this.platform.logDebug("appEvts successfully initialized in DeviceTypes");

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
        this.deviceTypes = {};
        this.loadDeviceTypesFiles();
        this.deviceTypeMap = this.getDeviceTypeMap();
        this.initializeDeviceTypeTests();
    }

    /**
     * Dynamically load all device type modules from the device_types directory.
     */
    loadDeviceTypesFiles() {
        const deviceTypesPath = path.join(__dirname, "device_types");
        const deviceTypeFiles = fs.readdirSync(deviceTypesPath).filter((file) => file.endsWith(".js"));
        deviceTypeFiles.forEach((file) => {
            const deviceType = require(path.join(deviceTypesPath, file));
            const name = path.basename(file, ".js");
            this.deviceTypes[name] = deviceType;
        });
    }

    /**
     * Map device types to their corresponding Homebridge services.
     * @returns {Object} - Mapping of device type names to Homebridge service classes.
     */
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
            virtual_routine: this.Service.Switch,
            water_sensor: this.Service.LeakSensor,
            window_shade: this.Service.WindowCovering,
        };
    }

    /**
     * Initialize device type tests used to determine the type of each accessory.
     */
    initializeDeviceTypeTests() {
        this.deviceTypeTests = [
            new DeviceTypeTest("window_shade", (accessory) => accessory.hasCapability("WindowShade") && !["Speaker", "Fan", "Fan Control"].some((cap) => accessory.hasCapability(cap)), true),
            new DeviceTypeTest(
                "light",
                (accessory) =>
                    accessory.hasCapability("Switch Level") && (accessory.hasCapability("LightBulb") || accessory.hasCapability("Bulb") || accessory.context.deviceData.name.toLowerCase().includes("light") || ["saturation", "hue", "colorTemperature"].some((attr) => accessory.hasAttribute(attr)) || accessory.hasCapability("Color Control")),
                true,
            ),
            new DeviceTypeTest("garage_door", (accessory) => accessory.hasCapability("GarageDoorControl")),
            new DeviceTypeTest("lock", (accessory) => accessory.hasCapability("Lock")),
            new DeviceTypeTest("valve", (accessory) => accessory.hasCapability("Valve")),
            new DeviceTypeTest("speaker", (accessory) => accessory.hasCapability("Speaker")),
            new DeviceTypeTest("fan", (accessory) => accessory.hasCapability("Fan") || accessory.hasCapability("FanControl") || (this.configItems.consider_fan_by_name && accessory.context.deviceData.name.toLowerCase().includes("fan")) || accessory.hasCommand("setSpeed") || accessory.hasAttribute("speed")),
            new DeviceTypeTest("virtual_mode", (accessory) => accessory.hasCapability("Mode")),
            new DeviceTypeTest("virtual_piston", (accessory) => accessory.hasCapability("Piston")),
            new DeviceTypeTest("virtual_routine", (accessory) => accessory.hasCapability("Routine")),
            new DeviceTypeTest("button", (accessory) => ["Button", "DoubleTapableButton", "HoldableButton", "PushableButton", "ReleasableButton"].some((cap) => accessory.hasCapability(cap))),
            new DeviceTypeTest("light", (accessory) => accessory.hasCapability("Switch") && (accessory.hasCapability("LightBulb") || accessory.hasCapability("Bulb") || (this.configItems.consider_light_by_name && accessory.context.deviceData.name.toLowerCase().includes("light"))), true),
            new DeviceTypeTest("outlet", (accessory) => accessory.hasCapability("Outlet") && accessory.hasCapability("Switch"), true),
            new DeviceTypeTest("switch_device", (accessory) => accessory.hasCapability("Switch") && !["LightBulb", "Outlet", "Bulb", "Button"].some((cap) => accessory.hasCapability(cap)) && !(this.configItems.consider_light_by_name && accessory.context.deviceData.name.toLowerCase().includes("light"))),
            new DeviceTypeTest("smoke_detector", (accessory) => accessory.hasCapability("SmokeDetector") && accessory.hasAttribute("smoke")),
            new DeviceTypeTest("carbon_monoxide", (accessory) => accessory.hasCapability("CarbonMonoxideDetector") && accessory.hasAttribute("carbonMonoxide")),
            new DeviceTypeTest("carbon_dioxide", (accessory) => accessory.hasCapability("CarbonDioxideMeasurement") && accessory.hasAttribute("carbonDioxideMeasurement")),
            new DeviceTypeTest("motion_sensor", (accessory) => accessory.hasCapability("Motion Sensor")),
            new DeviceTypeTest("acceleration_sensor", (accessory) => accessory.hasCapability("Acceleration Sensor")),
            new DeviceTypeTest("water_sensor", (accessory) => accessory.hasCapability("Water Sensor")),
            new DeviceTypeTest("presence_sensor", (accessory) => accessory.hasCapability("PresenceSensor")),
            new DeviceTypeTest("humidity_sensor", (accessory) => accessory.hasCapability("RelativeHumidityMeasurement") && accessory.hasAttribute("humidity") && !["Thermostat", "ThermostatOperatingState"].some((cap) => accessory.hasCapability(cap)) && !accessory.hasAttribute("thermostatOperatingState")),
            new DeviceTypeTest("temperature_sensor", (accessory) => accessory.hasCapability("TemperatureMeasurement") && !["Thermostat", "ThermostatOperatingState"].some((cap) => accessory.hasCapability(cap)) && !accessory.hasAttribute("thermostatOperatingState")),
            new DeviceTypeTest("illuminance_sensor", (accessory) => accessory.hasCapability("IlluminanceMeasurement")),
            new DeviceTypeTest("contact_sensor", (accessory) => accessory.hasCapability("ContactSensor") && !accessory.hasCapability("GarageDoorControl")),
            new DeviceTypeTest("air_quality", (accessory) => accessory.hasCapability("airQuality") || accessory.hasCapability("AirQuality")),
            new DeviceTypeTest("battery", (accessory) => accessory.hasCapability("Battery")),
            new DeviceTypeTest("thermostat", (accessory) => accessory.hasCapability("Thermostat") || accessory.hasCapability("ThermostatOperatingState") || accessory.hasAttribute("thermostatOperatingState")),
            new DeviceTypeTest("thermostat_fan", (accessory) => accessory.hasCapability("Thermostat") && accessory.hasAttribute("thermostatFanMode") && accessory.hasCommand("fanAuto") && accessory.hasCommand("fanOn")),
            new DeviceTypeTest("alarm_system", (accessory) => accessory.hasAttribute("alarmSystemStatus")),
        ];
    }

    /**
     * Determine device types for a given accessory based on predefined tests.
     * @param {PlatformAccessory} accessory - The accessory to evaluate.
     * @returns {Array} - List of matched device types.
     */
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

        return devicesFound;
    }

    /**
     * Initialize and configure an accessory.
     * @param {PlatformAccessory} accessory - The accessory to initialize.
     * @param {boolean} [fromCache=false] - Indicates if the accessory is being loaded from cache.
     * @returns {PlatformAccessory} - The initialized accessory.
     */
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
            this.handleAvailability(accessory);

            return this.configureCharacteristics(accessory);
        } catch (err) {
            this.platform.logError(`initializeAccessory (fromCache: ${fromCache}) | Name: ${accessory.name} | Error: ${err}`);
            console.error(err);
            return accessory;
        }
    }

    /**
     * Configure characteristics and services for the accessory.
     * @param {PlatformAccessory} accessory - The accessory to configure.
     * @returns {PlatformAccessory} - The configured accessory.
     */
    configureCharacteristics(accessory) {
        const { deviceData } = accessory.context;

        // Track unknown capabilities
        Object.keys(deviceData.capabilities).forEach((cap) => {
            if (!knownCapabilities.includes(cap) && !this.platform.unknownCapabilities.includes(cap)) {
                this.platform.unknownCapabilities.push(cap);
            }
        });

        accessory.context.deviceGroups = [];
        accessory.serviceUUIDsToKeep = [];
        accessory.reachable = true;
        accessory.context.lastUpdate = new Date();

        // Add the AccessoryInformation service
        const accessoryInformationSvc = accessory.getService(this.Service.AccessoryInformation) || accessory.addService(this.Service.AccessoryInformation);
        accessoryInformationSvc
            .setCharacteristic(this.Characteristic.FirmwareRevision, deviceData.firmwareVersion)
            .setCharacteristic(this.Characteristic.Manufacturer, deviceData.manufacturerName)
            .setCharacteristic(this.Characteristic.Model, deviceData.modelName ? this.Utils.toTitleCase(deviceData.modelName) : "Unknown")
            .setCharacteristic(this.Characteristic.Name, accessory.name)
            .setCharacteristic(this.Characteristic.HardwareRevision, pluginVersion)
            .setCharacteristic(this.Characteristic.SerialNumber, `he_deviceid_${deviceData.deviceid}`);

        accessory.serviceUUIDsToKeep.push(this.Service.AccessoryInformation.UUID);

        // Handle Identify event
        if (!accessoryInformationSvc.listeners("identify").length) {
            accessoryInformationSvc.on("identify", (paired, callback) => {
                this.platform.logInfo(`${accessory.displayName} - identify`);
                callback();
            });
        }

        // Determine device types and initialize corresponding services
        const deviceTypes = this.getDeviceTypes(accessory);
        if (deviceTypes.length > 0) {
            deviceTypes.forEach((deviceType) => {
                const { name, type } = deviceType;
                if (name && type && this.deviceTypes[name]) {
                    const service = this.deviceTypes[name].initializeAccessory(accessory, this);
                    if (service) {
                        accessory.serviceUUIDsToKeep.push(service.UUID);
                    }

                    // Add corresponding service UUID from the deviceTypeMap
                    if (this.deviceTypeMap[name]) {
                        accessory.serviceUUIDsToKeep.push(this.deviceTypeMap[name].UUID);
                    }
                } else {
                    this.platform.logError(`Device type ${name} not found for ${accessory.name}`);
                }
            });
        } else {
            throw new Error(`Unable to determine the device type of ${deviceData.deviceid}`);
        }

        return this.removeUnusedServices(accessory);
    }

    /**
     * Handle device availability by marking it as 'Not Responding' or available.
     * @param {PlatformAccessory} accessory - The accessory to handle.
     */
    handleAvailability(accessory) {
        const { isUnavailable } = accessory.context.deviceData;
        if (isUnavailable) {
            this.setAccessoryUnavailable(accessory);
        } else {
            this.setAccessoryAvailable(accessory);
        }
    }

    /**
     * Mark the accessory as unavailable by setting an error on the Name characteristic.
     * @param {PlatformAccessory} accessory - The accessory to mark as unavailable.
     */
    setAccessoryUnavailable(accessory) {
        const accessoryInformationSvc = accessory.getService(this.Service.AccessoryInformation);
        if (accessoryInformationSvc) {
            accessoryInformationSvc.updateCharacteristic(this.Characteristic.Name, new Error("Device Unavailable"));
            this.platform.logWarn(`Marked ${accessory.name} as Unavailable`);
        } else {
            this.platform.logWarn(`AccessoryInformation service not found for ${accessory.name}`);
        }
    }

    /**
     * Mark the accessory as available by resetting the Name characteristic.
     * @param {PlatformAccessory} accessory - The accessory to mark as available.
     */
    setAccessoryAvailable(accessory) {
        const accessoryInformationSvc = accessory.getService(this.Service.AccessoryInformation);
        if (accessoryInformationSvc) {
            accessoryInformationSvc.updateCharacteristic(this.Characteristic.Name, accessory.name);
            this.platform.logInfo(`Marked ${accessory.name} as Available`);
        } else {
            this.platform.logWarn(`AccessoryInformation service not found for ${accessory.name}`);
        }
    }

    /**
     * Handle device attribute updates.
     * @param {Object} change - The change object containing deviceid, attribute, value, etc.
     * @returns {Promise<boolean>} - Resolves to true if successful, false otherwise.
     */
    processDeviceAttributeUpdate(change) {
        return new Promise((resolve) => {
            const accessory = this.getAccessoryFromCache({ deviceid: change.deviceid });
            if (!accessory) {
                this.platform.logError(`Accessory not found for device ID: ${change.deviceid}`);
                resolve(false);
                return;
            }

            // Update the attribute
            if (change.attribute === "isUnavailable") {
                accessory.context.deviceData.isUnavailable = change.value;
                if (change.value) {
                    this.setAccessoryUnavailable(accessory);
                } else {
                    this.setAccessoryAvailable(accessory);
                }
            } else {
                accessory.context.deviceData.attributes[change.attribute] = change.value;
                accessory.context.lastUpdate = new Date().toLocaleString();

                // Get device types and handle updates
                const deviceTypes = this.getDeviceTypes(accessory);
                if (deviceTypes.length > 0) {
                    deviceTypes.forEach((deviceType) => {
                        const typeModule = this.deviceTypes[deviceType.name];
                        if (typeModule && typeof typeModule.handleAttributeUpdate === "function" && typeModule.relevantAttributes.includes(change.attribute)) {
                            typeModule.handleAttributeUpdate(accessory, change, this);
                        }
                    });
                } else {
                    this.platform.logWarn(`No device types found for accessory: ${accessory.name}`);
                }
            }

            resolve(true);
        });
    }

    /**
     * Send a command to a device with debouncing.
     * @param {Function} callback - The callback function.
     * @param {PlatformAccessory} acc - The accessory.
     * @param {string} dev - The device ID.
     * @param {string} cmd - The command to send.
     * @param {any} vals - The values associated with the command.
     */
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

    /**
     * Log characteristic changes.
     * @param {string} attr - The attribute name.
     * @param {Characteristic} char - The characteristic.
     * @param {PlatformAccessory} acc - The accessory.
     * @param {Object} chgObj - The change object containing new and old values.
     */
    log_change(attr, char, acc, chgObj) {
        if (this.platform.logConfig.debug) {
            this.platform.logNotice(`[CHARACTERISTIC (${char.name}) CHANGE] ${attr} (${acc.displayName}) | LastUpdate: (${acc.context.lastUpdate}) | NewValue: (${chgObj.newValue}) | OldValue: (${chgObj.oldValue})`);
        }
    }

    /**
     * Log characteristic get requests.
     * @param {string} attr - The attribute name.
     * @param {Characteristic} char - The characteristic.
     * @param {PlatformAccessory} acc - The accessory.
     * @param {any} val - The value being retrieved.
     */
    log_get(attr, char, acc, val) {
        if (this.platform.logConfig.debug) {
            this.platform.logGreen(`[CHARACTERISTIC (${char.name}) GET] ${attr} (${acc.displayName}) | LastUpdate: (${acc.context.lastUpdate}) | Value: (${val})`);
        }
    }

    /**
     * Log characteristic set requests.
     * @param {string} attr - The attribute name.
     * @param {Characteristic} char - The characteristic.
     * @param {PlatformAccessory} acc - The accessory.
     * @param {any} val - The value being set.
     */
    log_set(attr, char, acc, val) {
        if (this.platform.logConfig.debug) {
            this.platform.logWarn(`[CHARACTERISTIC (${char.name}) SET] ${attr} (${acc.displayName}) | LastUpdate: (${acc.context.lastUpdate}) | Value: (${val})`);
        }
    }

    /**
     * Check if the accessory has a specific capability.
     * @param {string} cap - The capability to check.
     * @returns {boolean} - True if the capability exists, false otherwise.
     */
    hasCapability(cap) {
        const caps = Object.keys(this.context.deviceData.capabilities);
        return caps.includes(cap) || caps.includes(cap.replace(/\s/g, ""));
    }

    /**
     * Get all capabilities of the accessory.
     * @returns {Array<string>} - List of capabilities.
     */
    getCapabilities() {
        return Object.keys(this.context.deviceData.capabilities);
    }

    /**
     * Check if the accessory has a specific attribute.
     * @param {string} attr - The attribute to check.
     * @returns {boolean} - True if the attribute exists, false otherwise.
     */
    hasAttribute(attr) {
        return this.context.deviceData.attributes.hasOwnProperty(attr);
    }

    /**
     * Check if the accessory has a specific command.
     * @param {string} cmd - The command to check.
     * @returns {boolean} - True if the command exists, false otherwise.
     */
    hasCommand(cmd) {
        return this.context.deviceData.commands.hasOwnProperty(cmd);
    }

    /**
     * Check if the accessory has a specific service.
     * @param {Service} service - The service to check.
     * @returns {boolean} - True if the service exists, false otherwise.
     */
    hasService(service) {
        return this.services.map((s) => s.UUID).includes(service.UUID);
    }

    /**
     * Check if the accessory has a specific characteristic within a service.
     * @param {Service} svc - The service containing the characteristic.
     * @param {Characteristic} char - The characteristic to check.
     * @returns {boolean} - True if the characteristic exists, false otherwise.
     */
    hasCharacteristic(svc, char) {
        const service = this.getService(svc);
        return service ? service.getCharacteristic(char) !== undefined : false;
    }

    /**
     * Check if the accessory has a specific device flag.
     * @param {string} flag - The device flag to check.
     * @returns {boolean} - True if the flag exists, false otherwise.
     */
    hasDeviceFlag(flag) {
        return this.context?.deviceData?.deviceflags?.hasOwnProperty(flag) || false;
    }

    /**
     * Get or add a button service by name and subtype.
     * @param {Service} service - The service constructor.
     * @param {string} dispName - The display name of the service.
     * @param {string} subType - The subtype identifier.
     * @returns {Service} - The button service.
     */
    getButtonSvcByName(service, dispName, subType) {
        this.log.debug(`${this.name} | Getting or adding button service: ${dispName} (subType: ${subType})`);
        let svc = this.services.find((s) => s.displayName === dispName && s.subtype === subType);
        if (svc) {
            this.log.debug(`${this.name} | Existing service found for: ${dispName}`);
            return svc;
        } else {
            this.log.debug(`${this.name} | Adding new service for: ${dispName}`);
            svc = new service(dispName, subType);
            this.addService(svc);
            this.serviceUUIDsToKeep.push(svc.UUID);
            return svc;
        }
    }

    /**
     * Remove services that are no longer needed.
     * @param {PlatformAccessory} acc - The accessory from which to remove services.
     * @returns {PlatformAccessory} - The accessory after service removal.
     */
    removeUnusedServices(acc) {
        const newSvcUuids = acc.serviceUUIDsToKeep || [];
        const svcs2rmv = acc.services.filter((s) => !newSvcUuids.includes(s.UUID));
        if (svcs2rmv.length) {
            svcs2rmv.forEach((s) => {
                acc.removeService(s);
                this.platform.logInfo(`Removing Unused Service: ${s.UUID}`);
            });
        } else {
            this.platform.logDebug(`No unused services to remove for ${acc.name}`);
        }
        return acc;
    }

    /**
     * Get the unique identifier for an accessory.
     * @param {PlatformAccessory} accessory - The accessory.
     * @returns {string|undefined} - The accessory ID.
     */
    getAccessoryId(accessory) {
        return accessory.deviceid || accessory.context.deviceData.deviceid || undefined;
    }

    /**
     * Retrieve an accessory from the cache based on device information.
     * @param {Object} device - The device object containing deviceid.
     * @returns {PlatformAccessory|undefined} - The cached accessory.
     */
    getAccessoryFromCache(device) {
        const key = this.getAccessoryId(device);
        return this._platformAccessories[key];
    }

    /**
     * Retrieve all accessories from the cache.
     * @returns {Object} - All cached accessories.
     */
    getAllAccessoriesFromCache() {
        return this._platformAccessories;
    }

    /**
     * Clear the accessory cache and force a device reload.
     */
    clearAccessoryCache() {
        this.platform.logAlert("CLEARING ACCESSORY CACHE AND FORCING DEVICE RELOAD");
        this._platformAccessories = {};
    }

    /**
     * Add an accessory to the cache.
     * @param {PlatformAccessory} accessory - The accessory to add.
     * @returns {boolean} - True if added successfully.
     */
    addAccessoryToCache(accessory) {
        const key = this.getAccessoryId(accessory);
        this._platformAccessories[key] = accessory;
        return true;
    }

    /**
     * Remove an accessory from the cache.
     * @param {PlatformAccessory} accessory - The accessory to remove.
     * @returns {PlatformAccessory|undefined} - The removed accessory.
     */
    removeAccessoryFromCache(accessory) {
        const key = this.getAccessoryId(accessory);
        const removed = this._platformAccessories[key];
        delete this._platformAccessories[key];
        return removed;
    }

    /**
     * Clamp a value between a minimum and maximum.
     * @param {number} value - The value to clamp.
     * @param {number} min - The minimum allowed value.
     * @param {number} max - The maximum allowed value.
     * @returns {number} - The clamped value.
     */
    clamp(value, min, max) {
        return Math.max(min, Math.min(max, value));
    }

    /**
     * Iterate over each accessory and apply a function.
     * @param {Function} fn - The function to apply.
     */
    forEach(fn) {
        return _.forEach(this._platformAccessories, fn);
    }

    /**
     * Find accessories that intersect with the given devices.
     * @param {Array} devices - The list of devices to compare.
     * @returns {Array} - The intersecting accessories.
     */
    intersection(devices) {
        const accessories = _.values(this._platformAccessories);
        return _.intersectionWith(devices, accessories, this.comparator);
    }

    /**
     * Find devices that need to be added.
     * @param {Array} devices - The list of current devices.
     * @returns {Array} - The devices to add.
     */
    diffAdd(devices) {
        const accessories = _.values(this._platformAccessories);
        return _.differenceWith(devices, accessories, this.comparator);
    }

    /**
     * Find accessories that need to be removed.
     * @param {Array} devices - The list of current devices.
     * @returns {Array} - The accessories to remove.
     */
    diffRemove(devices) {
        const accessories = _.values(this._platformAccessories);
        return _.differenceWith(accessories, devices, this.comparator);
    }

    /**
     * Comparator function to determine if two accessories represent the same device.
     * @param {PlatformAccessory} accessory1 - The first accessory.
     * @param {PlatformAccessory} accessory2 - The second accessory.
     * @returns {boolean} - True if they are the same, false otherwise.
     */
    comparator(accessory1, accessory2) {
        return this.getAccessoryId(accessory1) === this.getAccessoryId(accessory2);
    }

    /**
     * Clear an existing timeout and set a new one.
     * @param {NodeJS.Timeout} timeoutReference - The existing timeout reference.
     * @param {Function} fn - The function to execute after the timeout.
     * @param {number} timeoutMs - The timeout duration in milliseconds.
     * @returns {NodeJS.Timeout} - The new timeout reference.
     */
    clearAndSetTimeout(timeoutReference, fn, timeoutMs) {
        if (timeoutReference) clearTimeout(timeoutReference);
        return setTimeout(fn, timeoutMs);
    }
}

// DeviceTypeTest Class
class DeviceTypeTest {
    /**
     * Create a new DeviceTypeTest.
     * @param {string} name - The name of the device type.
     * @param {Function} testFn - The function to test if an accessory matches this device type.
     * @param {boolean} [onlyOnNoGrps=false] - Whether to block this device type if other groups are already found.
     */
    constructor(name, testFn, onlyOnNoGrps = false) {
        this.Name = name;
        this.ImplementsDevice = testFn;
        this.onlyOnNoGrps = onlyOnNoGrps;
    }
}

module.exports = DeviceTypes;
