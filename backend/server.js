import express from "express";
import cors from "cors";
import { spawn, execSync, execFileSync } from "child_process";
import path from "path";
import { fileURLToPath } from "url";
import { existsSync, mkdirSync, cpSync } from "fs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
app.use(express.json());

let ckbProcess = null;
let currentNetwork = null;
let logBuffer = [];
let logClients = [];

app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// ─── Dynamic Paths ───────────────────────────────────────────────

// In development: project root
// In production: the Resources folder inside the .app / installed app
const getBasePath = () => {
  const isDev = process.env.NODE_ENV === "development";
  if (isDev) return path.join(__dirname, "..");
  return process.resourcesPath;
};

const getTemplatesPath = () => {
  const isDev = process.env.NODE_ENV === "development";
  if (isDev) return path.join(__dirname, "..", "ckb-templates");
  return path.join(process.resourcesPath, "ckb-templates");
};

// Returns the correct CKB binary path depending on the OS
const getCkbBinary = () => {
  const base = path.join(getBasePath(), "ckb-bins");
  const platform = process.platform;

  if (platform === "darwin") return path.join(base, "mac", "ckb");
  if (platform === "win32") return path.join(base, "win", "ckb.exe");
  if (platform === "linux") return path.join(base, "linux", "ckb");

  throw new Error(`Unsupported platform: ${platform}`);
};

// Each user gets their own node data in their home directory
// e.g. /Users/john/.ckb-node-manager/mainnet
const getUserDataPath = (network) => {
  const home = process.env.HOME || process.env.USERPROFILE;
  return path.join(home, ".ckb-node-manager", network.toLowerCase());
};

// ─── Network Configuration ───────────────────────────────────────

const NETWORKS = {
  Mainnet: {
    get dir() { return getUserDataPath("mainnet"); },
    get ckb() { return getCkbBinary(); },
    rpcPort: 8114,
    p2pPort: 8115,
    chain: "mainnet"
  },
  Testnet: {
    get dir() { return getUserDataPath("testnet"); },
    get ckb() { return getCkbBinary(); },
    rpcPort: 9124,
    p2pPort: 9125,
    chain: "testnet"
  },
  Devnet: {
    get dir() { return getUserDataPath("devnet"); },
    get ckb() { return getCkbBinary(); },
    rpcPort: 10214,
    p2pPort: 10215,
    chain: "dev"
  }
};

// ─── Logging ─────────────────────────────────────────────────────

function addLog(type, message) {
  const log = { type, message, time: new Date().toLocaleTimeString() };
  logBuffer = [...logBuffer.slice(-500), log];
  logClients.forEach(client =>
    client.res.write(`data: ${JSON.stringify(log)}\n\n`)
  );
}

// ─── Node Initialization ─────────────────────────────────────────

// When a user starts the node for the first time, CKB needs to be
// initialized with "ckb init". This creates ckb.toml and other config files.
function initNodeIfNeeded(network) {
  const { dir } = NETWORKS[network];
  const networkLower = network.toLowerCase();
  const templateDir = path.join(getTemplatesPath(), networkLower);

  addLog("info", `Template dir: ${templateDir}`);
  addLog("info", `Template exists: ${existsSync(templateDir)}`);
  addLog("info", `Data dir: ${dir}`);
  addLog("info", `ckb.toml exists: ${existsSync(path.join(dir, "ckb.toml"))}`);

  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
    addLog("info", `Created data directory: ${dir}`);
  }

  if (existsSync(path.join(dir, "ckb.toml"))) {
    addLog("info", `${network} already initialized, skipping...`);
    return;
  }

  addLog("info", `Initializing ${network} node for the first time...`);

  try {
    cpSync(templateDir, dir, { recursive: true });
    addLog("info", `${network} node initialized successfully ✅`);
  } catch (err) {
    addLog("error", `cpSync error: ${err.message}`);
    addLog("error", `Stack: ${err.stack}`);
    throw err;
  }
}

// ─── Start Node ──────────────────────────────────────────────────

function startNode(network) {
  if (!NETWORKS[network]) {
    addLog("error", `Unknown network: ${network}`);
    return;
  }

  const { dir, ckb } = NETWORKS[network];
  currentNetwork = network;

  // Kill the currently running node if there is one
  if (ckbProcess) {
    addLog("info", "Stopping current node...");
    ckbProcess.kill();
    ckbProcess = null;
  }

  // Also kill any CKB processes that were started outside the app
  // (e.g. from the terminal) to avoid database lock conflicts
  try {
    execSync(`pkill -f "ckb run"`, { stdio: "ignore" });
  } catch (e) {
    // No external process found — that's fine
  }

  // Initialize the node if this is the first time starting it
  try {
    initNodeIfNeeded(network);
  } catch (err) {
    addLog("error", `Init error details: ${err.message}`);
    addLog("error", `Init error stack: ${err.stack}`);
    console.error("Init failed:", err); // <- auch in Terminal ausgeben
    return;
  }

  addLog("info", `Starting ${network} node...`);
  addLog("info", `Binary: ${ckb}`);
  addLog("info", `Data directory: ${dir}`);

  try {
    ckbProcess = spawn(ckb, ["run"], {
      cwd: dir,
      // "pipe" lets us capture stdout and stderr
      // "ignore" for stdin since we don't need to send input to CKB
      stdio: ["ignore", "pipe", "pipe"]
    });

    // Forward CKB output to the log system
    ckbProcess.stdout?.on("data", (data) => addLog("info", data.toString()));
    ckbProcess.stderr?.on("data", (data) => addLog("error", data.toString()));

    ckbProcess.on("exit", (code, signal) => {
      addLog("info", `Node stopped (code: ${code}, signal: ${signal})`);
      ckbProcess = null;
    });

    ckbProcess.on("error", (err) => {
      addLog("error", `Process error: ${err.message}`);
    });

  } catch (err) {
    addLog("error", `Failed to start node: ${err.message}`);
  }
}

// ─── RPC Call ────────────────────────────────────────────────────

async function rpcCall(method, params = []) {
  if (!currentNetwork) throw new Error("No network started");

  const { rpcPort } = NETWORKS[currentNetwork];

  const res = await fetch(`http://127.0.0.1:${rpcPort}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ id: 1, jsonrpc: "2.0", method, params })
  });

  const data = await res.json();
  return data.result;
}

// ─── API Endpoints ───────────────────────────────────────────────

app.post("/start", (req, res) => {
  const { network } = req.body;
  if (!NETWORKS[network]) return res.status(400).json({ error: "Unknown network" });

  try {
    startNode(network);
    res.json({ status: "started", network });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/stop", (req, res) => {
  if (ckbProcess) {
    ckbProcess.kill();
    ckbProcess = null;
  }
  currentNetwork = null;
  res.json({ status: "stopped" });
});

app.get("/restart", (req, res) => {
  if (!currentNetwork) return res.status(400).json({ error: "No network started" });
  startNode(currentNetwork);
  res.json({ status: "restarted", network: currentNetwork });
});

app.get("/nodeinfo", async (req, res) => {
  try {
    const blockchain = await rpcCall("get_blockchain_info");
    res.json({
      chain: blockchain.chain,
      difficulty: blockchain.difficulty,
      epoch: blockchain.epoch,
      initialBlockDownload: blockchain.is_initial_block_download.toString()
    });
  } catch (err) {
    res.json({ error: "Node not reachable" });
  }
});

app.get("/peers", async (req, res) => {
  try {
    const peers = await rpcCall("get_peers");

    const formatted = peers.map(peer => {
      const address = peer.addresses?.[0]?.address || "";
      const ip = address.split("/")[2] || "-";
      const heightHex = peer.sync_state?.best_known_header_number;
      const height = heightHex ? parseInt(heightHex, 16) : null;
      const durationSec = parseInt(peer.connected_duration, 16);

      return {
        node_id: peer.node_id,
        ip,
        version: peer.version,
        type: peer.is_outbound ? "Outbound" : "Inbound",
        height,
        connected: Math.floor(durationSec / 60) + " min",
        syncing: !!height
      };
    });

    res.json({
      total: peers.length,
      syncing: formatted.filter(p => p.syncing).length,
      peers: formatted
    });
  } catch (err) {
    res.status(500).json({ error: "Error fetching peers" });
  }
});

app.get("/tipheader", async (req, res) => {
  try {
    const tip = await rpcCall("get_tip_header");
    const peers = await rpcCall("get_peers");

    let networkHeight = 0;
    const blockHeight = parseInt(tip.number, 16);

    peers.forEach(peer => {
      const heightHex = peer.sync_state?.best_known_header_number;
      if (heightHex) {
        const height = parseInt(heightHex, 16);
        if (height > networkHeight) networkHeight = height;
      }
    });

    const progress = networkHeight > 0
      ? Math.floor((blockHeight / networkHeight) * 100)
      : 0;

    res.json({
      dao: tip.dao,
      timestamp: tip.timestamp,
      epoch: tip.epoch,
      tipHash: tip.hash,
      blockNumber: tip.number,
      networkHeight,
      blockHeight,
      progress
    });
  } catch (err) {
    res.json({ error: "Error fetching header" });
  }
});

// SSE endpoint — frontend connects here to receive logs in real time
app.get("/logs", (req, res) => {
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.flushHeaders();

  // Send existing logs immediately so the frontend shows history
  logBuffer.forEach(log => {
    res.write(`data: ${JSON.stringify(log)}\n\n`);
  });

  const client = { res };
  logClients.push(client);

  // Remove the client when they disconnect
  req.on("close", () => {
    logClients = logClients.filter(c => c !== client);
  });
});

app.get("/status", (req, res) => {
  res.json({
    running: ckbProcess !== null,
    network: currentNetwork
  });
});

app.get("/", (req, res) => res.send("CKB Node Manager API running"));

app.listen(3001, () => console.log("Node Manager API running on port 3001"));