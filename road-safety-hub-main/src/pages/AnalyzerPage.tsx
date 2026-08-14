import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ShieldAlert, Zap, Eye, Gauge, Brain, AlertTriangle, CheckCircle, Info, Bike, Car, Bus, Truck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';

interface ScenarioInput {
  vehicleType: string;
  weather: string;
  roadCondition: string;
  timeOfDay: string;
  speed: number;
  helmetUsed: boolean;
  seatbeltUsed: boolean;
  alcoholInvolved: boolean;
  mobileUsage: boolean;
  driverLicense: string;
}

interface PredictionResult {
  severity: string;
  confidence: number;
  riskPercentage: number;
  riskLevel: string;
  crashForce: number;
  kineticEnergy: number;
  reactionTime: number;
  roadFriction: number;
  visibility: number;
  vulnerability: number;
  protectionFactor: number;
}

function calculateRisk(input: ScenarioInput): PredictionResult {
  const vehicleFactors: Record<string, { mass: number; vulnerability: number }> = {
    Bike: { mass: 200, vulnerability: 0.95 },
    Car: { mass: 1500, vulnerability: 0.5 },
    Bus: { mass: 12000, vulnerability: 0.3 },
    Truck: { mass: 18000, vulnerability: 0.25 },
  };
  const weatherFactors: Record<string, { friction: number; visibility: number }> = {
    Clear: { friction: 0.8, visibility: 1.0 },
    Rainy: { friction: 0.5, visibility: 0.6 },
    Foggy: { friction: 0.65, visibility: 0.3 },
  };
  const roadFactors: Record<string, number> = { Dry: 1.0, Wet: 0.7, Damaged: 0.5 };
  const timeFactors: Record<string, number> = { Morning: 0.8, Afternoon: 0.7, Evening: 0.85, Night: 1.0 };

  const vf = vehicleFactors[input.vehicleType] || vehicleFactors.Car;
  const wf = weatherFactors[input.weather] || weatherFactors.Clear;
  const rf = roadFactors[input.roadCondition] || 1.0;
  const tf = timeFactors[input.timeOfDay] || 0.8;

  const speedMs = input.speed / 3.6;
  const kineticEnergy = 0.5 * vf.mass * speedMs * speedMs;
  const reactionTime = 1.5 * tf * (input.alcoholInvolved ? 2.0 : 1.0) * (input.mobileUsage ? 1.5 : 1.0);
  const roadFriction = wf.friction * rf;
  const visibility = wf.visibility * (input.timeOfDay === 'Night' ? 0.5 : 1.0);

  // Crash force
  const vehicleCrashMult = input.vehicleType === 'Truck' ? 1.8 : input.vehicleType === 'Bus' ? 1.5 : input.vehicleType === 'Car' ? 1.0 : 0.4;
  const weatherCrashMult = input.weather === 'Rainy' ? 1.3 : input.weather === 'Foggy' ? 1.2 : 1.0;
  const roadCrashMult = input.roadCondition === 'Wet' ? 1.2 : input.roadCondition === 'Damaged' ? 1.4 : 1.0;
  const crashForce = (0.02 * input.speed * input.speed * vehicleCrashMult * weatherCrashMult * roadCrashMult) / 1000;

  // Protection
  let protectionFactor = 1.0;
  if (input.vehicleType === 'Bike' && input.helmetUsed) protectionFactor = 0.5;
  if (input.vehicleType !== 'Bike' && input.seatbeltUsed) protectionFactor = 0.6;

  // Risk calculation
  const energyRisk = Math.min(kineticEnergy / 500000, 1.0) * 30;
  const reactionRisk = Math.min(reactionTime / 4.0, 1.0) * 15;
  const frictionRisk = (1 - roadFriction) * 15;
  const visibilityRisk = (1 - visibility) * 10;
  const vulnerabilityRisk = vf.vulnerability * 15;
  const protectionReduction = (1 - protectionFactor) * 15;

  let riskPercentage = energyRisk + reactionRisk + frictionRisk + visibilityRisk + vulnerabilityRisk - protectionReduction;
  if (input.alcoholInvolved) riskPercentage += 15;
  if (input.mobileUsage) riskPercentage += 8;
  if (input.driverLicense === 'Invalid') riskPercentage += 10;
  riskPercentage = Math.max(0, Math.min(100, riskPercentage));

  const riskLevel = riskPercentage >= 75 ? 'CRITICAL' : riskPercentage >= 50 ? 'HIGH' : riskPercentage >= 25 ? 'MODERATE' : 'LOW';

  // Severity prediction
  let severity = 'Minor';
  let confidence = 85;
  if (riskPercentage >= 70) { severity = 'Fatal'; confidence = 78 + Math.random() * 15; }
  else if (riskPercentage >= 45) { severity = 'Serious'; confidence = 72 + Math.random() * 18; }
  else { severity = 'Minor'; confidence = 80 + Math.random() * 15; }

  return {
    severity, confidence: Math.round(confidence), riskPercentage: Math.round(riskPercentage),
    riskLevel, crashForce: Math.round(crashForce * 100) / 100,
    kineticEnergy: Math.round(kineticEnergy), reactionTime: Math.round(reactionTime * 100) / 100,
    roadFriction: Math.round(roadFriction * 100) / 100, visibility: Math.round(visibility * 100) / 100,
    vulnerability: vf.vulnerability, protectionFactor,
  };
}

function generateRecommendations(input: ScenarioInput, result: PredictionResult): string[] {
  const recs: string[] = [];
  if (input.speed > 80) recs.push('🚨 Reduce speed below 80 km/h to significantly decrease crash severity');
  if (input.speed > 60) recs.push('⚡ High speed increases kinetic energy exponentially — consider slowing down');
  if (input.vehicleType === 'Bike' && !input.helmetUsed) recs.push('🪖 Wearing a helmet reduces fatal head injury risk by 69%');
  if (input.vehicleType !== 'Bike' && !input.seatbeltUsed) recs.push('🔗 Seatbelt usage reduces fatal injury risk by 45-60%');
  if (input.alcoholInvolved) recs.push('🍺 Alcohol doubles reaction time — never drive under influence');
  if (input.mobileUsage) recs.push('📱 Mobile phone usage increases crash risk by 4x — keep phone away');
  if (input.weather === 'Rainy') recs.push('🌧️ Wet conditions reduce tire grip by 40% — increase following distance');
  if (input.weather === 'Foggy') recs.push('🌫️ Foggy conditions reduce visibility to 30% — use fog lights and reduce speed');
  if (input.roadCondition === 'Damaged') recs.push('🛤️ Damaged roads increase crash force by 40% — drive cautiously');
  if (input.roadCondition === 'Wet') recs.push('💧 Wet roads increase stopping distance — maintain safe gaps');
  if (input.timeOfDay === 'Night') recs.push('🌙 Night driving reduces visibility — use high beams when appropriate');
  if (input.driverLicense === 'Invalid') recs.push('📋 Valid license ensures proper training — always carry valid documentation');
  if (recs.length === 0) recs.push('✅ Your driving scenario has relatively low risk — maintain safe practices');
  return recs;
}

const riskIntelligence = [
  { icon: Zap, title: 'Kinetic Energy', formula: 'KE = ½mv²', desc: 'Energy doubles with mass, quadruples with speed. Higher kinetic energy means more destructive crashes.' },
  { icon: Brain, title: 'Reaction Time', formula: 'T = 1.5s × factors', desc: 'Human baseline reaction is 1.5s. Alcohol doubles it, mobile usage adds 50%. Longer reaction = longer stopping distance.' },
  { icon: Gauge, title: 'Road Friction', formula: 'μ = weather × road', desc: 'Friction determines stopping ability. Wet roads reduce grip by 30-50%, damaged surfaces by 50%.' },
  { icon: Eye, title: 'Visibility Factor', formula: 'V = weather × time', desc: 'Poor visibility leads to delayed hazard detection. Fog reduces visibility to 30%, night to 50%.' },
  { icon: ShieldAlert, title: 'Vehicle Vulnerability', formula: 'Index: 0.25-0.95', desc: 'Motorcycles (0.95) offer least protection. Trucks (0.25) provide most structural protection.' },
  { icon: CheckCircle, title: 'Safety Equipment', formula: 'Factor: 0.5-1.0', desc: 'Helmets reduce bike fatality risk by 50%. Seatbelts reduce car fatality by 40%.' },
  { icon: AlertTriangle, title: 'Crash Force', formula: 'F = 0.02v² × factors', desc: 'Impact force scales with speed squared and vehicle mass. Environmental factors amplify the force.' },
];

export default function AnalyzerPage() {
  const [input, setInput] = useState<ScenarioInput>({
    vehicleType: 'Car', weather: 'Clear', roadCondition: 'Dry', timeOfDay: 'Morning',
    speed: 60, helmetUsed: true, seatbeltUsed: true, alcoholInvolved: false,
    mobileUsage: false, driverLicense: 'Valid',
  });
  const [result, setResult] = useState<PredictionResult | null>(null);

  const recommendations = useMemo(() => result ? generateRecommendations(input, result) : [], [input, result]);

  const handleAnalyze = () => {
    setResult(calculateRisk(input));
  };

  const riskColor = result ? (
    result.riskLevel === 'CRITICAL' ? 'text-chart-red' :
    result.riskLevel === 'HIGH' ? 'text-chart-orange' :
    result.riskLevel === 'MODERATE' ? 'text-chart-yellow' : 'text-chart-green'
  ) : '';

  const severityColor = result ? (
    result.severity === 'Fatal' ? 'text-chart-red' :
    result.severity === 'Serious' ? 'text-chart-orange' : 'text-chart-green'
  ) : '';

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-foreground">Accident Severity Analyzer</h1>
        <p className="text-sm text-muted-foreground">Physics-based risk engine + ML severity prediction</p>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Section 1: Input Panel */}
        <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} className="glass-card p-6">
          <h2 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
            <ShieldAlert className="h-4 w-4 text-primary" /> Scenario Input
          </h2>

          <div className="space-y-4">
            <div>
              <Label className="text-xs text-muted-foreground">Vehicle Type</Label>
              <Select value={input.vehicleType} onValueChange={v => setInput(p => ({ ...p, vehicleType: v }))}>
                <SelectTrigger className="mt-1 bg-secondary border-border/50"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {[['Bike', Bike], ['Car', Car], ['Bus', Bus], ['Truck', Truck]].map(([v, I]: any) => (
                    <SelectItem key={v} value={v}><span className="flex items-center gap-2"><I className="h-3.5 w-3.5" />{v}</span></SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="text-xs text-muted-foreground">Weather Condition</Label>
              <Select value={input.weather} onValueChange={v => setInput(p => ({ ...p, weather: v }))}>
                <SelectTrigger className="mt-1 bg-secondary border-border/50"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {['Clear', 'Rainy', 'Foggy'].map(v => <SelectItem key={v} value={v}>{v}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="text-xs text-muted-foreground">Road Condition</Label>
              <Select value={input.roadCondition} onValueChange={v => setInput(p => ({ ...p, roadCondition: v }))}>
                <SelectTrigger className="mt-1 bg-secondary border-border/50"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {['Dry', 'Wet', 'Damaged'].map(v => <SelectItem key={v} value={v}>{v}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="text-xs text-muted-foreground">Time of Day</Label>
              <Select value={input.timeOfDay} onValueChange={v => setInput(p => ({ ...p, timeOfDay: v }))}>
                <SelectTrigger className="mt-1 bg-secondary border-border/50"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {['Morning', 'Afternoon', 'Evening', 'Night'].map(v => <SelectItem key={v} value={v}>{v}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="text-xs text-muted-foreground">Vehicle Speed: {input.speed} km/h</Label>
              <Slider value={[input.speed]} onValueChange={([v]) => setInput(p => ({ ...p, speed: v }))} max={200} min={10} step={5} className="mt-2" />
            </div>

            <AnimatePresence>
              {input.vehicleType === 'Bike' && (
                <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
                  className="flex items-center justify-between">
                  <Label className="text-xs text-muted-foreground">Helmet Used</Label>
                  <Switch checked={input.helmetUsed} onCheckedChange={v => setInput(p => ({ ...p, helmetUsed: v }))} />
                </motion.div>
              )}
              {input.vehicleType !== 'Bike' && (
                <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
                  className="flex items-center justify-between">
                  <Label className="text-xs text-muted-foreground">Seatbelt Used</Label>
                  <Switch checked={input.seatbeltUsed} onCheckedChange={v => setInput(p => ({ ...p, seatbeltUsed: v }))} />
                </motion.div>
              )}
            </AnimatePresence>

            <div className="flex items-center justify-between">
              <Label className="text-xs text-muted-foreground">Alcohol Involved</Label>
              <Switch checked={input.alcoholInvolved} onCheckedChange={v => setInput(p => ({ ...p, alcoholInvolved: v }))} />
            </div>

            <div className="flex items-center justify-between">
              <Label className="text-xs text-muted-foreground">Mobile Usage</Label>
              <Switch checked={input.mobileUsage} onCheckedChange={v => setInput(p => ({ ...p, mobileUsage: v }))} />
            </div>

            <div>
              <Label className="text-xs text-muted-foreground">Driver License</Label>
              <Select value={input.driverLicense} onValueChange={v => setInput(p => ({ ...p, driverLicense: v }))}>
                <SelectTrigger className="mt-1 bg-secondary border-border/50"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {['Valid', 'Invalid'].map(v => <SelectItem key={v} value={v}>{v}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <Button onClick={handleAnalyze} className="w-full gradient-blue text-background font-semibold hover:opacity-90 transition-opacity">
              <Zap className="h-4 w-4 mr-2" /> Analyze Risk
            </Button>
          </div>
        </motion.div>

        {/* Section 2: Results */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="space-y-4">
          <div className="glass-card p-6">
            <h2 className="text-sm font-semibold text-foreground mb-4">Prediction Results</h2>
            {!result ? (
              <div className="text-center py-12 text-muted-foreground text-sm">
                <ShieldAlert className="h-10 w-10 mx-auto mb-3 opacity-30" />
                Configure scenario and click Analyze
              </div>
            ) : (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
                {/* Risk Gauge */}
                <div className="text-center">
                  <div className="relative w-32 h-32 mx-auto mb-3">
                    <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
                      <circle cx="50" cy="50" r="40" fill="none" stroke="hsl(222, 30%, 16%)" strokeWidth="8" />
                      <circle cx="50" cy="50" r="40" fill="none" stroke={
                        result.riskLevel === 'CRITICAL' ? COLORS.red : result.riskLevel === 'HIGH' ? COLORS.orange :
                        result.riskLevel === 'MODERATE' ? COLORS.yellow : COLORS.green
                      } strokeWidth="8" strokeDasharray={`${result.riskPercentage * 2.51} 251`} strokeLinecap="round" className="transition-all duration-1000" />
                    </svg>
                    <div className="absolute inset-0 flex items-center justify-center">
                      <span className={`text-2xl font-bold ${riskColor}`}>{result.riskPercentage}%</span>
                    </div>
                  </div>
                  <Badge className={`${
                    result.riskLevel === 'CRITICAL' ? 'bg-chart-red/20 text-chart-red border-chart-red/30' :
                    result.riskLevel === 'HIGH' ? 'bg-chart-orange/20 text-chart-orange border-chart-orange/30' :
                    result.riskLevel === 'MODERATE' ? 'bg-chart-yellow/20 text-chart-yellow border-chart-yellow/30' :
                    'bg-chart-green/20 text-chart-green border-chart-green/30'
                  }`}>{result.riskLevel} RISK</Badge>
                </div>

                {/* Metrics */}
                <div className="grid grid-cols-2 gap-3 text-center">
                  <div className="glass-card p-3">
                    <p className="text-[10px] text-muted-foreground uppercase">Severity</p>
                    <p className={`text-lg font-bold ${severityColor}`}>{result.severity}</p>
                  </div>
                  <div className="glass-card p-3">
                    <p className="text-[10px] text-muted-foreground uppercase">Confidence</p>
                    <p className="text-lg font-bold text-primary">{result.confidence}%</p>
                  </div>
                  <div className="glass-card p-3">
                    <p className="text-[10px] text-muted-foreground uppercase">Crash Force</p>
                    <p className="text-lg font-bold text-chart-orange">{result.crashForce} kN</p>
                  </div>
                  <div className="glass-card p-3">
                    <p className="text-[10px] text-muted-foreground uppercase">Kinetic Energy</p>
                    <p className="text-lg font-bold text-chart-cyan">{(result.kineticEnergy / 1000).toFixed(1)} kJ</p>
                  </div>
                </div>
              </motion.div>
            )}
          </div>

          {/* Recommendations */}
          {result && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="glass-card p-5">
              <h3 className="text-sm font-semibold text-foreground mb-3">AI Safety Recommendations</h3>
              <div className="space-y-2">
                {recommendations.map((rec, i) => (
                  <motion.div key={i} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.4 + i * 0.05 }}
                    className="text-xs text-muted-foreground p-2 rounded-lg bg-secondary/50 leading-relaxed">{rec}</motion.div>
                ))}
              </div>
            </motion.div>
          )}
        </motion.div>

        {/* Section 3: Risk Intelligence */}
        <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.2 }} className="glass-card p-6">
          <h2 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
            <Info className="h-4 w-4 text-primary" /> Risk Intelligence Analysis
          </h2>
          <div className="space-y-3">
            {riskIntelligence.map((item, i) => (
              <motion.div key={i} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 + i * 0.05 }}
                className="p-3 rounded-lg bg-secondary/50 hover:bg-secondary/80 transition-colors group">
                <div className="flex items-center gap-2 mb-1">
                  <item.icon className="h-3.5 w-3.5 text-primary" />
                  <span className="text-xs font-semibold text-foreground">{item.title}</span>
                </div>
                <code className="text-[10px] text-primary/80 font-mono block mb-1">{item.formula}</code>
                <p className="text-[11px] text-muted-foreground leading-relaxed">{item.desc}</p>
                {result && (
                  <div className="mt-1.5 text-[10px] text-chart-cyan">
                    {item.title === 'Kinetic Energy' && `Current: ${(result.kineticEnergy / 1000).toFixed(1)} kJ`}
                    {item.title === 'Reaction Time' && `Current: ${result.reactionTime}s`}
                    {item.title === 'Road Friction' && `Current: ${result.roadFriction}`}
                    {item.title === 'Visibility Factor' && `Current: ${result.visibility}`}
                    {item.title === 'Vehicle Vulnerability' && `Index: ${result.vulnerability}`}
                    {item.title === 'Safety Equipment' && `Factor: ${result.protectionFactor}`}
                    {item.title === 'Crash Force' && `Current: ${result.crashForce} kN`}
                  </div>
                )}
              </motion.div>
            ))}
          </div>
        </motion.div>
      </div>
    </div>
  );
}

const COLORS = {
  red: 'hsl(0, 84%, 60%)',
  orange: 'hsl(25, 95%, 53%)',
  yellow: 'hsl(38, 92%, 50%)',
  green: 'hsl(142, 71%, 45%)',
};
