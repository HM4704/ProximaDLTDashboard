import React from 'react';

const ListItem = ({ id, name, onChainBalance }) => {
  return (
    <tr>
      <td>{name}</td>
      <td>{id}</td>
      <td>{onChainBalance}</td>
    </tr>
  );
};

export default ListItem;
