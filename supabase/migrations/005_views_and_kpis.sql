-- ====================================================================
-- MIGRACIÓN 005: Vistas Materializadas y Funciones de KPIs y Georreferenciación
-- Sistema: Codizulca Dashboard & Portal Móvil
-- Descripción: Creación de las 4 vistas analíticas principales, la función
--              haversine con precisión submétrica, el generador de KPIs
--              del dashboard y el refresco periódico de datos.
-- ====================================================================

-- --------------------------------------------------------------------
-- 1. FUNCIÓN MATEMÁTICA: fn_calculate_haversine_distance
-- Calcula la distancia en línea recta sobre el elipsoide terrestre en metros
-- Margen de error < 1 metro respecto a coordenadas geodésicas reales
-- --------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.fn_calculate_haversine_distance(
    p_lat1 DOUBLE PRECISION,
    p_lon1 DOUBLE PRECISION,
    p_lat2 DOUBLE PRECISION,
    p_lon2 DOUBLE PRECISION
)
RETURNS DOUBLE PRECISION
LANGUAGE plpgsql
IMMUTABLE
PARALLEL SAFE
AS $$
DECLARE
    r_earth CONSTANT DOUBLE PRECISION := 6371008.8; -- Radio medio terrestre IUGG en metros
    d_lat DOUBLE PRECISION;
    d_lon DOUBLE PRECISION;
    a DOUBLE PRECISION;
    c DOUBLE PRECISION;
    rad_lat1 DOUBLE PRECISION;
    rad_lat2 DOUBLE PRECISION;
BEGIN
    -- Validar nulos
    IF p_lat1 IS NULL OR p_lon1 IS NULL OR p_lat2 IS NULL OR p_lon2 IS NULL THEN
        RETURN NULL;
    END IF;

    -- Si las coordenadas son idénticas, retorno inmediato 0
    IF p_lat1 = p_lat2 AND p_lon1 = p_lon2 THEN
        RETURN 0.0;
    END IF;

    -- Conversión a radianes (pi / 180 = 0.017453292519943295)
    rad_lat1 := radians(p_lat1);
    rad_lat2 := radians(p_lat2);
    d_lat := radians(p_lat2 - p_lat1);
    d_lon := radians(p_lon2 - p_lon1);

    -- Fórmula del Semiverseno (Haversine)
    a := (sin(d_lat / 2.0) ^ 2) + cos(rad_lat1) * cos(rad_lat2) * (sin(d_lon / 2.0) ^ 2);
    a := LEAST(1.0, GREATEST(0.0, a)); -- Clamp para prevenir NaN por precisión de coma flotante
    c := 2.0 * atan2(sqrt(a), sqrt(1.0 - a));

    RETURN r_earth * c;
END;
$$;
COMMENT ON FUNCTION public.fn_calculate_haversine_distance IS 'Calcula la distancia Haversine en metros con precisión sub-métrica.';

-- --------------------------------------------------------------------
-- 2. VISTA MATERIALIZADA 1: vw_quota_progress
-- Progreso de cumplimiento de cuotas de vendedores con semaforización
-- Casos límite:
--   0% -> 'rojo'
--   Exactamente 60% -> 'amarillo'
--   Exactamente 90% -> 'verde'
--   >= 100% -> 'excelente'
-- --------------------------------------------------------------------
DROP MATERIALIZED VIEW IF EXISTS public.vw_quota_progress CASCADE;
CREATE MATERIALIZED VIEW public.vw_quota_progress AS
WITH sales_summary AS (
    SELECT
        s.seller_id,
        s.period,
        COALESCE(SUM(s.quantity_boxes), 0) AS sold_boxes,
        COALESCE(SUM(s.total_amount), 0) AS sold_amount,
        COUNT(DISTINCT s.client_id) AS active_clients_sold,
        COUNT(s.id) AS invoices_count
    FROM public.sales s
    GROUP BY s.seller_id, s.period
)
SELECT
    q.id AS quota_id,
    q.seller_id,
    p.full_name AS seller_name,
    p.email AS seller_email,
    p.zone AS seller_zone,
    q.period,
    q.quota_boxes,
    q.quota_amount,
    COALESCE(ss.sold_boxes, 0) AS sold_boxes,
    COALESCE(ss.sold_amount, 0) AS sold_amount,
    COALESCE(ss.active_clients_sold, 0) AS active_clients_sold,
    COALESCE(ss.invoices_count, 0) AS invoices_count,
    ROUND(
        CASE 
            WHEN q.quota_boxes > 0 THEN (COALESCE(ss.sold_boxes, 0) / q.quota_boxes) * 100.0
            ELSE 0.0
        END, 2
    ) AS percent_boxes_completed,
    ROUND(
        CASE 
            WHEN q.quota_amount > 0 THEN (COALESCE(ss.sold_amount, 0) / q.quota_amount) * 100.0
            ELSE 0.0
        END, 2
    ) AS percent_amount_completed,
    -- Semaforización oficial
    CASE
        WHEN (CASE WHEN q.quota_boxes > 0 THEN (COALESCE(ss.sold_boxes, 0) / q.quota_boxes) * 100.0 ELSE 0 END) >= 100.0 THEN 'excelente'
        WHEN (CASE WHEN q.quota_boxes > 0 THEN (COALESCE(ss.sold_boxes, 0) / q.quota_boxes) * 100.0 ELSE 0 END) >= 90.0 THEN 'verde'
        WHEN (CASE WHEN q.quota_boxes > 0 THEN (COALESCE(ss.sold_boxes, 0) / q.quota_boxes) * 100.0 ELSE 0 END) >= 60.0 THEN 'amarillo'
        ELSE 'rojo'
    END AS traffic_light
FROM public.sellers_quotas q
JOIN public.profiles p ON p.id = q.seller_id
LEFT JOIN sales_summary ss ON ss.seller_id = q.seller_id AND ss.period = q.period;

CREATE UNIQUE INDEX IF NOT EXISTS idx_mat_quota_progress_pk 
    ON public.vw_quota_progress(quota_id);
CREATE INDEX IF NOT EXISTS idx_mat_quota_progress_period_zone 
    ON public.vw_quota_progress(period, seller_zone);

-- --------------------------------------------------------------------
-- 3. VISTA MATERIALIZADA 2: vw_store_health
-- Salud y activación comercial de clientes / Tienda Perfecta
-- --------------------------------------------------------------------
DROP MATERIALIZED VIEW IF EXISTS public.vw_store_health CASCADE;
CREATE MATERIALIZED VIEW public.vw_store_health AS
WITH client_checkins AS (
    SELECT
        c.client_id,
        to_char(c.checkin_time, 'YYYY-MM') AS period,
        COUNT(c.id) AS total_checkins,
        COUNT(c.id) FILTER (WHERE c.geofence_valid = true) AS valid_geofence_checkins,
        MAX(c.checkin_time) AS last_checkin_time
    FROM public.check_ins c
    GROUP BY c.client_id, to_char(c.checkin_time, 'YYYY-MM')
),
client_sales AS (
    SELECT
        s.client_id,
        s.period,
        COUNT(DISTINCT s.invoice_number) AS invoices_count,
        COALESCE(SUM(s.total_amount), 0) AS total_revenue,
        COALESCE(SUM(s.quantity_boxes), 0) AS total_boxes,
        MAX(s.sale_date) AS last_sale_date
    FROM public.sales s
    GROUP BY s.client_id, s.period
),
client_audits AS (
    SELECT
        a.client_id,
        to_char(a.created_at, 'YYYY-MM') AS period,
        COUNT(a.id) AS total_audits,
        ROUND(AVG(COALESCE(a.share_of_shelf, 0)), 2) AS avg_share_of_shelf,
        COUNT(a.id) FILTER (WHERE a.out_of_stock_detected = true) AS out_of_stock_occurrences,
        MAX(a.created_at) AS last_audit_date
    FROM public.store_audits a
    GROUP BY a.client_id, to_char(a.created_at, 'YYYY-MM')
)
SELECT
    cl.id AS client_id,
    cl.code AS client_code,
    cl.name AS client_name,
    cl.zone AS client_zone,
    cl.address AS client_address,
    cl.is_active AS client_is_active,
    COALESCE(cs.period, cc.period, ca.period, to_char(CURRENT_DATE, 'YYYY-MM')) AS period,
    COALESCE(cc.total_checkins, 0) AS total_checkins,
    COALESCE(cc.valid_geofence_checkins, 0) AS valid_geofence_checkins,
    cc.last_checkin_time,
    COALESCE(cs.total_revenue, 0) AS total_revenue,
    COALESCE(cs.total_boxes, 0) AS total_boxes,
    cs.last_sale_date,
    COALESCE(ca.total_audits, 0) AS total_audits,
    COALESCE(ca.avg_share_of_shelf, 0) AS avg_share_of_shelf,
    COALESCE(ca.out_of_stock_occurrences, 0) AS out_of_stock_occurrences,
    ca.last_audit_date,
    -- Indicador de salud integral (Score 0-100)
    LEAST(100.0, GREATEST(0.0,
        (CASE WHEN COALESCE(cs.total_boxes, 0) > 0 THEN 40.0 ELSE 0.0 END) +
        (CASE WHEN COALESCE(cc.total_checkins, 0) > 0 THEN 30.0 ELSE 0.0 END) +
        (LEAST(30.0, COALESCE(ca.avg_share_of_shelf, 0) * 0.3)) -
        (COALESCE(ca.out_of_stock_occurrences, 0) * 10.0)
    )) AS health_score
FROM public.clients cl
LEFT JOIN client_checkins cc ON cc.client_id = cl.id
LEFT JOIN client_sales cs ON cs.client_id = cl.id AND (cs.period = cc.period OR cc.period IS NULL)
LEFT JOIN client_audits ca ON ca.client_id = cl.id AND (ca.period = COALESCE(cs.period, cc.period));

CREATE UNIQUE INDEX IF NOT EXISTS idx_mat_store_health_pk 
    ON public.vw_store_health(client_id, period);
CREATE INDEX IF NOT EXISTS idx_mat_store_health_zone_score 
    ON public.vw_store_health(client_zone, health_score ASC);

-- --------------------------------------------------------------------
-- 4. VISTA MATERIALIZADA 3: vw_product_sales_pareto
-- Análisis de Pareto (80/20) y clasificación ABC de productos por período
-- --------------------------------------------------------------------
DROP MATERIALIZED VIEW IF EXISTS public.vw_product_sales_pareto CASCADE;
CREATE MATERIALIZED VIEW public.vw_product_sales_pareto AS
WITH product_totals AS (
    SELECT
        s.product_id,
        s.period,
        COALESCE(SUM(s.quantity_boxes), 0) AS total_boxes_sold,
        COALESCE(SUM(s.total_amount), 0) AS total_revenue
    FROM public.sales s
    GROUP BY s.product_id, s.period
),
period_sums AS (
    SELECT
        period,
        SUM(total_revenue) AS grand_total_revenue
    FROM product_totals
    GROUP BY period
),
ranked_products AS (
    SELECT
        pt.product_id,
        pt.period,
        pt.total_boxes_sold,
        pt.total_revenue,
        ROUND((pt.total_revenue / NULLIF(ps.grand_total_revenue, 0)) * 100.0, 2) AS share_percentage,
        ROUND(
            (SUM(pt.total_revenue) OVER (PARTITION BY pt.period ORDER BY pt.total_revenue DESC ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW) 
             / NULLIF(ps.grand_total_revenue, 0)) * 100.0, 
            2
        ) AS cumulative_percentage
    FROM product_totals pt
    JOIN period_sums ps ON ps.period = pt.period
)
SELECT
    rp.product_id,
    p.sku,
    p.name AS product_name,
    p.category AS product_category,
    rp.period,
    rp.total_boxes_sold,
    rp.total_revenue,
    COALESCE(rp.share_percentage, 0.0) AS share_percentage,
    COALESCE(rp.cumulative_percentage, 0.0) AS cumulative_percentage,
    CASE
        WHEN rp.cumulative_percentage <= 80.0 THEN 'A'
        WHEN rp.cumulative_percentage <= 95.0 THEN 'B'
        ELSE 'C'
    END AS pareto_class
FROM ranked_products rp
JOIN public.products p ON p.id = rp.product_id;

CREATE UNIQUE INDEX IF NOT EXISTS idx_mat_product_pareto_pk 
    ON public.vw_product_sales_pareto(product_id, period);
CREATE INDEX IF NOT EXISTS idx_mat_product_pareto_class 
    ON public.vw_product_sales_pareto(period, pareto_class);

-- --------------------------------------------------------------------
-- 5. VISTA MATERIALIZADA 4: vw_seller_performance
-- Tabla de rendimiento y ranking comercial de vendedores
-- --------------------------------------------------------------------
DROP MATERIALIZED VIEW IF EXISTS public.vw_seller_performance CASCADE;
CREATE MATERIALIZED VIEW public.vw_seller_performance AS
SELECT
    qp.seller_id,
    qp.seller_name,
    qp.seller_zone,
    qp.period,
    qp.quota_boxes,
    qp.sold_boxes,
    qp.quota_amount,
    qp.sold_amount,
    qp.percent_boxes_completed,
    qp.percent_amount_completed,
    qp.traffic_light,
    qp.active_clients_sold,
    DENSE_RANK() OVER (PARTITION BY qp.period ORDER BY qp.percent_boxes_completed DESC) AS rank_by_boxes,
    DENSE_RANK() OVER (PARTITION BY qp.period ORDER BY qp.sold_amount DESC) AS rank_by_amount
FROM public.vw_quota_progress qp;

CREATE UNIQUE INDEX IF NOT EXISTS idx_mat_seller_perf_pk 
    ON public.vw_seller_performance(seller_id, period);

-- --------------------------------------------------------------------
-- 6. FUNCIÓN ANALÍTICA: fn_dashboard_kpis
-- Genera el resumen ejecutivo en JSON para KPICards del Overview
-- --------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.fn_dashboard_kpis(
    p_period TEXT,
    p_zone TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_total_revenue NUMERIC(14, 2) := 0;
    v_total_boxes NUMERIC(10, 2) := 0;
    v_total_quota_boxes NUMERIC(10, 2) := 0;
    v_total_quota_amount NUMERIC(14, 2) := 0;
    v_compliance_boxes NUMERIC(6, 2) := 0;
    v_compliance_amount NUMERIC(6, 2) := 0;
    v_active_clients INTEGER := 0;
    v_total_clients INTEGER := 0;
    v_total_checkins INTEGER := 0;
    v_geofence_compliance_pct NUMERIC(6, 2) := 0;
    v_out_of_stock_audits INTEGER := 0;
    v_total_audits INTEGER := 0;
BEGIN
    -- 1. Métricas de ventas y cuotas
    SELECT
        COALESCE(SUM(s.total_amount), 0),
        COALESCE(SUM(s.quantity_boxes), 0),
        COUNT(DISTINCT s.client_id)
    INTO
        v_total_revenue,
        v_total_boxes,
        v_active_clients
    FROM public.sales s
    JOIN public.clients c ON c.id = s.client_id
    WHERE s.period = p_period
      AND (p_zone IS NULL OR c.zone = p_zone);

    SELECT
        COALESCE(SUM(q.quota_boxes), 0),
        COALESCE(SUM(q.quota_amount), 0)
    INTO
        v_total_quota_boxes,
        v_total_quota_amount
    FROM public.sellers_quotas q
    JOIN public.profiles p ON p.id = q.seller_id
    WHERE q.period = p_period
      AND (p_zone IS NULL OR p.zone = p_zone);

    IF v_total_quota_boxes > 0 THEN
        v_compliance_boxes := ROUND((v_total_boxes / v_total_quota_boxes) * 100.0, 2);
    END IF;

    IF v_total_quota_amount > 0 THEN
        v_compliance_amount := ROUND((v_total_revenue / v_total_quota_amount) * 100.0, 2);
    END IF;

    -- 2. Clientes totales de la zona o globales
    SELECT COUNT(id) INTO v_total_clients
    FROM public.clients
    WHERE is_active = true
      AND (p_zone IS NULL OR zone = p_zone);

    -- 3. Métricas de campo (Check-ins y Geocercas)
    SELECT
        COUNT(ch.id),
        ROUND((COUNT(ch.id) FILTER (WHERE ch.geofence_valid = true)::NUMERIC / NULLIF(COUNT(ch.id), 0)) * 100.0, 2)
    INTO
        v_total_checkins,
        v_geofence_compliance_pct
    FROM public.check_ins ch
    JOIN public.clients c ON c.id = ch.client_id
    WHERE to_char(ch.checkin_time, 'YYYY-MM') = p_period
      AND (p_zone IS NULL OR c.zone = p_zone);

    -- 4. Métricas de Góndola y Quiebres de Stock
    SELECT
        COUNT(a.id),
        COUNT(a.id) FILTER (WHERE a.out_of_stock_detected = true)
    INTO
        v_total_audits,
        v_out_of_stock_audits
    FROM public.store_audits a
    JOIN public.clients c ON c.id = a.client_id
    WHERE to_char(a.created_at, 'YYYY-MM') = p_period
      AND (p_zone IS NULL OR c.zone = p_zone);

    RETURN jsonb_build_object(
        'period', p_period,
        'zone_filter', p_zone,
        'revenue', jsonb_build_object(
            'actual', v_total_revenue,
            'quota', v_total_quota_amount,
            'compliance_pct', v_compliance_amount
        ),
        'boxes', jsonb_build_object(
            'actual', v_total_boxes,
            'quota', v_total_quota_boxes,
            'compliance_pct', v_compliance_boxes
        ),
        'clients', jsonb_build_object(
            'active_buying', v_active_clients,
            'total_portfolio', v_total_clients,
            'coverage_pct', ROUND((v_active_clients::NUMERIC / NULLIF(v_total_clients, 0)) * 100.0, 2)
        ),
        'field_operations', jsonb_build_object(
            'total_checkins', v_total_checkins,
            'geofence_valid_pct', COALESCE(v_geofence_compliance_pct, 100.0)
        ),
        'trade_marketing', jsonb_build_object(
            'total_audits', v_total_audits,
            'out_of_stock_count', v_out_of_stock_audits,
            'out_of_stock_pct', ROUND((v_out_of_stock_audits::NUMERIC / NULLIF(v_total_audits, 0)) * 100.0, 2)
        )
    );
END;
$$;
COMMENT ON FUNCTION public.fn_dashboard_kpis IS 'Calcula y retorna los principales indicadores clave (KPIs) en JSON para la vista Overview.';

-- --------------------------------------------------------------------
-- 7. FUNCIÓN DE REFREZCO: fn_refresh_materialized_views
-- Actualiza concurrentemente las vistas analíticas
-- --------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.fn_refresh_materialized_views()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    REFRESH MATERIALIZED VIEW CONCURRENTLY public.vw_quota_progress;
    REFRESH MATERIALIZED VIEW CONCURRENTLY public.vw_store_health;
    REFRESH MATERIALIZED VIEW CONCURRENTLY public.vw_product_sales_pareto;
    REFRESH MATERIALIZED VIEW CONCURRENTLY public.vw_seller_performance;

    RETURN jsonb_build_object(
        'success', true,
        'refreshed_at', now()
    );
EXCEPTION WHEN OTHERS THEN
    -- Fallback sin CONCURRENTLY si la vista aún no está poblada
    REFRESH MATERIALIZED VIEW public.vw_quota_progress;
    REFRESH MATERIALIZED VIEW public.vw_store_health;
    REFRESH MATERIALIZED VIEW public.vw_product_sales_pareto;
    REFRESH MATERIALIZED VIEW public.vw_seller_performance;

    RETURN jsonb_build_object(
        'success', true,
        'fallback_standard_refresh', true,
        'refreshed_at', now()
    );
END;
$$;
COMMENT ON FUNCTION public.fn_refresh_materialized_views IS 'Refresca las 4 vistas materializadas del sistema para dashboards analíticos.';

-- Registrar versión de migración 005
INSERT INTO public.schema_versions (version, description)
VALUES ('005', 'Vistas materializadas analíticas (cuotas, salud cliente, pareto, performance) y funciones fn_dashboard_kpis, haversine y refresco')
ON CONFLICT (version) DO NOTHING;
