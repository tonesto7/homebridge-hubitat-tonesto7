// platform/types.js

/**
 * @typedef {Object} AccessoryState
 * @property {boolean} initialized - Whether the accessory has been initialized
 * @property {number} lastInitialization - Timestamp of last initialization
 * @property {string[]} activeServices - Array of active service IDs
 * @property {Object.<string, string[]>} activeCharacteristics - Map of service IDs to characteristic UUIDs
 * @property {string[]} deviceTypes - Array of device type names
 * @property {Object} buttons - Button-specific state
 * @property {Object} light - Light-specific state
 */

/**
 * @typedef {Object} LogConfig
 * @property {boolean} debug - Enable debug logging
 * @property {boolean} info - Enable info logging
 * @property {boolean} warn - Enable warning logging
 * @property {boolean} notice - Enable notice logging
 * @property {boolean} error - Enable error logging
 */

/**
 * @typedef {Object} VersionCheckResult
 * @property {boolean} hasUpdate - Whether an update is available
 * @property {string|null} newVersion - The new version if available
 * @property {string|null} error - Error message if check failed
 */

/**
 * @typedef {Object} AdaptiveLightingState
 * @property {boolean} enabled - Whether adaptive lighting is enabled
 * @property {string|null} controllerId - ID of the controller
 * @property {number} offset - Temperature adjustment offset
 * @property {number|null} lastUpdate - Timestamp of last update
 */

/**
 * @typedef {Object} ButtonState
 * @property {Object.<string, string>} services - Map of button numbers to service IDs
 * @property {Object.<string, number>} states - Map of button numbers to button states
 */

/**
 * @typedef {Object} LightState
 * @property {string|null} lightService - ID of main light service
 * @property {string|null} televisionService - ID of television service for effects
 * @property {Object} effectsMap - Map of effect names to effect numbers
 * @property {AdaptiveLightingState} adaptiveLighting - Adaptive lighting state
 */

export const CONSTANTS = {
    DEFAULT_CACHE_DURATION: 15 * 60 * 1000, // 15 minutes
    DEFAULT_PORT: 40001,
    DEFAULT_POLLING_SECONDS: 300, // 5 minutes
    MAX_BUTTONS: 10,
    MIN_TEMPERATURE: 2000, // Kelvin
    MAX_TEMPERATURE: 7143, // Kelvin
};
