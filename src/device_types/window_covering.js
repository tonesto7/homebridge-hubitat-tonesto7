// device_types/window_covering.js

let DeviceClass, Characteristic, Service, CommunityTypes;

export function init(_deviceClass, _Characteristic, _Service, _CommunityTypes) {
    DeviceClass = _deviceClass;
    Characteristic = _Characteristic;
    Service = _Service;
    CommunityTypes = _CommunityTypes;
}

export function isSupported(accessory) {
    return accessory.hasCapability("WindowShade") && !(accessory.hasCapability("Speaker") || accessory.hasCapability("Fan") || accessory.hasCapability("FanControl"));
}

export const relevantAttributes = ["position", "level", "windowShade"];

export function initializeAccessory(accessory) {
    const windowCoverSvc = DeviceClass.getOrAddService(accessory, Service.WindowCovering);

    // Determine position attribute
    const positionAttr = accessory.hasCommand("setPosition") ? "position" : accessory.hasAttribute("level") ? "level" : undefined;
    if (!positionAttr) {
        accessory.log.warn(`${accessory.name} | Window Shade does not have a valid position attribute or command.`);
        return;
    }

    DeviceClass.getOrAddCharacteristic(accessory, windowCoverSvc, Characteristic.CurrentPosition, {
        getHandler: function () {
            let position = parseInt(accessory.context.deviceData.attributes[positionAttr], 10);
            position = DeviceClass.clamp(position, 0, 100);
            accessory.log.debug(`${accessory.name} | Window Shade Current Position Retrieved: ${position}%`);
            return isNaN(position) ? 0 : position;
        },
    });

    DeviceClass.getOrAddCharacteristic(accessory, windowCoverSvc, Characteristic.TargetPosition, {
        getHandler: function () {
            let position = parseInt(accessory.context.deviceData.attributes[positionAttr], 10);
            position = DeviceClass.clamp(position, 0, 100);
            accessory.log.debug(`${accessory.name} | Window Shade Target Position Retrieved: ${position}%`);
            return isNaN(position) ? 0 : position;
        },
        setHandler: function (value) {
            let target = DeviceClass.clamp(value, 0, 100);
            const command = accessory.hasCommand("setPosition") ? "setPosition" : "setLevel";
            accessory.log.info(`${accessory.name} | Setting window shade target position to ${target}% via command: ${command}`);
            accessory.sendCommand(null, accessory, accessory.context.deviceData, command, { value1: target });
        },
    });

    DeviceClass.getOrAddCharacteristic(accessory, windowCoverSvc, Characteristic.PositionState, {
        getHandler: function () {
            const state = accessory.context.deviceData.attributes.windowShade;
            const positionState = convertPositionState(state, Characteristic);
            accessory.log.debug(`${accessory.name} | Window Shade Position State Retrieved: ${positionState}`);
            return positionState;
        },
    });

    DeviceClass.getOrAddCharacteristic(accessory, windowCoverSvc, Characteristic.ObstructionDetected, {
        getHandler: function () {
            // Assuming no obstruction detection implemented
            accessory.log.debug(`${accessory.name} | Window Shade Obstruction Detected Retrieved: false`);
            return false;
        },
    });

    DeviceClass.getOrAddCharacteristic(accessory, windowCoverSvc, Characteristic.HoldPosition, {
        setHandler: function (value) {
            if (value) {
                accessory.log.info(`${accessory.name} | Pausing window shade movement via command: pause`);
                accessory.sendCommand(null, accessory, accessory.context.deviceData, "pause");
            }
        },
        getHandler: function () {
            accessory.log.debug(`${accessory.name} | Window Shade HoldPosition Retrieved: 0`);
            return 0;
        },
    });

    accessory.context.deviceGroups.push("window_covering");
}

export function handleAttributeUpdate(accessory, change) {
    const windowCoverSvc = accessory.getService(Service.WindowCovering);
    if (!windowCoverSvc) {
        accessory.log.warn(`${accessory.name} | Window Covering service not found`);
        return;
    }

    const positionAttr = accessory.hasCommand("setPosition") ? "position" : accessory.hasAttribute("level") ? "level" : undefined;

    switch (change.attribute) {
        case "position":
        case "level":
            if (change.attribute === positionAttr) {
                let position = DeviceClass.clamp(parseInt(change.value, 10), 0, 100);
                DeviceClass.updateCharacteristicValue(accessory, windowCoverSvc, Characteristic.CurrentPosition, position);
                DeviceClass.updateCharacteristicValue(accessory, windowCoverSvc, Characteristic.TargetPosition, position);
                // accessory.log.debug(`${accessory.name} | Updated Window Shade Position: ${position}%`);
            }
            break;
        case "windowShade":
            const positionState = convertPositionState(change.value, Characteristic);
            DeviceClass.updateCharacteristicValue(accessory, windowCoverSvc, Characteristic.PositionState, positionState);
            // accessory.log.debug(`${accessory.name} | Updated Window Shade Position State: ${positionState}`);
            break;
        default:
            accessory.log.debug(`${accessory.name} | Unhandled attribute update: ${change.attribute}`);
    }
}

function convertPositionState(state) {
    switch (state) {
        case "opening":
            return Characteristic.PositionState.INCREASING;
        case "closing":
            return Characteristic.PositionState.DECREASING;
        default:
            return Characteristic.PositionState.STOPPED;
    }
}
