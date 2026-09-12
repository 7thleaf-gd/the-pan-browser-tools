(() => {
  const ACTIONS = [
    ["github",["Merge pull request"],"この変更を対象branchへ取り込む","high","対象branchの内容が変わる",["対象branch","CI状態","競合","Production連動"]],
    ["github",["Squash and merge"],"複数commitを1つにまとめて取り込む","high","対象branch更新＋履歴圧縮",["対象branch","CI状態","履歴をまとめてよいか"]],
    ["github",["Rebase and merge"],"commit履歴を並べ直して取り込む","high","対象branch更新＋履歴形状が変わる",["対象branch","CI状態","履歴方針"]],
    ["github",["Close pull request"],"取り込まずPRを閉じる","medium","PRを閉じるがコード自体は削除しない",["未mergeでよいか","再開可能性"]],
    ["github",["Delete branch"],"branch参照を削除する","high","branch参照が消える",["mainではないか","未merge変更","復元手段"]],
    ["github",["Re-run jobs","Re-run failed jobs"],"CIをもう一度実行する","medium","Actions minutesや課金枠を消費する可能性",["失敗原因","コード変更有無","残り利用枠"]],
    ["github",["New repository secret","New repository variable","Update secret","Update variable"],"実行環境へ設定値を渡す","high","CIや実行環境の挙動が変わる",["SecretかVariableか","値の露出範囲","参照workflow"]],
    ["cloudflare",["Deploy"],"Worker / Pagesの実行版を更新する","high","公開中の実行版が変わる可能性",["PreviewかProductionか","対象project","rollback手段"]],
    ["cloudflare",["Rollback","Rollback deployment"],"以前の実行版へ戻す","high","稼働版が過去versionへ変わる",["戻すversion","DB互換性","現在の障害原因"]],
    ["cloudflare",["Delete Worker","Delete project","Delete Project"],"公開実行物を削除する","critical","URLやWorkerが停止する可能性",["対象名","依存URL","復旧手段"]],
    ["cloudflare",["Add custom domain","Edit custom domain"],"独自ドメインを公開先へ接続する","high","公開先や既存サイトへの到達経路が変わる",["対象host","既存DNS","既存サイト影響"]],
    ["cloudflare",["Add record","Edit record","Delete record"],"DNSの名前解決先を変える","critical","Web・メール等の到達先が変わる可能性",["host","record type","TTL","既存サービス"]],
    ["cloudflare",["Add variable","Add secret"],"Workerへ設定値を渡す","high","Workerの実行挙動が変わる",["Plain textかSecretか","参照コード","環境"]],
    ["cloudflare",["Add route","Add trigger"],"いつ・どのURLでWorkerが動くかを変える","high","自動実行や本番trafficへの介入条件が変わる",["対象URL","実行頻度","Production traffic"]],
    ["supabase",["Enable RLS"],"テーブルへのアクセス制御を有効化する","high","policy次第でアプリから読めなくなる可能性",["既存policy","利用role","SELECT/WRITE要件"]],
    ["supabase",["Disable RLS"],"テーブルのアクセス制御を外す","critical","意図しない公開やデータ漏えいの可能性",["公開範囲","API露出","代替policy"]],
    ["supabase",["Create policy","New policy","Edit policy"],"誰がどのDB操作をできるか決める","high","SELECT / INSERT / UPDATE / DELETE権限が変わる",["対象role","operation","条件式"]],
    ["supabase",["Delete row","Delete rows","Delete selected rows"],"DBの実データを削除する","critical","実データが消える",["対象件数","backup","復元方法"]],
    ["supabase",["Run","Run query"],"SQLをDBへ実行する","dynamic","SQL内容により閲覧だけからschema/data変更まで起こり得る",["SELECTか書込系か","対象DB","transaction/rollback"]],
    ["supabase",["Create function","Edit function","Create trigger","Edit trigger"],"DB裏側の自動処理を変える","high","呼出元や自動処理の副作用が変わる",["呼出元","副作用","Production影響"]]
  ].map(([service,labels,ja,risk,impact,precheck]) => ({service,labels,ja,risk,impact,precheck}));

  const RECOVERY = new Map([
    ["Merge pull request","完全な取消ではなく、通常はrevert commitで打ち消す。"],
    ["Squash and merge","通常はrevert可能。ただし元の複数commit履歴はmerge先では1commitになる。"],
    ["Rebase and merge","通常はrevert可能。ただしmerge先の履歴形状は変わる。"],
    ["Close pull request","再度Openできる場合がある。コード自体は消えない。"],
    ["Delete branch","commitが残っていればbranch再作成で復元できる場合がある。"],
    ["Re-run jobs","実行そのものは取り消せない。完了後の成果物や副作用はworkflow次第。"],
    ["Re-run failed jobs","実行そのものは取り消せない。完了後の成果物や副作用はworkflow次第。"],
    ["New repository secret","値の更新・削除は可能。ただし既に実行済みworkflowの副作用は戻らない。"],
    ["New repository variable","値の更新・削除は可能。ただし既に実行済みworkflowの副作用は戻らない。"],
    ["Update secret","再更新・削除は可能。古い値は画面から復元できない。"],
    ["Update variable","再更新・削除は可能。"],
    ["Deploy","以前のdeploymentへ戻せる構成が多いが、DB変更など別系統の副作用は別途確認。"],
    ["Rollback","再deployで戻し直せることが多い。DB互換性は別途確認。"],
    ["Rollback deployment","再deployで戻し直せることが多い。DB互換性は別途確認。"],
    ["Delete Worker","削除前のsource・設定が残っていなければ復元困難。"],
    ["Delete project","削除前のsource・設定が残っていなければ復元困難。"],
    ["Delete Project","削除前のsource・設定が残っていなければ復元困難。"],
    ["Add custom domain","設定を外せるが、DNSや既存サイト側の変更も元に戻す必要がある。"],
    ["Edit custom domain","元設定を記録していれば戻しやすい。DNS側も確認。"],
    ["Add record","record削除で戻せるが、TTLにより反映が遅れることがある。"],
    ["Edit record","元のrecord値を記録していれば戻せる。TTLにより反映が遅れることがある。"],
    ["Delete record","元のrecord値を控えていれば再作成できる。"],
    ["Add variable","削除・更新可能。既に起動した処理の副作用は別。"],
    ["Add secret","削除・更新可能。元のsecret値は表示されない場合がある。"],
    ["Add route","削除・編集可能。既に流れたtrafficの結果は戻らない。"],
    ["Add trigger","削除・編集可能。既に実行された処理は戻らない。"],
    ["Enable RLS","再度無効化はできるが、policy状態と公開範囲を確認してから戻す。"],
    ["Disable RLS","再度有効化はできるが、無効中に露出したデータは取り消せない。"],
    ["Create policy","policy削除・編集は可能。既に許可/拒否された操作の結果は戻らない。"],
    ["New policy","policy削除・編集は可能。既に許可/拒否された操作の結果は戻らない。"],
    ["Edit policy","元条件を記録していれば戻しやすい。"],
    ["Delete row","backupがなければ復元困難。"],
    ["Delete rows","backupがなければ復元困難。"],
    ["Delete selected rows","backupがなければ復元困難。"],
    ["Run","SQL内容次第。transaction外の変更やDDLは簡単に戻せない場合がある。"],
    ["Run query","SQL内容次第。transaction外の変更やDDLは簡単に戻せない場合がある。"],
    ["Create function","削除・再定義は可能。既に呼ばれた処理の副作用は別。"],
    ["Edit function","元定義を保存していれば戻せる。既に呼ばれた処理の副作用は別。"],
    ["Create trigger","削除可能。既に発火した副作用は戻らない。"],
    ["Edit trigger","元定義を保存していれば戻せる。既に発火した副作用は戻らない。"]
  ]);

  const host = location.hostname;
  const service = host === "github.com" ? "github" : host === "dash.cloudflare.com" ? "cloudflare" : (host === "supabase.com" || host === "app.supabase.com") ? "supabase" : null;
  if (!service) return;

  const normalize = s => (s || "").replace(/\s+/g," ").trim();
  const allowedContext = () => {
    const p = location.pathname;
    if (service === "github") return /\/pull\/\d+/.test(p) || /\/settings\/(secrets|variables)\/actions/.test(p) || /\/actions\//.test(p);
    if (service === "cloudflare") return p.split("/").filter(Boolean).length >= 2;
    if (service === "supabase") return /\/dashboard\/project\//.test(p) || /\/project\//.test(p);
    return false;
  };

  const panel = document.createElement("aside");
  panel.id = "dug-panel";
  panel.hidden = true;
  document.documentElement.appendChild(panel);

  const closePanel = () => { panel.hidden = true; panel.innerHTML = ""; };
  document.addEventListener("keydown", e => { if (e.key === "Escape") closePanel(); });

  function currentSqlText() {
    const textarea = [...document.querySelectorAll("textarea")].find(el => !el.disabled && el.offsetParent !== null && normalize(el.value));
    if (textarea) return textarea.value;
    const monaco = [...document.querySelectorAll(".monaco-editor")].find(el => el.offsetParent !== null);
    if (monaco) return monaco.innerText || monaco.textContent || "";
    const textbox = [...document.querySelectorAll("[role='textbox']")].find(el => el.offsetParent !== null && normalize(el.innerText || el.textContent));
    return textbox ? (textbox.innerText || textbox.textContent || "") : "";
  }

  function classifySql(sql) {
    const cleaned = String(sql || "")
      .replace(/--.*$/gm, " ")
      .replace(/\/\*[\s\S]*?\*\//g, " ")
      .replace(/\s+/g, " ")
      .trim()
      .toUpperCase();
    if (!cleaned) return null;
    if (/\b(DROP|TRUNCATE)\b/.test(cleaned)) return {risk:"critical", impact:"DROP / TRUNCATE を検出。schemaまたは実データを大きく失う可能性", kind:"破壊的SQL"};
    if (/\b(INSERT|UPDATE|DELETE|ALTER|CREATE|GRANT|REVOKE|MERGE)\b/.test(cleaned)) return {risk:"high", impact:"書き込み / schema・権限変更を含むSQLを検出", kind:"書き込みSQL"};
    if (/^(SELECT|WITH)\b/.test(cleaned)) return {risk:"medium", impact:"読み取り系SQLとして判定。ただし関数呼出し等の副作用までは保証しない", kind:"読み取り候補"};
    return {risk:"dynamic", impact:"SQL種別を安全に判定できないため、実行内容を手動確認", kind:"判定保留"};
  }

  function resolveAction(action, sourceText) {
    const recovery = RECOVERY.get(sourceText) || "元の状態を記録してから操作する。";
    if (action.service !== "supabase" || !["Run","Run query"].includes(sourceText)) return {...action, recovery};
    const sql = classifySql(currentSqlText());
    if (!sql) return {...action, recovery, impact:"SQL本文を取得できないため、SELECTか書込系かを手動確認"};
    return {...action, recovery, risk:sql.risk, impact:sql.impact, ja:`SQLをDBへ実行する（${sql.kind}）`};
  }

  function show(action, sourceText) {
    const resolved = resolveAction(action, sourceText);
    const checks = resolved.precheck.map(x => `<li>${escapeHtml(x)}</li>`).join("");
    panel.innerHTML = `
      <button class="dug-close" type="button" aria-label="閉じる">×</button>
      <div class="dug-kicker">DEV UI GUARD JP</div>
      <div class="dug-risk dug-risk-${resolved.risk}">${escapeHtml(resolved.risk.toUpperCase())}</div>
      <h2>${escapeHtml(resolved.ja)}</h2>
      <p class="dug-source">画面の操作: <strong>${escapeHtml(sourceText)}</strong></p>
      <p>${escapeHtml(resolved.impact)}</p>
      <h3>戻せる？</h3>
      <p>${escapeHtml(resolved.recovery)}</p>
      <h3>押す前に確認</h3>
      <ul>${checks}</ul>
      <p class="dug-note">この拡張は説明だけを表示し、元の操作を実行しません。</p>`;
    panel.hidden = false;
    panel.querySelector(".dug-close").addEventListener("click", closePanel, {once:true});
  }

  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"}[c]));
  }

  function scan(root = document) {
    if (!allowedContext()) return;
    const candidates = root.querySelectorAll ? root.querySelectorAll("button,[role='button'],summary") : [];
    for (const el of candidates) {
      if (el.disabled || el.getAttribute("aria-disabled") === "true" || el.hidden) continue;
      const text = normalize(el.innerText || el.getAttribute("aria-label") || el.textContent);
      if (!text) continue;
      if (el.dataset.dugCheckedText === text) continue;
      el.dataset.dugCheckedText = text;

      const oldBadge = el.nextElementSibling?.classList?.contains("dug-badge") ? el.nextElementSibling : null;
      if (oldBadge) oldBadge.remove();

      const action = ACTIONS.find(a => a.service === service && a.labels.includes(text));
      if (!action) continue;

      const badge = document.createElement("button");
      badge.type = "button";
      badge.className = `dug-badge dug-badge-${action.risk}`;
      badge.textContent = "JA?";
      badge.title = "この操作を日本語で確認";
      badge.setAttribute("aria-label", `${text} の意味と影響を日本語で確認`);
      badge.addEventListener("click", ev => {
        ev.preventDefault();
        ev.stopPropagation();
        show(action, text);
      });
      el.insertAdjacentElement("afterend", badge);
    }
  }

  scan();
  let timer = 0;
  const observer = new MutationObserver(() => {
    clearTimeout(timer);
    timer = setTimeout(() => scan(), 120);
  });
  observer.observe(document.documentElement, {childList:true, subtree:true, characterData:true, attributes:true, attributeFilter:["aria-label","aria-disabled","disabled","hidden"]});
})();
