// HubitatAccessories.js

import { platformName } from "./StaticConfig.js";
import DeviceCharacteristics from "./DeviceCharacteristics.js";
import Transforms from "./Transforms.js";

export default class HubitatAccessories {
    constructor(platform) {
        this.platformName = platformName;

        this.sanitizeName = platform.sanitizeName;
        this.Service = platform.Service;
        this.Characteristic = platform.Characteristic;
        this.CommunityTypes = platform.CommunityTypes;

        this.logManager = platform.logManager;
        this.stateManager = platform.stateManager;
        this.configManager = platform.configManager;
        this.client = platform.client;
        this.api = platform.api;
        this.config = platform.config;

        this.transforms = new Transforms(platform);
        this.deviceCharacteristics = new DeviceCharacteristics(platform, this);

        // Initialize accessory cache and utilities
        this._cachedAccessories = new Map();
        this._attributeLookup = {};
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

        // Initialize device data
        this.deviceData = [];
    }

    initializeDeviceTests() {
        return [
            {
                name: "windowCovering",
                test: (accessory) => accessory.hasCapability("WindowShade"),
                initFn: "windowCovering",
            },
            {
                name: "light",
                test: (accessory) =>
                    accessory.hasCapability("Switch") &&
                    (accessory.hasCapability("LightBulb") || accessory.hasCapability("Bulb") || (this.config.consider_light_by_name && accessory.context.deviceData.name.toLowerCase().includes("light")) || ["saturation", "hue", "colorTemperature"].some((attr) => accessory.hasAttribute(attr)) || accessory.hasCapability("ColorControl")),
                initFn: "light",
            },
            {
                name: "airPurifier",
                test: (accessory) => accessory.hasCapability("custom.airPurifierOperationMode"),
                disable: true,
                initFn: "airPurifier",
            },
            {
                name: "garageDoor",
                test: (accessory) => accessory.hasCapability("GarageDoorControl"),
                initFn: "garageDoor",
            },
            {
                name: "lock",
                test: (accessory) => accessory.hasCapability("Lock"),
                initFn: "lock",
            },
            {
                name: "valve",
                test: (accessory) => accessory.hasCapability("Valve"),
                initFn: "valve",
            },
            {
                name: "speaker",
                test: (accessory) => accessory.hasCapability("Speaker"),
                initFn: "speaker",
            },
            {
                name: "filterMaintenance",
                test: (accessory) => accessory.hasCapability("FilterStatus") && accessory.hasAttribute("filterStatus"),
                initFn: "filterMaintenance",
            },
            {
                name: "fan",
                test: (accessory) => ["Fan", "FanControl"].some((cap) => accessory.hasCapability(cap)) || (this.config.consider_fan_by_name && accessory.context.deviceData.name.toLowerCase().includes("fan")) || accessory.hasCommand("setSpeed") || accessory.hasAttribute("speed"),
                initFn: "fan",
            },
            {
                name: "virtualMode",
                test: (accessory) => accessory.hasCapability("Mode"),
                initFn: "virtualMode",
            },
            {
                name: "virtualPiston",
                test: (accessory) => accessory.hasCapability("Piston"),
                initFn: "virtualPiston",
            },
            {
                name: "button",
                test: (accessory) => ["Button", "DoubleTapableButton", "HoldableButton", "PushableButton"].some((cap) => accessory.hasCapability(cap)),
                initFn: "button",
            },
            {
                name: "outlet",
                test: (accessory) => accessory.hasCapability("Outlet") && accessory.hasCapability("Switch") && !["LightBulb", "Bulb", "Button", "Fan", "FanControl"].some((cap) => accessory.hasCapability(cap)),
                initFn: "outlet",
            },
            {
                name: "switchDevice",
                test: (accessory) => accessory.hasCapability("Switch") && !["LightBulb", "Outlet", "Bulb", "Button", "Fan", "FanControl"].some((cap) => accessory.hasCapability(cap)) && !(this.config.consider_light_by_name && accessory.context.deviceData.name.toLowerCase().includes("light")),
                excludeCapabilities: ["WindowShade", "DoorControl", "GarageDoorControl"],
                excludeAttributes: ["position", "level", "windowShade"],
                initFn: "switchDevice",
            },
            {
                name: "smokeDetector",
                test: (accessory) => accessory.hasCapability("SmokeDetector") && accessory.hasAttribute("smoke"),
                initFn: "smokeDetector",
            },
            {
                name: "carbonMonoxide",
                test: (accessory) => accessory.hasCapability("CarbonMonoxideDetector") && accessory.hasAttribute("carbonMonoxide"),
                initFn: "carbonMonoxide",
            },
            {
                name: "carbonDioxide",
                test: (accessory) => accessory.hasCapability("CarbonDioxideMeasurement") && accessory.hasAttribute("carbonDioxide"),
                initFn: "carbonDioxide",
            },
            {
                name: "motionSensor",
                test: (accessory) => accessory.hasCapability("MotionSensor"),
                initFn: "motionSensor",
            },
            {
                name: "accelerationSensor",
                test: (accessory) => accessory.hasCapability("AccelerationSensor"),
                initFn: "accelerationSensor",
            },
            {
                name: "leakSensor",
                test: (accessory) => accessory.hasCapability("WaterSensor"),
                initFn: "leakSensor",
            },
            {
                name: "presenceSensor",
                test: (accessory) => accessory.hasCapability("PresenceSensor"),
                initFn: "presenceSensor",
            },
            {
                name: "humiditySensor",
                test: (accessory) => accessory.hasCapability("RelativeHumidityMeasurement") && accessory.hasAttribute("humidity") && !["Thermostat", "ThermostatOperatingState"].some((cap) => accessory.hasCapability(cap)) && !accessory.hasAttribute("thermostatOperatingState"),
                initFn: "humiditySensor",
            },
            {
                name: "temperatureSensor",
                test: (accessory) => accessory.hasCapability("TemperatureMeasurement") && !["Thermostat", "ThermostatOperatingState"].some((cap) => accessory.hasCapability(cap)) && !accessory.hasAttribute("thermostatOperatingState"),
                initFn: "temperatureSensor",
            },
            {
                name: "illuminanceSensor",
                test: (accessory) => accessory.hasCapability("IlluminanceMeasurement"),
                initFn: "illuminanceSensor",
            },
            {
                name: "contactSensor",
                test: (accessory) => accessory.hasCapability("ContactSensor") && !accessory.hasCapability("GarageDoorControl"),
                initFn: "contactSensor",
            },
            {
                name: "airQuality",
                test: (accessory) => accessory.hasCapability("airQuality") || accessory.hasCapability("AirQuality"),
                initFn: "airQuality",
            },
            {
                name: "battery",
                test: (accessory) => accessory.hasCapability("Battery"),
                initFn: "battery",
            },
            {
                name: "energyMeter",
                test: (accessory) => accessory.hasCapability("EnergyMeter"),
                disable: true,
                initFn: "energyMeter",
            },
            {
                name: "powerMeter",
                test: (accessory) => accessory.hasCapability("PowerMeter"),
                disable: true,
                initFn: "powerMeter",
            },
            {
                name: "thermostat",
                test: (accessory) => accessory.hasCapability("Thermostat") || accessory.hasCapability("ThermostatOperatingState") || accessory.hasAttribute("thermostatOperatingState"),
                initFn: "thermostat",
            },
            {
                name: "alarmSystem",
                test: (accessory) => accessory.hasAttribute("alarmSystemStatus"),
                initFn: "alarmSystem",
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
        const deviceWrapper = {
            hasCapability: (capability) => accessory.context.deviceData.capabilities && Object.keys(accessory.context.deviceData.capabilities).includes(capability),
            hasAttribute: (attribute) => accessory.context.deviceData.attributes && Object.keys(accessory.context.deviceData.attributes).includes(attribute),
            hasCommand: (command) => accessory.context.deviceData.commands && Object.keys(accessory.context.deviceData.commands).includes(command),
            context: accessory.context,
        };

        const matchedTypes = [];

        for (const deviceTest of this.deviceTypeTests) {
            if (deviceTest.disable) continue;

            const hasExcludedCapability = deviceTest.excludeCapabilities?.some((cap) => deviceWrapper.hasCapability(cap));
            const hasExcludedAttribute = deviceTest.excludeAttributes?.some((attr) => deviceWrapper.hasAttribute(attr));

            if (hasExcludedCapability || hasExcludedAttribute) continue;

            if (deviceTest.test(deviceWrapper)) {
                if (deviceTest.excludeDevTypes && deviceTest.excludeDevTypes.some((type) => matchedTypes.some((match) => match.name === type))) {
                    continue;
                }

                matchedTypes.push({
                    name: deviceTest.name,
                    initFn: deviceTest.initFn,
                });
            }
        }

        if (matchedTypes.length === 0) {
            this.logManager.logWarn(`No device types matched for ${accessory.displayName}`);
        } else {
            this.logManager.logWarn(`${accessory.displayName} | Devices Types Matched: ${matchedTypes.map((t) => t.name).join(", ")}`);
        }

        return matchedTypes;
    }

    /**
     * Process device updates from the platform
     * @param {Object} devices - Object containing device data
     */
    async processDeviceUpdates(devices) {
        try {
            this.logManager.logDebug("Processing device updates...");
            // Check if devices is an object with deviceList property
            const deviceList = Array.isArray(devices) ? devices : devices?.deviceList || [];

            for (const device of deviceList) {
                if (this._cachedAccessories.has(device.deviceid)) {
                    await this.updateAccessory(device);
                } else {
                    await this.addAccessory(device);
                }
            }
            this.logManager.logDebug("Device updates processed.");
        } catch (error) {
            this.logManager.logError("Error processing device updates:", error);
        }
    }

    /**
     * Refresh devices by fetching data from the platform
     */
    async refreshDevices() {
        try {
            this.logManager.logDebug("Refreshing devices...");
            const response = await this.client.getDevices();
            if (response) {
                // Store device data
                this.deviceData = response.deviceList || [];
                // Process updates
                await this.processDeviceUpdates(response);
                this.logManager.logDebug("Devices refreshed.");
            } else {
                this.logManager.logError("No response received when refreshing devices");
            }
        } catch (error) {
            this.logManager.logError("Error refreshing devices:", error);
        }
    }

    // Add accessory
    async addAccessory(device) {
        try {
            const accessory = new this.api.platformAccessory(device.name, this.api.hap.uuid.generate(device.deviceid.toString()));
            accessory.context.deviceData = device;
            accessory.context.lastUpdate = new Date().toLocaleString();
            accessory.context.deviceGroups = [];
            accessory.context.uuid = accessory.UUID;
            accessory.context.manufacturer = device.manufacturerName || "Unknown";
            accessory.context.model = device.modelName || "Unknown";
            accessory.context.serial = device.serialNumber || device.zigbeeId || device.deviceNetworkId || device.id || "Unknown";

            // Bind accessory methods
            this.bindAccessoryMethods(accessory);

            // Configure Accessory Information Service
            this.configureAccessoryInformation(accessory);

            // Determine device types
            const svcTypes = this.determineDeviceTypes(accessory);

            // Assign services and characteristics
            for (const svc of svcTypes) {
                if (svc.name) {
                    this.logManager.logDebug(`${accessory.displayName} | Adding service: ${svc.name}`);
                    this.deviceCharacteristics[svc.initFn](accessory);
                } else {
                    this.logManager.logWarn(`${accessory.displayName} | No service found for ${svc.name}`);
                }
            }

            // Add accessory to cache and platform
            this.addAccessoryToCache(accessory);
            this.api.registerPlatformAccessories(this.platformName, this.platformName, [accessory]);

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
            const accessory = this._cachedAccessories.get(device.deviceid);
            if (!accessory) return;

            accessory.context.deviceData = device;
            accessory.context.lastUpdate = new Date().toLocaleString();
            accessory.context.deviceGroups = [];

            accessory.context.manufacturer = device.manufacturerName || "Unknown";
            accessory.context.model = device.modelName || "Unknown";
            accessory.context.serial = device.serialNumber || device.zigbeeId || device.deviceNetworkId || device.id || "Unknown";

            // Bind accessory methods
            this.bindAccessoryMethods(accessory);

            // Update Accessory Information Service
            this.configureAccessoryInformation(accessory);

            // Determine device types
            const svcTypes = this.determineDeviceTypes(accessory);

            // Reconfigure services and characteristics
            for (const svc of svcTypes) {
                if (svc.name) {
                    this.logManager.logGreen(`${accessory.displayName} | Updating service: ${svc.name}`);
                    this.deviceCharacteristics[svc.initFn](accessory);
                }
            }

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
            this.api.unregisterPlatformAccessories(this.platformName, this.platformName, [accessory]);
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
        const infoService = accessory.getService(this.Service.AccessoryInformation);

        if (infoService) {
            infoService.setCharacteristic(this.Characteristic.Manufacturer, accessory.context.manufacturer).setCharacteristic(this.Characteristic.Model, accessory.context.model).setCharacteristic(this.Characteristic.SerialNumber, accessory.context.serial).setCharacteristic(this.Characteristic.Name, this.sanitizeName(accessory.displayName));

            // Handle Identify event
            infoService.getCharacteristic(this.Characteristic.Identify).on("set", (value, callback) => {
                this.logManager.logDebug(`${accessory.displayName} identified with value: ${value}`);
                // Implement any custom identify behavior here
                callback(null);
            });
        }
    }

    bindAccessoryMethods(accessory) {
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

            // Find existing service
            let existingService = subtype ? accessory.getServiceById(service, subtype) : accessory.getService(service);

            // If service exists but name needs updating
            if (existingService && name) {
                const existingName = existingService.displayName;
                if (existingName !== name) {
                    this.logManager.logWarn(`Updating service name from "${existingName}" to "${name}"`);
                    existingService.setCharacteristic(this.Characteristic.Name, name);
                }
            }

            if (existingService) {
                return existingService;
            }

            // Create new service
            let newService = subtype ? new service(name || accessory.displayName, subtype) : new service(name || accessory.displayName);

            accessory.addService(newService);
            return newService;
        };

        // Device attribute checks
        accessory.hasAttribute = (attr) => {
            return accessory.context.deviceData && accessory.context.deviceData.attributes && accessory.context.deviceData.attributes[attr];
        };

        accessory.hasCommand = (cmd) => {
            return accessory.context.deviceData && accessory.context.deviceData.commands && accessory.context.deviceData.commands[cmd];
        };

        accessory.hasCapability = (cap) => {
            return accessory.context.deviceData && accessory.context.deviceData.capabilities && cap in accessory.context.deviceData.capabilities;
        };

        accessory.hasDeviceFlag = (flag) => {
            return accessory.context.deviceData.deviceflags && Object.keys(accessory.context.deviceData.deviceflags).includes(flag);
        };

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

        accessory.getOrAddCharacteristic = (service, characteristicType, options = {}) => {
            const { preReqChk = null, getHandler = null, setHandler = null, updateHandler = null, props = {}, eventOnly = false, value = null, removeIfMissingPreReq = false, storeAttribute = null } = options;

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

            if (storeAttribute) {
                this.storeCharacteristicItem(storeAttribute, accessory.context.deviceData.deviceid, characteristic, updateHandler);
            }

            return characteristic;
        };

        // Service lookup
        accessory.getServiceById = (service, subtype) => {
            return accessory.services.find((s) => s instanceof service && s.subtype === subtype);
        };

        // Adaptive Lighting Functions
        accessory.addAdaptiveLightingController = (_service) => {
            const offset = this.config.adaptive_lighting_offset || 0;
            const controlMode = this.api.hap.AdaptiveLightingControllerMode.AUTOMATIC;
            if (_service) {
                accessory.adaptiveLightingController = new this.api.hap.AdaptiveLightingController(_service, { controllerMode: controlMode, customTemperatureAdjustment: offset });
                accessory.adaptiveLightingController.on("update", (evt) => {
                    this.logManager.logDebug(`[${that.context.deviceData.name}] Adaptive Lighting Controller Update Event: `, evt);
                });
                accessory.adaptiveLightingController.on("disable", (evt) => {
                    this.logManager.logDebug(`[${that.context.deviceData.name}] Adaptive Lighting Controller Disabled Event: `, evt);
                });
                accessory.configureController(accessory.adaptiveLightingController);
                this.logManager.logInfo(`Adaptive Lighting Supported... Assigning Adaptive Lighting Controller to [${accessory.context.deviceData.name}]!!!`);
            } else {
                this.logManager.logError("Unable to add adaptiveLightingController because the required service parameter was missing...");
            }
        };

        accessory.removeAdaptiveLightingController = () => {
            if (accessory.adaptiveLightingController) {
                this.logManager.logInfo(`Adaptive Lighting Not Supported... Removing Adaptive Lighting Controller from [${accessory.context.deviceData.name}]!!!`);
                accessory.removeController(accessory.adaptiveLightingController);
                delete accessory["adaptiveLightingController"];
            }
        };

        accessory.getAdaptiveLightingController = () => {
            return accessory.adaptiveLightingController || undefined;
        };

        accessory.isAdaptiveLightingActive = () => {
            return accessory.adaptiveLightingController ? accessory.adaptiveLightingController.isAdaptiveLightingActive() : false;
        };

        accessory.getAdaptiveLightingData = () => {
            if (accessory.adaptiveLightingController) {
                return {
                    isActive: accessory.adaptiveLightingController.disableAdaptiveLighting(),
                    brightnessMultiplierRange: accessory.adaptiveLightingController.getAdaptiveLightingBrightnessMultiplierRange(),
                    notifyIntervalThreshold: accessory.adaptiveLightingController.getAdaptiveLightingNotifyIntervalThreshold(),
                    startTimeOfTransition: accessory.adaptiveLightingController.getAdaptiveLightingStartTimeOfTransition(),
                    timeOffset: accessory.adaptiveLightingController.getAdaptiveLightingTimeOffset(),
                    transitionCurve: accessory.adaptiveLightingController.getAdaptiveLightingTransitionCurve(),
                    updateInterval: accessory.adaptiveLightingController.getAdaptiveLightingUpdateInterval(),
                    transitionPoint: accessory.adaptiveLightingController.getCurrentAdaptiveLightingTransitionPoint(),
                };
            }
            return undefined;
        };

        accessory.disableAdaptiveLighting = () => {
            if (accessory.adaptiveLightingController) accessory.adaptiveLightingController.disableAdaptiveLighting();
        };
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

            const storedItems = this.getAttributeStoreItem(update.attribute, update.deviceid);
            if (!storedItems) return false;

            accessory.context.deviceData.attributes[update.attribute] = update.value;
            accessory.context.lastUpdate = new Date().toLocaleString();

            storedItems.forEach(({ characteristic, updateHandler }) => {
                if (updateHandler) {
                    const val = updateHandler(update.value);
                    if (val !== null && val !== undefined) {
                        characteristic.updateValue(val);
                    }
                }
            });

            await this.addAccessoryToCache(accessory);
            return true;
        } catch (error) {
            this.logManager.logError(`Error in processDeviceAttributeUpdate:`, error);
            return false;
        }
    }

    storeCharacteristicItem(attr, devId, char, updateHandler) {
        if (!this._attributeLookup[attr]) {
            this._attributeLookup[attr] = {};
        }
        if (!this._attributeLookup[attr][devId]) {
            this._attributeLookup[attr][devId] = [];
        }
        this._attributeLookup[attr][devId].push({
            characteristic: char,
            updateHandler: updateHandler,
        });
    }

    getAttributeStoreItem(attr, devId) {
        return this._attributeLookup[attr] ? this._attributeLookup[attr][devId] : null;
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
