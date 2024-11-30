// devices/Button.js
export class Button {
    constructor(platform) {
        this.logManager = platform.logManager;
        this.Service = platform.Service;
        this.Characteristic = platform.Characteristic;
    }

    configure(accessory) {
        this.logManager.logDebug(`Configuring Button for ${accessory.displayName}`);
        const _service = this.Service.StatelessProgrammableSwitch;
        const buttonCount = Math.min(Math.max(accessory.context.deviceData.attributes.numberOfButtons || 1, 1), 10);
        const validValues = this._getSupportedButtonValues(accessory);

        for (let btnNum = 1; btnNum <= buttonCount; btnNum++) {
            const btnService = this._configureButtonService(accessory, _service, btnNum);
            this._configureButtonCharacteristics(btnService, validValues);
        }

        accessory.context.deviceGroups.push("button");
        return accessory;
    }

    _configureButtonService(accessory, _service, btnNum) {
        const oldServiceName = `${accessory.context.deviceData.deviceid}_${btnNum}`;
        const newServiceName = `${accessory.context.deviceData.deviceid} Button ${btnNum}`;

        let btnService = accessory.services.find((s) => s.UUID === _service.UUID && (s.displayName === oldServiceName || s.subtype === btnNum.toString()));

        if (btnService && btnService.displayName === oldServiceName) {
            const nameChar = btnService.getCharacteristic(this.Characteristic.Name);
            if (nameChar) {
                nameChar.updateValue(newServiceName);
            }
        }

        if (!btnService) {
            btnService = accessory.getOrAddService(_service, newServiceName, btnNum.toString());
        }

        return btnService;
    }

    _configureButtonCharacteristics(btnService, validValues) {
        let c = btnService.getCharacteristic(this.Characteristic.ProgrammableSwitchEvent);
        c.setProps({ validValues });
        c.eventOnlyCharacteristic = true;

        if (!c._events.get) {
            c.on("get", (callback) => callback(null, null));
        }

        btnService.getCharacteristic(this.Characteristic.ServiceLabelIndex).updateValue(btnNum);
    }

    _getSupportedButtonValues(accessory) {
        const values = [];
        if (accessory.hasCapability("PushableButton")) {
            values.push(this.Characteristic.ProgrammableSwitchEvent.SINGLE_PRESS);
        }
        if (accessory.hasCapability("DoubleTapableButton")) {
            values.push(this.Characteristic.ProgrammableSwitchEvent.DOUBLE_PRESS);
        }
        if (accessory.hasCapability("HoldableButton")) {
            values.push(this.Characteristic.ProgrammableSwitchEvent.LONG_PRESS);
        }
        return values;
    }

    handleButtonEvent(btnNum, btnVal, devId, btnMap) {
        let bSvc = btnMap[`${devId}_${btnNum}`];
        if (bSvc) {
            let btnOut;
            switch (btnVal) {
                case "pushed":
                    btnOut = this.Characteristic.ProgrammableSwitchEvent.SINGLE_PRESS;
                    break;
                case "held":
                    btnOut = this.Characteristic.ProgrammableSwitchEvent.LONG_PRESS;
                    break;
                case "doubleTapped":
                    btnOut = this.Characteristic.ProgrammableSwitchEvent.DOUBLE_PRESS;
                    break;
            }
            bSvc.getCharacteristic(this.Characteristic.ProgrammableSwitchEvent).setValue(btnOut);
        }
    }
}
