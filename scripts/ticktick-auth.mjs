import { createServer } from "http";
import { parse } from "url";

const CLIENT_ID = process.env.TICKTICK_ID;
const CLIENT_SECRET = process.env.TICKTICK_SECRET;
const REDIRECT_URI = "http://localhost:8888/callback";
const PORT = 8888;

if (!CLIENT_ID || !CLIENT_SECRET) {
  console.error("Missing TICKTICK_ID or TICKTICK_SECRET");
  process.exit(1);
}

const server = createServer(async (req, res) => {
  const { pathname, query } = parse(req.url, true);

  if (pathname === "/callback") {
    const code = query.code;
    if (code) {
      res.writeHead(200, { "Content-Type": "text/html" });
      res.end("<h1>Auth Code Received</h1><p>Exchanging for token...</p>");

      try {
        console.log("Code received:", code);
        const tokenResp = await fetch("https://ticktick.com/oauth/token", {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body: new URLSearchParams({
            client_id: CLIENT_ID,
            client_secret: CLIENT_SECRET,
            code: code,
            grant_type: "authorization_code",
            redirect_uri: REDIRECT_URI,
            scope: "tasks:read tasks:write",
          }),
        });

        const data = await tokenResp.json();
        if (data.access_token) {
          console.log("JSON_RESULT:" + JSON.stringify(data));
          // Save to file just in case
          // fs.writeFileSync('/tmp/ticktick-token.json', JSON.stringify(data));
        } else {
          console.error("Error exchanging token:", data);
        }
      } catch (err) {
        console.error("Fetch error:", err);
      } finally {
        server.close();
        process.exit(0);
      }
    } else {
      res.end("No code found");
    }
  } else {
    res.writeHead(404);
    res.end("Not found");
  }
});

server.listen(PORT, () => {
  const authUrl = `https://ticktick.com/oauth/authorize?scope=tasks:read%20tasks:write&client_id=${CLIENT_ID}&redirect_uri=${encodeURIComponent(REDIRECT_URI)}&response_type=code`;
  console.log(`Server listening on ${PORT}`);
  console.log(`AUTH_URL: ${authUrl}`);
});
