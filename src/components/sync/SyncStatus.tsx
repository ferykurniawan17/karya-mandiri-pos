"use client";

import { useState, useEffect } from "react";
import { getSyncQueueStats } from "@/lib/sync-queue";
import { apiClient } from "@/lib/api-client";

interface SyncStatus {
  status: "idle" | "syncing" | "success" | "error";
  lastSync?: string;
  error?: string;
  syncedItems?: {
    products: number;
    categories: number;
    transactions: number;
  };
}

interface SyncStatusProps {
  isCollapsed?: boolean;
}

export default function SyncStatus({ isCollapsed }: SyncStatusProps) {
  const [syncStatus, setSyncStatus] = useState<SyncStatus>({ status: "idle" });
  const [isSyncing, setIsSyncing] = useState(false);
  const [queueStats, setQueueStats] = useState({
    pending: 0,
    processing: 0,
    failed: 0,
  });

  const fetchStatus = async () => {
    try {
      const response = await fetch("/api/sync");
      const data = await response.json();
      if (response.ok) {
        setSyncStatus(data);
      }
    } catch (err) {
      console.error("Error fetching sync status:", err);
    }

    // Fetch IndexedDB sync queue stats
    try {
      const stats = await getSyncQueueStats();
      setQueueStats(stats);
    } catch (err) {
      console.error("Error fetching sync queue stats:", err);
    }
  };

  useEffect(() => {
    fetchStatus();
    // Check sync status every 30 seconds
    const interval = setInterval(fetchStatus, 30000);
    return () => clearInterval(interval);
  }, []);

  const handleSync = async () => {
    setIsSyncing(true);
    setSyncStatus({ status: "syncing" });

    try {
      // Sync queue from IndexedDB
      await apiClient.syncQueue();

      // Also trigger server sync
      const response = await fetch("/api/sync", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ direction: "push" }),
      });

      const data = await response.json();

      if (response.ok) {
        setSyncStatus({
          ...data,
          lastSync: new Date().toISOString(),
        });
        await fetchStatus(); // Refresh stats
      } else {
        setSyncStatus({
          status: "error",
          error: data.error || "Gagal melakukan sync",
        });
      }
    } catch (err: any) {
      setSyncStatus({
        status: "error",
        error: err.message || "Terjadi kesalahan",
      });
    } finally {
      setIsSyncing(false);
    }
  };

  const totalPending = queueStats.pending + queueStats.processing;

  if (isCollapsed) {
    return (
      <div className="text-center">
        {totalPending > 0 && (
          <div className="text-xs text-yellow-600 font-semibold">
            {totalPending}
          </div>
        )}
        {queueStats.failed > 0 && (
          <div className="text-xs text-red-600 font-semibold">
            {queueStats.failed}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <button
            onClick={handleSync}
            disabled={isSyncing}
            className="px-3 py-1 text-sm bg-indigo-600 text-white rounded hover:bg-indigo-700 disabled:opacity-50"
          >
            {isSyncing ? "Syncing..." : "Sync Now"}
          </button>
          {totalPending > 0 && (
            <span className="text-xs text-yellow-600">
              {totalPending} pending
            </span>
          )}
          {queueStats.failed > 0 && (
            <span className="text-xs text-red-600">
              {queueStats.failed} failed
            </span>
          )}
        </div>
      </div>

      {syncStatus.lastSync && (
        <p className="text-xs text-gray-500 mb-2">
          Last sync: {new Date(syncStatus.lastSync).toLocaleString("id-ID")}
        </p>
      )}

      {syncStatus.error && (
        <p className="text-xs text-red-600 mb-2">{syncStatus.error}</p>
      )}

      {syncStatus.syncedItems && (
        <div className="text-xs text-gray-600 space-y-1">
          <p>
            Synced: {syncStatus.syncedItems.products} products,{" "}
            {syncStatus.syncedItems.categories} categories,{" "}
            {syncStatus.syncedItems.transactions} transactions
          </p>
        </div>
      )}

      <p className="text-xs text-gray-400 mt-2">Auto-sync when online</p>
    </div>
  );
}
