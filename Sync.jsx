import {SyncProgressChart} from './Charts';

export default function SyncStatus({ header }) {

  if (!header) return <p>Loading...</p>;

  const progress =
    Math.floor((header.blockHeight / header.networkHeight) * 100);

  return (
    <div>

      <h2>Sync Status</h2>

      <SyncProgressChart progress={header.progress} />

      <p>
        Remaining Blocks: {header.networkHeight - header.blockHeight}
      </p>

    </div>
  );
}