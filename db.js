import { readFileSync, writeFileSync } from 'node:fs';
import { existsSync } from 'node:fs';
import {customAlphabet} from 'nanoid';

// Define the character set for the IDs
const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';

// Create a custom nanoid function with a specific size
const getId = customAlphabet(alphabet, 8);

export default function createSveliteDb(adapter) {

	return (collectionName) => {
		return {
			find() {
				let filters = [];
				let pagination = {};

				async function paginate(page, perPage) {
					pagination = { page, perPage };

                    return adapter.find(collectionName, {filters, pagination})
				}

				async function all() {
					const result = await adapter.find(collectionName, {});
					return result;
				}

				async function first() {
                    const result = await adapter.find(collectionName, {filters})
					return result[0];
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
                data.id ??= getId();
                const result = await adapter.insert(collectionName, data);
				return result;
			},
			async remove(id) {
                await adapter.remove(collectionName, id)
                return true;
			},
			async update(id, data) {
				const result = await adapter.update(collectionName, id, data);
                return result
			}
		};
	};
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

function applyFilters(items, filters) {
    return filters.reduce((prev, curr) => {
        return prev.filter((x) => applyComparison(x[curr.field], curr.operator, curr.value));
    }, items);
}

let db = {};

export const createAdapter = () => {
    return {
        insert(collection, data) {
            if (!db[collection]) {
                db[collection] = [];
            }
            db[collection].push(data);
            return data;
        },

        find(collection, {pagination = null, filters = []}) {
            if (!db[collection]) {
                return [];
            }

            let items = applyFilters(db[collection], filters)

            if(!pagination) return items

            return items.slice(
                (pagination.page - 1) * pagination.perPage,
                pagination.page * pagination.perPage
            );
        },

        update(collection, id, data) {
            if (!db[collection]) {
                return null;
            }
            const index = db[collection].findIndex(item => item.id === id);
            if (index !== -1) {
                db[collection][index] = { ...db[collection][index], ...data };
                return db[collection][index];
            }
            return null;
        },

        remove(collection, id) {
            if (!db[collection]) {
                return null;
            }
            const index = db[collection].findIndex(item => item.id === id);
            if (index !== -1) {
                const deleted = db[collection][index];
                db[collection].splice(index, 1);
                return deleted;
            }
            return null;
        }
    }
}
