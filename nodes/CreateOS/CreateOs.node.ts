import type {
	IExecuteFunctions,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
} from 'n8n-workflow';
import { NodeApiError, NodeConnectionTypes, NodeOperationError } from 'n8n-workflow';

import { getOperationHandler } from './actions';
import { getErrorMessage, getTimeoutMs } from './helpers';
import { isOperationForResource, isResource } from './types';

function ensureError(error: unknown): Error {
	return error instanceof Error ? error : new Error(String(error));
}

export class CreateOs implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'CreateOS',
		name: 'createOs',
		icon: {
			light: 'file:nodeops.png',
			dark: 'file:nodeops.dark.png',
		},
		group: ['transform'],
		version: 1,
		subtitle: '={{ $parameter["operation"] + ": " + $parameter["resource"] }}',
		description: 'Run commands and manage CreateOS sandboxes',
		defaults: {
			name: 'CreateOS',
		},
		usableAsTool: true,
		inputs: [NodeConnectionTypes.Main],
		outputs: [NodeConnectionTypes.Main],
		credentials: [
			{
				name: 'createOsApi',
				required: true,
			},
		],
		properties: [
			{
				displayName: 'Resource',
				name: 'resource',
				type: 'options',
				noDataExpression: true,
				options: [
					{ name: 'Code', value: 'code' },
					{ name: 'Disk', value: 'disk' },
					{ name: 'File', value: 'file' },
					{ name: 'Network', value: 'network' },
					{ name: 'Sandbox', value: 'sandbox' },
					{ name: 'System', value: 'system' },
					{ name: 'Template', value: 'template' },
				],
				default: 'code',
			},
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				displayOptions: { show: { resource: ['system'] } },
				options: [
					{ name: 'List Rootfs', value: 'listRootfs', action: 'List rootfs catalog' },
					{ name: 'List Shapes', value: 'listShapes', action: 'List sandbox shapes' },
					{ name: 'Whoami', value: 'whoami', action: 'Get authenticated caller' },
				],
				default: 'whoami',
			},
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				displayOptions: { show: { resource: ['sandbox'] } },
				options: [
					{ name: 'Bandwidth', value: 'bandwidth', action: 'Get sandbox bandwidth' },
					{ name: 'Create', value: 'create', action: 'Create a sandbox' },
					{ name: 'Destroy', value: 'destroy', action: 'Destroy a sandbox' },
					{ name: 'Fork', value: 'fork', action: 'Fork a paused sandbox' },
					{ name: 'Get', value: 'get', action: 'Get a sandbox' },
					{ name: 'Get By IP', value: 'getByIp', action: 'Get a sandbox by IP' },
					{ name: 'Get Many', value: 'getMany', action: 'List sandboxes' },
					{ name: 'Metrics', value: 'metrics', action: 'Get sandbox metrics' },
					{ name: 'Patch', value: 'patch', action: 'Patch sandbox settings' },
					{ name: 'Pause', value: 'pause', action: 'Pause a sandbox' },
					{ name: 'Recharge Bandwidth', value: 'rechargeBandwidth', action: 'Recharge bandwidth' },
					{ name: 'Resize', value: 'resize', action: 'Resize sandbox disk' },
					{ name: 'Resume', value: 'resume', action: 'Resume a sandbox' },
				],
				default: 'getMany',
			},
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				displayOptions: { show: { resource: ['code'] } },
				options: [{ name: 'Run Command', value: 'runCommand', action: 'Run a shell command' }],
				default: 'runCommand',
			},
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				displayOptions: { show: { resource: ['file'] } },
				options: [
					{ name: 'Download', value: 'download', action: 'Download a file' },
					{ name: 'Upload', value: 'upload', action: 'Upload a file' },
				],
				default: 'download',
			},
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				displayOptions: { show: { resource: ['template'] } },
				options: [
					{ name: 'Create', value: 'create', action: 'Create a template' },
					{ name: 'Delete', value: 'delete', action: 'Delete a template' },
					{ name: 'Get', value: 'get', action: 'Get a template' },
					{ name: 'Get Logs', value: 'logs', action: 'Get template logs' },
					{ name: 'Get Many', value: 'getMany', action: 'List templates' },
				],
				default: 'getMany',
			},
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				displayOptions: { show: { resource: ['network'] } },
				options: [
					{ name: 'Attach', value: 'attach', action: 'Attach a sandbox to a network' },
					{ name: 'Create', value: 'create', action: 'Create a network' },
					{ name: 'Delete', value: 'delete', action: 'Delete a network' },
					{ name: 'Detach', value: 'detach', action: 'Detach a sandbox from a network' },
					{ name: 'Get', value: 'get', action: 'Get a network' },
					{ name: 'Get Many', value: 'getMany', action: 'List networks' },
				],
				default: 'getMany',
			},
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				displayOptions: { show: { resource: ['disk'] } },
				options: [
					{ name: 'Attach', value: 'attach', action: 'Attach a disk to a sandbox' },
					{ name: 'Create', value: 'create', action: 'Create a disk' },
					{ name: 'Delete', value: 'delete', action: 'Delete a disk' },
					{ name: 'Detach', value: 'detach', action: 'Detach a disk from a sandbox' },
					{ name: 'Get', value: 'get', action: 'Get a disk' },
					{ name: 'Get Many', value: 'getMany', action: 'List disks' },
					{ name: 'List Attachments', value: 'listAttachments', action: 'List sandbox disk attachments' },
				],
				default: 'getMany',
			},
			{
				displayName: 'Sandbox ID',
				name: 'sandboxId',
				type: 'string',
				required: true,
				default: '',
				displayOptions: {
					show: {
						resource: ['sandbox', 'file', 'network', 'disk'],
						operation: ['get', 'destroy', 'pause', 'resume', 'fork', 'patch', 'metrics', 'bandwidth', 'rechargeBandwidth', 'resize', 'download', 'upload', 'attach', 'detach', 'listAttachments'],
					},
				},
			},
			{
				displayName: 'Sandbox',
				name: 'sandboxMode',
				type: 'options',
				noDataExpression: true,
				options: [
					{ name: 'Create On Demand', value: 'create' },
					{ name: 'Use Existing Sandbox', value: 'existing' },
				],
				default: 'create',
				displayOptions: { show: { resource: ['code'], operation: ['runCommand'] } },
			},
			{
				displayName: 'Sandbox ID',
				name: 'sandboxId',
				type: 'string',
				required: true,
				default: '',
				displayOptions: {
					show: {
						resource: ['code'],
						operation: ['runCommand'],
						sandboxMode: ['existing'],
					},
				},
			},
			{
				displayName: 'IP Address',
				name: 'ip',
				type: 'string',
				required: true,
				default: '',
				displayOptions: { show: { resource: ['sandbox'], operation: ['getByIp'] } },
			},
			{
				displayName: 'Shape',
				name: 'shape',
				type: 'string',
				required: true,
				default: 's-1vcpu-256mb',
				displayOptions: { show: { resource: ['sandbox'], operation: ['create'] } },
			},
			{
				displayName: 'Rootfs',
				name: 'rootfs',
				type: 'string',
				default: 'devbox:1',
				displayOptions: { show: { resource: ['sandbox'], operation: ['create'] } },
			},
			{
				displayName: 'Sandbox Name',
				name: 'sandboxName',
				type: 'string',
				default: '',
				displayOptions: { show: { resource: ['sandbox'], operation: ['create'] } },
			},
			{
				displayName: 'Disk Size MiB',
				name: 'diskMib',
				type: 'options',
				options: [
					{ name: '10 GB', value: 10240 },
					{ name: '20 GB', value: 20480 },
					{ name: '30 GB', value: 30720 },
					{ name: '40 GB', value: 40960 },
					{ name: '50 GB', value: 51200 },
					{ name: '60 GB', value: 61440 },
				],
				default: 10240,
				displayOptions: { show: { resource: ['sandbox'], operation: ['create'] } },
			},
			{
				displayName: 'Disk Size MiB',
				name: 'diskMib',
				type: 'options',
				options: [
					{ name: '10 GB', value: 10240 },
					{ name: '20 GB', value: 20480 },
					{ name: '30 GB', value: 30720 },
					{ name: '40 GB', value: 40960 },
					{ name: '50 GB', value: 51200 },
					{ name: '60 GB', value: 61440 },
				],
				default: 20480,
				displayOptions: { show: { resource: ['sandbox'], operation: ['resize'] } },
			},
			{
				displayName: 'Ingress Enabled',
				name: 'ingressEnabled',
				type: 'boolean',
				default: false,
				displayOptions: { show: { resource: ['sandbox'], operation: ['create', 'fork', 'patch'] } },
			},
			{
				displayName: 'Auto Pause After Seconds',
				name: 'autoPauseAfterSeconds',
				type: 'number',
				typeOptions: { minValue: 0 },
				default: 0,
				description: '0 leaves auto-pause unset',
				displayOptions: { show: { resource: ['sandbox'], operation: ['create', 'patch'] } },
			},
			{
				displayName: 'Disable Auto Pause',
				name: 'disableAutoPause',
				type: 'boolean',
				default: false,
				displayOptions: { show: { resource: ['sandbox'], operation: ['patch'] } },
			},
			{
				displayName: 'Start Paused',
				name: 'startPaused',
				type: 'boolean',
				default: false,
				displayOptions: { show: { resource: ['sandbox'], operation: ['fork'] } },
			},
			{
				displayName: 'GiB',
				name: 'gib',
				type: 'number',
				typeOptions: { minValue: 0 },
				default: 1,
				displayOptions: { show: { resource: ['sandbox'], operation: ['rechargeBandwidth'] } },
			},
			{
				displayName: 'Environment Variables',
				name: 'envJson',
				type: 'json',
				default: '{}',
				displayOptions: { show: { resource: ['sandbox', 'code'], operation: ['create', 'fork', 'runCommand'] } },
			},
			{
				displayName: 'Create Sandbox Options',
				name: 'createSandboxOptions',
				type: 'notice',
				default: '',
				displayOptions: { show: { resource: ['code'], operation: ['runCommand'], sandboxMode: ['create'] } },
			},
			{
				displayName: 'Shape',
				name: 'codeShape',
				type: 'string',
				required: true,
				default: 's-1vcpu-256mb',
				displayOptions: { show: { resource: ['code'], operation: ['runCommand'], sandboxMode: ['create'] } },
			},
			{
				displayName: 'Rootfs',
				name: 'codeRootfs',
				type: 'string',
				default: 'devbox:1',
				displayOptions: { show: { resource: ['code'], operation: ['runCommand'], sandboxMode: ['create'] } },
			},
			{
				displayName: 'Sandbox Name',
				name: 'codeSandboxName',
				type: 'string',
				default: '',
				displayOptions: { show: { resource: ['code'], operation: ['runCommand'], sandboxMode: ['create'] } },
			},
			{
				displayName: 'Disk Size MiB',
				name: 'codeDiskMib',
				type: 'options',
				options: [
					{ name: '10 GB', value: 10240 },
					{ name: '20 GB', value: 20480 },
					{ name: '30 GB', value: 30720 },
					{ name: '40 GB', value: 40960 },
					{ name: '50 GB', value: 51200 },
					{ name: '60 GB', value: 61440 },
				],
				default: 10240,
				displayOptions: { show: { resource: ['code'], operation: ['runCommand'], sandboxMode: ['create'] } },
			},
			{
				displayName: 'Ingress Enabled',
				name: 'codeIngressEnabled',
				type: 'boolean',
				default: false,
				displayOptions: { show: { resource: ['code'], operation: ['runCommand'], sandboxMode: ['create'] } },
			},
			{
				displayName: 'Auto Pause After Seconds',
				name: 'codeAutoPauseAfterSeconds',
				type: 'number',
				typeOptions: { minValue: 0 },
				default: 0,
				description: '0 leaves auto-pause unset',
				displayOptions: { show: { resource: ['code'], operation: ['runCommand'], sandboxMode: ['create'] } },
			},
			{
				displayName: 'Egress',
				name: 'egressJson',
				type: 'json',
				default: '[]',
				placeholder: '["pypi.org", "1.1.1.1:53"]',
				displayOptions: { show: { resource: ['sandbox'], operation: ['create', 'fork'] } },
			},
			{
				displayName: 'Egress',
				name: 'codeEgressJson',
				type: 'json',
				default: '[]',
				placeholder: '["pypi.org", "1.1.1.1:53"]',
				displayOptions: { show: { resource: ['code'], operation: ['runCommand'], sandboxMode: ['create'] } },
			},
			{
				displayName: 'Networks',
				name: 'networksJson',
				type: 'json',
				default: '[]',
				placeholder: '[{"ID":"backend"}]',
				displayOptions: { show: { resource: ['sandbox'], operation: ['create'] } },
			},
			{
				displayName: 'Networks',
				name: 'codeNetworksJson',
				type: 'json',
				default: '[]',
				placeholder: '[{"ID":"backend"}]',
				displayOptions: { show: { resource: ['code'], operation: ['runCommand'], sandboxMode: ['create'] } },
			},
			{
				displayName: 'Disks',
				name: 'disksJson',
				type: 'json',
				default: '[]',
				placeholder: '[{"disk_id":"my-data","mount_path":"/mnt/data"}]',
				displayOptions: { show: { resource: ['sandbox'], operation: ['create'] } },
			},
			{
				displayName: 'Disks',
				name: 'codeDisksJson',
				type: 'json',
				default: '[]',
				placeholder: '[{"disk_id":"my-data","mount_path":"/mnt/data"}]',
				displayOptions: { show: { resource: ['code'], operation: ['runCommand'], sandboxMode: ['create'] } },
			},
			{
				displayName: 'Destroy Sandbox After Run',
				name: 'destroyAfterRun',
				type: 'boolean',
				default: true,
				description: 'Whether to destroy the sandbox after running the command',
				displayOptions: { show: { resource: ['code'], operation: ['runCommand'], sandboxMode: ['create'] } },
			},
			{
				displayName: 'Command',
				name: 'command',
				type: 'string',
				required: true,
				default: '',
				typeOptions: { rows: 4 },
				displayOptions: { show: { resource: ['code'], operation: ['runCommand'] } },
			},
			{
				displayName: 'Stdin',
				name: 'stdin',
				type: 'string',
				default: '',
				typeOptions: { rows: 3 },
				displayOptions: { show: { resource: ['code'], operation: ['runCommand'] } },
			},
			{
				displayName: 'Remote Path',
				name: 'remotePath',
				type: 'string',
				required: true,
				default: '',
				placeholder: '/root/file.txt',
				displayOptions: { show: { resource: ['file'], operation: ['download', 'upload'] } },
			},
			{
				displayName: 'Binary Field',
				name: 'binaryPropertyName',
				type: 'string',
				required: true,
				default: 'data',
				displayOptions: { show: { resource: ['file'], operation: ['download', 'upload'] } },
			},
			{
				displayName: 'Template Name',
				name: 'templateName',
				type: 'string',
				required: true,
				default: '',
				displayOptions: { show: { resource: ['template'], operation: ['create'] } },
			},
			{
				displayName: 'Dockerfile',
				name: 'dockerfile',
				type: 'string',
				required: true,
				default: '',
				typeOptions: { rows: 12 },
				displayOptions: { show: { resource: ['template'], operation: ['create'] } },
			},
			{
				displayName: 'Template ID or Name',
				name: 'templateId',
				type: 'string',
				required: true,
				default: '',
				displayOptions: { show: { resource: ['template'], operation: ['get', 'delete', 'logs'] } },
			},
			{
				displayName: 'Include',
				name: 'include',
				type: 'options',
				options: [{ name: 'Dockerfile', value: 'dockerfile' }, { name: 'Nothing', value: '' }],
				default: '',
				displayOptions: { show: { resource: ['template'], operation: ['get'] } },
			},
			{
				displayName: 'Log Limit',
				name: 'logLimit',
				type: 'string',
				default: '',
				displayOptions: { show: { resource: ['template'], operation: ['logs'] } },
			},
			{
				displayName: 'Network Name',
				name: 'networkName',
				type: 'string',
				required: true,
				default: '',
				displayOptions: { show: { resource: ['network'], operation: ['create'] } },
			},
			{
				displayName: 'Network ID or Name',
				name: 'networkId',
				type: 'string',
				required: true,
				default: '',
				displayOptions: { show: { resource: ['network'], operation: ['get', 'delete', 'attach', 'detach'] } },
			},
			{
				displayName: 'Disk Name',
				name: 'diskName',
				type: 'string',
				required: true,
				default: '',
				displayOptions: { show: { resource: ['disk'], operation: ['create'] } },
			},
			{
				displayName: 'Disk Config',
				name: 'diskConfigJson',
				type: 'json',
				default: '{"bucket":"","endpoint":"","region":"auto","use_path_style":true}',
				displayOptions: { show: { resource: ['disk'], operation: ['create'] } },
			},
			{
				displayName: 'Disk Credentials',
				name: 'diskCredentialsJson',
				type: 'json',
				default: '{"access_key":"","secret_key":""}',
				displayOptions: { show: { resource: ['disk'], operation: ['create'] } },
			},
			{
				displayName: 'Disk ID or Name',
				name: 'diskId',
				type: 'string',
				required: true,
				default: '',
				displayOptions: { show: { resource: ['disk'], operation: ['get', 'delete', 'attach', 'detach'] } },
			},
			{
				displayName: 'Mount Path',
				name: 'mountPath',
				type: 'string',
				required: true,
				default: '/mnt/data',
				displayOptions: { show: { resource: ['disk'], operation: ['attach', 'detach'] } },
			},
			{
				displayName: 'Sub Path',
				name: 'subPath',
				type: 'string',
				default: '',
				displayOptions: { show: { resource: ['disk'], operation: ['attach'] } },
			},
			{
				displayName: 'Status',
				name: 'status',
				type: 'options',
				options: [
					{ name: 'Any', value: '' },
					{ name: 'Creating', value: 'creating' },
					{ name: 'Destroyed', value: 'destroyed' },
					{ name: 'Failed', value: 'failed' },
					{ name: 'Running', value: 'running' },
				],
				default: '',
				displayOptions: { show: { resource: ['sandbox'], operation: ['getMany'] } },
			},
			{
				displayName: 'Limit',
				name: 'limit',
				type: 'number',
				description: 'Max number of results to return',
				typeOptions: { minValue: 1 },
				default: 50,
				displayOptions: { show: { resource: ['sandbox', 'template', 'network', 'disk'], operation: ['getMany'] } },
			},
			{
				displayName: 'Offset',
				name: 'offset',
				type: 'number',
				typeOptions: { minValue: 0 },
				default: 0,
				displayOptions: { show: { resource: ['sandbox', 'template', 'network', 'disk'], operation: ['getMany'] } },
			},
			{
				displayName: 'Timeout',
				name: 'timeoutSeconds',
				type: 'number',
				typeOptions: { minValue: 1 },
				default: 30,
				description: 'Timeout in seconds for the CreateOS operation',
			},
		],
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const credentials = await this.getCredentials('createOsApi');
		const returnData: INodeExecutionData[] = [];

		for (let itemIndex = 0; itemIndex < items.length; itemIndex++) {
			try {
				const rawResource = this.getNodeParameter('resource', itemIndex);
				if (!isResource(rawResource)) {
					throw new NodeOperationError(this.getNode(), `The resource "${rawResource}" is not known`, { itemIndex });
				}

				const rawOperation = this.getNodeParameter('operation', itemIndex);
				if (!isOperationForResource(rawResource, rawOperation)) {
					throw new NodeOperationError(this.getNode(), `The operation "${rawOperation}" is not known for resource "${rawResource}"`, { itemIndex });
				}

				const handler = getOperationHandler(rawResource, rawOperation);
				const itemData = await handler({
					executeFunctions: this,
					credentials,
					itemIndex,
					timeoutMs: getTimeoutMs(this, itemIndex),
				});
				returnData.push(...itemData);
			} catch (error) {
				if (this.continueOnFail()) {
					returnData.push({ json: { error: getErrorMessage(error) }, pairedItem: { item: itemIndex } });
					continue;
				}
				const normalizedError = ensureError(error);
				if (normalizedError instanceof NodeApiError) {
					normalizedError.context.itemIndex = itemIndex;
					throw normalizedError;
				}
				throw new NodeOperationError(this.getNode(), normalizedError, { itemIndex });
			}
		}

		return [returnData];
	}
}
