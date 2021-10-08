import axios from "axios";

import { MemberName } from "../index";
import { isProduction } from "../utils/isProduction";

const createMessage = (members: MemberName[]) => {
  let message = "";

  if (members.length === 0) {
    message = "誰もログインしてないわよ";
    return message;
  }

  members.forEach((members) => {
    message += `${members.name} \n`;
  });
  return message;
};

export const sendMessageToSlack = async (members: MemberName[]) => {
  const SLACK_CHANNEL_ID = isProduction()
    ? process.env.PRODUCTION_SLACK_CHANNEL_ID
    : process.env.TEST_SLACK_CHANNEL_ID;
  const message = createMessage(members);

  console.log("message", message);

  const headers = {
    "Content-Type": "application/json",
    Authorization: process.env.SLACK_API_KEY,
  };
  const data = {
    channel: SLACK_CHANNEL_ID,
    text: message,
  };
  await axios({
    method: "post",
    url: "https://slack.com/api/chat.postMessage",
    data,
    headers,
  });
};
