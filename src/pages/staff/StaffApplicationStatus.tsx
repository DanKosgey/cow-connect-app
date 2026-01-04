import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { RefreshCw, CheckCircle, Clock, XCircle, LogOut } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

const StaffApplicationStatus = () => {
    const { user, refreshSession } = useAuth();
    const navigate = useNavigate();

    const [application, setApplication] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (user) {
            fetchApplicationStatus();
        }
    }, [user]);

    const fetchApplicationStatus = async () => {
        setLoading(true);
        try {
            // Fetch latest application
            const { data, error } = await supabase
                .from('pending_staff')
                .select('*')
                .eq('user_id', user?.id)
                .order('created_at', { ascending: false })
                .limit(1)
                .single();

            if (error && error.code !== 'PGRST116') { // Ignore no rows error
                console.error('Error fetching application:', error);
            }

            setApplication(data);

            // If approved, refresh session to get roles
            if (data?.status === 'approved') {
                refreshSession();
            }

        } catch (error) {
            console.error('Failed to fetch status:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleRefresh = () => {
        fetchApplicationStatus();
    };

    const handleSignOut = async () => {
        await supabase.auth.signOut();
        navigate('/login');
    };

    const getStatusDisplay = () => {
        if (!application) {
            return {
                icon: <AlertTitle className="h-12 w-12 text-gray-400 mb-4" />,
                title: 'No Application Found',
                description: 'We could not find a pending staff application for your account.',
                color: 'gray'
            };
        }

        switch (application.status) {
            case 'approved':
                return {
                    icon: <CheckCircle className="h-16 w-16 text-green-500 mb-4" />,
                    title: 'Application Approved!',
                    description: `Congratulations! Your application has been approved. You have been assigned the role of ${application.assigned_role}.`,
                    color: 'green',
                    action: (
                        <Button onClick={() => window.location.href = '/admin'} className="w-full mt-6 bg-green-600 hover:bg-green-700">
                            Go to Dashboard
                        </Button>
                    )
                };
            case 'rejected':
                return {
                    icon: <XCircle className="h-16 w-16 text-red-500 mb-4" />,
                    title: 'Application Rejected',
                    description: application.rejection_reason
                        ? `Your application was rejected. Reason: ${application.rejection_reason}`
                        : 'Your application was rejected. Please contact the administrator for more information.',
                    color: 'red',
                    action: (
                        <Button variant="outline" onClick={handleSignOut} className="w-full mt-6">
                            Sign Out
                        </Button>
                    )
                };
            case 'pending':
            default:
                return {
                    icon: <Clock className="h-16 w-16 text-yellow-500 mb-4" />,
                    title: 'Under Review',
                    description: 'Your application is currently being reviewed by an administrator. You will be notified once a decision is made.',
                    color: 'yellow',
                    action: (
                        <Button onClick={handleRefresh} variant="outline" className="w-full mt-6 gap-2">
                            <RefreshCw className="h-4 w-4" />
                            Check Status
                        </Button>
                    )
                };
        }
    };

    const statusDisplay = getStatusDisplay();

    if (loading) {
        return (
            <div className="flex justify-center items-center min-h-screen bg-gray-50">
                <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 flex flex-col justify-center items-center p-4">
            <Card className="max-w-md w-full shadow-lg">
                <CardContent className="pt-8 pb-8 text-center">
                    <div className="flex justify-center">
                        {statusDisplay.icon}
                    </div>
                    <h2 className="text-2xl font-bold text-gray-900 mb-2">{statusDisplay.title}</h2>
                    <p className="text-gray-600 mb-6 px-4">
                        {statusDisplay.description}
                    </p>

                    <div className="space-y-3 px-8">
                        {statusDisplay.action}

                        {application?.status !== 'rejected' && (
                            <Button variant="ghost" onClick={handleSignOut} className="w-full text-muted-foreground">
                                <LogOut className="mr-2 h-4 w-4" />
                                Sign Out
                            </Button>
                        )}
                    </div>
                </CardContent>
            </Card>
        </div>
    );
};

export default StaffApplicationStatus;
