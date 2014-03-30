# nsq-protocol

[NSQ protocol](http://bitly.github.io/nsq/clients/tcp_protocol_spec.html) for Node.js implemented as a through stream

	npm install nsq-protocol

## Usage

``` js
var net = require('net');
var protocol = require('nsq-protocol');

var socket = net.connect(4150);
var p = protocol();

socket.pipe(p).pipe(socket);

p.identify({
	short_id: 'maf',
	long_id: 'mafintosh',
	heartbeat_interval: 10000,
	user_agent: 'my-client/0.1'
}, function() {
	console.log('I identified!');
});
```

## API

The following messages can be used

* `protocol.identify(options, [callback])` Send identify. See the spec for options
* `protocol.nop()` Send nop message
* `protocol.sub(topic, channel, [callback])` Subscribe to a topic on a channel
* `protocol.pub(topic, data, [callback])` Publish to a topic. Data should be a buffer or string
* `protocol.mpub(topic, list_of_data, [callback])` As above but with multiple messages
* `protocol.rdy(count)` Indicate you are ready to receive messages
* `protocol.fin(message_id)` Finish a message (when message processing succeeds)
* `protocol.req(message_id, timeout)` Re-queue a message (when message processing fails)
* `protocol.touch(message_id)` Reset the timeout for an in-flight message
* `protocol.cls()` Send close message
* `protocol.destroy()` Destroy the stream.

The following events are emitted (excluding standard stream events)

* `protocol.on('message', message, message_id, attempts)` When a message is received
* `protocol.on('heartbeat')` When a heartbeat is received

## License

MIT