# Groei Browser

Groei is a desktop Electron application. The live Chromium browser surface uses Electron's `<webview>` and is not available when serving the renderer as a regular website.

## Run on Linux

Install Node.js and the Linux desktop libraries required by Electron, then run:

```bash
npm install
npm start
```

`npm start` launches Vite on port 4174 and Electron against that exact port. To build and open the production renderer locally, run `npm run desktop`. To create a desktop installer for the current operating system, run `npm run package:desktop`.

On Debian/Ubuntu, Electron may require GTK, ATK, NSS, X11, and audio libraries. If launch reports missing shared libraries, install the required packages using your system package manager. A graphical display session is also required.

## Deployment

The functional browser is distributed as a desktop application through GitHub Releases. Publishing a GitHub Release triggers the workflow in `.github/workflows/release.yml`, which builds Linux AppImage, macOS DMG, and Windows NSIS installers and attaches them to that release. Vercel can host ordinary web assets but cannot run Electron or provide the Chromium `<webview>` runtime, so a Vercel deployment would not be a working browser.