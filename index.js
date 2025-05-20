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
    const nfTestDir = path.join(os.homedir(), ".nf-test")

    // Get pip's cache directory
    let pipCacheDir = ""
    try {
      const output = await exec("python", ["-m", "pip", "cache", "dir"], {
        silent: true,
        listeners: {
          stdout: data => {
            pipCacheDir += data.toString()
          }
        }
      })
      pipCacheDir = pipCacheDir.trim()
      debug(`Pip cache directory: ${pipCacheDir}`)
    } catch (err) {
      error(`Failed to get pip cache directory: ${err}`)
      // Default to a common location if we can't get it from pip
      pipCacheDir = path.join(os.homedir(), ".cache", "pip")
    }

    const paths = [
      path.join(nfTestDir, "nf-test"),
      path.join(nfTestDir, "nf-test.jar")
    ]

    if (installPdiff) {
      paths.push(path.join(nfTestDir, "pdiff"))
      paths.push(pipCacheDir)
      // Set environment variables
      exportVariable("NFT_DIFF", "pdiff")
      exportVariable("NFT_DIFF_ARGS", "--line-numbers --expand-tabs=2")

      // Add environment variables to GITHUB_ENV to make them available to the next steps
      if (process.env.GITHUB_ENV) {
        fs.appendFileSync(process.env.GITHUB_ENV, `NFT_DIFF=pdiff\n`)
        fs.appendFileSync(
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

    const key = "nf-test-" + version + "-install-pdiff-" + installPdiff
    const restoreKey = await restoreCache(paths, key)

    if (restoreKey) {
      debug(`Cache restored from key: ${restoreKey}`)
      addPath(nfTestDir)

      if (installPdiff) {
        debug("Installing pdiff package")
        await exec("python", ["-m", "pip", "install", "pdiff"])
      }
    } else {
      debug(`no version of nf-test matching "${version}" is installed`)
      const download = getDownloadObject(version)
      const pathToTarball = await downloadTool(download.url)
      const extract = download.url.endsWith(".zip") ? extractZip : extractTar
      const pathToCLI = await extract(pathToTarball)
      debug(`Path to CLI: ${pathToCLI}`)
      debug(`Bin path: ${download.binPath}`)
      const binFilePath = path.resolve(pathToCLI, download.binPath)

      debug("Make ~/.nf-test even if it already exists")
      if (await fileExists(nfTestDir)) {
        debug("Directory ~/.nf-test already exists")
        await fs.rm(nfTestDir, {
          recursive: true,
          force: true
        })
      }
      await fs.mkdir(nfTestDir)

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
      addPath(nfTestDir)

      if (installPdiff) {
        debug("Installing pdiff and creating wrapper")
        await exec("python", ["-m", "pip", "install", "pdiff"])

        // Create a simple wrapper script in the same directory as nf-test
        const pdiffWrapperPath = path.join(nfTestDir, "pdiff")
        await fs.writeFile(
          pdiffWrapperPath,
          `#!/bin/bash\npython -m pdiff "$@"\n`
        )
        await fs.chmod(pdiffWrapperPath, 0o755)
        debug(`Created pdiff wrapper at ${pdiffWrapperPath}`)
      }

      await saveCache(paths, key)
      debug(`Cache saved with key: ${key}`)
    }

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
