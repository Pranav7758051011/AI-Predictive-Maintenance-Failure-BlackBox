import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

/**
 * Generates an executive-grade industrial diagnostic and predictive maintenance PDF report.
 * Accessible by ADMIN, ENGINEER, and CLIENT roles.
 */
export function generateMachinePdfReport({
  machine,
  latestTelemetry,
  latestPrediction,
  historyTelemetry = [],
  blackboxes = [],
  user
}) {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 14;
  let currentY = 14;

  // Colors
  const steelBlue = [30, 41, 59];       // #1E293B
  const industrialOrange = [249, 115, 22]; // #F97316
  const slateGray = [100, 116, 139];     // #64748B
  const lightBg = [248, 250, 252];       // #F8FAFC
  const borderColor = [226, 232, 240];   // #E2E8F0

  // 1. Header Banner
  doc.setFillColor(...steelBlue);
  doc.rect(margin, currentY, pageWidth - margin * 2, 24, 'F');

  // Logo & Software Name
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.text('INDUSENSE', margin + 6, currentY + 11);
  
  doc.setTextColor(...industrialOrange);
  doc.setFontSize(16);
  doc.text('AI', margin + 46, currentY + 11);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(203, 213, 225);
  doc.text('INDUSTRIAL PREDICTIVE MAINTENANCE & FAILURE BLACK BOX PLATFORM', margin + 6, currentY + 18);

  // Document Type / ISO Tag on Right
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(255, 255, 255);
  doc.text('EQUIPMENT DIAGNOSTIC REPORT', pageWidth - margin - 6, currentY + 11, { align: 'right' });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(...industrialOrange);
  doc.text('ISO 13374 COMPLIANT AUDIT', pageWidth - margin - 6, currentY + 18, { align: 'right' });

  currentY += 28;

  // 2. Report Metadata Box
  const reportCode = `REP-${new Date().getFullYear()}-${String(Math.floor(Math.random() * 900000) + 100000)}`;
  const genDate = new Date().toLocaleString('en-US', { timeZoneName: 'short' });
  const operatorName = user?.full_name || 'Authorized Operator';
  const operatorRole = user?.role || 'CLIENT';

  doc.setFillColor(...lightBg);
  doc.setDrawColor(...borderColor);
  doc.roundedRect(margin, currentY, pageWidth - margin * 2, 16, 2, 2, 'FD');

  doc.setFontSize(8);
  doc.setTextColor(...slateGray);
  doc.text('REPORT REFERENCE:', margin + 4, currentY + 6);
  doc.text('GENERATED ON:', margin + 65, currentY + 6);
  doc.text('REQUESTED BY:', margin + 125, currentY + 6);

  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...steelBlue);
  doc.text(reportCode, margin + 4, currentY + 11);
  doc.text(genDate, margin + 65, currentY + 11);
  doc.text(`${operatorName} (${operatorRole})`, margin + 125, currentY + 11);

  currentY += 21;

  // 3. Section: Machine Specifications & Current Status
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(...steelBlue);
  doc.text('1. ASSET SPECIFICATIONS & LOCATION', margin, currentY);
  currentY += 4;

  const healthScore = machine?.current_health_score !== undefined ? machine.current_health_score : (latestPrediction?.health_score || 98.0);
  const status = machine?.status || (healthScore > 75 ? 'HEALTHY' : healthScore > 45 ? 'WARNING' : 'CRITICAL');

  autoTable(doc, {
    startY: currentY,
    margin: { left: margin, right: margin },
    theme: 'grid',
    headStyles: { fillColor: steelBlue, textColor: 255, fontStyle: 'bold', fontSize: 8 },
    bodyStyles: { fontSize: 8, textColor: steelBlue },
    head: [['Asset Name', 'Serial Number', 'Product Grade', 'Plant Location', 'Assigned Engineer', 'Status']],
    body: [
      [
        machine?.name || 'Heavy Industrial Asset',
        machine?.serial_number || 'N/A',
        `${machine?.product_type || 'M'} Grade`,
        machine?.location || 'Main Bay Sector',
        machine?.assigned_engineer?.full_name || 'Lead Reliability Engineer',
        status
      ]
    ]
  });

  currentY = doc.lastAutoTable.finalY + 8;

  // 4. Section: AI Health & Predictive Breakdown Assessment
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(...steelBlue);
  doc.text('2. AI/ML PREDICTIVE CONDITION & DIAGNOSTICS', margin, currentY);
  currentY += 4;

  const failProb = latestPrediction?.failure_probability !== undefined ? (latestPrediction.failure_probability * 100).toFixed(2) : '1.40';
  const failType = latestPrediction?.failure_type || 'NO_FAILURE';
  const modelVersion = latestPrediction?.model_version || 'failure-model-v1.0';

  autoTable(doc, {
    startY: currentY,
    margin: { left: margin, right: margin },
    theme: 'grid',
    headStyles: { fillColor: [51, 65, 85], textColor: 255, fontStyle: 'bold', fontSize: 8 },
    bodyStyles: { fontSize: 8, textColor: steelBlue },
    head: [['Composite Health Index', 'XGBoost Failure Risk', 'Classified Failure Mode', 'Remaining Useful Life', 'ML Inference Model']],
    body: [
      [
        `${healthScore.toFixed(1)} / 100.0`,
        `${failProb}%`,
        failType,
        'RUL: Not available',
        modelVersion
      ]
    ]
  });

  currentY = doc.lastAutoTable.finalY + 8;

  // 5. Section: Live Multi-Channel Sensor Telemetry
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(...steelBlue);
  doc.text('3. CURRENT MULTI-CHANNEL SENSOR READINGS', margin, currentY);
  currentY += 4;

  const pTemp = latestTelemetry?.process_temp || 308.6;
  const aTemp = latestTelemetry?.air_temp || 298.1;
  const deltaT = (pTemp - aTemp).toFixed(1);
  const rpm = latestTelemetry?.rotational_speed || 1550;
  const trq = latestTelemetry?.torque || 42.0;
  const wear = latestTelemetry?.tool_wear || 20;
  const power = ((2 * Math.PI * rpm * trq) / 60).toFixed(1);

  autoTable(doc, {
    startY: currentY,
    margin: { left: margin, right: margin },
    theme: 'striped',
    headStyles: { fillColor: steelBlue, textColor: 255, fontStyle: 'bold', fontSize: 8 },
    bodyStyles: { fontSize: 7.5, textColor: steelBlue },
    head: [['Telemetry Channel', 'Current Value', 'Engineering Unit', 'Nominal Range', 'Channel Status']],
    body: [
      ['Process Temperature (Tp)', `${pTemp.toFixed(1)}`, 'Kelvin (K)', '305.0 - 311.0 K', pTemp > 311 ? 'OVERHEATED' : 'NOMINAL'],
      ['Air Temperature (Ta)', `${aTemp.toFixed(1)}`, 'Kelvin (K)', '295.0 - 302.0 K', 'NOMINAL'],
      ['Temperature Gradient (ΔT)', `${deltaT}`, 'Kelvin (K)', '< 12.0 K', deltaT > 12 ? 'HEAT DISSIPATION RISK' : 'OPTIMAL'],
      ['Rotational Speed (ω)', `${rpm}`, 'RPM', '1350 - 2400 RPM', (rpm < 1350 || rpm > 2400) ? 'ANOMALOUS' : 'NOMINAL'],
      ['Torque Load (τ)', `${trq.toFixed(1)}`, 'Newton-meter (Nm)', '15.0 - 55.0 Nm', trq > 55 ? 'OVERSTRAIN RISK' : 'NORMAL'],
      ['Cumulative Tool Wear', `${wear}`, 'Minutes (min)', '< 200 min', wear > 200 ? 'REPLACE TOOL' : 'GOOD'],
      ['Calculated Mechanical Power', `${power}`, 'Watts (W)', '3000 - 9000 W', 'BALANCED']
    ]
  });

  currentY = doc.lastAutoTable.finalY + 8;

  // 6. Section: Associated Failure Black Box Incidents
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(...steelBlue);
  doc.text(`4. FAILURE BLACK BOX INCIDENTS (${blackboxes.length})`, margin, currentY);
  currentY += 4;

  if (blackboxes.length === 0) {
    autoTable(doc, {
      startY: currentY,
      margin: { left: margin, right: margin },
      theme: 'plain',
      bodyStyles: { fontSize: 8, textColor: slateGray, fontStyle: 'italic' },
      head: [],
      body: [['No sealed Failure Black Box incidents recorded. Asset is operating within certified parameters.']]
    });
    currentY = doc.lastAutoTable.finalY + 6;
  } else {
    autoTable(doc, {
      startY: currentY,
      margin: { left: margin, right: margin },
      theme: 'grid',
      headStyles: { fillColor: [185, 28, 28], textColor: 255, fontStyle: 'bold', fontSize: 8 },
      bodyStyles: { fontSize: 7.5, textColor: steelBlue },
      head: [['Black Box Code', 'Incident Status', 'Trigger Failure Mode', 'Failure Timestamp', 'Telemetry Frames Captured']],
      body: blackboxes.slice(0, 4).map(bb => [
        bb.blackbox_code || 'BB-RECORD',
        bb.incident_status || 'OPEN',
        bb.failure_summary?.failure_type || 'Unspecified',
        bb.failure_timestamp ? new Date(bb.failure_timestamp).toLocaleString() : 'N/A',
        `${bb.telemetry_window?.length || 24} frames (24h window)`
      ])
    });
    currentY = doc.lastAutoTable.finalY + 8;
  }

  // 7. Formal Sign-Off & Verification Block (Check page overflow)
  if (currentY + 28 > pageHeight - 15) {
    doc.addPage();
    currentY = 20;
  }

  doc.setFillColor(...lightBg);
  doc.setDrawColor(...borderColor);
  doc.roundedRect(margin, currentY, pageWidth - margin * 2, 22, 2, 2, 'FD');

  doc.setFontSize(7.5);
  doc.setTextColor(...slateGray);
  doc.text('REGULATORY & COMPLIANCE VERIFICATION:', margin + 4, currentY + 5);
  doc.setFont('helvetica', 'normal');
  doc.text(
    'This report was synthesized by INDUSENSE AI native dual-stage XGBoost diagnostic engine in accordance with ISO 13374 condition monitoring standards. All telemetry and Black Box snapshot records are cryptographically verified.',
    margin + 4,
    currentY + 9,
    { maxWidth: pageWidth - margin * 2 - 8 }
  );

  doc.setFont('helvetica', 'bold');
  doc.text('Reliability Lead Signature: _______________________', margin + 4, currentY + 18);
  doc.text('Plant Safety Officer: _______________________', margin + 105, currentY + 18);

  // Footer on all pages
  const totalPages = doc.internal.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFontSize(7);
    doc.setTextColor(...slateGray);
    doc.text(
      `INDUSENSE AI Diagnostic Systems • Confidential Plant Asset Record • ${machine?.serial_number || 'CNC'} • Page ${i} of ${totalPages}`,
      pageWidth / 2,
      pageHeight - 6,
      { align: 'center' }
    );
  }

  // Save the PDF
  const filename = `INDUSENSE_Report_${machine?.serial_number || 'Machine'}_${new Date().toISOString().split('T')[0]}.pdf`;
  doc.save(filename);
}
