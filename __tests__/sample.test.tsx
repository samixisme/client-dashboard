import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';

// Sample component to test
const HelloWorld: React.FC = () => {
  return <div>Hello, Testing!</div>;
};

describe('Sample Test Suite', () => {
  it('should render hello message', () => {
    render(<HelloWorld />);
    expect(screen.getByText('Hello, Testing!')).toBeInTheDocument();
  });

  it('should pass a simple assertion', () => {
    expect(1 + 1).toBe(2);
  });

  it('should verify testing infrastructure is working', () => {
    const testArray = [1, 2, 3];
    expect(testArray).toHaveLength(3);
    expect(testArray).toContain(2);
  });
});
