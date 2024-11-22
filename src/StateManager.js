// platform/StateManager.js

export class StateManager {
    constructor(platform) {
        this.platform = platform;
        this.logManager = platform.logManager;
        this._initializing = true;
        this.platformName = platform.platformName;
    }

    /**
     * Initialize state for all accessories
     * @param {Array} accessories - Array of platform accessories
     */
    async initializeAccessoryStates(accessories) {
        try {
            for (const accessory of accessories) {
                this.initializeAccessoryContext(accessory);
            }
            this._initializing = false;
        } catch (error) {
            this.logManager.logError("Error initializing accessory states:", error);
            throw error;
        }
    }

    /**
     * Initialize or reset an accessory's context structure
     * @param {PlatformAccessory} accessory - The accessory to initialize
     */
    initializeAccessoryContext(accessory) {
        const defaultState = {
            initialized: false,
            lastInitialization: null,
            activeServices: [],
            activeCharacteristics: {},
            deviceTypes: [],
            buttons: {
                services: {},
                states: {},
            },
            light: {
                lightService: null,
                televisionService: null,
                effectsMap: {},
                adaptiveLighting: {
                    enabled: false,
                    controllerId: null,
                    offset: 0,
                    lastUpdate: null,
                },
            },
        };

        // Recursively ensure all properties exist with correct types
        const ensureProperties = (target, source) => {
            for (const [key, value] of Object.entries(source)) {
                if (!(key in target) || typeof target[key] !== typeof value) {
                    target[key] = Array.isArray(value) ? [] : typeof value === "object" ? {} : value;
                }
                if (value && typeof value === "object" && !Array.isArray(value)) {
                    ensureProperties(target[key], value);
                }
            }
        };
        // Create initial state if it doesn't exist
        // Create initial state if it doesn't exist
        if (!accessory.context.state) {
            accessory.context.state = defaultState;
        } else {
            // Preserve existing activeServices and activeCharacteristics
            const existingServices = accessory.context.state.activeServices || [];
            const existingCharacteristics = accessory.context.state.activeCharacteristics || {};

            // Ensure all properties exist with correct types
            ensureProperties(accessory.context.state, defaultState);

            // Restore preserved data
            accessory.context.state.activeServices = existingServices;
            accessory.context.state.activeCharacteristics = existingCharacteristics;
        }
        // Set initialization flags
        accessory.context.state.initialized = true;
        accessory.context.state.lastInitialization = Date.now();
    }

    /**
     * Update the last refresh timestamp for accessories
     * @param {Array} accessories - Array of platform accessories
     */
    async updateLastRefresh(accessories) {
        const timestamp = Date.now();
        for (const accessory of accessories) {
            this.updateAccessoryState(accessory, {
                lastRefresh: timestamp,
            });
        }
    }

    /**
     * Handle platform shutdown for all accessories
     * @param {Array} accessories - Array of platform accessories
     */
    async handleShutdown(accessories) {
        for (const accessory of accessories) {
            this.updateAccessoryState(accessory, {
                initialized: false,
                lastShutdown: Date.now(),
            });
        }
    }

    /**
     * Get the current state of an accessory
     * @param {PlatformAccessory} accessory - The accessory to get state for
     * @returns {Object} The accessory's state
     */
    getAccessoryState(accessory) {
        return accessory.context.state || {};
    }

    /**
     * Update an accessory's state
     * @param {PlatformAccessory} accessory - The accessory to update
     * @param {Object} updates - State updates to apply
     */
    updateAccessoryState(accessory, updates) {
        if (!accessory.context.state) {
            this.initializeAccessoryContext(accessory);
        }
        Object.assign(accessory.context.state, updates);
    }

    /**
     * Track a service in the accessory's context
     * @param {PlatformAccessory} accessory - The accessory owning the service
     * @param {Service} service - The service to track
     */
    trackService(accessory, service) {
        const serviceId = this.getServiceId(service);
        if (!accessory.context.state.activeServices.includes(serviceId)) {
            accessory.context.state.activeServices.push(serviceId);
        }

        if (!accessory.context.state.activeCharacteristics[serviceId]) {
            accessory.context.state.activeCharacteristics[serviceId] = [];
        }
    }

    /**
     * Track a characteristic in the accessory's context
     * @param {PlatformAccessory} accessory - The accessory owning the characteristic
     * @param {Service} service - The service owning the characteristic
     * @param {Characteristic} characteristic - The characteristic to track
     */
    trackCharacteristic(accessory, service, characteristic) {
        const serviceId = this.getServiceId(service);
        if (!accessory.context.state.activeCharacteristics[serviceId]) {
            accessory.context.state.activeCharacteristics[serviceId] = [];
        }

        const charId = characteristic.UUID;
        if (!accessory.context.state.activeCharacteristics[serviceId].includes(charId)) {
            accessory.context.state.activeCharacteristics[serviceId].push(charId);
        }
    }

    /**
     * Get a unique identifier for a service
     * @param {Service} service - The service to identify
     * @returns {string} Unique service identifier
     */
    getServiceId(service) {
        return service.subtype ? `${service.UUID} ${service.subtype}` : service.UUID;
    }

    /**
     * Check if the platform is in initialization state
     * @returns {boolean} True if platform is initializing
     */
    isInitializing() {
        return this._initializing;
    }

    /**
     * Sanitize a device name
     * @param {string} name - The name to sanitize
     * @returns {string} Sanitized name
     */
    sanitizeName(name) {
        if (!name) return "Unnamed Device";

        let sanitized = name
            .replace(/[^a-zA-Z0-9 ']/g, "")
            .trim()
            .replace(/^[^a-zA-Z0-9]+/, "")
            .replace(/[^a-zA-Z0-9]+$/, "")
            .replace(/\s{2,}/g, " ");

        sanitized = sanitized.length === 0 ? "Unnamed Device" : sanitized;

        if (name !== sanitized) {
            this.logManager.logWarn(`Sanitized Name: "${name}" => "${sanitized}"`);
        }

        return sanitized;
    }

    /**
     * Convert a string to title case
     * @param {string} str - The string to convert
     * @returns {string} Title case string
     */
    toTitleCase(str) {
        return str.replace(/\w\S*/g, (txt) => txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase());
    }

    /**
     * Clean up state for an accessory
     * @param {PlatformAccessory} accessory - The accessory to clean up
     */
    cleanupAccessoryState(accessory) {
        if (!accessory.context.state) {
            accessory.context.state = {};
        }

        // Reset the initialized flag and update last shutdown time
        accessory.context.state.initialized = false;
        accessory.context.state.lastShutdown = Date.now();

        // Clear active services and characteristics
        delete accessory.context.state.activeServices;
        delete accessory.context.state.activeCharacteristics;
    }

    /**
     * Get active services for an accessory
     * @param {PlatformAccessory} accessory - The accessory to get services for
     * @returns {Array} Array of active service IDs
     */
    getActiveServices(accessory) {
        return accessory.context.state?.activeServices || [];
    }

    /**
     * Get active characteristics for a service
     * @param {PlatformAccessory} accessory - The accessory to get characteristics for
     * @param {string} serviceId - The service ID to get characteristics for
     * @returns {Array} Array of active characteristic UUIDs
     */
    getActiveCharacteristics(accessory, serviceId) {
        return accessory.context.state?.activeCharacteristics[serviceId] || [];
    }
}
