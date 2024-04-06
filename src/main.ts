import * as core from '@actions/core'

import unzipper from 'unzipper'
import { Octokit } from '@octokit/rest'
import stream from 'stream'
import { finished } from 'stream/promises'
import tar from 'tar'
import fs from 'fs'
import fsPromises from 'fs/promises'
import util from 'util'
import { exec } from 'child_process'
const execPromise = util.promisify(exec)

const binaryName = 'promptpal'

const token = core.getInput('token')
const command = core.getInput('command')

const octokit = (() => {
  if (token) {
    return new Octokit({ auth: token })
  } else {
    return new Octokit()
  }
})()

/**
 * The main function for the action.
 * @returns {Promise<void>} Resolves when the action is complete.
 */
export async function run(): Promise<void> {
  try {
    // Debug logs are only output if the `ACTIONS_STEP_DEBUG` secret is true
    core.debug(`command: ${command}`)

    const releasesResp = await octokit.repos.listReleases({
      owner: 'PromptPal',
      repo: 'cli'
    })

    const releases = releasesResp.data
      .filter(x => !x.prerelease)
      .filter(x => !x.draft)

    if (releases.length === 0) {
      core.setFailed('PromptPal: No releases found')
      return
    }

    const latestRelease = releases[0]

    core.info(`using PromptPal Latest release: ${latestRelease.tag_name}`)

    let platform = process.platform

    if (!['darwin', 'linux'].includes(platform)) {
      core.warning(`PromptPal: Unsupported platform: ${platform}`)
      platform = 'linux'
    }

    const cmdAsset = latestRelease.assets.find(
      x => x.name.includes('cli_') && x.name.toLowerCase().includes(platform)
    )

    if (!cmdAsset) {
      core.setFailed('PromptPal: No asset found')
      return
    }

    core.debug(`found asset: ${cmdAsset}`)

    const downloadedFileStream = fs.createWriteStream(cmdAsset.name)
    const { body: cmdAssetBody } = await fetch(cmdAsset.browser_download_url)

    await finished(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      stream.Readable.fromWeb(cmdAssetBody as any).pipe(downloadedFileStream)
    )

    const isZip = cmdAsset.content_type.includes('application/zip')
    core.debug(`${cmdAsset.name}: ${isZip}`)

    if (isZip) {
      const zip = fs
        .createReadStream(cmdAsset.name)
        .pipe(unzipper.Parse({ forceStream: true }))
      for await (const entry of zip) {
        const fileName = entry.path
        if (fileName === binaryName) {
          entry.pipe(fs.createWriteStream('./promptpal'))
        } else {
          entry.autodrain()
        }
      }
    } else {
      await tar.x({
        file: cmdAsset.name,
        filter(path) {
          return path === binaryName
        }
      })
    }

    await fsPromises.rename('./promptpal', './pp')
    await fsPromises.chmod('./pp', '755')

    const val = await execPromise(`./${command}`)

    core.info(`\n${val.stdout}`)

    await fsPromises.unlink(cmdAsset.name)

    // Set outputs for other workflow steps to use
    // core.setOutput('time', new Date().toTimeString())
  } catch (error) {
    // Fail the workflow run if an error occurs
    if (error instanceof Error) core.setFailed(error.message)
  }
}
