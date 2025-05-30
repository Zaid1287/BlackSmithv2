import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

interface StatusBadgeProps {
  status: string;
  className?: string;
}

export default function StatusBadge({ status, className }: StatusBadgeProps) {
  const getStatusConfig = (status: string) => {
    switch (status.toLowerCase()) {
      case 'active':
        return { 
          color: 'bg-green-100 text-green-800 border-green-200',
          label: 'Active'
        };
      case 'completed':
        return { 
          color: 'bg-blue-100 text-blue-800 border-blue-200',
          label: 'Completed'
        };
      case 'pending':
        return { 
          color: 'bg-yellow-100 text-yellow-800 border-yellow-200',
          label: 'Pending'
        };
      case 'available':
        return { 
          color: 'bg-green-100 text-green-800 border-green-200',
          label: 'Available'
        };
      case 'in_use':
        return { 
          color: 'bg-orange-100 text-orange-800 border-orange-200',
          label: 'In Use'
        };
      case 'maintenance':
        return { 
          color: 'bg-red-100 text-red-800 border-red-200',
          label: 'Maintenance'
        };
      default:
        return { 
          color: 'bg-gray-100 text-gray-800 border-gray-200',
          label: status
        };
    }
  };

  const config = getStatusConfig(status);

  return (
    <Badge 
      variant="outline" 
      className={cn(
        "px-2 py-1 text-xs font-medium rounded-full border",
        config.color,
        className
      )}
    >
      {config.label}
    </Badge>
  );
}