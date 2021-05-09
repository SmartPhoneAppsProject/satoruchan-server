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

  app.post("/update", async (req, res) => {
    const client = await pool.connect()

    // 10秒に一回送られてくるやつパース
    // const dummyMacAddress = ['FF:FF:FF:8E:FF:FF', '1F:3F:3F:F3:3E:33']
    const { anyMacaddress: reqMacaddress }: RequestMacaddress = req.body
    console.log("reqMacaddress", reqMacaddress)

    // macaddresの検証
    try {
      const { rows: currentMember } = await client.query('SELECT * from active_member')
      console.log("currentMember", currentMember)

      let joinMember: string[] = []
      const exitMember: string[] | null = [];

      // active memberがいない時
      if (currentMember.length === 0 && reqMacaddress.length !== 0) {
        joinMember = [...reqMacaddress]
      }
      
      // メンバーが全員退出した時
      if (reqMacaddress.length === 0) {
        await client.query('DELETE FROM active_member')
        client.release()
        res.end()

        return
      }

      // 入退出があったが結果的に室内人数が同数になった場合
      
      // ずっといる人
      const stayMember:string[] = []
      currentMember.forEach(actMem => {
        if(reqMacaddress.includes(actMem.macaddress)){
          stayMember.push(actMem.macaddress)
        }
      })
      console.log("staymemver", stayMember)

      // 退出した人
      currentMember.forEach(actMem => {
        if(!stayMember.includes(actMem.macaddress)){
          exitMember.push(actMem.macaddress)
        }
      })

      // 入室した人
      reqMacaddress.forEach(reqMa => {
        if (!stayMember.includes(reqMa)) {
          joinMember.push(reqMa)
        }
      })

      console.log('joinMember', joinMember)
      console.log('exitMember', exitMember)

      if (joinMember.length !== 0) {
        console.log('exec insert')
        joinMember.forEach(async (ma) => {
          await client.query('INSERT INTO active_member VALUES ($1)', [ma])
        })
        console.log('success insert join member')

        // Slackに送信
        const joinMemberName = []
        console.log('start send slack!')
        for (let i=0; i<joinMember.length; i++) {
          const {rows: name} = await client.query('SELECT name FROM member_list WHERE macaddress=($1)',[joinMember[i]])
          joinMemberName.push(name[0])
        }
        console.log(joinMemberName)
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
      const {rows: activeMac } = await client.query('SELECT * FROM active_member')
      console.log(activeMac)

      const activeMemberNames = []
      for (let i=0 ; i < activeMac.length; i++) {
        const {rows: name} = await client.query('SELECT name FROM member_list WHERE macaddress=($1)', [activeMac[i].macaddress])
        activeMemberNames.push(name[0].name)
      }
      console.log(activeMemberNames)

      client.release()
      res.end()
    } catch (err) {
      console.log(err)
      res.send("ERR: " + err )
    }
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
