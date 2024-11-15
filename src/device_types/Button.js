// device_types/Button.js

import HubitatPlatformAccessory from "../HubitatPlatformAccessory.js";

export default class Button extends HubitatPlatformAccessory {
    constructor(platform, accessory) {
        super(platform, accessory);
        this.buttonServices = new Map(); // Track button services by number
    }

    static relevantAttributes = ["button", "numberOfButtons"];

    async configureServices() {
        try {
            // Get number of buttons, clamp between 1 and 10
            const buttonCount = Math.min(Math.max(this.deviceData.attributes.numberOfButtons || 1, 1), 10);

            this.logDebug(`${this.deviceData.name} | Initializing button accessory with ${buttonCount} buttons`);

            // Configure each button
            for (let buttonNumber = 1; buttonNumber <= buttonCount; buttonNumber++) {
                await this.configureButton(buttonNumber);
            }

            return true;
        } catch (error) {
            this.logError(`Button | ${this.deviceData.name} | Error configuring services:`, error);
            throw error;
        }
    }

    async configureButton(buttonNumber) {
        // Use consistent service naming scheme
        const serviceName = `${this.deviceData.deviceid} Button ${buttonNumber}`;
        this.logDebug(`${this.deviceData.name} | Initializing button service: ${serviceName}`);

        // Try to find existing service first
        let buttonService = this.accessory.services.find((service) => service.UUID === this.Service.StatelessProgrammableSwitch.UUID && service.subtype === buttonNumber.toString());

        // If no existing service, create new one
        if (!buttonService) {
            buttonService = this.getOrAddService(this.Service.StatelessProgrammableSwitch, serviceName, buttonNumber.toString());
        }

        // Store for tracking
        this.buttonServices.set(buttonNumber, buttonService);

        // Configure characteristics
        const validValues = this.getSupportedButtonValues();

        // Programmable Switch Event characteristic
        this.getOrAddCharacteristic(buttonService, this.Characteristic.ProgrammableSwitchEvent, {
            props: { validValues: validValues },
            eventOnly: true,
            getHandler: () => this.getButtonState(),
        });

        // Service Label Index characteristic
        this.getOrAddCharacteristic(buttonService, this.Characteristic.ServiceLabelIndex, {
            getHandler: () => buttonNumber,
        });

        this.logDebug(`Button | ${this.deviceData.name} | Button ${buttonNumber} service initialized`);
    }

    getSupportedButtonValues() {
        const values = new Set();
        const ProgrammableSwitchEvent = this.Characteristic.ProgrammableSwitchEvent;

        if (this.hasCapability("PushableButton")) {
            values.add(ProgrammableSwitchEvent.SINGLE_PRESS);
        }
        if (this.hasCapability("DoubleTapableButton")) {
            values.add(ProgrammableSwitchEvent.DOUBLE_PRESS);
        }
        if (this.hasCapability("HoldableButton")) {
            values.add(ProgrammableSwitchEvent.LONG_PRESS);
        }

        // Default if no specific capabilities
        if (values.size === 0) {
            values.add(ProgrammableSwitchEvent.SINGLE_PRESS);
            values.add(ProgrammableSwitchEvent.LONG_PRESS);
        }

        return Array.from(values);
    }

    async handleAttributeUpdate(change) {
        const { attribute, value, data } = change;

        switch (attribute) {
            case "button":
                const buttonNumber = data.buttonNumber || 1;
                const service = this.buttonServices.get(buttonNumber);
                if (!service) {
                    this.logWarn(`No service found for button ${buttonNumber}`);
                    return;
                }

                const eventValue = this.transformButtonValue(value);
                if (eventValue !== null) {
                    service.getCharacteristic(this.Characteristic.ProgrammableSwitchEvent).updateValue(eventValue);
                    this.logDebug(`${this.deviceData.name} | Button ${buttonNumber} event: ${value} transformed to ${eventValue}`);
                }
                break;
            default:
                this.logDebug(`Button | ${this.deviceData.name} | Unhandled attribute update: ${attribute} = ${value}`);
        }
    }

    transformButtonValue(value) {
        switch (value) {
            case "pushed":
                return this.Characteristic.ProgrammableSwitchEvent.SINGLE_PRESS;
            case "doubleTapped":
                return this.Characteristic.ProgrammableSwitchEvent.DOUBLE_PRESS;
            case "held":
                return this.Characteristic.ProgrammableSwitchEvent.LONG_PRESS;
            default:
                this.logWarn(`Button | ${this.deviceData.name} | Unknown button value: ${value}`);
                return null;
        }
    }

    getButtonState() {
        switch (this.deviceData.attributes.button) {
            case "pushed":
                return this.Characteristic.ProgrammableSwitchEvent.SINGLE_PRESS;
            case "doubleTapped":
                return this.Characteristic.ProgrammableSwitchEvent.DOUBLE_PRESS;
            case "held":
                return this.Characteristic.ProgrammableSwitchEvent.LONG_PRESS;
            default:
                this.logWarn(`Button | ${this.deviceData.name} | Unknown button value: ${this.deviceData.attributes.button}`);
                return null;
        }
    }

    // Override cleanup to handle button service cleanup
    async cleanup() {
        this.buttonServices.clear();
        super.cleanup();
    }
}
