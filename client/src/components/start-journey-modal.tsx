import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { MapPin, Camera } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { getAuthHeaders } from "@/lib/auth";
import { useToast } from "@/hooks/use-toast";

const journeySchema = z.object({
  vehicleId: z.string().min(1, "Please select a vehicle"),
  licensePlate: z.string().min(1, "License plate is required"),
  destination: z.string()
    .min(3, "Destination must be at least 3 characters")
    .max(100, "Destination cannot exceed 100 characters")
    .regex(/^[a-zA-Z0-9\s,.-]+$/, "Destination contains invalid characters"),
  pouch: z.string()
    .min(1, "Pouch amount is required")
    .regex(/^\d+(\.\d{1,2})?$/, "Please enter a valid pouch amount")
    .refine((val) => parseFloat(val) > 0, "Pouch amount must be greater than 0")
    .refine((val) => parseFloat(val) <= 500000, "Pouch amount cannot exceed ₹5,00,000"),
  security: z.string()
    .default("0")
    .refine((val: string) => /^\d+(\.\d{1,2})?$/.test(val), "Please enter a valid security amount")
    .refine((val: string) => parseFloat(val) >= 0, "Security amount cannot be negative")
    .refine((val: string) => parseFloat(val) <= 100000, "Security amount cannot exceed ₹1,00,000"),
});

type JourneyFormData = z.infer<typeof journeySchema>;

interface StartJourneyModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function StartJourneyModal({ open, onOpenChange }: StartJourneyModalProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [photos, setPhotos] = useState<string[]>([]);

  const form = useForm<JourneyFormData>({
    resolver: zodResolver(journeySchema),
    defaultValues: {
      vehicleId: "",
      licensePlate: "",
      destination: "",
      pouch: "",
      security: "0",
    },
  });

  const { data: vehicles } = useQuery({
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

  const createJourneyMutation = useMutation({
    mutationFn: async (data: JourneyFormData) => {
      console.log("Creating journey with data:", data);
      const requestBody = {
        vehicleId: parseInt(data.vehicleId),
        licensePlate: data.licensePlate,
        destination: data.destination,
        pouch: data.pouch,
        security: data.security || "0",
        photos: photos,
      };
      console.log("Request body:", requestBody);
      
      const response = await fetch("/api/journeys", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...getAuthHeaders(),
        },
        credentials: "include",
        body: JSON.stringify(requestBody),
      });
      
      console.log("Response status:", response.status);
      
      if (!response.ok) {
        const error = await response.json();
        console.error("Response error:", error);
        throw new Error(error.message || "Failed to create journey");
      }
      
      const result = await response.json();
      console.log("Journey created successfully:", result);
      return result;
    },
    onSuccess: () => {
      toast({
        title: "Journey Started",
        description: "Your journey has been started successfully!",
      });
      // Immediately refresh all journey-related data for smoother experience
      queryClient.invalidateQueries({ queryKey: ["/api/journeys"] });
      queryClient.invalidateQueries({ queryKey: ["/api/journeys/active"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/stats"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/financial"] });
      onOpenChange(false);
      form.reset();
    },
    onError: (error: any) => {
      console.error("Journey creation error:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to start journey",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: JourneyFormData) => {
    createJourneyMutation.mutate(data);
  };

  const compressImage = (file: File, maxWidth: number = 800, quality: number = 0.7): Promise<string> => {
    return new Promise((resolve) => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d')!;
      const img = new Image();
      
      img.onload = () => {
        // Calculate new dimensions
        const ratio = Math.min(maxWidth / img.width, maxWidth / img.height);
        canvas.width = img.width * ratio;
        canvas.height = img.height * ratio;
        
        // Draw and compress
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        const compressedDataUrl = canvas.toBlob((blob) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result as string);
          reader.readAsDataURL(blob!);
        }, 'image/jpeg', quality);
      };
      
      img.src = URL.createObjectURL(file);
    });
  };

  const handlePhotoCapture = () => {
    if (photos.length >= 3) {
      toast({
        title: "Photo limit reached",
        description: "Maximum 3 photos allowed per journey",
        variant: "destructive"
      });
      return;
    }

    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.capture = 'environment';
    
    input.onchange = async (event) => {
      const file = (event.target as HTMLInputElement).files?.[0];
      if (file) {
        try {
          const compressedImage = await compressImage(file, 800, 0.6);
          setPhotos(prev => [...prev, compressedImage]);
          toast({
            title: "Photo added",
            description: "Photo compressed and uploaded successfully"
          });
        } catch (error) {
          toast({
            title: "Error",
            description: "Failed to process photo",
            variant: "destructive"
          });
        }
      }
    };
    
    input.click();
  };

  const handleVehicleSelect = (vehicleId: string) => {
    const vehicle = vehicles?.find((v: any) => v.id.toString() === vehicleId);
    if (vehicle) {
      form.setValue("licensePlate", vehicle.licensePlate);
    }
  };

  const availableVehicles = vehicles?.filter((v: any) => v.status === "available") || [];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[90vh] flex flex-col">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle>Start Journey</DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto pr-2">
          <p className="text-gray-500 mb-6">Please enter the details to start your journey</p>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
              control={form.control}
              name="vehicleId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>License Plate</FormLabel>
                  <Select 
                    onValueChange={(value) => {
                      field.onChange(value);
                      handleVehicleSelect(value);
                    }}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a vehicle license plate" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {availableVehicles.map((vehicle: any) => (
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

            {/* Hidden field for license plate */}
            <FormField
              control={form.control}
              name="licensePlate"
              render={({ field }) => (
                <input type="hidden" {...field} />
              )}
            />

            <FormField
              control={form.control}
              name="destination"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Destination</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                      <Input 
                        {...field} 
                        placeholder="Enter destination city" 
                        className="pl-10"
                      />
                    </div>
                  </FormControl>
                  <p className="text-xs text-gray-500">Enter the destination city name</p>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="pouch"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Pouch (Money Given)</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">₹</span>
                      <Input 
                        {...field} 
                        type="number" 
                        inputMode="numeric"
                        placeholder="0" 
                        className="pl-8"
                      />
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="security"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Security</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">₹</span>
                      <Input 
                        {...field} 
                        type="number" 
                        inputMode="numeric"
                        placeholder="0" 
                        className="pl-8"
                      />
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-sm font-medium text-gray-700">Document Photos</label>
                <Button type="button" variant="ghost" size="sm" className="text-blue-600 hover:text-blue-800" onClick={handlePhotoCapture}>
                  <Camera className="w-4 h-4 mr-1" />
                  Take Photo
                </Button>
              </div>
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-4">
                {photos.length > 0 ? (
                  <div className="grid grid-cols-2 gap-2">
                    {photos.map((photo, index) => (
                      <div key={index} className="relative">
                        <img 
                          src={photo} 
                          alt={`Document ${index + 1}`}
                          className="w-full h-24 object-cover rounded"
                        />
                        <button
                          type="button"
                          onClick={() => setPhotos(prev => prev.filter((_, i) => i !== index))}
                          className="absolute top-1 right-1 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs"
                        >
                          ×
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-4">
                    <Camera className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                    <p className="text-sm text-gray-500">Upload or take photos of required documents</p>
                  </div>
                )}
              </div>
            </div>

            <div className="flex space-x-3 pt-4">
              <Button 
                type="button" 
                variant="outline" 
                className="flex-1"
                onClick={() => onOpenChange(false)}
              >
                Cancel
              </Button>
              <Button 
                type="submit" 
                className="flex-1 bg-gray-900 hover:bg-gray-800"
                disabled={createJourneyMutation.isPending}
              >
                {createJourneyMutation.isPending ? "Starting..." : "Start Journey"}
              </Button>
            </div>
            </form>
          </Form>
        </div>
      </DialogContent>
    </Dialog>
  );
}
