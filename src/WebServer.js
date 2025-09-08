// platform/WebServer.js

import { pluginName, platformName, platformDesc } from "./StaticConst.js";
import { IPMonitor } from "./IPMonitor.js";
import { HealthMonitor } from "./HealthMonitor.js";
import express from "express";
import bodyParser from "body-parser";
import crypto from "crypto";
import fs from "fs/promises";
import path from "path";

const webApp = express();

export class WebServer {
    constructor(platform) {
        // this.platform = platform;
        this.logManager = platform.logManager;
        this.configManager = platform.configManager;
        this.versionManager = platform.versionManager;
        this.config = platform.config;
        this.homebridge = platform.homebridge;
        this.appEvts = platform.appEvts;
        this.getHealthMetrics = platform.getHealthMetrics;
        this.getAllCachedAccessories = platform.getAllCachedAccessories.bind(platform);
        this.processDeviceAttributeUpdate = platform.processDeviceAttributeUpdate.bind(platform);
        this.refreshDevices = platform.refreshDevices.bind(platform);

        // Initialize IP monitoring (will be set up later with client)
        this.ipMonitor = null;

        // Health monitor will be initialized later when client is available
        this.healthMonitor = null;


        // Subscribe to config updates
        this.configManager.onConfigUpdate((newConfig) => {
            this.config = newConfig;
            this.logManager.logDebug("WebServer config updated");
        });

        // Legacy queue properties for backward compatibility
        this.updateQueue = [];
        this.isProcessingQueue = false;
        this.maxQueueSize = 1000;
        this.batchSize = 15;
        this.batchDelay = 100;
        this.collectionDelay = 10;
        this.batchTimer = null;

    }

    async initialize() {
        try {
            // Clean up old persistent queue files if they exist
            await this.cleanupOldQueueFiles();
            
            const ip = this.configManager.getActiveIP();
            const port = await this.configManager.findAvailablePort();
            this.logManager.logInfo("WebServer Initiated...");

            this.configureMiddleware();
            this.setupRoutes();

            // Start the HTTP Server
            webApp.listen(port, () => {
                this.logManager.logInfo(`Direct Connect Active | Listening at ${ip}:${port}`);
            });

            // IP monitoring will be started when client is initialized

            return { status: "OK" };
        } catch (ex) {
            this.logManager.logError("WebServerInit Exception: ", ex.message);
            return { status: ex.message };
        }
    }

    async cleanupOldQueueFiles() {
        try {
            // Old queue files were stored in .homebridge/hubitat-queue/
            const queueDir = path.join(process.cwd(), '.homebridge', 'hubitat-queue');
            
            // Check if the directory exists
            try {
                await fs.access(queueDir);
                
                // Remove the entire queue directory and its contents
                await fs.rm(queueDir, { recursive: true, force: true });
                this.logManager.logInfo("Cleaned up old persistent queue files from previous version");
            } catch (error) {
                // Directory doesn't exist, nothing to clean up
                this.logManager.logDebug("No old persistent queue files found to clean up");
            }
        } catch (error) {
            this.logManager.logWarn(`Error cleaning up old queue files: ${error.message}`);
        }
    }

    secureCompare(a, b) {
        if (!a || !b || a.length !== b.length) return false;
        try {
            return crypto.timingSafeEqual(Buffer.from(a), Buffer.from(b));
        } catch (e) {
            return false;
        }
    }

    configureMiddleware() {
        webApp.use(bodyParser.urlencoded({ extended: false }));
        webApp.use(bodyParser.json());

        // Add CORS headers
        webApp.use((req, res, next) => {
            res.header("Access-Control-Allow-Origin", "*");
            res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
            next();
        });
    }

    setupRoutes() {
        this.setupBasicRoutes();
        this.setupDebugRoutes();
        this.setupConfigurationRoutes();
        this.setupDeviceRoutes();
        this.setupHealthRoutes();
        this.setupMonitoringRoutes();
    }

    /**
     * Initialize health monitoring with client reference
     */
    initializeHealthMonitoring(hubitatClient) {
        if (!this.healthMonitor && hubitatClient) {
            const platform = {
                logManager: this.logManager,
                configManager: this.configManager,
                config: this.config,
            };

            // Initialize IP monitoring
            this.ipMonitor = new IPMonitor(platform, hubitatClient);
            this.ipMonitor.startMonitoring();

            // Initialize health monitoring (simplified - no discovery integration)
            this.healthMonitor = new HealthMonitor(platform, hubitatClient);
            this.healthMonitor.startMonitoring();

            this.logManager.logInfo("IP monitoring and health monitoring initialized");
        }
    }

    setupBasicRoutes() {
        webApp.get("/", (req, res) => {
            res.send("WebApp is running...");
        });

        webApp.post("/initial", (req, res) => {
            const body = JSON.parse(JSON.stringify(req.body));
            if (body && this.isValidRequestor(body.access_token, body.app_id, "initial")) {
                this.logManager.logSuccess(`${platformName} Hub Communication Established`);
                res.send({ status: "OK" });
            } else {
                res.send({ status: "Failed: Missing access_token or app_id" });
            }
        });

        webApp.get("/pluginTest", (req, res) => {
            this.logManager.logInfo(`${platformName} Plugin Test Request Received...`);
            const metrics = this.getHealthMetrics();
            res.status(200).send(
                JSON.stringify(
                    {
                        status: "OK",
                        homebridge_version: this.homebridge.version,
                        plugin: {
                            name: pluginName,
                            platform_name: platformName,
                            platform_desc: platformDesc,
                            version: this.versionManager.getVersion(),
                            config: this.configManager.getConfig(),
                            memory: metrics.memory,
                            uptime: metrics.uptime.formatted,
                        },
                    },
                    null,
                    4,
                ),
            );
        });
    }

    setupDebugRoutes() {
        webApp.get("/debugOpts", (req, res) => {
            this.logManager.logInfo(`${platformName} Debug Option Request(${req.query.option})...`);
            if (req.query?.option) {
                const accs = this.getAllCachedAccessories();
                switch (req.query.option) {
                    case "allAccData":
                        res.send(JSON.stringify(accs));
                        break;
                    default:
                        res.send(`Error: Invalid Option Parameter Received | Option: ${req.query.option}`);
                        break;
                }
            } else {
                res.send("Error: Missing Valid Debug Query Parameter");
            }
        });
    }

    setupConfigurationRoutes() {
        webApp.post("/restartService", (req, res) => {
            const body = JSON.parse(JSON.stringify(req.body));
            if (body && this.isValidRequestor(body.access_token, body.app_id, "restartService")) {
                const delay = 10 * 1000;
                this.logManager.logInfo(`Received request from ${platformName} to restart homebridge service in ` + `(${delay / 1000} seconds) | NOTICE: If you using PM2 or Systemd the Homebridge Service should start back up`);
                setTimeout(() => {
                    process.exit(1);
                }, parseInt(delay));
                res.send({ status: "OK" });
            } else {
                res.send({ status: "Failed: Missing access_token or app_id" });
            }
        });

        webApp.post("/updateprefs", this.handlePreferencesUpdate.bind(this));
    }

    setupDeviceRoutes() {
        webApp.post("/refreshDevices", this.handleDeviceRefresh.bind(this));
        webApp.post("/update", this.handleDeviceUpdate.bind(this));
    }

    handlePreferencesUpdate(req, res) {
        const body = JSON.parse(JSON.stringify(req.body));
        if (!body || !this.isValidRequestor(body.access_token, body.app_id, "updateprefs")) {
            res.send({ status: "Failed: Missing access_token or app_id" });
            return;
        }

        const preferenceMappings = {
            use_cloud: ["client", "use_cloud"],
            validateTokenId: ["client", "validateTokenId"],
            consider_fan_by_name: ["devices", "consider_fan_by_name"],
            consider_light_by_name: ["devices", "consider_light_by_name"],
            adaptive_lighting: ["features", "adaptive_lighting", "enabled"],
            adaptive_lighting_off_when_on: ["features", "adaptive_lighting", "off_when_on"],
        };

        let updates = {};
        for (const [bodyKey, configPath] of Object.entries(preferenceMappings)) {
            if (body[bodyKey] !== undefined) {
                const currentValue = configPath.reduce((obj, key) => obj[key], this.config);
                const newValue = bodyKey.includes("lighting") || bodyKey.includes("by_name") ? body[bodyKey] === true : body[bodyKey];

                if (currentValue !== newValue) {
                    this.logManager.logInfo(`${platformName} Updated ${configPath.join(".")} Preference | ` + `Before: ${currentValue} | Now: ${newValue}`);
                    updates[configPath.join(".")] = newValue;
                }
            }
        }

        if (Object.keys(updates).length > 0) {
            this.configManager.updateConfig(updates);
        }

        res.send({ status: "OK" });
    }

    handleDeviceRefresh(req, res) {
        const body = JSON.parse(JSON.stringify(req.body));
        if (body && this.isValidRequestor(body.access_token, body.app_id, "refreshDevices")) {
            this.logManager.logSuccess(`Received request from ${platformName} to refresh devices`);
            this.refreshDevices("Hubitat App Requested");
            res.send({ status: "OK" });
        } else {
            this.logManager.logError(`Unable to start device refresh because we didn't receive a valid access_token and app_id`);
            res.send({ status: "Failed: Missing access_token or app_id" });
        }
    }

    handleDeviceUpdate(req, res) {
        if (req.body.length < 3) return;
        const body = JSON.parse(JSON.stringify(req.body));
        if (!body || !this.isValidRequestor(body.access_token, body.app_id, "update")) {
            res.send({ status: "Failed: Missing access_token or app_id" });
            return;
        }

        if (Object.keys(body).length > 3) {
            const newChange = {
                name: body.change_name,
                deviceid: body.change_device,
                attribute: body.change_attribute,
                value: body.change_value,
                data: body.change_data,
                date: body.change_date,
            };

            // Add to queue instead of processing immediately
            this.queueDeviceUpdate(newChange);

            // Send immediate response to Hubitat
            res.send({
                evtSource: `Homebridge_${platformName}_${this.config.client.app_id}`,
                evtType: "attrUpdStatus",
                evtDevice: body.change_name,
                evtAttr: body.change_attribute,
                evtStatus: "Queued",
            });
        } else {
            res.send({
                evtSource: `Homebridge_${platformName}_${this.config.client.app_id}`,
                evtType: "attrUpdStatus",
                evtDevice: body.change_name,
                evtAttr: body.change_attribute,
                evtStatus: "Failed",
            });
        }
    }

    async queueDeviceUpdate(update) {
        // Use memory-based queue for all updates
        if (this.updateQueue.length < this.maxQueueSize) {
            this.updateQueue.push(update);

            // If not processing and no timer set, start batch processing after collection delay
            if (!this.isProcessingQueue && !this.batchTimer) {
                this.batchTimer = setTimeout(() => {
                    this.batchTimer = null;
                    this.processBatchUpdates();
                }, this.collectionDelay);
            }
        } else {
            this.logManager.logWarn(`Update queue full (${this.maxQueueSize}) - dropping update for ${update.name}`);
        }
    }

    async processBatchUpdates() {
        if (this.isProcessingQueue || this.updateQueue.length === 0) {
            return;
        }

        this.isProcessingQueue = true;

        while (this.updateQueue.length > 0) {
            // Take a batch of updates (up to batchSize)
            const batch = this.updateQueue.splice(0, this.batchSize);

            this.logManager.logDebug(`Processing batch of ${batch.length} device updates (${this.updateQueue.length} remaining)`);

            // Process this batch in parallel
            const promises = batch.map((update) =>
                this.processDeviceAttributeUpdate(update).catch((error) => {
                    this.logManager.logError(`Failed to process update for ${update.name}:`, error);
                }),
            );

            await Promise.all(promises);

            // If more updates remain, wait before processing next batch
            if (this.updateQueue.length > 0) {
                await new Promise((resolve) => setTimeout(resolve, this.batchDelay));
            }
        }

        this.isProcessingQueue = false;
    }

    isValidRequestor(access_token, app_id, src) {
        if (this.config.client.validateTokenId !== true) {
            return true;
        }

        // Convert to strings for comparison
        const providedToken = String(access_token || "");
        const configToken = String(this.config.client.access_token || "");
        const providedId = String(app_id || "");
        const configId = String(this.config.client.app_id || "");

        if (providedToken && providedId && configToken && configId) {
            // Use secure comparison for token
            const tokenMatch = this.secureCompare(providedToken, configToken);
            const idMatch = providedId === configId;

            if (tokenMatch && idMatch) {
                return true;
            }
        }

        this.logManager.logError(`(${src}) | We received a request from a client that didn't provide a valid access_token and app_id`);
        return false;
    }

    setupHealthRoutes() {
        webApp.post("/healthCheck", this.handleHealthCheck.bind(this));
    }

    async handleHealthCheck(req, res) {
        const body = JSON.parse(JSON.stringify(req.body));
        if (body && this.isValidRequestor(body.access_token, body.app_id, "healthCheck")) {
            try {
                // Get plugin health data
                const metrics = this.getHealthMetrics();
                const healthData = {
                    status: "OK",
                    pluginVersion: this.versionManager.getVersion(),
                    nodeVersion: process.version,
                    uptime: metrics.uptime.formatted,
                    memory: metrics.memory,
                    timestamp: new Date().toISOString(),
                    hubDateTime: body.hubDateTime,
                    // Add response to Hubitat's health check
                    app_id: body.app_id,
                    app_version: body.app_version,
                };

                res.send({ status: "OK", data: healthData });

                // Log successful health check
                this.logManager.logDebug(`Health check successful for app_id: ${body.app_id}`);
            } catch (ex) {
                this.logManager.logError("HealthCheck Exception:", ex.message);
                res.send({ status: "Failed", message: ex.message });
            }
        } else {
            this.logManager.logWarn(`Invalid health check request from ${body?.app_id || "unknown"}`);
            res.send({ status: "Failed: Missing access_token or app_id" });
        }
    }

    setupMonitoringRoutes() {
        // Get health status
        webApp.get("/monitoring/health", (req, res) => {
            if (this.healthMonitor) {
                const healthStatus = this.healthMonitor.getHealthStatus();
                const connectionStats = this.getAllCachedAccessories().length > 0 ? this.configManager.getConfig() : null;

                res.send({
                    status: "OK",
                    health: healthStatus,
                    uptime: process.uptime(),
                    memory: process.memoryUsage(),
                    timestamp: new Date().toISOString(),
                });
            } else {
                res.send({
                    status: "OK",
                    health: { isHealthy: true, message: "Health monitoring not initialized" },
                    uptime: process.uptime(),
                    memory: process.memoryUsage(),
                    timestamp: new Date().toISOString(),
                });
            }
        });

        // Trigger manual health check
        webApp.post("/monitoring/healthcheck", async (req, res) => {
            const body = JSON.parse(JSON.stringify(req.body));
            if (body && this.isValidRequestor(body.access_token, body.app_id, "monitoring/healthcheck")) {
                if (this.healthMonitor) {
                    try {
                        const healthStatus = await this.healthMonitor.triggerHealthCheck();
                        res.send({ status: "OK", health: healthStatus });
                    } catch (error) {
                        res.send({ status: "Failed", message: error.message });
                    }
                } else {
                    res.send({ status: "Failed", message: "Health monitoring not initialized" });
                }
            } else {
                res.send({ status: "Failed: Missing access_token or app_id" });
            }
        });

        // Reset health statistics
        webApp.post("/monitoring/reset", (req, res) => {
            const body = JSON.parse(JSON.stringify(req.body));
            if (body && this.isValidRequestor(body.access_token, body.app_id, "monitoring/reset")) {
                if (this.healthMonitor) {
                    this.healthMonitor.resetStats();
                    res.send({ status: "OK", message: "Health statistics reset" });
                } else {
                    res.send({ status: "Failed", message: "Health monitoring not initialized" });
                }
            } else {
                res.send({ status: "Failed: Missing access_token or app_id" });
            }
        });

        // Get connection pool statistics
        webApp.get("/monitoring/connections", (req, res) => {
            // This would need to be passed from the client, for now return basic info
            res.send({
                status: "OK",
                message: "Connection statistics available via health endpoint",
                timestamp: new Date().toISOString(),
            });
        });

        // Get queue statistics
        webApp.get("/monitoring/queues", (req, res) => {
            const queueStats = this.getQueueStats();
            res.send({
                status: "OK",
                queues: queueStats,
                timestamp: new Date().toISOString(),
            });
        });

        // Get IP monitoring status
        webApp.get("/monitoring/ip", (req, res) => {
            if (this.ipMonitor) {
                const ipStatus = this.ipMonitor.getStatus();
                res.send({
                    status: "OK",
                    ip_monitoring: ipStatus,
                    timestamp: new Date().toISOString(),
                });
            } else {
                res.send({
                    status: "OK",
                    ip_monitoring: { message: "IP monitoring not initialized" },
                    timestamp: new Date().toISOString(),
                });
            }
        });

        // Force IP check
        webApp.post("/monitoring/check-ip", async (req, res) => {
            const body = JSON.parse(JSON.stringify(req.body));
            if (body && this.isValidRequestor(body.access_token, body.app_id, "monitoring/check-ip")) {
                if (this.ipMonitor) {
                    try {
                        await this.ipMonitor.forceIPCheck();
                        res.send({ status: "OK", message: "IP check completed" });
                    } catch (error) {
                        res.send({ status: "Failed", message: error.message });
                    }
                } else {
                    res.send({ status: "Failed", message: "IP monitoring not initialized" });
                }
            } else {
                res.send({ status: "Failed: Missing access_token or app_id" });
            }
        });

    }


    /**
     * Get queue statistics for monitoring
     */
    getQueueStats() {
        return {
            legacy: {
                size: this.updateQueue.length,
                maxSize: this.maxQueueSize,
                isProcessing: this.isProcessingQueue,
                batchSize: this.batchSize,
            },
        };
    }

    async dispose() {
        // Clean up IP monitoring
        if (this.ipMonitor) {
            this.ipMonitor.dispose();
        }

        // Clean up health monitoring
        if (this.healthMonitor) {
            this.healthMonitor.dispose();
        }


        // Clear any timers
        if (this.batchTimer) {
            clearTimeout(this.batchTimer);
        }
    }
}
