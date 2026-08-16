import { useQuery } from '@tanstack/react-query';
import * as adminService from '../services/adminService';

export function useAdminOverview() {
  return useQuery({
    queryKey: ['adminOverview'],
    queryFn: adminService.getOverview,
    refetchInterval: 10000 // Refetch every 10 seconds
  });
}

export function useFarmers() {
  return useQuery({
    queryKey: ['adminFarmers'],
    queryFn: adminService.getFarmers
  });
}

export function useFarmerDetail(id) {
  return useQuery({
    queryKey: ['adminFarmerDetail', id],
    queryFn: () => adminService.getFarmerDetail(id),
    enabled: !!id
  });
}

export function useGateways() {
  return useQuery({
    queryKey: ['adminGateways'],
    queryFn: adminService.getGateways
  });
}

export function useGatewayDetail(id) {
  return useQuery({
    queryKey: ['adminGatewayDetail', id],
    queryFn: () => adminService.getGatewayDetail(id),
    enabled: !!id
  });
}

export function useNodes() {
  return useQuery({
    queryKey: ['adminNodes'],
    queryFn: adminService.getNodes
  });
}

export function useNodeDetail(id) {
  return useQuery({
    queryKey: ['adminNodeDetail', id],
    queryFn: () => adminService.getNodeDetail(id),
    enabled: !!id
  });
}

export function useDevices() {
  return useQuery({
    queryKey: ['adminDevices'],
    queryFn: adminService.getDevices
  });
}

export function useDeviceHealth() {
  return useQuery({
    queryKey: ['adminDeviceHealth'],
    queryFn: adminService.getDeviceHealth
  });
}

export function useAnalytics() {
  return useQuery({
    queryKey: ['adminAnalytics'],
    queryFn: adminService.getAnalytics
  });
}

export function useWaterAnalytics() {
  return useQuery({
    queryKey: ['adminWaterAnalytics'],
    queryFn: adminService.getWaterAnalytics
  });
}

export function useMoistureAnalytics() {
  return useQuery({
    queryKey: ['adminMoistureAnalytics'],
    queryFn: adminService.getMoistureAnalytics
  });
}

export function useActivity(filters = {}) {
  return useQuery({
    queryKey: ['adminActivity', filters],
    queryFn: () => adminService.getActivity(filters)
  });
}

export function useAlerts() {
  return useQuery({
    queryKey: ['adminAlerts'],
    queryFn: adminService.getAlerts,
    refetchInterval: 15000
  });
}
