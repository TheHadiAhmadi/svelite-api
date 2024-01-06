import express from 'express'
import cors from 'cors'
import path from 'path'
import multer from 'multer'
import createSveliteServer from './server.js'
import createSveliteDb, {JSONAdapter} from './db.js';

const server = createSveliteServer({});

const app = express()
app.use(cors())
app.use(express.json())

const auth = (req, res, next) => {
    return next()
}

const fileMiddleware = multer({
    storage: multer.diskStorage({
      destination: (req, file, cb) => {
        return cb(null, "./data/files");
      },
      filename: (req, file, cb) => {
        return cb(null, 'id_' + Math.random());
      },
    }),
  }).single("file")

app.post(
  "/api/files",
  fileMiddleware,
  // auth,
  async (req, res) => {
    const dbAdapter = JSONAdapter("./data.json")
    const db = createSveliteDb(dbAdapter)
      
    const id = (req.file.path.split("/").pop()).split('\\').pop();

    const data = {
      id,
      name: req.file.originalname,
      type: req.file.mimetype.split("/")[0],
      alt: "",
    };
    await db("files").insert(data);

    res.send({
      status: 200,
      message: "File uploaded syccessfully!",
      data,
    });
  }
);

// Download
app.get("/api/files/:fileId", (req, res) => {

  res.sendFile(req.params.fileId, {
    root: path.resolve("./data/files/"),
  });
});

app.post('/api', async (req, res) => {
    console.log('req')
    const response = await server({headers: req.headers, body: req.body})

    res.send(response)
})

app.listen(3010, () => {
    console.log('server started on http://localhost:3010')
})


