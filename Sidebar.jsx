import { useState } from "react";

export default function Sidebar({ tab, setTab, menuOpen, setMenuOpen}) {

  return (

    <div className={`sidebar ${menuOpen ? "open" : ""}`}>

      <h2>CKB Manager</h2>

      <ul style={{ listStyle: "none", padding: 0 }}>

        <li
          className={tab === "node" ? "active" : ""}
          onClick={() => { setTab("node");setMenuOpen(false);}}
        >
          🧠 Node Info
        </li>

        <li
          className={tab === "network" ? "active" : ""}
          onClick={() => {setTab("network"); setMenuOpen(false);}}
        >
          🌐 Netzwerk
        </li>

        <li
          className={tab === "blockchain" ? "active" : ""}
          onClick={() => { setTab("blockchain"); setMenuOpen(false);}}
        >
          ⛓️ Blockchain
        </li>

        <li
          className={tab === "sync" ? "active" : ""}
          onClick={() => { setTab("sync"); setMenuOpen(false);}}
        >
          🔄 Sync
        </li>

      </ul>
    </div>
  );
}