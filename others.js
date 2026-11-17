// 診断の結果画面に「ほかの診断も遊ぶ」を出す。
// build-top.ps1 が公開のたびに、公開中の診断の一覧を下の QUIZZES に入れて 公開サイト/others.js を作る（ここは手で直さない）。
// 各診断の index.html には <div id="pocket-others"></div> と <script src="/others.js" defer></script> を入れておく（check.py が確認）。
(function () {
  var QUIZZES = [{"slug":"xmas","title":"クリスマスの過ごし方タイプ診断","color":"#d6334a","q":12},{"slug":"love","title":"恋愛タイプ診断","color":"#ff5c8a","q":12}];
  var box = document.getElementById("pocket-others");
  if (!box) return;
  var me = location.pathname.split("/").filter(Boolean)[0] || "";
  var list = QUIZZES.filter(function (q) { return q.slug !== me; });
  if (!list.length) return;
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }); }
  var html = '<div style="margin-top:22px;padding-top:16px;border-top:1px dashed #ddd;text-align:left">' +
    '<div style="font-weight:700;font-size:15px;margin-bottom:10px">🧪 ほかの診断も遊ぶ</div>';
  list.forEach(function (q) {
    var href = "/" + q.slug + "/?utm_source=pocket&utm_medium=others&utm_campaign=" + encodeURIComponent(me || "top");
    html += '<a href="' + href + '" data-slug="' + esc(q.slug) + '" style="display:flex;gap:10px;align-items:center;text-decoration:none;color:inherit;' +
      'border:2px solid ' + esc(q.color) + ';border-radius:14px;padding:8px;margin-bottom:8px;background:#fff">' +
      '<img src="/' + esc(q.slug) + '/ogp.png" alt="" loading="lazy" style="width:96px;height:50px;object-fit:cover;border-radius:8px;flex:none">' +
      '<span style="flex:1;min-width:0"><b style="display:block;font-size:14px;line-height:1.4">' + esc(q.title) + '</b>' +
      '<small style="color:#888">' + (q.q ? esc(q.q) + "問・" : "") + '約1分</small></span>' +
      '<span style="color:' + esc(q.color) + ';font-weight:700;flex:none">→</span></a>';
  });
  box.innerHTML = html + "</div>";
  box.addEventListener("click", function (e) {
    var a = e.target.closest ? e.target.closest("a[data-slug]") : null;
    if (a && typeof track === "function") track("other_quiz_click", { to: a.getAttribute("data-slug") });
  });
})();
