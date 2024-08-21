import React from 'react';
import { HashRouter as Router, Route, Routes } from 'react-router-dom';
import Nodes from './pages/Nodes';
import Sequencers from './pages/Sequencers';
import Visualizer from './pages/Visualizer';
import NavTabs from './components/NavTabs';import './App.css';

function App() {

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
        </div>
    );
}

export default App;
