import type { IDataObject } from 'n8n-workflow';

import { apiRequest, apiRequestText } from '../client';
import { getLimit, getOffset, getOptionalStringParameter, getRequiredStringParameter, itemsFromPaged, paginationFromPaged, toOperationResult } from '../helpers';
import type { CreateOSOperationContext } from '../types';

function connectionFrom(context: CreateOSOperationContext) {
	return { executeFunctions: context.executeFunctions, credentials: context.credentials, timeoutMs: context.timeoutMs };
}

export async function create(context: CreateOSOperationContext) {
	const { executeFunctions, itemIndex } = context;
	const body = {
		name: getRequiredStringParameter(executeFunctions, 'templateName', 'Template Name', itemIndex),
		dockerfile: getRequiredStringParameter(executeFunctions, 'dockerfile', 'Dockerfile', itemIndex),
	};
	const data = await apiRequest<IDataObject>(connectionFrom(context), 'POST', '/v1/templates', { body });
	return [toOperationResult(data, itemIndex)];
}

export async function get(context: CreateOSOperationContext) {
	const id = getRequiredStringParameter(context.executeFunctions, 'templateId', 'Template ID', context.itemIndex);
	const include = getOptionalStringParameter(context.executeFunctions, 'include', context.itemIndex);
	const data = await apiRequest<IDataObject>(connectionFrom(context), 'GET', `/v1/templates/${encodeURIComponent(id)}`, { qs: include ? { include } : {} });
	return [toOperationResult(data, context.itemIndex)];
}

export async function getMany(context: CreateOSOperationContext) {
	const data = await apiRequest<unknown>(connectionFrom(context), 'GET', '/v1/templates', { qs: { limit: getLimit(context.executeFunctions, context.itemIndex), offset: getOffset(context.executeFunctions, context.itemIndex) } });
	const pagination = paginationFromPaged(data);
	return itemsFromPaged(data).map((item) => toOperationResult(pagination ? { ...item, pagination } : item, context.itemIndex));
}

export async function deleteTemplate(context: CreateOSOperationContext) {
	const id = getRequiredStringParameter(context.executeFunctions, 'templateId', 'Template ID', context.itemIndex);
	const data = await apiRequest<IDataObject>(connectionFrom(context), 'DELETE', `/v1/templates/${encodeURIComponent(id)}`);
	return [toOperationResult(data, context.itemIndex)];
}

export async function logs(context: CreateOSOperationContext) {
	const id = getRequiredStringParameter(context.executeFunctions, 'templateId', 'Template ID', context.itemIndex);
	const limit = getOptionalStringParameter(context.executeFunctions, 'logLimit', context.itemIndex);
	const text = await apiRequestText(connectionFrom(context), 'GET', `/v1/templates/${encodeURIComponent(id)}/logs`, { qs: limit ? { limit } : {} });
	return [toOperationResult({ templateId: id, logs: text }, context.itemIndex)];
}
