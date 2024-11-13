// device_types/Button.js

import HubitatPlatformAccessory from "../HubitatPlatformAccessory.js";

export default class Button extends HubitatPlatformAccessory {
    constructor(platform, accessory) {
        super(platform, accessory);
        this.platform = platform;
        this.buttonServices = new Map(); // Track button services by number
    }

    async configureServices() {
        try {
            const buttonCount = this.deviceData.attributes.numberOfButtons || 1;

            // Configure each button
            for (let buttonNumber = 1; buttonNumber <= buttonCount; buttonNumber++) {
                await this.configureButton(buttonNumber);
            }

            return true;
        } catch (error) {
            this.logError("Error configuring button services:", error);
            throw error;
        }
    }

    async configureButton(buttonNumber) {
        const serviceName = `${this.accessory.displayName}_Button${buttonNumber}`;

        // Create button service
        const buttonService = this.getOrAddService(this.Service.StatelessProgrammableSwitch, serviceName, buttonNumber.toString());

        // Store for tracking
        this.buttonServices.set(buttonNumber, buttonService);
        this.markServiceForRetention(buttonService);

        // Configure characteristics
        this.setupButtonCharacteristics(buttonService, buttonNumber);

        // Register with platform's button map
        this.platform.accessories.registerButtonService(this.accessory, buttonService, buttonNumber);
    }

    setupButtonCharacteristics(service, buttonNumber) {
        // Get valid values based on capabilities
        const validValues = this.getValidButtonValues();

        // Programmable Switch Event characteristic
        this.getOrAddCharacteristic(service, this.Characteristic.ProgrammableSwitchEvent, {
            props: { validValues },
            eventOnly: true,
        });

        // Service Label Index characteristic
        this.getOrAddCharacteristic(service, this.Characteristic.ServiceLabelIndex, {
            getHandler: () => buttonNumber,
        });

        // Name characteristic (optional but helpful)
        this.getOrAddCharacteristic(service, this.Characteristic.Name, {
            getHandler: () => `Button ${buttonNumber}`,
        });
    }

    getValidButtonValues() {
        const values = new Set();
        const ProgrammableSwitchEvent = this.Characteristic.ProgrammableSwitchEvent;

        // Add supported button actions based on capabilities
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

    async handleAttributeUpdate(attribute, value, data = {}) {
        this.updateDeviceAttribute(attribute, value);
        if (attribute !== "button") return;

        const buttonNumber = data.buttonNumber || 1;
        const service = this.buttonServices.get(buttonNumber);

        if (!service) {
            this.logWarn(`No service found for button ${buttonNumber}`);
            return;
        }

        const eventValue = this.transformButtonValue(value);
        if (eventValue !== null) {
            service.getCharacteristic(this.Characteristic.ProgrammableSwitchEvent).updateValue(eventValue);

            this.logDebug(`Button ${buttonNumber} event: ${value} transformed to ${eventValue}`);
        }
    }

    transformButtonValue(value) {
        const ProgrammableSwitchEvent = this.Characteristic.ProgrammableSwitchEvent;

        switch (value) {
            case "pushed":
                return ProgrammableSwitchEvent.SINGLE_PRESS;
            case "held":
                return ProgrammableSwitchEvent.LONG_PRESS;
            case "doubleTapped":
                return ProgrammableSwitchEvent.DOUBLE_PRESS;
            default:
                this.logWarn(`Unknown button value: ${value}`);
                return null;
        }
    }

    // Override cleanup to handle button service cleanup
    async cleanup() {
        // Clean up button map registrations
        for (const [buttonNumber, service] of this.buttonServices) {
            this.platform.accessories.unregisterButtonService(this.accessory, buttonNumber);
        }

        this.buttonServices.clear();
        await super.cleanup();
    }
}
