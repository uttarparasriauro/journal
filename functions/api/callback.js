// Cloudflare Pages Function: /api/callback
// Exchanges authorization code for GitHub access token and sends postMessage to Decap CMS popup window

export async function onRequestGet(context) {
  const { request, env } = context;
  const url = new URL(request.url);
  const code = url.searchParams.get("code");

  const client_id = env.GITHUB_CLIENT_ID;
  const client_secret = env.GITHUB_CLIENT_SECRET;

  if (!code) {
    return new Response("Missing code parameter", { status: 400 });
  }

  try {
    const response = await fetch("https://github.com/login/oauth/access_token", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({
        client_id,
        client_secret,
        code,
      }),
    });

    const data = await response.json();

    if (data.error) {
      return new Response(`OAuth Error: ${data.error_description || data.error}`, { status: 400 });
    }

    const token = data.access_token;
    const provider = "github";

    // Decap CMS expects postMessage response in popup window
    const htmlResponse = `
      <!DOCTYPE html>
      <html>
      <head><title>Authentication Successful</title></head>
      <body>
        <script>
          (function() {
            function receiveMessage(e) {
              console.log("receiveMessage", e);
              window.opener.postMessage(
                'authorization:${provider}:success:${JSON.stringify({ token, provider })}',
                e.origin
              );
            }
            window.addEventListener("message", receiveMessage, false);
            window.opener.postMessage("authorizing:${provider}", "*");
          })();
        </script>
      </body>
      </html>
    `;

    return new Response(htmlResponse, {
      headers: { "Content-Type": "text/html;charset=UTF-8" },
    });
  } catch (err) {
    return new Response(`Authentication exception: ${err.message}`, { status: 500 });
  }
}
