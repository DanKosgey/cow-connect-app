import { DashboardLayout } from '@/components/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

const Farmers = () => {
  const [farmers, setFarmers] = useState<any[]>([]);

  useEffect(() => {
    const fetch = async () => {
      const { data, error } = await supabase.from('farmers').select('id, registration_number, full_name, phone_number, kyc_status').order('created_at', { ascending: false });
      if (!error && data) setFarmers(data as any[]);
    };
    fetch();
  }, []);

  return (
    <DashboardLayout>
      <div className="p-8">
        <Card>
          <CardHeader>
            <CardTitle>Farmers</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Registration</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {farmers.map((f) => (
                  <TableRow key={f.id}>
                    <TableCell>{f.registration_number}</TableCell>
                    <TableCell>{f.full_name}</TableCell>
                    <TableCell>{f.phone_number}</TableCell>
                    <TableCell>{f.kyc_status}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default Farmers;
