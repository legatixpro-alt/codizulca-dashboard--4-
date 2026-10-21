import { describe, it, expect, beforeEach } from 'vitest';
import {
  checkCanAccessTrazabilidad,
  DASHBOARD_CORPORATE_PROFILES,
  resolveCorporateProfile,
} from '../lib/auth';
import {
  campoService,
  PROMOTERS_LIST,
  TastingSurveyPayload,
  PriceSurveyPayload,
  InventoryLogPayload,
  ShelfScanPayload,
  mapSupabasePriceRowToPayload,
  mapSupabaseInventoryRowToPayload,
  isSyntheticPriceOrInventoryRow,
  resolvePromoterNameFromRaw,
} from '../lib/campoService';
import { checkinsService } from '../lib/checkinsService';
import { merchandisingService } from '../lib/merchandisingService';
import { degustacionesService } from '../lib/degustacionesService';

describe('Restricción de Acceso a Trazabilidad y Sincronización App Promotoras -> Trade Marketing', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  describe('1. Control de Acceso Estricto al Módulo de Trazabilidad', () => {
    it('permite acceso exclusivamente a Gerente Nacional y Administrador General', () => {
      expect(
        checkCanAccessTrazabilidad({
          role: 'Administrador General',
          email: 'admin@codi.com',
          fullName: 'Administrador General',
        })
      ).toBe(true);

      expect(
        checkCanAccessTrazabilidad({
          role: 'Gerente Nacional',
          email: 'gerencia@codizulca.com',
          fullName: 'Gerente Nacional',
        })
      ).toBe(true);
    });

    it('bloquea acceso a Supervisores, Coordinación Trade Marketing, Vendedores y Promotoras', () => {
      expect(
        checkCanAccessTrazabilidad({
          role: 'Supervisor Comercial',
          email: 'johnatan.soto@codizulca.com',
          fullName: 'Johnatan Soto',
        })
      ).toBe(false);

      expect(
        checkCanAccessTrazabilidad({
          role: 'Supervisor Comercial',
          email: 'ali.perez@codizulca.com',
          fullName: 'Ali Perez',
        })
      ).toBe(false);

      expect(
        checkCanAccessTrazabilidad({
          role: 'Coordinador Trade Marketing',
          email: 'trademarketing@codizulca.com',
          fullName: 'Coordinación Trade Marketing',
        })
      ).toBe(false);

      expect(
        checkCanAccessTrazabilidad({
          role: 'Impulsadora',
          email: 'dariannysferrer23@gmail.com',
          fullName: 'DARIANNYS FERRER',
        })
      ).toBe(false);

      expect(
        checkCanAccessTrazabilidad({
          role: 'Promotora',
          email: 'luzz010203@gmail.com',
          fullName: 'OSMAIRY VILLASMIL',
        })
      ).toBe(false);

      expect(
        checkCanAccessTrazabilidad({
          role: 'Promotor Merchandising',
          email: 'joseabraham.barroso@gmail.com',
          fullName: 'JOSE BARROSO',
        })
      ).toBe(false);
    });

    it('verifica que los perfiles corporativos estén correctamente configurados', () => {
      expect(DASHBOARD_CORPORATE_PROFILES.length).toBe(6);
      const allowedProfiles = DASHBOARD_CORPORATE_PROFILES.filter((p) => p.canViewTrazabilidad);
      expect(allowedProfiles.map((p) => p.roleLabel)).toEqual([
        'Administrador General',
        'Gerente Nacional',
      ]);

      expect(resolveCorporateProfile('gerencia@codizulca.com').roleLabel).toBe('Gerente Nacional');
      expect(resolveCorporateProfile('admin@codi.com').roleLabel).toBe('Administrador General');
      expect(resolveCorporateProfile('johnatan.soto@codizulca.com').canViewTrazabilidad).toBe(false);
      expect(resolveCorporateProfile('trademarketing@codizulca.com').canViewTrazabilidad).toBe(false);
      expect(resolveCorporateProfile('Grecia01@codizulca.com').roleKey).toBe('trade_marketing');
      expect(resolveCorporateProfile('Grecia01@codizulca.com').roleLabel).toBe('Coordinadora Trade Marketing');
      expect(resolveCorporateProfile('Grecia01@codizulca.com').canViewTrazabilidad).toBe(false);
      expect(resolveCorporateProfile('Gisbell01@codizulca.com').roleKey).toBe('administrativo');
      expect(resolveCorporateProfile('Gisbell01@codizulca.com').roleLabel).toBe('Administrativo');
      expect(resolveCorporateProfile('Gisbell01@codizulca.com').canViewTrazabilidad).toBe(false);
    });
  });

  describe('2. Sincronización Exacta de Datos de Promotoras hacia Trade Marketing', () => {
    it('sincroniza Encuestas de Degustación (Corta y Larga) cargadas por las promotoras', async () => {
      const survey: TastingSurveyPayload = {
        id: 'SURV-TEST-001',
        date: '2026-10-18T14:00:00.000Z',
        store: 'ALKOSTO DONDE COMPRAR ES GANAR, C.A. (AV DELICIAS)',
        promoter: 'DARIANNYS FERRER',
        type: 'extendida',
        productName: 'Mortadela Tapara Especial 1kg',
        ratingOverall: 5,
        purchaseIntent: 'SI',
        sensoryRatings: { sabor: 5, textura: 5, aroma: 5 },
        comments: 'Excelente aceptación del cliente en degustación',
      };

      await campoService.saveTastingSurvey(survey);
      const allSurveys = await campoService.getTastingSurveys();
      const found = allSurveys.find((s) => s.id === 'SURV-TEST-001');
      expect(found).toBeDefined();
      expect(found?.promoter).toBe('DARIANNYS FERRER');
      expect(found?.store).toContain('ALKOSTO');
      expect(found?.ratingOverall).toBe(5);
    });

    it('sincroniza Relevamientos de Precios cargados por las promotoras hacia Trade Marketing', async () => {
      const pricePayload: PriceSurveyPayload = {
        id: 'PRICE-TEST-001',
        date: '2026-10-18T14:15:00.000Z',
        store: 'ALKOSTO DONDE COMPRAR ES GANAR, C.A. (CABIMAS)',
        promoter: 'SCARLETH PIÑA',
        productName: 'Pechuga de Pavo Asturias',
        ownPriceUsd: 9.5,
        ownPriceBs: 350.08,
        bcvRate: 36.85,
        competitors: [
          { name: 'Plumrose', priceUsd: 10.2, priceBs: 375.87, diffPercent: 7.4 },
        ],
        observations: 'Mejor precio en anaquel refrigerado',
      };

      await campoService.savePriceSurvey(pricePayload);
      const allPrices = await campoService.getPriceSurveys();
      const found = allPrices.find((p) => p.id === 'PRICE-TEST-001');
      expect(found).toBeDefined();
      expect(found?.promoter).toBe('SCARLETH PIÑA');
      expect(found?.ownPriceUsd).toBe(9.5);
      expect(found?.competitors[0].name).toBe('Plumrose');
    });

    it('sincroniza Control de Inventario y Rotación cargado por las promotoras hacia Trade Marketing', async () => {
      const invPayload: InventoryLogPayload = {
        id: 'INV-TEST-001',
        date: '2026-10-18T15:00:00.000Z',
        store: 'ALKOSTO DONDE COMPRAR ES GANAR, C.A. (LA COROMOTO)',
        promoter: 'OSMAIRY VILLASMIL',
        productName: 'Jamón Cocido de Pavo Asturias',
        initialStock: 50,
        tastingsGiven: 12,
        finalStock: 18,
        netRotation: 20,
        observations: 'Alta rotación durante la jornada de impulso',
      };

      await campoService.saveInventoryLog(invPayload);
      const allInv = await campoService.getInventoryLogs();
      const found = allInv.find((i) => i.id === 'INV-TEST-001');
      expect(found).toBeDefined();
      expect(found?.promoter).toBe('OSMAIRY VILLASMIL');
      expect(found?.tastingsGiven).toBe(12);
      expect(found?.netRotation).toBe(20);
    });

    it('sincroniza Escaneo Inteligente de Góndolas IA y Reportes de Merchandising hacia Trade Marketing', async () => {
      const scanPayload: ShelfScanPayload = {
        id: 'SCAN-TEST-001',
        date: '2026-10-18T15:30:00.000Z',
        store: 'ALKOSTO DONDE COMPRAR ES GANAR, C.A. (ZONA INDUSTRIAL)',
        category: 'Embutidos Cocidos',
        photos: ['data:image/jpeg;base64,test'],
        metrics: {
          ourFacings: 14,
          competitorFacings: 10,
          totalFacings: 24,
          shareOfShelfPercent: 58,
          shelfLevel: 'OJOS',
          outOfStockDetected: false,
          popDetected: true,
        },
        competitorBrandsObserved: ['Plumrose', 'Hermo'],
        promoter: 'ana echeverria',
      };

      await campoService.saveShelfScan(scanPayload);
      const merchReports = await merchandisingService.getAll();
      const foundScanInMerch = merchReports.find((r) => r.id === 'SCAN-TEST-001');
      expect(foundScanInMerch).toBeDefined();
      expect(foundScanInMerch?.promoter).toBe('ana echeverria');
      expect(foundScanInMerch?.metrics?.shareOfShelfPercent).toBe(58);
    });

    it('sincroniza Asistencia con GPS y Selfie hacia Trade Marketing', async () => {
      const checkinRes = await checkinsService.createCheckIn({
        date: '2026-10-18T13:00:00.000Z',
        type: 'Ingreso',
        store: 'ALKOSTO TRIBUNALES',
        photoBase64: 'data:image/jpeg;base64,selfie',
        location: { lat: 10.6543, lng: -71.6321, accuracy: 8 },
        promoter: 'TANIA CARDENAS',
        creatorId: 'STF-012',
      });

      const allCheckins = await checkinsService.getAllCheckIns();
      const found = allCheckins.find((c) => c.id === checkinRes.record.id);
      expect(found).toBeDefined();
      expect(found?.promoter).toBe('TANIA CARDENAS');
      expect(found?.store).toBe('ALKOSTO TRIBUNALES');
    });

    it('verifica que las 24 promotoras y mercaderistas tengan perfiles completos con correo e ID', () => {
      expect(PROMOTERS_LIST.length).toBe(24);
      for (const p of PROMOTERS_LIST) {
        expect(p.id).toMatch(/^STF-\d{3}$/);
        expect(p.email).toContain('@');
        expect(p.name.length).toBeGreaterThan(2);
      }
    });

    it('mapea de forma exacta los registros reales de Supabase (prices e inventory) enviados desde la App de Promotoras', () => {
      const supabasePriceRow = {
        id: 'dd769a1f-e701-4161-ba59-6b6217289295',
        date: '2026-10-18T00:34:03.922Z',
        store: 'Comercializadora y Distribuidora FC',
        ourProduct: 'Embutidos (Mortadela, Salchichas...) - Paquete',
        ourPrice: 20.07,
        competitor1Brand: 'Mortadela de pollo el corral 1Kg x10und ',
        competitor1Price: 32,
        competitor2Brand: 'Mortadela de pollo Recao 1Kg x10 und ',
        competitor2Price: 30.54,
        competitor3Brand: 'Mortadela de pollo Plumrose 1kg x10 und ',
        competitor3Price: 25,
        comments: '',
        creatorId: '3e0b2b81-4785-41f3-8a15-e66ff02ae0ad',
        promoter: 'JULIANNYS GIL',
        created_at: '2026-10-18T00:34:03.925+00:00',
      };

      expect(isSyntheticPriceOrInventoryRow(supabasePriceRow)).toBe(false);
      const mappedPrice = mapSupabasePriceRowToPayload(supabasePriceRow);
      expect(mappedPrice.id).toBe('dd769a1f-e701-4161-ba59-6b6217289295');
      expect(mappedPrice.promoter).toBe('JULIANNYS GIL');
      expect(mappedPrice.store).toBe('Comercializadora y Distribuidora FC');
      expect(mappedPrice.productName).toBe('Embutidos (Mortadela, Salchichas...) - Paquete');
      expect(mappedPrice.ownPriceUsd).toBe(20.07);
      expect(mappedPrice.competitors.length).toBe(3);
      expect(mappedPrice.competitors[0].name).toBe('Mortadela de pollo el corral 1Kg x10und');
      expect(mappedPrice.competitors[0].priceUsd).toBe(32);

      const supabaseInvRow = {
        id: 'a1dca447-be8c-4f9f-871c-f35ce54cb0d7',
        date: '2026-10-17T22:41:28.690Z',
        store: 'Alkosto de delicias ',
        product: 'Embutidos (Mortadela, Salchichas...) - Unidad',
        initialQuantity: 28.06,
        finalQuantity: 23.05,
        degustations: 0,
        comments: 'Rotación continua en charcutería',
        creatorId: '1d60249d-6731-4c19-9e80-26399fedb866',
        promoter: 'DARIANNYS FERRER',
        created_at: '2026-10-17T22:41:30.847751+00:00',
      };

      expect(isSyntheticPriceOrInventoryRow(supabaseInvRow)).toBe(false);
      const mappedInv = mapSupabaseInventoryRowToPayload(supabaseInvRow);
      expect(mappedInv.id).toBe('a1dca447-be8c-4f9f-871c-f35ce54cb0d7');
      expect(mappedInv.promoter).toBe('DARIANNYS FERRER');
      expect(mappedInv.store).toBe('Alkosto de delicias');
      expect(mappedInv.initialStock).toBe(28.06);
      expect(mappedInv.finalStock).toBe(23.05);
      expect(mappedInv.netRotation).toBe(5.01);

      // Resuelve el nombre de promotora cuando el registro trae correo o UID en creatorId
      expect(resolvePromoterNameFromRaw('', 'valevalentina0111@gmail.com')).toBe('VALERIA ACEVEDO');
      expect(resolvePromoterNameFromRaw('scarmichell22@gmail.com', 'scarmichell22@gmail.com')).toBe('SCARLETH PIÑA');

      // Filtra registros semilla ficticios (admin / Supermercado A / Abasto B)
      expect(
        isSyntheticPriceOrInventoryRow({
          id: 'ef235819-47b1-4523-ac24-3c39bea18ad5',
          creatorId: 'admin',
          promoter: '',
          store: 'Supermercado De Candido',
        })
      ).toBe(true);
    });
  });
});
