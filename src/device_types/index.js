// device_types/index.js

const { knownCapabilities, pluginVersion } = require("../libs/Constants");
const fs = require("fs");
const path = require("path");
const _ = require("lodash");
// const ServiceTypes = require("../HE_ServiceTypes");
const Transforms = require("../HE_Transforms");
const CommunityTypes = require("../libs/CommunityTypes");

var appEvts;

module.exports = class DeviceTypes {
    constructor(platform) {
        this.mainPlatform = platform;

        // console.log(platform.appEvts);
        appEvts = platform.appEvts;

        if (!appEvts) {
            this.mainPlatform.logError("appEvts is not initialized in DeviceTypes");
        } else {
            this.mainPlatform.logDebug("appEvts successfully initialized in DeviceTypes");
        }

        this.configItems = platform.getConfigItems();
        this.homebridge = platform.homebridge;
        this.myUtils = platform.myUtils;
        this.log = platform.log;
        this.hap = platform.hap;
        this.uuid = platform.uuid;
        this._ = _;
        this.Service = platform.Service;
        this.Characteristic = platform.Characteristic;
        this.Catagories = platform.Catagories;
        this.CommunityTypes = CommunityTypes(this.Service, this.Characteristic);
        this.client = platform.client;
        this.comparator = this.comparator.bind(this);
        this.transforms = new Transforms(this, this.Characteristic);
        // this.serviceTypes = new ServiceTypes(this, this.Service);
        this.services = [];
        this._platformAccessories = {};
        this._buttonMap = {};
        this._attributeLookup = {};

        this.deviceTypes = {};
        this.loadDeviceTypesFiles();
        this.deviceTypeMap = this.getDeviceTypeMap();
        this.initializeDeviceTypeTests();
    }

    loadDeviceTypesFiles() {
        // get all files in the device_types directory that end in .js and aren't index.js
        const deviceTypeFiles = fs.readdirSync(__dirname).filter((file) => file !== "index.js" && file.endsWith(".js"));
        deviceTypeFiles.forEach((file) => {
            const deviceType = require(path.join(__dirname, file));
            const name = path.basename(file, ".js");
            this.deviceTypes[name] = deviceType;
        });
    }

    getDeviceTypes(accessory) {
        let devicesFound = [];
        let devicesBlocked = [];
        for (let i = 0; i < this.deviceTypeTests.length; i++) {
            const devTest = this.deviceTypeTests[i];
            if (devTest.ImplementsDevice(accessory)) {
                const blockDevice = devTest.onlyOnNoGrps === true && devicesFound.length > 0;
                if (blockDevice) {
                    devicesBlocked.push(devTest.Name);
                    this.mainPlatform.logDebug(`(${accessory.name}) | Device Type BLOCKED | name: ${devTest.Name} | Cnt: ${devicesFound.length} | devices: ${JSON.stringify(devicesFound)}`);
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
            this.mainPlatform.logDebug(`(${accessory.name}) | Device Types BLOCKED | ${devicesBlocked}`);
        }
        return devicesFound;
    }

    initializeAccessory(accessory, fromCache = false) {
        accessory.deviceid = accessory.context.deviceData.deviceid;
        accessory.name = accessory.context.deviceData.name;
        if (!fromCache) {
            accessory.context.deviceData.excludedCapabilities.forEach((cap) => {
                if (cap !== undefined) {
                    this.mainPlatform.logDebug(`Removing capability: ${cap} from Device: ${accessory.name}`);
                    delete accessory.context.deviceData.capabilities[cap];
                }
            });
        } else {
            this.mainPlatform.logDebug(`Initializing Cached Device ${accessory.name} | ${accessory.deviceid}`);
        }
        try {
            accessory.commandTimers = {};
            accessory.commandTimersTS = {};
            accessory.context.uuid = accessory.UUID || this.uuid.generate(`hubitat_v2_${accessory.deviceid}`);
            accessory.log = this.log;
            accessory.homebridgeApi = this.homebridge;
            accessory.getPlatformConfig = this.mainPlatform.getConfigItems();
            accessory.getOrAddService = this.getOrAddService.bind(accessory);
            accessory.getOrAddServiceByName = this.getOrAddServiceByName.bind(accessory);
            accessory.getOrAddCharacteristic = this.getOrAddCharacteristic.bind(accessory);
            accessory.hasCapability = this.hasCapability.bind(accessory);
            accessory.getCapabilities = this.getCapabilities.bind(accessory);
            accessory.hasAttribute = this.hasAttribute.bind(accessory);
            accessory.hasCommand = this.hasCommand.bind(accessory);
            accessory.hasDeviceFlag = this.hasDeviceFlag.bind(accessory);
            accessory.hasService = this.hasService.bind(accessory);
            accessory.hasCharacteristic = this.hasCharacteristic.bind(accessory);
            accessory.updateDeviceAttr = this.updateDeviceAttr.bind(accessory);
            accessory.updateCharacteristicVal = this.updateCharacteristicVal.bind(accessory);
            // accessory.manageGetCharacteristic = this.device_types.manageGetCharacteristic.bind(accessory);
            // accessory.manageGetSetCharacteristic = this.device_types.manageGetSetCharacteristic.bind(accessory);
            accessory.setServiceLabelIndex = this.setServiceLabelIndex.bind(accessory);
            accessory.sendCommand = this.sendCommand.bind(accessory);
            accessory.platformConfigItems = this.configItems;
            // console.log("accessory:", accessory);
            // Adaptive Lighting Controller Functions
            accessory.isAdaptiveLightingSupported = (this.homebridge.version >= 2.7 && this.homebridge.versionGreaterOrEqual("1.3.0-beta.19")) || !!this.homebridge.hap.AdaptiveLightingController; // support check on Hoobs

            return this.configureCharacteristics(accessory);
        } catch (err) {
            this.mainPlatform.logError(`initializeAccessory (fromCache: ${fromCache}) | Name: ${accessory.name} | Error: ` + err);
            console.error(err);
            return accessory;
        }
    }

    configureCharacteristics(accessory) {
        for (let index in accessory.context.deviceData.capabilities) {
            if (knownCapabilities.indexOf(index) === -1 && this.mainPlatform.unknownCapabilities.indexOf(index) === -1) this.mainPlatform.unknownCapabilities.push(index);
        }
        accessory.context.deviceGroups = [];
        accessory.servicesToKeep = [];
        accessory.reachable = true;
        accessory.context.lastUpdate = new Date();

        let accessoryInformation = accessory
            .getOrAddService(this.Service.AccessoryInformation)
            .setCharacteristic(this.Characteristic.FirmwareRevision, accessory.context.deviceData.firmwareVersion)
            .setCharacteristic(this.Characteristic.Manufacturer, accessory.context.deviceData.manufacturerName)
            .setCharacteristic(this.Characteristic.Model, accessory.context.deviceData.modelName ? `${this.myUtils.toTitleCase(accessory.context.deviceData.modelName)}` : "Unknown")
            .setCharacteristic(this.Characteristic.Name, accessory.name)

            .setCharacteristic(this.Characteristic.HardwareRevision, pluginVersion)
            .setCharacteristic(this.Characteristic.SerialNumber, "he_deviceid_" + accessory.context.deviceData.deviceid);
        accessory.servicesToKeep.push(this.Service.AccessoryInformation.UUID);

        if (!accessoryInformation.listeners("identify")) {
            accessoryInformation.on("identify", function (paired, callback) {
                this.mainPlatform.logInfo(accessory.displayName + " - identify");
                callback();
            });
        }

        const deviceTypes = this.getDeviceTypes(accessory);
        if (deviceTypes && deviceTypes.length > 0) {
            deviceTypes.forEach((deviceType) => {
                if (deviceType.name && deviceType.type) {
                    this.mainPlatform.logDebug(`${accessory.name} | ${deviceType.name}`);
                    if (this.deviceTypes[deviceType.name]) {
                        const service = this.deviceTypes[deviceType.name].initializeAccessory(accessory, this);
                        if (service) {
                            accessory.servicesToKeep.push(service.UUID);
                        }
                        // Add the corresponding service UUID from the deviceTypeMap
                        if (this.deviceTypeMap[deviceType.name]) {
                            accessory.servicesToKeep.push(this.deviceTypeMap[deviceType.name].UUID);
                        }
                    } else {
                        this.mainPlatform.logError(`Device type ${deviceType.name} not found for ${accessory.name}`);
                    }
                }
            });
        } else {
            throw "Unable to determine the device type of " + accessory.deviceid;
        }

        return this.removeUnusedServices(accessory);
    }

    processDeviceAttributeUpdate(change) {
        return new Promise((resolve) => {
            // this.mainPlatform.logInfo("change: ", change);
            // console.log("change: ", change);
            let characteristics = this.getAttributeStoreItem(change.attribute, change.deviceid);
            let accessory = this.getAccessoryFromCache(change);
            // console.log(characteristics);
            if (!characteristics || !accessory) resolve(false);
            if (characteristics instanceof Array) {
                characteristics.forEach((char) => {
                    const currentVal = accessory.context.deviceData.attributes[change.attribute];
                    accessory.context.deviceData.attributes[change.attribute] = change.value;
                    accessory.context.lastUpdate = new Date().toLocaleString();
                    if (change.attribute === "thermostatSetpoint") {
                        // don't remember why i'm doing this...
                        char.getValue();
                    } else if (change.attribute === "button") {
                        // this.mainPlatform.logInfo("button change: " + change);
                        const btnNum = change.data && change.data.buttonNumber ? change.data.buttonNumber : 1;
                        if (btnNum && accessory.buttonEvent !== undefined) {
                            accessory.buttonEvent(btnNum, change.value, change.deviceid, this._buttonMap);
                        }
                    } else {
                        const val = this.transforms.transformAttributeState(change.attribute, change.value, char.displayName);
                        if (val === null || val === undefined) {
                            console.log("change:", change);
                            console.log("char: ", char.props);
                            this.mainPlatform.logWarn(`[${accessory.context.deviceData.name}] Attribute (${change.attribute}) | OldValue: ${currentVal} | NewValueIn: [${change.value}] | NewValueOut: [${val}] | Characteristic: (${char.displayName}`);
                        } else {
                            char.updateValue(val);
                        }
                    }
                });
                resolve(this.addAccessoryToCache(accessory));
            } else {
                resolve(false);
            }
        });
    }

    sendCommand(callback, acc, dev, cmd, vals) {
        const id = `${cmd}`;
        const tsNow = Date.now();
        let d = 0;
        let b = false;
        let d2;
        let o = {};
        switch (cmd) {
            case "setLevel":
            case "setVolume":
            case "setSpeed":
            case "setSaturation":
            case "setHue":
            case "setColorTemperature":
            case "setHeatingSetpoint":
            case "setCoolingSetpoint":
            case "setThermostatSetpoint":
                d = 600;
                d2 = 1500;
                o.trailing = true;
                break;
            case "setThermostatMode":
                d = 600;
                d2 = 1500;
                o.trailing = true;
                break;
            default:
                b = true;
                break;
        }

        if (b) {
            appEvts.emit("event:device_command", dev, cmd, vals);
        } else {
            let lastTS = acc.commandTimersTS[id] && tsNow ? tsNow - acc.commandTimersTS[id] : undefined;
            // console.log("lastTS: " + lastTS, ' | ts:', acc.commandTimersTS[id]);
            if (acc.commandTimers[id] && acc.commandTimers[id] !== null) {
                acc.commandTimers[id].cancel();
                acc.commandTimers[id] = null;
                // console.log('lastTS: ', lastTS, ' | now:', tsNow, ' | last: ', acc.commandTimersTS[id]);
                // console.log(`Existing Command Found | Command: ${cmd} | Vals: ${vals} | Executing in (${d}ms) | Last Cmd: (${lastTS ? (lastTS/1000).toFixed(1) : "unknown"}sec) | Id: ${id} `);
                if (lastTS && lastTS < d) {
                    d = d2 || 0;
                }
            }
            acc.commandTimers[id] = _.debounce(
                async () => {
                    acc.commandTimersTS[id] = tsNow;
                    appEvts.emit("event:device_command", dev, cmd, vals);
                },
                d,
                o,
            );
            acc.commandTimers[id]();
        }
        if (callback) {
            callback();
            callback = undefined;
        }
    }

    log_change(attr, char, acc, chgObj) {
        if (this.mainPlatform.logConfig.debug === true) this.mainPlatform.logNotice(`[CHARACTERISTIC (${char.name}) CHANGE] ${attr} (${acc.displayName}) | LastUpdate: (${acc.context.lastUpdate}) | NewValue: (${chgObj.newValue}) | OldValue: (${chgObj.oldValue})`);
    }

    log_get(attr, char, acc, val) {
        if (this.mainPlatform.logConfig.debug === true) this.mainPlatform.logGreen(`[CHARACTERISTIC (${char.name}) GET] ${attr} (${acc.displayName}) | LastUpdate: (${acc.context.lastUpdate}) | Value: (${val})`);
    }

    log_set(attr, char, acc, val) {
        if (this.mainPlatform.logConfig.debug === true) this.mainPlatform.logWarn(`[CHARACTERISTIC (${char.name}) SET] ${attr} (${acc.displayName}) | LastUpdate: (${acc.context.lastUpdate}) | Value: (${val})`);
    }

    hasCapability(obj) {
        let keys = Object.keys(this.context.deviceData.capabilities);
        if (keys.includes(obj) || keys.includes(obj.toString().replace(/\s/g, ""))) return true;
        return false;
    }

    getCapabilities() {
        return Object.keys(this.context.deviceData.capabilities);
    }

    hasAttribute(attr) {
        return Object.keys(this.context.deviceData.attributes).includes(attr) || false;
    }

    hasCommand(cmd) {
        return Object.keys(this.context.deviceData.commands).includes(cmd) || false;
    }

    getCommands() {
        return Object.keys(this.context.deviceData.commands);
    }

    hasService(service) {
        return this.services.map((s) => s.UUID).includes(service.UUID) || false;
    }

    hasCharacteristic(svc, char) {
        let s = this.getService(svc) || undefined;
        return (s && s.getCharacteristic(char) !== undefined) || false;
    }

    updateCharacteristicVal(svc, char, val) {
        this.getOrAddService(svc).setCharacteristic(char, val);
    }

    updateCharacteristicProps(svc, char, props) {
        this.getOrAddService(svc).getCharacteristic(char).setProps(props);
    }

    hasDeviceFlag(flag) {
        return (this.context && this.context.deviceData && this.context.deviceData.deviceflags && Object.keys(this.context.deviceData.deviceflags).includes(flag)) || false;
    }

    updateDeviceAttr(attr, val) {
        this.context.deviceData.attributes[attr] = val;
    }

    getOrAddService(svc) {
        return this.getService(svc) || this.addService(svc);
    }

    getOrAddServiceByName(service, dispName, subType) {
        // console.log(this.services);
        let svc = this.services.find((s) => s.displayName === dispName);
        if (svc) {
            // console.log('service found');
            return svc;
        } else {
            // console.log('service not found adding new one...');
            svc = this.addService(new service(dispName, subType));
            return svc;
        }
    }

    getServiceByNameType(service, dispName, subType) {
        return dispName ? this.services.find((s) => (subType ? s.displayName === dispName && s.subType === subType : s.displayName === dispName)) : undefined;
    }

    setServiceLabelIndex(service, index) {
        service.setCharacteristic(this.Characteristic.ServiceLabelIndex, index);
    }

    getOrAddCharacteristic(service, characteristic) {
        return service.getCharacteristic(characteristic) || service.addCharacteristic(characteristic);
    }

    getServices() {
        return this.services;
    }

    removeUnusedServices(acc) {
        // console.log('servicesToKeep:', acc.servicesToKeep);
        let newSvcUuids = acc.servicesToKeep || [];
        let svcs2rmv = acc.services.filter((s) => !newSvcUuids.includes(s.UUID));
        if (Object.keys(svcs2rmv).length) {
            svcs2rmv.forEach((s) => {
                acc.removeService(s);
                this.mainPlatform.logInfo("Removing Unused Service: " + s.UUID);
            });
        }
        return acc;
    }

    storeCharacteristicItem(attr, devid, char) {
        // console.log('storeCharacteristicItem: ', attr, devid, char);
        if (!this._attributeLookup[attr]) {
            this._attributeLookup[attr] = {};
        }
        if (!this._attributeLookup[attr][devid]) {
            this._attributeLookup[attr][devid] = [];
        }
        this._attributeLookup[attr][devid].push(char);
    }

    getAttributeStoreItem(attr, devid) {
        if (!this._attributeLookup[attr] || !this._attributeLookup[attr][devid]) {
            return undefined;
        }
        return this._attributeLookup[attr][devid] || undefined;
    }

    removeAttributeStoreItem(attr, devid) {
        if (!this._attributeLookup[attr] || !this._attributeLookup[attr][devid]) return;
        delete this._attributeLookup[attr][devid];
    }

    getDeviceAttributeValueFromCache(device, attr) {
        const key = this.getAccessoryId(device);
        let result = this._platformAccessories[key] ? this._platformAccessories[key].context.deviceData.attributes[attr] : undefined;
        this.mainPlatform.logInfo(`Attribute (${attr}) Value From Cache: [${result}]`);
        return result;
    }

    getAccessoryId(accessory) {
        const id = accessory.deviceid || accessory.context.deviceData.deviceid || undefined;
        return id;
    }

    getAccessoryFromCache(device) {
        const key = this.getAccessoryId(device);
        return this._platformAccessories[key];
    }

    getAllAccessoriesFromCache() {
        return this._platformAccessories;
    }

    clearAccessoryCache() {
        this.mainPlatform.logAlert("CLEARING ACCESSORY CACHE AND FORCING DEVICE RELOAD");
        this._platformAccessories = {};
    }

    addAccessoryToCache(accessory) {
        const key = this.getAccessoryId(accessory);
        this._platformAccessories[key] = accessory;
        return true;
    }

    removeAccessoryFromCache(accessory) {
        const key = this.getAccessoryId(accessory);
        const _accessory = this._platformAccessories[key];
        delete this._platformAccessories[key];
        return _accessory;
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
            // energy_meter: this.Service.Switch,
            fan: this.Service.Fanv2,
            garage_door: this.Service.GarageDoorOpener,
            humidity_sensor: this.Service.HumiditySensor,
            illuminance_sensor: this.Service.LightSensor,
            light: this.Service.Lightbulb,
            lock: this.Service.LockMechanism,
            motion_sensor: this.Service.MotionSensor,
            // power_meter: this.Service.Switch,
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

    initializeDeviceTypeTests() {
        this.deviceTypeTests = [
            new DeviceTypeTest("window_shade", (accessory) => accessory.hasCapability("WindowShade") && !(accessory.hasCapability("Speaker") || accessory.hasCapability("Fan") || accessory.hasCapability("Fan Control")), true),
            new DeviceTypeTest(
                "light",
                (accessory) =>
                    accessory.hasCapability("Switch Level") &&
                    (accessory.hasCapability("LightBulb") || accessory.hasCapability("Bulb") || accessory.context.deviceData.name.toLowerCase().includes("light") || accessory.hasAttribute("saturation") || accessory.hasAttribute("hue") || accessory.hasAttribute("colorTemperature") || accessory.hasCapability("Color Control")),
                true,
            ),
            // new ServiceTDeviceTypeTestest("air_purifier", (accessory) => accessory.hasCapability("custom.airPurifierOperationMode")),
            new DeviceTypeTest("garage_door", (accessory) => accessory.hasCapability("GarageDoorControl")),
            new DeviceTypeTest("lock", (accessory) => accessory.hasCapability("Lock")),
            new DeviceTypeTest("valve", (accessory) => accessory.hasCapability("Valve")),
            new DeviceTypeTest("speaker", (accessory) => accessory.hasCapability("Speaker")),
            new DeviceTypeTest("fan", (accessory) => accessory.hasCapability("Fan") || accessory.hasCapability("FanControl") || (this.configItems.consider_fan_by_name && accessory.context.deviceData.name.toLowerCase().includes("fan")) || accessory.hasCommand("setSpeed") || accessory.hasAttribute("speed")),
            new DeviceTypeTest("virtual_mode", (accessory) => accessory.hasCapability("Mode")),
            new DeviceTypeTest("virtual_piston", (accessory) => accessory.hasCapability("Piston")),
            new DeviceTypeTest("virtual_routine", (accessory) => accessory.hasCapability("Routine")),
            new DeviceTypeTest("button", (accessory) => accessory.hasCapability("Button") || accessory.hasCapability("DoubleTapableButton") || accessory.hasCapability("HoldableButton") || accessory.hasCapability("PushableButton") || accessory.hasCapability("ReleasableButton")),
            new DeviceTypeTest("light", (accessory) => accessory.hasCapability("Switch") && (accessory.hasCapability("LightBulb") || accessory.hasCapability("Bulb") || (this.configItems.consider_light_by_name && accessory.context.deviceData.name.toLowerCase().includes("light"))), true),
            new DeviceTypeTest("outlet", (accessory) => accessory.hasCapability("Outlet") && accessory.hasCapability("Switch"), true),
            new DeviceTypeTest(
                "switch_device",
                (accessory) => accessory.hasCapability("Switch") && !(accessory.hasCapability("LightBulb") || accessory.hasCapability("Outlet") || accessory.hasCapability("Bulb") || (this.configItems.consider_light_by_name && accessory.context.deviceData.name.toLowerCase().includes("light")) || accessory.hasCapability("Button")),
                true,
            ),
            new DeviceTypeTest("smoke_detector", (accessory) => accessory.hasCapability("SmokeDetector") && accessory.hasAttribute("smoke")),
            new DeviceTypeTest("carbon_monoxide", (accessory) => accessory.hasCapability("CarbonMonoxideDetector") && accessory.hasAttribute("carbonMonoxide")),
            new DeviceTypeTest("carbon_dioxide", (accessory) => accessory.hasCapability("CarbonDioxideMeasurement") && accessory.hasAttribute("carbonDioxideMeasurement")),
            new DeviceTypeTest("motion_sensor", (accessory) => accessory.hasCapability("Motion Sensor")),
            new DeviceTypeTest("acceleration_sensor", (accessory) => accessory.hasCapability("Acceleration Sensor")),
            new DeviceTypeTest("water_sensor", (accessory) => accessory.hasCapability("Water Sensor")),
            new DeviceTypeTest("presence_sensor", (accessory) => accessory.hasCapability("PresenceSensor")),
            new DeviceTypeTest("humidity_sensor", (accessory) => accessory.hasCapability("RelativeHumidityMeasurement") && accessory.hasAttribute("humidity") && !(accessory.hasCapability("Thermostat") || accessory.hasCapability("ThermostatOperatingState") || accessory.hasAttribute("thermostatOperatingState"))),
            new DeviceTypeTest("temperature_sensor", (accessory) => accessory.hasCapability("TemperatureMeasurement") && !(accessory.hasCapability("Thermostat") || accessory.hasCapability("ThermostatOperatingState") || accessory.hasAttribute("thermostatOperatingState"))),
            new DeviceTypeTest("illuminance_sensor", (accessory) => accessory.hasCapability("IlluminanceMeasurement")),
            new DeviceTypeTest("contact_sensor", (accessory) => accessory.hasCapability("ContactSensor") && !accessory.hasCapability("GarageDoorControl")),
            new DeviceTypeTest("air_quality", (accessory) => accessory.hasCapability("airQuality") || accessory.hasCapability("AirQuality")),
            new DeviceTypeTest("battery", (accessory) => accessory.hasCapability("Battery")),
            // new DeviceTypeTest("energy_meter", accessory => (accessory.hasCapability('Energy Meter') && !accessory.hasCapability('Switch')), true),
            // new ServiDeviceTypeTestceTest("power_meter", accessory => (accessory.hasCapability('Power Meter') && !accessory.hasCapability('Switch')), true),
            new DeviceTypeTest("thermostat", (accessory) => accessory.hasCapability("Thermostat") || accessory.hasCapability("ThermostatOperatingState") || accessory.hasAttribute("thermostatOperatingState")),
            new DeviceTypeTest("thermostat_fan", (accessory) => accessory.hasCapability("Thermostat") && accessory.hasAttribute("thermostatFanMode") && accessory.hasCommand("fanAuto") && accessory.hasCommand("fanOn")),
            new DeviceTypeTest("alarm_system", (accessory) => accessory.hasAttribute("alarmSystemStatus")),
        ];
    }
};

class DeviceTypeTest {
    constructor(name, testfn, onlyOnNoGrps = false) {
        this.ImplementsDevice = testfn;
        this.Name = name;
        this.onlyOnNoGrps = onlyOnNoGrps !== false;
    }
}
