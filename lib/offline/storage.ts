// IndexedDB wrapper for offline storage
const DB_NAME = 'StudentPerformanceDB'
const DB_VERSION = 1
const STORES = {
  ASSESSMENT_RESULTS: 'assessmentResults',
  STUDENTS: 'students',
  CLASSES: 'classes',
  SUBJECTS: 'subjects',
}

class OfflineStorage {
  private db: IDBDatabase | null = null

  async init(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION)

      request.onerror = () => reject(request.error)
      request.onsuccess = () => {
        this.db = request.result
        resolve()
      }

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result

        // Create object stores if they don't exist
        if (!db.objectStoreNames.contains(STORES.ASSESSMENT_RESULTS)) {
          const store = db.createObjectStore(STORES.ASSESSMENT_RESULTS, { 
            keyPath: 'id', 
            autoIncrement: true 
          })
          store.createIndex('synced', 'synced', { unique: false })
          store.createIndex('timestamp', 'timestamp', { unique: false })
        }

        if (!db.objectStoreNames.contains(STORES.STUDENTS)) {
          db.createObjectStore(STORES.STUDENTS, { keyPath: 'id' })
        }

        if (!db.objectStoreNames.contains(STORES.CLASSES)) {
          db.createObjectStore(STORES.CLASSES, { keyPath: 'id' })
        }

        if (!db.objectStoreNames.contains(STORES.SUBJECTS)) {
          db.createObjectStore(STORES.SUBJECTS, { keyPath: 'id' })
        }
      }
    })
  }

  async saveAssessmentResult(data: any): Promise<number> {
    if (!this.db) await this.init()

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORES.ASSESSMENT_RESULTS], 'readwrite')
      const store = transaction.objectStore(STORES.ASSESSMENT_RESULTS)
      
      const result = {
        ...data,
        synced: false,
        timestamp: Date.now()
      }

      const request = store.add(result)
      request.onsuccess = () => resolve(request.result as number)
      request.onerror = () => reject(request.error)
    })
  }

  async getUnsyncedResults(): Promise<any[]> {
    if (!this.db) await this.init()

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORES.ASSESSMENT_RESULTS], 'readonly')
      const store = transaction.objectStore(STORES.ASSESSMENT_RESULTS)
      const index = store.index('synced')
      const request = index.getAll(false as any)

      request.onsuccess = () => resolve(request.result)
      request.onerror = () => reject(request.error)
    })
  }

  async markAsSynced(id: number): Promise<void> {
    if (!this.db) await this.init()

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORES.ASSESSMENT_RESULTS], 'readwrite')
      const store = transaction.objectStore(STORES.ASSESSMENT_RESULTS)
      const request = store.get(id)

      request.onsuccess = () => {
        const data = request.result
        if (data) {
          data.synced = true
          const updateRequest = store.put(data)
          updateRequest.onsuccess = () => resolve()
          updateRequest.onerror = () => reject(updateRequest.error)
        } else {
          resolve()
        }
      }
      request.onerror = () => reject(request.error)
    })
  }

  async deleteResult(id: number): Promise<void> {
    if (!this.db) await this.init()

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORES.ASSESSMENT_RESULTS], 'readwrite')
      const store = transaction.objectStore(STORES.ASSESSMENT_RESULTS)
      const request = store.delete(id)

      request.onsuccess = () => resolve()
      request.onerror = () => reject(request.error)
    })
  }

  async cacheStudents(students: any[]): Promise<void> {
    if (!this.db) await this.init()

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORES.STUDENTS], 'readwrite')
      const store = transaction.objectStore(STORES.STUDENTS)

      students.forEach(student => {
        store.put(student)
      })

      transaction.oncomplete = () => resolve()
      transaction.onerror = () => reject(transaction.error)
    })
  }

  async getStudents(): Promise<any[]> {
    if (!this.db) await this.init()

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORES.STUDENTS], 'readonly')
      const store = transaction.objectStore(STORES.STUDENTS)
      const request = store.getAll()

      request.onsuccess = () => resolve(request.result)
      request.onerror = () => reject(request.error)
    })
  }

  async getUnsyncedCount(): Promise<number> {
    const unsynced = await this.getUnsyncedResults()
    return unsynced.length
  }
}

export const offlineStorage = new OfflineStorage()
