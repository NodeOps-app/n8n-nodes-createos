import type { IDataObject } from 'n8n-workflow';

import { apiRequest } from '../client';
import {
	asNonEmptyString,
	cleanObject,
	getNumberParameter,
	getOptionalStringParameter,
	getRequiredStringParameter,
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

function getCreateBody(context: CreateOSOperationContext): IDataObject {
	const { executeFunctions, itemIndex } = context;
	const diskMib = getNumberParameter(executeFunctions, 'codeDiskMib', itemIndex, DEFAULT_DISK_MIB);
	const autoPauseSeconds = getNumberParameter(executeFunctions, 'codeAutoPauseAfterSeconds', itemIndex, 0);
	return cleanObject({
		shape: getRequiredStringParameter(executeFunctions, 'codeShape', 'Shape', itemIndex),
		rootfs: getOptionalStringParameter(executeFunctions, 'codeRootfs', itemIndex) ?? DEFAULT_ROOTFS,
		name: getOptionalStringParameter(executeFunctions, 'codeSandboxName', itemIndex),
		disk_mib: diskMib > 0 ? diskMib : undefined,
		ingress_enabled: executeFunctions.getNodeParameter('codeIngressEnabled', itemIndex, false) === true,
		auto_pause_after_seconds: autoPauseSeconds > 0 ? autoPauseSeconds : undefined,
		egress: parseArrayParameter(executeFunctions, executeFunctions.getNodeParameter('codeEgressJson', itemIndex, '[]'), 'Egress', itemIndex),
		networks: parseArrayParameter(executeFunctions, executeFunctions.getNodeParameter('codeNetworksJson', itemIndex, '[]'), 'Networks', itemIndex),
		disks: parseArrayParameter(executeFunctions, executeFunctions.getNodeParameter('codeDisksJson', itemIndex, '[]'), 'Disks', itemIndex),
	});
}

function getSandboxIdFromCreateResponse(data: IDataObject): string | undefined {
	return asNonEmptyString(data.id) ?? asNonEmptyString(data.sandboxId) ?? asNonEmptyString(data.sandbox_id);
}

export async function runCommand(context: CreateOSOperationContext) {
	const { executeFunctions, itemIndex } = context;
	const connection = connectionFrom(context);
	const sandboxMode = executeFunctions.getNodeParameter('sandboxMode', itemIndex, 'create') as string;
	let sandboxId =
		sandboxMode === 'existing'
			? getRequiredStringParameter(executeFunctions, 'sandboxId', 'Sandbox ID', itemIndex)
			: undefined;
	const command = getRequiredStringParameter(executeFunctions, 'command', 'Command', itemIndex);
	const createdSandbox = sandboxMode !== 'existing';
	const destroyAfterRun = createdSandbox && executeFunctions.getNodeParameter('destroyAfterRun', itemIndex, true) === true;
	const startedAt = Date.now();
	let destroyError: string | undefined;

	if (createdSandbox) {
		const sandbox = await apiRequest<IDataObject>(connection, 'POST', '/v1/sandboxes', {
			body: getCreateBody(context),
		});
		sandboxId = getSandboxIdFromCreateResponse(sandbox);
		if (!sandboxId) throw new Error('CreateOS sandbox create response did not include a sandbox ID');
	}
	if (!sandboxId) throw new Error('Sandbox ID is required to run a command');

	const body = cleanObject({
		cmd: '/bin/sh',
		args: ['-lc', command],
		stdin: getOptionalStringParameter(executeFunctions, 'stdin', itemIndex),
		env: parseObjectParameter(executeFunctions, executeFunctions.getNodeParameter('envJson', itemIndex, '{}'), 'Environment Variables', itemIndex),
		stream: false,
	});

	let data: IDataObject;
	try {
		data = await apiRequest<IDataObject>(connection, 'POST', `/v1/sandboxes/${encodeURIComponent(sandboxId)}/exec`, { body });
	} finally {
		if (destroyAfterRun && sandboxId) {
			try {
				await apiRequest<IDataObject>(connection, 'DELETE', `/v1/sandboxes/${encodeURIComponent(sandboxId)}`);
			} catch (error) {
				destroyError = error instanceof Error ? error.message : String(error);
			}
		}
	}

	const result = (data.result ?? {}) as IDataObject;
	return [
		toOperationResult(
			cleanObject({
				sandboxId,
				createdSandbox,
				destroyedAfterRun: destroyAfterRun && !destroyError,
				destroyError,
				command,
				success: result.exit_code === 0,
				exitCode: result.exit_code,
				stdout: result.stdout,
				stderr: result.stderr,
				execMs: data.exec_ms,
				executionTimeMs: Date.now() - startedAt,
			}),
			itemIndex,
		),
	];
}
