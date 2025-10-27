import React, { useState, useEffect } from 'react';
import ListView from './SequencersListView';
import config from './../config';  // Import the configuration


/* eslint-env es2020 */


function hexToBytes(hex) {
  if (hex.startsWith("0x")) hex = hex.slice(2);
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) {
    bytes[i / 2] = parseInt(hex.substr(i, 2), 16);
  }
  return bytes;
}

function getSequencerName(seqDataHex) {

  // Parse Go "tuple" format (from tuples.TupleFromBytes)
  function parseTuple(data) {
    if (data.length < 2) throw new Error("Too short for tuple");
    const prefix = (data[0] << 8) | data[1];
    const numElements = prefix & 0x3FFF;
    const lenType = (prefix >> 14) & 0x03;
    const lenBytes = [0, 1, 2, 4][lenType];

    const elements = [];
    let offset = 2;
    for (let i = 0; i < numElements; i++) {
      let len = 0;
      for (let j = 0; j < lenBytes; j++)
        len = (len << 8) | data[offset + j];
      offset += lenBytes;
      elements.push(data.slice(offset, offset + len));
      offset += len;
    }
    return elements;
  }

  // Parse tuple -> map of key→value
  const bytes = hexToBytes(seqDataHex);
  const elements = parseTuple(bytes);
  
  if (elements.length > 4) {
	  const seqData = parseTuple(elements[4].slice(1));
    if (seqData && seqData.length > 0) {
        return new TextDecoder().decode(seqData[0].slice(1)).split('.')[0];
    }
  }

  return null; // Name not found
}


function getSlotFromSequencerOutputID(outputIDHex) {
    const TimeByteLength = 8;
    const TransactionIDShortLength = 27;
    const TransactionIDLength = TimeByteLength + TransactionIDShortLength;
    const ExpectedOutputIDLength = 32 + 1; // Should be 36 bytes
    const SequencerTxFlagHigherByte = 0b10000000;

    // Decode hex string to bytes
    const bytes = hexToBytes(outputIDHex);

    if (bytes.length !== ExpectedOutputIDLength) {
        throw new Error(`Invalid OutputID length: expected ${ExpectedOutputIDLength}, got ${bytes.length}`);
    }

    // Extract Transaction ID
    const transactionID = bytes.slice(0, TransactionIDLength);

    // Extract timestamp
    const timestamp = transactionID.slice(0, TimeByteLength);

    // Mask out the highest bit of the first byte
    timestamp[0] &= ~SequencerTxFlagHigherByte;

    // Convert first 4 bytes to a slot (big-endian)
    const slot = (timestamp[0] << 24) | (timestamp[1] << 16) | (timestamp[2] << 8) | timestamp[3];

    return slot;
}

function SequencerDataTable() {
    const [sequencerData, setSequencerData] = useState([]);
    const [syncInf, setSyncInfo] = useState(null);
    const [sortConfig, setSortConfig] = useState({ key: null, direction: 'asc' });


    useEffect(() => {
        // Fetch immediately when the component mounts
        fetchSyncInfo(config.baseUrl).then((latestSyncInf) => {
            fetchSequencerStats(config.baseUrl, latestSyncInf);
        });
        
        const intervalId = setInterval(() => {
            fetchSyncInfo(config.baseUrl).then((latestSyncInf) => {
                fetchSequencerStats(config.baseUrl, latestSyncInf);
            });
        }, 5000);
    
        return () => clearInterval(intervalId);
    }, []);
   
    const fetchSyncInfo = async (baseUrl) => {
        const getSyncInfoUrl = `https://${baseUrl}/api/proxy/api/proxy/api/v1/sync_info`;

        try {
            const syncInfoResponse = await fetch(getSyncInfoUrl);
            if (!syncInfoResponse.ok) throw new Error('Failed to fetch sync info');
            const syncInfo = await syncInfoResponse.json();
            const updatedData = {
                synced: syncInfo.synced,
                currentSlot: syncInfo.current_slot,
            };

            setSyncInfo(updatedData);
            return updatedData; // Return the latest sync info
        } catch (error) {
            console.error('Error fetching ledger identity data:', error.message);
        }
    };

    const fetchSequencerStats = async (baseUrl, syncInf) => {
        const url = `https://${baseUrl}/api/proxy/api/proxy/api/v1/get_sequencers`;
        try {
            const response = await fetch(url);
            if (!response.ok) throw new Error("Failed to fetch sequencer data");
    
            const data = await response.json();
            const sequencers = data.sequencers;
    
            const currentSlot = syncInf?.currentSlot ?? 0; // Ensure syncInf is not null
    
            const formattedData = Object.entries(sequencers).map(([sequencerId, details]) => ({
                sequencerId,
                seqOutputId: details.id,
                name: getSequencerName(details.data),
                // balance: BigInt(details.balance).toString(),
                lastActive: (currentSlot - getSlotFromSequencerOutputID(details.id)).toString(),
                // delegations: Object.entries(details.delegations).map(([delegatorId, delegation]) => ({
                //     delegatorId,
                //     amount: BigInt(delegation.amount),
                //     sinceSlot: delegation.since_slot,
                //     startAmount: BigInt(delegation.start_amount),
                // })),
            }));
    
            setSequencerData(formattedData);
        } catch (error) {
            console.error("Error fetching sequencer stats:", error.message);
        }
    };
     
    const sortedData = React.useMemo(() => {
    if (!sortConfig.key) return sequencerData;

    const sorted = [...sequencerData].sort((a, b) => {
        let aVal = a[sortConfig.key];
        let bVal = b[sortConfig.key];

        // Handle numeric or string comparison
        if (!isNaN(aVal) && !isNaN(bVal)) {
        aVal = Number(aVal);
        bVal = Number(bVal);
        } else {
        aVal = aVal?.toString().toLowerCase();
        bVal = bVal?.toString().toLowerCase();
        }

        if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1;
        if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
    });

    return sorted;
    }, [sequencerData, sortConfig]);

    const handleSort = (key) => {
    setSortConfig((prev) => {
        if (prev.key === key) {
        // Toggle direction if same column
        return { key, direction: prev.direction === 'asc' ? 'desc' : 'asc' };
        }
        // Otherwise set new sort column asc by default
        return { key, direction: 'asc' };
    });
    };

    
    return (
        <div className="NodeDataTable">
            <ListView
            data={sortedData}
            onSort={handleSort}
            sortConfig={sortConfig}
            />            
        </div>
    );
}


export default SequencerDataTable;
