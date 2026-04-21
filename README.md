# :rocket: `setup-nf-test`

> An action that installs and caches nf-test

## About

Sets up the nf-test cli, [`nf-test`](https://github.com/askimed/nf-test), on GitHub's hosted Actions runners.

This action is only tested on `ubuntu-latest` GitHub Actions runners, and will install and expose a specified version of the `nf-test` CLI on the runner environment.

## Usage

Setup the `nf-test`:

```yaml
steps:
  - uses: nf-core/setup-nf-test@v1
    with:
      install-pdiff: true
```

A specific version of `nf-test`:

```yaml
steps:
  - uses: nf-core/setup-nf-test@v1
    with:
      version: 0.9.2
      install-pdiff: true
```

With character-level diff highlighting:

```yaml
steps:
  - uses: nf-core/setup-nf-test@v1
    with:
      install-fast-diff: true
```

## Inputs

The actions supports the following inputs:

- `version`: The version of `nf-test` to install, defaulting to `0.9.3`
- `install-pdiff`: A boolean to install the `pdiff` Python module and set environment variables `NFT_DIFF` and `NFT_DIFF_ARGS`
- `install-fast-diff`: A boolean to enable character-level diff highlighting using `fast-diff`, highlighting characters that changed within each line (e.g. just the differing SHA hash).

## License

[MIT](LICENSE)
