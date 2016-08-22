/* global describe, beforeAll, it, expect */
/* eslint prefer-arrow-callback: 0 */
/* eslint-disable max-nested-callbacks */
'use strict';

const JSONSchemaValidator = require('jsonschema').Validator;
const Validator = new JSONSchemaValidator();
const MockExpressResponse = require('mock-express-response');
const responseJsonApi = require('../../lib/middleware/response-json-api');
const jsonApiSchema = require('../helpers/json-api-schema.json');
const support = require('../support/');

describe('Middleware Response JSON API', () => {
	let bus;
	let req;
	let res;

	beforeAll(() => {
		bus = support.createBus();

		req = {
			protocol: 'https',
			hostname: 'example.com',
			identity: {
				channel: {id: 'channel-id'},
				platform: {id: 'platform-id'}
			},
			socket: {
				address: () => { return { port: 3000 }; }
			},
			query: ''
		};
		res = new MockExpressResponse();

		res.body = {
			id: '936ed036-45df-4190-afce-d71b860806d1',
			type: 'doesntmatter',
			title: 'Title of the thing',
			thing: 'This is a thing',
			relationships: [
				{
					id: '93750180-6e6c-41c7-bbbd-839dbf30f360',
					type: 'idk'
				}
			],
			meta: {
				extra: 'info'
			}
		};
	});

	it('formats response body to valid jsonapi.org schema', () => {
		responseJsonApi({bus})(req, res, () => {
			const v = Validator.validate(res.body, jsonApiSchema)
			console.log('validator.errors: ', v.errors);
			expect(v.errors.length).toBe(0);
		});
	});
});
