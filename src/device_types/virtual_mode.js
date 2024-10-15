// device_types/virtual_mode.js

let DeviceClass, Characteristic, Service, CommunityTypes;

export async function init(_deviceClass, _Characteristic, _Service, _CommunityTypes) {
    DeviceClass = _deviceClass;
    Characteristic = _Characteristic;
    Service = _Service;
    CommunityTypes = _CommunityTypes;
}

export function isSupported(accessory) {
    return accessory.hasCapability("Mode");
}

export const relevantAttributes = ["switch"];

export async function initializeService(accessory) {
    // const switchSvc = accessory.getService(Service.Switch) || accessory.addService(Service.Switch, "Virtual Mode", "VirtualMode");
    const switchSvc = DeviceClass.getOrAddService(accessory, Service.Switch);

    // Add the service to keep
    DeviceClass.addServiceToKeep(accessory, switchSvc);

    // On/Off Characteristic
    DeviceClass.getOrAddCharacteristic(accessory, switchSvc, Characteristic.On, {
        getHandler: function () {
            const isOn = accessory.context.deviceData.attributes.switch === "on";
            accessory.log.debug(`${accessory.name} | Virtual Mode State Retrieved: ${isOn ? "ON" : "OFF"}`);
            return isOn;
        },
        setHandler: function (value) {
            if (value && accessory.context.deviceData.attributes.switch === "off") {
                accessory.log.info(`${accessory.name} | Activating Virtual Mode`);
                accessory.sendCommand(null, accessory, accessory.context.deviceData, "mode");
            }
        },
    });

    accessory.context.deviceGroups.push("virtual_mode");
}

export async function handleAttributeUpdate(accessory, change) {
    const switchSvc = accessory.getService(Service.Switch);

    if (!switchSvc) {
        accessory.log.warn(`${accessory.name} | Virtual Mode service not found`);
        return;
    }

    if (change.attribute === "switch") {
        const isOn = change.value === "on";
        DeviceClass.updateCharacteristicValue(accessory, switchSvc, Characteristic.On, isOn);
        // accessory.log.debug(`${accessory.name} | Updated Virtual Mode State: ${isOn ? "ON" : "OFF"}`);
    } else {
        accessory.log.debug(`${accessory.name} | Unhandled attribute update: ${change.attribute}`);
    }
}
