import { VitalGeneratorConfig } from "@/types/monitor/reducer";

export class VitalGenerator {
  private currentValue: number;
  private lastUpdate: number = 0;

  constructor(initialValue: number) {
    this.currentValue = initialValue;
  }

  increment(config: VitalGeneratorConfig) {
    const nowTime = Date.now();
    if (nowTime < this.lastUpdate + Math.ceil(1000 * config.maxUpdateFreq)) return;

    const rangeMin = config.targetValue - config.targetRange;
    const rangeMax = config.targetValue + config.targetRange;

    const maxDelta = Math.floor((nowTime - this.lastUpdate) * config.maxChangePerS / 1000);
    const possibleMin = this.currentValue - maxDelta;
    const possibleMax = this.currentValue + maxDelta;
    const directionOfChange = this.currentValue > config.targetValue
      ? -1
      : 1;

    this.lastUpdate = nowTime;
      
    // Move as much as we can towards the target
    if (
      possibleMin > rangeMax ||
      possibleMax < rangeMin
    ) {
      this.currentValue = this.currentValue + (maxDelta * directionOfChange);
      return;
    }

    // Figure out where in the target range we can be
    const minValue = possibleMin < rangeMin
      ? rangeMin
      : possibleMin;
    const maxValue = possibleMax > rangeMax
      ? rangeMax
      : possibleMax;
    
    this.currentValue = Math.random() * (maxValue - minValue) + minValue;
  }

  get(): number {
    return this.currentValue;
  }
}
