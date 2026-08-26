import type { IDataObject } from 'n8n-workflow';

import { apiRequest } from '../client';
import { getLimit, getOffset, getRequiredStringParameter, itemsFromPaged, paginationFromPaged, toOperationResult } from '../helpers';
import type { CreateOSOperationContext } from '../types';

function connectionFrom(context: CreateOSOperationContext) {
	return { executeFunctions: context.executeFunctions, credentials: context.credentials, timeoutMs: context.timeoutMs };
}

export async function create(context: CreateOSOperationContext) {
	const name = getRequiredStringParameter(context.executeFunctions, 'networkName', 'Network Name', context.itemIndex);
	const data = await apiRequest<IDataObject>(connectionFrom(context), 'POST', '/v1/networks', { body: { name } });
	return [toOperationResult(data, context.itemIndex)];
}

export async function get(context: CreateOSOperationContext) {
	const id = getRequiredStringParameter(context.executeFunctions, 'networkId', 'Network ID', context.itemIndex);
	const data = await apiRequest<IDataObject>(connectionFrom(context), 'GET', `/v1/networks/${encodeURIComponent(id)}`);
	return [toOperationResult(data, context.itemIndex)];
}

export async function getMany(context: CreateOSOperationContext) {
	const data = await apiRequest<unknown>(connectionFrom(context), 'GET', '/v1/networks', { qs: { limit: getLimit(context.executeFunctions, context.itemIndex), offset: getOffset(context.executeFunctions, context.itemIndex) } });
	const pagination = paginationFromPaged(data);
	return itemsFromPaged(data).map((item) => toOperationResult(pagination ? { ...item, pagination } : item, context.itemIndex));
}

export async function deleteNetwork(context: CreateOSOperationContext) {
	const id = getRequiredStringParameter(context.executeFunctions, 'networkId', 'Network ID', context.itemIndex);
	const data = await apiRequest<IDataObject>(connectionFrom(context), 'DELETE', `/v1/networks/${encodeURIComponent(id)}`);
	return [toOperationResult(data, context.itemIndex)];
}

export async function attach(context: CreateOSOperationContext) {
	const sandboxId = getRequiredStringParameter(context.executeFunctions, 'sandboxId', 'Sandbox ID', context.itemIndex);
	const networkId = getRequiredStringParameter(context.executeFunctions, 'networkId', 'Network ID', context.itemIndex);
	const data = await apiRequest<IDataObject>(connectionFrom(context), 'POST', `/v1/sandboxes/${encodeURIComponent(sandboxId)}/networks`, { body: { id: networkId } });
	return [toOperationResult({ sandboxId, networkId, ...data }, context.itemIndex)];
}

export async function detach(context: CreateOSOperationContext) {
	const sandboxId = getRequiredStringParameter(context.executeFunctions, 'sandboxId', 'Sandbox ID', context.itemIndex);
	const networkId = getRequiredStringParameter(context.executeFunctions, 'networkId', 'Network ID', context.itemIndex);
	const data = await apiRequest<IDataObject>(connectionFrom(context), 'DELETE', `/v1/sandboxes/${encodeURIComponent(sandboxId)}/networks/${encodeURIComponent(networkId)}`);
	return [toOperationResult({ sandboxId, networkId, ...data }, context.itemIndex)];
}
