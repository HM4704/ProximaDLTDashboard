import React from 'react';

const ListItem = ({ sequencerId, name, balance, lastActive }) => {
  return (
    <tr>
      <td>{name}</td>
      <td>{/*sequencerId*/}</td>
      <td>{balance}</td>
      <td>{lastActive}</td>
    </tr>
  );
};

export default ListItem;
