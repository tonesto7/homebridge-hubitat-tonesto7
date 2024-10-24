// device_types/Button.js

import HubitatAccessory from "../HubitatAccessory.js";

export default class Button extends HubitatAccessory {
    constructor(platform, accessory) {
        super(platform, accessory);
        this.deviceData = accessory.context.deviceData;
    }

    /**
     * @constant {string[]} relevantAttributes - An array of relevant attribute names for the Button device type.
     * @default ["button", "numberOfButtons"]
     */
    static relevantAttributes = ["button", "numberOfButtons"];

    /**
     * Initializes the button accessory service.
     *
     * This method sets up the button accessory with the appropriate number of buttons,
     * initializes each button service, and adds the necessary characteristics.
     *
     * @async
     * @function initializeService
     * @returns {Promise<void>} A promise that resolves when the initialization is complete.
     *
     * @example
     * await initializeService();
     *
     * @description
     * The method performs the following steps:
     * 1. Determines the number of buttons from the device data attributes, clamping the value between 1 and 10.
     * 2. Logs the initialization process.
     * 3. Iterates over the number of buttons, initializing each button service with the appropriate characteristics.
     * 4. Adds the button service to the accessory's button map.
     * 5. Adds the "button" group to the accessory's device groups.
     */
    async initializeService() {
        const btnCnt = this.clamp(this.deviceData.attributes.numberOfButtons || 1, 1, 10);

        this.log.debug(`${this.accessory.displayName} | Initializing button accessory with ${btnCnt} buttons`);

        for (let btnNum = 1; btnNum <= btnCnt; btnNum++) {
            const serviceName = `${this.deviceData.deviceid} Button ${btnNum}`;
            this.log.debug(`${this.accessory.displayName} | Initializing button service: ${serviceName}`);

            const buttonSvc = this.getButtonService(this.Service.StatelessProgrammableSwitch, serviceName, btnNum);
            const validValues = this.getSupportedBtnValues();

            this.getOrAddCharacteristic(buttonSvc, this.Characteristic.ProgrammableSwitchEvent, {
                props: { validValues: validValues },
                eventOnly: false,
                getHandler: () => this.getButtonState(this.deviceData.attributes.button),
            });

            this.getOrAddCharacteristic(buttonSvc, this.Characteristic.ServiceLabelIndex, {
                getHandler: () => btnNum,
            });

            this.log.debug(`${this.accessory.displayName} | Button ${btnNum} service initialized`);
            this.accessory._buttonMap[serviceName] = buttonSvc;
        }

        // this.log.info(`${this.accessory.displayName} | Button accessory initialized with ${btnCnt} buttons`);
        this.accessory.deviceGroups.push("button");
    }

    /**
     * Handles updates to device attributes and updates the corresponding button service.
     *
     * @param {Object} change - The change object containing attribute updates.
     * @param {string} change.attribute - The name of the attribute that has changed.
     * @param {string|number} change.value - The new value of the attribute.
     * @param {Object} [change.data] - Additional data related to the attribute change.
     * @param {number} [change.data.buttonNumber=1] - The button number associated with the change.
     */
    handleAttributeUpdate(change) {
        if (change.attribute === "button") {
            const btnVal = change.value;
            const btnNum = change.data && change.data.buttonNumber ? change.data.buttonNumber : 1;
            const serviceName = `${this.deviceData.deviceid} Button ${btnNum}`;
            const buttonSvc = this.getButtonService(this.Service.StatelessProgrammableSwitch, serviceName, btnNum);
            if (buttonSvc) {
                const btnOut = this.getButtonState(btnVal);
                if (btnOut >= 0) {
                    this.log.info(`${this.accessory.displayName} | Updating Button ${btnNum} event to: ${btnOut}`);
                    this.updateCharacteristicValue(buttonSvc, this.Characteristic.ProgrammableSwitchEvent, btnOut);
                }
            } else {
                this.log.warn(`${this.accessory.displayName} | No service found for button number: ${btnNum}`);
            }
        } else if (change.attribute === "numberOfButtons") {
            this.log.info(`${this.accessory.displayName} | Number of buttons changed to: ${change.value}`);
            this.initializeService();
        }
    }

    /**
     * Retrieves or adds a button service to the accessory.
     *
     * @param {Object} serviceType - The type of the service to be retrieved or added.
     * @param {string} displayName - The display name of the service.
     * @param {string} subType - The subtype of the service.
     * @returns {Object} The retrieved or newly added service.
     */
    getButtonService(serviceType, displayName, subType) {
        this.log.debug(`${this.accessory.displayName} | Getting or adding button service: ${displayName} (subType: ${subType})`);

        let svc = this.accessory.services.find((s) => s.UUID === serviceType.UUID && s.subtype === subType);

        if (!svc) {
            const oldServiceName = `${this.deviceData.deviceid}_${subType}`;
            svc = this.accessory.services.find((s) => s.displayName === oldServiceName);

            if (svc) {
                this.log.debug(`${this.accessory.displayName} | Found existing service with old naming scheme: ${oldServiceName}. Updating to new naming.`);
                svc.displayName = displayName;
                svc.subtype = subType;
            }
        }

        if (!svc) {
            this.log.debug(`${this.accessory.displayName} | Adding new service for: ${displayName} (subType: ${subType})`);
            svc = new serviceType(displayName, subType);
            this.accessory.addService(svc);
        } else {
            this.log.debug(`${this.accessory.displayName} | Reusing existing service for: ${displayName} (subType: ${subType})`);
        }

        this.addServiceToKeep(svc);

        return svc;
    }

    /**
     * Retrieves the supported button values based on the device's capabilities.
     *
     * This method checks for the following capabilities:
     * - PushableButton
     * - DoubleTapableButton
     * - HoldableButton
     *
     * Depending on the capabilities, it adds the corresponding programmable switch events to the list of valid values:
     * - SINGLE_PRESS for PushableButton
     * - DOUBLE_PRESS for DoubleTapableButton
     * - LONG_PRESS for HoldableButton
     *
     * If no capabilities are found, it defaults to adding SINGLE_PRESS and LONG_PRESS to the list.
     *
     * @returns {Array} An array of supported button values.
     */
    getSupportedBtnValues() {
        let validValues = [];
        if (this.hasCapability("PushableButton")) {
            validValues.push(this.Characteristic.ProgrammableSwitchEvent.SINGLE_PRESS);
        }
        if (this.hasCapability("DoubleTapableButton")) {
            validValues.push(this.Characteristic.ProgrammableSwitchEvent.DOUBLE_PRESS);
        }
        if (this.hasCapability("HoldableButton")) {
            validValues.push(this.Characteristic.ProgrammableSwitchEvent.LONG_PRESS);
        }
        if (validValues.length < 1) {
            validValues.push(this.Characteristic.ProgrammableSwitchEvent.SINGLE_PRESS);
            validValues.push(this.Characteristic.ProgrammableSwitchEvent.LONG_PRESS);
        }
        return validValues;
    }

    /**
     * Retrieves the button state based on the provided button value.
     *
     * @param {string} btnVal - The value representing the button state.
     *                          Expected values are "pushed", "doubleTapped", or "held".
     * @returns {number} - Returns a corresponding constant from `this.Characteristic.ProgrammableSwitchEvent`
     *                     for recognized button states, or -1 for unknown values.
     */
    getButtonState(btnVal) {
        switch (btnVal) {
            case "pushed":
                this.log.debug(`${this.accessory.displayName} | ButtonState: pushed`);
                return this.Characteristic.ProgrammableSwitchEvent.SINGLE_PRESS;
            case "doubleTapped":
                this.log.debug(`${this.accessory.displayName} | ButtonState: doubleTapped`);
                return this.Characteristic.ProgrammableSwitchEvent.DOUBLE_PRESS;
            case "held":
                this.log.debug(`${this.accessory.displayName} | ButtonState: held`);
                return this.Characteristic.ProgrammableSwitchEvent.LONG_PRESS;
            default:
                this.log.warn(`${this.accessory.displayName} | Unknown button value: ${btnVal}`);
                return -1;
        }
    }
}
