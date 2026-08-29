import { StorageData, WordItem, RoundSummary, AppSettings, SyncStatus } from '../types/vocabulary';
import { DEFAULT_SETTINGS } from '../data/defaultSettings';
import { getInitialStarterWords } from '../data/sampleData';
import { googleDriveService } from './googleDriveService';
import { googleAuthService } from './googleAuthService';

const STORAGE_KEY = 'speedvocab_data_v1';
const SETTINGS_KEY = 'speedvocab_settings';

export class StorageService {
  private data: StorageData = {
    version: 1,
    words: [],
    roundHistory: [],
    settings: DEFAULT_SETTINGS,
    lastSyncedAt: null,
  };

  private syncStatus: SyncStatus = 'local_only';
  private syncListeners: ((status: SyncStatus) => void)[] = [];
  private dataListeners: ((data: StorageData) => void)[] = [];

  constructor() {
    this.loadFromLocalStorage();
  }

  public getSyncStatus(): SyncStatus {
    return this.syncStatus;
  }

  public setSyncStatus(status: SyncStatus) {
    this.syncStatus = status;
    this.syncListeners.forEach(cb => cb(status));
  }

  public subscribeSyncStatus(cb: (status: SyncStatus) => void): () => void {
    this.syncListeners.push(cb);
    cb(this.syncStatus);
    return () => {
      this.syncListeners = this.syncListeners.filter(l => l !== cb);
    };
  }

  public subscribeData(cb: (data: StorageData) => void): () => void {
    this.dataListeners.push(cb);
    cb(this.getData());
    return () => {
      this.dataListeners = this.dataListeners.filter(l => l !== cb);
    };
  }

  private notifyDataChange() {
    const d = this.getData();
    this.dataListeners.forEach(cb => cb(d));
  }

  public getData(): StorageData {
    return {
      version: this.data.version,
      words: [...this.data.words],
      roundHistory: [...this.data.roundHistory],
      settings: { ...this.data.settings },
      lastSyncedAt: this.data.lastSyncedAt,
    };
  }

  public getWords(): WordItem[] {
    return [...this.data.words];
  }

  public getSettings(): AppSettings {
    return { ...DEFAULT_SETTINGS, ...this.data.settings };
  }

  public getRoundHistory(): RoundSummary[] {
    return [...this.data.roundHistory];
  }

  /**
   * Load data from browser LocalStorage
   */
  public loadFromLocalStorage(): StorageData {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      const storedSettings = localStorage.getItem(SETTINGS_KEY);

      let loadedSettings = DEFAULT_SETTINGS;
      if (storedSettings) {
        try {
          loadedSettings = { ...DEFAULT_SETTINGS, ...JSON.parse(storedSettings) };
        } catch {
          // ignore
        }
      }

      if (stored) {
        const parsed = JSON.parse(stored) as StorageData;
        this.data = {
          version: parsed.version || 1,
          words: parsed.words || [],
          roundHistory: parsed.roundHistory || [],
          settings: { ...loadedSettings, ...(parsed.settings || {}) },
          lastSyncedAt: parsed.lastSyncedAt || null,
        };
      } else {
        // First time initialization with standard starter words
        this.data = {
          version: 1,
          words: getInitialStarterWords(),
          roundHistory: [],
          settings: loadedSettings,
          lastSyncedAt: null,
        };
        this.saveToLocalStorage();
      }
    } catch (e) {
      console.error('Failed to load from localStorage:', e);
      this.data = {
        version: 1,
        words: getInitialStarterWords(),
        roundHistory: [],
        settings: DEFAULT_SETTINGS,
        lastSyncedAt: null,
      };
    }

    const auth = googleAuthService.getAuthState();
    this.syncStatus = auth.isAuthenticated ? 'synced' : 'local_only';
    this.notifyDataChange();
    return this.getData();
  }

  /**
   * Save current data to LocalStorage
   */
  public saveToLocalStorage() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.data));
      if (this.data.settings) {
        localStorage.setItem(SETTINGS_KEY, JSON.stringify(this.data.settings));
      }
    } catch (e) {
      console.error('Failed to save to localStorage:', e);
    }
    this.notifyDataChange();
  }

  /**
   * Update Settings
   */
  public updateSettings(settings: Partial<AppSettings>) {
    this.data.settings = { ...this.data.settings, ...settings };
    this.saveToLocalStorage();
  }

  /**
   * Update entire Word list
   */
  public saveWords(words: WordItem[], triggerCloudSync: boolean = true) {
    this.data.words = words;
    this.saveToLocalStorage();
    if (triggerCloudSync) {
      this.syncWithGoogleDrive();
    }
  }

  /**
   * Save round completion and record metrics
   */
  public recordRoundCompletion(summary: RoundSummary, updatedWords: WordItem[]) {
    // Merge updated words
    const wordMap = new Map<string, WordItem>();
    this.data.words.forEach(w => wordMap.set(w.id, w));
    updatedWords.forEach(w => wordMap.set(w.id, w));

    this.data.words = Array.from(wordMap.values());
    this.data.roundHistory = [summary, ...this.data.roundHistory.slice(0, 49)]; // keep latest 50 rounds
    this.saveToLocalStorage();

    // Auto-sync to Google Drive
    this.syncWithGoogleDrive();
  }

  /**
   * Full Sync with Google Drive (appDataFolder)
   */
  public async syncWithGoogleDrive(): Promise<boolean> {
    const auth = googleAuthService.getAuthState();
    if (!auth.isAuthenticated || !auth.accessToken) {
      this.setSyncStatus('local_only');
      return false;
    }

    if (!navigator.onLine) {
      this.setSyncStatus('offline');
      return false;
    }

    this.setSyncStatus('syncing');

    try {
      // 1. Search for existing file on Drive
      let fileId = auth.driveFileId;
      if (!fileId) {
        const found = await googleDriveService.findAppDataFile(auth.accessToken);
        if (found) {
          fileId = found.id;
          googleAuthService.setDriveFileId(fileId);
        }
      }

      if (fileId) {
        // 2. Download remote file and merge
        try {
          const remoteData = await googleDriveService.downloadAppDataFile(auth.accessToken, fileId);
          if (remoteData && remoteData.words) {
            this.mergeRemoteData(remoteData);
          }
        } catch (downloadErr) {
          console.warn('Could not download existing file, will overwrite with local data:', downloadErr);
        }

        // 3. Upload merged local data back to Drive
        this.data.lastSyncedAt = new Date().toISOString();
        await googleDriveService.updateAppDataFile(auth.accessToken, fileId, this.data);
      } else {
        // 4. Create new file on Drive
        this.data.lastSyncedAt = new Date().toISOString();
        const newId = await googleDriveService.uploadAppDataFile(auth.accessToken, this.data);
        googleAuthService.setDriveFileId(newId);
      }

      this.saveToLocalStorage();
      this.setSyncStatus('synced');
      return true;
    } catch (err) {
      console.error('Google Drive Sync error:', err);
      this.setSyncStatus('error');
      return false;
    }
  }

  /**
   * Merge remote cloud data with local data intelligently
   */
  private mergeRemoteData(remoteData: StorageData) {
    const localWordMap = new Map<string, WordItem>();
    this.data.words.forEach(w => localWordMap.set(w.word.toLowerCase(), w));

    // Merge remote words
    remoteData.words.forEach(remoteWord => {
      const key = remoteWord.word.toLowerCase();
      if (!localWordMap.has(key)) {
        localWordMap.set(key, remoteWord);
      } else {
        const localWord = localWordMap.get(key)!;
        const localUpdated = new Date(localWord.updatedAt || 0).getTime();
        const remoteUpdated = new Date(remoteWord.updatedAt || 0).getTime();

        if (remoteUpdated > localUpdated) {
          localWordMap.set(key, remoteWord);
        } else {
          // Merge best time
          const bestTime = Math.min(
            localWord.bestTimeMs || 999999,
            remoteWord.bestTimeMs || 999999
          );
          localWordMap.set(key, {
            ...localWord,
            bestTimeMs: bestTime === 999999 ? null : bestTime,
          });
        }
      }
    });

    this.data.words = Array.from(localWordMap.values());

    // Merge round history (deduplicate by id)
    const historyMap = new Map<string, RoundSummary>();
    [...this.data.roundHistory, ...(remoteData.roundHistory || [])].forEach(h => {
      if (h.id) historyMap.set(h.id, h);
    });
    this.data.roundHistory = Array.from(historyMap.values())
      .sort((a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime())
      .slice(0, 50);

    this.data.lastSyncedAt = new Date().toISOString();
    this.saveToLocalStorage();
  }

  /**
   * Reset all data (for testing or user request)
   */
  public resetAllData() {
    this.data = {
      version: 1,
      words: getInitialStarterWords(),
      roundHistory: [],
      settings: this.data.settings,
      lastSyncedAt: null,
    };
    this.saveToLocalStorage();
  }
}

export const storageService = new StorageService();
