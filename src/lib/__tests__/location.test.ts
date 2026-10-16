import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { calculateDistance, getCurrentPosition } from '../location';

describe('location.ts - Geolocation and Distance Test Suite', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // =========================================================================
  // 1. HAPPY PATH (Casos de Éxito)
  // =========================================================================
  describe('Happy Path (Flujos de Éxito)', () => {
    it('debe calcular 0 metros cuando ambas coordenadas son idénticas', () => {
      const lat = 10.6543;
      const lon = -71.6321;
      const distance = calculateDistance(lat, lon, lat, lon);
      expect(distance).toBe(0);
    });

    it('debe calcular la distancia precisa entre dos tiendas de Maracaibo (Bella Vista vs Delicias)', () => {
      // Coordenadas aproximadas en Maracaibo
      const bellaVista = { lat: 10.6558, lon: -71.6111 };
      const delicias = { lat: 10.6720, lon: -71.6250 };

      const distance = calculateDistance(bellaVista.lat, bellaVista.lon, delicias.lat, delicias.lon);

      // Aproximadamente entre 2.2 km y 2.5 km (2200m - 2500m)
      expect(distance).toBeGreaterThan(2000);
      expect(distance).toBeLessThan(3000);
    });

    it('getCurrentPosition debe resolver la posición cuando la geolocalización tiene éxito', async () => {
      const mockPosition = {
        coords: {
          latitude: 10.65,
          longitude: -71.63,
          accuracy: 10,
          altitude: null,
          altitudeAccuracy: null,
          heading: null,
          speed: null
        },
        timestamp: Date.now()
      };

      const mockGeolocation = {
        getCurrentPosition: vi.fn().mockImplementation((success) => success(mockPosition))
      };
      vi.stubGlobal('navigator', { geolocation: mockGeolocation });

      const pos = await getCurrentPosition();
      expect(pos.coords.latitude).toBe(10.65);
      expect(pos.coords.longitude).toBe(-71.63);
      expect(pos.coords.accuracy).toBe(10);
    });
  });

  // =========================================================================
  // 2. CASOS BORDE (Edge Cases & Boundaries)
  // =========================================================================
  describe('Casos Borde y Valores Límite (Edge Cases)', () => {
    it('debe calcular la distancia en los polos (North Pole a South Pole) sin arrojar NaN', () => {
      const distance = calculateDistance(90, 0, -90, 0);
      expect(Number.isNaN(distance)).toBe(false);
      // Media circunferencia de la Tierra ~20,015 km = 20,015,000 m
      expect(distance).toBeGreaterThan(19000000);
      expect(distance).toBeLessThan(21000000);
    });

    it('debe manejar coordenadas en el meridiano de Greenwich (0, 0)', () => {
      const distance = calculateDistance(0, 0, 0, 1);
      expect(Number.isNaN(distance)).toBe(false);
      // 1 grado en el ecuador es aprox 111 km (111,000 m)
      expect(distance).toBeGreaterThan(110000);
      expect(distance).toBeLessThan(113000);
    });

    it('debe calcular distancias submétricas (< 1 metro) con precisión', () => {
      const distance = calculateDistance(10.000001, -71.000000, 10.000000, -71.000000);
      expect(distance).toBeGreaterThan(0);
      expect(distance).toBeLessThan(1);
    });
  });

  // =========================================================================
  // 3. MANEJO DE EXCEPCIONES Y ERRORES (Error Handling)
  // =========================================================================
  describe('Manejo de Errores y Excepciones de Geolocalización', () => {
    it('debe rechazar con error amigable si el navegador no soporta geolocalización', async () => {
      vi.stubGlobal('navigator', {});

      await expect(getCurrentPosition()).rejects.toThrow('Geolocalización no soportada por el navegador.');
    });

    it('debe rechazar con mensaje amigable cuando PERMISSION_DENIED (código 1)', async () => {
      const mockError = { code: 1, PERMISSION_DENIED: 1, POSITION_UNAVAILABLE: 2, TIMEOUT: 3 };
      const mockGeolocation = {
        getCurrentPosition: vi.fn().mockImplementation((_success, error) => error(mockError))
      };
      vi.stubGlobal('navigator', { geolocation: mockGeolocation });

      await expect(getCurrentPosition()).rejects.toThrow('Permiso de ubicación denegado.');
    });

    it('debe rechazar con mensaje amigable cuando POSITION_UNAVAILABLE (código 2)', async () => {
      const mockError = { code: 2, PERMISSION_DENIED: 1, POSITION_UNAVAILABLE: 2, TIMEOUT: 3 };
      const mockGeolocation = {
        getCurrentPosition: vi.fn().mockImplementation((_success, error) => error(mockError))
      };
      vi.stubGlobal('navigator', { geolocation: mockGeolocation });

      await expect(getCurrentPosition()).rejects.toThrow('Información de ubicación no disponible.');
    });

    it('debe rechazar con mensaje amigable cuando TIMEOUT (código 3)', async () => {
      const mockError = { code: 3, PERMISSION_DENIED: 1, POSITION_UNAVAILABLE: 2, TIMEOUT: 3 };
      const mockGeolocation = {
        getCurrentPosition: vi.fn().mockImplementation((_success, error) => error(mockError))
      };
      vi.stubGlobal('navigator', { geolocation: mockGeolocation });

      await expect(getCurrentPosition()).rejects.toThrow('Tiempo de espera agotado.');
    });
  });
});
