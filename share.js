// 診断の結果画面に「LINE で送る」「その他のアプリで共有」「リンクをコピー」を出す（X のボタンは各診断の index.html にある）。
// build-top.ps1 が公開のたびに 公開サイト/share.js にコピーする。新作でも同じものを使う。
// 各診断の index.html には次の3つを入れる（check.py が確認）:
//   <div id="pocket-share"></div>（X のシェアボタンの下）
//   showResult の中で pocketShareSet({ text: 共有する文, url: タイプ別ページの URL, code: タイプのコード })
//   <script src="/share.js" defer></script>
// 押された回数は GA4 の share_click（method = line / native / copy）で数える。
(function () {
  function plain(text) {   // LINE・コピー用：ハッシュタグの行は外す
    return text.split("\n").filter(function (l) { return !/^#/.test(l.trim()); }).join("\n").replace(/\n+$/, "");
  }
  function log(method, code) { if (typeof track === "function") track("share_click", { result_type: code, method: method }); }
  var btn = "display:block;width:100%;box-sizing:border-box;text-align:center;margin-top:8px;padding:12px 16px;border-radius:999px;" +
    "font-weight:700;font-size:15px;cursor:pointer;text-decoration:none;font-family:inherit;";
  window.pocketShareSet = function (d) {
    var box = document.getElementById("pocket-share");
    if (!box || !d) return;
    var body = plain(d.text);
    var url = /^https?:/.test(d.url || "") ? d.url : "";
    var all = body + (url ? "\n" + url : "");
    box.innerHTML = "";
    var line = document.createElement("a");
    line.href = "https://social-plugins.line.me/lineit/share?url=" + encodeURIComponent(url || location.href) + "&text=" + encodeURIComponent(body);
    line.target = "_blank"; line.rel = "noopener";
    line.style.cssText = btn + "background:#06C755;color:#fff;border:none;";
    line.textContent = "LINE で送る";
    line.onclick = function () { log("line", d.code); };
    box.appendChild(line);
    if (navigator.share) {   // スマホの共有メニュー（Instagram・Threads なども選べる）。PC では出ないことがある
      var nat = document.createElement("button");
      nat.type = "button";
      nat.style.cssText = btn + "background:#fff;color:#333;border:2px solid #ccc;";
      nat.textContent = "その他のアプリで共有";
      nat.onclick = function () {
        log("native", d.code);
        navigator.share({ text: body, url: url || undefined }).catch(function () {});
      };
      box.appendChild(nat);
    }
    var copy = document.createElement("button");
    copy.type = "button";
    copy.style.cssText = btn + "background:transparent;color:#666;border:1px dashed #bbb;font-weight:500;";
    copy.textContent = "結果とリンクをコピー";
    copy.onclick = function () {
      log("copy", d.code);
      var done = function () { copy.textContent = "コピーしました ✓"; setTimeout(function () { copy.textContent = "結果とリンクをコピー"; }, 2000); };
      if (navigator.clipboard && window.isSecureContext) navigator.clipboard.writeText(all).then(done, fallback); else fallback();
      function fallback() {
        var ta = document.createElement("textarea"); ta.value = all; ta.style.position = "fixed"; ta.style.opacity = "0";
        document.body.appendChild(ta); ta.select();
        try { document.execCommand("copy"); done(); } catch (e) {}
        ta.remove();
      }
    };
    box.appendChild(copy);
  };
})();
