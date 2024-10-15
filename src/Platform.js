// Platform.js

import { pluginName, platformDesc, platformName, pluginVersion } from "./Constants.js";
import events from "events";
import Utils from "./libs/Utils.js";
import Client from "./Client.js";
import express from "express";
import bodyParser from "body-parser";
import chalk from "chalk";
import fs from "fs";
import _ from "lodash";
import portFinderSync from "portfinder-sync";
import DeviceManager from "./DeviceManager.js";

const webApp = express();

export default class Platform {
    constructor(log, config, api) {
        this.config = config;
        this.homebridge = api;
        this.Service = api.hap.Service;
        this.Characteristic = api.hap.Characteristic;
        this.Categories = api.hap.Categories;
        this.PlatformAccessory = api.platformAccessory;
        this.uuid = api.hap.uuid;

        if (config === undefined || config === null || config.app_url_local === undefined || config.app_url_local === null || config.app_url_cloud === undefined || config.app_url_cloud === null || config.app_id === undefined || config.app_id === null) {
            log(`${platformName} Plugin is not Configured | Skipping...`);
            return;
        }

        this.ok2Run = true;
        this.direct_port = this.findDirectPort();
        this.logConfig = this.getLogConfig();
        this.appEvts = new events.EventEmitter();
        this.log = log;

        this.logInfo(`Homebridge Version: ${this.homebridge.version}`);
        this.logInfo(`Plugin Version: ${pluginVersion}`);
        this.polling_seconds = config.polling_seconds || 900;
        this.excludedAttributes = this.config.excluded_attributes || [];
        this.excludedCapabilities = this.config.excluded_capabilities || [];
        this.update_method = this.config.update_method || "direct";
        this.temperature_unit = this.config.temperature_unit || "F";
        this.local_hub_ip = undefined;
        this.Utils = new Utils(this);
        this.configItems = this.getConfigItems();
        this.unknownCapabilities = [];
        this.deviceManager = new DeviceManager(this);
        this.client = new Client(this);

        this.homebridge.on("didFinishLaunching", this.didFinishLaunching.bind(this));
        this.appEvts.emit("event:plugin_upd_status");
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
        Object.assign(platConfig, newConfig);
        const serializedConfig = JSON.stringify(config, null, "  ");
        fs.writeFileSync(configPath, serializedConfig, "utf8");
        Object.assign(this.config, newConfig);
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
        this.refreshDevices("First Launch")
            .then(() => {
                this.WebServerInit(this)
                    .catch((err) => this.logError("WebServerInit Error: ", err))
                    .then((resp) => {
                        if (resp && resp.status === "OK") this.appEvts.emit("event:plugin_start_direct");
                    });
            })
            .catch((err) => {
                this.logError(`didFinishLaunching | refreshDevices Exception:` + err);
            });
    }

    async refreshDevices(src = undefined) {
        let starttime = new Date();
        return new Promise((resolve, reject) => {
            try {
                this.logInfo(`Refreshing All Device Data${src ? " | Source: (" + src + ")" : ""}`);
                this.client
                    .getDevices()
                    .catch((err) => {
                        this.logError("getDevices Exception: " + err);
                        reject(err.message);
                    })
                    .then((resp) => {
                        if (resp && resp.location) {
                            this.updateTempUnit(resp.location.temperature_scale);
                            if (resp.location.hubIP) {
                                this.local_hub_ip = resp.location.hubIP;
                                this.configItems.use_cloud = resp.location.use_cloud === true;
                                this.client.updateGlobals(this.local_hub_ip, this.configItems.use_cloud);
                            }
                        }
                        if (resp && resp.deviceList && resp.deviceList instanceof Array) {
                            const toCreate = this.diffAdd(resp.deviceList);
                            const toUpdate = this.intersection(resp.deviceList);
                            const toRemove = this.diffRemove(resp.deviceList);
                            this.logWarn(`Devices to Remove: (${Object.keys(toRemove).length}) ` + toRemove.map((i) => i.name).join(", "));
                            this.log.info(`Devices to Update: (${Object.keys(toUpdate).length})`);
                            this.logGreen(`Devices to Create: (${Object.keys(toCreate).length}) ` + toCreate.map((i) => i.name).join(", "));

                            toRemove.forEach(async (accessory) => await this.removeAccessory(accessory));
                            toUpdate.forEach(async (device) => await this.updateDevice(device));
                            toCreate.forEach(async (device) => await this.addDevice(device));
                        }
                        this.logAlert(`Total Initialization Time: (${Math.round((new Date() - starttime) / 1000)} seconds)`);
                        this.logNotice(`Unknown Capabilities: ${JSON.stringify(this.unknownCapabilities)}`);
                        this.logInfo(`${platformDesc} DeviceCache Size: (${Object.keys(this.deviceManager.getAllAccessoriesFromCache()).length})`);
                        if (src !== "First Launch") this.appEvts.emit("event:plugin_upd_status");
                        resolve(true);
                    });
            } catch (ex) {
                this.logError(`didFinishLaunching | refreshDevices Exception: ${ex.message}`, ex.stack);
                reject(ex);
            }
        });
    }

    async addDevice(device) {
        const uuid = this.uuid.generate(`hubitat_v2_${device.deviceid}`);
        const accessory = new this.PlatformAccessory(device.name, uuid);
        accessory.context.deviceData = device;
        this.homebridge.registerPlatformAccessories(pluginName, platformName, [accessory]);
        await this.deviceManager.initializeHubitatAccessory(accessory);
        this.logInfo(`Added Device: (${accessory.displayName})`);
    }

    async updateDevice(device) {
        const cachedAccessory = this.deviceManager.getAccessoryFromCache(device);
        if (!cachedAccessory) {
            this.logError(`Failed to find cached accessory for device: ${device.name} | ${device.deviceid}`);
            return;
        }
        cachedAccessory.context.deviceData = device;
        await this.deviceManager.initializeHubitatAccessory(cachedAccessory);
        this.homebridge.updatePlatformAccessories([cachedAccessory]);
        this.logInfo(`Updated Device: (${cachedAccessory.displayName})`);
    }

    async removeAccessory(accessory) {
        if (this.deviceManager.removeAccessoryFromCache(accessory)) {
            this.homebridge.unregisterPlatformAccessories(pluginName, platformName, [accessory]);
            this.logInfo(`Removed Accessory: ${accessory.displayName}`);
        }
    }

    configureAccessory(accessory) {
        if (!this.ok2Run) return;
        this.logDebug(`Configure Cached Accessory: ${accessory.displayName}, UUID: ${accessory.UUID}`);
        this.deviceManager.initializeHubitatAccessory(accessory, true);
    }

    getLogConfig() {
        return {
            debug: this.config.logConfig ? this.config.logConfig.debug === true : false,
            showChanges: this.config.logConfig ? this.config.logConfig.showChanges === true : true,
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
            direct_ip: this.config.direct_ip || this.Utils.getIPAddress(),
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

    forEach(fn) {
        return _.forEach(this._cachedAccessories, fn);
    }

    // Utility methods for device comparison
    intersection(devices) {
        const accessories = _.values(this.deviceManager.getAllAccessoriesFromCache());
        return _.intersectionWith(devices, accessories, this.comparator);
    }

    diffAdd(devices) {
        const accessories = _.values(this.deviceManager.getAllAccessoriesFromCache());
        return _.differenceWith(devices, accessories, this.comparator);
    }

    diffRemove(devices) {
        const accessories = _.values(this.deviceManager.getAllAccessoriesFromCache());
        return _.differenceWith(accessories, devices, this.comparator);
    }

    comparator(accessory1, accessory2) {
        const id1 = accessory1.deviceid || accessory1.context.deviceData.deviceid;
        const id2 = accessory2.deviceid || accessory2.context.deviceData.deviceid;
        return id1 === id2;
    }

    // async processIncrementalUpdate(data) {
    //     this.logDebug("new data: " + data);
    //     if (data && data.attributes && data.attributes instanceof Array) {
    //         for (let i = 0; i < data.attributes.length; i++) {
    //             await this.processDeviceAttributeUpdate(data.attributes[i], this);
    //         }
    //     }
    // }

    isValidRequestor(access_token, app_id, src) {
        if (this.configItems.validateTokenId !== true) {
            return true;
        }
        if (app_id && access_token && this.getConfigItems().app_id && this.getConfigItems().access_token && access_token === this.getConfigItems().access_token && parseInt(app_id) === parseInt(this.getConfigItems().app_id)) return true;
        this.logError(`(${src}) | We received a request from a client that didn't provide a valid access_token and app_id`);
        return false;
    }

    WebServerInit() {
        // Get the IP address that we will send to the Hubitat App. This can be overridden in the config file.
        return new Promise((resolve) => {
            try {
                let ip = this.configItems.direct_ip || this.Utils.getIPAddress();
                this.logInfo("WebServer Initiated...");

                // Start the HTTP Server
                webApp.listen(this.configItems.direct_port, () => {
                    this.logInfo(`Direct Connect Active | Listening at ${ip}:${this.configItems.direct_port}`);
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
                    if (body && this.isValidRequestor(body.access_token, body.app_id, "initial")) {
                        this.logGreen(`${platformName} Hub Communication Established`);
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
                    this.logInfo(`${platformName} | Debug Option Request(${req.query.option})...`);
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
                    this.logInfo(`${platformName} Plugin Test Request Received...`);
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
                    if (body && this.isValidRequestor(body.access_token, body.app_id, "restartService")) {
                        let delay = 10 * 1000;
                        this.logInfo(`Received request from ${body.app_name} to restart homebridge service in (${delay / 1000} seconds) | NOTICE: If you using PM2 or Systemd the Homebridge Service should start back up`);
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
                    if (body && this.isValidRequestor(body.access_token, body.app_id, "refreshDevices")) {
                        this.logGreen(`${body.app_name} | Received request to refresh device data`);
                        this.refreshDevices("Hubitat App Requested");
                        res.send({
                            status: "OK",
                        });
                    } else {
                        this.logError(`Unable to start device refresh because we didn't receive a valid access_token and app_id`);
                        res.send({
                            status: "Failed: Missing access_token or app_id",
                        });
                    }
                });

                webApp.post("/updateprefs", (req, res) => {
                    let body = JSON.parse(JSON.stringify(req.body));
                    if (body && this.isValidRequestor(body.access_token, body.app_id, "updateprefs")) {
                        this.logInfo(`${body.app_name} | Hub Sent Preference Updates`);
                        let sendUpd = false;
                        // if (body && Object.keys(body).length > 0) {
                        //     Object.keys(body).forEach((key) => {});
                        // }
                        if (body.use_cloud && this.configItems.use_cloud !== body.use_cloud) {
                            sendUpd = true;
                            this.logInfo(`${platformName} Updated Use Cloud Preference | Before: ${this.configItems.use_cloud} | Now: ${body.use_cloud}`);
                            this.configItems.use_cloud = body.use_cloud;
                        }
                        if (body.validateTokenId && this.configItems.validateTokenId !== body.validateTokenId) {
                            this.logInfo(`${platformName} Updated Validate Token & Id Preference | Before: ${this.configItems.validateTokenId} | Now: ${body.validateTokenId}`);
                            this.configItems.validateTokenId = body.validateTokenId;
                        }
                        if (body.local_hub_ip && this.local_hub_ip !== body.local_hub_ip) {
                            sendUpd = true;
                            this.logInfo(`${platformName} Updated Hub IP Preference | Before: ${this.local_hub_ip} | Now: ${body.local_hub_ip}`);
                            this.local_hub_ip = body.local_hub_ip;
                        }
                        if (sendUpd) {
                            this.client.updateGlobals(this.local_hub_ip, this.configItems.use_cloud);
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

                webApp.post("/update", async (req, res) => {
                    if (req.body.length < 3) return;
                    let body = JSON.parse(JSON.stringify(req.body));
                    if (body && this.isValidRequestor(body.access_token, body.app_id, "update")) {
                        if (Object.keys(body).length > 3) {
                            let newChange = {
                                deviceid: body.change_device,
                                attribute: body.change_attribute,
                                value: body.change_value,
                                data: body.change_data,
                                date: body.change_date,
                            };
                            await this.deviceTypes.processDeviceAttributeUpdate(newChange).then((resp) => {
                                if (this.logConfig.showChanges) {
                                    this.logInfo(chalk`[{keyword('orange') Device Event}]: ({blueBright ${body.change_name}}) [{yellow.bold ${body.change_attribute ? body.change_attribute.toUpperCase() : "unknown"}}] is {keyword('pink') ${body.change_value}}`);
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
                this.logError("WebServerInit Exception: ", ex.message);
                resolve({
                    status: ex.message,
                });
            }
        });
    }
}
