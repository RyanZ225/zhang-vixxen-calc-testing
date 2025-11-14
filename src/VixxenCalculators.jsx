import React, { useState, useMemo } from 'react';
import { AlertCircle } from 'lucide-react';
import sideDrawing from './VixxenSideDrawing.svg';

const VixxenWBCalculator = () => {
  const [selectedReg, setSelectedReg] = useState('23-8666');
  const [paxWeight, setPaxWeight] = useState(105);
  const [baggageWeight, setBaggageWeight] = useState(15);
  const [fuelLiters, setFuelLiters] = useState(30);
  const [plannedTime, setPlannedTime] = useState(1.2);
  const [fuelBurnRate, setFuelBurnRate] = useState(15);
  const [taxiFuel, setTaxiFuel] = useState(2);
  const [useYLILReserve, setUseYLILReserve] = useState(false);
  const [defaultFuelBurnRate, setDefaultFuelBurnRate] = useState(15);
  const [defaultTaxiFuel, setDefaultTaxiFuel] = useState(2);
  const [fuelMode, setFuelMode] = useState('time');
  const [activeTab, setActiveTab] = useState('wb');
  
  const [pohTakeoffDist, setPohTakeoffDist] = useState(319);
  const [pohLandingDist, setPohLandingDist] = useState(404);
  const [runwaySlope, setRunwaySlope] = useState(0);
  const [surfaceType, setSurfaceType] = useState('sealed-dry');
  const [tempAboveISA, setTempAboveISA] = useState(0);
  const [elevationIncrease, setElevationIncrease] = useState(0);
  const [tailwindComponent, setTailwindComponent] = useState(0);
  const [approachSpeedIncrease, setApproachSpeedIncrease] = useState(0);
  const [thresholdHeightIncrease, setThresholdHeightIncrease] = useState(0);
  const [noContinuousBraking, setNoContinuousBraking] = useState(false);

  const regData = {
    '23-8666': { emptyWeight: 320.9, emptyArm: 1.581, crewArm: 1.663, baggageArm: 2.320, fuelArm: 1.960 },
    '23-8639': { emptyWeight: 318.5, emptyArm: 1.627, crewArm: 1.663, baggageArm: 2.320, fuelArm: 1.960 },
    '23-8852': { emptyWeight: 332.5, emptyArm: 1.645, crewArm: 1.663, baggageArm: 2.320, fuelArm: 1.960 },
    '23-8848': { emptyWeight: 316.2, emptyArm: 1.630, crewArm: 1.663, baggageArm: 2.320, fuelArm: 1.960 },
    'Generic': { emptyWeight: 332.5, emptyArm: 1.645, crewArm: 1.663, baggageArm: 2.320, fuelArm: 1.960 }
  };

  const MTOW = 600;
  const MAX_FUEL_LITERS = 90;
  const USABLE_FUEL = 88;
  const UNUSABLE_FUEL = 2;
  const RESERVE_TIME = 0.5;
  const YLIL_RESERVE_MULTIPLIER = 0.10;
  const MAX_BAGGAGE = 30;
  const FUEL_DENSITY = 0.72;
  const CG_MIN = 1.528;
  const CG_MAX = 1.78;

  const aircraft = regData[selectedReg];

  const calculations = useMemo(() => {
    let tripFuel, endurance;
    
    if (fuelMode === 'time') {
      tripFuel = plannedTime * fuelBurnRate;
      endurance = plannedTime;
    } else {
      const reserveFuelCalc = RESERVE_TIME * fuelBurnRate;
      const availableForTrip = fuelLiters - taxiFuel - reserveFuelCalc - UNUSABLE_FUEL;
      const ylilReserveCalc = useYLILReserve ? availableForTrip * YLIL_RESERVE_MULTIPLIER : 0;
      tripFuel = availableForTrip - ylilReserveCalc;
      endurance = tripFuel / fuelBurnRate;
    }
    
    const reserveFuel = RESERVE_TIME * fuelBurnRate;
    const ylilReserve = useYLILReserve ? tripFuel * YLIL_RESERVE_MULTIPLIER : 0;
    const totalFuelRequired = tripFuel + taxiFuel + reserveFuel + UNUSABLE_FUEL + ylilReserve;
    const remainingFuel = MAX_FUEL_LITERS - totalFuelRequired;
    
    const fuelWeight = fuelLiters * FUEL_DENSITY;
    
    const emptyMoment = aircraft.emptyWeight * aircraft.emptyArm;
    const paxMoment = paxWeight * aircraft.crewArm;
    const baggageMoment = baggageWeight * aircraft.baggageArm;
    const fuelMoment = fuelWeight * aircraft.fuelArm;
    
    const ZFW = aircraft.emptyWeight + paxWeight + baggageWeight;
    const TOGW = ZFW + fuelWeight;
    const totalMoment = emptyMoment + paxMoment + baggageMoment + fuelMoment;
    const cg = totalMoment / TOGW;
    
    const maxPayload = MTOW - aircraft.emptyWeight - fuelWeight;
    const payload = paxWeight + baggageWeight;
    const remaining = maxPayload - payload;

    return {
      tripFuel,
      taxiFuel,
      reserveFuel,
      ylilReserve,
      totalFuelRequired,
      remainingFuel,
      endurance,
      fuelWeight,
      emptyMoment,
      paxMoment,
      baggageMoment,
      fuelMoment,
      ZFW,
      TOGW,
      totalMoment,
      cg,
      maxPayload,
      payload,
      remaining
    };
  }, [selectedReg, paxWeight, baggageWeight, fuelLiters, aircraft, plannedTime, fuelBurnRate, taxiFuel, useYLILReserve, fuelMode]);

  const performanceCalc = useMemo(() => {
    const mtow = MTOW;
    const weightFactor = mtow <= 2000 ? 1.15 : mtow <= 3500 ? 1.15 + ((mtow - 2000) / 1500) * 0.10 : 1.25;
    const landingWeightFactor = mtow <= 2000 ? 1.15 : mtow <= 4500 ? 1.15 + ((mtow - 2000) / 2500) * 0.28 : 1.43;
    
    let takeoffFactors = [{ name: 'Base Safety Factor', factor: weightFactor }];
    let landingFactors = [{ name: 'Base Safety Factor', factor: landingWeightFactor }];
    
    let takeoffFactor = weightFactor;
    let landingFactor = landingWeightFactor;
    
    // Takeoff factors
    if (tempAboveISA > 0) {
      const tempIncrements = Math.ceil(tempAboveISA / 10);
      const tempFactor = Math.pow(1.1, tempIncrements);
      takeoffFactors.push({ name: `Temperature +${tempAboveISA}°C above ISA`, factor: tempFactor });
      takeoffFactor *= tempFactor;
    }
    if (elevationIncrease > 0) {
      const elevIncrements = Math.ceil(elevationIncrease / 1000);
      const elevFactor = Math.pow(1.1, elevIncrements);
      takeoffFactors.push({ name: `Elevation +${elevationIncrease}ft`, factor: elevFactor });
      takeoffFactor *= elevFactor;
    }
    if (tailwindComponent > 0) {
      const liftoffSpeed = 65;
      const tailwindPercent = (tailwindComponent / liftoffSpeed) * 100;
      const tailwindIncrements = Math.ceil(tailwindPercent / 10);
      const tailwindFactor = Math.pow(1.2, tailwindIncrements);
      takeoffFactors.push({ name: `Tailwind ${tailwindComponent}kts`, factor: tailwindFactor });
      takeoffFactor *= tailwindFactor;
    }
    if (runwaySlope > 0) {
      const slopeIncrements = Math.ceil(runwaySlope / 2);
      const slopeFactor = Math.pow(1.1, slopeIncrements);
      takeoffFactors.push({ name: `Uphill slope ${runwaySlope}%`, factor: slopeFactor });
      takeoffFactor *= slopeFactor;
    }
    
    // Surface factors for takeoff
    if (surfaceType === 'soft-snow') {
      takeoffFactors.push({ name: 'Soft Ground/Snow', factor: 1.25 });
      takeoffFactor *= 1.25;
    } else if (surfaceType === 'dry-grass') {
      takeoffFactors.push({ name: 'Dry Grass (up to 20cm)', factor: 1.2 });
      takeoffFactor *= 1.2;
    } else if (surfaceType === 'wet-grass') {
      takeoffFactors.push({ name: 'Wet Grass (up to 20cm)', factor: 1.3 });
      takeoffFactor *= 1.3;
    }
    
    // Landing factors
    if (tempAboveISA > 0) {
      const tempIncrements = Math.ceil(tempAboveISA / 10);
      const tempFactor = Math.pow(1.05, tempIncrements);
      landingFactors.push({ name: `Temperature +${tempAboveISA}°C above ISA`, factor: tempFactor });
      landingFactor *= tempFactor;
    }
    if (elevationIncrease > 0) {
      const elevIncrements = Math.ceil(elevationIncrease / 1000);
      const elevFactor = Math.pow(1.05, elevIncrements);
      landingFactors.push({ name: `Elevation +${elevationIncrease}ft`, factor: elevFactor });
      landingFactor *= elevFactor;
    }
    if (tailwindComponent > 0) {
      const landingSpeed = 80;
      const tailwindPercent = (tailwindComponent / landingSpeed) * 100;
      const tailwindIncrements = Math.ceil(tailwindPercent / 10);
      const tailwindFactor = Math.pow(1.2, tailwindIncrements);
      landingFactors.push({ name: `Tailwind ${tailwindComponent}kts`, factor: tailwindFactor });
      landingFactor *= tailwindFactor;
    }
    if (runwaySlope < 0) {
      const slopeIncrements = Math.ceil(Math.abs(runwaySlope));
      const slopeFactor = Math.pow(1.1, slopeIncrements);
      landingFactors.push({ name: `Downhill slope ${Math.abs(runwaySlope)}%`, factor: slopeFactor });
      landingFactor *= slopeFactor;
    }
    if (approachSpeedIncrease > 0) {
      const speedIncrements = Math.ceil(approachSpeedIncrease / 10);
      const speedFactor = Math.pow(1.2, speedIncrements);
      landingFactors.push({ name: `Approach speed +${approachSpeedIncrease}kts`, factor: speedFactor });
      landingFactor *= speedFactor;
    }
    if (noContinuousBraking) {
      landingFactors.push({ name: 'No continuous max braking', factor: 1.2 });
      landingFactor *= 1.2;
    }
    
    // Surface factors for landing
    if (surfaceType === 'wet-sealed') {
      landingFactors.push({ name: 'Wet Sealed Surface', factor: 1.15 });
      landingFactor *= 1.15;
    } else if (surfaceType === 'muddy-snow') {
      landingFactors.push({ name: 'Muddy/Light Snow', factor: 1.25 });
      landingFactor *= 1.25;
    } else if (surfaceType === 'dry-grass') {
      landingFactors.push({ name: 'Dry Grass (up to 20cm)', factor: 1.2 });
      landingFactor *= 1.2;
    } else if (surfaceType === 'wet-grass') {
      landingFactors.push({ name: 'Wet Grass (up to 20cm)', factor: 1.3 });
      landingFactor *= 1.3;
    } else if (surfaceType === 'dense-grass') {
      landingFactors.push({ name: 'Short & Dense/Very Green Grass', factor: 1.6 });
      landingFactor *= 1.6;
    } else if (surfaceType === 'standing-water') {
      landingFactors.push({ name: 'Standing Water (20-50mm)', factor: 1.5 });
      landingFactor *= 1.5;
    }
    
    const requiredTakeoff = pohTakeoffDist * takeoffFactor;
    let requiredLanding = pohLandingDist * landingFactor;
    
    let thresholdAddition = 0;
    if (thresholdHeightIncrease > 0) {
      const heightIncrementsOf10ft = Math.ceil(thresholdHeightIncrease / 10);
      thresholdAddition = heightIncrementsOf10ft * 61;
      requiredLanding += thresholdAddition;
    }
    
    return {
      takeoffFactor,
      landingFactor,
      requiredTakeoff,
      requiredLanding,
      takeoffFactors,
      landingFactors,
      thresholdAddition
    };
  }, [pohTakeoffDist, pohLandingDist, runwaySlope, surfaceType, tempAboveISA, 
      elevationIncrease, tailwindComponent, approachSpeedIncrease, 
      thresholdHeightIncrease, noContinuousBraking]);

  const warnings = useMemo(() => {
    const w = [];
    if (calculations.TOGW > MTOW) w.push('TOGW exceeds MTOW');
    if (calculations.cg < CG_MIN || calculations.cg > CG_MAX) w.push('CG out of limits');
    if (baggageWeight > MAX_BAGGAGE) w.push('Baggage exceeds maximum');
    if (fuelLiters > MAX_FUEL_LITERS) w.push('Fuel exceeds maximum');
    if (calculations.remainingFuel < 0) w.push('Insufficient fuel for planned flight');
    return w;
  }, [calculations, baggageWeight, fuelLiters]);

  const syncFuelToCalculated = () => {
    if (fuelMode === 'time') {
      setFuelLiters(Math.min(Math.ceil(calculations.totalFuelRequired), MAX_FUEL_LITERS));
    }
  };

  const resetFuelDefaults = () => {
    setFuelBurnRate(defaultFuelBurnRate);
    setTaxiFuel(defaultTaxiFuel);
  };

  // --- CG diagram helpers (aircraft overlay) ---
  const PT_PER_METER = 1 / 0.01417;
  const SVG_TOTAL_PT = 442.35;
  const DATUM_OFFSET_PT = 15;

  const armToPercent = (arm) => {
    const pointPosition = DATUM_OFFSET_PT + arm * PT_PER_METER;
    return (pointPosition / SVG_TOTAL_PT) * 100;
  };

  const getBarWidth = (weight, total) => {
    return Math.max((weight / total) * 100, 0);
  };

  const getFuelBarWidth = (liters, total) => {
    return Math.max((liters / total) * 100, 0);
  };

  // --- CG marker data for diagram ---
  const safeRangeStart = armToPercent(CG_MIN);
  const safeRangeEnd = armToPercent(CG_MAX);
  const safeRangeWidth = safeRangeEnd - safeRangeStart;

  const MARKER_AXIS_PERCENT = 54;
  const MARKER_LINE_LENGTH = 84; // keep markers clear of the fuselage before labels render

  const cgMarkers = [
    {
      key: 'empty',
      label: `Empty ${aircraft.emptyArm.toFixed(3)} m`,
      arm: aircraft.emptyArm,
      color: 'bg-indigo-400',
      labelTint: 'bg-slate-900/95 border border-indigo-400/40 text-indigo-100',
    },
    {
      key: 'crew',
      label: `Crew ${aircraft.crewArm.toFixed(3)} m`,
      arm: aircraft.crewArm,
      color: 'bg-emerald-400',
      labelTint: 'bg-slate-900/95 border border-emerald-400/40 text-emerald-100',
    },
    {
      key: 'baggage',
      label: `Baggage ${aircraft.baggageArm.toFixed(3)} m`,
      arm: aircraft.baggageArm,
      color: 'bg-amber-400',
      labelTint: 'bg-slate-900/95 border border-amber-400/40 text-amber-100',
    },
    {
      key: 'fuel',
      label: `Fuel ${aircraft.fuelArm.toFixed(3)} m`,
      arm: aircraft.fuelArm,
      color: 'bg-sky-400',
      labelTint: 'bg-slate-900/95 border border-sky-400/40 text-sky-100',
    },
  ];

  const totalMarker = {
    key: 'total',
    label: `Total CG ${calculations.cg.toFixed(3)} m`,
    arm: calculations.cg,
    color: 'bg-blue-500',
    labelTint: 'bg-blue-500/15 border border-blue-400/60 text-blue-100 shadow-blue-500/30',
  };

  return (
    <div className="min-h-screen bg-slate-950 p-4">
      <div className="max-w-7xl mx-auto">
        <div className="bg-slate-900 rounded-lg shadow-2xl border border-slate-800 p-6">
          <div className="border-b border-slate-700 pb-4 mb-6">
            <h1 className="text-2xl font-bold text-slate-100 tracking-tight">
              Vixxen Calculator
            </h1>
            <p className="text-slate-400 text-sm mt-1">Aircraft Performance Management System</p>
            
            <div className="flex gap-2 mt-4">
              <button
                onClick={() => setActiveTab('wb')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  activeTab === 'wb'
                    ? 'bg-blue-600 text-white'
                    : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                }`}
              >
                Weight & Balance
              </button>
              <button
                onClick={() => setActiveTab('perf')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  activeTab === 'perf'
                    ? 'bg-blue-600 text-white'
                    : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                }`}
              >
                Performance Calculator
              </button>
            </div>
          </div>

          {warnings.length > 0 && activeTab === 'wb' && (
            <div className="bg-red-950/50 border border-red-900/50 rounded-lg p-3 mb-6">
              <div className="flex items-start">
                <AlertCircle className="text-red-400 mr-2 flex-shrink-0 mt-0.5" size={18} />
                <div>
                  <h3 className="font-semibold text-red-400 text-sm mb-1">Warnings</h3>
                  <ul className="list-disc list-inside text-red-300 text-xs space-y-0.5">
                    {warnings.map((w, i) => <li key={i}>{w}</li>)}
                  </ul>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'wb' && (
          <div className="grid lg:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div className="bg-slate-800 border border-slate-700 rounded-lg p-4">
                <h2 className="text-base font-semibold text-slate-200 mb-4 tracking-tight">Weight & Balance</h2>
                
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-400 mb-1.5">Aircraft Registration</label>
                    <select
                      value={selectedReg}
                      onChange={(e) => setSelectedReg(e.target.value)}
                      className="w-full p-2 bg-slate-900 border border-slate-600 rounded text-sm text-slate-200 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                    >
                      {Object.keys(regData).map(reg => (
                        <option key={reg} value={reg}>{reg === 'Generic' ? 'Generic Vixxen (POH)' : reg}</option>
                      ))}
                    </select>
                    <div className="mt-2 grid grid-cols-2 gap-2 text-xs">
                      <div className="bg-slate-900/50 border border-slate-700 p-1.5 rounded">
                        <span className="text-slate-500">Empty:</span>
                        <span className="text-slate-300 font-medium ml-1">{aircraft.emptyWeight} kg</span>
                      </div>
                      <div className="bg-slate-900/50 border border-slate-700 p-1.5 rounded">
                        <span className="text-slate-500">Arm:</span>
                        <span className="text-slate-300 font-medium ml-1">{aircraft.emptyArm} m</span>
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-400 mb-1.5">Passenger & Crew Weight (kg)</label>
                    <input
                      type="number"
                      value={paxWeight}
                      onChange={(e) => setPaxWeight(Number(e.target.value))}
                      className="w-full p-2 bg-slate-900 border border-slate-600 rounded text-sm text-slate-200 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                    />
                    <div className="mt-1 text-xs text-slate-500">Arm: {aircraft.crewArm} m</div>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-400 mb-1.5">Baggage (kg) - Max: {MAX_BAGGAGE}</label>
                    <input
                      type="number"
                      value={baggageWeight}
                      onChange={(e) => setBaggageWeight(Number(e.target.value))}
                      max={MAX_BAGGAGE}
                      className="w-full p-2 bg-slate-900 border border-slate-600 rounded text-sm text-slate-200 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                    />
                    <div className="mt-1 text-xs text-slate-500">Arm: {aircraft.baggageArm} m</div>
                  </div>

                  <div>
                    <div className="flex justify-between items-center mb-1.5">
                      <label className="block text-xs font-medium text-slate-400">Fuel on Board (L) - Max: {MAX_FUEL_LITERS}</label>
                      <button
                        onClick={syncFuelToCalculated}
                        className="px-2 py-1 bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium rounded transition-colors"
                      >
                        Sync
                      </button>
                    </div>
                    <input
                      type="number"
                      value={fuelLiters}
                      onChange={(e) => setFuelLiters(Number(e.target.value))}
                      max={MAX_FUEL_LITERS}
                      className="w-full p-2 bg-slate-900 border border-slate-600 rounded text-sm text-slate-200 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                    />
                    <div className="mt-1 text-xs text-slate-500">Weight: {calculations.fuelWeight.toFixed(1)} kg | Arm: {aircraft.fuelArm} m</div>
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <div className="bg-slate-800 border border-slate-700 rounded-lg p-4">
                  <h3 className="text-sm font-semibold text-slate-300 mb-3 tracking-tight">Weight Summary</h3>
                  <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-xs">
                    <div className="flex justify-between border-b border-slate-700 pb-1.5">
                      <span className="text-slate-400">MTOW</span>
                      <span className="text-slate-200 font-medium">{MTOW} kg</span>
                    </div>
                    <div className="flex justify-between border-b border-slate-700 pb-1.5">
                      <span className="text-slate-400">Max Payload</span>
                      <span className="text-slate-200 font-medium">{calculations.maxPayload.toFixed(1)} kg</span>
                    </div>
                    <div className="flex justify-between border-b border-slate-700 pb-1.5">
                      <span className="text-slate-400">ZFW</span>
                      <span className="text-slate-200 font-medium">{calculations.ZFW.toFixed(1)} kg</span>
                    </div>
                    <div className="flex justify-between border-b border-slate-700 pb-1.5">
                      <span className="text-slate-400">TOGW</span>
                      <span className={`font-medium ${calculations.TOGW > MTOW ? 'text-red-400' : 'text-emerald-400'}`}>
                        {calculations.TOGW.toFixed(1)} kg
                      </span>
                    </div>
                    <div className="flex justify-between border-b border-slate-700 pb-1.5">
                      <span className="text-slate-400">Payload</span>
                      <span className="text-slate-200 font-medium">{calculations.payload.toFixed(1)} kg</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Remaining</span>
                      <span className={`font-medium ${calculations.remaining < 0 ? 'text-red-400' : 'text-emerald-400'}`}>
                        {calculations.remaining.toFixed(1)} kg
                      </span>
                    </div>
                  </div>
                </div>

                <div className="bg-slate-800 border border-slate-700 rounded-lg p-4">
                  <h3 className="text-sm font-semibold text-slate-300 mb-3 tracking-tight">Center of Gravity</h3>
                  <div className="space-y-2">
                    <div className="flex justify-between text-xs border-b border-slate-700 pb-1.5">
                      <span className="text-slate-400">Total Moment</span>
                      <span className="text-slate-200 font-medium">{calculations.totalMoment.toFixed(1)} kg·m</span>
                    </div>
                    <div className="flex justify-between text-xs border-b border-slate-700 pb-1.5">
                      <span className="text-slate-400">CG Position</span>
                      <span className={`font-medium ${calculations.cg < CG_MIN || calculations.cg > CG_MAX ? 'text-red-400' : 'text-emerald-400'}`}>
                        {calculations.cg.toFixed(3)} m
                      </span>
                    </div>
                    <div className="flex justify-between text-xs pb-2">
                      <span className="text-slate-400">CG Limits</span>
                      <span className="text-slate-500 font-medium">{CG_MIN} - {CG_MAX} m</span>
                    </div>
                    
                    <div className="mt-3 space-y-3">
                      {/* --- Aircraft CG diagram replaces legacy bar graph --- */}
                      <div className="relative bg-slate-950/80 border border-slate-800 rounded-lg overflow-hidden pb-20">
                        {/* lighten the SVG to improve contrast on the dark theme */}
                        <img
                          src={sideDrawing}
                          alt="Vixxen aircraft side profile"
                          className="w-full h-auto opacity-95 invert brightness-150"
                        />
                        <div className="absolute inset-0 pointer-events-none">
                          <div
                            className="absolute top-0 bottom-[5rem] bg-emerald-500/15 border-x border-emerald-400/60"
                            style={{ left: `${safeRangeStart}%`, width: `${safeRangeWidth}%` }}
                          ></div>

                          {[...cgMarkers, totalMarker].map((marker) => (
                            <div
                              key={marker.key}
                              className={`absolute flex flex-col items-center -translate-x-1/2 ${
                                marker.key === 'total' ? 'z-10' : ''
                              }`}
                              style={{ left: `${armToPercent(marker.arm)}%`, top: `${MARKER_AXIS_PERCENT}%` }}
                            >
                              <div
                                className={`${
                                  marker.key === 'total'
                                    ? 'w-4 h-4 border-2 border-white shadow-lg'
                                    : 'w-3 h-3 border border-slate-900 shadow shadow-black/40'
                                } ${marker.color}`}
                                style={{ marginTop: marker.key === 'total' ? '-8px' : '-6px', borderRadius: '9999px' }}
                              ></div>
                              <div
                                className={`${
                                  marker.key === 'total' ? 'bg-blue-400/70' : 'bg-slate-500/60'
                                } w-px`}
                                style={{ height: MARKER_LINE_LENGTH }}
                              ></div>
                              <span
                                className={`mt-2 px-2 py-0.5 text-[10px] font-medium rounded shadow ${marker.labelTint}`}
                              >
                                {marker.label}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center justify-center gap-3 text-[11px] text-slate-400">
                        <div className="flex items-center gap-1">
                          <span className="w-2.5 h-2.5 rounded-full bg-indigo-400"></span>
                          <span>Empty</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <span className="w-2.5 h-2.5 rounded-full bg-emerald-400"></span>
                          <span>Crew</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <span className="w-2.5 h-2.5 rounded-full bg-amber-400"></span>
                          <span>Baggage</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <span className="w-2.5 h-2.5 rounded-full bg-sky-400"></span>
                          <span>Fuel</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <span className="w-3 h-3 rounded-full border border-white bg-blue-500"></span>
                          <span>Total CG</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <span className="w-6 h-1 rounded bg-emerald-400/60 border border-emerald-500/60"></span>
                          <span>Safe Range</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-slate-800 border border-slate-700 rounded-lg p-4">
                <h3 className="text-sm font-semibold text-slate-300 mb-3 tracking-tight">Weight Distribution</h3>
                <div className="relative h-14 bg-slate-950 rounded overflow-hidden flex text-xs">
                  <div 
                    className="bg-indigo-600 flex items-center justify-center text-white font-medium border-r border-slate-950"
                    style={{ width: `${getBarWidth(aircraft.emptyWeight, MTOW)}%` }}
                  >
                    {aircraft.emptyWeight}
                  </div>
                  <div 
                    className="bg-emerald-600 flex items-center justify-center text-white font-medium border-r border-slate-950"
                    style={{ width: `${getBarWidth(paxWeight, MTOW)}%` }}
                  >
                    {paxWeight}
                  </div>
                  <div 
                    className="bg-amber-600 flex items-center justify-center text-white font-medium border-r border-slate-950"
                    style={{ width: `${getBarWidth(baggageWeight, MTOW)}%` }}
                  >
                    {baggageWeight}
                  </div>
                  <div 
                    className="bg-sky-600 flex items-center justify-center text-white font-medium border-r border-slate-950"
                    style={{ width: `${getBarWidth(calculations.fuelWeight, MTOW)}%` }}
                  >
                    {calculations.fuelWeight.toFixed(1)}
                  </div>
                  <div 
                    className="bg-slate-700 flex items-center justify-center text-slate-400 font-medium"
                    style={{ width: `${getBarWidth(MTOW - calculations.TOGW, MTOW)}%` }}
                  >
                    {(MTOW - calculations.TOGW).toFixed(1)}
                  </div>
                </div>
                <div className="flex gap-3 mt-3 flex-wrap text-xs">
                  <div className="flex items-center gap-1.5">
                    <div className="w-3 h-3 bg-indigo-600 rounded-sm"></div>
                    <span className="text-slate-400">Empty</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <div className="w-3 h-3 bg-emerald-600 rounded-sm"></div>
                    <span className="text-slate-400">Pax</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <div className="w-3 h-3 bg-amber-600 rounded-sm"></div>
                    <span className="text-slate-400">Baggage</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <div className="w-3 h-3 bg-sky-600 rounded-sm"></div>
                    <span className="text-slate-400">Fuel</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <div className="w-3 h-3 bg-slate-700 rounded-sm"></div>
                    <span className="text-slate-400">Remaining</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <div className="bg-slate-800 border border-slate-700 rounded-lg p-4">
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-base font-semibold text-slate-200 tracking-tight">Fuel Calculation</h2>
                  <button
                    onClick={resetFuelDefaults}
                    className="px-2 py-1 bg-slate-700 hover:bg-slate-600 text-slate-300 text-xs font-medium rounded transition-colors border border-slate-600"
                  >
                    Reset
                  </button>
                </div>
                
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-400 mb-1.5">Calculation Mode</label>
                    <select
                      value={fuelMode}
                      onChange={(e) => setFuelMode(e.target.value)}
                      className="w-full p-2 bg-slate-900 border border-slate-600 rounded text-sm text-slate-200 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                    >
                      <option value="time">Plan by Time</option>
                      <option value="endurance">Calculate Endurance</option>
                    </select>
                  </div>

                  {fuelMode === 'time' ? (
                    <div>
                      <label className="block text-xs font-medium text-slate-400 mb-1.5">Planned Time (hours)</label>
                      <input
                        type="number"
                        step="0.1"
                        value={plannedTime}
                        onChange={(e) => setPlannedTime(Number(e.target.value))}
                        className="w-full p-2 bg-slate-900 border border-slate-600 rounded text-sm text-slate-200 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                      />
                    </div>
                  ) : (
                    <div className="bg-slate-900 border border-slate-600 rounded p-3">
                      <label className="block text-xs font-medium text-slate-400 mb-1">Calculated Endurance</label>
                      <div className="text-2xl font-bold text-blue-400">
                        {calculations.endurance.toFixed(2)} hrs
                      </div>
                      <div className="text-xs text-slate-500 mt-1">
                        Based on {fuelLiters}L fuel on board
                      </div>
                    </div>
                  )}

                  <div>
                    <label className="block text-xs font-medium text-slate-400 mb-1.5">Fuel Burn Rate (L/hr) - Default: {defaultFuelBurnRate}</label>
                    <input
                      type="number"
                      value={fuelBurnRate}
                      onChange={(e) => setFuelBurnRate(Number(e.target.value))}
                      className="w-full p-2 bg-slate-900 border border-slate-600 rounded text-sm text-slate-200 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-400 mb-1.5">Taxi Fuel (L) - Default: {defaultTaxiFuel}</label>
                    <input
                      type="number"
                      value={taxiFuel}
                      onChange={(e) => setTaxiFuel(Number(e.target.value))}
                      className="w-full p-2 bg-slate-900 border border-slate-600 rounded text-sm text-slate-200 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                    />
                  </div>

                  <div className="flex items-center gap-2 pt-1">
                    <input
                      type="checkbox"
                      id="ylil"
                      checked={useYLILReserve}
                      onChange={(e) => setUseYLILReserve(e.target.checked)}
                      className="w-4 h-4 rounded bg-slate-900 border-slate-600 text-blue-600 focus:ring-blue-500 focus:ring-offset-slate-800"
                    />
                    <label htmlFor="ylil" className="text-xs font-medium text-slate-400">
                      YLIL +10% Reserve
                    </label>
                  </div>

                  <div className="bg-slate-900 border border-slate-700 rounded p-3 mt-3">
                    <h4 className="text-xs font-semibold text-slate-400 mb-2">Set Defaults</h4>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-xs text-slate-500 mb-1">Burn (L/hr)</label>
                        <input
                          type="number"
                          value={defaultFuelBurnRate}
                          onChange={(e) => setDefaultFuelBurnRate(Number(e.target.value))}
                          className="w-full p-1.5 text-xs bg-slate-800 border border-slate-600 rounded text-slate-300 focus:outline-none focus:border-blue-500"
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-slate-500 mb-1">Taxi (L)</label>
                        <input
                          type="number"
                          value={defaultTaxiFuel}
                          onChange={(e) => setDefaultTaxiFuel(Number(e.target.value))}
                          className="w-full p-1.5 text-xs bg-slate-800 border border-slate-600 rounded text-slate-300 focus:outline-none focus:border-blue-500"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-slate-800 border border-slate-700 rounded-lg p-4">
                <h3 className="text-sm font-semibold text-slate-300 mb-3 tracking-tight">Fuel Breakdown</h3>
                <div className="space-y-1.5 text-xs">
                  <div className="flex justify-between border-b border-slate-700 pb-1.5">
                    <span className="text-slate-400">Time × Fuel burn/hr</span>
                    <span className="text-slate-200 font-medium">{calculations.tripFuel.toFixed(1)} L</span>
                  </div>
                  <div className="flex justify-between border-b border-slate-700 pb-1.5">
                    <span className="text-slate-400">Taxi</span>
                    <span className="text-slate-200 font-medium">{calculations.taxiFuel.toFixed(1)} L</span>
                  </div>
                  <div className="flex justify-between border-b border-slate-700 pb-1.5">
                    <span className="text-slate-400">Reserve +30min</span>
                    <span className="text-slate-200 font-medium">{calculations.reserveFuel.toFixed(1)} L</span>
                  </div>
                  <div className="flex justify-between border-b border-slate-700 pb-1.5">
                    <span className="text-slate-400">Unusable</span>
                    <span className="text-slate-200 font-medium">{UNUSABLE_FUEL.toFixed(1)} L</span>
                  </div>
                  {useYLILReserve && (
                    <div className="flex justify-between border-b border-slate-700 pb-1.5">
                      <span className="text-slate-400">YLIL +10%</span>
                      <span className="text-slate-200 font-medium">{calculations.ylilReserve.toFixed(1)} L</span>
                    </div>
                  )}
                  <div className="flex justify-between pt-2 text-sm border-t border-slate-600">
                    <span className="text-slate-300 font-semibold">Total Required</span>
                    <span className="text-slate-100 font-semibold">{calculations.totalFuelRequired.toFixed(1)} L</span>
                  </div>
                  <div className="flex justify-between pt-1">
                    <span className="text-slate-400 font-medium">Remaining</span>
                    <span className={`font-medium ${calculations.remainingFuel < 0 ? 'text-red-400' : 'text-slate-400'}`}>
                      {calculations.remainingFuel.toFixed(1)} L
                    </span>
                  </div>
                </div>
              </div>

              <div className="bg-slate-800 border border-slate-700 rounded-lg p-4">
                <h3 className="text-sm font-semibold text-slate-300 mb-3 tracking-tight">Fuel Distribution</h3>
                <div className="relative h-14 bg-slate-950 rounded overflow-hidden flex text-xs">
                  <div 
                    className="bg-blue-600 flex items-center justify-center text-white font-medium border-r border-slate-950"
                    style={{ width: `${getFuelBarWidth(calculations.tripFuel, MAX_FUEL_LITERS)}%` }}
                  >
                    {calculations.tripFuel.toFixed(1)}
                  </div>
                  <div 
                    className="bg-cyan-600 flex items-center justify-center text-white font-medium border-r border-slate-950"
                    style={{ width: `${getFuelBarWidth(calculations.taxiFuel, MAX_FUEL_LITERS)}%` }}
                  >
                    {calculations.taxiFuel.toFixed(1)}
                  </div>
                  <div 
                    className="bg-orange-600 flex items-center justify-center text-white font-medium border-r border-slate-950"
                    style={{ width: `${getFuelBarWidth(calculations.reserveFuel, MAX_FUEL_LITERS)}%` }}
                  >
                    {calculations.reserveFuel.toFixed(1)}
                  </div>
                  {useYLILReserve && (
                    <div 
                      className="bg-amber-600 flex items-center justify-center text-white font-medium border-r border-slate-950"
                      style={{ width: `${getFuelBarWidth(calculations.ylilReserve, MAX_FUEL_LITERS)}%` }}
                    >
                      {calculations.ylilReserve.toFixed(1)}
                    </div>
                  )}
                  <div 
                    className="bg-red-800 flex items-center justify-center text-white font-medium border-r border-slate-950"
                    style={{ width: `${getFuelBarWidth(UNUSABLE_FUEL, MAX_FUEL_LITERS)}%` }}
                  >
                    {UNUSABLE_FUEL.toFixed(1)}
                  </div>
                  <div 
                    className="bg-slate-700 flex items-center justify-center text-slate-400 font-medium"
                    style={{ width: `${getFuelBarWidth(calculations.remainingFuel, MAX_FUEL_LITERS)}%` }}
                  >
                    {calculations.remainingFuel.toFixed(1)}
                  </div>
                </div>
                <div className="flex gap-3 mt-3 flex-wrap text-xs">
                  <div className="flex items-center gap-1.5">
                    <div className="w-3 h-3 bg-blue-600 rounded-sm"></div>
                    <span className="text-slate-400">Trip</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <div className="w-3 h-3 bg-cyan-600 rounded-sm"></div>
                    <span className="text-slate-400">Taxi</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <div className="w-3 h-3 bg-orange-600 rounded-sm"></div>
                    <span className="text-slate-400">Reserve</span>
                  </div>
                  {useYLILReserve && (
                    <div className="flex items-center gap-1.5">
                      <div className="w-3 h-3 bg-amber-600 rounded-sm"></div>
                      <span className="text-slate-400">YLIL</span>
                    </div>
                  )}
                  <div className="flex items-center gap-1.5">
                    <div className="w-3 h-3 bg-red-800 rounded-sm"></div>
                    <span className="text-slate-400">Unusable</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <div className="w-3 h-3 bg-slate-700 rounded-sm"></div>
                    <span className="text-slate-400">Remaining</span>
                  </div>
                </div>
                <div className="mt-3 text-center text-xs text-slate-500">
                  Usable: {USABLE_FUEL} L | Total: {MAX_FUEL_LITERS} L
                </div>
              </div>
            </div>
          </div>
          )}

          {activeTab === 'perf' && (
          <div className="space-y-6">
            <div className="grid lg:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div className="bg-slate-800 border border-slate-700 rounded-lg p-4">
                  <h2 className="text-base font-semibold text-slate-200 mb-4 tracking-tight">POH Performance Data</h2>
                  
                  <div className="space-y-3">
                    <div>
                      <label className="block text-xs font-medium text-slate-400 mb-1.5">Takeoff Distance (m) - POH</label>
                      <input
                        type="number"
                        value={pohTakeoffDist}
                        onChange={(e) => setPohTakeoffDist(Number(e.target.value))}
                        className="w-full p-2 bg-slate-900 border border-slate-600 rounded text-sm text-slate-200 focus:outline-none focus:border-blue-500"
                      />
                      <div className="mt-1 text-xs text-slate-500">From POH: 319m (to 15m/50ft)</div>
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-slate-400 mb-1.5">Landing Distance (m) - POH</label>
                      <input
                        type="number"
                        value={pohLandingDist}
                        onChange={(e) => setPohLandingDist(Number(e.target.value))}
                        className="w-full p-2 bg-slate-900 border border-slate-600 rounded text-sm text-slate-200 focus:outline-none focus:border-blue-500"
                      />
                      <div className="mt-1 text-xs text-slate-500">From POH: 404m (from 15m/50ft)</div>
                    </div>
                  </div>
                </div>

                <div className="bg-slate-800 border border-slate-700 rounded-lg p-4">
                  <h2 className="text-base font-semibold text-slate-200 mb-4 tracking-tight">Runway Conditions</h2>
                  
                  <div className="space-y-3">
                    <div>
                      <label className="block text-xs font-medium text-slate-400 mb-1.5">Surface Type</label>
                      <select
                        value={surfaceType}
                        onChange={(e) => setSurfaceType(e.target.value)}
                        className="w-full p-2 bg-slate-900 border border-slate-600 rounded text-sm text-slate-200 focus:outline-none focus:border-blue-500"
                      >
                        <option value="sealed-dry">Sealed - Dry</option>
                        <option value="wet-sealed">Sealed - Wet</option>
                        <option value="dry-grass">Grass - Dry (up to 20cm)</option>
                        <option value="wet-grass">Grass - Wet (up to 20cm)</option>
                        <option value="dense-grass">Grass - Short & Dense/Very Green</option>
                        <option value="soft-snow">Soft Ground/Snow</option>
                        <option value="muddy-snow">Muddy/Light Snow</option>
                        <option value="standing-water">Standing Water (20-50mm)</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-slate-400 mb-1.5">Runway Slope (%)</label>
                      <input
                        type="number"
                        step="0.1"
                        value={runwaySlope}
                        onChange={(e) => setRunwaySlope(Number(e.target.value))}
                        className="w-full p-2 bg-slate-900 border border-slate-600 rounded text-sm text-slate-200 focus:outline-none focus:border-blue-500"
                      />
                      <div className="mt-1 text-xs text-slate-500">Positive = uphill takeoff, Negative = downhill landing</div>
                    </div>
                  </div>
                </div>

                <div className="bg-slate-800 border border-slate-700 rounded-lg p-4">
                  <h2 className="text-base font-semibold text-slate-200 mb-4 tracking-tight">Environmental Conditions</h2>
                  
                  <div className="space-y-3">
                    <div>
                      <label className="block text-xs font-medium text-slate-400 mb-1.5">Temperature Above ISA (°C)</label>
                      <input
                        type="number"
                        value={tempAboveISA}
                        onChange={(e) => setTempAboveISA(Number(e.target.value))}
                        className="w-full p-2 bg-slate-900 border border-slate-600 rounded text-sm text-slate-200 focus:outline-none focus:border-blue-500"
                      />
                      <div className="mt-1 text-xs text-slate-500">Each +10°C = +10% TO / +5% LDG</div>
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-slate-400 mb-1.5">Elevation Increase (ft above MSL)</label>
                      <input
                        type="number"
                        value={elevationIncrease}
                        onChange={(e) => setElevationIncrease(Number(e.target.value))}
                        className="w-full p-2 bg-slate-900 border border-slate-600 rounded text-sm text-slate-200 focus:outline-none focus:border-blue-500"
                      />
                      <div className="mt-1 text-xs text-slate-500">Each +1000ft = +10% TO / +5% LDG</div>
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-slate-400 mb-1.5">Tailwind Component (kts)</label>
                      <input
                        type="number"
                        value={tailwindComponent}
                        onChange={(e) => setTailwindComponent(Number(e.target.value))}
                        className="w-full p-2 bg-slate-900 border border-slate-600 rounded text-sm text-slate-200 focus:outline-none focus:border-blue-500"
                      />
                      <div className="mt-1 text-xs text-slate-500">Per 10% of speed = +20%</div>
                    </div>
                  </div>
                </div>

                <div className="bg-slate-800 border border-slate-700 rounded-lg p-4">
                  <h2 className="text-base font-semibold text-slate-200 mb-4 tracking-tight">Landing Specific</h2>
                  
                  <div className="space-y-3">
                    <div>
                      <label className="block text-xs font-medium text-slate-400 mb-1.5">Approach Speed Above Target (kts)</label>
                      <input
                        type="number"
                        value={approachSpeedIncrease}
                        onChange={(e) => setApproachSpeedIncrease(Number(e.target.value))}
                        className="w-full p-2 bg-slate-900 border border-slate-600 rounded text-sm text-slate-200 focus:outline-none focus:border-blue-500"
                      />
                      <div className="mt-1 text-xs text-slate-500">Each +10kts = +20%</div>
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-slate-400 mb-1.5">Threshold Height Above 50ft (ft)</label>
                      <input
                        type="number"
                        value={thresholdHeightIncrease}
                        onChange={(e) => setThresholdHeightIncrease(Number(e.target.value))}
                        className="w-full p-2 bg-slate-900 border border-slate-600 rounded text-sm text-slate-200 focus:outline-none focus:border-blue-500"
                      />
                      <div className="mt-1 text-xs text-slate-500">Each +10ft adds 61m to landing distance</div>
                    </div>

                    <div className="flex items-center gap-2 pt-1">
                      <input
                        type="checkbox"
                        id="no-braking"
                        checked={noContinuousBraking}
                        onChange={(e) => setNoContinuousBraking(e.target.checked)}
                        className="w-4 h-4 rounded bg-slate-900 border-slate-600"
                      />
                      <label htmlFor="no-braking" className="text-xs font-medium text-slate-400">
                        No Continuous Max Braking (+20%)
                      </label>
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <div className="bg-gradient-to-br from-blue-900 to-blue-800 border border-blue-700 rounded-lg p-6">
                  <h2 className="text-xl font-bold text-white mb-4 tracking-tight">Takeoff Performance</h2>
                  
                  <div className="space-y-3">
                    <div className="bg-blue-950/50 rounded-lg p-4 border border-blue-700">
                      <div className="text-sm text-blue-300 mb-1">POH Distance</div>
                      <div className="text-2xl font-bold text-white">{pohTakeoffDist} m</div>
                    </div>

                    <div className="bg-blue-950/50 rounded-lg p-3 border border-blue-700">
                      <div className="text-xs text-blue-300 mb-2 font-semibold">Safety Factors Applied:</div>
                      <div className="space-y-1 text-xs">
                        {performanceCalc.takeoffFactors.map((f, i) => (
                          <div key={i} className="flex justify-between text-blue-200">
                            <span>{f.name}</span>
                            <span className="font-mono">{f.factor.toFixed(2)}×</span>
                          </div>
                        ))}
                        <div className="flex justify-between pt-1 border-t border-blue-700 text-blue-100 font-semibold">
                          <span>Combined Factor</span>
                          <span className="font-mono">{performanceCalc.takeoffFactor.toFixed(2)}×</span>
                        </div>
                      </div>
                    </div>

                    <div className="bg-emerald-600 rounded-lg p-4 border-2 border-emerald-400">
                      <div className="text-sm text-emerald-100 mb-1">Required Takeoff Distance</div>
                      <div className="text-3xl font-bold text-white">{Math.ceil(performanceCalc.requiredTakeoff)} m</div>
                      <div className="text-xs text-emerald-200 mt-1 font-mono">
                        {pohTakeoffDist}m × {performanceCalc.takeoffFactor.toFixed(2)} = {Math.ceil(performanceCalc.requiredTakeoff)}m
                      </div>
                    </div>
                  </div>
                </div>

                <div className="bg-gradient-to-br from-amber-900 to-amber-800 border border-amber-700 rounded-lg p-6">
                  <h2 className="text-xl font-bold text-white mb-4 tracking-tight">Landing Performance</h2>
                  
                  <div className="space-y-3">
                    <div className="bg-amber-950/50 rounded-lg p-4 border border-amber-700">
                      <div className="text-sm text-amber-300 mb-1">POH Distance</div>
                      <div className="text-2xl font-bold text-white">{pohLandingDist} m</div>
                    </div>

                    <div className="bg-amber-950/50 rounded-lg p-3 border border-amber-700">
                      <div className="text-xs text-amber-300 mb-2 font-semibold">Safety Factors Applied:</div>
                      <div className="space-y-1 text-xs">
                        {performanceCalc.landingFactors.map((f, i) => (
                          <div key={i} className="flex justify-between text-amber-200">
                            <span>{f.name}</span>
                            <span className="font-mono">{f.factor.toFixed(2)}×</span>
                          </div>
                        ))}
                        {performanceCalc.thresholdAddition > 0 && (
                          <div className="flex justify-between text-amber-200">
                            <span>Threshold height +{thresholdHeightIncrease}ft</span>
                            <span className="font-mono">+{performanceCalc.thresholdAddition}m</span>
                          </div>
                        )}
                        <div className="flex justify-between pt-1 border-t border-amber-700 text-amber-100 font-semibold">
                          <span>Combined Factor</span>
                          <span className="font-mono">{performanceCalc.landingFactor.toFixed(2)}×</span>
                        </div>
                      </div>
                    </div>

                    <div className="bg-emerald-600 rounded-lg p-4 border-2 border-emerald-400">
                      <div className="text-sm text-emerald-100 mb-1">Required Landing Distance</div>
                      <div className="text-3xl font-bold text-white">{Math.ceil(performanceCalc.requiredLanding)} m</div>
                      <div className="text-xs text-emerald-200 mt-1 font-mono">
                        {pohLandingDist}m × {performanceCalc.landingFactor.toFixed(2)}
                        {performanceCalc.thresholdAddition > 0 && ` + ${performanceCalc.thresholdAddition}m`}
                        {' = '}{Math.ceil(performanceCalc.requiredLanding)}m
                      </div>
                    </div>
                  </div>
                </div>

                <div className="bg-slate-800 border border-slate-700 rounded-lg p-4">
                  <h3 className="text-sm font-semibold text-slate-300 mb-3">About AC 91-02 Safety Factors</h3>
                  <div className="text-xs text-slate-400 space-y-1">
                    <div>• Base factor: 1.15× for aircraft &lt; 2000kg MTOW</div>
                    <div>• All factors are cumulative (multiplied together)</div>
                    <div>• Accounts for pilot technique vs test pilot performance</div>
                    <div>• Provides margins for environmental variations</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default VixxenWBCalculator;
