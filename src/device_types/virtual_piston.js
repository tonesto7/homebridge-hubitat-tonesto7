// device_types/virtual_piston.js

export function isSupported(accessory) {
    return accessory.hasCapability("Piston");
}

export const relevantAttributes = ["switch"];

export function initializeAccessory(accessory, deviceClass) {
    const { Service, Characteristic } = deviceClass.platform;
    // const service = accessory.getService(Service.Switch) || accessory.addService(Service.Switch, "Virtual Piston", "VirtualPiston");
    const service = deviceClass.getOrAddService(accessory, Service.Switch);

    // Add the service to keep
    deviceClass.addServiceToKeep(accessory, service);

    function triggerPiston() {
        accessory.log.info(`${accessory.name} | Activating Virtual Piston`);
        accessory.sendCommand(null, accessory, accessory.context.deviceData, "piston");
        setTimeout(() => {
            accessory.context.deviceData.attributes.switch = "off";
            deviceClass.updateCharacteristicValue(accessory, service, Characteristic.On, false);
            accessory.log.debug(`${accessory.name} | Virtual Piston deactivated after trigger`);
        }, 1000); // Adjust timeout as needed based on piston action duration
    }

    deviceClass.getOrAddCharacteristic(accessory, service, Characteristic.On, {
        getHandler: function () {
            const isOn = accessory.context.deviceData.attributes.switch === "on";
            accessory.log.debug(`${accessory.name} | Virtual Piston State Retrieved: ${isOn ? "ON" : "OFF"}`);
            return isOn;
        },
        setHandler: function (value) {
            if (value) {
                triggerPiston();
            }
        },
    });

    accessory.context.deviceGroups.push("virtual_piston");
}

export function handleAttributeUpdate(accessory, change, deviceClass) {
    const { Characteristic, Service } = deviceClass.platform;
    const service = accessory.getService(Service.Switch);

    if (!service) {
        accessory.log.warn(`${accessory.name} | Virtual Piston service not found`);
        return;
    }

    switch (change.attribute) {
        case "switch":
            const isOn = change.value === "on";
            deviceClass.updateCharacteristicValue(accessory, service, Characteristic.On, isOn);
            // accessory.log.debug(`${accessory.name} | Updated Virtual Piston State: ${isOn ? "ON" : "OFF"}`);
            break;
        case "status":
            const isActive = change.value === "online";
            deviceClass.updateCharacteristicValue(accessory, service, Characteristic.StatusActive, isActive);
            // accessory.log.debug(`${accessory.name} | Updated Virtual Piston Status Active: ${isActive}`);
            break;
        default:
            accessory.log.debug(`${accessory.name} | Unhandled attribute update: ${change.attribute}`);
    }
}
