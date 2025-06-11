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

const editUserSchema = z.object({
  username: z.string().min(3, "Username must be at least 3 characters"),
  name: z.string().min(2, "Name must be at least 2 characters"),
  role: z.enum(["admin", "driver"]),
  salary: z.string().optional(),
  password: z.string().optional(),
});

type EditUserFormData = z.infer<typeof editUserSchema>;

interface EditUserModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user: any;
}

export default function EditUserModal({ open, onOpenChange, user }: EditUserModalProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const form = useForm<EditUserFormData>({
    resolver: zodResolver(editUserSchema),
    defaultValues: {
      username: "",
      name: "",
      role: "driver",
      salary: "",
      password: "",
    },
  });

  // Update form values when user prop changes
  useEffect(() => {
    if (user) {
      form.reset({
        username: user.username || "",
        name: user.name || "",
        role: user.role || "driver",
        salary: user.salary || "",
        password: "",
      });
    }
  }, [user, form]);

  const updateUserMutation = useMutation({
    mutationFn: async (data: EditUserFormData) => {
      const updateData: any = {
        username: data.username,
        name: data.name,
        role: data.role,
      };

      // Only include password if it's provided
      if (data.password && data.password.trim() !== "") {
        updateData.password = data.password;
      }

      const response = await fetch(`/api/users/${user.id}`, {
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
        throw new Error(errorData.message || "Failed to update user");
      }

      return response.json();
    },
    onSuccess: async (_, variables) => {
      toast({
        title: "Success",
        description: "User updated successfully",
      });

      // Update salary if provided
      if (variables.salary && variables.salary.trim() !== "") {
        try {
          const salaryResponse = await fetch(`/api/users/${user.id}/salary`, {
            method: "PUT",
            headers: {
              "Content-Type": "application/json",
              ...getAuthHeaders(),
            },
            credentials: "include",
            body: JSON.stringify({ salary: variables.salary }),
          });

          if (salaryResponse.ok) {
            toast({
              title: "Success",
              description: "User salary updated successfully",
            });
          }
        } catch (error) {
          console.error("Failed to update salary:", error);
        }
      }

      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      queryClient.invalidateQueries({ queryKey: ["/api/salaries"] });
      onOpenChange(false);
      form.reset();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update user",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: EditUserFormData) => {
    updateUserMutation.mutate(data);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Edit User</DialogTitle>
        </DialogHeader>
        
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <Label htmlFor="username">Username</Label>
            <Input
              id="username"
              {...form.register("username")}
              placeholder="Enter username"
            />
            {form.formState.errors.username && (
              <p className="text-sm text-red-500 mt-1">
                {form.formState.errors.username.message}
              </p>
            )}
          </div>

          <div>
            <Label htmlFor="name">Full Name</Label>
            <Input
              id="name"
              {...form.register("name")}
              placeholder="Enter full name"
            />
            {form.formState.errors.name && (
              <p className="text-sm text-red-500 mt-1">
                {form.formState.errors.name.message}
              </p>
            )}
          </div>

          <div>
            <Label htmlFor="role">Role</Label>
            <Select 
              value={form.watch("role")} 
              onValueChange={(value) => form.setValue("role", value as "admin" | "driver")}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select role" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="admin">Admin</SelectItem>
                <SelectItem value="driver">Driver</SelectItem>
              </SelectContent>
            </Select>
            {form.formState.errors.role && (
              <p className="text-sm text-red-500 mt-1">
                {form.formState.errors.role.message}
              </p>
            )}
          </div>

          <div>
            <Label htmlFor="salary">Monthly Salary (₹)</Label>
            <Input
              id="salary"
              {...form.register("salary")}
              placeholder="Enter monthly salary (optional)"
              type="number"
            />
          </div>

          <div>
            <Label htmlFor="password">New Password (leave empty to keep current)</Label>
            <Input
              id="password"
              {...form.register("password")}
              placeholder="Enter new password (optional)"
              type="password"
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
              disabled={updateUserMutation.isPending}
            >
              {updateUserMutation.isPending ? "Updating..." : "Update User"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}