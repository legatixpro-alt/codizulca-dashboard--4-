export interface ClienteItem {
  id: string;
  nombre: string;
  vendedor: string;
  region: string;
  canal: string;
  activo?: boolean;
  rif?: string;
  zona?: string;
}

// Re-export or dynamically provide the clients data
import carteraData from './carteraClientes.json';

export const CARTERA_CLIENTES: ClienteItem[] = carteraData as ClienteItem[];
