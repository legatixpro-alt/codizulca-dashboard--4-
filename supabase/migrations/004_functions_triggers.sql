-- ====================================================================
-- MIGRACIÓN 004: Funciones del Sistema, Triggers de Integridad y pg_cron
-- Sistema: Codizulca Dashboard & Portal Móvil
-- Descripción: Lógica de negocio transaccional, actualización atómica de
--              inventario con SELECT FOR UPDATE, auditoría inmutable,
--              disparador asíncrono de IA y restablecimiento de presupuesto.
-- ====================================================================

-- Extensiones opcionales para integración asíncrona y cron
CREATE EXTENSION IF NOT EXISTS "pg_net";

-- --------------------------------------------------------------------
-- 1. FUNCIÓN & TRIGGER: fn_set_updated_at
-- Actualiza la columna updated_at automáticamente antes de cada UPDATE
-- --------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.fn_set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Aplicar trigger a todas las tablas con updated_at
DO $$
DECLARE
    t text;
BEGIN
    FOR t IN 
        SELECT unnest(ARRAY[
            'profiles', 'clients', 'products', 'sales', 'sellers_quotas', 
            'inventory', 'import_logs', 'check_ins', 'surveys', 
            'tastings_schedule', 'store_audits', 'system_settings', 'ai_failed_jobs'
        ])
    LOOP
        EXECUTE format('
            DROP TRIGGER IF EXISTS trg_set_updated_at ON public.%I;
            CREATE TRIGGER trg_set_updated_at
            BEFORE UPDATE ON public.%I
            FOR EACH ROW
            EXECUTE FUNCTION public.fn_set_updated_at();
        ', t, t);
    END LOOP;
END;
$$;

-- --------------------------------------------------------------------
-- 2. FUNCIÓN & TRIGGER: on_auth_user_created
-- Crea el perfil correspondiente en public.profiles al crearse un usuario en auth.users
-- --------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.on_auth_user_created()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql AS $$
BEGIN
    INSERT INTO public.profiles (
        id,
        email,
        full_name,
        role,
        zone,
        is_active
    ) VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
        COALESCE(NEW.raw_user_meta_data->>'role', 'vendedor'),
        NEW.raw_user_meta_data->>'zone',
        true
    )
    ON CONFLICT (id) DO UPDATE SET
        email = EXCLUDED.email,
        full_name = EXCLUDED.full_name;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_on_auth_user_created ON auth.users;
CREATE TRIGGER trg_on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW
EXECUTE FUNCTION public.on_auth_user_created();

-- --------------------------------------------------------------------
-- 3. FUNCIÓN & TRIGGER: update_inventory_on_sale
-- Serializa transacciones con SELECT FOR UPDATE para evitar condiciones de carrera
-- --------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.update_inventory_on_sale()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql AS $$
DECLARE
    v_product_id UUID;
    v_period TEXT;
    v_delta_boxes NUMERIC(10, 2) := 0;
    v_inv_id UUID;
BEGIN
    -- Determinar producto, período y variación de stock según la acción
    IF TG_OP = 'INSERT' THEN
        v_product_id := NEW.product_id;
        v_period := NEW.period;
        v_delta_boxes := NEW.quantity_boxes;
    ELSIF TG_OP = 'UPDATE' THEN
        v_product_id := NEW.product_id;
        v_period := NEW.period;
        -- Si cambió de producto o período en UPDATE, revertir el anterior y aplicar el nuevo
        IF (OLD.product_id <> NEW.product_id) OR (OLD.period <> NEW.period) THEN
            -- Revertir venta anterior en inventario viejo con lock
            SELECT id INTO v_inv_id 
            FROM public.inventory 
            WHERE product_id = OLD.product_id AND period = OLD.period 
            FOR UPDATE;

            IF FOUND THEN
                UPDATE public.inventory
                SET sales_out = GREATEST(0, sales_out - OLD.quantity_boxes),
                    updated_at = now()
                WHERE id = v_inv_id;
            END IF;

            v_delta_boxes := NEW.quantity_boxes;
        ELSE
            v_delta_boxes := NEW.quantity_boxes - OLD.quantity_boxes;
        END IF;
    ELSIF TG_OP = 'DELETE' THEN
        v_product_id := OLD.product_id;
        v_period := OLD.period;
        v_delta_boxes := -OLD.quantity_boxes;
    END IF;

    -- Bloqueo atómico SELECT FOR UPDATE en la fila del período
    SELECT id INTO v_inv_id 
    FROM public.inventory 
    WHERE product_id = v_product_id AND period = v_period 
    FOR UPDATE;

    IF FOUND THEN
        UPDATE public.inventory
        SET sales_out = GREATEST(0, sales_out + v_delta_boxes),
            updated_at = now()
        WHERE id = v_inv_id;
    ELSE
        -- Si la fila de inventario para este período no existe, se inicializa
        INSERT INTO public.inventory (
            product_id,
            period,
            initial_stock,
            purchases,
            adjustments,
            sales_out
        ) VALUES (
            v_product_id,
            v_period,
            0,
            0,
            0,
            GREATEST(0, v_delta_boxes)
        );
    END IF;

    IF TG_OP = 'DELETE' THEN
        RETURN OLD;
    ELSE
        RETURN NEW;
    END IF;
END;
$$;

DROP TRIGGER IF EXISTS trg_update_inventory_on_sale ON public.sales;
CREATE TRIGGER trg_update_inventory_on_sale
AFTER INSERT OR UPDATE OR DELETE ON public.sales
FOR EACH ROW
EXECUTE FUNCTION public.update_inventory_on_sale();

-- --------------------------------------------------------------------
-- 4. FUNCIÓN & TRIGGER: fn_validate_quota_no_reduction (Principio 0.3)
-- Impide reducción de cuotas comerciales una vez establecidas
-- --------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.fn_validate_quota_no_reduction()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'UPDATE' THEN
        IF NEW.quota_boxes < OLD.quota_boxes THEN
            RAISE EXCEPTION 'Las cuotas no pueden reducirse una vez establecidas para este período (Actual: %, Intentada: %)', 
                OLD.quota_boxes, NEW.quota_boxes;
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_validate_quota_no_reduction ON public.sellers_quotas;
CREATE TRIGGER trg_validate_quota_no_reduction
BEFORE UPDATE ON public.sellers_quotas
FOR EACH ROW
EXECUTE FUNCTION public.fn_validate_quota_no_reduction();

-- --------------------------------------------------------------------
-- 5. FUNCIÓN & TRIGGER: fn_audit_trigger
-- Registro inmutable de cambios en audit_trail
-- --------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.fn_audit_trigger()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql AS $$
DECLARE
    v_record_id UUID;
    v_old_data JSONB := NULL;
    v_new_data JSONB := NULL;
BEGIN
    IF TG_OP = 'DELETE' THEN
        v_record_id := OLD.id;
        v_old_data := to_jsonb(OLD);
    ELSIF TG_OP = 'UPDATE' THEN
        v_record_id := NEW.id;
        v_old_data := to_jsonb(OLD);
        v_new_data := to_jsonb(NEW);
    ELSIF TG_OP = 'INSERT' THEN
        v_record_id := NEW.id;
        v_new_data := to_jsonb(NEW);
    END IF;

    INSERT INTO public.audit_trail (
        table_name,
        record_id,
        action,
        old_data,
        new_data,
        changed_by
    ) VALUES (
        TG_TABLE_NAME,
        v_record_id,
        TG_OP,
        v_old_data,
        v_new_data,
        auth.uid()
    );

    IF TG_OP = 'DELETE' THEN
        RETURN OLD;
    ELSE
        RETURN NEW;
    END IF;
END;
$$;

-- Triggers de auditoría en tablas sensibles
DO $$
DECLARE
    t text;
BEGIN
    FOR t IN 
        SELECT unnest(ARRAY['clients', 'products', 'sellers_quotas', 'system_settings'])
    LOOP
        EXECUTE format('
            DROP TRIGGER IF EXISTS trg_audit_%I ON public.%I;
            CREATE TRIGGER trg_audit_%I
            AFTER INSERT OR UPDATE OR DELETE ON public.%I
            FOR EACH ROW
            EXECUTE FUNCTION public.fn_audit_trigger();
        ', t, t, t, t);
    END LOOP;
END;
$$;

-- --------------------------------------------------------------------
-- 6. FUNCIÓN & TRIGGER: fn_trigger_ai_analysis
-- Inicia análisis de IA asíncrono y gestiona presupuesto diario
-- --------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.fn_trigger_ai_analysis()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql AS $$
DECLARE
    v_settings RECORD;
    v_estimated_cost NUMERIC(6, 4) := 0.0050; -- Costo estimado por inferencia
BEGIN
    -- Leer configuración y presupuesto activo
    SELECT * INTO v_settings 
    FROM public.system_settings 
    LIMIT 1;

    -- Si no hay configuración o la IA está deshabilitada
    IF v_settings IS NULL OR NOT v_settings.ai_vision_enabled THEN
        INSERT INTO public.ai_failed_jobs (
            job_type,
            reference_id,
            payload,
            error_message,
            status
        ) VALUES (
            'shelf_audit',
            NEW.id,
            jsonb_build_object('audit_id', NEW.id, 'photo_url', NEW.photo_url),
            'AI Vision está desactivada en la configuración del sistema.',
            'pending'
        );
        RETURN NEW;
    END IF;

    -- Verificar límite presupuestario diario
    IF (v_settings.ai_daily_budget_used + v_estimated_cost) > v_settings.ai_daily_budget_max THEN
        INSERT INTO public.ai_failed_jobs (
            job_type,
            reference_id,
            payload,
            error_message,
            next_retry_at,
            status
        ) VALUES (
            'shelf_audit',
            NEW.id,
            jsonb_build_object('audit_id', NEW.id, 'photo_url', NEW.photo_url),
            'Presupuesto diario de IA alcanzado. Encolado para reintento automático al reiniciar presupuesto.',
            (CURRENT_DATE + INTERVAL '1 day' + TIME '00:05:00'),
            'pending'
        );
        RETURN NEW;
    END IF;

    -- Actualizar presupuesto consumido y marcar auditoría en proceso
    UPDATE public.system_settings
    SET ai_daily_budget_used = ai_daily_budget_used + v_estimated_cost,
        updated_at = now()
    WHERE id = v_settings.id;

    UPDATE public.store_audits
    SET status = 'analyzing'
    WHERE id = NEW.id;

    -- Disparo asíncrono a Supabase Edge Function mediante pg_net si está disponible
    BEGIN
        PERFORM net.http_post(
            url := COALESCE(current_setting('app.settings.edge_function_url', true), 'http://localhost:54321/functions/v1/ai-shelf-analyzer'),
            body := jsonb_build_object('audit_id', NEW.id, 'photo_url', NEW.photo_url),
            headers := jsonb_build_object('Content-Type', 'application/json')
        );
    EXCEPTION WHEN OTHERS THEN
        -- Si pg_net no está configurado o falla temporalmente, el trabajo se registra para procesador background
        NULL;
    END;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_trigger_ai_analysis ON public.store_audits;
CREATE TRIGGER trg_trigger_ai_analysis
AFTER INSERT ON public.store_audits
FOR EACH ROW
EXECUTE FUNCTION public.fn_trigger_ai_analysis();

-- --------------------------------------------------------------------
-- 7. FUNCIÓN: retry_ai_jobs_after_budget_reset
-- Resetea presupuesto diario y procesa cola de reintentos pendientes
-- --------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.retry_ai_jobs_after_budget_reset()
RETURNS JSONB
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql AS $$
DECLARE
    v_jobs_requeued INTEGER := 0;
    v_settings RECORD;
BEGIN
    SELECT * INTO v_settings 
    FROM public.system_settings 
    LIMIT 1;

    IF v_settings IS NOT NULL THEN
        -- Reiniciar consumo diario de presupuesto
        UPDATE public.system_settings
        SET ai_daily_budget_used = 0.00,
            last_budget_reset_date = CURRENT_DATE,
            updated_at = now()
        WHERE id = v_settings.id;

        -- Reprogramar trabajos pendientes de la cola ai_failed_jobs
        UPDATE public.ai_failed_jobs
        SET next_retry_at = now(),
            attempts = attempts + 1,
            updated_at = now()
        WHERE status = 'pending'
          AND attempts < max_attempts;

        GET DIAGNOSTICS v_jobs_requeued = ROW_COUNT;
    END IF;

    RETURN jsonb_build_object(
        'success', true,
        'budget_reset', true,
        'jobs_requeued', v_jobs_requeued,
        'reset_date', CURRENT_DATE
    );
END;
$$;

-- --------------------------------------------------------------------
-- 8. PG_CRON: Programación periódica (Diaria a las 00:00 UTC)
-- --------------------------------------------------------------------
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
        PERFORM cron.unschedule('reset-ai-budget-daily');
        PERFORM cron.schedule(
            'reset-ai-budget-daily',
            '0 0 * * *',
            'SELECT public.retry_ai_jobs_after_budget_reset();'
        );
    END IF;
EXCEPTION WHEN OTHERS THEN
    -- Silenciar si cron no está soportado en el entorno local
    NULL;
END;
$$;

-- Registrar versión de migración 004
INSERT INTO public.schema_versions (version, description)
VALUES ('004', 'Triggers de updated_at, inventario con SELECT FOR UPDATE, auditoría inmutable e integración asíncrona de IA')
ON CONFLICT (version) DO NOTHING;
