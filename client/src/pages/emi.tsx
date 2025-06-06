import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Plus, CreditCard, CheckCircle, Clock, AlertTriangle, Trash2 } from "lucide-react";
import { getAuthHeaders } from "@/lib/auth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

const emiSchema = z.object({
  vehicleId: z.number().min(1, "Please select a vehicle"),
  amount: z.string()
    .min(1, "Amount is required")
    .regex(/^\d+(\.\d{1,2})?$/, "Please enter a valid amount"),
  dueDate: z.string().min(1, "Due date is required"),
  month: z.string().min(1, "Month is required"),
  year: z.number().min(2024, "Year must be valid"),
  description: z.string().optional(),
});

type EmiFormData = z.infer<typeof emiSchema>;

export default function EmiManagement() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [showAddModal, setShowAddModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  // Fetch EMI payments
  const { data: emiPayments = [], isLoading } = useQuery({
    queryKey: ["/api/emi"],
    queryFn: async () => {
      const response = await fetch("/api/emi", {
        headers: getAuthHeaders(),
        credentials: "include",
      });
      if (!response.ok) throw new Error("Failed to fetch EMI payments");
      return response.json();
    },
  });

  // Fetch vehicles
  const { data: vehicles = [] } = useQuery({
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

  const form = useForm<EmiFormData>({
    resolver: zodResolver(emiSchema),
    defaultValues: {
      vehicleId: 0,
      amount: "",
      dueDate: "",
      month: "",
      year: new Date().getFullYear(),
      description: "",
    },
  });

  const createEmiMutation = useMutation({
    mutationFn: async (data: EmiFormData) => {
      const response = await apiRequest("POST", "/api/emi", {
        ...data,
        dueDate: new Date(data.dueDate).toISOString(),
      });
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "EMI Payment Added",
        description: "EMI payment has been scheduled successfully!",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/emi"] });
      setShowAddModal(false);
      form.reset();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to add EMI payment",
        variant: "destructive",
      });
    },
  });

  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: number; status: string }) => {
      const response = await apiRequest("PATCH", `/api/emi/${id}/status`, { status });
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Status Updated",
        description: "EMI payment status updated successfully!",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/emi"] });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update status",
        variant: "destructive",
      });
    },
  });

  const deleteEmiMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await apiRequest("DELETE", `/api/emi/${id}`);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "EMI Payment Deleted",
        description: "EMI payment has been removed successfully!",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/emi"] });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete EMI payment",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: EmiFormData) => {
    createEmiMutation.mutate(data);
  };

  const handleStatusUpdate = (id: number, status: string) => {
    updateStatusMutation.mutate({ id, status });
  };

  const handleDelete = (id: number) => {
    if (confirm("Are you sure you want to delete this EMI payment?")) {
      deleteEmiMutation.mutate(id);
    }
  };

  // Filter EMI payments
  const filteredEmiPayments = emiPayments.filter((emi: any) => {
    const matchesSearch = emi.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         vehicles.find((v: any) => v.id === emi.vehicleId)?.licensePlate?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === "all" || emi.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case "paid":
        return "bg-green-100 text-green-700";
      case "pending":
        return "bg-yellow-100 text-yellow-700";
      case "overdue":
        return "bg-red-100 text-red-700";
      default:
        return "bg-gray-100 text-gray-700";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "paid":
        return <CheckCircle className="w-4 h-4" />;
      case "pending":
        return <Clock className="w-4 h-4" />;
      case "overdue":
        return <AlertTriangle className="w-4 h-4" />;
      default:
        return <Clock className="w-4 h-4" />;
    }
  };

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-gray-200 rounded w-1/3"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="h-48 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">EMI Management</h1>
          <p className="text-gray-500">Track monthly vehicle payment obligations</p>
        </div>
        <Button onClick={() => setShowAddModal(true)} className="bg-blue-600 hover:bg-blue-700">
          <Plus className="w-4 h-4 mr-2" />
          Add EMI Payment
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <Input
                placeholder="Search by vehicle or description..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full md:w-48">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="paid">Paid</SelectItem>
                <SelectItem value="overdue">Overdue</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* EMI Payments Grid */}
      {filteredEmiPayments.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <CreditCard className="w-16 h-16 mx-auto mb-4 text-gray-400" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No EMI Payments Found</h3>
            <p className="text-gray-500 mb-4">Start tracking vehicle monthly payments by adding your first EMI record.</p>
            <Button onClick={() => setShowAddModal(true)} className="bg-blue-600 hover:bg-blue-700">
              <Plus className="w-4 h-4 mr-2" />
              Add First EMI Payment
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredEmiPayments.map((emi: any) => {
            const vehicle = vehicles.find((v: any) => v.id === emi.vehicleId);
            const dueDate = new Date(emi.dueDate);
            const isOverdue = dueDate < new Date() && emi.status === "pending";
            
            return (
              <Card key={emi.id} className={`border-l-4 ${
                emi.status === "paid" ? "border-l-green-500" : 
                isOverdue ? "border-l-red-500" : "border-l-yellow-500"
              }`}>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg">{vehicle?.licensePlate || "Unknown Vehicle"}</CardTitle>
                    <Badge className={getStatusColor(emi.status)}>
                      {getStatusIcon(emi.status)}
                      <span className="ml-1 capitalize">{emi.status}</span>
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <p className="text-2xl font-bold text-gray-900">₹{parseFloat(emi.amount).toLocaleString()}</p>
                    <p className="text-sm text-gray-500">{emi.month} {emi.year}</p>
                  </div>
                  
                  <div>
                    <p className="text-sm text-gray-500">Due Date</p>
                    <p className="font-medium">{dueDate.toLocaleDateString()}</p>
                  </div>

                  {emi.description && (
                    <div>
                      <p className="text-sm text-gray-500">Description</p>
                      <p className="text-sm">{emi.description}</p>
                    </div>
                  )}

                  {emi.paidDate && (
                    <div>
                      <p className="text-sm text-gray-500">Paid On</p>
                      <p className="text-sm font-medium text-green-600">
                        {new Date(emi.paidDate).toLocaleDateString()}
                      </p>
                    </div>
                  )}

                  <div className="flex justify-between pt-2">
                    {emi.status === "pending" && (
                      <Button
                        size="sm"
                        onClick={() => handleStatusUpdate(emi.id, "paid")}
                        className="bg-green-600 hover:bg-green-700"
                        disabled={updateStatusMutation.isPending}
                      >
                        Mark as Paid
                      </Button>
                    )}
                    
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleDelete(emi.id)}
                      disabled={deleteEmiMutation.isPending}
                      className="text-red-600 hover:text-red-700 hover:border-red-300"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Add EMI Payment Modal */}
      <Dialog open={showAddModal} onOpenChange={setShowAddModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Add EMI Payment</DialogTitle>
          </DialogHeader>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="vehicleId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Vehicle</FormLabel>
                    <Select onValueChange={(value) => field.onChange(parseInt(value))}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select vehicle" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {vehicles.map((vehicle: any) => (
                          <SelectItem key={vehicle.id} value={vehicle.id.toString()}>
                            {vehicle.licensePlate} - {vehicle.model}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="amount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>EMI Amount</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">₹</span>
                        <Input {...field} type="number" placeholder="0" className="pl-8" />
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="month"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Month</FormLabel>
                      <Select onValueChange={field.onChange}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select month" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {[
                            "January", "February", "March", "April", "May", "June",
                            "July", "August", "September", "October", "November", "December"
                          ].map((month) => (
                            <SelectItem key={month} value={month}>{month}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="year"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Year</FormLabel>
                      <FormControl>
                        <Input 
                          {...field} 
                          type="number" 
                          placeholder="2024"
                          onChange={(e) => field.onChange(parseInt(e.target.value))}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="dueDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Due Date</FormLabel>
                    <FormControl>
                      <Input {...field} type="date" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description (Optional)</FormLabel>
                    <FormControl>
                      <Textarea {...field} placeholder="Additional notes about this EMI payment..." rows={3} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

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
                  className="flex-1 bg-blue-600 hover:bg-blue-700"
                  disabled={createEmiMutation.isPending}
                >
                  {createEmiMutation.isPending ? "Adding..." : "Add EMI Payment"}
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}