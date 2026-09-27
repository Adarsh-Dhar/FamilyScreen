import 'react-native';
import {render} from '@testing-library/react-native';
import * as React from 'react';

import App from '../src/App';

describe('App', () => {
  it('matches snapshot', () => {
    const screen = render(<App />);
    expect(screen).toMatchSnapshot();
  });

  it('renders without crashing', () => {
    const screen = render(<App />);
    expect(screen).toBeTruthy();
  });
});
