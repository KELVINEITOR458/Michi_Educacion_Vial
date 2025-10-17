import Constants from 'expo-constants';
import { Platform } from 'react-native';

const DEFAULT_BASE_URL = 'http://192.168.100.159:3003';

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

// Servicio de Puzzle para manejar imágenes de rompecabezas
export class PuzzleApi {
  static async getImage(filename?: string): Promise<{ imageUrl: string }> {
    try {
      // Intentar obtener imagen del servidor con filename específico
      const api = new ApiClient();
      const params = filename ? `?filename=${filename}` : '';
      return await api.request(`/api/puzzle/image${params}`);
    } catch (error) {
      console.warn('Error getting puzzle image from server:', error);
      // Fallback a imagen local basada en filename
      const fallbackUrl = filename?.includes('personaje1')
        ? 'local://personaje1.png'
        : filename?.includes('personaje2')
        ? 'local://personaje2.png'
        : 'local://personaje1.png';
      return { imageUrl: fallbackUrl };
    }
  }

  static async getPieces(gridSize: number, filename?: string): Promise<{ pieces: Array<{ url: string; row: number; col: number }> }> {
    try {
      const api = new ApiClient();
      const params = `?gridSize=${gridSize}&filename=${filename || 'personaje1.png'}`;
      return await api.request(`/api/puzzle/images${params}`);
    } catch (error) {
      console.warn('Error getting puzzle pieces from server:', error);
      // Fallback: devolver array vacío para usar generación local
      return { pieces: [] };
    }
  }

  static async getAvailableImages(): Promise<{ images: Array<{ id: string; name: string; url: string }> }> {
    try {
      const api = new ApiClient();
      return await api.request('/api/puzzle/images');
    } catch (error) {
      console.warn('Error getting puzzle images from server:', error);
      // Fallback a imágenes locales
      return {
        images: [
          { id: 'quizVial', name: 'Educación Vial', url: 'local://quizVial.png' },
          { id: 'personaje1', name: 'Personaje 1', url: 'local://personaje1.png' },
          { id: 'personaje2', name: 'Personaje 2', url: 'local://personaje2.png' }
        ]
      };
    }
  }

  static async postResult(data: { userId: string; time: number; completed: boolean; difficulty: string }): Promise<void> {
    try {
      const api = new ApiClient();
      await api.request('/api/puzzle/result', {
        method: 'POST',
        body: JSON.stringify(data),
      });
    } catch (error) {
      console.warn('Error posting puzzle result:', error);
      // No lanzar error aquí ya que es opcional
    }
  }
}

export const api = new ApiClient();
