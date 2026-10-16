export interface SellerMetadata {
  vendedor: string;
  supervisor: string;
  zona: string;
  region: string;
}

// Vendedores comerciales activos sincronizados con el Google Sheet oficial (Ventas, Clientes, Cuotas Volumen, Cuotas de Activacion y Supervisores)
export const VALID_VOLUME_SELLERS = new Set<string>([
  'ADEL JARABA',
  'ALI PEREZ',
  'ANGELICA MORENO',
  'CARLOS FUENMAYOR',
  'CUENTAS CLAVE 1 - MC',
  'CUENTAS CLAVE 2 - SV',
  'EDUARDO PIÑA',
  'ELISA SOLER',
  'FOOD SERVICE SENIOR - JUAN HERNANDEZ',
  'FOOD SERVICE SUR',
  'HERNAN PAZ',
  'J PABLO ARAUJO',
  'J PABLO ARAUJO - CAB/OJE',
  'JAIDER MEDINA - FOOD SERVICE NORTE',
  'JOSE G. GONZALEZ',
  'JUAN HERNANDEZ',
  'LEONARDO RIOS',
  'LUIS GUANIPA',
  'MARIA BRICEÑO',
  'MARIANGEL GONZALEZ',
  'MARYERY GARCIA',
  'MIKELANGELO DIAZ',
  'MIKELANGELO DIAZ - VILLA DEL ROS',
  'OSCAR ORTIZ- CORO',
  'OSCAR ORTIZ- LA COSTA',
  'OSWALDO CHURION',
  'PEDRO ABREU',
  'SARAH REYES',
  'VICTOR CAMPOS',
  'YOLEIDA LUGO',
]);

export const OFFICIAL_SUPERVISORS = ['JOHNATAN SOTO', 'ALI PEREZ', 'NELSON FINOL'] as const;

// Asignación oficial de supervisores según las listas de Johnatan Soto, Ali Perez y el resto asignado a Nelson Finol
export const SELLER_METADATA_MAP: Record<string, { supervisor: string; zona: string; region: string }> = {
  // ==========================================
  // SUPERVISOR: JOHNATAN SOTO
  // ==========================================
  'ADEL JARABA': { supervisor: 'JOHNATAN SOTO', zona: '', region: 'Supervisión Johnatan Soto' },
  'ANGELICA MORENO': { supervisor: 'JOHNATAN SOTO', zona: '', region: 'Supervisión Johnatan Soto' },
  'HERNAN PAZ': { supervisor: 'JOHNATAN SOTO', zona: '', region: 'Supervisión Johnatan Soto' },
  'JAIDER MEDINA - FOOD SERVICE NORTE': { supervisor: 'JOHNATAN SOTO', zona: '', region: 'Supervisión Johnatan Soto' },
  'JOHNATAN SOTO': { supervisor: 'JOHNATAN SOTO', zona: '', region: 'Supervisión Johnatan Soto' },
  'JOHNATAN SOTO VILLA DEL ROS': { supervisor: 'JOHNATAN SOTO', zona: '', region: 'Supervisión Johnatan Soto' },
  'JUAN HERNANDEZ': { supervisor: 'JOHNATAN SOTO', zona: '', region: 'Supervisión Johnatan Soto' },
  'MIKELANGELO DIAZ': { supervisor: 'JOHNATAN SOTO', zona: '', region: 'Supervisión Johnatan Soto' },
  'MIKELANGELO DIAZ1': { supervisor: 'JOHNATAN SOTO', zona: '', region: 'Supervisión Johnatan Soto' },
  'MIKELANGELO DIAZ - VILLA DEL ROS': { supervisor: 'JOHNATAN SOTO', zona: '', region: 'Supervisión Johnatan Soto' },
  'OSWALDO CHURION': { supervisor: 'JOHNATAN SOTO', zona: '', region: 'Supervisión Johnatan Soto' },

  // ==========================================
  // SUPERVISOR: ALI PEREZ
  // ==========================================
  'ALI PEREZ': { supervisor: 'ALI PEREZ', zona: '', region: 'Supervisión Ali Perez' },
  'ELISA SOLER': { supervisor: 'ALI PEREZ', zona: '', region: 'Supervisión Ali Perez' },
  'LEONARDO RIOS': { supervisor: 'ALI PEREZ', zona: '', region: 'Supervisión Ali Perez' },
  'LUIS GUANIPA': { supervisor: 'ALI PEREZ', zona: '', region: 'Supervisión Ali Perez' },
  'OSCAR ORTIZ- CORO': { supervisor: 'ALI PEREZ', zona: '', region: 'Supervisión Ali Perez' },
  'OSCAR ORTIZ- LA COSTA': { supervisor: 'ALI PEREZ', zona: '', region: 'Supervisión Ali Perez' },

  // ==========================================
  // SUPERVISOR: NELSON FINOL (Resto de vendedores)
  // ==========================================
  'CARLOS FUENMAYOR': { supervisor: 'NELSON FINOL', zona: '', region: 'Supervisión Nelson Finol' },
  'CUENTAS CLAVE 1 - MC': { supervisor: 'NELSON FINOL', zona: '', region: 'Supervisión Nelson Finol' },
  'CUENTAS CLAVE 2 - SV': { supervisor: 'NELSON FINOL', zona: '', region: 'Supervisión Nelson Finol' },
  'EDUARDO PIÑA': { supervisor: 'NELSON FINOL', zona: '', region: 'Supervisión Nelson Finol' },
  'FOOD SERVICE SENIOR - JUAN HERNANDEZ': { supervisor: 'NELSON FINOL', zona: '', region: 'Supervisión Nelson Finol' },
  'FOOD SERVICE SUR': { supervisor: 'NELSON FINOL', zona: '', region: 'Supervisión Nelson Finol' },
  'J PABLO ARAUJO': { supervisor: 'NELSON FINOL', zona: '', region: 'Supervisión Nelson Finol' },
  'J PABLO ARAUJO - CAB/OJE': { supervisor: 'NELSON FINOL', zona: '', region: 'Supervisión Nelson Finol' },
  'JOSE G. GONZALEZ': { supervisor: 'NELSON FINOL', zona: '', region: 'Supervisión Nelson Finol' },
  'MARIA BRICEÑO': { supervisor: 'NELSON FINOL', zona: '', region: 'Supervisión Nelson Finol' },
  'MARIANGEL GONZALEZ': { supervisor: 'NELSON FINOL', zona: '', region: 'Supervisión Nelson Finol' },
  'MARYERY GARCIA': { supervisor: 'NELSON FINOL', zona: '', region: 'Supervisión Nelson Finol' },
  'PEDRO ABREU': { supervisor: 'NELSON FINOL', zona: '', region: 'Supervisión Nelson Finol' },
  'SARAH REYES': { supervisor: 'NELSON FINOL', zona: '', region: 'Supervisión Nelson Finol' },
  'VICTOR CAMPOS': { supervisor: 'NELSON FINOL', zona: '', region: 'Supervisión Nelson Finol' },
  'YOLEIDA LUGO': { supervisor: 'NELSON FINOL', zona: '', region: 'Supervisión Nelson Finol' },
};

// Vendedores e identificadores a excluir permanentemente (gerencia, oficina, inactivos)
export const EXCLUDED_VOLUME_SELLERS = new Set<string>([
  'OFICINA',
  'OFICINA - GERENCIA',
  'GERENCIA LC',
  'GERENCIA',
  'OFICINA - AMERICO ALFONZO',
  'OFICINA - JUAN URDANETA',
  'OFICINA - MARIA URDANETA',
  'OFICINA EMPLEADOS',
  'EMPLEADOS STZ',
  'HECGRIS PEREZ',
  'SORAYA LARREAL',
  'CARLOS MACHADO',
  'JOSE G. ESPINOZA',
  'LUIS F. SIMOSA',
  'GELSON CASTILLO',
  'VACANTE - CORO',
  'VACANTE - LA COSTA',
  'VACANTE - NELSON FINOL',
  'ZONA BAJA DE TRUJILLO',
  'SIN ASIGNAR',
]);

export const normalizeSellerName = (vendedorName: string): string => {
  if (!vendedorName) return '';
  let n = vendedorName
    .trim()
    .toUpperCase()
    .replace(/\s+/g, ' ')
    .replace(/PIA\b/, 'PIÑA')
    .replace(/BRICEO\b/, 'BRICEÑO');
  if (
    n === 'CUENTAS CLAVE 1' ||
    n === 'CUENTAS CLAVE 1 - MC' ||
    n === 'MARIANA CHACIN' ||
    n === 'CUENTAS CLAVE 1 - MC (MARIANA CHACIN)'
  ) {
    return 'CUENTAS CLAVE 1 - MC';
  }
  if (
    n === 'CUENTAS CLAVE 2' ||
    n === 'CUENTAS CLAVE 2 - SV' ||
    n === 'SAIRU VALLES' ||
    n === 'CUENTAS CLAVE 2 - SV (SAIRU VALLES)'
  ) {
    return 'CUENTAS CLAVE 2 - SV';
  }
  if (n === 'FOOD SERVICE NORTE') {
    return 'JAIDER MEDINA - FOOD SERVICE NORTE';
  }
  if (n === 'FOOD SERVICE SENIOR' || n === 'FOOD SERVICE SENIOR - JUAN HERNANDEZ') {
    return 'FOOD SERVICE SENIOR - JUAN HERNANDEZ';
  }
  if (n === 'MIKELANGELO DIAZ1' || n === 'JOHNATAN SOTO') {
    return 'MIKELANGELO DIAZ';
  }
  if (
    n === 'JOHNATAN SOTO VILLA DEL ROS' ||
    n === 'JOHNATAN SOTO - VILLA DEL ROS' ||
    n === 'MIKELANGELO DIAZ VILLA DEL ROS'
  ) {
    return 'MIKELANGELO DIAZ - VILLA DEL ROS';
  }
  if (n === 'OSCAR ORTIZ - CORO') n = 'OSCAR ORTIZ- CORO';
  if (n === 'OSCAR ORTIZ - LA COSTA' || n === 'OSCAR ORTIZ- LA COSTA') n = 'OSCAR ORTIZ- LA COSTA';
  return n;
};

export const isValidVolumeSeller = (vendedorName: string): boolean => {
  if (!vendedorName) return false;
  const normalized = normalizeSellerName(vendedorName);
  
  if (
    normalized.includes('OFICINA') ||
    normalized.includes('GERENCIA') ||
    normalized.includes('EMPLEADOS') ||
    normalized.includes('VACANTE') ||
    normalized.includes('SIN ASIGNAR') ||
    EXCLUDED_VOLUME_SELLERS.has(normalized)
  ) {
    return false;
  }

  return VALID_VOLUME_SELLERS.has(normalized);
};

export const isExcludedVolumeSeller = (vendedorName: string): boolean => {
  return !isValidVolumeSeller(vendedorName);
};

export const getSellerMetadata = (vendedorName: string): SellerMetadata => {
  if (!vendedorName) {
    return {
      vendedor: '',
      supervisor: 'NELSON FINOL',
      zona: '',
      region: 'Supervisión Nelson Finol',
    };
  }
  const normalized = normalizeSellerName(vendedorName);
  if (SELLER_METADATA_MAP[normalized]) {
    return {
      vendedor: normalized,
      ...SELLER_METADATA_MAP[normalized],
    };
  }
  const withSpacedHyphen = normalized.replace(/\s*-\s*/g, ' - ');
  if (SELLER_METADATA_MAP[withSpacedHyphen]) {
    return {
      vendedor: normalized,
      ...SELLER_METADATA_MAP[withSpacedHyphen],
    };
  }
  const withoutSpacedHyphen = normalized.replace(/\s*-\s*/g, '-');
  if (SELLER_METADATA_MAP[withoutSpacedHyphen]) {
    return {
      vendedor: normalized,
      ...SELLER_METADATA_MAP[withoutSpacedHyphen],
    };
  }
  return {
    vendedor: normalized,
    supervisor: 'NELSON FINOL',
    zona: '',
    region: 'Supervisión Nelson Finol',
  };
};
