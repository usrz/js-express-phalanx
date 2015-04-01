var logrotate = require('logrotate-stream');

var stream = logrotate({file: './test.log', size: '1b'});

stream.write('aaaa\n');
stream.write('bbbb\n');
stream.write('cccc\n');
stream.write('dddd\n');
//stream._rotate();
stream.write('eeee\n');
stream.write('ffff\n');
stream.write('gggg\n');
stream.write('hhhh\n');
