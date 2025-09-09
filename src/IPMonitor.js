/**
 * @file IPMonitor.js
 * @description Simple IP address monitoring to keep Hubitat app in sync when IP changes
 */

import os from "os";

export class IPMonitor {
    constructor(platform, hubitatClient) {
        this.logManager = platform.logManager;
        this.configManager = platform.configManager;
        this.config = platform.config;
        this.hubitatClient = hubitatClient;

        // Current state
        this.currentIP = null;
        this.lastCheckTime = 0;
        this.checkInterval = null;

        // Configuration
        this.monitorConfig = {
            checkInterval: 60000, // Check every minute
            debounceTime: 5000, // Wait 5 seconds to confirm change
            maxRetries: 3, // Retry registration 3 times
        };

        // Initialize current IP
        this.currentIP = this.getCurrentIP();
        this.logManager.logInfo(`IP Monitor initialized with IP: ${this.currentIP}`);
    }

    /**
     * Get current IP address (same logic as ConfigManager)
     */
    getCurrentIP() {
        // Use static IP if configured
        if (this.config.client.static_ip) {
            return this.config.client.static_ip;
        }

        // Auto-detect IP address
        const networkInterfaces = os.networkInterfaces();

        for (const [_, interfaces] of Object.entries(networkInterfaces)) {
            for (const iface of interfaces || []) {
                // Skip internal interfaces, IPv6, and interfaces without IP
                if (!iface.internal && iface.family === "IPv4" && iface.address) {
                    return iface.address;
                }
            }
        }

        return "127.0.0.1"; // Fallback
    }

    /**
     * Start monitoring for IP changes
     */
    startMonitoring() {
        this.logManager.logInfo(`Starting IP monitoring (checking every ${this.monitorConfig.checkInterval / 1000} seconds)`);

        this.checkInterval = setInterval(() => {
            this.checkForIPChange();
        }, this.monitorConfig.checkInterval);
    }

    /**
     * Stop IP monitoring
     */
    stopMonitoring() {
        if (this.checkInterval) {
            clearInterval(this.checkInterval);
            this.checkInterval = null;
            this.logManager.logInfo("Stopped IP monitoring");
        }
    }

    /**
     * Check if IP address has changed
     */
    async checkForIPChange() {
        try {
            const newIP = this.getCurrentIP();

            if (newIP !== this.currentIP) {
                this.logManager.logWarn(`IP address changed from ${this.currentIP} to ${newIP}`);

                // Debounce - wait a bit and check again to confirm it's stable
                await new Promise((resolve) => setTimeout(resolve, this.monitorConfig.debounceTime));

                const confirmedIP = this.getCurrentIP();
                if (confirmedIP === newIP) {
                    await this.handleIPChange(this.currentIP, newIP);
                    this.currentIP = newIP;
                } else {
                    this.logManager.logWarn(`IP change unstable (${newIP} -> ${confirmedIP}), ignoring`);
                }
            }

            this.lastCheckTime = Date.now();
        } catch (error) {
            this.logManager.logError(`IP change check failed: ${error.message}`);
        }
    }

    /**
     * Handle IP address change
     */
    async handleIPChange(oldIP, newIP) {
        this.logManager.logSuccess(`IP address confirmed changed: ${oldIP} -> ${newIP}`);

        try {
            // Update ConfigManager's cached IP
            this.configManager.activeIP = newIP;

            // Re-register with Hubitat app using existing method
            const result = await this.hubitatClient.registerForDirectUpdates();

            if (result && result.status !== "error") {
                this.logManager.logSuccess(`Successfully re-registered with new IP: ${newIP}`);
            } else {
                throw new Error("Registration returned error status");
            }
        } catch (error) {
            this.logManager.logError(`Failed to re-register with new IP: ${error.message}`);

            // Retry registration with exponential backoff
            this.retryRegistration(newIP, 1);
        }
    }

    /**
     * Retry registration with exponential backoff
     */
    async retryRegistration(ip, attempt) {
        if (attempt > this.monitorConfig.maxRetries) {
            this.logManager.logError(`Failed to re-register after ${this.monitorConfig.maxRetries} attempts`);
            return;
        }

        const delay = 2000 * Math.pow(2, attempt - 1); // 2s, 4s, 8s
        this.logManager.logInfo(`Retrying registration in ${delay}ms (attempt ${attempt})`);

        setTimeout(async () => {
            try {
                const result = await this.hubitatClient.registerForDirectUpdates();

                if (result && result.status !== "error") {
                    this.logManager.logSuccess(`Successfully re-registered on attempt ${attempt}`);
                } else {
                    this.retryRegistration(ip, attempt + 1);
                }
            } catch (error) {
                this.logManager.logError(`Registration attempt ${attempt} failed: ${error.message}`);
                this.retryRegistration(ip, attempt + 1);
            }
        }, delay);
    }

    /**
     * Force IP check and re-registration
     */
    async forceIPCheck() {
        this.logManager.logInfo("Forcing IP check and re-registration");
        await this.checkForIPChange();
    }

    /**
     * Get monitoring status
     */
    getStatus() {
        return {
            currentIP: this.currentIP,
            isMonitoring: this.checkInterval !== null,
            lastCheckTime: this.lastCheckTime,
            timeSinceLastCheck: this.lastCheckTime ? Date.now() - this.lastCheckTime : null,
            checkInterval: this.monitorConfig.checkInterval,
        };
    }

    /**
     * Cleanup resources
     */
    dispose() {
        this.stopMonitoring();
        this.logManager.logDebug("IP Monitor disposed");
    }
}
