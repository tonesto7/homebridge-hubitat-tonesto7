// device_types/energy_meter.js

module.exports = {
    isSupported: (accessory) => accessory.hasCapability("Energy Meter") && !accessory.hasCapability("Switch"),

    initializeAccessory: (accessory, deviceTypes) => {
        const { Service, CommunityTypes, Characteristic } = deviceTypes.mainPlatform;
        const serviceName = `${accessory.context.deviceData.deviceid}_EnergyMeter`;
        const existingService = accessory.getServiceByName(Service.Switch, serviceName);
        const service = existingService || accessory.addService(Service.Switch, serviceName, "Energy Meter");

        /**
         * Clamps a value between a minimum and maximum.
         * @param {number} value - The value to clamp.
         * @param {number} min - The minimum allowable value.
         * @param {number} max - The maximum allowable value.
         * @returns {number} - The clamped value.
         */
        function clamp(value, min, max) {
            return Math.max(min, Math.min(max, value));
        }

        // Kilowatt Hours Characteristic
        if (CommunityTypes.KilowattHours) {
            service.getCharacteristic(CommunityTypes.KilowattHours).onGet(() => {
                const energy = clamp(accessory.context.deviceData.attributes.energy, 0, 100000); // Assuming max 100,000 kWh
                accessory.log.debug(`${accessory.name} | Energy Consumption: ${energy} kWh`);
                return typeof energy === "number" ? Math.round(energy) : 0;
            });
        } else {
            accessory.log.warn(`${accessory.name} | CommunityTypes.KilowattHours not defined. Skipping KilowattHours characteristic.`);
        }

        // Optionally, add other energy-related characteristics here

        accessory.context.deviceGroups.push("energy_meter");
    },
};
