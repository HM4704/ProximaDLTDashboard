import React from 'react';

const Header = () => {
  return (
    <thead>
      <tr>
        <th>ID</th>
        <th>Name</th>
        <th>Wins</th>
        {/* <th>Wins %</th> */}
        <th>On Chain Balance</th>
      </tr>
    </thead>
  );
};

export default Header;
