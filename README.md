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
