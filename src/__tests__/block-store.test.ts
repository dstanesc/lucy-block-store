import { DefaultAzureCredential } from "@azure/identity"
import { BlobServiceClient, ContainerClient } from "@azure/storage-blob"
import * as dotenv from "dotenv"
import { chunkyStore } from "@dstanesc/store-chunky-bytes"
import { codec, chunkerFactory, byteArray, retrieve } from "./util"
import { blockStore } from "../index"
import { v1 as uuid } from "uuid"
import * as assert from "assert"

import { blockStore as awsStore } from "@dstanesc/s3-block-store"
import { blockStore as azureStore } from "@dstanesc/az-block-store"
import { blockStore as ipfsStore } from "@dstanesc/ipfs-block-store"

import { create as ipfsApi } from 'ipfs-http-client'
import AWS, { S3 } from 'aws-sdk'

const RECORD_COUNT = 100
const RECORD_SIZE_BYTES = 36

let awsS3: S3
let bucket: string
let containerClient: ContainerClient
let ipfs

beforeEach(() => {
  //ipfs
  ipfs = ipfsApi({ url: process.env.IPFS_API })
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

  const awsRegion = process.env.AWS_REGION
  bucket = process.env.AWS_BUCKET_NAME
  AWS.config.update({ region: awsRegion });
  awsS3 = new AWS.S3()

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
  // store 3
  const s3 = awsStore({ /*cache,*/ s3: awsS3, bucket })
  // await all stores for put acks
  const lucy_all = blockStore({ acks: 'all' }, s1, s2, s3)
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
  const startTime = new Date().getTime();
  const retrieved = await retrieve(read, 0, 10, RECORD_SIZE_BYTES, {
    root,
    decode,
    get,
  });
  const endTime = new Date().getTime();
  console.log(retrieved);
  console.log(`Time ${endTime - startTime}`);
  assert.equal(retrieved.length, 10);
  assert.deepEqual(records.slice(0, 10), retrieved);
}