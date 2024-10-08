// device_types/outlet.js

module.exports = {
    isSupported: (accessory) => accessory.hasCapability("Outlet") && accessory.hasCapability("Switch"),

    initializeAccessory: (accessory, deviceTypes) => {
        const { Service, Characteristic } = deviceTypes.mainPlatform;
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
};
