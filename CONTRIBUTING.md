# Contributing to setup-nf-test

Thank you for considering contributing to the `setup-nf-test` GitHub Action!
Here are the steps to publish a new release.

## Publishing a New Release

1. **Ensure All Changes are Committed:**

   - Make sure all your changes are committed and pushed to the `master` branch.

2. **Update Version:**

   - Update the version number in the `package.json` file to reflect the new
     release version.

3. **Create a New Release:**

   - Go to the [Releases](https://github.com/nf-core/setup-nf-test/releases)
     page of the repository.
   - Click on "Draft a new release".
   - Set the tag version to the new version number (e.g., `v0.2.0`).
   - Set the release title to the same version number.
   - Add a description of the changes in this release.

4. **Trigger the Publish Workflow:**

   - The `.github/workflows/publish.yml` workflow will automatically run when a
     release is published. This workflow builds the project and tags the release.

5. **Verify the Release:**
   - Ensure that the release is correctly published and the new version is
     available for use.

## Additional Notes

- Ensure that all dependencies are up to date and that the project builds
  successfully before creating a release.
- If you encounter any issues during the release process, check the logs of the
  publish workflow for more details.

Thank you for contributing!
