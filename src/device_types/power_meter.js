// device_types/power_meter.js

export function isSupported(accessory) {
    return accessory.hasCapability("Power Meter") && !accessory.hasCapability("Switch");
}

export const relevantAttributes = ["power"];

export function initializeAccessory(accessory, deviceClass) {
    const { Service, CommunityTypes, Characteristic } = deviceClass.platform;
    const serviceName = `${accessory.context.deviceData.deviceid}_PowerMeter`;
    const service = accessory.getServiceByName(Service.Switch, serviceName) || accessory.addService(Service.Switch, serviceName, "Power Meter");

    // Add the service to keep
    deviceClass.addServiceToKeep(accessory, service);

    // Watts Characteristic
    if (CommunityTypes && CommunityTypes.Watts) {
        deviceClass.getOrAddCharacteristic(accessory, service, CommunityTypes.Watts, {
            getHandler: function () {
                let power = parseFloat(accessory.context.deviceData.attributes.power);
                power = deviceClass.clamp(power, 0, 100000);
                accessory.log.debug(`${accessory.name} | Power Consumption Retrieved: ${power} Watts`);
                return typeof power === "number" ? Math.round(power) : 0;
            },
        });
    } else {
        accessory.log.warn(`${accessory.name} | CommunityTypes.Watts not defined. Skipping Watts characteristic.`);
    }

    accessory.context.deviceGroups.push("power_meter");
}

export function handleAttributeUpdate(accessory, change, deviceClass) {
    const { CommunityTypes, Service } = deviceClass.platform;
    const serviceName = `${accessory.context.deviceData.deviceid}_PowerMeter`;
    const service = accessory.getServiceByName(Service.Switch, serviceName);

    if (!service) {
        accessory.log.warn(`${accessory.name} | Power Meter service not found`);
        return;
    }

    if (change.attribute === "power" && CommunityTypes && CommunityTypes.Watts) {
        const power = deviceClass.clamp(parseFloat(change.value), 0, 100000);
        deviceClass.updateCharacteristicValue(accessory, service, CommunityTypes.Watts, Math.round(power));
        // accessory.log.debug(`${accessory.name} | Updated Power Consumption: ${power} Watts`);
    } else {
        accessory.log.debug(`${accessory.name} | Unhandled attribute update: ${change.attribute}`);
    }
}
