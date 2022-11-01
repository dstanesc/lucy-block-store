interface BlockStore {
    put: (block: { cid: any, bytes: Uint8Array }) => Promise<void>
    get: (cid: any) => Promise<Uint8Array>
}

const blockStore = ({ acks }: { acks: 'any' | 'all' }, ...stores: BlockStore[]) => {

    const put = async (block: { cid: any, bytes: Uint8Array }): Promise<void> => {
        const results = []
        for (const store of stores) {
            results.push(store.put(block))
        }
        switch (acks) {
            case 'all':
                await Promise.all(results)
                break
            case 'any':
                await Promise.any(results)
                break
            default: throw new Error(`Unknown acks setting ${acks}`)
        }
    }

    const get = async (cid: any): Promise<Uint8Array> => {
        const results = []
        for (const store of stores) {
            results.push(store.get(cid))
        }
        return Promise.any(results)
    }

    return { get, put }
}

export { blockStore }