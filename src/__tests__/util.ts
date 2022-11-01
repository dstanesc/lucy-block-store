import { CID } from 'multiformats/cid'
import * as raw from 'multiformats/codecs/raw'
import { sha256 } from 'multiformats/hashes/sha2'
import { v4 as uuidV4, parse as uuidParse, stringify as uuidStringify } from 'uuid'
import { compute_chunks } from "@dstanesc/wasm-chunking-fastcdc-node"

const codec = () => {
    const encode = async (bytes: Uint8Array): Promise<any> => {
        const chunkHash = await sha256.digest(bytes)
        const chunkCid = CID.create(1, raw.code, chunkHash)
        return chunkCid
    }
    const decode = (cidBytes: Uint8Array): any => {
        return CID.decode(cidBytes)
    }
    return { encode, decode }
}

const chunkerFactory = ({ fastAvgSize }: { fastAvgSize?: number }) => {
    const FASTCDC_CHUNK_AVG_SIZE_DEFAULT = 32768
    const fastcdc = (buf: Uint8Array) => {
        if (fastAvgSize === undefined)
            fastAvgSize = FASTCDC_CHUNK_AVG_SIZE_DEFAULT
        if (!Number.isInteger(fastAvgSize) || fastAvgSize <= 0) throw new Error('avgSize arg should be a positive integer')
        const minSize = Math.floor(fastAvgSize / 2)
        const maxSize = fastAvgSize * 2
        return compute_chunks(buf, minSize, fastAvgSize, maxSize)
    }
    return { fastcdc }
}

function byteArray(recordCount: number, recordSizeBytes: number): { buf: Uint8Array, records: any[] } {
    const buf = new Uint8Array(recordCount * recordSizeBytes);
    let cursor = 0;
    const records = [];
    for (let index = 0; index < recordCount; index++) {
        const demoRecord = uuidV4();
        records.push(demoRecord);
        const bytes = uuidParse(demoRecord)
        buf.set(bytes, cursor * recordSizeBytes);
        cursor++;
    }
    return { buf, records }
}

async function retrieve(read: any, startOffset: number, recordCount: number, recordSize: number, { root, decode, get }): Promise<any[]> {
    const completeBuffer = await read(startOffset, recordSize * recordCount, { root, decode, get })
    let cursor = 0
    const records = []
    for (let index = 0; index < recordCount; index++) {
        const recordBytes = completeBuffer.subarray(cursor * recordSize, cursor * recordSize + recordSize)
        const recordFound = uuidStringify(recordBytes)
        records.push(recordFound)
        cursor++
    }
    return records
}

export { codec, chunkerFactory, byteArray, retrieve }