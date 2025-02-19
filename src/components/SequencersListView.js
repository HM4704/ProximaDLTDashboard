import React from 'react';
import Header from './SequencersHeader';
import ListItem from './SequencersListItem';

const ListView = ({ data }) => {
  return (
    <table>
      <Header />
      <tbody>
        {data.map((item, index) => (
          <ListItem key={index} name={item.name} sequencerId={item.sequencerId} balance={item.balance} lastActive={item.lastActive}  />
        ))}
      </tbody>
    </table>
  );
};

export default ListView;
