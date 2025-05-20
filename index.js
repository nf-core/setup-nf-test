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
      pipCacheDir = path.join(os.homedir(), ".cache", "pip")
    }

    // Setup paths to cache
    const paths = [
      path.join(nfTestDir, "nf-test"),
      path.join(nfTestDir, "nf-test.jar")
    ]

    if (installPdiff) {
      paths.push(path.join(nfTestDir, "pdiff"))
      paths.push(pipCacheDir)

      // Set pdiff environment variables
      exportVariable("NFT_DIFF", "pdiff")
      exportVariable("NFT_DIFF_ARGS", "--line-numbers --expand-tabs=2")
      if (process.env.GITHUB_ENV) {
        fs.appendFileSync(process.env.GITHUB_ENV, `NFT_DIFF=pdiff\n`)
        fs.appendFileSync(
          process.env.GITHUB_ENV,
          `NFT_DIFF_ARGS=--line-numbers --expand-tabs=2\n`
        )
        debug("Added environment variables to GITHUB_ENV")
      }
    }

    // Try to restore from cache
    const key = `nf-test-${version}-install-pdiff-${installPdiff}`
    const restoreKey = await restoreCache(paths, key)

    // Setup nf-test directory
    if (await fileExists(nfTestDir)) {
      await fs.rm(nfTestDir, { recursive: true, force: true })
    }
    await fs.mkdir(nfTestDir)

    if (!restoreKey) {
      // Download and extract nf-test
      const download = getDownloadObject(version)
      const pathToTarball = await downloadTool(download.url)
      const extract = download.url.endsWith(".zip") ? extractZip : extractTar
      const pathToCLI = await extract(pathToTarball)

      // Move files to final location
      await fs.move(path.resolve(pathToCLI, download.binPath), paths[0])
      await fs.move(path.join(pathToCLI, "nf-test.jar"), paths[1])

      // Save to cache
      await saveCache(paths, key)
      debug(`Cache saved with key: ${key}`)
    }

    // Add to PATH
    addPath(nfTestDir)

    // Install pdiff if requested
    if (installPdiff) {
      await exec("python", ["-m", "pip", "install", "pdiff"])

      // Create pdiff wrapper script
      const pdiffWrapperPath = path.join(nfTestDir, "pdiff")
      await fs.writeFile(
        pdiffWrapperPath,
        `#!/bin/bash\npython -m pdiff "$@"\n`
      )
      await fs.chmod(pdiffWrapperPath, 0o755)
      debug(`Created pdiff wrapper at ${pdiffWrapperPath}`)
    }
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
