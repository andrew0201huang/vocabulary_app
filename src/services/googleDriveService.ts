import { StorageData } from '../types/vocabulary';

const FILENAME = 'vocabulary_data.json';

export class GoogleDriveService {
  /**
   * Search for existing vocabulary_data.json file in appDataFolder
   */
  public async findAppDataFile(accessToken: string): Promise<{ id: string; modifiedTime: string } | null> {
    try {
      const q = encodeURIComponent(`name = '${FILENAME}' and trashed = false`);
      const url = `https://www.googleapis.com/drive/v3/files?spaces=appDataFolder&q=${q}&fields=files(id,name,modifiedTime)&pageSize=1`;

      const res = await fetch(url, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => null);
        const detail = errJson?.error?.message || res.statusText;
        if (res.status === 403) {
          throw new Error(`Google Drive API 尚未在 Google Cloud Console 中啟用。詳細訊息：${detail}`);
        }
        throw new Error(`Drive 搜尋失敗 (${res.status}): ${detail}`);
      }

      const data = await res.json();
      if (data.files && data.files.length > 0) {
        return {
          id: data.files[0].id,
          modifiedTime: data.files[0].modifiedTime,
        };
      }
      return null;
    } catch (err) {
      console.error('findAppDataFile error:', err);
      throw err;
    }
  }

  /**
   * Download vocabulary_data.json from appDataFolder
   */
  public async downloadAppDataFile(accessToken: string, fileId: string): Promise<StorageData | null> {
    try {
      const url = `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`;
      const res = await fetch(url, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => null);
        const detail = errJson?.error?.message || res.statusText;
        throw new Error(`Drive 下載失敗 (${res.status}): ${detail}`);
      }

      const json = await res.json();
      return json as StorageData;
    } catch (err) {
      console.error('downloadAppDataFile error:', err);
      throw err;
    }
  }

  /**
   * Upload new vocabulary_data.json to appDataFolder using multipart upload
   */
  public async uploadAppDataFile(accessToken: string, data: StorageData): Promise<string> {
    try {
      const metadata = {
        name: FILENAME,
        mimeType: 'application/json',
        parents: ['appDataFolder'],
      };

      const boundary = '-------314159265358979323846';
      const delimiter = `\r\n--${boundary}\r\n`;
      const closeDelim = `\r\n--${boundary}--`;

      const multipartRequestBody =
        delimiter +
        'Content-Type: application/json; charset=UTF-8\r\n\r\n' +
        JSON.stringify(metadata) +
        delimiter +
        'Content-Type: application/json; charset=UTF-8\r\n\r\n' +
        JSON.stringify(data, null, 2) +
        closeDelim;

      const url = 'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart';
      const res = await fetch(url, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': `multipart/related; boundary=${boundary}`,
        },
        body: multipartRequestBody,
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => null);
        const detail = errJson?.error?.message || res.statusText;
        if (res.status === 403) {
          throw new Error(`Google Drive API 尚未啟用或權限受限。詳細訊息：${detail}`);
        }
        throw new Error(`Drive 上傳失敗 (${res.status}): ${detail}`);
      }

      const result = await res.json();
      return result.id;
    } catch (err) {
      console.error('uploadAppDataFile error:', err);
      throw err;
    }
  }

  /**
   * Update existing vocabulary_data.json in appDataFolder
   */
  public async updateAppDataFile(accessToken: string, fileId: string, data: StorageData): Promise<void> {
    try {
      const url = `https://www.googleapis.com/upload/drive/v3/files/${fileId}?uploadType=media`;
      const res = await fetch(url, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json; charset=UTF-8',
        },
        body: JSON.stringify(data, null, 2),
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => null);
        const detail = errJson?.error?.message || res.statusText;
        throw new Error(`Drive 更新覆蓋失敗 (${res.status}): ${detail}`);
      }
    } catch (err) {
      console.error('updateAppDataFile error:', err);
      throw err;
    }
  }
}

export const googleDriveService = new GoogleDriveService();
