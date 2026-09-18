import { offlineStorage } from './storage'

class SyncManager {
  private syncing = false

  async syncAll(): Promise<{ success: number; failed: number }> {
    if (this.syncing) {
      console.log('Sync already in progress')
      return { success: 0, failed: 0 }
    }

    if (!navigator.onLine) {
      console.log('Device is offline, skipping sync')
      return { success: 0, failed: 0 }
    }

    this.syncing = true
    let success = 0
    let failed = 0

    try {
      const unsyncedResults = await offlineStorage.getUnsyncedResults()
      console.log(`Syncing ${unsyncedResults.length} unsynced results`)

      for (const result of unsyncedResults) {
        try {
          // Send to server
          const response = await fetch(`/api/assessments/${result.assessmentId}/results`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
              results: result.results 
            })
          })

          if (response.ok) {
            // Mark as synced
            await offlineStorage.markAsSynced(result.id)
            success++
            console.log(`Synced result ${result.id}`)
          } else {
            failed++
            console.error(`Failed to sync result ${result.id}:`, await response.text())
          }
        } catch (error) {
          failed++
          console.error(`Error syncing result ${result.id}:`, error)
        }
      }
    } catch (error) {
      console.error('Sync error:', error)
    } finally {
      this.syncing = false
    }

    return { success, failed }
  }

  async startAutoSync(intervalMs: number = 60000): Promise<void> {
    // Sync immediately
    await this.syncAll()

    // Then sync periodically
    setInterval(async () => {
      if (navigator.onLine) {
        await this.syncAll()
      }
    }, intervalMs)

    // Also sync when coming back online
    window.addEventListener('online', async () => {
      console.log('Device is back online, syncing...')
      await this.syncAll()
    })
  }

  isSyncing(): boolean {
    return this.syncing
  }
}

export const syncManager = new SyncManager()
