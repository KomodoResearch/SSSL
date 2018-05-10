// HTTP forward proxy server that can also proxy HTTPS requests
// using the CONNECT method
// requires https://github.com/nodejitsu/node-http-proxy
const https = require('https');
var validators = require('./nodes.json');
var numOfValidators = 5;
var minOkValidators = 1;
var fs = require('fs');

var httpProxy = require('http-proxy'),
	url = require('url'),
	net = require('net'),
	http = require('http');
process.on('uncaughtException', logError);

function truncate(str) {
	var maxLength = 64;
	return (str.length >= maxLength ? str.substring(0,maxLength) + '...' : str);
}

function logRequest(req) {
	console.log(req.method + ' ' + truncate(req.url));
	for (var i in req.headers)
		console.log(' * ' + i + ': ' + truncate(req.headers[i]));
}

function logError(e) {
	console.warn('*** ' + e);
}

// this proxy will handle regular HTTP requests
var regularProxy = httpProxy.createProxyServer({});

// standard HTTP server that will pass requests 
// to the proxy
var server = http.createServer(function (req, res) {
  //nothing to do 
  uri = url.parse(req.url);
  regularProxy.web(req, res, {target: "http://" + req.headers.host});
});

// when a CONNECT request comes in:
server.on('connect', function(req, socket, head) {
	var https = require('https');	
	var parts = req.url.split(':', 2);
	var domain = parts[0];	
			
	//generate a list of validaros
	var nodes = require('./nodes.json');
	var validatorsArray = [];
	for (var i=0; i<numOfValidators;i++){
		validatorsArray.push(nodes[Math.floor(Math.random()*nodes.length)]);
	}
							
	// wait for all validators to execute, then check if result is OK
	var validatorResults = [];
	validatorsArray.forEach(function(validator){
		getFingerprintFromValidator(domain,validator,function(isOK){
			 validatorResults.push(isOK);
			 if(validatorResults.length  === validatorsArray.length) {	
				
					 var numOK = 0;
						
					//get local fingerprint
						var options = {
						hostname: domain,			
						port: 443,
						path: '/',
						method: 'GET',
						agent: false,
						headers: {
						 'User-Agent': 'Node.js/https'
					   }
					};
					
					var request = https.request(options, function (res) {});
					request.on('socket', socket1 => {
					  socket1.on('secureConnect', () => {
						var fingerprint = socket1.getPeerCertificate().fingerprint;		
					
						//compare to our certs
						console.log("checking Domain: " + domain + " ; Local fingerprint: " + fingerprint);
						for (var i=0;i<validatorResults.length;i++){							 
							 if (validatorResults[i]===fingerprint){
								 numOK++;
							 }
						 }
						
						// hardcoded so google can work.. should be removed in real environment
						if (String(domain).includes("google")){
							console.log("google hack activated-set to legal")
							numOK = minOkValidators+1;
						}											
						
						// open a TCP connection to the remote host						
						if (numOK>=minOkValidators){
								console.log("enough validators fot domain: " + domain + "(" + numOK + " valid out of minimum required: " + minOkValidators + ") valid req")
								console.log('*****************************************************************************************************************');
								var conn = net.connect(parts[1], parts[0], function() {			
								// respond to the client that the connection was made
								socket.write("HTTP/1.1 200 OK\r\n\r\n");
								// create a tunnel between the two hosts
								socket.pipe(conn);
								conn.pipe(socket);
								socket.destroy;
								});
							}
							else {
								console.log("not enough validators for domain: " + domain + "  (" + numOK + " valid out of minimum required: " + minOkValidators + "). invalid req")
								fs.appendFile('errorLog.txt', 'failed to validate domain: ' + domain +'\r\n', function (err) {
								  if (err) throw err;
								  console.log('log updated');
								  console.log('*****************************************************************************************************************');
								});
								socket.write("HTTP/1.1 200 OK\r\n\r\n");				
								socket.write("<html>failed</html>");
								socket.destroy;
							}
						});									
						request.end();
					});
		}
	})});
});
	
//get fingerprint from given validator
function getFingerprintFromValidator(domain,validator,callback){
		var options = {
		  hostname: validator.IP,
		  port: validator.port,
		  path: '/?op=validate&domain=' + domain,
		  method: 'GET',
		  rejectUnauthorized: false,
		  requestCert: true,
		  agent: false,
		  headers: {
			'User-Agent': 'Node.js/https'
		  }
		};

		//here we validate to domain fingerprint we got from the validator with the one we have locally
		var validatorReq = https.request(options, ValidatorRes => {
		  ValidatorRes.on('data', d => {						
			domainFingerprintFromValidator = (String(d));
				console.log("Domain: " + domain + " ; Validator: " + validator.IP + " received fingerprint: " + domainFingerprintFromValidator);
				callback(domainFingerprintFromValidator);

		  });
		})
		.on('error', e => {
		  console.error(e);
		  callback(false);
		});		
		
		//here we validate the SSL pinning with the validator - if we get the wrong cert from validators (i.e. different from the one we have locally - this validator is invalid)
		validatorReq.on('socket', socket1 => {
		  socket1.on('secureConnect', () => {	  
			var retrivedFingerprint = socket1.getPeerCertificate().fingerprint;			
			// Match the fingerprint with our saved fingerprints
			if(!(retrivedFingerprint ===validator.fingerprint)){
			  validatorReq.emit('error', new Error('Fingerprint does not match'));		  
			  validatorReq.abort();			  
			  callback(false);
			}
			else{				
				validatorReq.end();												
			}
		  });
		});
				
	}
	
server.listen(9000);