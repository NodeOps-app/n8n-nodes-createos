import type { IDataObject } from 'n8n-workflow';

import { apiRequest } from '../client';
import { cleanObject, getLimit, getOffset, getOptionalStringParameter, getRequiredStringParameter, itemsFromPaged, parseObjectParameter, paginationFromPaged, toOperationResult } from '../helpers';
import type { CreateOSOperationContext } from '../types';

function connectionFrom(context: CreateOSOperationContext) {
	return { executeFunctions: context.executeFunctions, credentials: context.credentials, timeoutMs: context.timeoutMs };
}

function attachmentBody(context: CreateOSOperationContext): IDataObject {
	return cleanObject({
		disk_id: getRequiredStringParameter(context.executeFunctions, 'diskId', 'Disk ID', context.itemIndex),
		mount_path: getRequiredStringParameter(context.executeFunctions, 'mountPath', 'Mount Path', context.itemIndex),
		sub_path: getOptionalStringParameter(context.executeFunctions, 'subPath', context.itemIndex),
	});
}

export async function create(context: CreateOSOperationContext) {
	const { executeFunctions, itemIndex } = context;
	const config = parseObjectParameter(executeFunctions, executeFunctions.getNodeParameter('diskConfigJson', itemIndex, '{}'), 'Disk Config', itemIndex);
	const credentials = parseObjectParameter(executeFunctions, executeFunctions.getNodeParameter('diskCredentialsJson', itemIndex, '{}'), 'Disk Credentials', itemIndex);
	const body = { name: getRequiredStringParameter(executeFunctions, 'diskName', 'Disk Name', itemIndex), kind: 's3', config, credentials };
	const data = await apiRequest<IDataObject>(connectionFrom(context), 'POST', '/v1/disks', { body });
	return [toOperationResult(data, itemIndex)];
}

export async function get(context: CreateOSOperationContext) {
	const id = getRequiredStringParameter(context.executeFunctions, 'diskId', 'Disk ID', context.itemIndex);
	const data = await apiRequest<IDataObject>(connectionFrom(context), 'GET', `/v1/disks/${encodeURIComponent(id)}`);
	return [toOperationResult(data, context.itemIndex)];
}

export async function getMany(context: CreateOSOperationContext) {
	const data = await apiRequest<unknown>(connectionFrom(context), 'GET', '/v1/disks', { qs: { limit: getLimit(context.executeFunctions, context.itemIndex), offset: getOffset(context.executeFunctions, context.itemIndex) } });
	const pagination = paginationFromPaged(data);
	return itemsFromPaged(data).map((item) => toOperationResult(pagination ? { ...item, pagination } : item, context.itemIndex));
}

export async function deleteDisk(context: CreateOSOperationContext) {
	const id = getRequiredStringParameter(context.executeFunctions, 'diskId', 'Disk ID', context.itemIndex);
	const data = await apiRequest<IDataObject>(connectionFrom(context), 'DELETE', `/v1/disks/${encodeURIComponent(id)}`);
	return [toOperationResult(data, context.itemIndex)];
}

export async function listAttachments(context: CreateOSOperationContext) {
	const sandboxId = getRequiredStringParameter(context.executeFunctions, 'sandboxId', 'Sandbox ID', context.itemIndex);
	const data = await apiRequest<unknown>(connectionFrom(context), 'GET', `/v1/sandboxes/${encodeURIComponent(sandboxId)}/disks`);
	const pagination = paginationFromPaged(data);
	return itemsFromPaged(data).map((item) => toOperationResult({ sandboxId, ...item, ...(pagination ? { pagination } : {}) }, context.itemIndex));
}

export async function attach(context: CreateOSOperationContext) {
	const sandboxId = getRequiredStringParameter(context.executeFunctions, 'sandboxId', 'Sandbox ID', context.itemIndex);
	const body = attachmentBody(context);
	const data = await apiRequest<IDataObject>(connectionFrom(context), 'POST', `/v1/sandboxes/${encodeURIComponent(sandboxId)}/disks`, { body });
	return [toOperationResult({ sandboxId, ...body, ...data }, context.itemIndex)];
}

export async function detach(context: CreateOSOperationContext) {
	const sandboxId = getRequiredStringParameter(context.executeFunctions, 'sandboxId', 'Sandbox ID', context.itemIndex);
	const diskId = getRequiredStringParameter(context.executeFunctions, 'diskId', 'Disk ID', context.itemIndex);
	const mountPath = getRequiredStringParameter(context.executeFunctions, 'mountPath', 'Mount Path', context.itemIndex);
	const data = await apiRequest<IDataObject>(connectionFrom(context), 'DELETE', `/v1/sandboxes/${encodeURIComponent(sandboxId)}/disks/${encodeURIComponent(diskId)}`, { qs: { mount_path: mountPath } });
	return [toOperationResult({ sandboxId, diskId, mountPath, ...data }, context.itemIndex)];
}
