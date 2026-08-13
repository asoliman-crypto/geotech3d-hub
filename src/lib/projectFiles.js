// ---------------------------------------------------------------------------
// Project file workspace — upload, open and remove documents attached to a
// project (financial proposals, quotations, scans).
//
// Bytes live in a private Supabase Storage bucket; the list of files lives on
// the project row so it syncs to everyone like any other project field. The
// bucket is never public — opening a file mints a short-lived signed link.
// ---------------------------------------------------------------------------

import { isSupabaseConfigured, supabase } from "./supabase.js";

export const PROJECT_FILES_BUCKET = "project-files";
export const MAX_FILE_BYTES = 10 * 1024 * 1024; // keep in step with the bucket

export function formatFileSize(bytes) {
  const size = Number(bytes || 0);
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(0)} KB`;
  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
}

export function getProjectFiles(project) {
  return Array.isArray(project?.files) ? project.files : [];
}

/** Keep the stored name readable but safe as a storage path segment. */
function toStorageName(fileName) {
  const cleaned = String(fileName || "file")
    .normalize("NFKD")
    .replace(/[^\w.\- ]+/g, "")
    .replace(/\s+/g, "-")
    .slice(-80);
  const stamp = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
  return `${stamp}-${cleaned || "file"}`;
}

/**
 * Upload one file for a project.
 * @returns {Promise<{ok:boolean, message?:string, file?:object}>}
 */
export async function uploadProjectFile(projectId, file, uploadedBy) {
  if (!isSupabaseConfigured) {
    return { ok: false, message: "File uploads need the cloud workspace. Sign in online to attach files." };
  }
  if (!file) return { ok: false, message: "No file selected." };
  if (file.size > MAX_FILE_BYTES) {
    return { ok: false, message: `"${file.name}" is ${formatFileSize(file.size)} — the limit is ${formatFileSize(MAX_FILE_BYTES)}.` };
  }

  const path = `${projectId}/${toStorageName(file.name)}`;
  const { error } = await supabase.storage
    .from(PROJECT_FILES_BUCKET)
    .upload(path, file, { contentType: file.type || "application/octet-stream", upsert: false });

  if (error) {
    const missingBucket = /bucket|not found/i.test(error.message || "");
    return {
      ok: false,
      message: missingBucket
        ? "The project-files storage bucket is not set up yet. Run supabase/setup-project-files.sql once."
        : `Upload failed: ${error.message}`,
    };
  }

  return {
    ok: true,
    file: {
      id: path,
      path,
      name: file.name,
      size: file.size,
      type: file.type || "",
      uploadedBy: uploadedBy || "",
      uploadedAt: new Date().toISOString(),
    },
  };
}

/** Mint a short-lived link and open/download the file. */
export async function openProjectFile(file) {
  if (!isSupabaseConfigured) return { ok: false, message: "Not available offline." };
  const { data, error } = await supabase.storage
    .from(PROJECT_FILES_BUCKET)
    .createSignedUrl(file.path, 60, { download: file.name });
  if (error) return { ok: false, message: `Could not open the file: ${error.message}` };

  const link = document.createElement("a");
  link.href = data.signedUrl;
  link.rel = "noopener";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  return { ok: true };
}

export async function removeProjectFile(file) {
  if (!isSupabaseConfigured) return { ok: false, message: "Not available offline." };
  const { error } = await supabase.storage.from(PROJECT_FILES_BUCKET).remove([file.path]);
  // A file already gone from storage should still leave the project listing.
  if (error && !/not found/i.test(error.message || "")) {
    return { ok: false, message: `Could not delete the file: ${error.message}` };
  }
  return { ok: true };
}
