// core/requestsHelper.ts

import AsyncStorage from '@react-native-async-storage/async-storage';
import { DeviceEventEmitter } from 'react-native';
import api from '../constants/api';
import { auth as firebaseAuth } from '../constants/firebaseConfig';

// Types
interface LanguageChangeResponse {
  success: boolean;
  error?: string;
}

/**
 * Changes the user's language preference on the server
 * @param itemValue - The language code (e.g., 'en', 'es', 'it')
 * @param userId - The user's unique ID
 * @param callback - Optional callback function to execute after success
 */
export const changeLangOnServer = async (
  itemValue: string, 
  userId: string, 
  callback?: () => void
): Promise<LanguageChangeResponse> => {
  try {
    const currentUser = firebaseAuth.currentUser;
    
    if (!currentUser) {
      throw new Error('No authenticated user found');
    }

    // Get fresh token
    const accessToken = await currentUser.getIdToken(true);

    // Save language to AsyncStorage
    await AsyncStorage.setItem('lang', itemValue);

    // Update language on server for notifications
    const response = await fetch(`${api.endpoint}user/${userId}?action=token`, {
      method: 'PUT',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({
        system_language: itemValue,
      }),
    });

    if (!response.ok) {
      throw new Error(`Server responded with status: ${response.status}`);
    }

    const responseData = await response.json();
    console.log('Language updated:', itemValue);

    // Emit language change event
    DeviceEventEmitter.emit('_langChanged', { lang: itemValue });

    // Execute callback if provided
    if (callback) {
      callback();
    }

    return { success: true };

  } catch (error) {
    console.error('Error changing language on server:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    };
  }
};

/**
 * Gets the current user's authentication token
 */
export const getCurrentUserToken = async (): Promise<string | null> => {
  try {
    const currentUser = firebaseAuth.currentUser;
    
    if (!currentUser) {
      return null;
    }

    return await currentUser.getIdToken(true);
  } catch (error) {
    console.error('Error getting user token:', error);
    return null;
  }
};

/**
 * Gets user data from server
 * @param userId - The user's unique ID
 * @param scope - Optional scope parameter (e.g., 'devices', 'last')
 */
export const getUserData = async (
  userId: string, 
  scope?: string
): Promise<{ success: boolean; data?: any; error?: string }> => {
  try {
    const currentUser = firebaseAuth.currentUser;
    
    if (!currentUser) {
      throw new Error('No authenticated user found');
    }

    // Get fresh token
    const accessToken = await currentUser.getIdToken(true);

    // Build URL with scope if provided
    let url = `${api.endpoint}user/${userId}`;
    if (scope) {
      url += `?scope=${scope}`;
    }
    console.log('scopeeeee', scope);    

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (!response.ok) {
      throw new Error(`Server responded with status: ${response.status}`);
    }

    const responseData = await response.json();

    if (responseData.status_code === 400) {
      throw new Error(responseData.message || 'Server error');
    }

    console.log('✅ User data obtained:', responseData);
    console.log('battery', responseData.uid);
    
    return {
      success: true,
      data: responseData,
    };

  } catch (error) {
    console.error('❌ Error getting user data:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
};

/**
 * Makes an authenticated API request
 */
export const makeAuthenticatedRequest = async (
  endpoint: string,
  options: RequestInit = {}
): Promise<Response> => {
  const token = await getCurrentUserToken();
  
  if (!token) {
    throw new Error('No authentication token available');
  }

  const defaultHeaders = {
    Accept: 'application/json',
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
  };

  return fetch(`${api.endpoint}${endpoint}`, {
    ...options,
    headers: {
      ...defaultHeaders,
      ...options.headers,
    },
  });
};