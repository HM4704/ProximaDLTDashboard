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

function SequencerDataTable() {
    const [sequencerData, setSequencerData] = useState([]);

    useEffect(() => {
        const intervalId = setInterval(() => {
            fetchSequencerStats(config.baseUrl);
        }, 5000);

        return () => clearInterval(intervalId);
    }, []);

    const fetchSequencerStats = async (baseUrl) => {
        const allChainsUrl = `http://${baseUrl}/api/v1/get_all_chains`;
        const parseOutputDataUrl = `http://${baseUrl}/txapi/v1/parse_output_data?output_data=`;
    
        try {
            const chainsResponse = await fetch(allChainsUrl);
            if (!chainsResponse.ok) throw new Error('Failed to fetch chains data');
            const chainsData = await chainsResponse.json();
    
            setSequencerData((prevSequencerData) => {
                const updatedSequencerData = [...prevSequencerData];
    
                for (const [chainId, chainInfo] of Object.entries(chainsData.chains)) {
                    const existingIndex = updatedSequencerData.findIndex((item) => item.chainId === chainId);
    
                    // Update or add basic chain info
                    if (existingIndex !== -1) {
                        updatedSequencerData[existingIndex] = {
                            ...updatedSequencerData[existingIndex],
                            data: chainInfo.data,
                        };
                    } else {
                        updatedSequencerData.push({
                            chainId,
                            data: chainInfo.data,
                        });
                    }
                }
                return updatedSequencerData;
            });
    
            // Fetch and filter parsed data
            const updatedDataPromises = Object.entries(chainsData.chains).map(async ([chainId, chainInfo]) => {
                const parseResponse = await fetch(parseOutputDataUrl + encodeURIComponent(chainInfo.data));
                if (!parseResponse.ok) throw new Error(`Failed to parse data for chain: ${chainId}`);
                const parsedData = await parseResponse.json();
    
                // Only include data if constraints contain "sequencer"
                if (parsedData.constraints.some((constraint) => constraint.includes("sequencer"))) {
                    return {
                        chainId,
                        name: extractOrConstraint(parsedData.constraints),
                        onChainBalance: parsedData.amount,
                        id: parsedData.chain_id,
                        inflation: extractInflationValue(parsedData.constraints),
                    };
                }
                return null; // Skip chains without "sequencer" constraint
            });
    
            const parsedResults = (await Promise.all(updatedDataPromises)).filter(Boolean); // Remove nulls
    
            // Update state with filtered results
            setSequencerData((prevSequencerData) =>
                prevSequencerData.map((chainData) => {
                    const parsed = parsedResults.find((parsed) => parsed.chainId === chainData.chainId);
                    return parsed ? { ...chainData, ...parsed } : chainData;
                }).concat(
                    parsedResults.filter(
                        (parsed) => !prevSequencerData.some((chainData) => chainData.chainId === parsed.chainId)
                    )
                )
            );
        } catch (error) {
            console.error('Error fetching sequencer stats:', error.message);
        }
    };
        
    return (
        <div className="NodeDataTable">
            <ListView data={sequencerData} />
        </div>
    );
}


export default SequencerDataTable;
