import { useState } from 'react';
import useToastNotifications from '@/hooks/useToastNotifications';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';

export default function AdminInvite() {
  const { show, error: showError } = useToastNotifications();
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<'staff' | 'admin'>('staff');
  const [loading, setLoading] = useState(false);

  const sendInvite = async () => {
    setLoading(true);
    try {
      // This is a stub. Real implementation should call an admin-only RPC
      // which creates an invite record and emails the user. For now, we just
      // insert into a local invites table (or show a message).
      const { error } = await supabase.from('admin_invites').insert([{ email, role }]);
      if (error) throw error;
  show({ title: 'Invite recorded', description: `Invite for ${email} as ${role} created.` });
      setEmail('');
    } catch (err: any) {
      console.error('Invite error:', err);
  showError('Invite failed', String(err?.message || 'Failed to create invite'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 max-w-md">
      <h2 className="text-lg font-semibold">Invite Staff / Admin</h2>
      <div className="space-y-2 mt-4">
        <Label>Email</Label>
        <Input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="user@example.com" />
      </div>
      <div className="space-y-2 mt-2">
        <Label>Role</Label>
        <select value={role} onChange={(e) => setRole(e.target.value as any)} className="w-full">
          <option value="staff">Staff</option>
          <option value="admin">Admin</option>
        </select>
      </div>
      <Button className="mt-4" onClick={sendInvite} disabled={loading || !email}>
        {loading ? 'Sending...' : 'Send Invite'}
      </Button>
    </div>
  );
}
