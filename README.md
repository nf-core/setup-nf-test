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
```

A specific version of `nf-test`:

```yaml
steps:
  - uses: nf-core/setup-nf-test@v1
    with:
      version: 0.8.0
```

## Inputs

The actions supports the following inputs:

- `version`: The version of `nf-test` to install, defaulting to `0.8.4`

## License

[MIT](LICENSE).t
