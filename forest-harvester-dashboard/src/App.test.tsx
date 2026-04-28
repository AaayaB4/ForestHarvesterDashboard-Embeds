import React from 'react';
import { render, screen } from '@testing-library/react';
import App from './App';

jest.mock('./components/Dashboard', () => () => <div>Forest Harvester Head Performance</div>);
jest.mock('./components/MachineEmbed', () => () => <div>Machine Embed</div>);
jest.mock('./components/EmbedChart', () => () => <div>Embed Chart</div>);

test('renders the dashboard route', () => {
  render(<App />);
  expect(screen.getByText(/Forest Harvester Head Performance/i)).toBeInTheDocument();
});
