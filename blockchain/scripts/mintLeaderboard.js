const hre = require("hardhat");

async function main() {
  const contractAddress = "0x5FbDB2315678afecb367f032d93F642f64180aa3";
  const UGC = await hre.ethers.getContractFactory("ULSAGreenCredit");
  const ugc = await UGC.attach(contractAddress);

  // Wallets
  const addr1 = "0x9965507D1a55bcC2695C58ba16FB37d819B0A4dc"; // Nguyen Minh Anh
  const addr2 = "0x976EA74026E726554dB657fA54763abd0C3a0aa9"; // Tran Quoc Bao
  const addr3 = "0x14dC79964da2C08b23698B3D3cc7Ca32193d9955"; // Le Gia Huy
  const hoangTruong = "0x90F79bf6EB2c4f870365E785982E1f101E93b906"; // Hoang Truong

  const mintRoles = [
    { addr: addr1, amount: 560 },
    { addr: addr2, amount: 540 },
    { addr: addr3, amount: 520 },
    { addr: hoangTruong, amount: 320 },
  ];

  for (let m of mintRoles) {
    try {
      const ref = hre.ethers.encodeBytes32String("init");
      const tx = await ugc.issue(m.addr, m.amount, ref, ref);
      await tx.wait();
      console.log(`Minted ${m.amount} to ${m.addr}`);
    } catch (e) {
      console.error(`Error minting to ${m.addr}: ${e.message}`);
    }
  }
}

main().catch(console.error);
