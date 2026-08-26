import type {
	ICredentialDataDecryptedObject,
	IExecuteFunctions,
	INodeExecutionData,
} from 'n8n-workflow';

export const RESOURCE_OPERATIONS = {
	system: ['whoami', 'listShapes', 'listRootfs'],
	sandbox: [
		'create',
		'get',
		'getByIp',
		'getMany',
		'destroy',
		'pause',
		'resume',
		'fork',
		'patch',
		'metrics',
		'bandwidth',
		'rechargeBandwidth',
		'resize',
	],
	code: ['runCommand'],
	file: ['download', 'upload'],
	template: ['create', 'get', 'getMany', 'delete', 'logs'],
	network: ['create', 'get', 'getMany', 'delete', 'attach', 'detach'],
	disk: ['create', 'get', 'getMany', 'delete', 'listAttachments', 'attach', 'detach'],
} as const;

export type Resource = keyof typeof RESOURCE_OPERATIONS;
export type OperationForResource<R extends Resource> = (typeof RESOURCE_OPERATIONS)[R][number];
export type Operation = OperationForResource<Resource>;

export interface CreateOSOperationContext {
	executeFunctions: IExecuteFunctions;
	credentials: ICredentialDataDecryptedObject;
	itemIndex: number;
	timeoutMs: number;
}

export type CreateOSOperationHandler = (
	context: CreateOSOperationContext,
) => Promise<INodeExecutionData[]>;

export function isResource(value: unknown): value is Resource {
	return typeof value === 'string' && value in RESOURCE_OPERATIONS;
}

export function isOperationForResource<R extends Resource>(
	resource: R,
	value: unknown,
): value is OperationForResource<R> {
	return (
		typeof value === 'string' &&
		RESOURCE_OPERATIONS[resource].some((operation) => operation === value)
	);
}
