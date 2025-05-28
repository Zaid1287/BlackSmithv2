// Offline storage utilities using IndexedDB for mobile driver app
export interface OfflineJourney {
  id: string;
  driverId: number;
  vehicleId: number;
  startLocation: any;
  destination: string;
  status: 'pending' | 'active' | 'completed';
  startTime: string;
  endTime?: string;
  distance?: number;
  expenses: OfflineExpense[];
  locationUpdates: LocationUpdate[];
  createdAt: string;
  synced: boolean;
}

export interface OfflineExpense {
  id: string;
  journeyId: string;
  type: string;
  amount: number;
  description: string;
  timestamp: string;
  synced: boolean;
}

export interface LocationUpdate {
  latitude: number;
  longitude: number;
  speed: number;
  timestamp: string;
  synced: boolean;
}

export interface OfflineAction {
  id: string;
  type: 'journey' | 'expense' | 'location';
  action: 'create' | 'update' | 'complete';
  data: any;
  timestamp: string;
  synced: boolean;
}

class OfflineStorageManager {
  private dbName = 'BlacksmithTradersOffline';
  private version = 1;
  private db: IDBDatabase | null = null;

  async init(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.version);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        this.db = request.result;
        resolve();
      };

      request.onupgradeneeded = () => {
        const db = request.result;

        // Journeys store
        if (!db.objectStoreNames.contains('journeys')) {
          const journeyStore = db.createObjectStore('journeys', { keyPath: 'id' });
          journeyStore.createIndex('driverId', 'driverId', { unique: false });
          journeyStore.createIndex('synced', 'synced', { unique: false });
        }

        // Expenses store
        if (!db.objectStoreNames.contains('expenses')) {
          const expenseStore = db.createObjectStore('expenses', { keyPath: 'id' });
          expenseStore.createIndex('journeyId', 'journeyId', { unique: false });
          expenseStore.createIndex('synced', 'synced', { unique: false });
        }

        // Location updates store
        if (!db.objectStoreNames.contains('locationUpdates')) {
          const locationStore = db.createObjectStore('locationUpdates', { keyPath: 'id', autoIncrement: true });
          locationStore.createIndex('timestamp', 'timestamp', { unique: false });
          locationStore.createIndex('synced', 'synced', { unique: false });
        }

        // Offline actions queue
        if (!db.objectStoreNames.contains('offlineActions')) {
          const actionStore = db.createObjectStore('offlineActions', { keyPath: 'id' });
          actionStore.createIndex('timestamp', 'timestamp', { unique: false });
          actionStore.createIndex('synced', 'synced', { unique: false });
        }
      };
    });
  }

  async saveJourney(journey: OfflineJourney): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');
    
    const transaction = this.db.transaction(['journeys'], 'readwrite');
    const store = transaction.objectStore('journeys');
    await store.put(journey);
  }

  async getJourneys(driverId: number): Promise<OfflineJourney[]> {
    if (!this.db) throw new Error('Database not initialized');
    
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['journeys'], 'readonly');
      const store = transaction.objectStore('journeys');
      const index = store.index('driverId');
      const request = index.getAll(driverId);

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async saveExpense(expense: OfflineExpense): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');
    
    const transaction = this.db.transaction(['expenses'], 'readwrite');
    const store = transaction.objectStore('expenses');
    await store.put(expense);
  }

  async getExpensesByJourney(journeyId: string): Promise<OfflineExpense[]> {
    if (!this.db) throw new Error('Database not initialized');
    
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['expenses'], 'readonly');
      const store = transaction.objectStore('expenses');
      const index = store.index('journeyId');
      const request = index.getAll(journeyId);

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async saveLocationUpdate(update: LocationUpdate & { journeyId: string }): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');
    
    const transaction = this.db.transaction(['locationUpdates'], 'readwrite');
    const store = transaction.objectStore('locationUpdates');
    await store.put(update);
  }

  async addOfflineAction(action: OfflineAction): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');
    
    const transaction = this.db.transaction(['offlineActions'], 'readwrite');
    const store = transaction.objectStore('offlineActions');
    await store.put(action);
  }

  async getUnsyncedActions(): Promise<OfflineAction[]> {
    if (!this.db) throw new Error('Database not initialized');
    
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['offlineActions'], 'readonly');
      const store = transaction.objectStore('offlineActions');
      const index = store.index('synced');
      const request = index.getAll(false);

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async markActionSynced(actionId: string): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');
    
    const transaction = this.db.transaction(['offlineActions'], 'readwrite');
    const store = transaction.objectStore('offlineActions');
    const action = await store.get(actionId);
    
    if (action) {
      action.synced = true;
      await store.put(action);
    }
  }

  async clearSyncedData(): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');
    
    const transaction = this.db.transaction(['offlineActions', 'locationUpdates'], 'readwrite');
    
    // Clear synced actions
    const actionStore = transaction.objectStore('offlineActions');
    const actionIndex = actionStore.index('synced');
    const actionRequest = actionIndex.openCursor(true);
    
    actionRequest.onsuccess = (event) => {
      const cursor = (event.target as IDBRequest).result;
      if (cursor) {
        cursor.delete();
        cursor.continue();
      }
    };

    // Clear old location updates (keep last 24 hours)
    const locationStore = transaction.objectStore('locationUpdates');
    const cutoffTime = Date.now() - (24 * 60 * 60 * 1000);
    const locationIndex = locationStore.index('timestamp');
    const locationRequest = locationIndex.openCursor(IDBKeyRange.upperBound(cutoffTime));
    
    locationRequest.onsuccess = (event) => {
      const cursor = (event.target as IDBRequest).result;
      if (cursor) {
        cursor.delete();
        cursor.continue();
      }
    };
  }
}

export const offlineStorage = new OfflineStorageManager();

// Geolocation utilities for mobile tracking
export class LocationTracker {
  private watchId: number | null = null;
  private isTracking = false;

  async requestPermission(): Promise<boolean> {
    if (!navigator.geolocation) {
      throw new Error('Geolocation is not supported by this browser');
    }

    try {
      const permission = await navigator.permissions.query({ name: 'geolocation' });
      return permission.state === 'granted';
    } catch (error) {
      // Fallback for browsers that don't support permissions API
      return new Promise((resolve) => {
        navigator.geolocation.getCurrentPosition(
          () => resolve(true),
          () => resolve(false),
          { timeout: 5000 }
        );
      });
    }
  }

  startTracking(journeyId: string, callback: (location: LocationUpdate) => void): void {
    if (!navigator.geolocation || this.isTracking) return;

    this.isTracking = true;
    this.watchId = navigator.geolocation.watchPosition(
      (position) => {
        const location: LocationUpdate = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          speed: position.coords.speed || 0,
          timestamp: new Date().toISOString(),
          synced: false
        };

        callback(location);
        
        // Save to offline storage
        offlineStorage.saveLocationUpdate({ ...location, journeyId });
      },
      (error) => {
        console.error('Geolocation error:', error);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 30000
      }
    );
  }

  stopTracking(): void {
    if (this.watchId !== null) {
      navigator.geolocation.clearWatch(this.watchId);
      this.watchId = null;
      this.isTracking = false;
    }
  }

  async getCurrentLocation(): Promise<LocationUpdate> {
    return new Promise((resolve, reject) => {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          resolve({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            speed: position.coords.speed || 0,
            timestamp: new Date().toISOString(),
            synced: false
          });
        },
        reject,
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 30000
        }
      );
    });
  }
}

export const locationTracker = new LocationTracker();

// Network status detection
export class NetworkManager {
  private isOnline = navigator.onLine;
  private listeners: ((online: boolean) => void)[] = [];

  constructor() {
    window.addEventListener('online', () => {
      this.isOnline = true;
      this.notifyListeners();
      this.syncWhenOnline();
    });

    window.addEventListener('offline', () => {
      this.isOnline = false;
      this.notifyListeners();
    });
  }

  getStatus(): boolean {
    return this.isOnline;
  }

  onStatusChange(callback: (online: boolean) => void): void {
    this.listeners.push(callback);
  }

  private notifyListeners(): void {
    this.listeners.forEach(callback => callback(this.isOnline));
  }

  private async syncWhenOnline(): Promise<void> {
    if (!this.isOnline) return;

    try {
      console.log('Network restored, syncing offline data...');
      
      const unsyncedActions = await offlineStorage.getUnsyncedActions();
      
      for (const action of unsyncedActions) {
        try {
          // Attempt to sync each action
          await this.syncAction(action);
          await offlineStorage.markActionSynced(action.id);
        } catch (error) {
          console.error('Failed to sync action:', action.id, error);
        }
      }

      // Clean up old synced data
      await offlineStorage.clearSyncedData();
      
      console.log('Offline data sync completed');
    } catch (error) {
      console.error('Error during offline sync:', error);
    }
  }

  private async syncAction(action: OfflineAction): Promise<void> {
    // This would send the action to the server
    // Implementation depends on the specific action type
    console.log('Syncing action:', action);
  }
}

export const networkManager = new NetworkManager();