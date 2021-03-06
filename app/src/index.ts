import express from "express";
import { Pool } from "pg";
import dotenv from "dotenv";

import { formatInsertValue } from "./helper/formatInsertValue";
import { sendMessageToSlack } from "./utils/sendMessageToSlack";
import { isProduction } from "./utils/isProduction";

const PORT = process.env.PORT || 8888;

type RequestMacaddress = {
  anyMacaddress: string[];
};

// type MemberList = {
//   name?: string;
//   macaddress?: string;
// }

export type MemberName = {
  name: string;
};

type ActiveMember = {
  macaddress: string;
};

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: isProduction() ? { rejectUnauthorized: false } : undefined,
});

const init = async () => {
  let client;
  try {
    client = await pool.connect();
    await client.query("CREATE TABLE active_member (macaddress text)");
    await client.query("CREATE TABLE member_list (name text, macaddress text)");

    client.release();
    return;
  } finally {
    client?.release();
    return;
  }
};

const main = async () => {
  dotenv.config();
  const app = express();

  if (isProduction()) {
    await init();
  }

  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  app.get("/", (_, res) => {
    res.send("running satoruchan sever!");
  });

  app.post("/addMember", async (req, res) => {
    const { name, macaddress } = req.body;
    console.log(name, macaddress);
    // TODO: 同じ名前を追加できないようにする。

    try {
      const client = await pool.connect();
      const result = await client.query(
        "INSERT INTO member_list VALUES ($1, $2)",
        [name, macaddress]
      );
      console.log("result", result);
      res.status(200);
      res.end();
      client.release();
    } catch (err) {
      console.log(err);
      res.send("ERR: " + err);
    }
  });

  app.post("/update", async (req, res) => {
    const client = await pool.connect();

    // 10秒に一回送られてくるやつパース
    const { anyMacaddress: reqMacaddress }: RequestMacaddress = req.body;
    console.log("reqMacaddress", reqMacaddress);

    // macaddresの検証
    try {
      const { rows: prevMacaddress } = await client.query<ActiveMember>(
        "SELECT * from active_member"
      );
      console.log("prevMacaddress", prevMacaddress);

      const stayMember: string[] = [];
      const joinMember: string[] = [];
      const exitMember: string[] | null = [];

      if (!reqMacaddress) {
        return;
      }

      // メンバーが全員退出した時
      if (reqMacaddress.length === 0) {
        await client.query("DELETE FROM active_member");
        console.log("excute delete all active member");

        client.release();
        res.send("success update");
        res.end();
        return;
      }

      // ずっといる人
      prevMacaddress.forEach((actMem) => {
        if (reqMacaddress.includes(actMem.macaddress)) {
          stayMember.push(actMem.macaddress);
        }
      });

      // 退出した人
      prevMacaddress.forEach((actMem) => {
        if (!stayMember.includes(actMem.macaddress)) {
          exitMember.push(actMem.macaddress);
        }
      });

      // 入室した人
      reqMacaddress.forEach((reqMa) => {
        if (!stayMember.includes(reqMa)) {
          joinMember.push(reqMa);
        }
      });

      console.log("stayMember", stayMember);
      console.log("joinMember", joinMember);
      console.log("exitMember", exitMember);

      // 入ってきた人をactive_memberに追加
      if (joinMember.length !== 0) {
        console.log("excute insert");
        await client.query(
          `INSERT INTO active_member (macaddress) VALUES ${formatInsertValue(
            joinMember
          )}`
        );

        // Slackへルームに入ってきたメンバーの名前を送信
        console.log("send slack!");
        // MACアドレスから名前を入手
        // https://stackoverflow.com/questions/10720420/node-postgres-how-to-execute-where-col-in-dynamic-value-list-query/10829760#10829760

        const { rows: joinMemberNames } = await client.query<MemberName>(
          "SELECT name FROM member_list WHERE macaddress = ANY($1::text[])",
          [joinMember]
        );
        console.log("joinMemberNames", joinMemberNames);

        // メンバーリストにないMACアドレスがポストされた場合、joinMmeberにはそのMACアドレスが追加される。
        // MACアドレスからメンバーの名前を調べて、名前が存在した場合のみSlackに通知
        if (joinMemberNames.length !== 0) {
          await sendMessageToSlack(joinMemberNames);
        }
      }

      // 退出した人をactive_memberから削除
      if (exitMember.length !== 0) {
        console.log("exec delete");
        await client.query(
          "DELETE FROM active_member WHERE macaddress = ANY($1::text[])",
          [exitMember]
        );
        console.log("success delete member");
      }

      res.send("success update");
      client.release();
      res.end();

      return;
    } catch (e) {
      console.log("err", e);
    }
  });

  // 現在ルームにいる全てのメンバーを返す
  app.post("/getAllActiveMember", async (req, res) => {
    try {
      // Slackイベントへの応答
      const { challenge } = req.body;
      console.log("get challenge", challenge);

      if (challenge) {
        const resData = { challenge };

        res.setHeader("Content-type", "application/json");
        res.status(200).send(JSON.stringify(resData));
      }

      const client = await pool.connect();
      const { rows: activeMember } = await client.query<ActiveMember>(
        "SELECT * FROM active_member"
      );
      console.log(activeMember);

      const activeMemberMacaddress: string[] = [];
      activeMember.forEach((ma) => {
        activeMemberMacaddress.push(ma.macaddress);
      });

      console.log("activeMemberMacaddress", activeMemberMacaddress);

      // MACアドレスから名前を入手
      const { rows: activeMemberNames } = await client.query<MemberName>(
        "SELECT name FROM member_list WHERE macaddress = ANY($1::text[])",
        [activeMemberMacaddress]
      );
      console.log("activeMemberNames", activeMemberNames);

      // slackに現在ルームいるメンバーを送信
      await sendMessageToSlack(activeMemberNames);

      client.release();
      res.end();
    } catch (err) {
      console.log(err);
      res.send("ERR: " + err);
    }
  });

  app.get("/healthDb", async (_, res) => {
    try {
      const client = await pool.connect();
      const result = await client.query("SELECT * FROM member_list LIMIT 1");
      const results = { test_member_list: result ? result.rows : null };
      res.send(results);
      client.release();
      res.end();
    } catch (err) {
      console.log(err);
      res.send("ERR: " + err);
    }
  });

  app.listen(PORT, () => {
    console.log(`server working! port: ${PORT}`);
  });
};

main().catch((e) => {
  console.log(e);
});
