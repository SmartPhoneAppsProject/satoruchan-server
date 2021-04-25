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
    const { name, macaddress } = req.body
    console.log(name, macaddress)
    // TODO: 同じ名前を追加できないようにする。

    try {
      const client = await pool.connect()
      const result = await client.query('INSERT INTO member_list VALUES ($1,$2)', [name, macaddress])
      console.log("result", result)
      client.release()
    } catch (err) {
      console.log(err)
      res.send("ERR: " + err)
    }
  })

  type RequestMacaddress = {
    anyMacaddress: string[];
  }

  // type RegularUser = {
  //   name: string;
  //   macaddress: string;
  // }

  app.post("/update", async (req) => {
    const client = await pool.connect()

    // 10秒に一回送られてくるやつパース
    // const dummyMacAddress = ['FF:FF:FF:8E:FF:FF', '1F:3F:3F:F3:3E:33']
    const { anyMacaddress: reqMacaddress }: RequestMacaddress = req.body
    console.log("reqMacaddress", reqMacaddress)

    // macaddresの検証
    try {
      const { rows: currentMember } = await client.query('SELECT * from active_member')
      console.log("currentMember", currentMember)

      // 増えた、減った、変化なし
      const joinMember: string[] | null = []
      const exitMember: string[] | null = [];

      reqMacaddress.forEach((reqMa) => {
        currentMember.forEach((actMem) => {
          if (actMem.macaddress !== reqMa) {
            joinMember.push(reqMa)
            return
          }
          return
        })
      })

      currentMember.forEach((actMem) => {
        reqMacaddress.forEach((reqMa) => {
          if (actMem.macaddress !== reqMa) {
            exitMember.push(actMem.macaddress)
            return
          }
          return
        })
      })

      if (joinMember.length !== 0) {
        joinMember.forEach(async (ma) => {
          await client.query('INSERT INTO active_member VALUES ($1)', [ma])
        })
      }

      if (exitMember.length !== 0) {
        joinMember.forEach(async (ma) => {
          await client.query('DELETE FROM active_member WHERE macaddress = $1', [ma])
        })
      }

      client.release()

    } catch (e) {
      console.log('err', e)
    }

    // slackに名前送信

  })

  app.get("/testdb", async (_, res) => {
    try {
      const client = await pool.connect()
      const result = await client.query('SELECT * FROM member_list')
      const results = { 'test_member_list': (result) ? result.rows : null }
      res.send(results)
      client.release()
    } catch (err) {
      console.log(err)
      res.send("ERR: " + err)
    }
  })


  app.listen(8888, () => {
    console.log('server working! port: 8888');
  })
}

main()
