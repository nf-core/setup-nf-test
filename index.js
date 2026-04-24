import fs from "fs-extra"
import os from "os"
import path from "path"
import readline from "readline"
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
import diff from "fast-diff"

const RED = "\x1b[91m",
  GREEN = "\x1b[92m"
const RED_HL = "\x1b[41;30m",
  GREEN_HL = "\x1b[42;30m",
  RESET = "\x1b[m"

async function runDiffHighlight() {
  const rl = readline.createInterface({
    input: process.stdin,
    crlfDelay: Infinity
  })
  let olds = [],
    news = []

  function flush() {
    if (olds.length === 1 && news.length === 1) {
      const oldText = olds[0].slice(1),
        newText = news[0].slice(1)
      const changes = diff(oldText, newText)
      let oldOut = RED + "-",
        newOut = GREEN + "+"
      for (const [op, text] of changes) {
        if (op === -1) oldOut += RED_HL + text + RED
        else if (op === 1) newOut += GREEN_HL + text + GREEN
        else {
          oldOut += text
          newOut += text
        }
      }
      process.stdout.write(oldOut + RESET + "\n")
      process.stdout.write(newOut + RESET + "\n")
    } else {
      olds.forEach(l => process.stdout.write(RED + l + RESET + "\n"))
      news.forEach(l => process.stdout.write(GREEN + l + RESET + "\n"))
    }
    olds = []
    news = []
  }

  rl.on("line", line => {
    if (line.startsWith("-") && !line.startsWith("---")) {
      if (news.length) flush()
      olds.push(line)
    } else if (line.startsWith("+") && !line.startsWith("+++")) {
      news.push(line)
    } else {
      flush()
      process.stdout.write(line + "\n")
    }
  })
  await new Promise(resolve =>
    rl.on("close", () => {
      flush()
      resolve()
    })
  )
}

async function setup() {
  try {
    const version = getInput("version")
    const installPdiff = getInput("install-pdiff") === "true"
    const installFastDiff = getInput("install-fast-diff") === "true"
    const nfTestDir = path.join(os.homedir(), ".nf-test")

    const paths = [
      path.join(nfTestDir, "nf-test"),
      path.join(nfTestDir, "nf-test.jar")
    ]

    if (installPdiff) {
      let pipCacheDir = ""
      try {
        await exec("python", ["-m", "pip", "cache", "dir"], {
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
      paths.push(path.join(nfTestDir, "pdiff"))
      paths.push(pipCacheDir)
    }

    const key = `nf-test-${version}-install-pdiff-${installPdiff}`
    const restoreKey = await restoreCache(paths, key)

    if (!restoreKey) {
      const nfTestUrl = `https://github.com/askimed/nf-test/releases/download/v${version}/nf-test-${version}.tar.gz`
      const pathToTarball = await downloadTool(nfTestUrl)
      const pathToCLI = await extractTar(pathToTarball)
      await fs.move(path.resolve(pathToCLI, "nf-test"), paths[0])
      await fs.move(path.join(pathToCLI, "nf-test.jar"), paths[1])

      await saveCache(paths, key)
      debug(`Cache saved with key: ${key}`)
    }

    addPath(nfTestDir)

    if (installPdiff) {
      await exec("python", ["-m", "pip", "install", "pdiff"])

      const pdiffWrapperPath = path.join(nfTestDir, "pdiff")
      await fs.writeFile(
        pdiffWrapperPath,
        `#!/bin/bash\npython -m pdiff "$@"\n`
      )
      await fs.chmod(pdiffWrapperPath, 0o755)
      debug(`Created pdiff wrapper at ${pdiffWrapperPath}`)

      exportVariable("NFT_DIFF", "pdiff")
      exportVariable("NFT_DIFF_ARGS", "--line-numbers --expand-tabs=2")
    }

    if (installFastDiff) {
      const wrapperPath = path.join(nfTestDir, "nft-diff")
      await fs.writeFile(
        wrapperPath,
        `#!/bin/bash\ndiff --unified "\${@: -2}" | node "${process.argv[1]}" --diff-highlight\n`
      )
      await fs.chmod(wrapperPath, 0o755)
      debug(`Created nft-diff wrapper at ${wrapperPath}`)

      exportVariable("NFT_DIFF", "nft-diff")
    }
  } catch (e) {
    setFailed(e)
  }
}

export default setup

if (process.argv.includes("--diff-highlight")) {
  runDiffHighlight()
} else if (process.argv[1] === new URL(import.meta.url).pathname) {
  setup()
}
