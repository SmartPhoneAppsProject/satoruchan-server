import express from "express";
import { Pool, QueryResult } from "pg";
import dotenv from "dotenv";

import { queryExcuter } from "./utils/queryExcuter";
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
  idleTimeoutMillis: 600000,
});

const init = async () => {
  try {
    await queryExcuter(pool, "CREATE TABLE active_member (macaddress text)");
    await queryExcuter(
      pool,
      "CREATE TABLE member_list (name text, macaddress text)"
    );
  } catch (e) {
    console.log("[InitError]", e);
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

    // TODO: 同じ名前を追加できないようにする。
    // TODO: nameとmacaddressが両方あるか検証する。
    try {
      const insertMl = "INSERT INTO member_list VALUES ($1, $2)";
      await queryExcuter(pool, insertMl, [name, macaddress]);

      res.status(200);
      res.end();
    } catch (err) {
      console.log(err);
      res.send("ERR: " + err);
    }
  });

  app.post("/update", async (req, res) => {
    // 10秒に一回送られてくるやつパース
    const { anyMacaddress: reqMacaddress }: RequestMacaddress = req.body;
    console.log("reqMacaddress", reqMacaddress);

    // macaddresの検証
    try {
      const selectAM = "SELECT * from active_member";
      const { rows: prevMacaddress }: QueryResult<ActiveMember> =
        await queryExcuter(pool, selectAM);
      console.log("prevMacaddress", prevMacaddress);

      const stayMember: string[] = [];
      const joinMember: string[] = [];
      const exitMember: string[] | null = [];

      // if (!reqMacaddress) {
      //   return;
      // }

      // メンバーが全員退出した時
      if (reqMacaddress.length === 0 || !reqMacaddress) {
        const deleteAM = "DELETE FROM active_member";
        await queryExcuter(pool, deleteAM);
        console.log("excute delete all active member");

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
      if (joinMember.length > 0) {
        console.log("excute insert");
        const insertAM = `INSERT INTO active_member (macaddress) VALUES ${formatInsertValue(
          joinMember
        )}`;
        await queryExcuter(pool, insertAM);

        // Slackへルームに入ってきたメンバーの名前を送信
        // MACアドレスから名前を入手
        // https://stackoverflow.com/questions/10720420/node-postgres-how-to-execute-where-col-in-dynamic-value-list-query/10829760#10829760
        const selectNameML =
          "SELECT name FROM member_list WHERE macaddress = ANY($1::text[])";
        const { rows: joinMemberNames }: QueryResult<MemberName> =
          await queryExcuter(pool, selectNameML, [joinMember]);
        console.log("joinMemberNames", joinMemberNames);

        // メンバーリストにないMACアドレスがポストされた場合、joinMmeberにはそのMACアドレスが追加される。
        // MACアドレスからメンバーの名前を調べて、名前が存在した場合のみSlackに通知
        if (joinMemberNames.length > 0) {
          await sendMessageToSlack(joinMemberNames);
        }
      }

      // 退出した人をactive_memberから削除
      if (exitMember.length > 0) {
        console.log("exec delete");
        const deleteAM =
          "DELETE FROM active_member WHERE macaddress = ANY($1::text[])";
        await queryExcuter(pool, deleteAM, [exitMember]);
        console.log("success delete member");
      }

      res.send("success update");
      res.end();

      return;
    } catch (e) {
      console.log("[UpdateHundlerError]", e);
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

      const selectAM = "SELECT * FROM active_member";
      const { rows: activeMember }: QueryResult<ActiveMember> =
        await queryExcuter(pool, selectAM);
      console.log("[ActiveMember]", activeMember);

      const activeMemberMacaddress: string[] = [];
      activeMember.forEach((ma) => {
        activeMemberMacaddress.push(ma.macaddress);
      });

      console.log("[ActiveMemberMacaddress]", activeMemberMacaddress);

      // MACアドレスから名前を入手
      const selectNameML =
        "SELECT name FROM member_list WHERE macaddress = ANY($1::text[])";
      const { rows: activeMemberNames }: QueryResult<MemberName> =
        await queryExcuter(pool, selectNameML, [activeMemberMacaddress]);
      console.log("[ActiveMemberNames]", activeMemberNames);

      // slackに現在ルームいるメンバーを送信
      await sendMessageToSlack(activeMemberNames);

      res.end();
    } catch (err) {
      console.log(err);
      res.send("ERR: " + err);
    }
  });

  app.get("/healthDb", async (_, res) => {
    try {
      const result = await queryExcuter(
        pool,
        "SELECT * FROM member_list LIMIT 1"
      );
      const results = { test_member_list: result ? result.rows : null };
      res.send(results);
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
