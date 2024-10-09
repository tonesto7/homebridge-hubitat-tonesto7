// device_types/virtual_piston.js

module.exports = {
    isSupported: (accessory) => accessory.hasCapability("Piston"),
    relevantAttributes: ["switch", "status"],

    initializeAccessory: (accessory, deviceClass) => {
        const { Service, Characteristic } = deviceClass.mainPlatform;
        const service = accessory.getService(Service.Switch) || accessory.addService(Service.Switch, "Virtual Piston", "VirtualPiston");

        /**
         * Triggers the piston action.
         */
        function triggerPiston() {
            accessory.log.info(`${accessory.name} | Activating Virtual Piston`);
            accessory.sendCommand(null, accessory, accessory.context.deviceData, "piston");
            setTimeout(() => {
                accessory.context.deviceData.attributes.switch = "off";
                service.updateCharacteristic(Characteristic.On, false);
                accessory.log.debug(`${accessory.name} | Virtual Piston deactivated after trigger`);
            }, 1000); // Adjust timeout as needed based on piston action duration
        }

        // On/Off Characteristic
        service
            .getCharacteristic(Characteristic.On)
            .onGet(() => {
                const isOn = accessory.context.deviceData.attributes.switch === "on";
                accessory.log.debug(`${accessory.name} | Virtual Piston State Retrieved: ${isOn ? "ON" : "OFF"}`);
                return isOn;
            })
            .onSet((value) => {
                if (value) {
                    triggerPiston();
                }
            });

        // Status Active Characteristic
        service
            .getCharacteristic(Characteristic.StatusActive)
            .onGet(() => {
                const isActive = accessory.context.deviceData.status === "online";
                accessory.log.debug(`${accessory.name} | Virtual Piston Status Active Retrieved: ${isActive}`);
                return isActive;
            })
            .onSet(() => {
                accessory.log.warn(`${accessory.name} | Attempted to set StatusActive characteristic, which is read-only.`);
            });

        accessory.context.deviceGroups.push("virtual_piston");
    },

    handleAttributeUpdate: (accessory, change, deviceClass) => {
        const { Characteristic, Service } = deviceClass.mainPlatform;
        const service = accessory.getService(Service.Switch);

        if (!service) {
            accessory.log.warn(`${accessory.name} | Virtual Piston service not found`);
            return;
        }

        switch (change.attribute) {
            case "switch":
                const isOn = change.value === "on";
                service.updateCharacteristic(Characteristic.On, isOn);
                accessory.log.debug(`${accessory.name} | Updated Virtual Piston State: ${isOn ? "ON" : "OFF"}`);
                break;
            case "status":
                const isActive = change.value === "online";
                service.updateCharacteristic(Characteristic.StatusActive, isActive);
                accessory.log.debug(`${accessory.name} | Updated Virtual Piston Status Active: ${isActive}`);
                break;
            default:
                accessory.log.debug(`${accessory.name} | Unhandled attribute update: ${change.attribute}`);
        }
    },
};
