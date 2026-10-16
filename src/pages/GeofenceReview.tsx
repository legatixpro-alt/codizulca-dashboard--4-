import React from 'react';
import { useSupabaseQuery } from '../hooks/useSupabaseQuery';
import { supabase } from '../lib/supabase';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { DataTable } from '../components/ui/data-table';
import { Badge } from '../components/ui/badge';
import { MapPin, AlertTriangle, UserCheck } from 'lucide-react';
import { Button } from '../components/ui/button';

export const GeofenceReview: React.FC = () => {
  const { data: reviewData, isLoading, refetch } = useSupabaseQuery(
    ['geofence_review'],
    () => supabase
      .from('check_ins')
      .select(`
        *,
        promoter:profiles!promoter_id(full_name),
        client:clients!client_id(name)
      `)
      .eq('geofence_valid', false)
      .order('checkin_time', { ascending: false })
  );

  const handleOverride = async (id: string) => {
    try {
      const { error } = await supabase
        .from('check_ins')
        .update({ geofence_valid: true } as never)
        .eq('id', id);

      if (error) throw error;
      refetch();
    } catch (err) {
      console.error('Error overriding check-in:', err);
      alert('Error al aprobar el check-in.');
    }
  };

  const formatDate = (dateStr: string) => new Date(dateStr).toLocaleString('es-VE');

  return (
    <div className="space-y-6 animate-in fade-in-50 duration-500">
      <div>
        <h2 className="text-2xl font-bold tracking-tight text-gray-900">Geofence Review</h2>
        <p className="text-sm text-gray-500">Revisión y validación de visitas reportadas fuera de perímetro.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-yellow-500" />
            Check-Ins Pendientes de Revisión
          </CardTitle>
        </CardHeader>
        <CardContent>
          <DataTable
            isLoading={isLoading}
            data={reviewData || []}
            columns={[
              {
                header: 'Fecha / Hora',
                accessorKey: (row: any) => <span className="text-sm font-medium">{formatDate(row.checkin_time)}</span>
              },
              {
                header: 'Promotora / Vendedor',
                accessorKey: (row: any) => row.promoter?.full_name || 'N/A'
              },
              {
                header: 'Cliente PDV',
                accessorKey: (row: any) => row.client?.name || 'N/A'
              },
              {
                header: 'Distancia',
                accessorKey: (row: any) => (
                  <div className="flex items-center gap-1 text-red-600 font-bold">
                    <MapPin className="h-4 w-4" />
                    {Math.round(row.distance_to_client_meters)}m
                  </div>
                )
              },
              {
                header: 'Estado',
                accessorKey: (row: any) => (
                  <Badge variant={row.fake_gps_suspected ? 'danger' : 'warning'}>
                    {row.fake_gps_suspected ? 'Posible Fake GPS' : 'Fuera de Rango'}
                  </Badge>
                )
              },
              {
                header: 'Acción',
                accessorKey: (row: any) => (
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => handleOverride(row.id)}
                    className="gap-2"
                  >
                    <UserCheck className="h-4 w-4 text-green-600" />
                    <span className="text-green-700">Aprobar Manual</span>
                  </Button>
                )
              }
            ]}
          />
        </CardContent>
      </Card>
    </div>
  );
};
