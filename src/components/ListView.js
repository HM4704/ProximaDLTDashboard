import React from 'react';
import Header from './Header';
import ListItem from './ListItem';

const ListView = ({ data }) => {
  return (
    <table>
      <Header />
      <tbody>
        {data.map((item, index) => (
          <ListItem key={index} ip={item.ip} id={item.id} numPeers={item.numPeers} synced={item.synced} sequId={item.sequId} slotHC={item.slotHC} version={item.version} />
        ))}
      </tbody>
    </table>
  );
};

export default ListView;
