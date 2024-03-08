const fs = require("fs")
const os = require("os")
const path = require("path")
const core = require("@actions/core")
const tc = require("@actions/tool-cache")
const { getDownloadObject } = require("./lib/utils")

async function setup() {
  try {
    // Get version of tool to be installed
    const version = core.getInput("version")

    // Download the specific version of the tool, e.g. as a tarball/zipball
    const toolPath = tc.find("nf-test", version)
    const jarPath = tc.find("nf-test.jar", version)
    if (toolPath !== "") {
      core.debug(`nf-test found in cache ${toolPath}`)
      core.addPath(path.join(toolPath, "bin"))
    } else {
      core.debug(`no version of nf-test matching "${version}" is installed`)
      const download = getDownloadObject(version)
      const pathToTarball = await tc.downloadTool(download.url)

      // Extract the tarball/zipball onto host runner
      const extract = download.url.endsWith(".zip")
        ? tc.extractZip
        : tc.extractTar
      const pathToCLI = await extract(pathToTarball)

      core.debug(`Path to CLI: ${pathToCLI}`)
      core.debug(`Bin path: ${download.binPath}`)

      // Check if the file exists and is executable
      if (fs.existsSync(path.join(pathToCLI, download.binPath))) {
        core.debug("nf-test exists")
        try {
          fs.accessSync(
            path.join(pathToCLI, download.binPath),
            fs.constants.X_OK
          )
          core.debug("nf-test is executable")
        } catch (err) {
          core.debug("nf-test is not executable")
        }
      } else {
        core.debug("nf-test does not exist")
      }

      core.debug("Expose the tool by adding it to the PATH")
      const cachedPath = await tc.cacheFile(
        path.join(pathToCLI, download.binPath),
        "nf-test",
        "nf-test",
        version
      )
      core.debug("Add nf-test to path")
      core.addPath(path.join(cachedPath))

      core.debug("Make ~/.nf-test")
      fs.mkdirSync(path.join(os.homedir(), ".nf-test"))
      core.debug("Move the jar to ~/.nf-test/nf-test.jar")
      const jarFinalPath = path.join(os.homedir(), ".nf-test", "nf-test.jar")
      fs.renameSync(path.join(pathToCLI, "nf-test.jar"), jarFinalPath)
      core.debug("Cache the jar")
      core.debug("Version:")
      await tc.cacheFile(jarFinalPath, "nf-test.jar", "nf-test.jar", version)

      core.debug("current Path:" + process.env.PATH)
    }
  } catch (e) {
    core.setFailed(e)
  }
}

module.exports = setup

if (require.main === module) {
  setup()
}
