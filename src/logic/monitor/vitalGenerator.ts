export class VitalGenerator {
  private currentValue: number;
  private targetValue: number;
  private targetRange: number;
  private maxChangeRate: number;

  private lastUpdate: number;
  private maxFreq: number;

  constructor(
    targetValue: number,
    targetRange: number,
    maxFreq: number,
    maxChangeRate: number,
  ) {
    this.currentValue = targetValue;
    this.targetValue = targetValue;
    this.targetRange = targetRange;
    this.maxChangeRate = maxChangeRate / maxFreq;
    this.maxFreq = 1 / maxFreq;
    this.lastUpdate = Date.now();
  }

  increment() {
    const nowTime = Date.now();
    if (nowTime < this.lastUpdate + Math.ceil(1000 / this.maxFreq)) return;

    const rangeMin = this.targetValue - this.targetRange;
    const rangeMax = this.targetValue + this.targetRange;

    const maxDelta = Math.floor((nowTime - this.lastUpdate) * this.maxChangeRate / 1000);
    const possibleMin = this.currentValue - maxDelta;
    const possibleMax = this.currentValue + maxDelta;
    const directionOfChange = this.currentValue > this.targetValue
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
    
    this.currentValue = Math.round(Math.random() * (maxValue - minValue)) + minValue;
  }

  get(): number {
    return this.currentValue;
  }
}
