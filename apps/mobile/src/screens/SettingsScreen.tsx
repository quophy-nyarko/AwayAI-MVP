import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, Alert, StyleSheet } from 'react-native';
import * as SecureStore from 'expo-secure-store';

export default function SettingsScreen() {
const [serverUrl, setServerUrl] = useState('');
const [adminToken, setAdminToken] = useState('');
const [name, setName] = useState('');
const [business, setBusiness] = useState('');
const [status, setStatus] = useState('Preview - no live connection');

useEffect(() => {
(async () => {
const url = await SecureStore.getItemAsync('serverUrl');
const token = await SecureStore.getItemAsync('adminToken');
const savedName = await SecureStore.getItemAsync('userName');
const savedBusiness = await SecureStore.getItemAsync('userBusiness');
if (url) setServerUrl(url);
if (token) setAdminToken(token);
if (savedName) setName(savedName);
if (savedBusiness) setBusiness(savedBusiness);
})();
}, []);

const handleSave = async () => {
if (!serverUrl || !adminToken) {
Alert.alert('Error', 'Please enter Server URL and Admin Token');
return;
}
try {
await SecureStore.setItemAsync('serverUrl', serverUrl.trim());
await SecureStore.setItemAsync('adminToken', adminToken.trim());
await SecureStore.setItemAsync('userName', name.trim());
await SecureStore.setItemAsync('userBusiness', business.trim());
const cleanUrl = serverUrl.trim().replace(//$/, '');
const response = await fetch(cleanUrl + '/api/profile', {
method: 'POST',
headers: { 'Content-Type': 'application/json', 'x-admin-token': adminToken.trim() },
body: JSON.stringify({ name: name.trim(), business: business.trim(), role: business.trim() }),
});
if (response.ok) {
setStatus('Connected - Live');
Alert.alert('Success', 'Saved! Profile updated to ' + name);
} else {
const text = await response.text();
setStatus('Connection failed: ' + response.status);
Alert.alert('Server error', 'Status ' + response.status + ': ' + text);
}
} catch (e: any) {
setStatus('Connection failed');
Alert.alert('Connection failed', e.message);
}
};

return (
<ScrollView style={styles.container} contentContainerStyle={{ padding: 16 }}>
<Text style={styles.title}>Settings</Text>
<Text style={styles.subtitle}>Connections, profile and safety controls.</Text>
<View style={styles.card}>
<Text style={styles.section}>App server</Text>
<Text style={[styles.status, status.includes('Live') ? styles.green : styles.orange]}>{status}</Text>
<Text style={styles.label}>HTTPS SERVER URL</Text>
<TextInput style={styles.input} value={serverUrl} onChangeText={setServerUrl} placeholder="https://awayai-mvp.onrender.com" autoCapitalize="none" autoCorrect={false} />
<Text style={styles.label}>APP ADMIN TOKEN</Text>
<TextInput style={styles.input} value={adminToken} onChangeText={setAdminToken} placeholder="awayai..." autoCapitalize="none" autoCorrect={false} secureTextEntry />
</View>
<View style={styles.card}>
<Text style={styles.section}>Your profile</Text>
<Text style={styles.label}>YOUR NAME</Text>
<TextInput style={styles.input} value={name} onChangeText={setName} placeholder="Gideon" />
<Text style={styles.label}>BUSINESS OR ROLE</Text>
<TextInput style={styles.input} value={business} onChangeText={setBusiness} placeholder="Abu Dhabi" />
</View>
<TouchableOpacity style={styles.button} onPress={handleSave}>
<Text style={styles.buttonText}>SAVE & CONNECT</Text>
</TouchableOpacity>
<View style={{ height: 100 }} />
</ScrollView>
);
}
const styles = StyleSheet.create({
container: { flex: 1, backgroundColor: '#f5f5f5' },
title: { fontSize: 28, fontWeight: 'bold', marginTop: 10 },
subtitle: { color: '#666', marginBottom: 16 },
card: { backgroundColor: 'white', borderRadius: 12, padding: 16, marginBottom: 16 },
section: { fontWeight: 'bold', fontSize: 16, marginBottom: 8 },
status: { marginBottom: 12 },
orange: { color: '#e67e22' },
green: { color: '#27ae60' },
label: { fontSize: 12, fontWeight: '600', color: '#888', marginTop: 12, marginBottom: 4 },
input: { borderWidth: 1, borderColor: '#ddd', borderRadius: 8, padding: 12, backgroundColor: '#fff' },
button: { backgroundColor: '#111', borderRadius: 10, padding: 16, alignItems: 'center', marginTop: 10 },
buttonText: { color: 'white', fontWeight: 'bold' },
});
