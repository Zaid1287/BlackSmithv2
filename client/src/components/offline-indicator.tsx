import { useState, useEffect } from "react";
import { WifiOff, Wifi, CloudOff } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { pwaManager } from "@/lib/pwa";

export default function OfflineIndicator() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [showIndicator, setShowIndicator] = useState(false);

  useEffect(() => {
    const cleanup = pwaManager.onNetworkChange((online) => {
      setIsOnline(online);
      setShowIndicator(true);
      
      // Hide indicator after 3 seconds when back online
      if (online) {
        setTimeout(() => setShowIndicator(false), 3000);
      }
    });

    return cleanup;
  }, []);

  if (!showIndicator && isOnline) return null;

  return (
    <div className="fixed top-4 right-4 z-50">
      <Badge 
        variant={isOnline ? "default" : "destructive"}
        className="flex items-center gap-2 px-3 py-2"
      >
        {isOnline ? (
          <>
            <Wifi className="w-4 h-4" />
            Back Online
          </>
        ) : (
          <>
            <WifiOff className="w-4 h-4" />
            Offline Mode
          </>
        )}
      </Badge>
    </div>
  );
}