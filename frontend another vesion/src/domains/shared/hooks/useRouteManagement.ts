import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { RoutesAPI } from '@/services/ApiService';
import { RouteData, RouteStatus } from '@/types/route';

interface UseRouteManagementProps {
  staffId: string;
}

export const useRouteManagement = ({ staffId }: UseRouteManagementProps) => {
  const queryClient = useQueryClient();
  const [selectedRouteId, setSelectedRouteId] = useState<string | null>(null);

  // Fetch all routes for the staff member
  const {
    data: routes = [],
    isLoading: isLoadingRoutes,
    isError: isErrorRoutes,
    error: routesError,
    refetch: refetchRoutes,
  } = useQuery<RouteData[]>({
    queryKey: ['routes', staffId],
    queryFn: async () => {
      const routeData = await RoutesAPI.getStaffRoutes(staffId);
      
      // Transform the data to match our RouteData interface
      return routeData.map((route: any) => ({
        id: route.id,
        name: route.name || `Route ${route.id.substring(0, 8)}`,
        assigned_staff: route.staff_id,
        farmers: route.farmers || [],
        estimated_duration: route.estimated_duration || 0,
        total_distance: route.total_distance || 0,
        status: route.status || 'planned',
        scheduled_date: route.scheduled_date ? new Date(route.scheduled_date) : new Date()
      }));
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  // Get the currently selected route
  const selectedRoute = routes.find(route => route.id === selectedRouteId) || null;

  // Select the first route by default if none is selected and routes are loaded
  useEffect(() => {
    if (routes.length > 0 && !selectedRouteId) {
      setSelectedRouteId(routes[0].id);
    }
  }, [routes, selectedRouteId]);

  // Mutation to start a route
  const startRouteMutation = useMutation({
    mutationFn: async ({ routeId, location }: { routeId: string; location: { lat: number; lng: number } }) => {
      return RoutesAPI.startRoute(routeId, location);
    },
    onSuccess: (_, variables) => {
      // Update the route status in the cache
      queryClient.setQueryData<RouteData[]>(['routes', staffId], oldRoutes => {
        if (!oldRoutes) return oldRoutes;
        
        return oldRoutes.map(route => 
          route.id === variables.routeId 
            ? { ...route, status: 'active' as RouteStatus } 
            : route
        );
      });
    },
  });

  // Mutation to complete a route
  const completeRouteMutation = useMutation({
    mutationFn: async (routeId: string) => {
      // In a real implementation, you would call the complete route endpoint
      // For now, we'll just return a mock response
      return { message: 'Route completed successfully' };
    },
    onSuccess: (_, routeId) => {
      // Update the route status in the cache
      queryClient.setQueryData<RouteData[]>(['routes', staffId], oldRoutes => {
        if (!oldRoutes) return oldRoutes;
        
        return oldRoutes.map(route => 
          route.id === routeId 
            ? { ...route, status: 'completed' as RouteStatus } 
            : route
        );
      });
      
      // Refresh the routes data
      refetchRoutes();
    },
  });

  // Mutation to optimize a route
  const optimizeRouteMutation = useMutation({
    mutationFn: async ({ routeId, criteria }: { routeId: string; criteria: 'distance' | 'time' | 'priority' }) => {
      return RoutesAPI.optimizeRoute(routeId, criteria);
    },
    onSuccess: () => {
      // Refresh the routes data after optimization
      refetchRoutes();
    },
  });

  return {
    // Data
    routes,
    selectedRoute,
    selectedRouteId,
    
    // Loading states
    isLoadingRoutes,
    isErrorRoutes,
    routesError,
    
    // Actions
    setSelectedRouteId,
    refetchRoutes,
    startRoute: startRouteMutation.mutate,
    isStartingRoute: startRouteMutation.isPending,
    completeRoute: completeRouteMutation.mutate,
    isCompletingRoute: completeRouteMutation.isPending,
    optimizeRoute: optimizeRouteMutation.mutate,
    isOptimizingRoute: optimizeRouteMutation.isPending,
  };
};