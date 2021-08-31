import axios from 'axios'
import { MemberList } from '../index'

const createNameList = (members: MemberList[]) => {
  let nameList = "";
  if (members.length > 0) {
    members.forEach((members) => {
      nameList += `${members.name} \n`
    })
    return nameList
  }

  nameList = "誰もログインしてないわよ"
  return nameList
}

export const sendMessageToSlack = async (members: MemberList[]) => {
  const names = createNameList(members)
  console.log('names', names)

  const headers = {
    'Content-Type': 'application/json',
    Authorization: process.env.SLACK_API_KEY,
  };
  const data = {
    channel: process.env.SLACK_CHANNEL_ID,
    text: names
  };
  await axios({
    method: 'post',
    url: 'https://slack.com/api/chat.postMessage',
    data,
    headers,
  });
}