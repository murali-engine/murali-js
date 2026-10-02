# Murali documentation site

This Docusaurus workspace hosts the Murali JavaScript landing page and documentation.

| Surface | Public path | Source | Version command |
| --- | --- | --- | --- |
| Landing page | `/` | `src/pages/` | — |
| JavaScript docs | `/docs/` | `docs/` | `docs:version` |

The site is exclusively for Murali JavaScript. The navbar and landing page link to the
[Rust Murali documentation](https://github.com/murali-engine/murali-rs/tree/main/docs) for specialised
projects that need the native engine.

Run the site from the repository root:

```bash
npm run docs:start
npm run docs:build
npm run docs:serve
```

## Deployment

The documentation is deployed to `https://muraliengine.com` by
`.github/workflows/documentation.yml` whenever documentation or its workflow changes on `main`.
The workflow can also be started manually from GitHub Actions. It builds the site with the root
workspace lockfile and deploys `docs/build` through GitHub Pages.

`static/CNAME` places `muraliengine.com` in the generated Pages artifact. Before enabling this
repository's deployment, remove the same custom domain from the former Rust documentation Pages
site and change this repository's Pages source to **GitHub Actions**. GitHub permits a custom domain
to be attached to only one Pages site at a time, so coordinate those changes closely.

## Creating documentation versions

Run these commands from the repository root.

Create a JavaScript documentation snapshot:

```bash
npm --workspace @murali-js/docs run docusaurus -- docs:version <version>
```

For example:

```bash
npm --workspace @murali-js/docs run docusaurus -- docs:version 0.0.2
```

Current JavaScript documentation is served at `/docs/`. Version snapshots remain available from
the version selector—for example, the test snapshot is served at `/docs/0.0.1/`.
