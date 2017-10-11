
import _ from 'lodash';
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

console.log("Configuration found:", config);

if (!config.postways.apiKey) {
  console.error("Missing required environment variable: POSTWAYS_APIKEY");
  process.exit(1);
}

if (!config.redis.url) {
  console.error("Missing required environment variable: REDIS_URL");
  process.exit(1);
}

const rsmq = new RedisMQ({
  url: config.redis.url, 
  ns: "postways"
});

rsmq.createQueue({qname:"transmissions"}, (error, resp) => {
  // TODO: How to correctly handle errors here?
  
  /*
  console.log(error);
  console.log(resp);
  if (!_.isEmpty(error)) {
    console.error("Error. Queue could not be created.");
    process.exit(1);
  }
  */
});

const workers = [];

for (var i = 0; i < config.apiproxy.workers; i++) {
  var worker = new RedisMQWorker("transmissions", {rsmq:rsmq});

  worker.on("message", (data, next, id) => {
    console.log(`Received message Id: ${id}`);

    // Prepare HTTP request parameters.
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
      //console.log(arguments);

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
  rsmq.sendMessage({qname:"transmissions", message:JSON.stringify(request.body)}, (error, messageId) => {
    if (messageId) {
      console.log(`Message sent. ID: ${messageId}`);

      response.status(202).send("OK");
    }
  });
});

app.listen(config.apiproxy.port, (error) => {
  if (error) {
    console.error(`Error. Unable to start server: ${error}`);
    process.exit(1);
  }

  console.log(`HTTP Server is listening on port ${config.apiproxy.port}`);
});
