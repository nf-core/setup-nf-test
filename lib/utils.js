const os = require("os");
const path = require("path");

function getDownloadObject(version) {
    const platform = os.platform();
    const filename = `nf-test-${version}`;
    const extension = "tar.gz";
    const binPath = platform === "win32" ? "bin" : path.join(filename, "bin");
    const url = `https://github.com/askimed/nf-test/releases/download/v${version}/${filename}.${extension}`;
    return {
        url,
        binPath,
    };
}

module.exports = { getDownloadObject };
