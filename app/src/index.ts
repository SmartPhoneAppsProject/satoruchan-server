import express from 'express'
import { Pool } from 'pg'
// import axios from 'axios'
import dotenv from 'dotenv'
import { formatInsertValue } from './helper/formatInsertValue'

const main = () => {
  dotenv.config()
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
      const result = await client.query('INSERT INTO member_list VALUES ($1, $2)', [name, macaddress])
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

  type MemberList = {
    name?: string;
    macaddress?: string;
  }

  type ActiveMember = {
    macaddress: string;
  }

  app.post("/update", async (req, res) => {
    const client = await pool.connect()

    // 10秒に一回送られてくるやつパース
    // const dummyMacAddress = ['FF:FF:FF:8E:FF:FF', '1F:3F:3F:F3:3E:33']
    const { anyMacaddress: reqMacaddress }: RequestMacaddress = req.body
    console.log("reqMacaddress", reqMacaddress)

    // macaddresの検証
    try {
      const { rows: prevMacaddress } = await client.query<ActiveMember>('SELECT * from active_member')
      console.log("prevMacaddress", prevMacaddress)

      const stayMember: string[] = []
      const joinMember: string[] = []
      const exitMember: string[] | null = [];

      // メンバーが全員退出した時
      if (reqMacaddress.length === 0) {
        await client.query('DELETE FROM active_member')

        client.release()
        res.end()
        return
      }

      // ずっといる人
      prevMacaddress.forEach(actMem => {
        if (reqMacaddress.includes(actMem.macaddress)) {
          stayMember.push(actMem.macaddress)
        }
      })

      // 退出した人
      prevMacaddress.forEach(actMem => {
        if (!stayMember.includes(actMem.macaddress)) {
          exitMember.push(actMem.macaddress)
        }
      })

      // 入室した人
      reqMacaddress.forEach(reqMa => {
        if (!stayMember.includes(reqMa)) {
          joinMember.push(reqMa)
        }
      })

      console.log('stayMember', stayMember)
      console.log('joinMember', joinMember)
      console.log('exitMember', exitMember)

      if (joinMember.length !== 0) {
        console.log('excute insert')
        console.log('formated', formatInsertValue(joinMember))
        await client.query(`INSERT INTO active_member (macaddress) VALUES ${formatInsertValue(joinMember)}`)

        // Slackに送信
        console.log('start send slack!')
        // MACアドレスから名前を入手
        // https://stackoverflow.com/questions/10720420/node-postgres-how-to-execute-where-col-in-dynamic-value-list-query/10829760#10829760
        const { rows: joinMemberNames } = await client.query<MemberList>('SELECT name FROM member_list WHERE macaddress = ANY($1::text[])', [joinMember])
        console.log('joinMemberNames', joinMemberNames)

        // joinMemberName.forEach(async name => {
        //   const headers = {
        //     'Content-Type': 'application/json',
        //     Authorization: process.env.SLACK_API_KEY,
        //   };
        //   const data = {
        //     channel: process.env.SLACK_CHANNEL_ID,
        //     text: name
        //   };
        //   const { status } = await axios({
        //     method: 'post',
        //     url: 'https://slack.com/api/chat.postMessage',
        //     data,
        //     headers,
        //   });
        //   console.log(status)
        // })
      }

      if (exitMember.length !== 0) {
        console.log("exec delete")
        exitMember.forEach(async (ma) => {
          await client.query('DELETE FROM active_member WHERE macaddress = $1', [ma])
        })
        console.log('success delete member')
      }

      client.release()
      res.end()

      return
    } catch (e) {
      console.log('err', e)
    }

  })

  // 現在ルームにいる全てのメンバーを返す
  app.get("/getAllActiveMember", async (_, res) => {
    try {
      const client = await pool.connect()
      const { rows: activeMac } = await client.query('SELECT * FROM active_member')
      console.log(activeMac)

      const activeMemberNames = []
      for (let i = 0; i < activeMac.length; i++) {
        const { rows: name } = await client.query('SELECT name FROM member_list WHERE macaddress=($1)', [activeMac[i].macaddress])
        activeMemberNames.push(name[0].name)
      }
      console.log(activeMemberNames)

      client.release()
      res.end()
    } catch (err) {
      console.log(err)
      res.send("ERR: " + err)
    }
  })

  app.get("/healthDb", async (_, res) => {
    try {
      const client = await pool.connect()
      const result = await client.query('SELECT * FROM member_list LIMIT 1')
      const results = { 'test_member_list': (result) ? result.rows : null }
      res.send(results)
      client.release()
      res.end()
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
