// jest-dom adds custom jest matchers for asserting on DOM nodes.
// allows you to do things like:
// expect(element).toHaveTextContent(/react/i)
// learn more: https://github.com/testing-library/jest-dom

const { render, screen } = require('@testing-library/react');
//require('@testing-library/jest-dom');
import '@testing-library/jest-dom';

import { registerAddress } from './../NodeDataTable';

describe('registerAddress', () => {
  it('should not add "127.0.0.1" to the array', () => {
    const array = [];
    const result = registerAddress(array, '127.0.0.1');
    expect(result).toEqual([]);
  });

  it('should not add empty strings to the array', () => {
    const array = [];
    const result = registerAddress(array, '');
    expect(result).toEqual([]);
  });

  it('should add a valid string to the array', () => {
    const array = [];
    const result = registerAddress(array, '192.168.1.1');
    expect(result).toEqual(['192.168.1.1']);
  });

  it('should not add a duplicate string to the array', () => {
    const array = ['192.168.1.1'];
    const result = registerAddress(array, '192.168.1.1');
    expect(result).toEqual(['192.168.1.1']);
  });
});