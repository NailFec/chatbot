## Chatbot Desktop (Windows)

Electron-based desktop chatbot for Windows that stays hidden on startup and toggles its UI with a global hotkey. It connects to Google Gemini via `@google/genai` using your `GEMINI_API_KEY`.

### Requirements

- Node.js 18+
- Windows 10/11
- Environment variable `GEMINI_API_KEY` set to a valid Google Gemini API key

### Quick Start (Development)

1. Install dependencies:
   - `npm install`
2. Start the app:
   - `npm start`
3. Use the global hotkey to toggle the window:
   - Win+Shift+D (default)

### Build and Install (Windows)

- Create an installer:
  - `npm run build`
- Run the generated installer (NSIS). After install, the app will start on login and remain hidden until you use the hotkey.

### Environment

- Set `GEMINI_API_KEY` in your system environment variables before running or building.

### Global Hotkey

- Default: Win+Shift+D
- Fallback: Ctrl+Shift+D (automatically used if the default is unavailable due to system or app conflicts)

### App Behavior

- The app starts hidden (no window).
- Press Win+Shift+D to show/hide the window.
- Closing the window hides the app; it does not quit.
- Press Alt+Shift+Q to quit the app.

### Troubleshooting

- Window does not appear:
  - Try Win+Shift+D; if it does not respond, try Ctrl+Shift+D (another app may have claimed the hotkey).
  - Check that the app is running in the background (Task Manager) and not fully closed.
- Gemini calls fail:
  - Ensure `GEMINI_API_KEY` is set and valid.
  - Verify network/proxy settings.
- Auto start not working:
  - Auto start is configured for the installed build. Use the installer created by `npm run build`.

### Security

- Your API key is read from environment variables in the main process and is not exposed to the renderer. Requests are proxied via IPC.
