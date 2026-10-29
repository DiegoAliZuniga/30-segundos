/* Only public configuration belongs here. Teacher credentials stay in Apps Script. */
window.THIRTY_CONFIG = {
  appsScriptUrl: '', // Paste the deployed Apps Script URL ending in /exec.
  googleClientId: '', // Optional Google OAuth WEB client ID. Same value on the server.
  pollSeconds: 20,
  demoEnabled: true // A clearly labeled, isolated local demonstration; never writes to Sheets.
};
