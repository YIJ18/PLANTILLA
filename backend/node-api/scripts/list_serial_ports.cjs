(async () => {
  try {
    const { SerialPort } = require('serialport');
    if (!SerialPort || typeof SerialPort.list !== 'function') {
      console.error('serialport is installed but list() not found.');
      process.exit(1);
    }
    const ports = await SerialPort.list();
    console.log('Serial ports found:', ports.length);
    ports.forEach(p => console.log(JSON.stringify(p)));
  } catch (e) {
    console.error('Error listing serial ports:', e && e.message ? e.message : e);
    process.exit(1);
  }
})();
