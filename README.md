# SSSL
SSSL ("Secure" SSL) is a POC code led by Komodo Consulting (https://www.komodosec.com) that implements crowd-based certificate verification. 
More details about motivation and principals can be found here:

https://www.komodosec.com/sssl/

The solution consists of two parts:

1. Client side proxy written in Node.js
2. Server side DHT based validation nodes, written in Python.


# installation and usage
## client side proxy verifier
1. **Download and install node:** https://nodejs.org/en/download/
2. **Edit nodes.json:**   
For each of your nodes enter its public IP address, used port and SSL fingerprint.
(Alternatively, leave the file as-is to use the nodes I've already set up, located in Frankfurt. I'm not sure for how long they'll stay available, though). 
3. **Run the proxy:**   
*node proxy_var_updated.js*
4. **Configure your browser to use proxy**  
localhost in port 9000 (or change port in JS file).
5. **Browse regularly.**   
failed  domains (i.e. such that were not validated by the DHT) will be written to an error log. Valid fingerprints will be printed to the console.


## DHT SSL nodes
For this solution to work you need at least one validation node (the more the merrier).
Currently I've 2 servers open for use, but they might not stay online forever.

The following has been tested on Ubuntu:
1) **update apt-get**:  
  *sudo apt-get update*
2) **install python 2.X**  
*sudo apt-get install python*
3) **install pip**   
*sudo apt-get install python-pip*
4) **update "validator.tac" config section**:  
    a. *'BootstrapIP':* if you have only one server, lease as is. Otherwise input the external IP of the first running server.  
    b. *'NodeIP':* update to your server's public IP address  
    c. *'WebPort':* this port should be accessible form the internet  
    d. *'pemPath':* leave as is  
    e. *'keyPath':* leave as is  
    i. *'fingerprintPath':* leave as is  
5) **add execute rights to genKey.sh**   
*sudo chmod +x genCert.sh*
6) **run genCert.sh script**  
*./genCert.sh*  
   the script will generate the required certificates and fingerprint. 
   if you run the script from the project's folder, it should work 'as is'. 
   If you move the script the a different folder, update the pem,key and fingerprint paths above accordingly
7) **install pyOpenSSL**:  
   a. *sudo apt-get install build-essential libssl-dev libffi-dev python-dev*  
   b. *sudo pip install pyOpenSSL*
8) **install twistd**  
*sudo apt-get  install python-twisted-core*
9) **install kademlia and its prerequisites**  
*pip install -r requirements.txt*
10) **run**:   
*twistd -ny validator.tac*




