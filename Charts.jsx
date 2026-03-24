import { LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid, ResponsiveContainer, BarChart, Bar, AreaChart, Area } from 'recharts';

export function NodeHeightChart({ data }) {
  // data = [{ time: '10:00', height: 100 }, ...]
  return (
    <div className="card">
      <h2>Node Height Verlauf</h2>
      <ResponsiveContainer width="100%" height={250}>
        <LineChart data={data}>
          <CartesianGrid stroke="#eee" strokeDasharray="5 5" />
          <XAxis dataKey="time" />
          <YAxis />
          <Tooltip />
          <Line type="monotone" dataKey="height" stroke="#4da6ff" strokeWidth={2} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

export function PeersChart({ data }) {
  // data = [{ time: '10:00', peers: 5 }, ...]
  return (
    <div className="card">
      <h2>Peers</h2>
      <ResponsiveContainer width="100%" height={250}>
        <BarChart data={data}>
          <CartesianGrid stroke="#eee" strokeDasharray="5 5" />
          <XAxis dataKey="time" />
          <YAxis />
          <Tooltip />
          <Bar dataKey="peers" fill="#4da6ff" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export function SyncProgressChart({ progress }) {
  const data = [
    { name: "Sync", value: progress },
  ];

  return (
    <div className="card">
      <h2>Sync Progress</h2>

      <ResponsiveContainer width="100%" height={80}>
        <BarChart data={data} layout="vertical">
          <XAxis type="number" domain={[0, 100]} hide />
          
          <Tooltip />

          <Bar
            dataKey="value"
            fill="#4da6ff"
            radius={[10, 10, 10, 10]}
            barSize={30}
          />
        </BarChart>
      </ResponsiveContainer>

      <p style={{ textAlign: "center", marginTop: "10px" }}>
        {progress}%
      </p>
    </div>
  );
}

