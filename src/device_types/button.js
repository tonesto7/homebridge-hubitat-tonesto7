// device_types/button.js

function getSupportedBtnValues(accessory, Characteristic) {
    let validValues = [];
    if (accessory && accessory.getCapabilities().length) {
        if (accessory.hasCapability("PushableButton")) {
            validValues.push(Characteristic.ProgrammableSwitchEvent.SINGLE_PRESS); // SINGLE_PRESS
        }
        if (accessory.hasCapability("DoubleTapableButton")) {
            validValues.push(Characteristic.ProgrammableSwitchEvent.DOUBLE_PRESS); // DOUBLE_PRESS
        }
        if (accessory.hasCapability("HoldableButton")) {
            validValues.push(Characteristic.ProgrammableSwitchEvent.LONG_PRESS); // LONG_PRESS
        }
        if (validValues.length < 1) {
            validValues.push(Characteristic.ProgrammableSwitchEvent.SINGLE_PRESS);
            validValues.push(Characteristic.ProgrammableSwitchEvent.LONG_PRESS);
        }
    } else {
        validValues.push(Characteristic.ProgrammableSwitchEvent.SINGLE_PRESS);
        validValues.push(Characteristic.ProgrammableSwitchEvent.LONG_PRESS);
    }
    return validValues;
}

function getButtonState(btnVal, accessory, Characteristic) {
    switch (btnVal) {
        case "pushed":
            accessory.log.debug(`${accessory.name} | Button State: pushed`);
            return Characteristic.ProgrammableSwitchEvent.SINGLE_PRESS;
        case "doubleTapped":
            accessory.log.debug(`${accessory.name} | Button State: doubleTapped`);
            return Characteristic.ProgrammableSwitchEvent.DOUBLE_PRESS;
        case "held":
            accessory.log.debug(`${accessory.name} | Button State: held`);
            return Characteristic.ProgrammableSwitchEvent.LONG_PRESS;
        default:
            accessory.log.warn(`${accessory.name} | Unknown button value: ${btnVal}`);
            return -1;
    }
}

module.exports = {
    isSupported: (accessory) => accessory.hasCapability("Button") || accessory.hasCapability("DoubleTapableButton") || accessory.hasCapability("HoldableButton") || accessory.hasCapability("PushableButton") || accessory.hasCapability("ReleasableButton"),

    relevantAttributes: ["button", "numberOfButtons"],

    initializeAccessory: (accessory, deviceClass) => {
        const { Service, Characteristic } = deviceClass.platform;
        const btnCnt = deviceClass.clamp(accessory.context.deviceData.attributes.numberOfButtons || 1, 1, 10);

        accessory.log.debug(`${accessory.name} | Initializing button accessory with ${btnCnt} buttons`);

        for (let btnNum = 1; btnNum <= btnCnt; btnNum++) {
            const serviceName = `${accessory.context.deviceData.deviceid} Button ${btnNum}`;
            accessory.log.debug(`${accessory.name} | Initializing button service: ${serviceName}`);

            const service = accessory.getButtonSvcByName(Service.StatelessProgrammableSwitch, serviceName, btnNum);
            const validValues = getSupportedBtnValues(accessory, Characteristic);
            accessory.log.debug(`${accessory.name} | Button ${btnNum} valid values: ${validValues.join(", ")}`);

            const char = service.getCharacteristic(Characteristic.ProgrammableSwitchEvent) || service.addCharacteristic(Characteristic.ProgrammableSwitchEvent);
            char.setProps({ validValues: validValues });
            char.eventOnlyCharacteristic = false;
            char.onGet(() => {
                return getButtonState(accessory.context.deviceData.attributes.button, accessory, Characteristic);
            });

            service.getCharacteristic(Characteristic.ServiceLabelIndex).setValue(btnNum);
            accessory.log.debug(`${accessory.name} | Button ${btnNum} service initialized`);

            accessory._buttonMap[serviceName] = service;

            accessory.serviceUUIDsToKeep.push(service.UUID);
        }

        accessory.context.deviceGroups.push("button");
        accessory.log.info(`${accessory.name} | Button accessory initialized with ${btnCnt} buttons`);
    },

    handleAttributeUpdate: (accessory, change, deviceClass) => {
        const { Characteristic, Service } = deviceClass.platform;
        if (change.attribute === "button") {
            const btnVal = change.value;
            const btnNum = change.data && change.data.buttonNumber ? change.data.buttonNumber : 1;
            const serviceName = `${accessory.context.deviceData.deviceid} Button ${btnNum}`;
            const service = accessory.getButtonSvcByName(Service.StatelessProgrammableSwitch, serviceName, btnNum);
            if (service) {
                const btnOut = getButtonState(btnVal, accessory, Characteristic);
                if (btnOut) {
                    accessory.log.info(`${accessory.name} | Updating Button ${btnNum} event to: ${btnOut}`);
                    service.getCharacteristic(Characteristic.ProgrammableSwitchEvent).updateValue(btnOut);
                }
            } else {
                accessory.log.warn(`${accessory.name} | No service found for button number: ${btnNum}`);
            }
        } else if (change.attribute === "numberOfButtons") {
            accessory.log.info(`${accessory.name} | Number of buttons changed to: ${change.value}`);
            initializeAccessory(accessory, deviceClass);
        }
    },
};
