# @createos/n8n-nodes-createos

n8n community node for CreateOS sandboxes.

Use this package to create and manage CreateOS sandboxes, run shell commands, transfer files, and manage templates, networks, and disks from n8n workflows.

## Install

In n8n, open **Settings > Community nodes**, then install:

For local development:

```bash
pnpm install
pnpm build
```

## Development

Install dependencies and build the node:

```bash
pnpm install
pnpm lint
pnpm typecheck
pnpm build
```

Run n8n in Docker with this local package mounted as a community node:

```bash
mkdir -p /tmp/n8n-createos-data

docker run --rm \
  --name n8n-createos-test \
  -p 5678:5678 \
  -e N8N_SECURE_COOKIE=false \
  -e N8N_DIAGNOSTICS_ENABLED=false \
  -e N8N_PERSONALIZATION_ENABLED=false \
  -e N8N_ENFORCE_SETTINGS_FILE_PERMISSIONS=false \
  -e N8N_UNVERIFIED_PACKAGES_ENABLED=true \
  -e N8N_COMMUNITY_PACKAGES_ALLOW_TOOL_USAGE=true \
  -v /tmp/n8n-createos-data:/home/node/.n8n \
  -v "$PWD:/home/node/.n8n/nodes/node_modules/@createos/n8n-nodes-createos:ro" \
  n8nio/n8n:stable
```

Open `http://localhost:5678`, create a **CreateOS API** credential, and set an API key. The node sends the key as `X-Api-Key`.

After changing code, rebuild and restart n8n:

```bash
pnpm build
docker restart n8n-createos-test
```

Useful checks inside the container:

```bash
docker exec n8n-createos-test node -e "const n=require('/home/node/.n8n/nodes/node_modules/@createos/n8n-nodes-createos/dist/nodes/CreateOS/CreateOs.node.js'); console.log(new n.CreateOs().description.displayName)"
docker logs --tail 100 n8n-createos-test
```

### Manual Smoke Tests

Create a workflow with a Webhook trigger, then add the CreateOS node.

Recommended checks:

- **System > Whoami**: verifies credentials.
- **System > List Shapes** and **List Rootfs**: verifies catalog APIs.
- **Code > Run Command** with `Sandbox = Create On Demand` and command `pwd`: creates a temporary sandbox, runs the command, and destroys it.
- **Code > Run Command** with `Sandbox = Use Existing Sandbox`: verifies reuse by sandbox ID.
- **File > Upload**: requires input binary data and an existing sandbox ID.
- **File > Download**: reads a remote file from an existing sandbox into n8n binary data.

For file testing, keep a sandbox alive:

1. Create a sandbox with **Sandbox > Create**.
2. Run a command that writes a file, for example `printf hello >/tmp/hello.txt`.
3. Use **File > Download** with remote path `/tmp/hello.txt`.
4. Use **File > Upload** with an input binary field, then run `ls -l <path>` in the sandbox.
5. Destroy the sandbox when done.

`File` operations are not useful after **Code > Run Command** destroys an on-demand sandbox. Use an existing sandbox ID when you need upload/download steps.

## Credentials

Create a **CreateOS API** credential and set your API token. The default API base URL is:

```text
https://api.sb.createos.sh
```

The credential sends your token as the `X-Api-Key` header.

## Node resources and operations

- System: Whoami, List Shapes, List Rootfs
- Sandbox: Create, Get, Get By IP, Get Many, Destroy, Pause, Resume, Fork, Patch, Metrics, Bandwidth, Recharge Bandwidth, Resize
- Code: Run Command
- File: Upload, Download
- Template: Create, Get, Get Many, Delete, Get Logs
- Network: Create, Get, Get Many, Delete, Attach, Detach
- Disk: Create, Get, Get Many, Delete, List Attachments, Attach, Detach
