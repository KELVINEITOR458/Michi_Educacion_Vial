import Constants from 'expo-constants';
import { Platform } from 'react-native';

const DEFAULT_BASE_URL = 'http://192.168.68.121:3002'; 

export class ApiClient {
  private baseUrl: string;

  constructor(baseUrl?: string) {
    // In web, prefer localhost to avoid CORS from LAN IP; in native, use extra.API_BASE_URL if provided
    const isWeb = Platform.OS === 'web';
    const configured = Constants.expoConfig?.extra?.API_BASE_URL as string | undefined;
    this.baseUrl = baseUrl || (isWeb ? DEFAULT_BASE_URL : configured || DEFAULT_BASE_URL);
  }

  async request<T>(path: string, options: RequestInit = {}): Promise<T> {
    const url = `${this.baseUrl}${path}`;

    const res = await fetch(url, {
      headers: {
        'Content-Type': 'application/json',
        ...(options.headers || {}),
      },
      ...options,
    });
    if (!res.ok) {
      let body: any = null;
      try {
        body = await res.json();
      } catch {
        // ignore JSON parse error
      }
      const text = body?.message || body?.error || (await res.text());
      throw new Error(text || `HTTP ${res.status}`);
    }
    return res.json();
  }
}

export const api = new ApiClient();
