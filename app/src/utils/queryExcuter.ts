import { Pool } from "pg";

// クエリ実行毎にプールへのコネクションとリリースを行う
export const queryExcuter = async (
  pgPool: Pool,
  query: string,
  params?: any
): Promise<any> => {
  const client = await pgPool.connect();

  try {
    const result = await client.query(query, params);
    return result;
  } catch (e) {
    console.log("[QueryError]", e);
  } finally {
    client.release();
  }
};
