// Keep this in sync with package.json engines and the Node 24 CI jobs.
const [major, minor, patch] = process.versions.node.split(".").map(Number);
const supported =
  (major === 22 && (minor > 22 || (minor === 22 && patch >= 2))) ||
  (major === 24 && minor >= 15) ||
  major >= 26;

if (!supported) {
  console.error(
    `J Pilates requires Node 22.22.2+, Node 24.15+ (recommended), or Node 26+. Current: ${process.version}. Install Node 24 LTS, reopen your terminal, then run npm ci in src_FE.`,
  );
  process.exitCode = 1;
} else {
  console.log(`Runtime OK: Node ${process.version}`);
}
