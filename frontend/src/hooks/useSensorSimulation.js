import { useState, useEffect, useCallback } from 'react';
import { machineService } from '../services/machineService';
import { sensorService } from '../services/sensorService';
import { predictionService } from '../services/predictionService';

export function useSensorSimulation() {
  const [machines, setMachines] = useState([]);
  const [activeMachineId, setActiveMachineId] = useState('');
  const [activeMachine, setActiveMachine] = useState(null);
  const [latestTelemetry, setLatestTelemetry] = useState(null);
  const [latestPrediction, setLatestPrediction] = useState(null);
  const [simulationStep, setSimulationStep] = useState(0);
  const [isSimulating, setIsSimulating] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Load real machines from Cloud Firestore
  const fetchMachines = useCallback(async () => {
    try {
      const res = await machineService.getMachines();
      const items = res?.items || [];
      setMachines(items);
      if (items.length > 0) {
        setActiveMachineId((prev) => prev || items[0].id);
      }
    } catch (err) {
      setError(err.message || 'Failed to fetch machines from fleet database.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMachines();
  }, [fetchMachines]);

  // Load telemetry and monitoring data for active machine
  const fetchMachineData = useCallback(async (machineId) => {
    if (!machineId) return;
    try {
      const [machRes, telRes, predRes] = await Promise.allSettled([
        machineService.getMachineById(machineId),
        sensorService.getLatestTelemetry(machineId),
        predictionService.getMachinePredictions(machineId, { page_size: 1 })
      ]);

      if (machRes.status === 'fulfilled') {
        setActiveMachine(machRes.value);
      }
      if (telRes.status === 'fulfilled') {
        setLatestTelemetry(telRes.value);
      } else {
        setLatestTelemetry(null);
      }
      if (predRes.status === 'fulfilled' && predRes.value?.items?.length > 0) {
        setLatestPrediction(predRes.value.items[0]);
      } else {
        setLatestPrediction(null);
      }
    } catch (err) {
      console.error('Error fetching active machine telemetry:', err);
    }
  }, []);

  useEffect(() => {
    if (activeMachineId) {
      fetchMachineData(activeMachineId);
    }
  }, [activeMachineId, fetchMachineData]);

  /**
   * Ingests real telemetry samples to Flask and executes real XGBoost inference.
   * On failure, Flask automatically creates the Failure Black Box!
   */
  const triggerSimulation = useCallback(async (mode = "failure", step = null) => {
    if (!activeMachineId) return;
    setIsSimulating(true);

    const nextStep = step !== null ? step : (simulationStep + 1) % 5;
    setSimulationStep(nextStep);

    // AI4I 2020 Physics-Calibrated Telemetry Conditions
    const stepTelemetry = [
      // Step 0: Baseline Nominal (Delta T ~ 10K, Power ~ 6.5 kW, Low Wear)
      { air_temp: 298.1, process_temp: 308.6, rotational_speed: 1550.0, torque: 42.0, tool_wear: 20.0 },
      // Step 1: Minor Sensor Shift (Wear ~ 80min)
      { air_temp: 298.5, process_temp: 309.2, rotational_speed: 1500.0, torque: 44.5, tool_wear: 80.0 },
      // Step 2: Thermal Drift (Process Temp elevated)
      { air_temp: 299.0, process_temp: 310.8, rotational_speed: 1460.0, torque: 48.0, tool_wear: 140.0 },
      // Step 3: High Load / Approaching Warning Threshold
      { air_temp: 299.5, process_temp: 312.2, rotational_speed: 1380.0, torque: 58.0, tool_wear: 185.0 },
      // Step 4: Critical Heat Dissipation / Overstrain Failure (Delta T 15K, Torque 68Nm, Wear 215min)
      { air_temp: 298.0, process_temp: 313.0, rotational_speed: 1250.0, torque: 68.0, tool_wear: 215.0 }
    ];

    const selectedReading = mode === "normal" ? stepTelemetry[0] : stepTelemetry[nextStep];

    try {
      // 1. Ingest real sensor telemetry to Flask
      await sensorService.ingestTelemetry(activeMachineId, selectedReading);

      // 2. Execute real XGBoost inference on Flask
      const pred = await predictionService.predictFromLatest(activeMachineId);
      setLatestPrediction(pred);

      // 3. Refresh machine state and telemetry
      await fetchMachineData(activeMachineId);
      await fetchMachines();
    } catch (err) {
      console.error('Error executing telemetry simulation on Flask:', err);
    } finally {
      setIsSimulating(false);
    }
  }, [activeMachineId, simulationStep, fetchMachineData, fetchMachines]);

  const resetSimulation = useCallback(async () => {
    setSimulationStep(0);
    if (activeMachineId) {
      await triggerSimulation("normal", 0);
    }
  }, [activeMachineId, triggerSimulation]);

  return {
    machines,
    activeMachine: activeMachine || (machines.length > 0 ? machines[0] : null),
    activeMachineId,
    setActiveMachineId,
    latestTelemetry,
    latestPrediction,
    simulationMode: simulationStep === 0 ? 'normal' : 'failure',
    simulationStep,
    isSimulating,
    loading,
    error,
    triggerSimulation,
    resetSimulation,
    refresh: fetchMachines
  };
}
