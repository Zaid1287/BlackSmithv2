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
  destination: z.string().min(1, "Destination is required"),
  pouch: z.string().min(1, "Pouch amount is required"),
  security: z.string().default("0"),
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
      const response = await apiRequest("POST", "/api/journeys", {
        vehicleId: parseInt(data.vehicleId),
        licensePlate: data.licensePlate,
        destination: data.destination,
        pouch: data.pouch,
        security: data.security,
      });
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Journey Started",
        description: "Your journey has been started successfully!",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/journeys"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/stats"] });
      onOpenChange(false);
      form.reset();
    },
    onError: (error: any) => {
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

  const takePhoto = async () => {
    try {
      // Check if camera is available
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        toast({
          title: "Camera not available",
          description: "Camera access is not supported on this device",
          variant: "destructive"
        });
        return;
      }

      // Request camera permission
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: 'environment' } // Use back camera on mobile
      });

      // Create video element to capture photo
      const video = document.createElement('video');
      video.srcObject = stream;
      video.play();

      // Wait for video to load
      video.onloadedmetadata = () => {
        // Create canvas to capture frame
        const canvas = document.createElement('canvas');
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(video, 0, 0);
        
        // Convert to base64
        const photoDataUrl = canvas.toDataURL('image/jpeg', 0.8);
        
        // Add photo to list
        setPhotos(prev => [...prev, photoDataUrl]);
        
        // Stop camera stream
        stream.getTracks().forEach(track => track.stop());
        
        toast({
          title: "Photo captured",
          description: "Photo added successfully"
        });
      };
    } catch (error) {
      console.error('Camera error:', error);
      toast({
        title: "Camera access denied",
        description: "Please enable camera permissions to take photos",
        variant: "destructive"
      });
    }
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
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Start Journey</DialogTitle>
        </DialogHeader>

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
                <Button type="button" variant="ghost" size="sm" className="text-blue-600 hover:text-blue-800" onClick={takePhoto}>
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
      </DialogContent>
    </Dialog>
  );
}
