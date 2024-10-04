import React from 'react';

const ListItem = ({ ip, id, numPeers, synced, sequId, slotHC, version }) => {
  return (
    <tr>
      <td>{ip}</td>
      <td>{id}</td>
      <td>{numPeers}</td>
      <td>{synced}</td>
      <td>{sequId}</td>
      <td>{slotHC}</td>
      <td>{version}</td>
    </tr>
  );
};

export default ListItem;
