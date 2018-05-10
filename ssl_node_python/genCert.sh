openssl req -new -x509 -nodes -out server.pem -keyout server.key
openssl x509 -noout -fingerprint -sha1 -inform pem -in server.pem > fingerprint
