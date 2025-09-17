// WebServer.js

import { pluginName, platformName, platformDesc } from "./StaticConst.js";
import { IPMonitor } from "./IPMonitor.js";
import { HealthMonitor } from "./HealthMonitor.js";
import { AggregatedMetricsManager } from "./MetricsManager.js";
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
        this.metricsManager = platform.metricsManager;
        this.aggregatedMetricsManager = new AggregatedMetricsManager();
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
            const queueDir = path.join(process.cwd(), ".homebridge", "hubitat-queue");

            // Check if the directory exists
            try {
                await fs.access(queueDir);

                // Remove the entire queue directory and its contents
                await fs.rm(queueDir, { recursive: true, force: true });
                this.logManager.logInfo("Cleaned up old persistent queue files from previous version");
            } catch (_) {
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
        } catch (_) {
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
        this.setupMetricsRoutes();
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

            // Record queue metrics
            if (this.metricsManager) {
                this.metricsManager.recordQueueMetrics({ queued: true, queueSize: this.updateQueue.length });
            }

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
            if (this.metricsManager) {
                this.metricsManager.recordQueueMetrics({ dropped: true });
            }
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

            // Record batch processing metrics
            if (this.metricsManager) {
                this.metricsManager.recordQueueMetrics({ processed: batch.length, queueSize: this.updateQueue.length });
            }

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

        // Add a simple test endpoint to verify connectivity
        webApp.get("/healthCheck", (req, res) => {
            this.logManager.logInfo("Health check GET request received - responding with simple OK");
            res.send({ status: "OK", message: "Plugin is responding", timestamp: new Date().toISOString() });
        });
    }

    async handleHealthCheck(req, res) {
        const body = JSON.parse(JSON.stringify(req.body));

        if (this.isValidRequestor(body.access_token, body.app_id, "healthCheck")) {
            const healthData = {
                status: "OK",
                pluginVersion: this.versionManager.getVersion(),
                nodeVersion: process.version,
                uptime: process.uptime(),
                memory: process.memoryUsage(),
                timestamp: new Date().toISOString(),
            };

            res.writeHead(200, { "Content-Type": "application/json" });
            res.end(JSON.stringify(healthData));
        } else {
            res.writeHead(401, { "Content-Type": "application/json" });
            res.end(JSON.stringify({ status: "Failed: Authentication failed" }));
        }
    }

    setupMonitoringRoutes() {
        // Get health status
        webApp.get("/monitoring/health", (req, res) => {
            if (this.healthMonitor) {
                const healthStatus = this.healthMonitor.getHealthStatus();
                const accessoryCount = this.getAllCachedAccessories().length;

                res.send({
                    status: "OK",
                    health: healthStatus,
                    uptime: process.uptime(),
                    accessoryCount: accessoryCount,
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

    setupMetricsRoutes() {
        // Get individual instance metrics API endpoint
        webApp.get("/metrics/api", (req, res) => {
            if (this.metricsManager) {
                const windowHours = req.query.window ? parseInt(req.query.window) : 1;
                const metrics = this.metricsManager.getAllMetrics();

                // Update top devices with specified time window
                if (windowHours !== 1) {
                    metrics.topDevices = this.metricsManager.getTopDevices(10, windowHours);
                }

                res.json(metrics);
            } else {
                res.status(503).json({ error: "Metrics not available" });
            }
        });

        // Get aggregated metrics from all instances
        webApp.get("/metrics/aggregated", async (req, res) => {
            try {
                await this.aggregatedMetricsManager.refreshMetrics();
                const aggregatedMetrics = this.aggregatedMetricsManager.getAggregatedMetrics();
                res.json(aggregatedMetrics);
            } catch (error) {
                res.status(500).json({ error: "Failed to load aggregated metrics", details: error.message });
            }
        });

        // Get metrics for a specific instance
        webApp.get("/metrics/instance/:instanceId", async (req, res) => {
            try {
                const { instanceId } = req.params;
                await this.aggregatedMetricsManager.refreshMetrics();
                const instanceMetrics = this.aggregatedMetricsManager.getInstanceMetrics(instanceId);

                if (instanceMetrics) {
                    res.json(instanceMetrics);
                } else {
                    res.status(404).json({ error: `Instance ${instanceId} not found` });
                }
            } catch (error) {
                res.status(500).json({ error: "Failed to load instance metrics", details: error.message });
            }
        });

        // List all available instances
        webApp.get("/metrics/instances", async (req, res) => {
            try {
                await this.aggregatedMetricsManager.refreshMetrics();
                const instanceIds = this.aggregatedMetricsManager.getInstanceIds();
                res.json({ instances: instanceIds });
            } catch (error) {
                res.status(500).json({ error: "Failed to list instances", details: error.message });
            }
        });

        // Reset metrics endpoint
        webApp.post("/metrics/reset", async (req, res) => {
            const body = JSON.parse(JSON.stringify(req.body));
            if (body && this.isValidRequestor(body.access_token, body.app_id, "metrics/reset")) {
                if (this.metricsManager) {
                    await this.metricsManager.resetMetrics();
                    res.send({ status: "OK", message: "Metrics reset successfully" });
                } else {
                    res.send({ status: "Failed", message: "Metrics manager not initialized" });
                }
            } else {
                res.send({ status: "Failed: Missing access_token or app_id" });
            }
        });

        // Serve metrics dashboard HTML page
        webApp.get("/metrics", (_req, res) => {
            const dashboardHTML = this.getMetricsDashboardHTML();
            res.send(dashboardHTML);
        });

        // Get device history for modal
        webApp.get("/metrics/device-history", (req, res) => {
            const deviceId = req.query.deviceId;
            if (!deviceId) {
                return res.status(400).json({ error: "Device ID required" });
            }

            if (this.metricsManager) {
                const history = this.metricsManager.getDeviceHistory(deviceId);
                res.json(history);
            } else {
                res.status(503).json({ error: "Metrics not available" });
            }
        });

        // Clear error log
        webApp.post("/metrics/clear-errors", (_req, res) => {
            if (this.metricsManager) {
                this.metricsManager.clearErrorLog();
                res.json({ status: "OK", message: "Error log cleared successfully" });
            } else {
                res.status(503).json({ error: "Metrics not available" });
            }
        });
    }

    getMetricsDashboardHTML() {
        return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Homebridge Hubitat Metrics Dashboard</title>
    <script src="https://cdn.jsdelivr.net/npm/chart.js@4.4.0/dist/chart.umd.min.js"></script>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
            padding: 20px;
        }
        
        .container {
            max-width: 1400px;
            margin: 0 auto;
        }
        
        .header {
            background: rgba(255, 255, 255, 0.95);
            border-radius: 16px;
            padding: 30px;
            margin-bottom: 30px;
            box-shadow: 0 10px 30px rgba(0, 0, 0, 0.1);
        }
        
        .header h1 {
            color: #333;
            font-size: 2.5em;
            margin-bottom: 10px;
        }
        
        .header .subtitle {
            color: #666;
            font-size: 1.1em;
        }

        .view-controls {
            display: flex;
            align-items: center;
            gap: 10px;
        }

        .view-btn {
            padding: 8px 16px;
            border: 2px solid #667eea;
            background: transparent;
            color: #667eea;
            border-radius: 6px;
            cursor: pointer;
            font-size: 0.9em;
            transition: all 0.3s ease;
        }

        .view-btn:hover {
            background: #667eea;
            color: white;
        }

        .view-btn.active {
            background: #667eea;
            color: white;
        }


        .history-stats {
            background: linear-gradient(135deg, #f5f5f5, #e8e8e8);
            border: 1px solid #ddd;
            border-radius: 6px;
            padding: 8px 12px;
            margin-bottom: 15px;
            font-size: 0.85em;
            color: #555;
            text-align: center;
        }

        .history-entry {
            background: white;
            border: 1px solid #e0e0e0;
            border-radius: 8px;
            padding: 12px;
            margin-bottom: 8px;
            box-shadow: 0 1px 3px rgba(0,0,0,0.1);
        }

        .history-entry.event {
            border-left: 4px solid #667eea;
        }

        .history-entry.command {
            border-left: 4px solid #4CAF50;
        }

        .history-time {
            color: #666;
            font-size: 0.85em;
            margin-bottom: 4px;
        }

        .history-type {
            padding: 2px 6px;
            border-radius: 3px;
            font-size: 0.75em;
            font-weight: bold;
            text-transform: uppercase;
        }

        .history-type.event {
            background: #667eea;
            color: white;
        }

        .history-type.command {
            background: #4CAF50;
            color: white;
        }

        .history-details {
            margin-top: 6px;
            font-size: 0.9em;
        }

        @media (max-width: 768px) {
            .devices-header {
                flex-direction: column;
                align-items: stretch;
                gap: 15px;
            }

            .device-filters {
                flex-direction: column;
                align-items: stretch;
                gap: 8px;
            }

            .device-filters input,
            .device-filters select {
                min-width: auto;
                width: 100%;
            }

            .history-filters {
                flex-direction: column;
                align-items: stretch;
                gap: 4px;
            }

            .history-filters select {
                min-width: auto;
                width: 100%;
            }
        }
        
        .stats-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
            gap: 20px;
            margin-bottom: 30px;
        }
        
        .stat-card {
            background: rgba(255, 255, 255, 0.95);
            border-radius: 12px;
            padding: 20px;
            box-shadow: 0 5px 15px rgba(0, 0, 0, 0.1);
            transition: transform 0.3s ease, box-shadow 0.3s ease;
        }
        
        .stat-card:hover {
            transform: translateY(-5px);
            box-shadow: 0 10px 25px rgba(0, 0, 0, 0.15);
        }
        
        .stat-card .label {
            color: #666;
            font-size: 0.9em;
            text-transform: uppercase;
            letter-spacing: 1px;
            margin-bottom: 10px;
        }
        
        .stat-card .value {
            color: #333;
            font-size: 2em;
            font-weight: bold;
        }
        
        .stat-card .change {
            color: #4CAF50;
            font-size: 0.9em;
            margin-top: 5px;
        }
        
        .chart-container {
            background: rgba(255, 255, 255, 0.95);
            border-radius: 12px;
            padding: 25px;
            margin-bottom: 25px;
            box-shadow: 0 5px 15px rgba(0, 0, 0, 0.1);
        }
        
        .chart-container h2 {
            color: #333;
            margin-bottom: 20px;
            font-size: 1.5em;
        }
        
        .chart-wrapper {
            position: relative;
            height: 400px;
        }
        
        .chart-wrapper.small {
            height: 300px;
        }
        
        .grid-2 {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(500px, 1fr));
            gap: 25px;
        }
        
        .devices-table {
            background: rgba(255, 255, 255, 0.95);
            border-radius: 12px;
            padding: 25px;
            margin-bottom: 25px;
            box-shadow: 0 5px 15px rgba(0, 0, 0, 0.1);
        }

        .devices-header {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            margin-bottom: 20px;
            flex-wrap: wrap;
            gap: 15px;
        }

        .devices-header h2 {
            color: #333;
            margin: 0;
            font-size: 1.5em;
            flex-shrink: 0;
        }

        .device-filters {
            display: flex;
            gap: 10px;
            align-items: center;
            flex-wrap: wrap;
        }

        .device-filters input,
        .device-filters select {
            padding: 8px 12px;
            border: 1px solid #ddd;
            border-radius: 6px;
            font-size: 0.9em;
            background: white;
            min-width: 120px;
        }

        .device-filters input {
            min-width: 200px;
        }

        .device-filters input:focus,
        .device-filters select:focus {
            outline: none;
            border-color: #667eea;
            box-shadow: 0 0 0 2px rgba(102, 126, 234, 0.1);
        }

        .device-stats {
            margin-bottom: 15px;
            padding: 10px 15px;
            background: linear-gradient(135deg, #f8f9fa, #e9ecef);
            border: 1px solid #dee2e6;
            border-radius: 8px;
            font-size: 0.9em;
            color: #495057;
            text-align: center;
        }
        
        table {
            width: 100%;
            border-collapse: separate;
            border-spacing: 0;
        }
        
        th {
            background: #f5f5f5;
            padding: 12px;
            text-align: left;
            font-weight: 600;
            color: #666;
            border-bottom: 2px solid #e0e0e0;
        }
        
        td {
            padding: 12px;
            border-bottom: 1px solid #f0f0f0;
        }
        
        tbody tr:hover {
            background: #f9f9f9;
        }
        
        .progress-bar {
            background: #e0e0e0;
            border-radius: 10px;
            height: 8px;
            overflow: hidden;
        }
        
        .progress-fill {
            background: linear-gradient(90deg, #667eea, #764ba2);
            height: 100%;
            border-radius: 10px;
            transition: width 0.3s ease;
        }
        
        .error {
            color: #f44336;
            text-align: center;
            padding: 20px;
            background: rgba(255, 255, 255, 0.95);
            border-radius: 12px;
            margin: 20px 0;
        }
        
        .refresh-btn {
            background: linear-gradient(135deg, #667eea, #764ba2);
            color: white;
            border: none;
            padding: 10px 20px;
            border-radius: 8px;
            cursor: pointer;
            font-size: 1em;
            transition: opacity 0.3s ease;
            float: right;
        }
        
        .refresh-btn:hover {
            opacity: 0.9;
        }
        
        .refresh-btn:disabled {
            opacity: 0.5;
            cursor: not-allowed;
        }
        
        .error-console {
            background: rgba(255, 255, 255, 0.95);
            border-radius: 12px;
            padding: 25px;
            margin-bottom: 25px;
            box-shadow: 0 5px 15px rgba(0, 0, 0, 0.1);
            max-height: 400px;
        }
        
        .error-console h2 {
            color: #333;
            margin-bottom: 15px;
            font-size: 1.5em;
            display: flex;
            justify-content: space-between;
            align-items: center;
        }
        
        .error-controls {
            display: flex;
            gap: 10px;
            margin-bottom: 15px;
            flex-wrap: wrap;
        }
        
        .error-filter {
            padding: 8px 15px;
            border: 1px solid #ddd;
            border-radius: 6px;
            background: white;
        }
        
        .clear-btn {
            background: #f44336;
            color: white;
            border: none;
            padding: 8px 15px;
            border-radius: 6px;
            cursor: pointer;
            font-size: 0.9em;
        }
        
        .clear-btn:hover {
            background: #d32f2f;
        }
        
        .error-log {
            background: #1a1a1a;
            color: #00ff00;
            border-radius: 8px;
            padding: 15px;
            height: 250px;
            overflow-y: auto;
            font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
            font-size: 12px;
            line-height: 1.4;
        }
        
        .error-entry {
            margin-bottom: 10px;
            padding: 8px;
            border-left: 3px solid #ff6b6b;
            background: rgba(255, 107, 107, 0.1);
            border-radius: 4px;
        }
        
        .error-time {
            color: #888;
            font-size: 11px;
        }
        
        .error-type {
            color: #ff6b6b;
            font-weight: bold;
        }
        
        .error-message {
            color: #fff;
            margin-top: 4px;
        }
        
        .error-device {
            color: #4CAF50;
            font-size: 11px;
            margin-top: 2px;
        }
        
        .modal {
            display: none;
            position: fixed;
            z-index: 1000;
            left: 0;
            top: 0;
            width: 100%;
            height: 100%;
            background-color: rgba(0,0,0,0.5);
        }
        
        .modal-content {
            background-color: white;
            margin: 5% auto;
            padding: 0;
            border: none;
            border-radius: 12px;
            width: 80%;
            max-width: 800px;
            max-height: 80vh;
            overflow: hidden;
            box-shadow: 0 20px 40px rgba(0,0,0,0.3);
        }
        
        .modal-header {
            background: linear-gradient(135deg, #667eea, #764ba2);
            color: white;
            padding: 20px;
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            flex-wrap: wrap;
            gap: 10px;
        }

        .modal-header .history-filters {
            display: flex;
            gap: 8px;
            align-items: center;
            flex-wrap: wrap;
        }

        .modal-header .history-filters select {
            padding: 4px 8px;
            border: 1px solid rgba(255,255,255,0.3);
            border-radius: 4px;
            font-size: 0.8em;
            background: rgba(255,255,255,0.1);
            color: white;
            min-width: 100px;
        }

        .modal-header .history-filters select option {
            background: white;
            color: #333;
        }
        
        .modal-body {
            padding: 20px;
            max-height: 60vh;
            overflow-y: auto;
        }
        
        .close {
            color: white;
            font-size: 28px;
            font-weight: bold;
            cursor: pointer;
        }
        
        .close:hover {
            opacity: 0.7;
        }
        
        .history-entry {
            border-left: 3px solid #667eea;
            padding: 12px;
            margin-bottom: 10px;
            background: #f8f9fa;
            border-radius: 6px;
        }
        
        .history-entry.command {
            border-left-color: #4CAF50;
        }
        
        .history-entry.error {
            border-left-color: #f44336;
            background: #ffebee;
        }
        
        .history-time {
            color: #666;
            font-size: 0.85em;
            margin-bottom: 5px;
        }
        
        .history-type {
            display: inline-block;
            padding: 2px 8px;
            border-radius: 12px;
            font-size: 0.75em;
            font-weight: bold;
            margin-right: 8px;
        }
        
        .history-type.event {
            background: #e3f2fd;
            color: #1976d2;
        }
        
        .history-type.command {
            background: #e8f5e8;
            color: #388e3c;
        }
        
        .history-details {
            margin-top: 8px;
            color: #333;
        }
        
        .btn {
            background: linear-gradient(135deg, #667eea, #764ba2);
            color: white;
            border: none;
            padding: 8px 16px;
            border-radius: 6px;
            cursor: pointer;
            font-size: 0.9em;
            transition: opacity 0.3s ease;
        }
        
        .btn:hover {
            opacity: 0.9;
        }
        
        .btn:disabled {
            opacity: 0.5;
            cursor: not-allowed;
        }
        
        .time-window-select {
            float: right;
            padding: 6px 12px;
            border: 1px solid #ddd;
            border-radius: 6px;
            background: white;
            font-size: 0.9em;
            margin-left: 15px;
        }
        
        .controls-bar {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 20px;
            flex-wrap: wrap;
            gap: 15px;
        }
        
        .refresh-controls {
            display: flex;
            align-items: center;
            gap: 15px;
        }
        
        .auto-refresh {
            display: flex;
            align-items: center;
            gap: 8px;
        }
        
        .export-controls {
            display: flex;
            gap: 10px;
        }
        
        .toggle-switch {
            position: relative;
            display: inline-block;
            width: 50px;
            height: 24px;
        }
        
        .toggle-switch input {
            opacity: 0;
            width: 0;
            height: 0;
        }
        
        .slider {
            position: absolute;
            cursor: pointer;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background-color: #ccc;
            transition: .4s;
            border-radius: 24px;
        }
        
        .slider:before {
            position: absolute;
            content: "";
            height: 18px;
            width: 18px;
            left: 3px;
            bottom: 3px;
            background-color: white;
            transition: .4s;
            border-radius: 50%;
        }
        
        input:checked + .slider {
            background-color: #667eea;
        }
        
        input:checked + .slider:before {
            transform: translateX(26px);
        }
        
        body.dark-mode {
            background: linear-gradient(135deg, #2c3e50 0%, #34495e 100%);
        }
        
        body.dark-mode .header,
        body.dark-mode .stat-card,
        body.dark-mode .chart-container,
        body.dark-mode .devices-table,
        body.dark-mode .error-console {
            background: rgba(52, 73, 94, 0.95);
            color: #ecf0f1;
        }

        body.dark-mode .device-filters input,
        body.dark-mode .device-filters select {
            background: #34495e;
            border-color: #7f8c8d;
            color: #ecf0f1;
        }

        body.dark-mode .device-filters input::placeholder {
            color: #bdc3c7;
        }

        body.dark-mode .device-stats {
            background: linear-gradient(135deg, #34495e, #2c3e50);
            border-color: #7f8c8d;
            color: #ecf0f1;
        }
        
        body.dark-mode .header h1,
        body.dark-mode .chart-container h2,
        body.dark-mode .devices-table h2,
        body.dark-mode .error-console h2 {
            color: #ecf0f1;
        }
        
        body.dark-mode .stat-card .label {
            color: #bdc3c7;
        }
        
        body.dark-mode .stat-card .value {
            color: #ecf0f1;
        }
        
        body.dark-mode th {
            background: #34495e;
            color: #ecf0f1;
            border-bottom-color: #4a6741;
        }
        
        body.dark-mode td {
            border-bottom-color: #4a6741;
            color: #ecf0f1;
        }
        
        body.dark-mode tbody tr:hover {
            background: rgba(52, 73, 94, 0.7);
        }
        
        body.dark-mode .modal-content {
            background-color: #34495e;
            color: #ecf0f1;
        }
        
        body.dark-mode .history-entry {
            background: #2c3e50;
            color: #ecf0f1;
        }
        
        body.dark-mode .history-entry.error {
            background: #722f37;
        }
        
        @media (max-width: 768px) {
            .grid-2 {
                grid-template-columns: 1fr;
            }
            
            .stats-grid {
                grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
            }
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <div class="controls-bar">
                <div>
                    <h1 style="margin: 0;">Homebridge Hubitat Metrics</h1>
                    <p class="subtitle" style="margin: 5px 0 0 0;">Advanced device monitoring and performance analytics</p>
                    <div class="view-controls" style="margin-top: 10px;">
                        <button class="view-btn active" onclick="switchView('individual')">Individual Instance</button>
                        <button class="view-btn" onclick="switchView('aggregated')">Aggregated View</button>
                        <select id="instanceSelect" style="display: inline-block; margin-left: 10px; padding: 5px; border-radius: 4px;" onchange="switchInstance()">
                            <option value="">Current Instance</option>
                        </select>
                    </div>
                </div>
                <div class="refresh-controls">
                    <div class="auto-refresh">
                        <span>Auto-refresh:</span>
                        <label class="toggle-switch">
                            <input type="checkbox" id="autoRefreshToggle" checked onchange="toggleAutoRefresh()">
                            <span class="slider"></span>
                        </label>
                        <select id="refreshInterval" onchange="updateRefreshInterval()">
                            <option value="5000">5s</option>
                            <option value="10000" selected>10s</option>
                            <option value="30000">30s</option>
                            <option value="60000">1m</option>
                        </select>
                    </div>
                    <div class="export-controls">
                        <button class="btn" onclick="exportData('csv')">Export CSV</button>
                        <button class="btn" onclick="exportData('json')">Export JSON</button>
                        <label class="toggle-switch" title="Dark Mode">
                            <input type="checkbox" id="darkModeToggle" onchange="toggleDarkMode()">
                            <span class="slider"></span>
                        </label>
                        <button class="refresh-btn" onclick="refreshMetrics()">Refresh</button>
                    </div>
                </div>
            </div>
        </div>
        
        <div class="stats-grid" id="statsGrid">
            <div class="stat-card">
                <div class="label">Total Updates</div>
                <div class="value">-</div>
            </div>
            <div class="stat-card">
                <div class="label">Updates/Min</div>
                <div class="value">-</div>
            </div>
            <div class="stat-card">
                <div class="label">Active Devices</div>
                <div class="value">-</div>
            </div>
            <div class="stat-card">
                <div class="label">Avg Processing</div>
                <div class="value">-</div>
            </div>
            <div class="stat-card">
                <div class="label">Queue Size</div>
                <div class="value">-</div>
            </div>
            <div class="stat-card">
                <div class="label">Errors</div>
                <div class="value">-</div>
            </div>
        </div>
        
        <div class="grid-2">
            <div class="chart-container">
                <h2>
                    Top 10 Most Active Devices
                    <select id="timeWindowSelect" class="time-window-select" onchange="updateTimeWindow()">
                        <option value="1">Last Hour</option>
                        <option value="6">Last 6 Hours</option>
                        <option value="24">Last 24 Hours</option>
                        <option value="168">Last 7 Days</option>
                    </select>
                </h2>
                <div class="chart-wrapper">
                    <canvas id="topDevicesChart"></canvas>
                </div>
            </div>
            
            <div class="chart-container">
                <h2>Attribute Distribution</h2>
                <div class="chart-wrapper">
                    <canvas id="attributesChart"></canvas>
                </div>
            </div>
        </div>
        
        <div class="chart-container">
            <h2>Updates Over Time (Last 24 Hours)</h2>
            <div class="chart-wrapper small">
                <canvas id="timelineChart"></canvas>
            </div>
        </div>
        
        <div class="error-console">
            <h2>
                Error Console
                <div class="error-controls">
                    <select class="error-filter" id="errorTypeFilter">
                        <option value="">All Error Types</option>
                    </select>
                    <select class="error-filter" id="errorDeviceFilter">
                        <option value="">All Devices</option>
                    </select>
                    <button class="clear-btn" onclick="clearErrorLog()">Clear Errors</button>
                </div>
            </h2>
            <div class="error-log" id="errorLog">
                Loading error log...
            </div>
        </div>
        
        <div class="grid-2">
            <div class="chart-container">
                <h2>Command Performance</h2>
                <div class="chart-wrapper small">
                    <canvas id="commandChart"></canvas>
                </div>
            </div>
            
            <div class="chart-container">
                <h2>System Health</h2>
                <div class="chart-wrapper small">
                    <canvas id="systemHealthChart"></canvas>
                </div>
            </div>
        </div>
        
        <div class="devices-table">
            <div class="devices-header">
                <h2>Device Details</h2>
                <div class="device-filters">
                    <input type="text" id="deviceNameFilter" placeholder="Filter by device name..." oninput="updateDeviceFilters()">
                    <select id="deviceSortBy" onchange="updateDeviceFilters()">
                        <option value="updates">Sort by Updates</option>
                        <option value="commands">Sort by Commands</option>
                        <option value="successRate">Sort by Success Rate</option>
                        <option value="responseTime">Sort by Response Time</option>
                        <option value="lastActivity">Sort by Last Activity</option>
                        <option value="name">Sort by Name</option>
                    </select>
                    <select id="deviceSortOrder" onchange="updateDeviceFilters()">
                        <option value="desc">Descending</option>
                        <option value="asc">Ascending</option>
                    </select>
                    <select id="deviceLimit" onchange="updateDeviceFilters()">
                        <option value="all">Show All</option>
                        <option value="25">Top 25</option>
                        <option value="50">Top 50</option>
                        <option value="100">Top 100</option>
                    </select>
                </div>
            </div>
            <div class="device-stats" id="deviceStats"></div>
            <table id="devicesTable">
                <thead>
                    <tr>
                        <th>Device Name</th>
                        <th>Updates</th>
                        <th>Commands</th>
                        <th>Success Rate</th>
                        <th>Avg Response (ms)</th>
                        <th>Last Activity</th>
                        <th>History</th>
                    </tr>
                </thead>
                <tbody>
                    <tr>
                        <td colspan="7" style="text-align: center;">Loading...</td>
                    </tr>
                </tbody>
            </table>
        </div>
    </div>
    
    <!-- Device History Modal -->
    <div id="deviceModal" class="modal">
        <div class="modal-content">
            <div class="modal-header">
                <h2 id="modalTitle">Device History</h2>
                <span class="close" onclick="closeModal()">&times;</span>
            </div>
            <div class="modal-body" id="modalBody">
                Loading...
            </div>
        </div>
    </div>
    
    <script>
        let charts = {};
        let metricsData = null;
        let currentView = 'individual';
        let currentInstanceId = null;
        let currentDeviceFilters = {
            nameFilter: '',
            sortBy: 'updates',
            sortOrder: 'desc',
            limit: 'all'
        };

        async function fetchMetrics(endpoint = '/metrics/api') {
            try {
                const response = await fetch(endpoint);
                if (!response.ok) throw new Error('Failed to fetch metrics');
                return await response.json();
            } catch (error) {
                console.error('Error fetching metrics:', error);
                return null;
            }
        }

        async function fetchAggregatedMetrics() {
            return await fetchMetrics('/metrics/aggregated');
        }

        async function fetchInstanceMetrics(instanceId) {
            return await fetchMetrics(\`/metrics/instance/\${instanceId}\`);
        }

        async function fetchAvailableInstances() {
            try {
                const response = await fetch('/metrics/instances');
                if (!response.ok) throw new Error('Failed to fetch instances');
                return await response.json();
            } catch (error) {
                console.error('Error fetching instances:', error);
                return { instances: [] };
            }
        }

        async function switchView(viewType) {
            currentView = viewType;

            // Update button states
            document.querySelectorAll('.view-btn').forEach(btn => btn.classList.remove('active'));
            document.querySelector(\`[onclick="switchView('\${viewType}')"]\`).classList.add('active');

            // Show/hide instance selector
            const instanceSelect = document.getElementById('instanceSelect');
            if (viewType === 'individual') {
                instanceSelect.style.display = 'inline-block';
                currentInstanceId = null; // Reset to current instance
                await updateDashboard();
            } else if (viewType === 'aggregated') {
                instanceSelect.style.display = 'none';
                currentInstanceId = null;
                await updateDashboard();
            }
        }

        async function switchInstance() {
            const instanceSelect = document.getElementById('instanceSelect');
            const selectedInstance = instanceSelect.value;

            if (selectedInstance) {
                currentInstanceId = selectedInstance;
                await updateDashboard();
            }
        }

        async function loadInstanceSelector() {
            const instances = await fetchAvailableInstances();
            const instanceSelect = document.getElementById('instanceSelect');

            // Clear existing options
            instanceSelect.innerHTML = '';

            // Add "Current Instance" option
            const currentOption = document.createElement('option');
            currentOption.value = '';
            currentOption.textContent = 'Current Instance';
            instanceSelect.appendChild(currentOption);

            // Add available instances
            instances.instances.forEach(instanceId => {
                const option = document.createElement('option');
                option.value = instanceId;
                option.textContent = \`Instance \${instanceId}\`;
                instanceSelect.appendChild(option);
            });
        }

        // Original fetchMetrics function
        async function fetchMetricsOriginal() {
            try {
                const response = await fetch('/metrics/api');
                if (!response.ok) throw new Error('Failed to fetch metrics');
                return await response.json();
            } catch (error) {
                console.error('Error fetching metrics:', error);
                return null;
            }
        }
        
        function updateStats(data) {
            const commandSuccessRate = data.commands.totalCommands > 0 ? 
                ((data.commands.totalCommands - data.commands.deviceStats.reduce((sum, d) => sum + d.failedCommands, 0)) / data.commands.totalCommands * 100).toFixed(1) : 0;
                
            const stats = [
                { label: 'Total Updates', value: data.system.totalUpdates.toLocaleString() },
                { label: 'Total Commands', value: data.system.totalCommands.toLocaleString() },
                { label: 'Active Devices', value: data.devices.length.toLocaleString() },
                { label: 'Command Success', value: commandSuccessRate + '%' },
                { label: 'Memory Usage', value: data.systemHealth.memory.used + 'MB' },
                { label: 'Recent Errors', value: data.errorStats.recentErrors.toLocaleString() }
            ];
            
            const statsGrid = document.getElementById('statsGrid');
            let html = stats.map(stat => \`
                <div class="stat-card">
                    <div class="label">\${stat.label}</div>
                    <div class="value">\${stat.value}</div>
                </div>
            \`).join('');
            
            // Add startup grace period indicator if active
            if (data.system.isInStartupGrace) {
                html += \`
                    <div class="stat-card" style="border-left: 4px solid #ff9800; background: rgba(255, 152, 0, 0.1);">
                        <div class="label">Startup Grace</div>
                        <div class="value">Active</div>
                        <div class="change" style="color: #ff9800; font-size: 0.8em;">Metrics paused during device discovery</div>
                    </div>
                \`;
            }
            
            statsGrid.innerHTML = html;
        }
        
        function createTopDevicesChart(data, windowHours = 1) {
            const ctx = document.getElementById('topDevicesChart').getContext('2d');
            
            if (charts.topDevices) {
                charts.topDevices.destroy();
            }
            
            const topDevices = data.topDevices.slice(0, 10);
            const windowLabel = windowHours === 1 ? 'Last Hour' : 
                              windowHours === 6 ? 'Last 6 Hours' :
                              windowHours === 24 ? 'Last 24 Hours' : 'Last 7 Days';
            
            charts.topDevices = new Chart(ctx, {
                type: 'bar',
                data: {
                    labels: topDevices.map(d => d.deviceName),
                    datasets: [{
                        label: \`Events (\${windowLabel})\`,
                        data: topDevices.map(d => d.events || 0),
                        backgroundColor: 'rgba(102, 126, 234, 0.8)',
                        borderColor: 'rgba(102, 126, 234, 1)',
                        borderWidth: 1
                    }, {
                        label: \`Commands (\${windowLabel})\`,
                        data: topDevices.map(d => d.commands || 0),
                        backgroundColor: 'rgba(76, 175, 80, 0.8)',
                        borderColor: 'rgba(76, 175, 80, 1)',
                        borderWidth: 1
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: {
                            display: true,
                            position: 'top'
                        }
                    },
                    scales: {
                        x: {
                            stacked: true
                        },
                        y: {
                            stacked: true,
                            beginAtZero: true
                        }
                    }
                }
            });
        }
        
        function createAttributesChart(data) {
            const ctx = document.getElementById('attributesChart').getContext('2d');
            
            if (charts.attributes) {
                charts.attributes.destroy();
            }
            
            const topAttributes = data.attributes.slice(0, 8);
            
            charts.attributes = new Chart(ctx, {
                type: 'doughnut',
                data: {
                    labels: topAttributes.map(a => a.attribute),
                    datasets: [{
                        data: topAttributes.map(a => a.count),
                        backgroundColor: [
                            'rgba(102, 126, 234, 0.8)',
                            'rgba(118, 75, 162, 0.8)',
                            'rgba(244, 143, 177, 0.8)',
                            'rgba(255, 167, 38, 0.8)',
                            'rgba(66, 165, 245, 0.8)',
                            'rgba(102, 187, 106, 0.8)',
                            'rgba(255, 202, 40, 0.8)',
                            'rgba(141, 110, 184, 0.8)'
                        ]
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: {
                            position: 'right'
                        }
                    }
                }
            });
        }
        
        function createTimelineChart(data) {
            const ctx = document.getElementById('timelineChart').getContext('2d');
            
            if (charts.timeline) {
                charts.timeline.destroy();
            }
            
            const hourlyData = data.hourly || [];
            const hours = [];
            const updates = [];
            
            for (let i = 0; i < 24; i++) {
                const hour = new Date();
                hour.setHours(hour.getHours() - (23 - i));
                hours.push(hour.getHours() + ':00');
                
                const hourData = hourlyData.find(h => h.hour === hour.getHours());
                updates.push(hourData ? hourData.updates : 0);
            }
            
            charts.timeline = new Chart(ctx, {
                type: 'line',
                data: {
                    labels: hours,
                    datasets: [{
                        label: 'Updates',
                        data: updates,
                        borderColor: 'rgba(102, 126, 234, 1)',
                        backgroundColor: 'rgba(102, 126, 234, 0.1)',
                        tension: 0.4
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: {
                            display: false
                        }
                    },
                    scales: {
                        y: {
                            beginAtZero: true
                        }
                    }
                }
            });
        }
        
        // createProcessingChart function removed - replaced with command performance chart
        
        function createCommandChart(data) {
            const ctx = document.getElementById('commandChart').getContext('2d');
            
            if (charts.command) {
                charts.command.destroy();
            }
            
            const commandData = data.commands;
            const totalSuccessful = commandData.totalCommands - commandData.deviceStats.reduce((sum, d) => sum + d.failedCommands, 0);
            const totalFailed = commandData.deviceStats.reduce((sum, d) => sum + d.failedCommands, 0);
            
            charts.command = new Chart(ctx, {
                type: 'doughnut',
                data: {
                    labels: ['Successful', 'Failed', 'Avg Response Time (ms)'],
                    datasets: [{
                        data: [totalSuccessful, totalFailed, commandData.avgResponseTime],
                        backgroundColor: [
                            'rgba(102, 187, 106, 0.8)',
                            'rgba(244, 67, 54, 0.8)',
                            'rgba(255, 167, 38, 0.8)'
                        ]
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: {
                            position: 'right'
                        }
                    }
                }
            });
        }
        
        function createSystemHealthChart(data) {
            const ctx = document.getElementById('systemHealthChart').getContext('2d');
            
            if (charts.systemHealth) {
                charts.systemHealth.destroy();
            }
            
            const health = data.systemHealth;
            
            charts.systemHealth = new Chart(ctx, {
                type: 'bar',
                data: {
                    labels: ['Memory Used', 'Memory Total', 'Error Rate %', 'Uptime (hrs)'],
                    datasets: [{
                        label: 'System Health',
                        data: [
                            health.memory.used,
                            health.memory.total,
                            health.errorRate,
                            health.uptime.seconds / 3600
                        ],
                        backgroundColor: [
                            'rgba(244, 143, 177, 0.8)',
                            'rgba(66, 165, 245, 0.8)',
                            health.errorRate > 5 ? 'rgba(244, 67, 54, 0.8)' : 'rgba(102, 187, 106, 0.8)',
                            'rgba(102, 126, 234, 0.8)'
                        ]
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: {
                            display: false
                        }
                    },
                    scales: {
                        y: {
                            beginAtZero: true
                        }
                    }
                }
            });
        }
        
        function updateDevicesTable(data) {
            const tbody = document.querySelector('#devicesTable tbody');
            const statsDiv = document.getElementById('deviceStats');

            // Apply filters, sorting, and limiting
            let filteredDevices = applyDeviceFilters(data.devices);

            // Update statistics
            statsDiv.innerHTML = \`<strong>Showing \${filteredDevices.length}</strong> of <strong>\${data.devices.length}</strong> total devices\`;

            tbody.innerHTML = filteredDevices.map(device => {
                const lastActivity = Math.max(device.lastUpdate || 0, device.lastCommand || 0);
                const lastActivityStr = lastActivity ? new Date(lastActivity).toLocaleString() : 'Never';

                return \`
                    <tr>
                        <td>\${device.deviceName}</td>
                        <td>\${device.totalUpdates.toLocaleString()}</td>
                        <td>\${device.totalCommands.toLocaleString()}</td>
                        <td>\${device.commandSuccessRate.toFixed(1)}%</td>
                        <td>\${device.avgResponseTime.toFixed(2)} ms</td>
                        <td>\${lastActivityStr}</td>
                        <td>
                            <button class="btn" onclick="showDeviceHistory('\${device.deviceId}', '\${device.deviceName}')">
                                History
                            </button>
                        </td>
                    </tr>
                \`;
            }).join('');
        }

        function applyDeviceFilters(devices) {
            let filtered = [...devices];

            // Apply name filter
            if (currentDeviceFilters.nameFilter) {
                const filter = currentDeviceFilters.nameFilter.toLowerCase();
                filtered = filtered.filter(device =>
                    device.deviceName.toLowerCase().includes(filter)
                );
            }

            // Apply sorting
            filtered.sort((a, b) => {
                let aValue, bValue;

                switch (currentDeviceFilters.sortBy) {
                    case 'updates':
                        aValue = a.totalUpdates;
                        bValue = b.totalUpdates;
                        break;
                    case 'commands':
                        aValue = a.totalCommands;
                        bValue = b.totalCommands;
                        break;
                    case 'successRate':
                        aValue = a.commandSuccessRate;
                        bValue = b.commandSuccessRate;
                        break;
                    case 'responseTime':
                        aValue = a.avgResponseTime;
                        bValue = b.avgResponseTime;
                        break;
                    case 'lastActivity':
                        aValue = Math.max(a.lastUpdate || 0, a.lastCommand || 0);
                        bValue = Math.max(b.lastUpdate || 0, b.lastCommand || 0);
                        break;
                    case 'name':
                        aValue = a.deviceName.toLowerCase();
                        bValue = b.deviceName.toLowerCase();
                        break;
                    default:
                        aValue = a.totalUpdates;
                        bValue = b.totalUpdates;
                }

                if (currentDeviceFilters.sortOrder === 'asc') {
                    return aValue > bValue ? 1 : aValue < bValue ? -1 : 0;
                } else {
                    return aValue < bValue ? 1 : aValue > bValue ? -1 : 0;
                }
            });

            // Apply limit
            if (currentDeviceFilters.limit !== 'all') {
                const limit = parseInt(currentDeviceFilters.limit);
                filtered = filtered.slice(0, limit);
            }

            return filtered;
        }

        function updateDeviceFilters() {
            const nameFilter = document.getElementById('deviceNameFilter');
            const sortBy = document.getElementById('deviceSortBy');
            const sortOrder = document.getElementById('deviceSortOrder');
            const limit = document.getElementById('deviceLimit');

            if (nameFilter && sortBy && sortOrder && limit) {
                currentDeviceFilters.nameFilter = nameFilter.value;
                currentDeviceFilters.sortBy = sortBy.value;
                currentDeviceFilters.sortOrder = sortOrder.value;
                currentDeviceFilters.limit = limit.value;

                // Re-render the devices table with new filters
                if (metricsData) {
                    updateDevicesTable(metricsData);
                }
            }
        }
        
        function updateErrorConsole(data) {
            const errorLog = document.getElementById('errorLog');
            const typeFilter = document.getElementById('errorTypeFilter');
            const deviceFilter = document.getElementById('errorDeviceFilter');
            
            // Update filter options
            const types = [...new Set(data.errorStats.errorTypes.map(e => e.type))];
            const currentTypeValue = typeFilter.value;
            typeFilter.innerHTML = '<option value="">All Error Types</option>' + 
                types.map(type => \`<option value="\${type}" \${type === currentTypeValue ? 'selected' : ''}>\${type}</option>\`).join('');
            
            const devices = data.errorStats.deviceErrors;
            const currentDeviceValue = deviceFilter.value;
            deviceFilter.innerHTML = '<option value="">All Devices</option>' + 
                devices.map(device => \`<option value="\${device.deviceId}" \${device.deviceId === currentDeviceValue ? 'selected' : ''}>\${device.deviceName}</option>\`).join('');
            
            // Filter and display errors
            let filteredErrors = data.errors;
            
            if (typeFilter.value) {
                filteredErrors = filteredErrors.filter(error => error.type === typeFilter.value);
            }
            
            if (deviceFilter.value) {
                filteredErrors = filteredErrors.filter(error => error.deviceId === deviceFilter.value);
            }
            
            if (filteredErrors.length === 0) {
                errorLog.innerHTML = '<div style="color: #888; text-align: center; margin-top: 50px;">No errors found</div>';
                return;
            }
            
            errorLog.innerHTML = filteredErrors.map(error => \`
                <div class="error-entry">
                    <div class="error-time">\${new Date(error.timestamp).toLocaleString()}</div>
                    <div class="error-type">[\${error.type}]</div>
                    <div class="error-message">\${error.message}</div>
                    \${error.deviceName ? \`<div class="error-device">Device: \${error.deviceName}</div>\` : ''}
                </div>
            \`).join('');
            
            // Scroll to bottom
            errorLog.scrollTop = errorLog.scrollHeight;
        }
        
        let currentHistoryFilters = {
            timeWindow: 1, // hours
            typeFilter: 'all', // all, event, command
            limit: 50
        };

        async function showDeviceHistory(deviceId, deviceName) {
            // Store current device ID for filter updates
            window.currentDeviceId = deviceId;
            window.currentDeviceName = deviceName;

            const modal = document.getElementById('deviceModal');
            const modalTitle = document.getElementById('modalTitle');
            const modalBody = document.getElementById('modalBody');

            modalTitle.innerHTML = \`History: \${deviceName}\`;

            // Add filter controls to modal header
            const modalHeader = document.querySelector('.modal-header');
            if (!modalHeader.querySelector('.history-filters')) {
                const filtersDiv = document.createElement('div');
                filtersDiv.className = 'history-filters';
                filtersDiv.innerHTML = \`
                    <select id="historyTimeWindow" onchange="updateHistoryFilters()">
                        <option value="1">Last Hour</option>
                        <option value="6">Last 6 Hours</option>
                        <option value="24" selected>Last 24 Hours</option>
                        <option value="168">Last 7 Days</option>
                    </select>
                    <select id="historyTypeFilter" onchange="updateHistoryFilters()">
                        <option value="all">All Types</option>
                        <option value="event">Events Only</option>
                        <option value="command">Commands Only</option>
                    </select>
                    <select id="historyLimit" onchange="updateHistoryFilters()">
                        <option value="25">Last 25</option>
                        <option value="50" selected>Last 50</option>
                        <option value="100">Last 100</option>
                        <option value="500">Last 500</option>
                    </select>
                \`;
                modalHeader.appendChild(filtersDiv);
            }

            modalBody.innerHTML = 'Loading device history...';
            modal.style.display = 'block';

            await loadDeviceHistory(deviceId);
        }

        async function loadDeviceHistory(deviceId) {
            const modalBody = document.getElementById('modalBody');

            try {
                const response = await fetch(\`/metrics/device-history?deviceId=\${deviceId}\`);
                const history = await response.json();

                if (history.length === 0) {
                    modalBody.innerHTML = '<div style="text-align: center; color: #888; margin-top: 50px;">No history available for this device</div>';
                    return;
                }

                // Apply filters
                let filteredHistory = applyHistoryFilters(history);

                modalBody.innerHTML = \`
                    <div class="history-stats" style="margin-bottom: 15px; padding: 10px; background: #f5f5f5; border-radius: 5px; font-size: 0.9em;">
                        Showing <strong>\${filteredHistory.length}</strong> of <strong>\${history.length}</strong> total entries
                    </div>
                    \${filteredHistory.map(entry => \`
                        <div class="history-entry \${entry.type}">
                            <div class="history-time">\${new Date(entry.timestamp).toLocaleString()}</div>
                            <span class="history-type \${entry.type}">\${entry.type.toUpperCase()}</span>
                            <div class="history-details">
                                \${entry.type === 'event' ? \`
                                    <strong>\${entry.attribute}:</strong> \${entry.value}
                                    \${entry.processingTime ? \`<br><small>Processing time: \${entry.processingTime}ms</small>\` : ''}
                                \` : \`
                                    <strong>Command:</strong> \${entry.command}
                                    \${entry.parameters && entry.parameters.length > 0 ? \`<br><strong>Parameters:</strong> \${entry.parameters.join(', ')}\` : ''}
                                    \${entry.responseTime ? \`<br><small>Response time: \${entry.responseTime}ms</small>\` : ''}
                                    <br><span style="color: \${entry.success ? '#4CAF50' : '#f44336'}">\${entry.success ? 'Success' : 'Failed' + (entry.error ? ': ' + entry.error : '')}</span>
                                \`}
                            </div>
                        </div>
                    \`).join('')}
                \`;
            } catch (error) {
                modalBody.innerHTML = '<div style="text-align: center; color: #f44336; margin-top: 50px;">Error loading device history</div>';
            }
        }

        function applyHistoryFilters(history) {
            const now = new Date();
            const timeWindowMs = currentHistoryFilters.timeWindow * 60 * 60 * 1000;
            const cutoffTime = now.getTime() - timeWindowMs;

            let filtered = history.filter(entry => {
                // Time filter
                const entryTime = new Date(entry.timestamp).getTime();
                if (entryTime < cutoffTime) return false;

                // Type filter
                if (currentHistoryFilters.typeFilter !== 'all' && entry.type !== currentHistoryFilters.typeFilter) {
                    return false;
                }

                return true;
            });

            // Sort by timestamp (newest first) and apply limit
            return filtered
                .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
                .slice(0, currentHistoryFilters.limit);
        }

        function updateHistoryFilters() {
            const timeWindowSelect = document.getElementById('historyTimeWindow');
            const typeFilterSelect = document.getElementById('historyTypeFilter');
            const limitSelect = document.getElementById('historyLimit');

            if (timeWindowSelect && typeFilterSelect && limitSelect) {
                currentHistoryFilters.timeWindow = parseInt(timeWindowSelect.value);
                currentHistoryFilters.typeFilter = typeFilterSelect.value;
                currentHistoryFilters.limit = parseInt(limitSelect.value);

                // Re-load history with new filters
                if (window.currentDeviceId) {
                    loadDeviceHistory(window.currentDeviceId);
                }
            }
        }
        
        function closeModal() {
            document.getElementById('deviceModal').style.display = 'none';
        }
        
        async function clearErrorLog() {
            if (!confirm('Are you sure you want to clear all error logs?')) {
                return;
            }
            
            try {
                const response = await fetch('/metrics/clear-errors', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({})
                });
                
                if (response.ok) {
                    await updateDashboard();
                } else {
                    alert('Failed to clear error log');
                }
            } catch (error) {
                alert('Error clearing error log: ' + error.message);
            }
        }
        
        async function updateDashboard() {
            let data = null;

            if (currentView === 'aggregated') {
                data = await fetchAggregatedMetrics();
            } else if (currentView === 'individual' && currentInstanceId) {
                data = await fetchInstanceMetrics(currentInstanceId);
            } else {
                data = await fetchMetrics('/metrics/api');
            }

            if (!data) {
                document.body.innerHTML = '<div class="error">Failed to load metrics. Please refresh the page.</div>';
                return;
            }

            metricsData = data;
            
            updateStats(data);
            createTopDevicesChart(data, currentTimeWindow);
            createAttributesChart(data);
            createTimelineChart(data);
            createCommandChart(data);
            createSystemHealthChart(data);
            updateDevicesTable(data);
            updateErrorConsole(data);
        }
        
        async function refreshMetrics() {
            const btn = document.querySelector('.refresh-btn');
            btn.disabled = true;
            btn.textContent = 'Refreshing...';
            
            await updateDashboard();
            
            btn.disabled = false;
            btn.textContent = 'Refresh';
        }
        
        // Initial load
        loadInstanceSelector();
        updateDashboard();

        // Auto-refresh configuration
        let autoRefreshInterval;
        let currentRefreshRate = 10000; // 10 seconds
        let currentTimeWindow = 1; // 1 hour
        
        // Start auto-refresh
        function startAutoRefresh() {
            if (autoRefreshInterval) {
                clearInterval(autoRefreshInterval);
            }
            autoRefreshInterval = setInterval(updateDashboard, currentRefreshRate);
        }
        
        // Initial auto-refresh
        startAutoRefresh();
        
        // UI Control Functions
        function toggleAutoRefresh() {
            const toggle = document.getElementById('autoRefreshToggle');
            if (toggle.checked) {
                startAutoRefresh();
            } else {
                if (autoRefreshInterval) {
                    clearInterval(autoRefreshInterval);
                    autoRefreshInterval = null;
                }
            }
        }
        
        function updateRefreshInterval() {
            const select = document.getElementById('refreshInterval');
            currentRefreshRate = parseInt(select.value);
            const toggle = document.getElementById('autoRefreshToggle');
            if (toggle.checked) {
                startAutoRefresh();
            }
        }
        
        function updateTimeWindow() {
            const select = document.getElementById('timeWindowSelect');
            currentTimeWindow = parseInt(select.value);
            
            // Fetch updated data with new time window
            fetchMetricsWithTimeWindow(currentTimeWindow).then(data => {
                if (data) {
                    metricsData = data;
                    createTopDevicesChart(data, currentTimeWindow);
                }
            });
        }
        
        async function fetchMetricsWithTimeWindow(windowHours) {
            try {
                const response = await fetch(\`/metrics/api?window=\${windowHours}\`);
                if (!response.ok) throw new Error('Failed to fetch metrics');
                return await response.json();
            } catch (error) {
                console.error('Error fetching metrics with time window:', error);
                return null;
            }
        }
        
        function toggleDarkMode() {
            const toggle = document.getElementById('darkModeToggle');
            const body = document.body;
            
            if (toggle.checked) {
                body.classList.add('dark-mode');
                localStorage.setItem('darkMode', 'enabled');
            } else {
                body.classList.remove('dark-mode');
                localStorage.setItem('darkMode', 'disabled');
            }
        }
        
        function exportData(format) {
            if (!metricsData) {
                alert('No data available to export');
                return;
            }
            
            let filename, content, mimeType;
            
            if (format === 'csv') {
                filename = \`metrics_\${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.csv\`;
                content = convertToCSV(metricsData);
                mimeType = 'text/csv';
            } else {
                filename = \`metrics_\${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.json\`;
                content = JSON.stringify(metricsData, null, 2);
                mimeType = 'application/json';
            }
            
            const blob = new Blob([content], { type: mimeType });
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = filename;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            window.URL.revokeObjectURL(url);
        }
        
        function convertToCSV(data) {
            let csv = 'Device Name,Total Updates,Total Commands,Success Rate %,Avg Processing Time (ms),Avg Response Time (ms),Last Update,Last Command\\n';
            
            data.devices.forEach(device => {
                const lastUpdate = device.lastUpdate ? new Date(device.lastUpdate).toISOString() : '';
                const lastCommand = device.lastCommand ? new Date(device.lastCommand).toISOString() : '';
                csv += \`"\${device.deviceName}",\${device.totalUpdates},\${device.totalCommands},\${device.commandSuccessRate.toFixed(2)},\${device.avgProcessingTime.toFixed(2)},\${device.avgResponseTime.toFixed(2)},"\${lastUpdate}","\${lastCommand}"\\n\`;
            });
            
            return csv;
        }
        
        // Modal event handlers
        window.onclick = function(event) {
            const modal = document.getElementById('deviceModal');
            if (event.target == modal) {
                closeModal();
            }
        }
        
        // Initialize UI state from localStorage
        document.addEventListener('DOMContentLoaded', function() {
            // Dark mode
            const darkMode = localStorage.getItem('darkMode');
            const darkModeToggle = document.getElementById('darkModeToggle');
            if (darkMode === 'enabled') {
                darkModeToggle.checked = true;
                document.body.classList.add('dark-mode');
            }
            
            // Error filter event handlers
            document.getElementById('errorTypeFilter').addEventListener('change', function() {
                if (metricsData) updateErrorConsole(metricsData);
            });
            
            document.getElementById('errorDeviceFilter').addEventListener('change', function() {
                if (metricsData) updateErrorConsole(metricsData);
            });
        });
    </script>
</body>
</html>`;
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
