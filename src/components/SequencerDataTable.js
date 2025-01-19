import React, { useState, useEffect } from 'react';
import ListView from './SequencersListView';
import config from './../config';  // Import the configuration


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
                        name: "",
                        onChainBalance: parsedData.amount,
                        id: parsedData.chain_id,
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
