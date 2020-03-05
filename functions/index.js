const functions = require("firebase-functions");
const admin = require("firebase-admin");
admin.initializeApp();
const request = require("request-promise");

const LINE_MESSAGING_API = "https://api.line.me/v2/bot/message";
const LINE_HEADER = {
  "Content-Type": "application/json",
  Authorization: `Bearer ${functions.config().line.apikey}`
};

exports.LineBotTranslator = functions.https.onRequest(async (req, res) => {
  const event = req.body.events[0];
  const source = event.source;

  let chatId = "";
  if (source.type === "user") {
    chatId = source.userId;
  } else if (source.type === "group") {
    chatId = source.groupId;
  } else if (source.type === "room") {
    chatId = source.roomId;
  }

  if (event.message.type === "text") {
    const input = event.message.text;
    try {
      await admin
        .firestore()
        .collection("translations")
        .doc("inputText")
        .set({ input, chatId });
      console.log("Document successfully written!");
    } catch (error) {
      console.error("Error writing document: ", error);
    }
  }
  return res.status(200).send(req.method);
});

exports.LineBotPush = functions.firestore
  .document("translations/inputText")
  .onWrite(async (change, context) => {
    const latest = change.after.data();
    const input = latest.input;
    const containsJapanese = input.match(
      /[\u3000-\u303f\u3040-\u309f\u30a0-\u30ff\uff00-\uff9f\u4e00-\u9faf\u3400-\u4dbf]/
    );
    if (containsJapanese) {
      push(latest.chatId, latest.translated.th);
    } else {
      push(latest.chatId, latest.translated.ja);
    }
  });

const push = (id, msg) => {
  return request.post({
    headers: LINE_HEADER,
    uri: `${LINE_MESSAGING_API}/push`,
    body: JSON.stringify({
      to: id,
      messages: [
        {
          type: "text",
          text: msg
        }
      ]
    })
  });
};
