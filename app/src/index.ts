import express from 'express'
import { Pool } from 'pg'

const main = () => {
  const app = express()

  const pool = new Pool({
    connectionString: process.env.DATABASE_URL
    // ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : null
  })

  app.use(express.json())
  app.use(express.urlencoded({ extended: true }))

  app.get("/", (_, res) => {
    res.send("hoge432")
  })

  app.post("/addMember", async (req, res) => {
    const {name,macaddress} = req.body
    console.log(name,macaddress)

    try {
      const client = await pool.connect()
      const result = await client.query('INSERT INTO member_list VALUES ($1,$2)',[name,macaddress])
      console.log("result" , result)
      client.release()
    } catch (err) {
      console.log(err)
      res.send("ERR: " + err)
    }
  })

  app.get("/testdb", async (_, res) => {
    try {
      const client = await pool.connect()
      const result = await client.query('SELECT * FROM member_list')
      const results = { 'results': (result) ? result.rows : null }
      res.send(results)
      client.release()
    } catch (err) {
      console.log(err)
      res.send("ERR: " + err)
    }
  })

  app.post("/update", (req, res) => {
    const data = req.body
    console.log(data)
    res.status(200)
  })

  app.listen(8888, () => {
    console.log('server working! port: 8888');
  })
}

main()
