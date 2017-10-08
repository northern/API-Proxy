
import dotenv from 'dotenv';
import https from 'https';
import express from 'express';
import bodyParser from 'body-parser';

import RedisMQ from 'rsmq';
import RedisMQWorker from 'rsmq-worker';

dotenv.config();

console.log("API Proxy starting...");

const config = {
  apiproxy: {
    port: parseInt(process.env.APIPROXY_PORT || 8080),
    workers: parseInt(process.env.APIPROXY_WORKERS || 1)
  },
  postways: {
    apiKey: process.env.POSTWAYS_APIKEY
  },
  redis: {
    url: process.env.REDIS_URL
  }
};

console.log("Found configuration:", config);

const rsmq = new RedisMQ({url:config.redis.url, ns: "postways"});

rsmq.createQueue({qname:"transmissions"}, (error, resp) => {
  console.log(arguments);
  if (resp === 1) {
    console.log("queue created")
  }
});

const workers = [];

for (var i = 0; i < config.apiproxy.workers; i++) {
  var worker = new RedisMQWorker("transmissions", {rsmq:rsmq});

  worker.on("message", (msg, next, id) => {
    // process your message
    console.log(`Message id : ${id}`);
    var data = msg; //+"xyz"; //JSON.parse(msg);
    //console.log(msg);

    var params = {
      host: 'api.postways.com',
      path: '/transmissions',
      port: 443,
      method: 'POST',
      headers: {
        'Authorization': `Token ${config.postways.apiKey}`,
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(data)
      }
    };
    //console.log(params);

    const request = https.request(params, (response) => {
      console.log('statusCode:', response.statusCode);
      console.log('headers:', response.headers);

      response.on('data', (chunk) => {
        console.log("chunk", chunk.toString())
      });
    });

    request.on("error", (e) => {
      console.log(`Got error: ${e.message}`);
      console.log(e);

      next();
    });

    request.write(data);
    request.end(function(result) {
      console.log("Request end");
      console.log(arguments);

      next();
    });
  });

  // optional error listeners
  worker.on('error', function( err, msg ){
      console.log( "ERROR", err, msg.id );
  });
  worker.on('exceeded', function( msg ){
      console.log( "EXCEEDED", msg.id );
  });
  worker.on('timeout', function( msg ){
      console.log( "TIMEOUT", msg.id, msg.rc );
  });

  worker.start();

  workers.push(worker);
}

const app = express();
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

app.get('/', (request, response) => {
  response.send("Postways API Proxy");
});

app.post('/transmissions', (request, response) => {
  //console.log(request.body);

  rsmq.sendMessage({qname:"transmissions", message:JSON.stringify(request.body)}, (error, messageId) => {
    if (messageId) {
      console.log(`Message sent. ID: ${messageId}`);

      response.status(202).send("OK");
    }
  });
  
});

app.listen(config.apiproxy.port, (error) => {
  if (error) {
    return console.error('something bad happened', error)
  }

  console.log(`HTTP Server is listening on port ${config.apiproxy.port}`)
});
