export default function Network({ peers }) {

  if (!peers) return <p>Loading...</p>;

  return (
    <div className="table-wrapper">
      <h2>🌐 Netzwerk</h2>

      <table style={{ width: "100%", borderCollapse: "collapse" }}>

        <thead>
          <tr style={{ background: "#222", color: "#fff" }}>
            <th>Node</th>
            <th>IP</th>
            <th>Version</th>
            <th>Type</th>
            <th>Height</th>
            <th>Status</th>
          </tr>
        </thead>

        <tbody>

          {peers.map(peer => {

            /*const heightHex = peer?.sync_state?.best_known_header_number;

            const height = heightHex
              ? parseInt(heightHex, 16)
              : null;*/

            return (
              <tr key={peer.node_id} style={{ borderBottom: "1px solid #ddd" }}>

                {/* Node ID */}
                <td title={peer.node_id}>
                  {peer.node_id.slice(0, 10)}...

                  <button
                    style={{ marginLeft: "5px" }}
                    onClick={() => navigator.clipboard.writeText(peer.node_id)}
                  >
                    📋
                  </button>
                </td>

                {/* IP */}
                <td>
                  {peer.ip}
                </td>

                {/* Version */}
                <td>{peer.version}</td>

                {/* Type */}
                <td>
                  <span style={{
                    padding: "4px 8px",
                    borderRadius: "8px",
                    background: peer.is_outbound ? "#4caf50" : "#2196f3",
                    color: "#fff"
                  }}>
                    {peer.type ? "Outbound" : "Inbound"}
                  </span>
                </td>

                {/* Height */}
                <td>
                  {peer.height ? peer.height : "-"}
                </td>

                {/* Status */}
                <td>
                  <span style={{
                    color: peer.height ? "limegreen" : "gray"
                  }}>
                    {peer.height ? "● Sync" : "● Idle"}
                  </span>
                </td>

              </tr>
            );
          })}

        </tbody>

      </table>

    </div>
  );
}