import { AppRegistry, LogBox } from 'react-native';
import App from './src/App';

// Temporary workaround for problem with nested text
// not working currently.
LogBox.ignoreAllLogs();

// Register with the component ID from manifest.toml
AppRegistry.registerComponent('com.familyscreen.vega.main', () => App);
