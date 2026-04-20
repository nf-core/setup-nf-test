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

async function getDeltaVersion() {
  const response = await fetch(
    "https://api.github.com/repos/dandavison/delta/releases/latest",
    { headers: { Accept: "application/vnd.github+json" } }
  )
  if (!response.ok)
    throw new Error(`Failed to fetch delta release: ${response.status}`)
  const { tag_name } = await response.json()
  return tag_name
}

function getDeltaAsset(version) {
  const archMap = { x64: "x86_64", arm64: "aarch64" }
  const platformMap = { linux: "unknown-linux-gnu", darwin: "apple-darwin" }
  const archStr = archMap[os.arch()] ?? os.arch()
  const platformStr = platformMap[os.platform()]
  if (!platformStr) throw new Error(`Unsupported platform: ${os.platform()}`)
  const name = `delta-${version}-${archStr}-${platformStr}`
  return {
    url: `https://github.com/dandavison/delta/releases/download/${version}/${name}.tar.gz`,
    binary: `${name}/delta`
  }
}

async function setup() {
  try {
    const version = getInput("version")
    const installPdiff = getInput("install-pdiff") === "true"
    const installDelta = getInput("install-delta") === "true"
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

    exportVariable("NFT_DIFF", "diff")
    exportVariable("NFT_DIFF_ARGS", "--unified --color=always")

    let deltaVersion = ""
    if (installDelta) {
      deltaVersion = await getDeltaVersion()
      paths.push(path.join(nfTestDir, "delta"))
      exportVariable("NFT_DIFF", "delta")
      exportVariable("NFT_DIFF_ARGS", "--no-gitconfig --diff-highlight")
    }

    if (installPdiff) {
      paths.push(path.join(nfTestDir, "pdiff"))
      paths.push(pipCacheDir)
      exportVariable("NFT_DIFF", "pdiff")
      exportVariable("NFT_DIFF_ARGS", "--line-numbers --expand-tabs=2")
    }

    const key = `nf-test-${version}-install-pdiff-${installPdiff}-install-delta-${deltaVersion}`
    const restoreKey = await restoreCache(paths, key)

    if (!restoreKey) {
      const nfTestUrl = `https://github.com/askimed/nf-test/releases/download/v${version}/nf-test-${version}.tar.gz`
      const pathToTarball = await downloadTool(nfTestUrl)
      const pathToCLI = await extractTar(pathToTarball)
      await fs.move(path.resolve(pathToCLI, "nf-test"), paths[0])
      await fs.move(path.join(pathToCLI, "nf-test.jar"), paths[1])

      if (installDelta) {
        const { url, binary } = getDeltaAsset(deltaVersion)
        const tarball = await downloadTool(url)
        const extracted = await extractTar(tarball)
        await fs.move(
          path.join(extracted, binary),
          path.join(nfTestDir, "delta")
        )
        await fs.chmod(path.join(nfTestDir, "delta"), 0o755)
        debug(`Installed delta ${deltaVersion}`)
      }

      await saveCache(paths, key)
      debug(`Cache saved with key: ${key}`)
    }

    // Add to PATH
    addPath(nfTestDir)

    // Install pdiff if requested (not cached — pip handles its own caching)
    if (installPdiff) {
      await exec("python", ["-m", "pip", "install", "pdiff"])

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
