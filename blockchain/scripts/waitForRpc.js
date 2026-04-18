const url = process.argv[2] || "http://127.0.0.1:8545";

async function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

async function main() {
  const body = {
    jsonrpc: "2.0",
    id: 1,
    method: "eth_chainId",
    params: []
  };

  for (let i = 0; i < 60; i++) {
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body)
      });

      if (res.ok) {
        const json = await res.json();
        if (json && json.result) {
          console.log("RPC ready:", json.result);
          process.exit(0);
        }
      }
    } catch (e) {
      // ignore
    }
    await sleep(1000);
  }

  console.error("RPC not ready after 60s:", url);
  process.exit(1);
}

main();
