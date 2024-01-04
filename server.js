import createSveliteDb, {JSONAdapter} from './db.js';
import jwt from 'jsonwebtoken'
import bcrypt from 'bcrypt'

async function register(body, db) {
    console.log("register", body)

    if(!body.username) {
        throw new Error('400:username: this field is required!')
    }
    if(!body.password) {
        throw new Error('400:password: this field is required!')
    }
    if(!body.name) {
        throw new Error('400:name: this field is required!')
    }

    const user = {
        username: body.username,
        name: body.name,
        email: body.email,
        password: bcrypt.hashSync(body.password, 10),
    };

    console.log("Insert", user)
    const result = await db("users").insert(user);

    return result
}

async function login(username, password, db) {
    const user = await db("users").find().filter('username', '=', username).first();

    console.log(user)
  
    if (!user) {
        console.log('throwing')
        throw new Error("404:username: user not found");
    }

    const result = bcrypt.compareSync(password, user.password);

    if (!result) {
        throw new Error("401:password: Invalid password");
    }

    let token = jwt.sign(
    {
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        username: user.username,
      },
    },
    process.env.SECRET_KEY ?? "svelite"
    );

    return {
        user,
        token,
    };
}

async function getUser(db, token) {
    try {

        const object = jwt.verify(token, process.env.SECRET_KEY ?? 'svelite')

        return await db('users').find().filter('username', '=', object.user.username).first()

    } catch(err) {
        throw new Error('401::JWT ' + err.message)
    }
}

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
    const dbAdapter = JSONAdapter("./data.json")
    const db = createSveliteDb(dbAdapter)

	return async ({headers, body}) => {

        const collection = db(body.collection);
        const action = body.action;
        const data = body.data;

        let code = 200
        let result = null;
        let message = 'success';
        let field = null;

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

            case 'login': 
                const {username, password} = body

                try {
                    const res = await login(username, password, db)
                    console.log(res)
                    result = {user: res.user, token: res.token}
                } catch(err) {
                    const res = err.message.split(':')

                    message = res[2].trim()
                    code = +res[0]
                    field = res[1]
                }

                break;

            case 'register': {
                const {username, password, name, email} = body

                try {
                    const res = await register({username, password, name, email}, db)

                    result = {
                        user: res, 
                        token: 'Please Login'
                    }
                } catch(err) {
                    const res = err.message.split(':')
                    console.log(err.message)

                    message = res[2].trim()
                    code = +res[0]
                    field = res[1]
                }

                break;
            }

            case 'get_user': {
                // read token from authorization
                try {
                    const token = (headers['authorization'] ?? '').split(' ')[1]
                    console.log(token, headers)
                    result = await getUser(db, token)
                } catch(err) {
                    const res = err.message.split(':')
                    console.log(err.message)

                    message = res[2].trim()
                    code = +res[0]
                }

                break;

            }

            default:
                message = 'action is not defined';
        }

        return respond(code, result, message, field);
	};
}


