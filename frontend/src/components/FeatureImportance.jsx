import React from 'react';

export default function FeatureImportance({ features }) {
  const defaultFeatures = {
    "Vibration": 42,
    "Temperature": 27,
    "Current": 16,
    "Pressure": 9,
    "Operating Hours": 6
  };

  const featureData = features || defaultFeatures;
  const topFeature = Object.entries(featureData).sort((a, b) => b[1] - a[1])[0];

  const featureConfigs = {
    "Vibration":       { barColor: "bg-industrial-orange", textColor: "text-industrial-orange", dotColor: "bg-industrial-orange" },
    "Temperature":     { barColor: "bg-steel-blue",        textColor: "text-steel-blue",        dotColor: "bg-steel-blue" },
    "Current":         { barColor: "bg-steel-blue-dark",   textColor: "text-steel-blue-dark",   dotColor: "bg-steel-blue-dark" },
    "Pressure":        { barColor: "bg-status-warning",    textColor: "text-status-warning",    dotColor: "bg-status-warning" },
    "Operating Hours": { barColor: "bg-industrial-subtext", textColor: "text-industrial-subtext", dotColor: "bg-industrial-subtext" },
  };

  return (
    <div className="industrial-card p-5 space-y-4 hover:shadow-industrial-hover transition duration-300">
      <div className="pb-2 border-b border-industrial-border">
        <h3 className="text-base font-bold text-industrial-text">Feature Importance Analysis</h3>
        <p className="text-xs text-industrial-subtext">Which sensor signals contribute most to the ML failure prediction?</p>
      </div>

      {/* Feature Progress Bars */}
      <div className="space-y-4">
        {Object.entries(featureData).map(([name, weight]) => {
          const cfg = featureConfigs[name] || featureConfigs["Operating Hours"];
          return (
            <div key={name} className="group space-y-1.5 cursor-default">
              <div className="flex justify-between items-center text-xs font-medium text-industrial-text">
                <div className="flex items-center gap-2">
                  <span className={`w-2 h-2 rounded-full ${cfg.dotColor}`} />
                  <span className={`font-semibold group-hover:${cfg.textColor} transition`}>{name}</span>
                </div>
                <span className={`font-mono font-bold ${cfg.textColor}`}>{weight}%</span>
              </div>
              <div className="h-2.5 w-full bg-industrial-gray rounded-full overflow-hidden border border-industrial-border">
                <div
                  className={`h-full rounded-full transition-all duration-700 ease-out ${cfg.barColor} group-hover:brightness-110`}
                  style={{ width: `${weight}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>

      {/* Dynamic Model Explanation Box */}
      {topFeature && (
        <div className="bg-steel-blue/5 p-3.5 rounded-md border border-steel-blue/20 hover:border-steel-blue/40 text-xs text-industrial-text transition duration-200">
          <span className="font-bold text-steel-blue block mb-1">Model Explanation Summary:</span>
          <span>
            <strong className="text-industrial-orange">{topFeature[0]} ({topFeature[1]}%)</strong>
            {' '}is currently the strongest contributor to the predicted failure risk score for this asset.
          </span>
        </div>
      )}
    </div>
  );
}
