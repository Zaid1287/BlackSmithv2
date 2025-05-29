// PWA Service Worker Registration and Management
export class PWAManager {
  private registration: ServiceWorkerRegistration | null = null;

  async init() {
    if ('serviceWorker' in navigator) {
      try {
        this.registration = await navigator.serviceWorker.register('/sw.js');
        console.log('Service Worker registered successfully');
        
        // Handle updates
        this.registration.addEventListener('updatefound', () => {
          const newWorker = this.registration?.installing;
          if (newWorker) {
            newWorker.addEventListener('statechange', () => {
              if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                // New content is available
                this.showUpdateNotification();
              }
            });
          }
        });
      } catch (error) {
        console.error('Service Worker registration failed:', error);
      }
    }
  }

  private showUpdateNotification() {
    if (window.confirm('New version available! Reload to update?')) {
      window.location.reload();
    }
  }

  // Install app prompt
  async showInstallPrompt() {
    const deferredPrompt = (window as any).deferredPrompt;
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      console.log(`User response to install prompt: ${outcome}`);
      (window as any).deferredPrompt = null;
    }
  }

  // Check if app is installed
  isInstalled(): boolean {
    return window.matchMedia('(display-mode: standalone)').matches ||
           (window.navigator as any).standalone === true;
  }

  // Request notification permission
  async requestNotificationPermission(): Promise<boolean> {
    if ('Notification' in window) {
      const permission = await Notification.requestPermission();
      return permission === 'granted';
    }
    return false;
  }

  // Send notification
  async sendNotification(title: string, options?: NotificationOptions) {
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification(title, {
        icon: '/icon-192.png',
        badge: '/icon-192.png',
        ...options
      });
    }
  }

  // Background sync for offline data
  async syncOfflineData(data: any) {
    if ('serviceWorker' in navigator && this.registration?.sync) {
      try {
        // Store data in IndexedDB
        await this.storeOfflineData(data);
        // Register background sync
        await this.registration.sync.register('background-sync');
      } catch (error) {
        console.error('Background sync registration failed:', error);
      }
    }
  }

  private async storeOfflineData(data: any) {
    return new Promise<void>((resolve, reject) => {
      const request = indexedDB.open('BlackSmithOfflineDB', 1);
      
      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains('offlineActions')) {
          const store = db.createObjectStore('offlineActions', { keyPath: 'id', autoIncrement: true });
          store.createIndex('timestamp', 'timestamp', { unique: false });
        }
      };
      
      request.onsuccess = () => {
        const db = request.result;
        const transaction = db.transaction(['offlineActions'], 'readwrite');
        const store = transaction.objectStore('offlineActions');
        
        const dataWithTimestamp = {
          ...data,
          timestamp: Date.now()
        };
        
        store.add(dataWithTimestamp);
        
        transaction.oncomplete = () => resolve();
        transaction.onerror = () => reject(transaction.error);
      };
      
      request.onerror = () => reject(request.error);
    });
  }

  // Check network status
  isOnline(): boolean {
    return navigator.onLine;
  }

  // Listen for online/offline events
  onNetworkChange(callback: (online: boolean) => void) {
    const handleOnline = () => callback(true);
    const handleOffline = () => callback(false);
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    // Return cleanup function
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }
}

export const pwaManager = new PWAManager();

// Install prompt handling
window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  (window as any).deferredPrompt = e;
});

// App installed event
window.addEventListener('appinstalled', () => {
  console.log('PWA was installed');
  (window as any).deferredPrompt = null;
});