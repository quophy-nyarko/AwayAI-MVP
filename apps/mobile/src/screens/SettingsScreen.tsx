import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, Alert, StyleSheet, Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';

const DEFAULT_URL = 'https://awayai-mvp.onrender.com';

export default function SettingsScreen() {
const [serverUrl, setServerUrl] = useState(DEFAULT_URL);
const [adminToken, setAdminToken] = useState('');
const [name, setName] = useState('Gideon');
const [business, setBusiness] = useState('Abu Dhabi');
const [status, setStatus] = useState('Preview - no live connection');

useEffect(() => {
(async () => {
const url = await SecureStore.getItemAsync('serverUrl');
const token = await SecureStore.getItemAsync('adminToken');
const savedName = await SecureStore.getItemAsync('userName');
const savedBusiness = await SecureStore.getItemAsync('userBusiness');
if (url) setServerUrl(url); else setServerUrl(DEFAULT_URL);
if (token) setAdminToken(token);
if (savedName) setName(savedName);
if (savedBusiness) setBusiness(savedBusiness);
})();
}, []);

const handleSave = async () => {
if (!adminToken.trim()) {
Alert.alert('Missing Token', 'Paste your APP ADMIN TOKEN from Render (awayai...)');
return;
}
try {
await SecureStore.setItemAsync('serverUrl', serverUrl.trim());
await SecureStore.setItemAsync('adminToken', adminToken.trim());
await SecureStore.setItemAsync('userName', name.trim());
await SecureStore.setItemAsync('userBusiness', business.trim());

let cleanUrl = serverUrl.trim();
      if (cleanUrl.endsWith('/')) {
        cleanUrl = cleanUrl.slice(0, -1);
      }
      setStatus('Connecting...');
      const response = await fetch(cleanUrl + '/api/profile', {
method: 'POST',
headers: { 'Content-Type': 'application/json', 'x-admin-token': adminToken.trim() },
body: JSON.stringify({ name: name.trim(), business: business.trim(), role: business.trim() }),
});

const text = await response.text();
if (response.ok) {
setStatus('Connected - Live as ' + name);
Alert.alert('Success', 'Saved! WhatsApp will now say: ' + name + ' is not available');
} else {
setStatus('Server error: ' + response.status);
Alert.alert('Error ' + response.status, text.slice(0,300));
}
} catch (e: any) {
setStatus('Connection failed');
Alert.alert('Connection failed', e.message + '\n\nMake sure DEMO_MODE=false on Render and token is correct');
}
};

return (
<View style={{ flex: 1, backgroundColor: '#f5f5f5' }}>
<ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 200 }}>
<Text style={styles.title}>Settings</Text>
<Text style={styles.subtitle}>Connections, profile and safety controls.</Text>

<View style={styles.card}>
<Text style={styles.section}>App server</Text>
<Text style={[styles.status, status.includes('Live') ? styles.green : styles.orange]}>{status}</Text>

<Text style={styles.label}>HTTPS SERVER URL</Text>
<TextInput style={styles.input} value={serverUrl} onChangeText={setServerUrl} autoCapitalize="none" />

<Text style={styles.label}>APP ADMIN TOKEN required</Text>
<TextInput style={styles.input} value={adminToken} onChangeText={setAdminToken} placeholder="Paste awayai... token here" autoCapitalize="none" secureTextEntry={false} />
</View>

<View style={styles.card}>
<Text style={styles.section}>Your profile</Text>
<Text style={styles.label}>YOUR NAME</Text>
<TextInput style={styles.input} value={name} onChangeText={setName} />
<Text style={styles.label}>BUSINESS OR ROLE</Text>
<TextInput style={styles.input} value={business} onChangeText={setBusiness} />
</View>

<TouchableOpacity style={styles.button} onPress={handleSave}>
<Text style={styles.buttonText}>SAVE & CONNECT</Text>
</TouchableOpacity>

<Text style={styles.hint}>After Save, send a new WhatsApp message to your bot to test. It should say Gideon, not Alex.</Text>
</ScrollView>
</View>
);
}

const styles = StyleSheet.create({
title: { fontSize: 28, fontWeight: 'bold', marginTop: 10 },
subtitle: { color: '#666', marginBottom: 16 },
card: { backgroundColor: 'white', borderRadius: 12, padding: 16, marginBottom: 16, elevation: 2 },
section: { fontWeight: 'bold', fontSize: 16, marginBottom: 8 },
status: { marginBottom: 12, fontWeight: '600' },
orange: { color: '#e67e22' },
green: { color: '#27ae60' },
label: { fontSize: 11, fontWeight: '700', color: '#888', marginTop: 12, marginBottom: 4, letterSpacing: 0.5 },
input: { borderWidth: 1, borderColor: '#ddd', borderRadius: 10, padding: 14, backgroundColor: '#fff', fontSize: 15 },
button: { backgroundColor: '#000', borderRadius: 12, padding: 18, alignItems: 'center', marginTop: 10, marginBottom: 20 },
buttonText: { color: 'white', fontWeight: 'bold', fontSize: 16, letterSpacing: 1 },
hint: { textAlign: 'center', color: '#888', marginTop: 10, fontSize: 12 },
});
