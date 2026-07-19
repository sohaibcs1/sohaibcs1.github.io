# Muhammad Sohaib — Portfolio

Source code for [sohaibcs1.github.io](https://sohaibcs1.github.io/). The project contains an Angular portfolio and a Cloudflare Worker/D1 visitor API.

## Quick start

Requirements: Node.js and npm.

```bash
git clone https://github.com/sohaibcs1/portfolio.git
cd portfolio
npm install --legacy-peer-deps
npm start
```

Open [http://localhost:4200](http://localhost:4200). The portfolio uses the deployed visitor API, so the map works without running Cloudflare locally.

Only one root `node_modules` directory is used. Do not run `npm install` inside `visitor-api`.

## Common commands

```bash
npm start              # Angular site only
npm run dev            # Angular site and local Worker tools
npm run build:pages    # Production build in docs/ with SPA fallback
npm test               # Angular tests
npm run worker:dev     # Local Worker only
npm run worker:deploy  # Deploy Worker to Cloudflare
```

## Project structure

```text
src/                 Angular application source
visitor-api/src/     Cloudflare Worker source
visitor-api/schema.sql
visitor-api/wrangler.toml
docs/                Generated GitHub Pages build (not source)
```

## Visitor privacy

Cloudflare estimates country, region, city, latitude, and longitude from network information. Locations are approximate. The Worker never stores or publicly displays raw IP addresses; it stores a daily salted one-way hash for visit counting.

Before the first Worker deployment, configure the hash salt:

```bash
npx wrangler secret put HASH_SALT --config visitor-api/wrangler.toml
```

The D1 database binding is defined in `visitor-api/wrangler.toml`. Local D1 data and Wrangler temporary files are ignored by Git.

## Deployment

Build the site:

```bash
npm run build:pages
```

The deployable files are generated in `docs/`. The live Worker can be updated with:

```bash
npm run worker:deploy
```

Never commit `node_modules`, `.wrangler`, secrets, or local database files.
