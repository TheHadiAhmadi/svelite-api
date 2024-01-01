import express from 'express'
import cors from 'cors'
import createSveliteServer from './server.js'

const server = createSveliteServer({});

const app = express()
app.use(cors())
app.use(express.json())

app.post('/api', async (req, res) => {
    console.log('req')
    const response = await server({body: req.body})

    res.send(response)
})

app.listen(3010, () => {
    console.log('server started on http://localhost:3010')
})


