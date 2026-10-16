-- ====================================================================
-- SEED DATA: Codizulca Dashboard & Portal Móvil
-- Descripción: Datos de prueba iniciales para desarrollo.
-- ====================================================================

-- 1. Profiles (Simulando usuarios de auth.users, asumiendo IDs ficticios si no hay auth real en local,
-- pero idealmente se crearían vía API. Para testing de UI, insertamos perfiles dummy).

INSERT INTO public.profiles (id, email, full_name, role, zone, is_active)
VALUES 
  ('00000000-0000-0000-0000-000000000001', 'admin@codizulca.com', 'Admin Sistema', 'admin', 'Nacional', true),
  ('00000000-0000-0000-0000-000000000002', 'vendedor1@codizulca.com', 'Juan Vendedor', 'vendedor', 'Norte', true),
  ('00000000-0000-0000-0000-000000000003', 'vendedor2@codizulca.com', 'Maria Vendedora', 'vendedor', 'Sur', true),
  ('00000000-0000-0000-0000-000000000004', 'promotora1@codizulca.com', 'Ana Promotora', 'promotora', 'Norte', true),
  ('00000000-0000-0000-0000-000000000005', 'supervisor1@codizulca.com', 'Carlos Supervisor', 'supervisor', 'Norte', true)
ON CONFLICT (id) DO NOTHING;

-- 2. Clients
INSERT INTO public.clients (id, code, name, business_name, zone, geofence_radius_meters, is_active)
VALUES
  ('11111111-1111-1111-1111-111111111111', 'CLI-001', 'Supermercado Central', 'Inversiones Central CA', 'Norte', 100, true),
  ('11111111-1111-1111-1111-111111111112', 'CLI-002', 'Abasto El Progreso', 'El Progreso SRL', 'Norte', 100, true),
  ('11111111-1111-1111-1111-111111111113', 'CLI-003', 'Bodegón Sur', 'Bodegón Sur CA', 'Sur', 100, true),
  ('11111111-1111-1111-1111-111111111114', 'CLI-004', 'Farmacia La Paz', 'Farmanorte CA', 'Norte', 100, true),
  ('11111111-1111-1111-1111-111111111115', 'CLI-005', 'Minimarket Express', 'Express Sur CA', 'Sur', 100, true)
ON CONFLICT (id) DO NOTHING;

-- 3. Products
INSERT INTO public.products (id, sku, name, category, unit_of_measure, units_per_box, price, is_active)
VALUES
  ('22222222-2222-2222-2222-222222222221', 'SKU-001', 'Galletas Choco 100g', 'Golosinas', 'caja', 24, 12.50, true),
  ('22222222-2222-2222-2222-222222222222', 'SKU-002', 'Agua Mineral 500ml', 'Bebidas', 'caja', 24, 8.00, true),
  ('22222222-2222-2222-2222-222222222223', 'SKU-003', 'Jugo Naranja 1L', 'Bebidas', 'caja', 12, 15.00, true),
  ('22222222-2222-2222-2222-222222222224', 'SKU-004', 'Snack Papas 50g', 'Snacks', 'caja', 48, 20.00, true),
  ('22222222-2222-2222-2222-222222222225', 'SKU-005', 'Caramelos Surtidos', 'Golosinas', 'caja', 100, 10.00, true),
  ('22222222-2222-2222-2222-222222222226', 'SKU-006', 'Detergente Polvo 1kg', 'Limpieza', 'caja', 12, 25.00, true),
  ('22222222-2222-2222-2222-222222222227', 'SKU-007', 'Limpiador Multiuso 1L', 'Limpieza', 'caja', 12, 18.00, true),
  ('22222222-2222-2222-2222-222222222228', 'SKU-008', 'Café Tostado 250g', 'Alimentos', 'caja', 24, 30.00, true),
  ('22222222-2222-2222-2222-222222222229', 'SKU-009', 'Azúcar Refinada 1kg', 'Alimentos', 'caja', 24, 22.00, true),
  ('22222222-2222-2222-2222-222222222230', 'SKU-010', 'Atún Lata 140g', 'Alimentos', 'caja', 48, 40.00, true)
ON CONFLICT (id) DO NOTHING;

-- 4. System Settings
INSERT INTO public.system_settings (kill_switch_active, ai_vision_enabled)
VALUES (false, true)
ON CONFLICT DO NOTHING;

-- 5. Sellers Quotas (Ejemplo para el periodo actual)
INSERT INTO public.sellers_quotas (seller_id, period, quota_boxes, quota_amount)
VALUES
  ('00000000-0000-0000-0000-000000000002', to_char(CURRENT_DATE, 'YYYY-MM'), 500, 10000),
  ('00000000-0000-0000-0000-000000000003', to_char(CURRENT_DATE, 'YYYY-MM'), 450, 9000)
ON CONFLICT ON CONSTRAINT uq_seller_period DO NOTHING;

-- 6. Sales (Algunas ventas de ejemplo)
INSERT INTO public.sales (invoice_number, sale_date, seller_id, client_id, product_id, quantity_boxes, unit_price, total_amount, period)
VALUES
  ('INV-1001', CURRENT_DATE, '00000000-0000-0000-0000-000000000002', '11111111-1111-1111-1111-111111111111', '22222222-2222-2222-2222-222222222221', 10, 12.50, 125.00, to_char(CURRENT_DATE, 'YYYY-MM')),
  ('INV-1002', CURRENT_DATE, '00000000-0000-0000-0000-000000000002', '11111111-1111-1111-1111-111111111112', '22222222-2222-2222-2222-222222222222', 20, 8.00, 160.00, to_char(CURRENT_DATE, 'YYYY-MM')),
  ('INV-1003', CURRENT_DATE, '00000000-0000-0000-0000-000000000003', '11111111-1111-1111-1111-111111111113', '22222222-2222-2222-2222-222222222223', 5, 15.00, 75.00, to_char(CURRENT_DATE, 'YYYY-MM'))
ON CONFLICT (invoice_number) DO NOTHING;

-- Refrescar vistas materializadas (opcional aquí, pero útil tras el seed)
SELECT public.fn_refresh_materialized_views();
