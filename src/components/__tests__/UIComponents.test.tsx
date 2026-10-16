import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '../ui/card';
import { EmptyState } from '../ui/empty-state';

describe('UI Components Design & Rendering Test Suite', () => {
  // =========================================================================
  // 1. BADGE COMPONENT
  // =========================================================================
  describe('Badge Component', () => {
    it('debe renderizar el texto correctamente con variant por defecto', () => {
      render(<Badge>Activo</Badge>);
      const badge = screen.getByText('Activo');
      expect(badge).toBeInTheDocument();
      expect(badge.className).toContain('bg-gray-100');
    });

    it('debe aplicar estilos según el variant seleccionado (success, danger, warning)', () => {
      const { rerender } = render(<Badge variant="success">Completado</Badge>);
      expect(screen.getByText('Completado').className).toContain('bg-green-100');

      rerender(<Badge variant="danger">Cancelado</Badge>);
      expect(screen.getByText('Cancelado').className).toContain('bg-red-100');

      rerender(<Badge variant="warning">En Curso</Badge>);
      expect(screen.getByText('En Curso').className).toContain('bg-yellow-100');
    });

    it('debe aceptar classNames personalizados sin romper los estilos base', () => {
      render(<Badge className="custom-test-class">Prueba</Badge>);
      expect(screen.getByText('Prueba').className).toContain('custom-test-class');
    });
  });

  // =========================================================================
  // 2. BUTTON COMPONENT
  // =========================================================================
  describe('Button Component', () => {
    it('debe renderizar botón y reaccionar a eventos de clic', () => {
      const handleClick = vi.fn();
      render(<Button onClick={handleClick}>Sincronizar</Button>);

      const btn = screen.getByRole('button', { name: /sincronizar/i });
      expect(btn).toBeInTheDocument();

      fireEvent.click(btn);
      expect(handleClick).toHaveBeenCalledTimes(1);
    });

    it('debe deshabilitarse y no emitir eventos cuando disabled es true', () => {
      const handleClick = vi.fn();
      render(<Button disabled onClick={handleClick}>Guardar</Button>);

      const btn = screen.getByRole('button', { name: /guardar/i });
      expect(btn).toBeDisabled();

      fireEvent.click(btn);
      expect(handleClick).not.toHaveBeenCalled();
    });

    it('debe aplicar estilos según el tamaño (size: sm, default, lg)', () => {
      const { rerender } = render(<Button size="sm">Pequeño</Button>);
      expect(screen.getByRole('button').className).toContain('h-8');

      rerender(<Button size="lg">Grande</Button>);
      expect(screen.getByRole('button').className).toContain('h-10');
    });
  });

  // =========================================================================
  // 3. CARD COMPONENT
  // =========================================================================
  describe('Card Component Structure', () => {
    it('debe renderizar Card con CardHeader, CardTitle y CardContent', () => {
      render(
        <Card>
          <CardHeader>
            <CardTitle>Trade Marketing KPI</CardTitle>
          </CardHeader>
          <CardContent>
            <p>150 degustaciones ejecutadas</p>
          </CardContent>
        </Card>
      );

      expect(screen.getByText('Trade Marketing KPI')).toBeInTheDocument();
      expect(screen.getByText('150 degustaciones ejecutadas')).toBeInTheDocument();
    });
  });

  // =========================================================================
  // 4. EMPTY STATE COMPONENT (Estado Vacío Auténtico)
  // =========================================================================
  describe('EmptyState Component', () => {
    it('debe renderizar título, descripción y acción interactiva', () => {
      const handleAction = vi.fn();
      render(
        <EmptyState
          title="Esperando Solicitudes de Degustación desde la App de Vendedores"
          description="Los vendedores comerciales aún no han enviado programaciones para esta semana."
          action={<Button onClick={handleAction}>Sincronizar App Vendedores</Button>}
        />
      );

      expect(
        screen.getByText(/Esperando Solicitudes de Degustación desde la App de Vendedores/i)
      ).toBeInTheDocument();
      expect(
        screen.getByText(/Los vendedores comerciales aún no han enviado programaciones/i)
      ).toBeInTheDocument();

      const actionBtn = screen.getByRole('button', { name: /Sincronizar App Vendedores/i });
      expect(actionBtn).toBeInTheDocument();

      fireEvent.click(actionBtn);
      expect(handleAction).toHaveBeenCalledTimes(1);
    });

    it('debe renderizar sin descripción ni acción sin lanzar errores', () => {
      render(<EmptyState title="Sin Resultados" />);
      expect(screen.getByText('Sin Resultados')).toBeInTheDocument();
    });
  });
});
