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

/**
 * Initializes an Express application instance.
 *
 * @constant {express} webApp - The Express application instance.
 */
const webApp = express();

/**
 * Platform class for Homebridge-Hubitat-Tonesto7 plugin.
 *
 * @class Platform
 * @classdesc This class represents the main platform for the Homebridge-Hubitat-Tonesto7 plugin. It handles configuration, device management, and communication with the Hubitat platform.
 *
 * @param {Function} log - Logging function provided by Homebridge.
 * @param {Object} config - Configuration object for the platform.
 * @param {Object} api - Homebridge API object.
 *
 * @property {Object} config - Configuration object for the platform.
 * @property {Object} homebridge - Homebridge API object.
 * @property {Object} Service - Homebridge HAP Service object.
 * @property {Object} Characteristic - Homebridge HAP Characteristic object.
 * @property {Object} Categories - Homebridge HAP Categories object.
 * @property {Object} PlatformAccessory - Homebridge PlatformAccessory object.
 * @property {Object} uuid - Homebridge HAP UUID object.
 * @property {boolean} ok2Run - Flag indicating if the platform is properly configured and can run.
 * @property {number} direct_port - Port number for direct communication.
 * @property {Object} logConfig - Configuration object for logging.
 * @property {EventEmitter} appEvts - Event emitter for application events.
 * @property {Function} log - Logging function.
 * @property {number} polling_seconds - Interval in seconds for polling devices.
 * @property {Array} excludedAttributes - List of attributes to exclude.
 * @property {Array} excludedCapabilities - List of capabilities to exclude.
 * @property {string} update_method - Method for updating devices.
 * @property {string} temperature_unit - Unit for temperature measurement.
 * @property {string} local_hub_ip - Local IP address of the Hubitat hub.
 * @property {Object} Utils - Utility functions.
 * @property {Object} configItems - Configuration items for the platform.
 * @property {Array} unknownCapabilities - List of unknown capabilities.
 * @property {Object} deviceManager - Device manager instance.
 * @property {Object} client - Client instance for communication with Hubitat.
 *
 * @fires Platform#event:plugin_upd_status
 *
 * @method loadConfig - Loads the platform configuration from the Homebridge config file.
 * @method updateConfig - Updates the platform configuration in the Homebridge config file.
 * @method updateTempUnit - Updates the temperature unit.
 * @method getTempUnit - Gets the current temperature unit.
 * @method didFinishLaunching - Called when Homebridge finishes launching.
 * @method refreshDevices - Refreshes the list of devices from Hubitat.
 * @method addDevice - Adds a new device to the platform.
 * @method updateDevice - Updates an existing device on the platform.
 * @method removeAccessory - Removes an accessory from the platform.
 * @method configureAccessory - Configures a cached accessory.
 * @method getLogConfig - Gets the logging configuration.
 * @method findDirectPort - Finds an available port for direct communication.
 * @method getConfigItems - Gets the configuration items for the platform.
 * @method logAlert - Logs an alert message.
 * @method logGreen - Logs a green message.
 * @method logNotice - Logs a notice message.
 * @method logWarn - Logs a warning message.
 * @method logError - Logs an error message.
 * @method logInfo - Logs an info message.
 * @method logDebug - Logs a debug message.
 * @method intersection - Finds the intersection of devices.
 * @method diffAdd - Finds the devices to add.
 * @method diffRemove - Finds the devices to remove.
 * @method comparator - Compares two devices or accessories.
 * @method isValidRequestor - Validates the requestor based on access token and app ID.
 * @method WebServerInit - Initializes the web server for direct communication.
 */
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

    /**
     * Loads the configuration for the platform.
     *
     * This method reads the Homebridge configuration file, parses it as JSON,
     * and returns the configuration object for the platform with the matching name.
     *
     * @returns {Object} The configuration object for the platform.
     */
    loadConfig() {
        const configPath = this.homebridge.user.configPath();
        const file = fs.readFileSync(configPath);
        const config = JSON.parse(file);
        return config.platforms.find((x) => x.name === this.config.name);
    }

    /**
     * Updates the platform configuration with new settings.
     *
     * @param {Object} newConfig - The new configuration settings to be applied.
     * @throws {Error} If there is an issue reading or writing the configuration file.
     */
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

    /**
     * Updates the temperature unit and logs the change.
     *
     * @param {string} unit - The new temperature unit to set.
     */
    updateTempUnit(unit) {
        this.logNotice(`Temperature Unit is Now: (${unit})`);
        this.temperature_unit = unit;
    }

    /**
     * Retrieves the temperature unit.
     *
     * @returns {string} The temperature unit.
     */
    getTempUnit() {
        return this.temperature_unit;
    }

    /**
     * Method called when the platform has finished launching.
     *
     * This method logs an informational message about fetching devices, sets up a periodic
     * refresh of devices, and initializes the web server. If there is an error during the
     * web server initialization, it logs the error. If the initialization is successful,
     * it emits a plugin start event.
     *
     * @method didFinishLaunching
     * @returns {void}
     */
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

    /**
     * Refreshes all device data from the client and updates the platform's device list.
     *
     * @param {string} [src=undefined] - Optional source identifier for the refresh operation.
     * @returns {Promise<boolean>} - A promise that resolves to true if the refresh operation is successful.
     *
     * @throws {Error} - Throws an error if the refresh operation fails.
     *
     * @async
     *
     * @example
     * // Refresh devices with an optional source identifier
     * refreshDevices("Manual Trigger")
     *   .then((result) => {
     *     console.log("Devices refreshed successfully:", result);
     *   })
     *   .catch((error) => {
     *     console.error("Error refreshing devices:", error);
     *   });
     */
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
                            this.logInfo(`Devices to Update: (${Object.keys(toUpdate).length})`);
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

    /**
     * Adds a new device to the platform.
     *
     * @param {Object} deviceData - The data of the device to be added.
     * @param {string} deviceData.deviceid - The unique identifier of the device.
     * @param {string} deviceData.name - The name of the device.
     * @returns {Promise<void>} A promise that resolves when the device has been added and initialized.
     * @throws Will throw an error if the device initialization fails.
     */
    async addDevice(deviceData) {
        const uuid = this.uuid.generate(`hubitat_v2_${deviceData.deviceid}`);
        let accessory = new this.PlatformAccessory(deviceData.name, uuid);
        accessory.context.deviceData = deviceData;
        this.homebridge.registerPlatformAccessories(pluginName, platformName, [accessory]);
        // console.log(`addDevice | Name: (${deviceData.name}) | UUID: ${uuid}`);

        try {
            const initializedAccessory = await this.deviceManager.initializeHubitatAccessory(accessory, false, "addDevice");
            if (initializedAccessory) {
                this.homebridge.updatePlatformAccessories([initializedAccessory]);
                this.deviceManager.addAccessoryToCache(initializedAccessory);

                this.logInfo(`Added Device: (${initializedAccessory.displayName})`);
            } else {
                this.logError(`Failed to initialize accessory for device: ${device.name}`);
            }
        } catch (err) {
            this.logError(`Failed to initialize accessory for device: ${device.name}`);
            console.error(err);
        }
    }

    /**
     * Updates the device information and refreshes the cached accessory.
     *
     * @param {Object} device - The device object containing updated information.
     * @param {string} device.name - The name of the device.
     * @param {string} device.deviceid - The unique identifier of the device.
     * @returns {Promise<void>} - A promise that resolves when the device update is complete.
     */
    async updateDevice(device) {
        const cachedAccessory = this.deviceManager.getAccessoryFromCache(device);
        if (!cachedAccessory) {
            this.logError(`Failed to find cached accessory for device: ${device.name} | ${device.deviceid}`);
            return;
        }
        cachedAccessory.context.deviceData = device;
        await this.deviceManager.initializeHubitatAccessory(cachedAccessory, true, "updateDevice");
        this.deviceManager.addAccessoryToCache(cachedAccessory);
        this.homebridge.updatePlatformAccessories([cachedAccessory]);
        // this.logInfo(`Updated Device: (${cachedAccessory.displayName})`);
    }

    /**
     * Removes an accessory from the platform.
     *
     * @param {PlatformAccessory} accessory - The accessory to be removed.
     * @returns {Promise<void>} - A promise that resolves when the accessory is removed.
     */
    async removeAccessory(accessory) {
        if (this.deviceManager.removeAccessoryFromCache(accessory)) {
            this.deviceManager.removeAccessoryFromCache(accessory);
            this.homebridge.unregisterPlatformAccessories(pluginName, platformName, [accessory]);
            this.logInfo(`Removed Accessory: ${accessory.displayName}`);
        }
    }

    // Homebridge Method that is called when a cached accessory is loaded
    /**
     * Configures a cached accessory.
     *
     * @param {PlatformAccessory} accessory - The accessory to configure.
     * @param {string} accessory.displayName - The display name of the accessory.
     * @param {string} accessory.UUID - The UUID of the accessory.
     *
     * @returns {void}
     */
    configureAccessory(accessory) {
        if (!this.ok2Run) return;
        this.logDebug(`Configure Cached Accessory: ${accessory.displayName}, UUID: ${accessory.UUID}`);

        // Add the existing accessory to the cache
        this.deviceManager.addAccessoryToCache(accessory);

        // Initialize the accessory asynchronously without awaiting
        // this.deviceManager
        //     .initializeHubitatAccessory(accessory, true, "configureAccessory")
        //     .then((cachedAccessory) => {
        //         this.logDebug(`Successfully initialized cached accessory: ${cachedAccessory.displayName}`);
        //         this.deviceManager.addAccessoryToCache(cachedAccessory);
        //     })
        //     .catch((err) => {
        //         this.logError(`Failed to initialize cached accessory: ${accessory.displayName} | Error: ${err}`);
        //         console.error(err);
        //     });
    }

    /**
     * Retrieves the logging configuration.
     *
     * @returns {Object} An object containing the logging configuration.
     * @returns {boolean} return.debug - Indicates if debug logging is enabled.
     * @returns {boolean} return.showChanges - Indicates if change logging is enabled.
     */
    getLogConfig() {
        return {
            debug: this.config.logConfig ? this.config.logConfig.debug === true : false,
            showChanges: this.config.logConfig ? this.config.logConfig.showChanges === true : true,
        };
    }

    /**
     * Finds and returns an available direct port.
     *
     * This method checks the configuration for a specified direct port. If a port is specified,
     * it attempts to find an available port starting from the specified port number using the
     * `portFinderSync.getPort` method. If no port is specified in the configuration, it defaults
     * to port 8000.
     *
     * @returns {number} The available direct port.
     */
    findDirectPort() {
        let port = this.config.direct_port || 8000;
        if (port) port = portFinderSync.getPort(port);
        return (this.direct_port = port);
    }

    /**
     * Retrieves configuration items from the platform configuration.
     *
     * @returns {Object} An object containing the following configuration properties:
     * - app_url_local {string}: The local URL of the app.
     * - app_url_cloud {string}: The cloud URL of the app.
     * - app_id {string}: The application ID.
     * - access_token {string}: The access token for authentication.
     * - use_cloud {boolean}: Indicates whether to use cloud services.
     * - app_platform {string}: The platform of the application.
     * - polling_seconds {number}: The polling interval in seconds (default is 3600).
     * - round_levels {boolean}: Indicates whether to round levels (default is true).
     * - direct_port {number}: The direct port number.
     * - direct_ip {string}: The direct IP address (default is the IP address obtained from Utils).
     * - validateTokenId {boolean}: Indicates whether to validate the token ID.
     * - consider_fan_by_name {boolean}: Indicates whether to consider fans by name (default is true).
     * - consider_light_by_name {boolean}: Indicates whether to consider lights by name.
     * - adaptive_lighting {boolean}: Indicates whether adaptive lighting is enabled (default is true).
     * - adaptive_lighting_offset {number|undefined}: The offset for adaptive lighting if enabled.
     */
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

    /**
     * Logs an alert message with yellow color.
     *
     * @param {string} args - The message to be logged.
     */
    logAlert(args) {
        this.log.info(chalk.yellow(args));
    }

    /**
     * Logs the provided arguments in green color.
     *
     * @param {string} args - The message or arguments to log.
     */
    logGreen(args) {
        this.log.info(chalk.green(args));
    }

    /**
     * Logs a notice message with blue bright color.
     *
     * @param {string} args - The message to be logged.
     */
    logNotice(args) {
        this.log.info(chalk.blueBright(args));
    }

    /**
     * Logs a warning message with a specific color and style.
     *
     * @param {string} args - The warning message to be logged.
     */
    logWarn(args) {
        this.log.warn(chalk.hex("#FFA500").bold(args));
    }

    /**
     * Logs an error message with bold red formatting.
     *
     * @param {string} args - The error message to be logged.
     */
    logError(args) {
        this.log.error(chalk.bold.red(args));
    }

    /**
     * Logs an informational message.
     *
     * @param {string} args - The message to log.
     */
    logInfo(args) {
        this.log.info(chalk.white(args));
    }

    /**
     * Logs a debug message if debugging is enabled in the log configuration.
     *
     * @param {string} args - The message to be logged.
     */
    logDebug(args) {
        if (this.logConfig.debug === true) this.log.debug(chalk.gray(args));
    }

    // Utility methods for device comparison
    /**
     * Filters the given devices to return only those that have a corresponding accessory in the cache.
     *
     * @param {Array} devices - The array of devices to be filtered.
     * @returns {Array} - An array of devices that have corresponding accessories in the cache.
     */
    intersection(devices) {
        const accessories = Array.from(this.deviceManager.getAllAccessoriesFromCache().values());
        return devices.filter((device) => accessories.some((accessory) => this.comparator(device, accessory)));
    }

    /**
     * Filters out devices that are already present in the accessories cache.
     *
     * @param {Array} devices - The list of devices to be filtered.
     * @returns {Array} - The list of devices that are not present in the accessories cache.
     */
    diffAdd(devices) {
        const accessories = Array.from(this.deviceManager.getAllAccessoriesFromCache().values());
        return devices.filter((device) => !accessories.some((accessory) => this.comparator(device, accessory)));
    }

    /**
     * Filters out accessories that are not present in the provided devices list.
     *
     * @param {Array} devices - The list of devices to compare against.
     * @returns {Array} - An array of accessories that are not present in the devices list.
     */
    diffRemove(devices) {
        const accessories = Array.from(this.deviceManager.getAllAccessoriesFromCache().values());
        return accessories.filter((accessory) => !devices.some((device) => this.comparator(accessory, device)));
    }

    /**
     * Compares two accessories to determine if they are the same based on their device IDs.
     *
     * @param {Object} accessory1 - The first accessory object to compare.
     * @param {Object} accessory2 - The second accessory object to compare.
     * @param {string} [accessory1.deviceid] - The device ID of the first accessory.
     * @param {Object} [accessory1.context] - The context object of the first accessory.
     * @param {Object} [accessory1.context.deviceData] - The device data object of the first accessory.
     * @param {string} [accessory1.context.deviceData.deviceid] - The device ID within the context of the first accessory.
     * @param {string} [accessory2.deviceid] - The device ID of the second accessory.
     * @param {Object} [accessory2.context] - The context object of the second accessory.
     * @param {Object} [accessory2.context.deviceData] - The device data object of the second accessory.
     * @param {string} [accessory2.context.deviceData.deviceid] - The device ID within the context of the second accessory.
     * @returns {boolean} - Returns true if the device IDs of both accessories are the same, otherwise false.
     */
    comparator(accessory1, accessory2) {
        const id1 = accessory1.deviceid || accessory1.context.deviceData.deviceid;
        const id2 = accessory2.deviceid || accessory2.context.deviceData.deviceid;
        return id1 === id2;
    }

    /**
     * Validates the requestor based on the provided access token and app ID.
     *
     * @param {string} access_token - The access token to validate.
     * @param {string} app_id - The application ID to validate.
     * @param {string} src - The source of the request for logging purposes.
     * @returns {boolean} - Returns true if the requestor is valid, otherwise false.
     */
    isValidRequestor(access_token, app_id, src) {
        if (this.configItems.validateTokenId !== true) {
            return true;
        }
        if (app_id && access_token && this.getConfigItems().app_id && this.getConfigItems().access_token && access_token === this.getConfigItems().access_token && parseInt(app_id) === parseInt(this.getConfigItems().app_id)) return true;
        this.logError(`(${src}) | We received a request from a client that didn't provide a valid access_token and app_id`);
        return false;
    }

    /**
     * Initializes the web server and sets up various routes and middleware.
     *
     * @returns {Promise<Object>} A promise that resolves with the status of the web server initialization.
     *
     * @throws {Error} If there is an exception during the initialization process.
     *
     * @example
     * WebServerInit().then((status) => {
     *   console.log(status);
     * }).catch((error) => {
     *   console.error(error);
     * });
     */
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
                            await this.deviceManager.processDeviceAttributeUpdate(newChange).then((resp) => {
                                if (this.logConfig.showChanges) {
                                    this.logInfo(`${chalk.hex("#FFA500")("Device Event")}: (${chalk.blueBright(body.change_name)}) [${chalk.yellow.bold(body.change_attribute ? body.change_attribute.toUpperCase() : "unknown")}] is ${chalk.green(body.change_value)}`);
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
