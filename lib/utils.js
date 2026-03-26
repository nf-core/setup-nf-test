import os from "os"

export function getDownloadObject(version) {
  const platform = os.platform()
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
