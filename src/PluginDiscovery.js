/**
 * @file PluginDiscovery.js
 * @description Handles plugin discovery via mDNS/Bonjour for multi-instance support
 */

import { Bonjour } from 'bonjour-service';
import crypto from 'crypto';
import os from 'os';

export class PluginDiscovery {
    constructor(platform) {
        this.logManager = platform.logManager;
        this.configManager = platform.configManager;
        this.config = platform.config;
        this.bonjour = new Bonjour();
        this.service = null;
        this.pluginId = this.generatePluginId();
        
        // Track discovered plugins
        this.discoveredPlugins = new Map();
        
        // Periodic scanning state
        this.scanInterval = null;
        this.consecutiveFailures = 0;
        this.lastScanTime = 0;
        this.scanStats = {
            totalScans: 0,
            successfulScans: 0,
            failedScans: 0,
            lastError: null,
        };
        
        // Subscribe to config updates
        this.configManager.onConfigUpdate((newConfig) => {
            this.config = newConfig;
            // Restart periodic scanning if config changed
            if (this.scanInterval) {
                this.stopPeriodicScanning();
                this.startPeriodicScanning();
            }
        });
    }

    /**
     * Generate unique plugin ID using ConfigManager's instance ID
     */
    generatePluginId() {
        // Always include app_id and port for clarity
        const appId = this.config.client.app_id || 'default';
        const port = this.configManager.getActivePort() || '8000';
        
        // Use the ConfigManager's instance ID if multi-instance is enabled
        if (this.configManager.isMultiInstanceEnabled()) {
            const instanceConfig = this.configManager.getInstanceConfig();
            // Instance ID already includes app_id and port, so just use it
            return `hb-${instanceConfig.instance_id}`;
        }
        
        // Fallback to simpler format
        const networkInterfaces = os.networkInterfaces();
        let macAddress = 'unknown';
        
        // Find the first non-internal network interface with a MAC address
        for (const [name, interfaces] of Object.entries(networkInterfaces)) {
            for (const iface of interfaces || []) {
                if (!iface.internal && iface.mac && iface.mac !== '00:00:00:00:00:00') {
                    macAddress = iface.mac.replace(/:/g, '').substring(0, 6);
                    break;
                }
            }
            if (macAddress !== 'unknown') break;
        }
        
        // Create readable ID with app_id and port
        return `hb-${appId}-${macAddress}-p${port}`;
    }

    /**
     * Start advertising this plugin instance via mDNS
     */
    startAdvertising() {
        // Check if discovery is enabled
        if (!this.configManager.isDiscoveryEnabled()) {
            this.logManager.logInfo("Plugin discovery is disabled");
            return;
        }

        try {
            const ip = this.configManager.getActiveIP();
            const port = this.configManager.getActivePort();
            const instanceConfig = this.configManager.getInstanceConfig();
            
            this.service = this.bonjour.publish({
                name: this.pluginId,
                type: 'homebridge-hubitat',
                port: port,
                host: ip,
                txt: {
                    app_id: this.config.client.app_id || 'unknown',
                    version: '3.0.0',
                    plugin_id: this.pluginId,
                    instance_id: instanceConfig.instance_id,
                    instance_name: instanceConfig.instance_name,
                    capabilities: JSON.stringify([
                        'device_updates',
                        'direct_connect',
                        'batch_commands',
                        instanceConfig.health_monitoring ? 'health_monitoring' : null,
                        instanceConfig.persistent_queues ? 'persistent_queues' : null,
                        instanceConfig.connection_pooling ? 'connection_pooling' : null
                    ].filter(Boolean)),
                    started: Date.now().toString(),
                    multi_instance_enabled: this.configManager.isMultiInstanceEnabled().toString()
                }
            });

            this.logManager.logSuccess(`Plugin Discovery: Advertising as ${this.pluginId} at ${ip}:${port}`);
            
            // Set up service event handlers
            this.service.on('up', () => {
                this.logManager.logDebug('mDNS service is up');
            });
            
            this.service.on('error', (err) => {
                this.logManager.logError('mDNS service error:', err);
            });
            
        } catch (error) {
            this.logManager.logError('Failed to start mDNS advertising:', error);
        }
    }

    /**
     * Stop advertising this plugin instance
     */
    stopAdvertising() {
        if (this.service) {
            try {
                this.service.stop();
                this.logManager.logDebug('Stopped mDNS advertising');
            } catch (error) {
                this.logManager.logError('Error stopping mDNS service:', error);
            }
        }
    }

    /**
     * Discover other plugin instances on the network
     */
    discoverPlugins(timeout = 5000) {
        return new Promise((resolve) => {
            const browser = this.bonjour.find({ type: 'homebridge-hubitat' });
            const plugins = new Map();
            
            browser.on('up', (service) => {
                if (service.name !== this.pluginId) { // Don't include ourselves
                    const pluginInfo = {
                        id: service.name,
                        ip: service.host,
                        port: service.port,
                        app_id: service.txt?.app_id,
                        version: service.txt?.version,
                        capabilities: service.txt?.capabilities ? JSON.parse(service.txt.capabilities) : [],
                        discovered: Date.now()
                    };
                    
                    plugins.set(service.name, pluginInfo);
                    this.discoveredPlugins.set(service.name, pluginInfo);
                    
                    this.logManager.logInfo(`Discovered plugin: ${service.name} at ${service.host}:${service.port}`);
                }
            });
            
            browser.on('down', (service) => {
                if (plugins.has(service.name)) {
                    plugins.delete(service.name);
                    this.discoveredPlugins.delete(service.name);
                    this.logManager.logInfo(`Plugin went offline: ${service.name}`);
                }
            });
            
            // Stop discovery after timeout
            setTimeout(() => {
                browser.stop();
                resolve(Array.from(plugins.values()));
            }, timeout);
        });
    }

    /**
     * Get information about this plugin instance
     */
    getPluginInfo() {
        return {
            id: this.pluginId,
            ip: this.configManager.getActiveIP(),
            port: this.configManager.getActivePort(),
            app_id: this.config.client.app_id,
            version: '3.0.0',
            capabilities: [
                'device_updates',
                'direct_connect',
                'batch_commands'
            ]
        };
    }

    /**
     * Get all discovered plugins
     */
    getDiscoveredPlugins() {
        return Array.from(this.discoveredPlugins.values());
    }

    /**
     * Check if another plugin with same app_id exists and handle conflicts
     */
    hasConflictingInstance() {
        const currentAppId = this.config.client.app_id;
        const conflictingPlugins = Array.from(this.discoveredPlugins.values())
            .filter(plugin => plugin.app_id === currentAppId && plugin.id !== this.pluginId);

        if (conflictingPlugins.length > 0) {
            const conflictResolution = this.configManager.getConflictResolution();
            const instanceConfig = this.configManager.getInstanceConfig();

            switch (conflictResolution) {
                case 'error':
                    this.logManager.logError(`CONFLICT: Multiple plugin instances detected with same app_id (${currentAppId}). This will cause device conflicts. Please configure unique app_ids for each instance.`);
                    conflictingPlugins.forEach(plugin => {
                        this.logManager.logError(`  - Conflicting instance: ${plugin.id} at ${plugin.ip}:${plugin.port}`);
                    });
                    throw new Error(`Multiple plugin instances with same app_id: ${currentAppId}`);
                    
                case 'warn':
                    this.logManager.logWarn(`WARNING: Multiple plugin instances detected with same app_id (${currentAppId}). This may cause device conflicts.`);
                    this.logManager.logWarn(`Current instance: ${instanceConfig.instance_name} (${instanceConfig.instance_id})`);
                    conflictingPlugins.forEach(plugin => {
                        this.logManager.logWarn(`  - Other instance: ${plugin.instance_name || plugin.id} at ${plugin.ip}:${plugin.port}`);
                    });
                    break;
                    
                case 'ignore':
                    this.logManager.logDebug(`Multiple plugin instances detected with same app_id (${currentAppId}) - ignoring due to configuration`);
                    break;
            }
            return true;
        }
        return false;
    }

    /**
     * Start periodic plugin discovery scanning
     */
    startPeriodicScanning() {
        // Check if periodic scanning is enabled
        if (!this.configManager.isDiscoveryEnabled() || !this.config.multi_instance.enabled) {
            this.logManager.logDebug("Periodic discovery scanning is disabled");
            return;
        }

        const interval = this.config.multi_instance.scan_interval || 300000; // Default 5 minutes
        const maxFailures = this.config.multi_instance.max_scan_failures || 3;

        this.logManager.logInfo(`Starting periodic discovery scanning every ${interval / 1000} seconds`);

        this.scanInterval = setInterval(async () => {
            try {
                this.scanStats.totalScans++;
                const startTime = Date.now();
                
                // Perform discovery scan
                const plugins = await this.discoverPlugins(3000); // 3 second scan
                
                this.lastScanTime = Date.now();
                this.scanStats.successfulScans++;
                this.consecutiveFailures = 0;
                
                // Handle discovery results
                this.handleDiscoveryResults(plugins);
                
                const scanTime = Date.now() - startTime;
                this.logManager.logDebug(`Periodic scan completed in ${scanTime}ms, found ${plugins.length} plugins`);
                
            } catch (error) {
                this.consecutiveFailures++;
                this.scanStats.failedScans++;
                this.scanStats.lastError = error.message;
                
                this.logManager.logError(`Periodic discovery scan failed: ${error.message}`);
                
                // Stop scanning if too many failures
                if (this.consecutiveFailures >= maxFailures) {
                    this.logManager.logWarn(`Stopping periodic discovery after ${this.consecutiveFailures} consecutive failures`);
                    this.stopPeriodicScanning();
                }
            }
        }, interval);

        // Perform initial scan after a short delay
        setTimeout(() => {
            this.triggerDiscoveryScan("startup");
        }, 2000);
    }

    /**
     * Stop periodic scanning
     */
    stopPeriodicScanning() {
        if (this.scanInterval) {
            clearInterval(this.scanInterval);
            this.scanInterval = null;
            this.logManager.logInfo("Stopped periodic discovery scanning");
        }
    }

    /**
     * Handle discovery results and check for conflicts
     */
    handleDiscoveryResults(plugins) {
        if (!plugins || plugins.length === 0) return;

        // Check for new plugins
        const newPlugins = plugins.filter(plugin => 
            !Array.from(this.discoveredPlugins.keys()).includes(plugin.id)
        );

        if (newPlugins.length > 0) {
            this.logManager.logInfo(`Discovered ${newPlugins.length} new plugin instance(s)`);
            newPlugins.forEach(plugin => {
                this.logManager.logInfo(`  - ${plugin.instance_name || plugin.id} at ${plugin.ip}:${plugin.port}`);
            });
        }

        // Check for conflicts
        this.hasConflictingInstance();
    }

    /**
     * Trigger a discovery scan
     */
    async triggerDiscoveryScan(reason = "manual") {
        this.logManager.logInfo(`Triggering discovery scan (reason: ${reason})`);
        
        try {
            const timeout = reason === "startup" ? 
                (this.config.multi_instance.startup_scan_timeout || 5000) : 3000;
            
            const plugins = await this.discoverPlugins(timeout);
            this.handleDiscoveryResults(plugins);
            
            return plugins;
        } catch (error) {
            this.logManager.logError(`Discovery scan failed: ${error.message}`);
            throw error;
        }
    }

    /**
     * Get scanning statistics
     */
    getScanStats() {
        return {
            ...this.scanStats,
            consecutiveFailures: this.consecutiveFailures,
            lastScanTime: this.lastScanTime,
            timeSinceLastScan: this.lastScanTime ? Date.now() - this.lastScanTime : null,
            isScanning: this.scanInterval !== null,
            discoveredPluginsCount: this.discoveredPlugins.size
        };
    }

    /**
     * Cleanup resources
     */
    dispose() {
        this.stopAdvertising();
        this.stopPeriodicScanning();
        
        if (this.bonjour) {
            try {
                this.bonjour.destroy();
            } catch (error) {
                this.logManager.logError('Error destroying bonjour instance:', error);
            }
        }
        this.discoveredPlugins.clear();
    }
}