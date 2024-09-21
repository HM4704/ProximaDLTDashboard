import React from 'react';

const ListItem = ({ id, name, wins, onChainBalance }) => {
  return (
    <tr>
      <td>{name}</td>
      <td>{id}</td>
      <td>{wins}</td>
      {/* <td>{wins}</td> */}
      <td>{onChainBalance}</td>
    </tr>
  );
};

export default ListItem;
