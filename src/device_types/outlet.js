// device_types/outlet.js

module.exports = {
    isSupported: (accessory) => accessory.hasCapability("Outlet") && accessory.hasCapability("Switch"),
    relevantAttributes: ["switch"],

    initializeAccessory: (accessory, deviceClass) => {
        const { Service, Characteristic } = deviceClass.platform;
        const service = accessory.getService(Service.Outlet) || accessory.addService(Service.Outlet);

        // On/Off Characteristic
        service
            .getCharacteristic(Characteristic.On)
            .onGet(() => {
                const isOn = accessory.context.deviceData.attributes.switch === "on";
                accessory.log.debug(`${accessory.name} | Outlet State Retrieved: ${isOn ? "ON" : "OFF"}`);
                return isOn;
            })
            .onSet((value) => {
                const command = value ? "on" : "off";
                accessory.log.info(`${accessory.name} | Setting outlet state to ${command}`);
                accessory.sendCommand(null, accessory, accessory.context.deviceData, command);
            });

        // Outlet In Use Characteristic
        service.getCharacteristic(Characteristic.OutletInUse).onGet(() => {
            const inUse = accessory.context.deviceData.attributes.switch === "on";
            accessory.log.debug(`${accessory.name} | Outlet In Use Retrieved: ${inUse}`);
            return inUse;
        });

        accessory.context.deviceGroups.push("outlet");
    },

    handleAttributeUpdate: (accessory, change, deviceClass) => {
        const { Characteristic, Service } = deviceClass.platform;
        const service = accessory.getService(Service.Outlet);

        if (!service) {
            accessory.log.warn(`${accessory.name} | Outlet service not found`);
            return;
        }

        if (change.attribute === "switch") {
            const isOn = change.value === "on";
            service.updateCharacteristic(Characteristic.On, isOn);
            service.updateCharacteristic(Characteristic.OutletInUse, isOn);
            accessory.log.debug(`${accessory.name} | Updated Outlet State: ${isOn ? "ON" : "OFF"}`);
            accessory.log.debug(`${accessory.name} | Updated Outlet In Use: ${isOn}`);
        } else {
            accessory.log.debug(`${accessory.name} | Unhandled attribute update: ${change.attribute}`);
        }
    },
};
