import * as SecureStore from 'expo-secure-store';
const KEY = 'OPENAI_API_KEY';
export async function saveKey(k){ return SecureStore.setItemAsync(KEY,k); }
export async function getKey(){ return SecureStore.getItemAsync(KEY); }