var stream = require('stream');
var util = require('util');

var VERSION = new Buffer('  V2');

var noop = function() {};

var Protocol = function() {
	if (!(this instanceof Protocol)) return new Protocol();

	stream.Duplex.call(this);

	this._buffer = new stream.PassThrough();
	this._next = 4;
	this._framing = false;
	this._queue = [];
	this._destroyed = false;

	this.push(VERSION);

	this.on('finish', function() {
		this.push(null);
		this.destroy();
	});
};

util.inherits(Protocol, stream.Duplex);

Protocol.prototype.identify = function(handshake, cb) {
	this._send('IDENTIFY', '', JSON.stringify(handshake), cb || noop);
};

Protocol.prototype.nop = function() {
	this._send('NOP', '', null, null);
};

Protocol.prototype.sub = function(topic, channel, cb) {
	this._send('SUB', topic+' '+channel, null, cb || noop);
};

Protocol.prototype.pub = function(topic, data, cb) {
	this._send('PUB', topic, data, cb || noop);
};

Protocol.prototype.mpub = function(topic, datas, cb) {
	var len = 0;
	for (var i = 0; i < datas.length; i++) len += datas[i].length+4;
	var buf = new Buffer(len+4);

	buf.writeUInt32BE(datas.length, 0);

	var offset = 4;
	for (var i = 0; i < datas.length; i++) {
		var data = datas[i];
		if (!Buffer.isBuffer(data)) data = new Buffer(data);
		buf.writeUInt32BE(data.length, offset);
		data.copy(buf, offset+4);
		offset += 4 + data.length;
	}

	this._send('MPUB', topic, buf, cb || noop);
};

Protocol.prototype.rdy = function(count) {
	this._send('RDY', ''+count, null, null);
};

Protocol.prototype.fin = function(id) {
	this._send('FIN', id, null, null);
};

Protocol.prototype.req = function(id, timeout) {
	this._send('REQ', id+' '+timeout, null, null);
};

Protocol.prototype.touch = function(id) {
	this._send('TOUCH', id, null, null);
};

Protocol.prototype.cls = function(cb) {
	this._send('CLS', '', null, cb || noop);
};

Protocol.prototype.destroy = function() {
	if (this._destroyed) return;
	this._destroyed = true;

	while (this._queue.length) this._queue.shift()(new Error('protocol closed'));

	var self = this;
	process.nextTick(function() {
		self.emit('close');
	});
};

Protocol.prototype._send = function(cmd, header, body, cb) {
	if (this._destroyed) {
		if (cb) cb(new Error('protocol closed'));
		return;
	}

	if (cb) this._queue.push(cb);
	this.push(new Buffer(cmd+(header && ' '+header)+'\n'));

	if (!body) return;
	if (!Buffer.isBuffer(body)) body = new Buffer(body);

	var container = new Buffer(4 + body.length);
	container.writeUInt32BE(body.length, 0);
	body.copy(container, 4);

	this.push(container);
};

Protocol.prototype._write = function(data, enc, cb) {
	this._buffer.write(data);
	this._parse();
	cb();
};

Protocol.prototype._parse = function() {
	while (true) {
		var buf = this._buffer.read(this._next);
		if (!buf) return;

		if (!this._framing) {
			this._framing = true;
			this._next = buf.readUInt32BE(0);
			continue;
		}

		this._framing = false;
		this._next = 4;

		var type = buf.readUInt32BE(0);
		buf = buf.slice(4);

		switch (type) {
			case 0:
			this._onresponse(buf);
			break;
			case 1:
			this._onerror(buf);
			break;
			case 2:
			this._onmessage(buf);
			break;
		}
	}
};

Protocol.prototype._onresponse = function(data) {
	data = data.toString();

	if (data === '_heartbeat_') {
		this.emit('heartbeat');
		this.nop();
		return;
	}

	if (this._queue.length) this._queue.shift()(null, data);
};

Protocol.prototype._onerror = function(data) {
	data = data.toString();
	this.emit('error', data);

	// we should NEVER send invalid stuff - just "throw" it
	// if (data.slice(0, 9) === 'E_INVALID') return this.emit('error', new Error(data));
	// if (this._queue.length) this._queue.shift()(new Error(data));
};

Protocol.prototype._onmessage = function(data) {
	this.emit('message', data.slice(26), data.slice(10, 26).toString(), data.readUInt16BE(8));
};

Protocol.prototype._read = function() {
	// do nothing
};

module.exports = Protocol;