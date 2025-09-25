function getDistance(lat1, lon1, lat2, lon2) {
    const R = 6371e3; // metres
    const φ1 = lat1 * Math.PI/180;
    const φ2 = lat2 * Math.PI/180;
    const Δφ = (lat2-lat1) * Math.PI/180;
    const Δλ = (lon2-lon1) * Math.PI/180;
  
    const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
              Math.cos(φ1) * Math.cos(φ2) *
              Math.sin(Δλ/2) * Math.sin(Δλ/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  
    return R * c; // in metres
  }
  
  export function calculateSpeedsAndDistance(flightData) {
    const { coordinates, altitude, timestamps } = flightData;
    const numPoints = timestamps.length;
  
    if (numPoints < 2) {
      return { verticalSpeed: 0, horizontalSpeed: 0, distance: 0 };
    }
  
    const lastIndex = numPoints - 1;
    const prevIndex = numPoints - 2;
  
    const lastCoord = coordinates[lastIndex];
    const prevCoord = coordinates[prevIndex];
    const lastAlt = altitude[lastIndex];
    const prevAlt = altitude[prevIndex];
    const lastTime = timestamps[lastIndex];
    const prevTime = timestamps[prevIndex];
  
    const timeDiffSeconds = (lastTime - prevTime) / 1000;
  
    if (timeDiffSeconds === 0) {
      return { verticalSpeed: 0, horizontalSpeed: 0, distance: 0 };
    }
  
    // Vertical Speed
    const altDiff = lastAlt - prevAlt;
    const verticalSpeed = altDiff / timeDiffSeconds; // m/s
  
    // Horizontal Speed
    const horizontalDistance = getDistance(prevCoord.lat, prevCoord.lng, lastCoord.lat, lastCoord.lng);
    const horizontalSpeed = horizontalDistance / timeDiffSeconds; // m/s
  
    // Total Distance
    let totalDistance = 0;
    for (let i = 1; i < numPoints; i++) {
      totalDistance += getDistance(coordinates[i-1].lat, coordinates[i-1].lng, coordinates[i].lat, coordinates[i].lng);
    }
  
    return {
      verticalSpeed,
      horizontalSpeed,
      distance: totalDistance,
    };
  }