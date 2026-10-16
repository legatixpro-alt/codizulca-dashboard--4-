-- ====================================================================
-- MIGRACIÓN 003: Índices Compuestos y Optimización de Rendimiento
-- Sistema: Codizulca Dashboard & Portal Móvil
-- Descripción: Creación de índices compuestos para optimizar consultas
--              de vistas materializadas, filtros de dashboard, auditorías
--              y sincronización offline.
-- ====================================================================

-- Habilitar extensión para búsqueda de texto si aplica
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- --------------------------------------------------------------------
-- 1. ÍNDICES EN TABLA SALES
-- Optimización para reportes de ventas, cuotas y agrupaciones por período
-- --------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_sales_period_date 
    ON public.sales(period, sale_date DESC);

CREATE INDEX IF NOT EXISTS idx_sales_seller_date 
    ON public.sales(seller_id, sale_date DESC);

CREATE INDEX IF NOT EXISTS idx_sales_product_period 
    ON public.sales(product_id, period);

CREATE INDEX IF NOT EXISTS idx_sales_client_period 
    ON public.sales(client_id, period);

CREATE INDEX IF NOT EXISTS idx_sales_total_amount 
    ON public.sales(total_amount DESC);

-- --------------------------------------------------------------------
-- 2. ÍNDICES EN TABLA SELLERS_QUOTAS
-- --------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_quotas_period_boxes 
    ON public.sellers_quotas(period, quota_boxes DESC);

-- --------------------------------------------------------------------
-- 3. ÍNDICES EN TABLA CLIENTS
-- Optimización para búsquedas por zona, estatus y texto
-- --------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_clients_zone_active 
    ON public.clients(zone, is_active);

CREATE INDEX IF NOT EXISTS idx_clients_code 
    ON public.clients(code);

CREATE INDEX IF NOT EXISTS idx_clients_name_trgm 
    ON public.clients USING gin (name gin_trgm_ops);

-- --------------------------------------------------------------------
-- 4. ÍNDICES EN TABLA PRODUCTS
-- --------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_products_category_active 
    ON public.products(category, is_active);

CREATE INDEX IF NOT EXISTS idx_products_name_trgm 
    ON public.products USING gin (name gin_trgm_ops);

-- --------------------------------------------------------------------
-- 5. ÍNDICES EN TABLA CHECK_INS
-- Monitoreo de actividad de promotoras, filtros de geocerca y sincronización
-- --------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_checkins_promoter_time 
    ON public.check_ins(promoter_id, checkin_time DESC);

CREATE INDEX IF NOT EXISTS idx_checkins_client_time 
    ON public.check_ins(client_id, checkin_time DESC);

CREATE INDEX IF NOT EXISTS idx_checkins_flagged_review 
    ON public.check_ins(geofence_valid, fake_gps_suspected, checkin_time DESC);

CREATE INDEX IF NOT EXISTS idx_checkins_synced_at 
    ON public.check_ins(synced_at) 
    WHERE synced_at IS NOT NULL;

-- --------------------------------------------------------------------
-- 6. ÍNDICES EN TABLA STORE_AUDITS
-- Consultas de Trade Marketing y góndolas
-- --------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_store_audits_client_date 
    ON public.store_audits(client_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_store_audits_promoter_date 
    ON public.store_audits(promoter_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_store_audits_status_date 
    ON public.store_audits(status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_store_audits_out_of_stock 
    ON public.store_audits(out_of_stock_detected) 
    WHERE out_of_stock_detected = true;

-- --------------------------------------------------------------------
-- 7. ÍNDICES EN TABLA INVENTORY
-- Alertas de stock mínimo y balance periódico
-- --------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_inventory_period_final 
    ON public.inventory(period, final_stock);

-- --------------------------------------------------------------------
-- 8. ÍNDICES EN TABLA AUDIT_TRAIL
-- Consultas de trazabilidad por registro y usuario
-- --------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_audit_trail_table_record_date 
    ON public.audit_trail(table_name, record_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_audit_trail_changed_by_date 
    ON public.audit_trail(changed_by, created_at DESC);

-- --------------------------------------------------------------------
-- 9. ÍNDICES EN TABLA AI_FAILED_JOBS & AI_CACHE
-- Dead Letter Queue y expiración de caché
-- --------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_ai_failed_jobs_pending_retry 
    ON public.ai_failed_jobs(status, next_retry_at) 
    WHERE status = 'pending';

CREATE INDEX IF NOT EXISTS idx_ai_cache_expires 
    ON public.ai_cache(expires_at);

-- --------------------------------------------------------------------
-- 10. ÍNDICES EN TABLAS SURVEYS Y TASTINGS_SCHEDULE
-- --------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_surveys_promoter_type 
    ON public.surveys(promoter_id, survey_type, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_surveys_client_date 
    ON public.surveys(client_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_tastings_schedule_promoter_date 
    ON public.tastings_schedule(promoter_id, scheduled_date DESC);

CREATE INDEX IF NOT EXISTS idx_tastings_schedule_status_date 
    ON public.tastings_schedule(status, scheduled_date);

-- Registrar versión de migración 003
INSERT INTO public.schema_versions (version, description)
VALUES ('003', 'Índices compuestos y optimización de rendimiento para dashboard e IA')
ON CONFLICT (version) DO NOTHING;
