//ここを変更してね

var botUrl    = 'https://discordapp.com/api/webhooks/'; //ウェブフックURL
var ssUrl     = 'https://docs.google.com/spreadsheets/'; //スプレッドシートのURL
var discordId = ''; //DiscordのID

//ここまで変更してね



//formが飛んでくるとformFunction()が発動。引数eはイベントの発生内容
function formFunction(e) {
    var sheetName = e.range.getSheet().getName(); //シートの名前を取得
    if (sheetName == 'フォームの回答 1') {
        setRegularTrigger(); //レギュラーシフトならsetRegularTrigger()を発動
    } else if (sheetName == 'フォームの回答 2'){
        deleteCheck(); //出勤登録ならcheckFunction()を発動させるトリガーを消す
    }
};

//discordにメッセージを送る関数
function discord(message) {
    var text    = '<@'+discordId+'> '+message;
    var parse   = 'full';
    var method  = 'post';
    var payload = {
        "content"    : text,
        'parse'      : parse,
    };
    var params  = {
        'method' : method,
        'payload' : payload,
        'muteHttpExceptions': true
    };
    response    = UrlFetchApp.fetch(botUrl, params);
};

//レギュラーシフト登録シートを取得
function getSheetR() {
  　var ss     = SpreadsheetApp.openByUrl(ssUrl); //スプレッドシートの情報を取得
  　var sheetR = ss.getSheetByName('フォームの回答 1'); //シート指定
  　return sheetR;
};

//出勤登録シートを取得
function getSheetA() {
  　var ss     = SpreadsheetApp.openByUrl(ssUrl); //スプレッドシートの情報を取得
  　var sheetA = ss.getSheetByName('フォームの回答 2'); //シート指定
  　return sheetA;
};

//シートの最終行を配列として取得
function getLastArray(sheet) {
    var lastRow    = sheet.getLastRow(); //最終行の行数を取得
    var array = [];
    for (var i=1; i<17; i++) { //最終行を左から一つずつ配列arrayに入れていく
        var currentCell = sheet.getRange(lastRow,i).getValue(); //最終行n列目を取得
        array.push(currentCell); //配列に追加
    }
    var array = array.filter(Boolean); //空白を除去
    return array;
};

//曜日を数字化する関数
function weekNum(key) {
    if (key == '月曜日') {
        return '0';
    } else if (key == '火曜日') {
        return '1';
    } else if (key == '水曜日') {
        return '2';
    } else if (key == '木曜日') {
        return '3';
    } else if (key == '金曜日') {
        return '4';
    }
};

//「毎週何時何分」という指定を一つの関数で行うことはできない
//setRegularTrigger()は毎週何曜日にsetTrigger()を発動するかを指定
//setTrigger()は何時何分にcheckFunction()が発動するかを指定
//この二段階で「毎週何時何分」の指定を実現している

//新たなレギュラーシフトが登録されたとき、setTrigger()をセット
function setRegularTrigger(){
    var newData = getLastArray(getSheetR()); //レギュラーシフト登録シートの一番下の行を取得
    var workDay = (newData.length - 1) / 3; //週の出勤日数を計算
    var days = [ScriptApp.WeekDay.MONDAY, ScriptApp.WeekDay.TUESDAY,
                ScriptApp.WeekDay.WEDNESDAY, ScriptApp.WeekDay.THURSDAY,                                            
                ScriptApp.WeekDay.FRIDAY];
    if (Number.isInteger(workDay)) {
        for (var i=0; i<workDay; i++) {
            var weekNumber = weekNum(newData[i*3+1]);
            ScriptApp.newTrigger('setTrigger') //トリガーをセットするやつ
                .timeBased()
                .atHour(6) //適当な時間。誰も勤務してなさそうな時間にした。
                .everyWeeks(1) //n週に一度を指定
                .onWeekDay(days[weekNumber]) //曜日を設定
                .create();
        }
    } else {
        discord('レギュラーシフト登録がミスってるよ！'); //workDayが整数じゃない場合は登録がおかしいのでエラーを吐く
    }
};

//毎週勤務曜日の朝6～7時に発動して、その日の何時何分にcheckFunction()が発動するかを指定
function setTrigger() {
    var newData = getLastArray(getSheetR()); //レギュラーシフト登録シートの一番下の行を取得
    var date    = new Date(); //今日の日付を取得
    var week    = ['日曜日','月曜日','火曜日','水曜日','木曜日','金曜日','土曜日'][date.getDay()]; //今日が何曜日かを取得
    var weekNum = newData.indexOf(week); //曜日が配列の中の何番目にあるか
    date.setHours(newData[weekNum+1]); //何時か。曜日の一つ右に書かれているはずだよね
    date.setMinutes(newData[weekNum+2]); //何分か。曜日の二つ右に書かれているはずだよね
    ScriptApp.newTrigger('checkFunction') //トリガーをセットするやつ
        .timeBased()
        .at(date) //日時指定
        .create();
};

//発動するまでに出勤登録がされていない場合、この関数を発動するトリガーが残っているはず。
function checkFunction() {
    discord('打刻忘れていませんか？'); //メッセージを送る
    deleteCheck(); //トリガーはきちんと消す
};

//checkFunction()を発動するトリガーを消す。きちんと消さないと勤務日毎にどんどん溜まって大変なことになる。
function deleteCheck() {
    var triggers = ScriptApp.getProjectTriggers(); //現在のプロジェクトのトリガーをすべて配列として取得
    for (var trigger of triggers) {
        if (trigger.getHandlerFunction() == 'checkFunction') { //checkFunction()のトリガーかどうか
            ScriptApp.deleteTrigger(trigger); //そのトリガーを消す
        }
    }
};