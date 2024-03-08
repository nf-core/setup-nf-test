const fs = require("fs").promises
const os = require("os")
const path = require("path")
const { getInput, debug, setFailed, addPath } = require("@actions/core")
const { downloadTool, extractTar, extractZip } = require("@actions/tool-cache")
const { saveCache, restoreCache } = require("@actions/cache")
const { getDownloadObject } = require("./lib/utils")

async function setup() {
  try {
    const version = getInput("version")

    const paths = [
      path.join(os.homedir(), ".nf-test", "nf-test.jar"),
      path.join(os.homedir(), ".nf-test", "nf-test")
    ]
    const key = "nf-test-" + version
    const restoreKey = await restoreCache(paths, key)
    if (restoreKey) {
      debug(`Cache restored from key: ${restoreKey}`)
      addPath(path.join(os.homedir(), ".nf-test", "nf-test"))
      addPath(path.join(os.homedir(), ".nf-test", "nf-test.jar"))
      return
    }
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

    debug("Make ~/.nf-test")
    await fs.mkdir(path.join(os.homedir(), ".nf-test"))

    debug("Move the jar to ~/.nf-test/nf-test.jar")
    const jarFinalPath = path.join(os.homedir(), ".nf-test", "nf-test.jar")
    await fs.rename(path.join(pathToCLI, "nf-test.jar"), jarFinalPath)

    debug("Move the binary to ~/.nf-test/nf-test")
    const binFinalFilePath = path.join(os.homedir(), ".nf-test", "nf-test")
    await fs.rename(binFilePath, binFinalFilePath)

    debug("Expose the tool by adding it to the PATH")

    addPath(paths)

    // check if paths exist
    for (const p of paths) {
      if (await fileExists(p)) {
        debug(`Path exists: ${p}`)
      }
    }
    // show the contents of the ~/.nf-test directory
    let files
    try {
      files = await fs.readdir(path.join(os.homedir(), ".nf-test"))
    } catch (e) {
      debug(e)
    }
    debug(`Files in ~/.nf-test: ${files}`)

    await saveCache(paths, key)
    debug(`Cache saved with key: ${key}`)

    return
    // // test the cache
    // removePath(binFilePath)
    // removePath(jarFinalPath)
    // const testKey = await restoreCache(paths, key)
    // if (testKey) {
    //   debug(`Cache restored from key: ${testKey}`)
    //   addPath(paths)
    // } else {
    //   debug(`Cache not restored from key: ${key}`)
    // }
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
