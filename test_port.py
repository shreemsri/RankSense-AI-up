import socket
sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
result = sock.connect_ex(('127.0.0.1', 8000))
if result == 0:
   print("Port 8000 is OPEN")
else:
   print("Port 8000 is CLOSED")
sock.close()
