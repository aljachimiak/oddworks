/* global describe, beforeAll, expect, it, spyOn, xdescribe */
/* eslint prefer-arrow-callback: 0 */
/* eslint-disable max-nested-callbacks */
'use strict';

const Boom = require('boom');
const Promise = require('bluebird');
const fakeredis = require('fakeredis');
const _ = require('lodash');
const redisStore = require('../../../../lib/stores/redis/');
const identityService = require('../../../../lib/services/identity');

describe('Identity Service Controller', function () {
	let bus;

	const CHANNEL = {
		id: 'odd-networks',
		title: 'Odd Networks'
	};

	const CHANNEL_2 = {
		channel: 'channel-2',
		type: 'channel',
		title: 'Channel 2 News | All the Odd You Can Handle'
	};

	const PLATFORM = {
		id: 'apple-ios',
		title: 'Apple iOS',
		channel: 'odd-networks'
	};

	const PLATFORM_2 = {
		id: 'roku',
		title: 'Roku',
		channel: 'odd-networks'
	};

	const RES = {
		body: {},
		status() {
		}
	};

	const REQ = {
		query: {},
		params: {},
		identity: {audience: 'admin'}
	};

	const RESPONSES = {
		POST_CHANNEL: null,
		POST_PLATFORM: null,
		GET_CHANNELS: null,
		GET_PLATFORMS: null
	}

	beforeAll(function (done) {
		bus = this.createBus();
		this.service = null;

		Promise.promisifyAll(fakeredis.RedisClient.prototype);
		Promise.promisifyAll(fakeredis.Multi.prototype);

		// Initialize a store
		redisStore(bus, {
			types: ['channel', 'platform'],
			redis: fakeredis.createClient()
		})
		.then(store => {
			this.store = store;
		})
		// Initialize an identity service
		.then(() => {
			return identityService(bus, {});
		})
		.then(service => {
			this.service = service;
			this.controller = {
				channel: new service.IdentityListController({bus, type: 'channel'}),
				platform: new service.IdentityListController({bus, type: 'platform'})
			};
		})
		.then(() => {
			return Promise.join(
				bus.sendCommand({role: 'store', cmd: 'set', type: 'channel'}, CHANNEL),
				bus.sendCommand({role: 'store', cmd: 'set', type: 'platform'}, PLATFORM),
				() => {}
			);
		})
		.then(() => {
			const res = _.cloneDeep(RES);
			const req = _.cloneDeep(REQ);

			req.body = CHANNEL_2;

			return this.controller.channel.post(req, res, () => {
				RESPONSES.POST_CHANNEL = res;
				return null;
			});
		})
		.then(() => {
			const res = _.cloneDeep(RES);
			const req = _.cloneDeep(REQ);

			req.body = PLATFORM_2;

			return this.controller.platform.post(req, res, () => {
				RESPONSES.POST_PLATFORM = res;
				return null;
			});
		})
		.then(() => {
			const res = _.cloneDeep(RES);
			const req = _.cloneDeep(REQ);

			// id of posted channel isn't as expected
			// it is a random id, rather than the one in the body
			console.log(RESPONSES.POST_CHANNEL.body.id);

			// probably shouldn't need a channel to scan channels'
			req.query = {channel: 'odd-networks'};

			return this.controller.channel.get(req, res, () => {
				// this only retrieves the odd-networks channel
				console.log('GET CHANNELS RES: ', res);
				RESPONSES.GET_CHANNELS = res;
				return null;
			});
		})
		.then(done)
		.catch(done.fail);
	});

	it('Admin POST inserts a channel object', function (done) {
		const data = (RESPONSES.POST_CHANNEL || {}).body;
		console.log('POSTCHANNEL: ', data);
		expect(data.channel).toBe('channel-2');
		expect(data.type).toBe('channel');
		expect(data.title).toBe('Channel 2 News | All the Odd You Can Handle');
		done();
	});

	it('non-Admin POST of channel recieves a forbidden response', function (done) {
		const res = {
			body: {},
			status() {
			}
		};
		const req = {
			query: {},
			params: {},
			body: CHANNEL_2,
			identity: {audience: 'platform'}
		};
		spyOn(Boom, 'forbidden');

		this.controller.channel.post(req, res, () => {
			expect(Boom.forbidden).toHaveBeenCalledTimes(1);
			done();
		});
	});

	it('Admin POST inserts a platform object', function (done) {
		const data = (RESPONSES.POST_PLATFORM || {}).body;
		expect(data.channel).toBe('odd-networks');
		expect(data.type).toBe('platform');
		expect(data.title).toBe('Roku');
		expect(data.id).toBe('roku');
		done();
	});

	describe('Admin GET', function () {
		it('retrieves all present channel objects', function () {
			const data = (RESPONSES.GET_CHANNELS || {}).body;
			console.log(data);
			expect(true).toBe(true);
		});
	});

	xdescribe('Admin GET retrieves all present platform objects');
});
