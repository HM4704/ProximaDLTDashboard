
import React from 'react';

const Header = () => {
  return (
    <thead>
      <tr>
        {/* <th>IP</th> */}
        <th>ID</th>
        <th># Peers</th>
        <th>Synced</th>
        <th>Sequencer ID</th>
        <th>Slot(lrb / current)</th>
        <th>Version</th>
      </tr>
    </thead>
  );
};

export default Header;
