import { app, BrowserWindow } from "electron";
import { spawn } from "child_process";
import { createWriteStream, existsSync, chmodSync } from "fs";
import path from "path";
import { fileURLToPath } from "url";
import os from "os";
const __dirname$1 = path.dirname(fileURLToPath(import.meta.url));
const isDev = process.env.NODE_ENV === "development";
const logFile = createWriteStream(path.join(os.homedir(), "ckb-manager-debug.log"), { flags: "a" });
const origLog = console.log;
const origError = console.error;
const origWarn = console.warn;
console.log = (...args) => {
  origLog(...args);
  logFile.write("[LOG] " + args.map((a) => typeof a === "object" ? JSON.stringify(a) : a).join(" ") + "\n");
};
console.error = (...args) => {
  origError(...args);
  logFile.write("[ERR] " + args.map((a) => typeof a === "object" ? JSON.stringify(a) : a).join(" ") + "\n");
};
console.warn = (...args) => {
  origWarn(...args);
  logFile.write("[WARN] " + args.map((a) => typeof a === "object" ? JSON.stringify(a) : a).join(" ") + "\n");
};
let mainWindow;
let serverProcess;
function makeExecutable() {
  if (process.platform === "win32") return;
  const platform = process.platform === "darwin" ? "mac" : "linux";
  const ckbPath = isDev ? path.join(__dirname$1, "../ckb-bins", platform, "ckb") : path.join(process.resourcesPath, "ckb-bins", platform, "ckb");
  console.log("ckbPath:", ckbPath);
  console.log("ckbPath exists:", existsSync(ckbPath));
  if (existsSync(ckbPath)) {
    try {
      chmodSync(ckbPath, "755");
      console.log("chmod 755 applied to ckb binary:", ckbPath);
    } catch (e) {
      console.error("chmod failed:", e.message);
    }
  } else {
    console.warn("ckb binary not found at:", ckbPath);
  }
}
function startServer() {
  const serverPath = isDev ? path.join(__dirname$1, "../backend/server.js") : path.join(process.resourcesPath, "backend-dist", "server.js");
  const nodeBin = process.execPath;
  console.log("=== startServer ===");
  console.log("isDev:", isDev);
  console.log("resourcesPath:", process.resourcesPath);
  console.log("serverPath:", serverPath);
  console.log("serverPath exists:", existsSync(serverPath));
  console.log("nodeBin:", nodeBin);
  serverProcess = spawn(nodeBin, [serverPath], {
    stdio: ["ignore", "pipe", "pipe"],
    env: {
      ...process.env,
      ELECTRON_RUN_AS_NODE: "1"
    }
  });
  serverProcess.stdout.on("data", (data) => console.log("[server]", data.toString().trim()));
  serverProcess.stderr.on("data", (data) => console.error("[server error]", data.toString().trim()));
  serverProcess.on("exit", (code) => console.log("[server exit] code:", code));
  serverProcess.on("error", (err) => console.error("[server spawn error]", err.message));
}
function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    title: "CKB Node Manager",
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      webSecurity: false
    }
  });
  if (isDev) {
    mainWindow.loadURL("http://localhost:5173");
    mainWindow.webContents.openDevTools();
  } else {
    const indexPath = path.join(app.getAppPath(), "dist-react", "index.html");
    console.log("Loading index:", indexPath);
    console.log("Index exists:", existsSync(indexPath));
    mainWindow.loadFile(indexPath);
    mainWindow.webContents.session.webRequest.onHeadersReceived((details, callback) => {
      callback({
        responseHeaders: {
          ...details.responseHeaders,
          "Content-Security-Policy": ["default-src 'self' 'unsafe-inline' 'unsafe-eval' http://localhost:3001 ws://localhost:3001"]
        }
      });
    });
  }
  mainWindow.on("closed", () => {
    mainWindow = null;
  });
}
app.whenReady().then(() => {
  console.log("=== app ready ===");
  console.log("platform:", process.platform);
  console.log("arch:", process.arch);
  console.log("resourcesPath:", process.resourcesPath);
  console.log("appPath:", app.getAppPath());
  makeExecutable();
  startServer();
  setTimeout(createWindow, 2e3);
});
app.on("window-all-closed", () => {
  if (serverProcess) serverProcess.kill();
  if (process.platform !== "darwin") app.quit();
});
app.on("activate", () => {
  if (mainWindow === null) {
    startServer();
    setTimeout(createWindow, 2e3);
  }
});
app.on("will-quit", () => {
  if (serverProcess) serverProcess.kill();
});
