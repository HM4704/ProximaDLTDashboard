import React, { useState, useEffect } from "react";
import { HashRouter as Router, Route, Routes } from 'react-router-dom';
import Nodes from './pages/Nodes';
import Sequencers from './pages/Sequencers';
import Visualizer from './pages/Visualizer';
import NavTabs from './components/NavTabs';import './App.css';
import config from './config';  // Import the configuration

function App() {

    const [baseUrl, setBaseUrl] = useState(config.baseUrl); // Set default or initial value

    useEffect(() => {
        const savedBaseUrl = localStorage.getItem('baseUrl');
        if (savedBaseUrl) {
            config.baseUrl = savedBaseUrl
            setBaseUrl(savedBaseUrl);
        }
    }, []);

    const handleBaseUrlChange = (e) => {
        const newUrl = e.target.value;
        setBaseUrl(newUrl);
        config.baseUrl = newUrl
        localStorage.setItem('baseUrl', newUrl);
    };

      
    return (

        <div className="App">
            <Router>
                    <NavTabs />
                    <Routes>
                        <Route path="/" element={<Nodes />} />
                        <Route path="/sequencers" element={<Sequencers />} />
                        <Route path="/visualizer" element={<Visualizer />} />
                    </Routes>
            </Router>
{/*             <div style={{ position: 'absolute', top: '30px', right: '20px', zIndex: 1000 }}>
                <label htmlFor="baseUrl" style={{ marginRight: '10px', fontSize: '13px' }}>Query URL:</label>
                <input
                    type="text"
                    id="baseUrl"
                    value={baseUrl}
                    onChange={handleBaseUrlChange}
                    style={{ padding: '5px', fontSize: '14px', width: '200px' }}
                />
            </div>
 */}        </div>
);
}

export default App;
