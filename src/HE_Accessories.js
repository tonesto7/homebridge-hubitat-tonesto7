// HE_Accessories.js

import { knownCapabilities, pluginVersion } from "./Constants.js";
// import _ from "lodash";
import ServiceTypes from "./HE_ServiceTypes.js";
import Transforms from "./HE_Transforms.js";
import DeviceTypes from "./HE_DeviceCharacteristics.js";

let appEvts;

export default class HE_Accessories {
    constructor(platform) {
        this.platform = platform;
        appEvts = platform.appEvts;
        this.config = platform.configManager.getConfig();

        // Subscribe to configuration updates
        this.platform.configManager.onConfigUpdate((newConfig) => {
            // console.log("Client Config Update:", newConfig);
            this.config = newConfig;
        });

        this.homebridge = platform.homebridge;
        this.log = platform.log;
        this.hap = platform.hap;
        this.uuid = platform.uuid;

        this.Service = platform.Service;
        this.Characteristic = platform.Characteristic;
        this.Catagories = platform.Catagories;
        this.CommunityTypes = platform.CommunityTypes;
        this.client = platform.client;
        this.comparator = this.comparator.bind(this);
        this.transforms = new Transforms(this);
        this.serviceTypes = new ServiceTypes(this);
        this.device_types = new DeviceTypes(this);
        this._platformAccessories = new Map();
        this._buttonMap = {};
        this._attributeLookup = {};
    }

    initializeAccessory(accessory, fromCache = false) {
        accessory.deviceid = accessory.context.deviceData.deviceid;
        accessory.name = accessory.context.deviceData.name;
        if (!fromCache) {
            accessory.context.deviceData.excludedCapabilities.forEach((cap) => {
                if (cap !== undefined) {
                    this.platform.logDebug(`Removing capability: ${cap} from Device: ${accessory.name}`);
                    delete accessory.context.deviceData.capabilities[cap];
                }
            });
        } else {
            this.platform.logDebug(`Initializing Cached Device ${accessory.name} | ${accessory.deviceid}`);
        }
        try {
            accessory.commandTimers = {};
            accessory.commandTimersTS = {};
            accessory.context.uuid = accessory.UUID || this.uuid.generate(`hubitat_v2_${accessory.deviceid}`);
            accessory.log = this.log;
            accessory.homebridgeApi = this.homebridge;
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
            accessory.manageGetCharacteristic = this.device_types.manageGetCharacteristic.bind(accessory);
            accessory.manageGetSetCharacteristic = this.device_types.manageGetSetCharacteristic.bind(accessory);
            accessory.setServiceLabelIndex = this.setServiceLabelIndex.bind(accessory);
            accessory.sendCommand = this.sendCommand.bind(accessory);
            // console.log("accessory:", accessory);
            // Adaptive Lighting Controller Functions
            accessory.isAdaptiveLightingSupported = (this.homebridge.version >= 2.7 && this.homebridge.versionGreaterOrEqual("1.3.0-beta.19")) || !!this.homebridge.hap.AdaptiveLightingController; // support check on Hoobs
            accessory.addAdaptiveLightingController = this.addAdaptiveLightingController.bind(accessory);
            accessory.removeAdaptiveLightingController = this.removeAdaptiveLightingController.bind(accessory);
            accessory.getAdaptiveLightingController = this.getAdaptiveLightingController.bind(accessory);
            accessory.isAdaptiveLightingActive = this.isAdaptiveLightingActive.bind(accessory);
            accessory.getAdaptiveLightingData = this.getAdaptiveLightingData.bind(accessory);
            accessory.disableAdaptiveLighting = this.disableAdaptiveLighting.bind(accessory);
            return this.configureCharacteristics(accessory);
        } catch (err) {
            this.platform.logError(`initializeAccessory (fromCache: ${fromCache}) | Name: ${accessory.name} | Error: ` + err);
            console.error(err);
            return accessory;
        }
    }

    configureCharacteristics(accessory) {
        for (let index in accessory.context.deviceData.capabilities) {
            if (knownCapabilities.indexOf(index) === -1 && this.platform.unknownCapabilities.indexOf(index) === -1) this.platform.unknownCapabilities.push(index);
        }
        accessory.context.deviceGroups = [];
        accessory.servicesToKeep = [];
        accessory.reachable = true;
        accessory.context.lastUpdate = new Date();

        let accessoryInformation = accessory
            .getOrAddService(this.Service.AccessoryInformation)
            .setCharacteristic(this.Characteristic.FirmwareRevision, accessory.context.deviceData.firmwareVersion)
            .setCharacteristic(this.Characteristic.Manufacturer, accessory.context.deviceData.manufacturerName)
            .setCharacteristic(this.Characteristic.Model, accessory.context.deviceData.modelName ? `${this.platform.toTitleCase(accessory.context.deviceData.modelName)}` : "Unknown")
            .setCharacteristic(this.Characteristic.Name, accessory.name)

            .setCharacteristic(this.Characteristic.HardwareRevision, pluginVersion)
            .setCharacteristic(this.Characteristic.SerialNumber, "he_deviceid_" + accessory.context.deviceData.deviceid);
        accessory.servicesToKeep.push(this.Service.AccessoryInformation.UUID);

        if (!accessoryInformation.listeners("identify")) {
            accessoryInformation.on("identify", function (paired, callback) {
                this.platform.logInfo(accessory.displayName + " - identify");
                callback();
            });
        }

        let svcTypes = this.serviceTypes.getServiceTypes(accessory);
        if (svcTypes) {
            svcTypes.forEach((svc) => {
                if (svc.name && svc.type) {
                    this.platform.logDebug(`${accessory.name} | ${svc.name}`);
                    accessory.servicesToKeep.push(svc.type.UUID);
                    this.device_types[svc.name](accessory, svc.type);
                }
            });
        } else {
            throw "Unable to determine the service type of " + accessory.deviceid;
        }
        return this.removeUnusedServices(accessory);
    }

    processDeviceAttributeUpdate(change) {
        return new Promise((resolve) => {
            // this.logInfo("change: ", change);
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
                        // this.logInfo("button change: " + change);
                        const btnNum = change.data && change.data.buttonNumber ? change.data.buttonNumber : 1;
                        if (btnNum && accessory.buttonEvent !== undefined) {
                            accessory.buttonEvent(btnNum, change.value, change.deviceid, this._buttonMap);
                        }
                    } else {
                        const val = this.transforms.transformAttributeState(change.attribute, change.value, char.displayName);
                        if (val === null || val === undefined) {
                            console.log("change:", change);
                            console.log("char: ", char.props);
                            this.platform.logWarn(`[${accessory.context.deviceData.name}] Attribute (${change.attribute}) | OldValue: ${currentVal} | NewValueIn: [${change.value}] | NewValueOut: [${val}] | Characteristic: (${char.displayName}`);
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
            acc.commandTimers[id] = debounce(
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
        if (this.config.logConfig.debug === true) this.platform.logNotice(`[CHARACTERISTIC (${char.name}) CHANGE] ${attr} (${acc.displayName}) | LastUpdate: (${acc.context.lastUpdate}) | NewValue: (${chgObj.newValue}) | OldValue: (${chgObj.oldValue})`);
    }

    log_get(attr, char, acc, val) {
        if (this.config.logConfig.debug === true) this.platform.logGreen(`[CHARACTERISTIC (${char.name}) GET] ${attr} (${acc.displayName}) | LastUpdate: (${acc.context.lastUpdate}) | Value: (${val})`);
    }

    log_set(attr, char, acc, val) {
        if (this.config.logConfig.debug === true) this.platform.logWarn(`[CHARACTERISTIC (${char.name}) SET] ${attr} (${acc.displayName}) | LastUpdate: (${acc.context.lastUpdate}) | Value: (${val})`);
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
                this.platform.logInfo("Removing Unused Service: " + s.UUID);
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
        this.platform.logInfo(`Attribute (${attr}) Value From Cache: [${result}]`);
        return result;
    }

    getAccessoryId(accessory) {
        const id = accessory.deviceid || accessory.context.deviceData.deviceid || undefined;
        return id;
    }

    getAccessoryFromCache(device) {
        const key = this.getAccessoryId(device);
        return this._platformAccessories.get(key);
    }

    getAllAccessoriesFromCache() {
        return this._platformAccessories;
    }

    clearAccessoryCache() {
        this.platform.logAlert("CLEARING ACCESSORY CACHE AND FORCING DEVICE RELOAD");
        this._platformAccessories = new Map();
    }

    addAccessoryToCache(accessory) {
        const key = this.getAccessoryId(accessory);
        this._platformAccessories.set(key, accessory);
        return true;
    }

    removeAccessoryFromCache(accessory) {
        const key = this.getAccessoryId(accessory);
        const _accessory = this._platformAccessories.get(key);
        this._platformAccessories.delete(key);
        return _accessory;
    }

    forEach(fn) {
        return _forEach(this._platformAccessories, fn);
    }

    intersection(devices) {
        const accessories = Array.from(this._platformAccessories.values());
        return devices.filter((device) => accessories.some((accessory) => this.comparator(device, accessory)));
    }

    diffAdd(devices) {
        const accessories = Array.from(this._platformAccessories.values());
        return devices.filter((device) => !accessories.some((accessory) => this.comparator(device, accessory)));
    }

    diffRemove(devices) {
        const accessories = Array.from(this._platformAccessories.values());
        return accessories.filter((accessory) => !devices.some((device) => this.comparator(accessory, device)));
    }

    comparator(accessory1, accessory2) {
        const id1 = accessory1.deviceid || accessory1.context.deviceData.deviceid;
        const id2 = accessory2.deviceid || accessory2.context.deviceData.deviceid;
        return id1 === id2;
    }

    clearAndSetTimeout(timeoutReference, fn, timeoutMs) {
        if (timeoutReference) clearTimeout(timeoutReference);
        return setTimeout(fn, timeoutMs);
    }

    // Adaptive Lighting Functions
    addAdaptiveLightingController(_accessory, _service) {
        return;
        const svc = _accessory.getOrAddService(_service);
        console.log(this.config);
        const offset = this.config.adaptive_lighting_offset || 0;
        const controlMode = this.homebridge.hap.AdaptiveLightingControllerMode.AUTOMATIC;
        if (svc) {
            this.adaptiveLightingController = new this.homebridge.hap.AdaptiveLightingController(svc, { controllerMode: controlMode, customTemperatureAdjustment: offset });
            this.adaptiveLightingController.on("update", (evt) => {
                this.platform.logDebug(`[${_accessory.context.deviceData.name}] Adaptive Lighting Controller Update Event: `, evt);
            });
            this.adaptiveLightingController.on("disable", (evt) => {
                this.platform.logDebug(`[${_accessory.context.deviceData.name}] Adaptive Lighting Controller Disabled Event: `, evt);
            });

            // Configure the Adaptive Lighting Controller with the accessory and HAP service
            this.configureController(this.adaptiveLightingController);
            this.platform.logInfo(`Adaptive Lighting Supported... Assigning Adaptive Lighting Controller to [${this.context.deviceData.name}]!!!`);
        } else {
            this.platform.logError("Unable to add adaptiveLightingController because the required service parameter was missing...");
        }
    }

    removeAdaptiveLightingController() {
        if (this.adaptiveLightingController) {
            this.platform.logInfo(`Adaptive Lighting Not Supported... Removing Adaptive Lighting Controller from [${this.context.deviceData.name}]!!!`);
            this.removeController(this.adaptiveLightingController);
            delete this["adaptiveLightingController"];
        }
    }

    getAdaptiveLightingController() {
        return this.adaptiveLightingController || undefined;
    }

    isAdaptiveLightingActive() {
        return this.adaptiveLightingController ? this.adaptiveLightingController.isAdaptiveLightingActive() : false;
    }

    getAdaptiveLightingData() {
        if (this.adaptiveLightingController) {
            return {
                isActive: this.adaptiveLightingController.disableAdaptiveLighting(),
                brightnessMultiplierRange: this.adaptiveLightingController.getAdaptiveLightingBrightnessMultiplierRange(),
                notifyIntervalThreshold: this.adaptiveLightingController.getAdaptiveLightingNotifyIntervalThreshold(),
                startTimeOfTransition: this.adaptiveLightingController.getAdaptiveLightingStartTimeOfTransition(),
                timeOffset: this.adaptiveLightingController.getAdaptiveLightingTimeOffset(),
                transitionCurve: this.adaptiveLightingController.getAdaptiveLightingTransitionCurve(),
                updateInterval: this.adaptiveLightingController.getAdaptiveLightingUpdateInterval(),
                transitionPoint: this.adaptiveLightingController.getCurrentAdaptiveLightingTransitionPoint(),
            };
        }
        return undefined;
    }

    disableAdaptiveLighting() {
        if (this.adaptiveLightingController) this.adaptiveLightingController.disableAdaptiveLighting();
    }
}
