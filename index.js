import fs from "fs-extra"
import os from "os"
import path from "path"
import {
  getInput,
  debug,
  setFailed,
  addPath,
  error,
  exportVariable
} from "@actions/core"
import { downloadTool, extractTar } from "@actions/tool-cache"
import { saveCache, restoreCache } from "@actions/cache"
import { exec } from "@actions/exec"

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
    }

    // Try to restore from cache
    const key = `nf-test-${version}-install-pdiff-${installPdiff}`
    const restoreKey = await restoreCache(paths, key)

    if (!restoreKey) {
      // Download and extract nf-test
      const url = `https://github.com/askimed/nf-test/releases/download/v${version}/nf-test-${version}.tar.gz`
      const pathToTarball = await downloadTool(url)
      const pathToCLI = await extractTar(pathToTarball)

      // Move files to final location
      await fs.move(path.resolve(pathToCLI, "nf-test"), paths[0])
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

export default setup

if (process.argv[1] === new URL(import.meta.url).pathname) {
  setup()
}
