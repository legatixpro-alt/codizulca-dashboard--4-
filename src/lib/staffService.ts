/**
 * Submódulo de Personal de Campo (Trade Marketing & RRHH)
 * Gestión unificada de nómina: Plantilla Fija, Plantilla Eventual y Promotores Merchandising
 */

export interface StaffMember {
  id: string;
  name: string;
  role: 'Promotora' | 'Impulsadora' | 'Promotor Merchandising';
  category: 'fija' | 'eventual' | 'merchandising';
  status: 'Activo' | 'Inactivo' | 'En Descanso';
  phone: string;
  email: string;
  password?: string;
  address: string;
  assignedStore: string;
  photoUrl: string;
  avatarBg?: string;
  assignedDegustaciones?: number;
  reportsSubmitted?: number;
  efficiencyScore?: number;
  created_at?: string;
}

const STORAGE_KEY = 'codizulca_staff_members_v4';

export const INITIAL_STAFF_SEED: StaffMember[] = [
  {
    "id": "STF-001",
    "name": "NICOLE GODOY",
    "role": "Impulsadora",
    "category": "fija",
    "status": "Activo",
    "phone": "0412-4352924",
    "email": "godoyaraujonicole@gmail.com",
    "password": "codi123",
    "address": "CORO",
    "assignedStore": "VARIAS",
    "photoUrl": "/avatars/nicole_godoy.jpg",
    "avatarBg": "bg-emerald-600",
    "assignedDegustaciones": 45,
    "reportsSubmitted": 70,
    "efficiencyScore": 96
  },
  {
    "id": "STF-002",
    "name": "FERNANDA LEON",
    "role": "Impulsadora",
    "category": "fija",
    "status": "Activo",
    "phone": "0412-7808330",
    "email": "fer171205@gmail.com",
    "password": "codi123",
    "address": "LA VILLA",
    "assignedStore": "VARIAS",
    "photoUrl": "/avatars/fernanda_leon.jpg",
    "avatarBg": "bg-teal-600",
    "assignedDegustaciones": 38,
    "reportsSubmitted": 62,
    "efficiencyScore": 94
  },
  {
    "id": "STF-003",
    "name": "NISMARY DERIZAN",
    "role": "Impulsadora",
    "category": "fija",
    "status": "Activo",
    "phone": "0412-7809301",
    "email": "Nismariderizan3@gmail.com",
    "password": "codi123",
    "address": "LA VILLA",
    "assignedStore": "VARIAS",
    "photoUrl": "/avatars/nismary_derizan.jpg",
    "avatarBg": "bg-emerald-600",
    "assignedDegustaciones": 40,
    "reportsSubmitted": 65,
    "efficiencyScore": 95
  },
  {
    "id": "STF-004",
    "name": "DARIANNYS FERRER",
    "role": "Impulsadora",
    "category": "fija",
    "status": "Activo",
    "phone": "0412-1985197",
    "email": "dariannysferrer23@gmail.com",
    "password": "codi123",
    "address": "SANTA MARIA",
    "assignedStore": "ALKOSTO BELLA VISTA Y DELICIAS",
    "photoUrl": "/avatars/dariannys_ferrer.jpg",
    "avatarBg": "bg-rose-600",
    "assignedDegustaciones": 44,
    "reportsSubmitted": 72,
    "efficiencyScore": 97
  },
  {
    "id": "STF-005",
    "name": "CAMILA MORALES",
    "role": "Impulsadora",
    "category": "fija",
    "status": "Activo",
    "phone": "0412-1680424",
    "email": "Camimi2507@gmail.com",
    "password": "codi123",
    "address": "MARA",
    "assignedStore": "VARIOS",
    "photoUrl": "/avatars/camila_morales.jpg",
    "avatarBg": "bg-purple-600",
    "assignedDegustaciones": 36,
    "reportsSubmitted": 58,
    "efficiencyScore": 93
  },
  {
    "id": "STF-006",
    "name": "CARELIZ REYES",
    "role": "Impulsadora",
    "category": "fija",
    "status": "Activo",
    "phone": "04146103171",
    "email": "REYESCARELIZ3@GMAIL.COM",
    "password": "codi123",
    "address": "PUNTO FIJO",
    "assignedStore": "VARIAS",
    "photoUrl": "/avatars/careliz_reyes.jpg",
    "avatarBg": "bg-emerald-600",
    "assignedDegustaciones": 45,
    "reportsSubmitted": 70,
    "efficiencyScore": 96
  },
  {
    "id": "STF-007",
    "name": "Maria de los Ángeles Almarza Arnedo",
    "role": "Impulsadora",
    "category": "fija",
    "status": "Activo",
    "phone": "+58 424-1431342",
    "email": "Mariaalmarza16@gmail.com",
    "password": "codi123",
    "address": "Cabimas",
    "assignedStore": "Varios",
    "photoUrl": "/avatars/maria_almarza.jpg",
    "avatarBg": "bg-emerald-600",
    "assignedDegustaciones": 42,
    "reportsSubmitted": 68,
    "efficiencyScore": 94
  },
  {
    "id": "STF-008",
    "name": "SCARLETH PIÑA",
    "role": "Impulsadora",
    "category": "fija",
    "status": "Activo",
    "phone": "58 412-4514626",
    "email": "scarmichell22@gmail.com",
    "password": "codi123",
    "address": "CABIMAS",
    "assignedStore": "ALKOSTO CABIMAS",
    "photoUrl": "/avatars/scarleth_pina.jpg",
    "avatarBg": "bg-rose-600",
    "assignedDegustaciones": 58,
    "reportsSubmitted": 92,
    "efficiencyScore": 98
  },
  {
    "id": "STF-010",
    "name": "ana echeverria",
    "role": "Impulsadora",
    "category": "fija",
    "status": "Activo",
    "phone": "58 424-8133259",
    "email": "anavecheverriar@gmail.com",
    "password": "codi123",
    "address": "urb cuatricentenario",
    "assignedStore": "ALKOSTO ZONA INDUSTRIAL",
    "photoUrl": "/avatars/ana_echeverria.jpg",
    "avatarBg": "bg-blue-600",
    "assignedDegustaciones": 35,
    "reportsSubmitted": 60,
    "efficiencyScore": 94
  },
  {
    "id": "STF-011",
    "name": "OSMAIRY VILLASMIL",
    "role": "Promotora",
    "category": "fija",
    "status": "Activo",
    "phone": "58 414-6713750",
    "email": "luzz010203@gmail.com",
    "password": "codi123",
    "address": "EL SILENCIO",
    "assignedStore": "ALKOSTO COROMOTO",
    "photoUrl": "/avatars/osmairy_villasmil.jpg",
    "avatarBg": "bg-emerald-600",
    "assignedDegustaciones": 38,
    "reportsSubmitted": 64,
    "efficiencyScore": 95
  },
  {
    "id": "STF-012",
    "name": "TANIA CARDENAS",
    "role": "Promotora",
    "category": "fija",
    "status": "Activo",
    "phone": "+58 416-0177582",
    "email": "tataacardenas@gmail.com",
    "password": "codi123",
    "address": "C3 CERCA DEL BARRIO INTEGRACION",
    "assignedStore": "ALKOSTO TRIBUNALES",
    "photoUrl": "/avatars/tania_cardenas.jpg",
    "avatarBg": "bg-red-600",
    "assignedDegustaciones": 40,
    "reportsSubmitted": 72,
    "efficiencyScore": 93
  },
  {
    "id": "STF-013",
    "name": "NAIRELIS ANTUNEZ",
    "role": "Impulsadora",
    "category": "fija",
    "status": "Activo",
    "phone": "58 424-7317216",
    "email": "antuneznairelis@gmail.com",
    "password": "codi123",
    "address": "BARRIO DIA DE LAS MADRES",
    "assignedStore": "ALKOSTO LA LIMPIA",
    "photoUrl": "/avatars/nairelis_antunez.jpg",
    "avatarBg": "bg-emerald-600",
    "assignedDegustaciones": 48,
    "reportsSubmitted": 80,
    "efficiencyScore": 97
  },
  {
    "id": "STF-014",
    "name": "JAIVELIN FEREIRA",
    "role": "Impulsadora",
    "category": "fija",
    "status": "Activo",
    "phone": "58 412-8048525",
    "email": "jaivelinfereira20@gmail.com",
    "password": "codi123",
    "address": "EL BAJO",
    "assignedStore": "OLIMPICA Y ALKOSTO",
    "photoUrl": "/avatars/jaivelin_fereira.jpg",
    "avatarBg": "bg-teal-600",
    "assignedDegustaciones": 36,
    "reportsSubmitted": 58,
    "efficiencyScore": 92
  },
  {
    "id": "STF-016",
    "name": "AHYRLET RUIZ",
    "role": "Impulsadora",
    "category": "eventual",
    "status": "Activo",
    "phone": "58 414-3632102",
    "email": "ruizahyrleth22@gmail.com",
    "password": "codi123",
    "address": "C2",
    "assignedStore": "TODAS",
    "photoUrl": "/avatars/ahyrlet_ruiz.jpg",
    "avatarBg": "bg-teal-600",
    "assignedDegustaciones": 28,
    "reportsSubmitted": 45,
    "efficiencyScore": 93
  },
  {
    "id": "STF-017",
    "name": "VALERIA ACEVEDO",
    "role": "Promotora",
    "category": "eventual",
    "status": "Activo",
    "phone": "58 412-6094222",
    "email": "valevalentina0111@gmail.com",
    "password": "codi123",
    "address": "URB CUATRICENTENARIO",
    "assignedStore": "TODOS",
    "photoUrl": "/avatars/valeria_acevedo.jpg",
    "avatarBg": "bg-purple-600",
    "assignedDegustaciones": 30,
    "reportsSubmitted": 48,
    "efficiencyScore": 95
  },
  {
    "id": "STF-018",
    "name": "CLAUDIA ALVAREZ",
    "role": "Promotora",
    "category": "eventual",
    "status": "Activo",
    "phone": "58 424-6428938",
    "email": "clausofidaza@gmail.com",
    "password": "codi123",
    "address": "C2",
    "assignedStore": "TODAS",
    "photoUrl": "/avatars/claudia_alvarez.jpg",
    "avatarBg": "bg-emerald-600",
    "assignedDegustaciones": 26,
    "reportsSubmitted": 42,
    "efficiencyScore": 92
  },
  {
    "id": "STF-019",
    "name": "JELARY ACOSTA",
    "role": "Promotora",
    "category": "eventual",
    "status": "Activo",
    "phone": "58 424-6832444",
    "email": "jelaryacosta@gmail.com",
    "password": "codi123",
    "address": "VIA EL MOJAN",
    "assignedStore": "TODAS",
    "photoUrl": "/avatars/jelary_acosta.jpg",
    "avatarBg": "bg-teal-600",
    "assignedDegustaciones": 24,
    "reportsSubmitted": 38,
    "efficiencyScore": 90
  },
  {
    "id": "STF-020",
    "name": "MARIANGEL VALDIVIESO",
    "role": "Promotora",
    "category": "eventual",
    "status": "Activo",
    "phone": "58 412-6414929",
    "email": "mariangelulacio3110@gmail.com",
    "password": "codi123",
    "address": "URB LA POPULAR",
    "assignedStore": "TODAS",
    "photoUrl": "/avatars/mariangel_valdivieso.jpg",
    "avatarBg": "bg-emerald-600",
    "assignedDegustaciones": 32,
    "reportsSubmitted": 50,
    "efficiencyScore": 94
  },
  {
    "id": "STF-021",
    "name": "ANGELICA SANCHEZ",
    "role": "Promotora",
    "category": "eventual",
    "status": "Activo",
    "phone": "58 422-1652997",
    "email": "angelicaquero13@gmail.com",
    "password": "codi123",
    "address": "PLAZA DE LAS MADRES",
    "assignedStore": "TODAS",
    "photoUrl": "/avatars/angelica_sanchez.jpg",
    "avatarBg": "bg-blue-600",
    "assignedDegustaciones": 28,
    "reportsSubmitted": 44,
    "efficiencyScore": 91
  },
  {
    "id": "STF-022",
    "name": "ENELIANGELA GONZALEZ",
    "role": "Promotora",
    "category": "eventual",
    "status": "Activo",
    "phone": "58 412-0676693",
    "email": "eneliejoseph@gmail.com",
    "password": "codi123",
    "address": "URB EL VARILLAL",
    "assignedStore": "TODAS",
    "photoUrl": "/avatars/eneliangela_gonzalez.jpg",
    "avatarBg": "bg-amber-600",
    "assignedDegustaciones": 27,
    "reportsSubmitted": 43,
    "efficiencyScore": 92
  },
  {
    "id": "STF-024",
    "name": "MARIANYEL ARANDA",
    "role": "Promotora",
    "category": "eventual",
    "status": "Activo",
    "phone": "58 412-0800647",
    "email": "marianyelaranda@gmail.com",
    "password": "codi123",
    "address": "SAN FRANCISCO",
    "assignedStore": "TODAS",
    "photoUrl": "/avatars/marianyel_aranda.jpg",
    "avatarBg": "bg-emerald-600",
    "assignedDegustaciones": 34,
    "reportsSubmitted": 52,
    "efficiencyScore": 96
  },
  {
    "id": "STF-025",
    "name": "JULIANNYS GIL",
    "role": "Promotora",
    "category": "eventual",
    "status": "Activo",
    "phone": "58 424-6779726",
    "email": "juliannys.gil.crespo@gmail.com",
    "password": "codi123",
    "address": "AV LA LIMPIA",
    "assignedStore": "TODAS",
    "photoUrl": "/avatars/juliannys_gil.jpg",
    "avatarBg": "bg-blue-600",
    "assignedDegustaciones": 29,
    "reportsSubmitted": 46,
    "efficiencyScore": 93
  },
  {
    "id": "STF-026",
    "name": "JOSE BARROSO",
    "role": "Promotor Merchandising",
    "category": "merchandising",
    "status": "Activo",
    "phone": "412-0696135",
    "email": "joseabraham.barroso@gmail.com",
    "password": "codi123",
    "address": "-",
    "assignedStore": "NORTE",
    "photoUrl": "/avatars/jose_barroso.jpg",
    "avatarBg": "bg-red-800",
    "assignedDegustaciones": 54,
    "reportsSubmitted": 89,
    "efficiencyScore": 98
  },
  {
    "id": "STF-027",
    "name": "ZIORELI GRANGGER",
    "role": "Promotor Merchandising",
    "category": "merchandising",
    "status": "Activo",
    "phone": "0414-6069963",
    "email": "Ziorelis.grangger@codizulca.com",
    "password": "codi123",
    "address": "cuatricentenario 1 etapa",
    "assignedStore": "Merchandising",
    "photoUrl": "/avatars/zioreli_grangger.jpg",
    "avatarBg": "bg-rose-900",
    "assignedDegustaciones": 50,
    "reportsSubmitted": 84,
    "efficiencyScore": 97
  }
];

export const staffService = {
  async getAll(): Promise<StaffMember[]> {
    try {
      const res = await fetch('/api/staff');
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data) && data.length > 0) {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
          return data;
        }
      }
    } catch {
      // offline fallback
    }

    const local = localStorage.getItem(STORAGE_KEY);
    if (local) {
      try {
        const parsed = JSON.parse(local);
        if (Array.isArray(parsed)) {
          const validParsed = parsed.filter((p: any) => p && typeof p === 'object' && p.id && p.name);
          if (validParsed.length > 0) {
            return validParsed;
          }
        }
      } catch (e) {
        console.warn('Error reading local staff:', e);
      }
    }

    localStorage.setItem(STORAGE_KEY, JSON.stringify(INITIAL_STAFF_SEED));
    return INITIAL_STAFF_SEED;
  },

  async save(member: Omit<StaffMember, 'id'> & { id?: string }): Promise<StaffMember> {
    const current = await this.getAll();
    let savedRecord: StaffMember;

    if (member.id) {
      savedRecord = { ...member, id: member.id, password: member.password || 'codi123' } as StaffMember;
      const updated = current.map(s => s.id === member.id ? savedRecord : s);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    } else {
      savedRecord = {
        ...member,
        id: 'STF-' + Date.now().toString().slice(-5),
        password: member.password || 'codi123'
      } as StaffMember;
      const updated = [savedRecord, ...current];
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    }

    try {
      await fetch('/api/staff', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(savedRecord)
      });
    } catch (e) {
      console.warn('Error syncing staff with server:', e);
    }

    window.dispatchEvent(new Event('codizulca_staff_changed'));
    return savedRecord;
  },

  async updatePhoto(id: string, photoUrl: string): Promise<boolean> {
    const current = await this.getAll();
    const target = current.find(s => s.id === id);
    if (!target) return false;

    target.photoUrl = photoUrl;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(current));

    try {
      await fetch(`/api/staff/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(target)
      });
    } catch {
      // fallback
    }

    window.dispatchEvent(new Event('codizulca_staff_changed'));
    return true;
  },

  async delete(id: string): Promise<boolean> {
    try {
      await fetch(`/api/staff/${id}`, { method: 'DELETE' });
    } catch {
      // fallback
    }

    const current = await this.getAll();
    const filtered = current.filter(s => s.id !== id);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));

    window.dispatchEvent(new Event('codizulca_staff_changed'));
    return true;
  },

  subscribe(callback: () => void): () => void {
    const handler = () => callback();
    window.addEventListener('codizulca_staff_changed', handler);
    window.addEventListener('storage', (e) => {
      if (e.key === STORAGE_KEY) callback();
    });
    return () => {
      window.removeEventListener('codizulca_staff_changed', handler);
    };
  }
};
