import React from 'react';

const ListItem = ({ id, name, onChainBalance, inflation }) => {
  return (
    <tr>
      <td>{name}</td>
      <td>{id}</td>
      <td>{onChainBalance}</td>
      <td>{inflation}</td>
    </tr>
  );
};

export default ListItem;
