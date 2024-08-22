import React from 'react';

const ListItem = ({ id, name, wins, onChainBalance }) => {
  return (
    <tr>
      <td>{id}</td>
      <td>{name}</td>
      <td>{wins}</td>
      {/* <td>{wins}</td> */}
      <td>{onChainBalance}</td>
    </tr>
  );
};

export default ListItem;
