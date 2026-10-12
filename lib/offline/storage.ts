// ---------------------------------------------------------------------------
// Typed interfaces for IndexedDB offline storage
// ---------------------------------------------------------------------------

/** A pending assessment score waiting to be synced to the server. */
export interface AssessmentResultRecord {
  /** Auto-incremented IndexedDB key (assigned on save). */
  id?: number
  /** The assessment the scores belong to. */
  assessmentId: string
  /** Array of { studentId, score } pairs. */
  results: Array<{ studentId: string; score: number }>
  /** Sync state managed by OfflineStorage — do not set manually. */
  syncState: "pending" | "synced"
  /** Unix timestamp (ms) when the record was saved offline. */
  timestamp: number
}

export interface CachedStudent {
  id: string
  name: string
  admissionNo: string
  classId: string
  schoolId: string
}

export interface CachedClass {
  id: string
  name: string
  grade: string
  schoolId: string
}

export interface CachedSubject {
  id: string
  name: string
  code: string
  schoolId: string
}

// ---------------------------------------------------------------------------
// IndexedDB wrapper for offline storage
// ---------------------------------------------------------------------------
const DB_NAME = "StudentPerformanceDB"
const DB_VERSION = 2
const STORES = {
  ASSESSMENT_RESULTS: "assessmentResults",
  STUDENTS: "students",
  CLASSES: "classes",
  SUBJECTS: "subjects",
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
            keyPath: "id",
            autoIncrement: true,
          })
          store.createIndex("syncState", "syncState", { unique: false })
          store.createIndex("timestamp", "timestamp", { unique: false })
        } else {
          const upgradeTransaction = (event.target as IDBOpenDBRequest).transaction
          if (
            upgradeTransaction &&
            !upgradeTransaction
              .objectStore(STORES.ASSESSMENT_RESULTS)
              .indexNames.contains("syncState")
          ) {
            upgradeTransaction
              .objectStore(STORES.ASSESSMENT_RESULTS)
              .createIndex("syncState", "syncState", { unique: false })
          }
        }

        if (!db.objectStoreNames.contains(STORES.STUDENTS)) {
          db.createObjectStore(STORES.STUDENTS, { keyPath: "id" })
        }

        if (!db.objectStoreNames.contains(STORES.CLASSES)) {
          db.createObjectStore(STORES.CLASSES, { keyPath: "id" })
        }

        if (!db.objectStoreNames.contains(STORES.SUBJECTS)) {
          db.createObjectStore(STORES.SUBJECTS, { keyPath: "id" })
        }
      }
    })
  }

  async saveAssessmentResult(
    data: Omit<AssessmentResultRecord, "id" | "syncState" | "timestamp">,
  ): Promise<number> {
    if (!this.db) await this.init()

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORES.ASSESSMENT_RESULTS], "readwrite")
      const store = transaction.objectStore(STORES.ASSESSMENT_RESULTS)

      const record: Omit<AssessmentResultRecord, "id"> = {
        ...data,
        syncState: "pending",
        timestamp: Date.now(),
      }

      const request = store.add(record)
      request.onsuccess = () => resolve(request.result as number)
      request.onerror = () => reject(request.error)
    })
  }

  async getUnsyncedResults(): Promise<AssessmentResultRecord[]> {
    if (!this.db) await this.init()

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORES.ASSESSMENT_RESULTS], "readonly")
      const store = transaction.objectStore(STORES.ASSESSMENT_RESULTS)
      const index = store.index("syncState")
      const request = index.getAll("pending")

      request.onsuccess = () => resolve(request.result as AssessmentResultRecord[])
      request.onerror = () => reject(request.error)
    })
  }

  async markAsSynced(id: number): Promise<void> {
    if (!this.db) await this.init()

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORES.ASSESSMENT_RESULTS], "readwrite")
      const store = transaction.objectStore(STORES.ASSESSMENT_RESULTS)
      const request = store.get(id)

      request.onsuccess = () => {
        const data = request.result as AssessmentResultRecord | undefined
        if (data) {
          data.syncState = "synced"
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
      const transaction = this.db!.transaction([STORES.ASSESSMENT_RESULTS], "readwrite")
      const store = transaction.objectStore(STORES.ASSESSMENT_RESULTS)
      const request = store.delete(id)

      request.onsuccess = () => resolve()
      request.onerror = () => reject(request.error)
    })
  }

  async cacheStudents(students: CachedStudent[]): Promise<void> {
    if (!this.db) await this.init()

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORES.STUDENTS], "readwrite")
      const store = transaction.objectStore(STORES.STUDENTS)

      students.forEach((student) => {
        store.put(student)
      })

      transaction.oncomplete = () => resolve()
      transaction.onerror = () => reject(transaction.error)
    })
  }

  async getStudents(): Promise<CachedStudent[]> {
    if (!this.db) await this.init()

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORES.STUDENTS], "readonly")
      const store = transaction.objectStore(STORES.STUDENTS)
      const request = store.getAll()

      request.onsuccess = () => resolve(request.result as CachedStudent[])
      request.onerror = () => reject(request.error)
    })
  }

  async getUnsyncedCount(): Promise<number> {
    const unsynced = await this.getUnsyncedResults()
    return unsynced.length
  }
}

export const offlineStorage = new OfflineStorage()

