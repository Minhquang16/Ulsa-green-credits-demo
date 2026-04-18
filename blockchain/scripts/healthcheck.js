(async () => {
  try {
    const res = await fetch("http://127.0.0.1:8545", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "eth_blockNumber", params: [] })
    });
    if (!res.ok) process.exit(1);
    const json = await res.json();
    if (!json || !json.result) process.exit(1);
    process.exit(0);
  } catch (e) {
    process.exit(1);
  }
})();
