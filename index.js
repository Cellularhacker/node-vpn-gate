#!/usr/bin/env node
"use strict";

module.exports = function(country) {
  if (country === undefined) throw "You have to input country.";
  const vpnProvider = require("./lib/vpnProvider");
  const cmdExists = require("./lib/cmdExists");

  let openvpnCmd = "openvpn";
  const vpnGate = vpnProvider(country, openvpnCmd);

  if (!cmdExists(openvpnCmd)) {
    openvpnCmd += 2;
  }

  vpnGate.loadCsv();

  vpnGate.on("csv-loaded", (configs, config) => {
    vpnGate.connect();
  });

  vpnGate.on("vpn-failed", () => {
    vpnGate.tryNext();
  });
};
