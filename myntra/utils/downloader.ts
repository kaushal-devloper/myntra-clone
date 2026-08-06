/**
 * Native implementation of file downloader.
 * Uses expo-file-system and expo-sharing to download and share files on iOS/Android.
 */
import * as FileSystem from "expo-file-system";
import * as Sharing from "expo-sharing";
import { Linking } from "react-native";
import { Paths } from 'expo-file-system';

export async function downloadFile(
  url: string,
  filename: string,
  token: string,
  mimeType: string
): Promise<void> {
  console.log(`[Downloader.native] Starting download of ${filename} from ${url}`);
  
const fileUri = Paths.document.uri + "transactions.csv";
  
  const downloadResult = await FileSystem.downloadAsync(url, fileUri, {
    headers: {
      Authorization: `Bearer ${token}`,
      "bypass-tunnel-reminder": "true",
    },
  });

  if (downloadResult.status !== 200) {
    throw new Error(`File download failed (Status ${downloadResult.status})`);
  }

  const isAvailable = await Sharing.isAvailableAsync();
  if (isAvailable) {
    await Sharing.shareAsync(downloadResult.uri, {
      mimeType: mimeType,
      dialogTitle: `Open Report`,
    });
  } else {
    // Fallback if sharing is not available
    const supported = await Linking.canOpenURL(downloadResult.uri);
    if (supported) {
      await Linking.openURL(downloadResult.uri);
    } else {
      await Linking.openURL(url);
    }
  }
}
