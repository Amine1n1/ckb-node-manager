import { useState, useEffect } from "react";
import NodeInfo from "./NodeInfo";
import Network from "./Network";
import Blockchain from "./Blockchain";
import SyncStatus from "./Sync";
import Sidebar from "./Sidebar";
import {PeersChart} from './Charts';

export default function Dashboard({ nodeInfo, peers, header, npeers, status, network, setNetwork, startNode, stopNode}) {

  const [tab, setTab] = useState("node");
  const [menuOpen, setMenuOpen] = useState(false);
  const [darkMode, setDarkMode] = useState(true);

 
  const [peersData, setPeersData] = useState([]);

  
  useEffect(() => {
    const interval = setInterval(() => {
      const now = new Date();
      const timeLabel = `${now.getHours()}:${now.getMinutes().toString().padStart(2,'0')}:${now.getSeconds().toString().padStart(2,'0')}`;
      
      
      setPeersData(prev => {
        const newData = [...prev, { time: timeLabel, peers: npeers?.total || 0 }];
        return newData.slice(-10);
      });
    }, 2000);

    return () => clearInterval(interval);
  }, [npeers]);

  useEffect(() => {
    if (darkMode) {
      document.body.classList.add("dark");
    } else {
     document.body.classList.remove("dark");
    }
    }, [darkMode]);

  return (

    <div className="layout">

      <button className="burger" onClick={() => setMenuOpen(!menuOpen)}>
          ☰
      </button>

      <Sidebar tab={tab} setTab={setTab} menuOpen={menuOpen} setMenuOpen={setMenuOpen}/>

      <div className="content">

        <button
          className="toggle-mode"
          onClick={() => setDarkMode(prev => !prev)}
        >
          {darkMode ? "Light Mode" : "Dark Mode"}
        </button>

        <h1>CKB Node Manager</h1>
          <h2>Select a CKB Net</h2>
            <h3>Status: {status}</h3>
            <div className="network-select">
              {["mainnet", "testnet", "devnet"].map((net) => (
               <button
                 key={net}
                className={network === net ? "active" : ""}
                onClick={() => setNetwork(net)}
                >
                {net}
              </button>
              ))}
            </div>

          <div className="button-group">
            <button onClick={startNode}>Start Node</button>
            <button onClick={stopNode}>Stop Node</button>
          </div>

        {tab === "node" && <NodeInfo data={nodeInfo} header={header} npeers={npeers} />}
        {tab === "network" && <Network peers={peers} />}
        {tab === "blockchain" && <Blockchain header={header} />}
        {tab === "sync" && <SyncStatus header={header} />}

        <PeersChart data={peersData} />

      </div>

    </div>
  );
}