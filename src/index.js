// index.js

const { pluginName, platformName } = require("./Constants");
const hePlatform = require("./Platform");

module.exports = (homebridge) => {
    homebridge.registerPlatform(pluginName, platformName, hePlatform, true);
};
