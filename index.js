const core = require("@actions/core");
const tc = require("@actions/tool-cache");

async function setup() {
    // Get version of tool to be installed
    const version = core.getInput("version");

    // Download the specific version of the tool, e.g. as a tarball
    const pathToTarball = await tc.downloadTool(getDownloadURL());

    // Extract the tarball onto the runner
    const pathToCLI = await tc.extractTar(pathToTarball);

    // Expose the tool by adding it to the PATH
    core.addPath(pathToCLI);
}

module.exports = setup;
