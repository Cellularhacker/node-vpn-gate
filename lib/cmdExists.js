"use strict";

const execSync = require("child_process").execSync;
const isWin = process.platform === "win32";

const isExistsUnix = function(cmd) {
  try {
    const stdout = execSync(
      "command -v " +
        cmd +
        " 2>/dev/null" +
        " && { echo >&1 '" +
        cmd +
        " found'; exit 0; }"
    );
    return !!stdout;
  } catch (error) {
    return false;
  }
};

const isExistsWin = cmd => {
  try {
    const stdout = execSync("where " + cmd);
    return !!stdout;
  } catch (error) {
    return false;
  }
};

module.exports = function(cmd) {
  return isWin ? isExistsWin(cmd) : isExistsUnix(cmd);
};
