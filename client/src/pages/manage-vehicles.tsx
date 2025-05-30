import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus, Trash2, Truck, CheckCircle, Route, TrendingUp } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { apiRequest } from "@/lib/queryClient";
import { getAuthHeaders } from "@/lib/auth";
import { useToast } from "@/hooks/use-toast";
import { Link, useLocation } from "wouter";

const vehicleSchema = z.object({
  licensePlate: z.string().min(1, "License plate is required"),
  model: z.string().min(1, "Model is required"),
});

type VehicleFormData = z.infer<typeof vehicleSchema>;

export default function ManageVehicles() {
  const [location] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [showAddModal, setShowAddModal] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<VehicleFormData>({
    resolver: zodResolver(vehicleSchema),
  });

  const { data: vehicles = [], isLoading } = useQuery({
    queryKey: ["/api/vehicles"],
    queryFn: async () => {
      const response = await fetch("/api/vehicles", {
        headers: getAuthHeaders(),
        credentials: "include",
      });
      if (!response.ok) throw new Error("Failed to fetch vehicles");
      return response.json();
    },
  });

  const { data: dashboardStats } = useQuery({
    queryKey: ["/api/dashboard/stats"],
    queryFn: async () => {
      const response = await fetch("/api/dashboard/stats", {
        headers: getAuthHeaders(),
        credentials: "include",
      });
      if (!response.ok) throw new Error("Failed to fetch dashboard stats");
      return response.json();
    },
  });

  const createVehicleMutation = useMutation({
    mutationFn: async (data: VehicleFormData) => {
      const response = await apiRequest("POST", "/api/vehicles", data);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Vehicle Added",
        description: "New vehicle has been added successfully!",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/vehicles"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/stats"] });
      setShowAddModal(false);
      reset();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to add vehicle",
        variant: "destructive",
      });
    },
  });

  const deleteVehicleMutation = useMutation({
    mutationFn: async (vehicleId: number) => {
      const response = await apiRequest("DELETE", `/api/vehicles/${vehicleId}`);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Vehicle Deleted",
        description: "Vehicle has been deleted successfully!",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/vehicles"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/stats"] });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete vehicle",
        variant: "destructive",
      });
    },
  });

  const handleDeleteVehicle = (vehicleId: number, licensePlate: string) => {
    const confirmMessage = `Are you sure you want to delete vehicle "${licensePlate}"?\n\nThis action cannot be undone and will remove all associated data.`;
    if (window.confirm(confirmMessage)) {
      deleteVehicleMutation.mutate(vehicleId);
    }
  };

  const onSubmit = (data: VehicleFormData) => {
    createVehicleMutation.mutate(data);
  };

  const fleetAvailability = dashboardStats?.vehicles?.total > 0 
    ? Math.round(((dashboardStats.vehicles.available || 0) / dashboardStats.vehicles.total) * 100)
    : 0;

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/4"></div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-24 bg-gray-200 rounded"></div>
            ))}
          </div>
          <div className="h-64 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      {/* Tab Navigation */}
      <div className="flex space-x-6 mb-8 border-b border-gray-200">
        <Link href="/financial-management">
          <button className={`pb-3 font-medium transition-colors ${
            location === '/financial-management' 
              ? 'border-b-2 border-gray-900 text-gray-900' 
              : 'text-gray-500 hover:text-gray-700'
          }`}>
            Overview
          </button>
        </Link>
        <Link href="/manage-vehicles">
          <button className={`pb-3 font-medium transition-colors ${
            location === '/manage-vehicles' 
              ? 'border-b-2 border-gray-900 text-gray-900' 
              : 'text-gray-500 hover:text-gray-700'
          }`}>
            Fleet Management
          </button>
        </Link>
        <Link href="/salaries">
          <button className={`pb-3 font-medium transition-colors ${
            location === '/salaries' 
              ? 'border-b-2 border-gray-900 text-gray-900' 
              : 'text-gray-500 hover:text-gray-700'
          }`}>
            Finances
          </button>
        </Link>
      </div>

      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Manage Vehicles</h1>
          <p className="text-gray-500">Overview and management of your vehicle fleet</p>
        </div>
        
        <Dialog open={showAddModal} onOpenChange={setShowAddModal}>
          <DialogTrigger asChild>
            <Button className="bg-gray-900 hover:bg-gray-800">
              <Plus className="w-4 h-4 mr-2" />
              Add Vehicle
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Add New Vehicle</DialogTitle>
            </DialogHeader>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div>
                <Label>License Plate</Label>
                <Input 
                  {...register("licensePlate")}
                  placeholder="e.g., TS16UD1468"
                  className="mt-1"
                />
                {errors.licensePlate && (
                  <p className="text-red-500 text-sm mt-1">{errors.licensePlate.message}</p>
                )}
              </div>

              <div>
                <Label>Vehicle Model</Label>
                <Input 
                  {...register("model")}
                  placeholder="e.g., Tata Ace"
                  className="mt-1"
                />
                {errors.model && (
                  <p className="text-red-500 text-sm mt-1">{errors.model.message}</p>
                )}
              </div>

              <div className="flex space-x-3 pt-4">
                <Button 
                  type="button" 
                  variant="outline" 
                  className="flex-1"
                  onClick={() => setShowAddModal(false)}
                >
                  Cancel
                </Button>
                <Button 
                  type="submit" 
                  className="flex-1 bg-gray-900 hover:bg-gray-800"
                  disabled={createVehicleMutation.isPending}
                >
                  {createVehicleMutation.isPending ? "Adding..." : "Add Vehicle"}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Fleet Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <Card className="bg-blue-50 border-blue-200">
          <CardContent className="p-4">
            <div className="flex items-center">
              <Truck className="text-blue-600 mr-3" size={24} />
              <div>
                <p className="text-2xl font-bold text-blue-600">{dashboardStats?.vehicles?.total || 0}</p>
                <p className="text-sm text-blue-700">Total Fleet</p>
                <p className="text-xs text-blue-600">Registered vehicles in system</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-green-50 border-green-200">
          <CardContent className="p-4">
            <div className="flex items-center">
              <CheckCircle className="text-green-600 mr-3" size={24} />
              <div>
                <p className="text-2xl font-bold text-green-600">{dashboardStats?.vehicles?.available || 0}</p>
                <p className="text-sm text-green-700">Available</p>
                <p className="text-xs text-green-600">Ready for new journeys</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-orange-50 border-orange-200">
          <CardContent className="p-4">
            <div className="flex items-center">
              <Route className="text-orange-600 mr-3" size={24} />
              <div>
                <p className="text-2xl font-bold text-orange-600">{dashboardStats?.vehicles?.inUse || 0}</p>
                <p className="text-sm text-orange-700">In Transit</p>
                <p className="text-xs text-orange-600">Currently on active journeys</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bs-gradient-purple text-white">
          <CardContent className="p-4">
            <div className="flex items-center">
              <TrendingUp className="text-white mr-3" size={24} />
              <div>
                <p className="text-2xl font-bold">{fleetAvailability}%</p>
                <p className="text-sm opacity-90">Fleet Availability</p>
                <p className="text-xs opacity-80">
                  {dashboardStats?.vehicles?.inUse || 0}% → {dashboardStats?.vehicles?.available || 0}%
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Vehicle List */}
      <Card>
        <div className="p-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold mb-4">Vehicle List</h3>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Button variant="default" size="sm">All Vehicles</Button>
              <Button variant="ghost" size="sm">Available</Button>
              <Button variant="ghost" size="sm">In Use</Button>
            </div>
            <Input placeholder="Search license plates..." className="w-64" />
          </div>
        </div>

        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">License Plate</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Model</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Added On</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {vehicles.map((vehicle: any) => (
                  <tr key={vehicle.id}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">{vehicle.licensePlate}</div>
                      <div className="text-sm text-gray-500">ID: {vehicle.id}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{vehicle.model}</td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <Badge variant={vehicle.status === 'available' ? 'default' : 'secondary'}>
                        {vehicle.status}
                      </Badge>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(vehicle.addedOn).toLocaleDateString()} {new Date(vehicle.addedOn).toLocaleTimeString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeleteVehicle(vehicle.id, vehicle.licensePlate)}
                        className="text-red-600 hover:text-red-900"
                        disabled={deleteVehicleMutation.isPending || vehicle.status === 'in_use'}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          
          {vehicles.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              <Truck className="w-12 h-12 mx-auto mb-4 text-gray-300" />
              <p>No vehicles found. Add your first vehicle to get started.</p>
            </div>
          )}
          
          <div className="p-4 border-t border-gray-200 text-sm text-gray-500">
            Showing {vehicles.length} vehicles
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
