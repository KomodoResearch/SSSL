from twisted.application import service, internet
from twisted.python.log import ILogObserver
from twisted.python import log
from twisted.internet import reactor, task, ssl, protocol, defer
from twisted.web import resource, server
from twisted.web.resource import NoResource
import urlparse
import sys, os
import urllib2
import socket
import threading, time
from twisted.python.modules import getModule
import ssl as nativeSSL
from OpenSSL.crypto import load_certificate,FILETYPE_PEM

init = dict(
    BootstrapIP = '127.0.0.1', # update to your bootstrap server, or leave as default
    NodeIP= '192.168.232.234', # update to your node's public IP (webserver address)
    WebPort = 8443, # web port for incoming connections    
    pemPath = 'server.pem', # path to your PEM file
    keyPath = 'server.key', # path to your private key
    finegrprintPath = 'fingerprint' #path to fingerprint file
)

#parse config
bootstrapIP = init['BootstrapIP']
nodeIP = init['NodeIP']
webPort = init['WebPort']
pemPath = init['pemPath']
keyPath = init['keyPath']

#to do add validation


sys.path.append(os.path.dirname(__file__))
from kademlia.network import Server
from kademlia import log

application = service.Application("kademlia")
application.setComponent(ILogObserver, log.FileLogObserver(sys.stdout, log.INFO).emit)


kserver = Server()
kserver.bootstrap([(bootstrapIP, 9999)])
    

kserver.saveStateRegularly('cache.pickle', 10)

udpserver = internet.UDPServer(9999, kserver.protocol)
udpserver.setServiceParent(application)



class WebResource(resource.Resource):
    def __init__(self, kserver):
        resource.Resource.__init__(self)
        self.kserver = kserver


    def getChild(self, child, request):
        return self

    def render_GET(self, request):
        def respond(value):            
            value = value or NoResource().render(request)
            request.write(value)
            request.finish()
        def ret(res):
            request.write(res)
            request.finish()
        def validate(domain,cb):
            # to do - add support for other SSL ports
            cert_pem = nativeSSL.get_server_certificate((domain,443))
            certString = str(cert_pem)
            cert = load_certificate(FILETYPE_PEM,certString)            
            finger = cert.digest("sha1")                            
            cb(finger)            
        url = request.uri        
        parsed=urlparse.urlparse(url)
        dic = urlparse.parse_qs(parsed.query)
        if 'op' in dic:        
            if ("".join(urlparse.parse_qs(parsed.query)['op'])=='getRandPeerList'):
                return '; '.join(str(b) for b in (self.kserver.bootstrappableNeighbors()))            
            if ("".join(dic['op'])=='get'):
                if 'query' in dic:
                    d=self.kserver.get("".join(dic['query']))
                    d.addCallback(respond)
                    return server.NOT_DONE_YET
            if ("".join(dic['op'])=='validate'):                    
                if 'domain' in dic:
                    validate("".join(dic['domain']),ret)
                    return server.NOT_DONE_YET                
        if 'areYouReal' in dic:
                return 'i am as real as it gets'
        return 'illegel request: ' + request.uri          
    def render_POST(self, request):
        return 'currently not supported'
   #     url = request.uri        
   #     parsed=urlparse.urlparse(url)
   #     dic = urlparse.parse_qs(parsed.query)
   #     if (('peerIP' in dic) and ('fingerprint' in dic)):
   #         #print str(urllib2.urlopen("http://www.walla.co.il:80").read())
   #         #todo add input validation
   #         key = "".join(dic['peerIP'])
   #         value = "".join(dic['fingerprint'])  
   #         #validate legal IP address
   #         try:
   #             socket.inet_aton(key)         nodeIP       
   #             # for now validate for value only len <100
   #             if (len(value)>99):
   #                 return 'illegal fingerprint'
   #             log.msg("Setting %s = %s" % (key, value))
   #             self.kserver.set(key, value)
   #             return 'OK'
   #         except socket.error:
   #             return 'illegal IP for Peer'
   #     else:
   #         return 'illegal request'



website = server.Site(WebResource(kserver))

#prepare SSL
ctx = ssl.DefaultOpenSSLContextFactory('server.key','server.pem')
webserver = internet.SSLServer(webPort,website, ctx)
webserver.setServiceParent(application)


# checking every 30 secs for Neighbors

def registerSelf():        
        currN = '; '.join(str(b) for b in (kserver.bootstrappableNeighbors()))
        if (currN):                
            print ("registerSelf - add local node ip and finegrprint")
            with open('fingerprint','r') as tempfile:
                fp = tempfile.read()
            fp = fp.split("=")[1]            
            kserver.set(nodeIP, fp)
        else:
            print ("waiting for init to register self")    
            threading.Timer(30,registerSelf).start()

registerSelf()