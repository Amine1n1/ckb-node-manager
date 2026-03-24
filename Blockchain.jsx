 export default function Blockchain({ header }) {

  if (!header) return <p>Loading...</p>;

  return (
    <div className="card">

      <h2>Blockchain</h2>

      <p>Block Number: {parseInt(header.blockNumber,16)}</p>
      <p style={{ wordBreak: "break-word" }}>Hash: {header.tipHash}</p>
      <p>Epoch: {header.epoch}</p>
      <p>Timestamp: {parseInt(header.timestamp,16)}</p>
      <p style={{ wordBreak: "break-word" }}>dao: {header.dao}</p>

    </div>
  );
}