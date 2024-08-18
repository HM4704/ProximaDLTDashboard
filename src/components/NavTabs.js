import React from 'react';
import { Tabs, Tab } from '@mui/material';
import { Link, useLocation } from 'react-router-dom';

function NavTabs() {
  const location = useLocation();
  const currentPath = location.pathname;

  return (
    <Tabs value={currentPath}>
      <Tab label="Nodes" value="/nodes" component={Link} to="/nodes" />
      <Tab label="Sequencers" value="/sequencers" component={Link} to="/sequencers" />
      <Tab label="Visualizer" value="/visualizer" component={Link} to="/visualizer" />
    </Tabs>
  );
}

export default NavTabs;
