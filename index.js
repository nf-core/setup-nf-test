const fs = require("fs-extra")
const os = require("os")
const path = require("path")
const {
  getInput,
  debug,
  setFailed,
  addPath,
  error,
  exportVariable
} = require("@actions/core")
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
    const key = "nf-test-" + version + "-install-pdiff-" + installPdiff
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
    if (await fileExists(path.join(os.homedir(), ".nf-test"))) {
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
      await exec("python -m pip install pdiff")

      // Create a simple wrapper script in the same directory as nf-test
      const pdiffWrapperPath = path.join(path.dirname(paths[0]), "pdiff")
      await fs.writeFile(
        pdiffWrapperPath,
        `#!/bin/bash\npython -m pdiff "$@"\n`
      )
      await fs.chmod(pdiffWrapperPath, 0o755)
      debug(`Created pdiff wrapper at ${pdiffWrapperPath}`)

      // Set environment variables
      exportVariable("NFT_DIFF", "pdiff")
      exportVariable("NFT_DIFF_ARGS", "--line-numbers --expand-tabs=2")

      // Add environment variables to GITHUB_ENV to make them available to the next steps
      if (process.env.GITHUB_ENV) {
        await fs.appendFile(process.env.GITHUB_ENV, `NFT_DIFF=pdiff\n`)
        await fs.appendFile(
          process.env.GITHUB_ENV,
          `NFT_DIFF_ARGS=--line-numbers --expand-tabs=2\n`
        )
        debug("Added environment variables to GITHUB_ENV")
      } else {
        debug(
          "GITHUB_ENV not available, environment variables might not persist"
        )
      }
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
