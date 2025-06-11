import { useState, useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { getAuthHeaders } from "@/lib/auth";

const editVehicleSchema = z.object({
  licensePlate: z.string().min(3, "License plate must be at least 3 characters"),
  model: z.string().min(2, "Model must be at least 2 characters"),
  status: z.enum(["available", "in_transit", "maintenance"]),
  monthlyEmi: z.string().optional(),
});

type EditVehicleFormData = z.infer<typeof editVehicleSchema>;

interface EditVehicleModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  vehicle: any;
}

export default function EditVehicleModal({ open, onOpenChange, vehicle }: EditVehicleModalProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const form = useForm<EditVehicleFormData>({
    resolver: zodResolver(editVehicleSchema),
    defaultValues: {
      licensePlate: "",
      model: "",
      status: "available",
      monthlyEmi: "",
    },
  });

  // Update form values when vehicle prop changes
  useEffect(() => {
    if (vehicle) {
      form.reset({
        licensePlate: vehicle.licensePlate || "",
        model: vehicle.model || "",
        status: vehicle.status || "available",
        monthlyEmi: vehicle.monthlyEmi || "",
      });
    }
  }, [vehicle, form]);

  const updateVehicleMutation = useMutation({
    mutationFn: async (data: EditVehicleFormData) => {
      const updateData: any = {
        licensePlate: data.licensePlate,
        model: data.model,
        status: data.status,
      };

      const response = await fetch(`/api/vehicles/${vehicle.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          ...getAuthHeaders(),
        },
        credentials: "include",
        body: JSON.stringify(updateData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to update vehicle");
      }

      return response.json();
    },
    onSuccess: async (_, variables) => {
      toast({
        title: "Success",
        description: "Vehicle updated successfully",
      });

      // Update monthly EMI if provided
      if (variables.monthlyEmi && variables.monthlyEmi.trim() !== "") {
        try {
          const emiResponse = await fetch(`/api/vehicles/${vehicle.id}/emi`, {
            method: "PUT",
            headers: {
              "Content-Type": "application/json",
              ...getAuthHeaders(),
            },
            credentials: "include",
            body: JSON.stringify({ monthlyEmi: variables.monthlyEmi }),
          });

          if (emiResponse.ok) {
            toast({
              title: "Success",
              description: "Vehicle monthly EMI updated successfully",
            });
          }
        } catch (error) {
          console.error("Failed to update monthly EMI:", error);
        }
      }

      queryClient.invalidateQueries({ queryKey: ["/api/vehicles"] });
      queryClient.invalidateQueries({ queryKey: ["/api/emi"] });
      onOpenChange(false);
      form.reset();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update vehicle",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: EditVehicleFormData) => {
    updateVehicleMutation.mutate(data);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Edit Vehicle</DialogTitle>
        </DialogHeader>
        
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <Label htmlFor="licensePlate">License Plate</Label>
            <Input
              id="licensePlate"
              {...form.register("licensePlate")}
              placeholder="Enter license plate"
            />
            {form.formState.errors.licensePlate && (
              <p className="text-sm text-red-500 mt-1">
                {form.formState.errors.licensePlate.message}
              </p>
            )}
          </div>

          <div>
            <Label htmlFor="model">Vehicle Model</Label>
            <Input
              id="model"
              {...form.register("model")}
              placeholder="Enter vehicle model"
            />
            {form.formState.errors.model && (
              <p className="text-sm text-red-500 mt-1">
                {form.formState.errors.model.message}
              </p>
            )}
          </div>

          <div>
            <Label htmlFor="status">Status</Label>
            <Select 
              value={form.watch("status")} 
              onValueChange={(value) => form.setValue("status", value as "available" | "in_transit" | "maintenance")}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="available">Available</SelectItem>
                <SelectItem value="in_transit">In Transit</SelectItem>
                <SelectItem value="maintenance">Maintenance</SelectItem>
              </SelectContent>
            </Select>
            {form.formState.errors.status && (
              <p className="text-sm text-red-500 mt-1">
                {form.formState.errors.status.message}
              </p>
            )}
          </div>

          <div>
            <Label htmlFor="monthlyEmi">Monthly EMI (₹)</Label>
            <Input
              id="monthlyEmi"
              {...form.register("monthlyEmi")}
              placeholder="Enter monthly EMI (optional)"
              type="number"
            />
          </div>

          <div className="flex justify-end space-x-2 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={updateVehicleMutation.isPending}
            >
              {updateVehicleMutation.isPending ? "Updating..." : "Update Vehicle"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}