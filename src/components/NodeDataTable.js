import React, { useState, useEffect, useRef } from 'react';
import ListView from './NodesListView';

async function fetchPeers(ip = null) {
    try {
        const url = "https://proximadlt.mooo.com/api/proxy/api/v1/peers_info";
        const headers = ip ? { "X-Target-URL": `http://${ip}` } : {};
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 3000); // Set timeout for fast failures

        const response = await fetch(url, { headers, signal: controller.signal });
        clearTimeout(timeout);

        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        const data = await response.json();
        return data.peers.map(peer => peer.multiAddresses.map(extractIPAndPort)).flat();
    } catch (error) {
        console.error(`Failed to fetch peers from ${ip || 'root'}:`, error);
        return [];
    }
}

function extractIPAndPort(input) {
    const regex = /\/ip4\/([0-9.]+)\/(tcp|udp)\/400([0-9])/;
    const match = input.match(regex);
    return match ? `${match[1]}:800${match[3]}` : null;
}

// Wrapper function to add a timeout to fetch requests
async function fetchWithTimeout(url, headers, timeoutMs = 3000) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);

    try {
        const response = await fetch(url, { headers, signal: controller.signal });
        clearTimeout(timeout);
        return response.ok ? await response.json() : null;
    } catch {
        return null;
    }
}

async function fetchNodeDetails(ip) {
    try {
        const headers = { "X-Target-URL": `http://${ip}` };

        const [nodeInfo, syncInfo] = await Promise.all([
            fetchWithTimeout("https://proximadlt.mooo.com/api/proxy/api/v1/node_info", headers),
            fetchWithTimeout("https://proximadlt.mooo.com/api/proxy/api/v1/sync_info", headers)
        ]);

        return {
            ip,
            id: nodeInfo ? '...' + nodeInfo.id.substring(20) : '???',
            numPeers: nodeInfo ? (nodeInfo.num_static_peers + nodeInfo.num_dynamic_alive).toString() : '???',
            version: nodeInfo ? nodeInfo.version : '???',
            synced: syncInfo ? (syncInfo.synced ? "Yes" : "No") : '???',
            slotHC: syncInfo?.lrb_slot && syncInfo?.current_slot
                ? `${syncInfo.lrb_slot} / ${syncInfo.current_slot}`
                : '???',
            sequId: syncInfo?.per_sequencer ? Object.keys(syncInfo.per_sequencer)[0] || '???' : '???'
        };
    } catch (error) {
        console.error(`Error fetching node details for ${ip}:`, error);
        return { ip, id: '???', numPeers: '???', version: '???', synced: '???', slotHC: '???', sequId: '???' };
    }
}

// Sort function: Move unknown IDs to the bottom and sort known IDs alphabetically
function sortNodes(nodes) {
    return nodes.sort((a, b) => {
        if (a.id === '???') return 1;  // Move unknown IDs to the bottom
        if (b.id === '???') return -1; // Keep known IDs at the top
        return a.id.localeCompare(b.id); // Alphabetical order
    });
}

function NodeDataTable() {
    const [nodes, setNodes] = useState([]);
    const nodesMapRef = useRef(new Map());

    useEffect(() => {
        async function updateNodes() {
            let foundNodes = await fetchPeers();
            foundNodes = [...new Set(foundNodes)].slice(0, 50); // Limit initial nodes for performance

            for (const node of foundNodes) {
                const moreNodes = await fetchPeers(node);
                foundNodes = [...new Set([...foundNodes, ...moreNodes])];
            }

            const nodeDetails = await Promise.all(foundNodes.map(fetchNodeDetails));

            const newNodesMap = new Map(nodesMapRef.current);

            for (const node of nodeDetails) {
                newNodesMap.set(node.ip, node);
            }

            nodesMapRef.current = newNodesMap;
            setNodes(sortNodes([...newNodesMap.values()]));
        }

        updateNodes();
        const intervalId = setInterval(updateNodes, 5000);
        return () => clearInterval(intervalId);
    }, []);

    return <ListView data={nodes} />;
}

export default NodeDataTable;
