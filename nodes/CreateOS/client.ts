import type {
	ICredentialDataDecryptedObject,
	IDataObject,
	IExecuteFunctions,
	IHttpRequestMethods,
	IHttpRequestOptions,
	JsonObject,
} from 'n8n-workflow';
import { NodeApiError } from 'n8n-workflow';

import * as packageJson from '../../package.json';

const DEFAULT_BASE_URL = 'https://api.sb.createos.sh';
const INTEGRATION_USER_AGENT = `n8n-nodes-createos/${packageJson.version}`;

export interface CreateOSConnection {
	executeFunctions: IExecuteFunctions;
	credentials: ICredentialDataDecryptedObject;
	timeoutMs: number;
}

interface FullResponse {
	statusCode?: number;
	status?: number;
	headers?: IDataObject;
	body?: unknown;
}

interface RequestOptions {
	body?: IDataObject | IDataObject[] | Buffer | string;
	qs?: IDataObject;
	headers?: IDataObject;
	encoding?: IHttpRequestOptions['encoding'];
	returnFullResponse?: boolean;
	ignoreHttpStatusErrors?: boolean;
}

function asRecord(value: unknown): Record<string, unknown> | undefined {
	if (typeof value !== 'object' || value === null || Array.isArray(value)) return undefined;
	return Object.fromEntries(Object.entries(value));
}

function asString(value: unknown): string | undefined {
	return typeof value === 'string' && value.trim() !== '' ? value.trim() : undefined;
}

function cleanBaseUrl(url: string): string {
	return url.replace(/\/+$/, '');
}

function getBaseUrl(credentials: ICredentialDataDecryptedObject): string {
	return cleanBaseUrl(asString(credentials.baseUrl) ?? DEFAULT_BASE_URL);
}

function getApiToken(credentials: ICredentialDataDecryptedObject): string {
	return asString(credentials.apiToken) ?? '';
}

function getStatusCode(response: FullResponse): number | undefined {
	return response.statusCode ?? response.status;
}

function toJsonObject(value: unknown, fallbackMessage: string): JsonObject {
	const record = asRecord(value);
	if (record) return record as JsonObject;
	return { message: fallbackMessage };
}

function getErrorMessageFromBody(body: unknown, fallback: string): string {
	const record = asRecord(body);
	const message = asString(record?.message);
	if (message) return message;
	const data = record?.data;
	if (typeof data === 'string') return data;
	const nested = asRecord(data);
	const nestedMessage = asString(nested?.message) ?? asString(nested?.error);
	if (nestedMessage) return nestedMessage;
	return fallback;
}

function throwApiResponseError(
	executeFunctions: IExecuteFunctions,
	response: FullResponse,
	fallbackMessage: string,
): never {
	const statusCode = getStatusCode(response);
	const message = getErrorMessageFromBody(
		response.body,
		statusCode ? `${statusCode}: ${fallbackMessage}` : fallbackMessage,
	);
	const body = toJsonObject(response.body, message);
	throw new NodeApiError(
		executeFunctions.getNode(),
		{
			...(statusCode !== undefined ? { statusCode } : {}),
			body,
			response: { data: body },
		},
		{ httpCode: statusCode?.toString(), message },
	);
}

function unwrapData(body: unknown): unknown {
	const record = asRecord(body);
	if (!record || typeof record.status !== 'string') return body;
	if (record.status === 'success') return record.data;
	throw new Error(getErrorMessageFromBody(body, 'CreateOS API request failed'));
}

export async function apiRequestFull(
	connection: CreateOSConnection,
	method: IHttpRequestMethods,
	path: string,
	options: RequestOptions = {},
): Promise<FullResponse> {
	const token = getApiToken(connection.credentials);
	const isBinaryResponse = options.encoding === 'arraybuffer';
	const isBinaryBody = Buffer.isBuffer(options.body);
	const headers: IDataObject = {
		Accept: isBinaryResponse ? 'application/octet-stream' : 'application/json',
		'User-Agent': INTEGRATION_USER_AGENT,
		'X-Api-Key': token,
		...options.headers,
	};
	if (options.body !== undefined && !isBinaryBody && typeof options.body !== 'string' && headers['Content-Type'] === undefined) {
		headers['Content-Type'] = 'application/json';
	}
	const requestOptions: IHttpRequestOptions = {
		method,
		url: `${getBaseUrl(connection.credentials)}${path}`,
		headers,
		qs: options.qs,
		body: options.body,
		encoding: options.encoding,
		returnFullResponse: true,
		ignoreHttpStatusErrors: true,
		timeout: connection.timeoutMs,
		json: !isBinaryResponse && !isBinaryBody,
	};

	let response: FullResponse;
	const startedAt = Date.now();
	try {
		response = (await connection.executeFunctions.helpers.httpRequest(
			requestOptions,
		)) as FullResponse;
	} catch (error) {
		// eslint-disable-next-line no-console
		console.warn(`[CreateOS] ${method} ${path} failed after ${Date.now() - startedAt}ms`);
		throw new NodeApiError(
			connection.executeFunctions.getNode(),
			toJsonObject(error, 'CreateOS API request failed'),
		);
	}
	// eslint-disable-next-line no-console
	console.info(`[CreateOS] ${method} ${path} completed in ${Date.now() - startedAt}ms`);

	const statusCode = getStatusCode(response);
	if (statusCode && statusCode >= 400) {
		throwApiResponseError(connection.executeFunctions, response, 'CreateOS API request failed');
	}
	return response;
}

export async function apiRequest<T>(
	connection: CreateOSConnection,
	method: IHttpRequestMethods,
	path: string,
	options: RequestOptions = {},
): Promise<T> {
	const response = await apiRequestFull(connection, method, path, options);
	return unwrapData(response.body) as T;
}

export async function apiRequestText(
	connection: CreateOSConnection,
	method: IHttpRequestMethods,
	path: string,
	options: RequestOptions = {},
): Promise<string> {
	const response = await apiRequestFull(connection, method, path, {
		...options,
		encoding: 'text',
	});
	return typeof response.body === 'string' ? response.body : '';
}

export async function apiRequestBuffer(
	connection: CreateOSConnection,
	method: IHttpRequestMethods,
	path: string,
	options: RequestOptions = {},
): Promise<Buffer> {
	const response = await apiRequestFull(connection, method, path, {
		...options,
		encoding: 'arraybuffer',
	});
	if (Buffer.isBuffer(response.body)) return response.body;
	return Buffer.from(response.body as ArrayBuffer);
}
