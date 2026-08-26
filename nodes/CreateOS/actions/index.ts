import * as code from './code.operations';
import * as disk from './disk.operations';
import * as file from './file.operations';
import * as network from './network.operations';
import * as sandbox from './sandbox.operations';
import * as system from './system.operations';
import * as template from './template.operations';
import type { CreateOSOperationHandler, Operation, OperationForResource, Resource } from '../types';

const operationHandlers = {
	system: {
		whoami: system.whoami,
		listShapes: system.listShapes,
		listRootfs: system.listRootfs,
	},
	sandbox: {
		create: sandbox.create,
		get: sandbox.get,
		getByIp: sandbox.getByIp,
		getMany: sandbox.getMany,
		destroy: sandbox.destroy,
		pause: sandbox.pause,
		resume: sandbox.resume,
		fork: sandbox.fork,
		patch: sandbox.patch,
		metrics: sandbox.metrics,
		bandwidth: sandbox.bandwidth,
		rechargeBandwidth: sandbox.rechargeBandwidth,
		resize: sandbox.resize,
	},
	code: {
		runCommand: code.runCommand,
	},
	file: {
		download: file.download,
		upload: file.upload,
	},
	template: {
		create: template.create,
		get: template.get,
		getMany: template.getMany,
		delete: template.deleteTemplate,
		logs: template.logs,
	},
	network: {
		create: network.create,
		get: network.get,
		getMany: network.getMany,
		delete: network.deleteNetwork,
		attach: network.attach,
		detach: network.detach,
	},
	disk: {
		create: disk.create,
		get: disk.get,
		getMany: disk.getMany,
		delete: disk.deleteDisk,
		listAttachments: disk.listAttachments,
		attach: disk.attach,
		detach: disk.detach,
	},
} satisfies {
	[R in Resource]: Record<OperationForResource<R>, CreateOSOperationHandler>;
};

export function getOperationHandler(resource: Resource, operation: Operation): CreateOSOperationHandler {
	const resourceHandlers: Partial<Record<Operation, CreateOSOperationHandler>> = operationHandlers[resource];
	const handler = resourceHandlers[operation];
	if (!handler) throw new Error(`Operation "${operation}" is not implemented for resource "${resource}"`);
	return handler;
}
