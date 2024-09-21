import React from 'react';

const Header = () => {
  return (
    <thead>
      <tr>
      <th>Name</th>
      <th>ID</th>
        <th>Wins</th>
        {/* <th>Wins %</th> */}
        <th>On Chain Balance</th>
      </tr>
    </thead>
  );
};

export default Header;
