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
    
                    if (existingIndex !== -1) {
                        // Update existing chain data
                        updatedSequencerData[existingIndex] = {
                            ...updatedSequencerData[existingIndex],
                            data: chainInfo.data,
                        };
                    } else {
                        // Add new chain data
                        updatedSequencerData.push({
                            chainId,
                            data: chainInfo.data,
                        });
                    }
                }
                return updatedSequencerData;
            });
    
            // Update parsed data for all chains
            const updatedDataPromises = Object.entries(chainsData.chains).map(async ([chainId, chainInfo]) => {
                const parseResponse = await fetch(parseOutputDataUrl + encodeURIComponent(chainInfo.data));
                if (!parseResponse.ok) throw new Error(`Failed to parse data for chain: ${chainId}`);
                const parsedData = await parseResponse.json();
    
                return {
                    chainId,
                    name: "",
                    onChainBalance: parsedData.amount,
                    id: parsedData.chain_id,
                };
            });
    
            const parsedResults = await Promise.all(updatedDataPromises);
    
            setSequencerData((prevSequencerData) =>
                prevSequencerData.map((chainData) => {
                    const parsed = parsedResults.find((parsed) => parsed.chainId === chainData.chainId);
                    return parsed ? { ...chainData, ...parsed } : chainData;
                })
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
