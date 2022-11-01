# Lucy Block Store

Experiment. Blocks are everywhere. Structural resilience, performance and high availability. Censorship resistant. Store content-addressable blocks redundantly, across technologies and providers. Providers compete on retrieval, fastest wins.

## API

```ts
put: (block: { cid: any, bytes: Uint8Array }) => Promise<void>
get: (cid: any) => Promise<Uint8Array>
```

## Usage

```ts
import { blockStore as azureStore } from "@dstanesc/az-block-store"
import { blockStore as ipfsStore } from "@dstanesc/ipfs-block-store"
import { blockStore as lucyStore } from "@dstanesc/lucy-block-store"

const ipfsClient = ...
const azClient = ...
const s1 = azureStore({ containerClient: azClient })
const s2 = ipfsStore({ ipfs: ipfsClient })
const s3 = ...
const { put, get } = blockStore({ acks: 'all' }, s1, s2, s3)
```

## Build

```sh
npm run clean
npm install
npm run build
npm run test
```

## Licenses

Licensed under either [Apache 2.0](http://opensource.org/licenses/MIT) or [MIT](http://opensource.org/licenses/MIT) at your option.
