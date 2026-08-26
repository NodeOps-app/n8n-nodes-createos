import { apiRequest, apiRequestBuffer } from '../client';
import { getRequiredStringParameter, toOperationResult } from '../helpers';
import type { CreateOSOperationContext } from '../types';

function connectionFrom(context: CreateOSOperationContext) {
	return {
		executeFunctions: context.executeFunctions,
		credentials: context.credentials,
		timeoutMs: context.timeoutMs,
	};
}

export async function download(context: CreateOSOperationContext) {
	const { executeFunctions, itemIndex } = context;
	const sandboxId = getRequiredStringParameter(executeFunctions, 'sandboxId', 'Sandbox ID', itemIndex);
	const remotePath = getRequiredStringParameter(executeFunctions, 'remotePath', 'Remote Path', itemIndex);
	const binaryPropertyName = getRequiredStringParameter(executeFunctions, 'binaryPropertyName', 'Binary Field', itemIndex);
	const buffer = await apiRequestBuffer(connectionFrom(context), 'GET', `/v1/sandboxes/${encodeURIComponent(sandboxId)}/files`, { qs: { path: remotePath } });
	const filename = remotePath.split('/').pop()?.trim() || 'download';
	const binaryData = await executeFunctions.helpers.prepareBinaryData(buffer, filename, 'application/octet-stream');
	return [{ json: { sandboxId, remotePath, fileName: filename, sizeBytes: buffer.byteLength }, binary: { [binaryPropertyName]: binaryData }, pairedItem: { item: itemIndex } }];
}

export async function upload(context: CreateOSOperationContext) {
	const { executeFunctions, itemIndex } = context;
	const sandboxId = getRequiredStringParameter(executeFunctions, 'sandboxId', 'Sandbox ID', itemIndex);
	const remotePath = getRequiredStringParameter(executeFunctions, 'remotePath', 'Remote Path', itemIndex);
	const binaryPropertyName = getRequiredStringParameter(executeFunctions, 'binaryPropertyName', 'Binary Field', itemIndex);
	const binaryMeta = executeFunctions.helpers.assertBinaryData(itemIndex, binaryPropertyName);
	const buffer = await executeFunctions.helpers.getBinaryDataBuffer(itemIndex, binaryPropertyName);
	const data = await apiRequest<Record<string, unknown>>(connectionFrom(context), 'PUT', `/v1/sandboxes/${encodeURIComponent(sandboxId)}/files`, { qs: { path: remotePath }, body: buffer, headers: { 'Content-Type': 'application/octet-stream' } });
	return [toOperationResult({ sandboxId, remotePath, fileName: binaryMeta.fileName, mimeType: binaryMeta.mimeType, sizeBytes: buffer.length, ...data }, itemIndex)];
}
