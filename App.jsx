import { useState, useEffect } from "react";
import Dashboard from "./Dashboard";
import './App.css'


function App() {

  const [nodeInfo,setNodeInfo] = useState(null);
  const [peers, setPeers] = useState([]);
  const [npeers, setNpeers] = useState([]);
  const [header, setHeader] = useState([]);
  const [network,setNetwork] = useState("mainnet");
  const [status,setStatus] = useState("stopped");

  const startNode = async ()=>{

    const res = await fetch("http://localhost:3001/start",{
      method:"POST",
      headers:{
        "Content-Type":"application/json"
      },
      body:JSON.stringify({network})
    });

    const data = await res.json();

    setStatus(data.status);

  };

  const stopNode = async ()=>{

    const res = await fetch("http://localhost:3001/stop");

    const data = await res.json();

    setStatus(data.status);

  };

  const loadNodeInfo = async ()=>{

    const res = await fetch("http://localhost:3001/nodeinfo");

    const data = await res.json();

    setNodeInfo(data);

  };

    const loadPeers = async ()=>{

    const res = await fetch("http://localhost:3001/peers");

    const data = await res.json();

    setPeers(data.peers);
    setNpeers(data);

  };

  const loadTipHeader = async ()=>{

    const res = await fetch("http://localhost:3001/tipheader");

    const data = await res.json();

    setHeader(data);

  };

  useEffect(()=>{

    const interval = setInterval(loadNodeInfo,5000);

    return ()=>clearInterval(interval);

  },[]);

  useEffect(()=>{

    const interval = setInterval(loadPeers,5000);

    return ()=>clearInterval(interval);

  },[]);

  useEffect(()=>{

    const interval = setInterval(loadTipHeader,5000);

    return ()=>clearInterval(interval);

  },[]);

  return(

    <div style={{padding:40}}>

      <Dashboard
        nodeInfo={nodeInfo}
        peers={peers}
        header={header}
        npeers={npeers}
        status={status}
        network={network}
        setNetwork={setNetwork}
        startNode={startNode}
        stopNode={stopNode}
      />

    </div>

  );

}

export default App;