import { CARTERA_CLIENTES, ClienteItem } from './carteraClientes';
import { getSellerMetadata, normalizeSellerName } from '../components/cuotas/sellerSupervisorMap';
import rawSurveyData from './surveyLocations.json';

export interface ClientSurveyData {
  surveyId: string;
  clienteId: string;
  clienteNombre: string;
  vendedorEmail: string;
  vendedor: string;
  estadoEncuesta: 'COMPLETA' | 'PENDIENTE' | 'MODIFICADA' | string;
  tipoCliente: string;
  rifCedula: string;
  telefono: string;
  email: string;
  estado: string;
  municipio: string;
  latitud: number;
  longitud: number;
  notas: string;
  fecha: string;
  matchedWithCartera: boolean;
}

export interface EnrichedClient {
  id: string;
  nombre: string;
  vendedor: string;
  supervisor: string;
  zona: string;
  region: string;
  canal: string;
  sector: string;
  activo: boolean;
  hasLocation: boolean;
  survey?: ClientSurveyData;
}

// Clean normalize helper
function normalizeForMatch(text: string): string {
  if (!text) return '';
  return text
    .toUpperCase()
    .replace(/[.,;\"'()]/g, ' ')
    .replace(/\b(C\s*A|S\s*A|F\s*P|E\s*I\s*R\s*L|S\s*R\s*L)\b/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Calcula con precisión el sector comercial / urbanización a partir de coordenadas exactas,
 * municipio, estado y zona de ruta comercial del vendedor asignado.
 */
export function calculateClientSector(params: {
  latitud?: number;
  longitud?: number;
  municipio?: string;
  estado?: string;
  vendedorZona?: string;
  vendedor?: string;
}): string {
  const { latitud, longitud, municipio, estado, vendedorZona } = params;

  if (typeof latitud === 'number' && typeof longitud === 'number' && !isNaN(latitud) && !isNaN(longitud)) {
    // 1. Falcón (Punto Fijo, Coro, Dabajuro)
    if (latitud >= 11.60 && longitud >= -70.35 && longitud <= -70.10) {
      return 'Sector Carirubana / Punto Fijo';
    }
    if (latitud >= 11.30 && latitud <= 11.55 && longitud >= -69.85 && longitud <= -69.55) {
      return 'Sector Coro Centro';
    }
    if (latitud >= 10.95 && latitud <= 11.20 && longitud >= -70.80 && longitud <= -70.55) {
      return 'Sector Dabajuro';
    }
    if (latitud >= 10.75 && latitud <= 10.95 && longitud >= -71.10 && longitud <= -70.85) {
      return 'Sector Mene de Mauroa';
    }

    // 2. Zulia - Costa Oriental del Lago
    if (latitud >= 10.35 && latitud <= 10.50 && longitud >= -71.55 && longitud <= -71.40) {
      return 'Sector Cabimas Centro / Ambrosio';
    }
    if (latitud >= 10.15 && latitud <= 10.35 && longitud >= -71.40 && longitud <= -71.25) {
      return 'Sector Ciudad Ojeda / Lagunillas';
    }
    if (latitud >= 10.20 && latitud <= 10.35 && longitud >= -71.48 && longitud <= -71.30) {
      return 'Sector Simón Bolívar / Tía Juana';
    }
    if (latitud >= 10.65 && latitud <= 10.82 && longitud >= -71.58 && longitud <= -71.45) {
      return 'Sector Miranda / Los Puertos';
    }
    if (latitud >= 10.50 && latitud <= 10.65 && longitud >= -71.58 && longitud <= -71.45) {
      return 'Sector Santa Rita';
    }

    // 3. Zulia - Perijá y Sur del Lago
    if (latitud >= 9.95 && latitud <= 10.15 && longitud >= -72.70 && longitud <= -72.45) {
      return 'Sector Machiques Centro';
    }
    if (latitud >= 10.25 && latitud <= 10.45 && longitud >= -72.40 && longitud <= -72.20) {
      return 'Sector La Villa del Rosario';
    }
    if (latitud >= 8.90 && latitud <= 9.20 && longitud >= -72.00 && longitud <= -71.70) {
      return 'Sector Santa Bárbara / Colón';
    }

    // 4. Andes / Trujillo
    if (latitud >= 9.20 && latitud <= 9.75 && longitud >= -70.80 && longitud <= -70.20) {
      return 'Sector Boconó / Trujillo';
    }

    // 5. Zulia - San Francisco & Sur Metropolitano
    if (latitud >= 10.45 && latitud < 10.55 && longitud >= -71.75 && longitud <= -71.60) {
      return 'Sector Los Cortijos / Km 4 a Km 18';
    }
    if (latitud >= 10.55 && latitud < 10.62 && longitud >= -71.70 && longitud <= -71.60) {
      return 'Sector San Francisco / Coromoto';
    }
    if (latitud >= 10.35 && latitud < 10.45 && longitud >= -71.80 && longitud <= -71.65) {
      return 'Sector La Cañada de Urdaneta';
    }

    // 6. Zulia - Maracaibo (Polígonos comerciales históricos)
    if (latitud >= 10.62 && latitud < 10.65 && longitud >= -71.66 && longitud <= -71.60) {
      return 'Sector Sabaneta / Pomona';
    }
    if (latitud >= 10.63 && latitud < 10.665 && longitud >= -71.62 && longitud <= -71.585) {
      return 'Sector Casco Central / El Milagro';
    }
    if (latitud >= 10.665 && latitud <= 10.70 && longitud >= -71.62 && longitud <= -71.585) {
      return 'Sector Bella Vista / Santa Lucía';
    }
    if (latitud >= 10.65 && latitud <= 10.70 && longitud >= -71.655 && longitud < -71.62) {
      return 'Sector 5 de Julio / Cecilio Acosta';
    }
    if (latitud >= 10.64 && latitud <= 10.71 && longitud >= -71.72 && longitud < -71.655) {
      return 'Sector La Limpia / Curva de Molina';
    }
    if (latitud > 10.70 && latitud <= 10.82 && longitud >= -71.70 && longitud <= -71.58) {
      return 'Sector Maracaibo Norte / San Jacinto';
    }
    if (latitud > 10.82 && longitud >= -71.90 && longitud <= -71.60) {
      return 'Sector Mara / El Moján';
    }
  }

  // Fallback si no tiene GPS o está fuera de rangos específicos
  if (municipio && municipio.trim() && municipio.toUpperCase() !== 'ZULIA') {
    return `Sector ${municipio.trim()}`;
  }

  if (vendedorZona && vendedorZona.trim()) {
    return vendedorZona.startsWith('Sector') ? vendedorZona.trim() : `Sector ${vendedorZona.trim()}`;
  }

  return 'Sector Comercial Zulia';
}

export const SURVEY_DATA: ClientSurveyData[] = rawSurveyData as ClientSurveyData[];

// Build lookup dictionary by client name, ID, and RIF with coordinate prioritization
const surveyByName = new Map<string, ClientSurveyData>();
const surveyById = new Map<string, ClientSurveyData>();
const surveyByRif = new Map<string, ClientSurveyData>();

const registerSurveyItem = (key: string, item: ClientSurveyData, map: Map<string, ClientSurveyData>) => {
  if (!key) return;
  const existing = map.get(key);
  const itemHasGps = Boolean(item.latitud && item.longitud);

  if (!existing) {
    map.set(key, item);
  } else {
    const existingHasGps = Boolean(existing.latitud && existing.longitud);
    // Prioritize survey with GPS coordinates, regardless of status (COMPLETA, PENDIENTE, MODIFICADA)
    if (itemHasGps && !existingHasGps) {
      map.set(key, item);
    } else if (itemHasGps && existingHasGps) {
      // Both have GPS, prefer the latest or COMPLETA if dates equal
      map.set(key, item);
    }
  }
};

SURVEY_DATA.forEach((item) => {
  if (item.clienteNombre) {
    registerSurveyItem(normalizeForMatch(item.clienteNombre), item, surveyByName);
  }
  if (item.clienteId) {
    registerSurveyItem(String(item.clienteId).toUpperCase(), item, surveyById);
  }
  if (item.rifCedula) {
    registerSurveyItem(normalizeForMatch(item.rifCedula), item, surveyByRif);
  }
});

// Create fully consolidated client list
export const ENRICHED_CLIENTS: EnrichedClient[] = (() => {
  const result: EnrichedClient[] = [];
  const processedSurveyIds = new Set<string>();

  // 1. Process all existing cartera clients
  CARTERA_CLIENTES.forEach((c) => {
    const norm = normalizeForMatch(c.nombre);

    // Look for survey match by ID, RIF, or Name
    let surveyMatch = 
      surveyById.get(String(c.id).toUpperCase()) || 
      (c.rif ? surveyByRif.get(normalizeForMatch(c.rif)) : undefined) ||
      surveyByName.get(norm);

    if (!surveyMatch) {
      // Substring fuzzy matching for slightly varied legal names
      for (const [sName, sData] of surveyByName.entries()) {
        if ((norm.length > 6 && sName.includes(norm)) || (sName.length > 6 && norm.includes(sName))) {
          surveyMatch = sData;
          break;
        }
      }
    }

    if (surveyMatch) {
      processedSurveyIds.add(surveyMatch.surveyId);
    }

    // Determine canonical vendedor (prioritize the surveyor who visited in the field)
    const rawVendedor = (surveyMatch && surveyMatch.vendedor && surveyMatch.vendedor !== 'SIN ASIGNAR') 
      ? surveyMatch.vendedor 
      : (c.vendedor || 'SIN ASIGNAR');
    const effectiveVendedor = normalizeSellerName(rawVendedor) || 'SIN ASIGNAR';

    const meta = getSellerMetadata(effectiveVendedor);
    const hasGps = Boolean(surveyMatch && typeof surveyMatch.latitud === 'number' && typeof surveyMatch.longitud === 'number');

    const calculatedSector = calculateClientSector({
      latitud: surveyMatch?.latitud,
      longitud: surveyMatch?.longitud,
      municipio: surveyMatch?.municipio,
      estado: surveyMatch?.estado,
      vendedorZona: meta.zona,
      vendedor: effectiveVendedor,
    });

    result.push({
      id: String(c.id),
      nombre: c.nombre,
      vendedor: effectiveVendedor,
      supervisor: meta.supervisor || 'NELSON FINOL',
      zona: surveyMatch && surveyMatch.municipio ? `${surveyMatch.municipio}, ${surveyMatch.estado || 'ZULIA'}` : (meta.zona || 'ZULIA'),
      region: c.region || 'OCCIDENTE',
      canal: c.canal || (surveyMatch ? surveyMatch.tipoCliente : 'GENERAL'),
      sector: calculatedSector,
      activo: c.activo !== false,
      hasLocation: hasGps,
      survey: surveyMatch,
    });
  });

  // 2. Add survey entries that were surveyed in the field as new prospect/clients
  SURVEY_DATA.forEach((s) => {
    if (!processedSurveyIds.has(s.surveyId)) {
      const cleanVendedor = normalizeSellerName(s.vendedor) || 'SIN ASIGNAR';
      const meta = getSellerMetadata(cleanVendedor);
      const hasGps = Boolean(typeof s.latitud === 'number' && typeof s.longitud === 'number');

      const calculatedSector = calculateClientSector({
        latitud: s.latitud,
        longitud: s.longitud,
        municipio: s.municipio,
        estado: s.estado,
        vendedorZona: meta.zona,
        vendedor: cleanVendedor,
      });

      result.push({
        id: s.clienteId || s.surveyId,
        nombre: s.clienteNombre,
        vendedor: cleanVendedor,
        supervisor: meta.supervisor || 'NELSON FINOL',
        zona: s.municipio ? `${s.municipio}, ${s.estado || 'ZULIA'}` : (meta.zona || 'ZULIA'),
        region: 'OCCIDENTE',
        canal: s.tipoCliente || 'GENERAL',
        sector: calculatedSector,
        activo: true,
        hasLocation: hasGps,
        survey: s,
      });
    }
  });

  return result;
})();

// Calculate survey stats strictly based on valid GPS coordinates (whether COMPLETA, PENDIENTE, or MODIFICADA)
const clientsWithCoords = ENRICHED_CLIENTS.filter((c) => c.hasLocation && c.survey?.latitud && c.survey?.longitud);

export const SURVEY_STATS = {
  totalClients: ENRICHED_CLIENTS.length,
  totalWithGps: clientsWithCoords.length,
  completasCount: clientsWithCoords.filter((c) => c.survey?.estadoEncuesta?.toUpperCase() === 'COMPLETA').length,
  modificadasCount: clientsWithCoords.filter((c) => c.survey?.estadoEncuesta?.toUpperCase() === 'MODIFICADA').length,
  pendientesCount: clientsWithCoords.filter((c) => c.survey?.estadoEncuesta?.toUpperCase() === 'PENDIENTE').length,
  municipios: Array.from(new Set(clientsWithCoords.map((c) => c.survey?.municipio).filter(Boolean))).sort() as string[],
  estados: Array.from(new Set(clientsWithCoords.map((c) => c.survey?.estado).filter(Boolean))).sort() as string[],
};
