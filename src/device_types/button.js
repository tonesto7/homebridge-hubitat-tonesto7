// device_types/button.js

function getSupportedBtnValues(accessory) {
    const supportedValues = [];
    if (accessory.hasCapability("PushableButton")) {
        supportedValues.push("pushed");
    }
    if (accessory.hasCapability("DoubleTapableButton")) {
        supportedValues.push("doubleTapped");
    }
    if (accessory.hasCapability("HoldableButton")) {
        supportedValues.push("held");
    }
    return supportedValues && supportedValues.length ? supportedValues : [0, 2];
}

module.exports = {
    isSupported: (accessory) => accessory.hasCapability("Button") || accessory.hasCapability("DoubleTapableButton") || accessory.hasCapability("HoldableButton") || accessory.hasCapability("PushableButton") || accessory.hasCapability("ReleasableButton"),

    relevantAttributes: ["button", "numberOfButtons"],

    initializeAccessory: (accessory, deviceClass) => {
        const { Service, Characteristic } = deviceClass.platform;
        const btnCnt = deviceClass.clamp(accessory.context.deviceData.attributes.numberOfButtons || 1, 1, 10); // Assuming max 10 buttons

        accessory.log.debug(`${accessory.name} | Initializing button accessory with ${btnCnt} buttons`);

        for (let bNum = 1; bNum <= btnCnt; bNum++) {
            const serviceName = `${accessory.context.deviceData.deviceid} Button ${bNum}`;
            accessory.log.debug(`${accessory.name} | Initializing button service: ${serviceName}`);

            const service = accessory.getButtonSvcByName(Service.StatelessProgrammableSwitch, serviceName, bNum);

            if (!service) {
                accessory.log.error(`${accessory.name} | Failed to create or get service for button ${bNum}`);
                continue;
            }

            // Define valid switch events based on capabilities
            const validValues = getSupportedBtnValues(accessory);
            accessory.log.debug(`${accessory.name} | Button ${bNum} valid values: ${validValues.join(", ")}`);

            // Configure ProgrammableSwitchEvent characteristic
            const characteristic = service.getCharacteristic(Characteristic.ProgrammableSwitchEvent) || service.addCharacteristic(Characteristic.ProgrammableSwitchEvent);
            characteristic.eventOnlyCharacteristic = false;
            accessory._buttonMap[serviceName] = service;
            characteristic.setProps({ validValues: validValues }).onGet(() => {
                // this.value = -1;
                accessory.log.debug(`${accessory.name} | Get event for button ${bNum}`);
                return null; // Event-only characteristic
            });

            // Set Service Label Index for identification
            service.getCharacteristic(Characteristic.ServiceLabelIndex).setValue(bNum);

            // Map service for event handling

            accessory.log.debug(`${accessory.name} | Button ${bNum} service initialized`);
        }

        accessory.context.deviceGroups.push("button");
        accessory.log.info(`${accessory.name} | Button accessory initialized with ${btnCnt} buttons`);
    },

    handleAttributeUpdate: (accessory, change, deviceClass) => {
        const { Characteristic } = deviceClass.platform;

        if (change.attribute === "button") {
            const [btnNum, btnVal] = change.value.split(":");
            const service = deviceClass._buttonMap[`${accessory.context.deviceData.deviceid}_Button_${btnNum}`];

            if (service) {
                let btnOut;
                switch (btnVal) {
                    case "pushed":
                        btnOut = Characteristic.ProgrammableSwitchEvent.SINGLE_PRESS;
                        accessory.log.info(`${accessory.name} | Button Single Press ${btnNum} event: ${btnVal}`);
                        break;
                    case "doubleTapped":
                        btnOut = Characteristic.ProgrammableSwitchEvent.DOUBLE_PRESS;
                        accessory.log.info(`${accessory.name} | Button Double Press ${btnNum} event: ${btnVal}`);
                        break;
                    case "held":
                        btnOut = Characteristic.ProgrammableSwitchEvent.LONG_PRESS;
                        accessory.log.info(`${accessory.name} | Button Long Press ${btnNum} event: ${btnVal}`);
                        break;
                    default:
                        accessory.log.warn(`${accessory.name} | Unknown button value: ${btnVal}`);
                }

                if (btnOut !== undefined) {
                    accessory.log.info(`${accessory.name} | Updating Button ${btnNum} event to: ${btnOut}`);
                    service.getCharacteristic(Characteristic.ProgrammableSwitchEvent).updateValue(btnOut);
                }
            } else {
                accessory.log.warn(`${accessory.name} | No service found for button number: ${btnNum}`);
            }
        } else if (change.attribute === "numberOfButtons") {
            accessory.log.info(`${accessory.name} | Number of buttons changed to: ${change.value}`);
            // Re-initialize the accessory with the new number of buttons
            module.exports.initializeAccessory(accessory, deviceClass);
        } else {
            accessory.log.debug(`${accessory.name} | Unhandled attribute update: ${change.attribute}`);
        }
    },
};
