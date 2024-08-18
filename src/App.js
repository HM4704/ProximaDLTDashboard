import React from 'react';
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import Nodes from './pages/Nodes';
import Sequencers from './pages/Sequencers';
import Visualize from './pages/Visualizer';
import NavTabs from './components/NavTabs';import './App.css';

function App() {

  return (

    <div className="App">
    <Router>
      <NavTabs />
      <Routes>
        <Route path="/nodes" element={<Nodes />} />
        <Route path="/sequencers" element={<Sequencers />} />
        <Route path="/visualize" element={<Visualize />} />
      </Routes>
    </Router>      
    </div>
  );
}

export default App;
