import { DefaultAzureCredential } from "@azure/identity"
import { BlobServiceClient, ContainerClient } from "@azure/storage-blob"
import * as dotenv from "dotenv"
import { chunkyStore } from "@dstanesc/store-chunky-bytes"
import { codec, chunkerFactory, byteArray, retrieve } from "./util"
import { blockStore } from "../index"
import { v1 as uuid } from "uuid"
import * as assert from "assert"

import { blockStore as azureStore } from "@dstanesc/az-block-store"
import { blockStore as ipfsStore } from "@dstanesc/ipfs-block-store"

import { create as ipfsApi } from 'ipfs-http-client'

const RECORD_COUNT = 100
const RECORD_SIZE_BYTES = 36

let containerClient: ContainerClient
let ipfs

beforeEach(() => {
  //ipfs
  ipfs = ipfsApi({ url: '/ip4/192.168.1.231/tcp/5001' })
  //az
  dotenv.config();
  const accountName = process.env.AZURE_STORAGE_ACCOUNT_NAME
  const blobServiceClient: BlobServiceClient = new BlobServiceClient(
    `https://${accountName}.blob.core.windows.net`,
    new DefaultAzureCredential()
  )
  const randomContainerName = `test-${uuid()}`
  containerClient = blobServiceClient.getContainerClient(randomContainerName)
  const createPromise = containerClient.create()
  return Promise.all([createPromise])
})

// dispose
afterEach(() => {
  const deletePromise = containerClient.delete()
  return Promise.all([deletePromise])
});

test("demo lucy cas usage in the context of @dstanesc/store-chunky-bytes", async () => {
  // store 1
  const s1 = azureStore({ /*cache,*/ containerClient })
  // store 2
  const s2 = ipfsStore({ /*cache,*/ ipfs })
  // await all stores for put acks
  const lucy_all = blockStore({ acks: 'all' }, s1, s2)
  //check w/ store-chunky-bytes
  await check(lucy_all)
});

async function check({ get, put }) {
  // chunking config
  const { encode, decode } = codec();
  const { create, read } = chunkyStore();
  const { fastcdc } = chunkerFactory({ fastAvgSize: 512 });

  // demo data
  const { buf, records } = byteArray(RECORD_COUNT, RECORD_SIZE_BYTES);

  // chunk the data (content defined)
  const { root, blocks } = await create({ buf, chunk: fastcdc, encode });

  // store the chunks everywhere
  for (const block of blocks) {
    console.log(`Save block: ${block.cid} len: ${block.bytes.byteLength}`);
    await put(block);
  }

  // read back a slice of data from the az-block-store
  const retrieved = await retrieve(read, 0, 10, RECORD_SIZE_BYTES, {
    root,
    decode,
    get,
  });
  console.log(retrieved);

  assert.equal(retrieved.length, 10);
  assert.deepEqual(records.slice(0, 10), retrieved);
}