import { mkdirSync, rmSync } from "node:fs"
import { posix, resolve } from "node:path"
import { randomBytes } from "node:crypto"
import { spawnSync } from "node:child_process"

const root = resolve(import.meta.dirname, "..")
const dist = resolve(root, "dist")
const deployDir = resolve(root, ".deploy")
const host = process.env.DEPLOY_HOST ?? "root@blog.yllhwa.com"
const remoteRoot = process.env.DEPLOY_ROOT ?? "/www/wwwroot/blog.yllhwa.com"
const id = `${new Date().toISOString().replace(/\D/g, "").slice(0, 14)}-${randomBytes(3).toString("hex")}`
const archive = resolve(deployDir, `yllhwa-blog-${id}.tar.gz`)
const remoteArchive = `/tmp/yllhwa-blog-${id}.tar.gz`
const remoteStage = `${posix.dirname(remoteRoot)}/.yllhwa-blog-stage-${id}`
const remoteRestore = `${posix.dirname(remoteRoot)}/.yllhwa-blog-restore-${id}`
const remoteBackup = `/www/backups/yllhwa-blog-${id}.tar.gz`

if (!/^[\w.-]+@[\w.-]+$/.test(host))
  throw new Error(`Unsafe DEPLOY_HOST: ${host}`)
for (const path of [
  remoteRoot,
  remoteArchive,
  remoteStage,
  remoteRestore,
  remoteBackup,
]) {
  if (!/^\/[\w./-]+$/.test(path)) throw new Error(`Unsafe remote path: ${path}`)
}

const run = (command, args) => {
  console.log(`> ${command} ${args.join(" ")}`)
  const result = spawnSync(command, args, { cwd: root, stdio: "inherit" })
  if (result.error) throw result.error
  if (result.status !== 0)
    throw new Error(`${command} exited with status ${result.status}`)
}

const quote = (value) => `'${value}'`
const remote = `
set -eu
root=${quote(remoteRoot)}
archive=${quote(remoteArchive)}
stage=${quote(remoteStage)}
restore=${quote(remoteRestore)}
backup=${quote(remoteBackup)}

cleanup() {
  rm -rf -- "$stage" "$restore"
  rm -f -- "$archive"
}
trap cleanup EXIT

mkdir -p "$stage" "$(dirname "$backup")"
tar -xzf "$archive" -C "$stage"
test -s "$stage/index.html"
test -s "$stage/project/index.html"
test -s "$stage/about/index.html"
nginx -t

mkdir -p "$root"
tar -czf "$backup" -C "$root" .

if ! rsync --archive --delete --delay-updates "$stage/" "$root/" || \
   ! curl -fsS --resolve blog.yllhwa.com:443:127.0.0.1 https://blog.yllhwa.com/ >/dev/null; then
  echo "Deployment validation failed; restoring $backup" >&2
  mkdir -p "$restore"
  tar -xzf "$backup" -C "$restore"
  rsync --archive --delete "$restore/" "$root/"
  exit 1
fi

echo "Deployed successfully. Backup: $backup"
`

mkdirSync(deployDir, { recursive: true })
try {
  run("tar", ["-czf", archive, "-C", dist, "."])
  run("scp", [archive, `${host}:${remoteArchive}`])
  run("ssh", [host, remote])
} finally {
  rmSync(archive, { force: true })
}
