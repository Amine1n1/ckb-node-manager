export default function NodeInfo({ data, header, npeers}) {

  if (!data) return <p>Loading...</p>;

  return (
    <div className="card">

      <h2>Node Info</h2>

      <p>Chain: {data.chain}</p>
      <p>Node Height: {header.blockHeight}</p>
      <p>Network Height: {header.networkHeight}</p>
      <p>Sync Progress: {header.progress}%</p>
      <p>Difficulty: {data.difficulty}</p>
      <p>Epoch: {data.epoch}</p>
      <p>peers: {npeers.total}</p>
      <p>Initial_Block_Download: {data.initialBlockDownload}</p>

    </div>
  );
}