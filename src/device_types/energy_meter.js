// device_types/energy_meter.js

export function isSupported(accessory) {
    return accessory.hasCapability("Energy Meter") && !accessory.hasCapability("Switch");
}

export const relevantAttributes = ["energy"];

export function initializeAccessory(accessory, deviceClass) {
    const { Service, CommunityTypes, Characteristic } = deviceClass.platform;
    const serviceName = `${accessory.context.deviceData.deviceid}_EnergyMeter`;
    const service = accessory.getServiceByName(Service.Switch, serviceName) || accessory.addService(Service.Switch, serviceName, "Energy Meter");

    deviceClass.addServiceToKeep(accessory, service);

    // Kilowatt Hours Characteristic
    if (CommunityTypes.KilowattHours) {
        deviceClass.getOrAddCharacteristic(accessory, service, CommunityTypes.KilowattHours, {
            getHandler: function () {
                const energy = deviceClass.clamp(accessory.context.deviceData.attributes.energy, 0, 100000);
                accessory.log.debug(`${accessory.name} | Energy Consumption: ${energy} kWh`);
                return typeof energy === "number" ? Math.round(energy) : 0;
            },
        });
    } else {
        accessory.log.warn(`${accessory.name} | CommunityTypes.KilowattHours not defined. Skipping KilowattHours characteristic.`);
    }

    accessory.context.deviceGroups.push("energy_meter");
}

export function handleAttributeUpdate(accessory, change, deviceClass) {
    const { CommunityTypes, Service } = deviceClass.platform;
    const serviceName = `${accessory.context.deviceData.deviceid}_EnergyMeter`;
    const service = accessory.getServiceByName(Service.Switch, serviceName);

    if (!service) {
        accessory.log.warn(`${accessory.name} | Energy Meter service not found`);
        return;
    }

    if (change.attribute === "energy" && CommunityTypes && CommunityTypes.KilowattHours) {
        const energy = deviceClass.clamp(parseFloat(change.value), 0, 100000);
        deviceClass.updateCharacteristicValue(accessory, service, CommunityTypes.KilowattHours, Math.round(energy));
        // accessory.log.debug(`${accessory.name} | Updated Energy Consumption: ${energy} kWh`);
    } else {
        accessory.log.debug(`${accessory.name} | Unhandled attribute update: ${change.attribute}`);
    }
}
