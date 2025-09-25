export const generateMockData = (points = 50) => {
    const data = {
      temperature: [],
      humidity: [],
      altitude: [],
      pressure: [],
      walkieChannel: [],
      accelerometer: [],
      gyroscope: [],
      coordinates: [],
      timestamps: []
    };
  
    const baseTime = Date.now() - (points * 2000);
    
    for (let i = 0; i < points; i++) {
      const time = baseTime + (i * 2000);
      
      data.temperature.push(25 + Math.sin(i * 0.05) * 8 + Math.random() * 2 - 1);
      data.humidity.push(55 + Math.cos(i * 0.05) * 20 + Math.random() * 5 - 2.5);
      const altitudeBase = i < points/2 ? i * 20 : (points - i) * 20;
      data.altitude.push(Math.max(0, altitudeBase + Math.sin(i * 0.2) * 50 + Math.random() * 10 - 5));
      const currentAltitude = data.altitude[data.altitude.length - 1];
      data.pressure.push(1013.25 - (currentAltitude * 0.12) + Math.random() * 2 - 1);
      data.walkieChannel.push(Math.floor(Math.random() * 16) + 1);
      data.accelerometer.push({
        x: Math.sin(i * 0.1) * 2 + Math.random() * 0.5 - 0.25,
        y: Math.cos(i * 0.1) * 2 + Math.random() * 0.5 - 0.25,
        z: 9.81 + Math.sin(i * 0.05) * 1 + Math.random() * 0.3 - 0.15
      });
      data.gyroscope.push({
        x: Math.sin(i * 0.08) * 45 + Math.random() * 10 - 5,
        y: Math.cos(i * 0.06) * 30 + Math.random() * 8 - 4,
        z: Math.sin(i * 0.04) * 60 + Math.random() * 12 - 6
      });
      const baseLat = 40.7128;
      const baseLng = -74.0060;
      const radius = 0.01;
      const angle = (i / points) * Math.PI * 2;
      data.coordinates.push({
        lat: baseLat + Math.cos(angle) * radius + Math.random() * 0.001 - 0.0005,
        lng: baseLng + Math.sin(angle) * radius + Math.random() * 0.001 - 0.0005,
        alt: data.altitude[data.altitude.length - 1]
      });
      data.timestamps.push(time);
    }
    
    return data;
  };
  
  export const parseDataFromFile = (fileContent) => {
    const lines = fileContent.split('\n').filter(line => line.trim() !== '');
    const headers = lines[0].split(',').map(h => h.trim());
    const data = {
      temperature: [], humidity: [], altitude: [], pressure: [], walkieChannel: [],
      accelerometer: [], gyroscope: [], coordinates: [], timestamps: []
    };
    const errors = [];
  
    const requiredHeaders = ['timestamp', 'temp', 'humidity', 'alt', 'pressure', 'walkie', 'acc_x', 'acc_y', 'acc_z', 'gyro_x', 'gyro_y', 'gyro_z', 'lat', 'lng'];
    for (const h of requiredHeaders) {
      if (!headers.includes(h)) {
        errors.push(`Falta la cabecera requerida: ${h}`);
      }
    }
    if (errors.length > 0) return { data: null, errors };
  
    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(',');
      if (values.length !== headers.length) {
        errors.push(`Línea ${i + 1}: número incorrecto de columnas.`);
        continue;
      }
      const row = headers.reduce((obj, header, index) => {
        obj[header] = values[index];
        return obj;
      }, {});
  
      try {
        data.timestamps.push(parseInt(row.timestamp, 10));
        data.temperature.push(parseFloat(row.temp));
        data.humidity.push(parseFloat(row.humidity));
        data.altitude.push(parseFloat(row.alt));
        data.pressure.push(parseFloat(row.pressure));
        data.walkieChannel.push(parseInt(row.walkie, 10));
        data.accelerometer.push({ x: parseFloat(row.acc_x), y: parseFloat(row.acc_y), z: parseFloat(row.acc_z) });
        data.gyroscope.push({ x: parseFloat(row.gyro_x), y: parseFloat(row.gyro_y), z: parseFloat(row.gyro_z) });
        data.coordinates.push({ lat: parseFloat(row.lat), lng: parseFloat(row.lng), alt: parseFloat(row.alt) });
      } catch (e) {
        errors.push(`Línea ${i + 1}: Error al parsear los datos.`);
      }
    }
  
    // Sort by timestamp
    const zipped = data.timestamps.map((ts, i) => ({
      ts,
      temp: data.temperature[i],
      hum: data.humidity[i],
      alt: data.altitude[i],
      pres: data.pressure[i],
      walkie: data.walkieChannel[i],
      acc: data.accelerometer[i],
      gyro: data.gyroscope[i],
      coord: data.coordinates[i],
    }));
  
    zipped.sort((a, b) => a.ts - b.ts);
  
    const sortedData = {
      temperature: zipped.map(z => z.temp),
      humidity: zipped.map(z => z.hum),
      altitude: zipped.map(z => z.alt),
      pressure: zipped.map(z => z.pres),
      walkieChannel: zipped.map(z => z.walkie),
      accelerometer: zipped.map(z => z.acc),
      gyroscope: zipped.map(z => z.gyro),
      coordinates: zipped.map(z => z.coord),
      timestamps: zipped.map(z => z.ts),
    };
  
    return { data: sortedData, errors };
  };