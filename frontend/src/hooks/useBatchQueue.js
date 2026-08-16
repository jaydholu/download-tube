import { useState, useEffect, useCallback, useRef } from 'react';
import {
  fetchVideoInfo, startDownload as apiStartDownload,
  fetchDownloadStatus, triggerFileSave,
} from '../api/client';

let idCounter = 0;
function nextId() { return `link_${++idCounter}_${Date.now()}` }

function pollUntilDone(taskId, onUpdate) {
  return new Promise((resolve) => {
    const interval = setInterval(async () => {
      try {
        const data = await fetchDownloadStatus(taskId)
        onUpdate(data)
        if (data.status === 'complete' || data.status === 'failed') {
          clearInterval(interval);
          resolve(data);
        }
      } catch {
        clearInterval(interval)
        resolve(null)
      }
    }, 800);
  });
}

// Drives 1-to-N links through the exact same per-item pipeline (fetch info, download, poll, save) regardless of count -
// the single-link view and the batch view are just two presentations of the same underlying queue.
export function useBatchQueue(links) {
  const [items, setItems] = useState([])
  const [globalFormat, setGlobalFormat] = useState('mp4')
  const [globalQuality, setGlobalQuality] = useState('auto')
  const [fetchingAll, setFetchingAll] = useState(false)
  const [downloadingBatch, setDownloadingBatch] = useState(false)
  const cancelRef = useRef(false)

  // Keep `items` in sync with the currently-extracted links, preserving in-flight state for links that are
  // still present and dropping ones that were removed.
  useEffect(() => {
    setItems(prev => {
      const byUrl = new Map(prev.map(it => [it.url, it]));

      return links.map(({ url, platform }) => {
        const existing = byUrl.get(url);

        if (existing)
          return existing;

        return {
          id: nextId(), url, platform,
          phase: null, info: null,
          format: 'inherit', quality: 'inherit',
          taskId: null, taskData: null, error: null,
        };
      });
    });
  }, [links]);

  const updateItem = useCallback((id, patch) => {
    setItems(prev => prev.map(it => (it.id === id ? { ...it, ...patch } : it)));
  }, []);

  const fetchAllInfo = useCallback(async () => {
    setFetchingAll(true);
    setItems(prev => prev.map(it => (it.info ? it : { ...it, phase: 'fetching', error: null })));

    const pending = items.filter(it => !it.info);

    await Promise.all(pending.map(async (it) => {
      try {
        const data = await fetchVideoInfo(it.url);
        updateItem(it.id, { info: data, phase: null, error: null });
      } catch (e) {
        updateItem(it.id, { phase: 'failed', error: e.message });
      }
    }));
    setFetchingAll(false);
  }, [items, updateItem]);

  const setItemFormat = useCallback((id, format) => updateItem(id, { format }), [updateItem]);
  const setItemQuality = useCallback((id, quality) => updateItem(id, { quality }), [updateItem]);
  const resetItemToGlobal = useCallback(
    (id) => updateItem(id, { format: 'inherit', quality: 'inherit' }),
    [updateItem]
  );

  // Strictly sequential: only one yt-dlp download in flight at a time,
  // so disk usage never exceeds a single file regardless of queue size.
  const downloadAll = useCallback(async () => {
    cancelRef.current = false;
    setDownloadingBatch(true);

    for (const it of items) {
      if (cancelRef.current)
        break;

      if (it.phase === 'complete')
        continue;

      const format = it.format === 'inherit' ? globalFormat : it.format;
      const quality = it.quality === 'inherit' ? globalQuality : it.quality;

      updateItem(it.id, { phase: 'starting', error: null });

      try {
        const { task_id } = await apiStartDownload(it.url, format, quality);
        updateItem(it.id, { taskId: task_id, phase: 'starting' });
        await pollUntilDone(task_id, (data) => {
          updateItem(it.id, { taskData: data, phase: data.status })
        });
      } catch (e) {
        updateItem(it.id, { phase: 'failed', error: e.message });
      }
    }
    setDownloadingBatch(false);
  }, [items, globalFormat, globalQuality, updateItem]);

  const cancelBatch = useCallback(() => { cancelRef.current = true }, []);
  const saveItem = useCallback((item) => {
    if (item.taskId)
      triggerFileSave(item.taskId);
  }, []);

  const completedCount = items.filter(it => it.phase === 'complete').length;
  const activeItem = items.find(it => it.phase === 'downloading' || it.phase === 'starting');
  const currentProgress = activeItem?.taskData?.progress || 0;

  return {
    items, updateItem,
    globalFormat, setGlobalFormat, globalQuality, setGlobalQuality,
    fetchingAll, fetchAllInfo,
    downloadingBatch, downloadAll, cancelBatch,
    setItemFormat, setItemQuality, resetItemToGlobal, saveItem,
    completedCount, currentProgress, total: items.length,
  };
}
