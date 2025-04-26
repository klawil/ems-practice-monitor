import { VitalGeneratorConfig } from "@/types/state";

export class VitalGenerator {
  private currentValue: number = -1;
  private lastUpdate: number = 0;
  private lastChange: number = 0;

  setCurrentValue(config: VitalGeneratorConfig, val: number) {
    if (config.absoluteMax && val > config.absoluteMax) {
      val = config.absoluteMax;
    }
    if (val < 0) {
      val = 0;
    }
    if (this.currentValue !== val) {
      this.lastChange = Date.now();
    }

    this.currentValue = val;
  }

  increment(config: VitalGeneratorConfig) {
    // Set the current value on the first run
    if (this.currentValue === -1) {
      this.currentValue = config.targetValue;
    }

    const nowTime = Date.now();
    if (nowTime < this.lastUpdate + Math.ceil(1000 * config.maxUpdateFreq)) return;

    const rangeMin = config.targetValue - config.targetRange;
    const rangeMax = config.targetValue + config.targetRange;

    const maxDelta = Math.floor((nowTime - this.lastChange) * config.maxChangePerS / 1000);
    const possibleMin = config.instant
      ? rangeMin
      : this.currentValue - maxDelta;
    const possibleMax = config.instant
      ? rangeMax
      : this.currentValue + maxDelta;
    const directionOfChange = this.currentValue > config.targetValue
      ? -1
      : 1;

    this.lastUpdate = nowTime;
      
    // Move as much as we can towards the target
    if (
      possibleMin > rangeMax ||
      possibleMax < rangeMin
    ) {
      this.setCurrentValue(
        config,
        this.currentValue + (maxDelta * directionOfChange)
      );
      return;
    }

    // Figure out where in the target range we can be
    const minValue = possibleMin < rangeMin
      ? rangeMin
      : possibleMin;
    const maxValue = possibleMax > rangeMax
      ? rangeMax
      : possibleMax;
    
    this.setCurrentValue(
      config,
      Math.random() * (maxValue - minValue) + minValue
    );
  }

  get(): number {
    return this.currentValue;
  }
}
