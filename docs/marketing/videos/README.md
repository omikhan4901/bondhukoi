# Videos

Short, silent clips of the real app with on-screen captions (most people scroll with the
sound off). Record each in four shapes like the ResumeX kit: square 1080×1080, portrait
1080×1350, story 1080×1920 (Reels, TikTok, WhatsApp status) and a 960×540 GIF for the README.

## How to record

On an Android phone or emulator with the app signed in to sample accounts:

```bash
adb shell screenrecord --size 1080x1920 --bit-rate 8000000 /sdcard/scene.mp4   # Ctrl+C to stop
adb pull /sdcard/scene.mp4
# story (9:16) as recorded; square and portrait by padding onto the brand background:
ffmpeg -i scene.mp4 -vf "scale=-2:1000,pad=1080:1080:(ow-iw)/2:40:color=0xFFF4EE" square.mp4
ffmpeg -i scene.mp4 -vf "scale=-2:1270,pad=1080:1350:(ow-iw)/2:40:color=0xFFF4EE" portrait.mp4
ffmpeg -i scene.mp4 -vf "fps=12,scale=-2:540,pad=960:540:(ow-iw)/2:0:color=0xFFF4EE" -loop 0 wide.gif
```

For the "on campus" scene on an emulator, move the location with
`adb emu geo fix 90.4255 23.8151` (longitude first) while recording the friend's phone.
Use sample accounts only (never real students' names).

## Scenes

### on-campus: "Walk in, friends see 'On campus'" (about 15 s)
Friend's phone on Home → the other phone crosses into the campus zone → the friend's list
moves them to "On campus now".

> 🟠 Walk onto campus. Your friends see "On campus". That's it: no map, no dot, and your
> location is never stored.
> BondhuKoi, for NSU students 👉 [link]

### circle: "Draw your place" (about 20 s)
New circle → name → pick friends → tap four corners on the map → tap the first corner to
close → Create → the circle card with its map cover.

> Your thesis lab, the library, your club room. Draw it once, and your circle sees who's
> there right now. 🗺️

### privacy: "Who can see me" (about 15 s)
You → Who can see me → scroll friends, circles, alerts → tap Stop on one.

> One screen shows everyone who can see anything about you. One tap stops any of them.

### pause: "One tap" (about 8 s)
Home → Pause sharing → "Sharing paused" → a friend's phone shows "Not sharing".

> Need a break? Pause. Your friends just see "Not sharing".

### qr: "Add a friend in 2 seconds" (about 8 s)
Add a friend → Scan QR → pointed at a second phone → "Request sent".

> Scan, done. 🤝
