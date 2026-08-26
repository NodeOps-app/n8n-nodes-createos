import type { IDataObject, IExecuteFunctions } from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';

export function asNonEmptyString(value: unknown): string | undefined {
	return typeof value === 'string' && value.trim() !== '' ? value.trim() : undefined;
}

export function getErrorMessage(error: unknown): string {
	if (error instanceof Error) return error.message;
	return String(error);
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function getRequiredStringParameter(
	executeFunctions: IExecuteFunctions,
	name: string,
	displayName: string,
	itemIndex: number,
): string {
	const value = asNonEmptyString(executeFunctions.getNodeParameter(name, itemIndex));
	if (!value) {
		throw new NodeOperationError(executeFunctions.getNode(), `${displayName} is required`, {
			itemIndex,
		});
	}
	return value;
}

export function getOptionalStringParameter(
	executeFunctions: IExecuteFunctions,
	name: string,
	itemIndex: number,
): string | undefined {
	return asNonEmptyString(executeFunctions.getNodeParameter(name, itemIndex, ''));
}

export function getNumberParameter(
	executeFunctions: IExecuteFunctions,
	name: string,
	itemIndex: number,
	fallback: number,
): number {
	const value = Number(executeFunctions.getNodeParameter(name, itemIndex, fallback));
	if (!Number.isFinite(value)) {
		throw new NodeOperationError(executeFunctions.getNode(), `${name} must be a number`, {
			itemIndex,
		});
	}
	return value;
}

export function getLimit(executeFunctions: IExecuteFunctions, itemIndex: number): number {
	const limit = getNumberParameter(executeFunctions, 'limit', itemIndex, 50);
	if (!Number.isInteger(limit) || limit <= 0) {
		throw new NodeOperationError(executeFunctions.getNode(), 'Limit must be a positive integer', {
			itemIndex,
		});
	}
	return limit;
}

export function getOffset(executeFunctions: IExecuteFunctions, itemIndex: number): number {
	const offset = getNumberParameter(executeFunctions, 'offset', itemIndex, 0);
	if (!Number.isInteger(offset) || offset < 0) {
		throw new NodeOperationError(executeFunctions.getNode(), 'Offset must be a non-negative integer', {
			itemIndex,
		});
	}
	return offset;
}

export function getTimeoutMs(executeFunctions: IExecuteFunctions, itemIndex: number): number {
	const seconds = getNumberParameter(executeFunctions, 'timeoutSeconds', itemIndex, 300);
	if (!Number.isFinite(seconds) || seconds <= 0) {
		throw new NodeOperationError(executeFunctions.getNode(), 'Timeout must be greater than 0', {
			itemIndex,
		});
	}
	return Math.round(seconds * 1000);
}

export function parseJsonParameter(
	executeFunctions: IExecuteFunctions,
	value: unknown,
	displayName: string,
	itemIndex: number,
): unknown | undefined {
	if (value === undefined || value === null || value === '') return undefined;
	if (typeof value !== 'string') return value;
	try {
		return JSON.parse(value);
	} catch (error) {
		throw new NodeOperationError(
			executeFunctions.getNode(),
			`${displayName} must be valid JSON: ${getErrorMessage(error)}`,
			{ itemIndex },
		);
	}
}

export function parseObjectParameter(
	executeFunctions: IExecuteFunctions,
	value: unknown,
	displayName: string,
	itemIndex: number,
): IDataObject | undefined {
	const parsed = parseJsonParameter(executeFunctions, value, displayName, itemIndex);
	if (parsed === undefined) return undefined;
	if (!isRecord(parsed)) {
		throw new NodeOperationError(executeFunctions.getNode(), `${displayName} must be a JSON object`, {
			itemIndex,
		});
	}
	return parsed as IDataObject;
}

export function parseArrayParameter(
	executeFunctions: IExecuteFunctions,
	value: unknown,
	displayName: string,
	itemIndex: number,
): unknown[] | undefined {
	const parsed = parseJsonParameter(executeFunctions, value, displayName, itemIndex);
	if (parsed === undefined) return undefined;
	if (!Array.isArray(parsed)) {
		throw new NodeOperationError(executeFunctions.getNode(), `${displayName} must be a JSON array`, {
			itemIndex,
		});
	}
	return parsed;
}

export function cleanObject(value: IDataObject): IDataObject {
	const output: IDataObject = {};
	for (const [key, entry] of Object.entries(value)) {
		if (entry === undefined || entry === null || entry === '') continue;
		if (Array.isArray(entry) && entry.length === 0) continue;
		output[key] = entry;
	}
	return output;
}

export function itemsFromPaged(value: unknown): IDataObject[] {
	if (Array.isArray(value)) return value as IDataObject[];
	if (!isRecord(value)) return [];
	const nested = value.data;
	if (Array.isArray(nested)) return nested as IDataObject[];
	if (isRecord(nested) && Array.isArray(nested.data)) return nested.data as IDataObject[];
	return [];
}

export function paginationFromPaged(value: unknown): IDataObject | undefined {
	if (!isRecord(value)) return undefined;
	const nested = isRecord(value.data) ? value.data : value;
	return isRecord(nested.pagination) ? (nested.pagination as IDataObject) : undefined;
}

export function toOperationResult(
	data: IDataObject,
	itemIndex: number,
): { json: IDataObject; pairedItem: { item: number } } {
	return { json: data, pairedItem: { item: itemIndex } };
}
