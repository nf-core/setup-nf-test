const fs = require("fs-extra")
const os = require("os")
const path = require("path")
const { getInput, debug, setFailed, addPath, error } = require("@actions/core")
const { downloadTool, extractTar, extractZip } = require("@actions/tool-cache")
const { saveCache, restoreCache } = require("@actions/cache")
const { getDownloadObject } = require("./lib/utils")
const { exec } = require("@actions/exec")

async function setup() {
  try {
    const version = getInput("version")
    const installPdiff = getInput("install-pdiff") === "true"

    const paths = [
      path.join(os.homedir(), ".nf-test", "nf-test"),
      path.join(os.homedir(), ".nf-test", "nf-test.jar")
    ]
    const key = "nf-test-" + version
    const restoreKey = await restoreCache(paths, key)
    if (restoreKey) {
      debug(`Cache restored from key: ${restoreKey}`)
      addPath(path.dirname(paths[0]))
      return
    }
    debug(`no version of nf-test matching "${version}" is installed`)
    const download = getDownloadObject(version)
    const pathToTarball = await downloadTool(download.url)

    const extract = download.url.endsWith(".zip") ? extractZip : extractTar
    const pathToCLI = await extract(pathToTarball)

    debug(`Path to CLI: ${pathToCLI}`)
    debug(`Bin path: ${download.binPath}`)

    const binFilePath = path.resolve(pathToCLI, download.binPath)

    debug("Make ~/.nf-test even if it already exists")
    if (fileExists(path.join(os.homedir(), ".nf-test"))) {
      debug("Directory ~/.nf-test already exists")
      await fs.rm(path.join(os.homedir(), ".nf-test"), {
        recursive: true,
        force: true
      })
    }
    await fs.mkdir(path.join(os.homedir(), ".nf-test"))
    debug(paths)

    debug("Move the binary to ~/.nf-test/nf-test " + paths[0])
    try {
      await fs.move(binFilePath, paths[0])
    } catch (err) {
      error(err)
    }

    debug("Move the jar to ~/.nf-test/nf-test.jar")
    try {
      await fs.move(path.join(pathToCLI, "nf-test.jar"), paths[1])
    } catch (err) {
      error(err)
    }

    debug("Expose the tool by adding it to the PATH")
    addPath(path.dirname(paths[0]))

    if (installPdiff) {
      debug("Installing pdiff and setting environment variables")
      await exec("pip install pdiff")
      process.env.NFT_DIFF = "pdiff"
      process.env.NFT_DIFF_ARGS = "--line-numbers --expand-tabs=2"
    }

    await saveCache(paths, key)
    debug(`Cache saved with key: ${key}`)

    return
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

module.exports = setup

if (require.main === module) {
  setup()
}
