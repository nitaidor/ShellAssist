const fs = require('node:fs');
const path = require('node:path');

/**
 * Wraps the packaged Linux Electron executable in a POSIX shell script that passes
 * `--no-sandbox` before Chromium's C++ SUID/namespace sandbox initialization runs.
 * This prevents crashes on Ubuntu 24.04+ (AppArmor userns restriction), inside
 * user-mounted AppImages (nosuid), and inside restricted `/dev/shm` sandbox mounts.
 */
module.exports = async function afterPack(context) {
  if (context.electronPlatformName !== 'linux') {
    return;
  }

  const executableName = context.packager.executableName;
  const launcherPath = path.join(context.appOutDir, executableName);
  const binaryPath = path.join(context.appOutDir, `${executableName}.bin`);

  if (!fs.existsSync(launcherPath)) {
    return;
  }

  // Only replace if launcherPath is still the real ELF binary (idempotent across rebuilds)
  const fd = fs.openSync(launcherPath, 'r');
  const magic = Buffer.alloc(4);
  try {
    fs.readSync(fd, magic, 0, 4, 0);
  } finally {
    fs.closeSync(fd);
  }

  const isElf =
    magic[0] === 0x7f &&
    magic[1] === 0x45 &&
    magic[2] === 0x4c &&
    magic[3] === 0x46;

  if (isElf) {
    fs.renameSync(launcherPath, binaryPath);
    fs.chmodSync(binaryPath, 0o755);
  } else if (!fs.existsSync(binaryPath)) {
    return;
  }

  const script = [
    '#!/bin/sh',
    'RESOLVED_SELF="$(readlink -f "$0" 2>/dev/null || printf \'%s\\n\' "$0")"',
    'SCRIPT_DIR="$(cd "$(dirname "$RESOLVED_SELF")" && pwd)"',
    `exec "$SCRIPT_DIR/${executableName}.bin" --no-sandbox "$@"`,
    '',
  ].join('\n');

  fs.writeFileSync(launcherPath, script, { encoding: 'utf8', mode: 0o755 });
  fs.chmodSync(launcherPath, 0o755);
};
