# SSSL
SSSL ("Secure" SSL) is a POC code led by Komodo Consulting (https://www.komodosec.com) that implements crowd-based certificate verification. 

***Securing the (not so) Secure Socket Layer (SSSL)***
Every security researcher faces the following well-known paradox early on in their career: in order to rely on the security of our SSL channel, we must verify the target server’s SSL certificate; in order to do so, we must first rely on the certificate authority (‘CA’). It might have all made sense in the early days of the internet, when these ‘CA’s’ were a handful of known corporates, but in our current reality where modern browsers support hundreds of CA’s, it is becoming increasingly difficult to simply trust the mechanism. In this article (and the attached POC code) I’ll present an alternative approach to certificate verification that attempts to overcome these difficulties.

Wait, is my communication really not secure?!

The first question we want to answer is whether we face a real problem — i.e. are there really attacks exploiting the current SSL verification issue? Unfortunately, the answer is yes, yes indeed. Even if you ignore the possibility that the CA itself might be malicious, disregard the reality that government agencies probably hold root CA certificates themselves, or even if you are simply unaware of how incredibly unprofessionalsome CA’s tend to be, it is clear that malicious attackers have managed to lay their hands on root CA certificates in the past.

What this all means is that when it comes to the modern-day internet, financed, resourceful attackers can launch Man-In-The-Middle attacks against SSL protected websites by issuing fake, ‘valid’ certificates. This is the problem that we attempt to solve.

Past work and fix attempts
 
Over the years there have been several attempts to overcome the CA issue. Public Key Pinning, for example, was developed exactly for this purpose. However, due mainly to complexity and overheads, the idea didn’t stick and is not widely used. An interesting idea that is causing some buzz is the use of blockchain for SSL, however it is not exactly clear whether, or how, this will become a reality.

***Komodo’s approach: Distributed Certificate Verification***

More details about motivation and principals can be found here:

https://www.komodosec.com/blog/distributed-verification-of-ssl-certificates


***The solution consists of two parts:***

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




