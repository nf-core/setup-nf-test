const fs = require("fs").promises
const os = require("os")
const path = require("path")
const { getInput, debug, setFailed, addPath } = require("@actions/core")
const {
  find,
  downloadTool,
  extractTar,
  extractZip,
  cacheFile
} = require("@actions/tool-cache")
const { getDownloadObject } = require("./lib/utils")

async function setup() {
  try {
    const version = getInput("version")

    const toolPath = find("nf-test", version)
    const jarPath = find("nf-test.jar", version)
    if (toolPath !== "") {
      debug(`nf-test found in cache ${toolPath}`)
      addPath(toolPath)
      addPath(jarPath)
      return
    }
    // list cached files
    const cachedFiles = await fs.readdir(process.env.RUNNER_TOOL_CACHE || "")
    debug("Cached files:")
    debug(cachedFiles)
    debug(`no version of nf-test matching "${version}" is installed`)
    const download = getDownloadObject(version)
    const pathToTarball = await downloadTool(download.url)

    const extract = download.url.endsWith(".zip") ? extractZip : extractTar
    const pathToCLI = await extract(pathToTarball)

    debug(`Path to CLI: ${pathToCLI}`)
    debug(`Bin path: ${download.binPath}`)

    const binFilePath = path.join(pathToCLI, download.binPath)
    if (await fileExists(binFilePath)) {
      debug("nf-test exists")
      if (await isExecutable(binFilePath)) {
        debug("nf-test is executable")
      } else {
        debug("nf-test is not executable")
        //throw error
        setFailed("nf-test is not executable")
      }
    } else {
      debug("nf-test does not exist")
      //throw error
      setFailed("nf-test does not exist")
    }

    debug("Expose the tool by adding it to the PATH")
    const [cachedCLIPath, cachedJarPath] = await Promise.all([
      cacheFile(binFilePath, "nf-test", "nf-test", version),
      cacheFile(
        path.join(pathToCLI, "nf-test.jar"),
        "nf-test.jar",
        "nf-test.jar",
        version
      )
    ])
    addPath(cachedCLIPath)
    addPath(cachedJarPath)

    debug("Make ~/.nf-test")
    await fs.mkdir(path.join(os.homedir(), ".nf-test"))

    debug("Move the jar to ~/.nf-test/nf-test.jar")
    const jarFinalPath = path.join(os.homedir(), ".nf-test", "nf-test.jar")
    await fs.rename(path.join(pathToCLI, "nf-test.jar"), jarFinalPath)

    debug("Cache the jar")
    await cacheFile(jarFinalPath, "nf-test.jar", "nf-test.jar", version)

    debug("Cached files:")
    cachedFiles = await fs.readdir(process.env.RUNNER_TOOL_CACHE || "")
    debug(cachedFiles)
  } catch (e) {
    setFailed(e)
  }
}

async function fileExists(filePath) {
  try {
    await fs.access(filePath)
    return true
  } catch (err) {
    return false
  }
}

async function isExecutable(filePath) {
  try {
    await fs.access(filePath, fs.constants.X_OK)
    return true
  } catch (err) {
    return false
  }
}

module.exports = setup

if (require.main === module) {
  setup()
}
