// HE_Platform.js

const { pluginName, platformName, platformDesc, pluginVersion } = require("./libs/Constants"),
    events = require("events"),
    myUtils = require("./libs/MyUtils"),
    HEClient = require("./HE_Client"),
    HEAccessories = require("./HE_Accessories"),
    // EveTypes = require("./types/eve_types.js"),
    express = require("express"),
    bodyParser = require("body-parser"),
    chalk = require("chalk"),
    webApp = express(),
    fs = require("fs"),
    _ = require("lodash"),
    portFinderSync = require("portfinder-sync");

var PlatformAccessory;

module.exports = class HE_Platform {
    constructor(log, config, api) {
        this.config = config;
        this.homebridge = api;
        this.Service = api.hap.Service;
        this.Characteristic = api.hap.Characteristic;
        this.Categories = api.hap.Categories;
        PlatformAccessory = api.platformAccessory;
        this.uuid = api.hap.uuid;
        if (config === undefined || config === null || config.app_url_local === undefined || config.app_url_local === null || config.app_url_cloud === undefined || config.app_url_cloud === null || config.app_id === undefined || config.app_id === null) {
            log(`${platformName} Plugin is not Configured | Skipping...`);
            return;
        }

        this._platformAccessories = {};

        this.ok2Run = true;
        this.direct_port = this.findDirectPort();
        this.logConfig = this.getLogConfig();
        this.appEvts = new events.EventEmitter();
        this.log = log;
        this.logInfo = this.logInfo.bind(this);
        this.logGreen = this.logGreen.bind(this);
        this.logAlert = this.logAlert.bind(this);
        this.logNotice = this.logNotice.bind(this);
        this.logError = this.logError.bind(this);
        this.logInfo = this.logInfo.bind(this);
        this.logDebug = this.logDebug.bind(this);

        this.logInfo(`Homebridge Version: ${this.homebridge.version}`);
        this.logInfo(`Plugin Version: ${pluginVersion}`);
        this.polling_seconds = config.polling_seconds || 3600;
        this.excludedAttributes = this.config.excluded_attributes || [];
        this.excludedCapabilities = this.config.excluded_capabilities || [];
        this.update_method = this.config.update_method || "direct";
        this.temperature_unit = this.config.temperature_unit || "F";
        this.local_hub_ip = undefined;
        this.myUtils = new myUtils(this);
        this.configItems = this.getConfigItems();
        // console.log("pluginConfig: ", this.loadConfig());
        this.unknownCapabilities = [];
        this.client = new HEClient(this);
        this.HEAccessories = new HEAccessories(this);
        this.homebridge.on("didFinishLaunching", this.didFinishLaunching.bind(this));
        this.appEvts.emit("event:plugin_upd_status");
    }

    sanitizeName(name) {
        // Remove all characters except alphanumerics, spaces, and apostrophes
        let sanitized = name
            .replace(/[^a-zA-Z0-9 ']/g, "")
            .trim()
            .replace(/^[^a-zA-Z0-9]+/, "") // Remove leading non-alphanumeric characters
            .replace(/[^a-zA-Z0-9]+$/, "") // Remove trailing non-alphanumeric characters
            .replace(/\s{2,}/g, " "); // Replace multiple spaces with a single space

        // If the name becomes empty after sanitization, use a default name
        sanitized = sanitized.length === 0 ? "Unnamed Device" : sanitized;

        // if (name !== sanitized) this.logWarn(`Sanitized Name: (${name}) => (${sanitized})`);
        return sanitized;
    }

    // cachedAccessories.0EF1B88FF999
    // cachedAccessories.0E2B91319869.
    getLogConfig() {
        let config = this.config;
        return {
            debug: config.logConfig ? config.logConfig.debug === true : false,
            showChanges: config.logConfig ? config.logConfig.showChanges === true : true,
        };
    }

    findDirectPort() {
        let port = this.config.direct_port || 8000;
        if (port) port = portFinderSync.getPort(port);
        return (this.direct_port = port);
    }

    getConfigItems() {
        return {
            app_url_local: this.config.app_url_local,
            app_url_cloud: this.config.app_url_cloud,
            app_id: this.config.app_id,
            access_token: this.config.access_token,
            use_cloud: this.config.use_cloud === true,
            app_platform: this.config.app_platform,
            polling_seconds: this.config.polling_seconds || 3600,
            round_levels: this.config.round_levels !== false,
            direct_port: this.direct_port,
            direct_ip: this.config.direct_ip || this.myUtils.getIPAddress(),
            validateTokenId: this.config.validateTokenId === true,
            consider_fan_by_name: this.config.consider_fan_by_name !== false,
            consider_light_by_name: this.config.consider_light_by_name === true,
            adaptive_lighting: this.config.adaptive_lighting !== false,
            adaptive_lighting_offset: this.config.adaptive_lighting !== false && this.config.adaptive_lighting_offset !== undefined ? this.config.adaptive_lighting_offset : undefined,
        };
    }

    logAlert(args) {
        this.log.info(chalk.yellow(args));
    }

    logGreen(args) {
        this.log.info(chalk.green(args));
    }

    logNotice(args) {
        this.log.info(chalk.blueBright(args));
    }

    logWarn(args) {
        this.log.warn(chalk.keyword("orange").bold(args));
    }

    logError(args) {
        this.log.error(chalk.bold.red(args));
    }

    logInfo(args) {
        this.log.info(chalk.white(args));
    }

    logDebug(args) {
        if (this.logConfig.debug === true) this.log.debug(chalk.gray(args));
    }

    loadConfig() {
        const configPath = this.homebridge.user.configPath();
        const file = fs.readFileSync(configPath);
        const config = JSON.parse(file);
        return config.platforms.find((x) => x.name === this.config.name);
    }

    updateConfig(newConfig) {
        const configPath = this.homebridge.user.configPath();
        const file = fs.readFileSync(configPath);
        const config = JSON.parse(file);
        const platConfig = config.platforms.find((x) => x.name === this.config.name);
        _.extend(platConfig, newConfig);
        const serializedConfig = JSON.stringify(config, null, "  ");
        fs.writeFileSync(configPath, serializedConfig, "utf8");
        _.extend(this.config, newConfig);
        // Update local configItems
        // this.configItems =
    }

    updateTempUnit(unit) {
        this.logNotice(`Temperature Unit is Now: (${unit})`);
        this.temperature_unit = unit;
    }

    getTempUnit() {
        return this.temperature_unit;
    }

    didFinishLaunching() {
        this.logInfo(`Fetching ${platformName} Devices. NOTICE: This may take a moment if you have a large number of devices being loaded!`);
        setInterval(this.refreshDevices.bind(this), this.polling_seconds * 1000);
        let that = this;
        this.refreshDevices("First Launch")
            .then(() => {
                that.WebServerInit(that)
                    .catch((err) => that.logError("WebServerInit Error: ", err))
                    .then((resp) => {
                        if (resp && resp.status === "OK") this.appEvts.emit("event:plugin_start_direct");
                    });
            })
            .catch((err) => {
                that.logError(`didFinishLaunching | refreshDevices Exception:` + err);
            });
    }

    refreshDevices(src = undefined) {
        let that = this;
        let starttime = new Date();
        return new Promise((resolve, reject) => {
            try {
                that.logInfo(`Refreshing All Device Data${src ? " | Source: (" + src + ")" : ""}`);
                this.client
                    .getDevices()
                    .catch((err) => {
                        that.logError("getDevices Exception: " + err);
                        reject(err.message);
                    })
                    .then((resp) => {
                        if (resp && resp.location) {
                            that.updateTempUnit(resp.location.temperature_scale);
                            if (resp.location.hubIP) {
                                that.local_hub_ip = resp.location.hubIP;
                                that.configItems.use_cloud = resp.location.use_cloud === true;
                                that.client.updateGlobals(that.local_hub_ip, that.configItems.use_cloud);
                            }
                        }
                        if (resp && resp.deviceList && resp.deviceList instanceof Array) {
                            const toCreate = this.HEAccessories.diffAdd(resp.deviceList);
                            const toUpdate = this.HEAccessories.intersection(resp.deviceList);
                            const toRemove = this.HEAccessories.diffRemove(resp.deviceList);

                            // Get all cached devices
                            const cachedDevices = this.getAllAccessoriesFromCache();

                            // Create a set of device IDs from the Hubitat API response
                            const hubitatDeviceIds = new Set(resp.deviceList.map((device) => device.deviceid));

                            // Find cached devices not in Hubitat device data
                            const missingDevices = Object.values(cachedDevices).filter((cachedDevice) => !hubitatDeviceIds.has(cachedDevice.context.deviceData.deviceid));

                            // Log missing devices
                            if (missingDevices.length > 0) {
                                that.logWarn(`Cached devices not found in Hubitat device data: ${missingDevices.map((device) => device.context.deviceData.name).join(", ")}`);
                            }

                            that.logWarn(`Devices to Remove: (${Object.keys(toRemove).length}) ` + toRemove.map((i) => i.name));
                            that.log.info(`Devices to Update: (${Object.keys(toUpdate).length})`);
                            that.logGreen(`Devices to Create: (${Object.keys(toCreate).length}) ` + toCreate.map((i) => i.name));

                            // this.cleanUpStaleAccessories(resp.deviceList);

                            toRemove.forEach((accessory) => this.removeAccessory(accessory));
                            toUpdate.forEach((device) => this.updateDevice(device));
                            toCreate.forEach((device) => this.addDevice(device));
                        }
                        that.logAlert(`Total Initialization Time: (${Math.round((new Date() - starttime) / 1000)} seconds)`);
                        that.logNotice(`Unknown Capabilities: ${JSON.stringify(that.unknownCapabilities)}`);
                        that.logInfo(`${platformDesc} DeviceCache Size: (${Object.keys(this.getAllAccessoriesFromCache()).length})`);
                        if (src !== "First Launch") this.appEvts.emit("event:plugin_upd_status");
                        resolve(true);
                    });
            } catch (ex) {
                this.logError("refreshDevices Error: ", ex);
                resolve(false);
            }
        });
    }

    getNewAccessory(device, UUID) {
        let accessory = new PlatformAccessory(device.name, UUID);
        accessory.context.deviceData = device;
        this.HEAccessories.initializeAccessory(accessory);
        this.sanitizeAndUpdateAccessoryName(accessory);
        return accessory;
    }

    addDevice(device) {
        let accessory;
        const new_uuid = this.uuid.generate(`hubitat_v2_${device.deviceid}`);
        device.excludedCapabilities = this.excludedCapabilities[device.deviceid] || [];
        this.logDebug(`Initializing New Device (${device.displayName} | ${device.deviceid})`);
        accessory = this.getNewAccessory(device, new_uuid);
        this.homebridge.registerPlatformAccessories(pluginName, platformName, [accessory]);
        // console.log("Accessory: ", accessory);
        this.addAccessoryToCache(accessory);
        this.logInfo(`Added Device: (${accessory.displayName} | ${accessory.deviceid})`);
    }

    updateDevice(device) {
        let cachedAccessory = this.getAccessoryFromCache(device);
        device.excludedCapabilities = this.excludedCapabilities[device.deviceid] || [];
        cachedAccessory.context.deviceData = device;
        this.logDebug(`Loading Existing Device | Name: (${device.displayName}) | ID: (${device.deviceid})`);
        cachedAccessory = this.HEAccessories.initializeAccessory(cachedAccessory);
        this.sanitizeAndUpdateAccessoryName(cachedAccessory);
        this.addAccessoryToCache(cachedAccessory);
    }

    cleanUpStaleAccessories(devices) {
        const cachedAccessories = this.HEAccessories.getAllAccessories(); // This is now an array
        const activeDeviceIds = new Set(devices.map((device) => device.deviceid));

        cachedAccessories.forEach((accessory) => {
            const accDeviceId = this.HEAccessories.getAccessoryId(accessory);
            if (!activeDeviceIds.has(accDeviceId)) {
                this.logWarn(`Stale Accessory Detected: ${accessory.displayName} (${accDeviceId}) | Removing...`);
                // this.removeAccessory(accessory);
            }
        });
    }

    removeAccessory(accessory) {
        if (this.removeAccessoryFromCache(accessory)) {
            this.homebridge.unregisterPlatformAccessories(pluginName, platformName, [accessory]);
            this.logInfo(`Removed: ${accessory.displayName} (${accessory.deviceid})`);
        }
    }

    configureAccessory(accessory) {
        if (!this.ok2Run) return;
        this.logDebug(`Configure Cached Accessory: ${accessory.displayName}, UUID: ${accessory.UUID}`);
        let cachedAccessory = this.HEAccessories.initializeAccessory(accessory, true);
        this.sanitizeAndUpdateAccessoryName(cachedAccessory);
        this.addAccessoryToCache(cachedAccessory);
    }

    processIncrementalUpdate(data, that) {
        that.logDebug("new data: " + data);
        if (data && data.attributes && data.attributes instanceof Array) {
            for (let i = 0; i < data.attributes.length; i++) {
                that.processDeviceAttributeUpdate(data.attributes[i], that);
            }
        }
    }

    isValidRequestor(access_token, app_id, src) {
        if (this.configItems.validateTokenId !== true) {
            return true;
        }
        if (app_id && access_token && this.getConfigItems().app_id && this.getConfigItems().access_token && access_token === this.getConfigItems().access_token && parseInt(app_id) === parseInt(this.getConfigItems().app_id)) return true;
        this.logError(`(${src}) | We received a request from a client that didn't provide a valid access_token and app_id`);
        return false;
    }

    getAccessoryFromCache(accessory) {
        const id = accessory.deviceid || accessory.context.deviceid || undefined;
        return this._platformAccessories[id];
    }

    getAllAccessoriesFromCache() {
        return this._platformAccessories;
    }

    clearAccessoryCache() {
        this.logAlert("CLEARING ACCESSORY CACHE AND FORCING DEVICE RELOAD");
        this._platformAccessories = {};
    }

    addAccessoryToCache(accessory) {
        const id = accessory.deviceid || accessory.context.deviceid || undefined;
        this._platformAccessories[id] = accessory;
        return true;
    }

    removeAccessoryFromCache(accessory) {
        const id = accessory.deviceid || accessory.context.deviceid || undefined;
        const _accessory = this._platformAccessories[id];
        delete this._platformAccessories[id];
        return _accessory;
    }

    sanitizeAndUpdateAccessoryName(accessory) {
        const originalName = accessory.context.deviceData.name;
        const sanitizedName = this.sanitizeName(originalName);

        if (sanitizedName !== originalName) {
            // this.logInfo(`Updating accessory name from "${originalName}" to "${sanitizedName}" for device ID: ${accessory.deviceid}`);

            // Update the name properties
            accessory.name = sanitizedName;
            accessory.context.name = sanitizedName;

            // Important: Update displayName like this
            accessory._associatedHAPAccessory.displayName = sanitizedName;

            // Update the AccessoryInformation service
            const accessoryInformation = accessory.getService(this.Service.AccessoryInformation);
            if (accessoryInformation) {
                // accessoryInformation.setCharacteristic(this.Characteristic.Name, sanitizedName);
                accessoryInformation.getCharacteristic(this.Characteristic.Name).updateValue(sanitizedName);

                // verify that the displayName was updated
                const displayName = accessoryInformation.getCharacteristic(this.Characteristic.Name).value;
                if (displayName !== sanitizedName) {
                    this.logWarn(`Failed to update displayName for device ID: ${accessory.deviceid}`);
                } else {
                    this.logInfo(`AccessoryInformation service updated successfully for device ID: ${accessory.deviceid} | Old Name: ${originalName} | Display Name: ${displayName}`);
                    this.homebridge.updatePlatformAccessories([accessory]);
                }
            } else {
                this.logWarn(`AccessoryInformation service not found for device ID: ${accessory.deviceid}`);
            }

            // this.logDebug(`Accessory name updated successfully to "${sanitizedName}"`);
        } else {
            // this.logDebug(`No name update needed for accessory "${originalName}"`);
        }
    }

    WebServerInit() {
        let that = this;
        // Get the IP address that we will send to the Hubitat App. This can be overridden in the config file.
        return new Promise((resolve) => {
            try {
                let ip = that.configItems.direct_ip || that.myUtils.getIPAddress();
                that.logInfo("WebServer Initiated...");

                // Start the HTTP Server
                webApp.listen(that.configItems.direct_port, () => {
                    that.logInfo(`Direct Connect Active | Listening at ${ip}:${that.configItems.direct_port}`);
                });

                webApp.use(
                    bodyParser.urlencoded({
                        extended: false,
                    }),
                );
                webApp.use(bodyParser.json());
                webApp.use((req, res, next) => {
                    res.header("Access-Control-Allow-Origin", "*");
                    res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
                    next();
                });

                webApp.get("/", (req, res) => {
                    res.send("WebApp is running...");
                });

                webApp.post("/initial", (req, res) => {
                    let body = JSON.parse(JSON.stringify(req.body));
                    if (body && that.isValidRequestor(body.access_token, body.app_id, "initial")) {
                        that.logGreen(`${platformName} Hub Communication Established`);
                        res.send({
                            status: "OK",
                        });
                    } else {
                        res.send({
                            status: "Failed: Missing access_token or app_id",
                        });
                    }
                });

                webApp.get("/debugOpts", (req, res) => {
                    that.logInfo(`${platformName} Debug Option Request(${req.query.option})...`);
                    if (req.query && req.query.option) {
                        let accs = this.getAllAccessoriesFromCache();
                        // let accsKeys = Object.keys(accs);
                        // console.log(accsKeys);
                        switch (req.query.option) {
                            case "allAccData":
                                res.send(JSON.stringify(accs));
                                break;
                            // case 'accServices':
                            //     var o = accsKeys.forEach(s => s.services.forEach(s1 => s1.UUID));
                            //     res.send(JSON.stringify(o));
                            //     break;
                            // case 'accCharacteristics':
                            //     var o = accsKeys.forEach(s => s.services.forEach(s1 => s1.characteristics.forEach(c => c.displayName)));
                            //     res.send(JSON.stringify(o));
                            //     break;
                            // case 'accContext':
                            //     res.send(JSON.stringify(this.getAllAccessoriesFromCache()));
                            //     break;
                            default:
                                res.send(`Error: Invalid Option Parameter Received | Option: ${req.query.option}`);
                                break;
                        }
                    } else {
                        res.send("Error: Missing Valid Debug Query Parameter");
                    }
                });

                webApp.get("/pluginTest", (req, res) => {
                    that.logInfo(`${platformName} Plugin Test Request Received...`);
                    res.status(200).send(
                        JSON.stringify(
                            {
                                status: "OK",
                                homebridge_version: this.homebridge.version,
                                plugin: {
                                    name: pluginName,
                                    platform_name: platformName,
                                    platform_desc: platformDesc,
                                    version: pluginVersion,
                                    config: this.configItems,
                                },
                            },
                            null,
                            4,
                        ),
                    );
                });

                webApp.post("/restartService", (req, res) => {
                    let body = JSON.parse(JSON.stringify(req.body));
                    if (body && that.isValidRequestor(body.access_token, body.app_id, "restartService")) {
                        let delay = 10 * 1000;
                        that.logInfo(`Received request from ${platformName} to restart homebridge service in (${delay / 1000} seconds) | NOTICE: If you using PM2 or Systemd the Homebridge Service should start back up`);
                        setTimeout(() => {
                            process.exit(1);
                        }, parseInt(delay));
                        res.send({
                            status: "OK",
                        });
                    } else {
                        res.send({
                            status: "Failed: Missing access_token or app_id",
                        });
                    }
                });

                webApp.post("/refreshDevices", (req, res) => {
                    let body = JSON.parse(JSON.stringify(req.body));
                    if (body && that.isValidRequestor(body.access_token, body.app_id, "refreshDevices")) {
                        that.logGreen(`Received request from ${platformName} to refresh devices`);
                        that.refreshDevices("Hubitat App Requested");
                        res.send({
                            status: "OK",
                        });
                    } else {
                        that.logError(`Unable to start device refresh because we didn't receive a valid access_token and app_id`);
                        res.send({
                            status: "Failed: Missing access_token or app_id",
                        });
                    }
                });

                webApp.post("/updateprefs", (req, res) => {
                    let body = JSON.parse(JSON.stringify(req.body));
                    if (body && that.isValidRequestor(body.access_token, body.app_id, "updateprefs")) {
                        that.logInfo(platformName + " Hub Sent Preference Updates");
                        let sendUpd = false;
                        // if (body && Object.keys(body).length > 0) {
                        //     Object.keys(body).forEach((key) => {});
                        // }
                        if (body.use_cloud && that.configItems.use_cloud !== body.use_cloud) {
                            sendUpd = true;
                            that.logInfo(`${platformName} Updated Use Cloud Preference | Before: ${that.configItems.use_cloud} | Now: ${body.use_cloud}`);
                            that.configItems.use_cloud = body.use_cloud;
                        }
                        if (body.validateTokenId && that.configItems.validateTokenId !== body.validateTokenId) {
                            that.logInfo(`${platformName} Updated Validate Token & Id Preference | Before: ${that.configItems.validateTokenId} | Now: ${body.validateTokenId}`);
                            that.configItems.validateTokenId = body.validateTokenId;
                        }
                        if (body.local_hub_ip && that.local_hub_ip !== body.local_hub_ip) {
                            sendUpd = true;
                            that.logInfo(`${platformName} Updated Hub IP Preference | Before: ${that.local_hub_ip} | Now: ${body.local_hub_ip}`);
                            that.local_hub_ip = body.local_hub_ip;
                        }
                        if (sendUpd) {
                            that.client.updateGlobals(that.local_hub_ip, that.configItems.use_cloud);
                        }
                        res.send({
                            status: "OK",
                        });
                    } else {
                        res.send({
                            status: "Failed: Missing access_token or app_id",
                        });
                    }
                });

                webApp.post("/update", (req, res) => {
                    if (req.body.length < 3) return;
                    let body = JSON.parse(JSON.stringify(req.body));
                    if (body && that.isValidRequestor(body.access_token, body.app_id, "update")) {
                        if (Object.keys(body).length > 3) {
                            let newChange = {
                                deviceid: body.change_device,
                                attribute: body.change_attribute,
                                value: body.change_value,
                                data: body.change_data,
                                date: body.change_date,
                            };
                            that.HEAccessories.processDeviceAttributeUpdate(newChange).then((resp) => {
                                if (that.logConfig.showChanges) {
                                    that.logInfo(chalk`[{keyword('orange') Device Event}]: ({blueBright ${body.change_name}}) [{yellow.bold ${body.change_attribute ? body.change_attribute.toUpperCase() : "unknown"}}] is {keyword('pink') ${body.change_value}}`);
                                }
                                res.send({
                                    evtSource: `Homebridge_${platformName}_${this.configItems.app_id}`,
                                    evtType: "attrUpdStatus",
                                    evtDevice: body.change_name,
                                    evtAttr: body.change_attribute,
                                    evtStatus: resp ? "OK" : "Failed",
                                });
                            });
                        } else {
                            res.send({
                                evtSource: `Homebridge_${platformName}_${this.configItems.app_id}`,
                                evtType: "attrUpdStatus",
                                evtDevice: body.change_name,
                                evtAttr: body.change_attribute,
                                evtStatus: "Failed",
                            });
                        }
                    } else {
                        res.send({
                            status: "Failed: Missing access_token or app_id",
                        });
                    }
                });
                resolve({
                    status: "OK",
                });
            } catch (ex) {
                that.logError("WebServerInit Exception: ", ex.message);
                resolve({
                    status: ex.message,
                });
            }
        });
    }
};
