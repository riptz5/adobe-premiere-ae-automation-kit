import fetch from "node-fetch";
import FormData from "form-data";
import fs from "fs";
import path from "path";

const [,, filePath, projectId, folderId] = process.argv;
const token = process.env.FRAMEIO_TOKEN;

if (!token) {
  console.error("Missing FRAMEIO_TOKEN env var.");
  process.exit(1);
}
if (!filePath || !projectId || !folderId) {
  console.error("Usage: node upload.js /path/video.mp4 <PROJECT_ID> <FOLDER_ID>");
  process.exit(1);
}

const API = "https://api.frame.io/v2";

async function api(method, url, body, headers={}) {
  const res = await fetch(API + url, {
    method,
    headers: { Authorization: `Bearer ${token}`, ...headers },
    body
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${await res.text()}`);
  return await res.json();
}

/**
 * V2 upload pattern:
 * 1) Create asset in folder
 * 2) Upload file to provided upload URL (TUS in some cases); simplified here by using direct upload endpoint if available.
 *
 * NOTE: Frame.io upload can use TUS resumable uploads; production code should implement TUS.
 */
async function main() {
  const stat = fs.statSync(filePath);
  const name = path.basename(filePath);

  // Create asset
  const asset = await api("POST", `/assets/${folderId}/children`, JSON.stringify({
    name,
    type: "file",
    filetype: path.extname(name).slice(1),
    filesize: stat.size
  }), { "Content-Type": "application/json" });

  console.log("Created asset:", asset.id);

  // Get upload URL
  const uploadInfo = await api("POST", `/assets/${asset.id}/uploads`, JSON.stringify({
    filename: name,
    filesize: stat.size
  }), { "Content-Type": "application/json" });

  const uploadUrl = uploadInfo.upload_url || uploadInfo.url;
  if (!uploadUrl) throw new Error("No upload_url returned; you may need TUS workflow.");

  console.log("Uploading to:", uploadUrl);

  // naive upload (may fail depending on account/config)
  const fileStream = fs.createReadStream(filePath);
  const upRes = await fetch(uploadUrl, {
    method: "PUT",
    headers: { "Content-Length": String(stat.size) },
    body: fileStream
  });
  if (!upRes.ok) throw new Error(`Upload failed: ${upRes.status} ${await upRes.text()}`);

  console.log("Upload done.");
  console.log("Asset:", asset.id, "Project:", projectId);
}

main().catch(err => {
  console.error("ERR:", err.message);
  process.exit(1);
});
