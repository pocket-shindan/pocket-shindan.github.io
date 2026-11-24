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
  // フォローの呼びかけ（2026-11-17〜。文を変えるときはここだけ直せば全部の診断に反映される。
  // 変えたら _引き継ぎ.md に日付を書いて、GA4 の follow_click を前後で比べる）
  var FOLLOW_TOP = "🧪 毎日18時、ラボちゃんの研究日誌が届く！\nフォローはこちら →";   // \n で改行
  var FOLLOW_BOTTOM = "＋ フォローして新しい診断とラボちゃんの研究日誌を受け取る";
  var FOLLOW_URL = "https://x.com/intent/follow?screen_name=pocket_shindan";
  function followSet(code) {
    var bottom = document.getElementById("followBtn");
    if (bottom) bottom.textContent = FOLLOW_BOTTOM;
    var top = document.getElementById("pocket-follow-top");
    if (!top || top.firstChild) return;
    var a = document.createElement("a");
    a.href = FOLLOW_URL; a.target = "_blank"; a.rel = "noopener";
    a.style.cssText = "display:block;margin:10px 0 4px;padding:9px 12px;border-radius:12px;background:#f3f0ff;color:#5b3fd1;" +
      "font-weight:700;font-size:13px;text-decoration:none;text-align:center;line-height:1.5;white-space:pre-line;";
    a.textContent = FOLLOW_TOP;
    a.onclick = function () { if (typeof track === "function") track("follow_click", { result_type: code, position: "top" }); };
    top.appendChild(a);
  }
  // ---- 友だち相性（2026-11-17〜）----------------------------------------------
  // 結果画面の「友だちに送って相性を見る」で ?pair=<自分のタイプ> 付きのリンクを送る。
  // 友だちがそのリンクから診断すると、結果画面に「2人の相性」が出る。サーバーは使わない（URL だけで受け渡す）。
  // 各診断の TYPES と bestMatch(code) を使う（どちらも index.html のグローバル）。枠は <div id="pocket-pair"></div>。
  var PAIR_TIERS = [   // 「相手の相性◎のタイプ」から何文字ちがうかで決める（0=相性◎）
    { mark: "◎", pct: 96, word: "最高の相性！", note: "一緒にいると自然体でいられる2人。おたがいの足りないところを、気づかないうちに補い合えます" },
    { mark: "○", pct: 82, word: "いい相性", note: "ちょうどいい違いがある2人。相手のやり方を面白がれると、もっと仲よくなれます" },
    { mark: "△", pct: 67, word: "ちょっと刺激的", note: "考え方がけっこう違う2人。だからこそ、話すたびに新しい発見があります" },
    { mark: "☆", pct: 58, word: "正反対コンビ", note: "見ている世界がまるで違う2人。歩み寄れたら、いちばん頼もしいコンビになれます" }
  ];
  var hasTypes = function () { return typeof TYPES !== "undefined" && typeof bestMatch === "function"; };
  var pairFrom = (function () {
    try { var c = (new URLSearchParams(location.search).get("pair") || "").toUpperCase(); return c; } catch (e) { return ""; }
  })();
  function pairValid(c) { return hasTypes() && c && Object.prototype.hasOwnProperty.call(TYPES, c); }
  function pairScore(a, b) {
    if (a === b) return { mark: "≒", pct: 74, word: "似たものどうし", note: "同じタイプの2人。言わなくてもわかり合えるぶん、ゆずり合いを忘れずに" };
    var best = bestMatch(a), d = 0;
    for (var i = 0; i < 3; i++) if (best[i] !== b[i]) d++;
    return PAIR_TIERS[Math.min(d, 3)];
  }
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }); }
  function tname(c) { var t = TYPES[c]; return t.emoji + t.name; }
  function baseUrl() { return location.href.split("#")[0].split("?")[0].replace(/index\.html$/, "").replace(/\/?$/, "/"); }
  var pbtn = "display:block;width:100%;box-sizing:border-box;text-align:center;margin-top:8px;padding:12px 16px;border-radius:999px;font-weight:700;font-size:15px;cursor:pointer;text-decoration:none;font-family:inherit;";
  // 2人の相性のカード（a＝誘った人、b＝リンクから診断した人）
  function pairCard(a, b, title) {
    var s = pairScore(a, b);
    return '<div style="margin:14px 0 6px;padding:14px;border-radius:16px;background:linear-gradient(135deg,#fff0f5,#f3f0ff);text-align:center">' +
      '<div style="font-size:13px;color:#888">' + esc(title) + '</div>' +
      '<div style="font-size:15px;font-weight:700;margin:4px 0">' + esc(tname(a)) + ' × ' + esc(tname(b)) + '</div>' +
      '<div style="font-size:30px;font-weight:800;color:#e91e63">' + s.mark + ' ' + s.pct + '%</div>' +
      '<div style="font-weight:700;margin:2px 0 6px">' + esc(s.word) + '</div>' +
      '<div style="font-size:13px;color:#555;line-height:1.7;text-align:left">' + esc(s.note) + '</div></div>';
  }
  // LINE に「文＋リンク」を渡す（2026-11-25〜）。前の social-plugins.line.me/lineit/share は URL しか渡せず、文が届いていなかった
  function lineHref(text, url) { return "https://line.me/R/share?text=" + encodeURIComponent(text + (url ? "\n" + url : "")); }
  function quizName() { return (document.title || "").split(/[｜|]/)[0].trim() || "ポケット診断"; }
  // 2人の相性の画像（1080×1080）をその場で作る（2026-11-25〜）
  function pairImage(a, b, cb) {
    try {
      var s = pairScore(a, b), W = 1080, c = document.createElement("canvas");
      c.width = W; c.height = W;
      var x = c.getContext("2d"), F = '"Hiragino Sans","Hiragino Kaku Gothic ProN","Yu Gothic","Meiryo",sans-serif';
      var g = x.createLinearGradient(0, 0, W, W); g.addColorStop(0, "#ffd6e4"); g.addColorStop(1, "#e4dcff");
      x.fillStyle = g; x.fillRect(0, 0, W, W);
      var r = 48, L = 60, T = 60, R = W - 60, B = W - 60;   // 白いカード（角丸）
      x.beginPath(); x.moveTo(L + r, T); x.lineTo(R - r, T); x.quadraticCurveTo(R, T, R, T + r); x.lineTo(R, B - r); x.quadraticCurveTo(R, B, R - r, B);
      x.lineTo(L + r, B); x.quadraticCurveTo(L, B, L, B - r); x.lineTo(L, T + r); x.quadraticCurveTo(L, T, L + r, T); x.closePath();
      x.fillStyle = "#fff"; x.fill();
      x.textAlign = "center"; x.textBaseline = "middle";
      var t = function (str, px, color, y, weight) { x.font = (weight || "700") + " " + px + "px " + F; x.fillStyle = color; x.fillText(str, W / 2, y); };
      t(quizName(), 44, "#c2185b", 150);
      t("2人の相性", 34, "#888", 210, "500");
      var ta = TYPES[a], tb = TYPES[b];
      x.font = "130px " + F; x.fillText(ta.emoji, 300, 350); x.fillText(tb.emoji, 780, 350);
      x.font = "700 64px " + F; x.fillStyle = "#e91e63"; x.fillText("×", 540, 350);
      x.font = "700 46px " + F; x.fillStyle = "#333"; x.fillText(ta.name, 300, 470); x.fillText(tb.name, 780, 470);
      t(s.mark + " " + s.pct + "%", 150, "#e91e63", 610, "800");
      t(s.word, 58, "#333", 730);
      x.font = "500 34px " + F; x.fillStyle = "#555";   // ひとこと（折り返し）
      var line = "", y = 810, chars = Array.from(s.note);
      for (var i = 0; i < chars.length; i++) {
        if (x.measureText(line + chars[i]).width > 820) { x.fillText(line, W / 2, y); line = ""; y += 50; }
        line += chars[i];
      }
      if (line) x.fillText(line, W / 2, y);
      t("pocket-shindan.github.io  @pocket_shindan", 28, "#aaa", 975, "500");
      c.toBlob(function (blob) { cb(blob); }, "image/png");
    } catch (e) { cb(null); }
  }
  // コピー（https でないときの予備つき）
  function copyText(text, el, label) {
    var done = function () { el.textContent = "コピーしました ✓"; setTimeout(function () { el.textContent = label; }, 2000); };
    if (navigator.clipboard && window.isSecureContext) navigator.clipboard.writeText(text).then(done, function () {});
    else { var ta = document.createElement("textarea"); ta.value = text; document.body.appendChild(ta); ta.select(); try { document.execCommand("copy"); done(); } catch (e) {} ta.remove(); }
  }
  // 相性の結果を見せるリンク ?duo=<誘った人>-<診断した人>（2026-11-25〜）
  // 相性を出した人が「この相性を相手に送る」で送る。開いた人は診断しなくても2人の相性が見られる
  var duo = (function () {
    try { var v = (new URLSearchParams(location.search).get("duo") || "").toUpperCase().split("-"); return v.length === 2 ? v : []; } catch (e) { return []; }
  })();
  // 友だちから届いたリンクで開いたとき：はじめの画面に案内を出す
  document.addEventListener("DOMContentLoaded", function () {
    var start = document.getElementById("start");
    if (start && duo.length === 2 && pairValid(duo[0]) && pairValid(duo[1])) {   // 相性の結果が届いた人
      var r = document.createElement("div");
      r.innerHTML = '<div style="text-align:center;font-weight:700;color:#c2185b;font-size:14px">💞 相性の結果が届きました！</div>' +
        pairCard(duo[0], duo[1], "2人の相性") +
        '<div style="text-align:center;font-size:12px;color:#888;margin:6px 0 14px">下の「診断をはじめる」で、自分でも遊べます</div>';
      start.insertBefore(r, start.firstChild);
      if (typeof track === "function") track("pair_view", { from_type: duo[0], result_type: duo[1] });
      return;
    }
    if (!pairValid(pairFrom) || !start) return;
    var b = document.createElement("div");
    b.style.cssText = "margin:0 0 14px;padding:12px;border-radius:14px;background:#fff4f8;border:2px dashed #ff8fb1;color:#c2185b;font-weight:700;font-size:14px;line-height:1.6;text-align:center;";
    b.innerHTML = "💌 " + esc(tname(pairFrom)) + " の友だちから<br>相性チェックが届きました！<br><span style='font-weight:500;color:#666;font-size:12px'>診断すると、2人の相性がわかります</span>";
    start.insertBefore(b, start.firstChild);
    if (typeof track === "function") track("pair_open", { from_type: pairFrom });
  });
  function pairSet(code) {
    var box = document.getElementById("pocket-pair");
    if (!box || !hasTypes()) return;
    var html = "";
    var base = baseUrl();
    var duoLink = "", duoMsg = "";
    if (pairValid(pairFrom)) {   // 友だちのリンクから来た人：2人の相性を出す＋その結果を相手に送れる
      var s = pairScore(pairFrom, code);
      html += pairCard(pairFrom, code, "友だちとの相性");
      duoLink = base + "?duo=" + pairFrom.toLowerCase() + "-" + code.toLowerCase() + "&utm_source=pair&utm_medium=result";
      duoMsg = "【" + quizName() + "】2人の相性が出たよ💞\n" + tname(pairFrom) + "（あなた）× " + tname(code) + "（わたし）\n" + s.mark + " " + s.pct + "%「" + s.word + "」\nくわしい結果はこちら👇";
      html += '<div style="padding:12px;border-radius:16px;border:2px solid #e91e63;background:#fff">' +
        '<div style="font-weight:700;text-align:center">💌 この相性を相手に送る</div>' +
        '<div style="font-size:12px;color:#888;text-align:center;margin:2px 0 4px">リンクを開くと、相手も2人の相性が見られます</div>' +
        '<a id="duoLine" target="_blank" rel="noopener" style="' + pbtn + 'background:#06C755;color:#fff;border:none" href="' + lineHref(duoMsg, duoLink) + '">LINE で相手に送る</a>' +
        '<button type="button" id="duoImg" style="' + pbtn + 'background:#e91e63;color:#fff;border:none">📷 相性の画像を送る</button>' +
        '<button type="button" id="duoMore" style="' + pbtn + 'background:#fff;color:#333;border:2px solid #ccc">' + (navigator.share ? "その他のアプリで送る" : "結果とリンクをコピー") + '</button></div>';
      if (typeof track === "function") track("pair_result", { from_type: pairFrom, result_type: code, mark: s.mark });
    }
    // だれでも：自分のタイプ付きのリンクを友だちに送る
    var link = base + "?pair=" + code.toLowerCase() + "&utm_source=pair&utm_medium=" + "invite";
    var msg = "【" + quizName() + "】で相性チェックしよう！\nわたしは「" + tname(code) + "」だったよ。\n下のリンクから12問（約1分）答えると、2人の相性がわかるよ💞";
    html += '<div style="margin-top:14px;padding:12px;border-radius:16px;border:2px solid #ffb3c8;background:#fff">' +
      '<div style="font-weight:700;text-align:center">💞 友だちとの相性を見る</div>' +
      '<div style="font-size:12px;color:#888;text-align:center;margin:2px 0 4px">このリンクから友だちが診断すると、2人の相性が出ます</div>' +
      '<a id="pairLine" target="_blank" rel="noopener" style="' + pbtn + 'background:#06C755;color:#fff;border:none" href="' + lineHref(msg, link) + '">LINE で友だちに送る</a>' +
      '<button type="button" id="pairMore" style="' + pbtn + 'background:#fff;color:#333;border:2px solid #ccc">' + (navigator.share ? "その他のアプリで送る" : "リンクをコピーして送る") + '</button></div>';
    box.innerHTML = html;
    if (duoLink) {
      document.getElementById("duoLine").onclick = function () { if (typeof track === "function") track("pair_share", { from_type: pairFrom, result_type: code, method: "line" }); };
      var dm = document.getElementById("duoMore");
      dm.onclick = function () {
        if (typeof track === "function") track("pair_share", { from_type: pairFrom, result_type: code, method: navigator.share ? "native" : "copy" });
        if (navigator.share) { navigator.share({ text: duoMsg, url: duoLink }).catch(function () {}); return; }
        copyText(duoMsg + "\n" + duoLink, dm, "結果とリンクをコピー");
      };
      var di = document.getElementById("duoImg");
      di.onclick = function () {
        var label = di.textContent;
        di.textContent = "画像を作っています…";
        pairImage(pairFrom, code, function (blob) {
          di.textContent = label;
          if (!blob) return;
          var file = new File([blob], "aisho.png", { type: "image/png" });
          var text = duoMsg + "\n" + duoLink;
          // スマホ：共有メニューで画像を送る（LINE・Instagram など）。できないとき（PC など）は画像を保存する
          if (navigator.canShare && navigator.canShare({ files: [file] })) {
            if (typeof track === "function") track("pair_share", { from_type: pairFrom, result_type: code, method: "image" });
            navigator.share({ files: [file], text: text }).catch(function () {});
          } else {
            if (typeof track === "function") track("pair_share", { from_type: pairFrom, result_type: code, method: "image_save" });
            var a = document.createElement("a");
            a.href = URL.createObjectURL(blob); a.download = "aisho.png";
            document.body.appendChild(a); a.click(); a.remove();
            di.textContent = "画像を保存しました ✓（送るときに添付してね）";
            setTimeout(function () { di.textContent = label; }, 3500);
          }
        });
      };
    }
    document.getElementById("pairLine").onclick = function () { if (typeof track === "function") track("pair_invite", { result_type: code, method: "line" }); };
    var more = document.getElementById("pairMore");
    more.onclick = function () {
      if (typeof track === "function") track("pair_invite", { result_type: code, method: navigator.share ? "native" : "copy" });
      if (navigator.share) { navigator.share({ text: msg, url: link }).catch(function () {}); return; }
      var all = msg + "\n" + link;
      var done = function () { more.textContent = "コピーしました ✓"; setTimeout(function () { more.textContent = "リンクをコピーして送る"; }, 2000); };
      if (navigator.clipboard && window.isSecureContext) navigator.clipboard.writeText(all).then(done, function () {});
      else { var ta = document.createElement("textarea"); ta.value = all; document.body.appendChild(ta); ta.select(); try { document.execCommand("copy"); done(); } catch (e) {} ta.remove(); }
    };
  }

  window.pocketShareSet = function (d) {
    var box = document.getElementById("pocket-share");
    if (d) { followSet(d.code); try { pairSet(d.code); } catch (e) {} }
    if (!box || !d) return;
    var body = plain(d.text);
    var url = /^https?:/.test(d.url || "") ? d.url : "";
    var all = body + (url ? "\n" + url : "");
    box.innerHTML = "";
    var line = document.createElement("a");
    line.href = lineHref(body, url || location.href);
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
