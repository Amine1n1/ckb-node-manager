import express from "express";
import cors from "cors";
import { spawn } from "child_process";

const app = express();
app.use(cors());
app.use(express.json());

let ckbProcess = null;
let currentNetwork = null;

// Netzwerk-Konfiguration: Pfade und Ports
const NETWORKS = {
  mainnet: {
    dir: "/Users/aminegaddah/Documents/Node_Manager_CKB/node_manager/mainnet",
    ckb: "/Users/aminegaddah/Documents/Node_Manager_CKB/node_manager/mainnet/ckb",
    rpcPort: 8114,
    p2pPort: 8115
  },
  testnet: {
    dir: "/Users/aminegaddah/Documents/Node_Manager_CKB/node_manager/testnet",
    ckb: "/Users/aminegaddah/Documents/Node_Manager_CKB/node_manager/testnet/ckb",
    rpcPort: 9124,
    p2pPort: 9125
  },
  devnet: {
    dir: "/Users/aminegaddah/Documents/Node_Manager_CKB/node_manager/devnet",
    ckb: "/Users/aminegaddah/Documents/Node_Manager_CKB/node_manager/devnet/ckb",
    rpcPort: 10214,
    p2pPort: 10215
  }
};

// Start Node
function startNode(network) {
  if (!NETWORKS[network]) {
    console.error("Unbekanntes Netzwerk:", network);
    return;
  }

  const { dir, ckb } = NETWORKS[network];
  currentNetwork = network;

  // Stoppe vorhandenen Node
  if (ckbProcess) {
    console.log("Stoppe aktuellen Node...");
    ckbProcess.kill();
    ckbProcess = null;
  }

  console.log("Starte Node für Netzwerk:", network);
  console.log("CKB executable:", ckb);
  console.log("Node Verzeichnis:", dir);

  try {
    ckbProcess = spawn(ckb, ["run"], {
      cwd: dir,
      stdio: "inherit"
    });

    ckbProcess.on("error", (err) => console.error("CKB Prozess Fehler:", err));
    ckbProcess.on("exit", (code, signal) => {
      console.log(`CKB Prozess beendet mit code=${code}, signal=${signal}`);
      ckbProcess = null;
    });

  } catch (err) {
    console.error("Fehler beim Starten des Nodes:", err);
  }
}

// RPC Call
async function rpcCall(method, params = []) {
  if (!currentNetwork) throw new Error("Kein Netzwerk gestartet");

  const { rpcPort } = NETWORKS[currentNetwork];

  const res = await fetch(`http://127.0.0.1:${rpcPort}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ id: 1, jsonrpc: "2.0", method, params })
  });

  const data = await res.json();
  return data.result;
}

// API Endpoints
app.post("/start", (req, res) => {
  const { network } = req.body;
  if (!NETWORKS[network]) return res.status(400).json({ error: "Unbekanntes Netzwerk" });

  try {
    startNode(network);
    res.json({ status: "started", network });
  } catch (err) {
    console.error(err);
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
  if (!currentNetwork) return res.status(400).json({ error: "Kein Netzwerk gestartet" });
  startNode(currentNetwork);
  res.json({ status: "restarted", network: currentNetwork });
});

/*app.get("/nodeinfo", async (req, res) => {
  try {
    const blockchain = await rpcCall("get_blockchain_info");
    const peers = await rpcCall("get_peers");
    const tip = await rpcCall("get_tip_header");

    let networkHeight = 0;
    let blockHeight = parseInt(tip.number, 16);

    peers.forEach(peer => {

      const heightHex = peer?.sync_state?.best_known_header_number;

      if (heightHex) {
        const height = parseInt(heightHex, 16);

        if (height > networkHeight) {
          networkHeight = height;
        }
      }

    });

    const progress =
      networkHeight > 0
        ? Math.floor((blockHeight / networkHeight) * 100)
        : 0;


    res.json({
      chain: blockchain.chain,
      blockHeight,
      tipHash: blockchain.tip_hash,
      difficulty: blockchain.difficulty,
      syncing: blockchain.is_initial_block_download.toString(),
      peers: peers.length,
      networkHeight,
      progress
    });
  } catch (err) {
    res.json({ error: "Node nicht erreichbar" });
  }
});*/

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
    res.json({ error: "Node nicht erreichbar" });
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
    console.error(err);
    res.status(500).json({ error: "Fehler bei Peers" });
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
    console.error(err);
    res.json({ error: "Fehler bei Header" });
  }
});

app.get("/status", (req, res) => {
  res.json({
    running: ckbProcess !== null,
    network: currentNetwork
  });
});

app.get("/", (req, res) => res.send("CKB Node Manager API läuft"));

app.listen(3001, () => console.log("Node Manager API läuft auf 3001"));