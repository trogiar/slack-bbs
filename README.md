# slack_bbs
Slackのチャンネルに匿名掲示板風の投稿機能を付与するSlack app

# 概要
入力されたメッセージをGASで処理して、匿名掲示板の書き込み風にしたうえで特定のチャンネルに投稿します。  

# 使い方
任意のチャンネルでスラッシュコマンドを使ってコメントを書き込むと、Slack appを介して書き込みが匿名化されチャンネルに投稿されます。  
書き込み時には、ユーザごとにユニークなIDが採番され、同じユーザの発言が分かるようになっています。  
IDは日付が変わるとリセットされます。  
書き込みコマンドを実行するチャンネルはどこでも構わないので、自分宛てのDM内で実行すれば誤爆を防止できます。

## 書き込みかた（SLASH_COMMANDが"2ch"に設定されている場合）

### 名無しさんとして書き込む場合
任意のSlackチャンネルで `/2ch テスト` と入力して送信すると、名無しさん名義で「テスト」と書き込まれます。  

### コテハンとして書き込む場合
任意のSlackチャンネルで `/2ch [コテハン]テスト` と入力して送信すると、「コテハン」という名前のユーザ名義で「テスト」と書き込まれます。  

### トリップ付きコテハンとして書き込む場合
任意のSlackチャンネルで `/2ch [コテハン#pass]テスト` と入力して送信すると、「コテハン◆Gh3JHJ」という名前のユーザ名義で「テスト」と書き込まれます。  
"◆"以降の文字列は、書き込み時に"#"以降に入力された「pass」という文字列をもとにして生成されたユニークなハッシュ値なので、これを使って、日付をまたいでも同じユーザであることを保証できます。  
トリップを使用していないユーザが名前欄に `ユーザ◆Gh3JHJ` のように入力して他者のトリップを偽ろうとすると、投稿時に"◆"が"◇"に置き換わり `ユーザ◇Gh3JHJ` のようになるので、嘘がバレます。

### ヒントメッセージを表示する場合
任意のSlackチャンネルで `/2ch hint` と入力して送信すると、書き込み方法を記載したメッセージが投稿されます。  

### fusianasan
任意のSlackチャンネルで `/2ch [fusianasan]テスト` と入力して送信すると……。

### モーダルを使って書き込む場合
任意のSlackチャンネルで `/2ch` と入力して送信すると、投稿用のモーダルが表示されます。  
名前欄に `コテハン#pass` のようにユーザ名やトリップを入力し、本文欄に `テスト` のようにコメント本文を入力して「送信」ボタンを押すと、コマンドを使った場合と同じようにメッセージが投稿されます。  
名前欄は空欄でも構わず、その場合はデフォルトの名無しさん名義で投稿されます。

## 管理人コマンド
通常の書き込みと同じようにコマンドやモーダルを使って書き込む際、 `/2ch [管理人#adminPass]管理人コマンド` のように、トリップに特定の文字列を入力すると、管理人専用のコマンドを実行できます。  
管理人コマンドを実行するためのトリップ（上記例における「adminPass」の部分）は、環境構築時にGASで設定する環境変数 `ADMIN_CAP` で設定したものです。  
ユーザ名（上記例におけるトリップの前についている「管理人」の部分）は任意の文字列でOKです。

### 書き込み削除
看過できないレベルの深刻なコンプライアンス違反が発生した際の緊急対応のための機能です。  
`/2ch [管理人#adminPass]delete 100` のように、管理人コマンドの本文に「delete {任意のレス番}」を入力して実行すると、指定した番号の書き込みを削除できます。  
削除された書き込みはユーザ名、ID、本文がすべて「あぼーん」という文字列に置き換わります。

### 書き込み停止
インシデントや大規模改修などにともなって全ユーザの書き込みを停止させたい時のための機能です。  
`/2ch [管理人#adminPass]thread stop` のように、管理人コマンドの本文に「thread stop」を入力して実行すると、書き込みが停止した旨のメッセージが投稿され、ユーザに関わらず、それ以降の投稿ができなくなります。（いわゆるスレッドストップ＝スレスト状態）  
`/2ch [管理人#adminPass]thread start` のように、「thread start」を入力するとスレスト状態を解除し、再び書き込めるようになります。

# 初期設定方法

## Google Apps Script
1. Google Apps Scriptのプロジェクトを作成し、`gas/src/main.gs`の内容を転記する。
   アクセス権限はプライベートでOK。
1. モーダルに記載する文言などを適宜編集して保存する。
1. スクリプトのプロパティ値に以下の情報を登録する。Slack appのslash_commandsとTokenについては後で入力する。
   | property | value |
   ----|---- 
   | ADMIN_CAP | [管理人モードを発動するためのキー] |
   | CHANNEL_ID | [匿名掲示板化する対象のSlackチャンネルID] |
   | CHANNEL_NAME | [匿名掲示板化する対象のSlackチャンネル名] |
   | THREAD_STOP | [掲示板を緊急停止する場合に使うフラグ。新規作成時は"false"でいい] |
   | DEFAULT_NAME | [名無しユーザのデフォルトネーム] |
   | RES_COUNT | [現在のレス番（新規作成時は0でいい）] |
   | SALT | [書き込みIDの暗号化に使う適当な文字列] |
   | SLASH_COMMAND | [Slack appで設定したslash_commands ] |
   | SLACK_TOKEN | [Slack appのUser OAuth Token] |
   | VERIFICATION_TOKEN | [Slack appのVerification Token] |
1. 公開→ウェブアプリケーションとして導入からアプリケーションのデプロイを実行。デプロイ時のパラメータは以下の通り。
   ```
   Project version: New
   Execute the app as: Me
   Who has access to the app: Anyone, even anonymous
   ```
   デプロイ後に発行されたWeb app URLをメモしておく。

## Slack app
1. [ワークスペースカスタマイズのYour Appsページ](https://api.slack.com/apps/)からAppを新規作成する。
1. Edit Manifestで表示されるManifestに`slack_app/manifest.yml`の内容を転記する。
1. Manifestの"Enter web app URL of Google Apps Script here."の部分にはGASで発行したWeb app URLを記入する。
1. Manifestのslash_commandsなどを適宜編集して保存する。
1. Slack appのIconとDescriptionを適宜編集する。
1. 設定したslash_commandsをGASのプロパティ値に入力する。
1. OAuth & PermissionsからUser OAuth Tokenを取得してGASのプロパティ値に入力する。
1. Basic InformationからVerification Tokenを取得してGASのプロパティ値に入力する。
1. Reinstallなどを促すメッセージが出たらそれに従う。

# 更新方法

## Google Apps Script
1. Google Apps Scriptのコードを適宜編集し、 `デプロイ` -> `新しいデプロイ` から新たなバージョンのAppsを作成する。
1. 作成が完了すると、新規でWeb app URLが発行されるので、これをメモしておく。

## Slack app
1. [ワークスペースカスタマイズのYour Appsページ](https://api.slack.com/apps/)から、更新対象のアプリの設定画面を開く
1. Interactivity & ShortcutsのRequest URLを、先程メモしておいた新たなWeb app URLに上書きする
1. Slash CommandsのRequest URLを、先程メモしておいた新たなWeb app URLに上書きする
