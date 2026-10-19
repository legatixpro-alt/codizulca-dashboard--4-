import { describe, it, expect, vi, beforeEach } from 'vitest';
import { trazabilidadService, validateAndOptimizeCoordinates } from '../lib/trazabilidadService';

describe('Trazabilidad Real GPS & Reverse Geocoding Validation', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  it('never invents fictitious coordinates (10.6542, -71.6241) when coordinates are missing', () => {
    const res = validateAndOptimizeCoordinates(undefined, 'Maracaibo, Zulia');
    expect(res.hasCoordinates).toBe(false);
    expect(res.lat).toBe(0);
    expect(res.lng).toBe(0);
    expect(res.corrected).toBe(false);
  });

  it('preserves exact real 6-decimal GPS coordinates without altering or snapping them to hardcoded zones', () => {
    const realLat = 10.668914;
    const realLng = -71.610482;
    const res = validateAndOptimizeCoordinates(`${realLat}° N, ${realLng}° W`, 'Maracaibo, Zulia');
    expect(res.hasCoordinates).toBe(true);
    expect(res.lat).toBe(realLat);
    expect(res.lng).toBe(realLng);
    expect(res.corrected).toBe(false);
  });

  it('cleans legacy fake seed records and strips fabricated 10.6542, -71.6241 coordinates on load', async () => {
    const legacyRecords = [
      {
        id: 'TRZ-2026-001',
        timestamp: '2026-04-06T08:00:00.000Z',
        formattedDate: '06/04/2026',
        formattedTime: '08:00:00 AM',
        user: {
          name: 'Fake Seed',
          email: 'fake@codizulca.com',
          role: 'Promotora'
        },
        action: {
          type: 'portal_login',
          label: 'Inicio de Sesión',
          status: 'active',
          module: 'Portal Campo'
        },
        device: {
          ip: '190.202.14.88',
          browser: 'Chrome',
          os: 'Android',
          deviceType: 'Móvil',
          connection: 'WiFi',
          locationCity: 'Maracaibo, Zulia',
          gpsVerified: true,
          coordinates: '10.6542° N, -71.6241° W'
        }
      },
      {
        id: 'TRZ-2026-9001',
        timestamp: '2026-10-18T12:00:00.000Z',
        formattedDate: '18/10/2026',
        formattedTime: '12:00:00 PM',
        user: {
          name: 'Rismary',
          email: 'rismary@codizulca.com',
          role: 'Promotora'
        },
        action: {
          type: 'portal_login',
          label: 'Inicio de Sesión en App Móvil',
          status: 'active',
          module: 'Portal Campo (PWA)'
        },
        device: {
          ip: '190.202.166.86',
          browser: 'Chrome Mobile',
          os: 'Android',
          deviceType: 'Móvil',
          connection: 'Red Móvil',
          locationCity: 'Maracaibo, Zulia',
          gpsVerified: false,
          coordinates: '10.6542° N, -71.6241° W'
        }
      }
    ];

    vi.spyOn(globalThis, 'fetch').mockRejectedValueOnce(new Error('Offline'));
    localStorage.setItem('codizulca_trazabilidad_logs', JSON.stringify(legacyRecords));

    const loaded = await trazabilidadService.getAll();

    // Fake seed TRZ-2026-001 must be removed
    expect(loaded.find(r => r.id === 'TRZ-2026-001')).toBeUndefined();

    // Real user log with unverified fabricated 10.6542, -71.6241 must have fake coordinates stripped
    const rismaryLog = loaded.find(r => r.id === 'TRZ-2026-9001');
    expect(rismaryLog).toBeDefined();
    expect(rismaryLog?.device.gpsVerified).toBe(false);
    expect(rismaryLog?.device.coordinates).toBeUndefined();
  });

  it('captures real browser GPS coordinates and reverse-geocodes the exact street address on logConnection', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockImplementation(async (input: RequestInfo | URL) => {
      const url = typeof input === 'string' ? input : input.toString();
      if (url.includes('/api/geo/client-info')) {
        return new Response(JSON.stringify({
          ok: true,
          ip: '186.167.241.19',
          isp: 'Airtek',
          locationCity: 'Maracaibo, Zulia'
        }), { status: 200 });
      }
      if (url.includes('/api/geo/reverse')) {
        return new Response(JSON.stringify({
          ok: true,
          address: 'Av. 15 Delicias, Sector Tierra Negra, Parroquia Olegario Villalobos, Maracaibo, Zulia',
          sector: 'Av. 15 Delicias, Sector Tierra Negra',
          city: 'Maracaibo',
          state: 'Zulia',
          locationCity: 'Maracaibo, Zulia',
          displayName: 'Av. 15 Delicias, Sector Tierra Negra, Parroquia Olegario Villalobos, Maracaibo, Zulia'
        }), { status: 200 });
      }
      if (url.includes('/api/trazabilidad')) {
        return new Response(JSON.stringify([]), { status: 200 });
      }
      return new Response(JSON.stringify({ ok: true }), { status: 200 });
    });

    const mockGeolocation = {
      getCurrentPosition: vi.fn((success) => {
        success({
          coords: {
            latitude: 10.673845,
            longitude: -71.611928,
            accuracy: 8
          }
        });
      })
    };
    Object.defineProperty(globalThis.navigator, 'geolocation', {
      value: mockGeolocation,
      configurable: true
    });

    const event = await trazabilidadService.logConnection(
      {
        name: 'Rismary',
        email: 'rismary@codizulca.com',
        role: 'Promotora'
      },
      true
    );

    expect(event.device.ip).toBe('186.167.241.19');
    expect(event.device.connection).toContain('Airtek');
    expect(event.device.gpsVerified).toBe(true);
    expect(event.device.lat).toBe(10.673845);
    expect(event.device.lng).toBe(-71.611928);
    expect(event.device.accuracy).toBe(8);
    expect(event.device.coordinates).toBe('10.673845° N, -71.611928° W');
    expect(event.device.address).toBe(
      'Av. 15 Delicias, Sector Tierra Negra, Parroquia Olegario Villalobos, Maracaibo, Zulia'
    );
    expect(fetchMock).toHaveBeenCalled();
  });
});
