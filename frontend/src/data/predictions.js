export const HISTORICAL_PREDICTIONS = [
  {
    id: "PRED-1092",
    date: "01 Sep 2026 14:32",
    machineId: "CNC-204",
    machineName: "CNC Milling Machine",
    prediction: "No Failure Expected",
    riskLevel: "LOW",
    failureProbability: "8.4%",
    confidence: "94.2%",
    primaryDriver: "Normal Vibration",
    actualOutcome: "Normal Operation"
  },
  {
    id: "PRED-1091",
    date: "31 Aug 2026 09:15",
    machineId: "MOTOR-308",
    machineName: "Industrial Motor",
    prediction: "Imminent Failure Warning",
    riskLevel: "HIGH",
    failureProbability: "62.0%",
    confidence: "96.5%",
    primaryDriver: "BEARING DEGRADATION (Vib 8.1 mm/s)",
    actualOutcome: "Scheduled Maintenance"
  },
  {
    id: "PRED-1090",
    date: "29 Aug 2026 16:45",
    machineId: "PRESS-102",
    machineName: "Hydraulic Press",
    prediction: "Elevated Thermal Drift",
    riskLevel: "MEDIUM",
    failureProbability: "24.0%",
    confidence: "89.5%",
    primaryDriver: "Hydraulic Oil Temp (81.2°C)",
    actualOutcome: "Fluid Inspected"
  },
  {
    id: "PRED-1089",
    date: "27 Aug 2026 11:20",
    machineId: "PUMP-402",
    machineName: "Hydraulic Pump",
    prediction: "Intake Aeration Anomaly",
    riskLevel: "MEDIUM",
    failureProbability: "35.0%",
    confidence: "90.2%",
    primaryDriver: "Pressure Oscillation",
    actualOutcome: "Filter Replaced"
  },
  {
    id: "PRED-1088",
    date: "24 Aug 2026 08:00",
    machineId: "COMP-501",
    machineName: "Air Compressor",
    prediction: "Optimal Baseline",
    riskLevel: "LOW",
    failureProbability: "12.0%",
    confidence: "95.1%",
    primaryDriver: "Normal Discharge Temp",
    actualOutcome: "Normal Operation"
  },
  {
    id: "PRED-1087",
    date: "20 Aug 2026 13:10",
    machineId: "ROBOT-201",
    machineName: "Robotic Arm",
    prediction: "Optimal Baseline",
    riskLevel: "LOW",
    failureProbability: "9.0%",
    confidence: "93.8%",
    primaryDriver: "Axis 1 Alignment",
    actualOutcome: "Normal Operation"
  }
];

export const MODEL_PERFORMANCE_METRICS = {
  modelName: "RandomForestClassifier (n_estimators=150)",
  anomalyModel: "IsolationForest (contamination=0.1)",
  accuracy: "98.2%",
  precision: "91.7%",
  recall: "93.2%",
  f1Score: "92.4%",
  auc: "0.998",
  featuresCount: 8,
  trainingSamples: 2500,
  featureImportances: [
    { name: "Vibration (mm/s)", weight: 42, color: "#E85D25" },
    { name: "Temperature (°C)", weight: 27, color: "#234B63" },
    { name: "Current (A)", weight: 16, color: "#183746" },
    { name: "Pressure (bar)", weight: 9, color: "#D99520" },
    { name: "Operating Hours (h)", weight: 6, color: "#59656A" }
  ],
  confusionMatrix: {
    tp: 440,
    fp: 40,
    fn: 32,
    tn: 1988
  }
};
