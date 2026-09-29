# ffmpeg.wasm browser bundle

These files are vendored so MP4 conversion can run entirely in the browser
without uploading recordings to a server.

- `@ffmpeg/ffmpeg` 0.12.15 (`ffmpeg.js`, `814.ffmpeg.js`) — MIT
- `@ffmpeg/core` 0.12.10 (`ffmpeg-core.js`, `ffmpeg-core.wasm`) —
  GPL-2.0-or-later

Upstream source:

- https://github.com/ffmpegwasm/ffmpeg.wasm/tree/ffmpeg%400.12.15
- https://github.com/ffmpegwasm/ffmpeg.wasm-core/tree/v0.12.10

The single-thread core is used to avoid requiring `SharedArrayBuffer` and
cross-origin isolation on mobile Safari. The 31 MB WebAssembly core is loaded
only when the user requests MP4 conversion.

SHA-256:

- `ffmpeg.js`: `ad4cfe957589995dea03fc8de1fd5e9f5cb4558a7282913172203082a65bbfaa`
- `814.ffmpeg.js`: `976f4174ae7da80c0d4f9523ee6dde3ecbce7dc2ee392b2a5322049abb9b8627`
- `ffmpeg-core.js`: `7b3dac617180f9ede890ef726a85dd0316ecf64544850e95b336c77b663d8896`
- `ffmpeg-core.wasm`: `9f57947a5bd530d8f00c5b3f2cb2a3492faa7e5d823315342d6a8656d0a6b7b7`

License texts and corresponding source are available from the upstream
repositories above.
