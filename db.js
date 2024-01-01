import { readFileSync, writeFileSync } from 'node:fs';
import { existsSync } from 'node:fs';

export default function createSveliteDb(adapter) {
	let cache = {};

	async function read(collectionName) {
		if (!cache[collectionName]) {
			cache[collectionName] = await adapter.read(collectionName);
		}

		return cache[collectionName];
	}

	function debounce(cb, timeout = 1000) {
		let timer

		return (...args) => {
			if (timer) clearTimeout(timer);

			timer = setTimeout(() => {
				cb(...args);
			}, timeout);
		};
	}

	const deboundedWrite = debounce(adapter.write);

	function write(collectionName, data) {
        console.log('write', collectionName, data)
		cache[collectionName] = data;

        console.log('deboundedWrite', collectionName, data)
		deboundedWrite(collectionName, data);
	}

	return (collectionName) => {
		return {
			find() {
				let filters = [];
				let pagination = {};

				async function paginate(page, perPage) {
					pagination = { page, perPage };

					return (await all()).slice(
						(pagination.page - 1) * pagination.perPage,
						pagination.page * pagination.perPage
					);
				}

				async function all() {
					const items = await read(collectionName);
					const result = applyFilters(items);
					return result;
				}

				async function first() {
					const items = await read(collectionName);
					const result = applyFilters(items)[0] ?? null;
					return result;
				}

				function applyFilters(items) {
					return filters.reduce((prev, curr) => {
						return prev.filter((x) => applyComparison(x[curr.field], curr.operator, curr.value));
					}, items);
				}

				function applyComparison(value, operator, compareValue) {
					switch (operator) {
						case '=':
							return value === compareValue;
						case '<':
							return value < compareValue;
						case '<=':
							return value <= compareValue;
						case '>':
							return value > compareValue;
						case '>=':
							return value >= compareValue;
						// Add other conditions as needed
						default:
							return true; // No comparison applied for unknown operators
					}
				}

				function filter(field, operator, value) {
					filters.push({ value, operator, field });
					return {
						filter,
						all,
						first,
						paginate
					};
				}
				return { filter, all, first, paginate };
			},
			async insert(data) {
				data.id = 'id_' + Math.random();

				write(collectionName, [...(await read(collectionName)), data]);
				return data;
			},
			async remove(id) {
				const data = await read(collectionName);

				write(
					collectionName,
					data.filter((x) => x.id !== id)
				);
			},
			async update(predicate, data) {
				const items = await read(collectionName);


				write(
					collectionName,
					items.map((x, index) => {
						if (predicate(x, index)) {
							return { ...x, ...data };
						}
						return x;
					})
				);
			}
		};
	};
}
export const JSONAdapter = (filename) => {
	async function read(collection) {
		if (!existsSync(filename)) {
            await writeFile(filename, '{}');
        }
		console.log('Read from Adapter');
		const data = JSON.parse((readFileSync(filename, 'utf-8')) || '{}');

		return data[collection] ?? [];
	}

	async function write(collection, value) {
		const data = JSON.parse((readFileSync(filename, 'utf-8')) || '{}');

		console.log(data);

		data[collection] = value;
		console.log('Write in Adapter', data);
		writeFileSync(filename, JSON.stringify(data));
		return;
	}
	return { read, write };
};

export const createMemoryAdapter = () => {
    let content = {};
    return {
        read(collection) {
            return content[collection] ?? []
        }, 
        write(collection, value) {
            content[collection] = value
        }
    }
}

