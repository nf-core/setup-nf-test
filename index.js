const fs = require("fs");
const os = require("os");
const path = require("path");
const core = require("@actions/core");
const tc = require("@actions/tool-cache");
const { getDownloadObject } = require("./lib/utils");

async function setup() {
    try {
        // Get version of tool to be installed
        const version = core.getInput("version");

        // Download the specific version of the tool, e.g. as a tarball/zipball
        const toolPath = tc.find("nf-test", version);
        if (toolPath !== "") {
            core.addPath(path.join(toolPath, "bin"));
        } else {
            core.debug(
                `no version of nf-test matching "${version}" is installed`,
            );
            const download = getDownloadObject(version);
            const pathToTarball = await tc.downloadTool(download.url);

            // Extract the tarball/zipball onto host runner
            const extract = download.url.endsWith(".zip")
                ? tc.extractZip
                : tc.extractTar;
            const pathToCLI = await extract(pathToTarball);

            // Expose the tool by adding it to the PATH
            tc.cacheFile(
                path.join(pathToCLI, download.binPath),
                "nf-test",
                version,
            );
            core.addPath(path.join(pathToCLI, download.binPath));

            // Move the jar to ~/.nf-test/nf-test.jar
            fs.mkdirSync(path.join(os.homedir(), ".nf-test"));
            jar_final_path = fs.renameSync(
                path.join(pathToCLI, download.jarPath),
                path.join(os.homedir(), ".nf-test", "nf-test.jar"),
            );
            // Cache the jar
            tc.cacheFile(jar_final_path, "nf-test.jar", version);
        }
    } catch (e) {
        core.setFailed(e);
    }
}

module.exports = setup;

if (require.main === module) {
    setup();
}
