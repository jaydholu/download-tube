// Keeps at most one file's worth of disk in use at any moment during a batch download (see downloadAll in useBatchQueue) — 
// this cap just bounds how long an accidental huge paste can keep the tab busy.
export const MAX_BATCH_LINKS = 10;
