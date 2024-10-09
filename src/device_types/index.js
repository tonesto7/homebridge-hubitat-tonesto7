// device_types/index.js

const { knownCapabilities, pluginVersion } = require("../libs/Constants");
const fs = require("fs");
const path = require("path");
const _ = require("lodash");
const CommunityTypes = require("../libs/CommunityTypes");

var appEvts;

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
        this.myUtils = platform.myUtils;
        this.log = platform.log;
        this.uuid = platform.uuid;
        this.Service = platform.Service;
        this.Characteristic = platform.Characteristic;
        this.Categories = platform.Categories;
        this.CommunityTypes = CommunityTypes(this.Service, this.Characteristic);
        this.client = platform.client;
        // this.comparator = this.comparator.bind(this);

        // Accessory Cache
        this.services = [];
        this._platformAccessories = {};
        this._buttonMap = {};

        this.deviceTypes = {};
        this.loadDeviceTypesFiles();
        this.deviceTypeMap = this.getDeviceTypeMap();
        this.initializeDeviceTypeTests();
    }

    // Dynamically load all device type modules
    loadDeviceTypesFiles() {
        const deviceTypeFiles = fs.readdirSync(__dirname).filter((file) => file !== "index.js" && file.endsWith(".js"));
        deviceTypeFiles.forEach((file) => {
            const deviceType = require(path.join(__dirname, file));
            const name = path.basename(file, ".js");
            this.deviceTypes[name] = deviceType;
        });
    }

    // Device Type Mapping using a Map for better performance
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

    // Initialize device type tests in a separate configuration
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

    // Determine device types for a given accessory
    getDeviceTypes(accessory) {
        let devicesFound = [];
        let devicesBlocked = [];
        for (let i = 0; i < this.deviceTypeTests.length; i++) {
            const devTest = this.deviceTypeTests[i];
            if (devTest.ImplementsDevice(accessory)) {
                const blockDevice = devTest.onlyOnNoGrps && devicesFound.length > 0;
                if (blockDevice) {
                    devicesBlocked.push(devTest.Name);
                    this.platform.logDebug(`(${accessory.name}) | Device Type BLOCKED | name: ${devTest.Name} | Count: ${devicesFound.length} | devices: ${devicesFound.map((d) => d.name)}`);
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

    // Initialize accessory
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

    // Configure characteristics and services for the accessory
    configureCharacteristics(accessory) {
        const { deviceData } = accessory.context;
        for (let index in deviceData.capabilities) {
            if (knownCapabilities.indexOf(index) === -1 && this.platform.unknownCapabilities.indexOf(index) === -1) this.platform.unknownCapabilities.push(index);
        }
        accessory.context.deviceGroups = [];
        accessory.serviceUUIDsToKeep = [];
        accessory.reachable = true;
        accessory.context.lastUpdate = new Date();

        // Add the AccessoryInformation service
        const accessoryInformationSvc = accessory.getService(this.Service.AccessoryInformation) || accessory.addService(this.Service.AccessoryInformation);
        accessoryInformationSvc
            .setCharacteristic(this.Characteristic.FirmwareRevision, deviceData.firmwareVersion)
            .setCharacteristic(this.Characteristic.Manufacturer, deviceData.manufacturerName)
            .setCharacteristic(this.Characteristic.Model, deviceData.modelName ? this.myUtils.toTitleCase(deviceData.modelName) : "Unknown")
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

    // New method to handle availability
    handleAvailability(accessory) {
        const { isUnavailable } = accessory.context.deviceData;
        if (isUnavailable) {
            this.setAccessoryUnavailable(accessory);
        } else {
            this.setAccessoryAvailable(accessory);
        }
    }

    // Set accessory as unavailable by updating a primary characteristic with an error
    setAccessoryUnavailable(accessory) {
        const primaryService = accessory.getService(this.Service.AccessoryInformation) || accessory.getService(this.Service.Switch); // Choose a primary service
        if (primaryService) {
            // Choose a primary characteristic to set the error, e.g., Name
            primaryService.updateCharacteristic(this.Characteristic.Name, new Error("Device Unavailable"));
            this.platform.logWarn(`Marked ${accessory.name} as Unavailable`);
        }
    }

    // Set accessory as available by resetting the primary characteristic
    setAccessoryAvailable(accessory) {
        const primaryService = accessory.getService(this.Service.AccessoryInformation) || accessory.getService(this.Service.Switch); // Choose a primary service
        if (primaryService) {
            // Reset the primary characteristic, e.g., Name
            primaryService.updateCharacteristic(this.Characteristic.Name, accessory.name);
            this.platform.logInfo(`Marked ${accessory.name} as Available`);
        }
    }

    // Handle device attribute updates
    processDeviceAttributeUpdate(change) {
        return new Promise((resolve) => {
            const accessory = this.getAccessoryFromCache({ deviceid: change.deviceid });
            if (!accessory) {
                this.platform.logError(`Accessory not found for device ID: ${change.deviceid}`);
                resolve(false);
                return;
            }

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

            resolve(true);
        });
    }

    // Send command with debouncing
    sendCommand(callback, acc, dev, cmd, vals) {
        const id = `${cmd}`;
        const tsNow = Date.now();
        let delay = 0;
        let trailing = false;

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
            delay = debounceConfig[cmd].delay;
            trailing = debounceConfig[cmd].trailing;
        } else {
            appEvts.emit("event:device_command", dev, cmd, vals);
            if (callback) callback();
            return;
        }

        if (acc.commandTimers[id]) {
            acc.commandTimers[id].cancel();
            acc.commandTimers[id] = null;
            const lastTS = tsNow - (acc.commandTimersTS[id] || 0);
            if (lastTS < delay) {
                delay = debounceConfig[cmd].delay * 2; // Adjust delay if needed
            }
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

        if (callback) callback();
    }

    // Log characteristic changes
    log_change(attr, char, acc, chgObj) {
        if (this.platform.logConfig.debug) {
            this.platform.logNotice(`[CHARACTERISTIC (${char.name}) CHANGE] ${attr} (${acc.displayName}) | LastUpdate: (${acc.context.lastUpdate}) | NewValue: (${chgObj.newValue}) | OldValue: (${chgObj.oldValue})`);
        }
    }

    // Log characteristic get
    log_get(attr, char, acc, val) {
        if (this.platform.logConfig.debug) {
            this.platform.logGreen(`[CHARACTERISTIC (${char.name}) GET] ${attr} (${acc.displayName}) | LastUpdate: (${acc.context.lastUpdate}) | Value: (${val})`);
        }
    }

    // Log characteristic set
    log_set(attr, char, acc, val) {
        if (this.platform.logConfig.debug) {
            this.platform.logWarn(`[CHARACTERISTIC (${char.name}) SET] ${attr} (${acc.displayName}) | LastUpdate: (${acc.context.lastUpdate}) | Value: (${val})`);
        }
    }

    // Capability checks
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

    // Button Service Management
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

    // Remove unused services
    removeUnusedServices(acc) {
        // console.log("serviceUUIDsToKeep:", acc.serviceUUIDsToKeep);
        let newSvcUuids = acc.serviceUUIDsToKeep || [];
        let svcs2rmv = acc.services.filter((s) => !newSvcUuids.includes(s.UUID));
        if (svcs2rmv.length) {
            svcs2rmv.forEach((s) => {
                acc.removeService(s);
                this.platform.logInfo(`Removing Unused Service: ${s.UUID}`);
            });
        }
        return acc;
    }

    // Accessory Cache Management
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

    // Utility Methods
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

// DeviceTypeTest Class
class DeviceTypeTest {
    constructor(name, testFn, onlyOnNoGrps = false) {
        this.Name = name;
        this.ImplementsDevice = testFn;
        this.onlyOnNoGrps = onlyOnNoGrps;
    }
}

module.exports = DeviceTypes;
