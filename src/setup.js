const fs = require("fs").promises
const os = require("os")
const path = require("path")
const { getInput, debug, setFailed, addPath } = require("@actions/core")
const { downloadTool, extractTar, extractZip } = require("@actions/tool-cache")
const { saveCache, restoreCache } = require("@actions/cache")

async function setup() {
  try {
    const version = getInput("version")

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
    if (fs.existsSync(path.join(os.homedir(), ".nf-test"))) {
      debug("Directory ~/.nf-test already exists")
      await fs.rm(path.join(os.homedir(), ".nf-test"), {
        recursive: true,
        force: true
      })
    }
    await fs.mkdir(path.join(os.homedir(), ".nf-test"))
    debug(paths)

    debug("Move the binary to ~/.nf-test/nf-test " + paths[0])
    await fs.rename(binFilePath, paths[0])

    debug("Move the jar to ~/.nf-test/nf-test.jar")
    await fs.rename(path.join(pathToCLI, "nf-test.jar"), paths[1])

    debug("Expose the tool by adding it to the PATH")
    addPath(path.dirname(paths[0]))

    await saveCache(paths, key)
    debug(`Cache saved with key: ${key}`)

    return
  } catch (e) {
    setFailed(e)
  }
}

function getDownloadObject(version) {
  const filename = `nf-test-${version}`
  const extension = "tar.gz"
  const binPath = "nf-test"
  const jarPath = "nf-test.jar"
  const url = `https://github.com/askimed/nf-test/releases/download/v${version}/${filename}.${extension}`
  return {
    url,
    binPath,
    jarPath
  }
}

module.exports = setup

if (require.main === module) {
  setup()
}
