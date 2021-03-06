const fs = require('fs-extra');
const path = require('path');
const { DataType, DataEngine } = require('./DataEngine');
const { DataFunction, DataFunctionType, DataFunctionGroup } = require('./DataFunction');
const { KeyFoundError, KeyNotFoundError } = require('./Errors');

// In-memory data manager, essentially
const STORAGE = {
	FILENAME: 'data.json',
	DATA: new Map()
};

/**
 * Builds a safe path to the data file
 * @returns {String} Path to the data file
 */
function getDataPath() {
	return path.join(process.cwd(), STORAGE.FILENAME);
}

/**
 * Converts the Data Map to a JSON Object
 * @returns {Object} JSON Object representing resource data
 */
function toJson() {
	const json = {};
	STORAGE.DATA.forEach((resourceData, resourceId) => json[resourceId] = resourceData);
	return json;
}

/**
 * Attempts to save the data to a file
 * @param {*} resolve Passed from a Promise. Runs on success
 * @param {*} reject Passed from a Promise. Runs on failure
 */
function save(resolve, reject) {
	fs.writeJson(getDataPath(), toJson(), { spaces: 4 })
		.then(resolve)
		.catch(reject);
}

/**
 * Get a resource
 * @param {String} resourceId Resource ID to get
 * @returns {Promise}
 */
function JsonGetFunc(resourceId) {
	return new Promise((resolve, reject) =>
		(resourceId === undefined)
			? resolve(Array.from(STORAGE.DATA.entries()))
			: (STORAGE.DATA.has(resourceId))
				? resolve(STORAGE.DATA.get(resourceId))
				: reject(new KeyNotFoundError()));
}

/**
 * Add a resource
 * @param {String} resourceId Resource ID to add
 * @param {Object} resourceData Data for the resource
 * @returns {Promise}
 */
function JsonPutFunc(resourceId, resourceData) {
	return new Promise((resolve, reject) =>
		(!STORAGE.DATA.has(resourceId))
			? (STORAGE.DATA.set(resourceId, resourceData), save(resolve, reject), null)
			: reject(new KeyFoundError()));
}

/**
 * Delete a resource
 * @param {String} resourceId Resource to delete
 * @returns {Promise}
 */
function JsonDelFunc(resourceId) {
	return new Promise((resolve, reject) =>
		(STORAGE.DATA.has(resourceId))
			? (STORAGE.DATA.delete(resourceId), save(resolve, reject), null)
			: reject(new KeyNotFoundError()));
}

/**
 * Check a resource
 * (Usually, this would also have a catch/reject, but Map's shouldn't throw on a .has)
 * @param {String} resourceId Resource to Check
 * @returns {Promise}
 */
function JsonHasFunc(resourceId) {
	return new Promise((resolve) => resolve(STORAGE.DATA.has(resourceId)));
}

class JsonDataEngine extends DataEngine {
	/**
	 * Create a new JsonDataEngine
	 * @param {String} [filename=data.json] Filename for the JSON file. Defaults to 'data.json'
	 */
	constructor(filename = 'data.json') {
		STORAGE.FILENAME = filename;
		super('JSON', DataType.FILE, new DataFunctionGroup(
			new DataFunction(DataFunctionType.GET, JsonGetFunc),
			new DataFunction(DataFunctionType.PUT, JsonPutFunc),
			new DataFunction(DataFunctionType.DEL, JsonDelFunc),
			new DataFunction(DataFunctionType.HAS, JsonHasFunc)
		));

		// Load or create file
		if (fs.existsSync(getDataPath()))
			Object.entries(fs.readJsonSync(getDataPath()))
				.forEach(([resourceId, resourceData]) => STORAGE.DATA.set(resourceId, resourceData))
		else {
			fs.ensureFileSync(getDataPath());
			fs.writeJsonSync(getDataPath(), toJson());
		}
	}

	/**
	 * Number of items this DataEngine holds
	 */
	get size() {
		return STORAGE.DATA.size;
	}

	toString() {
		return STORAGE.DATA;
	}
}

module.exports = JsonDataEngine;
