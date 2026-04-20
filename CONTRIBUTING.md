# Contributing to setup-nf-test

Thank you for considering contributing to the `setup-nf-test` GitHub Action!
Here are the steps to publish a new release.

## Publishing a New Release

1. **Ensure All Changes are Committed:**
   - Make sure all your changes are committed and pushed to the `main` branch.

2. **Update Version:**
   - Update the version number in the `package.json` file to reflect the new
     release version and commit the change.

3. **Run the Release Script:**
   - From the repository root, run:

     ```bash
     script/release
     ```

   - The script will prompt you for the new version tag (e.g., `v1.3.0`),
     confirm the `package.json` version, create an annotated semver tag, update
     the major version tag (e.g., `v1`), and push everything to remote.
   - On a major version bump it will also create and push a `releases/vX` branch.

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
