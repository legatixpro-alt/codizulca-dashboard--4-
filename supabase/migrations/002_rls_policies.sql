-- ====================================================================
-- MIGRACIÓN 002: Políticas de Seguridad a Nivel de Fila (RLS)
-- Sistema: Codizulca Dashboard & Portal Móvil
-- Descripción: Definición de función helper con SECURITY DEFINER y políticas
--              de acceso granular por rol para las tablas críticas iniciales.
-- ====================================================================

-- --------------------------------------------------------------------
-- Función Auxiliar: get_user_role()
-- Obtiene el rol del usuario autenticado de forma segura sin recursión
-- --------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_user_role()
RETURNS TEXT
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT role FROM public.profiles WHERE id = auth.uid();
$$;

COMMENT ON FUNCTION public.get_user_role() IS 'Devuelve el rol de perfil del usuario en sesión con permisos elevados para evitar recursión de RLS.';

-- Función Auxiliar: get_user_zone()
CREATE OR REPLACE FUNCTION public.get_user_zone()
RETURNS TEXT
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT zone FROM public.profiles WHERE id = auth.uid();
$$;

COMMENT ON FUNCTION public.get_user_zone() IS 'Devuelve la zona geográfica asignada al usuario autenticado.';

-- --------------------------------------------------------------------
-- Habilitación de RLS en las tablas correspondientes
-- --------------------------------------------------------------------
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.check_ins ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_trail ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sellers_quotas ENABLE ROW LEVEL SECURITY;

-- --------------------------------------------------------------------
-- 1. POLÍTICAS PARA PROFILES
-- Lectura:
-- - Todos los usuarios autenticados pueden ver información pública básica
--   (nombre, avatar, rol, zona, id, is_active).
-- - Admin, Presidente y Gerente tienen acceso total de lectura y modificación.
-- - Cada usuario puede actualizar sus propios datos personales (teléfono, avatar).
-- --------------------------------------------------------------------
DROP POLICY IF EXISTS "profiles_select_policy" ON public.profiles;
CREATE POLICY "profiles_select_policy"
ON public.profiles
FOR SELECT
TO authenticated
USING (
    -- Directores y gerencia ven todos los perfiles
    public.get_user_role() IN ('admin', 'presidente', 'gerente')
    -- Supervisores ven perfiles de su zona o personal de campo
    OR (public.get_user_role() = 'supervisor' AND (zone = public.get_user_zone() OR role IN ('vendedor', 'promotora')))
    -- Cualquier usuario puede ver los datos de contacto y nombre de compañeros activos
    OR is_active = true
);

DROP POLICY IF EXISTS "profiles_update_self_or_admin" ON public.profiles;
CREATE POLICY "profiles_update_self_or_admin"
ON public.profiles
FOR UPDATE
TO authenticated
USING (
    public.get_user_role() = 'admin' OR id = auth.uid()
)
WITH CHECK (
    -- El propio usuario no puede cambiarse su propio rol o zona a menos que sea admin
    public.get_user_role() = 'admin' 
    OR (id = auth.uid() AND role = public.get_user_role() AND zone IS NOT DISTINCT FROM public.get_user_zone())
);

-- --------------------------------------------------------------------
-- 2. POLÍTICAS PARA CHECK_INS
-- - Promotoras: Solo pueden consultar e insertar sus propios check-ins.
-- - Supervisores: Pueden ver check-ins de clientes de su zona.
-- - Admin, Presidente, Gerente: Acceso total de consulta.
-- --------------------------------------------------------------------
DROP POLICY IF EXISTS "check_ins_select_policy" ON public.check_ins;
CREATE POLICY "check_ins_select_policy"
ON public.check_ins
FOR SELECT
TO authenticated
USING (
    public.get_user_role() IN ('admin', 'presidente', 'gerente')
    OR promoter_id = auth.uid()
    OR (
        public.get_user_role() = 'supervisor'
        AND EXISTS (
            SELECT 1 FROM public.clients c
            WHERE c.id = check_ins.client_id
            AND c.zone = public.get_user_zone()
        )
    )
);

DROP POLICY IF EXISTS "check_ins_insert_policy" ON public.check_ins;
CREATE POLICY "check_ins_insert_policy"
ON public.check_ins
FOR INSERT
TO authenticated
WITH CHECK (
    -- Solo la propia promotora puede insertar registros a su nombre
    promoter_id = auth.uid()
    OR public.get_user_role() IN ('admin', 'gerente')
);

-- --------------------------------------------------------------------
-- 3. POLÍTICAS PARA AUDIT_TRAIL
-- - Admin, Presidente y Gerente: Solo lectura (SELECT).
-- - Nadie puede hacer UPDATE ni DELETE (tabla inmutable para compliance).
-- - Inserción permitida vía triggers internos del sistema o procesos autenticados.
-- --------------------------------------------------------------------
DROP POLICY IF EXISTS "audit_trail_select_policy" ON public.audit_trail;
CREATE POLICY "audit_trail_select_policy"
ON public.audit_trail
FOR SELECT
TO authenticated
USING (
    public.get_user_role() IN ('admin', 'presidente', 'gerente')
);

-- Note: No existen políticas de UPDATE ni DELETE en audit_trail por diseño inmutable.

-- --------------------------------------------------------------------
-- 4. POLÍTICAS PARA SALES
-- - Vendedores: Solo ven sus propias ventas (seller_id = auth.uid()).
-- - Supervisores: Ven las ventas realizadas en clientes de su zona.
-- - Admin, Presidente, Gerente: Ven todas las ventas.
-- --------------------------------------------------------------------
DROP POLICY IF EXISTS "sales_select_policy" ON public.sales;
CREATE POLICY "sales_select_policy"
ON public.sales
FOR SELECT
TO authenticated
USING (
    public.get_user_role() IN ('admin', 'presidente', 'gerente')
    OR (public.get_user_role() = 'vendedor' AND seller_id = auth.uid())
    OR (
        public.get_user_role() = 'supervisor'
        AND EXISTS (
            SELECT 1 FROM public.clients c
            WHERE c.id = sales.client_id
            AND c.zone = public.get_user_zone()
        )
    )
);

-- --------------------------------------------------------------------
-- 5. POLÍTICAS PARA SELLERS_QUOTAS
-- - Vendedores: Solo ven sus propias cuotas asignadas.
-- - Supervisores: Ven cuotas de los vendedores asignados a su zona.
-- - Admin, Presidente, Gerente: Ven todas las cuotas y pueden administrarlas.
-- --------------------------------------------------------------------
DROP POLICY IF EXISTS "sellers_quotas_select_policy" ON public.sellers_quotas;
CREATE POLICY "sellers_quotas_select_policy"
ON public.sellers_quotas
FOR SELECT
TO authenticated
USING (
    public.get_user_role() IN ('admin', 'presidente', 'gerente')
    OR (public.get_user_role() = 'vendedor' AND seller_id = auth.uid())
    OR (
        public.get_user_role() = 'supervisor'
        AND EXISTS (
            SELECT 1 FROM public.profiles p
            WHERE p.id = sellers_quotas.seller_id
            AND p.zone = public.get_user_zone()
        )
    )
);

-- --------------------------------------------------------------------
-- RESUMEN GENERAL DE POLÍTICAS DEL SISTEMA (ROADMAP RLS):
-- - clients: Admin/Gerente (CRUD completo); Vendedores/Promotoras (SELECT activos); Supervisor (SELECT zona).
-- - products: Admin/Gerente (CRUD completo); Todos (SELECT activos).
-- - inventory: Admin/Gerente (CRUD); Supervisores y Vendedores (SELECT de consulta).
-- - import_logs: Admin/Gerente (CRUD/SELECT); Otros roles (sin acceso).
-- - surveys: Promotoras (INSERT/SELECT propios); Supervisores/Admin/Gerente (SELECT).
-- - tastings_schedule: Promotoras (SELECT asignados, UPDATE de estado/muestras); Admin/Supervisor (CRUD).
-- - store_audits: Promotoras (INSERT/SELECT propios); Supervisores/Admin/Gerente (SELECT y revisión).
-- - ai_failed_jobs / ai_cache: Service role y Admin exclusivamente.
-- - system_settings: Todos los usuarios (SELECT para flags y kill switch); Admin (UPDATE exclusivo).
-- - schema_versions: Solo lectura para authenticated; Admin para mantenimiento.
-- (Las políticas adicionales y automatizaciones de integridad se afianzan en 004_functions_triggers.sql).
-- --------------------------------------------------------------------

-- Registrar versión de migración 002
INSERT INTO public.schema_versions (version, description)
VALUES ('002', 'Políticas iniciales de seguridad RLS y funciones get_user_role() / get_user_zone()')
ON CONFLICT (version) DO NOTHING;
