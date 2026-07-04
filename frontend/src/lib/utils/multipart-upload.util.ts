import axios from "axios";

/**
 * A single uploaded multipart part, keyed by 1-indexed part number and the
 * ETag returned by the storage backend for that part.
 */
export interface UploadedPart {
  partNumber: number;
  etag: string;
}

/**
 * A presigned PUT URL for a single multipart upload chunk, as returned by the
 * backend's upload-initiate endpoint.
 */
export interface PresignedPartUrl {
  partNumber: number;
  url: string;
}

/** Maximum number of concurrent part uploads in flight at once. */
export const MAX_CONCURRENT_PART_UPLOADS = 6;

/** Per-part upload request timeout, in milliseconds. */
const PART_UPLOAD_TIMEOUT_MS = 120000;

/** Number of retry attempts per part before giving up. */
const MAX_PART_RETRIES = 3;

/**
 * Uploads a single file chunk to its presigned URL, retrying on failure with
 * exponential backoff. Reads the `ETag` response header (required to
 * complete the multipart upload) and throws a descriptive error instead of
 * silently substituting a fake value if the header is missing — a missing
 * ETag almost always means the storage backend's CORS config isn't exposing
 * it to the browser.
 *
 * @param chunk - The file slice (Blob) to upload for this part.
 * @param url - The presigned PUT URL for this part.
 * @param partNumber - The 1-indexed part number being uploaded.
 * @param onProgress - Callback invoked with bytes uploaded so far for this part.
 * @returns A promise resolving to the uploaded part's number and ETag.
 * @throws {Error} If all retry attempts fail, or the response is missing an ETag header.
 */
export async function uploadChunkWithRetry(
  chunk: Blob,
  url: string,
  partNumber: number,
  onProgress: (bytesUploaded: number) => void,
): Promise<UploadedPart> {
  let retriesLeft = MAX_PART_RETRIES;

  while (retriesLeft > 0) {
    try {
      const res = await axios.put(url, chunk, {
        headers: { "Content-Type": "application/octet-stream" },
        timeout: PART_UPLOAD_TIMEOUT_MS,
        onUploadProgress: (progressEvent) => {
          onProgress(progressEvent.loaded);
        },
      });

      const rawEtag = res.headers.etag || res.headers.ETag;
      if (!rawEtag) {
        throw new Error(
          "Missing ETag in upload response — check MinIO bucket CORS ExposeHeaders",
        );
      }

      return { partNumber, etag: rawEtag.replace(/"/g, "") };
    } catch (err) {
      retriesLeft -= 1;
      if (retriesLeft === 0) {
        throw err;
      }
      const attemptNumber = MAX_PART_RETRIES - retriesLeft;
      const backoffMs = 1000 * Math.pow(2, attemptNumber);
      await new Promise((resolve) => setTimeout(resolve, backoffMs));
    }
  }

  // Unreachable — the loop above always either returns or throws.
  throw new Error(`Failed to upload part ${partNumber}`);
}

/**
 * Uploads all file chunks concurrently (bounded by {@link MAX_CONCURRENT_PART_UPLOADS})
 * against their presigned part URLs, tracking per-chunk progress and reporting
 * an aggregate progress percentage as bytes complete.
 *
 * @param chunks - Ordered file slices to upload.
 * @param partUrls - Presigned URLs, one per chunk, matched by array index.
 * @param totalBytes - Total byte size of the file being uploaded (for progress math).
 * @param onProgressPercent - Callback invoked with the 0-100 aggregate upload percentage.
 * @returns A promise resolving to the list of uploaded parts (unordered).
 */
export async function uploadChunksConcurrently(
  chunks: Blob[],
  partUrls: PresignedPartUrl[],
  totalBytes: number,
  onProgressPercent: (percent: number) => void,
): Promise<UploadedPart[]> {
  const uploadedBytesByIndex = new Array(chunks.length).fill(0);
  const parts: UploadedPart[] = [];

  const reportProgress = () => {
    const totalUploaded = uploadedBytesByIndex.reduce((sum, val) => sum + val, 0);
    const percent = totalBytes > 0 ? Math.round((totalUploaded * 100) / totalBytes) : 0;
    onProgressPercent(percent);
  };

  const queue = chunks.map((chunk, index) => ({
    chunk,
    url: partUrls[index].url,
    partNumber: partUrls[index].partNumber,
    index,
  }));

  const runWorker = async () => {
    while (queue.length > 0) {
      const item = queue.shift();
      if (!item) break;
      const uploaded = await uploadChunkWithRetry(
        item.chunk,
        item.url,
        item.partNumber,
        (bytesUploaded) => {
          uploadedBytesByIndex[item.index] = bytesUploaded;
          reportProgress();
        },
      );
      parts.push(uploaded);
    }
  };

  const workerCount = Math.min(MAX_CONCURRENT_PART_UPLOADS, chunks.length);
  const workers = Array.from({ length: workerCount }, runWorker);
  await Promise.all(workers);

  return parts;
}

/**
 * Verifies that a collected set of uploaded parts is exactly contiguous from
 * 1..N, with no gaps or duplicates, before the upload is finalized. Catches
 * cases where a part silently failed to register (e.g. a worker crashed
 * mid-upload without throwing) that would otherwise produce a corrupt
 * stitched file.
 *
 * @param parts - The parts collected during the upload.
 * @throws {Error} If any part number is missing, duplicated, or out of the expected [1..N] range.
 */
export function assertPartsAreContiguous(parts: UploadedPart[]): void {
  if (parts.length === 0) {
    throw new Error("No parts were uploaded.");
  }

  const sortedPartNumbers = [...parts]
    .map((p) => p.partNumber)
    .sort((a, b) => a - b);

  for (let i = 0; i < sortedPartNumbers.length; i++) {
    if (sortedPartNumbers[i] !== i + 1) {
      throw new Error(
        "Upload verification failed: parts are missing or duplicated. Please retry the upload.",
      );
    }
  }
}
