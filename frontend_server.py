import http.server
import socketserver
import os
import sys

PORT = 3000
DIRECTORY = os.path.dirname(os.path.abspath(__file__))

class QuietHandler(http.server.SimpleHTTPRequestHandler):
    def log_message(self, format, *args):
        # Convert to str first — Python 3.13 passes HTTPStatus enum in args[0] for error logs
        msg = str(args[0]) if args else ""
        if "favicon.ico" in msg or "prompts.json" in msg:
            return
        # Filter out 200 OK logs to keep console clean, or keep them if preferred.
        # Keeping them for now but maybe less verbose?
        sys.stderr.write("%s - - [%s] %s\n" %
                         (self.client_address[0],
                          self.log_date_time_string(),
                          format%args))

    def handle(self):
        # Handle ConnectionAbortedError (WinError 10053) silently
        try:
            super().handle()
        except ConnectionAbortedError:
            pass
        except ConnectionResetError:
            pass
        except BrokenPipeError:
            pass

class ThreadedHTTPServer(socketserver.ThreadingMixIn, http.server.HTTPServer):
    daemon_threads = True

def run():
    # Change to script directory
    os.chdir(DIRECTORY)
    
    # Explicitly bind to IPv4 (127.0.0.1) to match Backend logic and avoid ::1 confusion
    server_address = ('0.0.0.0', PORT)
    
    server = ThreadedHTTPServer(server_address, QuietHandler)
    print(f"Frontend Server running on http://127.0.0.1:{PORT}")
    print("Serving from:", DIRECTORY)
    print("(Press CTRL+C to quit)")
    
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        pass
    finally:
        server.server_close()
        print("Frontend stopped.")

if __name__ == '__main__':
    run()
