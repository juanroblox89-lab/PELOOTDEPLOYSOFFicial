using System;
using System.IO;
using System.Net;
using System.Threading;

public class SimpleDevServer {
    private static HttpListener _listener;
    private static string _root;

    public static void Start(int port, string root) {
        _root = root;
        _listener = new HttpListener();
        _listener.Prefixes.Add("http://localhost:" + port + "/");
        _listener.Start();
        Console.WriteLine("Server running at http://localhost:" + port + "/");
        
        Thread t = new Thread(new ThreadStart(ListenLoop));
        t.IsBackground = true;
        t.Start();
    }

    private static void ListenLoop() {
        while (_listener.IsListening) {
            try {
                HttpListenerContext ctx = _listener.GetContext();
                ThreadPool.QueueUserWorkItem(new WaitCallback(ProcessRequest), ctx);
            } catch {
                break;
            }
        }
    }

    private static void ProcessRequest(object state) {
        HttpListenerContext context = (HttpListenerContext)state;
        var request = context.Request;
        var response = context.Response;
        try {
            response.AppendHeader("Access-Control-Allow-Origin", "*");
            response.AppendHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
            response.AppendHeader("Cache-Control", "no-cache");
            
            if (request.HttpMethod == "OPTIONS") {
                response.StatusCode = 200;
                response.Close();
                return;
            }

            string path = request.Url.LocalPath.TrimStart('/');
            if (string.IsNullOrEmpty(path)) path = "index.html";
            
            string fullPath = Path.Combine(_root, path);
            if (Directory.Exists(fullPath)) {
                fullPath = Path.Combine(fullPath, "index.html");
            }

            if (File.Exists(fullPath)) {
                string ext = Path.GetExtension(fullPath).ToLower();
                string mime = "text/plain";
                switch (ext) {
                    case ".html": mime = "text/html; charset=utf-8"; break;
                    case ".css": mime = "text/css; charset=utf-8"; break;
                    case ".js": mime = "application/javascript; charset=utf-8"; break;
                    case ".png": mime = "image/png"; break;
                    case ".jpg":
                    case ".jpeg": mime = "image/jpeg"; break;
                    case ".svg": mime = "image/svg+xml"; break;
                    case ".json": mime = "application/json; charset=utf-8"; break;
                    case ".ico": mime = "image/x-icon"; break;
                }
                response.ContentType = mime;
                byte[] bytes = File.ReadAllBytes(fullPath);
                response.ContentLength64 = bytes.Length;
                response.OutputStream.Write(bytes, 0, bytes.Length);
            } else {
                response.StatusCode = 404;
                byte[] bytes = System.Text.Encoding.UTF8.GetBytes("404 Not Found");
                response.ContentLength64 = bytes.Length;
                response.OutputStream.Write(bytes, 0, bytes.Length);
            }
        } catch (Exception ex) {
            Console.WriteLine("Error: " + ex.Message);
        } finally {
            try { response.Close(); } catch {}
        }
    }

    public static void Stop() {
        try { if (_listener != null) { _listener.Stop(); } } catch {}
    }
}
