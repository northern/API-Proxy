# Postways API Proxy

Postways API Proxy is a server that you run in your own hosting environment and rather for your application to call the Postways API directly, your application calls the API Proxy instead. The API Proxy will then call the Postways API on your behalf and if for some reason a request failed, the API Proxy will queue it to try again later.
