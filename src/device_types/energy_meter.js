// device_types/energy_meter.js

module.exports = {
    isSupported: (accessory) => accessory.hasCapability("Energy Meter") && !accessory.hasCapability("Switch"),
    relevantAttributes: ["energy"],

    initializeAccessory: (accessory, deviceClass) => {
        const { Service, CommunityTypes, Characteristic } = deviceClass.platform;
        const serviceName = `${accessory.context.deviceData.deviceid}_EnergyMeter`;
        const existingService = accessory.getServiceByName(Service.Switch, serviceName);
        const service = existingService || accessory.addService(Service.Switch, serviceName, "Energy Meter");

        // Kilowatt Hours Characteristic
        if (CommunityTypes.KilowattHours) {
            service.getCharacteristic(CommunityTypes.KilowattHours).onGet(() => {
                const energy = deviceClass.clamp(accessory.context.deviceData.attributes.energy, 0, 100000); // Assuming max 100,000 kWh
                accessory.log.debug(`${accessory.name} | Energy Consumption: ${energy} kWh`);
                return typeof energy === "number" ? Math.round(energy) : 0;
            });
        } else {
            accessory.log.warn(`${accessory.name} | CommunityTypes.KilowattHours not defined. Skipping KilowattHours characteristic.`);
        }

        // Optionally, add other energy-related characteristics here

        accessory.context.deviceGroups.push("energy_meter");
    },

    handleAttributeUpdate: (accessory, change, deviceClass) => {
        const { CommunityTypes, Service } = deviceClass.platform;
        const service = accessory.getServiceByName(Service.Switch, `${accessory.context.deviceData.deviceid}_EnergyMeter`);

        if (!service) {
            accessory.log.warn(`${accessory.name} | Energy Meter service not found`);
            return;
        }

        if (change.attribute === "energy" && CommunityTypes && CommunityTypes.KilowattHours) {
            const energy = deviceClass.clamp(parseFloat(change.value), 0, 100000);
            service.updateCharacteristic(CommunityTypes.KilowattHours, Math.round(energy));
            accessory.log.debug(`${accessory.name} | Updated Energy Consumption: ${energy} kWh`);
        } else {
            accessory.log.debug(`${accessory.name} | Unhandled attribute update: ${change.attribute}`);
        }
    },
};
