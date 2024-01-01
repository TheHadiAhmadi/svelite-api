import createSveliteDb, {JSONAdapter} from './db.js';

function respond(code = 200, data = null, message = 'Success', field = null) {
	const response = {};

	response.code = code ?? 200;
	if (data) response.data = data;
	response.message = message;
	response.field = field;

//	return new Response(JSON.stringify(response));
    return response
}

export default function createSveliteServer(config) {
    const dbAdapter = JSONAdapter("./my-data.json")
    const db = createSveliteDb(dbAdapter)

	return async ({body}) => {

        const collection = db(body.collection);
        const action = body.action;
        const data = body.data;

        let result = null;
        let message = 'success';

        switch (action) {
            case 'insert':
                const insertedData = await collection.insert(data);
                result = insertedData;
                message = 'Data Inserted successfully';

                break;

            case 'update':
                // Assuming you have a specific identifier for the update (e.g., data.id)
                await collection.update((value) => value.id === data.id, data);
                message = 'Data updated successfully';
                result = {}
                break;

            case 'remove':
                // Assuming data is the ID to be removed
                await collection.remove(data);
                message = 'Data removed successfully';
                break;

            case 'find':
                const { filters = [], perPage, page } = body;
                // Assuming filters is an array of filter items
                let query = collection.find();

                filters.map((filter) => {
                    query = query.filter(filter.field, filter.operator, filter.value);
                });

                if (perPage) {
                    result = await query.paginate(page, perPage);
                } else {
                    result = await query.all();
                }

                break;

            default:
                message = 'action is not defined';
        }

        return respond(200, result, message);
	};
}


