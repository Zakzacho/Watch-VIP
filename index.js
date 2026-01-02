import http from "http";

const PORT = process.env.PORT || 3000;

http.createServer((req, res) => {
  res.writeHead(200, { "Content-Type": "text/plain" });
  res.end("Watch-VIP backend is running");
}).listen(PORT, () => {
  console.log("Server running on port", PORT);
});
