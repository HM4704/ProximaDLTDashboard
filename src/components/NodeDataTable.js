import React, { useState, useEffect } from 'react';
import ListView from './ListView';

function addUniqueString(array, stringToAdd) {
    if (stringToAdd.length === 0) {
        return array;
    }

    if (!array.includes(stringToAdd)) {
        array.push(stringToAdd);
    }
    return array;
}

function getIp(address) {
    // Regular expression to match the IP address
    const ipPattern = /\/ip4\/([\d.]+)/;

    // Extract the IP address
    const match = address.match(ipPattern);
    if (match) {
        const ipAddress = match[1];
        return ipAddress;
    } else {
        console.log("No IP address found");
        return '';
    }
}

async function getNodeList(ip, nodeList) {
    try {
        const response = await fetch(`http://${ip}:8000/peers_info`);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json(); // Ensure you're parsing the JSON response

        console.log('Received data:', data);

        // Update the nodeData state with the new data
        data.peers.forEach(peer => {
            peer.multiAddresses.forEach(address => {
                addUniqueString(nodeList, getIp(address));
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
        let nodeList = ['192.168.178.32'];

        const intervalId = setInterval(() => {
            getNodeList('192.168.178.32', nodeList).then(updatedList => {
                updatedList.forEach((ip) => {
                    fetchNodeInfo(ip);
                    fetchSyncInfo(ip);
                });
            });
        }, 5000);

        return () => clearInterval(intervalId);
    }, []); // Empty dependency array means this effect runs only once on mount

    const fetchNodeInfo = (ip) => {
        fetch(`http://${ip}:8000/node_info`)
            .then((response) => {
                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }
                return response.json();
            })
            .then((data) => {
                const newData = {
                    ip,
                    id: data.id,
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
        fetch(`http://${ip}:8000/sync_info`)
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
