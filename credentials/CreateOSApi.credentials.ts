import type { ICredentialTestRequest, ICredentialType, INodeProperties } from 'n8n-workflow';

export class CreateOSApi implements ICredentialType {
	name = 'createOsApi';

	displayName = 'CreateOS API';

	documentationUrl = 'https://api.sb.createos.sh/swagger.json';

	icon = { light: 'file:nodeops.png', dark: 'file:nodeops.dark.png' } as const;

	properties: INodeProperties[] = [
		{
			displayName: 'API Token',
			name: 'apiToken',
			type: 'string',
			typeOptions: { password: true },
			required: true,
			default: '',
			description: 'Your CreateOS API token',
		},
		{
			displayName: 'API Base URL',
			name: 'baseUrl',
			type: 'string',
			default: 'https://api.sb.createos.sh',
			description: 'CreateOS control-plane API base URL',
		},
	];

	test: ICredentialTestRequest = {
		request: {
			baseURL: '={{$credentials.baseUrl}}',
			url: '/v1/whoami',
			method: 'GET',
			headers: {
				'X-Api-Key': '={{$credentials.apiToken}}',
			},
		},
	};
}
