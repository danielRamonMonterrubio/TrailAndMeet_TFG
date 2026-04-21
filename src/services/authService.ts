import { supabase } from "./supabaseClient";
import Config from 'react-native-config'

const API_URL = Config.SUPABASE_URL
const ANON_KEY = Config.SUPABASE_ANON_KEY

export async function checkEmailExists(email: string): Promise<boolean> {
  try {
    const response = await fetch(`${API_URL}/functions/v1/auth-check-email`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${ANON_KEY}`,
      },
      body: JSON.stringify({ email }),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    console.log('📧 checkEmailExists response:', data);
    return data.exists;
  } catch (error) {
    console.error("Error comprobando email:", error);
    throw error;
  }
}

export async function checkUsernameExists(username: string): Promise<boolean> {
  try {
    const response = await fetch(`${API_URL}/functions/v1/auth-check-username`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${ANON_KEY}`,
      },
      body: JSON.stringify({ username }),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    return data.exists;
  } catch (error) {
    console.error("Error comprobando username:", error);
    throw error;
  }
}

export async function completeRegistration(username: string, token: string) {
  try {
    const response = await fetch(`${API_URL}/functions/v1/auth-complete-registration`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({ username }),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error("Error completando registro:", error);
    throw error;
  }
}

export async function login(email: string, password: string) {
  try {
    const response = await fetch(`${API_URL}/functions/v1/auth-login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${ANON_KEY}`,
      },
      body: JSON.stringify({ email, password }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Login fallido');
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error("Error login:", error);
    throw error;
  }
}

export async function logout(token: string) {
  try {
    const response = await fetch(`${API_URL}/functions/v1/auth-logout`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${ANON_KEY}`,
      },
      body: JSON.stringify({ token }),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error("Error cerrando sesión:", error);
    throw error;
  }
}