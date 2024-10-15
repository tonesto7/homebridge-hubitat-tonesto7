// device_types/virtual_piston.js

let DeviceClass, Characteristic, Service, CommunityTypes;

export function init(_deviceClass, _Characteristic, _Service, _CommunityTypes) {
    DeviceClass = _deviceClass;
    Characteristic = _Characteristic;
    Service = _Service;
    CommunityTypes = _CommunityTypes;
}

export function isSupported(accessory) {
    return accessory.hasCapability("Piston");
}

export const relevantAttributes = ["switch"];

export function initializeAccessory(accessory) {
    // const switchSvc = accessory.getService(Service.Switch) || accessory.addService(Service.Switch, "Virtual Piston", "VirtualPiston");
    const switchSvc = DeviceClass.getOrAddService(accessory, Service.Switch);

    // Add the service to keep
    DeviceClass.addServiceToKeep(accessory, switchSvc);

    DeviceClass.getOrAddCharacteristic(accessory, switchSvc, Characteristic.On, {
        getHandler: function () {
            const isOn = accessory.context.deviceData.attributes.switch === "on";
            accessory.log.debug(`${accessory.name} | Virtual Piston State Retrieved: ${isOn ? "ON" : "OFF"}`);
            return isOn;
        },
        setHandler: function (value) {
            if (value) {
                accessory.log.info(`${accessory.name} | Activating Virtual Piston`);
                accessory.sendCommand(null, accessory, accessory.context.deviceData, "piston");
                setTimeout(() => {
                    accessory.context.deviceData.attributes.switch = "off";
                    DeviceClass.updateCharacteristicValue(accessory, switchSvc, Characteristic.On, false);
                    accessory.log.debug(`${accessory.name} | Virtual Piston deactivated after trigger`);
                }, 1000); // Adjust timeout as needed based on piston action duration
            }
        },
    });

    accessory.context.deviceGroups.push("virtual_piston");
}

export function handleAttributeUpdate(accessory, change) {
    const switchSvc = accessory.getService(Service.Switch);

    if (!switchSvc) {
        accessory.log.warn(`${accessory.name} | Virtual Piston service not found`);
        return;
    }

    switch (change.attribute) {
        case "switch":
            const isOn = change.value === "on";
            DeviceClass.updateCharacteristicValue(accessory, switchSvc, Characteristic.On, isOn);
            // accessory.log.debug(`${accessory.name} | Updated Virtual Piston State: ${isOn ? "ON" : "OFF"}`);
            break;
        case "status":
            const isActive = change.value === "online";
            DeviceClass.updateCharacteristicValue(accessory, switchSvc, Characteristic.StatusActive, isActive);
            // accessory.log.debug(`${accessory.name} | Updated Virtual Piston Status Active: ${isActive}`);
            break;
        default:
            accessory.log.debug(`${accessory.name} | Unhandled attribute update: ${change.attribute}`);
    }
}
