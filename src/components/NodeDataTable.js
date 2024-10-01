import React, { useState, useEffect } from 'react';
import ListView from './NodesListView';
import config from './../config';  // Import the configuration

function registerAddress(array, stringToAdd) {
    if (stringToAdd.length === 0 || stringToAdd.includes('127.0.0.1')) {
        return array;
    }

    if (!array.includes(stringToAdd)) {
        array.push(stringToAdd);
    }
    return array;
}

function extractIPAndPort(input) {
    // Regular expression to capture the IP address and port
    const regex = /\/ip4\/([0-9.]+)\/tcp\/400([0-9])/;
    const matches = input.match(regex);
    // /ip4/113.30.191.219/udp/4001/quic-v1
    const regexQuic = /\/ip4\/([0-9.]+)\/udp\/400([0-9])\/quic-v1/;
    const matchesQuic = input.match(regexQuic);
  
    // Check if the regex found a match
    if (matches || matchesQuic) {
        if (matches) {
            const ip = matches[1];
            const port = matches[2];
            return `${ip}:800${port}`;  // Returning as "ip:port"
        } else {
            const ip = matchesQuic[1];
            const port = matchesQuic[2];
            return `${ip}:800${port}`;  // Returning as "ip:port"
        }
    } else {
      throw new Error("Invalid format");
    }
}

async function getNodeList(ip, nodeList) {
    try {
        const response = await fetch(`http://${ip}/peers_info`);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json(); // Ensure you're parsing the JSON response

        console.log('Received data:', data);

        // Update the nodeData state with the new data
        data.peers.forEach(peer => {
            peer.multiAddresses.forEach(address => {
                registerAddress(nodeList, extractIPAndPort(address));
                console.log(`  - ${address}`);
            });
        });

        return nodeList; // Return the updated nodeList after processing
    } catch (error) {
        console.error('Fetch error:', error);
        return nodeList; // Return the original nodeList in case of error
    }
}

function NodeDataTable() {
    const [nodeData, setNodeData] = useState([]);
    const unkownVal = '???';

    useEffect(() => {

        const intervalId = setInterval(() => {
            let nodeList = [config.baseUrl];
            getNodeList(config.baseUrl, nodeList).then(updatedList => {
                updatedList.forEach((ip) => {
                    fetchNodeInfo(ip);
                    fetchSyncInfo(ip);
                });
            });
        }, 5000);

        return () => clearInterval(intervalId);
    }, []); // Empty dependency array means this effect runs only once on mount

    const fetchNodeInfo = (ip) => {
        fetch(`http://${ip}/node_info`)
            .then((response) => {
                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }
                return response.json();
            })
            .then((data) => {
                const newData = {
                    ip,
                    id: '...' + data.id.substring(20, data.id.length),
                    numPeers: (data.num_static_peers + data.num_dynamic_alive).toString(),
                    synced: true,
                    version: data.version,
                };
                updateNodeData(newData);
            })
            .catch((error) => {
                console.error('Fetch error:', error);
                updateNodeData({
                    ip,
                    id: unkownVal,
                    numPeers: unkownVal,
                    synced: false,
                    version: unkownVal,
                });
            });
    };

    const fetchSyncInfo = (ip) => {
        fetch(`http://${ip}/sync_info`)
            .then((response) => {
                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }
                return response.json();
            })
            .then((data) => {
                const updatedData = {
                    ip,
                    synced: data.synced,
                    slotHC: unkownVal,
                };
    
                if (data.per_sequencer) {
                    // Check if per_sequencer is an array
                    if (Array.isArray(data.per_sequencer)) {
                        data.per_sequencer.forEach((value, key) => {
                            updatedData.sequId = key;
                            updatedData.slotHC = `${value.latest_healthy_slot.string()}/${value.latest_committed_slot.string()}`;
                        });
                    } else if (typeof data.per_sequencer === 'object') {
                        // If it's an object, loop through its keys
                        for (const [key, value] of Object.entries(data.per_sequencer)) {
                            updatedData.sequId = key;
                            updatedData.slotHC = `${value.latest_healthy_slot.toString()}/${value.latest_committed_slot.toString()}`;
                        }
                    } else {
                        console.error('Unexpected structure for per_sequencer:', data.per_sequencer);
                    }
                }
    
                updateNodeData(updatedData);
            })
            .catch((error) => {
                console.error('Fetch error:', error);
                updateNodeData({
                    ip,
                    synced: false,
                    slotHC: unkownVal,
                    sequId: unkownVal,
                });
            });
    };
    
    const updateNodeData = (newEntry) => {
        setNodeData(prevData => {
            const index = prevData.findIndex(node => node.ip === newEntry.ip);

            if (index !== -1) {
                const updatedData = [...prevData];
                updatedData[index] = { ...updatedData[index], ...newEntry };
                return updatedData;
            } else {
                return [...prevData, newEntry];
            }
        });
    };

    return (
        <div className="NodeDataTable">
            <ListView data={nodeData} />
        </div>
    );
}

export default NodeDataTable;
