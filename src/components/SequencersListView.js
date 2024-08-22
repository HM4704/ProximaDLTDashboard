import React from 'react';
import Header from './SequencersHeader';
import ListItem from './SequencersListItem';

const ListView = ({ data }) => {
  return (
    <table>
      <Header />
      <tbody>
        {data.map((item, index) => (
          <ListItem key={index} id={item.id} name={item.name} wins={item.wins} onChainBalance={item.onChainBalance}  />
        ))}
      </tbody>
    </table>
  );
};

export default ListView;
