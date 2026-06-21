/**
 * Web implementation of file downloader.
 * Uses fetch, Blobs, and anchor tag triggering to download files in a web browser.
 */
export async function downloadFile(
  url: string,
  filename: string,
  token: string,
  mimeType: string
): Promise<void> {
  console.log(`[Downloader.web] Starting download of ${filename} from ${url}`);
  
  const response = await fetch(url, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`,
      "bypass-tunnel-reminder": "true",
    },
  });

  if (!response.ok) {
    throw new Error(`Download failed: HTTP ${response.status} ${response.statusText}`);
  }

  const blob = await response.blob();
  
  // Create object URL from the blob
  const objectUrl = URL.createObjectURL(blob);
  
  // Create a temporary anchor element
  const anchor = document.createElement("a");
  anchor.href = objectUrl;
  anchor.download = filename;
  
  // Append to body, click it to trigger download, and remove it
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  
  // Revoke the object URL after a short delay to free memory
  setTimeout(() => {
    URL.revokeObjectURL(objectUrl);
  }, 100);
}
