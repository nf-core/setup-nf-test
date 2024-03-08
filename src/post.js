const fs = require("fs").promises
const os = require("os")
const path = require("path")
const { setFailed } = require("@actions/core")

async function cleanup() {
  try {
    const dirPath = path.join(os.homedir(), ".nf-test")
    await fs.rmdir(dirPath, { recursive: true })
    console.log(`Directory ${dirPath} has been removed`)
  } catch (error) {
    setFailed(`Failed to remove directory: ${error}`)
  }
}

module.exports = cleanup

if (require.main === module) {
  cleanup()
}
