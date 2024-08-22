import React, { useState, useEffect } from 'react';
import ListView from './SequencersListView';

function SequencerDataTable() {
    const [sequencerData, setSequencerData] = useState([]);
    const unkownVal = '???';
    let ip = '192.168.178.32';

    useEffect(() => {

        const intervalId = setInterval(() => {
            fetchSequencerStats(ip);
        }, 5000);

        return () => clearInterval(intervalId);
    }, []);

    const fetchSequencerStats = (ip) => {
        fetch(`http://${ip}:8000/sequencer_stats`)
            .then((response) => {
                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }
                return response.json();
            })
            .then((data) => {
                let updatedEntries = [];  // Array to hold all updated entries

                if (data.sequ_stat) {
                    for (const [key, value] of Object.entries(data.sequ_stat)) {
                        updatedEntries.push({
                            id: key,
                            name: value.name,
                            wins: value.wins,
                            onChainBalance: value.on_chain_balance,
                        });
                    }

                    // Update the sequencerData state with all updated entries
                    setSequencerData(prevData => {
                        const newData = [...prevData];
                        updatedEntries.forEach(newEntry => {
                            const index = newData.findIndex(node => node.id === newEntry.id);
                            if (index !== -1) {
                                newData[index] = { ...newData[index], ...newEntry };
                            } else {
                                newData.push(newEntry);
                            }
                        });
                        return newData;
                    });
                }

            })
            .catch((error) => {
                console.error('Fetch error:', error);
            });
    };

    return (
        <div className="NodeDataTable">
            <ListView data={sequencerData} />
        </div>
    );
}

export default SequencerDataTable;
