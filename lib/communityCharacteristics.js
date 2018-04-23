var inherits = require('util').inherits;

function customCharacteristics(Characteristic) {
    this.TotalConsumption1 = function() {
        Characteristic.call(this, 'Total Consumption (kWh*1000)', 'E863F10C-079E-48FF-8F27-9C2605A29F52');
        this.setProps({
            format: Characteristic.Formats.FLOAT,
            unit: Characteristic.Units.SECONDS,
            maxValue: 4294967295,
            minValue: 0,
            minStep: 1,
            perms: [Characteristic.Perms.READ, Characteristic.Perms.NOTIFY]
        });
        this.value = this.getDefaultValue();
    };
    inherits(this.TotalConsumption1, Characteristic);

    this.CurrentConsumption1 = function() {
        Characteristic.call(this, 'Current Consumption (W*10)', 'E863F10D-079E-48FF-8F27-9C2605A29F52');
        this.setProps({
            format: Characteristic.Formats.FLOAT,
            unit: Characteristic.Units.SECONDS,
            maxValue: 65535,
            minValue: 0,
            minStep: 1,
            perms: [Characteristic.Perms.READ, Characteristic.Perms.NOTIFY]
        });
        this.value = this.getDefaultValue();
    };
    inherits(this.CurrentConsumption1, Characteristic);

    this.KilowattHours = function() {
        Characteristic.call(this, 'Total Consumption', 'E863F10C-079E-48FF-8F27-9C2605A29F52');
        this.setProps({
            format: Characteristic.Formats.UINT32,
            unit: 'kWh',
            minValue: 0,
            maxValue: 65535,
            minStep: 1,
            perms: [Characteristic.Perms.READ, Characteristic.Perms.NOTIFY]
        });
        this.value = this.getDefaultValue();
    };
    inherits(this.KilowattHours, Characteristic);

    this.Watts = function() {
        Characteristic.call(this, 'Consumption', 'E863F10D-079E-48FF-8F27-9C2605A29F52');
        this.setProps({
            format: Characteristic.Formats.UINT16,
            unit: 'W',
            minValue: 0,
            maxValue: 65535,
            minStep: 1,
            perms: [Characteristic.Perms.READ, Characteristic.Perms.NOTIFY]
        });
        this.value = this.getDefaultValue();
    };
    inherits(this.Watts, Characteristic);

    // Characteristics

    this.Timestamp = function() {
        Characteristic.call(this, "Timestamp", this.Timestamp.UUID);
        this.setProps({
            format: Characteristic.Formats.STRING,
            perms: [Characteristic.Perms.READ, Characteristic.Perms.WRITE, Characteristic.Perms.NOTIFY]
        });
        this.value = this.getDefaultValue();
    };
    this.Timestamp.UUID = 'FF000001-0000-1000-8000-135D67EC4377';
    inherits(this.Timestamp, Characteristic);

    this.AudioDataURL = function() {
        Characteristic.call(this, "Audio URL", this.AudioDataURL.UUID);
        this.setProps({
            format: Characteristic.Formats.STRING,
            perms: [Characteristic.Perms.READ, Characteristic.Perms.WRITE, Characteristic.Perms.NOTIFY]
        });
    };
    this.AudioDataURL.UUID = 'FF000002-0000-1000-8000-135D67EC4377';
    inherits(this.AudioDataURL, Characteristic);

    this.VideoDataURL = function() {
        Characteristic.call(this, "Video URL", this.VideoDataURL.UUID);
        this.setProps({
            format: Characteristic.Formats.STRING,
            perms: [Characteristic.Perms.READ, Characteristic.Perms.WRITE, Characteristic.Perms.NOTIFY]
        });
    };
    this.VideoDataURL.UUID = 'FF000003-0000-1000-8000-135D67EC4377';
    inherits(this.VideoDataURL, Characteristic);

    this.AudioVolume = function() {
        Characteristic.call(this, 'Audio Volume', this.AudioVolume.UUID);
        this.setProps({
            format: Characteristic.Formats.UINT8,
            unit: Characteristic.Units.PERCENTAGE,
            maxValue: 100,
            minValue: 0,
            minStep: 1,
            perms: [Characteristic.Perms.READ, Characteristic.Perms.WRITE, Characteristic.Perms.NOTIFY]
        });
        this.value = this.getDefaultValue();
    };
    this.AudioVolume.UUID = '00001001-0000-1000-8000-135D67EC4377';
    inherits(this.AudioVolume, Characteristic);

    this.Muting = function() {
        Characteristic.call(this, 'Muting', this.Muting.UUID);
        this.setProps({
            format: Characteristic.Formats.UINT8,
            perms: [Characteristic.Perms.READ, Characteristic.Perms.WRITE, Characteristic.Perms.NOTIFY]
        });
        this.value = this.getDefaultValue();
    };
    this.Muting.UUID = '00001002-0000-1000-8000-135D67EC4377';
    inherits(this.Muting, Characteristic);

    this.PlaybackState = function() {
        Characteristic.call(this, 'Playback State', this.PlaybackState.UUID);
        this.setProps({
            format: Characteristic.Formats.UINT8,
            perms: [Characteristic.Perms.READ, Characteristic.Perms.WRITE, Characteristic.Perms.NOTIFY]
        });
        this.value = this.getDefaultValue();
    };
    this.PlaybackState.UUID = '00002001-0000-1000-8000-135D67EC4377';
    inherits(this.PlaybackState, Characteristic);
    this.PlaybackState.PLAYING = 0;
    this.PlaybackState.PAUSED = 1;
    this.PlaybackState.STOPPED = 2;

    this.SkipForward = function() {
        Characteristic.call(this, 'Skip Forward', this.SkipForward.UUID);
        this.setProps({
            format: Characteristic.Formats.BOOL,
            perms: [Characteristic.Perms.WRITE]
        });
        this.value = this.getDefaultValue();
    };
    this.SkipForward.UUID = '00002002-0000-1000-8000-135D67EC4377';
    inherits(this.SkipForward, Characteristic);

    this.SkipBackward = function() {
        Characteristic.call(this, 'Skip Backward', this.SkipBackward.UUID);
        this.setProps({
            format: Characteristic.Formats.BOOL,
            perms: [Characteristic.Perms.WRITE]
        });
        this.value = this.getDefaultValue();
    };
    this.SkipBackward.UUID = '00002003-0000-1000-8000-135D67EC4377';
    inherits(this.SkipBackward, Characteristic);

    this.ShuffleMode = function() {
        Characteristic.call(this, 'Shuffle Mode', this.ShuffleMode.UUID);
        this.setProps({
            format: Characteristic.Formats.UINT8,
            perms: [Characteristic.Perms.READ, Characteristic.Perms.WRITE, Characteristic.Perms.NOTIFY]
        });
        this.value = this.getDefaultValue();
    };
    this.ShuffleMode.UUID = '00002004-0000-1000-8000-135D67EC4377';
    inherits(this.ShuffleMode, Characteristic);
    //NOTE: If GROUP or SET is not supported, accessories should coerce to ALBUM.
    // If ALBUM is not supported, coerce to ITEM.
    // In general, it is recommended for apps to only assume OFF, ITEM, and ALBUM
    // are supported unless it is known that the accessory supports other settings.
    this.ShuffleMode.OFF = 0;
    //NOTE: INDIVIDUAL is deprecated.
    this.ShuffleMode.ITEM = this.ShuffleMode.INDIVIDUAL = 1;
    this.ShuffleMode.GROUP = 2; // e.g. iTunes "Groupings"
    this.ShuffleMode.ALBUM = 3; // e.g. album or season
    this.ShuffleMode.SET = 4; // e.g. T.V. Series or album box set

    this.RepeatMode = function() {
        Characteristic.call(this, 'Repeat Mode', this.RepeatMode.UUID);
        this.setProps({
            format: Characteristic.Formats.UINT8,
            perms: [Characteristic.Perms.READ, Characteristic.Perms.WRITE, Characteristic.Perms.NOTIFY]
        });
        this.value = this.getDefaultValue();
    };
    this.RepeatMode.UUID = '00002005-0000-1000-8000-135D67EC4377';
    inherits(this.RepeatMode, Characteristic);
    this.RepeatMode.OFF = 0;
    this.RepeatMode.ONE = 1;
    this.RepeatMode.ALL = 2;

    this.PlaybackSpeed = function() {
        Characteristic.call(this, 'Playback Speed', this.PlaybackSpeed.UUID);
        this.setProps({
            format: Characteristic.Formats.FLOAT,
            perms: [Characteristic.Perms.READ, Characteristic.Perms.WRITE, Characteristic.Perms.NOTIFY]
        });
        this.value = this.getDefaultValue();
    };
    this.PlaybackSpeed.UUID = '00002006-0000-1000-8000-135D67EC4377';
    inherits(this.PlaybackSpeed, Characteristic);

    this.MediaCurrentPosition = function() {
        Characteristic.call(this, 'Media Current Position', this.MediaCurrentPosition.UUID);
        this.setProps({
            format: Characteristic.Formats.FLOAT, // In seconds
            perms: [Characteristic.Perms.READ, Characteristic.Perms.NOTIFY]
        });
        this.value = this.getDefaultValue();
    };
    this.MediaCurrentPosition.UUID = '00002007-0000-1000-8000-135D67EC4377';
    inherits(this.MediaCurrentPosition, Characteristic);

    this.MediaItemName = function() {
        Characteristic.call(this, 'Media Name', this.MediaItemName.UUID);
        this.setProps({
            format: Characteristic.Formats.STRING,
            perms: [Characteristic.Perms.READ, Characteristic.Perms.NOTIFY]
        });
        this.value = this.getDefaultValue();
    };
    this.MediaItemName.UUID = '00003001-0000-1000-8000-135D67EC4377';
    inherits(this.MediaItemName, Characteristic);

    this.MediaItemAlbumName = function() {
        Characteristic.call(this, 'Media Album Name', this.MediaItemAlbumName.UUID);
        this.setProps({
            format: Characteristic.Formats.STRING,
            perms: [Characteristic.Perms.READ, Characteristic.Perms.NOTIFY]
        });
        this.value = this.getDefaultValue();
    };
    this.MediaItemAlbumName.UUID = '00003002-0000-1000-8000-135D67EC4377';
    inherits(this.MediaItemAlbumName, Characteristic);

    this.MediaItemArtist = function() {
        Characteristic.call(this, 'Media Artist', this.MediaItemArtist.UUID);
        this.setProps({
            format: Characteristic.Formats.STRING,
            perms: [Characteristic.Perms.READ, Characteristic.Perms.NOTIFY]
        });
        this.value = this.getDefaultValue();
    };
    this.MediaItemArtist.UUID = '00003003-0000-1000-8000-135D67EC4377';
    inherits(this.MediaItemArtist, Characteristic);

    this.MediaItemDuration = function() {
        Characteristic.call(this, 'Media Duration', this.MediaItemDuration.UUID);
        this.setProps({
            format: Characteristic.Formats.FLOAT, // In seconds
            perms: [Characteristic.Perms.READ, Characteristic.Perms.NOTIFY]
        });
        this.value = this.getDefaultValue();
    };
    this.MediaItemDuration.UUID = '00003005-0000-1000-8000-135D67EC4377';
    inherits(this.MediaItemDuration, Characteristic);

    this.StillImage = function() {
        Characteristic.call(this, 'Still Image', this.StillImage.UUID);
        this.setProps({
            format: Characteristic.Formats.DATA,
            perms: [Characteristic.Perms.READ, Characteristic.Perms.WRITE, Characteristic.Perms.NOTIFY]
        });
        this.value = this.getDefaultValue();
    };
    this.StillImage.UUID = '00004001-0000-1000-8000-135D67EC4377';
    inherits(this.StillImage, Characteristic);

    // Also known as MIME type...
    this.MediaTypeIdentifier = function() {
        Characteristic.call(this, 'Media Type Identifier', this.MediaTypeIdentifier.UUID);
        this.setProps({
            format: Characteristic.Formats.STRING,
            perms: [Characteristic.Perms.READ, Characteristic.Perms.WRITE, Characteristic.Perms.NOTIFY]
        });
        this.value = null;
    };
    this.MediaTypeIdentifier.UUID = '00004002-0000-1000-8000-135D67EC4377';
    inherits(this.MediaTypeIdentifier, Characteristic);

    this.MediaWidth = function() {
        Characteristic.call(this, 'Media Width', this.MediaWidth.UUID);
        this.setProps({
            format: Characteristic.Formats.UINT32,
            perms: [Characteristic.Perms.READ, Characteristic.Perms.WRITE, Characteristic.Perms.NOTIFY]
        });
        this.value = this.getDefaultValue();
    };
    this.MediaWidth.UUID = '00004003-0000-1000-8000-135D67EC4377';
    inherits(this.MediaWidth, Characteristic);

    this.MediaHeight = function() {
        Characteristic.call(this, 'Media Width', this.MediaHeight.UUID);
        this.setProps({
            format: Characteristic.Formats.UINT32,
            perms: [Characteristic.Perms.READ, Characteristic.Perms.WRITE, Characteristic.Perms.NOTIFY]
        });
        this.value = this.getDefaultValue();
    };
    this.MediaHeight.UUID = '00004004-0000-1000-8000-135D67EC4377';
    inherits(this.MediaHeight, Characteristic);

    // courtesy of https://gist.github.com/gomfunkel/b1a046d729757120907c
    this.Volts = function() {
        Characteristic.call(this, 'Volts', this.Volts.UUID);
        this.setProps({
            format: Characteristic.Formats.UINT16,
            unit: "V",
            minValue: 0,
            maxValue: 65535,
            minStep: 1,
            perms: [Characteristic.Perms.READ, Characteristic.Perms.NOTIFY]
        });
        this.value = this.getDefaultValue();
    };
    this.Volts.UUID = 'E863F10A-079E-48FF-8F27-9C2605A29F52';
    inherits(this.Volts, Characteristic);

    this.Amperes = function() {
        Characteristic.call(this, 'Amps', this.Amperes.UUID);
        this.setProps({
            format: Characteristic.Formats.UINT16,
            unit: "A",
            minValue: 0,
            maxValue: 65535,
            minStep: 1,
            perms: [Characteristic.Perms.READ, Characteristic.Perms.NOTIFY]
        });
        this.value = this.getDefaultValue();
    };
    this.Amperes.UUID = 'E863F126-079E-48FF-8F27-9C2605A29F52';
    inherits(this.Amperes, Characteristic);

    this.Watts = function() {
        Characteristic.call(this, 'Consumption', this.Watts.UUID);
        this.setProps({
            format: Characteristic.Formats.UINT16,
            unit: "W",
            minValue: 0,
            maxValue: 65535,
            minStep: 1,
            perms: [Characteristic.Perms.READ, Characteristic.Perms.NOTIFY]
        });
        this.value = this.getDefaultValue();
    };
    this.Watts.UUID = 'E863F10D-079E-48FF-8F27-9C2605A29F52';
    inherits(this.Watts, Characteristic);

    this.VoltAmperes = function() {
        Characteristic.call(this, 'Apparent Power', this.VoltAmperes.UUID);
        this.setProps({
            format: Characteristic.Formats.UINT16,
            unit: "VA",
            minValue: 0,
            maxValue: 65535,
            minStep: 1,
            perms: [Characteristic.Perms.READ, Characteristic.Perms.NOTIFY]
        });
        this.value = this.getDefaultValue();
    };
    this.VoltAmperes.UUID = 'E863F110-079E-48FF-8F27-9C2605A29F52';
    inherits(this.VoltAmperes, Characteristic);

    this.KilowattHours = function() {
        Characteristic.call(this, 'Total Consumption', this.KilowattHours.UUID);
        this.setProps({
            format: Characteristic.Formats.UINT32,
            unit: "kWh",
            minValue: 0,
            maxValue: 65535,
            minStep: 1,
            perms: [Characteristic.Perms.READ, Characteristic.Perms.NOTIFY]
        });
        this.value = this.getDefaultValue();
    };
    this.KilowattHours.UUID = 'E863F10C-079E-48FF-8F27-9C2605A29F52';
    inherits(this.KilowattHours, Characteristic);

    this.KilowattVoltAmpereHour = function() {
        Characteristic.call(this, 'Apparent Energy', this.KilowattVoltAmpereHour.UUID);
        this.setProps({
            format: Characteristic.Formats.UINT32,
            unit: "kVAh",
            minValue: 0,
            maxValue: 65535,
            minStep: 1,
            perms: [Characteristic.Perms.READ, Characteristic.Perms.NOTIFY]
        });
        this.value = this.getDefaultValue();
    };
    this.KilowattVoltAmpereHour.UUID = 'E863F127-079E-48FF-8F27-9C2605A29F52';
    inherits(this.KilowattVoltAmpereHour, Characteristic);

    this.BatteryLevel = function() {
        Characteristic.call(this, 'Battery Level', this.BatteryLevel.UUID);
        this.setProps({
            format: Characteristic.Formats.UINT16,
            unit: Characteristic.Units.PERCENTAGE,
            maxValue: 100,
            minValue: 0,
            minStep: 1,
            perms: [Characteristic.Perms.READ]
        });
        this.value = this.getDefaultValue();
    };
    this.BatteryLevel.UUID = 'E863F11B-079E-48FF-8F27-9C2605A29F52';
    inherits(this.BatteryLevel, Characteristic);

    // courtesy of https://github.com/robi-van-kinobi/homebridge-cubesensors

    this.AtmosphericPressureLevel = function() {
        Characteristic.call(this, 'Barometric Pressure', this.AtmosphericPressureLevel.UUID);
        this.setProps({
            format: Characteristic.Formats.UINT8,
            unit: "mbar",
            minValue: 800,
            maxValue: 1200,
            minStep: 1,
            perms: [Characteristic.Perms.READ, Characteristic.Perms.NOTIFY]
        });
        this.value = this.getDefaultValue();
    };
    this.AtmosphericPressureLevel.UUID = '28FDA6BC-9C2A-4DEA-AAFD-B49DB6D155AB';
    inherits(this.AtmosphericPressureLevel, Characteristic);

    this.NoiseLevel = function() {
        Characteristic.call(this, 'Noise Level', this.NoiseLevel.UUID);
        this.setProps({
            format: Characteristic.Formats.UINT8,
            unit: "dB",
            minValue: 0,
            maxValue: 200,
            minStep: 1,
            perms: [Characteristic.Perms.READ, Characteristic.Perms.NOTIFY]
        });
        this.value = this.getDefaultValue();
    };
    this.NoiseLevel.UUID = '2CD7B6FD-419A-4740-8995-E3BFE43735AB';
    inherits(this.NoiseLevel, Characteristic);

    // courtesy of https://github.com/homespun/homebridge-platform-snmp

    this.AirFlow = function() {
        Characteristic.call(this, 'Air Flow', this.AirFlow.UUID);
        this.setProps({
            format: Characteristic.Formats.UINT8,
            unit: "m/s",
            minValue: 0,
            maxValue: 135,
            minStep: 1,
            perms: [Characteristic.Perms.READ, Characteristic.Perms.NOTIFY]
        });
        this.value = this.getDefaultValue();
    };
    this.AirFlow.UUID = '49C8AE5A-A3A5-41AB-BF1F-12D5654F9F41';
    inherits(this.AirFlow, Characteristic);

    this.NitrogenDioxideDetected = function() {
        Characteristic.call(this, 'Nitrogen Dioxide Detected', this.NitrogenDioxideDetected.UUID);
        this.setProps({
            format: Characteristic.Formats.UINT8,
            perms: [Characteristic.Perms.READ, Characteristic.Perms.NOTIFY]
        });
        this.value = this.getDefaultValue();
    };
    this.NitrogenDioxideDetected.UUID = 'D737B40A-3AF0-4316-950F-76090B98C5CF';
    inherits(this.NitrogenDioxideDetected, Characteristic);

    this.NitrogenDioxideDetected.NO2_LEVELS_NORMAL = 0;
    this.NitrogenDioxideDetected.NO2_LEVELS_ABNORMAL = 1;

    this.NitrogenDioxideLevel = function() {
        Characteristic.call(this, 'Nitrogen Dioxide Level', this.NitrogenDioxideLevel.UUID);
        this.setProps({
            format: Characteristic.Formats.FLOAT,
            unit: "ppm",
            minValue: 0,
            maxValue: 1500,
            minStep: 1,
            perms: [Characteristic.Perms.READ, Characteristic.Perms.NOTIFY]
        });
        this.value = this.getDefaultValue();
    };
    this.NitrogenDioxideLevel.UUID = 'B762A2AF-D9D0-4A79-814A-E9EBAB0ED290';
    inherits(this.NitrogenDioxideLevel, Characteristic);

    this.NitrogenDioxidePeakLevel = function() {
        Characteristic.call(this, 'Nitrogen Dioxide Peak Level', this.NitrogenDioxidePeakLevel.UUID);
        this.setProps({
            format: Characteristic.Formats.FLOAT,
            unit: "ppm",
            minValue: 0,
            maxValue: 1500,
            minStep: 1,
            perms: [Characteristic.Perms.READ, Characteristic.Perms.NOTIFY]
        });
        this.value = this.getDefaultValue();
    };
    this.NitrogenDioxidePeakLevel.UUID = 'B6594847-7B88-496C-A1A0-B7860F3D7601';
    inherits(this.NitrogenDioxidePeakLevel, Characteristic);

    // courtesy of https://github.com/homespun/homebridge-platform-aqe
    this.OzoneDetected = function() {
        Characteristic.call(this, 'Ozone Detected', this.OzoneDetected.UUID);
        this.setProps({
            format: Characteristic.Formats.UINT8,
            perms: [Characteristic.Perms.READ, Characteristic.Perms.NOTIFY]
        });
        this.value = this.getDefaultValue();
    };
    this.OzoneDetected.UUID = '0168FA60-5CF4-4314-AA45-0F84E389A093';
    inherits(this.OzoneDetected, Characteristic);

    this.OzoneDetected.O3_LEVELS_NORMAL = 0;
    this.OzoneDetected.O3_LEVELS_ABNORMAL = 1;

    this.OzoneLevel = function() {
        Characteristic.call(this, 'Ozone Level', this.OzoneLevel.UUID);
        this.setProps({
            format: Characteristic.Formats.FLOAT,
            unit: "ppb",
            minValue: 0,
            maxValue: 1500,
            minStep: 0.01,
            perms: [Characteristic.Perms.READ, Characteristic.Perms.NOTIFY]
        });
        this.value = this.getDefaultValue();
    };
    this.OzoneLevel.UUID = '03C17FD9-672E-42F5-8DD4-30C6822C739A';
    inherits(this.OzoneLevel, Characteristic);

    this.OzonePeakLevel = function() {
        Characteristic.call(this, 'Ozone Peak Level', this.OzonePeakLevel.UUID);
        this.setProps({
            format: Characteristic.Formats.FLOAT,
            unit: "ppb",
            minValue: 0,
            maxValue: 1500,
            minStep: 0.01,
            perms: [Characteristic.Perms.READ, Characteristic.Perms.NOTIFY]
        });
        this.value = this.getDefaultValue();
    };
    this.OzonePeakLevel.UUID = '550EE1FF-FC66-4BB6-A1C1-4B0A07109AE3';
    inherits(this.OzonePeakLevel, Characteristic);

    this.SodiumDioxideDetected = function() {
        Characteristic.call(this, 'Sodium Dioxide Detected', this.SodiumDioxideDetected.UUID);
        this.setProps({
            format: Characteristic.Formats.UINT8,
            perms: [Characteristic.Perms.READ, Characteristic.Perms.NOTIFY]
        });
        this.value = this.getDefaultValue();
    };
    this.SodiumDioxideDetected.UUID = '4D237DAB-1CB6-4D52-B446-4667F58F7D28';
    inherits(this.SodiumDioxideDetected, Characteristic);

    this.SodiumDioxideDetected.SO2_LEVELS_NORMAL = 0;
    this.SodiumDioxideDetected.SO2_LEVELS_ABNORMAL = 1;

    this.SodiumDioxideLevel = function() {
        Characteristic.call(this, 'Sodium Dioxide Level', this.SodiumDioxideLevel.UUID);
        this.setProps({
            format: Characteristic.Formats.FLOAT,
            unit: "ppb",
            minValue: 0,
            maxValue: 1500,
            minStep: 0.01,
            perms: [Characteristic.Perms.READ, Characteristic.Perms.NOTIFY]
        });
        this.value = this.getDefaultValue();
    };
    this.SodiumDioxideLevel.UUID = '66C4D315-FBEF-470E-9434-B047679F1141';
    inherits(this.SodiumDioxideLevel, Characteristic);

    this.SodiumDioxidePeakLevel = function() {
        Characteristic.call(this, 'Sodium Dioxide Peak Level', this.SodiumDioxidePeakLevel.UUID);
        this.setProps({
            format: Characteristic.Formats.FLOAT,
            unit: "ppb",
            minValue: 0,
            maxValue: 1500,
            minStep: 0.01,
            perms: [Characteristic.Perms.READ, Characteristic.Perms.NOTIFY]
        });
        this.value = this.getDefaultValue();
    };
    this.SodiumDioxidePeakLevel.UUID = '4CD6F648-2F92-43D8-86DF-0E8DE75E033B';
    inherits(this.SodiumDioxidePeakLevel, Characteristic);

    this.VolatileOrganicCompoundDetected = function() {
        Characteristic.call(this, 'Volatile Organic Compound Detected', this.VolatileOrganicCompoundDetected.UUID);
        this.setProps({
            format: Characteristic.Formats.UINT8,
            perms: [Characteristic.Perms.READ, Characteristic.Perms.NOTIFY]
        });
        this.value = this.getDefaultValue();
    };
    this.VolatileOrganicCompoundDetected.UUID = '65DBC0F5-C40B-4E04-ADED-DC70031B0B82';
    inherits(this.VolatileOrganicCompoundDetected, Characteristic);

    this.VolatileOrganicCompoundDetected.VOC_LEVELS_NORMAL = 0;
    this.VolatileOrganicCompoundDetected.VOC_LEVELS_ABNORMAL = 1;

    this.VolatileOrganicCompoundLevel = function() {
        Characteristic.call(this, 'Volatile Organic Compound Level', this.VolatileOrganicCompoundLevel.UUID);
        this.setProps({
            format: Characteristic.Formats.FLOAT,
            unit: "ppb",
            minValue: 0,
            maxValue: 1500,
            minStep: 0.01,
            perms: [Characteristic.Perms.READ, Characteristic.Perms.NOTIFY]
        });
        this.value = this.getDefaultValue();
    };
    this.VolatileOrganicCompoundLevel.UUID = '35C4C797-193D-4998-879F-A08514E87897';
    inherits(this.VolatileOrganicCompoundLevel, Characteristic);

    this.VolatileOrganicCompoundPeakLevel = function() {
        Characteristic.call(this, 'Volatile Organic Compound Peak Level', this.VolatileOrganicCompoundPeakLevel.UUID);
        this.setProps({
            format: Characteristic.Formats.FLOAT,
            unit: "ppb",
            minValue: 0,
            maxValue: 1500,
            minStep: 0.01,
            perms: [Characteristic.Perms.READ, Characteristic.Perms.NOTIFY]
        });
        this.value = this.getDefaultValue();
    };
    this.VolatileOrganicCompoundPeakLevel.UUID = 'A62CB784-1916-4BDF-B840-BDB9F8A264E9';
    inherits(this.VolatileOrganicCompoundPeakLevel, Characteristic);

    this.NotificationCode = function() {
        Characteristic.call(this, 'Notification Code', this.NotificationCode.UUID);
        this.setProps({
            format: Characteristic.Formats.UINT8,
            maxValue: 255,
            minValue: 0,
            minStep: 1,
            perms: [Characteristic.Perms.READ, Characteristic.Perms.WRITE, Characteristic.Perms.NOTIFY]
        });
        this.value = 255;
    };
    this.NotificationCode.UUID = '381C47A3-CB06-4177-8E3D-A1B4C22EB031';
    inherits(this.NotificationCode, Characteristic);

    this.NotificationText = function() {
        Characteristic.call(this, 'Notification Text', this.NotificationText.UUID);
        this.setProps({
            format: Characteristic.Formats.STRING,
            perms: [Characteristic.Perms.READ, Characteristic.Perms.NOTIFY]
        });
        this.value = '';
    };
    this.NotificationText.UUID = 'e244ca80-813e-423a-86bd-02f293b857a0';
    inherits(this.NotificationText, Characteristic);
    return this;
}

module.exports.customCharacteristics = customCharacteristics;