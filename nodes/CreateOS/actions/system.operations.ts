import type { IDataObject } from 'n8n-workflow';

import { apiRequest } from '../client';
import { toOperationResult } from '../helpers';
import type { CreateOSOperationContext } from '../types';

function connectionFrom(context: CreateOSOperationContext) {
	return {
		executeFunctions: context.executeFunctions,
		credentials: context.credentials,
		timeoutMs: context.timeoutMs,
	};
}

export async function whoami(context: CreateOSOperationContext) {
	const data = await apiRequest<IDataObject>(connectionFrom(context), 'GET', '/v1/whoami');
	return [toOperationResult(data, context.itemIndex)];
}

export async function listShapes(context: CreateOSOperationContext) {
	const data = await apiRequest<IDataObject>(connectionFrom(context), 'GET', '/v1/shapes');
	return [toOperationResult(data, context.itemIndex)];
}

export async function listRootfs(context: CreateOSOperationContext) {
	const data = await apiRequest<IDataObject>(connectionFrom(context), 'GET', '/v1/rootfs');
	return [toOperationResult(data, context.itemIndex)];
}
