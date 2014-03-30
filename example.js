var protocol = require('./');
var p = protocol();

p.on('heartbeat', function() {
	console.log('heartbeat received...');
});

p.identify({
	short_id: 'maf',
	long_id: 'mafintosh',
	heartbeat_interval: 10000,
	user_agent: 'nsq/0.1'
});

p.mpub('tester', ['hi verden', 'hej', 'med', 'dig']);
p.sub('tester', 'protocol', function() {
	p.rdy(10);
});

p.on('message', function(message, id, attempts) {
	console.log(message.toString(), id, attempts);
	p.fin(id);
});

p.pipe(require('net').connect(4154)).pipe(p);