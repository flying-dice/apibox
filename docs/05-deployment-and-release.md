# Deployment and release

## GitHub Pages

Run **APIBox: Deploy Static Site to GitHub Pages** from VS Code. The command asks for a
specification path or glob and creates `.github/workflows/apibox-pages.yml`. Commit and
push that file, then select **GitHub Actions** as the repository's Pages source.

The generated workflow builds documentation through the public `bunx
github:flying-dice/apibox` command, uploads the static site as a Pages artifact and deploys
it through GitHub's Pages environment. It does not modify local branches or handle GitHub
credentials.

## Release artifacts

The GitHub-source install must work without lifecycle scripts, so the repository keeps two
generated paths under version control:

- `packages/cli/dist/` contains the CLI bundle, including the workspace core.
- `packages/cli/assets/viewer/` contains the prebuilt browser viewer.

`.github/workflows/release.yml` refreshes and commits both paths on the default branch.
Third-party parser and glob packages remain explicit root runtime dependencies.

Before release, run:

```sh
bun run verify:package
```

This builds an archive without lifecycle scripts, installs it into an isolated temporary
project, invokes its `apibox` executable and validates the generated site. After the first
push, also run the public GitHub shorthand once to confirm GitHub transport itself:

```sh
bunx github:flying-dice/apibox build ./spec.yaml
```
