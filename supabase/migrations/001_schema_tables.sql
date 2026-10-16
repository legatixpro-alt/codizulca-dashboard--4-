-- ====================================================================
-- MIGRACIÓN 001: Esquema de Tablas Base, Constraints e Índices
-- Sistema: Codizulca Dashboard & Portal Móvil
-- Descripción: Creación de las 16 tablas centrales del sistema con sus
--              llaves primarias, foráneas, restricciones de verificación
--              e índices de rendimiento para tablas críticas.
-- ====================================================================

-- Habilitar extensión para generación de UUIDs si no está habilitada
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- --------------------------------------------------------------------
-- 1. TABLA: profiles
-- Usuarios del sistema vinculados a auth.users de Supabase
-- --------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT NOT NULL UNIQUE,
    full_name TEXT NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('admin', 'presidente', 'gerente', 'supervisor', 'vendedor', 'promotora')),
    zone TEXT,
    phone TEXT,
    avatar_url TEXT,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
COMMENT ON TABLE public.profiles IS 'Perfiles de usuario extendidos del sistema con roles y zonas asignadas.';

-- --------------------------------------------------------------------
-- 2. TABLA: clients
-- Clientes, puntos de venta y tiendas de la red comercial
-- --------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.clients (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    business_name TEXT,
    tax_id TEXT, -- RIF o documento fiscal
    zone TEXT NOT NULL,
    address TEXT,
    latitude DOUBLE PRECISION,
    longitude DOUBLE PRECISION,
    geofence_radius_meters INTEGER NOT NULL DEFAULT 100 CHECK (geofence_radius_meters > 0),
    contact_name TEXT,
    contact_phone TEXT,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
COMMENT ON TABLE public.clients IS 'Puntos de venta/tiendas y maestros de clientes con georreferenciación.';

-- --------------------------------------------------------------------
-- 3. TABLA: products
-- Catálogo de productos y SKUs
-- --------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sku TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    category TEXT NOT NULL,
    unit_of_measure TEXT NOT NULL DEFAULT 'caja',
    units_per_box INTEGER NOT NULL DEFAULT 1 CHECK (units_per_box > 0),
    price NUMERIC(12, 2) NOT NULL CHECK (price >= 0),
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
COMMENT ON TABLE public.products IS 'Catálogo maestro de productos comercializados.';

-- --------------------------------------------------------------------
-- 4. TABLA: import_logs
-- Bitácora de cargas masivas (Ventas, Cuotas, Inventario)
-- --------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.import_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    import_type TEXT NOT NULL CHECK (import_type IN ('ventas', 'cuotas', 'inventario', 'maestros')),
    filename_or_source TEXT NOT NULL,
    total_rows INTEGER NOT NULL DEFAULT 0 CHECK (total_rows >= 0),
    processed_rows INTEGER NOT NULL DEFAULT 0 CHECK (processed_rows >= 0),
    rejected_rows INTEGER NOT NULL DEFAULT 0 CHECK (rejected_rows >= 0),
    status TEXT NOT NULL CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
    error_details JSONB DEFAULT '[]'::jsonb,
    imported_by UUID NOT NULL REFERENCES public.profiles(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
COMMENT ON TABLE public.import_logs IS 'Auditoría y control de procesos de importación masiva.';

-- --------------------------------------------------------------------
-- 5. TABLA: sales
-- Registro transaccional de facturación y ventas
-- --------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.sales (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    invoice_number TEXT NOT NULL UNIQUE,
    sale_date DATE NOT NULL,
    seller_id UUID NOT NULL REFERENCES public.profiles(id),
    client_id UUID NOT NULL REFERENCES public.clients(id),
    product_id UUID NOT NULL REFERENCES public.products(id),
    quantity_boxes NUMERIC(10, 2) NOT NULL CHECK (quantity_boxes > 0),
    unit_price NUMERIC(12, 2) NOT NULL CHECK (unit_price >= 0),
    total_amount NUMERIC(14, 2) NOT NULL CHECK (total_amount >= 0),
    period TEXT NOT NULL, -- Formato YYYY-MM
    import_log_id UUID REFERENCES public.import_logs(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
COMMENT ON TABLE public.sales IS 'Transacciones individuales de ventas y facturación.';

-- --------------------------------------------------------------------
-- 6. TABLA: sellers_quotas
-- Cuotas de venta asignadas a los vendedores por período
-- --------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.sellers_quotas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    seller_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    period TEXT NOT NULL, -- Formato YYYY-MM
    quota_boxes NUMERIC(10, 2) NOT NULL CHECK (quota_boxes >= 0),
    quota_amount NUMERIC(14, 2) NOT NULL CHECK (quota_amount >= 0),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT uq_seller_period UNIQUE (seller_id, period)
);
COMMENT ON TABLE public.sellers_quotas IS 'Objetivos comerciales y cuotas mensuales por vendedor.';

-- --------------------------------------------------------------------
-- 7. TABLA: inventory
-- Movimientos e inventario de productos por período
-- --------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.inventory (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
    period TEXT NOT NULL, -- Formato YYYY-MM
    initial_stock NUMERIC(10, 2) NOT NULL DEFAULT 0 CHECK (initial_stock >= 0),
    purchases NUMERIC(10, 2) NOT NULL DEFAULT 0 CHECK (purchases >= 0),
    adjustments NUMERIC(10, 2) NOT NULL DEFAULT 0,
    sales_out NUMERIC(10, 2) NOT NULL DEFAULT 0 CHECK (sales_out >= 0),
    final_stock NUMERIC(10, 2) GENERATED ALWAYS AS (initial_stock + purchases + adjustments - sales_out) STORED,
    min_alert_threshold NUMERIC(10, 2) NOT NULL DEFAULT 10 CHECK (min_alert_threshold >= 0),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT uq_product_period UNIQUE (product_id, period)
);
COMMENT ON TABLE public.inventory IS 'Balance periódico de existencias físicas de producto.';

-- --------------------------------------------------------------------
-- 8. TABLA: audit_trail
-- Registro inmutable de eventos de auditoría y cambios en datos sensibles
-- --------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.audit_trail (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    table_name TEXT NOT NULL,
    record_id UUID NOT NULL,
    action TEXT NOT NULL CHECK (action IN ('INSERT', 'UPDATE', 'DELETE')),
    old_data JSONB,
    new_data JSONB,
    changed_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    client_ip TEXT,
    user_agent TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
COMMENT ON TABLE public.audit_trail IS 'Bitácora inmutable de auditoría para trazabilidad de modificaciones.';

-- --------------------------------------------------------------------
-- 9. TABLA: check_ins
-- Registro de visitas en campo con geofencing y validación de Fake GPS
-- --------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.check_ins (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    promoter_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
    checkin_time TIMESTAMPTZ NOT NULL DEFAULT now(),
    checkout_time TIMESTAMPTZ,
    latitude DOUBLE PRECISION NOT NULL,
    longitude DOUBLE PRECISION NOT NULL,
    accuracy_meters DOUBLE PRECISION,
    distance_to_client_meters DOUBLE PRECISION NOT NULL,
    geofence_valid BOOLEAN NOT NULL DEFAULT false,
    fake_gps_suspected BOOLEAN NOT NULL DEFAULT false,
    fake_gps_reasons JSONB DEFAULT '[]'::jsonb,
    battery_level NUMERIC(4, 1),
    device_info JSONB DEFAULT '{}'::jsonb,
    offline_created_at TIMESTAMPTZ,
    synced_at TIMESTAMPTZ DEFAULT now(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
COMMENT ON TABLE public.check_ins IS 'Visitas y control de presencia de promotoras con geolocalización.';

-- --------------------------------------------------------------------
-- 10. TABLA: surveys
-- Encuestas en punto de venta (breves y profundas)
-- --------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.surveys (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    check_in_id UUID REFERENCES public.check_ins(id) ON DELETE SET NULL,
    promoter_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
    survey_type TEXT NOT NULL CHECK (survey_type IN ('breve', 'profunda')),
    responses JSONB NOT NULL DEFAULT '{}'::jsonb,
    offline_created_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
COMMENT ON TABLE public.surveys IS 'Cuestionarios de campo levantados durante las visitas a clientes.';

-- --------------------------------------------------------------------
-- 11. TABLA: tastings_schedule
-- Cronograma y ejecución de degustaciones / sampling
-- --------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.tastings_schedule (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    promoter_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
    scheduled_date DATE NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('scheduled', 'in_progress', 'completed', 'cancelled')),
    target_samples INTEGER NOT NULL DEFAULT 0 CHECK (target_samples >= 0),
    delivered_samples INTEGER NOT NULL DEFAULT 0 CHECK (delivered_samples >= 0),
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
COMMENT ON TABLE public.tastings_schedule IS 'Planificación de degustaciones y entrega de muestras en punto de venta.';

-- --------------------------------------------------------------------
-- 12. TABLA: store_audits
-- Auditorías de anaquel con reconocimiento de imagen e IA
-- --------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.store_audits (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    check_in_id UUID REFERENCES public.check_ins(id) ON DELETE SET NULL,
    promoter_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
    photo_url TEXT NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('pending', 'analyzing', 'completed', 'failed')),
    ai_analysis JSONB,
    confidence_score NUMERIC(4, 3) CHECK (confidence_score >= 0 AND confidence_score <= 1),
    detected_skus JSONB DEFAULT '[]'::jsonb,
    share_of_shelf NUMERIC(5, 2) CHECK (share_of_shelf >= 0 AND share_of_shelf <= 100),
    out_of_stock_detected BOOLEAN DEFAULT false,
    manual_override BOOLEAN DEFAULT false,
    manual_notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
COMMENT ON TABLE public.store_audits IS 'Auditoría visual de góndolas y anaqueles con análisis de IA.';

-- --------------------------------------------------------------------
-- 13. TABLA: ai_failed_jobs
-- Dead Letter Queue para trabajos fallidos de Inteligencia Artificial
-- --------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.ai_failed_jobs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    job_type TEXT NOT NULL CHECK (job_type IN ('shelf_audit', 'dashboard_chat', 'custom')),
    reference_id UUID NOT NULL,
    payload JSONB NOT NULL,
    error_message TEXT NOT NULL,
    attempts INTEGER NOT NULL DEFAULT 1 CHECK (attempts >= 1),
    max_attempts INTEGER NOT NULL DEFAULT 5 CHECK (max_attempts >= 1),
    next_retry_at TIMESTAMPTZ,
    status TEXT NOT NULL CHECK (status IN ('pending', 'exhausted', 'resolved')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
COMMENT ON TABLE public.ai_failed_jobs IS 'Cola de trabajos fallidos de IA para reintentos automatizados.';

-- --------------------------------------------------------------------
-- 14. TABLA: ai_cache
-- Caché semántica y de respuestas de IA para optimizar cuotas y latencia
-- --------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.ai_cache (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    cache_key TEXT NOT NULL UNIQUE,
    query_hash TEXT NOT NULL,
    response_content TEXT NOT NULL,
    metadata JSONB DEFAULT '{}'::jsonb,
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
COMMENT ON TABLE public.ai_cache IS 'Caché de consultas a modelos de IA para ahorro de costos y velocidad.';

-- --------------------------------------------------------------------
-- 15. TABLA: system_settings
-- Configuración global, kill switch y parámetros operativos
-- --------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.system_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    kill_switch_active BOOLEAN NOT NULL DEFAULT false,
    kill_switch_message TEXT DEFAULT 'Mantenimiento programado',
    ai_vision_enabled BOOLEAN NOT NULL DEFAULT true,
    ai_vision_model TEXT NOT NULL DEFAULT 'gemini-1.5-flash',
    ai_daily_budget_max NUMERIC(10, 2) NOT NULL DEFAULT 50.00 CHECK (ai_daily_budget_max >= 0),
    ai_daily_budget_used NUMERIC(10, 2) NOT NULL DEFAULT 0.00 CHECK (ai_daily_budget_used >= 0),
    last_budget_reset_date DATE NOT NULL DEFAULT CURRENT_DATE,
    default_geofence_meters INTEGER NOT NULL DEFAULT 100 CHECK (default_geofence_meters > 0),
    fake_gps_strict_mode BOOLEAN NOT NULL DEFAULT false,
    updated_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
COMMENT ON TABLE public.system_settings IS 'Parámetros del sistema, control de kill switch y presupuesto de IA.';

-- --------------------------------------------------------------------
-- 16. TABLA: schema_versions
-- Registro de versiones y migraciones aplicadas
-- --------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.schema_versions (
    id SERIAL PRIMARY KEY,
    version TEXT NOT NULL UNIQUE,
    description TEXT NOT NULL,
    applied_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
COMMENT ON TABLE public.schema_versions IS 'Control de versiones del esquema de base de datos.';

-- Registrar versión inicial de la migración 001
INSERT INTO public.schema_versions (version, description)
VALUES ('001', 'Creación de 16 tablas base, llaves primarias, foráneas y constraints')
ON CONFLICT (version) DO NOTHING;

-- --------------------------------------------------------------------
-- Índices esenciales para tablas críticas (001)
-- (La migración 003 complementará con índices compuestos adicionales)
-- --------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_sales_seller_period ON public.sales(seller_id, period);
CREATE INDEX IF NOT EXISTS idx_sales_client_id ON public.sales(client_id);
CREATE INDEX IF NOT EXISTS idx_sales_date ON public.sales(sale_date);

CREATE INDEX IF NOT EXISTS idx_quotas_period ON public.sellers_quotas(period);
CREATE INDEX IF NOT EXISTS idx_quotas_seller ON public.sellers_quotas(seller_id);

CREATE INDEX IF NOT EXISTS idx_check_ins_promoter_date ON public.check_ins(promoter_id, checkin_time);
CREATE INDEX IF NOT EXISTS idx_check_ins_client ON public.check_ins(client_id);
CREATE INDEX IF NOT EXISTS idx_check_ins_geofence_fake ON public.check_ins(geofence_valid, fake_gps_suspected);

CREATE INDEX IF NOT EXISTS idx_store_audits_promoter ON public.store_audits(promoter_id);
CREATE INDEX IF NOT EXISTS idx_store_audits_status ON public.store_audits(status);

CREATE INDEX IF NOT EXISTS idx_ai_failed_jobs_status_retry ON public.ai_failed_jobs(status, next_retry_at);

CREATE INDEX IF NOT EXISTS idx_audit_trail_table_record ON public.audit_trail(table_name, record_id);
CREATE INDEX IF NOT EXISTS idx_audit_trail_created ON public.audit_trail(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_inventory_product_period ON public.inventory(product_id, period);
