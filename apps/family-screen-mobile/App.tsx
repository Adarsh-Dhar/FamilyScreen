import React, { useState } from 'react';
import {
  SafeAreaView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  Alert,
} from 'react-native';

// This is the mobile phone app for pairing with the TV
// It allows parents to enter the TV pairing code and link their account

export default function App() {
  const [pairingCode, setPairingCode] = useState('');
  const [parentAccountId, setParentAccountId] = useState('family-demo');
  const [loading, setLoading] = useState(false);
  const [childProfiles, setChildProfiles] = useState([]);

  const API_BASE_URL = 'http://192.168.0.101:8080'; // Update this to your API server address

  const handlePair = async () => {
    if (!pairingCode.trim()) {
      Alert.alert('Error', 'Please enter a pairing code');
      return;
    }

    setLoading(true);
    try {
      // Check pairing status
      const response = await fetch(`${API_BASE_URL}/api/pair/status/${pairingCode.trim()}`);
      const data = await response.json();

      if (data.confirmed) {
        Alert.alert('Success', 'TV paired successfully!');
        // Load child profiles if available
        loadProfiles(parentAccountId);
      } else {
        Alert.alert('Pending', 'Waiting for TV to confirm pairing...');
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to connect to TV. Please check your network.');
    } finally {
      setLoading(false);
    }
  };

  const loadProfiles = async (accountId: string) => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/profiles/${accountId}`);
      const data = await response.json();
      setChildProfiles(data.parentAccount?.children || []);
    } catch (error) {
      console.error('Failed to load profiles:', error);
    }
  };

  const addProfile = () => {
    Alert.alert('Add Profile', 'This would open a form to add a child profile');
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>Family Screen</Text>
        <Text style={styles.subtitle}>Pair your TV to get started</Text>

        <View style={styles.inputContainer}>
          <Text style={styles.label}>TV Pairing Code</Text>
          <TextInput
            style={styles.input}
            placeholder="Enter 6-digit code"
            value={pairingCode}
            onChangeText={setPairingCode}
            keyboardType="number-pad"
            maxLength={6}
            autoFocus
          />
        </View>

        <TouchableOpacity
          style={[styles.button, loading && styles.buttonDisabled]}
          onPress={handlePair}
          disabled={loading}>
          <Text style={styles.buttonText}>
            {loading ? 'Connecting...' : 'Pair TV'}
          </Text>
        </TouchableOpacity>

        {childProfiles.length > 0 && (
          <View style={styles.profilesContainer}>
            <Text style={styles.profilesTitle}>Child Profiles</Text>
            {childProfiles.map((profile: any) => (
              <View key={profile.id} style={styles.profileCard}>
                <Text style={styles.profileName}>{profile.name}</Text>
                <Text style={styles.profileAge}>Age: {profile.age}</Text>
              </View>
            ))}
            <TouchableOpacity style={styles.addButton} onPress={addProfile}>
              <Text style={styles.addButtonText}>+ Add Profile</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  content: {
    flex: 1,
    padding: 24,
    justifyContent: 'center',
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    marginBottom: 32,
    textAlign: 'center',
  },
  inputContainer: {
    marginBottom: 24,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 16,
    fontSize: 18,
    textAlign: 'center',
    letterSpacing: 4,
  },
  button: {
    backgroundColor: '#007AFF',
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
  },
  buttonDisabled: {
    backgroundColor: '#ccc',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  profilesContainer: {
    marginTop: 32,
  },
  profilesTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 16,
  },
  profileCard: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 8,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  profileName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  profileAge: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  addButton: {
    backgroundColor: '#007AFF',
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
    marginTop: 8,
  },
  addButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
