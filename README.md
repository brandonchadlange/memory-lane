# Memory Lane

A Next.js app for memory books. Pictures and short videos live in Sanity. A YouTube link is the soundtrack. Each published book has a private page and a QR code you can put on a print.

## Run it

```bash
npm install
npm run dev
```

Open http://localhost:3000/studio and sign in with Sanity. Create a memory book, publish it, then choose **Open share page** for the link, the QR code, and a 4×6 print of the cover.

The public page is `/m/<private-link>`. The song starts when a visitor taps **Open this memory**. While a video is playing, the song pauses.

This app uses Sanity project `xcb9rpph`, dataset `production`.
