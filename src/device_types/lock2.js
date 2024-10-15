// device_types/lock.js

let DeviceClass, Characteristic, Service, CommunityTypes;

// Initialize custom characteristics if already defined elsewhere
export function init(_deviceClass, _Characteristic, _Service, _CommunityTypes) {
    DeviceClass = _deviceClass;
    Characteristic = _Characteristic;
    Service = _Service;
    CommunityTypes = _CommunityTypes;

    // Assume that all necessary characteristics, including LockLastKnownAction,
    // are already defined and available in the Characteristic object.
}

export function isSupported(accessory) {
    return accessory.hasCapability("Lock");
}

export const relevantAttributes = ["lock", "adminOnlyAccess", "audioFeedback", "autoSecurityTimeout", "lastKnownAction", "logs", "motionDetected"];

export function initializeAccessory(accessory) {
    // Initialize Lock Management Service
    const lockMgmtSvc = DeviceClass.getOrAddService(accessory, Service.LockManagement);

    // Add LockControlPoint characteristic with a get handler
    DeviceClass.getOrAddCharacteristic(accessory, lockMgmtSvc, Characteristic.LockControlPoint, {
        getHandler: function () {
            const state = accessory.context.deviceData.attributes.lock;
            const convertedState = convertLockState(state);
            accessory.log.debug(`${accessory.name} | LockControlPoint Current State: ${state} => ${convertedState}`);
            return convertedState;
        },
    });

    // Add Version characteristic with an initial value
    DeviceClass.getOrAddCharacteristic(accessory, lockMgmtSvc, Characteristic.Version, {
        getHandler: function () {
            return "1.0"; // Modify if version is dynamic
        },
    });

    // Add CurrentDoorState characteristic with a get handler
    DeviceClass.getOrAddCharacteristic(accessory, lockMgmtSvc, Characteristic.CurrentDoorState, {
        getHandler: function () {
            const state = accessory.context.deviceData.attributes.lock;
            return convertDoorState(state);
        },
    });

    // **Integrate Existing Characteristics into LockManagement Service**

    // 1. Admin Only Access
    DeviceClass.getOrAddCharacteristic(accessory, lockMgmtSvc, Characteristic.AdminOnlyAccess, {
        getHandler: function () {
            return accessory.context.deviceData.attributes.adminOnlyAccess || false;
        },
        setHandler: function (value) {
            accessory.context.deviceData.attributes.adminOnlyAccess = value;
            accessory.log.info(`${accessory.name} | Admin Only Access set to: ${value}`);
            // Implement command to update the lock's admin access if needed
            accessory.sendCommand(null, accessory, accessory.context.deviceData, value ? "enableAdminAccess" : "disableAdminAccess");
        },
    });

    // 2. Audio Feedback
    DeviceClass.getOrAddCharacteristic(accessory, lockMgmtSvc, Characteristic.AudioFeedback, {
        getHandler: function () {
            return accessory.context.deviceData.attributes.audioFeedback || false;
        },
        setHandler: function (value) {
            accessory.context.deviceData.attributes.audioFeedback = value;
            accessory.log.info(`${accessory.name} | Audio Feedback set to: ${value}`);
            // Implement command to enable/disable audio feedback
            accessory.sendCommand(null, accessory, accessory.context.deviceData, value ? "enableAudioFeedback" : "disableAudioFeedback");
        },
    });

    // 3. Lock Management Auto Security Timeout
    DeviceClass.getOrAddCharacteristic(accessory, lockMgmtSvc, Characteristic.LockManagementAutoSecurityTimeout, {
        getHandler: function () {
            return accessory.context.deviceData.attributes.autoSecurityTimeout || 0;
        },
        setHandler: function (value) {
            accessory.context.deviceData.attributes.autoSecurityTimeout = value;
            accessory.log.info(`${accessory.name} | Auto Security Timeout set to: ${value} seconds`);
            // Implement command to set auto security timeout
            accessory.sendCommand(null, accessory, accessory.context.deviceData, `setAutoSecurityTimeout:${value}`);
        },
    });

    // 4. Lock Last Known Action
    DeviceClass.getOrAddCharacteristic(accessory, lockMgmtSvc, Characteristic.LockLastKnownAction, {
        getHandler: function () {
            const lastAction = accessory.context.deviceData.attributes.lastKnownAction || 0; // Default to 0 (SECURED_PHYSICALLY_INTERIOR)
            return convertLastKnownAction(lastAction);
        },
    });

    // 5. Logs
    DeviceClass.getOrAddCharacteristic(accessory, lockMgmtSvc, Characteristic.Logs, {
        getHandler: function () {
            return accessory.context.deviceData.attributes.logs || "No logs available.";
        },
        setHandler: function () {
            // Typically, logs are read-only. Implement log clearing if desired.
            accessory.log.warn(`${accessory.name} | Logs are read-only.`);
        },
    });

    // 6. Motion Detection
    DeviceClass.getOrAddCharacteristic(accessory, lockMgmtSvc, Characteristic.MotionDetected, {
        getHandler: function () {
            return accessory.context.deviceData.attributes.motionDetected || false;
        },
        setHandler: function (value) {
            accessory.context.deviceData.attributes.motionDetected = value;
            accessory.log.info(`${accessory.name} | Motion Detection set to: ${value}`);
            // Implement command to enable/disable motion detection
            accessory.sendCommand(null, accessory, accessory.context.deviceData, value ? "enableMotionDetection" : "disableMotionDetection");
        },
    });

    // Initialize Lock Mechanism Service
    const lockSvc = DeviceClass.getOrAddService(accessory, Service.LockMechanism, "LockMechanism");

    // Add LockCurrentState characteristic with a get handler
    DeviceClass.getOrAddCharacteristic(accessory, lockSvc, Characteristic.LockCurrentState, {
        getHandler: function () {
            const state = accessory.context.deviceData.attributes.lock;
            return convertLockState(state);
        },
    });

    // Add LockTargetState characteristic with get and set handlers
    DeviceClass.getOrAddCharacteristic(accessory, lockSvc, Characteristic.LockTargetState, {
        getHandler: function () {
            const state = accessory.context.deviceData.attributes.lock;
            return convertLockState(state);
        },
        setHandler: function (value) {
            const command = value === Characteristic.LockTargetState.SECURED ? "lock" : "unlock";
            accessory.log.info(`${accessory.name} | Setting lock state via command: ${command}`);
            accessory.sendCommand(null, accessory, accessory.context.deviceData, command);
        },
    });

    // **Set Initial Values for LockCurrentState and LockTargetState**
    const initialLockState = convertLockState(accessory.context.deviceData.attributes.lock);
    DeviceClass.updateCharacteristicValue(accessory, lockSvc, Characteristic.LockCurrentState, initialLockState);
    DeviceClass.updateCharacteristicValue(accessory, lockSvc, Characteristic.LockTargetState, initialLockState);

    // **Set Initial Values for LockManagement Characteristics**
    DeviceClass.updateCharacteristicValue(accessory, lockMgmtSvc, Characteristic.LockControlPoint, initialLockState);
    DeviceClass.updateCharacteristicValue(accessory, lockMgmtSvc, Characteristic.CurrentDoorState, convertDoorState(accessory.context.deviceData.attributes.lock));
    DeviceClass.updateCharacteristicValue(accessory, lockMgmtSvc, Characteristic.LockLastKnownAction, convertLastKnownAction(accessory.context.deviceData.attributes.lastKnownAction));
    DeviceClass.updateCharacteristicValue(accessory, lockMgmtSvc, Characteristic.MotionDetected, accessory.context.deviceData.attributes.motionDetected || false);

    // Add services to the accessory's device groups
    accessory.context.deviceGroups.push("lock");
    accessory.context.deviceGroups.push("lockManagement");
}

export function handleAttributeUpdate(accessory, change) {
    const lockSvc = accessory.getService(Service.LockMechanism);
    const lockMgmtSvc = accessory.getService(Service.LockManagement);

    if (!lockSvc) {
        accessory.log.warn(`${accessory.name} | Lock Mechanism service not found`);
        return;
    }

    if (!lockMgmtSvc) {
        accessory.log.warn(`${accessory.name} | Lock Management service not found`);
        return;
    }

    // **Handle Lock Attribute Updates**
    if (change.attribute === "lock") {
        const convertedLockState = convertLockState(change.value);
        const convertedDoorState = convertDoorState(change.value);
        const lastAction = change.value; // Assuming change.value indicates the last action

        // Update LockMechanism Characteristics
        DeviceClass.updateCharacteristicValue(accessory, lockSvc, Characteristic.LockCurrentState, convertedLockState);
        DeviceClass.updateCharacteristicValue(accessory, lockSvc, Characteristic.LockTargetState, convertedLockState);

        // Update LockManagement Characteristics
        DeviceClass.updateCharacteristicValue(accessory, lockMgmtSvc, Characteristic.LockControlPoint, convertedLockState);
        DeviceClass.updateCharacteristicValue(accessory, lockMgmtSvc, Characteristic.CurrentDoorState, convertedDoorState);
        DeviceClass.updateCharacteristicValue(accessory, lockMgmtSvc, Characteristic.LockLastKnownAction, convertLastKnownAction(lastAction));

        accessory.log.debug(`${accessory.name} | Updated Lock State: ${change.value} => ${convertedLockState}`);
    }

    // **Handle Additional Attributes**

    if (change.attribute === "adminOnlyAccess") {
        DeviceClass.updateCharacteristicValue(accessory, lockMgmtSvc, Characteristic.AdminOnlyAccess, change.value);
        accessory.log.debug(`${accessory.name} | Updated Admin Only Access: ${change.value}`);
    }

    if (change.attribute === "audioFeedback") {
        DeviceClass.updateCharacteristicValue(accessory, lockMgmtSvc, Characteristic.AudioFeedback, change.value);
        accessory.log.debug(`${accessory.name} | Updated Audio Feedback: ${change.value}`);
    }

    if (change.attribute === "autoSecurityTimeout") {
        DeviceClass.updateCharacteristicValue(accessory, lockMgmtSvc, Characteristic.LockManagementAutoSecurityTimeout, change.value);
        accessory.log.debug(`${accessory.name} | Updated Auto Security Timeout: ${change.value}`);
    }

    if (change.attribute === "logs") {
        DeviceClass.updateCharacteristicValue(accessory, lockMgmtSvc, Characteristic.Logs, change.value);
        accessory.log.debug(`${accessory.name} | Updated Logs.`);
    }

    if (change.attribute === "motionDetected") {
        DeviceClass.updateCharacteristicValue(accessory, lockMgmtSvc, Characteristic.MotionDetected, change.value);
        accessory.log.debug(`${accessory.name} | Updated Motion Detection: ${change.value}`);
    }

    // Handle other attributes if necessary
    else {
        accessory.log.debug(`${accessory.name} | Unhandled attribute update: ${change.attribute}`);
    }
}

// **Helper Functions**

function convertLockState(state) {
    switch (state) {
        case "locked":
            return Characteristic.LockCurrentState.SECURED;
        case "unlocked":
            return Characteristic.LockCurrentState.UNSECURED;
        default:
            return Characteristic.LockCurrentState.UNKNOWN;
    }
}

function convertDoorState(state) {
    switch (state) {
        case "locked":
            return Characteristic.CurrentDoorState.CLOSED;
        case "unlocked":
            return Characteristic.CurrentDoorState.OPEN;
        default:
            return Characteristic.CurrentDoorState.STOPPED;
    }
}

function convertLastKnownAction(action) {
    // Map the action string to the corresponding constant
    switch (action) {
        case "secured_physically_interior":
            return Characteristic.LockLastKnownAction.SECURED_PHYSICALLY_INTERIOR;
        case "unsecured_physically_interior":
            return Characteristic.LockLastKnownAction.UNSECURED_PHYSICALLY_INTERIOR;
        case "secured_physically_exterior":
            return Characteristic.LockLastKnownAction.SECURED_PHYSICALLY_EXTERIOR;
        case "unsecured_physically_exterior":
            return Characteristic.LockLastKnownAction.UNSECURED_PHYSICALLY_EXTERIOR;
        case "secured_by_keypad":
            return Characteristic.LockLastKnownAction.SECURED_BY_KEYPAD;
        case "unsecured_by_keypad":
            return Characteristic.LockLastKnownAction.UNSECURED_BY_KEYPAD;
        case "secured_remotely":
            return Characteristic.LockLastKnownAction.SECURED_REMOTELY;
        case "unsecured_remotely":
            return Characteristic.LockLastKnownAction.UNSECURED_REMOTELY;
        case "secured_by_auto_secure_timeout":
            return Characteristic.LockLastKnownAction.SECURED_BY_AUTO_SECURE_TIMEOUT;
        case "secured_physically":
            return Characteristic.LockLastKnownAction.SECURED_PHYSICALLY;
        case "unsecured_physically":
            return Characteristic.LockLastKnownAction.UNSECURED_PHYSICALLY;
        default:
            return Characteristic.LockLastKnownAction.SECURED_PHYSICALLY_INTERIOR; // Default value
    }
}
