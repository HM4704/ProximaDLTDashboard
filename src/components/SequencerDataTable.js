import React, { useState, useEffect } from 'react';
import ListView from './SequencersListView';
import config from './../config';  // Import the configuration


function extractOrConstraint(constraints) {
    const orConstraint = constraints.find(item => item.startsWith("or("));
    
    if (orConstraint) {
        // Extract the hex string (first value inside parentheses)
        const match = orConstraint.match(/0x[0-9a-fA-F]+/);
        
        if (match) {
            // Convert hex string to ASCII characters
            const hexString = match[0].slice(2);
            let asciiString = '';
            for (let i = 0; i < hexString.length; i += 2) {
                asciiString += String.fromCharCode(parseInt(hexString.substr(i, 2), 16));
            }
            return asciiString;
        }
    }
    
    return "";
}

function extractInflationValue(constraints) {
    const inflationConstraint = constraints.find(item => item.startsWith("inflation("));

    if (inflationConstraint) {
        // Extract the number inside the parentheses after "u64/"
        const match = inflationConstraint.match(/u64\/(\d+)/);
        if (match) {
            return match[1]; // Return the extracted number as a string
        }
    }
    
    return "";
}
/* eslint-env es2020 */

function identityDataFromBytes(hexString) {
    const buf = Buffer.from(hexString, "hex"); // Convert hex string to byte array
    const view = new DataView(buf.buffer);
    let offset = 0;

    function readUint16() {
        const value = view.getUint16(offset, false); // Big-endian
        offset += 2;
        return value;
    }

    function readUint32() {
        const value = view.getUint32(offset, false); // Big-endian
        offset += 4;
        return value;
    }

    function readUint64() {
        const high = view.getUint32(offset, false); // High 32 bits
        const low = view.getUint32(offset + 4, false); // Low 32 bits
        offset += 8;
        return (BigInt(high) << 32n) | BigInt(low);
    }

    function readByte() {
        return view.getUint8(offset++);
    }

    function readBytes(length) {
        const slice = buf.slice(offset, offset + length);
        offset += length;
        return slice;
    }

    const descriptionSize = readUint16();
    const description = buf.toString("utf-8", offset, offset + descriptionSize);
    offset += descriptionSize;

    return {
        description,
        genesisTimeUnix: readUint32(),
        initialSupply: readUint64(),
        genesisControllerPublicKey: readBytes(32), // ED25519 key (32 bytes)
        tickDuration: readUint64(),
        slotInflationBase: readUint64(),
        linearInflationSlots: readUint64(),
        branchInflationBonusBase: readUint64(),
        vbCost: readUint64(),
        transactionPace: readByte(),
        transactionPaceSequencer: readByte(),
        minimumAmountOnSequencer: readUint64(),
        maxNumberOfEndorsements: readUint64(),
        preBranchConsolidationTicks: readByte(),
        postBranchConsolidationTicks: readByte(),
    };
}

function hexToBytes(hex) {
    if (hex.length % 2 !== 0) throw new Error("Invalid hex string length");
    return new Uint8Array(hex.match(/.{1,2}/g).map(byte => parseInt(byte, 16)));
}

function getSlotFromSequencerOutputID(outputIDHex) {
    const TimeByteLength = 8;
    const TransactionIDShortLength = 27;
    const TransactionIDLength = TimeByteLength + TransactionIDShortLength;
    const ExpectedOutputIDLength = 32 + 1; // Should be 36 bytes
    const SequencerTxFlagHigherByte = 0b10000000;

    // Decode hex string to bytes
    const bytes = hexToBytes(outputIDHex);
    console.log(`Decoded OutputID Length: ${bytes.length}`);

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
    const [identityData, setIdentityData] = useState(null);
    const [syncInf, setSyncInfo] = useState(null);


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

    useEffect(() => {
        fetchLedgerIdentityData(config.baseUrl);
    }, []);

    const fetchLedgerIdentityData = async (baseUrl) => {
        const getLedgerIdUrl = `http://${baseUrl}/api/v1/get_ledger_id`;

        try {
            const ledgerIdResponse = await fetch(getLedgerIdUrl);
            if (!ledgerIdResponse.ok) throw new Error('Failed to fetch ledger data');
            const ledgerIdData = await ledgerIdResponse.json();
            const ledgerIdBytes = new Uint8Array(ledgerIdData.ledger_id_bytes); // Convert to Uint8Array
            setIdentityData(identityDataFromBytes(ledgerIdBytes));

        } catch (error) {
            console.error('Error fetching ledger identity data:', error.message);
        }
    };

    const fetchSyncInfo = async (baseUrl) => {
        const getSyncInfoUrl = `http://${baseUrl}/api/v1/sync_info`;

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
        const url = `http://${baseUrl}/api/v1/get_delegations_by_sequencer`;
    
        try {
            const response = await fetch(url);
            if (!response.ok) throw new Error("Failed to fetch sequencer data");
    
            const data = await response.json();
            const sequencers = data.sequencers;
    
            const currentSlot = syncInf?.currentSlot ?? 0; // Ensure syncInf is not null
    
            const formattedData = Object.entries(sequencers).map(([sequencerId, details]) => ({
                sequencerId,
                seqOutputId: details.seq_output_id,
                name: details.seq_name,
                balance: BigInt(details.balance).toString(),
                lastActive: (currentSlot - getSlotFromSequencerOutputID(details.seq_output_id)).toString(),
                delegations: Object.entries(details.delegations).map(([delegatorId, delegation]) => ({
                    delegatorId,
                    amount: BigInt(delegation.amount),
                    sinceSlot: delegation.since_slot,
                    startAmount: BigInt(delegation.start_amount),
                })),
            }));
    
            setSequencerData(formattedData);
        } catch (error) {
            console.error("Error fetching sequencer stats:", error.message);
        }
    };
     
    
    return (
        <div className="NodeDataTable">
            <ListView data={sequencerData} />
        </div>
    );
}


export default SequencerDataTable;
