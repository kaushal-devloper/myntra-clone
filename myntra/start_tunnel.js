const localtunnel = require('localtunnel');
const fs = require('fs');
const path = require('path');

(async function() {
  try {
    const tunnel = await localtunnel({ port: 5000 });
    const url = tunnel.url;
    console.log("LOCALTUNNEL_URL=" + url);

    // Automatically update .env file
    const envPath = path.join(__dirname, '.env');
    let envContent = '';
    if (fs.existsSync(envPath)) {
      envContent = fs.readFileSync(envPath, 'utf8');
      
      // Remove any existing EXPO_PUBLIC_API_URL line
      envContent = envContent.split('\n').filter(line => !line.startsWith('EXPO_PUBLIC_API_URL=') && !line.startsWith('# EXPO_PUBLIC_API_URL=')).join('\n');
    }
    
    // Append the new URL
    envContent = `EXPO_PUBLIC_API_URL=${url}\n` + envContent;
    
    fs.writeFileSync(envPath, envContent.trim() + '\n');
    console.log("Successfully updated .env with the new EXPO_PUBLIC_API_URL.");
    console.log("Please restart your Expo server (npx expo start) to apply the new URL.");

    tunnel.on('close', () => {
      console.log("Tunnel closed");
    });
  } catch (err) {
    console.error("Error:", err);
  }
})();
