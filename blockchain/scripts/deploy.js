const fs = require("fs");
const path = require("path");
const hre = require("hardhat");
const { ethers } = hre;

async function main() {
  const [admin, verifier] = await ethers.getSigners();

  // ── 1. Deploy ULSAGreenCredit (ERC-20 token) ────────────────────────────────
  const ULSAGreenCredit = await ethers.getContractFactory("ULSAGreenCredit");
  const ugc = await ULSAGreenCredit.deploy(admin.address);
  await ugc.waitForDeployment();
  const ugcAddress = await ugc.getAddress();

  // ── 2. Deploy UGC_Treasury (multi-sig treasury) ─────────────────────────────
  const UGC_Treasury = await ethers.getContractFactory("UGC_Treasury");
  const treasury = await UGC_Treasury.deploy(ugcAddress, [admin.address, verifier.address], 2);
  await treasury.waitForDeployment();
  const treasuryAddress = await treasury.getAddress();

  // ── 3. Deploy CreditProvenance (truy xuất nguồn gốc) ───────────────────────
  const CreditProvenance = await ethers.getContractFactory("CreditProvenance");
  const provenance = await CreditProvenance.deploy(admin.address);
  await provenance.waitForDeployment();
  const provenanceAddress = await provenance.getAddress();

  // Grant RECORDER_ROLE to verifier wallet so backend (verifier signer) can record
  const recorderRole = await provenance.RECORDER_ROLE();
  await (await provenance.grantRole(recorderRole, verifier.address)).wait();

  // ── 4. Grant roles on ULSAGreenCredit ───────────────────────────────────────
  const issuerRole = await ugc.ISSUER_ROLE();
  const burnerRole = await ugc.BURNER_ROLE();
  await (await ugc.grantRole(issuerRole, verifier.address)).wait();
  await (await ugc.grantRole(issuerRole, treasuryAddress)).wait();
  await (await ugc.grantRole(burnerRole, treasuryAddress)).wait();

  // ── 5. Write ABI files & contracts.json ─────────────────────────────────────
  const network = await ethers.provider.getNetwork();
  const chainId = Number(network.chainId);

  const outDir = path.join(__dirname, "../../shared");
  fs.mkdirSync(outDir, { recursive: true });

  // ULSAGreenCredit ABI
  const ugcAbi = (await hre.artifacts.readArtifact("ULSAGreenCredit")).abi;
  fs.writeFileSync(path.join(outDir, "ULSAGreenCredit.abi.json"), JSON.stringify(ugcAbi, null, 2));

  // UGC_Treasury ABI
  const treasuryAbi = (await hre.artifacts.readArtifact("UGC_Treasury")).abi;
  fs.writeFileSync(path.join(outDir, "UGC_Treasury.abi.json"), JSON.stringify(treasuryAbi, null, 2));

  // CreditProvenance ABI
  const provenanceAbi = (await hre.artifacts.readArtifact("CreditProvenance")).abi;
  fs.writeFileSync(path.join(outDir, "CreditProvenance.abi.json"), JSON.stringify(provenanceAbi, null, 2));

  // contracts.json
  const contractsPath = path.join(outDir, "contracts.json");
  fs.writeFileSync(
    contractsPath,
    JSON.stringify(
      {
        chainId,
        rpcUrl: "http://localhost:8545",
        contracts: {
          ULSAGreenCredit:  { address: ugcAddress },
          UGC_Treasury:     { address: treasuryAddress },
          CreditProvenance: { address: provenanceAddress }
        },
        accounts: {
          admin:    admin.address,
          verifier: verifier.address
        },
        generatedAt: new Date().toISOString()
      },
      null,
      2
    )
  );

  console.log("✅ Deployed ULSAGreenCredit  :", ugcAddress);
  console.log("✅ Deployed UGC_Treasury     :", treasuryAddress);
  console.log("✅ Deployed CreditProvenance :", provenanceAddress);
  console.log("✅ contracts.json saved to   :", contractsPath);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
