import type { IDataObject } from 'n8n-workflow';

import { apiRequest } from '../client';
import {
	cleanObject,
	getLimit,
	getNumberParameter,
	getOffset,
	getOptionalStringParameter,
	getRequiredStringParameter,
	itemsFromPaged,
	paginationFromPaged,
	parseArrayParameter,
	parseObjectParameter,
	toOperationResult,
} from '../helpers';
import type { CreateOSOperationContext } from '../types';

const DEFAULT_ROOTFS = 'devbox:1';
const DEFAULT_DISK_MIB = 10240;

function connectionFrom(context: CreateOSOperationContext) {
	return {
		executeFunctions: context.executeFunctions,
		credentials: context.credentials,
		timeoutMs: context.timeoutMs,
	};
}

function sandboxId(context: CreateOSOperationContext): string {
	return getRequiredStringParameter(context.executeFunctions, 'sandboxId', 'Sandbox ID', context.itemIndex);
}

function getCreateBody(context: CreateOSOperationContext): IDataObject {
	const { executeFunctions, itemIndex } = context;
	const diskMib = getNumberParameter(executeFunctions, 'diskMib', itemIndex, DEFAULT_DISK_MIB);
	const autoPauseSeconds = getNumberParameter(executeFunctions, 'autoPauseAfterSeconds', itemIndex, 0);
	return cleanObject({
		shape: getRequiredStringParameter(executeFunctions, 'shape', 'Shape', itemIndex),
		rootfs: getOptionalStringParameter(executeFunctions, 'rootfs', itemIndex) ?? DEFAULT_ROOTFS,
		name: getOptionalStringParameter(executeFunctions, 'sandboxName', itemIndex),
		disk_mib: diskMib > 0 ? diskMib : undefined,
		ingress_enabled: executeFunctions.getNodeParameter('ingressEnabled', itemIndex, false) === true,
		auto_pause_after_seconds: autoPauseSeconds > 0 ? autoPauseSeconds : undefined,
		envs: parseObjectParameter(executeFunctions, executeFunctions.getNodeParameter('envJson', itemIndex, '{}'), 'Environment Variables', itemIndex),
		egress: parseArrayParameter(executeFunctions, executeFunctions.getNodeParameter('egressJson', itemIndex, '[]'), 'Egress', itemIndex),
		networks: parseArrayParameter(executeFunctions, executeFunctions.getNodeParameter('networksJson', itemIndex, '[]'), 'Networks', itemIndex),
		disks: parseArrayParameter(executeFunctions, executeFunctions.getNodeParameter('disksJson', itemIndex, '[]'), 'Disks', itemIndex),
	});
}

export async function create(context: CreateOSOperationContext) {
	const data = await apiRequest<IDataObject>(connectionFrom(context), 'POST', '/v1/sandboxes', {
		body: getCreateBody(context),
	});
	return [toOperationResult(data, context.itemIndex)];
}

export async function get(context: CreateOSOperationContext) {
	const id = sandboxId(context);
	const data = await apiRequest<IDataObject>(connectionFrom(context), 'GET', `/v1/sandboxes/${encodeURIComponent(id)}`);
	return [toOperationResult(data, context.itemIndex)];
}

export async function getByIp(context: CreateOSOperationContext) {
	const ip = getRequiredStringParameter(context.executeFunctions, 'ip', 'IP Address', context.itemIndex);
	const data = await apiRequest<IDataObject>(connectionFrom(context), 'GET', `/v1/sandboxes/by-ip/${encodeURIComponent(ip)}`);
	return [toOperationResult(data, context.itemIndex)];
}

export async function getMany(context: CreateOSOperationContext) {
	const status = getOptionalStringParameter(context.executeFunctions, 'status', context.itemIndex);
	const data = await apiRequest<unknown>(connectionFrom(context), 'GET', '/v1/sandboxes', {
		qs: cleanObject({ limit: getLimit(context.executeFunctions, context.itemIndex), offset: getOffset(context.executeFunctions, context.itemIndex), status }),
	});
	const pagination = paginationFromPaged(data);
	return itemsFromPaged(data).map((item) => toOperationResult(pagination ? { ...item, pagination } : item, context.itemIndex));
}

export async function destroy(context: CreateOSOperationContext) {
	const id = sandboxId(context);
	const data = await apiRequest<IDataObject>(connectionFrom(context), 'DELETE', `/v1/sandboxes/${encodeURIComponent(id)}`);
	return [toOperationResult(data, context.itemIndex)];
}

export async function pause(context: CreateOSOperationContext) {
	const id = sandboxId(context);
	const data = await apiRequest<IDataObject>(connectionFrom(context), 'POST', `/v1/sandboxes/${encodeURIComponent(id)}/pause`);
	return [toOperationResult(data, context.itemIndex)];
}

export async function resume(context: CreateOSOperationContext) {
	const id = sandboxId(context);
	const data = await apiRequest<IDataObject>(connectionFrom(context), 'POST', `/v1/sandboxes/${encodeURIComponent(id)}/resume`);
	return [toOperationResult(data, context.itemIndex)];
}

export async function fork(context: CreateOSOperationContext) {
	const id = sandboxId(context);
	const { executeFunctions, itemIndex } = context;
	const body = cleanObject({
		start_paused: executeFunctions.getNodeParameter('startPaused', itemIndex, false) === true,
		ingress_enabled: executeFunctions.getNodeParameter('ingressEnabled', itemIndex, false) === true,
		envs: parseObjectParameter(executeFunctions, executeFunctions.getNodeParameter('envJson', itemIndex, '{}'), 'Environment Variables', itemIndex),
		egress: parseArrayParameter(executeFunctions, executeFunctions.getNodeParameter('egressJson', itemIndex, '[]'), 'Egress', itemIndex),
	});
	const data = await apiRequest<IDataObject>(connectionFrom(context), 'POST', `/v1/sandboxes/${encodeURIComponent(id)}/fork`, { body });
	return [toOperationResult(data, context.itemIndex)];
}

export async function patch(context: CreateOSOperationContext) {
	const id = sandboxId(context);
	const { executeFunctions, itemIndex } = context;
	const autoPauseSeconds = getNumberParameter(executeFunctions, 'autoPauseAfterSeconds', itemIndex, 0);
	const body = cleanObject({
		ingress_enabled: executeFunctions.getNodeParameter('ingressEnabled', itemIndex, false) === true,
		auto_pause_after_seconds: autoPauseSeconds > 0 ? autoPauseSeconds : undefined,
		disable_auto_pause: executeFunctions.getNodeParameter('disableAutoPause', itemIndex, false) === true,
	});
	const data = await apiRequest<IDataObject>(connectionFrom(context), 'PATCH', `/v1/sandboxes/${encodeURIComponent(id)}`, { body });
	return [toOperationResult(data, context.itemIndex)];
}

export async function metrics(context: CreateOSOperationContext) {
	const id = sandboxId(context);
	const data = await apiRequest<IDataObject>(connectionFrom(context), 'GET', `/v1/sandboxes/${encodeURIComponent(id)}/metrics`);
	return [toOperationResult(data, context.itemIndex)];
}

export async function bandwidth(context: CreateOSOperationContext) {
	const id = sandboxId(context);
	const data = await apiRequest<IDataObject>(connectionFrom(context), 'GET', `/v1/sandboxes/${encodeURIComponent(id)}/bandwidth`);
	return [toOperationResult(data, context.itemIndex)];
}

export async function rechargeBandwidth(context: CreateOSOperationContext) {
	const id = sandboxId(context);
	const gib = getNumberParameter(context.executeFunctions, 'gib', context.itemIndex, 1);
	const data = await apiRequest<IDataObject>(connectionFrom(context), 'POST', `/v1/sandboxes/${encodeURIComponent(id)}/bandwidth/recharge`, { body: { gib } });
	return [toOperationResult(data, context.itemIndex)];
}

export async function resize(context: CreateOSOperationContext) {
	const id = sandboxId(context);
	const diskMib = getNumberParameter(context.executeFunctions, 'diskMib', context.itemIndex, 0);
	const data = await apiRequest<IDataObject>(connectionFrom(context), 'POST', `/v1/sandboxes/${encodeURIComponent(id)}/resize`, { body: { disk_mib: diskMib } });
	return [toOperationResult(data, context.itemIndex)];
}
