// プロパティを取得
const properties = PropertiesService.getScriptProperties();
const ADMIN_CAP = properties.getProperty("ADMIN_CAP");
const SLACK_TOKEN = properties.getProperty("SLACK_TOKEN");
const CHANNEL_ID = properties.getProperty("CHANNEL_ID");
const CHANNEL_NAME = properties.getProperty("CHANNEL_NAME");
const SALT = properties.getProperty("SALT");
const RES_COUNT = properties.getProperty("RES_COUNT");
const VERIFICATION_TOKEN = properties.getProperty("VERIFICATION_TOKEN");
const THREAD_STOP = properties.getProperty("THREAD_STOP");
const DEFAULT_NAME = properties.getProperty("DEFAULT_NAME");
const SLASH_COMMAND = properties.getProperty("SLASH_COMMAND");

function doPost(e) {
  // リクエストのペイロードとトークンを取得
  let req_payload = e.parameter.payload;
  let verificationToken;
  if (req_payload != null) {
    req_payload = JSON.parse(decodeURIComponent(req_payload));
    verificationToken = req_payload.token;
  } else {
    verificationToken = e.parameter.token
  }

  if (verificationToken == VERIFICATION_TOKEN) {
    // 日付
    let today = new Date();
    let dayStr = Utilities.formatDate(today, 'Asia/Tokyo', 'yyyy/MM/dd');
    let timeStr = Utilities.formatDate(today, 'Asia/Tokyo', 'HH:mm:ss.SS');
    let week = ["(日) ", "(月) ", "(火) ", "(水) ", "(木) ", "(金) ", "(土) "];
    let weekStr = week[today.getDay()];

    // レス検索関数
    searchRes = function (num) {
      let payload = {
        token: SLACK_TOKEN,
        query: 'in:#' + CHANNEL_NAME + ' from:' + num + '：',
        count: '1'
      };
      let params = {
        method: 'get',
        payload: payload
      };

      let result = UrlFetchApp.fetch('https://slack.com/api/search.messages', params);
      return JSON.parse(decodeURIComponent(result))
    };

    // レス投稿関数
    postRes = function (username, text) {
      let payload = {
        token: SLACK_TOKEN,
        channel: CHANNEL_ID,
        unfurl_links: true,
        as_users: false,
        username: username,
        text: text
      };
      let params = {
        method: 'post',
        payload: payload
      };

      UrlFetchApp.fetch('https://slack.com/api/chat.postMessage', params);
    };

    // レス削除関数
    deleteRes = function (num) {
      console.log("Detele start.");
      search_res = searchRes(num);
      search_res_ts = search_res.messages.matches[0].ts;
      deleted_text = "*あぼーん：" + dayStr + weekStr + timeStr + " ID:あぼーん*\nあぼーん";
      let payload = {
        token: SLACK_TOKEN,
        channel: CHANNEL_ID,
        ts: search_res_ts,
        text: deleted_text
      };
      let params = {
        method: 'post',
        payload: payload
      };

      let res = UrlFetchApp.fetch('https://slack.com/api/chat.update', params).getContentText('UTF-8');
      console.log(res);
      console.log("Deleted.");
    };

    // レス内容整形関数
    makeRes = function (resultName, resultPass, resultText, specialName = false, hideID = false) {
      let hideIDFlag = hideID
      let hashInput = dayStr + SALT + slackName
      let id = Utilities.base64EncodeWebSafe(Utilities.computeDigest(Utilities.DigestAlgorithm.MD5, hashInput, Utilities.Charset.UTF_8)).slice(0, 9);
      let resUserName = DEFAULT_NAME
      if (resultName != null && resultName != "") {
        if (resultName.match(/fusianasan/)) {
          let replace_fusiana = "◆" + slackName + "◆";
          resUserName = resultName.replace("fusianasan", replace_fusiana).slice(0, 24);
        } else if (specialName) {
          resUserName = resultName;
        } else {
          resUserName = resultName.replace("◆", "◇").slice(0, 24);
          hideIDFlag = true;
        }
      }
      if (hideIDFlag) id = "???";
      if (resultPass != null && resultPass != "") {
        let trip = Utilities.base64EncodeWebSafe(Utilities.computeDigest(Utilities.DigestAlgorithm.MD5, resultPass, Utilities.Charset.UTF_8)).slice(0, 6);
        resUserName = resUserName + "◆" + trip;
      }
      resultText = "*" + resUserName + "：" + dayStr + weekStr + timeStr + " ID:" + id + "*\n" + resultText;
      return resultText;
    };

    // モーダル（ダイアログ）のレイアウト
    const modal = {
      "title": {
        "type": "plain_text",
        "text": "#" + CHANNEL_NAME + "へ投稿"
      },
      "submit": {
        "type": "plain_text",
        "text": "送信"
      },
      "blocks": [
        {
          "type": "input",
          "block_id": "name",
          "optional": true,
          "element": {
            "type": "plain_text_input",
            "action_id": "text_input"
          },
          "label": {
            "type": "plain_text",
            "text": "名前",
            "emoji": true
          },
          "hint": {
            "type": "plain_text",
            "text": "\"name#trip\"のようにするとトリップが付きます. \"fusianasan\"と入力してはいけません"
          }
        },
        {
          "type": "input",
          "block_id": "text",
          "element": {
            "type": "plain_text_input",
            "action_id": "text_input",
            "multiline": true
          },
          "label": {
            "type": "plain_text",
            "text": "本文",
            "emoji": true
          },
          "hint": {
            "type": "plain_text",
            "text": "\"/" + SLASH_COMMAND + " [name#trip]text\", \"/" + SLASH_COMMAND + " text\"のようにするとモーダルを出さずにそのまま投稿できます."
          }
        }
      ],
      "type": "modal"
    };

    let slackName = ""
    let resultName = ""
    let resultPass = ""
    let resultText = ""
    let specialName = false
    let hideID = false
    let trigger_id

    // ダイアログ経由の投稿を処理
    if (req_payload != null) {
      slackName = req_payload.user.username;
      let name = req_payload.view.state.values.name.text_input.value
      if (name != null) {
        let matchResult = name.toString().match(/([^#]*)(\#(.*))?/);
        resultName = matchResult[1];
        resultPass = matchResult[3];
      }
      resultText = req_payload.view.state.values.text.text_input.value.toString();
    } else {
      // リクエスト内容を取得
      slackName = e.parameter.user_name;
      let command = e.parameter.text;
      trigger_id = e.parameter.trigger_id;

      // 名前とトリップとテキストを取得
      let matchResult = command.match(/(\[([^#]*)(\#(.*))?\])?([\s\S]*)/);
      resultName = matchResult[2];
      resultPass = matchResult[4];
      resultText = matchResult[5];
    }

    // 管理人用コマンドを検知
    if (resultPass == ADMIN_CAP) {
      // 投稿欄に「delete~~~」と記入した場合は削除コマンドを実行
      if (resultText.indexOf("delete") === 0) {
        // "delete 123"のように半角スペース区切りの最後の数字を削除対象のレス番とみなして削除処理を実行
        let split_text = resultText.split(' ');
        let delete_target = split_text[split_text.length - 1];
        deleteRes(delete_target);
      };
      // 投稿欄に「thread stop」と記入した場合は書き込み禁止フラグをtrueにする
      if (resultText == "thread stop") {
        specialName = true;
        hideID = true;
        resultName = "停止しました。。。";
        resultText = "真・スレッドストッパー。。。(￣ー￣)ﾆﾔﾘｯ";
        properties.setProperty("THREAD_STOP", "true");
        postRes("停止：", makeRes(resultName, resultPass, resultText, specialName, hideID));
      };
      // 投稿欄に「thread start」と記入した場合は書き込み禁止フラグをfalseにする
      if (resultText == "thread start") {
        properties.setProperty("THREAD_STOP", "false");
      };
      return ContentService.createTextOutput("");
    };

    // 特定のコマンドを検知
    if (resultText == "hint") {
      specialName = true
      hideID = true
      resultName = "◆ヒント"
      resultText = "/" + SLASH_COMMAND + " hint でヒントメッセージ表示\n\n/" + SLASH_COMMAND + " {text} で投稿（他のChannelからでも可）\n　e.g. /" + SLASH_COMMAND + " 初カキコ...ども...\n\n/" + SLASH_COMMAND + " [{name}]{text} で名前を変更\n　e.g. /" + SLASH_COMMAND + " [八神太一]よろしく＾＾\n\n/" + SLASH_COMMAND + " [{name}#{pass}]{text} でトリップ\n　e.g. /" + SLASH_COMMAND + " [八神太一#yagami]よろしく＾＾\n\n/" + SLASH_COMMAND + " [fusianasan]{text} で……\n　e.g. /" + SLASH_COMMAND + " [fusianasan]これで裏2chに行けるって本当ですか><";
    } else if (resultText == "") {
      let dialog = {
        "token": SLACK_TOKEN,
        "trigger_id": trigger_id,
        "view": JSON.stringify(modal)
      };
      let options = {
        'method': 'post',
        'payload': dialog,
      };
      UrlFetchApp.fetch('https://slack.com/api/views.open', options);
      return ContentService.createTextOutput("");
    } else {
      let ankers = resultText.match(/\>\>([0-9]+)/g)
      if (ankers != null) {
        ankers.forEach(anker => {
          search_res = searchRes(anker.substr(2));
          if (search_res.messages.total > 0) {
            //文字装飾防止で&gt;の前にゼロ幅文字のWORD JOINERを入れてる
            resultText = resultText.replace(anker, "<" + search_res.messages.matches[0].permalink + "|⁠&gt;&gt;" + anker.substr(2) + ">");
          }
        });
      }
      resultText = resultText.replace(/(^|\n|\r\n|\r)/g, "$1 ");
    }

    // スレスト状態の場合は書き込みを行わない
    if (THREAD_STOP == "true") {
      return ContentService.createTextOutput("");
    };

    // レス番とヘッダ
    let resCount = parseInt(RES_COUNT, 10) + 1;
    properties.setProperty("RES_COUNT", resCount);
    let header = resCount + "：";

    // 投稿
    postRes(header, makeRes(resultName, resultPass, resultText, specialName, hideID));

    return ContentService.createTextOutput("");
  }
}