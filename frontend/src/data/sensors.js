// Generates realistic multi-sensor telemetry history for Recharts visualization
export const generateSensorHistory = (machineId = "CNC-204", timeframe = "24H") => {
  const pointsMap = {
    "1H": 12,
    "6H": 24,
    "24H": 24,
    "7D": 28,
    "30D": 30
  };
  const count = pointsMap[timeframe] || 24;
  const data = [];
  
  let baseTemp = 68.0;
  let baseVib = 2.4;
  let basePress = 4.8;
  let baseRpm = 2850;
  let baseCurrent = 18.4;
  let baseLoad = 74;

  if (machineId === "PRESS-102") {
    baseTemp = 80.0; baseVib = 4.5; basePress = 6.0; baseCurrent = 25.0;
  } else if (machineId === "MOTOR-308") {
    baseTemp = 92.0; baseVib = 7.5; basePress = 5.0; baseCurrent = 32.0;
  }

  for (let i = 0; i < count; i++) {
    let label = "";
    if (timeframe === "1H") {
      label = `${i * 5}m ago`;
    } else if (timeframe === "6H" || timeframe === "24H") {
      const hour = (24 - count + i) % 24;
      label = `${hour.toString().padStart(2, '0')}:00`;
    } else {
      label = `Day ${i + 1}`;
    }

    // Add mild trend and drift
    const trend = (i / count) * (machineId === "MOTOR-308" ? 1.5 : 0.3);
    const noise = (Math.random() - 0.5) * 0.4;
    
    const temp = Number((baseTemp + trend * 3 + noise * 2).toFixed(1));
    const vib = Number((baseVib + trend * 1.2 + noise * 0.5).toFixed(2));
    const press = Number((basePress + noise * 0.2).toFixed(1));
    const rpm = Math.round(baseRpm + noise * 50);
    const current = Number((baseCurrent + trend * 1.5 + noise).toFixed(1));
    const load = Math.min(100, Math.round(baseLoad + trend * 5 + noise * 3));
    
    // Risk score approximation (0..100)
    const riskScore = Math.min(100, Math.max(5, Math.round((vib / 8.0) * 60 + (temp / 100.0) * 40)));
    const healthScore = 100 - riskScore;

    data.push({
      time: label,
      temperature: temp,
      vibration: vib,
      pressure: press,
      rpm: rpm,
      current: current,
      load: load,
      health: healthScore,
      risk: riskScore,
      tempUpperThreshold: 80.0,
      vibUpperThreshold: 4.5,
      isAnomaly: vib > 4.5 || temp > 80.0
    });
  }

  return data;
};
