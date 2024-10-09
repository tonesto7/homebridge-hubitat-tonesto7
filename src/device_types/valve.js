// device_types/valve.js

function convertValveState(state, Characteristic) {
    return state === "open" ? Characteristic.Active.ACTIVE : Characteristic.Active.INACTIVE;
}

function convertInUseState(state, Characteristic) {
    return state === "open" ? Characteristic.InUse.IN_USE : Characteristic.InUse.NOT_IN_USE;
}

module.exports = {
    isSupported: (accessory) => accessory.hasCapability("Valve"),
    relevantAttributes: ["valve"],

    initializeAccessory: (accessory, deviceClass) => {
        const { Service, Characteristic } = deviceClass.mainPlatform;
        const service = accessory.getService(Service.Valve) || accessory.addService(Service.Valve);

        // Active Characteristic
        service
            .getCharacteristic(Characteristic.Active)
            .onGet(() => {
                const isActive = convertValveState(accessory.context.deviceData.attributes.valve, Characteristic);
                accessory.log.debug(`${accessory.name} | Valve Active State Retrieved: ${isActive}`);
                return isActive;
            })
            .onSet((value) => {
                const command = value === Characteristic.Active.ACTIVE ? "open" : "close";
                accessory.log.info(`${accessory.name} | Setting valve state via command: ${command}`);
                accessory.sendCommand(null, accessory, accessory.context.deviceData, command);
            });

        // InUse Characteristic
        service
            .getCharacteristic(Characteristic.InUse)
            .onGet(() => {
                const inUse = convertInUseState(accessory.context.deviceData.attributes.valve, Characteristic);
                accessory.log.debug(`${accessory.name} | Valve InUse State Retrieved: ${inUse}`);
                return inUse;
            })
            .onSet(() => {
                accessory.log.warn(`${accessory.name} | Attempted to set InUse characteristic, which is read-only.`);
            });

        // Valve Type Characteristic
        if (!service.testCharacteristic(Characteristic.ValveType)) {
            service.addCharacteristic(Characteristic.ValveType);
        }
        service.updateCharacteristic(Characteristic.ValveType, Characteristic.ValveType.GENERIC_VALVE);

        accessory.context.deviceGroups.push("valve");
    },

    handleAttributeUpdate: (accessory, change, deviceClass) => {
        const { Characteristic, Service } = deviceClass.mainPlatform;
        const service = accessory.getService(Service.Valve);

        if (!service) {
            accessory.log.warn(`${accessory.name} | Valve service not found`);
            return;
        }

        if (change.attribute === "valve") {
            const isActive = convertValveState(change.value, Characteristic);
            const inUse = convertInUseState(change.value, Characteristic);

            service.updateCharacteristic(Characteristic.Active, isActive);
            service.updateCharacteristic(Characteristic.InUse, inUse);

            accessory.log.debug(`${accessory.name} | Updated Valve: Active: ${isActive}, InUse: ${inUse}`);
        } else {
            accessory.log.debug(`${accessory.name} | Unhandled attribute update: ${change.attribute}`);
        }
    },
};
