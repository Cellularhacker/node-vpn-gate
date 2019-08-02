"use strict";

const BBPromise = require("bluebird"),
  fs = BBPromise.promisifyAll(require("fs")),
  tmp = require("tmp"),
  errors = [];

module.exports = function(vpnConfigData) {
  let VpnConfig,
    vpnConfigs = [],
    countries = {};

  VpnConfig = (function() {
    let id = 0;

    let VpnConfigConstructor = function(params) {
      const self = this;

      self.configFileName = null;
      self.status = "Disconnected";

      self.id = ++id;

      Object.keys(params).forEach(function(key) {
        self[key] = params[key];
      });
    };

    VpnConfigConstructor.prototype.getId = function() {
      return this.id;
    };

    /**
     * Returns OpenVpn config data
     * @returns {string}
     */
    VpnConfigConstructor.prototype.getConfigData = function() {
      return new Buffer(this.OpenVPN_ConfigData_Base64, "base64").toString();
    };

    /**
     *
     * @returns {string} Full country name like Japan or Germany
     */
    VpnConfigConstructor.prototype.getCountryName = function() {
      return this.CountryLong;
    };

    /**
     *
     * @returns {string} Short country name like JP or US
     */
    VpnConfigConstructor.prototype.getCountryID = function() {
      return this.CountryShort;
    };

    /**
     * Get Operator IP
     * @returns {string}
     */
    VpnConfigConstructor.prototype.getIP = function() {
      return this.IP;
    };

    /**
     * Mount config data - means temporary file with openvpn config data will be created
     * @returns {BBPromise.<T>|*}
     */
    VpnConfigConstructor.prototype.mount = function() {
      const self = this;
      if (null === self.configFileName) {
        self.configFileName = tmp.fileSync().name;
      }
      return fs
        .writeFileAsync(self.configFileName, self.getConfigData(), "utf8")
        .catch(function(err) {
          errors.push(err.message);
        })
        .then(function() {
          return self.configFileName;
        });
    };

    VpnConfigConstructor.prototype.setStatus = function(status) {
      this.status = status;
    };

    VpnConfigConstructor.prototype.getConfigFileName = function() {
      return this.configFileName;
    };

    VpnConfigConstructor.prototype.export = function() {
      let uptime = parseInt(this.Uptime, 10),
        uptimeMinutes,
        uptimeHours;

      let xTime = uptime / 1000;
      let uptimeSeconds = xTime % 60;
      xTime /= 60;
      uptimeMinutes = xTime % 60;
      xTime /= 60;
      uptimeHours = xTime % 24;
      xTime /= 24;
      const uptimeDays = xTime;

      let uptimeString = "-";
      if (uptimeDays >= 1) uptimeString = Math.floor(uptimeDays) + " days";
      else if (uptimeHours >= 1)
        uptimeString = Math.floor(uptimeHours) + " hours";
      else if (uptimeMinutes >= 1)
        uptimeString = Math.floor(uptimeMinutes) + " minutes";

      return {
        id: this.id,
        host: this["#HostName"],
        ip: this.IP,
        score: this.Score,
        ping: this.Ping + " ms",
        speed: (this.Speed / 1000000).toFixed(2) + " Mbps",
        country: this.CountryShort,
        countryName: this.CountryLong,
        uptime: uptimeString,
        users: this.TotalUsers,
        traffic: (function(size) {
          if (+size === 0) {
            return "-";
          }
          const i = Math.floor(Math.log(size) / Math.log(1024));
          return (
            (size / Math.pow(1024, i)).toFixed(2) * 1 +
            " " +
            ["B", "kB", "MB", "GB", "TB"][i]
          );
        })(this.TotalTraffic),

        logType: this.LogType,
        operator: this.Operator,
        message: this.Message,
        sessions: this.NumVpnSessions,
        status: this.status
      };
    };

    return VpnConfigConstructor;
  })();

  function setUp(data) {
    countries = {};
    vpnConfigs = [];
    // Generate vpn config objects
    data.forEach(function(item) {
      vpnConfigs.push(new VpnConfig(item));
    });
  }

  setUp(vpnConfigData);

  return {
    setUp: setUp,

    getAll: function(groupByCountry) {
      const result = {};

      if (groupByCountry) {
        vpnConfigs.forEach(function(item) {
          if (!result[item.getCountryID()]) {
            result[item.getCountryID()] = [];
          }
          result[item.getCountryID()].push(item);
        });
        return result;
      }

      return vpnConfigs;
    },

    /**
     *
     * @param ID
     * @returns {array}
     */
    getByCountryID: function(ID) {
      return vpnConfigs.filter(function(item) {
        return item.getCountryID() == ID;
      });
    },

    /**
     * Get all available countries as key will be short country name (ID), as value will be full country name
     * @returns {{}}
     */
    getCountries: function() {
      if (Object.keys(countries).length === 0) {
        vpnConfigs.forEach(function(configItem) {
          countries[configItem.getCountryID()] = configItem.getCountryName();
        });
      }
      return countries;
    },

    getById: function(id) {
      return vpnConfigs
        .filter(function(conf) {
          return id === conf.getId();
        })
        .pop();
    },

    getNextById: function(id) {
      const config = this.getById(id),
        country = config.getCountryID(),
        groupConf = this.getAll(true),
        len = groupConf[country].length;

      for (let i = 0; i < len; i++) {
        if (config.getId() === groupConf[country][i].getId()) {
          if (groupConf[country][i + 1]) {
            return groupConf[country][i + 1];
          } else {
            return groupConf[country][0];
          }
        }
      }
    },

    getErrors: function() {
      return errors;
    }
  };
};
