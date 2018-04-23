var inherits = require('util').inherits;

function customServices(Service) {
    // Services

    this.AudioDeviceService = function(displayName, subtype) {
        Service.call(this, displayName, this.AudioDeviceService.UUID, subtype);

        // Required Characteristics
        this.addCharacteristic(this.AudioVolume);

        // Optional Characteristics
        this.addOptionalCharacteristic(this.Muting);
        this.addOptionalCharacteristic(Characteristic.Name);
    };
    this.AudioDeviceService.UUID = '00000001-0000-1000-8000-135D67EC4377';
    inherits(this.AudioDeviceService, Service);

    this.PlaybackDeviceService = function(displayName, subtype) {
        Service.call(this, displayName, this.PlaybackDeviceService.UUID, subtype);

        // Required Characteristics
        this.addCharacteristic(this.PlaybackState);

        // Optional Characteristics
        this.addOptionalCharacteristic(this.SkipForward);
        this.addOptionalCharacteristic(this.SkipBackward);
        this.addOptionalCharacteristic(this.ShuffleMode);
        this.addOptionalCharacteristic(this.RepeatMode);
        this.addOptionalCharacteristic(this.PlaybackSpeed);
        this.addOptionalCharacteristic(this.MediaCurrentPosition);
        this.addOptionalCharacteristic(this.MediaItemName);
        this.addOptionalCharacteristic(this.MediaItemAlbumName);
        this.addOptionalCharacteristic(this.MediaItemArtist);
        this.addOptionalCharacteristic(this.MediaItemDuration);
        this.addOptionalCharacteristic(Characteristic.Name);
        // Artwork characteristics...would be better reported in a separate service?
        this.addOptionalCharacteristic(this.StillImage);
        this.addOptionalCharacteristic(this.MediaTypeIdentifier);
        this.addOptionalCharacteristic(this.MediaWidth);
        this.addOptionalCharacteristic(this.MediaHeight);
    };
    this.PlaybackDeviceService.UUID = '00000002-0000-1000-8000-135D67EC4377';
    inherits(this.PlaybackDeviceService, Service);

    // A media information service that has no playback controls, for e.g. DAB radio...
    this.MediaInformationService = function(displayName, subtype) {
        Service.call(this, displayName, this.MediaInformationService.UUID, subtype);

        // Required Characteristics
        this.addCharacteristic(this.MediaItemName);

        // Optional Characteristics
        this.addOptionalCharacteristic(this.MediaItemAlbumName);
        this.addOptionalCharacteristic(this.MediaItemArtist);
        this.addOptionalCharacteristic(this.MediaItemDuration);
        this.addOptionalCharacteristic(this.MediaCurrentPosition);
        this.addOptionalCharacteristic(Characteristic.Name);
        // Artwork characteristics...would be better reported in a separate service?
        this.addOptionalCharacteristic(this.StillImage);
        this.addOptionalCharacteristic(this.MediaTypeIdentifier);
        this.addOptionalCharacteristic(this.MediaWidth);
        this.addOptionalCharacteristic(this.MediaHeight);
    };
    this.MediaInformationService.UUID = '00000003-0000-1000-8000-135D67EC4377';
    inherits(this.MediaInformationService, Service);

    this.StillImageService = function(displayName, subtype) {
        Service.call(this, displayName, this.StillImageService.UUID, subtype);

        // Required Characteristics
        this.addCharacteristic(this.StillImage);
        this.addCharacteristic(this.MediaTypeIdentifier);

        // Optional Characteristics
        this.addOptionalCharacteristic(this.MediaWidth);
        this.addOptionalCharacteristic(this.MediaHeight);
        this.addOptionalCharacteristic(Characteristic.Name);
    };
    this.StillImageService.UUID = '00000004-0000-1000-8000-135D67EC4377';
    inherits(this.StillImageService, Service);

    this.SecurityCameraService = function(displayName, subtype) {
        Service.call(this, displayName, this.SecurityCameraService.UUID, subtype);

        // Required Characteristics
        this.addCharacteristic(this.StillImageService);
        this.addCharacteristic(this.MediaTypeIdentifier);

        // Optional Characteristics
        this.addOptionalCharacteristic(this.Timestamp);
        this.addOptionalCharacteristic(this.MediaWidth);
        this.addOptionalCharacteristic(this.MediaHeight);
        this.addOptionalCharacteristic(this.VideoDataURL);
        this.addOptionalCharacteristic(this.AudioDataURL);
        this.addOptionalCharacteristic(Characteristic.MotionDetected);
        this.addOptionalCharacteristic(Characteristic.StatusTampered);
        this.addOptionalCharacteristic(Characteristic.Name);
    };
    this.SecurityCameraService.UUID = '00000005-0000-1000-8000-135D67EC4377';

    // courtesy of https://github.com/robi-van-kinobi/homebridge-cubesensors
    this.AtmosphericPressureSensor = function(displayName, subtype) {
        Service.call(this, displayName, this.AtmosphericPressureSensor.UUID, subtype);

        // Required Characteristics
        this.addCharacteristic(this.AtmosphericPressureLevel);

        // Optional Characteristics
        this.addOptionalCharacteristic(Characteristic.StatusActive);
        this.addOptionalCharacteristic(Characteristic.StatusFault);
        this.addOptionalCharacteristic(Characteristic.StatusLowBattery);
        this.addOptionalCharacteristic(Characteristic.StatusTampered);
        this.addOptionalCharacteristic(Characteristic.Name);
    };
    this.AtmosphericPressureSensor.UUID = 'B77831FD-D66A-46A4-B66D-FD7EE8DFE3CE';
    inherits(this.AtmosphericPressureSensor, Service);

    this.NoiseLevelSensor = function(displayName, subtype) {
        Service.call(this, displayName, this.NoiseLevelSensor.UUID, subtype);

        // Required Characteristics
        this.addCharacteristic(this.NoiseLevel);

        // Optional Characteristics
        this.addOptionalCharacteristic(Characteristic.StatusActive);
        this.addOptionalCharacteristic(Characteristic.StatusFault);
        this.addOptionalCharacteristic(Characteristic.StatusLowBattery);
        this.addOptionalCharacteristic(Characteristic.StatusTampered);
        this.addOptionalCharacteristic(Characteristic.Name);
    };
    this.NoiseLevelSensor.UUID = '28FDA6BC-9C2A-4DEA-AAFD-B49DB6D155AB';
    inherits(this.NoiseLevelSensor, Service);

    // courtesy of https://github.com/homespun/homebridge-platform-snmp

    this.AirFlowSensor = function(displayName, subtype) {
        Service.call(this, displayName, this.AirFlowSensor.UUID, subtype);

        // Required Characteristics
        this.addCharacteristic(this.AirFlow);

        // Optional Characteristics
        this.addOptionalCharacteristic(Characteristic.StatusActive);
        this.addOptionalCharacteristic(Characteristic.StatusFault);
        this.addOptionalCharacteristic(Characteristic.StatusLowBattery);
        this.addOptionalCharacteristic(Characteristic.StatusTampered);
        this.addOptionalCharacteristic(Characteristic.Name);
    };
    this.AirFlowSensor.UUID = 'AF5C192E-420F-4A13-AB67-B8F3968A4935';
    inherits(this.AirFlowSensor, Service);

    this.NitrogenDioxideSensor = function(displayName, subtype) {
        Service.call(this, displayName, this.NitrogenDioxideSensor.UUID, subtype);

        // Required Characteristics
        this.addCharacteristic(this.NitrogenDioxideDetected);

        // Optional Characteristics
        this.addOptionalCharacteristic(Characteristic.StatusActive);
        this.addOptionalCharacteristic(Characteristic.StatusFault);
        this.addOptionalCharacteristic(Characteristic.StatusLowBattery);
        this.addOptionalCharacteristic(this.NitrogenDioxideLevel);
        this.addOptionalCharacteristic(this.NitrogenDioxidePeakLevel);
        this.addOptionalCharacteristic(Characteristic.StatusTampered);
        this.addOptionalCharacteristic(Characteristic.Name);
    };
    this.NitrogenDioxideSensor.UUID = '9F6B797D-D43B-4C88-9AA0-57018AB8A91E';
    inherits(this.NitrogenDioxideSensor, Service);

    // courtesy of https://github.com/homespun/homebridge-platform-aqe
    this.OzoneSensor = function(displayName, subtype) {
        Service.call(this, displayName, this.OzoneSensor.UUID, subtype);

        // Required Characteristics
        this.addCharacteristic(this.OzoneDetected);

        // Optional Characteristics
        this.addOptionalCharacteristic(Characteristic.StatusActive);
        this.addOptionalCharacteristic(Characteristic.StatusFault);
        this.addOptionalCharacteristic(Characteristic.StatusLowBattery);
        this.addOptionalCharacteristic(this.OzoneLevel);
        this.addOptionalCharacteristic(this.OzonePeakLevel);
        this.addOptionalCharacteristic(Characteristic.StatusTampered);
        this.addOptionalCharacteristic(Characteristic.Name);
    };
    this.OzoneSensor.UUID = 'B91C2BD6-D071-4F49-A23B-20721AC6CCEB';
    inherits(this.OzoneSensor, Service);

    this.SodiumDioxideSensor = function(displayName, subtype) {
        Service.call(this, displayName, this.SodiumDioxideSensor.UUID, subtype);

        // Required Characteristics
        this.addCharacteristic(this.SodiumDioxideDetected);

        // Optional Characteristics
        this.addOptionalCharacteristic(Characteristic.StatusActive);
        this.addOptionalCharacteristic(Characteristic.StatusFault);
        this.addOptionalCharacteristic(Characteristic.StatusLowBattery);
        this.addOptionalCharacteristic(this.SodiumDioxideLevel);
        this.addOptionalCharacteristic(this.SodiumDioxidePeakLevel);
        this.addOptionalCharacteristic(Characteristic.StatusTampered);
        this.addOptionalCharacteristic(Characteristic.Name);
    };
    this.SodiumDioxideSensor.UUID = 'FE7CFB1F-12D0-405D-86FD-7E268D65C453';
    inherits(this.SodiumDioxideSensor, Service);

    this.VolatileOrganicCompoundSensor = function(displayName, subtype) {
        Service.call(this, displayName, this.VolatileOrganicCompoundSensor.UUID, subtype);

        // Required Characteristics
        this.addCharacteristic(this.VolatileOrganicCompoundDetected);

        // Optional Characteristics
        this.addOptionalCharacteristic(Characteristic.StatusActive);
        this.addOptionalCharacteristic(Characteristic.StatusFault);
        this.addOptionalCharacteristic(Characteristic.StatusLowBattery);
        this.addOptionalCharacteristic(this.VolatileOrganicCompoundLevel);
        this.addOptionalCharacteristic(this.VolatileOrganicCompoundPeakLevel);
        this.addOptionalCharacteristic(Characteristic.StatusTampered);
        this.addOptionalCharacteristic(Characteristic.Name);
    };
    this.VolatileOrganicCompoundSensor.UUID = '776E34BC-1660-46EC-A33D-2DFE5B958699';
    inherits(this.VolatileOrganicCompoundSensor, Service);

    this.NotificationService = function(displayName, subtype) {
        Service.call(this, displayName, this.NotificationService.UUID, subtype);

        // Required Characteristics
        this.addCharacteristic(this.NotificationCode);
        this.addCharacteristic(this.NotificationText);

        // Optional Characteristics
        this.addOptionalCharacteristic(Characteristic.Name);
    };
    this.NotificationService.UUID = '074D8CE9-5B4B-48D5-9990-D98850C2F3FE';
    inherits(this.NotificationService, Service);

    return this;
}

module.exports.customServices = customServices;