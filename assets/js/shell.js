'use strict';

(() => {
  const STORAGE_KEY = 'thepan-tools-lang';
  const root = document.documentElement;
  const pathname = location.pathname.replace(/\/+$/, '');
  const slug = pathname.split('/').filter(Boolean).pop() || '';
  const knownSlugs = new Set(['image-machine','tape','visualizer','object-wrong','panda-dub','tools','about']);
  const current = knownSlugs.has(slug) ? slug : '';

  const titles = {
    'image-machine': { en: 'THE PAN IMAGE MACHINE — CREATE. PLAY. DISTORT.', ja: 'THE PAN IMAGE MACHINE — 画像を壊して遊ぶ' },
    tape: { en: 'THE PAN TAPE MACHINE — DESTROY YOUR CLEAN AUDIO.', ja: 'THE PAN TAPE MACHINE — 音をテープで壊す' },
    visualizer: { en: 'THE PAN LIVE VISUALIZER — BREAK THE CAMERA.', ja: 'THE PAN LIVE VISUALIZER — 映像信号を壊す' },
    'object-wrong': { en: 'Object Wrong Machine — THE PAN Browser Tools', ja: 'Object Wrong Machine — 物体をバグらせる' },
    'panda-dub': { en: 'PANDA DUB — THE PAN Browser Tools', ja: 'PANDA DUB — ブラウザで遊べるダブ・マシン' },
    tools: { en: 'Tools — THE PAN Browser Tools', ja: 'ツール一覧 — THE PAN Browser Tools' },
    about: { en: 'About — THE PAN Browser Tools', ja: 'このツールについて — THE PAN Browser Tools' }
  };

  const JA = {
    'Skip to image controls':'画像コントロールへ移動',
    'Skip to tape controls':'テープコントロールへ移動',
    'Skip to visualizer controls':'映像コントロールへ移動',
    'Skip to PANDA DUB':'PANDA DUBへ移動',
    'Skip to tools':'ツール一覧へ移動',
    'Skip to about':'このサイトについてへ移動',
    'LOCAL PROCESSING':'端末内処理',
    'LOCAL AUDIO':'端末内オーディオ',
    'FREE TO USE':'無料で使えます',
     'LOCAL FIRST':'端末内処理',
     'BROWSER-BASED IMAGE DESTRUCTION APPARATUS':'ブラウザで動く画像破壊マシン',
    'CREATE.':'つくる。',
    'PLAY.':'あそぶ。',
    'DISTORT.':'ゆがめる。',
     'Load an image. Break the signal. Export the result. Nothing is uploaded—every pixel stays in your browser.':'画像を読み込む。壊す。書き出す。画像データはアップロードされず、処理はすべてブラウザ内で完結します。',
    'LOAD IMAGE':'画像を読み込む',
    'PNG / JPEG / WEBP / GIF · DROP OR SELECT':'PNG / JPEG / WEBP / GIF · ドロップまたは選択',
    'MONITOR / OUTPUT PREVIEW':'モニター / 出力プレビュー',
    'NO SIGNAL':'信号なし',
    'INPUT REQUIRED':'入力してください',
    'DROP IMAGE HERE':'ここに画像をドロップ',
    'OR BROWSE FILES →':'またはファイルを選ぶ →',
     'PRIVATE BY DESIGN / NO SERVER UPLOAD':'端末内処理 / サーバー送信なし',
     'ORIGINAL':'元画像',
     'CURRENT':'加工後',
    'COMPARE':'比較',
    'FULLSCREEN PREVIEW':'全画面プレビュー',
    'PROCESSING SIGNAL…':'処理中…',
    'CONTROL BANK / FX':'コントロール / FX',
    '● LIVE':'● 稼働中',
    'PRESET SIGNALS':'プリセット',
    'NONE':'なし',
    'BASIC':'基本',
    'PIXELATE':'ピクセル化',
    'BLUR':'ぼかし',
    'CONTRAST':'コントラスト',
    'BRIGHTNESS':'明るさ',
    'RESET BASIC':'基本をリセット',
    'WARP':'変形',
    'WAVE':'波形',
    'MELT':'溶かす',
     'HORIZONTAL TEAR':'横ズレ',
    'RESET WARP':'変形をリセット',
    'SIGNAL':'信号',
    'RGB SPLIT':'RGBずらし',
    'SCANLINE':'走査線',
    'BLOCK DAMAGE':'ブロック破壊',
    'RESET SIGNAL':'信号をリセット',
    'TEXTURE':'質感',
     'GRAIN':'粒状感',
    'NOISE':'ノイズ',
    'RESET TEXTURE':'質感をリセット',
     'PRINT':'プリント',
    'DITHER':'ディザ',
    'HALFTONE':'網点',
    'THRESHOLD':'しきい値',
     'RESET PRINT':'プリントをリセット',
     'EXPANSION BANK / RESERVED':'拡張エリア / 追加予定',
    'NO MODULES INSTALLED':'追加モジュールなし',
    'Images are processed locally with Canvas API. No image, filename, or personal data is transmitted or added to analytics.':'画像はCanvas APIで端末内処理されます。画像・ファイル名・個人情報は送信されず、アクセス解析にも渡りません。',
    'SURPRISE ME':'おまかせ破壊',
    'GENERATE A CONTROLLED ACCIDENT':'ちょうどいい事故を起こす',
    'RESET':'リセット',
    'TO ZERO':'ゼロへ戻す',
    'EXPORT':'書き出す',
    'MEMORY ONLY / MAX 8':'このセッションのみ / 最大8件',
    'SESSION GALLERY':'セッションギャラリー',
    'CLEAR ALL':'すべて消す',
    'EXPORT A SIGNAL TO START THE SESSION GALLERY.':'書き出すとセッションギャラリーに追加されます。',
    'NO ACCOUNT.':'アカウント不要。',
    'NO INSTALL.':'インストール不要。',
    'NO CLOUD.':'クラウド送信なし。',
    'JUST SIGNAL.':'信号だけ。',
    'FREE CREATIVE MACHINES FROM 7THLEAF RECORDS':'7THLEAF RECORDSの無料クリエイティブ・マシン',
    'PRIVACY SETTINGS':'プライバシー設定',
    'CLOSE ×':'閉じる ×',
    'EXPORT COMPLETE':'書き出し完了',
    'ARTIFACT READY':'できあがり',
    'PNG SAVED. KEEP THE SIGNAL MOVING.':'PNGを保存しました。続きを壊そう。',
    'SHARE':'共有',
    'COPY CREDIT':'クレジットをコピー',
    'DOWNLOAD AGAIN':'もう一度ダウンロード',
    'CLOSE':'閉じる',
    'SESSION ARTIFACT':'セッション作品',
    'SAVED':'保存済み',
    'RESTORE FX':'FXを復元',
     'COMPARE CURRENT':'今の状態と比較',
    'FAVORITE':'お気に入り',
    'UNFAVORITE':'お気に入り解除',
    'EXPORT PNG':'PNGを書き出す',
    'DELETE':'削除',
    'FLOATING PREVIEW MONITOR':'フローティング・プレビュー',
    'BEFORE':'前',
    'AFTER':'後',

     'BROWSER CASSETTE DAMAGE APPARATUS':'ブラウザで動くカセット破壊マシン',
    'DESTROY YOUR':'きれいな音を',
    'CLEAN AUDIO.':'壊そう。',
     'LOAD A SOUND. DAMAGE THE TAPE. KEEP THE ACCIDENT.':'音を読み込む。テープっぽく劣化させる。その偶然を書き出す。',
    'LOAD A SOUND':'音を読み込む',
    'MAX 10 MIN / 100 MB · 50 MB OR LESS RECOMMENDED':'最大10分 / 100MB · 50MB以下推奨',
    'Long tapes need more processing time and memory. Mobile: 5 minutes or less recommended.':'長い音源ほど処理時間とメモリを使います。スマホは5分以内がおすすめです。',
    'DECK / WAVEFORM':'デッキ / 波形',
    'NO TAPE':'テープなし',
    'INSERT TAPE':'テープを入れる',
    'DROP AUDIO HERE':'ここに音声をドロップ',
     'PRIVATE SIGNAL / NOTHING IS UPLOADED':'端末内処理 / アップロードなし',
    'PLAY':'再生',
    'PAUSE':'一時停止',
    'STOP':'停止',
    'DAMAGED':'加工後',
    'LOAD AUDIO TO START.':'音声を読み込んで開始。',
    'CONTROL BANK / TAPE FX':'コントロール / テープFX',
    'TAPE PROGRAMS':'テープ・プリセット',
    'TAPE':'テープ',
    'TAPE SATURATION':'テープ飽和',
    'WOW RATE':'ワウ速度',
    'WOW DEPTH':'ワウ深さ',
    'FLUTTER RATE':'フラッター速度',
    'FLUTTER DEPTH':'フラッター深さ',
    'RESET TAPE':'テープをリセット',
     'DAMAGE':'ダメージ',
    'TAPE NOISE':'テープノイズ',
    'DROPOUT AMOUNT':'ドロップアウト量',
    'DROPOUT FREQUENCY':'ドロップアウト頻度',
    'BIT DEPTH':'ビット深度',
     'SAMPLE REDUCTION':'サンプル間引き',
     'RESET DAMAGE':'ダメージをリセット',
    'TONE':'音色',
    'LOW PASS':'ローパス',
    'RESET TONE':'音色をリセット',
    'Audio is decoded and damaged locally. Audio, filenames, file details, and personal data never enter analytics.':'音声の読み込みと加工は端末内で行います。音声・ファイル名・ファイル情報・個人情報はアクセス解析に送られません。',
    'DAMAGE THE TAPE FOR ME':'テープをいい感じに壊す',
    'RESET ALL':'すべてリセット',
    'EXPORT DAMAGED WAV':'加工したWAVを書き出す',
    'RELATED MACHINE':'関連マシン',
    'BREAK THE IMAGE TOO.':'画像も壊す。',
    'OPEN IMAGE MACHINE →':'IMAGE MACHINEを開く →',
    'DAMAGED WAV SAVED.':'加工WAVを保存しました。',
     'RECOVERED':'加工完了',
    'TAPE LOADED. PRESS PLAY.':'テープ読み込み完了。再生してください。',
    'TAPE PAUSED.':'テープ一時停止中。',
    'TAPE STOPPED / REWOUND.':'テープ停止 / 巻き戻し済み。',
    'TAPE ENDED. READY TO REWIND.':'テープ終了。巻き戻せます。',
    'DECODING TAPE…':'テープを読み込み中…',
    'RENDERING TAPE…':'テープを処理中…',
    'RENDERING DAMAGED WAV…':'加工WAVを書き出し中…',
    'TAPE RECOVERED / WAV READY.':'テープ回収完了 / WAV準備完了。',
    'EXPORT FAILED / READY TO RETRY.':'書き出し失敗 / 再試行できます。',
    'DECODE FAILED.':'読み込み失敗。',

    'PSYCHEDELIC CAMERA DAMAGE APPARATUS':'サイケデリック映像破壊マシン',
    'BREAK THE':'映像を',
    'CAMERA.':'壊そう。',
     'Distort the signal. Feed back the evidence. Record the transmission.':'信号を歪ませ、フィードバックを重ね、そのまま録画する。',
    'CHOOSE A SIGNAL':'入力を選ぶ',
    'CAMERA':'カメラ',
    'OR TAPE?':'それとも動画？',
    'START CAMERA':'カメラ開始',
    'LOAD VIDEO':'動画を読み込む',
    'LOCAL FILE / LOOPED':'端末内ファイル / ループ',
    'Nothing is uploaded. Camera, video, processed frames, recordings, and MP4 conversion stay on this device.':'アップロードはありません。カメラ、動画、処理フレーム、録画、MP4変換はすべてこの端末内で完結します。',
    'LIVE MONITOR / OUTPUT':'ライブモニター / 出力',
    '○ NO SIGNAL':'○ 信号なし',
     'AWAITING':'信号',
     'TRANSMISSION':'待機中',
    'START CAMERA OR LOAD VIDEO':'カメラを開始するか動画を読み込む',
    'REC':'録画',
    'FULLSCREEN':'全画面',
     'SCRUB TAPE':'再生位置',
    'STICKY: ON':'追従: ON',
    '↑ PREVIEW TO TOP':'↑ プレビューを上へ',
    'NO EFFECT':'エフェクトなし',
    'NO EFFECT / LOAD A SIGNAL TO BEGIN.':'エフェクトなし / 入力を選ぶと開始。',
    'CONTROL BANK / VIDEO FX':'コントロール / 映像FX',
     'CHOOSE A TRANSMISSION.':'入力を選ぶ。',
     'THEN BREAK THE SIGNAL.':'あとは好きに壊す。',
    'PRESET TRANSMISSIONS':'映像プリセット',
    'ONE TAP / FULL SIGNAL':'ワンタップ / 一括設定',
    'CLEAN':'クリーン',
    'BAD TRACKING':'トラッキング不良',
    'VHS NIGHT':'VHSナイト',
    'DATAMOSH GHOST':'データモッシュ・ゴースト',
    'BROKEN CRT':'壊れたCRT',
    'CHROMA BLEED':'色にじみ',
     'TAPE DROPOUT':'テープドロップアウト',
    'DEAD CHANNEL':'デッドチャンネル',
     'BODY TRANSMISSION':'ボディ信号',
     'SIGNAL DAMAGE':'信号ダメージ',
    'POINTER / TOUCH FOLLOWS':'ポインター / タッチ追従',
    'RGB SHIFT':'RGBずらし',
    'WAVE DISTORTION':'波形歪み',
    'FEEDBACK TRAIL':'フィードバック残像',
    'CRT / SCANLINE':'CRT / 走査線',
    'POINTER GLOW':'ポインター発光',
    'TAPE TRACKING':'テープ・トラッキング',
    'BLOCK GLITCH':'ブロック・グリッチ',
    'SIGNAL PARTICLES / OPTIONAL':'信号パーティクル / 任意',
    'OFF':'OFF',
    'NOISE PARTICLES':'ノイズ・パーティクル',
    'DISABLED':'無効',
     'DOTS / AMOUNT':'粒子 / 量',
    'SIZE':'サイズ',
    'SPEED':'速度',
    'DRIFT':'漂い',
    'GLOW':'発光',
    'OPACITY':'不透明度',
    'DEPTH':'奥行き',
    'COLOR PRESET':'色プリセット',
    'WHITE':'白',
    'LIME':'ライム',
    'PURPLE':'紫',
    'PINK':'ピンク',
    'SOURCE VIDEO':'元動画',
    'BLEND MODE':'合成モード',
    'SCREEN':'スクリーン',
    'LIGHT':'ライト',
    'NORMAL':'通常',
    'DIFFERENCE':'差の絶対値',
     'PARTICLE BODY / 2.5D':'ボディパーティクル / 2.5D',
    'BODY SIGNAL':'人体信号',
    'AMOUNT':'量',
    'SPREAD':'広がり',
    'DISSOLVE':'崩壊',
    'ATTRACT':'引力',
    'REBUILD SPEED':'再構築速度',
    'MOTION REACTION':'動きへの反応',
    'EDGE DETAIL':'輪郭ディテール',
    'DETAIL':'精細度',
    'AUTO / FPS':'自動 / FPS',
    'LOW':'低',
    'MID':'中',
    'HIGH':'高',
     'COLOR SOURCE':'色の元',
    'SUBJECT ONLY':'被写体のみ',
    'LIGHTWEIGHT MASK':'軽量マスク',
     'Frames are drawn into local Canvas. There is no upload endpoint and no cloud copy.':'映像フレームはブラウザ内のCanvasで処理されます。アップロードもクラウド保存もありません。',
    'RECORD':'録画',
     'MP4 FIRST / WEBM FALLBACK':'MP4優先 / 非対応時はWebM',
    'CHECKING LOCAL RECORDER…':'端末内録画を確認中…',
    'LOCAL RECORDING COMPLETE':'端末内録画完了',
     'THE EVIDENCE.':'録画を書き出す。',
    'ORIGINAL RECORDING':'元の録画',
    'H.264 VIDEO / AAC AUDIO':'H.264映像 / AAC音声',
    'PREPARING LOCAL CONVERTER…':'端末内変換を準備中…',
    'CANCEL CONVERSION':'変換をキャンセル',
    'MP4 conversion is limited to recordings of 30 seconds or less. If memory runs low, save the original WebM.':'MP4変換は30秒以内の録画に対応します。メモリ不足時は元のWebMを保存してください。',
    'NO LOGIN.':'ログイン不要。',
    'Open the page and make a mess.':'ページを開いて、そのまま壊して遊べます。',
    'NO UPLOAD.':'アップロードなし。',
    'Effects, recordings, and conversion stay local.':'エフェクト、録画、変換はすべて端末内。',
    'EXPORT EVIDENCE.':'記録を書き出す。',
    'Direct MP4 where supported. WebM plus optional local conversion elsewhere.':'対応環境ではMP4を直接録画。その他はWebM＋任意の端末内変換。',
    'SIGNAL STATUS: RECEIVING…':'信号状態: 受信中…',
    'AUTO DETAIL / MID / MEASURING FPS…':'自動精細度 / 中 / FPS計測中…',
    'HIGH draws up to roughly 5,000 source-colored particles. AUTO reduces detail if the live frame rate drops. SUBJECT ONLY estimates the foreground locally—no AI model or upload.':'HIGHは最大約5,000個の元動画色パーティクルを描画します。AUTOはライブFPSが落ちると精細度を自動で下げます。被写体のみは端末内で前景を推定します。AIモデルもアップロードも使いません。',
    'CAMERA SIGNAL NOT AVAILABLE.':'カメラ信号を利用できません。',
    'REQUESTING 720P CAMERA / 30 FPS…':'720Pカメラ / 30FPS を要求中…',
    '● CAMERA LIVE':'● カメラ受信中',
    '● LOCAL VIDEO':'● 端末内動画',
    'DECODING LOCAL VIDEO…':'端末内動画を読み込み中…',
    'LOCAL VIDEO SIGNAL FAILED.':'端末内動画の読み込みに失敗しました。',
    'STOP RECORDING':'録画停止',
    'RECORDING FAILED / NO DATA.':'録画失敗 / データなし。',
    'RECORDER FAILED TO START.':'録画を開始できませんでした。',
    'CONVERSION CANCELLED.':'変換をキャンセルしました。',
    'FINALIZING MP4…':'MP4を仕上げています…',
    'TRANSCODING H.264 + AAC…':'H.264 + AACへ変換中…',
    'LOCAL MP4 CONVERSION COMPLETE / H.264 + AAC.':'端末内MP4変換完了 / H.264 + AAC。',
    'MP4 READY / DOWNLOAD STARTED.':'MP4準備完了 / ダウンロード開始。',
    '● DIRECT MP4 READY / H.264 + AAC REQUESTED / 720P 30 FPS':'● MP4直接録画に対応 / H.264 + AAC / 720P 30 FPS',
    '● DIRECT MP4 FAILED / WEBM FALLBACK READY / LOCAL MP4 CONVERSION UP TO 30 SEC':'● MP4直接録画は非対応 / WebMで録画 / MP4変換は30秒まで',
    '● WEBM READY / OPTIONAL LOCAL MP4 CONVERSION UP TO 30 SEC':'● WebM録画に対応 / MP4変換は30秒まで',
    '○ LOCAL RECORDING IS NOT AVAILABLE. LIVE EFFECTS AND FULLSCREEN STILL WORK.':'○ この環境では録画できません。ライブエフェクトと全画面表示は使えます。',
    'Direct MP4 is used first when this browser supports H.264/AAC recording. Otherwise ffmpeg.wasm loads only after you press MP4 conversion. No media is sent to a server.':'このブラウザがH.264/AAC録画に対応している場合はMP4を直接録画します。非対応の場合だけ、MP4変換を押したときにffmpeg.wasmを読み込みます。映像データはサーバーへ送信されません。',
    'READY TO RECORD · MP4':'MP4録画の準備完了',
    'FREE WEIRD MACHINES FROM 7THLEAF RECORDS':'7THLEAF RECORDSの無料で変なマシン',
    'CUSTOM':'カスタム',
    'CUSTOM SIGNAL':'カスタム信号',
    'ENABLED':'有効',
    'MONO':'モノラル',
    'STEREO':'ステレオ',
    'CREDIT COPIED.':'クレジットをコピーしました。',
    'COPY FAILED. SELECT AND COPY:':'コピーできませんでした。下の文字列を選んでコピーしてください:',
    'SIGNAL SHARED.':'共有しました。',
    'SHARING IS NOT AVAILABLE. CREDIT COPIED.':'共有機能が使えないため、クレジットをコピーしました。',
    'SHARE CANCELLED.':'共有をキャンセルしました。',
    'SHARE FAILED. CREDIT COPIED.':'共有に失敗したため、クレジットをコピーしました。',
    'CLOSE COMPARE':'比較を閉じる',
    'Restore floating preview':'フローティングプレビューを戻す',
    'Minimize floating preview':'フローティングプレビューを最小化',
    'This browser does not support the Canvas features required by THE PAN IMAGE MACHINE.':'このブラウザではIMAGE MACHINEに必要なCanvas機能を使えません。',
    'The signal could not be processed. Try a smaller image or reset the controls.':'処理できませんでした。小さめの画像を使うか、設定をリセットして再試行してください。',
    'Please choose a PNG, JPEG, WEBP, or GIF image.':'PNG / JPEG / WEBP / GIF の画像を選んでください。',
    'This file is too large. Please choose an image under 40 MB.':'ファイルが大きすぎます。40MB未満の画像を選んでください。',
    'This image could not be decoded. Try exporting it as PNG or JPEG first.':'画像を読み込めませんでした。PNGかJPEGに書き出してから再試行してください。',
    'PNG failed':'PNG書き出し失敗',
    'PNG export failed. Please try again.':'PNGを書き出せませんでした。もう一度試してください。',
    'Audio could not start. Tap Play again or check browser audio permissions.':'音声を再生できませんでした。もう一度再生するか、ブラウザの音声権限を確認してください。',
    'ALL TAPE DAMAGE RESET.':'テープのダメージをすべてリセットしました。',
    'This audio file is empty.':'音声ファイルが空です。',
    'This file is over the 100 MB limit. Choose a smaller audio file.':'100MBを超えています。小さめの音声ファイルを選んでください。',
    'Choose a WAV, MP3, or browser-decodable M4A file.':'WAV / MP3 / このブラウザで再生できるM4Aを選んでください。',
    'OVER 50 MB: decoding may use substantial memory.':'50MB超: 読み込み時に多くのメモリを使う場合があります。',
    'This tape is over the 10 minute limit. Trim it and try again.':'10分を超えています。短くしてから再試行してください。',
    'TAPE REJECTED / OVER 10 MINUTES.':'10分超のため読み込めません。',
    'LONG TAPE: processing and WAV export will take more time and memory.':'長い音源です。処理とWAV書き出しに時間とメモリを使います。',
    'MOBILE NOTICE: 5 minutes or less is recommended.':'スマホでは5分以内がおすすめです。',
    'Not enough browser memory to decode this audio. Close other tabs or choose a shorter file.':'メモリが足りず音声を読み込めません。他のタブを閉じるか、短い音源を選んでください。',
    'This audio could not be decoded in this browser. Try WAV or MP3.':'このブラウザでは音声を読み込めませんでした。WAVかMP3を試してください。',
    'WAV export failed. Close other tabs, then try again.':'WAVを書き出せませんでした。他のタブを閉じてから再試行してください。',
    'TAPE SHARED.':'共有しました。',
    'SHARE UNAVAILABLE. CREDIT COPIED.':'共有機能が使えないため、クレジットをコピーしました。',
    'Pause local video':'端末内動画を一時停止',
    'NO EFFECT / ORIGINAL SIGNAL.':'エフェクトなし / 元の映像。',
    'Camera access needs HTTPS or localhost.':'カメラを使うにはHTTPS接続が必要です。',
    'Camera permission was denied. Allow access or load a local video.':'カメラの使用が許可されていません。アクセスを許可するか、端末内の動画を読み込んでください。',
    'No camera was found on this device.':'この端末にカメラが見つかりません。',
    'The camera is already in use by another app.':'カメラは別のアプリで使用中です。',
    'The camera could not start. Check browser permissions or load a local video.':'カメラを起動できませんでした。ブラウザの権限を確認するか、端末内の動画を読み込んでください。',
    'This browser does not expose camera access. Load a local video instead.':'このブラウザではカメラを利用できません。代わりに端末内の動画を読み込んでください。',
    'Choose a video file supported by this browser.':'このブラウザで再生できる動画ファイルを選んでください。',
    'This video could not be played. Try MP4, WebM, or another browser-supported file.':'動画を再生できませんでした。MP4、WebMなど、このブラウザで再生できる形式を試してください。',
    'This video could not resume. Tap the video control again.':'動画を再開できませんでした。もう一度再生操作をしてください。',
    'This browser recorded MP4 directly. No conversion or server processing is needed.':'MP4で直接録画できました。変換もサーバー処理も不要です。',
    'MP4 conversion is limited to 30 seconds. Save the original WebM for this longer recording.':'30秒を超える録画はMP4変換できません。元のWebMを保存してください。',
    'MP4 conversion runs entirely on this device. If memory runs low, save the original WebM.':'MP4変換は端末内だけで行います。メモリが足りない場合は元のWebMを保存してください。',
    'The browser ended recording without media data.':'録画データを取得できないまま録画が終了しました。',
    'Local recording is not available for this signal in this browser.':'このブラウザでは現在の入力を録画できません。',
    'The browser recorder stopped unexpectedly.':'ブラウザの録画機能が予期せず停止しました。',
    'DIRECT MP4 COULD NOT START / SWITCHING TO WEBM…':'MP4直接録画を開始できません / WebMへ切り替え中…',
    'Recording could not start in this browser.':'このブラウザでは録画を開始できませんでした。',
    'LOADING LOCAL CONVERTER / ABOUT 31 MB…':'端末内MP4変換を読み込み中 / 約31MB…',
    'DIRECT MP4 DOWNLOAD REQUESTED.':'MP4のダウンロードを開始しました。',
    'This recording is over 30 seconds. MP4 conversion is disabled; save the original WebM.':'30秒を超えているためMP4変換は使えません。元のWebMを保存してください。',
    'COPYING RECORDING INTO LOCAL MEMORY…':'録画データを端末内メモリへコピー中…',
    'MP4 conversion failed or memory ran low. Save the original WebM and try a shorter recording.':'MP4変換に失敗したか、メモリが不足しました。元のWebMを保存し、短い録画で再試行してください。',
    'MP4 conversion failed. Your original WebM recording is still available.':'MP4変換に失敗しました。元のWebM録画はそのまま保存できます。',
    'MP4 CONVERSION FAILED / WEBM REMAINS SAFE.':'MP4変換失敗 / WebMはそのまま保存できます。',
    'Conversion cancelled. Your original WebM is still ready to save.':'変換をキャンセルしました。元のWebMはそのまま保存できます。',
    'MP4 CONVERSION CANCELLED / WEBM REMAINS SAFE.':'MP4変換キャンセル / WebMはそのまま保存できます。',
    'ORIGINAL WEBM DOWNLOAD REQUESTED.':'元のWebMのダウンロードを開始しました。',
    'EXIT FULLSCREEN':'全画面を終了',
    'DROP A PHOTO, MP4, WEBM OR MOV.':'写真、MP4、WebM、MOVを入れてください。',
    'COULD NOT READ THAT IMAGE.':'画像を読み込めませんでした。',
    'THIS BROWSER COULD NOT DECODE THAT VIDEO.':'このブラウザでは動画を読み込めませんでした。',
    'OBJ NEEDS VERTICES + FACES.':'OBJには頂点と面のデータが必要です。',
    'OBJ LOADED / NERD DOOR':'OBJ読み込み完了 / NERD DOOR',
    'NO VIDEO DATA':'動画データがありません',
    'MOTION RECORDING UNSUPPORTED':'この環境では動画録画に対応していません',

     'PHOTO / VIDEO → WRONG OBJECT / V1.1':'写真 / 動画 → バグった物体 / V1.1',
     'MAKE THE':'物体を',
     'OBJECT WRONG.':'バグらせる。',
     'Drop a photo or video. The machine gives it fake depth, tilts it through space and chews it into pixels, dots, blocks and wire. Everything stays in your browser.':'写真や動画を入れると、擬似的な奥行きをつけて空間で傾け、ピクセル・ドット・ブロック・ワイヤーへ崩します。処理はすべてブラウザ内です。',
    'DROP PHOTO / VIDEO':'写真 / 動画をドロップ',
    'JPG / PNG / WEBP / GIF / MP4 / WEBM / MOV · tap or drag':'JPG / PNG / WEBP / GIF / MP4 / WEBM / MOV · タップまたはドラッグ',
    'DEMO READY · DROP PHOTO OR VIDEO':'デモ準備完了 · 写真か動画を入れてください',
    'OBJECT':'物体',
    'TILT X':'傾き X',
    'TILT Y':'傾き Y',
    'ROTATE':'回転',
    'SCALE':'拡大率',
    'OFFSET X':'位置 X',
    'OFFSET Y':'位置 Y',
     'WRONGNESS':'バグり具合',
    'MODE':'モード',
    'PHOTO':'写真',
    'PIXEL':'ピクセル',
    'DOTS':'ドット',
    'BLOCKS':'ブロック',
    'WIRE':'ワイヤー',
    'DENSITY':'密度',
    'AUTO WOBBLE':'自動ゆらぎ',
     'MOTION EXPORT':'動画書き出し',
    'LENGTH':'長さ',
    'READY TO RECORD':'録画準備完了',
    'INK':'インク',
    'BACKGROUND':'背景',
    'TRANSPARENT BG':'背景を透明にする',
    'Got an OBJ? Load it here.':'OBJがある？ ここに読み込めます。',
    'PHOTO DEMO / FAKE DEPTH':'写真デモ / 疑似奥行き',
     'MAKE IT WRONG':'バグらせる',
    'REC MOTION':'動きを録画',
    'LOCAL ONLY. YOUR FILE NEVER LEAVES THIS BROWSER.':'ローカル処理のみ。ファイルはこのブラウザから外へ出ません。',
    'FREE CREATIVE MACHINE FROM 7THLEAF RECORDS':'7THLEAF RECORDSの無料クリエイティブ・マシン',
    'VIDEO LOADED / LOCAL ONLY':'動画読み込み完了 / ローカルのみ',
    'PHOTO LOADED / LOCAL ONLY':'写真読み込み完了 / ローカルのみ',
    'VIDEO READY · TAP PREVIEW/CONTROL TO START':'動画準備完了 · プレビューか操作をタップして開始',
    'RECORDING…':'録画中…',
    'MOTION RECORDING NOT SUPPORTED HERE':'この環境では動きの録画に対応していません',
    'RECORDING FAILED':'録画失敗',
    'RECORDER COULD NOT START':'録画を開始できませんでした',

    'TOUCHABLE SPACE DUB / 74 BPM':'触って遊ぶスペース・ダブ / 74 BPM',
     'TOUCH THE CREATURES.':'生き物たちに触る。',
     'DROP THE SIGNAL.':'音を放り込む。',
    'LET THE ECHO ESCAPE.':'エコーを逃がす。',
    'CHORD / OFF':'コード / OFF',
    'TAP UFO':'UFOをタップ',
    'DRUMS / ON':'ドラム / ON',
    'HIT DRUM':'ドラムを叩く',
    'BASS / ON':'ベース / ON',
    'BOOP PANDA':'パンダを鳴らす',
    'VOICE / OFF':'声 / OFF',
    'TUNE RADIO':'ラジオを合わせる',
    'MOON FILTER':'ムーン・フィルター',
    'OPEN':'開く',
    'ECHO':'エコー',
    'THROW!':'投げる！',
    'DRUMS → SPACE':'ドラム → 宇宙',
    'NOISE HIT':'ノイズ・ヒット',
    'MADE FOR PEOPLE WHO STILL LOOK UP AT THE SKY.':'まだ空を見上げる人のために。',
    'ECHO ORBIT':'エコー軌道',
     'FEEDBACK / SAFE LIMIT':'フィードバック / 安全リミット',
     'ALL SOUND STAYS IN THIS BROWSER. NO UPLOAD. NO LOGIN. JUST SIGNAL.':'音はすべてブラウザ内で処理。アップロードなし。ログインなし。信号だけ。',
     'SIGNAL SLEEPING':'信号はお休み中',
     'RESET / SIGNAL SLEEPING':'リセット / 信号はお休み中',
    'RESET / TRANSMISSION RUNNING':'リセット / 送信中',
    'TRANSMISSION RUNNING':'送信中',
    'LOADING COSMIC LOOPS…':'宇宙ループを読み込み中…',
    'PRESS PLAY BEFORE THROWING ECHO':'先に再生してからエコーを投げてください',
    'PRESS PLAY TO ARM THE COSMIC BUTTONS':'再生すると宇宙ボタンが使えます',
    'SIGNAL LOAD FAILED / RETRY':'信号の読み込み失敗 / 再試行',
    'WEB AUDIO NOT SUPPORTED':'このブラウザはWeb Audioに対応していません',
    'ARMED':'準備完了',
    'QUEUED':'待機中',
    'MUTED':'ミュート',
    'SUBMERGED':'沈み込み',

    'TOOLS':'ツール',
    'ABOUT':'概要',
    'MACHINES / LABS / EXPERIMENTS':'マシン / ラボ / 実験',
    'TOOLS.':'TOOLS.',
     'Small, free creative machines that run where you are. No account. No installation. No cloud processing.':'ブラウザでそのまま動く、小さくて無料のクリエイティブ・マシン。アカウント不要、インストール不要、クラウド処理なし。',
    '● AVAILABLE':'● 使用可能',
    '● AVAILABLE / V0':'● 使用可能 / V0',
    '○ PLANNED':'○ 計画中',
    'OPEN MACHINE →':'マシンを開く →',
     'BREAK AN OBJECT →':'物体をバグらせる →',
    'ENTER PLAYGROUND →':'遊び場へ →',
    'WHY THESE MACHINES EXIST':'なぜこのマシンを作るのか',
     'THE PAN Browser Tools is a growing shelf of interesting, free creative software made by 7thleaf Records.':'THE PAN Browser Toolsは、7thleaf Recordsが作る、無料でちょっと変なクリエイティブ・ツールを並べた棚です。',
    'OPEN THE DOOR':'扉を開く',
     'No login. No installation. No subscription. Open a tool in a modern browser and start making something.':'ログイン不要、インストール不要、サブスク不要。ブラウザでツールを開けば、すぐ使えます。',
     'Image Machine, Tape Machine, Signal Visualizer, Object Wrong, and Panda Dub are available now. Print and zine experiments remain future directions—not promises with artificial dates.':'Image Machine、Tape Machine、Signal Visualizer、Object Wrong、Panda Dubは公開中。PrintやZineも実験中。できる前に公開日だけを決めることはしません。',
    'FILES STAY LOCAL':'ファイルは端末内に残る',
    'Image and audio processing happens inside your browser. We do not send your creative material to a server.':'画像や音声の処理はブラウザ内で行い、あなたの素材をサーバーへ送りません。',
     'Optional anonymous analytics help us understand basic tool usage. Analytics require consent, advertising storage always remains denied, and declining never limits a tool.':'任意の匿名アクセス解析で、基本的な利用状況だけを確認します。解析は同意制で、広告目的の保存は使いません。同意しなくても、すべての機能を使えます。',
    'THE LABEL':'レーベル',
     '7thleaf Records makes music and small creative machines. The tools are here to be useful, playful, and a little strange—not to turn every visit into a sales pitch.':'7thleaf Recordsは音楽と小さなクリエイティブ・マシンを作っています。役に立って、遊べて、少し変。それがこの場所の目的です。売るためだけの場所にはしません。'
  };

  const originalText = new WeakMap();
  const originalAttrs = new WeakMap();
  let lang = loadLanguage();
  let observer;

  function loadLanguage() {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored === 'ja' || stored === 'en') return stored;
    } catch (_) {}
    return (navigator.language || '').toLowerCase().startsWith('ja') ? 'ja' : 'en';
  }

  function saveLanguage(next) {
    try { localStorage.setItem(STORAGE_KEY, next); } catch (_) {}
  }

  function translateString(value) {
    if (lang !== 'ja') return value;
    if (JA[value]) return JA[value];
    let match = value.match(/^(\d+) ACTIVE$/);
    if (match) return match[1] + '個使用中';
    match = value.match(/^(\d+) SEC$/);
    if (match) return match[1] + '秒';
    match = value.match(/^BAR (\d+) \/ BEAT (\d+)$/);
    if (match) return '小節 ' + match[1] + ' / 拍 ' + match[2];
    match = value.match(/^(AUTO|LOW|MID|HIGH) DETAIL \/ (LOW|MID|HIGH) \/ (MEASURING FPS…|\d+(?:\.\d+)? FPS)(.*)$/);
    if (match) {
      const level = { AUTO:'自動', LOW:'低', MID:'中', HIGH:'高' };
      const fps = match[3] === 'MEASURING FPS…' ? 'FPS計測中…' : match[3];
      return '設定 ' + level[match[1]] + ' / 実動 ' + level[match[2]] + ' / ' + fps + match[4];
    }
    match = value.match(/^(\d+(?:\.\d+)?) SEC \/ ([\d.]+ MB) \/ (DIRECT MP4|ORIGINAL WEBM)$/);
    if (match) return match[1] + '秒 / ' + match[2] + ' / ' + (match[3] === 'DIRECT MP4' ? 'MP4直接録画' : '元のWebM');
    match = value.match(/^STICKY: (ON|OFF)$/);
    if (match) return '追従: ' + match[1];
    return value;
  }

  function translateNode(node) {
    if (node.nodeType !== Node.TEXT_NODE) return;
    if (node.parentElement && node.parentElement.closest('[data-bilingual="true"], script, style')) return;
    const raw = originalText.has(node) ? originalText.get(node) : node.nodeValue;
    if (!originalText.has(node)) originalText.set(node, raw);
    const lead = (raw.match(/^\s*/) || [''])[0];
    const tail = (raw.match(/\s*$/) || [''])[0];
    const core = raw.trim();
    if (!core) return;
    node.nodeValue = lead + (lang === 'ja' ? translateString(core) : core) + tail;
  }

  function translateAttrs(el) {
    if (!(el instanceof Element) || el.closest('[data-bilingual="true"]')) return;
    const attrs = ['aria-label','title','placeholder'];
    let cache = originalAttrs.get(el);
    if (!cache) {
      cache = {};
      originalAttrs.set(el, cache);
    }
    attrs.forEach((attr) => {
      if (!el.hasAttribute(attr)) return;
      if (!(attr in cache)) cache[attr] = el.getAttribute(attr);
      const raw = cache[attr];
      el.setAttribute(attr, lang === 'ja' ? translateString(raw) : raw);
    });
  }

  function walk(rootNode) {
    rootNode = rootNode || document.body;
    if (!rootNode) return;
    if (rootNode.nodeType === Node.TEXT_NODE) {
      translateNode(rootNode);
      return;
    }
    if (rootNode.nodeType !== Node.ELEMENT_NODE && rootNode.nodeType !== Node.DOCUMENT_FRAGMENT_NODE) return;
    if (rootNode.nodeType === Node.ELEMENT_NODE) translateAttrs(rootNode);
    const walker = document.createTreeWalker(rootNode, NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_TEXT);
    let node;
    while ((node = walker.nextNode())) {
      if (node.nodeType === Node.TEXT_NODE) translateNode(node);
      else translateAttrs(node);
    }
  }

  function navLabel(key) {
    const labels = {
      en: { home:'HOME', image:'IMAGE', tape:'TAPE', visualizer:'VISUALIZER', object:'OBJECT', dub:'DUB', tools:'ALL TOOLS' },
      ja: { home:'ホーム', image:'画像', tape:'テープ', visualizer:'映像', object:'物体', dub:'ダブ', tools:'一覧' }
    };
    return labels[lang][key];
  }

  function buildNav() {
    const nav = document.querySelector('.site-nav');
    if (!nav) return;
    const items = [
      ['home','../',''],
      ['image','../image-machine/','image-machine'],
      ['tape','../tape/','tape'],
      ['visualizer','../visualizer/','visualizer'],
      ['object','../object-wrong/','object-wrong'],
      ['dub','../panda-dub/','panda-dub'],
      ['tools','../tools/','tools']
    ];
    nav.classList.add('pan-site-nav');
    nav.setAttribute('aria-label', lang === 'ja' ? 'ツール間ナビゲーション' : 'Tool navigation');
    nav.innerHTML = items.map((item) => {
      const key = item[0], href = item[1], target = item[2];
      const active = target && current === target ? ' aria-current="page"' : '';
      return '<a href="' + href + '"' + active + '>' + navLabel(key) + '</a>';
    }).join('');
  }

  function buildLanguageSwitch() {
    const side = document.querySelector('.masthead-side');
    if (!side) return;
    let box = side.querySelector('.pan-lang-switch');
    if (!box) {
      box = document.createElement('div');
      box.className = 'pan-lang-switch';
      box.setAttribute('role','group');
      box.innerHTML = '<button type="button" data-pan-lang="ja">JP</button><span class="sep">/</span><button type="button" data-pan-lang="en">EN</button>';
      side.insertBefore(box, side.querySelector('.masthead-meta') || null);
      box.addEventListener('click', (event) => {
        const button = event.target.closest('[data-pan-lang]');
        if (button) applyLanguage(button.dataset.panLang);
      });
    }
    box.setAttribute('aria-label', lang === 'ja' ? '言語切り替え' : 'Language');
    box.querySelectorAll('[data-pan-lang]').forEach((button) => {
      const active = button.dataset.panLang === lang;
      button.classList.toggle('is-active', active);
      button.setAttribute('aria-pressed', String(active));
    });
  }

  function buildShelf() {
    if (!document.querySelector('main') || document.querySelector('.pan-machine-shelf')) return;
    const shelf = document.createElement('section');
    shelf.className = 'pan-machine-shelf';
    const machines = [
      ['image-machine','01','IMAGE MACHINE','画像を壊す'],
      ['tape','02','TAPE MACHINE','音を壊す'],
      ['visualizer','03','VISUALIZER','映像を壊す'],
      ['object-wrong','04','OBJECT WRONG','物体をバグらせる'],
      ['panda-dub','05','PANDA DUB','ダブで遊ぶ']
    ];
    const subhead = lang === 'ja' ? '次のマシンへ' : 'JUMP TO ANOTHER MACHINE';
    const links = machines.map((machine) => {
      const target = machine[0], number = machine[1], en = machine[2], ja = machine[3];
      const active = current === target ? ' aria-current="page"' : '';
      return '<a href="../' + target + '/"' + active + '><small>' + number + '</small><span>' + (lang === 'ja' ? ja : en) + '</span></a>';
    }).join('');
    shelf.innerHTML = '<div class="pan-machine-shelf__head"><span>MACHINE SHELF</span><span>' + subhead + '</span></div><div class="pan-machine-shelf__links">' + links + '</div>';
    const footer = document.querySelector('footer');
    if (footer) footer.before(shelf);
    else document.body.appendChild(shelf);
  }

  function refreshShelf() {
    const old = document.querySelector('.pan-machine-shelf');
    if (old) old.remove();
    buildShelf();
  }

  function startObserver() {
    if (observer) observer.disconnect();
    observer = new MutationObserver((records) => {
      observer.disconnect();
      records.forEach((record) => {
        if (record.type === 'characterData') translateNode(record.target);
        record.addedNodes.forEach((node) => walk(node));
      });
      observer.observe(document.body, { subtree:true, childList:true, characterData:true });
    });
    observer.observe(document.body, { subtree:true, childList:true, characterData:true });
  }

  function applyLanguage(next, persist) {
    lang = next === 'ja' ? 'ja' : 'en';
    if (persist !== false) saveLanguage(lang);
    root.lang = lang;
    if (titles[current]) document.title = titles[current][lang];
    if (observer) observer.disconnect();
    buildNav();
    buildLanguageSwitch();
    walk(document.body);
    refreshShelf();
    startObserver();
  }

  function init() {
    applyLanguage(lang, false);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once:true });
  else init();
})();
