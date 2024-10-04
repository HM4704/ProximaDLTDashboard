import React, { useState } from 'react';
import { Tabs, Tab } from '@mui/material';
import { useNavigate, useLocation } from 'react-router-dom';

function NavTabs() {
    const [value, setValue] = useState(0);
    const navigate = useNavigate();
    const location = useLocation();

    // Sync the tab value with the current route
    React.useEffect(() => {
        if (location.pathname === '/') setValue(0);
        else if (location.pathname === '/sequencers') setValue(1);
        else if (location.pathname === '/visualizer') setValue(2);
        else if (location.pathname === '/peers') setValue(3);
    }, [location.pathname]);

    const handleChange = (event, newValue) => {
        setValue(newValue);
        if (newValue === 0) navigate('/');
        else if (newValue === 1) navigate('/sequencers');
        else if (newValue === 2) navigate('/visualizer');
        else if (newValue === 3) navigate('/peers');
    };

    return (
        <Tabs value={value} onChange={handleChange} centered>
            <Tab label="Nodes" />
            <Tab label="Peers" />
            <Tab label="Sequencers" />
            <Tab label="Visualizer" />
        </Tabs>
    );
}

export default NavTabs;
