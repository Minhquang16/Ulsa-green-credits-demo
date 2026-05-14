const fs = require("fs");
const path = require("path");
const hre = require("hardhat");
const { ethers } = hre;

async function main() {
  const [admin, verifier] = await ethers.getSigners();

  const ULSAGreenCredit = await ethers.getContractFactory("ULSAGreenCredit");
  const ugc = await ULSAGreenCredit.deploy(admin.address);
  await ugc.waitForDeployment();

  const UGC_Treasury = await ethers.getContractFactory("UGC_Treasury");
  // using admin and verifier as the 2 multi-sig admins with threshold 2
  const treasury = await UGC_Treasury.deploy(await ugc.getAddress(), [admin.address, verifier.address], 2);
  await treasury.waitForDeployment();
  const treasuryAddress = await treasury.getAddress();

  const issuerRole = await ugc.ISSUER_ROLE();
  const burnerRole = await ugc.BURNER_ROLE();
  await (await ugc.grantRole(issuerRole, verifier.address)).wait();
  await (await ugc.grantRole(issuerRole, treasuryAddress)).wait();
  await (await ugc.grantRole(burnerRole, treasuryAddress)).wait();

  const network = await ethers.provider.getNetwork();
  const chainId = Number(network.chainId);
  const address = await ugc.getAddress();

  const outDir = path.join(__dirname, "../../shared");
  fs.mkdirSync(outDir, { recursive: true });

  const abiPath = path.join(outDir, "ULSAGreenCredit.abi.json");
  const artifact = await hre.artifacts.readArtifact("ULSAGreenCredit");
  fs.writeFileSync(abiPath, JSON.stringify(artifact.abi, null, 2));

  const treasuryAbiPath = path.join(outDir, "UGC_Treasury.abi.json");
  const treasuryArtifact = await hre.artifacts.readArtifact("UGC_Treasury");
  fs.writeFileSync(treasuryAbiPath, JSON.stringify(treasuryArtifact.abi, null, 2));

  const contractsPath = path.join(outDir, "contracts.json");
  fs.writeFileSync(
    contractsPath,
    JSON.stringify(
      {
        chainId,
        rpcUrl: "http://localhost:8545",
        contracts: {
          ULSAGreenCredit: { address },
          UGC_Treasury: { address: treasuryAddress }
        },
        accounts: {
          admin: admin.address,
          verifier: verifier.address
        },
        generatedAt: new Date().toISOString()
      },
      null,
      2
    )
  );

  console.log(" Deployed ULSAGreenCredit to:", address);
  console.log(" Saved:", contractsPath);
  console.log(" Saved ABI:", abiPath);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
